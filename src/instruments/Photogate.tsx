"use client";

import React from "react";

interface PhotogateProps {
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export default function Photogate({ className = "", onClick, active = false }: PhotogateProps) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 transform hover:scale-105 ${
        active ? "scale-105 filter drop-shadow-[0_0_8px_rgba(255,90,31,0.6)]" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 100 120"
        className="w-full h-full fill-none stroke-brand-blue stroke-[3]"
      >
        {/* Main U-shaped body */}
        <path
          d="M 20 20 L 20 100 L 80 100 L 80 60 L 60 60 L 60 40 L 80 40 L 80 20 Z"
          className="fill-slate-800 stroke-slate-950"
        />
        {/* Infrared emitter and detector */}
        <circle cx="35" cy="40" r="4" className="fill-red-500 stroke-none animate-pulse" />
        <circle cx="35" cy="80" r="4" className="fill-emerald-500 stroke-none" />
        {/* Invisible beam indicator (active when clicked/highlighted) */}
        <line
          x1="35"
          y1="44"
          x2="35"
          y2="76"
          className={`stroke-red-400 stroke-dasharray-[4_2] ${
            active ? "stroke-[2]" : "stroke-[0.5] opacity-50"
          }`}
        />
        {/* Mounting clamp */}
        <rect
          x="45"
          y="85"
          width="20"
          height="15"
          rx="2"
          className="fill-slate-400 stroke-brand-blue"
        />
        {/* Tightening knob */}
        <circle cx="55" cy="110" r="8" className="fill-brand-orange/80 stroke-brand-blue" />
      </svg>
    </div>
  );
}
