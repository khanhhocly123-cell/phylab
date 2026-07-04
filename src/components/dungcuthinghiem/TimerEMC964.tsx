"use client";

import React from "react";
import { Power, Unplug } from "lucide-react";

interface TimerEMC964Props {
  face: "front" | "back";
  power: boolean;
  mode: "A" | "B" | "A+B" | "A<->B" | "T";
  lcdText: string;
  scale: "fine" | "coarse";
  onToggleFace: () => void;
  onTogglePower: () => void;
  onToggleMode: () => void;
  onToggleScale: () => void;
  onReset: () => void;
  onClearCables: () => void;
  connections: Record<string, string>;
  activeWiringSource: string | null;
  onPortClick: (port: string) => void;
  timerRight: number;
  timerWidth: number;
  timerHeight: number;
}

export default function TimerEMC964({
  face,
  power,
  mode,
  lcdText,
  scale,
  onToggleFace,
  onTogglePower,
  onToggleMode,
  onToggleScale,
  onReset,
  onClearCables,
  connections,
  activeWiringSource,
  onPortClick,
  timerRight,
  timerWidth,
  timerHeight
}: TimerEMC964Props) {
  
  const socketAX = timerWidth === 140 ? 40 : 45;
  const socketBX = timerWidth === 140 ? 100 : 115;

  return (
    <div 
      className="absolute z-20 border-2 border-slate-700 bg-slate-900 rounded-2xl p-2.5 flex flex-col justify-between shadow-lg"
      style={{ right: timerRight, bottom: 20, width: timerWidth, height: timerHeight }}
    >
      {face === "front" ? (
        // Front Face: Screen, Dial, Buttons
        <div className="w-full h-full flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">EMC964 DIGITAL TIMER</span>
              <span className="text-[4px] text-slate-500 font-mono mt-0.5 uppercase tracking-wide">High accuracy counter</span>
            </div>
            <button
              onClick={onToggleFace}
              className="text-[6px] font-black bg-slate-800 hover:bg-slate-750 text-[#C85A17] px-1.5 py-0.5 rounded border border-[#C85A17]/25 cursor-pointer transition-colors shadow-sm"
            >
              Lật mặt sau
            </button>
          </div>
          
          {/* LCD screen with glow effect */}
          <div className="bg-black rounded-xl p-2 border-2 border-slate-800 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center relative overflow-hidden my-1">
            {/* Glossy reflection bar */}
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-white/5 pointer-events-none" />
            
            {/* Background 88.888 / 88.88 segment placeholder */}
            {power && (
              <div className="absolute font-digital text-xl text-red-950/20 tracking-widest leading-none font-bold select-none">
                {scale === "fine" ? "88.888" : "88.88"}
              </div>
            )}
            
            <div className={`font-digital text-xl text-red-500 tracking-widest leading-none font-bold z-10 transition-all ${
              power 
                ? "text-shadow-[0_0_8px_rgba(239,68,68,0.75)] opacity-100" 
                : "opacity-10 text-red-950"
            }`}>
              {power ? lcdText : "00:00"}
            </div>
            <span className="text-[5px] font-bold text-slate-500 tracking-wider uppercase mt-1">giây (s)</span>
          </div>

          <div className="flex items-center justify-between gap-1 mt-0.5">
            {/* Mode Dial */}
            <button
              onClick={onToggleMode}
              className="p-1 bg-slate-800 hover:bg-slate-750 rounded-lg text-[6px] font-black text-slate-350 text-center flex-1 border border-slate-700 cursor-pointer transition-colors"
              title="Click để xoay chuyển chế độ đo"
            >
              MODE: <span className="text-brand-orange">{power ? mode : "OFF"}</span>
            </button>

            {/* Scale Selector */}
            <button
              onClick={onToggleScale}
              className="p-1 bg-slate-800 hover:bg-slate-750 rounded-lg text-[6px] font-black text-slate-350 text-center flex-1 border border-slate-700 cursor-pointer transition-colors"
              title="Click để chuyển thang đo"
            >
              THANG: <span className="text-brand-orange">{power ? (scale === "fine" ? "9.999" : "99.99") : "OFF"}</span>
            </button>

            {/* Reset Button (Tactile red button) */}
            <button
              onClick={onReset}
              className="p-1 bg-gradient-to-b from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white rounded-lg text-[6px] font-black text-center flex-1 cursor-pointer active:translate-y-0.5 transition-all"
            >
              RESET
            </button>
          </div>
        </div>
      ) : (
        // Back Face: Sockets, Power Switch
        <div className="w-full h-full flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">MẶT SAU THIẾT BỊ</span>
            <button
              onClick={onToggleFace}
              className="text-[6px] font-black bg-slate-800 hover:bg-slate-750 text-brand-orange px-1.5 py-0.5 rounded border border-brand-orange/25 cursor-pointer transition-colors shadow-sm"
            >
              Quay về mặt trước
            </button>
          </div>

          {/* Sockets input ports with brass ring styling */}
          <div className="grid grid-cols-2 gap-2 my-1">
            <div className="flex flex-col items-center">
              <span className="text-[6px] font-black text-slate-500">CỔNG A</span>
              <div className="w-6.5 h-6.5 rounded-full bg-slate-950 border border-[#D97736]/40 flex items-center justify-center relative shadow-inner">
                {activeWiringSource && (
                  <button
                    onClick={() => onPortClick("A")}
                    className="absolute inset-0 bg-emerald-500 rounded-full animate-pulse cursor-pointer flex items-center justify-center text-[7px] font-black text-white border border-white"
                  >
                    CẮM
                  </button>
                )}
                {/* Brass inner jack contact */}
                <div className={`w-3.5 h-3.5 rounded-full border border-black transition-all flex items-center justify-center ${
                  Object.values(connections).includes("A") ? "bg-emerald-500 shadow-[0_0_4px_#10b981]" : "bg-gradient-to-r from-amber-600 to-amber-700"
                }`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[6px] font-black text-slate-500">CỔNG B</span>
              <div className="w-6.5 h-6.5 rounded-full bg-slate-950 border border-[#D97736]/40 flex items-center justify-center relative shadow-inner">
                {activeWiringSource && (
                  <button
                    onClick={() => onPortClick("B")}
                    className="absolute inset-0 bg-emerald-500 rounded-full animate-pulse cursor-pointer flex items-center justify-center text-[7px] font-black text-white border border-white"
                  >
                    CẮM
                  </button>
                )}
                {/* Brass inner jack contact */}
                <div className={`w-3.5 h-3.5 rounded-full border border-black transition-all flex items-center justify-center ${
                  Object.values(connections).includes("B") ? "bg-emerald-500 shadow-[0_0_4px_#10b981]" : "bg-gradient-to-r from-amber-600 to-amber-700"
                }`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Power Switch & Cable status */}
          <div className="flex justify-between items-center border-t border-slate-800 pt-1">
            <button
              onClick={onClearCables}
              className="text-[6px] font-black text-red-400 flex items-center gap-0.5 cursor-pointer hover:underline"
            >
              <Unplug className="w-2.5 h-2.5" /> Rút cáp
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-[6px] font-black text-slate-400">POWER</span>
              <button
                onClick={onTogglePower}
                className={`w-6 h-3.5 rounded-md relative transition-all cursor-pointer border border-slate-950 ${
                  power 
                    ? "bg-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]" 
                    : "bg-slate-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                }`}
              >
                {/* Rocker toggle knob */}
                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-slate-100 rounded border border-slate-350 shadow-sm transition-all ${
                  power ? "right-0.5" : "left-0.5"
                }`}></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
