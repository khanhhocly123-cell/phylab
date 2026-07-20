"use client";

/**
 * MyClassTab — Tab "Lớp của tôi" của HỌC SINH:
 *  - Chưa vào lớp: form nhập mã 5 ký tự giáo viên đọc.
 *  - Đã vào lớp: thẻ thông tin lớp + danh sách bài tập (Lab/Quiz) với trạng thái & điểm.
 *  - Bài Lab của GV → nhảy thẳng vào phòng Lab với ĐỀ CỦA GIÁO VIÊN.
 *  - Quiz → mở QuizPlayer; khóa nếu chưa tới giờ mở hoặc chưa nộp Lab nối tiếp.
 */

import React, { useState } from "react";
import {
  Users, KeyRound, FlaskConical, ListChecks, ShieldCheck,
  ChevronRight, CheckCircle2, Clock, GraduationCap, RefreshCw, Lock,
} from "lucide-react";
import type { MyClassData, MyAssignmentStatus } from "@/lib/classTypes";
import type { LessonId } from "@/lib/types";
import { getStudentId } from "@/lib/activity";
import QuizPlayer from "./QuizPlayer";

interface Props {
  studentName: string;
  myClass: MyClassData | null;
  loading: boolean;
  onRefresh: () => void;
  /** Mở phòng Lab của bài được giao (đề GV sẽ override đề AI). */
  onOpenLab: (lessonId: LessonId) => void;
}

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}
function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} ${fmtDate(ms)}`;
}

export default function MyClassTab({ studentName, myClass, loading, onRefresh, onOpenLab }: Props) {
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [playingQuiz, setPlayingQuiz] = useState<MyAssignmentStatus | null>(null);
  const [lockMsg, setLockMsg] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Telex-safe: KHÔNG transform khi gõ; chỉ uppercase lúc gửi.
    const clean = code.trim().toUpperCase();
    if (!clean || joining) return;
    setJoining(true);
    setError("");
    try {
      const res = await fetch("/api/class/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean, studentId: getStudentId(), studentName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Không tham gia được lớp.");
      setCode("");
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tham gia được lớp.");
    } finally {
      setJoining(false);
    }
  };

  /* ═══ Chưa vào lớp: form nhập mã ═══ */
  if (!myClass) {
    return (
      <div className="max-w-md mx-auto w-full pt-6 md:pt-12">
        <div className="bg-white border border-[#E2DFD8] rounded-3xl p-6 md:p-8 text-center space-y-6 shadow-sm animate-scale-up">
          <div className="w-18 h-18 rounded-2xl bg-[#FFF2E6] border border-[#C85A17]/15 flex items-center justify-center mx-auto p-4">
            <GraduationCap className="w-9 h-9 text-[#C85A17]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#321E12]">Tham gia lớp học</h2>
            <p className="text-sm font-bold text-[#605248] leading-relaxed">
              Nhập <strong>mã lớp 5 ký tự</strong> giáo viên cung cấp để nhận bài tập,
              nộp báo cáo và xem điểm của mình.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-3">
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C85A17]/60" />
              {/* uppercase bằng CSS (không transform state) → telex/IME không bị ngắt */}
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: XKGSC"
                maxLength={5}
                autoCapitalize="characters"
                autoComplete="off"
                className="w-full pl-12 pr-4 py-4 bg-[#FAF9F6] border border-[#E2DFD8] rounded-2xl text-xl font-black tracking-[0.35em] text-[#321E12] text-center uppercase outline-none focus:border-[#C85A17]/50 transition-colors font-mono placeholder:tracking-normal"
              />
            </div>
            {error && <p className="text-sm font-black text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={joining || code.trim().length < 4}
              className="w-full py-4 bg-gradient-to-r from-[#DF742E] to-[#B24A0C] hover:from-[#E3813C] hover:to-[#A33E04] disabled:opacity-50 text-white text-base font-black rounded-2xl cursor-pointer transition-all active:scale-98 shadow-md"
            >
              {joining ? "Đang tham gia..." : "Vào lớp"}
            </button>
          </form>

          <p className="text-xs font-bold text-[#605248]/70">
            Chưa có mã? Hỏi giáo viên bộ môn Vật lí của em nhé.
          </p>
        </div>
      </div>
    );
  }

  /* ═══ Đã vào lớp ═══ */
  const { class: cls, memberCount, assignments } = myClass;
  const doneCount = assignments.filter((a) => a.score != null).length;

  // Bản đồ trạng thái Lab (để khóa quiz nối tiếp chưa nộp Lab).
  const labDone = new Map<string, boolean>();
  for (const s of assignments) {
    if (s.assignment.kind === "lab") labDone.set(s.assignment.id, s.score != null);
  }

  const kindMeta = (a: MyAssignmentStatus["assignment"]) =>
    a.kind === "lab"
      ? { icon: FlaskConical, label: "Bài Lab", cls: "bg-[#FFF2E6] text-[#C85A17]" }
      : a.kind === "personal_quiz"
        ? { icon: ShieldCheck, label: "Quiz chống gian lận", cls: "bg-emerald-50 text-emerald-700" }
        : { icon: ListChecks, label: "Quiz", cls: "bg-sky-50 text-sky-700" };

  /** Lý do khóa 1 bài tập (rỗng = mở). Đánh giá lại mỗi lần render/refresh. */
  const now = Date.now(); // eslint-disable-line react-hooks/purity -- lock states cần thời gian hiện tại; re-eval khi refresh
  const lockReason = (st: MyAssignmentStatus): string => {
    const a = st.assignment;
    if (a.openAt && now < a.openAt) return `Mở lúc ${fmtDateTime(a.openAt)}`;
    if ((a.kind === "quiz" || a.kind === "personal_quiz") && a.linkedLabId && !labDone.get(a.linkedLabId)) {
      return "Cần nộp bài Lab nối tiếp trước";
    }
    return "";
  };

  const openAssignment = (st: MyAssignmentStatus) => {
    const a = st.assignment;
    const reason = lockReason(st);
    if (reason) {
      setLockMsg(reason);
      setTimeout(() => setLockMsg(""), 3000);
      return;
    }
    if (a.kind === "lab") {
      if (a.lessonId) onOpenLab(a.lessonId as LessonId);
    } else {
      setPlayingQuiz(st);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-5">
      {/* Thẻ lớp */}
      <div className="bg-gradient-to-br from-[#DF742E] to-[#B24A0C] rounded-3xl p-6 md:p-7 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -right-2 bottom-2 w-16 h-16 rounded-full bg-white/10 pointer-events-none" />
        <div className="flex items-center justify-between gap-3 relative">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-white/70">Lớp của tôi</p>
            <h2 className="text-2xl md:text-3xl font-black truncate mt-0.5">{cls.name}</h2>
            <p className="text-sm font-bold text-white/85 mt-2 inline-flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1"><Users className="w-4 h-4" /> {memberCount} học sinh</span>
              <span className="inline-flex items-center gap-1 font-mono tracking-widest bg-white/15 px-2.5 py-0.5 rounded-lg">
                {cls.code}
              </span>
            </p>
          </div>
          <button
            onClick={onRefresh}
            title="Tải lại"
            className="p-3 bg-white/15 hover:bg-white/25 rounded-xl cursor-pointer transition-all active:scale-90 flex-shrink-0"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {lockMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm font-black text-amber-800 inline-flex items-center gap-2">
          <Lock className="w-4 h-4" /> {lockMsg}
        </div>
      )}

      {/* Danh sách bài tập */}
      <section className="bg-white border border-[#E2DFD8] rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-[#321E12]">Bài tập được giao ({assignments.length})</h3>
          <span className="text-xs font-black text-[#137333] bg-emerald-50 px-3 py-1.5 rounded-lg">
            Đã hoàn thành {doneCount}/{assignments.length}
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Clock className="w-10 h-10 text-[#C85A17]/30 mx-auto" />
            <p className="text-base font-black text-[#321E12]">Chưa có bài tập nào</p>
            <p className="text-sm font-bold text-[#605248]">Giáo viên giao bài sẽ hiện ở đây — quay lại sau nhé!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {assignments.map((st) => {
              const a = st.assignment;
              const meta = kindMeta(a);
              const Icon = meta.icon;
              const done = st.score != null;
              const reason = lockReason(st);
              return (
                <button
                  key={a.id}
                  onClick={() => openAssignment(st)}
                  className={`w-full flex items-center gap-3 p-4 border rounded-2xl transition-all cursor-pointer text-left group active:scale-[0.99] ${
                    reason
                      ? "bg-[#F5F3EF] border-[#E2DFD8]/70 opacity-80"
                      : "bg-[#FAF9F6] hover:bg-[#FFF8F0] border-[#E2DFD8]/70 hover:border-[#C85A17]/30"
                  }`}
                >
                  <span className={`p-2.5 rounded-xl flex-shrink-0 ${meta.cls}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#321E12] truncate group-hover:text-[#C85A17] transition-colors">
                      {a.title}
                    </p>
                    <p className="text-xs font-bold text-[#605248] flex flex-wrap items-center gap-x-1.5">
                      <span>{meta.label} · Giao ngày {fmtDate(a.createdAt)}</span>
                      {done && st.submittedAt && <span>· Nộp ngày {fmtDate(st.submittedAt)}</span>}
                      {a.durationSec ? <span className="text-sky-700">· {Math.round(a.durationSec / 60)} phút</span> : null}
                    </p>
                    {reason && (
                      <p className="text-xs font-black text-amber-700 inline-flex items-center gap-1 mt-1">
                        <Lock className="w-3.5 h-3.5" /> {reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {done ? (
                      <span className="inline-flex items-center gap-1 text-base font-black text-[#137333]">
                        <CheckCircle2 className="w-4.5 h-4.5" /> {st.score?.toFixed(1)}
                      </span>
                    ) : reason ? (
                      <Lock className="w-5 h-5 text-[#605248]/50" />
                    ) : (
                      <span className="text-xs font-black text-[#C85A17] bg-[#FFF2E6] px-2.5 py-1.5 rounded-lg">
                        {a.kind === "lab" ? "Vào Lab" : "Làm bài"}
                      </span>
                    )}
                    {!reason && <ChevronRight className="w-5 h-5 text-[#605248]/40 group-hover:text-[#C85A17] group-hover:translate-x-0.5 transition-all" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Ghi chú đề GV */}
      {assignments.some((s) => s.assignment.kind === "lab" && s.score == null) && (
        <p className="text-xs font-bold text-[#605248] bg-[#FFF2E6]/60 border border-[#C85A17]/10 rounded-xl px-4 py-3">
          💡 Với bài Lab giáo viên giao: khi em vào phòng Lab, <strong>Đề bài sẽ là đề của giáo viên</strong> (không
          phải đề Trợ lý AI). Đo xong, chấm điểm ở Sổ Báo Cáo là bài tự động được nộp cho giáo viên.
        </p>
      )}

      {/* Quiz player modal */}
      {playingQuiz && (
        <QuizPlayer
          assignment={playingQuiz.assignment}
          studentName={studentName}
          onClose={() => setPlayingQuiz(null)}
          onSubmitted={onRefresh}
        />
      )}
    </div>
  );
}
