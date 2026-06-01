import { create } from "zustand";

interface SidebarCase {
  id: string;
  title: string;
}

interface CaseStoreState {
  sidebarCases: SidebarCase[];
  setSidebarCases: (cases: SidebarCase[]) => void;
}

export const useCaseStore = create<CaseStoreState>()((set) => ({
  sidebarCases: [],
  setSidebarCases: (sidebarCases) => set({ sidebarCases }),
}));
