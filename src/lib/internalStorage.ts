/**
 * 내부 보관(NAS) 업로드 크기 제한 — 분할 업로드가 들어오기 전까지의 임시 조치.
 *
 * 표준 보관(S3)은 브라우저 → S3 presigned 직접 업로드라 Vercel 을 거치지 않지만,
 * 내부 보관은 멀티파트로 /api/files/upload·replace 에 보내 Vercel rewrite 를 지난다.
 * Vercel 은 요청 본문을 약 4.5MB 에서 413 으로 끊는다. 서버(Traefik·file-service)는
 * 50MB 까지 받지만 요청이 거기까지 가지 못한다.
 *
 * EC2 에 HTTPS 가 없어 브라우저가 직접 보낼 수도 없다(mixed content). 그래서 멀티파트
 * 오버헤드를 감안해 파일당 4MB 로 막고, 요청은 파일 하나씩 나눠 보낸다.
 */

import { formatFileSize } from "@/lib/filesize";

export const INTERNAL_POLICY = "internal";

export const INTERNAL_STORAGE_MAX_BYTES = 4 * 1024 * 1024;

export const INTERNAL_STORAGE_LIMIT_LABEL = formatFileSize(INTERNAL_STORAGE_MAX_BYTES);

export const INTERNAL_STORAGE_LIMIT_MESSAGE = `내부 보관은 현재 파일당 ${INTERNAL_STORAGE_LIMIT_LABEL} 이하만 가능합니다.`;

export function exceedsInternalStorageLimit(policy: string, sizeBytes: number): boolean {
  return policy === INTERNAL_POLICY && sizeBytes > INTERNAL_STORAGE_MAX_BYTES;
}
