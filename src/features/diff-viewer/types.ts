/**
 * Core diff types used by the diff viewer and the diff parser.
 * Re-exported from @/types/diff for convenience.
 */

// ---------------------------------------------------------------------------
// Line-level types
// ---------------------------------------------------------------------------

export type LineType = 'add' | 'delete' | 'context';

export interface DiffLine {
  type: LineType;
  content: string;
  /** Line number in the old file (null for additions) */
  oldLineNumber: number | null;
  /** Line number in the new file (null for deletions) */
  newLineNumber: number | null;
  /** True when the line has a "No newline at end of file" marker */
  noNewline?: boolean;
}

// ---------------------------------------------------------------------------
// Hunk-level types
// ---------------------------------------------------------------------------

export interface DiffHunk {
  /** Raw @@ header line, e.g. "@@ -10,7 +10,8 @@ function foo()" */
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  /** Optional section heading extracted from the @@ line */
  sectionHeading: string | null;
  lines: DiffLine[];
}

// ---------------------------------------------------------------------------
// File-level types
// ---------------------------------------------------------------------------

export interface FileDiff {
  filename: string;
  hunks: DiffHunk[];
  /** Detected programming language (from file extension) */
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
  /** Diff-relative line index (0-based, across all hunks) */
  diffIndex: number;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  type: LineType;
}
