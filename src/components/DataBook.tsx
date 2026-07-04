"use client";

import React, { useState } from "react";
import { Table, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ExperimentSpec } from "@/lib/types";
import Latex from "./Latex";

interface DataRow {
  id: number;
  s: number; // distance
  t: number; // time
  resultInput: string; // student's calculated result
  evaluated: "correct" | "incorrect" | "missing" | "none";
}

interface DataBookProps {
  spec: ExperimentSpec;
  measures: Array<{ s: number; t: number }>;
  onClearMeasures: () => void;
  onSubmitReport: (score: number) => void;
}

export default function DataBook({ spec, measures, onClearMeasures, onSubmitReport }: DataBookProps) {
  const [rows, setRows] = useState<DataRow[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [prevMeasures, setPrevMeasures] = useState(measures);

  if (measures !== prevMeasures) {
    setPrevMeasures(measures);
    // Keep existing student inputs if matching index
    setRows(prev => {
      return measures.map((m, idx) => {
        const existing = prev[idx];
        return {
          id: idx + 1,
          s: m.s,
          t: m.t,
          resultInput: existing ? existing.resultInput : "",
          evaluated: existing ? existing.evaluated : ("none" as const),
        };
      });
    });
  }

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInputChange = (idx: number, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], resultInput: value, evaluated: "none" };
      return copy;
    });
  };

  // Verify student inputs (Bất biến 2: Học sinh tự tính)
  const handleVerify = () => {
    if (rows.length === 0) {
      showToast("Chưa có số liệu đo đạc nào!", "error");
      return;
    }

    let blanks = 0;
    let errors = 0;

    const updatedRows = rows.map((row) => {
      if (!row.resultInput || row.resultInput.trim() === "") {
        blanks++;
        return { ...row, evaluated: "missing" as const };
      }

      const studentResult = parseFloat(row.resultInput);
      let correctResult = 0;

      if (spec.id === "do-gia-toc-roi-tu-do") {
        // g = 2s / t^2
        correctResult = (2 * row.s) / Math.pow(row.t, 2);
      } else {
        // v = s / t (for both average velocity s/t and instantaneous velocity d/t)
        correctResult = row.s / row.t;
      }

      // Allow 2% tolerance due to floating point calculation and rounding
      const tolerance = correctResult * 0.02;
      const isCorrect = Math.abs(studentResult - correctResult) <= tolerance;

      if (isCorrect) {
        return { ...row, evaluated: "correct" as const };
      } else {
        errors++;
        return { ...row, evaluated: "incorrect" as const };
      }
    });

    setRows(updatedRows);

    if (blanks > 0) {
      showToast("Vui lòng tự tính toán và điền hết các ô trống kết quả!", "error");
    } else if (errors > 0) {
      showToast(`Có ${errors} ô kết quả tính chưa khớp với công thức gợi ý.`, "error");
    } else {
      showToast("Đánh giá thành công! Tất cả số liệu đều chính xác.");
      onSubmitReport(100);
    }
  };

  return (
    <div className="bg-gradient-to-br from-brand-white to-brand-cream/60 rounded-2xl border border-brand-orange/20 shadow-[0_8px_30px_rgba(213,106,23,0.03)] p-5 flex flex-col justify-between h-full relative">

      <div className="pt-2">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-brand-blue flex items-center gap-1.5">
            <Table className="w-4.5 h-4.5 text-brand-orange" /> Sổ ghi kết quả đo
          </h3>
          {measures.length > 0 && (
            <button
              onClick={onClearMeasures}
              className="py-1 px-2.5 bg-brand-cream hover:bg-brand-orange/10 text-brand-blue border border-brand-orange/20 text-[9px] font-bold rounded-lg transition-all"
            >
              Làm sạch sổ
            </button>
          )}
        </div>

        <p className="text-[10px] text-brand-blue/60 mb-3 font-semibold leading-relaxed flex items-center gap-1.5 flex-wrap">
          <span>Gợi ý công thức:</span>
          <span className="font-bold text-brand-orange"><Latex math={spec.dataBook.formulaHint} /></span>
          <span>. Học sinh tự đọc số liệu thực tế thô và tự điền kết quả vào cột đánh giá bên dưới.</span>
        </p>

        {/* Dynamic Data Table */}
        <div className="overflow-hidden rounded-xl border border-brand-orange/15 max-h-[220px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-brand-cream border-b border-brand-orange/15 font-bold text-brand-blue">
                <th className="p-2 text-center w-8">Lần</th>
                <th className="p-2 text-center">s (m)</th>
                <th className="p-2 text-center">t (s)</th>
                <th className="p-2 text-center bg-brand-cream/45 w-28">
                  {spec.dataBook.resultLabel} ({spec.dataBook.resultUnit})
                </th>
                <th className="p-2 text-center w-14">Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-brand-blue/40 font-bold italic">
                    Chưa có lượt đo nào. Nhấn nút &quot;Nhả bi&quot; bên canvas để bắt đầu đo.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="border-b border-brand-orange/10 hover:bg-brand-cream/35 transition-all font-semibold text-brand-blue/80"
                  >
                    <td className="p-2 text-center font-black text-brand-blue/30">{row.id}</td>
                    <td className="p-2 text-center font-mono">{row.s.toFixed(3)}</td>
                    <td className="p-2 text-center font-mono">{row.t.toFixed(3)}</td>
                    <td className="p-2 bg-brand-cream/20">
                      <input
                        type="number"
                        step="0.001"
                        value={row.resultInput}
                        onChange={(e) => handleInputChange(idx, e.target.value)}
                        placeholder="Nhập số tự tính..."
                        className="w-full px-1.5 py-0.5 border border-brand-orange/20 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none rounded-md bg-brand-white font-bold text-brand-blue text-center shadow-inner text-xs"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {row.evaluated === "correct" && (
                        <span className="text-[8px] bg-brand-orange text-white px-1.5 py-0.5 rounded font-black uppercase">Đúng</span>
                      )}
                      {row.evaluated === "incorrect" && (
                        <span className="text-[8px] bg-brand-cream border border-brand-orange text-brand-orange px-1.5 py-0.5 rounded font-black uppercase">Sai</span>
                      )}
                      {row.evaluated === "missing" && (
                        <span className="text-[8px] bg-brand-cream border border-brand-blue/20 text-brand-blue/60 px-1.5 py-0.5 rounded font-black uppercase">Thiếu</span>
                      )}
                      {row.evaluated === "none" && (
                        <span className="text-[8px] bg-brand-cream text-brand-blue/40 px-1.5 py-0.5 rounded font-black uppercase">Chờ</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-brand-orange/15 flex flex-col gap-2">
        {spec.dataBook.expectedValue && (
          <div className="flex justify-between items-center text-[10px] font-extrabold text-brand-blue/80">
            <span>{spec.dataBook.expectedValue.label} lý thuyết:</span>
            <span className="text-brand-orange font-bold">
              {spec.dataBook.expectedValue.value} {spec.dataBook.expectedValue.unit}
            </span>
          </div>
        )}
        <button
          onClick={handleVerify}
          className="w-full py-2 bg-gradient-to-r from-brand-orange to-[#C35F14] hover:from-[#E27C27] hover:to-[#B55210] text-white font-bold text-xs rounded-lg shadow-[0_4px_12px_rgba(213,106,23,0.18)] flex items-center justify-center gap-1.5 transition-all"
        >
          <Send className="w-3.5 h-3.5" /> Nộp báo cáo thực nghiệm
        </button>
      </div>

      {/* Floating alert */}
      {toast && (
        <div className="absolute top-2 right-2 bg-brand-white border border-brand-orange/20 rounded-lg p-2 shadow-md flex items-center gap-2 animate-scale-up text-[10px] font-bold z-20">
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-brand-orange" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-brand-orange" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
