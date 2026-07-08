import type { PRFile } from '@/types/pr';
import type { FileCategory, DiffCategoryId } from '@/types/ai';
import { compareCategoryPriority } from '@/lib/ai/diff-categories';

export interface CategoryFileGroup {
  category: DiffCategoryId;
  files: PRFile[];
  /** Per-file reason keyed by filename, when the model supplied one. */
  reasons: Record<string, string>;
  totalAdditions: number;
  totalDeletions: number;
}

/**
 * Bucket PR files by their assigned category and sort:
 *   - groups by review priority (highest-risk categories first),
 *   - files within a group by total churn (biggest first).
 *
 * Files with no assignment fall into `other`.
 */
export function groupFilesByCategory(
  files: PRFile[],
  categories: FileCategory[],
): CategoryFileGroup[] {
  const byFile = new Map<string, FileCategory>();
  for (const c of categories) byFile.set(c.filename, c);

  const buckets = new Map<DiffCategoryId, CategoryFileGroup>();

  for (const file of files) {
    const assigned = byFile.get(file.filename);
    const category: DiffCategoryId = assigned?.category ?? 'other';

    let group = buckets.get(category);
    if (!group) {
      group = {
        category,
        files: [],
        reasons: {},
        totalAdditions: 0,
        totalDeletions: 0,
      };
      buckets.set(category, group);
    }

    group.files.push(file);
    if (assigned?.reason) group.reasons[file.filename] = assigned.reason;
    group.totalAdditions += file.additions;
    group.totalDeletions += file.deletions;
  }

  const groups = Array.from(buckets.values());

  for (const group of groups) {
    group.files.sort(
      (a, b) => b.additions + b.deletions - (a.additions + a.deletions),
    );
  }

  groups.sort((a, b) => compareCategoryPriority(a.category, b.category));

  return groups;
}
