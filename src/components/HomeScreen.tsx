"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Camera, ChevronLeft, ChevronRight, Clock, FileText, FlaskConical, GraduationCap, History, Lock, Play, ScanLine, ShieldCheck, Sparkles, Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import { OPEN_GRADES, OPEN_LABS, OPEN_SUBJECTS, SOON_LABS, type LabEntry } from "@/data/labCatalog";
import { FEATURES } from "@/lib/features";
import { hasSeenTour, subscribeTours } from "@/lib/tourState";

interface HomeScreenProps {
  studentName: string;
  completedCount: number;
  // Danh sách các bài lab đang trong trạng thái "vừa vào, chưa nộp"
  inProgressLabIds?: string[];
  reports?: Array<{ title: string; date: string; score?: number; shortTitle?: string; lessonId?: string }>;
  onNav: (tab: "home" | "scan" | "lab" | "notes" | "myclass") => void;
  onOpenLab: (id: string) => void;
  onSubjectClick?: (subject: string) => void;
}

type Grade = "all" | LabEntry["grade"];

const DIFF_STYLE: Record<string, string> = {
  "Dễ": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Trung bình": "bg-amber-50 text-amber-700 border-amber-200",
  "Khó": "bg-rose-50 text-rose-700 border-rose-200",
};
const SUBJECT_COLOR: Record<string, string> = { "Cơ học": "#DF742E", "Điện": "#2563EB", "Quang học": "#0D9488", "Nhiệt học": "#DC2626", "Hạt nhân": "#7C3AED" };

export default function HomeScreen({
  studentName,
  completedCount,
  inProgressLabIds = [],
  reports = [],
  onNav,
  onOpenLab,
  onSubjectClick,
}: HomeScreenProps) {
  const [grade, setGrade] = useState<Grade>("all");
  // Huy hiệu An toàn PTN: có sau khi đi hết chuyến tham quan (kể cả phần An toàn).
  const safetyBadge = useSyncExternalStore(subscribeTours, () => hasSeenTour(studentName, "badge-safety"), () => false);
  const [greeting, setGreeting] = useState("Xin chào");

  // Lời chào theo giờ (tính sau khi gắn để tránh lệch giờ server/client).
  useEffect(() => {
    const h = new Date().getHours();
    const text = h >= 5 && h < 12 ? "Chào buổi sáng" : h >= 12 && h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
    const timer = setTimeout(() => setGreeting(text), 0);
    return () => clearTimeout(timer);
  }, []);

  const firstName = (() => {
    const clean = (studentName || "").split(" (")[0].trim();
    return clean.split(" ").pop() || "bạn";
  })();

  // Tiến độ thật: có báo cáo → 100%; đang làm dở → 25%; chưa vào → 0%.
  const reported = (id: string) => reports.some((r) => r.lessonId === id);
  const pctOf = (id: string) => (reported(id) ? 100 : inProgressLabIds.includes(id) ? 25 : 0);
  const doneCount = Math.max(Math.min(completedCount, OPEN_LABS.length), OPEN_LABS.filter((l) => reported(l.id)).length);
  const overallPct = OPEN_LABS.length ? Math.round(OPEN_LABS.reduce((s, l) => s + pctOf(l.id), 0) / OPEN_LABS.length) : 0;

  // Bài nên làm tiếp: đang dở → chưa làm → (đã xong hết) bài đầu tiên để ôn.
  const nextLab = OPEN_LABS.find((l) => inProgressLabIds.includes(l.id) && !reported(l.id)) || OPEN_LABS.find((l) => !reported(l.id)) || OPEN_LABS[0];
  const nextVerb = nextLab && inProgressLabIds.includes(nextLab.id) && !reported(nextLab.id) ? "Tiếp tục" : nextLab && reported(nextLab.id) ? "Làm lại" : "Bắt đầu";
  const shown = OPEN_LABS.filter((l) => grade === "all" || l.grade === grade);
  const soon = SOON_LABS.filter((l) => grade === "all" || l.grade === grade);

  const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 18 } } };

  return (
    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 lg:gap-5 items-start text-[#321E12] font-nunito">

      {/* ======================= CỘT CHÍNH ======================= */}
      <div className="min-w-0 flex flex-col gap-4 lg:gap-5">

        {/* Hero: lời chào + bài nên làm tiếp + 2 hành động chính */}
        <motion.section variants={fade}
          className="relative overflow-hidden rounded-3xl border border-[#EBC9A8] bg-[linear-gradient(120deg,#FFF6EC_0%,#FFE9D4_55%,#FFDDBE_100%)] p-4 md:p-5 flex flex-col md:flex-row gap-4 md:items-stretch">
          <div className="pointer-events-none absolute -right-10 -top-16 w-64 h-64 rounded-full bg-[#DF742E]/10" />
          <div className="pointer-events-none absolute right-40 -bottom-20 w-44 h-44 rounded-full bg-[#DF742E]/8" />
          <div className="relative min-w-0 flex-1 flex flex-col justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 border border-[#EBC9A8] px-2.5 py-1 text-[10.5px] font-black text-[#C85A17]">
                <Sparkles className="w-3.5 h-3.5" /> {OPEN_LABS.length} phòng Lab đang mở{SOON_LABS.length ? ` · ${SOON_LABS.length} bài sắp ra mắt` : ""}
              </div>
                {safetyBadge && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10.5px] font-black text-emerald-700" title="Nhận sau khi đi hết phần tham quan và An toàn phòng thí nghiệm">
                    <ShieldCheck className="w-3.5 h-3.5" /> Huy hiệu An toàn PTN
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl md:text-[30px] font-black tracking-tight leading-tight">
                {greeting}, <span className="text-[#C85A17]">{firstName}!</span>
              </h1>
              <p className="mt-1 text-[13px] md:text-sm font-bold text-[#605248] leading-snug">
                Tự tay lắp dụng cụ, đo số liệu thật và xem đồ thị hiện ra ngay trên bàn thí nghiệm.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onNav("scan")}
                className="flex-1 sm:flex-initial justify-center h-10 px-4 rounded-2xl bg-[#321E12] hover:bg-[#4A2E1C] text-white text-[13px] font-black flex items-center gap-2 cursor-pointer active:scale-95 transition-all shadow-[0_8px_18px_rgba(50,30,18,.18)] whitespace-nowrap">
                <ScanLine className="w-4 h-4" /> <span className="sm:hidden">Quét SGK</span><span className="hidden sm:inline">Quét trang SGK</span>
              </button>
              <button onClick={() => onNav("lab")}
                className="flex-1 sm:flex-initial justify-center h-10 px-4 rounded-2xl bg-white/85 hover:bg-white border border-[#EBC9A8] text-[#321E12] text-[13px] font-black flex items-center gap-2 cursor-pointer active:scale-95 transition-all whitespace-nowrap">
                <FlaskConical className="w-4 h-4 text-[#C85A17]" /> <span className="sm:hidden">Phòng Lab</span><span className="hidden sm:inline">Tất cả phòng Lab</span>
              </button>
            </div>
          </div>

          {/* Bài nên làm tiếp */}
          {nextLab && (
            <button onClick={() => onOpenLab(nextLab.id)} data-tour="next-lab"
              className="relative md:w-[300px] flex-shrink-0 text-left rounded-2xl bg-white border border-[#EBC9A8] shadow-[0_10px_24px_rgba(200,90,23,.12)] overflow-hidden flex md:flex-col cursor-pointer group active:scale-[.99] transition-all">
              <div className="relative w-28 md:w-full h-auto md:h-[92px] flex-shrink-0 overflow-hidden bg-[#EAE8E3]">
                {nextLab.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={nextLab.image} alt="" draggable={false} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                <span className="absolute left-2 bottom-2 text-[10px] font-black text-white bg-[#C85A17] rounded-md px-1.5 py-0.5">{nextVerb === "Tiếp tục" ? "ĐANG LÀM DỞ" : nextVerb === "Làm lại" ? "ÔN LẠI" : "GỢI Ý TIẾP THEO"}</span>
              </div>
              <div className="min-w-0 flex-1 p-3 flex flex-col gap-1.5">
                <div className="text-[10.5px] font-black text-[#C85A17]">{nextLab.code} · Lớp {nextLab.grade} · {nextLab.subject}</div>
                <div className="text-[14px] font-black leading-snug line-clamp-2 group-hover:text-[#C85A17] transition-colors">{nextLab.name}</div>
                <div className="mt-auto flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[#EDE7DB] overflow-hidden"><div className="h-full rounded-full bg-[#DF742E]" style={{ width: `${pctOf(nextLab.id)}%` }} /></div>
                  <span className="h-8 px-3 rounded-xl bg-[#C85A17] group-hover:bg-[#B24A0C] text-white text-[12px] font-black flex items-center gap-1">
                    {nextVerb} <Play className="w-3 h-3 fill-current" />
                  </span>
                </div>
              </div>
            </button>
          )}
        </motion.section>

        {/* Phòng Lab — hàng thẻ cuộn ngang: ít bài thì giãn đầy hàng, nhiều bài thì cuộn */}
        <motion.section variants={fade} className="flex flex-col gap-2.5 min-w-0" data-tour="lab-row">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg md:text-xl font-black tracking-tight">Phòng Lab <span className="text-[13px] font-black text-[#8C7B6B]">{shown.length} bài</span></h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-2xl border border-[#E2DFD8] bg-white p-1 overflow-x-auto max-w-[70vw] scrollbar-none">
                {(["all", ...OPEN_GRADES] as Grade[]).map((g) => (
                  <button key={String(g)} onClick={() => setGrade(g)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-black cursor-pointer transition-all ${grade === g ? "bg-[#C85A17] text-white shadow-[0_4px_10px_rgba(200,90,23,.2)]" : "text-[#605248] hover:bg-[#FFF2E6] hover:text-[#C85A17]"}`}>
                    {g === "all" ? "Tất cả" : `Lớp ${g}`}
                  </button>
                ))}
              </div>
              <button onClick={() => onNav("lab")} className="hidden sm:flex items-center gap-0.5 text-[12px] font-black text-[#C85A17] hover:underline cursor-pointer whitespace-nowrap">
                Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <CardRow>
            {shown.map((lab) => <LabCard key={lab.id} lab={lab} pct={pctOf(lab.id)} onOpen={() => onOpenLab(lab.id)} />)}
          </CardRow>

          {/* Sắp ra mắt */}
          {soon.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-0.5">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-[#8C7B6B] flex-shrink-0">Sắp ra mắt</span>
              {soon.map((s) => (
                <button key={s.id} onClick={() => onSubjectClick?.(s.subject)} title={`${s.code} · ${s.name} (Lớp ${s.grade}) — đang chuẩn bị`}
                  className="flex-shrink-0 flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-dashed border-[#D8CDB8] bg-white/60 text-[11.5px] font-black text-[#8C7B6B] hover:text-[#605248] hover:border-[#C9B79B] cursor-pointer">
                  <Lock className="w-3 h-3" /> {s.code} · {s.name}
                </button>
              ))}
            </div>
          )}
        </motion.section>
      </div>

      {/* ======================= CỘT PHẢI ======================= */}
      <div className="min-w-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-5">
        {/* Tiến độ — tổng + theo chủ đề (không phụ thuộc số bài) */}
        <motion.section variants={fade} className="rounded-3xl bg-white border border-[#E2DFD8] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-[#8C7B6B] flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-[#C85A17]" /> Tiến độ của em</h3>
            <button onClick={() => onNav("notes")} className="text-[11px] font-black text-[#C85A17] hover:underline cursor-pointer">Sổ báo cáo →</button>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative w-[74px] h-[74px] flex-shrink-0">
              <svg width="74" height="74" viewBox="0 0 74 74" aria-hidden="true">
                <circle cx="37" cy="37" r="30" fill="none" stroke="#F3EEE4" strokeWidth="8" />
                <circle cx="37" cy="37" r="30" fill="none" stroke="#DF742E" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 30} strokeDashoffset={2 * Math.PI * 30 * (1 - overallPct / 100)} transform="rotate(-90 37 37)" className="transition-all duration-700" />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-[17px] font-black">{overallPct}%</span>
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-black leading-tight">{doneCount}/{OPEN_LABS.length} bài đã có báo cáo</div>
              <div className="text-[11.5px] font-bold text-[#605248] leading-snug mt-0.5">
                {doneCount >= OPEN_LABS.length ? "Hoàn thành tất cả bài đang mở — tuyệt vời!" : nextLab ? `Tiếp theo: ${nextLab.code} — ${nextLab.name}` : ""}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {OPEN_SUBJECTS.map((subject) => {
              const labs = OPEN_LABS.filter((l) => l.subject === subject);
              const done = labs.filter((l) => reported(l.id)).length;
              const color = SUBJECT_COLOR[subject] || "#DF742E";
              return (
                <div key={subject}>
                  <div className="flex items-center justify-between text-[11.5px] font-black">
                    <span>{subject}</span><span className="text-[#8C7B6B]">{done}/{labs.length}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-[#F3EEE4] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${labs.length ? (done / labs.length) * 100 : 0}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Lối tắt + nhật ký gần đây */}
        <motion.section variants={fade} className="rounded-3xl bg-white border border-[#E2DFD8] p-4 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Quét SGK", Icon: Camera, tab: "scan" as const, tone: "bg-[#FFF2E6] text-[#C85A17]" },
              { label: "Sổ báo cáo", Icon: FileText, tab: "notes" as const, tone: "bg-[#EEF4FC] text-[#1D5FAF]" },
              { label: "Lớp của tôi", Icon: GraduationCap, tab: "myclass" as const, tone: "bg-[#F1F8F0] text-[#2E7D32]" },
            ].map(({ label, Icon, tab, tone }) => {
              const locked = tab === "myclass" && !FEATURES.classroom;
              return (
                <button key={label} onClick={() => onNav(tab)} aria-disabled={locked || undefined} title={locked ? "Tạm khoá" : undefined}
                  className={`relative rounded-2xl border border-[#EDE6D9] p-2 flex flex-col items-center gap-1.5 transition-all ${locked ? "opacity-45 cursor-not-allowed" : "hover:border-[#DF742E]/45 hover:bg-[#FFFBF6] cursor-pointer active:scale-95"}`}>
                  <span className={`w-9 h-9 rounded-xl grid place-items-center ${tone}`}><Icon className="w-4.5 h-4.5" /></span>
                  <span className="text-[11.5px] font-black leading-none">{label}</span>
                  {locked && <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-[#8C7B6B]" />}
                </button>
              );
            })}
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-[#8C7B6B] flex items-center gap-1.5"><History className="w-3.5 h-3.5 text-[#C85A17]" /> Nhật ký gần đây</h3>
            {reports.length === 0 ? (
              <div className="mt-2 text-[12px] font-bold text-[#8C7B6B]">Chưa có báo cáo nào — đo xong một bài rồi lưu vào Sổ báo cáo nhé.</div>
            ) : (
              <div className="mt-1.5 flex flex-col">
                {reports.slice(0, 3).map((r, i) => (
                  <button key={`${r.date}-${i}`} onClick={() => onNav("notes")} className="flex items-center gap-2.5 py-1.5 border-b border-[#F1EBE0] last:border-0 text-left cursor-pointer group">
                    <span className="w-7 h-7 rounded-lg bg-[#FFF2E6] grid place-items-center flex-shrink-0"><FileText className="w-3.5 h-3.5 text-[#C85A17]" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-black truncate group-hover:text-[#C85A17]">{r.shortTitle || r.title}</span>
                      <span className="block text-[10.5px] font-bold text-[#8C7B6B]">{r.date}</span>
                    </span>
                    {typeof r.score === "number" && <span className="text-[10.5px] font-black text-[#2E7D32] bg-[#F1F8F0] rounded-md px-1.5 py-0.5">{r.score.toFixed(1)}đ</span>}
                    <ChevronRight className="w-3.5 h-3.5 text-[#C9B79B]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}

/** Hàng thẻ cuộn ngang: thẻ tối thiểu 180px, ít thẻ thì giãn đều; nhiều thẻ thì cuộn + nút ◀ ▶. */
function CardRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    // ResizeObserver gọi update ngay khi bắt đầu quan sát (không setState đồng bộ trong effect).
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => { el.removeEventListener("scroll", update); ro?.disconnect(); };
  }, []);
  const page = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  return (
    <div className="relative min-w-0">
      <div ref={ref} className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-1">
        {children}
      </div>
      {edge.left && (
        <button onClick={() => page(-1)} aria-label="Xem các bài trước" className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-9 h-9 rounded-full bg-white border border-[#E2DFD8] shadow-[0_6px_16px_rgba(50,30,18,.15)] grid place-items-center cursor-pointer">
          <ChevronLeft className="w-4.5 h-4.5" />
        </button>
      )}
      {edge.right && (
        <button onClick={() => page(1)} aria-label="Xem thêm bài" className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-9 h-9 rounded-full bg-white border border-[#E2DFD8] shadow-[0_6px_16px_rgba(50,30,18,.15)] grid place-items-center cursor-pointer">
          <ChevronRight className="w-4.5 h-4.5" />
        </button>
      )}
    </div>
  );
}

function LabCard({ lab, pct, onOpen }: { lab: LabEntry; pct: number; onOpen: () => void }) {
  return (
    <button onClick={onOpen}
      className="snap-start group text-left rounded-2xl bg-white border border-[#E2DFD8] hover:border-[#DF742E]/55 shadow-[0_2px_10px_rgba(50,30,18,.03)] hover:shadow-[0_12px_26px_rgba(50,30,18,.08)] hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col cursor-pointer">
      <div className="relative h-[86px] md:h-[100px] overflow-hidden bg-[#EAE8E3]">
        {lab.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lab.image} alt="" loading="lazy" draggable={false} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
        <span className="absolute left-2 top-2 text-[10px] font-black text-[#C85A17] bg-white/95 rounded-md px-1.5 py-0.5">{lab.code}</span>
        <span className="absolute right-2 top-2 text-[10px] font-black text-white bg-black/45 backdrop-blur-sm rounded-md px-1.5 py-0.5">Lớp {lab.grade}</span>
        <span className="absolute left-2 bottom-1.5 text-[11px] font-black text-white/95 font-mono tracking-tight">{lab.formula}</span>
      </div>
      <div className="p-2.5 md:p-3 flex flex-col gap-1.5 flex-1">
        <div className="text-[13px] md:text-[14px] font-black leading-snug line-clamp-2 group-hover:text-[#C85A17] transition-colors">{lab.name}</div>
        <div className="hidden md:block text-[11px] font-bold text-[#8C7B6B] leading-snug line-clamp-1">{lab.kit}</div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${DIFF_STYLE[lab.difficulty]}`}>{lab.difficulty}</span>
          <span className="text-[10.5px] font-bold text-[#8C7B6B] flex items-center gap-0.5"><Clock className="w-3 h-3" /> {lab.duration}</span>
        </div>
        <div className="mt-auto pt-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[#EDE7DB] overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 100 ? "bg-[#2E7D32]" : "bg-[#DF742E]"}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-[10.5px] font-black ${pct >= 100 ? "text-[#2E7D32]" : pct > 0 ? "text-[#C85A17]" : "text-[#8C7B6B]"}`}>{pct >= 100 ? "✓ Xong" : pct > 0 ? "Đang làm" : "Mới"}</span>
        </div>
      </div>
    </button>
  );
}
