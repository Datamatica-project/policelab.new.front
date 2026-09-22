/**
 * 사건 발생일시(occurredAt) 변환 유틸.
 *
 * 서버의 `occurredAt` 은 타임존이 없는 `LocalDateTime` 이다. 즉 이 값은 특정 순간이
 * 아니라 "현지 벽시계 시각"이며, 그대로 주고받아야 한다.
 *
 * `new Date(v).toISOString()` 으로 UTC 로 바꿔 보내면 KST 기준 9시간 밀린 값이
 * 저장된다. 게다가 저장된 값을 다시 읽어 수정·저장하면 그 위에 또 밀린다 —
 * 사건 제목만 고쳐도 발생일시가 매번 과거로 이동한다.
 *
 * 그래서 이 모듈은 어느 방향으로도 타임존 변환을 하지 않는다.
 */

/** "YYYY-MM-DDTHH:mm" — datetime-local 입력이 쓰는 길이 */
const INPUT_LENGTH = 16;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Date 를 현지 벽시계 기준 `YYYY-MM-DDTHH:mm:ss` 로 만든다.
 *
 * `toISOString()` 과 달리 UTC 로 옮기지 않는다. 서버에 보낼 값을 만들 때 쓴다.
 */
export function toLocalDateTimeString(date: Date): string {
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const hms = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${ymd}T${hms}`;
}

/**
 * 서버가 준 occurredAt 을 `<input type="datetime-local">` 값으로 바꾼다.
 *
 * 서버 값은 이미 현지 벽시계 시각이므로 앞 16자만 쓰면 된다. 날짜만 있는 값
 * (`YYYY-MM-DD`)은 자정으로 채우고, 혹시 UTC 표기(`...Z`)가 섞여 들어오면
 * 그때만 현지 시각으로 환산한다.
 */
export function toDateTimeLocalInput(value?: string | null): string {
  if (!value) return "";

  if (value.endsWith("Z")) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : toLocalDateTimeString(parsed).slice(0, INPUT_LENGTH);
  }

  if (value.length === 10) return `${value}T00:00`;

  return value.slice(0, INPUT_LENGTH);
}

/**
 * `<input type="datetime-local">` 값을 서버 전송용 `YYYY-MM-DDTHH:mm:ss` 로 바꾼다.
 *
 * 비어 있으면 undefined 를 돌려줘 호출부가 해당 필드를 아예 보내지 않게 한다.
 */
export function fromDateTimeLocalInput(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length === INPUT_LENGTH ? `${trimmed}:00` : trimmed;
}

/** occurredAt 에서 목록 카드에 쓰는 `YYYY-MM-DD` 만 뽑는다 */
export function toDateOnly(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}
