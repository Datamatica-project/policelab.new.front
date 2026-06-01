"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { setAuthStoreGetter } from "@/lib/api";

interface AuthState {
  token: string | null;
  email: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      login: (token, email) => set({ token, email }),
      logout: () => set({ token: null, email: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ email: state.email }), // token은 저장 안 함
    },
  ),
);

setAuthStoreGetter(() => useAuthStore.getState());
