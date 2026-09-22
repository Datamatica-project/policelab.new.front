import { AxiosError } from "axios";

/**
 * 서버가 보낸 실패 사유를 꺼낸다.
 *
 * 서버는 왜 실패했는지 정확히 알려준다 — 예를 들어 종결된 사건을 수정하려 하면
 * "종결된 사건에는 파일을 추가하거나 수정할 수 없습니다" 가 내려온다. 이걸 버리고
 * "수정에 실패했습니다" 만 띄우면, 사용자는 사건을 다시 열어야 한다는 걸 알 수 없다.
 *
 * 응답 형태가 서비스마다 다르다:
 * - file_service : `{ code, message }`
 * - auth_service : `{ resultCode, errorCode, message, data }`
 * 둘 다 `message` 를 갖고 있으므로 그 값을 쓴다.
 */
interface ServerErrorBody {
  message?: unknown;
  error?: unknown;
}

/** 사용자에게 그대로 보여줄 만한 메시지인지 (빈 문자열·객체·스택 등을 거른다) */
function isDisplayable(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const body = (error as AxiosError<ServerErrorBody>)?.response?.data;

  if (body) {
    if (isDisplayable(body.message)) return body.message;
    if (isDisplayable(body.error)) return body.error;
  }

  return fallback;
}
