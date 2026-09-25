/**
 * accountDb-file.ts — Adapter tài khoản ghi xuống `.data/phylab-accounts.json` (Node không có Cloudflare
 * context: next start, npm run demo). Ghi atomic: file tạm rồi rename. Không import từ route edge.
 */

import * as fs from "fs";
import * as path from "path";
import { MemoryAccountDb, createEmptyAccountStore, type AccountStore } from "./accountDb-memory";
import type { AccountDb } from "./accountDb";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "phylab-accounts.json");

function loadStore(): AccountStore {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Partial<AccountStore>;
    const empty = createEmptyAccountStore();
    return {
      users: parsed.users ?? empty.users,
      sessions: parsed.sessions ?? empty.sessions,
      state: parsed.state ?? empty.state,
      throttle: parsed.throttle ?? empty.throttle,
    };
  } catch {
    return createEmptyAccountStore();
  }
}

class FileAccountDb extends MemoryAccountDb {
  private writeQueued = false;

  constructor() {
    super(loadStore());
  }

  /** Gom các thay đổi trong cùng tick thành một lần ghi. */
  protected persist(): void {
    if (this.writeQueued) return;
    this.writeQueued = true;
    queueMicrotask(() => {
      this.writeQueued = false;
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        const tmp = `${DATA_FILE}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(this.store), "utf-8");
        fs.renameSync(tmp, DATA_FILE);
      } catch (err) {
        console.error("FileAccountDb persist error:", err);
      }
    });
  }
}

export function getFileAccountDb(): AccountDb {
  const g = globalThis as { __phylabFileAccountDb?: AccountDb };
  if (!g.__phylabFileAccountDb) g.__phylabFileAccountDb = new FileAccountDb();
  return g.__phylabFileAccountDb;
}
