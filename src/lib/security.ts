/**
 * security.ts — Tiện ích BẢO MẬT THÔNG TIN cơ bản dùng chung ở các API route.
 *
 * Mục tiêu (phòng thủ theo chiều sâu cho app học sinh):
 *  - Chặn payload quá lớn / sai kiểu → tránh DoS và abuse prompt SmartBot.
 *  - Làm sạch text người dùng trước khi nhồi vào prompt LLM (bỏ ký tự điều khiển,
 *    kẹp độ dài) → giảm rủi ro prompt-injection & lỗi hiển thị.
 *  - Kiểm tra file upload (kiểu ảnh + dung lượng) trước khi gửi lên VNPT.
 *
 * LƯU Ý: token/khoá VNPT chỉ đọc bằng process.env TRONG route handler (server-side),
 * KHÔNG bao giờ trả về client. Các hàm ở đây chạy server-side cùng route.
 */

/** Giới hạn độ dài text cho từng loại tác vụ. */
export const LIMITS = {
  chat: 2000,      // câu hỏi / summary chấm điểm
  problemPrompt: 4000,
  tts: 5000,       // SmartVoice cho tối đa 5000 ký tự
  uploadBytes: 8 * 1024 * 1024, // 8 MB / ảnh
} as const;

/** Các định dạng ảnh hợp lệ cho OCR/eKYC. */
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic"];

// Ky tu can loai bo: control C0 (tru tab/newline), DEL/C1, zero-width & BOM.
// Xay bang RegExp constructor tu chuoi uXXXX de KHONG nhung ky tu dieu khien tho vao source.
const STRIP_RE = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F\\u200B-\\u200D\\uFEFF]",
  "g"
);

/**
 * Làm sạch chuỗi người dùng: ép về string, bỏ ký tự điều khiển/zero-width (giữ \n, \t),
 * chuẩn hoá khoảng trắng thừa và KẸP độ dài. Trả về "" nếu input không phải chuỗi.
 */
export function sanitizeText(input: unknown, maxLen: number): string {
  if (typeof input !== "string") return "";
  const cleaned = input
    .replace(STRIP_RE, "")
    .replace(/[ \t]{3,}/g, "  ")
    .trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

/** Kết quả kiểm tra file ảnh upload. */
export interface FileCheck {
  ok: boolean;
  reason?: string;
}

/** Kiểm tra 1 File upload: phải là ảnh hợp lệ và không vượt dung lượng. */
export function checkImageFile(file: File | null, maxBytes = LIMITS.uploadBytes): FileCheck {
  if (!file) return { ok: false, reason: "Thiếu file ảnh." };
  if (typeof file.size === "number" && file.size > maxBytes) {
    return { ok: false, reason: `Ảnh quá lớn (tối đa ${Math.round(maxBytes / 1024 / 1024)}MB).` };
  }
  // Một số blob mock không có type — chỉ chặn khi có type rõ ràng mà không hợp lệ.
  if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return { ok: false, reason: `Định dạng ảnh không hỗ trợ (${file.type}).` };
  }
  return { ok: true };
}
