"use client";

/**
 * ClassDetail — Trang quản lý 1 lớp của giáo viên:
 *  - Roster học sinh: lần hoạt động cuối + sparkline 7 ngày (cường độ vào app).
 *  - Danh sách bài tập đã giao + thống kê nộp/điểm TB + xoá.
 *  - Nút giao bài Lab / Quiz (composer render ở TeacherShell).
 */

import React, { useState } from "react";
import {
  ArrowLeft, Users, FlaskConical, ListChecks, Trash2,
  Plus, RefreshCw, ShieldCheck, ChevronRight, Flame, Download, UserX, Clock,
} from "lucide-react";
import type { ClassDetailData, Assignment } from "@/lib/classTypes";
import { teacherPost, timeAgo, formatDate } from "./api";
import MistakeHeatmap from "./MistakeHeatmap";

interface Props {
  token: string;
  detail: ClassDetailData;
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onComposeLab: () => void;
  onComposeQuiz: () => void;
  onOpenStudent: (studentId: string, studentName: string) => void;
}

/** Sparkline SVG mini — 7 cột hoạt động, cột cuối = hôm nay. */
function Sparkline({ days }: { days: number[] }) {
  const max = Math.max(1, ...days);
  const barW = 6;
  const gap = 3;
  const h = 20;
  return (
    <svg width={days.length * (barW + gap)} height={h} className="flex-shrink-0" aria-hidden>
      {days.map((v, i) => {
        const barH = Math.max(2, Math.round((v / max) * (h - 2)));
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={h - barH}
            width={barW}
            height={barH}
            rx={2}
            className={v > 0 ? "fill-[#C85A17]" : "fill-[#E2DFD8]"}
          />
        );
      })}
    </svg>
  );
}

const KIND_LABEL: Record<Assignment["kind"], string> = {
  lab: "Bài Lab",
  quiz: "Quiz",
  personal_quiz: "Quiz chống gian lận",
};

export default function ClassDetail({
  token, detail, loading, onBack, onRefresh, onComposeLab, onComposeQuiz, onOpenStudent,
}: Props) {
  const { class: cls, members, assignments, stats, activity } = detail;
  const statOf = (id: string) => stats.find((s) => s.assignmentId === id);
  const [heatmapOpen, setHeatmapOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  /** Tải bảng điểm CSV (kèm Bearer token nên không dùng <a href> trực tiếp). */
  const downloadCsv = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/class/gradebook?classId=${encodeURIComponent(cls.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không tải được bảng điểm.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bangdiem-${cls.code}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* im lặng — GV bấm lại nếu lỗi mạng */
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (a: Assignment) => {
    if (!window.confirm(`Xoá bài tập "${a.title}"? Bài nộp của học sinh sẽ không hiển thị nữa.`)) return;
    try {
      await teacherPost(token, "assignment-delete", { assignmentId: a.id });
      onRefresh();
    } catch {
      /* refresh sẽ hiện trạng thái thật */
    }
  };

  const handleKick = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Đuổi "${studentName}" khỏi lớp?\nBài nộp và điểm quiz của em trong lớp này cũng sẽ bị xóa.`)) return;
    try {
      await teacherPost(token, "kick", { classId: cls.id, studentId });
      onRefresh();
    } catch {
      /* refresh sẽ hiện trạng thái thật */
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2.5 bg-white border border-[#E2DFD8] rounded-xl text-[#605248] hover:text-[#C85A17] hover:bg-[#FFF2E6] cursor-pointer transition-all active:scale-90 flex-shrink-0"
            title="Về danh sách lớp"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-black text-[#321E12] truncate">{cls.name}</h2>
            <p className="text-xs font-bold text-[#605248] mt-0.5">
              Mã lớp: <span className="font-mono font-black text-[#C85A17] tracking-widest">{cls.code}</span>
              {" · "}{members.length} học sinh
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHeatmapOpen(true)}
            className="px-4 py-2.5 bg-white border border-[#E2DFD8] rounded-xl text-xs font-black text-[#605248] hover:text-red-600 hover:border-red-300 cursor-pointer transition-all active:scale-95 inline-flex items-center gap-1.5"
            title="Lớp yếu chỗ nào?"
          >
            <Flame className="w-4 h-4" /> Bản đồ lỗi sai
          </button>
          <button
            onClick={downloadCsv}
            disabled={downloading}
            className="px-4 py-2.5 bg-white border border-[#E2DFD8] rounded-xl text-xs font-black text-[#605248] hover:text-[#C85A17] hover:bg-[#FFF2E6] cursor-pointer transition-all active:scale-95 inline-flex items-center gap-1.5 disabled:opacity-50"
            title="Tải bảng điểm cả lớp (mở được bằng Excel)"
          >
            <Download className="w-4 h-4" /> {downloading ? "Đang tải..." : "Bảng điểm CSV"}
          </button>
          <button
            onClick={onRefresh}
            className="p-2.5 bg-white border border-[#E2DFD8] rounded-xl text-[#605248] hover:text-[#C85A17] hover:bg-[#FFF2E6] cursor-pointer transition-all active:scale-90"
            title="Tải lại"
          >
            <RefreshCw className={`w-4 h-4 stroke-[2.5] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {heatmapOpen && (
        <MistakeHeatmap token={token} classId={cls.id} onClose={() => setHeatmapOpen(false)} />
      )}

      {/* ── Bài tập đã giao ── */}
      <section className="bg-white border border-[#E2DFD8] rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-base font-black text-[#321E12] inline-flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-[#C85A17]" /> Bài tập đã giao ({assignments.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={onComposeLab}
              className="px-4 py-2.5 bg-gradient-to-r from-[#DF742E] to-[#B24A0C] text-white text-xs font-black rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              <FlaskConical className="w-4 h-4" /> Giao bài Lab
            </button>
            <button
              onClick={onComposeQuiz}
              className="px-4 py-2.5 bg-[#FFF2E6] hover:bg-[#FFE8D5] text-[#C85A17] text-xs font-black rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Giao Quiz
            </button>
          </div>
        </div>

        {assignments.length === 0 ? (
          <p className="text-sm font-bold text-[#605248] py-4 text-center">
            Chưa giao bài tập nào. Bấm &quot;Giao bài Lab&quot; để đặt mục tiêu đo cho học sinh.
          </p>
        ) : (
          <div className="space-y-2.5">
            {assignments.map((a) => {
              const st = statOf(a.id);
              const linkedLab = a.linkedLabId ? assignments.find((x) => x.id === a.linkedLabId) : null;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-4 bg-[#FAF9F6] border border-[#E2DFD8]/70 rounded-2xl"
                >
                  <span
                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wide flex-shrink-0 ${
                      a.kind === "lab"
                        ? "bg-[#FFF2E6] text-[#C85A17]"
                        : a.kind === "personal_quiz"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-sky-50 text-sky-700"
                    }`}
                  >
                    {KIND_LABEL[a.kind]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#321E12] truncate">{a.title}</p>
                    <p className="text-xs font-bold text-[#605248] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span>Giao {formatDate(a.createdAt)} · {st?.submittedCount ?? 0}/{members.length} đã nộp</span>
                      {st?.avgScore != null && <span>· ĐTB <span className="text-[#C85A17] font-black">{st.avgScore}</span></span>}
                      {a.openAt && (
                        <span className="inline-flex items-center gap-1 text-sky-700">
                          <Clock className="w-3 h-3" /> mở {new Date(a.openAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                        </span>
                      )}
                      {a.durationSec ? <span className="text-sky-700">· {Math.round(a.durationSec / 60)} phút làm</span> : null}
                      {linkedLab && <span className="text-emerald-700">· nối tiếp &quot;{linkedLab.title}&quot;</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(a)}
                    title="Xoá bài tập"
                    className="p-2.5 text-[#605248]/60 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Roster học sinh ── */}
      <section className="bg-white border border-[#E2DFD8] rounded-3xl p-6 space-y-4">
        <h3 className="text-base font-black text-[#321E12] inline-flex items-center gap-2">
          <Users className="w-5 h-5 text-[#C85A17]" /> Học sinh trong lớp ({members.length})
        </h3>

        {members.length === 0 ? (
          <div className="text-center py-6 space-y-1.5">
            <ShieldCheck className="w-8 h-8 text-[#C85A17]/30 mx-auto" />
            <p className="text-xs font-black text-[#321E12]">Chưa có học sinh nào tham gia</p>
            <p className="text-[11px] font-bold text-[#605248]">
              Đọc mã <span className="font-mono font-black text-[#C85A17] tracking-widest">{cls.code}</span> cho
              học sinh nhập ở tab &quot;Lớp của tôi&quot; trong app.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2DFD8]/60">
            {members.map((m) => {
              const act = activity[m.studentId];
              return (
                <div
                  key={m.studentId}
                  className="w-full flex items-center gap-3 py-3.5 px-1 group"
                >
                  <button
                    onClick={() => onOpenStudent(m.studentId, m.studentName)}
                    className="flex-1 flex items-center gap-3 min-w-0 text-left hover:bg-[#FFF8F0] rounded-xl px-1 py-1 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#C85A17] text-white flex items-center justify-center font-black text-base flex-shrink-0">
                      {m.studentName.trim().charAt(0).toUpperCase() || "H"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[#321E12] truncate hover:text-[#C85A17] transition-colors">
                        {m.studentName}
                      </p>
                      <p className="text-xs font-bold text-[#605248]">
                        Hoạt động: {timeAgo(act?.lastActive ?? 0)}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Sparkline days={act?.days ?? [0, 0, 0, 0, 0, 0, 0]} />
                    <button
                      onClick={() => onOpenStudent(m.studentId, m.studentName)}
                      title="Xem chi tiết"
                      className="p-2 text-[#605248]/40 hover:text-[#C85A17] hover:bg-[#FFF2E6] rounded-lg cursor-pointer transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleKick(m.studentId, m.studentName)}
                      title="Đuổi khỏi lớp"
                      className="p-2 text-[#605248]/40 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <UserX className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
