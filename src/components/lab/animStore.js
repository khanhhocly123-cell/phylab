"use client";

import { useState, useSyncExternalStore } from "react";

/* ============================================================================
   animStore — "kho" nhỏ cho các giá trị đổi TỪNG KHUNG HÌNH (vị trí bi/trụ, số đang đếm
   trên đồng hồ, điểm đang trượt trên đồ thị…). Chỉ các component đăng ký (bàn thí nghiệm,
   đồ thị) vẽ lại 60 lần/giây; cả bench và panel bên phải đứng yên → hết giật lag.
   Kết quả cuối cùng vẫn được ghi vào state React bình thường khi hoạt ảnh xong.
   ========================================================================== */

/** Tạo kho: get() trả về snapshot hiện tại (đối tượng mới sau mỗi set). */
export function createAnimStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
      subs.forEach((notify) => notify());
    },
    subscribe: (notify) => {
      subs.add(notify);
      return () => subs.delete(notify);
    },
  };
}

/** Kho ổn định suốt vòng đời component. */
export function useAnimStore(initial) {
  const [store] = useState(() => createAnimStore(initial));
  return store;
}

/** Đọc snapshot hiện tại và vẽ lại khi kho đổi. */
export function useAnim(store) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/**
 * Thời lượng một vòng hạt điện tích chạy trên dây — chia NẤC theo cường độ dòng điện để hoạt ảnh
 * SVG không bị khởi động lại mỗi khi số đo nhích một chút (nguyên nhân gây giật).
 */
export function flowDuration(currentMa) {
  const steps = [2.4, 1.6, 1.1, 0.8, 0.6, 0.45, 0.34, 0.26];
  const level = Math.max(0, Math.min(steps.length - 1, Math.floor(Math.log2(Math.max(1, currentMa) / 2.5))));
  return `${steps[level]}s`;
}
