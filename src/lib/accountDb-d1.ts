/**
 * accountDb-d1.ts — Adapter Cloudflare D1 cho tài khoản (schema: migrations/0002_accounts.sql).
 * Chỉ được import từ getAccountDb() (accountDb.ts).
 */

import type { D1Database } from "./db";
import type { AccountDb, AccountPatch, AccountRecord, AccountStats, AccountSummary, SessionRecord, StateRecord } from "./accountDb";
import type { AccountRole } from "./accountTypes";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  password_hash: string;
  grade: number | null;
  school: string | null;
  created_at: number;
  last_login_at: number | null;
}
interface SummaryRow extends UserRow {
  prelabs: number | null;
  reports: number | null;
}
interface SessionRow {
  id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
}
interface StateRow {
  key: string;
  value: string;
  updated_at: number;
}

const toUser = (r: UserRow): AccountRecord => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role as AccountRole,
  passwordHash: r.password_hash,
  grade: r.grade,
  school: r.school,
  createdAt: r.created_at,
  lastLoginAt: r.last_login_at,
});

/** Cột được phép sửa qua updateUser (tên thuộc tính → tên cột). */
const PATCH_COLUMNS: Record<keyof AccountPatch, string> = {
  name: "name",
  role: "role",
  passwordHash: "password_hash",
  grade: "grade",
  school: "school",
  lastLoginAt: "last_login_at",
};

export class AccountD1 implements AccountDb {
  constructor(private db: D1Database) {}

  async createUser(u: AccountRecord): Promise<boolean> {
    try {
      await this.db
        .prepare(
          `INSERT INTO users (id, email, name, role, password_hash, grade, school, created_at, last_login_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
        )
        .bind(u.id, u.email, u.name, u.role, u.passwordHash, u.grade, u.school, u.createdAt, u.lastLoginAt)
        .run();
      return true;
    } catch (err) {
      if (/UNIQUE/i.test(String(err))) return false;
      throw err;
    }
  }

  async getUserByEmail(email: string): Promise<AccountRecord | null> {
    const r = await this.db.prepare("SELECT * FROM users WHERE email = ?1").bind(email).first<UserRow>();
    return r ? toUser(r) : null;
  }

  async getUserById(id: string): Promise<AccountRecord | null> {
    const r = await this.db.prepare("SELECT * FROM users WHERE id = ?1").bind(id).first<UserRow>();
    return r ? toUser(r) : null;
  }

  async updateUser(id: string, patch: AccountPatch): Promise<void> {
    const keys = (Object.keys(patch) as Array<keyof AccountPatch>).filter((k) => k in PATCH_COLUMNS);
    if (keys.length === 0) return;
    const sets = keys.map((k, i) => `${PATCH_COLUMNS[k]} = ?${i + 2}`).join(", ");
    await this.db
      .prepare(`UPDATE users SET ${sets} WHERE id = ?1`)
      .bind(id, ...keys.map((k) => patch[k] ?? null))
      .run();
  }

  async deleteUser(id: string): Promise<void> {
    // D1 không bật foreign_keys mặc định → xoá dữ liệu con trước.
    for (const sql of [
      "DELETE FROM sessions WHERE user_id = ?1",
      "DELETE FROM user_state WHERE user_id = ?1",
      "DELETE FROM users WHERE id = ?1",
    ]) {
      await this.db.prepare(sql).bind(id).run();
    }
  }

  async listUsers(limit: number): Promise<AccountSummary[]> {
    const { results } = await this.db
      .prepare(
        `SELECT u.*,
           (SELECT COUNT(*) FROM user_state s, json_each(s.value) j
              WHERE s.user_id = u.id AND s.key = 'prelabPassed' AND j.type = 'true') AS prelabs,
           (SELECT json_array_length(s.value) FROM user_state s
              WHERE s.user_id = u.id AND s.key = 'reports') AS reports
         FROM users u ORDER BY u.created_at DESC LIMIT ?1`
      )
      .bind(limit)
      .all<SummaryRow>();
    return results.map((r) => {
      const { passwordHash, ...user } = toUser(r);
      return { ...user, prelabs: r.prelabs ?? 0, reports: r.reports ?? 0, envManaged: passwordHash === "env" };
    });
  }

  async stats(sinceMs: number): Promise<AccountStats> {
    const r = await this.db
      .prepare(
        `SELECT COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN created_at >= ?1 THEN 1 ELSE 0 END), 0) AS new7d,
           COALESCE(SUM(CASE WHEN last_login_at >= ?1 THEN 1 ELSE 0 END), 0) AS active7d
         FROM users`
      )
      .bind(sinceMs)
      .first<AccountStats>();
    return { total: r?.total ?? 0, new7d: r?.new7d ?? 0, active7d: r?.active7d ?? 0 };
  }

  async createSession(s: SessionRecord): Promise<void> {
    await this.db
      .prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)")
      .bind(s.id, s.userId, s.createdAt, s.expiresAt)
      .run();
  }

  async getSession(id: string): Promise<SessionRecord | null> {
    const r = await this.db.prepare("SELECT * FROM sessions WHERE id = ?1").bind(id).first<SessionRow>();
    return r ? { id: r.id, userId: r.user_id, createdAt: r.created_at, expiresAt: r.expires_at } : null;
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM sessions WHERE id = ?1").bind(id).run();
  }

  async deleteSessionsOf(userId: string, exceptId?: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM sessions WHERE user_id = ?1 AND id != ?2")
      .bind(userId, exceptId ?? "")
      .run();
  }

  async deleteExpiredSessions(now: number): Promise<void> {
    await this.db.prepare("DELETE FROM sessions WHERE expires_at < ?1").bind(now).run();
  }

  async getState(userId: string): Promise<StateRecord[]> {
    const { results } = await this.db
      .prepare("SELECT key, value, updated_at FROM user_state WHERE user_id = ?1")
      .bind(userId)
      .all<StateRow>();
    return results.map((r) => ({ key: r.key, value: r.value, updatedAt: r.updated_at }));
  }

  async putState(userId: string, records: StateRecord[]): Promise<void> {
    for (const r of records) {
      await this.db
        .prepare(
          `INSERT INTO user_state (user_id, key, value, updated_at) VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        )
        .bind(userId, r.key, r.value, r.updatedAt)
        .run();
    }
  }

  async clearState(userId: string, keys?: string[]): Promise<void> {
    if (!keys) {
      await this.db.prepare("DELETE FROM user_state WHERE user_id = ?1").bind(userId).run();
      return;
    }
    for (const key of keys) {
      await this.db.prepare("DELETE FROM user_state WHERE user_id = ?1 AND key = ?2").bind(userId, key).run();
    }
  }

  async countHits(key: string, windowMs: number, now: number): Promise<number> {
    const r = await this.db
      .prepare("SELECT count, window_start FROM auth_throttle WHERE key = ?1")
      .bind(key)
      .first<{ count: number; window_start: number }>();
    return r && now - r.window_start < windowMs ? r.count : 0;
  }

  async addHit(key: string, windowMs: number, now: number): Promise<number> {
    // Cửa sổ cũ đã hết thì đếm lại từ 1 (vế phải của SET đọc giá trị cũ của dòng).
    const r = await this.db
      .prepare(
        `INSERT INTO auth_throttle (key, count, window_start) VALUES (?1, 1, ?2)
         ON CONFLICT (key) DO UPDATE SET
           count = CASE WHEN ?2 - window_start >= ?3 THEN 1 ELSE count + 1 END,
           window_start = CASE WHEN ?2 - window_start >= ?3 THEN ?2 ELSE window_start END
         RETURNING count`
      )
      .bind(key, now, windowMs)
      .first<{ count: number }>();
    return r?.count ?? 1;
  }

  async clearHits(key: string): Promise<void> {
    await this.db.prepare("DELETE FROM auth_throttle WHERE key = ?1").bind(key).run();
  }
}
