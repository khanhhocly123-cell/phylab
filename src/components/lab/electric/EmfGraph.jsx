"use client";

import { memo } from "react";
import { C, FONT } from "../../../engine/tokens.js";

export const CELL_COLORS = { new: "#2563EB", old: "#64748B" };
export const CELL_NAMES = { new: "Pin mới", old: "Pin cũ" };

const I_MAX = 150;              // mA — trục I luôn bắt đầu từ 0 để kéo dài đường thẳng tới trục U
const U_MIN = 0.9;              // V
const U_MAX = 1.7;              // V
const I_TICKS = [0, 25, 50, 75, 100, 125, 150];
const U_TICKS = [0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7];

/**
 * EmfGraph — đồ thị U–I "sống" của Bài 26.
 *  - Chấm vàng = điểm làm việc hiện tại: trượt theo biến trở khi khóa K đóng.
 *  - Điểm đã ghi (xanh = pin mới, xám = pin cũ), đường khớp U = E − I·r và phần kéo dài
 *    (nét đứt) tới trục U — chỗ cắt chính là E, độ dốc là r.
 */
/** @param {{ rows: Array<{ id?: number, cell: "new" | "old", current: number, voltage: number }>, fits: Record<string, { emf: number, internalR: number } | null>, live?: { mA: number, u: number } | null, activeCell: "new" | "old", compact?: boolean, tall?: boolean }} props */
function EmfGraph({ rows, fits, live = null, activeCell, compact = false, tall = false }) {
  const W = compact ? 480 : 960;
  const H = compact ? (tall ? 460 : 300) : 250;
  const M = { l: compact ? 44 : 56, r: compact ? 12 : 20, t: 22, b: 36 };
  const x = (mA) => M.l + (Math.min(I_MAX, Math.max(0, mA)) / I_MAX) * (W - M.l - M.r);
  const y = (u) => M.t + ((U_MAX - Math.min(U_MAX, Math.max(U_MIN, u))) / (U_MAX - U_MIN)) * (H - M.t - M.b);
  const fs = compact ? 11 : 10.5;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Đồ thị hiệu điện thế U theo cường độ dòng điện I"
      style={{ width: "100%", height: "100%", display: "block", fontFamily: FONT }}>
      {I_TICKS.map((v) => (
        <g key={`i${v}`}>
          <line x1={x(v)} y1={M.t} x2={x(v)} y2={H - M.b} stroke="#EFE7D8" />
          <text x={x(v)} y={H - M.b + 15} textAnchor="middle" fontSize={fs} fontWeight="800" fill={C.sub}>{v}</text>
        </g>
      ))}
      {U_TICKS.map((v) => (
        <g key={`u${v}`}>
          <line x1={M.l} y1={y(v)} x2={W - M.r} y2={y(v)} stroke="#EFE7D8" />
          <text x={M.l - 6} y={y(v) + 3.5} textAnchor="end" fontSize={fs} fontWeight="800" fill={C.sub}>{v.toFixed(1)}</text>
        </g>
      ))}
      <line x1={M.l} y1={M.t - 6} x2={M.l} y2={H - M.b} stroke={C.ink} strokeWidth="1.6" />
      <line x1={M.l} y1={H - M.b} x2={W - M.r} y2={H - M.b} stroke={C.ink} strokeWidth="1.6" />
      <text x={M.l + 6} y={M.t - 8} fontSize={fs + 0.5} fontWeight="900" fill={C.ink}>U (V)</text>
      <text x={W - M.r} y={H - 5} textAnchor="end" fontSize={fs + 0.5} fontWeight="900" fill={C.ink}>I (mA)</text>

      {/* Chú thích */}
      <g transform={`translate(${W - M.r - (compact ? 150 : 170)} ${M.t - 12})`}>
        {["new", "old"].map((cell, i) => (
          <g key={cell} transform={`translate(${i * (compact ? 76 : 86)} 0)`}>
            <circle cx="6" cy="0" r="5" fill={CELL_COLORS[cell]} />
            <text x="15" y="4" fontSize={fs} fontWeight={cell === activeCell ? 900 : 700} fill={cell === activeCell ? C.ink : C.sub}>{CELL_NAMES[cell]}</text>
          </g>
        ))}
      </g>

      {/* Đường khớp + phần kéo dài tới trục U (đọc E) */}
      {["new", "old"].map((cell) => {
        const pts = rows.filter((row) => row.cell === cell);
        const fit = fits[cell];
        if (pts.length < 2 || !fit) return null;
        const currents = pts.map((row) => row.current * 1000);
        const minI = Math.min(...currents);
        const maxI = Math.max(...currents);
        const U = (mA) => fit.emf - (fit.internalR * mA) / 1000;
        const color = CELL_COLORS[cell];
        const mid = (minI + maxI) / 2;
        const labelW = compact ? 104 : 112;
        return (
          <g key={`fit-${cell}`}>
            <line x1={x(0)} y1={y(U(0))} x2={x(minI)} y2={y(U(minI))} stroke={color} strokeWidth="2" strokeDasharray="6 5" opacity=".85" />
            <line x1={x(minI)} y1={y(U(minI))} x2={x(maxI)} y2={y(U(maxI))} stroke={color} strokeWidth="3" strokeLinecap="round" />
            <circle cx={x(0)} cy={y(fit.emf)} r="6" fill="#fff" stroke={color} strokeWidth="3" />
            <rect x={x(0) + 10} y={y(fit.emf) - 24} width={labelW} height="20" rx="10" fill={color} />
            <text x={x(0) + 10 + labelW / 2} y={y(fit.emf) - 10} textAnchor="middle" fontSize={fs} fontWeight="900" fill="#fff">E ≈ {fit.emf.toFixed(3)} V</text>
            <text x={x(mid)} y={y(U(mid)) + 18} textAnchor="middle" fontSize={fs} fontWeight="900" fill={color}>r ≈ {fit.internalR.toFixed(2)} Ω</text>
          </g>
        );
      })}

      {/* Điểm đã ghi — "bật" lên khi vừa ghi */}
      {rows.map((row, index) => (
        <circle key={row.id ?? index} cx={x(row.current * 1000)} cy={y(row.voltage)} r="5.5" fill={CELL_COLORS[row.cell]} stroke="#fff" strokeWidth="1.8">
          <animate attributeName="r" from="13" to="5.5" dur="0.35s" fill="freeze" />
        </circle>
      ))}

      {/* Điểm làm việc hiện tại */}
      {live && (() => {
        const px = x(live.mA);
        const py = y(live.u);
        const color = CELL_COLORS[activeCell];
        const onLeft = px > W - (compact ? 150 : 190);
        // Gần trục U thì nhãn E nằm ngay trên → đưa nhãn điểm làm việc xuống dưới cho khỏi đè.
        const below = px < x(0) + (compact ? 150 : 190);
        return (
          <g style={{ pointerEvents: "none" }}>
            <line x1={px} y1={py} x2={px} y2={H - M.b} stroke={color} strokeDasharray="3 3" opacity=".55" />
            <line x1={M.l} y1={py} x2={px} y2={py} stroke={color} strokeDasharray="3 3" opacity=".55" />
            <circle cx={px} cy={py} r="12" fill="#FACC15" opacity=".3">
              <animate attributeName="r" values="9;16;9" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx={px} cy={py} r="6.5" fill="#FDE047" stroke={color} strokeWidth="2.5" />
            <text x={onLeft ? px - 12 : px + 12} y={below ? py + 22 : py - 12} textAnchor={onLeft ? "end" : "start"} fontSize={fs} fontWeight="900" fill={C.ink}>
              {live.mA.toFixed(1)} mA · {live.u.toFixed(3)} V
            </text>
          </g>
        );
      })()}

      {!rows.length && !live && (
        <text x={(M.l + W - M.r) / 2} y={(M.t + H - M.b) / 2} textAnchor="middle" fontSize={fs + 1.5} fontWeight="800" fill={C.sub}>
          Đóng K rồi xoay biến trở — chấm sáng sẽ trượt trên đồ thị.
        </text>
      )}
    </svg>
  );
}

/* Chỉ vẽ lại khi số liệu, đường khớp hay điểm làm việc đổi. */
export default memo(EmfGraph);
