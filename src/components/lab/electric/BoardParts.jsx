"use client";

import { useId } from "react";
import { C, FONT } from "../../../engine/tokens.js";

/* ============================================================================
   BoardParts — linh kiện CẮM TRÊN bảng lắp mạch (Bài 26). Mọi toạ độ là toạ độ cục bộ
   của ảnh bảng (994 × 684); thân linh kiện vẽ GIỮA các chân, chân là phích đồng nằm đúng
   nút của bảng (lấy từ boardGeometry) — không có toạ độ căn chỉnh tay.
   pins = [{ pin, x, y }] theo thứ tự trái → phải.
   Vẽ theo đồ thật: pin trong hộp đế có lò xo tiếp điện, cầu dao lưỡi đồng tay cầm đỏ,
   điện trở vòng màu, biến trở con chạy ống sứ quấn dây. heat (0..1) = nóng lên do I²R.
   ========================================================================== */

/** Toạ độ cục bộ của nhóm SVG chứa `el` từ toạ độ màn hình. */
export function localPoint(el, clientX, clientY) {
  const ctm = el.getScreenCTM?.();
  const svg = el.ownerSVGElement || el;
  if (!ctm || !svg.createSVGPoint) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

const useUid = () => useId().replace(/[^a-zA-Z0-9]/g, "");
/** Màu nóng: be → cam → đỏ theo mức nóng 0..1. */
const heatColor = (h) => {
  const t = Math.max(0, Math.min(1, h));
  const mix = (a, b, k) => Math.round(a + (b - a) * k);
  const [r1, g1, b1] = t < 0.5 ? [232, 213, 176] : [249, 115, 22];
  const [r2, g2, b2] = t < 0.5 ? [249, 115, 22] : [220, 38, 38];
  const k = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  return `rgb(${mix(r1, r2, k)},${mix(g1, g2, k)},${mix(b1, b2, k)})`;
};

/** Phích cắm đồng (banana) nằm đúng nút của bảng. */
function Plug({ x, y, onPointerDown = null, label = null, uid }) {
  return (
    <g onPointerDown={onPointerDown || undefined} style={onPointerDown ? { cursor: "crosshair" } : undefined}>
      {onPointerDown && <circle cx={x} cy={y} r="22" fill="transparent" />}
      <circle cx={x + 1.5} cy={y + 2.5} r="11" fill="rgba(15,23,42,.25)" />
      <circle cx={x} cy={y} r="11" fill={`url(#${uid}-brass)`} stroke="#7A5C0A" strokeWidth="2" />
      <circle cx={x} cy={y} r="4.2" fill="#4A3706" />
      <circle cx={x - 3.5} cy={y - 3.5} r="2.2" fill="#FFF7D6" opacity=".8" />
      {label && (
        <g>
          <rect x={x - 11} y={y + 16} width="22" height="19" rx="6" fill="#fff" stroke="#CBD5E1" strokeWidth="1.5" />
          <text x={x} y={y + 30} textAnchor="middle" fontSize="14" fontWeight="900" fill="#334155" fontFamily={FONT}>{label}</text>
        </g>
      )}
    </g>
  );
}

function BrassDefs({ uid }) {
  return (
    <linearGradient id={`${uid}-brass`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#FDE68A" />
      <stop offset="55%" stopColor="#D4A017" />
      <stop offset="100%" stopColor="#8A6A0B" />
    </linearGradient>
  );
}

/** Lớp "hơi nóng" bốc lên phía trên linh kiện. */
function HeatShimmer({ x, y, width, heat }) {
  if (heat < 0.35) return null;
  const n = 3;
  return (
    <g style={{ pointerEvents: "none" }} opacity={Math.min(0.85, heat)}>
      {Array.from({ length: n }, (_, i) => {
        const cx = x + (width * (i + 1)) / (n + 1);
        return (
          <path key={i} d={`M${cx} ${y} q-7 -10 0 -20 q7 -10 0 -20`} fill="none" stroke="#F97316" strokeWidth="3" strokeLinecap="round">
            <animate attributeName="opacity" values="0;1;0" dur={`${1.2 + i * 0.25}s`} repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="translate" values="0 6;0 -8" dur={`${1.2 + i * 0.25}s`} repeatCount="indefinite" />
          </path>
        );
      })}
    </g>
  );
}

/** Pin điện hóa trong hộp đế: cực âm N (lò xo) bên trái, cực dương M (núm) bên phải. */
export function BoardBattery({ pins, cell = "new", heat = 0, glow = false, onBodyPointerDown = null, onPinPointerDown = null }) {
  const uid = useUid();
  const [n, m] = pins;
  const y = n.y;
  const x1 = n.x, x2 = m.x;
  const cellX1 = x1 + 26, cellX2 = x2 - 30;
  const old = cell === "old";
  return (
    <g>
      <defs>
        <BrassDefs uid={uid} />
        <linearGradient id={`${uid}-holder`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id={`${uid}-cell`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={old ? "#94A3B8" : "#1E40AF"} />
          <stop offset="35%" stopColor={old ? "#CBD5E1" : "#3B82F6"} />
          <stop offset="70%" stopColor={old ? "#64748B" : "#1D4ED8"} />
          <stop offset="100%" stopColor={old ? "#475569" : "#1E3A8A"} />
        </linearGradient>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <radialGradient id={`${uid}-heat`}>
          <stop offset="0%" stopColor="#FB923C" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FB923C" stopOpacity="0" />
        </radialGradient>
      </defs>
      {heat > 0.03 && (
        <ellipse cx={(x1 + x2) / 2} cy={y} rx={(x2 - x1) / 2 + 46} ry="52" fill={`url(#${uid}-heat)`} opacity={Math.min(0.85, heat)} style={{ pointerEvents: "none" }}>
          <animate attributeName="ry" values="44;56;44" dur="1.4s" repeatCount="indefinite" />
        </ellipse>
      )}
      <g onPointerDown={onBodyPointerDown || undefined} style={onBodyPointerDown ? { cursor: "grab" } : undefined}>
        <rect x={x1 - 20} y={y - 30} width={x2 - x1 + 40} height="64" rx="16" fill="rgba(15,23,42,.22)" transform="translate(4 5)" />
        <rect x={x1 - 22} y={y - 32} width={x2 - x1 + 44} height="64" rx="16" fill={`url(#${uid}-holder)`} stroke={glow ? "#FACC15" : "#0F172A"} strokeWidth={glow ? 4 : 2.5} />
        <rect x={x1 + 6} y={y - 24} width={x2 - x1 - 12} height="48" rx="10" fill="#0F172A" opacity=".55" />
        {/* lò xo cực âm */}
        <path d={`M${x1 + 10} ${y - 16} l8 5 l-8 5 l8 5 l-8 5 l8 5 l-8 5`} fill="none" stroke={`url(#${uid}-metal)`} strokeWidth="3" strokeLinejoin="round" />
        {/* thân pin trụ */}
        <rect x={cellX1} y={y - 20} width={cellX2 - cellX1} height="40" rx="8" fill={`url(#${uid}-cell)`} stroke="#0B1220" strokeWidth="1.5" />
        <rect x={cellX1 + (cellX2 - cellX1) * 0.24} y={y - 20} width={(cellX2 - cellX1) * 0.5} height="40" fill="#fff" opacity={old ? 0.55 : 0.9} />
        <text x={cellX1 + (cellX2 - cellX1) * 0.49} y={y - 3} textAnchor="middle" fontSize="11.5" fontWeight="900" fill={old ? "#475569" : "#1E3A8A"} fontFamily={FONT}>PHYLAB</text>
        <text x={cellX1 + (cellX2 - cellX1) * 0.49} y={y + 12} textAnchor="middle" fontSize="11" fontWeight="900" fill={old ? "#64748B" : "#B91C1C"} fontFamily={FONT}>{old ? "ĐÃ DÙNG" : "1,5 V"}</text>
        <text x={cellX1 + 10} y={y + 6} textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff" fontFamily={FONT}>−</text>
        <text x={cellX2 - 11} y={y + 6} textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff" fontFamily={FONT}>+</text>
        {/* núm cực dương + lá tiếp điện */}
        <rect x={cellX2} y={y - 8} width="8" height="16" rx="3" fill={`url(#${uid}-metal)`} stroke="#475569" />
        <rect x={x2 - 20} y={y - 18} width="6" height="36" rx="2" fill={`url(#${uid}-metal)`} stroke="#475569" />
        <text x={x1 - 4} y={y - 40} textAnchor="middle" fontSize="15" fontWeight="900" fill="#1F2937" fontFamily={FONT}>N (−)</text>
        <text x={x2 + 4} y={y - 40} textAnchor="middle" fontSize="15" fontWeight="900" fill="#B91C1C" fontFamily={FONT}>M (+)</text>
      </g>
      <Plug uid={uid} x={x1} y={y} onPointerDown={onPinPointerDown ? (e) => onPinPointerDown("-", e) : null} />
      <Plug uid={uid} x={x2} y={y} onPointerDown={onPinPointerDown ? (e) => onPinPointerDown("+", e) : null} />
    </g>
  );
}

/** Khóa K kiểu cầu dao: đế sứ, lưỡi đồng, tay cầm đỏ. Bấm để đóng/mở. */
export function BoardSwitch({ pins, closed = false, glow = false, onBodyPointerDown = null, onPinPointerDown = null }) {
  const uid = useUid();
  const [a, b] = pins;
  const y = a.y;
  const pivot = { x: a.x + 24, y: y - 6 };
  const len = b.x - a.x - 44;
  return (
    <g>
      <defs>
        <BrassDefs uid={uid} />
        <linearGradient id={`${uid}-base`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D8DEE8" />
        </linearGradient>
        <linearGradient id={`${uid}-blade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id={`${uid}-grip`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      <g onPointerDown={onBodyPointerDown || undefined} style={onBodyPointerDown ? { cursor: "pointer" } : undefined} role="button" aria-label={closed ? "Khóa K đang đóng — bấm để mở" : "Khóa K đang mở — bấm để đóng"}>
        <rect x={a.x - 18} y={y - 26} width={b.x - a.x + 36} height="54" rx="14" fill="rgba(15,23,42,.22)" transform="translate(4 5)" />
        <rect x={a.x - 20} y={y - 28} width={b.x - a.x + 40} height="54" rx="14" fill={`url(#${uid}-base)`} stroke={glow ? "#FACC15" : "#94A3B8"} strokeWidth={glow ? 4 : 2.5} />
        {/* bản lề + ngàm tiếp điện bằng đồng */}
        <rect x={pivot.x - 10} y={y - 20} width="20" height="24" rx="4" fill={`url(#${uid}-brass)`} stroke="#7A5C0A" strokeWidth="1.5" />
        <rect x={b.x - 30} y={y - 22} width="7" height="24" rx="2" fill={`url(#${uid}-brass)`} stroke="#7A5C0A" strokeWidth="1.5" />
        <rect x={b.x - 20} y={y - 22} width="7" height="24" rx="2" fill={`url(#${uid}-brass)`} stroke="#7A5C0A" strokeWidth="1.5" />
        <g transform={`rotate(${closed ? 0 : -32} ${pivot.x} ${pivot.y})`} style={{ transition: "transform .25s ease" }}>
          <rect x={pivot.x} y={pivot.y - 5} width={len} height="10" rx="4" fill={`url(#${uid}-blade)`} stroke="#78350F" strokeWidth="1.5" />
          <rect x={pivot.x + len - 6} y={pivot.y - 11} width="34" height="22" rx="10" fill={`url(#${uid}-grip)`} stroke="#7F1D1D" strokeWidth="1.5" />
          <rect x={pivot.x + len + 1} y={pivot.y - 8} width="18" height="5" rx="2.5" fill="#fff" opacity=".45" />
        </g>
        <circle cx={pivot.x} cy={pivot.y} r="5" fill="#475569" stroke="#1E293B" />
        <text x={(a.x + b.x) / 2} y={y - 36} textAnchor="middle" fontSize="16" fontWeight="900" fill={closed ? "#15803D" : "#B91C1C"} fontFamily={FONT}>K · {closed ? "ĐÓNG" : "MỞ"}</text>
      </g>
      <Plug uid={uid} x={a.x} y={y} onPointerDown={onPinPointerDown ? (e) => onPinPointerDown("in", e) : null} />
      <Plug uid={uid} x={b.x} y={y} onPointerDown={onPinPointerDown ? (e) => onPinPointerDown("out", e) : null} />
    </g>
  );
}

/** Điện trở bảo vệ R₀ = 10 Ω (vòng màu nâu–đen–đen–nhũ vàng). Nóng lên theo I²R. */
export function BoardResistor({ pins, label = "R₀ = 10 Ω", heat = 0, onBodyPointerDown = null, onPinPointerDown = null }) {
  const uid = useUid();
  const [a, b] = pins;
  const y = a.y;
  const mid = (a.x + b.x) / 2;
  const bw = 96, bh = 34;
  const body = heatColor(heat);
  const tempC = Math.round(25 + 70 * heat);
  return (
    <g>
      <defs>
        <BrassDefs uid={uid} />
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity=".55" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </radialGradient>
      </defs>
      {heat > 0.05 && (
        <ellipse cx={mid} cy={y} rx="82" ry="40" fill={`url(#${uid}-glow)`} opacity={Math.min(0.9, heat * 1.1)} style={{ pointerEvents: "none" }}>
          <animate attributeName="rx" values="74;88;74" dur="1.3s" repeatCount="indefinite" />
        </ellipse>
      )}
      <g onPointerDown={onBodyPointerDown || undefined} style={onBodyPointerDown ? { cursor: "grab" } : undefined}>
        <path d={`M${a.x} ${y} L${mid - bw / 2} ${y}`} stroke="#CBD5E1" strokeWidth="6" strokeLinecap="round" />
        <path d={`M${mid + bw / 2} ${y} L${b.x} ${y}`} stroke="#CBD5E1" strokeWidth="6" strokeLinecap="round" />
        <path d={`M${a.x} ${y} L${mid - bw / 2} ${y}`} stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
        <path d={`M${mid + bw / 2} ${y} L${b.x} ${y}`} stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
        <rect x={mid - bw / 2 + 3} y={y - bh / 2 + 4} width={bw} height={bh} rx={bh / 2} fill="rgba(15,23,42,.2)" />
        <rect x={mid - bw / 2} y={y - bh / 2} width={bw} height={bh} rx={bh / 2} fill={body} stroke="#8A6D3B" strokeWidth="2" />
        {[["#8B572A", -26], ["#111827", -12], ["#111827", 2], ["#D4A017", 26]].map(([color, dx]) => (
          <rect key={dx} x={mid + dx} y={y - bh / 2} width="8" height={bh} fill={color} opacity={0.95 - heat * 0.3} />
        ))}
        <rect x={mid - bw / 2} y={y - bh / 2} width={bw} height={bh} rx={bh / 2} fill={`url(#${uid}-body)`} />
        <text x={mid} y={y - 26} textAnchor="middle" fontSize="15" fontWeight="900" fill={heat > 0.45 ? "#C2410C" : C.ink} fontFamily={FONT}>
          {label}{heat > 0.2 ? ` · ${tempC}°C` : ""}
        </text>
      </g>
      <HeatShimmer x={mid - bw / 2} y={y - 40} width={bw} heat={heat} />
      <Plug uid={uid} x={a.x} y={y} onPointerDown={onPinPointerDown ? (e) => onPinPointerDown("a", e) : null} />
      <Plug uid={uid} x={b.x} y={y} onPointerDown={onPinPointerDown ? (e) => onPinPointerDown("b", e) : null} />
    </g>
  );
}

/**
 * Biến trở con chạy 100 Ω: dây điện trở quấn trên ống sứ từ A tới B, con chạy trượt trên thanh
 * kim loại nối với chốt C. value = điện trở đoạn A–C (0 → max). Kéo con chạy để đổi.
 * activeSpan = "AC" | "CB": đoạn dây đang có dòng điện (sáng và nóng lên theo heat).
 */
export function BoardRheostat({ pins, value = 0, max = 100, glow = false, activeSpan = null, heat = 0, onChange = null, onBodyPointerDown = null, onPinPointerDown = null }) {
  const uid = useUid();
  const [a, c, b] = pins;
  const y = a.y;
  const tubeY = y - 34;
  const rodY = y - 66;
  const kx = a.x + ((b.x - a.x) * Math.min(max, Math.max(0, value))) / max;
  const turns = Math.max(12, Math.round((b.x - a.x) / 7));
  const drag = (event) => {
    const p = localPoint(event.currentTarget, event.clientX, event.clientY);
    if (!p) return;
    onChange(Math.round(Math.min(max, Math.max(0, ((p.x - a.x) / (b.x - a.x)) * max))));
  };
  const knobProps = onChange
    ? {
        role: "slider",
        tabIndex: 0,
        "aria-label": "Con chạy biến trở — kéo để đổi điện trở",
        "aria-valuemin": 0,
        "aria-valuemax": max,
        "aria-valuenow": value,
        style: { cursor: "ew-resize", touchAction: "none" },
        onPointerDown: (event) => { event.stopPropagation(); event.currentTarget.setPointerCapture?.(event.pointerId); drag(event); },
        onPointerMove: (event) => { if (event.currentTarget.hasPointerCapture?.(event.pointerId)) drag(event); },
        onPointerUp: (event) => event.currentTarget.releasePointerCapture?.(event.pointerId),
        onKeyDown: (event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); onChange(Math.min(max, value + 1)); }
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); onChange(Math.max(0, value - 1)); }
        },
      }
    : {};
  const spanX1 = activeSpan === "AC" ? a.x : kx;
  const spanX2 = activeSpan === "AC" ? kx : b.x;
  return (
    <g>
      <defs>
        <BrassDefs uid={uid} />
        <linearGradient id={`${uid}-tube`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF7" />
          <stop offset="55%" stopColor="#E7DCC7" />
          <stop offset="100%" stopColor="#BFB29A" />
        </linearGradient>
        <linearGradient id={`${uid}-rod`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id={`${uid}-frame`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>
      <g onPointerDown={onBodyPointerDown || undefined} style={onBodyPointerDown ? { cursor: "grab" } : undefined}>
        <rect x={a.x - 22} y={y - 86} width={b.x - a.x + 44} height="108" rx="18" fill="rgba(15,23,42,.18)" transform="translate(4 5)" />
        <rect x={a.x - 24} y={y - 88} width={b.x - a.x + 48} height="108" rx="18" fill="#FFFDF8" stroke={glow ? "#FACC15" : "#94A3B8"} strokeWidth={glow ? 4 : 2.5} />
        <text x={a.x - 12} y={y - 96} fontSize="15" fontWeight="900" fill="#475569" fontFamily={FONT}>BIẾN TRỞ 100 Ω</text>
        <g>
          <rect x={b.x - 112} y={y - 112} width="124" height="24" rx="12" fill={C.orange} />
          <text x={b.x - 50} y={y - 95} textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff" fontFamily={FONT}>R(AC) = {Math.round(value)} Ω</text>
        </g>
        {/* giá đỡ hai đầu */}
        <rect x={a.x - 16} y={rodY - 10} width="16" height={y - rodY + 2} rx="4" fill={`url(#${uid}-frame)`} />
        <rect x={b.x} y={rodY - 10} width="16" height={y - rodY + 2} rx="4" fill={`url(#${uid}-frame)`} />
        {/* ống sứ quấn dây điện trở */}
        <rect x={a.x} y={tubeY - 14} width={b.x - a.x} height="28" rx="8" fill={`url(#${uid}-tube)`} stroke="#A8998A" strokeWidth="1.5" />
        {Array.from({ length: turns }, (_, i) => {
          const x = a.x + 4 + ((b.x - a.x - 8) * i) / (turns - 1);
          const on = activeSpan && x >= Math.min(spanX1, spanX2) && x <= Math.max(spanX1, spanX2);
          return <line key={i} x1={x - 3} y1={tubeY - 13} x2={x + 3} y2={tubeY + 13} stroke={on ? heatColor(0.35 + heat * 0.65) : "#B45309"} strokeWidth={on ? 3 : 2.2} strokeLinecap="round" />;
        })}
        {activeSpan && (
          <rect x={Math.min(spanX1, spanX2)} y={tubeY - 15} width={Math.abs(spanX2 - spanX1)} height="30" rx="8" fill="#F97316" opacity={0.08 + heat * 0.35} style={{ pointerEvents: "none" }}>
            {heat > 0.3 && <animate attributeName="opacity" values={`${0.08 + heat * 0.25};${0.12 + heat * 0.4};${0.08 + heat * 0.25}`} dur="1.4s" repeatCount="indefinite" />}
          </rect>
        )}
        {/* thanh kim loại nối con chạy với chốt C */}
        <rect x={a.x - 4} y={rodY - 5} width={b.x - a.x + 8} height="10" rx="5" fill={`url(#${uid}-rod)`} stroke="#64748B" strokeWidth="1.2" />
        <rect x={c.x - 5} y={rodY} width="10" height={y - rodY - 10} rx="3" fill={`url(#${uid}-rod)`} stroke="#64748B" strokeWidth="1.2" />
        <line x1={a.x} y1={tubeY + 14} x2={a.x} y2={y - 8} stroke="#94A3B8" strokeWidth="5" />
        <line x1={b.x} y1={tubeY + 14} x2={b.x} y2={y - 8} stroke="#94A3B8" strokeWidth="5" />
      </g>
      <HeatShimmer x={Math.min(spanX1, spanX2)} y={tubeY - 22} width={Math.max(20, Math.abs(spanX2 - spanX1))} heat={activeSpan ? heat : 0} />
      {/* con chạy */}
      <g {...knobProps}>
        <rect x={kx - 30} y={rodY - 30} width="60" height="70" fill="transparent" />
        <rect x={kx - 15} y={rodY - 12} width="30" height="30" rx="7" fill="#1F2937" stroke={C.orange} strokeWidth="3" />
        <rect x={kx - 4} y={rodY + 16} width="8" height={tubeY - rodY - 18} fill="#D97706" />
        <circle cx={kx} cy={rodY - 20} r="11" fill="#DC2626" stroke="#7F1D1D" strokeWidth="2" />
        <circle cx={kx - 3.5} cy={rodY - 23.5} r="3" fill="#fff" opacity=".5" />
      </g>
      <Plug uid={uid} x={a.x} y={y} label="A" onPointerDown={onPinPointerDown ? (e) => onPinPointerDown("A", e) : null} />
      <Plug uid={uid} x={c.x} y={y} label="C" onPointerDown={onPinPointerDown ? (e) => onPinPointerDown("C", e) : null} />
      <Plug uid={uid} x={b.x} y={y} label="B" onPointerDown={onPinPointerDown ? (e) => onPinPointerDown("B", e) : null} />
    </g>
  );
}
