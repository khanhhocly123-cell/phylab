/**
 * teacher/api.ts — Helper gọi API lớp học với Bearer token giáo viên.
 */

export async function teacherGet<T = unknown>(
  token: string,
  action: string,
  params?: Record<string, string>
): Promise<T> {
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  const res = await fetch(`/api/class/${action}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Lỗi tải dữ liệu.");
  return data as T;
}

export async function teacherPost<T = unknown>(
  token: string,
  action: string,
  body: unknown
): Promise<T> {
  const res = await fetch(`/api/class/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Lỗi gửi dữ liệu.");
  return data as T;
}

/** Format thời gian tương đối kiểu "5 phút trước" cho dashboard. */
export function timeAgo(ms: number): string {
  if (!ms) return "chưa hoạt động";
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
}
