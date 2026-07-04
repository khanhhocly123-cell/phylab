"use client";

import React from "react";

interface StandProps {
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export default function Stand({ className = "", onClick, active = false }: StandProps) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 transform hover:scale-105 ${
        active ? "scale-105 filter drop-shadow-[0_0_8px_rgba(255,90,31,0.6)]" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 100 200"
        className="w-full h-full fill-none stroke-brand-blue stroke-[3]"
      >
        {/* Base */}
        <rect
          x="10"
          y="170"
          width="80"
          height="20"
          rx="4"
          className="fill-slate-400 stroke-brand-blue"
        />
        {/* Main rod */}
        <line x1="50" y1="10" x2="50" y2="170" className="stroke-slate-500" strokeWidth="6" />
        {/* Support rings */}
        <circle cx="50" cy="50" r="8" className="fill-slate-600 stroke-brand-blue" />
        <circle cx="50" cy="110" r="8" className="fill-slate-600 stroke-brand-blue" />
      </svg>
    </div>
  );
}
