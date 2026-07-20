"use client";

/**
 * LabAssignmentComposer — Giáo viên GIAO BÀI LAB với mục tiêu đo TỰ ĐẶT
 * (thay cho đề seeded/AI). Giáo viên thấy ngay "đáp án mong đợi" tính từ
 * physics engine (theoreticalOf trong grading.ts) — học sinh KHÔNG thấy.
 *
 * Payload gửi lên: LabAssignmentPayload { problemSets: { average?, instant?, freefall? } }
 * — đúng shape problemGen.ts nên bench override được trực tiếp.
 */

import React, { useMemo, useState } from "react";
import { X, Plus, Trash2, FlaskConical, Eye } from "lucide-react";
import { EXPERIMENT_SPECS } from "@/experiments/specs";
import { theoreticalOf } from "@/lib/grading";
import type { AvgTarget, InstTarget, FallTarget } from "@/lib/problemGen";
import type { LabAssignmentPayload } from "@/lib/classTypes";
import { teacherPost } from "./api";

interface Props {
  token: string;
  classId: string;
  onClose: () => void;
  onCreated: () => void;
}

const LAB6_ID = "do-toc-do-vat-chuyen-dong";
const LAB11_ID = "do-gia-toc-roi-tu-do";

/** Thời gian rơi lý thuyết t = √(2s/g) — cho cột đáp án bài 11. */
const fallTime = (s: number) => Math.sqrt((2 * s) / 9.8);

export default function LabAssignmentComposer({ token, classId, onClose, onCreated }: Props) {
  const [lessonId, setLessonId] = useState<string>(LAB11_ID);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Tự động kèm 1 quiz chống gian lận nối tiếp sau bài Lab này.
  const [attachQuiz, setAttachQuiz] = useState(true);

  // Mục tiêu mặc định hợp lý — GV chỉnh tự do.
  const [fallTargets, setFallTargets] = useState<FallTarget[]>([
    { s: 0.3 }, { s: 0.45 }, { s: 0.6 },
  ]);
  const [avgTargets, setAvgTargets] = useState<AvgTarget[]>([
    { theta: 20, sEF: 0.2 }, { theta: 20, sEF: 0.3 }, { theta: 25, sEF: 0.25 },
  ]);
  const [instTargets, setInstTargets] = useState<InstTarget[]>([
    { theta: 15 }, { theta: 20 }, { theta: 25 },
  ]);

  const spec = EXPERIMENT_SPECS[lessonId];
  const defaultTitle = useMemo(
    () => `Bài Lab: ${spec?.shortTitle ?? ""} (đề của giáo viên)`,
    [spec]
  );

  const handleSubmit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const payload: LabAssignmentPayload =
        lessonId === LAB11_ID
          ? { problemSets: { freefall: fallTargets } }
          : { problemSets: { average: avgTargets, instant: instTargets } };
      const res = await teacherPost<{ assignment: { id: string } }>(token, "assignment", {
        classId,
        kind: "lab",
        title: title.trim() || defaultTitle,
        lessonId,
        payload,
      });
      // Kèm quiz chống gian lận nối tiếp — đề sinh từ số liệu HS nộp ở CHÍNH bài Lab này.
      if (attachQuiz && res?.assignment?.id) {
        await teacherPost(token, "assignment", {
          classId,
          kind: "personal_quiz",
          title: `Quiz kiểm chứng: ${title.trim() || spec?.shortTitle}`,
          lessonId,
          payload: { sourceAssignmentId: res.assignment.id },
          linkedLabId: res.assignment.id,
        });
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không giao được bài.");
    } finally {
      setBusy(false);
    }
  };

  const numInput =
    "w-20 px-2 py-1.5 bg-white border border-[#E2DFD8] rounded-lg text-xs font-black text-[#321E12] text-center outline-none focus:border-[#C85A17]/50";

  return (
    <div className="fixed inset-0 z-50 bg-[#321E12]/45 backdrop-blur-xs flex items-start justify-center overflow-auto p-3 py-6">
      <div className="relative w-full max-w-2xl bg-[#FAF9F6] rounded-3xl border border-[#E2DFD8] shadow-lg p-5 md:p-6 space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#C85A17]/25">
          <h3 className="text-base font-black text-[#321E12] inline-flex items-center gap-2">
            <span className="p-2 bg-[#C85A17] rounded-xl text-white"><FlaskConical className="w-4 h-4" /></span>
            Giao bài Lab — đề của giáo viên
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E2DFD8] flex items-center justify-center hover:bg-[#FFF0E0] transition-all font-bold text-[#321E12] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chọn bài */}
        <div className="grid grid-cols-2 gap-2">
          {[LAB6_ID, LAB11_ID].map((id) => {
            const sp = EXPERIMENT_SPECS[id];
            return (
              <button
                key={id}
                onClick={() => setLessonId(id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  lessonId === id
                    ? "bg-[#FFF2E6] border-[#C85A17]/40 text-[#C85A17]"
                    : "bg-white border-[#E2DFD8] text-[#605248] hover:bg-[#FFF8F0]"
                }`}
              >
                <p className="text-xs font-black">{sp.shortTitle}</p>
                <p className="text-[10px] font-bold opacity-70 mt-0.5">{sp.book}</p>
              </button>
            );
          })}
        </div>

        {/* Tiêu đề */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wide text-[#C85A17] block mb-1.5">
            Tiêu đề bài tập
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={defaultTitle}
            maxLength={120}
            className="w-full px-4 py-2.5 bg-white border border-[#E2DFD8] rounded-xl text-sm font-bold text-[#321E12] outline-none focus:border-[#C85A17]/50"
          />
        </div>

        {/* ── Mục tiêu đo: Bài 11 (freefall) ── */}
        {lessonId === LAB11_ID && (
          <section className="bg-white border border-[#E2DFD8] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-[#321E12]">Các quãng rơi s học sinh phải đo</p>
              <button
                onClick={() => setFallTargets((p) => [...p, { s: 0.4 }])}
                className="px-2.5 py-1.5 bg-[#FFF2E6] text-[#C85A17] text-[10px] font-black rounded-lg inline-flex items-center gap-1 cursor-pointer hover:bg-[#FFE8D5]"
              >
                <Plus className="w-3 h-3 stroke-[3]" /> Thêm câu
              </button>
            </div>
            <div className="space-y-2">
              {fallTargets.map((tg, i) => (
                <div key={i} className="flex items-center gap-3 text-xs font-bold text-[#605248]">
                  <span className="w-12 font-black text-[#321E12]">Câu {i + 1}</span>
                  <span>s =</span>
                  <input
                    type="number" step={0.05} min={0.1} max={0.8}
                    value={tg.s}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setFallTargets((p) => p.map((x, j) => (j === i ? { s: v } : x)));
                    }}
                    className={numInput}
                  />
                  <span>m</span>
                  <span className="flex-1 text-right inline-flex items-center justify-end gap-1.5 text-[10px] text-[#137333]">
                    <Eye className="w-3 h-3" />
                    t ≈ {fallTime(tg.s).toFixed(3)} s · g = 9,8 m/s²
                  </span>
                  <button
                    onClick={() => setFallTargets((p) => p.filter((_, j) => j !== i))}
                    disabled={fallTargets.length <= 1}
                    className="p-1.5 text-[#605248]/50 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Mục tiêu đo: Bài 6 (average + instant) ── */}
        {lessonId === LAB6_ID && (
          <>
            <section className="bg-white border border-[#E2DFD8] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-[#321E12]">Phần 1 — Vận tốc trung bình (θ, sEF)</p>
                <button
                  onClick={() => setAvgTargets((p) => [...p, { theta: 20, sEF: 0.25 }])}
                  className="px-2.5 py-1.5 bg-[#FFF2E6] text-[#C85A17] text-[10px] font-black rounded-lg inline-flex items-center gap-1 cursor-pointer hover:bg-[#FFE8D5]"
                >
                  <Plus className="w-3 h-3 stroke-[3]" /> Thêm câu
                </button>
              </div>
              <div className="space-y-2">
                {avgTargets.map((tg, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-bold text-[#605248] flex-wrap">
                    <span className="w-12 font-black text-[#321E12]">Câu {i + 1}</span>
                    <span>θ =</span>
                    <input
                      type="number" step={5} min={10} max={40}
                      value={tg.theta}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAvgTargets((p) => p.map((x, j) => (j === i ? { ...x, theta: v } : x)));
                      }}
                      className={numInput}
                    />
                    <span>° · sEF =</span>
                    <input
                      type="number" step={0.05} min={0.1} max={0.5}
                      value={tg.sEF}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAvgTargets((p) => p.map((x, j) => (j === i ? { ...x, sEF: v } : x)));
                      }}
                      className={numInput}
                    />
                    <span>m</span>
                    <span className="flex-1 text-right inline-flex items-center justify-end gap-1.5 text-[10px] text-[#137333]">
                      <Eye className="w-3 h-3" />
                      v_tb ≈ {theoreticalOf("average", tg.sEF, tg.theta).toFixed(3)} m/s
                    </span>
                    <button
                      onClick={() => setAvgTargets((p) => p.filter((_, j) => j !== i))}
                      disabled={avgTargets.length <= 1}
                      className="p-1.5 text-[#605248]/50 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-[#E2DFD8] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-[#321E12]">Phần 2 — Vận tốc tức thời (θ)</p>
                <button
                  onClick={() => setInstTargets((p) => [...p, { theta: 20 }])}
                  className="px-2.5 py-1.5 bg-[#FFF2E6] text-[#C85A17] text-[10px] font-black rounded-lg inline-flex items-center gap-1 cursor-pointer hover:bg-[#FFE8D5]"
                >
                  <Plus className="w-3 h-3 stroke-[3]" /> Thêm câu
                </button>
              </div>
              <div className="space-y-2">
                {instTargets.map((tg, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs font-bold text-[#605248]">
                    <span className="w-12 font-black text-[#321E12]">Câu {i + 1}</span>
                    <span>θ =</span>
                    <input
                      type="number" step={5} min={10} max={40}
                      value={tg.theta}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setInstTargets((p) => p.map((x, j) => (j === i ? { theta: v } : x)));
                      }}
                      className={numInput}
                    />
                    <span>°</span>
                    <span className="flex-1 text-right inline-flex items-center justify-end gap-1.5 text-[10px] text-[#137333]">
                      <Eye className="w-3 h-3" />
                      v ≈ {theoreticalOf("instant", 0, tg.theta).toFixed(3)} m/s
                    </span>
                    <button
                      onClick={() => setInstTargets((p) => p.filter((_, j) => j !== i))}
                      disabled={instTargets.length <= 1}
                      className="p-1.5 text-[#605248]/50 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <p className="text-xs font-bold text-[#605248] bg-[#FFF2E6]/60 border border-[#C85A17]/10 rounded-xl px-3.5 py-2.5">
          👁 Cột xanh là <strong>đáp án mong đợi</strong> tính từ physics engine — chỉ giáo viên thấy.
          Học sinh trong lớp sẽ nhận đề này thay cho đề Trợ lý AI giao.
        </p>

        {/* Gộp Lab + Quiz: tự kèm quiz chống gian lận nối tiếp */}
        <label className="flex items-start gap-3 bg-emerald-50 border border-emerald-500/20 rounded-2xl px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={attachQuiz}
            onChange={(e) => setAttachQuiz(e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-emerald-600 cursor-pointer flex-shrink-0"
          />
          <span className="text-sm font-bold text-emerald-800 leading-snug">
            <span className="font-black">Kèm Quiz chống gian lận nối tiếp</span> — sau khi học sinh nộp bài Lab này,
            hệ thống tự sinh 1 quiz riêng từ chính số liệu em đó đo. Hai phần liên kết chặt, chống chép bài.
          </span>
        </label>

        {error && <p className="text-sm font-black text-red-600">{error}</p>}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#E2DFD8]/60">
          <button
            onClick={onClose}
            className="px-5 py-3 bg-white border border-[#E2DFD8] text-[#605248] text-sm font-black rounded-xl cursor-pointer hover:bg-[#FFF8F0]"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="px-6 py-3 bg-[#C85A17] hover:bg-[#B55210] disabled:opacity-50 text-white text-sm font-black rounded-xl cursor-pointer transition-all active:scale-95"
          >
            {busy ? "Đang giao..." : "Giao cho lớp"}
          </button>
        </div>
      </div>
    </div>
  );
}
