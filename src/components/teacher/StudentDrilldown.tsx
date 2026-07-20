"use client";

/**
 * StudentDrilldown — Giáo viên xem chi tiết MỘT học sinh:
 *  - Biểu đồ trực quan: cột điểm các bài + đường số liệu Lab (đo vs lý thuyết).
 *  - Bài Lab đã nộp: điểm, bảng số liệu từng lần đo, nhận xét AI (read-only).
 *  - Kết quả quiz + hoạt động 7 ngày.
 */

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FlaskConical, ListChecks, Activity as ActivityIcon, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { MathText } from "@/components/Latex";
import type { Assignment, LabSubmission, QuizResult, ActivityEvent } from "@/lib/classTypes";
import type { RichTrial } from "@/lib/types";
import { correctResultOf, theoreticalOf } from "@/lib/grading";
import { teacherGet, timeAgo } from "./api";

interface Props {
  token: string;
  classId: string;
  studentId: string;
  studentName: string;
  onBack: () => void;
}

interface DrilldownData {
  submissions: Array<{ assignment: Assignment; submission: LabSubmission }>;
  quizResults: Array<{ assignment: Assignment; result: QuizResult }>;
  activity: ActivityEvent[];
}

const ACTIVITY_LABEL: Record<string, string> = {
  login: "Vào app",
  lab_start: "Vào phòng Lab",
  lab_submit: "Nộp bài Lab",
  quiz_submit: "Nộp quiz",
};

function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} ${d
    .getDate()
    .toString()
    .padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function scoreColor(score: number): string {
  if (score >= 8) return "#137333";
  if (score >= 6.5) return "#C85A17";
  return "#DC2626";
}

export default function StudentDrilldown({ token, classId, studentId, studentName, onBack }: Props) {
  const [data, setData] = useState<DrilldownData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    teacherGet<DrilldownData>(token, "student", { classId, studentId })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu."));
  }, [token, classId, studentId]);

  // Dữ liệu biểu đồ cột điểm các bài (lab + quiz).
  const scoreChart = useMemo(() => {
    if (!data) return [];
    const rows = [
      ...data.submissions.map((s) => ({ name: s.assignment.title, score: s.submission.score })),
      ...data.quizResults.map((q) => ({ name: q.assignment.title, score: q.result.score })),
    ];
    return rows.map((r, i) => ({
      name: r.name.length > 14 ? r.name.slice(0, 13) + "…" : r.name,
      fullName: r.name,
      score: r.score,
      idx: i,
    }));
  }, [data]);

  // Dữ liệu biểu đồ Lab: kết quả đo của HS vs giá trị lý thuyết (bài Lab mới nhất).
  const labChart = useMemo(() => {
    if (!data || data.submissions.length === 0) return null;
    const sub = data.submissions[0].submission;
    const trials = (sub.payload?.trials ?? []) as RichTrial[];
    if (trials.length === 0) return null;
    const firstKind = trials[0].lab;
    const unit = firstKind === "freefall" ? "g (m/s²)"
      : firstKind === "ohm-x" || firstKind === "ohm-y" ? "R (Ω)"
      : firstKind === "emf" ? "E (V)" : "v (m/s)";
    const points = trials.map((tr, i) => ({
      lan: `Lần ${i + 1}`,
      doDuoc: +correctResultOf(tr.lab, tr.s, tr.t).toFixed(3),
      lyThuyet: +theoreticalOf(tr.lab, tr.s, tr.theta, tr.expected).toFixed(3),
    }));
    return { points, unit, title: data.submissions[0].assignment.title };
  }, [data]);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2.5 bg-white border border-[#E2DFD8] rounded-xl text-[#605248] hover:text-[#C85A17] hover:bg-[#FFF2E6] cursor-pointer transition-all active:scale-90"
          title="Về trang lớp"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <div className="w-12 h-12 rounded-full bg-[#C85A17] text-white flex items-center justify-center font-black text-lg">
          {studentName.trim().charAt(0).toUpperCase() || "H"}
        </div>
        <div>
          <h2 className="text-xl font-black text-[#321E12]">{studentName}</h2>
          <p className="text-xs font-bold text-[#605248]">Hồ sơ học tập trong lớp</p>
        </div>
      </div>

      {error && <p className="text-sm font-black text-red-600">{error}</p>}
      {!data && !error && (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-[#C85A17]/20 border-t-[#C85A17] rounded-full animate-spin" />
        </div>
      )}

      {data && (
        <>
          {/* ── Biểu đồ trực quan ── */}
          {(scoreChart.length > 0 || labChart) && (
            <section className="bg-white border border-[#E2DFD8] rounded-3xl p-6 space-y-5">
              <h3 className="text-base font-black text-[#321E12] inline-flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#C85A17]" /> Biểu đồ tổng quan
              </h3>

              {scoreChart.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#605248] mb-2">Điểm các bài tập (thang 10)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={scoreChart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E2" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: "#605248" }} interval={0} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#605248" }} />
                      <Tooltip
                        formatter={(v) => [`${v}/10`, "Điểm"]}
                        labelFormatter={(_, p) => (p?.[0]?.payload as { fullName?: string })?.fullName ?? ""}
                        contentStyle={{ fontSize: 12, fontWeight: 700, borderRadius: 12, border: "1px solid #E2DFD8" }}
                      />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {scoreChart.map((r) => (
                          <Cell key={r.idx} fill={scoreColor(r.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {labChart && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#605248] mb-2">
                    Số liệu Lab — {labChart.unit}: đo được vs lý thuyết
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={labChart.points} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E2" />
                      <XAxis dataKey="lan" tick={{ fontSize: 11, fontWeight: 700, fill: "#605248" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#605248" }} domain={["auto", "auto"]} />
                      <Tooltip contentStyle={{ fontSize: 12, fontWeight: 700, borderRadius: 12, border: "1px solid #E2DFD8" }} />
                      <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                      <Line type="monotone" dataKey="doDuoc" name="Em đo được" stroke="#C85A17" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="lyThuyet" name="Lý thuyết" stroke="#137333" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          )}

          {/* ── Bài Lab đã nộp ── */}
          <section className="bg-white border border-[#E2DFD8] rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-black text-[#321E12] inline-flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-[#C85A17]" /> Bài Lab đã nộp ({data.submissions.length})
            </h3>
            {data.submissions.length === 0 ? (
              <p className="text-sm font-bold text-[#605248]">Chưa nộp bài Lab nào.</p>
            ) : (
              data.submissions.map(({ assignment, submission }) => {
                const trials = (submission.payload?.trials ?? []) as RichTrial[];
                return (
                  <div key={submission.id} className="border border-[#E2DFD8]/70 rounded-2xl p-4 space-y-3 bg-[#FAF9F6]">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-black text-[#321E12]">{assignment.title}</p>
                        <p className="text-xs font-bold text-[#605248]">
                          Nộp lúc {fmtDateTime(submission.submittedAt)} · lần nộp thứ {submission.attempt}
                        </p>
                      </div>
                      <span className="text-3xl font-black" style={{ color: scoreColor(submission.score) }}>
                        {submission.score.toFixed(1)}
                        <span className="text-sm text-[#605248] font-bold">/10</span>
                      </span>
                    </div>

                    {trials.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-bold text-[#605248] min-w-[480px]">
                          <thead>
                            <tr className="text-left border-b border-[#E2DFD8]">
                              <th className="py-2 pr-2">#</th>
                              <th className="py-2 pr-2">Phần</th>
                              <th className="py-2 pr-2">s (m)</th>
                              <th className="py-2 pr-2">t (s)</th>
                              <th className="py-2 pr-2">θ (°)</th>
                              <th className="py-2 pr-2">KQ đúng</th>
                              <th className="py-2 pr-2">Lý thuyết</th>
                              <th className="py-2">Cân bằng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trials.map((tr, i) => (
                              <tr key={i} className="border-b border-[#E2DFD8]/40">
                                <td className="py-2 pr-2 font-black text-[#321E12]">{i + 1}</td>
                                <td className="py-2 pr-2">
                                  {tr.lab === "freefall" ? "Rơi tự do"
                                    : tr.lab === "average" ? "V. trung bình"
                                    : tr.lab === "instant" ? "V. tức thời"
                                    : tr.lab === "ohm-x" ? "Điện trở X"
                                    : tr.lab === "ohm-y" ? "Điện trở Y" : "Suất điện động"}
                                </td>
                                <td className="py-2 pr-2">{tr.s?.toFixed(3)}</td>
                                <td className="py-2 pr-2">{tr.t?.toFixed(3)}</td>
                                <td className="py-2 pr-2">{tr.theta ?? "—"}</td>
                                <td className="py-2 pr-2 font-black text-[#321E12]">
                                  {correctResultOf(tr.lab, tr.s, tr.t).toFixed(3)}
                                </td>
                                <td className="py-2 pr-2 text-[#137333]">
                                  {theoreticalOf(tr.lab, tr.s, tr.theta, tr.expected).toFixed(3)}
                                </td>
                                <td className="py-2">
                                  {tr.balanced === false ? (
                                    <span className="text-red-600 font-black">Chưa ⚠</span>
                                  ) : (
                                    <span className="text-[#137333]">Rồi ✓</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {submission.payload?.aiFeedback && (
                      <div className="text-sm font-semibold text-[#605248] leading-relaxed bg-white border border-[#E2DFD8]/60 rounded-xl p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-[#C85A17] mb-1">Nhận xét</p>
                        <MathText text={String(submission.payload.aiFeedback)} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>

          {/* ── Kết quả quiz ── */}
          <section className="bg-white border border-[#E2DFD8] rounded-3xl p-6 space-y-3">
            <h3 className="text-base font-black text-[#321E12] inline-flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-[#C85A17]" /> Kết quả quiz ({data.quizResults.length})
            </h3>
            {data.quizResults.length === 0 ? (
              <p className="text-sm font-bold text-[#605248]">Chưa làm quiz nào.</p>
            ) : (
              <div className="space-y-2">
                {data.quizResults.map(({ assignment, result }) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between gap-3 p-4 bg-[#FAF9F6] border border-[#E2DFD8]/70 rounded-2xl"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#321E12] truncate">{assignment.title}</p>
                      <p className="text-xs font-bold text-[#605248]">Nộp lúc {fmtDateTime(result.submittedAt)}</p>
                    </div>
                    <span className="text-xl font-black flex-shrink-0" style={{ color: scoreColor(result.score) }}>
                      {result.score.toFixed(1)}<span className="text-xs text-[#605248] font-bold">/10</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Hoạt động 7 ngày ── */}
          <section className="bg-white border border-[#E2DFD8] rounded-3xl p-6 space-y-3">
            <h3 className="text-base font-black text-[#321E12] inline-flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-[#C85A17]" /> Hoạt động 7 ngày qua ({data.activity.length} sự kiện)
            </h3>
            {data.activity.length === 0 ? (
              <p className="text-sm font-bold text-[#605248]">Không có hoạt động nào tuần này.</p>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {[...data.activity].reverse().map((e, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm font-bold text-[#605248] py-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C85A17] flex-shrink-0" />
                    <span className="text-[#321E12] font-black">{ACTIVITY_LABEL[e.type] ?? e.type}</span>
                    {e.meta && <span className="truncate">· {e.meta}</span>}
                    <span className="ml-auto flex-shrink-0 text-xs">{timeAgo(e.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
