"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { UpdateCase } from "@/lib/api";
import type { CaseData } from "@/lib/case-data";

interface CaseEditModalProps {
  caseData: CaseData;
  onClose: () => void;
  onUpdate: (updated: Partial<CaseData>) => void;
}

export default function CaseEditModal({
  caseData,
  onClose,
  onUpdate,
}: CaseEditModalProps) {
  const [title, setTitle] = useState(caseData.title);
  const [description, setDescription] = useState(caseData.description);
  const [occurredAt, setOccurredAt] = useState(
    caseData.date ? `${caseData.date}T00:00` : "",
  );
  const [assignedTo, setAssignedTo] = useState(caseData.manager);
  const [isSaving, setIsSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // ESC 닫기
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("사건명을 입력해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      await UpdateCase(caseData.id, {
        title: title.trim(),
        description: description.trim(),
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        assignedTo: assignedTo.trim() || undefined,
      });
      toast.success("사건 정보가 수정됐습니다.");
      onUpdate({
        title: title.trim(),
        description: description.trim(),
        manager: assignedTo.trim(),
        date: occurredAt ? occurredAt.slice(0, 10) : caseData.date,
      });
      onClose();
    } catch {
      toast.error("사건 수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-[12px] shadow-[0_8px_32px_rgba(15,22,40,0.16)] w-full max-w-[480px] mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-[24px] pt-[22px] pb-[18px] border-b border-[#eef0f5]">
          <div>
            <h2 className="text-[17px] font-bold text-[#1f2330]">사건 정보 수정</h2>
            <p className="text-[12px] text-[#9aa1b3] mt-[2px]"># {caseData.caseNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#9aa1b3] hover:bg-[#f3f4f8] hover:text-[#3a4055] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="px-[24px] py-[20px] flex flex-col gap-[16px]">
          {/* 사건명 */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-[13px] font-semibold text-[#3a4055]">
              사건명 <span className="text-[#d33b3b]">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-[12px] py-[10px] border border-[#d9deea] rounded-[8px] text-[13.5px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] transition-colors"
              placeholder="사건명을 입력하세요"
            />
          </div>

          {/* 사건 설명 */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-[13px] font-semibold text-[#3a4055]">
              사건 설명 <span className="text-[#9aa1b3] font-normal">(선택)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-[12px] py-[10px] border border-[#d9deea] rounded-[8px] text-[13.5px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] resize-none leading-[1.5] transition-colors"
              placeholder="사건 설명을 입력하세요"
            />
          </div>

          {/* 발생일시 */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-[13px] font-semibold text-[#3a4055]">
              발생일시 <span className="text-[#9aa1b3] font-normal">(선택)</span>
            </label>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full px-[12px] py-[10px] border border-[#d9deea] rounded-[8px] text-[13.5px] text-[#1f2330] outline-none focus:border-[#1d2c4e] transition-colors"
            />
          </div>

          {/* 담당자 */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-[13px] font-semibold text-[#3a4055]">
              담당자 <span className="text-[#9aa1b3] font-normal">(선택)</span>
            </label>
            <input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-[12px] py-[10px] border border-[#d9deea] rounded-[8px] text-[13.5px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] transition-colors"
              placeholder="담당자를 입력하세요"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-[8px] pt-[4px]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-[10px] border border-[#d9deea] rounded-[8px] text-[13.5px] font-semibold text-[#3a4055] hover:bg-[#f7f8fb] transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-[10px] bg-[#1d2c4e] text-white rounded-[8px] text-[13.5px] font-bold hover:bg-[#2b3f6c] disabled:bg-[#4a5e8a] transition-colors flex items-center justify-center gap-2"
            >
              {isSaving && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
