"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CloudUpload,
  Archive,
  ClipboardList,
  Info,
  Server,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowLeftRight,
  Target,
  Clock,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ApiClient, PostCase, PostFiles, PostReplace, GetUserList, CheckCaseNumberExists, type FileUploadResult, type Detection, type ReplaceFileResult, type UserResponse } from "@/lib/api";
import { uploadFilesDirect, type DirectUploadTask } from "@/lib/directUpload";
import {
  saveCaseSession,
  loadCaseSession,
  clearCaseSession,
  saveOriginalFiles,
  loadOriginalFiles,
  clearOriginalFiles,
  loadMosaicFile,
  clearMosaicFiles,
} from "@/lib/caseSession";
import CompareScene from "@/components/cases/CompareScene";
import ManualEditModal, { type BBox } from "@/components/cases/ManualEditModal";
import Step3Complete from "@/components/cases/Step3Complete";

/* ─────────────────── types ─────────────────── */
interface UploadedFile {
  id: number;
  file: File | null; // null while loading from IndexedDB after page refresh
  name: string;
  sizeMB: number;
  seed: number;
  category: string;
  tags: string[];
  policy: string;
  description: string;
  uploadResult?: FileUploadResult;
}

interface CaseFormData {
  caseNumber: string;
  caseName: string;
  assignedTo: string;
  assignedToName: string;
  desc: string;
  files: UploadedFile[];
}

/* ─────────────────── constants ─────────────── */
const ROLE_LABEL: Record<string, string> = {
  ADMIN: "관리자", USER: "사용자", INSPECTOR: "감사관", WORKER: "담당자",
};

const CATEGORY_OPTIONS = [
  { value: "evidence", label: "증거 자료" },
  { value: "photo", label: "현장 사진" },
  { value: "other", label: "기타" },
];

const POLICY_OPTIONS = [
  { value: "standard", label: "표준 보관", desc: "외부 클라우드(S3)에 저장", Icon: CloudUpload },
  { value: "internal", label: "내부 보관", desc: "내부 서버(NAS)에 안전하게 저장", Icon: Server },
];

const CLASS_LABELS: Record<string, string> = {
  face: "얼굴",
  license_plate: "번호판",
  plate: "번호판",
};

function groupDetections(detections: Detection[]) {
  const map = new Map<string, { count: number; maxConf: number }>();
  for (const det of detections) {
    const prev = map.get(det.class_name);
    if (prev) {
      prev.count += 1;
      prev.maxConf = Math.max(prev.maxConf, det.confidence);
    } else {
      map.set(det.class_name, { count: 1, maxConf: det.confidence });
    }
  }
  return Array.from(map.entries()).map(([key, { count, maxConf }]) => ({
    label: CLASS_LABELS[key] ?? key,
    count,
    maxConf,
  }));
}

function useCountAnimation(target: number, duration = 550): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

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

const DETECT_BOX_STYLE: React.CSSProperties = {
  position: "absolute",
  pointerEvents: "none",
  backgroundColor: "rgba(59,130,246,0.08)",
  border: "2px solid #3b82f6",
  borderRadius: 2,
};

/* ─────────────────── StepIndicator ─────────── */
function StepIndicator({ step }: { step: 1 | 2 | 3 | 4 }) {
  const steps = [
    { n: 1 as const, label: "사건 정보" },
    { n: 2 as const, label: "파일 업로드" },
    { n: 3 as const, label: "처리 및 결과" },
    { n: 4 as const, label: "완료" },
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
              <div className="h-[2px] bg-[#e2e5ec] w-[80px] mx-4" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────── Image Compare Slider ───── */
function ImageCompareSlider({
  originalUrl,
  mosaicUrl,
  panelStyle,
  imgNaturalSize,
  onNaturalSize,
  autoDetections,
  reviewedBoxes,
  seed,
}: {
  originalUrl: string | null;
  mosaicUrl: string | null;
  panelStyle: React.CSSProperties;
  imgNaturalSize: { w: number; h: number } | null;
  onNaturalSize: (size: { w: number; h: number }) => void;
  autoDetections: Detection[];
  reviewedBoxes: BBox[];
  seed: number;
}) {
  const [sliderPct, setSliderPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    setSliderPct(pct);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-[6px] bg-[#f5f6fa] select-none"
      style={{ ...panelStyle, cursor: "col-resize" }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setSliderPct(Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100)));
      }}
    >
      {/* 모자이크 후 이미지 (풀 사이즈, 아래 레이어) */}
      {mosaicUrl ? (
        <img
          src={mosaicUrl}
          alt="모자이크 후"
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ objectFit: "fill" }}
          onLoad={(e) => {
            const img = e.currentTarget;
            onNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
        />
      ) : (
        <div className="absolute inset-0 pointer-events-none">
          <CompareScene mosaic variant={seed} />
        </div>
      )}

      {/* reviewedBoxes가 없을 때만 autoDetections 오버레이 표시 */}
      {imgNaturalSize && reviewedBoxes.length === 0 &&
        autoDetections.map((det, i) => {
          const [x1, y1, x2, y2] = det.expanded_box_xyxy;
          return (
            <div
              key={`auto-${i}`}
              style={{
                ...DETECT_BOX_STYLE,
                left: `${(x1 / imgNaturalSize.w) * 100}%`,
                top: `${(y1 / imgNaturalSize.h) * 100}%`,
                width: `${((x2 - x1) / imgNaturalSize.w) * 100}%`,
                height: `${((y2 - y1) / imgNaturalSize.h) * 100}%`,
              }}
            />
          );
        })}
      {reviewedBoxes.map((b) => (
        <div
          key={b.id}
          style={{
            ...DETECT_BOX_STYLE,
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.w}%`,
            height: `${b.h}%`,
          }}
        />
      ))}

      {/* 원본 이미지 (슬라이더 왼쪽만 clip, 위 레이어) */}
      {(originalUrl || mosaicUrl) && (
        <img
          src={originalUrl ?? mosaicUrl!}
          alt="원본"
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            objectFit: "fill",
            clipPath: `inset(0 ${100 - sliderPct}% 0 0)`,
          }}
        />
      )}

      {/* 슬라이더 바 + 핸들 */}
      <div
        className="absolute top-0 bottom-0 z-10"
        style={{ left: `${sliderPct}%`, transform: "translateX(-50%)", pointerEvents: "none" }}
      >
        <div className="w-[2px] h-full bg-white" style={{ boxShadow: "0 0 6px rgba(0,0,0,0.35)" }} />
        <button
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.22)] hover:scale-110 transition-transform"
          style={{ cursor: "ew-resize", pointerEvents: "auto" }}
          onMouseDown={(e) => {
            isDragging.current = true;
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <ArrowLeftRight size={13} className="text-[#1d2c4e]" />
        </button>
      </div>

      {/* 코너 레이블 */}
      <span className="absolute top-2.5 left-3 z-10 pointer-events-none bg-black/50 text-white text-[11px] font-semibold px-2 py-[3px] rounded-[4px]">
        원본
      </span>
      <span className="absolute top-2.5 right-3 z-10 pointer-events-none bg-black/50 text-white text-[11px] font-semibold px-2 py-[3px] rounded-[4px]">
        모자이크 후
      </span>
    </div>
  );
}

/* ─────────────────── Step 3 Main ────────────── */
function Step3Main({
  data,
  selectedFile,
  reviewedBoxes,
  caseId,
  onManualEdit,
  onInitReviewed,
}: {
  data: CaseFormData;
  selectedFile: UploadedFile | null;
  reviewedBoxes: Record<number, BBox[]>;
  caseId: string;
  onManualEdit: (f: UploadedFile) => void;
  onInitReviewed: (fileId: number, boxes: BBox[]) => void;
}) {
  const file = selectedFile ?? data.files[0] ?? null;
  const uploadResult = file?.uploadResult;
  const fileBoxes = useMemo(() => file ? (reviewedBoxes[file.id] ?? []) : [], [file?.id, reviewedBoxes]);
  const detectCount = fileBoxes.length > 0
    ? fileBoxes.length
    : (uploadResult?.detectionCount ?? (file ? 2 + (file.seed % 4) : 0));
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [mosaicDisplayUrl, setMosaicDisplayUrl] = useState<string | null>(null);
  const [mosaicSettled, setMosaicSettled] = useState(false);
  const [sizeSettled, setSizeSettled] = useState(false);

  // 파일 전환 시 준비 플래그 리셋 (imgNaturalSize는 유지 → 이전 비율 유지로 레이아웃 점프 방지)
  useEffect(() => {
    setMosaicSettled(false);
    setSizeSettled(false);
  }, [file?.id]);

  // 원본 파일 없을 때(새로고침 후) → naturalSize 대기 스킵
  useEffect(() => {
    if (originalUrl === null) setSizeSettled(true);
  }, [originalUrl]);

  // naturalSize 확보 후 reviewedBoxes 미초기화 파일 자동 초기화
  useEffect(() => {
    if (!file?.id || !imgNaturalSize) return;
    if (reviewedBoxes[file.id] !== undefined) return;
    const detections = uploadResult?.detections ?? [];
    const autoBBoxes: BBox[] = detections.map((d, i) => {
      const [x1, y1, x2, y2] = d.box_xyxy;
      return {
        id: -(i + 1),
        x: (x1 / imgNaturalSize.w) * 100,
        y: (y1 / imgNaturalSize.h) * 100,
        w: ((x2 - x1) / imgNaturalSize.w) * 100,
        h: ((y2 - y1) / imgNaturalSize.h) * 100,
        pxX: x1, pxY: y1, pxW: x2 - x1, pxH: y2 - y1,
        source: "auto" as const,
      };
    });
    onInitReviewed(file.id, autoBBoxes);
  // reviewedBoxes를 dep에서 제외 — 초기화 여부는 첫 naturalSize 확보 시점에만 판단
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgNaturalSize, file?.id]);

  useEffect(() => {
    if (!file?.file) {
      setOriginalUrl(null);
      return;
    }
    const url = URL.createObjectURL(file.file);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file?.id, file?.file]);

  // 수동 모자이크 IDB 우선, 없으면 storageUrl
  useEffect(() => {
    const fileId = uploadResult?.fileId;
    const fallback = uploadResult?.storageUrl ?? null;
    if (!fileId || !caseId) {
      setMosaicDisplayUrl(fallback);
      setMosaicSettled(true);
      return;
    }
    let objUrl: string | null = null;
    loadMosaicFile(caseId, fileId).then((blob) => {
      if (blob) {
        objUrl = URL.createObjectURL(blob);
        setMosaicDisplayUrl(objUrl);
      } else {
        setMosaicDisplayUrl(fallback);
      }
      setMosaicSettled(true);
    });
    return () => { if (objUrl) URL.revokeObjectURL(objUrl); };
  // fileBoxes를 dep에 포함 → 수동 모자이크 적용 후 reviewedBoxes 변경 시 재조회
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id, caseId, fileBoxes]);

  const displayName = uploadResult?.originalFileName ?? file?.name ?? "—";

  const detectionList = uploadResult?.detections ?? [];
  const avgConfidence = detectionList.length > 0
    ? detectionList.reduce((s, d) => s + d.confidence, 0) / detectionList.length
    : null;

  const seedVal = file?.seed ?? 0;
  const rawSeconds = 5 + (seedVal % 10);
  const timeStr = `00:00:${String(rawSeconds).padStart(2, "0")}`;

  const animatedCount = useCountAnimation(detectCount);
  const animatedConfPct = useCountAnimation(avgConfidence !== null ? Math.round(avgConfidence * 100) : 0);
  const animatedSeconds = useCountAnimation(rawSeconds);
  const panelStyle: React.CSSProperties = {
    aspectRatio: imgNaturalSize ? `${imgNaturalSize.w} / ${imgNaturalSize.h}` : "4/3",
  };
  const sliderReady = mosaicSettled && sizeSettled;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
        <div className="flex justify-between items-center gap-[18px] mb-[18px]">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em]">
              이미지 비교
            </h3>
            <p className="text-[12.5px] text-[#6b7388] mt-[3px] truncate">{displayName}</p>
            <p className="text-[11.5px] text-[#9aa1b3] mt-[2px]">
              가운데 바를 좌우로 드래그해 원본/모자이크를 비교하세요
              {!originalUrl && uploadResult?.storageUrl && (
                <span className="ml-1.5 text-[#f0a500]">원본 파일 없음 — 새로고침 시 원본 표시 불가</span>
              )}
            </p>
          </div>
          {file && (
            <button
              onClick={() => onManualEdit(file)}
              className="px-4 py-[8px] border border-[#1d2c4e] text-[#1d2c4e] rounded-[6px] text-[13px] font-semibold bg-white hover:bg-[#eef1f8] transition-colors shrink-0"
            >
              수동 수정
            </button>
          )}
        </div>

        <div className="relative">
          <div style={{ visibility: sliderReady ? "visible" : "hidden" }}>
            <ImageCompareSlider
              originalUrl={originalUrl}
              mosaicUrl={mosaicDisplayUrl}
              panelStyle={panelStyle}
              imgNaturalSize={imgNaturalSize}
              onNaturalSize={(size) => { setImgNaturalSize(size); setSizeSettled(true); }}
              autoDetections={uploadResult?.detections ?? []}
              reviewedBoxes={fileBoxes}
              seed={file?.seed ?? 0}
            />
          </div>
          {!sliderReady && (
            <div
              className="absolute inset-0 bg-[#f0f1f5] rounded-[8px] flex items-center justify-center"
              style={panelStyle}
            >
              <div className="w-8 h-8 border-[3px] border-[#d9deea] border-t-[#1d2c4e] rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 bg-[#f7f8fb] border border-[#eef0f5] rounded-[8px] mt-[18px] overflow-hidden">
          {/* 탐지된 영역 수 */}
          <div className="py-[18px] px-5 text-center border-r border-[#eef0f5]">
            <div className="flex items-center justify-center gap-[6px] text-[12.5px] text-[#6b7388] font-medium mb-2">
              <Target size={13} />탐지된 영역 수
            </div>
            <div className="text-[22px] font-extrabold text-[#1f2330] tracking-[-0.01em] mb-[8px]">
              {animatedCount}개
            </div>
            {((uploadResult?.detections?.length ?? 0) > 0 || fileBoxes.some((b) => b.source === "manual")) ? (
              <div className="flex flex-wrap justify-center gap-[4px]">
                {(() => {
                  // reviewedBoxes가 있으면 살아남은 auto 박스만 기준으로 클래스 집계
                  const detections = uploadResult?.detections ?? [];
                  const activeDetections = fileBoxes.length > 0
                    ? fileBoxes
                        .filter((b) => b.source !== "manual" && b.id < 0)
                        .map((b) => detections[-b.id - 1])
                        .filter((d): d is Detection => !!d)
                    : detections;
                  return groupDetections(activeDetections).map(({ label, count }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-[4px] px-[8px] py-[2px] bg-[#e8edf8] text-[#1d2c4e] text-[11.5px] font-semibold rounded-full"
                    >
                      <span className="w-[5px] h-[5px] rounded-full bg-[#1d2c4e] shrink-0" />
                      {label} {count}
                    </span>
                  ));
                })()}
                {(() => {
                  const manualCount = fileBoxes.filter((b) => b.source === "manual").length;
                  if (manualCount === 0) return null;
                  return (
                    <span className="inline-flex items-center gap-[4px] px-[8px] py-[2px] bg-[#e8edf8] text-[#1d4ed8] text-[11.5px] font-semibold rounded-full">
                      <span className="w-[5px] h-[5px] rounded-full bg-[#3b82f6] shrink-0" />
                      수동 {manualCount}
                    </span>
                  );
                })()}
              </div>
            ) : null}
          </div>

          {/* 평균 신뢰도 */}
          <div className="py-[18px] px-5 text-center border-r border-[#eef0f5]">
            <div className="flex items-center justify-center gap-[6px] text-[12.5px] text-[#6b7388] font-medium mb-2">
              <ShieldCheck size={13} />평균 신뢰도
            </div>
            <div className="text-[22px] font-extrabold text-[#1f2330] tracking-[-0.01em] mb-[10px]">
              {avgConfidence !== null ? `${animatedConfPct}%` : "—"}
            </div>
            {avgConfidence !== null && (
              <div className="w-[80px] mx-auto bg-[#e2e5ec] rounded-full h-[5px]">
                <div
                  className="bg-[#2ecc71] h-[5px] rounded-full"
                  style={{ width: `${animatedConfPct}%` }}
                />
              </div>
            )}
          </div>

          {/* 처리 시간 */}
          <div className="py-[18px] px-5 text-center">
            <div className="flex items-center justify-center gap-[6px] text-[12.5px] text-[#6b7388] font-medium mb-2">
              <Clock size={13} />처리 시간
            </div>
            <div className="text-[22px] font-extrabold text-[#1f2330] tracking-[-0.01em]">
              {`00:00:${String(animatedSeconds).padStart(2, "0")}`}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#f0f4fa] border border-[#d9e3f1] rounded-[8px] px-4 py-[14px] flex items-center gap-[10px] text-[13px] text-[#3a4055]">
        <Info size={14} className="text-[#1d2c4e] shrink-0" />
        <span>자동 모자이크 결과를 확인하고 누락된 영역이 있으면 우측 상단의 "수동 수정" 버튼을 클릭하여 수동 모자이크를 진행해주세요.</span>
      </div>
    </div>
  );
}

/* ─────────────────── Step 3 Side ────────────── */
function Step3Side({
  data,
  selectedFile,
  onSelectFile,
}: {
  data: CaseFormData;
  selectedFile: UploadedFile | null;
  onSelectFile: (f: UploadedFile) => void;
}) {
  return (
    <div className="bg-white border border-[#e6e8ef] rounded-[10px] flex flex-col" style={{ position: "sticky", top: 24, maxHeight: "calc(100vh - 180px)" }}>
      {/* 헤더 */}
      <div className="px-[22px] pt-[20px] pb-[14px] border-b border-[#ebedf2] flex items-center gap-2 shrink-0">
        <h3 className="text-[16px] font-bold text-[#1f2330] flex items-center gap-2">
          파일 목록
        </h3>
        <span className="bg-[#1d2c4e] text-white text-[12px] font-bold px-[8px] py-[2px] rounded-full">
          {data.files.length}
        </span>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {data.files.length === 0 ? (
          <p className="text-center text-[#9aa1b3] py-10 text-[13px]">업로드된 파일이 없습니다</p>
        ) : (
          data.files.map((f, idx) => {
            const isSelected = selectedFile?.id === f.id;
            return (
              <div
                key={f.id}
                onClick={() => onSelectFile(f)}
                className={cn(
                  "flex items-center gap-[12px] px-[16px] py-[12px] cursor-pointer transition-colors border-b border-[#f0f1f5] last:border-b-0",
                  isSelected ? "bg-[#eef1f8]" : "hover:bg-[#f7f8fb]",
                )}
              >
                {/* 순번 */}
                <span className="shrink-0 w-[22px] text-[12px] font-bold text-[#9aa1b3] text-center">
                  {idx + 1}
                </span>
                {/* 썸네일 */}
                <span className="shrink-0 w-[42px] h-[32px] rounded-[4px] bg-[#f0f1f5] overflow-hidden">
                  {f.uploadResult?.storageUrl ? (
                    <img src={f.uploadResult.storageUrl} alt={f.name} className="w-full h-full object-cover" />
                  ) : (
                    <CompareScene mosaic variant={f.seed} />
                  )}
                </span>
                {/* 파일 정보 */}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[13px] font-semibold truncate", isSelected ? "text-[#1d2c4e]" : "text-[#1f2330]")}>
                    {f.uploadResult?.originalFileName ?? f.name}
                  </p>
                  <p className="text-[11.5px] text-[#9aa1b3] mt-[1px]">{f.sizeMB} MB</p>
                </div>
                {/* 선택 표시 */}
                {isSelected && (
                  <span className="shrink-0 w-[6px] h-[6px] rounded-full bg-[#1d2c4e]" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Page ───────────────────── */
export default function NewCasePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [isCompressing, setIsCompressing] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | number | null>(null);
  const [replaceResults, setReplaceResults] = useState<ReplaceFileResult[]>([]);

  // Step 1
  const [caseNumber, setCaseNumber] = useState("");
  // 사건 번호 중복 검사 상태
  const [caseNumberStatus, setCaseNumberStatus] =
    useState<"idle" | "checking" | "available" | "taken">("idle");
  const [caseName, setCaseName] = useState("");
  const [assignedTo, setAssignedTo] = useState("");       // email
  const [assignedToName, setAssignedToName] = useState(""); // 표시용 이름
  const [desc, setDesc] = useState("");

  // 담당자 선택 드롭다운
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerUsers, setPickerUsers] = useState<UserResponse[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerFetched, setPickerFetched] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handle = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [pickerOpen]);

  // Step 2
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [openFileId, setOpenFileId] = useState<number | null>(null);
  const [policyTooltipFileId, setPolicyTooltipFileId] = useState<number | null>(null);

  // 일괄 적용
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkPolicy, setBulkPolicy] = useState("");
  const [bulkTagsInput, setBulkTagsInput] = useState("");
  const [bulkDesc, setBulkDesc] = useState("");
  const [bulkPolicyTooltip, setBulkPolicyTooltip] = useState(false);

  const applyBulk = () => {
    const applied = [
      bulkCategory && "카테고리",
      bulkPolicy && "보관 정책",
      bulkTagsInput && "태그",
      bulkDesc && "설명",
    ].filter(Boolean);

    if (applied.length === 0) {
      toast.warning("적용할 항목을 하나 이상 선택해주세요.");
      return;
    }

    setFiles((prev) =>
      prev.map((f) => ({
        ...f,
        ...(bulkCategory && { category: bulkCategory }),
        ...(bulkPolicy && { policy: bulkPolicy }),
        ...(bulkTagsInput && { tags: bulkTagsInput.split(",").map((t) => t.trim()).filter(Boolean) }),
        ...(bulkDesc && { description: bulkDesc }),
      })),
    );

    toast.success(`${files.length}개 파일에 ${applied.join(", ")} 적용 완료`);
  };

  // Step 3
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [reviewedBoxes, setReviewedBoxes] = useState<Record<number, BBox[]>>({});
  const [editingFile, setEditingFile] = useState<UploadedFile | null>(null);

  const totalSize = useMemo(() => files.reduce((s, f) => s + f.sizeMB, 0), [files]);

  const selectedFile = useMemo(
    () => (selectedFileId ? files.find((f) => f.id === selectedFileId) : null) ?? files[0] ?? null,
    [files, selectedFileId],
  );

  // 페이지 진입 시 sessionStorage에서 복원 (새로고침 대응)
  useEffect(() => {
    const session = loadCaseSession();
    if (!session) return;

    setCaseNumber(session.caseNumber);
    setCaseName(session.caseName);
    setAssignedTo(session.assignedTo ?? "");
    setAssignedToName(session.assignedToName ?? "");
    setDesc(session.desc);
    setCreatedCaseId(session.caseId);
    setReviewedBoxes((session.reviewedBoxes as Record<number, BBox[]>) ?? {});

    const restoredFiles: UploadedFile[] = session.files.map((f) => ({ ...f, file: null }));
    setFiles(restoredFiles);
    setSelectedFileId(restoredFiles[0]?.id ?? null);
    if (session.replaceResults) setReplaceResults(session.replaceResults);
    setStep(session.step);

    // 원본 파일 IndexedDB에서 비동기 복원
    loadOriginalFiles(session.caseId, session.files.map((f) => f.id)).then((fileMap) => {
      setFiles((prev) => prev.map((f) => ({ ...f, file: fileMap.get(f.id) ?? null })));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 최신 caseId/files를 ref로 추적 (unmount cleanup에서 사용)
  const caseIdForCleanup = useRef<string | number | null>(null);
  const filesForCleanup = useRef<UploadedFile[]>([]);
  useEffect(() => { caseIdForCleanup.current = createdCaseId; }, [createdCaseId]);
  useEffect(() => { filesForCleanup.current = files; }, [files]);

  // cases/new URL을 벗어날 때 세션 클리어 (새로고침은 beforeunload로 구분하여 유지)
  useEffect(() => {
    let isRefreshing = false;
    const onBeforeUnload = () => { isRefreshing = true; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (!isRefreshing) {
        clearCaseSession();
        const caseId = caseIdForCleanup.current;
        const cur = filesForCleanup.current;
        if (caseId) {
          const ids = cur.map((f) => f.id);
          const fileIds = cur.map((f) => f.uploadResult?.fileId ?? "").filter(Boolean);
          if (ids.length > 0) clearOriginalFiles(String(caseId), ids);
          if (fileIds.length > 0) clearMosaicFiles(String(caseId), fileIds);
        }
      }
    };
  }, []); // mount/unmount에만 실행

  // step 3/4 진입 이후 상태 변경 시 sessionStorage 갱신
  useEffect(() => {
    if ((step !== 3 && step !== 4) || !createdCaseId) return;
    saveCaseSession({
      caseId: String(createdCaseId),
      step,
      caseNumber,
      caseName,
      assignedTo,
      assignedToName,
      desc,
      files: files.map(({ id, name, sizeMB, seed, category, tags, policy, description, uploadResult }) => ({
        id, name, sizeMB, seed, category, tags, policy, description, uploadResult,
      })),
      reviewedBoxes,
      replaceResults,
    });
  }, [step, reviewedBoxes, files, createdCaseId, caseNumber, caseName, assignedTo, assignedToName, desc]);

  const formData: CaseFormData = { caseNumber, caseName, assignedTo, assignedToName, desc, files };

  // 사건 번호 실시간 중복 검사 (디바운스 500ms).
  // "checking" 표시는 onChange 에서 즉시 세팅하고, 여기서는 디바운스된
  // 비동기 결과만 반영한다 (effect 본문에서 동기 setState 회피).
  useEffect(() => {
    const trimmed = caseNumber.trim();
    if (!trimmed) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const exists = await CheckCaseNumberExists(trimmed);
        if (!cancelled) setCaseNumberStatus(exists ? "taken" : "available");
      } catch {
        if (!cancelled) setCaseNumberStatus("idle");
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [caseNumber]);

  const isStep2Ready =
    files.length > 0 &&
    files.every((f) => f.category && f.policy);

  const addFiles = (rawFiles: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...rawFiles.map((f, i) => ({
        id: Date.now() + i,
        file: f,
        name: f.name,
        sizeMB: +(f.size / (1024 * 1024)).toFixed(1) || 1.0,
        seed: prev.length + i,
        category: "",
        tags: [],
        policy: "",
        description: "",
      })),
    ]);
  };

  const updateFile = (id: number, field: string, value: string | string[]) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
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

  const handleStep1Next = async () => {
    if (!caseNumber.trim()) {
      toast.error("사건 번호를 입력해주세요.");
      return;
    }
    if (caseNumberStatus === "taken") {
      toast.error("이미 사용 중인 사건 번호입니다.");
      return;
    }
    // 최신 상태를 확실히 하기 위해 한 번 더 확인 (디바운스 미완료 대비)
    if (caseNumberStatus === "checking" || caseNumberStatus === "idle") {
      try {
        const exists = await CheckCaseNumberExists(caseNumber.trim());
        if (exists) {
          setCaseNumberStatus("taken");
          toast.error("이미 사용 중인 사건 번호입니다.");
          return;
        }
        setCaseNumberStatus("available");
      } catch {
        // 검사 API 실패 시에는 진행을 막지 않음 (생성 시 서버가 재검증)
      }
    }
    if (!caseName.trim()) {
      toast.error("사건명을 입력해주세요.");
      return;
    }
    if (!assignedTo) {
      toast.error("사건 담당자를 선택해주세요.");
      return;
    }
    setStep(2);
  };

  const goToStep3 = async () => {
    setIsCreating(true);
    setUploadProgress({});
    try {
      const caseRes = await PostCase({
        caseNumber,
        title: caseName,
        description: desc,
        occurredAt: new Date().toISOString().slice(0, 19),
        assignedTo,
      });

      const caseId = caseRes.caseId;
      setCreatedCaseId(caseId);

      // S3 대상 파일은 Vercel 프록시를 거치지 않는 presigned 직접 업로드로,
      // NAS 대상 파일은 (직접 업로드 방식이 없으므로) 기존 멀티파트 경로 그대로 보낸다.
      const s3Files = files.filter((f) => f.policy !== "internal");
      const nasFiles = files.filter((f) => f.policy === "internal");

      const directTasks: DirectUploadTask[] = s3Files.map((f) => ({
        id: f.id,
        file: f.file as File,
        description: f.description,
        categoryName: f.category,
        tags: f.tags,
      }));

      const [directOutcomes, nasResults] = await Promise.all([
        uploadFilesDirect(caseId, directTasks, (id, pct) =>
          setUploadProgress((prev) => ({ ...prev, [id]: pct })),
        ),
        nasFiles.length > 0
          ? PostFiles(
              nasFiles.map((f) => f.file as File),
              nasFiles.map((f) => ({
                storageType: "NAS",
                description: f.description,
                categoryName: f.category,
                tags: f.tags,
                caseId,
              })),
            )
          : Promise.resolve<FileUploadResult[]>([]),
      ]);

      const failed = directOutcomes.find((o) => o.error);
      if (failed) {
        throw failed.error;
      }

      const resultById = new Map<number, FileUploadResult>();
      directOutcomes.forEach((o) => {
        if (o.result) resultById.set(o.id, o.result);
      });
      nasFiles.forEach((f, i) => {
        const result = nasResults[i];
        if (result) resultById.set(f.id, result);
      });

      const updatedFiles = files.map((f) => ({ ...f, uploadResult: resultById.get(f.id) }));
      setFiles(updatedFiles);
      setSelectedFileId(files[0]?.id ?? null);

      // 원본 파일 → IndexedDB, 나머지 → sessionStorage (새로고침 대응)
      await saveOriginalFiles(
        caseId,
        files.map((f) => ({ id: f.id, file: f.file as File })),
      );

      setStep(3);
    } catch {
      toast.error("사건 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsCreating(false);
    }
  };

  const goToStep4 = async () => {
    setIsCompressing(true);
    try {
      // 수동 모자이크 IDB 우선, 없으면 백엔드 /api/files/{fileId}
      const fetchedFiles = await Promise.all(
        files.map(async (f) => {
          const fileId = f.uploadResult?.fileId;
          const name = f.uploadResult?.originalFileName ?? f.name;
          if (!fileId) return new File([], name, { type: "image/jpeg" });

          const mosaicBlob = await loadMosaicFile(String(createdCaseId), fileId);
          if (mosaicBlob) {
            return new File([mosaicBlob], name, { type: mosaicBlob.type || "image/jpeg" });
          }

          const res = await ApiClient.get(`/api/files/${fileId}`, { responseType: "arraybuffer" });
          const contentType = (res.headers as Record<string, string>)["content-type"] || "image/jpeg";
          const blob = new Blob([res.data as ArrayBuffer], { type: contentType });
          return new File([blob], name, { type: contentType });
        }),
      );

      const metadata = files.map((f) => ({
        fileId: f.uploadResult?.fileId ?? "",
      }));

      const results = await PostReplace(fetchedFiles, metadata);
      setReplaceResults(results);
      setStep(4);
    } catch {
      toast.error("파일 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFinish = () => {
    if (createdCaseId) {
      const caseId = String(createdCaseId);
      const fileIds = files.map((f) => f.uploadResult?.fileId ?? "").filter(Boolean);
      clearCaseSession();
      clearOriginalFiles(caseId, files.map((f) => f.id));
      clearMosaicFiles(caseId, fileIds);
    }
    router.push("/cases");
  };

  const STEP_LABELS: Record<number, string> = {
    1: "사건 정보",
    2: "파일 업로드",
    3: "처리 및 결과",
    4: "완료",
  };

  return (
    <div className="pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[14px] text-[#6b7388] mb-[10px]">
        <button onClick={() => router.push("/dashboard")} className="hover:text-[#1d2c4e] hover:underline transition-colors">
          대시보드
        </button>
        <span className="text-[#c5cbd9]">&gt;</span>
        {step === 1 ? (
          <span className="text-[#1f2330] font-medium">새 사건 생성</span>
        ) : (
          <button onClick={() => setStep(1)} className="hover:text-[#1d2c4e] hover:underline transition-colors">새 사건 생성</button>
        )}
        {step >= 2 && (
          <>
            <span className="text-[#c5cbd9]">&gt;</span>
            {step === 2 ? (
              <span className="text-[#1f2330] font-medium">파일 업로드</span>
            ) : (
              <button onClick={() => setStep(2)} className="hover:text-[#1d2c4e] hover:underline transition-colors">파일 업로드</button>
            )}
          </>
        )}
        {step >= 3 && (
          <>
            <span className="text-[#c5cbd9]">&gt;</span>
            {step === 3 ? (
              <span className="text-[#1f2330] font-medium">처리 및 결과</span>
            ) : (
              <button onClick={() => setStep(3)} className="hover:text-[#1d2c4e] hover:underline transition-colors">처리 및 결과</button>
            )}
          </>
        )}
        {step === 4 && (
          <>
            <span className="text-[#c5cbd9]">&gt;</span>
            <span className="text-[#1f2330] font-medium">완료</span>
          </>
        )}
      </nav>

      <h1 className="text-[32px] font-extrabold text-[#1f2330] tracking-[-0.02em] mb-[28px]">
        {STEP_LABELS[step]}
      </h1>

      {/* Step indicator + action buttons */}
      <div className="flex items-center gap-6 mb-[28px]">
        <StepIndicator step={step} />
        <div className="flex items-center gap-[10px] shrink-0">
          {step === 1 && (
            <>
              <button onClick={() => router.push("/dashboard")}
                className="px-6 py-[11px] bg-white border border-[#d9deea] rounded-[8px] text-[14px] font-semibold text-[#3a4055] hover:bg-[#f7f8fb] hover:border-[#c5cbd9] transition-colors">
                취소
              </button>
              <button onClick={handleStep1Next}
                className="px-6 py-[11px] bg-[#1d2c4e] text-white rounded-[8px] text-[14px] font-bold hover:bg-[#2b3f6c] transition-colors">
                다음
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)}
                className="px-6 py-[11px] bg-white border border-[#d9deea] rounded-[8px] text-[14px] font-semibold text-[#3a4055] hover:bg-[#f7f8fb] hover:border-[#c5cbd9] transition-colors">
                이전
              </button>
              <button
                onClick={goToStep3}
                disabled={!isStep2Ready || isCreating}
                className={cn(
                  "px-6 py-[11px] rounded-[8px] text-[14px] font-bold transition-colors flex items-center gap-2",
                  isStep2Ready && !isCreating
                    ? "bg-[#1d2c4e] text-white hover:bg-[#2b3f6c]"
                    : "bg-[#e2e5ec] text-[#9aa1b3] cursor-not-allowed",
                )}>
                {isCreating && (
                  <span className="w-4 h-4 border-2 border-[#9aa1b3] border-t-transparent rounded-full animate-spin" />
                )}
                {isCreating ? "생성 중..." : "사건 생성"}
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <button onClick={() => setStep(2)}
                className="px-6 py-[11px] bg-white border border-[#d9deea] rounded-[8px] text-[14px] font-semibold text-[#3a4055] hover:bg-[#f7f8fb] hover:border-[#c5cbd9] transition-colors">
                이전
              </button>
              <button
                onClick={goToStep4}
                disabled={isCompressing}
                className={cn(
                  "px-6 py-[11px] rounded-[8px] text-[14px] font-bold transition-colors flex items-center gap-2",
                  !isCompressing
                    ? "bg-[#1d2c4e] text-white hover:bg-[#2b3f6c]"
                    : "bg-[#4a5e8a] text-white cursor-not-allowed",
                )}
              >
                {isCompressing && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isCompressing ? "저장 중..." : "검수 완료 및 저장"}
              </button>
            </>
          )}
          {step === 4 && (
            <>
              <button onClick={() => setStep(3)}
                className="px-6 py-[11px] bg-white border border-[#d9deea] rounded-[8px] text-[14px] font-semibold text-[#3a4055] hover:bg-[#f7f8fb] hover:border-[#c5cbd9] transition-colors">
                이전 단계로 돌아가기
              </button>
              <button onClick={handleFinish}
                className="px-6 py-[11px] bg-[#1d2c4e] text-white rounded-[8px] text-[14px] font-bold hover:bg-[#2b3f6c] transition-colors">
                사건 목록으로
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── STEP 1: 사건 정보 ── */}
      {step === 1 && (
        <div className="grid gap-[22px]" style={{ gridTemplateColumns: "1.45fr 1fr", alignItems: "start" }}>
          <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
            <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em] mb-[18px] flex items-center gap-2">
              <Archive size={18} className="text-[#1d2c4e]" />
              사건 정보
            </h3>
            <div className="grid grid-cols-2 gap-x-[18px] gap-y-[16px]">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-semibold text-[#3a4055]">
                  사건 번호 <span className="text-[#d33b3b]">*</span>
                </label>
                <input
                  className={cn(
                    "w-full px-[14px] py-[11px] border rounded-[8px] text-[13.5px] text-[#1f2330] outline-none placeholder:text-[#9aa1b3] transition-colors",
                    caseNumberStatus === "taken"
                      ? "border-[#d33b3b] focus:border-[#d33b3b]"
                      : caseNumberStatus === "available"
                        ? "border-[#2ecc71] focus:border-[#2ecc71]"
                        : "border-[#d9deea] focus:border-[#1d2c4e]",
                  )}
                  value={caseNumber}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCaseNumber(v);
                    setCaseNumberStatus(v.trim() ? "checking" : "idle");
                  }}
                  placeholder="2026-CASE-001"
                />
                {caseNumberStatus === "checking" && (
                  <span className="text-[12px] text-[#9aa1b3]">중복 확인 중...</span>
                )}
                {caseNumberStatus === "available" && (
                  <span className="text-[12px] text-[#1f8a4c]">사용 가능한 사건 번호입니다.</span>
                )}
                {caseNumberStatus === "taken" && (
                  <span className="text-[12px] text-[#d33b3b]">이미 사용 중인 사건 번호입니다.</span>
                )}
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[13px] font-semibold text-[#3a4055]">
                  사건명 <span className="text-[#d33b3b]">*</span>
                </label>
                <input
                  className="w-full px-[14px] py-[11px] border border-[#d9deea] rounded-[8px] text-[13.5px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] transition-colors"
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  placeholder="강력 사건"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-[6px]">
                <label className="text-[13px] font-semibold text-[#3a4055]">
                  사건 담당자 <span className="text-[#d33b3b]">*</span>
                </label>
                <div ref={pickerRef} className="relative">
                  <button
                    type="button"
                    onClick={async () => {
                      setPickerOpen((v) => !v);
                      if (!pickerFetched) {
                        setPickerFetched(true);
                        try {
                          const users = await GetUserList();
                          setPickerUsers(users);
                        } catch {
                          toast.error("사용자 목록을 불러오지 못했습니다.");
                        }
                      }
                    }}
                    className="w-full flex items-center gap-[10px] px-[14px] py-[11px] border border-[#d9deea] rounded-[8px] text-[13.5px] outline-none focus:border-[#1d2c4e] transition-colors bg-white text-left"
                  >
                    {assignedTo ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-[#e8ecf4] flex items-center justify-center text-[11px] font-bold text-[#1d2c4e] shrink-0">
                          {assignedToName[0]}
                        </div>
                        <span className="text-[#1f2330] font-medium">{assignedToName}</span>
                        <span className="text-[#9aa1b3] text-[12px]">{assignedTo}</span>
                      </>
                    ) : (
                      <span className="text-[#9aa1b3]">담당자를 선택하세요</span>
                    )}
                  </button>

                  {pickerOpen && (
                    <div
                      className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white border border-[#e2e5ec] rounded-[10px] shadow-[0_8px_24px_rgba(15,22,40,0.12)] overflow-hidden"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div className="p-[10px] border-b border-[#eef0f5]">
                        <input
                          autoFocus
                          type="text"
                          placeholder="이름 또는 이메일 검색..."
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          className="w-full px-[12px] py-[8px] border border-[#d9deea] rounded-[7px] text-[13px] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3]"
                        />
                      </div>
                      <div className="max-h-[220px] overflow-y-auto">
                        {pickerUsers
                          .filter((u) => {
                            const q = pickerSearch.toLowerCase();
                            return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                          })
                          .map((u) => (
                            <button
                              key={u.email}
                              type="button"
                              onClick={() => {
                                setAssignedTo(u.email);
                                setAssignedToName(u.name);
                                setPickerOpen(false);
                                setPickerSearch("");
                              }}
                              className="w-full flex items-center gap-[10px] px-[14px] py-[10px] hover:bg-[#f7f8fb] transition-colors text-left"
                            >
                              <div className="w-7 h-7 rounded-full bg-[#e8ecf4] flex items-center justify-center text-[12px] font-bold text-[#1d2c4e] shrink-0">
                                {u.name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-[6px]">
                                  <span className="text-[13.5px] font-semibold text-[#1f2330]">{u.name}</span>
                                  <span className="text-[11px] px-[6px] py-[1px] bg-[#f0f4fa] text-[#4a5e8a] rounded-full font-medium">
                                    {ROLE_LABEL[u.roles[0]] ?? u.roles[0]}
                                  </span>
                                </div>
                                <p className="text-[12px] text-[#9aa1b3] truncate">{u.email}</p>
                              </div>
                              {assignedTo === u.email && (
                                <div className="w-4 h-4 rounded-full bg-[#1d2c4e] flex items-center justify-center shrink-0">
                                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                    <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              )}
                            </button>
                          ))
                        }
                        {pickerUsers.length > 0 && pickerUsers.filter((u) => {
                          const q = pickerSearch.toLowerCase();
                          return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                        }).length === 0 && (
                          <div className="py-8 text-center text-[13px] text-[#9aa1b3]">검색 결과가 없습니다.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-2 flex flex-col gap-[6px]">
                <label className="text-[13px] font-semibold text-[#3a4055]">사건 설명 <span className="text-[#9aa1b3] font-normal">(선택)</span></label>
                <div className="relative">
                  <textarea
                    className="w-full px-[14px] py-[11px] border border-[#d9deea] rounded-[8px] text-[13.5px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] resize-none min-h-[132px] leading-[1.5] transition-colors"
                    value={desc}
                    maxLength={300}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="사건에 대한 설명을 입력하세요."
                  />
                  <span className="absolute right-3 bottom-[10px] text-[12px] text-[#9aa1b3]">{desc.length} / 300</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
            <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em] mb-[4px] flex items-center gap-2">
              <ClipboardList size={18} className="text-[#1d2c4e]" />
              사건 정보 요약
            </h3>
            <div className="flex flex-col">
              {[
                { k: "사건 번호", v: caseNumber || "—" },
                { k: "사건명", v: caseName || "—" },
                { k: "생성 날짜", v: TODAY },
                { k: "사건 담당자", v: assignedToName || "—" },
                { k: "사건 설명", v: desc || "—" },
              ].map(({ k, v }) => (
                <div key={k} className="grid text-[13.5px] py-[10px] border-b border-[#f0f1f5] last:border-b-0" style={{ gridTemplateColumns: "110px 1fr" }}>
                  <span className="text-[#6b7388] font-medium">{k}</span>
                  <span className="text-[#1f2330] font-bold break-words">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-[18px] bg-[#f0f4fa] border border-[#d9e3f1] rounded-[8px] p-[14px] flex items-center gap-[10px] text-[13px] text-[#3a4055]">
              <Info size={14} className="text-[#1d2c4e] shrink-0" />
              <span>사건 번호와 사건명을 입력한 후 다음 단계에서 파일을 업로드하세요.</span>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: 파일 업로드 ── */}
      {step === 2 && (
        <div className="grid gap-[22px]" style={{ gridTemplateColumns: "1.45fr 1fr", alignItems: "start" }}>
          <div className="flex flex-col gap-[22px]">
            {/* 드래그앤드롭 */}
            <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
              <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em] mb-[18px] flex items-center gap-2">
                <CloudUpload size={18} className="text-[#1d2c4e]" />
                파일 업로드
              </h3>
              <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*,video/*" onChange={handlePick} />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-[10px] p-[42px] text-center cursor-pointer transition-colors",
                  dragOver ? "border-[#1d2c4e] bg-[#f0f4fa]" : "border-[#c5cbd9] bg-[#fafbfd] hover:border-[#1d2c4e] hover:bg-[#f0f4fa]",
                )}
              >
                <div className="w-12 h-12 rounded-full bg-white border border-[#e2e5ec] flex items-center justify-center text-[#6b7388] mx-auto mb-[14px]">
                  <CloudUpload size={20} />
                </div>
                <p className="text-[14px] font-medium text-[#3a4055] mb-[6px]">파일을 드래그하거나 클릭하여 업로드</p>
                <p className="text-[12.5px] text-[#9aa1b3]">JPG, PNG 지원 (최대 2GB)</p>
              </div>
            </div>

            {/* 일괄 적용 */}
            {files.length > 0 && (
              <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
                <div className="flex justify-between items-center mb-[18px]">
                  <div>
                    <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em]">
                      일괄 적용
                    </h3>
                    <p className="text-[12.5px] text-[#6b7388] mt-[3px]">
                      설정한 값을 모든 파일에 한 번에 적용합니다. 빈 항목은 적용되지 않습니다.
                    </p>
                  </div>
                  <button
                    onClick={applyBulk}
                    className="px-5 py-[9px] bg-[#1d2c4e] text-white rounded-[8px] text-[13px] font-bold hover:bg-[#2b3f6c] transition-colors shrink-0"
                  >
                    전체 파일에 적용
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-[14px]">
                  {/* 카테고리 */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="text-[12.5px] font-semibold text-[#3a4055]">카테고리 <span className="text-[#d33b3b]">*</span></label>
                    <select
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      className="w-full px-[12px] py-[9px] border border-[#d9deea] rounded-[8px] text-[13px] text-[#1f2330] outline-none focus:border-[#1d2c4e] bg-white transition-colors"
                    >
                      <option value="">카테고리 선택</option>
                      {CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* 보관 정책 */}
                  <div className="flex flex-col gap-[6px]">
                    <div className="flex items-center gap-[5px]">
                      <label className="text-[12.5px] font-semibold text-[#3a4055]">보관 정책 <span className="text-[#d33b3b]">*</span></label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setBulkPolicyTooltip((v) => !v)}
                          className="w-[16px] h-[16px] rounded-full bg-[#e2e5ec] text-[#6b7388] flex items-center justify-center hover:bg-[#d9deea] transition-colors"
                        >
                          <Info size={10} />
                        </button>
                        {bulkPolicyTooltip && (
                          <div className="absolute left-0 top-[calc(100%+6px)] z-50 bg-white border border-[#e2e5ec] rounded-[10px] shadow-[0_8px_24px_rgba(15,22,40,0.12)] p-[14px] w-[220px] flex flex-col gap-[10px]">
                            {POLICY_OPTIONS.map(({ Icon, label, desc }) => (
                              <div key={label} className="flex items-center gap-2 text-[12.5px] text-[#4a5168]">
                                <Icon size={15} className="text-[#1d2c4e] shrink-0" />
                                <span>
                                  <strong className="text-[#1d2c4e] font-bold mr-1">{label}</strong>
                                  {desc}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <select
                      value={bulkPolicy}
                      onChange={(e) => setBulkPolicy(e.target.value)}
                      className="w-full px-[12px] py-[9px] border border-[#d9deea] rounded-[8px] text-[13px] text-[#1f2330] outline-none focus:border-[#1d2c4e] bg-white transition-colors"
                    >
                      <option value="">보관 정책 선택</option>
                      {POLICY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* 태그 */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="text-[12.5px] font-semibold text-[#3a4055] flex items-center gap-[5px]">
                      <Tag size={12} />
                      태그
                      <span className="text-[#9aa1b3] font-normal">(선택 · 쉼표로 구분)</span>
                    </label>
                    <input
                      className="w-full px-[12px] py-[9px] border border-[#d9deea] rounded-[8px] text-[13px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] transition-colors"
                      placeholder="사건번호, 위치, 날짜 등"
                      value={bulkTagsInput}
                      onChange={(e) => setBulkTagsInput(e.target.value)}
                    />
                  </div>

                  {/* 설명 */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="text-[12.5px] font-semibold text-[#3a4055]">설명 <span className="text-[#9aa1b3] font-normal">(선택)</span></label>
                    <textarea
                      className="w-full px-[12px] py-[9px] border border-[#d9deea] rounded-[8px] text-[13px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] resize-none min-h-[72px] leading-[1.5] transition-colors"
                      placeholder="파일에 대한 상세 설명을 입력하세요."
                      value={bulkDesc}
                      onChange={(e) => setBulkDesc(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 파일 목록 + 메타데이터 */}
            {files.length > 0 && (
              <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
                <div className="flex justify-between items-center mb-[18px]">
                  <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em] flex items-center gap-2">
                    파일 목록
                    <span className="bg-[#1d2c4e] text-white text-[12px] font-bold px-2 py-[1px] rounded-full">{files.length}</span>
                  </h3>
                  <button onClick={() => setFiles([])} className="text-[13px] text-[#d33b3b] font-semibold hover:underline">
                    모두 제거
                  </button>
                </div>

                <div className="flex flex-col gap-[10px]">
                  {files.map((f) => {
                    const isOpen = openFileId === f.id;
                    const isFilled = f.category && f.policy;
                    return (
                      <div key={f.id} className="border border-[#e6e8ef] rounded-[8px] overflow-hidden">
                        {/* 파일 헤더 행 */}
                        <div
                          className={cn(
                            "flex items-center gap-3 px-[14px] py-3 cursor-pointer transition-colors",
                            isOpen ? "bg-[#f0f4fa]" : "bg-[#fafbfd] hover:bg-[#f7f8fb]",
                          )}
                          onClick={() => { setOpenFileId(isOpen ? null : f.id); setPolicyTooltipFileId(null); }}
                        >
                          <div className="w-8 h-8 bg-white border border-[#d9e3f1] rounded flex items-center justify-center text-[9px] font-bold text-[#1d2c4e] shrink-0">
                            {f.name.split(".").pop()?.toUpperCase().slice(0, 3)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-bold text-[#1d2c4e] truncate">{f.name}</p>
                            <p className="text-[12px] text-[#6b7388] mt-0.5">
                              {f.sizeMB}MB
                              {isCreating && uploadProgress[f.id] != null && ` · 업로드 ${uploadProgress[f.id]}%`}
                            </p>
                          </div>
                          {isFilled && (
                            <span className="shrink-0 text-[11.5px] bg-[#e3f4ea] text-[#1f7a47] font-bold px-2 py-[3px] rounded-[5px]">
                              입력 완료
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setFiles((prev) => prev.filter((x) => x.id !== f.id)); }}
                            className="w-[26px] h-[26px] flex items-center justify-center text-[#6b7388] rounded hover:bg-white hover:text-[#d33b3b] transition-colors shrink-0"
                          >
                            <X size={14} />
                          </button>
                          <ChevronDown size={14} className={cn("text-[#9aa1b3] transition-transform shrink-0", isOpen && "rotate-180")} />
                        </div>

                        {/* 메타데이터 폼 */}
                        {isOpen && (
                          <div className="px-[14px] pb-[16px] pt-[14px] border-t border-[#e6e8ef] flex flex-col gap-[14px]">
                            <div className="grid grid-cols-2 gap-[14px]">
                              <div className="flex flex-col gap-[6px]">
                                <label className="text-[12.5px] font-semibold text-[#3a4055]">카테고리 <span className="text-[#d33b3b]">*</span></label>
                                <select
                                  value={f.category}
                                  onChange={(e) => updateFile(f.id, "category", e.target.value)}
                                  className="w-full px-[12px] py-[9px] border border-[#d9deea] rounded-[8px] text-[13px] text-[#1f2330] outline-none focus:border-[#1d2c4e] bg-white transition-colors"
                                >
                                  <option value="">카테고리 선택</option>
                                  {CATEGORY_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col gap-[6px]">
                                <div className="flex items-center gap-[5px]">
                                  <label className="text-[12.5px] font-semibold text-[#3a4055]">보관 정책 <span className="text-[#d33b3b]">*</span></label>
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setPolicyTooltipFileId(policyTooltipFileId === f.id ? null : f.id); }}
                                      className="w-[16px] h-[16px] rounded-full bg-[#e2e5ec] text-[#6b7388] flex items-center justify-center hover:bg-[#d9deea] transition-colors"
                                    >
                                      <Info size={10} />
                                    </button>
                                    {policyTooltipFileId === f.id && (
                                      <div
                                        className="absolute left-0 top-[calc(100%+6px)] z-50 bg-white border border-[#e2e5ec] rounded-[10px] shadow-[0_8px_24px_rgba(15,22,40,0.12)] p-[14px] w-[220px] flex flex-col gap-[10px]"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {POLICY_OPTIONS.map(({ Icon, label, desc }) => (
                                          <div key={label} className="flex items-center gap-2 text-[12.5px] text-[#4a5168]">
                                            <Icon size={15} className="text-[#1d2c4e] shrink-0" />
                                            <span>
                                              <strong className="text-[#1d2c4e] font-bold mr-1">{label}</strong>
                                              {desc}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <select
                                  value={f.policy}
                                  onChange={(e) => updateFile(f.id, "policy", e.target.value)}
                                  className="w-full px-[12px] py-[9px] border border-[#d9deea] rounded-[8px] text-[13px] text-[#1f2330] outline-none focus:border-[#1d2c4e] bg-white transition-colors"
                                >
                                  <option value="">보관 정책 선택</option>
                                  {POLICY_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="flex flex-col gap-[6px]">
                              <label className="text-[12.5px] font-semibold text-[#3a4055] flex items-center gap-[5px]">
                                <Tag size={12} />
                                태그
                                <span className="text-[#9aa1b3] font-normal">(선택 · 쉼표로 구분)</span>
                              </label>
                              <input
                                className="w-full px-[12px] py-[9px] border border-[#d9deea] rounded-[8px] text-[13px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] transition-colors"
                                placeholder="사건번호, 위치, 날짜 등"
                                defaultValue={f.tags.join(", ")}
                                onChange={(e) => {
                                  const tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
                                  updateFile(f.id, "tags", tags);
                                }}
                              />
                            </div>
                            <div className="flex flex-col gap-[6px]">
                              <label className="text-[12.5px] font-semibold text-[#3a4055]">설명 <span className="text-[#9aa1b3] font-normal">(선택)</span></label>
                              <textarea
                                className="w-full px-[12px] py-[9px] border border-[#d9deea] rounded-[8px] text-[13px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] resize-none min-h-[72px] leading-[1.5] transition-colors"
                                placeholder="파일에 대한 상세 설명을 입력하세요."
                                value={f.description}
                                onChange={(e) => updateFile(f.id, "description", e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!isStep2Ready && (
                  <div className="mt-[14px] bg-[#fff8f0] border border-[#f5d9b8] rounded-[8px] px-4 py-[12px] flex items-center gap-[10px] text-[13px] text-[#7a4a1e]">
                    <Info size={14} className="shrink-0" />
                    <span>모든 파일의 카테고리와 보관 정책을 선택해야 다음 단계로 진행할 수 있습니다.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 사건 정보 요약 */}
          <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
            <h3 className="text-[17px] font-bold text-[#1f2330] tracking-[-0.01em] mb-[4px] flex items-center gap-2">
              <ClipboardList size={18} className="text-[#1d2c4e]" />
              사건 정보 요약
            </h3>
            <div className="flex flex-col">
              {[
                { k: "사건 번호", v: caseNumber || "—" },
                { k: "사건명", v: caseName || "—" },
                { k: "생성 날짜", v: TODAY },
                { k: "사건 담당자", v: assignedToName || "—" },
                { k: "파일 개수", v: `${files.length}개` },
                { k: "총 용량", v: `${totalSize.toFixed(1)}MB` },
                { k: "사건 설명", v: desc || "—" },
              ].map(({ k, v }) => (
                <div key={k} className="grid text-[13.5px] py-[10px] border-b border-[#f0f1f5] last:border-b-0" style={{ gridTemplateColumns: "110px 1fr" }}>
                  <span className="text-[#6b7388] font-medium">{k}</span>
                  <span className="text-[#1f2330] font-bold break-words">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: 처리 및 결과 ── */}
      {step === 3 && (
        <div className="grid gap-[22px]" style={{ gridTemplateColumns: "1.45fr 1fr", alignItems: "start", minHeight: 0 }}>
          <Step3Main
            data={formData}
            selectedFile={selectedFile}
            reviewedBoxes={reviewedBoxes}
            caseId={String(createdCaseId ?? "")}
            onManualEdit={(f) => setEditingFile(f)}
            onInitReviewed={(fileId, boxes) => setReviewedBoxes((prev) => ({ ...prev, [fileId]: boxes }))}
          />
          <Step3Side
            data={formData}
            selectedFile={selectedFile}
            onSelectFile={(f) => setSelectedFileId(f.id)}
          />
        </div>
      )}

      {/* ── STEP 4: 완료 ── */}
      {step === 4 && (
        <Step3Complete
          caseName={caseName}
          caseNumber={caseNumber}
          officer={assignedToName}
          files={files}
          replaceResults={replaceResults}
          reviewedBoxes={reviewedBoxes}
        />
      )}

      {/* Manual edit modal */}
      {editingFile && (
        <ManualEditModal
          file={editingFile}
          caseId={String(createdCaseId ?? "")}
          fileId={editingFile.uploadResult?.fileId ?? ""}
          autoDetections={editingFile.uploadResult?.detections ?? []}
          initialBoxes={reviewedBoxes[editingFile.id] ?? []}
          onClose={() => setEditingFile(null)}
          onApply={(boxes) => {
            setReviewedBoxes((prev) => ({ ...prev, [editingFile.id]: boxes }));
            setEditingFile(null);
          }}
        />
      )}
    </div>
  );
}
