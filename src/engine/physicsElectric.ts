/** Lõi vật lý thuần cho hai thí nghiệm điện lớp 11. */

export const OHM_CONDUCTORS = {
  X: { resistance: 120, color: "#2563eb" },
  Y: { resistance: 220, color: "#dc2626" },
} as const;

export type OhmMaterial = keyof typeof OHM_CONDUCTORS;

export const ELECTRIC_LIMITS = {
  ohmVoltage: { min: 1, max: 10, step: 1 },
  driverVoltage: { min: 1.8, max: 2.4, step: 0.1 },
  slideWireLengthCm: 100,
  balanceToleranceMv: 12,
} as const;

/**
 * Mạch Bài 23 như đo thật: nguồn chỉnh liên tục (có sai lệch hiệu chuẩn nhỏ + điện trở trong),
 * ampe kế nấc mA có điện trở shunt, vật dẫn NÓNG LÊN khi dòng lớn (R tăng) và nguội khi mở K.
 * → U đọc trên vôn kế luôn hơi khác số trên núm nguồn; giữ K đóng lâu ở điện áp cao thì
 *   số đo "trôi" — đúng ý SGK: định luật Ohm cho vật dẫn kim loại ở nhiệt độ ỔN ĐỊNH.
 */
export const OHM_SETUP = {
  source: { min: 0, max: 10, step: 0.1, calibration: 0.004, internal: 0.3 },
  ammeterBurden: 2,        // Ω — shunt của nấc mA
  switchResistance: 0.02,  // Ω
  heat: {
    pRef: 0.8,             // W — công suất làm vật dẫn nóng "hết mức"
    tauHeat: 14,           // s — nóng lên
    tauCool: 8,            // s — nguội đi khi mở K
    gain: { X: 0.035, Y: 0.03 } as Record<OhmMaterial, number>, // R tăng tối đa ~3%
  },
} as const;

export function ohmCurrent(voltage: number, resistance: number): number {
  if (!Number.isFinite(voltage) || !Number.isFinite(resistance) || resistance <= 0) return 0;
  return voltage / resistance;
}

export function resistanceFromMeasurement(voltage: number, current: number): number {
  if (!Number.isFinite(voltage) || !Number.isFinite(current) || current <= 0) return 0;
  return voltage / current;
}

/** Điện trở vật dẫn ở mức nóng `heat` (0 = nguội). */
export function heatedResistance(material: OhmMaterial, heat: number): number {
  return OHM_CONDUCTORS[material].resistance * (1 + OHM_SETUP.heat.gain[material] * Math.max(0, heat));
}

/** Giải mạch nối tiếp nguồn → K → ampe kế → vật dẫn (vôn kế song song vật dẫn). */
export function ohmCircuit(setting: number, material: OhmMaterial, heat = 0) {
  const { source, ammeterBurden, switchResistance } = OHM_SETUP;
  const emf = Math.max(0, setting) * (1 + source.calibration);
  const resistance = heatedResistance(material, heat);
  const current = emf / (source.internal + switchResistance + ammeterBurden + resistance);
  const voltage = current * resistance;
  return { current, voltage, resistance, power: current * voltage };
}

/** Một bước nóng/nguội của vật dẫn sau `dt` giây. */
export function stepHeat(heat: number, powerW: number, dt: number, closed: boolean): number {
  const { pRef, tauHeat, tauCool } = OHM_SETUP.heat;
  const target = closed ? Math.max(0, powerW) / pRef : 0;
  const tau = closed && target > heat ? tauHeat : tauCool;
  return target + (heat - target) * Math.exp(-dt / tau);
}

/**
 * Chữ số cuối của đồng hồ số "nhảy" nhẹ (−1, 0, +1 đơn vị) như máy thật — số đo không đơ,
 * nhưng cũng không trôi: trung bình vẫn đúng giá trị thật.
 */
export function flickerCount(rng: () => number = Math.random): number {
  const u = rng();
  return u < 0.18 ? -1 : u > 0.82 ? 1 : 0;
}

export function balanceLengthCm(emf: number, driverVoltage: number): number {
  if (!Number.isFinite(emf) || !Number.isFinite(driverVoltage) || driverVoltage <= 0) return 0;
  return Math.max(0, Math.min(ELECTRIC_LIMITS.slideWireLengthCm,
    (emf / driverVoltage) * ELECTRIC_LIMITS.slideWireLengthCm));
}

export function compensatedEmf(driverVoltage: number, lengthCm: number): number {
  if (!Number.isFinite(driverVoltage) || !Number.isFinite(lengthCm)) return 0;
  return driverVoltage * (lengthCm / ELECTRIC_LIMITS.slideWireLengthCm);
}

export function galvanometerMillivolts(
  emf: number,
  driverVoltage: number,
  lengthCm: number
): number {
  return (compensatedEmf(driverVoltage, lengthCm) - emf) * 1000;
}

/** Suất điện động cá nhân hóa nhẹ nhưng ổn định theo tên học sinh. */
export function seededCellEmf(studentName = "Học sinh"): number {
  let hash = 2166136261;
  for (let i = 0; i < studentName.length; i += 1) {
    hash ^= studentName.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bucket = Math.abs(hash) % 21; // 1.40 .. 1.60 V
  return Number((1.4 + bucket * 0.01).toFixed(2));
}
