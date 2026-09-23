/**
 * emfBoard.js — Bảng lắp mạch 216 nút "chạy thật" cho Bài 26 (logic thuần, không React).
 *
 *  - Linh kiện (pin, khóa K, R₀, biến trở) CẮM chân vào nút của bảng. 9 nút trong một mạng
 *    dẫn điện với nhau, nên hai linh kiện có chân cùng mạng là đã nối — không cần dây.
 *  - Dây nối cắm vào nút trống (hoặc lỗ cắm đồng hồ) để nối hai mạng khác nhau.
 *  - Mạch được GIẢI bằng điện thế nút (engine/circuit.js): mắc kiểu gì đồng hồ cũng chỉ
 *    đúng như ngoài đời, kể cả khi mắc sai (ampe kế song song → quá dòng, vôn kế ngược → số âm).
 *  - analyzeBoard() đọc cấu trúc mạch để chỉ ra CHỖ cần nối tiếp theo (mạng nào, chốt nào).
 */

import { solveDC, makeUnionFind } from "../../../engine/circuit.js";
import { GRID, moduleOf, moduleNodes, nodePos } from "./boardGeometry.js";

/* ---------------- Linh kiện cắm trên bảng (chân nằm ngang, cách nhau 3 nút = 1 mạng) ---------------- */
export const BOARD_PARTS = {
  battery: { name: "Pin điện hóa", pins: [["-", 0], ["+", 3]] },
  switch: { name: "Khóa K", pins: [["in", 0], ["out", 3]] },
  protect: { name: "Điện trở R₀", pins: [["a", 0], ["b", 3]] },
  rheostat: { name: "Biến trở", pins: [["A", 0], ["C", 3], ["B", 6]] },
};
export const BOARD_PART_KEYS = ["battery", "switch", "protect", "rheostat"];
export const partSpan = (kind) => BOARD_PARTS[kind].pins[BOARD_PARTS[kind].pins.length - 1][1];

/** Bố trí mẫu: pin → K → R₀ → biến trở nối tiếp nhau NGAY TRÊN BẢNG (chung mạng), không cần dây. */
export const CANONICAL_LAYOUT = {
  battery: { X: 1, Y: 4 },
  switch: { X: 5, Y: 4 },
  protect: { X: 7, Y: 5 },
  rheostat: { X: 11, Y: 4 },
};

export const PIN_LABEL = {
  battery: { "-": "cực N (−) của pin", "+": "cực M (+) của pin" },
  switch: { in: "chốt 1 của K", out: "chốt 2 của K" },
  protect: { a: "đầu 1 của R₀", b: "đầu 2 của R₀" },
  rheostat: { A: "chốt A của biến trở", C: "con chạy C", B: "chốt B của biến trở" },
};

/* ---------------- Đồng hồ đo (nằm ngoài bảng, nối bằng dây) ---------------- */
export const METER_KEYS = ["ammeter", "voltmeter"];
export const METER_JACKS = ["A", "mA", "COM", "V"];
export const METER_NAME = { ammeter: "ĐO1", voltmeter: "ĐO2" };
// ohmTest: dòng thử ôm kế bơm từ lỗ VΩ qua mạch về COM; ohmLive: điện áp sẵn có giữa hai que (V)
// lớn hơn mức này nghĩa là đoạn đang đo còn nguồn → số Ω sai.
const METER_MODEL = { shunt: { mA: 2, "µA": 100 }, volt: 1e7, fuse: 0.4, ohmTest: 1e-3, ohmLive: 0.005, ohmOpen: 2e7 };

/* ---------------- Chỉ số "nút điện" trước khi gộp: 24 mạng + 8 lỗ cắm đồng hồ ---------------- */
const MODULE_COUNT = GRID.moduleCols * GRID.moduleRows;
const jackIndex = (meter, jack) => MODULE_COUNT + METER_KEYS.indexOf(meter) * 4 + METER_JACKS.indexOf(jack);
const NODE_COUNT = MODULE_COUNT + 8;

export const nodeKey = (X, Y) => `${X},${Y}`;
/** Điểm cắm: { t: "node", X, Y } hoặc { t: "jack", meter, jack }. */
export const endpointKey = (e) => (e.t === "node" ? `n:${e.X},${e.Y}` : `j:${e.meter}:${e.jack}`);
const endpointIndex = (e) => (e.t === "node" ? moduleOf(e.X, e.Y) : jackIndex(e.meter, e.jack));

/** Các chân của linh kiện đặt ở `at` (nút neo = chân đầu tiên). */
export function pinNodes(kind, at) {
  return BOARD_PARTS[kind].pins.map(([pin, dx]) => ({ pin, X: at.X + dx, Y: at.Y }));
}

/** Nút bị thân linh kiện che (từ chân đầu tới chân cuối, cùng hàng; biến trở cao nên che cả hàng trên). */
function coveredNodes(kind, at) {
  const out = [];
  for (let dx = 0; dx <= partSpan(kind); dx++) {
    out.push(nodeKey(at.X + dx, at.Y));
    if (kind === "rheostat") out.push(nodeKey(at.X + dx, at.Y - 1));
  }
  return out;
}

/** Tập nút đang bị chiếm (chân/thân linh kiện, phích dây). */
export function occupiedNodes(placements, wires, skipPart = null) {
  const used = new Set();
  for (const kind of BOARD_PART_KEYS) {
    if (kind === skipPart || !placements[kind]) continue;
    coveredNodes(kind, placements[kind]).forEach((key) => used.add(key));
  }
  for (const wire of wires) {
    for (const end of [wire.a, wire.b]) if (end.t === "node") used.add(nodeKey(end.X, end.Y));
  }
  return used;
}

/** Linh kiện đặt được ở `at` không: nằm gọn trong bảng, không đè linh kiện/phích dây khác. */
export function canPlace(kind, at, placements, wires) {
  if (!at || at.X < 0 || at.Y < (kind === "rheostat" ? 1 : 0) || at.Y >= GRID.rows || at.X + partSpan(kind) >= GRID.cols) return false;
  const used = occupiedNodes(placements, wires, kind);
  return coveredNodes(kind, at).every((key) => !used.has(key));
}

/** Vị trí hợp lệ gần điểm mong muốn nhất (toạ độ lưới, có thể lẻ). */
export function nearestPlacement(kind, want, placements, wires) {
  let best = null;
  for (let Y = 0; Y < GRID.rows; Y++) {
    for (let X = 0; X + partSpan(kind) < GRID.cols; X++) {
      if (!canPlace(kind, { X, Y }, placements, wires)) continue;
      const d = Math.hypot(X - want.X, (Y - want.Y) * 1.2);
      if (!best || d < best.d) best = { X, Y, d };
    }
  }
  return best ? { X: best.X, Y: best.Y } : null;
}

/** Nút trống của một mạng, gần điểm tham chiếu (toạ độ bảng) nhất trước. */
export function freeNodesIn(module, placements, wires, near = null) {
  const used = occupiedNodes(placements, wires);
  const nodes = moduleNodes(module).filter(({ X, Y }) => !used.has(nodeKey(X, Y)));
  if (near) nodes.sort((p, q) => {
    const a = nodePos(p.X, p.Y), b = nodePos(q.X, q.Y);
    return Math.hypot(a.x - near.x, a.y - near.y) - Math.hypot(b.x - near.x, b.y - near.y);
  });
  return nodes;
}

/* ---------------- Gộp nút điện: mạng + dây nối ---------------- */
function buildNets(placements, wires) {
  const uf = makeUnionFind(NODE_COUNT);
  for (const wire of wires) uf.union(endpointIndex(wire.a), endpointIndex(wire.b));
  const count = new Map();
  const bump = (idx) => { const root = uf.find(idx); count.set(root, (count.get(root) || 0) + 1); };
  for (const kind of BOARD_PART_KEYS) {
    if (!placements[kind]) continue;
    pinNodes(kind, placements[kind]).forEach(({ X, Y }) => bump(moduleOf(X, Y)));
  }
  for (const wire of wires) { bump(endpointIndex(wire.a)); bump(endpointIndex(wire.b)); }
  const pinNet = (kind, pin) => {
    const p = pinNodes(kind, placements[kind]).find((item) => item.pin === pin);
    return uf.find(moduleOf(p.X, p.Y));
  };
  const jackNet = (meter, jack) => uf.find(jackIndex(meter, jack));
  const jackWired = (meter, jack) => wires.some((w) => [w.a, w.b].some((e) => e.t === "jack" && e.meter === meter && e.jack === jack));
  // Chân/lỗ "đang dùng" = mạng của nó còn nối với thứ khác.
  const pinUsed = (kind, pin) => (count.get(pinNet(kind, pin)) || 0) >= 2;
  return { find: uf.find, pinNet, jackNet, jackWired, pinUsed };
}

/**
 * Đọc cấu trúc mạch: tìm vòng nối tiếp từ cực + qua K, R₀, biến trở, ĐO1 về cực −,
 * và kiểm tra ĐO2 mắc vào hai cực pin. Trả về vấn đề ĐẦU TIÊN cần sửa (kèm mạng cần tô sáng),
 * hoặc `valid` + đường đi của dòng điện để vẽ hạt điện tích chạy.
 */
export function analyzeBoard({ placements, wires, metersPlaced = { ammeter: true, voltmeter: true } }) {
  const missing = BOARD_PART_KEYS.filter((kind) => !placements[kind]);
  if (missing.length) return { valid: false, issue: { key: "place", text: `Cắm ${BOARD_PARTS[missing[0]].name} lên bảng.` } };
  const nets = buildNets(placements, wires);
  const fail = (key, text, focus = [], extra = {}) => ({ valid: false, nets, issue: { key, text, focus, ...extra } });
  const P = nets.pinNet("battery", "+");
  const N = nets.pinNet("battery", "-");
  if (P === N) return fail("short-battery", "Hai cực của pin đang cùng một mạng — pin bị đoản mạch! Rút dây nối hai mạng đó hoặc đặt pin chỗ khác.", [P]);

  // Linh kiện có hai chân chung một mạng → bị nối tắt (dòng điện đi vòng qua mạng).
  const twoPin = [["switch", "in", "out"], ["protect", "a", "b"]];
  for (const [kind, p, q] of twoPin) {
    if (nets.pinNet(kind, p) === nets.pinNet(kind, q)) {
      return fail(`short-${kind}`, `Hai chân của ${BOARD_PARTS[kind].name} đang chung một mạng nên nó bị nối tắt. Rút dây nối hai mạng đó (hoặc đặt linh kiện chỗ khác).`, [nets.pinNet(kind, p)]);
    }
  }

  // Lỗ cắm đồng hồ dùng sai.
  if (metersPlaced.ammeter) {
    if (nets.jackWired("ammeter", "A")) return fail("jack-ammeter", "ĐO1 đang dùng lỗ 10A — bài này đo mA: chuyển dây sang lỗ mA/µA.");
    if (nets.jackWired("ammeter", "V")) return fail("jack-ammeter", "ĐO1 là ampe kế: que đỏ cắm lỗ mA/µA (lỗ VΩ không cho dòng đi qua).");
  }
  if (metersPlaced.voltmeter && (nets.jackWired("voltmeter", "mA") || nets.jackWired("voltmeter", "A"))) {
    return fail("jack-voltmeter", "ĐO2 là vôn kế: que đỏ cắm lỗ VΩ, không cắm lỗ mA/10A.");
  }

  // Biến trở: dùng đúng hai chốt, trong đó có con chạy C.
  const used = ["A", "C", "B"].filter((pin) => nets.pinUsed("rheostat", pin));
  if (used.length === 3) return fail("rheostat-3", "Biến trở chỉ dùng HAI chốt: một đầu (A hoặc B) và con chạy C. Rút bớt một dây.", [nets.pinNet("rheostat", "C")]);
  const rhEdges = used.length === 2
    ? [{ id: "rheostat", name: "biến trở", a: nets.pinNet("rheostat", used[0]), b: nets.pinNet("rheostat", used[1]), ta: used[0], tb: used[1] }]
    : [];
  const elements = [
    { id: "switch", name: "khóa K", a: nets.pinNet("switch", "in"), b: nets.pinNet("switch", "out"), ta: "in", tb: "out" },
    { id: "protect", name: "R₀", a: nets.pinNet("protect", "a"), b: nets.pinNet("protect", "b"), ta: "a", tb: "b" },
    ...rhEdges,
  ];
  if (metersPlaced.ammeter && nets.jackWired("ammeter", "mA") && nets.jackWired("ammeter", "COM")) {
    elements.push({ id: "ammeter", name: "ĐO1", a: nets.jackNet("ammeter", "mA"), b: nets.jackNet("ammeter", "COM"), ta: "mA", tb: "COM" });
  }

  // Đi từ cực + theo mạch ngoài về cực −.
  const path = [];
  const seen = new Set();
  let net = P;
  for (let guard = 0; guard < 8 && !(net === N && path.length); guard++) {
    const touching = elements.filter((e) => !seen.has(e.id) && (e.a === net || e.b === net));
    if (!touching.length) break;
    if (touching.length > 1) {
      return fail("branch", `Mạch bị rẽ nhánh: ${touching.map((e) => e.name).join(" và ")} cùng nối vào một mạng. Mạch chính phải nối tiếp — mỗi mạng chỉ nối hai linh kiện.`, [net]);
    }
    const e = touching[0];
    const enterA = e.a === net;
    path.push({ ...e, enter: enterA ? e.ta : e.tb, exit: enterA ? e.tb : e.ta, from: net, to: enterA ? e.b : e.a });
    seen.add(e.id);
    net = enterA ? e.b : e.a;
  }
  const inLoop = new Set(path.map((e) => e.id));
  if (net !== N) {
    const amMA = metersPlaced.ammeter && nets.jackWired("ammeter", "mA") ? nets.jackNet("ammeter", "mA") : null;
    const amCOM = metersPlaced.ammeter && nets.jackWired("ammeter", "COM") ? nets.jackNet("ammeter", "COM") : null;
    const WANT = { switch: "khóa K", protect: "điện trở R₀", rheostat: "biến trở (chốt A hoặc con chạy C)", ammeter: "que đỏ (lỗ mA) của ĐO1" };
    // Linh kiện kế tiếp còn thiếu trong mạch nối tiếp (bỏ qua linh kiện đang "chờ" ở mạng này).
    const nextAfter = (skip) => {
      const id = ["switch", "protect", "rheostat", "ammeter"].find((x) => x !== skip && ![...inLoop].some((y) => y.startsWith(x)));
      return id ? WANT[id] : "cực N (−) của pin";
    };
    if (amMA !== null && amCOM === null && net === amMA) return fail("open", "Dòng điện đã tới lỗ mA của ĐO1 — nối lỗ COM của ĐO1 về linh kiện tiếp theo (hoặc về mạng cực N (−) của pin).", [N]);
    if (amCOM !== null && amMA === null && net === amCOM) return fail("open", "Dây đang vào lỗ COM của ĐO1 — dòng điện phải VÀO lỗ mA và RA lỗ COM. Chuyển dây sang lỗ mA.", [net]);
    // Dòng điện đã tới một chốt của biến trở nhưng chưa có lối ra.
    if (used.length === 1 && nets.pinNet("rheostat", used[0]) === net) {
      const exitPin = used[0] === "C" ? "chốt A" : "con chạy C";
      const exitNet = nets.pinNet("rheostat", used[0] === "C" ? "A" : "C");
      return fail("open", `Dòng điện đã vào biến trở (${used[0] === "C" ? "con chạy C" : `chốt ${used[0]}`}) — nối ${exitPin} (mạng đang nhấp nháy) tới ${nextAfter("rheostat")}.`, [exitNet], { from: exitNet });
    }
    const last = path[path.length - 1];
    const from = last ? `chân còn lại của ${last.name}` : "cực M (+) của pin";
    return fail("open", `Mạch còn hở: nối ${from} (mạng đang nhấp nháy) tới ${nextAfter(null)}.`, [net], { from: net });
  }
  const skipped = ["switch", "protect", "rheostat", "ammeter"].filter((id) => ![...inLoop].some((x) => x.startsWith(id)));
  if (skipped.length) {
    const names = { switch: "khóa K", protect: "R₀", rheostat: "biến trở", ammeter: "ĐO1" };
    return fail("bypass", `Dòng điện đã về cực − mà chưa đi qua ${skipped.map((id) => names[id]).join(", ")}. Mắc nối tiếp đủ K, R₀, biến trở và ĐO1.`, [N]);
  }
  if (!used.includes("C")) return fail("rheostat-AB", "Biến trở đang mắc hai đầu A–B nên luôn là 100 Ω. Nối vào con chạy C thì mới đổi được dòng điện.", [nets.pinNet("rheostat", "C")]);
  const am = path.find((e) => e.id === "ammeter");
  if (am && am.enter !== "mA") return fail("ammeter-reversed", "Dòng điện đang đi vào lỗ COM của ĐO1 (số đo sẽ âm). Đổi hai dây: dòng phải vào lỗ mA, ra lỗ COM.");

  // Vôn kế ĐO2 mắc song song với hai cực pin.
  if (!metersPlaced.voltmeter) return fail("voltmeter", "Lắp đồng hồ ĐO2 để đo hiệu điện thế.");
  const vV = nets.jackWired("voltmeter", "V") ? nets.jackNet("voltmeter", "V") : null;
  const vC = nets.jackWired("voltmeter", "COM") ? nets.jackNet("voltmeter", "COM") : null;
  if (vV === null || vC === null) {
    return fail("voltmeter", vV === null && vC === null
      ? "Nối ĐO2 song song với pin: lỗ VΩ vào mạng cực M (+), lỗ COM vào mạng cực N (−)."
      : vV === null ? "Còn thiếu dây từ lỗ VΩ của ĐO2 tới mạng cực M (+) của pin." : "Còn thiếu dây từ lỗ COM của ĐO2 tới mạng cực N (−) của pin.",
    [vV === null ? P : N]);
  }
  if (vV === N && vC === P) return fail("voltmeter-reversed", "ĐO2 đang mắc ngược cực (số đo âm). Đổi hai dây: VΩ vào cực M (+), COM vào cực N (−).");
  if (vV !== P || vC !== N) return fail("voltmeter-place", "ĐO2 phải mắc vào đúng HAI CỰC của pin (mạng của cực M và mạng của cực N) để đo U giữa hai cực.", [P, N]);

  return { valid: true, nets, path, rheostatPins: used, P, N };
}

/**
 * Giải mạch và trả về số chỉ hai đồng hồ.
 * cell = { emf, r }; rheostat = vị trí con chạy (0..100 Ω tính từ A); r0 = điện trở bảo vệ (nóng lên thì tăng nhẹ).
 */
export function solveBoard({ placements, wires, switchClosed, rheostat, cell, modes, metersPlaced = { ammeter: true, voltmeter: true }, r0 = 10 }) {
  const nets = buildNets(placements, wires);
  const conductances = [];
  const sources = [];
  const add = (a, b, R) => conductances.push({ a, b, g: 1 / Math.max(1e-4, R) });
  let ground = 0;
  if (placements.battery) {
    const p = nets.pinNet("battery", "+");
    const n = nets.pinNet("battery", "-");
    ground = n;
    add(n, p, cell.r);
    sources.push({ from: n, to: p, i: cell.emf / cell.r });
  }
  if (placements.switch && switchClosed) add(nets.pinNet("switch", "in"), nets.pinNet("switch", "out"), 0.02);
  if (placements.protect) add(nets.pinNet("protect", "a"), nets.pinNet("protect", "b"), r0);
  if (placements.rheostat) {
    const x = Math.max(0, Math.min(100, rheostat));
    add(nets.pinNet("rheostat", "A"), nets.pinNet("rheostat", "C"), Math.max(0.05, x));
    add(nets.pinNet("rheostat", "C"), nets.pinNet("rheostat", "B"), Math.max(0.05, 100 - x));
  }
  const meterParts = {};
  for (const meter of METER_KEYS) {
    const mode = modes[meter];
    if (!metersPlaced[meter] || mode === "OFF") { meterParts[meter] = { mode }; continue; }
    const V = nets.jackNet(meter, "V"), COM = nets.jackNet(meter, "COM"), mA = nets.jackNet(meter, "mA");
    // Nấc Ω: đồng hồ là nguồn dòng thử (tính riêng ở dưới), lỗ mA hở — không có trở vôn kế hay shunt.
    if (mode === "Ω") { meterParts[meter] = { mode, V, COM }; continue; }
    add(V, COM, METER_MODEL.volt);
    const shunt = METER_MODEL.shunt[mode];
    if (shunt) add(mA, COM, shunt);
    meterParts[meter] = { mode, V, COM, mA, shunt };
  }
  const potentials = solveDC({ nodeCount: NODE_COUNT, conductances, sources, ground });
  // Linh kiện nằm đúng giữa hai que đo (để lời giải thích nói rõ đang đo cái gì).
  const acrossOf = (V, COM) => {
    const across = (kind, p, q) => {
      if (!placements[kind]) return false;
      const a = nets.pinNet(kind, p), b = nets.pinNet(kind, q);
      return (a === V && b === COM) || (a === COM && b === V);
    };
    if (across("battery", "+", "-")) return "battery";
    if (across("protect", "a", "b")) return "protect";
    if (across("switch", "in", "out")) return "switch";
    if (across("rheostat", "A", "C")) return "rheostat-AC";
    if (across("rheostat", "C", "B")) return "rheostat-CB";
    if (across("rheostat", "A", "B")) return "rheostat-AB";
    return null;
  };
  const read = (meter) => {
    const m = meterParts[meter];
    if (!m || m.mode === "OFF") return { mode: m?.mode ?? "OFF", value: 0, overload: false };
    if (m.shunt) {
      const current = (potentials[m.mA] - potentials[m.COM]) / m.shunt;       // A, dương khi dòng vào lỗ mA
      const shown = m.mode === "mA" ? current * 1000 : current * 1e6;
      const overload = Math.abs(current) > METER_MODEL.fuse || (m.mode === "µA" && Math.abs(shown) > 1999.9);
      return { mode: m.mode, value: shown, current, overload };
    }
    if (m.mode === "V") return { mode: "V", value: potentials[m.V] - potentials[m.COM], overload: false };
    // Ôm kế như máy thật: bơm dòng thử I₀ từ lỗ VΩ qua mạch về COM, số chỉ = ΔU / I₀.
    // Nguồn trong mạch bị "tắt" khi tính điện trở thật (chồng chập); nếu giữa hai que sẵn có điện áp
    // (đoạn đo còn nguồn, K đang đóng…) thì ΔU lẫn cả điện áp đó → số Ω SAI, báo `live`.
    const vOpen = potentials[m.V] - potentials[m.COM];
    const test = solveDC({ nodeCount: NODE_COUNT, conductances, sources: [{ from: m.COM, to: m.V, i: METER_MODEL.ohmTest }], ground });
    const ohms = (test[m.V] - test[m.COM]) / METER_MODEL.ohmTest;
    const live = Math.abs(vOpen) > METER_MODEL.ohmLive;
    const value = live ? ohms + vOpen / METER_MODEL.ohmTest : ohms;
    return { mode: "Ω", value, ohms, live, across: acrossOf(m.V, m.COM), overload: Math.abs(value) >= METER_MODEL.ohmOpen };
  };
  let batteryCurrent = 0;
  if (placements.battery) {
    const u = potentials[nets.pinNet("battery", "+")] - potentials[nets.pinNet("battery", "-")];
    batteryCurrent = (cell.emf - u) / cell.r;
  }
  return { ammeter: read("ammeter"), voltmeter: read("voltmeter"), batteryCurrent, potentials, nets };
}

/**
 * Dây cần thêm để mạch đúng sơ đồ với bố trí linh kiện HIỆN TẠI ("Làm giúp bước này"):
 * nối tiếp pin(+) → K → R₀ → biến trở (A–C) → ĐO1 (mA → COM) → pin(−); ĐO2: VΩ → +, COM → −.
 * `jackPos(meter, jack)` trả toạ độ bảng của lỗ cắm để chọn nút gần đồng hồ cho dây gọn.
 */
export function planWires(placements, jackPos) {
  const wires = [];
  const nets = () => buildNets(placements, wires);
  const moduleOfPin = (kind, pin) => {
    const p = pinNodes(kind, placements[kind]).find((item) => item.pin === pin);
    return moduleOf(p.X, p.Y);
  };
  const plug = (module, near) => {
    const node = freeNodesIn(module, placements, wires, near)[0];
    return node ? { t: "node", X: node.X, Y: node.Y } : null;
  };
  const addWire = (a, b) => { if (a && b) wires.push({ id: `w${wires.length + 1}`, a, b }); };
  const link = (fromKind, fromPin, toKind, toPin) => {
    const n = nets();
    if (n.pinNet(fromKind, fromPin) === n.pinNet(toKind, toPin)) return;
    const mFrom = moduleOfPin(fromKind, fromPin), mTo = moduleOfPin(toKind, toPin);
    const target = nodePos(pinNodes(toKind, placements[toKind]).find((p) => p.pin === toPin).X, pinNodes(toKind, placements[toKind]).find((p) => p.pin === toPin).Y);
    const source = nodePos(pinNodes(fromKind, placements[fromKind]).find((p) => p.pin === fromPin).X, pinNodes(fromKind, placements[fromKind]).find((p) => p.pin === fromPin).Y);
    addWire(plug(mFrom, target), plug(mTo, source));
  };
  const jack = (meter, j) => ({ t: "jack", meter, jack: j });
  const toJack = (kind, pin, meter, j) => {
    const near = jackPos(meter, j);
    addWire(plug(moduleOfPin(kind, pin), near), jack(meter, j));
  };
  // Chọn chiều của K và R₀ sao cho tận dụng chân đã chung mạng (ít dây nhất).
  const orient = (prev, kind, [p, q]) => {
    const n = nets();
    return n.pinNet(kind, q) === n.pinNet(prev[0], prev[1]) ? [q, p] : [p, q];
  };
  const [kIn, kOut] = orient(["battery", "+"], "switch", ["in", "out"]);
  link("battery", "+", "switch", kIn);
  const [rIn, rOut] = orient(["switch", kOut], "protect", ["a", "b"]);
  link("switch", kOut, "protect", rIn);
  const hOut = nets().pinNet("rheostat", "B") === nets().pinNet("protect", rOut) ? "B" : "A";
  link("protect", rOut, "rheostat", hOut);
  toJack("rheostat", "C", "ammeter", "mA");
  toJack("battery", "-", "ammeter", "COM");
  toJack("battery", "+", "voltmeter", "V");
  toJack("battery", "-", "voltmeter", "COM");
  return wires;
}

/**
 * Đường đi của dòng điện bên trong một nút điện: từ chân/lỗ `from` tới chân/lỗ `to`,
 * đi qua dải kim loại của mạng và qua dây nối. Trả về các đoạn { kind: "module", a, b }
 * (toạ độ bảng) hoặc { kind: "wire", id, reverse }.
 */
export function routeWithinNet(from, to, wires) {
  const key = endpointKey;
  const start = key(from), goal = key(to);
  if (start === goal) return [];
  // Đỉnh: điểm cắm. Cạnh: cùng mạng (nút–nút) hoặc dây nối.
  const points = new Map([[start, from], [goal, to]]);
  wires.forEach((w) => { points.set(key(w.a), w.a); points.set(key(w.b), w.b); });
  const neighbors = (k) => {
    const e = points.get(k);
    const out = [];
    for (const w of wires) {
      if (key(w.a) === k) out.push({ k: key(w.b), seg: { kind: "wire", id: w.id, reverse: false } });
      if (key(w.b) === k) out.push({ k: key(w.a), seg: { kind: "wire", id: w.id, reverse: true } });
    }
    if (e.t === "node") {
      const m = moduleOf(e.X, e.Y);
      for (const [k2, e2] of points) {
        if (k2 !== k && e2.t === "node" && moduleOf(e2.X, e2.Y) === m) out.push({ k: k2, seg: { kind: "module", a: nodePos(e.X, e.Y), b: nodePos(e2.X, e2.Y) } });
      }
    }
    return out;
  };
  const prev = new Map([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const k = queue.shift();
    if (k === goal) break;
    for (const { k: n, seg } of neighbors(k)) {
      if (prev.has(n)) continue;
      prev.set(n, { k, seg });
      queue.push(n);
    }
  }
  if (!prev.has(goal)) return [];
  const segs = [];
  for (let k = goal; prev.get(k); k = prev.get(k).k) segs.unshift(prev.get(k).seg);
  return segs;
}

/** Điểm cắm của một chân linh kiện. */
export function pinEndpoint(placements, kind, pin) {
  const p = pinNodes(kind, placements[kind]).find((item) => item.pin === pin);
  return { t: "node", X: p.X, Y: p.Y };
}
