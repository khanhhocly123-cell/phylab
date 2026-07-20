/**
 * test-class.mjs — UNIT test TÍNH NĂNG LỚP HỌC (giáo viên):
 *   1) moeQuiz.ts   — chấm quiz form Bộ GD 2025 (thang Đúng/Sai 0,1→1đ; trả lời ngắn có dung sai).
 *   2) antiCheatQuiz.ts — quiz chống gian lận: deterministic theo seed, đề bám số liệu từng HS.
 *   3) problemGen.buildAssignedSet — bọc đề giáo viên tự đặt đúng shape ProblemSet.
 *
 * Chạy: node --no-warnings scripts/test-class.mjs   (không cần server/mạng)
 */

import { registerHooks } from "node:module";

// Cho phép import TS có alias "@/..." + import tương đối KHÔNG đuôi (tự thử .ts)
// ngay trong Node (mở rộng từ hook của test-all.mjs).
registerHooks({
  resolve(specifier, context, nextResolve) {
    let spec = specifier;
    if (spec.startsWith("@/")) {
      spec = new URL("../src/" + spec.slice(2), import.meta.url).href;
    }
    const noExt = !/\.[a-z]+$/i.test(spec);
    if (noExt && (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("file:"))) {
      try { return nextResolve(spec + ".ts", context); } catch { /* thử nguyên bản */ }
    }
    return nextResolve(spec, context);
  },
});

const { gradeMoeQuiz, truefalsePoints, shortAnswerMatches, stripAnswers } =
  await import("../src/lib/moeQuiz.ts");
const { generatePersonalQuiz } = await import("../src/lib/antiCheatQuiz.ts");
const { buildAssignedSet } = await import("../src/lib/problemGen.ts");

let passed = 0, failed = 0;
function assert(name, cond, detail = "") {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name} (FAILED)${detail ? ` — ${detail}` : ""}`); }
}
const near = (a, x, eps = 1e-9) => Math.abs(a - x) <= eps;

console.log("Running UNIT class-feature tests (quiz MOE + anti-cheat + đề GV)...");

/* ── 1) Thang điểm Đúng/Sai Bộ GD ── */
assert("truefalsePoints: 0 ý → 0đ", truefalsePoints(0) === 0);
assert("truefalsePoints: 1 ý → 0.1đ", truefalsePoints(1) === 0.1);
assert("truefalsePoints: 2 ý → 0.25đ", truefalsePoints(2) === 0.25);
assert("truefalsePoints: 3 ý → 0.5đ", truefalsePoints(3) === 0.5);
assert("truefalsePoints: 4 ý → 1.0đ", truefalsePoints(4) === 1.0);

/* ── 2) So đáp án trả lời ngắn ── */
assert("shortAnswerMatches: đúng chính xác", shortAnswerMatches("9.8", "9.8", 0));
assert("shortAnswerMatches: dấu phẩy thập phân VN", shortAnswerMatches("9.8", "9,8", 0));
assert("shortAnswerMatches: trong dung sai", shortAnswerMatches("9.8", "9.83", 0.05));
assert("shortAnswerMatches: ngoài dung sai → sai", !shortAnswerMatches("9.8", "9.9", 0.05));
assert("shortAnswerMatches: bỏ trống → sai", !shortAnswerMatches("9.8", "", 1));

/* ── 3) gradeMoeQuiz ── */
const QUIZ = {
  title: "Test",
  part1: [
    { kind: "mcq", q: "Q1", options: ["A", "B", "C", "D"], answer: 2 },
    { kind: "mcq", q: "Q2", options: ["A", "B", "C", "D"], answer: 0 },
  ],
  part2: [
    {
      kind: "truefalse", q: "TF1",
      statements: [
        { text: "a", answer: true }, { text: "b", answer: false },
        { text: "c", answer: true }, { text: "d", answer: false },
      ],
    },
  ],
  part3: [{ kind: "short", q: "S1", answer: "9.8", tolerance: 0.05 }],
};

{
  // Đúng toàn bộ: P1 2×0.25 + P2 1.0 + P3 0.25 = 1.75/1.75 → 10
  const r = gradeMoeQuiz(QUIZ, {
    part1: [2, 0],
    part2: [[true, false, true, false]],
    part3: ["9.8"],
  });
  assert("Đúng toàn bộ → 10 điểm", r.score === 10, `score=${r.score}`);
  assert("… earned = max = 1.75", near(r.earned, 1.75) && near(r.max, 1.75));
}
{
  // PII đúng 3/4 ý → 0.5đ theo thang Bộ GD (không phải 0.75)
  const r = gradeMoeQuiz(QUIZ, {
    part1: [2, 0],
    part2: [[true, false, true, true]], // ý d sai
    part3: ["9.8"],
  });
  assert("PII 3/4 ý đúng → 0.5đ (thang Bộ GD)", near(r.earned, 0.25 + 0.25 + 0.5 + 0.25),
    `earned=${r.earned}`);
  const tf = r.perQuestion.find((p) => p.part === 2);
  assert("… perStatement ghi đúng ý sai", tf.perStatement.join(",") === "true,true,true,false");
}
{
  // Bỏ trống hết → 0 điểm
  const r = gradeMoeQuiz(QUIZ, { part1: [null, null], part2: [[null, null, null, null]], part3: [""] });
  assert("Bỏ trống toàn bộ → 0 điểm", r.score === 0 && r.earned === 0);
}
{
  // stripAnswers không được lộ đáp án
  const pub = JSON.stringify(stripAnswers(QUIZ));
  assert("stripAnswers: không còn field answer", !pub.includes('"answer"'));
}

/* ── 4) Anti-cheat quiz ── */
const TRIALS_A = [
  { lab: "freefall", s: 0.3, t: 0.2474, balanced: true },
  { lab: "freefall", s: 0.5, t: 0.3194, balanced: true },
  { lab: "freefall", s: 0.6, t: 0.3499, balanced: false },
];
const TRIALS_B = [
  { lab: "freefall", s: 0.35, t: 0.2672, balanced: true },
  { lab: "freefall", s: 0.45, t: 0.3030, balanced: true },
];

{
  const q1 = generatePersonalQuiz(TRIALS_A, "asg1::hs1");
  const q2 = generatePersonalQuiz(TRIALS_A, "asg1::hs1");
  assert("Cùng seed + cùng trials → đề GIỐNG HỆT (server tái sinh chấm được)",
    JSON.stringify(q1) === JSON.stringify(q2));
  assert("Đề có đủ 3 phần", q1.part1.length >= 1 && q1.part2.length === 1 && q1.part3.length === 2);

  const qB = generatePersonalQuiz(TRIALS_B, "asg1::hs2");
  const ansA = q1.part3.map((s) => s.answer).join(",");
  const ansB = qB.part3.map((s) => s.answer).join(",");
  assert("Khác số liệu (HS khác) → đáp án trả lời ngắn KHÁC nhau (chống chép bài)", ansA !== ansB,
    `A=[${ansA}] B=[${ansB}]`);

  // Đáp án phần III phải đúng công thức g = 2s/t² từ số liệu của HS
  const expected = 2 * 0.3 / (0.2474 * 0.2474);
  const hasCorrect = q1.part3.some((s) => Math.abs(Number(s.answer) - expected) < 0.01);
  assert("Đáp án phần III = 2s/t² từ chính số liệu HS", hasCorrect);

  // Ý b (cân bằng) phải phản ánh dữ liệu: TRIALS_A có 1 lần chưa cân bằng → answer false
  const balStmt = q1.part2[0].statements.find((s) => s.text.includes("cân bằng"));
  assert("Ý Đúng/Sai về cân bằng bám dữ liệu thật (có lần chưa cân bằng → Sai)",
    balStmt && balStmt.answer === false);
}
{
  const empty = generatePersonalQuiz([], "asg::hs");
  assert("Không có trials → đề rỗng (không crash)",
    empty.part1.length === 0 && empty.part2.length === 0 && empty.part3.length === 0);
}

/* ── 5) buildAssignedSet (đề giáo viên) ── */
{
  const setF = buildAssignedSet("freefall", { freefall: [{ s: 0.3 }, { s: 0.5 }] });
  assert("buildAssignedSet freefall: đúng targets + seed 'teacher'",
    setF.labKind === "freefall" && setF.seed === "teacher" && setF.freefall.length === 2);
  assert("… prompt đánh dấu đề của giáo viên", setF.prompt.includes("Đề của giáo viên"));
  const setA = buildAssignedSet("average", { average: [{ theta: 20, sEF: 0.25 }] });
  assert("buildAssignedSet average: đúng targets", setA.average.length === 1 && setA.average[0].theta === 20);
  assert("… không lẫn targets phần khác", setA.freefall === undefined && setA.instant === undefined);
}

console.log(`Class-feature tests finished: ${passed} passed, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
