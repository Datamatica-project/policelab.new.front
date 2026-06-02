"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import CaseCard from "@/components/cases/CaseCard";
import { GetCases, type CaseResponse, type CaseAccessType } from "@/lib/api";
import type { CaseData, CaseStatus } from "@/lib/case-data";
import { useCaseStore } from "@/store/caseStore";

const STATUS_MAP: Record<string, CaseStatus> = {
  OPEN: "진행중",
  UNDER_REVIEW: "검토중",
  CLOSED: "사건종료",
};

function toCaseData(c: CaseResponse): CaseData {
  return {
    id: c.caseId,
    caseNumber: c.caseNumber,
    status: STATUS_MAP[c.status] ?? "진행중",
    title: c.title,
    description: c.description ?? "",
    manager: c.assignedTo ?? c.createdBy,
    date: c.occurredAt ? c.occurredAt.slice(0, 10) : c.createdAt.slice(0, 10),
    sharedWith: c.sharedWith ?? [],
  };
}

const SEARCH_FIELD_LABELS: Record<string, string> = {
  title: "제목",
  manager: "담당자",
  all: "전체 항목",
};

const STATUS_LABELS: Record<string, string> = {
  all: "전체",
  검토중: "검토중",
  진행중: "진행중",
  사건종료: "사건종료",
};

const SORT_LABELS: Record<string, string> = {
  latest: "최신순",
  oldest: "오래된순",
  title: "제목순",
};

const PAGE_SIZE = 12;

const ACCESS_TABS: { label: string; value: CaseAccessType }[] = [
  { label: "전체", value: "ALL" },
  { label: "내 사건", value: "OWNED" },
  { label: "공유받은 사건", value: "SHARED" },
];

export default function CasesPage() {
  const { setSidebarCases } = useCaseStore();
  const [cases, setCases] = useState<CaseData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0); // 0-based (서버)
  const [isLoading, setIsLoading] = useState(false);
  const [accessTab, setAccessTab] = useState<CaseAccessType>("ALL");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("title");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("latest");

  const resetPage = () => setCurrentPage(0);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const data = await GetCases(currentPage, PAGE_SIZE, accessTab);
        const mapped = data.content.map(toCaseData);
        setCases(mapped);
        setTotalPages(data.totalPages);
        // 첫 페이지 전체 탭일 때만 사이드바 동기화
        if (currentPage === 0 && accessTab === "ALL") {
          setSidebarCases(data.content.map((c) => ({ id: c.caseId, title: c.title })));
        }
      } catch {
        setCases([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [currentPage, accessTab]);

  const filtered = useMemo(() => {
    let list = [...cases];
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter((c) => {
        if (searchField === "title") return c.title.toLowerCase().includes(q);
        if (searchField === "manager") return c.manager.toLowerCase().includes(q);
        return c.title.toLowerCase().includes(q) || c.manager.toLowerCase().includes(q);
      });
    }
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === (statusFilter as CaseStatus));
    }
    if (sortOrder === "oldest") {
      list.sort((a, b) => a.date.localeCompare(b.date));
    } else if (sortOrder === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => b.date.localeCompare(a.date));
    }
    return list;
  }, [cases, searchQuery, searchField, statusFilter, sortOrder]);

  // UI 페이지는 1-based
  const uiPage = currentPage + 1;

  const pageNumbers = useMemo(() => {
    const count = Math.min(10, totalPages);
    const start = Math.max(1, Math.min(uiPage - 4, totalPages - count + 1));
    return Array.from({ length: count }, (_, i) => start + i);
  }, [uiPage, totalPages]);

  return (
    <div className="pb-10">
      <h1 className="text-[32px] font-extrabold text-[#1f2330] tracking-[-0.02em] mb-2">
        사건관리
      </h1>
      <p className="text-[14.5px] text-[#6b7388] mb-[18px]">
        사건 단위로 자료를 관리할 수 있습니다.
      </p>

      {/* 접근 유형 탭 */}
      <div className="flex items-center gap-[6px] mb-[22px]">
        {ACCESS_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => { setAccessTab(value); setCurrentPage(0); }}
            className={cn(
              "px-[16px] py-[8px] rounded-[8px] text-[13.5px] font-semibold transition-colors",
              accessTab === value
                ? "bg-[#1d2c4e] text-white"
                : "bg-white border border-[#e2e5ec] text-[#6b7388] hover:border-[#c5cbd9] hover:text-[#3a4055]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-[380px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9aa1b3]" />
          <input
            type="text"
            placeholder="Search redacted cases..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              resetPage();
            }}
            className="w-full pl-[38px] pr-3 py-[10px] border border-[#e2e5ec] rounded-[8px] bg-white text-[13.5px] text-[#3a4055] outline-none focus:border-[#2b3f6c] placeholder:text-[#9aa1b3]"
          />
        </div>

        <Select
          value={searchField}
          onValueChange={(v) => {
            if (v) { setSearchField(v); resetPage(); }
          }}
        >
          <SelectTrigger className="w-[100px] border-[#e2e5ec] bg-white text-[13.5px] text-[#3a4055] rounded-[8px] h-[42px]">
            <span>{SEARCH_FIELD_LABELS[searchField]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">제목</SelectItem>
            <SelectItem value="manager">담당자</SelectItem>
            <SelectItem value="all">전체 항목</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-[22px] bg-[#e2e5ec]" />

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            if (v) { setStatusFilter(v); resetPage(); }
          }}
        >
          <SelectTrigger className="w-[100px] border-[#e2e5ec] bg-white text-[13.5px] text-[#3a4055] rounded-[8px] h-[42px]">
            <span>{STATUS_LABELS[statusFilter]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="검토중">검토중</SelectItem>
            <SelectItem value="진행중">진행중</SelectItem>
            <SelectItem value="사건종료">사건종료</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortOrder}
          onValueChange={(v) => {
            if (v) { setSortOrder(v); resetPage(); }
          }}
        >
          <SelectTrigger className="w-[110px] border-[#e2e5ec] bg-white text-[13.5px] text-[#3a4055] rounded-[8px] h-[42px]">
            <span>{SORT_LABELS[sortOrder]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">최신순</SelectItem>
            <SelectItem value="oldest">오래된순</SelectItem>
            <SelectItem value="title">제목순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-4 gap-[18px] mb-9">
        {isLoading ? (
          <div className="col-span-4 text-center py-16 text-[#9aa1b3] text-[13.5px]">
            불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-4 text-center py-16 text-[#9aa1b3] text-[13.5px]">
            조건에 맞는 사건이 없습니다.
          </div>
        ) : (
          filtered.map((c) => (
            <CaseCard
              key={c.id}
              {...c}
              onDelete={(deletedId) =>
                setCases((prev) => prev.filter((x) => x.id !== deletedId))
              }
              onUpdate={(updatedId, updated) =>
                setCases((prev) =>
                  prev.map((x) => (x.id === updatedId ? { ...x, ...updated } : x)),
                )
              }
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && <div className="flex items-center justify-center gap-[6px] py-2 pb-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
          className="min-w-[34px] h-[34px] px-[10px] border border-[#e2e5ec] rounded-[6px] bg-white text-[#6b7388] flex items-center justify-center hover:border-[#c5cbd9] hover:bg-[#f7f8fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        {pageNumbers.map((n) => (
          <button
            key={n}
            onClick={() => setCurrentPage(n - 1)}
            className={cn(
              "min-w-[34px] h-[34px] px-[10px] border rounded-[6px] text-[13px] font-medium flex items-center justify-center transition-colors",
              n === uiPage
                ? "bg-[#1d2c4e] border-[#1d2c4e] text-white"
                : "bg-white border-[#e2e5ec] text-[#3a4055] hover:border-[#c5cbd9] hover:bg-[#f7f8fb]",
            )}
          >
            {n}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={currentPage >= totalPages - 1}
          className="min-w-[34px] h-[34px] px-[10px] border border-[#e2e5ec] rounded-[6px] bg-white text-[#6b7388] flex items-center justify-center hover:border-[#c5cbd9] hover:bg-[#f7f8fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>}
    </div>
  );
}
