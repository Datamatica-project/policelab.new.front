import StatCard from "@/components/dashboard/StatCard";
import ProcessingCard from "@/components/dashboard/ProcessingCard";
import RecentWorkList from "@/components/dashboard/RecentWorkList";
import WaitingFileList from "@/components/dashboard/WaitingFileList";
import NewCaseCard from "@/components/dashboard/NewCaseCard";

const stats = [
  {
    label: "오늘 처리한 파일 수",
    value: "124",
    unit: "Files",
    icon: "/dashboard/file.png",
  },
  {
    label: "평균 처리 시간",
    value: "1m 24s",
    unit: "",
    icon: "/dashboard/time.png",
  },
  {
    label: "모자이크 정확도",
    value: "99.2",
    unit: "%",
    icon: "/dashboard/accurate.png",
  },
  {
    label: "수동 수정 비율",
    value: "0.8",
    unit: "%",
    icon: "/dashboard/edit.png",
  },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-[36px] font-bold text-[#003478]">작업현황</h1>
      <p className="text-[18px] text-[#585858] mt-1">
        파일 업로드 및 공유 현황을 확인하세요
      </p>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4 mt-8">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* 하단 2열 레이아웃 */}
      <div className="grid grid-cols-5 gap-4 mt-4">
        {/* 좌 - 3/5 */}
        <div className="col-span-3 flex flex-col gap-4">
          <ProcessingCard />
          <div className="flex-1">
            <RecentWorkList />
          </div>
        </div>
        {/* 우 - 2/5 */}
        <div className="col-span-2 flex flex-col gap-4">
          <WaitingFileList />
          <NewCaseCard />
        </div>
      </div>
    </div>
  );
}
