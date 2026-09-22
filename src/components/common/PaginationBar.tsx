"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** 한 번에 노출할 페이지 번호 버튼 최대 개수 */
const MAX_PAGE_BUTTONS = 10;

interface PaginationBarProps {
  /** 현재 페이지 (1-based) */
  page: number;
  totalPages: number;
  /** 페이지 이동 요청 (1-based) */
  onChange: (page: number) => void;
  className?: string;
}

/**
 * 목록 하단 페이지네이션 바.
 *
 * 페이지가 하나뿐이어도 바 자체는 항상 보여준다. 통째로 숨기면 "다음 페이지가 없는 것"과
 * "페이지 넘기는 기능이 없는 것"을 사용자가 구분할 수 없다. 대신 양쪽 화살표를 비활성화한다.
 */
export default function PaginationBar({ page, totalPages, onChange, className }: PaginationBarProps) {
  const safeTotal = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), safeTotal);

  const pageNumbers = useMemo(() => {
    const count = Math.min(MAX_PAGE_BUTTONS, safeTotal);
    const start = Math.max(1, Math.min(current - 4, safeTotal - count + 1));
    return Array.from({ length: count }, (_, i) => start + i);
  }, [current, safeTotal]);

  const arrowClass =
    "min-w-[34px] h-[34px] px-[10px] border border-[#e2e5ec] rounded-[6px] bg-white text-[#6b7388] " +
    "flex items-center justify-center hover:border-[#c5cbd9] hover:bg-[#f7f8fb] " +
    "disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

  return (
    <nav aria-label="페이지 이동" className={cn("flex items-center justify-center gap-[6px] py-2 pb-4", className)}>
      <button
        type="button"
        aria-label="이전 페이지"
        onClick={() => onChange(current - 1)}
        disabled={current <= 1}
        className={arrowClass}
      >
        <ChevronLeft size={14} />
      </button>

      {pageNumbers.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n}페이지`}
          aria-current={n === current ? "page" : undefined}
          onClick={() => onChange(n)}
          className={cn(
            "min-w-[34px] h-[34px] px-[10px] border rounded-[6px] text-[13px] font-medium flex items-center justify-center transition-colors",
            n === current
              ? "bg-[#1d2c4e] border-[#1d2c4e] text-white"
              : "bg-white border-[#e2e5ec] text-[#3a4055] hover:border-[#c5cbd9] hover:bg-[#f7f8fb]",
          )}
        >
          {n}
        </button>
      ))}

      <button
        type="button"
        aria-label="다음 페이지"
        onClick={() => onChange(current + 1)}
        disabled={current >= safeTotal}
        className={arrowClass}
      >
        <ChevronRight size={14} />
      </button>
    </nav>
  );
}
