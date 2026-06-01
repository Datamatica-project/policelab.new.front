export default function Footer() {
  return (
    <footer className="border-t border-[#eef0f5] bg-white mt-auto">
      <div className="max-w-[1200px] mx-auto px-8 py-[18px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-[10px]">
          <span className="text-[12.5px] font-bold text-[#1d2c4e]">PoliceLab</span>
          <span className="w-px h-[12px] bg-[#e2e5ec]" />
          <span className="text-[12px] text-[#9aa1b3]">교통사고 현장데이터 공유시스템</span>
        </div>
        <span className="text-[12px] text-[#b0b7c9]">
          © {new Date().getFullYear()} PoliceLab. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
