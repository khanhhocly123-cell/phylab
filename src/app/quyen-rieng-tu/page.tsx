import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Database, KeyRound, ShieldCheck, Trash2, UserRound } from "lucide-react";
import Logo from "@/components/Logo";
import { APP_RELEASE } from "@/data/changelog";

export const metadata: Metadata = {
  title: "Quy định dữ liệu — PhyLab",
  description: "PhyLab lưu những gì, để làm gì, và cách xoá tài khoản.",
};

const SECTIONS = [
  {
    icon: UserRound,
    title: "PhyLab lưu những gì",
    items: [
      "Tài khoản: họ tên, email, lớp và trường (lớp, trường không bắt buộc).",
      "Tiến độ học: bài đã qua Prelab, báo cáo và số đo trong Sổ Báo Cáo, hướng dẫn và thông báo đã xem.",
      "Không lưu ảnh khuôn mặt, căn cước hay số điện thoại.",
    ],
  },
  {
    icon: Database,
    title: "Dùng để làm gì",
    items: [
      "Chỉ để em học tiếp được trên máy khác và không mất báo cáo.",
      "Admin PhyLab xem được danh sách tài khoản (tên, email, số bài đã làm) để hỗ trợ khi em quên mật khẩu.",
      "Không bán dữ liệu, không dùng để quảng cáo.",
    ],
  },
  {
    icon: Database,
    title: "Dịch vụ bên ngoài",
    items: [
      "Ảnh chụp ở màn Quét tài liệu được gửi tới dịch vụ nhận dạng chữ của VNPT để tìm bài; PhyLab không lưu ảnh.",
      "PhyLab dùng VNPT SmartUX để thống kê lượt xem và lượt bấm; nội dung các ô nhập (tên, email, mật khẩu) không được gửi đi.",
    ],
  },
  {
    icon: KeyRound,
    title: "Bảo vệ tài khoản",
    items: [
      "Mật khẩu được băm (PBKDF2) trước khi lưu — không ai đọc lại được, kể cả admin.",
      "Phiên đăng nhập nằm trong cookie bảo mật, hết hạn sau 30 ngày; đổi mật khẩu là các máy khác bị đăng xuất.",
      "Dữ liệu lưu trên Cloudflare D1.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Học sinh dưới 16 tuổi",
    items: [
      "Theo Luật Bảo vệ dữ liệu cá nhân, em dưới 16 tuổi cần bố mẹ hoặc người giám hộ đồng ý trước khi tạo tài khoản.",
      "Bố mẹ có thể yêu cầu xem hoặc xoá dữ liệu của em bất cứ lúc nào.",
    ],
  },
  {
    icon: Trash2,
    title: "Xoá tài khoản",
    items: [
      "Vào Hồ sơ → Tài khoản → Xoá tài khoản: tài khoản và toàn bộ tiến độ bị xoá hẳn khỏi máy chủ.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-[#FAF9F6] font-nunito text-[#321E12]">
      <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between py-2">
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-black text-[#605248] hover:bg-[#FFF2E6] hover:text-[#C85A17]">
            <ArrowLeft className="h-4 w-4" /> Trang chủ
          </Link>
          <span className="rounded-full border border-[#C85A17]/25 bg-[#FFF2E6] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#C85A17]">{APP_RELEASE.name}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Logo size={40} variant="circle" />
          <div>
            <h1 className="text-2xl font-black">Quy định dữ liệu</h1>
            <p className="text-xs font-bold text-[#605248]">Ngắn gọn: PhyLab chỉ lưu những gì cần để em học tiếp được.</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {SECTIONS.map(({ icon: Icon, title, items }) => (
            <section key={title} className="rounded-3xl border border-[#E2DFD8] bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-black">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FFF2E6] text-[#C85A17]">
                  <Icon className="h-4 w-4" />
                </span>
                {title}
              </h2>
              <ul className="mt-3 space-y-1.5 text-[13px] font-semibold leading-relaxed text-[#605248]">
                {items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#C85A17]/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-6 text-center text-xs font-bold text-[#605248]/70">Cập nhật {APP_RELEASE.date} · PhyLab {APP_RELEASE.name}</p>
      </div>
    </div>
  );
}
