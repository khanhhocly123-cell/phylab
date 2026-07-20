/**
 * auth.ts — Token giáo viên (HMAC-SHA256, edge-safe qua crypto.subtle).
 *
 * Mô hình đơn giản cho 1 tài khoản GV demo:
 *  - Login đúng TEACHER_EMAIL/TEACHER_PASSWORD → server ký token `payloadB64.sigB64`
 *    (payload = {"role":"teacher","exp":<epoch ms>}), client giữ trong localStorage.
 *  - Mọi route giáo viên gọi requireTeacher(req) kiểm `Authorization: Bearer <token>`.
 *  - AUTH_SECRET bắt buộc phải cấu hình — KHÔNG có fallback secret yếu.
 */

import { NextRequest, NextResponse } from "next/server";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày — đủ cho demo

const encoder = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeToString(b64url: string): string | null {
  try {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    return atob(b64);
  } catch {
    return null;
  }
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

/** Ký token giáo viên. Throw nếu thiếu AUTH_SECRET (caller trả lỗi rõ ràng). */
export async function signTeacherToken(secret: string): Promise<string> {
  const payload = JSON.stringify({ role: "teacher", exp: Date.now() + TOKEN_TTL_MS });
  const payloadB64 = b64urlEncode(encoder.encode(payload));
  const sig = await hmacSign(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

/** Kiểm token hợp lệ + chưa hết hạn. */
export async function verifyTeacherToken(secret: string, token: string): Promise<boolean> {
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSign(secret, payloadB64);
  if (sig !== expected) return false;
  const raw = b64urlDecodeToString(payloadB64);
  if (!raw) return false;
  try {
    const payload = JSON.parse(raw) as { role?: string; exp?: number };
    return payload.role === "teacher" && typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * Guard cho route giáo viên: trả NextResponse lỗi nếu không hợp lệ, null nếu OK.
 * Dùng:  const denied = await requireTeacher(req); if (denied) return denied;
 */
export async function requireTeacher(req: NextRequest): Promise<NextResponse | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Server chưa cấu hình AUTH_SECRET — không thể xác thực giáo viên." },
      { status: 500 }
    );
  }
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !(await verifyTeacherToken(secret, token))) {
    return NextResponse.json(
      { error: "Phiên giáo viên không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại." },
      { status: 401 }
    );
  }
  return null;
}
