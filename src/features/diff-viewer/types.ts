import type { ThemedToken } from 'shiki';

// --- Core diff data types ---

export type LineType = 'add' | 'delete' | 'context';

export interface DiffLine {
  type: LineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface FileDiff {
  filename: string;
  hunks: DiffHunk[];
  language: string;
  isBinary: boolean;
  isRenamed: boolean;
  oldFilename?: string;
}

export type DiffViewMode = 'unified' | 'split';

// --- Derived types for rendering ---

/** A flattened row for the virtual scroller — either a hunk header or a code line */
export type DiffRow =
  | { kind: 'hunk-header'; hunkIndex: number; header: string }
  | {
      kind: 'line';
      hunkIndex: number;
      lineIndex: number;
      line: DiffLine;
      /** Absolute index across all rows (used for selection) */
      absoluteIndex: number;
    };

/** A paired row for split view — left (old) and right (new) side */
export interface SplitRow {
  left: DiffLine | null;
  right: DiffLine | null;
  /** Absolute index for selection */
  absoluteIndex: number;
}

export type SplitDiffRow =
  | { kind: 'hunk-header'; hunkIndex: number; header: string }
  | { kind: 'line'; hunkIndex: number; row: SplitRow };

/** Highlighted tokens for a single line, indexed by line content for caching */
export type HighlightedLine = ThemedToken[];

export type { ThemedToken };
