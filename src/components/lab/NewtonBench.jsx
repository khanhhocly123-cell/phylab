"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeftRight, Check, Hand, Minus, Plus, SlidersHorizontal, Undo2, X, ZoomIn, ZoomOut } from "lucide-react";
import { C, FONT } from "../../engine/tokens.js";
import { gauss } from "../../engine/noise.js";
import { NEWTON2, forceOf, massOf, sgkIndexOf, planMotion, accelFromTime, fitOrigin } from "../../engine/physicsNewton2.js";
import {
  LabTopBar, NextStepCard, ChecklistCard, FinishButton, MobileLabSheet, LabToast, LabDialog, ProgressPills,
  panelCard, sectionHead, sectionTitle, countPill, btnSecondary, btnSoft, mobileLabColumns,
} from "./LabChrome.jsx";
import { fitViewBox, svgPoint, useBoxSize } from "./stageFit.js";
import LiveGraph from "./LiveGraph.jsx";
import { labSound } from "./labSound.js";
import { useAnimStore, useAnim } from "./animStore.js";
import { MC964Face } from "./mech/MechParts.jsx";
import {
  AT, G1_X, rulerX, hookYOf, hangerHeight, dropOf,
  AirTrackRoom, AirTrack15, AirPump15, Glider15, Photogate15, Pulley15, Hanger15, WeightBox15, WeightDisc15, Scale15, AirTrackIcon,
} from "./mech/AirTrackParts.jsx";

/* ============================================================================
   NewtonBench — Bài 15 (Vật lí 10 KNTT) "Thí nghiệm minh hoạ định luật 2 Newton".
   Theo sát SGK (Hình 15.2, Bảng 15.1): xe trượt M = 200 g trên máng đệm khí, dây vắt qua ròng rọc
   móc các quả nặng 50 g; hai cổng quang cách nhau 0,5 m; tấm chắn sáng 10 cm đặt SÁT cổng 1 (v0 = 0);
   đồng hồ MODE A↔B đo t → a = 2s/t². Đo 5 cột Bảng 15.1 rồi đọc hai đồ thị Hình 15.3.

   SÁT THỰC TẾ, NGHỊCH ĐƯỢC:
   - Tay giữ / buông xe tuỳ ý: bấm vào xe là tay giữ (kéo đi đâu cũng được), chạm lần nữa hoặc bấm
     "Thả tay" là buông — xe chạy ngay theo lực thật (planMotion). Xe đang chạy vẫn chụp lại được.
   - Tự tay đặt quả nặng: kéo từng quả 50 g từ hộp lên móc treo (tạo lực kéo) hoặc lên xe, kéo về hộp,
     chuyển qua lại. Xe không có tay giữ mà treo thêm quả → xe chạy luôn.
   - Máy nén khí có công tắc + núm lưu lượng 1–3: nấc 1 đệm khí mỏng, xe còn cọ máng.
   - Đồng hồ MC964 chạy theo TÍN HIỆU cổng quang như máy thật: kéo xe bằng tay qua cổng cũng làm đồng hồ
     chạy/dừng, giữ xe giữa hai cổng thì đồng hồ vẫn đếm, không Reset thì cộng dồn.
   Làm ẩu thì số liệu lệch và bench nói rõ vì sao.
   ========================================================================== */

const { VBW, VBH, PXM } = AT;
const BOUNDS = [0, 0, VBW, VBH];
const SLOW = 3;                                          // chiếu chậm ×3 (đồng hồ vẫn đếm theo thời gian thật của thí nghiệm)
const FLAG = NEWTON2.flag;                               // tấm chắn 10 cm
const xRel = (xs) => (xs - G1_X) / PXM;                  // vị trí mép tấm chắn so với cổng 1 (m)
const xsOf = (x) => G1_X + x * PXM;
const XS_END = AT.TRACK_R - 10 - AT.GLIDER_FRONT - 3;    // mép tấm chắn khi xe chạm đệm cuối máng
const X_END = xRel(XS_END);
const X_MIN = -NEWTON2.startMax;                         // dây ngắn: lùi quá 10 cm thì móc treo chạm ròng rọc
const SAT_X = -0.00002;                                  // "sát cổng 1": mép tấm chắn cách tia 0,02 mm (chưa che tia)
const XS_PARK = G1_X - 22;                               // chỗ đặt xe lúc vừa lắp
const GATE_CM = { min: 30, max: 70, sgk: 50 };
const LIFT = [0, 0.6, 1.6, 2.2];                         // xe nổi trên đệm khí theo nấc lưu lượng
const clk = () => performance.now() / 1000 / SLOW;       // đồng hồ thí nghiệm (giây, đã chiếu chậm)
/** Tấm chắn phủ khoảng (x − 10 cm, x] — tia của cổng đặt ở gx bị che không? */
const blockedAt = (x, gx) => gx > x - FLAG && gx <= x;

const MODES = ["A", "B", "A+B", "A<->B", "T"];
const MODE_LABEL = { "A": "A", "B": "B", "A+B": "A+B", "A<->B": "A↔B", "T": "T" };
const MODE_ANGLE = { "A": -101, "B": -49, "A+B": 0, "A<->B": 50, "T": 101 };
const PLUG_INFO = (src) => (src === "g1" ? { text: "1", color: C.navy } : src === "g2" ? { text: "2", color: "#C0392B" } : null);

// Dụng cụ theo Hình 15.2 (số trong ngoặc là số chú thích của SGK).
const TOOLS = [
  { k: "track",   name: "Máng đệm khí (2)",      sub: "có thước cm", icon: "track15" },
  { k: "pump",    name: "Máy nén khí (9)",       sub: "thổi đệm khí", icon: "pump15" },
  { k: "pulley",  name: "Ròng rọc (5)",          sub: "kẹp mép bàn", icon: "pulley15" },
  { k: "glider",  name: "Xe trượt 200 g",        sub: "buộc dây + móc", icon: "glider15" },
  { k: "flag",    name: "Tấm chắn sáng (1)",     sub: "dài 10 cm", icon: "flag15" },
  { k: "gate1",   name: "Cổng quang 1 (3)",      sub: "±0,0003 s", icon: "gate15a" },
  { k: "gate2",   name: "Cổng quang 2 (4)",      sub: "±0,0003 s", icon: "gate15b" },
  { k: "clock",   name: "Đồng hồ hiện số (7)",   sub: "±0,001 s", icon: "clock15" },
  { k: "scale",   name: "Cân điện tử (8)",       sub: "±0,1 g", icon: "scale15" },
  { k: "weights", name: "Hộp quả nặng (6)",      sub: "10 × 50 g", icon: "weights15" },
];
const toolIcon = (k) => TOOLS.find((t) => t.k === k)?.icon;
const GROUPS = [["track"], ["pump", "pulley"], ["glider"], ["flag"], ["gate1", "gate2"], ["clock"], ["scale", "weights"]];

const CLK = AT.CLK;
const SOCK = { A: 66, B: 114 };
const socketPos = (s) => ({ x: CLK.x + SOCK[s] * CLK.s, y: CLK.y + 52 * CLK.s });
const plugPos = (gateX) => ({ x: gateX + 9, y: 268 });

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const n1 = (v) => String(Number(v).toFixed(1)).replace(".", ",");
const n2 = (v) => String(Number(v).toFixed(2)).replace(".", ",");
const kg = (v) => `${String(+Number(v).toFixed(2)).replace(".", ",")} kg`;
const newton = (v) => `${String(+Number(v).toFixed(2)).replace(".", ",")} N`;
const SGK = NEWTON2.sgkConfigs.map((c, i) => ({ ...c, i, F: forceOf(c.hang), mass: massOf(c.hang, c.cart) }));
const CIRCLED = ["①", "②", "③", "④", "⑤"];

/** Lần đo "chuẩn" (được tính vào Bảng 15.1): MODE A↔B, đệm khí đủ, máng ngang, xe tự chạy từ sát cổng 1,
 *  không bị giữ giữa chừng, quả treo chưa chạm sàn trước cổng 2, không cộng dồn, hai cổng cách 50 cm. */
const isClean = (t) => t.pumpLevel >= 2 && t.level && t.sat && !t.byHand && !t.grabbed && !t.landsEarly && !t.accumulated
  && t.mode === "A<->B" && t.gateCm === GATE_CM.sgk;
/** Vì sao lần đo không được tính (câu ngắn) — null nếu chuẩn. */
function flawOf(t) {
  if (t.accumulated) return "đồng hồ cộng dồn (chưa Reset)";
  if (t.byHand) return "tay kéo xe qua cổng quang";
  if (t.grabbed) return "tay giữ xe giữa hai cổng";
  if (t.mode !== "A<->B") return `MODE ${MODE_LABEL[t.mode]}`;
  if (t.pumpLevel < 2) return t.pumpLevel === 0 ? "máy nén khí đang tắt" : "lưu lượng khí yếu — xe cọ máng";
  if (!t.level) return "máng chưa nằm ngang";
  if (!t.sat) return `xe xuất phát cách cổng 1 ${n1((t.startGap ?? 0) * 100)} cm`;
  if (t.landsEarly) return "quả treo chạm sàn trước cổng 2";
  if (t.gateCm !== GATE_CM.sgk) return `hai cổng cách ${t.gateCm} cm`;
  return null;
}

export default function NewtonBench({ assignedSets, onExportNote, onBack, onReplayPrelab, speak, muted, onToggleMute, onTour }) {
  void assignedSets; // Bài 15 chưa có đề giáo viên riêng (lớp học đang khoá) — giữ chữ ký chung các bench.

  const [placed, setPlaced] = useState(() => new Set());
  const [pumpOn, setPumpOn] = useState(false);
  const [flow, setFlow] = useState(1);                        // núm lưu lượng: 1 yếu · 2 vừa · 3 mạnh
  const [level, setLevel] = useState(false);
  const [weighed, setWeighed] = useState({ M: false, m: false });
  const [scaleItem, setScaleItem] = useState(null);           // "glider" | "weight" | null
  const [gateCm, setGateCm] = useState(40);                   // khoảng cách hai cổng quang (cm)
  const [wires, setWires] = useState({ A: null, B: null });   // A ← cổng 1, B ← cổng 2
  const [wireDrag, setWireDrag] = useState(null);
  const [power, setPower] = useState(false);
  const [mode, setMode] = useState("A+B");
  const [scale, setScale] = useState("fine");
  const [face, setFace] = useState("front");
  const [hang, setHang] = useState(0);                        // quả nặng treo ở móc
  const [cart, setCart] = useState(0);                        // quả nặng đặt trên xe
  const [xs, setXs] = useState(XS_PARK);                      // mép trước tấm chắn khi xe đứng yên (toạ độ cảnh)
  const [held, setHeld] = useState(true);                     // tay đang giữ xe
  const [moving, setMoving] = useState(false);                // xe đang tự chạy
  const [led, setLed] = useState("0.000");
  const [timerOn, setTimerOn] = useState(false);              // đồng hồ đang đếm
  const [trials, setTrials] = useState([]);
  const [lastRun, setLastRun] = useState(null);               // phép đo vừa kết thúc (đồng hồ vừa dừng)
  const [justRan, setJustRan] = useState(false);
  const [wDrag, setWDrag] = useState(null);                   // quả nặng đang kéo: { from, x, y }
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [dragTool, setDragTool] = useState(null);
  const [flyTool, setFlyTool] = useState(null);
  const [graphTab, setGraphTab] = useState("F");

  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [viewportW, setViewportW] = useState(1280);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [zoomMode, setZoomMode] = useState("full");           // "full" | "track" | "clock"
  const [controlsOpen, setControlsOpen] = useState(false);

  const pumpLevel = pumpOn ? flow : 0;
  const anim = useAnimStore({ xs: XS_PARK, led: "0.000", blocked: { g1: false, g2: false } });
  const rafRef = useRef(0);
  const mainRef = useRef(null);
  const toastTimer = useRef(null);
  const scaleTimer = useRef(null);
  const lastSpoken = useRef("");
  const milestones = useRef(new Set());
  const nextId = useRef(1);
  // Chuyển động & đồng hồ sống ngoài React state (đổi từng khung hình / theo sự kiện cổng quang).
  const simRef = useRef({ x: xRel(XS_PARK), plan: null, tStart: 0, events: [], cfg: null });
  const timerRef = useRef({ value: 0, since: null, meta: null });
  const liveRef = useRef({});
  useEffect(() => {
    liveRef.current = { mode, wires, power, scale, hang, cart, pumpLevel, level, gateCm, muted };
  });

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(
        window.innerWidth < 768
        || window.matchMedia("(pointer: coarse) and (max-width: 1024px)").matches
        || window.matchMedia("(max-height: 600px) and (max-width: 1024px)").matches
      );
      setIsPortrait(window.innerHeight >= window.innerWidth);
      setViewportW(window.innerWidth);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (scaleTimer.current) clearTimeout(scaleTimer.current);
  }, []);

  /** flash("chữ") hoặc flash({ text, kind: "win" | "warn" }). */
  const flash = (m, duration = 2600) => {
    const next = typeof m === "string" ? { text: m } : m;
    setToast((old) => ({ ...next, id: (old?.id || 0) + 1 }));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), duration);
  };
  const sound = (name) => { if (!liveRef.current.muted) labSound[name]?.(); };

  /* ---------------- Lắp ráp ---------------- */
  const required = TOOLS.map((t) => t.k);
  const activeGroup = GROUPS.find((g) => g.some((k) => !placed.has(k))) || [];
  const isNextTool = (k) => activeGroup.includes(k) && !placed.has(k);
  const assembled = required.every((k) => placed.has(k));
  const has = (k) => placed.has(k);

  function placeTool(k) {
    if (placed.has(k)) return;
    if (!isNextTool(k)) { flash(`Lắp theo thứ tự — bước này: ${activeGroup.filter((x) => !placed.has(x)).map((x) => TOOLS.find((t) => t.k === x)?.name).join(" / ")}.`); return; }
    setPlaced((p) => new Set(p).add(k));
  }
  function flyToPlace(k, x, y) {
    if (document.hidden || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { placeTool(k); return; }
    const tgt = targetOf(k, gateCm), dur = 340;
    let t0 = null;
    const step = (now) => {
      if (t0 === null) t0 = now;
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      setFlyTool({ k, x: x + (tgt.x - x) * e, y: y + (tgt.y - y) * e });
      if (p < 1) requestAnimationFrame(step);
      else { setFlyTool(null); placeTool(k); }
    };
    requestAnimationFrame(step);
  }
  function startToolDrag(k, e) {
    if (placed.has(k)) return; e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch { /* không hỗ trợ capture */ }
    let moved = false;
    let lastX = e.clientX, lastY = e.clientY;
    setDragTool({ k, x: e.clientX, y: e.clientY });
    const move = (ev) => { moved = true; lastX = ev.clientX; lastY = ev.clientY; setDragTool({ k, x: ev.clientX, y: ev.clientY }); };
    const up = (ev) => {
      try { e.target.releasePointerCapture(e.pointerId); } catch { /* đã nhả */ }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setDragTool(null);
      if (!isNextTool(k)) { flash(`Lắp theo thứ tự — bước này: ${activeGroup.filter((x) => !placed.has(x)).map((x) => TOOLS.find((t) => t.k === x)?.name).join(" / ")}.`); return; }
      const svg = mainRef.current?.querySelector("svg");
      const tgt = targetOf(k, gateCm);
      if (!svg || !moved) { flyToPlace(k, tgt.x, tgt.y - 60); return; }
      const p = svgPoint(svg, ev.clientX || lastX, ev.clientY || lastY);
      if (Math.hypot(p.x - tgt.x, p.y - tgt.y) < 110) flyToPlace(k, p.x, p.y);
      else flash(`Kéo "${TOOLS.find((t) => t.k === k).name}" vào ô sáng trên bàn để lắp.`);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  /* ---------------- Trạng thái đo ---------------- */
  const g2x = rulerX(AT.G1_CM + gateCm);
  const gateOK = gateCm === GATE_CM.sgk;
  const clockWired = wires.A === "g1" && wires.B === "g2";
  const modeOK = mode === "A<->B";
  const weighedAll = weighed.M && weighed.m;
  const pumpOK = pumpOn && flow >= 2;
  const setupDone = assembled && pumpOK && level && weighedAll && gateOK && clockWired && power && modeOK;
  const zeroLed = (0).toFixed((NEWTON2.scales[scale] || NEWTON2.scales.fine).dp);
  const isReset = led === zeroLed && !timerOn;
  const xNow = xRel(xs);
  const inStartZone = xNow >= X_MIN - 1e-6 && xNow <= SAT_X + 1e-6;
  const sat = inStartZone && Math.abs(xNow - SAT_X) < 1e-6;
  const inBox = NEWTON2.box - hang - cart;
  const F = forceOf(hang), mass = massOf(hang, cart);
  const cfgIndex = sgkIndexOf(hang, cart);

  /* Bảng 15.1: mỗi cột SGK lấy các lần đo "chuẩn"; cấu hình khác xếp thành dòng khám phá. */
  const cleanTrials = useMemo(() => trials.filter(isClean), [trials]);
  const columns = useMemo(() => {
    const byKey = new Map();
    for (const t of trials) {
      const key = `${t.hang}-${t.cart}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(t);
    }
    const summarize = (items) => {
      const clean = items.filter(isClean);
      const tMean = clean.length ? clean.reduce((s, t) => s + t.t, 0) / clean.length : null;
      return { items, clean, tMean, aMean: tMean ? accelFromTime(tMean) : null };
    };
    const sgkCols = SGK.map((c) => ({ ...c, sgk: true, ...summarize(byKey.get(`${c.hang}-${c.cart}`) || []) }));
    const extra = [...byKey.entries()]
      .filter(([key]) => !SGK.some((c) => `${c.hang}-${c.cart}` === key))
      .map(([key, items]) => {
        const [h, c] = key.split("-").map(Number);
        return { key, hang: h, cart: c, F: forceOf(h), mass: massOf(h, c), sgk: false, ...summarize(items) };
      })
      .sort((a, b) => a.F - b.F || a.mass - b.mass);
    return [...sgkCols, ...extra];
  }, [trials]);
  const sgkDone = columns.filter((c) => c.sgk && c.clean.length > 0).length;
  const allDone = sgkDone === SGK.length;
  const target = SGK.find((c) => !columns[c.i].clean.length) || null;

  // Hai đồ thị của SGK (Hình 15.3): a–F khi M + m = 0,5 kg; a–1/(M + m) khi F = 1 N.
  const ptsF = cleanTrials.filter((t) => Math.abs(t.mass - 0.5) < 1e-6).map((t) => ({ x: t.F, y: t.a, key: t.id }));
  const ptsM = cleanTrials.filter((t) => Math.abs(t.F - 1) < 1e-6).map((t) => ({ x: 1 / t.mass, y: t.a, key: t.id }));
  const distinct = (pts) => new Set(pts.map((p) => p.x.toFixed(4))).size;
  const fitF = distinct(ptsF) >= 2 ? fitOrigin(ptsF) : null;   // a = k·F  → k = 1/(M + m)
  const fitM = distinct(ptsM) >= 2 ? fitOrigin(ptsM) : null;   // a = k·(1/m) → k = F

  /* ======================= ĐỒNG HỒ MC964 theo tín hiệu cổng quang ======================= */
  const fmtLed = (v) => {
    const sc = NEWTON2.scales[liveRef.current.scale] || NEWTON2.scales.fine;
    return Math.min(sc.max, Math.round(v / sc.res) * sc.res).toFixed(sc.dp);
  };
  const timerValue = (t) => { const T = timerRef.current; return T.value + (T.since != null ? Math.max(0, t - T.since) : 0); };
  const snapshotCfg = () => {
    const L = liveRef.current;
    return { hang: L.hang, cart: L.cart, F: forceOf(L.hang), mass: massOf(L.hang, L.cart), pumpLevel: L.pumpLevel, level: L.level, gateCm: L.gateCm };
  };
  /** Đồng hồ vừa dừng → một phép đo hoàn tất. */
  function measured(ctx) {
    const T = timerRef.current;
    const meta = T.meta || {};
    const shown = fmtLed(T.value);
    setLed(shown);
    anim.set({ led: shown });
    setLastRun({
      ...(meta.cfg || snapshotCfg()),
      t: Number(shown), mode: liveRef.current.mode,
      accumulated: Boolean(meta.accumulated),
      byHand: Boolean(meta.byHand || ctx.byHand),
      grabbed: Boolean(meta.grabbed),
      startGap: meta.startGap ?? null,
      sat: !meta.byHand && meta.startGap != null && meta.startGap <= 0.0005,
      landsEarly: Boolean(ctx.landsEarly),
    });
    setJustRan(true);
    T.meta = null;
  }
  /** Một tín hiệu cổng quang (tấm chắn bắt đầu che / thôi che tia) lúc t. */
  function gateEvent(gate, edge, t, ctx) {
    const L = liveRef.current;
    if (!L.power) return;
    const sock = L.wires.A === gate ? "A" : L.wires.B === gate ? "B" : null;
    if (!sock) return;
    const T = timerRef.current;
    const start = () => {
      if (T.since != null) return;
      if (!T.meta) T.meta = { accumulated: T.value > 0, byHand: Boolean(ctx.byHand), grabbed: false, startGap: ctx.startGap ?? null, cfg: ctx.cfg || snapshotCfg() };
      T.since = t;
      setTimerOn(true);
      ensureLoop();
    };
    const stop = (emit) => {
      if (T.since == null) return;
      T.value += Math.max(0, t - T.since);
      T.since = null;
      setTimerOn(false);
      if (emit) measured(ctx);
    };
    switch (L.mode) {
      case "A<->B": if (edge === "in") { if (sock === "A") start(); else stop(true); } break;
      case "A": if (sock === "A") { if (edge === "in") start(); else stop(true); } break;
      case "B": if (sock === "B") { if (edge === "in") start(); else stop(true); } break;
      case "A+B": if (edge === "in") start(); else stop(sock === "B"); break;
      default:
    }
  }
  function resetTimer() {
    const T = timerRef.current;
    T.value = 0; T.since = null; T.meta = null;
    setTimerOn(false); setLed(zeroLed); setJustRan(false); setLastRun(null);
    anim.set({ led: zeroLed });
  }

  /* ======================= CHUYỂN ĐỘNG: giữ / buông / chụp xe ======================= */
  const gatePositions = () => [["g1", 0], ["g2", liveRef.current.gateCm / 100]];
  function tick() {
    rafRef.current = 0;
    const t = clk();
    const sim = simRef.current;
    if (sim.plan) {
      while (sim.events.length && sim.events[0].t <= t) {
        const ev = sim.events.shift();
        gateEvent(ev.gate, ev.edge, ev.t, { cfg: sim.cfg, startGap: sim.startGap, landsEarly: ev.landsEarly });
        if (ev.edge === "in") sound("gate");
      }
      const tau = t - sim.tStart;
      sim.x = sim.plan.xAt(Math.min(tau, sim.plan.tEnd));
      if (tau >= sim.plan.tEnd) {
        const bumped = sim.x >= X_END - 1e-6;
        sim.plan = null; sim.events = [];
        setMoving(false);
        setXs(xsOf(sim.x));
        if (bumped) sound("stop");
      }
    }
    const [[, gx1], [, gx2]] = gatePositions();
    anim.set({ xs: xsOf(sim.x), led: fmtLed(timerValue(t)), blocked: { g1: blockedAt(sim.x, gx1), g2: blockedAt(sim.x, gx2) } });
    if (sim.plan || timerRef.current.since != null) rafRef.current = requestAnimationFrame(tick);
  }
  function ensureLoop() { if (!rafRef.current) rafRef.current = requestAnimationFrame(tick); }

  /** Buông tay tại vị trí hiện tại: xe chạy theo lực thật (hoặc đứng yên nếu không có lực kéo / ma sát giữ lại). */
  function startMotion(reason) {
    const L = liveRef.current;
    const sim = simRef.current;
    const x0 = sim.x - NEWTON2.noise.start * Math.abs(gauss());   // tay buông không tuyệt đối đúng chỗ
    const plan = planMotion({ hang: L.hang, cart: L.cart, pump: L.pumpLevel, level: L.level, x0, xLand: dropOf(L.hang), xEnd: X_END });
    if (!plan.moves) {
      if (reason === "release") {
        const slack = x0 >= dropOf(L.hang);
        flash(L.hang === 0 ? "Chưa treo quả nặng nào — không có lực kéo nên xe đứng yên."
          : slack ? "Quả treo đang nằm trên đệm hứng (dây chùng) — không có lực kéo."
            : { text: L.pumpLevel === 0 ? "Xe không nhúc nhích! Máy nén khí tắt nên xe tì lên máng — ma sát nghỉ giữ xe lại." : "Xe không nhúc nhích — lực kéo không thắng được ma sát.", kind: "warn" }, 3800);
      }
      return false;
    }
    const t0 = clk();
    const events = [];
    for (const [gate, gx] of gatePositions()) {
      const lat = () => NEWTON2.noise.timer * gauss();
      if (gx > x0) {
        const ti = plan.timeAtX(gx);
        if (Number.isFinite(ti)) events.push({ t: t0 + ti + lat(), gate, edge: "in", landsEarly: ti > plan.tLand });
      }
      if (gx + FLAG > x0) {
        const to = plan.timeAtX(gx + FLAG);
        if (Number.isFinite(to)) events.push({ t: t0 + to + lat(), gate, edge: "out" });
      }
    }
    events.sort((a, b) => a.t - b.t);
    Object.assign(sim, { plan, tStart: t0, events, cfg: snapshotCfg(), startGap: Math.max(0, -x0) });
    setMoving(true);
    ensureLoop();
    return true;
  }
  function release() {
    if (moving) return;
    if (!has("glider")) return;
    setHeld(false);
    startMotion("release");
  }
  /** Chụp xe đang chạy: tay giữ lại ngay chỗ đó (đồng hồ đang đếm thì vẫn đếm tiếp — như máy thật). */
  function grab() {
    const sim = simRef.current;
    if (!sim.plan) return;
    const t = clk();
    sim.x = sim.plan.xAt(Math.min(t - sim.tStart, sim.plan.tEnd));
    sim.plan = null; sim.events = [];
    if (timerRef.current.since != null && timerRef.current.meta) timerRef.current.meta.grabbed = true;
    setMoving(false); setHeld(true); setXs(xsOf(sim.x));
    anim.set({ xs: xsOf(sim.x) });
  }
  /** Tay dời xe tới nx (m): tấm chắn đi qua tia cổng quang cũng làm đồng hồ chạy/dừng như thật. */
  function handMove(nx) {
    const sim = simRef.current;
    const px = sim.x;
    if (Math.abs(nx - px) < 1e-9) return;
    const t = clk();
    // Tấm chắn đi qua các cổng theo đúng chiều tay kéo (kéo lùi thì qua cổng 2 trước cổng 1).
    const gates = nx < px ? [...gatePositions()].reverse() : gatePositions();
    for (const [gate, gx] of gates) {
      const was = blockedAt(px, gx), now = blockedAt(nx, gx);
      const crossed = !was && !now && ((px < gx && nx - FLAG >= gx) || (px - FLAG >= gx && nx < gx));
      if (!was && now) gateEvent(gate, "in", t, { byHand: true });
      else if (was && !now) gateEvent(gate, "out", t, { byHand: true });
      else if (crossed) { gateEvent(gate, "in", t, { byHand: true }); gateEvent(gate, "out", t, { byHand: true }); }
    }
    sim.x = nx;
    const [[, gx1], [, gx2]] = gatePositions();
    setXs(xsOf(nx));
    anim.set({ xs: xsOf(nx), blocked: { g1: blockedAt(nx, gx1), g2: blockedAt(nx, gx2) } });
  }
  /** Đưa xe về (tay cầm): mép tấm chắn sát cổng 1. */
  function toStart() {
    if (moving) grab();
    setHeld(true);
    handMove(SAT_X);
  }

  /* ---------------- Máy nén khí, máng, cân, cổng ---------------- */
  const togglePump = () => {
    if (moving) { flash("Đợi xe dừng hẳn rồi hãy chỉnh máy nén khí."); return; }
    setPumpOn((v) => !v);
  };
  const cycleFlow = () => {
    if (moving) { flash("Đợi xe dừng hẳn rồi hãy vặn núm lưu lượng."); return; }
    setFlow((f) => (f % 3) + 1);
  };
  const toggleLevel = () => { if (!moving) setLevel((v) => !v); };
  function weigh(item) {
    if (!has("scale")) { flash("Chưa lắp cân điện tử."); return; }
    if (moving) return;
    if (scaleTimer.current) clearTimeout(scaleTimer.current);
    setScaleItem(item);
    setWeighed((w) => ({ ...w, [item === "glider" ? "M" : "m"]: true }));
    sound("record");
    flash(item === "glider" ? "Cân xe trượt: M = 200,0 g = 0,2 kg" : "Cân một quả nặng: m = 50,0 g = 0,05 kg");
    scaleTimer.current = setTimeout(() => setScaleItem(null), 1800);
  }
  const nudgeGate = (delta) => { if (!moving) setGateCm((v) => clamp(v + delta, GATE_CM.min, GATE_CM.max)); };
  const unplug = (sock) => setWires((w) => ({ ...w, [sock]: null }));
  const togglePower = () => {
    if (power) {                                   // tắt nguồn: đồng hồ mất số
      const T = timerRef.current;
      T.value = 0; T.since = null; T.meta = null;
      setTimerOn(false); setLed(zeroLed); anim.set({ led: zeroLed });
    }
    setPower(!power);
  };

  /* ---------------- Quả nặng: tự tay đặt ---------------- */
  function changeWeights(nextHang, nextCart, { quiet = false } = {}) {
    if (moving) { flash("Đợi xe dừng hẳn rồi hãy đổi quả nặng."); return false; }
    const h = clamp(nextHang, 0, NEWTON2.box), c = clamp(nextCart, 0, NEWTON2.box);
    if (h + c > NEWTON2.box) { if (!quiet) flash("Hộp chỉ có 10 quả nặng."); return false; }
    setHang(h); setCart(c);
    liveRef.current = { ...liveRef.current, hang: h, cart: c };
    if (justRan) { setJustRan(false); setLastRun(null); }
    // Không có tay giữ xe mà treo thêm quả → xe chạy luôn (như thật).
    if (!held && h > hang && startMotion("weights")) flash({ text: "Tay không giữ xe nên quả treo kéo xe chạy luôn! Lần sau giữ xe rồi hãy treo quả.", kind: "warn" }, 3800);
    return true;
  }
  const moveCartToHook = () => { if (cart <= 0) { flash("Trên xe không còn quả nặng để chuyển."); return; } changeWeights(hang + 1, cart - 1); };
  function applyConfig(c) {
    if (changeWeights(c.hang, c.cart)) flash(`Cột ${CIRCLED[c.i]}: treo ${c.hang} quả, trên xe ${c.cart} quả → F = ${newton(c.F)}, M + m = ${kg(c.mass)}`);
  }
  const evVB = (e, el) => { const svg = el.closest("svg") || el; return { ...svgPoint(svg, e.clientX, e.clientY), svg }; };
  /** Chỗ thả quả nặng đang kéo: "hang" (móc treo), "cart" (xe), "box" (hộp) hoặc null. */
  function dropTargetAt(p) {
    const hookY = Math.min(hookYOf(xs), AT.PAD_Y - hangerHeight(hang));
    if (Math.abs(p.x - AT.HANG_X) < 34 && p.y > hookY - 30 && p.y < hookY + hangerHeight(hang) + 34) return "hang";
    if (p.x > xs - AT.GLIDER_BACK - 26 && p.x < xs + AT.GLIDER_FRONT + 16 && p.y > AT.FLAG_TOP - 40 && p.y < AT.TRACK_TOP + 12) return "cart";
    const B = AT.BOX;
    if (p.x > B.x - 16 && p.x < B.x + B.w + 16 && p.y > B.y - 20 && p.y < B.y + B.h + 16) return "box";
    return null;
  }
  function startWeightDrag(from, e) {
    e.stopPropagation();
    if (moving) { flash("Đợi xe dừng hẳn rồi hãy đổi quả nặng."); return; }
    if ((from === "box" && inBox <= 0) || (from === "hang" && hang <= 0) || (from === "cart" && cart <= 0)) {
      if (from === "box") flash("Hộp đã hết quả nặng.");
      return;
    }
    const { svg, x, y } = evVB(e, e.currentTarget);
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    setWDrag({ from, x, y });
    const move = (ev) => {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) moved = true;
      const p = evVB(ev, svg);
      setWDrag({ from, x: p.x, y: p.y });
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const p = evVB(ev, svg);
      setWDrag(null);
      const to = moved ? dropTargetAt(p) : null;
      if (!to || to === from) {
        if (!moved) flash(from === "box" ? "Kéo quả nặng từ hộp thả lên MÓC TREO (tạo lực kéo F) hoặc lên XE (tăng khối lượng)." : "Kéo quả nặng này sang móc treo, lên xe hoặc về hộp.");
        return;
      }
      let h = hang, c = cart;
      if (from === "hang") h -= 1; else if (from === "cart") c -= 1;
      if (to === "hang") h += 1; else if (to === "cart") c += 1;
      if (changeWeights(h, c)) sound("record");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  /* ---------------- Tay cầm xe trượt ---------------- */
  function gliderDown(e) {
    if (!has("glider")) return;
    e.stopPropagation();
    const wasMoving = Boolean(simRef.current.plan);
    const wasHeld = held;
    if (wasMoving) { grab(); flash("Em đã chụp xe lại — tay đang giữ xe."); }
    else if (!held) setHeld(true);
    const { svg, x: px0 } = evVB(e, e.currentTarget);
    const x0 = simRef.current.x;
    const sx = e.clientX, sy = e.clientY, t0 = e.timeStamp;
    let moved = false;
    const move = (ev) => {
      if (Math.abs(ev.clientX - sx) > 4) moved = true;
      if (!moved) return;
      const p = evVB(ev, svg);
      let nx = clamp(x0 + (p.x - px0) / PXM, X_MIN, X_END);
      if (Math.abs(nx - SAT_X) <= NEWTON2.snap) nx = SAT_X;       // kéo gần cổng 1 → mép tấm chắn hít vào sát tia
      handMove(nx);
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const tap = !moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8 && ev.timeStamp - t0 < 400;
      if (tap && wasHeld && !wasMoving) release();                 // chạm vào xe đang giữ = buông tay
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }
  function dragGate2(e) {
    if (moving) return;
    e.stopPropagation();
    const { svg } = evVB(e, e.currentTarget);
    const move = (ev) => {
      const p = evVB(ev, svg);
      const cm = Math.round(((p.x - AT.RULER_X0) / PXM) * 100) - AT.G1_CM;
      setGateCm(clamp(cm, GATE_CM.min, GATE_CM.max));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  function dragWire(src, e) {
    e.stopPropagation();
    setFace("back");
    const startX = e.clientX, startY = e.clientY, startTime = Date.now();
    const { svg } = evVB(e, e.currentTarget);
    const move = (ev) => { const p = evVB(ev, svg); setWireDrag({ src, x: p.x, y: p.y }); };
    const up = (ev) => {
      const isClick = Math.hypot(ev.clientX - startX, ev.clientY - startY) < 10 && Date.now() - startTime < 300;
      const sock = src === "g1" ? "A" : "B";
      if (isClick) {
        setWires((w) => ({ ...w, [sock]: w[sock] === src ? null : src }));
      } else {
        const p = evVB(ev, svg);
        let hitSock = null;
        for (const so of ["A", "B"]) { const q = socketPos(so); if (Math.hypot(p.x - q.x, p.y - q.y) < 22) hitSock = so; }
        if (hitSock) setWires((w) => { const nw = { A: w.A === src ? null : w.A, B: w.B === src ? null : w.B }; nw[hitSock] = src; return nw; });
      }
      setWireDrag(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /* ---------------- Ghi số liệu + mốc thành tích ---------------- */
  function celebrate(next, trial) {
    const hit = (key) => { if (milestones.current.has(key)) return false; milestones.current.add(key); return true; };
    const clean = next.filter(isClean);
    const pF = clean.filter((t) => Math.abs(t.mass - 0.5) < 1e-6);
    const pM = clean.filter((t) => Math.abs(t.F - 1) < 1e-6);
    const doneCols = SGK.filter((c) => clean.some((t) => t.hang === c.hang && t.cart === c.cart)).length;
    const fF = new Set(pF.map((t) => t.F)).size >= 2 ? fitOrigin(pF.map((t) => ({ x: t.F, y: t.a }))) : null;
    const flaw = flawOf(trial);
    const msgs = [
      next.length === 1 && hit("first") && `Lần đo đầu tiên: a = ${n2(trial.a)} m/s² đã lên đồ thị!`,
      !trial.sat && trial.startGap != null && hit("notsat") && `Xe xuất phát cách cổng 1 khoảng ${n1(trial.startGap * 100)} cm → qua cổng 1 xe đã có vận tốc, t ngắn lại nên a = 2s/t² bị LỚN hơn thật. SGK dặn đặt tấm chắn sát cổng 1!`,
      trial.pumpLevel === 0 && hit("nopump") && "Máy nén khí đang tắt: xe cọ vào máng, ma sát lớn làm a nhỏ hẳn. Bật máy, vặn lưu lượng nấc 2 rồi đo lại!",
      trial.pumpLevel === 1 && hit("weakpump") && "Lưu lượng khí yếu: đệm khí mỏng, xe vẫn cọ máng nên a nhỏ đi. Vặn núm lên nấc 2 hoặc 3.",
      !trial.level && hit("nolevel") && "Máng chưa nằm ngang: một phần trọng lực kéo xe ngược lại nên a nhỏ đi. Chỉnh vít chân máng cho bọt khí vào giữa.",
      trial.grabbed && hit("grabbed") && "Em giữ xe giữa hai cổng nên đồng hồ vẫn đếm lúc xe đứng yên — t không còn là thời gian xe tự chạy.",
      trial.landsEarly && hit("landed") && "Quả treo chạm sàn trước khi xe tới cổng 2: hết lực kéo, xe chạy đều nên t dài hơn.",
      new Set(pF.map((t) => t.F)).size === 2 && hit("lineF") && "Hai điểm a–F nằm trên đường thẳng qua gốc O → a TỈ LỆ THUẬN với F!",
      new Set(pM.map((t) => t.mass)).size === 2 && hit("lineM") && "a–1/(M + m) cũng là đường thẳng qua O → a TỈ LỆ NGHỊCH với khối lượng!",
      doneCols === SGK.length && hit("table") && "Đủ 5 cột Bảng 15.1 — định luật 2 Newton hiện ra: a = F/(M + m). Lưu vào Sổ Báo Cáo được rồi!",
      fF && Math.abs(1 / fF.k - 0.5) / 0.5 < 0.05 && hit("close") && `Độ dốc đồ thị a–F cho 1/k = ${kg(1 / fF.k)} ≈ M + m = 0,5 kg — khớp!`,
    ].filter(Boolean);
    const warn = (m) => /tắt|yếu|cách cổng|chưa nằm|giữ xe|chạm sàn/.test(m);
    if (msgs.length) { flash({ text: msgs[0], kind: warn(msgs[0]) ? "warn" : "win" }, 5200); sound(warn(msgs[0]) ? "warn" : "win"); }
    else { flash(`Đã ghi: F = ${newton(trial.F)} · M + m = ${kg(trial.mass)} · t = ${trial.t.toFixed(3)} s → a = ${n2(trial.a)} m/s²${flaw ? ` (không tính: ${flaw})` : ""}`); sound("record"); }
  }
  function recordTrial() {
    if (moving) return;
    if (!justRan || !lastRun) { flash("Chưa có phép đo mới — thả xe cho đồng hồ đếm đã."); return; }
    if (lastRun.accumulated) {
      flash({ text: "Số trên đồng hồ đã CỘNG DỒN lần trước (quên Reset). Bỏ lần này: Reset rồi đo lại.", kind: "warn" }, 4200);
      sound("warn"); return;
    }
    if (lastRun.byHand) {
      flash({ text: "Đồng hồ chạy/dừng do tay kéo xe qua cổng quang — đó không phải phép đo. Bấm Reset rồi thả xe cho nó tự chạy.", kind: "warn" }, 4600);
      sound("warn"); return;
    }
    const s = lastRun.gateCm / 100;
    const trial = {
      id: nextId.current++, lab: "newton2", s, t: lastRun.t, a: accelFromTime(lastRun.t, s),
      F: lastRun.F, mass: lastRun.mass, hang: lastRun.hang, cart: lastRun.cart,
      pumpLevel: lastRun.pumpLevel, level: lastRun.level, gateCm: lastRun.gateCm, mode: lastRun.mode,
      sat: lastRun.sat, startGap: lastRun.startGap, byHand: false, grabbed: lastRun.grabbed, landsEarly: lastRun.landsEarly, accumulated: false,
    };
    const next = [...trials, trial];
    setTrials(next);
    setJustRan(false);
    celebrate(next, trial);
  }
  function discardRun() { resetTimer(); flash("Đã bỏ lần đo vừa rồi."); }
  function removeTrial(id) { setTrials((old) => old.filter((t) => t.id !== id)); }

  function saveTrials() {
    onExportNote?.({
      lab: "newton2",
      trials: trials.map((t) => ({
        lab: "newton2", s: t.s, t: t.t, force: t.F, mass: t.mass, hang: t.hang, cart: t.cart, start: t.startGap ?? 0,
        balanced: t.pumpLevel >= 2 && t.level, steady: t.sat && !t.grabbed && !t.landsEarly,
      })),
    });
  }
  function exportNote() {
    if (!trials.length) { flash("Chưa có số liệu để lưu."); return; }
    if (allDone) { saveTrials(); return; }
    setDialog({
      title: "Chưa đủ Bảng 15.1 — vẫn lưu?",
      message: `Mới đo ${sgkDone}/5 cột của Bảng 15.1. Có thể lưu bây giờ và đo bổ sung sau.`,
      actions: [{ label: "Đo tiếp cho đủ", tone: "primary" }, { label: `Vẫn lưu ${trials.length} số đo`, onClick: saveTrials }],
    });
  }
  function handleExit() {
    if (!onBack) return;
    if (!trials.length) { onBack(); return; }
    setDialog({
      title: "Thoát phòng Lab?",
      message: `Em có ${trials.length} số đo chưa lưu vào Sổ Báo Cáo.`,
      actions: [
        { label: "Lưu vào Sổ Báo Cáo rồi thoát", tone: "primary", onClick: saveTrials },
        { label: "Thoát, bỏ số liệu", tone: "danger", onClick: onBack },
        { label: "Ở lại đo tiếp" },
      ],
    });
  }
  function clearTrials() {
    if (!trials.length) return;
    setDialog({
      title: `Xóa toàn bộ ${trials.length} số đo?`,
      message: "Không hoàn tác được.",
      actions: [{ label: "Giữ lại", tone: "primary" }, { label: "Xóa hết", tone: "danger", onClick: () => setTrials([]) }],
    });
  }

  // "Làm giúp bước này" — cứu học sinh khi bị kẹt.
  function runAssistantAction(payload) {
    switch (payload) {
      case "auto_place_next": {
        const k = activeGroup.find((x) => !placed.has(x));
        if (k) { placeTool(k); flash(`Đã tự động lắp: ${TOOLS.find((t) => t.k === k)?.name}`); }
        return;
      }
      case "auto_pump": setPumpOn(true); flash("Đã bật máy nén khí."); return;
      case "auto_flow": setFlow(2); flash("Đã vặn núm lưu lượng lên nấc 2 (vừa) — xe nổi hẳn trên đệm khí."); return;
      case "auto_level": setLevel(true); flash("Đã chỉnh vít — bọt khí nằm giữa ống thuỷ, máng nằm ngang."); return;
      case "auto_weigh": weigh(weighed.M ? "weight" : "glider"); return;
      case "auto_gate": setGateCm(GATE_CM.sgk); flash("Đã đặt cổng quang 2 cách cổng 1 đúng 50 cm."); return;
      case "auto_wire": setFace("back"); setWires({ A: "g1", B: "g2" }); flash("Đã nối: cổng quang 1 → ổ A, cổng quang 2 → ổ B"); return;
      case "auto_power": setFace("back"); setPower(true); flash("Đã bật nguồn đồng hồ"); return;
      case "auto_mode": setFace("front"); setMode("A<->B"); flash("Đã chọn MODE A↔B"); return;
      case "auto_back": toStart(); flash("Tay đã giữ xe, tấm chắn sáng sát cổng quang 1."); return;
      case "auto_config": if (target) applyConfig(target); return;
      case "auto_reset": resetTimer(); flash("Đã Reset đồng hồ về 0"); return;
      default:
    }
  }

  /* ======================= BƯỚC TIẾP THEO (một nguồn sự thật) ======================= */
  const nextToolNames = activeGroup.filter((k) => !placed.has(k)).map((k) => TOOLS.find((t) => t.k === k)?.name).filter(Boolean);
  const liveA = lastRun ? accelFromTime(lastRun.t, lastRun.gateCm / 100) : null;
  const runFlaw = lastRun ? flawOf({ ...lastRun, byHand: lastRun.byHand }) : null;
  let next;
  if (!assembled) {
    next = {
      key: "assemble", title: `Lắp ${nextToolNames.join(" / ")}`,
      hint: isMobile ? "Chạm dụng cụ đang sáng ở khay bên trái để lắp vào bàn." : "Kéo dụng cụ đang sáng ở khay bên trái thả vào vòng (+) trên bàn — hoặc bấm vào nó để lắp nhanh.",
      assist: "auto_place_next",
    };
  } else if (!pumpOn) {
    next = { key: "pump", title: "Bật máy nén khí (9)", hint: "Bấm công tắc I/O trên máy: khí thổi qua ống vào máng rồi phụt ra các lỗ nhỏ, tạo đệm khí nâng xe lên.", assist: "auto_pump" };
  } else if (flow < 2) {
    next = { key: "flow", title: "Vặn núm lưu lượng lên nấc 2 (vừa)", hint: "Nấc 1 khí yếu: đệm khí mỏng, xe vẫn cọ máng. Bấm núm LƯU LƯỢNG trên máy nén khí để vặn lên nấc 2 hoặc 3.", assist: "auto_flow" };
  } else if (!level) {
    next = { key: "level", title: "Chỉnh máng nằm ngang", hint: "Bọt khí trong ống thuỷ ở đầu máng đang lệch. Bấm vít vàng dưới chân trái máng cho bọt khí vào giữa.", assist: "auto_level" };
  } else if (!weighed.M) {
    next = { key: "weighM", title: "Cân xe trượt bằng cân điện tử (8)", hint: "Đặt xe lên cân để biết M — khối lượng xe là một phần của khối lượng hệ vật.", primaryLabel: "Đặt xe lên cân", primaryShort: "Cân xe", assist: "auto_weigh" };
  } else if (!weighed.m) {
    next = { key: "weighm", title: "Cân một quả nặng (6)", hint: "Mỗi quả nặng 50 g. Treo n quả thì lực kéo F = n·m·g ≈ n × 0,5 N (SGK lấy g ≈ 10 m/s²).", primaryLabel: "Đặt 1 quả lên cân", primaryShort: "Cân quả", assist: "auto_weigh" };
  } else if (!gateOK) {
    next = {
      key: "gate", title: `Đặt cổng quang 2 cách cổng 1 đúng 50 cm (đang ${gateCm} cm)`,
      hint: isMobile ? "Mở nút điều chỉnh ở cạnh phải bàn để dời cổng quang 2 từng cm." : "Kéo cổng quang 2 dọc máng: cổng 1 ở vạch 40 cm → cổng 2 ở vạch 90 cm (s = 0,5 m như SGK).",
      assist: "auto_gate",
    };
  } else if (!clockWired) {
    next = {
      key: "wire", title: "Nối dây: cổng quang 1 → ổ A, cổng quang 2 → ổ B",
      hint: isMobile ? "Chạm chốt cáp ở chân mỗi cổng quang để cắm vào ổ tương ứng ở mặt sau đồng hồ." : "Kéo chốt cáp ở chân cổng 1 vào ổ A, chốt cáp cổng 2 vào ổ B (mặt sau đồng hồ).",
      assist: "auto_wire",
    };
  } else if (!power) {
    next = { key: "power", title: "Bật nguồn đồng hồ đo thời gian (7)", hint: "Mặt sau đồng hồ: bấm công tắc sang I (xanh).", assist: "auto_power" };
  } else if (!modeOK) {
    next = { key: "mode", title: "Chọn MODE A↔B", hint: "Mặt trước đồng hồ: xoay núm MODE tới A↔B — đếm từ lúc tấm chắn tới cổng 1 đến lúc tới cổng 2 (SGK, bước 3).", assist: "auto_mode" };
  } else if (moving) {
    next = { key: "running", title: "Xe đang chạy… (chiếu chậm ×3)", hint: "Đồng hồ đếm từ lúc tấm chắn tới cổng 1 tới lúc tới cổng 2. Chạm vào xe để chụp lại bằng tay." };
  } else if (justRan && lastRun) {
    next = lastRun.byHand
      ? { key: "record", title: "Đồng hồ vừa đếm do tay kéo xe", hint: "Tấm chắn đi qua tia cổng quang lúc em kéo xe bằng tay nên đồng hồ chạy/dừng — không phải phép đo. Reset rồi thả xe cho nó tự chạy.", assist: "auto_reset" }
      : lastRun.accumulated
        ? { key: "record", title: "Số đo bị cộng dồn!", hint: `Đồng hồ hiện ${led} s vì chưa Reset trước khi thả. Bấm “Bỏ lần này” rồi đo lại.`, assist: "auto_reset" }
        : {
            key: "record", title: "Ghi số liệu vừa đo",
            hint: `t = ${led} s → a = 2s/t² = ${n2(liveA)} m/s²${runFlaw ? ` · lưu ý: ${runFlaw} — lần này sẽ không tính vào Bảng 15.1` : ""}.`,
            primaryLabel: "Ghi số liệu",
          };
  } else if (allDone) {
    next = { key: "done", title: "Đủ Bảng 15.1 — định luật 2 Newton đã rõ", hint: "Lưu vào Sổ Báo Cáo để vẽ đồ thị Hình 15.3 và trả lời phần Thảo luận. Muốn chắc hơn thì đo lặp.", primaryLabel: "Lưu vào Sổ Báo Cáo", primaryShort: "Lưu" };
  } else if (!inStartZone) {
    next = { key: "back", title: "Giữ xe, kéo về sát cổng quang 1", hint: isMobile ? "Chạm giữ xe trượt rồi kéo về đầu máng — tới gần cổng 1 tấm chắn tự hít sát tia." : "Bấm giữ xe rồi kéo về phía cổng 1 — tới gần, mép tấm chắn tự hít sát tia. Buông chuột xe vẫn nằm trong tay.", primaryLabel: "Về sát cổng 1", assist: "auto_back" };
  } else if (target && cfgIndex !== target.i) {
    const moveHint = target.mass === mass && target.F > F ? " Giữ M + m: CHUYỂN quả từ xe sang móc, đừng lấy thêm từ hộp." : "";
    next = {
      key: "config", title: `Cột ${CIRCLED[target.i]} Bảng 15.1: F = ${newton(target.F)}, M + m = ${kg(target.mass)}`,
      hint: `Kéo quả nặng từ hộp: treo ${target.hang} quả ở móc, đặt ${target.cart} quả lên xe (đang: treo ${hang}, trên xe ${cart}).${moveHint}`,
      primaryLabel: "Đặt quả nặng giúp", primaryShort: "Đặt giúp", assist: "auto_config",
    };
  } else if (!sat) {
    next = { key: "sat", title: "Kéo xe cho tấm chắn SÁT cổng quang 1", hint: `Tấm chắn đang cách cổng 1 khoảng ${n1(Math.max(0, -xNow) * 100)} cm. SGK: đặt sát cổng 1 để khi đồng hồ bắt đầu đếm, xe có v0 = 0.`, primaryLabel: "Áp sát cổng 1", assist: "auto_back" };
  } else if (!held) {
    next = { key: "hold", title: "Giữ xe bằng tay", hint: "Bấm vào xe để tay giữ lại trước khi thả.", primaryLabel: "Giữ xe" };
  } else if (!isReset) {
    next = { key: "reset", title: "Reset đồng hồ về 0", hint: "Đặt xe xong mới Reset: kéo xe qua cổng quang cũng làm đồng hồ chạy. Bấm nút RESET đỏ ở mặt trước.", assist: "auto_reset" };
  } else {
    const col = cfgIndex >= 0 ? columns[cfgIndex] : null;
    const nDone = col ? col.clean.length : 0;
    next = {
      key: "release", title: `Thả tay${cfgIndex >= 0 ? ` — cột ${CIRCLED[cfgIndex]}` : ""}${nDone ? ` (lần ${nDone + 1})` : ""}`,
      hint: `F = ${newton(F)} · M + m = ${kg(mass)}. Chạm vào xe (hoặc bấm Thả tay) để buông — không đẩy.${nDone ? " Đo lặp để thấy sai số ngẫu nhiên." : ""}`,
      primaryLabel: "Thả tay",
    };
  }
  const phase = !assembled ? 0 : !setupDone ? 1 : !allDone ? 2 : 3;
  const handlePrimary = () => {
    if (next.key === "record") recordTrial();
    else if (next.key === "release") release();
    else if (next.key === "weighM") weigh("glider");
    else if (next.key === "weighm") weigh("weight");
    else if (next.key === "back" || next.key === "sat") toStart();
    else if (next.key === "hold") setHeld(true);
    else if (next.key === "config") { if (target) applyConfig(target); }
    else exportNote();
  };
  const speechText = `${next.title}. ${next.hint || ""}`.trim();
  const speechKey = `${next.key}|${["release", "config", "gate", "sat"].includes(next.key) ? "" : next.title}`;
  useEffect(() => {
    if (!speak || next.key === "running" || speechKey === lastSpoken.current) return;
    lastSpoken.current = speechKey;
    speak(speechText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechKey, speak]);

  // Điện thoại: tự phóng tới vùng cần thao tác của bước hiện tại.
  useEffect(() => {
    if (!isMobile) return;
    let targetZoom = null;
    if (!assembled) targetZoom = "full";
    else if (["wire", "power", "mode", "reset"].includes(next.key)) targetZoom = "clock";
    else if (["gate", "sat"].includes(next.key)) targetZoom = "track";
    else if (["pump", "flow", "level", "weighM", "weighm", "back", "config", "hold", "release", "running", "record"].includes(next.key)) targetZoom = "full";
    if (!targetZoom) return;
    const timer = setTimeout(() => setZoomMode(targetZoom), 0);
    return () => clearTimeout(timer);
  }, [assembled, isMobile, next.key]);

  /* ============================ GIAO DIỆN ============================ */
  const setupItems = [
    { key: "pump", text: "Bật máy nén khí", done: pumpOn },
    { key: "flow", text: "Lưu lượng khí nấc 2–3", done: pumpOK },
    { key: "level", text: "Chỉnh máng nằm ngang (ống thuỷ)", done: level },
    { key: "weighM", text: "Cân xe trượt: M = 200 g", done: weighed.M },
    { key: "weighm", text: "Cân quả nặng: m = 50 g", done: weighed.m },
    { key: "gate", text: "Hai cổng quang cách nhau 50 cm", done: gateOK },
    { key: "wire", text: "Cổng 1 → ổ A, cổng 2 → ổ B", done: clockWired },
    { key: "power", text: "Bật nguồn đồng hồ", done: power },
    { key: "mode", text: "Chọn MODE A↔B", done: modeOK },
  ];
  const placedCount = required.filter((k) => placed.has(k)).length;
  const canRecord = justRan && !moving && lastRun && !lastRun.accumulated && !lastRun.byHand;
  const measuring = setupDone || trials.length > 0;
  const ready = setupDone && held && inStartZone && !moving && !justRan && isReset && hang > 0;

  const measureCard = (
    <section style={{ ...panelCard, padding: 10, border: `1.5px solid ${canRecord ? `${C.orange}88` : C.line}`, background: canRecord ? "#FFF8F0" : "#fff" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={miniLabel}>Đồng hồ · MODE {MODE_LABEL[mode]}{timerOn ? " · đang đếm" : ""}</div>
          <div style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 900, color: canRecord ? C.orangeDk : timerOn ? C.navy : C.ink, lineHeight: 1.1 }}>
            <AnimLed anim={anim} live={moving || timerOn} led={led} /><span style={{ fontSize: 12, color: C.sub, marginLeft: 3, fontFamily: FONT }}>s</span>
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 0 }}>
          <div style={miniLabel}>{justRan && lastRun ? "a = 2s/t²" : "F · M + m"}</div>
          <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 900, lineHeight: 1.15, whiteSpace: "nowrap", color: justRan && (lastRun?.accumulated || lastRun?.byHand) ? "#B91C1C" : C.navy }}>
            {justRan && lastRun ? (lastRun.accumulated ? "cộng dồn!" : lastRun.byHand ? "do tay kéo" : `${n2(liveA)} m/s²`) : `${newton(F)} · ${kg(mass)}`}
          </div>
          {justRan && lastRun && !lastRun.accumulated && !lastRun.byHand && (
            <div style={{ fontSize: 10.5, fontWeight: 900, color: runFlaw ? "#B91C1C" : C.sub }}>
              {runFlaw || `F/(M + m) = ${n2(lastRun.F / lastRun.mass)}`}
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <ProgressPills items={SGK.map((c) => ({
          key: c.key, label: `${CIRCLED[c.i]} `, value: columns[c.i].clean.length ? n2(columns[c.i].aMean) : `${newton(c.F)}`,
          done: columns[c.i].clean.length > 0, current: target?.i === c.i, title: `F = ${newton(c.F)}, M + m = ${kg(c.mass)}`,
        }))} />
      </div>
      {justRan && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <button type="button" onClick={discardRun} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 11.5, borderColor: C.line, color: C.sub }}>Bỏ lần này</button>
        </div>
      )}
    </section>
  );

  /* Quả nặng: kéo trên bàn là chính; nút ở đây là đường tắt */
  const weightsCard = (
    <section data-lab-weights style={{ ...panelCard, padding: 10 }}>
      <div style={{ ...sectionHead, marginBottom: 6 }}>
        <span style={sectionTitle}>Quả nặng · còn {inBox}/10 trong hộp</span>
        <span style={countPill}>{cfgIndex >= 0 ? `cột ${CIRCLED[cfgIndex]}` : "khám phá"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <Stepper label="Móc treo" value={hang} onMinus={() => changeWeights(hang - 1, cart)} onPlus={() => changeWeights(hang + 1, cart)} disabled={moving} sub={`F = ${newton(F)}`} />
        <Stepper label="Trên xe" value={cart} onMinus={() => changeWeights(hang, cart - 1)} onPlus={() => changeWeights(hang, cart + 1)} disabled={moving} sub={`M + m = ${kg(mass)}`} />
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.sub, marginTop: 5, lineHeight: 1.35 }}>Hoặc kéo từng quả trên bàn: hộp → móc treo / xe, và kéo về.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6, alignItems: "center" }}>
        <button type="button" onClick={moveCartToHook} disabled={moving || cart === 0} title="F tăng, M + m giữ nguyên"
          style={{ ...btnSoft, padding: "5px 8px", fontSize: 11, opacity: moving || cart === 0 ? 0.5 : 1 }}>
          <ArrowLeftRight size={12} strokeWidth={2.6} /> Xe → móc
        </button>
        {SGK.map((c) => {
          const done = columns[c.i].clean.length > 0, current = cfgIndex === c.i;
          return (
            <button key={c.key} type="button" disabled={moving} onClick={() => applyConfig(c)} title={`Cột ${CIRCLED[c.i]}: F = ${newton(c.F)}, M + m = ${kg(c.mass)}`}
              style={{ ...chipBtn, ...(current ? { borderColor: C.orange, color: C.orangeDk, background: "#FFF6EC" } : done ? { borderColor: `${C.good}88`, color: C.good } : {}) }}>
              {done ? "✓" : ""}{CIRCLED[c.i]}
            </button>
          );
        })}
      </div>
      {setupDone && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button type="button" onClick={toStart} disabled={held && sat}
            style={{ ...btnSecondary, flex: 1, padding: "7px 8px", fontSize: 11.5, opacity: held && sat ? 0.45 : 1 }}>
            <Undo2 size={13} strokeWidth={2.6} /> Về sát cổng 1
          </button>
          <button type="button" onClick={held ? release : () => setHeld(true)} disabled={moving}
            style={{ ...btnSecondary, flex: 1, padding: "7px 8px", fontSize: 11.5, borderColor: held ? C.orange : C.line, color: held ? C.orangeDk : C.sub, opacity: moving ? 0.5 : 1 }}>
            <Hand size={13} strokeWidth={2.6} /> {held ? "Thả tay" : "Giữ xe"}
          </button>
        </div>
      )}
    </section>
  );

  /* Bảng 15.1 gọn: mỗi cột SGK một dòng (+ các cấu hình em tự khám phá) — bấm × để xoá một lần đo */
  const dataCard = (
    <section style={{ ...panelCard, padding: 10, flexShrink: 1, minHeight: 96, display: "flex", flexDirection: "column" }}>
      <div style={{ ...sectionHead, marginBottom: 6 }}>
        <span style={sectionTitle}>Bảng 15.1 · {trials.length} lần đo</span>
        {trials.length > 0 && <button type="button" onClick={clearTrials} style={linkBtn}>Xóa hết</button>}
      </div>
      <div data-lab-scroll style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: C.sub, fontSize: 10, fontWeight: 900, textAlign: "right" }}>
              <th style={{ textAlign: "left", padding: "0 4px 3px" }}>#</th>
              <th style={{ padding: "0 4px 3px" }}>F (N)</th>
              <th style={{ padding: "0 4px 3px" }}>M+m (kg)</th>
              <th style={{ padding: "0 4px 3px" }}>t (s)</th>
              <th style={{ padding: "0 4px 3px" }}>a (m/s²)</th>
            </tr>
          </thead>
          <tbody>
            {columns.filter((c) => c.sgk || c.items.length).map((c) => {
              const current = c.hang === hang && c.cart === cart;
              return (
                <tr key={c.key} style={{ background: current ? "#FFF6EC" : "transparent", fontWeight: 800, color: C.ink }}>
                  <td style={{ padding: "3px 4px", color: c.sgk ? C.orangeDk : C.sub, fontWeight: 900 }}>{c.sgk ? CIRCLED[c.i] : "+"}</td>
                  <td style={tdNum}>{String(+c.F.toFixed(2)).replace(".", ",")}</td>
                  <td style={tdNum}>{String(+c.mass.toFixed(2)).replace(".", ",")}</td>
                  <td style={{ ...tdNum, whiteSpace: "normal" }}>
                    {c.items.length ? (
                      <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 3, justifyContent: "flex-end" }}>
                        {c.items.map((t) => (
                          <span key={t.id} style={{ ...chip, borderColor: isClean(t) ? C.line : "#FCA5A5", color: isClean(t) ? C.ink : "#B91C1C" }}
                            title={isClean(t) ? `a = ${n2(t.a)} m/s²` : `không tính: ${flawOf(t)}`}>
                            {t.t.toFixed(3)}
                            <button type="button" onClick={() => removeTrial(t.id)} aria-label={`Xoá lần đo t = ${t.t.toFixed(3)} s`} style={chipX}>×</button>
                          </span>
                        ))}
                      </span>
                    ) : <span style={{ color: C.sub }}>—</span>}
                  </td>
                  <td style={{ ...tdNum, color: C.navy, fontWeight: 900 }}>{c.aMean ? n2(c.aMean) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  /* Hai đồ thị Hình 15.3 — a theo F (M + m = 0,5 kg) và a theo 1/(M + m) (F = 1 N) */
  const graphF = (compact) => (
    <LiveGraph
      x={{ label: "F (N)", min: 0, max: 3.5, ticks: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], fmt: (v) => String(v).replace(".", ",") }}
      y={{ label: "a (m/s²)", min: 0, max: 7, ticks: [0, 1, 2, 3, 4, 5, 6, 7], fmt: (v) => String(v) }}
      series={[{
        id: "aF", color: C.navy, points: ptsF,
        lines: fitF ? [{ x1: 0, y1: 0, x2: 3.5, y2: fitF.k * 3.5 }] : [],
        tags: fitF ? [{ x: 2.2, y: fitF.k * 2.2, text: `1/k ≈ ${kg(1 / fitF.k)}`, pill: true, dy: -20 }] : [],
      }]}
      guides={[1, 2, 3].map((v) => ({ axis: "x", value: v, color: `${C.orange}`, label: "" }))}
      legend={false}
      empty="M + m = 0,5 kg: đo cột ③ ④ ⑤"
      compact={compact}
      ariaLabel="Đồ thị gia tốc a theo lực kéo F khi M + m = 0,5 kg"
    />
  );
  const graphM = (compact) => (
    <LiveGraph
      x={{ label: "1/(M+m) (kg⁻¹)", min: 0, max: 4, ticks: [0, 1, 2, 3, 4], fmt: (v) => String(v) }}
      y={{ label: "a (m/s²)", min: 0, max: 4, ticks: [0, 1, 2, 3, 4], fmt: (v) => String(v) }}
      series={[{
        id: "aM", color: "#C0392B", points: ptsM,
        lines: fitM ? [{ x1: 0, y1: 0, x2: 4, y2: fitM.k * 4 }] : [],
        tags: fitM ? [{ x: 2.6, y: fitM.k * 2.6, text: `k ≈ ${newton(fitM.k)}`, pill: true, dy: -20 }] : [],
      }]}
      guides={[1 / 0.5, 1 / 0.4, 1 / 0.3].map((v) => ({ axis: "x", value: v, color: `${C.orange}` }))}
      legend={false}
      empty="F = 1 N: đo cột ① ② ③"
      compact={compact}
      ariaLabel="Đồ thị gia tốc a theo nghịch đảo khối lượng khi F = 1 N"
    />
  );
  const stageGraph = (
    <section style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 15, padding: "8px 10px 2px", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13, color: C.ink, whiteSpace: "nowrap" }}>Đồ thị trực tiếp (Hình 15.3)</b>
        <span style={{ fontSize: 11.5, color: C.sub, fontWeight: 700, minWidth: 0 }}>
          {fitF && fitM ? "a tỉ lệ thuận với F và tỉ lệ nghịch với M + m → a = F/(M + m)" : "Mỗi lần ghi là một điểm; đủ hai điểm là hiện đường thẳng qua gốc."}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: isMobile && isPortrait ? "1fr" : "1fr 1fr", gridTemplateRows: isMobile && isPortrait ? "1fr 1fr" : "1fr", gap: 6 }}>
        <div style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={graphCaption}>a) a theo F · M + m = 0,5 kg</div>
          <div style={{ flex: 1, minHeight: 0 }}>{graphF(true)}</div>
        </div>
        <div style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={graphCaption}>b) a theo 1/(M + m) · F = 1 N</div>
          <div style={{ flex: 1, minHeight: 0 }}>{graphM(true)}</div>
        </div>
      </div>
    </section>
  );
  const graphCard = (
    <section style={{ ...panelCard, padding: 10 }}>
      <div role="tablist" aria-label="Chọn đồ thị" style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {[["F", "a – F"], ["m", "a – 1/(M+m)"]].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={graphTab === k} onClick={() => setGraphTab(k)}
            style={{ ...chipBtn, flex: 1, padding: "5px 6px", ...(graphTab === k ? { background: C.ink, color: "#fff", borderColor: C.ink } : {}) }}>{label}</button>
        ))}
      </div>
      <div style={{ height: 200 }}>{graphTab === "F" ? graphF(true) : graphM(true)}</div>
    </section>
  );

  const panelContent = (
    <>
      <NextStepCard phase={phase} next={next} onSpeak={speak && !muted ? () => speak(speechText) : null} onPrimary={handlePrimary} onAssist={runAssistantAction} />
      {assembled && !setupDone && <ChecklistCard title="Thiết lập trước khi đo" items={setupItems} currentKey={next.key} />}
      {measuring && measureCard}
      {assembled && weighedAll && weightsCard}
      {isMobile && measuring && !isPortrait && graphCard}
      {measuring && dataCard}
    </>
  );
  const finishButton = <FinishButton count={trials.length} allDone={allDone} onFinish={exportNote} />;
  const showTray = !assembled;
  const portraitStack = isMobile && isPortrait;
  const ROI = zoomMode === "clock" ? [336, 306, 224, 110] : zoomMode === "track" ? [220, 176, 420, 124] : isMobile ? [16, 176, 868, 330] : [0, 150, VBW, 370];
  const sceneAspect = ROI[3] / ROI[2];
  const sceneH = Math.round(Math.max(140, viewportW - (showTray ? 92 : 0) - 8) * sceneAspect);
  const showStageGraph = measuring && (!isMobile || isPortrait);

  return (
    <div className="phy-screen" data-lab-engine="newton2" style={{ flex: 1, minHeight: 0, overflow: "hidden", background: C.bg, fontFamily: FONT, display: "flex", flexDirection: "column" }}>
      <LabTopBar
        isMobile={isMobile}
        isPortrait={isPortrait}
        title="Bài 15 — Thí nghiệm minh hoạ định luật 2 Newton"
        shortTitle="Bài 15 · Định luật 2 Newton"
        onExit={handleExit}
        onPrelab={onReplayPrelab}
        muted={muted}
        onToggleMute={speak ? onToggleMute : null}
        onHelp={onTour}
        meta={fitF ? <>a–F: 1/k ≈ <b style={{ color: C.navy }}>{kg(1 / fitF.k)}</b></> : <>s = <b style={{ color: C.ink }}>0,5 m</b> · a = 2s/t²</>}
      />

      <div data-lab-layout data-orientation={isPortrait ? "portrait" : "landscape"} style={isMobile
        ? { flex: 1, display: "grid", gridTemplateColumns: mobileLabColumns({ isPortrait, showTray, tray: isPortrait ? "92px" : "minmax(124px, 16vw)" }), minHeight: 0, overflow: "hidden", position: "relative" }
        : { flex: 1, display: "grid", gridTemplateColumns: showTray ? "clamp(190px, 12vw, 230px) minmax(0, 1fr) clamp(310px, 22vw, 390px)" : "minmax(0, 1fr) clamp(310px, 22vw, 390px)", minHeight: 0, overflow: "hidden" }
      }>
        {showTray && (
          <aside data-lab-tooltray data-lab-scroll style={isMobile
            ? { background: "#fff", borderRight: `1px solid ${C.line}`, padding: isPortrait ? 4 : 6, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 5, overflowY: "auto", overflowX: "hidden", minWidth: 0 }
            : { borderRight: `1px solid ${C.line}`, background: "#fff", overflow: "auto", padding: 10 }
          }>
            {isMobile ? (
              <div style={{ flexShrink: 0, borderRadius: 9, background: C.peachLt, color: C.orangeDk, padding: "5px 4px", fontSize: isPortrait ? 9 : 10, fontWeight: 900, lineHeight: 1.15, textAlign: "center" }}>
                DỤNG CỤ · {placedCount}/{required.length}
              </div>
            ) : (
              <div style={{ ...sectionHead, marginBottom: 10 }}>
                <span style={sectionTitle}>Khay dụng cụ · Hình 15.2</span>
                <span style={countPill}>{placedCount}/{required.length}</span>
              </div>
            )}
            {TOOLS.map((t) => {
              const done = placed.has(t.k), isNext = isNextTool(t.k);
              if (isMobile && isPortrait && (done || !isNext)) return null;
              return (
                <div key={t.k} data-lab-tool
                  onPointerDown={(e) => { if (!isMobile) startToolDrag(t.k, e); }}
                  onClick={() => { if (isMobile && isNext && !done) { const tg = targetOf(t.k, gateCm); flyToPlace(t.k, tg.x, tg.y - 60); } }}
                  style={{ display: "flex", flexDirection: isMobile && isPortrait ? "column" : "row", alignItems: "center", gap: isMobile ? (isPortrait ? 2 : 6) : 9, padding: isMobile ? (isPortrait ? "5px 3px" : "4px 5px") : "7px 10px", borderRadius: 10, marginBottom: isMobile ? 0 : 6, cursor: done ? "default" : (isMobile ? "pointer" : "grab"), touchAction: isMobile ? "manipulation" : "none", flexShrink: 0, minWidth: 0, width: "100%",
                    border: `1.5px solid ${done ? C.good : isNext ? C.orange : C.line}`, background: done ? "#F3F8F3" : "#fff", opacity: done ? 0.7 : isNext ? 1 : 0.62, boxShadow: isNext ? `0 0 0 3px ${C.orange}22` : "none" }}>
                  <div style={{ width: isMobile ? 24 : 44, height: isMobile ? 24 : 40, display: "grid", placeItems: "center", background: C.bg, borderRadius: 8, flexShrink: 0 }}>
                    <AirTrackIcon kind={t.icon} size={isMobile ? 22 : 38} />
                  </div>
                  <div style={{ minWidth: 0, textAlign: isMobile && isPortrait ? "center" : "left", flex: 1, width: isMobile && isPortrait ? "100%" : "auto" }}>
                    <div style={{ fontSize: isMobile ? (isPortrait ? 9.5 : 10.5) : 13, fontWeight: 700, color: C.ink, whiteSpace: isMobile && isPortrait ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.15 }}>{t.name}</div>
                    <div style={{ fontSize: isMobile ? 8.5 : 10.5, color: done ? C.good : isNext ? C.orangeDk : C.sub }}>
                      {done ? <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><Check className="w-2.5 h-2.5 stroke-[3]" /> Đã lắp</span> : isNext ? (isMobile ? "Chạm để lắp" : "Kéo vào bàn") : t.sub}
                    </div>
                  </div>
                  {isMobile && isNext && !done && (
                    <div style={{ width: isPortrait ? 24 : 28, height: isPortrait ? 24 : 28, borderRadius: 8, background: C.orange, color: "#fff", display: "grid", placeItems: "center", fontSize: isPortrait ? 17 : 20, fontWeight: 900, flexShrink: 0 }}>+</div>
                  )}
                </div>
              );
            })}
          </aside>
        )}

        <main ref={mainRef} data-lab-stage style={{ position: "relative", overflow: "hidden", overscrollBehavior: "none", touchAction: "manipulation", padding: isMobile ? 4 : 10, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, flex: 1, outline: dragTool ? `2px dashed ${C.orange}` : "none", outlineOffset: -6, gap: isMobile ? 6 : 8 }}>
          <div style={portraitStack ? { flex: "0 0 auto", height: sceneH, display: "flex", flexDirection: "column", position: "relative" } : { flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
            <AirTrackScene
              anim={anim} roi={ROI} isMobile={isMobile} isPortrait={isPortrait}
              placed={placed} pumpOn={pumpOn} flow={flow} pumpLevel={pumpLevel} level={level} scaleItem={scaleItem} gateX2={g2x} gateCm={gateCm}
              wires={wires} wireDrag={wireDrag} face={face} led={led} mode={mode} scale={scale} power={power}
              hang={hang} cart={cart} inBox={inBox} xs={xs} moving={moving} timerOn={timerOn} held={held} ready={ready} inStartZone={inStartZone} sat={sat} setupDone={setupDone}
              wDrag={wDrag} dropHover={wDrag ? dropTargetAt(wDrag) : null}
              dropTarget={!assembled ? activeGroup.filter((k) => !placed.has(k)) : []} flyTool={flyTool} highlightStep={next.key}
              onPump={togglePump} onFlow={cycleFlow} onScrew={toggleLevel} onScale={() => weigh(weighed.M ? "weight" : "glider")}
              onGliderDown={gliderDown} onWeightDown={startWeightDrag} onDragGate2={dragGate2} onDragWire={dragWire} onUnplug={unplug} onRelease={release}
              onFlip={() => setFace((f) => (f === "front" ? "back" : "front"))}
              onCycleMode={() => setMode((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length])}
              onReset={resetTimer} onToggleScale={() => setScale((sc) => (sc === "fine" ? "coarse" : "fine"))}
              onTogglePower={togglePower}
              onCanvasTap={() => { if (isMobile && sheetOpen) setSheetOpen(false); }}
              zoomMode={zoomMode} setZoomMode={setZoomMode}
            />
          </div>
          {showStageGraph && (
            <div style={portraitStack ? { flex: "1 1 0", minHeight: 0, paddingBottom: 62 } : { flex: "0 0 clamp(190px, 34%, 290px)", minHeight: 0 }}>{stageGraph}</div>
          )}
          {isMobile && assembled && (
            <div data-lab-quick-controls style={{ position: "absolute", top: isPortrait ? 8 : 4, right: 0, zIndex: 36, pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              {!controlsOpen && (
                <button type="button" onClick={() => { setSheetOpen(false); setControlsOpen(true); }}
                  style={{ pointerEvents: "auto", width: 38, height: 52, borderRadius: "14px 0 0 14px", border: `1px solid ${C.orange}`, borderRight: "none", background: "#FFF7EF", color: C.orangeDk, display: "grid", placeItems: "center", boxShadow: "0 6px 18px rgba(50,30,18,0.16)" }}
                  aria-label="Mở điều chỉnh nhanh" title="Điều chỉnh nhanh">
                  <SlidersHorizontal size={18} strokeWidth={2.4} />
                </button>
              )}
              <div style={{
                pointerEvents: controlsOpen ? "auto" : "none", width: 286, maxWidth: "78vw", background: "#fff", border: `1px solid ${C.line}`, borderRight: "none", borderRadius: "16px 0 0 16px", padding: 10,
                boxShadow: "0 12px 28px rgba(50,30,18,0.18)", transform: controlsOpen ? "translateX(0)" : "translateX(112%)", opacity: controlsOpen ? 1 : 0,
                transition: "transform 240ms cubic-bezier(.2,.8,.2,1), opacity 180ms ease", display: "flex", flexDirection: "column", gap: 9, maxHeight: "calc(100dvh - 104px)", overflowY: "auto",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 900, color: C.ink }}>Điều chỉnh nhanh</span>
                  <button type="button" onClick={() => setControlsOpen(false)} aria-label="Đóng điều chỉnh nhanh"
                    style={{ width: 30, height: 30, borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.sub, display: "grid", placeItems: "center" }}>
                    <X size={16} />
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {[["full", "Toàn cảnh"], ["track", "Máng/cổng"], ["clock", "Đồng hồ"]].map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setZoomMode(key)}
                      style={{ border: `1px solid ${zoomMode === key ? C.orange : C.line}`, background: zoomMode === key ? "#FFF2E6" : "#fff", color: zoomMode === key ? C.orangeDk : C.ink, borderRadius: 10, padding: "8px 6px", fontSize: 11, fontWeight: 900 }}>{label}</button>
                  ))}
                </div>
                <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 8, background: C.bg }}>
                  <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 900, marginBottom: 6 }}>Cổng quang 2 · s = {gateCm} cm {gateOK ? "✓" : "(SGK: 50 cm)"}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {[-5, -1, 1, 5].map((d) => (
                      <button key={d} type="button" disabled={!has("gate2") || moving} onClick={() => nudgeGate(d)} style={mobileAdjustBtn}>{d > 0 ? `+${d}` : `−${-d}`}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <button type="button" onClick={toStart} style={mobileAdjustBtn}>Về sát cổng 1</button>
                  <button type="button" onClick={held ? release : () => setHeld(true)} disabled={moving}
                    style={{ ...mobileAdjustBtn, background: held ? C.orange : "#fff", color: held ? "#fff" : C.orangeDk }}>{held ? "Thả tay" : "Giữ xe"}</button>
                </div>
              </div>
            </div>
          )}
          <LabToast toast={toast} fixed />
          <LabDialog dialog={dialog} onClose={() => setDialog(null)} />
        </main>
        {dragTool && (
          <div style={{ position: "fixed", left: dragTool.x - 24, top: isMobile ? dragTool.y - 72 : dragTool.y - 24, width: 48, height: 48, pointerEvents: "none", zIndex: 60, opacity: 0.94, filter: "drop-shadow(0 4px 8px rgba(0,0,0,.3))" }}>
            <AirTrackIcon kind={toolIcon(dragTool.k)} size={48} />
          </div>
        )}

        {isMobile ? (
          <MobileLabSheet
            open={sheetOpen}
            onToggle={() => { setControlsOpen(false); setSheetOpen((v) => !v); }}
            phase={phase}
            next={next}
            onPrimary={handlePrimary}
            isPortrait={isPortrait}
            openHeight={portraitStack ? `calc(100% - ${sceneH + 14}px)` : undefined}
          >
            {panelContent}
            {finishButton}
          </MobileLabSheet>
        ) : (
          <aside data-lab-guide style={{ borderLeft: `1px solid ${C.line}`, background: C.bg, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
            <div data-lab-scroll style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              {panelContent}
            </div>
            <div style={{ padding: 12, borderTop: `1px solid ${C.line}`, background: "#fff", flexShrink: 0 }}>
              {finishButton}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ============================ Nút tăng/giảm số quả nặng ============================ */
function Stepper({ label, value, onMinus, onPlus, disabled, sub }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "5px 6px", background: C.bg, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: C.sub, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginTop: 2 }}>
        <button type="button" onClick={onMinus} disabled={disabled || value <= 0} aria-label={`Bớt một quả (${label})`} style={stepBtn}><Minus size={13} strokeWidth={3} /></button>
        <b style={{ fontSize: 17, color: C.ink, fontFamily: "monospace" }}>{value}</b>
        <button type="button" onClick={onPlus} disabled={disabled} aria-label={`Thêm một quả (${label})`} style={stepBtn}><Plus size={13} strokeWidth={3} /></button>
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
    </div>
  );
}

/* ============================ Bàn thí nghiệm (SVG) ============================ */
function AirTrackScene(props) {
  const { anim, roi, placed, pumpOn, flow, pumpLevel, level, scaleItem, gateX2, gateCm, wires, wireDrag, face, led: ledState, mode, scale, power,
    hang, cart, inBox, xs: xsState, moving, timerOn, held, ready, inStartZone, sat, setupDone, wDrag, dropHover, dropTarget = [], flyTool = null, highlightStep,
    onPump, onFlow, onScrew, onScale, onGliderDown, onWeightDown, onDragGate2, onDragWire, onUnplug, onRelease,
    onFlip, onCycleMode, onReset, onToggleScale, onTogglePower, onCanvasTap, zoomMode, setZoomMode, isMobile, isPortrait } = props;
  const [svgRef, svgBox] = useBoxSize();
  const live = useAnim(anim);
  const has = (k) => placed.has(k);
  const xs = moving ? live.xs : xsState;
  const led = moving || timerOn ? live.led : ledState;
  const blocked = moving ? live.blocked : { g1: blockedAt(xRel(xs), 0), g2: blockedAt(xRel(xs), gateCm / 100) };
  const spin = ((xs - G1_X) / AT.PULLEY.r) * (180 / Math.PI);
  const landedY = AT.PAD_Y - hangerHeight(hang);
  const hookY = Math.min(hookYOf(xs), landedY);
  const landed = hookYOf(xs) >= landedY - 0.5;
  const gliderOnScale = scaleItem === "glider";
  const zoomClock = zoomMode === "clock";
  const viewBox = fitViewBox(roi, svgBox, BOUNDS);
  const showHint = isMobile && dropTarget.length === 0;
  const pulley = AT.PULLEY;
  const hookX = xs + AT.GLIDER_FRONT + 2.5;
  const scaleReading = scaleItem === "glider" ? "200.0" : scaleItem === "weight" ? "50.0" : "0.0";
  const x0 = xs - AT.GLIDER_BACK;
  // Chuỗi dây: căng thì thẳng; quả đã nằm trên đệm (dây chùng) thì võng xuống.
  const slackDrop = landed ? Math.min(26, (hookYOf(xs) - landedY) * 0.4) : 0;
  const zoneStyle = (k) => ({ fill: dropHover === k ? `${C.orange}22` : "#27AE6010", stroke: dropHover === k ? C.orange : "#27AE60", strokeWidth: 1.6, strokeDasharray: "5 4" });

  return (
    <div style={{ position: "relative", width: "100%", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <svg ref={svgRef} onPointerDown={onCanvasTap} viewBox={viewBox} preserveAspectRatio={isPortrait ? "xMidYMin meet" : "xMidYMid meet"}
        style={{ flex: 1, minHeight: 0, width: "100%", height: "100%", display: "block", background: "linear-gradient(#ffffff,#FBF6EC)", borderRadius: isMobile ? 12 : 16, border: `1px solid ${C.line}`, touchAction: "none" }}>
        <AirTrackRoom />

        {/* (9) máy nén khí + ống dẫn */}
        {has("pump") && <AirPump15 on={pumpOn} flow={flow} hose={has("track")} onToggle={onPump} onKnob={onFlow} />}

        {/* (8) cân điện tử + (6) hộp quả nặng — mép trước bàn; kéo quả từ hộp */}
        {has("weights") && (
          <g onPointerDown={(e) => onWeightDown("box", e)} style={{ cursor: inBox > 0 ? "grab" : "default" }}>
            <rect x={AT.BOX.x} y={AT.BOX.y} width={AT.BOX.w} height={AT.BOX.h} fill="transparent" />
            <WeightBox15 left={inBox} />
          </g>
        )}
        {has("scale") && <Scale15 reading={scaleReading} item={scaleItem} onTap={onScale} />}

        {/* (2) máng đệm khí */}
        {has("track") && <AirTrack15 level={level} pump={pumpLevel} onScrew={onScrew} />}

        {/* (3)(4) cổng quang — cổng 2 kéo dọc máng để đổi s */}
        {has("gate1") && <Photogate15 x={G1_X} blocked={blocked.g1} label="1" />}
        {has("gate2") && (
          <g style={{ cursor: moving ? "default" : "ew-resize" }} onPointerDown={onDragGate2}>
            <rect x={gateX2 - 14} y={184} width="28" height="96" fill="transparent" />
            <Photogate15 x={gateX2} blocked={blocked.g2} label="2" />
          </g>
        )}
        {has("gate1") && has("gate2") && (
          <g style={{ pointerEvents: "none" }}>
            <line x1={G1_X} y1={178} x2={gateX2} y2={178} stroke={C.navy} strokeWidth="1.2" strokeDasharray="4 3" />
            <line x1={G1_X} y1={173} x2={G1_X} y2={183} stroke={C.navy} strokeWidth="1.2" />
            <line x1={gateX2} y1={173} x2={gateX2} y2={183} stroke={C.navy} strokeWidth="1.2" />
            <rect x={(G1_X + gateX2) / 2 - 30} y={169} width="60" height="17" rx="8.5" fill={gateCm === GATE_CM.sgk ? C.navy : C.orangeDk} />
            <text x={(G1_X + gateX2) / 2} y={181} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#fff" fontFamily={FONT}>s = {gateCm} cm</text>
          </g>
        )}

        {/* (5) ròng rọc + dây + móc treo */}
        {has("pulley") && <Pulley15 angle={spin} />}
        {has("glider") && has("pulley") && !gliderOnScale && (
          <path d={`M${hookX} ${AT.STRING_Y} L${pulley.x} ${AT.STRING_Y} A${pulley.r} ${pulley.r} 0 0 1 ${pulley.x + pulley.r} ${pulley.y} ${landed ? `Q${AT.HANG_X + 10} ${(pulley.y + hookY) / 2 + slackDrop} ${AT.HANG_X} ${hookY - 4}` : `L${AT.HANG_X} ${hookY - 4}`}`}
            fill="none" stroke="#1F2937" strokeWidth="1" />
        )}
        {has("glider") && has("pulley") && (
          <g onPointerDown={(e) => onWeightDown("hang", e)} style={{ cursor: hang > 0 ? "grab" : "default" }}>
            <rect x={AT.HANG_X - 16} y={hookY + 4} width="32" height={hangerHeight(hang) + 4} fill="transparent" />
            <Hanger15 hookY={hookY} n={hang} landed={landed} />
          </g>
        )}

        {/* xe trượt + (1) tấm chắn sáng — bấm giữ, kéo, chạm để buông / chụp lại */}
        {has("glider") && !gliderOnScale && (
          <g onPointerDown={onGliderDown} style={{ cursor: moving ? "pointer" : held ? "grabbing" : "grab" }}>
            <rect x={x0 - 22} y={AT.FLAG_TOP - 8} width={AT.GLIDER_BACK + AT.GLIDER_FRONT + 30} height={AT.TRACK_TOP - AT.FLAG_TOP + 14} fill="transparent" />
            <Glider15 xs={xs} cart={cart} flag={has("flag")} lift={LIFT[pumpLevel]} held={held && !moving} />
          </g>
        )}
        {/* quả nặng trên xe: kéo ra được */}
        {has("glider") && !gliderOnScale && cart > 0 && (
          <rect x={x0 + 1} y={AT.GLIDER_TOP - cart * 3.2 - 6} width="19" height={cart * 3.2 + 6} fill="transparent" style={{ cursor: "grab" }}
            onPointerDown={(e) => onWeightDown("cart", e)} />
        )}

        {/* nhãn trạng thái tay / xe */}
        {has("glider") && !gliderOnScale && !moving && (
          <g>
            {held && setupDone && ready && (
              <g role="button" aria-label="Thả tay" onPointerDown={(e) => e.stopPropagation()} onClick={onRelease} style={{ cursor: "pointer" }}>
                <rect x={xs - 84} y={AT.FLAG_TOP - 32} width="62" height="20" rx="10" fill={C.orange} />
                <text x={xs - 53} y={AT.FLAG_TOP - 18} textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#fff" fontFamily={FONT}>Thả tay</text>
              </g>
            )}
            {held && inStartZone && !sat && <text x={G1_X - 4} y={AT.FLAG_TOP - 8} textAnchor="end" fontSize="9" fontWeight="900" fill={C.orangeDk} fontFamily={FONT}>kéo xe tới sát cổng 1 →</text>}
            {!held && <text x={xs - 18} y={AT.FLAG_TOP - 10} textAnchor="middle" fontSize="9" fontWeight="900" fill={C.orangeDk} fontFamily={FONT}>bấm vào xe để giữ</text>}
          </g>
        )}
        {moving && (
          <g style={{ pointerEvents: "none" }}>
            <rect x={560} y={150} width="92" height="22" rx="11" fill="#321E12" opacity=".85" />
            <text x={606} y={165} textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" fontFamily={FONT}>▶ chậm ×{SLOW}</text>
          </g>
        )}

        {/* vùng thả quả nặng khi đang kéo */}
        {wDrag && (
          <g style={{ pointerEvents: "none" }}>
            {wDrag.from !== "hang" && <rect x={AT.HANG_X - 24} y={hookY - 10} width="48" height={hangerHeight(hang) + 30} rx="8" {...zoneStyle("hang")} />}
            {wDrag.from !== "cart" && <rect x={x0 - 8} y={AT.FLAG_TOP - 14} width={AT.GLIDER_BACK + AT.GLIDER_FRONT + 16} height={AT.TRACK_TOP - AT.FLAG_TOP + 20} rx="8" {...zoneStyle("cart")} />}
            {wDrag.from !== "box" && <rect x={AT.BOX.x - 6} y={AT.BOX.y - 4} width={AT.BOX.w + 12} height={AT.BOX.h + 8} rx="8" {...zoneStyle("box")} />}
            <text x={AT.HANG_X - 28} y={hookY - 14} textAnchor="end" fontSize="9" fontWeight="900" fill={C.orangeDk} fontFamily={FONT}>móc treo → F</text>
            <WeightDisc15 x={wDrag.x} y={wDrag.y} active={Boolean(dropHover)} />
          </g>
        )}

        {/* (7) đồng hồ đo thời gian hiện số (MC964) */}
        {has("clock") && (
          <g onPointerDown={(e) => { e.stopPropagation(); if (isMobile && !zoomClock) setZoomMode("clock"); }}>
            <g transform={`translate(${CLK.x} ${CLK.y}) scale(${CLK.s})`}>
              <MC964Face face={face} led={led} counting={timerOn} modeAngle={MODE_ANGLE[mode]} modeLabel={MODE_LABEL[mode]}
                scale={scale} scaleLabel={NEWTON2.scales[scale].label} power={power} wires={wires} plugInfo={PLUG_INFO} hotSockets={Boolean(wireDrag)}
                onFlip={onFlip} onCycleMode={onCycleMode} onReset={onReset} onToggleScale={onToggleScale} onTogglePower={onTogglePower} onUnplug={onUnplug} />
            </g>
          </g>
        )}
        {has("clock") && [["g1", G1_X, "A"], ["g2", gateX2, "B"]].map(([src, gx, sock]) => {
          if (!has(src === "g1" ? "gate1" : "gate2")) return null;
          const from = plugPos(gx);
          const col = src === "g1" ? C.navy : "#C0392B";
          const plugged = wires[sock] === src || wires[sock === "A" ? "B" : "A"] === src;
          const toSock = wires.A === src ? "A" : wires.B === src ? "B" : sock;
          const to = socketPos(toSock);
          return (
            <g key={src}>
              {plugged && <path d={`M${from.x} ${from.y} C${from.x} ${from.y + 40}, ${to.x} ${to.y - 50}, ${to.x} ${to.y}`} fill="none" stroke={col} strokeWidth="2.4" opacity={face === "back" ? 0.92 : 0.28} />}
              <circle cx={from.x} cy={from.y} r="5" fill={plugged ? C.good : col} stroke="#fff" strokeWidth="1.4" style={{ cursor: "grab" }} onPointerDown={(e) => onDragWire(src, e)} />
            </g>
          );
        })}
        {wireDrag && (() => {
          const from = plugPos(wireDrag.src === "g1" ? G1_X : gateX2);
          const col = wireDrag.src === "g1" ? C.navy : "#C0392B";
          return <path d={`M${from.x} ${from.y} C${from.x} ${from.y + 40}, ${wireDrag.x} ${wireDrag.y - 40}, ${wireDrag.x} ${wireDrag.y}`} fill="none" stroke={col} strokeWidth="2.4" strokeDasharray="5 4" />;
        })()}

        {/* gợi ý chỗ bấm (điện thoại) */}
        {showHint && highlightStep === "pump" && <HintBox x={AT.PUMP.x + 46} y={AT.PUMP.y + 16} w={28} h={38} label="Công tắc" />}
        {showHint && highlightStep === "flow" && <HintBox x={AT.PUMP.x + 74} y={AT.PUMP.y + 20} w={30} h={34} label="Lưu lượng" />}
        {showHint && highlightStep === "level" && <HintBox x={AT.FOOT_XS[0] - 16} y={AT.FEET_Y - 8} w={32} h={24} label="Vít" />}
        {showHint && ["weighM", "weighm"].includes(highlightStep) && <HintBox x={AT.SCALE.x} y={AT.SCALE.y + 4} w={AT.SCALE.w} h={AT.SCALE.h - 4} label="Cân" />}
        {showHint && highlightStep === "config" && <HintBox x={AT.BOX.x} y={AT.BOX.y + 4} w={AT.BOX.w} h={AT.BOX.h - 4} label="Kéo quả nặng" />}
        {showHint && highlightStep === "wire" && face === "back" && (
          <>
            <HintBox x={G1_X - 6} y={254} w={30} h={28} label="Cáp 1" />
            <HintBox x={gateX2 - 6} y={254} w={30} h={28} label="Cáp 2" />
          </>
        )}
        {showHint && highlightStep === "power" && face === "back" && <HintBox x={CLK.x + 234 * CLK.s} y={CLK.y + 18 * CLK.s} w={36 * CLK.s} h={60 * CLK.s} label="Nguồn" />}
        {showHint && highlightStep === "mode" && face === "front" && <HintBox x={CLK.x + 148 * CLK.s} y={CLK.y + 16 * CLK.s} w={64 * CLK.s} h={64 * CLK.s} label="MODE" />}
        {showHint && highlightStep === "reset" && face === "front" && <HintBox x={CLK.x + 234 * CLK.s} y={CLK.y + 30 * CLK.s} w={34 * CLK.s} h={36 * CLK.s} label="Reset" />}

        {/* ô đặt dụng cụ */}
        {dropTarget.map((k) => { const t = targetOf(k, gateCm); return (
          <g key={"tgt-" + k} style={{ pointerEvents: "none" }}>
            <circle cx={t.x} cy={t.y} r="26" fill={`${C.orange}1e`} stroke={C.orange} strokeWidth="2" strokeDasharray="6 5">
              <animate attributeName="r" values="22;29;22" dur="1.3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.3s" repeatCount="indefinite" />
            </circle>
            <text x={t.x} y={t.y + 4} textAnchor="middle" fontSize="14" fontWeight="800" fill={C.orangeDk} fontFamily={FONT}>+</text>
          </g>
        ); })}
        {flyTool && <AirTrackIcon kind={toolIcon(flyTool.k)} x={flyTool.x - 22} y={flyTool.y - 22} size={44} style={{ pointerEvents: "none" }} />}
        {!has("track") && <text x={VBW / 2} y={200} textAnchor="middle" fontSize="14" fill={C.sub} fontFamily={FONT}>Lắp dụng cụ theo Hình 15.2 — kéo vào ô sáng (+) trên bàn…</text>}
      </svg>

      {has("clock") && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setZoomMode(zoomClock ? "full" : "clock"); }}
          style={{ position: "absolute", ...(isMobile ? { top: 8, left: 8 } : { bottom: 12, right: 12 }), zIndex: 30, background: zoomClock ? C.orange : "#fff", color: zoomClock ? "#fff" : C.navy,
            border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "7px 11px", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontFamily: FONT }}>
          {zoomClock ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          {zoomClock ? "Thu nhỏ" : "Phóng to đồng hồ"}
        </button>
      )}
    </div>
  );
}

/** Số đang hiện trên đồng hồ — lúc xe chạy / đồng hồ đang đếm đọc thẳng từ kho hoạt ảnh. */
function AnimLed({ anim, live: isLive, led }) {
  const live = useAnim(anim);
  return isLive ? live.led : led;
}

/** Khung xanh nhấp nháy chỉ chỗ cần thao tác (điện thoại). */
function HintBox({ x, y, w, h, label }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      <animate attributeName="opacity" values="0.28;0.52;0.28" dur="1.4s" repeatCount="indefinite" />
      <rect x={x} y={y} width={w} height={h} rx="8" fill="#27AE6014" stroke="#27AE60" strokeWidth="1.4" strokeDasharray="6 4" />
      {label && <text x={x + w / 2} y={y - 5} textAnchor="middle" fontSize="10" fontWeight="900" fill="#17864A" fontFamily={FONT}>{label}</text>}
    </g>
  );
}

/** Ô đặt của từng dụng cụ (toạ độ cảnh). */
function targetOf(k, gateCm) {
  switch (k) {
    case "track":   return { x: 500, y: AT.TRACK_TOP + 8 };
    case "pump":    return { x: AT.PUMP.x + AT.PUMP.w / 2, y: AT.PUMP.y + AT.PUMP.h / 2 };
    case "pulley":  return { x: AT.PULLEY.x, y: AT.PULLEY.y };
    case "glider":  return { x: XS_PARK - 14, y: AT.GLIDER_TOP + 8 };
    case "flag":    return { x: XS_PARK - AT.FLAG_W / 2, y: AT.FLAG_TOP + 10 };
    case "gate1":   return { x: G1_X, y: 230 };
    case "gate2":   return { x: rulerX(AT.G1_CM + gateCm), y: 230 };
    case "clock":   return { x: CLK.x + 150 * CLK.s, y: CLK.y + 66 * CLK.s };
    case "scale":   return { x: AT.SCALE.x + AT.SCALE.w / 2, y: AT.SCALE.y + 28 };
    case "weights": return { x: AT.BOX.x + AT.BOX.w / 2, y: AT.BOX.y + 30 };
    default:        return { x: VBW / 2, y: VBH / 2 };
  }
}

/* ============================ styles ============================ */
const linkBtn = { border: "none", background: "transparent", color: C.sub, fontWeight: 800, fontSize: 11, cursor: "pointer", fontFamily: FONT, padding: 0, textDecoration: "underline" };
const miniLabel = { fontSize: 9.5, fontWeight: 900, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4 };
const chip = { display: "inline-flex", alignItems: "center", gap: 2, padding: "1px 2px 1px 6px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", fontFamily: "monospace", fontSize: 11, fontWeight: 900 };
const chipX = { border: "none", background: "transparent", color: C.sub, cursor: "pointer", fontSize: 12.5, fontWeight: 900, lineHeight: 1, padding: "0 3px", fontFamily: FONT };
const chipBtn = { border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", color: C.sub, padding: "4px 7px", fontSize: 11.5, fontWeight: 900, cursor: "pointer", fontFamily: FONT };
const stepBtn = { width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.orange}66`, background: "#fff", color: C.orangeDk, display: "grid", placeItems: "center", cursor: "pointer", padding: 0 };
const tdNum = { padding: "3px 4px", textAlign: "right", fontFamily: "monospace", whiteSpace: "nowrap" };
const graphCaption = { fontSize: 10.5, fontWeight: 900, color: C.sub, textAlign: "center" };
const mobileAdjustBtn = { border: `1px solid ${C.orange}`, background: "#fff", color: C.orangeDk, borderRadius: 10, padding: "9px 6px", fontSize: 12, fontWeight: 900, fontFamily: FONT };
