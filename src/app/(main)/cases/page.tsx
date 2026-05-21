"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import CaseCard from "@/components/cases/CaseCard";
import { CaseStatus } from "@/components/cases/CaseStatusBadge";

const SEARCH_FIELD_LABELS: Record<string, string> = {
  title: "제목",
  description: "내용",
  manager: "담당자",
};

const STATUS_LABELS: Record<string, string> = {
  all: "전체",
  검토중: "검토중",
  진행중: "진행중",
  사건종료: "사건종료",
  사건완료: "사건완료",
};

const SORT_LABELS: Record<string, string> = {
  latest: "최신순",
  oldest: "오래된순",
};

interface Case {
  id: string;
  status: CaseStatus;
  title: string;
  description: string;
  manager: string;
  date: string;
}

const MOCK_CASES: Case[] = [
  { id: "1", status: "검토중", title: "성남시 분당구 사건", description: "성남시 분당구의 사건파일 입니다.", manager: "홍길동 경감", date: "2026-03-31" },
  { id: "2", status: "진행중", title: "성남시 분당구 사건", description: "성남시 분당구의 사건파일 입니다.", manager: "홍길동 경감", date: "2026-03-31" },
  { id: "3", status: "사건종료", title: "성남시 분당구 사건", description: "성남시 분당구의 사건파일 입니다.", manager: "홍길동 경감", date: "2026-03-31" },
  { id: "4", status: "사건완료", title: "성남시 분당구 사건", description: "성남시 분당구의 사건파일 입니다.", manager: "홍길동 경감", date: "2026-03-31" },
  { id: "5", status: "진행중", title: "성남시 분당구 사건", description: "성남시 분당구의 사건파일 입니다.", manager: "홍길동 경감", date: "2026-03-31" },
  { id: "6", status: "진행중", title: "성남시 분당구 사건", description: "성남시 분당구의 사건파일 입니다.", manager: "홍길동 경감", date: "2026-03-31" },
  { id: "7", status: "사건종료", title: "성남시 분당구 사건", description: "성남시 분당구의 사건파일 입니다.", manager: "홍길동 경감", date: "2026-03-31" },
  { id: "8", status: "사건완료", title: "성남시 분당구 사건", description: "성남시 분당구의 사건파일 입니다.", manager: "홍길동 경감", date: "2026-03-31" },
  { id: "9", status: "진행중", title: "성남시 분당구 사건", description: "성남시 분당구의 사건파일 입니다.", manager: "홍길동 경감", date: "2026-03-31" },
  { id: "10", status: "진행중", title: "성남시 분당구 사건", description: "성남시 분당구의 사건파일 입니다.", manager: "홍길동 경감", date: "2026-03-31" },
  { id: "11", status: "사건종료", title: "성남시 분당구 사건", description: "성남시 분당구의 사건파일 입니다.", manager: "홍길동 경감", date: "2026-03-31" },
  { id: "12", status: "사건완료", title: "성남시 분당구 사건", description: "성남시 분당구의 사건파일 입니다.", manager: "홍길동 경감", date: "2026-03-31" },
];

const TOTAL_PAGES = 10;

export default function CasesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("title");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("latest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div>
      <h1 className="text-[36px] font-bold text-[#003478]">사건관리</h1>
      <p className="text-[18px] text-[#585858] mt-1">
        사건 단위로 자료를 관리할 수 있습니다.
      </p>

      {/* 검색 및 필터 */}
      <div className="flex items-center gap-2 mt-6">
        <div className="relative flex-1 max-w-[480px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search redacted cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full h-9 pl-9 pr-3 text-sm",
              "border border-[#E5E7EB] rounded-lg outline-none",
              "placeholder:text-[#9CA3AF]",
              "focus:border-[#003478] focus:ring-2 focus:ring-[#003478]/20",
              "bg-[#F5F6FA]",
            )}
          />
        </div>

        <Select
          value={searchField}
          onValueChange={(v) => v && setSearchField(v)}
        >
          <SelectTrigger className="w-[88px] bg-[#F5F6FA]">
            <span>{SEARCH_FIELD_LABELS[searchField]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">제목</SelectItem>
            <SelectItem value="description">내용</SelectItem>
            <SelectItem value="manager">담당자</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => v && setStatusFilter(v)}
        >
          <SelectTrigger className="w-[88px] bg-[#F5F6FA]">
            <span>{STATUS_LABELS[statusFilter]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="검토중">검토중</SelectItem>
            <SelectItem value="진행중">진행중</SelectItem>
            <SelectItem value="사건종료">사건종료</SelectItem>
            <SelectItem value="사건완료">사건완료</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={(v) => v && setSortOrder(v)}>
          <SelectTrigger className="w-[100px] bg-[#F5F6FA]">
            <span>{SORT_LABELS[sortOrder]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">최신순</SelectItem>
            <SelectItem value="oldest">오래된순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 사건 그리드 */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        {MOCK_CASES.map((c) => (
          <CaseCard
            key={c.id}
            {...c}
            selected={selectedId === c.id}
            onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
          />
        ))}
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-center gap-1 mt-8">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className={cn(
            "size-8 flex items-center justify-center rounded border text-[#6B7280]",
            "border-[#E5E7EB] hover:bg-[#F5F6FA] disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          <ChevronLeft className="size-4" />
        </button>

        {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={cn(
              "size-8 flex items-center justify-center rounded border text-sm font-medium",
              page === currentPage
                ? "bg-[#003478] border-[#003478] text-white"
                : "border-[#E5E7EB] text-[#374151] hover:bg-[#F5F6FA]",
            )}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage((p) => Math.min(TOTAL_PAGES, p + 1))}
          disabled={currentPage === TOTAL_PAGES}
          className={cn(
            "size-8 flex items-center justify-center rounded border text-[#6B7280]",
            "border-[#E5E7EB] hover:bg-[#F5F6FA] disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
