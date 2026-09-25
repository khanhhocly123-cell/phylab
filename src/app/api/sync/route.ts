/**
 * /api/sync — Đồng bộ tiến độ của tài khoản đang đăng nhập giữa các máy.
 *
 * GET    → toàn bộ tiến độ đã lưu: { state: { [khoá]: { value, updatedAt } } }
 * PUT    { entries: { [khoá]: giá trị } } → GỘP với bản trên máy chủ (lib/syncMerge.ts) rồi lưu, trả lại
 *        bản đã gộp để máy gửi cập nhật theo. Gộp chứ không ghi đè: hai máy lưu lệch nhau không mất gì.
 * DELETE [?keys=tours,…] → xoá toàn bộ tiến độ, hoặc chỉ vài khoá (công cụ test của admin: "làm lại như
 *        học sinh mới", "xem lại hướng dẫn lần đầu"). Gộp chỉ cộng thêm nên muốn bớt phải xoá hẳn ở đây.
 */

import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin, readSession } from "@/lib/session";
import { fitSyncValue, isSyncKey, mergeSyncValue, normalizeSyncValue, SYNC_KEYS, type SyncKey } from "@/lib/syncMerge";
import type { StateRecord } from "@/lib/accountDb";

const MAX_BODY_BYTES = 2_000_000;

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function parseStored(key: SyncKey, raw: string | undefined): unknown {
  if (raw === undefined) return normalizeSyncValue(key, undefined);
  try {
    return normalizeSyncValue(key, JSON.parse(raw));
  } catch {
    return normalizeSyncValue(key, undefined);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await readSession(req);
    if (!session) return jsonError("Chưa đăng nhập.", 401);
    const rows = await session.db.getState(session.user.id);
    const state: Record<string, { value: unknown; updatedAt: number }> = {};
    for (const row of rows) {
      if (isSyncKey(row.key)) state[row.key] = { value: parseStored(row.key, row.value), updatedAt: row.updatedAt };
    }
    return NextResponse.json({ ok: true, state });
  } catch (err) {
    console.error("sync GET error:", err);
    return jsonError("Chưa tải được tiến độ — thử lại sau.", 500);
  }
}

export async function PUT(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError("Yêu cầu không hợp lệ.", 403);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return jsonError("Dữ liệu quá lớn.", 413);
  try {
    const session = await readSession(req);
    if (!session) return jsonError("Chưa đăng nhập.", 401);
    const body = (await req.json().catch(() => null)) as { entries?: Record<string, unknown> } | null;
    const entries = body?.entries && typeof body.entries === "object" ? body.entries : null;
    if (!entries) return jsonError("Thiếu dữ liệu đồng bộ.", 400);

    const rows = await session.db.getState(session.user.id);
    const stored = new Map(rows.map((r) => [r.key, r]));
    const now = Date.now();
    const writes: StateRecord[] = [];
    const state: Record<string, { value: unknown; updatedAt: number }> = {};
    const rejected: string[] = [];

    for (const key of SYNC_KEYS) {
      if (!(key in entries)) continue;
      const before = parseStored(key, stored.get(key)?.value);
      const merged = fitSyncValue(key, mergeSyncValue(key, before, entries[key]));
      if (merged === null) {
        rejected.push(key);
        continue;
      }
      const json = JSON.stringify(merged);
      if (json !== JSON.stringify(before) || !stored.has(key)) writes.push({ key, value: json, updatedAt: now });
      state[key] = { value: merged, updatedAt: writes.some((w) => w.key === key) ? now : stored.get(key)?.updatedAt ?? now };
    }
    await session.db.putState(session.user.id, writes);
    return NextResponse.json({ ok: true, state, rejected });
  } catch (err) {
    console.error("sync PUT error:", err);
    return jsonError("Chưa lưu được tiến độ — thử lại sau.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return jsonError("Yêu cầu không hợp lệ.", 403);
  try {
    const session = await readSession(req);
    if (!session) return jsonError("Chưa đăng nhập.", 401);
    const keys = req.nextUrl.searchParams.get("keys")?.split(",").filter(isSyncKey);
    await session.db.clearState(session.user.id, keys?.length ? keys : undefined);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("sync DELETE error:", err);
    return jsonError("Chưa xoá được tiến độ — thử lại sau.", 500);
  }
}
