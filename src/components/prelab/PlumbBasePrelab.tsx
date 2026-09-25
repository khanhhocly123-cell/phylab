"use client";

import React, { useState } from "react";
import { Lock, RotateCcw, RotateCw } from "lucide-react";

/* ============================================================================
   PlumbBasePrelab — cân bằng giá đỡ 3 chân bằng dây dọi (Bài 11).
   Như đồ thật: giá có HAI vít chỉnh; mỗi vít nghiêng giá theo một hướng chéo nhau, nên
   phải vặn luân phiên hai vít để đưa mũi quả dọi về đúng tâm bia (nhìn từ trên xuống).
   Thẳng đứng rồi mới xiết khóa cả hai vít.
   ========================================================================== */

const C = {
  orange: "#E8842B",
  orangeDk: "#D56A17",
  navy: "#1F4D78",
  ink: "#2A2A28",
  sub: "#8a8278",
  line: "#EFE7D8",
  good: "#3E8E3E",
};
const FONT = "var(--font-nunito), Nunito, system-ui, sans-serif";

const INFO = {
  rod: { title: "Thanh trục Inox (Ø10mm)", body: "Thanh trục kim loại dẫn hướng cho máng rơi và nam châm điện. Trục phải thẳng đứng để trụ thép rơi không chạm thành máng và cắt đúng tia cổng quang." },
  screwLeft: { title: "Vít chỉnh bên trái", body: "Vặn vít làm chân trái cao/thấp → giá nghiêng theo hướng chéo sang phải–lên. Vặn luân phiên với vít phải để đưa quả dọi về tâm." },
  screwRight: { title: "Vít chỉnh bên phải", body: "Vặn vít làm chân phải cao/thấp → giá nghiêng theo hướng chéo sang trái–lên. Phối hợp hai vít thì đi được mọi hướng." },
  plumbLine: { title: "Dây dọi", body: "Quả dọi luôn chỉ phương thẳng đứng của Trái Đất. Khi mũi quả dọi trùng tâm bia, thanh trục đã thẳng đứng." },
  target: { title: "Bia nhìn từ trên xuống", body: "Chấm đỏ là mũi quả dọi. Vặn vít trái đẩy chấm theo mũi tên cam, vít phải theo mũi tên xanh. Đưa chấm vào vòng xanh ở tâm." },
};

const GND = 282;
const CX = 190;
const HUB_Y = 194;
const HUB_H = 36;
const ROD_TOP = 28;
const ROD_BOT = HUB_Y + 8;
const ARM_END_Y = HUB_Y + 18;
const SCREW_X_L = 80;
const SCREW_X_R = 300;
const SCREW_TOP = ARM_END_Y - 4;
const SCREW_BOT = GND - 8;
const PLUMB_TOP = HUB_Y + 10;
const PLUMB_BOT = GND - 20;
// Bia nhìn từ trên (góc phải)
const TV = { x: 382, y: 118, r: 46, k: 4.4 };
// Mỗi nửa vòng vít đẩy mũi dọi một đoạn theo hướng chéo; vòng xanh = đạt thẳng đứng.
const DIR_L = { x: 0.87, y: 0.5 };
const DIR_R = { x: -0.87, y: 0.5 };
const BASE = { x: 5.2, y: -2.6 };
const STEP = 0.5;
const TOL = 0.35;

interface PlumbBasePrelabProps {
  onLocked?: () => void;
}

export default function PlumbBasePrelab({ onLocked }: PlumbBasePrelabProps) {
  const [sel, setSel] = useState<keyof typeof INFO | null>(null);
  const [turnL, setTurnL] = useState(0);
  const [turnR, setTurnR] = useState(0);
  const [leftLocked, setLeftLocked] = useState(false);
  const [rightLocked, setRightLocked] = useState(false);

  const tilt = { x: BASE.x + DIR_L.x * turnL + DIR_R.x * turnR, y: BASE.y + DIR_L.y * turnL + DIR_R.y * turnR };
  const off = Math.hypot(tilt.x, tilt.y);
  const isAligned = off < TOL;
  const bothLocked = leftLocked && rightLocked;
  const eTilt = bothLocked ? { x: 0, y: 0 } : tilt;
  const lockedCount = (leftLocked ? 1 : 0) + (rightLocked ? 1 : 0);
  const step = bothLocked ? "done" : isAligned ? "lock" : "align";

  const turn = (side: "L" | "R", dir: number) => {
    if (bothLocked) return;
    if (leftLocked || rightLocked) { setLeftLocked(false); setRightLocked(false); }
    setSel(side === "L" ? "screwLeft" : "screwRight");
    if (side === "L") setTurnL((v) => Math.max(-10, Math.min(10, +(v + dir * STEP).toFixed(2))));
    else setTurnR((v) => Math.max(-10, Math.min(10, +(v + dir * STEP).toFixed(2))));
  };
  const lock = (side: "L" | "R") => {
    setSel(side === "L" ? "screwLeft" : "screwRight");
    if (!isAligned || bothLocked) return;
    if (side === "L") { setLeftLocked(true); if (rightLocked) onLocked?.(); }
    else { setRightLocked(true); if (leftLocked) onLocked?.(); }
  };
  const unlockAll = () => { setLeftLocked(false); setRightLocked(false); setSel(null); };

  const info = sel ? INFO[sel] : {
    title: "Giá đỡ 3 chân & dây dọi",
    body: step === "done"
      ? "Hoàn tất! Cả hai vít đã xiết, thanh trục thẳng đứng. Giá đỡ sẵn sàng cho thí nghiệm."
      : "Nhìn bia từ trên xuống: vặn hai vít luân phiên để chấm đỏ (mũi quả dọi) đi vào vòng xanh ở tâm, rồi xiết khóa cả hai vít.",
  };
  const bob = { x: TV.x + eTilt.x * TV.k, y: TV.y + eTilt.y * TV.k };
  const clampTV = (p: { x: number; y: number }) => {
    const dx = p.x - TV.x, dy = p.y - TV.y, d = Math.hypot(dx, dy), max = TV.r + 8;
    return d > max ? { x: TV.x + (dx * max) / d, y: TV.y + (dy * max) / d } : p;
  };
  const bobShown = clampTV(bob);

  const screw = (x: number, side: "L" | "R", locked: boolean, turns: number) => {
    const dy = side === "L" ? eTilt.x * 0.5 : -eTilt.x * 0.5;
    return (
      <g style={{ cursor: isAligned && !bothLocked ? "pointer" : "default" }} onClick={() => lock(side)} transform={`translate(0, ${dy})`}>
        <rect x={x - 2} y={SCREW_TOP} width="4" height={SCREW_BOT - SCREW_TOP} fill={locked ? "#22C55E" : "#9CA3AF"} />
        <rect x={x - 11} y={SCREW_TOP - 5} width="22" height="10" rx="3" fill={locked ? "#22C55E" : "url(#pb-brass)"} stroke={locked ? "#16A34A" : "#7A5C0A"} strokeWidth="0.8" />
        {[0, 1, 2, 3, 4].map((i) => {
          const phase = ((turns * 4 + i) % 5 + 5) % 5;
          return <line key={i} x1={x - 9 + phase * 4.5} y1={SCREW_TOP - 4} x2={x - 9 + phase * 4.5} y2={SCREW_TOP + 4} stroke={locked ? "#15803D" : "#7A5C0A"} strokeWidth="0.8" opacity="0.7" />;
        })}
        <polygon points={`${x - 6},${SCREW_BOT} ${x + 6},${SCREW_BOT} ${x + 8},${GND} ${x - 8},${GND}`} fill="url(#pb-iron)" />
        {locked && (
          <g transform={`translate(${x + 15}, ${SCREW_TOP})`}>
            <circle r="6" fill="#22C55E" />
            <polyline points="-3,0 -1,3 4,-3" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
        <text x={x} y={GND + 14} textAnchor="middle" style={{ fontSize: 10, fontWeight: 900, fill: side === "L" ? C.orangeDk : C.navy, fontFamily: FONT }}>{side === "L" ? "Vít trái" : "Vít phải"}</text>
      </g>
    );
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start" style={{ fontFamily: FONT }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <StepChip n={1} label="Đưa mũi dọi vào tâm" active={step === "align"} done={step !== "align"} />
          <span style={{ color: step === "align" ? "#ccc" : C.navy, fontWeight: 900 }}>›</span>
          <StepChip n={2} label={`Xiết vít (${lockedCount}/2)`} active={step === "lock"} done={step === "done"} />
        </div>

        <div style={{ background: "#F6F1E7", borderRadius: 14, padding: "0.6rem", border: "1px solid #E9E2D4" }}>
          <svg width="100%" viewBox="0 0 440 300" role="img" aria-label="Giá đỡ 3 chân, dây dọi và bia nhìn từ trên" style={{ display: "block", overflow: "visible" }}>
            <defs>
              <linearGradient id="pb-iron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5B6472" /><stop offset="0.45" stopColor="#374151" /><stop offset="1" stopColor="#1F2937" /></linearGradient>
              <linearGradient id="pb-rod" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F8FAFC" /><stop offset="0.35" stopColor="#D9DEE5" /><stop offset="0.7" stopColor="#A7B0BC" /><stop offset="1" stopColor="#CBD2DA" /></linearGradient>
              <linearGradient id="pb-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FDE68A" /><stop offset="0.5" stopColor="#D4A017" /><stop offset="1" stopColor="#8A6A0B" /></linearGradient>
            </defs>
            <rect x="5" y="5" width="430" height="290" rx="10" fill="#FFFDF8" stroke="#E6DCC8" strokeWidth="1" />
            <line x1="20" y1={GND} x2="330" y2={GND} stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Thanh trục nghiêng theo độ lệch */}
            <g transform={`rotate(${eTilt.x * 0.45}, ${CX}, ${HUB_Y + HUB_H / 2})`} style={{ cursor: "pointer" }} onClick={() => setSel("rod")}>
              <rect x={CX - 6} y={ROD_TOP} width="12" height={ROD_BOT - ROD_TOP} rx="3" fill="url(#pb-rod)" stroke="#8B95A1" strokeWidth="0.8" />
              <circle cx={CX} cy={ROD_TOP + 1} r="6.5" fill="#CBD2DA" stroke="#8B95A1" strokeWidth="0.8" />
            </g>
            {/* Khung gang */}
            <g>
              <rect x={CX - 18} y={HUB_Y} width="36" height={HUB_H} rx="4" fill="url(#pb-iron)" />
              <path d={`M ${CX - 18} ${HUB_Y + 14} C ${CX - 60} ${HUB_Y + 14}, ${SCREW_X_L + 30} ${ARM_END_Y - 4}, ${SCREW_X_L + 8} ${ARM_END_Y} L ${SCREW_X_L + 8} ${ARM_END_Y + 12} C ${SCREW_X_L + 30} ${ARM_END_Y + 6}, ${CX - 60} ${HUB_Y + 24}, ${CX - 18} ${HUB_Y + 24} Z`} fill="url(#pb-iron)" />
              <path d={`M ${CX + 18} ${HUB_Y + 14} C ${CX + 60} ${HUB_Y + 14}, ${SCREW_X_R - 30} ${ARM_END_Y - 4}, ${SCREW_X_R - 8} ${ARM_END_Y} L ${SCREW_X_R - 8} ${ARM_END_Y + 12} C ${SCREW_X_R - 30} ${ARM_END_Y + 6}, ${CX + 60} ${HUB_Y + 24}, ${CX + 18} ${HUB_Y + 24} Z`} fill="url(#pb-iron)" />
              <rect x={SCREW_X_L - 8} y={ARM_END_Y - 2} width="16" height="16" rx="2" fill="url(#pb-iron)" />
              <rect x={SCREW_X_R - 8} y={ARM_END_Y - 2} width="16" height="16" rx="2" fill="url(#pb-iron)" />
              <rect x={CX - 6} y={HUB_Y + HUB_H - 4} width="12" height={GND - HUB_Y - HUB_H + 4} fill="url(#pb-iron)" />
            </g>
            {screw(SCREW_X_L, "L", leftLocked, turnL)}
            {screw(SCREW_X_R, "R", rightLocked, turnR)}
            {/* Dây dọi (nhìn ngang) */}
            <g style={{ cursor: "pointer" }} onClick={() => setSel("plumbLine")}>
              <line x1={CX} y1={PLUMB_TOP} x2={CX + eTilt.x * 1.6} y2={PLUMB_BOT} stroke={bothLocked ? C.good : "#1F2937"} strokeWidth="1.1" />
              <path d={`M${CX + eTilt.x * 1.6 - 5} ${PLUMB_BOT + 2} Q${CX + eTilt.x * 1.6 - 5} ${PLUMB_BOT - 1} ${CX + eTilt.x * 1.6} ${PLUMB_BOT - 1} Q${CX + eTilt.x * 1.6 + 5} ${PLUMB_BOT - 1} ${CX + eTilt.x * 1.6 + 5} ${PLUMB_BOT + 2} L${CX + eTilt.x * 1.6 + 0.7} ${PLUMB_BOT + 14} L${CX + eTilt.x * 1.6 - 0.7} ${PLUMB_BOT + 14} Z`}
                fill={isAligned || bothLocked ? C.good : "url(#pb-brass)"} stroke={isAligned || bothLocked ? "#166534" : "#7A5C0A"} strokeWidth="0.8" strokeLinejoin="round" />
            </g>

            {/* Bia nhìn từ trên xuống */}
            <g style={{ cursor: "pointer" }} onClick={() => setSel("target")}>
              <text x={TV.x} y={TV.y - TV.r - 14} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 900, fill: C.ink, fontFamily: FONT }}>Nhìn từ trên xuống</text>
              <circle cx={TV.x} cy={TV.y} r={TV.r} fill="#fff" stroke="#CBD5E1" strokeWidth="1.5" />
              <circle cx={TV.x} cy={TV.y} r={TV.r * 0.62} fill="none" stroke="#E2E8F0" strokeWidth="1.2" />
              <circle cx={TV.x} cy={TV.y} r={TOL * TV.k + 2} fill={isAligned || bothLocked ? "#DCFCE7" : "#F0FDF4"} stroke={C.good} strokeWidth="1.5" />
              <line x1={TV.x - TV.r} y1={TV.y} x2={TV.x + TV.r} y2={TV.y} stroke="#E2E8F0" />
              <line x1={TV.x} y1={TV.y - TV.r} x2={TV.x} y2={TV.y + TV.r} stroke="#E2E8F0" />
              {/* hướng mỗi vít đẩy mũi dọi */}
              <line x1={TV.x} y1={TV.y} x2={TV.x + DIR_L.x * 30} y2={TV.y + DIR_L.y * 30} stroke={C.orange} strokeWidth="2" strokeDasharray="3 2" />
              <line x1={TV.x} y1={TV.y} x2={TV.x + DIR_R.x * 30} y2={TV.y + DIR_R.y * 30} stroke={C.navy} strokeWidth="2" strokeDasharray="3 2" />
              <circle cx={bobShown.x} cy={bobShown.y} r="5.5" fill={isAligned || bothLocked ? C.good : "#EF4444"} stroke="#fff" strokeWidth="1.8">
                {!isAligned && <animate attributeName="r" values="5;7;5" dur="1.2s" repeatCount="indefinite" />}
              </circle>
              <text x={TV.x} y={TV.y + TV.r + 16} textAnchor="middle" style={{ fontSize: 10, fontWeight: 900, fill: isAligned || bothLocked ? C.good : "#B91C1C", fontFamily: FONT }}>
                {bothLocked ? "ĐÃ CỐ ĐỊNH" : isAligned ? "THẲNG ĐỨNG — xiết vít!" : `lệch ${off.toFixed(1)} mm`}
              </text>
            </g>
          </svg>
        </div>

      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Hai vít: vặn luân phiên; thẳng đứng rồi thì xiết khóa */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {([["L", "Vít trái", C.orangeDk, leftLocked], ["R", "Vít phải", C.navy, rightLocked]] as const).map(([side, label, color, locked]) => (
            <div key={side} style={{ background: "#fff", border: `1.5px solid ${locked ? C.good : C.line}`, borderRadius: 12, padding: "8px 10px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 900, color, marginBottom: 6 }}>{label}{locked ? " · đã xiết" : ""}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => turn(side, -1)} disabled={bothLocked} aria-label={`${label}: vặn ngược chiều kim đồng hồ`} style={turnBtn}>
                  <RotateCcw size={15} strokeWidth={2.6} />
                </button>
                <button type="button" onClick={() => turn(side, 1)} disabled={bothLocked} aria-label={`${label}: vặn cùng chiều kim đồng hồ`} style={turnBtn}>
                  <RotateCw size={15} strokeWidth={2.6} />
                </button>
                <button type="button" onClick={() => lock(side)} disabled={!isAligned || locked || bothLocked}
                  style={{ ...turnBtn, flex: 1, fontSize: 12, fontWeight: 900, background: isAligned && !locked ? "#FEF3C7" : "#fff", color: locked ? C.good : isAligned ? "#92400E" : C.sub, opacity: !isAligned && !locked ? 0.6 : 1 }}>
                  <Lock size={13} strokeWidth={2.6} /> {locked ? "Đã khóa" : "Xiết khóa"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: bothLocked ? "#F0FDF4" : "#fff", border: bothLocked ? `1px solid ${C.good}` : "0.5px solid #e5e3dc", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: bothLocked ? "#166534" : C.navy }}>{info.title}</h3>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: bothLocked ? "#1e5e3a" : "#444" }}>{info.body}</p>
          </div>
          {bothLocked && (
            <button type="button" onClick={unlockAll} style={{ fontSize: 12, fontWeight: 800, color: C.navy, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}>
              Chỉnh lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const turnBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 40, height: 36, borderRadius: 10, border: "1px solid #E2DFD8", background: "#fff", color: "#321E12", cursor: "pointer", fontFamily: FONT };

function StepChip({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  const bg = done ? "#DCFCE7" : active ? "#FEF3C7" : "#F3F4F6";
  const color = done ? "#166534" : active ? "#92400E" : "#9CA3AF";
  const border = done ? "#86EFAC" : active ? "#FCD34D" : "#E5E7EB";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: bg, border: `1px solid ${border}`, fontSize: 12, fontWeight: 700, color }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: done ? "#22C55E" : active ? "#F59E0B" : "#D1D5DB", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>{done ? "✓" : n}</span>
      {label}
    </div>
  );
}
