/**
 * Line mapping utilities for navigating between diff positions
 * and actual file line numbers.
 *
 * Diff viewers need to translate between:
 * - A flat "diff index" (0-based position across all hunks)
 * - Old file line numbers
 * - New file line numbers
 */

import type { DiffHunk, LineMapping } from '@/features/diff-viewer/types';

/**
 * Build a flat array of LineMapping entries from parsed hunks.
 * Each entry maps a diff index to old/new file line numbers.
 */
export function buildLineMappings(hunks: DiffHunk[]): LineMapping[] {
  const mappings: LineMapping[] = [];
  let diffIndex = 0;

  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      mappings.push({
        diffIndex,
        oldLineNumber: line.oldLineNumber,
        newLineNumber: line.newLineNumber,
        type: line.type,
      });
      diffIndex++;
    }
  }

  return mappings;
}

/**
 * Find the diff index for a given old file line number.
 * Returns -1 if the line is not in any hunk (i.e. it's between collapsed sections).
 */
export function diffIndexForOldLine(mappings: LineMapping[], oldLine: number): number {
  for (const m of mappings) {
    if (m.oldLineNumber === oldLine) return m.diffIndex;
  }
  return -1;
}

/**
 * Find the diff index for a given new file line number.
 * Returns -1 if the line is not in any hunk.
 */
export function diffIndexForNewLine(mappings: LineMapping[], newLine: number): number {
  for (const m of mappings) {
    if (m.newLineNumber === newLine) return m.diffIndex;
  }
  return -1;
}

/**
 * Get old and new line numbers for a given diff index.
 * Returns null if the index is out of range.
 */
export function lineNumbersForDiffIndex(
  mappings: LineMapping[],
  diffIndex: number,
): { oldLineNumber: number | null; newLineNumber: number | null } | null {
  const m = mappings[diffIndex];
  if (!m) return null;
  return { oldLineNumber: m.oldLineNumber, newLineNumber: m.newLineNumber };
}

/**
 * Compute the range of old-file line numbers covered by a hunk.
 * Returns [start, end] inclusive, or null for hunks with no old lines.
 */
export function oldLineRange(hunk: DiffHunk): [number, number] | null {
  if (hunk.oldLines === 0) return null;
  return [hunk.oldStart, hunk.oldStart + hunk.oldLines - 1];
}

/**
 * Compute the range of new-file line numbers covered by a hunk.
 * Returns [start, end] inclusive, or null for hunks with no new lines.
 */
export function newLineRange(hunk: DiffHunk): [number, number] | null {
  if (hunk.newLines === 0) return null;
  return [hunk.newStart, hunk.newStart + hunk.newLines - 1];
}
