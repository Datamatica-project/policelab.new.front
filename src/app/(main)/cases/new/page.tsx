"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CloudUpload,
  Archive,
  Eye,
  ClipboardList,
  Info,
  Server,
  Lock,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowLeftRight,
  Target,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import FileThumb from "@/components/cases/FileThumb";
import CompareScene from "@/components/cases/CompareScene";
import ManualEditModal, { type BBox } from "@/components/cases/ManualEditModal";
import Step3Complete from "@/components/cases/Step3Complete";

/* ─────────────────── types ─────────────────── */
interface UploadedFile {
  id: number;
  name: string;
  sizeMB: number;
  seed: number;
}

interface CaseFormData {
  caseName: string;
  officer: string;
  desc: string;
  policy: string;
  files: UploadedFile[];
}

/* ─────────────────── constants ─────────────── */
const POLICY_OPTIONS = [
  { value: "standard", label: "표준 보관" },
  { value: "internal", label: "내부 보관" },
  { value: "critical", label: "중요 보관" },
];

const TODAY = new Date().toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const MOSAIC_BOX_STYLE: React.CSSProperties = {
  position: "absolute",
  pointerEvents: "none",
  backgroundColor: "#a87555",
  backgroundImage: [
    "repeating-linear-gradient(0deg,rgba(0,0,0,0.20) 0 1px,transparent 1px)",
    "repeating-linear-gradient(90deg,rgba(0,0,0,0.20) 0 1px,transparent 1px)",
    "linear-gradient(135deg,#c4926e 0%,#a87555 35%,#6b4530 70%,#8a6048 100%)",
  ].join(","),
  backgroundSize: "8px 8px, 8px 8px, 100% 100%",
  borderRadius: 2,
};

/* ─────────────────── sub-components ────────── */

function PolicyInfo() {
  return (
    <div className="bg-[#f0f4fa] border border-[#d9e3f1] rounded-[8px] p-[14px] mt-3 flex flex-col gap-[9px] text-[13px]">
      {[
        {
          Icon: CloudUpload,
          strong: "표준 보관",
          desc: "외부 클라우드에 저장",
        },
        {
          Icon: Server,
          strong: "내부 보관",
          desc: "내부 서버에 안전하게 저장",
        },
        {
          Icon: Lock,
          strong: "중요 보관",
          desc: "이중 저장으로 데이터 보호 강화",
        },
      ].map(({ Icon, strong, desc }) => (
        <div key={strong} className="flex items-center gap-2 text-[#4a5168]">
          <Icon size={18} className="text-[#1d2c4e] shrink-0" />
          <span>
            <strong className="text-[#1d2c4e] font-bold mr-1">{strong}</strong>
            {desc}
          </span>
        </div>
      ))}
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: "업로드 및 설정" },
    { n: 2 as const, label: "처리 및 결과" },
    { n: 3 as const, label: "완료" },
  ];
  return (
    <div className="flex items-center gap-0 flex-1">
      {steps.map((s, i) => {
        const isDone = s.n < step;
        const isActive = s.n === step;
        return (
          <div key={s.n} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-[10px] text-[15px]",
                isActive
                  ? "text-[#1f2330] font-bold"
                  : isDone
                    ? "text-[#1f2330] font-medium"
                    : "text-[#9aa1b3] font-medium",
              )}
            >
              <span
                className={cn(
                  "w-[30px] h-[30px] rounded-full flex items-center justify-center text-[14px] font-bold shrink-0",
                  isActive || isDone
                    ? "bg-[#1d2c4e] text-white"
                    : "bg-[#e2e5ec] text-[#9aa1b3]",
                )}
              >
                {isDone ? <Check size={16} /> : s.n}
              </span>
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="h-[2px] bg-[#e2e5ec] w-[100px] mx-4" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────── Step 2 ─────────────────── */

function Step2Main({
  data,
  selectedFile,
  manualBoxes,
  onManualEdit,
}: {
  data: CaseFormData;
  selectedFile: UploadedFile | null;
  manualBoxes: Record<number, BBox[]>;
  onManualEdit: (f: UploadedFile) => void;
}) {
  const file = selectedFile ?? data.files[0] ?? null;
  const fileBoxes = file ? (manualBoxes[file.id] ?? []) : [];
  const autoCount = file ? 2 + (file.seed % 4) : 0;
  const detectCount = autoCount + fileBoxes.length;
  const seconds = file ? 5 + (file.seed % 10) : 0;
  const timeStr = `00:00:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Compare card */}
      <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
        <div className="flex justify-between items-center gap-[18px] mb-[18px]">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em]">
              이미지 비교
            </h3>
            <p className="text-[13px] text-[#6b7388] mt-1">
              자동 모자이크 처리 결과를 확인하고 필요한 경우 수동 수정을
              진행하세요.
            </p>
          </div>
          <div className="flex gap-2 items-center shrink-0">
            {file && (
              <button
                onClick={() => onManualEdit(file)}
                className="px-4 py-[8px] border border-[#1d2c4e] text-[#1d2c4e] rounded-[6px] text-[13px] font-semibold bg-white hover:bg-[#eef1f8] transition-colors"
              >
                수동 수정
              </button>
            )}
          </div>
        </div>

        {/* Before / After grid */}
        <div className="grid grid-cols-2 relative overflow-hidden">
          {/* Before pane */}
          <div className="px-4 pt-1">
            <p className="text-[14px] font-bold text-[#1f2330] mb-1">
              모자이크 작업 전 (원본)
            </p>
            <p className="text-[12.5px] text-[#6b7388] mb-3">
              {file?.name ?? "—"}
            </p>
            <div className="w-full aspect-[4/3] bg-[#f5f6fa] rounded-[6px] overflow-hidden relative">
              <CompareScene mosaic={false} variant={file?.seed ?? 0} />
            </div>
          </div>

          {/* After pane */}
          <div className="px-4 pt-1 border-l border-[#e6e8ef]">
            <p className="text-[14px] font-bold text-[#1f2330] mb-1">
              모자이크 작업 후 (자동 처리)
            </p>
            <p className="text-[12.5px] text-[#6b7388] mb-3">
              {file?.name ?? "—"}
            </p>
            <div className="w-full aspect-[4/3] bg-[#f5f6fa] rounded-[6px] overflow-hidden relative">
              <div className="w-full h-full relative">
                <CompareScene mosaic variant={file?.seed ?? 0} />
                {fileBoxes.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      ...MOSAIC_BOX_STYLE,
                      left: `${b.x}%`,
                      top: `${b.y}%`,
                      width: `${b.w}%`,
                      height: `${b.h}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Divider icon */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-white border border-[#d9deea] rounded-full flex items-center justify-center shadow-sm z-10 text-[#6b7388]">
            <ArrowLeftRight size={12} />
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 bg-[#f7f8fb] border border-[#eef0f5] rounded-[8px] mt-[18px] overflow-hidden">
          {[
            {
              icon: <Target size={13} />,
              label: "탐지된 영역 수",
              value: `${detectCount}개`,
            },
            { icon: <Clock size={13} />, label: "처리 시간", value: timeStr },
            {
              icon: <Clock size={13} />,
              label: "처리 상태",
              value: null,
              badge: "자동 처리 완료",
            },
          ].map(({ icon, label, value, badge }, i) => (
            <div
              key={label}
              className={cn(
                "py-[18px] px-5 text-center",
                i < 2 && "border-r border-[#eef0f5]",
              )}
            >
              <div className="flex items-center justify-center gap-[6px] text-[12.5px] text-[#6b7388] font-medium mb-2">
                {icon}
                {label}
              </div>
              {badge ? (
                <span className="inline-block bg-[#e3f4ea] text-[#1f7a47] font-bold text-[12.5px] px-3 py-[5px] rounded-[6px]">
                  {badge}
                </span>
              ) : (
                <div className="text-[22px] font-extrabold text-[#1f2330] tracking-[-0.01em]">
                  {value}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-[#f0f4fa] border border-[#d9e3f1] rounded-[8px] px-4 py-[14px] flex items-center gap-[10px] text-[13px] text-[#3a4055]">
        <Info size={14} className="text-[#1d2c4e] shrink-0" />
        <span>
          자동 모자이크 결과를 확인하고 누락된 영역이 있으면 우측 상단의 "수동
          수정" 버튼을 클릭하여 수동 모자이크를 진행해주세요.
        </span>
      </div>
    </div>
  );
}

function Step2Side({
  data,
  selectedFile,
  manualBoxes,
  onSelectFile,
}: {
  data: CaseFormData;
  selectedFile: UploadedFile | null;
  manualBoxes: Record<number, BBox[]>;
  onSelectFile: (f: UploadedFile) => void;
}) {
  const policyLabel =
    POLICY_OPTIONS.find((o) => o.value === data.policy)?.label ?? "";
  const totalSize = data.files.reduce((s, f) => s + f.sizeMB, 0);
  const [page, setPage] = useState(1);
  const PER = 6;
  const totalPages = Math.max(1, Math.ceil(data.files.length / PER));
  const pageFiles = data.files.slice((page - 1) * PER, page * PER);

  return (
    <div className="flex flex-col gap-[22px]">
      {/* Case info */}
      <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
        <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em] mb-[4px] flex items-center gap-2">
          <Archive size={18} className="text-[#1d2c4e]" />
          사건 정보
        </h3>
        <div className="flex flex-col">
          {[
            { k: "사건명", v: data.caseName },
            { k: "사건 담당자", v: `${data.officer} 순경` },
            { k: "생성 날짜", v: TODAY },
            { k: "보관 정책", v: policyLabel },
            { k: "파일 개수", v: `${data.files.length}개` },
            { k: "전체 용량", v: `${totalSize.toFixed(1)}MB` },
            {
              k: "처리 상태",
              v: null,
              badge: "자동 처리 완료",
            },
            { k: "사건 설명", v: data.desc },
          ].map(({ k, v, badge }) => (
            <div
              key={k}
              className="grid text-[13.5px] py-[10px] border-b border-[#f0f1f5] last:border-b-0"
              style={{ gridTemplateColumns: "100px 1fr" }}
            >
              <span className="text-[#6b7388] font-medium">{k}</span>
              {badge ? (
                <span className="inline-block bg-[#e3f4ea] text-[#1f7a47] font-bold text-[12px] px-2 py-[3px] rounded-[5px] w-fit">
                  {badge}
                </span>
              ) : (
                <span className="text-[#1f2330] font-bold break-words">
                  {v}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* File list */}
      <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
        <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em] mb-[18px] flex items-center gap-2">
          파일 목록
          <span className="bg-[#1d2c4e] text-white text-[12px] font-bold px-2 py-[1px] rounded-full">
            {data.files.length}
          </span>
        </h3>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["파일명", "크기", "처리 상태"].map((h) => (
                <th
                  key={h}
                  className="text-left text-[12.5px] font-semibold text-[#6b7388] pb-2 border-b border-[#ebedf2]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageFiles.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="text-center text-[#9aa1b3] py-6 text-[13px]"
                >
                  업로드된 파일이 없습니다
                </td>
              </tr>
            )}
            {pageFiles.map((f) => {
              const isSelected = selectedFile?.id === f.id;
              return (
                <tr
                  key={f.id}
                  onClick={() => onSelectFile(f)}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isSelected
                      ? "[&>td]:bg-[#eef1f8]"
                      : "hover:[&>td]:bg-[#f7f8fb]",
                  )}
                >
                  <td className="py-[14px] border-b border-[#f0f1f5] text-[13px] text-[#3a4055]">
                    <span className="inline-block w-[38px] h-[30px] rounded bg-[#f0f1f5] overflow-hidden align-middle mr-[10px]">
                      <CompareScene mosaic variant={f.seed} />
                    </span>
                    <span
                      className={cn(
                        "inline-block align-middle font-semibold text-[12.5px] max-w-[100px] truncate",
                        isSelected ? "text-[#1d2c4e]" : "text-[#1f2330]",
                      )}
                    >
                      {f.name}
                    </span>
                  </td>
                  <td className="py-[14px] border-b border-[#f0f1f5] text-[13px] text-[#3a4055] whitespace-nowrap">
                    {f.sizeMB}MB
                  </td>
                  <td className="py-[14px] border-b border-[#f0f1f5]">
                    <span className="inline-block bg-[#e3f4ea] text-[#1f7a47] font-bold text-[11.5px] px-2 py-[3px] rounded-[5px]">
                      완료
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Mini pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-[6px] pt-[14px]">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-[30px] h-[30px] border border-[#e2e5ec] rounded-[6px] bg-white text-[#6b7388] flex items-center justify-center hover:bg-[#f7f8fb] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={cn(
                  "w-[30px] h-[30px] border rounded-[6px] text-[12.5px] font-medium flex items-center justify-center",
                  n === page
                    ? "bg-[#1d2c4e] border-[#1d2c4e] text-white"
                    : "bg-white border-[#e2e5ec] text-[#3a4055] hover:bg-[#f7f8fb]",
                )}
              >
                {n}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-[30px] h-[30px] border border-[#e2e5ec] rounded-[6px] bg-white text-[#6b7388] flex items-center justify-center hover:bg-[#f7f8fb] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Page ───────────────────── */
export default function NewCasePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 form state
  const [caseName, setCaseName] = useState("2026-0001 강력 사건");
  const [officer, setOfficer] = useState("홍길동");
  const [desc, setDesc] = useState("강력 사건 파일입니다.");
  const [policy, setPolicy] = useState("standard");
  const [policyOpen, setPolicyOpen] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([
    { id: 1, name: "IMG_20240101_001.jpg", sizeMB: 2.3, seed: 0 },
    { id: 2, name: "IMG_20240101_002.png", sizeMB: 1.9, seed: 1 },
  ]);
  const [dragOver, setDragOver] = useState(false);

  // Step 2 state
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [manualBoxes, setManualBoxes] = useState<Record<number, BBox[]>>({});
  const [editingFile, setEditingFile] = useState<UploadedFile | null>(null);

  const totalSize = useMemo(
    () => files.reduce((s, f) => s + f.sizeMB, 0),
    [files],
  );
  const previewFile = files[0];
  const policyLabel =
    POLICY_OPTIONS.find((o) => o.value === policy)?.label ?? "";
  const selectedFile = useMemo(
    () =>
      (selectedFileId ? files.find((f) => f.id === selectedFileId) : null) ??
      files[0] ??
      null,
    [files, selectedFileId],
  );

  const formData: CaseFormData = { caseName, officer, desc, policy, files };

  const addFiles = (rawFiles: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...rawFiles.map((f, i) => ({
        id: Date.now() + i,
        name: f.name,
        sizeMB: +(f.size / (1024 * 1024)).toFixed(1) || 1.0,
        seed: prev.length + i,
      })),
    ]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles([...e.dataTransfer.files]);
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles([...e.target.files]);
    e.target.value = "";
  };

  const goToStep2 = () => {
    setSelectedFileId(files[0]?.id ?? null);
    setStep(2);
  };

  const handleFinish = () => router.push("/cases");

  return (
    <div className="pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[14px] text-[#6b7388] mb-[10px]">
        <button
          onClick={() => router.push("/dashboard")}
          className="hover:text-[#1d2c4e] hover:underline transition-colors"
        >
          대시보드
        </button>
        {step >= 2 && (
          <>
            <span className="text-[#c5cbd9]">&gt;</span>
            <button
              onClick={() => setStep(1)}
              className={
                step > 1
                  ? "hover:text-[#1d2c4e] hover:underline transition-colors"
                  : "text-[#1f2330] font-medium"
              }
            >
              새 사건 생성
            </button>
          </>
        )}
        {step >= 2 && step < 3 && (
          <>
            <span className="text-[#c5cbd9]">&gt;</span>
            <span className="text-[#1f2330] font-medium">처리 및 결과</span>
          </>
        )}
        {step === 3 && (
          <>
            <span className="text-[#c5cbd9]">&gt;</span>
            <button
              onClick={() => setStep(2)}
              className="hover:text-[#1d2c4e] hover:underline transition-colors"
            >
              처리 및 결과
            </button>
            <span className="text-[#c5cbd9]">&gt;</span>
            <span className="text-[#1f2330] font-medium">완료</span>
          </>
        )}
        {step === 1 && (
          <>
            <span className="text-[#c5cbd9]">&gt;</span>
            <span className="text-[#1f2330] font-medium">새 사건 생성</span>
          </>
        )}
      </nav>

      <h1 className="text-[32px] font-extrabold text-[#1f2330] tracking-[-0.02em] mb-[28px]">
        {step === 1 ? "새 사건 생성" : step === 2 ? "처리 및 결과" : "완료"}
      </h1>

      {/* Step indicator + action buttons */}
      <div className="flex items-center gap-6 mb-[28px]">
        <StepIndicator step={step} />
        <div className="flex items-center gap-[10px] shrink-0">
          {step === 1 && (
            <>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-[11px] bg-white border border-[#d9deea] rounded-[8px] text-[14px] font-semibold text-[#3a4055] hover:bg-[#f7f8fb] hover:border-[#c5cbd9] transition-colors"
              >
                취소
              </button>
              <button
                onClick={goToStep2}
                className="px-6 py-[11px] bg-[#1d2c4e] text-white rounded-[8px] text-[14px] font-bold hover:bg-[#2b3f6c] transition-colors"
              >
                사건 생성
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="px-6 py-[11px] bg-white border border-[#d9deea] rounded-[8px] text-[14px] font-semibold text-[#3a4055] hover:bg-[#f7f8fb] hover:border-[#c5cbd9] transition-colors"
              >
                이전
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-[11px] bg-[#1d2c4e] text-white rounded-[8px] text-[14px] font-bold hover:bg-[#2b3f6c] transition-colors"
              >
                검수 완료 및 저장
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <button
                onClick={() => setStep(2)}
                className="px-6 py-[11px] bg-white border border-[#d9deea] rounded-[8px] text-[14px] font-semibold text-[#3a4055] hover:bg-[#f7f8fb] hover:border-[#c5cbd9] transition-colors"
              >
                이전 단계로 돌아가기
              </button>
              <button
                onClick={handleFinish}
                className="px-6 py-[11px] bg-[#1d2c4e] text-white rounded-[8px] text-[14px] font-bold hover:bg-[#2b3f6c] transition-colors"
              >
                사건 목록으로
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div
          className="grid gap-[22px]"
          style={{ gridTemplateColumns: "1.45fr 1fr", alignItems: "start" }}
        >
          {/* LEFT */}
          <div className="flex flex-col gap-[22px]">
            {/* 사건 정보 */}
            <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
              <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em] mb-[18px] flex items-center gap-2">
                <Archive size={18} className="text-[#1d2c4e]" />
                사건 정보
              </h3>
              <div className="grid grid-cols-2 gap-x-[18px] gap-y-[16px]">
                <div className="flex flex-col gap-[6px]">
                  <label className="text-[13px] font-semibold text-[#3a4055]">
                    사건명 <span className="text-[#d33b3b]">*</span>
                  </label>
                  <input
                    className="w-full px-[14px] py-[11px] border border-[#d9deea] rounded-[8px] text-[13.5px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] transition-colors"
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    placeholder="2026-0001 강력 사건"
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <label className="text-[13px] font-semibold text-[#3a4055]">
                    사건 담당자 <span className="text-[#d33b3b]">*</span>
                  </label>
                  <input
                    className="w-full px-[14px] py-[11px] border border-[#d9deea] rounded-[8px] text-[13.5px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] transition-colors"
                    value={officer}
                    onChange={(e) => setOfficer(e.target.value)}
                    placeholder="홍길동"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-[6px]">
                  <label className="text-[13px] font-semibold text-[#3a4055]">
                    사건설명
                  </label>
                  <div className="relative">
                    <textarea
                      className="w-full px-[14px] py-[11px] border border-[#d9deea] rounded-[8px] text-[13.5px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] resize-none min-h-[132px] leading-[1.5] transition-colors"
                      value={desc}
                      maxLength={300}
                      onChange={(e) => setDesc(e.target.value)}
                      placeholder="강력 사건 파일입니다."
                    />
                    <span className="absolute right-3 bottom-[10px] text-[12px] text-[#9aa1b3]">
                      {desc.length} / 300
                    </span>
                  </div>
                </div>
                <div className="col-span-2 flex flex-col gap-[6px]">
                  <label className="text-[13px] font-semibold text-[#3a4055] flex items-center gap-[6px]">
                    보관 정책 <Info size={13} className="text-[#9aa1b3]" />
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPolicyOpen((o) => !o)}
                      className="w-full flex items-center justify-between px-[14px] py-[11px] border border-[#d9deea] rounded-[8px] text-[13.5px] text-[#1f2330] bg-white hover:border-[#c5cbd9] transition-colors"
                    >
                      <span>{policyLabel}</span>
                      <ChevronDown
                        size={14}
                        className={cn(
                          "text-[#6b7388] transition-transform",
                          policyOpen && "rotate-180",
                        )}
                      />
                    </button>
                    {policyOpen && (
                      <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[#e2e5ec] rounded-[8px] shadow-[0_8px_24px_rgba(15,22,40,0.10)] p-[6px] z-40">
                        {POLICY_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => {
                              setPolicy(o.value);
                              setPolicyOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-[12px] py-[9px] rounded-[5px] text-[13.5px] text-[#3a4055] hover:bg-[#f3f4f8] transition-colors",
                              o.value === policy &&
                                "bg-[#eef1f8] text-[#1d2c4e] font-semibold",
                            )}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <PolicyInfo />
                </div>
              </div>
            </div>

            {/* 파일 업로드 */}
            <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
              <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em] mb-[18px] flex items-center gap-2">
                <CloudUpload size={18} className="text-[#1d2c4e]" />
                파일 업로드
              </h3>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept="image/*,video/*"
                onChange={handlePick}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-[10px] p-[42px] text-center cursor-pointer transition-colors",
                  dragOver
                    ? "border-[#1d2c4e] bg-[#f0f4fa]"
                    : "border-[#c5cbd9] bg-[#fafbfd] hover:border-[#1d2c4e] hover:bg-[#f0f4fa]",
                )}
              >
                <div className="w-12 h-12 rounded-full bg-white border border-[#e2e5ec] flex items-center justify-center text-[#6b7388] mx-auto mb-[14px]">
                  <CloudUpload size={20} />
                </div>
                <p className="text-[14px] font-medium text-[#3a4055] mb-[6px]">
                  파일을 드래그하거나 클릭하여 업로드
                </p>
                <p className="text-[12.5px] text-[#9aa1b3]">
                  JPG, PNG 지원 (최대 2GB)
                </p>
              </div>

              {files.length > 0 && (
                <div className="mt-5">
                  <div className="flex justify-between items-center mb-3 text-[13.5px] text-[#3a4055]">
                    <span>선택된 파일 ({files.length})</span>
                    <button
                      onClick={() => setFiles([])}
                      className="text-[#d33b3b] font-semibold hover:underline"
                    >
                      모두 제거
                    </button>
                  </div>
                  <div className="flex flex-col gap-[10px]">
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 px-[14px] py-3 bg-[#eff5ff] border border-[#d9e3f1] rounded-[8px]"
                      >
                        <div className="w-8 h-8 bg-white border border-[#d9e3f1] rounded flex items-center justify-center text-[9px] font-bold text-[#1d2c4e] shrink-0">
                          {f.name.split(".").pop()?.toUpperCase().slice(0, 3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-bold text-[#1d2c4e] truncate">
                            {f.name}
                          </p>
                          <p className="text-[12px] text-[#6b7388] mt-0.5">
                            {f.sizeMB}MB
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setFiles((prev) =>
                              prev.filter((x) => x.id !== f.id),
                            )
                          }
                          className="w-[26px] h-[26px] flex items-center justify-center text-[#6b7388] rounded hover:bg-white hover:text-[#d33b3b] transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-[22px]">
            {/* 미리보기 */}
            <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
              <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em] mb-[18px] flex items-center gap-2">
                <Eye size={18} className="text-[#1d2c4e]" />
                미리보기
              </h3>
              <div className="w-full aspect-[16/11] rounded-[8px] overflow-hidden mb-3 bg-[#f0f1f5]">
                {previewFile ? (
                  <FileThumb seed={previewFile.seed} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#9aa1b3] text-[13px]">
                    업로드된 파일이 없습니다
                  </div>
                )}
              </div>
              <div className="flex justify-between items-baseline text-[14px]">
                <span className="font-bold text-[#1f2330] truncate max-w-[70%]">
                  {previewFile?.name ?? "—"}
                </span>
                <span className="text-[12.5px] text-[#8a93a8] shrink-0 ml-2">
                  {previewFile ? `${previewFile.sizeMB}MB` : ""}
                </span>
              </div>
            </div>

            {/* 사건 정보 요약 */}
            <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
              <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em] mb-[4px] flex items-center gap-2">
                <ClipboardList size={18} className="text-[#1d2c4e]" />
                사건 정보 요약
              </h3>
              <div className="flex flex-col">
                {[
                  { k: "사건명", v: caseName || "—" },
                  { k: "생성 날짜", v: TODAY },
                  { k: "사건 담당자", v: officer ? `${officer} 순경` : "—" },
                  { k: "보관 정책", v: policyLabel },
                  { k: "파일 개수", v: `${files.length}개` },
                  { k: "총 용량", v: `${totalSize.toFixed(1)}MB` },
                  { k: "사건 설명", v: desc || "—" },
                ].map(({ k, v }) => (
                  <div
                    key={k}
                    className="grid text-[13.5px] py-[10px] border-b border-[#f0f1f5] last:border-b-0"
                    style={{ gridTemplateColumns: "110px 1fr" }}
                  >
                    <span className="text-[#6b7388] font-medium">{k}</span>
                    <span className="text-[#1f2330] font-bold break-words">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-[18px] bg-[#f0f4fa] border border-[#d9e3f1] rounded-[8px] p-[14px] flex items-center gap-[10px] text-[13px] text-[#3a4055]">
                <Info size={14} className="text-[#1d2c4e] shrink-0" />
                <span>
                  사건 생성 버튼을 클릭하면 파일이 업로드되고 비식별 처리가
                  시작됩니다.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div
          className="grid gap-[22px]"
          style={{ gridTemplateColumns: "1.45fr 1fr", alignItems: "start" }}
        >
          <Step2Main
            data={formData}
            selectedFile={selectedFile}
            manualBoxes={manualBoxes}
            onManualEdit={(f) => setEditingFile(f)}
          />
          <Step2Side
            data={formData}
            selectedFile={selectedFile}
            manualBoxes={manualBoxes}
            onSelectFile={(f) => setSelectedFileId(f.id)}
          />
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <Step3Complete
          caseName={caseName}
          officer={officer}
          policy={policy}
          files={files}
          manualBoxes={manualBoxes}
        />
      )}

      {/* Manual edit modal */}
      {editingFile && (
        <ManualEditModal
          file={editingFile}
          initialBoxes={manualBoxes[editingFile.id] ?? []}
          onClose={() => setEditingFile(null)}
          onApply={(boxes) => {
            setManualBoxes((prev) => ({ ...prev, [editingFile.id]: boxes }));
            setEditingFile(null);
          }}
        />
      )}
    </div>
  );
}
