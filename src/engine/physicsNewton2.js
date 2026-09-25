/**
 * physicsNewton2.js — Lõi vật lý cho Bài 15 (Vật lí 10 KNTT) "Định luật 2 Newton",
 * mục III "Thí nghiệm minh hoạ định luật 2 Newton".
 *
 * Bố trí đúng Hình 15.2: xe trượt M = 200 g trên máng đệm khí, buộc vào sợi dây vắt qua rãnh ròng rọc;
 * đầu dây móc các quả nặng m = 50 g (hộp 10 quả). "Vật" là HỆ gồm xe trượt + quả nặng đặt trên xe +
 * quả nặng treo; lực kéo F = trọng lượng các quả treo. Hai cổng quang cách nhau s = 0,5 m; tấm chắn sáng
 * dài 10 cm đặt SÁT cổng quang 1 để v0 = 0; đồng hồ MODE A↔B đo t từ lúc tấm chắn tới cổng 1 tới lúc
 * tới cổng 2 → s = ½·a·t² ⇒ a = 2s/t² = 1/t².
 *
 * SGK lấy g ≈ 10 m/s² (mỗi quả 50 g nặng 0,5 N → 2, 4, 6 quả treo cho F = 1, 2, 3 N). Chuyển động mô phỏng
 * dùng g = 9,8 m/s², ròng rọc có quán tính nhỏ và lực cản rất nhỏ của đệm khí → a đo được thấp hơn
 * F/(M + m) chừng 2–4 %, giống số liệu Bảng 15.1.
 *
 * Làm ẩu thì số liệu lệch rõ (bench nói vì sao):
 *  - Chưa bật bơm khí: xe tì lên máng, ma sát lớn → xe không nhúc nhích (F nhỏ) hoặc a nhỏ hẳn.
 *  - Máng chưa nằm ngang: thành phần trọng lực dọc máng (máng dốc ngược về phía bơm) làm a nhỏ đi.
 *  - Tấm chắn không sát cổng 1: tới cổng 1 xe đã có vận tốc → t ngắn → a = 2s/t² lớn hơn thật.
 */

import { LAB6 } from "./physics.js";
import { gauss } from "./noise.js";

export const NEWTON2 = {
  g: LAB6.g,               // 9,8 m/s² — chuyển động thật (khớp Bài 6, 11)
  gSgk: 10,                // SGK lấy g ≈ 10 m/s² khi tính lực kéo
  M: 0.2,                  // xe trượt (kg)
  m: 0.05,                 // mỗi quả nặng (kg)
  box: 10,                 // hộp 10 quả nặng giống nhau
  s: 0.5,                  // khoảng cách hai cổng quang (m)
  flag: 0.1,               // tấm chắn sáng dài 10 cm
  pulleyMass: 0.003,       // khối lượng tương đương quán tính ròng rọc (kg)
  airDrag: 0.004,          // lực cản của đệm khí (N) — rất nhỏ
  friction: { static: 0.26, kinetic: 0.2 },  // bơm tắt: xe tì lên máng nhôm
  /** Máy nén khí: nấc lưu lượng 0 (tắt) · 1 (yếu: đệm khí mỏng, xe còn cọ máng) · 2 (vừa) · 3 (mạnh). */
  pumpLevels: ["Tắt", "Yếu", "Vừa", "Mạnh"],
  weakFriction: { static: 0.07, kinetic: 0.05 },
  tiltDeg: 0.45,           // máng chưa chỉnh: dốc ngược về phía bơm khí (độ)
  startMax: 0.1,           // xe xuất phát tối đa 10 cm trước cổng 1 (m)
  snap: 0.012,             // kéo xe tới gần cổng 1 dưới 1,2 cm → coi là "sát cổng 1"
  noise: {
    accel: 0.004,          // σ tương đối của gia tốc mỗi lượt (đệm khí không đều tuyệt đối)
    start: 0.00002,        // tay thả lệch vài chục µm dù đã đặt sát cổng 1 (m)
    timer: 0.0002,         // σ trễ phản hồi mỗi tín hiệu cổng quang (s)
  },
  scales: LAB6.scales,     // thang đo MC964 dùng chung
  /** Năm cột của Bảng 15.1: số quả TREO (tạo F) và số quả ĐẶT TRÊN XE. */
  sgkConfigs: [
    { key: "c1", hang: 2, cart: 0 }, // F = 1 N, M + m = 0,3 kg
    { key: "c2", hang: 2, cart: 2 }, // F = 1 N, M + m = 0,4 kg
    { key: "c3", hang: 2, cart: 4 }, // F = 1 N, M + m = 0,5 kg
    { key: "c4", hang: 4, cart: 2 }, // F = 2 N, M + m = 0,5 kg
    { key: "c5", hang: 6, cart: 0 }, // F = 3 N, M + m = 0,5 kg
  ],
  /** Số liệu SGK (Bảng 15.1) — để đối chiếu và làm số liệu mẫu ở Sổ Báo Cáo. */
  sgkTable: [
    { F: 1, mass: 0.3, t: 0.55, a: 3.31 },
    { F: 1, mass: 0.4, t: 0.64, a: 2.44 },
    { F: 1, mass: 0.5, t: 0.71, a: 1.99 },
    { F: 2, mass: 0.5, t: 0.5, a: 4.03 },
    { F: 3, mass: 0.5, t: 0.42, a: 5.67 },
  ],
};

const round = (v, dp) => +Number(v).toFixed(dp);

/** Lực kéo F theo SGK (N): trọng lượng các quả treo, g ≈ 10 m/s². */
export const forceOf = (hang) => round(hang * NEWTON2.m * NEWTON2.gSgk, 3);
/** Khối lượng của hệ vật M + m (kg): xe + quả trên xe + quả treo. */
export const massOf = (hang, cart) => round(NEWTON2.M + (hang + cart) * NEWTON2.m, 3);
/** Cấu hình SGK (0..4) khớp với số quả treo / trên xe, hoặc -1. */
export const sgkIndexOf = (hang, cart) => NEWTON2.sgkConfigs.findIndex((c) => c.hang === hang && c.cart === cart);

/** Nấc máy nén khí từ boolean cũ (true = vừa) hoặc số 0..3. */
export const pumpLevelOf = (pump) => (pump === true ? 2 : pump === false || pump == null ? 0 : Math.max(0, Math.min(3, Number(pump) || 0)));
/** Ma sát giữa xe và máng theo nấc máy nén khí; null = xe nổi hẳn trên đệm khí. */
export function frictionOf(pump) {
  const lvl = pumpLevelOf(pump);
  return lvl === 0 ? NEWTON2.friction : lvl === 1 ? NEWTON2.weakFriction : null;
}

/**
 * Gia tốc thật của hệ (m/s²) khi dây căng; 0 nếu xe không nhúc nhích.
 * @param {{ hang: number, cart: number, pump?: boolean | number, level?: boolean }} cfg  pump: true/false hoặc nấc 0..3
 */
export function trueAccel({ hang, cart, pump = true, level = true }) {
  const { g, m, M } = NEWTON2;
  if (hang <= 0) return 0;
  const onTrack = M + cart * m;                                  // phần đè lên máng
  const total = M + (hang + cart) * m + NEWTON2.pulleyMass;
  let drive = hang * m * g;
  if (!level) drive -= onTrack * g * Math.sin((NEWTON2.tiltDeg * Math.PI) / 180);
  const mu = frictionOf(pump);
  if (mu) {
    const normal = onTrack * g;
    if (drive <= mu.static * normal) return 0;                    // ma sát nghỉ giữ xe lại
    drive -= mu.kinetic * normal;
  } else {
    drive -= NEWTON2.airDrag;
  }
  return Math.max(0, drive / total);
}

/**
 * Kế hoạch chuyển động khi BUÔNG TAY xe tại x0 (m, vị trí mép trước tấm chắn so với cổng 1; âm = còn
 * trước cổng 1), vận tốc đầu 0. Các pha gia tốc không đổi:
 *  1. dây căng (chồng quả treo chưa chạm đệm hứng, x < xLand): gia tốc trueAccel (+ nhiễu mỗi lượt);
 *  2. dây chùng (quả đã nằm trên đệm): không còn lực kéo — xe trôi đều, chỉ chậm dần nếu còn ma sát;
 *  3. chạm đệm cao su cuối máng (xEnd) thì dừng.
 * Nếu buông khi quả treo đã nằm trên đệm (x0 ≥ xLand) hay lực kéo không thắng ma sát nghỉ thì xe đứng yên.
 * @returns {{ moves: boolean, a: number, tEnd: number, xAt: (t:number)=>number, vAt: (t:number)=>number, timeAtX: (x:number)=>number, tLand: number, xStop: number }}
 */
export function planMotion({ hang, cart, pump = 2, level = true, x0, xLand, xEnd, withNoise = true, rng = Math.random }) {
  const still = { moves: false, a: 0, tEnd: 0, tLand: Infinity, xStop: x0, xAt: () => x0, vAt: () => 0, timeAtX: (x) => (x <= x0 ? 0 : Infinity) };
  if (x0 >= xLand || x0 >= xEnd) return still;
  let a1 = trueAccel({ hang, cart, pump, level });
  if (!(a1 > 0)) return still;
  if (withNoise) a1 *= 1 + NEWTON2.noise.accel * gauss(rng);
  const { g, m, M } = NEWTON2;
  const mu = frictionOf(pump);
  const total = M + (hang + cart) * m + NEWTON2.pulleyMass;
  // pha 2: dây chùng → chỉ còn ma sát (đệm khí: lực cản rất nhỏ)
  const a2 = mu ? -mu.kinetic * g : -NEWTON2.airDrag / total;
  const x1 = Math.min(xLand, xEnd);
  const t1 = Math.sqrt((2 * (x1 - x0)) / a1);
  const v1 = a1 * t1;
  let tStop = Infinity, xStop = xEnd, tEnd;
  if (x1 >= xEnd) {
    tEnd = t1; xStop = xEnd;
  } else {
    // từ x1 với v1, gia tốc a2 ≤ 0: tới đệm cuối máng hay dừng trước?
    const dist = xEnd - x1;
    const disc = v1 * v1 + 2 * a2 * dist;
    if (disc >= 0) {
      tEnd = t1 + (a2 === 0 ? dist / v1 : (-v1 + Math.sqrt(disc)) / a2);
      xStop = xEnd;
    } else {
      tStop = -v1 / a2;
      tEnd = t1 + tStop;
      xStop = x1 + v1 * tStop + 0.5 * a2 * tStop * tStop;
    }
  }
  const xAt = (t) => {
    if (t <= 0) return x0;
    if (t <= t1) return x0 + 0.5 * a1 * t * t;
    const u = Math.min(t, tEnd) - t1;
    return Math.min(xStop, x1 + v1 * u + 0.5 * a2 * u * u);
  };
  const vAt = (t) => (t <= 0 ? 0 : t <= t1 ? a1 * t : t >= tEnd ? 0 : v1 + a2 * (t - t1));
  /** Thời điểm mép tấm chắn tới vị trí x (chuyển động luôn tiến); Infinity nếu không tới. */
  const timeAtX = (x) => {
    if (x <= x0) return 0;
    if (x > xStop + 1e-12) return Infinity;
    if (x <= x1) return Math.sqrt((2 * (x - x0)) / a1);
    const dx = x - x1;
    if (a2 === 0) return t1 + dx / v1;
    const disc = v1 * v1 + 2 * a2 * dx;
    return disc < 0 ? Infinity : t1 + (-v1 + Math.sqrt(disc)) / a2;
  };
  return { moves: true, a: a1, tEnd, tLand: x1 < xEnd ? t1 : Infinity, xStop, xAt, vAt, timeAtX };
}

/**
 * Một lần thả xe. d = quãng từ mép tấm chắn tới cổng 1 lúc thả (m, 0 = sát cổng 1);
 * drop = quãng xe đi được thì chồng quả treo chạm đệm hứng dưới sàn (m) — sau đó dây chùng,
 * không còn lực kéo, xe chạy đều. Trả về gia tốc của lượt và các mốc thời gian (tính từ lúc thả)
 * để hoạt ảnh và số đo đồng bộ.
 */
export function newtonRun({ hang, cart, pump = true, level = true, d = 0, drop = Infinity, withNoise = true, rng = Math.random } = {}) {
  let a = trueAccel({ hang, cart, pump, level });
  let d0 = Math.min(NEWTON2.startMax, Math.max(0, Number(d) || 0));
  let lag = 0;
  if (withNoise && a > 0) {
    a *= 1 + NEWTON2.noise.accel * gauss(rng);
    d0 += NEWTON2.noise.start * Math.abs(gauss(rng));
    lag = NEWTON2.noise.timer * Math.SQRT2 * gauss(rng);
  }
  const land = Math.max(0, drop);
  const tLand = a > 0 ? Math.sqrt((2 * land) / a) : Infinity;
  const vLand = a * tLand;
  /** Thời điểm (s, tính từ lúc thả) mép tấm chắn đi được quãng x (m). */
  const timeAt = (x) => {
    if (!(a > 0)) return Infinity;
    const xx = Math.max(0, x);
    return xx <= land ? Math.sqrt((2 * xx) / a) : tLand + (xx - land) / vLand;
  };
  /** Quãng đã đi (m) và vận tốc (m/s) tại thời điểm t. */
  const posAt = (t) => (t <= tLand ? 0.5 * a * t * t : land + vLand * (t - tLand));
  const velAt = (t) => (t <= tLand ? a * t : vLand);
  const t1 = timeAt(d0);                         // mép tấm chắn tới cổng 1
  const t2 = timeAt(d0 + NEWTON2.s);             // tới cổng 2
  return { a, d0, lag, t1, t2, tLand, timeAt, posAt, velAt, landsEarly: land < d0 + NEWTON2.s, moves: a > 0 };
}

/** Các khoảng MC964 đếm (tính từ lúc thả) theo MODE: A↔B = từ cổng 1 tới cổng 2 (SGK). */
export function countWindows(mode, run) {
  const w = NEWTON2.flag;
  const g1In = run.t1, g1Out = run.timeAt(run.d0 + w);
  const g2In = run.t2, g2Out = run.timeAt(run.d0 + NEWTON2.s + w);
  switch (String(mode).replace("↔", "<->")) {
    case "A": return [[g1In, g1Out]];             // thời gian tấm chắn che cổng 1
    case "B": return [[g2In, g2Out]];             // thời gian tấm chắn che cổng 2
    case "A+B": return [[g1In, g1Out], [g2In, g2Out]];
    case "A<->B": return [[g1In, g2In]];          // từ cổng 1 tới cổng 2 — phép đo của SGK
    default: return null;                          // T: không đo được
  }
}

/**
 * Số MC964 hiện ra cho một lượt.
 * @returns {{ valid: boolean, raw: number|null, display: string, overflow?: boolean, run: object }}
 */
export function computeNewtonTime({ mode = "A<->B", scale = "fine", run }) {
  const sc = NEWTON2.scales[scale] || NEWTON2.scales.fine;
  if (!run?.moves) return { valid: false, raw: null, display: (0).toFixed(sc.dp), run };
  const windows = countWindows(mode, run);
  if (!windows) return { valid: false, raw: null, display: "--.--", run };
  let t = windows.reduce((sum, [a, b]) => sum + (b - a), 0) + run.lag;
  t = Math.max(0.0001, t);
  const overflow = t > sc.max;
  const shown = overflow ? sc.max : Math.round(t / sc.res) * sc.res;
  return { valid: true, raw: t, display: shown.toFixed(sc.dp), overflow, windows, run };
}

/** a = 2s/t² (SGK, s = 0,5 m ⇒ a = 1/t²). */
export function accelFromTime(t, s = NEWTON2.s) {
  const tt = Number(t) || 0;
  return tt > 0 ? (2 * s) / (tt * tt) : 0;
}

/** Đường thẳng y = k·x qua gốc toạ độ (bình phương tối thiểu) + sai số chuẩn của k. */
export function fitOrigin(points) {
  const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!pts.length) return null;
  const sxx = pts.reduce((sum, p) => sum + p.x * p.x, 0);
  if (sxx <= 0) return null;
  const k = pts.reduce((sum, p) => sum + p.x * p.y, 0) / sxx;
  let sigma = null;
  if (pts.length >= 2) {
    const rss = pts.reduce((sum, p) => sum + (p.y - k * p.x) ** 2, 0);
    sigma = Math.sqrt(rss / (pts.length - 1) / sxx);
  }
  return { k, sigma, n: pts.length };
}
