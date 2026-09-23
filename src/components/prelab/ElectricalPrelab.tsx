"use client";

import { useState } from "react";
import {
  BatteryCharging,
  Check,
  CircleDot,
  Gauge,
  Hand,
  MousePointerClick,
  PlugZap,
  Power,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import type { ExperimentSpec } from "@/lib/types";
import PrelabShell, { type PrelabStep } from "./PrelabShell";
import { Multimeter, DcSource, CircuitBoard, boardModuleRect, boardNode } from "../lab/electric/ElectricParts.jsx";

type Props = { spec: ExperimentSpec; viewOnly?: boolean; onFinish: () => void; onExit?: () => void };
type MeterMode = "OFF" | "V" | "Ω" | "mA" | "µA";
type PortId = "A" | "mAµA" | "COM" | "VΩ";

const MODES: MeterMode[] = ["OFF", "V", "Ω", "mA", "µA"];
const MODE_INFO: Record<MeterMode, { name: string; unit: string; description: string }> = {
  OFF: { name: "Tắt đồng hồ", unit: "—", description: "Đưa về OFF trước khi cắm/rút dây hoặc thay đổi mạch." },
  V: { name: "Đo hiệu điện thế", unit: "V", description: "Mắc song song với phần tử cần đo; que đỏ vào VΩ, que đen vào COM." },
  Ω: { name: "Đo điện trở", unit: "Ω", description: "Chỉ đo khi mạch đã mất điện và phần tử được tách khỏi nguồn." },
  mA: { name: "Đo dòng miliampe", unit: "mA", description: "Mắc nối tiếp trong mạch; que đỏ vào mAµA, que đen vào COM." },
  µA: { name: "Đo dòng microampe", unit: "µA", description: "Dùng cho dòng rất nhỏ; luôn bắt đầu từ thang lớn hơn để bảo vệ đồng hồ." },
};
const PORT_INFO: Record<PortId, { title: string; color: string; description: string }> = {
  A: { title: "Cổng A", color: "#991b1b", description: "Dòng lớn. Hai bài này không dùng cổng A để tránh quá tải." },
  mAµA: { title: "Cổng mA/µA", color: "#dc2626", description: "Cắm que đỏ khi ĐO1 làm ampe kế ở thang mA hoặc µA." },
  COM: { title: "Cổng COM", color: "#111827", description: "Cổng chung cho que đen (âm). Mọi phép đo đều cần một que ở COM." },
  VΩ: { title: "Cổng VΩ", color: "#dc2626", description: "Cắm que đỏ khi đo hiệu điện thế V hoặc điện trở Ω." },
};

export default function ElectricalPrelab({ spec, viewOnly = false, onFinish, onExit }: Props) {
  const isEmf = spec.id === "do-suat-dien-dong-pin-dien-hoa";
  const [slide, setSlide] = useState(0);
  const [mode, setMode] = useState<MeterMode>("OFF");
  const [modesSeen, setModesSeen] = useState<Set<MeterMode>>(() => new Set(["OFF"]));
  const [selectedPort, setSelectedPort] = useState<PortId>("COM");
  const [portsSeen, setPortsSeen] = useState<Set<PortId>>(() => new Set(["COM"]));
  const [sourceOn, setSourceOn] = useState(false);
  const [sourceVoltage, setSourceVoltage] = useState(3);
  const [networkPair, setNetworkPair] = useState(0);
  const [safe, setSafe] = useState(false);
  const exploredModes = modesSeen.size === MODES.length;
  const exploredPorts = portsSeen.size === Object.keys(PORT_INFO).length;
  const ready = exploredModes && exploredPorts && safe;

  const visitMode = (next: MeterMode) => {
    setMode(next);
    setModesSeen((old) => new Set(old).add(next));
  };
  const visitPort = (port: PortId) => {
    setSelectedPort(port);
    setPortsSeen((old) => new Set(old).add(port));
  };

  const missing = [
    !exploredModes && `${MODES.length - modesSeen.size} nấc núm xoay`,
    !exploredPorts && `${Object.keys(PORT_INFO).length - portsSeen.size} cổng cắm`,
    !safe && "xác nhận an toàn",
  ].filter(Boolean).join(" · ");
  const steps: PrelabStep[] = [
    { key: "overview", label: "Tổng quan" },
    { key: "modes", label: "Núm xoay", done: exploredModes },
    { key: "ports", label: "Cổng cắm", done: exploredPorts },
    { key: isEmf ? "board" : "source", label: isEmf ? "Bảng mạch" : "Nguồn DC" },
    { key: "safety", label: "An toàn", done: safe },
  ];

  return (
    <PrelabShell
      spec={spec}
      steps={steps}
      current={slide}
      onStep={setSlide}
      mode={viewOnly ? "review" : "gate"}
      canFinish={ready}
      requirement={`Còn thiếu: ${missing}`}
      onFinish={onFinish}
      onExit={onExit}
    >
      <div className="min-h-[440px] flex flex-col justify-center">
        {slide === 0 && (
          <div className="max-w-3xl mx-auto text-center py-4">
            <div className="inline-flex items-center gap-2 text-[10px] tracking-[.18em] text-brand-orange font-black uppercase mb-3"><MousePointerClick className="w-4 h-4" /> Làm quen trước khi lắp</div>
            <h3 className="text-xl md:text-2xl font-black text-brand-blue">Chỉ học những dụng cụ quyết định phép đo</h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed mt-4">
              {isEmf
                ? "Em sẽ học cách dùng đồng hồ đa năng và cách các nút trong cùng một mạng trên bảng lắp mạch nối điện với nhau. Các linh kiện còn lại sẽ được giới thiệu đúng lúc trong phòng Lab."
                : "Bài 23 dùng mạch nổi, không có bảng lắp mạch. Em chỉ cần nắm chắc đồng hồ đa năng và nguồn DC điều chỉnh trước khi vào bàn thí nghiệm."}
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-7 text-left">
              <IntroCard icon={<Gauge className="w-5 h-5" />} title="Đồng hồ đa năng hiện số" text="Một thân máy, năm nấc chức năng. Màn hình và cổng cắm thay đổi ý nghĩa theo nấc đang chọn." visual={<svg viewBox="0 0 130 214" className="h-full w-auto"><Multimeter at={{ x: 0, y: 0, s: 1 }} mode="V" reading={0} /></svg>} />
              {isEmf
                ? <IntroCard icon={<CircleDot className="w-5 h-5" />} title="Bảng lắp mạch 216 nút" text="24 mạng độc lập; 9 nút trong cùng một mạng dẫn điện với nhau." visual={<svg viewBox="0 0 994 684" className="w-full h-auto"><CircuitBoard at={{ x: 0, y: 0, s: 1 }} /></svg>} />
                : <IntroCard icon={<BatteryCharging className="w-5 h-5" />} title="Nguồn DC điều chỉnh" text="Cấp hiệu điện thế cho mạch; chỉ bật sau khi nối đúng và mở khóa K." visual={<svg viewBox="0 0 200 150" className="w-full h-auto"><DcSource at={{ x: 0, y: 0, s: 1 }} on voltage={4} /></svg>} />}
            </div>
          </div>
        )}

        {slide === 1 && (
          <div className="max-w-4xl mx-auto w-full">
            <SectionHeading eyebrow="Núm xoay 5 nấc" title="Chạm núm xoay (hoặc các nấc bên cạnh) để thử đủ năm chế độ" />
            <div className="grid md:grid-cols-[minmax(260px,360px)_1fr] gap-5 items-center mt-5">
              <InteractiveMeter mode={mode} onMode={visitMode} selectedPort={selectedPort} onPort={visitPort} showPorts={false} />
              <div>
                <div className="rounded-2xl border border-brand-orange/20 bg-white p-4">
                  <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-brand-orange text-white grid place-items-center shrink-0"><RotateCw className="w-5 h-5" /></div><div><div className="text-[10px] font-black uppercase tracking-wider text-brand-orange">{mode}</div><h4 className="font-black text-brand-blue">{MODE_INFO[mode].name}</h4><p className="text-xs font-semibold text-slate-500 leading-relaxed mt-1">{MODE_INFO[mode].description}</p></div></div>
                </div>
                <div className="grid grid-cols-5 gap-2 mt-3">{MODES.map((item) => <button key={item} type="button" onClick={() => visitMode(item)} className={`rounded-xl border py-2 text-xs font-black transition ${mode === item ? "bg-brand-orange border-brand-orange text-white" : modesSeen.has(item) ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-500"}`}>{modesSeen.has(item) && mode !== item ? "✓ " : ""}{item}</button>)}</div>
                <ProgressHint done={exploredModes} text={exploredModes ? "Đã thử đủ 5 nấc. Trong Lab, ĐO1 dùng mA và ĐO2 dùng V." : `Đã thử ${modesSeen.size}/5 nấc — tiếp tục chạm núm.`} />
              </div>
            </div>
          </div>
        )}

        {slide === 2 && (
          <div className="max-w-4xl mx-auto w-full">
            <SectionHeading eyebrow="Bốn cổng cắm" title="Chạm từng jack để biết dây nào được cắm vào đâu" />
            <div className="grid md:grid-cols-[minmax(260px,360px)_1fr] gap-5 items-center mt-5">
              <InteractiveMeter mode={mode} onMode={visitMode} selectedPort={selectedPort} onPort={visitPort} />
              <div>
                <div className="rounded-2xl border border-brand-orange/20 bg-white p-4 min-h-32">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: PORT_INFO[selectedPort].color }} /><h4 className="font-black text-brand-blue">{PORT_INFO[selectedPort].title}</h4></div>
                  <p className="text-xs font-semibold text-slate-500 leading-relaxed mt-2">{PORT_INFO[selectedPort].description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">{(Object.keys(PORT_INFO) as PortId[]).map((port) => <button key={port} type="button" onClick={() => visitPort(port)} className={`rounded-xl border px-3 py-2 text-left text-xs font-black ${selectedPort === port ? "border-brand-orange bg-orange-50 text-brand-orange" : portsSeen.has(port) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}>{portsSeen.has(port) && selectedPort !== port ? "✓ " : ""}{PORT_INFO[port].title}</button>)}</div>
                <ProgressHint done={exploredPorts} text={exploredPorts ? "Đã xem đủ 4 cổng. Nhớ: que đen luôn ở COM." : `Đã xem ${portsSeen.size}/4 cổng — hãy chạm các jack còn lại.`} />
              </div>
            </div>
          </div>
        )}

        {slide === 3 && (
          <div className="max-w-4xl mx-auto w-full">
            {isEmf ? (
              <>
                <SectionHeading eyebrow="Bảng lắp mạch" title="Một mạng có 9 nút dẫn điện với nhau" />
                <div className="grid md:grid-cols-[1.15fr_.85fr] gap-5 items-center mt-5">
                  <button type="button" onClick={() => setNetworkPair((value) => (value + 1) % 3)} className="rounded-2xl border border-brand-orange/20 bg-white p-3 text-left cursor-pointer" aria-label="Chạm để xem cặp mạng khác">
                    <BoardNetworks pair={networkPair} />
                    <span className="block text-center text-[10px] font-bold text-slate-500 mt-1">Chạm để xem cặp mạng khác · cam = mạng 1, xanh = mạng 2</span>
                  </button>
                  <div className="space-y-3 text-xs font-semibold text-slate-600">
                    <InfoRow n="1" text="Cắm hai chân linh kiện vào hai nút của hai mạng khác nhau." />
                    <InfoRow n="2" text="Muốn nối tiếp hai linh kiện, cho một chân của mỗi linh kiện vào cùng một mạng." />
                    <InfoRow n="3" text="Trong Lab, chốt đích hợp lệ sẽ sáng; chạm chốt đầu rồi chạm chốt sáng để nối." />
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 font-bold text-amber-900">Không cắm hai chân của cùng một linh kiện vào cùng một mạng.</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <SectionHeading eyebrow="Nguồn DC điều chỉnh" title="Bật nguồn và chỉnh điện áp ra" />
                <div className="grid md:grid-cols-[1fr_1fr] gap-5 items-center mt-5">
                  <div className="rounded-2xl border border-brand-orange/20 bg-white p-5 flex justify-center"><svg viewBox="0 0 200 150" className="w-full max-w-[340px] h-auto" role="img" aria-label="Nguồn điện một chiều điều chỉnh được"><DcSource at={{ x: 0, y: 0, s: 1 }} on={sourceOn} voltage={sourceVoltage} onTogglePower={() => setSourceOn((value) => !value)} onStepVoltage={() => setSourceVoltage((value) => (value >= 10 ? 1 : value + 1))} /></svg></div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <button type="button" onClick={() => setSourceOn((value) => !value)} className={`w-full rounded-xl py-3 font-black flex items-center justify-center gap-2 ${sourceOn ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}><Power className="w-4 h-4" /> Nguồn {sourceOn ? "ĐANG BẬT" : "ĐANG TẮT"}</button>
                    <label className="block mt-4 text-xs font-bold text-slate-600">Điện áp đặt: <b className="text-brand-orange">{sourceVoltage} V</b><input aria-label="Điện áp nguồn" type="range" min="1" max="10" step="1" value={sourceVoltage} onChange={(event) => setSourceVoltage(Number(event.target.value))} className="w-full mt-2 accent-orange-600" /></label>
                    <p className="text-xs font-semibold text-slate-500 mt-4 leading-relaxed">Trong Lab: lắp/đổi dây khi đã mở K và tắt nguồn → bật nguồn → đóng K → chỉnh U từng mức (bấm núm hoặc chọn trong bảng) rồi ghi số đo.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {slide === 4 && (
          <div className="max-w-2xl mx-auto w-full text-center py-3">
            <SectionHeading eyebrow="Kiểm tra trước khi vào Lab" title="An toàn trước, cấp điện sau" />
            <div className="grid sm:grid-cols-3 gap-3 mt-6 text-left">
              <SafetyCard icon={<Power className="w-4 h-4" />} title="Mở K / tắt nguồn" text="Trước khi lắp hoặc thay đổi dây." />
              <SafetyCard icon={<PlugZap className="w-4 h-4" />} title="Đúng cổng" text="COM + mAµA cho dòng; COM + VΩ cho áp." />
              <SafetyCard icon={<ShieldCheck className="w-4 h-4" />} title="Đúng nấc" text="ĐO1 ở mA, ĐO2 ở V rồi mới đóng K." />
            </div>
            <button type="button" onClick={() => setSafe((value) => !value)} className={`mt-5 w-full rounded-2xl border-2 p-4 text-left transition ${safe ? "bg-emerald-50 border-emerald-400" : "bg-white border-brand-orange/25"}`}>
              <div className="flex gap-3"><div className={`w-7 h-7 rounded-full shrink-0 grid place-items-center ${safe ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>{safe ? <Check className="w-4 h-4" /> : <Hand className="w-4 h-4" />}</div><div><b className="text-sm text-brand-blue">Em đã hiểu quy trình an toàn và cách chọn đúng cổng, đúng nấc.</b><p className="text-xs font-semibold text-slate-500 mt-1">Chạm để xác nhận.</p></div></div>
            </button>
            {(!exploredModes || !exploredPorts) && <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs font-bold text-orange-900">Còn thiếu: {!exploredModes ? `${5 - modesSeen.size} nấc VOM` : ""}{!exploredModes && !exploredPorts ? " · " : ""}{!exploredPorts ? `${4 - portsSeen.size} cổng cắm` : ""}. Bấm tên bước ở thanh trên để quay lại.</div>}
          </div>
        )}
      </div>
    </PrelabShell>
  );
}

const JACK_OF: Record<PortId, string> = { A: "A", mAµA: "mA", COM: "COM", VΩ: "V" };
const PORT_OF: Record<string, PortId> = { A: "A", mA: "mAµA", COM: "COM", V: "VΩ" };

function InteractiveMeter({ mode, onMode, selectedPort, onPort, showPorts = true }: { mode: MeterMode; onMode: (mode: MeterMode) => void; selectedPort: PortId; onPort: (port: PortId) => void; showPorts?: boolean }) {
  const step = () => onMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
  return (
    <div className="rounded-2xl border border-brand-orange/20 bg-white p-3 select-none">
      <svg viewBox="0 0 130 214" className="mx-auto block w-[220px] max-w-full h-auto" role="img" aria-label="Đồng hồ đa năng hiện số">
        <Multimeter
          at={{ x: 0, y: 0, s: 1 }}
          mode={mode}
          reading={0}
          title="ĐỒNG HỒ ĐA NĂNG"
          onCycleMode={step}
          selectedJack={showPorts ? JACK_OF[selectedPort] : undefined}
          onJack={showPorts ? (id: string) => onPort(PORT_OF[id]) : undefined}
        />
      </svg>
      <div className="flex items-center justify-center gap-2 mt-2 text-[10px] font-bold text-slate-500">
        <RotateCw className="w-3.5 h-3.5" /> {showPorts ? "Chạm lỗ cắm để xem công dụng" : "Chạm núm xoay để chuyển nấc"}
      </div>
    </div>
  );
}

/** Bảng lắp mạch với 2 mạng được tô đúng vị trí nút (lấy từ metadata của ảnh bảng). */
function BoardNetworks({ pair }: { pair: number }) {
  const colA = pair * 2;
  const colB = pair * 2 + 1;
  const a = boardModuleRect(0, colA);
  const b = boardModuleRect(0, colB);
  const legA = boardNode(0, colA, 1, 2);
  const legB = boardNode(0, colB, 1, 0);
  const mid = { x: (legA.x + legB.x) / 2, y: legA.y };
  return (
    <svg viewBox="0 0 994 684" className="w-full h-auto block" role="img" aria-label="Bảng lắp mạch 216 nút, hai mạng được tô sáng">
      <CircuitBoard at={{ x: 0, y: 0, s: 1 }} />
      <rect x={a.x} y={a.y} width={a.w} height={a.h} rx="18" fill="#FB923C33" stroke="#EA580C" strokeWidth="7">
        <animate attributeName="opacity" values="1;0.55;1" dur="1.6s" repeatCount="indefinite" />
      </rect>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="18" fill="#22C55E26" stroke="#16A34A" strokeWidth="7" />
      <line x1={legA.x} y1={legA.y} x2={legB.x} y2={legB.y} stroke="#6B7280" strokeWidth="6" strokeLinecap="round" />
      <rect x={mid.x - 20} y={mid.y - 11} width="40" height="22" rx="9" fill="#F3E3C3" stroke="#8A6D3B" strokeWidth="3" />
      <circle cx={legA.x} cy={legA.y} r="9" fill="#6B7280" />
      <circle cx={legB.x} cy={legB.y} r="9" fill="#6B7280" />
      <text x={a.x + a.w / 2} y={a.y + a.h + 40} textAnchor="middle" fontSize="30" fontWeight="900" fill="#C2410C">Mạng 1</text>
      <text x={b.x + b.w / 2} y={b.y + b.h + 40} textAnchor="middle" fontSize="30" fontWeight="900" fill="#15803D">Mạng 2</text>
    </svg>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="text-center"><span className="text-[10px] font-black text-brand-orange uppercase tracking-[.16em]">{eyebrow}</span><h3 className="text-lg md:text-xl font-black text-brand-blue mt-1">{title}</h3></div>;
}

function IntroCard({ icon, title, text, visual }: { icon: React.ReactNode; title: string; text: string; visual: React.ReactNode }) {
  return <div className="rounded-2xl border border-brand-orange/15 bg-white p-4 flex items-center gap-4"><div aria-hidden className="w-24 h-24 rounded-xl bg-[#fef9f2] grid place-items-center shrink-0 p-1.5 overflow-hidden">{visual}</div><div><div className="w-8 h-8 rounded-lg bg-brand-orange text-white grid place-items-center mb-2">{icon}</div><h4 className="text-sm font-black text-brand-blue">{title}</h4><p className="text-[11px] font-semibold text-slate-500 leading-relaxed mt-1">{text}</p></div></div>;
}

function ProgressHint({ done, text }: { done: boolean; text: string }) {
  return <div className={`mt-3 rounded-xl border p-3 text-xs font-bold text-center ${done ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-orange-50 border-orange-200 text-orange-900"}`}>{done ? "✓ " : ""}{text}</div>;
}

function InfoRow({ n, text }: { n: string; text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3 flex gap-3"><span className="w-6 h-6 rounded-lg bg-brand-orange text-white grid place-items-center font-black shrink-0">{n}</span><span>{text}</span></div>;
}

function SafetyCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-brand-orange/15 bg-white p-3"><div className="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange grid place-items-center mb-2">{icon}</div><b className="text-xs text-brand-blue">{title}</b><p className="text-[11px] font-semibold text-slate-500 mt-1">{text}</p></div>;
}
