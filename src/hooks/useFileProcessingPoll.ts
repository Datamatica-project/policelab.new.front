"use client";

import { useEffect, useMemo, useState } from "react";
import { GetFileProcessingDetail, type FileProcessingDetail } from "@/lib/api";
import { isFileProcessing } from "@/lib/fileStatus";

/** 폴링에 필요한 최소 정보. 목록 응답이든 업로드 응답이든 이 모양으로 맞춰 넘긴다. */
export interface PollableFile {
  id: string;
  processingStatus?: string | null;
}

export interface FileStatusSnapshot {
  processingStatus: string | null;
  processingProgress: number | null;
  /**
   * 완료 후 갱신된 URL. 영상은 비식별화 결과물로 저장 경로가 바뀌므로, 업로드 시점에
   * 받아 둔 URL 을 계속 쓰면 완료 후에도 열람이 되지 않는다.
   */
  url: string | null;
  thumbnail: string | null;
  downloadUrl: string | null;
  /** 연속 조회 실패 횟수. 한계를 넘으면 해당 파일 폴링을 포기한다 */
  failures: number;
}

/**
 * 폴링 주기(ms).
 *
 * 백엔드 리컨실러는 10초마다 돌고 같은 job 을 15초 간격으로 재조회하므로 진행률이
 * 갱신되는 실제 간격은 그쪽에 묶인다. 5초는 "완료를 곧바로 알아차리는" 용도다.
 */
const DEFAULT_INTERVAL_MS = 5_000;

/**
 * 이만큼 연속으로 조회가 실패하면 해당 파일 폴링을 멈춘다.
 *
 * 영상 처리는 수십 분까지 걸릴 수 있어, 포기하지 않으면 서버가 내려간 동안 한 탭이
 * 끝없이 실패 요청을 보낸다. 새로고침하면 다시 시작된다.
 */
const MAX_CONSECUTIVE_FAILURES = 5;

function toSnapshot(detail: FileProcessingDetail): FileStatusSnapshot {
  return {
    processingStatus: detail.processingStatus ?? null,
    processingProgress: detail.processingProgress ?? null,
    url: detail.url ?? null,
    thumbnail: detail.thumbnail ?? null,
    downloadUrl: detail.downloadUrl ?? null,
    failures: 0,
  };
}

function withFailure(prev: FileStatusSnapshot | undefined): FileStatusSnapshot {
  return {
    processingStatus: prev?.processingStatus ?? null,
    processingProgress: prev?.processingProgress ?? null,
    url: prev?.url ?? null,
    thumbnail: prev?.thumbnail ?? null,
    downloadUrl: prev?.downloadUrl ?? null,
    failures: (prev?.failures ?? 0) + 1,
  };
}

export interface FileProcessingPoll {
  /** 파일 ID → 마지막으로 조회한 상태. 아직 조회하지 않은 파일은 들어 있지 않다 */
  statusById: Map<string, FileStatusSnapshot>;
  /** 지금 폴링 중인 파일 수. 0 이면 타이머도 돌지 않는다 */
  pendingCount: number;
}

/**
 * 처리 중인 파일의 상태를 주기적으로 다시 읽어 온다.
 *
 * 목록 전체(`GET /api/cases/{id}`)를 다시 받지 않고 처리 중인 파일만
 * `GET /api/files/{id}/detail` 로 조회한다. 목록을 통째로 갱신하면 S3 파일의
 * presigned URL 이 매번 새로 서명되어 <b>모든</b> 카드의 이미지가 5초마다 다시
 * 내려받아지기 때문이다.
 *
 * 호출부는 매 렌더 새 배열을 넘겨도 된다 — 폴링 대상 ID 집합이 그대로면 타이머를
 * 다시 걸지 않는다.
 *
 * @param files 상태를 감시할 파일 목록
 * @param intervalMs 폴링 주기. 기본 5초
 */
export function useFileProcessingPoll(
  files: readonly PollableFile[],
  intervalMs: number = DEFAULT_INTERVAL_MS,
): FileProcessingPoll {
  const [snapshots, setSnapshots] = useState<Record<string, FileStatusSnapshot>>({});

  // 폴링 대상: 아직 처리 중이고, 연속 실패로 포기하지 않은 파일.
  // 스냅샷의 상태가 목록의 상태보다 최신이므로 그쪽을 우선한다.
  const pendingIds = files
    .filter((file) => {
      const snapshot = snapshots[file.id];
      const status = snapshot?.processingStatus ?? file.processingStatus;
      return (
        isFileProcessing(status) && (snapshot?.failures ?? 0) < MAX_CONSECUTIVE_FAILURES
      );
    })
    .map((file) => file.id);

  // 배열이 아니라 문자열을 의존성으로 쓴다 — 대상이 그대로면 effect 가 재실행되지 않는다.
  const pendingKey = pendingIds.join(",");

  useEffect(() => {
    if (!pendingKey) return;

    const ids = pendingKey.split(",");
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      timer = setTimeout(tick, intervalMs);
    };

    const tick = async () => {
      // 백그라운드 탭은 건너뛴다. 영상 처리는 수십 분까지 걸리므로, 열어 둔 채
      // 잊은 탭이 그동안 계속 요청을 보내게 두면 안 된다.
      if (typeof document !== "undefined" && document.hidden) {
        schedule();
        return;
      }

      const results = await Promise.allSettled(
        ids.map((id) => GetFileProcessingDetail(id)),
      );
      if (cancelled) return;

      setSnapshots((prev) => {
        const next = { ...prev };
        results.forEach((result, index) => {
          const id = ids[index];
          next[id] =
            result.status === "fulfilled"
              ? toSnapshot(result.value)
              : withFailure(prev[id]);
        });
        return next;
      });

      schedule();
    };

    // 첫 조회는 한 주기 뒤에 한다 — 호출부가 방금 받아 온 목록이 이미 최신이다.
    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pendingKey, intervalMs]);

  const statusById = useMemo(() => new Map(Object.entries(snapshots)), [snapshots]);

  return { statusById, pendingCount: pendingIds.length };
}
