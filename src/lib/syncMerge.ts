/**
 * syncMerge.ts — Luật gộp dữ liệu đồng bộ giữa máy học sinh và máy chủ (dùng chung cho cả hai phía).
 *
 * Mỗi khoá là một "tập chỉ lớn lên" hoặc "bản mới nhất thắng", gộp kiểu nào cũng ra cùng kết quả và gộp
 * lại lần nữa không đổi gì: hai máy lưu lệch nhau (một máy mất mạng) thì lần đồng bộ sau vẫn không mất dữ liệu.
 *  - prelabPassed: bài đã qua Prelab — hợp (đã qua ở máy nào cũng tính).
 *  - reports:      báo cáo trong Sổ Báo Cáo — hợp theo id, mới nhất trước, giữ tối đa MAX_REPORTS.
 *  - tours:        hướng dẫn / huy hiệu đã xem — mỗi mục lấy mốc thời gian lớn nhất.
 *  - updatesSeen:  thông báo cập nhật đã đọc — hợp.
 *  - labData:      số đo vừa xuất từ Phòng Lab, chờ lập báo cáo — bản có `at` mới hơn thắng.
 *
 * Giá trị luôn được chuẩn hoá về dạng chính tắc (khoá sắp xếp, mảng theo thứ tự cố định) để so sánh bằng
 * JSON.stringify là biết có đổi hay không. File không import gì — test Node nạp thẳng được.
 */

export const SYNC_KEYS = ["prelabPassed", "reports", "tours", "updatesSeen", "labData"] as const;
export type SyncKey = (typeof SYNC_KEYS)[number];

/** Giới hạn mỗi khoá khi lưu (D1 cho tối đa 2 MB mỗi dòng). */
export const SYNC_MAX_BYTES = 900_000;
export const MAX_REPORTS = 60;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

export function isSyncKey(key: unknown): key is SyncKey {
  return typeof key === "string" && (SYNC_KEYS as readonly string[]).includes(key);
}

/** Mốc thời gian của báo cáo (id dạng "rep-<epoch ms>") để xếp mới nhất trước. */
function reportTime(report: Obj): number {
  const m = /(\d{10,})/.exec(String(report.id));
  return m ? Number(m[1]) : 0;
}

function sortReports(list: Obj[]): Obj[] {
  return [...list]
    .sort((a, b) => reportTime(b) - reportTime(a) || String(a.id).localeCompare(String(b.id)))
    .slice(0, MAX_REPORTS);
}

/** Đưa giá trị về đúng dạng của khoá (dữ liệu hỏng thì thành rỗng) — gộp và lưu không bao giờ lỗi. */
export function normalizeSyncValue(key: SyncKey, value: unknown): unknown {
  switch (key) {
    case "prelabPassed": {
      const out: Record<string, true> = {};
      if (isObj(value)) {
        for (const k of Object.keys(value).sort()) if (value[k] === true && k.length <= 80) out[k] = true;
      }
      return out;
    }
    case "tours": {
      const out: Record<string, number> = {};
      if (isObj(value)) {
        for (const k of Object.keys(value).sort()) {
          const v = value[k];
          if (typeof v === "number" && Number.isFinite(v) && v > 0 && k.length <= 40) out[k] = v;
        }
      }
      return out;
    }
    case "updatesSeen":
      return Array.isArray(value)
        ? [...new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 60))].sort().slice(0, 300)
        : [];
    case "reports": {
      if (!Array.isArray(value)) return [];
      const byId = new Map<string, Obj>();
      for (const r of value) {
        if (isObj(r) && typeof r.id === "string" && r.id.length <= 80 && typeof r.lessonId === "string" && !byId.has(r.id)) byId.set(r.id, r);
      }
      return sortReports([...byId.values()]);
    }
    case "labData":
      return isObj(value) && typeof value.at === "number" && Number.isFinite(value.at) && typeof value.lessonId === "string" && Array.isArray(value.trials)
        ? value
        : null;
  }
}

/** Gộp hai giá trị của cùng một khoá. `a` là bản đang có, `b` là bản mới gửi tới. */
export function mergeSyncValue(key: SyncKey, a: unknown, b: unknown): unknown {
  const x = normalizeSyncValue(key, a);
  const y = normalizeSyncValue(key, b);
  switch (key) {
    case "prelabPassed":
      return normalizeSyncValue(key, { ...(x as Obj), ...(y as Obj) });
    case "tours": {
      const out: Record<string, number> = { ...(x as Record<string, number>) };
      for (const [k, v] of Object.entries(y as Record<string, number>)) out[k] = Math.max(out[k] ?? 0, v);
      return normalizeSyncValue(key, out);
    }
    case "updatesSeen":
      return normalizeSyncValue(key, [...(x as string[]), ...(y as string[])]);
    case "reports":
      return normalizeSyncValue(key, [...(x as Obj[]), ...(y as Obj[])]);
    case "labData": {
      const p = x as Obj | null;
      const q = y as Obj | null;
      if (!p) return q;
      if (!q) return p;
      return (q.at as number) >= (p.at as number) ? q : p;
    }
  }
}

/** Số byte UTF-8 khi lưu. */
export function syncBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

/** Cắt bớt cho vừa giới hạn lưu: báo cáo bỏ bớt bản cũ nhất; khoá khác quá lớn thì null (từ chối). */
export function fitSyncValue(key: SyncKey, value: unknown): unknown | null {
  if (syncBytes(value) <= SYNC_MAX_BYTES) return value;
  if (key !== "reports") return null;
  const list = [...(value as Obj[])];
  while (list.length > 0 && syncBytes(list) > SYNC_MAX_BYTES) list.pop();
  return list;
}
