import type { PRFile } from "@/types/pr";
import type { FileTreeNode } from "../types";

/**
 * Converts a flat PRFile[] into a nested FileTreeNode[] tree.
 * Directories first, then files, alphabetical within each group.
 * Single-child directories are collapsed (e.g., "src/features" instead of "src" > "features").
 */
export function buildFileTree(files: PRFile[]): FileTreeNode[] {
  const root: Map<string, FileTreeNode> = new Map();

  for (const file of files) {
    const segments = file.filename.split("/");
    insertIntoTree(root, segments, file);
  }

  const tree = Array.from(root.values());
  collapseDirectories(tree);
  sortTree(tree);

  return tree;
}

function insertIntoTree(
  level: Map<string, FileTreeNode>,
  segments: string[],
  file: PRFile
): void {
  const [current, ...rest] = segments;

  if (rest.length === 0) {
    // Leaf file node
    level.set(current, {
      name: current,
      path: file.filename,
      type: "file",
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
    });
    return;
  }

  // Directory node
  let dirNode = level.get(current);
  if (!dirNode) {
    dirNode = {
      name: current,
      path: "", // computed during collapse
      type: "directory",
      children: [],
      isExpanded: true,
    };
    level.set(current, dirNode);
  }

  // Build a child map from existing children for efficient lookup
  const childMap = new Map<string, FileTreeNode>();
  for (const child of dirNode.children ?? []) {
    childMap.set(child.name, child);
  }

  insertIntoTree(childMap, rest, file);

  dirNode.children = Array.from(childMap.values());
}

/**
 * Collapse single-child directory chains.
 * e.g., "src" > "features" > "auth" becomes "src/features/auth" if each has only one child directory.
 */
function collapseDirectories(nodes: FileTreeNode[]): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type !== "directory" || !node.children) continue;

    // Collapse chain: while directory has exactly one child and that child is also a directory
    let children = node.children;
    while (
      children.length === 1 &&
      children[0].type === "directory"
    ) {
      const child: FileTreeNode = children[0];
      node.name = `${node.name}/${child.name}`;
      children = child.children ?? [];
      node.children = children;
    }

    // Recurse into remaining children
    collapseDirectories(children);
  }
}

/**
 * Recursively sort: directories first, then files, alphabetical within each group.
 */
function sortTree(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  for (const node of nodes) {
    if (node.children) {
      sortTree(node.children);
    }
  }
}

/**
 * Compute directory paths after tree is built.
 * Also aggregates additions/deletions for directories.
 */
export function computeDirectoryPaths(
  nodes: FileTreeNode[],
  parentPath = ""
): void {
  for (const node of nodes) {
    if (node.type === "directory") {
      node.path = parentPath ? `${parentPath}/${node.name}` : node.name;
      if (node.children) {
        computeDirectoryPaths(node.children, node.path);
        // Aggregate stats
        const stats = aggregateStats(node.children);
        node.additions = stats.additions;
        node.deletions = stats.deletions;
      }
    }
  }
}

function aggregateStats(nodes: FileTreeNode[]): {
  additions: number;
  deletions: number;
} {
  let additions = 0;
  let deletions = 0;

  for (const node of nodes) {
    additions += node.additions ?? 0;
    deletions += node.deletions ?? 0;
  }

  return { additions, deletions };
}

/**
 * Build and finalize the tree in one call.
 */
export function buildAndFinalizeTree(files: PRFile[]): FileTreeNode[] {
  const tree = buildFileTree(files);
  computeDirectoryPaths(tree);
  return tree;
}

/**
 * Collect all directory paths from the tree (for expand/collapse state).
 */
export function collectDirectoryPaths(nodes: FileTreeNode[]): string[] {
  const paths: string[] = [];

  for (const node of nodes) {
    if (node.type === "directory") {
      paths.push(node.path);
      if (node.children) {
        paths.push(...collectDirectoryPaths(node.children));
      }
    }
  }

  return paths;
}

/**
 * Find all ancestor directory paths for a given file path.
 */
export function getAncestorPaths(
  filePath: string,
  tree: FileTreeNode[]
): string[] {
  const ancestors: string[] = [];
  findAncestors(tree, filePath, ancestors);
  return ancestors;
}

function findAncestors(
  nodes: FileTreeNode[],
  targetPath: string,
  ancestors: string[]
): boolean {
  for (const node of nodes) {
    if (node.type === "file" && node.path === targetPath) {
      return true;
    }
    if (node.type === "directory" && node.children) {
      if (findAncestors(node.children, targetPath, ancestors)) {
        ancestors.push(node.path);
        return true;
      }
    }
  }
  return false;
}
