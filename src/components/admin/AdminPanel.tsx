"use client";

/**
 * AdminPanel — Bảng quản trị của tài khoản admin (ADMIN_EMAIL / ADMIN_PASSWORD):
 *  - Tài khoản: số liệu bản Beta, danh sách học sinh + tiến độ, cấp mật khẩu tạm khi em quên.
 *  - Công cụ test (cho chính tài khoản admin): mở khoá mọi Prelab, xem lại hướng dẫn lần đầu,
 *    xoá sạch tiến độ để thử lại như học sinh mới.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, FlaskConical, KeyRound, RefreshCw, RotateCcw, Search, ShieldCheck, Unlock, Users, X } from "lucide-react";
import { apiJson } from "@/lib/accountClient";
import { ROLE_LABEL, type AccountRole } from "@/lib/accountTypes";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  grade: number | null;
  school: string | null;
  createdAt: number;
  lastLoginAt: number | null;
  prelabs: number;
  reports: number;
  envManaged: boolean;
}

interface Overview {
  stats: { total: number; new7d: number; active7d: number };
  users: AdminUser[];
}

interface AdminPanelProps {
  onClose: () => void;
  /** Đánh dấu đã qua Prelab mọi bài đang mở. */
  onUnlockAll: () => void;
  /** Cho hướng dẫn lần đầu (tham quan app, Phòng Lab, Sổ Báo Cáo) hiện lại. */
  onReplayTours: () => void;
  /** Xoá toàn bộ tiến độ của chính admin (máy chủ + máy này). */
  onResetProgress: () => Promise<boolean>;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** "26/09 14:32" */
const fmt = (ms: number | null) => {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminPanel({ onClose, onUnlockAll, onReplayTours, onResetProgress }: AdminPanelProps) {
  const [tab, setTab] = useState<"users" | "tools">("users");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [issued, setIssued] = useState<{ name: string; password: string } | null>(null);
  const [note, setNote] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    const r = await apiJson<Overview>("/api/admin/overview");
    if (r.ok) {
      setData({ stats: r.stats, users: r.users });
      setError("");
    } else {
      setError(r.error);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    apiJson<Overview>("/api/admin/overview").then((r) => {
      if (!alive) return;
      if (r.ok) setData({ stats: r.stats, users: r.users });
      else setError(r.error);
    });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const users = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data?.users ?? [];
    return q ? list.filter((u) => u.name.toLowerCase().includes(q) || u.email.includes(q) || (u.school ?? "").toLowerCase().includes(q)) : list;
  }, [data, query]);

  const resetPassword = async (user: AdminUser) => {
    if (!window.confirm(`Cấp mật khẩu tạm cho ${user.name} (${user.email})? Mật khẩu cũ hết hiệu lực và em đó bị đăng xuất khỏi mọi máy.`)) return;
    const r = await apiJson<{ tempPassword: string }>("/api/admin/reset-password", "POST", { userId: user.id });
    if (r.ok) setIssued({ name: user.name, password: r.tempPassword });
    else setError(r.error);
  };

  const flash = (text: string) => {
    setNote(text);
    window.setTimeout(() => setNote((n) => (n === text ? "" : n)), 3500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quản trị PhyLab"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#321E12]/45 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-[#E2DFD8] bg-white text-[#321E12] shadow-lg animate-scale-up sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#E2DFD8] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#321E12] text-white">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-base font-black leading-tight">Quản trị PhyLab</p>
              <p className="text-[11px] font-bold text-[#605248]">Chỉ tài khoản admin nhìn thấy mục này</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-full border border-[#E2DFD8] text-[#605248] hover:bg-[#FFF2E6] hover:text-[#C85A17]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 px-5 pt-4">
          {([
            ["Tài khoản", data?.stats.total],
            ["Mới 7 ngày", data?.stats.new7d],
            ["Vào học 7 ngày", data?.stats.active7d],
          ] as const).map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-[#FAF9F6] px-3 py-2.5">
              <p className="text-xl font-black text-[#C85A17]">{value ?? "…"}</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-[#605248]">{label}</p>
            </div>
          ))}
        </div>

        <div className="mx-5 mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-[#FAF9F6] p-1 text-xs font-black">
          <button type="button" onClick={() => setTab("users")} className={`flex items-center justify-center gap-1.5 rounded-xl py-2 ${tab === "users" ? "bg-white text-[#C85A17] shadow-sm" : "text-[#605248]"}`}>
            <Users className="h-3.5 w-3.5" /> Tài khoản
          </button>
          <button type="button" onClick={() => setTab("tools")} className={`flex items-center justify-center gap-1.5 rounded-xl py-2 ${tab === "tools" ? "bg-white text-[#C85A17] shadow-sm" : "text-[#605248]"}`}>
            <FlaskConical className="h-3.5 w-3.5" /> Công cụ test
          </button>
        </div>

        {error && <p role="alert" className="mx-5 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>}
        {issued && (
          <div className="mx-5 mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
            <p>Mật khẩu tạm của {issued.name} (chỉ hiện một lần — gửi riêng cho em, dặn đổi ngay trong mục Tài khoản):</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-base font-black tracking-wider select-text">{issued.password}</code>
              <button type="button" onClick={() => void navigator.clipboard?.writeText(issued.password).then(() => flash("Đã chép mật khẩu tạm."))} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-2.5 py-1.5 font-black hover:bg-white">
                <Copy className="h-3.5 w-3.5" /> Chép
              </button>
              <button type="button" onClick={() => setIssued(null)} className="ml-auto text-emerald-800 hover:underline">Ẩn</button>
            </div>
          </div>
        )}
        {note && <p role="status" className="mx-5 mt-3 rounded-xl bg-[#E8F5EC] px-3 py-2 text-xs font-black text-[#137333]">{note}</p>}

        {tab === "users" ? (
          <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#605248]/60" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên, email, trường" className="w-full rounded-xl border border-[#E2DFD8] py-2 pl-9 pr-3 text-sm font-bold outline-none focus:border-[#C85A17] select-text" />
              </div>
              <button type="button" onClick={() => void load()} aria-label="Tải lại" className="grid h-9 w-9 place-items-center rounded-xl border border-[#E2DFD8] text-[#605248] hover:text-[#C85A17]">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {!data && !error && <p className="py-6 text-center text-xs font-bold text-[#605248]">Đang tải…</p>}
              {data && users.length === 0 && <p className="py-6 text-center text-xs font-bold text-[#605248]">Chưa có tài khoản nào khớp.</p>}
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-[#E2DFD8] p-3">
                  <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[#FFF2E6] text-sm font-black text-[#C85A17]">
                    {u.name.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-black">
                      {u.name}
                      {u.role !== "student" && <span className="rounded-full bg-[#321E12] px-1.5 py-0.5 text-[9px] font-black text-white">{ROLE_LABEL[u.role]}</span>}
                    </p>
                    <p className="truncate text-[11px] font-bold text-[#605248]">
                      {u.email}
                      {u.grade ? ` · Lớp ${u.grade}` : ""}
                      {u.school ? ` · ${u.school}` : ""}
                    </p>
                    <p className="text-[10px] font-bold text-[#605248]/70">
                      Prelab {u.prelabs} · Báo cáo {u.reports} · Tạo {fmt(u.createdAt)} · Vào {fmt(u.lastLoginAt)}
                    </p>
                  </div>
                  {!u.envManaged && (
                    <button type="button" onClick={() => void resetPassword(u)} title="Cấp mật khẩu tạm" className="inline-flex flex-shrink-0 items-center gap-1 rounded-xl border border-[#E2DFD8] px-2.5 py-1.5 text-[11px] font-black text-[#605248] hover:border-[#C85A17]/50 hover:text-[#C85A17]">
                      <KeyRound className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Mật khẩu tạm</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 overflow-y-auto px-5 pb-5 pt-3">
            {[
              {
                icon: Unlock,
                title: "Mở khoá mọi Prelab",
                text: "Vào thẳng bàn thí nghiệm của mọi bài đang mở, không phải làm Prelab.",
                action: "Mở khoá",
                run: () => {
                  onUnlockAll();
                  flash("Đã mở khoá Prelab mọi bài.");
                },
              },
              {
                icon: RotateCcw,
                title: "Xem lại hướng dẫn lần đầu",
                text: "Tham quan app, hướng dẫn Phòng Lab và Sổ Báo Cáo sẽ tự hiện lại như tài khoản mới.",
                action: "Đặt lại",
                run: () => {
                  onReplayTours();
                  flash("Hướng dẫn lần đầu sẽ hiện lại.");
                },
              },
            ].map(({ icon: Icon, title, text, action, run }) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl border border-[#E2DFD8] p-3.5">
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-[#FFF2E6] text-[#C85A17]">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">{title}</p>
                  <p className="text-[11px] font-bold leading-relaxed text-[#605248]">{text}</p>
                </div>
                <button type="button" onClick={run} className="flex-shrink-0 rounded-xl bg-[#C85A17] px-3 py-2 text-xs font-black text-white hover:bg-[#B24A0C]">
                  {action}
                </button>
              </div>
            ))}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5">
              <p className="text-sm font-black text-rose-800">Xoá sạch tiến độ của tài khoản admin</p>
              <p className="text-[11px] font-bold leading-relaxed text-rose-800/80">
                Prelab đã qua, báo cáo, số đo, hướng dẫn và thông báo đã đọc — trên máy chủ và máy này. Để thử lại từ đầu như học sinh mới.
              </p>
              {confirmReset ? (
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setConfirmReset(false);
                      flash((await onResetProgress()) ? "Đã xoá sạch tiến độ." : "Chưa xoá được — kiểm tra mạng rồi thử lại.");
                    }}
                    className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white hover:bg-rose-700"
                  >
                    Xoá thật
                  </button>
                  <button type="button" onClick={() => setConfirmReset(false)} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-800">
                    Thôi
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmReset(true)} className="mt-2.5 rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100">
                  Xoá tiến độ của tôi
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
