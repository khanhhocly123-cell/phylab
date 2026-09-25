"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, X, type LucideIcon } from "lucide-react";
import { Mascot, type MascotGear, type MascotMood } from "./Mascot";

export interface TourStep {
  id: string;
  /** Vùng cần chỉ: một hoặc nhiều selector, lấy phần tử đầu tiên đang hiển thị. Bỏ trống = thẻ giữa màn hình. */
  target?: string | string[];
  /** Tên chương (Làm quen, Phòng Lab, An toàn…) — quyết định màu và thanh tiến độ. */
  chapter?: string;
  icon?: LucideIcon;
  /** Nét mặt linh vật Photon ở bước này (có thì Photon thay cho icon). */
  mood?: MascotMood;
  gear?: MascotGear;
  title: string;
  body?: ReactNode;
  /** Hình minh hoạ / nội dung lớn bên dưới lời dẫn. */
  visual?: ReactNode;
  /** Phần đầu thẻ tự vẽ (vd. màn chào) — thay cho dải tiêu đề mặc định. */
  hero?: ReactNode;
  /** Thẻ giữa màn hình khổ rộng (cho nội dung nhiều hình). */
  wide?: boolean;
  /** Việc cần làm trước khi chỉ vào vùng này (vd. chuyển về Trang chủ). */
  before?: () => void;
  /** Khoảng đệm quanh vùng sáng (px). */
  pad?: number;
  /** Phía ưu tiên đặt thẻ so với vùng sáng. */
  side?: Side;
  /** Nhãn nút Tiếp ở bước này (vd. "Bắt đầu tham quan"). */
  nextLabel?: string;
  /** Nút phụ để thoát ở bước này (vd. "Để sau"). */
  skipLabel?: string;
}

type Side = "right" | "left" | "bottom" | "top";
type Rect = { left: number; top: number; width: number; height: number };

interface Theme {
  from: string;
  to: string;
  solid: string;
  ring: string;
  stripes?: boolean;
}

/** Màu theo chương: Làm quen (cam thương hiệu), Phòng Lab (xanh ngọc), An toàn (vàng cảnh báo có sọc). */
export const TOUR_THEMES: Record<string, Theme> = {
  "Làm quen": { from: "#F59E57", to: "#C2410C", solid: "#C85A17", ring: "#F59E0B" },
  "Phòng Lab": { from: "#2DD4BF", to: "#0F766E", solid: "#0F766E", ring: "#14B8A6" },
  "An toàn": { from: "#FBBF24", to: "#B45309", solid: "#B45309", ring: "#FBBF24", stripes: true },
  "Sổ Báo Cáo": { from: "#60A5FA", to: "#1D4ED8", solid: "#1D5FAF", ring: "#60A5FA" },
};
const DEFAULT_THEME = TOUR_THEMES["Làm quen"];
const themeOf = (chapter?: string) => (chapter && TOUR_THEMES[chapter]) || DEFAULT_THEME;

const MARGIN = 12;
const GAP = 16;
const CARD_W = 384;
const EASE = "cubic-bezier(0.22, 0.8, 0.24, 1)";

/**
 * Chạy ở khung hình kế tiếp; nếu trình duyệt đang tạm dừng khung hình (tab nền, khung nhúng) thì
 * chạy bằng hẹn giờ. Trả về hàm huỷ.
 */
function nextFrame(callback: () => void): () => void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    callback();
  };
  const raf = requestAnimationFrame(run);
  const timer = window.setTimeout(run, 60);
  return () => {
    done = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(timer);
  };
}

/** Phần tử đầu tiên khớp selector và đang thực sự hiển thị (bỏ qua bản ẩn theo màn hình). */
function visibleTarget(target: TourStep["target"]): HTMLElement | null {
  if (!target) return null;
  for (const selector of Array.isArray(target) ? target : [target]) {
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const r = el.getBoundingClientRect();
      if (r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== "hidden") return el;
    }
  }
  return null;
}

type Placed = { x: number; y: number; w: number | "fill"; side: Side | "inside" | "none"; arrow: number };

/** Vị trí thẻ (toạ độ tuyệt đối, không dùng transform để hiệu ứng trượt không bị giật). */
function place(rect: Rect | null, pad: number, size: { w: number; h: number }, vp: { w: number; h: number }, wide: boolean, centerTop: number | null, prefer?: Side): Placed {
  const narrow = vp.w < 640;
  if (narrow) {
    const h = Math.min(size.h, vp.h - 16);
    const atTop = rect ? rect.top + rect.height / 2 > vp.h / 2 : false;
    const y = rect ? (atTop ? 8 : vp.h - h - 8) : Math.max(8, (vp.h - h) / 2);
    return { x: 8, y, w: "fill", side: "none", arrow: 0 };
  }
  if (!rect) {
    const w = wide ? Math.min(840, vp.w - 32) : 440;
    // Giữ mép trên cố định trong một bước: nội dung nở thêm thì thẻ dài xuống, không nhảy lên.
    const top = centerTop ?? Math.max(MARGIN, (vp.h - size.h) / 2);
    const y = Math.max(MARGIN, Math.min(top, vp.h - size.h - MARGIN));
    return { x: Math.max(MARGIN, (vp.w - w) / 2), y, w, side: "none", arrow: 0 };
  }
  const r = { left: rect.left - pad, top: rect.top - pad, right: rect.left + rect.width + pad, bottom: rect.top + rect.height + pad };
  const cx = (r.left + r.right) / 2;
  const cy = (r.top + r.bottom) / 2;
  const clampX = (x: number) => Math.min(Math.max(x, MARGIN), vp.w - size.w - MARGIN);
  const clampY = (y: number) => Math.min(Math.max(y, MARGIN), vp.h - size.h - MARGIN);
  const clampArrow = (v: number, len: number) => Math.min(Math.max(v, 26), len - 26);
  const options: Record<Side, { fits: boolean; x: number; y: number }> = {
    right: { fits: r.right + GAP + size.w <= vp.w - MARGIN, x: r.right + GAP, y: clampY(cy - size.h / 2) },
    left: { fits: r.left - GAP - size.w >= MARGIN, x: r.left - GAP - size.w, y: clampY(cy - size.h / 2) },
    bottom: { fits: r.bottom + GAP + size.h <= vp.h - MARGIN, x: clampX(cx - size.w / 2), y: r.bottom + GAP },
    top: { fits: r.top - GAP - size.h >= MARGIN, x: clampX(cx - size.w / 2), y: r.top - GAP - size.h },
  };
  const order: Side[] = prefer ? [prefer, "right", "bottom", "left", "top"] : ["right", "bottom", "left", "top"];
  for (const side of order) {
    const o = options[side];
    if (!o.fits) continue;
    const arrow = side === "left" || side === "right" ? clampArrow(cy - o.y, size.h) : clampArrow(cx - o.x, size.w);
    return { x: o.x, y: o.y, w: CARD_W, side, arrow };
  }
  // Vùng quá lớn (vd. cả bàn thí nghiệm): đặt thẻ bên trong, sát mép dưới vùng sáng.
  return { x: clampX(cx - size.w / 2), y: clampY(Math.min(r.bottom, vp.h) - size.h - 18), w: CARD_W, side: "inside", arrow: 0 };
}

/**
 * GuidedTour — hướng dẫn từng bước: làm tối màn hình, khoét sáng đúng vùng cần chỉ, thẻ lời dẫn
 * trượt tới cạnh vùng đó (điện thoại: sát mép trên/dưới). Bước không có vùng cần chỉ thì thẻ nằm
 * giữa màn hình. Linh vật Photon đổi nét mặt theo từng bước. Phím ← → chuyển bước, Esc đóng.
 */
export default function GuidedTour({
  steps,
  onClose,
  finishLabel = "Hoàn tất",
  startAt = 0,
}: {
  steps: TourStep[];
  /** finished = true khi đi hết các bước (bấm nút cuối). */
  onClose: (finished: boolean) => void;
  finishLabel?: string;
  startAt?: number;
}) {
  const uid = useId();
  const [index, setIndex] = useState(() => Math.min(startAt, steps.length - 1));
  const [rect, setRect] = useState<Rect | null>(null);
  const [size, setSize] = useState({ w: CARD_W, h: 260 });
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [centerTop, setCenterTop] = useState<{ id: string; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const step = steps[index];
  const last = index === steps.length - 1;
  const pad = step.pad ?? 8;
  const theme = themeOf(step.chapter);
  // Khoá theo nội dung (không theo đối tượng step) để trang cha dựng lại mảng bước cũng không đo lại.
  const targetKey = JSON.stringify(step.target ?? null);

  const go = useCallback((i: number) => {
    if (i < 0 || i >= steps.length) return;
    steps[i].before?.();
    setIndex(i);
  }, [steps]);

  // Tìm & đo vùng cần chỉ sau khi DOM kịp đổi (vd. vừa chuyển tab), rồi bám theo khi cuộn / đổi cỡ.
  useEffect(() => {
    let cancel = () => {};
    let ready = false;
    let tries = 0;
    let el: HTMLElement | null = null;
    let observer: ResizeObserver | null = null;
    const update = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    const target = JSON.parse(targetKey) as TourStep["target"] | null;
    const find = () => {
      el = visibleTarget(target ?? undefined);
      if (!el && target && tries++ < 30) {
        cancel = nextFrame(find);
        return;
      }
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: "center", behavior: "smooth" });
        observer = new ResizeObserver(update);
        observer.observe(el);
      }
      ready = true;
      update();
    };
    cancel = nextFrame(find);
    const onChange = () => {
      if (!ready) return; // còn đang tìm mốc thì để vòng tìm chạy tiếp
      cancel();
      cancel = nextFrame(update);
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      cancel();
      observer?.disconnect();
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [step.id, targetKey]);

  // Kích thước thẻ; lần đo đầu của mỗi bước chốt luôn mép trên khi thẻ nằm giữa màn hình.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const id = step.id;
    const observer = new ResizeObserver(() => {
      const h = card.offsetHeight;
      setSize({ w: card.offsetWidth, h });
      setCenterTop((prev) => (prev && prev.id === id ? prev : { id, y: Math.max(MARGIN, (window.innerHeight - h) / 2) }));
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, [step.id]);

  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose(false);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (last) onClose(true);
        else go(index + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, last, onClose]);

  const placed = place(rect, pad, size, vp, Boolean(step.wide), centerTop?.id === step.id ? centerTop.y : null, step.side);
  const narrow = vp.w < 640;
  const Icon = step.icon;

  // Không có vùng cần chỉ: lỗ sáng co về giữa màn hình (trượt mượt thay vì tắt bật lớp tối).
  const hole = rect
    ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : { left: vp.w / 2, top: vp.h / 2, width: 0, height: 0 };

  const cardStyle: CSSProperties = {
    left: placed.x,
    top: placed.y,
    width: placed.w === "fill" ? `calc(100vw - 16px)` : placed.w,
    maxHeight: narrow ? "calc(100dvh - 16px)" : `calc(100dvh - ${MARGIN * 2}px)`,
    transition: `left 320ms ${EASE}, top 320ms ${EASE}`,
  };

  const arrowStyle: CSSProperties | null =
    placed.side === "none" || placed.side === "inside"
      ? null
      : placed.side === "right" ? { left: -7, top: placed.arrow - 7 }
        : placed.side === "left" ? { right: -7, top: placed.arrow - 7 }
          : placed.side === "bottom" ? { top: -7, left: placed.arrow - 7 }
            : { bottom: -7, left: placed.arrow - 7 };
  // Mũi nhọn nằm trong dải màu đầu thẻ thì tô cùng màu dải cho liền.
  const arrowOnBand = placed.side === "bottom" || ((placed.side === "right" || placed.side === "left") && placed.arrow < 70);

  return createPortal(
    <div className="fixed inset-0 z-[12000] font-nunito" data-guided-tour>
      {/* Chặn thao tác với trang phía sau trong lúc xem hướng dẫn */}
      <div className="absolute inset-0" onPointerDown={(event) => event.preventDefault()} />
      <div
        className="fixed pointer-events-none rounded-2xl"
        style={{
          ...hole,
          boxShadow: "0 0 0 9999px rgba(24, 14, 8, 0.66)",
          transition: `left 320ms ${EASE}, top 320ms ${EASE}, width 320ms ${EASE}, height 320ms ${EASE}`,
        }}
      >
        {rect && (
          <div
            className="absolute -inset-[3px] rounded-[18px] border-2 motion-safe:animate-[tourPulse_1.8s_ease-out_infinite]"
            style={{ borderColor: theme.ring, boxShadow: `0 0 22px ${theme.ring}88` }}
          />
        )}
      </div>

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        className="fixed flex flex-col rounded-[22px] bg-white shadow-[0_24px_70px_rgba(20,10,4,0.45)] ring-1 ring-black/5 motion-safe:animate-[tourIn_0.3s_ease-out]"
        style={cardStyle}
      >
        {arrowStyle && (
          <span
            aria-hidden
            className="absolute w-3.5 h-3.5 rotate-45 rounded-[3px]"
            style={{ ...arrowStyle, background: arrowOnBand ? theme.from : "#fff", transition: `top 320ms ${EASE}, left 320ms ${EASE}` }}
          />
        )}

        {/* Đầu thẻ */}
        <div className="relative flex-shrink-0">
          {step.hero ? (
            <div className="relative overflow-hidden rounded-t-[22px]">
              {step.hero}
              <CloseButton onClick={() => onClose(false)} />
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-t-[22px] px-4 pt-3 pb-3 text-white transition-[background] duration-300" style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
              {theme.stripes && (
                <div aria-hidden className="absolute inset-0 opacity-[0.13]" style={{ backgroundImage: "repeating-linear-gradient(135deg, #111 0 12px, transparent 12px 24px)" }} />
              )}
              {Icon && !theme.stripes && <Icon aria-hidden className="absolute right-12 -bottom-7 w-24 h-24 text-white/15" strokeWidth={1.6} />}
              <div key={step.id} className="relative flex items-center gap-3 pr-9 motion-safe:animate-[tourFade_0.22s_ease-out]">
                {step.mood ? (
                  <span className="relative -my-1.5 flex-shrink-0 block motion-safe:animate-[mascotHop_0.55s_ease-out]">
                    <Mascot mood={step.mood} gear={step.gear} size={50} />
                  </span>
                ) : (
                  Icon && (
                    <span className="w-11 h-11 flex-shrink-0 rounded-2xl bg-white/20 ring-1 ring-white/35 grid place-items-center">
                      <Icon className="w-[22px] h-[22px]" strokeWidth={2.3} />
                    </span>
                  )
                )}
                <div className="min-w-0">
                  <div className="text-[10.5px] font-black uppercase tracking-[0.14em] text-white/85">
                    {step.chapter ? `${step.chapter} · ` : ""}Bước {index + 1}/{steps.length}
                  </div>
                  <h2 id={`${uid}-title`} className="text-[16.5px] font-black leading-snug drop-shadow-[0_1px_0_rgba(0,0,0,0.12)]">{step.title}</h2>
                </div>
              </div>
              <CloseButton onClick={() => onClose(false)} />
            </div>
          )}
        </div>

        <div key={`content-${step.id}`} className="min-h-0 overflow-y-auto motion-safe:animate-[tourFade_0.24s_ease-out]">
          {step.hero && <h2 id={`${uid}-title`} className="sr-only">{step.title}</h2>}
          {step.body && <div className="px-4 pt-3 text-[13px] font-semibold leading-relaxed text-[#4E3F34]">{step.body}</div>}
          {step.visual && <div className="px-4 pt-3">{step.visual}</div>}
        </div>

        <div className="flex-shrink-0 px-4 pt-3 pb-3.5">
          <ChapterProgress steps={steps} index={index} onJump={go} />
          <div className="mt-3 flex items-center gap-2">
            {step.skipLabel && (
              <button type="button" onClick={() => onClose(false)} className="h-10 px-2 rounded-xl text-[12.5px] font-black text-[#8C7B6B] hover:text-[#4E3F34] cursor-pointer transition-colors">
                {step.skipLabel}
              </button>
            )}
            {index > 0 && (
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Quay lại"
                title="Quay lại (←)"
                className="w-10 h-10 flex-shrink-0 rounded-xl border border-[#E7DDCD] bg-white text-[#4E3F34] grid place-items-center hover:bg-[#FBF6EF] cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2.6} />
              </button>
            )}
            {!narrow && !step.skipLabel && <span className="text-[10.5px] font-bold text-[#B3A597] hidden md:inline">← → chuyển bước · Esc đóng</span>}
            <button
              ref={primaryRef}
              type="button"
              onClick={() => (last ? onClose(true) : go(index + 1))}
              className="ml-auto h-10 px-5 rounded-xl text-white text-[13px] font-black flex items-center gap-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:brightness-110 active:translate-y-px cursor-pointer transition-[filter,transform,background] duration-200"
              style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.solid})` }}
            >
              {last ? <><Check className="w-4 h-4" strokeWidth={2.8} /> {finishLabel}</> : <>{step.nextLabel ?? "Tiếp"} <ArrowRight className="w-4 h-4" strokeWidth={2.8} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Đóng hướng dẫn"
      title="Đóng (Esc)"
      className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/15 hover:bg-white/30 text-white grid place-items-center cursor-pointer transition-colors"
    >
      <X className="w-4 h-4" strokeWidth={2.6} />
    </button>
  );
}

/** Tiến độ chia theo chương (bấm để nhảy tới chương; chương xong có dấu tích như đóng dấu). */
function ChapterProgress({ steps, index, onJump }: { steps: TourStep[]; index: number; onJump: (i: number) => void }) {
  const chapters = [...new Set(steps.map((s) => s.chapter ?? ""))];
  return (
    <div className="flex items-end gap-2">
      {chapters.map((chapter) => {
        const idxs = steps.flatMap((s, i) => ((s.chapter ?? "") === chapter ? [i] : []));
        const active = idxs.includes(index);
        const complete = idxs[idxs.length - 1] < index;
        const filled = idxs.filter((i) => i <= index).length;
        const theme = themeOf(chapter || undefined);
        const label = chapter || `Bước ${index + 1}/${steps.length}`;
        return (
          <button
            key={chapter || "all"}
            type="button"
            onClick={() => onJump(idxs[0])}
            disabled={chapters.length === 1}
            className="min-w-0 text-left cursor-pointer disabled:cursor-default"
            style={{ flex: `${Math.max(idxs.length, 2)} 1 0` }}
            title={chapter ? `Tới phần ${chapter}` : undefined}
          >
            <span className="flex items-center gap-1 truncate text-[10px] font-black mb-1" style={{ color: active || complete ? theme.solid : "#B3A597" }}>
              {complete && (
                <span className="w-3.5 h-3.5 rounded-full grid place-items-center text-white flex-shrink-0" style={{ background: theme.solid }}>
                  <Check className="w-2.5 h-2.5" strokeWidth={3.5} />
                </span>
              )}
              <span className="truncate">{label}{active && chapter ? ` · ${idxs.indexOf(index) + 1}/${idxs.length}` : ""}</span>
            </span>
            <span className="block h-1.5 rounded-full bg-[#EFE7DB] overflow-hidden">
              <span className="block h-full rounded-full transition-[width] duration-300" style={{ width: `${(filled / idxs.length) * 100}%`, background: theme.solid }} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
