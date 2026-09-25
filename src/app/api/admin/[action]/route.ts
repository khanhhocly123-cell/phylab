/**
 * /api/admin/[action] — Công cụ của tài khoản admin (ADMIN_EMAIL / ADMIN_PASSWORD).
 *
 * GET  overview        → số tài khoản (tổng, mới 7 ngày, hoạt động 7 ngày) + 200 tài khoản mới nhất
 *                        kèm tiến độ (số bài đã qua Prelab, số báo cáo)
 * POST reset-password  { userId } → cấp mật khẩu tạm cho học sinh quên mật khẩu (hiện MỘT lần cho admin),
 *                        đăng xuất em đó khỏi mọi máy
 */

import { NextRequest, NextResponse } from "next/server";
import { hashPassword, temporaryPassword } from "@/lib/password";
import { isSameOrigin, readSession, type ActiveSession } from "@/lib/session";
import { sanitizeText } from "@/lib/security";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

async function requireAdmin(req: NextRequest): Promise<ActiveSession | NextResponse> {
  const session = await readSession(req);
  if (!session) return jsonError("Chưa đăng nhập.", 401);
  if (session.user.role !== "admin") return jsonError("Chỉ tài khoản admin mới dùng được.", 403);
  return session;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  try {
    const session = await requireAdmin(req);
    if (session instanceof NextResponse) return session;
    if (action === "overview") {
      const [stats, users] = await Promise.all([session.db.stats(Date.now() - WEEK_MS), session.db.listUsers(200)]);
      return NextResponse.json({ ok: true, stats, users });
    }
    return jsonError("Không có chức năng này.", 404);
  } catch (err) {
    console.error(`admin GET ${action} error:`, err);
    return jsonError("Máy chủ đang bận — thử lại sau.", 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!isSameOrigin(req)) return jsonError("Yêu cầu không hợp lệ.", 403);
  try {
    const session = await requireAdmin(req);
    if (session instanceof NextResponse) return session;
    const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;

    if (action === "reset-password") {
      const target = await session.db.getUserById(sanitizeText(body.userId, 64));
      if (!target) return jsonError("Không tìm thấy tài khoản.", 404);
      if (target.passwordHash === "env") return jsonError("Tài khoản env đổi mật khẩu trên Cloudflare, không cấp lại ở đây.", 400);
      const tempPassword = temporaryPassword();
      await session.db.updateUser(target.id, { passwordHash: await hashPassword(tempPassword) });
      await session.db.deleteSessionsOf(target.id);
      return NextResponse.json({ ok: true, tempPassword });
    }
    return jsonError("Không có chức năng này.", 404);
  } catch (err) {
    console.error(`admin POST ${action} error:`, err);
    return jsonError("Máy chủ đang bận — thử lại sau.", 500);
  }
}
