"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { X, Search, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { GetUserList, ShareCase, type UserResponse } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface CaseShareModalProps {
  caseId: string;
  caseNumber: string;
  sharedWith: string[];
  onClose: () => void;
  onShared?: (newUsernames: string[]) => void;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "관리자",
  USER: "사용자",
  INSPECTOR: "감사관",
  WORKER: "담당자",
};

export default function CaseShareModal({
  caseId,
  caseNumber,
  sharedWith,
  onClose,
  onShared,
}: CaseShareModalProps) {
  const { email: myEmail } = useAuthStore();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await GetUserList();
        setUsers(data);
      } catch {
        toast.error("사용자 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoadingUsers(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 자기 자신 + 이미 공유된 사용자 제외
  const selectable = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      if (u.email === myEmail) return false;
      if (sharedWith.includes(u.email)) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, myEmail, sharedWith, search]);

  const toggle = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) {
      toast.error("공유할 사용자를 선택해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      const usernames = Array.from(selected);
      await ShareCase(caseId, usernames);
      toast.success(`${usernames.length}명에게 사건이 공유됐습니다.`);
      onShared?.(usernames);
      onClose();
    } catch {
      toast.error("사건 공유에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-white rounded-[12px] shadow-[0_8px_32px_rgba(15,22,40,0.16)] w-full max-w-[500px] mx-4 flex flex-col max-h-[80vh]">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-[24px] pt-[22px] pb-[18px] border-b border-[#eef0f5] shrink-0">
          <div>
            <h2 className="text-[17px] font-bold text-[#1f2330]">사건 공유</h2>
            <p className="text-[12px] text-[#9aa1b3] mt-[2px]"># {caseNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#9aa1b3] hover:bg-[#f3f4f8] hover:text-[#3a4055] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-[16px] px-[24px] py-[20px] overflow-y-auto">

          {/* 이미 공유된 사용자 */}
          {sharedWith.length > 0 && (
            <div>
              <p className="text-[12.5px] font-semibold text-[#6b7388] mb-[8px]">현재 공유된 사용자</p>
              <div className="flex flex-wrap gap-[6px]">
                {sharedWith.map((username) => (
                  <span
                    key={username}
                    className="inline-flex items-center px-[10px] py-[4px] bg-[#f0f4fa] text-[#3a4055] text-[12.5px] rounded-full border border-[#d9deea]"
                  >
                    {username}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 선택된 사용자 */}
          {selected.size > 0 && (
            <div>
              <p className="text-[12.5px] font-semibold text-[#1d2c4e] mb-[8px]">
                추가할 사용자 <span className="text-[#1d2c4e]">({selected.size})</span>
              </p>
              <div className="flex flex-wrap gap-[6px]">
                {Array.from(selected).map((email) => {
                  const user = users.find((u) => u.email === email);
                  return (
                    <button
                      key={email}
                      onClick={() => toggle(email)}
                      className="inline-flex items-center gap-[5px] px-[10px] py-[4px] bg-[#1d2c4e] text-white text-[12.5px] rounded-full hover:bg-[#2b3f6c] transition-colors"
                    >
                      {user?.name ?? email}
                      <X size={11} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9aa1b3]" />
            <input
              type="text"
              placeholder="이름 또는 이메일 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-[38px] pr-3 py-[10px] border border-[#d9deea] rounded-[8px] text-[13.5px] text-[#1f2330] outline-none focus:border-[#1d2c4e] placeholder:text-[#9aa1b3] transition-colors"
            />
          </div>

          {/* 사용자 목록 */}
          <div className="border border-[#e6e8ef] rounded-[8px] overflow-hidden">
            {isLoadingUsers ? (
              <div className="py-10 text-center text-[13px] text-[#9aa1b3]">불러오는 중...</div>
            ) : selectable.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-[#9aa1b3]">
                {search ? "검색 결과가 없습니다." : "공유 가능한 사용자가 없습니다."}
              </div>
            ) : (
              <div className="max-h-[220px] overflow-y-auto divide-y divide-[#f0f1f5]">
                {selectable.map((user) => {
                  const isChecked = selected.has(user.email);
                  return (
                    <div
                      key={user.email}
                      className="flex items-center gap-[12px] px-[14px] py-[11px] hover:bg-[#f7f8fb] cursor-pointer transition-colors"
                      onClick={() => toggle(user.email)}
                    >
                      {/* 체크박스 */}
                      <div
                        className={`w-[18px] h-[18px] rounded-[4px] border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? "bg-[#1d2c4e] border-[#1d2c4e]" : "bg-white border-[#c5cbd9]"
                        }`}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} className="text-white" />}
                      </div>

                      {/* 아바타 */}
                      <div className="w-8 h-8 rounded-full bg-[#e8ecf4] flex items-center justify-center text-[#1d2c4e] text-[13px] font-bold shrink-0">
                        {user.name.slice(0, 1)}
                      </div>

                      {/* 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[6px]">
                          <span className="text-[13.5px] font-semibold text-[#1f2330] truncate">{user.name}</span>
                          {user.roles.slice(0, 1).map((r) => (
                            <span key={r} className="text-[11px] font-medium px-[6px] py-[2px] bg-[#f0f4fa] text-[#4a5e8a] rounded-full shrink-0">
                              {ROLE_LABEL[r] ?? r}
                            </span>
                          ))}
                        </div>
                        <p className="text-[12px] text-[#9aa1b3] truncate">{user.email}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-[8px] px-[24px] pb-[20px] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-[10px] border border-[#d9deea] rounded-[8px] text-[13.5px] font-semibold text-[#3a4055] hover:bg-[#f7f8fb] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || selected.size === 0}
            className="flex-1 py-[10px] bg-[#1d2c4e] text-white rounded-[8px] text-[13.5px] font-bold hover:bg-[#2b3f6c] disabled:bg-[#4a5e8a] transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus size={14} />
            {isSaving ? "공유 중..." : `공유하기${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
