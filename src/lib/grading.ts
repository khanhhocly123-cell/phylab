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

export interface ExpectedAvgTarget { theta: number; sEF: number }
export interface ExpectedInstTarget { theta: number }
export interface ExpectedFallTarget { s: number }
export interface ExpectedLabTargets {
  average?: ExpectedAvgTarget[];
  instant?: ExpectedInstTarget[];
  freefall?: ExpectedFallTarget[];
}

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
  matchesExpectedTarget: boolean;
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
  missingTrials: number;   // số cấu hình đo độc lập còn thiếu so với MIN_TRIALS
  uniqueConfigurationCount: number; // số cấu hình (s/góc) thực sự khác nhau
  duplicateTrialCount: number;       // số dòng đo lặp cấu hình, không tăng độ phủ dữ liệu
  dataCoveragePercent: number;       // độ phủ cấu hình độc lập so với MIN_TRIALS
  assignmentConstrained: boolean;
  expectedConfigurationCount: number;
  matchedConfigurationCount: number;
  unexpectedConfigurationCount: number;
  unexpectedTrialCount: number;
  meanResult: number;      // trung bình kết quả đo (g hoặc v)
  perRow: RowEval[];
}

export interface LessonGrade {
  lessonId: string;
  samples: SampleGrade[];
  experimentScore: number; // 0..10
  hasGraph: boolean;
  graphScore?: number;     // 0..10 (nếu có đồ thị)
  assignmentCoveragePercent: number;
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
/** Điểm trừ Trình tự cho mỗi cấu hình không nằm trong đề giáo viên. */
export const UNEXPECTED_CONFIGURATION_PENALTY = 2;

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

/**
 * Khóa cấu hình thí nghiệm dùng để phát hiện spam số liệu.
 *
 * Thời gian đo không được đưa vào khóa vì nhiễu mô phỏng làm mỗi lần bấm có thể
 * lệch vài mili-giây dù học sinh chưa đổi điều kiện thí nghiệm. Các bước lượng tử
 * nhỏ hơn độ chia mà UI cho phép, nên hai câu đo thật sự khác nhau vẫn tách biệt.
 */
function configurationKey(
  labKind: LabKind,
  value: { s?: number; sEF?: number; theta?: number }
): string {
  const distance = value.sEF ?? value.s ?? 0;
  const sBucket = Math.round(distance / 0.005);       // 5 mm
  const thetaBucket = Math.round((value.theta ?? LAB6.angle.default) / 0.5); // 0.5°

  if (labKind === "freefall") return `s:${sBucket}`;
  if (labKind === "instant") return `theta:${thetaBucket}`;
  return `theta:${thetaBucket}|s:${sBucket}`;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

/** Chấm một mẫu số liệu (một phần lab). */
export function gradeSample(
  labKind: LabKind,
  trials: Trial[],
  expectedTargets?: ExpectedLabTargets[LabKind]
): SampleGrade {
  const meta = LABELS[labKind];
  const targetKeys = new Set(
    (expectedTargets ?? []).map((target) => configurationKey(labKind, target))
  );
  const assignmentConstrained = targetKeys.size > 0;
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
      matchesExpectedTarget: !assignmentConstrained || targetKeys.has(configurationKey(labKind, tr)),
    };
  });

  // Mỗi cấu hình chỉ có trọng số 1. Lặp một dòng đúng nhiều lần không được phép
  // lấn át các cấu hình còn thiếu hoặc cấu hình làm sai.
  const groups = new Map<string, RowEval[]>();
  rows.forEach((row) => {
    const key = configurationKey(labKind, row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  });
  const groupedEntries = [...groups.entries()];
  const groupedRows = groupedEntries.map(([, group]) => group);
  const scoringGroups = assignmentConstrained
    ? groupedEntries.filter(([key]) => targetKeys.has(key)).map(([, group]) => group)
    : groupedRows;
  const uniqueConfigurationCount = groupedRows.length;
  const duplicateTrialCount = Math.max(0, rows.length - uniqueConfigurationCount);
  const matchedConfigurationCount = assignmentConstrained ? scoringGroups.length : uniqueConfigurationCount;
  const expectedConfigurationCount = assignmentConstrained ? targetKeys.size : MIN_TRIALS;
  const unexpectedConfigurationCount = assignmentConstrained
    ? groupedEntries.filter(([key]) => !targetKeys.has(key)).length
    : 0;
  const unexpectedTrialCount = assignmentConstrained
    ? rows.filter((row) => !row.matchesExpectedTarget).length
    : 0;
  const groupedCalcAccuracy = scoringGroups.map((group) => mean(group.map((row) => row.calcAccuracy)));
  const groupedPhysicalCloseness = scoringGroups.map((group) => mean(group.map((row) => row.physCloseness)));
  const groupedResults = scoringGroups.map((group) => mean(group.map((row) => row.correctResult)));
  const dataCloseness = mean(groupedCalcAccuracy);
  const physicalCloseness = mean(groupedPhysicalCloseness);
  const badSetupCount = rows.filter((r) => !r.balanced).length;

  // Chất lượng chỉ được hưởng đủ điểm khi có đủ cấu hình độc lập. Một cấu hình
  // hoàn hảo lặp ba lần chỉ có độ phủ 1/3, thay vì được tính như ba phép đo.
  const missingTrials = Math.max(0, expectedConfigurationCount - matchedConfigurationCount);
  const dataCoveragePercent = clamp((matchedConfigurationCount / expectedConfigurationCount) * 100, 0, 100);
  const dataScore = scoringGroups.length
    ? round1(clamp(bandScore(dataCloseness) * (dataCoveragePercent / 100), 0, 10))
    : 0;
  const errorScore = scoringGroups.length
    ? round1(bandScore(physicalCloseness) * (dataCoveragePercent / 100))
    : 0;
  // Trình tự: trừ 2.5đ cho mỗi lần đo khi máng chưa cân bằng.
  const sequenceScore = rows.length
    ? clamp(
        10
          - badSetupCount * UNBALANCED_PENALTY
          - unexpectedConfigurationCount * UNEXPECTED_CONFIGURATION_PENALTY,
        0,
        10
      )
    : 0;

  const experimentScore = round1(dataScore * 0.7 + sequenceScore * 0.2 + errorScore * 0.1);
  const meanResult = mean(groupedResults);

  return {
    labKind, label: meta.label, unit: meta.unit, rowCount: rows.length,
    dataScore, sequenceScore, errorScore, experimentScore,
    dataCloseness: round1(dataCloseness), physicalCloseness: round1(physicalCloseness),
    badSetupCount, missingTrials, uniqueConfigurationCount, duplicateTrialCount,
    dataCoveragePercent: round1(dataCoveragePercent), assignmentConstrained,
    expectedConfigurationCount, matchedConfigurationCount,
    unexpectedConfigurationCount, unexpectedTrialCount,
    meanResult, perRow: rows,
  };
}

/**
 * Chấm cả bài. Bài 6 có 2 mẫu (average + instant) → chấm riêng rồi trung bình.
 * @param samples map labKind → trials
 */
export function gradeLesson(
  lessonId: string,
  samples: Partial<Record<LabKind, Trial[]>>,
  opts: { hasGraph?: boolean; graphScore?: number; expectedTargets?: ExpectedLabTargets } = {}
): LessonGrade {
  const sampleGrades: SampleGrade[] = [];
  const assignedKinds = (Object.keys(opts.expectedTargets ?? {}) as LabKind[])
    .filter((kind) => (opts.expectedTargets?.[kind]?.length ?? 0) > 0);
  const kinds = assignedKinds.length ? assignedKinds : (Object.keys(samples) as LabKind[]);
  kinds.forEach((k) => {
    const trials = samples[k] ?? [];
    if (assignedKinds.length || trials.length) {
      sampleGrades.push(gradeSample(k, trials, opts.expectedTargets?.[k]));
    }
  });

  const experimentScore = sampleGrades.length
    ? round1(sampleGrades.reduce((a, s) => a + s.experimentScore, 0) / sampleGrades.length)
    : 0;

  const hasGraph = !!opts.hasGraph;
  const graphScore = opts.graphScore;
  const rawTotalScore = hasGraph && graphScore != null
    ? round1(experimentScore * 0.7 + graphScore * 0.3)
    : experimentScore;
  const expectedCount = assignedKinds.length
    ? sampleGrades.reduce((total, sample) => total + sample.expectedConfigurationCount, 0)
    : 0;
  const matchedCount = assignedKinds.length
    ? sampleGrades.reduce((total, sample) => total + sample.matchedConfigurationCount, 0)
    : expectedCount;
  const assignmentCoveragePercent = expectedCount
    ? clamp((matchedCount / expectedCount) * 100, 0, 100)
    : 100;
  // Đồ thị từ dữ liệu sai cấu hình cũng không thể kéo điểm vượt tỷ lệ câu đã làm đúng đề.
  const totalScore = assignedKinds.length
    ? round1(Math.min(rawTotalScore, 10 * (assignmentCoveragePercent / 100)))
    : rawTotalScore;

  return {
    lessonId, samples: sampleGrades, experimentScore, hasGraph, graphScore,
    assignmentCoveragePercent: round1(assignmentCoveragePercent), totalScore,
  };
}
