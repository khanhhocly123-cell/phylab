"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronDown, ChevronUp, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { C, FONT } from "../../engine/tokens.js";
import { OHM_CONDUCTORS, ohmCurrent, seededCellEmf } from "../../engine/physicsElectric";

const VBW = 1040;
const VBH = 580;
const ASSET = "/lab/electric";
const edgeKey = (a, b) => [a, b].sort().join("|");
const clientToViewBox = (svg, clientX, clientY) => {
  const rect = svg.getBoundingClientRect();
  const scale = Math.min(rect.width / VBW, rect.height / VBH);
  const offsetX = (rect.width - VBW * scale) / 2;
  const offsetY = (rect.height - VBH * scale) / 2;
  return { x: (clientX - rect.left - offsetX) / scale, y: (clientY - rect.top - offsetY) / scale };
};

const BASE_TOOL = { k: "board", name: "Bảng lắp mạch", sub: "216 nút cắm", img: `${ASSET}/circuit-board.svg` };
const OHM_TOOLS = [
  BASE_TOOL,
  { k: "source", name: "Máy biến thế nguồn", sub: "DC điều chỉnh 3–15 V", img: `${ASSET}/transformer.svg` },
  { k: "switch", name: "Công tắc K", sub: "đóng / ngắt mạch", img: `${ASSET}/switch-k.svg` },
  { k: "ammeter", name: "Đồng hồ ĐO1", sub: "đặt thang mA", img: `${ASSET}/multimeter.svg` },
  { k: "conductor", name: "Vật dẫn X / Y", sub: "mẫu điện trở cần đo", img: `${ASSET}/protective-resistor.svg` },
  { k: "voltmeter", name: "Đồng hồ ĐO2", sub: "đặt thang V", img: `${ASSET}/multimeter.svg` },
];
const EMF_TOOLS = [
  BASE_TOOL,
  { k: "battery", name: "Pin điện hóa", sub: "nguồn cần xác định E, r", img: `${ASSET}/battery.svg` },
  { k: "switch", name: "Công tắc K", sub: "đóng / ngắt mạch", img: `${ASSET}/switch-k.svg` },
  { k: "protect", name: "Điện trở bảo vệ", sub: "hạn dòng cho pin", img: `${ASSET}/protective-resistor.svg` },
  { k: "rheostat", name: "Biến trở 100 Ω", sub: "thay đổi dòng điện", img: `${ASSET}/rheostat.svg` },
  { k: "ammeter", name: "Đồng hồ ĐO1", sub: "đặt thang mA", img: `${ASSET}/multimeter.svg` },
  { k: "voltmeter", name: "Đồng hồ ĐO2", sub: "đặt thang V", img: `${ASSET}/multimeter.svg` },
];

const OHM_POS = {
  board: { x: 30, y: 35, w: 980, h: 510 }, source: { x: 70, y: 78, w: 180, h: 145 },
  switch: { x: 300, y: 95, w: 120, h: 86 }, ammeter: { x: 455, y: 58, w: 118, h: 192 },
  conductor: { x: 640, y: 175, w: 165, h: 68 }, voltmeter: { x: 850, y: 58, w: 118, h: 192 },
};
const EMF_POS = {
  board: { x: 30, y: 35, w: 980, h: 510 }, battery: { x: 70, y: 325, w: 175, h: 98 },
  switch: { x: 265, y: 326, w: 120, h: 86 }, protect: { x: 415, y: 346, w: 145, h: 59 },
  rheostat: { x: 590, y: 310, w: 130, h: 121 }, ammeter: { x: 742, y: 280, w: 118, h: 192 },
  voltmeter: { x: 875, y: 82, w: 118, h: 192 },
};

const OHM_PORTS = {
  "source+": { x: 220, y: 201 }, "source-": { x: 172, y: 201 },
  "switch-in": { x: 300, y: 139 }, "switch-out": { x: 420, y: 139 },
  "ammeter-A": { x: 474, y: 236 }, "ammeter-COM": { x: 531, y: 236 },
  "conductor-left": { x: 640, y: 209 }, "conductor-right": { x: 805, y: 209 },
  "voltmeter-V": { x: 940, y: 236 }, "voltmeter-COM": { x: 897, y: 236 },
};
const OHM_EDGES = [
  ["source+", "switch-in"], ["switch-out", "ammeter-A"], ["ammeter-COM", "conductor-left"],
  ["conductor-right", "source-"], ["voltmeter-V", "conductor-left"], ["voltmeter-COM", "conductor-right"],
];
const EMF_PORTS = {
  "battery+": { x: 86, y: 374 }, "battery-": { x: 246, y: 374 },
  "switch-in": { x: 265, y: 370 }, "switch-out": { x: 385, y: 370 },
  "protect-left": { x: 415, y: 375 }, "protect-right": { x: 560, y: 375 },
  "rheostat-left": { x: 590, y: 397 }, "rheostat-right": { x: 720, y: 397 },
  "ammeter-A": { x: 761, y: 458 }, "ammeter-COM": { x: 818, y: 458 },
  "voltmeter-V": { x: 965, y: 260 }, "voltmeter-COM": { x: 922, y: 260 },
};
const EMF_EDGES = [
  ["battery+", "switch-in"], ["switch-out", "protect-left"], ["protect-right", "rheostat-left"],
  ["rheostat-right", "ammeter-A"], ["ammeter-COM", "battery-"],
  ["voltmeter-V", "battery+"], ["voltmeter-COM", "battery-"],
];

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

export default function ElectricalBench({ lessonId, studentName, assignedSets, onExportNote, onBack, onReplayPrelab, speak, muted, onToggleMute }) {
  const isEmf = lessonId === "do-suat-dien-dong-pin-dien-hoa";
  const tools = isEmf ? EMF_TOOLS : OHM_TOOLS;
  const positions = isEmf ? EMF_POS : OHM_POS;
  const ports = isEmf ? EMF_PORTS : OHM_PORTS;
  const requiredEdges = useMemo(() => new Set((isEmf ? EMF_EDGES : OHM_EDGES).map(([a, b]) => edgeKey(a, b))), [isEmf]);
  const groups = isEmf ? [["board"], ["battery"], ["switch", "protect", "rheostat"], ["ammeter", "voltmeter"]] : [["board"], ["source"], ["switch", "conductor"], ["ammeter", "voltmeter"]];

  const [placed, setPlaced] = useState(() => new Set());
  const [wires, setWires] = useState(() => new Set());
  const [dragTool, setDragTool] = useState(null);
  const [flyTool, setFlyTool] = useState(null);
  const [wireDrag, setWireDrag] = useState(null);
  const [toast, setToast] = useState(null);
  const [sourceOn, setSourceOn] = useState(false);
  const [switchClosed, setSwitchClosed] = useState(false);
  const [ammeterMode, setAmmeterMode] = useState("OFF");
  const [voltmeterMode, setVoltmeterMode] = useState("OFF");
  const [sourceVoltage, setSourceVoltage] = useState(2);
  const [material, setMaterial] = useState("X");
  const [rheostat, setRheostat] = useState(20);
  const [ohmRows, setOhmRows] = useState([]);
  const [emfRows, setEmfRows] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const mainRef = useRef(null);

  const unknownEmf = useMemo(() => seededCellEmf(studentName || "Học sinh"), [studentName]);
  const internalR = useMemo(() => 1.2 + ((unknownEmf * 100) % 5) * 0.12, [unknownEmf]);
  const activeGroup = groups.find((group) => group.some((key) => !placed.has(key))) || [];
  const isNextTool = (key) => activeGroup.includes(key) && !placed.has(key);
  const assembled = tools.every((tool) => placed.has(tool.k));
  const wiredOK = wires.size === requiredEdges.size && [...requiredEdges].every((edge) => wires.has(edge));
  const modesOK = ammeterMode === "mA" && voltmeterMode === "V";
  const live = assembled && wiredOK && modesOK && switchClosed && (isEmf || sourceOn);
  const conductorR = OHM_CONDUCTORS[material].resistance;
  const ohmCurrentA = live && !isEmf ? ohmCurrent(sourceVoltage, conductorR) : 0;
  const totalLoad = rheostat + 10 + internalR;
  const emfCurrentA = live && isEmf ? unknownEmf / totalLoad : 0;
  const terminalVoltage = live && isEmf ? unknownEmf - emfCurrentA * internalR : 0;
  const fit = useMemo(() => linearFit(emfRows), [emfRows]);
  const xRows = ohmRows.filter((row) => row.material === "X");
  const yRows = ohmRows.filter((row) => row.material === "Y");
  const canExport = isEmf ? emfRows.length >= 5 : xRows.length >= 5 && yRows.length >= 5;

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 900 || window.matchMedia("(pointer: coarse) and (max-width: 1100px)").matches);
    update(); window.addEventListener("resize", update); return () => window.removeEventListener("resize", update);
  }, []);

  const flash = (message, voice = false) => {
    setToast(message); window.setTimeout(() => setToast(null), 2500);
    if (voice && speak) speak(message);
  };
  const target = (key) => {
    const p = positions[key]; return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
  };
  const placeTool = (key) => {
    if (placed.has(key)) return;
    if (!isNextTool(key)) { flash(`Lắp theo thứ tự — bước này: ${activeGroup.map((k) => tools.find((t) => t.k === k)?.name).join(" / ")}.`); return; }
    setPlaced((old) => new Set(old).add(key));
  };
  const flyToPlace = (key, fromX, fromY) => {
    const to = target(key); const duration = 330; let started = null;
    const step = (now) => {
      if (started === null) started = now;
      const p = Math.min(1, (now - started) / duration); const ease = 1 - Math.pow(1 - p, 3);
      setFlyTool({ key, x: fromX + (to.x - fromX) * ease, y: fromY + (to.y - fromY) * ease });
      if (p < 1) requestAnimationFrame(step); else { setFlyTool(null); placeTool(key); }
    };
    requestAnimationFrame(step);
  };
  const startToolDrag = (key, event) => {
    if (placed.has(key)) return;
    event.preventDefault(); let moved = false; let lastX = event.clientX; let lastY = event.clientY;
    setDragTool({ key, x: lastX, y: lastY });
    const move = (ev) => { moved = true; lastX = ev.clientX; lastY = ev.clientY; setDragTool({ key, x: lastX, y: lastY }); };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); setDragTool(null);
      if (!isNextTool(key)) { placeTool(key); return; }
      const svg = mainRef.current?.querySelector("svg"); const to = target(key);
      if (!svg || !moved) { flyToPlace(key, to.x, to.y - 70); return; }
      const rect = svg.getBoundingClientRect(); const scale = Math.min(rect.width / VBW, rect.height / VBH);
      const ox = (rect.width - VBW * scale) / 2; const oy = (rect.height - VBH * scale) / 2;
      const x = (lastX - rect.left - ox) / scale; const y = (lastY - rect.top - oy) / scale;
      if (Math.hypot(x - to.x, y - to.y) < 105) flyToPlace(key, x, y); else flash(`Kéo “${tools.find((tool) => tool.k === key)?.name}” vào ô sáng trên bàn.`);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  const eventPoint = (event) => {
    const svg = event.currentTarget.closest("svg");
    return { svg, ...clientToViewBox(svg, event.clientX, event.clientY) };
  };
  const startWire = (id, event) => {
    event.stopPropagation();
    if (!assembled) { flash("Hãy lắp đủ dụng cụ trước khi nối dây."); return; }
    if (switchClosed || sourceOn) { flash("Mở K và tắt nguồn trước khi đổi dây.", true); return; }
    const start = ports[id]; const { svg } = eventPoint(event); setWireDrag({ id, x: start.x, y: start.y });
    const move = (ev) => { const point = clientToViewBox(svg, ev.clientX, ev.clientY); setWireDrag({ id, x: point.x, y: point.y }); };
    const up = (ev) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      const { x, y } = clientToViewBox(svg, ev.clientX, ev.clientY);
      const candidate = Object.entries(ports).filter(([other]) => other !== id).map(([other, point]) => ({ other, distance: Math.hypot(point.x - x, point.y - y) })).sort((a, b) => a.distance - b.distance)[0];
      if (candidate && candidate.distance < 48 && requiredEdges.has(edgeKey(id, candidate.other))) {
        setWires((old) => new Set(old).add(edgeKey(id, candidate.other))); flash("Nối dây đúng.");
      } else flash("Đầu dây chưa đúng chốt. Hãy kéo đến chốt đang phát sáng.");
      setWireDrag(null);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  const cycleMode = (which) => {
    if (switchClosed) { flash("Mở khóa K trước khi đổi thang đo."); return; }
    const current = which === "a" ? ammeterMode : voltmeterMode;
    const next = current === "OFF" ? "V" : current === "V" ? "mA" : "OFF";
    if (which === "a") setAmmeterMode(next); else setVoltmeterMode(next);
  };
  const toggleSource = () => {
    if (isEmf) return;
    if (!sourceOn && (!assembled || !wiredOK)) { flash("Chỉ bật nguồn sau khi lắp đủ và nối đúng mạch.", true); return; }
    if (sourceOn && switchClosed) setSwitchClosed(false);
    setSourceOn((value) => !value);
  };
  const toggleSwitch = () => {
    if (!switchClosed && (!assembled || !wiredOK || !modesOK || (!isEmf && !sourceOn))) {
      flash(!assembled ? "Chưa lắp đủ dụng cụ." : !wiredOK ? "Mạch chưa nối đủ dây." : !modesOK ? "ĐO1 phải ở mA, ĐO2 phải ở V." : "Hãy bật nguồn DC trước.", true); return;
    }
    setSwitchClosed((value) => !value);
  };
  const record = () => {
    if (!live) { flash("Chưa thể đo: kiểm tra dây, thang đo, nguồn và khóa K.", true); return; }
    if (isEmf) {
      const assigned = assignedSets?.emf?.map((item) => item.resistance ?? item.voltage);
      if (assigned?.length && !assigned.includes(rheostat)) { flash(`Đề giáo viên yêu cầu R: ${assigned.join(", ")} Ω.`); return; }
      if (emfRows.some((row) => row.resistance === rheostat)) { flash(`Đã đo ở R=${rheostat} Ω. Hãy đổi biến trở.`); return; }
      const noise = (((rheostat * 11) % 7) - 3) * 0.00015;
      setEmfRows((rows) => [...rows, { resistance: rheostat, current: emfCurrentA * (1 + noise), voltage: terminalVoltage * (1 - noise) }]);
    } else {
      if (ohmRows.some((row) => row.material === material && row.voltage === sourceVoltage)) { flash(`Đã đo U=${sourceVoltage} V của vật dẫn ${material}.`); return; }
      const assigned = assignedSets?.[`ohm-${material.toLowerCase()}`]?.map((item) => item.voltage);
      if (assigned?.length && !assigned.includes(sourceVoltage)) { flash(`Đề giáo viên yêu cầu U: ${assigned.join(", ")} V.`); return; }
      const measured = ohmCurrentA * (1 + (((sourceVoltage * 7 + conductorR) % 5) - 2) * 0.001);
      setOhmRows((rows) => [...rows, { material, voltage: sourceVoltage, current: measured, resistance: sourceVoltage / measured }]);
    }
  };
  const reset = () => {
    setPlaced(new Set()); setWires(new Set()); setSourceOn(false); setSwitchClosed(false); setAmmeterMode("OFF"); setVoltmeterMode("OFF");
    setOhmRows([]); setEmfRows([]); setMaterial("X"); setSourceVoltage(2); setRheostat(20); flash("Đã đặt lại phòng Lab.");
  };
  const exportNote = () => {
    if (!canExport) { flash(isEmf ? "Cần đủ 5 mức biến trở." : "Cần đủ 5 số đo cho X và 5 số đo cho Y."); return; }
    const trials = isEmf
      ? emfRows.map((row) => ({ lab: "emf", s: fit.emf, t: 1, config: row.resistance, expected: unknownEmf, voltage: row.voltage, current: row.current, resistance: row.resistance, emf: fit.emf, balanced: true }))
      : ohmRows.map((row) => ({ lab: `ohm-${row.material.toLowerCase()}`, s: row.voltage, t: row.current, config: row.voltage, expected: OHM_CONDUCTORS[row.material].resistance, voltage: row.voltage, current: row.current, resistance: row.resistance, material: row.material, balanced: true }));
    onExportNote({ lab: isEmf ? "emf" : "ohm", measuredD: 0, trials });
  };

  const progress = isEmf ? `${emfRows.length}/5` : `X ${xRows.length}/5 · Y ${yRows.length}/5`;
  const nextText = !assembled ? `Lắp ${tools.find((tool) => !placed.has(tool.k))?.name.toLowerCase()}` : !wiredOK ? `Nối dây (${wires.size}/${requiredEdges.size})` : !modesOK ? "Đặt ĐO1 → mA, ĐO2 → V" : !isEmf && !sourceOn ? "Bật nguồn DC" : !switchClosed ? "Đóng khóa K" : "Thay đổi thông số và ghi số đo";

  const sidePanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <section style={card}><div style={sideTitle}>Tiến trình</div><div style={{ fontSize: 12, fontWeight: 900, color: C.orangeDk }}>{nextText}</div><div style={{ height: 7, borderRadius: 9, background: "#EEE5DA", marginTop: 8 }}><div style={{ width: `${assembled ? wiredOK ? modesOK ? 85 : 70 : 50 : Math.round(placed.size / tools.length * 45)}%`, height: "100%", borderRadius: 9, background: C.orange }} /></div></section>
      <section style={card}>
        <div style={sideTitle}>Điều khiển đo</div>
        {!isEmf ? <>
          <div style={{ display: "flex", gap: 6 }}>{["X", "Y"].map((m) => <button key={m} onClick={() => { if (switchClosed) return flash("Mở K trước khi đổi vật dẫn."); setMaterial(m); }} style={material === m ? btnActive : btnSmall}>Vật dẫn {m}</button>)}</div>
          <label style={labelStyle}>Điện áp nguồn: <b>{sourceVoltage} V</b><input type="range" min="1" max="10" step="1" value={sourceVoltage} onChange={(e) => setSourceVoltage(Number(e.target.value))} style={{ width: "100%", accentColor: C.orange }} /></label>
        </> : <label style={labelStyle}>Biến trở: <b>{rheostat} Ω</b><input type="range" min="20" max="100" step="20" value={rheostat} onChange={(e) => setRheostat(Number(e.target.value))} style={{ width: "100%", accentColor: C.orange }} /></label>}
        <button onClick={record} style={{ ...btnBig, width: "100%" }}>Ghi số đo</button>
      </section>
      <section style={{ ...card, minHeight: 0 }}><div style={{ display: "flex", justifyContent: "space-between" }}><div style={sideTitle}>Bảng số liệu</div><b style={{ fontSize: 11, color: C.orangeDk }}>{progress}</b></div><div style={{ maxHeight: 210, overflow: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}><thead><tr>{isEmf ? <><th>R</th><th>U</th><th>I</th></> : <><th>Mẫu</th><th>U</th><th>I</th><th>R</th></>}</tr></thead><tbody>{isEmf ? emfRows.map((row, i) => <tr key={i}><td>{row.resistance}</td><td>{row.voltage.toFixed(3)}</td><td>{(row.current * 1000).toFixed(1)}</td></tr>) : ohmRows.map((row, i) => <tr key={i}><td>{row.material}</td><td>{row.voltage}</td><td>{(row.current * 1000).toFixed(1)}</td><td>{row.resistance.toFixed(1)}</td></tr>)}</tbody></table></div>{isEmf && emfRows.length >= 2 && <div style={{ marginTop: 7, padding: 8, borderRadius: 9, background: "#F2F8F2", fontSize: 10, fontWeight: 800 }}>Hồi quy U = E − Ir: E ≈ {fit.emf.toFixed(3)} V · r ≈ {fit.internalR.toFixed(2)} Ω</div>}</section>
      <button disabled={!canExport} onClick={exportNote} style={{ ...btnBig, opacity: canExport ? 1 : 0.45 }}>Xuất sang Sổ Báo Cáo</button>
    </div>
  );

  return <div style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", background: "#fff", color: C.ink, fontFamily: FONT }}>
    <header style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, padding: isMobile ? "5px 7px" : "7px 14px", borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 7 }}><button onClick={onBack} style={btnGhost}>← Thoát</button><button onClick={onReplayPrelab} style={btnGhost}><BookOpen size={14} /> {isMobile ? "Prelab" : "Xem lại Prelab"}</button></div>
      <b style={{ fontSize: isMobile ? 12 : 14, textAlign: "center" }}>{isEmf ? "Bài 26 — Đo suất điện động pin điện hóa" : "Bài 23 — Đo điện trở theo định luật Ohm"}</b>
      <div style={{ justifySelf: "end", display: "flex", gap: 6 }}><button onClick={onToggleMute} style={btnGhost}>{muted ? <VolumeX size={15}/> : <Volume2 size={15}/>}</button><button onClick={reset} style={btnGhost}><RotateCcw size={14}/> Làm lại</button></div>
    </header>
    <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: isMobile ? "96px minmax(0,1fr)" : "clamp(190px,13vw,230px) minmax(0,1fr) clamp(300px,22vw,380px)", overflow: "hidden", position: "relative" }}>
      <aside style={{ borderRight: `1px solid ${C.line}`, padding: isMobile ? 5 : 10, overflowY: "auto", background: "#fff" }}>
        <div style={sideTitle}>Dụng cụ ({placed.size}/{tools.length})</div>
        {tools.map((tool) => { const done = placed.has(tool.k); const next = isNextTool(tool.k); return <div key={tool.k} onPointerDown={(e) => !isMobile && startToolDrag(tool.k, e)} onClick={() => { if (isMobile && next && !done) { const p = target(tool.k); flyToPlace(tool.k, p.x, p.y - 70); } }} style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: isMobile ? 3 : 9, padding: isMobile ? 5 : "8px 9px", marginBottom: 6, borderRadius: 11, cursor: done ? "default" : isMobile ? "pointer" : "grab", touchAction: "none", border: `1.5px solid ${done ? C.good : next ? C.orange : C.line}`, background: done ? "#F3F8F3" : "#fff", opacity: done ? 0.65 : 1, boxShadow: next ? `0 0 0 3px ${C.orange}20` : "none" }}>
          <div style={{ width: isMobile ? 38 : 48, height: isMobile ? 34 : 44, display: "grid", placeItems: "center", background: "#FAF6F0", borderRadius: 8 }}><img src={tool.img} alt="" style={{ maxWidth: "92%", maxHeight: "92%" }}/></div>
          <div style={{ minWidth: 0, textAlign: isMobile ? "center" : "left" }}><div style={{ fontSize: isMobile ? 9 : 13, fontWeight: 800, lineHeight: 1.15 }}>{tool.name}</div><div style={{ fontSize: isMobile ? 8 : 10, color: done ? C.good : next ? C.orangeDk : C.sub }}>{done ? "✓ Đã lắp" : next ? isMobile ? "Chạm để lắp" : "Kéo vào bàn" : tool.sub}</div></div>
        </div>; })}
      </aside>
      <main ref={mainRef} style={{ position: "relative", minWidth: 0, minHeight: 0, padding: isMobile ? 4 : 10, outline: dragTool ? `2px dashed ${C.orange}` : "none", outlineOffset: -5 }}>
        <ElectricScene isEmf={isEmf} placed={placed} positions={positions} ports={ports} wires={wires} wireDrag={wireDrag} activeGroup={activeGroup} flyTool={flyTool} tools={tools} sourceOn={sourceOn} sourceVoltage={sourceVoltage} switchClosed={switchClosed} ammeterMode={ammeterMode} voltmeterMode={voltmeterMode} ammeterReading={isEmf ? emfCurrentA * 1000 : ohmCurrentA * 1000} voltmeterReading={isEmf ? terminalVoltage : live ? sourceVoltage : 0} material={material} rheostat={rheostat} onPortStart={startWire} onCycleMode={cycleMode} onToggleSource={toggleSource} onToggleSwitch={toggleSwitch} />
        {toast && <div style={toastStyle}>{toast}</div>}
        {isMobile && <motion.div animate={{ height: sheetOpen ? "78%" : 42 }} style={{ position: "absolute", left: 8, right: 8, bottom: 8, zIndex: 30, border: `1.5px solid ${C.line}`, borderRadius: 16, background: "#FFFBF7", overflow: "hidden", boxShadow: "0 -8px 24px #321E1220" }}><button onClick={() => setSheetOpen((value) => !value)} style={{ width: "100%", height: 42, border: 0, background: "transparent", fontWeight: 900, color: C.orangeDk }}>{sheetOpen ? <ChevronDown size={16}/> : <ChevronUp size={16}/>} Hướng dẫn · {progress}</button>{sheetOpen && <div style={{ padding: 10, overflow: "auto", height: "calc(100% - 42px)" }}>{sidePanel}</div>}</motion.div>}
      </main>
      {!isMobile && <aside style={{ borderLeft: `1px solid ${C.line}`, padding: 10, overflowY: "auto", background: "#FFFBF7" }}>{sidePanel}</aside>}
      {tools.map((tool) => <img key={`drag-${tool.k}`} src={tool.img} alt="" style={{ position: "fixed", left: dragTool?.key === tool.k ? dragTool.x - 28 : -999, top: dragTool?.key === tool.k ? dragTool.y - 28 : -999, width: 56, height: 56, objectFit: "contain", pointerEvents: "none", zIndex: 80, opacity: dragTool?.key === tool.k ? 0.92 : 0 }}/>) }
    </div>
  </div>;
}

function MeterSvg({ position: p, kind, mode, reading, onCycleMode }) {
  const angle = mode === "OFF" ? -42 : mode === "V" ? -16 : 35;
  return <g>
    <image href={`${ASSET}/multimeter.svg`} x={p.x} y={p.y} width={p.w} height={p.h}/>
    <rect x={p.x + 22} y={p.y + 23} width={p.w - 44} height="36" rx="4" fill="#172033" opacity=".92"/>
    <text x={p.x + p.w / 2} y={p.y + 48} textAnchor="middle" fontFamily="monospace" fontSize="18" fontWeight="900" fill={mode === "OFF" ? "#64748b" : "#86efac"}>{mode === "OFF" ? "----" : reading.toFixed(kind === "ammeter" ? 1 : 3)}</text>
    <g role="button" tabIndex="0" aria-label={`Đổi mode ${kind === "ammeter" ? "ĐO1" : "ĐO2"}`} onClick={() => onCycleMode(kind === "ammeter" ? "a" : "v")} style={{ cursor: "pointer" }}>
      <circle cx={p.x + p.w / 2} cy={p.y + 108} r="31" fill="transparent"/><line x1={p.x + p.w / 2} y1={p.y + 108} x2={p.x + p.w / 2} y2={p.y + 83} stroke="#C85A17" strokeWidth="4" strokeLinecap="round" transform={`rotate(${angle} ${p.x + p.w / 2} ${p.y + 108})`}/>
    </g><text x={p.x + p.w / 2} y={p.y + 151} textAnchor="middle" fontSize="10" fontWeight="900" fill="#321E12">{kind === "ammeter" ? "ĐO1" : "ĐO2"} · {mode}</text>
  </g>;
}

function ElectricScene({ isEmf, placed, positions, ports, wires, wireDrag, activeGroup, flyTool, tools, sourceOn, sourceVoltage, switchClosed, ammeterMode, voltmeterMode, ammeterReading, voltmeterReading, material, rheostat, onPortStart, onCycleMode, onToggleSource, onToggleSwitch }) {
  const has = (key) => placed.has(key);
  const wirePath = (a, b) => { const pa = ports[a], pb = ports[b]; const mx = (pa.x + pb.x) / 2; return `M${pa.x} ${pa.y} C${mx} ${pa.y},${mx} ${pb.y},${pb.x} ${pb.y}`; };
  return <svg viewBox={`0 0 ${VBW} ${VBH}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", minHeight: 0, display: "block", border: `1px solid ${C.line}`, borderRadius: 16, background: "linear-gradient(#fff,#FBF6EC)", touchAction: "none" }}>
    <rect x="0" y="520" width={VBW} height="60" fill="#F1E7D3"/><line x1="0" y1="520" x2={VBW} y2="520" stroke="#E1D3B6" strokeWidth="2"/>
    {has("board") && <image href={`${ASSET}/circuit-board.svg`} x={positions.board.x} y={positions.board.y} width={positions.board.w} height={positions.board.h} opacity=".42"/>}
    {!has("board") && <text x={VBW/2} y="46" textAnchor="middle" fontSize="15" fontWeight="800" fill={C.sub}>Kéo bảng lắp mạch vào ô sáng (+) để bắt đầu…</text>}
    {has("source") && <g><image href={`${ASSET}/transformer.svg`} x={positions.source.x} y={positions.source.y} width={positions.source.w} height={positions.source.h}/><text x={positions.source.x+90} y={positions.source.y+34} textAnchor="middle" fontFamily="monospace" fontSize="16" fontWeight="900" fill={sourceOn ? C.good : C.sub}>{sourceOn ? `${sourceVoltage}.0 V` : "OFF"}</text><g role="button" aria-label={sourceOn ? "Tắt nguồn" : "Bật nguồn"} onClick={onToggleSource} style={{cursor:"pointer"}}><circle cx={positions.source.x+91} cy={positions.source.y+57} r="35" fill="transparent"/></g></g>}
    {has("battery") && <g><image href={`${ASSET}/battery.svg`} x={positions.battery.x} y={positions.battery.y} width={positions.battery.w} height={positions.battery.h}/><text x={positions.battery.x+88} y={positions.battery.y+57} textAnchor="middle" fontSize="14" fontWeight="900" fill="#0c4a6e">PIN Eₓ</text><text x={positions.battery.x+88} y={positions.battery.y+76} textAnchor="middle" fontSize="10" fontWeight="800" fill="#605248">giá trị ẩn · danh định 1,5 V</text></g>}
    {has("switch") && <g role="button" aria-label={switchClosed ? "Mở khóa K" : "Đóng khóa K"} onClick={onToggleSwitch} style={{cursor:"pointer"}}><image href={`${ASSET}/switch-k.svg`} x={positions.switch.x} y={positions.switch.y} width={positions.switch.w} height={positions.switch.h}/><rect x={positions.switch.x+21} y={positions.switch.y+7} width="78" height="19" rx="9" fill={switchClosed ? C.good : "#fff"} stroke={switchClosed ? C.good : C.line}/><text x={positions.switch.x+60} y={positions.switch.y+20} textAnchor="middle" fontSize="10" fontWeight="900" fill={switchClosed ? "#fff" : C.ink}>K · {switchClosed ? "ĐÓNG" : "MỞ"}</text></g>}
    {has("protect") && <g><image href={`${ASSET}/protective-resistor.svg`} x={positions.protect.x} y={positions.protect.y} width={positions.protect.w} height={positions.protect.h}/><text x={positions.protect.x+positions.protect.w/2} y={positions.protect.y-7} textAnchor="middle" fontSize="11" fontWeight="900">R bảo vệ · 10 Ω</text></g>}
    {has("conductor") && <g><image href={`${ASSET}/protective-resistor.svg`} x={positions.conductor.x} y={positions.conductor.y} width={positions.conductor.w} height={positions.conductor.h}/><rect x={positions.conductor.x+33} y={positions.conductor.y+7} width={positions.conductor.w-66} height={positions.conductor.h-14} rx="18" fill={OHM_CONDUCTORS[material].color} opacity=".16"/><text x={positions.conductor.x+positions.conductor.w/2} y={positions.conductor.y-10} textAnchor="middle" fontSize="13" fontWeight="900">VẬT DẪN {material}</text></g>}
    {has("rheostat") && <g><image href={`${ASSET}/rheostat.svg`} x={positions.rheostat.x} y={positions.rheostat.y} width={positions.rheostat.w} height={positions.rheostat.h}/><line x1={positions.rheostat.x+65} y1={positions.rheostat.y+61} x2={positions.rheostat.x+65} y2={positions.rheostat.y+35} stroke={C.orange} strokeWidth="5" strokeLinecap="round" transform={`rotate(${-55+rheostat/100*110} ${positions.rheostat.x+65} ${positions.rheostat.y+61})`}/><text x={positions.rheostat.x+65} y={positions.rheostat.y+112} textAnchor="middle" fontSize="11" fontWeight="900">{rheostat} Ω</text></g>}
    {has("ammeter") && <MeterSvg position={positions.ammeter} kind="ammeter" mode={ammeterMode} reading={ammeterReading} onCycleMode={onCycleMode}/>}
    {has("voltmeter") && <MeterSvg position={positions.voltmeter} kind="voltmeter" mode={voltmeterMode} reading={voltmeterReading} onCycleMode={onCycleMode}/>}
    {[...wires].map((key) => { const [a,b] = key.split("|"); return <path key={key} d={wirePath(a,b)} fill="none" stroke={a.includes("+") || a.includes("A") || a.includes("left") ? "#dc2626" : "#172033"} strokeWidth="5" strokeLinecap="round" opacity=".9"/>; })}
    {wireDrag && <path d={`M${ports[wireDrag.id].x} ${ports[wireDrag.id].y} C${ports[wireDrag.id].x} ${wireDrag.y},${wireDrag.x} ${ports[wireDrag.id].y},${wireDrag.x} ${wireDrag.y}`} fill="none" stroke={C.orange} strokeWidth="4" strokeDasharray="7 5"/>}
    {placed.size === tools.length && Object.entries(ports).map(([id,p]) => <g key={id} role="button" aria-label={`Chốt ${id}`} onPointerDown={(e) => onPortStart(id,e)} style={{cursor:"grab"}}><circle cx={p.x} cy={p.y} r="10" fill={id.includes("+") || id.includes("A") || id.includes("left") ? "#dc2626" : "#111827"} stroke="#fff" strokeWidth="3"/><circle cx={p.x} cy={p.y} r="19" fill="transparent"/></g>)}
    {activeGroup.map((key) => { if (has(key)) return null; const p=positions[key]; const x=p.x+p.w/2,y=p.y+p.h/2; return <g key={key} style={{pointerEvents:"none"}}><circle cx={x} cy={y} r="35" fill={`${C.orange}1e`} stroke={C.orange} strokeWidth="2" strokeDasharray="7 5"><animate attributeName="r" values="30;39;30" dur="1.3s" repeatCount="indefinite"/></circle><text x={x} y={y+6} textAnchor="middle" fontSize="20" fontWeight="900" fill={C.orangeDk}>+</text></g>;})}
    {flyTool && <image href={tools.find((tool)=>tool.k===flyTool.key)?.img} x={flyTool.x-26} y={flyTool.y-26} width="52" height="52"/>}
    {isEmf && has("battery") && <text x="165" y="446" textAnchor="middle" fontSize="10" fill={C.sub}>Suất điện động E và điện trở trong r được ẩn theo học sinh</text>}
  </svg>;
}

const sideTitle = { fontSize: 10, fontWeight: 900, color: C.sub, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 };
const card = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 13, padding: 10 };
const btnGhost = { border: `1px solid ${C.line}`, borderRadius: 9, background: "#fff", color: C.ink, padding: "6px 9px", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" };
const btnSmall = { flex: 1, border: `1px solid ${C.line}`, borderRadius: 9, background: "#fff", color: C.ink, padding: 7, fontSize: 11, fontWeight: 800, cursor: "pointer" };
const btnActive = { ...btnSmall, borderColor: C.orange, background: C.orange, color: "#fff" };
const btnBig = { border: 0, borderRadius: 11, background: C.orange, color: "#fff", padding: "10px 12px", fontSize: 12, fontWeight: 900, cursor: "pointer" };
const labelStyle = { display: "block", marginTop: 10, fontSize: 11, fontWeight: 700, color: C.sub };
const toastStyle = { position: "absolute", left: "50%", bottom: 18, transform: "translateX(-50%)", zIndex: 50, maxWidth: "80%", borderRadius: 12, background: "#321E12", color: "#fff", padding: "9px 13px", fontSize: 11, fontWeight: 800, boxShadow: "0 7px 20px #321E1233" };
