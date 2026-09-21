"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GetFileProcessingDetail,
  GetVideoDetections,
  type VideoDetectionsDocument,
  type VideoDetectionsInfo,
} from "@/lib/api";
import { useAuthedImage } from "@/hooks/useAuthedImage";
import { FILE_PROCESSING_STATUS, isFileProcessing } from "@/lib/fileStatus";

/**
 * 사건 생성 3단계에서 <b>영상</b>의 처리 상태와 결과를 보여 준다.
 *
 * <p>이미지 자리에 쓰이던 CompareScene 은 쓸 수 없다. 그건 만화 그림을 그리는 자리
 * 채움이라 영상에 그리면 <b>있지도 않은 결과</b>를 보여 주게 된다. 게다가 영상은
 * 비식별화 후 원본을 화면에 띄우지 않으므로(그 시점의 원본은 가려지지 않은 파일이다)
 * 전/후 슬라이더 자체가 성립하지 않는다.
 *
 * <p>그래서 여기서는 세 가지만 한다: 진행률, 완료된 결과 재생, 검출 요약.
 */

interface Props {
  fileId: string;
  /** 업로드 직후 화면에 표시할 로컬 원본 URL (아직 처리 중일 때의 자리 채움) */
  fallbackLabel?: string;
  onOpenManualEdit?: (videoUrl: string | null) => void;
  /** 폴링 주기(ms). 처리 중에만 돈다. */
  intervalMs?: number;
  /**
   * 값이 바뀌면 폴링을 처음부터 다시 시작한다.
   *
   * <p>폴링은 처리가 끝나면 스스로 멈춘다. 그래서 수동 보정을 요청해 파일이 다시
   * ANONYMIZING 으로 돌아가도 패널은 그 사실을 영영 알지 못하고, 진행률도 새 결과도
   * 나타나지 않는다. 보정을 건 쪽이 이 값을 올려 깨워 줘야 한다.
   */
  reloadKey?: number;
}

const DEFAULT_INTERVAL_MS = 4000;

export default function VideoResultPanel({
  fileId,
  fallbackLabel,
  onOpenManualEdit,
  intervalMs = DEFAULT_INTERVAL_MS,
  reloadKey = 0,
}: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [info, setInfo] = useState<VideoDetectionsInfo | null>(null);
  const [doc, setDoc] = useState<VideoDetectionsDocument | null>(null);

  const processing = status != null && isFileProcessing(status);
  const failed = status === FILE_PROCESSING_STATUS.ANONYMIZATION_FAILED;

  // ── 상태 폴링 ───────────────────────────────────────────────────────────────
  // 처리가 끝나면 스스로 멈춘다. 완료된 파일을 계속 조회해 봐야 같은 값만 돌아오고,
  // 위저드에 파일이 여러 개면 그 횟수만큼 불필요한 요청이 곱해진다.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const detail = await GetFileProcessingDetail(fileId);
        if (cancelled) return;
        setStatus(detail.processingStatus ?? null);
        setProgress(detail.processingProgress ?? null);
        setResultUrl(detail.url ?? null);

        if (detail.processingStatus && isFileProcessing(detail.processingStatus)) {
          timer = setTimeout(tick, intervalMs);
        }
      } catch {
        // 일시 오류는 다음 주기에 회복된다. 화면에 에러를 띄우면 처리 중 잠깐의
        // 네트워크 흔들림이 실패처럼 보인다.
        if (!cancelled) timer = setTimeout(tick, intervalMs);
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fileId, intervalMs, reloadKey]);

  // ── 완료 후 검출 기록 ───────────────────────────────────────────────────────
  useEffect(() => {
    if (processing || failed || status == null) return;
    let cancelled = false;
    GetVideoDetections(fileId)
      .then((detInfo) => {
        if (cancelled) return;
        setInfo(detInfo);
        if (detInfo.document) setDoc(detInfo.document);
      })
      .catch(() => {
        /* 검출 표시는 부가 정보다. 실패해도 결과 재생은 그대로 보여 준다. */
      });
    return () => {
      cancelled = true;
    };
  }, [fileId, processing, failed, status, reloadKey]);

  const authed = useAuthedImage(processing ? null : resultUrl);

  const summary = useMemo(() => {
    if (!doc) return null;
    const perClass = new Map<string, number>();
    let total = 0;
    for (const [, boxes] of doc.frames) {
      for (const box of boxes) {
        perClass.set(box[1], (perClass.get(box[1]) ?? 0) + 1);
        total += 1;
      }
    }
    return { total, perClass, frames: doc.frames.length, frameCount: doc.frame_count };
  }, [doc]);

  if (processing) {
    const pct = progress ?? 0;
    return (
      <div className="flex min-h-[320px] w-full flex-col items-center justify-center gap-3 rounded-[6px] bg-[#f5f6fa] p-6">
        <p className="text-sm font-medium text-[#1f2330]">비식별화 처리 중</p>
        <div className="h-2 w-full max-w-[280px] overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[#1f2a52] transition-[width] duration-500"
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
        <p className="text-xs tabular-nums text-gray-500">{pct}%</p>
        <p className="max-w-[320px] text-center text-[11px] leading-relaxed text-gray-400">
          영상은 프레임마다 검출·블러를 거쳐 수 분이 걸립니다.
          이 화면을 떠나도 처리는 계속됩니다.
        </p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex min-h-[320px] w-full flex-col items-center justify-center gap-2 rounded-[6px] bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-700">비식별화에 실패했습니다</p>
        <p className="max-w-[320px] text-center text-xs leading-relaxed text-red-600">
          파일은 격리되어 다운로드가 차단됩니다.
          수동으로 비식별화한 파일을 올려 교체해 주세요.
        </p>
      </div>
    );
  }

  // 높이는 영상 비율로 정한다. flex-1 은 부모에 확정 높이가 있어야 하는데 이 패널은
  // min-height 만 가진 컨테이너 안에 들어가므로 0 으로 접힌다.
  const ratio = doc ? `${doc.width} / ${doc.height}` : "16 / 9";

  return (
    <div className="flex w-full flex-col gap-2">
      <div
        className="relative w-full overflow-hidden rounded-[6px] bg-black"
        style={{ aspectRatio: ratio }}
      >
        {authed.src ? (
          <video src={authed.src} controls className="absolute inset-0 h-full w-full" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-xs text-gray-400">
            {authed.isError ? "결과 영상을 불러오지 못했습니다" : (fallbackLabel ?? "불러오는 중…")}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="text-gray-600">
          {summary ? (
            <>
              <span className="font-semibold text-[#1f2330]">{summary.total}건</span> 비식별화
              {summary.perClass.size > 0 && (
                <span className="ml-1 text-gray-400">
                  ({Array.from(summary.perClass).map(([k, v]) => `${k} ${v}`).join(", ")})
                </span>
              )}
              <span className="ml-1 text-gray-400">
                · {summary.frames}/{summary.frameCount} 프레임
              </span>
            </>
          ) : (
            <span className="text-gray-400">
              {info?.unavailableReason ?? "검출 정보를 불러오는 중…"}
            </span>
          )}
        </div>

        {onOpenManualEdit && (
          <button
            onClick={() => onOpenManualEdit(authed.src)}
            disabled={!info?.correctable}
            title={info?.correctable ? undefined : (info?.unavailableReason ?? undefined)}
            className="shrink-0 rounded border px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
          >
            수동 보정
          </button>
        )}
      </div>
    </div>
  );
}
