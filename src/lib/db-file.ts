/**
 * db-file.ts — Adapter file JSON cho môi trường Node (npm run dev / start / demo).
 *
 * Kế thừa MemoryDb, ghi store xuống `.data/phylab-db.json` sau mỗi mutation
 * (ghi atomic: file tạm rồi rename). Nhờ vậy:
 *  - Dữ liệu lớp/bài tập/điểm SỐNG QUA RESTART server.
 *  - Demo qua `npm run demo` (localtunnel) → GV + HS nhiều thiết bị dùng chung 1 store thật.
 *
 * KHÔNG import từ route edge — chỉ được gọi qua getDb() khi fs khả dụng.
 */

import * as fs from "fs";
import * as path from "path";
import { MemoryDb, createEmptyStore, type MemStore } from "./db-memory";
import type { PhyLabDb } from "./db";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "phylab-db.json");

function loadStore(): MemStore {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<MemStore>;
    const empty = createEmptyStore();
    // Merge phòng file cũ thiếu key (schema tiến hoá giữa các milestone).
    return {
      classes: parsed.classes ?? empty.classes,
      memberships: parsed.memberships ?? [],
      assignments: parsed.assignments ?? [],
      submissions: parsed.submissions ?? [],
      quizResults: parsed.quizResults ?? [],
      activity: parsed.activity ?? [],
    };
  } catch {
    return createEmptyStore();
  }
}

class FileDb extends MemoryDb {
  private writeQueued = false;

  constructor() {
    super(loadStore());
  }

  /** Ghi debounce trong cùng tick — gom nhiều mutation liên tiếp thành 1 lần ghi. */
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
        console.error("FileDb persist error:", err);
      }
    });
  }
}

export function getFileDb(): PhyLabDb {
  // Cache trên globalThis để sống qua HMR trong dev.
  const g = globalThis as { __phylabFileDb?: PhyLabDb };
  if (!g.__phylabFileDb) g.__phylabFileDb = new FileDb();
  return g.__phylabFileDb;
}
