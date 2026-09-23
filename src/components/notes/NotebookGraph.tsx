"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, PenLine, RotateCcw, Sparkles, Undo2, Wand2 } from "lucide-react";
import { niceRange as niceRangeJs } from "../lab/LiveGraph.jsx";
import { fitLine, fmt, type ChartSpec, type Pt, type Series } from "./notebookData";

// Khoảng trục "đẹp" dùng chung với đồ thị trong Phòng Lab (LiveGraph.jsx là JS → khai kiểu ở đây).
type Range = { min: number; max: number; ticks: number[] };
const niceRange = niceRangeJs as unknown as (values: number[], opts?: { min?: number | null; max?: number | null; pad?: number; count?: number }) => Range;

/* ============================================================================
   NotebookGraph — đồ thị của Sổ Báo Cáo.
   • "Máy vẽ": điểm số liệu + đường khớp + phương trình, kéo dài tới trục tung khi cần đọc
     tung độ gốc (E của pin, v tức thời tại E…).
   • "Em tự vẽ": lưới giấy kẻ ô, di chuột thấy toạ độ; chấm lần lượt từng điểm (đúng → xanh,
     lệch → hiện chỗ đúng); chấm xong thì KÉO hai đầu một đường thẳng cho đi gần các điểm nhất,
     rồi so với đường máy tính.
   ========================================================================== */

type Mode = "auto" | "draw";
type Placed = { x: number; y: number; ok: boolean; tx: number; ty: number };
const M = { l: 62, r: 20, t: 30, b: 46 };
const TOL = 0.035; // dung sai chấm điểm: 3,5% bề rộng mỗi trục

function axisOf(spec: ChartSpec) {
  const xs: number[] = [], ys: number[] = [];
  spec.series.forEach((s) => {
    [...s.points, ...(s.extras || [])].forEach((p) => { xs.push(p.x); ys.push(p.y); });
    if (s.fit && s.extend) ys.push(s.fit.intercept);
  });
  if (spec.x.fromZero) xs.push(0);
  if (spec.y.fromZero) ys.push(0);
  const xr = niceRange(xs, { min: spec.x.fromZero ? 0 : null, pad: 0.1, count: 6 });
  const yr = niceRange(ys, { min: spec.y.fromZero ? 0 : null, pad: 0.12, count: 6 });
  return { xr, yr };
}

/** Phương trình đường thẳng dạng dễ đọc: "y = a·x" hoặc "y = b − a·x". */
function equation(spec: ChartSpec, slope: number, intercept: number, origin: boolean) {
  const x = spec.x.label, y = spec.y.label;
  const a = Math.abs(slope) >= 100 ? slope.toFixed(1) : Math.abs(slope) >= 1 ? slope.toFixed(3) : slope.toPrecision(3);
  if (origin) return `${y} = ${a}·${x}`;
  const sign = slope < 0 ? "−" : "+";
  const aa = Math.abs(slope) >= 100 ? Math.abs(slope).toFixed(1) : Math.abs(slope) >= 1 ? Math.abs(slope).toFixed(3) : Math.abs(slope).toPrecision(3);
  return `${y} = ${intercept.toFixed(3)} ${sign} ${aa}·${x}`;
}

/** Kích thước thật của khung chứa (ResizeObserver) → viewBox 1:1 pixel: chữ luôn ~11px, đồ thị lấp đầy khung. */
function useBoxSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ W: 640, H: 400 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width < 40 || height < 40) return;
      const W = Math.round(Math.max(240, width));
      const H = Math.round(Math.max(200, height));
      setSize((old) => (old.W === W && old.H === H ? old : { W, H }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export default function NotebookGraph({ spec, printable = false }: { spec: ChartSpec; printable?: boolean }) {
  const [mode, setMode] = useState<Mode>("auto");
  const drawable = spec.series.filter((s) => s.points.length >= 2);
  const [seriesId, setSeriesId] = useState<string>(drawable[0]?.id ?? "");
  const active = drawable.find((s) => s.id === seriesId) ?? drawable[0];

  const multi = spec.series.filter((s) => s.points.length || s.extras?.length).length > 1;
  if (printable) return <div className="w-full h-full flex flex-col gap-1">{multi && <SeriesChips spec={spec} />}<div className="flex-1 min-h-0"><GraphSvg spec={spec} /></div></div>;
  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-xl border border-[#E2DFD8] bg-[#FBF8F3] p-0.5">
          {([["auto", "Máy vẽ", Wand2], ["draw", "Em tự vẽ", PenLine]] as const).map(([m, label, Icon]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-lg text-[11.5px] font-black flex items-center gap-1 cursor-pointer transition-all ${mode === m ? "bg-white text-[#C85A17] shadow-[0_1px_4px_rgba(0,0,0,.08)]" : "text-[#8C7B6B] hover:text-[#605248]"}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
        {mode === "draw" && drawable.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10.5px] font-black text-[#8C7B6B]">Vẽ cho:</span>
            {drawable.map((s) => (
              <button key={s.id} onClick={() => setSeriesId(s.id)}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-black cursor-pointer ${s.id === active?.id ? "text-white" : "bg-white text-[#605248] border-[#E2DFD8]"}`}
                style={s.id === active?.id ? { background: s.color, borderColor: s.color } : undefined}>
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {mode === "auto" && multi && <SeriesChips spec={spec} />}
      <div className="flex-1 min-h-0">
        {mode === "auto" || !active
          ? <GraphSvg spec={spec} />
          : <DrawBoard key={`${active.id}-${active.points.length}`} spec={spec} series={active} />}
      </div>
    </div>
  );
}

/** Chú thích nhiều chuỗi kèm phương trình đường khớp (nằm ngoài khung vẽ). */
function SeriesChips({ spec }: { spec: ChartSpec }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {spec.series.filter((s) => s.points.length || s.extras?.length).map((s) => (
        <span key={s.id} className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-black bg-white" style={{ borderColor: `${s.color}66`, color: s.color }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
          {s.name}{s.fit ? <span className="font-mono font-bold">: {equation(spec, s.fit.slope, s.fit.intercept, s.fit.origin)}</span> : null}
        </span>
      ))}
    </div>
  );
}

/* ---------------- Khung vẽ dùng chung (trục, lưới giấy kẻ ô, chuỗi điểm) ---------------- */
function useAxes(spec: ChartSpec, W: number, H: number) {
  return useMemo(() => {
    const { xr, yr } = axisOf(spec);
    const cx = (v: number) => M.l + ((v - xr.min) / (xr.max - xr.min)) * (W - M.l - M.r);
    const cy = (v: number) => M.t + ((yr.max - v) / (yr.max - yr.min)) * (H - M.t - M.b);
    const ix = (px: number) => xr.min + ((px - M.l) / (W - M.l - M.r)) * (xr.max - xr.min);
    const iy = (py: number) => yr.max - ((py - M.t) / (H - M.t - M.b)) * (yr.max - yr.min);
    const stepX = xr.ticks.length > 1 ? xr.ticks[1] - xr.ticks[0] : (xr.max - xr.min) / 5;
    const stepY = yr.ticks.length > 1 ? yr.ticks[1] - yr.ticks[0] : (yr.max - yr.min) / 5;
    return { xr, yr, cx, cy, ix, iy, stepX, stepY, W, H };
  }, [spec, W, H]);
}
type Axes = ReturnType<typeof useAxes>;

const tickText = (v: number, step: number) => {
  const dp = Math.max(0, Math.min(4, -Math.floor(Math.log10(step) + 1e-9) + (step / 10 ** Math.floor(Math.log10(step) + 1e-9) === 2.5 ? 1 : 0)));
  return v.toFixed(dp);
};

function Paper({ spec, ax }: { spec: ChartSpec; ax: Axes }) {
  const { xr, yr, cx, cy, stepX, stepY, W, H } = ax;
  const minorX: number[] = [], minorY: number[] = [];
  for (let v = xr.min; v <= xr.max + 1e-9; v += stepX / 5) minorX.push(v);
  for (let v = yr.min; v <= yr.max + 1e-9; v += stepY / 5) minorY.push(v);
  return (
    <g>
      <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="#FFFDF8" />
      <path d={minorX.map((v) => `M${cx(v)} ${M.t}V${H - M.b}`).join("") + minorY.map((v) => `M${M.l} ${cy(v)}H${W - M.r}`).join("")} stroke="#F4ECDD" strokeWidth="1" />
      <path d={xr.ticks.map((v: number) => `M${cx(v)} ${M.t}V${H - M.b}`).join("") + yr.ticks.map((v: number) => `M${M.l} ${cy(v)}H${W - M.r}`).join("")} stroke="#E6D8BF" strokeWidth="1.1" />
      {xr.ticks.map((v: number) => <text key={`x${v}`} x={cx(v)} y={H - M.b + 16} textAnchor="middle" fontSize="11" fontWeight="800" fill="#8C7B6B">{tickText(v, stepX)}</text>)}
      {yr.ticks.map((v: number) => <text key={`y${v}`} x={M.l - 7} y={cy(v) + 3.8} textAnchor="end" fontSize="11" fontWeight="800" fill="#8C7B6B">{tickText(v, stepY)}</text>)}
      <line x1={M.l} y1={M.t - 8} x2={M.l} y2={H - M.b} stroke="#321E12" strokeWidth="1.8" />
      <line x1={M.l} y1={H - M.b} x2={W - M.r + 4} y2={H - M.b} stroke="#321E12" strokeWidth="1.8" />
      <path d={`M${M.l - 4.5} ${M.t - 4} L${M.l} ${M.t - 12} L${M.l + 4.5} ${M.t - 4}Z M${W - M.r} ${H - M.b - 4.5} L${W - M.r + 8} ${H - M.b} L${W - M.r} ${H - M.b + 4.5}Z`} fill="#321E12" />
      <text x={M.l + 8} y={M.t - 12} fontSize="13" fontWeight="900" fill="#321E12">{spec.y.label} <tspan fill="#8C7B6B" fontWeight="800">({spec.y.unit})</tspan></text>
      <text x={W - M.r} y={H - 8} textAnchor="end" fontSize="13" fontWeight="900" fill="#321E12">{spec.x.label} <tspan fill="#8C7B6B" fontWeight="800">({spec.x.unit})</tspan></text>
    </g>
  );
}

function Dot({ x, y, color, warn = false, big = false }: { x: number; y: number; color: string; warn?: boolean; big?: boolean }) {
  return <circle cx={x} cy={y} r={big ? 7 : 5.8} fill={color} stroke={warn ? "#DC2626" : "#fff"} strokeWidth={warn ? 2.6 : 2} />;
}
function Diamond({ x, y, color }: { x: number; y: number; color: string }) {
  return <path d={`M${x} ${y - 8}L${x + 8} ${y}L${x} ${y + 8}L${x - 8} ${y}Z`} fill="#fff" stroke={color} strokeWidth="2.6" />;
}

/* ---------------- Máy vẽ ---------------- */
function GraphSvg({ spec }: { spec: ChartSpec }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { W, H } = useBoxSize(boxRef);
  const ax = useAxes(spec, W, H);
  const { xr, cx, cy } = ax;
  const hasData = spec.series.some((s) => s.points.length || s.extras?.length);
  const singleFit = spec.series.filter((s) => s.fit).length === 1;
  return (
    <div ref={boxRef} className="w-full h-full min-h-0">
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Đồ thị ${spec.y.label} theo ${spec.x.label}`}
      className="w-full h-full block select-none" style={{ fontFamily: "Nunito, sans-serif" }}>
      <Paper spec={spec} ax={ax} />
      {spec.series.map((s) => {
        if (!s.fit) return null;
        const xsData = s.points.map((p) => p.x);
        const x0 = Math.min(...xsData), x1 = Math.max(...xsData);
        const from = s.extend || s.fit.origin ? xr.min : x0;
        const to = Math.min(xr.max, x1 + (x1 - x0 || xr.max) * 0.12);
        const y = (v: number) => s.fit!.intercept + s.fit!.slope * v;
        const eq = equation(spec, s.fit.slope, s.fit.intercept, s.fit.origin);
        const ex = cx(to), ey = cy(y(to));
        const pillW = eq.length * 6.5 + 18;
        const left = Math.min(W - M.r - pillW - 2, Math.max(M.l + 4, ex - pillW));
        const top = ey - 30 < M.t + 14 ? ey + 12 : ey - 30;
        return (
          <g key={`fit-${s.id}`}>
            {(s.extend || s.fit.origin) && x0 > xr.min && <line x1={cx(from)} y1={cy(y(from))} x2={cx(x0)} y2={cy(y(x0))} stroke={s.color} strokeWidth="2.2" strokeDasharray="7 6" opacity=".85" />}
            <line x1={cx(s.extend || s.fit.origin ? x0 : from)} y1={cy(y(s.extend || s.fit.origin ? x0 : from))} x2={ex} y2={ey} stroke={s.color} strokeWidth="3" strokeLinecap="round" />
            {singleFit && (
              <g>
                <rect x={left} y={top} width={pillW} height="20" rx="10" fill="#fff" stroke={s.color} strokeWidth="1.5" />
                <text x={left + pillW / 2} y={top + 14} textAnchor="middle" fontSize="11.5" fontWeight="900" fill={s.color}>{eq}</text>
              </g>
            )}
            {s.extend && (
              <g>
                <circle cx={cx(xr.min)} cy={cy(y(xr.min))} r="7.5" fill="#fff" stroke={s.color} strokeWidth="3" />
                <circle cx={cx(xr.min)} cy={cy(y(xr.min))} r="2.6" fill={s.color} />
              </g>
            )}
          </g>
        );
      })}
      {spec.series.map((s) => (
        <g key={`pts-${s.id}`}>
          {s.points.map((p: Pt) => <Dot key={p.key} x={cx(p.x)} y={cy(p.y)} color={s.color} warn={p.warn} />)}
          {(s.extras || []).map((p: Pt) => <Diamond key={p.key} x={cx(p.x)} y={cy(p.y)} color={s.color} />)}
        </g>
      ))}
      {!hasData && <text x={(M.l + W - M.r) / 2} y={(M.t + H - M.b) / 2} textAnchor="middle" fontSize="14" fontWeight="800" fill="#8C7B6B">Chưa có số liệu để vẽ</text>}
    </svg>
    </div>
  );
}

/* ---------------- Em tự vẽ: chấm điểm → kẻ đường → so với máy ---------------- */
function DrawBoard({ spec, series }: { spec: ChartSpec; series: Series }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { W, H } = useBoxSize(boxRef);
  const ax = useAxes(spec, W, H);
  const { xr, yr, cx, cy, ix, iy, stepX, stepY } = ax;
  const svgRef = useRef<SVGSVGElement>(null);
  const targets = useMemo(() => [...series.points].sort((a, b) => a.x - b.x), [series]);
  const origin = spec.fitKind === "origin";
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [handles, setHandles] = useState<{ y0: number; y1: number } | null>(null);
  const [drag, setDrag] = useState<0 | 1 | null>(null);
  const [reveal, setReveal] = useState(false);
  const phase = placed.length < targets.length ? "points" : "line";
  const hx0 = origin ? 0 : xr.min, hx1 = xr.min + (xr.max - xr.min) * 0.94;
  const lineNow = handles ?? { y0: origin ? 0 : (yr.min + yr.max) / 2, y1: (yr.min + yr.max) / 2 };
  const slope = (lineNow.y1 - lineNow.y0) / (hx1 - hx0);
  const intercept = lineNow.y0 - slope * hx0;
  const machine = fitLine(targets, origin);
  const okCount = placed.filter((p) => p.ok).length;

  const toData = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const scale = Math.min(r.width / W, r.height / H);
    const px = (e.clientX - r.left - (r.width - W * scale) / 2) / scale;
    const py = (e.clientY - r.top - (r.height - H * scale) / 2) / scale;
    return { px, py, inside: px >= M.l && px <= W - M.r && py >= M.t && py <= H - M.b };
  };
  const snap = (v: number, step: number) => Math.round(v / (step / 10)) * (step / 10);

  const onMove = (e: React.PointerEvent) => {
    const p = toData(e);
    if (!p) return;
    if (drag !== null) {
      const v = Math.max(yr.min, Math.min(yr.max, iy(p.py)));
      setHandles((h) => ({ ...(h ?? lineNow), [drag === 0 ? "y0" : "y1"]: v }));
      return;
    }
    setHover(p.inside && phase === "points" ? { x: snap(ix(p.px), stepX), y: snap(iy(p.py), stepY) } : null);
  };
  const onClick = (e: React.PointerEvent) => {
    if (phase !== "points") return;
    const p = toData(e);
    if (!p || !p.inside) return;
    const t = targets[placed.length];
    const x = snap(ix(p.px), stepX), y = snap(iy(p.py), stepY);
    const ok = Math.abs(x - t.x) <= TOL * (xr.max - xr.min) && Math.abs(y - t.y) <= TOL * (yr.max - yr.min);
    setPlaced((old) => [...old, ok ? { x: t.x, y: t.y, ok, tx: t.x, ty: t.y } : { x, y, ok, tx: t.x, ty: t.y }]);
  };
  const startDrag = (which: 0 | 1) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    if (!handles) setHandles(lineNow);
    setDrag(which);
  };
  const reset = () => { setPlaced([]); setHandles(null); setReveal(false); };
  const next = targets[placed.length];
  const slopeDiff = machine ? Math.abs(slope - machine.slope) / Math.max(1e-12, Math.abs(machine.slope)) : null;
  const studentResult = spec.explain({ ...series, fit: { slope, intercept, r2: 0, origin, n: placed.length } }).find((r) => r.strong);

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      <div className="flex items-center gap-2 flex-wrap text-[11.5px] font-bold text-[#605248]">
        {phase === "points" ? (
          <span className="flex-1 min-w-0">
            Chấm điểm <b className="text-[#321E12]">{placed.length + 1}/{targets.length}</b>:{" "}
            <b className="font-mono text-[#C85A17]">({fmt(next.x, spec.x.dp)}; {fmt(next.y, spec.y.dp)})</b> — rê chuột xem toạ độ, bấm để chấm.
          </span>
        ) : (
          <span className="flex-1 min-w-0">
            ✓ Chấm xong <b className="text-[#321E12]">{okCount}/{targets.length}</b> điểm đúng. Giờ <b className="text-[#C85A17]">kéo {origin ? "đầu tròn bên phải" : "hai đầu tròn"}</b> để đường thẳng đi sát các điểm nhất.
          </span>
        )}
        <button onClick={() => setPlaced((p) => p.slice(0, -1))} disabled={!placed.length || phase === "line" && !!handles}
          className="px-2 py-1 rounded-lg border border-[#E2DFD8] bg-white text-[11px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-40"><Undo2 className="w-3 h-3" /> Hoàn tác</button>
        <button onClick={reset} className="px-2 py-1 rounded-lg border border-[#E2DFD8] bg-white text-[11px] font-black flex items-center gap-1 cursor-pointer"><RotateCcw className="w-3 h-3" /> Vẽ lại</button>
      </div>

      <div ref={boxRef} className="flex-1 min-h-0">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full block select-none touch-none"
          style={{ fontFamily: "Nunito, sans-serif", cursor: phase === "points" ? "crosshair" : "default" }}
          onPointerMove={onMove} onPointerLeave={() => setHover(null)} onPointerUp={() => setDrag(null)} onPointerDown={onClick}>
          <Paper spec={spec} ax={ax} />
          {/* điểm đã chấm */}
          {placed.map((p, i) => (
            <g key={i}>
              {!p.ok && (
                <g>
                  <line x1={cx(p.x)} y1={cy(p.y)} x2={cx(p.tx)} y2={cy(p.ty)} stroke="#DC2626" strokeDasharray="3 3" strokeWidth="1.4" />
                  <circle cx={cx(p.tx)} cy={cy(p.ty)} r="7" fill="none" stroke="#16A34A" strokeWidth="2" strokeDasharray="3 2" />
                </g>
              )}
              <circle cx={cx(p.x)} cy={cy(p.y)} r="6" fill={p.ok ? "#16A34A" : "#DC2626"} stroke="#fff" strokeWidth="2" />
              <text x={cx(p.x) + 9} y={cy(p.y) - 8} fontSize="10.5" fontWeight="900" fill={p.ok ? "#15803D" : "#B91C1C"}>{i + 1}</text>
            </g>
          ))}
          {/* con trỏ + toạ độ */}
          {hover && phase === "points" && (
            <g style={{ pointerEvents: "none" }}>
              <line x1={cx(hover.x)} y1={cy(hover.y)} x2={cx(hover.x)} y2={H - M.b} stroke="#C85A17" strokeDasharray="4 3" />
              <line x1={M.l} y1={cy(hover.y)} x2={cx(hover.x)} y2={cy(hover.y)} stroke="#C85A17" strokeDasharray="4 3" />
              <circle cx={cx(hover.x)} cy={cy(hover.y)} r="5" fill="none" stroke="#C85A17" strokeWidth="2" />
              {(() => {
                const label = `(${fmt(hover.x, spec.x.dp)}; ${fmt(hover.y, spec.y.dp)})`;
                const w = label.length * 6.6 + 14;
                const left = cx(hover.x) + w + 14 > W - M.r ? cx(hover.x) - w - 10 : cx(hover.x) + 10;
                return (
                  <g>
                    <rect x={left} y={cy(hover.y) - 26} width={w} height="19" rx="9.5" fill="#321E12" />
                    <text x={left + w / 2} y={cy(hover.y) - 12.5} textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">{label}</text>
                  </g>
                );
              })()}
            </g>
          )}
          {/* đường em kẻ */}
          {phase === "line" && (
            <g>
              {reveal && machine && (
                <line x1={cx(xr.min)} y1={cy(machine.intercept + machine.slope * xr.min)} x2={cx(xr.max)} y2={cy(machine.intercept + machine.slope * xr.max)}
                  stroke="#16A34A" strokeWidth="2.2" strokeDasharray="8 6" />
              )}
              <line x1={cx(hx0)} y1={cy(lineNow.y0)} x2={cx(hx1)} y2={cy(lineNow.y1)} stroke={series.color} strokeWidth="3.2" strokeLinecap="round" />
              {[0, 1].map((k) => {
                if (k === 0 && origin) return <circle key={k} cx={cx(0)} cy={cy(0)} r="5" fill={series.color} />;
                const hx = k === 0 ? hx0 : hx1, hy = k === 0 ? lineNow.y0 : lineNow.y1;
                return (
                  <g key={k} onPointerDown={startDrag(k as 0 | 1)} style={{ cursor: "ns-resize" }}>
                    <circle cx={cx(hx)} cy={cy(hy)} r="18" fill="transparent" />
                    <circle cx={cx(hx)} cy={cy(hy)} r="10" fill="#fff" stroke={series.color} strokeWidth="3.2" />
                    <path d={`M${cx(hx) - 3.5} ${cy(hy) - 2}l3.5 -3.5l3.5 3.5M${cx(hx) - 3.5} ${cy(hy) + 2}l3.5 3.5l3.5 -3.5`} fill="none" stroke={series.color} strokeWidth="1.6" strokeLinecap="round" />
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {phase === "line" && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-[#EDE3D2] bg-[#FFFBF6] px-3 py-2 text-[11.5px] font-bold text-[#605248]">
          <span>Đường của em: <b className="font-mono text-[#321E12]">{equation(spec, slope, intercept, origin)}</b></span>
          {studentResult && <span>→ <b className="text-[#C85A17]">{studentResult.label}: {studentResult.value}</b></span>}
          {!reveal ? (
            <button onClick={() => setReveal(true)} className="ml-auto px-2.5 py-1 rounded-lg bg-[#16A34A] text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"><Eye className="w-3 h-3" /> So với máy</button>
          ) : machine && slopeDiff != null && (
            <span className={`ml-auto flex items-center gap-1 font-black ${slopeDiff < 0.03 ? "text-[#15803D]" : slopeDiff < 0.1 ? "text-[#B45309]" : "text-[#B91C1C]"}`}>
              {slopeDiff < 0.03 ? <Sparkles className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              Độ dốc lệch máy {fmt(slopeDiff * 100, 1)}%{slopeDiff < 0.03 ? " — kẻ rất chuẩn!" : slopeDiff < 0.1 ? " — khá sát" : " — thử kéo lại"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
