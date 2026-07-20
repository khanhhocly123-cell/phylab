"use client";

/**
 * MistakeHeatmap — "Lớp yếu chỗ nào?" — bản đồ lỗi sai của cả lớp:
 *  - Tổng quan Lab: % lần đo chưa cân bằng, % ô tính sai, điểm Lab TB.
 *  - CHI TIẾT TỪNG QUIZ: mỗi câu tỉ lệ % học sinh làm sai (thanh nhiệt);
 *    câu Đúng/Sai còn bung ra % sai của từng ý a/b/c/d.
 * Giúp giáo viên biết chính xác cần giảng lại câu/ý nào.
 */

import React, { useEffect, useState } from "react";
import { X, Flame, Scale, Calculator, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { MathText } from "@/components/Latex";
import { teacherGet } from "./api";

interface QuizQuestion {
  part: number;
  partName: string;
  index: number;
  question: string;
  wrongCount: number;
  total: number;
  wrongPct: number;
  statements?: Array<{ text: string; wrongCount: number; wrongPct: number }>;
}
interface QuizBlock {
  assignmentId: string;
  title: string;
  submittedCount: number;
  avgScore: number | null;
  questions: QuizQuestion[];
}
interface HeatmapData {
  quizzes: QuizBlock[];
  lab: {
    totalTrials: number;
    unbalancedTrials: number;
    unbalancedPct: number;
    calcRows: number;
    wrongCalcRows: number;
    wrongCalcPct: number;
    avgLabScore: number | null;
    submissionCount: number;
  };
}

interface Props {
  token: string;
  classId: string;
  onClose: () => void;
}

/** Màu nhiệt theo % sai: xanh (ổn) → cam → đỏ (báo động). */
function heatColor(pct: number): string {
  if (pct >= 60) return "#DC2626";
  if (pct >= 40) return "#EA580C";
  if (pct >= 20) return "#C85A17";
  return "#137333";
}

function HeatBar({ pct }: { pct: number }) {
  return (
    <div className="h-2.5 bg-[#F0EDE7] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: heatColor(pct) }} />
    </div>
  );
}

export default function MistakeHeatmap({ token, classId, onClose }: Props) {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    teacherGet<{ heatmap: HeatmapData }>(token, "heatmap", { classId })
      .then((d) => {
        setData(d.heatmap);
        // Mở sẵn quiz đầu tiên có dữ liệu.
        const first = d.heatmap.quizzes.find((q) => q.submittedCount > 0);
        if (first) setExpanded(new Set([first.assignmentId]));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu."));
  }, [token, classId]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="fixed inset-0 z-50 bg-[#321E12]/45 backdrop-blur-xs flex items-start justify-center overflow-auto p-3 py-6">
      <div className="relative w-full max-w-3xl bg-[#FAF9F6] rounded-3xl border border-[#E2DFD8] shadow-lg p-6 space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#C85A17]/25">
          <h3 className="text-lg font-black text-[#321E12] inline-flex items-center gap-2">
            <span className="p-2 bg-[#C85A17] rounded-xl text-white"><Flame className="w-5 h-5" /></span>
            Bản đồ lỗi sai — lớp yếu chỗ nào?
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E2DFD8] flex items-center justify-center hover:bg-[#FFF0E0] font-bold text-[#321E12] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="text-sm font-black text-red-600">{error}</p>}
        {!data && !error && (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-[#C85A17]/20 border-t-[#C85A17] rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <>
            {/* ── Thẻ tổng quan Lab ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-[#E2DFD8] rounded-2xl p-4 space-y-1">
                <p className="text-xs font-black uppercase tracking-wide text-[#605248] inline-flex items-center gap-1.5">
                  <Scale className="w-4 h-4" /> Đo khi chưa cân bằng
                </p>
                <p className="text-3xl font-black" style={{ color: heatColor(data.lab.unbalancedPct) }}>
                  {data.lab.unbalancedPct}%
                </p>
                <p className="text-xs font-bold text-[#605248]">
                  {data.lab.unbalancedTrials}/{data.lab.totalTrials} lần đo — lỗi trình tự
                </p>
              </div>
              <div className="bg-white border border-[#E2DFD8] rounded-2xl p-4 space-y-1">
                <p className="text-xs font-black uppercase tracking-wide text-[#605248] inline-flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" /> Ô tính sai (&gt;1%)
                </p>
                <p className="text-3xl font-black" style={{ color: heatColor(data.lab.wrongCalcPct) }}>
                  {data.lab.wrongCalcPct}%
                </p>
                <p className="text-xs font-bold text-[#605248]">
                  {data.lab.wrongCalcRows}/{data.lab.calcRows} ô kết quả bị lệch
                </p>
              </div>
              <div className="bg-white border border-[#E2DFD8] rounded-2xl p-4 space-y-1">
                <p className="text-xs font-black uppercase tracking-wide text-[#605248] inline-flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" /> Điểm Lab trung bình
                </p>
                <p className="text-3xl font-black text-[#C85A17]">
                  {data.lab.avgLabScore != null ? data.lab.avgLabScore : "—"}
                </p>
                <p className="text-xs font-bold text-[#605248]">
                  trên {data.lab.submissionCount} bài đã nộp
                </p>
              </div>
            </div>

            {/* ── Chi tiết từng quiz ── */}
            <section className="space-y-3">
              <p className="text-base font-black text-[#321E12]">Chi tiết từng bài quiz</p>
              {data.quizzes.length === 0 ? (
                <p className="text-sm font-bold text-[#605248] bg-white border border-[#E2DFD8] rounded-2xl p-4">
                  Chưa có quiz nào (quiz thường, đề chung cả lớp) để phân tích.
                </p>
              ) : (
                data.quizzes.map((qz) => {
                  const open = expanded.has(qz.assignmentId);
                  return (
                    <div key={qz.assignmentId} className="bg-white border border-[#E2DFD8] rounded-2xl overflow-hidden">
                      <button
                        onClick={() => toggle(qz.assignmentId)}
                        className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-[#FFF8F0] transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#321E12] truncate">{qz.title}</p>
                          <p className="text-xs font-bold text-[#605248]">
                            {qz.submittedCount} HS đã làm
                            {qz.avgScore != null && <> · ĐTB <span className="text-[#C85A17] font-black">{qz.avgScore}</span></>}
                          </p>
                        </div>
                        {open ? <ChevronUp className="w-5 h-5 text-[#605248] flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-[#605248] flex-shrink-0" />}
                      </button>

                      {open && (
                        <div className="px-4 pb-4 space-y-3 border-t border-[#E2DFD8]/60 pt-3">
                          {qz.submittedCount === 0 ? (
                            <p className="text-sm font-bold text-[#605248]">Chưa có học sinh nào nộp bài này.</p>
                          ) : (
                            qz.questions.map((q, i) => (
                              <div key={i} className="space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-bold text-[#605248] leading-snug flex-1 min-w-0">
                                    <span className="font-black text-[#321E12]">[{q.partName} — Câu {q.index}]</span>{" "}
                                    <MathText text={q.question} />
                                  </p>
                                  <span className="text-sm font-black flex-shrink-0" style={{ color: heatColor(q.wrongPct) }}>
                                    {q.wrongPct}% sai
                                  </span>
                                </div>
                                <HeatBar pct={q.wrongPct} />
                                {/* Bung chi tiết từng ý a/b/c/d cho câu Đúng/Sai */}
                                {q.statements && (
                                  <div className="pl-3 space-y-1 pt-1">
                                    {q.statements.map((st, si) => (
                                      <div key={si} className="flex items-center gap-2">
                                        <span className="text-xs font-black text-[#605248] w-4 flex-shrink-0">{String.fromCharCode(97 + si)})</span>
                                        <p className="text-xs font-bold text-[#605248] flex-1 min-w-0 truncate"><MathText text={st.text} /></p>
                                        <div className="w-24 flex-shrink-0"><HeatBar pct={st.wrongPct} /></div>
                                        <span className="text-xs font-black w-10 text-right flex-shrink-0" style={{ color: heatColor(st.wrongPct) }}>{st.wrongPct}%</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </section>

            <p className="text-xs font-bold text-[#605248] bg-[#FFF2E6]/60 border border-[#C85A17]/10 rounded-xl px-4 py-3">
              🔥 Mục nào <span className="font-black text-red-600">đỏ</span> là chỗ cả lớp đang yếu —
              nên giảng lại câu/ý đó trước buổi thực hành sau.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
