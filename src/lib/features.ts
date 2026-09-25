/**
 * features.ts — Cờ bật/tắt tính năng lớn của app.
 *
 * classroom: Lớp học (học sinh nhập mã lớp, giáo viên giao bài / quiz / theo dõi, nộp bài, ghi nhật
 * ký hoạt động). Đang TẠM KHOÁ: mục "Lớp của tôi" hiện khoá, không gọi API lớp học, tài khoản giáo
 * viên thấy thông báo tạm khoá. Mở lại: đổi thành true — code lớp học vẫn giữ nguyên.
 */
export const FEATURES = {
  classroom: false,
} as const;

export const CLASSROOM_LOCKED_MESSAGE = "Chức năng Lớp học đang tạm khoá — sẽ mở lại sau.";
