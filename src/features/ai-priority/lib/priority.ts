/**
 * AI file priority — shared, framework-agnostic definitions.
 *
 * Imported by both the `/api/ai/prioritize` route and the client, so it must
 * stay free of React, lucide and server-only imports. Tests and docs are
 * bucketed by path alone; every other file is ranked P0/P1/P2 by TypeSafe AI.
 */

/** Buckets in display order (highest review priority first). */
export const PRIORITY_BUCKETS = ['p0', 'p1', 'p2', 'tests', 'docs'] as const;

export type PriorityBucket = (typeof PRIORITY_BUCKETS)[number];

/** The buckets TypeSafe chooses between; tests/docs never reach the model. */
export const AI_PRIORITY_BUCKETS = ['p0', 'p1', 'p2'] as const;

export type AIPriorityBucket = (typeof AI_PRIORITY_BUCKETS)[number];

export const PRIORITY_BUCKET_META: Record<PriorityBucket, { label: string; hint: string }> = {
  p0: { label: 'P0 Priority', hint: 'Critical: security, payments, data integrity, core logic' },
  p1: { label: 'P1', hint: 'Important: features, API contracts, non-trivial logic' },
  p2: { label: 'P2', hint: 'Low risk: styling, config, generated code, small refactors' },
  tests: { label: 'Tests', hint: 'Test files, fixtures and snapshots' },
  docs: { label: 'Docs', hint: 'Documentation, READMEs and changelogs' },
};

/** Prioritization only kicks in for PRs with at least this many changed files. */
export const PRIORITY_MIN_FILES = 10;

/** Per-file patch budget (chars) sent to the model. */
export const PRIORITY_PATCH_CHARS = 1500;

/** Request header carrying the user's own TypeSafe key (never persisted server-side). */
export const TYPESAFE_KEY_HEADER = 'x-typesafe-key';

// ---------------------------------------------------------------------------
// Path heuristic
// ---------------------------------------------------------------------------

const TEST_PATTERNS = [
  /\.(test|spec|e2e)\.[a-z0-9]+$/i, // foo.test.ts, foo.spec.tsx, foo.e2e.js
  /(^|\/)(__tests__|__mocks__|__snapshots__|tests?|e2e|cypress|playwright)\//i,
  /\.snap$/,
  /_test\.(go|py|rb|exs?)$/, // foo_test.go, foo_test.py
  /(^|\/)test_[^/]+\.py$/, // test_foo.py
  /_spec\.rb$/, // RSpec
  /Tests?\.(java|kt|kts|scala|groovy|cs|swift)$/, // FooTest.java, FooTests.cs
];

const DOC_PATTERNS = [
  /\.(md|mdx|rst|txt|adoc)$/i,
  /(^|\/)docs?\//i,
  /(^|\/)(readme|changelog|license|licence|contributing|code_of_conduct)(\.[a-z0-9]+)?$/i,
];

/** `.txt` files that are build/dependency manifests rather than prose. */
const NON_DOC_TXT = /(^|\/)(requirements[^/]*|CMakeLists)\.txt$/i;

/** Bucket a file by path alone; `null` means it needs the model. */
export function heuristicBucket(path: string): 'tests' | 'docs' | null {
  if (TEST_PATTERNS.some((p) => p.test(path))) return 'tests';
  if (!NON_DOC_TXT.test(path) && DOC_PATTERNS.some((p) => p.test(path))) return 'docs';
  return null;
}

export function isAIPriorityBucket(value: unknown): value is AIPriorityBucket {
  return (AI_PRIORITY_BUCKETS as readonly unknown[]).includes(value);
}

// ---------------------------------------------------------------------------
// API contract (/api/ai/prioritize)
// ---------------------------------------------------------------------------

/** Minimal per-file payload the prioritizer needs. */
export interface PriorityFileInput {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  /** Truncated patch; null for binary or oversized files. */
  patch: string | null;
  /** Content sha — lets the server cache results stably per PR state. */
  sha: string;
}

/** POST body. */
export interface PriorityRequest {
  files: PriorityFileInput[];
}

export interface FilePriority {
  filename: string;
  bucket: PriorityBucket;
  /** Model confidence (0-1); absent for path-heuristic and fallback buckets. */
  confidence?: number;
}

/**
 * Where a result came from. `heuristic` means every file was a test/doc, so
 * nothing was sent to the model and no demo run was spent.
 */
export type PrioritySource = 'demo' | 'own-key' | 'cache' | 'heuristic';

/** POST response. */
export interface PriorityResult {
  files: FilePriority[];
  source: PrioritySource;
}

/** GET response. */
export interface PriorityStatus {
  demoAvailable: boolean;
}

/** Machine-readable `error` values returned by the route. */
export type PriorityErrorCode =
  | 'unauthenticated'
  | 'invalid_request'
  | 'too_few_files'
  | 'demo_used'
  | 'demo_unavailable'
  | 'invalid_key'
  | 'prioritization_failed';
