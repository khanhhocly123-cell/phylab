"use client";

import React from "react";

interface RulerProps {
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export default function Ruler({ className = "", onClick, active = false }: RulerProps) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 transform hover:scale-105 ${
        active ? "scale-105 filter drop-shadow-[0_0_8px_rgba(255,90,31,0.6)]" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 200 40"
        className="w-full h-full fill-none stroke-brand-blue stroke-[3]"
      >
        {/* Ruler base */}
        <rect
          x="10"
          y="10"
          width="180"
          height="20"
          rx="2"
          className="fill-brand-yellow/30 stroke-brand-blue"
        />
        {/* Tick marks */}
        <path
          d="M 20 10 L 20 20 M 30 10 L 30 15 M 40 10 L 40 15 M 50 10 L 50 15 M 60 10 L 60 20 M 70 10 L 70 15 M 80 10 L 80 15 M 90 10 L 90 15 M 100 10 L 100 20 M 110 10 L 110 15 M 120 10 L 120 15 M 130 10 L 130 15 M 140 10 L 140 20 M 150 10 L 150 15 M 160 10 L 160 15 M 170 10 L 170 15 M 180 10 L 180 20"
          className="stroke-brand-blue stroke-[1.5]"
        />
        {/* Measurement numbers */}
        <text x="20" y="27" textAnchor="middle" className="fill-brand-blue font-bold text-[8px]">
          0
        </text>
        <text x="60" y="27" textAnchor="middle" className="fill-brand-blue font-bold text-[8px]">
          10
        </text>
        <text x="100" y="27" textAnchor="middle" className="fill-brand-blue font-bold text-[8px]">
          20
        </text>
        <text x="140" y="27" textAnchor="middle" className="fill-brand-blue font-bold text-[8px]">
          30
        </text>
        <text x="180" y="27" textAnchor="middle" className="fill-brand-blue font-bold text-[8px]">
          40
        </text>
      </svg>
    </div>
  );
}
