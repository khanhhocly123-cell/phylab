"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Table, LineChart as LineChartIcon, FileText, GraduationCap,
  Save, CheckCircle2, AlertTriangle, Sparkles, Printer, RotateCcw, Info,
} from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ExperimentReport, RichTrial } from "@/lib/types";
import { EXPERIMENT_SPECS } from "@/experiments/specs";
import { MathText } from "./Latex";
import { getReview } from "@/data/quizBank";
import { correctResultOf, LabKind } from "@/lib/grading";
import GraphPlotter, { DataPoint } from "./notes/GraphPlotter";

/*
 * Sổ Báo Cáo — nơi nhận số liệu từ Phòng Lab: bảng số liệu (HS tự tính kết quả),
 * tự vẽ đồ thị, lập báo cáo in được và ôn tập.
 * Phần CHẤM ĐIỂM + nhận xét AI + chatbot đang tạm gỡ khỏi giao diện học sinh để làm lại
 * (logic chấm vẫn nằm ở src/lib/grading.ts, server vẫn tính điểm bài nộp cho giáo viên).
 */

interface LabData {
  lessonId: string;
  trials: RichTrial[];
}

interface NoteSectionProps {
  reports: ExperimentReport[];
  labData?: LabData | null;
  studentName?: string;
  /** Bài đang có số liệu mới thuộc một bài Lab giáo viên giao → lưu báo cáo sẽ nộp luôn. */
  hasAssignment?: boolean;
  onReportSaved?: (report: ExperimentReport) => void;
}

type TabKey = "data" | "graph" | "report" | "review";

const LAB_META: Record<LabKind, { title: string; formula: string; sLabel: string; tLabel: string; unit: string; resultLabel: string }> = {
  average: { title: "Mẫu 1 — Vận tốc trung bình", formula: "v = \\dfrac{s_{EF}}{t}", sLabel: "sEF (m)", tLabel: "t (s)", unit: "m/s", resultLabel: "v" },
  instant: { title: "Mẫu 2 — Vận tốc tức thời", formula: "v = \\dfrac{d}{t}", sLabel: "d (m)", tLabel: "t (s)", unit: "m/s", resultLabel: "v" },
  freefall: { title: "Số liệu — Gia tốc rơi tự do", formula: "g = \\dfrac{2s}{t^2}", sLabel: "s (m)", tLabel: "t (s)", unit: "m/s²", resultLabel: "g" },
  "ohm-x": { title: "Mẫu X — Điện trở theo định luật Ohm", formula: "R_X = \\dfrac{U}{I}", sLabel: "U (V)", tLabel: "I (A)", unit: "Ω", resultLabel: "R" },
  "ohm-y": { title: "Mẫu Y — Điện trở theo định luật Ohm", formula: "R_Y = \\dfrac{U}{I}", sLabel: "U (V)", tLabel: "I (A)", unit: "Ω", resultLabel: "R" },
  emf: { title: "Số liệu — Suất điện động pin", formula: "U = \\mathcal{E} - Ir", sLabel: "I (A)", tLabel: "U (V)", unit: "V", resultLabel: "E" },
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

const decimalsOf = (lab: LabKind) => (lab === "freefall" ? 2 : lab === "ohm-x" || lab === "ohm-y" ? 1 : 3);

/** Trung bình kết quả; Bài 26 tách theo từng pin (trộn pin mới với pin cũ là vô nghĩa). */
function meanGroups(lab: LabKind, rows: RichTrial[], results: Record<string, string>) {
  const entries = rows.map((row, i) => ({ row, value: parseResult(results[`${lab}-${i}`]) }));
  const groups = lab === "emf"
    ? (["new", "old"] as const).map((cell) => ({ label: cell === "new" ? "Pin mới" : "Pin cũ", items: entries.filter((e) => e.row.cell === cell) }))
    : [{ label: "", items: entries }];
  return groups
    .map((g) => {
      const values = g.items.map((e) => e.value).filter((v): v is number => v != null);
      return { label: g.label, count: values.length, mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null };
    })
    .filter((g) => g.mean != null) as Array<{ label: string; count: number; mean: number }>;
}
const parseResult = (raw: string | undefined) => {
  if (raw == null || raw.trim() === "") return null;
  const v = parseFloat(raw.replace(",", "."));
  return Number.isFinite(v) ? v : null;
};

export default function NoteSection({ reports, labData, studentName, hasAssignment, onReportSaved }: NoteSectionProps) {
  const lessonIds = Object.keys(EXPERIMENT_SPECS);
  const [activeLesson, setActiveLesson] = useState<string>(
    () => labData?.lessonId || reports[0]?.lessonId || lessonIds[0] || ""
  );
  const [tab, setTab] = useState<TabKey>("data");

  // Số liệu: ưu tiên dữ liệu mới lưu từ Lab; nếu không có, lấy từ báo cáo gần nhất; cuối cùng là số liệu mẫu.
  const activeReport = useMemo(
    () => reports.find((r) => r.lessonId === activeLesson) ?? null,
    [reports, activeLesson]
  );
  const isFreshData = !!labData && labData.lessonId === activeLesson && labData.trials.length > 0;
  const trials: RichTrial[] = useMemo(() => {
    if (labData && labData.lessonId === activeLesson && labData.trials.length) return labData.trials;
    if (activeReport?.trials?.length) return activeReport.trials;
    return DEMO_TRIALS[activeLesson] ?? [];
  }, [labData, activeLesson, activeReport]);
  const isDemo = !isFreshData && !activeReport?.trials?.length && trials.length > 0;

  const samples = useMemo(() => groupByLab(trials), [trials]);
  const spec = EXPERIMENT_SPECS[activeLesson];

  // Kết quả HS tự tính, keyed "lab-index" (điền sẵn theo công thức, HS sửa lại theo cách tính của mình).
  const [results, setResults] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
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
          next[`${lab}-${i}`] = Number.isFinite(value) ? String(Number(value).toFixed(decimalsOf(lab))) : "";
        });
      });
      return next;
    });
  }, [trials]);

  const flash = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2600);
  };

  const setResult = (lab: string, i: number, v: string) => {
    setResults((p) => ({ ...p, [`${lab}-${i}`]: v }));
    setSavedAt(null);
  };

  const changeLesson = (id: string) => {
    setActiveLesson(id);
    setResults({});
    setSavedAt(null);
    setTab("data");
  };

  const buildTrialsWithResults = (): RichTrial[] => {
    const out: RichTrial[] = [];
    (Object.keys(samples) as LabKind[]).forEach((lab) => {
      (samples[lab] || []).forEach((tr, i) => {
        out.push({ ...tr, lab, studentResult: parseResult(results[`${lab}-${i}`]) });
      });
    });
    return out;
  };

  const handleSave = () => {
    if (trials.length === 0 || isDemo) {
      flash("Chưa có số liệu của em — hãy đo ở Phòng Lab rồi lưu sang Sổ Báo Cáo.", false);
      return;
    }
    const richTrials = buildTrialsWithResults();
    const blank = richTrials.filter((t) => t.studentResult == null).length;
    if (blank && !window.confirm(`Còn ${blank} ô "Kết quả" để trống. Vẫn lưu báo cáo?`)) return;
    const date = new Date().toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const report: ExperimentReport = {
      id: `rep-${Date.now()}`,
      lessonId: activeLesson,
      title: spec?.title || activeLesson,
      shortTitle: spec?.shortTitle || "",
      date,
      attempt: reports.filter((r) => r.lessonId === activeLesson).length + 1,
      measures: richTrials.map((t) => ({ s: t.s, t: t.t })),
      trials: richTrials,
    };
    onReportSaved?.(report);
    setSavedAt(date);
    setTab("report");
  };

  return (
    <div className="w-full space-y-5">
      {/* Header + lesson selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2DFD8]/60 pb-3 print:hidden">
        <div>
          <h2 className="text-base md:text-lg font-black text-[#321E12] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#C85A17] stroke-[2.5]" />
            Sổ Báo Cáo
          </h2>
          <p className="text-[11px] font-bold text-[#605248] mt-0.5">Số liệu từ Phòng Lab → tự tính kết quả → vẽ đồ thị → lưu &amp; in báo cáo.</p>
        </div>
        <select
          value={activeLesson}
          onChange={(e) => changeLesson(e.target.value)}
          aria-label="Chọn bài thực hành"
          className="text-xs font-black text-[#321E12] bg-white border border-[#E2DFD8] rounded-lg px-3 py-1.5 outline-none cursor-pointer"
        >
          {lessonIds.map((id) => (
            <option key={id} value={id}>{EXPERIMENT_SPECS[id].book} — {EXPERIMENT_SPECS[id].shortTitle}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap print:hidden" role="tablist">
        {([
          ["data", "1. Số liệu", Table],
          ["graph", "2. Đồ thị", LineChartIcon],
          ["report", "3. Báo cáo", FileText],
          ["review", "Ôn tập", GraduationCap],
        ] as [TabKey, string, typeof Table][]).map(([key, label, Icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
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

      {isDemo && tab !== "review" && (
        <div className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-[11px] font-bold text-sky-900 print:hidden">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Đây là <b>số liệu mẫu</b> để em xem cách trình bày. Vào Phòng Lab, đo xong bấm “Lưu vào Sổ Báo Cáo” để có số liệu của chính em.</span>
        </div>
      )}

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
                />
              ))}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-[#E2DFD8] rounded-2xl p-4">
                <p className="text-[11px] font-bold text-[#605248] max-w-lg leading-relaxed">
                  Cột <b>Kết quả</b> được điền sẵn theo công thức — em kiểm tra lại, sửa theo cách tính của mình,
                  rồi sang <b>Đồ thị</b> và <b>lưu báo cáo</b>.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setTab("graph")}
                    className="px-4 py-2.5 bg-white border border-[#E2DFD8] text-[#321E12] text-xs font-black rounded-xl hover:border-[#C85A17]/40 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <LineChartIcon className="w-4 h-4" /> Vẽ đồ thị
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isDemo}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#DF742E] to-[#B24A0C] text-white text-xs font-black rounded-xl shadow-sm hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    <Save className="w-4 h-4" /> {hasAssignment ? "Lưu & nộp cho giáo viên" : "Lưu báo cáo"}
                  </button>
                </div>
              </div>
              {savedAt && (
                <p className="text-[11px] font-black text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Đã lưu báo cáo lúc {savedAt}.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ---------- TAB: ĐỒ THỊ ---------- */}
      {/* Luôn mount (chỉ ẩn/hiện) để không mất các điểm HS đã vẽ khi chuyển tab. */}
      <div className={tab === "graph" ? "" : "hidden"}>
        <GraphTab key={activeLesson} lessonId={activeLesson} trials={trials} />
      </div>

      {/* ---------- TAB: BÁO CÁO ---------- */}
      {tab === "report" && (
        <ReportTab
          spec={spec}
          studentName={studentName}
          samples={samples}
          results={results}
          report={activeReport}
          savedAt={savedAt}
          canSave={!isDemo && trials.length > 0}
          hasAssignment={hasAssignment}
          onSave={handleSave}
        />
      )}

      {/* ---------- TAB: ÔN TẬP ---------- */}
      {tab === "review" && <ReviewTab lessonId={activeLesson} />}

      {toast && (
        <div className={`fixed bottom-24 lg:bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-black flex items-center gap-2 animate-scale-up print:hidden ${
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
      <h3 className="text-sm font-black text-[#321E12]">Chưa có số liệu</h3>
      <p className="text-xs font-bold mt-2">
        Vào <b>Phòng Lab</b>, đo các cấu hình trong nhiệm vụ rồi bấm <b>“Lưu vào Sổ Báo Cáo”</b>.
      </p>
    </div>
  );
}

function SampleTable({
  lab, rows, results, onChange,
}: {
  lab: LabKind;
  rows: RichTrial[];
  results: Record<string, string>;
  onChange: (i: number, v: string) => void;
}) {
  const meta = LAB_META[lab];
  const showTheta = lab === "average" || lab === "instant";
  const displayFirst = (r: RichTrial) => lab === "emf" ? (r.current ?? 0) : (r.voltage ?? r.s);
  const displaySecond = (r: RichTrial) => lab === "emf" ? (r.voltage ?? 0) : (r.current ?? r.t);
  const values = rows.map((_, i) => parseResult(results[`${lab}-${i}`])).filter((v): v is number => v != null);
  const means = meanGroups(lab, rows, results);
  return (
    <div className="bg-white rounded-2xl border border-[#E2DFD8] p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <h3 className="text-xs font-black uppercase text-[#C85A17]">{meta.title}</h3>
        <span className="text-[10px] font-bold text-[#605248]">
          Công thức: <MathText text={`$${meta.formula}$`} />
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#E2DFD8]">
        <table className="w-full min-w-[420px] text-left text-[11px]">
          <thead>
            <tr className="bg-[#FAF6F0] border-b border-[#E2DFD8] font-black text-[#321E12]">
              <th className="p-2 text-center w-8">#</th>
              <th className="p-2 text-center">{meta.sLabel}</th>
              <th className="p-2 text-center">{meta.tLabel}</th>
              {showTheta && <th className="p-2 text-center">θ</th>}
              <th className="p-2 text-center">Điều kiện</th>
              <th className="p-2 text-center w-32">Kết quả {meta.resultLabel} ({meta.unit})</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-[#E2DFD8]/60 font-semibold text-[#605248]">
                <td className="p-2 text-center text-[#605248]/40 font-black">{i + 1}</td>
                <td className="p-2 text-center font-mono">{displayFirst(r).toFixed(lab === "emf" ? 4 : 3)}</td>
                <td className="p-2 text-center font-mono">{displaySecond(r).toFixed(lab === "emf" ? 3 : 4)}</td>
                {showTheta && <td className="p-2 text-center">{r.theta ?? "—"}°</td>}
                <td className="p-2 text-center">
                  {lab === "emf"
                    ? <span className="text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-black">{r.cell === "old" ? "Pin cũ" : r.cell === "new" ? "Pin mới" : "Pin"} · R={r.config ?? r.resistance ?? 0} Ω</span>
                    : r.balanced === false
                      ? <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black">Chưa cân bằng</span>
                      : r.steady === false
                        ? <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black" title="Thả khi máng/trụ còn rung — số đo dễ lệch">Thả khi còn rung</span>
                        : <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-black">Cân bằng</span>}
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={results[`${lab}-${i}`] ?? ""}
                    onChange={(e) => onChange(i, e.target.value)}
                    placeholder="tự tính…"
                    aria-label={`Kết quả lần đo ${i + 1}`}
                    className="w-full px-1.5 py-1 border border-[#E2DFD8] focus:border-[#C85A17] outline-none rounded-md bg-white font-bold text-center text-[#321E12] text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {means.length > 0 && (
        <p className="text-[11px] font-bold text-[#605248] mt-2">
          Giá trị trung bình:{" "}
          {means.map((g, i) => (
            <span key={g.label || i}>
              {i > 0 && " · "}
              <b className="text-[#321E12]">{g.label ? `${g.label}: ` : ""}{meta.resultLabel}<sub>tb</sub> = {g.mean.toFixed(decimalsOf(lab) + 1)} {meta.unit}</b>
            </span>
          ))}
          <span className="text-[#605248]/70"> (từ {values.length}/{rows.length} kết quả)</span>
        </p>
      )}
    </div>
  );
}

function GraphTab({ lessonId, trials }: { lessonId: string; trials: RichTrial[] }) {
  const isFreeFall = lessonId === "do-gia-toc-roi-tu-do";
  const isOhm = lessonId === "do-dien-tro-dinh-luat-ohm";
  const isEmf = lessonId === "do-suat-dien-dong-pin-dien-hoa";

  // Điểm số liệu để HS tự vẽ lại.
  let data: DataPoint[] = [];
  let xLabel = "", yLabel = "", relation = "";
  if (isOhm) {
    // Đặc tuyến I-U của vật dẫn X (Y vẫn có trong bảng/báo cáo).
    data = trials.filter((t) => t.lab === "ohm-x" && (t.current ?? t.t) > 0)
      .map((t) => ({ x: +(t.voltage ?? t.s).toFixed(2), y: +(t.current ?? t.t).toFixed(5) }))
      .sort((a, b) => a.x - b.x);
    xLabel = "U (V) — vật dẫn X"; yLabel = "I (A)"; relation = "$I = U/R_X$";
  } else if (isEmf) {
    // U = E - Ir: tung độ gốc là E, độ lớn hệ số góc là r.
    const emfTrials = trials.some((t) => t.lab === "emf" && t.cell === "new")
      ? trials.filter((t) => t.lab === "emf" && t.cell === "new")
      : trials.filter((t) => t.lab === "emf");
    data = emfTrials.filter((t) => (t.current ?? 0) > 0 && (t.voltage ?? 0) > 0)
      .map((t) => ({ x: +(t.current ?? 0).toFixed(5), y: +(t.voltage ?? 0).toFixed(4) }))
      .sort((a, b) => a.x - b.x);
    xLabel = "I (A) — pin mới"; yLabel = "U (V)"; relation = "$U = \\mathcal{E} - Ir$";
  } else if (isFreeFall) {
    // s theo t² (độ dốc = g/2, đường thẳng qua gốc).
    data = trials.filter((t) => t.lab === "freefall" && t.t > 0)
      .map((t) => ({ x: +(t.t * t.t).toFixed(4), y: +t.s.toFixed(3) }));
    xLabel = "t² (s²)"; yLabel = "s (m)"; relation = "$s = \\tfrac{1}{2}g\\,t^2$";
  } else {
    // Bài 6: v = s/t theo s.
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
        Bấm lên lưới để đặt từng điểm theo bảng số liệu, rồi bấm “Đối chiếu” để hiện điểm số liệu thật và đường
        khớp qua các điểm em vẽ. Quan hệ lý thuyết: <MathText text={relation} />.
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
        <GraphPlotter data={data} xLabel={xLabel} yLabel={yLabel} />
      ) : (
        <div className="text-center py-10 text-[#605248]/60 text-xs font-bold">
          Cần ít nhất 2 lần đo (lưu từ Phòng Lab) để vẽ đồ thị.
        </div>
      )}
    </div>
  );
}

function ReportTab({
  spec, studentName, samples, results, report, savedAt, canSave, hasAssignment, onSave,
}: {
  spec: (typeof EXPERIMENT_SPECS)[string] | undefined;
  studentName?: string;
  samples: Partial<Record<LabKind, RichTrial[]>>;
  results: Record<string, string>;
  report: ExperimentReport | null;
  savedAt: string | null;
  canSave: boolean;
  hasAssignment?: boolean;
  onSave: () => void;
}) {
  const labs = Object.keys(samples) as LabKind[];
  if (!labs.length) {
    return (
      <div className="bg-white border border-[#E2DFD8] rounded-3xl p-10 text-center text-[#605248]">
        <FileText className="w-10 h-10 mx-auto mb-3 text-[#605248]/40" />
        <p className="text-xs font-bold">Chưa có số liệu để lập báo cáo. Hãy đo ở <b>Phòng Lab</b> trước.</p>
      </div>
    );
  }

  const today = savedAt || report?.date || new Date().toLocaleDateString("vi-VN");
  const isGrade11 = spec?.id === "do-dien-tro-dinh-luat-ohm" || spec?.id === "do-suat-dien-dong-pin-dien-hoa";

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2 flex-wrap print:hidden">
        {canSave && !savedAt && (
          <button
            onClick={onSave}
            className="px-4 py-2 bg-white border border-[#C85A17]/40 text-[#B24A0C] text-xs font-black rounded-lg hover:bg-[#FFF0E0] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" /> {hasAssignment ? "Lưu & nộp cho giáo viên" : "Lưu báo cáo"}
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gradient-to-r from-[#DF742E] to-[#B24A0C] text-white text-xs font-black rounded-lg hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Printer className="w-4 h-4" /> Xuất PDF (In báo cáo)
        </button>
      </div>

      <article id="phylab-report" className="bg-white rounded-3xl border border-[#E2DFD8] shadow-sm p-6 md:p-10 space-y-6 print:rounded-none print:border-0 print:shadow-none print:p-0">
        {/* ===== Đầu trang kiểu báo cáo trường học ===== */}
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
          <p>Lần lập báo cáo: <b>{report?.attempt ?? 1}</b></p>
        </section>

        {/* ===== I. Mục đích ===== */}
        <section className="space-y-1.5">
          <h2 className="text-xs font-black uppercase text-[#321E12] border-l-[3px] border-[#C85A17] pl-2">I. Mục đích thí nghiệm</h2>
          <p className="text-[11px] font-semibold text-[#605248] leading-relaxed"><MathText text={spec?.theory.objective || ""} /></p>
        </section>

        {/* ===== II. Bảng số liệu & kết quả từng mẫu ===== */}
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase text-[#321E12] border-l-[3px] border-[#C85A17] pl-2">II. Số liệu đo &amp; kết quả tính</h2>
          {labs.map((lab) => {
            const meta = LAB_META[lab];
            const rows = samples[lab] || [];
            const values = rows.map((_, i) => parseResult(results[`${lab}-${i}`]));
            const means = meanGroups(lab, rows, results);
            const showTheta = lab === "average" || lab === "instant";
            return (
              <div key={lab} className="space-y-1.5 break-inside-avoid">
                <h3 className="text-[11px] font-black text-[#C85A17] uppercase">{meta.title} <span className="text-[#605248] normal-case">— công thức <MathText text={`$${meta.formula}$`} /></span></h3>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full min-w-[420px] print:min-w-0 text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-[#FAF6F0] font-black text-[#321E12]">
                        <th className="border border-[#C9C2B6] p-1.5 w-8">Lần</th>
                        <th className="border border-[#C9C2B6] p-1.5">{meta.sLabel}</th>
                        <th className="border border-[#C9C2B6] p-1.5">{meta.tLabel}</th>
                        {showTheta && <th className="border border-[#C9C2B6] p-1.5">θ (°)</th>}
                        <th className="border border-[#C9C2B6] p-1.5">{meta.resultLabel} ({meta.unit})</th>
                      </tr>
                    </thead>
                    <tbody className="font-semibold text-[#321E12] text-center">
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td className="border border-[#C9C2B6] p-1.5 font-black">{i + 1}</td>
                          <td className="border border-[#C9C2B6] p-1.5 font-mono">{(lab === "emf" ? (r.current ?? 0) : (r.voltage ?? r.s)).toFixed(lab === "emf" ? 4 : 3)}</td>
                          <td className="border border-[#C9C2B6] p-1.5 font-mono">{(lab === "emf" ? (r.voltage ?? 0) : (r.current ?? r.t)).toFixed(lab === "emf" ? 3 : 4)}</td>
                          {showTheta && <td className="border border-[#C9C2B6] p-1.5">{r.theta ?? "—"}</td>}
                          <td className="border border-[#C9C2B6] p-1.5 font-mono">{values[i] != null ? values[i]!.toFixed(decimalsOf(lab)) : "(bỏ trống)"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {means.length > 0 && (
                  <p className="text-[10px] font-bold text-[#605248]">
                    Giá trị trung bình:{" "}
                    {means.map((g, i) => (
                      <span key={g.label || i}>
                        {i > 0 && " · "}
                        <b className="text-[#321E12]">{g.label ? `${g.label}: ` : ""}{meta.resultLabel}<sub>tb</sub> = {g.mean.toFixed(decimalsOf(lab) + 1)} {meta.unit}</b>
                      </span>
                    ))}
                    {rows.some((r) => r.balanced === false) && <span className="text-amber-700"> · có lần đo khi chưa cân bằng</span>}
                    {rows.some((r) => r.steady === false) && <span className="text-amber-700"> · có lần thả khi còn rung</span>}
                  </p>
                )}
              </div>
            );
          })}
        </section>

        {/* ===== III. Nhận xét ===== */}
        <section className="space-y-1.5 break-inside-avoid">
          <h2 className="text-xs font-black uppercase text-[#321E12] border-l-[3px] border-[#C85A17] pl-2">III. Nhận xét &amp; kết luận</h2>
          <div className="border border-dashed border-[#C9C2B6] rounded-xl p-4 min-h-[90px] text-[10px] font-bold text-[#605248]/60 italic print:rounded-none">
            (Học sinh tự viết nhận xét về kết quả, nguyên nhân sai số và cách khắc phục.)
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
          Báo cáo xuất từ Phylab — phòng thí nghiệm vật lí ảo.
        </footer>
      </article>
    </div>
  );
}

function ReviewTab({ lessonId }: { lessonId: string }) {
  const review = getReview(lessonId);
  if (!review) {
    return <div className="bg-white border border-[#E2DFD8] rounded-2xl p-8 text-center text-xs font-bold text-[#605248]">Chưa có bộ ôn tập cho bài này.</div>;
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <FlashcardDeck cards={review.flashcards} />
      <QuizRunner quizzes={review.quizzes} />
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
        <button onClick={() => go(-1)} aria-label="Thẻ trước" className="w-9 h-9 rounded-full bg-white border border-[#E2DFD8] grid place-items-center hover:bg-[#FFF0E0] cursor-pointer flex-shrink-0">
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
        <button onClick={() => go(1)} aria-label="Thẻ sau" className="w-9 h-9 rounded-full bg-white border border-[#E2DFD8] grid place-items-center hover:bg-[#FFF0E0] cursor-pointer flex-shrink-0">
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
        <h3 className="text-xs font-black uppercase text-[#C85A17]">Trắc nghiệm tự kiểm tra</h3>
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
