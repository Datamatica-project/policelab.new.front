"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import CaseCard from "@/components/cases/CaseCard";
import PaginationBar from "@/components/common/PaginationBar";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import {
  GetCases,
  type CaseResponse,
  type CaseAccessType,
  type CaseSearchField,
  type CaseSortOrder,
  type CaseStatusFilter,
} from "@/lib/api";
import type { CaseData, CaseStatus } from "@/lib/case-data";
import { useCaseStore } from "@/store/caseStore";

const STATUS_MAP: Record<string, CaseStatus> = {
  OPEN: "진행중",
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

const SEARCH_FIELD_LABELS: Record<CaseSearchField, string> = {
  TITLE: "제목",
  MANAGER: "담당자",
  ALL: "전체 항목",
};

/** UI 전용 상태 필터 값. "ALL" 은 서버로 보내지 않고 null 로 바꾼다. */
type StatusFilterValue = "ALL" | CaseStatusFilter;

const STATUS_LABELS: Record<StatusFilterValue, string> = {
  ALL: "전체",
  OPEN: "진행중",
  CLOSED: "사건종료",
};

const SORT_LABELS: Record<CaseSortOrder, string> = {
  LATEST: "최신순",
  OLDEST: "오래된순",
  TITLE: "제목순",
};

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

const ACCESS_TABS: { label: string; value: CaseAccessType }[] = [
  { label: "전체", value: "ALL" },
  { label: "내 사건", value: "OWNED" },
  { label: "공유받은 사건", value: "SHARED" },
];

/**
 * 목록 조회 조건. 검색·필터·정렬·페이지를 한 덩어리로 들고 있는다.
 *
 * 따로 쪼개 두면 "필터 변경 → 1페이지로 이동"이 상태 갱신 두 번으로 나뉘어
 * 이전 페이지 번호로 한 번, 0페이지로 또 한 번 요청이 나간다.
 */
interface CaseQuery {
  /** 0-based (서버 규격) */
  page: number;
  typeShare: CaseAccessType;
  search: string;
  searchField: CaseSearchField;
  status: CaseStatusFilter | null;
  sort: CaseSortOrder;
}

const INITIAL_QUERY: CaseQuery = {
  page: 0,
  typeShare: "ALL",
  search: "",
  searchField: "TITLE",
  status: null,
  sort: "LATEST",
};

export default function CasesPage() {
  const router = useRouter();
  const { setSidebarCases } = useCaseStore();

  const [query, setQuery] = useState<CaseQuery>(INITIAL_QUERY);
  const [searchInput, setSearchInput] = useState("");

  const [cases, setCases] = useState<CaseData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  // 삭제/수정 후 목록을 다시 받아오기 위한 트리거
  const [reloadToken, setReloadToken] = useState(0);
  // 늦게 도착한 옛 응답이 최신 결과를 덮어쓰지 않도록 요청 순번을 기록한다
  const requestIdRef = useRef(0);

  /** 필터를 바꾸면 항상 첫 페이지부터 다시 본다 */
  const patchFilter = useCallback((patch: Partial<Omit<CaseQuery, "page">>) => {
    setQuery((prev) => ({ ...prev, ...patch, page: 0 }));
  }, []);

  const goToPage = useCallback((uiPage: number) => {
    setQuery((prev) => ({ ...prev, page: Math.max(0, uiPage - 1) }));
  }, []);

  // 타이핑이 멈춘 뒤에야 검색어를 조회 조건에 반영한다 (글자마다 요청이 나가지 않도록)
  const applySearch = useDebouncedCallback(
    (value: string) => patchFilter({ search: value.trim() }),
    SEARCH_DEBOUNCE_MS,
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      applySearch(value);
    },
    [applySearch],
  );

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await GetCases({
          page: query.page,
          size: PAGE_SIZE,
          typeShare: query.typeShare,
          search: query.search,
          searchField: query.searchField,
          status: query.status,
          sort: query.sort,
        });
        if (isStale()) return;

        setCases(data.content.map(toCaseData));
        setTotalPages(Math.max(1, data.totalPages ?? 1));
        setTotalElements(data.totalElements ?? 0);
        setLoadFailed(false);

        // 사이드바는 필터 없는 첫 페이지일 때만 동기화 (검색 결과로 덮어쓰지 않는다)
        const isUnfiltered =
          query.page === 0 && query.typeShare === "ALL" && !query.search && !query.status;
        if (isUnfiltered) {
          setSidebarCases(data.content.map((c) => ({ id: c.caseId, title: c.title })));
        }
      } catch {
        if (isStale()) return;
        setCases([]);
        setTotalPages(1);
        setTotalElements(0);
        setLoadFailed(true);
      } finally {
        if (!isStale()) setIsLoading(false);
      }
    };

    load();
  }, [query, reloadToken, setSidebarCases]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  /**
   * 삭제된 항목은 화면에서 먼저 지우고 목록을 다시 받는다.
   * 다시 받지 않으면 이 페이지만 11건으로 남고 전체 건수도 어긋난다.
   */
  const handleDeleted = useCallback(
    (deletedId: string) => {
      const remaining = cases.filter((x) => x.id !== deletedId);
      setCases(remaining);

      if (remaining.length === 0 && query.page > 0) {
        // 이 페이지의 마지막 한 건을 지웠다면 빈 화면 대신 이전 페이지를 보여준다.
        // page 가 바뀌면 조회 effect 가 다시 도므로 별도 reload 는 필요 없다.
        setQuery((q) => ({ ...q, page: q.page - 1 }));
        return;
      }
      reload();
    },
    [cases, query.page, reload],
  );

  /**
   * 수정된 내용을 즉시 반영하되, 정렬·필터 기준이 바뀌었을 수 있으므로 다시 받아온다.
   * (예: 진행중만 보는 중에 사건을 종료 처리한 경우)
   */
  const handleUpdated = useCallback(
    (updatedId: string, updated: Partial<CaseData>) => {
      setCases((prev) => prev.map((x) => (x.id === updatedId ? { ...x, ...updated } : x)));
      reload();
    },
    [reload],
  );

  const statusValue: StatusFilterValue = query.status ?? "ALL";
  const uiPage = query.page + 1;
  const hasFilter = Boolean(query.search) || query.status !== null;

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[32px] font-extrabold text-[#1f2330] tracking-[-0.02em] mb-2">
            사건관리
          </h1>
          <p className="text-[14.5px] text-[#6b7388]">
            사건 단위로 자료를 관리할 수 있습니다.
          </p>
        </div>
        <button
          onClick={() => router.push("/cases/new")}
          className="shrink-0 flex items-center gap-[7px] px-[18px] py-[11px] bg-[#1d2c4e] text-white rounded-[8px] text-[14px] font-bold hover:bg-[#2b3f6c] transition-colors"
        >
          <Plus size={16} />
          새 사건
        </button>
      </div>

      {/* 접근 유형 탭 */}
      <div className="flex items-center gap-[6px] mb-[22px]">
        {ACCESS_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => patchFilter({ typeShare: value })}
            className={cn(
              "px-[16px] py-[8px] rounded-[8px] text-[13.5px] font-semibold transition-colors",
              query.typeShare === value
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
            placeholder="사건 제목 또는 담당자 검색..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-[38px] pr-3 py-[10px] border border-[#e2e5ec] rounded-[8px] bg-white text-[13.5px] text-[#3a4055] outline-none focus:border-[#2b3f6c] placeholder:text-[#9aa1b3]"
          />
        </div>

        <Select
          value={query.searchField}
          onValueChange={(v) => {
            if (v) patchFilter({ searchField: v as CaseSearchField });
          }}
        >
          <SelectTrigger className="w-[100px] border-[#e2e5ec] bg-white text-[13.5px] text-[#3a4055] rounded-[8px] h-[42px]">
            <span>{SEARCH_FIELD_LABELS[query.searchField]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TITLE">제목</SelectItem>
            <SelectItem value="MANAGER">담당자</SelectItem>
            <SelectItem value="ALL">전체 항목</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-[22px] bg-[#e2e5ec]" />

        <Select
          value={statusValue}
          onValueChange={(v) => {
            if (v) patchFilter({ status: v === "ALL" ? null : (v as CaseStatusFilter) });
          }}
        >
          <SelectTrigger className="w-[100px] border-[#e2e5ec] bg-white text-[13.5px] text-[#3a4055] rounded-[8px] h-[42px]">
            <span>{STATUS_LABELS[statusValue]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="OPEN">진행중</SelectItem>
            <SelectItem value="CLOSED">사건종료</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={query.sort}
          onValueChange={(v) => {
            if (v) patchFilter({ sort: v as CaseSortOrder });
          }}
        >
          <SelectTrigger className="w-[110px] border-[#e2e5ec] bg-white text-[13.5px] text-[#3a4055] rounded-[8px] h-[42px]">
            <span>{SORT_LABELS[query.sort]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LATEST">최신순</SelectItem>
            <SelectItem value="OLDEST">오래된순</SelectItem>
            <SelectItem value="TITLE">제목순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 검색·필터가 걸린 상태에서도 전체 몇 건 중 몇 페이지인지 보이게 한다 */}
      <div className="flex items-center justify-between mb-3 text-[13px] text-[#6b7388]">
        <span>
          {isLoading ? "불러오는 중..." : `전체 ${totalElements.toLocaleString()}건`}
        </span>
        <span>
          {uiPage} / {totalPages} 페이지
        </span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-4 gap-[18px] mb-9">
        {isLoading ? (
          <div className="col-span-4 text-center py-16 text-[#9aa1b3] text-[13.5px]">
            불러오는 중...
          </div>
        ) : loadFailed ? (
          <div className="col-span-4 text-center py-16 text-[13.5px]">
            <p className="text-[#c0392b] mb-3">사건 목록을 불러오지 못했습니다.</p>
            <button
              onClick={reload}
              className="px-[14px] py-[8px] border border-[#e2e5ec] rounded-[6px] bg-white text-[#3a4055] hover:bg-[#f7f8fb] transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : cases.length === 0 ? (
          <div className="col-span-4 text-center py-16 text-[#9aa1b3] text-[13.5px]">
            {hasFilter ? "조건에 맞는 사건이 없습니다." : "등록된 사건이 없습니다."}
          </div>
        ) : (
          cases.map((c) => (
            <CaseCard key={c.id} {...c} onDelete={handleDeleted} onUpdate={handleUpdated} />
          ))
        )}
      </div>

      <PaginationBar page={uiPage} totalPages={totalPages} onChange={goToPage} />
    </div>
  );
}
