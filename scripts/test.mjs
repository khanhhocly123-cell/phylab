import { accel, velAt, computeTime, ballDiameterMm } from "../src/engine/physics.js";
import { freeFallTime, gFromMeasurement, computeFallTime, fitFreeFall } from "../src/engine/physicsFreeFall.js";
import { ohmCircuit, heatedResistance, stepHeat } from "../src/engine/physicsElectric.ts";
import { solveDC } from "../src/engine/circuit.js";
import { CANONICAL_LAYOUT, planWires, analyzeBoard, solveBoard, pinNodes, freeNodesIn } from "../src/components/lab/electric/emfBoard.js";
import { moduleOf } from "../src/components/lab/electric/boardGeometry.js";
import { normalizeVi, retrieveAnswer, buildRagContext } from "../src/lib/labKnowledge.ts";
import { SCHEMATICS, checkSchematic } from "../src/lib/schematic.ts";
import { CALC_DRILLS, parseNumber, isCorrect, diagnose } from "../src/components/prelab/calcDrillData.ts";
import { NEWTON2, forceOf, massOf, trueAccel, newtonRun, computeNewtonTime, accelFromTime, fitOrigin, planMotion } from "../src/engine/physicsNewton2.js";
import { hashPassword, verifyPassword, passwordProblem, temporaryPassword, secretEquals, DUMMY_PASSWORD_HASH } from "../src/lib/password.ts";
import { SYNC_KEYS, MAX_REPORTS, SYNC_MAX_BYTES, mergeSyncValue, normalizeSyncValue, fitSyncValue, syncBytes } from "../src/lib/syncMerge.ts";

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} (FAILED)`);
  }
}

console.log("Running UNIT physics & RAG tests...");

// 1. Physics Lab 6 tests
const a30 = accel(30);
assert("accel(30) should be near 3.5", Math.abs(a30 - 3.5) < 1e-5);

const v30_03 = velAt(30, 0.3);
assert("velAt(30, 0.3) should be near sqrt(2.1)", Math.abs(v30_03 - Math.sqrt(2.1)) < 1e-5);

const tA = computeTime({ mode: "A", thetaDeg: 30, sE: 0.30, sF: 0.55, dMm: 20.0, withNoise: false });
assert("computeTime mode A should be valid", tA.valid);
assert("computeTime mode A value should be near 0.02 / velAt", Math.abs(tA.raw - (0.02 / velAt(30, 0.30))) < 1e-5);

const tAB = computeTime({ mode: "A<->B", thetaDeg: 30, sE: 0.30, sF: 0.55, dMm: 20.0, withNoise: false });
assert("computeTime mode A<->B should be valid", tAB.valid);

// 2. Physics Lab 11 tests
const tFall = freeFallTime(0.40, { withNoise: false });
assert("freeFallTime for 0.40m should be near sqrt(2 * 0.4 / 9.8)", Math.abs(tFall - Math.sqrt(0.8 / 9.8)) < 1e-5);

const gMeasured = gFromMeasurement(0.40, tFall);
assert("gFromMeasurement should be near 9.8", Math.abs(gMeasured - 9.8) < 1e-5);

const tFallComp = computeFallTime({ s: 0.40, withNoise: false });
assert("computeFallTime should be valid", tFallComp.valid);

// 2b. Sai số "ổn định mà không đơ": lặp lại cùng cấu hình thì lệch vài ms, không bay số
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
{
  const rng = seeded(42);
  const ts = Array.from({ length: 40 }, () => computeFallTime({ s: 0.4, rng }).raw);
  const mean = ts.reduce((a, b) => a + b, 0) / ts.length;
  const sd = Math.sqrt(ts.reduce((a, b) => a + (b - mean) ** 2, 0) / (ts.length - 1));
  assert("Rơi tự do lặp 40 lần: số đo không giống hệt nhau (σ ≥ 0,5 ms)", sd >= 0.0005);
  assert("… nhưng vẫn ổn định (σ ≤ 3 ms, mọi lần trong ±8 ms)", sd <= 0.003 && ts.every((t) => Math.abs(t - mean) < 0.008));
  const unsteady = Array.from({ length: 40 }, () => computeFallTime({ s: 0.4, steady: false, rng }).raw);
  assert("Thả khi trụ còn đung đưa → t lớn hơn rõ rệt", unsteady.reduce((a, b) => a + b, 0) / 40 > mean + 0.0015);
  const pts = [0.2, 0.4, 0.6, 0.8].map((sv) => ({ s: sv, t: freeFallTime(sv, { withNoise: false }) }));
  assert("fitFreeFall với số liệu lý thuyết cho g = 9,8", Math.abs(fitFreeFall(pts).g - 9.8) < 1e-6);
}
{
  const rng = seeded(7);
  const ab = Array.from({ length: 30 }, () => computeTime({ mode: "A<->B", thetaDeg: 20, sE: 0.3, sF: 0.55, dMm: 18.2, rng }).raw);
  const unb = Array.from({ length: 30 }, () => computeTime({ mode: "A<->B", thetaDeg: 20, sE: 0.3, sF: 0.55, dMm: 18.2, balanced: false, rng }).raw);
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  assert("Máng chưa cân bằng → bi chậm hơn (t trung bình lớn hơn)", avg(unb) > avg(ab) * 1.01);
  const d = ballDiameterMm("Khánh (TestUser101)");
  assert("Đường kính bi theo tên: 15–22 mm, bội 0,05 mm, cố định", d >= 15 && d <= 22 && Math.abs(d / 0.05 - Math.round(d / 0.05)) < 1e-6 && d === ballDiameterMm("Khánh (TestUser101)"));
}

// 2c. Điện: vật dẫn nóng lên, vôn kế đo khác số trên núm, bộ giải mạch
{
  const cold = ohmCircuit(6, "X", 0), hot = ohmCircuit(6, "X", 1);
  assert("Ohm: U đo trên vật dẫn nhỏ hơn số trên núm (sụt áp ampe kế)", cold.voltage < 6 && cold.voltage > 5.8);
  assert("Ohm: vật dẫn nóng → R tăng, I giảm", heatedResistance("X", 1) > 120 && hot.current < cold.current);
  assert("Ohm: đóng K lâu ở 10 V thì nóng lên, mở K thì nguội", stepHeat(0, 0.8, 10, true) > 0.4 && stepHeat(0.5, 0, 10, false) < 0.2);
  const V = solveDC({ nodeCount: 3, conductances: [{ a: 1, b: 2, g: 1 / 100 }, { a: 2, b: 0, g: 1 / 100 }], sources: [{ from: 0, to: 1, i: 10 / 1e-3 }, { from: 1, to: 0, i: 0 }] });
  assert("solveDC: nút giữa cầu phân áp ≈ nửa điện áp", V[1] > 0 && Math.abs(V[2] - V[1] / 2) / V[1] < 0.01);
}
{
  const placements = { ...CANONICAL_LAYOUT };
  const wires = planWires(placements, (meter) => (meter === "ammeter" ? { x: 1100, y: 300 } : { x: -150, y: 300 }));
  assert("Bảng mạch: bố trí mẫu chỉ cần 4 dây đồng hồ (pin–K–R₀–biến trở nối qua mạng)", wires.length === 4);
  assert("Bảng mạch: mạch mẫu đúng sơ đồ", analyzeBoard({ placements, wires }).valid);
  const cell = { emf: 1.5, r: 1.2 };
  const sol = solveBoard({ placements, wires, switchClosed: true, rheostat: 50, cell, modes: { ammeter: "mA", voltmeter: "V" } });
  const I = 1.5 / (1.2 + 0.02 + 10 + 50 + 2);
  assert("Bảng mạch: ampe kế chỉ đúng I = E/(r + R₀ + R + R_A)", Math.abs(sol.ammeter.value - I * 1000) < 0.01);
  assert("Bảng mạch: vôn kế chỉ đúng U = E − I·r", Math.abs(sol.voltmeter.value - (1.5 - I * 1.2)) < 1e-4);
  const open = solveBoard({ placements, wires, switchClosed: false, rheostat: 50, cell, modes: { ammeter: "mA", voltmeter: "V" } });
  assert("Bảng mạch: K mở → không có dòng, vôn kế chỉ đúng E", Math.abs(open.ammeter.value) < 1e-3 && Math.abs(open.voltmeter.value - 1.5) < 1e-4);
  const reversed = wires.map((w) => (w.b.t === "jack" && w.b.meter === "ammeter" ? { ...w, b: { ...w.b, jack: w.b.jack === "mA" ? "COM" : "mA" } } : w));
  const bad = analyzeBoard({ placements, wires: reversed });
  assert("Bảng mạch: đảo dây ampe kế → báo lỗi đúng chỗ", !bad.valid && bad.issue.key === "ammeter-reversed");
  assert("Bảng mạch: thiếu dây → báo mạch hở", analyzeBoard({ placements, wires: [] }).issue.key === "open");

  // Ôm kế (VOM nấc Ω): bơm dòng thử, R = ΔU/I₀; đoạn đo còn nguồn → báo live, số sai.
  const ohmModes = { ammeter: "mA", voltmeter: "Ω" };
  const onBattery = solveBoard({ placements, wires, switchClosed: false, rheostat: 50, cell, modes: ohmModes });
  assert("Ôm kế trên hai cực pin: báo có nguồn (không đo được r bằng ôm kế)", onBattery.voltmeter.live && onBattery.voltmeter.across === "battery");
  const others = wires.filter((w) => !(w.b.t === "jack" && w.b.meter === "voltmeter"));
  const plugAt = (kind, pin) => {
    const p = pinNodes(kind, placements[kind]).find((x) => x.pin === pin);
    const free = freeNodesIn(moduleOf(p.X, p.Y), placements, others)[0];
    return { t: "node", X: free.X, Y: free.Y };
  };
  const probeR0 = [...others,
    { id: "p1", a: plugAt("protect", "a"), b: { t: "jack", meter: "voltmeter", jack: "V" } },
    { id: "p2", a: plugAt("protect", "b"), b: { t: "jack", meter: "voltmeter", jack: "COM" } }];
  const r0 = solveBoard({ placements, wires: probeR0, switchClosed: false, rheostat: 50, cell, modes: ohmModes });
  assert("Ôm kế đo R₀ khi K mở: ≈ 10 Ω, không báo live", Math.abs(r0.voltmeter.value - 10) < 0.05 && !r0.voltmeter.live && r0.voltmeter.across === "protect");
  const r0Live = solveBoard({ placements, wires: probeR0, switchClosed: true, rheostat: 50, cell, modes: ohmModes });
  assert("Ôm kế đo R₀ khi K đóng: báo đoạn mạch còn điện", r0Live.voltmeter.live);
  assert("Ôm kế chưa nối que: OL (hở mạch)", solveBoard({ placements, wires: others, switchClosed: false, rheostat: 50, cell, modes: ohmModes }).voltmeter.overload);
}

// 2b. Prelab điện: chấm sơ đồ mạch bằng giải mạch thật + các bài tính gốc
{
  const W = (a, b) => ({ a, b });
  const O = SCHEMATICS.ohm;
  const E = SCHEMATICS.emf;
  const okO = checkSchematic(O, O.solution);
  assert("Sơ đồ Bài 23 mẫu: đúng, ampe kế 40 mA, vôn kế 6 V", okO.ok && Math.abs(okO.current - 0.04) < 1e-4 && Math.abs(okO.voltage - 6) < 1e-3);
  const okE = checkSchematic(E, E.solution);
  assert("Sơ đồ Bài 26 mẫu: đúng, vôn kế ở hai cực pin chỉ U = E − I·r", okE.ok && Math.abs(okE.current - 0.05) < 1e-4 && Math.abs(okE.voltage - 1.45) < 2e-3);
  const swapped = checkSchematic(O, [W("src:0", "k:0"), W("k:1", "v:0"), W("v:1", "r:0"), W("r:1", "src:1"), W("a:0", "r:0"), W("a:1", "r:1")]);
  assert("Sơ đồ: đổi chỗ ampe kế ↔ vôn kế thì chỉ ra cả hai lỗi", !swapped.ok && swapped.issues.some((i) => i.code === "a-par") && swapped.issues.some((i) => i.code === "v-series"));
  const reversed = checkSchematic(O, [W("src:0", "k:0"), W("k:1", "a:1"), W("a:0", "r:0"), W("r:1", "src:1"), W("v:0", "r:0"), W("v:1", "r:1")]);
  assert("Sơ đồ: ampe kế đảo cực bị phát hiện", !reversed.ok && reversed.issues[0].code === "a-pol");
  const kParallel = checkSchematic(O, [W("src:0", "a:0"), W("a:1", "r:0"), W("r:1", "src:1"), W("k:0", "r:0"), W("k:1", "r:1"), W("v:0", "r:0"), W("v:1", "r:1")]);
  assert("Sơ đồ: khoá K mắc song song với R bị phát hiện", !kParallel.ok && kParallel.issues[0].code === "k-par");
  const allAccepted = Object.values(CALC_DRILLS).flat().every((q) => q.fields.every((f) => isCorrect(f, parseNumber(String(f.answer).replace(".", ",")))));
  assert("Bài tính Prelab: mọi đáp số đều được nhận khi gõ dấu phẩy", allAccepted);
  const q = CALC_DRILLS.ohm[0];
  assert("Bài tính Prelab: quên đổi A → mA được nhắc đúng lỗi", !isCorrect(q.fields[0], 0.025) && diagnose(q, q.fields[0], 0.025).includes("mA"));
}

// 2c. Bài 15 — định luật 2 Newton (máng đệm khí, Bảng 15.1)
{
  const SGK = NEWTON2.sgkConfigs;
  assert("Bài 15: lực kéo theo SGK — 2, 4, 6 quả treo cho F = 1, 2, 3 N", [2, 4, 6].map(forceOf).join() === "1,2,3");
  assert("Bài 15: hệ vật gồm xe + quả trên xe + quả treo (treo 2, trên xe 2 → 0,4 kg)", massOf(2, 2) === 0.4);
  const tSGK = SGK.map((c) => Number(computeNewtonTime({ run: newtonRun({ ...c, withNoise: false }) }).display));
  assert("Bài 15: năm cột Bảng 15.1 cho t lệch SGK dưới 0,015 s", tSGK.every((t, i) => Math.abs(t - NEWTON2.sgkTable[i].t) < 0.015));
  const aSGK = tSGK.map((t) => accelFromTime(t));
  const fitA = fitOrigin([2, 3, 4].map((i) => ({ x: forceOf(SGK[i].hang), y: aSGK[i] })));
  assert("Bài 15: đồ thị a–F (M + m = 0,5 kg) qua gốc, 1/độ dốc ≈ 0,5 kg (±5%)", fitA && Math.abs(1 / fitA.k - 0.5) < 0.025);
  const fitB = fitOrigin([0, 1, 2].map((i) => ({ x: 1 / massOf(SGK[i].hang, SGK[i].cart), y: aSGK[i] })));
  assert("Bài 15: đồ thị a–1/(M + m) (F = 1 N) có độ dốc ≈ 1 N (±5%)", fitB && Math.abs(fitB.k - 1) < 0.05);
  const c3 = SGK[2];
  assert("Bài 15: quên bật bơm khí ở cột 3 → ma sát nghỉ giữ xe, xe không chạy", !newtonRun({ ...c3, pump: false, withNoise: false }).moves);
  assert("Bài 15: quên bật bơm khí ở cột 1 → a nhỏ hẳn (dưới 70%)", trueAccel({ ...SGK[0], pump: false }) < 0.7 * trueAccel(SGK[0]));
  const far = Number(computeNewtonTime({ run: newtonRun({ ...c3, d: 0.02, withNoise: false }) }).display);
  assert("Bài 15: xe lùi 2 cm khỏi cổng 1 → t ngắn, a = 2s/t² lớn hơn thật trên 20%", accelFromTime(far) > 1.2 * trueAccel(c3));
  const modeA = computeNewtonTime({ mode: "A", run: newtonRun({ ...c3, withNoise: false }) });
  assert("Bài 15: MODE A chỉ đo thời gian tấm chắn che cổng 1 (không phải t đi hết s)", modeA.valid && Number(modeA.display) < tSGK[2] * 0.6);
  const early = newtonRun({ hang: 2, cart: 0, d: 0, drop: 0.3, withNoise: false });
  const late = newtonRun({ hang: 2, cart: 0, d: 0, drop: 1, withNoise: false });
  assert("Bài 15: quả nặng chạm sàn trước cổng 2 → hết lực kéo, t dài hơn", early.landsEarly && early.t2 > late.t2);

  // Buông tay tự do (planMotion): t giữa hai cổng = thời gian mép tấm chắn đi từ x = 0 tới x = 0,5 m
  const between = (plan) => plan.timeAtX(0.5) - plan.timeAtX(0);
  const fromSat = planMotion({ ...c3, pump: 2, x0: -0.0001, xLand: 0.62, xEnd: 1.4, withNoise: false });
  assert("Bài 15 (buông tay): buông sát cổng 1 → t giữa hai cổng khớp cột 3 Bảng 15.1", fromSat.moves && Math.abs(between(fromSat) - 0.71) < 0.015);
  const fromBack = planMotion({ ...c3, pump: 2, x0: -0.05, xLand: 0.62, xEnd: 1.4, withNoise: false });
  assert("Bài 15 (buông tay): buông lùi 5 cm → qua cổng 1 đã có vận tốc, t ngắn hẳn", between(fromBack) < 0.8 * between(fromSat));
  assert("Bài 15 (buông tay): quả treo đã nằm trên đệm (dây chùng) → xe đứng yên", !planMotion({ ...c3, pump: 2, x0: 0.7, xLand: 0.62, xEnd: 1.4 }).moves);
  const weak = planMotion({ ...SGK[0], pump: 1, x0: -0.0001, xLand: 0.62, xEnd: 1.4, withNoise: false });
  const good = planMotion({ ...SGK[0], pump: 2, x0: -0.0001, xLand: 0.62, xEnd: 1.4, withNoise: false });
  assert("Bài 15 (máy nén khí): lưu lượng yếu (nấc 1) → xe còn cọ máng, a nhỏ hơn nấc 2", weak.moves && weak.a < 0.95 * good.a);
  const coast = planMotion({ ...SGK[0], pump: 2, x0: -0.0001, xLand: 0.3, xEnd: 1.4, withNoise: false });
  assert("Bài 15 (dây chùng): sau khi quả chạm đệm xe trôi gần như đều tới cuối máng", Math.abs(coast.vAt(coast.tLand + 0.2) - coast.vAt(coast.tLand)) < 0.01 && coast.xStop > 1.39);
}

// 2c. Tài khoản (Beta Phi01): băm mật khẩu + luật gộp đồng bộ
{
  const hash = await hashPassword("matkhau123");
  assert("Mật khẩu: chuỗi băm dạng pbkdf2-sha256$100000$salt$hash", /^pbkdf2-sha256\$100000\$[^$]+\$[^$]+$/.test(hash));
  assert("Mật khẩu: đúng thì khớp, sai một ký tự thì không", (await verifyPassword("matkhau123", hash)) && !(await verifyPassword("matkhau124", hash)));
  assert("Mật khẩu: băm hai lần ra hai chuỗi khác nhau (salt ngẫu nhiên)", hash !== (await hashPassword("matkhau123")));
  assert("Mật khẩu: băm giả (email chưa có) không khớp mật khẩu nào", !(await verifyPassword("", DUMMY_PASSWORD_HASH)) && !(await verifyPassword("matkhau123", DUMMY_PASSWORD_HASH)));
  assert("Mật khẩu: chuỗi băm hỏng, 'env' hay số vòng quá lớn → không khớp", !(await verifyPassword("x", "env")) && !(await verifyPassword("x", "pbkdf2-sha256$999999$AAAA$AAAA")));
  assert("Mật khẩu: chặn mật khẩu yếu (ngắn / thiếu số / thiếu chữ), nhận chữ có dấu", Boolean(passwordProblem("abc12")) && Boolean(passwordProblem("abcdefgh")) && Boolean(passwordProblem("12345678")) && passwordProblem("mậtkhẩu1") === null);
  const temp = temporaryPassword();
  assert("Mật khẩu tạm: 10 ký tự, đủ chữ và số, không có ký tự dễ nhầm", temp.length === 10 && passwordProblem(temp) === null && !/[01lIoO]/.test(temp));
  assert("So bí mật (biến môi trường): bằng / khác", (await secretEquals("abc", "abc")) && !(await secretEquals("abc", "abd")));

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const samples = {
    prelabPassed: [{ "bai-6": true, rac: "x" }, { "bai-15": true }],
    tours: [{ app: 100, lab: 300 }, { app: 200, notes: 50 }],
    updatesSeen: [["b", "a"], ["c", "a"]],
    reports: [[{ id: "rep-1700000000000", lessonId: "x" }], [{ id: "rep-1800000000000", lessonId: "y" }, { id: "rep-1700000000000", lessonId: "x" }]],
    labData: [{ at: 1, lessonId: "x", trials: [] }, { at: 2, lessonId: "y", trials: [1] }],
  };
  for (const key of SYNC_KEYS) {
    const [a, b] = samples[key];
    const ab = mergeSyncValue(key, a, b);
    assert(`Đồng bộ (${key}): gộp theo thứ tự nào cũng như nhau`, same(ab, mergeSyncValue(key, b, a)));
    assert(`Đồng bộ (${key}): gộp lại lần nữa không đổi`, same(mergeSyncValue(key, ab, ab), ab) && same(mergeSyncValue(key, ab, a), ab));
  }
  assert("Đồng bộ: Prelab đã qua ở máy nào cũng giữ, giá trị rác bị bỏ", same(mergeSyncValue("prelabPassed", ...samples.prelabPassed), { "bai-15": true, "bai-6": true }));
  assert("Đồng bộ: hướng dẫn lấy mốc thời gian lớn nhất từng mục", same(mergeSyncValue("tours", ...samples.tours), { app: 200, lab: 300, notes: 50 }));
  const reports = mergeSyncValue("reports", ...samples.reports);
  assert("Đồng bộ: báo cáo hợp theo id, mới nhất trước", reports.length === 2 && reports[0].id === "rep-1800000000000");
  assert("Đồng bộ: số đo chờ báo cáo — bản mới hơn thắng, có còn hơn không", mergeSyncValue("labData", ...samples.labData).at === 2 && mergeSyncValue("labData", null, samples.labData[0]).at === 1);
  const many = Array.from({ length: MAX_REPORTS + 15 }, (_, i) => ({ id: `rep-${1700000000000 + i}`, lessonId: "x" }));
  assert(`Đồng bộ: giữ tối đa ${MAX_REPORTS} báo cáo mới nhất`, normalizeSyncValue("reports", many).length === MAX_REPORTS && normalizeSyncValue("reports", many)[0].id === `rep-${1700000000000 + MAX_REPORTS + 14}`);
  assert("Đồng bộ: dữ liệu hỏng thành rỗng, không lỗi", same(normalizeSyncValue("reports", "rác"), []) && same(normalizeSyncValue("prelabPassed", null), {}) && normalizeSyncValue("labData", { at: "x" }) === null);
  const heavy = Array.from({ length: 40 }, (_, i) => ({ id: `rep-${1700000000000 + i}`, lessonId: "x", note: "đ".repeat(15000) }));
  const fitted = fitSyncValue("reports", normalizeSyncValue("reports", heavy));
  assert("Đồng bộ: báo cáo quá nặng thì bỏ bớt bản cũ cho vừa giới hạn lưu", fitted.length < heavy.length && fitted.length > 0 && syncBytes(fitted) <= SYNC_MAX_BYTES);
  assert("Đồng bộ: khoá khác quá nặng thì từ chối", fitSyncValue("updatesSeen", ["x".repeat(SYNC_MAX_BYTES)]) === null);
}

// 3. RAG tests
assert("normalizeVi should strip diacritics", normalizeVi("Học sinh giỏi Vật Lý") === "hoc sinh gioi vat ly");
const ans = retrieveAnswer("gia toc roi tu do");
assert("retrieveAnswer should return free fall answer", ans && ans.includes("g = 2s / t²"));

const context = buildRagContext("cong quang dien");
assert("buildRagContext should return context docs", context && context.includes("Cổng quang điện"));

console.log(`Physics & RAG tests finished: ${passed} passed, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
