"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { GetUserList, type UserResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AssigneePickerProps {
  /** 현재 담당자 이메일 (없으면 빈 문자열) */
  value: string;
  onChange: (email: string) => void;
  placeholder?: string;
}

/**
 * 등록된 사용자 중에서만 담당자를 고르게 하는 선택기.
 *
 * 자유 입력 필드로 두면 오타가 그대로 저장된다. 담당자는 단순 표시용이 아니라
 * 사건 수정·종료 권한의 판정 기준(createdBy 또는 assignedTo)이라, 이메일 한 글자만
 * 틀려도 해당 동료의 접근 권한이 조용히 사라지고 아무도 담당자가 아닌 사건이 된다.
 */
export default function AssigneePicker({ value, onChange, placeholder }: AssigneePickerProps) {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await GetUserList();
        if (!cancelled) setUsers(data);
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 바깥 클릭 시 목록을 닫는다
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const selected = useMemo(() => users.find((u) => u.email === value), [users, value]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  /**
   * 목록에 없는 이메일이 이미 저장돼 있을 수 있다 (이 선택기가 생기기 전 데이터).
   * 조용히 지우면 사용자가 눈치채지 못하므로, 그대로 보여주되 경고를 붙인다.
   */
  const hasUnknownValue = Boolean(value) && !selected && !isLoading && !loadFailed;

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        <div className="flex items-center gap-[8px] rounded-[8px] border border-[#e2e5ec] bg-white px-[12px] py-[9px]">
          <span
            className={cn(
              "flex size-[24px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
              hasUnknownValue ? "bg-[#fdecec] text-[#d33b3b]" : "bg-[#eef2fb] text-[#2b3f6c]",
            )}
          >
            {(selected?.name ?? value)[0]}
          </span>
          <span className="truncate text-[13.5px] text-[#1f2330]">
            {selected ? (
              <>
                <span className="font-medium">{selected.name}</span>
                <span className="ml-[6px] text-[#9aa1b3]">{selected.email}</span>
              </>
            ) : (
              value
            )}
          </span>
          <button
            type="button"
            aria-label="담당자 지우기"
            onClick={() => onChange("")}
            className="ml-auto text-[#9aa1b3] transition-colors hover:text-[#3a4055]"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full rounded-[8px] border border-[#e2e5ec] bg-white px-[12px] py-[10px] text-left text-[13.5px] text-[#9aa1b3] transition-colors hover:border-[#c5cbd9]"
        >
          {placeholder ?? "담당자를 선택하세요"}
        </button>
      )}

      {hasUnknownValue && (
        <p className="mt-[6px] text-[12px] text-[#d33b3b]">
          등록된 사용자 목록에 없는 담당자입니다. 다시 선택해 주세요.
        </p>
      )}

      {value && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-[6px] text-[12.5px] font-medium text-[#2b3f6c] hover:underline"
        >
          담당자 변경
        </button>
      )}

      {open && (
        <div className="absolute z-20 mt-[6px] w-full rounded-[10px] border border-[#e2e5ec] bg-white shadow-lg">
          <div className="relative border-b border-[#eef0f4] p-[8px]">
            <Search className="absolute left-[18px] top-1/2 size-4 -translate-y-1/2 text-[#9aa1b3]" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 또는 이메일 검색..."
              className="w-full rounded-[7px] bg-[#f7f8fb] py-[8px] pl-[32px] pr-[10px] text-[13px] text-[#3a4055] outline-none placeholder:text-[#9aa1b3]"
            />
          </div>

          <div className="max-h-[210px] overflow-y-auto p-[4px]">
            {isLoading ? (
              <p className="flex items-center justify-center gap-[6px] py-[22px] text-[13px] text-[#9aa1b3]">
                <Loader2 size={14} className="animate-spin" />
                불러오는 중...
              </p>
            ) : loadFailed ? (
              <p className="py-[22px] text-center text-[13px] text-[#d33b3b]">
                사용자 목록을 불러오지 못했습니다.
              </p>
            ) : filtered.length === 0 ? (
              <p className="py-[22px] text-center text-[13px] text-[#9aa1b3]">
                일치하는 사용자가 없습니다.
              </p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => {
                    onChange(u.email);
                    setSearch("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-[10px] rounded-[7px] px-[10px] py-[8px] text-left transition-colors hover:bg-[#f7f8fb]"
                >
                  <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#eef2fb] text-[11px] font-bold text-[#2b3f6c]">
                    {u.name[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-[#1f2330]">
                      {u.name}
                    </span>
                    <span className="block truncate text-[11.5px] text-[#9aa1b3]">{u.email}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
