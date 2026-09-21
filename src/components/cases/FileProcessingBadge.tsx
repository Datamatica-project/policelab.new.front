"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeFileStatus, type FileStatusTone } from "@/lib/fileStatus";

const TONE_STYLES: Record<FileStatusTone, string> = {
  progress: "bg-[#eaf1fe] text-[#1d4ed8] border-[#c7d9fb]",
  danger: "bg-[#fdeaea] text-[#b9282b] border-[#f6cdcd]",
};

interface Props {
  status: string | null | undefined;
  /** 0~100. 영상 처리 중에만 값이 있다 */
  progress?: number | null;
  /** 배지 위에 마우스를 올렸을 때 보일 설명을 끌 때 사용 */
  hideTooltip?: boolean;
  className?: string;
}

/**
 * 처리 중·실패 상태를 알리는 배지.
 *
 * 정상 상태(업로드 완료 등)에서는 아무것도 그리지 않는다 — 대부분의 파일에 늘 붙어
 * 있는 "완료" 배지는 정보가 없고, 정작 눈에 띄어야 하는 처리 중·실패를 묻는다.
 */
export default function FileProcessingBadge({
  status,
  progress = null,
  hideTooltip = false,
  className,
}: Props) {
  const presentation = describeFileStatus(status, progress);
  if (!presentation) return null;

  const { label, description, tone } = presentation;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] px-[8px] py-[3px] rounded-[5px] border text-[11.5px] font-bold whitespace-nowrap",
        TONE_STYLES[tone],
        className,
      )}
      title={hideTooltip ? undefined : description}
    >
      {tone === "progress" ? (
        <Loader2 size={11} className="animate-spin shrink-0" />
      ) : (
        <AlertTriangle size={11} className="shrink-0" />
      )}
      {label}
      {presentation.progress !== null && ` ${presentation.progress}%`}
    </span>
  );
}
