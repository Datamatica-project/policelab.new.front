import { MoreVertical, User, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import CaseStatusBadge, { CaseStatus } from "./CaseStatusBadge";

interface CaseCardProps {
  id: string;
  status: CaseStatus;
  title: string;
  description: string;
  manager: string;
  date: string;
  selected?: boolean;
  onClick?: () => void;
  onMoreClick?: () => void;
}

export default function CaseCard({
  status,
  title,
  description,
  manager,
  date,
  selected,
  onClick,
  onMoreClick,
}: CaseCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl flex flex-col p-4 cursor-pointer min-h-[190px]",
        "transition-shadow",
        selected
          ? "border-2 border-[#003478] shadow-md"
          : "border border-[#E5E7EB] hover:shadow-sm",
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <CaseStatusBadge status={status} />
        <button
          className="text-[#9CA3AF] hover:text-[#6B7280] p-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onMoreClick?.();
          }}
        >
          <MoreVertical className="size-4" />
        </button>
      </div>

      <div className="mt-3">
        <h3 className="text-[15px] font-bold text-[#111827]">{title}</h3>
        <p className="text-[13px] text-[#6B7280] mt-1">{description}</p>
      </div>

      <div className="flex-1" />

      <div className="flex items-end justify-between mt-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280]">
            <User className="size-3.5 shrink-0" />
            <span>{manager}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280]">
            <Calendar className="size-3.5 shrink-0" />
            <span>{date}</span>
          </div>
        </div>
        <button
          className="px-4 py-2 bg-[#003478] text-white text-sm font-medium rounded-lg hover:bg-[#002a63] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          더보기
        </button>
      </div>
    </div>
  );
}
