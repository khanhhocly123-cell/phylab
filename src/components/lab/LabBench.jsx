"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Check, SlidersHorizontal, X, ZoomIn, ZoomOut, Zap } from "lucide-react";
import { C, FONT } from "../../engine/tokens.js";
import { LAB6, computeTime, rollRun, zeroDisplay } from "../../engine/physics.js";
import {
  LabTopBar, NextStepCard, ChecklistCard, FinishButton, MobileLabSheet, LabToast, LabDialog, ProgressPills, NudgeSlider,
  panelCard, sectionHead, sectionTitle, countPill, btnSecondary, btnSoft,
} from "./LabChrome.jsx";
import LiveGraph, { niceRange } from "./LiveGraph.jsx";
import { labSound } from "./labSound.js";
import { useAnimStore, useAnim } from "./animStore.js";
import {
  BenchBackdrop, Rail6, StandLeft6, StandRight6, StandScrew6, screwPos6, Photogate6, Magnet6, SteelBall, Plumb6, MC964Face, MechIcon,
} from "./mech/MechParts.jsx";

/* ============================================================================
   LabBench — Lab 6 "Đo tốc độ" (tốc độ trung bình & tức thời).
   Cơ chế nghiêng: đầu THẤP của ray tựa trên giá phải (cao cố định); đầu CAO
   (đế xám + nam châm) TRƯỢT trên cột giá trái. Đổi góc = thu hẹp khoảng cách
   2 giá đỡ. Bi lăn theo ray, tới cuối ray thì kéo về nam châm.

   Một bộ lắp duy nhất (cổng E → ổ A, cổng F → ổ B); núm MODE quyết định đo gì:
     MODE A↔B → thời gian bi đi từ E tới F → v_tb = sEF / t
     MODE A   → thời gian bi che cổng E    → v tức thời = d / t
   ĐO TỰ DO: chọn θ, sEF tuỳ ý. Đồ thị "v theo sEF" cho thấy: cùng một góc, sEF càng nhỏ
   thì v_tb càng tiến về v tức thời tại E — đúng định nghĩa tốc độ tức thời.
   Bi lăn được diễn CHẬM theo đúng x = ½·a·t²; lúc bi che cổng ở MODE A chiếu chậm thêm ×8
   để thấy đồng hồ đếm. Khung hướng dẫn dùng chung ở LabChrome.jsx.
   ========================================================================== */

const VBW = 900, VBH = 520, FLOOR = 452;
const XL = 168;                 // cột giá trái (cố định) — đầu cao trượt ở đây
const HR = 96;                  // chiều cao giá phải (cố định)
const YR = FLOOR - HR;          // đỉnh giá phải = đầu thấp của ray
const K = 0.54;                 // tỉ lệ vẽ ray (giữ nguyên tỉ lệ 778x187)
const RLOW = [748, 130];        // đầu THẤP của ray (local) -> tựa giá phải (pivot)
const RHIGH = [58, 40];         // đế xám / đầu CAO (local) -> trượt trên cột trái
const RULER_Y = 130, RULER_X0 = 190, PXM = 610;
const END_LX = 744;             // bi lăn tới cuối ruler (local x)
// path bi bám mặt máng: đỉnh dốc -> cong xuống -> ĐIỂM CHUYỂN TIẾP (185,130) -> ruler thẳng
const CHUTE = [[74, 42], [100, 64], [126, 92], [152, 116], [185, 130]];
const PLUMB_PIVOT = [122, 150];  // tâm thước đo góc (local) — dây dọi treo ở đây
const RAIL_END_X = 766;          // đầu thấp của thước/ray (local)

const MODES = ["A", "B", "A+B", "A<->B", "T"];
const MODE_LABEL = { "A": "A", "B": "B", "A+B": "A+B", "A<->B": "A↔B", "T": "T" };
const MODE_ANGLE = { "A": -50, "B": -25, "A+B": 0, "A<->B": 25, "T": 50 };

// icon: bản vẽ trong mech/MechParts.jsx (cùng hình với bàn thí nghiệm).
const TOOLS = [
  { k: "standL", name: "Giá đỡ trái", sub: "cột trượt (cố định)", icon: "standL6" },
  { k: "standR", name: "Giá đỡ phải", sub: "kéo để đổi góc", icon: "standR6" },
  { k: "rail", name: "Thanh ray + thước góc", sub: "±1 mm", icon: "rail6" },
  { k: "weight", name: "Vật nặng (dây dọi)", sub: "chỉ góc nghiêng", icon: "plumb6" },
  { k: "magnet", name: "Nam châm + bi", sub: "giữ / thả bi", icon: "magnet6" },
  { k: "gateE", name: "Cổng quang E", sub: "±0.0003 s", icon: "gate6" },
  { k: "gateF", name: "Cổng quang F", sub: "±0.0003 s", icon: "gate6" },
  { k: "clock", name: "Đồng hồ MC964", sub: "±0.001 s", icon: "clock" },
];
const toolIcon = (k) => TOOLS.find((t) => t.k === k)?.icon;
// Phích cắm ở ổ đồng hồ (mặt sau): cổng E dây xanh, cổng F dây đỏ.
const PLUG_INFO = (gate) => (gate === "E" ? { text: "E", color: C.navy } : gate === "F" ? { text: "F", color: "#C0392B" } : null);

const REQ = { series: 3, instant: 3 };            // ≥ 3 khoảng sEF cùng một góc · ≥ 3 lần đo MODE A
const SERIES_COLORS = ["#2563EB", "#E8842B", "#16A34A", "#DB2777", "#7C3AED", "#0891B2"];
const PARTS = {
  average: { name: "v trung bình", mode: "A<->B", modeLabel: "A↔B" },
  instant: { name: "v tức thời", mode: "A", modeLabel: "A" },
};
const partOfMode = (m) => (m === "A<->B" ? "average" : m === "A" ? "instant" : null);

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const gateLocalX = (s) => RULER_X0 + s * PXM;
const thetaKey = (th) => Math.round(th);
const cmKey = (s) => Math.round(s * 100);
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const reducedMotion = () => document.hidden || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Đường thẳng y = a + b·x qua các điểm (bình phương tối thiểu). */
function linFit(points) {
  const n = points.length;
  if (n < 2) return null;
  const sx = points.reduce((s, p) => s + p.x, 0), sy = points.reduce((s, p) => s + p.y, 0);
  const sxx = points.reduce((s, p) => s + p.x * p.x, 0), sxy = points.reduce((s, p) => s + p.x * p.y, 0);
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-9) return null;
  const b = (n * sxy - sx * sy) / den;
  return { a: (sy - b * sx) / n, b };
}

// x của giá phải theo θ: đầu cao ray phải chạm cột trái tại XL
const xRightOf = (thetaDeg) => {
  const r = (thetaDeg * Math.PI) / 180;
  return XL + K * ((RLOW[0] - RHIGH[0]) * Math.cos(r) - (RLOW[1] - RHIGH[1]) * Math.sin(r));
};
// local -> screen (pivot = đầu thấp RLOW đặt tại (xR, YR), xoay θ quanh đó)
function screenOf(lx, ly, thetaDeg) {
  const r = (thetaDeg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const xR = xRightOf(thetaDeg);
  const x1 = (lx - RLOW[0]) * K, y1 = (ly - RLOW[1]) * K;
  return { x: xR + x1 * c - y1 * s, y: YR + x1 * s + y1 * c };
}

// path bi (local) -> hàm nội suy u∈[0,1] theo chiều dài cung
function buildPath() {
  const pts = [...CHUTE, [END_LX, RULER_Y]];
  const seg = [], acc = [0];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d); acc.push(acc[i - 1] + d);
  }
  const total = acc[acc.length - 1];
  const at = (u) => {
    const d = clamp(u, 0, 1) * total;
    let i = 1; while (i < acc.length - 1 && acc[i] < d) i++;
    const t = (d - acc[i - 1]) / (seg[i - 1] || 1);
    const a = pts[i - 1], b = pts[i];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  // u tại một local x trên ruler (dùng để canh cổng)
  const uAtX = (lx) => {
    const target = clamp(lx, CHUTE[CHUTE.length - 1][0], END_LX);
    let lo = 0, hi = 1;
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (at(m)[0] < target) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  return { at, uAtX, total };
}
const PATH = buildPath();
// Quãng đường thật (m) tính từ lúc thả → vị trí trên hình: đoạn máng cong được "nén" để tâm bi
// tới đúng cổng E khi đã lăn sE mét; sau đó ray thẳng, PXM px/m.
const L_E = PATH.uAtX(gateLocalX(LAB6.sE)) * PATH.total;
const X_END = LAB6.sE + (PATH.total - L_E) / PXM;
const uOfX = (x) => clamp((x <= LAB6.sE ? (Math.max(0, x) / LAB6.sE) * L_E : L_E + (x - LAB6.sE) * PXM) / PATH.total, 0, 1);

export default function LabBench({ measuredD = 20.0, assignedSets, onExportNote, onBack, onReplayPrelab, speak, muted, onToggleMute }) {
  // Mốc giáo viên giao (nếu có) là cấu hình BẮT BUỘC; ngoài ra học sinh đo tự do.
  const teacherAvg = useMemo(() => (assignedSets?.average || []).map((t) => ({ theta: Number(t.theta), sEF: +Number(t.sEF).toFixed(2) })), [assignedSets]);
  const teacherInst = useMemo(() => [...new Set((assignedSets?.instant || []).map((t) => Number(t.theta)))], [assignedSets]);

  const [placed, setPlaced] = useState(() => new Set());
  const [theta, setTheta] = useState(20);
  const sE = LAB6.sE;
  const [sEF, setSEF] = useState(LAB6.sEF.default);
  const sF = sE + sEF;

  const [balanced, setBalanced] = useState(false);
  const [magnetOn, setMagnetOn] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [ballT, setBallT] = useState(0);
  const [ballDrag, setBallDrag] = useState(null); // {x,y} screen khi kéo bi về

  const [mode, setMode] = useState("A+B"); // trung tính — HS tự chỉnh núm
  const [scale, setScale] = useState("fine");
  const [power, setPower] = useState(false);
  const [face, setFace] = useState("front");
  const [wires, setWires] = useState({ A: null, B: null });
  const [wireDrag, setWireDrag] = useState(null); // {gate,x,y}

  const [led, setLed] = useState(zeroDisplay("fine"));
  const [trials, setTrials] = useState([]);
  const [lastRun, setLastRun] = useState(null);   // lượt lăn vừa xong (chưa ghi)
  const [gateFlash, setGateFlash] = useState({ E: 0, F: 0 });
  // Giá trị đổi từng khung hình khi bi lăn — chỉ bàn thí nghiệm & số đồng hồ đăng ký nghe.
  const anim = useAnimStore({ ballT: 0, led: zeroDisplay("fine"), blocked: NO_BLOCK, slow: null, swing: 0 });
  const [quickArmed, setQuickArmed] = useState(false);
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [dragTool, setDragTool] = useState(null); // kéo dụng cụ từ palette
  const [flyTool, setFlyTool] = useState(null);   // {k, x, y} vật đang "bay" vào ô đích (viewBox)
  const [plumbSteady, setPlumbSteady] = useState(true); // dây dọi đã đứng yên chưa (đổi góc → đung đưa ~3 s)
  const [justRolled, setJustRolled] = useState(false); // vừa đo xong, chưa ghi số liệu

  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [viewportW, setViewportW] = useState(1280);
  const [sheetOpen, setSheetOpen] = useState(false); // sheet hướng dẫn + số liệu trên mobile
  const [zoomMode, setZoomMode] = useState("full"); // "full", "rail", "clock"
  const [controlsOpen, setControlsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(
      window.innerWidth < 768
      || window.matchMedia("(pointer: coarse) and (max-width: 1024px)").matches
      || window.matchMedia("(max-height: 600px) and (max-width: 1024px)").matches
    );
    const updateViewport = () => {
      check();
      setIsPortrait(window.innerHeight >= window.innerWidth);
      setViewportW(window.innerWidth);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);
  const rafRef = useRef(0);
  const mainRef = useRef(null);
  const lastMeasurementRef = useRef(null);
  const swingRef = useRef({ s: 0, v: 0, t: 0, running: false });
  const prevTheta = useRef(theta);
  const toastTimer = useRef(null);
  const lastSpoken = useRef("");
  const milestones = useRef(new Set());
  const nextId = useRef(1);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // Đổi góc -> dây dọi bị "đá" và đung đưa tắt dần ~3s (vài giây đầu góc chưa chuẩn)
  useEffect(() => {
    const d = theta - prevTheta.current; prevTheta.current = theta;
    if (!d) return;
    swingRef.current.v += d * 4;
    if (!swingRef.current.running) {
      swingRef.current.running = true; swingRef.current.t = performance.now();
      const loop = (now) => {
        const st = swingRef.current; const dt = Math.min(0.04, (now - st.t) / 1000); st.t = now;
        if (!st.shaking) { st.shaking = true; setPlumbSteady(false); }
        st.v += (-13 * st.s - 1.7 * st.v) * dt; st.s += st.v * dt;
        anim.set({ swing: st.s });   // góc từng khung hình: chỉ bàn thí nghiệm vẽ lại
        if (Math.abs(st.s) < 0.05 && Math.abs(st.v) < 0.25) {
          st.s = 0; st.v = 0; st.running = false; st.shaking = false;
          anim.set({ swing: 0 });
          setPlumbSteady(true);
          return;
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }, [theta, anim]);

  const required = TOOLS.map((t) => t.k);
  // thứ tự lắp: nam châm & 2 cổng quang cùng nhóm (lắp cái nào trước cũng được)
  const GROUPS = [["standL"], ["standR"], ["rail"], ["weight"], ["magnet", "gateE", "gateF"], ["clock"]];
  const reqSet = new Set(required);
  const activeGroup = GROUPS.find((g) => g.some((k) => reqSet.has(k) && !placed.has(k))) || [];
  const isNextTool = (k) => activeGroup.includes(k) && reqSet.has(k) && !placed.has(k);
  const assembled = required.every((k) => placed.has(k));

  /** flash("chữ") hoặc flash({ text, kind: "win" | "warn" }). */
  const flash = (m, duration = 2600) => {
    const next = typeof m === "string" ? { text: m } : m;
    setToast((old) => ({ ...next, id: (old?.id || 0) + 1 }));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), duration);
  };
  const sound = (name) => { if (!muted) labSound[name]?.(); };

  const wiredOK = wires.A === "E" && wires.B === "F";
  const part = partOfMode(mode);
  const setupDone = assembled && balanced && wiredOK && power && part !== null;
  const steadyPlumb = plumbSteady;

  /* ---------------- Số liệu: chuỗi theo góc θ, yêu cầu ---------------- */
  const avgTrials = trials.filter((t) => t.lab === "average");
  const instTrials = trials.filter((t) => t.lab === "instant");
  const thetaOrder = [];
  trials.forEach((t) => { const k = thetaKey(t.theta); if (!thetaOrder.includes(k)) thetaOrder.push(k); });
  const colorOf = (th) => {
    const i = thetaOrder.indexOf(thetaKey(th));
    return SERIES_COLORS[(i < 0 ? thetaOrder.length : i) % SERIES_COLORS.length];
  };
  const seriesOf = (th) => {
    const key = thetaKey(th);
    const avg = avgTrials.filter((t) => thetaKey(t.theta) === key);
    const inst = instTrials.filter((t) => thetaKey(t.theta) === key);
    const distinct = [...new Set(avg.map((t) => cmKey(t.sEF)))].sort((a, b) => a - b);
    const fit = distinct.length >= 2 ? linFit(avg.map((t) => ({ x: t.sEF * 100, y: t.v }))) : null;
    return { theta: key, avg, inst, distinct, fit, instMean: inst.length ? mean(inst.map((t) => t.v)) : null };
  };
  const allSeries = thetaOrder.map(seriesOf);
  const best = [...allSeries].sort((a, b) => b.distinct.length - a.distinct.length)[0] || null;
  const cur = seriesOf(theta);
  const teacherAvgMissing = teacherAvg.filter((tg) => !avgTrials.some((t) => Math.abs(t.theta - tg.theta) < 0.5 && Math.abs(t.sEF - tg.sEF) < 0.005));
  const teacherInstMissing = teacherInst.filter((th) => !instTrials.some((t) => Math.abs(t.theta - th) < 0.5));
  const avgDone = (best?.distinct.length || 0) >= REQ.series && !teacherAvgMissing.length;
  const instDone = instTrials.length >= REQ.instant && !teacherInstMissing.length;
  const allDone = avgDone && instDone;
  const quickUnlocked = trials.length >= 2;

  function placeTool(k) {
    if (placed.has(k)) return;
    if (!isNextTool(k)) { flash(`Lắp theo thứ tự — bước này: ${activeGroup.map((x) => TOOLS.find((t) => t.k === x)?.name).join(" / ")}.`); return; }
    setPlaced((p) => new Set(p).add(k));
  }
  // ô đặt (viewBox) cho từng dụng cụ — phải thả TRÚNG mới lắp
  function toolTargetVB(k) {
    const gEx = gateLocalX(sE), gFx = gateLocalX(sF);
    switch (k) {
      case "standL": return { x: XL, y: FLOOR - 130 };
      case "standR": return { x: xRightOf(theta), y: YR };
      case "rail":   return screenOf(400, 100, theta);
      case "weight": return screenOf(120, 150, theta);
      case "magnet": return screenOf(CHUTE[0][0], CHUTE[0][1], theta);
      case "gateE":  return screenOf(gEx, RULER_Y, theta);
      case "gateF":  return screenOf(gFx, RULER_Y, theta);
      case "clock":  return { x: CLK.x + 50, y: CLK.y + 40 };
      default:       return { x: VBW / 2, y: VBH / 2 };
    }
  }
  // "bay" từ điểm thả (x,y viewBox) tới ô đích rồi lắp
  function flyToPlace(k, x, y) {
    // Tab bị ẩn (rAF dừng) hoặc HS bật "giảm chuyển động" → lắp ngay, không bay.
    if (reducedMotion()) { placeTool(k); return; }
    const tgt = toolTargetVB(k), dur = 340;
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
  // kéo dụng cụ từ palette -> thả TRÚNG ô sáng thì tự bay vào lắp
  function startToolDrag(k, e) {
    if (placed.has(k)) return; e.preventDefault();
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch { /* trình duyệt không hỗ trợ capture */ }
    let moved = false;
    let lastX = e.clientX;
    let lastY = e.clientY;
    setDragTool({ k, x: e.clientX, y: e.clientY });
    const move = (ev) => {
      moved = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
      setDragTool({ k, x: ev.clientX, y: ev.clientY });
    };
    const up = (ev) => {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch { /* đã nhả */ }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setDragTool(null);
      if (!isNextTool(k)) { flash(`Lắp theo thứ tự — bước này: ${activeGroup.map((x) => TOOLS.find((t) => t.k === x)?.name).join(" / ")}.`); return; }
      const svg = mainRef.current?.querySelector("svg");
      const tgt = toolTargetVB(k);
      if (!svg) { flyToPlace(k, tgt.x, tgt.y - 60); return; }

      const clientX = (ev.clientX !== undefined && ev.clientX !== 0) ? ev.clientX : lastX;
      const clientY = (ev.clientY !== undefined && ev.clientY !== 0) ? ev.clientY : lastY;
      const r = svg.getBoundingClientRect();
      const scale = Math.min(r.width / VBW, r.height / VBH);
      const offset_x = (r.width - VBW * scale) / 2;
      const offset_y = (r.height - VBH * scale) / 2;
      const vbx = (clientX - r.left - offset_x) / scale;
      const vby = (clientY - r.top - offset_y) / scale;

      if (isMobile && clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        flyToPlace(k, vbx, vby);
        return;
      }
      const threshold = 95;
      if (!moved) { flyToPlace(k, tgt.x, tgt.y - 60); return; }        // bấm: bay từ trên xuống
      if (Math.hypot(vbx - tgt.x, vby - tgt.y) < threshold) flyToPlace(k, vbx, vby);
      else flash(`Kéo "${TOOLS.find((t) => t.k === k).name}" vào ô sáng trên bàn để lắp.`);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function resetTimer() {
    cancelAnimationFrame(rafRef.current);
    lastMeasurementRef.current = null;
    setRolling(false); setLed(zeroDisplay(scale)); setJustRolled(false); setLastRun(null);
    anim.set({ blocked: NO_BLOCK, slow: null });
  }
  function magnetOff() {
    if (rolling) return;
    // kiểm tra TRƯỚC khi nhả nam châm — nếu không bi sẽ "biến mất" (không giữ mà cũng không lăn)
    if (!magnetOn) { flash("Viên bi chưa nằm trên nam châm — kéo bi về rồi mới thả."); return; }
    if (!assembled) { flash("Hãy lắp đủ dụng cụ (kể cả đồng hồ) trước khi thả bi."); return; }
    if (!power) { flash("Chưa bật nguồn đồng hồ (mặt sau)."); return; }
    if (!wiredOK) { flash("Chưa nối dây: cổng E → ổ A, cổng F → ổ B."); return; }
    setMagnetOn(false);
    runRoll(steadyPlumb);
  }
  function magnetHold() { if (rolling) return; setMagnetOn(true); setBallT(0); setBallDrag(null); }

  function runRoll(steadyNow) {
    if (rolling) return;
    const partNow = partOfMode(mode);
    const res = computeTime({ mode, thetaDeg: theta, sE, sF, dMm: measuredD, balanced, steady: steadyNow, scale });
    const run = res.run || rollRun({ thetaDeg: theta, balanced, steady: steadyNow });
    const windows = res.valid ? res.windows : [];
    const sc = LAB6.scales[scale];
    const base = parseFloat(led) || 0;               // CỘNG DỒN nếu chưa reset
    const finalShown = res.valid ? Math.round((base + res.raw) / sc.res) * sc.res : base;
    const tEnd = run.timeAt(X_END);
    const slowBase = clamp(2.4 / tEnd, 1.5, 4);
    // MODE A/B/A+B: bi che cổng chỉ vài phần trăm giây → chiếu chậm thêm ×8 quanh lúc che.
    const zoomWins = partNow === "average" ? [] : windows;
    const slowAt = (tau) => (zoomWins.some(([a, b]) => tau > a - 0.015 && tau < b + 0.015) ? slowBase * 8 : slowBase);
    const lastStop = windows.length ? Math.max(...windows.map((w) => w[1])) : 0;
    const r = (Number(measuredD) || LAB6.ball.defaultMm) / 2000;
    const config = { part: partNow, theta, sEF, scale, mode, balanced, steady: steadyNow, measuredD };
    lastMeasurementRef.current = null;
    setRolling(true); setBallT(0); setBallDrag(null); setJustRolled(false); setLastRun(null);
    anim.set({ ballT: 0, led: base.toFixed(sc.dp), blocked: NO_BLOCK, slow: null });

    const finish = () => {
      anim.set({ ballT: 1, led: finalShown.toFixed(sc.dp), blocked: NO_BLOCK, slow: null });
      setBallT(1);
      setLed(finalShown.toFixed(sc.dp));
      setRolling(false);
      setJustRolled(res.valid);
      lastMeasurementRef.current = res.valid ? config : null;
      setLastRun(res.valid ? { ...config, t: finalShown, accumulated: base > 0 } : null);
      if (!res.valid) flash({ text: "MODE T không đo được gì ở bài này — lật mặt trước, chọn MODE A↔B hoặc A.", kind: "warn" }, 3600);
    };
    if (reducedMotion()) { finish(); return; }

    let tau = 0;
    let prev = null;
    const seen = new Set();
    const tick = (now) => {
      if (prev === null) prev = now;
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      tau = Math.min(tEnd, tau + dt / slowAt(tau));
      const x = run.posAt(tau);
      const eB = Math.abs(x - sE) < r, fB = Math.abs(x - sF) < r;
      if (eB && !seen.has("E")) { seen.add("E"); setGateFlash((g) => ({ ...g, E: g.E + 1 })); sound("gate"); }
      if (fB && !seen.has("F")) { seen.add("F"); setGateFlash((g) => ({ ...g, F: g.F + 1 })); sound("gate"); }
      let ledNow = anim.get().led;
      if (res.valid) {
        if (tau < lastStop) {
          const counted = windows.reduce((sum, [a, b]) => sum + clamp(tau - a, 0, b - a), 0);
          ledNow = (base + counted).toFixed(sc.dp);
        } else if (!seen.has("stop")) {
          seen.add("stop");
          ledNow = finalShown.toFixed(sc.dp);
          sound("stop");
        }
      }
      const factor = slowAt(tau);
      const old = anim.get().blocked;
      anim.set({
        ballT: uOfX(x),
        led: ledNow,
        blocked: old.E === eB && old.F === fB ? old : { E: eB, F: fB },
        slow: `chậm ×${factor >= 10 ? Math.round(factor) : +factor.toFixed(1)}`,
      });
      if (tau < tEnd) rafRef.current = requestAnimationFrame(tick);
      else finish();
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  // Mốc thành tích nhỏ — để việc lấy số liệu có "nhịp" và có điều để khám phá.
  function celebrate(next, trial) {
    const hit = (key) => { if (milestones.current.has(key)) return false; milestones.current.add(key); return true; };
    const key = thetaKey(trial.theta);
    const avg = next.filter((t) => t.lab === "average" && thetaKey(t.theta) === key);
    const inst = next.filter((t) => t.lab === "instant" && thetaKey(t.theta) === key);
    const distinct = [...new Set(avg.map((t) => cmKey(t.sEF)))];
    const fit = distinct.length >= 2 ? linFit(avg.map((t) => ({ x: t.sEF * 100, y: t.v }))) : null;
    const vA = inst.length ? mean(inst.map((t) => t.v)) : null;
    const match = fit && vA != null ? Math.abs(vA - fit.a) / fit.a : null;
    const instAll = next.filter((t) => t.lab === "instant");
    const bestNext = Math.max(0, ...[...new Set(next.map((t) => thetaKey(t.theta)))].map((th) => new Set(next.filter((t) => t.lab === "average" && thetaKey(t.theta) === th).map((t) => cmKey(t.sEF))).size));
    const doneNext = bestNext >= REQ.series && instAll.length >= REQ.instant
      && teacherAvg.every((tg) => next.some((t) => t.lab === "average" && Math.abs(t.theta - tg.theta) < 0.5 && Math.abs(t.sEF - tg.sEF) < 0.005))
      && teacherInst.every((th) => next.some((t) => t.lab === "instant" && Math.abs(t.theta - th) < 0.5));
    const msgs = [
      next.length === 1 && hit("first") && `📍 Lần đo đầu tiên: v = ${trial.v.toFixed(3)} m/s — điểm đã lên đồ thị!`,
      next.length === 2 && hit("quick") && "⚡ Em đã thạo quy trình — mở khóa nút “Đo nhanh”!",
      trial.lab === "average" && distinct.length === 2 && hit(`pair-${key}`) && `📈 Cùng góc ${key}°: sEF dài hơn thì v_tb lớn hơn — vì bi đang NHANH DẦN trên máng!`,
      trial.lab === "average" && distinct.length === REQ.series && hit(`series-${key}`) && `🔭 Đủ 3 khoảng sEF ở ${key}°: đường kéo dài tới sEF = 0 cho biết tốc độ tức thời tại E. Giờ thử MODE A để kiểm chứng!`,
      trial.lab === "instant" && instAll.length === 1 && hit("instFirst") && `⏱ MODE A: bi che cổng E trong ${trial.t.toFixed(3)} s → v = d/t = ${trial.v.toFixed(2)} m/s.`,
      trial.lab === "instant" && inst.length === 3 && new Set(inst.map((t) => t.t)).size <= 2 && hit("resolution") && "🔢 Bi che cổng chỉ ~0,01 s nên t chỉ có 2 chữ số có nghĩa — v tức thời tản nhiều. Đo lặp rồi lấy trung bình!",
      match != null && match < 0.06 && hit(`match-${key}`) && `✨ Khớp! v tức thời đo bằng MODE A (${vA.toFixed(2)}) ≈ v_tb kéo dài tới sEF = 0 (${fit.a.toFixed(2)} m/s): tốc độ tức thời = tốc độ trung bình trên quãng RẤT NGẮN.`,
      !trial.balanced && hit("unbalanced") && "⚠ Đo khi máng chưa cân bằng: bi cọ thành máng nên chậm hẳn — thấy điểm viền đỏ lệch chưa?",
      !trial.steady && trial.balanced && hit("unsteady") && "🌀 Vừa đổi góc đã thả: máng/dây dọi còn rung nên số đo tản mạnh. Chờ dây dọi đứng yên rồi thả!",
      doneNext && hit("done") && "✅ Đủ số liệu cả hai phần — lưu vào Sổ Báo Cáo được rồi!",
    ].filter(Boolean);
    if (msgs.length) { flash({ text: msgs[msgs.length - 1], kind: "win" }, 4800); sound("win"); }
    else { flash(`Đã ghi: ${trial.lab === "average" ? `θ ${key}° · sEF ${cmKey(trial.sEF)} cm` : `θ ${key}° · MODE A`} → v = ${trial.v.toFixed(3)} m/s`); sound("record"); }
  }

  function recordTrial() {
    if (rolling) return;
    if (!justRolled || !lastRun) { flash("Mỗi lượt thả chỉ ghi một lần — đưa bi về, Reset rồi thả lại."); return; }
    if (lastRun.accumulated) {
      flash({ text: "Số trên đồng hồ đã CỘNG DỒN lần đo trước (quên Reset trước khi thả). Bỏ lần này: Reset rồi đo lại.", kind: "warn" }, 4200);
      sound("warn");
      setJustRolled(false);
      return;
    }
    if (!lastRun.part) {
      flash(mode === "B"
        ? { text: "Hay đấy: MODE B cho tốc độ tức thời tại cổng F — lớn hơn ở E vì bi nhanh dần! Bài này ghi MODE A (tại E) và A↔B.", kind: "info" }
        : { text: "MODE A+B cộng thời gian che cả hai cổng — không dùng trong bài này. Chọn A↔B hoặc A.", kind: "warn" }, 4200);
      setJustRolled(false);
      return;
    }
    const cfg = lastMeasurementRef.current;
    const same = cfg
      && Math.abs(cfg.theta - theta) < 0.5
      && (cfg.part === "instant" || Math.abs(cfg.sEF - sEF) < 0.005)
      && cfg.scale === scale && cfg.mode === mode && cfg.balanced === balanced && cfg.measuredD === measuredD;
    if (!same) {
      flash("Cấu hình đã đổi sau phép đo — hãy đo lại trước khi ghi.");
      setJustRolled(false);
      return;
    }
    const t = parseFloat(led);
    const dist = cfg.part === "average" ? cfg.sEF : cfg.measuredD / 1000;
    const trial = {
      id: nextId.current++, lab: cfg.part, theta: cfg.theta, sEF: cfg.part === "average" ? cfg.sEF : null,
      mode: cfg.mode, t, v: t > 0 ? dist / t : null, balanced: cfg.balanced, steady: cfg.steady,
    };
    const next = [...trials, trial];
    setTrials(next);
    lastMeasurementRef.current = null;
    setJustRolled(false);
    celebrate(next, trial);
  }
  function discardRun() { resetTimer(); flash("Đã bỏ lần đo vừa rồi."); }
  function removeTrial(id) { setTrials((old) => old.filter((t) => t.id !== id)); }

  /** ⚡ Đo nhanh: tự đưa bi về, Reset, chờ dây dọi đứng yên rồi thả (mở khóa sau 2 lần đo tay). */
  function quickMeasure() {
    if (!quickUnlocked || rolling || justRolled || quickArmed) return;
    if (!setupDone) { flash("Hoàn tất thiết lập trước khi đo nhanh."); return; }
    resetTimer();
    if (!magnetOn) magnetHold();
    setQuickArmed(true);
  }
  useEffect(() => {
    if (!quickArmed || rolling || !magnetOn || !steadyPlumb) return;
    const id = setTimeout(() => { setQuickArmed(false); magnetOff(); }, 220);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickArmed, rolling, magnetOn, steadyPlumb]);

  /** Chuyển MODE sang phần đo cần tiếp (núm trên đồng hồ quay theo). */
  function switchPart(target) {
    if (rolling) return;
    if (!placed.has("clock")) { flash("Chưa lắp đồng hồ MC964."); return; }
    setFace("front");
    setMode(PARTS[target].mode);
    flash(`MODE ${PARTS[target].modeLabel}: đo ${PARTS[target].name}${target === "instant" ? " tại cổng E (v = d/t)" : " từ E tới F (v = sEF/t)"}.`);
  }

  // "Làm giúp bước này" — cứu học sinh khi bị kẹt ở một bước lắp/thiết lập.
  function runAssistantAction(payload) {
    if (payload === "auto_reset_object") {
      if (!assembled || !placed.has("magnet")) {
        flash("Cần lắp nam châm và viên bi trước khi đặt lại vật nặng.");
        return;
      }
      magnetHold();
      flash("Đã đặt viên bi lại vào nam châm.");
      return;
    }
    if (payload === "auto_wire") {
      if (!placed.has("clock") || !placed.has("gateE") || !placed.has("gateF")) {
        flash("Cần lắp đủ đồng hồ và hai cổng quang trước khi tự động nối dây.");
        return;
      }
      setFace("back");
      setWires({ A: "E", B: "F" });
      flash("Đã nối dây cổng E→A và F→B");
      return;
    }
    if (payload === "auto_power") {
      if (!placed.has("clock")) {
        flash("Chưa lắp đồng hồ nên chưa thể bật nguồn.");
        return;
      }
      setPower(true);
      flash("Đã bật nguồn đồng hồ");
      return;
    }
    if (payload === "auto_mode") {
      switchPart(!avgDone ? "average" : !instDone ? "instant" : "average");
      return;
    }
    if (payload === "auto_part_average") { switchPart("average"); return; }
    if (payload === "auto_part_instant") { switchPart("instant"); return; }
    if (payload === "auto_fix_screw") {
      if (!placed.has("standR")) {
        flash("Cần lắp giá đỡ phải trước khi cố định vít.");
        return;
      }
      setBalanced(true);
      flash("Đã cố định vít cân bằng máng.");
      return;
    }
    if (payload === "auto_reset") {
      if (!placed.has("clock")) {
        flash("Chưa lắp đồng hồ nên chưa thể reset số đo.");
        return;
      }
      resetTimer();
      flash("Đã reset số đo về 0");
    }
  }

  function saveTrials() { onExportNote?.({ lab: "average", measuredD, trials }); }
  function exportNote() {
    if (!trials.length) { flash("Chưa có số liệu để lưu."); return; }
    if (allDone) { saveTrials(); return; }
    setDialog({
      title: "Chưa đủ số liệu — vẫn lưu?",
      message: `Chuỗi sEF: ${Math.min(REQ.series, best?.distinct.length || 0)}/${REQ.series} (cùng một góc) · MODE A: ${Math.min(REQ.instant, instTrials.length)}/${REQ.instant} lần${teacherAvgMissing.length || teacherInstMissing.length ? " · còn thiếu cấu hình đề GV" : ""}. Có thể lưu bây giờ và đo bổ sung sau.`,
      actions: [{ label: "Đo tiếp cho đủ", tone: "primary" }, { label: `Vẫn lưu ${trials.length} số đo`, onClick: saveTrials }],
    });
  }
  // Thoát phòng lab — còn số liệu chưa lưu thì hỏi ngay trong Lab (không dùng window.confirm).
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

  // pointer -> toạ độ viewBox
  const evVB = (e, el) => { const svg = el.closest("svg"); const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * VBW, y: (e.clientY - r.top) / r.height * VBH, svg }; };

  // kéo giá phải -> đổi θ (thu hẹp/nới khoảng cách 2 giá)
  const dragAngle = useCallback((e) => {
    if (rolling) return; e.stopPropagation();
    const x0 = e.clientX, t0 = theta;
    const move = (ev) => setTheta(clamp(Math.round(t0 + (x0 - ev.clientX) / 6), LAB6.angle.min, LAB6.angle.max));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }, [rolling, theta]);

  // kéo cổng F -> đổi sEF (dọc theo ruler)
  const dragGateF = useCallback((e) => {
    if (rolling) return; e.stopPropagation();
    const { svg } = evVB(e, e.currentTarget); const kx = (svg.getBoundingClientRect().width / VBW) * K * PXM;
    const x0 = e.clientX, s0 = sEF;
    const move = (ev) => setSEF(clamp(+(s0 + (ev.clientX - x0) / kx * Math.cos(theta * Math.PI / 180)).toFixed(2), LAB6.sEF.min, LAB6.sEF.max));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }, [rolling, sEF, theta]);

  // kéo bi (ở cuối ray) về nam châm
  const dragBall = (e) => {
    if (rolling || magnetOn) return; e.stopPropagation();
    const startX = e.clientX, startY = e.clientY, startTime = e.timeStamp;
    const { svg } = evVB(e, e.currentTarget);
    const move = (ev) => { const p = evVB(ev, svg); setBallDrag({ x: p.x, y: p.y }); };
    const up = (ev) => {
      const isClick = Math.hypot(ev.clientX - startX, ev.clientY - startY) < 10 && (ev.timeStamp - startTime) < 300;
      if (isMobile && isClick) {
        magnetHold();
        flash("Đã đặt bi lại vào nam châm");
      } else {
        const p = evVB(ev, svg); const mag = screenOf(CHUTE[0][0], CHUTE[0][1], theta);
        if (Math.hypot(p.x - mag.x, p.y - mag.y) < 70) magnetHold();
        else setBallDrag(null);
      }
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  // ===== KÉO DÂY thật: cầm đầu dây cổng -> thả vào ổ A/B =====
  const dragWire = useCallback((gate, e) => {
    e.stopPropagation(); setFace("back");
    const startX = e.clientX, startY = e.clientY, startTime = e.timeStamp;
    const { svg } = evVB(e, e.currentTarget);
    const move = (ev) => { const p = evVB(ev, svg); setWireDrag({ gate, x: p.x, y: p.y }); };
    const up = (ev) => {
      const isClick = Math.hypot(ev.clientX - startX, ev.clientY - startY) < 10 && (ev.timeStamp - startTime) < 300;
      if (isMobile && isClick) {
        if (gate === "E") setWires((w) => ({ ...w, A: w.A === "E" ? null : "E" }));
        else if (gate === "F") setWires((w) => ({ ...w, B: w.B === "F" ? null : "F" }));
      } else {
        const p = evVB(ev, svg);
        const socks = { A: socketPos("A"), B: socketPos("B") };
        let hit = null;
        for (const s of ["A", "B"]) if (Math.hypot(p.x - socks[s].x, p.y - socks[s].y) < 26) hit = s;
        if (hit) setWires((w) => { const nw = { A: w.A === gate ? null : w.A, B: w.B === gate ? null : w.B }; nw[hit] = gate; return nw; });
      }
      setWireDrag(null);
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }, [isMobile]);
  const unplug = (sock) => setWires((w) => ({ ...w, [sock]: null }));

  /* ======================= BƯỚC TIẾP THEO (một nguồn sự thật) ======================= */
  const zeroLed = zeroDisplay(scale);
  const isReset = led === zeroLed;
  const ballAtEnd = !magnetOn && !rolling && ballT > 0;
  const nextToolNames = activeGroup
    .filter((k) => reqSet.has(k) && !placed.has(k))
    .map((k) => TOOLS.find((t) => t.k === k)?.name)
    .filter(Boolean);
  // Khoảng sEF gợi ý: xa các khoảng đã đo ở góc hiện tại nhất.
  const suggestSEF = (() => {
    if (!cur.distinct.length) return null;
    let bestPick = null;
    for (let v = 10; v <= 45; v += 5) {
      const d = Math.min(...cur.distinct.map((x) => Math.abs(x - v)));
      if (!bestPick || d > bestPick.d) bestPick = { v, d };
    }
    return bestPick && bestPick.d >= 5 ? bestPick.v / 100 : null;
  })();
  const partTeacherMiss = part === "average"
    ? teacherAvgMissing.find((tg) => !(Math.abs(tg.theta - theta) < 0.5 && Math.abs(tg.sEF - sEF) < 0.005))
    : part === "instant" ? teacherInstMissing.find((th) => !(Math.abs(th - theta) < 0.5)) : undefined;
  const onTeacherTarget = part === "average"
    ? teacherAvgMissing.some((tg) => Math.abs(tg.theta - theta) < 0.5 && Math.abs(tg.sEF - sEF) < 0.005)
    : part === "instant" ? teacherInstMissing.some((th) => Math.abs(th - theta) < 0.5) : false;
  const liveV = lastRun && lastRun.t > 0 ? (lastRun.part === "average" ? lastRun.sEF : lastRun.measuredD / 1000) / lastRun.t : null;
  const cm = (m) => `${Math.round(m * 100)} cm`;

  let next;
  if (!assembled) {
    next = {
      key: "assemble",
      title: `Lắp ${nextToolNames.join(" / ") || "dụng cụ"}`,
      hint: isMobile
        ? "Chạm dụng cụ đang sáng ở khay bên trái để lắp vào bàn."
        : "Kéo dụng cụ đang sáng ở khay bên trái thả vào vòng (+) trên bàn — hoặc bấm vào nó để lắp nhanh.",
    };
  } else if (!balanced) {
    next = { key: "balance", title: "Cân bằng máng nghiêng", hint: "Bấm con vít vàng trên giá đỡ phải để khóa cân bằng — vít chuyển xanh là xong.", assist: "auto_fix_screw" };
  } else if (!wiredOK) {
    next = {
      key: "wire",
      title: "Nối dây: cổng E → ổ A, cổng F → ổ B",
      hint: isMobile
        ? "Chạm chốt tròn ở chân mỗi cổng quang để cắm dây vào ổ tương ứng trên đồng hồ."
        : "Kéo chốt tròn ở chân cổng quang thả vào ổ ở mặt sau đồng hồ (đồng hồ tự lật khi kéo dây).",
      assist: "auto_wire",
    };
  } else if (!power) {
    next = { key: "power", title: "Bật nguồn đồng hồ MC964", hint: "Ở mặt sau đồng hồ, bấm công tắc nguồn để chuyển sang I (màu xanh).", assist: "auto_power" };
  } else if (!part) {
    const want = !avgDone ? "average" : !instDone ? "instant" : "average";
    next = {
      key: "mode",
      title: `Chọn MODE ${PARTS[want].modeLabel}`,
      hint: `Lật về mặt trước đồng hồ, bấm núm MODE tới ${want === "average" ? "A↔B — thời gian bi đi từ E đến F (tốc độ trung bình)" : "A — thời gian bi che cổng E (tốc độ tức thời)"}.`,
      assist: "auto_mode",
    };
  } else if (rolling) {
    next = { key: "rolling", title: "Đang đo…", hint: part === "average" ? "Đồng hồ đếm từ lúc bi chắn cổng E tới lúc chắn cổng F." : "Đồng hồ chỉ đếm trong lúc bi che tia của cổng E." };
  } else if (justRolled && lastRun) {
    next = lastRun.accumulated
      ? { key: "record", title: "Số đo bị cộng dồn!", hint: `Đồng hồ hiện ${led} s vì chưa Reset trước khi thả. Bấm “Bỏ lần này” (Reset) rồi đo lại.`, assist: "auto_reset" }
      : !lastRun.part
        ? { key: "record", title: `MODE ${MODE_LABEL[mode]} không dùng để ghi`, hint: "Bài này ghi MODE A↔B (tốc độ trung bình) và MODE A (tốc độ tức thời tại E).", assist: "auto_mode" }
        : {
            key: "record",
            title: "Ghi số liệu vừa đo",
            hint: `t = ${led} s → v = ${lastRun.part === "average" ? "sEF" : "d"}/t = ${liveV.toFixed(3)} m/s.${lastRun.steady ? "" : " ⚠ Thả khi máng còn rung — nên bỏ lần này."}`,
            primaryLabel: "Ghi số liệu",
          };
  } else if (allDone) {
    next = { key: "done", title: "Đã đủ số liệu cả hai phần", hint: "Lưu vào Sổ Báo Cáo để lập bảng, vẽ đồ thị — hoặc đo thêm để khám phá.", primaryLabel: "Lưu vào Sổ Báo Cáo", primaryShort: "Lưu" };
  } else if (ballAtEnd) {
    next = {
      key: "ballback",
      title: "Đưa viên bi về nam châm",
      hint: isMobile ? "Chạm vào viên bi ở cuối máng để đặt lại lên nam châm." : "Kéo viên bi ở cuối máng thả lại vào nam châm ở đầu cao.",
      assist: "auto_reset_object",
    };
  } else if (!isReset) {
    next = { key: "reset", title: "Reset đồng hồ về 0", hint: "Bấm nút Reset đỏ ở mặt trước đồng hồ trước mỗi lần thả — nếu không, số đo sẽ cộng dồn.", assist: "auto_reset" };
  } else if (!steadyPlumb) {
    next = { key: "settle", title: "Chờ dây dọi đứng yên…", hint: "Vừa đổi góc nên máng còn rung. Thả lúc này số đo tản mạnh." };
  } else if (partTeacherMiss !== undefined && !onTeacherTarget) {
    next = part === "average"
      ? { key: "config", title: `Đặt θ = ${partTeacherMiss.theta}°, sEF = ${cm(partTeacherMiss.sEF)} (đề GV)`, hint: isMobile ? "Mở nút điều chỉnh ở cạnh phải bàn." : "Kéo giá đỡ phải để đổi θ, kéo cổng F để đổi sEF — hoặc dùng thanh chỉnh bên phải." }
      : { key: "config", title: `Đặt θ = ${partTeacherMiss}° (đề GV)`, hint: isMobile ? "Mở nút điều chỉnh ở cạnh phải bàn." : "Kéo giá đỡ phải để đổi góc θ, hoặc dùng thanh chỉnh bên phải." };
  } else if (part === "average" && avgDone) {
    next = { key: "switch", title: "Chuyển sang MODE A: đo tốc độ tức thời", hint: `Giữ θ = ${best.theta}° để so v tức thời với đường v_tb kéo dài tới sEF = 0.`, assist: "auto_part_instant" };
  } else if (part === "instant" && instDone) {
    next = { key: "switch", title: "Chuyển sang MODE A↔B: đo tốc độ trung bình", hint: "Cần 3 khoảng sEF khác nhau ở cùng một góc θ.", assist: "auto_part_average" };
  } else {
    const n = part === "average"
      ? cur.avg.filter((t) => cmKey(t.sEF) === cmKey(sEF)).length
      : cur.inst.length;
    next = {
      key: "release",
      title: `Thả bi · ${part === "average" ? `θ ${theta}° · sEF ${cm(sEF)}` : `θ ${theta}° · MODE A`}${n ? ` (lần ${n + 1})` : ""}`,
      hint: part === "average"
        ? cur.distinct.length
          ? `Góc ${theta}° đã có ${cur.distinct.length}/${REQ.series} khoảng sEF.${suggestSEF ? ` Thử sEF = ${cm(suggestSEF)} (kéo cổng F).` : ""} Giữ nguyên θ để thấy quy luật.`
          : "Bấm nút đỏ trên nam châm để thả bi. Giữ nguyên θ, đo ở vài khoảng sEF khác nhau."
        : best && best.distinct.length >= 2 && thetaKey(theta) !== best.theta
          ? `Nên đặt θ = ${best.theta}° (góc đã đo v_tb) để so sánh. Đã đo ${instTrials.length}/${REQ.instant} lần MODE A.`
          : `Bi che cổng E trong t → v = d/t (d = ${measuredD.toFixed(2)} mm). Đã đo ${instTrials.length}/${REQ.instant} lần.`,
    };
  }
  const phase = !assembled ? 0 : !setupDone ? 1 : !allDone ? 2 : 3;
  // Nút chính của bước hiện tại: ghi số liệu vừa đo, hoặc lưu sang Sổ Báo Cáo khi đã đo đủ.
  const handlePrimary = () => (next.key === "record" ? recordTrial() : exportNote());
  const speechText = `${next.title}. ${next.hint || ""}`.trim();
  const speechKey = `${next.key}|${["release", "settle"].includes(next.key) ? part : next.title}`;

  // TTS: đọc bước tiếp theo mỗi khi bước đổi (không đọc lại khi chỉ số liệu trong gợi ý đổi).
  useEffect(() => {
    if (!speak || ["rolling", "settle"].includes(next.key) || quickArmed || speechKey === lastSpoken.current) return;
    lastSpoken.current = speechKey;
    speak(speechText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechKey, speak]);

  // Mobile: tự zoom tới vùng cần thao tác của bước hiện tại.
  useEffect(() => {
    if (!isMobile) return;
    let target = null;
    if (!assembled) target = "full";
    else if (next.key === "balance") target = "rail";
    else if (["wire", "power", "mode"].includes(next.key)) target = "clock";
    else if (["config", "release", "ballback", "reset", "rolling", "record"].includes(next.key)) target = "full";
    if (!target) return;
    const timer = setTimeout(() => setZoomMode(target), 0);
    return () => clearTimeout(timer);
  }, [assembled, isMobile, next.key]);

  /* ============================ GIAO DIỆN ============================ */
  const setupItems = [
    { key: "balance", text: "Cân bằng máng (vít vàng trên giá phải)", done: balanced },
    { key: "wire", text: "Nối dây cổng E → ổ A, F → ổ B", done: wiredOK },
    { key: "power", text: "Bật nguồn đồng hồ (mặt sau)", done: power },
    { key: "mode", text: "Chọn MODE A↔B hoặc A (mặt trước)", done: part !== null },
  ];
  const placedCount = required.filter((k) => placed.has(k)).length;
  const fixed = scale === "fine" ? 3 : 2;
  const canRecord = justRolled && !rolling && lastRun && !lastRun.accumulated && lastRun.part;

  /* Thẻ ĐO: số trên đồng hồ + tốc độ tính ngay + tiến độ (viên nhỏ) + nút phụ */
  const curInstant = cur.instMean ?? (cur.fit && cur.distinct.length >= 2 ? cur.fit.a : null);
  const measureCard = (
    <section style={{ ...panelCard, padding: 10, border: `1.5px solid ${canRecord ? `${C.orange}88` : C.line}`, background: canRecord ? "#FFF8F0" : "#fff" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={miniLabel}>Đồng hồ · MODE {MODE_LABEL[mode]}</div>
          <div style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 900, color: canRecord ? C.orangeDk : C.ink, lineHeight: 1.1 }}>
            <AnimLed anim={anim} rolling={rolling} led={led} /><span style={{ fontSize: 12, color: C.sub, marginLeft: 3, fontFamily: FONT }}>s</span>
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 0 }}>
          <div style={miniLabel}>{justRolled && lastRun ? (lastRun.part === "average" ? `v_tb = sEF/t` : lastRun.part === "instant" ? "v = d/t tại E" : "—") : `Tại E · θ ${theta}°`}</div>
          <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 900, lineHeight: 1.15, whiteSpace: "nowrap", color: justRolled && lastRun?.accumulated ? "#B91C1C" : colorOf(theta) }}>
            {justRolled && lastRun
              ? (lastRun.accumulated ? "cộng dồn!" : liveV != null && lastRun.part ? `${liveV.toFixed(3)}` : "—")
              : curInstant != null ? `${cur.instMean == null ? "≈" : ""}${curInstant.toFixed(2)}` : "—"}
            <span style={{ fontSize: 11, color: C.sub, marginLeft: 3, fontFamily: FONT }}>m/s</span>
          </div>
          {!justRolled && (cur.instMean != null || cur.fit) && (
            <div style={{ fontSize: 10.5, fontWeight: 800, color: C.sub, whiteSpace: "nowrap" }}>
              {cur.instMean != null ? `MODE A ${cur.instMean.toFixed(2)}` : ""}{cur.instMean != null && cur.fit ? " · " : ""}{cur.fit ? `kéo dài ${cur.fit.a.toFixed(2)}` : ""}
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <ProgressPills items={[
          { key: "avg", label: "Chuỗi sEF ", value: `${Math.min(REQ.series, best?.distinct.length || 0)}/${REQ.series}${best ? ` · ${best.theta}°` : ""}`, done: avgDone, current: part === "average" && !avgDone },
          { key: "inst", label: "MODE A ", value: `${Math.min(REQ.instant, instTrials.length)}/${REQ.instant}`, done: instDone, current: part === "instant" && !instDone },
          ...(teacherAvg.length || teacherInst.length
            ? [{ key: "gv", label: "Đề GV ", value: `${teacherAvg.length + teacherInst.length - teacherAvgMissing.length - teacherInstMissing.length}/${teacherAvg.length + teacherInst.length}`, done: !teacherAvgMissing.length && !teacherInstMissing.length }]
            : []),
        ]} />
      </div>
      {setupDone && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          {justRolled ? (
            <button type="button" onClick={discardRun} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 11.5, borderColor: C.line, color: C.sub }}>Bỏ lần này</button>
          ) : quickUnlocked ? (
            <button type="button" onClick={quickMeasure} disabled={rolling || quickArmed} title="Tự đưa bi về, Reset, chờ dây dọi đứng yên rồi thả"
              style={{ ...btnSoft, padding: "6px 10px", opacity: rolling || quickArmed ? 0.5 : 1 }}>
              <Zap size={13} strokeWidth={2.6} /> {quickArmed ? "Đang chuẩn bị…" : "Đo nhanh"}
            </button>
          ) : (
            <span style={{ fontSize: 10.5, color: C.sub, fontWeight: 700 }}>⚡ Ghi 2 lần bằng tay để mở khóa “Đo nhanh”.</span>
          )}
        </div>
      )}
    </section>
  );

  const controlsCard = (
    <section style={{ ...panelCard, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      <NudgeSlider
        label="Góc nghiêng"
        valueText={`θ = ${theta}°`}
        value={theta} min={LAB6.angle.min} max={LAB6.angle.max} step={1}
        disabled={rolling || !placed.has("standR")}
        nudges={[{ label: "−1", delta: -1 }, { label: "+1", delta: 1 }]}
        onChange={(v, isDelta) => setTheta((old) => clamp(Math.round(isDelta ? old + v : v), LAB6.angle.min, LAB6.angle.max))}
      />
      <NudgeSlider
        label="Khoảng E → F"
        valueText={`sEF = ${cm(sEF)}`}
        value={sEF} min={LAB6.sEF.min} max={LAB6.sEF.max} step={0.01}
        disabled={rolling || !placed.has("gateF")}
        nudges={[{ label: "−1", delta: -0.01 }, { label: "+1", delta: 0.01 }]}
        onChange={(v, isDelta) => setSEF((old) => clamp(+(isDelta ? old + v : v).toFixed(2), LAB6.sEF.min, LAB6.sEF.max))}
        extra={part === "average" && suggestSEF ? (
          <button type="button" disabled={rolling} onClick={() => setSEF(suggestSEF)} style={{ ...choiceButton, marginTop: 6, color: C.orangeDk, borderColor: `${C.orange}66` }}>Khoảng mới gợi ý: {cm(suggestSEF)}</button>
        ) : null}
      />
    </section>
  );

  /* Số liệu gọn: mỗi cấu hình một dòng — các lần đo là "viên" nhỏ (bấm × để xoá) */
  const dataGroups = [];
  [...avgTrials, ...instTrials].forEach((t) => {
    const key = t.lab === "average" ? `a-${thetaKey(t.theta)}-${cmKey(t.sEF)}` : `i-${thetaKey(t.theta)}`;
    let g = dataGroups.find((item) => item.key === key);
    if (!g) {
      g = { key, lab: t.lab, theta: thetaKey(t.theta), cm: t.lab === "average" ? cmKey(t.sEF) : null, items: [] };
      dataGroups.push(g);
    }
    g.items.push(t);
  });
  dataGroups.sort((a, b) => (a.lab === b.lab ? a.theta - b.theta || (a.cm ?? 0) - (b.cm ?? 0) : a.lab === "average" ? -1 : 1));
  const isCurrentGroup = (g) => g.theta === thetaKey(theta) && ((g.lab === "average" && part === "average" && g.cm === cmKey(sEF)) || (g.lab === "instant" && part === "instant"));
  const dataCard = (
    <section style={{ ...panelCard, padding: 10, flexShrink: 1, minHeight: 96, display: "flex", flexDirection: "column" }}>
      <div style={{ ...sectionHead, marginBottom: 6 }}>
        <span style={sectionTitle}>Số liệu · {trials.length} lần</span>
        {trials.length > 0 && <button type="button" onClick={clearTrials} style={linkBtn}>Xóa hết</button>}
      </div>
      <div data-lab-scroll style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {dataGroups.map((g) => (
          <div key={g.key} style={{ display: "grid", gridTemplateColumns: "76px minmax(0,1fr) auto", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 8, fontSize: 11.5, background: isCurrentGroup(g) ? "#FFF6EC" : C.bg }}>
            <b style={{ color: colorOf(g.theta), whiteSpace: "nowrap" }}>{g.theta}° · {g.lab === "average" ? `${g.cm} cm` : "tại E"}</b>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 3, minWidth: 0 }}>
              {g.items.map((t) => (
                <span key={t.id} style={{ ...chip, borderColor: t.balanced && t.steady ? C.line : "#FCA5A5", color: t.balanced && t.steady ? C.ink : "#B91C1C" }} title={`v = ${t.v?.toFixed(3)} m/s`}>
                  {t.t.toFixed(fixed)}
                  <button type="button" onClick={() => removeTrial(t.id)} aria-label={`Xoá lần đo t = ${t.t.toFixed(fixed)} s`} style={chipX}>×</button>
                </span>
              ))}
            </span>
            <span style={{ whiteSpace: "nowrap", color: C.sub, fontWeight: 800 }}>v <b style={{ color: C.ink }}>{mean(g.items.map((t) => t.v || 0)).toFixed(3)}</b></span>
          </div>
        ))}
        {!trials.length && <div style={{ fontSize: 12, color: C.sub, fontStyle: "italic", padding: "2px 2px 4px" }}>Chưa có lần đo — thả bi rồi bấm Ghi.</div>}
      </div>
    </section>
  );

  /* Đồ thị "v theo sEF": mỗi góc θ một màu; v tức thời (MODE A) nằm ở sEF = 0 */
  const graphV = [...trials.map((t) => t.v), liveV, ...allSeries.map((sr) => sr.fit?.a)].filter((v) => Number.isFinite(v));
  const yRange = graphV.length ? niceRange(graphV, { pad: 0.18, count: 5 }) : { min: 0.4, max: 1.6, ticks: [0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6] };
  const graphSeries = allSeries.map((sr) => {
    const xs = sr.distinct;
    const f = sr.fit;
    const at = (x) => (f ? f.a + f.b * x : 0);
    return {
      id: `t${sr.theta}`,
      name: `θ = ${sr.theta}°`,
      color: colorOf(sr.theta),
      points: [
        ...sr.avg.map((t) => ({ x: t.sEF * 100, y: t.v, key: t.id, warn: !t.balanced || !t.steady })),
        ...sr.inst.map((t) => ({ x: 0, y: t.v, key: t.id, big: true, warn: !t.balanced || !t.steady })),
      ],
      lines: f ? [
        { x1: xs[0], y1: at(xs[0]), x2: xs[xs.length - 1], y2: at(xs[xs.length - 1]) },
        { x1: 0, y1: f.a, x2: xs[0], y2: at(xs[0]), dashed: true },
      ] : [],
      tags: f && xs.length >= REQ.series ? [{ x: 0, y: f.a, text: `sEF→0: ${f.a.toFixed(2)} m/s`, pill: true, dy: -16 }] : [],
    };
  });
  const graphLive = justRolled && lastRun?.part && liveV != null
    ? { x: lastRun.part === "average" ? lastRun.sEF * 100 : 0, y: liveV, color: colorOf(lastRun.theta), label: `v = ${liveV.toFixed(3)} m/s` }
    : null;
  const graphGhost = !rolling && !justRolled && setupDone && cur.fit
    ? part === "average" && !cur.distinct.includes(cmKey(sEF))
      ? { x: sEF * 100, y: cur.fit.a + cur.fit.b * sEF * 100, label: "dự đoán" }
      : part === "instant" && !cur.inst.length ? { x: 0, y: cur.fit.a, label: "dự đoán v tức thời" } : null
    : null;
  const renderGraph = (compact, tall = false) => (
    <LiveGraph
      x={{ label: "sEF (cm)", min: 0, max: 46, ticks: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45], fmt: (v) => String(v) }}
      y={{ label: "v (m/s)", min: yRange.min, max: yRange.max, ticks: yRange.ticks, fmt: (v) => v.toFixed(2) }}
      series={graphSeries}
      guides={setupDone && part === "average" ? [{ axis: "x", value: sEF * 100, color: colorOf(theta), label: `cổng F: ${cm(sEF)}` }] : []}
      live={graphLive}
      ghost={graphGhost}
      activeSeries={`t${thetaKey(theta)}`}
      empty="Thả bi — mỗi lần ghi là một điểm (v, sEF); v tức thời nằm ở sEF = 0."
      compact={compact}
      tall={tall}
      ariaLabel="Đồ thị tốc độ theo khoảng cách hai cổng quang"
    />
  );
  const stageGraph = (
    <section style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 15, padding: "8px 10px 2px", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <b style={{ fontSize: 13, color: C.ink, whiteSpace: "nowrap" }}>Đồ thị v theo sEF</b>
        <span style={{ fontSize: 11.5, color: C.sub, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {cur.fit
            ? `θ ${thetaKey(theta)}°: sEF → 0 thì v_tb → ${cur.fit.a.toFixed(2)} m/s ≈ tốc độ tức thời tại E${cur.instMean != null ? ` (MODE A: ${cur.instMean.toFixed(2)})` : ""}`
            : "Giữ nguyên θ, đo v_tb ở nhiều sEF rồi xem đường kéo dài tới sEF = 0."}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{renderGraph(isMobile, isMobile && isPortrait)}</div>
    </section>
  );
  const graphCard = (
    <section style={{ ...panelCard, padding: 10 }}>
      <div style={{ height: 210 }}>{renderGraph(true)}</div>
    </section>
  );

  const measuring = setupDone || trials.length > 0;
  const panelContent = (
    <>
      <NextStepCard phase={phase} next={next} onSpeak={speak && !muted ? () => speak(speechText) : null} onPrimary={handlePrimary} onAssist={runAssistantAction} />
      {assembled && !setupDone && <ChecklistCard title="Thiết lập trước khi đo" items={setupItems} currentKey={next.key} />}
      {measuring && measureCard}
      {measuring && !isMobile && controlsCard}
      {isMobile && measuring && !isPortrait && graphCard}
      {measuring && dataCard}
    </>
  );
  const finishButton = <FinishButton count={trials.length} allDone={allDone} onFinish={exportNote} />;

  const partChips = (
    <div role="group" aria-label="Hai phần đo" style={{ display: "flex", gap: 4, background: C.peachLt, padding: 3, borderRadius: 10, border: `1px solid ${C.line}`, width: isMobile && isPortrait ? "100%" : "auto", maxWidth: "100%" }}>
      {[["average", avgDone, `${Math.min(REQ.series, best?.distinct.length || 0)}/${REQ.series}`], ["instant", instDone, `${Math.min(REQ.instant, instTrials.length)}/${REQ.instant}`]].map(([k, done, prog]) => (
        <button key={k} type="button" aria-pressed={part === k} onClick={() => switchPart(k)} title={`Chuyển MODE ${PARTS[k].modeLabel}`}
          style={{ ...tabBtn, flex: isMobile ? 1 : "initial", whiteSpace: "nowrap", fontSize: isMobile ? 11 : 12, padding: isMobile ? "5px 8px" : "6px 12px", ...(part === k ? tabActive : {}) }}>
          {k === "average" ? "①" : "②"} {isMobile ? (k === "average" ? "v TB" : "v tức thời") : PARTS[k].name} · {PARTS[k].modeLabel} {done ? "✓" : prog}
        </button>
      ))}
    </div>
  );

  const showTray = !assembled;
  // Điện thoại dọc: bàn (đúng tỉ lệ) ở trên, đồ thị bên dưới, sheet hướng dẫn ở đáy.
  const portraitStack = isMobile && isPortrait;
  const sceneAspect = zoomMode === "clock" ? 190 / 330 : zoomMode === "rail" ? 440 / 700 : 480 / 640;
  const sceneH = Math.round(Math.max(140, viewportW - (showTray ? 92 : 0) - 8) * sceneAspect);
  const showStageGraph = measuring && (!isMobile || isPortrait);

  return (
    <div className="phy-screen" data-lab-engine="inclined" style={{ flex: 1, minHeight: 0, overflow: "hidden", background: C.bg, fontFamily: FONT, display: "flex", flexDirection: "column" }}>
      <LabTopBar
        isMobile={isMobile}
        isPortrait={isPortrait}
        title="Bài 6 — Đo tốc độ trung bình & tức thời"
        shortTitle="Bài 6 · Tốc độ"
        onExit={handleExit}
        onPrelab={onReplayPrelab}
        muted={muted}
        onToggleMute={speak ? onToggleMute : null}
        center={assembled ? partChips : null}
        meta={<>d = <b style={{ color: C.ink }}>{measuredD.toFixed(2)} mm</b></>}
      />

      <div data-lab-layout data-orientation={isPortrait ? "portrait" : "landscape"} style={isMobile
        ? { flex: 1, display: "grid", gridTemplateColumns: showTray ? (isPortrait ? "92px minmax(0, 1fr)" : "minmax(132px, 17vw) minmax(0, 1fr)") : "minmax(0, 1fr)", minHeight: 0, overflow: "hidden", position: "relative" }
        : { flex: 1, display: "grid", gridTemplateColumns: showTray ? "clamp(190px, 12vw, 230px) minmax(0, 1fr) clamp(310px, 22vw, 390px)" : "minmax(0, 1fr) clamp(310px, 22vw, 390px)", minHeight: 0, overflow: "hidden" }
      }>
        {/* TRÁI: khay dụng cụ — tự ẩn khi đã lắp đủ để nhường chỗ cho bàn thí nghiệm */}
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
                <span style={sectionTitle}>Khay dụng cụ</span>
                <span style={countPill}>{placedCount}/{required.length}</span>
              </div>
            )}
            {TOOLS.map((t) => {
              const done = placed.has(t.k), isNext = isNextTool(t.k);
              if (isMobile && isPortrait && (done || !isNext)) return null;
              return (
                <div key={t.k} data-lab-tool
                  onPointerDown={(e) => {
                    if (!isMobile) startToolDrag(t.k, e);
                  }}
                  onClick={() => {
                    if (isMobile && isNext && !done) {
                      const target = toolTargetVB(t.k);
                      flyToPlace(t.k, target.x, target.y - 60);
                    }
                  }}
                  style={{ display: "flex", flexDirection: isMobile && isPortrait ? "column" : "row", alignItems: "center", gap: isMobile ? (isPortrait ? 2 : 6) : 9, padding: isMobile ? (isPortrait ? "5px 3px" : "4px 5px") : "8px 10px", borderRadius: 10, marginBottom: isMobile ? 0 : 6, cursor: done ? "default" : (isMobile ? "pointer" : "grab"), touchAction: isMobile ? "manipulation" : "none", flexShrink: 0, minWidth: 0, width: "100%",
                    border: `1.5px solid ${done ? C.good : isNext ? C.orange : C.line}`, background: done ? "#F3F8F3" : "#fff", opacity: done ? 0.7 : isNext ? 1 : 0.62, boxShadow: isNext ? `0 0 0 3px ${C.orange}22` : "none" }}>
                  <div style={{ width: isMobile ? 24 : 44, height: isMobile ? 24 : 44, display: "grid", placeItems: "center", background: C.bg, borderRadius: 8, flexShrink: 0 }}>
                    <MechIcon kind={t.icon} size={isMobile ? 20 : 38} />
                  </div>
                  <div style={{ minWidth: 0, textAlign: isMobile && isPortrait ? "center" : "left", flex: 1, width: isMobile && isPortrait ? "100%" : "auto" }}>
                    <div style={{ fontSize: isMobile ? (isPortrait ? 9.5 : 10.5) : 13.5, fontWeight: 700, color: C.ink, whiteSpace: isMobile && isPortrait ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.15 }}>{t.name}</div>
                    <div style={{ fontSize: isMobile ? 8.5 : 10.5, color: done ? C.good : isNext ? C.orangeDk : C.sub }}>
                      {done ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><Check className="w-2.5 h-2.5 stroke-[3]" /> Đã lắp</span>
                      ) : isNext ? (
                        isMobile ? "Chạm để lắp" : "Kéo vào bàn"
                      ) : (
                        t.sub
                      )}
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

        {/* GIỮA: workbench + đồ thị trực tiếp */}
        <main ref={mainRef} data-lab-stage style={{ position: "relative", overflow: "hidden", overscrollBehavior: "none", touchAction: "manipulation", padding: isMobile ? 4 : 10, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, flex: 1, outline: dragTool ? `2px dashed ${C.orange}` : "none", outlineOffset: -6, gap: isMobile ? 6 : 8, paddingBottom: isMobile ? 4 : 10 }}>
          <div style={portraitStack ? { flex: "0 0 auto", height: sceneH, display: "flex", flexDirection: "column", position: "relative" } : { flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
            <Workbench
              placed={placed} theta={theta} sE={sE} sF={sF} sEF={sEF} balanced={balanced}
              magnetOn={magnetOn} rolling={rolling} ballT={ballT} ballDrag={ballDrag} wires={wires} wireDrag={wireDrag}
              face={face} led={led} mode={mode} scale={scale} power={power} gateFlash={gateFlash} anim={anim}
              dropTarget={!assembled ? activeGroup.filter((k) => reqSet.has(k) && !placed.has(k)) : []} flyTool={flyTool}
              onDragAngle={dragAngle} onDragGateF={dragGateF} onDragBall={dragBall} onDragWire={dragWire} onUnplug={unplug}
              onReleaseBtn={() => (magnetOn ? magnetOff() : flash("Kéo viên bi lên nam châm rồi mới thả được."))}
              onToggleMagnet={() => (magnetOn ? magnetOff() : flash("Kéo viên bi lên nam châm để giữ."))}
              onToggleBalance={() => setBalanced((b) => !b)}
              onFlip={() => setFace((f) => (f === "front" ? "back" : "front"))}
              onCycleMode={() => setMode((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length])}
              onReset={resetTimer} onToggleScale={() => setScale((s) => (s === "fine" ? "coarse" : "fine"))}
              onTogglePower={() => setPower((p) => !p)}
              onCanvasTap={() => {
                if (isMobile && sheetOpen) setSheetOpen(false);
              }}
              isMobile={isMobile}
              isPortrait={isPortrait}
              zoomMode={zoomMode}
              setZoomMode={setZoomMode}
              highlightStep={next.key}
            />
          </div>
          {showStageGraph && (
            <div style={portraitStack ? { flex: "1 1 0", minHeight: 0, paddingBottom: 62 } : { flex: "0 0 clamp(190px, 34%, 300px)", minHeight: 0 }}>{stageGraph}</div>
          )}
          {isMobile && assembled && (
            <div data-lab-quick-controls style={{ position: "absolute", top: isPortrait ? 8 : 4, right: 0, zIndex: 36, pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              {!controlsOpen && (
                <button
                  type="button"
                  onClick={() => { setSheetOpen(false); setControlsOpen(true); }}
                  style={{ pointerEvents: "auto", width: 38, height: 52, borderRadius: "14px 0 0 14px", border: `1px solid ${C.orange}`, borderRight: "none", background: "#FFF7EF", color: C.orangeDk, display: "grid", placeItems: "center", boxShadow: "0 6px 18px rgba(50,30,18,0.16)" }}
                  aria-label="Mở điều chỉnh nhanh"
                  title="Điều chỉnh nhanh"
                >
                  <SlidersHorizontal size={18} strokeWidth={2.4} />
                </button>
              )}
              <div
                style={{
                  pointerEvents: controlsOpen ? "auto" : "none",
                  width: 286,
                  maxWidth: "78vw",
                  background: "#fff",
                  border: `1px solid ${C.line}`,
                  borderRight: "none",
                  borderRadius: "16px 0 0 16px",
                  padding: 10,
                  boxShadow: "0 12px 28px rgba(50,30,18,0.18)",
                  transform: controlsOpen ? "translateX(0)" : "translateX(112%)",
                  opacity: controlsOpen ? 1 : 0,
                  transition: "transform 240ms cubic-bezier(.2,.8,.2,1), opacity 180ms ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  maxHeight: "calc(100dvh - 104px)",
                  overflowY: "auto",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 900, color: C.ink }}>Điều chỉnh nhanh</span>
                  <button
                    type="button"
                    onClick={() => setControlsOpen(false)}
                    style={{ width: 30, height: 30, borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.sub, display: "grid", placeItems: "center" }}
                    aria-label="Đóng điều chỉnh nhanh"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {[
                    ["full", "Toàn cảnh"],
                    ["rail", "Máng/cổng"],
                    ["clock", "Đồng hồ"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setZoomMode(key)}
                      style={{ border: `1px solid ${zoomMode === key ? C.orange : C.line}`, background: zoomMode === key ? "#FFF2E6" : "#fff", color: zoomMode === key ? C.orangeDk : C.ink, borderRadius: 10, padding: "8px 6px", fontSize: 11, fontWeight: 900 }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => { setBalanced(true); flash("Đã cố định vít cân bằng máng."); }}
                  disabled={!placed.has("standR")}
                  style={{ border: `1px solid ${balanced ? C.good : C.orange}`, background: balanced ? "#F3F8F3" : "#FFF7EF", color: balanced ? C.good : C.orangeDk, borderRadius: 12, padding: "9px 10px", fontSize: 11.5, fontWeight: 900, opacity: placed.has("standR") ? 1 : 0.45 }}
                >
                  {balanced ? "✓ Máng đã cân bằng" : "Cố định vít cân bằng"}
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 8, background: C.bg }}>
                    <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 900, marginBottom: 6 }}>Góc · θ = {theta}°</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <button type="button" disabled={!placed.has("standR") || rolling} onClick={() => setTheta((v) => clamp(v - 1, LAB6.angle.min, LAB6.angle.max))} style={mobileAdjustBtn}>-1°</button>
                      <button type="button" disabled={!placed.has("standR") || rolling} onClick={() => setTheta((v) => clamp(v + 1, LAB6.angle.min, LAB6.angle.max))} style={mobileAdjustBtn}>+1°</button>
                    </div>
                  </div>
                  <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 8, background: C.bg }}>
                    <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 900, marginBottom: 6 }}>Cổng F · sEF = {cm(sEF)}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <button type="button" disabled={!placed.has("gateF") || rolling} onClick={() => setSEF((v) => clamp(+(v - 0.05).toFixed(2), LAB6.sEF.min, LAB6.sEF.max))} style={mobileAdjustBtn}>-5cm</button>
                      <button type="button" disabled={!placed.has("gateF") || rolling} onClick={() => setSEF((v) => clamp(+(v + 0.05).toFixed(2), LAB6.sEF.min, LAB6.sEF.max))} style={mobileAdjustBtn}>+5cm</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <LabToast toast={toast} fixed />
          <LabDialog dialog={dialog} onClose={() => setDialog(null)} />
        </main>
        {/* Dụng cụ đang kéo từ khay (cùng bản vẽ với bàn) */}
        {dragTool && (
          <div style={{ position: "fixed", left: dragTool.x - 24, top: isMobile ? dragTool.y - 72 : dragTool.y - 24, width: 48, height: 48, pointerEvents: "none", zIndex: 60, opacity: 0.94, filter: "drop-shadow(0 4px 8px rgba(0,0,0,.3))" }}>
            <MechIcon kind={toolIcon(dragTool.k)} size={48} />
          </div>
        )}

        {/* PHẢI (desktop) / SHEET (mobile): bước tiếp theo · đo · điều khiển · số liệu */}
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

// vị trí đồng hồ + ổ cắm (viewBox)
const CLK = { x: 578, y: 336 };
const CLK_SCALE = 0.72;
const SOCK = { A: 66, B: 114, C: 162 };
const socketPos = (s) => ({ x: CLK.x + SOCK[s] * CLK_SCALE, y: CLK.y + 52 * CLK_SCALE });

const NO_BLOCK = { E: false, F: false };

/** Số đang hiện trên đồng hồ — trong lúc bi lăn đọc thẳng từ kho hoạt ảnh. */
function AnimLed({ anim, rolling, led }) {
  const live = useAnim(anim);
  return rolling ? live.led : led;
}

/** Khung xanh nhấp nháy chỉ chỗ cần thao tác (mobile). */
function HintBox({ x, y, w, h, label }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      <animate attributeName="opacity" values="0.28;0.52;0.28" dur="1.4s" repeatCount="indefinite" />
      <rect x={x} y={y} width={w} height={h} rx="9" fill="#27AE6014" stroke="#27AE60" strokeWidth="1.4" strokeDasharray="6 4" />
      {label && <text x={x + w / 2} y={y - 5} textAnchor="middle" fontSize="10" fontWeight="900" fill="#17864A" fontFamily={FONT}>{label}</text>}
    </g>
  );
}

/* ============================ Workbench ============================ */
function Workbench(props) {
  const { placed, theta, sE, sF, sEF, balanced, magnetOn, rolling, ballT: ballTState, ballDrag, wires, wireDrag,
    face, led: ledState, mode, scale, power, gateFlash = { E: 0, F: 0 }, anim, dropTarget = [], flyTool = null,
    onDragAngle, onDragGateF, onDragBall, onDragWire, onUnplug,
    onReleaseBtn, onToggleMagnet, onToggleBalance, onFlip, onCycleMode, onReset, onToggleScale, onTogglePower, onCanvasTap,
    zoomMode, setZoomMode, highlightStep } = props;

  const zoomClock = zoomMode === "clock";
  const setZoomClock = (val) => setZoomMode(val ? "clock" : "full");
  // Khi bi đang lăn: đọc vị trí / số đồng hồ / tia cổng từ kho hoạt ảnh (vẽ lại riêng bàn này).
  const live = useAnim(anim);
  const ballT = rolling ? live.ballT : ballTState;
  const led = rolling ? live.led : ledState;
  const blocked = rolling ? live.blocked : NO_BLOCK;
  const slowLabel = rolling ? live.slow : null;
  const swingDeg = live.swing || 0;

  const has = (k) => placed.has(k);
  const xR = xRightOf(theta);
  const railGroup = `translate(${xR} ${YR}) rotate(${theta}) scale(${K}) translate(${-RLOW[0]} ${-RLOW[1]})`;

  const gEx = gateLocalX(sE), gFx = gateLocalX(sF);
  const pHigh = screenOf(RHIGH[0], RHIGH[1], theta);   // đầu cao trượt trên cột trái
  const pMag = screenOf(CHUTE[0][0], CHUTE[0][1], theta);
  const gEs = screenOf(gEx, RULER_Y, theta);
  const gFs = screenOf(gFx, RULER_Y, theta);
  const ballLocal = PATH.at(ballT);
  const pBall = screenOf(ballLocal[0], ballLocal[1] - 6, theta); // bi (nhỏ) ngồi trên mặt máng

  // đầu cao ray phải cao hơn sàn -> cột trái đủ cao
  const poleTop = Math.min(pHigh.y - 20, 70);

  // ô đặt (viewBox) cho từng dụng cụ — dùng vẽ vòng sáng chỉ chỗ + vật bay vào
  const targetVB = (k) => {
    switch (k) {
      case "standL": return { x: XL, y: FLOOR - 130 };
      case "standR": return { x: xR, y: YR };
      case "rail":   return screenOf(400, 100, theta);
      case "weight": return screenOf(122, 150, theta);
      case "magnet": return { x: pMag.x, y: pMag.y };
      case "gateE":  return { x: gEs.x, y: gEs.y };
      case "gateF":  return { x: gFs.x, y: gFs.y };
      case "clock":  return { x: CLK.x + 50, y: CLK.y + 40 };
      default:       return { x: VBW / 2, y: VBH / 2 };
    }
  };

  const viewBoxStr = props.isMobile
    ? (zoomMode === "clock" ? "515 290 330 190" :
       zoomMode === "rail" ? "50 60 700 440" :
       "70 55 640 480")
    : (zoomMode === "clock" ? "515 290 330 190" :
       zoomMode === "rail" ? "50 60 700 440" :
       `0 0 ${VBW} ${VBH}`);
  const showHint = props.isMobile && dropTarget.length === 0;

  return (
    <div style={{ position: "relative", width: "100%", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <svg
        onPointerDown={onCanvasTap}
        viewBox={viewBoxStr} preserveAspectRatio={props.isPortrait ? "xMidYMin meet" : "xMidYMid meet"}
        style={props.isMobile
          ? { flex: 1, flexShrink: 1, width: "100%", height: "100%", minHeight: 0, display: "block", background: "linear-gradient(#ffffff,#FBF6EC)", borderRadius: 12, border: `1px solid ${C.line}`, touchAction: "none" }
          : { flex: 1, minHeight: 0, width: "100%", height: "100%", display: "block", background: "linear-gradient(#ffffff,#FBF6EC)", borderRadius: 16, border: `1px solid ${C.line}`, flexShrink: 1 }}>
        <BenchBackdrop width={VBW} height={VBH} floor={FLOOR} />

        {/* Cột giá trái (cố định) — đầu cao ray trượt trên đây (vòng kẹp đi theo đầu cao) */}
        {has("standL") && <StandLeft6 x={XL} top={poleTop} floor={FLOOR} clampY={has("rail") ? pHigh.y + 1 : null} />}

        {/* Giá phải (cao cố định, kéo để đổi góc) — chạc đỡ đúng điểm tựa đầu thấp của máng */}
        {has("standR") && (
          <g style={{ cursor: rolling ? "default" : "ew-resize" }} onPointerDown={onDragAngle}>
            <StandRight6 x={xR} top={YR} floor={FLOOR} />
          </g>
        )}

        {/* RAY + thước + thước đo góc (vẽ trong hệ toạ độ của ray, xoay theo θ) */}
        {has("rail") && (
          <g transform={railGroup}>
            <Rail6 chute={CHUTE} rulerY={RULER_Y} zeroX={RULER_X0} pxPerM={PXM} pivot={PLUMB_PIVOT} endX={RAIL_END_X} />
          </g>
        )}

        {/* Dây dọi treo ở tâm thước đo góc — luôn thẳng đứng nên chỉ đúng θ */}
        {has("weight") && (() => {
          const piv = screenOf(PLUMB_PIVOT[0], PLUMB_PIVOT[1], theta);
          return <g transform={`translate(${piv.x} ${piv.y}) rotate(${swingDeg})`}><Plumb6 length={58} /></g>;
        })()}

        {/* vít cân bằng (chân đế giá phải) */}
        {has("standR") && <StandScrew6 x={xR} floor={FLOOR} balanced={balanced} onToggle={onToggleBalance} />}

        {/* Cổng quang E/F — vẽ screen-space, nghiêng theo ray */}
        {has("gateE") && <GatePiece p={gEs} theta={theta} label="E" wired={wires.A === "E"} blocked={blocked.E} flash={gateFlash.E} onDragWire={(e) => onDragWire("E", e)} />}
        {has("gateF") && <GatePiece p={gFs} theta={theta} label="F" wired={wires.B === "F"} blocked={blocked.F} flash={gateFlash.F} draggable onDrag={onDragGateF} onDragWire={(e) => onDragWire("F", e)} />}

        {/* Nam châm (xoay theo ray) + nút thả, ở đầu cao */}
        {has("magnet") && (
          <g transform={`translate(${pMag.x} ${pMag.y}) rotate(${theta}) translate(0 -6)`}>
            <g style={{ cursor: "pointer" }} onClick={onToggleMagnet} role="button" aria-label={magnetOn ? "Nam châm đang hút — bấm để tắt" : "Nam châm đang tắt — bấm để bật"}>
              <rect x="-13" y="-9" width="22" height="18" fill="transparent" />
              <Magnet6 on={magnetOn} />
            </g>
            <g style={{ cursor: "pointer" }} onClick={onReleaseBtn} role="button" aria-label="Nút thả bi">
              <circle cx="0" cy="-14.5" r="7" fill="transparent" />
              <circle cx="0" cy="-14.5" r="4.6" fill="#E03A36" stroke="#7F1D1D" strokeWidth="1.3" />
              <circle cx="-1.3" cy="-15.9" r="1.4" fill="#fff" opacity=".6" />
            </g>
          </g>
        )}

        {/* Viên bi (nhỏ) — trace theo ray; giữ sát mép nam châm; kéo về nam châm khi ở cuối */}
        {has("magnet") && (() => {
          if (ballDrag) return <BallImg x={ballDrag.x} y={ballDrag.y} grab onDown={onDragBall} />;
          if (magnetOn && !rolling) { const rr = theta * Math.PI / 180; return <BallImg x={pMag.x + 15 * Math.cos(rr)} y={pMag.y + 15 * Math.sin(rr)} />; }
          if (ballT > 0 || rolling) return <BallImg x={pBall.x} y={pBall.y} grab={!rolling} onDown={!rolling ? onDragBall : undefined} />;
          return null;
        })()}

        {/* badge θ + sEF */}
        {has("rail") && (() => { const wob = Math.abs(swingDeg) > 0.25;
          return <g>
            <rect x={XL - 34} y={FLOOR + 12} width="68" height="18" rx="9" fill="#fff" stroke={wob ? "#c9a227" : C.line} />
            <text x={XL} y={FLOOR + 25} textAnchor="middle" fontSize="10.5" fontWeight="800" fill={wob ? "#c9a227" : C.orange} fontFamily={FONT}>{wob ? `θ ≈ ${(theta + swingDeg).toFixed(0)}°` : `θ = ${theta}°`}</text>
          </g>; })()}
        {has("gateE") && has("gateF") && (() => { const mx = (gEs.x + gFs.x) / 2, my = Math.min(gEs.y, gFs.y) - 54;
          return <g><line x1={gEs.x} y1={gEs.y - 42} x2={gFs.x} y2={gFs.y - 42} stroke={C.navy} strokeDasharray="4 3" strokeWidth="1.2" />
            {[gEs, gFs].map((g, i) => <line key={i} x1={g.x} y1={g.y - 46} x2={g.x} y2={g.y - 38} stroke={C.navy} strokeWidth="1.4" />)}
            <rect x={mx - 29} y={my - 9} width="58" height="16" rx="8" fill={C.navy} />
            <text x={mx} y={my + 2.5} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily={FONT}>sEF = {(sEF * 100).toFixed(0)} cm</text></g>; })()}

        {/* Đang chiếu chậm */}
        {slowLabel && (
          <g style={{ pointerEvents: "none" }}>
            <rect x={VBW - 150} y={18} width="112" height="24" rx="12" fill="#321E12" opacity=".85" />
            <text x={VBW - 94} y={34} textAnchor="middle" fontSize="11.5" fontWeight="900" fill="#fff" fontFamily={FONT}>▶ {slowLabel}</text>
          </g>
        )}

        {/* Đồng hồ trong workbench */}
        {has("clock") && (
          <g
            onPointerDown={(e) => {
              e.stopPropagation();
              if (!zoomClock) {
                setZoomClock(true);
              }
            }}
          >
            <MC964Inline face={face} led={led} mode={mode} scale={scale} power={power} wires={wires} wireDrag={wireDrag} counting={rolling}
              onFlip={onFlip} onCycleMode={onCycleMode} onReset={onReset} onToggleScale={onToggleScale} onTogglePower={onTogglePower} onUnplug={onUnplug} />
          </g>
        )}

        {/* DÂY NỐI — layer trên đồng hồ */}
        {has("clock") && ["A", "B"].map((sock) => {
          const g = wires[sock]; if (!g) return null;
          const from = g === "E" ? gEs : gFs; const to = socketPos(sock); const col = g === "E" ? C.navy : "#C0392B";
          return <path key={sock} d={`M ${from.x} ${from.y} C ${from.x} ${from.y + 70}, ${to.x} ${to.y + 70}, ${to.x} ${to.y}`} fill="none" stroke={col} strokeWidth="2.6" opacity={face === "back" ? 0.92 : 0.18} />;
        })}
        {wireDrag && (() => { const from = wireDrag.gate === "E" ? gEs : gFs; const col = wireDrag.gate === "E" ? C.navy : "#C0392B";
          return <path d={`M ${from.x} ${from.y} C ${from.x} ${from.y + 60}, ${wireDrag.x} ${wireDrag.y - 40}, ${wireDrag.x} ${wireDrag.y}`} fill="none" stroke={col} strokeWidth="2.6" strokeDasharray="5 4" />; })()}

        {showHint && highlightStep === "balance" && has("standR") && (() => { const sp = screwPos6(xR, FLOOR); return <HintBox x={sp.x - 17} y={sp.y - 16} w={34} h={32} label="Vặn vít" />; })()}
        {showHint && highlightStep === "wire" && face === "back" && (
          <>
            {has("gateE") && <HintBox x={gEs.x - 19} y={gEs.y - 4} w={38} h={36} label="Dây E" />}
            {has("gateF") && <HintBox x={gFs.x - 19} y={gFs.y - 4} w={38} h={36} label="Dây F" />}
            {has("clock") && <HintBox x={CLK.x + 38} y={CLK.y + 24} w={78} h={42} label="Ổ A/B" />}
          </>
        )}
        {showHint && highlightStep === "power" && face === "back" && has("clock") && <HintBox x={CLK.x + 168} y={CLK.y + 14} w={36} h={48} label="Nguồn" />}
        {showHint && highlightStep === "mode" && face === "front" && has("clock") && <HintBox x={CLK.x + 108} y={CLK.y + 16} w={50} h={58} label="MODE" />}
        {showHint && highlightStep === "reset" && face === "front" && has("clock") && <HintBox x={CLK.x + 172} y={CLK.y + 18} w={36} h={40} label="Reset" />}
        {showHint && highlightStep === "release" && has("magnet") && <HintBox x={pMag.x - 20} y={pMag.y - 32} w={40} h={42} label="Thả bi" />}

        {/* Ô ĐẶT (vòng sáng) chỉ chỗ thả cho (các) dụng cụ của bước hiện tại */}
        {dropTarget.map((k) => { const t = targetVB(k); return (
          <g key={"tgt-" + k} style={{ pointerEvents: "none" }}>
            <circle cx={t.x} cy={t.y} r="30" fill={`${C.orange}1e`} stroke={C.orange} strokeWidth="2" strokeDasharray="6 5">
              <animate attributeName="r" values="26;33;26" dur="1.3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.3s" repeatCount="indefinite" />
            </circle>
            <text x={t.x} y={t.y + 4} textAnchor="middle" fontSize="14" fontWeight="800" fill={C.orangeDk} fontFamily={FONT}>+</text>
          </g>); })}

        {/* Vật đang "bay" vào ô đích */}
        {flyTool && <MechIcon kind={toolIcon(flyTool.k)} x={flyTool.x - 20} y={flyTool.y - 20} size={40} style={{ pointerEvents: "none" }} />}

        {!has("rail") && <text x={VBW / 2} y="40" textAnchor="middle" fontSize="14" fill={C.sub} fontFamily={FONT}>Kéo dụng cụ vào ô sáng (+) trên bàn để lắp…</text>}
      </svg>

      {/* Floating Zoom Button */}
      {has("clock") && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoomClock(!zoomClock);
          }}
          style={{
            position: "absolute",
            // Mobile: góc trên-trái để không đụng nút điều chỉnh nhanh (phải) và sheet hướng dẫn (dưới).
            ...(props.isMobile
              ? { top: 8, left: 8 }
              : { top: zoomClock ? "auto" : 12, bottom: zoomClock ? 12 : "auto", left: 12 }),
            zIndex: 30,
            background: zoomClock ? C.orange : "#fff",
            color: zoomClock ? "#fff" : C.navy,
            border: `1.5px solid ${C.line}`,
            borderRadius: 12,
            padding: "8px 12px",
            fontSize: 11,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            fontFamily: FONT
          }}
        >
          {zoomClock ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          {zoomClock ? "Thu nhỏ Đồng hồ" : "Phóng to Đồng hồ"}
        </button>
      )}
    </div>
  );
}

function BallImg({ x, y, grab, onDown }) {
  if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) return null;
  return (
    <g style={{ cursor: grab ? "grab" : "default" }} onPointerDown={onDown}>
      <circle cx={x} cy={y} r="20" fill="transparent" />
      <SteelBall x={x} y={y} />
    </g>
  );
}

// cổng quang screen-space, nghiêng theo ray; đầu dây kéo được; tia hồng ngoại đỏ rực + vòng sáng khi bi che
function GatePiece({ p, theta, label, wired, blocked, flash, draggable, onDrag, onDragWire }) {
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${theta})`}>
      <g style={{ cursor: draggable ? "grab" : "default" }} onPointerDown={draggable ? onDrag : undefined}>
        <Photogate6 blocked={blocked} />
      </g>
      <line x1="0" y1="-9.6" x2="0" y2="2.6" stroke={blocked ? "#FF2D2D" : "#FF6B6B"} strokeWidth={blocked ? 2.4 : 1} strokeDasharray={blocked ? "none" : "1.6 1.6"} opacity={blocked ? 1 : 0.7} style={{ pointerEvents: "none" }} />
      {flash > 0 && (
        <circle key={`f${flash}`} cx="0" cy="-3.5" r="6" fill="none" stroke="#FF2D2D" strokeWidth="2.5" style={{ pointerEvents: "none" }}>
          <animate attributeName="r" from="6" to="30" dur="0.55s" fill="freeze" />
          <animate attributeName="opacity" from="1" to="0" dur="0.55s" fill="freeze" />
        </circle>
      )}
      <text x="0" y="-28" textAnchor="middle" fontSize="11" fontWeight="900" fill={C.navy} fontFamily={FONT}>{label}</text>
      {/* đầu dây kéo được (ở chân cổng) */}
      <circle cx="0" cy="20" r="5" fill={wired ? C.good : (label === "E" ? C.navy : "#C0392B")} stroke="#fff" strokeWidth="1.4"
        style={{ cursor: "grab" }} onPointerDown={onDragWire} />
    </g>
  );
}

/* ============================ MC964 trong workbench ============================ */
function MC964Inline({ face, led, mode, scale, power, wires, wireDrag, counting, onFlip, onCycleMode, onReset, onToggleScale, onTogglePower, onUnplug }) {
  return (
    <g transform={`translate(${CLK.x} ${CLK.y}) scale(${CLK_SCALE})`}>
      <MC964Face face={face} led={led} counting={counting} modeAngle={MODE_ANGLE[mode]} modeLabel={MODE_LABEL[mode]}
        scale={scale} scaleLabel={LAB6.scales[scale].label} power={power} wires={wires} plugInfo={PLUG_INFO} hotSockets={Boolean(wireDrag)}
        onFlip={onFlip} onCycleMode={onCycleMode} onReset={onReset} onToggleScale={onToggleScale} onTogglePower={onTogglePower} onUnplug={onUnplug} />
    </g>
  );
}

/* ============================ styles ============================ */
const tabBtn = { border: "none", background: "transparent", color: C.sub, fontWeight: 800, fontSize: 12.5, cursor: "pointer", padding: "6px 12px", borderRadius: 9, fontFamily: FONT };
const tabActive = { background: "#fff", color: C.orangeDk, boxShadow: "0 1px 4px rgba(0,0,0,.08)" };
const linkBtn = { border: "none", background: "transparent", color: C.sub, fontWeight: 800, fontSize: 11, cursor: "pointer", fontFamily: FONT, padding: 0, textDecoration: "underline" };
const miniLabel = { fontSize: 9.5, fontWeight: 900, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4 };
const chip = { display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 3px 2px 7px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", fontFamily: "monospace", fontSize: 11.5, fontWeight: 900 };
const chipX = { border: "none", background: "transparent", color: C.sub, cursor: "pointer", fontSize: 13, fontWeight: 900, lineHeight: 1, padding: "0 3px", fontFamily: FONT };
const choiceButton = { border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", color: C.sub, padding: "4px 8px", fontSize: 11, fontWeight: 850, cursor: "pointer", fontFamily: FONT };
const mobileAdjustBtn = { border: `1px solid ${C.orange}`, background: "#fff", color: C.orangeDk, borderRadius: 10, padding: "9px 6px", fontSize: 12, fontWeight: 900, fontFamily: FONT };
