"use client";

import React from "react";

interface MagnetProps {
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export default function Magnet({ className = "", onClick, active = false }: MagnetProps) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 transform hover:scale-105 ${
        active ? "scale-105 filter drop-shadow-[0_0_8px_rgba(255,90,31,0.6)]" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full fill-none stroke-brand-blue stroke-[3]"
      >
        {/* Core block */}
        <rect
          x="20"
          y="20"
          width="60"
          height="40"
          rx="6"
          className="fill-brand-orange/20 stroke-brand-orange"
        />
        {/* Magnetic poles */}
        <rect x="30" y="60" width="16" height="20" className="fill-slate-700 stroke-slate-900" />
        <rect x="54" y="60" width="16" height="20" className="fill-slate-700 stroke-slate-900" />
        {/* Wire windings representation */}
        <path
          d="M 25 30 L 75 30 M 25 40 L 75 40 M 25 50 L 75 50"
          className="stroke-brand-yellow stroke-[2]"
        />
        {/* Connector terminals */}
        <circle cx="35" cy="15" r="5" className="fill-red-500 stroke-brand-blue" />
        <circle cx="65" cy="15" r="5" className="fill-black stroke-brand-blue" />
      </svg>
    </div>
  );
}
