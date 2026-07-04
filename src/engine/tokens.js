/**
 * tokens.js — Design token dùng cho engine tương tác (LabBench/FreeFallBench).
 *
 * Engine được port từ bản Vite/JSX của φLab (inline-style). Để giữ đúng 1:1 giao
 * diện đã tinh chỉnh mà không phải viết lại sang Tailwind, engine dùng bảng màu `C`
 * và font `FONT` cục bộ này. Shell của RealPhyLab vẫn dùng Tailwind như cũ — hai
 * hệ style sống song song, chỉ giáp nhau ở khung ngoài của phòng Lab.
 *
 * Bảng màu khớp với core.jsx gốc bên App.
 */
export const C = {
  orange: "#E8842B", orangeLt: "#F59C3C", orangeDk: "#D56A17",
  navy: "#1F4D78", teal: "#2E74B5", ink: "#2A2A28",
  sub: "#8a8278", sub2: "#9a9286", cream: "#FBF6EC", peach: "#FDEFE0", peachLt: "#FFF6EC",
  line: "#EFE7D8", card: "#FFFFFF", bg: "#FBF8F3", good: "#3E8E3E",
};

export const FONT = "var(--font-nunito), Nunito, system-ui, sans-serif";
