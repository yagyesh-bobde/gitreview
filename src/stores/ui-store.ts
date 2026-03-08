import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 500;
const SIDEBAR_DEFAULT = 280;

export type DashboardView = 'list' | 'ide';

interface UIStore {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  dashboardView: DashboardView;
  conversationOpen: boolean;

  /** Repos the user has chosen to hide from the dashboard, persisted in localStorage */
  excludedRepos: string[];

  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  setDashboardView: (view: DashboardView) => void;
  toggleConversation: () => void;
  setConversationOpen: (open: boolean) => void;
  toggleRepoExclusion: (repoFullName: string) => void;
  clearExcludedRepos: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarWidth: SIDEBAR_DEFAULT,
      sidebarCollapsed: false,
      dashboardView: 'ide',
      conversationOpen: false,
      excludedRepos: [],

      setSidebarWidth: (width: number) =>
        set({ sidebarWidth: Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, width)) }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setDashboardView: (view: DashboardView) => set({ dashboardView: view }),

      toggleConversation: () =>
        set((state) => ({ conversationOpen: !state.conversationOpen })),

      setConversationOpen: (open: boolean) => set({ conversationOpen: open }),

      toggleRepoExclusion: (repoFullName: string) =>
        set((state) => ({
          excludedRepos: state.excludedRepos.includes(repoFullName)
            ? state.excludedRepos.filter((r) => r !== repoFullName)
            : [...state.excludedRepos, repoFullName],
        })),

      clearExcludedRepos: () => set({ excludedRepos: [] }),
    }),
    {
      name: 'gitreview-ui',
      // Only persist user preferences, not transient UI state
      partialize: (state) => ({
        dashboardView: state.dashboardView,
        excludedRepos: state.excludedRepos,
      }),
    },
  ),
);

export { SIDEBAR_MIN, SIDEBAR_MAX, SIDEBAR_DEFAULT };
