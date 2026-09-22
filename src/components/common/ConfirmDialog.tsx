"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  title: string;
  /** 무엇이 사라지는지 구체적으로 쓴다. "정말 삭제할까요?" 보다 대상을 밝히는 편이 낫다. */
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** 되돌릴 수 없는 동작이면 true — 확인 버튼을 빨간색으로 바꾼다 */
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 되돌리기 어려운 동작 앞에 세우는 확인 창.
 *
 * 메뉴 항목 하나가 곧바로 삭제로 이어지면 오클릭 한 번에 사건과 증거 파일이 사라진다.
 * 기본 포커스를 취소에 두어, 엔터를 잘못 눌러도 실행되지 않게 한다.
 */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "취소",
  destructive = false,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel, isPending]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-[400px] rounded-[12px] bg-white p-[22px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-[12px]">
          <span
            className={cn(
              "mt-[2px] flex size-[34px] shrink-0 items-center justify-center rounded-full",
              destructive ? "bg-[#fdecec] text-[#d33b3b]" : "bg-[#eef2fb] text-[#2b3f6c]",
            )}
          >
            <AlertTriangle size={17} />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-[16px] font-bold text-[#1f2330]">
              {title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="mt-[6px] text-[13.5px] leading-[1.55] text-[#6b7388] whitespace-pre-line"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="mt-[20px] flex justify-end gap-[8px]">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-[8px] border border-[#e2e5ec] px-[16px] py-[9px] text-[13.5px] font-semibold text-[#3a4055] transition-colors hover:bg-[#f7f8fb] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              "flex items-center gap-[6px] rounded-[8px] px-[16px] py-[9px] text-[13.5px] font-bold text-white transition-colors disabled:opacity-60",
              destructive ? "bg-[#d33b3b] hover:bg-[#b93030]" : "bg-[#1d2c4e] hover:bg-[#2b3f6c]",
            )}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
