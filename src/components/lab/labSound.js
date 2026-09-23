/**
 * labSound.js — tiếng "bíp" nhỏ cho các khoảnh khắc đo (cổng quang cắt tia, ghi số liệu,
 * đạt mốc). Dùng Web Audio tổng hợp tại chỗ (không tải file), âm lượng nhỏ, và bench
 * không gọi khi học sinh đã tắt tiếng hướng dẫn.
 */

let ctx = null;

function audio() {
  if (typeof window === "undefined") return null;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Một nốt ngắn. */
export function blip(freq = 880, duration = 0.07, volume = 0.045, delay = 0) {
  const ac = audio();
  if (!ac) return;
  try {
    const start = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  } catch {
    /* thiết bị không hỗ trợ âm thanh — bỏ qua */
  }
}

/** Các "tiếng" dùng trong Lab. */
export const labSound = {
  gate: () => blip(1480, 0.05, 0.04),                                  // tia cổng quang bị cắt
  stop: () => blip(990, 0.09, 0.045),                                  // đồng hồ dừng
  record: () => { blip(660, 0.07, 0.04); blip(990, 0.09, 0.04, 0.08); }, // ghi số liệu
  win: () => { blip(660, 0.08, 0.045); blip(880, 0.08, 0.045, 0.09); blip(1320, 0.14, 0.045, 0.18); },
  warn: () => blip(220, 0.16, 0.05),
};
