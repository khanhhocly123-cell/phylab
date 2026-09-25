"use client";

import { useState } from "react";
import { CircleCheck, Lightbulb, Lock, Search, ShieldCheck } from "lucide-react";

/* =============================================================================================
   "Săn nguy hiểm" — một góc phòng thí nghiệm có 4 chỗ mất an toàn (theo SGK Vật lí 10 — Bài 2:
   nước gần thiết bị điện, dây sờn, kẹp điện chạm nhau, chất dễ cháy gần mạch điện) lẫn vài chỗ
   an toàn để "đánh lừa". Học sinh bấm vào chỗ nghi ngờ để khám phá.
   ============================================================================================= */

type Spot = { id: string; x: number; y: number; r?: number; w?: number; h?: number; label: string };
const HAZARDS: Array<Spot & { title: string; text: string }> = [
  { id: "water", x: 36, y: 160, w: 144, h: 54, label: "Ổ cắm và cốc nước", title: "Cốc nước sát ổ điện", text: "Nước đổ vào ổ cắm gây chập điện, giật điện. Để nước, dung dịch xa thiết bị điện." },
  { id: "frayed", x: 318, y: 204, r: 20, label: "Đoạn dây đỏ", title: "Dây điện sờn, hở lõi", text: "Chạm vào lõi đồng là bị giật; hai lõi chạm nhau thì đoản mạch. Không dùng, báo giáo viên thay dây." },
  { id: "clips", x: 396, y: 172, r: 22, label: "Hai kẹp điện", title: "Hai kẹp điện chạm nhau", text: "Đoản mạch: dòng rất lớn làm dây nóng, có thể cháy. Luôn tách các kẹp, đầu dây ra xa nhau." },
  { id: "alcohol", x: 479, y: 166, r: 28, label: "Chai cồn", title: "Chai cồn cạnh mạch điện", text: "Chất dễ cháy gặp tia lửa điện là bắt lửa. Cất xa khu vực có điện và nguồn nhiệt." },
];
const SAFE: Array<Spot & { text: string }> = [
  { id: "supply", x: 236, y: 168, r: 26, label: "Nguồn điện", text: "Nguồn đặt chắc chắn, đang ở mức điện áp thấp — chỗ này ổn." },
  { id: "meter", x: 529, y: 184, r: 20, label: "Đồng hồ đo", text: "Đồng hồ để gọn, que đo cuộn lại — an toàn." },
  { id: "extinguisher", x: 481, y: 252, r: 20, label: "Bình chữa cháy", text: "Bình chữa cháy để chỗ dễ lấy — rất tốt!" },
  { id: "exit", x: 507, y: 40, r: 24, label: "Biển lối thoát", text: "Biển lối thoát hiểm rõ ràng — đúng quy định." },
];

function Hotspot({ spot, onPick, ring }: { spot: Spot; onPick: () => void; ring?: string }) {
  const common = {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": `Kiểm tra: ${spot.label}`,
    onClick: onPick,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(); } },
    style: { cursor: "pointer" },
    fill: "transparent",
    stroke: ring ?? "transparent",
    strokeWidth: ring ? 2.5 : 0,
    strokeDasharray: ring ? "6 5" : undefined,
  };
  return spot.w ? (
    <rect x={spot.x} y={spot.y} width={spot.w} height={spot.h} rx="14" {...common} className={ring ? "sch-blink" : undefined} />
  ) : (
    <circle cx={spot.x} cy={spot.y} r={spot.r} {...common} className={ring ? "sch-blink" : undefined} />
  );
}

const center = (s: Spot) => (s.w ? { x: s.x + s.w / 2, y: s.y + (s.h ?? 0) / 2 } : { x: s.x, y: s.y });

export default function HazardHunt() {
  const [found, setFound] = useState<string[]>([]);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const done = found.length === HAZARDS.length;

  const pickHazard = (id: string) => {
    const h = HAZARDS.find((x) => x.id === id)!;
    setHint(null);
    if (!found.includes(id)) setFound((old) => [...old, id]);
    setNote({ ok: true, text: `Chuẩn! ${h.title}.` });
  };
  const pickSafe = (text: string) => setNote({ ok: false, text });
  const showHint = () => {
    const next = HAZARDS.find((h) => !found.includes(h.id));
    if (next) {
      setHint(next.id);
      setNote({ ok: false, text: "Nhìn chỗ có vòng nhấp nháy xem…" });
    }
  };

  return (
    <div className="grid md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-3 items-start">
      <div className="relative rounded-2xl border border-[#EBC9A8] overflow-hidden bg-[#FFF4E6]">
        <svg viewBox="0 0 560 280" className="block w-full h-auto select-none" role="group" aria-label="Góc phòng thí nghiệm — tìm 4 chỗ không an toàn">
          {/* Tường, biển lối thoát */}
          <rect width="560" height="206" fill="#FFF4E6" />
          {[70, 170, 270, 370, 470].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="206" stroke="#F5E3CA" strokeWidth="2" />)}
          <rect x="30" y="22" width="120" height="70" rx="6" fill="#fff" stroke="#E7D3B6" strokeWidth="2" />
          <path d="M44 72 L70 48 L92 62 L114 38 L136 54" fill="none" stroke="#FDBA74" strokeWidth="3" strokeLinecap="round" />
          <g>
            <rect x="480" y="26" width="54" height="28" rx="4" fill="#16A34A" />
            <rect x="487" y="31" width="12" height="18" rx="1.5" fill="none" stroke="#fff" strokeWidth="2" />
            <path d="M505 40 H526 M519 34 L526 40 L519 46" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {/* Bàn, sàn */}
          <rect x="0" y="262" width="560" height="18" fill="#EFE3D0" />
          <rect x="0" y="206" width="560" height="16" fill="#C89B6D" />
          <rect x="0" y="222" width="560" height="6" fill="#A87B4F" />
          <rect x="26" y="228" width="10" height="34" fill="#A87B4F" />
          <rect x="522" y="228" width="10" height="34" fill="#A87B4F" />

          {/* 1. Ổ cắm + cốc nước (nguy hiểm) */}
          <path d="M0 201 L40 201" stroke="#374151" strokeWidth="3" />
          <rect x="40" y="194" width="98" height="13" rx="4" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="1.5" />
          {[50, 74, 98].map((x) => <rect key={x} x={x} y="197" width="16" height="7" rx="2" fill="#D1D5DB" />)}
          <rect x="101" y="184" width="14" height="12" rx="2.5" fill="#1F2937" />
          <path d="M108 184 C 108 162, 64 158, 20 146" fill="none" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
          <path d="M148 170 L172 170 L169 206 L151 206 Z" fill="#E0F2FE" stroke="#7DB9E8" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M149.3 183 L170.7 183 L169 206 L151 206 Z" fill="#60A5FA" opacity="0.55" />
          <path d="M152 174 L153.5 200" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
          <circle cx="142" cy="204" r="2.4" fill="#93C5FD" />
          <circle cx="146" cy="201" r="1.6" fill="#93C5FD" />

          {/* 2. Nguồn điện (an toàn) + dây đỏ bị sờn (nguy hiểm) + dây đen */}
          <rect x="190" y="140" width="92" height="66" rx="7" fill="#E5E7EB" stroke="#6B7280" strokeWidth="1.8" />
          <rect x="200" y="150" width="42" height="17" rx="3" fill="#0F172A" />
          <text x="221" y="163" textAnchor="middle" fontSize="11" fontWeight="800" fill="#34D399" fontFamily="ui-monospace, monospace">3.0V</text>
          <circle cx="263" cy="159" r="9" fill="#9CA3AF" stroke="#4B5563" strokeWidth="1.6" />
          <line x1="263" y1="159" x2="263" y2="151.5" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
          <circle cx="207" cy="190" r="5" fill="#DC2626" stroke="#7F1D1D" strokeWidth="1.2" />
          <circle cx="229" cy="190" r="5" fill="#1F2937" stroke="#000" strokeWidth="1.2" />
          <path d="M229 190 C 250 226, 330 224, 409 184" fill="none" stroke="#1F2937" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M207 190 C 226 214, 276 214, 304 205" fill="none" stroke="#DC2626" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M304 205 l3 -4 l3 5 l3 -5 l3 5 l3 -4 l3 4 l3 -3 l3 3" fill="none" stroke="#D97706" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M304 207 l3 3 l3 -3 l3 4 l3 -4 l3 3 l3 -3 l3 3" fill="none" stroke="#B45309" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M331 204 C 352 199, 366 190, 381 177" fill="none" stroke="#DC2626" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M301 200 l2 -3 M301 210 l2 3 M334 199 l-2 -3 M334 209 l-2 3" stroke="#991B1B" strokeWidth="1.4" strokeLinecap="round" />

          {/* 3. Bảng mạch + hai kẹp chạm nhau (nguy hiểm) */}
          <rect x="344" y="190" width="104" height="16" rx="3" fill="#FEF3C7" stroke="#D6B48C" strokeWidth="1.4" />
          {[354, 366, 378, 390, 402, 414, 426, 438].map((x) => <circle key={x} cx={x} cy="198" r="1.6" fill="#C4A77D" />)}
          <path d="M378 182 L392 172 L398 176 L384 186 Z" fill="#EF4444" stroke="#7F1D1D" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M414 184 L400 172 L394 176 L408 188 Z" fill="#374151" stroke="#111827" strokeWidth="1.3" strokeLinejoin="round" />
          <g stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
            <path d="M396 166 L396 158" />
            <path d="M390 167 L385 161" />
            <path d="M402 167 L407 161" />
          </g>
          <circle cx="396" cy="171" r="2.6" fill="#FDE047" />

          {/* 4. Chai cồn (nguy hiểm) */}
          <rect x="473" y="128" width="12" height="15" rx="2" fill="#E0E7FF" stroke="#93A5D8" strokeWidth="1.4" />
          <rect x="471" y="124" width="16" height="6" rx="2" fill="#6366F1" />
          <path d="M464 150 Q464 142 473 142 L485 142 Q494 142 494 150 L494 202 Q494 206 490 206 L468 206 Q464 206 464 202 Z" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1.6" />
          <path d="M465 170 L493 170 L493 202 Q493 205 490 205 L468 205 Q465 205 465 202 Z" fill="#BFDBFE" opacity="0.7" />
          <rect x="467" y="156" width="24" height="22" rx="3" fill="#fff" stroke="#F97316" strokeWidth="1.4" />
          <text x="479" y="167" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#C2410C">CỒN</text>
          <path d="M479 176 Q475 172 478 168 Q479 171 481 170 Q483 173 479 176 Z" fill="#F97316" />

          {/* Đồng hồ đo (an toàn) */}
          <rect x="512" y="162" width="34" height="44" rx="5" fill="#FACC15" stroke="#92400E" strokeWidth="1.5" />
          <rect x="517" y="167" width="24" height="10" rx="2" fill="#1F2937" />
          <circle cx="529" cy="190" r="6" fill="#374151" />
          <path d="M514 206 C 500 214, 506 222, 520 216" fill="none" stroke="#DC2626" strokeWidth="2" />

          {/* Bình chữa cháy (an toàn) */}
          <rect x="472" y="236" width="18" height="30" rx="6" fill="#DC2626" stroke="#7F1D1D" strokeWidth="1.4" />
          <rect x="476" y="230" width="10" height="7" rx="2" fill="#374151" />
          <path d="M486 232 C 496 232, 498 244, 494 252" fill="none" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="475" y="245" width="12" height="8" rx="1.5" fill="#fff" opacity="0.85" />

          {/* Đánh dấu chỗ đã tìm ra */}
          {HAZARDS.filter((h) => found.includes(h.id)).map((h) => {
            const c = center(h);
            const n = HAZARDS.indexOf(h) + 1;
            return (
              <g key={`mark-${h.id}`} pointerEvents="none">
                <circle cx={c.x} cy={c.y} r={(h.r ?? 26) + 6} fill="none" stroke="#DC2626" strokeWidth="3" />
                <circle cx={c.x + (h.r ?? 30)} cy={c.y - (h.r ?? 18)} r="10" fill="#DC2626" stroke="#fff" strokeWidth="2" />
                <text x={c.x + (h.r ?? 30)} y={c.y - (h.r ?? 18) + 4} textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">{n}</text>
              </g>
            );
          })}

          {/* Vùng bấm */}
          {SAFE.map((s) => <Hotspot key={s.id} spot={s} onPick={() => pickSafe(s.text)} />)}
          {HAZARDS.map((h) => <Hotspot key={h.id} spot={h} onPick={() => pickHazard(h.id)} ring={hint === h.id ? "#F59E0B" : undefined} />)}
        </svg>
        {note && (
          <div className={`absolute left-2 top-2 right-2 sm:right-auto sm:max-w-[70%] rounded-xl px-3 py-1.5 text-[12px] font-black shadow-md ${note.ok ? "bg-[#FEF2F2] text-[#B91C1C] border border-red-200" : "bg-white text-[#4E3F34] border border-[#EBC9A8]"}`}>
            {note.text}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-black text-[#4E3F34]">
            <Search className="w-4 h-4 text-[#B45309]" /> Đã tìm <b className="tabular-nums text-[#B91C1C]">{found.length}/{HAZARDS.length}</b>
          </span>
          {!done && (
            <button type="button" onClick={showHint} className="inline-flex items-center gap-1 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-2 py-1 text-[11px] font-black text-[#92400E] hover:bg-[#FEF3C7] cursor-pointer">
              <Lightbulb className="w-3.5 h-3.5" /> Gợi ý
            </button>
          )}
        </div>
        {HAZARDS.map((h, i) => {
          const hit = found.includes(h.id);
          return (
            <div key={h.id} className={`rounded-xl border px-2.5 py-2 ${hit ? "border-red-200 bg-[#FEF2F2]" : "border-dashed border-[#E7DDCD] bg-[#FBF7F1]"}`}>
              {hit ? (
                <>
                  <b className="text-[12px] font-black text-[#B91C1C]">{i + 1}. {h.title}</b>
                  <p className="text-[11px] font-semibold text-[#5A4A3E] leading-snug mt-0.5">{h.text}</p>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#B3A597]"><Lock className="w-3.5 h-3.5" /> Chỗ nguy hiểm thứ {i + 1} — chưa tìm ra</span>
              )}
            </div>
          );
        })}
        {done && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] font-black text-emerald-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Mắt tinh ghê! Đủ 4/4 — em đã sẵn sàng hơn rồi đó.
            <CircleCheck className="w-4 h-4 ml-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
