/**
 * Patterns for identifying generated, config, and lockfile paths.
 * These are typically low-signal in code review.
 */

const LOCKFILE_PATTERNS = [
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /yarn\.lock$/,
  /Gemfile\.lock$/,
  /Cargo\.lock$/,
  /poetry\.lock$/,
  /composer\.lock$/,
  /go\.sum$/,
];

const GENERATED_PATTERNS = [
  /\.min\.(js|css)$/,
  /\.generated\./,
  /\.g\.(ts|dart)$/,
  /\/migrations\/\d/,
  /\.snap$/,
  /\.d\.ts$/,
  /dist\//,
  /build\//,
  /\.next\//,
];

const CONFIG_PATTERNS = [
  /^\./,
  /\.config\.(js|ts|mjs|cjs)$/,
  /tsconfig.*\.json$/,
  /\.eslintrc/,
  /\.prettierrc/,
  /\.gitignore$/,
  /\.editorconfig$/,
  /tailwind\.config/,
  /next\.config/,
  /vite\.config/,
  /jest\.config/,
  /vitest\.config/,
];

export type FileCategory = "source" | "test" | "config" | "generated" | "lockfile";

export function categorizeFile(filename: string): FileCategory {
  const basename = filename.split("/").pop() ?? filename;

  if (LOCKFILE_PATTERNS.some((p) => p.test(basename))) return "lockfile";
  if (GENERATED_PATTERNS.some((p) => p.test(filename))) return "generated";
  if (CONFIG_PATTERNS.some((p) => p.test(basename))) return "config";
  if (/\.(test|spec|e2e)\.(ts|tsx|js|jsx)$/.test(basename)) return "test";

  return "source";
}

/**
 * Check if a file is likely low-signal for review purposes.
 */
export function isLowSignalFile(filename: string): boolean {
  const category = categorizeFile(filename);
  return category === "lockfile" || category === "generated";
}
