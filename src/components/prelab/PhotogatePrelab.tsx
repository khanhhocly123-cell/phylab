"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const INFO = {
  gateA: {
    title: "Cổng quang điện A (nối ổ A)",
    body: "Gồm hai đầu D1 (phát tia hồng ngoại) và D2 (thu tia hồng ngoại) đặt đối diện nhau qua một khe hở. Khi vật cản đi qua khe, tia hồng ngoại bị chắn, cổng quang báo tín hiệu cho đồng hồ MC964 bắt đầu hoặc dừng đếm thời gian.",
  },
  gateB: {
    title: "Cổng quang điện B (nối ổ B)",
    body: "Có cấu tạo giống hệt cổng quang A, nhưng được nối vào ổ B của đồng hồ MC964. Dùng phối hợp với cổng A để đo thời gian vật đi từ cổng này sang cổng kia.",
  },
  ball: {
    title: "Vật cản (viên bi)",
    body: "Kéo vật để mô phỏng viên bi trượt qua hai cổng quang. Thời gian hiển thị chạy đúng theo tốc độ tay bạn kéo — đây là mô hình minh họa cơ chế nhận diện, chưa phải số liệu thí nghiệm thật.",
  },
  led: {
    title: "Kết quả đo (mô phỏng)",
    body: "Số chạy trực tiếp trong lúc vật đang chắn cổng (hoặc đang di chuyển từ A sang B). Kéo hết quãng đường rồi bắt đầu kéo lại từ đầu để đo một lần mới.",
  },
  mode: {
    title: "Chế độ đo",
    body: "MODE A: đo thời gian vật chắn cổng A. MODE B: đo thời gian vật chắn cổng B. MODE A↔B: đo thời gian vật đi từ cổng A sang cổng B, dùng để tính tốc độ trung bình.",
  },
};

const PC = {
  cream: "#FBF6EC",
  stroke: "#888780",
  ledFrame: "#61252C",
  ledInner: "#280C0F",
  ledText: "#FF2D2D",
  gate: "#E8A93C",
  gateShade: "#D49525",
  gateFoot: "#B9821F",
  eyeIdle: "#2B2B2B",
  eyeBlocked: "#FF4D4D",
  beamOn: "#FF4D4D",
  beamOff: "#D8D3C8",
  ball: "#7C8A93",
  ballHi: "#E7ECEF",
  rail: "#888780",
};

const TRACK_X0 = 55;
const TRACK_X1 = 385;
const GATE_A_X = 150;
const GATE_B_X = 290;
const RAIL_Y = 175;
const BALL_R = 14;
const GAP_HALF = 14;
const ARM_GAP = 19;
const ARM_W = 11;
const GATE_TOP = RAIL_Y - 48;
const GATE_BOT = RAIL_Y + 24;
const BASE_H = 10;
const FOOT_H = 8;
const BEAM_Y = RAIL_Y - 8;

type MeasureState = { status: string; startMs: number | null; elapsedMs: number | null };
const idleMeasure: MeasureState = { status: "idle", startMs: null, elapsedMs: null };

export default function PhotogatePrelab() {
  const [sel, setSel] = useState<keyof typeof INFO | null>(null);
  const [mode, setMode] = useState("A");
  const [ballX, setBallX] = useState(TRACK_X0);
  const [gateABlocked, setGateABlocked] = useState(false);
  const [gateBBlocked, setGateBBlocked] = useState(false);
  const [liveNow, setLiveNow] = useState<number | null>(null);
  const [measureA, setMeasureA] = useState<MeasureState>(idleMeasure);
  const [measureB, setMeasureB] = useState<MeasureState>(idleMeasure);
  const [measureAB, setMeasureAB] = useState<{ tA: number | null; tB: number | null; elapsedMs: number | null }>({ tA: null, tB: null, elapsedMs: null });

  const draggingRef = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const blockingARef = useRef(false);
  const blockingBRef = useRef(false);
  const modeRef = useRef(mode);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  const resetForMode = useCallback((m: string) => {
    blockingARef.current = false;
    blockingBRef.current = false;
    setGateABlocked(false);
    setGateBBlocked(false);
    if (m === "A") setMeasureA({ ...idleMeasure });
    if (m === "B") setMeasureB({ ...idleMeasure });
    if (m === "AAB") setMeasureAB({ tA: null, tB: null, elapsedMs: null });
  }, []);

  const clientToSvgX = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return TRACK_X0;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return TRACK_X0;
    const loc = pt.matrixTransform(ctm.inverse());
    return Math.min(TRACK_X1, Math.max(TRACK_X0, loc.x));
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!draggingRef.current) return;
    const x = clientToSvgX(clientX, clientY);
    setBallX(x);

    const now = performance.now();
    const m = modeRef.current;
    const inA = Math.abs(x - GATE_A_X) <= GAP_HALF;
    const inB = Math.abs(x - GATE_B_X) <= GAP_HALF;

    if (inA !== blockingARef.current) {
      blockingARef.current = inA;
      setGateABlocked(inA);
      if (m === "A") {
        if (inA) {
          setMeasureA({ status: "blocking", startMs: now, elapsedMs: null });
        } else {
          setMeasureA((prev) => prev.startMs !== null
            ? { status: "done", startMs: null, elapsedMs: now - prev.startMs }
            : prev);
        }
      }
      if (m === "AAB" && inA) {
        setMeasureAB((prev) => (prev.tA === null ? { ...prev, tA: now } : prev));
      }
    }

    if (inB !== blockingBRef.current) {
      blockingBRef.current = inB;
      setGateBBlocked(inB);
      if (m === "B") {
        if (inB) {
          setMeasureB({ status: "blocking", startMs: now, elapsedMs: null });
        } else {
          setMeasureB((prev) => prev.startMs !== null
            ? { status: "done", startMs: null, elapsedMs: now - prev.startMs }
            : prev);
        }
      }
      if (m === "AAB" && inB) {
        setMeasureAB((prev) => (prev.tA !== null && prev.tB === null
          ? { ...prev, tB: now, elapsedMs: now - prev.tA }
          : prev));
      }
    }
  }, [clientToSvgX]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => handleMove(e.clientX, e.clientY);
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [handleMove]);

  const isCounting =
    (mode === "A" && measureA.status === "blocking" && measureA.startMs !== null) ||
    (mode === "B" && measureB.status === "blocking" && measureB.startMs !== null) ||
    (mode === "AAB" && measureAB.tA !== null && measureAB.tB === null);

  useEffect(() => {
    if (!isCounting) {
      const timer = setTimeout(() => setLiveNow(null), 0);
      return () => clearTimeout(timer);
    }
    let raf = 0;
    const loop = () => { setLiveNow(performance.now()); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isCounting]);

  const startDrag = () => {
    draggingRef.current = true;
    resetForMode(modeRef.current);
  };

  const fmt = (ms: number | null) => (ms === null ? "0.000" : (ms / 1000).toFixed(3));

  let liveMs: number | null = null;
  if (liveNow !== null) {
    if (mode === "A" && measureA.startMs !== null) liveMs = liveNow - measureA.startMs;
    else if (mode === "B" && measureB.startMs !== null) liveMs = liveNow - measureB.startMs;
    else if (mode === "AAB" && measureAB.tA !== null) liveMs = liveNow - measureAB.tA;
  }

  let ledValue = "0.000";
  let ledHint = "";
  if (mode === "A") {
    ledValue = fmt(liveMs !== null ? liveMs : measureA.elapsedMs);
    ledHint = measureA.status === "blocking" ? "Đang chắn cổng A" : measureA.status === "done" ? "Xong — kéo lại để đo lại" : "Kéo vật qua cổng A";
  } else if (mode === "B") {
    ledValue = fmt(liveMs !== null ? liveMs : measureB.elapsedMs);
    ledHint = measureB.status === "blocking" ? "Đang chắn cổng B" : measureB.status === "done" ? "Xong — kéo lại để đo lại" : "Kéo vật qua cổng B";
  } else {
    ledValue = fmt(liveMs !== null ? liveMs : measureAB.elapsedMs);
    ledHint = measureAB.elapsedMs !== null ? "Xong — kéo lại để đo lại" : measureAB.tA !== null ? "Đã qua cổng A, chờ cổng B" : "Kéo vật qua cổng A trước";
  }

  const info = sel ? INFO[sel] : { title: "Cổng quang điện", body: "Gồm hai đầu thu – phát tia hồng ngoại (D1, D2) đặt đối diện nhau qua một khe hở. Khi vật cản đi qua khe, tia bị chắn và cổng quang báo tín hiệu cho đồng hồ đo thời gian. Chạm từng bộ phận hoặc kéo vật để tìm hiểu." };

  const modeStyle = (active: boolean) => ({
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 8,
    cursor: "pointer" as const,
    border: active ? "0.5px solid #1F4D78" : "0.5px solid #ccc",
    background: active ? "#1F4D78" : "transparent",
    color: active ? "#fff" : "#222",
  });

  const renderGateBack = (gx: number, label: string, blocked: boolean, key: keyof typeof INFO) => {
    const rightArmX = gx + ARM_GAP;
    return (
      <g style={{ cursor: "pointer" }} onClick={() => setSel(key)}>
        <rect x={gx - ARM_GAP - ARM_W} y={GATE_BOT} width={ARM_GAP * 2 + ARM_W * 2} height={BASE_H} rx={3} fill={PC.gate} />
        <rect x={gx - 14} y={GATE_BOT + BASE_H} width={28} height={FOOT_H} rx={2} fill={PC.gateFoot} />
        <rect x={rightArmX} y={GATE_TOP} width={ARM_W} height={GATE_BOT - GATE_TOP} rx={2} fill={PC.gate} />
        <rect x={rightArmX} y={GATE_TOP + 4} width={2} height={GATE_BOT - GATE_TOP - 8} rx={0.5} fill={PC.gateShade} opacity={0.4} />
        <circle cx={rightArmX + ARM_W / 2} cy={BEAM_Y} r={3.2} fill={blocked ? PC.eyeBlocked : PC.eyeIdle} />
        <text x={rightArmX + ARM_W + 5} y={GATE_TOP + 16} textAnchor="start" style={{ fontSize: 11, fontWeight: 700, fill: "#C0392B" }}>D2</text>
        <line x1={gx - ARM_GAP} y1={BEAM_Y} x2={gx + ARM_GAP} y2={BEAM_Y} stroke={blocked ? PC.beamOff : PC.beamOn} strokeWidth={blocked ? 1.2 : 2} strokeDasharray="3 2" />
        <text x={gx} y={GATE_BOT + BASE_H + FOOT_H + 14} textAnchor="middle" style={{ fontSize: 12, fontWeight: 600, fill: "#1F4D78" }}>Cổng {label}</text>
      </g>
    );
  };

  const renderGateFront = (gx: number, blocked: boolean, key: keyof typeof INFO) => {
    const leftArmX = gx - ARM_GAP - ARM_W;
    return (
      <g style={{ cursor: "pointer" }} onClick={() => setSel(key)}>
        <rect x={leftArmX} y={GATE_TOP} width={ARM_W} height={GATE_BOT - GATE_TOP} rx={2} fill={PC.gate} />
        <rect x={leftArmX + ARM_W - 2} y={GATE_TOP + 4} width={2} height={GATE_BOT - GATE_TOP - 8} rx={0.5} fill={PC.gateShade} opacity={0.35} />
        <rect x={leftArmX + ARM_W} y={GATE_TOP + 2} width={3} height={GATE_BOT - GATE_TOP - 4} rx={1} fill="#000" opacity={0.06} />
        <circle cx={leftArmX + ARM_W / 2} cy={BEAM_Y} r={3.2} fill={blocked ? PC.eyeBlocked : PC.eyeIdle} />
        <text x={leftArmX - 5} y={GATE_TOP + 16} textAnchor="end" style={{ fontSize: 11, fontWeight: 700, fill: "#C0392B" }}>D1</text>
      </g>
    );
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["A", "B", "AAB"].map((m) => (
          <button key={m} style={modeStyle(mode === m)} onClick={() => { setMode(m); resetForMode(m); setSel("mode"); }}>
            {m === "AAB" ? "A ↔ B" : `MODE ${m}`}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#f3f1ea", borderRadius: 12, padding: "1rem" }}>
          <svg ref={svgRef} width="100%" viewBox="0 0 440 250" role="img" aria-label="Cổng quang điện" style={{ display: "block", touchAction: "none" }}>
            <rect x="5" y="6" width="430" height="238" rx="4" fill={PC.cream} stroke={PC.stroke} strokeWidth="0.5" />
            <g style={{ cursor: "pointer" }} onClick={() => setSel("led")}>
              <rect x="150" y="16" width="140" height="38" rx="3" fill={PC.ledFrame} />
              <rect x="155" y="19" width="130" height="32" rx={2} fill={PC.ledInner} />
              <text x="220" y="42" textAnchor="middle" style={{ fontFamily: "monospace", fontSize: 19, fill: PC.ledText, letterSpacing: 1 }}>{ledValue}</text>
            </g>
            <text x="220" y="66" textAnchor="middle" style={{ fontSize: 11, fill: "#8a8a8a" }}>{ledHint}</text>
            {renderGateBack(GATE_A_X, "A", gateABlocked, "gateA")}
            {renderGateBack(GATE_B_X, "B", gateBBlocked, "gateB")}
            <line x1={TRACK_X0} y1={RAIL_Y} x2={TRACK_X1} y2={RAIL_Y} stroke={PC.rail} strokeWidth={4} strokeLinecap="round" />
            <g style={{ cursor: "grab", touchAction: "none" }} onPointerDown={() => { setSel("ball"); startDrag(); }}>
              <circle cx={ballX} cy={RAIL_Y} r={BALL_R} fill={PC.ball} stroke="#4A5560" strokeWidth={1.2} />
              <circle cx={ballX - 4} cy={RAIL_Y - 5} r={4} fill={PC.ballHi} opacity={0.7} />
              <circle cx={ballX - 2} cy={RAIL_Y - 2} r={1.8} fill="#fff" opacity={0.5} />
            </g>
            {renderGateFront(GATE_A_X, gateABlocked, "gateA")}
            {renderGateFront(GATE_B_X, gateBBlocked, "gateB")}
          </svg>
          <p style={{ fontSize: 12, color: "#999", margin: "10px 4px 0" }}>Kéo viên bi qua khe hở giữa D1 – D2. Chạm vào bộ phận bất kì để tìm hiểu.</p>
        </div>
        <div style={{ background: "#fff", border: "0.5px solid #e5e3dc", borderRadius: 12, padding: "12px 14px" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>{info.title}</h3>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#555" }}>{info.body}</p>
        </div>
      </div>
    </div>
  );
}
