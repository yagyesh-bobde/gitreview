/**
 * Canonical set of diff categories used by the AI grouping feature.
 *
 * This module is framework-agnostic (no React / lucide imports) so it can be
 * shared by the server route that builds the model prompt and the client that
 * renders the accordion. UI-only concerns (icons, colors) live alongside the
 * accordion component.
 */

export const DIFF_CATEGORIES = [
  'payment',
  'security',
  'bugfix',
  'feature',
  'refactoring',
  'performance',
  'infrastructure',
  'database',
  'api',
  'tests',
  'configuration',
  'dependencies',
  'styling',
  'documentation',
  'other',
] as const;

export type DiffCategoryId = (typeof DIFF_CATEGORIES)[number];

interface DiffCategoryMeta {
  /** Human-readable label shown on the accordion header. */
  label: string;
  /** Short description handed to the model to disambiguate categories. */
  description: string;
  /**
   * Review priority — lower sorts first. The intent is to surface the
   * highest-risk changes (money, security, bugs) at the top so reviewers
   * tackle them before low-risk noise (docs, formatting).
   */
  priority: number;
}

export const DIFF_CATEGORY_META: Record<DiffCategoryId, DiffCategoryMeta> = {
  payment: {
    label: 'Payment & Billing',
    description: 'Money movement: checkout, invoicing, subscriptions, pricing, Stripe/PayPal etc.',
    priority: 0,
  },
  security: {
    label: 'Security & Auth',
    description: 'Authentication, authorization, secrets, encryption, permissions, input validation.',
    priority: 1,
  },
  bugfix: {
    label: 'Bug Fixes',
    description: 'Changes that correct incorrect behavior or fix a reported defect.',
    priority: 2,
  },
  feature: {
    label: 'Features',
    description: 'New user-facing functionality or capabilities.',
    priority: 3,
  },
  api: {
    label: 'API & Endpoints',
    description: 'HTTP routes, request/response contracts, RPC handlers, public interfaces.',
    priority: 4,
  },
  database: {
    label: 'Database & Migrations',
    description: 'Schema changes, migrations, queries, ORM models, seed data.',
    priority: 5,
  },
  performance: {
    label: 'Performance',
    description: 'Optimizations for speed, memory, caching, or bundle size.',
    priority: 6,
  },
  refactoring: {
    label: 'Refactoring',
    description: 'Behavior-preserving restructuring, renames, code moves, cleanup.',
    priority: 7,
  },
  infrastructure: {
    label: 'Infrastructure & CI',
    description: 'CI/CD pipelines, Docker, deployment, IaC, build tooling.',
    priority: 8,
  },
  tests: {
    label: 'Tests',
    description: 'Unit, integration, or e2e tests and test fixtures.',
    priority: 9,
  },
  configuration: {
    label: 'Configuration',
    description: 'Config files, env samples, linter/formatter/tsconfig, feature flags.',
    priority: 10,
  },
  dependencies: {
    label: 'Dependencies',
    description: 'Lockfiles and package manifests: adding, removing, or bumping packages.',
    priority: 11,
  },
  styling: {
    label: 'Styling',
    description: 'CSS, Tailwind, themes, and purely visual/formatting changes.',
    priority: 12,
  },
  documentation: {
    label: 'Documentation',
    description: 'READMEs, markdown docs, comments, changelogs.',
    priority: 13,
  },
  other: {
    label: 'Other',
    description: 'Anything that does not clearly fit another category.',
    priority: 99,
  },
} as const;

/** Type guard: is a raw string one of our known category ids? */
export function isDiffCategory(value: string): value is DiffCategoryId {
  return (DIFF_CATEGORIES as readonly string[]).includes(value);
}

/** Coerce an arbitrary model output to a known category, defaulting to `other`. */
export function normalizeCategory(value: string | null | undefined): DiffCategoryId {
  if (value && isDiffCategory(value)) return value;
  return 'other';
}

/** Sort comparator for category ids by review priority (highest-risk first). */
export function compareCategoryPriority(a: DiffCategoryId, b: DiffCategoryId): number {
  return DIFF_CATEGORY_META[a].priority - DIFF_CATEGORY_META[b].priority;
}
