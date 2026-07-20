import type { NextConfig } from "next";
import path from "path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy cho PhyLab.
 * - Dev: cần 'unsafe-eval' (Turbopack HMR) + ws: (hot reload).
 * - Ảnh/âm thanh: cho phép host VNPT (idg-obs / storage-cic) qua https:.
 * - style/font: KaTeX & Tailwind dùng inline style; Google Fonts cho font 'Play'.
 * - connect-src chỉ 'self': trình duyệt chỉ gọi API route cùng origin; mọi call VNPT
 *   chạy phía SERVER nên token không lộ ra client.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https: blob: data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// Header bảo mật áp cho mọi route.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Chặn mic/định vị; camera chỉ cho phép chính origin (eKYC quét thẻ/khuôn mặt).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // HSTS chỉ có tác dụng qua HTTPS (production sau khi deploy).
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Cố định workspace root vào thư mục app này. Cần thiết vì repo cha (E:\App) cũng có
  // package-lock.json (app Vite cũ) → Turbopack suy luận nhầm root, gây lỗi runtime
  // "components.ComponentMod.handler is not a function" khi chạy dev.
  turbopack: {
    root: path.join(__dirname),
  },
  // Ảnh trong /public được Next tối ưu tự động. Allowlist chỉ 1 host để bundle nhỏ hơn.
  images: {
    formats: ["image/webp"],
    deviceSizes: [360, 640, 768, 1024, 1280, 1920],
  },
  // PWA: enable service worker / offline behavior ở production là tùy chọn của BTC, không ép.
  experimental: {
    // Tối ưu cho mobile: tăng tốc bundle, giảm over-fetch
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  // Compress tốt hơn mặc định
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
