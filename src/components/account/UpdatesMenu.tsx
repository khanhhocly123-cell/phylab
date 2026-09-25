"use client";

/**
 * UpdatesMenu — Chuông thông báo: những gì PhyLab vừa cập nhật (src/data/changelog.ts).
 * Số đỏ = số cập nhật chưa đọc (nhớ theo tài khoản, đồng bộ giữa các máy). Mở chuông là tính đã đọc;
 * các mục vừa mới (`fresh`) vẫn được tô sáng tới lần mở sau để em biết mục nào vừa có.
 */

import { ArrowRight, Bell, Sparkles } from "lucide-react";
import { APP_RELEASE, TAG_CLASS, UPDATES, unreadCount } from "@/data/changelog";
import { labEntry } from "@/data/labCatalog";

interface UpdatesMenuProps {
  open: boolean;
  /** Các mục chưa đọc lúc vừa mở chuông. */
  fresh: readonly string[];
  seen: readonly string[];
  onToggle: () => void;
  onClose: () => void;
  onOpenLesson: (lessonId: string) => void;
}

export default function UpdatesMenu({ open, fresh, seen, onToggle, onClose, onOpenLesson }: UpdatesMenuProps) {
  const unread = unreadCount(seen);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label={unread ? `Thông báo — ${unread} cập nhật mới` : "Thông báo"}
        aria-expanded={open}
        className="relative cursor-pointer rounded-xl p-2 text-[#605248] transition-all hover:bg-[#FFF2E6] hover:text-[#C85A17]"
      >
        <Bell className="h-5 w-5 stroke-[2]" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-red-500 px-1 text-[8px] font-black text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        // Điện thoại: chuông không nằm sát mép phải nên bảng trải ngang màn (lề 12px) thay vì neo theo chuông.
        <div className="fixed inset-x-3 top-[68px] z-50 animate-scale-up rounded-2xl border border-[#E2DFD8] bg-white p-3 text-left text-[#321E12] shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px]">
          <div className="flex items-center justify-between gap-2 border-b border-[#E2DFD8]/60 px-1.5 pb-2.5">
            <p className="flex items-center gap-1.5 text-xs font-black text-[#C85A17]">
              <Sparkles className="h-4 w-4" /> Có gì mới
            </p>
            <span className="rounded-full bg-[#FFF2E6] px-2 py-0.5 text-[10px] font-black text-[#C85A17]">
              {APP_RELEASE.name} · {APP_RELEASE.date}
            </span>
          </div>
          <div className="mt-2 max-h-[min(65vh,440px)] space-y-1.5 overflow-y-auto pr-0.5">
            {UPDATES.map((u) => {
              const isFresh = fresh.includes(u.id);
              const lab = u.lessonId ? labEntry(u.lessonId) : null;
              return (
                <div key={u.id} className={`rounded-xl p-2.5 ${isFresh ? "bg-[#FFF7EF] ring-1 ring-[#C85A17]/15" : ""}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${TAG_CLASS[u.tag]}`}>{u.tag}</span>
                    <span className="text-[9px] font-bold text-[#605248]/60">{u.date}</span>
                    {isFresh && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500" aria-label="Mới" />}
                  </div>
                  <p className="mt-1 text-xs font-black leading-snug">{u.title}</p>
                  <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-[#605248]">{u.body}</p>
                  {lab?.status === "open" && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenLesson(lab.id);
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-black text-[#C85A17] hover:underline"
                    >
                      Mở {lab.code} <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
