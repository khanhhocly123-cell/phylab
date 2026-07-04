/**
 * seededRandom.ts — PRNG có hạt giống (deterministic) cho việc ra đề theo từng học sinh.
 *
 * Mục tiêu: mỗi học sinh nhận một bộ đề khác nhau nhưng ỔN ĐỊNH (mở lại vẫn ra đúng
 * đề đó), để "không có học sinh nào giống nhau và kết quả đo khác nhau" — theo yêu cầu.
 * Không phụ thuộc mạng: hạt giống suy ra từ tên học sinh + mã bài + phần (lab).
 */

/** Băm chuỗi → uint32 (FNV-1a). */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  const s = str || "seed";
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — PRNG 32-bit nhỏ gọn, chất lượng đủ tốt cho việc ra đề. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tạo PRNG từ nhiều mảnh hạt giống (nối chuỗi rồi băm). */
export function makeRng(...parts: Array<string | number>): () => number {
  return mulberry32(hashString(parts.join("|")));
}

/** Số thực ngẫu nhiên trong [min, max], làm tròn theo `step`. */
export function randRange(rng: () => number, min: number, max: number, step = 0): number {
  const x = min + rng() * (max - min);
  if (step > 0) return Math.round(x / step) * step;
  return x;
}

/** Chọn ngẫu nhiên 1 phần tử. */
export function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

/** Lấy `n` giá trị PHÂN BIỆT trong [min,max] theo step (không trùng). */
export function distinctValues(
  rng: () => number,
  n: number,
  min: number,
  max: number,
  step: number
): number[] {
  const out = new Set<number>();
  const slots = Math.floor((max - min) / step) + 1;
  let guard = 0;
  while (out.size < Math.min(n, slots) && guard++ < 1000) {
    const v = +(min + Math.floor(rng() * slots) * step).toFixed(6);
    out.add(v);
  }
  return Array.from(out).sort((a, b) => a - b);
}
