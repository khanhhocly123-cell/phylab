/**
 * db-memory.ts — Adapter lưu trong bộ nhớ (kèm hook persist cho adapter file kế thừa).
 *
 * - Dùng trực tiếp khi không có D1 lẫn filesystem (trường hợp hiếm).
 * - `FileDb` (db-file.ts) kế thừa class này và ghi store xuống JSON sau mỗi mutation
 *   → dữ liệu sống qua restart khi chạy `npm run dev` / `npm start` / `npm run demo`.
 * - Seed sẵn 1 lớp demo mã "DEMO1" để thử nhanh tab "Lớp của tôi".
 */

import type { PhyLabDb } from "./db";
import { randomClassCode } from "./db";
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

/** Store dạng thuần-JSON để serialize được xuống file. */
export interface MemStore {
  classes: ClassInfo[];
  memberships: Array<ClassMember & { classId: string }>;
  assignments: Assignment[];
  submissions: LabSubmission[];
  quizResults: QuizResult[];
  activity: ActivityEvent[];
}

export function createEmptyStore(): MemStore {
  return {
    classes: [
      // Seed lớp demo cho dev/demo nhanh.
      { id: "demo-class", code: "DEMO1", name: "Lớp demo 10A1", createdAt: Date.now() },
    ],
    memberships: [],
    assignments: [],
    submissions: [],
    quizResults: [],
    activity: [],
  };
}

export class MemoryDb implements PhyLabDb {
  protected store: MemStore;

  constructor(store?: MemStore) {
    this.store = store ?? createEmptyStore();
  }

  /** Hook cho adapter kế thừa (FileDb ghi JSON); base = no-op. */
  protected persist(): void {}

  /* ── Lớp học ── */

  async createClass(name: string): Promise<ClassInfo> {
    const codes = new Set(this.store.classes.map((c) => c.code));
    let code = randomClassCode();
    while (codes.has(code)) code = randomClassCode();
    const cls: ClassInfo = { id: crypto.randomUUID(), code, name, createdAt: Date.now() };
    this.store.classes.push(cls);
    this.persist();
    return cls;
  }

  async countClasses(): Promise<number> {
    return this.store.classes.length;
  }

  async listClasses(): Promise<ClassSummary[]> {
    return [...this.store.classes]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((c) => ({
        ...c,
        memberCount: this.store.memberships.filter((m) => m.classId === c.id).length,
      }));
  }

  async getClassById(id: string): Promise<ClassInfo | null> {
    return this.store.classes.find((c) => c.id === id) ?? null;
  }

  async getClassByCode(code: string): Promise<ClassInfo | null> {
    return this.store.classes.find((c) => c.code === code) ?? null;
  }

  async deleteClass(id: string): Promise<void> {
    const asgIds = new Set(this.store.assignments.filter((a) => a.classId === id).map((a) => a.id));
    this.store.classes = this.store.classes.filter((c) => c.id !== id);
    this.store.memberships = this.store.memberships.filter((m) => m.classId !== id);
    this.store.assignments = this.store.assignments.filter((a) => a.classId !== id);
    this.store.submissions = this.store.submissions.filter((s) => !asgIds.has(s.assignmentId));
    this.store.quizResults = this.store.quizResults.filter((q) => !asgIds.has(q.assignmentId));
    this.store.activity = this.store.activity.filter((e) => e.classId !== id);
    this.persist();
  }

  /* ── Thành viên ── */

  async joinClass(classId: string, studentId: string, studentName: string): Promise<void> {
    const existing = this.store.memberships.find(
      (m) => m.classId === classId && m.studentId === studentId
    );
    if (existing) {
      existing.studentName = studentName;
    } else {
      this.store.memberships.push({ classId, studentId, studentName, joinedAt: Date.now() });
    }
    this.persist();
  }

  async removeMember(classId: string, studentId: string): Promise<void> {
    const asgIds = new Set(
      this.store.assignments.filter((a) => a.classId === classId).map((a) => a.id)
    );
    this.store.memberships = this.store.memberships.filter(
      (m) => !(m.classId === classId && m.studentId === studentId)
    );
    this.store.submissions = this.store.submissions.filter(
      (s) => !(asgIds.has(s.assignmentId) && s.studentId === studentId)
    );
    this.store.quizResults = this.store.quizResults.filter(
      (q) => !(asgIds.has(q.assignmentId) && q.studentId === studentId)
    );
    this.persist();
  }

  async listMembers(classId: string): Promise<ClassMember[]> {
    return this.store.memberships
      .filter((m) => m.classId === classId)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map(({ studentId, studentName, joinedAt }) => ({ studentId, studentName, joinedAt }));
  }

  async listMembershipsOfStudent(
    studentId: string
  ): Promise<Array<{ class: ClassInfo; joinedAt: number }>> {
    return this.store.memberships
      .filter((m) => m.studentId === studentId)
      .map((m) => ({
        class: this.store.classes.find((c) => c.id === m.classId),
        joinedAt: m.joinedAt,
      }))
      .filter((x): x is { class: ClassInfo; joinedAt: number } => !!x.class)
      .sort((a, b) => b.joinedAt - a.joinedAt);
  }

  /* ── Bài tập ── */

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
    this.store.assignments.push(a);
    this.persist();
    return a;
  }

  async deleteAssignment(id: string): Promise<void> {
    this.store.assignments = this.store.assignments.filter((a) => a.id !== id);
    this.persist();
  }

  async listAssignments(classId: string): Promise<Assignment[]> {
    return this.store.assignments
      .filter((a) => a.classId === classId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async getAssignment(id: string): Promise<Assignment | null> {
    return this.store.assignments.find((a) => a.id === id) ?? null;
  }

  /* ── Bài Lab đã nộp ── */

  async upsertLabSubmission(input: LabSubmissionInput): Promise<void> {
    const prev = this.store.submissions.find(
      (x) => x.assignmentId === input.assignmentId && x.studentId === input.studentId
    );
    if (prev) {
      prev.studentName = input.studentName;
      prev.payload = input.payload;
      prev.score = input.score;
      prev.attempt += 1;
      prev.submittedAt = Date.now();
    } else {
      this.store.submissions.push({
        id: crypto.randomUUID(),
        assignmentId: input.assignmentId,
        studentId: input.studentId,
        studentName: input.studentName,
        payload: input.payload,
        score: input.score,
        attempt: 1,
        submittedAt: Date.now(),
      });
    }
    this.persist();
  }

  async listLabSubmissions(assignmentId: string): Promise<LabSubmission[]> {
    return this.store.submissions
      .filter((x) => x.assignmentId === assignmentId)
      .sort((a, b) => b.submittedAt - a.submittedAt);
  }

  async getLabSubmission(assignmentId: string, studentId: string): Promise<LabSubmission | null> {
    return (
      this.store.submissions.find(
        (x) => x.assignmentId === assignmentId && x.studentId === studentId
      ) ?? null
    );
  }

  /* ── Kết quả quiz ── */

  async upsertQuizResult(input: QuizResultInput): Promise<void> {
    const prev = this.store.quizResults.find(
      (x) => x.assignmentId === input.assignmentId && x.studentId === input.studentId
    );
    if (prev) {
      prev.studentName = input.studentName;
      prev.answers = input.answers;
      prev.detail = input.detail;
      prev.score = input.score;
      prev.submittedAt = Date.now();
    } else {
      this.store.quizResults.push({
        id: crypto.randomUUID(),
        assignmentId: input.assignmentId,
        studentId: input.studentId,
        studentName: input.studentName,
        answers: input.answers,
        detail: input.detail,
        score: input.score,
        submittedAt: Date.now(),
      });
    }
    this.persist();
  }

  async listQuizResults(assignmentId: string): Promise<QuizResult[]> {
    return this.store.quizResults
      .filter((x) => x.assignmentId === assignmentId)
      .sort((a, b) => b.submittedAt - a.submittedAt);
  }

  async getQuizResult(assignmentId: string, studentId: string): Promise<QuizResult | null> {
    return (
      this.store.quizResults.find(
        (x) => x.assignmentId === assignmentId && x.studentId === studentId
      ) ?? null
    );
  }

  /* ── Hoạt động ── */

  async logActivity(event: Omit<ActivityEvent, "at"> & { at?: number }): Promise<void> {
    this.store.activity.push({ ...event, at: event.at ?? Date.now() });
    // Kẹp bộ nhớ: giữ tối đa 5000 sự kiện gần nhất.
    if (this.store.activity.length > 5000) {
      this.store.activity.splice(0, this.store.activity.length - 5000);
    }
    this.persist();
  }

  async listClassActivity(classId: string, sinceMs: number): Promise<ActivityEvent[]> {
    return this.store.activity.filter((e) => e.classId === classId && e.at >= sinceMs);
  }
}

let memoryDb: MemoryDb | null = null;

export function getMemoryDb(): PhyLabDb {
  if (!memoryDb) memoryDb = new MemoryDb();
  return memoryDb;
}
