/**
 * antiCheatQuiz.ts — Sinh QUIZ CHỐNG GIAN LẬN từ chính số liệu Lab của học sinh.
 *
 * Ý tưởng: câu hỏi được tính từ (s, t, θ, balanced) trong bài Lab EM ĐÓ đã nộp —
 * mỗi học sinh số liệu khác nhau → đề khác nhau → chép đáp án của bạn là vô nghĩa.
 *
 * Deterministic: seed = assignmentId::studentId (makeRng), nên server có thể
 * TÁI SINH đúng đề khi chấm — đáp án không bao giờ rời server.
 * Chỉ dùng cú pháp TS "erasable" để scripts/test-*.mjs import trực tiếp.
 */

import { makeRng, pick } from "./seededRandom";
import { correctResultOf, theoreticalOf } from "./grading";
import type { RichTrial } from "./types";
import type { MoeQuiz, MoeMcq, MoeTrueFalse, MoeShort } from "./moeQuiz";

const LAB_NAME: Record<RichTrial["lab"], string> = {
  freefall: "gia tốc rơi tự do $g$",
  average: "vận tốc trung bình $v_{tb}$",
  instant: "vận tốc tức thời $v$",
};

const UNIT: Record<RichTrial["lab"], string> = {
  freefall: "m/s²",
  average: "m/s",
  instant: "m/s",
};

const round2 = (x: number) => Math.round(x * 100) / 100;
const round3 = (x: number) => Math.round(x * 1000) / 1000;

/** Mô tả 1 lần đo trong lời văn câu hỏi. */
function trialDesc(tr: RichTrial): string {
  const parts = [`s = ${round3(tr.s)} m`, `t = ${round3(tr.t)} s`];
  if (tr.theta != null) parts.push(`θ = ${tr.theta}°`);
  return parts.join(", ");
}

/**
 * Sinh đề quiz cá nhân từ trials của HS.
 * @param trials  số liệu bài Lab đã nộp (RichTrial[])
 * @param seed    `${assignmentId}::${studentId}` — cùng seed → cùng đề
 */
export function generatePersonalQuiz(trials: RichTrial[], seed: string): MoeQuiz {
  const rng = makeRng("personal-quiz", seed);
  const usable = trials.filter((t) => t.t > 0 && t.s > 0);
  if (usable.length === 0) {
    return { title: "Quiz kiểm chứng bài Lab", part1: [], part2: [], part3: [] };
  }

  const part1: MoeMcq[] = [];
  const part2: MoeTrueFalse[] = [];
  const part3: MoeShort[] = [];

  /* ── Phần III: tính lại kết quả từ chính số liệu của em (2 câu) ── */
  const shortPool = [...usable];
  for (let k = 0; k < Math.min(2, shortPool.length); k++) {
    const tr = shortPool.splice(Math.floor(rng() * shortPool.length), 1)[0];
    const ans = correctResultOf(tr.lab, tr.s, tr.t);
    part3.push({
      kind: "short",
      q: `Trong bài Lab, em đã đo được ${trialDesc(tr)}. Tính ${LAB_NAME[tr.lab]} của lần đo này (${UNIT[tr.lab]}, làm tròn 2 chữ số thập phân).`,
      answer: String(round2(ans)),
      tolerance: Math.max(0.01, round2(ans * 0.02)), // dung sai 2%
      explain: `Tính từ công thức với số liệu em đo: kết quả ≈ ${round2(ans)} ${UNIT[tr.lab]}.`,
    });
  }

  /* ── Phần I: lần đo lệch lý thuyết nhiều nhất (nếu ≥ 2 lần đo) ── */
  if (usable.length >= 2) {
    const devs = usable.map((tr, i) => {
      const theo = theoreticalOf(tr.lab, tr.s, tr.theta);
      const val = correctResultOf(tr.lab, tr.s, tr.t);
      return { i, dev: theo > 0 ? Math.abs(val - theo) / theo : 0 };
    });
    const worst = devs.reduce((a, b) => (b.dev > a.dev ? b : a));
    const options = usable
      .slice(0, 4)
      .map((tr, i) => `Lần đo ${i + 1} (${trialDesc(tr)})`);
    const answerIdx = Math.min(worst.i, options.length - 1);
    part1.push({
      kind: "mcq",
      q: `Trong các lần đo dưới đây của CHÍNH EM, lần nào cho kết quả lệch xa giá trị lý thuyết nhất?`,
      options,
      answer: answerIdx,
      explain: "So từng kết quả tính được với giá trị lý thuyết từ engine vật lý.",
    });
  }

  /* ── Phần I: câu hiểu công thức gắn số liệu của em ── */
  const tr0 = pick(rng, usable);
  if (tr0.lab === "freefall") {
    part1.push({
      kind: "mcq",
      q: `Với quãng rơi $s = ${round3(tr0.s)}$ m em đã dùng, nếu tăng s lên gấp 4 lần thì thời gian rơi $t$ thay đổi thế nào?`,
      options: ["Tăng gấp 2 lần", "Tăng gấp 4 lần", "Không đổi", "Giảm một nửa"],
      answer: 0,
      explain: "Vì $s = \\frac{1}{2}gt^2$ nên $t \\propto \\sqrt{s}$ — s gấp 4 thì t gấp 2.",
    });
  } else {
    part1.push({
      kind: "mcq",
      q: `Trong phép đo của em (θ = ${tr0.theta ?? "?"}°), nếu tăng góc nghiêng θ thì thời gian bi đi qua hai cổng quang sẽ:`,
      options: ["Giảm", "Tăng", "Không đổi", "Không xác định được"],
      answer: 0,
      explain: "θ tăng → gia tốc $a = \\frac{5}{7}g\\sin\\theta$ tăng → bi nhanh hơn → t giảm.",
    });
  }

  /* ── Phần II: Đúng/Sai 4 ý về chính dữ liệu của em ── */
  const mean =
    usable.reduce((a, tr) => a + correctResultOf(tr.lab, tr.s, tr.t), 0) / usable.length;
  const theo0 = theoreticalOf(usable[0].lab, usable[0].s, usable[0].theta);
  const allBalanced = usable.every((tr) => tr.balanced !== false);
  const trMax = usable.reduce((a, b) => (b.t > a.t ? b : a));
  const trMin = usable.reduce((a, b) => (b.t < a.t ? b : a));

  part2.push({
    kind: "truefalse",
    q: `Xét bộ số liệu ${usable.length} lần đo em đã nộp trong bài Lab:`,
    statements: [
      {
        text: `Giá trị trung bình của ${LAB_NAME[usable[0].lab]} tính từ số liệu của em xấp xỉ ${round2(mean)} ${UNIT[usable[0].lab]}.`,
        answer: true,
      },
      {
        text: "Tất cả các lần đo đều được thực hiện khi dụng cụ ĐÃ cân bằng.",
        answer: allBalanced,
      },
      {
        text: `Lần đo có thời gian LỚN nhất của em là t = ${round3(trMax.t)} s.`,
        answer: true,
      },
      {
        text: `Kết quả đo của em lệch giá trị lý thuyết hơn 50%.`,
        answer: theo0 > 0 ? Math.abs(mean - theo0) / theo0 > 0.5 : false,
      },
    ],
    explain: `Trung bình ≈ ${round2(mean)}; t lớn nhất = ${round3(trMax.t)} s, nhỏ nhất = ${round3(trMin.t)} s.`,
  });

  return {
    title: "Quiz kiểm chứng bài Lab (đề riêng của em)",
    part1,
    part2,
    part3,
  };
}
