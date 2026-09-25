/**
 * accountClient.ts — Phía trình duyệt của tài khoản PhyLab.
 *
 * Local-first: tài khoản và tiến độ được nhớ trên máy nên mở app là vào ngay (mất mạng vẫn học được);
 * có mạng thì kiểm phiên với máy chủ và đồng bộ (lib/cloudSync.ts). Cookie phiên là HttpOnly — JS
 * không đọc được, chỉ máy chủ biết phiên còn hạn hay không.
 */

import type { PublicAccount } from "./accountTypes";

/** Khoá localStorage của tiến độ trên máy (đăng xuất thì xoá, trừ hướng dẫn đã xem). */
export const LOCAL_KEYS = {
  account: "phylab.account.v1",
  teacherToken: "teacherToken",
  prelabPassed: "prelabPassed",
  reports: "phylab.reports.v1",
  labData: "phylab.labData.v1",
  updatesSeen: "phylab.updatesSeen.v1",
} as const;

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Hết chỗ / chế độ ẩn danh: vẫn chạy bằng bộ nhớ trang, máy chủ vẫn giữ bản đồng bộ.
  }
}

export function readCachedAccount(): PublicAccount | null {
  const user = readLocal<PublicAccount | null>(LOCAL_KEYS.account, null);
  return user && typeof user.id === "string" && typeof user.name === "string" ? user : null;
}

export function readTeacherToken(): string | null {
  try {
    return localStorage.getItem(LOCAL_KEYS.teacherToken);
  } catch {
    return null;
  }
}

/** Nhớ tài khoản vừa đăng nhập (và token lớp học nếu là giáo viên) để lần sau mở app là vào luôn. */
export function rememberAccount(user: PublicAccount, teacherToken?: string): void {
  writeLocal(LOCAL_KEYS.account, user);
  try {
    if (teacherToken) localStorage.setItem(LOCAL_KEYS.teacherToken, teacherToken);
    else localStorage.removeItem(LOCAL_KEYS.teacherToken);
  } catch {
    // bỏ qua
  }
}

/** Đăng xuất trên máy: quên tài khoản và tiến độ (máy chủ vẫn giữ — đăng nhập lại là về đủ). */
export function forgetLocalAccount(): void {
  for (const key of [...Object.values(LOCAL_KEYS), "studentName", "role", "activeTab", "activeLessonId"]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // bỏ qua
    }
  }
}

export type MeResult =
  | { state: "ok"; user: PublicAccount; teacherToken?: string }
  | { state: "anon" }
  | { state: "offline" };

/** Kiểm phiên với máy chủ: "anon" = phiên hết/không có, "offline" = không hỏi được (giữ bản nhớ). */
export async function fetchMe(): Promise<MeResult> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (res.status === 401) return { state: "anon" };
    if (!res.ok) return { state: "offline" };
    const data = (await res.json()) as { user?: PublicAccount; teacherToken?: string };
    return data.user ? { state: "ok", user: data.user, teacherToken: data.teacherToken } : { state: "offline" };
  } catch {
    return { state: "offline" };
  }
}

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string; status: number };

/** Gọi API JSON cùng origin; lỗi trả về câu tiếng Việt để hiện thẳng cho học sinh. */
export async function apiJson<T = Record<string, unknown>>(url: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
    if (!res.ok) return { ok: false, error: data.error || "Có lỗi xảy ra — em thử lại sau nhé.", status: res.status };
    return { ...data, ok: true };
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ — kiểm tra mạng rồi thử lại.", status: 0 };
  }
}
