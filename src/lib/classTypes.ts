/**
 * classTypes.ts — Kiểu dữ liệu dùng chung cho TÍNH NĂNG LỚP HỌC (giáo viên ↔ học sinh).
 *
 * Dùng ở cả client (tab "Lớp của tôi", shell giáo viên) lẫn server (API routes + db).
 * Payload bài tập lưu dạng JSON trong DB:
 *  - kind "lab"           → LabAssignmentPayload (bộ mục tiêu đo giáo viên tự đặt)
 *  - kind "quiz"          → MoeQuiz (đề theo form Bộ GD 2025 — xem moeQuiz.ts)
 *  - kind "personal_quiz" → PersonalQuizPayload (đề sinh từ số liệu của chính HS)
 */

import type { AvgTarget, InstTarget, FallTarget, OhmTarget, EmfTarget } from "./problemGen";
import type { RichTrial } from "./types";

/** Giới hạn số lớp giáo viên demo được tạo (chống spam / lạm dụng bộ nhớ). */
export const MAX_CLASSES = 30;

/** Thông tin một lớp học. */
export interface ClassInfo {
  id: string;
  /** Mã tham gia 5 ký tự (bỏ 0/O/1/I) — HS nhập mã này để vào lớp. */
  code: string;
  name: string;
  createdAt: number; // epoch ms
}

/** Lớp + sĩ số (cho danh sách lớp của giáo viên). */
export interface ClassSummary extends ClassInfo {
  memberCount: number;
}

/** Một học sinh trong lớp. */
export interface ClassMember {
  studentId: string;   // UUID sinh ở localStorage phía HS
  studentName: string;
  joinedAt: number;
}

export type AssignmentKind = "lab" | "quiz" | "personal_quiz";

/** Payload bài tập Lab: giáo viên tự đặt mục tiêu đo (thay đề seeded/AI). */
export interface LabAssignmentPayload {
  problemSets: {
    average?: AvgTarget[];
    instant?: InstTarget[];
    freefall?: FallTarget[];
    "ohm-x"?: OhmTarget[];
    "ohm-y"?: OhmTarget[];
    emf?: EmfTarget[];
  };
}

/** Payload quiz cá nhân hoá chống gian lận: đề sinh từ bài lab nguồn. */
export interface PersonalQuizPayload {
  /** Assignment lab nguồn — HS phải nộp bài này trước mới nhận đề. */
  sourceAssignmentId: string;
}

/** Một bài tập giáo viên giao cho lớp. */
export interface Assignment {
  id: string;
  classId: string;
  kind: AssignmentKind;
  title: string;
  lessonId?: string;
  /** JSON payload theo kind — cast ở nơi dùng. */
  payload: unknown;
  dueAt?: number | null;
  /** Thời điểm MỞ bài (epoch ms). Trước mốc này HS chưa làm được (chỉ áp cho quiz). */
  openAt?: number | null;
  /** Thời lượng làm bài quiz (giây). Hết giờ auto nộp. */
  durationSec?: number | null;
  /** Quiz gắn nối tiếp sau 1 bài Lab (id assignment lab) — khóa đến khi nộp Lab đó. */
  linkedLabId?: string | null;
  createdAt: number;
}

export interface AssignmentInput {
  classId: string;
  kind: AssignmentKind;
  title: string;
  lessonId?: string;
  payload: unknown;
  dueAt?: number | null;
  openAt?: number | null;
  durationSec?: number | null;
  linkedLabId?: string | null;
}

/** Bài Lab học sinh đã nộp (đã chấm deterministic). */
export interface LabSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  payload: {
    trials: RichTrial[];
    /** LessonGrade từ grading.ts (giữ unknown để không kéo dep vòng). */
    grade?: unknown;
    aiFeedback?: string;
  };
  score: number;   // thang 10
  attempt: number; // số lần nộp (UPSERT giữ bản mới nhất)
  submittedAt: number;
}

export interface LabSubmissionInput {
  assignmentId: string;
  studentId: string;
  studentName: string;
  payload: LabSubmission["payload"];
  score: number;
}

/** Kết quả một bài quiz của học sinh. */
export interface QuizResult {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  /** Đáp án HS gửi (JSON MoeAnswers). */
  answers: unknown;
  /** Breakdown từng câu (đúng/sai, điểm) — nguồn cho heatmap lỗi sai. */
  detail: unknown;
  score: number; // thang 10
  submittedAt: number;
}

export interface QuizResultInput {
  assignmentId: string;
  studentId: string;
  studentName: string;
  answers: unknown;
  detail: unknown;
  score: number;
}

export type ActivityType = "login" | "lab_start" | "lab_submit" | "quiz_submit";

export interface ActivityEvent {
  studentId: string;
  studentName: string;
  classId?: string | null;
  type: ActivityType;
  meta?: string | null;
  at: number;
}

/** Trạng thái bài tập của MỘT học sinh (nuôi tab "Lớp của tôi"). */
export interface MyAssignmentStatus {
  assignment: Assignment;
  /** Điểm nếu đã nộp (lab → submissions, quiz → quiz_results). */
  score?: number | null;
  submittedAt?: number | null;
}

/** Kết quả GET /api/class/my. */
export interface MyClassData {
  class: ClassInfo;
  joinedAt: number;
  memberCount: number;
  assignments: MyAssignmentStatus[];
}

/** Thống kê nộp bài theo assignment (GET /api/class/detail). */
export interface AssignmentStat {
  assignmentId: string;
  submittedCount: number;
  avgScore: number | null;
}

/** Hoạt động 7 ngày của 1 HS: lần cuối + số sự kiện theo ngày (days[6] = hôm nay). */
export interface StudentActivitySummary {
  lastActive: number;
  days: number[];
}

/** Kết quả GET /api/class/detail. */
export interface ClassDetailData {
  class: ClassInfo;
  members: ClassMember[];
  assignments: Assignment[];
  stats: AssignmentStat[];
  activity: Record<string, StudentActivitySummary>;
}
