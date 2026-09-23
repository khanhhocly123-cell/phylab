"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Flag,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Wand2,
} from "lucide-react";
import { C, FONT } from "../../engine/tokens.js";

/* ============================================================================
   LabChrome — khung giao diện DÙNG CHUNG cho mọi bàn thí nghiệm (Bài 6, 11, 23, 26).
   Mỗi bench chỉ lo mô phỏng + logic đo; phần "đi đường" cho học sinh (thanh trên,
   4 chặng, bước tiếp theo, checklist, nhiệm vụ đo, nút hoàn thành, sheet mobile)
   dùng chung ở đây để mọi bài có cùng một nhịp thao tác.
   ========================================================================== */

export const LAB_PHASES = ["Lắp ráp", "Thiết lập", "Đo số liệu", "Hoàn thành"];

/* ---------- Thanh trên cùng ---------- */
export function LabTopBar({ isMobile, isPortrait, title, shortTitle, onExit, onPrelab, muted, onToggleMute, center, meta, onRestart }) {
  const stacked = Boolean(center) && isMobile && isPortrait;
  return (
    <div
      data-lab-header
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
        gridTemplateRows: stacked ? "auto auto" : "auto",
        alignItems: "center",
        columnGap: isMobile ? 6 : 12,
        rowGap: 5,
        padding: isMobile ? "5px 6px" : "8px 14px",
        borderBottom: `1px solid ${C.line}`,
        background: "#fff",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, minWidth: 0 }}>
        <button type="button" onClick={onExit} aria-label="Thoát phòng Lab" title="Thoát phòng Lab" style={topBtn}>
          <ArrowLeft size={15} strokeWidth={2.6} />
          {!isMobile && <span>Thoát</span>}
        </button>
        <div style={{ minWidth: 0, lineHeight: 1.15 }}>
          {!isMobile && <div style={{ fontSize: 9.5, fontWeight: 900, color: C.orangeDk, textTransform: "uppercase", letterSpacing: 0.6 }}>Phòng Lab</div>}
          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 900, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {isMobile ? shortTitle || title : title}
          </div>
        </div>
      </div>

      <div style={{ gridColumn: stacked ? "1 / -1" : "2", gridRow: stacked ? "2" : "1", display: "flex", justifyContent: "center", minWidth: 0 }}>
        {center}
      </div>

      <div style={{ gridColumn: "3", gridRow: "1", justifySelf: "end", display: "flex", alignItems: "center", gap: isMobile ? 4 : 8, minWidth: 0 }}>
        {meta && (
          <span data-lab-meta style={{ fontSize: isMobile ? 10.5 : 12, color: C.sub, whiteSpace: "nowrap" }}>{meta}</span>
        )}
        {onRestart && (
          <button type="button" onClick={onRestart} title="Làm lại từ đầu" aria-label="Làm lại từ đầu" style={topBtn}>
            <RotateCcw size={15} strokeWidth={2.4} />
            {!isMobile && <span>Làm lại</span>}
          </button>
        )}
        {onPrelab && (
          <button type="button" onClick={onPrelab} title="Xem lại Prelab" aria-label="Xem lại Prelab" style={topBtn}>
            <BookOpen size={15} strokeWidth={2.4} />
            {!isMobile && <span>Prelab</span>}
          </button>
        )}
        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={!muted}
            aria-label={muted ? "Bật đọc hướng dẫn" : "Tắt đọc hướng dẫn"}
            title={muted ? "Bật đọc hướng dẫn" : "Tắt đọc hướng dẫn"}
            style={{ ...topBtn, color: muted ? C.sub : C.orangeDk }}
          >
            {muted ? <VolumeX size={15} strokeWidth={2.4} /> : <Volume2 size={15} strokeWidth={2.4} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- 4 chặng: Lắp ráp → Thiết lập → Đo số liệu → Hoàn thành ---------- */
export function PhaseTrack({ phase }) {
  return (
    <ol aria-label="Tiến trình bài thực hành" style={{ display: "grid", gridTemplateColumns: `repeat(${LAB_PHASES.length}, minmax(0, 1fr))`, gap: 4, listStyle: "none", margin: 0, padding: 0 }}>
      {LAB_PHASES.map((label, i) => {
        const state = i < phase ? "done" : i === phase ? "current" : "todo";
        return (
          <li key={label} aria-current={state === "current" ? "step" : undefined} style={{ minWidth: 0 }}>
            <div style={{ height: 4, borderRadius: 4, background: state === "todo" ? C.line : state === "done" ? C.good : C.orange }} />
            <div style={{ marginTop: 5, fontSize: 10, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: state === "current" ? C.orangeDk : state === "done" ? C.good : C.sub }}>
              {state === "done" ? "✓ " : ""}{label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Thẻ "Bước tiếp theo" — nơi duy nhất học sinh cần nhìn ----------
   next = { key, title, hint?, primaryLabel?, assist? } chỉ là dữ liệu; hành động do
   bench truyền vào qua onPrimary / onAssist(payload). */
export function NextStepCard({ phase, next, onSpeak, onPrimary, onAssist, showTrack = true }) {
  const done = next.key === "done";
  return (
    <section aria-live="polite" style={{ ...panelCard, border: `1.5px solid ${done ? `${C.good}66` : `${C.orange}55`}`, background: done ? "#F5FAF4" : "#FFFBF6" }}>
      {showTrack && <div style={{ marginBottom: 12 }}><PhaseTrack phase={phase} /></div>}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center", background: done ? C.good : C.orange, color: "#fff" }}>
          {done ? <Check size={16} strokeWidth={3} /> : <ArrowRight size={16} strokeWidth={3} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={eyebrow}>{done ? "Đã xong" : "Bước tiếp theo"}</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.ink, lineHeight: 1.3 }}>{next.title}</div>
          {next.hint && <div style={{ fontSize: 12.5, color: "#6b6258", lineHeight: 1.45, marginTop: 4, fontWeight: 600 }}>{next.hint}</div>}
        </div>
        {onSpeak && (
          <button type="button" onClick={onSpeak} aria-label="Nghe hướng dẫn" title="Nghe hướng dẫn" style={iconBtn}>
            <Play size={13} strokeWidth={2.6} />
          </button>
        )}
      </div>
      {((next.primaryLabel && onPrimary) || (next.assist && onAssist)) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {next.primaryLabel && onPrimary && (
            <button type="button" onClick={onPrimary} style={{ ...btnPrimary, flex: 1, background: done ? C.good : C.orange }}>
              {next.primaryLabel}
            </button>
          )}
          {next.assist && onAssist && (
            <button type="button" onClick={() => onAssist(next.assist)} style={btnSoft} title="Dùng khi em bị kẹt ở bước này">
              <Wand2 size={13} strokeWidth={2.4} /> Làm giúp bước này
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- Checklist thiết lập / lắp ráp ---------- */
export function ChecklistCard({ title, items, currentKey }) {
  const doneCount = items.filter((item) => item.done).length;
  return (
    <section style={panelCard}>
      <div style={sectionHead}>
        <span style={sectionTitle}>{title}</span>
        <span style={countPill}>{doneCount}/{items.length}</span>
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((item, i) => {
          const current = item.key === currentKey;
          return (
            <li key={item.key} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 9, background: current ? "#FFF3E6" : "transparent" }}>
              <span style={{ width: 20, height: 20, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 900, border: `1.5px solid ${item.done ? C.good : current ? C.orange : C.line}`, background: item.done ? C.good : "#fff", color: item.done ? "#fff" : current ? C.orangeDk : C.sub }}>
                {item.done ? <Check size={11} strokeWidth={3} /> : i + 1}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: current ? 900 : 700, color: item.done ? C.sub : C.ink, textDecoration: item.done ? "line-through" : "none", lineHeight: 1.3 }}>
                {item.text}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------- Nhiệm vụ đo (các cấu hình đề yêu cầu) ---------- */
export function TaskCard({ title, badge, items, onSelect, note }) {
  const doneCount = items.filter((item) => item.done).length;
  return (
    <section data-lab-assignment style={panelCard}>
      <div style={sectionHead}>
        <span style={sectionTitle}>{title}</span>
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          {badge && <span style={{ ...countPill, background: C.navy, color: "#fff", borderColor: C.navy }}>{badge}</span>}
          <span style={countPill}>{doneCount}/{items.length}</span>
        </span>
      </div>
      {note && <div style={{ fontSize: 11.5, color: C.sub, lineHeight: 1.4, margin: "-2px 0 8px", fontWeight: 600 }}>{note}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((item, i) => (
          <button
            key={item.id ?? i}
            type="button"
            onClick={onSelect ? () => onSelect(i) : undefined}
            aria-current={item.current ? "true" : undefined}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", textAlign: "left",
              padding: "8px 10px", borderRadius: 10, cursor: onSelect ? "pointer" : "default", fontFamily: FONT,
              border: `1.5px solid ${item.done ? `${C.good}88` : item.current ? C.orange : C.line}`,
              background: item.done ? "#F3F8F3" : item.current ? "#FFF6EC" : "#fff",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ width: 20, height: 20, borderRadius: 999, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 900, background: item.done ? C.good : item.current ? C.orange : C.bg, color: item.done || item.current ? "#fff" : C.sub }}>
                {item.done ? <Check size={11} strokeWidth={3} /> : i + 1}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap", color: item.done ? C.good : item.current ? C.orangeDk : C.sub }}>
              {item.done ? item.value || "Đã đo" : item.progress || (item.current ? "Đang đo" : "Chưa đo")}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------- Nút kết thúc: lưu số liệu sang Sổ Báo Cáo ----------
   blockedText: bài yêu cầu đủ mẫu mới được lưu (vd. điện 5 + 5) → khóa nút và nói rõ còn thiếu gì. */
export function FinishButton({ count, allDone, onFinish, blockedText }) {
  const disabled = count === 0 || Boolean(blockedText);
  return (
    <button
      type="button"
      onClick={onFinish}
      disabled={disabled}
      style={{
        ...btnPrimary, width: "100%", padding: "12px 14px", fontSize: 13.5, borderRadius: 12,
        background: disabled ? "#E9E1D6" : allDone ? C.good : C.orange,
        color: disabled ? C.sub : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 6px 16px rgba(50,30,18,0.14)",
      }}
    >
      <Flag size={15} strokeWidth={2.6} />
      {count === 0 ? "Chưa có số liệu để lưu" : blockedText || `Lưu ${count} số đo vào Sổ Báo Cáo`}
    </button>
  );
}

/* ---------- Sheet mobile: thanh gọn luôn hiện "bước tiếp theo" + nút chính ---------- */
export function MobileLabSheet({ open, onToggle, phase, next, onPrimary, isPortrait, openHeight, children }) {
  const actionLabel = onPrimary ? next.primaryShort || next.primaryLabel : null;
  return (
    <motion.div
      data-lab-guide-sheet
      initial={false}
      animate={{ height: open ? openHeight || (isPortrait ? "82%" : "88%") : 54 }}
      transition={{ type: "spring", damping: 26, stiffness: 240 }}
      style={{
        position: "absolute",
        left: isPortrait ? 6 : "auto",
        right: 6,
        bottom: 6,
        width: isPortrait ? "auto" : "min(390px, calc(100% - 12px))",
        zIndex: 40,
        background: "#FFFBF7",
        border: `1.5px solid ${next.key === "done" ? `${C.good}88` : C.line}`,
        borderRadius: 16,
        boxShadow: "0 10px 28px rgba(50,30,18,0.18)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ height: 54, flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "0 7px 0 4px", borderBottom: open ? `1px solid ${C.line}` : "none" }}>
        <button
          type="button"
          data-lab-guide-toggle
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? "Thu gọn hướng dẫn" : "Mở hướng dẫn và số liệu"}
          style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", alignItems: "center", gap: 8, border: 0, background: "transparent", padding: "0 4px", textAlign: "left", cursor: "pointer", fontFamily: FONT }}
        >
          <span style={{ flexShrink: 0, minWidth: 34, height: 26, borderRadius: 8, display: "grid", placeItems: "center", background: next.key === "done" ? C.good : C.orange, color: "#fff", fontSize: 11, fontWeight: 900 }}>
            {phase + 1}/{LAB_PHASES.length}
          </span>
          <span style={{ minWidth: 0, flex: 1, lineHeight: 1.2 }}>
            <span style={{ display: "block", fontSize: 9.5, fontWeight: 900, color: next.key === "done" ? C.good : C.orangeDk, textTransform: "uppercase", letterSpacing: 0.4 }}>{LAB_PHASES[phase]}</span>
            <span style={{ display: "block", fontSize: 12.5, fontWeight: 900, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{next.title}</span>
          </span>
          {open ? <ChevronDown size={17} color={C.orangeDk} /> : <ChevronUp size={17} color={C.orangeDk} />}
        </button>
        {actionLabel && (
          <button type="button" onClick={onPrimary} style={{ ...btnPrimary, flexShrink: 0, padding: "8px 12px", fontSize: 12, background: next.key === "done" ? C.good : C.orange }}>
            {actionLabel}
          </button>
        )}
      </div>
      {open && (
        <div data-lab-scroll style={{ flex: 1, overflow: "auto", overscrollBehavior: "contain", padding: "10px 10px calc(14px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 10 }}>
          {children}
        </div>
      )}
    </motion.div>
  );
}

/* ---------- Hộp xác nhận NGAY TRONG LAB (thay window.confirm) ----------
   window.confirm bị chặn/tự huỷ trong khung nhúng và trên nhiều trình duyệt di động → nút Thoát/Lưu
   "không ăn". dialog = { title, message, actions: [{ label, tone?: "primary" | "danger", onClick }] }.
   Bấm nền mờ hoặc Esc = đóng (giống "Ở lại"). */
export function LabDialog({ dialog, onClose }) {
  if (!dialog) return null;
  return (
    <div
      role="presentation"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(50,30,18,0.38)", display: "grid", placeItems: "center", padding: 16 }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={dialog.title}
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 320 }}
        style={{ width: "min(420px, 100%)", background: "#fff", borderRadius: 18, border: `1px solid ${C.line}`, boxShadow: "0 20px 50px rgba(50,30,18,0.28)", padding: 18, fontFamily: FONT }}
      >
        <div style={{ fontSize: 16, fontWeight: 900, color: C.ink, lineHeight: 1.3 }}>{dialog.title}</div>
        {dialog.message && <div style={{ fontSize: 13, fontWeight: 600, color: "#6b6258", lineHeight: 1.5, marginTop: 6 }}>{dialog.message}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {dialog.actions.map((action, i) => (
            <button
              key={action.label}
              type="button"
              autoFocus={i === 0}
              onClick={() => { onClose(); action.onClick?.(); }}
              style={action.tone === "primary"
                ? { ...btnPrimary, width: "100%", padding: "11px 14px" }
                : action.tone === "danger"
                  ? { ...btnSecondary, width: "100%", padding: "10px 14px", borderColor: "#FCA5A5", color: "#B91C1C" }
                  : { ...btnSecondary, width: "100%", padding: "10px 14px", borderColor: C.line, color: C.ink }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Tiến độ dạng "viên" nhỏ (thay cho thẻ nhiệm vụ dài) ----------
   items = [{ key, label, value?, done? }] — gọn một hàng, không bắt học sinh cuộn. */
export function ProgressPills({ items }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {items.map((item) => (
        <span key={item.key} title={item.title || undefined} style={{
          display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 900, whiteSpace: "nowrap",
          border: `1px solid ${item.done ? `${C.good}66` : item.current ? `${C.orange}88` : C.line}`,
          background: item.done ? "#F0F8EF" : item.current ? "#FFF6EC" : "#fff",
          color: item.done ? C.good : item.current ? C.orangeDk : C.sub,
        }}>
          {item.done && <Check size={11} strokeWidth={3} />}
          {item.label}{item.value != null && <b style={{ color: item.done ? C.good : C.ink }}>{item.value}</b>}
        </span>
      ))}
    </div>
  );
}

/* ---------- Thanh chỉnh một đại lượng: [−] ——●—— [+] — gọn một hàng ---------- */
export function NudgeSlider({ label, valueText, value, min, max, step, onChange, nudges = [], disabled = false, ariaLabel, extra = null }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
        <b style={{ fontSize: 16, color: C.orangeDk, fontFamily: "monospace", whiteSpace: "nowrap" }}>{valueText}</b>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
        {nudges.filter((n) => n.delta < 0).map((n) => (
          <button key={n.label} type="button" disabled={disabled} onClick={() => onChange(n.delta, true)} style={nudgeBtn}>{n.label}</button>
        ))}
        <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-label={ariaLabel || label}
          onChange={(e) => onChange(Number(e.target.value), false)} style={{ flex: 1, minWidth: 0, accentColor: C.orange }} />
        {nudges.filter((n) => n.delta > 0).map((n) => (
          <button key={n.label} type="button" disabled={disabled} onClick={() => onChange(n.delta, true)} style={nudgeBtn}>{n.label}</button>
        ))}
      </div>
      {extra}
    </div>
  );
}
const nudgeBtn = { border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", color: C.ink, padding: "5px 7px", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: FONT, flexShrink: 0 };

/* ---------- Thông báo nổi: thường, hoặc mốc thành tích (win) có pháo giấy ----------
   toast = { text, kind?: "info" | "win" | "warn" }; fixed = true khi bench dùng toàn màn hình. */
const CONFETTI = ["#E8842B", "#2563EB", "#16A34A", "#FACC15", "#DB2777", "#0EA5E9", "#F97316", "#8B5CF6"];
export function LabToast({ toast, fixed = false }) {
  if (!toast) return null;
  const kind = toast.kind || "info";
  const palette = kind === "win"
    ? { background: "linear-gradient(135deg,#FFF7E6,#FFFFFF)", color: C.ink, border: `1.5px solid ${C.orange}` }
    : kind === "warn"
      ? { background: "#7F1D1D", color: "#fff", border: "1px solid #991B1B" }
      : { background: "#321E12", color: "#fff", border: "1px solid #321E12" };
  return (
    <motion.div
      key={toast.id ?? toast.text}
      role="status"
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 320 }}
      style={{
        position: fixed ? "fixed" : "absolute", left: "50%", top: fixed ? 18 : 12, x: "-50%", zIndex: fixed ? 9999 : 60,
        maxWidth: "min(520px, 88vw)", borderRadius: 13, padding: kind === "win" ? "10px 16px" : "9px 14px",
        fontSize: kind === "win" ? 13 : 12, fontWeight: 900, lineHeight: 1.35, textAlign: "center", fontFamily: FONT,
        boxShadow: kind === "win" ? "0 10px 26px rgba(232,132,43,0.28)" : "0 7px 20px rgba(50,30,18,0.2)",
        pointerEvents: "none", overflow: "visible", ...palette,
      }}
    >
      {kind === "win" && CONFETTI.map((color, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: Math.cos((i / CONFETTI.length) * Math.PI * 2) * 70, y: Math.sin((i / CONFETTI.length) * Math.PI * 2) * 34 - 10, rotate: 200 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ position: "absolute", left: "50%", top: "50%", width: 7, height: 7, borderRadius: i % 2 ? 2 : 99, background: color }}
        />
      ))}
      <span style={{ position: "relative" }}>{toast.text}</span>
    </motion.div>
  );
}

/* ---------- styles dùng chung ---------- */
export const panelCard = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 12, flexShrink: 0 };
export const sectionHead = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 };
export const sectionTitle = { fontSize: 11.5, fontWeight: 900, color: C.sub, textTransform: "uppercase", letterSpacing: 0.5 };
export const countPill = { fontSize: 10.5, fontWeight: 900, color: C.orangeDk, background: C.peachLt, border: `1px solid ${C.line}`, borderRadius: 999, padding: "1px 8px" };
export const eyebrow = { fontSize: 10, fontWeight: 900, color: C.orangeDk, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 };
export const btnPrimary = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, border: 0, borderRadius: 11, background: C.orange, color: "#fff", padding: "10px 14px", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: FONT };
export const btnSecondary = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, border: `1px solid ${C.navy}`, borderRadius: 11, background: "#fff", color: C.navy, padding: "9px 14px", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: FONT };
export const btnSoft = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, border: `1px solid ${C.orange}66`, borderRadius: 11, background: "#FFF7EF", color: C.orangeDk, padding: "9px 12px", fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: FONT };
export const iconBtn = { width: 30, height: 30, flexShrink: 0, display: "grid", placeItems: "center", border: `1px solid ${C.line}`, borderRadius: 9, background: "#fff", color: C.orangeDk, cursor: "pointer" };
const topBtn = { display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 10px", border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff", color: C.ink, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: FONT, flexShrink: 0 };
