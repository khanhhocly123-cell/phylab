import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import DevToolsGuard from "@/components/common/DevToolsGuard";

const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Phylab - Phòng Thí Nghiệm Vật Lý Tương Tác",
  description: "Web app thực hành mô phỏng thí nghiệm vật lý THPT với số liệu thực tế dành cho học sinh Việt Nam.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF9F6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${nunito.variable} h-full antialiased`}>
      <head>
        {/* Play font for digital style timers */}
        <link href="https://fonts.googleapis.com/css2?family=Play:wght@700&display=swap" rel="stylesheet" />
        {/* VNPT SmartUX Web SDK Integration */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              var VNPT = VNPT || {};
              VNPT.q = VNPT.q || [];
              VNPT.app_key = 'ca576b7d8ebf52d6edf73883e0f6329aab692936';
              VNPT.url = 'https://console-smartux.vnpt.vn';
              VNPT.q.push(['track_sessions']);
              VNPT.q.push(['track_pageview']);
              VNPT.q.push(['track_clicks']);
              VNPT.q.push(['track_scrolls']);
              VNPT.q.push(['track_errors']);
              VNPT.q.push(['track_links']);
              VNPT.q.push(['track_forms']);
              VNPT.q.push(['collect_from_forms']);

              (function () {
                const paths = [
                  'https://console-smartux.vnpt.vn/sdk/web/core-track.js',
                  'https://console-smartux.vnpt.vn/sdk/web/minify.min.js'
                ];
                for (let i in paths) {
                  var cly = document.createElement('script');
                  cly.type = 'text/javascript';
                  cly.async = true;
                  cly.src = paths[i];
                  cly.onload = i == 0 
                    ? function () { VNPT.init(); } 
                    : function () { window.minify = require("html-minifier").minify; };
                  var s = document.getElementsByTagName('script')[0];
                  s.parentNode.insertBefore(cly, s);
                }
              })();
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-brand-cream text-brand-blue selection:bg-brand-yellow/30">
        <DevToolsGuard />
        {children}
      </body>
    </html>
  );
}
