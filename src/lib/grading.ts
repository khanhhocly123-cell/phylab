/**
 * grading.ts — Bộ chấm điểm DETERMINISTIC cho Notes (thang KHẮT KHE).
 *
 * Công thức (mỗi thành phần 0..10):
 *   Điểm thí nghiệm = Số liệu × 70% + Trình tự × 20% + Sai số × 10%
 *   Tổng = Điểm thí nghiệm × 0.7 + Điểm đồ thị × 0.3 (đồ thị BẮT BUỘC)
 *
 * Thang khắt khe:
 *   - Độ sát → điểm băng: ≥98 → 10, ≥95 → 9, ≥90 → 8, ≥80 → 6.5, ≥70 → 5, <70 → 3.
 *   - Ô "Kết quả tính" đúng khi lệch ≤ 1% so với công thức (RESULT_TOLERANCE).
 *   - Ô bỏ trống = 0% độ sát cho lần đo đó.
 *   - Mỗi lần đo khi chưa cân bằng: trừ 2.5đ Trình tự (UNBALANCED_PENALTY).
 *   - Dưới MIN_TRIALS lần đo/mẫu: trừ 2đ Số liệu cho mỗi lần đo còn thiếu.
 *
 * Điểm SỐ do máy tính deterministic (đáng tin, không lệch giữa các lần); LLM/Smartbot
 * chỉ viết phần NHẬN XÉT (xem /api/vnpt/chat task="grade").
 */

// Lõi vật lý (nguồn sự thật để suy giá trị lý thuyết).
import { LAB6, accel, velAt } from "@/engine/physics.js";
import { FREEFALL } from "@/engine/physicsFreeFall.js";

export type LabKind = "average" | "instant" | "freefall";

/** Một lần đo do engine lab xuất ra. */
export interface Trial {
  s: number;              // sEF (average) | đường kính d/1000 (instant) | quãng rơi s (freefall) — mét
  t: number;              // thời gian đo (s)
  theta?: number;         // góc nghiêng (Bài 6)
  balanced?: boolean;     // máng đã cân bằng khi đo chưa (trình tự)
  studentResult?: number | null; // kết quả HS tự tính (điền ở Notes)
}

export interface RowEval {
  index: number;
  s: number;
  t: number;
  theta?: number;
  correctResult: number;   // kết quả đúng theo công thức từ (s,t) HS đo
  theoretical: number;     // giá trị lý thuyết mong đợi (g hoặc v)
  studentResult: number | null;
  calcAccuracy: number;    // % HS tự tính đúng so với công thức
  physCloseness: number;   // % số đo sát giá trị lý thuyết
  correct: boolean;        // HS tự tính đúng trong dung sai 2%
  balanced: boolean;
}

export interface SampleGrade {
  labKind: LabKind;
  label: string;
  unit: string;
  rowCount: number;
  dataScore: number;       // 0..10
  sequenceScore: number;   // 0..10
  errorScore: number;      // 0..10
  experimentScore: number; // 0..10 (đã theo trọng số 70/20/10)
  dataCloseness: number;   // %
  physicalCloseness: number; // %
  badSetupCount: number;
  missingTrials: number;   // số lần đo còn thiếu so với MIN_TRIALS
  meanResult: number;      // trung bình kết quả đo (g hoặc v)
  perRow: RowEval[];
}

export interface LessonGrade {
  lessonId: string;
  samples: SampleGrade[];
  experimentScore: number; // 0..10
  hasGraph: boolean;
  graphScore?: number;     // 0..10 (nếu có đồ thị)
  totalScore: number;      // 0..10
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const round1 = (x: number) => Math.round(x * 10) / 10;

/** Dung sai để ô "Kết quả tính" của HS được coi là Đúng (1%). */
export const RESULT_TOLERANCE = 0.01;
/** Số lần đo tối thiểu cho mỗi mẫu; thiếu bị trừ điểm Số liệu. */
export const MIN_TRIALS = 3;
/** Điểm trừ Số liệu cho mỗi lần đo còn thiếu so với MIN_TRIALS. */
export const FEW_TRIALS_PENALTY = 2;
/** Điểm trừ Trình tự cho mỗi lần đo khi máng/giá chưa cân bằng. */
export const UNBALANCED_PENALTY = 2.5;

/** Ngưỡng độ sát → điểm băng 0..10 (thang khắt khe). */
export function bandScore(closenessPercent: number): number {
  if (closenessPercent >= 98) return 10;
  if (closenessPercent >= 95) return 9;
  if (closenessPercent >= 90) return 8;
  if (closenessPercent >= 80) return 6.5;
  if (closenessPercent >= 70) return 5;
  return 3;
}

/** Kết quả đúng theo công thức từ (s, t) mà HS đo. */
export function correctResultOf(labKind: LabKind, s: number, t: number): number {
  if (t <= 0) return 0;
  if (labKind === "freefall") return (2 * s) / (t * t); // g = 2s/t²
  return s / t;                                          // v = s/t
}

/** Giá trị lý thuyết mong đợi (ground truth từ engine). */
export function theoreticalOf(labKind: LabKind, s: number, theta?: number): number {
  if (labKind === "freefall") return FREEFALL.g; // g thật engine dùng (9.8)
  const th = theta ?? LAB6.angle.default;
  if (labKind === "instant") return velAt(th, LAB6.sE); // vận tốc tức thời tại cổng E
  // average: vận tốc trung bình lý thuyết trên đoạn EF = (vE + vF)/2
  const vE = velAt(th, LAB6.sE);
  const vF = velAt(th, LAB6.sE + s);
  return (vE + vF) / 2;
}

const LABELS: Record<LabKind, { label: string; unit: string }> = {
  average: { label: "Vận tốc trung bình", unit: "m/s" },
  instant: { label: "Vận tốc tức thời", unit: "m/s" },
  freefall: { label: "Gia tốc rơi tự do", unit: "m/s²" },
};

/** Chấm một mẫu số liệu (một phần lab). */
export function gradeSample(labKind: LabKind, trials: Trial[]): SampleGrade {
  const meta = LABELS[labKind];
  const rows: RowEval[] = trials.map((tr, i) => {
    const correct = correctResultOf(labKind, tr.s, tr.t);
    const theo = theoreticalOf(labKind, tr.s, tr.theta);
    const hasStudent = tr.studentResult != null && !Number.isNaN(tr.studentResult);
    const calcAccuracy = hasStudent && correct > 0
      ? clamp(100 - (Math.abs((tr.studentResult as number) - correct) / correct) * 100, 0, 100)
      : 0;
    const physCloseness = theo > 0
      ? clamp(100 - (Math.abs(correct - theo) / theo) * 100, 0, 100)
      : 0;
    const isCorrect = hasStudent && correct > 0
      && Math.abs((tr.studentResult as number) - correct) <= correct * RESULT_TOLERANCE;
    return {
      index: i + 1, s: tr.s, t: tr.t, theta: tr.theta,
      correctResult: correct, theoretical: theo,
      studentResult: hasStudent ? (tr.studentResult as number) : null,
      calcAccuracy, physCloseness, correct: isCorrect,
      balanced: tr.balanced !== false,
    };
  });

  const n = rows.length || 1;
  const dataCloseness = rows.reduce((a, r) => a + r.calcAccuracy, 0) / n;
  const physicalCloseness = rows.reduce((a, r) => a + r.physCloseness, 0) / n;
  const badSetupCount = rows.filter((r) => !r.balanced).length;

  // Số liệu: điểm băng theo độ chính xác tự tính, trừ thêm nếu đo ít hơn MIN_TRIALS lần.
  const missingTrials = Math.max(0, MIN_TRIALS - rows.length);
  const dataScore = rows.length
    ? clamp(bandScore(dataCloseness) - missingTrials * FEW_TRIALS_PENALTY, 0, 10)
    : 0;
  const errorScore = rows.length ? bandScore(physicalCloseness) : 0;
  // Trình tự: trừ 2.5đ cho mỗi lần đo khi máng chưa cân bằng.
  const sequenceScore = clamp(10 - badSetupCount * UNBALANCED_PENALTY, 0, 10);

  const experimentScore = round1(dataScore * 0.7 + sequenceScore * 0.2 + errorScore * 0.1);
  const meanResult = rows.reduce((a, r) => a + r.correctResult, 0) / n;

  return {
    labKind, label: meta.label, unit: meta.unit, rowCount: rows.length,
    dataScore, sequenceScore, errorScore, experimentScore,
    dataCloseness: round1(dataCloseness), physicalCloseness: round1(physicalCloseness),
    badSetupCount, missingTrials, meanResult, perRow: rows,
  };
}

/**
 * Chấm cả bài. Bài 6 có 2 mẫu (average + instant) → chấm riêng rồi trung bình.
 * @param samples map labKind → trials
 */
export function gradeLesson(
  lessonId: string,
  samples: Partial<Record<LabKind, Trial[]>>,
  opts: { hasGraph?: boolean; graphScore?: number } = {}
): LessonGrade {
  const sampleGrades: SampleGrade[] = [];
  (Object.keys(samples) as LabKind[]).forEach((k) => {
    const trials = samples[k];
    if (trials && trials.length) sampleGrades.push(gradeSample(k, trials));
  });

  const experimentScore = sampleGrades.length
    ? round1(sampleGrades.reduce((a, s) => a + s.experimentScore, 0) / sampleGrades.length)
    : 0;

  const hasGraph = !!opts.hasGraph;
  const graphScore = opts.graphScore;
  const totalScore = hasGraph && graphScore != null
    ? round1(experimentScore * 0.7 + graphScore * 0.3)
    : experimentScore;

  return { lessonId, samples: sampleGrades, experimentScore, hasGraph, graphScore, totalScore };
}
