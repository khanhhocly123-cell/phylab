/** Lõi vật lý thuần cho hai thí nghiệm điện lớp 11. */

export const OHM_CONDUCTORS = {
  X: { resistance: 120, color: "#2563eb" },
  Y: { resistance: 220, color: "#dc2626" },
} as const;

export const ELECTRIC_LIMITS = {
  ohmVoltage: { min: 1, max: 10, step: 1 },
  driverVoltage: { min: 1.8, max: 2.4, step: 0.1 },
  slideWireLengthCm: 100,
  balanceToleranceMv: 12,
} as const;

export function ohmCurrent(voltage: number, resistance: number): number {
  if (!Number.isFinite(voltage) || !Number.isFinite(resistance) || resistance <= 0) return 0;
  return voltage / resistance;
}

export function resistanceFromMeasurement(voltage: number, current: number): number {
  if (!Number.isFinite(voltage) || !Number.isFinite(current) || current <= 0) return 0;
  return voltage / current;
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
