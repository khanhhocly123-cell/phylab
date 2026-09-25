"use client";

import React, { useState, useRef, useCallback } from "react";
import { MC964Face, mc964ModeAngle } from "../lab/mech/MechParts.jsx";

// Style constants matching the Phylab design system
const C = {
  orange: "#E8842B",
  orangeLt: "#F59C3C",
  orangeDk: "#D56A17",
  navy: "#1F4D78",
  teal: "#2E74B5",
  ink: "#2A2A28",
  sub: "#8a8278",
  sub2: "#9a9286",
  cream: "#FBF6EC",
  peach: "#FDEFE0",
  peachLt: "#FFF6EC",
  line: "#EFE7D8",
  card: "#FFFFFF",
  good: "#3E8E3E",
};

const FONT = "var(--font-nunito), Nunito, system-ui, sans-serif";
const BALL_D_MM = 20.0;
const GOOD_BG = "#E2F0D9";

// MC964 Timer Info
const MC964_INFO = {
  led: {
    title: "Màn hình LED",
    body: "Hiển thị thời gian đo được, chính xác đến phần nghìn giây (0,000 s) hoặc phần trăm giây (0,00 s). Đây là kết quả đọc trực tiếp khi vật chắn hoặc đi qua cổng quang.",
  },
  mode: {
    title: "Núm chọn MODE",
    body: "Chọn kiểu làm việc cho máy đo. Xoay núm để chọn 1 trong 5 chế độ: A, B, A+B, A↔B, T. Bấm từng chấu hoặc xoay núm để xem chi tiết.",
  },
  reset: {
    title: "Nút RESET",
    body: "Đặt lại chỉ số của đồng hồ về 0,000 trước mỗi lần đo để chuẩn bị cho lượt đo tiếp theo.",
  },
  thang: {
    title: "Núm THANG ĐO",
    body: "Chọn độ chia nhỏ nhất (ĐCNN) của phép đo thời gian: 0,001 s hoặc 0,01 s. ĐCNN này quyết định sai số dụng cụ khi đo.",
  },
  A: {
    title: "MODE A",
    body: "Đo thời gian vật chắn cổng quang điện nối với ổ A. Dùng để đo tốc độ tức thời tại cổng quang E.",
  },
  B: {
    title: "MODE B",
    body: "Đo thời gian vật chắn cổng quang điện nối với ổ B. Dùng để đo tốc độ tức thời tại cổng quang F.",
  },
  AB: {
    title: "MODE A+B",
    body: "Đo tổng của hai khoảng thời gian vật chắn cổng nối ổ A và cổng nối ổ B.",
  },
  AAB: {
    title: "MODE A↔B",
    body: "Đo thời gian vật chuyển động từ cổng nối ổ A tới cổng nối ổ B. Dùng đo tốc độ trung bình giữa hai cổng E và F.",
  },
  T: {
    title: "MODE T",
    body: "Đo khoảng thời gian T của từng chu kì dao động (dùng cho con lắc).",
  },
  socketA: {
    title: "Ổ cắm A",
    body: "Cắm dây tín hiệu từ cổng quang điện thứ nhất (cổng E). Ổ này tương ứng với MODE A trên mặt trước.",
  },
  socketB: {
    title: "Ổ cắm B",
    body: "Cắm dây tín hiệu từ cổng quang điện thứ hai (cổng F). Ổ này tương ứng với MODE B.",
  },
  socketC: {
    title: "Ổ cắm C (+10V)",
    body: "Ổ nguồn cấp điện cho cổng quang và nam châm điện hoạt động ổn định.",
  },
  power: {
    title: "Công tắc nguồn (I/O)",
    body: "Bật (I) hoặc tắt (O) nguồn điện của đồng hồ đo thời gian hiện số.",
  },
};

type McKey = keyof typeof MC964_INFO;
type McMode = "A" | "B" | "AB" | "AAB" | "T";

/** Thử thách "làm theo yêu cầu" ngay trên máy — không tính điểm, chỉ để tay quen thao tác. */
const MC964_TASKS: Array<{ face: "front" | "back"; target: McKey; ask: string; ok: string }> = [
  { face: "front", target: "AAB", ask: "Xoay núm tới MODE đo thời gian bi đi TỪ cổng E TỚI cổng F (tốc độ trung bình).", ok: "Chuẩn! A↔B: bắt đầu khi chắn cổng A, dừng khi chắn cổng B." },
  { face: "front", target: "A", ask: "Chọn MODE đo thời gian bi CHE cổng E (để tính tốc độ tức thời v = d/t).", ok: "Đúng! MODE A chỉ đếm trong lúc bi che tia của cổng A." },
  { face: "front", target: "reset", ask: "Trước mỗi lần thả, bấm nút nào để số về 0,000?", ok: "Đúng! Quên Reset thì số đo lần sau bị CỘNG DỒN." },
  { face: "back", target: "socketA", ask: "Lật mặt sau: cắm dây cổng quang E vào ổ nào?", ok: "Đúng! Cổng E → ổ A, cổng F → ổ B." },
  { face: "back", target: "power", ask: "Bật nguồn cho đồng hồ.", ok: "Xong! Em đã sẵn sàng dùng MC964 trong Phòng Lab." },
];

/* Nhãn MODE trên mặt đồng hồ ↔ khoá giải thích. */
const MODE_KEYS: Array<{ key: McMode; label: string }> = [
  { key: "A", label: "A" }, { key: "B", label: "B" }, { key: "AB", label: "A+B" }, { key: "AAB", label: "A↔B" }, { key: "T", label: "T" },
];
const labelOf = (m: McMode) => MODE_KEYS.find((x) => x.key === m)?.label ?? "A";
const keyOfLabel = (label: string) => MODE_KEYS.find((x) => x.label === label)?.key ?? "A";
/** Bộ phận thử thách → vòng sáng trên đồng hồ. */
const FOCUS_OF: Partial<Record<McKey, string>> = { A: "mode:A", B: "mode:B", AB: "mode:A+B", AAB: "mode:A↔B", T: "mode:T", reset: "reset", thang: "scale", led: "led", socketA: "socket:A", socketB: "socket:B", socketC: "socket:C", power: "power" };

/**
 * MC964Interactive — cùng một chiếc đồng hồ với Phòng Lab (MC964Face trong MechParts): bấm từng bộ phận
 * để đọc giải thích, làm 5 việc "thử tay" (vòng cam chỉ chỗ cần bấm). Xoay núm qua các nấc không bị báo
 * sai — chỉ khen khi tới đúng MODE.
 */
export function MC964Interactive() {
  const [face, setFace] = useState<"front" | "back">("front");
  const [sel, setSel] = useState<McKey | null>(null);
  const [mode, setMode] = useState<McMode>("A");
  const [scale, setScale] = useState<"fine" | "coarse">("fine");
  const [powerOn, setPowerOn] = useState(false);
  const [task, setTask] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const current = MC964_TASKS[task] || null;

  const succeed = () => {
    if (!current) return;
    setFeedback({ ok: true, text: current.ok });
    const nextIndex = task + 1;
    setTask(nextIndex);
    if (MC964_TASKS[nextIndex] && MC964_TASKS[nextIndex].face !== face) setFace(MC964_TASKS[nextIndex].face);
  };
  // Bấm một bộ phận: xem giải thích + chấm thử thách đang làm (nếu có).
  const press = (key: McKey) => {
    setSel(key);
    if (MODE_KEYS.some((m) => m.key === key)) setMode(key as McMode);
    if (key === "power") setPowerOn((v) => !v);
    if (key === "thang") setScale((v) => (v === "fine" ? "coarse" : "fine"));
    if (!current) return;
    if (key === current.target) succeed();
    else if (["A", "B", "AB", "AAB", "T", "reset", "socketA", "socketB", "socketC", "power"].includes(key)) {
      setFeedback({ ok: false, text: `Chưa đúng — đó là ${MC964_INFO[key].title}. Đọc giải thích bên cạnh rồi thử lại nhé.` });
    }
  };
  // Xoay núm: chuyển sang nấc kế tiếp; chỉ khen khi tới đúng nấc (không báo sai từng nấc đi qua).
  const turnKnob = () => {
    const i = MODE_KEYS.findIndex((m) => m.key === mode);
    const next = MODE_KEYS[(i + 1) % MODE_KEYS.length].key;
    setMode(next);
    setSel(next);
    if (current && current.target === next) succeed();
  };

  const info = sel
    ? MC964_INFO[sel]
    : { title: "Đồng hồ đo thời gian hiện số MC964", body: "Thiết bị đo thời gian chính xác đến phần nghìn giây, điều khiển tự động bằng tín hiệu điện từ cổng quang. Chạm từng bộ phận trên đồng hồ để tìm hiểu." };
  const focus = current && current.face === face ? FOCUS_OF[current.target] ?? null : null;
  const label = labelOf(mode);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start" style={{ fontFamily: FONT }}>
      <div className="rounded-2xl border border-[#E9E2D4] bg-[#F6F1E7] p-3">
        <div className="flex items-center gap-1.5 mb-2">
          {(["front", "back"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFace(f)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-black border cursor-pointer ${face === f ? "bg-[#321E12] text-white border-[#321E12]" : "bg-white text-[#605248] border-[#E2DFD8]"}`}>
              {f === "front" ? "Mặt trước" : "Mặt sau"}
            </button>
          ))}
          <span className="ml-auto text-[11px] font-bold text-[#8C7B6B]">Chạm bộ phận bất kì để tìm hiểu</span>
        </div>
        <svg viewBox="-12 -6 324 150" role="img" aria-label={face === "front" ? "Mặt trước MC964" : "Mặt sau MC964"} className="w-full h-auto block select-none">
          <MC964Face face={face} led="0.000" modeAngle={mc964ModeAngle(label)} modeLabel={label}
            scale={scale} scaleLabel={scale === "fine" ? "0,001 s" : "0,01 s"} power={powerOn} focus={focus}
            onCycleMode={turnKnob} onModePick={(l: string) => press(keyOfLabel(l))} onReset={() => press("reset")}
            onToggleScale={() => press("thang")} onLed={() => press("led")} onTogglePower={() => press("power")}
            onSocket={(s: string) => press(s === "A" ? "socketA" : s === "B" ? "socketB" : "socketC")} />
        </svg>
      </div>

      <div className="flex flex-col gap-2.5">
        {/* Thử thách tay nghề — làm ngay trên máy */}
        <div className={`rounded-2xl border-[1.5px] p-3 ${current ? "border-[#F5B67A] bg-[#FFF8F0]" : "border-[#86EFAC] bg-[#F0FDF4]"}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[11px] font-black uppercase tracking-wide ${current ? "text-[#D56A17]" : "text-[#3E8E3E]"}`}>
              {current ? `Thử tay ${task + 1}/${MC964_TASKS.length}` : "Thử tay · hoàn thành"}
            </span>
            <span className="flex gap-1">
              {MC964_TASKS.map((t, i) => <span key={t.target} className="w-[18px] h-1.5 rounded-full" style={{ background: i < task ? C.good : i === task ? C.orange : "#E5E0D6" }} />)}
            </span>
          </div>
          <div className="text-[13.5px] font-black text-[#2A2A28] mt-1 leading-snug">
            {current ? current.ask : "Em đã thao tác đúng cả 5 việc: chọn MODE, Reset, cắm dây, bật nguồn."}
          </div>
          {feedback && <div className={`text-[12px] font-black mt-1 ${feedback.ok ? "text-[#3E8E3E]" : "text-[#B91C1C]"}`}>{feedback.ok ? "✓ " : "✗ "}{feedback.text}</div>}
        </div>
        {/* Giải thích bộ phận vừa chạm (chiều cao cố định để khỏi nhảy bố cục) */}
        <div className="rounded-2xl border border-[#E5E3DC] bg-white p-3 min-h-[118px]">
          <h3 className="m-0 mb-1.5 text-[15px] font-black text-[#1A1A1A]">{info.title}</h3>
          <p className="m-0 text-[13px] leading-relaxed text-[#555]">{info.body}</p>
        </div>
      </div>
    </div>
  );
}

// Caliper Interactive View Component
const CZ = { PX: 22, OFFX: 150, OFFY: 175, VSTEP: 0.195 };
const CX = (x: number) => CZ.OFFX + x * CZ.PX;
const CY = (y: number) => CZ.OFFY - y * CZ.PX;

interface CaliperZoomProps {
  ballMm?: number;
  maxMm?: number;
  /** reading: số HS tự đọc; jawMm: độ mở thật của hai hàm lúc bấm ghi nhận. */
  onSubmit?: (reading: string, jawMm: number) => void;
}

export function CaliperZoom({ ballMm = BALL_D_MM, maxMm = 80, onSubmit }: CaliperZoomProps) {
  const [measure, setMeasure] = useState(Math.min(ballMm + 8, maxMm));
  const [reading, setReading] = useState("");
  const [dragging, setDragging] = useState(false);
  const ref = useRef<SVGSVGElement | null>(null);
  const cv = measure / 10;
  const sx = (x: number) => CX(x + cv);
  const whole = Math.floor(measure + 1e-6);
  const vhit = Math.round((measure - whole) / 0.05);
  // Viên bi vẽ theo đúng đường kính của nó, sát hàm cố định.
  const ballR = ballMm / 20;
  const ballCx = -2.0 + ballR + 0.02;
  const ballCy = -2.6;
  // Hàm di động không thể khép nhỏ hơn viên bi (bi chặn lại) — như thước kẹp thật.
  const touched = Math.abs(measure - ballMm) < 0.03;

  const move = useCallback((clientX: number) => {
    const svg = ref.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const sxv = (clientX - r.left) * (640 / r.width);
    const cvN = (sxv - CZ.OFFX) / CZ.PX;
    setMeasure(Math.max(ballMm, Math.min(maxMm, Math.round(cvN * 10 / 0.05) * 0.05)));
  }, [maxMm, ballMm]);

  const jlf = `M ${CX(-3.8)} ${CY(-0.9)} L ${CX(-2)} ${CY(-0.9)} L ${CX(-2)} ${CY(-5)} L ${CX(-2.3)} ${CY(-5)} C ${CX(-2.7)} ${CY(-3.5)} ${CX(-3.5)} ${CY(-1.5)} ${CX(-3.8)} ${CY(-0.9)} Z`;
  const juf = `M ${CX(-3.5)} ${CY(1.5)} L ${CX(-2)} ${CY(1.5)} L ${CX(-2)} ${CY(4)} L ${CX(-2.3)} ${CY(4)} C ${CX(-2.6)} ${CY(2.8)} ${CX(-3.2)} ${CY(2.0)} ${CX(-3.5)} ${CY(1.5)} Z`;
  const jlm = `M ${sx(-2)} ${CY(-1.2)} L ${sx(-0.5)} ${CY(-1.2)} L ${sx(-0.5)} ${CY(-1.8)} C ${sx(-1.0)} ${CY(-3.0)} ${sx(-1.5)} ${CY(-4.0)} ${sx(-1.7)} ${CY(-5)} L ${sx(-2)} ${CY(-5)} Z`;
  const jum = `M ${sx(-2)} ${CY(1.7)} L ${sx(-1)} ${CY(1.7)} L ${sx(-1)} ${CY(2.2)} C ${sx(-1.3)} ${CY(3.0)} ${sx(-1.6)} ${CY(3.5)} ${sx(-1.7)} ${CY(4)} L ${sx(-2)} ${CY(4)} Z`;

  const ticks: React.ReactNode[] = [];
  for (let cm = 0; cm <= 16; cm++) {
    const x = CX(cm);
    ticks.push(<line key={"c" + cm} x1={x} y1={CY(0)} x2={x} y2={CY(0.45)} stroke="#222" strokeWidth="1.1" />);
    ticks.push(
      <text
        key={"cn" + cm} x={x} y={CY(0.52)}
        textAnchor="middle"
        style={{ fontSize: 13, fontWeight: 700, fill: "#222", pointerEvents: "none", fontFamily: FONT }}
      >
        {cm}
      </text>
    );
    if (cm < 16) {
      for (let mm = 1; mm <= 9; mm++) {
        const xx = CX(cm + mm / 10);
        ticks.push(<line key={`m${cm}-${mm}`} x1={xx} y1={CY(0)} x2={xx} y2={mm === 5 ? CY(0.3) : CY(0.18)} stroke="#555" strokeWidth={mm === 5 ? 0.8 : 0.5} />);
      }
    }
  }

  const vern: React.ReactNode[] = [];
  for (let v = 0; v <= 10; v++) {
    const x = sx(v * 2 * CZ.VSTEP);
    const hit = v * 2 === vhit;
    vern.push(<line key={"v" + v} x1={x} y1={CY(0)} x2={x} y2={CY(-0.4)} stroke={hit ? C.orange : "#222"} strokeWidth={hit ? 1.8 : 1.1} />);
    if (v % 5 === 0) {
      vern.push(
        <text
          key={"vn" + v} x={x} y={CY(-0.55)}
          textAnchor="middle"
          style={{ fontSize: 11, fontWeight: 700, fill: "#222", pointerEvents: "none", fontFamily: FONT }}
        >
          {v}
        </text>
      );
    }
    if (v < 10) {
      const xh = sx((v * 2 + 1) * CZ.VSTEP);
      const hit2 = v * 2 + 1 === vhit;
      vern.push(<line key={"vh" + v} x1={xh} y1={CY(0)} x2={xh} y2={CY(-0.28)} stroke={hit2 ? C.orange : "#555"} strokeWidth={hit2 ? 1.8 : 0.55} />);
    }
  }
  const probeX = 17 - cv;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", fontFamily: FONT }}>
      <div style={{ background: "#ffffff", border: `1px solid ${C.line}`, borderRadius: 14, padding: "0.75rem" }}>
        <svg
          ref={ref} width="100%" viewBox="0 30 640 250"
          style={{ display: "block", touchAction: "none", cursor: dragging ? "grabbing" : "default" }}
          onPointerMove={(e) => dragging && move(e.clientX)}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        >
          <defs>
            <linearGradient id="cz-beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dadade" />
              <stop offset="100%" stopColor="#b2b2b8" />
            </linearGradient>
            <linearGradient id="cz-jaw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ededf0" />
              <stop offset="100%" stopColor="#9a9aa0" />
            </linearGradient>
            <linearGradient id="cz-slider" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f3f3f6" />
              <stop offset="100%" stopColor="#aaaab0" />
            </linearGradient>
            <radialGradient id="cz-ball" cx="36%" cy="32%" r="75%"><stop offset="0%" stopColor="#FFFFFF" /><stop offset="22%" stopColor="#D9DDE3" /><stop offset="60%" stopColor="#7C8490" /><stop offset="100%" stopColor="#2E343C" /></radialGradient>
          </defs>
          <rect x={CX(-4.5)} y={CY(1.5)} width={(17 + 4.5) * CZ.PX} height={(1.5 + 0.9) * CZ.PX} rx="2" fill="url(#cz-beam)" stroke="#888" strokeWidth="0.6" />
          <rect x={CX(-4.0)} y={CY(1.0)} width={(16.8 + 4.0) * CZ.PX} height={1.0 * CZ.PX} fill="#fbfbfb" stroke="#bbb" strokeWidth="0.4" />
          {ticks}
          <text x={CX(-4.3)} y={CY(0.62)} style={{ fontSize: 14, fontWeight: "bold", fontStyle: "italic", fill: C.orange, pointerEvents: "none", fontFamily: FONT }}>Phylab</text>
          <path d={jlf} fill="url(#cz-jaw)" stroke="#888" strokeWidth="0.6" />
          <path d={juf} fill="url(#cz-jaw)" stroke="#888" strokeWidth="0.6" />
          <circle cx={CX(ballCx)} cy={CY(ballCy)} r={ballR * CZ.PX} fill="url(#cz-ball)" stroke={touched ? C.good : "#2a2a2e"} strokeWidth={touched ? 2.4 : 0.7} />
          <circle cx={CX(ballCx) - ballR * CZ.PX * 0.34} cy={CY(ballCy) - ballR * CZ.PX * 0.38} r={ballR * CZ.PX * 0.2} fill="#fff" opacity="0.9" />
          <g
            style={{ cursor: "grab" }}
            onPointerDown={(e) => {
              const el = e.target as HTMLElement;
              el.setPointerCapture?.(e.pointerId);
              setDragging(true);
            }}
          >
            <rect x={sx(probeX)} y={CY(0.6)} width={(17.5 - probeX) * CZ.PX} height={0.2 * CZ.PX} fill="#c8c8cc" stroke="#999" strokeWidth="0.5" />
            <path
              d={`M ${sx(-2)} ${CY(1.7)} L ${sx(6.2)} ${CY(1.7)} L ${sx(6.2)} ${CY(-1.2)} L ${sx(-2)} ${CY(-1.2)} Z M ${sx(-0.5)} ${CY(1.0)} L ${sx(5.5)} ${CY(1.0)} L ${sx(5.5)} ${CY(0)} L ${sx(-0.5)} ${CY(0)} Z`}
              fill="url(#cz-slider)" stroke="#888" strokeWidth="0.6" fillRule="evenodd"
            />
            <path d={jlm} fill="url(#cz-jaw)" stroke="#888" strokeWidth="0.6" />
            <path d={jum} fill="url(#cz-jaw)" stroke="#888" strokeWidth="0.6" />
            {vern}
            <text x={sx(20 * CZ.VSTEP) + 8} y={CY(-0.62)} style={{ fontSize: 9, fill: "#555", pointerEvents: "none", fontFamily: FONT }}>0.05mm</text>
          </g>
        </svg>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          <span style={{ fontSize: 13, color: "#555", whiteSpace: "nowrap", fontWeight: 700, fontFamily: FONT }}>Kéo hàm di động</span>
          <input
            type="range" min={ballMm} max={maxMm} step={0.05}
            value={measure} onChange={(e) => setMeasure(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: C.orange }}
          />
        </div>
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center mt-2.5">
        <div style={{ background: touched ? GOOD_BG : "#E6F1FB", borderRadius: 8, padding: "9px 12px" }}>
          <p style={{ margin: 0, fontSize: 13, color: touched ? C.good : "#0C447C", lineHeight: 1.5, fontFamily: FONT, fontWeight: 700 }}>
            {touched
              ? "Vừa vặn! Hai hàm đã kẹp sát viên bi. Hãy đọc phần nguyên ở vạch 0 của du xích (nằm dưới thanh chính), rồi tìm vạch du xích nào trùng khít nhất với vạch trên thanh chính (vạch tô cam) nhân 0,05 mm để lấy phần lẻ."
              : "Kéo thanh trượt hoặc kéo trực tiếp du xích sao cho hai hàm chạm sát hai mép viên bi thép, sau đó tự đọc số đo và nhập vào ô bên dưới."}
          </p>
        </div>
        {onSubmit && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#555", fontWeight: 700, fontFamily: FONT }}>Đường kính bi đọc được: d =</span>
            <input
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              placeholder="ví dụ: 18.20"
              style={{ width: 100, padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc", outline: "none", fontWeight: "bold", fontFamily: FONT }}
            />
            <span style={{ fontSize: 13, color: "#555", fontWeight: 700, fontFamily: FONT }}>mm</span>
            <button
              onClick={() => {
                if (reading.trim()) {
                  onSubmit(reading.trim().replace(",", "."), measure);
                }
              }}
              style={{
                marginLeft: "auto", padding: "8px 16px", borderRadius: 8, border: "none",
                background: C.orange, color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: FONT,
                boxShadow: "0 2px 4px rgba(232,132,43,0.2)"
              }}
            >
              Ghi nhận đường kính
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
