/**
 * Pure utility functions for working with diff data.
 * No side effects, no imports of client-side code -- safe for server use.
 */

import type { DiffHunk, DiffLine, FileDiff, LineType } from '@/features/diff-viewer/types';

// ---------------------------------------------------------------------------
// Line type checks
// ---------------------------------------------------------------------------

export function isAddition(line: DiffLine): boolean {
  return line.type === 'add';
}

export function isDeletion(line: DiffLine): boolean {
  return line.type === 'delete';
}

export function isContext(line: DiffLine): boolean {
  return line.type === 'context';
}

// ---------------------------------------------------------------------------
// Counting
// ---------------------------------------------------------------------------

export interface ChangeCounts {
  additions: number;
  deletions: number;
  total: number;
}

export function countChanges(hunks: DiffHunk[]): ChangeCounts {
  let additions = 0;
  let deletions = 0;

  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add') additions++;
      if (line.type === 'delete') deletions++;
    }
  }

  return { additions, deletions, total: additions + deletions };
}

export function countFileChanges(diff: FileDiff): ChangeCounts {
  return { additions: diff.additions, deletions: diff.deletions, total: diff.additions + diff.deletions };
}

// ---------------------------------------------------------------------------
// Language detection from file extension
// ---------------------------------------------------------------------------

const EXTENSION_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  json: 'json',
  jsonc: 'json',
  xml: 'xml',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  md: 'markdown',
  mdx: 'mdx',
  graphql: 'graphql',
  gql: 'graphql',
  dockerfile: 'dockerfile',
  toml: 'toml',
  ini: 'ini',
  cfg: 'ini',
  env: 'bash',
  vue: 'vue',
  svelte: 'svelte',
  astro: 'astro',
  prisma: 'prisma',
  proto: 'protobuf',
  tf: 'hcl',
  hcl: 'hcl',
};

/**
 * Detect the programming language from a filename.
 * Returns null if the language can't be determined.
 */
export function detectLanguage(filename: string): string | null {
  // Handle special filenames (Dockerfile, Makefile, etc.)
  const basename = filename.split('/').pop()?.toLowerCase() ?? '';
  if (basename === 'dockerfile') return 'dockerfile';
  if (basename === 'makefile') return 'makefile';
  if (basename === 'cmakelists.txt') return 'cmake';
  if (basename.startsWith('.env')) return 'bash';

  const ext = basename.split('.').pop()?.toLowerCase();
  if (!ext) return null;

  return EXTENSION_MAP[ext] ?? null;
}

// ---------------------------------------------------------------------------
// Media / asset detection
// ---------------------------------------------------------------------------

/**
 * Image file extensions we can render inline, mapped to their MIME type.
 * Covers the common web-renderable formats (browsers display all of these
 * via <img>). SVG is included -- rendering it through an <img> tag is safe
 * because scripts embedded in an SVG do not execute in that context.
 */
const IMAGE_MIME_MAP: Record<string, string> = {
  png: 'image/png',
  apng: 'image/apng',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  cur: 'image/x-icon',
  tif: 'image/tiff',
  tiff: 'image/tiff',
};

/**
 * MIME types for other common binary assets. These aren't rendered inline as
 * images but we can still serve them with a correct Content-Type (used by the
 * raw-file route and for "open/download" affordances).
 */
const ASSET_MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
  zip: 'application/zip',
};

function extensionOf(filename: string): string {
  const basename = filename.split('/').pop()?.toLowerCase() ?? '';
  const dot = basename.lastIndexOf('.');
  return dot > 0 ? basename.slice(dot + 1) : '';
}

/**
 * Return the image MIME type for a filename, or null if it's not a
 * recognised (inline-renderable) image.
 */
export function detectImageMimeType(filename: string): string | null {
  return IMAGE_MIME_MAP[extensionOf(filename)] ?? null;
}

/** True if the file is an image we can render inline in the diff viewer. */
export function isImageFile(filename: string): boolean {
  return detectImageMimeType(filename) !== null;
}

/**
 * Best-effort MIME type for any file we might serve raw (images + other
 * assets). Falls back to application/octet-stream for unknown types so the
 * browser treats them as opaque binary downloads.
 */
export function detectMimeType(filename: string): string {
  const ext = extensionOf(filename);
  return IMAGE_MIME_MAP[ext] ?? ASSET_MIME_MAP[ext] ?? 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// Impact assessment
// ---------------------------------------------------------------------------

export type ImpactLevel = 'high' | 'medium' | 'low' | 'trivial';

/**
 * Estimate the impact level of a file change based on line counts.
 * Used for visual indicators in the file tree.
 */
export function getImpactLevel(changes: number): ImpactLevel {
  if (changes >= 100) return 'high';
  if (changes >= 30) return 'medium';
  if (changes >= 10) return 'low';
  return 'trivial';
}

// ---------------------------------------------------------------------------
// Hunk utilities
// ---------------------------------------------------------------------------

/**
 * Get the total number of visible lines across all hunks.
 */
export function totalDiffLines(hunks: DiffHunk[]): number {
  let count = 0;
  for (const hunk of hunks) {
    count += hunk.lines.length;
  }
  return count;
}

/**
 * Find the hunk that contains a given line number (old or new side).
 */
export function findHunkForLine(
  hunks: DiffHunk[],
  lineNumber: number,
  side: 'old' | 'new',
): DiffHunk | null {
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      const num = side === 'old' ? line.oldLineNumber : line.newLineNumber;
      if (num === lineNumber) return hunk;
    }
  }
  return null;
}

/**
 * Collect all line types present in a hunk (useful for filtering).
 */
export function hunkLineTypes(hunk: DiffHunk): Set<LineType> {
  const types = new Set<LineType>();
  for (const line of hunk.lines) {
    types.add(line.type);
  }
  return types;
}
