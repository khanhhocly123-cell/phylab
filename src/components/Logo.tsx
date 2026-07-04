"use client";

import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  variant?: "square" | "circle" | "flat";
}

export default function Logo({ size = 40, className = "", variant = "square" }: LogoProps) {
  const rx = variant === "circle" ? "50" : variant === "flat" ? "0" : "28";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`select-none flex-shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Solid Orange Background */}
      {variant !== "flat" && (
        <rect
          width="100"
          height="100"
          rx={rx}
          fill="#D56A17"
        />
      )}

      {/* The cursive mathematical bold varphi (φ) symbol */}
      <path
        d="M65 22 C52 22, 38 35, 38 52 C38 67, 50 74, 62 74 C68 74, 70 60, 68 52 C65 42, 54 44, 48 55 C42 66, 38 74, 32 82"
        stroke="white"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
