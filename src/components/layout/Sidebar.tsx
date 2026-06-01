"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Folder, Share2, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { ApiClient } from "@/lib/api";
import { toast } from "sonner";

const navItems = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { label: "사건관리", href: "/cases", icon: Folder },
  { label: "공유관리", href: "/shared", icon: Share2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await ApiClient.post("/api/auth/logout");
      logout();
      router.replace("/login");
    } catch (error: unknown) {
      const status =
        // 에러가 객체이며, 객체 속에 "response" 값이 있을 경우를 검사
        error instanceof Object && "response" in error
          ? // error의 객체 타입을 강제로 지정해 status값을 뽑아낸다.
            (error as { response?: { status?: number } }).response?.status
          : undefined; // 에러가 객체값이 아닐경우 그냥 undefined를 넣고 종료

      logout();

      if (status === 401) {
        // 이미 만료된 토큰 — 조용히 로그아웃
        router.replace("/login");
        return;
      }

      // 서버 오류: 서버 세션이 남아있을 수 있음을 경고 후 로그아웃
      toast.warning(
        "서버 로그아웃에 실패했습니다. 브라우저 세션만 종료됩니다.",
        {
          duration: 2000,
        },
      );
      setTimeout(() => router.replace("/login"), 2000);
    }
  };

  return (
    <aside className="w-[220px] min-h-screen bg-[#1B1B4B] flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        <Image src="/policeLogo.png" alt="로고" width={45} height={45} />
        <span className="text-white font-semibold text-m leading-tight">
          비식별 엔진
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-[#062864] text-white font-medium border-l-3 border-[#FBC707]"
                  : "text-white/60 hover:text-white hover:bg-white/10",
              )}
            >
              <Icon
                size={16}
                className={cn(isActive ? "text-[#FBC707]" : "inherit")}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 w-full transition-colors"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
