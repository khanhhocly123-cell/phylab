/**
 * session.ts — Phiên đăng nhập bằng cookie cho API tài khoản / đồng bộ / admin (chỉ chạy phía server).
 *
 *  - Token ngẫu nhiên 32 byte chỉ nằm trong cookie `phylab_session`; DB chỉ giữ SHA-256 của token.
 *  - Cookie HttpOnly (JS của trang không đọc được), SameSite=Lax (trang khác không gửi kèm được khi ghi),
 *    Secure khi chạy https. Hạn 30 ngày.
 *  - Tài khoản cấu hình bằng biến môi trường (không lưu mật khẩu trong DB):
 *      ADMIN_EMAIL / ADMIN_PASSWORD     → admin chuyên để test (vai trò "admin")
 *      TEACHER_EMAIL / TEACHER_PASSWORD → giáo viên demo (vai trò "teacher", kèm token HMAC cho /api/class)
 */

import type { NextRequest, NextResponse } from "next/server";
import { getAccountDb, type AccountDb, type AccountRecord } from "./accountDb";
import type { AccountRole, PublicAccount } from "./accountTypes";
import { NAME_MAX, SCHOOL_MAX, GRADES } from "./accountTypes";
import { sanitizeText } from "./security";

export const SESSION_COOKIE = "phylab_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sessionIdOf(token: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))));
}

export function publicAccount(u: AccountRecord): PublicAccount {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    grade: u.grade,
    school: u.school,
    createdAt: u.createdAt,
    envManaged: u.passwordHash === "env",
  };
}

/** Email chuẩn hoá (chữ thường, bỏ khoảng trắng); "" nếu không đúng dạng. */
export function normalizeEmail(input: unknown): string {
  if (typeof input !== "string") return "";
  const email = input.trim().toLowerCase();
  return email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : "";
}

/** Tên hiển thị: bỏ ký tự điều khiển, gộp khoảng trắng; "" nếu quá ngắn. */
export function cleanName(input: unknown): string {
  const name = sanitizeText(input, NAME_MAX).replace(/\s+/g, " ").trim();
  return name.length >= 2 ? name : "";
}

export function cleanSchool(input: unknown): string | null {
  const school = sanitizeText(input, SCHOOL_MAX).replace(/\s+/g, " ").trim();
  return school || null;
}

export function cleanGrade(input: unknown): number | null {
  const grade = Number(input);
  return (GRADES as readonly number[]).includes(grade) ? grade : null;
}

export function isHttps(req: NextRequest): boolean {
  const forwarded = req.headers.get("x-forwarded-proto");
  return (forwarded ?? req.nextUrl.protocol.replace(":", "")) === "https";
}

/** Yêu cầu ghi phải đến từ chính trang PhyLab (thêm một lớp chống CSRF ngoài SameSite). */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Tạo phiên mới và gắn cookie vào response. */
export async function startSession(res: NextResponse, req: NextRequest, db: AccountDb, userId: string): Promise<void> {
  const token = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  await db.createSession({ id: await sessionIdOf(token), userId, createdAt: now, expiresAt: now + SESSION_TTL_MS });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(res: NextResponse, req: NextRequest): void {
  res.cookies.set({ name: SESSION_COOKIE, value: "", httpOnly: true, sameSite: "lax", secure: isHttps(req), path: "/", maxAge: 0 });
}

export interface ActiveSession {
  db: AccountDb;
  user: AccountRecord;
  sessionId: string;
}

/** Phiên hợp lệ của yêu cầu (null nếu chưa đăng nhập / hết hạn / tài khoản đã xoá). */
export async function readSession(req: NextRequest): Promise<ActiveSession | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const db = await getAccountDb();
  const sessionId = await sessionIdOf(token);
  const session = await db.getSession(sessionId);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    await db.deleteSession(sessionId);
    return null;
  }
  const user = await db.getUserById(session.userId);
  return user ? { db, user, sessionId } : null;
}

/* ── Tài khoản cấu hình bằng biến môi trường ─────────────────────────── */

export interface EnvAccount {
  email: string;
  password: string;
  role: AccountRole;
  name: string;
}

export function envAccountFor(email: string): EnvAccount | null {
  const candidates: EnvAccount[] = [
    { email: normalizeEmail(process.env.ADMIN_EMAIL), password: process.env.ADMIN_PASSWORD ?? "", role: "admin", name: "Admin PhyLab" },
    { email: normalizeEmail(process.env.TEACHER_EMAIL), password: process.env.TEACHER_PASSWORD ?? "", role: "teacher", name: "Cô Phương (Giáo viên)" },
  ];
  return candidates.find((c) => c.email && c.password && c.email === email) ?? null;
}

/** Tạo (lần đầu) hoặc cập nhật vai trò bản ghi DB của tài khoản env để có id cho phiên và đồng bộ. */
export async function upsertEnvUser(db: AccountDb, env: EnvAccount, now: number): Promise<AccountRecord> {
  const existing = await db.getUserByEmail(env.email);
  if (existing) {
    if (existing.role !== env.role || existing.passwordHash !== "env") {
      await db.updateUser(existing.id, { role: env.role, passwordHash: "env" });
    }
    return { ...existing, role: env.role, passwordHash: "env" };
  }
  const user: AccountRecord = {
    id: crypto.randomUUID(),
    email: env.email,
    name: env.name,
    role: env.role,
    passwordHash: "env",
    grade: null,
    school: null,
    createdAt: now,
    lastLoginAt: now,
  };
  if (await db.createUser(user)) return user;
  // Hai lần đăng nhập cùng lúc: bản kia đã tạo trước.
  const again = await db.getUserByEmail(env.email);
  if (!again) throw new Error("Không tạo được tài khoản env.");
  return again;
}
