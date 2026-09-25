"use client";

/**
 * AccountPanel — Hồ sơ → Tài khoản: sửa tên / lớp / trường, xem trạng thái đồng bộ, đổi mật khẩu,
 * xoá tài khoản. Ba thẻ để không phải cuộn dài.
 */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Cloud, CloudOff, KeyRound, Trash2, UserRound, X } from "lucide-react";
import { apiJson } from "@/lib/accountClient";
import { GRADES, NAME_MAX, ROLE_LABEL, SCHOOL_MAX, type PublicAccount } from "@/lib/accountTypes";
import { describeSync, type SyncStatus } from "@/lib/cloudSync";

type Tab = "profile" | "password" | "delete";

const inputClass =
  "w-full rounded-xl border border-[#E2DFD8] bg-white px-3 py-2.5 text-sm font-bold text-[#321E12] outline-none transition focus:border-[#C85A17] focus:ring-4 focus:ring-[#C85A17]/12 select-text";

function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-[#605248]">{children}</span>;
}

function Notice({ tone, children }: { tone: "ok" | "error" | "info"; children: ReactNode }) {
  const cls = tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-[#E2DFD8] bg-[#FAF9F6] text-[#605248]";
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-3 py-2 text-xs font-bold leading-relaxed ${cls}`}>{children}</div>;
}

interface AccountPanelProps {
  account: PublicAccount;
  sync: SyncStatus;
  onClose: () => void;
  onUpdated: (user: PublicAccount) => void;
  onDeleted: () => void;
}

export default function AccountPanel({ account, sync, onClose, onUpdated, onDeleted }: AccountPanelProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const [name, setName] = useState(account.name);
  const [grade, setGrade] = useState<number | null>(account.grade);
  const [school, setSchool] = useState(account.school ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setMessage(null);
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await apiJson<{ user: PublicAccount }>("/api/auth/profile", "POST", { name, grade, school });
    setBusy(false);
    if (!r.ok) return setMessage({ tone: "error", text: r.error });
    onUpdated(r.user);
    setMessage({ tone: "ok", text: "Đã lưu hồ sơ." });
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return setMessage({ tone: "error", text: "Hai lần nhập mật khẩu mới chưa khớp." });
    setBusy(true);
    const r = await apiJson("/api/auth/password", "POST", { current, next });
    setBusy(false);
    if (!r.ok) return setMessage({ tone: "error", text: r.error });
    setCurrent("");
    setNext("");
    setConfirm("");
    setMessage({ tone: "ok", text: "Đã đổi mật khẩu. Các máy khác đang đăng nhập tài khoản này đã bị đăng xuất." });
  };

  const deleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await apiJson("/api/auth/delete", "POST", { password: deletePassword });
    setBusy(false);
    if (!r.ok) return setMessage({ tone: "error", text: r.error });
    onDeleted();
  };

  const synced = sync.state === "synced" || sync.state === "syncing";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tài khoản"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#321E12]/45 p-0 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[#E2DFD8] bg-white p-5 text-[#321E12] shadow-lg animate-scale-up sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-[#C85A17] text-lg font-black text-white">
              {account.name.trim().charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black">{account.name}</p>
              <p className="truncate text-xs font-bold text-[#605248]">
                {account.email} · <span className="text-[#C85A17]">{ROLE_LABEL[account.role]}</span>
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-[#E2DFD8] text-[#605248] hover:bg-[#FFF2E6] hover:text-[#C85A17]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-[#FAF9F6] p-1 text-[11px] font-black">
          {([
            ["profile", "Hồ sơ", UserRound],
            ["password", "Mật khẩu", KeyRound],
            ["delete", "Xoá", Trash2],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchTab(key)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition ${tab === key ? "bg-white text-[#C85A17] shadow-sm" : "text-[#605248] hover:text-[#C85A17]"}`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <form onSubmit={saveProfile} className="mt-4 space-y-3">
            <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-bold ${synced ? "bg-[#E8F5EC] text-[#137333]" : "bg-[#FFF7EF] text-[#9A4A0C]"}`}>
              {synced ? <Cloud className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <CloudOff className="mt-0.5 h-4 w-4 flex-shrink-0" />}
              <span>{describeSync(sync)}</span>
            </div>
            <label className="block">
              <Label>Họ và tên</Label>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX} className={inputClass} />
            </label>
            <div>
              <Label>Lớp</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {[...GRADES, null].map((g) => (
                  <button
                    key={g ?? "khac"}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`rounded-xl border py-2 text-xs font-black transition ${grade === g ? "border-[#C85A17] bg-[#FFF2E6] text-[#C85A17]" : "border-[#E2DFD8] text-[#605248] hover:border-[#C85A17]/50"}`}
                  >
                    {g ? `Lớp ${g}` : "Khác"}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <Label>Trường</Label>
              <input value={school} onChange={(e) => setSchool(e.target.value)} maxLength={SCHOOL_MAX} placeholder="Không bắt buộc" className={inputClass} />
            </label>
            {message && <Notice tone={message.tone}>{message.text}</Notice>}
            <button type="submit" disabled={busy} className="w-full rounded-2xl bg-[#C85A17] py-3 text-sm font-black text-white transition hover:bg-[#B24A0C] disabled:opacity-60">
              {busy ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </form>
        )}

        {tab === "password" &&
          (account.envManaged ? (
            <div className="mt-4">
              <Notice tone="info">
                Tài khoản này là tài khoản cấu hình sẵn: mật khẩu nằm trong biến môi trường trên Cloudflare
                ({account.role === "admin" ? "ADMIN_PASSWORD" : "TEACHER_PASSWORD"}), đổi bằng lệnh <code className="font-mono">wrangler secret put</code>.
              </Notice>
            </div>
          ) : (
            <form onSubmit={changePassword} className="mt-4 space-y-3">
              <label className="block">
                <Label>Mật khẩu hiện tại</Label>
                <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required className={inputClass} />
              </label>
              <label className="block">
                <Label>Mật khẩu mới (8+ ký tự, có chữ và số)</Label>
                <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required className={inputClass} />
              </label>
              <label className="block">
                <Label>Nhập lại mật khẩu mới</Label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required className={inputClass} />
              </label>
              {message && <Notice tone={message.tone}>{message.text}</Notice>}
              <button type="submit" disabled={busy} className="w-full rounded-2xl bg-[#C85A17] py-3 text-sm font-black text-white transition hover:bg-[#B24A0C] disabled:opacity-60">
                {busy ? "Đang đổi…" : "Đổi mật khẩu"}
              </button>
            </form>
          ))}

        {tab === "delete" &&
          (account.envManaged ? (
            <div className="mt-4">
              <Notice tone="info">Tài khoản admin / giáo viên cấu hình sẵn không xoá trong app được.</Notice>
            </div>
          ) : (
            <form onSubmit={deleteAccount} className="mt-4 space-y-3">
              <Notice tone="error">
                Xoá tài khoản sẽ xoá hẳn khỏi máy chủ: Prelab đã qua, báo cáo và số đo trong Sổ Báo Cáo. Không khôi phục được.
              </Notice>
              <label className="block">
                <Label>Nhập mật khẩu để xác nhận</Label>
                <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} autoComplete="current-password" required className={inputClass} />
              </label>
              {message && <Notice tone={message.tone}>{message.text}</Notice>}
              <button type="submit" disabled={busy || !deletePassword} className="w-full rounded-2xl bg-rose-600 py-3 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-50">
                {busy ? "Đang xoá…" : "Xoá vĩnh viễn tài khoản"}
              </button>
            </form>
          ))}
      </div>
    </div>
  );
}
