/**
 * /api/auth/[action] — Tài khoản PhyLab (bản Beta Phi01).
 *
 * GET  me        → tài khoản đang đăng nhập (401 nếu chưa)
 * GET  config    → form đăng ký có cần mã mời không (biến môi trường SIGNUP_CODE)
 * POST register  → tạo tài khoản học sinh + đăng nhập luôn
 * POST login     → đăng nhập (tài khoản DB, hoặc admin/giáo viên cấu hình bằng biến môi trường)
 * POST logout    → xoá phiên
 * POST profile   → sửa tên / lớp / trường
 * POST password  → đổi mật khẩu (đăng xuất các máy khác)
 * POST delete    → xoá tài khoản cùng toàn bộ tiến độ (cần nhập lại mật khẩu)
 *
 * Chống dò mật khẩu: sai 8 lần / 15 phút cho một email thì khoá tạm; một địa chỉ IP tạo tối đa
 * 8 tài khoản / giờ. Chạy Node runtime như /api/class (trên Cloudflare vẫn là Worker + D1).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountDb, type AccountDb, type AccountRecord } from "@/lib/accountDb";
import { signTeacherToken } from "@/lib/auth";
import { DUMMY_PASSWORD_HASH, hashPassword, passwordProblem, secretEquals, verifyPassword } from "@/lib/password";
import {
  cleanGrade, cleanName, cleanSchool, clearSessionCookie, clientIp, envAccountFor, isSameOrigin,
  normalizeEmail, publicAccount, readSession, startSession, upsertEnvUser,
} from "@/lib/session";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 8;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_MAX = 8;

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** Token HMAC cho các route lớp học (/api/class) — chỉ tài khoản giáo viên. */
async function teacherTokenFor(user: AccountRecord): Promise<string | undefined> {
  const secret = process.env.AUTH_SECRET;
  return user.role === "teacher" && secret ? signTeacherToken(secret) : undefined;
}

/** Quá nhiều lần sai mật khẩu với email này chưa? */
async function loginLocked(db: AccountDb, email: string, now: number): Promise<boolean> {
  return (await db.countHits(`login:${email}`, LOGIN_WINDOW_MS, now)) >= LOGIN_MAX_FAILS;
}

const LOCKED_MESSAGE = "Nhập sai mật khẩu nhiều lần — em thử lại sau 15 phút nhé.";

export async function GET(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  try {
    if (action === "config") {
      return NextResponse.json({ ok: true, inviteRequired: Boolean(process.env.SIGNUP_CODE) });
    }
    if (action === "me") {
      const session = await readSession(req);
      if (!session) return jsonError("Chưa đăng nhập.", 401);
      return NextResponse.json({ ok: true, user: publicAccount(session.user), teacherToken: await teacherTokenFor(session.user) });
    }
    return jsonError("Không có chức năng này.", 404);
  } catch (err) {
    console.error(`auth GET ${action} error:`, err);
    return jsonError("Máy chủ đang bận — em thử lại sau nhé.", 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!isSameOrigin(req)) return jsonError("Yêu cầu không hợp lệ.", 403);
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const now = Date.now();

  try {
    switch (action) {
      case "register": {
        const name = cleanName(body.name);
        const email = normalizeEmail(body.email);
        const problem = passwordProblem(body.password);
        if (!name) return jsonError("Em nhập họ và tên (ít nhất 2 ký tự) nhé.", 400);
        if (!email) return jsonError("Email chưa đúng dạng (vd: ten@gmail.com).", 400);
        if (problem) return jsonError(problem, 400);
        if (body.consent !== true) return jsonError("Em cần đồng ý với Quy định dữ liệu để tạo tài khoản.", 400);
        const code = process.env.SIGNUP_CODE;
        if (code && !(await secretEquals(String(body.invite ?? "").trim(), code))) {
          return jsonError("Mã mời chưa đúng — bản Beta đang mở dần, em hỏi thầy cô hoặc admin để lấy mã.", 403);
        }
        if (envAccountFor(email)) return jsonError("Email này đã có tài khoản.", 409);

        const db = await getAccountDb();
        if ((await db.addHit(`register:${clientIp(req)}`, REGISTER_WINDOW_MS, now)) > REGISTER_MAX) {
          return jsonError("Máy này vừa tạo nhiều tài khoản quá — em thử lại sau 1 giờ.", 429);
        }
        const user: AccountRecord = {
          id: crypto.randomUUID(),
          email,
          name,
          role: "student",
          passwordHash: await hashPassword(body.password as string),
          grade: cleanGrade(body.grade),
          school: cleanSchool(body.school),
          createdAt: now,
          lastLoginAt: now,
        };
        if (!(await db.createUser(user))) return jsonError("Email này đã có tài khoản — em đăng nhập nhé.", 409);
        const res = NextResponse.json({ ok: true, user: publicAccount(user) }, { status: 201 });
        await startSession(res, req, db, user.id);
        return res;
      }

      case "login": {
        const email = normalizeEmail(body.email);
        const password = typeof body.password === "string" ? body.password : "";
        if (!email || !password) return jsonError("Em nhập email và mật khẩu nhé.", 400);
        const db = await getAccountDb();
        if (await loginLocked(db, email, now)) return jsonError(LOCKED_MESSAGE, 429);

        let user: AccountRecord | null = null;
        const env = envAccountFor(email);
        if (env) {
          if (await secretEquals(password, env.password)) user = await upsertEnvUser(db, env, now);
        } else {
          const found = await db.getUserByEmail(email);
          const usable = found && found.passwordHash !== "env" ? found : null;
          // Email chưa có vẫn chạy PBKDF2 để thời gian phản hồi không lộ email nào đã đăng ký.
          const ok = await verifyPassword(password, usable?.passwordHash ?? DUMMY_PASSWORD_HASH);
          if (usable && ok) user = usable;
        }
        if (!user) {
          await db.addHit(`login:${email}`, LOGIN_WINDOW_MS, now);
          return jsonError("Email hoặc mật khẩu chưa đúng.", 401);
        }
        await db.clearHits(`login:${email}`);
        await db.updateUser(user.id, { lastLoginAt: now });
        await db.deleteExpiredSessions(now);
        const res = NextResponse.json({ ok: true, user: publicAccount(user), teacherToken: await teacherTokenFor(user) });
        await startSession(res, req, db, user.id);
        return res;
      }

      case "logout": {
        const session = await readSession(req);
        if (session) await session.db.deleteSession(session.sessionId);
        const res = NextResponse.json({ ok: true });
        clearSessionCookie(res, req);
        return res;
      }
    }

    // Các chức năng còn lại cần đăng nhập.
    const session = await readSession(req);
    if (!session) return jsonError("Phiên đăng nhập đã hết — em đăng nhập lại nhé.", 401);
    const { db, user } = session;

    switch (action) {
      case "profile": {
        const name = cleanName(body.name);
        if (!name) return jsonError("Tên cần ít nhất 2 ký tự.", 400);
        const patch = { name, grade: cleanGrade(body.grade), school: cleanSchool(body.school) };
        await db.updateUser(user.id, patch);
        return NextResponse.json({ ok: true, user: publicAccount({ ...user, ...patch }) });
      }

      case "password": {
        if (user.passwordHash === "env") {
          return jsonError("Tài khoản này đặt mật khẩu bằng biến môi trường trên Cloudflare, không đổi trong app được.", 400);
        }
        if (await loginLocked(db, user.email, now)) return jsonError(LOCKED_MESSAGE, 429);
        if (!(await verifyPassword(String(body.current ?? ""), user.passwordHash))) {
          await db.addHit(`login:${user.email}`, LOGIN_WINDOW_MS, now);
          return jsonError("Mật khẩu hiện tại chưa đúng.", 400);
        }
        const problem = passwordProblem(body.next);
        if (problem) return jsonError(problem, 400);
        await db.updateUser(user.id, { passwordHash: await hashPassword(body.next as string) });
        await db.deleteSessionsOf(user.id, session.sessionId);
        return NextResponse.json({ ok: true });
      }

      case "delete": {
        if (user.passwordHash === "env") return jsonError("Tài khoản admin / giáo viên demo không xoá trong app được.", 400);
        if (await loginLocked(db, user.email, now)) return jsonError(LOCKED_MESSAGE, 429);
        if (!(await verifyPassword(String(body.password ?? ""), user.passwordHash))) {
          await db.addHit(`login:${user.email}`, LOGIN_WINDOW_MS, now);
          return jsonError("Mật khẩu chưa đúng.", 400);
        }
        await db.deleteUser(user.id);
        const res = NextResponse.json({ ok: true });
        clearSessionCookie(res, req);
        return res;
      }
    }
    return jsonError("Không có chức năng này.", 404);
  } catch (err) {
    console.error(`auth POST ${action} error:`, err);
    return jsonError("Máy chủ đang bận — em thử lại sau nhé.", 500);
  }
}
