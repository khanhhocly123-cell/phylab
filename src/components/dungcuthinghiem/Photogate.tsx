"use client";

import React from "react";
import { MoveHorizontal } from "lucide-react";

interface PhotogateProps {
  label: "GATE E" | "GATE F";
  active: boolean;
  sValue?: number;
  left: number;
  isSliding?: boolean;
  onSlideStart?: (e: React.MouseEvent | React.TouchEvent) => void;
}

export default function Photogate({ label, active, sValue, left, isSliding = false, onSlideStart }: PhotogateProps) {
  return (
    <div
      onMouseDown={onSlideStart}
      onTouchStart={onSlideStart}
      className={`absolute z-20 select-none transition-all ${
        onSlideStart ? "cursor-ew-resize hover:scale-[1.03]" : ""
      } ${isSliding ? "scale-[1.04] shadow-md" : ""}`}
      style={{
        left: left,
        top: 212,
        width: 35,
        height: 48
      }}
    >
      {/* Photogate U-Shaped Bracket Design */}
      <div className="w-full h-full bg-slate-900 border border-slate-700 rounded-lg flex flex-col justify-between p-1.5 shadow-[2px_4px_8px_rgba(0,0,0,0.25)] relative">
        {/* Name tag and type indicator */}
        <div className="flex flex-col items-center leading-none">
          <span className={`text-[6px] font-black font-mono tracking-wider ${
            label === "GATE E" ? "text-brand-yellow" : "text-brand-orange"
          }`}>{label}</span>
          <span className="text-[4px] text-slate-500 font-mono mt-0.5">PHOTO-SENS</span>
        </div>

        {/* Emitter / Detector indicator dot */}
        <div className="flex justify-between items-center w-full px-1 py-1 bg-black/60 rounded-md border border-slate-800 shadow-inner">
          <div className="w-1.5 h-1.5 bg-red-650 rounded-full"></div>
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${
            active ? "bg-emerald-400 shadow-[0_0_4px_#10b981]" : "bg-slate-700"
          }`}></div>
        </div>

        {/* U-shape mounting bracket clip at bottom */}
        <div className="w-full h-2.5 bg-gradient-to-b from-slate-850 to-slate-950 border-t border-slate-700 rounded-b flex items-center justify-center">
          {onSlideStart ? (
            <MoveHorizontal className="w-2.5 h-2.5 text-slate-500 stroke-[3]" />
          ) : (
            <div className="w-1.5 h-1 bg-slate-600 rounded-full"></div>
          )}
        </div>
        
        {/* Slide distance tooltip label for Gate F */}
        {sValue !== undefined && onSlideStart && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md border border-slate-700 whitespace-nowrap shadow-md pointer-events-none z-30">
            s = {(sValue * 100).toFixed(1)} cm
          </div>
        )}
      </div>

      {/* Photogate optical path alignment laser */}
      <div className={`absolute left-1/2 -translate-x-1/2 -top-16 w-[1px] h-16 border-l border-dashed border-red-500/40 pointer-events-none ${
        active ? "opacity-100" : "opacity-30"
      }`} />
    </div>
  );
}
