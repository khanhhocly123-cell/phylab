/**
 * physicsFreeFall.js — Lõi vật lý cho Lab 11 "Thực hành đo gia tốc rơi tự do".
 *
 * Mô hình (SGK Vật lí 10 – Kết Nối Tri Thức, Bài 11):
 *  - Trụ thép được nam châm điện giữ ở đỉnh máng đứng; nhấn công tắc kép → ngắt
 *    điện nam châm → trụ thép RƠI TỰ DO, đồng thời đồng hồ bắt đầu đếm.
 *  - Khi trụ thép cắt tia hồng ngoại ở cổng quang (cách vị trí thả một quãng s),
 *    đồng hồ dừng → đọc t.
 *  - Rơi tự do:  s = ½·g·t²  ⇒  g = 2s / t².
 *
 * Sai số như đo thật (xem noise.js):
 *  - Nam châm còn TỪ DƯ nên trụ rời ra chậm ~1 ms sau khi đồng hồ đã đếm → t hơi lớn,
 *    g đo được hơi nhỏ (rõ hơn ở quãng rơi ngắn) — đúng kiểu kết quả ~9,7 m/s² trên lớp.
 *  - Gắn trụ lại mỗi lần lệch vài phần mm; cổng quang phản hồi trễ vài phần mười ms.
 *  - Thả khi trụ còn đung đưa → trụ xoay/quệt, t tản mạnh; giá chưa cân bằng → quệt thành máng.
 *
 * Tách riêng khỏi physics.js (mô hình lăn nghiêng của Lab 6) để mỗi file chỉ mô
 * tả một mô hình vật lý. Dùng chung g và thang đo MC964 với LAB6 (một nguồn sự thật).
 */

import { LAB6 } from "./physics.js";
import { gauss } from "./noise.js";

export const FREEFALL = {
  g: LAB6.g,                                             // 9.8 — khớp Lab 6
  s: { min: 0.20, max: 0.80, default: 0.40, steps: 5 }, // quãng rơi (m)
  noise: {
    releaseDelay: { mean: 0.0012, sigma: 0.0011 },       // từ dư của nam châm: mỗi lần rời chậm khác nhau (s)
    start: 0.001,                                        // σ vị trí đáy trụ khi gắn lại (m)
    timer: 0.0002,                                       // σ trễ phản hồi của cổng quang (s)
  },
  swing: { delay: 0.0018, sigma: 0.0025 },               // thả khi trụ còn đung đưa
  unbalanced: { delay: 0.006, sigma: 0.003 },            // giá chưa cân bằng: trụ quệt thành máng
  settleMs: 1300,                                        // trụ đứng yên sau khi gắn lại (ms)
  scales: LAB6.scales,                                   // dùng chung thang đo MC964 (fine/coarse)
};

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * Một lần thả: trễ lúc rời nam châm, vị trí đáy trụ lệch và thời gian đồng hồ đếm.
 * Hoạt ảnh và số đo dùng chung một lượt nên đồng hồ dừng đúng lúc trụ chạm tia.
 */
export function fallRun(s, { balanced = true, steady = true, withNoise = true, rng = Math.random } = {}) {
  const dist = Math.max(0, Number(s) || 0);
  let delay = 0;
  let s0 = 0;
  let extra = 0;
  if (withNoise) {
    const N = FREEFALL.noise;
    delay = Math.max(0, N.releaseDelay.mean + N.releaseDelay.sigma * gauss(rng));
    s0 = N.start * gauss(rng);
    extra = N.timer * gauss(rng);
    if (!steady) extra += FREEFALL.swing.delay + FREEFALL.swing.sigma * Math.abs(gauss(rng));
    if (!balanced) extra += FREEFALL.unbalanced.delay + FREEFALL.unbalanced.sigma * Math.abs(gauss(rng));
  }
  const fall = Math.sqrt((2 * Math.max(0, dist - s0)) / FREEFALL.g);
  return { delay, s0, t: Math.max(0.0001, delay + fall + extra) };
}

/**
 * Thời gian rơi tự do lý thuyết/đo được cho quãng đường s.
 * @param {number} s quãng rơi (m)
 * @param {{balanced?:boolean, steady?:boolean, withNoise?:boolean, rng?:() => number}} opts
 * @returns {number} thời gian (s)
 */
export function freeFallTime(s, opts = {}) {
  return fallRun(s, opts).t;
}

/** Gia tốc suy ra từ một phép đo (s, t):  g = 2s / t². */
export function gFromMeasurement(s, t) {
  const tt = Number(t) || 0;
  return tt > 0 ? (2 * (Number(s) || 0)) / (tt * tt) : 0;
}

/**
 * Đường thẳng s = k·t² đi qua gốc toạ độ khớp các điểm đo (bình phương tối thiểu) → g = 2k.
 * sigma: sai số chuẩn của g — càng nhiều điểm, càng nhỏ.
 * @param {Array<{ s: number, t: number }>} points
 */
export function fitFreeFall(points) {
  const pts = points.filter((p) => p.t > 0 && p.s > 0);
  if (!pts.length) return null;
  const sxy = pts.reduce((sum, p) => sum + p.s * p.t * p.t, 0);
  const sxx = pts.reduce((sum, p) => sum + p.t ** 4, 0);
  const k = sxy / sxx;
  let sigma = null;
  if (pts.length >= 2) {
    const rss = pts.reduce((sum, p) => sum + (p.s - k * p.t * p.t) ** 2, 0);
    sigma = 2 * Math.sqrt(rss / (pts.length - 1) / sxx);
  }
  return { g: 2 * k, sigma, n: pts.length };
}

/**
 * Số hiển thị trên MC964 cho một lần thả, đã lượng tử hoá theo thang đo.
 * @returns { valid, raw, display, overflow, run }
 */
export function computeFallTime({ s, balanced = true, steady = true, scale = "fine", withNoise = true, rng = Math.random, run = null } = {}) {
  const sc = FREEFALL.scales[scale] || FREEFALL.scales.fine;
  const dist = clamp(Number(s) || 0, 0, 100);
  if (dist <= 0) return { valid: false, raw: 0, display: (0).toFixed(sc.dp), overflow: false };
  const lap = run || fallRun(dist, { balanced, steady, withNoise, rng });
  const overflow = lap.t > sc.max;
  const shown = overflow ? sc.max : Math.round(lap.t / sc.res) * sc.res;
  return { valid: true, raw: lap.t, display: shown.toFixed(sc.dp), overflow, run: lap };
}
