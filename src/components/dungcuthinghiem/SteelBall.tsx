"use client";

import React, { forwardRef } from "react";

interface SteelBallProps {
  isFreeFall: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
}

const SteelBall = forwardRef<HTMLDivElement, SteelBallProps>(({ isFreeFall, left, top, width, height }, ref) => {
  return (
    <div
      ref={ref}
      className="absolute z-30 transition-all duration-75"
      style={{
        left: left,
        top: top,
        width: width,
        height: height
      }}
    >
      {isFreeFall ? (
        // 3D cylindrical steel rod for free fall
        <div className="w-full h-full bg-gradient-to-r from-slate-500 via-slate-100 to-slate-600 rounded-lg border border-slate-750 shadow-md flex flex-col justify-between p-0.5 relative overflow-hidden">
          {/* Metal cylinder reflections */}
          <div className="absolute inset-y-0 left-0.5 w-[2px] bg-white/20 pointer-events-none" />
          <div className="w-full h-[1px] bg-slate-950 opacity-40"></div>
          <div className="w-full h-[1px] bg-slate-950 opacity-40"></div>
        </div>
      ) : (
        // Highly polished chrome steel sphere with radial gradient and highlight
        <div className="w-full h-full relative group">
          {/* Realistic spherical shadow beneath */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-black/25 rounded-full blur-[1px] scale-90 group-hover:scale-100 transition-all pointer-events-none" />
          
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            <circle cx="50" cy="50" r="46" fill="url(#chromeGrad)" stroke="#1e293b" strokeWidth="3" />
            <circle cx="36" cy="36" r="12" fill="#ffffff" opacity="0.6" filter="blur(1px)" />
            <defs>
              <radialGradient id="chromeGrad" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="25%" stopColor="#cbd5e1" />
                <stop offset="60%" stopColor="#64748b" />
                <stop offset="85%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      )}
    </div>
  );
});

SteelBall.displayName = "SteelBall";
export default SteelBall;
