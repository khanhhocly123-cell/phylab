"use client";

import React from "react";
import { Power } from "lucide-react";

interface ElectromagnetProps {
  magnetPower: boolean;
  onTogglePower: () => void;
  magnetLeft: number;
}

export default function Electromagnet({ magnetPower, onTogglePower, magnetLeft }: ElectromagnetProps) {
  return (
    <div className="absolute z-20 animate-scale-up" style={{ left: magnetLeft - 10, top: 85, width: 85, height: 45 }}>
      {/* Industrial electromagnet housing with yellow/black hazard stripes */}
      <div className="w-full h-full bg-slate-900 rounded-xl border border-slate-700 flex flex-col items-center justify-between p-1.5 text-white relative shadow-lg">
        {/* Core copper coil windings texture representation */}
        <div className="absolute inset-y-0.5 left-1 w-2 bg-gradient-to-b from-[#8C3B0C] via-[#D97736] to-[#8C3B0C] border-r border-[#5c2303] flex flex-col justify-between py-1 opacity-80">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-0.5 bg-black/40 w-full"></div>
          ))}
        </div>

        <div className="flex items-center justify-between w-full pl-3.5 pr-0.5">
          <span className="text-[6px] font-black uppercase tracking-wider text-slate-400">EM-MAGNET</span>
          <button
            onClick={onTogglePower}
            className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white/10 transition-all cursor-pointer shadow-md ${
              magnetPower 
                ? "bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)] border-emerald-400" 
                : "bg-red-650 hover:bg-red-750 border-red-400"
            }`}
            title="Nút bật/tắt điện từ trường"
          >
            <Power className="w-2.5 h-2.5 text-white stroke-[3.5]" />
          </button>
        </div>

        {/* Magnetic contact pole piece (steel bottom) */}
        <div className="w-10 h-3 bg-gradient-to-r from-slate-500 via-white to-slate-650 rounded-md border border-slate-950 shadow-inner flex items-center justify-center mt-1">
          {/* LED activity glow */}
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${
            magnetPower ? "bg-emerald-400 animate-pulse shadow-[0_0_5px_#10b981]" : "bg-red-400"
          }`}></div>
        </div>

        {/* Electromagnetic flux wave overlay when power is active */}
        {magnetPower && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-brand-orange/15 rounded-full blur-[3px] animate-pulse pointer-events-none" />
        )}
      </div>
    </div>
  );
}
