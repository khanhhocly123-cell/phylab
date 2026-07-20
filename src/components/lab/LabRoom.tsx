"use client";

import { useEffect } from "react";
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

    };
  }, []);

  // page.tsx giữ measuredD theo mét; engine Lab 6 dùng mm.
  const measuredMm = measuredD > 1 ? measuredD : measuredD * 1000;

  return (
    <div className="lab-session relative w-full flex flex-col overflow-hidden bg-white h-full min-h-0">
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
