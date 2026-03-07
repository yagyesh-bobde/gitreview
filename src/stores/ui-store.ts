import { create } from 'zustand';

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 500;
const SIDEBAR_DEFAULT = 280;

export type DashboardView = 'list' | 'ide';

interface UIStore {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  dashboardView: DashboardView;
  conversationOpen: boolean;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  setDashboardView: (view: DashboardView) => void;
  toggleConversation: () => void;
  setConversationOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarWidth: SIDEBAR_DEFAULT,
  sidebarCollapsed: false,
  dashboardView: 'list',
  conversationOpen: false,

  setSidebarWidth: (width: number) =>
    set({ sidebarWidth: Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, width)) }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setDashboardView: (view: DashboardView) => set({ dashboardView: view }),

  toggleConversation: () =>
    set((state) => ({ conversationOpen: !state.conversationOpen })),

  setConversationOpen: (open: boolean) => set({ conversationOpen: open }),
}));

export { SIDEBAR_MIN, SIDEBAR_MAX, SIDEBAR_DEFAULT };
