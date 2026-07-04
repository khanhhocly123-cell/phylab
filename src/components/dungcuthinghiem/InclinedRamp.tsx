"use client";

import React from "react";

interface InclinedRampProps {
  selectedAngle: number;
  onAngleChange: (angle: number) => void;
  isFalling: boolean;
  isSwaying: boolean;
  swayTime: number;
  swayPhase: number;
  standLeft: number;
}

export default function InclinedRamp({
  selectedAngle,
  onAngleChange,
  isFalling,
  isSwaying,
  swayTime,
  swayPhase,
  standLeft
}: InclinedRampProps) {
  
  // Calculate wobbly display angle during plumb bob swaying
  const displayedAngle = isSwaying 
    ? selectedAngle + Math.round(1.8 * swayPhase * Math.sin(swayTime * 8)) 
    : selectedAngle;

  return (
    <div className="absolute z-10 pointer-events-none" style={{ left: standLeft - 10, top: 125, width: 320, height: 160 }}>
      {/* Angle adjust slider */}
      {!isFalling && (
        <div className="absolute -top-7 left-20 bg-white border border-[#E2DFD8] px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-sm pointer-events-auto z-30 animate-scale-up">
          <span className="text-[9px] font-bold text-slate-500">Độ dốc:</span>
          <input
            type="range" min="5" max="35" value={selectedAngle}
            onChange={(e) => onAngleChange(parseInt(e.target.value))}
            className="w-16 accent-brand-orange cursor-pointer"
          />
          <span className={`text-[9px] font-black font-mono transition-all ${
            isSwaying ? "text-amber-500 animate-pulse" : "text-brand-orange"
          }`}>{displayedAngle}°</span>
        </div>
      )}

      {/* The high-fidelity track image from template assets */}
      <div className="w-full h-full relative">
        <img 
          src="/images/Raykemthuocdogoc.png" 
          alt="Máng nghiêng và thước đo góc" 
          className="w-full h-full object-contain drop-shadow-sm"
        />

        {/* Dynamic overlay protractor angle text */}
        <div className="absolute left-[33px] top-[74px] w-6 h-6 rounded-full flex items-center justify-center font-mono text-[7px] font-black text-[#D56A17] bg-white/80 border border-brand-orange/10 shadow-xs">
          {displayedAngle}°
        </div>

        {/* Plumb bob string (Dây dọi) swaying with physics, attached to the protractor center */}
        <svg width="320" height="160" className="absolute inset-0 overflow-visible">
          {(() => {
            const centerX = 45;
            const centerY = 86;
            const swayAmp = isSwaying ? 15 * swayPhase * Math.sin(swayTime * 7) : 0;
            const endX = centerX + 32 * Math.sin((swayAmp * Math.PI) / 180);
            const endY = centerY + 32 * Math.cos((swayAmp * Math.PI) / 180);
            return (
              <>
                {/* String */}
                <line x1={centerX} y1={centerY} x2={endX} y2={endY} stroke="#EF4444" strokeWidth="1.2" />
                
                {/* Cone-shaped brass plumb bob weight (svg-drawn) */}
                <g transform={`translate(${endX}, ${endY}) rotate(${swayAmp})`}>
                  <path d="M -3 0 L 3 0 L 0 7 Z" fill="url(#brassGrad)" stroke="#78350f" strokeWidth="0.5" />
                </g>
              </>
            );
          })()}
          
          <defs>
            <linearGradient id="brassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
