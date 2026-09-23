"use client";

import { C, FONT } from "../../engine/tokens.js";

/* ============================================================================
   LiveGraph — đồ thị "sống" dùng chung cho các bàn thí nghiệm (Bài 6, 11, 23).
   Mỗi lần ghi số liệu, điểm mới "bật" lên đồ thị; đường khớp tự hiện khi đủ điểm;
   điểm làm việc hiện tại (live) và điểm dự đoán (ghost) giúp học sinh thấy định luật
   thành hình ngay trong lúc đo — thay vì chỉ nhìn một cột số.
   Toạ độ truyền vào là ĐƠN VỊ VẬT LÝ; component tự quy đổi sang khung vẽ.
   ========================================================================== */

/** Vạch chia "đẹp" (1, 2, 2.5, 5 × 10ⁿ) cho khoảng [min, max]. */
export function niceTicks(min, max, count = 6) {
  const span = Math.max(1e-9, max - min);
  const raw = span / Math.max(1, count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
  const start = Math.floor(min / step + 1e-9) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 1e-6; v += step) ticks.push(+v.toFixed(10));
  return { ticks, step };
}

/** Khoảng trục bao trọn dữ liệu (cố định đầu nào thì truyền min/max), làm tròn theo vạch chia. */
export function niceRange(values, { min = null, max = null, pad = 0.08, count = 6 } = {}) {
  const finite = values.filter(Number.isFinite);
  let lo = min ?? (finite.length ? Math.min(...finite) : 0);
  let hi = max ?? (finite.length ? Math.max(...finite) : 1);
  if (hi - lo < 1e-9) hi = lo + 1;
  const span = hi - lo;
  if (min == null) lo -= span * pad;
  if (max == null) hi += span * pad;
  const { ticks, step } = niceTicks(lo, hi, count);
  const nlo = min ?? +(Math.floor(lo / step + 1e-9) * step).toFixed(10);
  const nhi = max ?? +(Math.ceil(hi / step - 1e-9) * step).toFixed(10);
  return { min: nlo, max: nhi, ticks: [...new Set([...ticks, nhi])].filter((t) => t >= nlo - 1e-9 && t <= nhi + 1e-9) };
}

/**
 * @param {{
 *   x: { label: string, min: number, max: number, ticks?: number[], fmt?: (v: number) => string },
 *   y: { label: string, min: number, max: number, ticks?: number[], fmt?: (v: number) => string },
 *   series?: Array<{ id: string, name?: string, color: string, points?: Array<{ x: number, y: number, key?: string|number, hollow?: boolean, warn?: boolean, big?: boolean }>,
 *     lines?: Array<{ x1: number, y1: number, x2: number, y2: number, dashed?: boolean, width?: number }>,
 *     tags?: Array<{ x: number, y: number, text: string, dy?: number, pill?: boolean }> }>,
 *   guides?: Array<{ axis: "x" | "y", value: number, color?: string, label?: string }>,
 *   live?: { x: number, y: number, color?: string, label?: string } | null,
 *   ghost?: { x: number, y: number, label?: string } | null,
 *   legend?: boolean,
 *   activeSeries?: string | null,
 *   empty?: string,
 *   compact?: boolean,
 *   tall?: boolean,
 *   ariaLabel?: string,
 * }} props
 */
export default function LiveGraph({ x, y, series = [], guides = [], live = null, ghost = null, legend = true, activeSeries = null, empty = "", compact = false, tall = false, ariaLabel = "Đồ thị số liệu" }) {
  const W = compact ? 480 : 960;
  const H = compact ? (tall ? 460 : 300) : 250;
  const M = { l: compact ? 48 : 60, r: compact ? 14 : 22, t: 24, b: 36 };
  const fs = compact ? 11 : 10.5;
  const cx = (v) => M.l + ((Math.min(x.max, Math.max(x.min, v)) - x.min) / (x.max - x.min)) * (W - M.l - M.r);
  const cy = (v) => M.t + ((y.max - Math.min(y.max, Math.max(y.min, v))) / (y.max - y.min)) * (H - M.t - M.b);
  const xTicks = x.ticks || niceTicks(x.min, x.max).ticks;
  const yTicks = y.ticks || niceTicks(y.min, y.max, 5).ticks;
  const fx = x.fmt || ((v) => String(+v.toFixed(3)));
  const fy = y.fmt || ((v) => String(+v.toFixed(3)));
  const hasData = series.some((s) => s.points?.length) || live;
  const named = series.filter((s) => s.name);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={ariaLabel}
      style={{ width: "100%", height: "100%", display: "block", fontFamily: FONT }}>
      {xTicks.filter((v) => v >= x.min - 1e-9 && v <= x.max + 1e-9).map((v) => (
        <g key={`x${v}`}>
          <line x1={cx(v)} y1={M.t} x2={cx(v)} y2={H - M.b} stroke="#EFE7D8" />
          <text x={cx(v)} y={H - M.b + 15} textAnchor="middle" fontSize={fs} fontWeight="800" fill={C.sub}>{fx(v)}</text>
        </g>
      ))}
      {yTicks.filter((v) => v >= y.min - 1e-9 && v <= y.max + 1e-9).map((v) => (
        <g key={`y${v}`}>
          <line x1={M.l} y1={cy(v)} x2={W - M.r} y2={cy(v)} stroke="#EFE7D8" />
          <text x={M.l - 6} y={cy(v) + 3.5} textAnchor="end" fontSize={fs} fontWeight="800" fill={C.sub}>{fy(v)}</text>
        </g>
      ))}
      <line x1={M.l} y1={M.t - 6} x2={M.l} y2={H - M.b} stroke={C.ink} strokeWidth="1.6" />
      <line x1={M.l} y1={H - M.b} x2={W - M.r} y2={H - M.b} stroke={C.ink} strokeWidth="1.6" />
      <text x={M.l + 6} y={M.t - 9} fontSize={fs + 0.5} fontWeight="900" fill={C.ink}>{y.label}</text>
      <text x={W - M.r} y={H - 5} textAnchor="end" fontSize={fs + 0.5} fontWeight="900" fill={C.ink}>{x.label}</text>

      {legend && named.length > 1 && (
        <g transform={`translate(${W - M.r - named.length * (compact ? 78 : 92)} ${M.t - 13})`}>
          {named.map((s, i) => (
            <g key={s.id} transform={`translate(${i * (compact ? 78 : 92)} 0)`}>
              <circle cx="6" cy="0" r="5" fill={s.color} />
              <text x="15" y="4" fontSize={fs} fontWeight={s.id === activeSeries ? 900 : 700} fill={s.id === activeSeries ? C.ink : C.sub}>{s.name}</text>
            </g>
          ))}
        </g>
      )}

      {guides.map((g, i) => {
        const col = g.color || C.navy;
        return g.axis === "y" ? (
          <g key={`g${i}`} style={{ pointerEvents: "none" }}>
            <line x1={M.l} y1={cy(g.value)} x2={W - M.r} y2={cy(g.value)} stroke={col} strokeDasharray="5 5" opacity=".6" />
            {g.label && <text x={M.l + 6} y={cy(g.value) - 5} textAnchor="start" fontSize={fs} fontWeight="900" fill={col}>{g.label}</text>}
          </g>
        ) : (
          <g key={`g${i}`} style={{ pointerEvents: "none" }}>
            <line x1={cx(g.value)} y1={M.t} x2={cx(g.value)} y2={H - M.b} stroke={col} strokeDasharray="5 5" opacity=".6" />
            {g.label && <text x={cx(g.value) + 5} y={M.t + 12} fontSize={fs} fontWeight="900" fill={col}>{g.label}</text>}
          </g>
        );
      })}

      {/* Đường khớp / đường kéo dài */}
      {series.map((s) => (s.lines || []).map((l, i) => (
        <line key={`${s.id}-l${i}`} x1={cx(l.x1)} y1={cy(l.y1)} x2={cx(l.x2)} y2={cy(l.y2)} stroke={s.color}
          strokeWidth={l.width || (l.dashed ? 2 : 3)} strokeDasharray={l.dashed ? "6 5" : undefined} strokeLinecap="round" opacity={l.dashed ? 0.85 : 1} />
      )))}

      {/* Điểm đã ghi — "bật" lên khi vừa ghi */}
      {series.map((s) => (s.points || []).map((p, i) => (
        <g key={`${s.id}-p${p.key ?? i}`}>
          <circle cx={cx(p.x)} cy={cy(p.y)} r={p.big ? 7 : 5.5} fill={p.hollow ? "#fff" : s.color} stroke={p.warn ? "#DC2626" : p.hollow ? s.color : "#fff"} strokeWidth={p.hollow || p.warn ? 2.4 : 1.8}>
            <animate attributeName="r" from="13" to={p.big ? 7 : 5.5} dur="0.35s" fill="freeze" />
          </circle>
        </g>
      )))}

      {/* Nhãn (E, g, R…) */}
      {series.map((s) => (s.tags || []).map((t, i) => {
        const tx = cx(t.x), ty = cy(t.y) + (t.dy ?? -14);
        const w = Math.max(40, t.text.length * (compact ? 6.6 : 6.3) + 16);
        const left = Math.min(W - M.r - w, Math.max(M.l + 2, tx - w / 2));
        return t.pill ? (
          <g key={`${s.id}-t${i}`} style={{ pointerEvents: "none" }}>
            <rect x={left} y={ty - 14} width={w} height="20" rx="10" fill={s.color} />
            <text x={left + w / 2} y={ty} textAnchor="middle" fontSize={fs} fontWeight="900" fill="#fff">{t.text}</text>
          </g>
        ) : (
          <text key={`${s.id}-t${i}`} x={tx} y={ty} textAnchor="middle" fontSize={fs} fontWeight="900" fill={s.color} style={{ pointerEvents: "none" }}>{t.text}</text>
        );
      }))}

      {/* Điểm dự đoán — học sinh thả/đo để kiểm tra */}
      {ghost && (
        <g style={{ pointerEvents: "none" }}>
          <circle cx={cx(ghost.x)} cy={cy(ghost.y)} r="8" fill="none" stroke={C.orangeDk} strokeWidth="2" strokeDasharray="3 3">
            <animate attributeName="r" values="7;10;7" dur="1.6s" repeatCount="indefinite" />
          </circle>
          {ghost.label && (
            <text x={cx(ghost.x) + (cx(ghost.x) > W - 180 ? -12 : 12)} y={cy(ghost.y) + 18} textAnchor={cx(ghost.x) > W - 180 ? "end" : "start"} fontSize={fs} fontWeight="900" fill={C.orangeDk}>{ghost.label}</text>
          )}
        </g>
      )}

      {/* Điểm làm việc hiện tại */}
      {live && (() => {
        const px = cx(live.x), py = cy(live.y);
        const col = live.color || C.orange;
        const onLeft = px > W - (compact ? 160 : 200);
        return (
          <g style={{ pointerEvents: "none" }}>
            <line x1={px} y1={py} x2={px} y2={H - M.b} stroke={col} strokeDasharray="3 3" opacity=".55" />
            <line x1={M.l} y1={py} x2={px} y2={py} stroke={col} strokeDasharray="3 3" opacity=".55" />
            <circle cx={px} cy={py} r="12" fill="#FACC15" opacity=".3">
              <animate attributeName="r" values="9;16;9" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx={px} cy={py} r="6.5" fill="#FDE047" stroke={col} strokeWidth="2.5" />
            {live.label && (
              <text x={onLeft ? px - 12 : px + 12} y={py - 12} textAnchor={onLeft ? "end" : "start"} fontSize={fs} fontWeight="900" fill={C.ink}>{live.label}</text>
            )}
          </g>
        );
      })()}

      {!hasData && empty && (
        <text x={(M.l + W - M.r) / 2} y={(M.t + H - M.b) / 2} textAnchor="middle" fontSize={fs + 1.5} fontWeight="800" fill={C.sub}>{empty}</text>
      )}
    </svg>
  );
}
