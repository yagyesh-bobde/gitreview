"use client";

import { File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileTreeNode as FileTreeNodeType } from "../types";
import { getImpactLevel } from "../lib/impact-scoring";
import { FileImpactBadge } from "./file-impact-badge";

interface FileTreeNodeProps {
  node: FileTreeNodeType;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  added: "text-emerald-400",
  removed: "text-red-400",
  modified: "text-yellow-400",
  renamed: "text-blue-400",
  copied: "text-blue-400",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  added: "bg-emerald-400",
  removed: "bg-red-400",
  modified: "bg-yellow-400",
  renamed: "bg-blue-400",
  copied: "bg-blue-400",
};

export function FileTreeNode({
  node,
  depth,
  isSelected,
  isExpanded,
  onSelect,
  onToggle,
}: FileTreeNodeProps) {
  const isDirectory = node.type === "directory";
  const changes = (node.additions ?? 0) + (node.deletions ?? 0);
  const impactLevel = changes > 0 ? getImpactLevel(changes) : null;

  const handleClick = () => {
    if (isDirectory) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left text-sm transition-colors duration-150",
        "hover:bg-zinc-800",
        isSelected && !isDirectory && "bg-zinc-700 text-white",
        !isSelected && "text-zinc-400"
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      aria-expanded={isDirectory ? isExpanded : undefined}
      role={isDirectory ? "treeitem" : "treeitem"}
      title={node.path}
    >
      {/* Icon */}
      <span className="flex shrink-0 items-center">
        {isDirectory ? (
          isExpanded ? (
            <FolderOpen className="size-4 text-zinc-500" />
          ) : (
            <Folder className="size-4 text-zinc-500" />
          )
        ) : (
          <File className="size-4 text-zinc-500" />
        )}
      </span>

      {/* Name with status color */}
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-mono text-xs",
          node.status && STATUS_COLORS[node.status]
        )}
      >
        {node.name}
      </span>

      {/* Status dot for files */}
      {!isDirectory && node.status && (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            STATUS_DOT_COLORS[node.status]
          )}
        />
      )}

      {/* Change counts for files */}
      {!isDirectory && (node.additions || node.deletions) ? (
        <span className="flex shrink-0 items-center gap-1 font-mono text-[10px]">
          {node.additions ? (
            <span className="text-emerald-400">+{node.additions}</span>
          ) : null}
          {node.deletions ? (
            <span className="text-red-400">-{node.deletions}</span>
          ) : null}
        </span>
      ) : null}

      {/* Impact badge for files */}
      {!isDirectory && impactLevel && impactLevel !== "low" && (
        <FileImpactBadge
          level={impactLevel}
          className="opacity-0 transition-opacity group-hover:opacity-100"
        />
      )}

      {/* Aggregated stats for directories */}
      {isDirectory && changes > 0 && (
        <span className="shrink-0 font-mono text-[10px] text-zinc-500">
          {changes > 0 && `\u00B1${changes}`}
        </span>
      )}
    </button>
  );
}
