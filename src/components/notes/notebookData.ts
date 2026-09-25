/**
 * notebookData — biến số liệu Phòng Lab thành những gì Sổ Báo Cáo cần vẽ và tóm tắt
 * (logic thuần, không React): chuỗi điểm cho đồ thị, đường khớp (qua gốc hoặc tổng quát),
 * thống kê kết quả từng lần đo (trung bình, độ lệch, sai số tương đối).
 */
import type { RichTrial } from "@/lib/types";

export type Pt = { x: number; y: number; key: string; warn?: boolean };
export type Fit = { slope: number; intercept: number; r2: number; origin: boolean; n: number };
export type Series = {
  id: string;
  name: string;
  color: string;
  points: Pt[];
  /** Điểm phụ (vd Bài 6: tốc độ tức thời đo trực tiếp, đặt ở sEF = 0). */
  extras?: Pt[];
  fit: Fit | null;
  /** Kéo dài đường khớp tới x = 0 để đọc tung độ gốc (E, v tức thời…). */
  extend?: boolean;
};
export type ChartSpec = {
  /** Bài có nhiều đồ thị (Bài 15: Hình 15.3a/b): khoá + tên ngắn để chọn. */
  key?: string;
  title?: string;
  x: { label: string; unit: string; fromZero: boolean; dp: number };
  y: { label: string; unit: string; fromZero: boolean; dp: number };
  relation: string;               // LaTeX quan hệ lý thuyết
  fitKind: "origin" | "line";
  series: Series[];
  /** Diễn giải độ dốc / tung độ gốc thành đại lượng cần tìm. */
  explain: (s: Series) => Array<{ label: string; value: string; strong?: boolean }>;
};

export const SERIES_COLORS = ["#DF742E", "#2563EB", "#16A34A", "#DB2777", "#7C3AED", "#0891B2"];
export const G_REF = 9.8;

/** Bình phương tối thiểu y = a + b·x (hoặc y = b·x nếu origin). */
export function fitLine(points: Array<{ x: number; y: number }>, origin = false): Fit | null {
  const n = points.length;
  if (n < 2) return null;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  if (new Set(xs.map((v) => v.toFixed(9))).size < (origin ? 1 : 2)) return null;
  let slope: number, intercept: number;
  if (origin) {
    const sxx = xs.reduce((s, x) => s + x * x, 0);
    if (sxx < 1e-15) return null;
    slope = xs.reduce((s, x, i) => s + x * ys[i], 0) / sxx;
    intercept = 0;
  } else {
    const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxx = 0, sxy = 0;
    xs.forEach((x, i) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (ys[i] - my); });
    if (sxx < 1e-15) return null;
    slope = sxy / sxx;
    intercept = my - slope * mx;
  }
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  const ssRes = xs.reduce((s, x, i) => s + (ys[i] - (intercept + slope * x)) ** 2, 0);
  const r2 = ssTot > 1e-18 ? Math.max(0, 1 - ssRes / ssTot) : 1;
  return { slope, intercept, r2, origin, n };
}

export function stats(values: number[]) {
  const v = values.filter(Number.isFinite);
  const n = v.length;
  if (!n) return null;
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;
  return { n, mean, sd, min: Math.min(...v), max: Math.max(...v), halfRange: n > 1 ? (Math.max(...v) - Math.min(...v)) / 2 : 0 };
}

export const fmt = (v: number | null | undefined, dp: number) => (v == null || !Number.isFinite(v) ? "—" : v.toFixed(dp));
const flagged = (t: RichTrial) => t.balanced === false || t.steady === false;

/** Gia tốc a = 2s/t² của một lần đo Bài 15. */
const accelOf = (t: RichTrial) => (t.t > 0 ? (2 * t.s) / (t.t * t.t) : 0);
const near = (a: number | undefined, b: number, tol = 1e-6) => a != null && Math.abs(a - b) < tol;

/** Mọi đồ thị của một bài (phần lớn bài có một; Bài 15 có ba: Hình 15.3a, 15.3b và a theo F/(M + m)). */
export function buildCharts(lessonId: string, trials: RichTrial[]): ChartSpec[] {
  if (lessonId === "dinh-luat-2-newton") {
    const rows = trials.filter((t) => t.lab === "newton2" && t.t > 0 && (t.force ?? 0) > 0 && (t.mass ?? 0) > 0);
    const ptsF = rows.filter((t) => near(t.mass, 0.5)).map((t, i) => ({ x: t.force!, y: accelOf(t), key: `aF-${i}`, warn: flagged(t) }));
    const ptsM = rows.filter((t) => near(t.force, 1)).map((t, i) => ({ x: 1 / t.mass!, y: accelOf(t), key: `aM-${i}`, warn: flagged(t) }));
    const ptsAll = rows.map((t, i) => ({ x: t.force! / t.mass!, y: accelOf(t), key: `all-${i}`, warn: flagged(t) }));
    return [
      {
        key: "aF", title: "a theo F (M + m = 0,5 kg)",
        x: { label: "F", unit: "N", fromZero: true, dp: 2 },
        y: { label: "a", unit: "m/s²", fromZero: true, dp: 2 },
        relation: "a = \\dfrac{1}{M + m}\\,F",
        fitKind: "origin",
        series: [{ id: "n2-aF", name: "M + m = 0,5 kg", color: SERIES_COLORS[1], points: ptsF, fit: fitLine(ptsF, true) }],
        explain: (s) => s.fit ? [
          { label: "Độ dốc k", value: `${fmt(s.fit.slope, 2)} kg⁻¹` },
          { label: "1/k", value: `${fmt(1 / s.fit.slope, 3)} kg`, strong: true },
          { label: "So với M + m = 0,5 kg", value: `lệch ${fmt((Math.abs(1 / s.fit.slope - 0.5) / 0.5) * 100, 1)} %` },
        ] : [],
      },
      {
        key: "aM", title: "a theo 1/(M + m) (F = 1 N)",
        x: { label: "1/(M+m)", unit: "kg⁻¹", fromZero: true, dp: 2 },
        y: { label: "a", unit: "m/s²", fromZero: true, dp: 2 },
        relation: "a = F\\cdot\\dfrac{1}{M + m}",
        fitKind: "origin",
        series: [{ id: "n2-aM", name: "F = 1 N", color: SERIES_COLORS[0], points: ptsM, fit: fitLine(ptsM, true) }],
        explain: (s) => s.fit ? [
          { label: "Độ dốc k", value: `${fmt(s.fit.slope, 3)} N`, strong: true },
          { label: "So với F = 1 N", value: `lệch ${fmt(Math.abs(s.fit.slope - 1) * 100, 1)} %` },
          { label: "R²", value: fmt(s.fit.r2, 4) },
        ] : [],
      },
      {
        key: "aAll", title: "a theo F/(M + m) (mọi lần đo)",
        x: { label: "F/(M+m)", unit: "m/s²", fromZero: true, dp: 2 },
        y: { label: "a", unit: "m/s²", fromZero: true, dp: 2 },
        relation: "a = \\dfrac{F}{M + m}",
        fitKind: "origin",
        series: [{ id: "n2-all", name: "Mọi lần đo", color: SERIES_COLORS[2], points: ptsAll, fit: fitLine(ptsAll, true) }],
        explain: (s) => s.fit ? [
          { label: "Độ dốc", value: fmt(s.fit.slope, 3), strong: true },
          { label: "Lí thuyết", value: "1 (a = F/m)" },
          { label: "R²", value: fmt(s.fit.r2, 4) },
        ] : [],
      },
    ];
  }
  const one = buildChart(lessonId, trials);
  return one ? [one] : [];
}

/** Đồ thị + cách đọc kết quả cho từng bài (bài có nhiều đồ thị: đồ thị đầu tiên). */
export function buildChart(lessonId: string, trials: RichTrial[]): ChartSpec | null {
  if (lessonId === "dinh-luat-2-newton") return buildCharts(lessonId, trials)[0] ?? null;
  if (lessonId === "do-gia-toc-roi-tu-do") {
    const pts = trials.filter((t) => t.lab === "freefall" && t.t > 0)
      .map((t, i) => ({ x: t.t * t.t, y: t.s, key: `ff-${i}`, warn: flagged(t) }));
    return {
      x: { label: "t²", unit: "s²", fromZero: true, dp: 4 },
      y: { label: "s", unit: "m", fromZero: true, dp: 3 },
      relation: "s = \\tfrac{1}{2}g\\,t^2",
      fitKind: "origin",
      series: [{ id: "ff", name: "s theo t²", color: SERIES_COLORS[0], points: pts, fit: fitLine(pts, true) }],
      explain: (s) => s.fit ? [
        { label: "Độ dốc k", value: `${fmt(s.fit.slope, 3)} m/s²` },
        { label: "g = 2k", value: `${fmt(2 * s.fit.slope, 2)} m/s²`, strong: true },
        { label: "Lệch so với 9,8", value: `${fmt((Math.abs(2 * s.fit.slope - G_REF) / G_REF) * 100, 1)} %` },
      ] : [],
    };
  }
  if (lessonId === "do-toc-do-vat-chuyen-dong") {
    const thetas = [...new Set(trials.filter((t) => (t.lab === "average" || t.lab === "instant") && t.t > 0).map((t) => t.theta ?? 0))].sort((a, b) => a - b);
    const series: Series[] = thetas.map((th, i) => {
      const pts = trials.filter((t) => t.lab === "average" && t.t > 0 && (t.theta ?? 0) === th)
        .map((t, j) => ({ x: t.s, y: t.s / t.t, key: `avg-${th}-${j}`, warn: flagged(t) }));
      const extras = trials.filter((t) => t.lab === "instant" && t.t > 0 && (t.theta ?? 0) === th)
        .map((t, j) => ({ x: 0, y: t.s / t.t, key: `inst-${th}-${j}`, warn: flagged(t) }));
      return { id: `th-${th}`, name: `θ = ${th}°`, color: SERIES_COLORS[i % SERIES_COLORS.length], points: pts, extras, fit: fitLine(pts), extend: true };
    });
    return {
      x: { label: "s_EF", unit: "m", fromZero: true, dp: 2 },
      y: { label: "v", unit: "m/s", fromZero: true, dp: 3 },
      relation: "v_{tb} = \\dfrac{s_{EF}}{t}",
      fitKind: "line",
      series,
      explain: (s) => {
        const inst = stats((s.extras || []).map((p) => p.y));
        const out: Array<{ label: string; value: string; strong?: boolean }> = [];
        if (s.fit) out.push({ label: "v tại E (sEF → 0)", value: `${fmt(s.fit.intercept, 3)} m/s`, strong: true });
        if (inst) out.push({ label: "v tức thời đo (MODE A)", value: `${fmt(inst.mean, 3)} m/s` });
        if (s.fit && inst) out.push({ label: "Hai cách lệch nhau", value: `${fmt((Math.abs(s.fit.intercept - inst.mean) / inst.mean) * 100, 1)} %` });
        return out;
      },
    };
  }
  if (lessonId === "do-dien-tro-dinh-luat-ohm") {
    const mats = (["X", "Y"] as const).filter((m) => trials.some((t) => t.lab === `ohm-${m.toLowerCase()}`));
    const series: Series[] = mats.map((m) => {
      const pts = trials.filter((t) => t.lab === `ohm-${m.toLowerCase()}` && (t.current ?? t.t) > 0)
        .map((t, j) => ({ x: t.voltage ?? t.s, y: (t.current ?? t.t) * 1000, key: `${m}-${j}` }));
      return { id: `ohm-${m}`, name: `Vật dẫn ${m}`, color: m === "X" ? "#2563EB" : "#DC2626", points: pts, fit: fitLine(pts, true) };
    });
    return {
      x: { label: "U", unit: "V", fromZero: true, dp: 2 },
      y: { label: "I", unit: "mA", fromZero: true, dp: 1 },
      relation: "I = \\dfrac{U}{R}",
      fitKind: "origin",
      series,
      explain: (s) => s.fit ? [
        { label: "Độ dốc I/U", value: `${fmt(s.fit.slope, 3)} mA/V` },
        { label: `R = 1/độ dốc`, value: `${fmt(1000 / s.fit.slope, 1)} Ω`, strong: true },
        { label: "R²", value: fmt(s.fit.r2, 4) },
      ] : [],
    };
  }
  if (lessonId === "do-suat-dien-dong-pin-dien-hoa") {
    const cells = (["new", "old"] as const).filter((c) => trials.some((t) => t.lab === "emf" && t.cell === c));
    const series: Series[] = cells.map((c) => {
      const pts = trials.filter((t) => t.lab === "emf" && t.cell === c && (t.current ?? 0) > 0)
        .map((t, j) => ({ x: (t.current ?? 0) * 1000, y: t.voltage ?? 0, key: `${c}-${j}` }));
      return { id: `emf-${c}`, name: c === "new" ? "Pin mới" : "Pin cũ", color: c === "new" ? "#2563EB" : "#64748B", points: pts, fit: fitLine(pts), extend: true };
    });
    return {
      x: { label: "I", unit: "mA", fromZero: true, dp: 1 },
      y: { label: "U", unit: "V", fromZero: false, dp: 3 },
      relation: "U = \\mathcal{E} - I\\,r",
      fitKind: "line",
      series,
      explain: (s) => s.fit ? [
        { label: "E (cắt trục U)", value: `${fmt(s.fit.intercept, 3)} V`, strong: true },
        { label: "r = −độ dốc", value: `${fmt(-s.fit.slope * 1000, 2)} Ω`, strong: true },
        { label: "R²", value: fmt(s.fit.r2, 4) },
      ] : [],
    };
  }
  return null;
}

/** Cột số liệu hiển thị cho từng mẫu (tên, đơn vị, cách lấy giá trị, số chữ số). */
export type Column = { key: string; label: string; unit: string; get: (t: RichTrial) => number | string | null; dp?: number };
export function columnsFor(lab: RichTrial["lab"]): Column[] {
  switch (lab) {
    case "average": return [
      { key: "theta", label: "θ", unit: "°", get: (t) => t.theta ?? null, dp: 0 },
      { key: "s", label: "s_EF", unit: "m", get: (t) => t.s, dp: 3 },
      { key: "t", label: "t", unit: "s", get: (t) => t.t, dp: 4 },
    ];
    case "instant": return [
      { key: "theta", label: "θ", unit: "°", get: (t) => t.theta ?? null, dp: 0 },
      { key: "d", label: "d", unit: "mm", get: (t) => t.s * 1000, dp: 2 },
      { key: "t", label: "t", unit: "s", get: (t) => t.t, dp: 4 },
    ];
    case "freefall": return [
      { key: "s", label: "s", unit: "m", get: (t) => t.s, dp: 3 },
      { key: "t", label: "t", unit: "s", get: (t) => t.t, dp: 4 },
      { key: "t2", label: "t²", unit: "s²", get: (t) => t.t * t.t, dp: 5 },
    ];
    case "ohm-x":
    case "ohm-y": return [
      { key: "u", label: "U", unit: "V", get: (t) => t.voltage ?? t.s, dp: 3 },
      { key: "i", label: "I", unit: "mA", get: (t) => (t.current ?? t.t) * 1000, dp: 1 },
    ];
    case "emf": return [
      { key: "r", label: "R", unit: "Ω", get: (t) => t.resistance ?? t.config ?? null, dp: 0 },
      { key: "i", label: "I", unit: "mA", get: (t) => (t.current ?? 0) * 1000, dp: 1 },
      { key: "u", label: "U", unit: "V", get: (t) => t.voltage ?? 0, dp: 3 },
    ];
    case "newton2": return [
      { key: "f", label: "F", unit: "N", get: (t) => t.force ?? null, dp: 1 },
      { key: "m", label: "M + m", unit: "kg", get: (t) => t.mass ?? null, dp: 2 },
      { key: "t", label: "t", unit: "s", get: (t) => t.t, dp: 3 },
    ];
    default: return [];
  }
}
