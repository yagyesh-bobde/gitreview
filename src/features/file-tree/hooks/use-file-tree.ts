"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { PRFile } from "@/types/pr";
import type { FileTreeNode } from "../types";
import {
  buildAndFinalizeTree,
  collectDirectoryPaths,
  getAncestorPaths,
} from "../lib/file-tree-builder";

interface UseFileTreeReturn {
  tree: FileTreeNode[];
  expandedPaths: Set<string>;
  toggleDirectory: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  fileCount: number;
}

type Action =
  | { type: "toggle"; path: string }
  | { type: "expand_all"; paths: string[] }
  | { type: "collapse_all" }
  | { type: "ensure_visible"; paths: string[] };

function reducer(state: Set<string>, action: Action): Set<string> {
  switch (action.type) {
    case "toggle": {
      const next = new Set(state);
      if (next.has(action.path)) {
        next.delete(action.path);
      } else {
        next.add(action.path);
      }
      return next;
    }
    case "expand_all":
      return new Set(action.paths);
    case "collapse_all":
      return new Set();
    case "ensure_visible": {
      const needsUpdate = action.paths.some((p) => !state.has(p));
      if (!needsUpdate) return state;
      const next = new Set(state);
      for (const p of action.paths) {
        next.add(p);
      }
      return next;
    }
  }
}

export function useFileTree(
  files: PRFile[],
  selectedFile: string | null
): UseFileTreeReturn {
  const tree = useMemo(() => buildAndFinalizeTree(files), [files]);
  const allDirPaths = useMemo(() => collectDirectoryPaths(tree), [tree]);

  // Start with all directories expanded
  const [expandedPaths, dispatch] = useReducer(
    reducer,
    allDirPaths,
    (paths) => new Set(paths)
  );

  const toggleDirectory = useCallback((path: string) => {
    dispatch({ type: "toggle", path });
  }, []);

  const expandAll = useCallback(() => {
    dispatch({ type: "expand_all", paths: allDirPaths });
  }, [allDirPaths]);

  const collapseAll = useCallback(() => {
    dispatch({ type: "collapse_all" });
  }, []);

  // Derive expanded paths that also include ancestors of the selected file
  const effectiveExpandedPaths = useMemo(() => {
    if (!selectedFile) return expandedPaths;
    const ancestors = getAncestorPaths(selectedFile, tree);
    if (ancestors.length === 0) return expandedPaths;
    const needsUpdate = ancestors.some((p) => !expandedPaths.has(p));
    if (!needsUpdate) return expandedPaths;
    const merged = new Set(expandedPaths);
    for (const p of ancestors) {
      merged.add(p);
    }
    return merged;
  }, [expandedPaths, selectedFile, tree]);

  return {
    tree,
    expandedPaths: effectiveExpandedPaths,
    toggleDirectory,
    expandAll,
    collapseAll,
    fileCount: files.length,
  };
}
