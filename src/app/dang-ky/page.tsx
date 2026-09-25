import type { Metadata } from "next";
import AuthScreen from "@/components/auth/AuthScreen";

export const metadata: Metadata = {
  title: "Đăng ký — PhyLab",
  description: "Tạo tài khoản PhyLab miễn phí: thực hành Vật lí 10–11 ngay trên trình duyệt, tiến độ lưu theo tài khoản.",
};

export default function RegisterPage() {
  return <AuthScreen mode="register" />;
}
