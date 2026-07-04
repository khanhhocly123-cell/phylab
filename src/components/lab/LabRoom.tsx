"use client";

import { useEffect } from "react";
import { ExperimentSpec } from "@/lib/types";
import { useTTS } from "./useTTS";
// Engine tương tác port từ bản Vite của φLab (inline-style, "use client").
import LabBench from "./LabBench.jsx";
import FreeFallBench from "./FreeFallBench.jsx";

export interface LabExportPayload {
  lab: string;                 // "average" | "instant" | "freefall"
  measuredD: number;           // đường kính bi (mm)
  trials: Array<Record<string, unknown>>;
}

interface LabRoomProps {
  spec: ExperimentSpec;
  measuredD: number;           // MÉT (từ Prelab caliper của page.tsx)
  studentName?: string;        // để ra đề theo từng học sinh
  onExportNote: (payload: LabExportPayload) => void;
  onReplayPrelab: () => void;
  onExitLab: () => void;       // thoát phòng lab -> về bộ chọn thí nghiệm
}

/**
 * LabRoom — Khung phòng Lab: chọn engine theo bài, cấp TTS + gom số liệu xuất Note.
 * Giữ shell RealPhyLab; engine bên trong là bản kéo-thả-nối-dây + vật lý thật của φLab.
 */
export default function LabRoom({ spec, measuredD, studentName, onExportNote, onReplayPrelab, onExitLab }: LabRoomProps) {
  const { speak, stop, muted, toggleMute } = useTTS();
  const isFreeFall = spec.id === "do-gia-toc-roi-tu-do";

  // Rời lab (unmount) -> tắt hẳn voice, tránh trợ lý còn đọc chồng khi sang màn khác.
  useEffect(() => () => stop(), [stop]);

  // page.tsx giữ measuredD theo mét; engine Lab 6 dùng mm.
  const measuredMm = measuredD > 1 ? measuredD : measuredD * 1000;

  return (
    <div className="w-full flex flex-col overflow-hidden bg-white h-full min-h-[420px]">
      {isFreeFall ? (
        <FreeFallBench
          studentName={studentName}
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
