import { create } from 'zustand';
import type { DiffViewMode, SelectedLineRange } from '@/features/diff-viewer/types';

interface ReviewStore {
  activeFile: string | null;
  viewMode: DiffViewMode;
  selectedLines: SelectedLineRange | null;
  setActiveFile: (path: string | null) => void;
  setViewMode: (mode: DiffViewMode) => void;
  setSelectedLines: (range: SelectedLineRange | null) => void;
  clearSelection: () => void;
}

export const useReviewStore = create<ReviewStore>((set) => ({
  activeFile: null,
  viewMode: 'unified',
  selectedLines: null,

  setActiveFile: (path) => set({ activeFile: path, selectedLines: null }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedLines: (range) => set({ selectedLines: range }),

  clearSelection: () => set({ selectedLines: null }),
}));
