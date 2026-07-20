/**
 * db.ts — CỔNG DUY NHẤT truy cập dữ liệu lớp học (classes/assignments/submissions...).
 *
 * Kiến trúc: mọi API route gọi `getDb()` và làm việc qua interface `PhyLabDb`.
 *  - Chạy trên Cloudflare Pages (next-on-pages): dùng D1 qua binding `DB`  → db-d1.ts
 *  - Chạy `npm run dev` thường (không wrangler):  fallback in-memory        → db-memory.ts
 *    (đủ mọi tính năng để dev/demo trên 1 máy; dữ liệu mất khi restart server)
 *
 * Nếu sau này đổi adapter Cloudflare (vd @opennextjs/cloudflare) → CHỈ sửa file này.
 */

import type {
  ClassInfo,
  ClassSummary,
  ClassMember,
  Assignment,
  AssignmentInput,
  LabSubmission,
  LabSubmissionInput,
  QuizResult,
  QuizResultInput,
  ActivityEvent,
} from "./classTypes";
import { getMemoryDb } from "./db-memory";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Interface mọi adapter DB phải cài đặt. */
export interface PhyLabDb {
  // ── Lớp học ──────────────────────────────────────────────
  createClass(name: string): Promise<ClassInfo>;
  countClasses(): Promise<number>;
  listClasses(): Promise<ClassSummary[]>;
  getClassById(id: string): Promise<ClassInfo | null>;
  getClassByCode(code: string): Promise<ClassInfo | null>;
  /** Xóa lớp + toàn bộ dữ liệu liên quan (thành viên, bài tập, bài nộp, hoạt động). */
  deleteClass(id: string): Promise<void>;

  // ── Thành viên ───────────────────────────────────────────
  joinClass(classId: string, studentId: string, studentName: string): Promise<void>;
  /** Xóa 1 HS khỏi lớp + bài nộp/kết quả quiz của em đó trong lớp này. */
  removeMember(classId: string, studentId: string): Promise<void>;
  listMembers(classId: string): Promise<ClassMember[]>;
  /** Các lớp một HS đã tham gia (mới nhất trước). */
  listMembershipsOfStudent(
    studentId: string
  ): Promise<Array<{ class: ClassInfo; joinedAt: number }>>;

  // ── Bài tập ──────────────────────────────────────────────
  createAssignment(input: AssignmentInput): Promise<Assignment>;
  deleteAssignment(id: string): Promise<void>;
  listAssignments(classId: string): Promise<Assignment[]>;
  getAssignment(id: string): Promise<Assignment | null>;

  // ── Bài Lab đã nộp ───────────────────────────────────────
  upsertLabSubmission(input: LabSubmissionInput): Promise<void>;
  listLabSubmissions(assignmentId: string): Promise<LabSubmission[]>;
  getLabSubmission(assignmentId: string, studentId: string): Promise<LabSubmission | null>;

  // ── Kết quả quiz ─────────────────────────────────────────
  upsertQuizResult(input: QuizResultInput): Promise<void>;
  listQuizResults(assignmentId: string): Promise<QuizResult[]>;
  getQuizResult(assignmentId: string, studentId: string): Promise<QuizResult | null>;

  // ── Hoạt động (cường độ vào app) ─────────────────────────
  logActivity(event: Omit<ActivityEvent, "at"> & { at?: number }): Promise<void>;
  /** Sự kiện của cả lớp kể từ mốc thời gian (cho sparkline + last-active). */
  listClassActivity(classId: string, sinceMs: number): Promise<ActivityEvent[]>;
}

/** Kiểu D1 tối giản (structural) — tránh phụ thuộc @cloudflare/workers-types trong tsconfig. */
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

/**
 * Lấy binding env của Cloudflare nếu đang chạy trên Pages/Workers.
 *
 * OpenNext cung cấp context chính thức cho cả Workers production và local preview.
 */
function getCloudflareEnv(): { DB?: D1Database } | null {
  const { env } = getCloudflareContext();
  return env as { DB?: D1Database };
}

/**
 * Lấy adapter phù hợp môi trường hiện tại (ưu tiên từ trên xuống):
 *  1. Cloudflare D1 (deploy Pages/Workers, binding DB)
 *  2. File JSON `.data/phylab-db.json` (Node: npm run dev / start / demo — SỐNG qua restart)
 *  3. In-memory (fallback cuối, dữ liệu mất khi restart)
 */
export async function getDb(): Promise<PhyLabDb> {
  try {
    const env = getCloudflareEnv();
    if (env?.DB) {
      const { D1Db } = await import("./db-d1");
      return new D1Db(env.DB);
    }
  } catch {
    // Không ở trong Cloudflare context → thử adapter file.
  }
  try {
    // Chỉ resolve được ở Node runtime (route KHÔNG khai runtime="edge").
    const { getFileDb } = await import("./db-file");
    return getFileDb();
  } catch {
    // Edge sandbox không có fs → memory.
  }
  return getMemoryDb();
}

export { MAX_CLASSES } from "./classTypes";

/** Bảng mã sinh mã lớp — bỏ 0/O/1/I cho dễ đọc chép tay. */
export const CLASS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CLASS_CODE_LENGTH = 5;

/** Sinh mã lớp ngẫu nhiên 5 ký tự (caller tự retry nếu trùng UNIQUE). */
export function randomClassCode(): string {
  const bytes = new Uint8Array(CLASS_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const b of bytes) code += CLASS_CODE_ALPHABET[b % CLASS_CODE_ALPHABET.length];
  return code;
}
