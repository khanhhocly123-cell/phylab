/**
 * problemGen.ts — Ra đề THEO TỪNG HỌC SINH (deterministic, có hạt giống).
 *
 * Yêu cầu: sau khi HS làm quen/tính xong, Trợ lý (Smartbot) giao đề đo. Mỗi HS
 * nhận bộ mục tiêu (θ, sEF, s...) khác nhau nhưng ổn định theo tên → kết quả đo
 * khác nhau, không ai giống ai. Việc SINH SỐ chạy cục bộ (chắc chắn khác nhau);
 * Smartbot chỉ DIỄN ĐẠT đề (route /api/vnpt/chat, task="problem").
 */

import { makeRng, distinctValues, randRange } from "./seededRandom";

export type LabKind = "average" | "instant" | "freefall" | "ohm-x" | "ohm-y" | "emf";

export interface AvgTarget { theta: number; sEF: number }
export interface InstTarget { theta: number }
export interface FallTarget { s: number }
export interface OhmTarget { voltage: number }
export interface EmfTarget { resistance: number; voltage?: number }

export interface ProblemSet {
  labKind: LabKind;
  seed: string;
  /** Mục tiêu đo cho từng câu. */
  average?: AvgTarget[];
  instant?: InstTarget[];
  freefall?: FallTarget[];
  "ohm-x"?: OhmTarget[];
  "ohm-y"?: OhmTarget[];
  emf?: EmfTarget[];
  /** Câu chữ đề bài (mặc định do template; có thể được Smartbot ghi đè). */
  prompt: string;
}

/** Sinh bộ đề cho một phần lab, hạt giống = tên HS + mã bài + phần. */
export function generateProblemSet(
  studentName: string,
  lessonId: string,
  labKind: LabKind
): ProblemSet {
  const seed = `${studentName}::${lessonId}::${labKind}`;
  const rng = makeRng(seed);

  if (labKind === "ohm-x" || labKind === "ohm-y") {
    const voltage = distinctValues(rng, 5, 1, 10, 1).sort((a, b) => a - b);
    const data = voltage.map((v) => ({ voltage: v }));
    return { labKind, seed, [labKind]: data, prompt: buildPrompt(labKind, { [labKind]: data }) };
  }

  if (labKind === "emf") {
    const emf = [20, 40, 60, 80, 100].map((resistance) => ({ resistance }));
    return { labKind, seed, emf, prompt: buildPrompt("emf", { emf }) };
  }

  if (labKind === "freefall") {
    // 5 quãng rơi phân biệt trong [0.20, 0.75] m, bước 0.05 m.
    const s = distinctValues(rng, 5, 0.2, 0.75, 0.05);
    return {
      labKind, seed, freefall: s.map((v) => ({ s: v })),
      prompt: buildPrompt("freefall", { freefall: s.map((v) => ({ s: v })) }),
    };
  }

  if (labKind === "instant") {
    // 3 góc nghiêng phân biệt trong [15, 30]°, bước 5°.
    const thetas = distinctValues(rng, 3, 15, 30, 5);
    const instant = thetas.map((t) => ({ theta: t }));
    return { labKind, seed, instant, prompt: buildPrompt("instant", { instant }) };
  }

  // average: 6 câu, mỗi câu 1 cặp (θ, sEF) — θ∈[15,30]°, sEF∈[0.15,0.40]m
  const average: AvgTarget[] = [];
  const usedThetas = distinctValues(rng, 3, 15, 30, 5); // 3 góc, mỗi góc 2 khoảng
  for (const theta of usedThetas) {
    const sEFa = randRange(rng, 0.15, 0.3, 0.05);
    let sEFb = randRange(rng, 0.3, 0.4, 0.05);
    if (sEFb === sEFa) sEFb = +(sEFa + 0.05).toFixed(2);
    average.push({ theta, sEF: +sEFa.toFixed(2) });
    average.push({ theta, sEF: +sEFb.toFixed(2) });
  }
  return { labKind: "average", seed, average, prompt: buildPrompt("average", { average }) };
}

/**
 * Bọc bộ mục tiêu do GIÁO VIÊN tự đặt (assignment lớp học) thành ProblemSet —
 * cùng shape với generateProblemSet nên bench dùng thay thế trực tiếp.
 * seed = "teacher" đánh dấu đề không phải seeded-random.
 */
export function buildAssignedSet(
  labKind: LabKind,
  targets: { average?: AvgTarget[]; instant?: InstTarget[]; freefall?: FallTarget[]; "ohm-x"?: OhmTarget[]; "ohm-y"?: OhmTarget[]; emf?: EmfTarget[] }
): ProblemSet {
  const data = {
    average: labKind === "average" ? targets.average : undefined,
    instant: labKind === "instant" ? targets.instant : undefined,
    freefall: labKind === "freefall" ? targets.freefall : undefined,
    "ohm-x": labKind === "ohm-x" ? targets["ohm-x"] : undefined,
    "ohm-y": labKind === "ohm-y" ? targets["ohm-y"] : undefined,
    emf: labKind === "emf" ? targets.emf : undefined,
  };
  return {
    labKind,
    seed: "teacher",
    ...data,
    prompt: `【Đề của giáo viên】 ${buildPrompt(labKind, data)}`,
  };
}

/** Câu chữ đề bài mặc định (template) — Smartbot có thể thay bằng văn phong tự nhiên hơn. */
export function buildPrompt(
  labKind: LabKind,
  data: { average?: AvgTarget[]; instant?: InstTarget[]; freefall?: FallTarget[]; "ohm-x"?: OhmTarget[]; "ohm-y"?: OhmTarget[]; emf?: EmfTarget[] }
): string {
  if (labKind === "ohm-x" || labKind === "ohm-y") {
    const list = (data[labKind] || []).map((v, i) => `Lần ${i + 1}: U = ${v.voltage.toFixed(1)} V`).join("; ");
    return `Hãy đo vật dẫn ${labKind === "ohm-x" ? "X" : "Y"} ở các điện áp sau, ghi I và tính R = U/I. ${list}.`;
  }
  if (labKind === "emf") {
    const list = (data.emf || []).map((v, i) => `Lần ${i + 1}: R = ${v.resistance.toFixed(0)} Ω`).join("; ");
    return `Hãy đặt biến trở ở các giá trị sau, ghi U và I rồi vẽ U theo I để suy ra E và r. ${list}.`;
  }
  if (labKind === "freefall") {
    const list = (data.freefall || []).map((f, i) => `Câu ${i + 1}: s = ${(f.s * 100).toFixed(0)} cm`).join("; ");
    return `Trợ lý Phylab giao đề: hãy trượt cổng quang tới từng quãng rơi sau, thả trụ thép và đo thời gian t để tính g = 2s/t². ${list}. Mỗi câu đo ít nhất 1 lần rồi ghi số liệu.`;
  }
  if (labKind === "instant") {
    const list = (data.instant || []).map((t, i) => `Câu ${i + 1}: θ = ${t.theta}°`).join("; ");
    return `Trợ lý Phylab giao đề: đặt máng ở từng góc nghiêng sau, cho bi che một cổng quang (MODE A) và đo thời gian che t để tính vận tốc tức thời v = d/t. ${list}.`;
  }
  const list = (data.average || [])
    .map((a, i) => `Câu ${i + 1}: θ = ${a.theta}°, sEF = ${(a.sEF * 100).toFixed(0)} cm`)
    .join("; ");
  return `Trợ lý Phylab giao đề: với mỗi câu, đặt góc nghiêng θ và khoảng cách hai cổng sEF như sau rồi đo thời gian bi đi từ E đến F (MODE A↔B) để tính vận tốc trung bình v = sEF/t. ${list}.`;
}
