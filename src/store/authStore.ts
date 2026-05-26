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
      login: (token, email) => {
        set({ token, email });
        if (typeof document !== "undefined") {
          document.cookie = `session=1; max-age=${60 * 60 * 24}; path=/; SameSite=Strict`;
        }
      },
      logout: () => {
        set({ token: null, email: null });
        if (typeof document !== "undefined") {
          document.cookie = "session=; max-age=0; path=/; SameSite=Strict";
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Axios 인터셉터에 store getter 등록
setAuthStoreGetter(() => useAuthStore.getState());
