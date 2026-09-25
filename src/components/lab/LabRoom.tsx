"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ExperimentSpec } from "@/lib/types";
import type { LabAssignmentPayload } from "@/lib/classTypes";
import { useTTS } from "./useTTS";
// Engine tương tác port từ bản Vite của φLab (inline-style, "use client").
import LabBench from "./LabBench.jsx";
import FreeFallBench from "./FreeFallBench.jsx";
import ElectricalBench from "./ElectricalBench";
import EmfBench from "./EmfBench";
import NewtonBench from "./NewtonBench.jsx";
import { ballDiameterMm } from "../../engine/physics.js";
import GuidedTour, { type TourStep } from "../tour/GuidedTour";
import { labTour } from "../tour/tours";
import { hasSeenTour, isTourOpen, markTourSeen } from "@/lib/tourState";
import { canLockLandscape, enterLandscape, isPhoneDevice, isPortraitNow, leaveLandscape, subscribeOrientation } from "@/lib/orientation";
import RotatePrompt from "./RotatePrompt";

export interface LabExportPayload {
  lab: string;                 // "average" | "instant" | "freefall"
  measuredD: number;           // đường kính bi (mm)
  trials: Array<Record<string, unknown>>;
}

interface LabRoomProps {
  spec: ExperimentSpec;
  measuredD: number;           // MÉT (từ Prelab caliper của page.tsx)
  studentName?: string;        // để ra đề theo từng học sinh
  /** Đề GIÁO VIÊN giao (assignment lớp học) — override đề seeded/AI khi có. */
  assignedSets?: LabAssignmentPayload["problemSets"] | null;
  onExportNote: (payload: LabExportPayload) => void;
  onReplayPrelab: () => void;
  onExitLab: () => void;       // thoát phòng lab -> về bộ chọn thí nghiệm
}

/**
 * LabRoom — Khung phòng Lab: chọn engine theo bài, cấp TTS (đọc bước tiếp theo) + gom số liệu xuất Note.
 * Giữ shell RealPhyLab; engine bên trong là bản kéo-thả-nối-dây + vật lý thật của φLab.
 */
export default function LabRoom({ spec, measuredD, studentName, assignedSets, onExportNote, onReplayPrelab, onExitLab }: LabRoomProps) {
  const { speak, stop, muted, toggleMute } = useTTS();
  const isFreeFall = spec.id === "do-gia-toc-roi-tu-do";
  const isOhm = spec.id === "do-dien-tro-dinh-luat-ohm";
  const isEmf = spec.id === "do-suat-dien-dong-pin-dien-hoa";
  const isNewton = spec.id === "dinh-luat-2-newton";

  // Điện thoại cầm dọc: nhắc xoay ngang (Android có nút tự khoá ngang; iPhone hướng dẫn tự xoay).
  const phone = useSyncExternalStore(subscribeOrientation, isPhoneDevice, () => false);
  const portrait = useSyncExternalStore(subscribeOrientation, isPortraitNow, () => false);
  const [keepPortrait, setKeepPortrait] = useState(false);
  const needRotate = phone && portrait && !keepPortrait;
  // Rời Phòng Lab: trả lại hướng xoay tự do và thoát toàn màn hình.
  useEffect(() => () => leaveLandscape(), []);

  // Hướng dẫn trong Phòng Lab: tự mở đúng một lần — lần đầu vào bàn thí nghiệm (bài nào cũng được),
  // đợi xoay ngang xong mới hiện.
  const [tourSteps, setTourSteps] = useState<TourStep[] | null>(null);
  useEffect(() => {
    if (needRotate || hasSeenTour(studentName, "lab")) return;
    const timer = window.setTimeout(() => {
      if (!isTourOpen()) setTourSteps(labTour());
    }, 900);
    return () => window.clearTimeout(timer);
  }, [studentName, needRotate]);
  const openTour = () => setTourSteps(labTour());
  const closeTour = () => {
    markTourSeen(studentName, "lab");
    setTourSteps(null);
  };

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

  // Viên bi của từng học sinh (Prelab bắt đọc đúng thước kẹp) — cùng một viên ở Prelab và Lab.
  // Chưa có tên thì dùng số đọc từ Prelab (page.tsx giữ theo mét; engine Lab 6 dùng mm).
  const measuredMm = studentName ? ballDiameterMm(studentName) : measuredD > 1 ? measuredD : measuredD * 1000;

  return (
    <div className="lab-session relative w-full flex flex-col overflow-hidden bg-white h-full min-h-0">
      {isNewton ? (
        <NewtonBench
          assignedSets={assignedSets}
          speak={speak}
          muted={muted}
          onToggleMute={toggleMute}
          onExportNote={onExportNote}
          onReplayPrelab={onReplayPrelab}
          onBack={onExitLab}
          onTour={openTour}
        />
      ) : isEmf ? (
        <EmfBench
          studentName={studentName}
          assignedSets={assignedSets}
          speak={speak}
          muted={muted}
          onToggleMute={toggleMute}
          onExportNote={onExportNote}
          onReplayPrelab={onReplayPrelab}
          onBack={onExitLab}
          onTour={openTour}
        />
      ) : isOhm ? (
        <ElectricalBench
          assignedSets={assignedSets}
          speak={speak}
          muted={muted}
          onToggleMute={toggleMute}
          onExportNote={onExportNote}
          onReplayPrelab={onReplayPrelab}
          onBack={onExitLab}
          onTour={openTour}
        />
      ) : isFreeFall ? (
        <FreeFallBench
          assignedSets={assignedSets}
          speak={speak}
          muted={muted}
          onToggleMute={toggleMute}
          onExportNote={onExportNote}
          onReplayPrelab={onReplayPrelab}
          onBack={onExitLab}
          onTour={openTour}
        />
      ) : (
        <LabBench
          measuredD={measuredMm}
          assignedSets={assignedSets}
          speak={speak}
          muted={muted}
          onToggleMute={toggleMute}
          onExportNote={onExportNote}
          onReplayPrelab={onReplayPrelab}
          onBack={onExitLab}
          onTour={openTour}
        />
      )}
      {needRotate && (
        <RotatePrompt
          canLock={canLockLandscape()}
          onRotate={() => { void enterLandscape(); }}
          onKeep={() => setKeepPortrait(true)}
        />
      )}
      {tourSteps && <GuidedTour steps={tourSteps} finishLabel="Bắt đầu thí nghiệm" onClose={closeTour} />}
    </div>
  );
}
