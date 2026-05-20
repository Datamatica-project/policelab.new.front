"use client";

import { Bell, Settings, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "사건", href: "/cases" },
  { label: "파일이름", href: "/cases?by=filename" },
  { label: "업로더", href: "/cases?by=uploader" },
];

export default function Topbar() {
  const pathname = usePathname();

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center px-6 gap-6 shrink-0">
      {/* Search */}
      <div className="relative shrink-0">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search redacted cases..."
          className="pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-full w-60 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
        />
      </div>

      {/* Tabs */}
      <nav className="flex items-stretch flex-1 h-full">
        {tabs.map(({ label, href }) => {
          const isActive = label === "사건" && pathname.startsWith("/cases");
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "px-4 flex items-center text-sm border-b-2 transition-colors",
                isActive
                  ? "border-blue-600 text-blue-600 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
          <Bell size={18} />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
          <Settings size={18} />
        </button>
        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200 ml-1">
          <div className="text-right leading-tight">
            <p className="text-sm font-semibold text-gray-800">홍길동 순경</p>
            <p className="text-xs text-gray-400">서울경찰서</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
            홍
          </div>
        </div>
      </div>
    </header>
  );
}
