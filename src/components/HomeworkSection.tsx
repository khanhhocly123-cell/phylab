"use client";

import React, { useState } from "react";
import { BookOpen, CheckSquare, HelpCircle, CheckCircle } from "lucide-react";
import { ExperimentSpec } from "@/lib/types";
import { MathText } from "./Latex";

interface HomeworkSectionProps {
  spec: ExperimentSpec;
}

export default function HomeworkSection({ spec }: HomeworkSectionProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [validated, setValidated] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const handleTextChange = (idx: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [idx]: val }));
    setValidated((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  const handleCheckAnswer = (idx: number) => {
    const text = answers[idx] || "";
    if (text.trim().length < 15) {
      setToast("Câu trả lời quá ngắn! Hãy giải thích chi tiết hơn.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    // Mock successful review check
    setValidated((prev) => ({ ...prev, [idx]: true }));
  };

  return (
    <div className="w-full max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
      {/* Left: Textbook Theory Explorer */}
      <div className="md:col-span-5 bg-brand-cream rounded-3xl comic-border p-4 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-brand-blue mb-3.5 flex items-center gap-1">
            <BookOpen className="w-4 h-4 text-brand-orange" /> Hướng dẫn Sách giáo khoa
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-brand-blue/70">Tên bài học</h4>
              <p className="text-xs font-black text-brand-blue mt-1 leading-snug">{spec.book}: {spec.title}</p>
            </div>
            
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-brand-blue/70">Tóm tắt lý thuyết</h4>
              <ul className="list-disc pl-4 mt-1.5 space-y-1.5 text-[10px] font-bold text-slate-600 leading-relaxed">
                {spec.theory.bullets.map((b, idx) => (
                  <li key={idx}><MathText text={b} /></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border-2 border-brand-blue/20 mt-4 text-[9px] font-bold text-slate-500 leading-normal">
          Thí nghiệm thực hành mô phỏng theo chương trình GDPT mới nhất. Sử dụng thiết bị đo thời gian hiện số MC964 kết hợp cảm biến thu phát hồng ngoại.
        </div>
      </div>

      {/* Right: SGK Homework Questions */}
      <div className="md:col-span-7 bg-white rounded-3xl comic-border comic-shadow p-5 flex flex-col">
        <h3 className="text-xs font-black uppercase tracking-wider text-brand-blue mb-4 flex items-center gap-1.5">
          <CheckSquare className="w-4.5 h-4.5 text-brand-orange" /> Bài tập củng cố (Tự luận SGK)
        </h3>

        <div className="space-y-4 flex-1">
          {spec.homework.map((q, idx) => {
            const isDone = validated[idx];
            return (
              <div key={idx} className="p-3 bg-brand-cream/30 rounded-2xl border-2 border-brand-blue/20 flex flex-col gap-2">
                <div className="flex gap-2 items-start">
                  <span className="w-4 h-4 rounded-full bg-brand-orange text-white text-[9px] font-black flex items-center justify-center border border-brand-blue mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs font-black text-brand-blue leading-snug"><MathText text={q} /></p>
                </div>

                <textarea
                  value={answers[idx] || ""}
                  onChange={(e) => handleTextChange(idx, e.target.value)}
                  disabled={isDone}
                  placeholder="Nhập phần giải thích chi tiết của bạn vào đây..."
                  className="w-full h-[65px] bg-white border-2 border-brand-blue/30 focus:border-brand-orange rounded-xl p-2 text-[10px] font-bold text-brand-blue focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                />

                <div className="flex justify-end items-center gap-2">
                  {isDone ? (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-scale-up">
                      <CheckCircle className="w-3.5 h-3.5" /> Đã hoàn thành
                    </span>
                  ) : (
                    <button
                      onClick={() => handleCheckAnswer(idx)}
                      className="px-3 py-1 bg-brand-yellow hover:bg-brand-yellow/90 border border-brand-blue text-[9px] font-black rounded-lg transition-all"
                    >
                      Kiểm tra bài làm
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 bg-white border-2 border-brand-blue rounded-xl p-3 shadow-md text-xs font-black text-brand-orange animate-slide-in flex items-center gap-2 z-50">
          <HelpCircle className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
