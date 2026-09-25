"use client";

/**
 * AuthScreen — Đăng nhập / Đăng ký tài khoản PhyLab (trang /dang-nhap và /dang-ky).
 * Thành công thì nhớ tài khoản trên máy rồi về "/" — app mở thẳng, tiến độ tự đồng bộ.
 */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, LogIn, Mail, School, ShieldCheck, Ticket, User, UserPlus } from "lucide-react";
import Logo from "@/components/Logo";
import { apiJson, readCachedAccount, rememberAccount } from "@/lib/accountClient";
import { GRADES, NAME_MAX, SCHOOL_MAX, type PublicAccount } from "@/lib/accountTypes";
import { APP_RELEASE } from "@/data/changelog";

type Mode = "login" | "register";

const inputClass =
  "w-full rounded-xl border border-[#E2DFD8] bg-white px-3.5 py-2.5 text-sm font-bold text-[#321E12] placeholder:text-[#605248]/45 outline-none transition focus:border-[#C85A17] focus:ring-4 focus:ring-[#C85A17]/12 select-text";

function Field({ label, icon, hint, children }: { label: string; icon: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#605248]">
        {icon}
        {label}
      </span>
      {children}
      {hint}
    </label>
  );
}

function PasswordInput({ value, onChange, autoComplete, placeholder }: { value: string; onChange: (v: string) => void; autoComplete: string; placeholder: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={128}
        required
        className={`${inputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-lg text-[#605248] hover:bg-[#FFF2E6] hover:text-[#C85A17]"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Rule({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${ok ? "bg-[#E8F5EC] text-[#137333]" : "bg-[#F3F1EC] text-[#605248]/70"}`}>
      <Check className="h-3 w-3 stroke-[3]" />
      {children}
    </span>
  );
}

export default function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [school, setSchool] = useState("");
  const [invite, setInvite] = useState("");
  const [consent, setConsent] = useState(false);
  const [inviteRequired, setInviteRequired] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Đã đăng nhập trên máy này thì vào thẳng app.
  useEffect(() => {
    if (readCachedAccount()) router.replace("/");
  }, [router]);

  useEffect(() => {
    if (!isRegister) return;
    let alive = true;
    apiJson<{ inviteRequired: boolean }>("/api/auth/config").then((r) => {
      if (alive && r.ok) setInviteRequired(Boolean(r.inviteRequired));
    });
    return () => {
      alive = false;
    };
  }, [isRegister]);

  const longEnough = password.length >= 8;
  const lettersAndDigits = /\p{L}/u.test(password) && /\d/.test(password);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (isRegister) {
      if (!longEnough || !lettersAndDigits) return setError("Mật khẩu cần ít nhất 8 ký tự, có cả chữ và số.");
      if (password !== confirm) return setError("Hai lần nhập mật khẩu chưa khớp.");
      if (!consent) return setError("Em đánh dấu đồng ý Quy định dữ liệu để tạo tài khoản nhé.");
    }
    setBusy(true);
    const result = await apiJson<{ user: PublicAccount; teacherToken?: string }>(
      `/api/auth/${isRegister ? "register" : "login"}`,
      "POST",
      isRegister ? { name, email, password, grade, school, invite, consent } : { email, password }
    );
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    rememberAccount(result.user, result.teacherToken);
    router.replace("/");
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#FAF9F6] font-nunito text-[#321E12]">
      <div className="pointer-events-none absolute left-[-15%] top-[-10%] h-[55%] w-[60%] rounded-full bg-gradient-to-br from-amber-300/25 via-orange-200/15 to-transparent blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[55%] w-[60%] rounded-full bg-gradient-to-tr from-[#C85A17]/12 to-transparent blur-[130px]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3 py-2">
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-black text-[#605248] hover:bg-[#FFF2E6] hover:text-[#C85A17]">
            <ArrowLeft className="h-4 w-4" /> Trang chủ
          </Link>
          <span className="rounded-full border border-[#C85A17]/25 bg-[#FFF2E6] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#C85A17]">
            {APP_RELEASE.name}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Logo size={44} variant="circle" />
          <div>
            <h1 className="text-2xl font-black leading-tight">{isRegister ? "Tạo tài khoản PhyLab" : "Chào mừng quay lại"}</h1>
            <p className="text-xs font-bold text-[#605248]">
              {isRegister ? "Miễn phí cho học sinh. Tiến độ lưu theo tài khoản, đổi máy vẫn còn." : "Đăng nhập để học tiếp đúng chỗ em dừng lại."}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-2xl border border-[#E2DFD8] bg-white p-1 text-xs font-black">
          <Link href="/dang-nhap" replace className={`rounded-xl py-2 text-center transition ${!isRegister ? "bg-[#C85A17] text-white shadow-sm" : "text-[#605248] hover:text-[#C85A17]"}`}>
            Đăng nhập
          </Link>
          <Link href="/dang-ky" replace className={`rounded-xl py-2 text-center transition ${isRegister ? "bg-[#C85A17] text-white shadow-sm" : "text-[#605248] hover:text-[#C85A17]"}`}>
            Đăng ký
          </Link>
        </div>

        <form onSubmit={submit} noValidate className="mt-4 space-y-3.5 rounded-3xl border border-[#E2DFD8] bg-white/95 p-5 shadow-[0_12px_40px_rgba(50,30,18,0.07)]">
          {isRegister && (
            <Field label="Họ và tên" icon={<User className="h-3.5 w-3.5" />}>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Nguyễn Văn An" maxLength={NAME_MAX} required className={inputClass} />
            </Field>
          )}

          <Field label="Email" icon={<Mail className="h-3.5 w-3.5" />}>
            <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ten@gmail.com" maxLength={120} required className={inputClass} />
          </Field>

          <Field
            label="Mật khẩu"
            icon={<KeyRound className="h-3.5 w-3.5" />}
            hint={isRegister ? (
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                <Rule ok={longEnough}>Ít nhất 8 ký tự</Rule>
                <Rule ok={lettersAndDigits}>Có chữ và số</Rule>
              </span>
            ) : undefined}
          >
            <PasswordInput value={password} onChange={setPassword} autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? "Tạo mật khẩu" : "Mật khẩu của em"} />
          </Field>

          {isRegister && (
            <>
              <Field label="Nhập lại mật khẩu" icon={<KeyRound className="h-3.5 w-3.5" />}>
                <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" placeholder="Nhập lại cho chắc" />
              </Field>

              <div>
                <span className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#605248]">
                  <School className="h-3.5 w-3.5" /> Lớp và trường <span className="normal-case tracking-normal text-[#605248]/60">(không bắt buộc)</span>
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[...GRADES, null].map((g) => (
                    <button
                      key={g ?? "khac"}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`rounded-xl border py-2 text-xs font-black transition ${grade === g ? "border-[#C85A17] bg-[#FFF2E6] text-[#C85A17]" : "border-[#E2DFD8] bg-white text-[#605248] hover:border-[#C85A17]/50"}`}
                    >
                      {g ? `Lớp ${g}` : "Khác"}
                    </button>
                  ))}
                </div>
                <input value={school} onChange={(e) => setSchool(e.target.value)} autoComplete="organization" placeholder="Trường (vd: THPT Lê Hồng Phong)" maxLength={SCHOOL_MAX} className={`${inputClass} mt-2`} />
              </div>

              {inviteRequired && (
                <Field label="Mã mời bản Beta" icon={<Ticket className="h-3.5 w-3.5" />}>
                  <input value={invite} onChange={(e) => setInvite(e.target.value)} autoComplete="off" placeholder="Thầy cô / admin gửi cho em" maxLength={60} className={inputClass} />
                </Field>
              )}

              <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-[#FAF9F6] p-3 text-xs font-bold leading-relaxed text-[#605248]">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#C85A17]" />
                <span>
                  Em đồng ý với{" "}
                  <Link href="/quyen-rieng-tu" target="_blank" className="font-black text-[#C85A17] underline underline-offset-2">
                    Quy định dữ liệu
                  </Link>{" "}
                  của PhyLab. Nếu em dưới 16 tuổi, bố mẹ đã biết và đồng ý cho em dùng tài khoản.
                </span>
              </label>
            </>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#DF742E] to-[#B24A0C] py-3.5 text-sm font-black text-white shadow-[0_6px_16px_rgba(200,90,23,0.22)] transition hover:-translate-y-0.5 active:translate-y-0 disabled:translate-y-0 disabled:opacity-60"
          >
            {isRegister ? <UserPlus className="h-4.5 w-4.5" /> : <LogIn className="h-4.5 w-4.5" />}
            {busy ? "Đang xử lý…" : isRegister ? "Tạo tài khoản" : "Đăng nhập"}
          </button>

          {!isRegister && (
            <div className="text-center">
              <button type="button" onClick={() => setForgotOpen((v) => !v)} className="text-xs font-black text-[#605248] underline-offset-2 hover:text-[#C85A17] hover:underline">
                Quên mật khẩu?
              </button>
              {forgotOpen && (
                <p className="mt-2 rounded-xl bg-[#FFF7EF] px-3 py-2 text-[11px] font-bold leading-relaxed text-[#605248]">
                  Bản Beta chưa gửi email đặt lại được. Em nhắn thầy cô hoặc admin PhyLab để được cấp mật khẩu tạm, đăng nhập rồi đổi trong mục Tài khoản.
                </p>
              )}
            </div>
          )}
        </form>

        <p className="mt-4 flex items-start justify-center gap-1.5 text-center text-[11px] font-bold leading-relaxed text-[#605248]/80">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#137333]" />
          Mật khẩu được băm trước khi lưu, không ai đọc được — kể cả admin.
        </p>
      </div>
    </div>
  );
}
