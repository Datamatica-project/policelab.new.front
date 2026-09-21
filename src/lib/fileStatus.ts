/**
 * 파일 처리 상태 모델.
 *
 * 값은 백엔드 `FileProcessingStatus` (policelab_file_service) 와 1:1로 대응한다.
 *
 * 이미지·문서는 업로드 요청 안에서 비식별화가 끝나지만, 영상은 수 분에서 수십 분이
 * 걸려 업로드 응답 시점에 끝나 있지 않다. 그 사이 저장 경로는 아직 <b>비식별화 이전
 * 원본</b>을 가리키므로 백엔드가 다운로드·presigned URL 발급을 409 로 차단한다.
 * 프론트가 이 상태를 읽지 않으면 사용자는 이유 없이 깨진 미리보기만 보게 된다 —
 * 그래서 목록·완료 화면이 이 모듈을 통해 "처리 중"·"실패" 를 알려 주고 열람 동작을 막는다.
 */

export const FILE_PROCESSING_STATUS = {
  /** 업로드·비식별화 완료 (이미지의 기본 종료 상태) */
  UPLOADED: "UPLOADED",
  /** 수동 비식별화 결과로 교체됨 */
  REPLACED: "REPLACED",
  /** WebP 압축까지 완료 */
  COMPRESSED: "COMPRESSED",
  /** presigned PUT 자리만 예약된 상태 — 클라이언트가 아직 바이트를 올리지 않았다 */
  PENDING_UPLOAD: "PENDING_UPLOAD",
  /** 영상 비식별화가 Processing Service 에서 진행 중 */
  ANONYMIZING: "ANONYMIZING",
  /** 비식별화 최종 실패 — 파일은 보관되지만 열람이 차단된다 */
  ANONYMIZATION_FAILED: "ANONYMIZATION_FAILED",
} as const;

export type FileProcessingStatus =
  (typeof FILE_PROCESSING_STATUS)[keyof typeof FILE_PROCESSING_STATUS];

/** 아직 끝나지 않아 상태가 더 바뀔 값들. 폴링 대상이 된다. */
const IN_PROGRESS_STATUSES: readonly string[] = [
  FILE_PROCESSING_STATUS.ANONYMIZING,
  FILE_PROCESSING_STATUS.PENDING_UPLOAD,
];

/** 처리가 진행 중이라 조금 뒤 상태가 바뀔 파일인지. */
export function isFileProcessing(status: string | null | undefined): boolean {
  return status != null && IN_PROGRESS_STATUSES.includes(status);
}

/** 비식별화가 최종 실패해 격리된 파일인지. 수동 비식별화 후 재등록해야 풀린다. */
export function isFileQuarantined(status: string | null | undefined): boolean {
  return status === FILE_PROCESSING_STATUS.ANONYMIZATION_FAILED;
}

/**
 * 미리보기·다운로드를 시도해도 되는 상태인지.
 *
 * 상태를 모르는 경우(null, 구버전 응답, 처음 보는 값)는 열람 가능으로 본다.
 * 이미지·문서는 업로드 시점에 이미 처리가 끝나 있고, 확신 없이 UI 를 막으면 정상
 * 파일이 열리지 않는 쪽이 더 큰 문제다. 실제 차단의 정본은 백엔드(409)다.
 */
export function isFileViewable(status: string | null | undefined): boolean {
  return !isFileProcessing(status) && !isFileQuarantined(status);
}

export type FileStatusTone = "progress" | "danger";

export interface FileStatusPresentation {
  /** 배지에 쓰는 짧은 라벨 */
  label: string;
  /** 사용자가 다음에 무엇을 하면 되는지 알려 주는 한 줄 설명 */
  description: string;
  tone: FileStatusTone;
  /** 진행률(0~100). 모르면 null */
  progress: number | null;
}

function clampProgress(progress: number | null | undefined): number | null {
  if (progress == null || Number.isNaN(progress)) return null;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

/**
 * 상태를 화면 표현으로 바꾼다.
 *
 * @returns 알려야 할 상태가 없으면 null — 정상 파일에는 배지를 그리지 않는다.
 */
export function describeFileStatus(
  status: string | null | undefined,
  progress: number | null | undefined = null,
): FileStatusPresentation | null {
  if (isFileQuarantined(status)) {
    return {
      label: "비식별화 실패",
      description:
        "자동 비식별화가 실패해 열람이 차단된 파일입니다. 수동 비식별화 후 다시 등록해 주세요.",
      tone: "danger",
      progress: null,
    };
  }

  if (status === FILE_PROCESSING_STATUS.ANONYMIZING) {
    return {
      label: "비식별화 중",
      description: "영상 비식별화가 진행 중입니다. 완료되면 미리보기와 다운로드가 열립니다.",
      tone: "progress",
      progress: clampProgress(progress),
    };
  }

  if (status === FILE_PROCESSING_STATUS.PENDING_UPLOAD) {
    return {
      label: "업로드 대기",
      description: "업로드가 끝나지 않은 파일입니다. 다시 업로드해 주세요.",
      tone: "progress",
      progress: null,
    };
  }

  return null;
}
