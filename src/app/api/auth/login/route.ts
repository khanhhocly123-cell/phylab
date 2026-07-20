import { NextRequest, NextResponse } from "next/server";
import { signTeacherToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const trimmedEmail = typeof email === "string" ? email.trim() : "";

    const adminEmail = process.env.ADMIN_EMAIL || "phylabhackaithon@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "khanhdeptrai";

    // Tài khoản học sinh demo (giữ nguyên hành vi cũ, bổ sung role).
    if (trimmedEmail === adminEmail && password === adminPassword) {
      return NextResponse.json({
        ok: true,
        name: "Khánh (TestUser101)",
        role: "student",
      });
    }

    // Tài khoản GIÁO VIÊN demo — trả kèm token HMAC cho các route quản lý lớp.
    const teacherEmail = process.env.TEACHER_EMAIL;
    const teacherPassword = process.env.TEACHER_PASSWORD;

    if (teacherEmail && teacherPassword && trimmedEmail === teacherEmail && password === teacherPassword) {
      const secret = process.env.AUTH_SECRET;
      if (!secret) {
        return NextResponse.json(
          { error: "Server chưa cấu hình AUTH_SECRET — không thể đăng nhập giáo viên." },
          { status: 500 }
        );
      }
      const token = await signTeacherToken(secret);
      return NextResponse.json({
        ok: true,
        name: "Cô Phương (Giáo viên)",
        role: "teacher",
        token,
      });
    }

    return NextResponse.json(
      { error: "Tên đăng nhập hoặc mật khẩu không chính xác." },
      { status: 401 }
    );
  } catch (err) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi hệ thống khi đăng nhập." },
      { status: 500 }
    );
  }
}
