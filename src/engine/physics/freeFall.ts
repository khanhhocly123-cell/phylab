/**
 * Physics engine cho các thí nghiệm Phylab.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUY ƯỚC THÊM BÀI MỚI (engine pattern)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 1. Mỗi thí nghiệm là 1 file trong thư mục này (vd `freeFall.ts`, `inclinedPlane.ts`).
 * 2. Mỗi file export đúng 1 hàm `simulateXxx(...)` có signature chuẩn:
 *
 *      export function simulateXxx(
 *        ...inputs tham số đầu vào từ UI (s, t, góc, ...),
 *        ...hằng số vật lý (g, μ, k, ...),
 *        noisePercent: number = <mặc định hợp lý>
 *      ): { timeMeasured: number, ...derived }
 *
 *    Trong đó `timeMeasured` là t đo được (đã nhiễu) — NGUỒN DUY NHẤT cho `t`
 *    trong toàn bộ app (gồm cả timer MC964 lẫn DataBook) theo bất biến #1.
 *
 * 3. KHÔNG sinh 2 giá trị `t` riêng. Animation render với `t * VISUAL_SLOWDOWN`,
 *    không phải `t` mới.
 *
 * 4. KHÔNG dùng Math.random() để ra số "sạch". Luôn dùng `getGaussianRandom(mean, σ)`
 *    để nhiễu giống phòng lab thật.
 *
 * 5. Hàm không được side-effect (không log, không setState, không DOM).
 *    Thuần function để sau này gọi được từ web worker / SSR / test.
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

// ─── Math helpers ──────────────────────────────────────────────────────────

/**
 * Box–Muller Gaussian random: `mean ± stddev`.
 * Trả về phân phối chuẩn, dùng để mô phỏng sai số đo.
 */
export function getGaussianRandom(mean: number, stddev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stddev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ─── Engine bài 6: Tốc độ tức thời (máng nghiêng) ──────────────────────────
// File: inclinedPlane.ts

// ─── Engine bài 11: Gia tốc rơi tự do ──────────────────────────────────────
// File: freeFall.ts (ở trên)
//
// Tham số UI:
//   - s (m): quãng đường rơi = 0.20 → 1.20
//   - g (m/s²): mặc định 9.806
// Nhiễu lý tưởng: 0.5% (thấp hơn bài 6 vì bài 11 chỉ 1 cổng quang,
//   sai số chỉ phụ thuộc MC964 + thời điểm nhả nam châm điện).
//
// Công thức:
//   t_ly_thuyet = √(2s / g)
//   t_đo = t_ly_thuyet + N(0, σ), σ = t_ly_thuyet × noisePercent

/**
 * Simulates the time for a free fall over distance `s` (meters).
 * Tham khảo cho bài 11 — file kế thừa là `freeFall.ts`.
 *
 * @param s              Quãng đường rơi (m).
 * @param g              Gia tốc trọng trường (mặc định 9.806).
 * @param noisePercent   Độ lệch chuẩn nhiễu (mặc định 0.005 = 0.5%).
 * @returns              timeMeasured: thời gian rơi đo được (giây), đã cộng nhiễu Gauss.
 */
export function simulateFreeFall(
  s: number,
  g: number = 9.806,
  noisePercent: number = 0.005
): number {
  // t_ly_thuyet = √(2s / g)
  const theoreticalTime = Math.sqrt((2 * s) / g);

  // σ = 0.5% × t (rất nhỏ vì bài 11 ít nguồn sai số hơn bài 6)
  const stddev = theoreticalTime * noisePercent;

  let timeMeasured = getGaussianRandom(theoreticalTime, stddev);
  if (timeMeasured <= 0) timeMeasured = theoreticalTime;

  return timeMeasured;
}
