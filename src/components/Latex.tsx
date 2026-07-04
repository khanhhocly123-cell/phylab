"use client";

import React from "react";
import katex from "katex";

interface LatexProps {
  math: string;
  block?: boolean;
  className?: string;
}

export default function Latex({ math, block = false, className = "" }: LatexProps) {
  let html = "";
  let isError = false;
  try {
    html = katex.renderToString(math, {
      displayMode: block,
      throwOnError: false,
    });
  } catch (err) {
    console.error("KaTeX rendering error:", err);
    isError = true;
  }

  if (isError) {
    return <code className={className}>{math}</code>;
  }

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Bôi đậm kiểu Markdown: **text** → <strong>text</strong>.
 * Render bằng React element (KHÔNG dùng dangerouslySetInnerHTML) nên an toàn XSS —
 * mọi ký tự trong text vẫn được React tự escape.
 */
function renderBold(text: string, keyPrefix: string): React.ReactNode[] {
  // Tách theo cặp ** ... ** (không tham lam, không bắc qua ** trống).
  const segments = text.split(/(\*\*[^*]+?\*\*)/g);
  return segments.map((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4) {
      return <strong key={`${keyPrefix}-b${i}`}>{seg.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`${keyPrefix}-t${i}`}>{seg}</React.Fragment>;
  });
}

export function MathText({ text, className = "" }: MathTextProps) {
  if (!text) return null;

  // Split by inline math ($...$) or block math ($$...$$)
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const math = part.slice(2, -2);
          return <Latex key={index} math={math} block={true} />;
        } else if (part.startsWith("$") && part.endsWith("$")) {
          const math = part.slice(1, -1);
          return <Latex key={index} math={math} block={false} />;
        }
        // Đoạn text thường: parse thêm **bôi đậm**.
        return <React.Fragment key={index}>{renderBold(part, String(index))}</React.Fragment>;
      })}
    </span>
  );
}
