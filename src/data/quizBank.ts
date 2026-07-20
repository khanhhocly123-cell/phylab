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

const LAB23: LessonReview = {
  quizzes: [
    { q: "Ampe kế trong mạch đo điện trở phải mắc thế nào?", options: ["Nối tiếp vật dẫn", "Song song vật dẫn", "Song song nguồn", "Không cần mắc"], answer: 0, explain: "Ampe kế phải nằm trên nhánh chính để toàn bộ dòng qua vật dẫn cũng đi qua đồng hồ.", category: "experiment" },
    { q: "Vôn kế đo U hai đầu vật dẫn phải mắc thế nào?", options: ["Song song vật dẫn", "Nối tiếp vật dẫn", "Nối tiếp khóa K", "Nối tắt nguồn"], answer: 0, explain: "Vôn kế so sánh điện thế tại hai đầu nên luôn mắc song song.", category: "experiment" },
    { q: "Trước khi đổi vật dẫn X sang Y cần làm gì?", options: ["Mở khóa K", "Tăng điện áp cực đại", "Đổi V sang mA", "Nối tắt vật dẫn"], answer: 0, explain: "Mở khóa để mạch không có dòng khi thay đổi cấu hình.", category: "experiment" },
    { q: "Công thức xác định điện trở từ số đo U, I là:", options: ["$R=U/I$", "$R=UI$", "$R=I/U$", "$R=U+I$"], answer: 0, explain: "Từ định luật Ohm $I=U/R$ suy ra $R=U/I$.", category: "theory" },
    { q: "Vật dẫn tuân theo định luật Ohm có đồ thị I–U dạng:", options: ["Đường thẳng qua gốc", "Parabol", "Đường tròn", "Đường thẳng ngang"], answer: 0, explain: "$I=U/R$ nên I tỉ lệ thuận U khi R không đổi.", category: "theory" },
  ],
  flashcards: [
    { front: "Cách mắc ampe kế", back: "Mắc nối tiếp với vật dẫn, đúng cực và đúng mode mA/A.", category: "experiment" },
    { front: "Cách mắc vôn kế", back: "Mắc song song hai đầu vật dẫn, đúng cực và mode V DC.", category: "experiment" },
    { front: "Quy tắc đổi dây", back: "Mở khóa K và tắt nguồn trước khi lắp hoặc đổi dây.", category: "experiment" },
    { front: "Định luật Ohm", back: "$I=U/R$, hay $R=U/I$.", category: "theory" },
    { front: "Ý nghĩa điện trở", back: "Đại lượng đặc trưng mức độ cản trở dòng điện của vật dẫn, đơn vị Ω.", category: "theory" },
  ],
};

const LAB26: LessonReview = {
  quizzes: [
    { q: "Trong mạch đo, ampe kế phải mắc:", options: ["Nối tiếp", "Song song", "Nối tắt pin", "Ngoài mạch"], answer: 0, explain: "Dòng mạch chính phải đi qua ampe kế.", category: "experiment" },
    { q: "Muốn có nhiều cặp U–I khác nhau cần:", options: ["Thay đổi biến trở", "Đảo pin liên tục", "Nối tắt điện trở", "Đổi đơn vị đo"], answer: 0, explain: "Biến trở làm thay đổi điện trở mạch ngoài và dòng điện.", category: "experiment" },
    { q: "Trước khi nối lại mạch phải:", options: ["Mở khóa K", "Đóng khóa K", "Nối tắt pin", "Đặt biến trở về 0 Ω"], answer: 0, explain: "Ngắt mạch giúp tránh chập mạch và bảo vệ đồng hồ.", category: "experiment" },
    { q: "Phương trình đặc trưng của nguồn là:", options: ["$U=E-Ir$", "$U=E+Ir$", "$E=UI$", "$I=Ur$"], answer: 0, explain: "Hiệu điện thế mạch ngoài bằng suất điện động trừ độ giảm thế trong nguồn.", category: "theory" },
    { q: "Trên đồ thị U theo I, tung độ gốc là:", options: ["Suất điện động E", "Điện trở trong r", "Điện trở ngoài", "Công suất"], answer: 0, explain: "Khi I=0, phương trình U=E−Ir cho U=E.", category: "theory" },
  ],
  flashcards: [
    { front: "Cách mắc ampe kế", back: "Mắc nối tiếp trong mạch chính, đúng cực và thang mA.", category: "experiment" },
    { front: "Cách mắc vôn kế", back: "Mắc song song với hai cực pin, đúng cực và thang V.", category: "experiment" },
    { front: "Vai trò biến trở", back: "Tạo nhiều giá trị dòng điện để thu các cặp U–I.", category: "experiment" },
    { front: "Phương trình nguồn", back: "$U=E-Ir$.", category: "theory" },
    { front: "Đọc đồ thị U–I", back: "Tung độ gốc là E; độ lớn hệ số góc là r.", category: "theory" },
  ],
};

export const QUIZ_BANK: Record<string, LessonReview> = {
  "do-toc-do-vat-chuyen-dong": LAB6,
  "do-gia-toc-roi-tu-do": LAB11,
  "do-dien-tro-dinh-luat-ohm": LAB23,
  "do-suat-dien-dong-pin-dien-hoa": LAB26,
};

export function getReview(lessonId: string): LessonReview | null {
  return QUIZ_BANK[lessonId] ?? null;
}
