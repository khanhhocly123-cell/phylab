"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Power, Thermometer } from "lucide-react";
import { C, FONT } from "../../engine/tokens.js";
import { OHM_CONDUCTORS, OHM_SETUP, ohmCircuit, heatedResistance, stepHeat, flickerCount } from "../../engine/physicsElectric";
import {
  LabTopBar, NextStepCard, ChecklistCard, FinishButton, MobileLabSheet, LabToast, LabDialog, ProgressPills, NudgeSlider,
  panelCard, sectionHead, sectionTitle, countPill, btnSecondary, mobileLabColumns,
} from "./LabChrome.jsx";
import { fitViewBox, svgPoint, useBoxSize } from "./stageFit.js";
import { METER_MODES, partCenter, terminalAt, DcSource, SwitchK, Multimeter, Resistor, ohmDisplay } from "./electric/ElectricParts.jsx";
import LiveGraph, { niceRange } from "./LiveGraph.jsx";
import { labSound } from "./labSound.js";
import { flowDuration } from "./animStore.js";

/* ============================================================================
   ElectricalBench — Bài 23 (điện trở · định luật Ohm). Bài 26 ở EmfBench.jsx.

   Linh kiện vẽ bằng SVG ở electric/ElectricParts.jsx; mỗi linh kiện khai báo chốt nối
   trong hệ toạ độ của chính nó. Ở đây chỉ còn BỐ CỤC (vị trí + tỉ lệ từng thiết bị)
   và SƠ ĐỒ NỐI (cặp chốt) — toạ độ chốt được TÍNH từ hình học, không đặt tay.

   ĐO TỰ DO: xoay núm nguồn liên tục 0–10 V, mỗi vật dẫn ≥ 5 điểm. Đồng hồ số chỉ như thật:
   U đọc trên vôn kế hơi khác số trên núm (sụt áp trên ampe kế), chữ số cuối nhảy nhẹ, và vật
   dẫn NÓNG LÊN khi dòng lớn (R tăng, I tụt dần) — mở K cho nguội thì số liệu mới ổn định.
   Đồ thị I–U sống: đường thẳng qua gốc cho "R của em".
   ========================================================================== */

const VBW = 1080;
const VBH = 560;
const ASSET = "/lab/electric";
const edgeKey = (a, b) => [a, b].sort().join("|");

const TOOLS = [
  { k: "source", name: "Nguồn DC", sub: "điều chỉnh 0–10 V", img: `${ASSET}/transformer.svg` },
  { k: "switch", name: "Khóa K", sub: "đóng / ngắt mạch", img: `${ASSET}/switch-k.svg` },
  { k: "ammeter", name: "Đồng hồ ĐO1", sub: "mắc nối tiếp · mA", img: `${ASSET}/multimeter.svg` },
  { k: "conductor", name: "Vật dẫn X / Y", sub: "mẫu điện trở cần đo", img: `${ASSET}/protective-resistor.svg` },
  { k: "voltmeter", name: "Đồng hồ ĐO2", sub: "mắc song song · V", img: `${ASSET}/multimeter.svg` },
];
const GROUPS = [["source"], ["switch", "conductor"], ["ammeter", "voltmeter"]];

/* Bố cục: thiết bị đứng thành một hàng (chân chung y ≈ 330), dây treo võng xuống vùng
   trống bên dưới nên không cắt ngang thân máy. */
const LAYOUT = {
  source: { kind: "source", at: { x: 40, y: 172, s: 1.05 } },
  switch: { kind: "switch", at: { x: 276, y: 227, s: 1.12 } },
  ammeter: { kind: "meter", at: { x: 454, y: 95, s: 1.1 } },
  conductor: { kind: "resistor", at: { x: 634, y: 260, s: 1.25 } },
  voltmeter: { kind: "meter", at: { x: 892, y: 95, s: 1.1 } },
};

/* Chốt nối = (thiết bị, tên chốt trên linh kiện). hot = phía cực dương của mạch (dây đỏ). */
const PORTS = {
  "source+": { part: "source", terminal: "+", label: "Nguồn +", hot: true },
  "source-": { part: "source", terminal: "-", label: "Nguồn −", hot: false },
  "switch-in": { part: "switch", terminal: "in", label: "K1", hot: true },
  "switch-out": { part: "switch", terminal: "out", label: "K2", hot: true },
  "ammeter-mA": { part: "ammeter", terminal: "mA", label: "ĐO1 mA", hot: true },
  "ammeter-COM": { part: "ammeter", terminal: "COM", label: "ĐO1 COM", hot: false },
  "conductor-left": { part: "conductor", terminal: "a", label: "Vật dẫn đầu 1", hot: true },
  "conductor-right": { part: "conductor", terminal: "b", label: "Vật dẫn đầu 2", hot: false },
  "voltmeter-V": { part: "voltmeter", terminal: "V", label: "ĐO2 VΩ", hot: true },
  "voltmeter-COM": { part: "voltmeter", terminal: "COM", label: "ĐO2 COM", hot: false },
};
const EDGES = [
  ["source+", "switch-in"],
  ["switch-out", "ammeter-mA"],
  ["ammeter-COM", "conductor-left"],
  ["conductor-right", "source-"],
  ["voltmeter-V", "conductor-left"],
  ["voltmeter-COM", "conductor-right"],
];
/* Chiều dòng điện (từ cực + qua mạch ngoài về cực −) trên từng dây — để vẽ hạt điện tích chạy. */
const FLOW = [["source+", "switch-in"], ["switch-out", "ammeter-mA"], ["ammeter-COM", "conductor-left"], ["conductor-right", "source-"]];

const REQ = { points: 5, gap: 0.5, span: 5 };     // mỗi vật dẫn ≥ 5 điểm, U cách nhau ≥ 0,5 V, trải ≥ 5 V
const MAX_POINTS = 10;
const SUBJECTS = ["X", "Y"];
const COLORS = { X: OHM_CONDUCTORS.X.color, Y: OHM_CONDUCTORS.Y.color };
const CONDUCTOR_BANDS = {
  X: ["#8B572A", "#DC2626", "#8B572A", "#C9A227"],
  Y: ["#DC2626", "#DC2626", "#8B572A", "#C9A227"],
};

/** Toạ độ màn hình → viewBox (viewBox tự nới theo khung — xem stageFit — nên đổi qua ma trận của SVG). */
function clientToViewBox(svg, clientX, clientY) {
  return svgPoint(svg, clientX, clientY);
}

/** Dây mềm võng xuống giữa hai chốt (giống dây thật trên bàn thí nghiệm). */
function cablePath(a, b) {
  const sag = Math.min(150, 34 + Math.hypot(b.x - a.x, b.y - a.y) * 0.3);
  return `M${a.x} ${a.y} C${a.x} ${a.y + sag},${b.x} ${b.y + sag},${b.x} ${b.y}`;
}

/** R từ đường thẳng I = U/R đi qua gốc toạ độ (bình phương tối thiểu). */
function fitResistance(rows) {
  if (rows.length < 2) return null;
  const suu = rows.reduce((s, r) => s + r.voltage * r.voltage, 0);
  const sui = rows.reduce((s, r) => s + r.voltage * r.current, 0);
  return sui > 0 ? suu / sui : null;
}

const heatWord = (h) => (h < 0.12 ? "nguội" : h < 0.35 ? "hơi ấm" : h < 0.6 ? "ấm lên" : "nóng!");
/** Số đo ôm kế ở thẻ đo: tự đổi thang, hở mạch → OL, mạch còn điện → "(sai)". */
function ohmText(o) {
  const d = ohmDisplay(o.value);
  return d.open ? "OL · hở mạch" : `${d.text} ${d.unit}${o.live ? " (sai)" : ""}`;
}

export default function ElectricalBench({ assignedSets, onExportNote, onBack, onReplayPrelab, speak, muted, onToggleMute, onTour }) {
  // Toạ độ chốt nối TÍNH từ hình học linh kiện + bố cục.
  const ports = useMemo(() => Object.fromEntries(
    Object.entries(PORTS).map(([id, def]) => {
      const part = LAYOUT[def.part];
      return [id, { ...def, ...terminalAt(part.kind, part.at, def.terminal) }];
    })
  ), []);
  const requiredEdges = useMemo(() => new Set(EDGES.map(([a, b]) => edgeKey(a, b))), []);
  // Mốc điện áp giáo viên giao (nếu có) là các mức BẮT BUỘC; ngoài ra học sinh đo tự do.
  const targets = useMemo(() => {
    const pick = (kind) => [...new Set((assignedSets?.[kind] || []).map((item) => +Number(item.voltage).toFixed(1)).filter((v) => v > 0))].sort((a, b) => a - b);
    return { X: pick("ohm-x"), Y: pick("ohm-y") };
  }, [assignedSets]);
  const isTeacherAssigned = targets.X.length + targets.Y.length > 0;

  const [placed, setPlaced] = useState(() => new Set());
  const [wires, setWires] = useState(() => new Set());
  const [dragTool, setDragTool] = useState(null);
  const [flyTool, setFlyTool] = useState(null);
  const [wireDrag, setWireDrag] = useState(null);
  const [pendingPort, setPendingPort] = useState(null);
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [sourceOn, setSourceOn] = useState(false);
  const [switchClosed, setSwitchClosed] = useState(false);
  const [ammeterMode, setAmmeterMode] = useState("OFF");
  const [voltmeterMode, setVoltmeterMode] = useState("OFF");
  const [material, setMaterial] = useState("X");
  const [setting, setSetting] = useState(() => targets.X[0] ?? 2);
  const [heat, setHeat] = useState({ X: 0, Y: 0 });
  const [flick, setFlick] = useState({ a: 0, v: 0 });
  const [rows, setRows] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewportW, setViewportW] = useState(1280);
  const mainRef = useRef(null);
  const wireFrame = useRef(null);
  const toastTimer = useRef(null);
  const lastSpoken = useRef("");
  const milestones = useRef(new Set());
  const nextId = useRef(1);

  const activeGroup = GROUPS.find((group) => group.some((key) => !placed.has(key))) || [];
  const isNextTool = (key) => activeGroup.includes(key) && !placed.has(key);
  const assembled = TOOLS.every((tool) => placed.has(tool.k));
  const wiredOK = wires.size === requiredEdges.size && [...requiredEdges].every((edge) => wires.has(edge));
  const modesOK = ammeterMode === "mA" && voltmeterMode === "V";
  const live = assembled && wiredOK && modesOK && switchClosed && sourceOn;
  const circuit = live ? ohmCircuit(setting, material, heat[material]) : null;
  // Số hiển thị: làm tròn theo độ chia của đồng hồ + chữ số cuối nhảy nhẹ như máy thật.
  const ammeterShown = circuit ? Math.max(0, Math.round(circuit.current * 1e4) / 10 + flick.a * 0.1) : 0;   // mA
  const voltmeterShown = circuit ? Math.max(0, Math.round(circuit.voltage * 1e3) / 1e3 + flick.v * 0.001) : 0; // V
  const rShown = ammeterShown > 0.05 ? voltmeterShown / (ammeterShown / 1000) : null;
  // VOM ở nấc Ω = ôm kế (que VΩ, COM). ĐO2 nối sẵn vào hai đầu vật dẫn → đo thẳng R (nóng thì R tăng).
  // Nguồn đang đẩy dòng qua vật dẫn thì ôm kế cộng cả điện áp đó → số SAI (báo live). ĐO1 không cắm lỗ VΩ → OL.
  const loopWired = FLOW.every(([a, b]) => wires.has(edgeKey(a, b)));
  const powered = assembled && loopWired && switchClosed && sourceOn && (ammeterMode === "mA" || ammeterMode === "µA");
  const ohmAcross = wires.has(edgeKey("voltmeter-V", "conductor-left")) && wires.has(edgeKey("voltmeter-COM", "conductor-right"));
  const ohmRead = (mode, across) => {
    if (mode !== "Ω") return null;
    if (!across) return { value: Infinity, live: false };
    const r = heatedResistance(material, heat[material]);
    return powered ? { value: r + ohmCircuit(setting, material, heat[material]).voltage / 1e-3, live: true } : { value: r, live: false };
  };
  const vmOhm = ohmRead(voltmeterMode, ohmAcross);
  const amOhm = ohmRead(ammeterMode, false);

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 930 || window.matchMedia("(pointer: coarse) and (max-width: 1100px)").matches);
      setIsPortrait(window.innerHeight >= window.innerWidth);
      setViewportW(window.innerWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  useEffect(() => () => {
    if (wireFrame.current) cancelAnimationFrame(wireFrame.current);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  // Vật dẫn nóng lên khi có dòng, nguội dần khi mở K; chữ số cuối đồng hồ "nhảy" nhẹ.
  const warm = heat.X > 0.002 || heat.Y > 0.002;
  useEffect(() => {
    if (!live && !warm) return;
    let tick = 0;
    const id = window.setInterval(() => {
      tick += 1;
      setHeat((old) => {
        const power = live ? ohmCircuit(setting, material, old[material]).power : 0;
        const next = {
          X: stepHeat(old.X, material === "X" ? power : 0, 0.5, live && material === "X"),
          Y: stepHeat(old.Y, material === "Y" ? power : 0, 0.5, live && material === "Y"),
        };
        if (next.X < 0.004 && next.Y < 0.004 && !live) return old.X || old.Y ? { X: 0, Y: 0 } : old;
        // Chỉ cập nhật khi đổi đủ lớn — tránh vẽ lại cả bàn liên tục.
        return Math.abs(next.X - old.X) < 0.004 && Math.abs(next.Y - old.Y) < 0.004 ? old : next;
      });
      if (live && tick % 2 === 0) setFlick({ a: flickerCount(), v: flickerCount() });
    }, 500);
    return () => window.clearInterval(id);
  }, [live, warm, setting, material]);

  /** flash("chữ") hoặc flash({ text, kind: "win" | "warn" }). */
  const flash = (message, voice = false, duration = 2600) => {
    const next = typeof message === "string" ? { text: message } : message;
    setToast((old) => ({ ...next, id: (old?.id || 0) + 1 }));
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), duration);
    if (voice && speak) speak(next.text);
  };
  const sound = (name) => { if (!muted) labSound[name]?.(); };

  // Ôm kế: khen khi đo đúng cách, nhắc khi đo lúc mạch còn điện (mỗi loại một lần).
  const ohmKey = vmOhm ? (vmOhm.live ? "live" : Number.isFinite(vmOhm.value) ? "conductor" : null) : null;
  useEffect(() => {
    if (!ohmKey || milestones.current.has(`ohm-${ohmKey}`)) return;
    milestones.current.add(`ohm-${ohmKey}`);
    const o = ohmDisplay(vmOhm.value);
    const note = ohmKey === "live"
      ? { text: "Không đo Ω khi mạch đang có điện: nguồn đặt điện áp lên vật dẫn nên số chỉ SAI (và dễ hỏng đồng hồ). Mở K hoặc tắt nguồn trước.", kind: "warn" }
      : { text: `Ôm kế đo thẳng vật dẫn ${material}: R ≈ ${o.text} ${o.unit}. So với R = U/I em tính từ số đo — gần bằng nhau! Vật dẫn nóng thì số này tăng.`, kind: "win" };
    const id = window.setTimeout(() => { flash(note, false, 5600); sound(note.kind === "warn" ? "warn" : "win"); }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ohmKey]);

  /* ---------------- Số liệu & yêu cầu ---------------- */
  const rowsOf = (id) => rows.filter((row) => row.material === id);
  const fits = { X: fitResistance(rowsOf("X")), Y: fitResistance(rowsOf("Y")) };
  const spanOf = (id) => { const us = rowsOf(id).map((r) => r.voltage); return us.length ? Math.max(...us) - Math.min(...us) : 0; };
  const missingTargets = (id) => targets[id].filter((v) => !rowsOf(id).some((row) => Math.abs(row.setting - v) < 0.05));
  const subjectDone = (id) => rowsOf(id).length >= REQ.points && spanOf(id) >= REQ.span - 1e-9 && !missingTargets(id).length;
  const canExport = SUBJECTS.every(subjectDone);
  const otherSubject = material === "X" ? "Y" : "X";

  const target = (key) => partCenter(LAYOUT[key].kind, LAYOUT[key].at);
  const placeTool = (key) => {
    if (placed.has(key)) return;
    if (!isNextTool(key)) {
      flash(`Bước này cần lắp: ${activeGroup.map((item) => TOOLS.find((tool) => tool.k === item)?.name).join(" / ")}.`);
      return;
    }
    setPlaced((old) => new Set(old).add(key));
  };
  const flyToPlace = (key, fromX, fromY) => {
    // Tab bị ẩn (rAF dừng) hoặc HS bật "giảm chuyển động" → lắp ngay, không bay.
    if (document.hidden || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { placeTool(key); return; }
    const to = target(key);
    const duration = 260;
    let started = null;
    const step = (now) => {
      if (started === null) started = now;
      const progress = Math.min(1, (now - started) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      setFlyTool({ key, x: fromX + (to.x - fromX) * ease, y: fromY + (to.y - fromY) * ease });
      if (progress < 1) requestAnimationFrame(step);
      else { setFlyTool(null); placeTool(key); }
    };
    requestAnimationFrame(step);
  };
  const startToolDrag = (key, event) => {
    if (placed.has(key)) return;
    event.preventDefault();
    let moved = false;
    let lastX = event.clientX;
    let lastY = event.clientY;
    let frame = null;
    setDragTool({ key, x: lastX, y: lastY });
    const move = (nextEvent) => {
      moved = true;
      lastX = nextEvent.clientX;
      lastY = nextEvent.clientY;
      if (!frame) frame = requestAnimationFrame(() => { frame = null; setDragTool({ key, x: lastX, y: lastY }); });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (frame) cancelAnimationFrame(frame);
      setDragTool(null);
      if (!isNextTool(key)) { placeTool(key); return; }
      const svg = mainRef.current?.querySelector("svg");
      const to = target(key);
      if (!svg || !moved) { flyToPlace(key, to.x, to.y - 70); return; }
      const point = clientToViewBox(svg, lastX, lastY);
      if (Math.hypot(point.x - to.x, point.y - to.y) < 140) flyToPlace(key, point.x, point.y);
      else flash(`Kéo “${TOOLS.find((tool) => tool.k === key)?.name}” vào vòng sáng trên bàn.`);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* ---------------- Nối dây: chạm chốt → chạm đích (hoặc kéo) ---------------- */
  const openEdgesOf = (id) => EDGES.filter(([a, b]) => (a === id || b === id) && !wires.has(edgeKey(a, b)));
  const validTargets = useMemo(() => {
    if (!pendingPort) return new Set();
    return new Set(EDGES.flatMap(([a, b]) => {
      if (wires.has(edgeKey(a, b))) return [];
      return a === pendingPort ? [b] : b === pendingPort ? [a] : [];
    }));
  }, [pendingPort, wires]);
  const connectPorts = (from, to) => {
    const key = edgeKey(from, to);
    if (requiredEdges.has(key)) {
      setWires((old) => new Set(old).add(key));
      setPendingPort(null);
      flash(`Đã nối ${ports[from].label} → ${ports[to].label}.`);
      return true;
    }
    flash(`${ports[from].label} không nối với ${ports[to].label} trong sơ đồ. Chạm một chốt đang sáng.`);
    return false;
  };
  const tapPort = (id) => {
    if (!assembled) { flash("Hãy lắp đủ dụng cụ trước khi nối dây."); return; }
    if (switchClosed || sourceOn) { flash("Mở khóa K và tắt nguồn trước khi nối hoặc đổi dây.", true); return; }
    if (pendingPort) {
      if (pendingPort === id) { setPendingPort(null); return; }
      connectPorts(pendingPort, id);
      return;
    }
    if (!openEdgesOf(id).length) { flash(`Chốt ${ports[id].label} đã nối đủ dây.`); return; }
    setPendingPort(id);
    flash(`Đã chọn ${ports[id].label} — chạm chốt đang sáng để nối.`);
  };
  const startWire = (id, event) => {
    event.stopPropagation();
    if (!assembled || switchClosed || sourceOn || pendingPort || !openEdgesOf(id).length) { tapPort(id); return; }
    const svg = event.currentTarget.closest("svg");
    const initial = { x: event.clientX, y: event.clientY };
    let last = initial;
    let moved = false;
    setPendingPort(id);
    setWireDrag({ id, x: ports[id].x, y: ports[id].y });
    const move = (nextEvent) => {
      last = { x: nextEvent.clientX, y: nextEvent.clientY };
      if (Math.hypot(last.x - initial.x, last.y - initial.y) > 6) moved = true;
      if (!wireFrame.current) wireFrame.current = requestAnimationFrame(() => {
        wireFrame.current = null;
        const point = clientToViewBox(svg, last.x, last.y);
        setWireDrag({ id, x: point.x, y: point.y });
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (wireFrame.current) { cancelAnimationFrame(wireFrame.current); wireFrame.current = null; }
      setWireDrag(null);
      if (!moved) { flash(`Đã chọn ${ports[id].label} — chạm chốt đang sáng để nối.`); return; }
      const point = clientToViewBox(svg, last.x, last.y);
      const candidate = Object.entries(ports)
        .filter(([other]) => other !== id)
        .map(([other, value]) => ({ other, distance: Math.hypot(value.x - point.x, value.y - point.y) }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (candidate && candidate.distance < 48) connectPorts(id, candidate.other);
      else { setPendingPort(null); flash("Chưa thả trúng chốt nào. Có thể chạm lần lượt hai chốt thay vì kéo."); }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const removeWire = (key) => {
    if (switchClosed || sourceOn) { flash("Mở khóa K và tắt nguồn trước khi rút dây."); return; }
    setWires((old) => { const next = new Set(old); next.delete(key); return next; });
    const [a, b] = key.split("|");
    flash(`Đã rút dây ${ports[a].label} – ${ports[b].label}.`);
  };

  /* ---------------- Vận hành ---------------- */
  const cycleMode = (which) => {
    if (switchClosed) { flash("Mở khóa K trước khi xoay núm đồng hồ."); return; }
    const current = which === "a" ? ammeterMode : voltmeterMode;
    const next = METER_MODES[(METER_MODES.indexOf(current) + 1) % METER_MODES.length];
    if (which === "a") setAmmeterMode(next); else setVoltmeterMode(next);
  };
  const toggleSource = () => {
    if (!sourceOn && (!assembled || !wiredOK)) { flash("Chỉ bật nguồn sau khi lắp đủ và nối đúng mạch.", true); return; }
    if (sourceOn && switchClosed) setSwitchClosed(false);
    setSourceOn((value) => !value);
  };
  const toggleSwitch = () => {
    if (!switchClosed && (!assembled || !wiredOK || !modesOK || !sourceOn)) {
      flash(!assembled ? "Chưa lắp đủ dụng cụ." : !wiredOK ? "Mạch chưa nối đủ dây." : !modesOK ? "Xoay ĐO1 về mA và ĐO2 về V trước." : "Hãy bật nguồn DC trước.", true);
      return;
    }
    setSwitchClosed((value) => !value);
  };
  const setKnob = (value) => setSetting(Math.max(OHM_SETUP.source.min, Math.min(OHM_SETUP.source.max, +Number(value).toFixed(1))));
  // Thay vật dẫn là thay linh kiện trong mạch → phải mở K.
  const selectSubject = (id) => {
    if (id === material) return;
    if (switchClosed) { flash("Mở khóa K trước khi thay vật dẫn."); return; }
    setMaterial(id);
    const firstOpen = missingTargets(id)[0];
    if (firstOpen != null) setKnob(firstOpen);
  };

  // Mốc thành tích nhỏ — để việc lấy số liệu có "nhịp" và có điều để khám phá.
  const celebrate = (allRows, row) => {
    const hit = (key) => { if (milestones.current.has(key)) return false; milestones.current.add(key); return true; };
    const mine = allRows.filter((r) => r.material === row.material);
    const fit = fitResistance(mine);
    const bothTwo = allRows.filter((r) => r.material === "X").length >= 2 && allRows.filter((r) => r.material === "Y").length >= 2;
    const us = mine.map((r) => r.voltage);
    const doneNow = mine.length >= REQ.points && Math.max(...us) - Math.min(...us) >= REQ.span - 1e-9;
    const messages = [
      allRows.length === 1 && hit("first") && "Điểm (U, I) đầu tiên đã lên đồ thị!",
      Math.abs(row.voltage - row.setting) > 0.08 && hit("knob") && `Để ý: núm nguồn chỉ ${row.setting.toFixed(1)} V nhưng vôn kế đo ${row.voltage.toFixed(2)} V — một phần điện áp rơi trên ampe kế và dây nối. Luôn ghi số của VÔN KẾ!`,
      mine.length === 2 && hit(`line-${row.material}`) && "Các điểm nằm trên một đường thẳng qua gốc O: I tỉ lệ thuận với U!",
      row.heat > 0.3 && hit("hot") && { text: "Vật dẫn đang nóng lên → R tăng, I tụt dần (điểm viền đỏ). Mở K vài giây cho nguội rồi đo tiếp để số liệu ổn định!", kind: "warn" },
      doneNow && hit(`done-${row.material}`) && `Đủ ${REQ.points} điểm vật dẫn ${row.material}: R ≈ ${fit.toFixed(1)} Ω.`,
      bothTwo && hit("compare") && "Đường nào DỐC hơn thì điện trở NHỎ hơn: vật dẫn X dốc hơn Y → R_X < R_Y.",
      doneNow && mine.every((r) => r.heat < 0.12) && hit(`cool-${row.material}`) && `Số liệu vật dẫn ${row.material} rất ổn định: em luôn đo khi vật dẫn còn nguội!`,
    ].filter(Boolean);
    const last = messages[messages.length - 1];
    if (last) { flash(typeof last === "string" ? { text: last, kind: "win" } : last, false, 4800); sound(last.kind === "warn" ? "warn" : "win"); }
    else { flash(`Đã ghi: ${row.material} · U = ${row.voltage.toFixed(2)} V · I = ${(row.current * 1000).toFixed(1)} mA → R = ${row.resistance.toFixed(1)} Ω`); sound("record"); }
  };
  const record = () => {
    if (!live) { flash("Chưa thể đo: kiểm tra dây, nấc đo, nguồn và khóa K.", true); return; }
    if (ammeterShown <= 0.05) { flash("Dòng điện quá nhỏ — tăng điện áp nguồn rồi đo."); return; }
    const mine = rowsOf(material);
    const near = mine.find((row) => Math.abs(row.voltage - voltmeterShown) < REQ.gap);
    if (near) { flash(`Quá gần điểm U = ${near.voltage.toFixed(2)} V đã ghi — xoay núm nguồn cách xa hơn ${REQ.gap} V.`); return; }
    if (mine.length >= MAX_POINTS) { flash(`Vật dẫn ${material} đã có ${MAX_POINTS} điểm — xoá bớt nếu muốn đo lại.`); return; }
    const current = ammeterShown / 1000;
    const row = { id: nextId.current++, material, setting, voltage: voltmeterShown, current, resistance: voltmeterShown / current, heat: heat[material] };
    const next = [...rows, row];
    setRows(next);
    celebrate(next, row);
  };
  const removeRow = (id) => setRows((old) => old.filter((row) => row.id !== id));
  const doReset = () => {
    setPlaced(new Set());
    setWires(new Set());
    setPendingPort(null);
    setSourceOn(false);
    setSwitchClosed(false);
    setAmmeterMode("OFF");
    setVoltmeterMode("OFF");
    setRows([]);
    setMaterial("X");
    setSetting(targets.X[0] ?? 2);
    setHeat({ X: 0, Y: 0 });
    milestones.current = new Set();
    flash("Đã đặt lại phòng Lab.");
  };
  const reset = () => {
    if (!placed.size && !rows.length) { doReset(); return; }
    setDialog({
      title: "Làm lại từ đầu?",
      message: "Sẽ gỡ dụng cụ, dây nối và xoá số liệu đã ghi.",
      actions: [{ label: "Ở lại", tone: "primary" }, { label: "Làm lại từ đầu", tone: "danger", onClick: doReset }],
    });
  };
  const saveTrials = () => {
    const trials = rows.map((row) => ({
      lab: `ohm-${row.material.toLowerCase()}`, s: row.voltage, t: row.current, config: row.setting,
      expected: OHM_CONDUCTORS[row.material].resistance, voltage: row.voltage, current: row.current,
      resistance: row.resistance, material: row.material, balanced: true,
    }));
    onExportNote({ lab: "ohm", measuredD: 0, trials });
  };
  const exportNote = () => {
    if (!rows.length) { flash("Chưa có số liệu để lưu."); return; }
    if (canExport) { saveTrials(); return; }
    setDialog({
      title: "Chưa đủ số liệu — vẫn lưu?",
      message: `Mỗi vật dẫn cần ≥ ${REQ.points} điểm, U trải ≥ ${REQ.span} V${isTeacherAssigned ? " và đủ các mức GV giao" : ""}. Hiện có X: ${rowsOf("X").length} · Y: ${rowsOf("Y").length} điểm.`,
      actions: [{ label: "Đo tiếp cho đủ", tone: "primary" }, { label: `Vẫn lưu ${rows.length} số đo`, onClick: saveTrials }],
    });
  };
  // Thoát phòng lab — còn số liệu chưa lưu thì hỏi ngay trong Lab (không dùng window.confirm).
  const handleExit = () => {
    if (!rows.length) { onBack?.(); return; }
    setDialog({
      title: "Thoát phòng Lab?",
      message: `Em có ${rows.length} số đo chưa lưu vào Sổ Báo Cáo.`,
      actions: [
        { label: "Lưu vào Sổ Báo Cáo rồi thoát", tone: "primary", onClick: saveTrials },
        { label: "Thoát, bỏ số liệu", tone: "danger", onClick: () => onBack?.() },
        { label: "Ở lại đo tiếp" },
      ],
    });
  };

  // "Làm giúp bước này" — cứu học sinh khi bị kẹt ở một bước lắp/thiết lập.
  const runAssistantAction = (payload) => {
    if (payload === "auto_place_next") {
      const next = activeGroup.find((key) => !placed.has(key));
      if (next) placeTool(next); else flash("Đã lắp đủ dụng cụ.");
      return;
    }
    if (payload === "auto_wire") {
      if (!assembled) { flash("Cần lắp đủ dụng cụ trước khi nối dây."); return; }
      if (switchClosed || sourceOn) { flash("Mở K và tắt nguồn trước khi nối tự động."); return; }
      setWires(new Set(requiredEdges));
      setPendingPort(null);
      flash("Đã nối mạch theo đúng sơ đồ.");
      return;
    }
    if (payload === "auto_mode") {
      if (!placed.has("ammeter") || !placed.has("voltmeter")) { flash("Cần lắp hai đồng hồ trước."); return; }
      if (switchClosed) { flash("Mở khóa K trước khi đổi nấc đo."); return; }
      setAmmeterMode("mA"); setVoltmeterMode("V"); flash("Đã đặt ĐO1 ở mA và ĐO2 ở V."); return;
    }
    if (payload === "auto_power") {
      if (!assembled || !wiredOK) { flash("Cần lắp và nối đúng trước khi bật nguồn."); return; }
      setSourceOn(true); flash("Đã bật nguồn DC."); return;
    }
    if (payload === "auto_switch") {
      if (!assembled || !wiredOK || !modesOK || !sourceOn) { flash("Chưa đủ điều kiện đóng K; hãy hoàn tất lắp dây, nấc đo và nguồn trước."); return; }
      setSwitchClosed(true); flash("Đã đóng khóa K; đồng hồ bắt đầu hiển thị số đo."); return;
    }
    if (payload === "auto_open_switch") { setSwitchClosed(false); flash("Đã mở khóa K — vật dẫn nguội dần."); return; }
    if (payload === "auto_subject") {
      setSwitchClosed(false);
      setMaterial(otherSubject);
      const first = missingTargets(otherSubject)[0];
      if (first != null) setKnob(first);
      flash(`Đã mở K và thay sang vật dẫn ${otherSubject}.`);
    }
  };

  /* ======================= BƯỚC TIẾP THEO (một nguồn sự thật) ======================= */
  const setupDone = assembled && wiredOK && modesOK && sourceOn;
  const mine = rowsOf(material);
  const nearRow = live ? mine.find((row) => Math.abs(row.voltage - voltmeterShown) < REQ.gap) : null;
  const missingNow = missingTargets(material);
  const onTarget = missingNow.some((v) => Math.abs(v - setting) < 0.05);
  const hot = heat[material] > 0.35;
  const nextToolNames = activeGroup.filter((key) => !placed.has(key)).map((key) => TOOLS.find((tool) => tool.k === key)?.name).filter(Boolean);
  // Mức điện áp gợi ý: xa các điểm đã đo nhất.
  const suggestU = (() => {
    if (!mine.length) return null;
    let best = null;
    for (let v = 1; v <= 10; v += 1) {
      const d = Math.min(...mine.map((row) => Math.abs(row.setting - v)));
      if (!best || d > best.d) best = { v, d };
    }
    return best && best.d >= 1 ? best.v : null;
  })();

  let next;
  if (!assembled) {
    next = {
      key: "assemble",
      title: `Lắp ${nextToolNames.join(" / ") || "dụng cụ"}`,
      hint: isMobile
        ? "Chạm dụng cụ đang sáng ở khay bên trái để lắp vào bàn."
        : "Kéo dụng cụ đang sáng ở khay bên trái thả vào vòng (+) trên bàn — hoặc bấm vào nó để lắp nhanh.",
    };
  } else if (!wiredOK) {
    next = {
      key: "wire",
      title: `Nối dây theo sơ đồ (${wires.size}/${requiredEdges.size})`,
      hint: switchClosed || sourceOn
        ? "Mở khóa K và tắt nguồn trước khi nối hoặc đổi dây."
        : pendingPort
          ? `Đã chọn ${ports[pendingPort].label} — chạm chốt đang sáng màu cam để nối (chạm chỗ trống để bỏ chọn).`
          : "Chạm một chốt nối (vòng tròn nét đứt), rồi chạm chốt đích đang sáng. Chạm vào dây để rút.",
      assist: "auto_wire",
    };
  } else if (!modesOK) {
    next = {
      key: "mode",
      title: "Chọn nấc đo: ĐO1 → mA, ĐO2 → V",
      hint: switchClosed ? "Mở khóa K trước, rồi bấm vào núm xoay của từng đồng hồ để chuyển nấc." : "Bấm vào núm xoay của từng đồng hồ để chuyển nấc: ĐO1 tới mA, ĐO2 tới V.",
      assist: "auto_mode",
    };
  } else if (!sourceOn) {
    next = { key: "power", title: "Bật nguồn DC", hint: "Bấm nút tròn BẬT/TẮT trên nguồn DC.", assist: "auto_power" };
  } else if (canExport) {
    next = { key: "done", title: "Đã đủ số liệu cả hai vật dẫn", hint: "Lưu vào Sổ Báo Cáo để vẽ đặc tuyến I–U và tính R — hoặc đo thêm để khám phá.", primaryLabel: "Lưu vào Sổ Báo Cáo", primaryShort: "Lưu" };
  } else if (subjectDone(material)) {
    next = switchClosed
      ? { key: "openK", title: "Mở khóa K", hint: `Đã đủ số liệu vật dẫn ${material}. Mở K trước khi thay sang vật dẫn ${otherSubject}.`, assist: "auto_open_switch" }
      : { key: "subject", title: `Thay sang vật dẫn ${otherSubject}`, hint: `Chọn “Vật dẫn ${otherSubject}” ở thẻ đo bên phải.`, assist: "auto_subject" };
  } else if (missingNow.length && !onTarget) {
    next = { key: "knob", title: `Xoay nguồn tới U = ${missingNow[0].toFixed(1)} V (mốc GV)`, hint: "Kéo núm điện áp trên nguồn, hoặc dùng thanh chỉnh / chip mốc bên phải." };
  } else if (!switchClosed) {
    next = { key: "switch", title: "Đóng khóa K để đọc số", hint: `Đang đặt nguồn ${setting.toFixed(1)} V cho vật dẫn ${material}. Bấm khóa K trên bàn hoặc nút “Đóng K”.`, assist: "auto_switch" };
  } else if (nearRow) {
    next = { key: "knob", title: "Xoay núm nguồn tới mức mới", hint: `U = ${voltmeterShown.toFixed(2)} V quá gần điểm đã ghi (${nearRow.voltage.toFixed(2)} V).${suggestU ? ` Thử khoảng ${suggestU} V.` : ""}` };
  } else if (hot) {
    next = {
      key: "record",
      title: "Vật dẫn đang nóng lên!",
      hint: `R tăng nên I tụt dần (${ammeterShown.toFixed(1)} mA). Mở K vài giây cho nguội rồi đo để số liệu ổn định — hoặc ghi luôn nếu muốn thấy ảnh hưởng của nhiệt.`,
      primaryLabel: "Ghi số đo",
      assist: "auto_open_switch",
    };
  } else {
    next = {
      key: "record",
      title: `Ghi điểm ${Math.min(mine.length + 1, REQ.points)}/${REQ.points} của vật dẫn ${material}`,
      hint: `U = ${voltmeterShown.toFixed(3)} V · I = ${ammeterShown.toFixed(1)} mA → R = ${rShown ? rShown.toFixed(1) : "—"} Ω.${mine.length >= 2 && spanOf(material) < 3 ? " Mẹo: đo cả U nhỏ và U lớn để các điểm trải rộng." : ""}`,
      primaryLabel: "Ghi số đo",
    };
  }
  const phase = !assembled ? 0 : !setupDone ? 1 : !canExport ? 2 : 3;
  // Nút chính của bước hiện tại: ghi số đo đang hiển thị, hoặc lưu sang Sổ Báo Cáo khi đã đủ.
  const handlePrimary = () => (next.key === "record" ? record() : exportNote());
  const speechText = `${next.title}. ${next.hint || ""}`.trim();
  const speechKey = `${next.key}|${next.key === "record" || next.key === "knob" ? material : next.title}`;

  // TTS: đọc bước tiếp theo mỗi khi bước đổi (không đọc lại khi chỉ số liệu trong gợi ý đổi).
  useEffect(() => {
    if (!speak || speechKey === lastSpoken.current) return;
    lastSpoken.current = speechKey;
    speak(speechText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechKey, speak]);

  /* ============================ GIAO DIỆN ============================ */
  const setupItems = [
    { key: "wire", text: `Nối đủ ${requiredEdges.size} dây theo sơ đồ`, done: wiredOK },
    { key: "mode", text: "ĐO1 ở nấc mA · ĐO2 ở nấc V", done: modesOK },
    { key: "power", text: "Bật nguồn DC", done: sourceOn },
  ];
  const referenceCard = (
    <section style={{ ...panelCard, padding: 10 }}>
      <div style={{ ...sectionHead, marginBottom: 4 }}><span style={sectionTitle}>Sơ đồ cần mắc</span></div>
      <div style={{ fontSize: 11.5, lineHeight: 1.45, color: C.ink, fontWeight: 600 }}>
        Nguồn + → K → <b>ĐO1 (mA)</b> → vật dẫn → nguồn −; <b>ĐO2 (V)</b> mắc vào hai đầu vật dẫn. Que đỏ: lỗ mA / VΩ · que đen: COM.
      </div>
    </section>
  );

  /* Thẻ ĐO: hai đồng hồ + R tính ngay + nhiệt độ vật dẫn + tiến độ (viên nhỏ) */
  const measureCard = (
    <section style={{ ...panelCard, padding: 10, border: `1.5px solid ${live ? `${C.good}66` : C.line}`, background: live ? "#F6FBF5" : "#fff" }}>
      <div style={{ display: "flex", gap: 6 }}>
        {SUBJECTS.map((id) => (
          <button type="button" key={id} onClick={() => selectSubject(id)}
            style={material === id ? { ...btnSmall, background: COLORS[id], borderColor: COLORS[id], color: "#fff" } : btnSmall}>
            Vật dẫn {id}{subjectDone(id) ? " ✓" : ""}
          </button>
        ))}
        <button type="button" onClick={toggleSwitch} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12, borderColor: switchClosed ? C.good : C.navy, color: switchClosed ? C.good : C.navy, flexShrink: 0 }}>
          <Power size={13} strokeWidth={2.6} /> {switchClosed ? "Mở K" : "Đóng K"}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 8 }}>
        <div style={{ flex: 1, minWidth: 0, fontFamily: "monospace", fontWeight: 900, lineHeight: 1.3 }}>
          <div style={{ fontSize: 15, color: live ? C.ink : amOhm ? C.navy : C.sub }}><span style={meterTag}>ĐO1</span>{amOhm ? ohmText(amOhm) : live ? `${ammeterShown.toFixed(1)} mA` : "----"}</div>
          <div style={{ fontSize: 15, color: live ? C.ink : vmOhm ? C.navy : C.sub }}><span style={meterTag}>ĐO2</span>{vmOhm ? ohmText(vmOhm) : live ? `${voltmeterShown.toFixed(3)} V` : "----"}</div>
          {vmOhm?.live && <div style={{ fontSize: 10.5, fontWeight: 900, color: "#B45309", fontFamily: FONT }}>Nấc Ω khi mạch còn điện — số chỉ sai</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={miniLabel}>R = U / I</div>
          <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 900, color: COLORS[material], lineHeight: 1.1, whiteSpace: "nowrap" }}>{rShown ? `${rShown.toFixed(1)} Ω` : "—"}</div>
          <div style={{ fontSize: 10.5, fontWeight: 900, color: heat[material] > 0.35 ? "#C2410C" : heat[material] > 0.12 ? C.orangeDk : C.sub }}><Thermometer size={11} strokeWidth={2.8} style={{ display: "inline", verticalAlign: "-1px" }} /> {heatWord(heat[material])}</div>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <ProgressPills items={[
          ...SUBJECTS.map((id) => ({ key: id, label: `${id} `, value: `${Math.min(REQ.points, rowsOf(id).length)}/${REQ.points} · ${spanOf(id).toFixed(1)} V`, done: subjectDone(id), current: id === material && !subjectDone(id), title: `≥ ${REQ.points} điểm, U trải ≥ ${REQ.span} V` })),
          ...(isTeacherAssigned ? [{ key: "gv", label: "Mốc GV ", value: `${SUBJECTS.reduce((s, id) => s + targets[id].length - missingTargets(id).length, 0)}/${targets.X.length + targets.Y.length}`, done: SUBJECTS.every((id) => !missingTargets(id).length) }] : []),
        ]} />
      </div>
    </section>
  );

  const controlsCard = (
    <section style={{ ...panelCard, padding: 10 }}>
      <NudgeSlider
        label="Nguồn DC"
        valueText={`${setting.toFixed(1)} V`}
        value={setting} min={OHM_SETUP.source.min} max={OHM_SETUP.source.max} step={0.1}
        ariaLabel="Điện áp nguồn (V)"
        nudges={[{ label: "−0.5", delta: -0.5 }, { label: "+0.5", delta: 0.5 }]}
        onChange={(v, isDelta) => setKnob(isDelta ? setting + v : v)}
        extra={(targets[material].length > 0 || suggestU) ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7, alignItems: "center" }}>
            {targets[material].length > 0 && <span style={{ fontSize: 10.5, fontWeight: 900, color: C.navy }}>Mốc GV:</span>}
            {targets[material].map((v) => {
              const done = !missingNow.includes(v);
              return <button type="button" key={v} onClick={() => setKnob(v)} style={{ ...choiceButton, ...(done ? { color: C.good, borderColor: `${C.good}88` } : {}) }}>{done ? "✓ " : ""}{v.toFixed(1)} V</button>;
            })}
            {!targets[material].length && suggestU && <button type="button" onClick={() => setKnob(suggestU)} style={{ ...choiceButton, color: C.orangeDk, borderColor: `${C.orange}66` }}>Mức mới gợi ý: {suggestU} V</button>}
          </div>
        ) : null}
      />
    </section>
  );

  const dataCard = (
    <section style={{ ...panelCard, padding: 10, flexShrink: 1, minHeight: 96, display: "flex", flexDirection: "column" }}>
      <div style={{ ...sectionHead, marginBottom: 6 }}>
        <span style={sectionTitle}>Số liệu · {rows.length} điểm</span>
        <span style={countPill}>R: {fits.X ? `X ${fits.X.toFixed(1)}` : "X —"} · {fits.Y ? `Y ${fits.Y.toFixed(1)}` : "Y —"} Ω</span>
      </div>
      <div data-lab-scroll style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
        {[...rows].sort((a, b) => (a.material === b.material ? a.voltage - b.voltage : a.material < b.material ? -1 : 1)).map((row) => (
          <div key={row.id} style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 1fr 22px", alignItems: "center", gap: 4, padding: "3px 6px", borderRadius: 7, background: C.bg, fontSize: 11.5, fontFamily: "monospace", fontWeight: 800, color: C.ink }}>
            <b style={{ color: COLORS[row.material], fontFamily: FONT }}>{row.material}</b>
            <span>{row.voltage.toFixed(2)} V</span>
            <span>{(row.current * 1000).toFixed(1)} mA</span>
            <span style={{ color: row.heat > 0.3 ? "#C2410C" : C.ink }} title={row.heat > 0.3 ? "Đo khi vật dẫn đang nóng" : undefined}>{row.resistance.toFixed(1)} Ω</span>
            <button type="button" onClick={() => removeRow(row.id)} aria-label={`Xoá điểm ${row.material} U = ${row.voltage.toFixed(2)} V`} style={deleteBtn}>×</button>
          </div>
        ))}
        {!rows.length && <div style={{ fontSize: 12, color: C.sub, fontStyle: "italic", padding: "6px 2px" }}>Chưa có điểm nào. Đóng K → xoay núm nguồn → Ghi số đo.</div>}
      </div>
    </section>
  );

  /* Đồ thị I–U trực tiếp: đường thẳng qua gốc, độ dốc = 1/R */
  const graphI = [...rows.map((r) => r.current * 1000), live ? ammeterShown : 0];
  const yRange = niceRange([0, ...graphI, 20], { min: 0, pad: 0.12, count: 5 });
  const graphSeries = SUBJECTS.filter((id) => rowsOf(id).length).map((id) => {
    const R = fits[id];
    const umax = Math.max(...rowsOf(id).map((r) => r.voltage));
    return {
      id,
      name: `Vật dẫn ${id}`,
      color: COLORS[id],
      points: rowsOf(id).map((r) => ({ x: r.voltage, y: r.current * 1000, key: r.id, warn: r.heat > 0.3 })),
      lines: R ? [{ x1: 0, y1: 0, x2: umax, y2: (umax / R) * 1000 }, { x1: umax, y1: (umax / R) * 1000, x2: 10.5, y2: (10.5 / R) * 1000, dashed: true }] : [],
      tags: R ? [{ x: umax * 0.62, y: (umax * 0.62 / R) * 1000, text: `R${id === "X" ? "ₓ" : "ᵧ"} ≈ ${R.toFixed(1)} Ω`, pill: true, dy: -16 }] : [],
    };
  });
  const renderGraph = (compact, tall = false) => (
    <LiveGraph
      x={{ label: "U (V)", min: 0, max: 10.5, ticks: [0, 2, 4, 6, 8, 10], fmt: (v) => String(v) }}
      y={{ label: "I (mA)", min: 0, max: yRange.max, ticks: yRange.ticks, fmt: (v) => String(+v.toFixed(1)) }}
      series={graphSeries}
      live={live ? { x: voltmeterShown, y: ammeterShown, color: COLORS[material], label: `${voltmeterShown.toFixed(2)} V · ${ammeterShown.toFixed(1)} mA` } : null}
      activeSeries={material}
      empty="Đóng K rồi xoay núm nguồn — chấm sáng sẽ trượt trên đồ thị."
      compact={compact}
      tall={tall}
      ariaLabel="Đồ thị cường độ dòng điện I theo hiệu điện thế U"
    />
  );
  const stageGraph = (
    <section style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 15, padding: "8px 10px 2px", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <b style={{ fontSize: 13, color: C.ink, whiteSpace: "nowrap" }}>Đặc tuyến I–U trực tiếp</b>
        <span style={{ fontSize: 11.5, color: C.sub, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {fits.X || fits.Y ? "Đường thẳng qua O: I tỉ lệ U — đường càng dốc, điện trở càng nhỏ." : live ? "Xoay núm nguồn: chấm sáng trượt theo — bấm “Ghi số đo” để giữ lại." : "Đóng khóa K để thấy điểm làm việc của mạch."}
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

  const measuring = setupDone || rows.length > 0;
  const panelContent = (
    <>
      <NextStepCard phase={phase} next={next} onSpeak={speak && !muted ? () => speak(speechText) : null} onPrimary={handlePrimary} onAssist={runAssistantAction} />
      {assembled && !setupDone && <ChecklistCard title="Thiết lập trước khi đo" items={setupItems} currentKey={next.key} />}
      {!setupDone && referenceCard}
      {measuring && measureCard}
      {measuring && !isMobile && controlsCard}
      {isMobile && measuring && !isPortrait && graphCard}
      {measuring && dataCard}
    </>
  );
  const finishButton = <FinishButton count={rows.length} allDone={canExport} onFinish={exportNote} />;
  const showTray = !assembled;
  // Điện thoại dọc: bàn mạch nằm sát trên (đúng tỉ lệ), phần dưới dành cho đồ thị / sheet hướng dẫn.
  const portraitStack = isMobile && isPortrait;
  const sceneH = Math.round(Math.max(120, viewportW - (showTray ? 86 : 0) - 6) * VBH / VBW);
  const showStageGraph = measuring && (!isMobile || isPortrait);

  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", background: C.bg, color: C.ink, fontFamily: FONT }}>
      <LabTopBar
        isMobile={isMobile}
        isPortrait={isPortrait}
        title="Bài 23 — Điện trở · định luật Ohm"
        shortTitle="Bài 23 · Định luật Ohm"
        onExit={handleExit}
        onPrelab={onReplayPrelab}
        onRestart={reset}
        muted={muted}
        onToggleMute={speak ? onToggleMute : null}
        onHelp={onTour}
        meta={fits.X || fits.Y ? <>R của em: <b style={{ color: C.ink }}>{fits.X ? `X ≈ ${fits.X.toFixed(0)}` : ""}{fits.X && fits.Y ? " · " : ""}{fits.Y ? `Y ≈ ${fits.Y.toFixed(0)}` : ""} Ω</b></> : null}
      />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: isMobile ? mobileLabColumns({ isPortrait, showTray, tray: "86px" }) : (showTray ? "clamp(185px,13vw,225px) minmax(0,1fr) clamp(320px,23vw,390px)" : "minmax(0,1fr) clamp(320px,23vw,390px)"), overflow: "hidden", position: "relative" }}>
        {showTray && (
          <aside data-lab-tooltray data-lab-scroll style={{ borderRight: `1px solid ${C.line}`, padding: isMobile ? 4 : 9, overflowY: "auto", background: "#fff" }}>
            {isMobile ? (
              <div style={{ borderRadius: 9, background: C.peachLt, color: C.orangeDk, padding: "5px 4px", marginBottom: 5, fontSize: 9, fontWeight: 900, textAlign: "center" }}>DỤNG CỤ · {placed.size}/{TOOLS.length}</div>
            ) : (
              <div style={{ ...sectionHead, marginBottom: 10 }}>
                <span style={sectionTitle}>Khay dụng cụ</span>
                <span style={countPill}>{placed.size}/{TOOLS.length}</span>
              </div>
            )}
            {TOOLS.map((tool) => {
              const done = placed.has(tool.k);
              const nextTool = isNextTool(tool.k);
              return (
                <button type="button" key={tool.k}
                  onPointerDown={(event) => !isMobile && startToolDrag(tool.k, event)}
                  onClick={() => { if (isMobile && nextTool && !done) { const point = target(tool.k); flyToPlace(tool.k, point.x, point.y - 75); } }}
                  style={{ width: "100%", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: isMobile ? 2 : 8, padding: isMobile ? 4 : "7px 8px", marginBottom: 5, borderRadius: 11, cursor: done ? "default" : isMobile ? "pointer" : "grab", touchAction: "none", border: `1.5px solid ${done ? C.good : nextTool ? C.orange : C.line}`, background: done ? "#F3F8F3" : "#fff", opacity: done ? .62 : nextTool ? 1 : .62, boxShadow: nextTool ? `0 0 0 3px ${C.orange}20` : "none", fontFamily: FONT }}>
                  <span style={{ width: isMobile ? 38 : 46, height: isMobile ? 34 : 42, display: "grid", placeItems: "center", background: "#FAF6F0", borderRadius: 8, flexShrink: 0 }}>
                    <img src={tool.img} alt="" style={{ width: isMobile ? 34 : 40, height: isMobile ? 30 : 36, objectFit: "contain" }} />
                  </span>
                  <span style={{ minWidth: 0, textAlign: isMobile ? "center" : "left" }}>
                    <span style={{ display: "block", fontSize: isMobile ? 8.5 : 12, fontWeight: 900, lineHeight: 1.15, color: C.ink }}>{tool.name}</span>
                    <span style={{ display: "block", fontSize: isMobile ? 7.5 : 9.5, color: done ? C.good : nextTool ? C.orangeDk : C.sub }}>{done ? "✓ Đã lắp" : nextTool ? isMobile ? "Chạm để lắp" : "Kéo vào bàn" : tool.sub}</span>
                  </span>
                </button>
              );
            })}
          </aside>
        )}
        <main ref={mainRef} data-lab-stage style={{ position: "relative", minWidth: 0, minHeight: 0, padding: isMobile ? 3 : 8, outline: dragTool ? `2px dashed ${C.orange}` : "none", outlineOffset: -4, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={portraitStack ? { flex: "0 0 auto", height: sceneH } : { flex: "1 1 0", minHeight: 0 }}>
            <OhmScene
              placed={placed} ports={ports} wires={wires} wireDrag={wireDrag}
              pendingPort={pendingPort} validTargets={validTargets} activeGroup={activeGroup} flyTool={flyTool} isMobile={isMobile}
              sourceOn={sourceOn} setting={setting} switchClosed={switchClosed} ammeterMode={ammeterMode} voltmeterMode={voltmeterMode}
              ammeterReading={amOhm ? amOhm.value : ammeterShown} voltmeterReading={vmOhm ? vmOhm.value : voltmeterShown}
              ammeterAlert={Boolean(amOhm?.live)} voltmeterAlert={Boolean(vmOhm?.live)} material={material} heat={heat[material]}
              onPortStart={startWire} onPortTap={tapPort} onCancelPending={() => setPendingPort(null)} onCycleMode={cycleMode}
              onToggleSource={toggleSource} onKnob={setKnob} onToggleSwitch={toggleSwitch} onRemoveWire={removeWire}
              currentMa={live ? ammeterShown : 0}
            />
          </div>
          {showStageGraph && (
            <div style={portraitStack ? { flex: "1 1 0", minHeight: 0, paddingBottom: 64 } : { flex: "0 0 clamp(190px, 36%, 300px)", minHeight: 0 }}>{stageGraph}</div>
          )}
          <LabToast toast={toast} />
          <LabDialog dialog={dialog} onClose={() => setDialog(null)} />
          {isMobile && isPortrait && (
            <MobileLabSheet
              open={sheetOpen}
              onToggle={() => setSheetOpen((value) => !value)}
              phase={phase}
              next={next}
              onPrimary={handlePrimary}
              isPortrait={isPortrait}
              openHeight={portraitStack ? `calc(100% - ${sceneH + 14}px)` : undefined}
            >
              {panelContent}
              {finishButton}
            </MobileLabSheet>
          )}
        </main>
        {isMobile && !isPortrait && (
          <MobileLabSheet phase={phase} next={next} onPrimary={handlePrimary} isPortrait={false}>
            {panelContent}
            {finishButton}
          </MobileLabSheet>
        )}
        {!isMobile && (
          <aside data-lab-guide style={{ borderLeft: `1px solid ${C.line}`, background: C.bg, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
            <div data-lab-scroll style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>{panelContent}</div>
            <div style={{ padding: 12, borderTop: `1px solid ${C.line}`, background: "#fff", flexShrink: 0 }}>{finishButton}</div>
          </aside>
        )}
        {TOOLS.map((tool) => <img key={`drag-${tool.k}`} src={tool.img} alt="" style={{ position: "fixed", left: dragTool?.key === tool.k ? dragTool.x - 28 : -999, top: dragTool?.key === tool.k ? dragTool.y - 28 : -999, width: 56, height: 56, objectFit: "contain", pointerEvents: "none", zIndex: 80, opacity: dragTool?.key === tool.k ? .94 : 0 }} />)}
      </div>
    </div>
  );
}

/* ============================ Bàn thí nghiệm (SVG) ============================ */
function OhmScene({
  placed, ports, wires, wireDrag, pendingPort, validTargets, activeGroup, flyTool, isMobile,
  sourceOn, setting, switchClosed, ammeterMode, voltmeterMode, ammeterReading, voltmeterReading, ammeterAlert, voltmeterAlert, material, heat,
  onPortStart, onPortTap, onCancelPending, onCycleMode, onToggleSource, onKnob, onToggleSwitch, onRemoveWire, currentMa,
}) {
  const shownIn = (mode, value) => (mode === "mA" || mode === "V" || mode === "Ω" ? value : 0);
  const has = (key) => placed.has(key);
  const at = (key) => LAYOUT[key].at;
  const allPlaced = placed.size === TOOLS.length;
  const portDone = (id) => EDGES.every(([a, b]) => (a !== id && b !== id) || wires.has(edgeKey(a, b)));
  const allWired = EDGES.every(([a, b]) => wires.has(edgeKey(a, b)));
  const hitR = isMobile ? 28 : 18;
  const [svgRef, svgBox] = useBoxSize();

  return (
    <svg
      ref={svgRef}
      viewBox={fitViewBox([0, 0, VBW, VBH], svgBox, [0, 0, VBW, VBH])}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={(event) => { if (pendingPort && (event.target === event.currentTarget || event.target.closest?.("[data-bg]"))) onCancelPending(); }}
      style={{ width: "100%", height: "100%", minHeight: 0, display: "block", border: `1px solid ${C.line}`, borderRadius: 15, background: "linear-gradient(#fff,#FBF6EC)", touchAction: "none", fontFamily: FONT }}
    >
      <rect data-bg="1" x={-700} y={VBH - 44} width={VBW + 1400} height={44 + 700} fill="#F3EBDD" />
      {!placed.size && (
        <text x={VBW / 2} y="46" textAnchor="middle" fontSize="15" fontWeight="800" fill={C.sub}>Kéo dụng cụ từ khay bên trái vào vòng sáng để bắt đầu…</text>
      )}

      {has("source") && <DcSource at={at("source")} on={sourceOn} voltage={setting} onTogglePower={onToggleSource} onChange={onKnob} />}
      {has("switch") && <SwitchK at={at("switch")} closed={switchClosed} onToggle={onToggleSwitch} />}
      {has("conductor") && <Resistor at={at("conductor")} label={`VẬT DẪN ${material}`} tint={`${OHM_CONDUCTORS[material].color}2E`} bands={CONDUCTOR_BANDS[material]} heat={heat} />}
      {has("ammeter") && <Multimeter at={at("ammeter")} title="ĐO1 · AMPE KẾ" mode={ammeterMode} reading={shownIn(ammeterMode, ammeterReading)} alert={ammeterAlert} onCycleMode={() => onCycleMode("a")} />}
      {has("voltmeter") && <Multimeter at={at("voltmeter")} title="ĐO2 · VÔN KẾ" mode={voltmeterMode} reading={shownIn(voltmeterMode, voltmeterReading)} alert={voltmeterAlert} onCycleMode={() => onCycleMode("v")} />}

      {/* Dây đã nối */}
      {[...wires].map((key) => {
        const [a, b] = key.split("|");
        const pa = ports[a];
        const pb = ports[b];
        const color = pa.hot && pb.hot ? "#DC2626" : "#1F2937";
        const d = cablePath(pa, pb);
        return (
          <g key={key} role="button" aria-label={`Rút dây ${pa.label} – ${pb.label}`} onClick={() => onRemoveWire(key)} style={{ cursor: "pointer" }}>
            <path d={d} fill="none" stroke="#fff" strokeWidth="8.5" strokeLinecap="round" opacity=".9" />
            <path d={d} fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
            <path d={d} fill="none" stroke="transparent" strokeWidth="20" />
            <circle cx={pa.x} cy={pa.y} r="6" fill={color} stroke="#fff" strokeWidth="1.8" />
            <circle cx={pb.x} cy={pb.y} r="6" fill={color} stroke="#fff" strokeWidth="1.8" />
          </g>
        );
      })}
      {/* Hạt điện tích chạy theo chiều dòng điện — nhanh/chậm theo cường độ I */}
      {currentMa > 0.5 && FLOW.filter(([a, b]) => wires.has(edgeKey(a, b))).map(([a, b]) => (
        <path key={`flow-${a}-${b}`} d={cablePath(ports[a], ports[b])} fill="none" stroke="#FDE047" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="1.5 13" style={{ pointerEvents: "none" }}>
          <animate attributeName="stroke-dashoffset" from="0" to="-14.5" dur={flowDuration(currentMa)} repeatCount="indefinite" />
        </path>
      ))}
      {wireDrag && (
        <path d={cablePath(ports[wireDrag.id], wireDrag)} fill="none" stroke={ports[wireDrag.id].hot ? "#DC2626" : "#1F2937"} strokeWidth="4" strokeDasharray="8 6" strokeLinecap="round" />
      )}

      {/* Chốt nối (hiện khi đã lắp đủ) */}
      {allPlaced && Object.entries(ports).map(([id, p]) => {
        const selected = pendingPort === id;
        const valid = validTargets.has(id);
        const done = portDone(id);
        return (
          <g key={id} role="button" tabIndex={0} aria-label={`Chốt ${p.label}${valid ? " — đích nối đúng" : done ? " — đã nối đủ" : ""}`}
            onPointerDown={(event) => onPortStart(id, event)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPortTap(id); } }}
            style={{ cursor: "pointer" }}>
            <circle cx={p.x} cy={p.y} r={hitR} fill="transparent" />
            {valid ? (
              <circle cx={p.x} cy={p.y} r="14" fill={`${C.orange}40`} stroke={C.orange} strokeWidth="3.5">
                <animate attributeName="r" values="11;17;11" dur="1s" repeatCount="indefinite" />
              </circle>
            ) : selected ? (
              <circle cx={p.x} cy={p.y} r="15" fill={`${C.orange}55`} stroke={C.orangeDk} strokeWidth="3.5" />
            ) : !done ? (
              <circle cx={p.x} cy={p.y} r="13" fill="none" stroke={p.hot ? "#DC2626" : "#1F2937"} strokeWidth="2.5" strokeDasharray="4 3" />
            ) : null}
            {(valid || selected) && <PortLabel x={p.x} y={p.y} text={p.label} selected={selected} />}
          </g>
        );
      })}

      {/* Ô thả khi lắp ráp */}
      {activeGroup.map((key) => {
        if (has(key)) return null;
        const c = partCenter(LAYOUT[key].kind, LAYOUT[key].at);
        return (
          <g key={key} style={{ pointerEvents: "none" }}>
            <circle cx={c.x} cy={c.y} r="36" fill={`${C.orange}1e`} stroke={C.orange} strokeWidth="2.5" strokeDasharray="7 5">
              <animate attributeName="r" values="31;40;31" dur="1.3s" repeatCount="indefinite" />
            </circle>
            <text x={c.x} y={c.y + 7} textAnchor="middle" fontSize="22" fontWeight="900" fill={C.orangeDk}>+</text>
          </g>
        );
      })}
      {flyTool && <image href={TOOLS.find((tool) => tool.k === flyTool.key)?.img} x={flyTool.x - 28} y={flyTool.y - 28} width="56" height="56" style={{ pointerEvents: "none" }} />}

      {allPlaced && !allWired && (
        <g style={{ pointerEvents: "none" }}>
          <rect x={VBW / 2 - 250} y={VBH - 38} width="500" height="30" rx="15" fill="#FFF7ED" stroke="#FDBA74" />
          <text x={VBW / 2} y={VBH - 18} textAnchor="middle" fontSize="12" fontWeight="900" fill={C.orangeDk}>
            {pendingPort ? `Đã chọn ${ports[pendingPort].label} · chạm chốt đang sáng (chỗ trống để bỏ chọn)` : "Chạm một chốt nét đứt, rồi chạm chốt đích đang sáng · chạm dây để rút"}
          </text>
        </g>
      )}
    </svg>
  );
}

function PortLabel({ x, y, text, selected }) {
  const w = Math.max(44, text.length * 7 + 16);
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={x - w / 2} y={y - 44} width={w} height="22" rx="11" fill={selected ? C.orangeDk : "#fff"} stroke={C.orange} strokeWidth="1.5" />
      <text x={x} y={y - 29} textAnchor="middle" fontSize="11" fontWeight="900" fill={selected ? "#fff" : C.orangeDk}>{text}</text>
    </g>
  );
}

const btnSmall = { flex: 1, border: `1px solid ${C.line}`, borderRadius: 9, background: "#fff", color: C.ink, padding: "6px 6px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: FONT };
const choiceButton = { border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", color: C.sub, padding: "4px 8px", fontSize: 11, fontWeight: 850, cursor: "pointer", fontFamily: FONT };
const deleteBtn = { border: `1px solid ${C.line}`, background: "#fff", color: C.sub, borderRadius: 6, width: 20, height: 20, lineHeight: "16px", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: FONT, padding: 0 };
const miniLabel = { fontSize: 9.5, fontWeight: 900, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4 };
const meterTag = { display: "inline-block", minWidth: 36, fontSize: 10, color: C.sub, fontFamily: FONT, fontWeight: 900 };
