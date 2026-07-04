"use client";

import React from "react";

interface TimerMC964Props {
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export default function TimerMC964({ className = "", onClick, active = false }: TimerMC964Props) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 transform hover:scale-105 ${
        active ? "scale-105 filter drop-shadow-[0_0_8px_rgba(255,90,31,0.6)]" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 150 120"
        className="w-full h-full fill-none stroke-brand-blue stroke-[3]"
      >
        {/* Outer casing */}
        <rect
          x="10"
          y="10"
          width="130"
          height="100"
          rx="8"
          className="fill-slate-900 stroke-brand-blue"
        />
        {/* LCD screen bezel */}
        <rect
          x="25"
          y="25"
          width="100"
          height="45"
          rx="4"
          className="fill-slate-950 stroke-brand-blue"
        />
        {/* LCD digital display digits */}
        <text
          x="75"
          y="56"
          textAnchor="middle"
          className="fill-red-500 font-digital font-black text-2xl tracking-widest"
        >
          0.000
        </text>
        {/* Mode selector buttons */}
        <circle cx="35" cy="90" r="7" className="fill-brand-orange stroke-brand-blue" />
        <circle cx="75" cy="90" r="7" className="fill-brand-yellow stroke-brand-blue" />
        <circle cx="115" cy="90" r="7" className="fill-slate-600 stroke-brand-blue" />
        {/* Small button labels */}
        <text x="35" y="103" textAnchor="middle" className="fill-slate-400 font-bold text-[6px]">
          MODE
        </text>
        <text x="75" y="103" textAnchor="middle" className="fill-slate-400 font-bold text-[6px]">
          RESET
        </text>
        <text x="115" y="103" textAnchor="middle" className="fill-slate-400 font-bold text-[6px]">
          POWER
        </text>
      </svg>
    </div>
  );
}
