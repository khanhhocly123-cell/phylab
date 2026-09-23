"use client";

import React, { useState, useRef, useCallback } from "react";

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

const MC964_CHAU = [
  { m: "A" as const, deg: 210, x: 216, y: 60, label: "A" },
  { m: "B" as const, deg: -113, x: 224, y: 42, label: "B" },
  { m: "AB" as const, deg: -76, x: 238, y: 30, label: "A+B" },
  { m: "AAB" as const, deg: -8, x: 266, y: 42, label: "A↔B" },
  { m: "T" as const, deg: 37, x: 280, y: 60, label: "T" },
];

const MC964_C = {
  cream: "#FBF6EC",
  stroke: "#888780",
  metal: "#9B9B9B",
  ledFrame: "#61252C",
  ledInner: "#280C0F",
  ledText: "#FF2D2D",
  brand: "#D56A17",
  needle: "#1F4D78",
  reset: "#E24B4A",
  navy: "#1F4D78",
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

export function MC964Interactive() {
  const [face, setFace] = useState<"front" | "back">("front");
  const [sel, setSel] = useState<McKey | null>(null);
  const [mode, setMode] = useState<McMode>("A");
  const [powerOn, setPowerOn] = useState(false);
  const [task, setTask] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const current = MC964_TASKS[task] || null;

  // Bấm một bộ phận: xem giải thích + chấm thử thách đang làm (nếu có).
  const press = (key: McKey) => {
    setSel(key);
    if (MC964_CHAU.some((c) => c.m === key)) setMode(key as McMode);
    if (key === "power") setPowerOn((v) => !v);
    if (!current) return;
    if (key === current.target) {
      setFeedback({ ok: true, text: current.ok });
      const nextIndex = task + 1;
      setTask(nextIndex);
      if (MC964_TASKS[nextIndex] && MC964_TASKS[nextIndex].face !== face) setFace(MC964_TASKS[nextIndex].face);
    } else if (["A", "B", "AB", "AAB", "T", "reset", "socketA", "socketB", "socketC", "power"].includes(key)) {
      setFeedback({ ok: false, text: `Chưa đúng — đó là ${MC964_INFO[key].title}. Đọc giải thích bên dưới rồi thử lại nhé.` });
    }
  };

  const info = sel
    ? MC964_INFO[sel]
    : {
        title: "Đồng hồ đo thời gian hiện số MC964",
        body: "Thiết bị đo thời gian chính xác đến phần nghìn giây, điều khiển tự động bằng tín hiệu điện từ cổng quang. Chạm từng bộ phận trên đồng hồ để tìm hiểu.",
      };
  const chau = MC964_CHAU.find((c) => c.m === mode) || MC964_CHAU[0];
  const ang = Math.atan2(chau.y - 3 - 55, chau.x - 248);
  const needle = { x: 248 + 11 * Math.cos(ang), y: 55 + 11 * Math.sin(ang) };

  const tabStyle = (active: boolean) => ({
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    cursor: "pointer",
    border: active ? `1.5px solid ${C.navy}` : "1.5px solid #ccc",
    background: active ? C.navy : "transparent",
    color: active ? "#fff" : "#222",
    fontFamily: FONT,
  });
  const hot = (key: McKey) => current?.target === key && face === current.face;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", fontFamily: FONT }}>
      {/* Thử thách tay nghề — làm ngay trên máy */}
      <div style={{ border: `1.5px solid ${current ? "#F5B67A" : "#86EFAC"}`, background: current ? "#FFF8F0" : "#F0FDF4", borderRadius: 12, padding: "10px 12px", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: current ? C.orangeDk : C.good, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {current ? `Thử tay ${task + 1}/${MC964_TASKS.length}` : "Thử tay · hoàn thành"}
          </span>
          <span style={{ display: "flex", gap: 4 }}>
            {MC964_TASKS.map((t, i) => <span key={t.target} style={{ width: 18, height: 6, borderRadius: 3, background: i < task ? C.good : i === task ? C.orange : "#E5E0D6" }} />)}
          </span>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, marginTop: 4, lineHeight: 1.45 }}>
          {current ? current.ask : "🎉 Em đã thao tác đúng cả 5 việc: chọn MODE, Reset, cắm dây, bật nguồn."}
        </div>
        {feedback && <div style={{ fontSize: 12, fontWeight: 800, marginTop: 4, color: feedback.ok ? C.good : "#B91C1C" }}>{feedback.ok ? "✓ " : "✗ "}{feedback.text}</div>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button style={tabStyle(face === "front")} onClick={() => setFace("front")}>
          Mặt trước
        </button>
        <button style={tabStyle(face === "back")} onClick={() => setFace("back")}>
          Mặt sau
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#f3f1ea", borderRadius: 12, padding: "1rem" }}>
          {face === "front" ? (
            <svg width="100%" viewBox="0 0 420 160" role="img" aria-label="Mặt trước MC964" style={{ display: "block", width: "100%", maxWidth: 420, height: "auto", aspectRatio: "420 / 160", margin: "0 auto" }}>
              <rect x="5" y="6" width="410" height="148" rx="4" fill={MC964_C.cream} stroke={MC964_C.stroke} strokeWidth="0.5" />
              <rect x="19" y="12" width="382" height="136" rx="2" fill={MC964_C.cream} stroke={MC964_C.stroke} strokeWidth="0.5" />
              <rect x="9" y="74" width="6" height="42" fill={MC964_C.metal} />
              <rect x="405" y="74" width="6" height="42" fill={MC964_C.metal} />

              <g style={{ cursor: "pointer" }} onClick={() => press("led")}>
                <rect x="34" y="26" width="140" height="58" rx="2" fill={MC964_C.ledFrame} />
                <rect x="42" y="31" width="123" height="48" rx="1" fill={MC964_C.ledInner} />
                <text x="103" y="63" textAnchor="middle" style={{ fontFamily: "monospace", fontSize: 27, fill: MC964_C.ledText, letterSpacing: 2 }}>0.000</text>
              </g>
              <text x="72" y="106" style={{ fontSize: 16, fill: MC964_C.brand, fontStyle: "italic", fontWeight: "bold" }}>Phylab</text>

              <g style={{ cursor: "pointer" }} onClick={() => press("mode")}>
                <circle cx="248" cy="55" r="14" fill="#C9C1C1" stroke={MC964_C.metal} strokeWidth="0.5" />
                <line x1="248" y1="55" x2={needle.x} y2={needle.y} stroke={MC964_C.needle} strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="248" cy="55" r="2.5" fill={MC964_C.needle} />
                <text x="248" y="82" textAnchor="middle" style={{ fontSize: 8.5, fontFamily: FONT, fontWeight: 900, fill: C.orangeDk }}>MODE {chau.label}</text>
              </g>
              {MC964_CHAU.map((c) => (
                <g key={c.m} onClick={() => press(c.m)} style={{ cursor: "pointer" }}>
                  <circle cx={c.x} cy={c.y - 3} r="9" fill={hot(c.m) ? "#FFE8D2" : c.m === mode ? "#E8F0FA" : "transparent"} />
                  <text x={c.x} y={c.y} textAnchor="middle" style={{ fontSize: 9, fontFamily: FONT, fontWeight: 900, fill: c.m === mode ? C.navy : "#222" }}>{c.label}</text>
                </g>
              ))}

              <g style={{ cursor: "pointer" }} onClick={() => press("reset")}>
                <circle cx="332" cy="48" r="9" fill={MC964_C.reset} stroke={MC964_C.metal} strokeWidth="0.5" />
                <text x="318" y="28" style={{ fontSize: 10, fontFamily: FONT, fontWeight: 800 }}>Reset</text>
              </g>

              <g style={{ cursor: "pointer" }} onClick={() => press("thang")}>
                <rect x="306" y="96" width="46" height="13" rx="4" fill={MC964_C.metal} />
                <line x1="329" y1="102" x2="340" y2="91" stroke="#4A4A4A" strokeWidth="1.5" strokeLinecap="round" />
                <text x="305" y="90" style={{ fontSize: 9, fontFamily: FONT, fontWeight: 700 }}>0.01</text>
                <text x="330" y="90" style={{ fontSize: 9, fontFamily: FONT, fontWeight: 700 }}>0.001</text>
                <text x="306" y="122" style={{ fontSize: 10, fontFamily: FONT, fontWeight: 800 }}>Thang đo</text>
              </g>
            </svg>
          ) : (
            <svg width="100%" viewBox="0 0 420 160" role="img" aria-label="Mặt sau MC964" style={{ display: "block", width: "100%", maxWidth: 420, height: "auto", aspectRatio: "420 / 160", margin: "0 auto" }}>
              <rect x="5" y="6" width="410" height="148" rx="4" fill={MC964_C.cream} stroke={MC964_C.stroke} strokeWidth="0.5" />
              <rect x="19" y="12" width="382" height="136" rx="2" fill={MC964_C.cream} stroke={MC964_C.stroke} strokeWidth="0.5" />
              <rect x="9" y="74" width="6" height="42" fill={MC964_C.metal} />
              <rect x="405" y="74" width="6" height="42" fill={MC964_C.metal} />
              {[
                { k: "socketA" as const, cx: 70, label: "A", lx: 66 },
                { k: "socketB" as const, cx: 120, label: "B", lx: 116 },
                { k: "socketC" as const, cx: 170, label: "C", lx: 166 }
              ].map((s) => (
                <g key={s.k} style={{ cursor: "pointer" }} onClick={() => press(s.k)}>
                  <circle cx={s.cx} cy="62" r="16" fill="#C9C1C1" stroke={hot(s.k) ? C.orange : MC964_C.stroke} strokeWidth={hot(s.k) ? 2.5 : 0.5} />
                  <circle cx={s.cx} cy="62" r="11" fill="#1a1a1a" />
                  <text x={s.lx} y="108" style={{ fontSize: 12, fontFamily: FONT, fontWeight: 700 }}>{s.label}</text>
                </g>
              ))}
              <rect x="44" y="92" width="150" height="42" rx="2" fill="none" stroke={MC964_C.stroke} strokeWidth="0.5" />
              <text x="150" y="128" style={{ fontSize: 11, fontFamily: FONT, fontWeight: 700 }}>+10V</text>
              <g style={{ cursor: "pointer" }} onClick={() => press("power")}>
                <rect x="320" y="40" width="22" height="40" rx="2" fill={MC964_C.metal} stroke={hot("power") ? C.orange : MC964_C.stroke} strokeWidth={hot("power") ? 2.5 : 0.5} />
                <rect x="322" y="42" width="18" height="36" rx="1" fill={powerOn ? "#3E8E3E" : "#C04C4C"} />
                <line x1="322" y1="60" x2="340" y2="60" stroke="#1a1a1a" strokeWidth="1" />
                <text x="328" y="55" style={{ fontSize: 9, fontStyle: "italic", fontFamily: FONT, fontWeight: "bold", fill: powerOn ? "#fff" : "#222" }}>I</text>
                <text x="328" y="74" style={{ fontSize: 9, fontStyle: "italic", fill: "#fff", fontFamily: FONT, fontWeight: "bold" }}>O</text>
                <text x="331" y="96" textAnchor="middle" style={{ fontSize: 8.5, fontFamily: FONT, fontWeight: 900, fill: powerOn ? C.good : "#B91C1C" }}>{powerOn ? "BẬT" : "TẮT"}</text>
              </g>
              <rect x="300" y="100" width="42" height="28" rx="2" fill="#1a1a1a" />
              <rect x="306" y="106" width="2" height="9" fill={MC964_C.metal} />
              <rect x="333" y="106" width="2" height="9" fill={MC964_C.metal} />
              <rect x="314" y="122" width="12" height="2" fill={MC964_C.metal} />
            </svg>
          )}
          <p style={{ fontSize: 12, color: "#999", margin: "10px 4px 0", fontFamily: FONT }}>Chạm vào bộ phận bất kì trên đồng hồ — hoặc làm theo thử thách ở trên.</p>
        </div>

        {/* minHeight cố định để nội dung đổi khi bấm không làm co giãn / nhảy layout đồng hồ */}
        <div style={{ background: "#fff", border: "0.5px solid #e5e3dc", borderRadius: 12, padding: "12px 14px", minHeight: 120 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "#1a1a1a", fontFamily: FONT }}>{info.title}</h3>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#555", fontFamily: FONT }}>{info.body}</p>
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
    <div style={{ maxWidth: 720, margin: "0 auto", fontFamily: FONT }}>
      <div style={{ background: "#ffffff", border: `1px solid ${C.line}`, borderRadius: 14, padding: "1rem" }}>
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
            <radialGradient id="cz-ball" cx="38%" cy="34%" r="72%"><stop offset="0%" stopColor="#a6a6aa" /><stop offset="55%" stopColor="#606065" /><stop offset="100%" stopColor="#37373b" /></radialGradient>
          </defs>
          <rect x={CX(-4.5)} y={CY(1.5)} width={(17 + 4.5) * CZ.PX} height={(1.5 + 0.9) * CZ.PX} rx="2" fill="url(#cz-beam)" stroke="#888" strokeWidth="0.6" />
          <rect x={CX(-4.0)} y={CY(1.0)} width={(16.8 + 4.0) * CZ.PX} height={1.0 * CZ.PX} fill="#fbfbfb" stroke="#bbb" strokeWidth="0.4" />
          {ticks}
          <text x={CX(-4.3)} y={CY(0.62)} style={{ fontSize: 14, fontWeight: "bold", fontStyle: "italic", fill: C.orange, pointerEvents: "none", fontFamily: FONT }}>Phylab</text>
          <path d={jlf} fill="url(#cz-jaw)" stroke="#888" strokeWidth="0.6" />
          <path d={juf} fill="url(#cz-jaw)" stroke="#888" strokeWidth="0.6" />
          <circle cx={CX(ballCx)} cy={CY(ballCy)} r={ballR * CZ.PX} fill="url(#cz-ball)" stroke={touched ? C.good : "#2a2a2e"} strokeWidth={touched ? 2.4 : 0.7} />
          <ellipse cx={CX(ballCx) - 7} cy={CY(ballCy) - 7} rx="5" ry="3.4" fill="#cdcdd0" opacity="0.5" />
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

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <span style={{ fontSize: 13, color: "#555", whiteSpace: "nowrap", fontWeight: 700, fontFamily: FONT }}>Kéo hàm di động</span>
          <input
            type="range" min={ballMm} max={maxMm} step={0.05}
            value={measure} onChange={(e) => setMeasure(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: C.orange }}
          />
        </div>
        <div style={{ background: touched ? GOOD_BG : "#E6F1FB", borderRadius: 8, padding: "9px 12px", marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: touched ? C.good : "#0C447C", lineHeight: 1.5, fontFamily: FONT, fontWeight: 700 }}>
            {touched
              ? "Vừa vặn! Hai hàm đã kẹp sát viên bi. Hãy đọc phần nguyên ở vạch 0 của du xích (nằm dưới thanh chính), rồi tìm vạch du xích nào trùng khít nhất với vạch trên thanh chính (vạch tô cam) nhân 0,05 mm để lấy phần lẻ."
              : "Kéo thanh trượt hoặc kéo trực tiếp du xích sao cho hai hàm chạm sát hai mép viên bi thép, sau đó tự đọc số đo và nhập vào ô bên dưới."}
          </p>
        </div>
        {onSubmit && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
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
  );
}
