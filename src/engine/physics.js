/**
 * physics.js — Lõi vật lý cho Lab 6 "Đo tốc độ".
 *
 * Mô hình (đã chốt với chủ dự án):
 *  - Máng NGHIÊNG góc θ, bi lăn không trượt: a = (5/7)·g·sinθ.
 *  - Bi thả ở nam châm (đầu cao), tăng tốc suốt dọc máng nên vẫn còn gia tốc
 *    giữa 2 cổng quang E, F.
 *  - Vận tốc tại cổng cách điểm thả một quãng s: v(s) = √(2·a·s).
 *
 * Các con số hình học / bộ số liệu ở đây do dựng để hợp lý, chỉnh thoải mái.
 */

export const LAB6 = {
  g: 9.8,
  rollFactor: 5 / 7,          // hệ số lăn không trượt cho quả cầu đặc
  angle: { min: 5, max: 35, default: 30 }, // độ
  sE: 0.30,                   // quãng thả→cổng E (m), cổng E mặc định
  sEF: { min: 0.10, max: 0.45, default: 0.25 }, // khoảng giữa 2 cổng (m)
  ball: { defaultMm: 20.0 },  // đường kính bi (mm) — thường lấy từ thước kẹp Prelab
  noise: 0.01,                // ± sai số tương đối mỗi lần đo (~1%)
  skew: { min: 0.03, max: 0.05 }, // lệch hệ thống khi máng chưa cân bằng (s)
  scales: {
    fine:   { res: 0.001, max: 9.999, dp: 3, label: "9.999" },
    coarse: { res: 0.01,  max: 99.99, dp: 2, label: "99.99" },
  },
};

// Bộ số liệu trợ lý Phylab gợi ý
export const SUGGESTED = {
  // Đo vận tốc trung bình (mode A↔B): thay đổi góc θ và khoảng cách s_EF
  average: [
    { theta: 15, sEF: 0.20 },
    { theta: 15, sEF: 0.30 },
    { theta: 20, sEF: 0.20 },
    { theta: 20, sEF: 0.30 },
    { theta: 25, sEF: 0.25 },
    { theta: 25, sEF: 0.35 },
  ],
  // Đo vận tốc tức thời (mode A): chỉ thay đổi góc θ
  instant: [{ theta: 15 }, { theta: 20 }, { theta: 25 }],
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

/**
 * Thời gian đồng hồ MC964 hiện ra.
 * @param mode "A" | "B" | "A+B" | "A<->B" | "T"
 * @param thetaDeg góc nghiêng (độ)
 * @param sE quãng thả→cổng E (m)
 * @param sF quãng thả→cổng F (m)  (sF > sE)
 * @param dMm đường kính bi (mm)
 * @param balanced máng đã cân bằng chưa
 * @param scale "fine" | "coarse"
 * @param withNoise thêm nhiễu/skew (false = giá trị lý thuyết)
 * @returns { valid, raw, display, overflow, vE, vF }
 */
export function computeTime({
  mode, thetaDeg, sE, sF, dMm, balanced = true, scale = "fine", withNoise = true,
} = {}) {
  const sc = LAB6.scales[scale] || LAB6.scales.fine;
  const M = String(mode || "").toUpperCase().replace(/\s/g, "");

  // Mode T: không đo được gì hợp lệ
  if (M === "T") return { valid: false, raw: null, display: "--.--", overflow: false };

  const a = accel(thetaDeg);
  const d = (Number(dMm) || LAB6.ball.defaultMm) / 1000;
  const vE = Math.sqrt(Math.max(0, 2 * a * sE));
  const vF = Math.sqrt(Math.max(0, 2 * a * sF));

  if (a <= 0 || vE <= 1e-6) {
    return { valid: false, raw: Infinity, display: "0.000", overflow: true, vE, vF };
  }

  let base;
  switch (M) {
    case "A":      base = d / vE; break;                 // che cổng A (tức thời tại E)
    case "B":      base = d / vF; break;                 // che cổng B (tức thời tại F)
    case "A+B":    base = d / vE + d / vF; break;        // tổng thời gian che 2 cổng
    case "A<->B":
    case "A↔B":
    case "A_TO_B": base = (vF - vE) / a; break;          // đi từ A đến B (trung bình)
    default:       return { valid: false, raw: null, display: "--.--", overflow: false, vE, vF };
  }

  let t = base;
  if (withNoise) {
    if (!balanced) t += LAB6.skew.min + Math.random() * (LAB6.skew.max - LAB6.skew.min);
    t *= 1 + (Math.random() - 0.5) * 2 * LAB6.noise; // sai số tương đối ~±1%
  }
  t = Math.max(0.0001, t);

  const overflow = t > sc.max;
  const shown = overflow ? sc.max : Math.round(t / sc.res) * sc.res;
  return { valid: true, raw: t, display: shown.toFixed(sc.dp), overflow, vE, vF };
}

/** Định dạng số 0 theo thang đo (khi reset). */
export function zeroDisplay(scale = "fine") {
  const sc = LAB6.scales[scale] || LAB6.scales.fine;
  return (0).toFixed(sc.dp);
}
