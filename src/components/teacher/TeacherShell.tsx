"use client";

/**
 * TeacherShell — Shell RIÊNG cho giáo viên (không dùng shell học sinh).
 *
 * Bố cục dashboard: sidebar trái (desktop) / topbar (mobile) + vùng nội dung.
 * Điều hướng nội bộ: Dashboard (danh sách lớp) → ClassDetail → StudentDrilldown.
 * Composer giao bài (Lab/Quiz) mở dạng modal phủ.
 */

import React, { useCallback, useEffect, useState } from "react";
import { School, LogOut, GraduationCap } from "lucide-react";
import Logo from "@/components/Logo";
import type { ClassSummary, ClassDetailData } from "@/lib/classTypes";
import { teacherGet } from "./api";
import TeacherDashboard from "./TeacherDashboard";
import ClassDetail from "./ClassDetail";
import StudentDrilldown from "./StudentDrilldown";
import LabAssignmentComposer from "./LabAssignmentComposer";
import QuizComposer from "./QuizComposer";

interface Props {
  teacherName: string;
  token: string;
  onLogout: () => void;
}

type View =
  | { kind: "dashboard" }
  | { kind: "class"; classId: string }
  | { kind: "student"; classId: string; studentId: string; studentName: string };

export default function TeacherShell({ teacherName, token, onLogout }: Props) {
  const [view, setView] = useState<View>({ kind: "dashboard" });
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [detail, setDetail] = useState<ClassDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [composer, setComposer] = useState<"lab" | "quiz" | null>(null);

  const refreshClasses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await teacherGet<{ classes: ClassSummary[] }>(token, "list");
      setClasses(data.classes);
    } catch {
      /* giữ danh sách cũ */
    } finally {
      setLoading(false);
    }
  }, [token]);

  const refreshDetail = useCallback(
    async (classId: string) => {
      setLoading(true);
      try {
        const data = await teacherGet<ClassDetailData>(token, "detail", { classId });
        setDetail(data);
      } catch {
        /* giữ detail cũ */
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    // Data-fetch khi mount — setState chạy trong callback async, không sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshClasses();
  }, [refreshClasses]);

  useEffect(() => {
    if (view.kind === "class" || view.kind === "student") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void refreshDetail(view.classId);
    }
  }, [view, refreshDetail]);

  const shortName = teacherName.split(" (")[0];
  const activeClassId = view.kind === "dashboard" ? null : view.classId;

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-[#FAF9F6] text-[#321E12] font-nunito overflow-hidden">
      {/* ── Sidebar desktop ── */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#FAF9F6] border-r border-[#E2DFD8] justify-between h-full p-5 flex-shrink-0">
        <div className="space-y-5">
          <div className="flex items-center gap-3 pl-1">
            <Logo size={38} variant="circle" />
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none text-[#321E12]">Phylab</h1>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#C85A17] mt-1 block">
                Bảng điều khiển giáo viên
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setView({ kind: "dashboard" })}
              className={`w-full py-3 px-4 text-xs font-black rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
                view.kind === "dashboard"
                  ? "bg-[#FFF2E6] text-[#C85A17] border-l-4 border-[#C85A17]"
                  : "text-[#605248] hover:text-[#C85A17] hover:bg-[#FFF0E0]/50"
              }`}
            >
              <School className="w-4 h-4 stroke-[2.5]" /> Lớp học của tôi
            </button>
            {/* Lớp đang mở — lối tắt quay lại */}
            {activeClassId && detail && (
              <button
                onClick={() => setView({ kind: "class", classId: activeClassId })}
                className={`w-full py-3 px-4 text-xs font-black rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
                  view.kind === "class"
                    ? "bg-[#FFF2E6] text-[#C85A17] border-l-4 border-[#C85A17]"
                    : "text-[#605248] hover:text-[#C85A17] hover:bg-[#FFF0E0]/50"
                }`}
              >
                <GraduationCap className="w-4 h-4 stroke-[2.5]" />
                <span className="truncate">{detail.class.name}</span>
              </button>
            )}
          </nav>
        </div>

        <div className="space-y-3">
          <div className="bg-white border border-[#E2DFD8] rounded-2xl p-3.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#C85A17] text-white flex items-center justify-center font-black text-sm flex-shrink-0">
              {shortName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-[#321E12] truncate">{shortName}</p>
              <p className="text-[9px] font-extrabold uppercase text-[#C85A17]">Giáo viên</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-2.5 px-4 text-xs font-black rounded-xl flex items-center gap-2 text-red-700 hover:bg-red-50 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Topbar mobile ── */}
      <header className="lg:hidden h-14 border-b border-[#E2DFD8] bg-[#FAF9F6] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Logo size={30} variant="circle" />
          <div>
            <span className="text-sm font-black text-[#321E12] leading-none block">Phylab</span>
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#C85A17]">Giáo viên</span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 text-red-700 hover:bg-red-50 rounded-xl cursor-pointer transition-all"
          title="Đăng xuất"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </header>

      {/* ── Nội dung ── */}
      <main
        className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/background.webp')" }}
      >
        {view.kind === "dashboard" && (
          <div className="animate-scale-up">
            <TeacherDashboard
              token={token}
              classes={classes}
              loading={loading}
              onCreated={() => void refreshClasses()}
              onOpenClass={(classId) => setView({ kind: "class", classId })}
            />
          </div>
        )}

        {view.kind === "class" && detail && (
          <div className="animate-scale-up">
            <ClassDetail
              token={token}
              detail={detail}
              loading={loading}
              onBack={() => {
                setView({ kind: "dashboard" });
                void refreshClasses();
              }}
              onRefresh={() => void refreshDetail(view.classId)}
              onComposeLab={() => setComposer("lab")}
              onComposeQuiz={() => setComposer("quiz")}
              onOpenStudent={(studentId, studentName) =>
                setView({ kind: "student", classId: view.classId, studentId, studentName })
              }
            />
          </div>
        )}

        {view.kind === "student" && (
          <div className="animate-scale-up">
            <StudentDrilldown
              token={token}
              classId={view.classId}
              studentId={view.studentId}
              studentName={view.studentName}
              onBack={() => setView({ kind: "class", classId: view.classId })}
            />
          </div>
        )}

        {(view.kind === "class" || view.kind === "student") && !detail && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#C85A17]/20 border-t-[#C85A17] rounded-full animate-spin" />
          </div>
        )}
      </main>

      {/* ── Composer modals ── */}
      {composer === "lab" && activeClassId && (
        <LabAssignmentComposer
          token={token}
          classId={activeClassId}
          onClose={() => setComposer(null)}
          onCreated={() => {
            setComposer(null);
            void refreshDetail(activeClassId);
          }}
        />
      )}
      {composer === "quiz" && activeClassId && detail && (
        <QuizComposer
          token={token}
          classId={activeClassId}
          labAssignments={detail.assignments.filter((a) => a.kind === "lab")}
          onClose={() => setComposer(null)}
          onCreated={() => {
            setComposer(null);
            void refreshDetail(activeClassId);
          }}
        />
      )}
    </div>
  );
}
