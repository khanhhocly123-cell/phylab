/**
 * activity.ts — Ghi sự kiện hoạt động của học sinh (client-side, fire-and-forget).
 *
 * Nuôi phần "cường độ vào app" trên dashboard giáo viên: login, vào lab,
 * nộp bài lab, nộp quiz. Lỗi mạng được nuốt im lặng — KHÔNG được làm phiền UX học sinh.
 */

import type { ActivityType } from "./classTypes";

/** Lấy (hoặc sinh mới) UUID định danh học sinh trên thiết bị này. */
export function getStudentId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("studentId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("studentId", id);
  }
  return id;
}

/** Gửi 1 sự kiện hoạt động. Không await ở call-site — fire and forget. */
export function logActivity(type: ActivityType, studentName: string, meta?: string): void {
  if (typeof window === "undefined") return;
  const studentId = getStudentId();
  if (!studentId || !studentName) return;
  fetch("/api/class/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, studentName, type, meta }),
  }).catch(() => {
    /* im lặng — hoạt động offline vẫn dùng app bình thường */
  });
}
