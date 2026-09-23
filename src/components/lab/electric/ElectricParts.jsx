"use client";

import { C, FONT } from "../../../engine/tokens.js";

/* ============================================================================
   ElectricParts — linh kiện điện vẽ bằng SVG, dùng chung cho Phòng Lab điện và Prelab.

   Mỗi linh kiện được vẽ trong hệ toạ độ CỤC BỘ (0,0) → (w,h) và khai báo chốt nối
   (terminal) trong CHÍNH hệ đó ở PART_GEOMETRY. Scene chỉ đặt linh kiện bằng
   { x, y, s } (dịch + phóng đều), nên chốt nối, màn hình, núm xoay luôn khớp đúng
   hình vẽ ở mọi kích thước — không còn toạ độ căn chỉnh bằng tay.
   ========================================================================== */

/** @typedef {{ x: number, y: number, s: number }} Placement  Vị trí + tỉ lệ đặt linh kiện trên scene. */

export const METER_MODES = ["OFF", "V", "Ω", "mA", "µA"];
export const METER_MODE_ANGLE = { OFF: -110, V: -55, "Ω": 0, mA: 55, "µA": 110 };
export const METER_UNIT = { OFF: "", V: "V", "Ω": "Ω", mA: "mA", "µA": "µA" };

export const PART_GEOMETRY = {
  board: { w: 994, h: 684, terminals: {} },
  source: { w: 200, h: 150, terminals: { "-": { x: 132, y: 124 }, "+": { x: 170, y: 124 } } },
  switch: { w: 124, h: 92, terminals: { in: { x: 14, y: 72 }, out: { x: 110, y: 72 } } },
  meter: { w: 130, h: 214, terminals: { A: { x: 22, y: 186 }, mA: { x: 50, y: 186 }, COM: { x: 80, y: 186 }, V: { x: 108, y: 186 } } },
  resistor: { w: 160, h: 56, terminals: { a: { x: 6, y: 34 }, b: { x: 154, y: 34 } } },
  rheostat: { w: 136, h: 132, terminals: { A: { x: 30, y: 106 }, C: { x: 68, y: 106 }, B: { x: 106, y: 106 } } },
  battery: { w: 160, h: 82, terminals: { "-": { x: 8, y: 42 }, "+": { x: 152, y: 42 } } },
};

/** Tâm khung bao của linh kiện (toạ độ scene) — dùng làm ô thả khi lắp. */
export function partCenter(kind, at) {
  const g = PART_GEOMETRY[kind];
  return { x: at.x + (g.w * at.s) / 2, y: at.y + (g.h * at.s) / 2 };
}

/** Toạ độ scene của một chốt nối. */
export function terminalAt(kind, at, name) {
  const t = PART_GEOMETRY[kind].terminals[name];
  return { x: at.x + t.x * at.s, y: at.y + t.y * at.s };
}

/** Điểm trên đường tròn: 0° = hướng lên, chiều kim đồng hồ là dương. */
function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

function Place({ at, children, ...rest }) {
  return <g transform={`translate(${at.x} ${at.y}) scale(${at.s})`} {...rest}>{children}</g>;
}

function Jack({ x, y, color, ring = "#E2E8F0", selected = false }) {
  return (
    <g>
      <circle cx={x} cy={y} r="9.5" fill={color} stroke={selected ? C.orange : ring} strokeWidth={selected ? 3.5 : 2} />
      <circle cx={x} cy={y} r="3.6" fill="#0B0F19" />
    </g>
  );
}

function Screw({ x, y }) {
  return (
    <g>
      <circle cx={x} cy={y} r="8" fill="#D4A017" stroke="#7A5C0A" strokeWidth="2" />
      <line x1={x - 4.5} y1={y} x2={x + 4.5} y2={y} stroke="#7A5C0A" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

const clickable = (handler) => (handler ? { role: "button", onClick: handler, style: { cursor: "pointer" } } : {});

/* ---------------- Nguồn điện một chiều điều chỉnh được ---------------- */
export const SOURCE_RANGE = { min: 0, max: 10 };

/**
 * Núm xoay kéo được (pointer capture): góc −span..+span ↔ min..max; phím mũi tên ±step.
 * Trả về props gắn vào <g> chứa vùng bấm [data-dial-hit].
 */
function dialProps({ value, min, max, step, span, onChange, label }) {
  const turnTo = (event) => {
    const hit = event.currentTarget.querySelector("[data-dial-hit]");
    if (!hit) return;
    const rect = hit.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < rect.width * 0.1) return;             // sát tâm: hướng không rõ
    const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;             // 0° = lên, chiều kim đồng hồ dương
    if (Math.abs(deg) > span + 20) return;                          // khe chặn dưới đáy: giữ nguyên
    const frac = (Math.max(-span, Math.min(span, deg)) + span) / (2 * span);
    onChange(+(Math.round((min + frac * (max - min)) / step) * step).toFixed(3));
  };
  return {
    role: "slider",
    tabIndex: 0,
    "aria-label": label,
    "aria-valuemin": min,
    "aria-valuemax": max,
    "aria-valuenow": value,
    style: { cursor: "grab", touchAction: "none" },
    onPointerDown: (event) => { event.stopPropagation(); event.currentTarget.setPointerCapture?.(event.pointerId); turnTo(event); },
    onPointerMove: (event) => { if (event.currentTarget.hasPointerCapture?.(event.pointerId)) turnTo(event); },
    onPointerUp: (event) => event.currentTarget.releasePointerCapture?.(event.pointerId),
    onKeyDown: (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); onChange(+Math.min(max, value + step).toFixed(3)); }
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); onChange(+Math.max(min, value - step).toFixed(3)); }
    },
  };
}

/**
 * onChange: kéo xoay núm điện áp liên tục 0 → 10 V (bước 0,1 V); onStepVoltage: chỉ bấm để nhảy nấc.
 * @param {{ at: Placement, on?: boolean, voltage?: number, onTogglePower?: (() => void) | null, onStepVoltage?: (() => void) | null, onChange?: ((value: number) => void) | null }} props
 */
export function DcSource({ at, on = false, voltage = 1, onTogglePower = null, onStepVoltage = null, onChange = null }) {
  const knob = { x: 52, y: 106 };
  const span = SOURCE_RANGE.max - SOURCE_RANGE.min;
  const angleOf = (v) => -120 + ((Math.min(SOURCE_RANGE.max, Math.max(SOURCE_RANGE.min, v)) - SOURCE_RANGE.min) / span) * 240;
  const tip = polar(knob.x, knob.y, 15, angleOf(voltage));
  const knobProps = onChange
    ? dialProps({ value: voltage, min: SOURCE_RANGE.min, max: SOURCE_RANGE.max, step: 0.1, span: 120, onChange, label: "Núm chỉnh điện áp nguồn — kéo xoay để chỉnh" })
    : { ...clickable(onStepVoltage), "aria-label": `Núm chỉnh điện áp, đang đặt ${voltage} V` };
  return (
    <Place at={at}>
      <rect x="1" y="1" width="198" height="148" rx="14" fill="#EEF1F4" stroke="#475569" strokeWidth="2" />
      <text x="14" y="18" fontSize="9.5" fontWeight="900" fill="#475569" fontFamily={FONT}>NGUỒN MỘT CHIỀU</text>

      <rect x="12" y="25" width="104" height="40" rx="6" fill="#172033" />
      <text x="106" y="52" textAnchor="end" fontFamily="monospace" fontSize="19" fontWeight="900" fill={on ? "#86EFAC" : "#475569"}>
        {on ? `${voltage.toFixed(1)} V` : "OFF"}
      </text>

      <g {...clickable(onTogglePower)} aria-label={on ? "Tắt nguồn" : "Bật nguồn"}>
        <circle cx="160" cy="45" r="20" fill={on ? "#16A34A" : "#CBD5E1"} stroke="#334155" strokeWidth="2" />
        <path d="M153 39 A10 10 0 1 0 167 39" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <line x1="160" y1="33" x2="160" y2="45" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <text x="160" y="80" textAnchor="middle" fontSize="8.5" fontWeight="900" fill={on ? "#15803D" : "#64748B"} fontFamily={FONT}>
          {on ? "ĐANG BẬT" : "BẬT / TẮT"}
        </text>
      </g>

      <g {...knobProps}>
        <circle data-dial-hit="1" cx={knob.x} cy={knob.y} r="36" fill="transparent" />
        {[0, 2, 4, 6, 8, 10].map((v) => {
          const a = angleOf(v);
          const label = polar(knob.x, knob.y, 30, a);
          const t1 = polar(knob.x, knob.y, 21, a);
          const t2 = polar(knob.x, knob.y, 25, a);
          return (
            <g key={v}>
              <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke="#64748B" strokeWidth="1.6" />
              <text x={label.x} y={label.y + 3} textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#475569" fontFamily={FONT}>{v}</text>
            </g>
          );
        })}
        <circle cx={knob.x} cy={knob.y} r="18" fill="#334155" stroke="#0F172A" strokeWidth="2" />
        <line x1={knob.x} y1={knob.y} x2={tip.x} y2={tip.y} stroke="#FB923C" strokeWidth="4" strokeLinecap="round" />
        <text x={knob.x} y="145" textAnchor="middle" fontSize="8" fontWeight="900" fill="#475569" fontFamily={FONT}>ĐIỆN ÁP (V)</text>
      </g>

      <text x="151" y="103" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#475569" fontFamily={FONT}>DC OUT</text>
      <Jack x={132} y={124} color="#111827" />
      <Jack x={170} y={124} color="#DC2626" />
      <text x="132" y="146" textAnchor="middle" fontSize="12" fontWeight="900" fill="#111827" fontFamily={FONT}>−</text>
      <text x="170" y="146" textAnchor="middle" fontSize="12" fontWeight="900" fill="#DC2626" fontFamily={FONT}>+</text>
    </Place>
  );
}

/* ---------------- Khóa K (cầu dao) ---------------- */
/** @param {{ at: Placement, closed?: boolean, onToggle?: (() => void) | null }} props */
export function SwitchK({ at, closed = false, onToggle = null }) {
  return (
    <Place at={at} {...clickable(onToggle)} aria-label={closed ? "Khóa K đang đóng — bấm để mở" : "Khóa K đang mở — bấm để đóng"}>
      <rect x="1" y="52" width="122" height="38" rx="9" fill="#334155" stroke="#0F172A" strokeWidth="2" />
      <rect x="23" y="40" width="12" height="16" rx="2" fill="#94A3B8" stroke="#475569" />
      <rect x="88" y="36" width="16" height="20" rx="2" fill="#94A3B8" stroke="#475569" />
      <g transform={`rotate(${closed ? 0 : -30} 29 46)`}>
        <rect x="26" y="42" width="72" height="8" rx="4" fill={closed ? "#16A34A" : "#E2E8F0"} stroke="#475569" />
        <circle cx="99" cy="46" r="7" fill="#DC2626" stroke="#7F1D1D" />
      </g>
      <circle cx="29" cy="46" r="4.5" fill="#475569" />
      <Screw x={14} y={72} />
      <Screw x={110} y={72} />
      <text x="62" y="76" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" fontFamily={FONT}>K · {closed ? "ĐÓNG" : "MỞ"}</text>
    </Place>
  );
}

/* ---------------- Đồng hồ đa năng hiện số ---------------- */
const METER_JACKS = [
  { id: "A", x: 22, label: "10A", color: "#7F1D1D" },
  { id: "mA", x: 50, label: "mA/µA", color: "#B91C1C" },
  { id: "COM", x: 80, label: "COM", color: "#111827" },
  { id: "V", x: 108, label: "VΩ", color: "#DC2626" },
];

function formatReading(mode, value) {
  if (!Number.isFinite(value)) return "0";
  if (mode === "mA") return value.toFixed(1);
  if (mode === "µA") return value.toFixed(0);
  if (mode === "V") return value.toFixed(3);
  return value.toFixed(1);
}

/** Ôm kế tự chọn thang như VOM số: 0,1 Ω → Ω → kΩ → MΩ; từ 20 MΩ trở lên (hở mạch) hiện "OL". */
export function ohmDisplay(value) {
  const v = Math.abs(value);
  if (!Number.isFinite(value) || v >= 2e7) return { text: "OL", unit: "MΩ", open: true };
  if (v < 200) return { text: value.toFixed(1), unit: "Ω" };
  if (v < 2000) return { text: value.toFixed(0), unit: "Ω" };
  if (v < 2e4) return { text: (value / 1e3).toFixed(2), unit: "kΩ" };
  if (v < 2e5) return { text: (value / 1e3).toFixed(1), unit: "kΩ" };
  if (v < 2e6) return { text: (value / 1e3).toFixed(0), unit: "kΩ" };
  return { text: (value / 1e6).toFixed(2), unit: "MΩ" };
}

/**
 * reading: số đo theo nấc (V, mA, µA, hoặc Ω — tự đổi thang kΩ/MΩ). alert: nấc Ω mà đoạn đo còn điện
 * (số chỉ sai) → màn hình nhấp nháy tam giác cảnh báo.
 * @param {{ at: Placement, mode?: string, reading?: number, overload?: boolean, alert?: boolean, title?: string | null, onCycleMode?: (() => void) | null, selectedJack?: string | null, highlightJacks?: string[], onJack?: ((id: string) => void) | null }} props
 */
export function Multimeter({ at, mode = "OFF", reading = 0, overload = false, alert = false, title = null, onCycleMode = null, selectedJack = null, highlightJacks = [], onJack = null }) {
  const knob = { x: 65, y: 118 };
  const tip = polar(knob.x, knob.y, 16, METER_MODE_ANGLE[mode] ?? 0);
  const ohm = mode === "Ω" ? ohmDisplay(reading) : null;
  const text = mode === "OFF" ? "" : overload ? "OL" : ohm ? ohm.text : formatReading(mode, reading);
  const lcd = mode === "OFF" ? "#334155" : overload || ohm?.open ? "#FCA5A5" : alert ? "#FDE68A" : "#86EFAC";
  return (
    <Place at={at}>
      <rect x="1" y="1" width="128" height="212" rx="18" fill="#F5A623" stroke="#9A5B0C" strokeWidth="2" />
      <rect x="9" y="9" width="112" height="196" rx="12" fill="#FFFDF8" />
      {title && <text x="65" y="22" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#9A5B0C" fontFamily={FONT}>{title}</text>}

      <rect x="16" y="28" width="98" height="42" rx="6" fill="#172033" stroke={alert ? "#F59E0B" : "none"} strokeWidth="2" />
      <text x="107" y="56" textAnchor="end" fontFamily="monospace" fontSize="19" fontWeight="900" fill={lcd}>{text}</text>
      <text x="21" y="39" fontSize="7.5" fontWeight="900" fill="#BBF7D0" fontFamily={FONT}>{ohm ? ohm.unit : METER_UNIT[mode]}</text>
      {alert && (
        <g style={{ pointerEvents: "none" }}>
          <path d="M24 64 L30 53 L36 64 Z" fill="#F59E0B" stroke="#78350F" strokeWidth="1" strokeLinejoin="round">
            <animate attributeName="opacity" values="1;0.25;1" dur="0.9s" repeatCount="indefinite" />
          </path>
          <text x="30" y="62.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#78350F" fontFamily={FONT}>!</text>
        </g>
      )}

      <g {...clickable(onCycleMode)} aria-label={`Núm xoay đang ở ${mode}; bấm để chuyển nấc`}>
        <circle cx={knob.x} cy={knob.y} r="44" fill="transparent" />
        {METER_MODES.map((m) => {
          const p = polar(knob.x, knob.y, 35, METER_MODE_ANGLE[m]);
          return (
            <text key={m} x={p.x} y={p.y + 3} textAnchor="middle" fontSize="8.5" fontWeight="900" fill={m === mode ? C.orangeDk : "#475569"} fontFamily={FONT}>
              {m}
            </text>
          );
        })}
        <circle cx={knob.x} cy={knob.y} r="21" fill="#1F2937" stroke="#475569" strokeWidth="3" />
        <line x1={knob.x} y1={knob.y} x2={tip.x} y2={tip.y} stroke="#FB923C" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx={knob.x} cy={knob.y} r="4" fill="#FB923C" />
      </g>

      {METER_JACKS.map((j) => (
        <g key={j.id} {...clickable(onJack ? () => onJack(j.id) : null)} aria-label={onJack ? `Lỗ cắm ${j.label}` : undefined}>
          <text x={j.x} y="171" textAnchor="middle" fontSize="7" fontWeight="900" fill={highlightJacks.includes(j.id) ? C.orangeDk : "#475569"} fontFamily={FONT}>{j.label}</text>
          {onJack && <circle cx={j.x} cy="186" r="14" fill="transparent" />}
          <Jack x={j.x} y={186} color={j.color} selected={selectedJack === j.id || highlightJacks.includes(j.id)} />
        </g>
      ))}
    </Place>
  );
}

/* ---------------- Điện trở / vật dẫn ---------------- */
/**
 * heat (0..1): vật dẫn nóng lên khi dòng lớn — hắt quầng cam.
 * @param {{ at: Placement, label?: string | null, tint?: string, bands?: string[], heat?: number }} props
 */
export function Resistor({ at, label = null, tint = "#F3E3C3", bands = ["#8B572A", "#111827", "#D0021B", "#C9A227"], heat = 0 }) {
  return (
    <Place at={at}>
      {heat > 0.04 && (
        <g style={{ pointerEvents: "none" }}>
          <defs>
            <radialGradient id="phylab-resistor-heat">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="80" cy="34" rx="78" ry="30" fill="url(#phylab-resistor-heat)" opacity={Math.min(0.9, 0.15 + heat)}>
            <animate attributeName="ry" values="26;34;26" dur="1.5s" repeatCount="indefinite" />
          </ellipse>
        </g>
      )}
      {label && <text x="80" y="11" textAnchor="middle" fontSize="11" fontWeight="900" fill={C.ink} fontFamily={FONT}>{label}</text>}
      <line x1="6" y1="34" x2="38" y2="34" stroke="#6B7280" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="122" y1="34" x2="154" y2="34" stroke="#6B7280" strokeWidth="3.5" strokeLinecap="round" />
      <rect x="34" y="18" width="92" height="32" rx="14" fill={tint} stroke="#8A6D3B" strokeWidth="2" />
      {bands.map((color, i) => <rect key={i} x={52 + i * 15} y="18" width="7" height="32" fill={color} />)}
    </Place>
  );
}

/* ---------------- Biến trở (A, B: hai đầu dây; C: con chạy) ----------------
   onChange: kéo xoay núm liên tục 0 → max (có chặn hai đầu như núm thật; phím mũi tên ±1).
   onStep: chỉ bấm để nhảy nấc (khi không cần xoay tự do). */
/** @param {{ at: Placement, value?: number, max?: number, onStep?: (() => void) | null, onChange?: ((value: number) => void) | null }} props */
export function Rheostat({ at, value = 0, max = 100, onStep = null, onChange = null }) {
  const dial = { x: 68, y: 56 };
  const angleOf = (v) => -135 + (Math.min(max, Math.max(0, v)) / max) * 270;
  const tip = polar(dial.x, dial.y, 17, angleOf(value));
  const arcFrom = polar(dial.x, dial.y, 30, -135);
  const arcTo = polar(dial.x, dial.y, 30, 135);
  const turnTo = (event) => {
    const hit = event.currentTarget.querySelector("[data-dial-hit]");
    if (!hit) return;
    const rect = hit.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < rect.width * 0.1) return;           // sát tâm: hướng không rõ
    const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;           // 0° = lên, chiều kim đồng hồ dương
    if (Math.abs(deg) > 155) return;                              // khe chặn dưới đáy: giữ nguyên
    onChange(Math.round(((Math.max(-135, Math.min(135, deg)) + 135) / 270) * max));
  };
  const dialProps = onChange
    ? {
        role: "slider",
        tabIndex: 0,
        "aria-label": "Núm biến trở — kéo xoay để chỉnh",
        "aria-valuemin": 0,
        "aria-valuemax": max,
        "aria-valuenow": value,
        style: { cursor: "grab", touchAction: "none" },
        onPointerDown: (event) => { event.stopPropagation(); event.currentTarget.setPointerCapture?.(event.pointerId); turnTo(event); },
        onPointerMove: (event) => { if (event.currentTarget.hasPointerCapture?.(event.pointerId)) turnTo(event); },
        onPointerUp: (event) => event.currentTarget.releasePointerCapture?.(event.pointerId),
        onKeyDown: (event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); onChange(Math.min(max, value + 1)); }
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); onChange(Math.max(0, value - 1)); }
        },
      }
    : { ...clickable(onStep), "aria-label": `Biến trở đang ở ${value} Ω${onStep ? "; bấm để đổi" : ""}` };
  return (
    <Place at={at}>
      <rect x="1" y="1" width="134" height="130" rx="12" fill="#FFFDF8" stroke="#475569" strokeWidth="2" />
      <text x="11" y="16" fontSize="9" fontWeight="900" fill="#475569" fontFamily={FONT}>BIẾN TRỞ</text>
      <text x="125" y="16" textAnchor="end" fontSize="10" fontWeight="900" fill={C.orangeDk} fontFamily={FONT}>{value} Ω</text>
      <g {...dialProps}>
        <circle data-dial-hit="1" cx={dial.x} cy={dial.y} r="36" fill="transparent" />
        <path d={`M${arcFrom.x} ${arcFrom.y} A30 30 0 1 1 ${arcTo.x} ${arcTo.y}`} fill="none" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
        <path d={`M${arcFrom.x} ${arcFrom.y} A30 30 0 ${angleOf(value) > 45 ? 1 : 0} 1 ${polar(dial.x, dial.y, 30, angleOf(value)).x} ${polar(dial.x, dial.y, 30, angleOf(value)).y}`} fill="none" stroke={C.orange} strokeWidth="4" strokeLinecap="round" />
        <circle cx={dial.x} cy={dial.y} r="20" fill="#374151" stroke="#111827" strokeWidth="2" />
        <line x1={dial.x} y1={dial.y} x2={tip.x} y2={tip.y} stroke="#FB923C" strokeWidth="4" strokeLinecap="round" />
        <text x={arcFrom.x - 2} y={arcFrom.y + 12} textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#475569" fontFamily={FONT}>0</text>
        <text x={arcTo.x + 2} y={arcTo.y + 12} textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#475569" fontFamily={FONT}>{max}</text>
      </g>
      <Jack x={30} y={106} color="#DC2626" />
      <Jack x={68} y={106} color="#111827" />
      <Jack x={106} y={106} color="#DC2626" />
      <text x="30" y="127" textAnchor="middle" fontSize="8" fontWeight="900" fill="#475569" fontFamily={FONT}>A</text>
      <text x="68" y="127" textAnchor="middle" fontSize="8" fontWeight="900" fill="#475569" fontFamily={FONT}>C · con chạy</text>
      <text x="106" y="127" textAnchor="middle" fontSize="8" fontWeight="900" fill="#475569" fontFamily={FONT}>B</text>
    </Place>
  );
}

/* ---------------- Pin điện hóa: cực âm đế phẳng (N), cực dương núm nhỏ (M) ----------------
   heat (0..1): phần năng lượng hao trong pin (I²r) — pin "nóng sáng" khi dòng lớn. */
/** @param {{ at: Placement, cell?: "new" | "old", heat?: number }} props */
export function Battery({ at, cell = "new", heat = 0 }) {
  return (
    <Place at={at}>
      {heat > 0.03 && (
        <g style={{ pointerEvents: "none" }}>
          <defs>
            <radialGradient id="phylab-cell-heat">
              <stop offset="0%" stopColor="#FB923C" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#FB923C" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="79" cy="42" rx="96" ry="52" fill="url(#phylab-cell-heat)" opacity={Math.min(0.9, heat)}>
            <animate attributeName="ry" values="48;56;48" dur="1.4s" repeatCount="indefinite" />
          </ellipse>
        </g>
      )}
      <rect x="6" y="24" width="12" height="36" rx="2" fill="#9CA3AF" stroke="#4B5563" />
      <rect x="16" y="16" width="126" height="52" rx="12" fill={cell === "old" ? "#64748B" : "#2563EB"} stroke="#1E293B" strokeWidth="2" />
      <rect x="40" y="22" width="78" height="40" rx="6" fill="#fff" opacity="0.93" />
      <rect x="142" y="34" width="10" height="16" rx="3" fill="#D1D5DB" stroke="#4B5563" />
      <text x="79" y="40" textAnchor="middle" fontSize="12" fontWeight="900" fill="#0C4A6E" fontFamily={FONT}>PIN {cell === "old" ? "CŨ" : "MỚI"}</text>
      <text x="79" y="55" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#475569" fontFamily={FONT}>E, r = ?</text>
      <text x="28" y="48" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff" fontFamily={FONT}>−</text>
      <text x="131" y="48" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff" fontFamily={FONT}>+</text>
      <text x="6" y="80" fontSize="9" fontWeight="900" fill="#475569" fontFamily={FONT}>N (−)</text>
      <text x="154" y="80" textAnchor="end" fontSize="9" fontWeight="900" fill="#B91C1C" fontFamily={FONT}>M (+)</text>
    </Place>
  );
}

/* ---------------- Bảng lắp mạch 216 nút (ảnh gốc, giữ đúng tỉ lệ) ---------------- */
/** @param {{ at: Placement, opacity?: number }} props */
export function CircuitBoard({ at, opacity = 1 }) {
  const g = PART_GEOMETRY.board;
  return (
    <Place at={at}>
      <image href="/lab/electric/circuit-board.svg" x="0" y="0" width={g.w} height={g.h} opacity={opacity} />
    </Place>
  );
}

/* Khung bao "mạng" 9 nút và toạ độ nút — hình học thật của bảng, xem boardGeometry.js. */
export { boardModuleRect, boardNode } from "./boardGeometry.js";
