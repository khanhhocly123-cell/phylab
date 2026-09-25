/**
 * LandingPage — Trang chào khi chưa đăng nhập (đường dẫn "/"): PhyLab là gì, các bài đang mở, có gì mới
 * ở bản Beta, và hai nút Đăng ký / Đăng nhập. Trang giới thiệu đầy đủ ở /gioi-thieu.
 */

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, FlaskConical, LogIn, NotebookPen, Sparkles, UserPlus } from "lucide-react";
import Logo from "@/components/Logo";
import { OPEN_LABS } from "@/data/labCatalog";
import { APP_RELEASE, TAG_CLASS, UPDATES } from "@/data/changelog";

const STAGES = [
  { icon: BookOpen, title: "Prelab", text: "Làm quen dụng cụ và thao tác trước khi vào bàn — chạm, vặn, thử như thật." },
  { icon: FlaskConical, title: "Phòng Lab", text: "Tự lắp dụng cụ, tự đo. Làm ẩu thì số lệch như ngoài đời, làm cẩn thận thì số chụm." },
  { icon: NotebookPen, title: "Sổ Báo Cáo", text: "Bảng số liệu theo SGK, tự vẽ đồ thị và báo cáo in được cho từng bài." },
];

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[#FAF9F6] font-nunito text-[#321E12]">
      <header className="sticky top-0 z-30 border-b border-[#E2DFD8]/70 bg-[#FAF9F6]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={34} variant="circle" />
            <span className="text-lg font-black">Phylab</span>
            <span className="hidden rounded-full border border-[#C85A17]/25 bg-[#FFF2E6] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#C85A17] sm:inline">
              {APP_RELEASE.name}
            </span>
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/dang-nhap" className="rounded-xl px-3 py-2 text-xs font-black text-[#605248] transition hover:bg-[#FFF2E6] hover:text-[#C85A17]">
              Đăng nhập
            </Link>
            <Link href="/dang-ky" className="rounded-xl bg-[#C85A17] px-3.5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#B24A0C]">
              Đăng ký
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 pt-8 md:grid-cols-[1.05fr_1fr] md:pt-14">
          <div className="pointer-events-none absolute left-[-20%] top-[-20%] h-[70%] w-[70%] rounded-full bg-gradient-to-br from-amber-300/25 via-orange-200/15 to-transparent blur-[120px]" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#C85A17] shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C85A17]" /> Phòng thí nghiệm Vật lí trên trình duyệt
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] sm:text-5xl">
              Tự tay đo.
              <br />
              Tự mình <span className="text-[#C85A17]">hiểu.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-[#605248] sm:text-base">
              Làm quen dụng cụ ở Prelab, tự tay đo ở Phòng Lab, lập bảng và đồ thị trong Sổ Báo Cáo — bám sát SGK Vật lí 10–11
              Kết nối tri thức. Tiến độ lưu theo tài khoản, học trên máy nào cũng được.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/dang-ky"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#DF742E] to-[#B24A0C] px-6 py-3.5 text-sm font-black text-white shadow-[0_6px_16px_rgba(200,90,23,0.22)] transition hover:-translate-y-0.5"
              >
                <UserPlus className="h-4.5 w-4.5" /> Tạo tài khoản miễn phí
              </Link>
              <Link
                href="/dang-nhap"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E2DFD8] bg-white px-6 py-3.5 text-sm font-black text-[#321E12] transition hover:border-[#C85A17]/50 hover:text-[#C85A17]"
              >
                <LogIn className="h-4.5 w-4.5" /> Tôi đã có tài khoản
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-black text-[#605248]">
              {["Miễn phí cho học sinh", `${OPEN_LABS.length} bài thực hành đang mở`, "Chạy trên cả điện thoại"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 stroke-[3] text-[#137333]" /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-[#E2DFD8] bg-white shadow-[0_18px_50px_rgba(50,30,18,0.12)]">
              <div className="relative aspect-[16/10]">
                <Image src="/images/newton2_airtrack.webp" alt="Bàn thí nghiệm Bài 15: máng đệm khí, xe trượt, ròng rọc và cổng quang" fill priority sizes="(max-width: 768px) 92vw, 46vw" className="object-cover" />
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#C85A17]">Mới · Bài 15 · Vật lí 10</p>
                <p className="truncate text-sm font-black">Định luật 2 Newton trên máng đệm khí</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6">
          <h2 className="text-xl font-black">Một buổi thực hành, ba chặng</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {STAGES.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="rounded-3xl border border-[#E2DFD8] bg-white p-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF2E6] text-[#C85A17]">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#605248]/70">Chặng {i + 1}</span>
                </div>
                <h3 className="mt-3 text-base font-black">{title}</h3>
                <p className="mt-1 text-[13px] font-semibold leading-relaxed text-[#605248]">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-xl font-black">Các bài đang mở</h2>
            <Link href="/gioi-thieu" className="inline-flex items-center gap-1 text-xs font-black text-[#C85A17] hover:underline">
              Tìm hiểu thêm <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {OPEN_LABS.map((lab) => (
              <article key={lab.id} className="w-[220px] flex-shrink-0 snap-start overflow-hidden rounded-3xl border border-[#E2DFD8] bg-white">
                <div className="relative aspect-[16/10] bg-[#F3F1EC]">
                  {lab.image && <Image src={lab.image} alt="" fill sizes="220px" className="object-cover" />}
                </div>
                <div className="p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#605248]/70">
                    {lab.code} · Lớp {lab.grade} · {lab.subject}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-black leading-snug">{lab.name}</h3>
                  <p className="mt-2 inline-block rounded-lg bg-[#FAF9F6] px-2 py-1 font-mono text-[11px] font-black text-[#C85A17]">{lab.formula}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Sparkles className="h-5 w-5 text-[#C85A17]" /> Có gì mới ở {APP_RELEASE.name}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {UPDATES.slice(0, 4).map((u) => (
              <div key={u.id} className="rounded-3xl border border-[#E2DFD8] bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${TAG_CLASS[u.tag]}`}>{u.tag}</span>
                  <span className="text-[10px] font-bold text-[#605248]/60">{u.date}</span>
                </div>
                <h3 className="mt-2 text-sm font-black">{u.title}</h3>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-[#605248]">{u.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12 pt-6">
          <div className="rounded-3xl bg-[#321E12] px-6 py-8 text-center text-white sm:py-10">
            <h2 className="text-2xl font-black">Sẵn sàng cho buổi thực hành đầu tiên?</h2>
            <p className="mt-2 text-sm font-semibold text-white/75">Tạo tài khoản mất chưa tới một phút.</p>
            <Link
              href="/dang-ky"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#DF742E] to-[#B24A0C] px-6 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5"
            >
              Bắt đầu ngay <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E2DFD8] bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs font-bold text-[#605248] sm:flex-row">
          <span>© 2026 PhyLab · {APP_RELEASE.name}</span>
          <nav className="flex gap-4">
            <Link href="/gioi-thieu" className="hover:text-[#C85A17]">Giới thiệu</Link>
            <Link href="/quyen-rieng-tu" className="hover:text-[#C85A17]">Quy định dữ liệu</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
