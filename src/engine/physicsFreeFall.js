/**
 * physicsFreeFall.js — Lõi vật lý cho Lab 11 "Thực hành đo gia tốc rơi tự do".
 *
 * Mô hình (SGK Vật lí 10 – Kết Nối Tri Thức, Bài 11):
 *  - Trụ thép được nam châm điện giữ ở đỉnh máng đứng; nhấn công tắc kép → ngắt
 *    điện nam châm → trụ thép RƠI TỰ DO, đồng thời đồng hồ bắt đầu đếm.
 *  - Khi trụ thép cắt tia hồng ngoại ở cổng quang (cách vị trí thả một quãng s),
 *    đồng hồ dừng → đọc t.
 *  - Rơi tự do:  s = ½·g·t²  ⇒  g = 2s / t².
 *  - Giá đỡ 3 chân phải cân bằng (dây dọi song song máng); nếu chưa cân bằng,
 *    máng lệch phương thẳng đứng → sai số hệ thống (skew) làm t hơi lớn.
 *
 * Tách riêng khỏi physics.js (mô hình lăn nghiêng của Lab 6) để mỗi file chỉ mô
 * tả một mô hình vật lý. Dùng chung g và thang đo MC964 với LAB6 (một nguồn sự thật).
 */

import { LAB6 } from "./physics.js";

export const FREEFALL = {
  g: LAB6.g,                                             // 9.8 — khớp Lab 6
  s: { min: 0.20, max: 0.80, default: 0.40, steps: 5 }, // quãng rơi (m); 5 vị trí cổng quang
  noise: 0.01,                                           // sai số ngẫu nhiên tương đối ~1%
  skew: { min: 0.02, max: 0.04 },                        // lệch hệ thống khi giá đỡ CHƯA cân bằng (s)
  scales: LAB6.scales,                                   // dùng chung thang đo MC964 (fine/coarse)
};

/** 5 vị trí cổng quang trợ lý Phylab gợi ý (m). */
export const SUGGESTED_FF = [0.30, 0.40, 0.50, 0.60, 0.70];

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * Thời gian rơi tự do lý thuyết/đo được cho quãng đường s.
 * @param {number} s quãng rơi (m)
 * @param {{balanced?:boolean, withNoise?:boolean}} opts
 * @returns {number} thời gian (s)
 */
export function freeFallTime(s, { balanced = true, withNoise = true } = {}) {
  const dist = Math.max(0, Number(s) || 0);
  let t = Math.sqrt((2 * dist) / FREEFALL.g);
  if (withNoise) {
    if (!balanced) t += FREEFALL.skew.min + Math.random() * (FREEFALL.skew.max - FREEFALL.skew.min);
    t *= 1 + (Math.random() - 0.5) * 2 * FREEFALL.noise; // ~±1%
  }
  return Math.max(0.0001, t);
}

/** Gia tốc suy ra từ một phép đo (s, t):  g = 2s / t². */
export function gFromMeasurement(s, t) {
  const tt = Number(t) || 0;
  return tt > 0 ? (2 * (Number(s) || 0)) / (tt * tt) : 0;
}

/**
 * Số hiển thị trên MC964 cho một lần thả, đã lượng tử hoá theo thang đo.
 * @returns { valid, raw, display, overflow }
 */
export function computeFallTime({ s, balanced = true, scale = "fine", withNoise = true } = {}) {
  const sc = FREEFALL.scales[scale] || FREEFALL.scales.fine;
  const dist = clamp(Number(s) || 0, 0, 100);
  if (dist <= 0) return { valid: false, raw: 0, display: (0).toFixed(sc.dp), overflow: false };
  const t = freeFallTime(dist, { balanced, withNoise });
  const overflow = t > sc.max;
  const shown = overflow ? sc.max : Math.round(t / sc.res) * sc.res;
  return { valid: true, raw: t, display: shown.toFixed(sc.dp), overflow };
}
