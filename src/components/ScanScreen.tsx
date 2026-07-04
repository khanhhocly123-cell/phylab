"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, CheckCircle, Play, Upload, AlertTriangle, RotateCcw, X, Scan, Sun, Sparkles, ChevronUp } from "lucide-react";
import { LessonId } from "@/lib/types";

interface ScanScreenProps {
  onLessonMatched: (lessonId: LessonId) => void;
  onManualSelect: () => void;
}

interface OcrResponse {
  recognized: boolean;
  lessonId?: LessonId | null;
  title?: string;
  confidence?: number;
  apiConfidence?: number | null;
  text?: string;
  error?: string;
  reason?: string;
}

export default function ScanScreen({ onLessonMatched, onManualSelect }: ScanScreenProps) {
  const [phase, setPhase] = useState<"idle" | "scanning" | "done" | "failed">("idle");
  const [useCamera, setUseCamera] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<OcrResponse | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem("phylab_seen_scan_guide");
    if (!hasSeen) {
      setShowGuideModal(true);
      localStorage.setItem("phylab_seen_scan_guide", "true");
    }
  }, []);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const startCamera = async () => {
    setUseCamera(true);
    setPhase("idle");
    setLogs([]);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.error("Không truy cập được Camera:", err);
      addLog("[Lỗi] Không thể mở camera. Vui lòng sử dụng nút tải ảnh lên.");
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  /** Gọi OCR route thật; đọc recognized + confidence thật. */
  const runOcr = async (file: File) => {
    setPhase("scanning");
    setResult(null);
    setLogs([]);
    addLog("[Hệ thống] Kết nối VNPT SmartReader OCR...");
    addLog("[Tải lên] Đang gửi ảnh lên hệ thống nhận dạng...");

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/vnpt/ocr", { method: "POST", body: form });
      const data: OcrResponse = await res.json();

      if (data.text) addLog(`[OCR] Trích xuất: "${data.text.slice(0, 60)}..."`);
      if (data.error) addLog(`[Lỗi] ${data.error}`);

      if (data.recognized && data.lessonId) {
        addLog(`[Kết quả] Nhận diện: ${data.title} (tin cậy ${((data.confidence ?? 0) * 100).toFixed(0)}%)`);
        setResult(data);
        setPhase("done");
      } else {
        addLog("[Kết quả] Không nhận diện được bài học từ ảnh này.");
        setResult(data);
        setPhase("failed");
      }
    } catch (err) {
      addLog(`[Lỗi] Không gọi được API OCR: ${err instanceof Error ? err.message : "không xác định"}`);
      setResult({ recognized: false, error: "Không kết nối được máy chủ OCR." });
      setPhase("failed");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    runOcr(f);
  };

  /** Chụp 1 khung hình từ webcam → ảnh JPEG → OCR thật. */
  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      addLog("[Lỗi] Camera chưa sẵn sàng.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPreview(canvas.toDataURL("image/jpeg", 0.92));
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
        runOcr(file);
      },
      "image/jpeg",
      0.92
    );
  };

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setLogs([]);
    setPreview(null);
  };

  return (
    <div className="w-full min-h-[100dvh] sm:min-h-0 sm:max-w-xl sm:mx-auto bg-[#050505] sm:bg-[#FFFBF7] sm:border-2 sm:border-[#E2DFD8] sm:rounded-[32px] p-3 sm:p-5 sm:my-4 text-[#321E12] font-nunito sm:shadow-xs relative">
      <button
        onClick={onManualSelect}
        className="absolute top-4 left-4 z-30 px-3 py-2 bg-black/45 sm:bg-[#FFF2E6] backdrop-blur-md border border-white/20 sm:border-[#C85A17]/25 text-white sm:text-[#C85A17] text-[10px] font-black rounded-xl transition-all cursor-pointer active:scale-95"
      >
        ← Thoát
      </button>
      {/* Header Deck */}
      <div className="hidden sm:flex items-center justify-between pb-3.5 mb-5 border-b border-[#E2DFD8]/60">
        <div className="text-left flex-1 min-w-0">
          <h2 className="text-base font-black text-[#321E12] uppercase tracking-wide">Quét trang Sách giáo khoa</h2>
          <p className="text-[10px] font-bold text-[#605248] mt-0.5 truncate">
            VNPT SmartReader OCR tự nhận dạng đề và mở phòng Lab
          </p>
        </div>
        <button
          onClick={onManualSelect}
          className="ml-3 px-3 py-1.5 bg-[#FFF2E6] hover:bg-[#FFE0C2] border border-[#C85A17]/25 text-[#C85A17] text-[10px] font-black rounded-xl transition-all flex-shrink-0 cursor-pointer active:scale-95"
        >
          Chọn bài bằng tay
        </button>
      </div>

      {/* Unified Viewfinder Card */}
      <div className="relative w-full h-[calc(100dvh-108px)] sm:h-auto sm:aspect-[9/13.5] sm:max-w-sm mx-auto bg-slate-950 sm:rounded-[28px] overflow-hidden sm:border-4 sm:border-white sm:shadow-[0_12px_28px_rgba(50,30,18,0.06)] flex flex-col items-center justify-center">
        {/* Stream */}
        {useCamera && !preview && (
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        )}

        {/* Static Photo Preview */}
        {preview && (
          <img src={preview} alt="Ảnh chụp" className="w-full h-full object-cover" />
        )}

        {/* Viewfinder Guidelines brackets overlay */}
        {!preview && useCamera && (
          <div className="absolute inset-x-4 top-4 bottom-22 border border-white/5 pointer-events-none rounded-xl flex items-center justify-center">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#DF742E] rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#DF742E] rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#DF742E] rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#DF742E] rounded-br-lg" />
            <span className="text-[9px] font-black text-white/55 bg-black/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Đặt đề bài vào khung hình
            </span>
          </div>
        )}

        {/* Hướng dẫn chụp panel docked at the bottom of viewfinder */}
        {!preview && useCamera && (
          <div 
            onClick={() => setShowGuideModal(true)}
            className="absolute bottom-0 left-0 right-0 bg-[#241A13]/85 backdrop-blur-md border-t border-white/10 p-2 pb-2.5 rounded-t-2xl cursor-pointer hover:bg-[#241A13]/90 transition-all z-10 select-none"
          >
            <div className="flex items-center justify-between mb-1.5 px-1.5">
              <div className="w-3" /> {/* spacer */}
              <span className="text-[9px] font-black text-orange-200/80 uppercase tracking-wider">Hướng dẫn chụp</span>
              <ChevronUp className="w-3 h-3 text-orange-200/80" />
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-white">
              <div className="flex flex-col items-center gap-1">
                <div className="w-6.5 h-6.5 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <Scan className="w-3.5 h-3.5 text-[#DF742E]" />
                </div>
                <span className="text-[7px] font-bold text-slate-300 leading-tight">Đặt sách ngay ngắn trong khung hình</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-6.5 h-6.5 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <Sun className="w-3.5 h-3.5 text-[#DF742E]" />
                </div>
                <span className="text-[7px] font-bold text-slate-300 leading-tight">Ánh sáng đầy đủ, tránh bóng đổ</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-6.5 h-6.5 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-[#DF742E]" />
                </div>
                <span className="text-[7px] font-bold text-slate-300 leading-tight">Chụp rõ nét, không bị lóa</span>
              </div>
            </div>
          </div>
        )}

        {/* Camera Off Placeholder */}
        {!useCamera && !preview && (
          <div className="flex flex-col items-center p-6 text-center text-slate-400 gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Camera className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-[11px] font-bold leading-normal text-slate-500">
              Chưa bật camera. Hãy cho phép camera hoặc chọn một ảnh trang sách để nhận dạng.
            </p>
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-[#DF742E] text-white text-xs font-black rounded-xl hover:bg-[#B24A0C] transition-all cursor-pointer active:scale-95"
            >
              Kích hoạt Camera
            </button>
          </div>
        )}

        {/* Processing Indicator Overlay */}
        {phase === "scanning" && (
          <div className="absolute inset-0 bg-[#321E12]/50 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-3 z-20">
            <div className="w-8 h-8 border-4 border-white/20 border-t-[#DF742E] rounded-full animate-spin" />
            <span className="text-[11px] font-black tracking-wide text-orange-50">Đang phân tích đề bài...</span>
          </div>
        )}

        {/* Outcome Overlay Inside Viewfinder (Optimized for Mobile UX) */}
        {phase === "done" && result?.recognized && result.lessonId && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md border border-[#2E7D32]/25 rounded-[20px] p-4 flex flex-col items-center text-center gap-3 shadow-lg z-20 animate-[slideUp_0.25s_ease-out]">
            <div className="bg-[#F3F8F2] text-[#2E7D32] rounded-full p-2 border border-[#2E7D32]/20">
              <CheckCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-black uppercase bg-[#2E7D32] text-white px-2 py-0.5 rounded">
                Nhận dạng thành công
              </span>
              <h4 className="text-xs font-black text-[#321E12] mt-1.5 leading-snug line-clamp-2">{result.title}</h4>
            </div>
            <button
              onClick={() => {
                stopCamera();
                onLessonMatched(result.lessonId as LessonId);
              }}
              className="w-full py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              Vào phòng Lab <Play className="w-3 h-3 fill-current" />
            </button>
          </div>
        )}

        {phase === "failed" && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md border border-rose-200/60 rounded-[20px] p-4 flex flex-col items-center text-center gap-3 shadow-lg z-20 animate-[slideUp_0.25s_ease-out]">
            <div className="bg-rose-100 text-rose-700 rounded-full p-2 border border-rose-200">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-rose-700">Chưa nhận diện được đề bài</h4>
              <p className="text-[9px] font-bold text-rose-600/85 leading-relaxed">
                {result?.error || "Hãy chụp rõ nét tiêu đề bài học (Bài 6 hoặc Bài 11) đủ sáng."}
              </p>
            </div>
            <div className="flex gap-2 w-full mt-1">
              <button
                onClick={() => {
                  reset();
                  startCamera();
                }}
                className="flex-1 py-1.5 bg-white border border-[#E2DFD8] text-[#605248] text-[10px] font-black rounded-xl hover:bg-slate-50 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Quét lại
              </button>
              <button
                onClick={onManualSelect}
                className="flex-1 py-1.5 bg-[#DF742E] hover:bg-[#B24A0C] text-white text-[10px] font-black rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Thoát quét
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shutter Deck Controls */}
      <div className="mt-3 sm:mt-6 flex items-center justify-center gap-6 max-w-sm mx-auto">
        {/* 1. Upload Button (Small icon on the left) */}
        <button
          onClick={() => {
            stopCamera();
            reset();
            fileInputRef.current?.click();
          }}
          title="Tải ảnh lên"
          className="w-12 h-12 rounded-full bg-white border-2 border-[#E2DFD8] hover:border-[#DF742E]/50 text-[#605248] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_4px_8px_rgba(50,30,18,0.02)] active:scale-95 transition-all cursor-pointer"
        >
          <Upload className="w-5 h-5 text-[#605248]" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        {/* 2. Primary Action Button (Big Shutter in center) */}
        {preview ? (
          <button
            onClick={() => {
              reset();
              startCamera();
            }}
            title="Chụp ảnh mới"
            className="w-16 h-16 rounded-full bg-white border-4 border-[#E2DFD8] hover:border-[#DF742E] flex items-center justify-center shadow-sm active:scale-90 transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5 text-[#605248]" />
          </button>
        ) : (
          <button
            onClick={handleCapture}
            disabled={!useCamera}
            title="Bấm chụp"
            className="w-16 h-16 rounded-full bg-white p-1 shadow-sm border-2 border-[#E2DFD8] flex items-center justify-center active:scale-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-13 h-13 rounded-full bg-[#DF742E] hover:bg-[#B24A0C] transition-colors" />
          </button>
        )}

        {/* 3. Camera Power Toggle (Small button on the right) */}
        {useCamera ? (
          <button
            onClick={stopCamera}
            title="Tắt Camera"
            className="w-12 h-12 rounded-full bg-white border-2 border-[#E2DFD8] hover:border-rose-350 text-[#605248] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_4px_8px_rgba(50,30,18,0.02)] active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5 text-rose-500" />
          </button>
        ) : (
          <button
            onClick={startCamera}
            title="Bật Camera"
            className="w-12 h-12 rounded-full bg-white border-2 border-[#E2DFD8] hover:border-[#DF742E]/55 text-[#605248] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_4px_8px_rgba(50,30,18,0.02)] active:scale-95 transition-all cursor-pointer"
          >
            <Camera className="w-5 h-5 text-[#C85A17]" />
          </button>
        )}
      </div>

      {/* Compact Log Messages */}
      {phase === "scanning" && logs.length > 0 && (
        <div className="mt-4 max-w-sm mx-auto bg-white rounded-xl border border-[#E2DFD8] p-3 text-[10px] font-mono text-[#605248] max-h-24 overflow-y-auto space-y-1">
          {logs.map((log, idx) => (
            <div key={idx} className="truncate">{log}</div>
          ))}
        </div>
      )}
      {/* Guide Modal Overlay */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-5 shadow-2xl border border-[#E2DFD8]/60 flex flex-col gap-4 relative animate-[scaleUp_0.2s_ease-out] font-nunito text-[#321E12]">
            {/* Close button */}
            <button 
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#FFF2E6] hover:bg-[#FFE0C2] flex items-center justify-center text-[#DF742E] transition-all cursor-pointer border-none"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            <h3 className="text-sm font-black text-[#321E12] text-center mt-1 uppercase tracking-wide">Hướng dẫn chụp sách</h3>

            <div className="flex flex-col gap-3">
              {/* Step 1 */}
              <div className="flex gap-3 items-start border-b border-slate-100 pb-2.5">
                <div className="w-14 h-14 rounded-xl bg-orange-50/80 border border-orange-100/50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <rect x="8" y="10" width="24" height="20" rx="2" stroke="#DF742E" strokeWidth="2" strokeDasharray="3 2" />
                    <rect x="12" y="14" width="16" height="12" rx="1" fill="#DF742E" fillOpacity="0.15" stroke="#DF742E" strokeWidth="1.5" />
                    <circle cx="8" cy="10" r="2" fill="#2E7D32" />
                    <circle cx="32" cy="10" r="2" fill="#2E7D32" />
                    <circle cx="8" cy="30" r="2" fill="#2E7D32" />
                    <circle cx="32" cy="30" r="2" fill="#2E7D32" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-black text-[#321E12]">1. Đặt sách ngay ngắn</h4>
                  <p className="text-[9px] font-bold text-[#605248] leading-normal">Đặt sách trên mặt phẳng, căn chỉnh sao cho 4 góc nằm gọn trong khung hình.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3 items-start border-b border-slate-100 pb-2.5">
                <div className="w-14 h-14 rounded-xl bg-orange-50/80 border border-orange-100/50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="7" stroke="#DF742E" strokeWidth="2" />
                    <path d="M20 6V9M20 31V34M6 20H9M31 20H34M10 10L12 12M28 28L30 30M30 10L28 12M12 28L10 30" stroke="#DF742E" strokeWidth="2" strokeLinecap="round" />
                    <path d="M25 15L15 25" stroke="#2E7D32" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-black text-[#321E12]">2. Đảm bảo ánh sáng</h4>
                  <p className="text-[9px] font-bold text-[#605248] leading-normal">Chụp ở nơi đủ sáng, tránh bóng đổ hoặc nguồn sáng trực tiếp gây lóa trang sách.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3 items-start border-b border-slate-100 pb-2.5">
                <div className="w-14 h-14 rounded-xl bg-orange-50/80 border border-orange-100/50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <rect x="14" y="8" width="12" height="24" rx="2" stroke="#DF742E" strokeWidth="2" />
                    <line x1="17" y1="28" x2="23" y2="28" stroke="#DF742E" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M8 15C10 17 10 23 8 25M32 15C30 17 30 23 32 25" stroke="#DF742E" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-black text-[#321E12]">3. Giữ máy ổn định</h4>
                  <p className="text-[9px] font-bold text-[#605248] leading-normal">Giữ chắc tay khi chụp, tránh rung lắc để hình ảnh không bị nhòe mờ chữ.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3 items-start">
                <div className="w-14 h-14 rounded-xl bg-orange-50/80 border border-orange-100/50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M10 10H30V30H10V10Z" stroke="#DF742E" strokeWidth="2" />
                    <path d="M14 14H26" stroke="#DF742E" strokeWidth="1.5" />
                    <path d="M14 18H26" stroke="#DF742E" strokeWidth="1.5" />
                    <path d="M14 22H22" stroke="#DF742E" strokeWidth="1.5" />
                    <path d="M26 26L28 28" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-black text-[#321E12]">4. Chụp đủ trang</h4>
                  <p className="text-[9px] font-bold text-[#605248] leading-normal">Đảm bảo không bị cắt mất nội dung ở các mép trang hoặc tiêu đề bài học.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-3 bg-[#DF742E] hover:bg-[#B24A0C] text-white text-xs font-black rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer mt-2 border-none"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
