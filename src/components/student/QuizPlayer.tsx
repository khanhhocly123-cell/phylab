"use client";

/**
 * QuizPlayer — Học sinh làm QUIZ form Bộ GD 2025 (3 phần) — dùng chung cho
 * quiz thường và quiz chống gian lận (đề sinh từ số liệu Lab của chính em).
 *
 * Chống lộ đáp án: đề tải từ server đã LƯỢC đáp án (stripAnswers);
 * bài làm gửi lên server chấm và trả điểm + breakdown để review.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, CheckCircle2, XCircle, Award, ShieldCheck, Timer, Lock } from "lucide-react";
import { MathText } from "@/components/Latex";
import type { MoeQuizPublic, MoeAnswers, MoeGradeResult } from "@/lib/moeQuiz";
import type { Assignment } from "@/lib/classTypes";
import { getStudentId } from "@/lib/activity";

interface Props {
  assignment: Assignment;
  studentName: string;
  onClose: () => void;
  /** Gọi sau khi nộp thành công (để refresh trạng thái lớp). */
  onSubmitted: () => void;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "needLab"; message: string }
  | { kind: "notOpen"; openAt: number }
  | { kind: "ready"; quiz: MoeQuizPublic; durationSec: number | null };

function fmtCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} ${d
    .getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

export default function QuizPlayer({ assignment, studentName, onClose, onSubmitted }: Props) {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [answers, setAnswers] = useState<MoeAnswers>({ part1: [], part2: [], part3: [] });
  const [result, setResult] = useState<MoeGradeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null); // giây còn lại

  const isPersonal = assignment.kind === "personal_quiz";
  const answersRef = useRef(answers);
  const submittedRef = useRef(false);

  // Giữ ref đồng bộ với state (dùng cho auto-nộp khi hết giờ) — cập nhật trong effect, không trong render.
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    const studentId = getStudentId();
    const action = isPersonal ? "personal-quiz" : "quiz";
    fetch(`/api/class/${action}?assignmentId=${encodeURIComponent(assignment.id)}&studentId=${encodeURIComponent(studentId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (data?.needLab) {
            setLoad({ kind: "needLab", message: data.error || "Em cần nộp bài Lab trước." });
          } else if (data?.notOpen) {
            setLoad({ kind: "notOpen", openAt: data.openAt });
          } else {
            setLoad({ kind: "error", message: data?.error || "Không tải được đề." });
          }
          return;
        }
        const quiz = data.quiz as MoeQuizPublic;
        const durationSec = (data.durationSec as number | null) ?? null;
        setLoad({ kind: "ready", quiz, durationSec });
        if (durationSec && durationSec > 0) setRemaining(durationSec);
        setAnswers({
          part1: quiz.part1.map(() => null),
          part2: quiz.part2.map((q) => q.statements.map(() => null)),
          part3: quiz.part3.map(() => ""),
        });
      })
      .catch(() => setLoad({ kind: "error", message: "Lỗi mạng khi tải đề." }));
  }, [assignment.id, isPersonal]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/class/submit-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: assignment.id,
          studentId: getStudentId(),
          studentName,
          answers: answersRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Không nộp được bài.");
      setResult(data.result as MoeGradeResult);
      setRemaining(null);
      onSubmitted();
    } catch (err) {
      submittedRef.current = false;
      setError(err instanceof Error ? err.message : "Không nộp được bài.");
    } finally {
      setBusy(false);
    }
  }, [assignment.id, studentName, onSubmitted]);

  // Đồng hồ đếm ngược — hết giờ tự nộp.
  useEffect(() => {
    if (remaining == null || result) return;
    if (remaining <= 0) {
      void doSubmit();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r == null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [remaining, result, doSubmit]);

  const handleSubmit = () => {
    if (busy || load.kind !== "ready") return;
    void doSubmit();
  };

  const answeredCount =
    answers.part1.filter((a) => a != null).length +
    answers.part2.filter((q) => q.some((s) => s != null)).length +
    answers.part3.filter((a) => a.trim() !== "").length;
  const totalCount =
    (load.kind === "ready" ? load.quiz.part1.length + load.quiz.part2.length + load.quiz.part3.length : 0);

  const resultOf = (part: 1 | 2 | 3, index: number) =>
    result?.perQuestion.find((r) => r.part === part && r.index === index);

  return (
    <div className="fixed inset-0 z-50 bg-[#321E12]/45 backdrop-blur-xs flex items-start justify-center overflow-auto p-3 py-6">
      <div className="relative w-full max-w-2xl bg-[#FAF9F6] rounded-3xl border border-[#E2DFD8] shadow-lg p-5 md:p-6 space-y-4 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#C85A17]/25 gap-2">
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-black text-[#321E12] truncate inline-flex items-center gap-2">
              {isPersonal && <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
              {assignment.title}
            </h3>
            {isPersonal && !result && (
              <p className="text-xs font-bold text-emerald-700">
                Đề này sinh riêng từ số liệu Lab của em — mỗi bạn một đề khác nhau!
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Đồng hồ đếm ngược */}
            {remaining != null && !result && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black tabular-nums ${
                remaining <= 30 ? "bg-red-100 text-red-700 animate-pulse" : "bg-[#FFF2E6] text-[#C85A17]"
              }`}>
                <Timer className="w-4 h-4" /> {fmtCountdown(remaining)}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white border border-[#E2DFD8] flex items-center justify-center hover:bg-[#FFF0E0] font-bold text-[#321E12] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Trạng thái tải */}
        {load.kind === "loading" && (
          <div className="flex items-center justify-center py-14">
            <div className="w-10 h-10 border-4 border-[#C85A17]/20 border-t-[#C85A17] rounded-full animate-spin" />
          </div>
        )}
        {load.kind === "error" && (
          <p className="text-sm font-black text-red-600 py-6 text-center">{load.message}</p>
        )}
        {load.kind === "needLab" && (
          <div className="text-center py-10 space-y-2">
            <ShieldCheck className="w-12 h-12 text-emerald-600/40 mx-auto" />
            <p className="text-base font-black text-[#321E12]">Chưa có số liệu để sinh đề</p>
            <p className="text-sm font-bold text-[#605248] max-w-sm mx-auto">{load.message}</p>
          </div>
        )}
        {load.kind === "notOpen" && (
          <div className="text-center py-10 space-y-2">
            <Lock className="w-12 h-12 text-[#C85A17]/40 mx-auto" />
            <p className="text-base font-black text-[#321E12]">Quiz chưa tới giờ mở</p>
            <p className="text-sm font-bold text-[#605248]">Bài này mở lúc <strong>{fmtDateTime(load.openAt)}</strong> — quay lại sau nhé!</p>
          </div>
        )}

        {/* Kết quả sau nộp */}
        {result && (
          <div className="bg-white border border-[#E2DFD8] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#FFF2E6] border-2 border-[#C85A17]/30 flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 text-[#C85A17]" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#C85A17]">
                {result.score.toFixed(1)}<span className="text-sm text-[#605248] font-bold">/10</span>
              </p>
              <p className="text-[11px] font-bold text-[#605248]">
                Đạt {result.earned}/{result.max} điểm gốc · Xem lại từng câu bên dưới
              </p>
            </div>
          </div>
        )}

        {/* Đề bài */}
        {load.kind === "ready" && (
          <div className="space-y-5 max-h-[52vh] overflow-y-auto pr-1">
            {/* Phần I */}
            {load.quiz.part1.length > 0 && (
              <section className="space-y-3">
                <p className="text-xs font-black text-[#C85A17] uppercase tracking-wide">
                  Phần I — Trắc nghiệm ({load.quiz.part1.length} câu)
                </p>
                {load.quiz.part1.map((qq, i) => {
                  const r = resultOf(1, i);
                  return (
                    <div key={i} className={`bg-white border rounded-2xl p-4 space-y-2.5 ${
                      r ? (r.correct ? "border-[#137333]/40" : "border-red-300") : "border-[#E2DFD8]"
                    }`}>
                      <p className="text-xs font-black text-[#321E12] leading-relaxed">
                        <span className="text-[#C85A17]">Câu {i + 1}.</span> <MathText text={qq.q} />
                        {r && (r.correct
                          ? <CheckCircle2 className="inline w-3.5 h-3.5 text-[#137333] ml-1.5 -mt-0.5" />
                          : <XCircle className="inline w-3.5 h-3.5 text-red-500 ml-1.5 -mt-0.5" />)}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {qq.options.map((opt, oi) => (
                          <button
                            key={oi}
                            disabled={!!result}
                            onClick={() =>
                              setAnswers((a) => ({ ...a, part1: a.part1.map((x, j) => (j === i ? oi : x)) }))
                            }
                            className={`px-3 py-2 rounded-xl border text-left text-[11px] font-bold transition-all cursor-pointer disabled:cursor-default flex items-start gap-2 ${
                              answers.part1[i] === oi
                                ? "bg-[#FFF2E6] border-[#C85A17]/50 text-[#C85A17]"
                                : "bg-[#FAF9F6] border-[#E2DFD8] text-[#605248] hover:border-[#C85A17]/30"
                            }`}
                          >
                            <span className="font-black flex-shrink-0">{String.fromCharCode(65 + oi)}.</span>
                            <MathText text={opt} />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Phần II */}
            {load.quiz.part2.length > 0 && (
              <section className="space-y-3">
                <p className="text-xs font-black text-[#C85A17] uppercase tracking-wide">
                  Phần II — Đúng/Sai ({load.quiz.part2.length} câu)
                </p>
                {load.quiz.part2.map((qq, i) => {
                  const r = resultOf(2, i);
                  return (
                    <div key={i} className={`bg-white border rounded-2xl p-4 space-y-2.5 ${
                      r ? (r.correct ? "border-[#137333]/40" : "border-amber-300") : "border-[#E2DFD8]"
                    }`}>
                      <p className="text-xs font-black text-[#321E12] leading-relaxed">
                        <span className="text-[#C85A17]">Câu {i + 1}.</span> <MathText text={qq.q} />
                        {r && (
                          <span className="ml-2 text-[10px] font-black text-[#605248]">
                            ({r.earned}/{r.max}đ)
                          </span>
                        )}
                      </p>
                      <div className="space-y-1.5">
                        {qq.statements.map((st, si) => {
                          const chosen = answers.part2[i]?.[si];
                          const stOk = r?.perStatement?.[si];
                          return (
                            <div key={si} className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-[#605248] w-4 flex-shrink-0">
                                {String.fromCharCode(97 + si)})
                              </span>
                              <p className="flex-1 text-[11px] font-bold text-[#605248] leading-snug">
                                <MathText text={st.text} />
                              </p>
                              {r && (stOk
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-[#137333] flex-shrink-0" />
                                : <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />)}
                              <div className="flex gap-1 flex-shrink-0">
                                {([true, false] as const).map((val) => (
                                  <button
                                    key={String(val)}
                                    disabled={!!result}
                                    onClick={() =>
                                      setAnswers((a) => ({
                                        ...a,
                                        part2: a.part2.map((q, j) =>
                                          j === i ? q.map((x, k) => (k === si ? val : x)) : q
                                        ),
                                      }))
                                    }
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black cursor-pointer disabled:cursor-default transition-all ${
                                      chosen === val
                                        ? val
                                          ? "bg-[#137333] text-white"
                                          : "bg-red-600 text-white"
                                        : "bg-[#FAF9F6] border border-[#E2DFD8] text-[#605248]"
                                    }`}
                                  >
                                    {val ? "Đ" : "S"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Phần III */}
            {load.quiz.part3.length > 0 && (
              <section className="space-y-3">
                <p className="text-xs font-black text-[#C85A17] uppercase tracking-wide">
                  Phần III — Trả lời ngắn ({load.quiz.part3.length} câu)
                </p>
                {load.quiz.part3.map((qq, i) => {
                  const r = resultOf(3, i);
                  return (
                    <div key={i} className={`bg-white border rounded-2xl p-4 flex items-center gap-3 flex-wrap ${
                      r ? (r.correct ? "border-[#137333]/40" : "border-red-300") : "border-[#E2DFD8]"
                    }`}>
                      <p className="flex-1 min-w-[200px] text-xs font-black text-[#321E12] leading-relaxed">
                        <span className="text-[#C85A17]">Câu {i + 1}.</span> <MathText text={qq.q} />
                      </p>
                      <input
                        value={answers.part3[i] ?? ""}
                        disabled={!!result}
                        maxLength={4}
                        onChange={(e) =>
                          setAnswers((a) => ({ ...a, part3: a.part3.map((x, j) => (j === i ? e.target.value : x)) }))
                        }
                        placeholder="?"
                        className="w-20 px-2 py-2.5 bg-[#FAF9F6] border border-[#E2DFD8] rounded-xl text-sm font-black text-[#321E12] text-center outline-none focus:border-[#C85A17]/50 disabled:opacity-70"
                      />
                      {r && (r.correct
                        ? <CheckCircle2 className="w-4 h-4 text-[#137333]" />
                        : <XCircle className="w-4 h-4 text-red-500" />)}
                    </div>
                  );
                })}
              </section>
            )}
          </div>
        )}

        {error && <p className="text-xs font-black text-red-600">{error}</p>}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E2DFD8]/60">
          {load.kind === "ready" && !result ? (
            <>
              <p className="text-[10px] font-bold text-[#605248]">
                Đã trả lời {answeredCount}/{totalCount} câu
              </p>
              <button
                onClick={handleSubmit}
                disabled={busy}
                className="px-5 py-2.5 bg-[#C85A17] hover:bg-[#B55210] disabled:opacity-50 text-white text-xs font-black rounded-xl cursor-pointer transition-all active:scale-95"
              >
                {busy ? "Đang chấm..." : "Nộp bài"}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="ml-auto px-5 py-2.5 bg-white border border-[#E2DFD8] text-[#605248] text-xs font-black rounded-xl cursor-pointer hover:bg-[#FFF8F0]"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
