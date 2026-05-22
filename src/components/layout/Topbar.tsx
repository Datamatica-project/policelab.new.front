"use client";

import { Bell, Settings, Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

const TABS = [
  { label: "사건", href: "/cases", by: null },
  { label: "파일 이름", href: "/cases?by=filename", by: "filename" },
  { label: "업로더", href: "/cases?by=uploader", by: "uploader" },
];

function TopbarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const by = searchParams.get("by");

  const isOnCases = pathname.startsWith("/cases");

  const activeTab = (() => {
    if (!isOnCases) return null;
    if (by === "filename") return "filename";
    if (by === "uploader") return "uploader";
    return null; // null = "사건" (no by param)
  })();

  return (
    <header className="h-[72px] bg-white border-b border-[#ebedf2] flex items-center px-8 gap-4 shrink-0">
      {/* Search */}
      <div className="relative w-[340px] shrink-0">
        <Search
          size={16}
          className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#9aa1b3]"
        />
        <input
          type="text"
          placeholder="Search redacted cases..."
          className="w-full pl-[40px] pr-[14px] py-[10px] border border-[#e2e5ec] rounded-[8px] bg-[#f7f8fb] text-[13.5px] text-[#3a4055] outline-none focus:border-[#2b3f6c] focus:bg-white placeholder:text-[#9aa1b3] transition-colors"
        />
      </div>

      {/* Tabs */}
      <nav className="flex items-stretch gap-[6px] ml-2 h-full" style={{ marginBottom: -1 }}>
        {TABS.map(({ label, href, by: tabBy }) => {
          const isActive = isOnCases && activeTab === tabBy;
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "px-4 flex items-center text-[14.5px] border-b-2 transition-colors",
                isActive
                  ? "border-[#1d2c4e] text-[#1d2c4e] font-bold"
                  : "border-transparent text-[#6b7388] font-medium hover:text-[#1f2330]",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right */}
      <div className="ml-auto flex items-center gap-[18px]">
        {/* Bell */}
        <button className="relative w-9 h-9 rounded-[8px] flex items-center justify-center text-[#6b7388] hover:bg-[#f3f4f8] hover:text-[#1f2330] transition-colors">
          <Bell size={20} />
          <span className="absolute top-[8px] right-[9px] w-[7px] h-[7px] rounded-full bg-[#e63946] border-2 border-white" />
        </button>

        {/* Settings */}
        <button className="w-9 h-9 rounded-[8px] flex items-center justify-center text-[#6b7388] hover:bg-[#f3f4f8] hover:text-[#1f2330] transition-colors">
          <Settings size={20} />
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pl-[14px] border-l border-[#ebedf2]">
          <div className="text-right leading-[1.3]">
            <p className="text-[14px] font-bold text-[#1f2330]">홍길동 순경</p>
            <p className="text-[11.5px] text-[#8a93a8] mt-[1px]">서울경찰청</p>
          </div>
          <div className="w-[38px] h-[38px] rounded-full bg-[#d9deea] flex items-center justify-center text-[14px] font-bold text-[#6b7388] shrink-0 overflow-hidden">
            홍
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Topbar() {
  return (
    <Suspense
      fallback={
        <header className="h-[72px] bg-white border-b border-[#ebedf2] shrink-0" />
      }
    >
      <TopbarInner />
    </Suspense>
  );
}
