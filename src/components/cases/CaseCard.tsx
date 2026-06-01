"use client";

import { MoreVertical, User, Calendar, Trash2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DeleteCase } from "@/lib/api";
import CaseStatusBadge from "./CaseStatusBadge";
import CaseEditModal from "./CaseEditModal";
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
  selected,
  onDelete,
  onUpdate,
}: CaseCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setIsDeleting(true);
    try {
      await DeleteCase(id);
      toast.success("사건이 삭제됐습니다.");
      onDelete?.(id);
    } catch {
      toast.error("사건 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
    <div
      className={cn(
        "bg-white rounded-[10px] flex flex-col p-[18px] cursor-pointer min-h-[200px]",
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
                  setEditOpen(true);
                }}
                className="w-full flex items-center gap-[8px] px-[12px] py-[8px] text-[13px] text-[#3a4055] font-medium hover:bg-[#f3f4f8] transition-colors cursor-pointer rounded-[6px]"
              >
                <Pencil size={13} />
                사건 수정
              </button>
              <button
                onClick={handleDelete}
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
      <h3 className="text-[17px] font-bold text-[#1f2330] leading-[1.3] tracking-[-0.01em] mb-[6px]">
        {title}
      </h3>
      <p className="text-[13px] text-[#8a93a8] leading-[1.5] mb-[18px]">
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

    {editOpen && (
      <CaseEditModal
        caseData={{ id, caseNumber, status, title, description, manager, date }}
        onClose={() => setEditOpen(false)}
        onUpdate={(updated) => {
          onUpdate?.(id, updated);
          setEditOpen(false);
        }}
      />
    )}
  </>
  );
}
