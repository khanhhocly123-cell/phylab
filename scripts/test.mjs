import { accel, velAt, computeTime } from "../src/engine/physics.js";
import { freeFallTime, gFromMeasurement, computeFallTime } from "../src/engine/physicsFreeFall.js";
import { normalizeVi, retrieveAnswer, buildRagContext } from "../src/lib/labKnowledge.ts";

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} (FAILED)`);
  }
}

console.log("Running UNIT physics & RAG tests...");

// 1. Physics Lab 6 tests
const a30 = accel(30);
assert("accel(30) should be near 3.5", Math.abs(a30 - 3.5) < 1e-5);

const v30_03 = velAt(30, 0.3);
assert("velAt(30, 0.3) should be near sqrt(2.1)", Math.abs(v30_03 - Math.sqrt(2.1)) < 1e-5);

const tA = computeTime({ mode: "A", thetaDeg: 30, sE: 0.30, sF: 0.55, dMm: 20.0, withNoise: false });
assert("computeTime mode A should be valid", tA.valid);
assert("computeTime mode A value should be near 0.02 / velAt", Math.abs(tA.raw - (0.02 / velAt(30, 0.30))) < 1e-5);

const tAB = computeTime({ mode: "A<->B", thetaDeg: 30, sE: 0.30, sF: 0.55, dMm: 20.0, withNoise: false });
assert("computeTime mode A<->B should be valid", tAB.valid);

// 2. Physics Lab 11 tests
const tFall = freeFallTime(0.40, { withNoise: false });
assert("freeFallTime for 0.40m should be near sqrt(2 * 0.4 / 9.8)", Math.abs(tFall - Math.sqrt(0.8 / 9.8)) < 1e-5);

const gMeasured = gFromMeasurement(0.40, tFall);
assert("gFromMeasurement should be near 9.8", Math.abs(gMeasured - 9.8) < 1e-5);

const tFallComp = computeFallTime({ s: 0.40, withNoise: false });
assert("computeFallTime should be valid", tFallComp.valid);

// 3. RAG tests
assert("normalizeVi should strip diacritics", normalizeVi("Học sinh giỏi Vật Lý") === "hoc sinh gioi vat ly");
const ans = retrieveAnswer("gia toc roi tu do");
assert("retrieveAnswer should return free fall answer", ans && ans.includes("g = 2s / t²"));

const context = buildRagContext("cong quang dien");
assert("buildRagContext should return context docs", context && context.includes("Cổng quang điện"));

console.log(`Physics & RAG tests finished: ${passed} passed, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
