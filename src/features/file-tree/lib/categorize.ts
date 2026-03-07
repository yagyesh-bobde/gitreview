import type { PRFile } from "@/types/pr";
import type { FileGroup, FileTreeNode } from "../types";
import { buildAndFinalizeTree } from "./file-tree-builder";

/**
 * Group files by their top-level directory.
 * Returns FileGroup[] sorted by total changes (most impactful first).
 */
export function groupFilesByDirectory(files: PRFile[]): FileGroup[] {
  const groups = new Map<string, PRFile[]>();

  for (const file of files) {
    const segments = file.filename.split("/");
    const topDir = segments.length > 1 ? segments[0] : "(root)";

    if (!groups.has(topDir)) {
      groups.set(topDir, []);
    }
    groups.get(topDir)!.push(file);
  }

  const result: FileGroup[] = [];

  for (const [name, groupFiles] of groups) {
    const tree = buildAndFinalizeTree(groupFiles);
    const totalAdditions = groupFiles.reduce((s, f) => s + f.additions, 0);
    const totalDeletions = groupFiles.reduce((s, f) => s + f.deletions, 0);

    result.push({
      name,
      path: name,
      files: tree,
      totalAdditions,
      totalDeletions,
    });
  }

  // Sort by total changes descending
  result.sort((a, b) => {
    const aTotal = a.totalAdditions + a.totalDeletions;
    const bTotal = b.totalAdditions + b.totalDeletions;
    return bTotal - aTotal;
  });

  return result;
}

/**
 * Count total files in a tree (recursive).
 */
export function countFiles(nodes: FileTreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "file") {
      count++;
    } else if (node.children) {
      count += countFiles(node.children);
    }
  }
  return count;
}
