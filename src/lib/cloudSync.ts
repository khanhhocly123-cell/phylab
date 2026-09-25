/**
 * cloudSync.ts — Đồng bộ tiến độ trên máy với tài khoản (máy chủ /api/sync).
 *
 * Vòng đời: đăng nhập → kéo bản trên máy chủ, GỘP với bản trên máy (lib/syncMerge.ts), báo UI giá trị đã
 * gộp, đẩy phần máy chủ còn thiếu. Sau đó mỗi thay đổi trên máy được đẩy lên sau ~1 giây; đóng tab / ẩn
 * app thì đẩy ngay; quay lại tab hoặc có mạng lại thì kéo lại (học trên máy khác sẽ thấy). Mất mạng: vẫn
 * học bình thường, có mạng lại thì tự đồng bộ.
 *
 * SyncEngine là một store ngoài React (trạng thái đọc bằng useSyncExternalStore) nên không cần setState
 * trong effect.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { SYNC_KEYS, isSyncKey, mergeSyncValue, normalizeSyncValue, type SyncKey } from "./syncMerge";

export type SyncState = "idle" | "syncing" | "synced" | "offline" | "error";
export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: number | null;
}
export type SyncSnapshot = Record<SyncKey, unknown>;

interface Handlers {
  /** Ghi giá trị đã gộp vào state / localStorage của app. */
  apply: (key: SyncKey, value: unknown) => void;
  /** Máy chủ báo phiên hết hạn. */
  onUnauthorized: () => void;
}

const PUSH_DELAY_MS = 1200;
const RETRY_DELAY_MS = 15_000;
const REPULL_AFTER_MS = 30_000;

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
const canonical = (key: SyncKey, value: unknown) => JSON.stringify(normalizeSyncValue(key, value));

export class SyncEngine {
  private handlers: Handlers = { apply: () => {}, onUnauthorized: () => {} };
  private userId: string | null = null;
  private local: Partial<SyncSnapshot> = {};
  /** Bản chuẩn hoá (JSON) mà máy chủ đang giữ, theo từng khoá. */
  private synced: Partial<Record<SyncKey, string>> = {};
  private ready = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private busy: Promise<void> | null = null;
  private lastPullAt = 0;
  private status: SyncStatus = { state: "idle", lastSyncedAt: null };
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getStatus = () => this.status;

  private setStatus(state: SyncState, syncedAt?: number) {
    if (this.status.state === state && syncedAt === undefined) return;
    this.status = { state, lastSyncedAt: syncedAt ?? this.status.lastSyncedAt };
    this.listeners.forEach((l) => l());
  }

  private dirtyKeys(): SyncKey[] {
    return SYNC_KEYS.filter((k) => canonical(k, this.local[k]) !== this.synced[k]);
  }

  setHandlers(handlers: Handlers) {
    this.handlers = handlers;
  }

  /** App báo giá trị hiện tại trên máy (sau mỗi lần state đổi). */
  setLocal(snapshot: SyncSnapshot) {
    this.local = snapshot;
    if (this.ready && this.dirtyKeys().length > 0) this.schedule(PUSH_DELAY_MS);
  }

  start(userId: string) {
    if (this.userId === userId) return;
    this.stop();
    this.userId = userId;
    void this.pull();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.userId = null;
    this.ready = false;
    this.synced = {};
    this.setStatus("idle");
  }

  /** Gộp bản máy chủ vào bản trên máy; khác đi thì báo app. */
  private mergeIntoLocal(key: SyncKey, serverValue: unknown) {
    const local = normalizeSyncValue(key, this.local[key]);
    const merged = mergeSyncValue(key, serverValue, local);
    if (JSON.stringify(merged) !== JSON.stringify(local)) {
      this.local = { ...this.local, [key]: merged };
      this.handlers.apply(key, merged);
    }
  }

  /** Kéo tiến độ từ máy chủ (khi đăng nhập, quay lại tab, có mạng lại). */
  async pull(): Promise<void> {
    const userId = this.userId;
    if (!userId) return;
    this.lastPullAt = Date.now();
    this.setStatus("syncing");
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      if (this.userId !== userId) return;
      if (res.status === 401) {
        this.handlers.onUnauthorized();
        return;
      }
      if (!res.ok) throw new Error(`sync ${res.status}`);
      const data = (await res.json()) as { state?: Record<string, { value: unknown }> };
      if (this.userId !== userId) return;
      for (const key of SYNC_KEYS) {
        const serverValue = normalizeSyncValue(key, data.state?.[key]?.value);
        this.synced[key] = JSON.stringify(serverValue);
        this.mergeIntoLocal(key, serverValue);
      }
      this.ready = true;
      if (this.dirtyKeys().length > 0) await this.push();
      else this.setStatus("synced", Date.now());
    } catch {
      if (this.userId === userId) {
        this.setStatus(isOffline() ? "offline" : "error");
        this.schedulePull(RETRY_DELAY_MS);
      }
    }
  }

  /** Kéo lại nếu lần kéo trước đã lâu (quay lại tab sau khi học trên máy khác). */
  refresh() {
    if (!this.userId) return;
    if (!this.ready || Date.now() - this.lastPullAt > REPULL_AFTER_MS) void this.pull();
  }

  private schedule(delay: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.push();
    }, delay);
  }

  private schedulePull(delay: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.pull();
    }, delay);
  }

  /** Đẩy các khoá đã đổi; `keepalive` để yêu cầu vẫn đi khi tab đang đóng. */
  async push(keepalive = false): Promise<void> {
    if (!this.userId || !this.ready) return;
    if (this.busy) await this.busy;
    const keys = this.dirtyKeys();
    const userId = this.userId;
    if (!userId || keys.length === 0) return;
    const entries = Object.fromEntries(keys.map((k) => [k, normalizeSyncValue(k, this.local[k])]));

    const run = (async () => {
      this.setStatus("syncing");
      try {
        const body = JSON.stringify({ entries });
        const res = await fetch("/api/sync", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: keepalive && body.length < 60_000,
        });
        if (this.userId !== userId) return;
        if (res.status === 401) {
          this.handlers.onUnauthorized();
          return;
        }
        if (!res.ok) throw new Error(`sync ${res.status}`);
        const data = (await res.json()) as { state?: Record<string, { value: unknown }>; rejected?: string[] };
        if (this.userId !== userId) return;
        for (const key of SYNC_KEYS) {
          const entry = data.state?.[key];
          if (!entry) continue;
          const serverValue = normalizeSyncValue(key, entry.value);
          this.synced[key] = JSON.stringify(serverValue);
          this.mergeIntoLocal(key, serverValue);
        }
        // Khoá quá lớn bị từ chối: coi như đã xử lý để không gửi lại mãi.
        for (const key of data.rejected ?? []) {
          if (isSyncKey(key)) this.synced[key] = canonical(key, this.local[key]);
        }
        if (this.dirtyKeys().length > 0) this.schedule(300);
        else this.setStatus("synced", Date.now());
      } catch {
        if (this.userId === userId) {
          this.setStatus(isOffline() ? "offline" : "error");
          this.schedule(RETRY_DELAY_MS);
        }
      }
    })();
    this.busy = run;
    try {
      await run;
    } finally {
      if (this.busy === run) this.busy = null;
    }
  }

  /** Đẩy ngay phần còn chờ (trước khi đăng xuất / đóng tab). */
  flush(keepalive = false): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    return this.push(keepalive);
  }

  /**
   * Xoá tiến độ (mọi khoá hoặc vài khoá) trên máy chủ và trên máy — công cụ test của admin. Gộp chỉ cộng
   * thêm nên muốn bớt (vd cho hướng dẫn hiện lại) phải xoá hẳn ở máy chủ trước.
   */
  async reset(keys: readonly SyncKey[] = SYNC_KEYS): Promise<boolean> {
    if (!this.userId) return false;
    const query = keys.length === SYNC_KEYS.length ? "" : `?keys=${keys.join(",")}`;
    const res = await fetch(`/api/sync${query}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return false;
    for (const key of keys) {
      const empty = normalizeSyncValue(key, undefined);
      this.synced[key] = JSON.stringify(empty);
      this.local = { ...this.local, [key]: empty };
      this.handlers.apply(key, empty);
    }
    this.setStatus("synced", Date.now());
    return true;
  }
}

/** Một dòng mô tả trạng thái đồng bộ cho học sinh. */
export function describeSync(status: SyncStatus): string {
  const time = status.lastSyncedAt
    ? new Date(status.lastSyncedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : null;
  switch (status.state) {
    case "syncing":
      return "Đang lưu lên tài khoản…";
    case "synced":
      return time ? `Đã đồng bộ lúc ${time}` : "Đã đồng bộ";
    case "offline":
      return "Mất mạng — tiến độ vẫn lưu trên máy, có mạng sẽ tự đồng bộ";
    case "error":
      return "Chưa đồng bộ được — PhyLab sẽ tự thử lại";
    default:
      return "Chưa đồng bộ";
  }
}

/**
 * Gắn SyncEngine vào app: `userId` null = chưa đăng nhập (không đồng bộ). `snapshot` nên được useMemo
 * để chỉ đổi khi tiến độ thật sự đổi.
 */
export function useCloudSync(userId: string | null, snapshot: SyncSnapshot, handlers: Handlers): { engine: SyncEngine; status: SyncStatus } {
  const [engine] = useState(() => new SyncEngine());

  useEffect(() => {
    engine.setHandlers(handlers);
  });

  useEffect(() => {
    engine.setLocal(snapshot);
  }, [engine, snapshot]);

  useEffect(() => {
    if (!userId) {
      engine.stop();
      return;
    }
    engine.start(userId);
  }, [engine, userId]);

  useEffect(() => {
    const onHide = () => void engine.flush(true);
    const onVisibility = () => (document.visibilityState === "hidden" ? onHide() : engine.refresh());
    const onOnline = () => engine.refresh();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      engine.stop();
    };
  }, [engine]);

  const status = useSyncExternalStore(engine.subscribe, engine.getStatus, engine.getStatus);
  return { engine, status };
}
