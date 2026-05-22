"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Eye, Download, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { getCaseById, generateFiles } from "@/lib/case-data";
import type { CaseStatus, FileData } from "@/lib/case-data";
import FileThumb from "@/components/cases/FileThumb";

const PER_PAGE = 12;

const STATUS_HEADER_STYLES: Record<CaseStatus, string> = {
  검토중: "bg-[#e5e8f0] text-[#4a5168]",
  진행중: "bg-[#dceaf7] text-[#1f5a8f]",
  사건종료: "bg-[#f9dcdc] text-[#a3282b]",
};

/* ── FileCard ── */
function FileCard({ file }: { file: FileData }) {
  return (
    <div className="bg-white border border-[#e6e8ef] rounded-[10px] overflow-hidden flex flex-col transition-all duration-150 cursor-pointer hover:border-[#c5cbd9] hover:shadow-[0_6px_18px_rgba(15,22,40,0.06)] hover:-translate-y-0.5">
      <div className="w-full aspect-[4/3] bg-[linear-gradient(135deg,#c5cbd9_0%,#9aa1b3_100%)] relative overflow-hidden">
        <FileThumb seed={file.seed} />
      </div>
      <div className="px-4 pt-[14px] pb-[10px] flex flex-col gap-[6px]">
        <div
          className="text-[13.5px] font-bold text-[#1f2330] overflow-hidden text-ellipsis whitespace-nowrap tracking-[-0.01em]"
          title={file.name}
        >
          {file.name}
        </div>
        <div className="flex justify-between text-[12px] text-[#8a93a8]">
          <span>{file.size}</span>
          <span>{file.date}</span>
        </div>
      </div>
      <div className="flex gap-[14px] px-4 pb-[14px] pt-[10px] border-t border-[#f0f1f5]">
        <button
          className="w-[22px] h-[22px] flex items-center justify-center text-[#8a93a8] rounded hover:text-[#1d2c4e] hover:bg-[#f3f4f8] transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="미리보기"
        >
          <Eye size={17} />
        </button>
        <button
          className="w-[22px] h-[22px] flex items-center justify-center text-[#8a93a8] rounded hover:text-[#1d2c4e] hover:bg-[#f3f4f8] transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="다운로드"
        >
          <Download size={17} />
        </button>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function CaseFilesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const caseData = useMemo(() => getCaseById(id), [id]);
  const allFiles = useMemo(() => generateFiles(id), [id]);

  const [search, setSearch] = useState("");
  const [field, setField] = useState("title");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let arr = allFiles;
    if (q) arr = arr.filter((f) => f.name.toLowerCase().includes(q));
    if (sort === "newest") arr = [...arr].sort((a, b) => b.date.localeCompare(a.date));
    else if (sort === "oldest") arr = [...arr].sort((a, b) => a.date.localeCompare(b.date));
    else if (sort === "title") arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [allFiles, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pageFiles = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const pageNumbers = useMemo(() => {
    const count = Math.min(10, totalPages);
    const start = Math.max(1, Math.min(page - 4, totalPages - count + 1));
    return Array.from({ length: count }, (_, i) => start + i);
  }, [page, totalPages]);

  const resetPage = () => setCurrentPage(1);

  return (
    <div className="pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[14px] text-[#6b7388] mb-[10px]">
        <button
          onClick={() => router.push("/cases")}
          className="hover:text-[#1d2c4e] hover:underline transition-colors"
        >
          사건관리
        </button>
        <span className="text-[#c5cbd9]">&gt;</span>
        <button
          onClick={() => router.push("/cases")}
          className="hover:text-[#1d2c4e] hover:underline transition-colors"
        >
          {caseData.title}
        </button>
        <span className="text-[#c5cbd9]">&gt;</span>
        <span className="text-[#1f2330] font-medium">파일</span>
      </nav>

      <h1 className="text-[32px] font-extrabold text-[#1f2330] tracking-[-0.02em] mb-2">
        파일 관리
      </h1>
      <p className="text-[14.5px] text-[#6b7388] mb-[22px]">
        사건에 대한 세부 작업 내역을 확인할 수 있습니다.
      </p>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-[22px] flex-wrap">
        <div className="relative min-w-[240px] max-w-[380px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9aa1b3]" />
          <input
            type="text"
            placeholder="Search redacted cases..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            className="w-full pl-[38px] pr-3 py-[10px] border border-[#e2e5ec] rounded-[8px] bg-white text-[13.5px] text-[#3a4055] outline-none focus:border-[#2b3f6c] placeholder:text-[#9aa1b3]"
          />
        </div>

        <Select
          value={field}
          onValueChange={(v) => {
            if (v) { setField(v); resetPage(); }
          }}
        >
          <SelectTrigger className="w-[110px] border-[#e2e5ec] bg-white text-[13.5px] text-[#3a4055] rounded-[8px] h-[42px]">
            <span>{{ title: "제목", all: "전체 항목" }[field]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">제목</SelectItem>
            <SelectItem value="all">전체 항목</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            if (v) { setStatusFilter(v); resetPage(); }
          }}
        >
          <SelectTrigger className="w-[120px] border-[#e2e5ec] bg-white text-[13.5px] text-[#3a4055] rounded-[8px] h-[42px]">
            <span>
              {{ all: "전체", done: "비식별 완료", pending: "대기" }[statusFilter]}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="done">비식별 완료</SelectItem>
            <SelectItem value="pending">대기</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-[22px] bg-[#e2e5ec]" />

        <Select
          value={sort}
          onValueChange={(v) => {
            if (v) { setSort(v); resetPage(); }
          }}
        >
          <SelectTrigger className="w-[110px] border-[#e2e5ec] bg-white text-[13.5px] text-[#3a4055] rounded-[8px] h-[42px]">
            <span>{{ newest: "최신순", oldest: "오래된순", title: "제목순" }[sort]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">최신순</SelectItem>
            <SelectItem value="oldest">오래된순</SelectItem>
            <SelectItem value="title">제목순</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <button className="flex items-center gap-2 bg-[#1d2c4e] text-white px-5 py-[11px] rounded-[8px] text-[13.5px] font-semibold hover:bg-[#2b3f6c] transition-colors">
            <Plus size={16} />
            새 작업 생성
          </button>
        </div>
      </div>

      {/* Case header */}
      <div className="flex items-center gap-3 mb-[22px] flex-wrap">
        <span
          className={cn(
            "text-[12.5px] font-bold px-[14px] py-[7px] rounded-[6px]",
            STATUS_HEADER_STYLES[caseData.status],
          )}
        >
          {caseData.status}
        </span>
        <div className="text-[22px] font-bold text-[#1f2330] tracking-[-0.01em] flex items-center">
          <span>{caseData.title}</span>
          <span className="text-[#c5cbd9] mx-2 font-normal">&gt;</span>
          <span className="text-[#6b7388] font-medium text-[20px]">파일</span>
        </div>
      </div>

      {/* File grid */}
      <div className="grid grid-cols-4 gap-[22px] mb-9">
        {pageFiles.map((f) => (
          <FileCard key={f.id} file={f} />
        ))}
        {pageFiles.length === 0 && (
          <div className="col-span-4 text-center py-16 text-[#9aa1b3] text-[13.5px]">
            조건에 맞는 파일이 없습니다.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
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
      )}
    </div>
  );
}
