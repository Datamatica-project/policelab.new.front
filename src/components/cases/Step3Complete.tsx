"use client";

import { useState, useMemo } from "react";
import JSZip from "jszip";
import {
  Check,
  Download,
  ChevronLeft,
  ChevronRight,
  Archive,
  BarChart2,
  Activity,
  Info,
  ExternalLink,
  X,
  Image,
  Loader2,
  Film,
} from "lucide-react";
import { toast } from "sonner";
import CompareScene from "./CompareScene";
import AuthedImage from "@/components/common/AuthedImage";
import FileProcessingBadge from "./FileProcessingBadge";
import type { BBox } from "./ManualEditModal";
import type { FileUploadResult, ReplaceFileResult } from "@/lib/api";
import { ApiClient } from "@/lib/api";
import { useFileProcessingPoll } from "@/hooks/useFileProcessingPoll";
import { useAuthedImage } from "@/hooks/useAuthedImage";
import { useVideoSource } from "@/hooks/useVideoSource";
import { describeFileStatus, isFileViewable } from "@/lib/fileStatus";

interface UploadedFile {
  id: number;
  name: string;
  sizeMB: number;
  seed: number;
  uploadResult?: FileUploadResult;
}

interface CompressedFile extends UploadedFile {
  displayName: string;
  storageUrl: string | null | undefined;
  original: number;
  after: number;
  saved: number;
  rate: number;
  /** 백엔드 FileProcessingStatus (폴링으로 갱신됨) */
  processingStatus: string | null | undefined;
  processingProgress: number | null | undefined;
  /** 미리보기·다운로드가 가능한 상태인지 */
  viewable: boolean;
}

interface Props {
  caseName: string;
  caseNumber: string;
  officer: string;
  files: UploadedFile[];
  replaceResults: ReplaceFileResult[];
  reviewedBoxes: Record<number, BBox[]>;
}

const TODAY_DISPLAY = new Date().toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** 영상 파일인지. 이미지용 자리 채움(CompareScene)을 영상에 그리면 없는 결과를 보여 주게 된다. */
function isVideoFile(file: CompressedFile): boolean {
  return file.uploadResult?.contentType?.startsWith("video") ?? false;
}

/** 영상 썸네일 자리. 백엔드가 영상 썸네일을 만들지 않으므로 아이콘으로 대체한다. */
function VideoThumb() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#eef0f5] text-[#8a93a8]">
      <Film size={26} strokeWidth={1.5} />
    </div>
  );
}

/* ── Preview Modal ── */
function PreviewModal({
  file,
  onClose,
}: {
  file: CompressedFile;
  onClose: () => void;
}) {
  const isVideo = isVideoFile(file);
  // 영상은 presigned URL 로 즉시 재생한다. blob 으로 통째로 받던 방식은 수백 MB 짜리
  // 블랙박스 영상에서 다 받을 때까지 재생기가 뜨지 않았다.
  const video = useVideoSource(
    isVideo ? (file.uploadResult?.fileId ?? null) : null,
    file.storageUrl,
  );
  const videoUrl = video.src;

  return (
    <div
      className="fixed inset-0 bg-[rgba(15,22,40,0.45)] flex items-center justify-center z-[200] p-10"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-[12px] overflow-hidden shadow-[0_24px_60px_rgba(15,22,40,0.25)]"
        style={{ maxWidth: "min(820px, calc(100vw - 80px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-[18px] border-b border-[#ebedf2]">
          <div>
            <h3 className="text-[16px] font-bold text-[#1f2330] m-0">{file.displayName}</h3>
            <p className="text-[12.5px] text-[#6b7388] mt-[2px]">
              {file.after.toFixed(2)} MB · {isVideo ? "비식별화 완료" : "모자이크 처리 완료"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[6px] text-[#6b7388] flex items-center justify-center hover:bg-[#f3f4f8] hover:text-[#1f2330]"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-5 bg-[#f5f6fa]">
          {isVideo ? (
            videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="block rounded-[8px] shadow-[0_4px_16px_rgba(15,22,40,0.10)]"
                style={{
                  maxWidth: "min(760px, calc(100vw - 120px))",
                  maxHeight: "calc(100vh - 220px)",
                }}
              />
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-[8px] bg-white border border-[#e6e8ef] text-[#9aa1b3]"
                style={{ width: "min(760px, calc(100vw - 120px))", aspectRatio: "16/9" }}
              >
                <Loader2 size={28} className="animate-spin" />
                <span className="text-[13px] font-medium">영상을 불러오는 중...</span>
              </div>
            )
          ) : (
            <AuthedImage
              src={file.storageUrl}
              alt={file.displayName}
              className="block rounded-[8px] shadow-[0_4px_16px_rgba(15,22,40,0.10)]"
              style={{
                maxWidth: "min(760px, calc(100vw - 120px))",
                maxHeight: "calc(100vh - 220px)",
                width: "100%",
                height: "auto",
              }}
              fallback={
                <div
                  className="rounded-[8px] overflow-hidden"
                  style={{ width: "min(760px, calc(100vw - 120px))", aspectRatio: "4/3" }}
                >
                  <CompareScene mosaic variant={file.seed} />
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function Step3Complete({ caseName, caseNumber, officer, files, replaceResults, reviewedBoxes }: Props) {
  const [carouselStart, setCarouselStart] = useState(0);
  const [previewFile, setPreviewFile] = useState<CompressedFile | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // 영상은 이 화면에 도착한 시점에도 비식별화가 끝나 있지 않다. 처리 중인 파일만
  // 폴링해 상태·URL 을 갱신한다 (이미지는 폴링 대상이 되지 않는다).
  const { statusById, pendingCount } = useFileProcessingPoll(
    files
      .filter((f) => f.uploadResult?.fileId)
      .map((f) => ({
        id: f.uploadResult!.fileId,
        processingStatus: f.uploadResult?.processingStatus,
      })),
  );

  // 교체 결과는 fileId 로 대응시킨다. 영상처럼 교체 단계를 거치지 않는 파일이 섞이면
  // files 와 길이가 달라져, 위치로 짝지으면 다른 파일의 용량·URL 이 표시된다.
  const replaceResultByFileId = useMemo(
    () => new Map(replaceResults.map((r) => [r.fileId, r])),
    [replaceResults],
  );

  const compressed = useMemo<CompressedFile[]>(() =>
    files.map((f) => {
      const result = f.uploadResult
        ? replaceResultByFileId.get(f.uploadResult.fileId)
        : undefined;
      const snapshot = f.uploadResult ? statusById.get(f.uploadResult.fileId) : undefined;
      const displayName = f.uploadResult?.originalFileName ?? f.name;
      // 영상은 업로드 응답의 storageUrl 이 null 이고, 비식별화가 끝난 뒤 폴링 응답으로만
      // 결과물 URL 을 알 수 있다.
      const storageUrl =
        result?.storageUrl ?? snapshot?.url ?? f.uploadResult?.storageUrl;
      const processingStatus = snapshot?.processingStatus ?? f.uploadResult?.processingStatus;
      const original = f.sizeMB;
      // 크기가 바뀌는 경로가 둘이다.
      //   - 이미지: 수동 보정본을 /replace 로 교체 → replaceResult.fileSize
      //   - 영상  : 비식별화가 끝나면 서버의 파일 크기 자체가 결과물 것으로 바뀐다.
      //            (교체 경로를 타지 않으므로 replaceResult 가 없다)
      // 영상을 빠뜨리면 after 가 원본과 같아져, 실제로는 크게 줄었는데 절감률이 0% 로 뜬다.
      const after = result
        ? +(result.fileSize / (1024 * 1024)).toFixed(2)
        : snapshot?.sizeBytes
          ? +(snapshot.sizeBytes / (1024 * 1024)).toFixed(2)
          : original;
      // 음수를 깎지 않는다. 비식별화는 재인코딩이라 원본 인코딩에 따라 커질 수도 있고,
      // 저장 용량을 가늠하는 화면에서 증가를 0% 로 숨기면 잘못된 판단을 부른다.
      const saved = +(original - after).toFixed(2);
      const rate = original > 0 ? +((saved / original) * 100).toFixed(1) : 0;
      return {
        ...f,
        displayName,
        storageUrl,
        original,
        after,
        saved,
        rate,
        processingStatus,
        processingProgress: snapshot?.processingProgress,
        viewable: isFileViewable(processingStatus),
      };
    }),
    [files, replaceResultByFileId, statusById],
  );

  const totalOriginal = compressed.reduce((s, f) => s + f.original, 0);
  const totalAfter = compressed.reduce((s, f) => s + f.after, 0);
  const totalSaved = totalOriginal - totalAfter;
  const totalRate = totalOriginal > 0 ? (totalSaved / totalOriginal) * 100 : 0;
  /** 줄었으면 초록, 늘었으면 주황. 증가를 초록으로 칠하면 좋은 소식처럼 읽힌다. */
  const deltaColor = totalSaved >= 0 ? "#1f9d55" : "#c2680a";
  /** 부호를 반드시 붙인다 — "6.24 MB"만으로는 줄었는지 늘었는지 알 수 없다. */
  const signed = (mb: number) => `${mb >= 0 ? "-" : "+"}${Math.abs(mb).toFixed(2)} MB`;
  const signedRate = (pct: number) => `${pct >= 0 ? "-" : "+"}${Math.abs(pct).toFixed(1)}%`;

  const canNext = carouselStart + 3 < compressed.length;
  const canPrev = carouselStart > 0;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const folderName = `case_${caseNumber || "unknown"}`;
      const imgFolder = zip.folder(`${folderName}/images`)!;

      // 파일 fetch (백엔드 경유 → S3 CORS 우회)
      await Promise.all(
        compressed.map(async (f) => {
          // 교체 결과의 fileId 는 원본과 같으므로 업로드 결과의 ID 를 그대로 쓴다.
          const fileId = f.uploadResult?.fileId;
          if (!fileId) return;
          // 처리 중·격리 파일은 백엔드가 409 로 막는다. 넣어 봐야 실패하고,
          // 조용히 빠지면 사용자는 ZIP 에 파일이 없는 이유를 알 수 없다.
          if (!f.viewable) return;
          try {
            const res = await ApiClient.get(`/api/files/${fileId}`, { responseType: "arraybuffer" });
            const ct = (res.headers as Record<string, string>)["content-type"] || "image/jpeg";
            const ext = ct.split("/")[1]?.split(";")[0] ?? "jpg";
            const safeName = f.displayName.replace(/[^\w.\-]/g, "_");
            const fileName = safeName.includes(".") ? safeName : `${safeName}.${ext}`;
            imgFolder.file(fileName, res.data as ArrayBuffer);
          } catch {
            // 개별 파일 실패는 건너뜀
          }
        }),
      );

      // metadata.json 생성
      const metadata = {
        exportedAt: new Date().toISOString(),
        case: {
          caseNumber,
          caseName,
          officer: officer || "—",
          createdAt: TODAY_DISPLAY,
        },
        summary: {
          totalFiles: compressed.length,
          totalOriginalSizeMB: +totalOriginal.toFixed(2),
          totalCompressedSizeMB: +totalAfter.toFixed(2),
          savedSizeMB: +totalSaved.toFixed(2),
          savedRate: `${totalRate.toFixed(1)}%`,
        },
        files: compressed.map((f) => ({
          fileName: f.displayName,
          fileId: f.uploadResult?.fileId ?? "",
          // 내보낸 시점의 처리 상태. 영상이 아직 처리 중이면 ZIP 에 파일이 빠져 있으므로
          // 기록을 남겨 둔다.
          processingStatus: f.processingStatus ?? null,
          includedInZip: f.viewable,
          originalSizeMB: f.original,
          compressedSizeMB: f.after,
          savedSizeMB: +Math.max(0, f.saved).toFixed(2),
          savedRate: `${f.rate.toFixed(1)}%`,
          autoDetections: {
            count: f.uploadResult?.detectionCount ?? 0,
            details: f.uploadResult?.detections ?? [],
          },
          reviewedBoxes: (() => {
            const boxes = reviewedBoxes[f.id] ?? [];
            return {
              count: boxes.length,
              details: boxes.map((b) => ({
                source: b.source ?? "auto",
                box_xyxy: [
                  Math.round(b.pxX),
                  Math.round(b.pxY),
                  Math.round(b.pxX + b.pxW),
                  Math.round(b.pxY + b.pxH),
                ],
              })),
            };
          })(),
        })),
      };
      zip.file(`${folderName}/metadata.json`, JSON.stringify(metadata, null, 2));

      // ZIP 다운로드 트리거
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      const skipped = compressed.filter((f) => !f.viewable).length;
      if (skipped > 0) {
        toast.warning(`${skipped}개 파일은 처리가 끝나지 않아 ZIP 에서 제외했습니다.`);
      } else {
        toast.success("다운로드가 완료되었습니다.");
      }
    } catch {
      toast.error("다운로드에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-[22px]">
      {/* 완료 헤더 */}
      <div className="flex justify-between items-start gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#e3f4ea] flex items-center justify-center text-[#1f9d55] shrink-0">
            <Check size={28} />
          </div>
          <div>
            <h2 className="text-[22px] font-extrabold text-[#1f2330] tracking-[-0.01em] mb-1">
              검수가 완료되었습니다.
            </h2>
            <p className="text-[13.5px] text-[#6b7388]">
              {pendingCount > 0
                ? `사건 파일이 저장되었습니다. 영상 ${pendingCount}개는 비식별화가 진행 중이며, 완료되면 이 화면에서 자동으로 갱신됩니다.`
                : "모자이크 처리 및 압축이 완료되어 사건 파일이 안전하게 저장되었습니다."}
            </p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-5 py-3 bg-[#1d2c4e] text-white text-[14px] font-bold hover:bg-[#2b3f6c] transition-colors rounded-[8px] shadow-[0_2px_8px_rgba(15,22,40,0.08)] disabled:bg-[#4a5e8a] disabled:cursor-not-allowed shrink-0"
        >
          {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {isDownloading ? "다운로드 중..." : "결과 다운로드 (ZIP)"}
        </button>
      </div>

      {/* 캐러셀 */}
      <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px] flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[16px] font-bold text-[#1f2330] flex items-center gap-2 whitespace-nowrap">
            <Image size={16} className="text-[#1d2c4e]" />
            최종 모자이크 결과 미리보기
          </h3>
          <span className="bg-[#f0f4fa] text-[#1d2c4e] text-[12px] font-bold px-[10px] py-[3px] rounded-full">
            총 {compressed.length}개
          </span>
        </div>

        <div className="relative overflow-hidden">
          <div
            className="flex gap-3"
            style={{
              transform: `translateX(calc(-${carouselStart} * (100% + 12px) / 3))`,
              transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              willChange: "transform",
            }}
          >
            {compressed.map((f) => (
              <div
                key={f.id}
                className="flex flex-col border border-[#e6e8ef] rounded-[10px] p-[10px] bg-white"
                style={{ flex: "0 0 calc((100% - 24px) / 3)", minWidth: 0 }}
              >
                <div className="w-full aspect-[4/3] bg-[#f0f1f5] rounded-[6px] overflow-hidden mb-2 relative">
                  <AuthedImage
                    src={f.viewable && !isVideoFile(f) ? f.storageUrl : null}
                    alt={f.displayName}
                    className="absolute inset-0 w-full h-full"
                    style={{ objectFit: "cover" }}
                    fallback={
                      !f.viewable ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#f5f6fa]">
                          <FileProcessingBadge
                            status={f.processingStatus}
                            progress={f.processingProgress}
                          />
                        </div>
                      ) : isVideoFile(f) ? (
                        <VideoThumb />
                      ) : (
                        <CompareScene mosaic variant={f.seed} />
                      )
                    }
                  />
                </div>
                <p className="text-[13px] font-semibold text-[#1f2330] truncate mb-1">
                  {f.displayName}
                </p>
                <p className="text-[12px] text-[#8a93a8] mb-2">{f.after.toFixed(2)} MB</p>
                <button
                  onClick={() => setPreviewFile(f)}
                  disabled={!f.viewable}
                  title={f.viewable ? undefined : describeFileStatus(f.processingStatus)?.description}
                  className="self-end inline-flex items-center gap-1 px-3 py-[6px] border border-[#d9deea] rounded-[6px] bg-white text-[#3a4055] text-[12px] font-semibold hover:bg-[#f3f4f8] hover:border-[#c5cbd9] transition-colors disabled:text-[#9aa1b3] disabled:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:hover:border-[#d9deea]"
                >
                  미리보기
                  <ExternalLink size={11} />
                </button>
              </div>
            ))}
          </div>

          {canPrev && (
            <button
              onClick={() => setCarouselStart((s) => Math.max(0, s - 1))}
              className="absolute w-10 h-10 bg-white border border-[#d9deea] rounded-full shadow-[0_4px_12px_rgba(15,22,40,0.12)] text-[#1d2c4e] flex items-center justify-center z-10 hover:bg-[#f7f8fb] transition-colors"
              style={{ top: "calc(50% - 35px)", left: -2, transform: "translateY(-50%)" }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {canNext && (
            <button
              onClick={() => setCarouselStart((s) => Math.min(compressed.length - 3, s + 1))}
              className="absolute w-10 h-10 bg-white border border-[#d9deea] rounded-full shadow-[0_4px_12px_rgba(15,22,40,0.12)] text-[#1d2c4e] flex items-center justify-center z-10 hover:bg-[#f7f8fb] transition-colors"
              style={{ top: "calc(50% - 35px)", right: -2, transform: "translateY(-50%)" }}
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      {/* 사건 정보 + 압축 요약 */}
      <div className="grid grid-cols-2 gap-[22px] items-stretch">
        <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px] flex flex-col">
          <h3 className="text-[16px] font-bold text-[#1f2330] flex items-center gap-2 mb-4 whitespace-nowrap">
            <Archive size={16} className="text-[#1d2c4e]" />
            사건 정보
          </h3>
          <div className="grid flex-1" style={{ gridTemplateColumns: "1fr 1fr", columnGap: 32 }}>
            {[
              { k: "사건 번호", v: caseNumber },
              { k: "사건명", v: caseName },
              { k: "사건 담당자", v: officer || "—" },
              { k: "생성 날짜", v: TODAY_DISPLAY },
              { k: "파일 개수", v: `${compressed.length}개` },
              { k: "원본 용량", v: `${totalOriginal.toFixed(2)} MB` },
              { k: "처리 후", v: `${totalAfter.toFixed(2)} MB` },
            ].map(({ k, v }) => (
              <div
                key={k}
                className="grid py-[10px] border-b border-[#f0f1f5] text-[13.5px]"
                style={{ gridTemplateColumns: "90px 1fr" }}
              >
                <span className="text-[#6b7388] font-medium">{k}</span>
                <span className="text-[#1f2330] font-bold">{v}</span>
              </div>
            ))}
            <div
              className="grid py-[10px] text-[13.5px] col-span-2"
              style={{ gridTemplateColumns: "90px 1fr" }}
            >
              <span className="text-[#6b7388] font-medium">최종 상태</span>
              <span>
                <span className="inline-block bg-[#e3f4ea] text-[#1f7a47] font-bold text-[12px] px-2 py-[3px] rounded-[5px]">
                  저장 완료
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px] flex flex-col">
          <h3 className="text-[16px] font-bold text-[#1f2330] flex items-center gap-2 mb-4 whitespace-nowrap">
            <BarChart2 size={16} className="text-[#1d2c4e]" />
            용량 변화 요약
          </h3>
          <div className="grid grid-cols-2 border border-[#eef0f5] rounded-[8px] overflow-hidden flex-1">
            {[
              { label: "원본 총 용량", value: `${totalOriginal.toFixed(2)} MB`, color: undefined },
              { label: "처리 후 총 용량", value: `${totalAfter.toFixed(2)} MB`, color: undefined },
              { label: "용량 변화", value: signed(totalSaved), color: deltaColor },
              { label: "변화율", value: signedRate(totalRate), color: deltaColor },
            ].map(({ label, value, color }, i) => (
              <div
                key={label}
                className="p-[16px_18px] flex flex-col justify-center"
                style={{
                  borderRight: i % 2 === 0 ? "1px solid #eef0f5" : undefined,
                  borderBottom: i < 2 ? "1px solid #eef0f5" : undefined,
                }}
              >
                <p className="text-[12.5px] text-[#6b7388] mb-[6px]">{label}</p>
                <p
                  className="text-[20px] font-extrabold tracking-[-0.01em]"
                  style={{ color: color ?? "#1f2330" }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 파일별 압축 정보 테이블 */}
      <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[16px] font-bold text-[#1f2330] flex items-center gap-2 whitespace-nowrap">
            <Activity size={16} className="text-[#1d2c4e]" />
            파일별 용량 변화
          </h3>
          <span className="bg-[#f0f4fa] text-[#1d2c4e] text-[12px] font-bold px-[10px] py-[3px] rounded-full whitespace-nowrap">
            총 {compressed.length}개
          </span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["파일명", "원본 용량", "처리 후 용량", "용량 변화", "변화율", "최종 상태", "미리보기"].map(
                (h, i) => (
                  <th
                    key={h}
                    className="text-left text-[12.5px] font-semibold text-[#6b7388] pb-3 border-b border-[#ebedf2]"
                    style={i === 6 ? { textAlign: "right" } : undefined}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {compressed.map((f) => (
              <tr key={f.id}>
                <td className="py-4 border-b border-[#f0f1f5] text-[13.5px] text-[#3a4055]">
                  <span className="inline-block w-[52px] h-[38px] rounded bg-[#f0f1f5] overflow-hidden align-middle mr-[14px] relative">
                    <AuthedImage
                      src={f.viewable && !isVideoFile(f) ? f.storageUrl : null}
                      alt={f.displayName}
                      className="absolute inset-0 w-full h-full"
                      style={{ objectFit: "cover" }}
                      fallback={
                        !f.viewable ? null : isVideoFile(f) ? (
                          <VideoThumb />
                        ) : (
                          <CompareScene mosaic variant={f.seed} />
                        )
                      }
                    />
                  </span>
                  <span className="font-semibold text-[#1f2330] align-middle">{f.displayName}</span>
                </td>
                <td className="py-4 border-b border-[#f0f1f5] text-[13.5px] text-[#3a4055]">
                  {f.original.toFixed(2)} MB
                </td>
                <td className="py-4 border-b border-[#f0f1f5] text-[13.5px] text-[#3a4055]">
                  {f.after.toFixed(2)} MB
                </td>
                <td
                  className="py-4 border-b border-[#f0f1f5] text-[13.5px]"
                  style={{ color: f.saved >= 0 ? "#1f9d55" : "#c2680a" }}
                >
                  {signed(f.saved)}
                </td>
                <td
                  className="py-4 border-b border-[#f0f1f5] text-[13.5px] font-bold"
                  style={{ color: f.rate >= 0 ? "#1f9d55" : "#c2680a" }}
                >
                  {signedRate(f.rate)}
                </td>
                <td className="py-4 border-b border-[#f0f1f5]">
                  {f.viewable ? (
                    <span className="inline-block bg-[#e3f4ea] text-[#1f7a47] font-bold text-[12px] px-2 py-[3px] rounded-[5px]">
                      저장 완료
                    </span>
                  ) : (
                    <FileProcessingBadge
                      status={f.processingStatus}
                      progress={f.processingProgress}
                    />
                  )}
                </td>
                <td className="py-4 border-b border-[#f0f1f5] text-right">
                  <button
                    onClick={() => setPreviewFile(f)}
                    disabled={!f.viewable}
                    title={f.viewable ? undefined : describeFileStatus(f.processingStatus)?.description}
                    className="inline-flex items-center gap-[6px] px-[14px] py-[7px] border border-[#d9deea] rounded-[6px] bg-white text-[#3a4055] text-[12.5px] font-semibold hover:bg-[#f3f4f8] transition-colors disabled:text-[#9aa1b3] disabled:bg-[#f7f8fb] disabled:cursor-not-allowed"
                  >
                    미리보기
                    <ExternalLink size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-[18px] bg-[#f5f6fa] border border-[#e6e8ef] rounded-[10px] px-[18px] py-[14px] text-center text-[13px] text-[#3a4055] flex items-center justify-center gap-2">
          <Info size={14} className="text-[#1d2c4e] shrink-0" />
          <span>
            모든 파일이 안전하게 저장되었습니다. 필요 시 "결과 다운로드" 버튼을 통해 전체 파일을 압축하여 다운로드할 수 있습니다.
          </span>
        </div>
      </div>

      {previewFile && (
        <PreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
