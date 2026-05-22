"use client";

import { MoreVertical, User, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import CaseStatusBadge from "./CaseStatusBadge";
import type { CaseData } from "@/lib/case-data";

interface CaseCardProps extends CaseData {
  selected?: boolean;
}

export default function CaseCard({
  id,
  status,
  title,
  description,
  manager,
  date,
  selected,
}: CaseCardProps) {
  const router = useRouter();

  return (
    <div
      className={cn(
        "bg-white rounded-[10px] flex flex-col p-[18px] cursor-pointer min-h-[200px]",
        "transition-all duration-150",
        selected
          ? "border-[1.5px] border-[#1d2c4e] shadow-[0_4px_16px_rgba(29,44,78,0.10)]"
          : "border border-[#e6e8ef] hover:border-[#c5cbd9] hover:shadow-[0_4px_14px_rgba(15,22,40,0.04)]",
      )}
      onClick={() => router.push(`/cases/${id}`)}
    >
      <div className="flex items-start justify-between mb-[14px]">
        <CaseStatusBadge status={status} />
        <button
          className="w-6 h-6 flex items-center justify-center text-[#9aa1b3] rounded hover:bg-[#f3f4f8] hover:text-[#3a4055]"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={14} />
        </button>
      </div>

      <h3 className="text-[17px] font-bold text-[#1f2330] leading-[1.3] tracking-[-0.01em] mb-[6px]">
        {title}
      </h3>
      <p className="text-[13px] text-[#8a93a8] leading-[1.5] mb-[18px]">
        {description}
      </p>

      <div className="mt-auto border-t border-[#eef0f5] pt-[12px] flex justify-between items-end gap-[10px]">
        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-[6px] text-[12.5px] text-[#6b7388]">
            <User size={12} className="shrink-0 text-[#8a93a8]" />
            <span>{manager}</span>
          </div>
          <div className="flex items-center gap-[6px] text-[12.5px] text-[#6b7388]">
            <Calendar size={12} className="shrink-0 text-[#8a93a8]" />
            <span>{date}</span>
          </div>
        </div>
        <button
          className="px-[14px] py-[7px] bg-[#1d2c4e] text-white text-[12px] font-semibold rounded-[5px] shrink-0 hover:bg-[#2b3f6c] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/cases/${id}`);
          }}
        >
          더보기
        </button>
      </div>
    </div>
  );
}
