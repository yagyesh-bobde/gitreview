/**
 * Path-based heuristic categorization.
 *
 * Used as a graceful fallback when no Gemini key is configured or the model
 * call fails, so the accordion still renders something sensible. It only looks
 * at the filename — the AI path additionally reasons over diff content.
 */
import type { DiffCategoryId } from './diff-categories';

interface Rule {
  category: DiffCategoryId;
  test: RegExp;
}

// Ordered by specificity — first match wins.
const RULES: Rule[] = [
  { category: 'dependencies', test: /(^|\/)(package\.json|pnpm-lock\.yaml|yarn\.lock|package-lock\.json|Cargo\.(toml|lock)|go\.(mod|sum)|requirements\.txt|Gemfile(\.lock)?|poetry\.lock)$/i },
  { category: 'tests', test: /(\.(test|spec)\.[jt]sx?$)|(^|\/)(__tests__|tests?|e2e|cypress|playwright)\//i },
  { category: 'documentation', test: /\.(md|mdx|rst|txt)$|(^|\/)docs?\//i },
  { category: 'infrastructure', test: /(^|\/)(\.github|\.gitlab|ci|\.circleci)\/|(Dockerfile|docker-compose\.ya?ml|amplify\.ya?ml|\.ya?ml)$|(^|\/)(terraform|k8s|kubernetes|helm)\//i },
  { category: 'database', test: /(^|\/)(migrations?|drizzle|prisma)\/|schema\.(prisma|sql|ts)$|\.sql$/i },
  { category: 'styling', test: /\.(css|scss|sass|less|styl)$|tailwind\.config\.[jt]s$/i },
  { category: 'configuration', test: /(^|\/)\.?[\w.-]*(config)\.[jt]s(on)?$|\.(json|toml|ini|env|conf)$|(^|\/)(tsconfig|eslint|prettier|\.env)/i },
  { category: 'api', test: /(^|\/)(api|routes?|controllers?|endpoints?)\/|route\.[jt]s$/i },
  { category: 'security', test: /(^|\/)(auth|security|crypto|permissions?)\b|(auth|login|token|session|password|encrypt)/i },
  { category: 'payment', test: /(payment|billing|checkout|invoice|subscription|stripe|paypal|pricing)/i },
];

/** Best-effort category for a single filename. */
export function heuristicCategory(filename: string): DiffCategoryId {
  for (const rule of RULES) {
    if (rule.test.test(filename)) return rule.category;
  }
  return 'other';
}
