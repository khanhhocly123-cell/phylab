"use client";

import React from "react";

interface BallProps {
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export default function Ball({ className = "", onClick, active = false }: BallProps) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 transform hover:scale-105 ${
        active ? "scale-105 filter drop-shadow-[0_0_8px_rgba(255,90,31,0.6)]" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 80 80"
        className="w-full h-full fill-none stroke-brand-blue stroke-[3]"
      >
        {/* Steel ball representation with gradient-like lines for 3D look */}
        <circle cx="40" cy="40" r="28" className="fill-slate-300 stroke-brand-blue" />
        {/* Shine highlight */}
        <path d="M 28 24 Q 40 28 52 24" className="stroke-white stroke-[2]" />
        <circle cx="32" cy="30" r="3" className="fill-white stroke-none" />
      </svg>
    </div>
  );
}
