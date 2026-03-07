/**
 * Unified diff parser.
 *
 * Parses a GitHub-style unified diff (patch string from the API) into
 * structured DiffHunk[] and DiffLine[] arrays. Also supports parsing a
 * full multi-file diff into FileDiff[].
 *
 * Handles:
 * - Standard unified diff hunks (@@ -a,b +c,d @@ optional heading)
 * - Add / delete / context lines
 * - "No newline at end of file" markers
 * - Binary file indicators
 * - Renamed files (diff --git a/old b/new)
 * - Empty patches
 */

import type { DiffHunk, DiffLine, FileDiff, LineType } from '@/features/diff-viewer/types';
import { detectLanguage } from './diff-utils';

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

/** Matches a hunk header: @@ -oldStart[,oldLines] +newStart[,newLines] @@ [heading] */
const HUNK_HEADER_RE = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/;

/** Matches the diff --git header that starts a new file in a multi-file diff */
const FILE_HEADER_RE = /^diff --git a\/(.+) b\/(.+)$/;

/** "Binary files ... differ" indicator */
const BINARY_RE = /^Binary files .+ differ$/;

/** GitHub's "\ No newline at end of file" marker */
const NO_NEWLINE_MARKER = '\\ No newline at end of file';

// ---------------------------------------------------------------------------
// Single-file parser (patch string -> DiffHunk[])
// ---------------------------------------------------------------------------

/**
 * Parse a GitHub patch string (single file) into structured hunks.
 * This is the primary parser used by the diff viewer.
 *
 * @param patch - The patch string from GitHub's PRFile.patch
 * @returns Array of parsed hunks with line-by-line detail
 */
export function parsePatch(patch: string | null | undefined): DiffHunk[] {
  if (!patch || patch.trim() === '') return [];

  const lines = patch.split('\n');
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for hunk header
    const hunkMatch = line.match(HUNK_HEADER_RE);
    if (hunkMatch) {
      const oldStart = parseInt(hunkMatch[1], 10);
      const oldLines = hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1;
      const newStart = parseInt(hunkMatch[3], 10);
      const newLines = hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1;
      const sectionHeading = hunkMatch[5]?.trim() || null;

      currentHunk = {
        header: line,
        oldStart,
        oldLines,
        newStart,
        newLines,
        sectionHeading,
        lines: [],
      };
      hunks.push(currentHunk);

      oldLine = oldStart;
      newLine = newStart;
      continue;
    }

    // If no hunk started yet, skip (could be file header in a multi-file diff)
    if (!currentHunk) continue;

    // "No newline at end of file" marker
    if (line === NO_NEWLINE_MARKER) {
      // Annotate the previous line
      const prevLines = currentHunk.lines;
      if (prevLines.length > 0) {
        prevLines[prevLines.length - 1].noNewline = true;
      }
      continue;
    }

    // Determine line type from the first character
    const prefix = line[0];
    let type: LineType;
    let content: string;
    let oldLineNumber: number | null = null;
    let newLineNumber: number | null = null;

    switch (prefix) {
      case '+':
        type = 'add';
        content = line.slice(1);
        newLineNumber = newLine++;
        break;

      case '-':
        type = 'delete';
        content = line.slice(1);
        oldLineNumber = oldLine++;
        break;

      case ' ':
        type = 'context';
        content = line.slice(1);
        oldLineNumber = oldLine++;
        newLineNumber = newLine++;
        break;

      default:
        // Handle lines that don't start with +, -, or space.
        // This can happen with missing final newlines or malformed diffs.
        // Treat as context if within a hunk.
        type = 'context';
        content = line;
        oldLineNumber = oldLine++;
        newLineNumber = newLine++;
        break;
    }

    const diffLine: DiffLine = {
      type,
      content,
      oldLineNumber,
      newLineNumber,
    };

    currentHunk.lines.push(diffLine);
  }

  return hunks;
}

// ---------------------------------------------------------------------------
// Multi-file parser (full diff -> FileDiff[])
// ---------------------------------------------------------------------------

interface FileSection {
  oldFilename: string;
  newFilename: string;
  lines: string[];
  isBinary: boolean;
  isRenamed: boolean;
}

/**
 * Parse a full multi-file unified diff into FileDiff[] structures.
 * Used when fetching the raw diff for an entire PR.
 */
export function parseFullDiff(rawDiff: string): FileDiff[] {
  if (!rawDiff || rawDiff.trim() === '') return [];

  const allLines = rawDiff.split('\n');
  const sections: FileSection[] = [];
  let current: FileSection | null = null;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];

    // New file section
    const fileMatch = line.match(FILE_HEADER_RE);
    if (fileMatch) {
      current = {
        oldFilename: fileMatch[1],
        newFilename: fileMatch[2],
        lines: [],
        isBinary: false,
        isRenamed: fileMatch[1] !== fileMatch[2],
      };
      sections.push(current);
      continue;
    }

    // Binary indicator
    if (current && BINARY_RE.test(line)) {
      current.isBinary = true;
      continue;
    }

    // Skip --- and +++ file headers (redundant with diff --git header)
    if (line.startsWith('---') || line.startsWith('+++')) {
      continue;
    }

    // Skip index, mode, similarity lines
    if (
      line.startsWith('index ') ||
      line.startsWith('old mode') ||
      line.startsWith('new mode') ||
      line.startsWith('new file mode') ||
      line.startsWith('deleted file mode') ||
      line.startsWith('similarity index') ||
      line.startsWith('rename from') ||
      line.startsWith('rename to') ||
      line.startsWith('copy from') ||
      line.startsWith('copy to')
    ) {
      continue;
    }

    // Accumulate lines for the current file
    if (current) {
      current.lines.push(line);
    }
  }

  return sections.map((section) => {
    const patch = section.lines.join('\n');
    const hunks = parsePatch(patch);
    let additions = 0;
    let deletions = 0;

    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') additions++;
        if (line.type === 'delete') deletions++;
      }
    }

    return {
      filename: section.newFilename,
      hunks,
      language: detectLanguage(section.newFilename),
      isBinary: section.isBinary,
      isRenamed: section.isRenamed,
      oldFilename: section.isRenamed ? section.oldFilename : null,
      additions,
      deletions,
    };
  });
}

/**
 * Build a FileDiff from a single file's patch string and metadata.
 * Used when we have per-file patch data from the PR files endpoint.
 */
export function buildFileDiff(
  filename: string,
  patch: string | null,
  previousFilename: string | null,
): FileDiff {
  const hunks = parsePatch(patch);
  let additions = 0;
  let deletions = 0;

  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add') additions++;
      if (line.type === 'delete') deletions++;
    }
  }

  const isBinary = patch === null || patch === undefined;
  const isRenamed = previousFilename !== null && previousFilename !== filename;

  return {
    filename,
    hunks,
    language: detectLanguage(filename),
    isBinary: isBinary && hunks.length === 0,
    isRenamed,
    oldFilename: isRenamed ? previousFilename : null,
    additions,
    deletions,
  };
}
