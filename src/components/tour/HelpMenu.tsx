"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelp, type LucideIcon } from "lucide-react";

export interface HelpItem {
  icon: LucideIcon;
  label: string;
  desc: string;
  /** Màu icon (mặc định cam thương hiệu). */
  tone?: string;
  onClick: () => void;
}

/**
 * Nút "Hướng dẫn" (dấu hỏi) — mở lại các tour: tham quan app, Sổ Báo Cáo, An toàn phòng thí nghiệm…
 * `tourAttr` gắn data-tour để chính tour chỉ được vào nút này.
 */
export default function HelpMenu({
  items,
  tourAttr = "help",
  align = "right",
  className = "",
}: {
  items: HelpItem[];
  tourAttr?: string;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={boxRef} className={`relative ${className}`} data-tour={tourAttr}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Hướng dẫn"
        title="Hướng dẫn"
        className={`p-2 rounded-xl transition-all cursor-pointer ${open ? "bg-[#FFF2E6] text-[#C85A17]" : "text-[#605248] hover:text-[#C85A17] hover:bg-[#FFF2E6]"}`}
      >
        <CircleHelp className="w-5 h-5 stroke-[2]" />
      </button>
      {open && (
        <div
          role="menu"
          // Điện thoại: nút không sát mép màn nên menu trải ngang (lề 12px) dưới thanh tiêu đề, không tràn ra ngoài.
          className={`fixed inset-x-3 top-[68px] sm:absolute sm:inset-x-auto sm:top-full ${align === "right" ? "sm:right-0" : "sm:left-0"} sm:mt-2 sm:w-[272px] bg-white border border-[#E2DFD8] rounded-2xl shadow-lg p-1.5 z-50 animate-scale-up`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="w-full text-left rounded-xl px-3 py-2.5 flex items-start gap-2.5 hover:bg-[#FFF2E6] cursor-pointer transition-colors"
            >
              <item.icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: item.tone ?? "#C85A17" }} />
              <span>
                <b className="block text-[12.5px] font-black text-[#321E12]">{item.label}</b>
                <span className="block text-[11px] font-semibold text-[#8C7B6B]">{item.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
