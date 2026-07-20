"use client";

/**
 * TeacherDashboard — Danh sách lớp của giáo viên + tạo lớp mới + xóa lớp.
 * Mã tham gia hiển thị TO RÕ để giáo viên đọc cho học sinh nhập.
 */

import React, { useState } from "react";
import { Plus, Users, Copy, Check, ArrowRight, School, Trash2 } from "lucide-react";
import type { ClassSummary } from "@/lib/classTypes";
import { MAX_CLASSES } from "@/lib/classTypes";
import { teacherPost, formatDate } from "./api";

interface Props {
  token: string;
  classes: ClassSummary[];
  loading: boolean;
  onCreated: () => void;
  onOpenClass: (classId: string) => void;
}

export default function TeacherDashboard({ token, classes, loading, onCreated, onOpenClass }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const atLimit = classes.length >= MAX_CLASSES;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await teacherPost(token, "create", { name: newName.trim() });
      setNewName("");
      setCreating(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được lớp.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (cls: ClassSummary) => {
    if (!window.confirm(`Xóa lớp "${cls.name}"?\nToàn bộ bài tập, bài nộp và điểm của lớp sẽ mất, không khôi phục được.`)) return;
    setDeletingId(cls.id);
    try {
      await teacherPost(token, "class-delete", { classId: cls.id });
      onCreated(); // refresh danh sách
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được lớp.");
    } finally {
      setDeletingId(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode((prev) => (prev === code ? null : prev)), 1600);
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-7">
      {/* Header + nút tạo lớp */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-[#321E12] tracking-tight">Lớp học của tôi</h2>
          <p className="text-sm font-bold text-[#605248] mt-1.5">
            Tạo lớp, đọc mã cho học sinh nhập để vào lớp, rồi giao bài và theo dõi.
            <span className="ml-1 text-[#C85A17]">({classes.length}/{MAX_CLASSES} lớp)</span>
          </p>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          disabled={atLimit && !creating}
          className="px-5 py-3 bg-gradient-to-r from-[#DF742E] to-[#B24A0C] hover:from-[#E3813C] hover:to-[#A33E04] disabled:opacity-50 text-white text-sm font-black rounded-2xl inline-flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4.5 h-4.5 stroke-[3]" /> Tạo lớp mới
        </button>
      </div>

      {atLimit && (
        <p className="text-sm font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          Đã đạt giới hạn {MAX_CLASSES} lớp. Xóa bớt lớp cũ để tạo lớp mới.
        </p>
      )}

      {/* Form tạo lớp */}
      {creating && !atLimit && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-[#E2DFD8] rounded-3xl p-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-end animate-scale-up"
        >
          <div className="flex-1">
            <label className="text-xs font-black uppercase tracking-wide text-[#C85A17] block mb-2">
              Tên lớp
            </label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="VD: Lớp 10A1 — Vật lí"
              maxLength={80}
              className="w-full px-4 py-3.5 bg-[#FAF9F6] border border-[#E2DFD8] rounded-xl text-base font-bold text-[#321E12] outline-none focus:border-[#C85A17]/50 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !newName.trim()}
            className="px-6 py-3.5 bg-[#C85A17] hover:bg-[#B55210] disabled:opacity-50 text-white text-sm font-black rounded-xl cursor-pointer transition-all active:scale-95"
          >
            {busy ? "Đang tạo..." : "Tạo lớp"}
          </button>
        </form>
      )}
      {error && <p className="text-sm font-black text-red-600">{error}</p>}

      {/* Danh sách lớp */}
      {loading && classes.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-[#C85A17]/20 border-t-[#C85A17] rounded-full animate-spin" />
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E2DFD8] rounded-3xl p-12 text-center space-y-3">
          <School className="w-12 h-12 text-[#C85A17]/40 mx-auto" />
          <p className="text-base font-black text-[#321E12]">Chưa có lớp nào</p>
          <p className="text-sm font-bold text-[#605248]">
            Bấm &quot;Tạo lớp mới&quot; để nhận mã tham gia cho học sinh.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="group bg-white border border-[#E2DFD8] hover:border-[#C85A17]/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-[#321E12] truncate">{cls.name}</h3>
                  <p className="text-xs font-bold text-[#605248] mt-1">
                    Tạo ngày {formatDate(cls.createdAt)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF2E6] text-[#C85A17] text-xs font-black rounded-lg border border-[#C85A17]/10 flex-shrink-0">
                  <Users className="w-3.5 h-3.5" /> {cls.memberCount} HS
                </span>
              </div>

              {/* Mã lớp — hiển thị to để đọc cho HS */}
              <div className="bg-[#FAF9F6] border border-dashed border-[#C85A17]/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#605248]">Mã tham gia lớp</p>
                  <p className="text-3xl font-black tracking-[0.3em] text-[#C85A17] font-mono select-text mt-0.5">
                    {cls.code}
                  </p>
                </div>
                <button
                  onClick={() => copyCode(cls.code)}
                  title="Sao chép mã"
                  className="p-3 bg-white border border-[#E2DFD8] rounded-xl text-[#605248] hover:text-[#C85A17] hover:bg-[#FFF2E6] cursor-pointer transition-all active:scale-90"
                >
                  {copiedCode === cls.code ? (
                    <Check className="w-5 h-5 text-[#137333] stroke-[3]" />
                  ) : (
                    <Copy className="w-5 h-5 stroke-[2.5]" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenClass(cls.id)}
                  className="flex-1 py-3 bg-[#FFF2E6] hover:bg-[#FFE8D5] text-[#C85A17] text-sm font-black rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                >
                  Quản lý lớp <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => handleDelete(cls)}
                  disabled={deletingId === cls.id}
                  title="Xóa lớp"
                  className="p-3 bg-white border border-[#E2DFD8] text-[#605248]/70 hover:text-red-600 hover:border-red-300 hover:bg-red-50 rounded-xl cursor-pointer transition-all active:scale-90 disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
