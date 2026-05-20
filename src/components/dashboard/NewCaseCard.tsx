import Link from "next/link";
import { Plus } from "lucide-react";

export default function NewCaseCard() {
  return (
    <div className="bg-white rounded-[5px] px-6 py-5 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center gap-1 mb-1">
        <Plus size={15} className="text-[#003478]" />
        <h3 className="text-[16px] font-bold text-[#003478]">새 사건 생성</h3>
      </div>
      <p className="text-xs text-[#8492a6]">
        파일 업로드 및 모자이크 작업 시작
      </p>

      {/* 버튼 */}
      <Link
        href="/cases/new"
        className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-[#003478] hover:bg-[#002560] text-white text-sm font-semibold rounded-[5px] transition-colors"
      >
        <Plus size={16} />새 사건 생성
      </Link>
    </div>
  );
}
