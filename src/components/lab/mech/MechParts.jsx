"use client";

import { memo, useId } from "react";
import { C, FONT } from "../../../engine/tokens.js";

/* ============================================================================
   MechParts — dụng cụ cơ học vẽ bằng SVG cho Bài 6 (máng nghiêng) và Bài 11 (rơi tự do).
   Thay cho ảnh PNG/SVG cũ: sắc nét ở mọi mức phóng, có trạng thái (nam châm bật/tắt, cổng quang
   bị che, núm MODE, vít cân bằng…) và KHÔNG dùng filter (bóng đổ = hình mờ lệch) để hoạt ảnh
   không làm trình duyệt raster lại nặng.

   Mỗi linh kiện vẽ theo đúng hệ toạ độ bench đang dùng (xem chú thích từng hàm), nên vật lý,
   vị trí cổng, bi, trụ thép… giữ nguyên. Linh kiện tĩnh đều memo: khi bi lăn / trụ rơi chỉ phần
   đổi (bi, số đồng hồ, tia cổng quang) vẽ lại.
   ========================================================================== */

const useUid = () => useId().replace(/[^a-zA-Z0-9]/g, "");

/** Gradient kim loại dùng chung (theo trục đứng hoặc ngang). */
function MetalStops({ tones }) {
  return tones.map(([offset, color]) => <stop key={offset} offset={offset} stopColor={color} />);
}
const ALU = [[0, "#F8FAFC"], [0.35, "#D9DEE5"], [0.7, "#A7B0BC"], [1, "#CBD2DA"]];
const DARK = [[0, "#5B6472"], [0.45, "#374151"], [1, "#1F2937"]];
const BRASS = [[0, "#FDE68A"], [0.5, "#D4A017"], [1, "#8A6A0B"]];
const COPPER = [[0, "#FBBF77"], [0.45, "#C2410C"], [1, "#7C2D12"]];

/* =========================== Nền bàn thí nghiệm =========================== */
/** Tường ô lưới nhạt + mặt bàn gỗ ở dưới `floor`. */
export const BenchBackdrop = memo(function BenchBackdrop({ width, height, floor }) {
  const uid = useUid();
  return (
    <g style={{ pointerEvents: "none" }}>
      <defs>
        <pattern id={`${uid}-grid`} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M36 0H0V36" fill="none" stroke="#EFE5D3" strokeWidth="1" />
        </pattern>
        <linearGradient id={`${uid}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9CFA6" />
          <stop offset="0.18" stopColor="#DDB888" />
          <stop offset="1" stopColor="#C8965E" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={floor} fill={`url(#${uid}-grid)`} opacity="0.75" />
      <rect x="0" y={floor} width={width} height={height - floor} fill={`url(#${uid}-top)`} />
      <rect x="0" y={floor} width={width} height="3" fill="#F6E7CD" />
      <rect x="0" y={floor + 3} width={width} height="1.5" fill="#9A6B37" opacity=".35" />
      <path d={`M0 ${floor + 24} C${width * 0.22} ${floor + 16} ${width * 0.52} ${floor + 32} ${width} ${floor + 21}`} fill="none" stroke="#9A6B37" strokeOpacity=".18" strokeWidth="1.4" />
      <path d={`M0 ${floor + 46} C${width * 0.3} ${floor + 54} ${width * 0.62} ${floor + 39} ${width} ${floor + 49}`} fill="none" stroke="#9A6B37" strokeOpacity=".14" strokeWidth="1.2" />
    </g>
  );
});

/* ================================ BÀI 6 ================================ */

/**
 * Máng nghiêng + thước + thước đo góc, vẽ trong hệ toạ độ CỤC BỘ của máng (778 × 187, trùng ảnh cũ):
 * đường tâm bi `chute` (đoạn cong) rồi thẳng tới x = 766 ở y = rulerY; vạch 0 cm tại `zeroX`,
 * `pxPerM` đơn vị/ mét; thước đo góc tâm `pivot` (dây dọi treo ở đây — đọc θ trực tiếp).
 */
export const Rail6 = memo(function Rail6({ chute, rulerY = 130, zeroX = 190, pxPerM = 610, pivot = [122, 150], endX = 766 }) {
  const uid = useUid();
  // Mặt lăn (rãnh nhôm) nằm dưới tâm bi ~8 đơn vị; bo tròn các góc của đường gấp khúc.
  const pts = [...chute, [endX, rulerY]].map(([x, y]) => [x, y + 8]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m1 = mid(pts[i - 1], pts[i]), m2 = mid(pts[i], pts[i + 1]);
    d += ` L${m1[0]} ${m1[1]} Q${pts[i][0]} ${pts[i][1]} ${m2[0]} ${m2[1]}`;
  }
  d += ` L${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`;
  const top = rulerY + 12, bottom = rulerY + 36;
  let ticks = "";
  for (let cm = 0; zeroX + (cm * pxPerM) / 100 <= endX - 4; cm++) {
    const x = +(zeroX + (cm * pxPerM) / 100).toFixed(2);
    ticks += `M${x} ${top}v${cm % 10 === 0 ? 11 : cm % 5 === 0 ? 7.5 : 4.5}`;
  }
  const [px, py] = pivot;
  const R = 46;
  let pTicks = "";
  for (let a = -60; a <= 60; a += 5) {
    const r = (a * Math.PI) / 180;
    const r1 = a % 10 === 0 ? R - 11 : R - 6;
    pTicks += `M${(px + r1 * Math.sin(r)).toFixed(2)} ${(py + r1 * Math.cos(r)).toFixed(2)}L${(px + R * Math.sin(r)).toFixed(2)} ${(py + R * Math.cos(r)).toFixed(2)}`;
  }
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-ruler`} x1="0" y1="0" x2="0" y2="1"><MetalStops tones={[[0, "#FFFFFF"], [0.6, "#F7F1E3"], [1, "#E6DCC6"]]} /></linearGradient>
        <linearGradient id={`${uid}-alu`} x1="0" y1="0" x2="1" y2="0"><MetalStops tones={ALU} /></linearGradient>
        <linearGradient id={`${uid}-dark`} x1="0" y1="0" x2="0" y2="1"><MetalStops tones={DARK} /></linearGradient>
        <linearGradient id={`${uid}-brass`} x1="0" y1="0" x2="1" y2="1"><MetalStops tones={BRASS} /></linearGradient>
      </defs>
      {/* bóng đổ của cả máng */}
      <rect x="40" y={top + 5} width={endX - 36} height={bottom - top} rx="4" fill="#000" opacity=".08" />
      {/* cột đỡ đoạn cong */}
      <rect x="54" y="44" width="8" height={top - 44} rx="2" fill={`url(#${uid}-alu)`} stroke="#8B95A1" strokeWidth="1" />
      {/* thước thẳng (0 tại cổng E) */}
      <rect x="36" y={top} width={endX - 30} height={bottom - top} rx="4" fill={`url(#${uid}-ruler)`} stroke="#9C8F76" strokeWidth="1.4" />
      <path d={ticks} stroke="#4B3F31" strokeWidth="1.3" />
      {Array.from({ length: Math.floor(((endX - 8 - zeroX) / pxPerM) * 10) + 1 }, (_, i) => (
        <text key={i} x={zeroX + (i * pxPerM) / 10} y={bottom - 5} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#4B3F31" fontFamily={FONT}>{i * 10}</text>
      ))}
      <text x={endX - 12} y={bottom - 5} textAnchor="end" fontSize="9" fontWeight="800" fill="#8B7B64" fontFamily={FONT}>cm</text>
      {/* núm chỉnh ở đầu thước */}
      <rect x="18" y={top + 6} width="20" height="12" rx="3" fill={`url(#${uid}-brass)`} stroke="#7A5C0A" strokeWidth="1.2" />
      <path d={`M22 ${top + 6}v12M26 ${top + 6}v12M30 ${top + 6}v12M34 ${top + 6}v12`} stroke="#7A5C0A" strokeWidth="1" opacity=".55" />
      {/* thước đo góc (nhựa trong) — dây dọi treo ở tâm, chỉ đúng góc nghiêng θ */}
      <path d={`M${px - R} ${py} A${R} ${R} 0 0 0 ${px + R} ${py} Z`} fill="#E0F2FE" fillOpacity=".72" stroke="#64748B" strokeWidth="1.3" />
      <path d={pTicks} stroke="#334155" strokeWidth="1.1" />
      {[-40, -20, 0, 20, 40].map((a) => {
        const r = (a * Math.PI) / 180;
        return <text key={a} x={px + (R - 19) * Math.sin(r)} y={py + (R - 19) * Math.cos(r) + 3} textAnchor="middle" fontSize="8" fontWeight="900" fill="#1E3A5F" fontFamily={FONT}>{Math.abs(a)}</text>;
      })}
      {/* rãnh lăn nhôm: viền tối → thân → vệt sáng → đáy rãnh */}
      <path d={d} fill="none" stroke="#000" strokeOpacity=".12" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 3)" />
      <path d={d} fill="none" stroke="#5F6B78" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#C3CAD3" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#F8FAFC" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 -2.4)" />
      <path d={d} fill="none" stroke="#7B8794" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 1.6)" />
      {/* đế trượt đầu cao (ôm cột giá trái) */}
      <rect x="42" y="28" width="30" height="26" rx="5" fill={`url(#${uid}-dark)`} stroke="#111827" strokeWidth="1.3" />
      <rect x="46" y="31" width="22" height="4" rx="2" fill="#fff" opacity=".18" />
      {/* chặn cuối + trục quay tựa giá phải */}
      <rect x={endX - 7} y={rulerY - 22} width="14" height={top - rulerY + 24} rx="4" fill={`url(#${uid}-dark)`} stroke="#111827" strokeWidth="1.3" />
      <circle cx={748} cy={rulerY} r="5.5" fill="#94A3B8" stroke="#334155" strokeWidth="1.6" />
      <circle cx={748} cy={rulerY} r="1.8" fill="#334155" />
    </g>
  );
});

/**
 * Giá đỡ trái (cột cố định, toạ độ màn hình): thân thép từ `top` xuống đế 3 chân ở `floor`;
 * vòng kẹp + vít vặn tay ở độ cao `clampY` — nơi đầu cao của máng trượt trên cột.
 */
export const StandLeft6 = memo(function StandLeft6({ x, top, floor, clampY = null }) {
  const uid = useUid();
  const hub = floor - 30;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-rod`} x1="0" y1="0" x2="1" y2="0"><MetalStops tones={ALU} /></linearGradient>
        <linearGradient id={`${uid}-iron`} x1="0" y1="0" x2="0" y2="1"><MetalStops tones={DARK} /></linearGradient>
        <linearGradient id={`${uid}-brass`} x1="0" y1="0" x2="1" y2="1"><MetalStops tones={BRASS} /></linearGradient>
      </defs>
      <ellipse cx={x} cy={floor + 1} rx="50" ry="4.5" fill="#000" opacity=".12" />
      {/* đế 3 chân gang */}
      <path d={`M${x - 14} ${hub + 8} L${x - 46} ${floor - 3} L${x - 36} ${floor - 3} L${x - 6} ${hub + 12} Z`} fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={`M${x + 14} ${hub + 8} L${x + 46} ${floor - 3} L${x + 36} ${floor - 3} L${x + 6} ${hub + 12} Z`} fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x={x - 5} y={hub + 8} width="10" height={floor - hub - 10} rx="2" fill="#374151" stroke="#111827" strokeWidth="1" />
      {[x - 41, x + 41, x].map((fx) => <rect key={fx} x={fx - 7} y={floor - 4} width="14" height="4" rx="2" fill="#111827" />)}
      <rect x={x - 20} y={hub - 2} width="40" height="16" rx="6" fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth="1.3" />
      <rect x={x - 16} y={hub} width="32" height="3" rx="1.5" fill="#fff" opacity=".2" />
      <text x={x} y={hub + 10.5} textAnchor="middle" fontSize="8" fontWeight="900" fill="#F5A623" fontFamily={FONT} fontStyle="italic">φ</text>
      {/* thân cột */}
      <rect x={x - 3.8} y={top} width="7.6" height={hub - top} rx="3" fill={`url(#${uid}-rod)`} stroke="#6B7280" strokeWidth="1" />
      <circle cx={x} cy={top + 1} r="4.2" fill="#CBD2DA" stroke="#6B7280" strokeWidth="1" />
      {/* vòng kẹp + vít vặn tay */}
      {clampY != null && (
        <g>
          <rect x={x - 9} y={clampY - 7} width="18" height="14" rx="3" fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth="1.2" />
          <rect x={x - 19} y={clampY - 1.6} width="11" height="3.2" rx="1.2" fill="#9CA3AF" />
          <rect x={x - 25} y={clampY - 5} width="7" height="10" rx="2.5" fill={`url(#${uid}-brass)`} stroke="#7A5C0A" strokeWidth="1" />
        </g>
      )}
    </g>
  );
});

/**
 * Giá đỡ phải (toạ độ màn hình): đỉnh chạc tại (x, top) — đúng điểm tựa đầu thấp của máng; đế ở `floor`.
 * Vít cân bằng vẽ riêng (StandScrew6) để bấm vít không lẫn với kéo giá đổi góc.
 */
export const StandRight6 = memo(function StandRight6({ x, top, floor }) {
  const uid = useUid();
  const base = floor - 9;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-rod`} x1="0" y1="0" x2="1" y2="0"><MetalStops tones={ALU} /></linearGradient>
        <linearGradient id={`${uid}-iron`} x1="0" y1="0" x2="0" y2="1"><MetalStops tones={DARK} /></linearGradient>
      </defs>
      <ellipse cx={x} cy={floor + 1} rx="34" ry="4" fill="#000" opacity=".12" />
      {/* chạc đỡ trục máng */}
      <path d={`M${x - 10} ${top + 22} V${top - 6} a4 4 0 0 1 8 0 V${top + 6} h4 V${top - 6} a4 4 0 0 1 8 0 V${top + 22} Z`} fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth="1.2" strokeLinejoin="round" />
      {/* thân */}
      <rect x={x - 4.5} y={top + 20} width="9" height={base - top - 20} rx="2.5" fill={`url(#${uid}-rod)`} stroke="#6B7280" strokeWidth="1" />
      {/* đế */}
      <rect x={x - 28} y={base} width="56" height="9" rx="4" fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth="1.2" />
      <rect x={x - 24} y={base + 1.5} width="48" height="2" rx="1" fill="#fff" opacity=".2" />
    </g>
  );
});

/** Vít cân bằng ở chân đế giá phải — tâm tại `screwPos(x, floor)`; vàng = chưa cân, xanh = đã cân bằng. */
export const screwPos6 = (x, floor) => ({ x: x + 21, y: floor - 17 });
export const StandScrew6 = memo(function StandScrew6({ x, floor, balanced = false, onToggle = null }) {
  const p = screwPos6(x, floor);
  const ink = balanced ? "#14532D" : "#7A5C0A";
  return (
    <g onClick={onToggle || undefined} style={onToggle ? { cursor: "pointer" } : undefined} role={onToggle ? "button" : undefined}
      aria-label={onToggle ? (balanced ? "Vít cân bằng: đã cân" : "Vít cân bằng — bấm để chỉnh cân bằng") : undefined}>
      <circle cx={p.x} cy={p.y} r="15" fill="transparent" />
      <rect x={p.x - 1.6} y={p.y + 3} width="3.2" height="6" fill="#9CA3AF" />
      <circle cx={p.x} cy={p.y} r="7.4" fill={balanced ? C.good : "#E0B021"} stroke={ink} strokeWidth="1.4" />
      <circle cx={p.x} cy={p.y} r="7.4" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" strokeDasharray="1.6 1.8" />
      <path d={`M${p.x - 3.6} ${p.y}h7.2`} stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
    </g>
  );
});

/**
 * Cổng quang (nhìn ngang, gốc toạ độ tại vạch thước dưới tâm bi): thân chữ U, cửa sổ tia hồng ngoại
 * ngang tầm bi, đèn báo đỏ sáng khi tia bị che; kẹp chân ôm thước.
 */
export const Photogate6 = memo(function Photogate6({ blocked = false }) {
  const uid = useUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="0"><MetalStops tones={[[0, "#475569"], [0.4, "#334155"], [1, "#1E293B"]]} /></linearGradient>
      </defs>
      <rect x="-9" y="-21" width="21" height="33" rx="5" fill="#000" opacity=".12" />
      <rect x="-10.5" y="-24" width="21" height="33" rx="5" fill={`url(#${uid}-body)`} stroke="#0F172A" strokeWidth="1.2" />
      <rect x="-8" y="-22" width="3" height="28" rx="1.5" fill="#fff" opacity=".14" />
      <circle cx="0" cy="-3.5" r="6.6" fill="#0B1220" stroke="#64748B" strokeWidth="1" />
      <circle cx="0" cy="-3.5" r="3.4" fill={blocked ? "#7F1D1D" : "#111827"} />
      <circle cx="0" cy="-17.5" r="2.4" fill={blocked ? "#FF3B3B" : "#7F1D1D"} stroke="#1F2937" strokeWidth=".8" />
      {blocked && <circle cx="0" cy="-17.5" r="4.6" fill="#FF3B3B" opacity=".35" />}
      <rect x="-8" y="8.5" width="16" height="11" rx="2.5" fill="#1F2937" stroke="#0F172A" strokeWidth="1" />
      <rect x="8" y="11.2" width="4.5" height="5.2" rx="1.4" fill="#9CA3AF" />
    </g>
  );
});

/**
 * Nam châm điện ở đầu cao của máng (toạ độ đã xoay theo máng, tâm tại (0, 0)): cuộn dây đồng,
 * lõi sắt quay về phía bi (mặt cực tại x = 7), đèn xanh khi đang hút.
 */
export const Magnet6 = memo(function Magnet6({ on = true }) {
  const uid = useUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-coil`} x1="0" y1="0" x2="0" y2="1"><MetalStops tones={COPPER} /></linearGradient>
        <linearGradient id={`${uid}-core`} x1="0" y1="0" x2="0" y2="1"><MetalStops tones={ALU} /></linearGradient>
      </defs>
      <rect x="-12.5" y="-7.5" width="3.5" height="15" rx="1.2" fill="#374151" stroke="#111827" strokeWidth=".8" />
      <rect x="-9.5" y="-6.5" width="13.5" height="13" rx="2.5" fill={`url(#${uid}-coil)`} stroke="#431407" strokeWidth=".9" opacity={on ? 1 : 0.72} />
      <path d="M-7 -6.4v12.8M-4.5 -6.4v12.8M-2 -6.4v12.8M0.5 -6.4v12.8M3 -6.4v12.8" stroke="#431407" strokeWidth=".6" opacity=".45" />
      <rect x="3.5" y="-5" width="3.8" height="10" rx="1" fill={`url(#${uid}-core)`} stroke="#475569" strokeWidth=".8" />
      <circle cx="-8" cy="-9.4" r="1.9" fill={on ? "#4ADE80" : "#475569"} stroke="#14532D" strokeWidth=".6" />
      {on && <path d="M8.6 -5.5 q3 5.5 0 11 M10.6 -7.5 q4.6 7.5 0 15" fill="none" stroke="#22C55E" strokeWidth=".9" strokeOpacity=".55" strokeLinecap="round" />}
    </g>
  );
});

/** Viên bi thép (tâm (x, y), bán kính 8): phản chiếu sáng + vành tối. */
export const SteelBall = memo(function SteelBall({ x, y, r = 8 }) {
  const uid = useUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-steel`} cx="36%" cy="32%" r="75%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.22" stopColor="#D9DDE3" />
          <stop offset="0.6" stopColor="#7C8490" />
          <stop offset="1" stopColor="#2E343C" />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r} fill={`url(#${uid}-steel)`} stroke="#1F2937" strokeWidth=".9" />
      <ellipse cx={x + r * 0.18} cy={y + r * 0.58} rx={r * 0.5} ry={r * 0.18} fill="#E5E7EB" opacity=".35" />
      <circle cx={x - r * 0.34} cy={y - r * 0.38} r={r * 0.2} fill="#fff" opacity=".9" />
    </g>
  );
});

/** Dây dọi: dây mảnh từ chốt treo (0, 0) xuống quả dọi đồng dài `length`. */
export const Plumb6 = memo(function Plumb6({ length = 58 }) {
  const uid = useUid();
  const bobTop = length - 14;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-bob`} x1="0" y1="0" x2="1" y2="0"><MetalStops tones={BRASS} /></linearGradient>
      </defs>
      <line x1="0" y1="0" x2="0" y2={bobTop + 1} stroke="#1F2937" strokeWidth="1" />
      <path d={`M-4 ${bobTop + 2.5} Q-4 ${bobTop} 0 ${bobTop} Q4 ${bobTop} 4 ${bobTop + 2.5} L0.6 ${length} L-0.6 ${length} Z`} fill={`url(#${uid}-bob)`} stroke="#7A5C0A" strokeWidth=".8" strokeLinejoin="round" />
      <circle cx="0" cy="0" r="2.2" fill="#475569" stroke="#1F2937" strokeWidth=".8" />
    </g>
  );
});

/* ======================= Đồng hồ đo thời gian MC964 ======================= */
const MC964_SOCKETS = { A: 66, B: 114, C: 162 };
const NO_WIRES = {};
const NO_PLUG = () => null;
/**
 * Mặt đồng hồ (toạ độ cục bộ 300 × 132 như bản cũ, bench tự scale): giữ NGUYÊN vị trí núm MODE,
 * Reset, gạt thang đo, ổ A/B/C, công tắc nguồn — gợi ý (HintBox) và dây nối vẫn khớp.
 * wires[sock] = nguồn đang cắm ở ổ đó; plugInfo(nguồn) → { text, color } | null (hàm cấp module để memo).
 */
export function MC964Face({ face = "front", led = "0.000", counting = false, modeAngle = 0, modeLabel = "", scale = "fine", scaleLabel = "",
  power = false, wires = NO_WIRES, plugInfo = NO_PLUG, hotSockets = false, interactive = true,
  onFlip, onCycleMode, onReset, onToggleScale, onTogglePower, onUnplug }) {
  return (
    <g>
      <MC964Body face={face} modeAngle={modeAngle} modeLabel={modeLabel} scale={scale} scaleLabel={scaleLabel} power={power}
        wires={wires} plugInfo={plugInfo} hotSockets={hotSockets} interactive={interactive}
        onFlip={onFlip} onCycleMode={onCycleMode} onReset={onReset} onToggleScale={onToggleScale} onTogglePower={onTogglePower} onUnplug={onUnplug} />
      {face === "front" && <MC964Led led={led} counting={counting} />}
    </g>
  );
}

/** Số LED (đổi từng khung hình khi đang đếm) — tách riêng để thân đồng hồ không vẽ lại. */
function MC964Led({ led, counting }) {
  const ghost = String(led).replace(/[0-9]/g, "8");
  return (
    <g style={{ pointerEvents: "none" }}>
      <text x="78" y="58" textAnchor="middle" fontFamily="monospace" fontSize="28" fill="#FF2D2D" opacity=".09" letterSpacing="3">{ghost}</text>
      <text x="78" y="58" textAnchor="middle" fontFamily="monospace" fontSize="28" fill="none" stroke="#FF2D2D" strokeOpacity=".28" strokeWidth="3" letterSpacing="3">{led}</text>
      <text x="78" y="58" textAnchor="middle" fontFamily="monospace" fontSize="28" fill="#FF4040" letterSpacing="3">{led}</text>
      {counting && (
        <circle cx="122" cy="30" r="2.6" fill="#FF4040">
          <animate attributeName="opacity" values="1;0.2;1" dur="0.5s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

const MC964Body = memo(function MC964Body({ face, modeAngle, modeLabel, scale, scaleLabel, power, wires, plugInfo, hotSockets, interactive,
  onFlip, onCycleMode, onReset, onToggleScale, onTogglePower, onUnplug }) {
  const sockets = MC964_SOCKETS;
  const plug = (s) => (wires[s] ? plugInfo(wires[s]) : null);
  const uid = useUid();
  const hit = (fn) => (interactive && fn ? { onClick: fn, style: { cursor: "pointer" } } : {});
  const rad = (modeAngle * Math.PI) / 180;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-case`} x1="0" y1="0" x2="0" y2="1"><MetalStops tones={[[0, "#FFFEFA"], [0.55, "#F6F0E1"], [1, "#E4DAC3"]]} /></linearGradient>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0" y2="1"><MetalStops tones={[[0, "#3B1010"], [0.5, "#260808"], [1, "#1A0505"]]} /></linearGradient>
        <radialGradient id={`${uid}-knob`} cx="40%" cy="35%" r="70%"><MetalStops tones={[[0, "#F3F4F6"], [0.55, "#B8BDC6"], [1, "#6B7280"]]} /></radialGradient>
        <radialGradient id={`${uid}-red`} cx="38%" cy="32%" r="70%"><MetalStops tones={[[0, "#FCA5A5"], [0.45, "#E03A36"], [1, "#7F1D1D"]]} /></radialGradient>
        <linearGradient id={`${uid}-ear`} x1="0" y1="0" x2="0" y2="1"><MetalStops tones={ALU} /></linearGradient>
      </defs>
      {interactive && onFlip && (
        <g {...hit(onFlip)}>
          <rect x="0" y="-21" width="104" height="18" rx="9" fill="#fff" stroke={C.line} />
          <text x="52" y="-8" textAnchor="middle" fontSize="10" fontWeight="800" fill={C.navy} fontFamily={FONT}>{face === "front" ? "Xem mặt sau ⟳" : "⟲ Mặt trước"}</text>
        </g>
      )}
      {/* tai bắt vít + chân đế + bóng */}
      <rect x="10" y="126" width="280" height="12" rx="6" fill="#000" opacity=".1" />
      <rect x="-6" y="34" width="14" height="30" rx="4" fill={`url(#${uid}-ear)`} stroke="#8B95A1" />
      <rect x="292" y="34" width="14" height="30" rx="4" fill={`url(#${uid}-ear)`} stroke="#8B95A1" />
      <rect x="24" y="128" width="30" height="7" rx="3" fill="#374151" />
      <rect x="246" y="128" width="30" height="7" rx="3" fill="#374151" />
      <rect x="6" y="0" width="288" height="132" rx="10" fill={`url(#${uid}-case)`} stroke="#8C8472" strokeWidth="1.4" />
      <rect x="12" y="6" width="276" height="120" rx="7" fill="none" stroke="#D8CDB4" strokeWidth="1" />
      {[[16, 10], [284, 10]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}><circle cx={cx} cy={cy} r="2.6" fill="#CBD2DA" stroke="#8B95A1" strokeWidth=".7" /><path d={`M${cx - 1.6} ${cy}h3.2`} stroke="#6B7280" strokeWidth=".7" /></g>
      ))}

      {face === "front" ? (
        <>
          <text x="26" y="18" fontSize="7" fontWeight="900" fill="#8C8472" fontFamily={FONT} letterSpacing=".6">MC-964</text>
          {/* cửa sổ LED */}
          <rect x="22" y="21" width="112" height="55" rx="6" fill="#1F2937" />
          <rect x="26" y="24" width="104" height="48" rx="4" fill={`url(#${uid}-glass)`} stroke="#61252C" strokeWidth="1.6" />
          <path d="M28 27 h100 l-18 10 h-82 z" fill="#fff" opacity=".05" />
          <text x="30" y="98" fontFamily={FONT} fontSize="15" fontStyle="italic" fontWeight="900" fill="#C0392B">Phylab</text>
          <text x="30" y="110" fontFamily={FONT} fontSize="7" fontWeight="800" fill="#8C8472">Đồng hồ hiện số · 0,001 s</text>

          {/* núm MODE */}
          <g {...hit(onCycleMode)} role={interactive ? "button" : undefined} aria-label={interactive ? `Núm MODE đang ở ${modeLabel}; bấm để xoay` : undefined}>
            <circle cx="180" cy="50" r="30" fill="transparent" />
            <g fontFamily={FONT} fontSize="9" fontWeight="800" fill="#374151" textAnchor="middle">
              <text x="148" y="56">A</text><text x="157" y="30">B</text><text x="180" y="22">A+B</text><text x="204" y="30">A↔B</text><text x="212" y="56">T</text>
            </g>
            <circle cx="180" cy="50" r="21" fill="#9CA3AF" />
            <circle cx="180" cy="50" r="20" fill="none" stroke="#4B5563" strokeWidth="2.4" strokeDasharray="1.2 2.1" />
            <circle cx="180" cy="50" r="15.5" fill={`url(#${uid}-knob)`} stroke="#6B7280" strokeWidth="1" />
            <line x1={180 + 4 * Math.sin(rad)} y1={50 - 4 * Math.cos(rad)} x2={180 + 14 * Math.sin(rad)} y2={50 - 14 * Math.cos(rad)} stroke={C.navy} strokeWidth="3.4" strokeLinecap="round" />
            <text x="180" y="87" textAnchor="middle" fontSize="9" fill={C.orange} fontWeight="900" fontFamily={FONT}>MODE: {modeLabel}</text>
          </g>
          {/* RESET */}
          <g {...hit(onReset)} role={interactive ? "button" : undefined} aria-label={interactive ? "Nút Reset — đưa số về 0" : undefined}>
            <text x="250" y="29" textAnchor="middle" fontFamily={FONT} fontSize="9.5" fill="#374151" fontWeight="900">RESET</text>
            <circle cx="250" cy="48" r="14" fill="#D1D5DB" stroke="#9CA3AF" />
            <circle cx="250" cy="48" r="10.5" fill={`url(#${uid}-red)`} stroke="#7F1D1D" strokeWidth="1.2" />
          </g>
          {/* gạt thang đo */}
          <g {...hit(onToggleScale)} role={interactive ? "button" : undefined} aria-label={interactive ? `Thang đo ${scaleLabel}; bấm để đổi` : undefined}>
            <text x="234" y="96" fontFamily={FONT} fontSize="8" fill={scale === "coarse" ? C.orange : "#9CA3AF"} fontWeight="900">0.01</text>
            <text x="258" y="96" fontFamily={FONT} fontSize="8" fill={scale === "fine" ? C.orange : "#9CA3AF"} fontWeight="900">0.001</text>
            <rect x="232" y="100" width="40" height="12" rx="6" fill="#6B7280" stroke="#4B5563" strokeWidth=".8" />
            <circle cx={scale === "fine" ? 264 : 240} cy="106" r="5.4" fill="#F9FAFB" stroke="#4B5563" strokeWidth=".9" />
            <text x="252" y="124" textAnchor="middle" fontFamily={FONT} fontSize="8" fontWeight="800" fill="#4B5563">Thang đo ({scaleLabel})</text>
          </g>
        </>
      ) : (
        <>
          <text x="26" y="18" fontSize="7" fontWeight="900" fill="#8C8472" fontFamily={FONT} letterSpacing=".6">MC-964 · MẶT SAU</text>
          {["A", "B", "C"].map((s) => {
            const cx = sockets[s];
            const p = plug(s);
            const hot = hotSockets && s !== "C";
            return (
              <g key={s} {...hit(p ? () => onUnplug?.(s) : null)} role={interactive && p ? "button" : undefined} aria-label={interactive && p ? `Rút dây ở ổ ${s}` : undefined}>
                <circle cx={cx} cy="52" r="17" fill="#CBD2DA" stroke={hot ? C.orange : "#8B95A1"} strokeWidth={hot ? 3 : 1.2} />
                <circle cx={cx} cy="52" r="13" fill="#1F2937" stroke="#0B0F19" />
                <circle cx={cx} cy="52" r="7.5" fill="#0B0F19" />
                {[0, 90, 180, 270].map((a) => <circle key={a} cx={cx + 9.8 * Math.cos((a * Math.PI) / 180)} cy={52 + 9.8 * Math.sin((a * Math.PI) / 180)} r="1.3" fill="#9CA3AF" />)}
                {p && <circle cx={cx} cy="52" r="6" fill={p.color} stroke="#fff" strokeWidth="1.2" />}
                <text x={cx} y="84" textAnchor="middle" fontFamily={FONT} fontSize="11" fill="#1F2937" fontWeight="900">{s}</text>
                {p && <text x={cx} y="33" textAnchor="middle" fontFamily={FONT} fontSize="9" fill={p.color} fontWeight="900">{p.text}</text>}
              </g>
            );
          })}
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={30 + i * 34} y="104" width="24" height="3.4" rx="1.7" fill="#D8CDB4" />)}
          <text x="222" y="117" textAnchor="end" fontFamily={FONT} fontSize="9" fontStyle="italic" fontWeight="800" fill="#4B5563">+10V</text>
          <g {...hit(onTogglePower)} role={interactive ? "button" : undefined} aria-label={interactive ? (power ? "Tắt nguồn đồng hồ" : "Bật nguồn đồng hồ") : undefined}>
            <rect x="236" y="24" width="30" height="50" rx="5" fill="#1F2937" stroke="#0B0F19" />
            <rect x="239" y={power ? 27 : 49} width="24" height="22" rx="3" fill={power ? "#16A34A" : "#B91C1C"} stroke="#0B0F19" strokeWidth=".8" />
            <text x="251" y={power ? 42 : 64} textAnchor="middle" fontFamily={FONT} fontSize="11" fill="#fff" fontWeight="900">{power ? "I" : "O"}</text>
            <circle cx="251" cy="84" r="2.6" fill={power ? "#4ADE80" : "#4B5563"} />
            <text x="251" y="96" textAnchor="middle" fontFamily={FONT} fontSize="8" fontWeight="800" fill="#374151">Nguồn {power ? "BẬT" : "TẮT"}</text>
          </g>
        </>
      )}
    </g>
  );
});

/* ================================ BÀI 11 ================================ */

/**
 * Máng đứng + khối kẹp + đế 3 chân (toạ độ màn hình). Trục máng x = `x`; thước chia cm từ `y0`
 * (vạch 0 = mặt dưới nam châm) xuống, `pxPerM` px/ mét, tới `scaleBottom`. Vít cân bằng (bấm)
 * ở khối kẹp tại (`screwX`, `screwY`); đệm hứng trụ thép trên mặt bàn.
 */
export const FallRail11 = memo(function FallRail11({ x, top, floor, y0, pxPerM, scaleBottom, sMax = 0.8, screwX, screwY, balanced = false, onToggleBalance = null }) {
  const uid = useUid();
  const clampTop = screwY - 14, clampBot = screwY + 14;
  const hub = floor - 58;
  let ticks = "";
  for (let cm = 0; cm <= Math.round(sMax * 100); cm++) {
    const y = +(y0 + (cm / 100) * pxPerM).toFixed(2);
    if (y > scaleBottom + 0.5) break;
    ticks += `M${x + 12} ${y}h${cm % 10 === 0 ? -9 : cm % 5 === 0 ? -6 : -3.5}`;
  }
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-alu`} x1="0" y1="0" x2="1" y2="0"><MetalStops tones={[[0, "#AEB6C1"], [0.18, "#EEF1F5"], [0.5, "#FFFFFF"], [0.82, "#D5DAE1"], [1, "#9AA3AE"]]} /></linearGradient>
        <linearGradient id={`${uid}-iron`} x1="0" y1="0" x2="0" y2="1"><MetalStops tones={DARK} /></linearGradient>
        <linearGradient id={`${uid}-rod`} x1="0" y1="0" x2="1" y2="0"><MetalStops tones={ALU} /></linearGradient>
        <linearGradient id={`${uid}-brass`} x1="0" y1="0" x2="1" y2="1"><MetalStops tones={BRASS} /></linearGradient>
      </defs>
      <ellipse cx={x} cy={floor + 1} rx="74" ry="5" fill="#000" opacity=".12" />
      {/* đế 3 chân + trụ đỡ */}
      <path d={`M${x - 16} ${hub + 12} L${x - 66} ${floor - 4} L${x - 54} ${floor - 4} L${x - 6} ${hub + 18} Z`} fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth="1.3" strokeLinejoin="round" />
      <path d={`M${x + 16} ${hub + 12} L${x + 66} ${floor - 4} L${x + 54} ${floor - 4} L${x + 6} ${hub + 18} Z`} fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth="1.3" strokeLinejoin="round" />
      {[x - 60, x + 60].map((fx) => (
        <g key={fx}>
          <rect x={fx - 2} y={floor - 12} width="4" height="9" fill="#9CA3AF" />
          <rect x={fx - 7} y={floor - 14} width="14" height="4" rx="2" fill={`url(#${uid}-brass)`} stroke="#7A5C0A" strokeWidth=".8" />
          <rect x={fx - 8} y={floor - 4} width="16" height="4" rx="2" fill="#111827" />
        </g>
      ))}
      <rect x={x - 4.5} y={clampBot} width="9" height={hub - clampBot + 4} rx="2.5" fill={`url(#${uid}-rod)`} stroke="#6B7280" strokeWidth="1" />
      <rect x={x - 26} y={hub} width="52" height="22" rx="8" fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth="1.3" />
      <rect x={x - 21} y={hub + 2.5} width="42" height="3.5" rx="1.7" fill="#fff" opacity=".18" />
      <text x={x} y={hub + 16.5} textAnchor="middle" fontSize="11" fontWeight="900" fill="#F5A623" fontStyle="italic" fontFamily={FONT}>φ</text>
      {/* đệm hứng trụ thép */}
      <rect x={x - 17} y={floor - 5} width="34" height="7" rx="3" fill="#1F2937" />
      <rect x={x - 15} y={floor - 7} width="30" height="4" rx="2" fill="#F97316" opacity=".85" />
      {/* thân máng nhôm + rãnh dẫn */}
      <rect x={x - 10} y={top + 6} width="22" height={clampTop - top - 2} rx="3" fill="#000" opacity=".08" transform="translate(3 0)" />
      <rect x={x - 12} y={top + 4} width="24" height={clampTop - top} rx="3" fill={`url(#${uid}-alu)`} stroke="#7B8794" strokeWidth="1.2" />
      <rect x={x - 3} y={top + 8} width="6" height={clampTop - top - 8} rx="2" fill="#8B95A1" opacity=".55" />
      <rect x={x - 14} y={top} width="28" height="8" rx="3" fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth="1.1" />
      {/* thước chia cm: vạch 0 ở mặt dưới nam châm, số mỗi 10 cm bên phải */}
      <path d={ticks} stroke="#1F2937" strokeWidth="1" />
      {Array.from({ length: Math.floor(sMax * 10) + 1 }, (_, i) => {
        const y = y0 + (i / 10) * pxPerM;
        return y <= scaleBottom + 0.5 ? <text key={i} x={x + 15} y={y + 3} fontSize="7.5" fontWeight="900" fill="#475569" fontFamily={FONT}>{i * 10}</text> : null;
      })}
      {/* khối kẹp + vít cân bằng */}
      <rect x={x - 34} y={clampTop} width="68" height={clampBot - clampTop} rx="6" fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth="1.3" />
      <rect x={x - 30} y={clampTop + 3} width="60" height="3.5" rx="1.7" fill="#fff" opacity=".18" />
      <rect x={screwX + 6} y={screwY - 2} width={x - 34 - screwX - 6} height="4" fill="#9CA3AF" />
      <g onClick={onToggleBalance || undefined} style={onToggleBalance ? { cursor: "pointer" } : undefined} role={onToggleBalance ? "button" : undefined}
        aria-label={onToggleBalance ? (balanced ? "Vít cân bằng: đã cân" : "Vít cân bằng — bấm để chỉnh") : undefined}>
        <circle cx={screwX} cy={screwY} r="14" fill="transparent" />
        <rect x={screwX - 8} y={screwY - 9} width="14" height="18" rx="4" fill={balanced ? C.good : "#E0B021"} stroke={balanced ? "#14532D" : "#7A5C0A"} strokeWidth="1.3" />
        <path d={`M${screwX - 5} ${screwY - 9}v18M${screwX - 2} ${screwY - 9}v18M${screwX + 1} ${screwY - 9}v18M${screwX + 4} ${screwY - 9}v18`} stroke="#fff" strokeOpacity=".4" strokeWidth="1" />
      </g>
    </g>
  );
});

/**
 * Nam châm điện trên đỉnh máng (toạ độ màn hình): mặt cực (lõi sắt) nằm ở y = `y0` — đúng đỉnh trụ thép
 * khi đang hút; cuộn dây đồng phía trên, dây dẫn sang đầu nối NC bên trái tại `term`.
 */
export const Magnet11 = memo(function Magnet11({ x, y0, on = true, term = null }) {
  const uid = useUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-coil`} x1="0" y1="0" x2="1" y2="0"><MetalStops tones={[[0, "#7C2D12"], [0.3, "#EA7A36"], [0.55, "#FDBA74"], [1, "#9A3412"]]} /></linearGradient>
        <linearGradient id={`${uid}-core`} x1="0" y1="0" x2="1" y2="0"><MetalStops tones={ALU} /></linearGradient>
        <linearGradient id={`${uid}-iron`} x1="0" y1="0" x2="0" y2="1"><MetalStops tones={DARK} /></linearGradient>
      </defs>
      {term && <path d={`M${x - 13} ${y0 - 15} C${x - 20} ${y0 - 15} ${term.x + 6} ${term.y} ${term.x} ${term.y}`} fill="none" stroke="#B45309" strokeWidth="1.6" />}
      <rect x={x - 17} y={y0 - 30} width="34" height="5" rx="2.2" fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth="1" />
      <rect x={x - 14} y={y0 - 26} width="28" height="18" rx="3" fill={`url(#${uid}-coil)`} stroke="#431407" strokeWidth="1" opacity={on ? 1 : 0.7} />
      <path d={Array.from({ length: 6 }, (_, i) => `M${x - 14} ${y0 - 23.5 + i * 2.7}h28`).join("")} stroke="#431407" strokeWidth=".7" opacity=".4" />
      <rect x={x - 17} y={y0 - 8.5} width="34" height="4" rx="1.5" fill={`url(#${uid}-iron)`} stroke="#111827" strokeWidth=".8" />
      <rect x={x - 7} y={y0 - 5} width="14" height="5" rx="1" fill={`url(#${uid}-core)`} stroke="#475569" strokeWidth=".9" />
      <circle cx={x + 11} cy={y0 - 27.5} r="2.2" fill={on ? "#4ADE80" : "#4B5563"} stroke="#14532D" strokeWidth=".7" />
      {on && <circle cx={x + 11} cy={y0 - 27.5} r="4.2" fill="#4ADE80" opacity=".3" />}
    </g>
  );
});

/**
 * Dây dọi Bài 11 (toạ độ màn hình): tay treo gắn máng tới (x, y), dây dài `length`, quả dọi đồng;
 * lệch `offset` px khi giá chưa cân bằng (dây vàng) — cân bằng thì dây thẳng đứng (xanh).
 */
export const Plumb11 = memo(function Plumb11({ x, y, armFrom, length = 86, offset = 0, ok = false }) {
  const uid = useUid();
  const bx = x + offset, by = y + length;
  const ink = ok ? C.good : "#C9A227";
  return (
    <g style={{ pointerEvents: "none" }}>
      <defs>
        <linearGradient id={`${uid}-bob`} x1="0" y1="0" x2="1" y2="0"><MetalStops tones={BRASS} /></linearGradient>
      </defs>
      <rect x={armFrom} y={y - 2.5} width={x - armFrom + 3} height="5" rx="2" fill="#6B7280" stroke="#374151" strokeWidth=".8" />
      <line x1={x} y1={y} x2={bx} y2={by - 11} stroke={ink} strokeWidth="1.3" />
      <path d={`M${bx - 4.5} ${by - 9} Q${bx - 4.5} ${by - 12} ${bx} ${by - 12} Q${bx + 4.5} ${by - 12} ${bx + 4.5} ${by - 9} L${bx + 0.7} ${by} L${bx - 0.7} ${by} Z`} fill={`url(#${uid}-bob)`} stroke="#7A5C0A" strokeWidth=".8" strokeLinejoin="round" />
      <circle cx={x} cy={y} r="2.2" fill="#475569" />
      <path d={`M${x - 7} ${y + length + 4}h14`} stroke={ink} strokeWidth="2" strokeLinecap="round" opacity=".8" />
    </g>
  );
});

/** Trụ thép (góc trên-trái tại (x − 7, y), 14 × 22): mặt trụ bóng + mặt đáy elip. */
export const SteelCylinder = memo(function SteelCylinder({ x, y, w = 14, h = 22 }) {
  const uid = useUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="1" y2="0"><MetalStops tones={[[0, "#4B5563"], [0.28, "#E5E7EB"], [0.45, "#FFFFFF"], [0.75, "#9CA3AF"], [1, "#374151"]]} /></linearGradient>
      </defs>
      <rect x={x - w / 2} y={y + 1.5} width={w} height={h - 3} fill={`url(#${uid}-steel)`} stroke="#1F2937" strokeWidth=".9" />
      <ellipse cx={x} cy={y + h - 1.5} rx={w / 2} ry="1.8" fill="#6B7280" stroke="#1F2937" strokeWidth=".9" />
      <ellipse cx={x} cy={y + 1.5} rx={w / 2} ry="1.8" fill="#E5E7EB" stroke="#1F2937" strokeWidth=".9" />
    </g>
  );
});

/**
 * Cổng quang Bài 11 (gốc tại tia, nhìn chính diện): hai càng chữ U ôm máng — càng trái phát tia hồng ngoại,
 * càng phải thu; khe giữa để trụ thép rơi qua (nhìn thấy trụ cắt tia). `part`: "back" = thanh nối phía sau máng,
 * "front" = hai càng + đèn báo.
 */
export const Photogate11 = memo(function Photogate11({ part = "front", blocked = false }) {
  const uid = useUid();
  if (part === "back") {
    return <rect x="-38" y="3" width="76" height="12" rx="5" fill="#111827" stroke="#0B0F19" strokeWidth="1" />;
  }
  const arm = (x0) => (
    <g>
      <rect x={x0 + 1.5} y="-14" width="18" height="34" rx="5" fill="#000" opacity=".12" />
      <rect x={x0} y="-17" width="18" height="34" rx="5" fill={`url(#${uid}-body)`} stroke="#0F172A" strokeWidth="1.2" />
      <rect x={x0 + 3} y="-15" width="3" height="28" rx="1.5" fill="#fff" opacity=".14" />
    </g>
  );
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="0"><MetalStops tones={[[0, "#475569"], [0.45, "#334155"], [1, "#1E293B"]]} /></linearGradient>
      </defs>
      {arm(-40)}
      {arm(22)}
      <rect x="-23.5" y="-3.5" width="3" height="7" rx="1.2" fill={blocked ? "#FF3B3B" : "#7F1D1D"} />
      <rect x="20.5" y="-3.5" width="3" height="7" rx="1.2" fill="#0B1220" stroke="#475569" strokeWidth=".6" />
      <circle cx="31" cy="-11" r="2.4" fill={blocked ? "#FF3B3B" : "#5B1A1A"} stroke="#1F2937" strokeWidth=".7" />
      {blocked && <circle cx="31" cy="-11" r="4.6" fill="#FF3B3B" opacity=".35" />}
      <text x="-31" y="12" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#94A3B8" fontFamily={FONT}>PHÁT</text>
      <text x="31" y="12" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#94A3B8" fontFamily={FONT}>THU</text>
    </g>
  );
});

/**
 * Hộp công tắc kép (toạ độ trong hộp 92 × 66): nút nhấn đỏ phía trên; đèn NC (nam châm) và ĐH (đồng hồ);
 * ổ cắm hai bên hông ở (4, 34) và (88, 34). `armed` = nam châm đang được cấp điện (chưa thả).
 */
export const SwitchBox11 = memo(function SwitchBox11({ armed = true, w = 92, h = 66 }) {
  const uid = useUid();
  const press = armed ? 0 : 4;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-case`} x1="0" y1="0" x2="0" y2="1"><MetalStops tones={[[0, "#F8FAFC"], [0.6, "#E2E8F0"], [1, "#CBD5E1"]]} /></linearGradient>
        <radialGradient id={`${uid}-btn`} cx="38%" cy="30%" r="75%"><MetalStops tones={armed ? [[0, "#FCA5A5"], [0.5, "#DC2626"], [1, "#7F1D1D"]] : [[0, "#E5E7EB"], [0.5, "#9CA3AF"], [1, "#4B5563"]]} /></radialGradient>
      </defs>
      <rect x="7" y="22" width={w - 12} height={h - 20} rx="9" fill="#000" opacity=".1" />
      {[4, w - 4].map((cx) => <rect key={cx} x={cx - 5} y="28" width="10" height="12" rx="3" fill="#111827" />)}
      <rect x="6" y="18" width={w - 12} height={h - 22} rx="9" fill={`url(#${uid}-case)`} stroke="#64748B" strokeWidth="1.3" />
      <rect x={w / 2 - 13} y="12" width="26" height="8" rx="2" fill="#475569" />
      <g transform={`translate(0 ${press})`}>
        <rect x={w / 2 - 15} y="2" width="30" height="12" rx="6" fill={`url(#${uid}-btn)`} stroke={armed ? "#7F1D1D" : "#374151"} strokeWidth="1.2" />
        <rect x={w / 2 - 10} y="4" width="12" height="3" rx="1.5" fill="#fff" opacity=".5" />
      </g>
      <text x={w / 2} y="33" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#334155" fontFamily={FONT}>CÔNG TẮC KÉP</text>
      {[["NC", w / 2 - 16], ["ĐH", w / 2 + 16]].map(([label, cx]) => (
        <g key={label}>
          <circle cx={cx} cy="44" r="3.4" fill={armed ? "#4ADE80" : "#94A3B8"} stroke="#334155" strokeWidth=".8" />
          <text x={cx} y="56" textAnchor="middle" fontSize="7" fontWeight="900" fill="#475569" fontFamily={FONT}>{label}</text>
        </g>
      ))}
      <text x={w / 2} y="47" textAnchor="middle" fontSize="7" fontWeight="900" fill={armed ? "#15803D" : "#B91C1C"} fontFamily={FONT}>{armed ? "GIỮ" : "THẢ"}</text>
    </g>
  );
});

/* ======================= Biểu tượng khay dụng cụ ======================= */
const ICON = {
  // Bài 6
  standL6: { vb: "-52 0 104 212", draw: () => <StandLeft6 x={0} top={6} floor={206} clampY={46} /> },
  standR6: { vb: "-34 -14 70 124", draw: () => (<g><StandRight6 x={0} top={4} floor={106} /><StandScrew6 x={0} floor={106} /></g>) },
  rail6: { vb: "10 20 770 160", draw: () => <Rail6 chute={[[74, 42], [100, 64], [126, 92], [152, 116], [185, 130]]} /> },
  plumb6: { vb: "-12 -4 24 66", draw: () => <Plumb6 length={58} /> },
  magnet6: { vb: "-15 -14 42 30", draw: () => (<g><Magnet6 on /><SteelBall x={16} y={2} r={7.5} /></g>) },
  gate6: { vb: "-15 -27 30 50", draw: () => <Photogate6 /> },
  clock: { vb: "-8 -2 316 142", draw: () => <MC964Face interactive={false} led="0.000" modeLabel="A↔B" modeAngle={25} scaleLabel="0,001 s" /> },
  // Bài 11
  rail11: { vb: "-80 6 160 450", draw: () => <FallRail11 x={0} top={10} floor={450} y0={30} pxPerM={320} scaleBottom={286} screwX={-50} screwY={314} /> },
  magnet11: { vb: "-22 -34 44 40", draw: () => <Magnet11 x={0} y0={0} /> },
  switch11: { vb: "-4 0 100 68", draw: () => <SwitchBox11 armed /> },
  gate11: { vb: "-44 -22 88 44", draw: () => (<g><Photogate11 part="back" /><Photogate11 /></g>) },
};

/**
 * Hình dụng cụ cho khay / ghost khi kéo / vật đang bay vào bàn — cùng bản vẽ với bàn thí nghiệm.
 * Trong SVG khác: truyền x, y (toạ độ viewBox cha) để lồng như một <svg> con.
 */
export function MechIcon({ kind, size = 34, x, y, style }) {
  const def = ICON[kind];
  if (!def) return null;
  return (
    <svg x={x} y={y} width={size} height={size} viewBox={def.vb} preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ overflow: "visible", ...style }}>
      {def.draw()}
    </svg>
  );
}
