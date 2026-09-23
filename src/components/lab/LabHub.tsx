"use client";

import React from "react";
import { ArrowRight, BookOpen, Camera, Check, FileText, FlaskConical, GraduationCap, Lock } from "lucide-react";
import { MathText } from "@/components/Latex";
import { EXPERIMENT_SPECS } from "@/experiments/specs";
import type { ExperimentSpec, LessonId } from "@/lib/types";
import { labEntry, lessonNo } from "@/data/labCatalog";

// Ảnh bìa + nội dung Prelab lấy từ danh mục chung (src/data/labCatalog.ts).
const imageOf = (id: string) => labEntry(id)?.image;
const prelabOf = (id: string) => labEntry(id)?.prelab;
const orderOf = (spec: ExperimentSpec) => { const e = labEntry(spec.id); return e ? lessonNo(e) : 999; };

interface LabHubProps {
  prelabPassed: Record<string, boolean>;
  /** Bài đã có số liệu lưu trong Sổ Báo Cáo. */
  completedLessonIds: string[];
  /** Bài có bài Lab giáo viên giao. */
  assignedLessonIds: string[];
  /** Vào chặng kế tiếp của bài: Prelab nếu chưa xong, Phòng Lab nếu đã xong. */
  onStart: (id: LessonId) => void;
  onReviewPrelab: (id: LessonId) => void;
  onScan: () => void;
}

function gradeOf(spec: ExperimentSpec) {
  return spec.book.match(/Vật lí (\d+)/)?.[1] ?? "khác";
}

/**
 * LabHub — cửa vào duy nhất của Phòng Lab. Mỗi bài đi 3 chặng:
 * Prelab (làm quen dụng cụ) → Thực hành (lắp ráp & đo) → Sổ Báo Cáo.
 */
export default function LabHub({ prelabPassed, completedLessonIds, assignedLessonIds, onStart, onReviewPrelab, onScan }: LabHubProps) {
  // Chỉ bài đang mở trong danh mục (bài "sắp ra mắt" chưa có bàn thí nghiệm); gom theo lớp, xếp theo số bài.
  const groups = Object.values(EXPERIMENT_SPECS)
    .filter((spec) => labEntry(spec.id)?.status !== "soon")
    .sort((a, b) => orderOf(a) - orderOf(b))
    .reduce<Record<string, ExperimentSpec[]>>((acc, spec) => {
      (acc[gradeOf(spec)] ??= []).push(spec);
      return acc;
    }, {});

  return (
    <div className="max-w-5xl mx-auto px-1 sm:px-0 space-y-7">
      <header className="text-center space-y-3">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-[#321E12] tracking-tight">Phòng Lab</h2>
          <p className="text-xs md:text-sm font-bold text-[#605248] mt-1">Chọn một bài thực hành. Mỗi bài đi qua 3 chặng:</p>
        </div>
        <ol className="grid grid-cols-3 gap-2 max-w-2xl mx-auto text-left">
          {[
            { icon: BookOpen, title: "Prelab", text: "Làm quen dụng cụ" },
            { icon: FlaskConical, title: "Thực hành", text: "Lắp ráp & đo số liệu" },
            { icon: FileText, title: "Sổ Báo Cáo", text: "Bảng, đồ thị, báo cáo" },
          ].map((stage, i) => {
            const Icon = stage.icon;
            return (
              <li key={stage.title} className="relative rounded-2xl border border-[#E2DFD8] bg-white/85 px-3 py-2.5 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#FFF2E6] text-[#C85A17] grid place-items-center flex-shrink-0">
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-black text-[#321E12] leading-tight">{i + 1}. {stage.title}</span>
                  <span className="hidden sm:block text-[10px] font-bold text-[#605248] leading-tight mt-0.5">{stage.text}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </header>

      {Object.entries(groups).map(([grade, specs]) => (
        <section key={grade} className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#605248] flex items-center gap-2">
            Vật lí {grade}
            <span className="h-px flex-1 bg-[#E2DFD8]" />
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {specs.map((spec) => (
              <LabCard
                key={spec.id}
                spec={spec}
                passed={!!prelabPassed[spec.id]}
                completed={completedLessonIds.includes(spec.id)}
                assigned={assignedLessonIds.includes(spec.id)}
                onStart={() => onStart(spec.id)}
                onReviewPrelab={() => onReviewPrelab(spec.id)}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="text-center pt-1">
        <button
          type="button"
          onClick={onScan}
          className="px-5 py-3 bg-[#FAF9F6] border border-[#C85A17]/35 text-[#321E12] text-xs font-black rounded-xl inline-flex items-center gap-2 hover:bg-[#FFF0E0] active:scale-95 transition-all cursor-pointer shadow-2xs"
        >
          <Camera className="w-4 h-4 text-[#C85A17]" /> Không biết chọn bài nào? Quét trang sách giáo khoa <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function LabCard({ spec, passed, completed, assigned, onStart, onReviewPrelab }: {
  spec: ExperimentSpec;
  passed: boolean;
  completed: boolean;
  assigned: boolean;
  onStart: () => void;
  onReviewPrelab: () => void;
}) {
  const img = imageOf(spec.id);
  const lesson = spec.book.match(/Bài \d+/)?.[0] ?? spec.book;
  const cta = passed ? "Vào phòng Lab" : "Bắt đầu Prelab";

  return (
    <article className="group bg-white border border-[#E2DFD8] hover:border-[#C85A17]/40 shadow-sm hover:shadow-md rounded-3xl transition-all duration-300 overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={onStart}
        tabIndex={-1}
        aria-hidden
        className="relative h-32 sm:h-36 w-full overflow-hidden bg-slate-100 border-b border-[#E2DFD8]/60 cursor-pointer"
      >
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-[#C85A17] text-white font-black text-[9px] rounded uppercase tracking-wider">
          {lesson}
        </span>
        {assigned && (
          <span className="absolute top-3 right-3 px-2 py-0.5 bg-[#1F4D78] text-white font-black text-[9px] rounded uppercase tracking-wider inline-flex items-center gap-1">
            <GraduationCap className="w-3 h-3" /> GV giao
          </span>
        )}
      </button>

      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3.5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#C85A17]">{spec.book}</p>
          <h3 className="text-base font-black text-[#321E12] leading-snug mt-0.5">{spec.title}</h3>
          <div className="text-xs font-semibold text-[#605248] leading-relaxed line-clamp-2 mt-1">
            <MathText text={spec.theory.objective} />
          </div>
        </div>

        <ol className="grid grid-cols-2 gap-2" aria-label="Tiến độ bài">
          <StageChip n={1} label="Prelab" detail={passed ? "Đã hoàn thành" : prelabOf(spec.id) ?? "Làm quen dụng cụ"} state={passed ? "done" : "next"} />
          <StageChip
            n={2}
            label="Thực hành"
            detail={completed ? "Đã lưu số liệu" : passed ? "Sẵn sàng vào Lab" : "Mở sau Prelab"}
            state={completed ? "done" : passed ? "next" : "locked"}
          />
        </ol>

        <div className="mt-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            className="flex-1 h-11 px-4 rounded-xl bg-gradient-to-r from-[#DF742E] to-[#B24A0C] hover:from-[#E3813C] hover:to-[#A33E04] text-white text-xs font-black inline-flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(200,90,23,0.16)] active:scale-[0.98] transition-all cursor-pointer"
          >
            {cta} <ArrowRight className="w-4 h-4" />
          </button>
          {passed && (
            <button
              type="button"
              onClick={onReviewPrelab}
              title="Xem lại Prelab"
              className="h-11 px-3.5 rounded-xl border border-[#E2DFD8] bg-white text-[#605248] hover:text-[#C85A17] hover:border-[#C85A17]/40 text-xs font-black inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4" /> <span className="hidden sm:inline">Xem Prelab</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function StageChip({ n, label, detail, state }: { n: number; label: string; detail: string; state: "done" | "next" | "locked" }) {
  const tone = state === "done"
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : state === "next"
      ? "bg-[#FFF2E6] border-[#C85A17]/30 text-[#321E12]"
      : "bg-[#FAF9F6] border-[#E2DFD8] text-[#605248]/70";
  const badge = state === "done"
    ? "bg-emerald-500 text-white"
    : state === "next"
      ? "bg-[#C85A17] text-white"
      : "bg-[#E9E3DA] text-[#605248]";
  return (
    <li className={`rounded-xl border px-2.5 py-2 min-w-0 ${tone}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-black">
        <span className={`w-4.5 h-4.5 rounded-full grid place-items-center text-[9px] flex-shrink-0 ${badge}`}>
          {state === "done" ? <Check className="w-2.5 h-2.5" strokeWidth={3.5} /> : state === "locked" ? <Lock className="w-2.5 h-2.5" /> : n}
        </span>
        {label}
      </div>
      <p className="text-[10px] font-bold mt-0.5 truncate">{detail}</p>
    </li>
  );
}
