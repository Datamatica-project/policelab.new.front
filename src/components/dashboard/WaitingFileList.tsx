import { Info } from "lucide-react";
import WaitingFileItem from "@/components/dashboard/WaitingFileItem";

type Status = "처리 완료" | "처리중" | "대기중" | "오류 발생";

interface WaitingFile {
  id: number;
  fileName: string;
  subText: string;
  status: Status;
}

const mockFiles: WaitingFile[] = [
  {
    id: 1,
    fileName: "P_CASE_029.mp4",
    subText: "모자이크 완료 상태",
    status: "처리 완료",
  },
  {
    id: 2,
    fileName: "P_CASE_029.mp4",
    subText: "모자이크 완료 상태",
    status: "처리중",
  },
  {
    id: 3,
    fileName: "P_CASE_029.mp4",
    subText: "모자이크 완료 상태",
    status: "대기중",
  },
  {
    id: 4,
    fileName: "P_CASE_029.mp4",
    subText: "모자이크 완료 상태",
    status: "대기중",
  },
];

export default function WaitingFileList() {
  return (
    <div className="bg-white rounded-[5px] px-6 py-5 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[16px] font-bold text-[#003478]">
          대기중 파일 리스트
        </h3>
        <Info size={16} className="text-[#8492a6]" />
      </div>

      {/* 아이템 목록 */}
      <div className="flex flex-col gap-3">
        {mockFiles.map((file) => (
          <WaitingFileItem
            key={file.id}
            fileName={file.fileName}
            subText={file.subText}
            status={file.status}
          />
        ))}
      </div>
    </div>
  );
}
