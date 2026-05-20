import Link from "next/link";
import RecentWorkItem from "@/components/dashboard/RecentWorkItem";

type Status = "처리 완료" | "처리중" | "대기중" | "오류 발생";

interface RecentWork {
  id: number;
  fileId: string;
  caseLabel: string;
  status: Status;
  size: string;
}

const mockData: RecentWork[] = [
  {
    id: 1,
    fileId: "#RED-8821",
    caseLabel: "인천 사건 파일",
    status: "대기중",
    size: "44KB",
  },
  {
    id: 2,
    fileId: "#RED-8819",
    caseLabel: "부산 사건 파일",
    status: "처리 완료",
    size: "28KB",
  },
  {
    id: 3,
    fileId: "#RED-8819",
    caseLabel: "부산 사건 파일",
    status: "오류 발생",
    size: "28KB",
  },
];

export default function RecentWorkList() {
  return (
    <div className="bg-white rounded-[5px] px-6 py-5 shadow-sm h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[16px] font-bold text-[#003478]">
          최근 작업 리스트
        </h3>
        <Link href="/cases" className="text-xs text-[#2563eb] hover:underline">
          모든 기록 보기
        </Link>
      </div>

      {/* 컬럼 헤더 */}
      <div className="grid grid-cols-[1fr_90px_60px_40px] items-center gap-4 py-2 border-b border-gray-200">
        <span className="text-xs text-left text-[#8492a6] pl-2">파일 이름</span>
        <span className="text-xs text-center text-[#8492a6]">상태</span>
        <span className="text-xs text-center text-[#8492a6] ">용량</span>
        <span className="text-xs text-center  text-[#8492a6]">활동</span>
      </div>

      {/* 아이템 목록 */}
      <div>
        {mockData.map((item) => (
          <RecentWorkItem
            key={item.id}
            fileId={item.fileId}
            caseLabel={item.caseLabel}
            status={item.status}
            size={item.size}
          />
        ))}
      </div>
    </div>
  );
}
