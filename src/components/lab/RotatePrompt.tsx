"use client";

import { RotateCw, Smartphone } from "lucide-react";

/**
 * Màn nhắc xoay ngang khi vào Phòng Lab bằng điện thoại đang cầm dọc. Android: nút "Xoay ngang tự
 * động" (toàn màn hình + khoá ngang). iPhone không khoá được hướng → hướng dẫn tự xoay máy.
 */
export default function RotatePrompt({ canLock, onRotate, onKeep }: { canLock: boolean; onRotate: () => void; onKeep: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="rotate-title" className="fixed inset-0 z-[11000] grid place-items-center bg-[#1C110A]/92 p-6 text-center text-white font-nunito">
      <div className="w-full max-w-xs">
        <div className="mx-auto w-28 h-28 rounded-full bg-white/10 ring-1 ring-white/15 grid place-items-center">
          <span className="block motion-safe:animate-[rotatePhone_2.8s_ease-in-out_infinite]">
            <Smartphone className="w-14 h-14 text-[#FDBA74]" strokeWidth={1.8} />
          </span>
        </div>
        <h2 id="rotate-title" className="mt-5 text-xl font-black">Xoay ngang điện thoại</h2>
        <p className="mt-1.5 text-sm font-semibold text-white/80 leading-relaxed">
          Bàn thí nghiệm rộng hơn, dụng cụ to và dễ bấm hơn khi cầm ngang.
        </p>
        {canLock ? (
          <button
            type="button"
            onClick={onRotate}
            className="mt-5 w-full h-12 rounded-2xl bg-gradient-to-r from-[#F08A3C] to-[#C2410C] text-[15px] font-black flex items-center justify-center gap-2 shadow-[0_10px_24px_rgba(0,0,0,0.3)] cursor-pointer active:scale-[0.98] transition-transform"
          >
            <RotateCw className="w-5 h-5" /> Xoay ngang tự động
          </button>
        ) : (
          <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-[12px] font-semibold text-white/80 leading-relaxed">
            Tắt «Khoá xoay màn hình» trong Trung tâm điều khiển rồi xoay ngang máy — PhyLab tự đổi bố cục.
          </p>
        )}
        <button
          type="button"
          onClick={onKeep}
          className="mt-2.5 w-full h-11 rounded-2xl border border-white/25 text-[13px] font-black text-white/85 hover:bg-white/10 cursor-pointer transition-colors"
        >
          Vẫn dùng màn hình dọc
        </button>
      </div>
    </div>
  );
}
