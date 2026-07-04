/**
 * lessonMatch.ts — Phân loại trang SGK đã OCR → bài thực hành, kèm ĐỘ TIN CẬY THẬT.
 *
 * Độ tin cậy KHÔNG hard-code: suy ra từ chính văn bản OCR (mức khớp từ khoá có
 * trọng số). Nếu văn bản quá nghèo hoặc không đủ khớp → recognized=false
 * ("không nhận diện được"), đúng yêu cầu bỏ fallback giả.
 */

export type MatchLessonId = "do-toc-do-vat-chuyen-dong" | "do-gia-toc-roi-tu-do";

export interface MatchResult {
  recognized: boolean;
  lessonId: MatchLessonId | null;
  title: string;
  confidence: number; // 0..1 — độ tin cậy thật
  reason?: string;
}

const TITLES: Record<MatchLessonId, string> = {
  "do-gia-toc-roi-tu-do": "Bài 11: Đo gia tốc rơi tự do (SGK Vật lí 10 KNTT)",
  "do-toc-do-vat-chuyen-dong": "Bài 6: Đo tốc độ tức thời của vật chuyển động (SGK Vật lí 10 KNTT)",
};

// Từ khoá có trọng số: cụm đặc trưng (3) > cụm chung (2) > tín hiệu yếu (1).
const KEYWORDS: Record<MatchLessonId, Array<[string, number]>> = {
  "do-gia-toc-roi-tu-do": [
    ["rơi tự do", 3], ["roi tu do", 3], ["gia tốc rơi tự do", 3], ["gia toc roi tu do", 3],
    ["free fall", 3], ["nam châm điện", 2], ["nam cham dien", 2], ["trụ thép", 2], ["tru thep", 2],
    ["dây dọi", 2], ["day doi", 2], ["công tắc kép", 2], ["cong tac kep", 2],
    ["bài 11", 2], ["bai 11", 2], ["g = 2s", 2], ["gravity", 1], ["11", 0.5],
  ],
  "do-toc-do-vat-chuyen-dong": [
    ["tốc độ tức thời", 3], ["toc do tuc thoi", 3], ["vận tốc tức thời", 3], ["van toc tuc thoi", 3],
    ["máng nghiêng", 3], ["mang nghieng", 3], ["tốc độ trung bình", 2], ["toc do trung binh", 2],
    ["cổng quang", 2], ["cong quang", 2], ["thước cặp", 2], ["thuoc cap", 2],
    ["viên bi", 2], ["vien bi", 2], ["bài 6", 2], ["bai 6", 2], ["ramp", 1], ["6", 0.5],
  ],
};

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreLesson(normText: string, kws: Array<[string, number]>): number {
  let score = 0;
  for (const [kw, w] of kws) {
    if (normText.includes(normalize(kw))) score += w;
  }
  return score;
}

/**
 * Phân loại. `apiConfidence` (nếu API OCR trả) được nhân vào độ tin cậy cuối.
 */
export function classifyLesson(rawText: string, apiConfidence?: number): MatchResult {
  const norm = normalize(rawText);
  // Văn bản quá ngắn → coi như không đọc được nội dung.
  if (norm.replace(/[^a-z0-9]/g, "").length < 6) {
    return { recognized: false, lessonId: null, title: "", confidence: 0, reason: "empty_text" };
  }

  const sFree = scoreLesson(norm, KEYWORDS["do-gia-toc-roi-tu-do"]);
  const sInc = scoreLesson(norm, KEYWORDS["do-toc-do-vat-chuyen-dong"]);
  const winnerScore = Math.max(sFree, sInc);
  const loserScore = Math.min(sFree, sInc);
  const lessonId: MatchLessonId = sFree >= sInc ? "do-gia-toc-roi-tu-do" : "do-toc-do-vat-chuyen-dong";

  // Cần tối thiểu tín hiệu để nhận diện.
  if (winnerScore < 3) {
    return { recognized: false, lessonId: null, title: "", confidence: 0, reason: "low_match" };
  }

  // Độ tin cậy khớp: winner áp đảo loser + độ mạnh tín hiệu (bão hoà ở score ~8).
  const dominance = winnerScore / (winnerScore + loserScore + 1); // 0.5..1
  const strength = Math.min(1, winnerScore / 8);                   // 0..1
  let confidence = 0.5 * dominance * 2 * strength + 0.5 * strength; // trộn
  confidence = Math.min(1, Math.max(0, confidence));

  // Nếu API OCR có confidence riêng thì kết hợp (trung bình có trọng số).
  if (typeof apiConfidence === "number" && apiConfidence > 0) {
    confidence = 0.6 * confidence + 0.4 * Math.min(1, apiConfidence);
  }

  const recognized = confidence >= 0.55;
  return {
    recognized,
    lessonId: recognized ? lessonId : null,
    title: recognized ? TITLES[lessonId] : "",
    confidence: Math.round(confidence * 100) / 100,
    reason: recognized ? "ok" : "below_threshold",
  };
}
