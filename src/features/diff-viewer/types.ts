export type DiffViewMode = 'unified' | 'split';

export type LineType = 'add' | 'remove' | 'context' | 'hunk-header';

export type DiffSide = 'left' | 'right';

export interface DiffLine {
  type: LineType;
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  noNewline?: boolean;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface FileDiff {
  filename: string;
  previousFilename: string | null;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied';
  hunks: DiffHunk[];
  isBinary: boolean;
  additions: number;
  deletions: number;
}

export interface SelectedLineRange {
  startLine: number;
  endLine: number;
  side: DiffSide;
}
