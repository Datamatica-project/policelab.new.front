"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Folder, LogOut, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCaseStore } from "@/store/caseStore";
import { ApiClient, GetCases } from "@/lib/api";
import { toast } from "sonner";

const truncate = (str: string, max: number) =>
  str.length > max ? str.slice(0, max) + "…" : str;

type ExpandedMenu = "dashboard" | "cases" | null;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, email } = useAuthStore();

  const [expanded, setExpanded] = useState<ExpandedMenu>(null);
  const { sidebarCases, setSidebarCases } = useCaseStore();
  const hasFetched = useRef(false);

  const isDashboardRoute = pathname === "/dashboard";
  const isCasesRoute = pathname === "/cases" || pathname.startsWith("/cases/");
  const activeCaseId =
    pathname.startsWith("/cases/") ? pathname.split("/")[2] : null;

  // 경로 변경 시 해당 메뉴 자동 펼침 (상대 메뉴는 닫힘)
  useEffect(() => {
    if (isDashboardRoute) setExpanded("dashboard");
    else if (isCasesRoute) setExpanded("cases");
  }, [isDashboardRoute, isCasesRoute]);

  // 사건 목록: 스토어에 없을 때만 fetch (cases 페이지 방문 시 자동 동기화)
  useEffect(() => {
    if (expanded !== "cases" || hasFetched.current || sidebarCases.length > 0) return;
    hasFetched.current = true;
    GetCases(0, 10)
      .then((data) =>
        setSidebarCases(data.content.map((c) => ({ id: c.caseId, title: c.title })))
      )
      .catch(() => {});
  }, [expanded, sidebarCases.length]);

  const handleDashboardClick = () => {
    if (isDashboardRoute) {
      setExpanded((v) => (v === "dashboard" ? null : "dashboard"));
    } else {
      router.push("/dashboard");
      setExpanded("dashboard");
    }
  };

  const handleCasesClick = () => {
    if (isCasesRoute) {
      setExpanded((v) => (v === "cases" ? null : "cases"));
    } else {
      router.push("/cases");
      setExpanded("cases");
    }
  };

  const handleLogout = async () => {
    try {
      await ApiClient.post("/api/auth/logout");
      logout();
      router.replace("/login");
    } catch (error: unknown) {
      const status =
        error instanceof Object && "response" in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      logout();
      if (status === 401) {
        router.replace("/login");
        return;
      }
      toast.warning("서버 로그아웃에 실패했습니다. 브라우저 세션만 종료됩니다.", {
        duration: 2000,
      });
      setTimeout(() => router.replace("/login"), 2000);
    }
  };

  return (
    <aside className="w-[220px] min-h-screen bg-[#1B1B4B] flex flex-col shrink-0">
      {/* Logo */}
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2.5 px-5 py-6 cursor-pointer text-left"
      >
        <Image src="/policeLogo.png" alt="로고" width={104} height={104} style={{ width: 52, height: 52 }} />
        <div className="flex flex-col gap-[2px]">
          <span className="text-white leading-tight" style={{ fontFamily: "'Aggravo', sans-serif", fontWeight: 700, fontSize: 17 }}>
            비식별 엔진
          </span>
          <span className="text-white/40 leading-tight" style={{ fontFamily: "'Aggravo', sans-serif", fontWeight: 300, fontSize: 10, letterSpacing: "0.04em" }}>
            De-identification Engine
          </span>
        </div>
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-0.5">

        {/* 대시보드 */}
        <div>
          <button
            onClick={handleDashboardClick}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              isDashboardRoute
                ? "bg-[#062864] text-white font-medium border-l-[3px] border-[#FBC707]"
                : "text-white/60 hover:text-white hover:bg-white/10",
            )}
          >
            <LayoutDashboard
              size={16}
              className={isDashboardRoute ? "text-[#FBC707]" : ""}
            />
            <span className="flex-1 text-left">대시보드</span>
            <ChevronRight
              size={13}
              className={cn(
                "transition-transform duration-200 shrink-0",
                expanded === "dashboard" && "rotate-90",
                isDashboardRoute ? "text-white/50" : "text-white/20",
              )}
            />
          </button>

          {/* 대시보드 하위 목록 */}
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-in-out"
            style={{ gridTemplateRows: expanded === "dashboard" ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="mt-[2px] ml-[10px] flex flex-col border-l border-white/10 pl-[6px] pb-[2px]">
                <button
                  onClick={() => router.push("/cases/new")}
                  className="text-left flex items-center gap-[6px] px-3 py-[6px] rounded-[6px] text-[12.5px] text-white/45 hover:text-white hover:bg-white/10 transition-colors w-full"
                >
                  <Plus size={12} className="shrink-0" />
                  새 사건 생성
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 사건관리 */}
        <div>
          <button
            onClick={handleCasesClick}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              isCasesRoute
                ? "bg-[#062864] text-white font-medium border-l-[3px] border-[#FBC707]"
                : "text-white/60 hover:text-white hover:bg-white/10",
            )}
          >
            <Folder
              size={16}
              className={isCasesRoute ? "text-[#FBC707]" : ""}
            />
            <span className="flex-1 text-left">사건관리</span>
            <ChevronRight
              size={13}
              className={cn(
                "transition-transform duration-200 shrink-0",
                expanded === "cases" && "rotate-90",
                isCasesRoute ? "text-white/50" : "text-white/20",
              )}
            />
          </button>

          {/* 사건관리 하위 목록 */}
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-in-out"
            style={{ gridTemplateRows: expanded === "cases" ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="mt-[2px] ml-[10px] flex flex-col border-l border-white/10 pl-[6px] pb-[2px]">
                {sidebarCases.length === 0 ? (
                  <span className="px-3 py-2 text-[12px] text-white/25">
                    사건 없음
                  </span>
                ) : (
                  sidebarCases.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => router.push(`/cases/${c.id}`)}
                      title={c.title}
                      className={cn(
                        "text-left px-3 py-[6px] rounded-[6px] text-[12.5px] transition-colors w-full truncate",
                        activeCaseId === c.id
                          ? "text-white bg-white/10 font-medium"
                          : "text-white/45 hover:text-white hover:bg-white/10",
                      )}
                    >
                      {truncate(c.title, 10)}
                    </button>
                  ))
                )}
                <button
                  onClick={() => router.push("/cases")}
                  className="text-left px-3 py-[6px] mt-[4px] text-[12px] text-white/30 hover:text-white/60 transition-colors border-t border-white/10 pt-[8px]"
                >
                  전체보기 →
                </button>
              </div>
            </div>
          </div>
        </div>

      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-6 flex flex-col gap-1">
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="text-[12px] text-white/40 truncate">{email ?? "—"}</span>
        </div>
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
