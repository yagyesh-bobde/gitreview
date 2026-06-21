"use client";

import { AnimatePresence, motion } from "motion/react";
import type { FileTreeNode as FileTreeNodeType } from "../types";
import { FileTreeNode } from "./file-tree-node";

interface FileTreeGroupProps {
  nodes: FileTreeNodeType[];
  depth: number;
  selectedFile: string | null;
  expandedPaths: Set<string>;
  viewedFiles: Record<string, boolean>;
  onFileSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onToggleViewed: (node: FileTreeNodeType) => void;
}

export function FileTreeGroup({
  nodes,
  depth,
  selectedFile,
  expandedPaths,
  viewedFiles,
  onFileSelect,
  onToggle,
  onToggleViewed,
}: FileTreeGroupProps) {
  return (
    <div role="group">
      {nodes.map((node) => {
        const isExpanded =
          node.type === "directory" && expandedPaths.has(node.path);
        const isSelected = node.type === "file" && node.path === selectedFile;

        return (
          <div key={node.path || node.name}>
            <FileTreeNode
              node={node}
              depth={depth}
              isSelected={isSelected}
              isExpanded={isExpanded}
              viewedFiles={viewedFiles}
              onSelect={onFileSelect}
              onToggle={onToggle}
              onToggleViewed={onToggleViewed}
            />

            {node.type === "directory" && node.children && (
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <FileTreeGroup
                      nodes={node.children}
                      depth={depth + 1}
                      selectedFile={selectedFile}
                      expandedPaths={expandedPaths}
                      viewedFiles={viewedFiles}
                      onFileSelect={onFileSelect}
                      onToggle={onToggle}
                      onToggleViewed={onToggleViewed}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        );
      })}
    </div>
  );
}
