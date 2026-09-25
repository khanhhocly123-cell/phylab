"use client";

import React, { useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Lock, X } from "lucide-react";
import type { ExperimentSpec } from "@/lib/types";

export interface PrelabStep {
  key: string;
  label: string;
  /** Bước có việc bắt buộc: true/false = đã/chưa làm xong. Bỏ trống = bước chỉ để xem (xong khi đã xem qua). */
  done?: boolean;
}

interface PrelabShellProps {
  spec: ExperimentSpec;
  steps: PrelabStep[];
  current: number;
  onStep: (index: number) => void;
  /** gate: phải hoàn thành để mở Phòng Lab · review: xem lại, không khóa gì. */
  mode: "gate" | "review";
  canFinish: boolean;
  /** Việc còn thiếu để mở khóa Phòng Lab (hiện ở chân trang bước cuối). */
  requirement?: string;
  onFinish: () => void;
  /** Về danh sách bài (chỉ ở chế độ gate). */
  onExit?: () => void;
  children: React.ReactNode;
}

/**
 * PrelabShell — khung chung cho mọi Prelab: tiêu đề bài, thanh bước có tên (bấm để nhảy),
 * vùng nội dung và chân trang dính (Trước / việc còn thiếu / Tiếp · Vào phòng Lab).
 */
export default function PrelabShell({ spec, steps, current, onStep, mode, canFinish, requirement, onFinish, onExit, children }: PrelabShellProps) {
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const review = mode === "review";
  const isLast = current === steps.length - 1;
  const finishLocked = !review && !canFinish;

  const goTo = (index: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, index));
    setVisited((old) => (old.has(next) ? old : new Set(old).add(next)));
    onStep(next);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white border border-[#E2DFD8] rounded-3xl shadow-[0_8px_30px_rgba(50,30,18,0.06)]">
      <header className="px-4 sm:px-6 pt-4 pb-3 border-b border-[#E2DFD8]/80 bg-[#FFFBF6] rounded-t-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {!review && onExit && (
              <button
                type="button"
                onClick={onExit}
                aria-label="Về danh sách bài"
                title="Về danh sách bài"
                className="w-9 h-9 flex-shrink-0 rounded-xl border border-[#E2DFD8] bg-white grid place-items-center text-[#605248] hover:text-[#C85A17] hover:border-[#C85A17]/40 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2.6} />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#C85A17] truncate">
                {review ? "Xem lại Prelab" : "Chặng 1 · Prelab"} · {spec.book}
              </p>
              <h2 className="text-base sm:text-lg font-black text-[#321E12] leading-snug truncate">{spec.title}</h2>
            </div>
          </div>
          {review ? (
            <button
              type="button"
              onClick={onFinish}
              aria-label="Đóng Prelab"
              title="Đóng"
              className="w-9 h-9 flex-shrink-0 rounded-xl border border-[#E2DFD8] bg-white grid place-items-center text-[#605248] hover:text-[#C85A17] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2.6} />
            </button>
          ) : (
            <span className="hidden md:inline-flex items-center gap-1.5 flex-shrink-0 text-[10px] font-black text-[#605248] bg-white border border-[#E2DFD8] px-2.5 py-1.5 rounded-full">
              <Lock className="w-3 h-3" /> Hoàn thành để mở Phòng Lab
            </span>
          )}
        </div>

        <nav aria-label="Các bước Prelab" className="mt-3 -mx-1 px-1 overflow-x-auto scrollbar-none">
          <ol className="flex items-center gap-1.5 min-w-max">
            {steps.map((step, i) => {
              const active = i === current;
              const done = step.done ?? (visited.has(i) && !active);
              return (
                <li key={step.key} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={active ? "step" : undefined}
                    className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 border text-[11px] font-black transition-colors cursor-pointer ${
                      active
                        ? "bg-[#C85A17] border-[#C85A17] text-white"
                        : done
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-white border-[#E2DFD8] text-[#605248] hover:border-[#C85A17]/40"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] ${active ? "bg-white/25" : done ? "bg-emerald-500 text-white" : "bg-[#F4EFE8]"}`}>
                      {done && !active ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={active ? "" : "hidden sm:inline"}>{step.label}</span>
                  </button>
                  {i < steps.length - 1 && <span aria-hidden className="w-3 sm:w-5 h-px bg-[#E2DFD8]" />}
                </li>
              );
            })}
          </ol>
        </nav>
      </header>

      <div className="p-2.5 sm:p-6 bg-[#FEFBF5] min-h-[420px]">{children}</div>

      <footer
        className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-3 sm:px-6 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:py-3 bg-white/95 backdrop-blur border-t border-[#E2DFD8] rounded-b-3xl"
      >
        <button
          type="button"
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="h-10 px-3 sm:px-4 rounded-xl border border-[#E2DFD8] bg-white text-xs font-black text-[#321E12] flex items-center gap-1 hover:bg-[#FFF8F0] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Trước</span>
        </button>

        <p className={`flex-1 min-w-0 text-center text-[11px] font-bold leading-snug ${isLast && !review ? (canFinish ? "text-emerald-700" : "text-[#B24A0C]") : "text-[#605248]"}`}>
          {isLast && !review
            ? canFinish
              ? "✓ Em đã sẵn sàng vào Phòng Lab"
              : requirement
            : `Bước ${current + 1} / ${steps.length}`}
        </p>

        {isLast ? (
          <button
            type="button"
            onClick={onFinish}
            disabled={finishLocked}
            title={finishLocked ? requirement : undefined}
            className={`h-10 px-4 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              finishLocked
                ? "bg-[#EDE7DF] text-[#9A8F84] cursor-not-allowed"
                : "bg-gradient-to-r from-[#DF742E] to-[#B24A0C] text-white shadow-md hover:-translate-y-0.5 cursor-pointer"
            }`}
          >
            {review ? (
              <>Xong <Check className="w-4 h-4" /></>
            ) : finishLocked ? (
              <><Lock className="w-3.5 h-3.5" /> Chưa hoàn tất</>
            ) : (
              <>Vào phòng Lab <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            className="h-10 px-4 rounded-xl bg-[#C85A17] hover:bg-[#B24A0C] text-white text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
          >
            Tiếp <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </footer>
    </div>
  );
}

/** Tiêu đề chung cho một bước dụng cụ trong Prelab. */
export function PrelabStepHeading({ eyebrow, title, lead, required }: { eyebrow: string; title: string; lead?: string; required?: boolean }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-[#C85A17]">{eyebrow}</span>
        {required && <span className="text-[9px] font-black uppercase text-white bg-[#C85A17] px-1.5 py-0.5 rounded">Bắt buộc</span>}
      </div>
      <h3 className="text-base md:text-lg font-black text-[#321E12] mt-0.5">{title}</h3>
      {lead && <p className="text-xs font-semibold text-[#605248] leading-relaxed mt-1 max-w-3xl">{lead}</p>}
    </div>
  );
}
