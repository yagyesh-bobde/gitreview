/**
 * App-level AI types.
 */
import type { DiffCategoryId } from '@/lib/ai/diff-categories';

export type { DiffCategoryId } from '@/lib/ai/diff-categories';

// ---------------------------------------------------------------------------
// Diff categorization (AI-grouped accordion feature)
// ---------------------------------------------------------------------------

/** A single file's AI-assigned category. */
export interface FileCategory {
  filename: string;
  category: DiffCategoryId;
  /** One short clause explaining the classification (optional). */
  reason?: string;
}

/** Response shape for POST /api/ai/categorize. */
export interface CategorizationResult {
  categories: FileCategory[];
  /** Where the categorization came from — useful for UI hints. */
  source: 'ai' | 'heuristic' | 'cache';
}

/** Request body for POST /api/ai/categorize. */
export interface CategorizationRequest {
  files: CategorizationFileInput[];
}

/** Minimal per-file payload the categorizer needs. Kept small on purpose. */
export interface CategorizationFileInput {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  /** Truncated patch/diff text; may be null for binary or oversized files. */
  patch: string | null;
  /** Content sha — lets the server cache categorization stably per PR state. */
  sha: string;
}
