/**
 * test-all.mjs — SCRIPT TEST TỔNG HỢP cho PhyLab.
 *
 * Chạy:
 *   node scripts/test-all.mjs                 (tất cả; phần API cần dev server đang bật)
 *   node scripts/test-all.mjs --no-api        (chỉ unit, không cần server/mạng)
 *   node scripts/test-all.mjs http://localhost:3000
 * hoặc: npm run test:all
 *
 * Gồm 4 phần:
 *   1) UNIT chấm điểm (grading.ts) — thang khắt khe, dung sai 1%, phạt cân bằng/thiếu lần đo,
 *      tổng 70/30 với đồ thị. Không cần server.
 *   2) UNIT vật lý + API shape — chạy lại scripts/test.mjs (physics engine, RAG, route sống).
 *   3) API fallback — chạy lại scripts/test-smartbot.mjs (4 kiểm tra /api/vnpt/chat).
 *   4) CHẨN ĐOÁN SmartBot trực tiếp (đọc .env.local, gọi thẳng VNPT) — trả lời câu hỏi
 *      "vì sao bot cứ fallback": thử 3 chiến lược (câu hỏi thường / settings prompt /
 *      nhồi prompt vào text) để xem bot có bật "tri thức nâng cao" không và chiến lược
 *      nào ăn. Phần này chỉ CẢNH BÁO, không tính FAIL (trừ khi bot chết hẳn).
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const NO_API = args.includes("--no-api");
const BASE = (args.find((a) => a.startsWith("http")) || process.env.PHYLAB_URL || "http://localhost:3000").replace(/\/$/, "");

const g = "\x1b[32m", r = "\x1b[31m", y = "\x1b[33m", dim = "\x1b[2m", b = "\x1b[1m", z = "\x1b[0m";
let pass = 0, fail = 0, warn = 0;
const failNames = [];

function ok(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ${g}✓${z} ${name}${detail ? ` ${dim}(${detail})${z}` : ""}`); }
  else { fail++; failNames.push(name); console.log(`  ${r}✗ ${name}${z}${detail ? ` ${dim}(${detail})${z}` : ""}`); }
}
function note(msg) { console.log(`  ${y}⚠${z} ${msg}`); warn++; }
function head(t) { console.log(`\n${b}${t}${z}`); }
const near = (a, x, eps = 1e-9) => Math.abs(a - x) <= eps;

/* ================= 1) UNIT — Bộ chấm điểm khắt khe (grading.ts) ================= */
// Cho phép import TS có alias "@/..." ngay trong Node (type stripping + resolve hook).
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const mapped = new URL("../src/" + specifier.slice(2), import.meta.url).href;
      return nextResolve(mapped, context);
    }
    return nextResolve(specifier, context);
  },
});

head("1) UNIT — Bộ chấm điểm khắt khe (src/lib/grading.ts)");
try {
  const G = await import("../src/lib/grading.ts");
  const { bandScore, gradeSample, gradeLesson, correctResultOf, RESULT_TOLERANCE, MIN_TRIALS } = G;

  ok("Hằng số: dung sai 1%, tối thiểu 3 lần đo", RESULT_TOLERANCE === 0.01 && MIN_TRIALS === 3);
  ok("bandScore ≥98 → 10", bandScore(98) === 10 && bandScore(100) === 10);
  ok("bandScore 95..97.9 → 9", bandScore(95) === 9 && bandScore(97.9) === 9);
  ok("bandScore 90..94.9 → 8", bandScore(90) === 8);
  ok("bandScore 80..89.9 → 6.5 (khắt khe)", bandScore(80) === 6.5 && bandScore(89) === 6.5);
  ok("bandScore 70..79.9 → 5", bandScore(70) === 5);
  ok("bandScore <70 → 3", bandScore(69.9) === 3 && bandScore(0) === 3);
  ok("correctResultOf freefall = 2s/t²", near(correctResultOf("freefall", 0.45, 0.3), 2 * 0.45 / 0.09, 1e-9));

  // 3 lần đo hoàn hảo (t lý thuyết với g=9.8, HS tính đúng tuyệt đối)
  const perfect = [0.3, 0.45, 0.6].map((s) => {
    const t = Math.sqrt((2 * s) / 9.8);
    return { s, t, balanced: true, studentResult: (2 * s) / (t * t) };
  });
  {
    const sg = gradeSample("freefall", perfect);
    ok("3 lần đo hoàn hảo → Số liệu 10, Trình tự 10, Sai số 10",
      sg.dataScore === 10 && sg.sequenceScore === 10 && sg.errorScore === 10,
      `data=${sg.dataScore} seq=${sg.sequenceScore} err=${sg.errorScore}`);
    ok("… điểm mẫu 10.0", sg.experimentScore === 10);
  }
  {
    // HS tính lệch 1.5% → vượt dung sai 1% → không được tính "Đúng"
    const off = perfect.map((tr) => ({ ...tr, studentResult: tr.studentResult * 1.015 }));
    const sg = gradeSample("freefall", off);
    ok("Lệch 1.5% → không còn ô nào 'Đúng' (dung sai 1%)", sg.perRow.every((row) => !row.correct));
  }
  {
    // 2/3 lần đo khi chưa cân bằng → Trình tự 10 - 2×2.5 = 5
    const unb = perfect.map((tr, i) => ({ ...tr, balanced: i === 0 }));
    const sg = gradeSample("freefall", unb);
    ok("2 lần chưa cân bằng → Trình tự 5 (trừ 2.5đ/lần)", sg.sequenceScore === 5, `seq=${sg.sequenceScore}`);
  }
  {
    // Chỉ đo 2 lần → thiếu 1 so với MIN_TRIALS → Số liệu 10 - 2 = 8
    const sg = gradeSample("freefall", perfect.slice(0, 2));
    ok("Chỉ 2 lần đo → Số liệu bị trừ còn 8", sg.dataScore === 8 && sg.missingTrials === 1, `data=${sg.dataScore}`);
  }
  {
    // Ô bỏ trống → độ sát tự tính của lần đó = 0%
    const blank = [perfect[0], perfect[1], { ...perfect[2], studentResult: null }];
    const sg = gradeSample("freefall", blank);
    ok("1 ô bỏ trống → độ sát TB ≈ 66.7% → Số liệu 3", near(sg.dataCloseness, 66.7, 0.1) && sg.dataScore === 3,
      `closeness=${sg.dataCloseness}% data=${sg.dataScore}`);
  }
  {
    // Tổng = Thí nghiệm×70% + Đồ thị×30% (đồ thị bắt buộc)
    const lg = gradeLesson("do-gia-toc-roi-tu-do", { freefall: perfect }, { hasGraph: true, graphScore: 8 });
    ok("Tổng 70/30: TN=10, Đồ thị=8 → Tổng 9.4", near(lg.totalScore, 9.4, 1e-9), `total=${lg.totalScore}`);
  }
} catch (err) {
  ok("Import & chạy grading.ts", false, err.message);
}

/* ================= 2) + 3) Chạy lại các script con ================= */
function runChild(label, scriptRel, extraArgs = []) {
  head(label);
  const res = spawnSync(process.execPath, ["--no-warnings", path.join(ROOT, scriptRel), ...extraArgs], {
    cwd: ROOT, encoding: "utf8", timeout: 180000,
  });
  const out = (res.stdout || "") + (res.stderr || "");
  console.log(out.split("\n").map((l) => "  " + l).join("\n"));
  return res.status === 0;
}

{
  const okUnit = runChild("2) UNIT vật lý + API shape (scripts/test.mjs)", "scripts/test.mjs", NO_API ? ["--no-api"] : []);
  ok("scripts/test.mjs exit 0", okUnit);
}

let serverUp = false;
if (!NO_API) {
  try {
    const res = await fetch(`${BASE}/api/vnpt/chat`, { signal: AbortSignal.timeout(5000) });
    serverUp = res.ok;
  } catch { serverUp = false; }
}

if (serverUp) {
  const okSb = runChild("3) API fallback /api/vnpt/chat (scripts/test-smartbot.mjs)", "scripts/test-smartbot.mjs", [BASE]);
  ok("scripts/test-smartbot.mjs exit 0", okSb);
} else {
  head("3) API fallback /api/vnpt/chat");
  note(NO_API ? "Bỏ qua theo --no-api." : `Server ${BASE} không phản hồi — bỏ qua (bật 'npm run dev' để test đủ).`);
}

/* ================= 4) CHẨN ĐOÁN SmartBot trực tiếp ================= */
head("4) CHẨN ĐOÁN SmartBot (gọi thẳng VNPT — vì sao bot fallback?)");

function readEnvLocal() {
  const p = path.join(ROOT, ".env.local");
  if (!existsSync(p)) return {};
  const env = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const NON_ANSWER_RE = /xin lỗi.*(chưa có đủ thông tin|không có thông tin|chưa hiểu)|vui lòng đặt câu hỏi ngắn gọn|nằm ngoài phạm vi/i;

async function callBotDirect(env, text, settings, label) {
  const body = {
    bot_id: env.SMARTBOT_BOT_ID,
    sender_id: "phylab-diagnostic",
    text,
    input_channel: "api",
    session_id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    metadata: {},
    ...(settings ? { settings } : {}),
  };
  try {
    const res = await fetch("https://api.idg.vnpt.vn/assistant-service/v1/standard/sb", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: env.VNPT_BOT_ACCESS_TOKEN?.startsWith("Bearer ")
          ? env.VNPT_BOT_ACCESS_TOKEN : `Bearer ${env.VNPT_BOT_ACCESS_TOKEN}`,
        "Token-id": env.VNPT_BOT_TOKEN_ID,
        "Token-key": env.VNPT_BOT_TOKEN_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { label, status: `HTTP_${res.status}`, answered: false, text: "" };
    const data = await res.json();
    const cards = data?.object?.sb?.card_data || [];
    const text2 = cards.filter((c) => typeof c.text === "string" && c.text.trim()).map((c) => c.text.trim()).join("\n\n");
    if (!text2) return { label, status: "EMPTY", answered: false, text: "" };
    if (NON_ANSWER_RE.test(text2)) return { label, status: "NON_ANSWER", answered: false, text: text2 };
    return { label, status: "OK", answered: true, text: text2 };
  } catch (err) {
    return { label, status: err.name === "TimeoutError" ? "TIMEOUT" : err.message, answered: false, text: "" };
  }
}

if (NO_API) {
  note("Bỏ qua theo --no-api.");
} else {
  const env = readEnvLocal();
  const botConfigured = env.VNPT_BOT_ACCESS_TOKEN && env.VNPT_BOT_TOKEN_ID && env.VNPT_BOT_TOKEN_KEY
    && env.SMARTBOT_BOT_ID && !/^phylab[-_]/i.test(env.SMARTBOT_BOT_ID);

  if (!botConfigured) {
    note("Thiếu env SmartBot (.env.local) hoặc bot_id là placeholder — không chẩn đoán được. App vẫn chạy nhờ backup RAG/template.");
  } else {
    const GRADE_INSTRUCTION =
      "Bạn là giáo viên vật lí. Dưới đây là bảng điểm đã chấm bằng máy. Viết NHẬN XÉT 3-4 câu cho học sinh, " +
      "không đổi điểm số.\n\nBài: Đo gia tốc rơi tự do\nĐiểm tổng: 8.6/10\n- 3 lần đo, TB=9.71 m/s², sát lý thuyết 99%.";

    const [pKb, pSettings, pEmbedded] = await Promise.all([
      callBotDirect(env, "Công thức tính gia tốc rơi tự do là gì?", undefined, "A. Câu hỏi thường (khớp tri thức bot)"),
      callBotDirect(env, "Nhận xét bài thực hành giúp em.", { system_prompt: "Bạn là giáo viên vật lí.", advance_prompt: GRADE_INSTRUCTION }, "B. settings.advance_prompt (cần bật 'tri thức nâng cao')"),
      callBotDirect(env, GRADE_INSTRUCTION, undefined, "C. Nhồi prompt vào text (chiến lược 'embedded')"),
    ]);

    for (const p of [pKb, pSettings, pEmbedded]) {
      const tag = p.answered ? `${g}TRẢ LỜI${z}` : `${y}${p.status}${z}`;
      console.log(`  ${tag}  ${p.label}`);
      if (p.text) console.log(`  ${dim}   "${p.text.slice(0, 110).replace(/\n/g, " ")}${p.text.length > 110 ? "…" : ""}"${z}`);
    }

    // Kết luận chẩn đoán
    console.log("");
    if (!pKb.answered && !pSettings.answered && !pEmbedded.answered) {
      ok("SmartBot còn sống (ít nhất 1 chiến lược trả lời)", false,
        "Cả 3 chiến lược đều thất bại — kiểm tra token hết hạn (~8h)/bot_id/mạng. App vẫn dùng backup.");
    } else {
      ok("SmartBot còn sống (ít nhất 1 chiến lược trả lời)", true);
      if (pSettings.answered) {
        console.log(`  ${g}→ Bot ĐÃ bật 'tri thức nâng cao': settings.advance_prompt hoạt động.${z}`);
      } else if (pEmbedded.answered) {
        note("Bot CHƯA bật 'tri thức nâng cao' (settings prompt bị bỏ qua) → vào cài đặt bot trên platform SmartBot bật lên.");
        console.log(`  ${g}→ Trong lúc chờ, chiến lược 'embedded' (đã tích hợp trong askSmartBotResilient) vẫn cho câu trả lời thật.${z}`);
      } else {
        note("Bot chỉ trả lời câu khớp tri thức đã nạp; cả settings lẫn embedded đều bị từ chối → nạp thêm tài liệu 2 bài thực hành cho bot, hoặc chấp nhận backup RAG/template.");
      }
    }
  }
}

/* ================= Tổng kết ================= */
head("=== TỔNG KẾT ===");
console.log(`  ${g}${pass} PASS${z} · ${fail ? r : dim}${fail} FAIL${z} · ${warn ? y : dim}${warn} cảnh báo${z}`);
if (failNames.length) console.log(`  ${r}FAIL:${z} ${failNames.join(" · ")}`);
process.exit(fail ? 1 : 0);
