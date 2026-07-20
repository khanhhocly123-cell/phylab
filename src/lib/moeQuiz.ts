/**
 * moeQuiz.ts — Đề quiz theo FORM ĐỀ THI BỘ GD&ĐT 2025 + bộ chấm deterministic.
 *
 * 3 phần:
 *   Phần I   — Trắc nghiệm nhiều lựa chọn (4 phương án, chọn 1). 0,25đ/câu.
 *   Phần II  — Đúng/Sai: mỗi câu 4 ý a) b) c) d). Thang Bộ GD:
 *              đúng 1 ý = 0,1 · 2 ý = 0,25 · 3 ý = 0,5 · 4 ý = 1,0 điểm.
 *   Phần III — Trả lời ngắn (đáp án số, tối đa 4 ký tự). 0,25đ/câu.
 *
 * Điểm cuối quy về THANG 10 (làm tròn 0,1) để đồng bộ với điểm Lab trong app.
 *
 * LƯU Ý code-style: chỉ dùng cú pháp TS "erasable" (không enum/namespace) để
 * scripts/test-*.mjs import trực tiếp qua ts-runtime của Node (pattern labKnowledge.ts).
 * Việc CHẤM luôn chạy phía server (đáp án không bao giờ gửi xuống client).
 */

import type { QuizItem } from "@/data/quizBank";

/* ── Kiểu câu hỏi ─────────────────────────────────────────── */

export interface MoeMcq {
  kind: "mcq";
  q: string;
  options: string[];     // 4 phương án A/B/C/D
  answer: number;        // index đáp án đúng
  explain?: string;
}

export interface MoeTrueFalse {
  kind: "truefalse";
  q: string;             // đề dẫn của câu
  statements: Array<{ text: string; answer: boolean }>; // 4 ý a/b/c/d
  explain?: string;
}

export interface MoeShort {
  kind: "short";
  q: string;
  answer: string;        // đáp án số dạng chuỗi, ≤ 4 ký tự (vd "9.8", "0.45", "-2")
  tolerance?: number;    // dung sai tuyệt đối khi so số (mặc định 0)
  explain?: string;
}

export type MoeQuestion = MoeMcq | MoeTrueFalse | MoeShort;

export interface MoeQuiz {
  title: string;
  part1: MoeMcq[];
  part2: MoeTrueFalse[];
  part3: MoeShort[];
}

/** Đáp án học sinh gửi lên (null/"" = bỏ trống). */
export interface MoeAnswers {
  part1: Array<number | null>;
  part2: Array<Array<boolean | null>>;  // mỗi câu: 4 lựa chọn Đ/S
  part3: Array<string>;
}

/* ── Kết quả chấm ─────────────────────────────────────────── */

export interface MoeQuestionResult {
  part: 1 | 2 | 3;
  index: number;          // vị trí câu trong phần
  earned: number;         // điểm đạt (thang điểm gốc của phần)
  max: number;
  correct: boolean;       // trọn vẹn câu (PII = đúng cả 4 ý)
  /** PII: đúng/sai từng ý — nguồn cho heatmap lỗi sai. */
  perStatement?: boolean[];
}

export interface MoeGradeResult {
  score: number;          // thang 10, làm tròn 0,1
  earned: number;         // tổng điểm gốc đạt được
  max: number;            // tổng điểm gốc tối đa
  perQuestion: MoeQuestionResult[];
}

/** Thang Bộ GD cho câu Đúng/Sai theo số ý đúng (0..4). */
export function truefalsePoints(correctCount: number): number {
  if (correctCount >= 4) return 1.0;
  if (correctCount === 3) return 0.5;
  if (correctCount === 2) return 0.25;
  if (correctCount === 1) return 0.1;
  return 0;
}

/** So đáp án trả lời ngắn: ưu tiên so SỐ (với dung sai), fallback so chuỗi. */
export function shortAnswerMatches(expected: string, given: string, tolerance = 0): boolean {
  const g = (given ?? "").trim().replace(",", ".");
  const e = expected.trim().replace(",", ".");
  if (!g) return false;
  const ge = Number(g);
  const ee = Number(e);
  if (Number.isFinite(ge) && Number.isFinite(ee)) {
    return Math.abs(ge - ee) <= tolerance + 1e-9;
  }
  return g.toLowerCase() === e.toLowerCase();
}

/** Chấm toàn bộ bài quiz MOE — deterministic, chạy server-side. */
export function gradeMoeQuiz(quiz: MoeQuiz, ans: MoeAnswers): MoeGradeResult {
  const perQuestion: MoeQuestionResult[] = [];
  let earned = 0;
  let max = 0;

  quiz.part1.forEach((qq, i) => {
    const chosen = ans.part1?.[i];
    const ok = chosen != null && chosen === qq.answer;
    const pts = ok ? 0.25 : 0;
    earned += pts;
    max += 0.25;
    perQuestion.push({ part: 1, index: i, earned: pts, max: 0.25, correct: ok });
  });

  quiz.part2.forEach((qq, i) => {
    const given = ans.part2?.[i] ?? [];
    const perStatement = qq.statements.map(
      (st, j) => given[j] != null && given[j] === st.answer
    );
    const nCorrect = perStatement.filter(Boolean).length;
    const pts = truefalsePoints(nCorrect);
    earned += pts;
    max += 1.0;
    perQuestion.push({
      part: 2, index: i, earned: pts, max: 1.0,
      correct: nCorrect === qq.statements.length,
      perStatement,
    });
  });

  quiz.part3.forEach((qq, i) => {
    const ok = shortAnswerMatches(qq.answer, ans.part3?.[i] ?? "", qq.tolerance ?? 0);
    const pts = ok ? 0.25 : 0;
    earned += pts;
    max += 0.25;
    perQuestion.push({ part: 3, index: i, earned: pts, max: 0.25, correct: ok });
  });

  const score = max > 0 ? Math.round((earned / max) * 100) / 10 : 0;
  return { score, earned: Math.round(earned * 100) / 100, max: Math.round(max * 100) / 100, perQuestion };
}

/* ── Tiện ích ─────────────────────────────────────────────── */

/** Chuyển câu MCQ từ ngân hàng ôn tập (quizBank.ts) sang Phần I — GV import nhanh. */
export function toMoeMcq(item: QuizItem): MoeMcq {
  return { kind: "mcq", q: item.q, options: item.options, answer: item.answer, explain: item.explain };
}

/** Lược bỏ đáp án khỏi đề để gửi xuống client (HS làm bài không thấy đáp án). */
export function stripAnswers(quiz: MoeQuiz): unknown {
  return {
    title: quiz.title,
    part1: quiz.part1.map((q) => ({ kind: q.kind, q: q.q, options: q.options })),
    part2: quiz.part2.map((q) => ({
      kind: q.kind, q: q.q,
      statements: q.statements.map((s) => ({ text: s.text })),
    })),
    part3: quiz.part3.map((q) => ({ kind: q.kind, q: q.q })),
  };
}

/** Đề đã lược đáp án (client-side type cho QuizPlayer). */
export interface MoeQuizPublic {
  title: string;
  part1: Array<{ kind: "mcq"; q: string; options: string[] }>;
  part2: Array<{ kind: "truefalse"; q: string; statements: Array<{ text: string }> }>;
  part3: Array<{ kind: "short"; q: string }>;
}
