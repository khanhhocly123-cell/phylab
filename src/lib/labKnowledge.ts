/**
 * labKnowledge.ts — Kho tài liệu (RAG) cho trợ lý PhyLab.
 *
 * Dùng cho ô "Hỏi trợ lý về thí nghiệm": route /api/vnpt/chat gọi retrieveAnswer()
 * làm câu trả lời khi VNPT SmartBot không sẵn sàng, để trợ lý luôn trả lời được
 * đúng kiến thức các bài thực hành cơ học và điện đang có trong ứng dụng.
 *
 * Cơ chế RAG gọn nhẹ, chạy offline: mỗi tài liệu có `keywords` + `answer`.
 * retrieveAnswer() chuẩn hoá câu hỏi (bỏ dấu), chấm điểm trùng khớp từ khoá,
 * rồi ghép 1–2 đoạn liên quan nhất thành câu trả lời.
 */

export interface KBDoc {
  id: string;
  keywords: string[];   // từ/cụm khoá (không dấu cũng khớp nhờ chuẩn hoá)
  answer: string;
}

/** Bỏ dấu tiếng Việt + hạ thường để so khớp không phụ thuộc dấu. */
export function normalizeVi(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

export const KNOWLEDGE_BASE: KBDoc[] = [
  {
    id: "greetings",
    keywords: ["chao", "hello", "hi", "xin chao", "chao anh", "chao ban", "chao tro ly"],
    answer: "Chào em! Anh là trợ lý Phylab, trợ giảng vật lí lớp 10. Em cần anh giúp gì về bài thực hành Đo tốc độ (Bài 6) hay Đo gia tốc rơi tự do (Bài 11) nào?",
  },
  {
    id: "bot-identity",
    keywords: ["ai do", "ban la ai", "ten la gi", "tro ly", "phylab", "ten gi"],
    answer: "Anh là trợ lý Phylab, người bạn đồng hành giúp em thực hiện các bài thí nghiệm vật lí ảo, hướng dẫn lắp ráp dụng cụ và phân tích kết quả đo đạc.",
  },
  {
    id: "thanks",
    keywords: ["cam on", "thank", "tuyet voi", "ok", "da hieu", "tot lam"],
    answer: "Không có gì đâu nè! Chúc em làm thí nghiệm thật vui và đạt kết quả tốt nhé. Có thắc mắc gì cứ hỏi anh.",
  },
  {
    id: "instant-speed",
    keywords: ["van toc tuc thoi", "tuc thoi", "instant", "v = d/t", "v=d/t", "che cong"],
    answer:
      "Vận tốc tức thời là vận tốc tại một thời điểm (một vị trí) xác định. Trong bài, ta lấy gần đúng bằng cách cho viên bi (đường kính d) che một cổng quang, đo thời gian che t, rồi tính v = d / t. Trên đồng hồ MC964 hãy để MODE A (đo thời gian che một cổng), đo ở vài góc nghiêng θ rồi so sánh.",
  },
  {
    id: "average-speed",
    keywords: ["van toc trung binh", "trung binh", "average", "sef", "s_ef", "hai cong", "e den f", "a<->b khoang"],
    answer:
      "Vận tốc trung bình trên đoạn giữa hai cổng E–F: v_tb = s_EF / t, với s_EF là khoảng cách hai cổng và t là thời gian bi đi từ E đến F. Chọn MODE A↔B trên MC964 để đo đúng khoảng thời gian này. Đổi góc θ và khoảng s_EF theo từng câu trong đề.",
  },
  {
    id: "free-fall-g",
    keywords: ["roi tu do", "gia toc roi tu do", "g = 2s", "2s/t", "s = 1/2", "half g t", "tinh g", "bai 11"],
    answer:
      "Rơi tự do là chuyển động chỉ dưới tác dụng của trọng lực, thẳng nhanh dần đều và không vận tốc đầu: s = ½·g·t². Từ đó suy ra gia tốc rơi tự do g = 2s / t². Em đo quãng rơi s (kéo cổng quang dọc máng) và thời gian rơi t (đồng hồ MC964) rồi tự tính g, so với g chuẩn ≈ 9,8 m/s².",
  },
  {
    id: "incline-accel",
    keywords: ["mang nghieng", "lan khong truot", "5/7", "gia toc mang", "a = g sin", "bi dac", "rolling"],
    answer:
      "Viên bi đặc lăn không trượt trên máng nghiêng góc θ có gia tốc dọc máng a = (5/7)·g·sinθ (nhỏ hơn g·sinθ vì một phần năng lượng thành chuyển động quay). Vận tốc tại một cổng cách điểm thả quãng s là v = √(2·a·s).",
  },
  {
    id: "photogate",
    keywords: ["cong quang", "hong ngoai", "cam bien", "photogate", "tia sang", "che tia"],
    answer:
      "Cổng quang điện có một tia hồng ngoại giữa hai càng. Khi vật che tia, mạch phát tín hiệu để đồng hồ bắt đầu hoặc dừng đếm. Nhờ vậy đo được thời gian rất ngắn mà không phụ thuộc phản xạ tay người, giúp phép đo chính xác hơn nhiều.",
  },
  {
    id: "electromagnet",
    keywords: ["nam cham dien", "giu vat", "tha vat", "nam cham", "electromagnet"],
    answer:
      "Nam châm điện dùng lực từ giữ trụ thép (hoặc viên bi) ở vị trí thả. Khi ngắt điện nam châm (qua công tắc kép), lực từ mất, vật bắt đầu rơi tự do và đồng hồ bắt đầu đếm cùng lúc — nhờ vậy thời điểm bắt đầu đo trùng với thời điểm thả.",
  },
  {
    id: "double-switch-wiring",
    keywords: ["cong tac kep", "noi day", "cam vao o a", "cam vao o b", "so do mach", "wiring", "mach dien", "cong tac"],
    answer:
      "Sơ đồ điện Bài 11: nối dây công tắc kép → nam châm điện (để công tắc điều khiển việc nhả vật), công tắc kép → ổ A của đồng hồ (bắt đầu đếm ngay khi nhả), và cổng quang → ổ B (dừng đếm khi trụ đi qua). Chọn MODE A↔B. Nhấn công tắc kép để đồng thời ngắt nam châm và khởi động đồng hồ.",
  },
  {
    id: "mc964-mode",
    keywords: ["mode", "che do do", "a<->b", "a+b", "nut mode", "che do"],
    answer:
      "Núm MODE trên MC964: A↔B đo khoảng thời gian giữa hai tín hiệu (đo vận tốc trung bình E→F, hoặc rơi tự do); A (hoặc B) đo thời gian che một cổng (vận tốc tức thời); A+B đo tổng thời gian che hai cổng; T là chế độ khác không dùng ở đây.",
  },
  {
    id: "reset-accumulate",
    keywords: ["reset", "cong don", "ve 0", "khong reset", "so cu", "dat lai"],
    answer:
      "Trước MỖI lần đo phải nhấn nút Reset đỏ để đưa số về 0. Nếu quên Reset, đồng hồ MC964 sẽ CỘNG DỒN thời gian của lần đo mới vào số cũ, khiến t đọc được lớn hơn thực tế và kết quả tính sẽ sai.",
  },
  {
    id: "scale",
    keywords: ["thang do", "9.999", "99.99", "dcnn", "do chia", "0.001", "0.01"],
    answer:
      "MC964 có hai thang: 9,999 s (độ chia nhỏ nhất 0,001 s) và 99,99 s (độ chia 0,01 s). Thời gian đo trong hai bài này rất ngắn nên chọn thang 9,999 s để đọc mịn và chính xác hơn.",
  },
  {
    id: "instrument-error",
    keywords: ["sai so dung cu", "sai so", "thuoc kep sai so", "dong ho sai so", "±", "do chinh xac dung cu"],
    answer:
      "Sai số dụng cụ thường lấy bằng độ chia nhỏ nhất: thước kẹp du xích ±0,05 mm (hoặc theo ĐCNN của thước), đồng hồ MC964 ±0,001 s, cổng quang ±0,0003 s. Đây là sai số hệ thống đi kèm mỗi lần đọc số.",
  },
  {
    id: "random-error",
    keywords: ["sai so ngau nhien", "do lap", "trung binh nhieu lan", "giam sai so", "lap lai"],
    answer:
      "Mỗi lần đo còn có sai số ngẫu nhiên (khoảng ±1%) do nhiều yếu tố nhỏ. Để giảm sai số ngẫu nhiên, hãy đo lặp lại nhiều lần ở cùng điều kiện rồi lấy giá trị trung bình; sai số của trung bình sẽ nhỏ hơn từng lần đo.",
  },
  {
    id: "indirect-error",
    keywords: ["sai so gian tiep", "sai so tuong doi", "dv/v", "dg/g", "cong thuc sai so", "delta"],
    answer:
      "Sai số gián tiếp tính theo sai số tương đối: với v = d/t thì Δv/v = Δd/d + Δt/t; với g = 2s/t² thì Δg/g = Δs/s + 2·Δt/t (số 2 vì t lên luỹ thừa 2). Nhân sai số tương đối với giá trị trung bình để ra sai số tuyệt đối.",
  },
  {
    id: "plumb-balance",
    keywords: ["day doi", "can bang", "thang dung", "vit can bang", "plumb", "chan de"],
    answer:
      "Dây dọi luôn chỉ phương thẳng đứng, dùng để căn cho máng thật thẳng đứng (Bài 11) hoặc cân giá đỡ. Nếu giá đỡ lệch, vật có thể chạm thành máng khi rơi/lăn, gây sai số hệ thống. Khi dây dọi song song máng thì siết vít cố định.",
  },
  {
    id: "caliper",
    keywords: ["thuoc kep", "du xich", "vernier", "doc thuoc kep", "duong kinh bi", "0.05 mm", "thuoc cap"],
    answer:
      "Thước kẹp du xích: vạch 0 của du xích chỉ phần nguyên trên thước chính; phần lẻ đọc ở vạch du xích trùng khít nhất với một vạch thước chính, nhân với độ chia (0,05 mm). Dùng nó đo đường kính d của viên bi để tính vận tốc tức thời v = d/t.",
  },
  {
    id: "why-steel-cylinder",
    keywords: ["tru thep", "tai sao dung tru", "vat nang", "suc can khong khi", "khong dung giay", "bong nhua"],
    answer:
      "Dùng trụ thép (vật nặng, nhỏ gọn) để lực cản không khí không đáng kể so với trọng lực, nên chuyển động rất gần rơi tự do lý tưởng. Vật nhẹ như giấy hay bóng nhựa chịu sức cản không khí lớn, sẽ không rơi tự do đúng nghĩa và cho g sai nhiều.",
  },
  {
    id: "ohm-law-resistance",
    keywords: ["dinh luat ohm", "do dien tro", "r = u/i", "u/i", "vat dan x", "vat dan y"],
    answer: "Định luật Ohm cho vật dẫn kim loại ở nhiệt độ ổn định: I = U/R, nên R = U/I. Trong Lab 23, em đo 5 cặp (U,I) cho X và 5 cặp cho Y. Nếu vật dẫn tuân theo định luật Ohm, đồ thị I–U gần là đường thẳng qua gốc và U/I gần như không đổi cho từng mẫu.",
  },
  {
    id: "digital-meter-wiring",
    keywords: ["ampe ke", "von ke", "dong ho so", "mode ma", "mode v", "noi tiep", "song song"],
    answer: "Đồng hồ đo dòng phải đặt mode mA/A, dây đen vào COM, dây đỏ vào cổng mA/A và mắc nối tiếp. Đồng hồ đo áp đặt mode V DC, dây đen vào COM, dây đỏ vào VΩ và mắc song song hai đầu vật dẫn. Luôn mở khóa K khi đổi dây hoặc đổi mode.",
  },
  {
    id: "emf-compensation",
    keywords: ["suat dien dong", "pin dien hoa", "dien tro trong", "do thi u i", "bien tro", "ampe ke", "von ke"],
    answer: "Đo nhiều cặp hiệu điện thế U và dòng điện I khi thay đổi biến trở, rồi dùng phương trình U = E − Ir. Trên đồ thị U theo I, tung độ gốc là suất điện động E và độ lớn hệ số góc là điện trở trong r. Ampe kế mắc nối tiếp, vôn kế mắc song song với hai cực pin.",
  },
];

/**
 * retrieveAnswer — chấm điểm trùng khớp từ khoá rồi ghép câu trả lời.
 * @returns câu trả lời (đã ghép) hoặc null nếu không đủ liên quan.
 */
export function retrieveAnswer(query: string): string | null {
  const q = " " + normalizeVi(query) + " ";
  if (q.trim() === "") return null;
  const qWords = new Set(q.trim().split(" ").filter((w) => w.length >= 2));

  // khớp theo ranh giới từ để tránh trùng nhầm bên trong từ khác (vd "o b" trong "chao ban")
  const hasPhrase = (nkw: string) => q.includes(" " + nkw + " ");

  const scored = KNOWLEDGE_BASE.map((doc) => {
    let score = 0;
    for (const kw of doc.keywords) {
      const nkw = normalizeVi(kw);
      if (!nkw) continue;
      const words = nkw.split(" ");
      if (hasPhrase(nkw)) score += words.length >= 2 ? words.length + 1 : 2; // cụm dài trọng số cao hơn
      else if (words.length >= 2 && words.every((w) => qWords.has(w))) score += 1;
    }
    return { doc, score };
  }).filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const top = scored[0];
  // Nếu có đoạn thứ hai cũng khá liên quan (điểm ≥ nửa đoạn đầu), ghép thêm.
  const second = scored[1];
  if (second && second.score >= Math.max(2, top.score / 2)) {
    return `${top.doc.answer}\n\n${second.doc.answer}`;
  }
  return top.doc.answer;
}

/**
 * retrievePassages — trả về top-K đoạn tri thức liên quan nhất (cho RAG context).
 * Dùng để nhồi ngữ cảnh vào advance_prompt của SmartBot, giúp bot trả lời có căn cứ.
 */
export function retrievePassages(query: string, k = 3): KBDoc[] {
  const q = " " + normalizeVi(query) + " ";
  if (q.trim() === "") return [];
  const qWords = new Set(q.trim().split(" ").filter((w) => w.length >= 2));
  const hasPhrase = (nkw: string) => q.includes(" " + nkw + " ");

  const scored = KNOWLEDGE_BASE.map((doc) => {
    let score = 0;
    for (const kw of doc.keywords) {
      const nkw = normalizeVi(kw);
      if (!nkw) continue;
      const words = nkw.split(" ");
      if (hasPhrase(nkw)) score += words.length >= 2 ? words.length + 1 : 2;
      else if (words.length >= 2 && words.every((w) => qWords.has(w))) score += 1;
    }
    return { doc, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, k).map((s) => s.doc);
}

/** Ghép ngữ cảnh RAG thành 1 chuỗi để đưa vào prompt của LLM/SmartBot. */
export function buildRagContext(query: string, k = 3): string {
  const passages = retrievePassages(query, k);
  if (passages.length === 0) return "";
  return passages.map((p, i) => `[Tài liệu ${i + 1}] ${p.answer}`).join("\n");
}
