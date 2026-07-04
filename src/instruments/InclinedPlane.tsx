"use client";

import React from "react";

interface InclinedPlaneProps {
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export default function InclinedPlane({ className = "", onClick, active = false }: InclinedPlaneProps) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 transform hover:scale-105 ${
        active ? "scale-105 filter drop-shadow-[0_0_8px_rgba(255,90,31,0.6)]" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 200 100"
        className="w-full h-full fill-none stroke-brand-blue stroke-[3]"
      >
        {/* Inclined ramp body */}
        <path
          d="M 20 80 L 180 80 L 180 40 Z"
          className="fill-slate-200/50 stroke-brand-blue"
        />
        {/* The ramp slide surface */}
        <line
          x1="20"
          y1="80"
          x2="180"
          y2="40"
          className="stroke-brand-orange stroke-[4]"
          strokeLinecap="round"
        />
        {/* Height adjustment support structure */}
        <line x1="180" y1="40" x2="180" y2="80" className="stroke-slate-400" strokeWidth="4" />
        {/* Angle label helper */}
        <path d="M 40 80 A 20 20 0 0 0 38 75" className="stroke-brand-blue stroke-[1.5]" />
        <text x="45" y="76" className="fill-brand-blue font-bold text-[8px]">
          θ
        </text>
      </svg>
    </div>
  );
}
