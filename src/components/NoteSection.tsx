"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, BookOpenCheck, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, FileText, FlaskConical, GraduationCap,
  Info, LineChart as LineChartIcon, NotebookPen, Printer, RotateCcw, Save, Sparkles, Table,
} from "lucide-react";
import { ExperimentReport, RichTrial } from "@/lib/types";
import { EXPERIMENT_SPECS } from "@/experiments/specs";
import { MathText } from "./Latex";
import { getReview } from "@/data/quizBank";
import { correctResultOf, LabKind } from "@/lib/grading";
import NotebookGraph from "./notes/NotebookGraph";
import { buildChart, columnsFor, fmt, G_REF, stats, type ChartSpec } from "./notes/notebookData";
import { OPEN_LABS, groupLabs, type LabEntry } from "@/data/labCatalog";

/*
 * Sổ Báo Cáo — nơi nhận số liệu từ Phòng Lab.
 * "Sổ tay": số liệu (bảng gọn + kết quả nổi bật + độ chụm của các lần đo) nằm CẠNH đồ thị
 * (máy vẽ sẵn hoặc em tự chấm điểm, tự kẻ đường) — không phải cuộn qua lại.
 * "Báo cáo": bản in có cả đồ thị, kết quả và nhận xét. "Ôn tập": flashcard + trắc nghiệm.
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

type View = "book" | "report" | "review";

const LAB_META: Record<LabKind, { title: string; formula: string; unit: string; resultLabel: string; perRow: boolean }> = {
  average: { title: "Tốc độ trung bình trên đoạn EF", formula: "v_{tb} = \\dfrac{s_{EF}}{t}", unit: "m/s", resultLabel: "v", perRow: true },
  instant: { title: "Tốc độ tức thời tại cổng E", formula: "v = \\dfrac{d}{t}", unit: "m/s", resultLabel: "v", perRow: true },
  freefall: { title: "Gia tốc rơi tự do", formula: "g = \\dfrac{2s}{t^2}", unit: "m/s²", resultLabel: "g", perRow: true },
  "ohm-x": { title: "Vật dẫn X", formula: "R_X = \\dfrac{U}{I}", unit: "Ω", resultLabel: "R", perRow: true },
  "ohm-y": { title: "Vật dẫn Y", formula: "R_Y = \\dfrac{U}{I}", unit: "Ω", resultLabel: "R", perRow: true },
  emf: { title: "Pin điện hóa — U theo I", formula: "U = \\mathcal{E} - I\\,r", unit: "V", resultLabel: "E", perRow: false },
};


/* Số liệu mẫu (khớp vật lý của từng bàn Lab) để em xem cách trình bày khi chưa đo. */
const ohm = (lab: "ohm-x" | "ohm-y", u: number, i: number): RichTrial => ({ lab, s: u, t: i, voltage: u, current: i, material: lab === "ohm-x" ? "X" : "Y", balanced: true });
const cell = (c: "new" | "old", r: number, i: number, u: number): RichTrial => ({ lab: "emf", s: c === "new" ? 1.58 : 1.47, t: 1, voltage: u, current: i, resistance: r, cell: c, balanced: true });
const DEMO_TRIALS: Record<string, RichTrial[]> = {
  "do-toc-do-vat-chuyen-dong": [
    { lab: "average", s: 0.10, t: 0.0776, theta: 20, balanced: true },
    { lab: "average", s: 0.20, t: 0.1455, theta: 20, balanced: true },
    { lab: "average", s: 0.30, t: 0.2076, theta: 20, balanced: true },
    { lab: "average", s: 0.40, t: 0.2639, theta: 20, balanced: true },
    { lab: "average", s: 0.20, t: 0.1205, theta: 30, balanced: true },
    { lab: "average", s: 0.40, t: 0.2186, theta: 30, balanced: true },
    { lab: "instant", s: 0.0182, t: 0.0152, theta: 20, balanced: true },
    { lab: "instant", s: 0.0182, t: 0.0151, theta: 20, balanced: true },
    { lab: "instant", s: 0.0182, t: 0.0126, theta: 30, balanced: true },
  ],
  "do-gia-toc-roi-tu-do": [
    { lab: "freefall", s: 0.20, t: 0.2031, balanced: true },
    { lab: "freefall", s: 0.30, t: 0.2478, balanced: true },
    { lab: "freefall", s: 0.40, t: 0.2862, balanced: true },
    { lab: "freefall", s: 0.50, t: 0.3198, balanced: true },
    { lab: "freefall", s: 0.60, t: 0.3505, balanced: true },
  ],
  "do-dien-tro-dinh-luat-ohm": [
    ohm("ohm-x", 1.0, 0.0083), ohm("ohm-x", 2.0, 0.0167), ohm("ohm-x", 3.0, 0.0251), ohm("ohm-x", 4.0, 0.0333), ohm("ohm-x", 5.0, 0.0418), ohm("ohm-x", 6.0, 0.0501),
    ohm("ohm-y", 2.0, 0.0091), ohm("ohm-y", 4.0, 0.0182), ohm("ohm-y", 6.0, 0.0273), ohm("ohm-y", 8.0, 0.0364), ohm("ohm-y", 10.0, 0.0453),
  ],
  "do-suat-dien-dong-pin-dien-hoa": [
    cell("new", 10, 0.06752, 1.4855), cell("new", 25, 0.04115, 1.5224), cell("new", 40, 0.02959, 1.5386), cell("new", 60, 0.02153, 1.5499), cell("new", 80, 0.01692, 1.5563),
    cell("old", 10, 0.05742, 1.2633), cell("old", 25, 0.03621, 1.3397), cell("old", 40, 0.02644, 1.3748), cell("old", 60, 0.01944, 1.4000), cell("old", 80, 0.01538, 1.4146),
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
const parseResult = (raw: string | undefined) => {
  if (raw == null || raw.trim() === "") return null;
  const v = parseFloat(raw.replace(",", "."));
  return Number.isFinite(v) ? v : null;
};
/** Kết quả theo công thức của một lần đo (điền sẵn để em kiểm tra/sửa). */
function formulaResult(lab: LabKind, tr: RichTrial): number | null {
  if (lab === "emf") return null;
  if (lab === "ohm-x" || lab === "ohm-y") {
    const i = tr.current ?? tr.t;
    return i > 0 ? (tr.voltage ?? tr.s) / i : null;
  }
  const v = correctResultOf(lab, tr.s, tr.t);
  return Number.isFinite(v) ? v : null;
}

export default function NoteSection({ reports, labData, studentName, hasAssignment, onReportSaved }: NoteSectionProps) {
  // Bài có trong Sổ = bài đang mở trong danh mục chung và có đặc tả (lý thuyết, dụng cụ) để lập báo cáo.
  const lessonOptions = useMemo(() => OPEN_LABS.filter((l) => EXPERIMENT_SPECS[l.id]), []);
  const lessonIds = lessonOptions.map((l) => l.id);
  const [activeLesson, setActiveLesson] = useState<string>(() => labData?.lessonId || reports[0]?.lessonId || lessonIds[0] || "");
  const [view, setView] = useState<View>("book");

  // Số liệu: ưu tiên dữ liệu mới lưu từ Lab; nếu không có, lấy từ báo cáo gần nhất; cuối cùng là số liệu mẫu.
  const activeReport = useMemo(() => reports.find((r) => r.lessonId === activeLesson) ?? null, [reports, activeLesson]);
  const isFreshData = !!labData && labData.lessonId === activeLesson && labData.trials.length > 0;
  const trials: RichTrial[] = useMemo(() => {
    if (labData && labData.lessonId === activeLesson && labData.trials.length) return labData.trials;
    if (activeReport?.trials?.length) return activeReport.trials;
    return DEMO_TRIALS[activeLesson] ?? [];
  }, [labData, activeLesson, activeReport]);
  const isDemo = !isFreshData && !activeReport?.trials?.length && trials.length > 0;
  const samples = useMemo(() => groupByLab(trials), [trials]);
  const chart = useMemo(() => buildChart(activeLesson, trials), [activeLesson, trials]);
  const spec = EXPERIMENT_SPECS[activeLesson];

  // Kết quả em tự tính, keyed "lab-index" (điền sẵn theo công thức, em sửa theo cách tính của mình).
  const [results, setResults] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmBlank, setConfirmBlank] = useState<number>(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!trials.length) return;
    const id = window.setTimeout(() => setResults((prev) => {
      if (Object.keys(prev).length) return prev;
      const next: Record<string, string> = {};
      const grouped = groupByLab(trials);
      (Object.keys(grouped) as LabKind[]).forEach((lab) => {
        (grouped[lab] || []).forEach((tr, i) => {
          const value = tr.studentResult ?? formulaResult(lab, tr);
          next[`${lab}-${i}`] = value != null && Number.isFinite(value) ? String(Number(value).toFixed(decimalsOf(lab))) : "";
        });
      });
      return next;
    }), 0);
    return () => window.clearTimeout(id);
  }, [trials]);

  const flash = (msg: string, ok = true) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 2600);
  };
  const setResult = (lab: string, i: number, v: string) => {
    setResults((p) => ({ ...p, [`${lab}-${i}`]: v }));
    setSavedAt(null);
  };
  const changeLesson = (id: string) => {
    setActiveLesson(id);
    setResults({});
    setSavedAt(null);
    setConfirmBlank(0);
    setNotes("");
    setView("book");
  };

  /** Bài 26: kết quả em "tìm được" cho mỗi lần đo là E đọc từ đồ thị của đúng pin đó. */
  const emfOf = (c: RichTrial["cell"]) => chart?.series.find((s) => s.id === `emf-${c}`)?.fit?.intercept ?? null;
  const buildTrialsWithResults = (): RichTrial[] => {
    const out: RichTrial[] = [];
    (Object.keys(samples) as LabKind[]).forEach((lab) => {
      (samples[lab] || []).forEach((tr, i) => {
        const studentResult = lab === "emf" ? emfOf(tr.cell) : parseResult(results[`${lab}-${i}`]);
        out.push({ ...tr, lab, studentResult });
      });
    });
    return out;
  };

  const doSave = () => {
    const richTrials = buildTrialsWithResults();
    const date = new Date().toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
    setConfirmBlank(0);
    flash(hasAssignment ? "Đã lưu và nộp báo cáo cho giáo viên." : "Đã lưu báo cáo.");
  };
  const handleSave = () => {
    if (trials.length === 0 || isDemo) {
      flash("Chưa có số liệu của em — hãy đo ở Phòng Lab rồi lưu sang Sổ Báo Cáo.", false);
      return;
    }
    const blank = buildTrialsWithResults().filter((t) => t.studentResult == null).length;
    if (blank && !confirmBlank) { setConfirmBlank(blank); return; }
    doSave();
  };

  const labs = Object.keys(samples) as LabKind[];
  const statusChip = isFreshData
    ? { text: `Số liệu của em · ${trials.length} lần đo`, cls: "bg-[#F1F8F0] text-[#2E7D32] border-[#2E7D32]/25" }
    : activeReport
      ? { text: `Báo cáo đã lưu · ${activeReport.date}`, cls: "bg-[#EEF4FC] text-[#1D5FAF] border-[#1D5FAF]/20" }
      : { text: "Số liệu mẫu", cls: "bg-sky-50 text-sky-800 border-sky-200" };

  return (
    <div className={`w-full flex flex-col gap-3 text-[#321E12] ${view === "book" ? "lg:h-[calc(100dvh-8rem)] lg:min-h-[540px]" : ""}`}>
      {/* ===== Đầu trang: bài + chế độ xem + lưu ===== */}
      <div className="flex items-center gap-2.5 flex-wrap print:hidden">
        <div className="flex items-center gap-2 mr-1">
          <span className="w-9 h-9 rounded-xl bg-[#FFF2E6] border border-[#F4D6BA] grid place-items-center"><NotebookPen className="w-4.5 h-4.5 text-[#C85A17]" /></span>
          <div>
            <h2 className="text-[17px] font-black leading-none">Sổ Báo Cáo</h2>
            <span className={`inline-block mt-1 text-[10.5px] font-black px-1.5 py-0.5 rounded-md border ${statusChip.cls}`}>{statusChip.text}</span>
          </div>
        </div>
        <LessonPicker value={activeLesson} options={lessonOptions} onChange={changeLesson}
          markOf={(id) => (labData?.lessonId === id && labData.trials.length > 0 ? "fresh" : reports.some((r) => r.lessonId === id) ? "saved" : null)} />
        <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
          <div data-tour="notes-views" className="flex-1 sm:flex-none flex items-center gap-1 rounded-2xl border border-[#E2DFD8] bg-white p-1">
            {([["book", "Sổ tay", Table], ["report", "Báo cáo", FileText], ["review", "Ôn tập", GraduationCap]] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setView(key)} role="tab" aria-selected={view === key}
                className={`flex-1 sm:flex-none justify-center whitespace-nowrap px-2.5 py-1.5 rounded-xl text-[12px] font-black flex items-center gap-1 cursor-pointer transition-all ${view === key ? "bg-[#321E12] text-white" : "text-[#605248] hover:bg-[#FBF6EC]"}`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
          {view !== "review" && (
            <button onClick={handleSave} disabled={isDemo || !trials.length} data-tour="notes-save"
              className="h-9 px-3 sm:px-3.5 rounded-xl bg-gradient-to-r from-[#DF742E] to-[#B24A0C] text-white text-[12px] font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-[0_6px_14px_rgba(200,90,23,.25)] disabled:opacity-40 disabled:cursor-not-allowed">
              {savedAt ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span className="sm:hidden">{savedAt ? "Đã lưu" : "Lưu"}</span>
              <span className="hidden sm:inline">{savedAt ? "Đã lưu" : hasAssignment ? "Lưu & nộp" : "Lưu báo cáo"}</span>
            </button>
          )}
        </div>
      </div>

      {confirmBlank > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-900 print:hidden">
          <AlertTriangle className="w-4 h-4" /> Còn {confirmBlank} ô kết quả để trống. Vẫn lưu báo cáo?
          <button onClick={doSave} className="ml-auto px-3 py-1 rounded-lg bg-amber-600 text-white text-[11.5px] font-black cursor-pointer">Vẫn lưu</button>
          <button onClick={() => setConfirmBlank(0)} className="px-3 py-1 rounded-lg border border-amber-300 bg-white text-[11.5px] font-black cursor-pointer">Điền tiếp</button>
        </div>
      )}
      {isDemo && view !== "review" && (
        <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11.5px] font-bold text-sky-900 print:hidden">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>Đây là <b>số liệu mẫu</b> để em xem cách trình bày. Đo ở Phòng Lab rồi bấm “Lưu vào Sổ Báo Cáo” để có số liệu của chính em.</span>
        </div>
      )}

      {/* ===== SỔ TAY: số liệu ↔ đồ thị ===== */}
      {view === "book" && (
        trials.length === 0 ? <EmptyState /> : (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] gap-3">
            <div className="min-h-0 flex flex-col gap-3 order-2 lg:order-1">
              <ResultHero lessonId={activeLesson} chart={chart} samples={samples} results={results} />
              <section data-tour="notes-table" className="flex-1 min-h-[220px] lg:min-h-0 rounded-2xl bg-white border border-[#E2DFD8] flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-[#F1EBE0]">
                  <Table className="w-4 h-4 text-[#C85A17]" />
                  <h3 className="text-[13px] font-black">Bảng số liệu</h3>
                  <span className="text-[11px] font-bold text-[#8C7B6B] truncate">Cột kết quả điền sẵn theo công thức — em kiểm tra &amp; sửa.</span>
                </div>
                <div className="flex-1 min-h-0 overflow-auto px-3 py-2 flex flex-col gap-3">
                  {labs.map((lab) => (
                    <SampleTable key={lab} lab={lab} rows={samples[lab] || []} results={results} onChange={(i, v) => setResult(lab, i, v)} />
                  ))}
                </div>
              </section>
            </div>
            <section data-tour="notes-graph" className="order-1 lg:order-2 min-h-[380px] lg:min-h-0 rounded-2xl bg-white border border-[#E2DFD8] p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <LineChartIcon className="w-4 h-4 text-[#C85A17]" />
                <h3 className="text-[13px] font-black">Đồ thị</h3>
                {chart && <span className="text-[11.5px] font-bold text-[#8C7B6B]">quan hệ <MathText text={`$${chart.relation}$`} /></span>}
              </div>
              <div className="flex-1 min-h-0">
                {chart && chart.series.some((s) => s.points.length) ? <NotebookGraph key={activeLesson + trials.length} spec={chart} /> : <div className="h-full grid place-items-center text-[12px] font-bold text-[#8C7B6B]">Cần ít nhất 2 lần đo để vẽ đồ thị.</div>}
              </div>
              {chart && <FitReadout chart={chart} />}
            </section>
          </div>
        )
      )}

      {/* ===== BÁO CÁO (in được) ===== */}
      {view === "report" && (
        <ReportView spec={spec} studentName={studentName} samples={samples} results={results} report={activeReport} savedAt={savedAt}
          chart={chart} notes={notes} onNotes={setNotes} />
      )}

      {/* ===== ÔN TẬP ===== */}
      {view === "review" && <ReviewTab lessonId={activeLesson} />}

      {toast && (
        <div className={`fixed bottom-24 lg:bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-black flex items-center gap-2 animate-scale-up print:hidden ${toast.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ============================ Thành phần con ============================ */

/** Chọn bài: nút gọn + menu chia theo lớp (cuộn được) — thêm bao nhiêu bài cũng không vỡ hàng. */
function LessonPicker({ value, options, onChange, markOf }: { value: string; options: LabEntry[]; onChange: (id: string) => void; markOf: (id: string) => "fresh" | "saved" | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", esc); };
  }, [open]);
  const dot = (id: string) => {
    const m = markOf(id);
    return m ? <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${m === "fresh" ? "bg-[#DF742E]" : "bg-[#2E7D32]"}`} title={m === "fresh" ? "Có số liệu mới" : "Đã có báo cáo"} /> : null;
  };
  return (
    <div ref={ref} className="relative" data-tour="notes-picker">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        className="h-10 pl-1.5 pr-2.5 rounded-2xl border border-[#E2DFD8] bg-white hover:border-[#DF742E]/50 flex items-center gap-2 cursor-pointer max-w-[78vw]">
        {current?.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={current.image} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
          : <span className="w-7 h-7 rounded-lg bg-[#FFF2E6] flex-shrink-0" />}
        <span className="min-w-0 text-left leading-tight">
          <span className="block text-[10.5px] font-black text-[#C85A17]">{current ? `${current.code} · Lớp ${current.grade}` : "Chọn bài"}</span>
          <span className="block text-[13px] font-black truncate">{current?.name ?? "—"}</span>
        </span>
        {current && dot(current.id)}
        <ChevronDown className={`w-4 h-4 text-[#8C7B6B] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute z-40 left-0 mt-1.5 w-[300px] max-w-[88vw] max-h-[60vh] overflow-y-auto rounded-2xl border border-[#E2DFD8] bg-white shadow-[0_18px_40px_rgba(50,30,18,.18)] p-1.5">
          {groupLabs(options, (l) => l.grade).map(([grade, labs]) => (
            <div key={grade}>
              <div className="px-2 pt-1.5 pb-1 text-[10.5px] font-black uppercase tracking-wider text-[#8C7B6B]">Lớp {grade}</div>
              {labs.map((l) => (
                <button key={l.id} role="option" aria-selected={l.id === value} onClick={() => { onChange(l.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left cursor-pointer ${l.id === value ? "bg-[#FFF2E6]" : "hover:bg-[#FBF6EC]"}`}>
                  <span className="text-[11px] font-black text-[#C85A17] w-12 flex-shrink-0">{l.code}</span>
                  <span className="min-w-0 flex-1 text-[12.5px] font-black truncate">{l.name}</span>
                  {dot(l.id)}
                </button>
              ))}
            </div>
          ))}
          <div className="px-2 pt-1.5 pb-1 text-[10px] font-bold text-[#8C7B6B] flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#DF742E]" /> số liệu mới</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2E7D32]" /> đã có báo cáo</span>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border border-[#E2DFD8] rounded-3xl p-12 text-center text-[#605248]">
      <FlaskConical className="w-12 h-12 mx-auto mb-3 stroke-[1.5] text-[#605248]/40" />
      <h3 className="text-sm font-black text-[#321E12]">Chưa có số liệu</h3>
      <p className="text-xs font-bold mt-2">Vào <b>Phòng Lab</b>, đo xong bấm <b>“Lưu vào Sổ Báo Cáo”</b>.</p>
    </div>
  );
}

/** Dải chấm: mỗi lần đo một chấm quanh giá trị trung bình (độ chụm), vạch xanh = giá trị chuẩn nếu có. */
function DotStrip({ values, mean, refValue, color, unit, dp }: { values: number[]; mean: number; refValue?: number | null; color: string; unit: string; dp: number }) {
  const all = [...values, mean, ...(refValue != null ? [refValue] : [])];
  let lo = Math.min(...all), hi = Math.max(...all);
  const span = Math.max(hi - lo, Math.abs(mean) * 0.01, 1e-6);
  lo -= span * 0.25; hi += span * 0.25;
  const X = (v: number) => 10 + ((v - lo) / (hi - lo)) * 280;
  return (
    <svg viewBox="0 0 300 40" className="w-full h-10" aria-label="Độ chụm các lần đo">
      <line x1="10" y1="24" x2="290" y2="24" stroke="#EDE3D2" strokeWidth="2" strokeLinecap="round" />
      {refValue != null && (
        <g>
          <line x1={X(refValue)} y1="10" x2={X(refValue)} y2="34" stroke="#16A34A" strokeWidth="2" strokeDasharray="3 2" />
          <text x={X(refValue)} y="8" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#15803D">chuẩn {fmt(refValue, dp)}</text>
        </g>
      )}
      <line x1={X(mean)} y1="14" x2={X(mean)} y2="34" stroke={color} strokeWidth="2.5" />
      {values.map((v, i) => <circle key={i} cx={X(v)} cy={24 + ((i % 3) - 1) * 3.5} r="4.2" fill={color} fillOpacity=".75" stroke="#fff" strokeWidth="1.2" />)}
      <text x="10" y="39" fontSize="8" fontWeight="800" fill="#8C7B6B">{fmt(lo, dp)}</text>
      <text x="290" y="39" textAnchor="end" fontSize="8" fontWeight="800" fill="#8C7B6B">{fmt(hi, dp)} {unit}</text>
    </svg>
  );
}

function HeroCard({ children }: { children: React.ReactNode }) {
  return <section data-tour="notes-hero" className="rounded-2xl border border-[#EBC9A8] bg-[linear-gradient(135deg,#FFF8F0,#FFEFDF)] p-3 flex flex-col gap-2">{children}</section>;
}
function Metric({ label, value, unit, sub, color = "#C85A17" }: { label: string; value: string; unit: string; sub?: string; color?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-black uppercase tracking-wide text-[#8C7B6B]">{label}</div>
      <div className="flex items-baseline gap-1 leading-none mt-0.5"><span className="text-[26px] font-black tabular-nums" style={{ color }}>{value}</span><span className="text-[13px] font-black text-[#605248]">{unit}</span></div>
      {sub && <div className="text-[11px] font-bold text-[#605248] mt-1">{sub}</div>}
    </div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-black uppercase text-[#321E12] border-l-[3px] border-[#C85A17] pl-2">{children}</h2>;
}

/** Kết quả nổi bật của bài (to, rõ) + độ chụm các lần đo. */
function ResultHero({ lessonId, chart, samples, results }: { lessonId: string; chart: ChartSpec | null; samples: Partial<Record<LabKind, RichTrial[]>>; results: Record<string, string> }) {
  const valuesOf = (lab: LabKind) => (samples[lab] || []).map((_, i) => parseResult(results[`${lab}-${i}`])).filter((v): v is number => v != null);

  if (lessonId === "do-gia-toc-roi-tu-do") {
    const st = stats(valuesOf("freefall"));
    const fit = chart?.series[0]?.fit;
    const gFit = fit ? 2 * fit.slope : null;
    if (!st) return null;
    return (
      <HeroCard>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="g trung bình (bảng)" value={fmt(st.mean, 2)} unit="m/s²" sub={`± ${fmt(Math.max(st.sd, st.halfRange), 2)} · ${st.n} lần đo`} />
          <Metric label="g từ đồ thị (2k)" value={fmt(gFit, 2)} unit="m/s²" color="#2563EB" sub={gFit ? `lệch ${fmt((Math.abs(gFit - G_REF) / G_REF) * 100, 1)}% so với 9,8` : "cần ≥ 2 điểm"} />
        </div>
        <DotStrip values={valuesOf("freefall")} mean={st.mean} refValue={G_REF} color="#DF742E" unit="m/s²" dp={2} />
      </HeroCard>
    );
  }
  if (lessonId === "do-dien-tro-dinh-luat-ohm") {
    const mats = (["ohm-x", "ohm-y"] as const).filter((m) => samples[m]?.length);
    return (
      <HeroCard><div className={`grid gap-3 ${mats.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {mats.map((m) => {
          const st = stats(valuesOf(m));
          const fit = chart?.series.find((s) => s.id === `ohm-${m.slice(-1).toUpperCase()}`)?.fit;
          const color = m === "ohm-x" ? "#2563EB" : "#DC2626";
          return (
            <div key={m} className="min-w-0 flex flex-col gap-1">
              <Metric label={`R ${m === "ohm-x" ? "X" : "Y"} (đồ thị)`} value={fmt(fit ? 1000 / fit.slope : null, 1)} unit="Ω" color={color}
                sub={st ? `U/I trung bình ${fmt(st.mean, 1)} Ω · ${st.n} điểm` : undefined} />
              {st && <DotStrip values={valuesOf(m)} mean={st.mean} color={color} unit="Ω" dp={1} />}
            </div>
          );
        })}
      </div></HeroCard>
    );
  }
  if (lessonId === "do-suat-dien-dong-pin-dien-hoa") {
    const ss = chart?.series.filter((s) => s.fit) || [];
    if (!ss.length) return null;
    const rMax = Math.max(...ss.map((s) => -s.fit!.slope * 1000), 0.1);
    return (
      <HeroCard><div className={`grid gap-3 ${ss.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {ss.map((s) => {
          const r = -s.fit!.slope * 1000;
          return (
            <div key={s.id} className="min-w-0 flex flex-col gap-1.5">
              <Metric label={`${s.name}: suất điện động`} value={fmt(s.fit!.intercept, 3)} unit="V" color={s.color} />
              <div className="text-[11px] font-black text-[#605248]">Điện trở trong r = <span style={{ color: s.color }}>{fmt(r, 2)} Ω</span></div>
              <div className="h-2 rounded-full bg-[#F3EADB] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (r / rMax) * 100)}%`, background: s.color }} /></div>
            </div>
          );
        })}
      </div></HeroCard>
    );
  }
  // Bài 6: mỗi góc θ — tốc độ tại E suy từ đồ thị (sEF → 0) so với đo thẳng bằng MODE A.
  const ss = (chart?.series || []).filter((s) => s.fit || s.extras?.length);
  if (!ss.length) return null;
  return (
    <HeroCard><div className="flex flex-col gap-1.5">
      <div className="text-[10.5px] font-black uppercase tracking-wide text-[#8C7B6B]">Tốc độ tức thời tại cổng E</div>
      {ss.map((s) => {
        const inst = stats((s.extras || []).map((p) => p.y));
        const vFit = s.fit?.intercept ?? null;
        const diff = vFit != null && inst ? Math.abs(vFit - inst.mean) / inst.mean : null;
        return (
          <div key={s.id} className="flex items-center gap-2 flex-wrap text-[12px] font-bold text-[#605248]">
            <span className="px-1.5 py-0.5 rounded-md text-white text-[11px] font-black" style={{ background: s.color }}>{s.name}</span>
            <span>đồ thị (sEF → 0): <b className="text-[18px] font-black tabular-nums" style={{ color: s.color }}>{fmt(vFit, 3)}</b> m/s</span>
            <span>· đo MODE A: <b className="text-[#321E12]">{inst ? fmt(inst.mean, 3) : "—"}</b> m/s</span>
            {diff != null && <span className={`font-black ${diff < 0.03 ? "text-[#15803D]" : "text-[#B45309]"}`}>{diff < 0.03 ? <><Sparkles className="inline w-3.5 h-3.5 -mt-0.5" /> khớp</> : `lệch ${fmt(diff * 100, 1)}%`}</span>}
          </div>
        );
      })}
    </div></HeroCard>
  );
}

/** Dòng diễn giải dưới đồ thị: độ dốc / tung độ gốc → đại lượng cần tìm. */
function FitReadout({ chart }: { chart: ChartSpec }) {
  const rows = chart.series.filter((s) => s.fit);
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-1">
      {rows.map((s) => (
        <div key={s.id} className="flex items-center gap-x-3 gap-y-1 flex-wrap rounded-xl bg-[#FBF8F3] border border-[#EFE6D6] px-2.5 py-1.5 text-[11.5px] font-bold text-[#605248]">
          {rows.length > 1 && <span className="font-black" style={{ color: s.color }}>{s.name}</span>}
          {chart.explain(s).map((r) => (
            <span key={r.label}>{r.label}: <b className={r.strong ? "text-[#C85A17] text-[12.5px]" : "text-[#321E12]"}>{r.value}</b></span>
          ))}
        </div>
      ))}
    </div>
  );
}

function SampleTable({ lab, rows, results, onChange }: { lab: LabKind; rows: RichTrial[]; results: Record<string, string>; onChange: (i: number, v: string) => void }) {
  const meta = LAB_META[lab];
  const cols = columnsFor(lab);
  const values = rows.map((_, i) => parseResult(results[`${lab}-${i}`])).filter((v): v is number => v != null);
  const st = stats(values);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <h4 className="text-[11.5px] font-black uppercase tracking-wide text-[#C85A17]">{meta.title}</h4>
        <span className="text-[11px] font-bold text-[#8C7B6B]"><MathText text={`$${meta.formula}$`} /></span>
        <span className="ml-auto text-[10.5px] font-black text-[#8C7B6B]">{rows.length} lần đo</span>
      </div>
      <table className="w-full text-[12px] border-separate border-spacing-0">
        <thead>
          <tr className="text-[10.5px] font-black text-[#8C7B6B]">
            <th className="text-left py-1 pl-1 w-6">#</th>
            {cols.map((c) => <th key={c.key} className="text-right py-1 px-1.5">{c.label} <span className="font-bold">({c.unit})</span></th>)}
            {meta.perRow && <th className="text-right py-1 px-1.5 w-[92px]">{meta.resultLabel} ({meta.unit})</th>}
            {lab === "emf" && <th className="text-right py-1 px-1.5">Pin</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const warn = r.balanced === false || r.steady === false;
            return (
              <tr key={i} className="font-bold text-[#321E12] odd:bg-[#FBF8F3]">
                <td className="py-1 pl-1 text-[#B5A590] font-black rounded-l-lg">
                  {warn ? <span title={r.balanced === false ? "Chưa cân bằng" : "Thả khi còn rung"} className="text-[#B45309] inline-flex"><AlertTriangle className="w-3.5 h-3.5" /></span> : i + 1}
                </td>
                {cols.map((c) => {
                  const v = c.get(r);
                  return <td key={c.key} className="py-1 px-1.5 text-right font-mono tabular-nums">{typeof v === "number" ? v.toFixed(c.dp ?? 3) : v ?? "—"}</td>;
                })}
                {meta.perRow && (
                  <td className="py-0.5 px-1 rounded-r-lg">
                    <input type="text" inputMode="decimal" value={results[`${lab}-${i}`] ?? ""} onChange={(e) => onChange(i, e.target.value)} placeholder="tự tính…"
                      aria-label={`Kết quả lần đo ${i + 1}`}
                      className="w-full px-1.5 py-1 border border-[#E2DFD8] focus:border-[#C85A17] outline-none rounded-lg bg-white font-black text-right font-mono text-[12px] text-[#321E12]" />
                  </td>
                )}
                {lab === "emf" && <td className="py-1 px-1.5 text-right rounded-r-lg"><span className={`text-[10.5px] font-black px-1.5 py-0.5 rounded-md ${r.cell === "old" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700"}`}>{r.cell === "old" ? "cũ" : "mới"}</span></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      {meta.perRow && st && (
        <div className="mt-1 text-[11px] font-bold text-[#605248]">
          Trung bình <b className="text-[#321E12]">{meta.resultLabel}<sub>tb</sub> = {fmt(st.mean, decimalsOf(lab) + 1)} {meta.unit}</b>
          {st.n > 1 && lab !== "average" && <> · sai số ±{fmt(Math.max(st.sd, st.halfRange), decimalsOf(lab) + 1)}</>}
          <span className="text-[#8C7B6B]"> ({values.length}/{rows.length} ô)</span>
        </div>
      )}
    </div>
  );
}

function ReportView({ spec, studentName, samples, results, report, savedAt, chart, notes, onNotes }: {
  spec: (typeof EXPERIMENT_SPECS)[string] | undefined;
  studentName?: string;
  samples: Partial<Record<LabKind, RichTrial[]>>;
  results: Record<string, string>;
  report: ExperimentReport | null;
  savedAt: string | null;
  chart: ChartSpec | null;
  notes: string;
  onNotes: (v: string) => void;
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
        <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-[#E2DFD8] text-[#321E12] text-xs font-black rounded-xl hover:border-[#C85A17]/40 transition-all flex items-center gap-1.5 cursor-pointer">
          <Printer className="w-4 h-4" /> Xuất PDF / In
        </button>
      </div>

      <article id="phylab-report" className="bg-white rounded-3xl border border-[#E2DFD8] shadow-sm p-6 md:p-10 space-y-6 print:rounded-none print:border-0 print:shadow-none print:p-0">
        <header className="text-center border-b-2 border-[#321E12] pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-0.5 text-[10px] font-black uppercase text-[#605248] print:flex-row">
            <span>Trường THPT Chuyên Lê Hồng Phong</span>
            <span>Phylab — Phòng thí nghiệm ảo</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#321E12] mt-4 uppercase tracking-wide">Báo cáo thực hành Vật lí</h1>
          <p className="text-sm font-black text-[#C85A17] mt-1">{spec?.title}</p>
          <p className="text-[10px] font-bold text-[#605248] mt-0.5">{spec?.book}</p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-bold text-[#321E12] print:grid-cols-2">
          <p>Họ và tên: <b className="border-b border-dotted border-[#605248]">{studentName?.split(" (")[0] || "—"}</b></p>
          <p>Lớp: <b>{isGrade11 ? "11A1" : "10A1"}</b> · Mã HS: <b>PH-2026-09</b></p>
          <p>Ngày thực hành: <b>{today}</b></p>
          <p>Lần lập báo cáo: <b>{report?.attempt ?? 1}</b></p>
        </section>

        <section className="space-y-1.5">
          <SectionTitle>I. Mục đích thí nghiệm</SectionTitle>
          <p className="text-[11px] font-semibold text-[#605248] leading-relaxed"><MathText text={spec?.theory.objective || ""} /></p>
        </section>

        <section className="space-y-4">
          <SectionTitle>II. Số liệu đo &amp; kết quả tính</SectionTitle>
          {labs.map((lab) => {
            const meta = LAB_META[lab];
            const rows = samples[lab] || [];
            const cols = columnsFor(lab);
            const values = rows.map((_, i) => parseResult(results[`${lab}-${i}`]));
            const st = stats(values.filter((v): v is number => v != null));
            return (
              <div key={lab} className="space-y-1.5 break-inside-avoid">
                <h3 className="text-[11px] font-black text-[#C85A17] uppercase">{meta.title} <span className="text-[#605248] normal-case">— <MathText text={`$${meta.formula}$`} /></span></h3>
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-[#FAF6F0] font-black text-[#321E12]">
                      <th className="border border-[#C9C2B6] p-1.5 w-8">Lần</th>
                      {cols.map((c) => <th key={c.key} className="border border-[#C9C2B6] p-1.5">{c.label} ({c.unit})</th>)}
                      {meta.perRow && <th className="border border-[#C9C2B6] p-1.5">{meta.resultLabel} ({meta.unit})</th>}
                      {lab === "emf" && <th className="border border-[#C9C2B6] p-1.5">Pin</th>}
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-[#321E12] text-center">
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="border border-[#C9C2B6] p-1.5 font-black">{i + 1}</td>
                        {cols.map((c) => { const v = c.get(r); return <td key={c.key} className="border border-[#C9C2B6] p-1.5 font-mono">{typeof v === "number" ? v.toFixed(c.dp ?? 3) : v ?? "—"}</td>; })}
                        {meta.perRow && <td className="border border-[#C9C2B6] p-1.5 font-mono">{values[i] != null ? values[i]!.toFixed(decimalsOf(lab)) : "(bỏ trống)"}</td>}
                        {lab === "emf" && <td className="border border-[#C9C2B6] p-1.5">{r.cell === "old" ? "Pin cũ" : "Pin mới"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {meta.perRow && st && (
                  <p className="text-[10px] font-bold text-[#605248]">
                    Giá trị trung bình: <b className="text-[#321E12]">{meta.resultLabel}<sub>tb</sub> = {fmt(st.mean, decimalsOf(lab) + 1)} {meta.unit}</b>
                    {rows.some((r) => r.balanced === false) && <span className="text-amber-700"> · có lần đo khi chưa cân bằng</span>}
                    {rows.some((r) => r.steady === false) && <span className="text-amber-700"> · có lần thả khi còn rung</span>}
                  </p>
                )}
              </div>
            );
          })}
        </section>

        {chart && chart.series.some((s) => s.points.length >= 2) && (
          <section className="space-y-2 break-inside-avoid">
            <SectionTitle>III. Đồ thị &amp; xử lý số liệu</SectionTitle>
            <div className="max-w-[560px] mx-auto aspect-[16/10]"><NotebookGraph spec={chart} printable /></div>
            <div className="flex flex-col gap-1 text-[11px] font-bold text-[#605248]">
              {chart.series.filter((s) => s.fit).map((s) => (
                <p key={s.id}>{chart.series.length > 1 && <b style={{ color: s.color }}>{s.name}: </b>}{chart.explain(s).map((r) => `${r.label} = ${r.value}`).join(" · ")}</p>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-1.5 break-inside-avoid">
          <SectionTitle>{chart ? "IV" : "III"}. Nhận xét &amp; kết luận</SectionTitle>
          <textarea value={notes} onChange={(e) => onNotes(e.target.value)} rows={4}
            placeholder="Em nhận xét kết quả: so với lý thuyết thế nào, nguyên nhân sai số, cách khắc phục…"
            className="w-full border border-dashed border-[#C9C2B6] rounded-xl p-3 text-[11.5px] font-semibold text-[#321E12] outline-none focus:border-[#C85A17] resize-y print:hidden" />
          <div className="hidden print:block border border-dashed border-[#C9C2B6] p-3 min-h-[90px] text-[11px] whitespace-pre-wrap">{notes || " "}</div>
        </section>

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
      <p className="text-[10.5px] font-bold text-[#8C7B6B] flex items-center gap-1.5 print:hidden"><BookOpenCheck className="w-3.5 h-3.5" /> Nhận xét em gõ ở đây sẽ in cùng báo cáo.</p>
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
