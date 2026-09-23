"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Check, SlidersHorizontal, X, ZoomIn, ZoomOut, Zap } from "lucide-react";
import { C, FONT } from "../../engine/tokens.js";
import { FREEFALL, computeFallTime, gFromMeasurement, fitFreeFall } from "../../engine/physicsFreeFall.js";
import {
  LabTopBar, NextStepCard, ChecklistCard, FinishButton, MobileLabSheet, LabToast, LabDialog, ProgressPills, NudgeSlider,
  panelCard, sectionHead, sectionTitle, countPill, btnSecondary, btnSoft,
} from "./LabChrome.jsx";
import LiveGraph, { niceRange } from "./LiveGraph.jsx";
import { labSound } from "./labSound.js";
import { useAnimStore, useAnim } from "./animStore.js";

/* Assets phục vụ qua thư mục public (không import kiểu Vite trong Next). */
const railPng = "/lab/bai11/rail.png";
const cylinderSvg = "/lab/bai11/cylinder.svg";
const magnetSvg = "/lab/bai11/magnet.svg";
const photogatePng = "/lab/bai11/photogate.png";
const switchOnPng = "/lab/bai11/switch_on.png";
const switchOffPng = "/lab/bai11/switch_off.png";
const mc964FrontSvg = "/lab/bai11/mc964_front.svg";

/* ============================================================================
   FreeFallBench — Lab 11 "Thực hành đo gia tốc rơi tự do".
   Cảnh DỌC: máng đứng trên giá đỡ 3 chân; nam châm điện giữ trụ thép ở đỉnh;
   cổng quang trượt dọc máng để đổi quãng rơi s. Nhấn công tắc kép → ngắt điện
   nam châm → trụ thép rơi tự do + đồng hồ đếm; trụ cắt tia cổng quang → dừng.
   Điện: công tắc/nam châm → ổ A, cổng quang → ổ B, MODE A↔B (SGK Bài 11).

   ĐO TỰ DO: học sinh tự chọn s, đo lặp tuỳ ý. Mỗi lần thả được diễn CHẬM ×4 theo đúng
   s = ½gt² (đồng hồ chạy mượt, dừng đúng lúc trụ cắt tia), điểm (t², s) trượt trên đồ thị
   rồi "bật" thành điểm đo; đường thẳng qua gốc cho "g của em" ± sai số, càng đo càng chắc.
   Thả khi trụ còn đung đưa / quên Reset → số liệu xấu thấy ngay, bench nói rõ vì sao.
   ========================================================================== */

const VBW = 900, VBH = 520, FLOOR = 452;
const RAILX = 300;              // trục máng đứng (screen x) — lệch trái nhường chỗ đồng hồ

// rail.png (388×1024) đã gồm CẢ giá đỡ 3 chân + thước máng đứng. Vẽ nguyên khối,
// chân đế đặt trên sàn; không vẽ thêm giá đỡ SVG nữa.
const RAIL_TOP = 14;                          // đỉnh ảnh (đỉnh thước)
const RAIL_H = FLOOR - RAIL_TOP;              // cao tới sàn (chân kiềng chạm sàn)
const RAIL_W = RAIL_H * (388 / 1024);         // giữ đúng tỉ lệ ảnh
// map fraction ảnh -> screen y (dùng để canh nam châm / cổng theo thước trên ảnh)
const railFracY = (f) => RAIL_TOP + f * RAIL_H;
const Y0 = railFracY(0.045);                  // vị trí thả (đỉnh thước, sát đáy nam châm)
const SCALE_BOTTOM = railFracY(0.62);         // đáy vùng thước đọc được (trên khối kẹp)
const PXM_V = (SCALE_BOTTOM - Y0) / FREEFALL.s.max; // px mỗi mét sao cho s_max chạm đáy thước
const gateY = (s) => Y0 + s * PXM_V;
const Y_REST = FLOOR - 24;                    // trụ thép rơi hẳn xuống chân đế

const MODES = ["A", "B", "A+B", "A<->B", "T"];
const MODE_LABEL = { "A": "A", "B": "B", "A+B": "A+B", "A<->B": "A↔B", "T": "T" };
const MODE_ANGLE = { "A": -50, "B": -25, "A+B": 0, "A<->B": 25, "T": 50 };

const TOOLS = [
  { k: "rail",   name: "Máng đứng (có giá đỡ)", sub: "±1 mm · gồm chân đế", img: railPng },
  { k: "magnet", name: "Nam châm điện", sub: "giữ / thả trụ thép",  img: magnetSvg },
  { k: "switch", name: "Công tắc kép",  sub: "nối nam châm + đồng hồ", img: switchOnPng },
  { k: "gate",   name: "Cổng quang E",  sub: "±0.0003 s · kéo dọc", img: photogatePng },
  { k: "clock",  name: "Đồng hồ MC964", sub: "±0.001 s",            img: mc964FrontSvg },
];

const SLOW = 4;                                    // hoạt ảnh rơi chậm ×4 (đồng hồ vẫn đếm thời gian thật)
const REQ = { positions: 5, spread: 0.30 };       // ≥ 5 vị trí cổng, trải ≥ 30 cm
const SWING = { amp: 6, decay: 0.42, freq: 2.1 }; // trụ vừa gắn còn đung đưa (độ, s, Hz)

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const cm = (m) => `${(m * 100).toFixed(0)} cm`;
const posKey = (s) => Math.round(s * 100);
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const reducedMotion = () => document.hidden || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Gom các lần đo theo vị trí cổng quang (cm). */
function groupPositions(trials) {
  const map = new Map();
  trials.forEach((t) => {
    const key = posKey(t.s);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  });
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([key, items]) => {
    const tMean = mean(items.map((i) => i.t));
    const ts = items.map((i) => i.t);
    return { cm: key, s: key / 100, items, tMean, gMean: gFromMeasurement(key / 100, tMean), spreadMs: (Math.max(...ts) - Math.min(...ts)) * 1000 };
  });
}

// vị trí đồng hồ + ổ cắm (viewBox)
const CLK = { x: 600, y: 336 };
const CLK_SCALE = 0.72;
const SOCK = { A: 66, B: 114, C: 162 };
const socketPos = (s) => ({ x: CLK.x + SOCK[s] * CLK_SCALE, y: CLK.y + 52 * CLK_SCALE });
const SWITCH = { x: 96, y: 316 };            // hộp công tắc kép (góc trái dưới)
const SWITCH_W = 92, SWITCH_H = 66;
const switchPlugA = { x: SWITCH.x + SWITCH_W - 4, y: SWITCH.y + 34 };  // cổng phải → ổ A đồng hồ
const switchPlugMag = { x: SWITCH.x + 4, y: SWITCH.y + 34 };           // cổng trái → nam châm điện
// đầu nối trên nam châm điện (đích thả dây công tắc→nam châm) — ở BÊN TRÁI nam châm
const magnetTerm = { x: RAILX - 30, y: Y0 - 4 };

const zeroDisplay = (scale) => (0).toFixed((FREEFALL.scales[scale] || FREEFALL.scales.fine).dp);

export default function FreeFallBench({ assignedSets, onExportNote, onBack, onReplayPrelab, speak, muted, onToggleMute }) {
  // Mốc giáo viên giao (nếu có) là các quãng rơi BẮT BUỘC; ngoài ra học sinh đo tự do.
  const teacherTargets = useMemo(
    () => [...new Set((assignedSets?.freefall || []).map((item) => +Number(item.s).toFixed(2)).filter((v) => v > 0))].sort((a, b) => a - b),
    [assignedSets]
  );

  const [placed, setPlaced] = useState(() => new Set());
  const [s, setS] = useState(FREEFALL.s.default);       // quãng rơi (m)
  const [balanced, setBalanced] = useState(false);      // giá đỡ đã cân bằng (dây dọi)?
  const [magnetOn, setMagnetOn] = useState(true);       // nam châm đang giữ trụ thép
  const [rolling, setRolling] = useState(false);
  const [fallY, setFallY] = useState(Y0);               // vị trí trụ thép khi rơi
  const [cylDrag, setCylDrag] = useState(null);         // {x,y} khi HS kéo trụ thép lên gắn lại
  const [settled, setSettled] = useState(true);

  const [mode, setMode] = useState("A+B");              // trung tính — HS tự chỉnh núm
  const [scale, setScale] = useState("fine");
  const [power, setPower] = useState(false);
  const [face, setFace] = useState("front");
  const [wires, setWires] = useState({ A: null, B: null }); // A ← switch, B ← gate (ổ đồng hồ)
  const [magnetWire, setMagnetWire] = useState(false);      // dây công tắc kép → nam châm điện
  const [wireDrag, setWireDrag] = useState(null);

  const [led, setLed] = useState(zeroDisplay("fine"));
  const [trials, setTrials] = useState([]);
  const [lastRun, setLastRun] = useState(null);         // lần thả vừa xong (chưa ghi)
  const [liveFall, setLiveFall] = useState(null);       // điểm (t², quãng đã rơi) trượt trên đồ thị
  const [gateFlash, setGateFlash] = useState(0);        // tia cổng quang vừa bị cắt
  // Giá trị đổi từng khung hình khi trụ rơi — chỉ bàn thí nghiệm, số đồng hồ và đồ thị nghe.
  const anim = useAnimStore({ fallY: Y0, led: zeroDisplay("fine"), live: null, swing: 0 });
  const [quickArmed, setQuickArmed] = useState(false);
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [dragTool, setDragTool] = useState(null);
  const [flyTool, setFlyTool] = useState(null);
  const [justRolled, setJustRolled] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [viewportW, setViewportW] = useState(1280);
  const [sheetOpen, setSheetOpen] = useState(false); // sheet hướng dẫn + số liệu trên mobile
  const [zoomMode, setZoomMode] = useState("full"); // "full", "rail", "clock"
  const [controlsOpen, setControlsOpen] = useState(false);
  const rafRef = useRef(null);
  const swingRaf = useRef(null);
  const mainRef = useRef(null);
  const lastMeasurementRef = useRef(null);
  const toastTimer = useRef(null);
  const lastSpoken = useRef("");
  const milestones = useRef(new Set());
  const nextId = useRef(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
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

  const required = TOOLS.map((t) => t.k);
  const GROUPS = [["rail"], ["magnet"], ["switch", "gate"], ["clock"]];
  const reqSet = new Set(required);
  const activeGroup = GROUPS.find((g) => g.some((k) => reqSet.has(k) && !placed.has(k))) || [];
  const isNextTool = (k) => activeGroup.includes(k) && reqSet.has(k) && !placed.has(k);
  const assembled = required.every((k) => placed.has(k));

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(swingRaf.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  /** flash("chữ") hoặc flash({ text, kind: "win" | "warn" }). */
  const flash = (m, duration = 2600) => {
    const next = typeof m === "string" ? { text: m } : m;
    setToast((old) => ({ ...next, id: (old?.id || 0) + 1 }));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), duration);
  };
  const sound = (name) => { if (!muted) labSound[name]?.(); };

  // Mạch bài 11: công tắc→nam châm (magnetWire) + công tắc→ổ A + cổng quang→ổ B.
  const clockWired = wires.A === "switch" && wires.B === "gate";
  const wiredOK = magnetWire && clockWired;
  const modeOK = mode === "A<->B";
  const setupDone = assembled && balanced && wiredOK && power && modeOK;
  const zeroLed = zeroDisplay(scale);
  const isReset = led === zeroLed;

  /* ---------------- Số liệu: vị trí, "g của em", yêu cầu ---------------- */
  const groups = useMemo(() => groupPositions(trials), [trials]);
  const fit = useMemo(() => fitFreeFall(trials), [trials]);
  const spread = groups.length ? groups[groups.length - 1].s - groups[0].s : 0;
  const teacherMissing = teacherTargets.filter((ts) => !groups.some((g) => Math.abs(g.s - ts) < 0.005));
  const reqMet = groups.length >= REQ.positions && spread >= REQ.spread - 1e-9 && teacherMissing.length === 0;
  const quickUnlocked = trials.length >= 2;
  const currentGroup = groups.find((g) => g.cm === posKey(s));

  function placeTool(k) {
    if (placed.has(k)) return;
    if (!isNextTool(k)) { flash(`Lắp theo thứ tự — bước này: ${activeGroup.map((x) => TOOLS.find((t) => t.k === x)?.name).join(" / ")}.`); return; }
    setPlaced((p) => new Set(p).add(k));
  }
  function flyToPlace(k, x, y) {
    // Tab bị ẩn (rAF dừng) hoặc HS bật "giảm chuyển động" → lắp ngay, không bay.
    if (reducedMotion()) { placeTool(k); return; }
    const tgt = targetOf(k, s), dur = 340;
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
      const tgt = targetOf(k, s);
      if (!svg || !moved) { flyToPlace(k, tgt.x, tgt.y - 60); return; }

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
      const threshold = 100;
      if (Math.hypot(vbx - tgt.x, vby - tgt.y) < threshold) flyToPlace(k, vbx, vby);
      else flash(`Kéo "${TOOLS.find((t) => t.k === k).name}" vào ô sáng trên bàn để lắp.`);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function resetTimer() { cancelAnimationFrame(rafRef.current); lastMeasurementRef.current = null; setRolling(false); setLed(zeroDisplay(scale)); setJustRolled(false); setLastRun(null); setLiveFall(null); }

  /** Trụ vừa gắn vào nam châm thì đung đưa ~1,3 s rồi mới đứng yên. */
  function startSwing() {
    cancelAnimationFrame(swingRaf.current);
    if (reducedMotion()) { anim.set({ swing: 0 }); setSettled(true); return; }
    setSettled(false);
    let t0 = null;
    const loop = (now) => {
      if (t0 === null) t0 = now;
      const el = (now - t0) / 1000;
      if (el * 1000 >= FREEFALL.settleMs) { anim.set({ swing: 0 }); setSettled(true); return; }
      anim.set({ swing: SWING.amp * Math.exp(-el / SWING.decay) * Math.cos(2 * Math.PI * SWING.freq * el) });
      swingRaf.current = requestAnimationFrame(loop);
    };
    swingRaf.current = requestAnimationFrame(loop);
  }
  function magnetHold() {
    if (rolling) return;
    setMagnetOn(true); setFallY(Y0); setCylDrag(null);
    startSwing();
  }

  function release() {
    if (rolling) return;
    if (!magnetOn) { flash("Trụ thép đã rơi — kéo trụ lên gắn lại vào nam châm rồi mới thả tiếp."); return; }
    if (!assembled) { flash("Hãy lắp đủ dụng cụ (kể cả đồng hồ) trước khi thả."); return; }
    if (!balanced) { flash("Chưa cân bằng giá đỡ — vặn vít cho dây dọi thẳng đã."); return; }
    if (!power) { flash("Chưa bật nguồn đồng hồ (mặt sau)."); return; }
    if (!magnetWire) { flash("Chưa nối dây công tắc kép → nam châm điện."); return; }
    if (!clockWired) { flash("Chưa nối dây: công tắc→ổ A, cổng quang→ổ B."); return; }
    const steadyNow = settled;
    cancelAnimationFrame(swingRaf.current);
    anim.set({ swing: 0 }); setSettled(true);
    setMagnetOn(false);
    runFall(steadyNow);
  }

  function runFall(steadyNow) {
    const counts = mode === "A<->B";                  // chỉ MODE A↔B đo được thời gian rơi
    const res = computeFallTime({ s, balanced, steady: steadyNow, scale });
    const sc = FREEFALL.scales[scale];
    const base = parseFloat(led) || 0;                // CỘNG DỒN nếu HS chưa Reset (giống MC964 thật)
    const tMeas = res.raw;
    const finalShown = counts ? Math.round((base + tMeas) / sc.res) * sc.res : base;
    const delay = res.run.delay;
    const tauEnd = delay + Math.sqrt((2 * (Y_REST - Y0) / PXM_V) / FREEFALL.g);
    const config = { s, scale, mode, balanced, steady: steadyNow };
    lastMeasurementRef.current = null;
    setRolling(true); setJustRolled(false); setLastRun(null);
    anim.set({ fallY: Y0, led: base.toFixed(sc.dp), live: null });

    const finish = () => {
      anim.set({ fallY: Y_REST, led: finalShown.toFixed(sc.dp), live: counts ? { x: finalShown ** 2, y: s, done: true } : null });
      setFallY(Y_REST);
      setLed(finalShown.toFixed(sc.dp));
      setRolling(false);
      setJustRolled(counts);
      lastMeasurementRef.current = counts ? config : null;
      setLastRun(counts ? { s, t: finalShown, steady: steadyNow, accumulated: base > 0 } : null);
      setLiveFall(counts ? { x: finalShown ** 2, y: s, done: true } : null);
      if (!counts) flash({ text: `MODE ${MODE_LABEL[mode]} không đo được thời gian rơi — lật mặt trước, chọn MODE A↔B.`, kind: "warn" }, 3600);
    };
    if (reducedMotion()) { finish(); return; }

    let t0 = null;
    let stopped = false;
    const tick = (now) => {
      if (t0 === null) t0 = now;
      const tau = Math.min(tauEnd, (now - t0) / 1000 / SLOW);   // thời gian vật lý kể từ lúc ngắt nam châm
      const ft = Math.max(0, tau - delay);
      const fallen = 0.5 * FREEFALL.g * ft * ft;
      const frame = { fallY: Math.min(Y_REST, Y0 + fallen * PXM_V) };
      if (counts) {
        if (tau < tMeas) {
          frame.led = (base + tau).toFixed(sc.dp);
          frame.live = { x: tau ** 2, y: Math.min(fallen, s) };
        } else if (!stopped) {
          stopped = true;
          frame.led = finalShown.toFixed(sc.dp);
          frame.live = { x: finalShown ** 2, y: s, done: true };
          setGateFlash((n) => n + 1);
          sound("stop");
        }
      }
      anim.set(frame);
      if (tau < tauEnd) rafRef.current = requestAnimationFrame(tick);
      else finish();
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  // Mốc thành tích nhỏ — để việc lấy số liệu có "nhịp" và có điều để khám phá.
  function celebrate(next, trial) {
    const hit = (key) => { if (milestones.current.has(key)) return false; milestones.current.add(key); return true; };
    const gs = groupPositions(next);
    const f = fitFreeFall(next);
    const same = gs.find((g) => g.cm === posKey(trial.s));
    const spreadNext = gs.length ? gs[gs.length - 1].s - gs[0].s : 0;
    const metNext = gs.length >= REQ.positions && spreadNext >= REQ.spread - 1e-9
      && teacherTargets.every((ts) => gs.some((g) => Math.abs(g.s - ts) < 0.005));
    const msgs = [
      next.length === 1 && hit("first") && "📍 Lần đo đầu tiên đã lên đồ thị s–t²!",
      next.length === 2 && hit("quick") && "⚡ Em đã thạo quy trình — mở khóa nút “Đo nhanh”!",
      gs.length === 2 && hit("line") && "📈 Hai vị trí → đường thẳng qua gốc O đã hiện. Độ dốc của nó chính là g/2!",
      same.items.length === 3 && hit("repeat") && `🔁 Đo lặp 3 lần ở ${cm(same.s)}: t lệch nhau ${same.spreadMs.toFixed(0)} ms — đó là sai số ngẫu nhiên. Lấy trung bình cho chắc!`,
      !trial.steady && hit("unsteady") && "🌀 Lần này thả khi trụ còn đung đưa — điểm viền đỏ lệch khỏi đường thẳng. Xoá rồi đo lại nhé!",
      spreadNext >= 0.4 && hit("spread") && "🎯 Các điểm trải rộng ≥ 40 cm — đường thẳng rất chắc chắn.",
      metNext && hit("enough") && `✅ Đủ ${REQ.positions} vị trí: g ≈ ${f.g.toFixed(2)} m/s². Lưu vào Sổ Báo Cáo được rồi!`,
      metNext && Math.abs(f.g - FREEFALL.g) / FREEFALL.g < 0.01 && hit("close") && "🏆 g của em lệch dưới 1% so với 9,80 m/s² — chuẩn như phòng thí nghiệm!",
    ].filter(Boolean);
    if (msgs.length) { flash({ text: msgs[msgs.length - 1], kind: "win" }, 4400); sound("win"); }
    else { flash(`Đã ghi: s = ${cm(trial.s)} · t = ${trial.t.toFixed(3)} s → g = ${trial.g.toFixed(2)} m/s²`); sound("record"); }
  }

  function recordTrial() {
    if (rolling) return;
    if (!justRolled || !lastRun) { flash("Mỗi lượt thả chỉ ghi một lần — gắn trụ, Reset rồi thả lại."); return; }
    if (lastRun.accumulated) {
      flash({ text: "Số trên đồng hồ đã CỘNG DỒN lần đo trước (quên Reset trước khi thả). Bỏ lần này: Reset rồi đo lại.", kind: "warn" }, 4200);
      sound("warn");
      setJustRolled(false);
      return;
    }
    const cfg = lastMeasurementRef.current;
    if (!cfg || Math.abs(cfg.s - s) >= 0.005 || cfg.scale !== scale || cfg.mode !== mode || cfg.balanced !== balanced) {
      flash("Quãng rơi đã đổi sau phép đo — hãy đo lại trước khi ghi.");
      setJustRolled(false);
      return;
    }
    const t = parseFloat(led);
    const trial = { id: nextId.current++, lab: "freefall", s: +cfg.s.toFixed(3), t, g: gFromMeasurement(cfg.s, t), balanced: cfg.balanced, steady: cfg.steady };
    const next = [...trials, trial];
    setTrials(next);
    lastMeasurementRef.current = null;
    setJustRolled(false);
    setLiveFall(null);
    celebrate(next, trial);
  }
  /** Bỏ lần vừa thả (không ghi) — như bấm Reset. */
  function discardRun() { resetTimer(); flash("Đã bỏ lần đo vừa rồi."); }
  function removeTrial(id) { setTrials((old) => old.filter((t) => t.id !== id)); }

  /** ⚡ Đo nhanh: tự gắn trụ, Reset, chờ trụ đứng yên rồi thả (mở khóa sau 2 lần đo tay). */
  function quickMeasure() {
    if (!quickUnlocked || rolling || justRolled || quickArmed) return;
    if (!setupDone) { flash("Hoàn tất thiết lập trước khi đo nhanh."); return; }
    resetTimer();
    if (!magnetOn) magnetHold();
    setQuickArmed(true);
  }
  useEffect(() => {
    if (!quickArmed || rolling || !magnetOn || !settled) return;
    const id = setTimeout(() => { setQuickArmed(false); release(); }, 160);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickArmed, rolling, magnetOn, settled]);

  function saveTrials() { onExportNote?.({ lab: "freefall", trials }); }
  function exportNote() {
    if (!trials.length) { flash("Chưa có số liệu để lưu."); return; }
    if (reqMet) { saveTrials(); return; }
    setDialog({
      title: "Chưa đủ số liệu — vẫn lưu?",
      message: `Mới đo ${groups.length}/${REQ.positions} vị trí, trải ${cm(spread)}/${cm(REQ.spread)}${teacherMissing.length ? `, còn thiếu mốc GV ${teacherMissing.map(cm).join(", ")}` : ""}. Có thể lưu bây giờ và đo bổ sung sau.`,
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

  // "Làm giúp bước này" — cứu học sinh khi bị kẹt ở một bước lắp/thiết lập.
  function runAssistantAction(payload) {
    if (payload === "auto_place_next") {
      const next = activeGroup.find((k) => reqSet.has(k) && !placed.has(k));
      if (next) {
        placeTool(next);
        flash(`Đã tự động lắp: ${TOOLS.find((t) => t.k === next)?.name || next}`);
      } else {
        flash("Các dụng cụ chính đã được lắp.");
      }
      return;
    }
    if (payload === "auto_reset_object") {
      if (!assembled || !placed.has("magnet")) {
        flash("Cần lắp nam châm điện trước khi gắn lại trụ thép.");
        return;
      }
      magnetHold();
      flash("Đã gắn trụ thép lại vào nam châm.");
      return;
    }
    if (payload === "auto_wire") {
      if (!placed.has("clock") || !placed.has("gate") || !placed.has("switch") || !placed.has("magnet")) {
        flash("Cần lắp đủ đồng hồ, công tắc, nam châm và cổng quang trước khi tự động nối dây.");
        return;
      }
      setFace("back");
      setMagnetWire(true);
      setWires({ A: "switch", B: "gate" });
      flash("Đã nối: công tắc→NC, công tắc→A, cổng quang→B");
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
      if (!placed.has("clock")) {
        flash("Chưa lắp đồng hồ nên chưa thể chọn MODE.");
        return;
      }
      setFace("front");
      setMode("A<->B");
      flash("Đã chọn MODE A↔B");
      return;
    }
    if (payload === "auto_fix_screw") {
      if (!placed.has("rail")) {
        flash("Cần lắp máng đứng trước khi cố định vít.");
        return;
      }
      setBalanced(true);
      flash("Đã cố định vít cân bằng giá đỡ.");
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

  const evVB = (e, el) => { const svg = el.closest("svg"); const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * VBW, y: (e.clientY - r.top) / r.height * VBH, svg }; };

  // kéo cổng quang dọc máng -> đổi s
  const dragGate = useCallback((e) => {
    if (rolling) return; e.stopPropagation();
    const { svg } = evVB(e, e.currentTarget);
    const move = (ev) => { const p = evVB(ev, svg); setS(clamp(+((p.y - Y0) / PXM_V).toFixed(2), FREEFALL.s.min, FREEFALL.s.max)); };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }, [rolling]);

  // kéo trụ thép (đã rơi xuống chân đế) lên gắn lại vào nam châm điện
  const dragCyl = (e) => {
    if (rolling || magnetOn) return; e.stopPropagation();
    const startX = e.clientX, startY = e.clientY, startTime = e.timeStamp;
    const { svg } = evVB(e, e.currentTarget);
    const move = (ev) => { const p = evVB(ev, svg); setCylDrag({ x: p.x, y: p.y }); };
    const up = (ev) => {
      const isClick = Math.hypot(ev.clientX - startX, ev.clientY - startY) < 10 && (ev.timeStamp - startTime) < 300;
      if (isMobile && isClick) {
        magnetHold();
        flash("Đã gắn trụ thép lại vào nam châm");
      } else {
        const p = evVB(ev, svg);
        if (Math.hypot(p.x - RAILX, p.y - Y0) < 64) magnetHold();
        setCylDrag(null);
      }
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  // kéo dây: cầm đầu dây rồi thả vào đích.
  //  - src "switch"/"gate" -> thả vào ổ A/B (mặt sau đồng hồ)
  //  - src "switchMag"     -> thả vào đầu nối nam châm điện (ở scene, không lật đồng hồ)
  const dragWire = useCallback((src, e) => {
    e.stopPropagation();
    if (src !== "switchMag") setFace("back");
    const startX = e.clientX, startY = e.clientY, startTime = Date.now();
    const { svg } = evVB(e, e.currentTarget);
    const move = (ev) => { const p = evVB(ev, svg); setWireDrag({ src, x: p.x, y: p.y }); };
    const up = (ev) => {
      const isClick = Math.hypot(ev.clientX - startX, ev.clientY - startY) < 10 && (Date.now() - startTime) < 300;
      if (isMobile && isClick) {
        if (src === "switchMag") {
          setMagnetWire((prev) => !prev);
        } else if (src === "switch") {
          setWires((w) => ({ ...w, A: w.A === "switch" ? null : "switch" }));
        } else if (src === "gate") {
          setWires((w) => ({ ...w, B: w.B === "gate" ? null : "gate" }));
        }
      } else {
        const p = evVB(ev, svg);
        if (src === "switchMag") {
          if (Math.hypot(p.x - magnetTerm.x, p.y - magnetTerm.y) < 34) setMagnetWire(true);
        } else {
          const socks = { A: socketPos("A"), B: socketPos("B") };
          let hit = null;
          for (const so of ["A", "B"]) if (Math.hypot(p.x - socks[so].x, p.y - socks[so].y) < 26) hit = so;
          if (hit) setWires((w) => { const nw = { A: w.A === src ? null : w.A, B: w.B === src ? null : w.B }; nw[hit] = src; return nw; });
        }
      }
      setWireDrag(null);
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }, [isMobile]);
  const unplug = (sock) => setWires((w) => ({ ...w, [sock]: null }));

  /* ======================= BƯỚC TIẾP THEO (một nguồn sự thật) ======================= */
  const cylAtBottom = !magnetOn && !rolling && fallY > Y0;
  const onTeacherTarget = teacherMissing.some((ts) => Math.abs(ts - s) < 0.005);
  const nextToolNames = activeGroup
    .filter((k) => reqSet.has(k) && !placed.has(k))
    .map((k) => TOOLS.find((t) => t.k === k)?.name)
    .filter(Boolean);
  // Gợi ý vị trí mới cách xa các vị trí đã đo nhất.
  const suggestS = (() => {
    if (!groups.length) return null;
    let best = null;
    for (let v = 20; v <= 80; v += 5) {
      const d = Math.min(...groups.map((g) => Math.abs(g.cm - v)));
      if (!best || d > best.d) best = { v, d };
    }
    return best && best.d >= 5 ? best.v / 100 : null;
  })();
  const liveG = lastRun ? gFromMeasurement(lastRun.s, lastRun.t) : null;

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
    next = { key: "balance", title: "Cân bằng giá đỡ", hint: "Bấm con vít vàng ở khối kẹp chân máng để dây dọi thẳng đứng — vít chuyển xanh là xong.", assist: "auto_fix_screw" };
  } else if (!magnetWire) {
    next = {
      key: "wireMag",
      title: "Nối dây công tắc kép → nam châm",
      hint: isMobile ? "Chạm chốt tím bên trái hộp công tắc kép để nối tới nam châm điện." : "Kéo chốt tím bên trái hộp công tắc kép thả vào đầu nối NC cạnh nam châm điện.",
      assist: "auto_wire",
    };
  } else if (!clockWired) {
    next = {
      key: "wire",
      title: "Nối dây vào đồng hồ: công tắc → A, cổng quang → B",
      hint: isMobile
        ? "Chạm chốt xanh bên phải công tắc (→ ổ A) và chốt đỏ của cổng quang (→ ổ B)."
        : "Kéo chốt xanh bên phải công tắc vào ổ A, chốt đỏ của cổng quang vào ổ B ở mặt sau đồng hồ.",
      assist: "auto_wire",
    };
  } else if (!power) {
    next = { key: "power", title: "Bật nguồn đồng hồ MC964", hint: "Ở mặt sau đồng hồ, bấm công tắc nguồn để chuyển sang I (màu xanh).", assist: "auto_power" };
  } else if (!modeOK) {
    next = { key: "mode", title: "Chọn MODE A↔B", hint: "Lật về mặt trước đồng hồ, bấm núm MODE tới nấc A↔B (từ lúc thả đến lúc trụ qua cổng).", assist: "auto_mode" };
  } else if (rolling) {
    next = { key: "rolling", title: "Đang đo… (chiếu chậm ×4)", hint: "Đồng hồ đếm từ lúc ngắt nam châm và dừng đúng lúc trụ thép cắt tia cổng quang." };
  } else if (justRolled && lastRun) {
    next = lastRun.accumulated
      ? { key: "record", title: "Số đo bị cộng dồn!", hint: `Đồng hồ hiện ${led} s vì chưa Reset trước khi thả. Bấm “Bỏ lần này” (Reset) rồi đo lại.`, assist: "auto_reset" }
      : {
          key: "record",
          title: "Ghi số liệu vừa đo",
          hint: `t = ${led} s → g = ${liveG.toFixed(2)} m/s².${lastRun.steady ? "" : " ⚠ Trụ còn đung đưa lúc thả — số đo dễ lệch, nên bỏ lần này."}`,
          primaryLabel: "Ghi số liệu",
        };
  } else if (reqMet) {
    next = { key: "done", title: "Đã đủ số liệu — g của em đã rõ", hint: "Lưu vào Sổ Báo Cáo để vẽ đồ thị s–t² và lập báo cáo. Muốn g chính xác hơn thì đo thêm.", primaryLabel: "Lưu vào Sổ Báo Cáo", primaryShort: "Lưu" };
  } else if (cylAtBottom) {
    next = {
      key: "cylback",
      title: "Gắn trụ thép lên nam châm",
      hint: isMobile ? "Chạm vào trụ thép ở chân đế để gắn lại lên nam châm." : "Kéo trụ thép ở chân đế thả lại vào nam châm điện ở đỉnh máng.",
      assist: "auto_reset_object",
    };
  } else if (!isReset) {
    next = { key: "reset", title: "Reset đồng hồ về 0", hint: "Bấm nút Reset đỏ ở mặt trước đồng hồ trước mỗi lần thả — nếu không, số đo sẽ cộng dồn.", assist: "auto_reset" };
  } else if (!settled) {
    next = { key: "settle", title: "Chờ trụ thép đứng yên…", hint: "Trụ vừa gắn còn đung đưa. Thả lúc này trụ dễ xoay, quệt vào cổng quang → t lệch. Đợi khoảng 1 giây." };
  } else if (teacherMissing.length && !onTeacherTarget) {
    next = {
      key: "config",
      title: `Đặt s = ${cm(teacherMissing[0])} (mốc giáo viên)`,
      hint: isMobile ? "Mở nút điều chỉnh ở cạnh phải bàn để tăng/giảm s từng cm." : "Kéo cổng quang dọc máng tới đúng vạch, hoặc bấm chip mốc trong bảng Điều khiển.",
    };
  } else {
    const n = currentGroup?.items.length || 0;
    next = {
      key: "release",
      title: `Thả trụ thép ở s = ${cm(s)}${n ? ` (lần ${n + 1})` : ""}`,
      hint: n
        ? `Vị trí này đã đo ${n} lần — đo lặp giúp thấy sai số ngẫu nhiên.${suggestS ? ` Vị trí mới gợi ý: ${cm(suggestS)}.` : ""} Còn ${Math.max(0, REQ.positions - groups.length)} vị trí nữa.`
        : `Bấm hộp công tắc kép để thả. Đã đo ${groups.length}/${REQ.positions} vị trí (trải ≥ ${cm(REQ.spread)}).`,
    };
  }
  const phase = !assembled ? 0 : !setupDone ? 1 : !reqMet ? 2 : 3;
  // Nút chính của bước hiện tại: ghi số liệu vừa đo, hoặc lưu sang Sổ Báo Cáo khi đã đo đủ.
  const handlePrimary = () => (next.key === "record" ? recordTrial() : exportNote());
  const speechText = `${next.title}. ${next.hint || ""}`.trim();
  const speechKey = `${next.key}|${next.key === "release" ? "" : next.title}`;

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
    else if (["wireMag", "config", "release", "cylback", "reset", "rolling", "record"].includes(next.key)) target = "full";
    if (!target) return;
    const timer = setTimeout(() => setZoomMode(target), 0);
    return () => clearTimeout(timer);
  }, [assembled, isMobile, next.key]);

  /* ============================ GIAO DIỆN ============================ */
  const setupItems = [
    { key: "balance", text: "Cân bằng giá đỡ (dây dọi thẳng đứng)", done: balanced },
    { key: "wireMag", text: "Nối dây công tắc kép → nam châm", done: magnetWire },
    { key: "wire", text: "Nối công tắc → ổ A, cổng quang → ổ B", done: clockWired },
    { key: "power", text: "Bật nguồn đồng hồ (mặt sau)", done: power },
    { key: "mode", text: "Chọn MODE A↔B (mặt trước)", done: modeOK },
  ];
  const placedCount = required.filter((k) => placed.has(k)).length;
  const fixed = scale === "fine" ? 3 : 2;

  /* "g của em" — ước lượng từ đồ thị, sai số co lại khi đo thêm */
  const gDev = fit ? (fit.g - FREEFALL.g) / FREEFALL.g : 0;
  const hasLine = Boolean(fit) && groups.length >= 2;
  const gTip = !hasLine ? null
    : trials.some((t) => !t.steady) ? "Điểm viền đỏ (thả khi trụ còn đung đưa) kéo lệch g — xoá rồi đo lại."
      : gDev < -0.004 ? "💡 g hơi nhỏ hơn 9,80 vì nam châm còn từ dư: trụ rời chậm ~1 ms nên t hơi lớn. Đo ở s lớn thì ảnh hưởng nhỏ hơn."
        : null;
  const canRecord = justRolled && !rolling && lastRun && !lastRun.accumulated;

  /* Thẻ ĐO: số trên đồng hồ + kết quả tính ngay + tiến độ (viên nhỏ) + nút phụ — gọn, không cần cuộn */
  const measureCard = (
    <section style={{ ...panelCard, padding: 10, border: `1.5px solid ${canRecord ? `${C.orange}88` : C.line}`, background: canRecord ? "#FFF8F0" : "#fff" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={miniLabel}>Đồng hồ MC964</div>
          <div style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 900, color: canRecord ? C.orangeDk : C.ink, lineHeight: 1.1 }}>
            <AnimLed anim={anim} rolling={rolling} led={led} /><span style={{ fontSize: 12, color: C.sub, marginLeft: 3, fontFamily: FONT }}>s</span>
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 0 }}>
          <div style={miniLabel}>{justRolled && lastRun ? `Lần này · s = ${cm(lastRun.s)}` : "g của em (đồ thị)"}</div>
          <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 900, lineHeight: 1.15, whiteSpace: "nowrap", color: justRolled && lastRun?.accumulated ? "#B91C1C" : C.navy }}>
            {justRolled && lastRun
              ? (lastRun.accumulated ? "cộng dồn!" : `g = ${liveG.toFixed(2)}`)
              : hasLine ? `${fit.g.toFixed(2)}${fit.sigma != null ? ` ±${Math.max(0.01, fit.sigma).toFixed(2)}` : ""}` : "—"}
          </div>
          {!justRolled && hasLine && (
            <div style={{ fontSize: 10.5, fontWeight: 900, color: Math.abs(gDev) < 0.01 ? C.good : C.orangeDk }}>{gDev >= 0 ? "+" : ""}{(gDev * 100).toFixed(1)}% so với 9,80</div>
          )}
          {justRolled && lastRun && !lastRun.steady && !lastRun.accumulated && <div style={{ fontSize: 10.5, fontWeight: 900, color: "#B91C1C" }}>⚠ trụ còn đung đưa</div>}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <ProgressPills items={[
          { key: "pos", label: "Vị trí ", value: `${groups.length}/${REQ.positions}`, done: groups.length >= REQ.positions, current: groups.length < REQ.positions },
          { key: "spread", label: "Trải ", value: `${Math.round(spread * 100)}/${Math.round(REQ.spread * 100)} cm`, done: spread >= REQ.spread - 1e-9 },
          ...(teacherTargets.length
            ? [{ key: "gv", label: "Mốc GV ", value: `${teacherTargets.length - teacherMissing.length}/${teacherTargets.length}`, done: !teacherMissing.length, title: `Giáo viên giao: ${teacherTargets.map(cm).join(", ")}` }]
            : []),
        ]} />
      </div>
      {gTip && !justRolled && <div style={{ fontSize: 11, color: "#6b6258", fontWeight: 700, lineHeight: 1.4, marginTop: 7 }}>{gTip}</div>}
      {setupDone && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          {justRolled ? (
            <button type="button" onClick={discardRun} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 11.5, borderColor: C.line, color: C.sub }}>Bỏ lần này</button>
          ) : quickUnlocked ? (
            <button type="button" onClick={quickMeasure} disabled={rolling || quickArmed} title="Tự gắn trụ, Reset, chờ trụ đứng yên rồi thả"
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
    <section style={{ ...panelCard, padding: 10 }}>
      <NudgeSlider
        label="Cổng quang"
        valueText={`s = ${cm(s)}`}
        value={s}
        min={FREEFALL.s.min}
        max={FREEFALL.s.max}
        step={0.01}
        disabled={rolling}
        ariaLabel="Quãng rơi s (m)"
        nudges={[{ label: "−1", delta: -0.01 }, { label: "+1", delta: 0.01 }]}
        onChange={(v, isDelta) => setS((old) => clamp(+(isDelta ? old + v : v).toFixed(2), FREEFALL.s.min, FREEFALL.s.max))}
        extra={(teacherTargets.length > 0 || suggestS) ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7, alignItems: "center" }}>
            {teacherTargets.length > 0 && <span style={{ fontSize: 10.5, fontWeight: 900, color: C.navy }}>Mốc GV:</span>}
            {teacherTargets.map((ts) => {
              const done = groups.some((g) => Math.abs(g.s - ts) < 0.005);
              return <button type="button" key={ts} disabled={rolling} onClick={() => setS(ts)} style={{ ...choiceButton, ...(done ? { color: C.good, borderColor: `${C.good}88` } : {}) }}>{done ? "✓ " : ""}{cm(ts)}</button>;
            })}
            {!teacherTargets.length && suggestS && (
              <button type="button" disabled={rolling} onClick={() => setS(suggestS)} style={{ ...choiceButton, color: C.orangeDk, borderColor: `${C.orange}66` }}>Vị trí mới gợi ý: {cm(suggestS)}</button>
            )}
          </div>
        ) : null}
      />
    </section>
  );

  /* Số liệu gọn: mỗi vị trí một dòng — các lần đo là "viên" nhỏ (bấm × để xoá) */
  const dataCard = (
    <section style={{ ...panelCard, padding: 10, flexShrink: 1, minHeight: 96, display: "flex", flexDirection: "column" }}>
      <div style={{ ...sectionHead, marginBottom: 6 }}>
        <span style={sectionTitle}>Số liệu · {trials.length} lần · {groups.length} vị trí</span>
        {trials.length > 0 && <button type="button" onClick={clearTrials} style={linkBtn}>Xóa hết</button>}
      </div>
      <div data-lab-scroll style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {groups.map((g) => (
          <div key={g.cm} style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 8, fontSize: 11.5, background: g.cm === posKey(s) ? "#FFF6EC" : C.bg }}>
            <b style={{ color: C.ink }}>{g.cm} cm</b>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 3, minWidth: 0 }}>
              {g.items.map((t) => (
                <span key={t.id} style={{ ...chip, borderColor: t.steady ? C.line : "#FCA5A5", color: t.steady ? C.ink : "#B91C1C" }} title={`g = ${t.g.toFixed(2)} m/s²`}>
                  {t.t.toFixed(fixed)}
                  <button type="button" onClick={() => removeTrial(t.id)} aria-label={`Xoá lần đo t = ${t.t.toFixed(fixed)} s ở s = ${g.cm} cm`} style={chipX}>×</button>
                </span>
              ))}
            </span>
            <span style={{ whiteSpace: "nowrap", color: C.sub, fontWeight: 800 }} title={`t̄ = ${g.tMean.toFixed(4)} s`}>g <b style={{ color: C.navy }}>{g.gMean.toFixed(2)}</b></span>
          </div>
        ))}
        {!trials.length && <div style={{ fontSize: 12, color: C.sub, fontStyle: "italic", padding: "2px 2px 4px" }}>Chưa có lần đo — thả trụ thép rồi bấm Ghi.</div>}
      </div>
    </section>
  );

  /* Đồ thị s–t² trực tiếp */
  const tsq = trials.map((t) => t.t ** 2);
  const xRange = niceRange([0, ...tsq, liveFall?.x ?? 0, fit ? (2 * s) / fit.g : 0, ((2 * s) / FREEFALL.g) * 1.06, 0.16], { min: 0, pad: 0.1 });
  const kFit = fit ? fit.g / 2 : 0;
  const xFitEnd = tsq.length ? Math.max(...tsq) : 0;
  const graphSeries = [{
    id: "ff",
    color: C.navy,
    points: trials.map((t) => ({ x: t.t ** 2, y: t.s, key: t.id, warn: !t.steady })),
    lines: hasLine
      ? [{ x1: 0, y1: 0, x2: xFitEnd, y2: kFit * xFitEnd }, { x1: xFitEnd, y1: kFit * xFitEnd, x2: xRange.max, y2: kFit * xRange.max, dashed: true }]
      : [],
    tags: hasLine ? [{ x: xFitEnd * 0.55, y: kFit * xFitEnd * 0.55, text: `g ≈ ${fit.g.toFixed(2)} m/s²`, pill: true, dy: -18 }] : [],
  }];
  const graphLive = liveFall && justRolled ? { x: liveFall.x, y: liveFall.y, color: C.orange, label: `t = ${led} s` } : null;
  const graphGhost = hasLine && !rolling && !justRolled && setupDone && !currentGroup
    ? { x: (2 * s) / fit.g, y: s, label: `dự đoán ở ${cm(s)}` }
    : null;
  const renderGraph = (compact, tall = false) => (
    <LiveFallGraph
      anim={anim}
      rolling={rolling}
      x={{ label: "t² (s²)", min: xRange.min, max: xRange.max, ticks: xRange.ticks, fmt: (v) => v.toFixed(2) }}
      y={{ label: "s (m)", min: 0, max: 0.9, ticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], fmt: (v) => v.toFixed(1) }}
      series={graphSeries}
      guides={setupDone ? [{ axis: "y", value: s, color: C.orangeDk, label: `cổng quang: s = ${cm(s)}` }] : []}
      live={graphLive}
      ghost={graphGhost}
      legend={false}
      empty="Thả trụ thép — điểm (t², s) sẽ trượt lên đồ thị."
      compact={compact}
      tall={tall}
      ariaLabel="Đồ thị quãng rơi s theo bình phương thời gian t²"
    />
  );
  const stageGraph = (
    <section style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 15, padding: "8px 10px 2px", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <b style={{ fontSize: 13, color: C.ink, whiteSpace: "nowrap" }}>Đồ thị s–t² trực tiếp</b>
        <span style={{ fontSize: 11.5, color: C.sub, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {hasLine ? `Đường thẳng qua O: độ dốc = g/2 → g ≈ ${fit.g.toFixed(2)} m/s²` : "Mỗi lần ghi là một điểm; đủ 2 vị trí sẽ hiện đường thẳng."}
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
  const finishButton = <FinishButton count={trials.length} allDone={reqMet} onFinish={exportNote} />;
  const showTray = !assembled;
  // Điện thoại dọc: bàn (đúng tỉ lệ) ở trên, đồ thị bên dưới, sheet hướng dẫn ở đáy.
  const portraitStack = isMobile && isPortrait;
  const sceneAspect = zoomMode === "clock" ? 190 / 330 : zoomMode === "rail" ? 440 / 500 : 540 / 645;
  const sceneH = Math.round(Math.max(140, viewportW - (showTray ? 92 : 0) - 8) * sceneAspect);
  const showStageGraph = measuring && (!isMobile || isPortrait);

  return (
    <div className="phy-screen" data-lab-engine="freefall" style={{ flex: 1, minHeight: 0, overflow: "hidden", background: C.bg, fontFamily: FONT, display: "flex", flexDirection: "column" }}>
      <LabTopBar
        isMobile={isMobile}
        isPortrait={isPortrait}
        title="Bài 11 — Đo gia tốc rơi tự do"
        shortTitle="Bài 11 · Rơi tự do"
        onExit={handleExit}
        onPrelab={onReplayPrelab}
        muted={muted}
        onToggleMute={speak ? onToggleMute : null}
        meta={fit && groups.length >= 2 ? <>g của em ≈ <b style={{ color: C.navy }}>{fit.g.toFixed(2)} m/s²</b></> : <>g chuẩn = <b style={{ color: C.ink }}>9,80 m/s²</b></>}
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
                      const target = targetOf(t.k, s);
                      flyToPlace(t.k, target.x, target.y - 60);
                    }
                  }}
                  style={{ display: "flex", flexDirection: isMobile && isPortrait ? "column" : "row", alignItems: "center", gap: isMobile ? (isPortrait ? 2 : 6) : 9, padding: isMobile ? (isPortrait ? "5px 3px" : "4px 5px") : "8px 10px", borderRadius: 10, marginBottom: isMobile ? 0 : 6, cursor: done ? "default" : (isMobile ? "pointer" : "grab"), touchAction: isMobile ? "manipulation" : "none", flexShrink: 0, minWidth: 0, width: "100%",
                    border: `1.5px solid ${done ? C.good : isNext ? C.orange : C.line}`, background: done ? "#F3F8F3" : "#fff", opacity: done ? 0.7 : isNext ? 1 : 0.62, boxShadow: isNext ? `0 0 0 3px ${C.orange}22` : "none" }}>
                  <div style={{ width: isMobile ? 24 : 44, height: isMobile ? 24 : 44, display: "grid", placeItems: "center", background: C.bg, borderRadius: 8, flexShrink: 0 }}>
                    <img src={t.img} alt="" style={{ maxWidth: isMobile ? 18 : 34, maxHeight: isMobile ? 18 : 34, objectFit: "contain" }} />
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
            <FallScene
              anim={anim}
              placed={placed} s={s} balanced={balanced} magnetOn={magnetOn} rolling={rolling} fallY={fallY} cylDrag={cylDrag} settled={settled}
              wires={wires} magnetWire={magnetWire} wireDrag={wireDrag} face={face} led={led} mode={mode} scale={scale} power={power}
              dropTarget={!assembled ? activeGroup.filter((k) => reqSet.has(k) && !placed.has(k)) : []} flyTool={flyTool} gateFlash={gateFlash}
              onDragGate={dragGate} onDragCyl={dragCyl} onDragWire={dragWire} onUnplug={unplug}
              onRelease={() => (magnetOn ? release() : flash("Trụ thép đã rơi — kéo trụ thép lên gắn lại vào nam châm rồi mới thả tiếp."))}
              onToggleBalance={() => setBalanced((b) => !b)}
              onFlip={() => setFace((f) => (f === "front" ? "back" : "front"))}
              onCycleMode={() => setMode((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length])}
              onReset={resetTimer} onToggleScale={() => setScale((sc) => (sc === "fine" ? "coarse" : "fine"))}
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
                  onClick={() => { setBalanced(true); flash("Đã cố định vít cân bằng giá đỡ."); }}
                  disabled={!placed.has("rail")}
                  style={{ border: `1px solid ${balanced ? C.good : C.orange}`, background: balanced ? "#F3F8F3" : "#FFF7EF", color: balanced ? C.good : C.orangeDk, borderRadius: 12, padding: "9px 10px", fontSize: 11.5, fontWeight: 900, opacity: placed.has("rail") ? 1 : 0.45 }}
                >
                  {balanced ? "✓ Giá đỡ đã cân bằng" : "Cố định vít cân bằng"}
                </button>
                <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 8, background: C.bg }}>
                  <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 900, marginBottom: 6 }}>Cổng quang · s = {cm(s)}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {[-5, -1, 1, 5].map((d) => (
                      <button key={d} type="button" disabled={!placed.has("gate") || rolling} onClick={() => setS((v) => clamp(+(v + d / 100).toFixed(2), FREEFALL.s.min, FREEFALL.s.max))} style={mobileAdjustBtn}>{d > 0 ? `+${d}` : `−${-d}`}</button>
                    ))}
                  </div>
                </div>
                {(teacherMissing[0] || suggestS) && (
                  <button type="button" disabled={rolling} onClick={() => setS(teacherMissing[0] ?? suggestS)} style={{ ...mobileAdjustBtn, width: "100%" }}>
                    {teacherMissing[0] ? `Tới mốc GV: ${cm(teacherMissing[0])}` : `Vị trí mới gợi ý: ${cm(suggestS)}`}
                  </button>
                )}
              </div>
            </div>
          )}
          <LabToast toast={toast} fixed />
          <LabDialog dialog={dialog} onClose={() => setDialog(null)} />
        </main>
        {/* Mapped pre-rendered dragging images to ensure instant decodes and no-lag display */}
        {TOOLS.map((t) => (
          <img
            key={`drag-cache-${t.k}`}
            src={t.img}
            alt=""
            style={{
              position: "fixed",
              left: dragTool && dragTool.k === t.k ? dragTool.x - 22 : -999,
              top: dragTool && dragTool.k === t.k ? (isMobile ? dragTool.y - 70 : dragTool.y - 22) : -999,
              width: 44,
              height: 44,
              objectFit: "contain",
              pointerEvents: "none",
              zIndex: 60,
              opacity: dragTool && dragTool.k === t.k ? 0.92 : 0,
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,.3))"
            }}
          />
        ))}

        {/* PHẢI (desktop) / SHEET (mobile): bước tiếp theo · số liệu · g của em · điều khiển */}
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

/* ============================ FallScene ============================ */
function FallScene(props) {
  const { anim, placed, s, balanced, magnetOn, rolling, fallY: fallYState, cylDrag, settled = true, wires, magnetWire, wireDrag, face, led: ledState, mode, scale, power,
    dropTarget = [], flyTool = null, gateFlash = 0, onDragGate, onDragCyl, onDragWire, onUnplug,
    onRelease, onToggleBalance, onFlip, onCycleMode, onReset, onToggleScale, onTogglePower, onCanvasTap,
    zoomMode, setZoomMode, highlightStep } = props;

  const zoomClock = zoomMode === "clock";
  const setZoomClock = (val) => setZoomMode(val ? "clock" : "full");
  // Khi trụ đang rơi: đọc vị trí / số đồng hồ từ kho hoạt ảnh (chỉ bàn này vẽ lại mỗi khung hình).
  const liveAnim = useAnim(anim);
  const fallY = rolling ? liveAnim.fallY : fallYState;
  const led = rolling ? liveAnim.led : ledState;
  const swingDeg = liveAnim.swing || 0;
  const has = (k) => placed.has(k);
  const yGate = gateY(s);
  const cylY = magnetOn && !rolling ? Y0 : fallY;
  const cylGrab = !magnetOn && !rolling;                 // trụ đã rơi -> HS kéo lên gắn lại
  const crossing = rolling && cylY + 22 >= yGate && cylY <= yGate + 4; // trụ đang cắt tia

  const viewBoxStr = props.isMobile
    ? (zoomMode === "clock" ? "540 290 330 190" :
       zoomMode === "rail" ? "200 40 500 440" :
       "55 25 645 540")
    : (zoomMode === "clock" ? "540 290 330 190" :
       zoomMode === "rail" ? "200 40 500 440" :
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
        <rect x="0" y={FLOOR} width={VBW} height={VBH - FLOOR} fill="#F1E7D3" />
        <line x1="0" y1={FLOOR} x2={VBW} y2={FLOOR} stroke="#E1D3B6" strokeWidth="2" />

        {/* Máng đứng — rail.png đã gồm CẢ giá đỡ 3 chân (chân kiềng chạm sàn) */}
        {has("rail") && <image href={railPng} x={RAILX - RAIL_W / 2} y={RAIL_TOP} width={RAIL_W} height={RAIL_H} preserveAspectRatio="xMidYMid meet" />}

        {/* Dây dọi + vít cân bằng (bấm vào con vít vàng ở khối kẹp để cân bằng) */}
        {has("rail") && (
          <g>
            <line x1={RAILX + 40} y1={Y0 + 10} x2={RAILX + 40 + (balanced ? 0 : 7)} y2={Y0 + 96} stroke={balanced ? C.good : "#c9a227"} strokeWidth="1.2" strokeDasharray={balanced ? "none" : "3 3"} />
            <circle cx={RAILX + 40 + (balanced ? 0 : 7)} cy={Y0 + 96} r="4" fill={balanced ? C.good : "#c9a227"} />
            <circle cx={RAILX - RAIL_W * 0.30} cy={railFracY(0.685)} r="7" fill={balanced ? C.good : "#c9a227"} stroke="#7a6410" strokeWidth="1.2" style={{ cursor: "pointer" }} onClick={onToggleBalance} />
          </g>
        )}

        {/* Nam châm điện ở đỉnh máng — xoay 90° sang phải, mặt hút chĩa xuống trụ thép */}
        {has("magnet") && (
          <g transform={`translate(${RAILX} ${Y0 - 6}) rotate(90)`}>
            <image href={magnetSvg} x="-20" y="-15.5" width="40" height="31" style={{ opacity: magnetOn ? 1 : 0.55 }} />
            {magnetOn && <circle cx="0" cy="0" r="4" fill="#7ed321" />}
          </g>
        )}
        {/* Đầu nối trên nam châm điện (bên trái) — đích thả dây từ công tắc kép */}
        {has("magnet") && (
          <g>
            <circle cx={magnetTerm.x} cy={magnetTerm.y} r="5.5" fill={magnetWire ? C.good : "#888"} stroke="#fff" strokeWidth="1.4" />
            <text x={magnetTerm.x - 9} y={magnetTerm.y + 3.5} textAnchor="end" fontSize="9" fontWeight="800" fill={magnetWire ? C.good : C.sub} fontFamily={FONT}>NC</text>
          </g>
        )}

        {/* Tia hồng ngoại của cổng quang — đỏ rực khi trụ cắt ngang */}
        {has("gate") && (
          <line x1={RAILX - 26} y1={yGate} x2={RAILX + 26} y2={yGate} stroke={crossing ? "#FF2D2D" : "#FF6B6B"} strokeWidth={crossing ? 3 : 1.2} strokeDasharray={crossing ? "none" : "3 3"} opacity={crossing ? 1 : 0.55} style={{ pointerEvents: "none" }} />
        )}

        {/* Trụ thép — giữ ở nam châm (đung đưa khi vừa gắn) / rơi hẳn xuống chân đế / HS kéo lên gắn lại */}
        {has("magnet") && (() => {
          if (cylDrag) {
            if (cylDrag.x === undefined || cylDrag.y === undefined || isNaN(cylDrag.x) || isNaN(cylDrag.y)) return null;
            return (
              <g onPointerDown={onDragCyl} style={{ cursor: "grabbing" }}>
                <circle cx={cylDrag.x} cy={cylDrag.y} r="20" fill="transparent" />
                <image href={cylinderSvg} x={cylDrag.x - 7} y={cylDrag.y - 11} width="14" height="22" />
              </g>
            );
          }
          if (cylY === undefined || isNaN(cylY)) return null;
          return (
            <g onPointerDown={cylGrab ? onDragCyl : undefined} style={{ cursor: cylGrab ? "grab" : "default" }} transform={magnetOn && swingDeg ? `rotate(${swingDeg} ${RAILX} ${Y0 - 1})` : undefined}>
              <circle cx={RAILX} cy={cylY + 11} r="20" fill="transparent" />
              <image href={cylinderSvg} x={RAILX - 7} y={cylY} width="14" height="22" />
            </g>
          );
        })()}
        {/* Trụ vừa gắn còn đung đưa */}
        {has("magnet") && magnetOn && !settled && !rolling && (
          <text x={RAILX + 16} y={Y0 + 16} fontSize="10" fontWeight="800" fill={C.orangeDk} fontFamily={FONT} style={{ pointerEvents: "none" }}>đang đung đưa…</text>
        )}
        {/* gợi ý kéo trụ thép lên khi đã rơi */}
        {has("magnet") && cylGrab && !cylDrag && (
          <text x={RAILX + 16} y={cylY + 6} fontSize="10" fontWeight="700" fill={C.orangeDk} fontFamily={FONT}>← kéo trụ lên nam châm</text>
        )}

        {/* Cổng quang E — kéo dọc máng để đổi s */}
        {has("gate") && (
          <g transform={`translate(${RAILX} ${yGate})`}>
            <g style={{ cursor: rolling ? "default" : "ns-resize" }} onPointerDown={onDragGate}>
              <image href={photogatePng} x="-40" y="-24" width="80" height="48" preserveAspectRatio="xMidYMid meet" />
            </g>
            {crossing && <circle cx="0" cy="0" r="4.5" fill="#FF2D2D" />}
            <text x="46" y="-6" textAnchor="middle" fontSize="12" fontWeight="800" fill={C.navy} fontFamily={FONT}>E</text>
            {/* đầu dây kéo được */}
            <circle cx="34" cy="10" r="5" fill={wires.B === "gate" ? C.good : "#C0392B"} stroke="#fff" strokeWidth="1.4" style={{ cursor: "grab" }} onPointerDown={(e) => onDragWire("gate", e)} />
          </g>
        )}
        {/* "Chụp ảnh về đích": vòng sáng lan ra khi trụ cắt tia */}
        {has("gate") && gateFlash > 0 && (
          <g key={`flash-${gateFlash}`} style={{ pointerEvents: "none" }}>
            <circle cx={RAILX} cy={yGate} r="8" fill="none" stroke="#FF2D2D" strokeWidth="3">
              <animate attributeName="r" from="8" to="46" dur="0.6s" fill="freeze" />
              <animate attributeName="opacity" from="1" to="0" dur="0.6s" fill="freeze" />
            </circle>
          </g>
        )}

        {/* badge quãng rơi s */}
        {has("gate") && (
          <g>
            <line x1={RAILX - 60} y1={Y0} x2={RAILX - 60} y2={yGate} stroke={C.navy} strokeDasharray="4 3" strokeWidth="1.2" />
            <line x1={RAILX - 66} y1={Y0} x2={RAILX - 54} y2={Y0} stroke={C.navy} strokeWidth="1.2" />
            <line x1={RAILX - 66} y1={yGate} x2={RAILX - 54} y2={yGate} stroke={C.navy} strokeWidth="1.2" />
            <rect x={RAILX - 118} y={(Y0 + yGate) / 2 - 9} width="58" height="17" rx="8.5" fill={C.navy} />
            <text x={RAILX - 89} y={(Y0 + yGate) / 2 + 3} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#fff" fontFamily={FONT}>s = {(s * 100).toFixed(0)} cm</text>
          </g>
        )}
        {/* Đang chiếu chậm */}
        {rolling && (
          <g style={{ pointerEvents: "none" }}>
            <rect x={RAILX + 70} y={Y0 + 30} width="92" height="22" rx="11" fill="#321E12" opacity=".85" />
            <text x={RAILX + 116} y={Y0 + 45} textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" fontFamily={FONT}>▶ chậm ×{SLOW}</text>
          </g>
        )}

        {/* Công tắc kép — BẤM VÀO HỘP để ngắt nam châm & thả trụ thép (bỏ núm tròn vẽ đè) */}
        {has("switch") && (
          <g transform={`translate(${SWITCH.x} ${SWITCH.y})`}>
            <image href={magnetOn ? switchOffPng : switchOnPng} x="0" y="0" width={SWITCH_W} height={SWITCH_H} preserveAspectRatio="xMidYMid meet"
              style={{ cursor: rolling ? "default" : "pointer" }} onClick={onRelease} />
            <text x={SWITCH_W / 2} y={SWITCH_H + 13} textAnchor="middle" fontSize="10" fontWeight="700" fill={C.sub} fontFamily={FONT}>Công tắc kép — bấm để thả</text>
            {/* đầu dây trái → nam châm điện */}
            <circle cx={switchPlugMag.x - SWITCH.x} cy={switchPlugMag.y - SWITCH.y} r="5" fill={magnetWire ? C.good : "#7a5cc0"} stroke="#fff" strokeWidth="1.4" style={{ cursor: "grab" }} onPointerDown={(e) => onDragWire("switchMag", e)} />
            {/* đầu dây phải → ổ A đồng hồ */}
            <circle cx={switchPlugA.x - SWITCH.x} cy={switchPlugA.y - SWITCH.y} r="5" fill={wires.A === "switch" ? C.good : C.navy} stroke="#fff" strokeWidth="1.4" style={{ cursor: "grab" }} onPointerDown={(e) => onDragWire("switch", e)} />
          </g>
        )}

        {/* Đồng hồ MC964 */}
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

        {/* DÂY công tắc kép → nam châm điện (luôn hiện, ở scene) */}
        {has("switch") && has("magnet") && magnetWire && (
          <path d={`M ${switchPlugMag.x} ${switchPlugMag.y} C ${switchPlugMag.x - 24} ${switchPlugMag.y - 60}, ${magnetTerm.x - 24} ${magnetTerm.y + 70}, ${magnetTerm.x} ${magnetTerm.y}`} fill="none" stroke="#7a5cc0" strokeWidth="2.6" opacity="0.9" />
        )}

        {/* DÂY công tắc/cổng quang → ổ A/B đồng hồ */}
        {has("clock") && ["A", "B"].map((sock) => {
          const src = wires[sock]; if (!src) return null;
          const from = src === "switch" ? switchPlugA : { x: RAILX + 34, y: yGate + 10 };
          const to = socketPos(sock); const col = src === "switch" ? C.navy : "#C0392B";
          return <path key={sock} d={`M ${from.x} ${from.y} C ${from.x} ${from.y + 70}, ${to.x} ${to.y + 70}, ${to.x} ${to.y}`} fill="none" stroke={col} strokeWidth="2.6" opacity={face === "back" ? 0.92 : 0.18} />;
        })}
        {wireDrag && (() => {
          const from = wireDrag.src === "switch" ? switchPlugA : wireDrag.src === "switchMag" ? switchPlugMag : { x: RAILX + 34, y: yGate + 10 };
          const col = wireDrag.src === "gate" ? "#C0392B" : wireDrag.src === "switchMag" ? "#7a5cc0" : C.navy;
          return <path d={`M ${from.x} ${from.y} C ${from.x} ${from.y + 60}, ${wireDrag.x} ${wireDrag.y - 40}, ${wireDrag.x} ${wireDrag.y}`} fill="none" stroke={col} strokeWidth="2.6" strokeDasharray="5 4" />;
        })()}

        {showHint && highlightStep === "balance" && has("rail") && <HintBox x={RAILX - RAIL_W * 0.30 - 19} y={railFracY(0.685) - 19} w={38} h={38} label="Vặn vít" />}
        {showHint && highlightStep === "wireMag" && (
          <>
            {has("switch") && <HintBox x={switchPlugMag.x - 22} y={switchPlugMag.y - 20} w={44} h={40} label="Công tắc" />}
            {has("magnet") && <HintBox x={magnetTerm.x - 22} y={magnetTerm.y - 20} w={44} h={40} label="Nam châm" />}
          </>
        )}
        {showHint && highlightStep === "wire" && face === "back" && (
          <>
            {has("switch") && <HintBox x={switchPlugA.x - 22} y={switchPlugA.y - 20} w={44} h={40} label="Dây CT" />}
            {has("gate") && <HintBox x={RAILX + 12} y={yGate - 8} w={45} h={36} label="Dây E" />}
            {has("clock") && <HintBox x={CLK.x + 38} y={CLK.y + 24} w={78} h={42} label="Ổ A/B" />}
          </>
        )}
        {showHint && highlightStep === "power" && face === "back" && has("clock") && <HintBox x={CLK.x + 168} y={CLK.y + 14} w={36} h={48} label="Nguồn" />}
        {showHint && highlightStep === "mode" && face === "front" && has("clock") && <HintBox x={CLK.x + 108} y={CLK.y + 16} w={50} h={58} label="MODE" />}
        {showHint && highlightStep === "reset" && face === "front" && has("clock") && <HintBox x={CLK.x + 172} y={CLK.y + 18} w={36} h={40} label="Reset" />}
        {showHint && highlightStep === "release" && has("switch") && <HintBox x={SWITCH.x + 8} y={SWITCH.y + 8} w={SWITCH_W - 16} h={SWITCH_H - 16} label="Thả trụ" />}

        {/* Ô ĐẶT (vòng sáng) */}
        {dropTarget.map((k) => { const t = targetOf(k, s); return t && (
          <g key={"tgt-" + k} style={{ pointerEvents: "none" }}>
            <circle cx={t.x} cy={t.y} r="30" fill={`${C.orange}1e`} stroke={C.orange} strokeWidth="2" strokeDasharray="6 5">
              <animate attributeName="r" values="26;33;26" dur="1.3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.3s" repeatCount="indefinite" />
            </circle>
            <text x={t.x} y={t.y + 4} textAnchor="middle" fontSize="14" fontWeight="800" fill={C.orangeDk} fontFamily={FONT}>+</text>
          </g>); })}

        {flyTool && <image href={TOOLS.find((t) => t.k === flyTool.k)?.img} x={flyTool.x - 18} y={flyTool.y - 18} width="36" height="36" opacity="0.95" style={{ pointerEvents: "none" }} />}

        {!has("rail") && <text x={VBW / 2} y="40" textAnchor="middle" fontSize="14" fill={C.sub} fontFamily={FONT}>Kéo dụng cụ vào ô sáng (+) trên bàn để lắp…</text>}
      </svg>

      {/* Floating Zoom Button */}
      {placed.has("clock") && (
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
              : { top: zoomClock ? "auto" : 12, bottom: zoomClock ? 12 : "auto", right: 12 }),
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

/** Số đang hiện trên đồng hồ — trong lúc trụ rơi đọc thẳng từ kho hoạt ảnh. */
function AnimLed({ anim, rolling, led }) {
  const live = useAnim(anim);
  return rolling ? live.led : led;
}

/** Đồ thị s–t²: lúc trụ đang rơi, chấm sáng lấy từ kho hoạt ảnh (chỉ đồ thị vẽ lại). */
function LiveFallGraph({ anim, rolling, live, ...props }) {
  const a = useAnim(anim);
  const point = rolling && a.live
    ? { x: a.live.x, y: a.live.y, color: C.orange, label: a.live.done ? `t = ${a.led} s` : "đang rơi…" }
    : live;
  return <LiveGraph {...props} live={point} />;
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

// ô đặt cho vòng sáng (đồng bộ với targetVB trong component chính)
function targetOf(k, s) {
  switch (k) {
    case "rail":   return { x: RAILX, y: (Y0 + FLOOR) / 2 };
    case "magnet": return { x: RAILX, y: Y0 - 14 };
    case "switch": return { x: SWITCH.x + SWITCH_W / 2, y: SWITCH.y + SWITCH_H / 2 };
    case "gate":   return { x: RAILX, y: gateY(s) };
    case "clock":  return { x: CLK.x + 50, y: CLK.y + 40 };
    default:       return { x: VBW / 2, y: VBH / 2 };
  }
}

/* ============================ MC964 trong workbench ============================ */
function MC964Inline({ face, led, mode, scale, power, wires, wireDrag, counting, onFlip, onCycleMode, onReset, onToggleScale, onTogglePower, onUnplug }) {
  const label = { switch: "CT", gate: "E" };
  const col = (g) => (g === "switch" ? C.navy : g === "gate" ? "#C0392B" : null);
  return (
    <g transform={`translate(${CLK.x} ${CLK.y}) scale(${CLK_SCALE})`}>
      <g style={{ cursor: "pointer" }} onClick={onFlip}>
        <rect x="0" y="-20" width="100" height="18" rx="6" fill="#fff" stroke={C.line} />
        <text x="50" y="-7" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.navy} fontFamily={FONT}>{face === "front" ? "Xem mặt sau ⟳" : "⟲ Mặt trước"}</text>
      </g>
      <rect x="-6" y="34" width="12" height="30" rx="3" fill="#B8B8BE" />
      <rect x="292" y="34" width="12" height="30" rx="3" fill="#B8B8BE" />
      <rect x="6" y="0" width="288" height="132" rx="8" fill="#FCF8EF" stroke="#888780" strokeWidth="1.2" />

      {face === "front" ? (
        <>
          <rect x="26" y="24" width="104" height="48" rx="4" fill="#3A1414" stroke={counting ? "#FF6B6B" : "#61252C"} strokeWidth={counting ? 3 : 2} />
          <text x="78" y="58" textAnchor="middle" fontFamily="monospace" fontSize="28" fill="#FF2D2D" letterSpacing="3">{led}</text>
          <text x="30" y="96" fontFamily={FONT} fontSize="14" fontStyle="italic" fontWeight="700" fill="#C0392B">Phylab</text>
          <g onClick={onCycleMode} style={{ cursor: "pointer" }}>
            <circle cx="180" cy="50" r="21" fill="#C9C1C1" stroke="#9B9B9B" strokeWidth="1.4" />
            <line x1="180" y1="50" x2={180 + 15 * Math.sin(MODE_ANGLE[mode] * Math.PI / 180)} y2={50 - 15 * Math.cos(MODE_ANGLE[mode] * Math.PI / 180)} stroke={C.navy} strokeWidth="3" strokeLinecap="round" />
            <g fontFamily={FONT} fontSize="9" fill="#333" textAnchor="middle"><text x="148" y="56">A</text><text x="158" y="30">B</text><text x="180" y="22">A+B</text><text x="205" y="31">A↔B</text><text x="211" y="56">T</text></g>
            <text x="180" y="86" textAnchor="middle" fontSize="9" fill={C.orange} fontWeight="800">MODE: {MODE_LABEL[mode]}</text>
          </g>
          <g onClick={onReset} style={{ cursor: "pointer" }}>
            <text x="250" y="30" textAnchor="middle" fontFamily={FONT} fontSize="10" fill="#444" fontWeight="700">Reset</text>
            <circle cx="250" cy="48" r="11" fill="#E03A36" stroke="#9A2E2E" strokeWidth="1.2" />
          </g>
          <g onClick={onToggleScale} style={{ cursor: "pointer" }}>
            <text x="234" y="96" fontFamily={FONT} fontSize="8" fill={scale === "coarse" ? C.orange : "#999"} fontWeight="700">0.01</text>
            <text x="258" y="96" fontFamily={FONT} fontSize="8" fill={scale === "fine" ? C.orange : "#999"} fontWeight="700">0.001</text>
            <rect x="232" y="100" width="40" height="12" rx="6" fill="#B8B8BE" stroke="#999" strokeWidth="0.6" />
            <circle cx={scale === "fine" ? 264 : 240} cy="106" r="5" fill="#fff" stroke="#888" strokeWidth="0.8" />
            <text x="252" y="124" textAnchor="middle" fontFamily={FONT} fontSize="8" fill="#444">Thang đo ({FREEFALL.scales[scale].label})</text>
          </g>
        </>
      ) : (
        <>
          {[["A", SOCK.A], ["B", SOCK.B], ["C", SOCK.C]].map(([so, cx]) => {
            const g = wires[so]; const c = col(g);
            const hot = wireDrag && so !== "C";
            return (
              <g key={so} onClick={() => g && onUnplug(so)} style={{ cursor: g ? "pointer" : "default" }}>
                <circle cx={cx} cy="52" r="15" fill="#1f1f1f" stroke={hot ? C.orange : "#000"} strokeWidth={hot ? 2.6 : 0.8} />
                <circle cx={cx} cy="52" r="8" fill="#0d0d0d" />
                {c && <circle cx={cx} cy="52" r="5.5" fill={c} />}
                <text x={cx} y="84" textAnchor="middle" fontFamily={FONT} fontSize="11" fill="#333" fontWeight="700">{so}</text>
                {c && <text x={cx} y="38" textAnchor="middle" fontFamily={FONT} fontSize="9" fill={c} fontWeight="800">{label[g]}</text>}
              </g>
            );
          })}
          <text x="196" y="96" fontFamily={FONT} fontSize="9" fontStyle="italic" fill="#333">+10V</text>
          <g onClick={onTogglePower} style={{ cursor: "pointer" }}>
            <rect x="238" y="26" width="26" height="46" rx="4" fill={power ? "#3E8E3E" : "#C04C4C"} stroke="#5a2020" strokeWidth="1" />
            <text x="251" y="54" textAnchor="middle" fontFamily={FONT} fontSize="11" fill="#fff" fontWeight="800">{power ? "I" : "O"}</text>
            <text x="251" y="96" textAnchor="middle" fontFamily={FONT} fontSize="8" fill="#444">Nguồn {power ? "BẬT" : "TẮT"}</text>
          </g>
        </>
      )}
    </g>
  );
}

/* ============================ styles ============================ */
const linkBtn = { border: "none", background: "transparent", color: C.sub, fontWeight: 800, fontSize: 11, cursor: "pointer", fontFamily: FONT, padding: 0, textDecoration: "underline" };
const miniLabel = { fontSize: 9.5, fontWeight: 900, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4 };
const chip = { display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 3px 2px 7px", borderRadius: 999, border: `1px solid ${C.line}`, background: "#fff", fontFamily: "monospace", fontSize: 11.5, fontWeight: 900 };
const chipX = { border: "none", background: "transparent", color: C.sub, cursor: "pointer", fontSize: 13, fontWeight: 900, lineHeight: 1, padding: "0 3px", fontFamily: FONT };
const choiceButton = { border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", color: C.sub, padding: "4px 8px", fontSize: 11, fontWeight: 850, cursor: "pointer", fontFamily: FONT };
const mobileAdjustBtn = { border: `1px solid ${C.orange}`, background: "#fff", color: C.orangeDk, borderRadius: 10, padding: "9px 6px", fontSize: 12, fontWeight: 900, fontFamily: FONT };
