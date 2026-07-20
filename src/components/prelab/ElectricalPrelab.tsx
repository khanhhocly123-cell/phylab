"use client";

import { useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Lock, MousePointerClick, PlugZap } from "lucide-react";
import type { ExperimentSpec } from "@/lib/types";

type Props = { spec: ExperimentSpec; viewOnly?: boolean; onFinish: () => void };
type MeterMode = "OFF" | "V" | "mA";

const A = "/lab/electric";

export default function ElectricalPrelab({ spec, viewOnly = false, onFinish }: Props) {
  const isEmf = spec.id === "do-suat-dien-dong-pin-dien-hoa";
  const [slide, setSlide] = useState(0);
  const [aMode, setAMode] = useState<MeterMode>("OFF");
  const [vMode, setVMode] = useState<MeterMode>("OFF");
  const [safe, setSafe] = useState(false);
  const modesOK = aMode === "mA" && vMode === "V";
  const ready = modesOK && safe;
  const total = 4;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-brand-orange/20 shadow-lg rounded-3xl p-5 md:p-6 my-4">
      <div className="flex items-center justify-between gap-4 border-b border-brand-orange/15 pb-4 mb-5">
        <div className="flex items-center gap-2.5"><div className="p-2 bg-brand-orange rounded-xl text-white"><BookOpen className="w-5 h-5"/></div><div><span className="text-[9px] font-black bg-brand-orange text-white px-2 py-0.5 rounded uppercase tracking-wider">Prelab · Điện lớp 11</span><h2 className="text-sm md:text-base font-black text-brand-blue uppercase mt-1.5">{spec.shortTitle}</h2></div></div>
        <div className="text-xs font-black text-brand-blue/60 bg-brand-cream/40 px-3 py-1 rounded-full border border-brand-orange/10">Trang {slide + 1} / {total}</div>
      </div>

      <div className="bg-[#fefbf5] rounded-3xl border border-slate-200 min-h-[480px] p-4 md:p-6 flex flex-col justify-between">
        <div className="flex-1 flex flex-col justify-center">
          {slide === 0 && <div className="max-w-2xl mx-auto text-center py-6">
            <div className="inline-flex items-center gap-2 text-[10px] tracking-[.18em] text-brand-orange font-black uppercase mb-3"><MousePointerClick className="w-4 h-4"/> Chuẩn bị trước khi lắp</div>
            <h3 className="text-xl md:text-2xl font-black text-brand-blue">Nhận diện đúng dụng cụ SVG sẽ dùng trong phòng Lab</h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed mt-4">Trong phòng Lab, em kéo từng dụng cụ từ khay bên trái vào ô sáng trên bảng lắp mạch. Chỉ sau khi lắp đủ mới được nối dây và cấp điện.</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-7">
              {(isEmf ? [
                ["Bảng lắp", `${A}/circuit-board.svg`], ["Pin", `${A}/battery.svg`], ["Khóa K", `${A}/switch-k.svg`], ["Điện trở", `${A}/protective-resistor.svg`], ["Biến trở", `${A}/rheostat.svg`], ["Đồng hồ", `${A}/multimeter.svg`],
              ] : [
                ["Bảng lắp", `${A}/circuit-board.svg`], ["Nguồn", `${A}/transformer.svg`], ["Khóa K", `${A}/switch-k.svg`], ["Vật dẫn", `${A}/protective-resistor.svg`], ["ĐO1", `${A}/multimeter.svg`], ["ĐO2", `${A}/multimeter.svg`],
              ]).map(([name, src]) => <div key={name} className="bg-white border border-brand-orange/15 rounded-2xl p-2 min-h-28 flex flex-col items-center justify-center"><img src={src} alt={name} className="w-full h-16 object-contain"/><b className="text-[10px] text-brand-blue mt-2">{name}</b></div>)}
            </div>
          </div>}

          {slide === 1 && <div className="max-w-3xl mx-auto w-full">
            <div className="text-center mb-5"><span className="text-[10px] font-black text-brand-orange uppercase">Thiết bị đo</span><h3 className="text-lg md:text-xl font-black text-brand-blue">Hai đồng hồ — hai kiểu mắc khác nhau</h3></div>
            <div className="grid sm:grid-cols-2 gap-5">
              <MeterCard title="Đồng hồ ĐO1" mode={aMode} setMode={setAMode} note="Ampe kế mắc nối tiếp, dây đỏ cắm cổng mA."/>
              <MeterCard title="Đồng hồ ĐO2" mode={vMode} setMode={setVMode} note="Vôn kế mắc song song, dây đỏ cắm cổng VΩ."/>
            </div>
            <div className={`mt-5 rounded-xl border p-3 text-xs font-bold text-center ${modesOK ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-orange-50 border-orange-200 text-orange-900"}`}>{modesOK ? "✓ Đúng: ĐO1 ở mA và ĐO2 ở V." : "Hãy đặt ĐO1 ở mA và ĐO2 ở V."}</div>
          </div>}

          {slide === 2 && <div className="max-w-3xl mx-auto w-full text-center">
            <span className="text-[10px] font-black text-brand-orange uppercase">Trình tự lắp</span><h3 className="text-lg md:text-xl font-black text-brand-blue mt-1">Lắp dụng cụ trước, nối dây sau</h3>
            <div className="relative mt-5 bg-white border border-brand-orange/15 rounded-2xl p-4 overflow-hidden"><img src={`${A}/circuit-board.svg`} alt="Bảng lắp mạch 216 nút" className="w-full max-h-72 object-contain opacity-55"/><div className="absolute inset-0 grid place-items-center pointer-events-none"><div className="bg-white/95 border border-brand-orange/30 rounded-2xl px-5 py-4 shadow-sm max-w-md"><PlugZap className="w-6 h-6 text-brand-orange mx-auto mb-2"/><p className="text-xs font-black text-brand-blue">Dây chỉ được kéo từ đúng chốt thiết bị đến chốt đích. Thả sai chốt sẽ không tạo kết nối.</p></div></div></div>
            <div className="grid sm:grid-cols-3 gap-3 mt-4 text-left text-[11px] font-bold text-slate-600"><div className="bg-white rounded-xl border p-3"><b className="text-brand-orange">1.</b> Kéo đúng thứ tự vào vòng sáng.</div><div className="bg-white rounded-xl border p-3"><b className="text-brand-orange">2.</b> Kéo đầu dây giữa các chốt.</div><div className="bg-white rounded-xl border p-3"><b className="text-brand-orange">3.</b> Chọn thang đo rồi mới đóng K.</div></div>
          </div>}

          {slide === 3 && <div className="max-w-xl mx-auto w-full text-center">
            <span className="text-[10px] font-black text-brand-orange uppercase">An toàn điện</span><h3 className="text-lg md:text-xl font-black text-brand-blue mt-1">Xác nhận trước khi vào phòng Lab</h3>
            <button onClick={() => setSafe((value) => !value)} className={`mt-6 w-full rounded-2xl border-2 p-5 text-left transition ${safe ? "bg-emerald-50 border-emerald-400" : "bg-white border-brand-orange/25"}`}><div className="flex gap-3"><div className={`w-7 h-7 rounded-full shrink-0 grid place-items-center ${safe ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>{safe && <Check className="w-4 h-4"/>}</div><div><b className="text-sm text-brand-blue">Luôn mở khóa K và tắt nguồn khi lắp hoặc đổi dây.</b><p className="text-xs font-semibold text-slate-500 mt-1">Kiểm tra đúng cổng cắm, đúng thang đo và đúng cực trước khi cấp điện.</p></div></div></button>
            {!modesOK && <p className="text-xs font-bold text-orange-800 mt-4">Quay lại trang 2 để đặt đúng hai đồng hồ.</p>}
          </div>}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-6">
          <button onClick={() => setSlide((value) => Math.max(0, value - 1))} disabled={slide === 0} className="px-4 py-2.5 border rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-40"><ChevronLeft className="w-4 h-4"/> Trang trước</button>
          <div className="flex gap-2">{Array.from({ length: total }).map((_, i) => <button key={i} onClick={() => setSlide(i)} className={`h-2.5 rounded-full transition-all ${i === slide ? "w-6 bg-brand-orange" : "w-2.5 bg-slate-300"}`}/>)}</div>
          {slide < total - 1 ? <button onClick={() => setSlide((value) => value + 1)} className="px-4 py-2.5 bg-brand-orange text-white rounded-xl text-xs font-bold flex items-center gap-1">Trang sau <ChevronRight className="w-4 h-4"/></button> : <button onClick={onFinish} disabled={!ready} className="px-5 py-2.5 bg-brand-orange text-white rounded-xl text-xs font-black flex items-center gap-1.5 disabled:bg-slate-200 disabled:text-slate-400">{ready ? <>{viewOnly ? "Đã xem xong" : "Vào phòng Lab"}<ChevronRight className="w-4 h-4"/></> : <><Lock className="w-3.5 h-3.5"/> Chưa hoàn tất</>}</button>}
        </div>
      </div>
    </div>
  );
}

function MeterCard({ title, mode, setMode, note }: { title: string; mode: MeterMode; setMode: (mode: MeterMode) => void; note: string }) {
  return <div className="bg-white border border-brand-orange/15 rounded-2xl p-4"><div className="flex gap-4 items-center"><div className="relative w-28 shrink-0"><img src={`${A}/multimeter.svg`} alt={title} className="w-full h-40 object-contain"/><div className="absolute left-[27%] right-[27%] top-[15%] h-7 bg-slate-900 rounded grid place-items-center text-[10px] font-mono font-black text-emerald-300">{mode === "OFF" ? "----" : mode}</div></div><div className="flex-1"><b className="text-sm text-brand-blue">{title}</b><p className="text-[11px] font-semibold text-slate-500 mt-1 mb-3">{note}</p><div className="grid grid-cols-3 gap-1">{(["OFF", "V", "mA"] as MeterMode[]).map((item) => <button key={item} onClick={() => setMode(item)} className={`py-2 rounded-lg text-[10px] font-black border ${mode === item ? "bg-brand-orange text-white border-brand-orange" : "bg-white text-slate-600"}`}>{item}</button>)}</div></div></div></div>;
}
