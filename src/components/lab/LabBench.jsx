"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Volume2, VolumeX, Play, BookOpen, ChevronUp, ChevronDown, Hand, ZoomIn, ZoomOut, MessageSquare } from "lucide-react";
import { MathText } from "../Latex";
import { C, FONT } from "../../engine/tokens.js";
import { LAB6, computeTime, zeroDisplay } from "../../engine/physics.js";
import { guide, ask, smartbotReady } from "../../engine/smartbot.js";
import { generateProblemSet, buildAssignedSet } from "../../lib/problemGen";

/* Assets phục vụ qua thư mục public (không import kiểu Vite trong Next). */
const railPng = "/lab/bai6/rail.png";
const standLeftPng = "/lab/bai6/stand_left.png";
const standRightPng = "/lab/bai6/stand_right.png";
const ballSvg = "/lab/bai6/ball.svg";
const magnetOnSvg = "/lab/bai6/magnet_on.svg";
const magnetOffSvg = "/lab/bai6/magnet_off.svg";
const photogateSvg = "/lab/bai6/photogate.svg";
const plumbSvg = "/lab/bai6/plumb.svg";
const mc964FrontSvg = "/lab/bai6/mc964_front.svg";

/* ============================================================================
   LabBench — Engine Lab 6 "Đo tốc độ" (port từ bản Vite của φLab).
   Cơ chế nghiêng: đầu THẤP của ray tựa trên giá phải (cao cố định); đầu CAO
   (đế xám + nam châm) TRƯỢT trên cột giá trái. Đổi góc = thu hẹp khoảng cách
   2 giá đỡ. Bi trace theo ray, lăn tới cuối ray, kéo về nam châm.
   Đồng hồ chỉ chạy khi bi ĐI QUA CỔNG (không phải lúc thả).

   Khác bản gốc: nhận thêm prop `speak(text)` để đọc chỉ dẫn (TTS của RealPhyLab);
   ô hỏi đáp `ask()` gọi /api/vnpt/chat; số liệu xuất qua onExportNote.
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

const MODES = ["A", "B", "A+B", "A<->B", "T"];
const MODE_LABEL = { "A": "A", "B": "B", "A+B": "A+B", "A<->B": "A↔B", "T": "T" };
const MODE_ANGLE = { "A": -50, "B": -25, "A+B": 0, "A<->B": 25, "T": 50 };

const TOOLS = [
  { k: "standL", name: "Giá đỡ trái", sub: "cột trượt (cố định)", img: standLeftPng },
  { k: "standR", name: "Giá đỡ phải", sub: "kéo để đổi góc", img: standRightPng },
  { k: "rail", name: "Thanh ray + thước góc", sub: "±1 mm", img: railPng },
  { k: "weight", name: "Vật nặng (dây dọi)", sub: "chỉ góc nghiêng", img: plumbSvg },
  { k: "magnet", name: "Nam châm + bi", sub: "giữ / thả bi", img: magnetOnSvg },
  { k: "gateE", name: "Cổng quang E", sub: "±0.0003 s", img: photogateSvg },
  { k: "gateF", name: "Cổng quang F", sub: "±0.0003 s", img: photogateSvg },
  { k: "clock", name: "Đồng hồ MC964", sub: "±0.001 s", img: mc964FrontSvg },
];

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const gateLocalX = (s) => RULER_X0 + s * PXM;

// màu theo "tone" thông điệp của Smartbot (welcome/nudge/ok/success/done)
const TONE = { welcome: C.navy, nudge: C.orange, ok: C.good, success: C.good, done: C.good };

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

// path bi (local) theo sF -> hàm nội suy u∈[0,1]
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
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; (at(m)[0] < target ? lo = m : hi = m); }
    return (lo + hi) / 2;
  };
  return { at, uAtX };
}
const PATH = buildPath();

export default function LabBench({ measuredD = 20.0, studentName, assignedSets, assistantSettings, onExportNote, onBack, onReplayPrelab, speak, muted, onToggleMute }) {
  const [lab, setLab] = useState("average");
  // Đề bài: GIÁO VIÊN giao (assignment lớp học) > seeded THEO TỪNG HỌC SINH.
  const set = useMemo(
    () => assignedSets?.[lab]?.length
      ? buildAssignedSet(lab, assignedSets)
      : generateProblemSet(studentName || "Học sinh", "do-toc-do-vat-chuyen-dong", lab),
    [studentName, lab, assignedSets]
  );
  const suggestedAvg = useMemo(
    () => assignedSets?.average?.length
      ? assignedSets.average
      : generateProblemSet(studentName || "Học sinh", "do-toc-do-vat-chuyen-dong", "average").average,
    [studentName, assignedSets]
  );
  const suggestedInst = useMemo(
    () => assignedSets?.instant?.length
      ? assignedSets.instant
      : generateProblemSet(studentName || "Học sinh", "do-toc-do-vat-chuyen-dong", "instant").instant,
    [studentName, assignedSets]
  );
  const [placed, setPlaced] = useState(() => new Set());
  const [theta, setTheta] = useState(LAB6.angle.default);
  const sE = LAB6.sE;
  const [sEF, setSEF] = useState(LAB6.sEF.default);
  const sF = sE + sEF;

  const [balanced, setBalanced] = useState(false);
  const [magnetOn, setMagnetOn] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [ballT, setBallT] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const activeAudioRef = useRef(null);
  
  const [ballDrag, setBallDrag] = useState(null); // {x,y} screen khi kéo bi về

  const [mode, setMode] = useState("A+B"); // trung tính — HS tự chỉnh núm
  const [scale, setScale] = useState("fine");
  const [power, setPower] = useState(false);
  const [face, setFace] = useState("front");
  const [wires, setWires] = useState({ A: null, B: null });
  const [wireDrag, setWireDrag] = useState(null); // {gate,x,y}

  const [led, setLed] = useState(zeroDisplay("fine"));
  const [trials, setTrials] = useState([]);
  const [toast, setToast] = useState(null);
  const [dragTool, setDragTool] = useState(null); // kéo dụng cụ từ palette
  const [flyTool, setFlyTool] = useState(null);   // {k, x, y, tx, ty} vật đang "bay" vào ô đích (viewBox)
  const [swingDeg, setSwingDeg] = useState(0);    // dây dọi đung đưa (độ lệch khỏi phương thẳng đứng)
  const [justRolled, setJustRolled] = useState(false); // vừa đo xong, chưa ghi số liệu

  // hỏi đáp tự do với trợ lý (VNPT) — ô nhập ở tầng trợ lý
  const [chatQ, setChatQ] = useState("");
  const [chatA, setChatA] = useState(null);       // { text, source }
  const [chatBusy, setChatBusy] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", text: "Cần hỗ trợ thao tác nào? Hỏi mình nhé." }
  ]);
  const chatScrollRef = useRef(null);
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory]);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false); // Google Maps bottom sheet
  const [zoomMode, setZoomMode] = useState("full"); // "full", "rail", "clock"
  const [controlsOpen, setControlsOpen] = useState(false);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);

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

  // Đổi góc -> dây dọi bị "đá" và đung đưa tắt dần ~3s (vài giây đầu góc chưa chuẩn)
  useEffect(() => {
    const d = theta - prevTheta.current; prevTheta.current = theta;
    if (!d) return;
    swingRef.current.v += d * 4;
    if (!swingRef.current.running) {
      swingRef.current.running = true; swingRef.current.t = performance.now();
      const loop = (now) => {
        const st = swingRef.current; const dt = Math.min(0.04, (now - st.t) / 1000); st.t = now;
        st.v += (-13 * st.s - 1.7 * st.v) * dt; st.s += st.v * dt;
        setSwingDeg(st.s);
        if (Math.abs(st.s) < 0.05 && Math.abs(st.v) < 0.25) { st.s = 0; st.v = 0; st.running = false; setSwingDeg(0); return; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theta]);

  const required = TOOLS.map((t) => t.k).filter((k) => !(lab === "instant" && k === "gateF"));
  // thứ tự lắp: nam châm & 2 cổng quang cùng nhóm (lắp cái nào trước cũng được)
  const GROUPS = [["standL"], ["standR"], ["rail"], ["weight"], ["magnet", "gateE", "gateF"], ["clock"]];
  const reqSet = new Set(required);
  const activeGroup = GROUPS.find((g) => g.some((k) => reqSet.has(k) && !placed.has(k))) || [];
  const isNextTool = (k) => activeGroup.includes(k) && reqSet.has(k) && !placed.has(k);
  const assembled = required.every((k) => placed.has(k));

  useEffect(() => { resetTimer(); /* KHÔNG autosetup dây/mode khi đổi tab */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lab]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2400); };
  const wiredOK = lab === "average" ? wires.A === "E" && wires.B === "F" : wires.A === "E" && wires.B === null;
  const modeOK = lab === "average" ? mode === "A<->B" : mode === "A";
  const setupDone = assembled && wiredOK && power && modeOK; // set up thành công -> hiện đề bài
  const currentTargets = lab === "average" ? suggestedAvg : suggestedInst;
  const currentTaskIndex = clamp(activeTaskIndex, 0, Math.max(0, currentTargets.length - 1));
  const currentTask = currentTargets[currentTaskIndex];
  const isTargetMeasured = (target) => (
    !!target && trials.some((t) =>
      t.lab === lab &&
      t.theta === target.theta &&
      (lab === "instant" || Math.abs(t.sEF - target.sEF) < 1e-6)
    )
  );
  const currentTaskTrial = currentTask
    ? trials.find((t) =>
        t.lab === lab &&
        t.theta === currentTask.theta &&
        (lab === "instant" || Math.abs(t.sEF - currentTask.sEF) < 1e-6)
      )
    : null;

  useEffect(() => {
    setActiveTaskIndex(0);
  }, [lab, studentName]);

  useEffect(() => {
    if (!currentTargets.length) return;
    const next = currentTargets.findIndex((target) => !isTargetMeasured(target));
    if (next >= 0 && next !== activeTaskIndex) setActiveTaskIndex(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trials.length, lab, currentTargets.length]);

  // Đổi góc/khoảng cách sau khi đo sẽ làm phép đo cũ mất hiệu lực.
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
    } catch (err) {}
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
      } catch (err) {}
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
      const vbox_x_origin = 0;
      const vbox_y_origin = 0;
      const vbox_width = VBW;
      const vbox_height = VBH;
      
      const scale = Math.min(r.width / vbox_width, r.height / vbox_height);
      const offset_x = (r.width - vbox_width * scale) / 2;
      const offset_y = (r.height - vbox_height * scale) / 2;
      
      const vbx = vbox_x_origin + (clientX - r.left - offset_x) / scale;
      const vby = vbox_y_origin + (clientY - r.top - offset_y) / scale;
      
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

  const steps = useMemo(() => {
    return assembled ? [
      { k: "balance", t: "Vặn vít cân bằng máng", done: balanced },
      { k: "wire", t: lab === "average" ? "Kéo dây E→A, F→B (mặt sau)" : "Kéo dây E→A (mặt sau)", done: wiredOK },
      { k: "power", t: "Bật nguồn đồng hồ (mặt sau)", done: power },
      { k: "mode", t: `Chọn MODE ${lab === "average" ? "A↔B" : "A"}`, done: modeOK },
      { k: "reset", t: "Reset trước khi thả bi", done: led === zeroDisplay(scale) },
      { k: "release", t: "Bấm nút trên nam châm để thả bi", done: !magnetOn && led !== zeroDisplay(scale) },
    ] : required.map((k) => ({ k, t: `Lắp: ${TOOLS.find((t) => t.k === k).name}`, done: placed.has(k) }));
  }, [assembled, balanced, lab, wiredOK, power, modeOK, led, scale, magnetOn, required, placed]);

  // Auto zoom based on current task/step
  const nextStepKey = useMemo(() => {
    if (!assembled) return "assembling";
    const nextStep = steps.find(s => !s.done);
    return nextStep ? nextStep.k : "done";
  }, [assembled, steps]);

  const progressPercent = useMemo(() => {
    if (!assembled) {
      return Math.round((placed.size / required.length) * 100);
    }
    const doneSteps = steps.filter(s => s.done).length;
    return Math.round((doneSteps / steps.length) * 100);
  }, [assembled, placed.size, required.length, steps]);

  const nextStepText = useMemo(() => {
    if (!assembled) {
      const missing = required.find(k => !placed.has(k));
      const toolName = missing ? TOOLS.find(t => t.k === missing)?.name : "";
      return toolName ? `Lắp ${toolName.toLowerCase()}` : "Lắp ráp thiết bị";
    }
    const nextStep = steps.find(s => !s.done);
    return nextStep ? nextStep.t : "Đã hoàn thành thực hành";
  }, [assembled, placed, required, steps]);

  useEffect(() => {
    if (!isMobile) return;
    if (assembled && ["release", "record"].includes(nextStepKey)) return;
    let target = "full";
    if (assembled) {
      if (nextStepKey === "balance") {
        target = "rail";
      } else if (["wire", "power", "mode", "reset"].includes(nextStepKey)) {
        target = "clock";
      }
    }
    const timer = setTimeout(() => {
      setZoomMode(target);
    }, 0);
    return () => clearTimeout(timer);
  }, [assembled, isMobile, nextStepKey]);

  function resetTimer() { cancelAnimationFrame(rafRef.current); lastMeasurementRef.current = null; setRolling(false); setLed(zeroDisplay(scale)); setJustRolled(false); }
  function magnetOff() {
    if (rolling) return;
    // kiểm tra TRƯỚC khi nhả nam châm — nếu không bi sẽ "biến mất" (không giữ mà cũng không lăn)
    if (!assembled) { flash("Hãy lắp đủ dụng cụ (kể cả đồng hồ) trước khi thả bi."); return; }
    if (!power) { flash("Chưa bật nguồn đồng hồ (mặt sau)."); return; }
    if (!wiredOK) { flash("Chưa nối dây cổng quang vào ổ A/B."); return; }
    const matchesTeacherTarget = currentTargets.some((target) =>
      Math.abs(theta - target.theta) < 0.5
      && (lab === "instant" || Math.abs(sEF - target.sEF) < 0.005)
    );
    if (set.seed === "teacher" && !matchesTeacherTarget) {
      const wanted = currentTask
        ? `θ=${currentTask.theta}°${lab === "average" ? `, sEF=${(currentTask.sEF * 100).toFixed(0)}cm` : ""}`
        : "cấu hình trong đề";
      flash(`Đề giáo viên yêu cầu ${wanted} — chỉnh đúng trước khi thả bi.`);
      return;
    }
    setMagnetOn(false); runRoll();
  }
  function magnetHold() { if (rolling) return; setMagnetOn(true); setBallT(0); setBallDrag(null); }

  function runRoll() {
    if (rolling) return;
    if (!assembled) { flash("Hãy lắp đủ dụng cụ trước."); return; }
    if (!power) { flash("Chưa bật nguồn đồng hồ (mặt sau)."); return; }
    if (!wiredOK) { flash("Chưa nối dây cổng quang vào ổ A/B."); return; }

    const measuredConfig = { lab, theta, sEF, scale, mode, balanced, measuredD };
    lastMeasurementRef.current = null;
    const res = computeTime({ mode, thetaDeg: theta, sE, sF, dMm: measuredD, balanced, scale });
    const sc = LAB6.scales[scale];
    const base = parseFloat(led) || 0;               // CỘNG DỒN nếu chưa reset
    const measured = res.valid ? res.raw : 0;
    const finalShown = Math.round((base + measured) / sc.res) * sc.res;
    const M = mode.toUpperCase().replace(/\s/g, "");
    const gEx = gateLocalX(sE), gFx = gateLocalX(sF);
    const win = Math.max(8, (measuredD / 1000) * PXM); // bề rộng bi (local) cho cổng đơn
    // đồng hồ chỉ đếm khi bi trong đoạn [start,end] local-x
    let start = gEx, end = gFx;
    if (M === "A") { start = gEx; end = gEx + win; }
    else if (M === "B") { start = gFx; end = gFx + win; }
    else if (M === "T") { start = 1e9; end = 1e9; }

    setRolling(true); setBallT(0); setBallDrag(null);
    const dur = 1700, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const u = Math.pow(p, 1.55);
      setBallT(u);
      const bx = PATH.at(u)[0];
      if (res.valid && M !== "T") {
        const prog = clamp((bx - start) / (end - start), 0, 1);
        const jitter = prog > 0 && prog < 1 ? (0.85 + 0.3 * Math.random()) : 1;
        setLed((base + measured * prog * jitter).toFixed(sc.dp));
      }
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        setLed(res.valid ? finalShown.toFixed(sc.dp) : (base).toFixed(sc.dp));
        setRolling(false);
        setJustRolled(res.valid);
        lastMeasurementRef.current = res.valid ? measuredConfig : null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function recordTrial() {
    if (rolling) return;
    if (!justRolled) { flash("Mỗi lượt thả chỉ được ghi một lần — hãy Reset, chỉnh cấu hình rồi đo lại."); return; }
    if (led === zeroDisplay(scale)) { flash("Chưa có số đo — thả bi trước."); return; }
    const measuredConfig = lastMeasurementRef.current;
    const configUnchanged = measuredConfig
      && measuredConfig.lab === lab
      && Math.abs(measuredConfig.theta - theta) < 0.5
      && (lab === "instant" || Math.abs(measuredConfig.sEF - sEF) < 0.005)
      && measuredConfig.scale === scale
      && measuredConfig.mode === mode
      && measuredConfig.balanced === balanced
      && measuredConfig.measuredD === measuredD;
    if (!configUnchanged) {
      flash("Cấu hình đã đổi sau phép đo — hãy Reset và đo lại trước khi ghi.");
      setJustRolled(false);
      return;
    }
    const matchesTeacherTarget = currentTargets.some((target) =>
      Math.abs(measuredConfig.theta - target.theta) < 0.5
      && (lab === "instant" || Math.abs(measuredConfig.sEF - target.sEF) < 0.005)
    );
    if (set.seed === "teacher" && !matchesTeacherTarget) {
      const wanted = currentTask
        ? `θ=${currentTask.theta}°${lab === "average" ? `, sEF=${(currentTask.sEF * 100).toFixed(0)}cm` : ""}`
        : "cấu hình trong đề";
      flash(`Sai cấu hình đề giáo viên — hãy chỉnh đúng ${wanted} rồi đo lại.`);
      return;
    }
    const s = lab === "average" ? sEF : measuredD / 1000;
    const v = parseFloat(led) > 0 ? s / parseFloat(led) : null;
    setTrials((tr) => [...tr, {
      id: tr.length + 1,
      lab,
      theta: measuredConfig.theta,
      sEF: lab === "average" ? measuredConfig.sEF : null,
      mode: measuredConfig.mode,
      t: parseFloat(led),
      v,
      balanced: measuredConfig.balanced,
    }]);
    lastMeasurementRef.current = null;
    setJustRolled(false);
    flash(`Đã ghi lần đo #${trials.length + 1}.`);
  }

  // Hỏi đáp tự do -> /api/vnpt/chat, fallback FAQ cục bộ nếu chưa cấu hình
  async function askBot(q) {
    const text = (q ?? chatQ).trim();
    if (!text || chatBusy) return;
    setChatQ("");
    
    // Thêm câu hỏi của user vào history
    setChatHistory((prev) => [...prev, { role: "user", text }]);
    setChatBusy(true);
    
    // Thêm placeholder cho câu trả lời của AI
    setChatHistory((prev) => [...prev, { role: "assistant", text: "" }]);
    
    try {
      const reply = await ask(text, {
        assistantSettings,
        labContext: buildSmartBotContext(),
        onToken: (piece) => {
          setChatHistory((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === "assistant") {
              last.text += piece;
            }
            return copy;
          });
        }
      });
      if (reply?.buttons?.length) {
        setChatHistory((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = { ...last, actions: reply.buttons };
          }
          return copy;
        });
      }
    } catch {
      setChatHistory((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          last.text = "Không kết nối được trợ lý. Thử lại sau nhé.";
        }
        return copy;
      });
    } finally {
      setChatBusy(false);
    }
  }

  function buildSmartBotContext() {
    return {
      screen: "lab",
      labId: "b6",
      lab,
      assembled,
      activeGroupNames: activeGroup.map((k) => TOOLS.find((t) => t.k === k)?.name).filter(Boolean),
      placedCount,
      requiredCount: required.length,
      balanced,
      power,
      wiredOK,
      modeOK,
      isReset,
      rolling,
      magnetOn,
      ballAtEnd,
      trialsCount: trials.length,
      targetCount,
      currentTask: currentTask ? {
        index: currentTaskIndex + 1,
        theta: currentTask.theta,
        sEF: currentTask.sEF,
        measured: isTargetMeasured(currentTask),
      } : null,
      nextStepText,
    };
  }

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
        flash("Cần lắp nam châm và viên bi trước khi đặt lại vật nặng.");
        return;
      }
      magnetHold();
      flash("Đã đặt viên bi lại vào nam châm.");
      return;
    }
    if (payload === "auto_wire") {
      if (!placed.has("clock") || !placed.has("gateE") || (lab === "average" && !placed.has("gateF"))) {
        flash("Cần lắp đủ đồng hồ và cổng quang trước khi tự động nối dây.");
        return;
      }
      setFace("back");
      if (lab === "average") {
        setWires({ A: "E", B: "F" });
        flash("Đã nối dây cổng E→A và F→B");
      } else {
        setWires({ A: "E", B: null });
        flash("Đã nối dây cổng E→A");
      }
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
      setMode(lab === "average" ? "A<->B" : "A");
      flash(`Đã chọn MODE ${lab === "average" ? "A↔B" : "A"}`);
      return;
    }
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

  const renderAssistantActions = (msg) => (
    msg.actions?.length ? (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {msg.actions.map((action) => (
          <button
            key={`${action.payload}-${action.title}`}
            type="button"
            onClick={() => runAssistantAction(action.payload)}
            style={{ border: `1px solid ${C.orange}`, background: "#FFF7EF", color: C.orangeDk, borderRadius: 9, padding: "6px 9px", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: FONT }}
          >
            {action.title}
          </button>
        ))}
      </div>
    ) : null
  );
  function exportNote() {
    if (!trials.length) { flash("Chưa có số liệu để xuất."); return; }
    onExportNote?.({ lab, measuredD, trials }); flash("Đã gửi số liệu sang Sổ Báo Cáo.");
  }
  // Thoát phòng lab — hỏi xác nhận nếu còn số liệu chưa xuất Note.
  function handleExit() {
    if (!onBack) return;
    if (trials.length > 0 && !window.confirm(`Bạn có ${trials.length} lần đo chưa xuất sang Sổ Báo Cáo. Thoát phòng lab và bỏ số liệu này?`)) return;
    onBack();
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
  const dragBall = useCallback((e) => {
    if (rolling || magnetOn) return; e.stopPropagation();
    const startX = e.clientX, startY = e.clientY, startTime = Date.now();
    const { svg } = evVB(e, e.currentTarget);
    const move = (ev) => { const p = evVB(ev, svg); setBallDrag({ x: p.x, y: p.y }); };
    const up = (ev) => {
      const isClick = Math.hypot(ev.clientX - startX, ev.clientY - startY) < 10 && (Date.now() - startTime) < 300;
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
  }, [rolling, magnetOn, theta, isMobile]);

  // ===== KÉO DÂY thật: cầm đầu dây cổng -> thả vào ổ A/B =====
  const dragWire = useCallback((gate, e) => {
    e.stopPropagation(); setFace("back");
    const startX = e.clientX, startY = e.clientY, startTime = Date.now();
    const { svg } = evVB(e, e.currentTarget);
    const move = (ev) => { const p = evVB(ev, svg); setWireDrag({ gate, x: p.x, y: p.y }); };
    const up = (ev) => {
      const isClick = Math.hypot(ev.clientX - startX, ev.clientY - startY) < 10 && (Date.now() - startTime) < 300;
      if (isMobile && isClick) {
        if (gate === "E") {
          setWires((w) => {
            const next = w.A === "E" ? null : "E";
            flash(next ? "Đã nối dây cổng E vào ổ A" : "Đã rút dây cổng E");
            return { ...w, A: next };
          });
        } else if (gate === "F") {
          setWires((w) => {
            const next = w.B === "F" ? null : "F";
            flash(next ? "Đã nối dây cổng F vào ổ B" : "Đã rút dây cổng F");
            return { ...w, B: next };
          });
        }
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
  }, [rolling, isMobile, theta]);
  const unplug = (sock) => setWires((w) => ({ ...w, [sock]: null }));

  // ===== trạng thái cho engine hướng dẫn Smartbot =====
  const zeroLed = zeroDisplay(scale);
  const isReset = led === zeroLed;
  const ballAtEnd = !magnetOn && !rolling && ballT > 0;
  const targetCount = (lab === "average" ? suggestedAvg : suggestedInst).length;
  const placedCount = required.filter((k) => placed.has(k)).length;
  const tip = guide({
    labId: "b6", lab, assembled,
    activeGroupNames: activeGroup.map((k) => TOOLS.find((t) => t.k === k)?.name).filter(Boolean),
    placedCount, requiredCount: required.length,
    balanced, power, wiredOK, modeOK, isReset, rolling,
    ballAtEnd, justMeasured: justRolled,
    trialsCount: trials.length, targetCount,
    assistantSettings,
  });
  const tone = TONE[tip.tone] || C.navy;

  // TTS: đọc chỉ dẫn của trợ lý mỗi khi nội dung đổi (TTS của RealPhyLab)
  const lastSpoken = useRef("");
  useEffect(() => {
    if (speak && tip.text && tip.text !== lastSpoken.current) {
      lastSpoken.current = tip.text;
      speak(tip.text);
    }
  }, [tip.text, speak]);

  const renderSideContent = (showParts = { assistant: true, progress: true, data: true }) => (
    <>
      {/* PHẦN 1 — TRỢ LÝ */}
      {showParts.assistant && (
        isMobile ? (
          /* Mobile Cozy Tech Q&A Chat Section */
          <section style={{ ...cardStyle, background: "#FFFDF9", border: "1px solid #EFE8DF", borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #F0E6D8", paddingBottom: 6 }}>
              <MessageSquare className="w-4 h-4 text-[#C85A17]" />
              <b style={{ color: C.ink, fontSize: 12.5 }}>Trợ lý Phylab</b>
              {chatBusy && <span style={{ fontSize: 10, color: C.orange, marginLeft: "auto" }}>Đang trả lời...</span>}
            </div>

            {/* Chat History Log */}
            <div ref={chatScrollRef} style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
              {chatHistory.map((msg, idx) => (
                <div 
                  key={idx} 
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    background: msg.role === "user" ? "#FBE6D4" : "#F5F0E6",
                    border: msg.role === "user" ? "1px solid #F3DEC8" : "1px solid #EAE1D0",
                    color: msg.role === "user" ? "#6A3B18" : "#443930",
                    borderRadius: msg.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    padding: "8px 12px",
                    fontSize: 12,
                    maxWidth: "85%",
                    lineHeight: 1.4,
                    wordBreak: "break-word"
                  }}
                >
                  {msg.text ? <MathText text={msg.text} /> : <span style={{ color: C.sub }}>...</span>}
                  {msg.role === "assistant" && renderAssistantActions(msg)}
                </div>
              ))}
            </div>

            {/* Chat input form */}
            <form onSubmit={(e) => { e.preventDefault(); askBot(); }} style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <input 
                value={chatQ} 
                onChange={(e) => setChatQ(e.target.value)} 
                placeholder="Hỏi trợ lý về thí nghiệm…"
                style={{ 
                  flex: 1, 
                  minWidth: 0, 
                  border: "1px solid #E1D3B6", 
                  borderRadius: 10, 
                  padding: "8px 12px", 
                  fontSize: 12, 
                  fontFamily: FONT, 
                  outline: "none", 
                  background: "#ffffff", 
                  color: C.ink 
                }} 
              />
              <button 
                type="submit" 
                disabled={chatBusy || !chatQ.trim()} 
                style={{ 
                  background: C.orange, 
                  color: "#ffffff", 
                  border: "none", 
                  borderRadius: 10, 
                  padding: "8px 14px", 
                  fontSize: 12, 
                  fontWeight: "bold", 
                  cursor: "pointer", 
                  opacity: chatBusy || !chatQ.trim() ? 0.5 : 1,
                  fontFamily: FONT
                }}
              >
                Hỏi
              </button>
            </form>
          </section>
        ) : (
          <section style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: C.orange, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14 }}>φ</div>
              <b style={{ color: C.ink, fontSize: 14.5 }}>Trợ lý Phylab</b>
              {speak && (
                <button onClick={onToggleMute} title={muted ? "Bật tiếng trợ lý" : "Tắt tiếng trợ lý"} aria-label={muted ? "Bật tiếng trợ lý" : "Tắt tiếng trợ lý"} aria-pressed={muted}
                  style={{ marginLeft: "auto", border: `1px solid ${muted ? "#C0392B" : C.line}`, background: muted ? "#FDECEA" : "#fff", borderRadius: 8, width: 28, height: 28, cursor: "pointer", display: "grid", placeItems: "center", color: muted ? "#C0392B" : C.orange }}>
                  {muted ? <VolumeX className="w-4 h-4 text-[#C0392B]" /> : <Volume2 className="w-4 h-4 text-[#C85A17]" />}
                </button>
              )}
              <span style={{ marginLeft: speak ? 6 : "auto", fontSize: 9.5, color: smartbotReady() ? C.good : C.sub, border: `1px solid ${smartbotReady() ? C.good : C.line}`, borderRadius: 20, padding: "1px 7px" }}>{smartbotReady() ? "VNPT" : "offline"}</span>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: C.bg, borderLeft: `3px solid ${tone}`, color: C.ink, fontSize: 14, lineHeight: 1.5, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ flex: 1 }}><MathText text={tip.text} /></span>
              {speak && tip.text && (
                <button type="button" onClick={() => speak(tip.text)} title="Nghe đọc" style={{ border: "none", background: "none", cursor: "pointer", padding: "2px 4px", display: "inline-flex", alignItems: "center" }}>
                  <Play className="w-3.5 h-3.5 text-[#C85A17] fill-[#C85A17]/10" />
                </button>
              )}
            </div>
            {chatHistory.length > 1 && (
              <div ref={chatScrollRef} style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto", marginTop: 6, paddingRight: 4 }}>
                {chatHistory.slice(1).map((msg, idx) => (
                  <div key={idx} style={{ padding: "8px 11px", borderRadius: 8, background: C.bg, border: `1px solid ${C.line}`, fontSize: 13.5, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 10, color: C.sub, fontWeight: "bold" }}>
                      {msg.role === "user" ? "Bạn:" : "Trợ lý Phylab:"}
                    </span>
                    <span style={{ color: C.ink, lineHeight: 1.45 }}>
                      {msg.text ? <MathText text={msg.text} /> : "..."}
                    </span>
                    {msg.role === "assistant" && renderAssistantActions(msg)}
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); askBot(); }} style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input value={chatQ} onChange={(e) => setChatQ(e.target.value)} placeholder="Hỏi trợ lý về thí nghiệm…"
                style={{ flex: 1, minWidth: 0, border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 11px", fontSize: 13.5, fontFamily: FONT, outline: "none", background: "#ffffff", color: C.ink }} />
              <button type="submit" disabled={chatBusy || !chatQ.trim()} style={{ ...btnNavy, padding: "8px 14px", fontSize: 13.5, opacity: chatBusy || !chatQ.trim() ? 0.5 : 1 }}>Hỏi</button>
            </form>
            {onReplayPrelab && (
              <button onClick={onReplayPrelab} style={{ ...btnGhost, color: C.orangeDk, fontSize: 11.5, marginTop: 8, display: "flex", alignItems: "center", gap: 4, width: "100%", justifyContent: "center", border: `1px dashed ${C.line}`, borderRadius: 8, padding: "5px 0" }}>
                <BookOpen className="w-3.5 h-3.5 text-[#C85A17]" /> Xem lại giới thiệu dụng cụ (Prelab)
              </button>
            )}
          </section>
        )
      )}

      {/* PHẦN 2 — TIẾN TRÌNH */}
      {showParts.progress && (
        <section style={cardStyle}>
          <div style={sideTitle}>Tiến trình {assembled ? "— quy trình đo" : "— lắp ráp"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {steps.map((s, i) => (
              <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: isMobile ? 12.5 : 13.5, transition: "opacity .3s", opacity: s.done ? 0.55 : 1 }}>
                <span style={{ width: 18, height: 18, borderRadius: 6, border: `1.6px solid ${s.done ? C.good : C.line}`, background: s.done ? C.good : "#fff", color: s.done ? "#fff" : C.sub, display: "grid", placeItems: "center", fontSize: 10, fontWeight: "bold", flexShrink: 0 }}>
                  {s.done ? <Check className="w-2.5 h-2.5 stroke-[3] text-white" /> : i + 1}
                </span>
                <span style={{ color: s.done ? C.sub : C.ink, textDecoration: s.done ? "line-through" : "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {s.t}
                </span>
              </div>
            ))}
          </div>
          {setupDone && <>
            <div style={{ ...sideTitle, marginTop: 12 }}>Cấu hình cần đo</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {(lab === "average" ? suggestedAvg : suggestedInst).map((s, i) => {
                const used = trials.some((t) => t.lab === lab && t.theta === s.theta && (lab === "instant" || Math.abs(t.sEF - s.sEF) < 1e-6));
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 9px", borderRadius: 7, border: `1px solid ${C.line}`, background: used ? "#F3F8F3" : C.bg, fontSize: isMobile ? 11.5 : 12.5, color: C.ink }}>
                    <span>Câu {i + 1}: θ={s.theta}°{s.sEF ? `, sEF=${(s.sEF * 100).toFixed(0)}cm` : ""}</span>
                    <span style={{ color: used ? C.good : C.sub, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      {used ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3] text-[#27AE60]" />
                          <span style={{ fontWeight: 800 }}>đã đo</span>
                        </>
                      ) : (
                        "chưa đo"
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </>}
        </section>
      )}

      {/* PHẦN 3 — GHI SỐ LIỆU */}
      {showParts.data && (
        <section style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={sideTitle}>Ghi số liệu ({trials.length})</div>
            {trials.length > 0 && <button onClick={() => setTrials([])} style={{ ...btnGhost, fontSize: 11 }}>Xóa hết</button>}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "2px 0 8px" }}>
            <span style={{ fontSize: isMobile ? 12.5 : 11, color: C.sub }}>số đo</span>
            <b style={{ fontFamily: "monospace", fontSize: isMobile ? 28 : 24, color: justRolled ? C.orangeDk : C.ink }}>{led}</b>
            <span style={{ fontSize: isMobile ? 12.5 : 11, color: C.sub }}>s</span>
          </div>
          <div data-lab-scroll style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8, maxHeight: isMobile ? 200 : 140, overflow: "auto" }}>
            {trials.map((t) => (
              <div key={t.id} style={{ fontSize: isMobile ? 13.5 : 13, color: C.sub, display: "flex", justifyContent: "space-between", padding: isMobile ? "7px 10px" : "4px 8px", background: C.bg, borderRadius: 6 }}>
                <span>#{t.id} θ{t.theta}° {t.mode}</span>
                <span style={{ color: C.ink, fontWeight: 700 }}>{t.t.toFixed(scale === "fine" ? 3 : 2)}s{t.v ? ` · ${t.v.toFixed(2)}` : ""}</span>
              </div>
            ))}
            {!trials.length && <div style={{ fontSize: isMobile ? 13 : 13, color: C.sub2, fontStyle: "italic" }}>Chưa có lần đo. Reset → thả bi → Ghi số liệu.</div>}
          </div>
          <button disabled={!justRolled || rolling} onClick={recordTrial} style={{ ...btnNavy, width: "100%", marginBottom: 8, opacity: justRolled && !rolling ? 1 : 0.5, cursor: justRolled && !rolling ? "pointer" : "not-allowed" }}>Ghi số liệu</button>
          <button onClick={exportNote} style={{ ...btnBig, width: "100%" }}>Xuất sang Sổ Báo Cáo</button>
        </section>
      )}
    </>
  );

  const renderGuidanceContent = () => (
    <>
      {renderSideContent({ assistant: false, progress: true, data: true })}
      {renderSideContent({ assistant: true, progress: false, data: false })}
    </>
  );

  return (
    <div className="phy-screen" data-lab-engine="inclined" style={{ flex: 1, minHeight: 0, overflow: "hidden", background: C.bg, fontFamily: FONT, display: "flex", flexDirection: "column" }}>
      <div data-lab-header style={isMobile
        ? { display: "flex", flexDirection: isPortrait ? "column" : "row", alignItems: isPortrait ? "stretch" : "center", gap: isPortrait ? 3 : 6, padding: "4px 6px", borderBottom: `1px solid ${C.line}`, background: "#fff", flexShrink: 0 }
        : { display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", borderBottom: `1px solid ${C.line}`, background: "#fff" }
      }>
        <div style={{ display: "flex", alignItems: "center", justifyContent: isPortrait ? "space-between" : (isMobile ? "flex-start" : "space-between"), gap: isMobile ? 4 : 0, width: isPortrait ? "100%" : (isMobile ? "auto" : "100%"), flexShrink: 0 }}>
          {onBack && <button onClick={handleExit} style={{ ...btnGhost, padding: isMobile ? "0 5px" : undefined }}>← Thoát</button>}
          {onReplayPrelab && <button onClick={() => onReplayPrelab?.()} style={{ ...btnGhost, color: C.navy, fontSize: isMobile ? 11 : 12, padding: isMobile ? "0 5px" : undefined }}>{isMobile ? "Prelab" : "Xem lại Prelab"}</button>}
          <div data-lab-meta style={{ fontSize: 12, color: C.sub }}>d = <b style={{ color: C.ink }}>{measuredD.toFixed(2)} mm</b></div>
        </div>
        
        <div style={{ display: "flex", justifyContent: "center", width: isMobile ? "auto" : "100%", flex: isMobile ? 1 : "initial", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 4, background: C.peachLt, padding: 3, borderRadius: 10, border: `1px solid ${C.line}`, width: isMobile ? "100%" : "auto" }}>
            {[["average", "Vận tốc trung bình"], ["instant", "Vận tốc tức thời"]].map(([k, t]) => (
              <button key={k} onClick={() => setLab(k)} style={{ ...tabBtn, flex: isMobile ? 1 : "initial", fontSize: isMobile ? 11 : 12.5, padding: isMobile ? "4px 3px" : "6px 12px", ...(lab === k ? tabActive : {}) }}>{isMobile && k === "average" ? "Vận tốc TB" : t}</button>
            ))}
          </div>
        </div>
      </div>

      <div data-lab-layout data-orientation={isPortrait ? "portrait" : "landscape"} style={isMobile
        ? { flex: 1, display: "grid", gridTemplateColumns: isPortrait ? "92px minmax(0, 1fr)" : "minmax(132px, 17vw) minmax(0, 1fr) minmax(220px, 28vw)", minHeight: 0, overflow: "hidden", position: "relative" }
        : { flex: 1, display: "grid", gridTemplateColumns: "minmax(220px, 14vw) 1fr minmax(360px, 24vw)", minHeight: 0 }
      }>
        {/* TRÁI: 8 dụng cụ */}
          <aside data-lab-tooltray data-lab-scroll style={isMobile
            ? { background: "#fff", borderRight: `1px solid ${C.line}`, padding: isPortrait ? 4 : 6, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 5, overflowY: "auto", overflowX: "hidden", minWidth: 0 }
            : { borderRight: `1px solid ${C.line}`, background: "#fff", overflow: "auto", padding: 12 }
          }>
            {isMobile && (
              <div style={{ flexShrink: 0, borderRadius: 9, background: C.peachLt, color: C.orangeDk, padding: "5px 4px", fontSize: isPortrait ? 9 : 10, fontWeight: 900, lineHeight: 1.15, textAlign: "center" }}>
                DỤNG CỤ · {required.filter((k) => placed.has(k)).length}/{required.length}
              </div>
            )}
            {!isMobile && <div style={sideTitle}>Dụng cụ ({required.filter((k) => placed.has(k)).length}/{required.length})</div>}
            {isMobile && assembled && isPortrait && (
              <div style={{ borderRadius: 10, padding: "8px 4px", background: "#F3F8F3", color: C.good, fontSize: 10, fontWeight: 900, textAlign: "center" }}>✓ Đã lắp đủ</div>
            )}
            {TOOLS.map((t) => {
              if (lab === "instant" && t.k === "gateF") return null;
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
                  style={{ display: "flex", flexDirection: isMobile && isPortrait ? "column" : "row", alignItems: "center", gap: isMobile ? (isPortrait ? 2 : 6) : 12, padding: isMobile ? (isPortrait ? "5px 3px" : "4px 5px") : "11px 13px", borderRadius: 10, marginBottom: isMobile ? 0 : 7, cursor: done ? "default" : (isMobile ? "pointer" : "grab"), touchAction: isMobile ? "manipulation" : "none", flexShrink: 0, minWidth: 0, width: "100%",
                    border: `1.5px solid ${done ? C.good : isNext ? C.orange : C.line}`, background: done ? "#F3F8F3" : "#fff", opacity: done ? 0.7 : 1, boxShadow: isNext ? `0 0 0 3px ${C.orange}22` : "none" }}>
                  <div style={{ width: isMobile ? 24 : 56, height: isMobile ? 24 : 56, display: "grid", placeItems: "center", background: C.bg, borderRadius: 8, flexShrink: 0 }}>
                    <img src={t.img} alt="" style={{ maxWidth: isMobile ? 18 : 44, maxHeight: isMobile ? 18 : 44, objectFit: "contain" }} />
                  </div>
                  <div style={{ minWidth: 0, textAlign: isPortrait ? "center" : "left", flex: 1, width: isPortrait ? "100%" : "auto" }}>
                    <div style={{ fontSize: isMobile ? (isPortrait ? 9.5 : 10.5) : 13.5, fontWeight: 700, color: C.ink, whiteSpace: isPortrait ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.15 }}>{t.name}</div>
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

        {/* GIỮA: workbench */}
        <main ref={mainRef} data-lab-stage style={{ position: "relative", overflow: "hidden", overscrollBehavior: "none", touchAction: "manipulation", padding: isMobile ? 4 : 10, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, flex: 1, outline: dragTool ? `2px dashed ${C.orange}` : "none", outlineOffset: -6, gap: 0, paddingBottom: isMobile ? 4 : 10 }}>
          <Workbench
            lab={lab} placed={placed} theta={theta} sE={sE} sF={sF} sEF={sEF} balanced={balanced}
            magnetOn={magnetOn} rolling={rolling} ballT={ballT} ballDrag={ballDrag} wires={wires} wireDrag={wireDrag}
            face={face} led={led} mode={mode} scale={scale} power={power}
            dropTarget={!assembled ? activeGroup.filter((k) => reqSet.has(k) && !placed.has(k)) : []} flyTool={flyTool}
            onDragAngle={dragAngle} onDragGateF={dragGateF} onDragBall={dragBall} onDragWire={dragWire} onUnplug={unplug}
            onReleaseBtn={() => (magnetOn ? magnetOff() : flash("Kéo viên bi lên nam châm rồi mới thả được."))}
            onToggleMagnet={() => (magnetOn ? magnetOff() : flash("Kéo viên bi lên nam châm để giữ."))}
            swingDeg={swingDeg}
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
            highlightStep={nextStepKey}
          />
          {isMobile && assembled && (
            <div style={{ position: "absolute", top: 8, right: 8, zIndex: 36, pointerEvents: "none" }}>
              {!controlsOpen && (
                <button
                  type="button"
                  onClick={() => setControlsOpen(true)}
                  style={{ pointerEvents: "auto", width: 34, height: 58, borderRadius: "14px 0 0 14px", border: `1px solid ${C.orange}`, borderRight: "none", background: "#FFF7EF", color: C.orangeDk, fontSize: 20, fontWeight: 900, boxShadow: "0 6px 18px rgba(50,30,18,0.16)", transform: "translateX(10px)" }}
                  aria-label="Mở điều khiển nhanh"
                >
                  &gt;
                </button>
              )}
              <div
                style={{
                  pointerEvents: controlsOpen ? "auto" : "none",
                  width: 286,
                  maxWidth: "78vw",
                  background: "#fff",
                  border: `1px solid ${C.line}`,
                  borderRadius: 16,
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
                  <button
                    type="button"
                    onClick={() => setControlsOpen(false)}
                    style={{ width: 30, height: 30, borderRadius: 10, border: `1px solid ${C.orange}`, background: "#FFF7EF", color: C.orangeDk, fontSize: 18, fontWeight: 900 }}
                    aria-label="Ẩn điều khiển nhanh"
                  >
                    &lt;
                  </button>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 900, color: C.ink }}>Điều khiển nhanh</span>
                </div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, scrollSnapType: "x proximity" }}>
                  <button
                    type="button"
                    onClick={() => { setBalanced(true); flash("Đã cố định vít cân bằng máng."); }}
                    disabled={!placed.has("standR")}
                    style={{ minWidth: 118, border: `1px solid ${balanced ? C.good : C.orange}`, background: balanced ? "#F3F8F3" : "#FFF7EF", color: balanced ? C.good : C.orangeDk, borderRadius: 12, padding: "9px 10px", fontSize: 11, fontWeight: 900, opacity: placed.has("standR") ? 1 : 0.45 }}
                  >
                    Cố định vít
                  </button>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, minWidth: 240 }}>
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
                  <div style={{ display: "grid", gridTemplateColumns: lab === "average" ? "1fr 1fr" : "1fr", gap: 8, minWidth: lab === "average" ? 300 : 150 }}>
                    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 8, background: C.bg }}>
                      <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 900, marginBottom: 6 }}>Giá đỡ phải · θ={theta}°</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <button type="button" disabled={!placed.has("standR")} onClick={() => setTheta((v) => clamp(v - 1, LAB6.angle.min, LAB6.angle.max))} style={mobileAdjustBtn}>-1°</button>
                        <button type="button" disabled={!placed.has("standR")} onClick={() => setTheta((v) => clamp(v + 1, LAB6.angle.min, LAB6.angle.max))} style={mobileAdjustBtn}>+1°</button>
                      </div>
                    </div>
                    {lab === "average" && (
                      <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 8, background: C.bg }}>
                        <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 900, marginBottom: 6 }}>Cổng F · sEF={(sEF * 100).toFixed(0)}cm</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          <button type="button" disabled={!placed.has("gateF")} onClick={() => setSEF((v) => clamp(+(v - 0.01).toFixed(2), LAB6.sEF.min, LAB6.sEF.max))} style={mobileAdjustBtn}>-1cm</button>
                          <button type="button" disabled={!placed.has("gateF")} onClick={() => setSEF((v) => clamp(+(v + 0.01).toFixed(2), LAB6.sEF.min, LAB6.sEF.max))} style={mobileAdjustBtn}>+1cm</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {false && isMobile && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
              {assembled && (
                <section style={{ position: "relative", zIndex: controlsOpen ? 45 : 35, minHeight: 44, marginTop: -2 }}>
                  {controlsOpen && (
                    <div
                      onClick={() => setControlsOpen(false)}
                      style={{ position: "fixed", inset: 0, zIndex: 44, background: "rgba(50,30,18,0.24)", backdropFilter: "blur(1.5px)", WebkitBackdropFilter: "blur(1.5px)" }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setControlsOpen((v) => !v)}
                    style={{ position: "absolute", left: 0, top: 0, zIndex: 47, width: 46, height: 44, borderRadius: "0 16px 16px 0", border: `1px solid ${C.orange}`, borderLeft: "none", background: "#FFF7EF", color: C.orangeDk, fontSize: 21, fontWeight: 900, boxShadow: "0 8px 22px rgba(50,30,18,0.16)" }}
                    aria-label={controlsOpen ? "Ẩn điều khiển nhanh" : "Mở điều khiển nhanh"}
                  >
                    {controlsOpen ? "<" : ">"}
                  </button>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      zIndex: 46,
                      background: "#fff",
                      border: `1px solid ${C.line}`,
                      borderRadius: 18,
                      padding: "16px 14px 16px 58px",
                      boxShadow: "0 18px 42px rgba(50,30,18,0.22)",
                      transform: controlsOpen ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.97)",
                      opacity: controlsOpen ? 1 : 0,
                      pointerEvents: controlsOpen ? "auto" : "none",
                      transition: "transform 240ms cubic-bezier(.2,.8,.2,1), opacity 180ms ease",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 900, color: C.ink, marginBottom: 12 }}>Điều khiển nhanh</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
                      {[
                        ["full", "Toàn cảnh"],
                        ["rail", "Máng/cổng"],
                        ["clock", "Đồng hồ"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setZoomMode(key)}
                          style={{ border: `1px solid ${zoomMode === key ? C.orange : C.line}`, background: zoomMode === key ? "#FFF2E6" : "#fff", color: zoomMode === key ? C.orangeDk : C.ink, borderRadius: 12, padding: "12px 10px", fontSize: 12, fontWeight: 900 }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: lab === "average" ? "1fr 1fr" : "1fr", gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => { setBalanced(true); flash("Đã cố định vít cân bằng máng."); }}
                        disabled={!placed.has("standR")}
                        style={{ border: `1px solid ${balanced ? C.good : C.orange}`, background: balanced ? "#F3F8F3" : "#FFF7EF", color: balanced ? C.good : C.orangeDk, borderRadius: 14, padding: "13px 10px", fontSize: 12, fontWeight: 900, opacity: placed.has("standR") ? 1 : 0.45 }}
                      >
                        Cố định vít
                      </button>
                      <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 10, background: C.bg }}>
                        <div style={{ fontSize: 11.5, color: C.sub, fontWeight: 900, marginBottom: 8 }}>θ={theta}°</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <button type="button" disabled={!placed.has("standR")} onClick={() => setTheta((v) => clamp(v - 1, LAB6.angle.min, LAB6.angle.max))} style={mobileAdjustBtn}>-1°</button>
                          <button type="button" disabled={!placed.has("standR")} onClick={() => setTheta((v) => clamp(v + 1, LAB6.angle.min, LAB6.angle.max))} style={mobileAdjustBtn}>+1°</button>
                        </div>
                      </div>
                      {lab === "average" && (
                        <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 10, background: C.bg, gridColumn: "1 / -1" }}>
                          <div style={{ fontSize: 11.5, color: C.sub, fontWeight: 900, marginBottom: 8 }}>Cổng F · sEF={(sEF * 100).toFixed(0)}cm</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <button type="button" disabled={!placed.has("gateF")} onClick={() => setSEF((v) => clamp(+(v - 0.01).toFixed(2), LAB6.sEF.min, LAB6.sEF.max))} style={mobileAdjustBtn}>-1cm</button>
                            <button type="button" disabled={!placed.has("gateF")} onClick={() => setSEF((v) => clamp(+(v + 0.01).toFixed(2), LAB6.sEF.min, LAB6.sEF.max))} style={mobileAdjustBtn}>+1cm</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}
              {false && assembled && (
                <section style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: controlsOpen ? 12 : "10px 12px", display: "flex", flexDirection: "column", gap: controlsOpen ? 10 : 0, boxShadow: "0 2px 8px rgba(50,30,18,0.03)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: C.ink }}>Điều khiển dễ bấm</span>
                    <button
                      type="button"
                      onClick={() => setControlsOpen((v) => !v)}
                      style={{ border: `1px solid ${C.orange}`, background: controlsOpen ? "#FFF7EF" : "#fff", color: C.orangeDk, borderRadius: 10, padding: "7px 10px", fontSize: 11, fontWeight: 900 }}
                    >
                      {controlsOpen ? "Ẩn" : "Mở"}
                    </button>
                  </div>
                  {controlsOpen && (
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, scrollSnapType: "x proximity" }}>
                    <button
                      type="button"
                      onClick={() => { setBalanced(true); flash("Đã cố định vít cân bằng máng."); }}
                      disabled={!placed.has("standR")}
                      style={{ minWidth: 118, border: `1px solid ${balanced ? C.good : C.orange}`, background: balanced ? "#F3F8F3" : "#FFF7EF", color: balanced ? C.good : C.orangeDk, borderRadius: 12, padding: "9px 10px", fontSize: 11, fontWeight: 900, opacity: placed.has("standR") ? 1 : 0.45 }}
                    >
                      Cố định vít
                    </button>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, minWidth: 240 }}>
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
                  <div style={{ display: "grid", gridTemplateColumns: lab === "average" ? "1fr 1fr" : "1fr", gap: 8, minWidth: lab === "average" ? 300 : 150 }}>
                    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 8, background: C.bg }}>
                      <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 900, marginBottom: 6 }}>Giá đỡ phải · θ={theta}°</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <button type="button" disabled={!placed.has("standR")} onClick={() => setTheta((v) => clamp(v - 1, LAB6.angle.min, LAB6.angle.max))} style={mobileAdjustBtn}>-1°</button>
                        <button type="button" disabled={!placed.has("standR")} onClick={() => setTheta((v) => clamp(v + 1, LAB6.angle.min, LAB6.angle.max))} style={mobileAdjustBtn}>+1°</button>
                      </div>
                    </div>
                    {lab === "average" && (
                      <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 8, background: C.bg }}>
                        <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 900, marginBottom: 6 }}>Cổng F · sEF={(sEF * 100).toFixed(0)}cm</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          <button type="button" disabled={!placed.has("gateF")} onClick={() => setSEF((v) => clamp(+(v - 0.01).toFixed(2), LAB6.sEF.min, LAB6.sEF.max))} style={mobileAdjustBtn}>-1cm</button>
                          <button type="button" disabled={!placed.has("gateF")} onClick={() => setSEF((v) => clamp(+(v + 0.01).toFixed(2), LAB6.sEF.min, LAB6.sEF.max))} style={mobileAdjustBtn}>+1cm</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7, minWidth: 330 }}>
                    {[
                      { title: "Nối dây", body: lab === "average" ? "Chạm chốt tròn E/F trên cổng quang để nối E→A, F→B." : "Chạm chốt tròn E trên cổng quang để nối E→A.", active: !wiredOK },
                      { title: "Đồng hồ", body: "Zoom Đồng hồ, lật mặt sau để bật nguồn; mặt trước để chọn MODE và Reset.", active: !power || !modeOK || !isReset },
                      { title: "Thả bi", body: "Khi số đo về 0.000, bấm nam châm ở đầu máng để thả bi.", active: isReset && wiredOK && power && modeOK },
                    ].map((hint) => (
                      <button
                        key={hint.title}
                        type="button"
                        onClick={() => setZoomMode(hint.title === "Đồng hồ" ? "clock" : "rail")}
                        style={{ textAlign: "left", border: `1px solid ${hint.active ? C.orange : C.line}`, background: hint.active ? "#FFF7EF" : "#fff", borderRadius: 12, padding: "9px 8px", color: C.ink, minHeight: 92 }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 999, background: hint.active ? C.orange : C.bg, color: hint.active ? "#fff" : C.sub, fontSize: 10, fontWeight: 900, marginBottom: 6 }}>
                          {hint.title === "Thả bi" ? <Play className="w-3 h-3" /> : <Hand className="w-3 h-3" />}
                        </span>
                        <div style={{ fontSize: 10.5, fontWeight: 900, marginBottom: 3 }}>{hint.title}</div>
                        <div style={{ fontSize: 9.5, lineHeight: 1.25, color: C.sub }}>{hint.body}</div>
                      </button>
                    ))}
                  </div>
                  </div>
                  )}
                </section>
              )}
              {/* Progress bar and next step indicator */}
              {!assembled && (
              <section style={{
                background: "#fff",
                border: `1px solid ${C.line}`,
                borderRadius: 16,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                boxShadow: "0 2px 8px rgba(50,30,18,0.03)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: "bold", color: C.ink }}>
                    {assembled ? "Tiến trình thực hành" : "Tiến trình lắp ráp"}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: "bold", color: C.orange }}>
                    {progressPercent}%
                  </span>
                </div>
                <div style={{ width: "100%", height: 6, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${progressPercent}%`, height: "100%", background: C.orange, borderRadius: 3, transition: "width 0.3s ease" }} />
                </div>
                <div style={{ fontSize: 11, color: C.sub, fontWeight: "bold" }}>
                  Tiếp theo: {nextStepText}
                </div>
              </section>
              )}

              {/* Trợ lý Phylab — LUÔN hiển thị (trước đây bị ẩn sau khi lắp xong). */}
              <section style={{
                background: "#fff",
                border: `1px solid ${C.line}`,
                borderRadius: 16,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                boxShadow: "0 2px 8px rgba(50,30,18,0.03)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: C.orange, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13 }}>φ</div>
                  <b style={{ color: C.ink, fontSize: 13.5 }}>Trợ lý Phylab</b>

                  {speak && (
                    <button onClick={onToggleMute} title={muted ? "Bật tiếng trợ lý" : "Tắt tiếng trợ lý"} aria-label={muted ? "Bật tiếng trợ lý" : "Tắt tiếng trợ lý"} aria-pressed={muted}
                      style={{ marginLeft: "auto", border: `1px solid ${muted ? "#C0392B" : C.line}`, background: muted ? "#FDECEA" : "#fff", borderRadius: 8, width: 28, height: 28, cursor: "pointer", display: "grid", placeItems: "center", color: muted ? "#C0392B" : C.orange }}>
                      {muted ? <VolumeX className="w-4 h-4 text-[#C0392B]" /> : <Volume2 className="w-4 h-4 text-[#C85A17]" />}
                    </button>
                  )}
                </div>

                <div style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: C.bg,
                  borderLeft: `3px solid ${tone}`,
                  color: C.ink,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}>
                  <span style={{ flex: 1 }}><MathText text={tip.text} /></span>
                  {speak && tip.text && (
                    <button type="button" onClick={() => speak(tip.text)} title="Nghe đọc" style={{ border: "none", background: "none", cursor: "pointer", padding: "2px 4px", display: "inline-flex", alignItems: "center" }}>
                      <Play className="w-3.5 h-3.5 text-[#C85A17] fill-[#C85A17]/10" />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: C.sub, textAlign: "center" }}>
                  Cần hỏi thêm? Mở <b style={{ color: C.orange }}>Trợ lý Phylab</b> ở thanh dưới cùng để chat.
                </div>
              </section>

              {assembled && (
                /* Sau khi lắp xong: hiện ĐỀ BÀI + bảng ghi số liệu ngay trong luồng chính
                   (trước đây đề bài bị ẩn trên mobile vì chỉ nằm ở cột tiến trình). */
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {setupDone && (
                    <section style={{ background: "#FFFDF9", border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 9, boxShadow: "0 2px 8px rgba(50,30,18,0.03)" }}>
                      <div style={{ ...sideTitle, marginBottom: 0, fontSize: 13, color: C.orangeDk }}>
                        Câu đo hiện tại
                      </div>
                      {currentTask && (
                        <>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 12, border: `1px solid ${isTargetMeasured(currentTask) ? C.good : C.line}`, background: isTargetMeasured(currentTask) ? "#F3F8F3" : "#fff" }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 11, color: C.sub, fontWeight: 900 }}>
                                Câu {currentTaskIndex + 1}/{currentTargets.length}
                              </div>
                              <div style={{ fontSize: 16, color: C.ink, fontWeight: 900, lineHeight: 1.35 }}>
                                θ={currentTask.theta}°{currentTask.sEF ? ` · sEF=${(currentTask.sEF * 100).toFixed(0)}cm` : ""}
                              </div>
                            </div>
                            <span style={{ flexShrink: 0, color: currentTaskTrial ? C.good : (justRolled ? C.orangeDk : C.sub), fontSize: 12, fontWeight: 900, textAlign: "right" }}>
                              {currentTaskTrial ? `Đã ghi ${currentTaskTrial.t.toFixed(scale === "fine" ? 3 : 2)}s` : `Số đo ${led}s`}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <button
                              type="button"
                              disabled={!justRolled || rolling}
                              onClick={recordTrial}
                              style={{ ...btnNavy, width: "100%", padding: "10px 8px", fontSize: 12.5, opacity: justRolled && !rolling ? 1 : 0.5, cursor: justRolled && !rolling ? "pointer" : "not-allowed" }}
                            >
                              Ghi số liệu
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTaskIndex((i) => (i + 1) % currentTargets.length)}
                              style={{ border: `1px solid ${C.line}`, background: "#fff", color: C.ink, borderRadius: 11, padding: "10px 8px", fontSize: 12.5, fontWeight: 900, fontFamily: FONT }}
                            >
                              Câu tiếp theo
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={exportNote}
                            style={{ ...btnBig, width: "100%", padding: "12px 10px", fontSize: 13, borderRadius: 12 }}
                          >
                            Xuất sang Sổ Báo Cáo
                          </button>
                          <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                            {currentTargets.map((target, i) => (
                              <button
                                key={i}
                                type="button"
                                aria-label={`Câu ${i + 1}`}
                                onClick={() => setActiveTaskIndex(i)}
                                style={{ width: 9, height: 9, borderRadius: 999, border: "none", background: i === currentTaskIndex ? C.orange : isTargetMeasured(target) ? C.good : "#DDD3C7", padding: 0 }}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </section>
                  )}
                  {renderSideContent({ assistant: false, progress: false, data: false })}
                </div>
              )}
            </div>
          )}
          {toast && <div style={toastStyle}>{toast}</div>}
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

        {/* PHẢI / BOTTOM SHEET: Trợ lý / Tiến trình / Ghi số liệu */}
        {isMobile && isPortrait ? (
          <motion.div
            animate={{ height: sheetOpen ? "82%" : 40 }}
            transition={{ type: "spring", damping: 20, stiffness: 180 }}
            style={{
              position: "absolute",
              bottom: 6,
              left: sheetOpen ? 6 : "auto",
              right: 6,
              width: sheetOpen ? "auto" : "min(190px, calc(100% - 12px))",
              background: "#FFFBF7",
              border: `1.5px solid ${C.line}`,
              borderRadius: sheetOpen ? 18 : 14,
              boxShadow: sheetOpen ? "0 -8px 24px rgba(50,30,18,0.12)" : "0 8px 24px rgba(50,30,18,0.14)",
              zIndex: 40,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Click-to-toggle handle */}
            <div 
              onClick={() => setSheetOpen(!sheetOpen)}
              style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", flexShrink: 0, background: "#FFFBF7", borderBottom: sheetOpen ? `1px solid ${C.line}` : "none", touchAction: "manipulation", padding: "0 12px" }}
            >
              <span style={{ fontSize: 11, fontWeight: 900, color: C.orange, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {sheetOpen ? "Bảng điều khiển Lab" : assembled ? (justRolled ? "Ghi số liệu" : "Bảng Lab") : "Hướng dẫn"}
              </span>
              {sheetOpen ? (
                <ChevronDown className="w-4 h-4 text-[#C85A17]" />
              ) : (
                <ChevronUp className="w-4 h-4 text-[#C85A17]" />
              )}
            </div>
            
            {/* Sheet body */}
            <div data-lab-scroll style={{ flex: 1, overflow: "auto", overscrollBehavior: "contain", padding: "0 12px calc(16px + env(safe-area-inset-bottom, 0px))", display: sheetOpen ? "flex" : "none", flexDirection: "column", gap: 12 }}>
              {renderGuidanceContent()}
            </div>
          </motion.div>
        ) : (
          <aside data-lab-guide data-lab-scroll style={{ borderLeft: `1px solid ${C.line}`, background: C.bg, overflow: "auto", padding: isMobile ? 6 : 12, display: "flex", flexDirection: "column", gap: isMobile ? 8 : 12, minWidth: 0 }}>
            {renderGuidanceContent()}
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

/* ============================ Workbench ============================ */
function Workbench(props) {
  const { lab, placed, theta, sE, sF, sEF, balanced, magnetOn, rolling, ballT, ballDrag, wires, wireDrag, swingDeg = 0,
    face, led, mode, scale, power, dropTarget = [], flyTool = null,
    onDragAngle, onDragGateF, onDragBall, onDragWire, onUnplug,
    onReleaseBtn, onToggleMagnet, onToggleBalance, onFlip, onCycleMode, onReset, onToggleScale, onTogglePower, onCanvasTap,
    zoomMode, setZoomMode, highlightStep } = props;

  const zoomClock = zoomMode === "clock";
  const setZoomClock = (val) => setZoomMode(val ? "clock" : "full");

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
  // Trên mobile: bỏ letterbox — cho SVG tự cao đúng theo tỉ lệ viewBox để khung lab
  const showHint = props.isMobile && dropTarget.length === 0;
  const HintBox = ({ x, y, w, h, label }) => (
    <g style={{ pointerEvents: "none" }}>
      <animate attributeName="opacity" values="0.28;0.52;0.28" dur="1.4s" repeatCount="indefinite" />
      <rect x={x} y={y} width={w} height={h} rx="9" fill="#27AE6014" stroke="#27AE60" strokeWidth="1.4" strokeDasharray="6 4" />
      {label && <text x={x + w / 2} y={y - 5} textAnchor="middle" fontSize="10" fontWeight="900" fill="#17864A" fontFamily={FONT}>{label}</text>}
    </g>
  );

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

        {/* Cột giá trái (cố định) — đầu cao ray trượt trên đây */}
        {has("standL") && <image href={standLeftPng} x={XL - 78} y={poleTop} width="156" height={FLOOR - poleTop} preserveAspectRatio="xMidYMax meet" />}

        {/* Giá phải (cao cố định, kéo để đổi góc) */}
        {has("standR") && (
          <g style={{ cursor: rolling ? "default" : "ew-resize" }} onPointerDown={onDragAngle}>
            <image href={standRightPng} x={xR - HR * 0.279} y={YR} width={HR * 0.558} height={HR} preserveAspectRatio="xMidYMax meet" />
          </g>
        )}

        {/* RAY (chỉ ảnh ray trong group xoay) */}
        {has("rail") && (
          <g transform={railGroup}>
            <image href={railPng} x="0" y="0" width="778" height="187" />
          </g>
        )}

        {/* Dây dọi gắn ở thước đo góc */}
        {has("weight") && (() => {
          const piv = screenOf(122, 150, theta); const L = 58, w = 8;
          return <g transform={`rotate(${swingDeg} ${piv.x} ${piv.y})`}>
            <image href={plumbSvg} x={piv.x - w / 2} y={piv.y} width={w} height={L} preserveAspectRatio="xMidYMin meet" />
          </g>;
        })()}

        {/* vít cân bằng (trên giá phải) */}
        {has("standR") && <circle cx={xR} cy={YR + 20} r="7" fill={balanced ? C.good : "#c9a227"} stroke="#7a6410" strokeWidth="1" style={{ cursor: "pointer" }} onClick={onToggleBalance} />}

        {/* Cổng quang E/F — vẽ screen-space, nghiêng theo ray */}
        {has("gateE") && <GatePiece p={gEs} theta={theta} label="E" wired={wires.A === "E"} active={rolling && ballLocal[0] >= gEx} onDragWire={(e) => onDragWire("E", e)} />}
        {lab === "average" && has("gateF") && <GatePiece p={gFs} theta={theta} label="F" wired={wires.B === "F"} active={rolling && ballLocal[0] >= gFx} draggable onDrag={onDragGateF} onDragWire={(e) => onDragWire("F", e)} />}

        {/* Nam châm (xoay theo ray) + nút thả, ở đầu cao */}
        {has("magnet") && (
          <g transform={`translate(${pMag.x} ${pMag.y}) rotate(${theta}) translate(0 -6)`}>
            <image href={magnetOn ? magnetOnSvg : magnetOffSvg} x="-8.5" y="-8.5" width="17" height="17" style={{ cursor: "pointer" }} onClick={onToggleMagnet} />
            <circle cx="0" cy="-13" r="4.5" fill="#E03A36" stroke="#8a1f1f" strokeWidth="1.3" style={{ cursor: "pointer" }} onClick={onReleaseBtn} />
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
            <rect x={XL - 33} y={FLOOR - 22} width="66" height="17" rx="8.5" fill="#fff" stroke={wob ? "#c9a227" : C.line} />
            <text x={XL} y={FLOOR - 10} textAnchor="middle" fontSize="10.5" fontWeight="800" fill={wob ? "#c9a227" : C.orange} fontFamily={FONT}>{wob ? `θ ≈ ${(theta + swingDeg).toFixed(0)}°` : `θ = ${theta}°`}</text>
          </g>; })()}
        {lab === "average" && has("gateE") && has("gateF") && (() => { const mx = (gEs.x + gFs.x) / 2, my = Math.min(gEs.y, gFs.y) - 34;
          return <g><line x1={gEs.x} y1={gEs.y - 26} x2={gFs.x} y2={gFs.y - 26} stroke={C.navy} strokeDasharray="4 3" strokeWidth="1.2" />
            <rect x={mx - 29} y={my - 9} width="58" height="16" rx="8" fill={C.navy} />
            <text x={mx} y={my + 2.5} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily={FONT}>sEF = {(sEF * 100).toFixed(0)} cm</text></g>; })()}

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
            <MC964Inline face={face} led={led} mode={mode} scale={scale} power={power} wires={wires} wireDrag={wireDrag}
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

        {showHint && highlightStep === "balance" && has("standR") && <HintBox x={xR - 20} y={YR + 4} w={40} h={34} label="Vặn vít" />}
        {showHint && highlightStep === "wire" && face === "back" && (
          <>
            {has("gateE") && <HintBox x={gEs.x - 19} y={gEs.y - 4} w={38} h={36} label="Dây E" />}
            {lab === "average" && has("gateF") && <HintBox x={gFs.x - 19} y={gFs.y - 4} w={38} h={36} label="Dây F" />}
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
        {flyTool && <image href={TOOLS.find((t) => t.k === flyTool.k)?.img} x={flyTool.x - 18} y={flyTool.y - 18} width="36" height="36" opacity="0.95" style={{ pointerEvents: "none" }} />}

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
            top: zoomClock ? "auto" : 12,
            bottom: zoomClock ? 12 : "auto",
            right: 12,
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
      <image href={ballSvg} x={x - 8} y={y - 8} width="16" height="16" />
    </g>
  );
}

// cổng quang screen-space, nghiêng theo ray; đầu dây kéo được
function GatePiece({ p, theta, label, wired, active, draggable, onDrag, onDragWire }) {
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${theta})`}>
      <g style={{ cursor: draggable ? "grab" : "default" }} onPointerDown={draggable ? onDrag : undefined}>
        <image href={photogateSvg} x="-11" y="-23" width="22" height="45" />
      </g>
      {active && <circle cx="0" cy="-5" r="4" fill="#FF2D2D" />}
      <text x="0" y="-27" textAnchor="middle" fontSize="11" fontWeight="800" fill={C.navy} fontFamily={FONT}>{label}</text>
      {/* đầu dây kéo được (ở chân cổng) */}
      <circle cx="0" cy="20" r="5" fill={wired ? C.good : (label === "E" ? C.navy : "#C0392B")} stroke="#fff" strokeWidth="1.4"
        style={{ cursor: "grab" }} onPointerDown={onDragWire} />
    </g>
  );
}

/* ============================ MC964 trong workbench ============================ */
function MC964Inline({ face, led, mode, scale, power, wires, wireDrag, onFlip, onCycleMode, onReset, onToggleScale, onTogglePower, onUnplug }) {
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
          <rect x="26" y="24" width="104" height="48" rx="4" fill="#3A1414" stroke="#61252C" strokeWidth="2" />
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
            <text x="252" y="124" textAnchor="middle" fontFamily={FONT} fontSize="8" fill="#444">Thang đo ({LAB6.scales[scale].label})</text>
          </g>
        </>
      ) : (
        <>
          {[["A", SOCK.A], ["B", SOCK.B], ["C", SOCK.C]].map(([s, cx]) => {
            const g = wires[s]; const col = g === "E" ? C.navy : g === "F" ? "#C0392B" : null;
            const hot = wireDrag && s !== "C";
            return (
              <g key={s} onClick={() => g && onUnplug(s)} style={{ cursor: g ? "pointer" : "default" }}>
                <circle cx={cx} cy="52" r="15" fill="#1f1f1f" stroke={hot ? C.orange : "#000"} strokeWidth={hot ? 2.6 : 0.8} />
                <circle cx={cx} cy="52" r="8" fill="#0d0d0d" />
                {col && <circle cx={cx} cy="52" r="5.5" fill={col} />}
                <text x={cx} y="84" textAnchor="middle" fontFamily={FONT} fontSize="11" fill="#333" fontWeight="700">{s}</text>
                {col && <text x={cx} y="38" textAnchor="middle" fontFamily={FONT} fontSize="9" fill={col} fontWeight="800">{g}</text>}
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
const btnGhost = { border: "none", background: "transparent", color: C.sub, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: FONT };
const tabBtn = { border: "none", background: "transparent", color: C.sub, fontWeight: 800, fontSize: 12.5, cursor: "pointer", padding: "6px 12px", borderRadius: 9, fontFamily: FONT };
const tabActive = { background: "#fff", color: C.orangeDk, boxShadow: "0 1px 4px rgba(0,0,0,.08)" };
const sideTitle = { fontSize: 12.5, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 };
const cardStyle = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, flexShrink: 0 };
const btnBig = { padding: "11px 20px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: FONT };
const btnNavy = { padding: "10px 20px", borderRadius: 11, border: `1px solid ${C.navy}`, background: "#fff", color: C.navy, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: FONT };
const mobileAdjustBtn = { border: `1px solid ${C.orange}`, background: "#fff", color: C.orangeDk, borderRadius: 10, padding: "9px 6px", fontSize: 12, fontWeight: 900, fontFamily: FONT };
const toastStyle = { position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: C.navy, color: "#fff", padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, boxShadow: "0 6px 18px rgba(0,0,0,.2)", maxWidth: 460, textAlign: "center", zIndex: 9999 };
