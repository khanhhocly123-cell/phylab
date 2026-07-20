"use client";

/**
 * QuizComposer — Giáo viên soạn QUIZ theo form đề Bộ GD&ĐT 2025:
 *   Phần I (trắc nghiệm 4 phương án) · Phần II (Đúng/Sai 4 ý) · Phần III (trả lời ngắn).
 * Có nút import nhanh câu hỏi từ ngân hàng ôn tập (quizBank.ts).
 *
 * Chế độ 2: "Quiz chống gian lận" — chọn 1 bài Lab đã giao, hệ thống sẽ tự sinh đề
 * RIÊNG cho từng học sinh từ chính số liệu bài Lab em đó nộp (kind personal_quiz).
 */

import React, { useState } from "react";
import { X, Plus, Trash2, ListChecks, ShieldCheck, Import, CalendarClock, Timer, Link as LinkIcon } from "lucide-react";
import { QUIZ_BANK } from "@/data/quizBank";
import { toMoeMcq, type MoeQuiz, type MoeMcq, type MoeTrueFalse, type MoeShort } from "@/lib/moeQuiz";
import type { Assignment, PersonalQuizPayload } from "@/lib/classTypes";
import { teacherPost } from "./api";

interface Props {
  token: string;
  classId: string;
  /** Các bài Lab đã giao — nguồn cho quiz chống gian lận. */
  labAssignments: Assignment[];
  onClose: () => void;
  onCreated: () => void;
}

const emptyMcq = (): MoeMcq => ({ kind: "mcq", q: "", options: ["", "", "", ""], answer: 0 });
const emptyTf = (): MoeTrueFalse => ({
  kind: "truefalse",
  q: "",
  statements: [
    { text: "", answer: true }, { text: "", answer: true },
    { text: "", answer: false }, { text: "", answer: false },
  ],
});
const emptyShort = (): MoeShort => ({ kind: "short", q: "", answer: "", tolerance: 0 });

const inputCls =
  "w-full px-3 py-2 bg-white border border-[#E2DFD8] rounded-xl text-xs font-bold text-[#321E12] outline-none focus:border-[#C85A17]/50";

export default function QuizComposer({ token, classId, labAssignments, onClose, onCreated }: Props) {
  const [mode, setMode] = useState<"quiz" | "personal">("quiz");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Quiz thường
  const [part1, setPart1] = useState<MoeMcq[]>([emptyMcq()]);
  const [part2, setPart2] = useState<MoeTrueFalse[]>([]);
  const [part3, setPart3] = useState<MoeShort[]>([]);

  // Quiz chống gian lận
  const [sourceId, setSourceId] = useState<string>(labAssignments[0]?.id ?? "");

  // Thời gian & liên kết (áp cho cả 2 chế độ)
  const [openAtStr, setOpenAtStr] = useState("");     // datetime-local; rỗng = mở ngay
  const [durationMin, setDurationMin] = useState("");  // phút; rỗng = không giới hạn
  const [linkedLabId, setLinkedLabId] = useState("");  // gắn nối tiếp sau 1 bài Lab

  /** Đóng gói các trường thời gian/liên kết để gửi kèm assignment. */
  const timingFields = () => {
    const openAt = openAtStr ? new Date(openAtStr).getTime() : null;
    const dMin = Number(durationMin);
    return {
      openAt: openAt && openAt > 0 ? openAt : null,
      durationSec: Number.isFinite(dMin) && dMin > 0 ? Math.round(dMin * 60) : null,
      linkedLabId: linkedLabId || null,
    };
  };

  const importFromBank = () => {
    // Gom câu MCQ của cả 2 bài trong ngân hàng ôn tập, thêm vào Phần I.
    const items = Object.values(QUIZ_BANK).flatMap((review) => review.quizzes.slice(0, 3));
    setPart1((prev) => {
      const kept = prev.filter((q) => q.q.trim() !== "");
      return [...kept, ...items.map(toMoeMcq)];
    });
  };

  const validateQuiz = (): string | null => {
    const p1 = part1.filter((q) => q.q.trim());
    const p2 = part2.filter((q) => q.q.trim());
    const p3 = part3.filter((q) => q.q.trim());
    if (p1.length + p2.length + p3.length === 0) return "Đề chưa có câu hỏi nào.";
    for (const q of p1) {
      if (q.options.some((o) => !o.trim())) return "Phần I: mỗi câu cần đủ 4 phương án.";
    }
    for (const q of p2) {
      if (q.statements.some((s) => !s.text.trim())) return "Phần II: mỗi câu cần đủ 4 ý a/b/c/d.";
    }
    for (const q of p3) {
      if (!q.answer.trim()) return "Phần III: câu hỏi cần đáp án.";
      if (q.answer.trim().length > 4) return "Phần III: đáp án tối đa 4 ký tự (theo form Bộ GD).";
    }
    return null;
  };

  const handleSubmit = async () => {
    if (busy) return;
    setError("");

    if (mode === "personal") {
      if (!sourceId) {
        setError("Chọn bài Lab nguồn để sinh đề chống gian lận.");
        return;
      }
      setBusy(true);
      try {
        const src = labAssignments.find((a) => a.id === sourceId);
        const payload: PersonalQuizPayload = { sourceAssignmentId: sourceId };
        await teacherPost(token, "assignment", {
          classId,
          kind: "personal_quiz",
          title: title.trim() || `Quiz chống gian lận: ${src?.title ?? "bài Lab"}`,
          lessonId: src?.lessonId,
          payload,
          ...timingFields(),
          // Quiz chống gian lận luôn gắn với bài Lab nguồn của nó.
          linkedLabId: sourceId,
        });
        onCreated();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không giao được quiz.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const invalid = validateQuiz();
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    try {
      const quiz: MoeQuiz = {
        title: title.trim() || "Quiz Vật lí (form Bộ GD 2025)",
        part1: part1.filter((q) => q.q.trim()),
        part2: part2.filter((q) => q.q.trim()),
        part3: part3.filter((q) => q.q.trim()),
      };
      await teacherPost(token, "assignment", {
        classId,
        kind: "quiz",
        title: quiz.title,
        payload: quiz,
        ...timingFields(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không giao được quiz.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#321E12]/45 backdrop-blur-xs flex items-start justify-center overflow-auto p-3 py-6">
      <div className="relative w-full max-w-3xl bg-[#FAF9F6] rounded-3xl border border-[#E2DFD8] shadow-lg p-5 md:p-6 space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#C85A17]/25">
          <h3 className="text-base font-black text-[#321E12] inline-flex items-center gap-2">
            <span className="p-2 bg-[#C85A17] rounded-xl text-white"><ListChecks className="w-4 h-4" /></span>
            Giao Quiz cho lớp
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E2DFD8] flex items-center justify-center hover:bg-[#FFF0E0] font-bold text-[#321E12] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chọn chế độ */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("quiz")}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === "quiz"
                ? "bg-[#FFF2E6] border-[#C85A17]/40 text-[#C85A17]"
                : "bg-white border-[#E2DFD8] text-[#605248] hover:bg-[#FFF8F0]"
            }`}
          >
            <p className="text-xs font-black inline-flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5" /> Quiz form Bộ GD 2025
            </p>
            <p className="text-[10px] font-bold opacity-70 mt-0.5">Trắc nghiệm · Đúng/Sai · Trả lời ngắn</p>
          </button>
          <button
            onClick={() => setMode("personal")}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === "personal"
                ? "bg-emerald-50 border-emerald-500/40 text-emerald-700"
                : "bg-white border-[#E2DFD8] text-[#605248] hover:bg-[#FFF8F0]"
            }`}
          >
            <p className="text-xs font-black inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Quiz chống gian lận
            </p>
            <p className="text-[10px] font-bold opacity-70 mt-0.5">Đề riêng từng HS, sinh từ số liệu Lab em đó đo</p>
          </button>
        </div>

        {/* Tên bài quiz */}
        <div>
          <label className="text-xs font-black uppercase tracking-wide text-[#C85A17] block mb-1.5">
            Tên bài quiz
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={mode === "quiz" ? "VD: Kiểm tra 15 phút — Bài 11" : "VD: Quiz kiểm chứng bài Lab"}
            maxLength={120}
            className="w-full px-4 py-3 bg-white border border-[#E2DFD8] rounded-xl text-base font-bold text-[#321E12] outline-none focus:border-[#C85A17]/50"
          />
        </div>

        {/* Thời gian mở + thời lượng + gắn nối tiếp Lab */}
        <div className="bg-white border border-[#E2DFD8] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wide text-[#605248] block mb-1.5 inline-flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" /> Thời gian mở quiz
            </label>
            <input
              type="datetime-local"
              value={openAtStr}
              onChange={(e) => setOpenAtStr(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#FAF9F6] border border-[#E2DFD8] rounded-xl text-sm font-bold text-[#321E12] outline-none focus:border-[#C85A17]/50"
            />
            <p className="text-[11px] font-bold text-[#605248]/70 mt-1">Bỏ trống = mở ngay</p>
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wide text-[#605248] block mb-1.5 inline-flex items-center gap-1.5">
              <Timer className="w-4 h-4" /> Thời lượng làm bài (phút)
            </label>
            <input
              type="number"
              min={0}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder="VD: 15"
              className="w-full px-3 py-2.5 bg-[#FAF9F6] border border-[#E2DFD8] rounded-xl text-sm font-bold text-[#321E12] outline-none focus:border-[#C85A17]/50"
            />
            <p className="text-[11px] font-bold text-[#605248]/70 mt-1">Hết giờ tự nộp · bỏ trống = không giới hạn</p>
          </div>
          {mode === "quiz" && labAssignments.length > 0 && (
            <div className="sm:col-span-2">
              <label className="text-xs font-black uppercase tracking-wide text-[#605248] block mb-1.5 inline-flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4" /> Gắn nối tiếp sau bài Lab (tùy chọn)
              </label>
              <select
                value={linkedLabId}
                onChange={(e) => setLinkedLabId(e.target.value)}
                className={inputCls + " cursor-pointer text-sm"}
              >
                <option value="">— Không gắn —</option>
                {labAssignments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
              <p className="text-[11px] font-bold text-[#605248]/70 mt-1">
                Học sinh phải nộp bài Lab này trước mới làm được quiz — 2 phần liên kết với nhau.
              </p>
            </div>
          )}
        </div>

        {/* ═══ Chế độ chống gian lận ═══ */}
        {mode === "personal" && (
          <section className="bg-white border border-[#E2DFD8] rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black text-[#321E12]">Bài Lab nguồn</p>
            {labAssignments.length === 0 ? (
              <p className="text-[11px] font-bold text-[#605248]">
                Lớp chưa có bài Lab nào. Hãy &quot;Giao bài Lab&quot; trước, học sinh nộp bài xong thì quiz
                chống gian lận mới có số liệu để sinh đề.
              </p>
            ) : (
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className={inputCls + " cursor-pointer"}
              >
                {labAssignments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            )}
            <p className="text-[10px] font-bold text-[#605248] bg-emerald-50 border border-emerald-500/10 rounded-xl px-3 py-2">
              🛡 Mỗi học sinh nhận bộ câu hỏi tính từ CHÍNH số liệu (s, t) em đó đã đo và nộp —
              chép đáp án của bạn là vô nghĩa. Hệ thống chấm tự động trên server.
            </p>
          </section>
        )}

        {/* ═══ Chế độ quiz thường ═══ */}
        {mode === "quiz" && (
          <div className="space-y-4 max-h-[46vh] overflow-y-auto pr-1">
            {/* Phần I */}
            <section className="bg-white border border-[#E2DFD8] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-black text-[#321E12]">Phần I — Trắc nghiệm (0,25đ/câu)</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={importFromBank}
                    title="Thêm câu hỏi mẫu từ ngân hàng ôn tập"
                    className="px-2.5 py-1.5 bg-sky-50 text-sky-700 text-[10px] font-black rounded-lg inline-flex items-center gap-1 cursor-pointer hover:bg-sky-100"
                  >
                    <Import className="w-3 h-3" /> Từ ngân hàng câu hỏi
                  </button>
                  <button
                    onClick={() => setPart1((p) => [...p, emptyMcq()])}
                    className="px-2.5 py-1.5 bg-[#FFF2E6] text-[#C85A17] text-[10px] font-black rounded-lg inline-flex items-center gap-1 cursor-pointer hover:bg-[#FFE8D5]"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" /> Thêm câu
                  </button>
                </div>
              </div>
              {part1.map((qq, i) => (
                <div key={i} className="border border-[#E2DFD8]/70 rounded-xl p-3 space-y-2 bg-[#FAF9F6]">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-black text-[#C85A17] mt-2 w-10 flex-shrink-0">Câu {i + 1}</span>
                    <textarea
                      value={qq.q}
                      onChange={(e) => setPart1((p) => p.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                      placeholder="Nội dung câu hỏi (hỗ trợ công thức $...$)"
                      rows={2}
                      className={inputCls + " resize-none"}
                    />
                    <button
                      onClick={() => setPart1((p) => p.filter((_, j) => j !== i))}
                      className="p-1.5 text-[#605248]/50 hover:text-red-600 cursor-pointer mt-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-12">
                    {qq.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPart1((p) => p.map((x, j) => (j === i ? { ...x, answer: oi } : x)))}
                          title="Chọn làm đáp án đúng"
                          className={`w-6 h-6 rounded-full text-[10px] font-black flex-shrink-0 cursor-pointer transition-all ${
                            qq.answer === oi
                              ? "bg-[#137333] text-white"
                              : "bg-white border border-[#E2DFD8] text-[#605248] hover:border-[#137333]/50"
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}
                        </button>
                        <input
                          value={opt}
                          onChange={(e) =>
                            setPart1((p) =>
                              p.map((x, j) =>
                                j === i
                                  ? { ...x, options: x.options.map((o, k) => (k === oi ? e.target.value : o)) }
                                  : x
                              )
                            )
                          }
                          placeholder={`Phương án ${String.fromCharCode(65 + oi)}`}
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* Phần II */}
            <section className="bg-white border border-[#E2DFD8] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-[#321E12]">Phần II — Đúng/Sai 4 ý (0,1→1đ/câu)</p>
                <button
                  onClick={() => setPart2((p) => [...p, emptyTf()])}
                  className="px-2.5 py-1.5 bg-[#FFF2E6] text-[#C85A17] text-[10px] font-black rounded-lg inline-flex items-center gap-1 cursor-pointer hover:bg-[#FFE8D5]"
                >
                  <Plus className="w-3 h-3 stroke-[3]" /> Thêm câu
                </button>
              </div>
              {part2.length === 0 && (
                <p className="text-[10px] font-bold text-[#605248]">Chưa có câu Đúng/Sai — thang Bộ GD: 1 ý đúng 0,1đ · 2 ý 0,25đ · 3 ý 0,5đ · cả 4 ý 1đ.</p>
              )}
              {part2.map((qq, i) => (
                <div key={i} className="border border-[#E2DFD8]/70 rounded-xl p-3 space-y-2 bg-[#FAF9F6]">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-black text-[#C85A17] mt-2 w-10 flex-shrink-0">Câu {i + 1}</span>
                    <textarea
                      value={qq.q}
                      onChange={(e) => setPart2((p) => p.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                      placeholder="Đề dẫn (VD: Trong thí nghiệm đo gia tốc rơi tự do...)"
                      rows={2}
                      className={inputCls + " resize-none"}
                    />
                    <button
                      onClick={() => setPart2((p) => p.filter((_, j) => j !== i))}
                      className="p-1.5 text-[#605248]/50 hover:text-red-600 cursor-pointer mt-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5 pl-12">
                    {qq.statements.map((st, si) => (
                      <div key={si} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-[#605248] w-4">{String.fromCharCode(97 + si)})</span>
                        <input
                          value={st.text}
                          onChange={(e) =>
                            setPart2((p) =>
                              p.map((x, j) =>
                                j === i
                                  ? { ...x, statements: x.statements.map((s, k) => (k === si ? { ...s, text: e.target.value } : s)) }
                                  : x
                              )
                            )
                          }
                          placeholder={`Ý ${String.fromCharCode(97 + si)}`}
                          className={inputCls}
                        />
                        <button
                          onClick={() =>
                            setPart2((p) =>
                              p.map((x, j) =>
                                j === i
                                  ? { ...x, statements: x.statements.map((s, k) => (k === si ? { ...s, answer: !s.answer } : s)) }
                                  : x
                              )
                            )
                          }
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-black flex-shrink-0 cursor-pointer w-14 transition-colors ${
                            st.answer ? "bg-[#137333] text-white" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {st.answer ? "Đúng" : "Sai"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* Phần III */}
            <section className="bg-white border border-[#E2DFD8] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-[#321E12]">Phần III — Trả lời ngắn (0,25đ/câu, đáp án ≤ 4 ký tự)</p>
                <button
                  onClick={() => setPart3((p) => [...p, emptyShort()])}
                  className="px-2.5 py-1.5 bg-[#FFF2E6] text-[#C85A17] text-[10px] font-black rounded-lg inline-flex items-center gap-1 cursor-pointer hover:bg-[#FFE8D5]"
                >
                  <Plus className="w-3 h-3 stroke-[3]" /> Thêm câu
                </button>
              </div>
              {part3.length === 0 && (
                <p className="text-[10px] font-bold text-[#605248]">Chưa có câu trả lời ngắn — học sinh điền đáp án số (VD: 9.8).</p>
              )}
              {part3.map((qq, i) => (
                <div key={i} className="border border-[#E2DFD8]/70 rounded-xl p-3 bg-[#FAF9F6] flex items-start gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-[#C85A17] mt-2 w-10 flex-shrink-0">Câu {i + 1}</span>
                  <textarea
                    value={qq.q}
                    onChange={(e) => setPart3((p) => p.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                    placeholder="Câu hỏi (đáp án là con số)"
                    rows={2}
                    className={inputCls + " resize-none flex-1 min-w-[200px]"}
                  />
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      value={qq.answer}
                      onChange={(e) => setPart3((p) => p.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
                      placeholder="Đ.án"
                      maxLength={4}
                      className="w-16 px-2 py-2 bg-white border border-[#137333]/40 rounded-lg text-xs font-black text-[#137333] text-center outline-none"
                    />
                    <span className="text-[9px] font-bold text-[#605248]">± </span>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={qq.tolerance ?? 0}
                      onChange={(e) => setPart3((p) => p.map((x, j) => (j === i ? { ...x, tolerance: Number(e.target.value) || 0 } : x)))}
                      title="Dung sai"
                      className="w-16 px-2 py-2 bg-white border border-[#E2DFD8] rounded-lg text-xs font-bold text-[#605248] text-center outline-none"
                    />
                    <button
                      onClick={() => setPart3((p) => p.filter((_, j) => j !== i))}
                      className="p-1.5 text-[#605248]/50 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {error && <p className="text-xs font-black text-red-600">{error}</p>}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#E2DFD8]/60">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-[#E2DFD8] text-[#605248] text-xs font-black rounded-xl cursor-pointer hover:bg-[#FFF8F0]"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || (mode === "personal" && labAssignments.length === 0)}
            className="px-5 py-2.5 bg-[#C85A17] hover:bg-[#B55210] disabled:opacity-50 text-white text-xs font-black rounded-xl cursor-pointer transition-all active:scale-95"
          >
            {busy ? "Đang giao..." : "Giao cho lớp"}
          </button>
        </div>
      </div>
    </div>
  );
}
