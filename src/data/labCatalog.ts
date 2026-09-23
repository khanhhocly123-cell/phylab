/**
 * labCatalog — DANH MỤC BÀI THÍ NGHIỆM dùng chung cho mọi màn: Trang chủ, Phòng Lab (LabHub),
 * Quét SGK (chọn nhanh), Sổ Báo Cáo (chọn bài). Các màn đọc danh mục này nên tự hiển thị đúng
 * số bài — hàng thẻ cuộn ngang, menu chọn bài chia theo lớp, tiến độ theo chủ đề — thêm bao nhiêu
 * bài giao diện cũng không vỡ.
 *
 * Thêm một bài mới (xem README → "Thêm bài thí nghiệm mới"):
 *   1. Thêm một dòng ở LAB_CATALOG (status "soon" khi chưa có bàn thí nghiệm, "open" khi đã chạy).
 *   2. Lý thuyết / dụng cụ / các bước: src/experiments/specs.ts (cùng `id`).
 *   3. Bàn thí nghiệm: src/components/lab/…Bench.jsx + định tuyến trong LabRoom.tsx.
 *   4. (tuỳ chọn) Prelab, đồ thị Sổ Báo Cáo (notes/notebookData.ts), từ khoá quét SGK (lib/lessonMatch.ts).
 */

export type LabSubject = "Cơ học" | "Nhiệt học" | "Điện" | "Quang học" | "Hạt nhân";
export type LabStatus = "open" | "soon";

export interface LabEntry {
  /** lessonId — trùng key trong EXPERIMENT_SPECS. */
  id: string;
  /** Số bài trong SGK, vd "Bài 6". */
  code: string;
  grade: 10 | 11 | 12;
  subject: LabSubject;
  /** Tên ngắn hiển thị trên thẻ. */
  name: string;
  /** Dụng cụ chính (một dòng). */
  kit: string;
  /** Công thức cốt lõi (chữ thường, hiện trên ảnh bìa). */
  formula: string;
  difficulty: "Dễ" | "Trung bình" | "Khó";
  duration: string;
  image?: string;
  /** Nội dung Prelab (chặng 1). */
  prelab?: string;
  status: LabStatus;
}

export const LAB_CATALOG: LabEntry[] = [
  {
    id: "do-toc-do-vat-chuyen-dong", code: "Bài 6", grade: 10, subject: "Cơ học",
    name: "Tốc độ tức thời & trung bình", kit: "Máng nghiêng · cổng quang · MC964", formula: "v = d / t",
    difficulty: "Dễ", duration: "10 phút", image: "/images/marble_ramp.webp", prelab: "Cổng quang · MC964 · thước kẹp", status: "open",
  },
  {
    id: "do-gia-toc-roi-tu-do", code: "Bài 11", grade: 10, subject: "Cơ học",
    name: "Gia tốc rơi tự do", kit: "Trụ thép · nam châm điện · cổng quang", formula: "g = 2s / t²",
    difficulty: "Trung bình", duration: "15 phút", image: "/images/free_fall.webp", prelab: "Cổng quang · MC964 · dây dọi", status: "open",
  },
  {
    id: "do-dien-tro-dinh-luat-ohm", code: "Bài 23", grade: 11, subject: "Điện",
    name: "Điện trở — Định luật Ohm", kit: "Nguồn DC · 2 đồng hồ VOM · vật dẫn X, Y", formula: "R = U / I",
    difficulty: "Trung bình", duration: "20 phút", image: "/images/do-dien-tro-ohm.png", prelab: "Đồng hồ đa năng · nguồn DC", status: "open",
  },
  {
    id: "do-suat-dien-dong-pin-dien-hoa", code: "Bài 26", grade: 11, subject: "Điện",
    name: "Suất điện động pin điện hóa", kit: "Bảng mạch 216 nút · biến trở · 2 VOM", formula: "U = E − I·r",
    difficulty: "Khó", duration: "25 phút", image: "/images/do-suat-dien-dong.png", prelab: "Đồng hồ đa năng · bảng mạch", status: "open",
  },
  // ---- Sắp ra mắt (chưa có bàn thí nghiệm) ----
  { id: "dong-luong", code: "Bài 19", grade: 10, subject: "Cơ học", name: "Bảo toàn động lượng", kit: "Đệm khí · xe trượt · cổng quang", formula: "p = m·v", difficulty: "Khó", duration: "20 phút", status: "soon" },
  { id: "do-tieu-cu", code: "Bài 22", grade: 11, subject: "Quang học", name: "Tiêu cự thấu kính hội tụ", kit: "Băng quang học · thấu kính · màn", formula: "1/f = 1/d + 1/d′", difficulty: "Dễ", duration: "15 phút", status: "soon" },
  { id: "giao-thoa-anh-sang", code: "Bài 15", grade: 12, subject: "Quang học", name: "Giao thoa ánh sáng", kit: "Laser · khe Young · màn", formula: "i = λD / a", difficulty: "Khó", duration: "25 phút", status: "soon" },
];

const byLesson = (a: LabEntry, b: LabEntry) => a.grade - b.grade || lessonNo(a) - lessonNo(b);
export const lessonNo = (l: LabEntry) => parseInt(l.code.replace(/\D/g, ""), 10) || 0;

/** Bài đang mở (có bàn thí nghiệm), theo lớp rồi theo số bài. */
export const OPEN_LABS: LabEntry[] = LAB_CATALOG.filter((l) => l.status === "open").sort(byLesson);
/** Bài sắp ra mắt. */
export const SOON_LABS: LabEntry[] = LAB_CATALOG.filter((l) => l.status === "soon").sort(byLesson);

export const labEntry = (id: string | null | undefined) => LAB_CATALOG.find((l) => l.id === id);

/** Các lớp có bài đang mở (để làm bộ lọc). */
export const OPEN_GRADES: Array<LabEntry["grade"]> = [...new Set(OPEN_LABS.map((l) => l.grade))].sort((a, b) => a - b);
/** Các chủ đề có bài đang mở. */
export const OPEN_SUBJECTS: LabSubject[] = [...new Set(OPEN_LABS.map((l) => l.subject))];

/** Gom bài theo một khoá (lớp / chủ đề), giữ thứ tự xuất hiện. */
export function groupLabs<K extends string | number>(labs: LabEntry[], key: (l: LabEntry) => K): Array<[K, LabEntry[]]> {
  const map = new Map<K, LabEntry[]>();
  labs.forEach((l) => {
    const k = key(l);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(l);
  });
  return [...map.entries()];
}
