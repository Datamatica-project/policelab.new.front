"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Eye, Download, File, Film, FileText, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { toast } from "sonner";
import JSZip from "jszip";
import { GetCaseDetail, UpdateCaseStatus, ApiClient, toFileApiPath, type FileListResponse, type CaseDetailResponse } from "@/lib/api";
import { useAuthedImage } from "@/hooks/useAuthedImage";
import { useVideoSource } from "@/hooks/useVideoSource";
import { useFileProcessingPoll } from "@/hooks/useFileProcessingPoll";
import FileProcessingBadge from "@/components/cases/FileProcessingBadge";
import { describeFileStatus, isFileViewable } from "@/lib/fileStatus";

const PER_PAGE = 12;

const STATUS_MAP: Record<string, string> = {
  OPEN: "진행중",
  CLOSED: "사건종료",
};

const STATUS_HEADER_STYLES: Record<string, string> = {
  진행중: "bg-[#dceaf7] text-[#1f5a8f]",
  사건종료: "bg-[#f9dcdc] text-[#a3282b]",
};

/**
 * 파일 본문을 인증이 실린 요청으로 받아 브라우저 다운로드를 띄운다.
 *
 * <a href> 로 직접 걸면 Authorization 헤더가 실리지 않아 NAS 저장 파일은 401 이 된다.
 */
async function downloadFile(file: FileListResponse) {
  const path = toFileApiPath(file.downloadUrl || file.url) ?? file.downloadUrl ?? file.url;
  const response = await ApiClient.get(path, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(response.data as Blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

/* ── PreviewModal ── */
function PreviewModal({ file, onClose }: { file: FileListResponse; onClose: () => void }) {
  const isImage = file.type?.startsWith("image");
  const isVideo = file.type?.startsWith("video");
  const viewable = isFileViewable(file.processingStatus);
  // 처리 중·격리된 파일은 백엔드가 409 로 막으므로 아예 요청하지 않는다.
  const { src: imageUrl } = useAuthedImage(viewable && !isVideo ? file.url : null);
  // 영상은 presigned URL 로 즉시 재생한다. 이미지처럼 blob 으로 통째로 받으면
  // 수백 MB 를 다 내려받을 때까지 재생기가 뜨지 않는다.
  const video = useVideoSource(viewable && isVideo ? file.id : null, file.url);
  const previewUrl = isVideo ? video.src : imageUrl;

  return (
    <div
      className="fixed inset-0 bg-[rgba(15,22,40,0.55)] flex items-center justify-center z-[200] p-10"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-[12px] overflow-hidden shadow-[0_24px_60px_rgba(15,22,40,0.25)]"
        style={{ maxWidth: "min(860px, calc(100vw - 80px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-[18px] border-b border-[#ebedf2]">
          <div>
            <h3 className="text-[16px] font-bold text-[#1f2330] m-0 truncate max-w-[600px]">{file.name}</h3>
            <p className="text-[12.5px] text-[#6b7388] mt-[2px]">{file.size} · {file.uploadDate}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[6px] text-[#6b7388] flex items-center justify-center hover:bg-[#f3f4f8] hover:text-[#1f2330] transition-colors ml-4 shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 bg-[#f5f6fa] flex items-center justify-center">
          {isImage && previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="block rounded-[8px] shadow-[0_4px_16px_rgba(15,22,40,0.10)]"
              style={{
                maxWidth: "min(800px, calc(100vw - 120px))",
                maxHeight: "calc(100vh - 220px)",
                width: "100%",
                height: "auto",
              }}
            />
          ) : isVideo && previewUrl ? (
            <video
              src={previewUrl}
              controls
              className="block rounded-[8px] shadow-[0_4px_16px_rgba(15,22,40,0.10)]"
              style={{
                maxWidth: "min(800px, calc(100vw - 120px))",
                maxHeight: "calc(100vh - 220px)",
              }}
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-3 text-[#9aa1b3] rounded-[8px] bg-white border border-[#e6e8ef]"
              style={{ width: "min(800px, calc(100vw - 120px))", aspectRatio: "16/9" }}
            >
              <FileText size={48} strokeWidth={1.2} />
              <span className="text-[14px] font-medium">{file.name}</span>
              {/* 영상이 준비 중인데 아무 설명이 없으면 "다운로드 전용 화면"으로 오해한다. */}
              {isVideo && video.isLoading && (
                <span className="text-[12.5px]">
                  {video.mode === "blob"
                    ? "영상을 불러오는 중입니다. 용량이 커서 시간이 걸릴 수 있습니다."
                    : "영상을 준비하는 중입니다..."}
                </span>
              )}
              {isVideo && video.isError && (
                <span className="text-[12.5px]">영상을 불러오지 못했습니다. 다운로드해 확인해 주세요.</span>
              )}
              <button
                onClick={() => { downloadFile(file).catch(() => toast.error("다운로드에 실패했습니다.")); }}
                className="mt-1 px-4 py-2 bg-[#1d2c4e] text-white text-[13px] font-semibold rounded-[6px] hover:bg-[#2b3f6c] transition-colors"
              >
                다운로드
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── FileCard ── */
function FileCard({
  file,
  checked,
  onCheck,
  onPreview,
}: {
  file: FileListResponse;
  checked: boolean;
  onCheck: (e: React.MouseEvent) => void;
  onPreview: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const status = describeFileStatus(file.processingStatus, file.processingProgress);
  const viewable = isFileViewable(file.processingStatus);

  // 타일에 쓸 수 있는 소스만 받아온다.
  //
  // 처리 중·격리된 파일은 백엔드가 409 로 막으므로 요청해 봐야 실패만 쌓인다.
  // 영상은 thumbnail(= 워커가 만든 포스터)이 있을 때만 받는다 — 없는데 file.url 로
  // 물러서면 목록을 열 때마다 타일 수만큼 '영상 전체'를 내려받아 버리게 된다
  // (S3 presigned 는 통과라 무해하지만, NAS·봉투 암호화 파일은 /api/files/{id} 경로라
  //  실제로 전부 다운로드된다).
  const isVideo = file.type?.startsWith("video") ?? false;
  const thumbSource = isVideo ? file.thumbnail : (file.thumbnail || file.url);
  const { src: previewUrl, isError: previewError } = useAuthedImage(
    viewable ? thumbSource : null,
  );

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewable) {
      toast.info(status?.description ?? "아직 다운로드할 수 없는 파일입니다.");
      return;
    }
    setIsDownloading(true);
    try {
      await downloadFile(file);
    } catch {
      toast.error("다운로드에 실패했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  // 미리보기를 열어도 빈 화면만 보이므로, 왜 볼 수 없는지 알려 주는 편이 낫다.
  const handlePreview = () => {
    if (!viewable) {
      toast.info(status?.description ?? "아직 열람할 수 없는 파일입니다.");
      return;
    }
    onPreview();
  };

  return (
    <div
      className={cn(
        "bg-white rounded-[10px] overflow-hidden flex flex-col transition-all duration-150 cursor-pointer",
        checked
          ? "border-[1.5px] border-[#1d2c4e] shadow-[0_0_0_3px_rgba(29,44,78,0.08)]"
          : "border border-[#e6e8ef] hover:border-[#c5cbd9] hover:shadow-[0_6px_18px_rgba(15,22,40,0.06)] hover:-translate-y-0.5",
      )}
      onClick={handlePreview}
    >
      {/* 썸네일 영역 */}
      <div className="w-full aspect-[4/3] bg-[#f0f2f5] relative overflow-hidden flex items-center justify-center">
        {status && (
          <div className="absolute top-[8px] right-[8px] z-10">
            <FileProcessingBadge status={file.processingStatus} progress={file.processingProgress} />
          </div>
        )}

        {previewUrl && !imgError && !previewError ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[#9aa1b3]">
            {file.type?.startsWith("video") ? (
              <Film size={32} strokeWidth={1.5} />
            ) : file.type?.startsWith("application") ? (
              <FileText size={32} strokeWidth={1.5} />
            ) : (
              <File size={32} strokeWidth={1.5} />
            )}
            <span className="text-[11px] uppercase">{file.type?.split("/")[1] ?? "file"}</span>
          </div>
        )}

        {/* 체크박스 */}
        <div
          className={cn(
            "absolute top-[8px] left-[8px] w-[20px] h-[20px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all duration-100 z-10",
            checked
              ? "bg-[#1d2c4e] border-[#1d2c4e]"
              : "bg-white/80 border-[#c5cbd9] hover:border-[#1d2c4e]",
          )}
          onClick={(e) => { e.stopPropagation(); onCheck(e); }}
        >
          {checked && <Check size={12} strokeWidth={3} className="text-white" />}
        </div>
      </div>

      <div className="px-4 pt-[14px] pb-[10px] flex flex-col gap-[6px]">
        <div
          className="text-[13.5px] font-bold text-[#1f2330] overflow-hidden text-ellipsis whitespace-nowrap tracking-[-0.01em]"
          title={file.name}
        >
          {file.name}
        </div>
        <div className="flex justify-between text-[12px] text-[#8a93a8]">
          <span>{file.size}</span>
          <span>{file.uploadDate}</span>
        </div>

        {status?.progress != null && (
          <div className="h-[3px] rounded-full bg-[#e8ecf4] overflow-hidden">
            <div
              className="h-full bg-[#2563EB] transition-[width] duration-500"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-[14px] px-4 pb-[14px] pt-[10px] border-t border-[#f0f1f5]">
        <button
          className={cn(
            "w-[22px] h-[22px] flex items-center justify-center rounded transition-colors",
            viewable
              ? "text-[#8a93a8] hover:text-[#1d2c4e] hover:bg-[#f3f4f8]"
              : "text-[#c5cbd9] cursor-not-allowed",
          )}
          onClick={(e) => { e.stopPropagation(); handlePreview(); }}
          title={viewable ? "미리보기" : status?.description}
        >
          <Eye size={17} />
        </button>
        <button
          className={cn(
            "w-[22px] h-[22px] flex items-center justify-center rounded transition-colors disabled:opacity-40",
            viewable
              ? "text-[#8a93a8] hover:text-[#1d2c4e] hover:bg-[#f3f4f8]"
              : "text-[#c5cbd9] cursor-not-allowed",
          )}
          onClick={handleDownload}
          disabled={isDownloading}
          title={viewable ? "다운로드" : status?.description}
        >
          <Download size={17} />
        </button>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function CaseFilesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [caseDetail, setCaseDetail] = useState<CaseDetailResponse | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<FileListResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await GetCaseDetail(id);
        setCaseDetail(data);
      } catch {
        setCaseDetail(null);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  // 빈 배열을 매 렌더 새로 만들면 아래 useMemo 가 계속 재계산된다.
  const rawFiles = useMemo(() => caseDetail?.files ?? [], [caseDetail]);

  // 영상은 업로드가 끝나도 비식별화가 진행 중이다. 처리 중인 파일만 따로 폴링해
  // 최신 상태를 덮어쓴다 (목록 전체를 다시 받지 않는 이유는 훅 주석 참고).
  const { statusById, pendingCount } = useFileProcessingPoll(rawFiles);

  const allFiles = useMemo(
    () =>
      rawFiles.map((file) => {
        const snapshot = statusById.get(file.id);
        if (!snapshot) return file;
        return {
          ...file,
          processingStatus: snapshot.processingStatus ?? file.processingStatus,
          processingProgress: snapshot.processingProgress ?? file.processingProgress,
          // 완료된 영상은 결과물로 저장 경로가 바뀌므로 URL 도 함께 갱신해야
          // 새로고침 없이 미리보기·다운로드가 열린다.
          url: snapshot.url ?? file.url,
          thumbnail: snapshot.thumbnail ?? file.thumbnail,
          downloadUrl: snapshot.downloadUrl ?? file.downloadUrl,
        };
      }),
    [rawFiles, statusById],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let arr = allFiles;
    if (q) arr = arr.filter((f) => f.name.toLowerCase().includes(q));
    if (sort === "newest") arr = [...arr].sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
    else if (sort === "oldest") arr = [...arr].sort((a, b) => a.uploadDate.localeCompare(b.uploadDate));
    else if (sort === "title") arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [allFiles, search, sort]);

  const resetPage = () => setCurrentPage(1);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pageFiles = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const pageNumbers = useMemo(() => {
    const count = Math.min(10, totalPages);
    const start = Math.max(1, Math.min(page - 4, totalPages - count + 1));
    return Array.from({ length: count }, (_, i) => start + i);
  }, [page, totalPages]);

  const statusLabel = STATUS_MAP[caseDetail?.status ?? ""] ?? "진행중";

  const handleStatusChange = async (label: string | null) => {
    if (!label || !caseDetail) return;
    const nextStatus = label === "사건종료" ? "CLOSED" : "OPEN";
    if (nextStatus === caseDetail.status) return;
    const prevStatus = caseDetail.status;
    setStatusUpdating(true);
    setCaseDetail({ ...caseDetail, status: nextStatus }); // 낙관적 갱신
    try {
      await UpdateCaseStatus(caseDetail.caseId, nextStatus);
      toast.success(
        nextStatus === "CLOSED" ? "사건을 종료했습니다." : "사건을 진행중으로 변경했습니다.",
      );
    } catch (err) {
      setCaseDetail((c) => (c ? { ...c, status: prevStatus } : c)); // 롤백
      const code = (err as { response?: { status?: number } })?.response?.status;
      toast.error(
        code === 403
          ? "상태 변경 권한이 없습니다 (생성자·담당자만 가능)."
          : "상태 변경에 실패했습니다.",
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const truncate = (str: string, max: number) =>
    str.length > max ? str.slice(0, max) + "…" : str;

  // 현재 페이지 전체 선택 여부
  const isAllPageSelected =
    pageFiles.length > 0 && pageFiles.every((f) => selectedIds.has(f.id));
  const isPartialSelected =
    pageFiles.some((f) => selectedIds.has(f.id)) && !isAllPageSelected;

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        pageFiles.forEach((f) => next.delete(f.id));
      } else {
        pageFiles.forEach((f) => next.add(f.id));
      }
      return next;
    });
  };

  const handleBulkDownload = async () => {
    const selected = allFiles.filter((f) => selectedIds.has(f.id));
    // 처리 중·격리된 파일은 백엔드가 409 로 막는다. 요청에 섞어 보내면 "일부 실패"로만
    // 보고되어 이유를 알 수 없으므로, 미리 걸러내고 몇 개를 왜 뺐는지 알려 준다.
    const targets = selected.filter((f) => isFileViewable(f.processingStatus));
    const skipped = selected.length - targets.length;

    if (targets.length === 0) {
      if (skipped > 0) toast.info("선택한 파일이 아직 처리 중이거나 열람이 차단된 상태입니다.");
      return;
    }
    if (skipped > 0) {
      toast.info(`${skipped}개 파일은 처리가 끝나지 않아 제외했습니다.`);
    }

    setIsBulkDownloading(true);
    try {
      const zip = new JSZip();
      const results = await Promise.allSettled(
        targets.map(async (f) => {
          const path = toFileApiPath(f.downloadUrl || f.url) ?? f.downloadUrl ?? f.url;
          const res = await ApiClient.get(path, { responseType: "blob" });
          zip.file(f.name, res.data as Blob);
        }),
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === targets.length) {
        toast.error("모든 파일 다운로드에 실패했습니다.");
        return;
      }

      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${caseDetail?.caseNumber ?? "files"}_selected.zip`;
      a.click();
      URL.revokeObjectURL(blobUrl);

      if (failed > 0) toast.warning(`${failed}개 파일은 다운로드에 실패했습니다.`);
      else toast.success(`${targets.length}개 파일을 다운로드했습니다.`);
    } catch {
      toast.error("일괄 다운로드에 실패했습니다.");
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const toggleOne = (fileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(fileId) ? next.delete(fileId) : next.add(fileId);
      return next;
    });
  };

  return (
    <div className="pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[14px] text-[#6b7388] mb-[10px]">
        <button
          onClick={() => router.push("/cases")}
          className="hover:text-[#1d2c4e] hover:underline transition-colors"
        >
          사건관리
        </button>
        <span className="text-[#c5cbd9]">&gt;</span>
        <button
          onClick={() => router.push("/cases")}
          className="hover:text-[#1d2c4e] hover:underline transition-colors max-w-[240px] truncate"
          title={caseDetail?.title}
        >
          {caseDetail ? truncate(caseDetail.title, 50) : "..."}
        </button>
        <span className="text-[#c5cbd9]">&gt;</span>
        <span className="text-[#1f2330] font-medium">파일</span>
      </nav>

      <h1 className="text-[32px] font-extrabold text-[#1f2330] tracking-[-0.02em] mb-2">
        파일 관리
      </h1>
      <p className="text-[14.5px] text-[#6b7388] mb-[22px]">
        사건에 대한 세부 작업 내역을 확인할 수 있습니다.
      </p>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-[22px]">
        {/* 좌측: 검색 + 정렬 */}
        <div className="relative min-w-[240px] max-w-[380px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9aa1b3]" />
          <input
            type="text"
            placeholder="파일명으로 검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            className="w-full pl-[38px] pr-3 py-[10px] border border-[#e2e5ec] rounded-[8px] bg-white text-[13.5px] text-[#3a4055] outline-none focus:border-[#2b3f6c] placeholder:text-[#9aa1b3]"
          />
        </div>

        <div className="w-px h-[22px] bg-[#e2e5ec]" />

        <Select
          value={sort}
          onValueChange={(v) => {
            if (v) { setSort(v); resetPage(); }
          }}
        >
          <SelectTrigger className="w-[110px] border-[#e2e5ec] bg-white text-[13.5px] text-[#3a4055] rounded-[8px] h-[42px]">
            <span>{{ newest: "최신순", oldest: "오래된순", title: "제목순" }[sort]}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">최신순</SelectItem>
            <SelectItem value="oldest">오래된순</SelectItem>
            <SelectItem value="title">제목순</SelectItem>
          </SelectContent>
        </Select>

        {/* 우측: 선택 카운트 + 일괄 다운로드 + 전체 선택 */}
        <div className="ml-auto flex items-center gap-3">
          {selectedIds.size > 0 && (
            <>
              <span className="text-[13px] text-[#1d2c4e] font-semibold bg-[#eef1f8] px-[10px] py-[6px] rounded-[6px]">
                {selectedIds.size}개 선택됨
              </span>
              <button
                onClick={handleBulkDownload}
                disabled={isBulkDownloading}
                className="flex items-center gap-[7px] h-[42px] px-[14px] bg-[#1d2c4e] text-white text-[13.5px] font-semibold rounded-[8px] hover:bg-[#2b3f6c] disabled:bg-[#4a5e8a] disabled:cursor-not-allowed transition-colors"
              >
                {isBulkDownloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                {isBulkDownloading ? "다운로드 중..." : "선택 다운로드"}
              </button>
            </>
          )}
          <button
            className="flex items-center gap-[8px] h-[42px] px-[14px] border border-[#e2e5ec] rounded-[8px] bg-white text-[13.5px] text-[#3a4055] hover:border-[#c5cbd9] hover:bg-[#f7f8fb] transition-colors select-none"
            onClick={toggleSelectAll}
            disabled={pageFiles.length === 0}
          >
            <div
              className={cn(
                "w-[16px] h-[16px] rounded-[4px] border-[1.5px] flex items-center justify-center transition-colors shrink-0",
                isAllPageSelected
                  ? "bg-[#1d2c4e] border-[#1d2c4e]"
                  : isPartialSelected
                    ? "bg-[#e8ecf4] border-[#1d2c4e]"
                    : "bg-white border-[#c5cbd9]",
              )}
            >
              {isAllPageSelected && <Check size={10} strokeWidth={3} className="text-white" />}
              {isPartialSelected && <div className="w-[8px] h-[1.5px] bg-[#1d2c4e] rounded-full" />}
            </div>
            {isAllPageSelected ? "전체 해제" : "전체 선택"}
          </button>
        </div>
      </div>

      {/* Case header */}
      {caseDetail && (
        <div className="flex items-center gap-3 mb-[22px] flex-wrap">
          <Select value={statusLabel} onValueChange={handleStatusChange} disabled={statusUpdating}>
            <SelectTrigger
              className={cn(
                "h-auto w-fit gap-1 rounded-[6px] border-transparent px-[12px] py-[6px] text-[12.5px] font-bold shadow-none focus-visible:ring-0",
                STATUS_HEADER_STYLES[statusLabel] ?? "bg-[#e5e8f0] text-[#4a5168]",
              )}
            >
              <span>{statusLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="진행중">진행중</SelectItem>
              <SelectItem value="사건종료">사건종료</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-[22px] font-bold text-[#1f2330] tracking-[-0.01em] flex items-center min-w-0">
            <span
              className="truncate max-w-[480px]"
              title={caseDetail.title.length > 50 ? caseDetail.title : undefined}
            >
              {truncate(caseDetail.title, 50)}
            </span>
            <span className="text-[#c5cbd9] mx-2 font-normal shrink-0">&gt;</span>
            <span className="text-[#6b7388] font-medium text-[20px] shrink-0">파일</span>
          </div>
        </div>
      )}

      {/* 처리 중 안내 — 카드가 왜 잠겨 있는지 설명한다 */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 mb-[18px] px-[14px] py-[11px] rounded-[8px] bg-[#eaf1fe] border border-[#c7d9fb] text-[13px] text-[#1d4ed8]">
          <Loader2 size={14} className="animate-spin shrink-0" />
          <span>
            {pendingCount}개 파일의 비식별화가 진행 중입니다. 완료되면 자동으로 갱신되며,
            그때까지 미리보기·다운로드가 차단됩니다.
          </span>
        </div>
      )}

      {/* File grid */}
      <div className="grid grid-cols-4 gap-[22px] mb-9">
        {isLoading ? (
          <div className="col-span-4 text-center py-16 text-[#9aa1b3] text-[13.5px]">
            불러오는 중...
          </div>
        ) : pageFiles.length === 0 ? (
          <div className="col-span-4 text-center py-16 text-[#9aa1b3] text-[13.5px]">
            {allFiles.length === 0 ? "이 사건에 등록된 파일이 없습니다." : "조건에 맞는 파일이 없습니다."}
          </div>
        ) : (
          pageFiles.map((f) => (
            <FileCard
              key={f.id}
              file={f}
              checked={selectedIds.has(f.id)}
              onCheck={() => toggleOne(f.id)}
              onPreview={() => setPreviewFile(f)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-[6px] py-2 pb-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="min-w-[34px] h-[34px] px-[10px] border border-[#e2e5ec] rounded-[6px] bg-white text-[#6b7388] flex items-center justify-center hover:border-[#c5cbd9] hover:bg-[#f7f8fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
          </button>

          {pageNumbers.map((n) => (
            <button
              key={n}
              onClick={() => setCurrentPage(n)}
              className={cn(
                "min-w-[34px] h-[34px] px-[10px] border rounded-[6px] text-[13px] font-medium flex items-center justify-center transition-colors",
                n === page
                  ? "bg-[#1d2c4e] border-[#1d2c4e] text-white"
                  : "bg-white border-[#e2e5ec] text-[#3a4055] hover:border-[#c5cbd9] hover:bg-[#f7f8fb]",
              )}
            >
              {n}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="min-w-[34px] h-[34px] px-[10px] border border-[#e2e5ec] rounded-[6px] bg-white text-[#6b7388] flex items-center justify-center hover:border-[#c5cbd9] hover:bg-[#f7f8fb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {previewFile && (
        <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}
