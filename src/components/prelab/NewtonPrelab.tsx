"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Hand, Search, Wind } from "lucide-react";
import type { ExperimentSpec } from "@/lib/types";
import PrelabShell, { PrelabStepHeading, type PrelabStep } from "./PrelabShell";
import { MC964Interactive } from "./MC964Prelab";
import CalcDrills, { drillsDone, type DrillState } from "./CalcDrills";
import { CALC_DRILLS } from "./calcDrillData";
import { MathText } from "../Latex";
import { MC964Face } from "../lab/mech/MechParts.jsx";
import {
  AT, G1_X, rulerX, hookYOf,
  AirTrackRoom, AirTrack15, AirPump15, Glider15, Photogate15, Pulley15, Hanger15, WeightBox15, Scale15,
} from "../lab/mech/AirTrackParts.jsx";
import { NEWTON2, newtonRun, computeNewtonTime, accelFromTime } from "@/engine/physicsNewton2.js";

type Props = { spec: ExperimentSpec; viewOnly?: boolean; onFinish: () => void; onExit?: () => void };

const G2_X = rulerX(AT.G1_CM + 50);
const DRILLS = CALC_DRILLS.newton2;

/** Chú thích Hình 15.2 (SGK) — số, vị trí trên hình, tên, vai trò. */
const PARTS = [
  { id: "1", x: G1_X - 14, y: 186, name: "Tấm chắn sáng", role: "Dài 10 cm, gắn trên xe. Khi đi qua, nó che tia hồng ngoại của cổng quang → đồng hồ bắt đầu/dừng đếm." },
  { id: "2", x: 600, y: 244, name: "Máng trượt đệm khí", role: "Máng nhôm có nhiều lỗ nhỏ thổi khí: xe nổi trên lớp đệm khí nên ma sát gần như bằng 0." },
  { id: "3", x: G1_X + 20, y: 172, name: "Cổng quang điện 1", role: "Tấm chắn tới cổng 1 → đồng hồ bắt đầu đếm. Xe đặt sát cổng này để v₀ = 0." },
  { id: "4", x: G2_X + 20, y: 172, name: "Cổng quang điện 2", role: "Cách cổng 1 đúng 0,5 m. Tấm chắn tới cổng 2 → đồng hồ dừng." },
  { id: "5", x: AT.PULLEY.x, y: 212, name: "Ròng rọc", role: "Đổi hướng sợi dây: dây nằm ngang trên máng, thẳng đứng ở phía quả nặng." },
  { id: "6", x: AT.HANG_X + 30, y: 326, name: "Các quả nặng", role: "Hộp 10 quả, mỗi quả 50 g. Quả TREO tạo lực kéo F; quả trên xe chỉ làm tăng khối lượng." },
  { id: "7", x: AT.CLK.x + 94, y: 312, name: "Đồng hồ đo thời gian hiện số", role: "MODE A↔B: đếm từ lúc tấm chắn tới cổng 1 đến lúc tới cổng 2, chính xác 0,001 s." },
  { id: "8", x: AT.SCALE.x + 60, y: 356, name: "Cân điện tử", role: "Cân xe trượt (M = 200 g) và quả nặng (m = 50 g) để biết khối lượng hệ." },
  { id: "9", x: AT.PUMP.x + 55, y: 190, name: "Bơm khí (máy nén khí)", role: "Thổi khí vào máng tạo đệm khí; núm lưu lượng chỉnh độ dày đệm khí. Quên bật máy hay để nấc yếu → xe cọ vào máng, số đo sai hẳn." },
  { id: "xe", x: G1_X - 44, y: 208, name: "Xe trượt M = 200 g", role: "Buộc vào sợi dây vắt qua ròng rọc. Hệ vật = xe + quả trên xe + quả treo." },
];

export default function NewtonPrelab({ spec, viewOnly = false, onFinish, onExit }: Props) {
  const [slide, setSlide] = useState(0);
  const [drills, setDrills] = useState<DrillState>({});
  const calcDone = drillsDone(DRILLS, drills);

  const steps: PrelabStep[] = [
    { key: "fig", label: "Hình 15.2" },
    { key: "pump", label: "Máy nén khí" },
    { key: "air", label: "Thử đệm khí" },
    { key: "clock", label: "Đồng hồ A↔B" },
    { key: "start", label: "Sát cổng 1" },
    { key: "calc", label: "Tính toán", done: viewOnly ? undefined : calcDone },
  ];

  return (
    <PrelabShell
      spec={spec}
      steps={steps}
      current={slide}
      onStep={setSlide}
      mode={viewOnly ? "review" : "gate"}
      canFinish={calcDone}
      requirement="Còn thiếu: làm đúng 3 phép tính gốc ở bước Tính toán"
      onFinish={onFinish}
      onExit={onExit}
    >
      {slide === 0 && <FigureStep spec={spec} />}
      {slide === 1 && <CompressorStep />}
      {slide === 2 && <AirCushionStep />}
      {slide === 3 && (
        <div className="animate-[fadeIn_0.25s_ease-out]">
          <PrelabStepHeading
            eyebrow="Đồng hồ đo thời gian hiện số (7)"
            title="MODE A↔B: đếm từ cổng quang 1 tới cổng quang 2"
            lead="Bài 15 dùng đúng MODE A↔B (SGK, bước 3): đồng hồ bắt đầu đếm khi tấm chắn tới cổng 1 và dừng khi tới cổng 2. Thử xoay núm MODE, bấm Reset, đổi thang đo — trong Lab em sẽ làm lại trước mỗi lần thả xe."
          />
          <MC964Interactive />
        </div>
      )}
      {slide === 4 && <StartStep />}
      {slide === 5 && (
        <div className="animate-[fadeIn_0.25s_ease-out] flex flex-col gap-3">
          <PrelabStepHeading
            eyebrow="Tính toán gốc"
            title="Hệ vật, lực kéo và gia tốc"
            lead="Ba phép tính em sẽ dùng trong Lab: tính F và M + m của hệ, tính a từ t đo được, và cách đổi F mà giữ nguyên khối lượng."
            required
          />
          <CalcDrills drills={DRILLS} state={drills} onChange={setDrills} />
          {calcDone && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <span className="w-5 h-5 bg-emerald-500 text-white rounded-full grid place-items-center flex-shrink-0"><Check className="w-3 h-3" strokeWidth={3} /></span>
              Đúng cả ba! Vào Phòng Lab để đo đủ 5 cột Bảng 15.1.
            </div>
          )}
        </div>
      )}
    </PrelabShell>
  );
}

/* ============================ Bước 1 — Hình 15.2 chạm để khám phá ============================ */
function FigureStep({ spec }: { spec: ExperimentSpec }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const pick = (id: string) => {
    setPicked(id);
    setSeen((old) => (old.has(id) ? old : new Set(old).add(id)));
  };
  const part = PARTS.find((p) => p.id === picked);
  return (
    <div className="animate-[fadeIn_0.25s_ease-out] flex flex-col gap-3">
      <div className="flex flex-col lg:flex-row lg:items-end gap-2 lg:gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C85A17]">Mục tiêu · {spec.book}</p>
          <h3 className="text-base sm:text-lg font-black text-[#321E12] leading-snug">{spec.title}</h3>
          <div className="text-xs font-semibold text-[#605248] leading-relaxed mt-1"><MathText text={spec.theory.objective} /></div>
        </div>
        <div className="inline-flex items-center gap-2 self-start lg:self-auto px-3 py-1.5 rounded-2xl bg-white border border-[#E2DFD8] text-sm font-black text-[#321E12]">
          <span className="text-[10px] uppercase tracking-wider text-[#605248]">Định luật 2</span>
          <MathText text="$\vec{a} = \dfrac{\vec{F}}{m}$" />
        </div>
      </div>

      <div className="rounded-2xl border border-[#E2DFD8] bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-3 pt-2.5">
          <Search className="w-4 h-4 text-[#C85A17]" />
          <b className="text-[12.5px] text-[#321E12]">Hình 15.2 — chạm các số để xem từng dụng cụ</b>
          <span className="ml-auto text-[11px] font-black text-[#C85A17]">{seen.size}/{PARTS.length}</span>
        </div>
        <svg viewBox="0 150 900 272" className="w-full h-auto block" role="img" aria-label="Sơ đồ bố trí thí nghiệm định luật 2 Newton">
          <StaticBench highlight={picked} />
          {PARTS.map((p) => {
            const active = picked === p.id, done = seen.has(p.id);
            return (
              <g key={p.id} role="button" tabIndex={0} aria-label={`${p.id === "xe" ? "Xe trượt" : `(${p.id})`} ${p.name}`}
                onClick={() => pick(p.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pick(p.id); }} style={{ cursor: "pointer" }}>
                <circle cx={p.x} cy={p.y} r="17" fill="transparent" />
                {!done && <circle cx={p.x} cy={p.y} r="12" fill="#E8842B" opacity=".25"><animate attributeName="r" values="11;15;11" dur="1.4s" repeatCount="indefinite" /></circle>}
                <circle cx={p.x} cy={p.y} r="10.5" fill={active ? "#C85A17" : done ? "#16A34A" : "#fff"} stroke={active ? "#7C2D12" : done ? "#166534" : "#C85A17"} strokeWidth="1.8" />
                <text x={p.x} y={p.y + (p.id === "xe" ? 3 : 4)} textAnchor="middle" fontSize={p.id === "xe" ? 8 : 11} fontWeight="900" fill={active || done ? "#fff" : "#C85A17"}>{p.id}</text>
              </g>
            );
          })}
        </svg>
        <div className="px-3 pb-3 min-h-[58px]">
          {part ? (
            <div className="rounded-xl bg-[#FFF6EC] border border-[#F2DFC6] px-3 py-2">
              <b className="text-[13px] text-[#321E12]">{part.id === "xe" ? "" : `(${part.id}) `}{part.name}</b>
              <p className="text-[12px] font-semibold text-[#605248] leading-snug mt-0.5">{part.role}</p>
            </div>
          ) : (
            <p className="text-[12px] font-bold text-[#8C7B6B] pt-2">Dụng cụ theo đúng SGK: máng đệm khí, xe trượt 200 g, hộp 10 quả nặng 50 g, hai cổng quang cách nhau 0,5 m, tấm chắn sáng 10 cm, ròng rọc, đồng hồ hiện số, cân điện tử và bơm khí.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Toàn cảnh bố trí thí nghiệm (tĩnh) — cùng bản vẽ với Phòng Lab. */
function StaticBench({ highlight }: { highlight: string | null }) {
  const hookY = hookYOf(G1_X);
  const P = AT.PULLEY;
  return (
    <g style={{ pointerEvents: "none" }}>
      <AirTrackRoom />
      <AirPump15 on hose />
      <WeightBox15 left={6} />
      <Scale15 />
      <AirTrack15 level pump />
      <Photogate15 x={G1_X} label="1" />
      <Photogate15 x={G2_X} label="2" />
      <Pulley15 />
      <path d={`M${G1_X + AT.GLIDER_FRONT + 2.5} ${AT.STRING_Y} L${P.x} ${AT.STRING_Y} A${P.r} ${P.r} 0 0 1 ${P.x + P.r} ${P.y} L${AT.HANG_X} ${hookY - 4}`} fill="none" stroke="#1F2937" strokeWidth="1" />
      <Hanger15 hookY={hookY} n={2} />
      <Glider15 xs={G1_X} cart={2} lift={1.6} />
      <g transform={`translate(${AT.CLK.x} ${AT.CLK.y}) scale(${AT.CLK.s})`}>
        <MC964Face face="front" led="0.640" modeAngle={50} modeLabel="A↔B" scaleLabel="9.999" power interactive={false} />
      </g>
      {highlight && <HighlightRing id={highlight} />}
    </g>
  );
}

function HighlightRing({ id }: { id: string }) {
  const box: Record<string, [number, number, number, number]> = {
    "1": [G1_X - 32, AT.FLAG_TOP - 4, 36, 28], "2": [AT.TRACK_L - 4, AT.TRACK_TOP - 12, AT.TRACK_R - AT.TRACK_L + 8, 40],
    "3": [G1_X - 14, 184, 28, 98], "4": [G2_X - 14, 184, 28, 98], "5": [AT.PULLEY.x - 16, AT.PULLEY.y - 16, 32, 44],
    "6": [AT.HANG_X - 16, 262, 32, 60], "7": [AT.CLK.x - 6, AT.CLK.y - 6, 200, 96], "8": [AT.SCALE.x - 4, AT.SCALE.y + 6, AT.SCALE.w + 8, AT.SCALE.h],
    "9": [AT.PUMP.x - 6, AT.PUMP.y - 6, AT.PUMP.w + 30, AT.PUMP.h + 12], xe: [G1_X - 50, AT.GLIDER_TOP - 18, 70, 42],
  };
  const b = box[id];
  if (!b) return null;
  return (
    <rect x={b[0]} y={b[1]} width={b[2]} height={b[3]} rx="8" fill="#E8842B" fillOpacity=".08" stroke="#E8842B" strokeWidth="2.4" strokeDasharray="6 4">
      <animate attributeName="stroke-dashoffset" values="0;20" dur="1s" repeatCount="indefinite" />
    </rect>
  );
}

/* ============================ Bước 2 — Máy nén khí (bơm khí) ============================ */
const FLOW_NAME = ["Tắt", "Yếu", "Vừa", "Mạnh"];
const CUSHION = [
  { gap: 0, text: "Chưa có đệm khí: xe tì hẳn lên mặt máng, ma sát lớn.", tone: "bad" },
  { gap: 2, text: "Đệm khí mỏng: xe nổi chưa đều, vẫn cọ vào máng.", tone: "warn" },
  { gap: 5, text: "Đệm khí vừa (dày cỡ 0,1 mm): xe nổi hẳn, gần như không ma sát.", tone: "ok" },
  { gap: 7, text: "Đệm khí mạnh: xe nổi hẳn — đủ dùng, chỉ ồn hơn.", tone: "ok" },
] as const;
const COMPRESSOR_PARTS = [
  { id: "a", name: "Công tắc nguồn I/O", role: "Bật máy trước khi đặt xe lên máng; tắt máy khi xe còn trên máng thì xe cọ xước mặt máng." },
  { id: "b", name: "Núm lưu lượng 1–3", role: "Chỉnh lượng khí thổi: nấc 1 yếu (xe còn cọ), nấc 2–3 xe nổi hẳn." },
  { id: "c", name: "Quạt thổi (động cơ điện)", role: "Hút khí xung quanh, nén rồi đẩy vào ống dẫn." },
  { id: "d", name: "Ống dẫn khí mềm", role: "Nối cửa thổi của máy với đầu máng; không để gập, xoắn." },
  { id: "e", name: "Lỗ khí trên mặt máng", role: "Khí trong lòng máng rỗng phụt ra qua các lỗ nhỏ — không dán, không bịt." },
  { id: "f", name: "Đệm khí dưới xe", role: "Lớp khí mỏng nâng xe khỏi mặt máng → ma sát gần như bằng 0." },
];

function CompressorStep() {
  const [on, setOn] = useState(false);
  const [flow, setFlow] = useState(1);
  const [picked, setPicked] = useState<string | null>(null);
  const level = on ? flow : 0;
  const cushion = CUSHION[level];
  const part = COMPRESSOR_PARTS.find((p) => p.id === picked);
  const gap = cushion.gap;
  return (
    <div className="animate-[fadeIn_0.25s_ease-out] flex flex-col gap-3">
      <PrelabStepHeading
        eyebrow="Bơm khí (9) · máy nén khí"
        title="Máy nén khí tạo đệm khí cho máng"
        lead="Máy thổi khí vào lòng máng rỗng; khí phụt ra qua hàng lỗ nhỏ trên mặt máng, tạo lớp đệm khí mỏng nâng xe lên. Bật máy và vặn núm lưu lượng ngay trên hình, xem lát cắt dưới xe thay đổi thế nào."
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start">
        <div className="rounded-2xl border border-[#E2DFD8] bg-white overflow-hidden">
          <svg viewBox="70 170 440 180" className="w-full h-auto block" role="img" aria-label="Máy nén khí, ống dẫn và lát cắt đệm khí dưới xe">
            <AirTrackRoom />
            <AirPump15 on={on} flow={flow} hose onToggle={() => setOn((v) => !v)} onKnob={() => setFlow((f) => (f % 3) + 1)} />
            <AirTrack15 level pump={level} />
            <Glider15 xs={G1_X - 20} lift={[0, 0.6, 1.6, 2.2][level]} />
            {/* lát cắt phóng to: mặt máng — lớp khí — đáy xe */}
            <g transform="translate(300 308)">
              <rect x="-4" y="-40" width="208" height="70" rx="10" fill="#fff" stroke="#E2DFD8" />
              <text x="4" y="-28" fontSize="8" fontWeight="900" fill="#8C7B6B">LÁT CẮT DƯỚI XE (phóng to)</text>
              <rect x="10" y={-18 - gap} width="184" height="12" rx="3" fill="#2563EB" />
              <text x="102" y={-9 - gap} textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#fff">đáy xe trượt</text>
              <rect x="4" y="-4" width="196" height="16" rx="2" fill="#CBD5E1" stroke="#64748B" strokeWidth=".8" />
              <text x="102" y="8" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#334155">mặt máng có lỗ khí</text>
              {[26, 58, 90, 122, 154, 186].map((x) => (
                <g key={x}>
                  <rect x={x - 2} y="-4" width="4" height="5" fill="#1F2937" />
                  {level > 0 && (
                    <path d={`M${x} -4 v-${Math.max(2, gap + 2)}`} stroke="#0EA5E9" strokeWidth={level === 1 ? 1 : 1.6} strokeLinecap="round" strokeDasharray="2 2">
                      <animate attributeName="stroke-dashoffset" from="4" to="0" dur={level === 3 ? "0.2s" : level === 2 ? "0.3s" : "0.55s"} repeatCount="indefinite" />
                    </path>
                  )}
                </g>
              ))}
              {gap === 0 && [40, 110, 170].map((x) => <path key={x} d={`M${x - 5} -6 l4 -3 l2 3 l4 -3`} fill="none" stroke="#DC2626" strokeWidth="1.2" />)}
              <text x="102" y="24" textAnchor="middle" fontSize="8" fontWeight="900" fill={cushion.tone === "ok" ? "#15803D" : cushion.tone === "warn" ? "#B45309" : "#B91C1C"}>
                {gap === 0 ? "xe cọ vào máng" : `lớp khí ${level === 1 ? "mỏng, chưa đều" : level === 2 ? "≈ 0,1 mm" : "dày hơn"}`}
              </text>
            </g>
            {/* nhãn bộ phận (bấm để xem) */}
            {[["a", AT.PUMP.x + 58, AT.PUMP.y - 8], ["b", AT.PUMP.x + 88, AT.PUMP.y - 8], ["c", AT.PUMP.x + 25, AT.PUMP.y - 8], ["d", AT.TRACK_L - 14, AT.TRACK_TOP - 18], ["e", AT.TRACK_L + 46, AT.TRACK_TOP - 14], ["f", 492, 282]].map(([id, x, y]) => (
              <g key={id as string} role="button" tabIndex={0} aria-label={COMPRESSOR_PARTS.find((p) => p.id === id)?.name}
                onClick={() => setPicked(id as string)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setPicked(id as string); }} style={{ cursor: "pointer" }}>
                <circle cx={x as number} cy={y as number} r="9" fill={picked === id ? "#C85A17" : "#fff"} stroke="#C85A17" strokeWidth="1.6" />
                <text x={x as number} y={(y as number) + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="900" fill={picked === id ? "#fff" : "#C85A17"}>{id}</text>
              </g>
            ))}
          </svg>
          <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
            <button type="button" onClick={() => setOn((v) => !v)}
              className={`h-10 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 border cursor-pointer ${on ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-rose-50 border-rose-300 text-rose-700"}`}>
              <Wind className="w-4 h-4" /> Máy: {on ? "BẬT" : "TẮT"}
            </button>
            <div role="group" aria-label="Núm lưu lượng" className="flex rounded-xl border border-[#E2DFD8] overflow-hidden">
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" onClick={() => setFlow(n)} aria-pressed={flow === n}
                  className={`h-10 px-3 text-xs font-black cursor-pointer ${flow === n ? "bg-[#321E12] text-white" : "bg-white text-[#605248]"}`}>{n} · {FLOW_NAME[n]}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className={`rounded-xl border px-3 py-2 text-[12px] font-bold leading-snug ${cushion.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : cushion.tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            Đệm khí — {on ? `nấc ${flow} (${FLOW_NAME[flow]})` : "máy tắt"}: {cushion.text}
          </div>
          <div className="rounded-xl border border-[#E2DFD8] bg-white p-2.5 min-h-[64px]">
            {part ? (
              <>
                <b className="text-[12.5px] text-[#321E12]">({part.id}) {part.name}</b>
                <p className="text-[12px] font-semibold text-[#605248] leading-snug mt-0.5">{part.role}</p>
              </>
            ) : (
              <p className="text-[12px] font-bold text-[#8C7B6B]">Chạm các chữ a–f trên hình để xem từng bộ phận.</p>
            )}
          </div>
          <ul className="rounded-xl border border-[#C85A17]/20 bg-[#FFF7ED] px-3 py-2 text-[11.5px] font-semibold text-[#321E12] leading-relaxed list-disc pl-6">
            <li>Đặt máy chắc chắn, dây điện gọn — không để vướng lối đi.</li>
            <li>Bật máy <b>trước</b> khi đặt xe lên máng, tắt máy <b>sau</b> khi nhấc xe ra.</li>
            <li>Không dán, không bịt các lỗ khí; tắt máy khi không đo (máy nóng và ồn).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ============================ Bước 3 — Thử đệm khí: đẩy nhẹ xe ở từng nấc ============================ */
const DEMO_V0 = 0.7;           // tốc độ đẩy nhẹ (m/s)
const DECEL_AIR = 0.015;       // đệm khí đủ: cản rất nhỏ (m/s²)
/** Gia tốc hãm theo nấc máy nén khí: tắt μ = 0,2; yếu μ = 0,05; vừa/mạnh gần như 0. */
const decelOf = (level: number) => (level === 0 ? NEWTON2.friction.kinetic * NEWTON2.g : level === 1 ? NEWTON2.weakFriction.kinetic * NEWTON2.g : DECEL_AIR);
function AirCushionStep() {
  const [on, setOn] = useState(true);
  const [flow, setFlow] = useState(2);
  const level = on ? flow : 0;
  const [pos, setPos] = useState(0);          // quãng đã trượt (m)
  const [result, setResult] = useState<{ level: number; dist: number; hitEnd: boolean } | null>(null);
  const [tries, setTries] = useState<Record<number, number>>({});
  const raf = useRef<number | null>(null);
  const running = useRef(false);
  const maxDist = (AT.TRACK_R - 30 - (G1_X - 60)) / AT.PXM;
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const push = () => {
    if (running.current) return;
    running.current = true;
    setResult(null);
    const decel = decelOf(level);
    const stopDist = Math.min(maxDist, (DEMO_V0 * DEMO_V0) / (2 * decel));
    const tStop = (DEMO_V0 - Math.sqrt(Math.max(0, DEMO_V0 * DEMO_V0 - 2 * decel * stopDist))) / decel;
    const levelNow = level;
    let t0: number | null = null;
    const tick = (now: number) => {
      if (t0 === null) t0 = now;
      const t = Math.min(tStop, (now - t0) / 1000);
      setPos(DEMO_V0 * t - 0.5 * decel * t * t);
      if (t < tStop) raf.current = requestAnimationFrame(tick);
      else {
        running.current = false;
        setPos(stopDist);
        setResult({ level: levelNow, dist: stopDist, hitEnd: stopDist >= maxDist - 1e-6 });
        setTries((old) => ({ ...old, [levelNow]: stopDist }));
      }
    };
    raf.current = requestAnimationFrame(tick);
  };
  const reset = () => { if (!running.current) { setPos(0); setResult(null); } };
  const xs = G1_X - 60 + 42 + pos * AT.PXM;
  const fmtTry = (lv: number) => (tries[lv] == null ? "—" : tries[lv] >= maxDist - 1e-6 ? "hết máng" : `${(tries[lv] * 100).toFixed(0)} cm`);
  const tried = Object.keys(tries).length;

  return (
    <div className="animate-[fadeIn_0.25s_ease-out] flex flex-col gap-3">
      <PrelabStepHeading
        eyebrow="Máng đệm khí (2) · Máy nén khí (9)"
        title="Thử đệm khí: cùng một cú đẩy, xe đi được bao xa?"
        lead="Định luật 2 Newton nói về hợp lực. Muốn lực kéo F gần như là lực duy nhất theo phương chuyển động thì phải triệt tiêu ma sát — đó là việc của đệm khí. Đẩy nhẹ xe ở các nấc: máy tắt, nấc 1 (yếu), nấc 2 (vừa)."
      />
      <div className="rounded-2xl border border-[#E2DFD8] bg-white overflow-hidden">
        <svg viewBox="76 170 734 110" className="w-full h-auto block" role="img" aria-label="Máng đệm khí và xe trượt">
          <AirTrackRoom />
          <AirPump15 on={on} flow={flow} hose onToggle={() => { setOn((v) => !v); reset(); }} onKnob={() => { setFlow((f) => (f % 3) + 1); reset(); }} />
          <AirTrack15 level pump={level} />
          <Glider15 xs={xs} lift={[0, 0.6, 1.6, 2.2][level]} />
          {result && (
            <g>
              <line x1={G1_X - 60 + 42} y1={182} x2={xs} y2={182} stroke={result.level >= 2 ? "#2563EB" : "#DC2626"} strokeWidth="1.6" strokeDasharray="5 4" />
              <text x={(G1_X - 18 + xs) / 2} y={178} textAnchor="middle" fontSize="11" fontWeight="900" fill={result.level >= 2 ? "#1D4ED8" : "#B91C1C"}>
                {result.hitEnd ? "trượt hết máng!" : `${(result.dist * 100).toFixed(0)} cm rồi dừng`}
              </text>
            </g>
          )}
        </svg>
        <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
          <button type="button" onClick={() => { setOn((v) => !v); reset(); }}
            className={`h-10 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 border cursor-pointer ${on ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-rose-50 border-rose-300 text-rose-700"}`}>
            <Wind className="w-4 h-4" /> Máy: {on ? `BẬT · nấc ${flow}` : "TẮT"}
          </button>
          <button type="button" onClick={() => { setFlow((f) => (f % 3) + 1); reset(); }} disabled={!on}
            className="h-10 px-3 rounded-xl border border-[#E2DFD8] bg-white text-xs font-black text-[#605248] cursor-pointer disabled:opacity-40">Vặn núm: {FLOW_NAME[flow]}</button>
          <button type="button" onClick={push} className="h-10 px-4 rounded-xl bg-[#C85A17] hover:bg-[#B24A0C] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer">
            <Hand className="w-4 h-4" /> Đẩy nhẹ xe
          </button>
          <button type="button" onClick={reset} className="h-10 px-3 rounded-xl border border-[#E2DFD8] bg-white text-xs font-black text-[#605248] cursor-pointer">Đặt lại</button>
          <span className="text-[11.5px] font-bold text-[#605248] basis-full sm:basis-auto sm:ml-auto">
            Tắt: <b className="text-[#B91C1C]">{fmtTry(0)}</b> · Yếu: <b className="text-[#B45309]">{fmtTry(1)}</b> · Vừa: <b className="text-[#1D4ED8]">{fmtTry(2)}</b>
          </span>
        </div>
      </div>
      {tried >= 2 && (
        <p className="rounded-xl bg-[#FFF7ED] border border-[#C85A17]/20 px-3 py-2 text-[12px] font-bold text-[#321E12] leading-relaxed">
          Cùng một cú đẩy: đệm khí đủ thì xe gần như giữ nguyên vận tốc; máy tắt xe dừng sau vài cm; nấc yếu xe vẫn bị hãm. Trong Lab,
          <b> quên bật máy</b> hay <b>để nấc yếu</b> thì ma sát làm a đo được nhỏ hẳn — có khi xe còn không nhúc nhích!
        </p>
      )}
    </div>
  );
}

/* ============================ Bước 4 — Vì sao đặt tấm chắn sát cổng 1 ============================ */
function StartStep() {
  const [dCm, setDCm] = useState(2);
  const cfg = NEWTON2.sgkConfigs[2]; // F = 1 N, M + m = 0,5 kg
  const truth = newtonRun({ ...cfg, d: 0, withNoise: false });
  const run = newtonRun({ ...cfg, d: dCm / 100, withNoise: false });
  const shown = computeNewtonTime({ run });
  const aCalc = accelFromTime(Number(shown.display));
  const err = ((aCalc - truth.a) / truth.a) * 100;
  const xs = G1_X - (dCm / 100) * AT.PXM;
  return (
    <div className="animate-[fadeIn_0.25s_ease-out] flex flex-col gap-3">
      <PrelabStepHeading
        eyebrow="Lưu ý của SGK"
        title="Vì sao phải đặt tấm chắn sáng SÁT cổng quang 1?"
        lead="Công thức a = 2s/t² chỉ đúng khi lúc đồng hồ bắt đầu đếm, xe có v₀ = 0. Kéo thanh trượt để xe xuất phát lùi xa cổng 1 và xem a tính ra lệch thế nào."
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start">
        <div className="rounded-2xl border border-[#E2DFD8] bg-white overflow-hidden">
          <svg viewBox={`${G1_X - 110} 166 330 104`} className="w-full h-auto block" role="img" aria-label="Vị trí xuất phát của xe so với cổng quang 1">
            <AirTrackRoom />
            <AirTrack15 level pump />
            <Photogate15 x={G1_X} label="1" />
            <Glider15 xs={xs} lift={1.6} />
            {dCm > 0 && (
              <g>
                <line x1={xs} y1={184} x2={G1_X} y2={184} stroke="#DC2626" strokeWidth="1.6" />
                <text x={(xs + G1_X) / 2} y={180} textAnchor="middle" fontSize="10" fontWeight="900" fill="#B91C1C">d = {dCm.toFixed(1).replace(".", ",")} cm</text>
              </g>
            )}
            {dCm === 0 && <text x={G1_X - 14} y={180} textAnchor="middle" fontSize="10" fontWeight="900" fill="#15803D">sát cổng 1 ✓</text>}
          </svg>
          <div className="px-3 pb-3">
            <label className="text-[11px] font-black text-[#605248] uppercase tracking-wide" htmlFor="start-d">Xe xuất phát cách cổng 1: {dCm.toFixed(1).replace(".", ",")} cm</label>
            <input id="start-d" type="range" min={0} max={5} step={0.5} value={dCm} onChange={(e) => setDCm(Number(e.target.value))} className="w-full accent-[#C85A17]" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Đồng hồ chỉ t" value={`${shown.display.replace(".", ",")} s`} />
            <Stat label="a = 2s/t²" value={`${aCalc.toFixed(2).replace(".", ",")} m/s²`} tone={Math.abs(err) < 2 ? "ok" : "bad"} />
            <Stat label="a thật của hệ" value={`${truth.a.toFixed(2).replace(".", ",")} m/s²`} />
            <Stat label="Sai lệch" value={`${err >= 0 ? "+" : ""}${err.toFixed(0)} %`} tone={Math.abs(err) < 2 ? "ok" : "bad"} />
          </div>
          <p className="text-[12px] font-bold text-[#605248] leading-relaxed">
            {dCm === 0
              ? "Tấm chắn sát cổng 1: đồng hồ bắt đầu đếm đúng lúc xe bắt đầu chạy (v₀ = 0) → a = 2s/t² khớp a thật."
              : `Xe lùi ${dCm.toFixed(1).replace(".", ",")} cm: tới cổng 1 xe đã có vận tốc, đi 0,5 m nhanh hơn → t nhỏ → a tính ra LỚN hơn thật. Chỉ vài cm mà sai tới hàng chục phần trăm!`}
          </p>
          <div className="rounded-xl border border-[#E2DFD8] bg-[#FBF8F3] px-3 py-2 text-[11.5px] font-semibold text-[#605248] leading-relaxed">
            <b className="text-[#321E12]">Cách khác (SGK):</b> thay tấm chắn dài 1 cm, đo thời gian che mỗi cổng ⇒ <MathText text="$v_1 = \ell/t_1,\ v_2 = \ell/t_2$" /> rồi <MathText text="$a = \dfrac{v_2^2 - v_1^2}{2s}$" /> — cách này không cần v₀ = 0.
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${tone === "bad" ? "border-rose-200 bg-rose-50" : tone === "ok" ? "border-emerald-200 bg-emerald-50" : "border-[#E2DFD8] bg-white"}`}>
      <div className="text-[10px] font-black uppercase tracking-wide text-[#8C7B6B]">{label}</div>
      <div className={`text-[17px] font-black tabular-nums ${tone === "bad" ? "text-rose-700" : tone === "ok" ? "text-emerald-700" : "text-[#321E12]"}`}>{value}</div>
    </div>
  );
}
