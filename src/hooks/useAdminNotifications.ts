"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GetUnreadNotificationCount } from "@/lib/api";

/**
 * 안 읽은 알림 개수를 확인하는 주기(ms).
 *
 * 관리자 알림은 "놓치지 않는 것"이 목적이지 초 단위 즉시성이 필요한 것은 아니다.
 * 탭이 백그라운드에 있으면 확인하지 않고, 다시 보이는 순간 한 번 확인한다.
 */
const POLL_INTERVAL_MS = 30_000;

export interface AdminNotificationState {
  /**
   * 관리자인지. 서버 응답을 받기 전에는 null — 그동안 버튼을 그리지 않는다.
   * 로그인 응답에 역할이 없으므로 알림 API 의 403 여부로 판단한다 (실제 차단은 서버가 한다).
   */
  isAdmin: boolean | null;
  unreadCount: number;
  /** 읽음 처리 직후처럼 즉시 개수를 다시 받아야 할 때 호출한다 */
  refresh: () => void;
}

function statusOf(error: unknown): number | undefined {
  return error instanceof Object && "response" in error
    ? (error as { response?: { status?: number } }).response?.status
    : undefined;
}

export function useAdminNotifications(): AdminNotificationState {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  // 403 을 한 번 받으면 이 세션에서는 다시 묻지 않는다 — 일반 사용자가 30초마다
  // 403 을 쌓을 이유가 없다.
  const forbidden = useRef(false);

  const refresh = useCallback(() => {
    if (forbidden.current) return;
    GetUnreadNotificationCount()
      .then((count) => {
        setIsAdmin(true);
        setUnreadCount(count);
      })
      .catch((error: unknown) => {
        if (statusOf(error) === 403) {
          forbidden.current = true;
          setIsAdmin(false);
        }
        // 그 밖의 실패(서버 재시작, 네트워크)는 직전 값을 유지하고 다음 주기에 다시 묻는다.
      });
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { isAdmin, unreadCount, refresh };
}
