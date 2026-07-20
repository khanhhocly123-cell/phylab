/**
 * db-d1.ts — Adapter Cloudflare D1 (SQLite) cho production trên Cloudflare Pages.
 *
 * Schema: migrations/0001_init.sql. Mọi JSON (payload, answers, detail) lưu TEXT.
 * Chỉ được import từ getDb() (db.ts) — route KHÔNG import trực tiếp file này.
 */

import type { PhyLabDb, D1Database } from "./db";
import { randomClassCode } from "./db";
import type {
  ClassInfo,
  ClassSummary,
  ClassMember,
  Assignment,
  AssignmentInput,
  AssignmentKind,
  LabSubmission,
  LabSubmissionInput,
  QuizResult,
  QuizResultInput,
  ActivityEvent,
  ActivityType,
} from "./classTypes";

/* ── Row types (đúng cột trong migration) ─────────────────── */
interface ClassRow { id: string; code: string; name: string; created_at: number }
interface ClassSummaryRow extends ClassRow { member_count: number }
interface MemberRow { student_id: string; student_name: string; joined_at: number }
interface MembershipRow extends ClassRow { joined_at: number }
interface AssignmentRow {
  id: string; class_id: string; kind: string; title: string;
  lesson_id: string | null; payload: string; due_at: number | null; created_at: number;
  open_at: number | null; duration_sec: number | null; linked_lab_id: string | null;
}
interface SubmissionRow {
  id: string; assignment_id: string; student_id: string; student_name: string;
  payload: string; score: number; attempt: number; submitted_at: number;
}
interface QuizResultRow {
  id: string; assignment_id: string; student_id: string; student_name: string;
  answers: string; detail: string; score: number; submitted_at: number;
}
interface ActivityRow {
  student_id: string; student_name: string; class_id: string | null;
  type: string; meta: string | null; at: number;
}

function parseJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}

function toAssignment(r: AssignmentRow): Assignment {
  return {
    id: r.id,
    classId: r.class_id,
    kind: r.kind as AssignmentKind,
    title: r.title,
    lessonId: r.lesson_id ?? undefined,
    payload: parseJson(r.payload),
    dueAt: r.due_at,
    openAt: r.open_at,
    durationSec: r.duration_sec,
    linkedLabId: r.linked_lab_id,
    createdAt: r.created_at,
  };
}

function toSubmission(r: SubmissionRow): LabSubmission {
  return {
    id: r.id,
    assignmentId: r.assignment_id,
    studentId: r.student_id,
    studentName: r.student_name,
    payload: (parseJson(r.payload) ?? { trials: [] }) as LabSubmission["payload"],
    score: r.score,
    attempt: r.attempt,
    submittedAt: r.submitted_at,
  };
}

function toQuizResult(r: QuizResultRow): QuizResult {
  return {
    id: r.id,
    assignmentId: r.assignment_id,
    studentId: r.student_id,
    studentName: r.student_name,
    answers: parseJson(r.answers),
    detail: parseJson(r.detail),
    score: r.score,
    submittedAt: r.submitted_at,
  };
}

export class D1Db implements PhyLabDb {
  constructor(private db: D1Database) {}

  async createClass(name: string): Promise<ClassInfo> {
    // Retry khi mã trùng (UNIQUE constraint) — xác suất cực thấp với 32^5 mã.
    for (let i = 0; i < 5; i++) {
      const cls: ClassInfo = {
        id: crypto.randomUUID(),
        code: randomClassCode(),
        name,
        createdAt: Date.now(),
      };
      try {
        await this.db
          .prepare("INSERT INTO classes (id, code, name, created_at) VALUES (?1, ?2, ?3, ?4)")
          .bind(cls.id, cls.code, cls.name, cls.createdAt)
          .run();
        return cls;
      } catch (err) {
        if (i === 4) throw err;
      }
    }
    throw new Error("Không sinh được mã lớp.");
  }

  async countClasses(): Promise<number> {
    const r = await this.db
      .prepare("SELECT COUNT(*) AS n FROM classes")
      .first<{ n: number }>();
    return r?.n ?? 0;
  }

  async listClasses(): Promise<ClassSummary[]> {
    const { results } = await this.db
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM memberships m WHERE m.class_id = c.id) AS member_count
         FROM classes c ORDER BY c.created_at DESC`
      )
      .all<ClassSummaryRow>();
    return results.map((r) => ({
      id: r.id, code: r.code, name: r.name, createdAt: r.created_at, memberCount: r.member_count,
    }));
  }

  async getClassById(id: string): Promise<ClassInfo | null> {
    const r = await this.db
      .prepare("SELECT * FROM classes WHERE id = ?1")
      .bind(id)
      .first<ClassRow>();
    return r ? { id: r.id, code: r.code, name: r.name, createdAt: r.created_at } : null;
  }

  async getClassByCode(code: string): Promise<ClassInfo | null> {
    const r = await this.db
      .prepare("SELECT * FROM classes WHERE code = ?1")
      .bind(code)
      .first<ClassRow>();
    return r ? { id: r.id, code: r.code, name: r.name, createdAt: r.created_at } : null;
  }

  async deleteClass(id: string): Promise<void> {
    // Xóa con trước (không bật foreign_keys mặc định trên D1) → dọn sạch dữ liệu lớp.
    const stmts = [
      "DELETE FROM submissions WHERE assignment_id IN (SELECT id FROM assignments WHERE class_id = ?1)",
      "DELETE FROM quiz_results WHERE assignment_id IN (SELECT id FROM assignments WHERE class_id = ?1)",
      "DELETE FROM assignments WHERE class_id = ?1",
      "DELETE FROM memberships WHERE class_id = ?1",
      "DELETE FROM activity_events WHERE class_id = ?1",
      "DELETE FROM classes WHERE id = ?1",
    ];
    for (const sql of stmts) await this.db.prepare(sql).bind(id).run();
  }

  async joinClass(classId: string, studentId: string, studentName: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO memberships (class_id, student_id, student_name, joined_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (class_id, student_id) DO UPDATE SET student_name = excluded.student_name`
      )
      .bind(classId, studentId, studentName, Date.now())
      .run();
  }

  async removeMember(classId: string, studentId: string): Promise<void> {
    await this.db
      .prepare(
        `DELETE FROM submissions WHERE student_id = ?2
           AND assignment_id IN (SELECT id FROM assignments WHERE class_id = ?1)`
      )
      .bind(classId, studentId)
      .run();
    await this.db
      .prepare(
        `DELETE FROM quiz_results WHERE student_id = ?2
           AND assignment_id IN (SELECT id FROM assignments WHERE class_id = ?1)`
      )
      .bind(classId, studentId)
      .run();
    await this.db
      .prepare("DELETE FROM memberships WHERE class_id = ?1 AND student_id = ?2")
      .bind(classId, studentId)
      .run();
  }

  async listMembers(classId: string): Promise<ClassMember[]> {
    const { results } = await this.db
      .prepare(
        "SELECT student_id, student_name, joined_at FROM memberships WHERE class_id = ?1 ORDER BY joined_at ASC"
      )
      .bind(classId)
      .all<MemberRow>();
    return results.map((r) => ({
      studentId: r.student_id, studentName: r.student_name, joinedAt: r.joined_at,
    }));
  }

  async listMembershipsOfStudent(
    studentId: string
  ): Promise<Array<{ class: ClassInfo; joinedAt: number }>> {
    const { results } = await this.db
      .prepare(
        `SELECT c.*, m.joined_at FROM memberships m
         JOIN classes c ON c.id = m.class_id
         WHERE m.student_id = ?1 ORDER BY m.joined_at DESC`
      )
      .bind(studentId)
      .all<MembershipRow>();
    return results.map((r) => ({
      class: { id: r.id, code: r.code, name: r.name, createdAt: r.created_at },
      joinedAt: r.joined_at,
    }));
  }

  async createAssignment(input: AssignmentInput): Promise<Assignment> {
    const a: Assignment = {
      id: crypto.randomUUID(),
      classId: input.classId,
      kind: input.kind,
      title: input.title,
      lessonId: input.lessonId,
      payload: input.payload,
      dueAt: input.dueAt ?? null,
      openAt: input.openAt ?? null,
      durationSec: input.durationSec ?? null,
      linkedLabId: input.linkedLabId ?? null,
      createdAt: Date.now(),
    };
    await this.db
      .prepare(
        `INSERT INTO assignments
           (id, class_id, kind, title, lesson_id, payload, due_at, created_at, open_at, duration_sec, linked_lab_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
      )
      .bind(
        a.id, a.classId, a.kind, a.title, a.lessonId ?? null,
        JSON.stringify(a.payload ?? null), a.dueAt, a.createdAt,
        a.openAt, a.durationSec, a.linkedLabId
      )
      .run();
    return a;
  }

  async deleteAssignment(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM assignments WHERE id = ?1").bind(id).run();
  }

  async listAssignments(classId: string): Promise<Assignment[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM assignments WHERE class_id = ?1 ORDER BY created_at DESC")
      .bind(classId)
      .all<AssignmentRow>();
    return results.map(toAssignment);
  }

  async getAssignment(id: string): Promise<Assignment | null> {
    const r = await this.db
      .prepare("SELECT * FROM assignments WHERE id = ?1")
      .bind(id)
      .first<AssignmentRow>();
    return r ? toAssignment(r) : null;
  }

  async upsertLabSubmission(input: LabSubmissionInput): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO submissions (id, assignment_id, student_id, student_name, payload, score, attempt, submitted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7)
         ON CONFLICT (assignment_id, student_id) DO UPDATE SET
           student_name = excluded.student_name,
           payload = excluded.payload,
           score = excluded.score,
           attempt = submissions.attempt + 1,
           submitted_at = excluded.submitted_at`
      )
      .bind(
        crypto.randomUUID(), input.assignmentId, input.studentId, input.studentName,
        JSON.stringify(input.payload), input.score, Date.now()
      )
      .run();
  }

  async listLabSubmissions(assignmentId: string): Promise<LabSubmission[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM submissions WHERE assignment_id = ?1 ORDER BY submitted_at DESC")
      .bind(assignmentId)
      .all<SubmissionRow>();
    return results.map(toSubmission);
  }

  async getLabSubmission(assignmentId: string, studentId: string): Promise<LabSubmission | null> {
    const r = await this.db
      .prepare("SELECT * FROM submissions WHERE assignment_id = ?1 AND student_id = ?2")
      .bind(assignmentId, studentId)
      .first<SubmissionRow>();
    return r ? toSubmission(r) : null;
  }

  async upsertQuizResult(input: QuizResultInput): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO quiz_results (id, assignment_id, student_id, student_name, answers, detail, score, submitted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT (assignment_id, student_id) DO UPDATE SET
           student_name = excluded.student_name,
           answers = excluded.answers,
           detail = excluded.detail,
           score = excluded.score,
           submitted_at = excluded.submitted_at`
      )
      .bind(
        crypto.randomUUID(), input.assignmentId, input.studentId, input.studentName,
        JSON.stringify(input.answers ?? null), JSON.stringify(input.detail ?? null),
        input.score, Date.now()
      )
      .run();
  }

  async listQuizResults(assignmentId: string): Promise<QuizResult[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM quiz_results WHERE assignment_id = ?1 ORDER BY submitted_at DESC")
      .bind(assignmentId)
      .all<QuizResultRow>();
    return results.map(toQuizResult);
  }

  async getQuizResult(assignmentId: string, studentId: string): Promise<QuizResult | null> {
    const r = await this.db
      .prepare("SELECT * FROM quiz_results WHERE assignment_id = ?1 AND student_id = ?2")
      .bind(assignmentId, studentId)
      .first<QuizResultRow>();
    return r ? toQuizResult(r) : null;
  }

  async logActivity(event: Omit<ActivityEvent, "at"> & { at?: number }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO activity_events (student_id, student_name, class_id, type, meta, at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(
        event.studentId, event.studentName, event.classId ?? null,
        event.type, event.meta ?? null, event.at ?? Date.now()
      )
      .run();
  }

  async listClassActivity(classId: string, sinceMs: number): Promise<ActivityEvent[]> {
    const { results } = await this.db
      .prepare(
        "SELECT student_id, student_name, class_id, type, meta, at FROM activity_events WHERE class_id = ?1 AND at >= ?2 ORDER BY at ASC"
      )
      .bind(classId, sinceMs)
      .all<ActivityRow>();
    return results.map((r) => ({
      studentId: r.student_id,
      studentName: r.student_name,
      classId: r.class_id,
      type: r.type as ActivityType,
      meta: r.meta,
      at: r.at,
    }));
  }
}
