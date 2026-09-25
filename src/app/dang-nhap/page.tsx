import type { Metadata } from "next";
import AuthScreen from "@/components/auth/AuthScreen";

export const metadata: Metadata = {
  title: "Đăng nhập — PhyLab",
  description: "Đăng nhập PhyLab để học tiếp Prelab, Phòng Lab và Sổ Báo Cáo trên mọi máy.",
};

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
