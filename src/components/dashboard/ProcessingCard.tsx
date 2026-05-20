interface ProcessingCardProps {
  fileName?: string;
  caseLabel?: string;
  progress?: number;
  status?: string;
  startTime?: string;
  elapsedTime?: string;
}

export default function ProcessingCard({
  fileName = "F0621_GM_M_D_78-54-22_02.jpg",
  caseLabel = "강릉 사건 파일",
  progress = 75,
  status = "이미지 처리 중...",
  startTime = "14:22:01",
  elapsedTime = "2M 14S",
}: ProcessingCardProps) {
  return (
    <div className="bg-white rounded-[5px] px-6 py-5 shadow-sm">
      {/* 상단 */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-[#003478] text-[15px]">{fileName}</p>
          <p className="text-sm text-[#8492a6] mt-0.5">{caseLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-[28px] font-black text-[#003478] leading-none">
            {progress}%
          </p>
          <p className="text-xs text-[#8492a6] mt-1">{status}</p>
        </div>
      </div>

      {/* 프로그레스바 */}
      <div className="mt-5 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#003478] rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 하단 */}
      <div className="flex justify-between mt-3">
        <p className="text-xs text-[#8492a6]">시작 시간: {startTime}</p>
        <p className="text-xs text-[#8492a6]">완료 시간: {elapsedTime}</p>
      </div>
    </div>
  );
}
