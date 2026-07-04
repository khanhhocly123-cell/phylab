"use client";

import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface StandProps {
  isFreeFall: boolean;
  screwBalanced?: boolean;
  onToggleBalance?: () => void;
  standLeft: number;
}

export default function Stand({ isFreeFall, screwBalanced = false, onToggleBalance, standLeft }: StandProps) {
  if (!isFreeFall) {
    return (
      <>
        {/* Left Stand (Giá đỡ bên trái) */}
        <div className="absolute z-10" style={{ left: standLeft - 30, bottom: 20, width: 75, height: 165 }}>
          <img src="/images/giadobentrai.png" alt="Giá đỡ bên trái" className="w-full h-full object-contain" />
          
          {/* Leveling screw adjustment button */}
          {onToggleBalance && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 bg-white/95 backdrop-blur-xs p-1.5 rounded-lg border border-slate-200 shadow-sm pointer-events-auto z-30">
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full border border-black ${
                  screwBalanced ? "bg-emerald-400 shadow-[0_0_4px_#10b981]" : "bg-amber-400 animate-pulse"
                }`} />
                <button
                  onClick={onToggleBalance}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-black cursor-pointer transition-all border ${
                    screwBalanced 
                      ? "bg-slate-800 text-emerald-400 border-emerald-500/20" 
                      : "bg-gradient-to-r from-amber-500 to-brand-orange text-white border-brand-orange animate-pulse"
                  }`}
                >
                  {screwBalanced ? "Đã Cân" : "Vặn Vít"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Stand (Giá đỡ bên phải) */}
        <div className="absolute z-10" style={{ left: standLeft + 270, bottom: 20, width: 75, height: 165 }}>
          <img src="/images/Giadobenphai.png" alt="Giá đỡ bên phải" className="w-full h-full object-contain" />
        </div>
      </>
    );
  }

  return (
    <div className="absolute flex flex-col items-center z-10" style={{ left: standLeft, bottom: 20, width: 30, height: 370 }}>
      {/* 3D Cylindrical Steel Rod */}
      <div className="w-5 bg-gradient-to-r from-slate-650 via-slate-100 to-slate-500 h-[340px] border border-slate-700 relative shadow-[2px_0_5px_rgba(0,0,0,0.15)] flex flex-col justify-between py-4">
        {/* Scale markings / ruler values */}
        {Array.from({ length: 17 }).map((_, i) => {
          const val = (i * 5).toString();
          return (
            <div key={i} className="flex items-center w-full px-0.5">
              <div className={`h-[1px] bg-slate-800 ${i % 2 === 0 ? "w-2.5" : "w-1.5"}`}></div>
              {i % 4 === 0 && (
                <span className="text-[6px] font-black text-slate-800/60 font-mono pl-0.5 select-none leading-none">
                  {val}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Heavy Steel Base with Leveling Screw */}
      <div className="w-28 h-9 bg-slate-900 border-2 border-slate-800 rounded-xl shadow-lg flex items-center justify-between px-2.5 relative">
        <div className="flex flex-col items-start leading-none">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Đế Thép</span>
          <span className="text-[5px] text-slate-500 font-bold uppercase mt-0.5">Phylab heavy base</span>
        </div>
      </div>
    </div>
  );
}
