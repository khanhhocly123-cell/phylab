"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, User, CreditCard, Sparkles, Scan, Check, Eye, EyeOff, Lock, Mail, ChevronLeft, Upload, RefreshCw, Server, Volume2, Info } from "lucide-react";

import Logo from "./Logo";

interface LoginScreenProps {
  onLoginSuccess: (studentName: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loginMode, setLoginMode] = useState<"password" | "face">("password");
  const [slideIndex, setSlideIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [studentName, setStudentName] = useState("");
  
  // Typewriter effect state (continuous typing and deleting loop)
  const fullWelcomeText = "Chào mừng trở lại";
  const [welcomeText, setWelcomeText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined = undefined;
    
    const handleType = () => {
      setWelcomeText((prev) => {
        if (!isDeleting) {
          // Typing
          if (prev.length < fullWelcomeText.length) {
            return fullWelcomeText.slice(0, prev.length + 1);
          } else {
            // Pause at the end of typing before deleting
            timer = setTimeout(() => setIsDeleting(true), 2500);
            return prev;
          }
        } else {
          // Deleting
          if (prev.length > 0) {
            return fullWelcomeText.slice(0, prev.length - 1);
          } else {
            // Pause briefly when empty before typing again
            timer = setTimeout(() => setIsDeleting(false), 500);
            return "";
          }
        }
      });
    };

    const speed = isDeleting ? 40 : 85;
    if (!timer) {
      timer = setTimeout(handleType, speed);
    }

    return () => clearTimeout(timer);
  }, [welcomeText, isDeleting]);
  
  // Password credentials state
  const [email, setEmail] = useState("phylabhackaithon@gmail.com");
  const [password, setPassword] = useState("khanhdeptrai");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // eKYC real camera & upload states
  const [cardPhoto, setCardPhoto] = useState<File | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"card" | "selfie" | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);



  const startCamera = async (target: "card" | "selfie") => {
    setErrorMsg("");
    setUseCamera(true);
    setCameraTarget(target);
    
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: target === "card" ? "environment" : "user", 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        },
      });
      setStream(mediaStream);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 100);
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMsg("Không thể mở camera trên thiết bị này. Vui lòng sử dụng tính năng tải ảnh lên.");
      setUseCamera(false);
      setCameraTarget(null);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setUseCamera(false);
    setCameraTarget(null);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${cameraTarget === "card" ? "card" : "selfie"}-${Date.now()}.jpg`, { type: "image/jpeg" });
        if (cameraTarget === "card") {
          setCardPhoto(file);
          setCardPreview(dataUrl);
        } else {
          setSelfiePhoto(file);
          setSelfiePreview(dataUrl);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "card" | "selfie") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = URL.createObjectURL(file);
    if (target === "card") {
      setCardPhoto(file);
      setCardPreview(dataUrl);
    } else {
      setSelfiePhoto(file);
      setSelfiePreview(dataUrl);
    }
  };

  // cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Auto trigger camera based on loginMode and step
  useEffect(() => {
    if (loginMode === "face") {
      if (!cardPhoto) {
        startCamera("card");
      } else if (!selfiePhoto) {
        startCamera("selfie");
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginMode, !cardPhoto, !selfiePhoto]);

  const handleScan = async () => {
    setScanning(true);
    setErrorMsg("");
    try {
      const form = new FormData();
      form.append("action", "compare");
      
      if (!cardPhoto || !selfiePhoto) {
        throw new Error("Vui lòng cung cấp đầy đủ ảnh Thẻ Học Sinh và ảnh Chân dung.");
      }
      form.append("file", selfiePhoto, "ekyc_selfie.jpg");
      form.append("cardFile", cardPhoto, "ekyc_card.jpg");

      const res = await fetch("/api/vnpt/ekyc", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        throw new Error(`eKYC API returned status ${res.status}`);
      }

      const data = await res.json();
      setScanning(false);
      setSuccess(true);
      
      const name = data.name ? `${data.name}` : "Khánh (TestUser101)";
      setStudentName(name);
      setTimeout(() => {
        onLoginSuccess(name);
      }, 1200);
    } catch (err) {
      setScanning(false);
      setErrorMsg(err instanceof Error ? err.message : "Lỗi xác thực eKYC");
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tên đăng nhập hoặc mật khẩu không chính xác.");
      }

      setSuccess(true);
      const name = data.name || "Khánh (TestUser101)";
      setStudentName(name);
      setTimeout(() => {
        onLoginSuccess(name);
      }, 1000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Đã xảy ra lỗi khi đăng nhập.");
    }
  };

  const renderEkycUi = (isMobile = false) => {
    if (success) {
      return (
        <div className="flex flex-col items-center justify-center py-6 animate-[fadeIn_0.4s_ease-out]">
          <div className="w-16 h-16 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-lg mb-4 animate-bounce">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h3 className="text-lg font-black text-brand-blue">Xác thực tài khoản thành công!</h3>
          <p className="text-xs font-bold text-brand-blue/60 mt-1.5">Xin chào học sinh: {studentName}</p>
        </div>
      );
    }

    if (scanning) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-brand-orange shadow-[0_0_10px_#f78660] animate-scan-beam" />
          <Scan className="w-12 h-12 text-brand-orange animate-pulse mx-auto mb-3" />
          <p className="text-[10px] font-black uppercase tracking-wider text-brand-blue/60 animate-pulse text-center">
            "[VNPT eKYC] Đang so khớp khuôn mặt Face ID..."
          </p>
        </div>
      );
    }

    if (useCamera) {
      return (
        <div className="flex flex-col items-center justify-center bg-slate-900 rounded-2xl relative min-h-[260px] w-full overflow-hidden border border-brand-orange/15 shadow-md animate-[fadeIn_0.3s_ease-out]">
          {/* Header Step indicator */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full border border-white/10 z-10 text-[9px] font-black uppercase tracking-wider text-white flex items-center gap-1.5 backdrop-blur-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-ping" />
            <span>
              {loginMode === "face"
                ? cameraTarget === "card"
                  ? "Bước 1/2: Chụp ảnh thẻ học sinh"
                  : "Bước 2/2: Chụp ảnh chân dung"
                : "Chụp ảnh thẻ học sinh"
              }
            </span>
          </div>

          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover min-h-[260px]" />
          
          {/* Cropping Guide / Frame Overlay */}
          {cameraTarget === "card" ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-black/45" />
              <div className="w-[85%] aspect-[1.586] border-2 border-dashed border-brand-orange rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-0 flex flex-col items-center justify-center gap-1">
                <span className="text-[9px] text-white/80 font-black tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded">Đặt thẻ nằm trong khung</span>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-black/45" />
              <div className="w-[60%] aspect-[0.8] border-2 border-dashed border-brand-orange rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-0 flex flex-col items-center justify-center gap-1">
                <span className="text-[9px] text-white/80 font-black tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded">Đặt khuôn mặt trong khung</span>
              </div>
            </div>
          )}

          {/* Shutter & Controls Bar (Minimalist style) */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-8 z-10">
            {/* Left: Minimalist Gallery Upload button */}
            <label className="p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center cursor-pointer transition-all border border-white/20 w-10 h-10 shadow-lg" title="Tải ảnh lên">
              <Upload className="w-4.5 h-4.5" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, cameraTarget || "card")}
                className="hidden"
              />
            </label>

            {/* Center: iOS-style Shutter Button */}
            <button
              onClick={handleCapture}
              className="w-14 h-14 bg-white border-[4px] border-brand-orange rounded-full flex items-center justify-center shadow-2xl active:scale-90 hover:bg-neutral-100 transition-all cursor-pointer"
              title="Chụp"
            >
              <span className="w-4 h-4 bg-brand-orange rounded-full" />
            </button>

            {/* Right: Cancel/Back button */}
            <button
              onClick={() => {
                if (cameraTarget === "selfie" && loginMode === "face") {
                  // Go back to card capture step
                  setCardPhoto(null);
                  setCardPreview(null);
                } else {
                  setErrorMsg("");
                  stopCamera();
                }
              }}
              className="p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center cursor-pointer transition-all border border-white/20 w-10 h-10 shadow-lg"
              title={cameraTarget === "selfie" ? "Quay lại bước 1" : "Đóng camera"}
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      );
    }



    // Review screen for Face ID mode
    if (loginMode === "face" && cardPreview && selfiePreview) {
      return (
        <div className="w-full space-y-4">
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="flex flex-col items-center p-3 bg-brand-cream/20 border border-brand-orange/15 rounded-xl relative">
              <p className="text-[9px] font-black text-brand-blue uppercase mb-2 tracking-wider">1. Thẻ Học Sinh</p>
              <div className="relative w-full h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                <img src={cardPreview} alt="Thẻ HS" className="w-full h-full object-contain" />
                <button
                  onClick={() => { setCardPhoto(null); setCardPreview(null); }}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-red-655 text-white text-[9px] font-bold p-1 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                  title="Chụp lại"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center p-3 bg-brand-cream/20 border border-brand-orange/15 rounded-xl relative">
              <p className="text-[9px] font-black text-brand-blue uppercase mb-2 tracking-wider">2. Chân Dung</p>
              <div className="relative w-full h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                <img src={selfiePreview} alt="Chân dung" className="w-full h-full object-contain" />
                <button
                  onClick={() => { setSelfiePhoto(null); setSelfiePreview(null); }}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-red-655 text-white text-[9px] font-bold p-1 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                  title="Chụp lại"
                >
                  &times;
                </button>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#5C4D3C] font-bold text-center leading-relaxed px-2 my-1 flex items-center justify-center gap-1">
            <Info className="w-3.5 h-3.5 text-brand-orange flex-shrink-0" />
            <span>Sẵn sàng so khớp khuôn mặt để đăng nhập.</span>
          </p>

          {errorMsg && (
            <div className="bg-rose-50 text-rose-700 p-2.5 rounded-lg text-[10px] font-bold border border-rose-200 text-center animate-[fadeIn_0.3s_ease-out]">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleScan}
            className="w-full py-4 bg-gradient-to-r from-brand-orange to-[#C35F14] hover:from-[#E27C27] hover:to-[#B55210] text-white text-xs font-black rounded-xl shadow-[0_4px_12px_rgba(213,106,23,0.22)] flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Sparkles className="w-4.5 h-4.5" />
            So khớp Face ID & Đăng nhập
          </button>
        </div>
      );
    }

    // Fallback UI if camera is not active and photos are not yet fully provided
    return (
      <div className="w-full space-y-4">
        <div className={`grid ${loginMode === "face" ? "grid-cols-2 gap-3" : "grid-cols-1"} w-full`}>
          {/* Card photo slot */}
          <div className="flex flex-col items-center p-3 border border-dashed border-brand-orange/20 bg-brand-cream/20 rounded-xl">
            <p className="text-[10px] font-black text-brand-blue uppercase mb-2">1. Ảnh thẻ học sinh</p>
            {cardPreview ? (
              <div className="relative w-full h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                <img src={cardPreview} alt="Thẻ HS" className="w-full h-full object-contain" />
                <button
                  onClick={() => { setCardPhoto(null); setCardPreview(null); }}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-red-655 text-white text-[9px] font-bold p-1 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                >
                  &times;
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full items-center justify-center min-h-[96px]">
                <label className="py-2.5 px-4 bg-brand-orange hover:bg-[#B55210] text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95">
                  <Upload className="w-4 h-4" /> Tải ảnh thẻ
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "card")}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Selfie photo slot */}
          {loginMode === "face" && (
            <div className="flex flex-col items-center p-3 border border-dashed border-brand-orange/20 bg-brand-cream/20 rounded-xl">
              <p className="text-[10px] font-black text-brand-blue uppercase mb-2">2. Ảnh chân dung</p>
              {selfiePreview ? (
                <div className="relative w-full h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                  <img src={selfiePreview} alt="Chân dung" className="w-full h-full object-contain" />
                  <button
                    onClick={() => { setSelfiePhoto(null); setSelfiePreview(null); }}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-red-655 text-white text-[9px] font-bold p-1 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 w-full items-center justify-center min-h-[96px]">
                  <label className="py-2.5 px-4 bg-brand-orange hover:bg-[#B55210] text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95">
                    <Upload className="w-4 h-4" /> Tải ảnh chân dung
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "selfie")}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {loginMode === "face" && (
          <p className="text-[10px] text-[#5C4D3C] font-bold text-center leading-relaxed px-2 my-1.5 flex items-center justify-center gap-1">
            <Info className="w-3.5 h-3.5 text-brand-orange flex-shrink-0" />
            <span>
              <span className="text-brand-orange">So khớp Face ID:</span> Hệ thống sử dụng VNPT eKYC để so sánh ảnh chụp webcam với ảnh chân dung trên Thẻ Học Sinh để xác minh chính chủ.
            </span>
          </p>
        )}
        {errorMsg && (
          <div className="bg-rose-50 text-rose-700 p-2.5 rounded-lg text-[10px] font-bold border border-rose-200 text-center animate-[fadeIn_0.3s_ease-out]">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleScan}
          disabled={!cardPhoto || !selfiePhoto}
          className={`w-full py-3.5 bg-gradient-to-r from-brand-orange to-[#C35F14] hover:from-[#E27C27] hover:to-[#B55210] text-white text-xs font-black rounded-xl shadow-[0_4px_12px_rgba(213,106,23,0.22)] flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-40 disabled:pointer-events-none`}
        >
          <Sparkles className="w-4.5 h-4.5" />
          So khớp Face ID & Đăng nhập
        </button>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl bg-[#FBF6EC] rounded-none md:rounded-[2.5rem] border-none md:border md:border-brand-orange/15 shadow-none md:shadow-[0_30px_80px_rgba(62,39,24,0.08)] overflow-hidden transition-all duration-300">
      
      {/* 1. DESKTOP VIEW: Split layout side-by-side */}
      <div className="hidden md:grid grid-cols-2 min-h-[660px]">
        {/* LEFT COLUMN: HERO ILLUSTRATION */}
        <div className="relative overflow-hidden">
          <img
            src="/img_login_full.png"
            alt="Physics Lab Hero"
            className="absolute inset-0 w-full h-full object-cover select-none transition-transform duration-[1.2s] ease-out hover:scale-[1.04]"
          />
        </div>

        {/* RIGHT COLUMN: LOGIN FORM & TABS */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-gradient-to-r from-transparent via-[#FDFBF7]/50 to-white/70 relative min-h-[620px]">
          <div>
            {/* Header section with Logo and App Name */}
            <div className="flex flex-col items-start gap-4 mb-8">
              <div className="flex items-center gap-3">
                <Logo size={42} className="md:w-[46px] md:h-[46px]" />
                <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none text-brand-blue">Phylab</h1>
                  <span className="text-[9px] md:text-[10px] font-extrabold uppercase tracking-widest text-brand-orange mt-1 block">
                    Phòng thí nghiệm vật lý tương tác
                  </span>
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-brand-blue leading-tight mt-2 min-h-[36px] flex items-center">
                <span>{welcomeText}</span>
                <span className="w-1 h-6 bg-brand-orange ml-1 inline-block animate-[pulse_1s_infinite]"></span>
              </h2>
            </div>

            {/* Segmented control style tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 mb-8 bg-brand-cream/60 rounded-[20px] border border-brand-orange/15 shadow-inner">
              <button
                onClick={() => { setLoginMode("password"); setErrorMsg(""); }}
                className={`py-3 px-2 text-xs font-black rounded-[15px] transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === "password"
                    ? "bg-brand-orange text-white shadow-[0_4px_12px_rgba(213,106,23,0.25)] border-transparent"
                    : "bg-transparent text-brand-blue/70 hover:text-brand-orange hover:bg-brand-orange/5 border-transparent"
                }`}
              >
                Mật khẩu
              </button>
              <button
                onClick={() => { setLoginMode("face"); setErrorMsg(""); }}
                className={`py-3 px-2 text-xs font-black rounded-[15px] transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === "face"
                    ? "bg-brand-orange text-white shadow-[0_4px_12px_rgba(213,106,23,0.25)] border-transparent"
                    : "bg-transparent text-brand-blue/70 hover:text-brand-orange hover:bg-brand-orange/5 border-transparent"
                }`}
              >
                <Camera className="w-4 h-4" /> Face ID
              </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[250px] flex flex-col justify-center">
              {success ? (
                <div className="flex flex-col items-center justify-center py-6 animate-[fadeIn_0.4s_ease-out]">
                  <div className="w-16 h-16 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-lg mb-4 animate-bounce">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h3 className="text-lg font-black text-brand-blue">Xác thực tài khoản thành công!</h3>
                  <p className="text-xs font-bold text-brand-blue/60 mt-1.5">Xin chào học sinh: {studentName}</p>
                </div>
              ) : loginMode === "password" ? (
                <form onSubmit={handlePasswordLogin} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-brand-blue">Tên đăng nhập hoặc Email</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/45">
                        <Mail className="w-4.5 h-4.5" />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-brand-orange/20 focus:border-brand-orange focus:bg-white outline-none text-xs font-bold bg-white/80 focus:ring-4 focus:ring-brand-orange/10 transition-all placeholder-brand-blue/30"
                        placeholder="ví dụ: phylabhackaithon@gmail.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-brand-blue">Mật khẩu</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/45">
                        <Lock className="w-4.5 h-4.5" />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 rounded-xl border border-brand-orange/20 focus:border-brand-orange focus:bg-white outline-none text-xs font-bold bg-white/80 focus:ring-4 focus:ring-brand-orange/10 transition-all placeholder-brand-blue/30"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-blue/50 hover:text-brand-orange transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-brand-blue/70 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-brand-orange/30 text-brand-orange focus:ring-brand-orange/25 focus:ring-offset-0 accent-brand-orange"
                        defaultChecked 
                      />
                      <span>Ghi nhớ đăng nhập</span>
                    </label>
                    <a href="#" className="hover:text-brand-orange transition-colors">Quên mật khẩu?</a>
                  </div>

                  {errorMsg && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-xl text-[11px] font-bold border border-red-200 animate-[fadeIn_0.3s_ease-out]">
                      {errorMsg}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-brand-orange to-[#C35F14] hover:from-[#E27C27] hover:to-[#B55210] text-white text-xs font-black rounded-xl shadow-[0_6px_20px_rgba(213,106,23,0.25)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    Đăng nhập
                  </button>
                </form>
              ) : (
                renderEkycUi(false)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. MOBILE VIEW: Carousel slider layout */}
      <div 
        className="block md:hidden w-full overflow-hidden relative min-h-screen"
        onTouchStart={(e) => {
          touchStartX.current = e.targetTouches[0].clientX;
          touchEndX.current = e.targetTouches[0].clientX;
        }}
        onTouchMove={(e) => {
          touchEndX.current = e.targetTouches[0].clientX;
        }}
        onTouchEnd={() => {
          const diff = touchStartX.current - touchEndX.current;
          if (diff > 50) {
            setSlideIndex(1); // Swipe left -> Next slide
          } else if (diff < -50) {
            setSlideIndex(0); // Swipe right -> Prev slide
          }
        }}
      >
        <div 
          className="flex w-[200%]"
          style={{ 
            transform: `translateX(-${slideIndex * 50}%)`,
            transition: 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* SLIDE 1: INTRO ONBOARDING (Logo at top, image in middle, text at bottom on beige bg) */}
          <div className="w-1/2 flex flex-col justify-start min-h-screen relative p-0 bg-brand-cream overflow-hidden z-10">
            {/* Top Logo & App Title: Left-aligned and above the image */}
            <div className="pt-8 px-6 pb-2 flex items-center gap-3 bg-brand-cream relative z-10">
              <Logo size={42} className="text-brand-blue" />
              <div>
                <h1 className="text-xl font-black tracking-tight leading-none text-brand-blue">Phylab</h1>
                <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest text-brand-orange mt-1 block">
                  Phòng thí nghiệm vật lý tương tác
                </span>
              </div>
            </div>

            {/* Clean middle image - occupies around 50% - 54% of screen height, shifted down to middle */}
            <div className="w-full h-[50vh] sm:h-[54vh] overflow-hidden relative z-0 border-y border-brand-orange/10 my-6 shadow-xs">
              <img
                src="/login_img.png"
                alt="Physics Lab Hero"
                className="w-full h-full object-cover select-none"
              />
            </div>

            {/* Intro content below image */}
            <div className="flex-1 flex flex-col justify-center gap-8 p-6 pb-16 bg-brand-cream relative z-10 text-center">
              <div className="space-y-4">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-brand-blue">
                  Học Vật Lý Tương Tác 3D
                </h2>
                <p className="text-sm sm:text-base font-bold text-brand-blue/70 leading-relaxed max-w-sm sm:max-w-md mx-auto">
                  Trải nghiệm các bài thực hành ảo lý thú ngay trên điện thoại di động. Đo đạc số liệu chính xác và nhận phản hồi phân tích thông minh từ trợ lý AI.
                </p>
              </div>

              {/* CTA Button */}
              <div className="w-full">
                <button
                  onClick={() => setSlideIndex(1)}
                  className="w-full py-4 bg-gradient-to-r from-brand-orange to-[#C35F14] hover:from-[#E27C27] hover:to-[#B55210] text-white text-xs sm:text-sm font-black rounded-2xl shadow-[0_4px_12px_rgba(213,106,23,0.22)] flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  Khám phá ngay &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* SLIDE 2: LOGIN FORM (Taller form layout, no top image) */}
          <div className="w-1/2 p-5 sm:p-7 pb-16 flex flex-col justify-between min-h-screen relative bg-brand-cream">
            {/* Back button */}
            <div className="absolute top-5 left-5 z-20">
              <button
                onClick={() => setSlideIndex(0)}
                className="text-brand-blue/70 hover:text-brand-orange hover:bg-brand-orange/10 p-2 rounded-full transition-all cursor-pointer"
                title="Quay lại"
              >
                <ChevronLeft className="w-6 h-6 stroke-[3]" />
              </button>
            </div>

            {/* Middle Login Form Group: Centered in the space */}
            <div className="flex-1 flex flex-col justify-center py-6 w-full">
              {/* Centered Logo Group & Welcome tagline */}
              <div className="flex flex-col items-center text-center gap-3 mb-8 w-full pt-6">
                <div className="flex items-center gap-2.5">
                  <Logo size={42} />
                  <div className="text-left">
                    <h1 className="text-xl font-black tracking-tight leading-none text-brand-blue">Phylab</h1>
                    <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest text-brand-orange mt-1 block">
                      Phòng thí nghiệm vật lý tương tác
                    </span>
                  </div>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-brand-blue leading-tight mt-2 min-h-[28px] inline-flex items-center justify-center">
                  <span>{welcomeText}</span>
                  <span className="w-0.5 h-5 bg-brand-orange ml-1 inline-block animate-[pulse_1s_infinite]"></span>
                </h2>
              </div>

              {/* Tabs for password, face */}
              <div className="grid grid-cols-2 gap-1.5 p-1.5 mb-10 bg-brand-cream/80 rounded-2xl border border-brand-orange/15 shadow-inner">
                <button
                  onClick={() => { setLoginMode("password"); setErrorMsg(""); }}
                  className={`py-4 px-1 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMode === "password"
                      ? "bg-brand-orange text-white shadow-[0_4px_12px_rgba(213,106,23,0.25)] border-transparent"
                      : "bg-transparent text-brand-blue/70 hover:text-brand-orange border-transparent"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" /> Mật khẩu
                </button>
                <button
                  onClick={() => { setLoginMode("face"); setErrorMsg(""); }}
                  className={`py-4 px-1 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMode === "face"
                      ? "bg-brand-orange text-white shadow-[0_4px_12px_rgba(213,106,23,0.25)] border-transparent"
                      : "bg-transparent text-brand-blue/70 hover:text-brand-orange hover:bg-brand-orange/5 border-transparent"
                  }`}
                >
                  <Camera className="w-4 h-4" /> Face ID
                </button>
              </div>

              {/* Tab Content */}
              <div className="min-h-[290px] flex flex-col justify-center">
                {success ? (
                  <div className="flex flex-col items-center justify-center py-6 animate-[fadeIn_0.4s_ease-out]">
                    <div className="w-16 h-16 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-lg mb-4 animate-bounce">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                    <h3 className="text-lg font-black text-brand-blue">Xác thực tài khoản thành công!</h3>
                    <p className="text-xs font-bold text-brand-blue/60 mt-1.5">Xin chào học sinh: {studentName}</p>
                  </div>
                ) : loginMode === "password" ? (
                  <form onSubmit={handlePasswordLogin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-black text-brand-blue/80">Tên đăng nhập hoặc Email</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/45">
                          <Mail className="w-4 h-4" />
                        </span>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-11 pr-3 py-4 rounded-xl border border-brand-orange/20 focus:border-brand-orange focus:bg-white outline-none text-xs sm:text-sm font-bold bg-white/80 focus:ring-4 focus:ring-brand-orange/10 transition-all placeholder-brand-blue/30"
                          placeholder="ví dụ: phylabhackaithon@gmail.com"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-black text-brand-blue/80">Mật khẩu</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/45">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-11 pr-11 py-4 rounded-xl border border-brand-orange/20 focus:border-brand-orange focus:bg-white outline-none text-xs sm:text-sm font-bold bg-white/80 focus:ring-4 focus:ring-brand-orange/10 transition-all placeholder-brand-blue/30"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-blue/50 hover:text-brand-orange transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-brand-blue/70 pt-0.5">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 rounded border-brand-orange/30 text-brand-orange focus:ring-brand-orange/25 focus:ring-offset-0 accent-brand-orange"
                          defaultChecked 
                        />
                        <span>Ghi nhớ</span>
                      </label>
                      <a href="#" className="hover:text-brand-orange transition-colors">Quên mật khẩu?</a>
                    </div>

                    {errorMsg && (
                      <div className="bg-red-50 text-red-700 p-2.5 rounded-lg text-[10px] font-bold border border-red-200 animate-[fadeIn_0.3s_ease-out]">
                        {errorMsg}
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      className="w-full py-4.5 bg-gradient-to-r from-brand-orange to-[#C35F14] hover:from-[#E27C27] hover:to-[#B55210] text-white text-sm sm:text-base font-black rounded-xl shadow-[0_4px_12px_rgba(213,106,23,0.22)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    >
                      Đăng nhập
                    </button>
                  </form>
                ) : (
                  renderEkycUi(true)
                )}
              </div>
 
            </div>

          </div>
        </div>

        {/* Fixed Dots Indicators at the absolute bottom center */}
        <div className="absolute bottom-6 inset-x-0 flex justify-center z-30 pointer-events-none">
          <div className="flex gap-2.5 bg-brand-cream/60 backdrop-blur-md px-3.5 py-2 rounded-full border border-brand-orange/10 shadow-xs pointer-events-auto">
            <button
              onClick={() => setSlideIndex(0)}
              className={`h-2 rounded-full cursor-pointer transition-all duration-[400ms] ease-out ${
                slideIndex === 0 ? "w-6 bg-brand-orange" : "w-2 bg-brand-blue/20 hover:bg-brand-orange/40"
              }`}
              title="Trang giới thiệu"
            />
            <button
              onClick={() => setSlideIndex(1)}
              className={`h-2 rounded-full cursor-pointer transition-all duration-[400ms] ease-out ${
                slideIndex === 1 ? "w-6 bg-brand-orange" : "w-2 bg-brand-blue/20 hover:bg-brand-orange/40"
              }`}
              title="Trang đăng nhập"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
