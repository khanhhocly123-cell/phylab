"use client";

import React, { useState } from "react";
import { Check, Lock } from "lucide-react";

// Style constants
const C = {
  orange: "#E8842B",
  orangeLt: "#F59C3C",
  orangeDk: "#D56A17",
  navy: "#1F4D78",
  teal: "#2E74B5",
  ink: "#2A2A28",
  sub: "#8a8278",
  sub2: "#9a9286",
  cream: "#FBF6EC",
  peach: "#FDEFE0",
  peachLt: "#FFF6EC",
  line: "#EFE7D8",
  card: "#FFFFFF",
  good: "#3E8E3E",
};

const FONT = "var(--font-nunito), Nunito, system-ui, sans-serif";

const INFO = {
  rod: {
    title: "Thanh trục Inox (Ø10mm)",
    body: "Thanh trục kim loại thẳng làm hướng dẫn lắp đặt máng rơi hoặc nam châm điện. Trục này cần được chỉnh thẳng đứng tuyệt đối để vật rơi không bị chạm vào thành máng hoặc lệch khỏi cổng quang.",
  },
  frame: {
    title: "Khung gang đúc nguyên khối",
    body: "Khung chịu lực chính bằng gang đúc nặng, tạo độ đầm và vững chãi cho toàn bộ hệ thống giá đỡ, giảm thiểu rung động khi tiến hành thí nghiệm.",
  },
  screwLeft: {
    title: "Vít tinh chỉnh bên trái",
    body: "Vặn vít bên trái để thay đổi độ cao của chân bên trái, qua đó điều chỉnh góc nghiêng của hệ khung và thanh trục theo phương ngang. Sau khi thăng bằng, bấm để xiết chặt cố định.",
  },
  screwRight: {
    title: "Vít tinh chỉnh bên phải",
    body: "Vặn vít bên phải để phối hợp nâng/hạ cạnh phải của chân đỡ. Sau khi thăng bằng, bấm để xiết chặt cố định.",
  },
  plumbLine: {
    title: "Dây dọi cơ học thăng bằng",
    body: "Tận dụng trọng lực để xác định phương thẳng đứng chính xác của Trái Đất. Khi đầu nhọn của quả dọi trùng với tâm bia phía dưới, thanh trục đạt trạng thái thẳng đứng.",
  },
  target: {
    title: "Bia mục tiêu thăng bằng",
    body: "Vòng tròn tiêu chuẩn nằm ở phần chân khung gang. Mục tiêu của bạn là điều chỉnh các vít sao cho mũi nhọn quả dọi chỉ chính xác vào tâm chữ thập.",
  },
};

const BC = {
  cream: "#FBF6EC",
  stroke: "#888780",
  ironFrame: "#3A3D40",
  ironLight: "#565A5E",
  stainless: "#E2E8F0",
  stainlessShadow: "#CBD5E1",
  brass: "#D97706",
  brassLight: "#F59E0B",
  brassLocked: "#22C55E",
  plumbLine: "#EF4444",
  plumbBob: "#B45309",
  targetBg: "#E2E8F0",
  targetCross: "#94A3B8",
};

/* ── Layout — apparatus sits ON the ground ── */
const GND = 282;           // ground line Y
const CX = 220;            // center X
const HUB_Y = 194;         // center hub top
const HUB_H = 36;          // hub height
const ROD_TOP = 28;        // rod top
const ROD_BOT = HUB_Y + 8; // rod bottom (into hub)
const ARM_END_Y = HUB_Y + 18; // where arms meet screw columns
const SCREW_X_L = 100;     // left screw center X
const SCREW_X_R = 340;     // right screw center X
const SCREW_TOP = ARM_END_Y - 4;  // screw column top
const SCREW_BOT = GND - 8; // screw column bottom (just above foot)
const PLUMB_TOP = HUB_Y + 10;
const PLUMB_BOT = GND - 20;
const TARGET_Y = GND - 2;
const PILLAR_BOT = GND;    // center pillar bottom

interface PlumbBasePrelabProps {
  onLocked?: () => void;
}

export default function PlumbBasePrelab({ onLocked }: PlumbBasePrelabProps) {
  const [sel, setSel] = useState<keyof typeof INFO | null>(null);
  const [tilt, setTilt] = useState(6.5);
  const [leftLocked, setLeftLocked] = useState(false);
  const [rightLocked, setRightLocked] = useState(false);

  const isAligned = Math.abs(tilt) < 0.2;
  const bothLocked = leftLocked && rightLocked;

  const handleScrewChange = (val: string) => {
    if (bothLocked) return;
    // Nếu đã khóa 1 bên mà chỉnh lệch → mở khóa bên đó
    if (leftLocked || rightLocked) {
      setLeftLocked(false);
      setRightLocked(false);
    }
    setTilt(parseFloat(val));
  };

  const handleLockLeft = () => {
    setSel("screwLeft");
    if (!isAligned || bothLocked) return;
    setLeftLocked(true);
    if (rightLocked && onLocked) onLocked();
  };

  const handleLockRight = () => {
    setSel("screwRight");
    if (!isAligned || bothLocked) return;
    setRightLocked(true);
    if (leftLocked && onLocked) onLocked();
  };

  const handleUnlock = () => {
    setLeftLocked(false);
    setRightLocked(false);
    setSel(null);
  };

  const step = bothLocked ? "done" : isAligned ? "lock" : "align";
  const lockedCount = (leftLocked ? 1 : 0) + (rightLocked ? 1 : 0);

  const info = sel
    ? INFO[sel]
    : {
        title: "Giá đỡ 3 chân & Dây dọi",
        body: step === "done"
          ? "Hoàn tất! Cả hai vít đã được xiết chặt, thanh trục cố định thẳng đứng. Giá đỡ sẵn sàng cho thí nghiệm."
          : "Để kết quả bài đo rơi tự do chính xác, thanh trục inox bắt buộc phải thẳng đứng. Kéo thanh trượt đưa dây dọi về tâm, sau đó bấm cả hai vít để cố định.",
      };

  // Effective tilt (0 when locked)
  const eTilt = bothLocked ? 0 : tilt;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", fontFamily: FONT }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

        {/* ── Step indicators ── */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <StepChip n={1} label="Chỉnh thăng bằng" active={step === "align"} done={step === "lock" || step === "done"} />
          <ChevR color={step === "align" ? "#ccc" : C.navy} />
          <StepChip n={2} label={`Xiết vít (${lockedCount}/2)`} active={step === "lock"} done={step === "done"} />
        </div>

        {/* ── SVG ── */}
        <div style={{ background: "#f3f1ea", borderRadius: 12, padding: "1rem", position: "relative" }}>
          <svg
            width="100%" viewBox="0 0 440 300"
            role="img" aria-label="Giá đỡ 3 chân dây dọi"
            style={{ display: "block", overflow: "visible" }}
          >
            <rect x="5" y="5" width="430" height="290" rx="4" fill={BC.cream} stroke={BC.stroke} strokeWidth="0.5" />

            {/* Ground */}
            <line x1="30" y1={GND} x2="410" y2={GND} stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* ── ROD (rotates with tilt) ── */}
            <g
              transform={`rotate(${eTilt * 0.4}, ${CX}, ${HUB_Y + HUB_H / 2})`}
              style={{ cursor: "pointer" }} onClick={() => setSel("rod")}
            >
              <rect x={CX - 6} y={ROD_TOP} width="12" height={ROD_BOT - ROD_TOP} fill={BC.stainless} />
              <rect x={CX + 3} y={ROD_TOP} width="3" height={ROD_BOT - ROD_TOP} fill={BC.stainlessShadow} />
              <ellipse cx={CX} cy={ROD_TOP} rx="6" ry="2" fill={BC.stainless} />
            </g>

            {/* ── FRAME ── */}
            <g style={{ cursor: "pointer" }} onClick={() => setSel("frame")}>
              {/* Hub */}
              <rect x={CX - 18} y={HUB_Y} width="36" height={HUB_H} rx="4" fill={BC.ironFrame} />
              <ellipse cx={CX} cy={HUB_Y} rx="18" ry="5" fill={BC.ironLight} />

              {/* Left arm — curves from hub down to left screw column */}
              <path d={`M ${CX - 18} ${HUB_Y + 14} C ${CX - 60} ${HUB_Y + 14}, ${SCREW_X_L + 30} ${ARM_END_Y - 4}, ${SCREW_X_L + 8} ${ARM_END_Y} L ${SCREW_X_L + 8} ${ARM_END_Y + 12} C ${SCREW_X_L + 30} ${ARM_END_Y + 6}, ${CX - 60} ${HUB_Y + 24}, ${CX - 18} ${HUB_Y + 24} Z`} fill={BC.ironFrame} />

              {/* Right arm */}
              <path d={`M ${CX + 18} ${HUB_Y + 14} C ${CX + 60} ${HUB_Y + 14}, ${SCREW_X_R - 30} ${ARM_END_Y - 4}, ${SCREW_X_R - 8} ${ARM_END_Y} L ${SCREW_X_R - 8} ${ARM_END_Y + 12} C ${SCREW_X_R - 30} ${ARM_END_Y + 6}, ${CX + 60} ${HUB_Y + 24}, ${CX + 18} ${HUB_Y + 24} Z`} fill={BC.ironFrame} />

              {/* Screw housings (where screws go through) */}
              <rect x={SCREW_X_L - 8} y={ARM_END_Y - 2} width="16" height="16" rx="2" fill={BC.ironFrame} />
              <rect x={SCREW_X_R - 8} y={ARM_END_Y - 2} width="16" height="16" rx="2" fill={BC.ironFrame} />

              {/* Center pillar down to target */}
              <path d={`M ${CX - 8} ${HUB_Y + HUB_H - 4} L ${CX - 8} ${PILLAR_BOT} L ${CX + 8} ${PILLAR_BOT} L ${CX + 8} ${HUB_Y + HUB_H - 4} Z`} fill="#4B5257" opacity="0.12" />
              <path d={`M ${CX - 6} ${HUB_Y + HUB_H - 4} L ${CX - 6} ${PILLAR_BOT} L ${CX + 6} ${PILLAR_BOT} L ${CX + 6} ${HUB_Y + HUB_H - 4} Z`} fill={BC.ironFrame} />
            </g>

            {/* ── LEFT SCREW (column from arm to foot) ── */}
            <g
              style={{ cursor: isAligned && !bothLocked ? "pointer" : (bothLocked ? "default" : "not-allowed") }}
              onClick={handleLockLeft}
              transform={`translate(0, ${eTilt * 0.5})`}
            >
              {/* Shaft */}
              <rect x={SCREW_X_L - 2} y={SCREW_TOP} width="4" height={SCREW_BOT - SCREW_TOP} fill={leftLocked ? BC.brassLocked : BC.brass} />
              {/* Knob */}
              <rect x={SCREW_X_L - 10} y={SCREW_TOP - 4} width="20" height="8" rx="1.5" fill={leftLocked ? BC.brassLocked : BC.brassLight} stroke={leftLocked ? "#16A34A" : "#B45309"} strokeWidth="0.4" />
              {/* Knurling lines */}
              {[0, 3, 6, 9, 12, 15].map(dx => (
                <line key={dx} x1={SCREW_X_L - 9 + dx} y1={SCREW_TOP - 3} x2={SCREW_X_L - 9 + dx} y2={SCREW_TOP + 3} stroke={leftLocked ? "#15803D" : "#92400E"} strokeWidth="0.4" />
              ))}
              {/* Foot */}
              <polygon points={`${SCREW_X_L - 6},${SCREW_BOT} ${SCREW_X_L + 6},${SCREW_BOT} ${SCREW_X_L + 8},${GND} ${SCREW_X_L - 8},${GND}`} fill="#1E293B" />
              {/* Lock badge */}
              {leftLocked && (
                <g transform={`translate(${SCREW_X_L + 14}, ${SCREW_TOP})`}>
                  <circle cx="0" cy="0" r="6" fill="#22C55E" />
                  <polyline points="-3,0 -1,3 4,-3" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}
            </g>

            {/* ── RIGHT SCREW ── */}
            <g
              style={{ cursor: isAligned && !bothLocked ? "pointer" : (bothLocked ? "default" : "not-allowed") }}
              onClick={handleLockRight}
              transform={`translate(0, ${-eTilt * 0.5})`}
            >
              <rect x={SCREW_X_R - 2} y={SCREW_TOP} width="4" height={SCREW_BOT - SCREW_TOP} fill={rightLocked ? BC.brassLocked : BC.brass} />
              <rect x={SCREW_X_R - 10} y={SCREW_TOP - 4} width="20" height="8" rx="1.5" fill={rightLocked ? BC.brassLocked : BC.brassLight} stroke={rightLocked ? "#16A34A" : "#B45309"} strokeWidth="0.4" />
              {[0, 3, 6, 9, 12, 15].map(dx => (
                <line key={dx} x1={SCREW_X_R - 9 + dx} y1={SCREW_TOP - 3} x2={SCREW_X_R - 9 + dx} y2={SCREW_TOP + 3} stroke={rightLocked ? "#15803D" : "#92400E"} strokeWidth="0.4" />
              ))}
              <polygon points={`${SCREW_X_R - 6},${SCREW_BOT} ${SCREW_X_R + 6},${SCREW_BOT} ${SCREW_X_R + 8},${GND} ${SCREW_X_R - 8},${GND}`} fill="#1E293B" />
              {rightLocked && (
                <g transform={`translate(${SCREW_X_R + 14}, ${SCREW_TOP})`}>
                  <circle cx="0" cy="0" r="6" fill="#22C55E" />
                  <polyline points="-3,0 -1,3 4,-3" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}
            </g>

            {/* ── TARGET ── */}
            <g style={{ cursor: "pointer" }} onClick={() => setSel("target")} transform={`translate(${CX}, ${TARGET_Y})`}>
              <ellipse cx="0" cy="0" rx="14" ry="5" fill={BC.targetBg} stroke={BC.stroke} strokeWidth="0.5" />
              <ellipse cx="0" cy="0" rx="7" ry="2.5" fill="none" stroke={isAligned || bothLocked ? C.good : BC.targetCross} strokeWidth="0.8" />
              <line x1="-12" y1="0" x2="12" y2="0" stroke={isAligned || bothLocked ? C.good : BC.targetCross} strokeWidth="0.5" />
              <line x1="0" y1="-4" x2="0" y2="4" stroke={isAligned || bothLocked ? C.good : BC.targetCross} strokeWidth="0.5" />
            </g>

            {/* ── PLUMB LINE ── */}
            <g style={{ cursor: "pointer" }} onClick={() => setSel("plumbLine")}>
              <line
                x1={CX} y1={PLUMB_TOP}
                x2={CX + eTilt * 1.6} y2={PLUMB_BOT}
                stroke={bothLocked ? C.good : BC.plumbLine} strokeWidth="1"
              />
              <g transform={`translate(${CX + eTilt * 1.6}, ${PLUMB_BOT})`}>
                <polygon
                  points="-4,0 4,0 0,13"
                  fill={isAligned || bothLocked ? C.good : BC.plumbBob}
                  stroke={isAligned || bothLocked ? "#2E7D32" : "#92400E"}
                  strokeWidth="0.5"
                />
                <circle cx="0" cy="0" r="1.5" fill="none" stroke={isAligned || bothLocked ? "#2E7D32" : BC.plumbBob} strokeWidth="0.8" />
              </g>
            </g>

            {/* ── Status LED ── */}
            <circle cx={CX} cy="15" r="5" fill={bothLocked ? C.good : isAligned ? "#F59E0B" : "#EF4444"} />
            <text x={CX + 10} y="19" style={{ fontSize: 10, fontWeight: 700, fill: bothLocked ? "#2E7D32" : isAligned ? "#92400E" : "#C0392B", fontFamily: FONT }}>
              {bothLocked ? "ĐÃ CỐ ĐỊNH" : isAligned ? "THĂNG BẰNG — Xiết vít!" : "LỆCH TÂM TRỤC"}
            </text>
          </svg>

          {/* Badge */}
          <div style={{ position: "absolute", bottom: 20, right: 20, background: "rgba(255,255,255,0.9)", padding: "4px 10px", borderRadius: 6, border: `0.5px solid ${bothLocked ? C.good : "#ccc"}`, fontSize: 11, color: "#444" }}>
            {bothLocked
              ? <span style={{ fontWeight: "bold", color: C.good, display: "inline-flex", alignItems: "center", gap: 3 }}><Lock style={{ width: 12, height: 12 }} /> Đã cố định</span>
              : <>Độ lệch: <span style={{ fontWeight: "bold", color: isAligned ? C.good : "#EF4444" }}>{tilt.toFixed(1)}°</span></>
            }
          </div>
        </div>

        {/* ── Slider ── */}
        <div style={{ background: bothLocked ? "#F0FDF4" : "#fff", border: bothLocked ? `1px solid ${C.good}` : "0.5px solid #e5e3dc", borderRadius: 12, padding: "12px 14px", transition: "all 0.2s" }}>
          {bothLocked ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#166534", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 
                Cả hai vít đã xiết — sẵn sàng thí nghiệm!
              </span>
              <button
                onClick={handleUnlock}
                style={{ fontSize: 12, fontWeight: 800, color: C.navy, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: FONT }}
              >
                Chỉnh lại
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.navy }}>Bước 1: Kéo slider chỉnh thăng bằng</span>
                {isAligned && (
                  <span style={{ fontSize: 12, color: "#D97706", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 
                    Thăng bằng!
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: "#666", fontWeight: 700 }}>Trái</span>
                <input
                  type="range" min="-15" max="15" step="0.1"
                  value={tilt} onChange={(e) => handleScrewChange(e.target.value)}
                  style={{ flex: 1, accentColor: isAligned ? "#F59E0B" : BC.brass }}
                />
                <span style={{ fontSize: 12, color: "#666", fontWeight: 700 }}>Phải</span>
              </div>
              {isAligned && (
                <div style={{ marginTop: 6, padding: "8px 12px", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, fontSize: 12.5, color: "#92400E", fontWeight: 700, lineHeight: 1.5 }}>
                  Bước 2: Bấm vào <strong>núm vít vàng bên trái</strong> và <strong>bên phải</strong> trên hình để xiết cố định ({lockedCount}/2).
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div style={{ background: bothLocked ? "#F0FDF4" : "#fff", border: bothLocked ? `1px solid ${C.good}` : "0.5px solid #e5e3dc", borderRadius: 12, padding: "12px 14px" }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: bothLocked ? "#166534" : C.navy, fontFamily: FONT }}>
            {info.title}
          </h3>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: bothLocked ? "#1e5e3a" : "#444", fontFamily: FONT }}>
            {info.body}
          </p>
        </div>
      </div>
    </div>
  );
}

function StepChip({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  const bg = done ? "#DCFCE7" : active ? "#FEF3C7" : "#F3F4F6";
  const color = done ? "#166534" : active ? "#92400E" : "#9CA3AF";
  const border = done ? "#86EFAC" : active ? "#FCD34D" : "#E5E7EB";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: bg, border: `1px solid ${border}`, fontSize: 12, fontWeight: 700, color }}>
      {done
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 12 10 16 18 8" /></svg>
        : <span style={{ width: 18, height: 18, borderRadius: "50%", background: active ? "#F59E0B" : "#D1D5DB", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>{n}</span>
      }
      {label}
    </div>
  );
}

function ChevR({ color }: { color: string }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><polyline points="9 6 15 12 9 18" /></svg>;
}
