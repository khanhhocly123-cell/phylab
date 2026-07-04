"use client";

import React, { useState, useEffect } from "react";
import {
  Camera, BookOpen, ChevronRight, Thermometer,
  Atom, FileText, FlaskConical, History, Compass, Zap, Lightbulb,
  Sparkles, Check, ArrowRight, Clock, Lock, FileBarChart
} from "lucide-react";
import { motion } from "framer-motion";

interface HomeScreenProps {
  studentName: string;
  completedCount: number;
  // Danh sách các bài lab đang trong trạng thái "vừa vào, chưa nộp"
  inProgressLabIds?: string[];
  reports?: Array<{ title: string; date: string; score?: number; shortTitle?: string }>;
  onNav: (tab: "home" | "scan" | "lab" | "notes" | "prelab") => void;
  onOpenLab: (id: string) => void;
  onSubjectClick?: (subject: string) => void;
}

export default function HomeScreen({
  studentName,
  completedCount,
  inProgressLabIds = [],
  reports = [],
  onNav,
  onOpenLab,
  onSubjectClick,
}: HomeScreenProps) {
  const [selectedGrade, setSelectedGrade] = useState<10 | 11 | 12>(10);
  const [greeting, setGreeting] = useState("Chào buổi sáng");

  useEffect(() => {
    const hours = new Date().getHours();
    let currentGreeting = "Chào buổi sáng";
    if (hours >= 12 && hours < 18) {
      currentGreeting = "Chào buổi chiều";
    } else if (hours >= 18 || hours < 5) {
      currentGreeting = "Chào buổi tối";
    }
    const timer = setTimeout(() => {
      setGreeting(currentGreeting);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Format short display name
  const getFirstName = (fullName: string) => {
    if (!fullName) return "Khánh";
    const cleanName = fullName.split(" (")[0]; // remove class tags
    const parts = cleanName.trim().split(" ");
    return parts[parts.length - 1] || "Khánh";
  };

  const firstName = getFirstName(studentName);

  // Logic tiến độ:
  //   - Chưa vào: 0%
  //   - Đã vào (in progress): 25%
  //   - Đã hoàn thành 1 bài: 50%
  //   - Hoàn thành >=2 bài: 100%
  const calcPct = (labId: string) => {
    if (inProgressLabIds.includes(labId)) return 25;
    if (completedCount >= 1) return 50;
    return 0;
  };

  const quickActions = [
    {
      label: "Quét tài liệu",
      desc: "Chụp ảnh bài thực hành từ SGK",
      icon: Camera,
      tab: "scan" as const,
    },
    {
      label: "Vào Phòng Lab",
      desc: "Tiến hành thí nghiệm tương tác",
      icon: FlaskConical,
      tab: "lab" as const,
    },
    {
      label: "Sổ Báo Cáo",
      desc: "Ghi chép & xem lại kiến thức",
      icon: FileText,
      tab: "notes" as const,
    },
    {
      label: "Prelab",
      desc: "Chuẩn bị trước khi vào thí nghiệm",
      icon: BookOpen,
      tab: "prelab" as const,
    },
  ];

  // Subjects List: Simple Horizontal Pills
  const subjects = [
    { title: "Cơ học", icon: Compass, ready: true },
    { title: "Nhiệt học", icon: Thermometer, ready: false },
    { title: "Điện học", icon: Zap, ready: false },
    { title: "Quang học", icon: Lightbulb, ready: false },
    { title: "Vật lý hạt nhân", icon: Atom, ready: false }
  ];

  // Course labs listing
  const experiments = [
    {
      id: "do-toc-do-vat-chuyen-dong",
      grade: 10,
      name: "Đo vận tốc tức thời và vận tốc trung bình",
      sgk: "Bài 6 SGK Vật lý 10 - Kết nối tri thức",
      desc: "Khảo sát chuyển động thẳng biến đổi đều bằng máng nghiêng và cổng quang điện.",
      difficulty: "Dễ",
      duration: "10 phút",
      image: "/images/marble_ramp.webp",
      active: true
    },
    {
      id: "do-gia-toc-roi-tu-do",
      grade: 10,
      name: "Xác định gia tốc rơi tự do",
      sgk: "Bài 11 SGK Vật lý 10 - Kết nối tri thức",
      desc: "Thả rơi bi sắt từ tính qua cổng quang điện để đo gia tốc trọng trường g.",
      difficulty: "Trung bình",
      duration: "15 phút",
      image: "/images/free_fall.webp",
      active: true
    },
    {
      id: "dong-luong",
      grade: 10,
      name: "Khảo sát định luật bảo toàn động lượng",
      sgk: "Bài 19 SGK Vật lý 10 - Kết nối tri thức",
      desc: "Thí nghiệm va chạm xe trượt trên đệm khí.",
      difficulty: "Khó",
      duration: "20 phút",
      image: "",
      active: false
    },
    // Grade 11
    {
      id: "do-tieu-cu",
      grade: 11,
      name: "Đo tiêu cự của thấu kính hội tụ",
      sgk: "Bài 22 SGK Vật lý 11 - Kết nối tri thức",
      desc: "Đo tiêu cự f bằng phương pháp ảnh ảo Bessel.",
      difficulty: "Dễ",
      duration: "15 phút",
      image: "",
      active: false
    },
    {
      id: "suat-dien-dong",
      grade: 11,
      name: "Đo suất điện động và điện trở trong",
      sgk: "Bài 12 SGK Vật lý 11 - Kết nối tri thức",
      desc: "Vẽ đặc tuyến vôn-ampe của nguồn điện một chiều.",
      difficulty: "Trung bình",
      duration: "25 phút",
      image: "",
      active: false
    },
    // Grade 12
    {
      id: "giao-thoa-anh-sang",
      grade: 12,
      name: "Đo bước sóng ánh sáng bằng phương pháp giao thoa",
      sgk: "Bài 15 SGK Vật lý 12 - Kết nối tri thức",
      desc: "Đo bước sóng nguồn laser qua khe Young.",
      difficulty: "Khó",
      duration: "25 phút",
      image: "",
      active: false
    }
  ];

  // Tiến độ thật: tính tổng % của tất cả bài đã hoàn thành 50% hoặc 100%
  const totalPct = experiments.reduce((sum, lab) => sum + calcPct(lab.id), 0);
  const overallPct = Math.min(100, Math.round(totalPct));

  const filteredLabs = experiments.filter(lab => lab.grade === selectedGrade);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const itemVariants = {
    hidden: { y: 12, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-[#321E12] font-nunito"
    >
      {/* ================= LEFT SECTION: MAIN DASHBOARD ================= */}
      <div className="lg:col-span-9 space-y-6 md:space-y-8">
        
        {/* Banner: mobile = cozy claymorphic card; desktop = full card with illustration */}
        <motion.div
          variants={itemVariants}
          className="rounded-[24px] overflow-hidden shadow-[0_6px_20px_rgba(50,30,18,0.02)] group"
        >
          {/* Mobile banner — Cozy minimalist card */}
          <div className="md:hidden p-5 bg-[#FFF8F2] text-[#321E12] rounded-[24px] border-2 border-[#E2DFD8] relative">
            <h2 className="text-xl font-black tracking-tight leading-tight text-[#321E12]">
              {greeting}, <span className="text-[#C85A17]">{firstName}</span>
            </h2>
            <p className="text-xs font-semibold text-[#605248] mt-1.5 leading-relaxed">
              Chào mừng bạn đến với PhyLab. Hôm nay bạn muốn tự tay khám phá thí nghiệm nào?
            </p>
            <div className="mt-4 pt-3.5 border-t border-[#E2DFD8]/60 flex items-center justify-between text-[10px] font-black text-[#605248]">
              <span>Khối Cơ Học • Lớp 10</span>
              <span className="text-[#C85A17]">Tiến độ học tập: {overallPct}%</span>
            </div>
          </div>

          {/* Desktop banner — full layout with illustration */}
          <div className="hidden md:flex p-8 flex-row justify-between items-center relative bg-[#FFF8F2] border border-[#E2DFD8]">
            <div className="absolute inset-0 blueprint-grid opacity-[0.02] pointer-events-none" />
            <div className="space-y-2 text-left z-10 max-w-lg">
              <h2 className="text-4xl font-black tracking-tight leading-tight text-[#321E12]">
                {greeting}, <span className="text-[#C85A17]">{firstName}!</span>
              </h2>
              <p className="text-base font-bold text-[#605248] leading-relaxed">
                Hôm nay bạn muốn khám phá hiện tượng vật lý nào?
              </p>
            </div>
            <div className="relative z-10 w-[220px] h-[130px] rounded-2xl overflow-hidden shadow-sm flex-shrink-0 bg-white/40 border border-[#E2DFD8]">
              <img
                src="/images/prism_light.webp"
                alt="Prism splitting light spectrum"
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-full h-full object-cover select-none transition-transform duration-[1.2s] ease-out group-hover:scale-105"
              />
            </div>
          </div>
        </motion.div>

        {/* Mobile Subject Filter Carousel */}
        <motion.div
          variants={itemVariants}
          className="lg:hidden flex items-center gap-3 overflow-x-auto scrollbar-none pb-2 pt-1 w-full snap-x snap-mandatory"
        >
          {subjects.map((sub, idx) => {
            const Icon = sub.icon;
            // Cozy clay colors for each subject
            let colorTheme = {
              bg: "bg-[#FFFBF7] border-[#E2DFD8]",
              activeBg: "bg-[#FFF2E6] border-[#D56A17] text-[#321E12] shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_6px_12px_rgba(213,106,23,0.04)]",
              accent: "bg-[#FAF8F5] text-[#605248] border-[#E2DFD8]",
              activeAccent: "bg-[#D56A17] text-white border-transparent"
            };

            if (sub.title === "Nhiệt học") {
              colorTheme.accent = "bg-[#FFF5F5] text-[#C62828] border-[#FFCDD2]";
            } else if (sub.title === "Điện học") {
              colorTheme.accent = "bg-[#FFFDE6] text-[#F57F17] border-[#FFE082]";
            } else if (sub.title === "Quang học") {
              colorTheme.accent = "bg-[#F0FDFA] text-[#00695C] border-[#B2DFDB]";
            } else if (sub.title === "Vật lý hạt nhân") {
              colorTheme.accent = "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]";
            }

            const active = sub.ready; // Mechanics is the only active subject now
            
            return (
              <button
                key={idx}
                onClick={() => onSubjectClick?.(sub.title)}
                className={`snap-start flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all duration-200 flex-shrink-0 w-[145px] select-none active:scale-97 cursor-pointer ${
                  active ? colorTheme.activeBg : `${colorTheme.bg} shadow-xs`
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all ${
                  active ? colorTheme.activeAccent : colorTheme.accent
                }`}>
                  <Icon className="w-4.5 h-4.5 stroke-[2.5]" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <h4 className="text-xs font-black text-[#321E12] leading-tight truncate">
                    {sub.title}
                  </h4>
                  <span className={`text-[8px] font-black uppercase tracking-wider block mt-0.5 ${
                    active ? "text-[#D56A17]" : "text-[#605248]/50"
                  }`}>
                    {active ? "Có Lab" : "Sắp ra mắt"}
                  </span>
                </div>
              </button>
            );
          })}
        </motion.div>

        {/* Mobile Quick Action Console / Desktop Action grid */}
        <div className="md:hidden space-y-3">
          {/* Main Action: Scan SGK (Cozy minimalist claymorphism) */}
          <button
            onClick={() => onNav("scan")}
            className="w-full bg-[#FFF2E6] text-[#321E12] p-4.5 rounded-[24px] border-2 border-[#C85A17]/25 shadow-[inset_0_2px_4px_rgba(255,255,255,0.85),0_6px_12px_rgba(50,30,18,0.02)] flex items-center justify-between gap-4 active:scale-98 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#C85A17]/10 flex items-center justify-center border border-[#C85A17]/20 flex-shrink-0">
                <Camera className="w-6 h-6 text-[#C85A17] stroke-[2.5]" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-black text-[#321E12] leading-tight">
                  Quét Sách Giáo Khoa
                </h4>
                <p className="text-[10px] font-bold text-[#605248] mt-0.5">Chụp hình trang sách để nhận diện bài học nhanh</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white border border-[#E2DFD8] flex items-center justify-center text-[#605248] flex-shrink-0">
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </div>
          </button>

          {/* Sub Actions: 3 Columns Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              {
                label: "Vào Lab",
                desc: "Đo đạc ảo",
                icon: FlaskConical,
                tab: "lab" as const,
                color: "bg-[#FFF2E6] text-[#C85A17] border-[#C85A17]/15",
              },
              {
                label: "Prelab",
                desc: "Chuẩn bị",
                icon: BookOpen,
                tab: "prelab" as const,
                color: "bg-[#F3F8F2] text-[#2E7D32] border-[#2E7D32]/15",
              },
              {
                label: "Sổ Báo Cáo",
                desc: "Ghi chép",
                icon: FileText,
                tab: "notes" as const,
                color: "bg-[#F2F6FC] text-[#1976D2] border-[#1976D2]/15",
              }
            ].map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.label}
                  onClick={() => onNav(act.tab)}
                  className="bg-white border-2 border-[#E2DFD8] rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_4px_8px_rgba(50,30,18,0.015)] cursor-pointer"
                >
                  <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center ${act.color} flex-shrink-0`}>
                    <Icon className="w-4.5 h-4.5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-[11px] font-black text-[#321E12] truncate leading-tight">
                      {act.label}
                    </h5>
                    <p className="text-[8px] text-[#605248] font-bold mt-0.5 truncate leading-none">
                      {act.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Quick Action Shortcuts — Desktop only */}
        <motion.div variants={itemVariants} className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.label}
                onClick={() => onNav(act.tab)}
                className="bg-[#FFFFFF] hover:bg-[#FFFBF5] border border-[#E2DFD8] hover:border-[#C85A17]/45 rounded-2xl p-3.5 md:p-5 text-left transition-all duration-200 active:scale-97 cursor-pointer shadow-[0_4px_16px_rgba(50,30,18,0.005)] hover:shadow-[0_8px_20px_rgba(50,30,18,0.02)] flex flex-col gap-2.5 md:gap-4 min-h-[112px] md:min-h-[160px] group relative"
              >
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-[#FFF2E6] flex items-center justify-center text-[#C85A17] border border-[#C85A17]/10 group-hover:bg-[#C85A17] group-hover:text-white transition-colors duration-250 flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 md:w-5.5 md:h-5.5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-[11px] md:text-sm font-black text-[#321E12] group-hover:text-[#C85A17] transition-colors duration-200 leading-snug">
                    {act.label}
                  </h4>
                  <p className="hidden md:block text-[10px] text-[#605248] font-bold leading-normal mt-0.5">
                    {act.desc}
                  </p>
                </div>
                <ChevronRight className="absolute bottom-3.5 right-3.5 md:bottom-5 md:right-5 w-3.5 h-3.5 text-[#605248]/40 group-hover:text-[#C85A17] transition-colors duration-200 flex-shrink-0" />
              </button>
            );
          })}
        </motion.div>

        {/* Thí nghiệm gần đây: Swipable horizontal carousel on mobile, 2-column grid on desktop */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="text-lg md:text-xl font-extrabold text-[#321E12] tracking-tight px-0.5 flex items-center justify-between">
            <span>Thí nghiệm gần đây</span>
            <span className="text-[10px] font-black text-[#C85A17] bg-[#FFF2E6] px-2.5 py-1 rounded-lg border border-[#C85A17]/10 md:hidden animate-pulse">
              Vuốt ngang &rarr;
            </span>
          </h3>
          
          <div className="w-full">
            <div
              className="flex lg:grid overflow-x-auto lg:overflow-x-visible lg:grid-cols-2 gap-4 lg:gap-5 pb-4 lg:pb-0 snap-x snap-mandatory scrollbar-none w-full scroll-smooth"
              style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}
            >
              {/* Card 1: Ramp experiment (Bài 6) */}
              <div
                onClick={() => onOpenLab("do-toc-do-vat-chuyen-dong")}
                className="min-w-[76vw] sm:min-w-0 snap-start bg-[#FFFFFF] rounded-3xl border border-[#E2DFD8] hover:border-[#C85A17]/35 shadow-[0_6px_20px_rgba(50,30,18,0.015)] hover:shadow-[0_12px_32px_rgba(50,30,18,0.03)] transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer group relative flex-shrink-0 sm:w-auto"
              >
                {/* Visual Thumbnail with Gradient Overlay */}
                <div className="h-28 md:h-44 overflow-hidden relative bg-[#EAE8E3] border-b border-[#E2DFD8]/70">
                  <img
                    src="/images/marble_ramp.webp"
                    alt="Đo tốc độ tức thời và tốc độ trung bình"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="w-full h-full object-cover select-none transition-transform duration-[1.5s] ease-out group-hover:scale-103"
                  />
                  {/* Subtle dark gradient overlay to highlight text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Badges on Thumbnail */}
                  <div className="absolute top-3 left-3 z-10 flex gap-1.5">
                    <span className="text-[8px] font-black text-[#C85A17] bg-[#FFF8F2] px-2 py-0.5 rounded border border-[#C85A17]/15 shadow-xs uppercase tracking-wider">
                      Bài 6 SGK
                    </span>
                    <span className="text-[8px] font-black text-white bg-[#00695C]/80 backdrop-blur-xs px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                      Lớp 10 • Cơ học
                    </span>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full bg-[#C85A17] text-white flex items-center justify-center shadow-lg group-hover:scale-105 active:scale-95 transition-all">
                    <ChevronRight className="w-5 h-5 stroke-[3] ml-0.5" />
                  </div>
                </div>

                <div className="p-4 md:p-6 space-y-3.5">
                  <div className="space-y-1">
                    <h4 className="text-sm md:text-lg font-black text-[#321E12] group-hover:text-[#C85A17] transition-colors leading-snug truncate">
                      Đo vận tốc tức thời và vận tốc trung bình
                    </h4>
                    <p className="text-[10px] md:text-xs text-[#605248] font-bold">
                      Thiết bị: Máng nghiêng & Cổng quang điện kép
                    </p>
                  </div>

                  {/* Progress bar - 0/25/50/100 thật */}
                  {(() => {
                    const pct = calcPct("do-toc-do-vat-chuyen-dong");
                    return (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-[10px] md:text-xs font-extrabold text-[#605248]">
                          <span>
                            {pct === 0 ? "Chưa bắt đầu" : pct === 25 ? "Đang tiến hành" : pct >= 50 ? "Đã hoàn thành" : ""}
                          </span>
                          <span className={`font-black ${pct > 0 ? "text-[#C85A17]" : "text-[#605248]"}`}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full bg-[#E2DFD8]/45 h-2 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full transition-all duration-300 rounded-full bg-gradient-to-r ${pct >= 50 ? "from-[#DF742E] to-[#C85A17]" : "from-[#FFB74D] to-[#DF742E]"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Card 2: Free fall experiment (Bài 11) */}
              <div
                onClick={() => onOpenLab("do-gia-toc-roi-tu-do")}
                className="min-w-[76vw] sm:min-w-0 snap-start bg-[#FFFFFF] rounded-3xl border border-[#E2DFD8] hover:border-[#C85A17]/35 shadow-[0_6px_20px_rgba(50,30,18,0.015)] hover:shadow-[0_12px_32px_rgba(50,30,18,0.03)] transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer group relative flex-shrink-0 sm:w-auto"
              >
                {/* Visual Thumbnail with Gradient Overlay */}
                <div className="h-28 md:h-44 overflow-hidden relative bg-[#EAE8E3] border-b border-[#E2DFD8]/70">
                  <img
                    src="/images/free_fall.webp"
                    alt="Xác định gia tốc rơi tự do"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="w-full h-full object-cover select-none transition-transform duration-[1.5s] ease-out group-hover:scale-103"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Badges on Thumbnail */}
                  <div className="absolute top-3 left-3 z-10 flex gap-1.5">
                    <span className="text-[8px] font-black text-[#C85A17] bg-[#FFF8F2] px-2 py-0.5 rounded border border-[#C85A17]/15 shadow-xs uppercase tracking-wider">
                      Bài 11 SGK
                    </span>
                    <span className="text-[8px] font-black text-white bg-[#00695C]/80 backdrop-blur-xs px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                      Lớp 10 • Cơ học
                    </span>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full bg-[#C85A17] text-white flex items-center justify-center shadow-lg group-hover:scale-105 active:scale-95 transition-all">
                    <ChevronRight className="w-5 h-5 stroke-[3] ml-0.5" />
                  </div>
                </div>

                <div className="p-4 md:p-6 space-y-3.5">
                  <div className="space-y-1">
                    <h4 className="text-sm md:text-lg font-black text-[#321E12] group-hover:text-[#C85A17] transition-colors leading-snug truncate">
                      Xác định gia tốc rơi tự do
                    </h4>
                    <p className="text-[10px] md:text-xs text-[#605248] font-bold">
                      Thiết bị: Trụ thép rơi & Cổng quang điện hồng ngoại
                    </p>
                  </div>

                  {/* Progress bar */}
                  {(() => {
                    const pct = calcPct("do-gia-toc-roi-tu-do");
                    return (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-[10px] md:text-xs font-extrabold text-[#605248]">
                          <span>
                            {pct === 0 ? "Chưa bắt đầu" : pct === 25 ? "Đang tiến hành" : pct >= 50 ? "Đã hoàn thành" : ""}
                          </span>
                          <span className={`font-black ${pct > 0 ? "text-[#C85A17]" : "text-[#605248]"}`}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full bg-[#E2DFD8]/45 h-2 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full transition-all duration-300 rounded-full bg-gradient-to-r ${pct >= 50 ? "from-[#DF742E] to-[#C85A17]" : "from-[#FFB74D] to-[#DF742E]"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Carousel Dots Indicators */}
            <div className="flex lg:hidden justify-center items-center gap-1.5 pt-2">
              {[0, 1].map((dot) => (
                <span 
                  key={dot} 
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    dot === 0 ? "bg-[#C85A17]" : "bg-[#E2DFD8]/80"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Khám phá theo chủ đề — desktop only (mobile đã có pills compact ở trên banner) */}
        <motion.div variants={itemVariants} className="hidden lg:block space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-xl font-extrabold text-[#321E12] tracking-tight">
              Khám phá theo chủ đề
            </h3>
          </div>

          <div className="grid grid-cols-5 gap-3 w-full">
            {subjects.map((sub, idx) => {
              const Icon = sub.icon;
              return (
                <div
                  key={idx}
                  onClick={() => onSubjectClick?.(sub.title)}
                  className="bg-[#FFFFFF] border border-[#E2DFD8] rounded-2xl p-4 flex items-center shadow-[0_2px_8px_rgba(50,30,18,0.005)] hover:border-[#C85A17]/25 transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#FFF2E6] text-[#C85A17] border border-[#C85A17]/5 flex items-center justify-center flex-shrink-0 group-hover:bg-[#C85A17] group-hover:text-white transition-colors duration-250">
                    <Icon className="w-4.5 h-4.5 stroke-[2.5]" />
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <h4 className="text-xs font-black text-[#321E12] truncate group-hover:text-[#C85A17] transition-colors">
                      {sub.title}
                    </h4>
                    <p className="text-[9px] text-[#605248] font-bold mt-0.5 truncate">
                      {sub.ready ? "Có lab" : "Chưa có lab"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* All Course Labs Directory: Compact row items on mobile, Full grids on desktop */}
        <motion.div variants={itemVariants} className="space-y-4 border-t border-[#E2DFD8]/60 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <h3 className="text-lg md:text-xl font-extrabold text-[#321E12] tracking-tight">
              Tất cả bài thực hành
            </h3>
            
            {/* Grade Switcher */}
            <div className="flex items-center gap-1.5 bg-[#FFF2E6]/30 border border-[#E2DFD8] p-1.5 rounded-2xl w-full sm:w-auto overflow-hidden shadow-2xs">
              {[10, 11, 12].map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g as 10 | 11 | 12)}
                  className={`flex-1 sm:flex-initial text-center py-2 px-5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    selectedGrade === g
                      ? "bg-[#C85A17] text-white shadow-[0_4px_12px_rgba(200,90,23,0.18)]"
                      : "text-[#605248] hover:text-[#C85A17] hover:bg-[#FFF2E6]"
                  }`}
                >
                  Lớp {g}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Grid Layout (Hidden on Mobile) */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLabs.map((lab) => {
              const pct = calcPct(lab.id);
              return (
              <div
                key={lab.id}
                className={`bg-[#FFFFFF] rounded-2xl border border-[#E2DFD8] hover:border-[#C85A17]/25 shadow-xs hover:shadow-sm transition-all duration-200 overflow-hidden flex flex-col justify-between group ${
                  !lab.active && "opacity-80"
                }`}
              >
                <div className="p-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-[#C85A17] bg-[#FFF2E6] px-2 py-0.5 rounded border border-[#C85A17]/10">
                      {lab.sgk}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        lab.difficulty === "Dễ"
                          ? "bg-emerald-50 text-emerald-700"
                          : lab.difficulty === "Trung bình"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                      }`}>
                        {lab.difficulty}
                      </span>
                      <span className="text-[10px] font-semibold text-[#605248]/70 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#605248]/60" /> {lab.duration}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-black text-[#321E12] group-hover:text-[#C85A17] transition-colors leading-snug">
                      {lab.name}
                    </h4>
                    <p className="text-xs text-[#605248] font-bold leading-relaxed line-clamp-2">
                      {lab.desc}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#FFF2E6]/10 border-t border-[#E2DFD8]/75 flex items-center justify-between gap-4 mt-auto">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center text-[9px] text-[#605248]/70 font-bold uppercase">
                      <span>Tiến trình</span>
                      <span className="text-[#C85A17] font-black">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#E2DFD8]/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${pct > 0 ? "bg-[#C85A17]" : "bg-[#E2DFD8]/60"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {lab.active ? (
                    <button
                      onClick={() => onOpenLab(lab.id)}
                      className="py-2 px-4 bg-[#C85A17] hover:bg-[#B24A0C] text-white text-xs font-black rounded-lg shadow-2xs flex items-center gap-0.5 transition-all cursor-pointer hover:translate-x-0.5"
                    >
                      {pct === 25 ? "Tiếp tục" : pct >= 50 ? "Làm lại" : "Bắt đầu"} <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-[9px] font-black text-[#605248]/60 bg-[#EAE8E3] px-2.5 py-1.5 rounded border border-[#E2DFD8]/50">
                      <Lock className="w-3.5 h-3.5" /> Khóa
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>

          {/* Mobile Card List Layout (Creative redesign) */}
          <div className="md:hidden flex flex-col gap-4">
            {filteredLabs.map((lab) => {
              const pct = calcPct(lab.id);
              return (
              <div
                key={lab.id}
                onClick={() => { if (lab.active) onOpenLab(lab.id); }}
                className={`relative overflow-hidden bg-white border border-[#E2DFD8] rounded-3xl p-4.5 transition-all duration-200 active:scale-98 shadow-sm flex flex-col gap-3.5 ${
                  !lab.active ? "bg-slate-50/50 border-[#E2DFD8]/60 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {/* Background glow decoration if active */}
                {lab.active && pct > 0 && (
                  <div className="absolute right-0 top-0 w-24 h-24 rounded-full bg-[#D56A17]/5 blur-[24px] pointer-events-none" />
                )}

                {/* Upper row: thumbnail and info */}
                <div className="flex items-start gap-4">
                  {/* Visual Thumbnail container */}
                  <div className="w-16 h-16 rounded-2xl bg-[#FFF2E6] flex-shrink-0 overflow-hidden flex items-center justify-center border border-[#E2DFD8]/60 relative shadow-inner">
                    {lab.image ? (
                      <img src={lab.image} alt={lab.name} loading="lazy" decoding="async" draggable={false} className="w-full h-full object-cover" />
                    ) : (
                      <FlaskConical className="w-7 h-7 text-[#C85A17]" />
                    )}
                    {/* Semi-transparent blur overlay for locked labs */}
                    {!lab.active && (
                      <div className="absolute inset-0 bg-[#321E12]/50 backdrop-blur-xs flex items-center justify-center text-white">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Lab Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[8px] font-black text-[#C85A17] bg-[#FFF2E6] px-2 py-0.5 rounded border border-[#C85A17]/10 uppercase tracking-wider">
                        {lab.sgk.split("SGK")[0].trim() || "Thực hành"}
                      </span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded ${
                        lab.difficulty === "Dễ"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : lab.difficulty === "Trung bình"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>
                        {lab.difficulty}
                      </span>
                      <span className="text-[9px] font-bold text-[#605248]/70 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {lab.duration}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-[#321E12] leading-snug mt-1 break-words">
                      {lab.name}
                    </h4>
                    <p className="text-[9px] text-[#605248] font-bold">
                      {lab.sgk}
                    </p>
                  </div>
                </div>

                {/* Lower row: progress track & Action button */}
                <div className="pt-3 border-t border-[#E2DFD8]/60 flex items-center justify-between gap-4">
                  {lab.active ? (
                    <>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center text-[9px] text-[#605248]/70 font-black uppercase">
                          <span>Tiến trình</span>
                          <span className="text-[#C85A17]">{pct}%</span>
                        </div>
                        <div className="h-2 bg-[#E2DFD8]/45 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full transition-all duration-300 rounded-full bg-gradient-to-r from-[#DF742E] to-[#C85A17]`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="py-2 px-4.5 bg-[#C85A17] text-white text-[10px] font-black rounded-xl shadow-sm flex items-center gap-0.5 flex-shrink-0">
                        {pct === 25 ? "Tiếp tục" : pct >= 50 ? "Làm lại" : "Bắt đầu"} 
                        <ChevronRight className="w-3.5 h-3.5 stroke-[3] ml-0.5" />
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] font-bold text-[#605248]/60 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-[#605248]/55" /> Phòng thí nghiệm ảo đang được đóng gói
                      </span>
                      <span className="text-[9px] font-black px-2.5 py-1 bg-[#EAE8E3] text-[#605248]/70 rounded-lg border border-[#E2DFD8]">
                        Khóa
                      </span>
                    </>
                  )}
                </div>
              </div>
              );
            })}
          </div>

        </motion.div>

      </div>

      {/* ================= RIGHT SECTION: LEARNING SIDEBAR ================= */}
      <div className="hidden lg:block lg:col-span-3 space-y-6">
        
        {/* Study Progress Card with Circular Gauge */}
        <motion.div 
          variants={itemVariants}
          className="bg-[#FFFFFF] rounded-3xl border border-[#E2DFD8] p-5 shadow-[0_4px_15px_rgba(50,30,18,0.005)] space-y-5"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-[#605248]/70 flex items-center gap-1.5">
              Tiến độ học tập
            </h4>
            <button 
              onClick={() => onNav("notes")}
              className="text-[10px] font-extrabold text-[#C85A17] hover:underline flex items-center gap-0.5"
            >
              Xem chi tiết &rarr;
            </button>
          </div>
          
          <div className="flex items-center gap-4.5 py-1">
            {/* Circular Progress Gauge */}
            <div className="relative w-18 h-18 flex items-center justify-center flex-shrink-0">
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke="#FAF9F6" strokeWidth="6" />
                <circle
                  cx="36"
                  cy="36"
                  r="30"
                  fill="none"
                  stroke="#C85A17"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 30}
                  strokeDashoffset={2 * Math.PI * 30 * (1 - overallPct / 100)}
                  transform="rotate(-90 36 36)"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute text-sm font-black text-[#321E12]">{overallPct}%</span>
            </div>

            <div className="space-y-1">
              <h5 className="text-xs font-black text-[#321E12] leading-snug">
                Hoàn thành chuyên môn
              </h5>
              <p className="text-[11px] text-[#605248] font-bold leading-normal">
                Bạn đã hoàn thành {completedCount}/{experiments.length} thí nghiệm
              </p>
            </div>
          </div>

          {/* Styled Orange Slider Accent */}
          <div className="w-full bg-[#E2DFD8]/30 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-[#C85A17]" style={{ width: `${overallPct}%` }} />
          </div>
        </motion.div>

        {/* Weekly Targets Checklist - chỉ hiện khi có dữ liệu thật */}
        <motion.div
          variants={itemVariants}
          className="bg-[#FFFFFF] rounded-3xl border border-[#E2DFD8] p-5 shadow-[0_4px_15px_rgba(50,30,18,0.005)] space-y-4"
        >
          <h4 className="text-[10px] font-black uppercase tracking-wider text-[#605248]/70">
            Mục tiêu tuần này
          </h4>

          <div className="space-y-3.5">
            {[
              {
                text: "Hoàn thành 1 thí nghiệm",
                completed: completedCount >= 1,
                progress: `${Math.min(completedCount, 1)}/1`,
                badgeColor: completedCount >= 1
                  ? "bg-[#E6F4EA] text-[#137333] border border-[#137333]/10"
                  : "bg-[#FFF2E6] text-[#C85A17] border border-[#C85A17]/10"
              },
              {
                text: "Vào Prelab trước khi thực hành",
                completed: completedCount >= 1,
                progress: completedCount >= 1 ? "1/1" : "0/1",
                badgeColor: completedCount >= 1
                  ? "bg-[#E6F4EA] text-[#137333] border border-[#137333]/10"
                  : "bg-[#FFF2E6] text-[#C85A17] border border-[#C85A17]/10"
              }
            ].map((target, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs font-bold text-[#321E12] gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    target.completed
                      ? "bg-[#C85A17] text-white"
                      : "border-2 border-[#E2DFD8] bg-white"
                  }`}>
                    {target.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className={`text-xs md:text-sm ${target.completed ? "text-[#605248]/70 font-semibold" : "text-[#321E12] font-black"}`}>
                    {target.text}
                  </span>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${target.badgeColor}`}>
                  {target.progress}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Nhật ký thí nghiệm - dùng reports thật */}
        <motion.div
          variants={itemVariants}
          className="bg-[#FFFFFF] rounded-3xl border border-[#E2DFD8] p-5 shadow-[0_4px_15px_rgba(50,30,18,0.005)] space-y-4"
        >
          <h4 className="text-[10px] font-black uppercase tracking-wider text-[#605248]/70 flex items-center gap-1.5">
            <History className="w-4.5 h-4.5 text-[#C85A17]" /> Nhật ký thí nghiệm
          </h4>

          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs font-bold text-[#605248]">Chưa có hoạt động nào.</p>
                <p className="text-[9px] text-[#605248]/70 mt-1">Hãy vào thí nghiệm để bắt đầu ghi nhật ký.</p>
              </div>
            ) : (
              reports.slice(0, 5).map((log, idx) => (
                <div key={idx} className="flex items-start justify-between text-xs font-bold gap-3 pb-2 border-b border-[#E2DFD8]/40 last:border-0 last:pb-0">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm text-[#321E12] font-black truncate">{log.title}</p>
                    <p className="text-[9px] text-[#605248]/70 font-semibold">{log.date}</p>
                  </div>
                  {typeof log.score === "number" && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg flex-shrink-0 ${
                      log.score >= 7
                        ? "bg-[#E6F4EA] text-[#137333] border border-[#137333]/10"
                        : "bg-[#FFF2E6] text-[#C85A17] border border-[#C85A17]/10"
                    }`}>
                      {log.score.toFixed(1)}đ
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
