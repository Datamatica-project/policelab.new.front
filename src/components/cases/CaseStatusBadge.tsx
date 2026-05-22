export type { CaseStatus } from "@/lib/case-data";

import type { CaseStatus } from "@/lib/case-data";

const STATUS_STYLES: Record<CaseStatus, string> = {
  검토중: "bg-[#1d2c4e] text-white",
  진행중: "bg-[#2b6cb0] text-white",
  사건종료: "bg-[#d33b3b] text-white",
};

export default function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={`inline-flex items-center px-[10px] py-[5px] rounded text-[11.5px] font-bold tracking-[0.01em] ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
