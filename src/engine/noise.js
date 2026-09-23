/**
 * noise.js — Sai số ngẫu nhiên "có kiểm soát" cho các phép đo mô phỏng.
 *
 * Mục tiêu sư phạm: làm ĐÚNG quy trình thì các lần đo chụm quanh giá trị thật (ổn định),
 * nhưng không bao giờ giống hệt nhau (đo thật luôn tản nhẹ). Phân bố chuẩn bị cắt ở ±k·σ
 * để không có lần đo nào "bay" ra giá trị vô lý — sai lệch lớn chỉ đến từ thao tác sai
 * (chưa cân bằng, thả khi còn rung…), và bench luôn nói rõ nguyên nhân.
 */

/**
 * Số ngẫu nhiên phân bố chuẩn N(0, 1) (Box–Muller), cắt ở ±k.
 * @param {() => number} [rng] nguồn ngẫu nhiên [0, 1)
 * @param {number} [k] ngưỡng cắt (số độ lệch chuẩn)
 */
export function gauss(rng = Math.random, k = 2.5) {
  for (let guard = 0; guard < 16; guard++) {
    const u = 1 - rng();
    const v = rng();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    if (Math.abs(z) <= k) return z;
  }
  return 0;
}

/** Nhiễu cộng thêm có độ lệch chuẩn `sigma`. */
export const jitter = (sigma, rng = Math.random) => sigma * gauss(rng);

/** Làm tròn theo độ chia nhỏ nhất của dụng cụ (vd. 0,001 s; 0,1 mA). */
export const quantize = (value, resolution) => Math.round(value / resolution) * resolution;
