"use client";

import { useId } from "react";

/* =============================================================================================
   Photon — linh vật hướng dẫn của PhyLab: một hạt ánh sáng có vòng quỹ đạo và electron chạy quanh.
   Đổi nét mặt theo từng bước; đội mũ bảo hộ ở phần An toàn, đeo kính bảo hộ trong Phòng Lab.
   ============================================================================================= */

export type MascotMood = "happy" | "wink" | "wow" | "think" | "alert" | "party";
export type MascotGear = "none" | "goggles" | "helmet";

const INK = "#5B2A0E";

function Eyes({ mood }: { mood: MascotMood }) {
  if (mood === "happy" || mood === "party") {
    return (
      <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round">
        <path d="M-11 0 Q-8 -4 -5 0" />
        <path d="M5 0 Q8 -4 11 0" />
      </g>
    );
  }
  if (mood === "wink") {
    return (
      <g>
        <ellipse cx="-8" cy="-1" rx="2.6" ry="3.4" fill={INK} />
        <circle cx="-7.2" cy="-2.2" r="0.9" fill="#fff" />
        <path d="M5 0 Q8 -4 11 0" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    );
  }
  if (mood === "think") {
    return (
      <g>
        <ellipse cx="-7" cy="-2.5" rx="2.4" ry="3.1" fill={INK} />
        <ellipse cx="9" cy="-2.5" rx="2.4" ry="3.1" fill={INK} />
        <circle cx="-6.2" cy="-3.8" r="0.9" fill="#fff" />
        <circle cx="9.8" cy="-3.8" r="0.9" fill="#fff" />
        <path d="M5 -9 Q9 -11.5 13 -9.5" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  }
  // wow / alert: mắt tròn to
  return (
    <g>
      <circle cx="-8" cy="-1" r="3.7" fill={INK} />
      <circle cx="8" cy="-1" r="3.7" fill={INK} />
      <circle cx="-6.8" cy="-2.4" r="1.2" fill="#fff" />
      <circle cx="9.2" cy="-2.4" r="1.2" fill="#fff" />
      {mood === "alert" && (
        <g fill="none" stroke={INK} strokeWidth="1.9" strokeLinecap="round">
          <path d="M-12 -8 L-5 -6" />
          <path d="M12 -8 L5 -6" />
        </g>
      )}
    </g>
  );
}

function Mouth({ mood }: { mood: MascotMood }) {
  if (mood === "wow") return <ellipse cx="0" cy="9" rx="3.2" ry="3.8" fill={INK} />;
  if (mood === "alert") return <path d="M-5 9.5 Q0 7 5 9.5" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />;
  if (mood === "think") return <path d="M-4 9 L4 8" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />;
  if (mood === "wink") return <path d="M-6 7 Q1 12.5 7 6.5" fill="none" stroke={INK} strokeWidth="2.3" strokeLinecap="round" />;
  return (
    <g>
      <path d={mood === "party" ? "M-8 6 Q0 17 8 6 Z" : "M-7 6.5 Q0 14 7 6.5 Z"} fill={INK} />
      <path d={mood === "party" ? "M-4 11.2 Q0 14 4 11.2" : "M-3.5 10.2 Q0 12.2 3.5 10.2"} fill="none" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

/** Linh vật Photon (SVG thuần, không filter). */
export function Mascot({ mood = "happy", gear = "none", size = 48, className = "" }: { mood?: MascotMood; gear?: MascotGear; size?: number; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="-36 -40 72 76" width={size} height={(size * 76) / 72} className={className} aria-hidden>
      <defs>
        <radialGradient id={`${uid}-body`} cx="36%" cy="30%" r="78%">
          <stop offset="0" stopColor="#FFFBE0" />
          <stop offset="0.5" stopColor="#FCD34D" />
          <stop offset="1" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
      {/* Hào quang nhẹ (vòng mờ, không dùng filter) */}
      <circle r="30" cy="2" fill="#FDE68A" opacity="0.28" />
      {/* Nửa sau vòng quỹ đạo */}
      <g transform="rotate(-18 0 2)">
        <path d="M-32 2 A32 11 0 0 1 32 2" fill="none" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="2.2" />
      </g>
      <circle r="22" cy="2" fill={`url(#${uid}-body)`} stroke="#D97706" strokeWidth="2" />
      <ellipse cx="-8" cy="-9" rx="6" ry="3.5" fill="#fff" opacity="0.55" transform="rotate(-25 -8 -9)" />
      <g transform="translate(0 2)">
        <Eyes mood={mood} />
        <Mouth mood={mood} />
        <circle cx="-14" cy="6" r="3.3" fill="#FB7185" opacity="0.45" />
        <circle cx="14" cy="6" r="3.3" fill="#FB7185" opacity="0.45" />
      </g>
      {/* Nửa trước vòng quỹ đạo + electron chạy vòng */}
      <g transform="rotate(-18 0 2)">
        <path d="M32 2 A32 11 0 0 1 -32 2" fill="none" stroke="#FFFFFF" strokeOpacity="0.95" strokeWidth="2.4" />
        <circle r="3.2" fill="#60A5FA" stroke="#fff" strokeWidth="1.2">
          <animateMotion dur="2.6s" repeatCount="indefinite" path="M-32 2 A32 11 0 1 0 32 2 A32 11 0 1 0 -32 2" />
        </circle>
      </g>
      {gear === "goggles" && (
        <g>
          <path d="M-22 -3 L22 -3" stroke="#334155" strokeWidth="3" />
          <rect x="-15" y="-9" width="12" height="11" rx="4.5" fill="#BAE6FD" fillOpacity="0.55" stroke="#334155" strokeWidth="2" />
          <rect x="3" y="-9" width="12" height="11" rx="4.5" fill="#BAE6FD" fillOpacity="0.55" stroke="#334155" strokeWidth="2" />
          <path d="M-3 -4 Q0 -6 3 -4" fill="none" stroke="#334155" strokeWidth="2" />
          <path d="M-12 -6 L-9 -7.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M6 -6 L9 -7.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )}
      {gear === "helmet" && (
        <g>
          <path d="M-19 -11 Q-19 -33 0 -34 Q19 -33 19 -11 Z" fill="#FBBF24" stroke="#B45309" strokeWidth="2" strokeLinejoin="round" />
          <path d="M-4 -34 Q0 -35 4 -34 L4 -12 L-4 -12 Z" fill="#F59E0B" />
          <path d="M-12 -28 Q-9 -31 -5 -32" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
          <rect x="-25" y="-13" width="50" height="5.5" rx="2.7" fill="#F59E0B" stroke="#B45309" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
}
