"use client";

import React, { useState } from "react";
import {
  Camera, BookOpen, Clipboard, User,
  Settings, LogOut, CheckCircle,
  FileText, ArrowRight, Home, ChevronDown, Bell,
  ChevronLeft, ChevronRight, AlertTriangle, GraduationCap
} from "lucide-react";
import LoginScreen from "@/components/LoginScreen";
import ScanScreen from "@/components/ScanScreen";
import LabRoom, { LabExportPayload } from "@/components/lab/LabRoom";
import NoteSection from "@/components/NoteSection";
import Prelab from "@/components/Prelab";
import HomeScreen from "@/components/HomeScreen";
import Logo from "@/components/Logo";
import TeacherShell from "@/components/teacher/TeacherShell";
import MyClassTab from "@/components/student/MyClassTab";
import { MathText } from "@/components/Latex";
import { getExperimentSpec, EXPERIMENT_SPECS } from "@/experiments/specs";
import { LessonId, ExperimentReport, RichTrial } from "@/lib/types";
import { useMyClass } from "@/lib/useMyClass";
import { getStudentId, logActivity } from "@/lib/activity";
import type { LabAssignmentPayload } from "@/lib/classTypes";

export type AssistantSettings = {
  pronoun: "anh" | "chị";
  answerStyle: "short" | "detailed";
};

const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  pronoun: "chị",
  answerStyle: "short",
};

/**
 * LabChooser — Bộ chọn thí nghiệm: luôn hiện 2 lựa chọn để HS tự chọn/ nhận diện,
 * KHÔNG nhảy thẳng vào bài đã chọn trước đó. Dùng chung cho tab Phòng Lab và Prelab.
 */
function LabChooser({ onSelect, onScan }: { onSelect: (id: LessonId) => void; onScan: () => void }) {
  const images: Record<string, string> = {
    "do-toc-do-vat-chuyen-dong": "/images/marble_ramp.webp",
    "do-gia-toc-roi-tu-do": "/images/free_fall.webp",
  };

  return (
    <div className="max-w-4xl mx-auto px-1 sm:px-0">
      <div className="text-center mb-6 space-y-1">
        <h2 className="text-xl md:text-2xl font-black text-[#321E12] tracking-tight">Phòng Lab — Chọn thí nghiệm</h2>
        <p className="text-xs md:text-sm font-bold text-[#605248]">Chọn một bài để xem Prelab dụng cụ rồi vào lắp ráp &amp; đo đạc.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
        {Object.values(EXPERIMENT_SPECS).map((sp) => {
          const imgUrl = images[sp.id] || "";
          return (
            <button
              key={sp.id}
              onClick={() => onSelect(sp.id as LessonId)}
              className="group text-left bg-[#FFFFFF] border border-[#E2DFD8] hover:border-[#C85A17]/40 shadow-sm hover:shadow-md rounded-3xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between active:scale-98 relative"
            >
              {/* Card visual header */}
              {imgUrl && (
                <div className="h-32 sm:h-36 w-full overflow-hidden relative border-b border-[#E2DFD8]/60 bg-slate-100 flex-shrink-0">
                  <img 
                    src={imgUrl} 
                    alt={sp.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-[#C85A17] text-white font-bold text-[9px] rounded shadow-xs uppercase tracking-wider">
                    {sp.book.split("SGK")[0].trim() || "Thực hành"}
                  </span>
                </div>
              )}
              
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  {!imgUrl && (
                    <span className="inline-flex px-2 py-0.5 bg-[#FFF2E6] text-[#C85A17] font-bold text-[10px] rounded border border-[#C85A17]/10 uppercase tracking-wider">{sp.book}</span>
                  )}
                  <h3 className="text-base font-black text-[#321E12] leading-snug group-hover:text-[#C85A17] transition-colors">{sp.title}</h3>
                  <div className="text-xs font-semibold text-[#605248] leading-relaxed line-clamp-2">
                    <MathText text={sp.theory.objective} />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2DFD8]/60 flex items-center justify-between mt-auto">
                  <span className="inline-flex items-center gap-1.5 text-[#C85A17] font-black text-xs">
                    Vào phòng Lab <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                  <span className="text-[10px] font-black px-2.5 py-1 bg-[#FFF2E6] text-[#C85A17] rounded-lg border border-[#C85A17]/10">
                    Mở
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-center mt-8">
        <button
          onClick={onScan}
          className="px-5 py-3 bg-[#FAF9F6] border border-[#C85A17]/35 text-[#321E12] text-xs font-black rounded-xl inline-flex items-center gap-2 hover:bg-[#FFF0E0] active:scale-95 transition-all cursor-pointer shadow-2xs"
        >
          <Camera className="w-4 h-4 text-[#C85A17]" /> Hoặc quét sách giáo khoa <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const [studentName, setStudentName] = useState<string | null>(null);
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [teacherToken, setTeacherToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "scan" | "lab" | "notes" | "prelab" | "myclass">("home");
  const [activeLessonId, setActiveLessonId] = useState<LessonId | null>(null);
  const [prelabPassed, setPrelabPassed] = useState<Record<string, boolean>>({});

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Load saved studentName and progress on mount to persist state
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("studentName");
      if (savedName) {
        setStudentName(savedName);
      }
      const savedRole = localStorage.getItem("role");
      if (savedRole === "teacher") {
        setRole("teacher");
        setTeacherToken(localStorage.getItem("teacherToken"));
      }
      const savedTab = localStorage.getItem("activeTab");
      if (savedTab) {
        setActiveTab(savedTab as any);
      }
      const savedLesson = localStorage.getItem("activeLessonId");
      if (savedLesson) {
        setActiveLessonId(savedLesson as any);
      }
      const savedPrelab = localStorage.getItem("prelabPassed");
      if (savedPrelab) {
        try {
          setPrelabPassed(JSON.parse(savedPrelab));
        } catch (e) {}
      }
    }
    setCheckingAuth(false);
  }, []);

  // Sync state changes to localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined" && studentName) {
      localStorage.setItem("activeTab", activeTab);
    }
  }, [activeTab, studentName]);

  React.useEffect(() => {
    if (typeof window !== "undefined" && studentName) {
      if (activeLessonId) {
        localStorage.setItem("activeLessonId", activeLessonId);
      } else {
        localStorage.removeItem("activeLessonId");
      }
    }
  }, [activeLessonId, studentName]);

  React.useEffect(() => {
    if (typeof window !== "undefined" && studentName) {
      localStorage.setItem("prelabPassed", JSON.stringify(prelabPassed));
    }
  }, [prelabPassed, studentName]);

  const [theoryOpen, setTheoryOpen] = useState(false);
  const [prelabOverlay, setPrelabOverlay] = useState(false); // xem lại Prelab dạng lớp phủ trên bàn thí nghiệm
  const [completedCount, setCompletedCount] = useState(0);
  const [measuredD, setMeasuredD] = useState(0.0182); // đường kính bi mặc định 18,20mm (mét), cập nhật từ Prelab
  
  // Collapse sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Header dropdown states
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [assistantSettings, setAssistantSettings] = useState<AssistantSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_ASSISTANT_SETTINGS;
    try {
      const saved = JSON.parse(localStorage.getItem("assistantSettings") || "null") as Partial<AssistantSettings> | null;
      return {
        pronoun: saved?.pronoun === "anh" ? "anh" : "chị",
        answerStyle: saved?.answerStyle === "detailed" ? "detailed" : "short",
      };
    } catch {
      return DEFAULT_ASSISTANT_SETTINGS;
    }
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("assistantSettings", JSON.stringify(assistantSettings));
    }
  }, [assistantSettings]);

  // Reports state initialized with some mock past items for high visual fidelity
  const [reports, setReports] = useState<ExperimentReport[]>([
    {
      id: "rep-mock-1",
      lessonId: "do-gia-toc-roi-tu-do",
      title: "Đo gia tốc rơi tự do",
      shortTitle: "Gia tốc rơi tự do",
      date: "28/06/2026 14:15",
      attempt: 1,
      measures: [
        { s: 0.20, t: 0.203 },
        { s: 0.40, t: 0.287 },
        { s: 0.60, t: 0.352 }
      ],
      trials: [
        { lab: "freefall", s: 0.20, t: 0.203, balanced: true, studentResult: 9.71 },
        { lab: "freefall", s: 0.40, t: 0.287, balanced: true, studentResult: 9.71 },
        { lab: "freefall", s: 0.60, t: 0.352, balanced: true, studentResult: 9.68 }
      ],
      score: 9.7,
      aiFeedback:
        `Phép đo của em có độ chuẩn xác và độ lặp lại rất cao, việc thả rơi trụ thép ổn định. ` +
        `Gia tốc trung bình $g_{tb} \\approx 9.71\\ \\text{m/s}^2$, sát giá trị chuẩn $9.8\\ \\text{m/s}^2$. ` +
        `Sai số chủ yếu do giới hạn đo của thiết bị (thước $\\pm 0.5\\text{mm}$, đồng hồ $\\pm 0.001\\text{s}$). ` +
        `Lời khuyên: giữ thẳng trục đứng của giá đỡ để trụ không chạm thành máng khi rơi.`
    }
  ]);

  // Dữ liệu đo giàu thông tin vừa xuất từ phòng Lab, chờ chấm ở Notes.
  const [labData, setLabData] = useState<{ lessonId: string; trials: RichTrial[] } | null>(null);

  // ── Lớp học: dữ liệu "Lớp của tôi" (đề GV giao + trạng thái nộp) ──
  const { myClass, loading: myClassLoading, refresh: refreshMyClass } = useMyClass(
    !!studentName && role === "student"
  );

  // Assignment Lab đang active cho bài học hiện tại (mới nhất trước) → override đề seeded/AI.
  const activeLabAssignment = React.useMemo(() => {
    if (!myClass || !activeLessonId) return null;
    return (
      myClass.assignments.find(
        (s) => s.assignment.kind === "lab" && s.assignment.lessonId === activeLessonId
      ) ?? null
    );
  }, [myClass, activeLessonId]);

  const assignedSets = React.useMemo(() => {
    if (!activeLabAssignment) return null;
    const payload = activeLabAssignment.assignment.payload as LabAssignmentPayload | null;
    return payload?.problemSets ?? null;
  }, [activeLabAssignment]);

  // Overall grades/stats
  const [, setReportSubmitted] = useState(false);
  const [, setGpaScore] = useState<number | null>(null);

  const activeSpec = activeLessonId ? getExperimentSpec(activeLessonId) : null;
  const isDoingExperiment = activeTab === "lab" && activeLessonId !== null && !!prelabPassed[activeLessonId];
  const isScanMode = activeTab === "scan";

  React.useEffect(() => {
    if (isDoingExperiment) {
      setSidebarCollapsed(true);
    }
  }, [isDoingExperiment]);

  // Ghi hoạt động "vào phòng Lab" cho dashboard giáo viên.
  React.useEffect(() => {
    if (isDoingExperiment && studentName && role === "student") {
      logActivity("lab_start", studentName, activeLessonId || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoingExperiment]);

  // Handle successful logins
  const handleLoginSuccess = (name: string, loginRole: "student" | "teacher" = "student", token?: string) => {
    setStudentName(name);
    localStorage.setItem("studentName", name);
    if (loginRole === "teacher" && token) {
      setRole("teacher");
      setTeacherToken(token);
      localStorage.setItem("role", "teacher");
      localStorage.setItem("teacherToken", token);
    } else {
      setRole("student");
      localStorage.setItem("role", "student");
      getStudentId(); // sinh UUID định danh HS trên thiết bị (nếu chưa có)
      logActivity("login", name);
    }
    setActiveTab("home");
  };

  // Đăng xuất (dùng chung cho cả 2 vai trò).
  const handleLogout = () => {
    setStudentName(null);
    setRole("student");
    setTeacherToken(null);
    localStorage.removeItem("studentName");
    localStorage.removeItem("activeTab");
    localStorage.removeItem("activeLessonId");
    localStorage.removeItem("prelabPassed");
    localStorage.removeItem("role");
    localStorage.removeItem("teacherToken");
    // GIỮ studentId — định danh thiết bị để lần sau vào lại vẫn là "em đó" trong lớp.
    setPrelabPassed({});
    setActiveLessonId(null);
    setActiveTab("home");
    setProfileMenuOpen(false);
  };

  // Chọn/nhận diện bài -> sang tab Lab; nếu phiên này chưa hoàn thành Prelab của bài,
  // Prelab sẽ chặn trước (xem render tab "lab").
  const handleLessonSelect = (lessonId: LessonId) => {
    setActiveLessonId(lessonId);
    setLabData(null); // clear previous experiment data
    setReportSubmitted(false);
    setGpaScore(null);
    setTheoryOpen(false);
    setPrelabOverlay(false);
    setActiveTab("lab");
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
  };

  // Hoàn thành Prelab (đã khóa dây dọi / đo bi thép) -> mở khóa phòng Lab của bài đó trong phiên.
  const handlePrelabComplete = (lessonId: LessonId, d?: number) => {
    if (d && d > 0) setMeasuredD(d);
    setPrelabPassed((prev) => ({ ...prev, [lessonId]: true }));
  };

  // Chọn bài ở tab Prelab -> chỉ xem Prelab của bài đó (không vào thí nghiệm).
  const handlePrelabView = (lessonId: LessonId) => {
    setActiveLessonId(lessonId);
    setActiveTab("prelab");
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
  };

  // Nhận số liệu xuất từ engine phòng Lab -> giữ dữ liệu giàu thông tin + sang Notes để chấm.
  const handleExportNote = (payload: LabExportPayload) => {
    const rich: RichTrial[] = (payload.trials || []).map((tr) => {
      const lab = String((tr as { lab?: string }).lab || payload.lab) as RichTrial["lab"];
      const t = Number((tr as { t?: number }).t) || 0;
      const sEF = (tr as { sEF?: number | null }).sEF;
      // freefall dùng s; average dùng sEF; instant dùng đường kính bi (mm -> m).
      const s = lab === "freefall"
        ? Number((tr as { s?: number }).s) || 0
        : lab === "average"
          ? Number(sEF) || 0
          : (payload.measuredD || 0) / 1000;
      return {
        lab, s, t,
        theta: (tr as { theta?: number }).theta,
        balanced: (tr as { balanced?: boolean }).balanced !== false,
      };
    }).filter((m) => m.t > 0);
    if (rich.length === 0) return;

    setLabData({ lessonId: activeLessonId || "", trials: rich });
    setActiveTab("notes");
  };

  // Nhận báo cáo đã chấm từ Notes -> lưu vào lịch sử + NỘP cho giáo viên nếu có assignment.
  const handleReportGraded = (report: ExperimentReport) => {
    setReports((prev) => [report, ...prev]);
    setCompletedCount((prev) => Math.min(2, prev + 1));

    // Có bài Lab giáo viên giao trùng bài học này → nộp lên lớp (server re-verify điểm).
    const matching = myClass?.assignments.find(
      (s) => s.assignment.kind === "lab" && s.assignment.lessonId === report.lessonId
    );
    if (matching && report.trials?.length && studentName) {
      fetch("/api/class/submit-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: matching.assignment.id,
          studentId: getStudentId(),
          studentName,
          trials: report.trials,
          graphScore: report.graphScore,
          aiFeedback: report.aiFeedback,
        }),
      })
        .then((res) => {
          if (res.ok) {
            showToast("Đã nộp bài Lab cho giáo viên ✓");
            void refreshMyClass();
          }
        })
        .catch(() => {});
    }
  };

  // Auth loading gate to prevent login layout flashing on reload
  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] text-[#321E12] font-nunito gap-4">
        <div className="w-10 h-10 border-4 border-[#C85A17]/20 border-t-[#C85A17] rounded-full animate-spin" />
        <p className="text-xs font-black tracking-wider text-[#605248]">Đang khởi động phòng Lab...</p>
      </div>
    );
  }

  // ── SHELL GIÁO VIÊN: nhánh riêng hoàn toàn, không render shell học sinh ──
  if (studentName && role === "teacher" && teacherToken) {
    return (
      <TeacherShell teacherName={studentName} token={teacherToken} onLogout={handleLogout} />
    );
  }

  // Logged-out view
  if (!studentName) {
    return (
      <div className="relative flex flex-col flex-1 items-center justify-center p-0 md:p-4 bg-[#FAF9F6] min-h-screen overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-amber-300/20 via-orange-200/15 to-transparent blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-[#C85A17]/10 via-rose-250/10 to-transparent blur-[150px] pointer-events-none" />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 blueprint-grid opacity-[0.25] pointer-events-none" />

        {/* Login Screen Card */}
        <div className="relative z-10 w-full flex justify-center items-center">
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  const shortName = studentName.split(" (")[0];

  return (
    <div className={`flex flex-col lg:flex-row h-[100dvh] w-screen bg-[#FAF9F6] text-[#321E12] font-nunito overflow-hidden select-none ${
      isDoingExperiment || isScanMode ? "pb-0" : "pb-16"
    } lg:pb-0`}>
      
      {/* ================= 1. GLOBAL LEFT SIDEBAR (Desktop only) ================= */}
      <aside
        className={`hidden print:!hidden ${
          isDoingExperiment || isScanMode ? "lg:hidden" : "lg:flex"
        } flex-col ${
          sidebarCollapsed ? "w-24" : "w-72"
        } bg-[#FAF9F6] border-r border-[#E2DFD8] justify-between h-full p-6 z-30 flex-shrink-0 transition-all duration-300 relative`}
      >
        <div className="space-y-4 w-full">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3 pl-1">
            <Logo size={40} variant="circle" />
            {!sidebarCollapsed && (
              <div className="animate-fade-in">
                <h1 className="text-2xl font-black tracking-tight leading-none text-[#321E12]">Phylab</h1>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#C85A17] mt-1.5 block">
                  Vật lý thú vị quanh ta
                </span>
              </div>
            )}
          </div>

          {/* Action button - chuyển sang Quét tài liệu */}
          {sidebarCollapsed ? (
            <button
              onClick={() => {
                setActiveTab("scan");
                setProfileMenuOpen(false);
                setNotificationsOpen(false);
              }}
              title="Quét tài liệu"
              className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#DF742E] to-[#B24A0C] hover:from-[#E3813C] hover:to-[#A33E04] text-white flex items-center justify-center cursor-pointer transition-all shadow-md mx-auto"
            >
              <Camera className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : (
            <button
              onClick={() => {
                setActiveTab("scan");
                setProfileMenuOpen(false);
                setNotificationsOpen(false);
              }}
              className="w-full py-4 bg-gradient-to-r from-[#DF742E] to-[#B24A0C] hover:from-[#E3813C] hover:to-[#A33E04] text-white text-xs font-black rounded-2xl shadow-[0_4px_12px_rgba(200,90,23,0.12)] flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" /> Quét tài liệu
            </button>
          )}

          {/* Navigation Menu */}
          <nav className="space-y-1">
            {[
              { label: "Trang chủ", tab: "home" as const, icon: Home },
              { label: "Phòng Lab của tôi", tab: "lab" as const, icon: Clipboard },
              { label: "Lớp của tôi", tab: "myclass" as const, icon: GraduationCap },
              { label: "Quét tài liệu", tab: "scan" as const, icon: Camera },
              { label: "Sổ Báo Cáo", tab: "notes" as const, icon: FileText },
              { label: "Prelab", tab: "prelab" as const, icon: BookOpen }
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.tab;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveTab(item.tab);
                    // Phòng Lab / Prelab: luôn về bộ chọn 2 thí nghiệm, không nhảy thẳng vào bài đã chọn.
                    if (item.tab === "lab" || item.tab === "prelab") setActiveLessonId(null);
                    setProfileMenuOpen(false);
                    setNotificationsOpen(false);
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full py-3.5 px-4 text-xs font-black rounded-2xl flex items-center transition-all cursor-pointer ${
                    sidebarCollapsed ? "justify-center" : "gap-3"
                  } ${
                    active 
                      ? "bg-[#FFF2E6] text-[#C85A17] border-l-4 border-[#C85A17] shadow-[0_2px_6px_rgba(200,90,23,0.02)]" 
                      : "bg-transparent text-[#605248] hover:text-[#C85A17] hover:bg-[#FFF0E0]/50"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 stroke-[2.5] flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: just the "you're on the latest version" badge */}
        <div className="space-y-4">
          {!sidebarCollapsed && (
            <div className="bg-[#FFFDFB] border border-[#E2DFD8] rounded-3xl p-3.5 animate-fade-in">
              <p className="text-[10px] text-[#137333] font-extrabold flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                Bạn đang ở bản cao nhất
              </p>
            </div>
          )}
        </div>

        {/* Floating Sidebar Toggle Button (Notion-style, sitting halfway out on the right border line) */}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          className="absolute top-1/2 -right-3.5 -translate-y-1/2 w-7 h-7 rounded-full bg-[#FFFFFF] hover:bg-[#FFF2E6] border border-[#E2DFD8] flex items-center justify-center text-[#605248] hover:text-[#C85A17] shadow-sm hover:shadow-md cursor-pointer transition-all hover:scale-110 active:scale-95 z-40"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          ) : (
            <ChevronLeft className="w-4 h-4 stroke-[3]" />
          )}
        </button>
      </aside>

      {/* ================= 2. RIGHT AREA: HEADER + MAIN SCROLLABLE ================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Top Header */}
        <header className={`h-16 border-b border-[#E2DFD8] bg-[#FAF9F6] px-6 items-center justify-between flex-shrink-0 z-20 print:hidden ${isScanMode ? "hidden" : isDoingExperiment ? "hidden md:flex" : "flex"}`}>
          
          {/* Left Header Title / Breadcrumbs */}
          <div className="flex items-center gap-2">
            {/* Logo on mobile only */}
            <div className="lg:hidden flex items-center gap-2.5 mr-2">
              <Logo size={32} variant="circle" />
              <span className="text-base font-black text-[#321E12]">Phylab</span>
            </div>
            
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-[#605248]/70">
              <span className="cursor-pointer hover:text-[#C85A17] transition-colors">Phylab</span>
              <span>&gt;</span>
              <span className="text-[#321E12] font-black">
                {activeTab === "home" ? "Trang chủ" : activeTab === "lab" ? "Phòng Lab của tôi" : activeTab === "scan" ? "Quét tài liệu" : activeTab === "notes" ? "Sổ Báo Cáo" : activeTab === "myclass" ? "Lớp của tôi" : "Prelab"}
              </span>
            </div>
          </div>

          {/* Right Header: Notification + Profile Dropdowns */}
          <div className="flex items-center gap-3 relative">
            
            {/* Notification Bell Dropdown Controller */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileMenuOpen(false);
                }}
                className="relative p-2 text-[#605248] hover:text-[#C85A17] hover:bg-[#FFF2E6] rounded-xl transition-all cursor-pointer"
              >
                <Bell className="w-5 h-5 stroke-[2]" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-black border border-white">
                  2
                </span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-[min(320px,calc(100vw-24px))] bg-[#FFFFFF] border border-[#E2DFD8] rounded-2xl shadow-lg p-3.5 z-50 animate-scale-up text-xs font-bold text-[#321E12] space-y-2">
                  <div className="px-2 py-1.5 border-b border-[#E2DFD8]/60 flex justify-between items-center">
                    <p className="font-black text-[#C85A17]">Thông báo (2)</p>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[10px] text-slate-400 hover:text-[#C85A17]"
                    >
                      Đóng
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                    <div className="p-2.5 rounded-xl bg-[#FFF2E6]/50 text-[#321E12] text-left">
                      <p className="leading-snug">
                        Chào mừng <strong>{shortName}</strong> đến với <strong>Phylab</strong> — phòng thí nghiệm vật lý ảo của bạn!
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1 font-semibold">Bắt đầu bằng cách quét 1 trang SGK hoặc chọn bài thực hành ở trang chủ.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-transparent text-[#605248] text-left">
                      <p className="leading-snug">
                        Mẹo: dùng nút <strong>Quét tài liệu</strong> ở thanh bên hoặc nút camera ở dưới đáy màn hình để mở nhanh bài thí nghiệm.
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1 font-semibold">Mẹo sử dụng</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileMenuOpen(!profileMenuOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E2DFD8] px-3.5 py-1.5 rounded-xl text-xs font-black text-[#321E12] cursor-pointer select-none hover:bg-[#FFF8F0] transition-all"
              >
                <div className="w-5.5 h-5.5 rounded-full overflow-hidden bg-[#EAE8E3] border border-[#E2DFD8] flex-shrink-0 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-[#605248]" />
                </div>
                <span className="hidden sm:inline">Hồ sơ</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#605248]" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-[min(304px,calc(100vw-24px))] bg-[#FFFFFF] border border-[#E2DFD8] rounded-3xl shadow-lg p-4.5 z-50 animate-scale-up text-xs font-bold text-[#321E12] space-y-3">
                  <div className="flex items-center gap-3 pb-3 border-b border-[#E2DFD8]/60">
                    <div className="w-10 h-10 rounded-full bg-[#C85A17] text-white flex items-center justify-center font-black text-lg">
                      N
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-[#321E12] truncate">{shortName}</p>
                      <p className="text-[10px] text-[#C85A17] font-extrabold uppercase">Tài khoản PRO (Học sinh)</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-[#605248] font-bold">
                    <div className="flex justify-between">
                      <span>Lớp học:</span>
                      <span className="text-[#321E12] font-black">10A1</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trường:</span>
                      <span className="text-[#321E12] font-black truncate max-w-[120px]" title="THPT Chuyên Lê Hồng Phong">THPT Chuyên LHP</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mã HS:</span>
                      <span className="text-[#321E12] font-black">PH-2026-09</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E2DFD8]/60 space-y-2.5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide text-[#C85A17] mb-1.5">Trợ lý Phylab</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["chị", "anh"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setAssistantSettings((s) => ({ ...s, pronoun: p }))}
                            className={`py-2 rounded-xl border text-[11px] font-black transition-colors ${
                              assistantSettings.pronoun === p
                                ? "bg-[#FFF2E6] text-[#C85A17] border-[#C85A17]/40"
                                : "bg-white text-[#605248] border-[#E2DFD8] hover:bg-[#FFF8F0]"
                            }`}
                          >
                            Xưng {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wide text-[#605248] mb-1.5">Giọng văn khi chat</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {([
                          ["short", "Ngắn gọn"],
                          ["detailed", "Chi tiết"],
                        ] as const).map(([value, label]) => (
                          <button
                            key={value}
                            onClick={() => setAssistantSettings((s) => ({ ...s, answerStyle: value }))}
                            className={`py-2 rounded-xl border text-[11px] font-black transition-colors ${
                              assistantSettings.answerStyle === value
                                ? "bg-[#FFF2E6] text-[#C85A17] border-[#C85A17]/40"
                                : "bg-white text-[#605248] border-[#E2DFD8] hover:bg-[#FFF8F0]"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E2DFD8]/60 flex flex-col gap-1">
                    <button className="w-full text-left py-2 px-2.5 hover:bg-[#FFF0E0]/50 rounded-xl transition-colors cursor-pointer flex items-center gap-2 font-black text-[#605248] hover:text-[#C85A17]">
                      <Settings className="w-3.5 h-3.5" /> Cấu hình tài khoản
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left py-2 px-2.5 text-red-650 hover:bg-red-50 rounded-xl transition-colors cursor-pointer flex items-center gap-2 font-black"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Pane */}
        <main className={`flex-1 bg-[#FAF9F6] relative bg-cover bg-center bg-no-repeat ${
          isScanMode
            ? "overflow-hidden p-0"
            : isDoingExperiment
            ? "overflow-hidden p-0"
            : "overflow-y-auto p-4 md:p-6 lg:p-8 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8"
        }`} style={{ backgroundImage: isScanMode ? "none" : "url('/images/background.webp')" }}>
          <div className={`${activeTab === "lab" || isScanMode ? "max-w-none" : "max-w-[1280px] justify-between"} mx-auto w-full flex flex-col ${isDoingExperiment || isScanMode ? "h-full" : "min-h-full"}`}>
            <div className={`w-full ${isDoingExperiment || isScanMode ? "h-full flex flex-col" : ""}`}>
              {/* 0. HOME VIEW */}
              {activeTab === "home" && (
                <div className="animate-scale-up">
                  <HomeScreen
                    studentName={studentName}
                    completedCount={completedCount}
                    inProgressLabIds={activeLessonId ? [activeLessonId] : []}
                    reports={reports}
                    onNav={(tab) => setActiveTab(tab)}
                    onOpenLab={(id) => handleLessonSelect(id as LessonId)}
                    onSubjectClick={(subject) => {
                      // Cơ học → trang chính, môn khác → báo chưa có lab
                      if (subject === "Cơ học") {
                        setActiveTab("home");
                      } else {
                        showToast(`Chưa có thí nghiệm nào thuộc chủ đề "${subject}". Vui lòng quay lại sau nhé!`);
                      }
                    }}
                  />
                </div>
              )}

              {/* 1. SCAN SCREEN VIEW */}
              {activeTab === "scan" && (
                <div className="animate-scale-up h-full">
                  <ScanScreen 
                    onLessonMatched={handleLessonSelect}
                    onManualSelect={() => {
                      setActiveLessonId(null);
                      setActiveTab("lab");
                    }} 
                  />
                </div>
              )}

              {/* 2. LABORATORY BENCH VIEW — Prelab chặn 1 lần/phiên trước khi vào bàn thí nghiệm */}
              {activeTab === "lab" && (
                <div className={`animate-scale-up ${isDoingExperiment ? "h-full flex flex-col" : ""}`}>
                  {activeSpec ? (
                    !prelabPassed[activeSpec.id] ? (
                      /* Chưa qua Prelab trong phiên này: bắt buộc hoàn thành trước khi vào Lab */
                      <Prelab
                        spec={activeSpec}
                        onStartExperiment={(d) => handlePrelabComplete(activeSpec.id, d)}
                      />
                    ) : (
                    /* Phòng Lab: engine kéo-thả-nối-dây + vật lý thật (port từ φLab) */
                    <LabRoom
                      spec={activeSpec}
                      measuredD={measuredD}
                      studentName={studentName}
                      assignedSets={assignedSets}
                      assistantSettings={assistantSettings}
                      onExportNote={handleExportNote}
                      onReplayPrelab={() => setPrelabOverlay(true)}
                      onExitLab={() => setActiveLessonId(null)}
                    />
                    )
                  ) : (
                    /* CHỌN LAB — không rơi thẳng vào một bài; HS tự chọn thí nghiệm */
                    <LabChooser onSelect={handleLessonSelect} onScan={() => setActiveTab("scan")} />
                  )}
                </div>
              )}

              {/* 3. EXPERIMENT REPORTS / NOTES VIEW */}
              {activeTab === "notes" && (
                <div className="animate-scale-up">
                  <NoteSection
                    reports={reports}
                    labData={labData}
                    studentName={studentName}
                    assistantSettings={assistantSettings}
                    assignedSets={assignedSets}
                    onReportGraded={handleReportGraded}
                  />
                </div>
              )}

              {/* 3b. LỚP CỦA TÔI — tham gia lớp giáo viên + bài tập được giao */}
              {activeTab === "myclass" && (
                <div className="animate-scale-up">
                  <MyClassTab
                    studentName={studentName}
                    myClass={myClass}
                    loading={myClassLoading}
                    onRefresh={() => void refreshMyClass()}
                    onOpenLab={(id) => handleLessonSelect(id)}
                  />
                </div>
              )}

              {/* 4. PRELAB — CHỈ ĐỂ XEM (không dẫn vào thí nghiệm) */}
              {activeTab === "prelab" && (
                <div className="animate-scale-up">
                  {activeSpec ? (
                    <Prelab
                      spec={activeSpec}
                      viewOnly
                      onStartExperiment={() => setActiveLessonId(null)} // xem xong -> về danh sách Prelab
                    />
                  ) : (
                    <LabChooser onSelect={handlePrelabView} onScan={() => setActiveTab("scan")} />
                  )}
                </div>
              )}
            </div>

            {/* Decorative background bottom footer */}
            {!isDoingExperiment && !isScanMode && (
              <footer className="mt-12 text-center text-[10px] font-black text-[#605248]/30 uppercase tracking-widest pb-4 print:hidden">
                Phylab &copy; 2026 | Vietnamese Student HackAIthon
              </footer>
            )}
          </div>
        </main>
      </div>

      {/* ================= MOBILE BOTTOM FLOATING DOCK (Fixed at bottom) ================= */}
      {activeTab !== "scan" && (!activeSpec || !prelabPassed[activeSpec.id] || activeTab !== "lab") && (
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden print:hidden">
        <nav className="h-16 bg-white/85 backdrop-blur-md border border-[#E2DFD8]/80 rounded-2xl flex items-center justify-around px-2.5 shadow-[0_8px_32px_rgba(50,30,18,0.12)]">
          {/* Tab: Home */}
          <button 
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center justify-center flex-1 h-12 rounded-xl transition-all active:scale-95 cursor-pointer ${
              activeTab === "home" ? "text-[#C85A17]" : "text-[#605248]/70"
            }`}
          >
            <Home className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] font-black mt-1">Trang chủ</span>
          </button>

          {/* Tab: Lab */}
          <button
            onClick={() => { setActiveTab("lab"); setActiveLessonId(null); }}
            className={`flex flex-col items-center justify-center flex-1 h-12 rounded-xl transition-all active:scale-95 cursor-pointer ${
              activeTab === "lab" ? "text-[#C85A17]" : "text-[#605248]/70"
            }`}
          >
            <Clipboard className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] font-black mt-1">Phòng Lab</span>
          </button>

          {/* Tab: Lớp của tôi */}
          <button
            onClick={() => setActiveTab("myclass")}
            className={`flex flex-col items-center justify-center flex-1 h-12 rounded-xl transition-all active:scale-95 cursor-pointer ${
              activeTab === "myclass" ? "text-[#C85A17]" : "text-[#605248]/70"
            }`}
          >
            <GraduationCap className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] font-black mt-1">Lớp học</span>
          </button>

          {/* Floating Central Scan Button */}
          <div className="relative -translate-y-4 flex justify-center w-14">
            <button 
              onClick={() => setActiveTab("scan")}
              title="Chụp ảnh quét bài"
              className="w-14 h-14 rounded-full bg-gradient-to-br from-[#DF742E] to-[#B24A0C] text-white flex items-center justify-center shadow-lg border-4 border-[#FAF9F6] active:scale-90 hover:scale-105 transition-all cursor-pointer"
            >
              <Camera className="w-6 h-6 stroke-[2.5] animate-pulse" />
            </button>
          </div>

          {/* Tab: Notes */}
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex flex-col items-center justify-center flex-1 h-12 rounded-xl transition-all active:scale-95 cursor-pointer ${
              activeTab === "notes" ? "text-[#C85A17]" : "text-[#605248]/70"
            }`}
          >
            <FileText className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] font-black mt-1">Sổ Báo Cáo</span>
          </button>

          {/* Tab: Prelab */}
          <button
            onClick={() => { setActiveTab("prelab"); setActiveLessonId(null); }}
            className={`flex flex-col items-center justify-center flex-1 h-12 rounded-xl transition-all active:scale-95 cursor-pointer ${
              activeTab === "prelab" ? "text-[#C85A17]" : "text-[#605248]/70"
            }`}
          >
            <BookOpen className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[9px] font-black mt-1">Prelab</span>
          </button>
        </nav>
      </div>
      )}

      {/* ============ PRELAB OVERLAY — "Xem lại Prelab" từ trong phòng lab (giữ nguyên bàn thí nghiệm phía sau) ============ */}
      {prelabOverlay && activeSpec && (
        <div className="fixed inset-0 z-50 bg-[#321E12]/45 backdrop-blur-xs flex items-start justify-center overflow-auto p-3 py-6">
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => setPrelabOverlay(false)}
              className="absolute -top-2 right-1 z-10 px-3 py-1.5 bg-[#FFFFFF] border border-[#E2DFD8] rounded-xl text-xs font-black text-[#321E12] hover:bg-[#FFF0E0] transition-all cursor-pointer shadow-sm"
            >
              Đóng &times;
            </button>
            <Prelab spec={activeSpec} viewOnly onStartExperiment={() => setPrelabOverlay(false)} />
          </div>
        </div>
      )}

      {/* ================= THEORY MODAL POPUP ================= */}
      {theoryOpen && activeSpec && (
        <div className="fixed inset-0 bg-[#321E12]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-3xl border border-[#E2DFD8] w-full max-w-lg p-6 flex flex-col gap-4 relative animate-scale-up shadow-lg text-[#321E12]">
            <button
              onClick={() => setTheoryOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#E2DFD8] flex items-center justify-center hover:bg-[#FFF0E0] transition-all font-bold text-[#321E12]"
            >
              &times;
            </button>
            
            <div className="flex items-center gap-2 pb-2 border-b border-dashed border-[#C85A17]/25">
              <span className="p-2 bg-[#C85A17] rounded-xl text-white">
                <BookOpen className="w-5 h-5" />
              </span>
              <h3 className="text-base font-black text-[#321E12] uppercase tracking-wide">
                Lý thuyết bài học ({activeSpec.shortTitle})
              </h3>
            </div>
            
            <div className="text-xs space-y-3 font-semibold text-[#605248] leading-relaxed max-h-[300px] overflow-y-auto pr-1">
              <p><strong>1. Định nghĩa & Nguyên lý:</strong></p>
              <p><MathText text={activeSpec.theory.objective} /></p>

              <p><strong>2. Công thức đo lường chính:</strong></p>
              <div className="bg-[#FFF4EB] p-2.5 rounded-xl border border-brand-orange/20 text-center text-sm font-black text-brand-blue my-2">
                <MathText text={`$${activeSpec.theory.formula}$`} />
              </div>

              <p><strong>3. Hướng dẫn các bước đo:</strong></p>
              <ol className="list-decimal pl-4 space-y-1 text-[10px] font-bold text-slate-500">
                {activeSpec.steps.map((st, idx) => (
                  <li key={st.id}>
                    <strong>{st.title}:</strong> {st.assistant}
                  </li>
                ))}
              </ol>
            </div>
            
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setTheoryOpen(false)}
                className="px-5 py-2 bg-[#D56A17] text-white text-xs font-black rounded-xl hover:bg-[#B55210]"
              >
                Tôi đã hiểu lý thuyết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cozy claymorphic toast notification */}
      {toastMsg && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 left-6 sm:left-auto sm:max-w-sm bg-white/95 backdrop-blur-md border-2 border-[#C85A17]/30 rounded-2xl p-4 shadow-lg z-50 animate-[slideUp_0.25s_ease-out] text-[#321E12] font-nunito flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#FFF2E6] text-[#C85A17] flex items-center justify-center flex-shrink-0 border border-[#C85A17]/10">
            <AlertTriangle className="w-4.5 h-4.5 stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-black leading-snug">{toastMsg}</p>
          </div>
          <button 
            onClick={() => setToastMsg(null)}
            className="text-[#605248] hover:text-[#C85A17] text-sm font-bold flex-shrink-0 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
