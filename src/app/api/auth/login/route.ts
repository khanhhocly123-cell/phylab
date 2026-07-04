import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const adminEmail = process.env.ADMIN_EMAIL || "phylabhackaithon@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "khanhdeptrai";

    if (email && email.trim() === adminEmail && password === adminPassword) {
      return NextResponse.json({
        ok: true,
        name: "Khánh (TestUser101)",
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
