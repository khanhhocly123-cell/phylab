/**
 * schematic.ts — "Vẽ sơ đồ mạch" trong Prelab điện (Bài 23, Bài 26). Logic thuần, không React.
 *
 * Các kí hiệu dụng cụ đặt sẵn trên giấy kẻ ô; học sinh nối dây giữa các chốt. Máy CHẤM bằng cách
 * giải mạch thật (engine/circuit.js) chứ không so từng dây với đáp án, nên nối theo thứ tự nào
 * cũng được miễn đúng vật lý:
 *   - ampe kế có cùng dòng với mạch chính (nối tiếp) và dòng đi vào chốt (+);
 *   - vôn kế có hai chốt trùng hai đầu phần tử cần đo (song song) và chốt (+) ở phía điện thế cao;
 *   - mở khoá K thì mạch mất dòng (K nằm trên mạch chính);
 *   - không có phần tử nào bị nối tắt, không có cặp nào bị mắc song song sai.
 */
import { solveDC, makeUnionFind } from "../engine/circuit.js";

export type PartKind = "source" | "switch" | "resistor" | "rheostat" | "ammeter" | "voltmeter";
export type Out = "left" | "right" | "up" | "down";

export interface Pt { x: number; y: number }

export interface SchTerminal extends Pt {
  /** "<part>:0" | "<part>:1" — với nguồn và đồng hồ, chốt 0 luôn là cực (+). */
  id: string;
  part: string;
  sign?: "+" | "-";
  /** Hướng chân dây đi ra khỏi thân dụng cụ. */
  out: Out;
  name: string;
}

export interface SchPart {
  id: string;
  kind: PartKind;
  /** Nhãn trên hình (U, K, A, V, R, R₀, Rb…). */
  label: string;
  /** Tên đầy đủ dùng trong lời nhận xét. */
  name: string;
  /** Giá trị ghi cạnh kí hiệu (vd "6 V", "150 Ω"). */
  value?: string;
  x: number;
  y: number;
  orient: "h" | "v";
  half: number;
  ohms?: number;
  emf?: number;
  r?: number;
  terminals: [SchTerminal, SchTerminal];
}

export type SchWire = { a: string; b: string };

export interface SchematicSpec {
  key: "ohm" | "emf";
  width: number;
  height: number;
  task: string;
  parts: SchPart[];
  /** Phần tử vôn kế phải mắc song song. */
  across: string;
  /** Các phần tử phải nằm nối tiếp trên mạch chính cùng nguồn (kể cả ampe kế). */
  series: string[];
  /** Một cách nối đúng — dùng cho gợi ý. */
  solution: SchWire[];
}

/* ------------------------------------------------------------------------------------------------
   Dựng dụng cụ
   ---------------------------------------------------------------------------------------------- */

const POLAR: PartKind[] = ["source", "ammeter", "voltmeter"];

const TERMINAL_NAMES: Record<PartKind, (label: string, sign: "+" | "-" | undefined, index: number) => string> = {
  source: (label, sign) => `cực (${sign === "+" ? "+" : "−"}) của ${label === "E, r" ? "pin" : "nguồn"}`,
  ammeter: (_l, sign) => `chốt (${sign === "+" ? "+" : "−"}) của ampe kế`,
  voltmeter: (_l, sign) => `chốt (${sign === "+" ? "+" : "−"}) của vôn kế`,
  switch: (_l, _s, i) => `chốt ${i + 1} của khoá K`,
  resistor: (label, _s, i) => `đầu ${i + 1} của ${label}`,
  rheostat: (_l, _s, i) => `đầu ${i + 1} của biến trở`,
};

type PartInit = Omit<SchPart, "terminals"> & {
  /** Nguồn/đồng hồ: cực (+) ở đầu phải (ngang) hoặc đầu dưới (dọc). Mặc định (+) ở trái/trên. */
  plusAtEnd?: boolean;
};

function makePart(init: PartInit): SchPart {
  const { plusAtEnd, ...p } = init;
  const start: Pt & { out: Out } = p.orient === "h" ? { x: p.x - p.half, y: p.y, out: "left" } : { x: p.x, y: p.y - p.half, out: "up" };
  const end: Pt & { out: Out } = p.orient === "h" ? { x: p.x + p.half, y: p.y, out: "right" } : { x: p.x, y: p.y + p.half, out: "down" };
  const polar = POLAR.includes(p.kind);
  const ends = polar && plusAtEnd ? [end, start] : [start, end];
  const terminals = ends.map((e, i) => {
    const sign = polar ? (i === 0 ? "+" : "-") : undefined;
    return { id: `${p.id}:${i}`, part: p.id, sign, x: e.x, y: e.y, out: e.out, name: TERMINAL_NAMES[p.kind](p.label, sign, i) } as SchTerminal;
  }) as [SchTerminal, SchTerminal];
  return { ...p, terminals };
}

const W = (a: string, b: string): SchWire => ({ a, b });

/** Bài 23 — nguồn DC, khoá K, ampe kế nối tiếp vật dẫn R, vôn kế song song với R. */
const OHM_SPEC: SchematicSpec = {
  key: "ohm",
  width: 560,
  height: 360,
  task: "Nối nguồn, khoá K, ampe kế và vật dẫn R thành một vòng kín; vôn kế mắc song song với hai đầu R. Chốt (+) của hai đồng hồ nối về phía cực (+) của nguồn.",
  parts: [
    makePart({ id: "src", kind: "source", label: "U", name: "Nguồn điện", value: "6 V", x: 280, y: 64, orient: "h", half: 40, emf: 6, r: 0.001 }),
    makePart({ id: "k", kind: "switch", label: "K", name: "Khoá K", x: 84, y: 184, orient: "v", half: 36 }),
    makePart({ id: "a", kind: "ammeter", label: "A", name: "Ampe kế", x: 200, y: 300, orient: "h", half: 38 }),
    makePart({ id: "r", kind: "resistor", label: "R", name: "Vật dẫn R", value: "150 Ω", x: 390, y: 300, orient: "h", half: 42, ohms: 150 }),
    makePart({ id: "v", kind: "voltmeter", label: "V", name: "Vôn kế", x: 390, y: 196, orient: "h", half: 42 }),
  ],
  across: "r",
  series: ["k", "a", "r"],
  solution: [W("src:0", "k:0"), W("k:1", "a:0"), W("a:1", "r:0"), W("r:1", "src:1"), W("v:0", "r:0"), W("v:1", "r:1")],
};

/** Bài 26 — pin (E, r), K, R₀, biến trở, ampe kế nối tiếp; vôn kế mắc giữa hai cực pin. */
const EMF_SPEC: SchematicSpec = {
  key: "emf",
  width: 560,
  height: 360,
  task: "Nối pin, khoá K, điện trở bảo vệ R₀, biến trở và ampe kế thành một mạch nối tiếp khép kín; vôn kế mắc giữa hai cực của pin. Chốt (+) của đồng hồ nối về phía cực (+) của pin.",
  parts: [
    makePart({ id: "src", kind: "source", label: "E, r", name: "Pin", value: "1,5 V · 1 Ω", x: 280, y: 64, orient: "h", half: 40, emf: 1.5, r: 1 }),
    makePart({ id: "v", kind: "voltmeter", label: "V", name: "Vôn kế", x: 280, y: 150, orient: "h", half: 40 }),
    makePart({ id: "k", kind: "switch", label: "K", name: "Khoá K", x: 70, y: 196, orient: "v", half: 36 }),
    makePart({ id: "r0", kind: "resistor", label: "R₀", name: "Điện trở bảo vệ R₀", value: "10 Ω", x: 176, y: 304, orient: "h", half: 38, ohms: 10 }),
    makePart({ id: "rb", kind: "rheostat", label: "Rb", name: "Biến trở", value: "19 Ω", x: 318, y: 304, orient: "h", half: 42, ohms: 19 }),
    makePart({ id: "a", kind: "ammeter", label: "A", name: "Ampe kế", x: 486, y: 196, orient: "v", half: 38, plusAtEnd: true }),
  ],
  across: "src",
  series: ["k", "r0", "rb", "a"],
  solution: [W("src:0", "k:0"), W("k:1", "r0:0"), W("r0:1", "rb:0"), W("rb:1", "a:0"), W("a:1", "src:1"), W("v:0", "src:0"), W("v:1", "src:1")],
};

export const SCHEMATICS: Record<"ohm" | "emf", SchematicSpec> = { ohm: OHM_SPEC, emf: EMF_SPEC };

export function terminalsOf(spec: SchematicSpec): SchTerminal[] {
  return spec.parts.flatMap((p) => p.terminals);
}

export function partOf(spec: SchematicSpec, id: string): SchPart | undefined {
  return spec.parts.find((p) => p.id === id);
}

/* ------------------------------------------------------------------------------------------------
   Giải mạch
   ---------------------------------------------------------------------------------------------- */

const G_WIRE = 1e4;          // dây nối ~0,1 mΩ
const R_AMMETER = 0.01;      // ampe kế gần lí tưởng → số chỉ khớp bài tính
const R_VOLTMETER = 1e7;
const G_SWITCH = 1e4;

export interface SchSolve {
  /** Điện thế từng chốt (theo thứ tự terminalsOf). */
  V: Float64Array;
  /** Dòng qua phần tử đi từ chốt 0 sang chốt 1 (A). Nguồn: dòng đi ra từ cực (+). */
  current: Record<string, number>;
  /** Dòng trên từng dây, chiều a → b (A). */
  wire: number[];
  ammeter: number;
  voltmeter: number;
}

function conductanceOf(p: SchPart, switchClosed: boolean): number {
  switch (p.kind) {
    case "source": return 1 / (p.r ?? 1e-3);
    case "switch": return switchClosed ? G_SWITCH : 0;
    case "ammeter": return 1 / R_AMMETER;
    case "voltmeter": return 1 / R_VOLTMETER;
    default: return 1 / (p.ohms ?? 1);
  }
}

export function solveSchematic(spec: SchematicSpec, wires: SchWire[], switchClosed = true): SchSolve {
  const terms = terminalsOf(spec);
  const index = new Map(terms.map((t, i) => [t.id, i]));
  const conductances: Array<{ a: number; b: number; g: number }> = [];
  const sources: Array<{ from: number; to: number; i: number }> = [];
  for (const p of spec.parts) {
    const a = index.get(p.terminals[0].id)!;
    const b = index.get(p.terminals[1].id)!;
    const g = conductanceOf(p, switchClosed);
    if (g > 0) conductances.push({ a, b, g });
    // Nguồn: mô hình Norton — nguồn dòng E/r đẩy dòng từ cực (−) sang cực (+) bên trong nguồn.
    if (p.kind === "source") sources.push({ from: b, to: a, i: (p.emf ?? 0) / (p.r ?? 1e-3) });
  }
  const wireIdx = wires.map((w) => [index.get(w.a)!, index.get(w.b)!] as const);
  for (const [a, b] of wireIdx) conductances.push({ a, b, g: G_WIRE });

  const src = spec.parts.find((p) => p.kind === "source")!;
  const ground = index.get(src.terminals[1].id)!;
  const V = solveDC({ nodeCount: terms.length, conductances, sources, ground }) as Float64Array;

  const current: Record<string, number> = {};
  for (const p of spec.parts) {
    const u = V[index.get(p.terminals[0].id)!] - V[index.get(p.terminals[1].id)!];
    current[p.id] = p.kind === "source" ? ((p.emf ?? 0) - u) / (p.r ?? 1e-3) : u * conductanceOf(p, switchClosed);
  }
  const wire = wireIdx.map(([a, b]) => (V[a] - V[b]) * G_WIRE);
  const am = spec.parts.find((p) => p.kind === "ammeter");
  const vm = spec.parts.find((p) => p.kind === "voltmeter");
  const voltmeter = vm ? V[index.get(vm.terminals[0].id)!] - V[index.get(vm.terminals[1].id)!] : 0;
  return { V, current, wire, ammeter: am ? current[am.id] : 0, voltmeter };
}

/** Số chỉ của mạch mẫu (để so dòng/áp "bình thường" của bài). */
export function expectedReadings(spec: SchematicSpec) {
  const s = solveSchematic(spec, spec.solution, true);
  return { current: s.ammeter, voltage: s.voltmeter };
}

/* ------------------------------------------------------------------------------------------------
   Chấm sơ đồ
   ---------------------------------------------------------------------------------------------- */

export interface SchIssue {
  code: string;
  text: string;
  /** Phần tử cần tô để chỉ chỗ sai. */
  parts: string[];
  /** Chốt cần tô (chân chưa nối). */
  terminals?: string[];
}

export interface SchCheck {
  ok: boolean;
  issues: SchIssue[];
  /** Số chỉ ampe kế (A) và vôn kế (V) khi mạch đúng. */
  current?: number;
  voltage?: number;
  solve?: SchSolve;
}

export function netsOf(spec: SchematicSpec, wires: SchWire[]) {
  const terms = terminalsOf(spec);
  const index = new Map(terms.map((t, i) => [t.id, i]));
  const uf = makeUnionFind(terms.length) as { find: (x: number) => number; union: (a: number, b: number) => void };
  for (const w of wires) uf.union(index.get(w.a)!, index.get(w.b)!);
  return (terminalId: string) => uf.find(index.get(terminalId)!);
}

/** Tên phần tử giữa câu: chỉ viết thường chữ đầu, giữ nguyên kí hiệu (R, K, R₀). */
const ref = (p: SchPart) => p.name.charAt(0).toLowerCase() + p.name.slice(1);

const samePair = (a: [number, number], b: [number, number]) => (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);

export function checkSchematic(spec: SchematicSpec, wires: SchWire[]): SchCheck {
  const terms = terminalsOf(spec);
  const degree = new Map<string, number>();
  for (const w of wires) {
    degree.set(w.a, (degree.get(w.a) ?? 0) + 1);
    degree.set(w.b, (degree.get(w.b) ?? 0) + 1);
  }

  // 1) Chân chưa nối — sửa trước đã, các lỗi khác chưa có nghĩa.
  const loose = terms.filter((t) => !degree.get(t.id));
  if (loose.length) {
    const names = loose.slice(0, 3).map((t) => t.name).join(", ");
    return {
      ok: false,
      issues: [{
        code: "open",
        text: `Còn ${loose.length} chân chưa nối: ${names}${loose.length > 3 ? ` và ${loose.length - 3} chân khác` : ""}. Mạch phải khép kín, chốt nào cũng phải có dây.`,
        parts: [...new Set(loose.map((t) => t.part))],
        terminals: loose.map((t) => t.id),
      }],
    };
  }

  const net = netsOf(spec, wires);
  const pairOf = (p: SchPart): [number, number] => [net(p.terminals[0].id), net(p.terminals[1].id)];
  const issues: SchIssue[] = [];
  const flagged = new Set<string>();
  const add = (issue: SchIssue) => {
    if (issues.some((i) => i.code === issue.code)) return;
    issues.push(issue);
    issue.parts.forEach((p) => flagged.add(p));
  };

  // 2) Phần tử bị nối tắt (hai chân cùng một nút). Vôn kế "tắt" theo phần tử nó đo thì chỉ báo lỗi gốc.
  const shortedNets = new Set(spec.parts.filter((p) => p.kind !== "voltmeter").map(pairOf).filter(([a, b]) => a === b).map(([a]) => a));
  for (const p of spec.parts) {
    const [a, b] = pairOf(p);
    if (a !== b) continue;
    if (p.kind === "voltmeter" && shortedNets.has(a)) continue;
    if (p.kind === "source") add({ code: "short-src", text: "Đoản mạch: hai cực của nguồn đang nối thẳng với nhau bằng dây — dòng rất lớn, nguồn nóng và hỏng.", parts: [p.id] });
    else if (p.kind === "voltmeter") add({ code: "short-v", text: "Hai chốt của vôn kế đang nối thẳng với nhau nên vôn kế luôn chỉ 0.", parts: [p.id] });
    else add({ code: `short-${p.id}`, text: `${p.name} bị nối tắt: hai đầu nối thẳng với nhau bằng dây nên dòng điện đi vòng qua dây.`, parts: [p.id] });
  }
  if (issues.length) return { ok: false, issues };

  // 3) Hai phần tử mắc song song sai (chung cả hai nút).
  const across = partOf(spec, spec.across)!;
  const vm = spec.parts.find((p) => p.kind === "voltmeter");
  const am = spec.parts.find((p) => p.kind === "ammeter");
  for (let i = 0; i < spec.parts.length; i++) {
    for (let j = i + 1; j < spec.parts.length; j++) {
      const p = spec.parts[i], q = spec.parts[j];
      if (!samePair(pairOf(p), pairOf(q))) continue;
      if (p.kind === "voltmeter" || q.kind === "voltmeter") continue; // xét riêng ở bước vôn kế
      const meter = p.kind === "ammeter" ? p : q.kind === "ammeter" ? q : null;
      const other = meter === p ? q : p;
      if (meter) {
        add(other.kind === "source"
          ? { code: "a-src", text: "Ampe kế đang nối thẳng vào hai cực nguồn: điện trở ampe kế rất nhỏ nên đoản mạch, cháy cầu chì.", parts: [meter.id, other.id] }
          : { code: "a-par", text: `Ampe kế đang mắc song song với ${ref(other)} — ampe kế phải mắc nối tiếp.`, parts: [meter.id, other.id] });
      } else if (p.kind === "switch" || q.kind === "switch") {
        const sw = p.kind === "switch" ? p : q;
        const o = sw === p ? q : p;
        add({ code: "k-par", text: `Khoá K đang mắc song song với ${ref(o)}: đóng K thì ${ref(o)} bị nối tắt. K phải nằm nối tiếp trên mạch chính.`, parts: [sw.id, o.id] });
      } else {
        add({ code: `par-${p.id}-${q.id}`, text: `${p.name} và ${ref(q)} đang mắc song song — trong bài này chúng phải nối tiếp.`, parts: [p.id, q.id] });
      }
    }
  }

  // 4) Giải mạch khi đóng K.
  const expected = expectedReadings(spec);
  const I0 = Math.abs(expected.current);
  const on = solveSchematic(spec, wires, true);
  const src = spec.parts.find((p) => p.kind === "source")!;
  const iSrc = on.current[src.id];

  if (am && Math.abs(on.ammeter) > 5 * I0 && !flagged.has(am.id)) {
    add({ code: "a-big", text: `Dòng qua ampe kế quá lớn (${Math.abs(on.ammeter).toFixed(1)} A) — có chỗ đoản mạch, ampe kế sẽ cháy cầu chì.`, parts: [am.id] });
  }

  if (vm) {
    const vPair = pairOf(vm);
    const aPair = pairOf(across);
    if (!samePair(vPair, aPair)) {
      const inSeries = Math.abs(iSrc) < 1e-3 * I0;
      add(inSeries
        ? { code: "v-series", text: "Vôn kế đang mắc nối tiếp: điện trở vôn kế rất lớn nên mạch gần như không có dòng. Vôn kế phải mắc song song.", parts: [vm.id] }
        : { code: "v-across", text: `Vôn kế phải mắc song song với hai đầu ${spec.across === "src" ? "pin (nối vào hai cực pin)" : ref(across)}.`, parts: [vm.id, across.id] });
    }
  }

  if (Math.abs(iSrc) < 1e-3 * I0 && !issues.some((i) => i.code === "v-series")) {
    add({ code: "no-loop", text: "Mạch chưa khép kín qua nguồn nên không có dòng điện. Kiểm tra lại vòng: nguồn → K → … → nguồn.", parts: [src.id] });
  }

  const parallelFound = issues.some((i) => i.code === "a-par" || i.code === "a-src" || i.code === "k-par" || i.code.startsWith("par-"));
  for (const id of parallelFound ? [] : spec.series) {
    if (flagged.has(id)) continue;
    const p = partOf(spec, id)!;
    const ratio = Math.abs(iSrc) > 1e-12 ? Math.abs(on.current[id]) / Math.abs(iSrc) : 0;
    if (Math.abs(iSrc) >= 1e-3 * I0 && Math.abs(ratio - 1) > 0.02) {
      add({ code: `series-${id}`, text: `${p.name} chưa nằm nối tiếp trên mạch chính (dòng qua nó khác dòng qua nguồn).`, parts: [id] });
    }
  }

  if (am && !flagged.has(am.id) && on.ammeter < -1e-3 * I0) {
    add({ code: "a-pol", text: "Ampe kế bị đảo cực: dòng điện phải đi vào chốt (+). Nối chốt (+) về phía cực (+) của nguồn.", parts: [am.id] });
  }
  if (vm && !flagged.has(vm.id) && on.voltmeter < -1e-3 * Math.abs(expected.voltage)) {
    add({ code: "v-pol", text: "Vôn kế bị đảo cực: chốt (+) của vôn kế phải nối với đầu có điện thế cao hơn (phía cực + của nguồn).", parts: [vm.id] });
  }

  // 5) Mở K thì phải mất dòng.
  const k = spec.parts.find((p) => p.kind === "switch");
  if (k && !flagged.has(k.id)) {
    const off = solveSchematic(spec, wires, false);
    if (Math.abs(off.current[src.id]) > 1e-3 * I0) {
      add({ code: "k-main", text: "Mở khoá K mà mạch vẫn có dòng: K chưa nằm trên mạch chính.", parts: [k.id] });
    }
  }

  if (issues.length) return { ok: false, issues, solve: on };
  return { ok: true, issues: [], current: on.ammeter, voltage: on.voltmeter, solve: on };
}

/** Dây mẫu còn thiếu (theo nút, không theo từng dây) — dùng cho gợi ý. */
export function missingSolutionWires(spec: SchematicSpec, wires: SchWire[]): SchWire[] {
  const net = netsOf(spec, wires);
  return spec.solution.filter((w) => net(w.a) !== net(w.b));
}

/* ------------------------------------------------------------------------------------------------
   Vẽ: thân dụng cụ + định tuyến dây vuông góc
   ---------------------------------------------------------------------------------------------- */

export interface Box { x0: number; y0: number; x1: number; y1: number; part: string }

const BODY: Record<PartKind, [number, number]> = {
  // [nửa chiều dọc theo dây, nửa chiều ngang]
  source: [9, 18],
  switch: [16, 13],
  resistor: [23, 10],
  rheostat: [24, 15],
  ammeter: [18, 18],
  voltmeter: [18, 18],
};

export function bodyBox(p: SchPart): Box {
  const [along, across] = BODY[p.kind];
  return p.orient === "h"
    ? { x0: p.x - along, y0: p.y - across, x1: p.x + along, y1: p.y + across, part: p.id }
    : { x0: p.x - across, y0: p.y - along, x1: p.x + across, y1: p.y + along, part: p.id };
}

const OUT_DIR: Record<Out, Pt> = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };

function segHitsBox(a: Pt, b: Pt, box: Box, pad = 1): boolean {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  return x1 > box.x0 + pad && x0 < box.x1 - pad && y1 > box.y0 + pad && y0 < box.y1 - pad;
}

function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function simplify(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && last.x === p.x && last.y === p.y) continue;
    out.push(p);
  }
  // Bỏ điểm thẳng hàng.
  for (let i = out.length - 2; i > 0; i--) {
    const a = out[i - 1], b = out[i], c = out[i + 1];
    if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) out.splice(i, 1);
  }
  return out;
}

function overlapLen(a: Pt, b: Pt, c: Pt, d: Pt): number {
  if (a.y === b.y && c.y === d.y && a.y === c.y) {
    return Math.max(0, Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)));
  }
  if (a.x === b.x && c.x === d.x && a.x === c.x) {
    return Math.max(0, Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)));
  }
  return 0;
}

/**
 * Đường dây vuông góc đẹp nhất giữa hai chốt: thử thẳng, chữ L, chữ Z và vòng ra lề; chọn đường
 * không cắt thân dụng cụ, không đi sát chốt khác, không đè dây có sẵn, ít gấp khúc, ngắn.
 */
export function routeWire(spec: SchematicSpec, a: SchTerminal, b: SchTerminal, others: Pt[][] = []): Pt[] {
  const boxes = spec.parts.map(bodyBox);
  const foreign = terminalsOf(spec).filter((t) => t.id !== a.id && t.id !== b.id);
  const m = 26;
  const xs = [m, spec.width - m, Math.min(a.x, b.x) - 34, Math.max(a.x, b.x) + 34, (a.x + b.x) / 2];
  const ys = [m, spec.height - m, Math.min(a.y, b.y) - 34, Math.max(a.y, b.y) + 34, (a.y + b.y) / 2];
  const candidates: Pt[][] = [
    [a, { x: b.x, y: a.y }, b],
    [a, { x: a.x, y: b.y }, b],
    ...xs.map((x) => [a, { x, y: a.y }, { x, y: b.y }, b]),
    ...ys.map((y) => [a, { x: a.x, y }, { x: b.x, y }, b]),
  ];
  let best: Pt[] = [a, b];
  let bestScore = Infinity;
  for (const raw of candidates) {
    const pts = simplify(raw.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })));
    if (pts.length < 2) continue;
    let score = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      if (p.x !== q.x && p.y !== q.y) score += 5000; // chỉ nhận đoạn ngang/dọc
      for (const box of boxes) if (segHitsBox(p, q, box)) score += 1000;
      for (const t of foreign) if (distToSeg(t, p, q) < 9) score += 400;
      for (const o of others) for (let j = 0; j < o.length - 1; j++) score += 6 * overlapLen(p, q, o[j], o[j + 1]);
      score += Math.hypot(q.x - p.x, q.y - p.y) / 40;
    }
    score += (pts.length - 2) * 12;
    // Ưu tiên rời chốt theo hướng chân dây (ra ngoài thân dụng cụ) và đi vào chốt từ phía ngoài.
    const first = { x: Math.sign(pts[1].x - pts[0].x), y: Math.sign(pts[1].y - pts[0].y) };
    const last = { x: Math.sign(pts[pts.length - 1].x - pts[pts.length - 2].x), y: Math.sign(pts[pts.length - 1].y - pts[pts.length - 2].y) };
    const da = OUT_DIR[a.out], db = OUT_DIR[b.out];
    const dotA = first.x * da.x + first.y * da.y;
    const dotB = last.x * db.x + last.y * db.y;
    score += dotA < 0 ? 60 : dotA === 0 ? 10 : 0;
    score += dotB > 0 ? 60 : dotB === 0 ? 10 : 0;
    if (score < bestScore) { bestScore = score; best = pts; }
  }
  return best;
}

/** Đường gấp khúc bo góc (bán kính r) cho SVG. */
export function roundedPath(points: Pt[], r = 7): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i - 1], c = points[i], n = points[i + 1];
    const d1 = Math.hypot(c.x - p.x, c.y - p.y), d2 = Math.hypot(n.x - c.x, n.y - c.y);
    const k = Math.min(r, d1 / 2, d2 / 2);
    const a = { x: c.x + ((p.x - c.x) / d1) * k, y: c.y + ((p.y - c.y) / d1) * k };
    const b = { x: c.x + ((n.x - c.x) / d2) * k, y: c.y + ((n.y - c.y) / d2) * k };
    d += ` L${a.x} ${a.y} Q${c.x} ${c.y} ${b.x} ${b.y}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last.x} ${last.y}`;
}
