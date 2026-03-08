import type { ThemedToken } from 'shiki';

// ---------------------------------------------------------------------------
// Line-level types
// ---------------------------------------------------------------------------

export type LineType = 'add' | 'delete' | 'context';

export interface DiffLine {
  type: LineType;
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  noNewline?: boolean;
}

// ---------------------------------------------------------------------------
// Hunk-level types
// ---------------------------------------------------------------------------

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  sectionHeading: string | null;
  lines: DiffLine[];
}

// ---------------------------------------------------------------------------
// File-level types
// ---------------------------------------------------------------------------

export interface FileDiff {
  filename: string;
  hunks: DiffHunk[];
  language: string | null;
  isBinary: boolean;
  isRenamed: boolean;
  oldFilename: string | null;
  additions: number;
  deletions: number;
}

// ---------------------------------------------------------------------------
// View configuration
// ---------------------------------------------------------------------------

export type DiffViewMode = 'unified' | 'split';
export type DiffSide = 'old' | 'new';

// ---------------------------------------------------------------------------
// Line mapping (for navigating between diff positions and file positions)
// ---------------------------------------------------------------------------

export interface LineMapping {
  diffIndex: number;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  type: LineType;
}

// ---------------------------------------------------------------------------
// Derived types for rendering (virtual scroller rows)
// ---------------------------------------------------------------------------

/** A flattened row for the virtual scroller — hunk header, code line, or comment row */
export type DiffRow =
  | { kind: 'hunk-header'; hunkIndex: number; header: string }
  | {
      kind: 'line';
      hunkIndex: number;
      lineIndex: number;
      line: DiffLine;
      absoluteIndex: number;
    }
  | {
      kind: 'comment-thread';
      threadId: number;
      anchorKey: string;
    }
  | {
      kind: 'comment-form';
      anchorKey: string;
      path: string;
      line: number;
      side: import('@/types/pr').PRCommentSide;
    };

/** A paired row for split view — left (old) and right (new) side */
export interface SplitRow {
  left: DiffLine | null;
  right: DiffLine | null;
  absoluteIndex: number;
}

export type SplitDiffRow =
  | { kind: 'hunk-header'; hunkIndex: number; header: string }
  | { kind: 'line'; hunkIndex: number; row: SplitRow }
  | {
      kind: 'comment-thread';
      threadId: number;
      anchorKey: string;
    }
  | {
      kind: 'comment-form';
      anchorKey: string;
      path: string;
      line: number;
      side: import('@/types/pr').PRCommentSide;
    };

/** Highlighted tokens for a single line */
export type HighlightedLine = ThemedToken[];

export type { ThemedToken };
