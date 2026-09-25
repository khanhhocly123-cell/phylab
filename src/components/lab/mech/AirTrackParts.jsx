"use client";

import { memo, useId } from "react";
import { Hand } from "lucide-react";
import { C, FONT } from "../../../engine/tokens.js";
import { MC964Face } from "./MechParts.jsx";

/* ============================================================================
   AirTrackParts — dụng cụ Bài 15 (Vật lí 10 KNTT) "Thí nghiệm minh hoạ định luật 2 Newton",
   vẽ bằng SVG theo đúng Hình 15.2 của SGK: (1) tấm chắn sáng, (2) máng trượt đệm khí,
   (3)(4) cổng quang điện 1 và 2, (5) ròng rọc, (6) các quả nặng, (7) đồng hồ đo thời gian hiện số,
   (8) cân điện tử, (9) bơm khí — cùng xe trượt M = 200 g buộc dây vắt qua ròng rọc.

   Mọi linh kiện vẽ trong CÙNG một hệ toạ độ cảnh (AT) nên bench, Prelab và biểu tượng khay dùng
   chung một bản vẽ. Không dùng filter (bóng đổ = hình mờ lệch) để hoạt ảnh nhẹ.
   ========================================================================== */

const useUid = () => useId().replace(/[^a-zA-Z0-9]/g, "");
function Stops({ tones }) {
  return tones.map(([offset, color]) => <stop key={offset} offset={offset} stopColor={color} />);
}
const ALU = [[0, "#F8FAFC"], [0.35, "#D9DEE5"], [0.7, "#A7B0BC"], [1, "#CBD2DA"]];
const STEEL_DARK = [[0, "#5B6472"], [0.45, "#374151"], [1, "#1F2937"]];

/** Hệ toạ độ cảnh Bài 15 (viewBox 900 × 520). PXM = đơn vị viewBox cho 1 mét. */
export const AT = {
  VBW: 900, VBH: 520,
  PXM: 280,
  TABLE_BACK: 250, TABLE_FRONT: 420, APRON: 436, EDGE_X: 792, FLOOR_Y: 500,
  TRACK_L: 204, TRACK_R: 790, TRACK_TOP: 236, TRACK_H: 16, FEET_Y: 262, FOOT_XS: [250, 752],
  RULER_X0: 224,                 // vạch 0 cm của thước dọc máng
  G1_CM: 40,                     // cổng quang 1 đặt ở vạch 40 cm
  FLAG_W: 28, FLAG_TOP: 194,     // tấm chắn sáng 10 cm (28 đơn vị), mép trên
  GLIDER_BACK: 42, GLIDER_FRONT: 14, GLIDER_TOP: 216,
  STRING_Y: 224,
  PULLEY: { x: 802, y: 234, r: 10 },
  HANG_X: 812, HOOK_Y0: 272, DISC_H: 6, PAD_Y: 494,
  PUMP: { x: 84, y: 200, w: 110, h: 62 },
  BOX: { x: 30, y: 352, w: 140, h: 58 },
  SCALE: { x: 190, y: 366, w: 118, h: 48 },
  CLK: { x: 352, y: 322, s: 0.62 },
};
/** x (viewBox) của vạch `cm` trên thước dọc máng. */
export const rulerX = (cm) => AT.RULER_X0 + (cm / 100) * AT.PXM;
export const G1_X = rulerX(AT.G1_CM);
/** Chiều cao chồng quả treo (móc + thanh + đĩa đế + n quả). */
export const hangerHeight = (n) => 14 + n * AT.DISC_H + 3;
/** Móc treo ở HOOK_Y0 khi mép tấm chắn nằm sát cổng 1; xe lùi/tiến bao nhiêu thì móc lên/xuống bấy nhiêu. */
export const hookYOf = (xs) => AT.HOOK_Y0 + (xs - G1_X);
/** Quãng (m) xe đi được TÍNH TỪ vị trí sát cổng 1 thì đáy chồng quả treo chạm đệm hứng. */
export const dropOf = (n) => (AT.PAD_Y - (AT.HOOK_Y0 + hangerHeight(n))) / AT.PXM;

/* ============================== Phòng: tường, bàn, sàn ============================== */
/** Tường kẻ ô, mặt bàn nhìn chếch (máng ở mép sau, đồng hồ/cân ở mép trước), mép bàn phải để quả
 *  nặng treo thả xuống sàn; vẽ TRÀN ra ngoài cảnh (`bleed`) vì viewBox tự nới theo khung. */
function AirTrackRoomView({ bleed = 700 }) {
  const uid = useUid();
  const { VBW, TABLE_BACK, TABLE_FRONT, APRON, EDGE_X, FLOOR_Y } = AT;
  const L = -bleed, R = VBW + bleed;
  return (
    <g style={{ pointerEvents: "none" }}>
      <defs>
        <pattern id={`${uid}-grid`} width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M36 0H0V36" fill="none" stroke="#EFE5D3" strokeWidth="1" />
        </pattern>
        <linearGradient id={`${uid}-top`} gradientUnits="userSpaceOnUse" x1="0" y1={TABLE_BACK} x2="0" y2={TABLE_FRONT}>
          <Stops tones={[[0, "#D7B184"], [0.5, "#E2C096"], [1, "#EBD1AA"]]} />
        </linearGradient>
        <linearGradient id={`${uid}-under`} gradientUnits="userSpaceOnUse" x1="0" y1={APRON} x2="0" y2={FLOOR_Y}>
          <Stops tones={[[0, "#E7DCCB"], [1, "#F4EEE3"]]} />
        </linearGradient>
      </defs>
      {/* tường */}
      <rect x={L} y={-bleed} width={R - L} height={FLOOR_Y + bleed} fill={`url(#${uid}-grid)`} opacity="0.75" />
      {/* gầm bàn: tối dần về phía mép bàn */}
      <rect x={L} y={APRON} width={EDGE_X - L} height={FLOOR_Y - APRON} fill={`url(#${uid}-under)`} opacity=".85" />
      {/* chân bàn */}
      {[36, EDGE_X - 34].map((x) => <rect key={x} x={x} y={APRON} width="16" height={FLOOR_Y - APRON} fill="#B98B58" stroke="#8A6236" strokeWidth="1" />)}
      {/* sàn phòng */}
      <rect x={L} y={FLOOR_Y} width={R - L} height={bleed} fill="#E9E2D6" />
      <rect x={L} y={FLOOR_Y} width={R - L} height="2" fill="#CFC4B2" />
      {/* mặt bàn + mép trước + cạnh phải */}
      <rect x={L} y={TABLE_BACK} width={EDGE_X - L} height={TABLE_FRONT - TABLE_BACK} fill={`url(#${uid}-top)`} />
      <rect x={L} y={TABLE_BACK} width={EDGE_X - L} height="2" fill="#B98B58" opacity=".6" />
      {[0.34, 0.62, 0.86].map((f) => (
        <path key={f} d={`M${L} ${TABLE_BACK + f * (TABLE_FRONT - TABLE_BACK)} C${EDGE_X * 0.3} ${TABLE_BACK + f * 170 - 6} ${EDGE_X * 0.62} ${TABLE_BACK + f * 170 + 7} ${EDGE_X} ${TABLE_BACK + f * 170 - 2}`}
          fill="none" stroke="#9A6B37" strokeOpacity=".13" strokeWidth="1.3" />
      ))}
      <rect x={L} y={TABLE_FRONT} width={EDGE_X - L} height={APRON - TABLE_FRONT} fill="#C4935E" />
      <rect x={L} y={TABLE_FRONT} width={EDGE_X - L} height="2.5" fill="#F3DDBB" />
      <path d={`M${EDGE_X} ${TABLE_BACK} L${EDGE_X + 7} ${TABLE_BACK + 5} L${EDGE_X + 7} ${APRON + 4} L${EDGE_X} ${APRON} Z`} fill="#A87A48" />
      {/* đệm hứng quả nặng dưới sàn */}
      <rect x={AT.HANG_X - 20} y={AT.PAD_Y} width="40" height={FLOOR_Y - AT.PAD_Y + 2} rx="2" fill="#475569" />
      <rect x={AT.HANG_X - 20} y={AT.PAD_Y} width="40" height="2" rx="1" fill="#94A3B8" />
    </g>
  );
}
export const AirTrackRoom = memo(AirTrackRoomView);

/* ============================== (2) Máng trượt đệm khí ============================== */
/**
 * Máng nhôm dài (TRACK_L → TRACK_R), mặt trên có hàng lỗ thổi khí, mặt trước có thước cm (vạch 0 tại
 * RULER_X0). Hai chân đế; chân trái có vít chỉnh thăng bằng (bấm) + ống thuỷ trên đầu máng.
 * pump = đang thổi khí (tia khí nhỏ phía trên lỗ). level = máng đã nằm ngang (bọt khí vào giữa).
 */
/** @param {{ level?: boolean, pump?: boolean | number, onScrew?: (() => void) | null, dim?: boolean }} props */
function AirTrack15View({ level = false, pump = false, onScrew = null, dim = false }) {
  const uid = useUid();
  const { TRACK_L, TRACK_R, TRACK_TOP, TRACK_H, FEET_Y, FOOT_XS } = AT;
  const W = TRACK_R - TRACK_L;
  const ticks = [];
  for (let cm = 0; cm <= 200; cm += 1) {
    const x = rulerX(cm);
    if (x > TRACK_R - 6) break;
    const major = cm % 10 === 0, mid = cm % 5 === 0;
    ticks.push(`M${x.toFixed(1)} ${TRACK_TOP + 6}v${major ? 6 : mid ? 4 : 2.4}`);
  }
  const holes = [];
  for (let x = TRACK_L + 26; x < TRACK_R - 14; x += 9) holes.push(x);
  const bubbleDx = level ? 0 : 6;
  return (
    <g opacity={dim ? 0.55 : 1}>
      <defs>
        <linearGradient id={`${uid}-alu`} x1="0" y1="0" x2="0" y2="1"><Stops tones={ALU} /></linearGradient>
        <linearGradient id={`${uid}-foot`} x1="0" y1="0" x2="1" y2="0"><Stops tones={STEEL_DARK} /></linearGradient>
      </defs>
      {/* bóng máng trên mặt bàn */}
      <rect x={TRACK_L + 6} y={FEET_Y - 3} width={W - 8} height="6" rx="3" fill="#000" opacity=".1" />
      {/* chân đế + vít chỉnh */}
      {FOOT_XS.map((x, i) => (
        <g key={x}>
          <rect x={x - 11} y={TRACK_TOP + TRACK_H} width="22" height={FEET_Y - TRACK_TOP - TRACK_H - 2} rx="2" fill={`url(#${uid}-foot)`} />
          <rect x={x - 15} y={FEET_Y - 3} width="30" height="4" rx="2" fill="#1F2937" />
          {i === 0 && (
            <g role={onScrew ? "button" : undefined} aria-label={onScrew ? (level ? "Vít chỉnh thăng bằng (máng đã nằm ngang)" : "Vít chỉnh thăng bằng — bấm để vặn") : undefined}
              onClick={onScrew || undefined} style={{ cursor: onScrew ? "pointer" : "default" }}>
              <circle cx={x} cy={FEET_Y + 5} r="13" fill="transparent" />
              <rect x={x - 7} y={FEET_Y - 1} width="14" height="9" rx="2.5" fill={level ? "#16A34A" : "#EAB308"} stroke={level ? "#14532D" : "#854D0E"} strokeWidth="1" />
              {[-4, -1.3, 1.3, 4].map((d) => <line key={d} x1={x + d} y1={FEET_Y + 0.5} x2={x + d} y2={FEET_Y + 6.5} stroke="#0003" strokeWidth=".8" />)}
            </g>
          )}
        </g>
      ))}
      {/* thân máng */}
      <rect x={TRACK_L} y={TRACK_TOP} width={W} height={TRACK_H} rx="2" fill={`url(#${uid}-alu)`} stroke="#7B8794" strokeWidth="1.1" />
      <rect x={TRACK_L} y={TRACK_TOP} width={W} height="3" fill="#FFFFFF" opacity=".75" />
      <rect x={TRACK_L} y={TRACK_TOP + 5} width={W} height={TRACK_H - 6} fill="#F8FAFC" opacity=".55" />
      {/* hàng lỗ thổi khí */}
      {holes.map((x) => <circle key={x} cx={x} cy={TRACK_TOP + 1.6} r=".9" fill="#64748B" />)}
      {/* thước cm */}
      <path d={ticks.join("")} stroke="#334155" strokeWidth=".7" />
      {Array.from({ length: 21 }, (_, i) => i * 10).filter((cm) => rulerX(cm) < TRACK_R - 10).map((cm) => (
        <text key={cm} x={rulerX(cm)} y={TRACK_TOP + TRACK_H - 0.5} textAnchor="middle" fontSize="4.6" fontWeight="800" fill="#1F2937" fontFamily={FONT}>{cm}</text>
      ))}
      {/* đầu máng trái (cửa khí) + đầu phải (đệm cao su chặn xe) */}
      <rect x={TRACK_L - 6} y={TRACK_TOP - 4} width="12" height={TRACK_H + 8} rx="2" fill="#475569" stroke="#1F2937" strokeWidth="1" />
      <rect x={TRACK_R - 6} y={TRACK_TOP - 6} width="8" height={TRACK_H + 10} rx="2" fill="#475569" stroke="#1F2937" strokeWidth="1" />
      <rect x={TRACK_R - 9} y={TRACK_TOP - 3} width="4" height="10" rx="2" fill="#111827" />
      {/* ống thuỷ trên đầu máng: bọt khí vào giữa = máng nằm ngang */}
      <g>
        <rect x={TRACK_L + 14} y={TRACK_TOP - 9} width="30" height="8" rx="4" fill="#D9F99D" stroke="#65A30D" strokeWidth="1" />
        <line x1={TRACK_L + 26} y1={TRACK_TOP - 9} x2={TRACK_L + 26} y2={TRACK_TOP - 1} stroke="#3F6212" strokeWidth=".7" />
        <line x1={TRACK_L + 32} y1={TRACK_TOP - 9} x2={TRACK_L + 32} y2={TRACK_TOP - 1} stroke="#3F6212" strokeWidth=".7" />
        <ellipse cx={TRACK_L + 29 + bubbleDx} cy={TRACK_TOP - 5} rx="4.2" ry="2.3" fill="#fff" stroke="#65A30D" strokeWidth=".6" />
      </g>
      {/* tia khí khi máy nén khí chạy — nấc lưu lượng càng lớn tia càng dày, càng cao */}
      {pump ? (
        <g style={{ pointerEvents: "none" }} stroke="#7DD3FC" strokeWidth={pump === 1 ? 0.8 : 1} strokeLinecap="round">
          <animate attributeName="opacity" values={pump === 1 ? ".15;.45;.15" : ".25;.8;.25"} dur="0.9s" repeatCount="indefinite" />
          {holes.filter((_, i) => i % (pump === 1 ? 5 : pump === 3 ? 2 : 3) === 0).map((x) => (
            <line key={x} x1={x} y1={TRACK_TOP - 1.5} x2={x} y2={TRACK_TOP - (pump === 1 ? 3.5 : pump === 3 ? 6.5 : 5)} />
          ))}
        </g>
      ) : null}
    </g>
  );
}
export const AirTrack15 = memo(AirTrack15View);

/* ============================== (9) Bơm khí ============================== */
/** Máy nén khí (bơm khí) của máng: quạt thổi, công tắc nguồn (bấm), núm lưu lượng 1–3 (bấm để vặn) và ống dẫn
 *  khí mềm nối vào đầu máng. Nấc 1 (yếu) đệm khí mỏng, xe còn cọ máng; nấc 2–3 xe nổi hẳn. */
/** @param {{ on?: boolean, flow?: number, hose?: boolean, onToggle?: (() => void) | null, onKnob?: (() => void) | null }} props */
function AirPump15View({ on = false, flow = 2, hose = true, onToggle = null, onKnob = null }) {
  const uid = useUid();
  const { x, y, w, h } = AT.PUMP;
  const inletX = AT.TRACK_L - 6, inletY = AT.TRACK_TOP + AT.TRACK_H / 2;
  const hosePath = `M${x + w - 2} ${y + 22} C${x + w + 8} ${y + 22}, ${inletX - 10} ${inletY}, ${inletX} ${inletY}`;
  const knobAngle = [-60, -60, 0, 60][flow] ?? 0;
  const spin = ["0.5s", "0.5s", "0.3s", "0.18s"][flow] ?? "0.3s";
  const kx = x + 88, ky = y + 38;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-case`} x1="0" y1="0" x2="0" y2="1"><Stops tones={[[0, "#E2E8F0"], [0.55, "#CBD5E1"], [1, "#94A3B8"]]} /></linearGradient>
        <radialGradient id={`${uid}-knob`} cx="40%" cy="35%" r="70%"><Stops tones={[[0, "#F3F4F6"], [0.6, "#9CA3AF"], [1, "#4B5563"]]} /></radialGradient>
      </defs>
      {hose && <path d={hosePath} fill="none" stroke="#1F2937" strokeWidth="7" strokeLinecap="round" />}
      {hose && <path d={hosePath} fill="none" stroke="#475569" strokeWidth="4.2" strokeDasharray="2 2.4" strokeLinecap="round" />}
      {hose && on && (
        <path d={hosePath} fill="none" stroke="#7DD3FC" strokeWidth="1.6" strokeDasharray="3 6" strokeLinecap="round" opacity=".9">
          <animate attributeName="stroke-dashoffset" from="18" to="0" dur={spin} repeatCount="indefinite" />
        </path>
      )}
      <rect x={x + 4} y={y + h - 3} width={w - 8} height="5" rx="2.5" fill="#000" opacity=".12" />
      <rect x={x} y={y} width={w} height={h} rx="8" fill={`url(#${uid}-case)`} stroke="#475569" strokeWidth="1.3" />
      <text x={x + 8} y={y + 12} fontSize="6.8" fontWeight="900" fill="#334155" fontFamily={FONT}>MÁY NÉN KHÍ</text>
      {/* quạt thổi (quay nhanh dần theo nấc lưu lượng) */}
      <g transform={`translate(${x + 25} ${y + 37})`}>
        <circle r="16" fill="#1F2937" stroke="#0F172A" strokeWidth="1" />
        <g>
          {on && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur={spin} repeatCount="indefinite" />}
          {[0, 72, 144, 216, 288].map((a) => (
            <path key={a} d="M0 0 C4 -6 10 -9 12.5 -5 C9 -3 5 -1 0 0" fill="#64748B" transform={`rotate(${a})`} />
          ))}
        </g>
        <circle r="16" fill="none" stroke="#94A3B8" strokeWidth=".8" strokeDasharray="1.5 2" />
        <circle r="3" fill="#94A3B8" />
      </g>
      {/* công tắc nguồn + đèn */}
      <g role={onToggle ? "button" : undefined} aria-label={onToggle ? (on ? "Tắt máy nén khí" : "Bật máy nén khí") : undefined}
        onClick={onToggle || undefined} style={{ cursor: onToggle ? "pointer" : "default" }}>
        <rect x={x + 46} y={y + 18} width="26" height="34" fill="transparent" />
        <rect x={x + 50} y={y + 22} width="17" height="26" rx="4" fill="#111827" />
        <rect x={x + 52} y={on ? y + 24 : y + 35} width="13" height="11" rx="2.5" fill={on ? "#16A34A" : "#B91C1C"} />
        <text x={x + 58.5} y={on ? y + 32 : y + 43} textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff" fontFamily={FONT}>{on ? "I" : "O"}</text>
      </g>
      <circle cx={x + w - 9} cy={y + 9} r="2.6" fill={on ? "#4ADE80" : "#475569"} stroke="#1F2937" strokeWidth=".8" />
      {/* núm lưu lượng: 1 yếu · 2 vừa · 3 mạnh */}
      <g role={onKnob ? "button" : undefined} aria-label={onKnob ? `Núm lưu lượng khí đang ở nấc ${flow}; bấm để vặn` : undefined}
        onClick={onKnob || undefined} style={{ cursor: onKnob ? "pointer" : "default" }}>
        <circle cx={kx} cy={ky} r="15" fill="transparent" />
        {[[1, -60], [2, 0], [3, 60]].map(([n, a]) => (
          <text key={n} x={kx + 14 * Math.sin((a * Math.PI) / 180)} y={ky - 14 * Math.cos((a * Math.PI) / 180) + 2.5} textAnchor="middle"
            fontSize="6" fontWeight="900" fill={n === flow ? C.orangeDk : "#475569"} fontFamily={FONT}>{n}</text>
        ))}
        <circle cx={kx} cy={ky} r="8.5" fill={`url(#${uid}-knob)`} stroke="#374151" strokeWidth="1" />
        <line x1={kx} y1={ky} x2={kx + 7 * Math.sin((knobAngle * Math.PI) / 180)} y2={ky - 7 * Math.cos((knobAngle * Math.PI) / 180)} stroke={C.navy} strokeWidth="2.2" strokeLinecap="round" />
        <text x={kx} y={y + h - 3.5} textAnchor="middle" fontSize="5.2" fontWeight="900" fill="#334155" fontFamily={FONT}>LƯU LƯỢNG</text>
      </g>
    </g>
  );
}
export const AirPump15 = memo(AirPump15View);

/* ============================== Xe trượt + (1) tấm chắn sáng ============================== */
/**
 * Xe trượt (M = 200 g) nhìn ngang; `xs` = mép trước của tấm chắn sáng (toạ độ cảnh). Thân xe ôm lấy
 * sống máng, tấm chắn 10 cm dựng trên nóc, móc buộc dây ở đầu xe, quả nặng đặt trên xe cắm vào chốt
 * phía sau. `lift` = xe nổi trên đệm khí.
 */
/** @param {{ xs: number, cart?: number, flag?: boolean, lift?: number, ghost?: boolean, held?: boolean }} props */
function Glider15View({ xs, cart = 0, flag = true, lift = 0, ghost = false, held = false }) {
  const uid = useUid();
  const { GLIDER_BACK, GLIDER_FRONT, GLIDER_TOP, TRACK_TOP, FLAG_W, FLAG_TOP, STRING_Y } = AT;
  const x0 = xs - GLIDER_BACK, w = GLIDER_BACK + GLIDER_FRONT;
  const y = -lift;
  return (
    <g transform={`translate(0 ${y})`} opacity={ghost ? 0.45 : 1}>
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1"><Stops tones={[[0, "#60A5FA"], [0.5, "#2563EB"], [1, "#1E3A8A"]]} /></linearGradient>
      </defs>
      {/* quả nặng đặt trên xe (chốt sau) */}
      {cart > 0 && (
        <g>
          <rect x={x0 + 9} y={GLIDER_TOP - cart * 3.2 - 4} width="2.4" height={cart * 3.2 + 4} fill="#6B7280" />
          {Array.from({ length: cart }, (_, i) => (
            <rect key={i} x={x0 + 2.2} y={GLIDER_TOP - (i + 1) * 3.2} width="16" height="3" rx="1" fill={i % 2 ? "#9CA3AF" : "#B8BEC8"} stroke="#4B5563" strokeWidth=".5" />
          ))}
        </g>
      )}
      {/* thân xe + hai tấm váy ôm máng */}
      <rect x={x0} y={GLIDER_TOP} width={w} height="12" rx="3" fill={`url(#${uid}-body)`} stroke="#1E3A8A" strokeWidth="1" />
      <rect x={x0 + 2} y={GLIDER_TOP + 9} width={w - 4} height={TRACK_TOP - GLIDER_TOP - 2} rx="1.5" fill="#1E40AF" opacity=".92" />
      <rect x={x0 + 3} y={GLIDER_TOP + 1.5} width={w - 6} height="2.2" rx="1.1" fill="#fff" opacity=".35" />
      {/* lò xo đệm hai đầu */}
      <rect x={x0 - 3} y={GLIDER_TOP + 3} width="3" height="7" rx="1" fill="#94A3B8" />
      <rect x={x0 + w} y={GLIDER_TOP + 3} width="3" height="7" rx="1" fill="#94A3B8" />
      {/* móc buộc dây */}
      <circle cx={xs + GLIDER_FRONT + 2.5} cy={STRING_Y} r="2.2" fill="none" stroke="#374151" strokeWidth="1.2" />
      {/* tay đang giữ xe */}
      {held && (
        <g style={{ pointerEvents: "none" }}>
          <rect x={x0 - 1.5} y={GLIDER_TOP - 1.5} width={w + 3} height={TRACK_TOP - GLIDER_TOP + 3} rx="4" fill="none" stroke={C.orange} strokeWidth="1.4" strokeDasharray="3 2.5" />
          <line x1={x0 - 9} y1={GLIDER_TOP - 9} x2={x0 + 1} y2={GLIDER_TOP + 2} stroke={C.orange} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx={x0 - 12} cy={GLIDER_TOP - 12} r="8.5" fill={C.orange} stroke="#fff" strokeWidth="1.2" />
          <Hand x={x0 - 17.5} y={GLIDER_TOP - 17.5} width={11} height={11} color="#fff" strokeWidth={2.6} />
        </g>
      )}
      {/* (1) tấm chắn sáng 10 cm */}
      {flag && (
        <g>
          <rect x={xs - FLAG_W} y={FLAG_TOP} width={FLAG_W} height={GLIDER_TOP - FLAG_TOP} rx="1" fill="#111827" stroke="#000" strokeWidth=".6" />
          <text x={xs - FLAG_W / 2} y={FLAG_TOP + 13} textAnchor="middle" fontSize="6" fontWeight="900" fill="#F8FAFC" fontFamily={FONT}>10 cm</text>
        </g>
      )}
    </g>
  );
}
export const Glider15 = memo(Glider15View);

/** Một quả nặng 50 g (đĩa có khe) nhìn chếch — dùng khi kéo quả từ hộp lên xe / móc treo. */
function WeightDisc15View({ x, y, active = false }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      {active && <circle cx={x} cy={y} r="17" fill={C.orange} opacity=".16" />}
      <ellipse cx={x} cy={y + 2.5} rx="11" ry="4.8" fill="#71717A" />
      <ellipse cx={x} cy={y} rx="11" ry="4.8" fill="#D4D4D8" stroke="#52525B" strokeWidth=".7" />
      <rect x={x - 1.4} y={y - 4.8} width="2.8" height="4.8" fill="#52525B" opacity=".55" />
      <text x={x} y={y - 8} textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#3F3F46" fontFamily={FONT}>50 g</text>
    </g>
  );
}
export const WeightDisc15 = memo(WeightDisc15View);

/* ============================== (3)(4) Cổng quang điện ============================== */
/**
 * Cổng quang nhìn ngang tại vạch `x`: đầu cảm biến chữ U ôm máng ngang tầm tấm chắn sáng (tia hồng
 * ngoại cắt ngang đường đi của tấm chắn), thân cột đứng trên bàn, jack cáp ở chân cột.
 */
function Photogate15View({ x, blocked = false, label = "1" }) {
  const uid = useUid();
  const beamY = AT.FLAG_TOP + 11;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="0"><Stops tones={[[0, "#475569"], [0.4, "#334155"], [1, "#1E293B"]]} /></linearGradient>
      </defs>
      {/* cột + đế kẹp trên bàn */}
      <rect x={x - 2} y={beamY + 16} width="4" height={276 - beamY - 16} fill="#4B5563" />
      <rect x={x - 12} y={274} width="24" height="6" rx="2" fill="#1F2937" />
      {/* đầu cảm biến */}
      <rect x={x - 10} y={beamY - 17} width="20" height="34" rx="5" fill={`url(#${uid}-body)`} stroke="#0F172A" strokeWidth="1.1" />
      <rect x={x - 8} y={beamY - 15} width="3" height="29" rx="1.5" fill="#fff" opacity=".14" />
      <circle cx={x} cy={beamY} r="5.4" fill="#0B1220" stroke="#64748B" strokeWidth=".9" />
      <circle cx={x} cy={beamY} r="2.6" fill={blocked ? "#FF3B3B" : "#7F1D1D"} />
      {blocked && <circle cx={x} cy={beamY} r="7.5" fill="#FF3B3B" opacity=".35" />}
      <circle cx={x} cy={beamY - 12} r="2" fill={blocked ? "#FF3B3B" : "#7F1D1D"} stroke="#1F2937" strokeWidth=".7" />
      <circle cx={x + 15} cy={beamY - 13} r="6" fill="#fff" stroke={C.navy} strokeWidth="1" />
      <text x={x + 15} y={beamY - 10} textAnchor="middle" fontSize="8" fontWeight="900" fill={C.navy} fontFamily={FONT}>{label}</text>
    </g>
  );
}
export const Photogate15 = memo(Photogate15View);

/* ============================== (5) Ròng rọc ============================== */
/** Ròng rọc kẹp ở mép bàn, đầu phải của máng; bánh xe quay theo dây (`angle` độ). */
function Pulley15View({ angle = 0 }) {
  const uid = useUid();
  const { x, y, r } = AT.PULLEY;
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-wheel`} cx="40%" cy="35%" r="70%"><Stops tones={[[0, "#F1F5F9"], [0.6, "#94A3B8"], [1, "#475569"]]} /></radialGradient>
      </defs>
      {/* kẹp bàn + tay đỡ */}
      <rect x={AT.EDGE_X - 8} y={AT.TABLE_BACK - 4} width="14" height="26" rx="2" fill="#374151" />
      <rect x={AT.EDGE_X - 4} y={AT.TABLE_BACK + 12} width="10" height="12" rx="2" fill="#1F2937" />
      <rect x={x - 8} y={y - 2} width="10" height="4" fill="#4B5563" />
      <g transform={`rotate(${angle} ${x} ${y})`}>
        <circle cx={x} cy={y} r={r} fill={`url(#${uid}-wheel)`} stroke="#334155" strokeWidth="1.2" />
        <circle cx={x} cy={y} r={r - 2.5} fill="none" stroke="#475569" strokeWidth=".8" />
        {[0, 60, 120].map((a) => <line key={a} x1={x - (r - 3) * Math.cos((a * Math.PI) / 180)} y1={y - (r - 3) * Math.sin((a * Math.PI) / 180)} x2={x + (r - 3) * Math.cos((a * Math.PI) / 180)} y2={y + (r - 3) * Math.sin((a * Math.PI) / 180)} stroke="#475569" strokeWidth="1" />)}
      </g>
      <circle cx={x} cy={y} r="2" fill="#1F2937" />
    </g>
  );
}
export const Pulley15 = memo(Pulley15View);

/* ============================== (6) Móc treo + quả nặng ============================== */
/** Móc treo ở (HANG_X, hookY): thanh + đĩa đế + n quả nặng 50 g xếp chồng (đĩa có khe). */
function Hanger15View({ hookY, n = 0, landed = false }) {
  const x = AT.HANG_X;
  const top = hookY + 10;
  return (
    <g>
      <path d={`M${x} ${hookY - 4} q5 0 5 5 q0 5 -5 5`} fill="none" stroke="#374151" strokeWidth="1.4" />
      <rect x={x - 1.2} y={hookY + 4} width="2.4" height={10 + n * AT.DISC_H} fill="#6B7280" />
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <rect x={x - 11} y={top + i * AT.DISC_H} width="22" height={AT.DISC_H - 0.6} rx="1.6" fill={i % 2 ? "#A1A1AA" : "#C4C4CC"} stroke="#52525B" strokeWidth=".6" />
          <rect x={x - 1.5} y={top + i * AT.DISC_H} width="3" height={AT.DISC_H - 0.6} fill="#52525B" opacity=".5" />
        </g>
      ))}
      <rect x={x - 12} y={top + n * AT.DISC_H} width="24" height="3.4" rx="1.4" fill="#3F3F46" />
      {!landed && n > 0 && <text x={x + 16} y={top + (n * AT.DISC_H) / 2 + 3} fontSize="7.5" fontWeight="900" fill="#3F3F46" fontFamily={FONT}>{n}×50 g</text>}
    </g>
  );
}
export const Hanger15 = memo(Hanger15View);

/* ============================== Hộp 10 quả nặng ============================== */
/** Khay gỗ 10 ô: ô còn quả nặng thì có đĩa. `left` = số quả còn trong hộp. */
function WeightBox15View({ left = 10 }) {
  const { x, y, w, h } = AT.BOX;
  return (
    <g>
      <rect x={x + 3} y={y + h - 2} width={w - 6} height="5" rx="2.5" fill="#000" opacity=".1" />
      <rect x={x} y={y + 10} width={w} height={h - 10} rx="5" fill="#C0894E" stroke="#8A5A2B" strokeWidth="1.2" />
      <rect x={x} y={y + 10} width={w} height="3" fill="#E4B77F" />
      <text x={x + w / 2} y={y + 6} textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#6B4423" fontFamily={FONT}>HỘP QUẢ NẶNG 10 × 50 g</text>
      {Array.from({ length: 10 }, (_, i) => {
        const cx = x + 12 + (i % 5) * 29, cy = y + 24 + Math.floor(i / 5) * 18;
        const has = i < left;
        return (
          <g key={i}>
            <ellipse cx={cx} cy={cy + 4} rx="11" ry="5" fill="#7C4A1E" opacity=".45" />
            {has && (
              <g>
                <ellipse cx={cx} cy={cy + 2} rx="10" ry="4.6" fill="#71717A" />
                <ellipse cx={cx} cy={cy} rx="10" ry="4.6" fill="#D4D4D8" stroke="#52525B" strokeWidth=".6" />
                <rect x={cx - 1.3} y={cy - 4.6} width="2.6" height="4.6" fill="#52525B" opacity=".55" />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}
export const WeightBox15 = memo(WeightBox15View);

/* ============================== (8) Cân điện tử ============================== */
/** Cân đĩa: màn hiện số gam; item = "glider" | "weight" | null (vật đang đặt trên đĩa). */
/** @param {{ reading?: string, item?: "glider" | "weight" | null, onTap?: (() => void) | null }} props */
function Scale15View({ reading = "0.0", item = null, onTap = null }) {
  const { x, y, w, h } = AT.SCALE;
  const plateY = y + 12;
  return (
    <g role={onTap ? "button" : undefined} aria-label={onTap ? "Cân điện tử" : undefined} onClick={onTap || undefined} style={{ cursor: onTap ? "pointer" : "default" }}>
      <rect x={x + 4} y={y + h - 2} width={w - 8} height="5" rx="2.5" fill="#000" opacity=".12" />
      <rect x={x} y={y + 16} width={w} height={h - 16} rx="6" fill="#E5E7EB" stroke="#6B7280" strokeWidth="1.2" />
      <rect x={x + 10} y={plateY} width={w - 20} height="6" rx="3" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
      <rect x={x + 12} y={y + 26} width="58" height="16" rx="3" fill="#0F2A1B" stroke="#14532D" strokeWidth="1" />
      <text x={x + 66} y={y + 38} textAnchor="end" fontFamily="monospace" fontSize="11" fontWeight="700" fill="#4ADE80">{reading}</text>
      <text x={x + 76} y={y + 38} fontSize="8" fontWeight="900" fill="#374151" fontFamily={FONT}>g</text>
      <circle cx={x + w - 16} cy={y + 34} r="5" fill="#94A3B8" stroke="#475569" strokeWidth=".8" />
      <text x={x + w - 16} y={y + 46.5} textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#475569" fontFamily={FONT}>TARE</text>
      <text x={x + 12} y={y + h + 9} fontSize="7" fontWeight="800" fill={C.sub} fontFamily={FONT}>Cân điện tử</text>
      {item === "glider" && (
        <g transform={`translate(${x + w / 2 - 14} ${plateY - 34}) scale(0.62)`}>
          <Glider15 xs={42} flag={false} />
        </g>
      )}
      {item === "weight" && (
        <g>
          <ellipse cx={x + w / 2} cy={plateY - 1} rx="11" ry="4.6" fill="#71717A" />
          <ellipse cx={x + w / 2} cy={plateY - 3} rx="11" ry="4.6" fill="#D4D4D8" stroke="#52525B" strokeWidth=".6" />
        </g>
      )}
    </g>
  );
}
export const Scale15 = memo(Scale15View);

/* ============================== (7) Đồng hồ: dùng lại MC964Face ============================== */

/* ============================== Biểu tượng khay dụng cụ ============================== */
const ICON = {
  track15: { vb: "196 216 170 66", draw: () => <AirTrack15 level /> },
  pump15: { vb: "80 194 118 74", draw: () => <AirPump15 on={false} hose={false} /> },
  pulley15: { vb: "778 220 42 58", draw: () => <Pulley15 /> },
  glider15: { vb: "288 206 72 40", draw: () => <Glider15 xs={336} flag={false} /> },
  flag15: { vb: "300 190 44 30", draw: () => (<g><rect x="308" y="194" width="28" height="22" rx="1" fill="#111827" /><text x="322" y="208" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff" fontFamily={FONT}>10 cm</text></g>) },
  gate15a: { vb: "318 180 48 104", draw: () => <Photogate15 x={G1_X} label="1" /> },
  gate15b: { vb: "318 180 48 104", draw: () => <Photogate15 x={G1_X} label="2" /> },
  clock15: { vb: "-8 -2 316 142", draw: () => <MC964Face interactive={false} led="0.000" modeLabel="A↔B" modeAngle={25} scaleLabel="0,001 s" /> },
  scale15: { vb: "184 366 130 66", draw: () => <Scale15 /> },
  weights15: { vb: "24 344 152 72", draw: () => <WeightBox15 left={10} /> },
};

/** Hình dụng cụ cho khay / ghost khi kéo / vật đang bay — cùng bản vẽ với bàn, cắt theo viewBox (máng dài 594 đơn vị, icon chỉ lấy đầu máng). */
export function AirTrackIcon({ kind, size = 34, x, y, style }) {
  const def = ICON[kind];
  if (!def) return null;
  return (
    <svg x={x} y={y} width={size} height={size} viewBox={def.vb} preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ overflow: "hidden", ...style }}>
      {def.draw()}
    </svg>
  );
}
