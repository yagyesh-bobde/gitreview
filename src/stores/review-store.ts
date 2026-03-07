import { create } from 'zustand';

import type { DiffViewMode } from '@/features/diff-viewer/types';

interface LineSelection {
  start: number;
  end: number;
}

interface ReviewStore {
  activeFile: string | null;
  viewMode: DiffViewMode;
  selectedLines: LineSelection | null;

  setActiveFile: (file: string | null) => void;
  setViewMode: (mode: DiffViewMode) => void;
  setSelectedLines: (lines: LineSelection | null) => void;
}

export const useReviewStore = create<ReviewStore>((set) => ({
  activeFile: null,
  viewMode: 'unified',
  selectedLines: null,

  setActiveFile: (file) =>
    set({ activeFile: file, selectedLines: null }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedLines: (lines) => set({ selectedLines: lines }),
}));
