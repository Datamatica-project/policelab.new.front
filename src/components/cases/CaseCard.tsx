"use client";

import {
  MoreVertical,
  User,
  Calendar,
  Trash2,
  Pencil,
  Share2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DeleteCase } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiError";
import CaseStatusBadge from "./CaseStatusBadge";
import CaseEditModal from "./CaseEditModal";
import CaseShareModal from "./CaseShareModal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import type { CaseData } from "@/lib/case-data";

interface CaseCardProps extends CaseData {
  selected?: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updated: Partial<CaseData>) => void;
}

export default function CaseCard({
  id,
  caseNumber,
  status,
  title,
  description,
  manager,
  date,
  occurredAt,
  sharedWith = [],
  selected,
  onDelete,
  onUpdate,
}: CaseCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  /** 종결된 사건은 서버가 수정·파일 추가를 거부한다 */
  const isClosed = status === "사건종료";
  const [currentSharedWith, setCurrentSharedWith] =
    useState<string[]>(sharedWith);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // 삭제는 확인 창을 거친다. 메뉴 항목이 곧바로 삭제로 이어지면
  // 바로 위 "사건 수정" 을 누르려다 오클릭 한 번에 사건과 파일이 사라진다.
  const askDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setConfirmDeleteOpen(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await DeleteCase(id);
      toast.success("사건이 삭제됐습니다.");
      setConfirmDeleteOpen(false);
      onDelete?.(id);
    } catch (e) {
      // 서버가 준 사유(권한 없음, 종결된 사건 등)를 그대로 보여준다
      toast.error(getApiErrorMessage(e, "사건 삭제에 실패했습니다."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "bg-white rounded-[10px] flex flex-col p-[18px] cursor-pointer h-[286px] overflow-hidden",
          "transition-all duration-150",
          isDeleting && "opacity-50 pointer-events-none",
          selected
            ? "border-[1.5px] border-[#1d2c4e] shadow-[0_4px_16px_rgba(29,44,78,0.10)]"
            : "border border-[#e6e8ef] hover:border-[#c5cbd9] hover:shadow-[0_4px_14px_rgba(15,22,40,0.04)]",
        )}
        onClick={() => router.push(`/cases/${id}`)}
      >
        <div className="flex items-start justify-between mb-[14px]">
          <CaseStatusBadge status={status} />

          {/* 3dot 메뉴 */}
          <div ref={menuRef} className="relative">
            <button
              className="w-6 h-6 flex items-center justify-center text-[#9aa1b3] rounded hover:bg-[#f3f4f8] hover:text-[#3a4055] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
            >
              <MoreVertical size={14} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[28px] z-50 bg-white border border-[#e2e5ec] rounded-[8px] shadow-[0_4px_16px_rgba(15,22,40,0.10)] p-[4px] min-w-[130px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setShareOpen(true);
                  }}
                  className="w-full flex items-center gap-[8px] px-[12px] py-[8px] text-[13px] text-[#3a4055] font-medium hover:bg-[#f3f4f8] transition-colors cursor-pointer rounded-[6px]"
                >
                  <Share2 size={13} />
                  사건 공유
                </button>
                {/* 종결된 사건은 서버가 수정을 거부한다. 눌러도 실패할 항목을
                    그대로 열어 두면 사용자는 원인을 화면에서 알 수 없다. */}
                <button
                  disabled={isClosed}
                  title={isClosed ? "종결된 사건은 수정할 수 없습니다. 먼저 사건을 다시 열어주세요." : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isClosed) return;
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                  className={cn(
                    "w-full flex items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium transition-colors rounded-[6px]",
                    isClosed
                      ? "text-[#b6bbc9] cursor-not-allowed"
                      : "text-[#3a4055] hover:bg-[#f3f4f8] cursor-pointer",
                  )}
                >
                  <Pencil size={13} />
                  사건 수정
                </button>
                <button
                  onClick={askDelete}
                  className="w-full flex items-center gap-[8px] px-[12px] py-[8px] text-[13px] text-[#d33b3b] font-medium hover:bg-[#fff1f1] transition-colors cursor-pointer rounded-[6px]"
                >
                  <Trash2 size={13} />
                  사건 삭제
                </button>
              </div>
            )}
          </div>
        </div>

        <span className="text-[11.5px] font-medium text-[#9aa1b3] tracking-wide mb-[4px] block">
          # {caseNumber}
        </span>
        <h3
          className="text-[17px] font-bold text-[#1f2330] leading-[1.3] tracking-[-0.01em] mb-[6px] line-clamp-1"
          title={title}
        >
          {title}
        </h3>
        <p
          className="text-[13px] text-[#8a93a8] leading-[1.5] mb-[18px] line-clamp-3"
          title={description}
        >
          {description}
        </p>

        <div className="mt-auto border-t border-[#eef0f5] pt-[12px] flex justify-between items-end gap-[10px]">
          <div className="flex flex-col gap-[6px]">
            <div className="flex items-center gap-[6px] text-[12.5px] text-[#6b7388]">
              <User size={12} className="shrink-0 text-[#8a93a8]" />
              <span>{manager}</span>
            </div>
            <div className="flex items-center gap-[6px] text-[12.5px] text-[#6b7388]">
              <Calendar size={12} className="shrink-0 text-[#8a93a8]" />
              <span>{date}</span>
            </div>
            {currentSharedWith.length > 0 && (
              <div className="flex items-center gap-[6px] text-[12.5px] text-[#6b7388]">
                <Share2 size={12} className="shrink-0 text-[#8a93a8]" />
                <span>공유된 사람 {currentSharedWith.length}명</span>
              </div>
            )}
          </div>

          <button
            className="px-[14px] py-[7px] bg-[#1d2c4e] text-white text-[12px] font-semibold rounded-[5px] shrink-0 hover:bg-[#2b3f6c] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/cases/${id}`);
            }}
          >
            더보기
          </button>
        </div>
      </div>

      {confirmDeleteOpen && (
        <ConfirmDialog
          title="이 사건을 삭제할까요?"
          description={`${caseNumber} · ${title}
사건에 포함된 파일도 함께 목록에서 사라지며, 화면에서 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          destructive
          isPending={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}

      {editOpen && (
        <CaseEditModal
          caseData={{
            id,
            caseNumber,
            status,
            title,
            description,
            manager,
            date,
            // 수정 모달은 시각까지 필요하다. date 는 날짜만 남은 값이라
            // 이걸 빠뜨리면 저장할 때마다 시각이 자정으로 지워진다.
            occurredAt,
          }}
          onClose={() => setEditOpen(false)}
          onUpdate={(updated) => {
            onUpdate?.(id, updated);
            setEditOpen(false);
          }}
        />
      )}

      {shareOpen && (
        <CaseShareModal
          caseId={id}
          caseNumber={caseNumber}
          sharedWith={currentSharedWith}
          onClose={() => setShareOpen(false)}
          onShared={(newUsernames) => {
            setCurrentSharedWith((prev) => [
              ...new Set([...prev, ...newUsernames]),
            ]);
          }}
        />
      )}
    </>
  );
}
