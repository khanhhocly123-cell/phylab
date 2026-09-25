"use client";

import React, { useState } from "react";
import {
  Camera, BookOpen, Clipboard,
  Settings, LogOut, Cloud, CloudOff,
  FileText, Home, ChevronDown, Sparkles,
  ChevronLeft, ChevronRight, AlertTriangle, GraduationCap,
  Compass, Lock, NotebookPen, ShieldCheck
} from "lucide-react";
import LandingPage from "@/components/landing/LandingPage";
import UpdatesMenu from "@/components/account/UpdatesMenu";
import AccountPanel from "@/components/account/AccountPanel";
import AdminPanel from "@/components/admin/AdminPanel";
import ScanScreen from "@/components/ScanScreen";
import LabRoom, { LabExportPayload } from "@/components/lab/LabRoom";
import LabHub from "@/components/lab/LabHub";
import NoteSection from "@/components/NoteSection";
import Prelab from "@/components/Prelab";
import HomeScreen from "@/components/HomeScreen";
import Logo from "@/components/Logo";
import TeacherShell from "@/components/teacher/TeacherShell";
import MyClassTab from "@/components/student/MyClassTab";
import { MathText } from "@/components/Latex";
import { getExperimentSpec } from "@/experiments/specs";
import { LessonId, ExperimentReport, RichTrial } from "@/lib/types";
import { useMyClass } from "@/lib/useMyClass";
import { getStudentId, logActivity } from "@/lib/activity";
import { hasSeenTour, isTourOpen, markTourSeen, setTourEntry, subscribeTours, tourEntryJson } from "@/lib/tourState";
import {
  LOCAL_KEYS, fetchMe, forgetLocalAccount, readCachedAccount, readLocal, readTeacherToken, rememberAccount, writeLocal,
} from "@/lib/accountClient";
import { ROLE_LABEL, type PublicAccount } from "@/lib/accountTypes";
import { describeSync, useCloudSync, type SyncSnapshot } from "@/lib/cloudSync";
import type { SyncKey } from "@/lib/syncMerge";
import { APP_RELEASE, UPDATES, unreadCount } from "@/data/changelog";
import GuidedTour from "@/components/tour/GuidedTour";
import HelpMenu from "@/components/tour/HelpMenu";
import { notesTour, safetySteps, studentTour } from "@/components/tour/tours";
import { CLASSROOM_LOCKED_MESSAGE, FEATURES } from "@/lib/features";
import { enterLandscape } from "@/lib/orientation";
import { safetyKindOf } from "@/components/tour/SafetyDeck";
import { OPEN_LABS } from "@/data/labCatalog";

// Nhóm dụng cụ của các bài đang mở (thêm bài quang/nhiệt là mục An toàn tự có phần tương ứng).
const OPEN_SAFETY_KINDS = [...new Set(OPEN_LABS.map((l) => safetyKindOf(l.subject)))];
import type { LabAssignmentPayload } from "@/lib/classTypes";

type AppTab = "home" | "scan" | "lab" | "notes" | "myclass";
const APP_TABS: AppTab[] = ["home", "scan", "lab", "notes", "myclass"];

/** Số đo vừa xuất từ Phòng Lab chờ lập báo cáo; `at` để đồng bộ giữa các máy (bản mới hơn thắng). */
type LabData = { lessonId: string; trials: RichTrial[]; at?: number };

export default function Page() {
  // Tài khoản đang đăng nhập (null = chưa → trang chào). Tên / vai trò suy ra từ tài khoản.
  const [account, setAccount] = useState<PublicAccount | null>(null);
  const studentName = account?.name ?? null;
  const role = account?.role ?? "student";
  const accountId = account?.id ?? null;
  const [teacherToken, setTeacherToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
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

  const [theoryOpen, setTheoryOpen] = useState(false);
  // Bài đang mở "Xem lại Prelab" dạng lớp phủ (từ bàn thí nghiệm hoặc từ danh sách bài).
  const [reviewPrelabId, setReviewPrelabId] = useState<LessonId | null>(null);
  const [measuredD, setMeasuredD] = useState(0.0182); // đường kính bi mặc định 18,20mm (mét), cập nhật từ Prelab

  // Collapse sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Header dropdown states
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Lịch sử báo cáo trong Sổ Báo Cáo — lưu trên máy và đồng bộ theo tài khoản.
  const [reports, setReports] = useState<ExperimentReport[]>([]);
  const completedCount = React.useMemo(() => new Set(reports.map((r) => r.lessonId)).size, [reports]);

  // Dữ liệu đo giàu thông tin vừa xuất từ phòng Lab, chờ lập báo cáo ở Sổ Báo Cáo.
  const [labData, setLabData] = useState<LabData | null>(null);

  // Thông báo cập nhật (chuông): các mục đã đọc, và các mục còn mới lúc vừa mở chuông.
  const [updatesSeen, setUpdatesSeen] = useState<string[]>([]);
  const [freshUpdates, setFreshUpdates] = useState<string[]>([]);

  // Mở app: dùng ngay tài khoản + tiến độ nhớ trên máy (local-first), rồi kiểm phiên với máy chủ.
  React.useEffect(() => {
    const cached = readCachedAccount();
    const savedTab = localStorage.getItem("activeTab");
    const savedLesson = localStorage.getItem("activeLessonId");
    /* eslint-disable react-hooks/set-state-in-effect -- đọc localStorage sau khi hydrate (trang "/" prerender tĩnh) */
    setAccount(cached);
    setTeacherToken(cached ? readTeacherToken() : null);
    setPrelabPassed(readLocal<Record<string, boolean>>(LOCAL_KEYS.prelabPassed, {}));
    setReports(readLocal<ExperimentReport[]>(LOCAL_KEYS.reports, []));
    setLabData(readLocal<LabData | null>(LOCAL_KEYS.labData, null));
    setUpdatesSeen(readLocal<string[]>(LOCAL_KEYS.updatesSeen, []));
    if (savedTab === "prelab") {
      // Tab Prelab cũ đã gộp vào Phòng Lab (Prelab là chặng 1 của mỗi bài).
      setActiveTab("lab");
    } else if (savedTab && (APP_TABS as string[]).includes(savedTab) && (savedTab !== "myclass" || FEATURES.classroom)) {
      setActiveTab(savedTab as AppTab);
    }
    if (savedLesson) setActiveLessonId(savedLesson);
    setCheckingAuth(false);
    /* eslint-enable react-hooks/set-state-in-effect */

    let alive = true;
    void fetchMe().then((me) => {
      if (!alive) return;
      if (me.state === "ok") {
        setAccount(me.user);
        setTeacherToken(me.teacherToken ?? null);
        rememberAccount(me.user, me.teacherToken);
      } else if (me.state === "anon" && cached) {
        // Phiên hết hạn / đăng xuất ở máy khác: quên tài khoản, GIỮ tiến độ trên máy (đăng nhập lại là gộp vào).
        writeLocal(LOCAL_KEYS.account, null);
        writeLocal(LOCAL_KEYS.teacherToken, null);
        setAccount(null);
        setTeacherToken(null);
      }
      // "offline": giữ tài khoản nhớ trên máy, học tiếp bình thường.
    });
    return () => {
      alive = false;
    };
  }, []);

  // Lưu trạng thái trên máy (chỉ khi đã đăng nhập).
  React.useEffect(() => {
    if (accountId) localStorage.setItem("activeTab", activeTab);
  }, [activeTab, accountId]);

  React.useEffect(() => {
    if (!accountId) return;
    if (activeLessonId) localStorage.setItem("activeLessonId", activeLessonId);
    else localStorage.removeItem("activeLessonId");
  }, [activeLessonId, accountId]);

  React.useEffect(() => {
    if (!accountId) return;
    writeLocal(LOCAL_KEYS.prelabPassed, prelabPassed);
    writeLocal(LOCAL_KEYS.reports, reports);
    writeLocal(LOCAL_KEYS.labData, labData);
    writeLocal(LOCAL_KEYS.updatesSeen, updatesSeen);
  }, [accountId, prelabPassed, reports, labData, updatesSeen]);

  /** Rời tài khoản trên máy này. `clearProgress`: đăng xuất chủ động → xoá cả tiến độ trên máy (máy chủ vẫn giữ). */
  const signOutLocally = (clearProgress: boolean) => {
    if (clearProgress) {
      forgetLocalAccount();
      setPrelabPassed({});
      setReports([]);
      setLabData(null);
      setUpdatesSeen([]);
    } else {
      writeLocal(LOCAL_KEYS.account, null);
      writeLocal(LOCAL_KEYS.teacherToken, null);
    }
    setAccount(null);
    setTeacherToken(null);
    setActiveLessonId(null);
    setActiveTab("home");
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
    setAccountOpen(false);
    setAdminOpen(false);
  };

  // ── Đồng bộ tiến độ với tài khoản: Prelab đã qua, báo cáo, số đo chờ báo cáo, hướng dẫn, thông báo đã đọc ──
  const toursJson = React.useSyncExternalStore(subscribeTours, () => tourEntryJson(studentName), () => "{}");
  const syncSnapshot = React.useMemo<SyncSnapshot>(
    () => ({ prelabPassed, reports, labData, updatesSeen, tours: JSON.parse(toursJson) as unknown }),
    [prelabPassed, reports, labData, updatesSeen, toursJson]
  );
  const { engine: syncEngine, status: syncStatus } = useCloudSync(accountId, syncSnapshot, {
    apply: (key: SyncKey, value: unknown) => {
      if (key === "prelabPassed") setPrelabPassed(value as Record<string, boolean>);
      else if (key === "reports") setReports(value as ExperimentReport[]);
      else if (key === "labData") setLabData(value as LabData | null);
      else if (key === "updatesSeen") setUpdatesSeen(value as string[]);
      else setTourEntry(studentName, value as Record<string, number>);
    },
    onUnauthorized: () => signOutLocally(false),
  });

  const unreadUpdates = unreadCount(updatesSeen);
  const toggleUpdates = () => {
    if (!notificationsOpen) {
      setFreshUpdates(UPDATES.filter((u) => !updatesSeen.includes(u.id)).map((u) => u.id));
      if (unreadUpdates > 0) setUpdatesSeen((prev) => [...new Set([...prev, ...UPDATES.map((u) => u.id)])]);
      setProfileMenuOpen(false);
    }
    setNotificationsOpen(!notificationsOpen);
  };

  // ── Lớp học: dữ liệu "Lớp của tôi" (đề GV giao + trạng thái nộp) ──
  const { myClass, loading: myClassLoading, refresh: refreshMyClass } = useMyClass(
    FEATURES.classroom && !!studentName && role === "student"
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

  // Trạng thái hiển thị ở danh sách bài: bài nào GV giao, bài nào đã có số liệu trong Sổ Báo Cáo.
  const assignedLessonIds = React.useMemo(
    () => (myClass?.assignments ?? [])
      .filter((s) => s.assignment.kind === "lab" && s.assignment.lessonId)
      .map((s) => s.assignment.lessonId as string),
    [myClass]
  );
  const completedLessonIds = React.useMemo(() => {
    const ids = new Set(reports.map((r) => r.lessonId));
    if (labData?.lessonId) ids.add(labData.lessonId);
    return [...ids];
  }, [reports, labData]);
  const reviewSpec = reviewPrelabId ? getExperimentSpec(reviewPrelabId) : null;

  // Esc đóng lớp phủ "Xem lại Prelab".
  React.useEffect(() => {
    if (!reviewPrelabId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setReviewPrelabId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reviewPrelabId]);

  // Overall grades/stats
  const [, setReportSubmitted] = useState(false);
  const [, setGpaScore] = useState<number | null>(null);

  const activeSpec = activeLessonId ? getExperimentSpec(activeLessonId) : null;
  const isDoingExperiment = activeTab === "lab" && activeLessonId !== null && !!prelabPassed[activeLessonId];
  const isScanMode = activeTab === "scan";
  // Đang làm Prelab (chặng 1): trên điện thoại ẩn thanh điều hướng dưới để chân trang "Bước x / n"
  // của Prelab nằm sát đáy màn hình (có nút ← về danh sách bài ở đầu Prelab).
  const isPrelabOpen = activeTab === "lab" && !!activeSpec && !prelabPassed[activeSpec.id];

  // ── Hướng dẫn: tự mở lần đầu học sinh (và admin test) vào app (không chen vào lúc đang làm thí nghiệm / đang quét) ──
  // Đợi lần đồng bộ đầu xong: tài khoản đã xem hướng dẫn ở máy khác thì máy mới không hỏi lại.
  const [tour, setTour] = useState<null | "app" | "safety" | "notes">(null);
  const syncSettled = syncStatus.state !== "idle" && syncStatus.state !== "syncing";
  React.useEffect(() => {
    if (checkingAuth || !syncSettled || role === "teacher" || !studentName || isDoingExperiment || isScanMode || tour) return;
    if (hasSeenTour(studentName, "app")) return;
    const timer = window.setTimeout(() => {
      if (!isTourOpen() && !hasSeenTour(studentName, "app")) setTour("app");
    }, 800);
    return () => window.clearTimeout(timer);
  }, [checkingAuth, syncSettled, role, studentName, isDoingExperiment, isScanMode, tour]);
  React.useEffect(() => {
    if (activeTab !== "notes" || checkingAuth || !syncSettled || role === "teacher" || !studentName || tour) return;
    if (!hasSeenTour(studentName, "app") || hasSeenTour(studentName, "notes")) return;
    const timer = window.setTimeout(() => {
      if (!isTourOpen() && !hasSeenTour(studentName, "notes")) setTour("notes");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activeTab, checkingAuth, syncSettled, role, studentName, tour]);
  const tourSteps = React.useMemo(
    () =>
      tour === "app" ? studentTour({ name: studentName ?? "", goHome: () => setActiveTab("home") })
        : tour === "notes" ? notesTour()
          : tour === "safety" ? safetySteps({ withGear: OPEN_SAFETY_KINDS })
            : [],
    [tour, studentName]
  );
  const closeTour = (finished: boolean) => {
    if (tour === "app") {
      // Đi hết chuyến (qua cả phần An toàn) thì nhận huy hiệu An toàn PTN.
      if (finished) markTourSeen(studentName, "app", "badge-safety");
      else markTourSeen(studentName, "app");
      if (finished) {
        setActiveLessonId(null);
        setActiveTab("lab");
      }
    }
    if (tour === "notes") markTourSeen(studentName, "notes");
    setTour(null);
  };
  const helpItems = [
    { icon: Compass, label: "Tham quan PhyLab", desc: "Đi một vòng các chức năng chính", onClick: () => setTour("app") },
    { icon: NotebookPen, label: "Hướng dẫn Sổ Báo Cáo", desc: "Số liệu, đồ thị tự vẽ, báo cáo", tone: "#1D5FAF", onClick: () => { setActiveTab("notes"); setTour("notes"); } },
    { icon: ShieldCheck, label: "An toàn phòng thí nghiệm", desc: "Săn nguy hiểm, kí hiệu, biển báo, quy tắc", tone: "#047857", onClick: () => setTour("safety") },
  ].map((item) => ({ ...item, onClick: () => { setProfileMenuOpen(false); setNotificationsOpen(false); item.onClick(); } }));

  React.useEffect(() => {
    if (isDoingExperiment) {
      setSidebarCollapsed(true);
    }
  }, [isDoingExperiment]);

  // Ghi hoạt động "vào phòng Lab" cho dashboard giáo viên.
  React.useEffect(() => {
    if (FEATURES.classroom && isDoingExperiment && studentName && role === "student") {
      logActivity("lab_start", studentName, activeLessonId || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoingExperiment]);

  // Đăng xuất (mọi vai trò): đẩy nốt tiến độ chưa lưu, xoá phiên trên máy chủ, quên tài khoản trên máy.
  // GIỮ studentId — định danh thiết bị cho tính năng lớp học.
  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await syncEngine.flush();
    syncEngine.stop();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    signOutLocally(true);
  };

  // Công cụ test của admin (AdminPanel).
  const unlockAllPrelabs = () =>
    setPrelabPassed((prev) => ({ ...prev, ...Object.fromEntries(OPEN_LABS.map((l) => [l.id, true])) }));
  const replayTours = () => {
    // Gộp chỉ cộng thêm nên phải xoá mục hướng dẫn trên máy chủ; mất mạng thì xoá trên máy thôi.
    void syncEngine.reset(["tours"]).then((ok) => {
      if (!ok) setTourEntry(studentName, {});
    });
  };

  // Chọn/nhận diện bài -> sang tab Lab; nếu chưa hoàn thành Prelab của bài,
  // Prelab (chặng 1) hiện trước bàn thí nghiệm (xem render tab "lab").
  // Không xóa labData ở đây: số liệu vừa đo của bài trước vẫn còn trong Sổ Báo Cáo.
  const handleLessonSelect = (lessonId: LessonId) => {
    setActiveLessonId(lessonId);
    setReportSubmitted(false);
    setGpaScore(null);
    setTheoryOpen(false);
    setReviewPrelabId(null);
    setActiveTab("lab");
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
    // Đã qua Prelab → vào thẳng bàn thí nghiệm: điện thoại tự xoay ngang (cần đúng cú bấm này).
    if (prelabPassed[lessonId]) void enterLandscape();
  };

  // Hoàn thành Prelab (đã khóa dây dọi / đo bi thép / nắm an toàn điện) -> mở khóa phòng Lab của bài đó.
  const handlePrelabComplete = (lessonId: LessonId, d?: number) => {
    if (d && d > 0) setMeasuredD(d);
    setPrelabPassed((prev) => ({ ...prev, [lessonId]: true }));
    void enterLandscape();
  };

  // Nhận số liệu xuất từ engine phòng Lab -> giữ dữ liệu giàu thông tin + sang Sổ Báo Cáo.
  const handleExportNote = (payload: LabExportPayload) => {
    const rich: RichTrial[] = (payload.trials || []).map((tr) => {
      const lab = String((tr as { lab?: string }).lab || payload.lab) as RichTrial["lab"];
      const t = lab === "ohm-x" || lab === "ohm-y"
        ? Number((tr as { current?: number }).current) || 0
        : lab === "emf"
          ? 1
          : Number((tr as { t?: number }).t) || 0;
      const sEF = (tr as { sEF?: number | null }).sEF;
      // freefall dùng s; average dùng sEF; instant dùng đường kính bi (mm -> m).
      const s = lab === "ohm-x" || lab === "ohm-y"
        ? Number((tr as { voltage?: number }).voltage) || 0
        : lab === "emf"
          ? Number((tr as { emf?: number; s?: number }).emf ?? (tr as { s?: number }).s) || 0
        : lab === "freefall" || lab === "newton2"
        ? Number((tr as { s?: number }).s) || 0
        : lab === "average"
          ? Number(sEF) || 0
          : (payload.measuredD || 0) / 1000;
      return {
        ...(tr as unknown as Partial<RichTrial>), lab, s, t,
        theta: (tr as { theta?: number }).theta,
        balanced: (tr as { balanced?: boolean }).balanced !== false,
      };
    }).filter((m) => m.t > 0);
    if (rich.length === 0) return;

    setLabData({ lessonId: activeLessonId || "", trials: rich, at: Date.now() });
    setActiveTab("notes");
    showToast(`Đã lưu ${rich.length} số đo vào Sổ Báo Cáo.`);
  };

  // Nhận báo cáo HS lưu ở Sổ Báo Cáo -> lưu vào lịch sử + NỘP cho giáo viên nếu có assignment.
  // (Phần chấm điểm phía học sinh đang tạm gỡ để làm lại; server vẫn tự tính điểm cho GV.)
  const handleReportSaved = (report: ExperimentReport) => {
    setReports((prev) => [report, ...prev]);

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
        }),
      })
        .then((res) => {
          if (res.ok) {
            showToast("Đã lưu báo cáo và nộp bài Lab cho giáo viên ✓");
            void refreshMyClass();
          } else {
            showToast("Đã lưu báo cáo, nhưng chưa nộp được cho giáo viên — thử lại sau.");
          }
        })
        .catch(() => showToast("Đã lưu báo cáo, nhưng chưa nộp được cho giáo viên — kiểm tra mạng."));
    } else {
      showToast("Đã lưu báo cáo vào Sổ Báo Cáo ✓");
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
  if (studentName && role === "teacher" && teacherToken && !FEATURES.classroom) {
    return <ClassroomLocked name={studentName} onLogout={handleLogout} />;
  }
  if (studentName && role === "teacher" && teacherToken) {
    return (
      <TeacherShell teacherName={studentName} token={teacherToken} onLogout={handleLogout} />
    );
  }

  // Chưa đăng nhập → trang chào (Đăng ký / Đăng nhập ở /dang-ky, /dang-nhap).
  if (!account) {
    return <LandingPage />;
  }

  const shortName = account.name.split(" (")[0];
  const initial = shortName.trim().charAt(0).toUpperCase() || "?";
  const syncOk = syncStatus.state === "synced" || syncStatus.state === "syncing";

  return (
    <div className={`flex flex-col lg:flex-row h-[100dvh] w-screen bg-[#FAF9F6] text-[#321E12] font-nunito overflow-hidden select-none ${
      isDoingExperiment || isScanMode || isPrelabOpen ? "pb-0" : "pb-16"
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
              data-tour="scan"
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
              data-tour="scan"
              className="w-full py-4 bg-gradient-to-r from-[#DF742E] to-[#B24A0C] hover:from-[#E3813C] hover:to-[#A33E04] text-white text-xs font-black rounded-2xl shadow-[0_4px_12px_rgba(200,90,23,0.12)] flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" /> Quét tài liệu
            </button>
          )}

          {/* Navigation Menu */}
          <nav className="space-y-1" data-tour="nav">
            {[
              { label: "Trang chủ", tab: "home" as const, icon: Home },
              { label: "Phòng Lab của tôi", tab: "lab" as const, icon: Clipboard },
              { label: "Lớp của tôi", tab: "myclass" as const, icon: GraduationCap },
              { label: "Quét tài liệu", tab: "scan" as const, icon: Camera },
              { label: "Sổ Báo Cáo", tab: "notes" as const, icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.tab;
              const locked = item.tab === "myclass" && !FEATURES.classroom;
              return (
                <button
                  key={item.label}
                  aria-disabled={locked || undefined}
                  onClick={() => {
                    if (locked) {
                      showToast(CLASSROOM_LOCKED_MESSAGE);
                      return;
                    }
                    setActiveTab(item.tab);
                    // Phòng Lab: luôn về danh sách bài, không nhảy thẳng vào bài đã chọn trước đó.
                    if (item.tab === "lab") setActiveLessonId(null);
                    setProfileMenuOpen(false);
                    setNotificationsOpen(false);
                  }}
                  title={locked ? "Tạm khoá" : sidebarCollapsed ? item.label : undefined}
                  className={`w-full py-3.5 px-4 text-xs font-black rounded-2xl flex items-center transition-all ${
                    sidebarCollapsed ? "justify-center" : "gap-3"
                  } ${
                    locked
                      ? "bg-transparent text-[#605248]/40 cursor-not-allowed"
                      : active
                        ? "bg-[#FFF2E6] text-[#C85A17] border-l-4 border-[#C85A17] shadow-[0_2px_6px_rgba(200,90,23,0.02)] cursor-pointer"
                        : "bg-transparent text-[#605248] hover:text-[#C85A17] hover:bg-[#FFF0E0]/50 cursor-pointer"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 stroke-[2.5] flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  {locked && !sidebarCollapsed && <Lock className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: phiên bản + lối tắt tới "Có gì mới" */}
        <div className="space-y-4">
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={() => { if (!notificationsOpen) toggleUpdates(); }}
              className="w-full text-left bg-[#FFFDFB] hover:bg-[#FFF7EF] border border-[#E2DFD8] rounded-3xl p-3.5 animate-fade-in cursor-pointer transition-colors"
            >
              <p className="text-[10px] text-[#C85A17] font-black flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                PhyLab {APP_RELEASE.name}
              </p>
              <p className="text-[10px] text-[#605248] font-bold mt-1">
                {unreadUpdates > 0 ? `${unreadUpdates} cập nhật mới — xem ngay` : "Xem có gì mới"}
              </p>
            </button>
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
        <header className={`h-16 border-b border-[#E2DFD8] bg-[#FAF9F6] px-6 items-center justify-between flex-shrink-0 z-20 print:hidden ${isScanMode || isDoingExperiment ? "hidden" : "flex"}`}>
          
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
              {activeTab === "lab" && activeSpec ? (
                <>
                  <button type="button" onClick={() => setActiveLessonId(null)} className="cursor-pointer hover:text-[#C85A17] transition-colors">Phòng Lab</button>
                  <span>&gt;</span>
                  <span className="text-[#321E12] font-black">{activeSpec.shortTitle} · Prelab</span>
                </>
              ) : (
                <span className="text-[#321E12] font-black">
                  {activeTab === "home" ? "Trang chủ" : activeTab === "lab" ? "Phòng Lab" : activeTab === "scan" ? "Quét tài liệu" : activeTab === "notes" ? "Sổ Báo Cáo" : "Lớp của tôi"}
                </span>
              )}
            </div>
          </div>

          {/* Right Header: Notification + Profile Dropdowns */}
          <div className="flex items-center gap-1.5 sm:gap-3 relative">
            <HelpMenu items={helpItems} />

            {/* Chuông thông báo: những gì PhyLab vừa cập nhật (src/data/changelog.ts) */}
            <UpdatesMenu
              open={notificationsOpen}
              fresh={freshUpdates}
              seen={updatesSeen}
              onToggle={toggleUpdates}
              onClose={() => setNotificationsOpen(false)}
              onOpenLesson={(id) => handleLessonSelect(id as LessonId)}
            />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileMenuOpen(!profileMenuOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E2DFD8] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-black text-[#321E12] cursor-pointer select-none hover:bg-[#FFF8F0] transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-[#C85A17] text-white flex-shrink-0 flex items-center justify-center text-[11px] font-black">
                  {initial}
                </div>
                <span className="hidden sm:inline max-w-[110px] truncate">{shortName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#605248]" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-[min(304px,calc(100vw-24px))] bg-[#FFFFFF] border border-[#E2DFD8] rounded-3xl shadow-lg p-4.5 z-50 animate-scale-up text-xs font-bold text-[#321E12] space-y-3">
                  <div className="flex items-center gap-3 pb-3 border-b border-[#E2DFD8]/60">
                    <div className="w-10 h-10 rounded-full bg-[#C85A17] text-white flex flex-shrink-0 items-center justify-center font-black text-lg">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-[#321E12] truncate">{shortName}</p>
                      <p className="text-[10px] text-[#C85A17] font-extrabold uppercase">{ROLE_LABEL[role]}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-[#605248] font-bold">
                    <div className="flex justify-between gap-3">
                      <span className="flex-shrink-0">Email:</span>
                      <span className="text-[#321E12] font-black truncate" title={account.email}>{account.email}</span>
                    </div>
                    {account.grade && (
                      <div className="flex justify-between gap-3">
                        <span className="flex-shrink-0">Lớp:</span>
                        <span className="text-[#321E12] font-black">Lớp {account.grade}</span>
                      </div>
                    )}
                    {account.school && (
                      <div className="flex justify-between gap-3">
                        <span className="flex-shrink-0">Trường:</span>
                        <span className="text-[#321E12] font-black truncate" title={account.school}>{account.school}</span>
                      </div>
                    )}
                    <div className={`flex items-start gap-1.5 rounded-xl px-2.5 py-2 ${syncOk ? "bg-[#E8F5EC] text-[#137333]" : "bg-[#FFF7EF] text-[#9A4A0C]"}`}>
                      {syncOk ? <Cloud className="w-3.5 h-3.5 mt-px flex-shrink-0" /> : <CloudOff className="w-3.5 h-3.5 mt-px flex-shrink-0" />}
                      <span className="text-[10.5px] leading-snug">{describeSync(syncStatus)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E2DFD8]/60 flex flex-col gap-1">
                    <button
                      onClick={() => { setProfileMenuOpen(false); setAccountOpen(true); }}
                      className="w-full text-left py-2 px-2.5 hover:bg-[#FFF0E0]/50 rounded-xl transition-colors cursor-pointer flex items-center gap-2 font-black text-[#605248] hover:text-[#C85A17]"
                    >
                      <Settings className="w-3.5 h-3.5" /> Tài khoản
                    </button>
                    {role === "admin" && (
                      <button
                        onClick={() => { setProfileMenuOpen(false); setAdminOpen(true); }}
                        className="w-full text-left py-2 px-2.5 hover:bg-[#FFF0E0]/50 rounded-xl transition-colors cursor-pointer flex items-center gap-2 font-black text-[#605248] hover:text-[#C85A17]"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Quản trị PhyLab
                      </button>
                    )}
                    <button
                      onClick={() => void handleLogout()}
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
            : isPrelabOpen
            ? "overflow-y-auto p-2 sm:p-4 md:p-6 lg:p-8 pb-0 sm:pb-0 md:pb-0 lg:pb-8"
            : "overflow-y-auto p-4 md:p-6 lg:p-8 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8"
        }`} style={{ backgroundImage: isScanMode ? "none" : "url('/images/background.webp')" }}>
          <div className={`${activeTab === "lab" || isScanMode ? "max-w-none" : "max-w-[1280px] justify-between"} mx-auto w-full flex flex-col ${isDoingExperiment || isScanMode ? "h-full" : "min-h-full"}`}>
            <div className={`w-full ${isDoingExperiment || isScanMode ? "h-full flex flex-col" : ""}`}>
              {/* 0. HOME VIEW */}
              {activeTab === "home" && (
                <div className="animate-scale-up">
                  <HomeScreen
                    studentName={account.name}
                    completedCount={completedCount}
                    inProgressLabIds={activeLessonId ? [activeLessonId] : []}
                    reports={reports}
                    onNav={(tab) => {
                      if (tab === "myclass" && !FEATURES.classroom) {
                        showToast(CLASSROOM_LOCKED_MESSAGE);
                        return;
                      }
                      // "Vào Phòng Lab" luôn mở danh sách bài, giống thanh điều hướng.
                      if (tab === "lab") setActiveLessonId(null);
                      setActiveTab(tab);
                    }}
                    onOpenLab={(id) => handleLessonSelect(id as LessonId)}
                    onSubjectClick={(subject) => {
                      // Cơ học và Điện đã có phòng Lab hoạt động.
                      if (subject === "Cơ học" || subject === "Điện") {
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

              {/* 2. PHÒNG LAB — danh sách bài → Prelab (chặng 1, bắt buộc 1 lần) → bàn thí nghiệm */}
              {activeTab === "lab" && (
                <div className={`animate-scale-up ${isDoingExperiment ? "h-full flex flex-col" : ""}`}>
                  {activeSpec ? (
                    !prelabPassed[activeSpec.id] ? (
                      <Prelab
                        key={activeSpec.id}
                        spec={activeSpec}
                        studentName={studentName ?? undefined}
                        onStartExperiment={(d) => handlePrelabComplete(activeSpec.id, d)}
                        onExit={() => setActiveLessonId(null)}
                      />
                    ) : (
                      /* Bàn thí nghiệm: engine kéo-thả-nối-dây + vật lý thật (port từ φLab) */
                      <LabRoom
                        spec={activeSpec}
                        measuredD={measuredD}
                        studentName={account.name}
                        assignedSets={assignedSets}
                        onExportNote={handleExportNote}
                        onReplayPrelab={() => setReviewPrelabId(activeSpec.id)}
                        onExitLab={() => setActiveLessonId(null)}
                      />
                    )
                  ) : (
                    <LabHub
                      prelabPassed={prelabPassed}
                      completedLessonIds={completedLessonIds}
                      assignedLessonIds={assignedLessonIds}
                      onStart={handleLessonSelect}
                      onReviewPrelab={setReviewPrelabId}
                      onScan={() => setActiveTab("scan")}
                    />
                  )}
                </div>
              )}

              {/* 3. EXPERIMENT REPORTS / NOTES VIEW */}
              {activeTab === "notes" && (
                <div className="animate-scale-up">
                  <NoteSection
                    reports={reports}
                    labData={labData}
                    studentName={account.name}
                    hasAssignment={!!labData && assignedLessonIds.includes(labData.lessonId)}
                    onReportSaved={handleReportSaved}
                  />
                </div>
              )}

              {/* 3b. LỚP CỦA TÔI — tham gia lớp giáo viên + bài tập được giao */}
              {FEATURES.classroom && activeTab === "myclass" && (
                <div className="animate-scale-up">
                  <MyClassTab
                    studentName={account.name}
                    myClass={myClass}
                    loading={myClassLoading}
                    onRefresh={() => void refreshMyClass()}
                    onOpenLab={(id) => handleLessonSelect(id)}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ================= MOBILE BOTTOM FLOATING DOCK (Fixed at bottom) ================= */}
      {activeTab !== "scan" && !isDoingExperiment && !isPrelabOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden print:hidden">
        <nav data-tour="dock" className="h-16 bg-white/85 backdrop-blur-md border border-[#E2DFD8]/80 rounded-2xl flex items-center justify-around px-2.5 shadow-[0_8px_32px_rgba(50,30,18,0.12)]">
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

          {/* Floating Central Scan Button */}
          <div className="relative -translate-y-4 flex justify-center w-14">
            <button 
              onClick={() => setActiveTab("scan")}
              title="Chụp ảnh quét bài"
              data-tour="dock-scan"
              className="w-14 h-14 rounded-full bg-gradient-to-br from-[#DF742E] to-[#B24A0C] text-white flex items-center justify-center shadow-lg border-4 border-[#FAF9F6] active:scale-90 hover:scale-105 transition-all cursor-pointer"
            >
              <Camera className="w-6 h-6 stroke-[2.5] animate-pulse" />
            </button>
          </div>

          {/* Tab: Lớp của tôi */}
          <button
            onClick={() => (FEATURES.classroom ? setActiveTab("myclass") : showToast(CLASSROOM_LOCKED_MESSAGE))}
            aria-disabled={!FEATURES.classroom || undefined}
            title={FEATURES.classroom ? undefined : "Tạm khoá"}
            className={`relative flex flex-col items-center justify-center flex-1 h-12 rounded-xl transition-all active:scale-95 cursor-pointer ${
              !FEATURES.classroom ? "text-[#605248]/35" : activeTab === "myclass" ? "text-[#C85A17]" : "text-[#605248]/70"
            }`}
          >
            <GraduationCap className="w-5 h-5 stroke-[2.5]" />
            {!FEATURES.classroom && <Lock className="absolute top-1 right-[calc(50%-18px)] w-3 h-3" />}
            <span className="text-[9px] font-black mt-1">Lớp học</span>
          </button>

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

        </nav>
      </div>
      )}

      {/* ============ XEM LẠI PRELAB — lớp phủ, giữ nguyên bàn thí nghiệm / danh sách phía sau ============ */}
      {reviewSpec && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Xem lại Prelab — ${reviewSpec.shortTitle}`}
          onClick={(e) => { if (e.target === e.currentTarget) setReviewPrelabId(null); }}
          className="fixed inset-0 z-[70] bg-[#321E12]/45 backdrop-blur-xs overflow-auto p-1.5 py-3 sm:p-6"
        >
          <Prelab key={reviewSpec.id} spec={reviewSpec} studentName={studentName ?? undefined} viewOnly onStartExperiment={() => setReviewPrelabId(null)} />
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

      {accountOpen && (
        <AccountPanel
          account={account}
          sync={syncStatus}
          onClose={() => setAccountOpen(false)}
          onUpdated={(user) => {
            setAccount(user);
            rememberAccount(user, teacherToken ?? undefined);
          }}
          onDeleted={() => {
            syncEngine.stop();
            signOutLocally(true);
          }}
        />
      )}

      {adminOpen && role === "admin" && (
        <AdminPanel
          onClose={() => setAdminOpen(false)}
          onUnlockAll={unlockAllPrelabs}
          onReplayTours={replayTours}
          onResetProgress={() => syncEngine.reset()}
        />
      )}

      {tour && (
        <GuidedTour
          key={tour}
          steps={tourSteps}
          finishLabel={tour === "app" ? "Vào Phòng Lab" : "Đã hiểu"}
          onClose={closeTour}
        />
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

/** Tài khoản giáo viên khi chức năng Lớp học đang tạm khoá (xem lib/features.ts). */
function ClassroomLocked({ name, onLogout }: { name: string; onLogout: () => void }) {
  return (
    <div className="min-h-[100dvh] w-full grid place-items-center bg-[#FAF9F6] p-6 font-nunito text-[#321E12]">
      <div className="w-full max-w-md rounded-3xl border border-[#E2DFD8] bg-white p-7 text-center shadow-[0_12px_40px_rgba(50,30,18,0.08)]">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFF2E6] text-[#C85A17] grid place-items-center">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="mt-4 text-xl font-black">Bảng điều khiển giáo viên đang tạm khoá</h1>
        <p className="mt-2 text-sm font-semibold text-[#605248] leading-relaxed">
          Chào {name.split(" (")[0]}. {CLASSROOM_LOCKED_MESSAGE} Trong lúc chờ, học sinh vẫn dùng đầy đủ Prelab, Phòng Lab và Sổ Báo Cáo.
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#C85A17] hover:bg-[#B24A0C] px-5 py-2.5 text-sm font-black text-white cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>
    </div>
  );
}
