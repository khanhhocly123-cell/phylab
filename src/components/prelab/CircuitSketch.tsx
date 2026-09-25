"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { CheckCircle2, Eraser, Lightbulb, MousePointerClick, ScanSearch, TriangleAlert, Undo2 } from "lucide-react";
import {
  bodyBox,
  checkSchematic,
  missingSolutionWires,
  roundedPath,
  routeWire,
  terminalsOf,
  type PartKind,
  type Pt,
  type SchCheck,
  type SchematicSpec,
  type SchPart,
  type SchWire,
} from "@/lib/schematic";

const INK = "#3E2718";
const MUTED = "#8C7B6B";
const ORANGE = "#EA580C";
const BAD = "#DC2626";

const fmt = (value: number, dp: number) => value.toFixed(dp).replace(".", ",");

type Props = {
  spec: SchematicSpec;
  /** Tên nhiệm vụ hiện trong thẻ bên phải (bước này không có tiêu đề riêng để vừa một màn). */
  title: string;
  wires: SchWire[];
  onWires: (next: SchWire[]) => void;
  solved: boolean;
  onSolved: () => void;
};

/**
 * CircuitSketch — học sinh tự nối dây để hoàn thành sơ đồ mạch đo (Prelab Bài 23, 26).
 * Chạm một chốt rồi chạm chốt khác (hoặc kéo từ chốt này sang chốt kia) để nối; chạm dây để xoá.
 * "Kiểm tra" giải mạch thật (lib/schematic.ts) nên chỉ ra đúng chỗ sai: đồng hồ mắc sai kiểu,
 * đảo cực, K không nằm trên mạch chính, phần tử bị nối tắt…
 */
export default function CircuitSketch({ spec, title, wires, onWires, solved, onSolved }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ from: string; start: Pt; moved: boolean } | null>(null);
  const [history, setHistory] = useState<SchWire[][]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [pointer, setPointer] = useState<Pt | null>(null);
  const [hoverWire, setHoverWire] = useState<number | null>(null);
  const [result, setResult] = useState<{ check: SchCheck; wires: SchWire[] } | null>(() => (solved ? { check: checkSchematic(spec, wires), wires } : null));
  const [fails, setFails] = useState(0);
  const [hint, setHint] = useState<0 | 1 | 2>(0);
  const [note, setNote] = useState<string | null>(null);
  // Khung vẽ hẹp (điện thoại): chốt, chữ to hơn và vùng chạm rộng hơn cho ngón tay.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(() => setCompact(svg.getBoundingClientRect().width < 480));
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const tr = compact ? 1.45 : 1; // hệ số phóng chốt nối

  const terms = useMemo(() => terminalsOf(spec), [spec]);
  const termById = useMemo(() => new Map(terms.map((t) => [t.id, t])), [terms]);
  const degree = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of wires) {
      map.set(w.a, (map.get(w.a) ?? 0) + 1);
      map.set(w.b, (map.get(w.b) ?? 0) + 1);
    }
    return map;
  }, [wires]);
  const routes = useMemo(() => {
    const out: Pt[][] = [];
    for (const w of wires) out.push(routeWire(spec, termById.get(w.a)!, termById.get(w.b)!, out));
    return out;
  }, [spec, wires, termById]);

  // Kết quả kiểm tra chỉ còn giá trị khi sơ đồ chưa đổi kể từ lúc bấm "Kiểm tra".
  const fresh = result && result.wires === wires ? result.check : null;
  const success = Boolean(fresh?.ok);
  const flagged = new Set(fresh && !fresh.ok ? fresh.issues.flatMap((i) => i.parts) : []);
  const loose = new Set(fresh && !fresh.ok ? fresh.issues.flatMap((i) => i.terminals ?? []) : []);
  const ghosts = success || hint === 0 ? [] : hint === 1 ? missingSolutionWires(spec, wires).slice(0, 1) : missingSolutionWires(spec, wires);
  const ghostRoutes = ghosts.map((w) => routeWire(spec, termById.get(w.a)!, termById.get(w.b)!, routes));
  const freeCount = terms.filter((t) => !degree.get(t.id)).length;
  const pendingTerm = pending ? termById.get(pending) : null;

  const commit = (next: SchWire[]) => {
    setHistory((old) => [...old.slice(-30), wires]);
    onWires(next);
  };

  const connect = (a: string, b: string) => {
    if (a === b) return;
    const ta = termById.get(a)!;
    const tb = termById.get(b)!;
    if (ta.part === tb.part) {
      setNote("Không nối hai chân của cùng một dụng cụ — như vậy là nối tắt nó.");
      return;
    }
    if (wires.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a))) {
      setNote("Hai chốt này đã có dây nối.");
      return;
    }
    setNote(null);
    commit([...wires, { a, b }]);
  };

  const removeWire = (index: number) => {
    setHoverWire(null);
    setNote("Đã xoá một dây — bấm Hoàn tác nếu xoá nhầm.");
    commit(wires.filter((_, i) => i !== index));
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((old) => old.slice(0, -1));
    setNote(null);
    onWires(prev);
  };

  const clearAll = () => {
    if (!wires.length) return;
    setNote(null);
    setPending(null);
    commit([]);
  };

  const runCheck = () => {
    const check = checkSchematic(spec, wires);
    setResult({ check, wires });
    setPending(null);
    setPointer(null);
    setNote(null);
    if (check.ok) {
      setHint(0);
      onSolved();
    } else {
      setFails((n) => n + 1);
    }
  };

  const toSvg = (event: { clientX: number; clientY: number }): Pt => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };

  const nearestTerminal = (p: Pt, except: string, radius = 22) => {
    let best: string | null = null;
    let bestDist = radius;
    for (const t of terms) {
      if (t.id === except) continue;
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d < bestDist) {
        bestDist = d;
        best = t.id;
      }
    }
    return best;
  };

  const onTerminalDown = (id: string, event: ReactPointerEvent) => {
    event.stopPropagation();
    if (pending && pending !== id) {
      connect(pending, id);
      setPending(null);
      setPointer(null);
      return;
    }
    const p = toSvg(event);
    setPending(id);
    setPointer(p);
    drag.current = { from: id, start: p, moved: false };
    try {
      svgRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // Một số trình duyệt không cho bắt con trỏ (vd. sự kiện giả lập) — vẫn nối được bằng chạm.
    }
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!pending) return;
    const p = toSvg(event);
    setPointer(p);
    const d = drag.current;
    if (d && !d.moved && Math.hypot(p.x - d.start.x, p.y - d.start.y) > 8) d.moved = true;
  };

  const onPointerUp = (event: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
    if (!d.moved) return; // chạm: giữ chốt đang chọn, chạm tiếp chốt thứ hai để nối
    const target = nearestTerminal(toSvg(event), d.from);
    if (target) connect(d.from, target);
    setPending(null);
    setPointer(null);
  };

  const onTerminalKey = (id: string, event: ReactKeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (pending && pending !== id) {
      connect(pending, id);
      setPending(null);
    } else {
      setPending(pending === id ? null : id);
    }
  };

  const cancel = () => {
    setPending(null);
    setPointer(null);
  };

  const flowOf = (index: number): Pt[] | null => {
    if (!success || !fresh?.solve) return null;
    const i = fresh.solve.wire[index] ?? 0;
    if (Math.abs(i) < 1e-5) return null;
    return i > 0 ? routes[index] : [...routes[index]].reverse();
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.62fr)_minmax(250px,1fr)] items-start">
      <div className="rounded-2xl border border-[#E6DCC8] bg-[#FFFDF8] p-1 sm:p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${spec.width} ${spec.height}`}
          className="block w-full h-auto touch-none select-none"
          role="group"
          aria-label="Giấy vẽ sơ đồ mạch: chạm một chốt rồi chạm chốt khác để nối dây"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={cancel}
          onKeyDown={(event) => { if (event.key === "Escape") cancel(); }}
        >
          <defs>
            <pattern id={`${uid}-minor`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="#F1E6D3" strokeWidth="1" />
            </pattern>
            <pattern id={`${uid}-major`} width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill={`url(#${uid}-minor)`} />
              <path d="M100 0H0V100" fill="none" stroke="#E7D6BC" strokeWidth="1.2" />
            </pattern>
          </defs>
          <rect
            width={spec.width}
            height={spec.height}
            fill={`url(#${uid}-major)`}
            onPointerDown={(event) => {
              // Ngón tay to hơn chốt: chạm trong bán kính rộng thì chọn chốt gần nhất.
              const near = nearestTerminal(toSvg(event), "", compact ? 38 : 30);
              if (near) onTerminalDown(near, event);
              else cancel();
            }}
          />

          {/* Vùng tô chỗ sai */}
          {spec.parts.filter((p) => flagged.has(p.id)).map((p) => {
            const b = bodyBox(p);
            return <rect key={`flag-${p.id}`} x={b.x0 - 8} y={b.y0 - 8} width={b.x1 - b.x0 + 16} height={b.y1 - b.y0 + 16} rx="10" fill="#FEE2E2" stroke={BAD} strokeWidth="1.6" strokeDasharray="5 4" />;
          })}

          {/* Dây gợi ý */}
          {ghostRoutes.map((pts, i) => (
            <path key={`ghost-${i}`} d={roundedPath(pts)} fill="none" stroke="#16A34A" strokeWidth="2.4" strokeDasharray="7 6" strokeLinecap="round" opacity="0.75" className="sch-blink" />
          ))}

          {/* Dây đã nối */}
          {routes.map((pts, i) => {
            const d = roundedPath(pts);
            const hot = hoverWire === i && !pending;
            const flow = flowOf(i);
            return (
              <g key={`wire-${wires[i].a}-${wires[i].b}`}>
                <path d={d} fill="none" stroke={hot ? BAD : INK} strokeWidth={hot ? 3.2 : 2.6} strokeLinecap="round" strokeLinejoin="round" />
                {flow && <path d={roundedPath(flow)} fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 12" className="sch-flow" />}
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="14"
                  style={{ cursor: pending ? "default" : "pointer" }}
                  onPointerEnter={() => setHoverWire(i)}
                  onPointerLeave={() => setHoverWire((h) => (h === i ? null : h))}
                  onClick={() => { if (!pending) removeWire(i); }}
                >
                  <title>Chạm để xoá dây này</title>
                </path>
              </g>
            );
          })}

          {/* Kí hiệu dụng cụ */}
          {spec.parts.map((p) => <PartSymbol key={p.id} part={p} closed={success} />)}
          {spec.parts.map((p) => <PartLabels key={`lbl-${p.id}`} part={p} big={compact} />)}
          {success && fresh && spec.parts.filter((p) => p.kind === "ammeter" || p.kind === "voltmeter").map((p) => (
            <MeterTag key={`tag-${p.id}`} part={p} text={p.kind === "ammeter" ? `${fmt((fresh.current ?? 0) * 1000, 1)} mA` : `${fmt(fresh.voltage ?? 0, 2)} V`} spec={spec} />
          ))}

          {/* Dây đang kéo */}
          {pendingTerm && pointer && (
            <line x1={pendingTerm.x} y1={pendingTerm.y} x2={pointer.x} y2={pointer.y} stroke={ORANGE} strokeWidth="2.2" strokeDasharray="6 5" strokeLinecap="round" pointerEvents="none" />
          )}

          {/* Chốt nối */}
          {terms.map((t) => {
            const deg = degree.get(t.id) ?? 0;
            const isPending = pending === t.id;
            const canTarget = Boolean(pendingTerm) && !isPending && pendingTerm?.part !== t.part;
            return (
              <g key={t.id}>
                {canTarget && <circle cx={t.x} cy={t.y} r={9 * tr} fill="#FFEDD5" stroke="#F59E0B" strokeWidth="1.6" strokeDasharray="3 3" />}
                {loose.has(t.id) && <circle cx={t.x} cy={t.y} r="10" fill="none" stroke={BAD} strokeWidth="2" className="sch-blink" />}
                {isPending && <circle cx={t.x} cy={t.y} r={10.5 * tr} fill="#FDBA7455" stroke={ORANGE} strokeWidth="2.4" className="sch-blink" />}
                <circle cx={t.x} cy={t.y} r={(deg >= 2 ? 4.8 : deg === 1 ? 3.6 : 4.4) * tr} fill={deg ? INK : "#fff"} stroke={INK} strokeWidth={deg ? 0 : 1.8} />
                <circle
                  cx={t.x}
                  cy={t.y}
                  r="15"
                  fill="transparent"
                  role="button"
                  tabIndex={0}
                  aria-label={`${isPending ? "Đang chọn " : ""}${t.name}`}
                  style={{ cursor: "pointer" }}
                  onPointerDown={(event) => onTerminalDown(t.id, event)}
                  onKeyDown={(event) => onTerminalKey(t.id, event)}
                />
              </g>
            );
          })}
        </svg>
        <Legend kinds={[...new Set(spec.parts.map((p) => p.kind))]} sourceLabel={spec.key === "emf" ? "Pin" : "Nguồn điện"} />
      </div>

      <div className="flex flex-col gap-2.5 min-w-0">
        <div className="rounded-2xl border border-[#E6DCC8] bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#C85A17]">Nhiệm vụ</span>
            <span className={`text-[10.5px] font-black tabular-nums rounded-full px-2 py-0.5 ${freeCount ? "bg-[#F4EFE8] text-[#8C7B6B]" : "bg-emerald-50 text-emerald-700"}`}>
              {wires.length} dây · {freeCount ? `${freeCount} chốt trống` : "đủ chốt"}
            </span>
          </div>
          <h3 className="text-[14px] font-black text-[#321E12] leading-snug mt-0.5">{title}</h3>
          <p className="text-[12px] font-semibold text-[#4A3A2E] leading-relaxed mt-1">{spec.task}</p>
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-bold text-[#8C7B6B] leading-snug">
            <MousePointerClick className="w-3.5 h-3.5 text-[#C85A17] flex-shrink-0 mt-px" /> Chạm chốt này rồi chạm chốt kia (hoặc kéo) để nối dây · chạm vào dây để xoá.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <ToolButton onClick={undo} disabled={!history.length} icon={<Undo2 className="w-3.5 h-3.5" />} label="Hoàn tác" />
          <ToolButton onClick={clearAll} disabled={!wires.length} icon={<Eraser className="w-3.5 h-3.5" />} label="Xoá hết" />
          <ToolButton
            onClick={() => setHint((h) => (h === 0 ? 1 : h === 1 && fails >= 2 ? 2 : 0))}
            disabled={success || (fails === 0 && hint === 0)}
            glow={!success && fails >= 1 && hint === 0}
            icon={<Lightbulb className="w-3.5 h-3.5" />}
            label={hint === 0 ? "Gợi ý" : hint === 1 && fails >= 2 ? "Cả sơ đồ" : "Ẩn gợi ý"}
            title={fails === 0 ? "Kiểm tra một lần trước, nếu sai sẽ có gợi ý" : undefined}
          />
        </div>

        <button
          type="button"
          onClick={runCheck}
          className="h-11 rounded-xl bg-[#C85A17] hover:bg-[#B24A0C] text-white text-[13px] font-black flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <ScanSearch className="w-4 h-4" /> Kiểm tra sơ đồ
        </button>

        {note && <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11.5px] font-bold text-slate-600">{note}</div>}

        {fresh && fresh.ok && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-[12px] font-semibold text-emerald-900 leading-relaxed">
            <div className="flex items-center gap-1.5 font-black text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Sơ đồ đúng — đã đóng khoá K</div>
            <p className="mt-1">
              Ampe kế chỉ <b>{fmt((fresh.current ?? 0) * 1000, 1)} mA</b>, vôn kế chỉ <b>{fmt(fresh.voltage ?? 0, 2)} V</b>.
              {spec.key === "ohm"
                ? " Ampe kế nối tiếp nên đo đúng dòng qua R; vôn kế song song nên đo đúng U giữa hai đầu R."
                : " Vôn kế ở hai cực pin đo U = E − I·r; đổi biến trở để có nhiều cặp (I, U)."}
            </p>
          </div>
        )}
        {fresh && !fresh.ok && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12px] font-semibold text-amber-950 leading-relaxed">
            <div className="flex items-center gap-1.5 font-black text-amber-800"><TriangleAlert className="w-4 h-4" /> Chưa đúng — xem chỗ tô đỏ</div>
            <ul className="mt-1 space-y-1">
              {fresh.issues.slice(0, 2).map((issue) => <li key={issue.code}>{issue.text}</li>)}
            </ul>
          </div>
        )}
        {!fresh && result && <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11.5px] font-bold text-slate-500">Sơ đồ đã thay đổi — bấm Kiểm tra lại.</div>}

      </div>
    </div>
  );
}

function ToolButton({ onClick, disabled, icon, label, title, glow = false }: { onClick: () => void; disabled?: boolean; icon: React.ReactNode; label: string; title?: string; glow?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-9 rounded-xl border text-[11.5px] font-black flex items-center justify-center gap-1.5 hover:border-[#C85A17]/40 hover:text-[#C85A17] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${
        glow ? "border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-200" : "border-[#E2DFD8] bg-white text-[#4A3A2E]"
      }`}
    >
      {icon} {label}
    </button>
  );
}

/* ---------------------------------------------------------------------------------------------
   Kí hiệu (vẽ theo trục ngang quanh tâm; dụng cụ dọc thì xoay 90°)
   ------------------------------------------------------------------------------------------- */

function PartSymbol({ part, closed }: { part: SchPart; closed: boolean }) {
  const { half } = part;
  const rot = part.orient === "v" ? " rotate(90)" : "";
  // Nguồn/đồng hồ: cực (+) nằm ở đầu đầu tiên (trái/trên) trừ khi chốt 0 ở phía cuối.
  const plusAtStart = part.orient === "h" ? part.terminals[0].x < part.terminals[1].x : part.terminals[0].y < part.terminals[1].y;
  return (
    <g transform={`translate(${part.x} ${part.y})${rot}`} stroke={INK} strokeLinecap="round" fill="none" pointerEvents="none">
      <SymbolBody kind={part.kind} half={half} closed={closed} plusAtStart={plusAtStart} />
    </g>
  );
}

function SymbolBody({ kind, half, closed = false, plusAtStart = true }: { kind: PartKind; half: number; closed?: boolean; plusAtStart?: boolean }) {
  if (kind === "source") {
    const px = plusAtStart ? -5 : 5;
    return (
      <>
        <line x1={-half} y1="0" x2="-5" y2="0" strokeWidth="2.4" />
        <line x1="5" y1="0" x2={half} y2="0" strokeWidth="2.4" />
        <line x1={px} y1="-17" x2={px} y2="17" strokeWidth="2.4" />
        <line x1={-px} y1="-9" x2={-px} y2="9" strokeWidth="5.5" strokeLinecap="butt" />
      </>
    );
  }
  if (kind === "switch") {
    return (
      <>
        <line x1={-half} y1="0" x2="-13" y2="0" strokeWidth="2.4" />
        <line x1="13" y1="0" x2={half} y2="0" strokeWidth="2.4" />
        {closed ? <line x1="-13" y1="0" x2="13" y2="0" strokeWidth="2.6" /> : <line x1="-12" y1="-1" x2="11" y2="-14" strokeWidth="2.6" />}
        <circle cx="-13" cy="0" r="3.4" fill="#fff" strokeWidth="1.8" />
        <circle cx="13" cy="0" r="3.4" fill="#fff" strokeWidth="1.8" />
      </>
    );
  }
  if (kind === "resistor" || kind === "rheostat") {
    return (
      <>
        <line x1={-half} y1="0" x2="-22" y2="0" strokeWidth="2.4" />
        <line x1="22" y1="0" x2={half} y2="0" strokeWidth="2.4" />
        <rect x="-22" y="-8" width="44" height="16" rx="1.5" fill="#fff" strokeWidth="2.2" />
        {kind === "rheostat" && (
          <>
            <line x1="-15" y1="15" x2="12" y2="-12" strokeWidth="1.9" />
            <polygon points="16,-16 13.5,-7.2 7.2,-13.5" fill={INK} stroke="none" />
          </>
        )}
      </>
    );
  }
  // Ampe kế / vôn kế
  return (
    <>
      <line x1={-half} y1="0" x2="-17" y2="0" strokeWidth="2.4" />
      <line x1="17" y1="0" x2={half} y2="0" strokeWidth="2.4" />
      <circle cx="0" cy="0" r="17" fill="#fff" strokeWidth="2.2" />
    </>
  );
}

function PartLabels({ part, big = false }: { part: SchPart; big?: boolean }) {
  const fs = big ? 1.35 : 1; // chữ to hơn khi khung vẽ hẹp
  const meter = part.kind === "ammeter" || part.kind === "voltmeter";
  const h = part.orient === "h";
  const across = part.kind === "source" ? 18 : part.kind === "switch" ? 13 : meter ? 18 : part.kind === "rheostat" ? 15 : 10;
  const signs = part.kind === "source" || meter
    ? part.terminals.map((t) => {
        // Dấu +/− đặt sát đầu chân dây, lệch sang một bên (trên với dụng cụ ngang, phải với dụng cụ dọc).
        const inward = t.out === "left" ? { x: 1, y: 0 } : t.out === "right" ? { x: -1, y: 0 } : t.out === "up" ? { x: 0, y: 1 } : { x: 0, y: -1 };
        const k = part.kind === "source" ? 17 : 11;
        const x = t.x + inward.x * k + (h ? 0 : 11);
        const y = t.y + inward.y * k + (h ? -10 : 4);
        return <text key={t.id} x={x} y={y} textAnchor="middle" fontSize={15 * fs} fontWeight="900" fill={t.sign === "+" ? "#B91C1C" : "#1D4ED8"}>{t.sign === "+" ? "+" : "−"}</text>;
      })
    : null;
  return (
    <g pointerEvents="none" fontFamily="Nunito, system-ui, sans-serif">
      {meter ? (
        <text x={part.x} y={part.y + 6} textAnchor="middle" fontSize={17 * Math.min(fs, 1.15)} fontWeight="900" fill={INK}>{part.label}</text>
      ) : h ? (
        <text x={part.x} y={part.y - across - 9} textAnchor="middle" fontSize={15 * fs} fontWeight="900" fill={INK} fontStyle={part.kind === "switch" ? "normal" : "italic"}>
          {part.kind === "rheostat" ? <>R<tspan dy="4" fontSize="11">b</tspan></> : part.label}
        </text>
      ) : (
        <text x={part.x - across - 9} y={part.y + 5} textAnchor="end" fontSize={15 * fs} fontWeight="900" fill={INK}>{part.label}</text>
      )}
      {part.value && (
        h
          ? <text x={part.x} y={part.y + across + 17 * fs} textAnchor="middle" fontSize={12 * fs} fontWeight="800" fill={MUTED}>{part.value}</text>
          : <text x={part.x + across + 9} y={part.y + 4} textAnchor="start" fontSize={12 * fs} fontWeight="800" fill={MUTED}>{part.value}</text>
      )}
      {signs}
    </g>
  );
}

/** Nhãn số chỉ đồng hồ khi sơ đồ đúng (kiểu màn LCD). */
function MeterTag({ part, text, spec }: { part: SchPart; text: string; spec: SchematicSpec }) {
  const w = 12 + text.length * 7.4;
  const offset = part.orient === "v" ? { x: -(w / 2 + 26), y: 0 } : spec.key === "emf" ? { x: 0, y: 38 } : { x: 0, y: -40 };
  const cx = part.x + offset.x;
  const cy = part.y + offset.y;
  return (
    <g pointerEvents="none">
      <rect x={cx - w / 2} y={cy - 11} width={w} height="22" rx="6" fill="#1F2A24" stroke="#0F172A" strokeWidth="1" />
      <text x={cx} y={cy + 4.5} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#A7F3D0" fontFamily="ui-monospace, Menlo, monospace">{text}</text>
    </g>
  );
}

const LEGEND_NAMES: Record<PartKind, string> = {
  source: "Nguồn điện",
  switch: "Khoá K (mở)",
  ammeter: "Ampe kế",
  voltmeter: "Vôn kế",
  resistor: "Điện trở",
  rheostat: "Biến trở",
};

function Legend({ kinds, sourceLabel }: { kinds: PartKind[]; sourceLabel: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1 pt-1" aria-label="Kí hiệu trong sơ đồ">
      <span className="text-[10px] font-black uppercase tracking-wider text-[#8C7B6B]">Kí hiệu</span>
      {kinds.map((kind) => (
          <div key={kind} className="flex items-center gap-1 min-w-0">
            <svg viewBox="-30 -20 60 40" className="w-9 h-6 flex-shrink-0" aria-hidden>
              <g stroke={INK} strokeLinecap="round" fill="none">
                <SymbolBody kind={kind} half={28} />
              </g>
              {(kind === "ammeter" || kind === "voltmeter") && <text x="0" y="6" textAnchor="middle" fontSize="17" fontWeight="900" fill={INK}>{kind === "ammeter" ? "A" : "V"}</text>}
            </svg>
            <span className="text-[11px] font-bold text-[#4A3A2E] whitespace-nowrap">{kind === "source" ? sourceLabel : LEGEND_NAMES[kind]}</span>
          </div>
      ))}
        <div className="flex items-center gap-1 min-w-0">
          <svg viewBox="-30 -20 60 40" className="w-9 h-6 flex-shrink-0" aria-hidden>
            <line x1="-26" y1="0" x2="26" y2="0" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
            <line x1="0" y1="0" x2="0" y2="16" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="0" cy="0" r="4.4" fill={INK} />
          </svg>
          <span className="text-[11px] font-bold text-[#4A3A2E] whitespace-nowrap">Dây nối · điểm nối</span>
        </div>
    </div>
  );
}
