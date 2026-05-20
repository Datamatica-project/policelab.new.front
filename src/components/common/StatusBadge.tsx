type Status = "처리 완료" | "처리중" | "대기중" | "오류 발생";

const statusStyles: Record<Status, string> = {
  "처리 완료": "bg-[#16A34A] text-white",
  처리중: "bg-[#2563EB] text-white",
  대기중: "bg-[#4b5563] text-white",
  "오류 발생": "bg-[#DC2626] text-white",
};

interface StatusBadgeProps {
  status: Status;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-1 rounded text-xs font-medium ${statusStyles[status]} w-[72px]`}
    >
      {status}
    </span>
  );
}
