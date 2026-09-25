/**
 * changelog.ts — Thông báo cập nhật hiện ở chuông thông báo, trang chào và thanh bên.
 *
 * Thêm cập nhật: thêm một mục vào ĐẦU `UPDATES` với `id` mới (id dùng để nhớ ai đã đọc, đồng bộ theo
 * tài khoản — đừng đổi id cũ). Lên bản mới thì đổi `APP_RELEASE`.
 */

export const APP_RELEASE = {
  name: "Beta Phi01",
  date: "26/09/2026",
} as const;

export type UpdateTag = "Mới" | "Cải tiến" | "Sửa lỗi";

export interface UpdateNote {
  id: string;
  date: string;
  tag: UpdateTag;
  title: string;
  body: string;
  /** Bấm "Mở bài" để vào thẳng bài này. */
  lessonId?: string;
}

export const UPDATES: UpdateNote[] = [
  {
    id: "phi01-accounts",
    date: "26/09/2026",
    tag: "Mới",
    title: "Tài khoản PhyLab và đồng bộ",
    body: "Đăng ký bằng email. Prelab đã qua, báo cáo trong Sổ Báo Cáo và hướng dẫn đã xem được lưu lên máy chủ — đổi máy vẫn còn nguyên.",
  },
  {
    id: "phi01-lab15",
    date: "25/09/2026",
    tag: "Mới",
    title: "Bài 15 · Định luật 2 Newton",
    body: "Máng đệm khí, máy nén khí và 2 cổng quang như Hình 15.2. Tự giữ, thả xe, treo quả nặng bằng tay và đo đủ 5 cột Bảng 15.1.",
    lessonId: "dinh-luat-2-newton",
  },
  {
    id: "phi01-prelab15",
    date: "25/09/2026",
    tag: "Mới",
    title: "Prelab Bài 15: máy nén khí",
    body: "Chạm để khám phá Hình 15.2, xem lát cắt đệm khí dưới xe và đẩy thử xe ở từng nấc lưu lượng trước khi vào bàn.",
    lessonId: "dinh-luat-2-newton",
  },
  {
    id: "phi01-landscape",
    date: "25/09/2026",
    tag: "Cải tiến",
    title: "Điện thoại xoay ngang",
    body: "Hướng dẫn thành cột bên phải thu gọn được, bàn thí nghiệm lấp kín hai bên; chân trang Prelab không còn bị đẩy lên.",
  },
  {
    id: "phi01-tours",
    date: "25/09/2026",
    tag: "Mới",
    title: "Tham quan PhyLab và An toàn PTN",
    body: "Hướng dẫn lần đầu vào app, mini-game săn nguy hiểm, thẻ lật biển báo và huy hiệu An toàn phòng thí nghiệm.",
  },
  {
    id: "phi01-elec-prelab",
    date: "25/09/2026",
    tag: "Mới",
    title: "Prelab điện: tự vẽ sơ đồ mạch",
    body: "Bài 23 và 26 có bước vẽ sơ đồ được kiểm bằng cách giải mạch, cùng các phép tính gốc chỉ đúng chỗ sai.",
  },
  {
    id: "phi01-labs",
    date: "24/09/2026",
    tag: "Cải tiến",
    title: "Nâng cấp Bài 6, 11, 23, 26",
    body: "Số đo ổn định mà vẫn lệch như thật, chạy chậm đúng vật lí, đồ thị vẽ ngay khi đo; Bài 26 có bảng mạch nối dây thật.",
  },
  {
    id: "phi01-notebook",
    date: "24/09/2026",
    tag: "Cải tiến",
    title: "Sổ Báo Cáo mới",
    body: "Bảng số liệu theo SGK, tự vẽ đồ thị và báo cáo in được cho từng bài.",
  },
];

/** Màu chip theo loại cập nhật (lớp Tailwind). */
export const TAG_CLASS: Record<UpdateTag, string> = {
  "Mới": "bg-[#FFF2E6] text-[#C85A17]",
  "Cải tiến": "bg-[#EAF2FC] text-[#1D5FAF]",
  "Sửa lỗi": "bg-[#E8F5EC] text-[#137333]",
};

/** Số thông báo chưa đọc. */
export function unreadCount(seen: readonly string[]): number {
  return UPDATES.filter((u) => !seen.includes(u.id)).length;
}
