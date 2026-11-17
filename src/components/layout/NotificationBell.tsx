"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GetAdminNotifications,
  MarkAllNotificationsRead,
  MarkNotificationRead,
  type AdminNotification,
} from "@/lib/api";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

/** 패널에 보여 주는 최근 알림 수 */
const PANEL_SIZE = 20;

/** "3분 전" 같은 상대 시각. 하루가 넘으면 날짜로 보여 준다. */
function formatRelative(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "방금 전";
  if (diffSec < 3_600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86_400) return `${Math.floor(diffSec / 3_600)}시간 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

/**
 * 관리자 알림 버튼과 알림 목록 패널. 관리자가 아니면 아무것도 그리지 않는다.
 *
 * 사이드바 하단에 놓이고, 패널은 사이드바 오른쪽으로 펼쳐진다.
 */
export default function NotificationBell() {
  const { isAdmin, unreadCount, refresh } = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    GetAdminNotifications({ size: PANEL_SIZE })
      .then(setItems)
      .catch(() => toast.error("알림을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  };

  // 패널 바깥 클릭·Esc 로 닫는다.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!isAdmin) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  const markRead = (target: AdminNotification) => {
    if (target.read) return;
    MarkNotificationRead(target.id)
      .then(() => {
        setItems((prev) => prev.map((n) => (n.id === target.id ? { ...n, read: true } : n)));
        refresh();
      })
      .catch(() => toast.error("읽음 처리에 실패했습니다."));
  };

  const markAllRead = () => {
    MarkAllNotificationsRead()
      .then(() => {
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        refresh();
      })
      .catch(() => toast.error("모두 읽음 처리에 실패했습니다."));
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={toggle}
        aria-label={`관리자 알림 ${unreadCount}건`}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-colors",
          open ? "text-white bg-white/10" : "text-white/50 hover:text-white hover:bg-white/10",
        )}
      >
        <Bell size={16} className={unreadCount > 0 ? "text-[#FBC707]" : ""} />
        <span className="flex-1 text-left">관리자 알림</span>
        {unreadCount > 0 && (
          <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-[228px] bottom-6 z-50 w-[380px] max-h-[520px] flex flex-col rounded-[10px] bg-white shadow-xl border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">관리자 알림</p>
              <p className="text-[11px] text-gray-400">처리 실패·무결성 이상 등 확인이 필요한 항목</p>
            </div>
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-500"
            >
              <CheckCheck size={14} />
              모두 읽음
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-gray-400">불러오는 중…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-gray-400">알림이 없습니다.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={cn(
                    "w-full text-left flex gap-3 px-4 py-3 border-b border-gray-50 transition-colors",
                    n.read ? "bg-white hover:bg-gray-50" : "bg-blue-50/40 hover:bg-blue-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-[5px] w-2 h-2 rounded-full shrink-0",
                      n.read ? "bg-gray-300" : n.severity === "CRITICAL" ? "bg-red-500" : "bg-amber-400",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[13px] truncate",
                          n.read ? "text-gray-500" : "text-gray-900 font-semibold",
                        )}
                      >
                        {n.title}
                      </span>
                      {n.severity === "CRITICAL" && !n.read && (
                        <span className="shrink-0 text-[10px] font-semibold text-red-600 bg-red-50 rounded px-1.5 py-[1px]">
                          긴급
                        </span>
                      )}
                    </div>
                    {n.message && (
                      <p className="mt-0.5 text-[12px] leading-snug text-gray-500 line-clamp-2">{n.message}</p>
                    )}
                    <p className="mt-1 text-[11px] text-gray-400 truncate">
                      {n.resource ? `${n.resource} · ` : ""}
                      {formatRelative(n.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
