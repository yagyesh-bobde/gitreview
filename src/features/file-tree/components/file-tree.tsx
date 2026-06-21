"use client";

import { useCallback, useMemo } from "react";
import { ChevronsDownUp, ChevronsUpDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReviewStore } from "@/stores/review-store";
import type { PRFile } from "@/types/pr";
import type { FileTreeNode as FileTreeNodeType } from "../types";
import { collectFilePaths } from "../lib/file-tree-builder";
import { useFileTree } from "../hooks/use-file-tree";
import { FileTreeGroup } from "./file-tree-group";

interface FileTreeProps {
  files: PRFile[];
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  className?: string;
}

export function FileTree({
  files,
  selectedFile,
  onFileSelect,
  className,
}: FileTreeProps) {
  const {
    tree,
    expandedPaths,
    toggleDirectory,
    collapseDirectory,
    expandAll,
    collapseAll,
    fileCount,
  } = useFileTree(files, selectedFile);

  const viewedFiles = useReviewStore((s) => s.viewedFiles);
  const setFilesViewed = useReviewStore((s) => s.setFilesViewed);
  const setActiveFile = useReviewStore((s) => s.setActiveFile);
  const viewedCount = useMemo(
    () => files.filter((f) => viewedFiles[f.filename]).length,
    [files, viewedFiles],
  );
  const progressPct = fileCount > 0 ? (viewedCount / fileCount) * 100 : 0;

  // Toggle "viewed" for a node. For a folder this marks every descendant file
  // viewed (or clears it), and when marking viewed it collapses the folder in
  // the tree; the matching diffs collapse on the right pane automatically since
  // their collapse state follows "viewed".
  const handleToggleViewed = useCallback(
    (node: FileTreeNodeType) => {
      const paths = collectFilePaths(node);
      if (paths.length === 0) return;
      const allViewed = paths.every((p) => viewedFiles[p]);
      setFilesViewed(paths, !allViewed);

      if (!allViewed && node.type === "directory") {
        collapseDirectory(node.path);
        // Clear the active file if it lived inside this now-collapsed folder,
        // otherwise the tree would auto-re-expand to reveal it.
        if (selectedFile && paths.includes(selectedFile)) {
          setActiveFile(null);
        }
      }
    },
    [viewedFiles, setFilesViewed, collapseDirectory, selectedFile, setActiveFile],
  );

  if (files.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-zinc-500", className)}>
        <FileText className="mb-2 size-8" />
        <p className="text-sm">No files changed</p>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col bg-zinc-900", className)}>
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-medium text-zinc-400">
            {viewedCount} / {fileCount} files reviewed
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={expandAll}
              className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              title="Expand all"
            >
              <ChevronsUpDown className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              title="Collapse all"
            >
              <ChevronsDownUp className="size-3.5" />
            </button>
          </div>
        </div>
        {/* Review progress bar */}
        <div className="h-0.5 w-full bg-zinc-800">
          <div
            className="h-full bg-green-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1" role="tree">
        <FileTreeGroup
          nodes={tree}
          depth={0}
          selectedFile={selectedFile}
          expandedPaths={expandedPaths}
          viewedFiles={viewedFiles}
          onFileSelect={onFileSelect}
          onToggle={toggleDirectory}
          onToggleViewed={handleToggleViewed}
        />
      </div>
    </div>
  );
}
