import { FileText } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";

type Status = "처리 완료" | "처리중" | "대기중" | "오류 발생";

interface WaitingFileItemProps {
  fileName: string;
  subText: string;
  status: Status;
}

export default function WaitingFileItem({
  fileName,
  subText,
  status,
}: WaitingFileItemProps) {
  return (
    <div className="flex items-center justify-between py-3 px-3  bg-[#F9FAFB] border border-[#F3F4F6]">
      <div className="flex items-center gap-3">
        <div className="bg-white w-[40px] h-[40px] flex items-center justify-center rounded-full">
          <FileText size={20} className="text-[#8492a6] shrink-0" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#003478]">{fileName}</p>
          <p className="text-xs text-[#8492a6] mt-0.5">{subText}</p>
        </div>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}
