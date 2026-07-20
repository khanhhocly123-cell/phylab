/**
 * test-all.mjs — SCRIPT TEST TỔNG HỢP cho PhyLab.
 *
 * Chạy:
 *   node scripts/test-all.mjs                 (tất cả; phần API cần dev server đang bật)
 *   node scripts/test-all.mjs --no-api        (chỉ unit, không cần server/mạng)
 *   node scripts/test-all.mjs http://localhost:3000
 * hoặc: npm run test:all
 *
 * Gồm 5 phần:
 *   1) UNIT chấm điểm (grading.ts) — thang khắt khe, dung sai 1%, phạt cân bằng/thiếu lần đo,
 *      tổng 70/30 với đồ thị. Không cần server.
 *   2) UNIT vật lý + API shape — chạy lại scripts/test.mjs (physics engine, RAG, route sống).
 *   3) API fallback — chạy lại scripts/test-smartbot.mjs (4 kiểm tra /api/vnpt/chat).
 *  3B) API BTC (VNPT) — kiểm thử 6 endpoint /api/vnpt/* (status, chat, problem, tts, ocr, ekyc):
 *      xác nhận route sống, đúng shape phản hồi, và chặn đầu vào (OCR thiếu ảnh → 400). Cần server.
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
  const { bandScore, gradeSample, gradeLesson, correctResultOf, theoreticalOf, RESULT_TOLERANCE, MIN_TRIALS } = G;

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
    // Chỉ đo 2 cấu hình → độ phủ 2/3, không được hưởng trọn điểm chất lượng.
    const sg = gradeSample("freefall", perfect.slice(0, 2));
    ok("Chỉ 2 cấu hình → Số liệu còn 6.7", sg.dataScore === 6.7 && sg.missingTrials === 1, `data=${sg.dataScore}`);
  }
  {
    // Cùng một cấu hình đúng tuyệt đối nhưng gửi lặp không được giả thành 3 phép đo độc lập.
    const spam = [perfect[0], { ...perfect[0] }, { ...perfect[0] }];
    const sg = gradeSample("freefall", spam);
    ok("Spam 1 cấu hình 3 lần → chỉ tính độ phủ 1/3",
      sg.uniqueConfigurationCount === 1 && sg.duplicateTrialCount === 2 && sg.dataScore === 3.3,
      `unique=${sg.uniqueConfigurationCount} duplicate=${sg.duplicateTrialCount} data=${sg.dataScore}`);
  }
  {
    // GV giao góc 30°, HS đo hoàn hảo ở góc 20° vẫn là sai đề.
    const s = 0.0182;
    const actualTheta = 20;
    const result = theoreticalOf("instant", s, actualTheta);
    const sg = gradeSample("instant", [
      { s, t: s / result, theta: actualTheta, balanced: true, studentResult: result },
    ], [{ theta: 30 }]);
    ok("GV giao θ=30°, đo đúng vật lý ở θ=20° → 0 điểm dữ liệu",
      sg.dataScore === 0 && sg.errorScore === 0 && sg.matchedConfigurationCount === 0
        && sg.unexpectedTrialCount === 1 && sg.perRow[0].matchesExpectedTarget === false,
      `data=${sg.dataScore} matched=${sg.matchedConfigurationCount} wrong=${sg.unexpectedTrialCount}`);
  }
  {
    const expected = [{ theta: 15 }, { theta: 20 }, { theta: 25 }];
    const wrongTrials = [16, 21, 26].map((theta) => {
      const s = 0.0182;
      const result = theoreticalOf("instant", s, theta);
      return { s, t: s / result, theta, balanced: true, studentResult: result };
    });
    const lg = gradeLesson("do-toc-do-vat-chuyen-dong", { instant: wrongTrials }, {
      hasGraph: true, graphScore: 10, expectedTargets: { instant: expected },
    });
    ok("Đo sai toàn bộ góc GV giao → điểm tổng bị cap 0 dù đồ thị 10",
      lg.assignmentCoveragePercent === 0 && lg.totalScore === 0,
      `coverage=${lg.assignmentCoveragePercent}% total=${lg.totalScore}`);
  }
  {
    const avgTargets = [
      { theta: 20, sEF: 0.2 }, { theta: 25, sEF: 0.25 }, { theta: 30, sEF: 0.3 },
    ];
    const avgTrials = avgTargets.map(({ theta, sEF }) => {
      const result = theoreticalOf("average", sEF, theta);
      return { s: sEF, t: sEF / result, theta, balanced: true, studentResult: result };
    });
    const lg = gradeLesson("do-toc-do-vat-chuyen-dong", { average: avgTrials }, {
      hasGraph: true,
      graphScore: 10,
      expectedTargets: { average: avgTargets, instant: [{ theta: 15 }, { theta: 20 }, { theta: 25 }] },
    });
    const instantGrade = lg.samples.find((sample) => sample.labKind === "instant");
    ok("Bỏ hẳn phần vận tốc tức thời GV giao → tạo mẫu 0 và cap tổng 5",
      lg.samples.length === 2 && instantGrade?.rowCount === 0
        && instantGrade?.experimentScore === 0 && lg.assignmentCoveragePercent === 50 && lg.totalScore === 5,
      `samples=${lg.samples.length} coverage=${lg.assignmentCoveragePercent}% total=${lg.totalScore}`);
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

{
  const okClass = runChild("2B) UNIT tính năng lớp học — quiz MOE + anti-cheat + đề GV (scripts/test-class.mjs)", "scripts/test-class.mjs");
  ok("scripts/test-class.mjs exit 0", okClass);
}

let serverUp = false;
if (!NO_API) {
  try {
    // Probe qua /status (có GET). Trước đây probe /chat bằng GET → route chỉ có POST
    // trả 405 → serverUp luôn false → phần API bị bỏ qua nhầm.
    const res = await fetch(`${BASE}/api/vnpt/status`, { signal: AbortSignal.timeout(5000) });
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

/* ========= 3B) API BAN TỔ CHỨC (VNPT) — status / chat / problem / tts / ocr / ekyc ========= */
head("3B) API BTC (VNPT) — kiểm thử các endpoint /api/vnpt/*");
if (!serverUp) {
  note(NO_API ? "Bỏ qua theo --no-api." : `Server ${BASE} không phản hồi — bỏ qua (bật 'npm run dev').`);
} else {
  // 1) STATUS — cổng khai báo cấu hình 4 dịch vụ BTC
  try {
    const res = await fetch(`${BASE}/api/vnpt/status`, { signal: AbortSignal.timeout(15000) });
    const d = await res.json().catch(() => ({}));
    ok("GET /status → ok:true", res.ok && d?.ok === true, `HTTP ${res.status}`);
    const hasFlags = !!(d && d.smartbot && d.ekyc && d.tts && d.ocr);
    ok("/status đủ 4 cờ dịch vụ (smartbot/ekyc/tts/ocr)", hasFlags);
    if (hasFlags) {
      const cfg = (n, o) => `${n}:${o?.configured ? `${g}ON${z}` : `${dim}off${z}`}`;
      console.log(`  ${dim}   cấu hình:${z} ${cfg("smartbot", d.smartbot)} · ${cfg("ekyc", d.ekyc)} · ${cfg("tts", d.tts)} · ${cfg("ocr", d.ocr)}`);
    }
  } catch (e) { ok("GET /status", false, e.message); }

  // 2) CHAT (task=chat) — hỏi–đáp; luôn có câu trả lời thật (SmartBot hoặc RAG)
  try {
    const res = await fetch(`${BASE}/api/vnpt/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "chat", text: "Công thức tính gia tốc rơi tự do là gì?" }),
      signal: AbortSignal.timeout(30000),
    });
    const d = await res.json().catch(() => ({}));
    ok("POST /chat (task=chat) → message + source",
      res.ok && typeof d?.message === "string" && d.message.length > 0 && !!d?.source, `source=${d?.source}`);
  } catch (e) { ok("POST /chat (chat)", false, e.message); }

  // 3) CHAT (task=problem) — Trợ lý diễn đạt đề bài từ mục tiêu số
  try {
    const res = await fetch(`${BASE}/api/vnpt/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "problem", labKind: "average", targets: [{ theta: 25, sEF: 0.3 }], prompt: "Đo vận tốc trung bình." }),
      signal: AbortSignal.timeout(30000),
    });
    const d = await res.json().catch(() => ({}));
    ok("POST /chat (task=problem) → message", res.ok && typeof d?.message === "string" && d.message.length > 0);
  } catch (e) { ok("POST /chat (problem)", false, e.message); }

  // 4) TTS — trả audio thật (isMock:false) hoặc báo isMock để client tự đọc
  try {
    const res = await fetch(`${BASE}/api/vnpt/tts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Xin chào, đây là bài kiểm thử giọng nói." }),
      signal: AbortSignal.timeout(30000),
    });
    const d = await res.json().catch(() => ({}));
    ok("POST /tts → audioLink hoặc isMock", res.ok && (typeof d?.audioLink === "string" || d?.isMock === true),
      d?.isMock ? "isMock (fallback trình duyệt)" : "audio thật");
    if (res.ok && d?.isMock) note("TTS chưa cấu hình token VNPT Voice → client tự đọc bằng SpeechSynthesis.");
  } catch (e) { ok("POST /tts", false, e.message); }

  // 5) OCR — thiếu ảnh phải bị chặn 400 (validate đầu vào an toàn)
  try {
    const res = await fetch(`${BASE}/api/vnpt/ocr`, { method: "POST", body: new FormData(), signal: AbortSignal.timeout(20000) });
    ok("POST /ocr (thiếu ảnh) → 400 (chặn đầu vào)", res.status === 400, `HTTP ${res.status}`);
  } catch (e) { ok("POST /ocr", false, e.message); }

  // 6) eKYC — endpoint sống & trả JSON hợp lệ (mock nếu chưa cấu hình; 400 nếu đã cấu hình mà thiếu ảnh)
  try {
    const fd = new FormData(); fd.append("action", "ocr");
    const res = await fetch(`${BASE}/api/vnpt/ekyc`, { method: "POST", body: fd, signal: AbortSignal.timeout(20000) });
    const d = await res.json().catch(() => ({}));
    ok("POST /ekyc → phản hồi JSON hợp lệ",
      (res.status === 200 && (d?.isMock === true || !!d?.name)) || res.status === 400, `HTTP ${res.status}`);
  } catch (e) { ok("POST /ekyc", false, e.message); }
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
