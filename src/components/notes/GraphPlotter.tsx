"use client";

import React, { useMemo, useRef, useState } from "react";
import { Eraser, CheckCircle2, PenTool } from "lucide-react";
import { bandScore } from "@/lib/grading";

export interface DataPoint { x: number; y: number }

interface GraphPlotterProps {
  data: DataPoint[];      // các điểm số liệu THẬT (để đối chiếu khi chấm)
  xLabel: string;
  yLabel: string;
  onScored?: (score: number) => void;
}

const W = 520, H = 360, PAD = 46;

/**
 * GraphPlotter — HỌC SINH TỰ VẼ đồ thị: bấm để đặt từng điểm.
 * Chấm (theo PDF): so khớp điểm HS vẽ với điểm số liệu + hồi quy tuyến tính (R²).
 */
export default function GraphPlotter({ data, xLabel, yLabel, onScored }: GraphPlotterProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [points, setPoints] = useState<DataPoint[]>([]);
  const [scored, setScored] = useState<null | { accuracy: number; r2: number; score: number }>(null);

  const bounds = useMemo(() => {
    const xs = data.map((d) => d.x); const ys = data.map((d) => d.y);
    const xmax = Math.max(0.0001, ...xs) * 1.15;
    const ymax = Math.max(0.0001, ...ys) * 1.15;
    return { xmax, ymax };
  }, [data]);

  const toPx = (p: DataPoint) => ({
    px: PAD + (p.x / bounds.xmax) * (W - 2 * PAD),
    py: H - PAD - (p.y / bounds.ymax) * (H - 2 * PAD),
  });
  const toData = (px: number, py: number): DataPoint => ({
    x: ((px - PAD) / (W - 2 * PAD)) * bounds.xmax,
    y: ((H - PAD - py) / (H - 2 * PAD)) * bounds.ymax,
  });

  const handleClick = (e: React.MouseEvent) => {
    if (scored) return;
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const py = ((e.clientY - r.top) / r.height) * H;
    if (px < PAD || px > W - PAD || py < PAD || py > H - PAD) return;
    setPoints((p) => (p.length >= data.length ? p : [...p, toData(px, py)]));
  };

  const grade = () => {
    if (points.length < 2) return;
    // Hồi quy tuyến tính trên điểm HS vẽ → R².
    const n = points.length;
    const mx = points.reduce((a, p) => a + p.x, 0) / n;
    const my = points.reduce((a, p) => a + p.y, 0) / n;
    let sxx = 0, sxy = 0, syy = 0;
    for (const p of points) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); syy += (p.y - my) ** 2; }
    const slope = sxx ? sxy / sxx : 0;
    const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 0;

    // Khớp điểm HS với điểm số liệu (ghép gần nhất theo thứ tự x).
    const sd = [...data].sort((a, b) => a.x - b.x);
    const sp = [...points].sort((a, b) => a.x - b.x);
    let err = 0; const m = Math.min(sd.length, sp.length);
    for (let i = 0; i < m; i++) {
      const dx = (sd[i].x - sp[i].x) / bounds.xmax;
      const dy = (sd[i].y - sp[i].y) / bounds.ymax;
      err += Math.hypot(dx, dy);
    }
    const meanErr = m ? err / m : 1;
    const accuracy = Math.max(0, 100 - meanErr * 100 * 1.5);
    // Điểm đồ thị: 70% độ khớp điểm + 30% độ thẳng (R²).
    const score = Math.round((bandScore(accuracy) * 0.7 + Math.min(10, r2 * 10) * 0.3) * 10) / 10;
    setScored({ accuracy: Math.round(accuracy), r2: Math.round(r2 * 1000) / 1000, score });
    onScored?.(score);
  };

  const reset = () => { setPoints([]); setScored(null); };

  // Đường hồi quy khi đã chấm.
  let fitLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (scored && points.length >= 2) {
    const n = points.length;
    const mx = points.reduce((a, p) => a + p.x, 0) / n;
    const my = points.reduce((a, p) => a + p.y, 0) / n;
    let sxx = 0, sxy = 0;
    for (const p of points) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); }
    const slope = sxx ? sxy / sxx : 0; const intercept = my - slope * mx;
    const a = toPx({ x: 0, y: intercept });
    const b = toPx({ x: bounds.xmax, y: slope * bounds.xmax + intercept });
    fitLine = { x1: a.px, y1: a.py, x2: b.px, y2: b.py };
  }

  const ticks = 5;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] font-bold text-[#605248] flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-[#C85A17]" />
          Bấm vào lưới để tự vẽ {data.length} điểm ({points.length}/{data.length})
        </p>
        <div className="flex gap-2">
          <button onClick={reset} className="px-3 py-1.5 bg-white border border-[#E2DFD8] text-[#605248] text-[10px] font-black rounded-lg hover:bg-[#FFF0E0] flex items-center gap-1 cursor-pointer">
            <Eraser className="w-3 h-3" /> Xóa
          </button>
          <button
            onClick={grade}
            disabled={points.length < 2 || !!scored}
            className="px-3 py-1.5 bg-[#C85A17] disabled:opacity-40 text-white text-[10px] font-black rounded-lg cursor-pointer flex items-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3" /> Chấm đồ thị
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full bg-white border border-[#E2DFD8] rounded-xl cursor-crosshair select-none"
        onClick={handleClick}
      >
        {/* Lưới + trục */}
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const gx = PAD + (i / ticks) * (W - 2 * PAD);
          const gy = H - PAD - (i / ticks) * (H - 2 * PAD);
          return (
            <g key={i}>
              <line x1={gx} y1={PAD} x2={gx} y2={H - PAD} stroke="#EFEAE2" strokeWidth={1} />
              <line x1={PAD} y1={gy} x2={W - PAD} y2={gy} stroke="#EFEAE2" strokeWidth={1} />
              <text x={gx} y={H - PAD + 14} fontSize={8} fill="#8a7d70" textAnchor="middle">{((i / ticks) * bounds.xmax).toFixed(2)}</text>
              <text x={PAD - 6} y={gy + 3} fontSize={8} fill="#8a7d70" textAnchor="end">{((i / ticks) * bounds.ymax).toFixed(2)}</text>
            </g>
          );
        })}
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#321E12" strokeWidth={1.5} />
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#321E12" strokeWidth={1.5} />
        <text x={W / 2} y={H - 6} fontSize={10} fill="#321E12" textAnchor="middle" fontWeight="bold">{xLabel}</text>
        <text x={12} y={H / 2} fontSize={10} fill="#321E12" textAnchor="middle" fontWeight="bold" transform={`rotate(-90 12 ${H / 2})`}>{yLabel}</text>

        {/* Sau khi chấm: hiện điểm số liệu thật (xanh) để đối chiếu + đường hồi quy */}
        {scored && data.map((d, i) => { const p = toPx(d); return <circle key={"d" + i} cx={p.px} cy={p.py} r={5} fill="none" stroke="#137333" strokeWidth={1.6} />; })}
        {fitLine && <line x1={fitLine.x1} y1={fitLine.y1} x2={fitLine.x2} y2={fitLine.y2} stroke="#C85A17" strokeWidth={1.6} strokeDasharray="5 4" />}

        {/* Điểm HS vẽ (cam) */}
        {points.map((p, i) => { const q = toPx(p); return <circle key={"p" + i} cx={q.px} cy={q.py} r={4.5} fill="#C85A17" />; })}
      </svg>

      {scored && (
        <div className="bg-[#FFF7EF] border border-[#C85A17]/25 rounded-xl p-3 text-[11px] font-bold text-[#605248] flex items-center justify-between flex-wrap gap-2">
          <span>Độ khớp điểm số liệu: <b className="text-[#321E12]">{scored.accuracy}%</b> · Độ tuyến tính R² = <b className="text-[#321E12]">{scored.r2}</b></span>
          <span className="text-[#C85A17] font-black">Điểm đồ thị: {scored.score}/10</span>
        </div>
      )}
      <p className="text-[9px] font-bold text-[#605248]/60">
        Vòng tròn xanh = điểm số liệu chuẩn (hiện sau khi chấm) · Đường cam = đường hồi quy qua các điểm em vẽ.
      </p>
    </div>
  );
}
