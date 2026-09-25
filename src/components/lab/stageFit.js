"use client";

import { useCallback, useState } from "react";

/* ============================================================================
   stageFit — cho bàn thí nghiệm (SVG) LẤP KÍN khung, không còn dải trống hai bên.

   Mỗi bàn khai báo vùng cần thấy (roi = [x, y, w, h] trong viewBox). Khung trên màn
   hình thường có tỉ lệ khác (điện thoại xoay ngang rất dẹt) → nới roi theo đúng tỉ lệ
   khung, ưu tiên nới trong phạm vi cảnh (bounds). Phần nới ra ngoài cảnh do nền bàn
   vẽ tràn (BenchBackdrop `bleed`) nên nhìn vẫn liền một mặt bàn.
   ========================================================================== */

const r1 = (v) => Math.round(v * 10) / 10;

/** Nới roi cho vừa tỉ lệ box {w, h}; bounds = [x, y, w, h] của cả cảnh. Trả về chuỗi viewBox. */
export function fitViewBox(roi, box, bounds = null) {
  const [x, y, w, h] = roi;
  if (!box || box.w < 24 || box.h < 24) return `${x} ${y} ${w} ${h}`;
  const aspect = box.w / box.h;
  let nx = x, ny = y, nw = w, nh = h;
  if (w / h < aspect) {
    nw = h * aspect;
    nx = x - (nw - w) / 2;
  } else {
    nh = w / aspect;
    ny = y - (nh - h) / 2;
  }
  if (bounds) {
    const [bx, by, bw, bh] = bounds;
    // Vẫn giữ trọn roi: chỉ dịch khung vào trong cảnh khi khung không rộng hơn cảnh.
    if (nw <= bw) nx = Math.min(Math.max(nx, bx), bx + bw - nw);
    if (nh <= bh) ny = Math.min(Math.max(ny, by), by + bh - nh);
  }
  return `${r1(nx)} ${r1(ny)} ${r1(nw)} ${r1(nh)}`;
}

/** Kích thước thật của một phần tử (ResizeObserver). Trả về [ref, {w, h} | null]. */
export function useBoxSize() {
  const [box, setBox] = useState(null);
  const ref = useCallback((el) => {
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const update = () => {
      const r = el.getBoundingClientRect();
      setBox((old) => (old && Math.abs(old.w - r.width) < 1 && Math.abs(old.h - r.height) < 1 ? old : { w: r.width, h: r.height }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, box];
}

/** Toạ độ màn hình → toạ độ viewBox của <svg> (đúng cả khi viewBox bị nới/cắt hay có viền trống). */
export function svgPoint(svg, clientX, clientY) {
  const ctm = svg?.getScreenCTM?.();
  if (!ctm) return { x: 0, y: 0 };
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

/** Số px màn hình ứng với một đơn vị viewBox. */
export function svgScale(svg) {
  return svg?.getScreenCTM?.()?.a || 1;
}
