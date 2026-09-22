/**
 * 파일 크기 표시 유틸.
 *
 * MB 로만 환산해 반올림하면 작은 파일이 전부 `0.0 MB` 가 되고, 0 을 falsy 로 걸러내는
 * 폴백(`|| 1.0`)까지 얹히면 1KB 짜리가 `1MB` 로 표시된다. 단위를 크기에 맞춰 고른다.
 */

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
const STEP = 1024;

/**
 * 바이트 수를 사람이 읽는 문자열로 바꾼다. (예: 1086 → "1.1 KB")
 *
 * 값이 없거나 음수면 "—" 를 돌려줘, 화면에 `NaN` 이나 잘못된 0 이 노출되지 않게 한다.
 */
export function formatFileSize(bytes?: number | null): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";

  let value = bytes;
  let unit = 0;
  while (value >= STEP && unit < UNITS.length - 1) {
    value /= STEP;
    unit += 1;
  }

  // 바이트 단위는 소수점이 의미 없고, 세 자리 이상이면 소수점이 잡음이 된다
  const digits = unit === 0 ? 0 : value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}

/** 바이트 → MB (반올림 없이). 용량 변화 계산처럼 합산이 필요한 곳에서 쓴다. */
export function toMegabytes(bytes: number): number {
  return bytes / (STEP * STEP);
}
