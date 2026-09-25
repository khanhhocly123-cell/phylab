"use client";

import { Fragment, useState } from "react";
import {
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  ClipboardList,
  Compass,
  FileText,
  FlaskConical,
  GraduationCap,
  House,
  LayoutGrid,
  LifeBuoy,
  LineChart,
  ListChecks,
  MousePointerClick,
  Navigation,
  NotebookPen,
  Save,
  School,
  Search,
  ShieldCheck,
  Siren,
  Table,
  TriangleAlert,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";
import { OPEN_GRADES, OPEN_LABS, SOON_LABS } from "@/data/labCatalog";
import { FEATURES } from "@/lib/features";
import type { SafetyKind } from "@/lib/tourState";
import type { TourStep } from "./GuidedTour";
import HazardHunt from "./HazardHunt";
import { Mascot } from "./Mascot";
import { EmergencySteps, GearSafety, RulesList, SafetyBadge, SafetyQuiz, SignsGrid, SymbolsGrid } from "./SafetyDeck";

/* =============================================================================================
   Nội dung các tour. Mỗi bước chỉ vào phần tử có data-tour="…" (hoặc data-lab-… trong bàn thí
   nghiệm); không tìm thấy (vd. đang ở điện thoại) thì tự hiện thành thẻ giữa màn hình.
   Linh vật Photon dẫn đường — đổi nét mặt theo từng bước, đội mũ bảo hộ ở phần An toàn.
   Số bài, số lớp, nhóm an toàn đều đọc từ danh mục bài nên thêm lab mới là tour tự khớp.
   ============================================================================================= */

const CH_START = "Làm quen";
const CH_LAB = "Phòng Lab";
const CH_SAFE = "An toàn";
const CH_NOTES = "Sổ Báo Cáo";

/* ---------- Màn chào ---------- */

function WelcomeHero({ firstName }: { firstName: string }) {
  const chips = [`${OPEN_LABS.length} bài thí nghiệm`, `Vật lí ${OPEN_GRADES.join(" · ")}`, SOON_LABS.length ? `${SOON_LABS.length} bài sắp ra mắt` : "Số liệu như thật"];
  return (
    <div
      className="relative px-4 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-5 text-white"
      style={{ background: "radial-gradient(130% 150% at 0% 0%, #FDBA74 0%, #F08A3C 30%, #C2410C 68%, #7C2D12 100%)" }}
    >
      <div aria-hidden className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1.1px, transparent 0)", backgroundSize: "18px 18px" }} />
      <div className="relative flex items-center gap-3 sm:gap-4 pr-10">
        <span className="flex-shrink-0 motion-safe:animate-[floatSlow_6s_ease-in-out_infinite]">
          <Mascot mood="happy" size={92} className="w-16 h-auto sm:w-[92px]" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/85">Chào mừng đến PhyLab</div>
          <div className="text-[26px] sm:text-[30px] font-black leading-tight drop-shadow-[0_2px_0_rgba(0,0,0,0.12)]">Chào {firstName}!</div>
          <p className="mt-1 max-w-[520px] text-[12.5px] sm:text-[13.5px] font-semibold leading-snug sm:leading-relaxed text-white/95">
            Mình là <b>Photon</b> — hạt ánh sáng dẫn đường của PhyLab. Đi một vòng với mình nha, chưa tới một phút đâu!
          </p>
        </div>
      </div>
      <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <span key={chip} className="rounded-full bg-white/20 ring-1 ring-white/35 px-2.5 py-1 text-[11px] font-black">{chip}</span>
        ))}
      </div>
    </div>
  );
}

const STAGES = [
  { icon: BookOpen, name: "Prelab", tint: "#DF742E", points: ["Làm quen dụng cụ", "Vẽ sơ đồ, tính thử"] },
  { icon: FlaskConical, name: "Phòng Lab", tint: "#0F766E", points: ["Tự lắp ráp, nối dây", "Đo số liệu như thật"] },
  { icon: FileText, name: "Sổ Báo Cáo", tint: "#1D5FAF", points: ["Bảng số liệu, đồ thị", "In báo cáo khổ A4"] },
];

function FlowStrip() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-2">
        {STAGES.map((stage, i) => (
          <Fragment key={stage.name}>
            <div className="rounded-2xl border bg-gradient-to-b from-white to-[#FFFAF4] p-2.5 sm:p-3" style={{ borderColor: `${stage.tint}40` }}>
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-xl grid place-items-center text-white shadow-[0_6px_14px_rgba(0,0,0,0.15)]" style={{ background: stage.tint }}>
                  <stage.icon className="w-5 h-5" strokeWidth={2.4} />
                </span>
                <div className="leading-tight min-w-0">
                  <div className="text-[10px] font-black tracking-wider" style={{ color: stage.tint }}>CHẶNG {i + 1}</div>
                  <b className="text-[14px] font-black text-[#321E12]">{stage.name}</b>
                  <p className="sm:hidden mt-0.5 text-[11.5px] font-bold text-[#5A4A3E] truncate">{stage.points.join(" · ")}</p>
                </div>
              </div>
              <ul className="hidden sm:block mt-2 space-y-1">
                {stage.points.map((p) => (
                  <li key={p} className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#5A4A3E]">
                    <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={3} style={{ color: stage.tint }} /> {p}
                  </li>
                ))}
              </ul>
            </div>
            {i < STAGES.length - 1 && (
              <span aria-hidden className="hidden sm:grid place-items-center text-[#D6B48C]"><ChevronRight className="w-5 h-5" strokeWidth={3} /></span>
            )}
          </Fragment>
        ))}
      </div>
      <div className="flex items-start gap-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3 py-2 text-[11.5px] font-bold text-[#92400E]">
        <Trophy className="w-4 h-4 flex-shrink-0 mt-px text-[#B45309]" />
        <span>Cuối chuyến: vượt qua phần An toàn để nhận <b>Phiếu vào Phòng Lab</b> và huy hiệu đầu tiên!</span>
      </div>
    </div>
  );
}

/* ---------- Khu vực của một bàn thí nghiệm ---------- */

function MapBadge({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="11" fill="#0F766E" stroke="#fff" strokeWidth="2.5" />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">{n}</text>
    </g>
  );
}

/** Sơ đồ khu vực bàn thí nghiệm — chạm số để xem từng khu (khám phá thay vì đọc một lượt). */
function LabMap() {
  const zones = [
    { n: 1, title: "Khay dụng cụ", text: "Kéo dụng cụ viền cam vào ô sáng trên bàn (điện thoại: chạm để lắp)." },
    { n: 2, title: "Bàn thí nghiệm", text: "Chạm để vặn núm, bật nguồn, đóng khoá; nối dây: chạm chốt này rồi chốt đang sáng." },
    { n: 3, title: "Bước tiếp theo", text: "Luôn nói em cần làm gì; kẹt quá thì bấm «Làm giúp bước này»." },
    { n: 4, title: "Lưu vào Sổ Báo Cáo", text: "Đo đủ số liệu thì lưu để vẽ đồ thị, in báo cáo." },
  ];
  const [active, setActive] = useState(1);
  const zone = zones[active - 1];
  const hot = (n: number) => ({ onClick: () => setActive(n), style: { cursor: "pointer" }, role: "button" as const, "aria-label": `Khu ${n}` });
  return (
    <div className="grid sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3 items-center">
      <svg viewBox="0 0 520 250" className="w-full h-auto rounded-xl border border-[#99F6E4] bg-[#F0FDFA]" role="group" aria-label="Sơ đồ các khu vực của bàn thí nghiệm">
        <rect x="0" y="0" width="520" height="26" fill="#fff" />
        <rect x="8" y="7" width="46" height="13" rx="5" fill="#E6F4F1" />
        <rect x="64" y="9" width="120" height="9" rx="4" fill="#CFE9E4" />
        {[430, 454, 478, 502].map((x) => <circle key={x} cx={x} cy="13" r="6" fill="#E6F4F1" />)}
        <line x1="0" y1="26" x2="520" y2="26" stroke="#CCEBE5" />
        <g {...hot(1)}>
          <rect x="8" y="34" width="92" height="208" rx="8" fill="#fff" stroke={active === 1 ? "#0F766E" : "#CCEBE5"} strokeWidth={active === 1 ? 2.5 : 1} />
          {[44, 88, 132, 176].map((y, i) => (
            <g key={y}>
              <rect x="15" y={y} width="78" height="36" rx="7" fill={i === 0 ? "#FFF3E6" : "#fff"} stroke={i === 0 ? "#DF742E" : "#E3EFEC"} strokeWidth={i === 0 ? 1.6 : 1} />
              <rect x="21" y={y + 7} width="22" height="22" rx="5" fill="#EEF6F4" />
              <rect x="48" y={y + 11} width="38" height="6" rx="3" fill="#D5E8E3" />
              <rect x="48" y={y + 21} width="26" height="5" rx="2.5" fill="#E3EFEC" />
            </g>
          ))}
        </g>
        <g {...hot(2)}>
          <rect x="108" y="34" width="264" height="208" rx="8" fill="#FFFDF8" stroke={active === 2 ? "#0F766E" : "#CCEBE5"} strokeWidth={active === 2 ? 2.5 : 1} />
          <rect x="116" y="214" width="248" height="10" rx="3" fill="#D8C3A5" />
          <line x1="140" y1="104" x2="330" y2="196" stroke="#8B95A1" strokeWidth="7" strokeLinecap="round" />
          <circle cx="158" cy="104" r="8" fill="#6B7280" />
          <rect x="248" y="132" width="16" height="34" rx="3" fill="#374151" />
          <rect x="290" y="56" width="66" height="40" rx="6" fill="#1F2937" />
          <rect x="297" y="63" width="52" height="16" rx="3" fill="#0F172A" />
          <text x="323" y="75.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#34D399" fontFamily="ui-monospace, monospace">0.163</text>
          <path d="M264 150 C 285 150, 290 110, 300 96" fill="none" stroke="#C0392B" strokeWidth="2" />
        </g>
        <g {...hot(3)}>
          <rect x="380" y="34" width="132" height="160" rx="8" fill="#fff" stroke={active === 3 ? "#0F766E" : "#CCEBE5"} strokeWidth={active === 3 ? 2.5 : 1} />
          <rect x="388" y="42" width="116" height="74" rx="7" fill="#FFFBF6" stroke="#DF742E" strokeWidth="1.4" />
          <rect x="396" y="52" width="16" height="16" rx="4" fill="#DF742E" />
          <rect x="418" y="54" width="70" height="6" rx="3" fill="#E6D9C6" />
          <rect x="418" y="64" width="50" height="5" rx="2.5" fill="#EFE6D8" />
          <rect x="396" y="90" width="100" height="18" rx="6" fill="#DF742E" />
          {[126, 142, 158].map((y) => <rect key={y} x="390" y={y} width="104" height="8" rx="4" fill="#EEF6F4" />)}
        </g>
        <g {...hot(4)}>
          <rect x="380" y="200" width="132" height="42" rx="8" fill="#fff" stroke={active === 4 ? "#0F766E" : "#CCEBE5"} strokeWidth={active === 4 ? 2.5 : 1} />
          <rect x="388" y="208" width="116" height="26" rx="8" fill="#DF742E" />
          <rect x="414" y="218" width="64" height="6" rx="3" fill="#fff" opacity="0.85" />
        </g>
        <MapBadge x={100} y={36} n={1} />
        <MapBadge x={200} y={60} n={2} />
        <MapBadge x={508} y={44} n={3} />
        <MapBadge x={508} y={206} n={4} />
      </svg>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-1.5">
          {zones.map((z) => (
            <button
              key={z.n}
              type="button"
              onClick={() => setActive(z.n)}
              className={`h-9 rounded-xl text-[12px] font-black cursor-pointer transition-colors ${active === z.n ? "bg-[#0F766E] text-white" : "bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4] hover:bg-[#CCFBF1]"}`}
            >
              {z.n}
            </button>
          ))}
        </div>
        <div key={zone.n} className="rounded-xl border border-[#99F6E4] bg-[#F0FDFA] p-3 motion-safe:animate-[tourFade_0.2s_ease-out]">
          <b className="text-[13px] font-black text-[#134E4A]">{zone.n}. {zone.title}</b>
          <p className="mt-1 text-[12px] font-semibold text-[#115E59] leading-snug">{zone.text}</p>
        </div>
        <p className="text-[11px] font-bold text-[#8C7B6B]">Chạm vào từng khu trên hình để xem nó làm gì.</p>
      </div>
    </div>
  );
}

function NavList() {
  const items = [
    { icon: House, name: "Trang chủ", text: "bài nên làm tiếp, tiến độ" },
    { icon: FlaskConical, name: "Phòng Lab", text: "tất cả bài thí nghiệm" },
    { icon: GraduationCap, name: "Lớp của tôi", text: "nhập mã lớp, bài được giao" },
    { icon: Camera, name: "Quét tài liệu", text: "chụp SGK để mở đúng bài" },
    { icon: FileText, name: "Sổ Báo Cáo", text: "số liệu, đồ thị, báo cáo" },
  ].filter((it) => FEATURES.classroom || it.name !== "Lớp của tôi");
  return (
    <ul className="mt-1.5 flex flex-col gap-1">
      {items.map((it) => (
        <li key={it.name} className="flex items-center gap-2 text-[12px] font-semibold text-[#5A4A3E]">
          <it.icon className="w-3.5 h-3.5 text-[#C85A17] flex-shrink-0" strokeWidth={2.6} />
          <span><b className="text-[#321E12]">{it.name}</b> — {it.text}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Phiếu vào Phòng Lab (bước cuối) ---------- */

// Pháo giấy: vị trí cố định (không random khi render) cho hiệu ứng rơi lặp lại.
const CONFETTI = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  delay: ((i * 7) % 13) / 10,
  dur: 2.2 + ((i * 5) % 7) / 10,
  color: ["#F59E0B", "#DF742E", "#0F766E", "#1D5FAF", "#FB7185", "#FACC15"][i % 6],
  w: 6 + (i % 3) * 2,
  h: 10 - (i % 2) * 3,
}));

const STAMPS = [
  { label: "Làm quen", color: "#C85A17" },
  { label: "Phòng Lab", color: "#0F766E" },
  { label: "An toàn", color: "#B45309" },
];

function LabPass({ name }: { name: string }) {
  const [today] = useState(() => new Date().toLocaleDateString("vi-VN"));
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute -top-3 rounded-[2px] opacity-0 motion-safe:animate-[confettiFall_2.6s_ease-in_infinite]"
          style={{ left: `${c.x}%`, width: c.w, height: c.h, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }}
        />
      ))}
      <div className="relative grid sm:grid-cols-[150px_1fr] rounded-2xl border-2 border-dashed border-[#EBC9A8] bg-[#FFFBF5] overflow-hidden">
        <div className="flex sm:flex-col items-center justify-center gap-2 p-3 text-white" style={{ background: "linear-gradient(160deg, #FDBA74, #C2410C)" }}>
          <Mascot mood="party" gear="helmet" size={84} />
          <div className="text-center leading-tight">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/85">PhyLab</div>
            <div className="text-[12px] font-black">Nhà vật lí tập sự</div>
          </div>
        </div>
        <div className="p-4">
          <div className="text-[10.5px] font-black uppercase tracking-[0.18em] text-[#C85A17]">Phiếu vào Phòng Lab</div>
          <div className="text-[22px] font-black text-[#321E12] leading-tight">{name}</div>
          <div className="text-[11.5px] font-bold text-[#8C7B6B]">Cấp ngày {today} · hợp lệ cho mọi phòng Lab</div>
          <div className="mt-3 flex flex-wrap gap-3">
            {STAMPS.map((st, i) => (
              <span
                key={st.label}
                className="w-[70px] h-[70px] rounded-full grid place-items-center text-center border-[3px] border-double motion-safe:animate-[stampIn_0.45s_ease-out_both]"
                style={{ borderColor: st.color, color: st.color, animationDelay: `${0.15 + i * 0.22}s`, transform: "rotate(-10deg)" }}
              >
                <span className="leading-tight">
                  <Check className="w-4 h-4 mx-auto" strokeWidth={3.2} />
                  <b className="block text-[9.5px] font-black uppercase">{st.label}</b>
                </span>
              </span>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-[#5A4A3E]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" /> <span>Huy hiệu <b>An toàn PTN</b> đã gắn lên Trang chủ của em.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Các chương ---------- */

/** Chương An toàn (theo SGK Vật lí 10 — Bài 2): săn nguy hiểm → kí hiệu → biển báo → quy tắc → sự cố → thử thách. */
export function safetySteps(opts: { withGear?: SafetyKind[] } = {}): TourStep[] {
  const steps: TourStep[] = [
    {
      id: "safe-hunt",
      chapter: CH_SAFE,
      icon: Search,
      mood: "alert",
      gear: "helmet",
      title: "Thử thách: săn nguy hiểm!",
      body: <span>Khoan vào Lab đã! Góc phòng này đang có <b>4 chỗ không an toàn</b>. Bấm vào chỗ em thấy đáng ngờ — cẩn thận, có vài chỗ an toàn để đánh lừa đó. <SafetyBadge /></span>,
      visual: <HazardHunt />,
      wide: true,
    },
    {
      id: "safe-symbols",
      chapter: CH_SAFE,
      icon: TriangleAlert,
      mood: "happy",
      gear: "helmet",
      title: "Thiết bị cũng biết “nói”",
      body: "Kí hiệu trên thiết bị cho biết cách dùng đúng. Lật từng thẻ xem chúng nói gì — rồi úp lại tự kiểm tra xem nhớ chưa.",
      visual: <SymbolsGrid />,
      wide: true,
    },
    {
      id: "safe-signs",
      chapter: CH_SAFE,
      icon: ShieldCheck,
      mood: "think",
      gear: "helmet",
      title: "Biển báo trong phòng thí nghiệm",
      body: "Mẹo: nhìn hình dạng và màu là đoán được loại biển trước cả khi đọc chữ.",
      visual: <SignsGrid />,
      wide: true,
    },
    {
      id: "safe-rules",
      chapter: CH_SAFE,
      icon: ListChecks,
      mood: "happy",
      gear: "helmet",
      title: "9 quy tắc vàng",
      body: "Ở phòng thật cũng như trong PhyLab — thuộc hết là ngầu.",
      visual: <RulesList />,
      wide: true,
    },
    {
      id: "safe-emergency",
      chapter: CH_SAFE,
      icon: Siren,
      mood: "alert",
      gear: "helmet",
      title: "Nếu có sự cố",
      body: "Chuyện không ai muốn nhưng phải biết: bình tĩnh, và việc đầu tiên luôn là ngắt điện.",
      visual: <EmergencySteps />,
      wide: true,
    },
  ];
  if (opts.withGear?.length) {
    steps.push({
      id: "safe-gear",
      chapter: CH_SAFE,
      icon: Wrench,
      mood: "think",
      gear: "helmet",
      title: "Áp dụng cho dụng cụ trong PhyLab",
      body: "Trong Phòng Lab, làm sai các điều này thì số đo cũng sai theo đúng vật lí — như ngoài đời.",
      visual: <GearSafety kinds={opts.withGear} />,
      wide: true,
    });
  }
  steps.push({
    id: "safe-quiz",
    chapter: CH_SAFE,
    icon: LifeBuoy,
    mood: "wink",
    gear: "helmet",
    title: "Câu hỏi chốt hạ",
    body: "Hai câu thôi — chọn sai cũng không sao, đọc giải thích là nhớ lâu.",
    visual: <SafetyQuiz />,
    wide: true,
  });
  return steps;
}

/** Tour lần đầu vào app (học sinh): làm quen → khu vực Phòng Lab → an toàn → phiếu vào Lab. */
export function studentTour({ name, goHome }: { name: string; goHome: () => void }): TourStep[] {
  const shortName = name.split(" (")[0].trim();
  const firstName = shortName.split(/\s+/).pop() || shortName;
  return [
    {
      id: "welcome",
      chapter: CH_START,
      icon: Compass,
      title: `Chào ${firstName}, chào mừng em đến PhyLab!`,
      hero: <WelcomeHero firstName={firstName} />,
      visual: <FlowStrip />,
      wide: true,
      nextLabel: "Đi thôi!",
      skipLabel: "Để sau",
    },
    {
      id: "nav",
      chapter: CH_START,
      icon: Navigation,
      mood: "happy",
      title: "Bản đồ của PhyLab",
      body: <><span>Lạc đường cứ nhìn sang đây:</span><NavList /></>,
      target: ['[data-tour="nav"]', '[data-tour="dock"]'],
      before: goHome,
    },
    {
      id: "scan",
      chapter: CH_START,
      icon: Camera,
      mood: "wink",
      title: "Lười tìm bài? Chụp là xong",
      body: "Chụp một trang SGK, PhyLab tự nhận ra bài và mở đúng thí nghiệm cho em.",
      target: ['[data-tour="scan"]', '[data-tour="dock-scan"]'],
      before: goHome,
    },
    {
      id: "next-lab",
      chapter: CH_START,
      icon: FlaskConical,
      mood: "happy",
      title: "Bài nên làm tiếp",
      body: "Bài đang dở hoặc bài gợi ý nằm chờ ở đây — một chạm là vào.",
      target: '[data-tour="next-lab"]',
      before: goHome,
    },
    {
      id: "catalog",
      chapter: CH_START,
      icon: LayoutGrid,
      mood: "wow",
      title: `Kho ${OPEN_LABS.length} phòng Lab`,
      body: `Lọc theo lớp, lướt ngang để xem thêm bài${SOON_LABS.length ? ` — còn ${SOON_LABS.length} bài đang trên đường tới` : ""}. Bài nào cũng đi ba chặng: Prelab → Thực hành → Sổ Báo Cáo.`,
      target: '[data-tour="lab-row"]',
      before: goHome,
    },
    {
      id: "help",
      chapter: CH_START,
      icon: LifeBuoy,
      mood: "happy",
      title: "Quên gì cứ bấm dấu hỏi",
      body: "Nút này gọi mình quay lại, kèm cả mục An toàn phòng thí nghiệm.",
      target: '[data-tour="help"]',
      before: goHome,
    },
    {
      id: "lab-map",
      chapter: CH_LAB,
      icon: MousePointerClick,
      mood: "think",
      gear: "goggles",
      title: "Bên trong một phòng Lab",
      body: "Bàn nào cũng chia bốn khu như vầy. Vào bàn thật lần đầu, mình sẽ chỉ tận tay từng khu.",
      visual: <LabMap />,
      wide: true,
    },
    ...safetySteps(),
    {
      id: "pass",
      chapter: CH_SAFE,
      icon: Trophy,
      mood: "party",
      gear: "helmet",
      title: "Tèn ten! Em đã sẵn sàng",
      body: "Đây là phiếu vào Phòng Lab của em. Giờ thì đi đo thật thôi!",
      visual: <LabPass name={shortName} />,
      wide: true,
    },
  ];
}

/** Tour Sổ Báo Cáo — tự mở lần đầu học sinh vào Sổ (sau khi đã tham quan app). */
export function notesTour(): TourStep[] {
  return [
    {
      id: "notes-picker",
      chapter: CH_NOTES,
      icon: NotebookPen,
      mood: "happy",
      title: "Sổ Báo Cáo của em",
      body: "Số liệu lưu từ Phòng Lab tự về đây. Bấm để chọn bài — chấm cam là có số liệu mới, chấm xanh là đã lưu báo cáo.",
      target: '[data-tour="notes-picker"]',
    },
    {
      id: "notes-views",
      chapter: CH_NOTES,
      icon: LayoutGrid,
      mood: "wink",
      title: "Ba cách xem",
      body: (
        <ul className="mt-0.5 space-y-0.5">
          <li><b>Sổ tay</b> — số liệu và đồ thị cạnh nhau.</li>
          <li><b>Báo cáo</b> — trang A4 đầy đủ, in hoặc xuất PDF.</li>
          <li><b>Ôn tập</b> — flashcard và trắc nghiệm của bài.</li>
        </ul>
      ),
      target: '[data-tour="notes-views"]',
    },
    {
      id: "notes-hero",
      chapter: CH_NOTES,
      icon: Trophy,
      mood: "wow",
      title: "Kết quả nhanh",
      body: "Giá trị trung bình, sai số và độ lệch so với giá trị chuẩn — biết ngay em đo tốt tới đâu.",
      target: '[data-tour="notes-hero"]',
    },
    {
      id: "notes-table",
      chapter: CH_NOTES,
      icon: Table,
      mood: "think",
      title: "Bảng số liệu",
      body: "Cột kết quả điền sẵn theo công thức — em kiểm tra và sửa cho đúng. Ô nào bỏ trống sẽ được nhắc trước khi lưu.",
      target: '[data-tour="notes-table"]',
    },
    {
      id: "notes-graph",
      chapter: CH_NOTES,
      icon: LineChart,
      mood: "wow",
      title: "Thử thách: vẽ đồ thị như máy",
      body: "Chọn «Em tự vẽ»: chấm từng điểm lên giấy kẻ ô, kéo đường thẳng rồi bấm «So với máy». Độ dốc lệch dưới 3% là cao thủ!",
      target: '[data-tour="notes-graph"]',
      side: "left",
    },
    {
      id: "notes-save",
      chapter: CH_NOTES,
      icon: Save,
      mood: "happy",
      title: "Lưu và in báo cáo",
      body: "Bấm Lưu để giữ báo cáo của bài này; sang tab Báo cáo để xem trang A4 và bấm Xuất PDF / In.",
      target: '[data-tour="notes-save"]',
    },
  ];
}

/** Tour trong bàn thí nghiệm — hiện một lần, lần đầu vào bàn bất kì (các bàn dùng chung bố cục). */
export function labTour(): TourStep[] {
  return [
    {
      id: "lab-top",
      chapter: CH_LAB,
      icon: Navigation,
      mood: "happy",
      gear: "goggles",
      title: "Thanh công cụ",
      body: "Thoát · Làm lại từ đầu · Xem lại Prelab · Bật/tắt giọng đọc · Dấu hỏi để gọi mình.",
      target: "[data-lab-header]",
      pad: 2,
    },
    {
      id: "lab-tray",
      chapter: CH_LAB,
      icon: ClipboardList,
      mood: "wink",
      gear: "goggles",
      title: "Khay dụng cụ",
      body: "Kéo dụng cụ viền cam vào ô sáng trên bàn — lắp theo thứ tự gợi ý. Trên điện thoại chỉ cần chạm.",
      target: "[data-lab-tooltray]",
      side: "right",
    },
    {
      id: "lab-stage",
      chapter: CH_LAB,
      icon: MousePointerClick,
      mood: "wow",
      gear: "goggles",
      title: "Bàn thí nghiệm",
      body: "Chạm trực tiếp vào dụng cụ để vặn núm, bật nguồn, đóng khoá, thả vật. Nối dây: chạm một chốt rồi chạm chốt đang sáng. Làm ẩu là số đo lệch theo đúng vật lí đó!",
      target: "[data-lab-stage]",
      pad: 0,
    },
    {
      id: "lab-next",
      chapter: CH_LAB,
      icon: ListChecks,
      mood: "happy",
      gear: "goggles",
      title: "Bước tiếp theo",
      body: "Luôn nhìn vào đây: mình nói em cần làm gì và kiểm tra từng việc. Kẹt quá thì bấm «Làm giúp bước này».",
      target: ['[data-tour="lab-next"]', "[data-lab-guide-sheet]"],
      side: "left",
    },
    {
      id: "lab-finish",
      chapter: CH_LAB,
      icon: Save,
      mood: "wink",
      gear: "goggles",
      title: "Lưu vào Sổ Báo Cáo",
      body: "Đo đủ các mức theo đề thì nút sáng lên — lưu để vẽ đồ thị và in báo cáo. Quên gì cứ bấm dấu hỏi trên thanh công cụ.",
      target: ['[data-tour="lab-finish"]', "[data-lab-guide-sheet]"],
      side: "left",
    },
  ];
}

/** Tour lần đầu của giáo viên. */
export function teacherTour(): TourStep[] {
  return [
    {
      id: "t-welcome",
      icon: School,
      mood: "happy",
      title: "Chào thầy cô — đây là bảng điều khiển lớp học",
      body: "Bốn việc chính: tạo lớp và phát mã, giao bài Lab với đề tự đặt, soạn quiz theo form Bộ GD 2025, theo dõi và xuất bảng điểm.",
      visual: (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: School, name: "Tạo lớp", text: "Mã 5 kí tự cho học sinh nhập" },
            { icon: FlaskConical, name: "Giao bài Lab", text: "Tự đặt số đo, thấy đáp án mong đợi" },
            { icon: ClipboardList, name: "Quiz", text: "Form 2025 và quiz chống gian lận" },
            { icon: Users, name: "Theo dõi", text: "Lỗi sai cả lớp, xuất CSV" },
          ].map((it) => (
            <div key={it.name} className="rounded-xl border border-[#EBC9A8] bg-[#FFF8F0] p-2.5">
              <it.icon className="w-4.5 h-4.5 text-[#C85A17]" strokeWidth={2.5} />
              <b className="block mt-1 text-[12.5px] font-black text-[#321E12]">{it.name}</b>
              <span className="text-[11px] font-semibold text-[#5A4A3E] leading-snug">{it.text}</span>
            </div>
          ))}
        </div>
      ),
      wide: true,
      nextLabel: "Xem nhanh",
      skipLabel: "Để sau",
    },
    {
      id: "t-create",
      icon: School,
      mood: "wink",
      title: "Tạo lớp, lấy mã tham gia",
      body: "Mỗi lớp có một mã 5 kí tự. Học sinh nhập mã ở mục «Lớp của tôi» là vào lớp.",
      target: '[data-tour="t-create"]',
    },
    {
      id: "t-classes",
      icon: Users,
      mood: "happy",
      title: "Mở một lớp để làm việc",
      body: "Trong lớp: danh sách học sinh và mức hoạt động, Giao bài Lab, Soạn quiz, Bản đồ lỗi sai, Xuất bảng điểm CSV.",
      target: ['[data-tour="t-classes"]', '[data-tour="t-create"]'],
    },
    {
      id: "t-safety",
      icon: ShieldCheck,
      mood: "alert",
      gear: "helmet",
      title: "Học sinh được dẫn qua phần an toàn",
      body: "Lần đầu vào app, học sinh chơi «săn nguy hiểm» và học kí hiệu, biển báo, quy tắc theo SGK Vật lí 10 — Bài 2; mỗi bài thí nghiệm nhắc lại quy tắc theo nhóm dụng cụ.",
      visual: <GearSafety kinds={["mech", "elec"]} />,
      wide: true,
    },
    {
      id: "t-help",
      icon: LifeBuoy,
      mood: "happy",
      title: "Mở lại hướng dẫn",
      body: "Bấm vào đây bất cứ lúc nào để xem lại phần này hoặc mục An toàn.",
      target: '[data-tour="t-help"]',
    },
  ];
}
