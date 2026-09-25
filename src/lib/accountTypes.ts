/**
 * accountTypes.ts — Kiểu dữ liệu tài khoản dùng chung cho client và server (không import gì phía server).
 */

export type AccountRole = "student" | "teacher" | "admin";

/** Thông tin tài khoản trả về trình duyệt (không bao giờ kèm mật khẩu/băm). */
export interface PublicAccount {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  grade: number | null;
  school: string | null;
  createdAt: number;
  /** Tài khoản cấu hình bằng biến môi trường (admin test, giáo viên demo): mật khẩu đổi trên Cloudflare, không đổi trong app. */
  envManaged: boolean;
}

export const ROLE_LABEL: Record<AccountRole, string> = {
  student: "Học sinh",
  teacher: "Giáo viên",
  admin: "Admin (test)",
};

export const GRADES = [10, 11, 12] as const;
export const NAME_MAX = 60;
export const SCHOOL_MAX = 80;
