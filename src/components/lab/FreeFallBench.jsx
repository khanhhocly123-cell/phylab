"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Volume2, VolumeX, Play, BookOpen, ChevronUp, ChevronDown, Hand, ZoomIn, ZoomOut, MessageSquare } from "lucide-react";
import { MathText } from "../Latex";
import { C, FONT } from "../../engine/tokens.js";
import { FREEFALL, computeFallTime, gFromMeasurement } from "../../engine/physicsFreeFall.js";
import { guide, ask, smartbotReady } from "../../engine/smartbot.js";
import { generateProblemSet } from "../../lib/problemGen";

/* Assets phục vụ qua thư mục public (không import kiểu Vite trong Next). */
const railPng = "/lab/bai11/rail.png";
const cylinderSvg = "/lab/bai11/cylinder.svg";
const magnetSvg = "/lab/bai11/magnet.svg";
const photogatePng = "/lab/bai11/photogate.png";
const switchOnPng = "/lab/bai11/switch_on.png";
const switchOffPng = "/lab/bai11/switch_off.png";
const mc964FrontSvg = "/lab/bai11/mc964_front.svg";

/* ============================================================================
   FreeFallBench — Engine Lab 11 "Thực hành đo gia tốc rơi tự do" (port từ Vite).
   Cảnh DỌC: máng đứng trên giá đỡ 3 chân; nam châm điện giữ trụ thép ở đỉnh;
   cổng quang trượt dọc máng để đổi quãng rơi s. Nhấn công tắc kép → ngắt điện
   nam châm → trụ thép rơi tự do + đồng hồ đếm; trụ cắt tia cổng quang → dừng.
   Điện: công tắc/nam châm → ổ A, cổng quang → ổ B, MODE A↔B (SGK Bài 11).
   Đo:  g = 2s / t².   Mô hình vật lý ở engine/physicsFreeFall.js.

   Khác bản gốc: nhận prop `speak(text)` để đọc chỉ dẫn (TTS của RealPhyLab);
   ô hỏi đáp `ask()` gọi /api/vnpt/chat.
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

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const TONE = { welcome: C.navy, nudge: C.orange, ok: C.good, success: C.good, done: C.good };

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

export default function FreeFallBench({ studentName, assistantSettings, onExportNote, onBack, onReplayPrelab, speak, muted, onToggleMute }) {
  // Đề bài rơi tự do RA THEO TỪNG HỌC SINH (deterministic) — quãng rơi s khác nhau.
  const set = useMemo(
    () => generateProblemSet(studentName || "Học sinh", "do-gia-toc-roi-tu-do", "freefall"),
    [studentName]
  );
  const suggestedFall = useMemo(
    () => set.freefall.map((f) => f.s),
    [set]
  );

  const [placed, setPlaced] = useState(() => new Set());
  const [s, setS] = useState(FREEFALL.s.default);       // quãng rơi (m)
  const [balanced, setBalanced] = useState(false);      // giá đỡ đã cân bằng (dây dọi)?
  const [magnetOn, setMagnetOn] = useState(true);       // nam châm đang giữ trụ thép
  const [rolling, setRolling] = useState(false);
  const [fallY, setFallY] = useState(Y0);               // vị trí trụ thép khi rơi
  const [cylDrag, setCylDrag] = useState(null);         // {x,y} khi HS kéo trụ thép lên gắn lại

  const [mode, setMode] = useState("A+B");              // trung tính — HS tự chỉnh núm
  const [scale, setScale] = useState("fine");
  const [power, setPower] = useState(false);
  const [face, setFace] = useState("front");
  const [wires, setWires] = useState({ A: null, B: null }); // A ← switch, B ← gate (ổ đồng hồ)
  const [magnetWire, setMagnetWire] = useState(false);      // dây công tắc kép → nam châm điện
  const [wireDrag, setWireDrag] = useState(null);

  const [led, setLed] = useState(zeroDisplay("fine"));
  const [trials, setTrials] = useState([]);
  const [toast, setToast] = useState(null);
  const [dragTool, setDragTool] = useState(null);
  const [flyTool, setFlyTool] = useState(null);
  const [justRolled, setJustRolled] = useState(false);

  const [chatQ, setChatQ] = useState("");
  const [chatA, setChatA] = useState(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", text: "Chào em! Mình là Trợ lý Phylab. Em cần hỗ trợ gì về bài thí nghiệm này?" }
  ]);
  const chatScrollRef = useRef(null);
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory]);
  const [isMobile, setIsMobile] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false); // Google Maps bottom sheet
  const [zoomMode, setZoomMode] = useState("full"); // "full", "rail", "clock"
  const [controlsOpen, setControlsOpen] = useState(false);
  const [ballDrag, setBallDrag] = useState(null); // {x,y} screen khi kéo bi về
  const [aiDeBai, setAiDeBai] = useState("");
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const rafRef = useRef(null);
  const mainRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const required = TOOLS.map((t) => t.k);
  const GROUPS = [["rail"], ["magnet"], ["switch", "gate"], ["clock"]];
  const reqSet = new Set(required);
  const activeGroup = GROUPS.find((g) => g.some((k) => reqSet.has(k) && !placed.has(k))) || [];
  const isNextTool = (k) => activeGroup.includes(k) && reqSet.has(k) && !placed.has(k);
  const assembled = required.every((k) => placed.has(k));

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2400); };
  // Mạch bài 11: công tắc→nam châm (magnetWire) + công tắc→ổ A + cổng quang→ổ B.
  const wiredOK = magnetWire && wires.A === "switch" && wires.B === "gate";
  const modeOK = mode === "A<->B";
  const setupDone = assembled && balanced && wiredOK && power && modeOK;
  const deBai = setupDone ? (aiDeBai || set.prompt) : "";
  const zeroLed = zeroDisplay(scale);
  const isReset = led === zeroLed;
  const currentTargets = set.freefall;
  const currentTaskIndex = clamp(activeTaskIndex, 0, Math.max(0, currentTargets.length - 1));
  const currentTask = currentTargets[currentTaskIndex];
  const isTargetMeasured = (target) => !!target && trials.some((t) => Math.abs(t.s - target.s) < 1e-6);
  const currentTaskTrial = currentTask ? trials.find((t) => Math.abs(t.s - currentTask.s) < 1e-6) : null;

  useEffect(() => {
    setActiveTaskIndex(0);
  }, [studentName]);

  useEffect(() => {
    if (!currentTargets.length) return;
    const next = currentTargets.findIndex((target) => !isTargetMeasured(target));
    if (next >= 0 && next !== activeTaskIndex) setActiveTaskIndex(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trials.length, currentTargets.length]);

  function placeTool(k) {
    if (placed.has(k)) return;
    if (!isNextTool(k)) { flash(`Lắp theo thứ tự — bước này: ${activeGroup.map((x) => TOOLS.find((t) => t.k === x)?.name).join(" / ")}.`); return; }
    setPlaced((p) => new Set(p).add(k));
  }
  function targetVB(k) {
    switch (k) {
      case "rail":   return { x: RAILX, y: (Y0 + FLOOR) / 2 };
      case "magnet": return { x: RAILX, y: Y0 - 14 };
      case "switch": return { x: SWITCH.x + SWITCH_W / 2, y: SWITCH.y + SWITCH_H / 2 };
      case "gate":   return { x: RAILX, y: gateY(s) };
      case "clock":  return { x: CLK.x + 50, y: CLK.y + 40 };
      default:       return { x: VBW / 2, y: VBH / 2 };
    }
  }
  function flyToPlace(k, x, y) {
    const tgt = targetVB(k), dur = 340;
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
      const tgt = targetVB(k);
      if (!svg || !moved) { flyToPlace(k, tgt.x, tgt.y - 60); return; }
      
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
      const threshold = 100;
      if (Math.hypot(vbx - tgt.x, vby - tgt.y) < threshold) flyToPlace(k, vbx, vby);
      else flash(`Kéo "${TOOLS.find((t) => t.k === k).name}" vào ô sáng trên bàn để lắp.`);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  const steps = useMemo(() => {
    return assembled ? [
      { k: "balance", t: "Vặn vít cân bằng giá đỡ (dây dọi)", done: balanced },
      { k: "wireMag", t: "Nối dây công tắc kép → nam châm điện", done: magnetWire },
      { k: "wire", t: "Nối công tắc→A, cổng quang→B (mặt sau)", done: wires.A === "switch" && wires.B === "gate" },
      { k: "power", t: "Bật nguồn đồng hồ (mặt sau)", done: power },
      { k: "mode", t: "Chọn MODE A↔B", done: modeOK },
      { k: "reset", t: "Reset trước khi thả", done: isReset },
      { k: "release", t: "Nhấn vào hộp công tắc kép để thả trụ thép", done: !magnetOn && led !== zeroLed },
    ] : required.map((k) => ({ k, t: `Lắp: ${TOOLS.find((t) => t.k === k).name}`, done: placed.has(k) }));
  }, [assembled, balanced, magnetWire, wires.A, wires.B, power, modeOK, isReset, magnetOn, led, zeroLed, required, placed]);

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
      } else if (["wireMag", "wire", "power", "mode", "reset"].includes(nextStepKey)) {
        target = "clock";
      }
    }
    const timer = setTimeout(() => {
      setZoomMode(target);
    }, 0);
    return () => clearTimeout(timer);
  }, [assembled, isMobile, nextStepKey]);

  function resetTimer() { cancelAnimationFrame(rafRef.current); setRolling(false); setLed(zeroDisplay(scale)); setJustRolled(false); }
  function magnetHold() { if (rolling) return; setMagnetOn(true); setFallY(Y0); setCylDrag(null); }

  function release() {
    if (rolling) return;
    if (!assembled) { flash("Hãy lắp đủ dụng cụ (kể cả đồng hồ) trước khi thả."); return; }
    if (!balanced) { flash("Chưa cân bằng giá đỡ — vặn vít cho dây dọi thẳng đã."); return; }
    if (!power) { flash("Chưa bật nguồn đồng hồ (mặt sau)."); return; }
    if (!magnetWire) { flash("Chưa nối dây công tắc kép → nam châm điện."); return; }
    if (!(wires.A === "switch" && wires.B === "gate")) { flash("Chưa nối dây: công tắc→ổ A, cổng quang→ổ B."); return; }
    setMagnetOn(false); runFall();
  }

  function runFall() {
    if (rolling) return;
    const res = computeFallTime({ s, balanced, scale });
    const sc = FREEFALL.scales[scale];
    const yGate = gateY(s);
    const yRest = FLOOR - 24;                          // trụ thép rơi HẲN xuống chân đế
    const base = parseFloat(led) || 0;                // CỘNG DỒN nếu HS chưa Reset (giống MC964 thật)
    const measured = res.valid ? res.raw : 0;
    const finalShown = Math.round((base + measured) / sc.res) * sc.res;
    const uGate = clamp((yGate - Y0) / (yRest - Y0), 0.001, 1); // mốc chuyển động khi qua cổng
    setRolling(true); setJustRolled(false);           // KHÔNG xoá LED — để cộng dồn
    const dur = 1100, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const u = p * p;                                // gia tốc: nhanh dần
      setFallY(Y0 + (yRest - Y0) * u);
      if (res.valid && mode !== "T") {
        const prog = clamp(u / uGate, 0, 1);          // đồng hồ chỉ đếm tới khi trụ qua cổng
        const jitter = prog > 0 && prog < 1 ? (0.9 + 0.2 * Math.random()) : 1;
        setLed((base + measured * prog * jitter).toFixed(sc.dp));
      }
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { setLed(res.valid ? finalShown.toFixed(sc.dp) : base.toFixed(sc.dp)); setRolling(false); setJustRolled(res.valid); }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function recordTrial() {
    if (rolling) return;
    if (led === zeroLed) { flash("Chưa có số đo — thả trụ thép trước."); return; }
    const t = parseFloat(led);
    setTrials((tr) => [...tr, { id: tr.length + 1, lab: "freefall", s: +s.toFixed(3), t, g: gFromMeasurement(s, t), balanced }]);
    setJustRolled(false);
    flash(`Đã ghi lần đo #${trials.length + 1}.`);
  }
  function exportNote() {
    if (!trials.length) { flash("Chưa có số liệu để xuất."); return; }
    onExportNote?.({ lab: "freefall", trials }); flash("Đã gửi số liệu sang Sổ Báo Cáo.");
  }
  // Thoát phòng lab — hỏi xác nhận nếu còn số liệu chưa xuất Note.
  function handleExit() {
    if (!onBack) return;
    if (trials.length > 0 && !window.confirm(`Bạn có ${trials.length} lần đo chưa xuất sang Sổ Báo Cáo. Thoát phòng lab và bỏ số liệu này?`)) return;
    onBack();
  }
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
      labId: "b11",
      lab: "freefall",
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
      objectAtBottom: !magnetOn && !rolling && fallY > Y0,
      trialsCount: trials.length,
      targetCount,
      currentTask: currentTask ? {
        index: currentTaskIndex + 1,
        s: currentTask.s,
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
  const dragCyl = useCallback((e) => {
    if (rolling || magnetOn) return; e.stopPropagation();
    const startX = e.clientX, startY = e.clientY, startTime = Date.now();
    const { svg } = evVB(e, e.currentTarget);
    const move = (ev) => { const p = evVB(ev, svg); setCylDrag({ x: p.x, y: p.y }); };
    const up = (ev) => {
      const isClick = Math.hypot(ev.clientX - startX, ev.clientY - startY) < 10 && (Date.now() - startTime) < 300;
      if (isMobile && isClick) {
        setMagnetOn(true); setFallY(Y0); setCylDrag(null);
        flash("Đã gắn trụ thép lại vào nam châm");
      } else {
        const p = evVB(ev, svg);
        if (Math.hypot(p.x - RAILX, p.y - Y0) < 64) { setMagnetOn(true); setFallY(Y0); }
        setCylDrag(null);
      }
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }, [rolling, magnetOn, isMobile]);

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
          setMagnetWire((prev) => {
            const next = !prev;
            flash(next ? "Đã nối dây công tắc → nam châm" : "Đã rút dây công tắc → nam châm");
            return next;
          });
        } else if (src === "switch") {
          setWires((w) => {
            const next = w.A === "switch" ? null : "switch";
            flash(next ? "Đã nối dây công tắc → ổ A" : "Đã rút dây công tắc");
            return { ...w, A: next };
          });
        } else if (src === "gate") {
          setWires((w) => {
            const next = w.B === "gate" ? null : "gate";
            flash(next ? "Đã nối dây cổng quang → ổ B" : "Đã rút dây cổng quang");
            return { ...w, B: next };
          });
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
  }, [rolling, isMobile]);
  const unplug = (sock) => setWires((w) => ({ ...w, [sock]: null }));

  const targetCount = suggestedFall.length;
  const placedCount = required.filter((k) => placed.has(k)).length;
  const tip = guide({
    labId: "b11", lab: "freefall", assembled,
    activeGroupNames: activeGroup.map((k) => TOOLS.find((t) => t.k === k)?.name).filter(Boolean),
    placedCount, requiredCount: required.length,
    balanced, power, wiredOK, modeOK, isReset, rolling,
    ballAtEnd: !magnetOn && !rolling && fallY > Y0, justMeasured: justRolled,
    trialsCount: trials.length, targetCount,
    assistantSettings,
  });
  const tone = TONE[tip.tone] || C.navy;

  // TTS: đọc chỉ dẫn khi nội dung đổi (TTS của RealPhyLab)
  const lastSpoken = useRef("");
  useEffect(() => {
    if (speak && tip.text && tip.text !== lastSpoken.current) {
      lastSpoken.current = tip.text;
      speak(tip.text);
    }
  }, [tip.text, speak]);

  // Sau khi lắp/nối xong → Trợ lý (Smartbot) diễn đạt đề bài theo bộ quãng rơi của HS.
  useEffect(() => {
    if (!setupDone) {
      if (aiDeBai !== "") {
        setTimeout(() => setAiDeBai(""), 0);
      }
      return;
    }
    let cancel = false;
    fetch("/api/vnpt/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "problem", labKind: "freefall", targets: set.freefall, prompt: set.prompt, assistantSettings }),
    })
      .then((r) => r.json())
      .then((d) => { if (!cancel && d?.message) setAiDeBai(d.message); })
      .catch(() => {});
    return () => { cancel = true; };
  }, [setupDone, studentName, aiDeBai, set]);

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
            {steps.map((st, i) => (
              <div key={st.k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: isMobile ? 12.5 : 13.5, transition: "opacity .3s", opacity: st.done ? 0.55 : 1 }}>
                <span style={{ width: 18, height: 18, borderRadius: 6, border: `1.6px solid ${st.done ? C.good : C.line}`, background: st.done ? C.good : "#fff", color: st.done ? "#fff" : C.sub, display: "grid", placeItems: "center", fontSize: 10, fontWeight: "bold", flexShrink: 0 }}>
                  {st.done ? <Check className="w-2.5 h-2.5 stroke-[3] text-white" /> : i + 1}
                </span>
                <span style={{ color: st.done ? C.sub : C.ink, textDecoration: st.done ? "line-through" : "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {st.t}
                </span>
              </div>
            ))}
          </div>
          {setupDone && <>
            <div style={{ ...sideTitle, marginTop: 12 }}>Đề bài Trợ lý giao — tự chỉnh s rồi đo</div>
            {deBai && <div style={{ fontSize: isMobile ? 11.5 : 13, color: C.sub, lineHeight: 1.5, marginBottom: 6, fontStyle: "italic", whiteSpace: "pre-line" }}><MathText text={deBai} /></div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {set.freefall.map((sT, i) => {
                const used = trials.some((t) => Math.abs(t.s - sT.s) < 1e-6);
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 9px", borderRadius: 7, border: `1px solid ${C.line}`, background: used ? "#F3F8F3" : C.bg, fontSize: isMobile ? 11.5 : 12.5, color: C.ink }}>
                    <span>Câu {i + 1}: s={(sT.s * 100).toFixed(0)}cm</span>
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
            {justRolled && <span style={{ fontSize: isMobile ? 12.5 : 11, color: C.sub, marginLeft: "auto" }}>g ≈ <b style={{ color: C.ink }}>{gFromMeasurement(s, parseFloat(led)).toFixed(2)}</b></span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8, maxHeight: isMobile ? 200 : 140, overflow: "auto" }}>
            {trials.map((t) => (
              <div key={t.id} style={{ fontSize: isMobile ? 13.5 : 13, color: C.sub, display: "flex", justifyContent: "space-between", padding: isMobile ? "7px 10px" : "4px 8px", background: C.bg, borderRadius: 6 }}>
                <span>#{t.id} s={(t.s * 100).toFixed(0)}cm</span>
                <span style={{ color: C.ink, fontWeight: 700 }}>{t.t.toFixed(scale === "fine" ? 3 : 2)}s · g={t.g.toFixed(2)}</span>
              </div>
            ))}
            {!trials.length && <div style={{ fontSize: isMobile ? 12 : 13, color: C.sub2 || C.sub, fontStyle: "italic" }}>Chưa có lần đo. Reset → thả trụ thép → Ghi số liệu.</div>}
          </div>
          <button onClick={recordTrial} style={{ ...btnNavy, width: "100%", marginBottom: 8 }}>Ghi số liệu</button>
          <button onClick={exportNote} style={{ ...btnBig, width: "100%" }}>Xuất sang Sổ Báo Cáo</button>
        </section>
      )}
    </>
  );

  return (
    <div className="phy-screen" style={{ flex: 1, minHeight: 0, overflow: "hidden", background: C.bg, fontFamily: FONT, display: "flex", flexDirection: "column" }}>
      <div style={isMobile
        ? { display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, background: "#fff", flexShrink: 0 }
        : { display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", borderBottom: `1px solid ${C.line}`, background: "#fff" }
      }>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          {onBack && <button onClick={handleExit} style={btnGhost}>← Thoát</button>}
          {onReplayPrelab && <button onClick={() => onReplayPrelab?.()} style={{ ...btnGhost, color: C.navy, fontSize: 12 }}>Xem lại Prelab</button>}
          <div style={{ fontSize: 12, color: C.sub }}>g lý thuyết = <b style={{ color: C.ink }}>{FREEFALL.g} m/s²</b></div>
        </div>
        
        <div style={{ textAlign: "center", width: "100%", fontSize: 13, fontWeight: 800, color: C.ink }}>
          Bài 11 — Đo gia tốc rơi tự do
        </div>
      </div>

      <div style={isMobile 
        ? { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", position: "relative" }
        : { flex: 1, display: "grid", gridTemplateColumns: "minmax(220px, 14vw) 1fr minmax(360px, 24vw)", minHeight: 0 }
      }>
        {/* TRÁI: dụng cụ */}
        {(!isMobile || !assembled) && (
          <aside style={isMobile
            ? { background: "#fff", borderBottom: `1px solid ${C.line}`, padding: "8px 12px", display: "flex", gap: 8, overflowX: "auto", whiteSpace: "nowrap", flexShrink: 0 }
            : { borderRight: `1px solid ${C.line}`, background: "#fff", overflow: "auto", padding: 12 }
          }>
            {!isMobile && <div style={sideTitle}>Dụng cụ ({placedCount}/{required.length})</div>}
            {TOOLS.map((t) => {
              const done = placed.has(t.k), isNext = isNextTool(t.k);
              return (
                <div key={t.k}
                  onPointerDown={(e) => {
                    if (!isMobile || (isMobile && isNext && !done)) startToolDrag(t.k, e);
                  }}
                  onClick={() => {
                    if (isMobile && isNext && !done) {
                      flash(`Kéo ô "${t.name}" vào khung lab để lắp.`);
                    }
                  }}
                  style={{ display: "flex", alignItems: "center", gap: isMobile ? 9 : 12, padding: isMobile ? "4px 8px" : "11px 13px", borderRadius: 12, marginBottom: isMobile ? 0 : 7, cursor: done ? "default" : (isMobile && !isNext ? "default" : "grab"), touchAction: isMobile && isNext && !done ? "none" : (isMobile ? "pan-x" : "none"), flexShrink: 0, minWidth: isMobile ? 160 : "auto",
                    border: `1.5px solid ${done ? C.good : isNext ? C.orange : C.line}`, background: done ? "#F3F8F3" : "#fff", opacity: done ? 0.7 : 1, boxShadow: isNext ? `0 0 0 3px ${C.orange}22` : "none" }}>
                  <div style={{ width: isMobile ? 24 : 56, height: isMobile ? 24 : 56, display: "grid", placeItems: "center", background: C.bg, borderRadius: 8, flexShrink: 0 }}>
                    <img src={t.img} alt="" style={{ maxWidth: isMobile ? 18 : 44, maxHeight: isMobile ? 18 : 44, objectFit: "contain" }} />
                  </div>
                  <div style={{ minWidth: 0, textAlign: "left", flex: 1 }}>
                    <div style={{ fontSize: isMobile ? 11 : 13.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                    <div style={{ fontSize: isMobile ? 9 : 10.5, color: done ? C.good : isNext ? C.orangeDk : C.sub }}>
                      {done ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><Check className="w-2.5 h-2.5 stroke-[3]" /> Đã lắp</span>
                      ) : isNext ? (
                        isMobile ? "Kéo tay cầm" : "Kéo vào bàn"
                      ) : (
                        t.sub
                      )}
                    </div>
                  </div>
                  {isMobile && isNext && !done && (
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startToolDrag(t.k, e);
                      }}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: C.orange,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "grab",
                        touchAction: "none",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                        flexShrink: 0
                      }}
                      title="Kéo dụng cụ vào bàn"
                    >
                      <Hand className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </aside>
        )}

        {/* GIỮA: workbench */}
        <main ref={mainRef} style={{ position: "relative", overflow: isMobile ? "auto" : "hidden", padding: 10, display: "flex", flexDirection: "column", minHeight: 0, flex: 1, outline: dragTool ? `2px dashed ${C.orange}` : "none", outlineOffset: -6, gap: isMobile ? 12 : 0, paddingBottom: isMobile ? 80 : 10 }}>


          <FallScene
            placed={placed} s={s} balanced={balanced} magnetOn={magnetOn} rolling={rolling} fallY={fallY} cylDrag={cylDrag}
            wires={wires} magnetWire={magnetWire} wireDrag={wireDrag} face={face} led={led} mode={mode} scale={scale} power={power}
            dropTarget={!assembled ? activeGroup.filter((k) => reqSet.has(k) && !placed.has(k)) : []} flyTool={flyTool}
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
            zoomMode={zoomMode}
            setZoomMode={setZoomMode}
            highlightStep={nextStepKey}
          />
          {false && isMobile && assembled && (
            <div style={{ position: "absolute", top: 76, right: 10, zIndex: 36, pointerEvents: "none" }}>
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
                    onClick={() => { setBalanced(true); flash("Đã cố định vít cân bằng giá đỡ."); }}
                    disabled={!placed.has("rail")}
                    style={{ minWidth: 118, border: `1px solid ${balanced ? C.good : C.orange}`, background: balanced ? "#F3F8F3" : "#FFF7EF", color: balanced ? C.good : C.orangeDk, borderRadius: 12, padding: "9px 10px", fontSize: 11, fontWeight: 900, opacity: placed.has("rail") ? 1 : 0.45 }}
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
                  <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 8, background: C.bg, minWidth: 180 }}>
                    <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 900, marginBottom: 6 }}>Cổng quang · s={(s * 100).toFixed(0)}cm</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <button type="button" disabled={!placed.has("gate")} onClick={() => setS((v) => clamp(+(v - 0.01).toFixed(2), FREEFALL.s.min, FREEFALL.s.max))} style={mobileAdjustBtn}>-1cm</button>
                      <button type="button" disabled={!placed.has("gate")} onClick={() => setS((v) => clamp(+(v + 0.01).toFixed(2), FREEFALL.s.min, FREEFALL.s.max))} style={mobileAdjustBtn}>+1cm</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {isMobile && (
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
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => { setBalanced(true); flash("Đã cố định vít cân bằng giá đỡ."); }}
                        disabled={!placed.has("rail")}
                        style={{ border: `1px solid ${balanced ? C.good : C.orange}`, background: balanced ? "#F3F8F3" : "#FFF7EF", color: balanced ? C.good : C.orangeDk, borderRadius: 14, padding: "13px 10px", fontSize: 12, fontWeight: 900, opacity: placed.has("rail") ? 1 : 0.45 }}
                      >
                        Cố định vít
                      </button>
                      <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 10, background: C.bg }}>
                        <div style={{ fontSize: 11.5, color: C.sub, fontWeight: 900, marginBottom: 8 }}>s={(s * 100).toFixed(0)}cm</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <button type="button" disabled={!placed.has("gate")} onClick={() => setS((v) => clamp(+(v - 0.01).toFixed(2), FREEFALL.s.min, FREEFALL.s.max))} style={mobileAdjustBtn}>-1cm</button>
                          <button type="button" disabled={!placed.has("gate")} onClick={() => setS((v) => clamp(+(v + 0.01).toFixed(2), FREEFALL.s.min, FREEFALL.s.max))} style={mobileAdjustBtn}>+1cm</button>
                        </div>
                      </div>
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
                      onClick={() => { setBalanced(true); flash("Đã cố định vít cân bằng giá đỡ."); }}
                      disabled={!placed.has("rail")}
                      style={{ minWidth: 118, border: `1px solid ${balanced ? C.good : C.orange}`, background: balanced ? "#F3F8F3" : "#FFF7EF", color: balanced ? C.good : C.orangeDk, borderRadius: 12, padding: "9px 10px", fontSize: 11, fontWeight: 900, opacity: placed.has("rail") ? 1 : 0.45 }}
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
                  <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 8, background: C.bg, minWidth: 180 }}>
                    <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 900, marginBottom: 6 }}>Cổng quang · s={(s * 100).toFixed(0)}cm</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <button type="button" disabled={!placed.has("gate")} onClick={() => setS((v) => clamp(+(v - 0.01).toFixed(2), FREEFALL.s.min, FREEFALL.s.max))} style={mobileAdjustBtn}>-1cm</button>
                      <button type="button" disabled={!placed.has("gate")} onClick={() => setS((v) => clamp(+(v + 0.01).toFixed(2), FREEFALL.s.min, FREEFALL.s.max))} style={mobileAdjustBtn}>+1cm</button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7, minWidth: 330 }}>
                    {[
                      { title: "Nối dây", body: "Chạm chốt công tắc/nam châm/cổng quang để nối đúng các dây tín hiệu.", active: !wiredOK },
                      { title: "Đồng hồ", body: "Zoom Đồng hồ, lật mặt sau để bật nguồn; mặt trước chọn A↔B và Reset.", active: !power || !modeOK || !isReset },
                      { title: "Thả trụ", body: "Khi trụ đang ở nam châm và số đo 0.000, bấm công tắc kép để thả.", active: isReset && wiredOK && power && modeOK },
                    ].map((hint) => (
                      <button
                        key={hint.title}
                        type="button"
                        onClick={() => setZoomMode(hint.title === "Đồng hồ" ? "clock" : "rail")}
                        style={{ textAlign: "left", border: `1px solid ${hint.active ? C.orange : C.line}`, background: hint.active ? "#FFF7EF" : "#fff", borderRadius: 12, padding: "9px 8px", color: C.ink, minHeight: 92 }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 999, background: hint.active ? C.orange : C.bg, color: hint.active ? "#fff" : C.sub, fontSize: 10, fontWeight: 900, marginBottom: 6 }}>
                          {hint.title === "Thả trụ" ? <Play className="w-3 h-3" /> : <Hand className="w-3 h-3" />}
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
                /* Sau khi lắp xong: hiện ĐỀ BÀI + bảng ghi số liệu ngay trong luồng chính. */
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
                                s={(currentTask.s * 100).toFixed(0)}cm
                              </div>
                            </div>
                            <span style={{ flexShrink: 0, color: currentTaskTrial ? C.good : (justRolled ? C.orangeDk : C.sub), fontSize: 12, fontWeight: 900, textAlign: "right" }}>
                              {currentTaskTrial ? `Đã ghi ${currentTaskTrial.t.toFixed(scale === "fine" ? 3 : 2)}s` : `Số đo ${led}s`}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <button
                              type="button"
                              onClick={recordTrial}
                              style={{ ...btnNavy, width: "100%", padding: "10px 8px", fontSize: 12.5 }}
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
                      {deBai && (
                        <details style={{ fontSize: 12, color: C.sub }}>
                          <summary style={{ cursor: "pointer", fontWeight: 900, color: C.orangeDk }}>Xem toàn bộ đề bài</summary>
                          <div style={{ marginTop: 8, lineHeight: 1.5, whiteSpace: "pre-line" }}><MathText text={deBai} /></div>
                        </details>
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

        {/* PHẢI / BOTTOM SHEET: Trợ lý / Tiến trình / Điều kiện / Ghi số liệu */}
        {isMobile ? (
          <motion.div
            animate={{ height: sheetOpen ? "78%" : 48 }}
            transition={{ type: "spring", damping: 20, stiffness: 180 }}
            style={{
              position: "absolute",
              bottom: sheetOpen ? 0 : 12,
              left: sheetOpen ? 0 : "auto",
              right: sheetOpen ? 0 : 12,
              width: sheetOpen ? "auto" : "min(220px, calc(100% - 24px))",
              background: "#FFFBF7",
              border: `2px solid ${C.line}`,
              borderRadius: sheetOpen ? "24px 24px 0 0" : 18,
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
              style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", flexShrink: 0, background: "#FFFBF7", borderBottom: sheetOpen ? `1px solid ${C.line}` : "none", touchAction: "none", padding: "0 14px" }}
            >
              <span style={{ fontSize: 11, fontWeight: 900, color: C.orange, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {sheetOpen ? "Trợ lý Phylab" : "Hỏi Phylab"}
              </span>
              {sheetOpen ? (
                <ChevronDown className="w-4 h-4 text-[#C85A17]" />
              ) : (
                <ChevronUp className="w-4 h-4 text-[#C85A17]" />
              )}
            </div>
            
            {/* Sheet body */}
            <div style={{ flex: 1, overflow: "auto", padding: "0 12px 24px", display: sheetOpen ? "flex" : "none", flexDirection: "column", gap: 12 }}>
              {assembled 
                ? renderSideContent({ assistant: true, progress: false, data: false })
                : renderSideContent({ assistant: true, progress: true, data: false })
              }
            </div>
          </motion.div>
        ) : (
          <aside style={{ borderLeft: `1px solid ${C.line}`, background: C.bg, overflow: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {renderSideContent()}
          </aside>
        )}
      </div>
    </div>
  );
}

/* ============================ FallScene ============================ */
function FallScene(props) {
  const { placed, s, balanced, magnetOn, rolling, fallY, cylDrag, wires, magnetWire, wireDrag, face, led, mode, scale, power,
    dropTarget = [], flyTool = null, onDragGate, onDragCyl, onDragWire, onUnplug,
    onRelease, onToggleBalance, onFlip, onCycleMode, onReset, onToggleScale, onTogglePower, onCanvasTap,
    zoomMode, setZoomMode, highlightStep } = props;

  const zoomClock = zoomMode === "clock";
  const setZoomClock = (val) => setZoomMode(val ? "clock" : "full");
  const has = (k) => placed.has(k);
  const yGate = gateY(s);
  const cylY = magnetOn && !rolling ? Y0 : fallY;
  const cylGrab = !magnetOn && !rolling;                 // trụ đã rơi -> HS kéo lên gắn lại

  const viewBoxStr =
    zoomMode === "clock" ? "540 290 330 190" :
    zoomMode === "rail" ? "200 40 500 440" :
    (props.isMobile ? "55 25 645 540" : `0 0 ${VBW} ${VBH}`);
  // Trên mobile: bỏ letterbox — SVG tự cao theo tỉ lệ viewBox để máng đứng cao & rõ.
  const [, , vbW, vbH] = viewBoxStr.split(" ").map(Number);
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
        viewBox={viewBoxStr} preserveAspectRatio="xMidYMid meet"
        style={props.isMobile
          ? { flex: "none", flexShrink: 0, width: "100%", aspectRatio: `${vbW} / ${vbH}`, height: "auto", maxHeight: "79vh", minHeight: 312, display: "block", background: "linear-gradient(#ffffff,#FBF6EC)", borderRadius: 16, border: `1px solid ${C.line}` }
          : { flex: 1, minHeight: 0, width: "100%", height: "100%", display: "block", background: "linear-gradient(#ffffff,#FBF6EC)", borderRadius: 16, border: `1px solid ${C.line}`, flexShrink: 1 }}>
        <rect x="0" y={FLOOR} width={VBW} height={VBH - FLOOR} fill="#F1E7D3" />
        <line x1="0" y1={FLOOR} x2={VBW} y2={FLOOR} stroke="#E1D3B6" strokeWidth="2" />

        {/* Máng đứng — rail.png đã gồm CẢ giá đỡ 3 chân (chân kiềng chạm sàn) */}
        {has("rail") && <image href={railPng} x={RAILX - RAIL_W / 2} y={RAIL_TOP} width={RAIL_W} height={RAIL_H} preserveAspectRatio="xMidYMid meet" />}

        {/* Dây dọi + vít cân bằng (bấm vào con vít vàng ở khối kẹp để cân bằng) */}
        {has("rail") && (
          <g>
            <line x1={RAILX + 40} y1={Y0 + 10} x2={RAILX + 40} y2={Y0 + 96} stroke={balanced ? C.good : "#c9a227"} strokeWidth="1.2" strokeDasharray={balanced ? "none" : "3 3"} />
            <circle cx={RAILX + 40} cy={Y0 + 96} r="4" fill={balanced ? C.good : "#c9a227"} />
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

        {/* Trụ thép — giữ ở nam châm / rơi hẳn xuống chân đế / HS kéo lên gắn lại */}
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
            <g onPointerDown={cylGrab ? onDragCyl : undefined} style={{ cursor: cylGrab ? "grab" : "default" }}>
              <circle cx={RAILX} cy={cylY + 11} r="20" fill="transparent" />
              <image href={cylinderSvg} x={RAILX - 7} y={cylY} width="14" height="22" />
            </g>
          );
        })()}
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
            {rolling && cylY >= yGate && <circle cx="0" cy="0" r="4.5" fill="#FF2D2D" />}
            <text x="46" y="-6" textAnchor="middle" fontSize="12" fontWeight="800" fill={C.navy} fontFamily={FONT}>E</text>
            {/* đầu dây kéo được */}
            <circle cx="34" cy="10" r="5" fill={wires.B === "gate" ? C.good : "#C0392B"} stroke="#fff" strokeWidth="1.4" style={{ cursor: "grab" }} onPointerDown={(e) => onDragWire("gate", e)} />
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
            <MC964Inline face={face} led={led} mode={mode} scale={scale} power={power} wires={wires} wireDrag={wireDrag}
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
        {showHint && highlightStep === "wireMag" && face === "back" && (
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
function MC964Inline({ face, led, mode, scale, power, wires, wireDrag, onFlip, onCycleMode, onReset, onToggleScale, onTogglePower, onUnplug }) {
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
const btnGhost = { border: "none", background: "transparent", color: C.sub, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: FONT };
const sideTitle = { fontSize: 12.5, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 };
const cardStyle = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, flexShrink: 0 };
const btnBig = { padding: "11px 20px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: FONT };
const btnNavy = { padding: "10px 20px", borderRadius: 11, border: `1px solid ${C.navy}`, background: "#fff", color: C.navy, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: FONT };
const mobileAdjustBtn = { border: `1px solid ${C.orange}`, background: "#fff", color: C.orangeDk, borderRadius: 10, padding: "9px 6px", fontSize: 12, fontWeight: 900, fontFamily: FONT };
const toastStyle = { position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: C.navy, color: "#fff", padding: "9px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, boxShadow: "0 6px 18px rgba(0,0,0,.2)", maxWidth: 460, textAlign: "center", zIndex: 9999 };
