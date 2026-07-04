"use client";

import React, { useState } from "react";
import { ExperimentSpec } from "@/lib/types";
import { BookOpen, ChevronLeft, ChevronRight, Check, Lock, Info, MousePointerClick } from "lucide-react";
import PhotogatePrelab from "./prelab/PhotogatePrelab";
import PlumbBasePrelab from "./prelab/PlumbBasePrelab";
import { MC964Interactive, CaliperZoom } from "./prelab/MC964Prelab";

interface PrelabProps {
  spec: ExperimentSpec;
  onStartExperiment: (measuredD?: number) => void;
  /** Chỉ xem Prelab (tab Prelab), không dẫn vào phòng thí nghiệm. */
  viewOnly?: boolean;
}

export default function Prelab({ spec, onStartExperiment, viewOnly = false }: PrelabProps) {
  const [slide, setSlide] = useState(0);
  const [plumbLocked, setPlumbLocked] = useState(false);
  const [caliperVal, setCaliperVal] = useState<number | null>(null);
  const [caliperInputText, setCaliperInputText] = useState("");

  const isB11 = spec.id === "do-gia-toc-roi-tu-do";
  const totalSlides = 5; // Prelab intro + Cover + Photogate + MC964 + (Caliper or PlumbBase)

  const handleCaliperSubmit = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val) && val > 0) {
      setCaliperVal(val);
      setCaliperInputText(valStr);
    } else {
      alert("Vui lòng nhập số đo đường kính hợp lệ (ví dụ: 18.20 hoặc 20.0)!");
    }
  };

  const nextSlide = () => {
    if (slide < totalSlides - 1) {
      setSlide(slide + 1);
    }
  };

  const prevSlide = () => {
    if (slide > 0) {
      setSlide(slide - 1);
    }
  };

  const finishPrelab = () => {
    if (isB11) {
      if (plumbLocked) {
        onStartExperiment();
      }
    } else {
      if (caliperVal !== null) {
        onStartExperiment(caliperVal / 1000); // convert mm to meters
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-brand-orange/20 shadow-lg rounded-3xl p-5 md:p-6 my-4 transition-all duration-300">
      {/* Title Header */}
      <div className="flex items-center justify-between gap-4 border-b border-brand-orange/15 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand-orange rounded-xl text-white shadow-xs">
            <BookOpen className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[9px] font-black bg-brand-orange text-white px-2 py-0.5 rounded uppercase tracking-wider">Prelab - Tìm hiểu dụng cụ</span>
            <h2 className="text-sm md:text-base font-black text-brand-blue uppercase mt-1.5">{spec.shortTitle}</h2>
          </div>
        </div>
        <div className="text-xs font-black text-brand-blue/60 bg-brand-cream/40 px-3 py-1 rounded-full border border-brand-orange/10">
          Trang {slide + 1} / {totalSlides}
        </div>
      </div>

      {/* Slide Container */}
      <div className="bg-[#fefbf5] rounded-3xl border border-slate-200 min-h-[480px] p-4 md:p-6 flex flex-col justify-between">
        <div className="flex-1 flex flex-col justify-center">
          {/* SLIDE 0: Prelab Intro */}
          {slide === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-8 animate-[fadeIn_0.3s_ease-out]">
              <div className="inline-flex items-center gap-2 text-xs tracking-[0.2em] text-brand-orange font-black uppercase mb-3">
                <Info className="w-4 h-4" /> Prelab là gì?
              </div>
              <h3 className="text-xl md:text-2xl font-black text-brand-blue leading-snug">
                Làm quen dụng cụ trước khi vào phòng Lab
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed mt-4 mb-7">
                Prelab giúp em hiểu vai trò của từng dụng cụ, thử thao tác cơ bản và tránh nhầm lẫn khi vào phần đo số liệu chính. Đây vẫn là phần tương tác, nhưng mục tiêu là chuẩn bị: quan sát, thử, ghi nhận điều kiện ban đầu.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-7">
                <div className="bg-white border border-brand-orange/15 rounded-2xl p-4 text-left">
                  <div className="w-9 h-9 rounded-xl bg-brand-orange text-white grid place-items-center mb-3">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-black text-brand-blue mb-1">Hiểu dụng cụ</div>
                  <div className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                    Biết cổng quang, MC964 và dụng cụ căn chỉnh dùng để làm gì.
                  </div>
                </div>
                <div className="bg-white border border-brand-orange/15 rounded-2xl p-4 text-left">
                  <div className="w-9 h-9 rounded-xl bg-brand-orange text-white grid place-items-center mb-3">
                    <MousePointerClick className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-black text-brand-blue mb-1">Thử thao tác</div>
                  <div className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                    Tương tác thử với thiết bị trước khi phải lắp ráp và đo thật.
                  </div>
                </div>
              </div>

              <div className="bg-[#fff7ed] border border-brand-orange/20 rounded-2xl px-4 py-3 text-[11px] sm:text-xs font-bold text-brand-blue leading-relaxed">
                Sau Prelab, em sẽ vào Phòng Lab để lắp thiết bị, nối dây, đo số liệu và xuất sang Sổ Báo Cáo.
              </div>
            </div>
          )}

          {/* SLIDE 1: Cover */}
          {slide === 1 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8 animate-[fadeIn_0.3s_ease-out]">
              <div className="text-xs tracking-[0.25em] text-brand-orange font-black uppercase mb-2">Giới thiệu bài học</div>
              <h3 className="text-xl md:text-2xl font-black text-brand-blue leading-snug">{spec.title}</h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed mt-4 mb-8">
                {isB11 
                  ? "Trước khi vào phòng Lab, hãy hoàn thành 3 trang tìm hiểu thiết bị đo: Cổng quang điện hồng ngoại, đồng hồ hiện số MC964 và cân bằng giá đỡ 3 chân dây dọi cơ học."
                  : "Trước khi vào phòng Lab, hãy hoàn thành 3 trang tìm hiểu thiết bị đo: Cổng quang điện hồng ngoại, đồng hồ hiện số MC964 và sử dụng thước kẹp du xích 0,05 mm để đo đường kính viên bi thép."
                }
              </p>
              
              <div className="flex flex-wrap gap-2.5 justify-center mb-4">
                <span className="bg-white border border-brand-orange/15 rounded-xl px-4.5 py-2.5 text-[11px] font-bold text-brand-blue">1. Cổng quang điện</span>
                <span className="bg-white border border-brand-orange/15 rounded-xl px-4.5 py-2.5 text-[11px] font-bold text-brand-blue">2. Đồng hồ đo MC964</span>
                <span className="bg-white border border-brand-orange/15 rounded-xl px-4.5 py-2.5 text-[11px] font-bold text-brand-blue">
                  {isB11 ? "3. Cân bằng dây dọi" : "3. Đo kích thước bi"}
                </span>
              </div>
            </div>
          )}

          {/* SLIDE 2: Photogate */}
          {slide === 2 && (
            <div className="flex-1 flex flex-col gap-4 animate-[fadeIn_0.3s_ease-out]">
              <div className="border-b border-dashed border-slate-200 pb-2 mb-1">
                <span className="text-[10px] font-black text-brand-orange uppercase">Thiết bị 1/3</span>
                <h4 className="text-sm md:text-base font-black text-brand-blue mt-0.5">Cổng quang điện hồng ngoại</h4>
              </div>
              <PhotogatePrelab />
            </div>
          )}

          {/* SLIDE 3: MC964 */}
          {slide === 3 && (
            <div className="flex-1 flex flex-col gap-4 animate-[fadeIn_0.3s_ease-out]">
              <div className="border-b border-dashed border-slate-200 pb-2 mb-1">
                <span className="text-[10px] font-black text-brand-orange uppercase">Thiết bị 2/3</span>
                <h4 className="text-sm md:text-base font-black text-brand-blue mt-0.5">Đồng hồ hiện số MC964</h4>
              </div>
              <MC964Interactive />
            </div>
          )}

          {/* SLIDE 4: Caliper (Bài 6) or PlumbBase (Bài 11) */}
          {slide === 4 && (
            <div className="flex-1 flex flex-col gap-4 animate-[fadeIn_0.3s_ease-out]">
              {isB11 ? (
                <>
                  <div className="border-b border-dashed border-slate-200 pb-2 mb-1">
                    <span className="text-[10px] font-black text-brand-orange uppercase">Thiết bị 3/3</span>
                    <h4 className="text-sm md:text-base font-black text-brand-blue mt-0.5">Cố định giá đỡ 3 chân dây dọi</h4>
                  </div>
                  <PlumbBasePrelab onLocked={() => setPlumbLocked(true)} />
                </>
              ) : (
                <>
                  <div className="border-b border-dashed border-slate-200 pb-2 mb-1">
                    <span className="text-[10px] font-black text-brand-orange uppercase">Thiết bị 3/3</span>
                    <h4 className="text-sm md:text-base font-black text-brand-blue mt-0.5">Thước kẹp cơ học (Du xích 0,05 mm)</h4>
                  </div>
                  <CaliperZoom onSubmit={handleCaliperSubmit} />
                  
                  {caliperVal !== null && (
                    <div className="bg-emerald-50 border border-emerald-250 rounded-xl p-3 flex items-center gap-2 text-emerald-800 text-xs font-bold justify-center mt-2 animate-[scaleUp_0.25s_ease-out]">
                      <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>Đường kính bi thép đã được ghi nhận: <strong>{caliperInputText} mm</strong> ({ (caliperVal/1000).toFixed(4) } m). Sẵn sàng vào đo đạc!</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-6">
          <button
            onClick={prevSlide}
            disabled={slide === 0}
            className={`px-4.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all select-none ${
              slide === 0 
                ? "text-slate-350 bg-slate-50 border-slate-100 cursor-not-allowed" 
                : "text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Trang trước
          </button>

          {/* Dots Indicator */}
          <div className="flex gap-2">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  i === slide ? "w-6 bg-brand-orange" : "bg-slate-350/50 hover:bg-brand-orange/40"
                }`}
                title={`Đến trang ${i + 1}`}
              />
            ))}
          </div>

          {slide < totalSlides - 1 ? (
            <button
              onClick={nextSlide}
              className="px-4.5 py-2.5 bg-brand-orange hover:bg-brand-orange/95 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              Trang sau <ChevronRight className="w-4 h-4" />
            </button>
          ) : viewOnly ? (
            <button
              onClick={() => onStartExperiment()}
              className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange/95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:-translate-y-0.5 active:translate-y-0"
              title="Xem xong Prelab, quay lại danh sách"
            >
              <Check className="w-3.5 h-3.5" /> Đã xem xong Prelab
            </button>
          ) : (
            <button
              onClick={finishPrelab}
              disabled={isB11 ? !plumbLocked : caliperVal === null}
              className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all select-none shadow-md ${
                (isB11 ? plumbLocked : caliperVal !== null)
                  ? "bg-brand-orange hover:bg-brand-orange/95 text-white cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                  : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
              }`}
              title={isB11 
                ? (!plumbLocked ? "Hãy xoay các vít thăng bằng rồi bấm khóa cả hai vít trước" : "Bắt đầu đo thực hành")
                : (caliperVal === null ? "Hãy kéo thước kẹp và bấm 'Ghi nhận đường kính' trước" : "Bắt đầu đo thực hành")
              }
            >
              {isB11 ? (
                plumbLocked ? (
                  <>Vào phòng Lab <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <><Lock className="w-3.5 h-3.5 inline mr-1" /> Cần cố định giá đỡ</>
                )
              ) : (
                caliperVal !== null ? (
                  <>Vào phòng Lab <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <><Lock className="w-3.5 h-3.5 inline mr-1" /> Cần đo bi thép trước</>
                )
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
