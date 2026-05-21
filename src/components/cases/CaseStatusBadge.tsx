export type CaseStatus = "검토중" | "진행중" | "사건종료" | "사건완료";

const statusStyles: Record<CaseStatus, string> = {
  검토중: "bg-[#374151] text-white",
  진행중: "bg-[#2563EB] text-white",
  사건종료: "bg-[#EF4444] text-white",
  사건완료: "bg-[#DC2626] text-white",
};

export default function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-1 rounded text-xs font-medium ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
