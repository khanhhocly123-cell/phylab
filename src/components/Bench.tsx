/* eslint-disable react-hooks/refs */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, RotateCcw, Sparkles, Volume2, Info, HelpCircle, 
  AlertCircle, CheckCircle, Table, Power, RefreshCw, Unplug,
  Send
} from "lucide-react";
import { ExperimentSpec } from "@/lib/types";
import { simulateFreeFall } from "@/engine/physics/freeFall";
import { simulateInclinedPlane } from "@/engine/physics/inclinedPlane";
import Latex from "./Latex";
import DataBook from "./DataBook";

// Modularized Instrument Components from dungcuthinghiem
import Stand from "./dungcuthinghiem/Stand";
import Electromagnet from "./dungcuthinghiem/Electromagnet";
import Photogate from "./dungcuthinghiem/Photogate";
import TimerEMC964 from "./dungcuthinghiem/TimerEMC964";
import SteelBall from "./dungcuthinghiem/SteelBall";
import InclinedRamp from "./dungcuthinghiem/InclinedRamp";
import Ruler from "./dungcuthinghiem/Ruler";

interface BenchProps {
  spec: ExperimentSpec;
  studentName: string;
  onMeasureSuccess: (s: number, t: number) => void;
  onOpenTheory: () => void;
  measures: Array<{ s: number; t: number }>;
  onClearMeasures: () => void;
  onSubmitReport: (score: number) => void;
  measuredD: number; // Measured ball diameter (in meters) from Prelab caliper
}

const renderInstrumentIcon = (id: string) => {
  switch (id) {
    case "stand":
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-brand-blue stroke-[2]">
          <rect x="5" y="18" width="14" height="3" rx="1" className="fill-slate-400 stroke-brand-blue" />
          <line x1="12" y1="3" x2="12" y2="18" className="stroke-slate-500" />
        </svg>
      );
    case "magnet":
    case "electromagnet":
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-brand-blue stroke-[2]">
          <rect x="6" y="8" width="12" height="8" rx="2" className="fill-brand-orange/20 stroke-brand-orange" />
          <rect x="9" y="16" width="6" height="4" className="fill-slate-800 stroke-slate-900" />
          <circle cx="12" cy="5" r="2" className="fill-brand-yellow stroke-brand-blue" />
        </svg>
      );
    case "photogate":
    case "gateE":
    case "gateF":
    case "photogate-e":
    case "photogate-f":
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-brand-blue stroke-[2]">
          <path d="M 6 6 L 6 18 L 18 18 L 18 14 L 14 14 L 14 10 L 18 10 L 18 6 Z" className="fill-slate-800 stroke-slate-950" />
          <circle cx="10" cy="10" r="1.5" className="fill-red-500 stroke-none" />
          <circle cx="10" cy="14" r="1.5" className="fill-emerald-500 stroke-none" />
        </svg>
      );
    case "timer":
    case "timer-mc964":
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-brand-blue stroke-[2]">
          <rect x="3" y="4" width="18" height="16" rx="2" className="fill-slate-950 stroke-brand-blue" />
          <rect x="6" y="7" width="12" height="6" rx="1" className="fill-red-950/40 stroke-red-600" />
          <line x1="8" y1="16" x2="10" y2="16" className="stroke-slate-400" />
          <line x1="14" y1="16" x2="16" y2="16" className="stroke-slate-400" />
        </svg>
      );
    case "ball":
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-brand-blue stroke-[2]">
          <circle cx="12" cy="12" r="7" className="fill-slate-300 stroke-brand-blue" />
          <path d="M 9 9 Q 12 11 15 9" className="stroke-white/80 stroke-[1.5]" />
        </svg>
      );
    case "ramp":
    case "inclined-plane":
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-brand-blue stroke-[2]">
          <path d="M 4 18 L 20 18 L 20 8 Z" className="fill-slate-200/50 stroke-brand-blue" />
          <line x1="4" y1="18" x2="20" y2="8" className="stroke-brand-orange stroke-[3]" />
        </svg>
      );
    default:
      return <Sparkles className="w-5 h-5" />;
  }
};

export default function Bench({ 
  spec, 
  studentName, 
  onMeasureSuccess, 
  onOpenTheory,
  measures,
  onClearMeasures,
  onSubmitReport,
  measuredD
}: BenchProps) {
  const isFreeFall = spec.id === "do-gia-toc-roi-tu-do";

  // Active sub-lab for Lab 6 (Đo vận tốc trung bình / Vận tốc tức thời)
  const [subLab, setSubLab] = useState<"average" | "instantaneous">("average");

  // Assembly & Physics parameters for Lab 6
  const [screwBalanced, setScrewBalanced] = useState(false);
  const [magnetPower, setMagnetPower] = useState(false);
  const [isSwaying, setIsSwaying] = useState(false);
  const [swayPhase, setSwayPhase] = useState(0);
  const [ballPlaced, setBallPlaced] = useState(false);

  // Timer states
  const [timerFace, setTimerFace] = useState<"front" | "back">("front");
  const [timerPower, setTimerPower] = useState(false);
  const [timerMode, setTimerMode] = useState<"A" | "B" | "A+B" | "A<->B" | "T">("A");
  const [timerReset, setTimerReset] = useState(true);
  const [timerScale, setTimerScale] = useState<"fine" | "coarse">("fine");

  // Common Placement State
  const [placed, setPlaced] = useState<Record<string, boolean>>({
    stand: false,
    magnet: false,
    photogate: false,
    timer: false,
    ball: false,
    // For inclined plane
    ramp: false,
    gateE: false,
    gateF: false,
    ruler: false,
  });

  const [activeDragKey, setActiveDragKey] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>(() => {
    const isFF = spec.id === "do-gia-toc-roi-tu-do";
    if (isFF) {
      return [{ role: "assistant", content: "Chào em! Anh là trợ lý ảo Phylab. Hãy tiến hành lắp ráp khung đỡ đứng tự do để bắt đầu bài thực hành đo gia tốc nhé!" }];
    } else {
      return [{ role: "assistant", content: "Chào em! Anh là trợ lý ảo Phylab. Chúng ta sẽ cùng nhau thực hành đo Vận tốc Trung bình trước nhé! Hãy kéo giá đỡ và máng nghiêng ra bàn lắp ráp, sau đó vặn chặt vít chân đế thăng bằng nhé!" }];
    }
  });
  const [chatLoading, setChatLoading] = useState(false);
  const [ballPos, setBallPos] = useState({ left: 0, top: 0 });

  // Physics Simulation State
  const [isFalling, setIsFalling] = useState(false);
  const [selectedS, setSelectedS] = useState(0.40); // Free fall s (meters)
  const [selectedAngle, setSelectedAngle] = useState(15); // Inclined plane angle (degrees)
  
  // Directly bind ball diameter state to the prelab measured caliper value!
  const [selectedEF, setSelectedEF] = useState(measuredD);
  const [prevMeasuredD, setPrevMeasuredD] = useState(measuredD);
  if (measuredD !== prevMeasuredD) {
    setPrevMeasuredD(measuredD);
    setSelectedEF(measuredD);
  }

  const [selectedRampLength, setSelectedRampLength] = useState(0.30); // Distance between gates s (meters)
  const [timeLcd, setTimeLcd] = useState("0.000");
  const [lastTimeMeasured, setLastTimeMeasured] = useState(0);
  const [toast, setToast] = useState<{ title: string; msg: string; type: "success" | "error" | "info" } | null>(null);

  // DOM Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const laserRef = useRef<HTMLDivElement>(null);

  // Toast Helper
  const showToast = (title: string, msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ title, msg, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Canvas size and physics cable state
  const [canvasWidth, setCanvasWidth] = useState(540);
  const [canvasHeight, setCanvasHeight] = useState(500);
  const [swayTime, setSwayTime] = useState(0);
  const vibrationRef = useRef(0);
  const swayAmpRef = useRef(0);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Dynamic layout coordinates
  const standLeft = canvasWidth < 460 ? 55 : 90;
  const magnetLeft = standLeft - 10;
  const photogateLeft = standLeft - 40;
  const ballLeft = isFreeFall ? standLeft + 8 : standLeft + 15;
  const timerRight = canvasWidth < 460 ? 10 : 20;
  const timerWidth = canvasWidth < 460 ? 140 : 165;
  const timerHeight = canvasWidth < 460 ? 110 : 130;

  const socketAX = canvasWidth - timerRight - timerWidth + (timerWidth === 140 ? 40 : 45);
  const socketBX = canvasWidth - timerRight - timerWidth + (timerWidth === 140 ? 100 : 115);
  const socketY = canvasHeight - 35;

  // Resize listener
  useEffect(() => {
    if (!canvasRef.current) return;
    const handleResize = () => {
      if (canvasRef.current) {
        setCanvasWidth(canvasRef.current.clientWidth);
        setCanvasHeight(canvasRef.current.clientHeight);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cable & plumb sway physics loop
  useEffect(() => {
    let animId: number;
    const tick = () => {
      setSwayTime(t => t + 0.04);
      if (vibrationRef.current > 0.01) vibrationRef.current *= 0.94;
      else vibrationRef.current = 0;

      if (swayAmpRef.current > 0.01) swayAmpRef.current *= 0.96;
      else swayAmpRef.current = 0;

      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Plumb bob sway logic when angle changes (settles in exactly 3 seconds)
  useEffect(() => {
    if (isFreeFall) return;
    const timer = setTimeout(() => {
      setIsSwaying(true);
      setSwayPhase(1.0);
    }, 0);
    const interval = setInterval(() => {
      setSwayPhase(prev => {
        if (prev <= 0.05) {
          clearInterval(interval);
          setIsSwaying(false);
          return 0;
        }
        return prev * 0.74;
      });
    }, 300);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [selectedAngle, isFreeFall]);

  const [isSlidingGate, setIsSlidingGate] = useState(false);

  const handleSlideStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isFalling) return;
    setIsSlidingGate(true);
    swayAmpRef.current = 1.0;
  };

  useEffect(() => {
    if (!isSlidingGate || !canvasRef.current) return;

    const handleMove = (clientY: number) => {
      if (!canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const y = clientY - canvasRect.top;
      
      if (isFreeFall) {
        let targetY = y;
        if (targetY < 125) targetY = 125;
        if (targetY > 300) targetY = 300;

        const percentage = (targetY - 125) / (300 - 125);
        const calculatedS = 0.10 + percentage * 0.70;
        setSelectedS(calculatedS);
      } else {
        // Adjust distance between photogates
        let targetY = y;
        if (targetY < 200) targetY = 200;
        if (targetY > 340) targetY = 340;

        const percentage = (targetY - 200) / (340 - 200);
        const calculatedS = 0.10 + percentage * 0.50; // 10cm to 60cm
        setSelectedRampLength(calculatedS);
      }
      swayAmpRef.current = Math.min(swayAmpRef.current + 0.08, 1.6);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        handleMove(e.touches[0].clientY);
      }
    };

    const handleStop = () => {
      setIsSlidingGate(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleStop);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleStop);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleStop);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleStop);
    };
  }, [isSlidingGate, isFreeFall]);

  // Cabling connection states
  const [connections, setConnections] = useState<Record<string, string>>({
    magnet: "",
    photogate: "",
    gateE: "",
    gateF: "",
  });
  const [activeWiringSource, setActiveWiringSource] = useState<string | null>(null);

  const handleSocketClick = (source: string) => {
    if (isFalling) return;
    
    // Toggle disconnect if already connected
    if (connections[source]) {
      setConnections(prev => ({ ...prev, [source]: "" }));
      showToast("Đã rút dây", `Đã rút giắc cắm tín hiệu của thiết bị ${source.toUpperCase()}.`, "info");
      return;
    }

    setActiveWiringSource(source);
    showToast("Nối dây", `Đang chọn dây từ ${source.toUpperCase()}. Hãy lật mặt sau đồng hồ MC964 để cắm dây vào Cổng A hoặc Cổng B.`);
  };

  const handlePortClick = (port: string) => {
    if (!activeWiringSource) return;

    // Check if port is already taken
    const isTaken = Object.values(connections).includes(port);
    if (isTaken) {
      showToast("Cổng đã cắm", `Cổng ${port} đã có dây cắm rồi! Vui lòng rút dây cũ trước.`, "error");
      return;
    }

    const newConnections = { ...connections, [activeWiringSource]: port };
    setConnections(newConnections);
    setActiveWiringSource(null);
    vibrationRef.current = 0.6; // Trigger wire vibration

    // Validate wiring
    if (isFreeFall) {
      if (newConnections.magnet && newConnections.photogate) {
        if (newConnections.magnet === "A" && newConnections.photogate === "B") {
          showToast("Cắm dây thành công", "Đã kết nối tín hiệu chính xác tới Cổng A và Cổng B!", "success");
        } else {
          showToast("Lắp sai cổng tín hiệu", "Lắp sai cổng! Nam châm điện phải nối với Cổng A, Cổng quang phải nối với Cổng B.", "error");
        }
      } else {
        showToast("Cắm dây thành công", `Đã kết nối tín hiệu thành công tới Cổng ${port}!`);
      }
    } else {
      if (subLab === "average") {
        if (newConnections.gateE && newConnections.gateF) {
          if (newConnections.gateE === "A" && newConnections.gateF === "B") {
            showToast("Cắm dây thành công", "Đã kết nối tín hiệu chính xác tới Cổng A và Cổng B!", "success");
          } else {
            showToast("Lắp sai cổng tín hiệu", "Lắp sai cổng! Cổng quang E phải nối với Cổng A, Cổng quang F phải nối với Cổng B.", "error");
          }
        } else {
          showToast("Cắm dây thành công", `Đã kết nối tín hiệu thành công tới Cổng ${port}!`);
        }
      } else {
        showToast("Cắm dây thành công", `Đã kết nối tín hiệu thành công tới Cổng ${port}!`);
      }
    }
  };

  // Derive progress, assistant text, and status color/text dynamically
  let progress = 0;
  let assistantText = "";
  let statusColor = "bg-rose-500";
  let statusText = "";

  if (isFreeFall) {
    const ffWired = connections.magnet === "A" && connections.photogate === "B";

    if (!placed.stand) {
      assistantText = spec.steps[0].assistant;
      statusText = "Lắp ráp: Đang đợi gá khung";
      statusColor = "bg-rose-500";
      progress = 0;
    } else if (!placed.magnet) {
      assistantText = spec.steps[1].assistant;
      statusText = "Lắp ráp: Cần kẹp nam châm điện";
      statusColor = "bg-amber-500 animate-pulse";
      progress = 20;
    } else if (!placed.photogate) {
      assistantText = spec.steps[2].assistant;
      statusText = "Lắp ráp: Gá thêm cổng quang điện";
      statusColor = "bg-amber-500";
      progress = 40;
    } else if (!placed.timer) {
      assistantText = spec.steps[3].assistant;
      statusText = "Lắp ráp: Chưa kết nối đồng hồ";
      statusColor = "bg-amber-500";
      progress = 60;
    } else if (!ffWired) {
      assistantText = "Đồng hồ MC964 đã được cấp nguồn! Hãy nối dây tín hiệu: Nhấp vào chốt socket trên Nam châm điện cắm vào Cổng A (bắt đầu đếm), và giắc Cổng quang điện cắm vào Cổng B (dừng đếm).";
      statusText = "Lắp ráp: Đợi nối dây tín hiệu";
      statusColor = "bg-amber-500 animate-pulse";
      progress = 70;
    } else if (!placed.ball) {
      assistantText = "Dây cáp đã cắm chính xác! Giờ hãy gá chiếc 'Trụ thép cảm ứng' dính cố định vào nam châm điện nhé.";
      statusText = "Lắp ráp: Đợi treo trụ thép";
      statusColor = "bg-amber-500";
      progress = 85;
    } else {
      assistantText = spec.steps[5].assistant;
      statusText = "Sẵn sàng: Hệ thống hoàn chỉnh";
      statusColor = "bg-emerald-500 animate-pulse";
      progress = 100;
    }
  } else {
    // Inclined plane assembly sequence
    const planeWired = subLab === "average"
      ? (connections.gateE === "A" && connections.gateF === "B")
      : (connections.gateE === "A" && !connections.gateF) || (connections.gateE === "B" && !connections.gateF) || (connections.gateF === "A" && !connections.gateE) || (connections.gateF === "B" && !connections.gateE);

    if (!placed.stand) {
      assistantText = "Lắp ráp: Đưa cây đỡ và thanh ray ra bàn. Đừng quên vặn vít cân bằng ở chân đế để tránh sai lệch số liệu!";
      statusText = "Lắp ráp: Đợi gá cột đứng";
      statusColor = "bg-rose-500";
      progress = 0;
    } else if (!screwBalanced) {
      assistantText = "Hãy nhấn nút 'Vặn vít cân bằng' ở đế thép của cột đứng để cân đối lại khung đỡ. Nếu không số liệu sẽ bị sai ma sát!";
      statusText = "Lắp ráp: Cần vặn vít cân bằng";
      statusColor = "bg-amber-500 animate-pulse";
      progress = 15;
    } else if (!placed.ramp) {
      assistantText = "Tuyệt vời! Bây giờ, hãy kéo thả 'Máng nghiêng' kẹp chắc chắn lên cột thép đứng.";
      statusText = "Lắp ráp: Cần kẹp máng nghiêng";
      statusColor = "bg-amber-500";
      progress = 30;
    } else if (!placed.magnet) {
      assistantText = "Kéo 'Nam châm điện' kẹp cố định ở đầu trên của máng nghiêng để làm chốt giữ bi.";
      statusText = "Lắp ráp: Gắn nam châm giữ bi";
      statusColor = "bg-amber-500";
      progress = 45;
    } else if (!placed.gateE) {
      assistantText = "Hãy lắp 'Cổng quang E' vào phần trên của thanh ray nằm ngang.";
      statusText = "Lắp ráp: Cần gắn Cổng quang E";
      statusColor = "bg-amber-500";
      progress = 60;
    } else if (!placed.gateF) {
      assistantText = "Tiếp theo, lắp 'Cổng quang F' nằm thấp hơn trên thanh ray.";
      statusText = "Lắp ráp: Cần gắn Cổng quang F";
      statusColor = "bg-amber-500";
      progress = 75;
    } else if (!placed.timer) {
      assistantText = "Cần đặt 'Đồng hồ điện tử EMC964' lên bàn để bắt đầu cắm cáp tín hiệu.";
      statusText = "Lắp ráp: Đợi đồng hồ EMC964";
      statusColor = "bg-amber-500";
      progress = 85;
    } else if (!timerPower) {
      assistantText = "Đồng hồ chưa bật! Hãy lật mặt sau đồng hồ, gạt công tắc nguồn ON.";
      statusText = "Lắp ráp: Đợi bật nguồn đồng hồ";
      statusColor = "bg-amber-500 animate-pulse";
      progress = 90;
    } else if (!planeWired) {
      if (subLab === "average") {
        assistantText = "Đo vận tốc trung bình cần 2 cổng quang: Lật mặt sau đồng hồ, cắm cáp cổng quang E vào lỗ A, cổng quang F vào lỗ B.";
      } else {
        assistantText = "Đo vận tốc tức thời chỉ cần 1 cổng quang: Hãy rút dây nối của cổng quang F ra khỏi đồng hồ để tránh đếm sai chế độ.";
      }
      statusText = "Lắp ráp: Đợi nối cáp đúng chuẩn";
      statusColor = "bg-amber-500 animate-pulse";
      progress = 92;
    } else if (subLab === "average" && timerMode !== "A<->B") {
      assistantText = "Hãy lật ra mặt trước đồng hồ, xoay núm chế độ CHẾ ĐỘ về nấc 'A ↔ B' để bắt đầu đo khoảng thời gian từ cổng E đến F.";
      statusText = "Lắp ráp: Chọn sai chế độ Mode";
      statusColor = "bg-amber-500 animate-pulse";
      progress = 95;
    } else if (subLab === "instantaneous" && timerMode !== "A" && timerMode !== "B") {
      assistantText = "Hãy lật ra mặt trước đồng hồ, xoay núm chế độ về nấc 'A' hoặc 'B' (tương ứng với cổng quang đang cắm) để đo thời gian bi che cổng.";
      statusText = "Lắp ráp: Chọn sai chế độ Mode";
      statusColor = "bg-amber-500 animate-pulse";
      progress = 95;
    } else if (!ballPlaced) {
      assistantText = "Hãy bật công tắc nam châm điện giữ bi (ở đầu máng), sau đó thả viên bi sắt kẹp dính vào nam châm.";
      statusText = "Lắp ráp: Đợi nạp bi thép";
      statusColor = "bg-amber-500";
      progress = 97;
    } else if (!timerReset) {
      assistantText = "Đồng hồ chưa reset! Hãy nhấn nút Reset màu đỏ trên mặt đồng hồ để đưa LCD về 0.000 trước khi nhả bi.";
      statusText = "Lắp ráp: Đồng hồ chưa Reset";
      statusColor = "bg-amber-500 animate-pulse";
      progress = 99;
    } else {
      assistantText = "Hệ thống sẵn sàng! Viên bi sắt đã được nạp. Nhấn nút Nhả bi để đo.";
      statusText = "Sẵn sàng: Hệ thống hoàn chỉnh";
      statusColor = "bg-emerald-500 animate-pulse";
      progress = 100;
    }
  }

  // Pre-recorded static audio map to prevent live API lag/errors
  const PRE_RECORDED_AUDIO_MAP: Record<string, string> = {
    // Free Fall
    "Khởi đầu tốt đẹp! Đầu tiên, hãy gắp 'Giá đỡ kim loại' ở khay bên trái rồi thả vào ô vuông đứt nét của bàn thí nghiệm nhé.": "ff_step1.mp3",
    "Tuyệt vời! Bây giờ, hãy kẹp chiếc 'Nam châm điện' lên đầu phía trên của cột thép đứng.": "ff_step2.mp3",
    "Sắp xong phần cơ rồi! Hãy lắp gá 'Cổng quang điện' vào phần thân giữa của thước đo.": "ff_step3.mp3",
    "Tuyệt quá! Tiếp tục đặt chiếc 'Đồng hồ MC964' lên góc phải bàn để nối thông đường truyền tín hiệu dây cáp.": "ff_step4.mp3",
    "Đồng hồ MC964 đã được cấp nguồn! Hãy nối dây tín hiệu: Nhấp vào chốt socket trên Nam châm điện cắm vào Cổng A (bắt đầu đếm), và giắc Cổng quang điện cắm vào Cổng B (dừng đếm).": "ff_wire.mp3",
    "Dây cáp đã cắm chính xác! Giờ hãy gá chiếc 'Trụ thép cảm ứng' dính cố định vào nam châm điện nhé.": "ff_ball.mp3",
    "Lắp ráp hoàn hảo! Hãy trượt dọc cổng quang điện để thay đổi s, sau đó nhấn nút 'NHẢ NAM CHÂM' để chạy thí nghiệm.": "ff_step6.mp3",

    // Inclined Plane
    "Lắp ráp: Đưa cây đỡ và thanh ray ra bàn. Đừng quên vặn vít cân bằng ở chân đế để tránh sai lệch số liệu!": "plane_stand.mp3",
    "Hãy nhấn nút 'Vặn vít cân bằng' ở đế thép của cột đứng để cân đối lại khung đỡ. Nếu không số liệu sẽ bị sai ma sát!": "plane_screw.mp3",
    "Tuyệt vời! Bây giờ, hãy kéo thả 'Máng nghiêng' kẹp chắc chắn lên cột thép đứng.": "plane_ramp.mp3",
    "Kéo 'Nam châm điện' kẹp cố định ở đầu trên của máng nghiêng để làm chốt giữ bi.": "plane_magnet.mp3",
    "Hãy lắp 'Cổng quang E' vào phần trên của thanh ray nằm ngang.": "plane_gateE.mp3",
    "Tiếp theo, lắp 'Cổng quang F' nằm thấp hơn trên thanh ray.": "plane_gateF.mp3",
    "Cần đặt 'Đồng hồ điện tử EMC964' lên bàn để bắt đầu cắm cáp tín hiệu.": "plane_timer.mp3",
    "Đồng hồ chưa bật! Hãy lật mặt sau đồng hồ, gạt công tắc nguồn ON.": "plane_power.mp3",
    "Đo vận tốc trung bình cần 2 cổng quang: Lật mặt sau đồng hồ, cắm cáp cổng quang E vào lỗ A, cổng quang F vào lỗ B.": "plane_wired_average.mp3",
    "Đo vận tốc tức thời chỉ cần 1 cổng quang: Hãy rút dây nối của cổng quang F ra khỏi đồng hồ để tránh đếm sai chế độ.": "plane_wired_instantaneous.mp3",
    "Hãy lật ra mặt trước đồng hồ, xoay núm chế độ CHẾ ĐỘ về nấc 'A ↔ B' để bắt đầu đo khoảng thời gian từ cổng E đến F.": "plane_mode_average.mp3",
    "Hãy lật ra mặt trước đồng hồ, xoay núm chế độ về nấc 'A' hoặc 'B' (tương ứng với cổng quang đang cắm) để đo thời gian bi che cổng.": "plane_mode_instantaneous.mp3",
    "Hãy bật công tắc nam châm điện giữ bi (ở đầu máng), sau đó thả viên bi sắt kẹp dính vào nam châm.": "plane_ball.mp3",
    "Đồng hồ chưa reset! Hãy nhấn nút Reset màu đỏ trên mặt đồng hồ để đưa LCD về 0.000 trước khi nhả bi.": "plane_reset.mp3",
    "Hệ thống sẵn sàng! Viên bi sắt đã được nạp. Nhấn nút Nhả bi để đo.": "plane_ready.mp3",
  };

  // TTS Speech Synthesis
  const speakText = async (text: string) => {
    // 1. Cancel browser speechSynthesis
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    
    // 2. Stop any active HTML5 audio playback
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
      setAudioPlaying(false);
    }

    // 3. Play pre-recorded static audio if available
    const preRecordedFile = PRE_RECORDED_AUDIO_MAP[text];
    if (preRecordedFile) {
      try {
        setAudioPlaying(true);
        const audio = new Audio(`/audio/${preRecordedFile}`);
        activeAudioRef.current = audio;
        
        audio.onended = () => {
          setAudioPlaying(false);
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
          }
        };
        
        audio.onerror = () => {
          console.warn("Pre-recorded audio playback error, falling back to Web Speech Synthesis");
          fallbackSpeak(text);
        };
        
        await audio.play();
        return; // Bypassed API call successfully
      } catch (err) {
        console.warn("Pre-recorded audio play failed, falling back to live API", err);
      }
    }

    try {
      setAudioPlaying(true);
      
      const res = await fetch("/api/vnpt/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      
      if (!res.ok) throw new Error("TTS server error");
      const data = await res.json();
      
      if (data.audioLink) {
        // Play VNPT SmartVoice Audio
        const audio = new Audio(data.audioLink);
        activeAudioRef.current = audio;
        
        audio.onended = () => {
          setAudioPlaying(false);
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
          }
        };
        
        audio.onerror = () => {
          console.warn("VNPT Audio playback error, falling back to Web Speech Synthesis");
          fallbackSpeak(text);
        };
        
        await audio.play();
      } else {
        // Fallback to browser Speech Synthesis if mock or no link
        fallbackSpeak(text);
      }
    } catch (err) {
      console.warn("VNPT TTS API failed, falling back to Web Speech Synthesis", err);
      fallbackSpeak(text);
    }
  };

  const fallbackSpeak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 1.05;
      utterance.onstart = () => setAudioPlaying(true);
      utterance.onend = () => setAudioPlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setAudioPlaying(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput.trim();
    setChatInput("");
    
    const updatedMessages = [...chatMessages, { role: "user" as const, content: userText }];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    try {
      const res = await fetch("/api/vnpt/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) throw new Error("Chatbot server response error");
      const data = await res.json();
      
      const reply = data.message || "Xin lỗi em, hiện tại kết nối đến máy chủ bot đang bận. Hãy thử lại sau nhé!";
      setChatMessages(prev => [...prev, { role: "assistant" as const, content: reply }]);
      
      speakText(reply);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        { role: "assistant" as const, content: "Lỗi kết nối Trợ lý ảo. Hãy thử lại." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Speak guide text out loud when it changes
  useEffect(() => {
    if (progress > 0 && assistantText) {
      speakText(assistantText);
    }
  }, [assistantText, progress]);

  // Auto-assemble helper
  const handleAutoAssemble = () => {
    const fullPlacement = isFreeFall
      ? { stand: true, magnet: true, photogate: true, timer: true, ball: true, ramp: false, gateE: false, gateF: false, ruler: false }
      : { stand: true, ramp: true, magnet: true, gateE: true, gateF: true, timer: true, ball: true, ruler: true, photogate: false };
    
    setPlaced(fullPlacement);
    setScrewBalanced(true);
    setTimerPower(true);
    setTimerReset(true);
    setMagnetPower(true);
    setBallPlaced(true);

    if (isFreeFall) {
      setConnections({ magnet: "A", photogate: "B", gateE: "", gateF: "" });
    } else {
      if (subLab === "average") {
        setConnections({ magnet: "", photogate: "", gateE: "A", gateF: "B" });
        setTimerMode("A<->B");
      } else {
        setConnections({ magnet: "", photogate: "", gateE: "A", gateF: "" });
        setTimerMode("A");
      }
    }
    setActiveWiringSource(null);
    showToast("Tự động lắp ráp", "Đã gá lắp, vặn vít và nối dây hoàn chỉnh đúng chuẩn!");
  };

  // Reset Assembly
  const handleResetAssembly = () => {
    setPlaced({
      stand: false,
      magnet: false,
      photogate: false,
      timer: false,
      ball: false,
      ramp: false,
      gateE: false,
      gateF: false,
      ruler: false,
    });
    setConnections({
      magnet: "",
      photogate: "",
      gateE: "",
      gateF: "",
    });
    setActiveWiringSource(null);
    setTimeLcd("0.000");
    setLastTimeMeasured(0);
    setIsFalling(false);
    setScrewBalanced(false);
    setMagnetPower(false);
    setBallPlaced(false);
    setTimerPower(false);
    setTimerReset(true);
    showToast("Đã tháo dỡ", "Đã dỡ toàn bộ thiết bị về khay chứa.", "info");
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, key: string) => {
    setActiveDragKey(key);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!activeDragKey || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= -50 && x <= canvasWidth + 50 && y >= -50 && y <= canvasHeight + 50) {
      let targetKey = activeDragKey;
      
      // Map drag spec key to state placed keys
      if (activeDragKey === "timer-mc964") {
        targetKey = "timer";
      } else if (activeDragKey === "inclined-plane" || activeDragKey === "ramp") {
        // Sets both ramp and magnet
        setPlaced(prev => ({ ...prev, ramp: true, magnet: true }));
        showToast("Lắp ráp thành công", "Đã gá lắp Máng nghiêng & Nam châm điện.");
        vibrationRef.current = 0.5;
        setActiveDragKey(null);
        return;
      } else if (activeDragKey === "photogate-e") {
        targetKey = "gateE";
      } else if (activeDragKey === "photogate-f") {
        targetKey = "gateF";
      }

      setPlaced((prev) => ({ ...prev, [targetKey]: true }));
      showToast("Lắp ráp thành công", `Đã gá lắp dụng cụ thành công.`);
      vibrationRef.current = 0.5;
    } else {
      showToast("Lắp ráp thất bại", "Vui lòng kéo thả dụng cụ vào trong bàn thí nghiệm.", "error");
    }
    setActiveDragKey(null);
  };

  // Physics Release Trigger
  const handleRelease = () => {
    if (isFalling) return;

    // Validation checks
    if (isFreeFall) {
      const ffWired = connections.magnet === "A" && connections.photogate === "B";
      if (!placed.timer || !ffWired) {
        showToast("Lỗi kết nối", "Dây cáp chưa nối đúng! Nam châm điện cắm vào Cổng A, Cổng quang cắm vào Cổng B của đồng hồ MC964.", "error");
        return;
      }
      if (!placed.ball) {
        showToast("Thiếu vật rơi", "Vui lòng gá trụ thép treo cố định vào nam châm điện trước.", "error");
        return;
      }
    } else {
      const planeWired = subLab === "average"
        ? (connections.gateE === "A" && connections.gateF === "B")
        : (connections.gateE === "A" && !connections.gateF) || (connections.gateE === "B" && !connections.gateF) || (connections.gateF === "A" && !connections.gateE) || (connections.gateF === "B" && !connections.gateE);

      if (!placed.timer || !planeWired || !timerPower) {
        showToast("Lỗi kết nối", "Đồng hồ chưa bật nguồn hoặc dây cáp chưa cắm đúng sơ đồ!", "error");
        return;
      }
      if (!ballPlaced) {
        showToast("Thiếu bi thép", "Vui lòng bật nam châm điện và đặt bi thép ở đỉnh máng nghiêng.", "error");
        return;
      }
      if (!timerReset) {
        showToast("Chưa Reset đồng hồ", "Vui lòng nhấn nút Reset đưa số đo về 0.000 trước khi thả bi.", "error");
        return;
      }
    }

    setIsFalling(true);
    setTimerReset(false);
    vibrationRef.current = 1.0; 

    const SLOWDOWN = 3; 
    let timeResult = 0;

    if (isFreeFall) {
      timeResult = simulateFreeFall(selectedS, 9.806, 0.005);
      setLastTimeMeasured(timeResult);

      let start: number | null = null;
      const initialBallTop = 122;
      const gateTargetTop = 122 + ((selectedS - 0.10) / 0.70) * (300 - 125) + 10;
      const totalPath = gateTargetTop - initialBallTop;

      const animate = (timestamp: number) => {
        if (!start) start = timestamp;
        const elapsedReal = (timestamp - start) / 1000;
        const elapsedSim = elapsedReal / SLOWDOWN;

        if (elapsedSim < timeResult) {
          const currentD = 0.5 * 9.806 * Math.pow(elapsedSim, 2);
          const ratio = Math.min(currentD / selectedS, 1);
          const currentTop = initialBallTop + ratio * totalPath;
          
          setBallPos({ left: ballLeft, top: currentTop });
          setTimeLcd(elapsedSim.toFixed(3));
          requestAnimationFrame(animate);
        } else {
          setBallPos({ left: ballLeft, top: gateTargetTop });
          if (laserRef.current) {
            laserRef.current.className = "absolute left-8 top-[18px] w-14 h-[3px] bg-emerald-500 shadow-[0_0_8px_#10b981] z-10";
          }
          setTimeLcd(timeResult.toFixed(3));
          setIsFalling(false);
          onMeasureSuccess(selectedS, timeResult);
          showToast("Đo hoàn tất", `s = ${selectedS.toFixed(2)}m | t = ${timeResult.toFixed(3)}s.`);
        }
      };
      requestAnimationFrame(animate);
    } else {
      // Inclined plane physics
      const sE = 0.30;
      const sF = sE + selectedRampLength;
      
      const simResult = simulateInclinedPlane({
        mode: timerMode,
        thetaDeg: selectedAngle,
        sE,
        sF,
        dMm: selectedEF * 1000,
        balanced: screwBalanced,
        scale: timerScale,
        withNoise: true,
      });

      let finalTime = simResult.raw || 0.001;
      if (isSwaying && simResult.valid) {
        finalTime += subLab === "average" ? 0.025 : 0.004;
      }

      setLastTimeMeasured(finalTime);
      setBallPlaced(false);
      setMagnetPower(false);

      let start: number | null = null;
      const ballMoveDuration = 0.8; 

      const animate = (timestamp: number) => {
        if (!start) start = timestamp;
        const elapsedReal = (timestamp - start) / 1000;
        const elapsedSim = elapsedReal / SLOWDOWN;

        if (elapsedSim < ballMoveDuration) {
          let currentLeft = standLeft + 15;
          let currentTop = 108;

          if (elapsedSim < 0.4) {
            // Accelerating quadratically down the slope
            const rampRatio = Math.pow(elapsedSim / 0.4, 2);
            currentLeft = standLeft + 15 + rampRatio * 100;
            currentTop = 108 + rampRatio * 120;
          } else {
            // Rolling uniformly along the horizontal rail
            const flatRatio = Math.min((elapsedSim - 0.4) / 0.4, 1);
            currentLeft = standLeft + 115 + flatRatio * 180;
            currentTop = 228;
          }

          setBallPos({ left: currentLeft, top: currentTop });
          
          if (timerMode === "A<->B" || timerMode === "A" || timerMode === "B" || timerMode === "A+B") {
            setTimeLcd(Math.min(elapsedSim, finalTime).toFixed(timerScale === "fine" ? 3 : 2));
          } else {
            setTimeLcd(timerScale === "fine" ? "0.001" : "0.01");
          }
          requestAnimationFrame(animate);
        } else {
          setBallPos({ left: standLeft + 295, top: 228 });
          if (subLab === "average") {
            if (timerMode === "A<->B") {
              setTimeLcd(simResult.display);
              onMeasureSuccess(selectedRampLength, finalTime);
            } else if (timerMode === "A" || timerMode === "B") {
              setTimeLcd(simResult.display);
              onMeasureSuccess(selectedRampLength, finalTime);
            } else {
              setTimeLcd(timerScale === "fine" ? "9.999" : "99.99");
            }
          } else {
            if (timerMode === "A" || timerMode === "B" || timerMode === "A+B") {
              setTimeLcd(simResult.display);
              onMeasureSuccess(selectedEF, finalTime);
            } else {
              setTimeLcd(timerScale === "fine" ? "9.999" : "99.99");
            }
          }
          
          setIsFalling(false);
          showToast("Đo hoàn tất", `Lượt đo thành công! Đã ghi số liệu vào sổ.`);
        }
      };
      requestAnimationFrame(animate);
    }
  };

  // Reset ball position
  const handleResetBall = () => {
    if (isFalling) return;
    const defaultZero = timerScale === "fine" ? "0.000" : "0.00";
    if (isFreeFall) {
      setBallPos({ left: ballLeft, top: 122 });
      if (ballRef.current) {
        ballRef.current.style.top = "122px";
      }
      setTimeLcd(defaultZero);
      setTimerReset(true);
      showToast("Đặt lại bi", "Sẵn sàng đo lần tiếp theo.");
    } else {
      if (magnetPower) {
        setBallPlaced(true);
        setBallPos({ left: standLeft + 15, top: 108 });
        if (ballRef.current) {
          ballRef.current.style.left = `${standLeft + 15}px`;
          ballRef.current.style.top = "108px";
        }
        setTimeLcd(defaultZero);
        setTimerReset(true);
        showToast("Nạp bi thành công", "Bi sắt đã được giữ ở đầu nam châm điện.");
      } else {
        showToast("Không giữ được bi", "Vui lòng bật công tắc Nam châm điện trước để giữ bi!", "error");
      }
    }
  };

  // Dial Mode switcher click
  const handleModeKnobClick = () => {
    if (isFalling || !timerPower) return;
    const modes: Array<"A" | "B" | "A+B" | "A<->B" | "T"> = ["A", "B", "A+B", "A<->B", "T"];
    const currentIdx = modes.indexOf(timerMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    setTimerMode(nextMode);
    setTimerReset(false);
    showToast("Thay đổi Mode", `Đồng hồ chuyển sang chế độ đo: Chế độ ${nextMode}`);
  };

  // Dial Scale switcher click
  const handleScaleKnobClick = () => {
    if (isFalling || !timerPower) return;
    const nextScale = timerScale === "fine" ? "coarse" : "fine";
    setTimerScale(nextScale);
    setTimerReset(true);
    setTimeLcd(nextScale === "fine" ? "0.000" : "0.00");
    showToast("Thay đổi Thang đo", `Thang đo chuyển sang: ${nextScale === "fine" ? "9.999s (ĐCNN 0.001s)" : "99.99s (ĐCNN 0.01s)"}`);
  };

  // Override specs passed to DataBook dynamically depending on the sub-tab (Bất biến 2)
  const dynamicSpec = {
    ...spec,
    dataBook: isFreeFall 
      ? spec.dataBook 
      : subLab === "average"
      ? {
          columns: [
            { key: "distance", label: "Khoảng cách s (m)", unit: "m", editable: true },
            { key: "time", label: "Thời gian t (s)", unit: "s", editable: false },
            { key: "result", label: "Vận tốc trung bình (m/s)", unit: "m/s", editable: true }
          ],
          resultLabel: "Vận tốc trung bình",
          resultUnit: "m/s",
          formulaHint: "v_{tb} = \\frac{s}{t}"
        }
      : {
          columns: [
            { key: "distance", label: "Đường kính bi d (m)", unit: "m", editable: true },
            { key: "time", label: "Thời gian cản t (s)", unit: "s", editable: false },
            { key: "result", label: "Vận tốc tức thời v (m/s)", unit: "m/s", editable: true }
          ],
          resultLabel: "Vận tốc tức thời",
          resultUnit: "m/s",
          formulaHint: "v = \\frac{d}{t}"
        }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full">
      {/* 1. Tool Cabinet Sidebar */}
      <aside className="order-2 lg:order-1 lg:col-span-3 flex flex-col gap-4 bg-gradient-to-br from-brand-white to-brand-cream/60 border border-brand-orange/15 rounded-2xl p-4 justify-between relative overflow-hidden shadow-[0_8px_30px_rgba(213,106,23,0.03)]">
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/20 rounded-full blur-xl"></div>
        <div className="z-10 space-y-4">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider mb-3 text-brand-blue/80">Khay dụng cụ</h2>
            <div className="space-y-2.5">
              {spec.instruments.map((inst) => {
                const isPlaced = placed[inst.id] || 
                  (inst.id === "timer-mc964" && placed.timer) ||
                  (inst.id === "timer" && placed.timer) ||
                  (inst.id === "inclined-plane" && placed.ramp) ||
                  (inst.id === "photogate-e" && placed.gateE) ||
                  (inst.id === "photogate-f" && placed.gateF) ||
                  (inst.id === "gateE" && placed.gateE) ||
                  (inst.id === "gateF" && placed.gateF) ||
                  (inst.id === "ramp" && placed.ramp) ||
                  (inst.id === "magnet" && placed.magnet);
                return (
                  <div
                    key={inst.id}
                    draggable={!isPlaced && progress >= 0}
                    onDragStart={(e) => handleDragStart(e, inst.id)}
                    className={`rounded-xl p-2.5 border transition-all flex items-center gap-3 relative group ${
                      isPlaced
                        ? "opacity-40 cursor-not-allowed border-dashed border-brand-orange/10 bg-brand-cream/30"
                        : "bg-brand-white border-brand-orange/15 hover:border-brand-orange/40 hover:shadow-[0_4px_12px_rgba(213,106,23,0.06)] cursor-grab active:scale-[0.98]"
                    }`}
                  >
                    <div className="bg-brand-cream/80 p-1 rounded-lg border border-brand-orange/10 w-10 h-10 flex items-center justify-center text-brand-blue">
                      {renderInstrumentIcon(inst.id)}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-extrabold leading-tight text-brand-blue">{inst.name}</p>
                      <span className="text-[9px] text-brand-blue/60 font-bold">{inst.uncertainty || inst.role}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-tab selection for Lab 6 */}
          {!isFreeFall && (
            <div className="border-t border-brand-orange/15 pt-4 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-brand-blue/80">Phần thực hành</h3>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => {
                    setSubLab("average");
                    setTimeLcd("0.000");
                    setTimerReset(true);
                  }}
                  className={`w-full py-2 px-3 text-left text-xs font-black rounded-lg border transition-all cursor-pointer ${
                    subLab === "average"
                      ? "bg-brand-orange text-white border-brand-orange shadow-sm"
                      : "bg-white border-[#E2DFD8] text-[#605248] hover:bg-[#FFF2E6]/50"
                  }`}
                >
                  1. Đo Vận tốc Trung bình
                </button>
                <button
                  onClick={() => {
                    setSubLab("instantaneous");
                    setTimeLcd("0.000");
                    setTimerReset(true);
                  }}
                  className={`w-full py-2 px-3 text-left text-xs font-black rounded-lg border transition-all cursor-pointer ${
                    subLab === "instantaneous"
                      ? "bg-brand-orange text-white border-brand-orange shadow-sm"
                      : "bg-white border-[#E2DFD8] text-[#605248] hover:bg-[#FFF2E6]/50"
                  }`}
                >
                  2. Đo Vận tốc Tức thời
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-center border-t border-brand-orange/15 pt-3">
          <span className="text-[9px] font-black text-brand-blue/40 uppercase tracking-widest">Phylab PWA Engine</span>
        </div>
      </aside>

      {/* 2. Interactive Canvas */}
      <main className="order-1 lg:order-2 lg:col-span-6 flex flex-col gap-4">
        {/* Action Header */}
        <div className="bg-gradient-to-br from-brand-white to-brand-cream/50 border border-brand-orange/15 rounded-2xl p-3.5 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-gradient-to-r from-brand-orange to-[#B95213] text-white font-bold text-[10px] rounded-md uppercase tracking-wider shadow-sm">
              {spec.book}
            </span>
            <p className="text-xs font-bold text-brand-blue/80">{spec.title}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenTheory}
              className="px-3 py-1.5 bg-gradient-to-r from-brand-orange to-[#C35F14] hover:from-[#E27C27] hover:to-[#B55210] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-[0_4px_12px_rgba(213,106,23,0.15)] transition-all cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" /> Lý thuyết
            </button>
            <button
              onClick={handleAutoAssemble}
              className="px-3 py-1.5 bg-brand-cream hover:bg-brand-orange/10 border border-brand-orange/20 text-xs font-bold rounded-lg text-brand-blue flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Tự động ráp
            </button>
          </div>
        </div>

        {/* Interactive Simulation Canvas */}
        <div className="flex flex-col border border-brand-orange/25 rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(213,106,23,0.06)] bg-white">
          <div className="bg-gradient-to-r from-brand-blue to-brand-blue/90 text-white px-4 py-2.5 flex justify-between items-center text-xs font-bold border-b border-brand-orange/15">
            <span className="flex items-center gap-1.5 uppercase tracking-wider font-extrabold text-[10px] text-brand-orange">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></span>
              Không gian thí nghiệm mô phỏng
            </span>
            <span className="text-[9px] text-brand-cream/50 font-mono">VARPHI-ENGINE V2</span>
          </div>

          <div
            ref={canvasRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="relative h-[460px] overflow-hidden blueprint-grid select-none flex flex-col justify-between p-4 bg-white"
          >
            {/* Dynamic Wire Renderer */}
            <svg className="absolute inset-0 pointer-events-none z-10 w-full h-full">
              {isFreeFall ? (
                <>
                  {placed.timer && placed.magnet && connections.magnet && (
                    <path
                      d={`M ${magnetLeft + 33} 105 C ${magnetLeft + 33 - 30 + Math.sin(swayTime) * (3 + swayAmpRef.current * 10)} ${105 + 80 + Math.cos(swayTime * 0.8) * 4 + vibrationRef.current * 12}, ${(connections.magnet === "A" ? socketAX : socketBX) - 60 + Math.sin(swayTime * 1.1) * (3 + vibrationRef.current * 10)} ${socketY - 40 + Math.cos(swayTime * 1.3) * 4}, ${connections.magnet === "A" ? socketAX : socketBX} ${socketY}`}
                      stroke="#F78660" strokeWidth="4" strokeLinecap="round" fill="none"
                    />
                  )}
                  {placed.timer && placed.photogate && connections.photogate && (
                    <path
                      d={`M ${photogateLeft + 45} ${125 + ((selectedS - 0.1) / 0.7) * (300 - 125) + 20} C ${photogateLeft + 45 - 40 + Math.sin(swayTime * 1.2) * (4 + swayAmpRef.current * 15)} ${125 + ((selectedS - 0.1) / 0.7) * (300 - 125) + 20 + 90 + Math.cos(swayTime * 0.9) * 4}, ${(connections.photogate === "A" ? socketAX : socketBX) - 70 + Math.sin(swayTime * 0.7) * (4 + vibrationRef.current * 12)} ${socketY - 50 + Math.cos(swayTime * 1.4) * 4}, ${connections.photogate === "A" ? socketAX : socketBX} ${socketY}`}
                      stroke="#FFCC7A" strokeWidth="4" strokeLinecap="round" fill="none"
                    />
                  )}
                </>
              ) : (
                <>
                  {placed.timer && placed.gateE && connections.gateE && (
                    <path
                      d={`M ${standLeft + 105} 240 C ${standLeft + 80 + Math.sin(swayTime * 0.8) * 10} ${240 + 70}, ${(connections.gateE === "A" ? socketAX : socketBX) - 60} ${socketY - 40}, ${connections.gateE === "A" ? socketAX : socketBX} ${socketY}`}
                      stroke="#FFCC7A" strokeWidth="4" strokeLinecap="round" fill="none"
                    />
                  )}
                  {placed.timer && placed.gateF && connections.gateF && (
                    <path
                      d={`M ${standLeft + 100 + selectedRampLength * 200 + 5} 240 C ${standLeft + 100 + selectedRampLength * 200 - 20 + Math.sin(swayTime * 1.3) * 12} ${240 + 90}, ${(connections.gateF === "A" ? socketAX : socketBX) - 40} ${socketY - 40}, ${connections.gateF === "A" ? socketAX : socketBX} ${socketY}`}
                      stroke="#F78660" strokeWidth="4" strokeLinecap="round" fill="none"
                    />
                  )}
                </>
              )}
            </svg>

            {/* Stand Scale Guide */}
            {placed.stand && isFreeFall && (
              <div className="absolute left-6 inset-y-0 w-8 border-r-2 border-brand-blue/10 pointer-events-none flex flex-col justify-between py-12 text-[9px] font-mono font-bold text-slate-400">
                <span>0.0m</span><span>0.1m</span><span>0.2m</span><span>0.3m</span><span>0.4m</span><span>0.5m</span><span>0.6m</span><span>0.7m</span><span>0.8m</span>
              </div>
            )}

            {/* ================= SNAP / DRAG GUIDES ================= */}
            {activeDragKey === "stand" && !placed.stand && (
              <div className="absolute border border-dashed border-brand-orange/30 rounded-xl bg-brand-orange/5 flex items-center justify-center text-center text-[9px] font-bold text-brand-orange/50 uppercase tracking-wider p-3 animate-pulse" style={{ left: standLeft - 40, bottom: 20, width: 110, height: 380 }}>
                Đặt giá đỡ
              </div>
            )}
            {activeDragKey === "magnet" && placed.stand && !placed.magnet && (
              <div className="absolute border border-dashed border-brand-orange/30 rounded-xl bg-brand-orange/5 flex items-center justify-center text-[8px] font-bold text-brand-orange/50 uppercase" style={{ left: magnetLeft, top: 75, width: 80, height: 45 }}>
                Nam châm
              </div>
            )}
            {activeDragKey === "ramp" && placed.stand && !placed.ramp && (
              <div className="absolute border border-dashed border-brand-orange/30 rounded-xl bg-brand-orange/5 flex items-center justify-center text-[8px] font-bold text-brand-orange/50 uppercase" style={{ left: standLeft - 20, top: 120, width: 260, height: 180 }}>
                Đặt máng nghiêng
              </div>
            )}
            {activeDragKey === "timer" && !placed.timer && (
              <div className="absolute border border-dashed border-brand-orange/30 rounded-xl bg-brand-orange/5 flex items-center justify-center text-[8px] font-bold text-brand-orange/50 uppercase" style={{ right: timerRight, bottom: 20, width: timerWidth, height: timerHeight }}>
                Đặt đồng hồ
              </div>
            )}

            {/* ================= LAB INSTRUMENTS RENDER ================= */}
            {/* Stand Base */}
            {placed.stand && (
              <Stand 
                isFreeFall={isFreeFall}
                screwBalanced={screwBalanced}
                onToggleBalance={() => {
                  setScrewBalanced(!screwBalanced);
                  showToast("Vặn vít", screwBalanced ? "Đã nới lỏng vít chân đế." : "Đã vặn chặt vít thăng bằng chân đế!", "info");
                }}
                standLeft={standLeft}
              />
            )}

            {/* Electromagnet (Nam châm điện) */}
            {placed.magnet && (
              <Electromagnet 
                magnetPower={magnetPower}
                onTogglePower={() => {
                  setMagnetPower(!magnetPower);
                  if (magnetPower && ballPlaced) {
                    setBallPlaced(false);
                    showToast("Nhả bi", "Mất điện từ trường, bi đã rơi tự do!");
                  } else {
                    showToast("Nam châm điện", magnetPower ? "Đã tắt nguồn nam châm." : "Đã bật nguồn nam châm điện giữ bi.", "info");
                  }
                }}
                magnetLeft={magnetLeft}
              />
            )}

            {/* Inclined Ramp & Plumb bob (Lab 6) */}
            {!isFreeFall && placed.ramp && (
              <InclinedRamp 
                selectedAngle={selectedAngle}
                onAngleChange={setSelectedAngle}
                isFalling={isFalling}
                isSwaying={isSwaying}
                swayTime={swayTime}
                swayPhase={swayPhase}
                standLeft={standLeft}
              />
            )}

            {/* Photogate E */}
            {!isFreeFall && placed.gateE && (
              <Photogate 
                label="GATE E"
                active={connections.gateE !== ""}
                left={standLeft + 100}
              />
            )}

            {/* Photogate F */}
            {!isFreeFall && placed.gateF && (
              <Photogate 
                label="GATE F"
                active={connections.gateF !== ""}
                sValue={selectedRampLength}
                left={standLeft + 100 + selectedRampLength * 200}
                isSliding={isSlidingGate}
                onSlideStart={handleSlideStart}
              />
            )}

            {/* Ruler (Lab 6) */}
            {!isFreeFall && placed.ruler && (
              <Ruler left={standLeft + 100} width={260} />
            )}

            {/* Free Fall Photogate */}
            {isFreeFall && placed.photogate && (
              <div
                onMouseDown={handleSlideStart}
                onTouchStart={handleSlideStart}
                className={`absolute cursor-ns-resize z-20 group select-none transition-all ${isSlidingGate ? "scale-[1.03]" : ""}`}
                style={{
                  left: photogateLeft,
                  top: 125 + ((selectedS - 0.10) / 0.70) * (300 - 125),
                  width: 110,
                  height: 40
                }}
              >
                <div className="absolute left-10 top-1 w-7 h-6 bg-slate-700 comic-border-sm rounded shadow flex items-center justify-center">
                  <div className="w-3 h-3 bg-brand-yellow rounded-full"></div>
                </div>
                <div className="absolute left-0 top-0 w-9 h-10 bg-slate-900 rounded-l-xl comic-border-sm flex items-center justify-center text-white">
                  <span className="text-[8px] text-brand-yellow font-black font-mono font-digital">GATE</span>
                </div>
                <div className="absolute right-0 top-0 w-7 h-10 bg-slate-900 rounded-r-xl comic-border-sm"></div>
                <div className="absolute left-9 top-3 w-12 h-4 bg-slate-800 border-y-2 border-brand-blue"></div>
                <div ref={laserRef} className="absolute left-8 top-[18px] w-14 h-[3px] bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444] z-10"></div>
                <div className="absolute -right-20 top-0 bg-brand-blue text-white text-[10px] font-black font-mono px-2 py-1 rounded-xl comic-border-sm shadow-sm">
                  s = {selectedS.toFixed(2)}m
                </div>
              </div>
            )}

            {/* Steel Ball (Viên bi/Trụ thép) */}
            {placed.ball && (ballPlaced || isFalling) && (
              <SteelBall 
                ref={ballRef}
                isFreeFall={isFreeFall}
                left={ballPos.left !== 0 ? ballPos.left : (isFreeFall ? ballLeft : standLeft + 15)}
                top={ballPos.top !== 0 ? ballPos.top : (isFreeFall ? 122 : 105)}
                width={isFreeFall ? 14 : 12}
                height={isFreeFall ? 28 : 12}
              />
            )}

            {/* EMC964 DIGITAL TIMER */}
            {placed.timer && (
              <TimerEMC964 
                face={timerFace}
                power={timerPower}
                mode={timerMode}
                lcdText={timeLcd}
                scale={timerScale}
                onToggleFace={() => setTimerFace(timerFace === "front" ? "back" : "front")}
                onTogglePower={() => {
                  setTimerPower(!timerPower);
                  setTimerReset(true);
                  setTimeLcd(timerScale === "fine" ? "0.000" : "0.00");
                  showToast("Đồng hồ MC964", timerPower ? "Đã tắt nguồn đồng hồ." : "Đồng hồ đã được cấp nguồn thành công!", "info");
                }}
                onToggleMode={handleModeKnobClick}
                onToggleScale={handleScaleKnobClick}
                onReset={() => {
                  if (!timerPower) return;
                  setTimerReset(true);
                  setTimeLcd(timerScale === "fine" ? "0.000" : "0.00");
                  showToast("Reset số", "Đã đưa đồng hồ về vạch số 0.");
                }}
                onClearCables={() => {
                  const oldCables = { ...connections };
                  setConnections({ magnet: "", photogate: "", gateE: "", gateF: "" });
                  setActiveWiringSource(null);
                  if (Object.values(oldCables).some(c => c !== "")) {
                    showToast("Rút cáp", "Đã rút toàn bộ dây cáp tín hiệu.");
                  }
                }}
                connections={connections}
                activeWiringSource={activeWiringSource}
                onPortClick={handlePortClick}
                timerRight={timerRight}
                timerWidth={timerWidth}
                timerHeight={timerHeight}
              />
            )}

            {/* INTERACTIVE WIRING OVERLAYS */}
            {placed.magnet && isFreeFall && (
              <button
                onClick={() => handleSocketClick("magnet")}
                className={`absolute w-5 h-5 rounded-full border-2 border-white z-30 transition-all flex items-center justify-center shadow-md cursor-pointer ${
                  activeWiringSource === "magnet" ? "bg-red-500 scale-110" : connections.magnet ? "bg-emerald-500" : "bg-brand-orange animate-pulse"
                }`}
                style={{ left: magnetLeft + 33, top: 105 }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white opacity-70"></div>
              </button>
            )}
            {placed.photogate && isFreeFall && (
              <button
                onClick={() => handleSocketClick("photogate")}
                className={`absolute w-5 h-5 rounded-full border-2 border-white z-30 transition-all flex items-center justify-center shadow-md cursor-pointer ${
                  activeWiringSource === "photogate" ? "bg-red-500 scale-110" : connections.photogate ? "bg-emerald-500" : "bg-brand-yellow animate-pulse"
                }`}
                style={{ left: photogateLeft + 45, top: 125 + ((selectedS - 0.1) / 0.7) * (300 - 125) + 20 }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white opacity-70"></div>
              </button>
            )}
            {!isFreeFall && placed.gateE && (
              <button
                onClick={() => handleSocketClick("gateE")}
                className={`absolute w-5 h-5 rounded-full border-2 border-white z-30 transition-all flex items-center justify-center shadow-md cursor-pointer ${
                  activeWiringSource === "gateE" ? "bg-red-500 scale-110" : connections.gateE ? "bg-emerald-500" : "bg-brand-yellow animate-pulse"
                }`}
                style={{ left: standLeft + 105, top: 220 }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white opacity-70"></div>
              </button>
            )}
            {!isFreeFall && placed.gateF && (
              <button
                onClick={() => handleSocketClick("gateF")}
                className={`absolute w-5 h-5 rounded-full border-2 border-white z-30 transition-all flex items-center justify-center shadow-md cursor-pointer ${
                  activeWiringSource === "gateF" ? "bg-red-500 scale-110" : connections.gateF ? "bg-emerald-500" : "bg-brand-orange animate-pulse"
                }`}
                style={{ left: standLeft + 100 + selectedRampLength * 200 + 5, top: 220 }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white opacity-70"></div>
              </button>
            )}

            {/* Bottom Controls */}
            <div className="flex justify-between items-center w-full bg-slate-50/90 backdrop-blur-xs rounded-xl p-2 border border-slate-200 z-10">
              <div className="flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full ${statusColor}`}></span>
                <span className="text-xs font-bold text-slate-600">{statusText}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleResetBall}
                  disabled={progress < 100 || isFalling}
                  className="py-1.5 px-3 bg-slate-600 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg border border-slate-750 shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Đặt lại bi
                </button>
                <button
                  onClick={handleRelease}
                  disabled={progress < 100 || isFalling}
                  className="py-1.5 px-4 bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-black rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Nhả bi
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Help Box */}
        <div className="bg-gradient-to-br from-brand-white to-brand-cream/50 rounded-xl p-3 border border-brand-orange/15 flex gap-3 items-center shadow-sm">
          <div className="text-brand-orange">
            <HelpCircle className="w-4 h-4" />
          </div>
          <p className="text-[10px] font-bold text-brand-blue/85">
            {progress < 100
              ? "Trạng thái: Gá lắp dụng cụ bằng cách kéo thả từ khay bên trái vào ô đứt nét."
              : "Trạng thái: Kéo thanh trượt s trên thước dọc trục để chỉnh độ cao trước khi đo."}
          </p>
        </div>
      </main>

      {/* 3. AI Assistant Box */}
      <aside className="order-3 lg:col-span-3 flex flex-col gap-4">
        {/* Chat Mascot Panel */}
        <div className="bg-gradient-to-br from-brand-blue to-[#2B1B10] text-white rounded-2xl border border-brand-orange/20 p-4 flex flex-col justify-between min-h-[160px] shadow-md">
          <div className="flex gap-3 items-start mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-[#B95213] flex-shrink-0 flex items-center justify-center border border-white/10 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-white stroke-[2.5] fill-none">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-brand-orange font-black tracking-widest block uppercase">Trợ lý ảo Phylab</span>
                <button
                  onClick={() => speakText(assistantText)}
                  className={`p-1 hover:bg-white/10 rounded-lg ${audioPlaying ? "animate-pulse" : ""}`}
                  title="Nghe giọng đọc chỉ dẫn"
                >
                  <Volume2 className="w-4 h-4 text-brand-orange" />
                </button>
              </div>
              <p className="text-xs font-bold leading-relaxed text-brand-cream/90 mt-1">
                {assistantText}
              </p>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t border-white/10 text-[10px] font-black text-brand-orange">
            <span>Tiến độ lắp: {progress}%</span>
            <span>Học sinh: {studentName}</span>
          </div>
        </div>

        {/* Interactive Chat Box */}
        <div className="bg-white rounded-2xl border border-brand-orange/15 p-4 flex flex-col gap-3 shadow-xs">
          <h4 className="text-xs font-black uppercase text-brand-blue tracking-wide">Hỏi đáp Trợ lý</h4>
          <div className="text-[10px] font-bold text-slate-500 max-h-36 overflow-y-auto space-y-2 pr-1">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`p-2 rounded-xl leading-normal ${
                msg.role === "user" ? "bg-brand-cream/40 text-brand-blue text-right animate-[fadeIn_0.25s_ease-out]" : "bg-brand-orange/5 text-brand-blue animate-[fadeIn_0.25s_ease-out]"
              }`}>
                <strong>{msg.role === "user" ? "Em" : "Trợ lý"}:</strong> {msg.content}
              </div>
            ))}
            {chatLoading && <div className="text-slate-400 italic">Đang suy nghĩ...</div>}
          </div>
          <form onSubmit={handleChatSubmit} className="flex gap-1.5 mt-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ví dụ: Làm sao tính sai số?"
              className="flex-1 px-3 h-11 border border-brand-orange/20 rounded-xl text-[11px] font-bold outline-none focus:border-brand-orange text-brand-blue bg-white"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="w-11 h-11 bg-brand-orange hover:bg-brand-orange/95 text-white rounded-xl text-xs font-black disabled:opacity-50 cursor-pointer flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Measurement Results Log Notebook */}
        <DataBook 
          spec={dynamicSpec}
          measures={measures}
          onClearMeasures={onClearMeasures}
          onSubmitReport={onSubmitReport}
        />
      </aside>

      {/* Custom Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 bg-white rounded-xl border border-slate-200 shadow-lg p-3.5 flex items-center gap-3 z-50 animate-slide-in max-w-sm">
          <div className={`p-1.5 rounded-lg text-white ${
            toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-rose-500" : "bg-brand-blue"
          }`}>
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <div>
            <h5 className="text-xs font-black leading-tight text-brand-blue">{toast.title}</h5>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5 leading-normal">{toast.msg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
