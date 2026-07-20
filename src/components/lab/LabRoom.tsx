"use client";

import { useCallback, useEffect, useState } from "react";
import { Maximize2, RotateCw, Smartphone } from "lucide-react";
import { ExperimentSpec } from "@/lib/types";
import type { LabAssignmentPayload } from "@/lib/classTypes";
import { useTTS } from "./useTTS";
// Engine tương tác port từ bản Vite của φLab (inline-style, "use client").
import LabBench from "./LabBench.jsx";
import FreeFallBench from "./FreeFallBench.jsx";

export interface LabExportPayload {
  lab: string;                 // "average" | "instant" | "freefall"
  measuredD: number;           // đường kính bi (mm)
  trials: Array<Record<string, unknown>>;
}

interface AssistantSettings {
  pronoun?: "anh" | "chị";
  answerStyle?: "short" | "detailed";
}

interface LabRoomProps {
  spec: ExperimentSpec;
  measuredD: number;           // MÉT (từ Prelab caliper của page.tsx)
  studentName?: string;        // để ra đề theo từng học sinh
  assistantSettings?: AssistantSettings;
  /** Đề GIÁO VIÊN giao (assignment lớp học) — override đề seeded/AI khi có. */
  assignedSets?: LabAssignmentPayload["problemSets"] | null;
  onExportNote: (payload: LabExportPayload) => void;
  onReplayPrelab: () => void;
  onExitLab: () => void;       // thoát phòng lab -> về bộ chọn thí nghiệm
}

/**
 * LabRoom — Khung phòng Lab: chọn engine theo bài, cấp TTS + gom số liệu xuất Note.
 * Giữ shell RealPhyLab; engine bên trong là bản kéo-thả-nối-dây + vật lý thật của φLab.
 */
export default function LabRoom({ spec, measuredD, studentName, assistantSettings, assignedSets, onExportNote, onReplayPrelab, onExitLab }: LabRoomProps) {
  const { speak, stop, muted, toggleMute } = useTTS();
  const isFreeFall = spec.id === "do-gia-toc-roi-tu-do";
  const [requiresLandscape, setRequiresLandscape] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [orientationHint, setOrientationHint] = useState("");

  // Rời lab (unmount) -> tắt hẳn voice, tránh trợ lý còn đọc chồng khi sang màn khác.
  useEffect(() => () => stop(), [stop]);

  // Lab là một không gian thao tác toàn màn hình: khóa scroll của trang bên ngoài
  // nhưng vẫn cho phép cuộn trong các panel được đánh dấu data-lab-scroll.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    html.classList.add("lab-active");
    body.classList.add("lab-active");
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      html.classList.remove("lab-active");
      body.classList.remove("lab-active");
      Object.assign(body.style, previous);
      window.scrollTo(0, scrollY);

      const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
      orientation?.unlock?.();
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const updateOrientation = () => {
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const phoneOrTablet = Math.min(window.innerWidth, window.innerHeight) <= 900;
      setRequiresLandscape(coarsePointer && phoneOrTablet);
      setIsPortrait(window.innerHeight > window.innerWidth);
      if (window.innerWidth > window.innerHeight) setOrientationHint("");
    };

    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  const requestLandscape = useCallback(async () => {
    setOrientationHint("");
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: "landscape") => Promise<void>;
      };
      if (orientation?.lock) await orientation.lock("landscape");
    } catch {
      setOrientationHint("Máy này không cho web tự xoay. Hãy tắt khóa xoay rồi xoay ngang điện thoại nhé.");
    }
  }, []);

  // page.tsx giữ measuredD theo mét; engine Lab 6 dùng mm.
  const measuredMm = measuredD > 1 ? measuredD : measuredD * 1000;

  return (
    <div className="lab-session relative w-full flex flex-col overflow-hidden bg-white h-full min-h-0">
      {requiresLandscape && isPortrait && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#FBF6EC] px-6 py-[max(24px,env(safe-area-inset-top))] text-center">
          <div className="w-full max-w-sm rounded-3xl border border-[#D56A17]/25 bg-white p-6 shadow-xl">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#FFF1E4] text-[#C85A17]">
              <div className="relative">
                <Smartphone className="h-9 w-9" />
                <RotateCw className="absolute -right-4 -top-3 h-5 w-5" />
              </div>
            </div>
            <h2 className="text-xl font-black text-[#321E12]">Xoay ngang để làm Lab</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#605248]">
              Màn thí nghiệm cần chiều ngang để kéo dụng cụ chính xác và không bị cuộn nhầm.
            </p>
            <button
              type="button"
              onClick={requestLandscape}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#C85A17] px-4 font-black text-white active:scale-[0.98]"
            >
              <Maximize2 className="h-5 w-5" /> Bật toàn màn hình & xoay ngang
            </button>
            {orientationHint && <p className="mt-3 text-xs font-bold leading-5 text-amber-700">{orientationHint}</p>}
            <button type="button" onClick={onExitLab} className="mt-3 min-h-11 w-full rounded-xl font-black text-[#605248]">
              ← Thoát Lab
            </button>
          </div>
        </div>
      )}
      {isFreeFall ? (
        <FreeFallBench
          studentName={studentName}
          assignedSets={assignedSets}
          assistantSettings={assistantSettings}
          speak={speak}
          muted={muted}
          onToggleMute={toggleMute}
          onExportNote={onExportNote}
          onReplayPrelab={onReplayPrelab}
          onBack={onExitLab}
        />
      ) : (
        <LabBench
          measuredD={measuredMm}
          studentName={studentName}
          assignedSets={assignedSets}
          assistantSettings={assistantSettings}
          speak={speak}
          muted={muted}
          onToggleMute={toggleMute}
          onExportNote={onExportNote}
          onReplayPrelab={onReplayPrelab}
          onBack={onExitLab}
        />
      )}
    </div>
  );
}
