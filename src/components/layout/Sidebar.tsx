"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Folder, Share2, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { label: "사건관리", href: "/cases", icon: Folder },
  { label: "공유관리", href: "/shared", icon: Share2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[190px] min-h-screen bg-[#1B2860] flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center shrink-0">
          <Shield size={16} className="text-[#1B2860]" />
        </div>
        <span className="text-white font-semibold text-sm leading-tight">
          비식별 엔진
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-[#2B3D8A] text-white font-medium"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 w-full transition-colors">
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
