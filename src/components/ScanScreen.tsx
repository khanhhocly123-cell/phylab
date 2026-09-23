"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Camera, CameraOff, CheckCircle2, Hand, HelpCircle, ImageUp, Play, RotateCcw, ScanText, Sun, X } from "lucide-react";
import { LessonId } from "@/lib/types";
import { OPEN_LABS } from "@/data/labCatalog";

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

type Phase = "idle" | "scanning" | "done" | "failed";

/* Lối tắt chọn nhanh = mọi bài đang mở trong danh mục chung (thêm bài là tự có ở đây). */
const LESSONS = OPEN_LABS;
const TIPS = [
  { Icon: ScanText, title: "Tiêu đề trong khung", text: "Dòng “Bài …” và tên bài nằm gọn trong khung cam." },
  { Icon: Sun, title: "Đủ sáng, không lóa", text: "Tránh bóng tay và đèn chiếu thẳng vào trang." },
  { Icon: Hand, title: "Giữ yên tay", text: "Giữ máy 1 giây khi bấm chụp để chữ không nhòe." },
];
const GUIDE_KEY = "scanGuideSeen";

/** Lý do không nhận diện được → câu dễ hiểu cho học sinh. */
function failReason(result: OcrResponse | null) {
  if (!result) return "Không kết nối được máy chủ nhận dạng.";
  if (result.reason === "empty_text") return "Ảnh chưa đọc ra chữ — chụp gần hơn, đủ sáng và rõ nét.";
  if (result.reason === "low_match" || result.reason === "below_threshold") return "Đọc được chữ nhưng chưa khớp bài thực hành nào — đưa phần TIÊU ĐỀ bài vào khung.";
  const err = result.error || "";
  // Lỗi kỹ thuật từ máy chủ OCR (HTTP 401/5xx, hết phiên, thiếu token…) → nói dễ hiểu, chỉ lối tắt.
  if (/HTTP_|NO_FILE_HASH|token|fetch|network|kết nối/i.test(err)) {
    return "Máy chủ nhận dạng VNPT đang bận hoặc hết phiên đăng nhập — thử lại sau ít phút, hoặc chọn nhanh bài ở danh sách.";
  }
  return err || "Hãy chụp rõ tiêu đề bài học (dòng “Bài …” và tên bài).";
}

export default function ScanScreen({ onLessonMatched, onManualSelect }: ScanScreenProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [useCamera, setUseCamera] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<OcrResponse | null>(null);
  // Mẹo chụp: desktop luôn hiện ở cột phải; mobile tự mở lần đầu, sau đó bấm “?”.
  const [guideOpen, setGuideOpen] = useState(() => {
    try { return typeof window !== "undefined" && !window.localStorage.getItem(GUIDE_KEY); } catch { return false; }
  });

  const closeGuide = () => {
    setGuideOpen(false);
    try { window.localStorage.setItem(GUIDE_KEY, "1"); } catch { /* bỏ qua */ }
  };

  const startCamera = async () => {
    setUseCamera(true);
    setCameraError(false);
    setPhase("idle");
    setStatus("");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.warn("Không truy cập được Camera:", err);
      setCameraError(true);
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

  // Tự bật camera khi vào màn quét (hoãn một nhịp để không setState ngay trong effect).
  useEffect(() => {
    const id = window.setTimeout(() => { startCamera(); }, 0);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
  }, [stream]);
  // Khung video gắn lại luồng camera mỗi khi hiện lại (sau khi bỏ ảnh xem trước).
  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) videoRef.current.srcObject = stream;
  }, [stream, preview, useCamera]);

  /** Gọi OCR route thật; đọc recognized + confidence thật. */
  const runOcr = async (file: File) => {
    setPhase("scanning");
    setResult(null);
    setStatus("Đang gửi ảnh tới VNPT SmartReader…");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/vnpt/ocr", { method: "POST", body: form });
      setStatus("Đang đọc chữ và dò tên bài…");
      const data: OcrResponse = await res.json();
      setResult(data);
      if (data.recognized && data.lessonId) {
        setPhase("done");
        setStatus(`Nhận diện: ${data.title}`);
      } else {
        setPhase("failed");
        setStatus(data.text ? `Đọc được: “${data.text.slice(0, 48)}…”` : "");
      }
    } catch (err) {
      setResult({ recognized: false, error: `Không kết nối được máy chủ nhận dạng (${err instanceof Error ? err.message : "lỗi mạng"}).` });
      setPhase("failed");
      setStatus("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    stopCamera();
    setPreview(URL.createObjectURL(f));
    runOcr(f);
  };

  /** Chụp 1 khung hình từ camera → JPEG → OCR thật. */
  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setStatus("Camera chưa sẵn sàng — đợi một chút rồi chụp lại.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPreview(canvas.toDataURL("image/jpeg", 0.92));
    canvas.toBlob((blob) => {
      if (!blob) return;
      runOcr(new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  };

  const retake = () => {
    setPhase("idle");
    setResult(null);
    setStatus("");
    setPreview(null);
    if (!stream) startCamera();
  };
  const pickUpload = () => fileInputRef.current?.click();
  const openLesson = (id: LessonId) => {
    stopCamera();
    onLessonMatched(id);
  };
  const exit = () => {
    stopCamera();
    onManualSelect();
  };

  const matched = phase === "done" && result?.lessonId ? LESSONS.find((l) => l.id === result.lessonId) : null;
  const confidence = Math.round((result?.confidence ?? 0) * 100);
  const live = useCamera && !preview;

  /* ---------------- Thẻ kết quả (dùng chung desktop / mobile) ---------------- */
  const resultCard = phase === "done" && result?.lessonId ? (
    <div className="w-full rounded-2xl bg-white border border-[#2E7D32]/25 shadow-[0_18px_40px_rgba(20,12,6,.28)] p-3 flex gap-3 items-center animate-[scanPop_.28s_ease-out]">
      {matched && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={matched.image || "/images/background.webp"} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-[#E2DFD8]" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[#2E7D32] text-[10px] font-black uppercase tracking-wide">
          <CheckCircle2 className="w-3.5 h-3.5" /> Nhận dạng thành công
        </div>
        <div className="text-[13px] font-black text-[#321E12] leading-snug line-clamp-2 mt-0.5">{result.title}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="h-1.5 flex-1 rounded-full bg-[#EDE7DB] overflow-hidden">
            <div className="h-full rounded-full bg-[#2E7D32]" style={{ width: `${Math.max(8, confidence)}%` }} />
          </div>
          <span className="text-[10px] font-black text-[#605248] tabular-nums">tin cậy {confidence}%</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <button onClick={() => openLesson(result.lessonId as LessonId)} className="px-3.5 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all">
          Vào Lab <Play className="w-3 h-3 fill-current" />
        </button>
        <button onClick={retake} className="px-3 py-1.5 rounded-xl border border-[#E2DFD8] text-[#605248] text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer hover:bg-[#FBF6EC]">
          <RotateCcw className="w-3 h-3" /> Quét lại
        </button>
      </div>
    </div>
  ) : null;

  const failCard = phase === "failed" ? (
    <div className="w-full rounded-2xl bg-white border border-rose-200 shadow-[0_18px_40px_rgba(20,12,6,.28)] p-3 animate-[scanPop_.28s_ease-out]">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-black text-rose-700">Chưa nhận ra bài học</div>
          <div className="text-[11.5px] font-bold text-[#605248] leading-snug mt-0.5">{failReason(result)}</div>
        </div>
      </div>
      <div className="flex gap-2 mt-2.5">
        <button onClick={retake} className="flex-1 py-2 rounded-xl bg-[#DF742E] hover:bg-[#B24A0C] text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
          <RotateCcw className="w-3.5 h-3.5" /> Chụp lại
        </button>
        <button onClick={pickUpload} className="flex-1 py-2 rounded-xl border border-[#E2DFD8] text-[#605248] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#FBF6EC]">
          <ImageUp className="w-3.5 h-3.5" /> Tải ảnh khác
        </button>
      </div>
    </div>
  ) : null;

  const quickPick = (
    <div className="grid grid-cols-2 gap-2 max-h-[172px] overflow-y-auto pr-0.5">
      {LESSONS.map((l) => (
        <button key={l.id} onClick={() => openLesson(l.id)}
          className="group flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-white border border-[#E9E2D4] hover:border-[#DF742E]/60 hover:shadow-[0_6px_14px_rgba(50,30,18,.08)] text-left cursor-pointer transition-all">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {l.image ? <img src={l.image} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" /> : <span className="w-9 h-9 rounded-lg bg-[#FFF2E6] flex-shrink-0" />}
          <span className="min-w-0">
            <span className="block text-[10px] font-black text-[#C85A17] leading-none">{l.code} · Lớp {l.grade}</span>
            <span className="block text-[11.5px] font-black text-[#321E12] leading-tight truncate mt-0.5">{l.name}</span>
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full min-h-[100dvh] md:min-h-0 w-full flex flex-col md:flex-row bg-[#120D0A] text-white font-nunito overflow-hidden">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {/* ===================== SÂN KHẤU CAMERA ===================== */}
      <section className="relative flex-1 min-h-0 min-w-0 flex flex-col">
        {/* Thanh trên */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center gap-2 p-3 bg-gradient-to-b from-black/70 to-transparent">
          <button onClick={exit} className="h-9 pl-2.5 pr-3 rounded-xl bg-white/12 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer active:scale-95">
            <ArrowLeft className="w-4 h-4" /> Thoát
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-black leading-tight truncate">Quét trang sách giáo khoa</div>
            <div className="text-[10.5px] font-bold text-white/60 truncate">Chụp tiêu đề bài · VNPT SmartReader tự mở đúng phòng Lab</div>
          </div>
          <button onClick={() => setGuideOpen(true)} aria-label="Mẹo chụp" className="md:hidden w-9 h-9 rounded-xl bg-white/12 border border-white/15 flex items-center justify-center cursor-pointer">
            <HelpCircle className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Khung ngắm */}
        <div className="relative flex-1 min-h-0 overflow-hidden bg-[radial-gradient(ellipse_at_center,#2A1F17_0%,#120D0A_70%)]">
          {live && <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />}
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Ảnh vừa chụp" className="absolute inset-0 w-full h-full object-contain bg-black" />
          )}

          {/* Không có camera: gợi ý tải ảnh */}
          {!live && !preview && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="max-w-xs text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-white/8 border border-white/12 flex items-center justify-center">
                  <CameraOff className="w-7 h-7 text-white/60" />
                </div>
                <div className="text-sm font-black">{cameraError ? "Chưa mở được camera" : "Camera đang tắt"}</div>
                <div className="text-xs font-bold text-white/60 leading-relaxed">
                  {cameraError ? "Cho phép trình duyệt dùng camera, hoặc tải ảnh chụp trang sách lên." : "Bật camera để chụp, hoặc tải ảnh có sẵn."}
                </div>
                <div className="flex gap-2">
                  <button onClick={startCamera} className="px-3.5 py-2 rounded-xl bg-[#DF742E] hover:bg-[#B24A0C] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer active:scale-95">
                    <Camera className="w-3.5 h-3.5" /> Bật camera
                  </button>
                  <button onClick={pickUpload} className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer hover:bg-white/15">
                    <ImageUp className="w-3.5 h-3.5" /> Tải ảnh
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Khung căn tiêu đề: mặt nạ tối xung quanh + 4 góc cam + vạch quét khi đang nhận dạng */}
          {(live || phase === "scanning") && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6 pt-16 pb-28 md:pb-24">
              <div className="relative w-full max-w-[560px] aspect-[4/3] max-h-full rounded-2xl shadow-[0_0_0_9999px_rgba(10,6,4,.52)]">
                {[
                  "top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl",
                  "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl",
                  "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
                  "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
                ].map((c) => <div key={c} className={`absolute w-9 h-9 border-[#F08A3E] ${c}`} />)}
                {phase === "scanning" ? (
                  <div className="absolute inset-x-3 h-0.5 bg-[#FFB27A] shadow-[0_0_14px_4px_rgba(255,140,60,.7)] rounded-full animate-[scanSweep_1.6s_ease-in-out_infinite]" />
                ) : (
                  <div className="absolute left-1/2 -translate-x-1/2 -top-3.5 px-3 py-1 rounded-full bg-black/55 border border-white/15 text-[10.5px] font-black tracking-wide whitespace-nowrap">
                    ĐƯA TIÊU ĐỀ “BÀI …” VÀO KHUNG
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Đang nhận dạng */}
          {phase === "scanning" && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-3.5 py-2 rounded-full bg-black/65 border border-white/15 backdrop-blur-md text-xs font-black flex items-center gap-2 whitespace-nowrap">
              <span className="w-3.5 h-3.5 border-2 border-white/25 border-t-[#F08A3E] rounded-full animate-spin" />
              {status || "Đang phân tích…"}
            </div>
          )}

          {/* Mobile: kết quả trượt lên trên thanh nút chụp */}
          {(resultCard || failCard) && <div className="md:hidden absolute inset-x-3 bottom-24 z-30">{resultCard || failCard}</div>}
        </div>

        {/* Nút chụp */}
        <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-center gap-8 pb-[max(14px,env(safe-area-inset-bottom))] pt-6 bg-gradient-to-t from-black/75 to-transparent">
          <button onClick={pickUpload} title="Tải ảnh trang sách" className="w-12 h-12 rounded-2xl bg-white/12 hover:bg-white/20 border border-white/15 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer active:scale-95">
            <ImageUp className="w-5 h-5" />
          </button>
          {preview ? (
            <button onClick={retake} title="Chụp ảnh mới" disabled={phase === "scanning"}
              className="w-[70px] h-[70px] rounded-full border-4 border-white/85 bg-white/10 flex items-center justify-center cursor-pointer active:scale-90 transition-all disabled:opacity-40">
              <RotateCcw className="w-6 h-6" />
            </button>
          ) : (
            <button onClick={handleCapture} disabled={!live} title="Bấm chụp"
              className="w-[70px] h-[70px] rounded-full border-4 border-white/90 p-1 flex items-center justify-center cursor-pointer active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              <span className="w-full h-full rounded-full bg-[#DF742E] hover:bg-[#F08A3E] transition-colors shadow-[inset_0_-4px_8px_rgba(0,0,0,.25)]" />
            </button>
          )}
          <button onClick={live ? stopCamera : startCamera} title={live ? "Tắt camera" : "Bật camera"}
            className="w-12 h-12 rounded-2xl bg-white/12 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center cursor-pointer active:scale-95">
            {live ? <CameraOff className="w-5 h-5 text-rose-300" /> : <Camera className="w-5 h-5 text-[#F08A3E]" />}
          </button>
        </div>
      </section>

      {/* ===================== CỘT PHẢI (desktop) ===================== */}
      <aside className="hidden md:flex w-[340px] lg:w-[380px] flex-shrink-0 flex-col gap-3 p-4 bg-[#FBF6EC] text-[#321E12] border-l border-[#E2DFD8] overflow-hidden">
        <div className="flex items-center gap-1.5">
          {["Căn tiêu đề", "Bấm chụp", "Vào Lab"].map((step, i) => {
            const active = (phase === "idle" && i === 0) || (phase === "scanning" && i === 1) || ((phase === "done" || phase === "failed") && i === 2);
            const done = (phase === "scanning" && i < 1) || (phase === "done" && i < 2);
            return (
              <div key={step} className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[11px] font-black ${active ? "bg-white border-[#DF742E] text-[#C85A17]" : done ? "bg-[#F3F8F2] border-[#2E7D32]/30 text-[#2E7D32]" : "bg-white/60 border-[#E9E2D4] text-[#8C7B6B]"}`}>
                <span className={`w-4.5 h-4.5 rounded-full grid place-items-center text-[10px] ${active ? "bg-[#DF742E] text-white" : done ? "bg-[#2E7D32] text-white" : "bg-[#EDE7DB]"}`}>{done ? "✓" : i + 1}</span>
                {step}
              </div>
            );
          })}
        </div>

        {resultCard || failCard || (
          <div className="rounded-2xl bg-white border border-[#E9E2D4] p-3">
            <div className="text-[10.5px] font-black uppercase tracking-wider text-[#C85A17]">Mẹo chụp nhanh</div>
            <div className="mt-2 flex flex-col gap-2">
              {TIPS.map(({ Icon, title, text }) => (
                <div key={title} className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF2E6] border border-[#F7D9BF] flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-[#DF742E]" /></div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-black leading-tight">{title}</div>
                    <div className="text-[11px] font-bold text-[#605248] leading-snug">{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {status && phase !== "scanning" && <div className="text-[10.5px] font-bold text-[#8C7B6B] truncate -mt-1 px-1">{status}</div>}

        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-[#8C7B6B]">Không có sách? Chọn nhanh · {LESSONS.length} bài</span>
            <button onClick={exit} className="text-[11px] font-black text-[#C85A17] hover:underline cursor-pointer">Tất cả bài →</button>
          </div>
          {quickPick}
        </div>
      </aside>

      {/* ===================== MẸO CHỤP (mobile, sheet) ===================== */}
      {guideOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/55 flex items-end" onClick={closeGuide}>
          <div className="w-full rounded-t-3xl bg-[#FBF6EC] text-[#321E12] p-4 pb-[max(16px,env(safe-area-inset-bottom))] animate-[sheetUp_.25s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-black">Mẹo chụp để máy nhận ra bài</div>
              <button onClick={closeGuide} aria-label="Đóng" className="w-8 h-8 rounded-full bg-white border border-[#E9E2D4] grid place-items-center cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              {TIPS.map(({ Icon, title, text }) => (
                <div key={title} className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF2E6] border border-[#F7D9BF] flex items-center justify-center flex-shrink-0"><Icon className="w-4.5 h-4.5 text-[#DF742E]" /></div>
                  <div>
                    <div className="text-[13px] font-black leading-tight">{title}</div>
                    <div className="text-[12px] font-bold text-[#605248] leading-snug">{text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10.5px] font-black uppercase tracking-wider text-[#8C7B6B] mt-4 mb-1.5">Không có sách? Chọn nhanh</div>
            {quickPick}
            <button onClick={closeGuide} className="w-full mt-3 py-3 rounded-2xl bg-[#DF742E] text-white text-sm font-black cursor-pointer active:scale-[.98]">Bắt đầu chụp</button>
          </div>
        </div>
      )}
    </div>
  );
}
