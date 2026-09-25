/**
 * accountDb-memory.ts — Adapter tài khoản trong bộ nhớ (kèm hook persist cho adapter file kế thừa).
 * Dùng khi không có D1 lẫn filesystem; FileAccountDb (accountDb-file.ts) ghi store xuống JSON.
 */

import { progressCounts } from "./accountDb";
import type { AccountDb, AccountPatch, AccountRecord, AccountStats, AccountSummary, SessionRecord, StateRecord } from "./accountDb";

/** Store thuần JSON để ghi được xuống file. */
export interface AccountStore {
  users: AccountRecord[];
  sessions: SessionRecord[];
  state: Array<StateRecord & { userId: string }>;
  throttle: Array<{ key: string; count: number; windowStart: number }>;
}

export function createEmptyAccountStore(): AccountStore {
  return { users: [], sessions: [], state: [], throttle: [] };
}

export class MemoryAccountDb implements AccountDb {
  protected store: AccountStore;

  constructor(store?: AccountStore) {
    this.store = store ?? createEmptyAccountStore();
  }

  /** Hook cho adapter kế thừa (FileAccountDb ghi JSON); base = no-op. */
  protected persist(): void {}

  async createUser(user: AccountRecord): Promise<boolean> {
    if (this.store.users.some((u) => u.email === user.email)) return false;
    this.store.users.push({ ...user });
    this.persist();
    return true;
  }

  async getUserByEmail(email: string): Promise<AccountRecord | null> {
    const u = this.store.users.find((x) => x.email === email);
    return u ? { ...u } : null;
  }

  async getUserById(id: string): Promise<AccountRecord | null> {
    const u = this.store.users.find((x) => x.id === id);
    return u ? { ...u } : null;
  }

  async updateUser(id: string, patch: AccountPatch): Promise<void> {
    const u = this.store.users.find((x) => x.id === id);
    if (!u) return;
    Object.assign(u, patch);
    this.persist();
  }

  async deleteUser(id: string): Promise<void> {
    this.store.users = this.store.users.filter((u) => u.id !== id);
    this.store.sessions = this.store.sessions.filter((s) => s.userId !== id);
    this.store.state = this.store.state.filter((s) => s.userId !== id);
    this.persist();
  }

  async listUsers(limit: number): Promise<AccountSummary[]> {
    return [...this.store.users]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(({ passwordHash, ...user }) => ({
        ...user,
        ...progressCounts(this.store.state.filter((s) => s.userId === user.id)),
        envManaged: passwordHash === "env",
      }));
  }

  async stats(sinceMs: number): Promise<AccountStats> {
    const users = this.store.users;
    return {
      total: users.length,
      new7d: users.filter((u) => u.createdAt >= sinceMs).length,
      active7d: users.filter((u) => (u.lastLoginAt ?? 0) >= sinceMs).length,
    };
  }

  async createSession(session: SessionRecord): Promise<void> {
    this.store.sessions.push({ ...session });
    this.persist();
  }

  async getSession(id: string): Promise<SessionRecord | null> {
    const s = this.store.sessions.find((x) => x.id === id);
    return s ? { ...s } : null;
  }

  async deleteSession(id: string): Promise<void> {
    this.store.sessions = this.store.sessions.filter((s) => s.id !== id);
    this.persist();
  }

  async deleteSessionsOf(userId: string, exceptId?: string): Promise<void> {
    this.store.sessions = this.store.sessions.filter((s) => s.userId !== userId || s.id === exceptId);
    this.persist();
  }

  async deleteExpiredSessions(now: number): Promise<void> {
    const before = this.store.sessions.length;
    this.store.sessions = this.store.sessions.filter((s) => s.expiresAt >= now);
    if (this.store.sessions.length !== before) this.persist();
  }

  async getState(userId: string): Promise<StateRecord[]> {
    return this.store.state.filter((s) => s.userId === userId).map(({ key, value, updatedAt }) => ({ key, value, updatedAt }));
  }

  async putState(userId: string, records: StateRecord[]): Promise<void> {
    for (const r of records) {
      const row = this.store.state.find((s) => s.userId === userId && s.key === r.key);
      if (row) Object.assign(row, { value: r.value, updatedAt: r.updatedAt });
      else this.store.state.push({ userId, ...r });
    }
    if (records.length) this.persist();
  }

  async clearState(userId: string, keys?: string[]): Promise<void> {
    this.store.state = this.store.state.filter((s) => s.userId !== userId || (keys !== undefined && !keys.includes(s.key)));
    this.persist();
  }

  async countHits(key: string, windowMs: number, now: number): Promise<number> {
    const row = this.store.throttle.find((t) => t.key === key);
    return row && now - row.windowStart < windowMs ? row.count : 0;
  }

  async addHit(key: string, windowMs: number, now: number): Promise<number> {
    let row = this.store.throttle.find((t) => t.key === key);
    if (!row) {
      row = { key, count: 0, windowStart: now };
      this.store.throttle.push(row);
    }
    if (now - row.windowStart >= windowMs) Object.assign(row, { count: 0, windowStart: now });
    row.count += 1;
    this.persist();
    return row.count;
  }

  async clearHits(key: string): Promise<void> {
    this.store.throttle = this.store.throttle.filter((t) => t.key !== key);
    this.persist();
  }
}

export function getMemoryAccountDb(): AccountDb {
  // Cache trên globalThis để sống qua HMR trong dev.
  const g = globalThis as { __phylabMemoryAccountDb?: AccountDb };
  if (!g.__phylabMemoryAccountDb) g.__phylabMemoryAccountDb = new MemoryAccountDb();
  return g.__phylabMemoryAccountDb;
}
