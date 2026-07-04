"use client";

import { getGaussianRandom } from "./freeFall";

export const LAB6 = {
  g: 9.8,
  rollFactor: 5 / 7,          // solid sphere rolling without slipping
  angle: { min: 5, max: 35, default: 30 },
  sE: 0.30,                   // release to Gate E distance (m)
  sEF: { min: 0.10, max: 0.45, default: 0.25 },
  ball: { defaultMm: 20.0 },
  noise: 0.01,                // relative noise (~1%)
  skew: { min: 0.03, max: 0.05 }, // delay in seconds if not leveled
  scales: {
    fine:   { res: 0.001, max: 9.999, dp: 3, label: "9.999" },
    coarse: { res: 0.01,  max: 99.99, dp: 2, label: "99.99" },
  },
};

export function accel(thetaDeg: number): number {
  const t = Math.max(0, Math.min(90, thetaDeg));
  const rad = (t * Math.PI) / 180;
  return LAB6.rollFactor * LAB6.g * Math.sin(rad);
}

export function velAt(thetaDeg: number, s: number): number {
  const a = accel(thetaDeg);
  return Math.sqrt(Math.max(0, 2 * a * s));
}

interface ComputeTimeOptions {
  mode: "A" | "B" | "A+B" | "A<->B" | "T" | string;
  thetaDeg: number;
  sE: number;
  sF: number;
  dMm: number;
  balanced?: boolean;
  scale?: "fine" | "coarse";
  withNoise?: boolean;
}

export interface InclinedPlaneResult {
  valid: boolean;
  raw: number | null;
  display: string;
  overflow: boolean;
  vE: number;
  vF: number;
}

export function simulateInclinedPlane({
  mode,
  thetaDeg,
  sE,
  sF,
  dMm,
  balanced = true,
  scale = "fine",
  withNoise = true,
}: ComputeTimeOptions): InclinedPlaneResult {
  const sc = LAB6.scales[scale] || LAB6.scales.fine;
  const M = String(mode || "").toUpperCase().replace(/\s/g, "").replace("↔", "<->");

  if (M === "T") {
    return { valid: false, raw: null, display: "--.--", overflow: false, vE: 0, vF: 0 };
  }

  const a = accel(thetaDeg);
  const d = (Number(dMm) || LAB6.ball.defaultMm) / 1000;
  const vE = Math.sqrt(Math.max(0, 2 * a * sE));
  const vF = Math.sqrt(Math.max(0, 2 * a * sF));

  if (a <= 0 || vE <= 1e-6) {
    return { valid: false, raw: Infinity, display: "0.000", overflow: true, vE, vF };
  }

  let base = 0;
  switch (M) {
    case "A":
      base = d / vE; // time blocking gate A
      break;
    case "B":
      base = d / vF; // time blocking gate B
      break;
    case "A+B":
      base = d / vE + d / vF;
      break;
    case "A<->B":
    case "A_TO_B":
      base = (vF - vE) / a; // time traveling between gate E and F under acceleration
      break;
    default:
      return { valid: false, raw: null, display: "--.--", overflow: false, vE, vF };
  }

  let t = base;
  if (withNoise) {
    if (!balanced) {
      // Add systematic error (skew) if the plane is not leveled
      t += LAB6.skew.min + Math.random() * (LAB6.skew.max - LAB6.skew.min);
    }
    // Add Gaussian noise (~1%)
    const stddev = base * LAB6.noise;
    t = getGaussianRandom(t, stddev);
  }
  t = Math.max(0.0001, t);

  const overflow = t > sc.max;
  const shown = overflow ? sc.max : Math.round(t / sc.res) * sc.res;
  return {
    valid: true,
    raw: t,
    display: shown.toFixed(sc.dp),
    overflow,
    vE,
    vF,
  };
}

export function zeroDisplay(scale: "fine" | "coarse" = "fine"): string {
  const sc = LAB6.scales[scale] || LAB6.scales.fine;
  return (0).toFixed(sc.dp);
}
