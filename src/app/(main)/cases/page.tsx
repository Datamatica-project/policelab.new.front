"use client";

import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import CaseCard from "@/components/cases/CaseCard";
import { ALL_CASES } from "@/lib/case-data";
import type { CaseStatus } from "@/lib/case-data";

const PER_PAGE = 12;

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

export default function CasesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("title");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);

  const resetPage = () => setCurrentPage(1);

  const filtered = useMemo(() => {
    let cases = [...ALL_CASES];
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      cases = cases.filter((c) => {
        if (searchField === "title") return c.title.toLowerCase().includes(q);
        if (searchField === "manager") return c.manager.toLowerCase().includes(q);
        return (
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.manager.toLowerCase().includes(q)
        );
      });
    }
    if (statusFilter !== "all") {
      cases = cases.filter((c) => c.status === (statusFilter as CaseStatus));
    }
    if (sortOrder === "oldest") {
      cases.sort((a, b) => a.date.localeCompare(b.date));
    } else if (sortOrder === "title") {
      cases.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      cases.sort((a, b) => b.date.localeCompare(a.date));
    }
    return cases;
  }, [searchQuery, searchField, statusFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pageCases = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const pageNumbers = useMemo(() => {
    const count = Math.min(10, totalPages);
    const start = Math.max(1, Math.min(page - 4, totalPages - count + 1));
    return Array.from({ length: count }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <div className="pb-10">
      <h1 className="text-[32px] font-extrabold text-[#1f2330] tracking-[-0.02em] mb-2">
        사건관리
      </h1>
      <p className="text-[14.5px] text-[#6b7388] mb-[26px]">
        사건 단위로 자료를 관리할 수 있습니다.
      </p>

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
        {pageCases.map((c) => (
          <CaseCard key={c.id} {...c} />
        ))}
        {pageCases.length === 0 && (
          <div className="col-span-4 text-center py-16 text-[#9aa1b3] text-[13.5px]">
            조건에 맞는 사건이 없습니다.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-[6px] py-2 pb-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="min-w-[34px] h-[34px] px-[10px] border border-[#e2e5ec] rounded-[6px] bg-white text-[#6b7388] flex items-center justify-center hover:border-[#c5cbd9] hover:bg-[#f7f8fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        {pageNumbers.map((n) => (
          <button
            key={n}
            onClick={() => setCurrentPage(n)}
            className={cn(
              "min-w-[34px] h-[34px] px-[10px] border rounded-[6px] text-[13px] font-medium flex items-center justify-center transition-colors",
              n === page
                ? "bg-[#1d2c4e] border-[#1d2c4e] text-white"
                : "bg-white border-[#e2e5ec] text-[#3a4055] hover:border-[#c5cbd9] hover:bg-[#f7f8fb]",
            )}
          >
            {n}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="min-w-[34px] h-[34px] px-[10px] border border-[#e2e5ec] rounded-[6px] bg-white text-[#6b7388] flex items-center justify-center hover:border-[#c5cbd9] hover:bg-[#f7f8fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
