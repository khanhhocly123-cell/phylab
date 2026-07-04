/**
 * quizBank.ts — Ngân hàng Quiz + Flashcard cho tab "Ôn tập" của Notes.
 *
 * Theo mô tả: Bài 6 có 10 quiz + 10 flashcard; các bài khác 5 + 5.
 * Tỉ lệ 60% TƯ DUY THÍ NGHIỆM (category "experiment") + 40% LÝ THUYẾT ("theory")
 * → dùng để AI nhận xét học sinh yếu phần nào. Công thức viết dạng KaTeX ($...$).
 */

export type QuizCategory = "experiment" | "theory";

export interface QuizItem {
  q: string;
  options: string[];
  answer: number; // index đáp án đúng
  explain: string;
  category: QuizCategory;
}

export interface Flashcard {
  front: string;
  back: string;
  category: QuizCategory;
}

export interface LessonReview {
  quizzes: QuizItem[];
  flashcards: Flashcard[];
}

const LAB6: LessonReview = {
  quizzes: [
    // --- Tư duy thí nghiệm (6) ---
    {
      q: "Đo vận tốc tức thời tại một cổng quang, ta để đồng hồ MC964 ở chế độ nào?",
      options: ["MODE A", "MODE A↔B", "MODE A+B", "MODE T"],
      answer: 0,
      explain: "MODE A đo thời gian bi che một cổng quang, dùng cho vận tốc tức thời $v = d/t$.",
      category: "experiment",
    },
    {
      q: "Muốn đo vận tốc trung bình trên đoạn E–F, chọn MODE nào?",
      options: ["MODE A", "MODE B", "MODE A↔B", "MODE T"],
      answer: 2,
      explain: "MODE A↔B đo khoảng thời gian bi đi từ cổng E đến cổng F.",
      category: "experiment",
    },
    {
      q: "Vì sao phải nhấn Reset đồng hồ trước mỗi lần thả bi?",
      options: [
        "Để tiết kiệm pin",
        "Để tránh cộng dồn thời gian lần trước làm $t$ sai",
        "Để đổi thang đo",
        "Để tắt cổng quang",
      ],
      answer: 1,
      explain: "Không Reset thì MC964 cộng dồn số cũ, khiến $t$ đọc được lớn hơn thực tế.",
      category: "experiment",
    },
    {
      q: "Đại lượng nào đo bằng thước kẹp (du xích) để tính vận tốc tức thời?",
      options: ["Khoảng cách E–F", "Đường kính viên bi $d$", "Góc nghiêng $\\theta$", "Thời gian $t$"],
      answer: 1,
      explain: "Vận tốc tức thời $v = d/t$ cần đường kính bi $d$ đo bằng thước kẹp.",
      category: "experiment",
    },
    {
      q: "Để giảm sai số ngẫu nhiên của phép đo thời gian, nên làm gì?",
      options: [
        "Đo một lần thật nhanh",
        "Đo lặp nhiều lần rồi lấy trung bình",
        "Tăng góc nghiêng tối đa",
        "Bỏ cổng quang đi",
      ],
      answer: 1,
      explain: "Trung bình nhiều lần đo làm sai số ngẫu nhiên của trung bình nhỏ hơn từng lần.",
      category: "experiment",
    },
    {
      q: "Nếu máng nghiêng chưa được cân chỉnh phẳng, kết quả đo sẽ:",
      options: [
        "Không bị ảnh hưởng",
        "Chỉ nhanh hơn",
        "Mắc sai số hệ thống (lệch một chiều)",
        "Luôn chính xác hơn",
      ],
      answer: 2,
      explain: "Máng lệch gây sai số hệ thống — mọi lần đo lệch cùng một hướng.",
      category: "experiment",
    },
    // --- Lý thuyết (4) ---
    {
      q: "Công thức vận tốc tức thời tại cổng quang là:",
      options: ["$v = d\\cdot t$", "$v = d/t$", "$v = t/d$", "$v = 2d/t^2$"],
      answer: 1,
      explain: "Bi (đường kính $d$) che cổng trong thời gian $t$ nên $v = d/t$.",
      category: "theory",
    },
    {
      q: "Chuyển động của viên bi trên máng nghiêng là chuyển động:",
      options: [
        "Thẳng đều",
        "Thẳng nhanh dần đều",
        "Tròn đều",
        "Thẳng chậm dần đều",
      ],
      answer: 1,
      explain: "Bi tăng tốc đều dưới thành phần trọng lực dọc máng → thẳng nhanh dần đều.",
      category: "theory",
    },
    {
      q: "Bi đặc lăn không trượt trên máng nghiêng góc $\\theta$ có gia tốc:",
      options: [
        "$a = g\\sin\\theta$",
        "$a = \\tfrac{5}{7}g\\sin\\theta$",
        "$a = \\tfrac{2}{5}g\\sin\\theta$",
        "$a = g$",
      ],
      answer: 1,
      explain: "Một phần cơ năng thành động năng quay nên $a = \\tfrac{5}{7}g\\sin\\theta < g\\sin\\theta$.",
      category: "theory",
    },
    {
      q: "Sai số gián tiếp của $v = d/t$ tính theo:",
      options: [
        "$\\Delta v/v = \\Delta d/d - \\Delta t/t$",
        "$\\Delta v/v = \\Delta d/d + \\Delta t/t$",
        "$\\Delta v = \\Delta d + \\Delta t$",
        "$\\Delta v/v = 2\\Delta t/t$",
      ],
      answer: 1,
      explain: "Với thương số, sai số tương đối cộng lại: $\\Delta v/v = \\Delta d/d + \\Delta t/t$.",
      category: "theory",
    },
  ],
  flashcards: [
    { front: "Vận tốc tức thời (định nghĩa thực nghiệm)", back: "$v = d/t$ — bi đường kính $d$ che một cổng quang trong thời gian $t$ (MODE A).", category: "experiment" },
    { front: "Vận tốc trung bình E–F", back: "$v_{tb} = s_{EF}/t$, với $t$ là thời gian bi đi từ E đến F (MODE A↔B).", category: "experiment" },
    { front: "Chức năng nút Reset", back: "Đưa số đo về 0 trước mỗi lần thả, tránh cộng dồn thời gian.", category: "experiment" },
    { front: "Dụng cụ đo đường kính bi", back: "Thước kẹp du xích (ĐCNN 0,05 mm).", category: "experiment" },
    { front: "Cổng quang điện hoạt động thế nào?", back: "Tia hồng ngoại giữa hai càng; vật che tia → đồng hồ bắt đầu/dừng đếm.", category: "experiment" },
    { front: "Giảm sai số ngẫu nhiên", back: "Đo lặp nhiều lần ở cùng điều kiện rồi lấy trung bình.", category: "experiment" },
    { front: "Loại chuyển động của bi trên máng", back: "Thẳng nhanh dần đều (vận tốc tăng đều theo thời gian).", category: "theory" },
    { front: "Gia tốc bi lăn không trượt", back: "$a = \\tfrac{5}{7}g\\sin\\theta$.", category: "theory" },
    { front: "Vận tốc tại quãng $s$ từ điểm thả", back: "$v = \\sqrt{2as}$.", category: "theory" },
    { front: "Sai số gián tiếp của $v=d/t$", back: "$\\dfrac{\\Delta v}{v} = \\dfrac{\\Delta d}{d} + \\dfrac{\\Delta t}{t}$.", category: "theory" },
  ],
};

const LAB11: LessonReview = {
  quizzes: [
    {
      q: "Trong bài đo gia tốc rơi tự do, nam châm điện có vai trò gì?",
      options: ["Đo thời gian", "Giữ và thả trụ thép", "Đo quãng đường", "Cân bằng máng"],
      answer: 1,
      explain: "Nam châm điện giữ trụ thép; ngắt điện (công tắc kép) → trụ rơi và đồng hồ bắt đầu đếm.",
      category: "experiment",
    },
    {
      q: "Sơ đồ nối dây đúng của Bài 11 là:",
      options: [
        "Công tắc kép → ổ A, cổng quang → ổ B, MODE A↔B",
        "Cổng quang → ổ A, nam châm → ổ B, MODE A",
        "Chỉ nối cổng quang → ổ A, MODE A",
        "Nối tùy ý, MODE T",
      ],
      answer: 0,
      explain: "Công tắc kép vào ổ A (bắt đầu đếm khi thả), cổng quang vào ổ B (dừng), chọn MODE A↔B.",
      category: "experiment",
    },
    {
      q: "Để đổi quãng rơi $s$ giữa các lần đo, ta:",
      options: [
        "Đổi góc nghiêng",
        "Trượt cổng quang dọc máng",
        "Đổi thang đo đồng hồ",
        "Thay trụ thép khác",
      ],
      answer: 1,
      explain: "Cổng quang trượt dọc máng đứng để đặt quãng rơi $s$ theo từng câu.",
      category: "experiment",
    },
    {
      q: "Công thức tính gia tốc rơi tự do từ $(s,t)$:",
      options: ["$g = s/t$", "$g = 2s/t^2$", "$g = \\tfrac{1}{2}st^2$", "$g = t^2/2s$"],
      answer: 1,
      explain: "Từ $s = \\tfrac{1}{2}gt^2$ suy ra $g = 2s/t^2$.",
      category: "theory",
    },
    {
      q: "Vì sao dùng trụ thép mà không dùng giấy hay bóng nhựa?",
      options: [
        "Trụ thép rẻ hơn",
        "Để lực cản không khí không đáng kể so với trọng lực",
        "Vì thép dẫn điện",
        "Để rơi chậm hơn",
      ],
      answer: 1,
      explain: "Vật nặng, nhỏ gọn → lực cản không khí rất nhỏ, chuyển động gần rơi tự do lí tưởng.",
      category: "theory",
    },
  ],
  flashcards: [
    { front: "Rơi tự do là gì?", back: "Sự rơi chỉ dưới tác dụng của trọng lực; thẳng nhanh dần đều, không vận tốc đầu.", category: "theory" },
    { front: "Công thức tính $g$", back: "$g = 2s/t^2$ (từ $s=\\tfrac{1}{2}gt^2$).", category: "theory" },
    { front: "Vai trò nam châm điện", back: "Giữ trụ thép; ngắt điện → thả trụ đồng thời khởi động đồng hồ.", category: "experiment" },
    { front: "Sơ đồ nối dây Bài 11", back: "Công tắc kép → ổ A; cổng quang → ổ B; MODE A↔B.", category: "experiment" },
    { front: "Cách đổi quãng rơi $s$", back: "Trượt cổng quang dọc máng đứng; đọc $s$ trên thước.", category: "experiment" },
  ],
};

export const QUIZ_BANK: Record<string, LessonReview> = {
  "do-toc-do-vat-chuyen-dong": LAB6,
  "do-gia-toc-roi-tu-do": LAB11,
};

export function getReview(lessonId: string): LessonReview | null {
  return QUIZ_BANK[lessonId] ?? null;
}
