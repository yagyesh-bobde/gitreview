"use client";

import { AnimatePresence, motion } from "motion/react";
import type { FileTreeNode as FileTreeNodeType } from "../types";
import { FileTreeNode } from "./file-tree-node";

interface FileTreeGroupProps {
  nodes: FileTreeNodeType[];
  depth: number;
  selectedFile: string | null;
  expandedPaths: Set<string>;
  onFileSelect: (path: string) => void;
  onToggle: (path: string) => void;
}

export function FileTreeGroup({
  nodes,
  depth,
  selectedFile,
  expandedPaths,
  onFileSelect,
  onToggle,
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
              onSelect={onFileSelect}
              onToggle={onToggle}
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
                      onFileSelect={onFileSelect}
                      onToggle={onToggle}
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
