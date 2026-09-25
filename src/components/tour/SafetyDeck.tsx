"use client";

import { useState } from "react";
import {
  Aperture,
  BookOpenCheck,
  FlaskRound,
  RotateCcw,
  Cable,
  Check,
  DoorOpen,
  Droplets,
  Eye,
  Flame,
  Gauge,
  Wrench,
  Leaf,
  ListChecks,
  Magnet,
  Plug,
  PowerOff,
  Radiation,
  Skull,
  Thermometer,
  Trash2,
  TriangleAlert,
  UserRound,
  Wine,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { LAB_CATALOG, type LabSubject } from "@/data/labCatalog";
import type { SafetyKind } from "@/lib/tourState";

/* =============================================================================================
   Bộ "An toàn phòng thí nghiệm" — tóm tắt theo SGK Vật lí 10 (KNTT), Bài 2: kí hiệu trên thiết bị,
   biển báo, ba nhóm nguy cơ, quy tắc, xử lí sự cố; kèm phần áp dụng cho dụng cụ trong PhyLab.
   Lời văn viết lại ngắn gọn cho màn hình, hình vẽ bằng SVG + icon (không dùng ảnh sách).
   ============================================================================================= */

const INK = "#1F2937";

/* ---------- Kí hiệu trên thiết bị ---------- */

function TriangleSign({ children, size = 40 }: { children: React.ReactNode; size?: number }) {
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" className="absolute inset-0" aria-hidden>
        <path d="M20 3 L38 36 H2 Z" fill="#FACC15" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      </svg>
      <span className="relative mt-2.5 text-[#111827] grid place-items-center">{children}</span>
    </span>
  );
}

function LaserGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="w-[15px] h-[15px]" aria-hidden>
      <circle cx="12" cy="10" r="2.6" fill={INK} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1={12 + 4.2 * Math.cos((a * Math.PI) / 180)} y1={10 + 4.2 * Math.sin((a * Math.PI) / 180)} x2={12 + 7 * Math.cos((a * Math.PI) / 180)} y2={10 + 7 * Math.sin((a * Math.PI) / 180)} stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      ))}
      <line x1="0.5" y1="10" x2="9" y2="10" stroke={INK} strokeWidth="1.6" />
    </svg>
  );
}

const SYMBOLS: Array<{ glyph: React.ReactNode; name: string; note: string }> = [
  {
    glyph: (
      <span className="flex flex-col items-center leading-none">
        <b className="text-[11px] font-black">DC</b>
        <svg viewBox="0 0 22 8" className="w-6 h-2.5 mt-0.5" aria-hidden><line x1="1" y1="2" x2="21" y2="2" stroke={INK} strokeWidth="1.8" /><line x1="1" y1="6.5" x2="21" y2="6.5" stroke={INK} strokeWidth="1.6" strokeDasharray="3.5 2.5" /></svg>
      </span>
    ),
    name: "DC hoặc –",
    note: "Dòng điện một chiều",
  },
  {
    glyph: (
      <span className="flex flex-col items-center leading-none">
        <b className="text-[11px] font-black">AC</b>
        <svg viewBox="0 0 22 8" className="w-6 h-2.5 mt-0.5" aria-hidden><path d="M1 4 Q6 -1 11 4 T21 4" fill="none" stroke={INK} strokeWidth="1.8" /></svg>
      </span>
    ),
    name: "AC hoặc ~",
    note: "Dòng điện xoay chiều",
  },
  { glyph: <span className="w-8 h-8 rounded-full bg-[#DC2626] text-white grid place-items-center text-lg font-black leading-none">+</span>, name: "+ hoặc màu đỏ", note: "Cực dương" },
  { glyph: <span className="w-8 h-8 rounded-full bg-[#1D4ED8] text-white grid place-items-center text-lg font-black leading-none">−</span>, name: "− hoặc màu xanh", note: "Cực âm" },
  { glyph: <span className="text-[10px] font-black leading-tight text-center">INPUT<br />OUTPUT</span>, name: "Input · Output", note: "Đầu vào · đầu ra" },
  { glyph: <TriangleSign><Thermometer className="w-[15px] h-[15px]" strokeWidth={2.6} /></TriangleSign>, name: "Nhiệt độ cao", note: "Không chạm tay trần" },
  { glyph: <TriangleSign><Magnet className="w-[15px] h-[15px]" strokeWidth={2.6} /></TriangleSign>, name: "Từ trường", note: "Tránh xa thẻ từ, đồng hồ" },
  { glyph: <TriangleSign><LaserGlyph /></TriangleSign>, name: "Tia laser", note: "Không nhìn thẳng vào tia" },
  { glyph: <Wine className="w-7 h-7 text-[#111827]" strokeWidth={2.2} />, name: "Dễ vỡ", note: "Cầm nhẹ, đặt chắc" },
  { glyph: <TriangleSign><b className="text-[15px] font-black leading-none">!</b></TriangleSign>, name: "Lưu ý cẩn thận", note: "Đọc hướng dẫn trước" },
];

/** Kí hiệu dạng thẻ lật: chỉ thấy kí hiệu, chạm để lật xem nghĩa — tự khám phá thay vì đọc bảng. */
export function SymbolsGrid() {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const toggle = (name: string) =>
    setOpen((old) => {
      const next = new Set(old);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const all = open.size === SYMBOLS.length;
  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
        {SYMBOLS.map((s) => {
          const flipped = open.has(s.name);
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => toggle(s.name)}
              aria-pressed={flipped}
              aria-label={flipped ? `${s.name}: ${s.note}` : "Thẻ kí hiệu — chạm để lật"}
              className="relative h-[86px] sm:h-[92px] cursor-pointer [perspective:700px] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
            >
              <span
                className="absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d]"
                style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
              >
                <span className="absolute inset-0 rounded-xl border border-[#EDE3D3] bg-[#FFFCF7] flex flex-col items-center justify-center gap-1.5 [backface-visibility:hidden] hover:border-[#F59E0B]">
                  <span className="h-10 grid place-items-center">{s.glyph}</span>
                  <span className="text-[10px] font-black text-[#B3A597]">Chạm để lật</span>
                </span>
                <span className="absolute inset-0 rounded-xl border border-[#FCD34D] bg-[#FFFBEB] px-2 flex flex-col items-center justify-center text-center gap-0.5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <b className="text-[11.5px] font-black text-[#78350F] leading-tight">{s.name}</b>
                  <span className="text-[10.5px] font-semibold text-[#92400E] leading-tight">{s.note}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11.5px] font-bold text-[#8C7B6B]">
        <span>
          Đã lật <b className="tabular-nums text-[#B45309]">{open.size}/{SYMBOLS.length}</b>
          {all ? " — nhớ hết chưa nè?" : ""}
        </span>
        <button
          type="button"
          onClick={() => setOpen(all ? new Set() : new Set(SYMBOLS.map((x) => x.name)))}
          className="inline-flex items-center gap-1 rounded-lg border border-[#E7DDCD] bg-white px-2 py-1 text-[11px] font-black text-[#4E3F34] hover:border-[#F59E0B] cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {all ? "Úp lại để tự kiểm tra" : "Lật hết"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Biển báo trong phòng thí nghiệm ---------- */

type SignShape = "hazard" | "warning" | "ban" | "exit";

function Sign({ shape, icon: Icon }: { shape: SignShape; icon: LucideIcon }) {
  return (
    <span className="relative inline-grid place-items-center w-14 h-14">
      <svg viewBox="0 0 56 56" className="absolute inset-0" aria-hidden>
        {shape === "hazard" && <rect x="4" y="4" width="48" height="48" rx="4" fill="#F97316" stroke={INK} strokeWidth="2.2" />}
        {shape === "warning" && <path d="M28 5 L53 50 H3 Z" fill="#FACC15" stroke={INK} strokeWidth="3.2" strokeLinejoin="round" />}
        {shape === "ban" && <circle cx="28" cy="28" r="24" fill="#fff" stroke="#DC2626" strokeWidth="5.5" />}
        {shape === "exit" && <rect x="2" y="9" width="52" height="38" rx="4" fill="#16A34A" />}
      </svg>
      <Icon
        className={`relative ${shape === "warning" ? "mt-4 w-5 h-5" : "w-7 h-7"} ${shape === "exit" ? "text-white" : "text-[#111827]"}`}
        strokeWidth={2.4}
      />
      {shape === "ban" && (
        <svg viewBox="0 0 56 56" className="absolute inset-0" aria-hidden>
          <line x1="12" y1="12" x2="44" y2="44" stroke="#DC2626" strokeWidth="5.5" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

const SIGNS: Array<{ shape: SignShape; icon: LucideIcon; name: string }> = [
  { shape: "warning", icon: Zap, name: "Nơi nguy hiểm về điện" },
  { shape: "hazard", icon: Flame, name: "Chất dễ cháy" },
  { shape: "ban", icon: Flame, name: "Nơi cấm lửa" },
  { shape: "exit", icon: DoorOpen, name: "Lối thoát hiểm" },
  { shape: "hazard", icon: Skull, name: "Chất độc sức khoẻ" },
  { shape: "hazard", icon: Leaf, name: "Chất độc môi trường" },
  { shape: "hazard", icon: Droplets, name: "Chất ăn mòn" },
  { shape: "warning", icon: Radiation, name: "Nơi có chất phóng xạ" },
];

export function SignsGrid() {
  return (
    <div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {SIGNS.map((s) => (
          <figure key={s.name} className="flex flex-col items-center gap-1.5 text-center">
            <Sign shape={s.shape} icon={s.icon} />
            <figcaption className="text-[10.5px] font-bold text-[#4A3A2E] leading-tight">{s.name}</figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-3 grid sm:grid-cols-4 gap-2 text-[11px] font-semibold text-[#5A4A3E]">
        <span className="rounded-lg bg-[#FFF6EC] px-2 py-1.5"><b className="text-[#C2410C]">Vuông cam:</b> chất nguy hiểm</span>
        <span className="rounded-lg bg-[#FEFCE8] px-2 py-1.5"><b className="text-[#A16207]">Tam giác vàng:</b> cảnh báo</span>
        <span className="rounded-lg bg-[#FEF2F2] px-2 py-1.5"><b className="text-[#B91C1C]">Tròn gạch đỏ:</b> cấm</span>
        <span className="rounded-lg bg-[#F0FDF4] px-2 py-1.5"><b className="text-[#15803D]">Chữ nhật xanh:</b> chỉ dẫn</span>
      </div>
    </div>
  );
}

/* ---------- Ba nhóm nguy cơ ---------- */

const RISKS: Array<{ icon: LucideIcon; title: string; tone: string; items: string[] }> = [
  {
    icon: UserRound,
    title: "Nguy hiểm cho người",
    tone: "text-[#B91C1C] bg-[#FEF2F2]",
    items: [
      "Cắm, rút phích khi tay khô; cầm vào thân phích, không giật dây.",
      "Dây điện sờn, hở lõi: không dùng, báo ngay giáo viên.",
      "Không nhìn thẳng vào tia laser; không chạm vật đang được đun nóng.",
    ],
  },
  {
    icon: Gauge,
    title: "Hỏng thiết bị đo điện",
    tone: "text-[#1D4ED8] bg-[#EFF6FF]",
    items: [
      "Chọn đúng chức năng và thang đo trước khi đo; chưa biết độ lớn thì bắt đầu từ thang lớn nhất.",
      "Cắm que đo đúng chốt: COM với VΩ để đo áp, điện trở; COM với mA để đo dòng.",
      "Không đo vượt giới hạn — ampe kế có thể cháy cầu chì, hỏng mạch đo.",
    ],
  },
  {
    icon: Flame,
    title: "Cháy nổ",
    tone: "text-[#C2410C] bg-[#FFF7ED]",
    items: [
      "Không để các kẹp điện, đầu dây chạm nhau (đoản mạch).",
      "Để cồn, giấy và chất dễ cháy xa mạch điện đang hoạt động.",
      "Đeo găng tay chịu nhiệt khi làm thí nghiệm có nhiệt độ cao.",
    ],
  },
];

export function RiskColumns() {
  return (
    <div className="grid sm:grid-cols-3 gap-2.5">
      {RISKS.map((r) => (
        <div key={r.title} className="rounded-xl border border-[#EDE3D3] bg-white p-3">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-lg grid place-items-center ${r.tone}`}><r.icon className="w-4 h-4" strokeWidth={2.5} /></span>
            <b className="text-[12.5px] font-black text-[#321E12] leading-tight">{r.title}</b>
          </div>
          <ul className="mt-2 space-y-1.5">
            {r.items.map((item) => (
              <li key={item} className="flex gap-1.5 text-[11.5px] font-semibold text-[#5A4A3E] leading-snug">
                <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-[#D6B48C] flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ---------- Quy tắc trong phòng thực hành ---------- */

const RULES: Array<{ icon: LucideIcon; text: string }> = [
  { icon: BookOpenCheck, text: "Đọc kĩ hướng dẫn và các kí hiệu trên thiết bị trước khi dùng." },
  { icon: ListChecks, text: "Kiểm tra dụng cụ trước khi làm; chỉ bắt đầu khi giáo viên cho phép." },
  { icon: PowerOff, text: "Tắt công tắc nguồn trước khi cắm hoặc tháo thiết bị điện." },
  { icon: Plug, text: "Chỉ cắm điện khi điện áp nguồn đúng với điện áp định mức của dụng cụ." },
  { icon: Cable, text: "Xếp dây điện gọn gàng, không vắt ngang lối đi." },
  { icon: Thermometer, text: "Không chạm vật hoặc thiết bị đang nóng khi không có đồ bảo hộ." },
  { icon: Droplets, text: "Để nước, dung dịch dẫn điện và chất dễ cháy xa thiết bị điện." },
  { icon: Eye, text: "Giữ khoảng cách an toàn với thí nghiệm nung nóng, vật bắn ra, tia laser." },
  { icon: Trash2, text: "Làm xong: dọn gọn dụng cụ, bỏ chất thải đúng nơi quy định." },
];

export function RulesList() {
  return (
    <ol className="grid sm:grid-cols-3 gap-2">
      {RULES.map((rule, i) => (
        <li key={rule.text} className="rounded-xl border border-[#EDE3D3] bg-[#FFFCF7] p-2.5 flex items-start gap-2">
          <span className="relative w-8 h-8 rounded-lg bg-[#FFF2E6] text-[#C85A17] grid place-items-center flex-shrink-0">
            <rule.icon className="w-4 h-4" strokeWidth={2.5} />
            <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-[#C85A17] text-white text-[9px] font-black grid place-items-center">{i + 1}</span>
          </span>
          <span className="text-[11.5px] font-semibold text-[#4A3A2E] leading-snug">{rule.text}</span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Khi có sự cố ---------- */

export function EmergencySteps() {
  const blocks: Array<{ icon: LucideIcon; title: string; tone: string; steps: string[] }> = [
    {
      icon: Zap,
      title: "Có người bị điện giật",
      tone: "border-[#FACC15] bg-[#FEFCE8]",
      steps: [
        "Ngắt nguồn điện ngay: tắt công tắc, cầu dao hoặc rút phích.",
        "Chưa ngắt được thì dùng vật khô, cách điện (thước gỗ, ống nhựa) tách người bị nạn ra — không chạm tay trần.",
        "Gọi giáo viên, nhân viên y tế.",
      ],
    },
    {
      icon: Flame,
      title: "Có đám cháy",
      tone: "border-[#FDBA74] bg-[#FFF7ED]",
      steps: [
        "Bình tĩnh, ngắt toàn bộ hệ thống điện.",
        "Đưa hoá chất, chất dễ cháy ra khu vực an toàn.",
        "Không dùng nước dập đám cháy có thiết bị điện, xăng dầu hay cồn.",
        "Không xịt bình CO₂ vào người đang cháy quần áo. Thoát ra theo lối thoát hiểm, báo giáo viên.",
      ],
    },
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-2.5">
      {blocks.map((b) => (
        <div key={b.title} className={`rounded-xl border-2 p-3 ${b.tone}`}>
          <div className="flex items-center gap-2">
            <b.icon className="w-4.5 h-4.5 text-[#111827]" strokeWidth={2.6} />
            <b className="text-[13px] font-black text-[#321E12]">{b.title}</b>
          </div>
          <ol className="mt-2 space-y-1.5">
            {b.steps.map((s, i) => (
              <li key={s} className="flex gap-2 text-[11.5px] font-semibold text-[#4A3A2E] leading-snug">
                <span className="w-4.5 h-4.5 rounded-full bg-white border border-[#E2D3BD] text-[10px] font-black grid place-items-center flex-shrink-0">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

/* ---------- Áp dụng cho dụng cụ trong PhyLab (theo chủ đề bài — thêm bài mới là tự khớp) ---------- */

/** Chủ đề bài → nhóm quy tắc an toàn dụng cụ. */
export function safetyKindOf(subject?: LabSubject | null): SafetyKind {
  if (subject === "Điện") return "elec";
  if (subject === "Quang học") return "optic";
  if (subject === "Nhiệt học") return "heat";
  return "mech";
}

export const SAFETY_KIND_NAME: Record<SafetyKind, string> = {
  mech: "Cơ học",
  elec: "Điện",
  optic: "Quang học",
  heat: "Nhiệt học",
};

export const LAB_GEAR_SAFETY: Record<SafetyKind, Array<{ name: string; text: string }>> = {
  mech: [
    { name: "Đồng hồ MC964", text: "Dùng điện 220 V: tay khô, cầm vào phích khi cắm/rút. Tắt đồng hồ trước khi cắm hoặc rút dây cổng quang." },
    { name: "Nam châm điện", text: "Chỉ bật khi cần giữ vật — bật lâu cuộn dây nóng lên. Ngắt điện để thả vật." },
    { name: "Bi thép, trụ thép", text: "Không để tay dưới đường rơi, đường lăn; đặt hộp hứng hoặc đệm ở cuối máng." },
    { name: "Giá đỡ, máng", text: "Đặt vững trên bàn, vặn vít cân bằng nhẹ tay; xếp dây gọn để không kéo đổ giá." },
  ],
  elec: [
    { name: "Khoá K, nguồn", text: "Mở K, tắt nguồn mỗi khi lắp hoặc sửa mạch. Nguồn DC: vặn về mức thấp nhất rồi mới tăng dần." },
    { name: "Đồng hồ đa năng", text: "Chọn nấc, thang, chốt cắm trước khi đóng K. Ampe kế nối tiếp, vôn kế song song. Đo Ω chỉ khi mạch đã ngắt điện." },
    { name: "Pin, điện trở R₀", text: "Luôn có R₀ để hạn dòng; không nối tắt hai cực pin, không nối ampe kế thẳng vào pin." },
    { name: "Vật dẫn, dây nối", text: "Không đóng K lâu ở điện áp cao — vật dẫn nóng lên, số đo trôi. Đầu dây không để chạm nhau." },
  ],
  optic: [
    { name: "Đèn laser", text: "Không nhìn thẳng vào tia, không chiếu vào mắt người khác; tắt khi không dùng." },
    { name: "Thấu kính, gương", text: "Cầm vào mép hoặc giá đỡ, không chạm tay lên mặt kính; đặt nhẹ để khỏi mẻ, xước." },
    { name: "Đèn chiếu", text: "Vỏ đèn nóng lên khi bật lâu — không chạm, tắt đèn khi điều chỉnh." },
    { name: "Băng quang học", text: "Đặt chắc trên bàn, vặn khoá giá đỡ vừa tay để thấu kính, màn không rơi." },
  ],
  heat: [
    { name: "Đèn cồn, bếp điện", text: "Không châm đèn cồn từ đèn khác; tắt bằng nắp đậy, không thổi. Không để vật dễ cháy gần lửa." },
    { name: "Dụng cụ thuỷ tinh", text: "Dùng bình chịu nhiệt; không đổ nước lạnh vào bình đang nóng — dễ nứt vỡ." },
    { name: "Vật đang nóng", text: "Dùng kẹp, găng tay chịu nhiệt; đặt lên tấm lót cách nhiệt." },
    { name: "Nhiệt kế", text: "Cầm nhẹ, không dùng để khuấy; nhiệt kế vỡ thì báo giáo viên, không tự dọn." },
  ],
};

const KIND_ICON: Record<SafetyKind, LucideIcon> = { mech: Wrench, elec: Zap, optic: Aperture, heat: FlaskRound };
const KIND_TONE: Record<SafetyKind, string> = {
  mech: "bg-[#EFF6FF] text-[#1D4ED8]",
  elec: "bg-[#FEFCE8] text-[#A16207]",
  optic: "bg-[#F5F3FF] text-[#6D28D9]",
  heat: "bg-[#FFF1F2] text-[#BE123C]",
};

/** Các bài (đang mở hoặc sắp có) thuộc nhóm an toàn này — đọc từ danh mục nên thêm bài là tự cập nhật. */
const lessonsOf = (kind: SafetyKind) => LAB_CATALOG.filter((l) => safetyKindOf(l.subject) === kind).map((l) => l.code);

export function GearSafety({ kinds = ["mech", "elec"] }: { kinds?: SafetyKind[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {kinds.map((kind) => {
        const Icon = KIND_ICON[kind];
        const lessons = lessonsOf(kind);
        return (
          <div key={kind}>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black text-[#8C7B6B]">
              <span className={`w-5 h-5 rounded-md grid place-items-center ${KIND_TONE[kind]}`}>
                <Icon className="w-3 h-3" strokeWidth={2.6} />
              </span>
              {SAFETY_KIND_NAME[kind]}
              {lessons.length ? ` · áp dụng cho ${lessons.join(", ")}` : ""}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {LAB_GEAR_SAFETY[kind].map((row) => (
                <div key={row.name} className="rounded-xl border border-[#EDE3D3] bg-white p-2.5 flex items-start gap-2.5">
                  <span className={`w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 ${KIND_TONE[kind]}`}>
                    <Icon className="w-4 h-4" strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0">
                    <b className="text-[12px] font-black text-[#321E12]">{row.name}</b>
                    <p className="text-[11.5px] font-semibold text-[#5A4A3E] leading-snug mt-0.5">{row.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Kiểm tra nhanh ("Em có thể" cuối bài) ---------- */

const QUIZ: Array<{ q: string; options: string[]; answer: number; why: string }> = [
  {
    q: "Vì sao khi dùng thiết bị đo điện phải luôn đặt ở thang đo phù hợp?",
    options: [
      "Để màn hình hiện số đẹp hơn.",
      "Đại lượng vượt giới hạn thang đo có thể làm hỏng đồng hồ; thang quá lớn thì số đọc kém chính xác.",
      "Thang nào cũng cho kết quả như nhau.",
    ],
    answer: 1,
    why: "Vượt giới hạn đo thì cầu chì, mạch đo có thể hỏng; thang quá lớn làm mất chữ số có nghĩa.",
  },
  {
    q: "Vì sao dùng máy biến áp (nguồn điều chỉnh) phải đặt núm ở mức thấp nhất rồi mới tăng dần?",
    options: [
      "Để máy chạy êm, đỡ tốn điện.",
      "Không cần — đặt ngay mức cần dùng cho nhanh.",
      "Tránh đặt đột ngột điện áp lớn lên mạch, có thể làm hỏng dụng cụ hoặc gây nguy hiểm; tăng dần để kiểm soát.",
    ],
    answer: 2,
    why: "Tăng từ thấp lên giúp phát hiện sớm chỗ mắc sai trước khi dòng điện đủ lớn để gây hỏng.",
  },
];

export function SafetyQuiz() {
  const [picked, setPicked] = useState<Array<number | null>>(() => QUIZ.map(() => null));
  return (
    <div className="grid sm:grid-cols-2 gap-2.5">
      {QUIZ.map((item, qi) => {
        const chosen = picked[qi];
        const answered = chosen !== null;
        return (
          <div key={item.q} className="rounded-xl border border-[#EDE3D3] bg-white p-3">
            <b className="text-[12.5px] font-black text-[#321E12] leading-snug block">{qi + 1}. {item.q}</b>
            <div className="mt-2 flex flex-col gap-1.5">
              {item.options.map((opt, oi) => {
                const right = oi === item.answer;
                const state = !answered ? "idle" : right ? "right" : oi === chosen ? "wrong" : "idle";
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPicked((old) => old.map((v, i) => (i === qi ? oi : v)))}
                    className={`text-left rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold leading-snug flex items-start gap-2 cursor-pointer transition-colors ${
                      state === "right" ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                        : state === "wrong" ? "border-red-300 bg-red-50 text-red-900"
                          : "border-[#E7DDCD] bg-[#FFFCF7] text-[#4A3A2E] hover:border-[#C85A17]/40"
                    }`}
                  >
                    <span className="mt-px w-4 h-4 rounded-full border border-current grid place-items-center flex-shrink-0">
                      {state === "right" ? <Check className="w-3 h-3" strokeWidth={3} /> : state === "wrong" ? <X className="w-3 h-3" strokeWidth={3} /> : null}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered && (
              <p className={`mt-2 text-[11px] font-bold leading-snug ${chosen === item.answer ? "text-emerald-700" : "text-[#9A3412]"}`}>
                {chosen === item.answer ? "Chính xác. " : "Chưa đúng. "}{item.why}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Dải nhắc nhanh (dùng trong tour Phòng Lab). */
export function SafetyBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEFCE8] border border-[#FDE68A] px-2.5 py-1 text-[10.5px] font-black text-[#A16207]">
      <TriangleAlert className="w-3.5 h-3.5" /> Theo SGK Vật lí 10 — Bài 2
    </span>
  );
}
