"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Power } from "lucide-react";
import { C, FONT } from "../../engine/tokens.js";
import { seededCellEmf, flickerCount } from "../../engine/physicsElectric";
import {
  LabTopBar, NextStepCard, ChecklistCard, FinishButton, MobileLabSheet, LabToast, LabDialog, ProgressPills, NudgeSlider,
  panelCard, sectionHead, sectionTitle, countPill, btnSecondary,
} from "./LabChrome.jsx";
import { METER_MODES, terminalAt, partCenter, Multimeter, CircuitBoard } from "./electric/ElectricParts.jsx";
import { BoardBattery, BoardSwitch, BoardResistor, BoardRheostat, localPoint } from "./electric/BoardParts.jsx";
import { GRID, BOARD_SIZE, nodePos, moduleOf, moduleRC, moduleAtPoint, nearestNode, boardModuleRect } from "./electric/boardGeometry.js";
import {
  BOARD_PARTS, BOARD_PART_KEYS, CANONICAL_LAYOUT, PIN_LABEL, METER_KEYS, METER_JACKS, METER_NAME,
  partSpan, pinNodes, canPlace, nearestPlacement, freeNodesIn, analyzeBoard, solveBoard, planWires,
  routeWithinNet, pinEndpoint, endpointKey,
} from "./electric/emfBoard.js";
import EmfGraph, { CELL_COLORS, CELL_NAMES } from "./electric/EmfGraph.jsx";
import { labSound } from "./labSound.js";
import { flowDuration } from "./animStore.js";

/* ============================================================================
   EmfBench — Bài 26: đo suất điện động và điện trở trong của pin điện hóa.

   BẢNG LẮP MẠCH CHẠY THẬT: pin, khóa K, R₀, biến trở CẮM chân vào nút của bảng; 9 nút trong
   một mạng dẫn điện với nhau nên linh kiện có chân chung mạng là đã nối tiếp — không cần dây.
   Dây nối cắm vào nút trống để nối hai mạng, hoặc từ nút tới lỗ cắm đồng hồ. Mạch được GIẢI
   thật (electric/emfBoard.js): mắc đúng thì số đo đúng, mắc sai thì đồng hồ chỉ sai như ngoài đời,
   và Bước tiếp theo chỉ ra mạng nào cần nối. Dòng điện chạy thành hạt sáng qua dây VÀ qua mạng.

   ĐO TỰ DO: kéo con chạy biến trở, mỗi pin ≥ 5 điểm (cách nhau ≥ 5 Ω); đồ thị U–I sống.
   ========================================================================== */

const VBW = 1080;
const VBH = 560;
const ASSET = "/lab/electric";
const B = { x: 212, y: 50, s: 0.66 };                        // bảng lắp mạch trên bàn
const METERS = { voltmeter: { x: 58, y: 168, s: 1 }, ammeter: { x: 892, y: 168, s: 1 } };
const toScene = (p) => ({ x: B.x + p.x * B.s, y: B.y + p.y * B.s });
const toBoard = (p) => ({ x: (p.x - B.x) / B.s, y: (p.y - B.y) / B.s });
const jackScene = (meter, jack) => terminalAt("meter", METERS[meter], jack);
const endpointScene = (e) => (e.t === "node" ? toScene(nodePos(e.X, e.Y)) : jackScene(e.meter, e.jack));
const BOARD_RECT = { x: B.x, y: B.y, w: BOARD_SIZE.w * B.s, h: BOARD_SIZE.h * B.s };

const TOOLS = [
  { k: "board", name: "Bảng lắp mạch", sub: "24 mạng · 216 nút", img: `${ASSET}/circuit-board.svg` },
  { k: "battery", name: "Pin điện hóa", sub: "cắm lên bảng", img: `${ASSET}/battery.svg` },
  { k: "switch", name: "Khóa K", sub: "cắm lên bảng", img: `${ASSET}/switch-k.svg` },
  { k: "protect", name: "Điện trở R₀", sub: "bảo vệ pin · 10 Ω", img: `${ASSET}/protective-resistor.svg` },
  { k: "rheostat", name: "Biến trở 100 Ω", sub: "con chạy C", img: `${ASSET}/rheostat.svg` },
  { k: "ammeter", name: "Đồng hồ ĐO1", sub: "ampe kế · mA", img: `${ASSET}/multimeter.svg` },
  { k: "voltmeter", name: "Đồng hồ ĐO2", sub: "vôn kế · V", img: `${ASSET}/multimeter.svg` },
];
const GROUPS = [["board"], ["battery", "switch", "protect", "rheostat"], ["ammeter", "voltmeter"]];

/* Đo TỰ DO: mỗi pin ≥ 5 điểm, cách nhau ≥ 5 Ω. */
const EMF_MIN_POINTS = 5;
const EMF_MAX_POINTS = 10;
const EMF_MIN_GAP = 5;
const EMF_START_R = 60;
const JACK_LABEL = { A: "10A", mA: "mA", COM: "COM", V: "VΩ" };

function clientToViewBox(svg, clientX, clientY) {
  const rect = svg.getBoundingClientRect();
  const scale = Math.min(rect.width / VBW, rect.height / VBH);
  const offsetX = (rect.width - VBW * scale) / 2;
  const offsetY = (rect.height - VBH * scale) / 2;
  return { x: (clientX - rect.left - offsetX) / scale, y: (clientY - rect.top - offsetY) / scale };
}

/** Đường dây + điểm giữa: dây đồng hồ võng xuống; dây nối tắt giữa hai mạng cong nhẹ lên (như dây jumper). */
function wireGeom(w) {
  const a = endpointScene(w.a), b = endpointScene(w.b);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const jumper = w.a.t === "node" && w.b.t === "node";
  const bend = jumper ? -Math.min(46, 12 + dist * 0.28) : Math.min(120, 30 + dist * 0.22);
  return {
    d: `M${a.x} ${a.y} C${a.x} ${a.y + bend},${b.x} ${b.y + bend},${b.x} ${b.y}`,
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 0.75 * bend },
  };
}
const wirePath = (w) => wireGeom(w).d;
const wireColor = (w) => {
  const jacks = [w.a, w.b].filter((e) => e.t === "jack");
  if (jacks.some((e) => e.jack === "COM")) return "#1F2937";
  if (jacks.length) return "#DC2626";
  return "#2563EB";
};

function linearFit(rows) {
  if (rows.length < 2) return { emf: 0, internalR: 0 };
  const n = rows.length;
  const sx = rows.reduce((sum, row) => sum + row.current, 0);
  const sy = rows.reduce((sum, row) => sum + row.voltage, 0);
  const sxx = rows.reduce((sum, row) => sum + row.current * row.current, 0);
  const sxy = rows.reduce((sum, row) => sum + row.current * row.voltage, 0);
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-9) return { emf: 0, internalR: 0 };
  const slope = (n * sxy - sx * sy) / den;
  return { emf: (sy - slope * sx) / n, internalR: -slope };
}
const uniqSorted = (values) => [...new Set(values.filter((v) => Number.isFinite(v) && v > 0))].sort((a, b) => a - b);

export default function EmfBench({ studentName, assignedSets, onExportNote, onBack, onReplayPrelab, speak, muted, onToggleMute }) {
  const name = studentName || "Học sinh";
  // Mốc R giáo viên giao (nếu có) là các điểm bắt buộc phải có; ngoài ra đo tự do.
  const targets = useMemo(() => uniqSorted((assignedSets?.emf || []).map((item) => item.resistance)), [assignedSets]);

  const [placed, setPlaced] = useState(() => new Set());
  const [placements, setPlacements] = useState({});
  const [wires, setWires] = useState([]);
  const [pending, setPending] = useState(null);           // điểm cắm đã chọn, chờ điểm thứ hai
  const [wireDrag, setWireDrag] = useState(null);         // { x, y } — đầu dây đang kéo (scene)
  const [partDrag, setPartDrag] = useState(null);         // { kind, x, y, at } — dời linh kiện trên bảng
  const [dragTool, setDragTool] = useState(null);
  const [flyTool, setFlyTool] = useState(null);
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [switchClosed, setSwitchClosed] = useState(false);
  const [ammeterMode, setAmmeterMode] = useState("OFF");
  const [voltmeterMode, setVoltmeterMode] = useState("OFF");
  const [cell, setCell] = useState("new");
  const [rheostat, setRheostat] = useState(EMF_START_R);
  const [rows, setRows] = useState([]);
  const [flick, setFlick] = useState({ a: 0, v: 0 });
  const [heat, setHeat] = useState({ r0: 0, rh: 0 });      // R₀ và đoạn biến trở có dòng nóng lên (I²R)
  const [selectedWire, setSelectedWire] = useState(null);  // dây đang chọn để gỡ
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewportW, setViewportW] = useState(1280);
  const mainRef = useRef(null);
  const frameRef = useRef(null);
  const toastTimer = useRef(null);
  const lastSpoken = useRef("");
  const milestones = useRef(new Set());
  const nextId = useRef(1);
  const nextWire = useRef(1);

  const newEmf = useMemo(() => seededCellEmf(name), [name]);
  const cellPhysics = useMemo(() => ({
    new: { emf: newEmf, r: 1.15 + ((newEmf * 100) % 4) * 0.12 },
    old: { emf: Math.max(1.25, newEmf - 0.11), r: 3.25 + ((newEmf * 100) % 4) * 0.18 },
  }), [newEmf]);

  const activeGroup = GROUPS.find((group) => group.some((key) => !placed.has(key))) || [];
  const isNextTool = (key) => activeGroup.includes(key) && !placed.has(key);
  const assembled = TOOLS.every((tool) => placed.has(tool.k));
  const metersPlaced = { ammeter: placed.has("ammeter"), voltmeter: placed.has("voltmeter") };
  const modes = { ammeter: ammeterMode, voltmeter: voltmeterMode };
  const modesOK = ammeterMode === "mA" && voltmeterMode === "V";

  const analysis = useMemo(
    () => (assembled ? analyzeBoard({ placements, wires, metersPlaced: { ammeter: true, voltmeter: true } }) : null),
    [assembled, placements, wires]
  );
  const valid = Boolean(analysis?.valid);
  const sol = useMemo(
    () => (placed.has("board") ? solveBoard({ placements, wires, switchClosed, rheostat, cell: cellPhysics[cell], modes, metersPlaced, r0: 10 * (1 + 0.02 * heat.r0) }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placed, placements, wires, switchClosed, rheostat, cell, cellPhysics, ammeterMode, voltmeterMode, heat.r0]
  );
  // Số hiển thị: độ chia của đồng hồ + chữ số cuối nhảy nhẹ khi có dòng điện.
  const amRead = sol?.ammeter || { mode: ammeterMode, value: 0, overload: false };
  const vmRead = sol?.voltmeter || { mode: voltmeterMode, value: 0, overload: false };
  const flowing = Math.abs(sol?.batteryCurrent || 0) > 0.0005;
  const ammeterShown = amRead.mode === "mA" ? Math.round(amRead.value * 10) / 10 + (flowing ? flick.a * 0.1 : 0) : amRead.value;
  const voltmeterShown = vmRead.mode === "V" ? Math.round(vmRead.value * 1000) / 1000 + (flowing ? flick.v * 0.001 : 0) : vmRead.value;
  const live = assembled && valid && modesOK && switchClosed && flowing;
  const rInCircuit = analysis?.rheostatPins?.includes("A") ? rheostat : 100 - rheostat;
  const currentMa = flowing ? Math.abs(sol.batteryCurrent) * 1000 : 0;

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
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);
  // Chữ số cuối đồng hồ nhảy nhẹ như máy thật (chỉ khi có dòng điện).
  useEffect(() => {
    if (!flowing) return;
    const id = window.setInterval(() => setFlick({ a: flickerCount(), v: flickerCount() }), 700);
    return () => window.clearInterval(id);
  }, [flowing]);
  // R₀ và đoạn biến trở có dòng điện nóng dần theo P = I²R; mở K thì nguội.
  const warm = heat.r0 > 0.002 || heat.rh > 0.002;
  useEffect(() => {
    if (!flowing && !warm) return;
    const I = currentMa / 1000;
    const approach = (h, target) => target + (h - target) * Math.exp(-0.5 / (target > h ? 6 : 5));
    const id = window.setInterval(() => {
      setHeat((old) => {
        const next = {
          r0: approach(old.r0, flowing ? Math.min(1.2, (I * I * 10) / 0.08) : 0),
          rh: approach(old.rh, flowing ? Math.min(1.2, (I * I * Math.max(0, rInCircuit)) / 0.06) : 0),
        };
        if (!flowing && next.r0 < 0.01 && next.rh < 0.01) return old.r0 || old.rh ? { r0: 0, rh: 0 } : old;
        // Chỉ cập nhật khi đổi thấy được — tránh vẽ lại cả bàn liên tục.
        return Math.abs(next.r0 - old.r0) < 0.01 && Math.abs(next.rh - old.rh) < 0.01 ? old : next;
      });
    }, 500);
    return () => window.clearInterval(id);
  }, [flowing, warm, currentMa, rInCircuit]);

  /** flash("chữ") hoặc flash({ text, kind: "win" | "warn" }). */
  const flash = (message, voice = false, duration = 2800) => {
    const next = typeof message === "string" ? { text: message } : message;
    setToast((old) => ({ ...next, id: (old?.id || 0) + 1 }));
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), duration);
    if (voice && speak) speak(next.text);
  };
  const sound = (soundName) => { if (!muted) labSound[soundName]?.(); };

  /* ---------------- Số liệu & yêu cầu ---------------- */
  const rowsOf = (id) => rows.filter((row) => row.cell === id);
  const newRows = rowsOf("new");
  const oldRows = rowsOf("old");
  const fitNew = useMemo(() => linearFit(newRows), [newRows]);
  const fitOld = useMemo(() => linearFit(oldRows), [oldRows]);
  const fits = { new: newRows.length >= 2 ? fitNew : null, old: oldRows.length >= 2 ? fitOld : null };
  const missingOf = (id) => targets.filter((value) => !rowsOf(id).some((row) => Math.abs(row.resistance - value) <= 1));
  const subjectDone = (id) => rowsOf(id).length >= EMF_MIN_POINTS && missingOf(id).length === 0;
  const canExport = subjectDone("new") && subjectDone("old");
  const otherCell = cell === "new" ? "old" : "new";

  /* ---------------- Tên gọi một mạng / điểm cắm (để hướng dẫn nói rõ) ---------------- */
  const moduleName = (m) => {
    const pins = BOARD_PART_KEYS.filter((kind) => placements[kind]).flatMap((kind) => pinNodes(kind, placements[kind])
      .filter((p) => moduleOf(p.X, p.Y) === m).map((p) => PIN_LABEL[kind][p.pin]));
    const { row, col } = moduleRC(m);
    return pins.length ? `mạng có ${pins.join(" và ")}` : `mạng trống (hàng ${row + 1}, cột ${col + 1})`;
  };
  const describe = (e) => (e.t === "jack" ? `lỗ ${JACK_LABEL[e.jack]} của ${METER_NAME[e.meter]}` : e.t === "node" ? moduleName(moduleOf(e.X, e.Y)) : "mạng đã kín");

  /* ---------------- Lắp linh kiện ---------------- */
  const fixedTarget = (key) => {
    if (key === "board") return { x: BOARD_RECT.x + BOARD_RECT.w / 2, y: BOARD_RECT.y + BOARD_RECT.h / 2 };
    if (BOARD_PART_KEYS.includes(key)) {
      const pins = pinNodes(key, CANONICAL_LAYOUT[key]).map((p) => toScene(nodePos(p.X, p.Y)));
      return { x: (pins[0].x + pins[pins.length - 1].x) / 2, y: pins[0].y };
    }
    return partCenter("meter", METERS[key]);
  };
  const commitPlace = (key, at = null) => {
    if (placed.has(key)) return;
    if (!isNextTool(key)) {
      flash(`Bước này cần lắp: ${activeGroup.filter((k) => !placed.has(k)).map((item) => TOOLS.find((tool) => tool.k === item)?.name).join(" / ")}.`);
      return;
    }
    if (BOARD_PART_KEYS.includes(key)) {
      const spot = at
        || (canPlace(key, CANONICAL_LAYOUT[key], placements, wires) ? CANONICAL_LAYOUT[key] : nearestPlacement(key, CANONICAL_LAYOUT[key], placements, wires));
      if (!spot) { flash("Bảng không còn chỗ trống cho linh kiện này — dời bớt linh kiện khác."); return; }
      setPlacements((old) => ({ ...old, [key]: spot }));
    }
    setPlaced((old) => new Set(old).add(key));
  };
  /** Chỗ cắm gần điểm thả (toạ độ scene) nhất: tâm linh kiện hít vào nút gần nhất. */
  const spotNear = (key, scenePoint, current = placements) => {
    const bp = toBoard(scenePoint);
    const nn = nearestNode(bp.x, bp.y);
    return nearestPlacement(key, { X: nn.X - partSpan(key) / 2, Y: nn.Y }, current, wires);
  };
  const flyToPlace = (key, fromX, fromY) => {
    if (document.hidden || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || BOARD_PART_KEYS.includes(key)) { commitPlace(key); return; }
    const to = fixedTarget(key);
    let started = null;
    const step = (now) => {
      if (started === null) started = now;
      const progress = Math.min(1, (now - started) / 260);
      const ease = 1 - Math.pow(1 - progress, 3);
      setFlyTool({ key, x: fromX + (to.x - fromX) * ease, y: fromY + (to.y - fromY) * ease });
      if (progress < 1) requestAnimationFrame(step);
      else { setFlyTool(null); commitPlace(key); }
    };
    requestAnimationFrame(step);
  };
  const startToolDrag = (key, event) => {
    if (placed.has(key)) return;
    event.preventDefault();
    let moved = false;
    let last = { x: event.clientX, y: event.clientY };
    let frame = null;
    setDragTool({ key, x: last.x, y: last.y });
    const move = (e) => {
      moved = true;
      last = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(() => { frame = null; setDragTool({ key, x: last.x, y: last.y }); });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (frame) cancelAnimationFrame(frame);
      setDragTool(null);
      const svg = mainRef.current?.querySelector("svg[data-emf-scene]");
      if (!isNextTool(key) || !svg || !moved) { const to = fixedTarget(key); flyToPlace(key, to.x, to.y - 70); return; }
      const point = clientToViewBox(svg, last.x, last.y);
      if (BOARD_PART_KEYS.includes(key)) {
        const onBoard = point.x >= BOARD_RECT.x && point.x <= BOARD_RECT.x + BOARD_RECT.w && point.y >= BOARD_RECT.y && point.y <= BOARD_RECT.y + BOARD_RECT.h;
        if (!onBoard) { flash(`Thả “${TOOLS.find((tool) => tool.k === key)?.name}” LÊN bảng mạch — chân linh kiện sẽ cắm vào các nút.`); return; }
        const spot = spotNear(key, point);
        if (!spot) { flash("Chỗ này bị linh kiện/dây khác chiếm — thả chỗ khác."); return; }
        commitPlace(key, spot);
        return;
      }
      const to = fixedTarget(key);
      if (Math.hypot(point.x - to.x, point.y - to.y) < 160) flyToPlace(key, point.x, point.y);
      else flash(`Kéo “${TOOLS.find((tool) => tool.k === key)?.name}” vào vòng sáng trên bàn.`);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* ---------------- Dời linh kiện trên bảng (bấm khóa K = đóng/mở) ---------------- */
  const beginPartDrag = (kind, event) => {
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    const start = { x: event.clientX, y: event.clientY };
    let moved = false;
    let spot = null;
    const others = { ...placements };
    delete others[kind];
    const move = (e) => {
      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 7) return;
      if (!moved && switchClosed) { flash("Mở khóa K trước khi dời linh kiện."); window.removeEventListener("pointermove", move); return; }
      moved = true;
      const point = clientToViewBox(svg, e.clientX, e.clientY);
      spot = spotNear(kind, point, others);
      if (!frameRef.current) frameRef.current = requestAnimationFrame(() => { frameRef.current = null; setPartDrag({ kind, x: point.x, y: point.y, at: spot }); });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
      setPartDrag(null);
      if (!moved) {
        if (kind === "switch") toggleSwitch();
        return;
      }
      if (spot && (spot.X !== placements[kind].X || spot.Y !== placements[kind].Y)) {
        setPlacements((old) => ({ ...old, [kind]: spot }));
        flash(`Đã cắm ${BOARD_PARTS[kind].name} sang chỗ mới.`);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* ---------------- Nối dây: chọn điểm cắm → chọn điểm thứ hai (chạm hoặc kéo) ---------------- */
  const endpointAt = (point) => {
    for (const meter of METER_KEYS) {
      if (!placed.has(meter)) continue;
      for (const jack of METER_JACKS) {
        const j = jackScene(meter, jack);
        if (Math.hypot(point.x - j.x, point.y - j.y) < 16) return { t: "jack", meter, jack };
      }
    }
    if (!placed.has("board")) return null;
    const bp = toBoard(point);
    const m = moduleAtPoint(bp.x, bp.y, 30);
    if (m == null) return null;
    const free = freeNodesIn(m, placements, wires, bp)[0];
    return free ? { t: "node", X: free.X, Y: free.Y } : { t: "full", module: m };
  };
  const jackBusy = (e) => e.t === "jack" && wires.some((w) => [w.a, w.b].some((x) => x.t === "jack" && x.meter === e.meter && x.jack === e.jack));
  const tryConnect = (a, b) => {
    setPending(null);
    if (switchClosed) { flash("Mở khóa K trước khi nối hoặc đổi dây.", true); return; }
    if (a.t === "full" || b.t === "full") { flash("Mạng này đã kín chỗ cắm — chọn mạng khác hoặc rút bớt dây."); return; }
    if (endpointKey(a) === endpointKey(b)) return;
    if (a.t === "jack" && b.t === "jack") { flash("Không nối thẳng hai lỗ đồng hồ với nhau — nối qua bảng mạch."); return; }
    if (a.t === "node" && b.t === "node" && moduleOf(a.X, a.Y) === moduleOf(b.X, b.Y)) {
      flash({ text: "Hai điểm này cùng MỘT mạng 9 nút — đã thông nhau sẵn, không cần dây!", kind: "info" });
      return;
    }
    const busy = [a, b].find(jackBusy);
    if (busy) { flash(`${describe(busy)[0].toUpperCase()}${describe(busy).slice(1)} đã có dây — chạm vào dây cũ để rút trước.`); return; }
    const wire = { id: `w${nextWire.current++}`, a, b };
    setWires((old) => [...old, wire]);
    sound("gate");
    flash(`Đã nối ${describe(a)} ↔ ${describe(b)}.`);
  };
  const beginWire = (endpoint, event) => {
    event.stopPropagation();
    if (!assembled) { flash("Lắp đủ dụng cụ rồi mới nối dây."); return; }
    if (switchClosed) { flash("Mở khóa K trước khi nối hoặc đổi dây.", true); return; }
    if (!endpoint) return;
    if (endpoint.t === "full") { flash("Mạng này đã kín chỗ cắm — chọn mạng khác hoặc rút bớt dây."); return; }
    if (pending) {
      if (endpointKey(pending) === endpointKey(endpoint) || (pending.t === "node" && endpoint.t === "node" && moduleOf(pending.X, pending.Y) === moduleOf(endpoint.X, endpoint.Y) && pending.X === endpoint.X && pending.Y === endpoint.Y)) {
        setPending(null);
        return;
      }
      tryConnect(pending, endpoint);
      return;
    }
    if (jackBusy(endpoint)) { flash(`${describe(endpoint)[0].toUpperCase()}${describe(endpoint).slice(1)} đã có dây — chạm vào dây cũ để rút trước.`); return; }
    const svg = event.currentTarget.ownerSVGElement || event.currentTarget.closest("svg");
    const start = { x: event.clientX, y: event.clientY };
    let moved = false;
    let last = start;
    setPending(endpoint);
    const move = (e) => {
      last = { x: e.clientX, y: e.clientY };
      if (Math.hypot(last.x - start.x, last.y - start.y) > 7) moved = true;
      if (moved && !frameRef.current) frameRef.current = requestAnimationFrame(() => { frameRef.current = null; setWireDrag(clientToViewBox(svg, last.x, last.y)); });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
      setWireDrag(null);
      if (!moved) { flash(`Đã chọn ${describe(endpoint)} — chạm mạng hoặc lỗ cắm thứ hai để nối.`); return; }
      const target = endpointAt(clientToViewBox(svg, last.x, last.y));
      if (target) tryConnect(endpoint, target);
      else { setPending(null); flash("Chưa thả trúng mạng hay lỗ cắm nào — thử lại, hoặc chạm lần lượt hai điểm."); }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const tapModule = (m, event) => {
    const p = localPoint(event.currentTarget, event.clientX, event.clientY);
    const free = freeNodesIn(m, placements, wires, p)[0];
    beginWire(free ? { t: "node", X: free.X, Y: free.Y } : { t: "full", module: m }, event);
  };
  const tapPin = (kind, pin, event) => {
    const p = pinNodes(kind, placements[kind]).find((item) => item.pin === pin);
    const free = freeNodesIn(moduleOf(p.X, p.Y), placements, wires, nodePos(p.X, p.Y))[0];
    beginWire(free ? { t: "node", X: free.X, Y: free.Y } : { t: "full", module: moduleOf(p.X, p.Y) }, event);
  };
  const removeWire = (id) => {
    if (switchClosed) { flash("Mở khóa K trước khi gỡ dây."); return; }
    const wire = wires.find((w) => w.id === id);
    setWires((old) => old.filter((w) => w.id !== id));
    setSelectedWire(null);
    if (wire) flash(`Đã gỡ dây ${describe(wire.a)} ↔ ${describe(wire.b)}.`);
  };
  const selectWire = (id) => {
    if (switchClosed) { flash("Mở khóa K trước khi gỡ dây."); return; }
    setPending(null);
    setSelectedWire((old) => (old === id ? null : id));
  };
  const removeAllWires = () => {
    if (!wires.length) return;
    if (switchClosed) { flash("Mở khóa K trước khi gỡ dây."); return; }
    setDialog({
      title: `Gỡ tất cả ${wires.length} dây nối?`,
      message: "Linh kiện vẫn cắm nguyên trên bảng; em nối lại từ đầu.",
      actions: [{ label: "Giữ lại", tone: "primary" }, { label: "Gỡ hết dây", tone: "danger", onClick: () => { setWires([]); setSelectedWire(null); setPending(null); } }],
    });
  };

  /* ---------------- Vận hành ---------------- */
  const cycleMode = (which) => {
    if (switchClosed) { flash("Mở khóa K trước khi xoay núm đồng hồ."); return; }
    const current = which === "ammeter" ? ammeterMode : voltmeterMode;
    const next = METER_MODES[(METER_MODES.indexOf(current) + 1) % METER_MODES.length];
    if (which === "ammeter") setAmmeterMode(next); else setVoltmeterMode(next);
  };
  function toggleSwitch() {
    if (!assembled) { flash("Lắp đủ dụng cụ trước."); return; }
    if (!switchClosed) {
      // Thử trước: đóng K có làm đồng hồ ở nấc mA quá dòng (cháy cầu chì) không?
      const test = solveBoard({ placements, wires, switchClosed: true, rheostat, cell: cellPhysics[cell], modes, metersPlaced, r0: 10 * (1 + 0.02 * heat.r0) });
      const over = [test.ammeter, test.voltmeter].find((r) => r.overload && (r.mode === "mA" || r.mode === "µA"));
      if (over) {
        flash({ text: "⚠ Không đóng K được: dòng qua đồng hồ nấc mA sẽ quá lớn (cháy cầu chì) — ampe kế đang mắc song song với pin hoặc thiếu R₀. Kiểm tra lại mạch!", kind: "warn" }, false, 5200);
        sound("warn");
        return;
      }
      if (!valid) flash("Mạch chưa đúng sơ đồ nên số đo sẽ sai — xem gợi ý ở Bước tiếp theo.");
    }
    setSwitchClosed((value) => !value);
  }
  // Thay pin là thay linh kiện trong mạch → phải mở K.
  const selectCell = (id) => {
    if (id === cell) return;
    if (switchClosed) { flash("Mở khóa K trước khi thay pin."); return; }
    setCell(id);
  };
  const setR = (value) => setRheostat(Math.max(0, Math.min(100, Math.round(value))));

  // Mốc thành tích nhỏ — để việc lấy số liệu có "nhịp" và có điều để khám phá.
  const celebrate = (allRows, cellId, resistance) => {
    const mine = allRows.filter((row) => row.cell === cellId);
    const hit = (key, message) => {
      if (milestones.current.has(key)) return null;
      milestones.current.add(key);
      return message;
    };
    const currents = mine.map((row) => row.current * 1000);
    const spread = currents.length ? Math.max(...currents) - Math.min(...currents) : 0;
    const fit = linearFit(mine);
    const messages = [
      allRows.length === 1 && hit("first", "📍 Điểm đầu tiên đã lên đồ thị!"),
      mine.length === 2 && hit(`line-${cellId}`, `📈 ${CELL_NAMES[cellId]}: đường U–I đã hiện — nhìn chỗ nó cắt trục U!`),
      spread >= 60 && hit(`spread-${cellId}`, "🎯 Các điểm trải rộng — đường thẳng rất chắc chắn."),
      mine.length === EMF_MIN_POINTS && hit(`enough-${cellId}`, `🔋 Đủ ${EMF_MIN_POINTS} điểm ${CELL_NAMES[cellId].toLowerCase()}: E ≈ ${fit.emf.toFixed(3)} V · r ≈ ${fit.internalR.toFixed(2)} Ω`),
      allRows.filter((row) => row.cell === "new").length >= 2 && allRows.filter((row) => row.cell === "old").length >= 2
        && hit("compare", "⚖️ So hai đường: pin cũ dốc hơn → điện trở trong lớn hơn!"),
    ].filter(Boolean);
    if (messages.length) { flash({ text: messages[messages.length - 1], kind: "win" }, false, 4400); sound("win"); }
    else { flash(`Đã ghi điểm R = ${resistance} Ω (${mine.length} điểm ${CELL_NAMES[cellId].toLowerCase()}).`); sound("record"); }
  };
  // Mạch vừa khép kín / K mở mà vôn kế chỉ đúng E — hai "khoảnh khắc" đáng khen.
  const circuitReady = assembled && valid;
  const openReadsE = circuitReady && !switchClosed && voltmeterMode === "V";
  const jumpers = wires.filter((w) => w.a.t === "node" && w.b.t === "node").length;
  useEffect(() => {
    if (!circuitReady || milestones.current.has("closed-loop")) return;
    milestones.current.add("closed-loop");
    const id = window.setTimeout(() => {
      flash({ text: jumpers === 0
        ? "⚡ Mạch khép kín! Pin → K → R₀ → biến trở nối tiếp nhau NGAY TRÊN BẢNG — các chân cắm chung mạng nên không tốn sợi dây nào."
        : `⚡ Mạch khép kín! Bảng mạch nối các chân cắm chung mạng, ${jumpers} dây nối tắt nối các mạng còn lại.`, kind: "win" }, false, 5200);
      sound("win");
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuitReady]);
  useEffect(() => {
    if (!openReadsE || milestones.current.has("open-E")) return;
    milestones.current.add("open-E");
    const id = window.setTimeout(() => flash({ text: `🔋 K đang mở → không có dòng điện → vôn kế chỉ đúng E ≈ ${vmRead.value.toFixed(3)} V. Đóng K xem U tụt xuống!`, kind: "win" }, false, 5200), 900);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openReadsE]);

  const r0Hot = heat.r0 > 0.55;
  useEffect(() => {
    if (!r0Hot || milestones.current.has("r0-hot")) return;
    milestones.current.add("r0-hot");
    const id = window.setTimeout(() => flash({ text: "🔥 R₀ đang nóng lên (P = I²R). Nhờ R₀ mà dòng điện không quá lớn làm hỏng pin và đồng hồ. Đo xong nhớ mở K cho nguội!", kind: "warn" }, false, 5200), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r0Hot]);

  const removeRow = (id) => setRows((old) => old.filter((row) => row.id !== id));
  const record = () => {
    if (!circuitReady) { flash(analysis?.issue?.text || "Mạch chưa đúng sơ đồ."); return; }
    if (!modesOK) { flash("Xoay ĐO1 về mA và ĐO2 về V trước."); return; }
    if (!switchClosed) { flash("Đóng K để có dòng điện rồi mới ghi."); return; }
    const mine = rowsOf(cell);
    const resistance = Math.round(rInCircuit);
    const near = mine.find((row) => Math.abs(row.resistance - resistance) < EMF_MIN_GAP);
    if (near) { flash(`Quá gần điểm R = ${near.resistance} Ω đã ghi — kéo con chạy cách xa hơn ${EMF_MIN_GAP} Ω.`); return; }
    if (mine.length >= EMF_MAX_POINTS) { flash(`${CELL_NAMES[cell]} đã có ${EMF_MAX_POINTS} điểm — xoá bớt nếu muốn đo lại.`); return; }
    const row = { id: nextId.current++, cell, resistance, current: ammeterShown / 1000, voltage: voltmeterShown };
    const next = [...rows, row];
    setRows(next);
    celebrate(next, cell, resistance);
  };
  const doReset = () => {
    setPlaced(new Set());
    setPlacements({});
    setWires([]);
    setPending(null);
    setSwitchClosed(false);
    setAmmeterMode("OFF");
    setVoltmeterMode("OFF");
    setRows([]);
    setCell("new");
    setRheostat(EMF_START_R);
    milestones.current = new Set();
    flash("Đã đặt lại phòng Lab.");
  };
  const reset = () => {
    if (!placed.size && !rows.length) { doReset(); return; }
    setDialog({
      title: "Làm lại từ đầu?",
      message: "Sẽ gỡ linh kiện, dây nối và xoá số liệu đã ghi.",
      actions: [{ label: "Ở lại", tone: "primary" }, { label: "Làm lại từ đầu", tone: "danger", onClick: doReset }],
    });
  };
  const saveTrials = () => {
    const trials = rows.map((row) => {
      const fit = row.cell === "new" ? fitNew : fitOld;
      return { lab: "emf", cell: row.cell, s: fit.emf, t: 1, config: row.resistance, expected: cellPhysics[row.cell].emf, voltage: row.voltage, current: row.current, resistance: row.resistance, emf: fit.emf, internalR: fit.internalR, balanced: true };
    });
    onExportNote({ lab: "emf", measuredD: 0, trials });
  };
  const exportNote = () => {
    if (!rows.length) { flash("Chưa có số liệu để lưu."); return; }
    if (canExport) { saveTrials(); return; }
    setDialog({
      title: "Chưa đủ số liệu — vẫn lưu?",
      message: `Mỗi pin cần ≥ ${EMF_MIN_POINTS} điểm${targets.length ? " và đủ các mốc GV" : ""}. Hiện có pin mới ${newRows.length} · pin cũ ${oldRows.length} điểm.`,
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
      if (next) commitPlace(next); else flash("Đã lắp đủ dụng cụ.");
      return;
    }
    if (payload === "auto_wire") {
      if (!assembled) { flash("Cần lắp đủ dụng cụ trước khi nối dây."); return; }
      if (switchClosed) { flash("Mở K trước khi nối tự động."); return; }
      const jackPos = (meter, jack) => toBoard(jackScene(meter, jack));
      let layout = placements;
      let plan = planWires(layout, jackPos);
      if (!analyzeBoard({ placements: layout, wires: plan }).valid) {
        layout = { ...CANONICAL_LAYOUT };
        plan = planWires(layout, jackPos);
        setPlacements(layout);
      }
      nextWire.current = plan.length + 1;
      setWires(plan);
      setPending(null);
      flash(layout === placements ? "Đã nối mạch theo sơ đồ — xem các dây đi vào mạng nào." : "Đã cắm lại linh kiện theo bố trí mẫu và nối mạch theo sơ đồ.");
      return;
    }
    if (payload === "auto_mode") {
      if (switchClosed) { flash("Mở khóa K trước khi đổi nấc đo."); return; }
      setAmmeterMode("mA"); setVoltmeterMode("V"); flash("Đã đặt ĐO1 ở mA và ĐO2 ở V."); return;
    }
    if (payload === "auto_switch") {
      if (!circuitReady || !modesOK) { flash("Chưa đủ điều kiện đóng K; hãy hoàn tất mạch và nấc đo trước."); return; }
      setSwitchClosed(true); flash("Đã đóng khóa K; đồng hồ bắt đầu hiển thị số đo."); return;
    }
    if (payload === "auto_open_switch") { setSwitchClosed(false); flash("Đã mở khóa K."); return; }
    if (payload === "auto_cell") { setSwitchClosed(false); setCell(otherCell); flash(`Đã mở K và thay sang ${CELL_NAMES[otherCell].toLowerCase()}.`); }
  };

  /* ======================= BƯỚC TIẾP THEO (một nguồn sự thật) ======================= */
  const setupDone = circuitReady && modesOK;
  const nextToolNames = activeGroup.filter((key) => !placed.has(key)).map((key) => TOOLS.find((tool) => tool.k === key)?.name).filter(Boolean);
  let next;
  if (!assembled) {
    const onBoardStep = activeGroup.some((key) => BOARD_PART_KEYS.includes(key));
    next = {
      key: "assemble",
      title: onBoardStep ? `Cắm ${nextToolNames.join(" / ")} lên bảng mạch` : `Lắp ${nextToolNames.join(" / ") || "dụng cụ"}`,
      hint: onBoardStep
        ? isMobile
          ? "Chạm linh kiện ở khay — nó tự cắm vào chỗ gợi ý trên bảng (có thể kéo để dời)."
          : "Kéo linh kiện thả LÊN bảng: chân tự cắm vào nút gần nhất. Hai linh kiện có chân chung một mạng thì đã nối với nhau."
        : isMobile ? "Chạm dụng cụ đang sáng ở khay bên trái để lắp vào bàn." : "Kéo dụng cụ đang sáng ở khay bên trái thả vào vòng (+) trên bàn — hoặc bấm vào nó để lắp nhanh.",
      assist: "auto_place_next",
    };
  } else if (!valid) {
    next = {
      key: "wire",
      title: "Nối mạch trên bảng",
      hint: switchClosed
        ? "Mở khóa K trước khi nối hoặc đổi dây."
        : pending
          ? `Đã chọn ${describe(pending)} — chạm mạng hoặc lỗ cắm thứ hai để nối (chạm lại để bỏ chọn).`
          : analysis?.issue?.text || "Chạm một mạng (hoặc lỗ cắm đồng hồ), rồi chạm điểm thứ hai để nối dây.",
      assist: "auto_wire",
    };
  } else if (!modesOK) {
    next = {
      key: "mode",
      title: "Chọn nấc đo: ĐO1 → mA, ĐO2 → V",
      hint: switchClosed ? "Mở khóa K trước, rồi bấm vào núm xoay của từng đồng hồ để chuyển nấc." : "Bấm vào núm xoay của từng đồng hồ để chuyển nấc: ĐO1 tới mA, ĐO2 tới V.",
      assist: "auto_mode",
    };
  } else if (canExport) {
    next = { key: "done", title: "Đã đủ số liệu cả hai pin", hint: "Lưu số liệu vào Sổ Báo Cáo để vẽ đồ thị U–I và suy ra E, r.", primaryLabel: "Lưu vào Sổ Báo Cáo", primaryShort: "Lưu" };
  } else if (subjectDone(cell)) {
    next = switchClosed
      ? { key: "openK", title: "Mở khóa K", hint: `Đã đủ số liệu ${CELL_NAMES[cell].toLowerCase()}. Mở K trước khi thay pin.`, assist: "auto_open_switch" }
      : { key: "subject", title: `Thay sang ${CELL_NAMES[otherCell].toLowerCase()}`, hint: `Chọn “${CELL_NAMES[otherCell]}” ở thẻ đo bên phải.`, assist: "auto_cell" };
  } else {
    const mine = rowsOf(cell);
    const resistance = Math.round(rInCircuit);
    const near = mine.find((row) => Math.abs(row.resistance - resistance) < EMF_MIN_GAP);
    const missing = missingOf(cell);
    const onMissing = missing.some((value) => Math.abs(value - resistance) <= 1);
    const currents = mine.map((row) => row.current * 1000);
    const spread = currents.length ? Math.max(...currents) - Math.min(...currents) : 0;
    if (!switchClosed) {
      next = { key: "switch", title: "Đóng khóa K cho dòng điện chạy", hint: `Khi K mở, vôn kế chỉ đúng E (≈ ${vmRead.value.toFixed(3)} V). Đóng K: dòng điện chạy qua các mạng của bảng và U tụt xuống.`, assist: "auto_switch" };
    } else if (missing.length && !onMissing) {
      next = { key: "dial", title: `Kéo con chạy tới R = ${missing[0]} Ω (mốc GV)`, hint: "Kéo con chạy biến trở trên bảng, hoặc dùng thanh chỉnh bên phải." };
    } else if (near) {
      next = { key: "dial", title: "Kéo con chạy tới vị trí mới", hint: `R = ${resistance} Ω gần điểm đã ghi (${near.resistance} Ω). Kéo con chạy biến trở — chấm vàng trên đồ thị trượt theo.` };
    } else {
      next = {
        key: "record",
        title: `Ghi điểm ${Math.min(mine.length + 1, EMF_MIN_POINTS)}/${EMF_MIN_POINTS} của ${CELL_NAMES[cell].toLowerCase()}`,
        hint: `R = ${resistance} Ω · I = ${ammeterShown.toFixed(1)} mA · U = ${voltmeterShown.toFixed(3)} V.${mine.length >= 2 && spread < 40 ? " Mẹo: thử cả R gần 0 Ω và gần 100 Ω để các điểm trải rộng." : ""}`,
        primaryLabel: "Ghi điểm",
      };
    }
  }
  const phase = !assembled ? 0 : !setupDone ? 1 : !canExport ? 2 : 3;
  const handlePrimary = () => (next.key === "record" ? record() : exportNote());
  const speechText = `${next.title}. ${next.hint || ""}`.trim();
  const speechKey = `${next.key}|${["record", "dial", "wire"].includes(next.key) ? cell : next.title}`;

  // TTS: đọc bước tiếp theo mỗi khi bước đổi (không đọc lại khi chỉ số liệu trong gợi ý đổi).
  useEffect(() => {
    if (!speak || speechKey === lastSpoken.current) return;
    lastSpoken.current = speechKey;
    speak(speechText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechKey, speak]);

  /* ---------------- Đường đi của dòng điện (qua dây VÀ qua mạng của bảng) ---------------- */
  const flow = useMemo(() => {
    if (!live || !analysis?.path) return [];
    const term = (e, which) => (e.id === "ammeter"
      ? { t: "jack", meter: "ammeter", jack: which }
      : pinEndpoint(placements, e.id.startsWith("rheostat") ? "rheostat" : e.id, which));
    let prev = pinEndpoint(placements, "battery", "+");
    const segs = [];
    analysis.path.forEach((e) => { segs.push(...routeWithinNet(prev, term(e, e.enter), wires)); prev = term(e, e.exit); });
    segs.push(...routeWithinNet(prev, pinEndpoint(placements, "battery", "-"), wires));
    return segs;
  }, [live, analysis, placements, wires]);

  /* ============================ GIAO DIỆN ============================ */
  // Vòng nối tiếp đã đúng khi lỗi còn lại (nếu có) chỉ nằm ở vôn kế.
  const loopOK = valid || ["voltmeter", "voltmeter-reversed", "voltmeter-place", "jack-voltmeter"].includes(analysis?.issue?.key);
  const setupItems = [
    { key: "wire", text: "Mạch nối tiếp pin → K → R₀ → biến trở (A–C) → ĐO1 → pin", done: loopOK },
    { key: "volt", text: "ĐO2 mắc vào hai cực pin (VΩ → M, COM → N)", done: valid },
    { key: "mode", text: "ĐO1 ở nấc mA · ĐO2 ở nấc V", done: modesOK },
  ];
  const referenceCard = (
    <section style={{ ...panelCard, padding: 10 }}>
      <div style={{ ...sectionHead, marginBottom: 4 }}><span style={sectionTitle}>Bảng lắp mạch dùng thế nào?</span></div>
      <div style={{ fontSize: 11.5, lineHeight: 1.5, color: C.ink, fontWeight: 600 }}>
        9 nút trong một <b>mạng</b> thông nhau: chân linh kiện cắm chung mạng là đã nối. Chạm một mạng (hoặc lỗ cắm đồng hồ) rồi chạm điểm thứ hai để nối dây; chạm dây để rút.
        <div style={{ marginTop: 4, color: C.sub }}>Sơ đồ: M(+) → K → R₀ → biến trở (A–C) → ĐO1 (mA → COM) → N(−); ĐO2: VΩ → M, COM → N.</div>
      </div>
      {wires.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <span style={{ flex: 1, fontSize: 11.5, fontWeight: 800, color: C.sub }}>Dây nối: <b style={{ color: C.ink }}>{wires.length}</b> · chạm một dây để gỡ</span>
          <button type="button" onClick={removeAllWires} style={{ ...btnSecondary, padding: "5px 10px", fontSize: 11.5, borderColor: "#FCA5A5", color: "#B91C1C" }}>Gỡ hết dây</button>
        </div>
      )}
    </section>
  );

  const measureCard = (
    <section style={{ ...panelCard, padding: 10, border: `1.5px solid ${live ? `${C.good}66` : C.line}`, background: live ? "#F6FBF5" : "#fff" }}>
      <div style={{ display: "flex", gap: 6 }}>
        {["new", "old"].map((id) => (
          <button type="button" key={id} onClick={() => selectCell(id)}
            style={cell === id ? { ...btnSmall, background: CELL_COLORS[id], borderColor: CELL_COLORS[id], color: "#fff" } : btnSmall}>
            {CELL_NAMES[id]}{subjectDone(id) ? " ✓" : ""}
          </button>
        ))}
        <button type="button" onClick={toggleSwitch} style={{ ...btnSecondary, padding: "6px 10px", fontSize: 12, borderColor: switchClosed ? C.good : C.navy, color: switchClosed ? C.good : C.navy, flexShrink: 0 }}>
          <Power size={13} strokeWidth={2.6} /> {switchClosed ? "Mở K" : "Đóng K"}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 8 }}>
        <div style={{ flex: 1, minWidth: 0, fontFamily: "monospace", fontWeight: 900, lineHeight: 1.3 }}>
          <div style={{ fontSize: 15, color: live ? C.ink : C.sub }}><span style={meterTag}>ĐO1</span>{amRead.mode === "mA" ? (amRead.overload ? "OL" : `${ammeterShown.toFixed(1)} mA`) : "----"}</div>
          <div style={{ fontSize: 15, color: vmRead.mode === "V" ? C.ink : C.sub }}><span style={meterTag}>ĐO2</span>{vmRead.mode === "V" ? `${voltmeterShown.toFixed(3)} V` : "----"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={miniLabel}>Biến trở trong mạch</div>
          <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 900, color: C.orangeDk, lineHeight: 1.1 }}>{Math.round(rInCircuit)} Ω</div>
          {circuitReady && !switchClosed && voltmeterMode === "V" && <div style={{ fontSize: 10.5, fontWeight: 900, color: C.good }}>K mở: ĐO2 ≈ E</div>}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <ProgressPills items={[
          ...["new", "old"].map((id) => ({ key: id, label: `${CELL_NAMES[id]} `, value: `${Math.min(EMF_MIN_POINTS, rowsOf(id).length)}/${EMF_MIN_POINTS}`, done: subjectDone(id), current: id === cell && !subjectDone(id) })),
          ...(targets.length ? [{ key: "gv", label: "Mốc GV ", value: targets.join(", "), done: !missingOf("new").length && !missingOf("old").length }] : []),
        ]} />
      </div>
    </section>
  );

  const controlsCard = (
    <section style={{ ...panelCard, padding: 10 }}>
      <NudgeSlider
        label="Con chạy biến trở"
        valueText={`R(AC) = ${rheostat} Ω`}
        value={rheostat} min={0} max={100} step={1}
        ariaLabel="Biến trở (Ω)"
        nudges={[{ label: "−5", delta: -5 }, { label: "+5", delta: 5 }]}
        onChange={(v, isDelta) => setR(isDelta ? rheostat + v : v)}
        extra={targets.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7, alignItems: "center" }}>
            <span style={{ fontSize: 10.5, fontWeight: 900, color: C.navy }}>Mốc GV:</span>
            {targets.map((value) => {
              const done = rowsOf(cell).some((row) => Math.abs(row.resistance - value) <= 1);
              return <button type="button" key={value} onClick={() => setR(analysis?.rheostatPins?.includes("A") === false ? 100 - value : value)} style={{ ...choiceButton, ...(done ? { color: C.good, borderColor: `${C.good}88` } : {}) }}>{done ? "✓ " : ""}{value} Ω</button>;
            })}
          </div>
        ) : null}
      />
    </section>
  );

  const emfFits = { new: fits.new, old: fits.old };
  const dataCard = (
    <section style={{ ...panelCard, padding: 10, flexShrink: 1, minHeight: 96, display: "flex", flexDirection: "column" }}>
      <div style={{ ...sectionHead, marginBottom: 6 }}>
        <span style={sectionTitle}>Số liệu · {rows.length} điểm</span>
        <span style={countPill}>{fits.new ? `mới: E ${fits.new.emf.toFixed(3)}` : "mới —"} · {fits.old ? `cũ: E ${fits.old.emf.toFixed(3)}` : "cũ —"}</span>
      </div>
      <div data-lab-scroll style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
        {[...rows].sort((a, b) => (a.cell === b.cell ? a.resistance - b.resistance : a.cell === "new" ? -1 : 1)).map((row) => (
          <div key={row.id} style={{ display: "grid", gridTemplateColumns: "34px 1fr 1fr 1fr 22px", alignItems: "center", gap: 4, padding: "3px 6px", borderRadius: 7, background: C.bg, fontSize: 11.5, fontFamily: "monospace", fontWeight: 800, color: C.ink }}>
            <b style={{ color: CELL_COLORS[row.cell], fontFamily: FONT }}>{row.cell === "new" ? "Mới" : "Cũ"}</b>
            <span>{row.resistance} Ω</span>
            <span>{(row.current * 1000).toFixed(1)} mA</span>
            <span>{row.voltage.toFixed(3)} V</span>
            <button type="button" onClick={() => removeRow(row.id)} aria-label={`Xoá điểm R = ${row.resistance} Ω`} style={deleteBtn}>×</button>
          </div>
        ))}
        {!rows.length && <div style={{ fontSize: 12, color: C.sub, fontStyle: "italic", padding: "6px 2px" }}>Chưa có điểm nào. Đóng K → kéo con chạy → Ghi điểm.</div>}
      </div>
    </section>
  );

  const emfLivePoint = circuitReady && modesOK ? { mA: Math.max(0, switchClosed ? ammeterShown : 0), u: Math.max(0, voltmeterShown) } : null;
  const emfStageGraph = (
    <section style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 15, padding: "8px 10px 2px", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <b style={{ fontSize: 13, color: C.ink, whiteSpace: "nowrap" }}>Đồ thị U–I trực tiếp</b>
        <span style={{ fontSize: 11.5, color: C.sub, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {fits.new || fits.old
            ? ["new", "old"].filter((id) => fits[id]).map((id) => `${CELL_NAMES[id]}: E ≈ ${fits[id].emf.toFixed(3)} V · r ≈ ${fits[id].internalR.toFixed(2)} Ω`).join("  |  ")
            : live ? "Kéo con chạy: chấm vàng trượt theo — bấm “Ghi điểm” để giữ lại." : "Khi K mở, chấm vàng nằm trên trục U đúng tại E."}
        </span>
        <button type="button" onClick={record} disabled={!live} style={{ ...ghostPrimary, opacity: live ? 1 : 0.45, cursor: live ? "pointer" : "not-allowed" }}>📍 Ghi điểm</button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <EmfGraph rows={rows} fits={emfFits} live={emfLivePoint} activeCell={cell} compact={isMobile} tall={isMobile && isPortrait} />
      </div>
    </section>
  );
  const emfGraphCard = (
    <section style={{ ...panelCard, padding: 10 }}>
      <div style={{ height: 220 }}><EmfGraph rows={rows} fits={emfFits} live={emfLivePoint} activeCell={cell} compact /></div>
    </section>
  );

  const measuring = setupDone || rows.length > 0;
  const panelContent = (
    <>
      <NextStepCard phase={phase} next={next} onSpeak={speak && !muted ? () => speak(speechText) : null} onPrimary={handlePrimary} onAssist={runAssistantAction} />
      {assembled && !setupDone && <ChecklistCard title="Thiết lập trước khi đo" items={setupItems} currentKey={!loopOK ? "wire" : !valid ? "volt" : "mode"} />}
      {!setupDone && placed.has("board") && referenceCard}
      {measuring && measureCard}
      {measuring && !isMobile && controlsCard}
      {isMobile && measuring && !isPortrait && emfGraphCard}
      {measuring && dataCard}
    </>
  );
  const finishButton = <FinishButton count={rows.length} allDone={canExport} onFinish={exportNote} />;
  const showTray = !assembled;
  const portraitStack = isMobile && isPortrait;
  const sceneH = Math.round(Math.max(120, viewportW - (showTray ? 86 : 0) - 6) * VBH / VBW);
  const showStageGraph = measuring && (!isMobile || isPortrait);
  const focusRoots = new Set(!valid && analysis?.issue?.focus ? analysis.issue.focus : []);
  const focusModules = analysis?.nets && focusRoots.size
    ? Array.from({ length: GRID.moduleCols * GRID.moduleRows }, (_, m) => m).filter((m) => focusRoots.has(analysis.nets.find(m)))
    : [];

  return (
    <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", background: C.bg, color: C.ink, fontFamily: FONT }}>
      <LabTopBar
        isMobile={isMobile}
        isPortrait={isPortrait}
        title="Bài 26 — Suất điện động pin điện hóa"
        shortTitle="Bài 26 · Pin điện hóa"
        onExit={handleExit}
        onPrelab={onReplayPrelab}
        onRestart={reset}
        muted={muted}
        onToggleMute={speak ? onToggleMute : null}
      />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: isMobile ? (showTray ? "86px minmax(0,1fr)" : "minmax(0,1fr)") : (showTray ? "clamp(185px,13vw,225px) minmax(0,1fr) clamp(320px,23vw,390px)" : "minmax(0,1fr) clamp(320px,23vw,390px)"), overflow: "hidden", position: "relative" }}>
        {showTray && (
          <aside data-lab-scroll style={{ borderRight: `1px solid ${C.line}`, padding: isMobile ? 4 : 9, overflowY: "auto", background: "#fff" }}>
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
                  onClick={() => { if (isMobile && nextTool && !done) { const to = fixedTarget(tool.k); flyToPlace(tool.k, to.x, to.y - 75); } }}
                  style={{ width: "100%", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: isMobile ? 2 : 8, padding: isMobile ? 4 : "7px 8px", marginBottom: 5, borderRadius: 11, cursor: done ? "default" : isMobile ? "pointer" : "grab", touchAction: "none", border: `1.5px solid ${done ? C.good : nextTool ? C.orange : C.line}`, background: done ? "#F3F8F3" : "#fff", opacity: done ? .62 : nextTool ? 1 : .62, boxShadow: nextTool ? `0 0 0 3px ${C.orange}20` : "none", fontFamily: FONT }}>
                  <span style={{ width: isMobile ? 38 : 46, height: isMobile ? 34 : 42, display: "grid", placeItems: "center", background: "#FAF6F0", borderRadius: 8, flexShrink: 0 }}>
                    <img src={tool.img} alt="" style={{ width: isMobile ? 34 : 40, height: isMobile ? 30 : 36, objectFit: "contain" }} />
                  </span>
                  <span style={{ minWidth: 0, textAlign: isMobile ? "center" : "left" }}>
                    <span style={{ display: "block", fontSize: isMobile ? 8.5 : 12, fontWeight: 900, lineHeight: 1.15, color: C.ink }}>{tool.name}</span>
                    <span style={{ display: "block", fontSize: isMobile ? 7.5 : 9.5, color: done ? C.good : nextTool ? C.orangeDk : C.sub }}>{done ? "✓ Đã lắp" : nextTool ? isMobile ? "Chạm để lắp" : BOARD_PART_KEYS.includes(tool.k) ? "Kéo lên bảng" : "Kéo vào bàn" : tool.sub}</span>
                  </span>
                </button>
              );
            })}
          </aside>
        )}
        <main ref={mainRef} style={{ position: "relative", minWidth: 0, minHeight: 0, padding: isMobile ? 3 : 8, outline: dragTool ? `2px dashed ${C.orange}` : "none", outlineOffset: -4, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={portraitStack ? { flex: "0 0 auto", height: sceneH } : { flex: "1 1 0", minHeight: 0 }}>
            <EmfScene
              placed={placed} placements={placements} wires={wires} pending={pending} wireDrag={wireDrag} partDrag={partDrag}
              activeGroup={activeGroup} flyTool={flyTool} isMobile={isMobile} assembled={assembled}
              switchClosed={switchClosed} ammeterMode={ammeterMode} voltmeterMode={voltmeterMode}
              ammeterRead={{ ...amRead, shown: ammeterShown }} voltmeterRead={{ ...vmRead, shown: voltmeterShown }}
              cell={cell} rheostat={rheostat} rheostatSpan={live ? (analysis?.rheostatPins?.includes("A") ? "AC" : "CB") : null}
              focusModules={focusModules} flow={flow} currentMa={currentMa}
              cellHeat={live ? Math.min(1, ((currentMa / 1000) ** 2 * cellPhysics[cell].r) / 0.04) : 0}
              onModule={tapModule} onPin={tapPin} onJack={(meter, jack, event) => beginWire({ t: "jack", meter, jack }, event)}
              onPartDown={beginPartDrag} onRheostat={setR} onCycleMode={cycleMode} onRemoveWire={removeWire}
              selectedWire={selectedWire} onSelectWire={selectWire} heat={heat}
              onCancelPending={() => { setPending(null); setSelectedWire(null); }}
            />
          </div>
          {showStageGraph && (
            <div style={portraitStack ? { flex: "1 1 0", minHeight: 0, paddingBottom: 64 } : { flex: "0 0 clamp(180px, 32%, 280px)", minHeight: 0 }}>{emfStageGraph}</div>
          )}
          <LabToast toast={toast} />
          <LabDialog dialog={dialog} onClose={() => setDialog(null)} />
          {isMobile && (
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
        {!isMobile && (
          <aside style={{ borderLeft: `1px solid ${C.line}`, background: C.bg, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
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
function EmfScene({
  placed, placements, wires, pending, wireDrag, partDrag, activeGroup, flyTool, isMobile, assembled,
  switchClosed, ammeterMode, voltmeterMode, ammeterRead, voltmeterRead, cell, rheostat, rheostatSpan,
  focusModules, flow, currentMa, cellHeat, heat, selectedWire,
  onModule, onPin, onJack, onPartDown, onRheostat, onCycleMode, onRemoveWire, onSelectWire, onCancelPending,
}) {
  const [hoverWire, setHoverWire] = useState(null);
  const has = (key) => placed.has(key);
  const flowDur = flowDuration(currentMa);
  const pendingModule = pending?.t === "node" ? moduleOf(pending.X, pending.Y) : null;
  const glowFlow = flow.length > 0;
  const renderPart = (kind, at, ghost = false) => {
    if (!at) return null;
    const pins = pinNodes(kind, at).map((p) => ({ pin: p.pin, ...nodePos(p.X, p.Y) }));
    const common = ghost ? {} : { onBodyPointerDown: (e) => onPartDown(kind, e), onPinPointerDown: assembled ? (pin, e) => { e.stopPropagation(); onPin(kind, pin, e); } : null };
    if (kind === "battery") return <BoardBattery key={`${kind}${ghost ? "-g" : ""}`} pins={pins} cell={cell} heat={ghost ? 0 : cellHeat} {...common} />;
    if (kind === "switch") return <BoardSwitch key={`${kind}${ghost ? "-g" : ""}`} pins={pins} closed={switchClosed} glow={!ghost && glowFlow} {...common} />;
    if (kind === "protect") return <BoardResistor key={`${kind}${ghost ? "-g" : ""}`} pins={pins} heat={ghost ? 0 : heat.r0} {...common} />;
    return <BoardRheostat key={`${kind}${ghost ? "-g" : ""}`} pins={pins} value={rheostat} glow={!ghost && glowFlow} activeSpan={ghost ? null : rheostatSpan} heat={ghost ? 0 : heat.rh} onChange={ghost ? null : onRheostat} {...common} />;
  };

  return (
    <svg
      data-emf-scene="1"
      viewBox={`0 0 ${VBW} ${VBH}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={(event) => { if (pending && (event.target === event.currentTarget || event.target.closest?.("[data-bg]"))) onCancelPending(); }}
      style={{ width: "100%", height: "100%", minHeight: 0, display: "block", border: `1px solid ${C.line}`, borderRadius: 15, background: "linear-gradient(#fff,#FBF6EC)", touchAction: "none", fontFamily: FONT }}
    >
      <rect data-bg="1" x="0" y={VBH - 44} width={VBW} height="44" fill="#F3EBDD" />
      {!placed.size && <text x={VBW / 2} y="40" textAnchor="middle" fontSize="15" fontWeight="800" fill={C.sub}>Kéo bảng lắp mạch vào vòng sáng để bắt đầu…</text>}

      {has("board") && (
        <g transform={`translate(${B.x} ${B.y}) scale(${B.s})`}>
          <g data-bg="1"><CircuitBoard at={{ x: 0, y: 0, s: 1 }} /></g>

          {/* Mạng cần chú ý (theo gợi ý) — nhấp nháy cam */}
          {focusModules.map((m) => {
            const { row, col } = moduleRC(m);
            const r = boardModuleRect(row, col, 26);
            return (
              <rect key={`focus-${m}`} x={r.x} y={r.y} width={r.w} height={r.h} rx="22" fill={`${C.orange}22`} stroke={C.orange} strokeWidth="5" strokeDasharray="14 10" style={{ pointerEvents: "none" }}>
                <animate attributeName="opacity" values="0.45;1;0.45" dur="1.2s" repeatCount="indefinite" />
              </rect>
            );
          })}
          {pendingModule != null && (() => {
            const { row, col } = moduleRC(pendingModule);
            const r = boardModuleRect(row, col, 26);
            return <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="22" fill={`${C.orange}30`} stroke={C.orangeDk} strokeWidth="6" style={{ pointerEvents: "none" }} />;
          })()}

          {/* Vùng chạm: mỗi mạng 9 nút */}
          {assembled && Array.from({ length: GRID.moduleRows * GRID.moduleCols }, (_, m) => {
            const { row, col } = moduleRC(m);
            const r = boardModuleRect(row, col, 26);
            return <rect key={`hit-${m}`} x={r.x} y={r.y} width={r.w} height={r.h} rx="22" fill="transparent" style={{ cursor: "crosshair" }} onPointerDown={(e) => onModule(m, e)} />;
          })}

          {/* Linh kiện cắm trên bảng */}
          {BOARD_PART_KEYS.map((kind) => (partDrag?.kind === kind ? null : renderPart(kind, placements[kind])))}
          {partDrag?.at && <g opacity="0.55" style={{ pointerEvents: "none" }}>{renderPart(partDrag.kind, partDrag.at, true)}</g>}

          {/* Dòng điện chạy QUA MẠNG của bảng */}
          {flow.filter((s) => s.kind === "module").map((s, i) => (
            <path key={`mf-${i}`} d={`M${s.a.x} ${s.a.y} L${s.b.x} ${s.b.y}`} fill="none" stroke="#FDE047" strokeWidth="9" strokeLinecap="round" strokeDasharray="3 22" style={{ pointerEvents: "none" }}>
              <animate attributeName="stroke-dashoffset" from="0" to="-25" dur={flowDur} repeatCount="indefinite" />
            </path>
          ))}
        </g>
      )}

      {has("voltmeter") && <Multimeter at={METERS.voltmeter} title="ĐO2 · VÔN KẾ" mode={voltmeterMode} reading={voltmeterRead.mode === "V" ? voltmeterRead.shown : 0} overload={voltmeterRead.overload} onCycleMode={() => onCycleMode("voltmeter")} highlightJacks={pending ? ["V", "COM"] : []} />}
      {has("ammeter") && <Multimeter at={METERS.ammeter} title="ĐO1 · AMPE KẾ" mode={ammeterMode} reading={ammeterRead.mode === "mA" ? ammeterRead.shown : 0} overload={ammeterRead.overload} onCycleMode={() => onCycleMode("ammeter")} highlightJacks={pending ? ["mA", "COM"] : []} />}

      {/* Dây nối */}
      {wires.map((w) => {
        const { d } = wireGeom(w);
        const color = wireColor(w);
        const a = endpointScene(w.a), b = endpointScene(w.b);
        const active = selectedWire === w.id || hoverWire === w.id;
        return (
          <g key={w.id} role="button" aria-label="Chọn dây để gỡ" onClick={(e) => { e.stopPropagation(); onSelectWire(w.id); }}
            onPointerEnter={() => setHoverWire(w.id)} onPointerLeave={() => setHoverWire((h) => (h === w.id ? null : h))} style={{ cursor: "pointer" }}>
            {active && <path d={d} fill="none" stroke="#FACC15" strokeWidth="12" strokeLinecap="round" opacity=".55" />}
            <path d={d} fill="none" stroke="rgba(15,23,42,.55)" strokeWidth="6.5" strokeLinecap="round" />
            <path d={d} fill="none" stroke={color} strokeWidth="4.4" strokeLinecap="round" />
            <path d={d} fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity=".45" transform="translate(-0.8 -1)" />
            <path d={d} fill="none" stroke="transparent" strokeWidth="18" />
            {[a, b].map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="6.5" fill={color} stroke="#fff" strokeWidth="2" />
                <circle cx={p.x - 1.8} cy={p.y - 1.8} r="1.8" fill="#fff" opacity=".6" />
              </g>
            ))}
          </g>
        );
      })}
      {/* Dòng điện chạy trên dây (dây vôn kế gần như không có dòng nên không có hạt) */}
      {flow.filter((s) => s.kind === "wire").map((s, i) => {
        const w = wires.find((item) => item.id === s.id);
        if (!w) return null;
        return (
          <path key={`wf-${i}`} d={wirePath(w)} fill="none" stroke="#FDE047" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="1.5 13" style={{ pointerEvents: "none" }}>
            <animate attributeName="stroke-dashoffset" from="0" to={s.reverse ? "14.5" : "-14.5"} dur={flowDur} repeatCount="indefinite" />
          </path>
        );
      })}
      {/* Nút gỡ dây: hiện khi rê chuột / chọn một dây */}
      {wires.filter((w) => w.id === selectedWire || w.id === hoverWire).map((w) => {
        const { mid } = wireGeom(w);
        return (
          <g key={`rm-${w.id}`} role="button" aria-label="Gỡ dây này" onClick={(e) => { e.stopPropagation(); onRemoveWire(w.id); }}
            onPointerEnter={() => setHoverWire(w.id)} onPointerLeave={() => setHoverWire((h) => (h === w.id ? null : h))} style={{ cursor: "pointer" }}>
            <rect x={mid.x - 40} y={mid.y - 13} width="80" height="26" rx="13" fill="#B91C1C" stroke="#fff" strokeWidth="2" />
            <text x={mid.x} y={mid.y + 4.5} textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">✕ Gỡ dây</text>
          </g>
        );
      })}
      {pending && wireDrag && (() => {
        const a = endpointScene(pending);
        return <path d={`M${a.x} ${a.y} Q${(a.x + wireDrag.x) / 2} ${Math.max(a.y, wireDrag.y) + 40},${wireDrag.x} ${wireDrag.y}`} fill="none" stroke={C.orangeDk} strokeWidth="3.5" strokeDasharray="8 6" strokeLinecap="round" style={{ pointerEvents: "none" }} />;
      })()}
      {pending && (() => {
        const a = endpointScene(pending);
        return <circle cx={a.x} cy={a.y} r="9" fill={`${C.orange}66`} stroke={C.orangeDk} strokeWidth="3" style={{ pointerEvents: "none" }}><animate attributeName="r" values="7;12;7" dur="1s" repeatCount="indefinite" /></circle>;
      })()}

      {/* Lỗ cắm đồng hồ — vùng chạm */}
      {assembled && METER_KEYS.map((meter) => METER_JACKS.map((jack) => {
        const j = jackScene(meter, jack);
        return <circle key={`${meter}-${jack}`} cx={j.x} cy={j.y} r={isMobile ? 14 : 12} fill="transparent" style={{ cursor: "crosshair" }} onPointerDown={(e) => onJack(meter, jack, e)} />;
      }))}

      {/* Ô thả khi lắp ráp */}
      {activeGroup.map((key) => {
        if (has(key)) return null;
        if (BOARD_PART_KEYS.includes(key)) {
          const at = CANONICAL_LAYOUT[key];
          if (!canPlace(key, at, placements, wires)) return null;
          const pins = pinNodes(key, at).map((p) => toScene(nodePos(p.X, p.Y)));
          const cx = (pins[0].x + pins[pins.length - 1].x) / 2, cy = pins[0].y;
          return (
            <g key={key} style={{ pointerEvents: "none" }}>
              <rect x={pins[0].x - 12} y={cy - 18} width={pins[pins.length - 1].x - pins[0].x + 24} height="36" rx="12" fill={`${C.orange}18`} stroke={C.orange} strokeWidth="2" strokeDasharray="6 5">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="1.3s" repeatCount="indefinite" />
              </rect>
              <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="900" fill={C.orangeDk}>+</text>
            </g>
          );
        }
        const c = key === "board" ? { x: BOARD_RECT.x + BOARD_RECT.w / 2, y: BOARD_RECT.y + BOARD_RECT.h / 2 } : partCenter("meter", METERS[key]);
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

      {assembled && !switchClosed && (
        <g style={{ pointerEvents: "none" }}>
          <rect x={VBW / 2 - 270} y={VBH - 38} width="540" height="30" rx="15" fill="#FFF7ED" stroke="#FDBA74" />
          <text x={VBW / 2} y={VBH - 18} textAnchor="middle" fontSize="12" fontWeight="900" fill={C.orangeDk}>
            {pending ? "Chạm mạng hoặc lỗ cắm thứ hai để nối · chạm lại để bỏ chọn" : "Chạm mạng 9 nút / lỗ cắm đồng hồ rồi chạm điểm thứ hai · chạm dây → “✕ Gỡ dây” · kéo linh kiện để dời"}
          </text>
        </g>
      )}
    </svg>
  );
}

const btnSmall = { flex: 1, border: `1px solid ${C.line}`, borderRadius: 9, background: "#fff", color: C.ink, padding: "6px 6px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: FONT };
const choiceButton = { border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", color: C.sub, padding: "4px 8px", fontSize: 11, fontWeight: 850, cursor: "pointer", fontFamily: FONT };
const deleteBtn = { border: `1px solid ${C.line}`, background: "#fff", color: C.sub, borderRadius: 6, width: 20, height: 20, lineHeight: "16px", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: FONT, padding: 0 };
const miniLabel = { fontSize: 9.5, fontWeight: 900, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4 };
const meterTag = { display: "inline-block", minWidth: 36, fontSize: 10, color: C.sub, fontFamily: FONT, fontWeight: 900 };
const ghostPrimary = { marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, border: 0, borderRadius: 10, background: C.orange, color: "#fff", padding: "6px 11px", fontSize: 12, fontWeight: 900, fontFamily: FONT, flexShrink: 0 };
