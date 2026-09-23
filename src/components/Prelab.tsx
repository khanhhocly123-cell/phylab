"use client";

import React, { useState } from "react";
import { ExperimentSpec } from "@/lib/types";
import { AlertTriangle, Check, Crosshair, Ruler, ScanLine, Timer } from "lucide-react";
import PhotogatePrelab from "./prelab/PhotogatePrelab";
import PlumbBasePrelab from "./prelab/PlumbBasePrelab";
import { MC964Interactive, CaliperZoom } from "./prelab/MC964Prelab";
import ElectricalPrelab from "./prelab/ElectricalPrelab";
import PrelabShell, { PrelabStep, PrelabStepHeading } from "./prelab/PrelabShell";
import { MathText } from "./Latex";
import { ballDiameterMm } from "@/engine/physics.js";

interface PrelabProps {
  spec: ExperimentSpec;
  onStartExperiment: (measuredD?: number) => void;
  /** Chế độ xem lại (mở từ Phòng Lab / danh sách bài): không khóa, không đổi số liệu đã đo. */
  viewOnly?: boolean;
  /** Về danh sách bài (chỉ dùng khi Prelab là chặng bắt buộc trước Lab). */
  onExit?: () => void;
  /** Mỗi học sinh một viên bi (đường kính cố định theo tên) — Prelab và Lab dùng chung. */
  studentName?: string;
}

export default function Prelab({ spec, onStartExperiment, viewOnly = false, onExit, studentName }: PrelabProps) {
  const [slide, setSlide] = useState(0);
  const [plumbLocked, setPlumbLocked] = useState(false);
  const [caliperVal, setCaliperVal] = useState<number | null>(null);
  const [caliperInputText, setCaliperInputText] = useState("");
  const [caliperError, setCaliperError] = useState<string | null>(null);
  const [caliperTries, setCaliperTries] = useState(0);
  const trueD = ballDiameterMm(studentName || "Học sinh");

  const isB11 = spec.id === "do-gia-toc-roi-tu-do";
  const isElectrical = spec.id === "do-dien-tro-dinh-luat-ohm"
    || spec.id === "do-suat-dien-dong-pin-dien-hoa";

  if (isElectrical) {
    return (
      <ElectricalPrelab
        spec={spec}
        viewOnly={viewOnly}
        onFinish={() => onStartExperiment()}
        onExit={onExit}
      />
    );
  }

  const gateDone = isB11 ? plumbLocked : caliperVal !== null;
  const steps: PrelabStep[] = [
    { key: "overview", label: "Tổng quan" },
    { key: "photogate", label: "Cổng quang" },
    { key: "mc964", label: "Đồng hồ MC964" },
    { key: "gate", label: isB11 ? "Cân bằng giá đỡ" : "Đo đường kính bi", done: gateDone },
  ];

  // Kiểm tra số đọc: phải kẹp sát bi và đọc đúng tới 0,05 mm; sai thì chỉ ra sai ở phần nào.
  const handleCaliperSubmit = (valStr: string, jawMm: number) => {
    const val = parseFloat(valStr);
    if (!Number.isFinite(val) || val <= 0 || val >= 80) {
      setCaliperError("Số đo chưa hợp lệ — nhập đường kính theo mm, ví dụ 18.25.");
      return;
    }
    if (Math.abs(jawMm - trueD) > 0.03) {
      setCaliperError("Hai hàm chưa kẹp sát viên bi — kéo du xích về phía bi (nó dừng lại khi chạm bi) rồi đọc lại.");
      return;
    }
    if (Math.abs(val - trueD) <= 0.026) {
      setCaliperVal(val);
      setCaliperInputText(val.toFixed(2));
      setCaliperError(null);
      return;
    }
    const tries = caliperTries + 1;
    setCaliperTries(tries);
    const whole = Math.floor(trueD + 1e-6);
    const k = Math.round((trueD - whole) / 0.05);
    if (tries >= 3) {
      setCaliperError(`Cách đọc: vạch 0 của du xích nằm sau vạch ${whole} mm → phần nguyên ${whole} mm; vạch du xích số ${k} trùng khít vạch thước chính → phần lẻ ${k} × 0,05 = ${(k * 0.05).toFixed(2)} mm. Vậy d = ${whole} + ${(k * 0.05).toFixed(2)} mm — nhập lại nhé!`);
    } else if (Math.floor(val + 1e-6) !== whole) {
      setCaliperError("Phần nguyên chưa đúng: nhìn vạch 0 của du xích nằm ngay SAU vạch mm nào trên thước chính.");
    } else {
      setCaliperError("Phần nguyên đúng rồi! Phần lẻ: tìm vạch du xích TRÙNG KHÍT với một vạch thước chính (vạch tô cam), lấy số thứ tự của nó × 0,05 mm.");
    }
  };

  const finish = () => {
    if (viewOnly) { onStartExperiment(); return; }
    if (!gateDone) return;
    onStartExperiment(!isB11 && caliperVal !== null ? caliperVal / 1000 : undefined); // mm -> m
  };

  return (
    <PrelabShell
      spec={spec}
      steps={steps}
      current={slide}
      onStep={setSlide}
      mode={viewOnly ? "review" : "gate"}
      canFinish={gateDone}
      requirement={isB11 ? "Còn thiếu: khóa cả hai vít cân bằng giá đỡ" : "Còn thiếu: ghi nhận đường kính viên bi"}
      onFinish={finish}
      onExit={onExit}
    >
      {slide === 0 && <Overview spec={spec} isB11={isB11} />}

      {slide === 1 && (
        <div className="animate-[fadeIn_0.25s_ease-out]">
          <PrelabStepHeading
            eyebrow="Dụng cụ 1/3"
            title="Cổng quang điện hồng ngoại"
            lead="Kéo viên bi qua hai cổng và đổi MODE để thấy đồng hồ bắt đầu, dừng đếm khi nào — đây là cách mọi số đo thời gian trong Lab được tạo ra."
          />
          <PhotogatePrelab />
        </div>
      )}

      {slide === 2 && (
        <div className="animate-[fadeIn_0.25s_ease-out]">
          <PrelabStepHeading
            eyebrow="Dụng cụ 2/3"
            title="Đồng hồ hiện số MC964"
            lead="Thử núm MODE, thang đo và nút Reset — ba thao tác em sẽ làm lại trong Phòng Lab trước mỗi lần đo."
          />
          <MC964Interactive />
        </div>
      )}

      {slide === 3 && (
        <div className="animate-[fadeIn_0.25s_ease-out]">
          {isB11 ? (
            <>
              <PrelabStepHeading
                eyebrow="Dụng cụ 3/3"
                title="Cân bằng giá đỡ bằng dây dọi"
                lead="Vặn hai vít cho mũi quả dọi trùng tâm bia rồi bấm khóa cả hai vít. Giá đỡ thẳng đứng thì trụ thép mới rơi thẳng qua cổng quang."
                required
              />
              <PlumbBasePrelab onLocked={() => setPlumbLocked(true)} />
              {plumbLocked && <DoneBanner>Giá đỡ đã cân bằng và khóa chặt. Sẵn sàng vào Phòng Lab!</DoneBanner>}
            </>
          ) : (
            <>
              <PrelabStepHeading
                eyebrow="Dụng cụ 3/3"
                title="Đo đường kính viên bi bằng thước kẹp"
                lead="Mỗi em có một viên bi riêng. Kéo du xích cho hai hàm kẹp sát viên bi, tự đọc số rồi bấm “Ghi nhận đường kính” — đọc sai thì chưa qua. Giá trị d này dùng để tính tốc độ tức thời v = d/t trong Lab."
                required
              />
              <CaliperZoom ballMm={trueD} onSubmit={handleCaliperSubmit} />
              {caliperError && (
                <div role="alert" className="mt-3 max-w-[720px] mx-auto rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-center gap-2 text-xs font-bold text-rose-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {caliperError}
                </div>
              )}
              {caliperVal !== null && (
                <DoneBanner>
                  Đã ghi nhận đường kính bi: <strong>{caliperInputText} mm</strong> ({(caliperVal / 1000).toFixed(4)} m).
                  {viewOnly ? " (Chế độ xem lại — không thay đổi d đang dùng trong Lab.)" : " Sẵn sàng vào Phòng Lab!"}
                </DoneBanner>
              )}
            </>
          )}
        </div>
      )}
    </PrelabShell>
  );
}

function Overview({ spec, isB11 }: { spec: ExperimentSpec; isB11: boolean }) {
  const items = [
    { icon: <ScanLine className="w-4 h-4" />, title: "Cổng quang điện", text: "Phát hiện vật đi qua để bấm giờ bắt đầu / dừng." },
    { icon: <Timer className="w-4 h-4" />, title: "Đồng hồ MC964", text: "Đếm thời gian theo các MODE A, B, A↔B." },
    isB11
      ? { icon: <Crosshair className="w-4 h-4" />, title: "Giá đỡ & dây dọi", text: "Cân bằng giá đỡ để trụ thép rơi thẳng.", required: true }
      : { icon: <Ruler className="w-4 h-4" />, title: "Thước kẹp", text: "Đo đường kính d của viên bi thép.", required: true },
  ];
  return (
    <div className="max-w-3xl mx-auto py-1 animate-[fadeIn_0.25s_ease-out]">
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C85A17]">Mục tiêu bài thực hành</p>
        <h3 className="text-lg sm:text-xl font-black text-[#321E12] mt-1 leading-snug">{spec.title}</h3>
        <div className="text-xs sm:text-sm font-semibold text-[#605248] leading-relaxed mt-2 max-w-2xl mx-auto">
          <MathText text={spec.theory.objective} />
        </div>
        <div className="inline-flex items-center gap-2.5 mt-4 px-4 py-2 rounded-2xl bg-white border border-[#E2DFD8] text-sm font-black text-[#321E12]">
          <span className="text-[10px] uppercase tracking-wider text-[#605248]">Công thức</span>
          <MathText text={`$${spec.theory.formula}$`} />
        </div>
      </div>

      <p className="mt-6 text-[11px] font-black uppercase tracking-wider text-[#605248]">Em sẽ làm quen 3 dụng cụ</p>
      <div className="grid sm:grid-cols-3 gap-3 mt-2">
        {items.map((it, i) => (
          <div key={it.title} className="rounded-2xl border border-[#E2DFD8] bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#FFF2E6] text-[#C85A17] grid place-items-center">{it.icon}</span>
              <span className="text-[10px] font-black text-[#605248]">Bước {i + 2}</span>
              {it.required && <span className="ml-auto text-[9px] font-black uppercase text-white bg-[#C85A17] px-1.5 py-0.5 rounded">Bắt buộc</span>}
            </div>
            <h4 className="text-sm font-black text-[#321E12] mt-2">{it.title}</h4>
            <p className="text-[11px] font-semibold text-[#605248] leading-relaxed mt-0.5">{it.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[#C85A17]/20 bg-[#FFF7ED] px-4 py-3 text-[11px] sm:text-xs font-bold text-[#321E12] leading-relaxed">
        Sau Prelab: vào Phòng Lab → lắp dụng cụ → thiết lập → đo theo từng nhiệm vụ → lưu số liệu vào Sổ Báo Cáo.
      </div>
    </div>
  );
}

function DoneBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 max-w-[720px] mx-auto bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-800 text-xs font-bold animate-[scaleUp_0.25s_ease-out]">
      <span className="w-5 h-5 bg-emerald-500 text-white rounded-full grid place-items-center flex-shrink-0">
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
      <span>{children}</span>
    </div>
  );
}
