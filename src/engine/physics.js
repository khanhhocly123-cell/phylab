/**
 * physics.js — Lõi vật lý cho Lab 6 "Đo tốc độ".
 *
 * Mô hình (đã chốt với chủ dự án):
 *  - Máng NGHIÊNG góc θ, bi lăn không trượt: a = (5/7)·g·sinθ.
 *  - Bi thả ở nam châm (đầu cao), tăng tốc suốt dọc máng nên vẫn còn gia tốc
 *    giữa 2 cổng quang E, F.
 *  - Tâm bi cách điểm thả quãng x sau thời gian t:  x = x₀ + ½·a·t².
 *  - Cổng quang bị chắn khi mép bi tới vạch cổng (tâm bi cách cổng < d/2).
 *
 * Sai số (xem noise.js): mỗi lượt lăn có gia tốc hơi khác (ma sát lăn, rung máng),
 * bi tựa nam châm lệch vài phần mm, cổng quang phản hồi trễ vài phần mười ms.
 * Máng chưa cân bằng → bi cọ thành máng (chậm hẳn, tản mạnh); thả khi dây dọi/máng
 * còn rung → tản mạnh hơn. Làm đúng thì các lần đo chụm lại (chỉ lệch ở chữ số cuối).
 */

import { gauss } from "./noise.js";

export const LAB6 = {
  g: 9.8,
  rollFactor: 5 / 7,          // hệ số lăn không trượt cho quả cầu đặc
  angle: { min: 5, max: 35, default: 30 }, // độ
  sE: 0.30,                   // quãng thả→cổng E (m), cổng E mặc định
  sEF: { min: 0.10, max: 0.45, default: 0.25 }, // khoảng giữa 2 cổng (m)
  ball: { defaultMm: 20.0 },  // đường kính bi (mm) — thường lấy từ thước kẹp Prelab
  noise: {
    accel: 0.006,             // σ tương đối của gia tốc mỗi lượt lăn
    release: 0.0008,          // σ vị trí tâm bi khi tựa nam châm (m)
    timer: 0.00025,           // σ trễ phản hồi mỗi tín hiệu cổng quang (s)
    unsteady: 0.012,          // thêm σ gia tốc khi thả lúc máng còn rung
  },
  unbalanced: { accelLoss: 0.035, sigma: 0.012 }, // máng chưa cân bằng: bi cọ thành máng
  scales: {
    fine:   { res: 0.001, max: 9.999, dp: 3, label: "9.999" },
    coarse: { res: 0.01,  max: 99.99, dp: 2, label: "99.99" },
  },
};

const deg2rad = (d) => (d * Math.PI) / 180;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/** Gia tốc dọc máng (m/s²). */
export function accel(thetaDeg) {
  const t = clamp(thetaDeg, 0, 90);
  return LAB6.rollFactor * LAB6.g * Math.sin(deg2rad(t));
}

/** Vận tốc tại một cổng cách điểm thả quãng `s` (m). */
export function velAt(thetaDeg, s) {
  const a = accel(thetaDeg);
  return Math.sqrt(Math.max(0, 2 * a * s));
}

/** Chuẩn hoá tên MODE của MC964 ("A<->B", "A↔B" → "A<->B"). */
export function normalizeMode(mode) {
  const M = String(mode || "").toUpperCase().replace(/\s/g, "");
  return M === "A↔B" || M === "A_TO_B" ? "A<->B" : M;
}

/**
 * Một lượt lăn: gia tốc hiệu dụng, vị trí thả lệch và thời điểm (tính từ lúc thả) tâm bi
 * tới một vị trí bất kì — dùng chung cho số đo và cho hoạt ảnh (đồng bộ tuyệt đối).
 */
export function rollRun({ thetaDeg, balanced = true, steady = true, withNoise = true, rng = Math.random } = {}) {
  let a = accel(thetaDeg);
  let x0 = 0;
  if (withNoise) {
    let sigma = LAB6.noise.accel + (steady ? 0 : LAB6.noise.unsteady);
    let factor = 1;
    if (!balanced) { factor -= LAB6.unbalanced.accelLoss; sigma += LAB6.unbalanced.sigma; }
    a *= Math.max(0.5, factor + sigma * gauss(rng));
    x0 = LAB6.noise.release * gauss(rng);
  }
  const timeAt = (x) => (a > 0 ? Math.sqrt((2 * Math.max(0, x - x0)) / a) : Infinity);
  const posAt = (t) => x0 + 0.5 * a * t * t;
  return { a, x0, timeAt, posAt };
}

/** Các khoảng thời gian MC964 đếm (tính từ lúc thả) theo MODE — [bắt đầu, kết thúc]. */
export function countWindows(mode, run, { sE, sF, dMm }) {
  const r = (Number(dMm) || LAB6.ball.defaultMm) / 2000;
  const eIn = run.timeAt(sE - r), eOut = run.timeAt(sE + r);
  const fIn = run.timeAt(sF - r), fOut = run.timeAt(sF + r);
  switch (normalizeMode(mode)) {
    case "A": return [[eIn, eOut]];                     // bi che cổng E (tức thời tại E)
    case "B": return [[fIn, fOut]];                     // bi che cổng F (tức thời tại F)
    case "A+B": return [[eIn, eOut], [fIn, fOut]];      // tổng thời gian che 2 cổng
    case "A<->B": return [[eIn, fIn]];                  // từ lúc chắn E tới lúc chắn F
    default: return null;                               // T hoặc MODE lạ: không đo được
  }
}

/**
 * Thời gian đồng hồ MC964 hiện ra.
 * @param mode "A" | "B" | "A+B" | "A<->B" | "T"
 * @param thetaDeg góc nghiêng (độ)
 * @param sE quãng thả→cổng E (m)
 * @param sF quãng thả→cổng F (m)  (sF > sE)
 * @param dMm đường kính bi (mm)
 * @param balanced máng đã cân bằng chưa
 * @param steady thả khi máng/dây dọi đã đứng yên chưa
 * @param scale "fine" | "coarse"
 * @param withNoise thêm sai số (false = giá trị lý thuyết)
 * @param run lượt lăn dựng sẵn (rollRun) — để hoạt ảnh và số đo dùng chung một lượt
 * @returns { valid, raw, display, overflow, vE, vF, windows, run }
 */
export function computeTime({
  mode, thetaDeg, sE, sF, dMm, balanced = true, steady = true, scale = "fine", withNoise = true, rng = Math.random, run = null,
} = {}) {
  const sc = LAB6.scales[scale] || LAB6.scales.fine;
  const M = normalizeMode(mode);

  // Mode T: không đo được gì hợp lệ
  if (M === "T") return { valid: false, raw: null, display: "--.--", overflow: false };

  const a0 = accel(thetaDeg);
  const vE = Math.sqrt(Math.max(0, 2 * a0 * sE));
  const vF = Math.sqrt(Math.max(0, 2 * a0 * sF));
  if (a0 <= 0 || vE <= 1e-6) {
    return { valid: false, raw: Infinity, display: "0.000", overflow: true, vE, vF };
  }

  const lap = run || rollRun({ thetaDeg, balanced, steady, withNoise, rng });
  const windows = countWindows(M, lap, { sE, sF, dMm });
  if (!windows) return { valid: false, raw: null, display: "--.--", overflow: false, vE, vF };

  let t = windows.reduce((sum, [start, stop]) => sum + (stop - start), 0);
  // Mỗi lần cổng quang báo tín hiệu (bắt đầu / dừng) trễ ngẫu nhiên một chút.
  if (withNoise) t += LAB6.noise.timer * Math.sqrt(2 * windows.length) * gauss(rng);
  t = Math.max(0.0001, t);

  const overflow = t > sc.max;
  const shown = overflow ? sc.max : Math.round(t / sc.res) * sc.res;
  return { valid: true, raw: t, display: shown.toFixed(sc.dp), overflow, vE, vF, windows, run: lap };
}

/**
 * Đường kính viên bi thép (mm) của từng học sinh: 15,00 → 22,00 mm, bội 0,05 mm (đúng độ chia
 * thước kẹp) — cố định theo tên nên Prelab (đọc thước kẹp) và Phòng Lab (bi lăn) dùng CHUNG một viên.
 */
export function ballDiameterMm(studentName = "Học sinh") {
  let hash = 2166136261;
  const s = String(studentName || "Học sinh");
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return +(15 + ((hash >>> 0) % 141) * 0.05).toFixed(2);
}

/** Định dạng số 0 theo thang đo (khi reset). */
export function zeroDisplay(scale = "fine") {
  const sc = LAB6.scales[scale] || LAB6.scales.fine;
  return (0).toFixed(sc.dp);
}
