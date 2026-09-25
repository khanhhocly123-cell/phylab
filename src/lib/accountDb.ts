/**
 * accountDb.ts — CỔNG DUY NHẤT tới dữ liệu tài khoản: người dùng, phiên đăng nhập, tiến độ đồng bộ,
 * bộ đếm chống dò mật khẩu. Schema: migrations/0002_accounts.sql.
 *
 * Cùng kiến trúc 3 tầng với getDb() của lớp học (route chỉ gọi getAccountDb(), không import adapter):
 *  1. Cloudflare D1 qua binding `DB` — production, và cả `next dev` (D1 local nhờ initOpenNextCloudflareForDev)
 *  2. File JSON `.data/phylab-accounts.json` — Node không có Cloudflare context (next start, npm run demo)
 *  3. Bộ nhớ — fallback cuối, mất khi khởi động lại
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "./db";
import type { AccountRole } from "./accountTypes";

export interface AccountRecord {
  id: string;
  /** Chữ thường, đã bỏ khoảng trắng. */
  email: string;
  name: string;
  role: AccountRole;
  /** Chuỗi PBKDF2 (lib/password.ts) hoặc "env" với tài khoản cấu hình bằng biến môi trường. */
  passwordHash: string;
  grade: number | null;
  school: string | null;
  createdAt: number;
  lastLoginAt: number | null;
}

export interface SessionRecord {
  /** SHA-256 của token trong cookie. */
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface StateRecord {
  key: string;
  /** JSON đã gộp (lib/syncMerge.ts). */
  value: string;
  updatedAt: number;
}

/** Một dòng trong bảng người dùng của admin. */
export interface AccountSummary extends Omit<AccountRecord, "passwordHash"> {
  /** Số bài đã qua Prelab và số báo cáo đã lưu (đọc từ tiến độ đồng bộ). */
  prelabs: number;
  reports: number;
  envManaged: boolean;
}

export interface AccountStats {
  total: number;
  new7d: number;
  active7d: number;
}

export type AccountPatch = Partial<Pick<AccountRecord, "name" | "role" | "passwordHash" | "grade" | "school" | "lastLoginAt">>;

export interface AccountDb {
  /** false khi email đã có tài khoản. */
  createUser(user: AccountRecord): Promise<boolean>;
  getUserByEmail(email: string): Promise<AccountRecord | null>;
  getUserById(id: string): Promise<AccountRecord | null>;
  updateUser(id: string, patch: AccountPatch): Promise<void>;
  /** Xoá tài khoản cùng mọi phiên đăng nhập và tiến độ. */
  deleteUser(id: string): Promise<void>;
  listUsers(limit: number): Promise<AccountSummary[]>;
  stats(sinceMs: number): Promise<AccountStats>;

  createSession(session: SessionRecord): Promise<void>;
  getSession(id: string): Promise<SessionRecord | null>;
  deleteSession(id: string): Promise<void>;
  /** Đăng xuất mọi máy (giữ lại phiên `exceptId` nếu có) — dùng khi đổi / cấp lại mật khẩu. */
  deleteSessionsOf(userId: string, exceptId?: string): Promise<void>;
  deleteExpiredSessions(now: number): Promise<void>;

  getState(userId: string): Promise<StateRecord[]>;
  putState(userId: string, records: StateRecord[]): Promise<void>;
  /** Xoá tiến độ: mọi khoá, hoặc chỉ các khoá trong `keys`. */
  clearState(userId: string, keys?: string[]): Promise<void>;

  /** Số lần đã đếm cho khoá trong cửa sổ thời gian hiện tại (hết cửa sổ thì 0). */
  countHits(key: string, windowMs: number, now: number): Promise<number>;
  /** Đếm thêm một lần, trả về tổng trong cửa sổ hiện tại. */
  addHit(key: string, windowMs: number, now: number): Promise<number>;
  clearHits(key: string): Promise<void>;
}

/** Đếm số bài đã qua Prelab / số báo cáo từ JSON tiến độ (adapter không có SQL JSON dùng). */
export function progressCounts(state: Array<{ key: string; value: string }>): { prelabs: number; reports: number } {
  let prelabs = 0;
  let reports = 0;
  for (const row of state) {
    try {
      const value = JSON.parse(row.value) as unknown;
      if (row.key === "prelabPassed" && value && typeof value === "object") prelabs = Object.values(value).filter((v) => v === true).length;
      if (row.key === "reports" && Array.isArray(value)) reports = value.length;
    } catch {
      // JSON hỏng thì coi như 0.
    }
  }
  return { prelabs, reports };
}

export async function getAccountDb(): Promise<AccountDb> {
  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (db) {
      const { AccountD1 } = await import("./accountDb-d1");
      return new AccountD1(db);
    }
  } catch {
    // Không ở trong Cloudflare context → thử adapter file.
  }
  try {
    const { getFileAccountDb } = await import("./accountDb-file");
    return getFileAccountDb();
  } catch {
    // Không có fs → bộ nhớ.
  }
  const { getMemoryAccountDb } = await import("./accountDb-memory");
  return getMemoryAccountDb();
}
