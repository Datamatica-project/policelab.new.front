"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * 마지막 호출로부터 `delay` 동안 다시 호출되지 않았을 때만 실제로 실행되는 함수를 만든다.
 *
 * 검색어처럼 타이핑마다 바뀌는 값을 그대로 서버 조회에 쓰면 글자 수만큼 요청이 나간다.
 * 값을 effect 로 동기화하는 대신 이벤트 핸들러에서 바로 예약해, 불필요한 리렌더를 만들지 않는다.
 *
 * 반환되는 함수의 정체성은 `delay` 가 바뀌지 않는 한 유지되므로 의존성 배열에 그대로 넣어도 된다.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay = 300,
): (...args: A) => void {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최신 콜백을 참조로만 갱신한다. 콜백이 매 렌더 새로 만들어져도 예약된 타이머를 다시 걸지 않기 위해서다.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 언마운트 시 예약된 호출을 버린다 (사라진 화면의 상태를 갱신하지 않도록)
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return useCallback(
    (...args: A) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay],
  );
}
