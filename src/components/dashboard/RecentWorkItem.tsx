import { Eye, Download } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";

type Status = "처리 완료" | "처리중" | "대기중" | "오류 발생";

interface RecentWorkItemProps {
  fileId: string;
  caseLabel: string;
  status: Status;
  size: string;
}

export default function RecentWorkItem({
  fileId,
  caseLabel,
  status,
  size,
}: RecentWorkItemProps) {
  return (
    <div className="grid grid-cols-[1fr_90px_60px_40px] items-center gap-4 py-3 border-b border-gray-100 last:border-none">
      {/* 파일 이름 */}
      <div className="pl-2">
        <p className="text-sm font-bold text-[#003478]">{fileId}</p>
        <p className="text-xs text-[#8492a6] mt-0.5">{caseLabel}</p>
      </div>

      <div className="flex justify-center">
        {/* 상태 */}
        <StatusBadge status={status} />
      </div>
      {/* 용량 */}
      <span className="text-sm text-[#8492a6] text-center">{size}</span>

      {/* 활동 아이콘 */}
      <button className="text-[#8492a6] hover:text-[#003478] transition-colors flex justify-center">
        {status === "대기중" ? <Eye size={16} /> : <Download size={16} />}
      </button>
    </div>
  );
}
