"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Table, LineChart as LineChartIcon, FileText, GraduationCap,
  Send, CheckCircle2, AlertTriangle, Sparkles, Printer, RotateCcw,
} from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ExperimentReport, RichTrial } from "@/lib/types";
import { EXPERIMENT_SPECS } from "@/experiments/specs";
import { MathText } from "./Latex";
import { getReview } from "@/data/quizBank";
import {
  gradeLesson, correctResultOf, LessonGrade, LabKind, Trial,
  RESULT_TOLERANCE, MIN_TRIALS,
} from "@/lib/grading";
import GraphPlotter, { DataPoint } from "./notes/GraphPlotter";
import AiChat from "./notes/AiChat";
import type { LabAssignmentPayload } from "@/lib/classTypes";

interface LabData {
  lessonId: string;
  trials: RichTrial[];
}

interface NoteSectionProps {
  reports: ExperimentReport[];
  labData?: LabData | null;
  studentName?: string;
  assistantSettings?: {
    pronoun?: "anh" | "chị";
    answerStyle?: "short" | "detailed";
  };
  assignedSets?: LabAssignmentPayload["problemSets"] | null;
  onReportGraded?: (report: ExperimentReport) => void;
}

type TabKey = "data" | "graph" | "report" | "review";

const LAB_META: Record<LabKind, { title: string; formula: string; sLabel: string; tLabel: string; unit: string }> = {
  average: { title: "Mẫu 1 — Vận tốc trung bình", formula: "v = \\dfrac{s_{EF}}{t}", sLabel: "sEF (m)", tLabel: "t (s)", unit: "m/s" },
  instant: { title: "Mẫu 2 — Vận tốc tức thời", formula: "v = \\dfrac{d}{t}", sLabel: "d (m)", tLabel: "t (s)", unit: "m/s" },
  freefall: { title: "Số liệu — Gia tốc rơi tự do", formula: "g = \\dfrac{2s}{t^2}", sLabel: "s (m)", tLabel: "t (s)", unit: "m/s²" },
  "ohm-x": { title: "Mẫu X — Điện trở theo định luật Ohm", formula: "R_X = \\dfrac{U}{I}", sLabel: "U (V)", tLabel: "I (A)", unit: "Ω" },
  "ohm-y": { title: "Mẫu Y — Điện trở theo định luật Ohm", formula: "R_Y = \\dfrac{U}{I}", sLabel: "U (V)", tLabel: "I (A)", unit: "Ω" },
  emf: { title: "Số liệu — Suất điện động pin", formula: "U = \\mathcal{E} - Ir", sLabel: "I (A)", tLabel: "U (V)", unit: "V" },
};

const DEMO_TRIALS: Record<string, RichTrial[]> = {
  "do-toc-do-vat-chuyen-dong": [
    { lab: "average", s: 0.20, t: 0.635, theta: 15, balanced: true, studentResult: 0.315 },
    { lab: "average", s: 0.35, t: 0.842, theta: 15, balanced: true, studentResult: 0.416 },
    { lab: "average", s: 0.25, t: 0.536, theta: 20, balanced: true, studentResult: 0.466 },
    { lab: "instant", s: 0.0182, t: 0.036, theta: 20, balanced: true, studentResult: 0.506 },
    { lab: "instant", s: 0.0182, t: 0.032, theta: 30, balanced: true, studentResult: 0.569 },
  ],
  "do-gia-toc-roi-tu-do": [
    { lab: "freefall", s: 0.20, t: 0.203, balanced: true, studentResult: 9.71 },
    { lab: "freefall", s: 0.40, t: 0.287, balanced: true, studentResult: 9.71 },
    { lab: "freefall", s: 0.60, t: 0.352, balanced: true, studentResult: 9.69 },
  ],
};

function groupByLab(trials: RichTrial[]): Partial<Record<LabKind, RichTrial[]>> {
  const out: Partial<Record<LabKind, RichTrial[]>> = {};
  for (const t of trials) {
    const k = (t.lab as LabKind) || "freefall";
    (out[k] ??= []).push(t);
  }
  return out;
}

export default function NoteSection({ reports, labData, studentName, assistantSettings, assignedSets, onReportGraded }: NoteSectionProps) {
  const lessonIds = Object.keys(EXPERIMENT_SPECS);
  const [activeLesson, setActiveLesson] = useState<string>(
    () => labData?.lessonId || reports[0]?.lessonId || lessonIds[0] || ""
  );
  const [tab, setTab] = useState<TabKey>("data");

  // Số liệu để chấm: ưu tiên dữ liệu mới xuất từ lab; nếu không có, lấy từ báo cáo gần nhất.
  const activeReport = useMemo(
    () => reports.find((r) => r.lessonId === activeLesson) ?? null,
    [reports, activeLesson]
  );
  const trials: RichTrial[] = useMemo(() => {
    if (labData && labData.lessonId === activeLesson && labData.trials.length) return labData.trials;
    if (activeReport?.trials?.length) return activeReport.trials;
    return DEMO_TRIALS[activeLesson] ?? [];
  }, [labData, activeLesson, activeReport]);

  const samples = useMemo(() => groupByLab(trials), [trials]);
  const spec = EXPERIMENT_SPECS[activeLesson];
  const expectedTargets = labData?.lessonId === activeLesson ? assignedSets ?? undefined : undefined;

  // Kết quả HS tự tính, keyed "lab-index".
  const [results, setResults] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<LessonGrade | null>(null);
  // Điểm đồ thị HS tự vẽ (bắt buộc trước khi nộp) — giữ ở đây để không mất khi đổi tab.
  const [graphScore, setGraphScore] = useState<number | null>(null);
  const [aiComment, setAiComment] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!trials.length) return;
    setResults((prev) => {
      if (Object.keys(prev).length) return prev;
      const next: Record<string, string> = {};
      const grouped = groupByLab(trials);
      (Object.keys(grouped) as LabKind[]).forEach((lab) => {
        (grouped[lab] || []).forEach((tr, i) => {
          const value = tr.studentResult ?? correctResultOf(lab, tr.s, tr.t);
          next[`${lab}-${i}`] = Number.isFinite(value) ? String(Number(value).toFixed(lab === "freefall" ? 2 : 3)) : "";
        });
      });
      return next;
    });
  }, [trials]);

  const flash = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2600);
  };

  const setResult = (lab: string, i: number, v: string) =>
    setResults((p) => ({ ...p, [`${lab}-${i}`]: v }));

  const buildTrialsWithResults = (): Partial<Record<LabKind, Trial[]>> => {
    const map: Partial<Record<LabKind, Trial[]>> = {};
    (Object.keys(samples) as LabKind[]).forEach((lab) => {
      map[lab] = (samples[lab] || []).map((tr, i) => {
        const raw = results[`${lab}-${i}`];
        const sr = raw != null && raw.trim() !== "" ? parseFloat(raw) : null;
        return { ...tr, s: tr.s, t: tr.t, theta: tr.theta, balanced: tr.balanced, studentResult: sr };
      });
    });
    return map;
  };

  const handleGrade = async () => {
    if (trials.length === 0) {
      flash("Chưa có số liệu — hãy đo ở phòng Lab rồi Xuất sang Sổ Báo Cáo.", false);
      return;
    }
    // Đồ thị BẮT BUỘC: chưa vẽ + chấm đồ thị thì không cho nộp báo cáo.
    if (graphScore == null) {
      setTab("graph");
      flash("Bắt buộc: hãy tự vẽ đồ thị và bấm 'Chấm đồ thị' trước khi nộp báo cáo.", false);
      return;
    }
    const map = buildTrialsWithResults();
    // Ô bỏ trống bị tính 0 điểm cho lần đo đó — cảnh báo trước khi chấm.
    const anyBlank = Object.values(map).some((rows) => rows!.some((r) => r.studentResult == null));
    if (anyBlank && !window.confirm(
      "Còn ô 'Kết quả tính' bỏ trống. Ô trống sẽ bị 0% độ sát cho lần đo đó. Vẫn chấm điểm?"
    )) {
      return;
    }
    const g = gradeLesson(activeLesson, map, { hasGraph: true, graphScore, expectedTargets });
    setGrade(g);
    flash(`Đã chấm: ${g.totalScore.toFixed(1)}/10`);

    // Nhờ Smartbot viết nhận xét (fallback template ở server nếu chưa có bot_id).
    setAiLoading(true);
    let comment = "";
    try {
      const s0 = g.samples[0];
      const res = await fetch("/api/vnpt/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "grade",
          summary: buildGradeSummary(g, spec?.title || activeLesson),
          totalScore: g.totalScore,
          dataCloseness: s0?.dataCloseness,
          physicalCloseness: s0?.physicalCloseness,
          badSetupCount: g.samples.reduce((a, s) => a + s.badSetupCount, 0),
          assistantSettings,
        }),
      });
      const data = await res.json();
      comment = data.message || "";
    } catch {
      comment = "";
    }
    setAiComment(comment);
    setAiLoading(false);

    // Lưu báo cáo (kèm trials có studentResult để tái dựng deterministic).
    const richTrials: RichTrial[] = [];
    (Object.keys(map) as LabKind[]).forEach((lab) => {
      (map[lab] || []).forEach((r) =>
        richTrials.push({ ...(r as RichTrial), lab, s: r.s, t: r.t, theta: r.theta, balanced: r.balanced, studentResult: r.studentResult })
      );
    });
    const report: ExperimentReport = {
      id: `rep-${Date.now()}`,
      lessonId: activeLesson,
      title: spec?.title || activeLesson,
      shortTitle: spec?.shortTitle || "",
      date: new Date().toLocaleString("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      }),
      attempt: reports.filter((r) => r.lessonId === activeLesson).length + 1,
      measures: richTrials.map((t) => ({ s: t.s, t: t.t })),
      trials: richTrials,
      score: g.totalScore,
      graphScore,
      aiFeedback: comment,
    };
    onReportGraded?.(report);
    setTab("report");
  };

  return (
    <div className="w-full space-y-5">
      {/* Header + lesson selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2DFD8]/60 pb-3 print:hidden">
        <h2 className="text-base md:text-lg font-black text-[#321E12] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#C85A17] stroke-[2.5]" />
          Sổ Báo Cáo — Chấm điểm &amp; Báo cáo
        </h2>
        <select
          value={activeLesson}
          onChange={(e) => { setActiveLesson(e.target.value); setGrade(null); setGraphScore(null); setAiComment(""); setResults({}); }}
          className="text-xs font-black text-[#321E12] bg-white border border-[#E2DFD8] rounded-lg px-3 py-1.5 outline-none cursor-pointer"
        >
          {lessonIds.map((id) => (
            <option key={id} value={id}>{EXPERIMENT_SPECS[id].book}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap print:hidden">
        {([
          ["data", "Số liệu", Table],
          ["graph", "Đồ thị", LineChartIcon],
          ["report", "Báo cáo", FileText],
          ["review", "Ôn tập", GraduationCap],
        ] as [TabKey, string, typeof Table][]).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              tab === key
                ? "bg-[#C85A17] text-white border-[#C85A17] shadow-sm"
                : "bg-white text-[#605248] border-[#E2DFD8] hover:border-[#C85A17]/40"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ---------- TAB: SỐ LIỆU ---------- */}
      {tab === "data" && (
        <div className="space-y-5">
          {trials.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {(Object.keys(samples) as LabKind[]).map((lab) => (
                <SampleTable
                  key={lab}
                  lab={lab}
                  rows={samples[lab] || []}
                  results={results}
                  onChange={(i, v) => setResult(lab, i, v)}
                  grade={grade}
                />
              ))}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[11px] font-bold text-[#605248] max-w-md">
                  Tổng = <b>Thí nghiệm×70% + Đồ thị×30%</b> (đồ thị bắt buộc). Thí nghiệm =
                  Số liệu×70% + Trình tự×20% + Sai số×10%. Dung sai tính đúng chỉ {RESULT_TOLERANCE * 100}%,
                  cần tối thiểu {MIN_TRIALS} lần đo/mẫu. Máy chấm điểm số, Trợ lý Phylab (SmartBot) viết nhận xét.
                </p>
                <p className={`text-[11px] font-black ${graphScore != null ? "text-emerald-600" : "text-rose-600"}`}>
                  {graphScore != null ? `✓ Đồ thị đã chấm: ${graphScore}/10` : "⚠ Chưa chấm đồ thị (bắt buộc)"}
                </p>
                <button
                  onClick={handleGrade}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#DF742E] to-[#B24A0C] text-white text-xs font-black rounded-xl shadow-sm hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Chấm điểm &amp; nộp báo cáo
                </button>
              </div>
              {grade && <GradeBreakdown grade={grade} />}
            </>
          )}
        </div>
      )}

      {/* ---------- TAB: ĐỒ THỊ ---------- */}
      {/* Luôn mount (chỉ ẩn/hiện) để không mất các điểm HS đã vẽ khi chuyển tab. */}
      <div className={tab === "graph" ? "" : "hidden"}>
        <GraphTab
          lessonId={activeLesson}
          trials={trials}
          graphScore={graphScore}
          onScored={setGraphScore}
          onBackToData={() => setTab("data")}
        />
      </div>

      {/* ---------- TAB: BÁO CÁO ---------- */}
      {tab === "report" && (
        <ReportTab
          spec={spec}
          studentName={studentName}
          grade={grade}
          aiComment={aiComment}
          aiLoading={aiLoading}
          report={activeReport}
          expectedTargets={expectedTargets}
        />
      )}

      {/* ---------- TAB: ÔN TẬP ---------- */}
      {tab === "review" && <ReviewTab lessonId={activeLesson} lessonTitle={spec?.title} assistantSettings={assistantSettings} />}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-black flex items-center gap-2 animate-scale-up print:hidden ${
          toast.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ============================ Sub-components ============================ */

function EmptyState() {
  return (
    <div className="bg-white border border-[#E2DFD8] rounded-3xl p-12 text-center text-[#605248]">
      <Table className="w-12 h-12 mx-auto mb-3 stroke-[1.5] text-[#605248]/40" />
      <h3 className="text-sm font-black text-[#321E12]">Chưa có số liệu để chấm</h3>
      <p className="text-xs font-bold mt-2">
        Vào <b>Phòng Lab</b>, đo đủ các câu trong đề rồi bấm <b>“Xuất sang Sổ Báo Cáo”</b> để chấm điểm ở đây.
      </p>
    </div>
  );
}

function SampleTable({
  lab, rows, results, onChange, grade,
}: {
  lab: LabKind;
  rows: RichTrial[];
  results: Record<string, string>;
  onChange: (i: number, v: string) => void;
  grade: LessonGrade | null;
}) {
  const meta = LAB_META[lab];
  const showTheta = lab === "average" || lab === "instant";
  const displayFirst = (r: RichTrial) => lab === "emf" ? (r.current ?? 0) : (r.voltage ?? r.s);
  const displaySecond = (r: RichTrial) => lab === "emf" ? (r.voltage ?? 0) : (r.current ?? r.t);
  return (
    <div className="bg-white rounded-2xl border border-[#E2DFD8] p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase text-[#C85A17]">{meta.title}</h3>
        <span className="text-[10px] font-bold text-[#605248]">
          Công thức: <MathText text={`$${meta.formula}$`} />
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#E2DFD8]">
        <table className="w-full min-w-[440px] text-left text-[11px]">
          <thead>
            <tr className="bg-[#FAF6F0] border-b border-[#E2DFD8] font-black text-[#321E12]">
              <th className="p-2 text-center w-8">#</th>
              <th className="p-2 text-center">{meta.sLabel}</th>
              <th className="p-2 text-center">{meta.tLabel}</th>
              {showTheta && <th className="p-2 text-center">θ</th>}
              <th className="p-2 text-center">Thiết lập</th>
              <th className="p-2 text-center w-28">Kết quả tính ({meta.unit})</th>
              <th className="p-2 text-center w-16">Đánh giá</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const raw = results[`${lab}-${i}`];
              const sr = raw != null && raw.trim() !== "" ? parseFloat(raw) : null;
              const correct = correctResultOf(lab, r.s, r.t);
              const ok = sr != null && Math.abs(sr - correct) <= correct * RESULT_TOLERANCE;
              const filled = sr != null;
              const rowGrade = grade?.samples.find((sample) => sample.labKind === lab)?.perRow[i];
              const matchesExpectedTarget = rowGrade?.matchesExpectedTarget !== false;
              return (
                <tr key={i} className={`border-b border-[#E2DFD8]/60 font-semibold text-[#605248] ${matchesExpectedTarget ? "" : "bg-rose-50"}`}>
                  <td className="p-2 text-center text-[#605248]/40 font-black">{i + 1}</td>
                  <td className="p-2 text-center font-mono">{displayFirst(r).toFixed(lab === "emf" ? 4 : 3)}</td>
                  <td className="p-2 text-center font-mono">{displaySecond(r).toFixed(lab === "emf" ? 3 : 4)}</td>
                  {showTheta && <td className="p-2 text-center">{r.theta ?? "—"}°</td>}
                  <td className="p-2 text-center">
                    {lab === "emf" ? <span className="text-[8px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-black">R={r.config ?? r.resistance ?? 0} Ω</span> : r.balanced === false
                      ? <span className="text-[8px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black">Sai</span>
                      : <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black">Đúng</span>}
                  </td>
                  <td className="p-2">
                    <input
                      type="number" step="0.001" value={raw ?? ""}
                      onChange={(e) => onChange(i, e.target.value)}
                      placeholder="tự tính…"
                      className="w-full px-1.5 py-1 border border-[#E2DFD8] focus:border-[#C85A17] outline-none rounded-md bg-white font-bold text-center text-[#321E12] text-xs"
                    />
                  </td>
                  <td className="p-2 text-center">
                    {!matchesExpectedTarget ? <span className="text-[8px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-black">Sai đề</span>
                      : !filled ? <span className="text-[8px] text-[#605248]/40 font-black">—</span>
                      : ok ? <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-black">Đúng</span>
                        : <span className="text-[8px] bg-rose-100 border border-rose-300 text-rose-700 px-1.5 py-0.5 rounded font-black">Lệch</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {grade && (() => {
        const sg = grade.samples.find((s) => s.labKind === lab);
        if (!sg) return null;
        return (
          <p className="text-[10px] font-bold text-[#605248] mt-2">
            Số liệu {sg.dataScore}/10 · Trình tự {sg.sequenceScore}/10 · Sai số {sg.errorScore}/10 →
            <b className="text-[#C85A17]"> Điểm mẫu {sg.experimentScore.toFixed(1)}/10</b>
            {sg.badSetupCount > 0 && <span className="text-rose-600"> (trừ {sg.badSetupCount} lần đo khi chưa cân bằng)</span>}
            {sg.missingTrials > 0 && <span className="text-rose-600"> (thiếu {sg.missingTrials}/{sg.expectedConfigurationCount} cấu hình {sg.assignmentConstrained ? "đề giáo viên" : "độc lập"})</span>}
            {sg.unexpectedTrialCount > 0 && <span className="text-rose-700"> ({sg.unexpectedTrialCount} dòng đo sai cấu hình đề)</span>}
            {sg.duplicateTrialCount > 0 && <span className="text-amber-700"> ({sg.duplicateTrialCount} dòng trùng không tăng độ phủ)</span>}
          </p>
        );
      })()}
    </div>
  );
}

function GradeBreakdown({ grade }: { grade: LessonGrade }) {
  return (
    <div className="bg-[#FFF7EF] border border-[#C85A17]/25 rounded-2xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-black text-[#321E12]">Kết quả chấm</h3>
        <div className="text-2xl font-black text-[#C85A17]">{grade.totalScore.toFixed(1)}<span className="text-sm text-[#605248]">/10</span></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        {grade.samples.some((sample) => sample.assignmentConstrained) && (
          <Metric label="Đúng cấu hình đề" value={`${grade.assignmentCoveragePercent}%`} sub="cap điểm tổng theo độ phủ" />
        )}
        {grade.samples.map((s) => (
          <Metric key={s.labKind} label={s.label} value={`${s.experimentScore.toFixed(1)}/10`} sub={`sát ${s.physicalCloseness}%`} />
        ))}
        <Metric label="Điểm thí nghiệm" value={`${grade.experimentScore.toFixed(1)}/10`} sub="TB các mẫu" />
        {grade.hasGraph && grade.graphScore != null && (
          <Metric label="Điểm đồ thị" value={`${grade.graphScore.toFixed(1)}/10`} sub="tính 30% tổng" />
        )}
        <Metric label="Điểm tổng" value={`${grade.totalScore.toFixed(1)}/10`} sub="TN×70% + Đồ thị×30%" highlight />
      </div>
    </div>
  );
}

function Metric({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 border ${highlight ? "bg-[#C85A17] text-white border-[#C85A17]" : "bg-white border-[#E2DFD8]"}`}>
      <p className={`text-[9px] font-black uppercase ${highlight ? "text-white/80" : "text-[#605248]"}`}>{label}</p>
      <p className={`text-base font-black ${highlight ? "text-white" : "text-[#321E12]"}`}>{value}</p>
      {sub && <p className={`text-[9px] font-bold ${highlight ? "text-white/70" : "text-[#605248]/70"}`}>{sub}</p>}
    </div>
  );
}

function GraphTab({
  lessonId,
  trials,
  graphScore,
  onScored,
  onBackToData,
}: {
  lessonId: string;
  trials: RichTrial[];
  graphScore: number | null;
  onScored?: (score: number) => void;
  onBackToData?: () => void;
}) {
  const isFreeFall = lessonId === "do-gia-toc-roi-tu-do";
  const isOhm = lessonId === "do-dien-tro-dinh-luat-ohm";
  const isEmf = lessonId === "do-suat-dien-dong-pin-dien-hoa";

  // Điểm số liệu để HS tự vẽ lại.
  let data: DataPoint[] = [];
  let xLabel = "", yLabel = "", relation = "";
  if (isOhm) {
    // Đặc tuyến I-U của vật dẫn X (Y vẫn được so sánh đầy đủ trong bảng/báo cáo).
    data = trials.filter((t) => t.lab === "ohm-x" && (t.current ?? t.t) > 0)
      .map((t) => ({ x: +(t.voltage ?? t.s).toFixed(2), y: +(t.current ?? t.t).toFixed(5) }))
      .sort((a, b) => a.x - b.x);
    xLabel = "U (V) — vật dẫn X"; yLabel = "I (A)"; relation = "$I = U/R_X$";
  } else if (isEmf) {
    // U = E - Ir: tung độ gốc là E, độ lớn hệ số góc là r.
    data = trials.filter((t) => t.lab === "emf" && (t.current ?? 0) > 0 && (t.voltage ?? 0) > 0)
      .map((t) => ({ x: +(t.current ?? 0).toFixed(5), y: +(t.voltage ?? 0).toFixed(4) }))
      .sort((a, b) => a.x - b.x);
    xLabel = "I (A)"; yLabel = "U (V)"; relation = "$U = \\mathcal{E} - Ir$";
  } else if (isFreeFall) {
    // s theo t² (độ dốc = g/2, đường thẳng qua gốc).
    data = trials.filter((t) => t.lab === "freefall" && t.t > 0)
      .map((t) => ({ x: +(t.t * t.t).toFixed(4), y: +t.s.toFixed(3) }));
    xLabel = "t² (s²)"; yLabel = "s (m)"; relation = "$s = \\tfrac{1}{2}g\\,t^2$";
  } else {
    // Bài 6: v = s/t theo s — luyện vẽ (không bắt buộc tính điểm).
    data = trials.filter((t) => t.t > 0)
      .map((t) => ({ x: +t.s.toFixed(3), y: +(t.s / t.t).toFixed(3) }))
      .sort((a, b) => a.x - b.x);
    xLabel = "s (m)"; yLabel = "v (m/s)"; relation = "$v = s/t$";
  }

  return (
    <div className="bg-white border border-[#E2DFD8] rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <LineChartIcon className="w-5 h-5 text-[#C85A17]" />
        <h3 className="text-sm font-black text-[#321E12]">Đồ thị — em tự vẽ từ số liệu</h3>
      </div>
      <p className="text-[11px] font-bold text-[#605248]">
        Dùng bảng số liệu em đã đo, tự <b>chấm điểm lên lưới</b> rồi bấm “Chấm đồ thị”. Máy sẽ đối chiếu điểm em
        vẽ với số liệu chuẩn và tính độ tuyến tính (R²). Quan hệ lý thuyết: <MathText text={relation} />.
      </p>

      {/* Bảng số liệu tham chiếu để HS biết cần vẽ điểm nào */}
      {data.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.map((d, i) => (
            <span key={i} className="text-[10px] font-bold text-[#605248] bg-[#FAF6F0] border border-[#E2DFD8] rounded-lg px-2 py-1">
              ({d.x}, {d.y})
            </span>
          ))}
        </div>
      )}

      {data.length >= 2 ? (
        <GraphPlotter data={data} xLabel={xLabel} yLabel={yLabel} onScored={onScored} />
      ) : (
        <div className="text-center py-10 text-[#605248]/60 text-xs font-bold">
          Cần ít nhất 2 lần đo (Xuất từ phòng Lab) để vẽ đồ thị.
        </div>
      )}
      {graphScore != null && (
        <div className="bg-[#F3F8F3] border border-emerald-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] font-black text-emerald-700">
            Đồ thị đã chấm {graphScore}/10. Quay về tab Số liệu để bấm “Chấm điểm & nộp báo cáo”.
          </p>
          <button
            type="button"
            onClick={onBackToData}
            className="px-3 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:bg-emerald-700 transition-all cursor-pointer"
          >
            Về Số liệu
          </button>
        </div>
      )}
    </div>
  );
}

function ReportTab({
  spec, studentName, grade, aiComment, aiLoading, report, expectedTargets,
}: {
  spec: (typeof EXPERIMENT_SPECS)[string] | undefined;
  studentName?: string;
  grade: LessonGrade | null;
  aiComment: string;
  aiLoading: boolean;
  report: ExperimentReport | null;
  expectedTargets?: LabAssignmentPayload["problemSets"];
}) {
  // Nếu chưa chấm ở phiên này nhưng có báo cáo cũ, tái dựng điểm deterministic từ trials
  // (kèm điểm đồ thị đã lưu trong báo cáo, nếu có).
  const effectiveGrade = grade
    ?? (report?.trials?.length
      ? gradeLesson(
          report.lessonId,
          groupByLab(report.trials) as Partial<Record<LabKind, Trial[]>>,
          { hasGraph: report.graphScore != null, graphScore: report.graphScore, expectedTargets }
        )
      : null);
  const comment = aiComment || report?.aiFeedback || "";

  if (!effectiveGrade) {
    return (
      <div className="bg-white border border-[#E2DFD8] rounded-3xl p-10 text-center text-[#605248]">
        <FileText className="w-10 h-10 mx-auto mb-3 text-[#605248]/40" />
        <p className="text-xs font-bold">Chưa có báo cáo. Hãy chấm điểm ở tab <b>Số liệu</b> trước.</p>
      </div>
    );
  }

  const today = report?.date || new Date().toLocaleDateString("vi-VN");
  const isGrade11 = spec?.id === "do-dien-tro-dinh-luat-ohm" || spec?.id === "do-suat-dien-dong-pin-dien-hoa";

  return (
    <div className="space-y-3">
      <div className="flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gradient-to-r from-[#DF742E] to-[#B24A0C] text-white text-xs font-black rounded-lg hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Printer className="w-4 h-4" /> Xuất PDF (In báo cáo)
        </button>
      </div>

      <article id="phylab-report" className="bg-white rounded-3xl border border-[#E2DFD8] shadow-sm p-6 md:p-10 space-y-6 print:rounded-none print:border-0 print:shadow-none print:p-0">
        {/* ===== Quốc hiệu / đầu trang kiểu báo cáo trường học ===== */}
        <header className="text-center border-b-2 border-[#321E12] pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-0.5 text-[10px] font-black uppercase text-[#605248] print:flex-row">
            <span>Trường THPT Chuyên Lê Hồng Phong</span>
            <span>Phylab — Phòng thí nghiệm ảo</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#321E12] mt-4 uppercase tracking-wide">Báo cáo thực hành Vật lí</h1>
          <p className="text-sm font-black text-[#C85A17] mt-1">{spec?.title}</p>
          <p className="text-[10px] font-bold text-[#605248] mt-0.5">{spec?.book}</p>
        </header>

        {/* ===== Thông tin học sinh ===== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-bold text-[#321E12] print:grid-cols-2">
          <p>Họ và tên: <b className="border-b border-dotted border-[#605248]">{studentName?.split(" (")[0] || "—"}</b></p>
          <p>Lớp: <b>{isGrade11 ? "11A1" : "10A1"}</b> · Mã HS: <b>PH-2026-09</b></p>
          <p>Ngày thực hành: <b>{today}</b></p>
          <p>Lần nộp: <b>{report?.attempt ?? 1}</b></p>
        </section>

        {/* ===== I. Mục đích ===== */}
        <section className="space-y-1.5">
          <h2 className="text-xs font-black uppercase text-[#321E12] border-l-[3px] border-[#C85A17] pl-2">I. Mục đích thí nghiệm</h2>
          <p className="text-[11px] font-semibold text-[#605248] leading-relaxed"><MathText text={spec?.theory.objective || ""} /></p>
        </section>

        {/* ===== II. Bảng số liệu & kết quả từng mẫu ===== */}
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase text-[#321E12] border-l-[3px] border-[#C85A17] pl-2">II. Số liệu đo &amp; kết quả tính</h2>
          {effectiveGrade.samples.map((s) => (
            <div key={s.labKind} className="space-y-1.5 break-inside-avoid">
              <h3 className="text-[11px] font-black text-[#C85A17] uppercase">{s.label} <span className="text-[#605248] normal-case">— công thức <MathText text={`$${LAB_META[s.labKind].formula}$`} /></span></h3>
              <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[520px] print:min-w-0 text-[10px] border-collapse">
                <thead>
                  <tr className="bg-[#FAF6F0] font-black text-[#321E12]">
                    <th className="border border-[#C9C2B6] p-1.5 w-8">Lần</th>
                    <th className="border border-[#C9C2B6] p-1.5">{LAB_META[s.labKind].sLabel}</th>
                    <th className="border border-[#C9C2B6] p-1.5">{LAB_META[s.labKind].tLabel}</th>
                    {(s.labKind === "average" || s.labKind === "instant") && <th className="border border-[#C9C2B6] p-1.5">θ (°)</th>}
                    <th className="border border-[#C9C2B6] p-1.5">HS tính ({s.unit})</th>
                    <th className="border border-[#C9C2B6] p-1.5">Theo công thức ({s.unit})</th>
                    <th className="border border-[#C9C2B6] p-1.5">Sát lý thuyết</th>
                    <th className="border border-[#C9C2B6] p-1.5">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-[#321E12]">
                  {s.perRow.map((r) => (
                    <tr key={r.index} className="text-center">
                      <td className="border border-[#C9C2B6] p-1.5 font-black">{r.index}</td>
                      <td className="border border-[#C9C2B6] p-1.5 font-mono">{(s.labKind === "emf" ? (r.current ?? 0) : (r.voltage ?? r.s)).toFixed(s.labKind === "emf" ? 4 : 3)}</td>
                      <td className="border border-[#C9C2B6] p-1.5 font-mono">{(s.labKind === "emf" ? (r.voltage ?? 0) : (r.current ?? r.t)).toFixed(s.labKind === "emf" ? 3 : 4)}</td>
                      {(s.labKind === "average" || s.labKind === "instant") && <td className="border border-[#C9C2B6] p-1.5">{r.theta ?? "—"}</td>}
                      <td className="border border-[#C9C2B6] p-1.5 font-mono">{r.studentResult != null ? r.studentResult.toFixed(3) : "(bỏ trống)"}</td>
                      <td className="border border-[#C9C2B6] p-1.5 font-mono">{r.correctResult.toFixed(3)}</td>
                      <td className="border border-[#C9C2B6] p-1.5">{Math.round(r.physCloseness)}%</td>
                      <td className={`border border-[#C9C2B6] p-1.5 font-black ${r.correct ? "text-emerald-700" : "text-rose-700"}`}>
                        {!r.matchesExpectedTarget ? "Sai cấu hình đề" : r.correct ? "Đúng" : "Lệch"}{!r.balanced && " · chưa cân bằng"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <p className="text-[10px] font-bold text-[#605248]">
                Giá trị trung bình: <b className="text-[#321E12]">{s.meanResult.toFixed(3)} {s.unit}</b>
                {" "}· Giá trị lý thuyết: <b className="text-[#321E12]">{s.perRow[0]?.theoretical.toFixed(3)} {s.unit}</b>
                {s.badSetupCount > 0 && <span className="text-rose-700"> · {s.badSetupCount} lần đo khi chưa cân bằng</span>}
                {s.missingTrials > 0 && <span className="text-rose-700"> · thiếu {s.missingTrials}/{s.expectedConfigurationCount} cấu hình {s.assignmentConstrained ? "đề giáo viên" : "độc lập"}</span>}
                {s.unexpectedTrialCount > 0 && <span className="text-rose-700"> · {s.unexpectedTrialCount} dòng sai cấu hình đề</span>}
                {s.duplicateTrialCount > 0 && <span className="text-amber-700"> · {s.duplicateTrialCount} dòng trùng không tính độ phủ</span>}
              </p>
            </div>
          ))}
        </section>

        {/* ===== III. Bảng điểm ===== */}
        <section className="space-y-1.5 break-inside-avoid">
          <h2 className="text-xs font-black uppercase text-[#321E12] border-l-[3px] border-[#C85A17] pl-2">III. Kết quả chấm điểm</h2>
          <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[440px] print:min-w-0 text-[10px] border-collapse">
            <thead>
              <tr className="bg-[#FAF6F0] font-black text-[#321E12]">
                <th className="border border-[#C9C2B6] p-1.5 text-left">Mẫu</th>
                <th className="border border-[#C9C2B6] p-1.5">Số liệu (70%)</th>
                <th className="border border-[#C9C2B6] p-1.5">Trình tự (20%)</th>
                <th className="border border-[#C9C2B6] p-1.5">Sai số (10%)</th>
                <th className="border border-[#C9C2B6] p-1.5">Điểm mẫu</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-[#321E12] text-center">
              {effectiveGrade.samples.map((s) => (
                <tr key={s.labKind}>
                  <td className="border border-[#C9C2B6] p-1.5 text-left font-black">{s.label}</td>
                  <td className="border border-[#C9C2B6] p-1.5">{s.dataScore}/10</td>
                  <td className="border border-[#C9C2B6] p-1.5">{s.sequenceScore}/10</td>
                  <td className="border border-[#C9C2B6] p-1.5">{s.errorScore}/10</td>
                  <td className="border border-[#C9C2B6] p-1.5 font-black">{s.experimentScore.toFixed(1)}/10</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap bg-[#FFF7EF] border border-[#C85A17]/30 rounded-xl p-3 mt-2 print:rounded-none">
            <div className="text-[11px] font-bold text-[#605248]">
              Điểm thí nghiệm: <b className="text-[#321E12]">{effectiveGrade.experimentScore.toFixed(1)}/10</b>
              {effectiveGrade.hasGraph && effectiveGrade.graphScore != null && (
                <> · Điểm đồ thị: <b className="text-[#321E12]">{effectiveGrade.graphScore.toFixed(1)}/10</b> · Tổng = TN×70% + Đồ thị×30%</>
              )}
            </div>
            <div className="text-2xl font-black text-[#C85A17]">{effectiveGrade.totalScore.toFixed(1)}<span className="text-sm text-[#605248]">/10</span></div>
          </div>
        </section>

        {/* ===== IV. Nhận xét AI ===== */}
        <section className="space-y-1.5 break-inside-avoid">
          <h2 className="text-xs font-black uppercase text-[#321E12] border-l-[3px] border-[#C85A17] pl-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C85A17]" /> IV. Nhận xét &amp; kết luận (Trợ lý Phylab)
          </h2>
          <div className="bg-[#FAF9F6] border border-[#E2DFD8] rounded-xl p-4 text-xs text-[#321E12] font-semibold leading-relaxed whitespace-pre-line min-h-[60px] print:rounded-none">
            {aiLoading ? "Trợ lý đang viết nhận xét…" : <MathText text={comment || "Chưa có nhận xét."} />}
          </div>
        </section>

        {/* ===== Chữ ký ===== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 break-inside-avoid print:grid-cols-2">
          <div className="text-center text-[11px] font-bold text-[#321E12]">
            <p className="font-black uppercase">Học sinh thực hiện</p>
            <p className="text-[9px] text-[#605248] italic">(Ký và ghi rõ họ tên)</p>
            <p className="mt-14 font-black">{studentName?.split(" (")[0] || ""}</p>
          </div>
          <div className="text-center text-[11px] font-bold text-[#321E12]">
            <p className="font-black uppercase">Giáo viên hướng dẫn</p>
            <p className="text-[9px] text-[#605248] italic">(Ký và ghi rõ họ tên)</p>
          </div>
        </section>

        <footer className="hidden print:block text-center text-[9px] font-bold text-[#605248] border-t border-[#E2DFD8] pt-2">
          Báo cáo xuất từ Phylab — phòng thí nghiệm vật lí ảo · điểm số chấm tự động (deterministic), nhận xét bởi Trợ lý Phylab.
        </footer>
      </article>
    </div>
  );
}

function ReviewTab({
  lessonId,
  lessonTitle,
  assistantSettings,
}: {
  lessonId: string;
  lessonTitle?: string;
  assistantSettings?: { pronoun?: "anh" | "chị"; answerStyle?: "short" | "detailed" };
}) {
  const review = getReview(lessonId);
  if (!review) {
    return <div className="bg-white border border-[#E2DFD8] rounded-2xl p-8 text-center text-xs font-bold text-[#605248]">Chưa có bộ ôn tập cho bài này.</div>;
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      <div className="lg:col-span-2 space-y-6">
        <FlashcardDeck cards={review.flashcards} />
        <QuizRunner quizzes={review.quizzes} />
      </div>
      <div className="lg:col-span-1">
        <AiChat lessonTitle={lessonTitle} assistantSettings={assistantSettings} />
      </div>
    </div>
  );
}

function FlashcardDeck({ cards }: { cards: ReturnType<typeof getReview> extends null ? never : NonNullable<ReturnType<typeof getReview>>["flashcards"] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const c = cards[idx];
  const go = (d: number) => { setIdx((i) => (i + d + cards.length) % cards.length); setFlipped(false); };
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase text-[#C85A17]">Flashcard</h3>
        <span className="text-[10px] font-black text-[#605248]">{idx + 1}/{cards.length}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => go(-1)} className="w-9 h-9 rounded-full bg-white border border-[#E2DFD8] grid place-items-center hover:bg-[#FFF0E0] cursor-pointer flex-shrink-0">
          <ChevronLeft className="w-4 h-4 text-[#605248]" />
        </button>
        <button
          onClick={() => setFlipped((f) => !f)}
          className="flex-1 min-h-[150px] rounded-2xl border border-[#E2DFD8] bg-white hover:border-[#C85A17]/40 p-5 transition-all cursor-pointer flex flex-col justify-center items-center text-center"
        >
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded self-center mb-2 ${c.category === "experiment" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>
            {c.category === "experiment" ? "Tư duy thí nghiệm" : "Lý thuyết"}
          </span>
          <p className="text-sm font-black text-[#321E12] leading-snug"><MathText text={flipped ? c.back : c.front} /></p>
          <span className="text-[9px] text-[#605248]/50 font-black mt-3">{flipped ? "↩ bấm xem mặt trước" : "bấm để lật xem đáp án"}</span>
        </button>
        <button onClick={() => go(1)} className="w-9 h-9 rounded-full bg-white border border-[#E2DFD8] grid place-items-center hover:bg-[#FFF0E0] cursor-pointer flex-shrink-0">
          <ChevronRight className="w-4 h-4 text-[#605248]" />
        </button>
      </div>
    </div>
  );
}

function QuizRunner({ quizzes }: { quizzes: NonNullable<ReturnType<typeof getReview>>["quizzes"] }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(() => quizzes.map(() => null));
  const [done, setDone] = useState(false);

  const q = quizzes[idx];
  const revealed = selected !== null;

  const choose = (oi: number) => {
    if (revealed) return;
    setSelected(oi);
    setAnswers((a) => { const c = [...a]; c[idx] = oi; return c; });
  };
  const next = () => {
    if (idx + 1 >= quizzes.length) { setDone(true); return; }
    setIdx((i) => i + 1);
    setSelected(answers[idx + 1] ?? null);
  };
  const restart = () => { setIdx(0); setSelected(null); setAnswers(quizzes.map(() => null)); setDone(false); };

  if (done) {
    const correct = quizzes.filter((qq, i) => answers[i] === qq.answer).length;
    const expTotal = quizzes.filter((qq) => qq.category === "experiment").length;
    const expCorrect = quizzes.filter((qq, i) => qq.category === "experiment" && answers[i] === qq.answer).length;
    const thTotal = quizzes.filter((qq) => qq.category === "theory").length;
    const thCorrect = quizzes.filter((qq, i) => qq.category === "theory" && answers[i] === qq.answer).length;
    const expRate = expTotal ? expCorrect / expTotal : 0, thRate = thTotal ? thCorrect / thTotal : 0;
    const assessment = expRate >= 0.8 && thRate >= 0.8
      ? "Em vững cả tư duy thí nghiệm lẫn lý thuyết. Xuất sắc!"
      : expRate < thRate ? "Em nắm lý thuyết tốt hơn thao tác/tư duy thí nghiệm — hãy luyện thêm phần quy trình đo."
      : thRate < expRate ? "Em thao tác thí nghiệm tốt nhưng phần lý thuyết còn yếu — ôn lại công thức và định nghĩa."
      : "Em cần củng cố đều cả thí nghiệm lẫn lý thuyết.";
    return (
      <div>
        <h3 className="text-xs font-black uppercase text-[#C85A17] mb-2">Trắc nghiệm — Kết quả</h3>
        <div className="bg-[#FFF7EF] border border-[#C85A17]/25 rounded-2xl p-4">
          <p className="text-lg font-black text-[#321E12]">{correct}/{quizzes.length} câu đúng</p>
          <p className="text-[11px] font-bold text-[#605248] mt-1">Thí nghiệm: {expCorrect}/{expTotal} · Lý thuyết: {thCorrect}/{thTotal}</p>
          <p className="text-[11px] font-bold text-[#C85A17] mt-1.5 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {assessment}</p>
          <button onClick={restart} className="mt-3 px-4 py-2 bg-white border border-[#E2DFD8] text-[#605248] text-[10px] font-black rounded-lg hover:bg-[#FFF0E0] flex items-center gap-1 cursor-pointer">
            <RotateCcw className="w-3 h-3" /> Làm lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase text-[#C85A17]">Trắc nghiệm</h3>
        <span className="text-[10px] font-black text-[#605248]">Câu {idx + 1}/{quizzes.length}</span>
      </div>
      <div className="bg-white border border-[#E2DFD8] rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${q.category === "experiment" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>
            {q.category === "experiment" ? "Thí nghiệm" : "Lý thuyết"}
          </span>
          <p className="text-xs font-black text-[#321E12] leading-snug"><MathText text={q.q} /></p>
        </div>
        <div className="grid grid-cols-1 gap-1.5 mt-3">
          {q.options.map((opt, oi) => {
            const isRight = q.answer === oi;
            const chosen = selected === oi;
            let cls = "border-[#E2DFD8] bg-white hover:border-[#C85A17]/40";
            if (revealed) {
              if (isRight) cls = "border-emerald-400 bg-emerald-50";
              else if (chosen) cls = "border-rose-400 bg-rose-50";
              else cls = "border-[#E2DFD8] bg-white opacity-60";
            }
            return (
              <button key={oi} disabled={revealed} onClick={() => choose(oi)}
                className={`text-left text-[11px] font-bold text-[#321E12] px-3 py-2 rounded-lg border transition-all cursor-pointer ${cls}`}>
                <MathText text={opt} />
              </button>
            );
          })}
        </div>
        {revealed && (
          <div className="mt-3 space-y-2">
            <p className={`text-[11px] font-black ${selected === q.answer ? "text-emerald-600" : "text-rose-600"}`}>
              {selected === q.answer ? "✓ Chính xác!" : "✗ Chưa đúng."}
            </p>
            <p className="text-[10px] font-bold text-[#605248]"><b>Giải thích:</b> <MathText text={q.explain} /></p>
            <button onClick={next} className="px-4 py-2 bg-[#C85A17] text-white text-[11px] font-black rounded-lg cursor-pointer">
              {idx + 1 >= quizzes.length ? "Xem kết quả" : "Câu tiếp →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ helpers ============================ */

function buildGradeSummary(g: LessonGrade, title: string): string {
  const lines = [`Bài: ${title}`, `Điểm tổng: ${g.totalScore.toFixed(1)}/10`, `Điểm thí nghiệm: ${g.experimentScore.toFixed(1)}/10`, `Độ phủ đúng cấu hình đề: ${g.assignmentCoveragePercent}%`];
  g.samples.forEach((s) => {
    lines.push(
      `- ${s.label}: ${s.rowCount} dòng / ${s.uniqueConfigurationCount} cấu hình độc lập, TB=${s.meanResult.toFixed(3)}${s.unit}, ` +
      `Số liệu ${s.dataScore}/10 (sát ${s.dataCloseness}%), Trình tự ${s.sequenceScore}/10 ` +
      `(${s.badSetupCount} lần chưa cân bằng), Sai số ${s.errorScore}/10 (sát lý thuyết ${s.physicalCloseness}%), ` +
      `${s.duplicateTrialCount} dòng trùng, ${s.unexpectedTrialCount} dòng sai cấu hình đề.`
    );
  });
  return lines.join("\n");
}
