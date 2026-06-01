"use client";

import { create } from "zustand";
import { setAuthStoreGetter } from "@/lib/api";

interface AuthState {
  token: string | null;
  email: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
}

// 로그인 성공 시 state에 엑세스 토큰 저장
export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  email: null,
  login: (token, email) => set({ token, email }),
  logout: () => set({ token: null, email: null }),
}));

// Axios 인터셉터에 store getter 등록
setAuthStoreGetter(() => useAuthStore.getState());
