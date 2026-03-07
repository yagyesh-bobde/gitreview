'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  FilePlus,
  FileMinus,
  FileEdit,
  ArrowRight,
} from 'lucide-react';
import type { PRFile, FileStatus } from '@/types/pr';
import { cn } from '@/lib/utils/cn';

interface FileTreeProps {
  files: PRFile[];
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: Map<string, TreeNode>;
  file?: PRFile;
}

function buildTree(files: PRFile[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isDirectory: true, children: new Map() };

  for (const file of files) {
    const parts = file.filename.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path,
          isDirectory: !isLast,
          children: new Map(),
          file: isLast ? file : undefined,
        });
      }
      current = current.children.get(part)!;
    }
  }

  return root;
}

function flattenSingleChildDirs(node: TreeNode): TreeNode {
  if (!node.isDirectory || node.children.size !== 1) {
    const newChildren = new Map<string, TreeNode>();
    for (const [key, child] of node.children) {
      newChildren.set(key, flattenSingleChildDirs(child));
    }
    return { ...node, children: newChildren };
  }

  const [, child] = [...node.children.entries()][0];
  if (!child.isDirectory) return node;

  // Collapse single-child directory into parent
  const collapsed: TreeNode = {
    ...child,
    name: node.name ? `${node.name}/${child.name}` : child.name,
  };
  return flattenSingleChildDirs(collapsed);
}

const statusIcons: Record<FileStatus, typeof File> = {
  added: FilePlus,
  removed: FileMinus,
  modified: FileEdit,
  renamed: ArrowRight,
  copied: File,
};

const statusColors: Record<FileStatus, string> = {
  added: 'text-green-500',
  removed: 'text-red-500',
  modified: 'text-yellow-500',
  renamed: 'text-blue-500',
  copied: 'text-zinc-500',
};

function FileTreeNode({
  node,
  depth,
  selectedFile,
  onFileSelect,
  expandedDirs,
  onToggleDir,
}: {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
}) {
  const sortedChildren = useMemo(() => {
    return [...node.children.values()].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [node.children]);

  if (node.isDirectory) {
    const isExpanded = expandedDirs.has(node.path);
    const Chevron = isExpanded ? ChevronDown : ChevronRight;

    return (
      <div>
        <button
          onClick={() => onToggleDir(node.path)}
          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          <Chevron className="size-3.5 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded &&
          sortedChildren.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              expandedDirs={expandedDirs}
              onToggleDir={onToggleDir}
            />
          ))}
      </div>
    );
  }

  const file = node.file;
  const status = file?.status ?? 'modified';
  const Icon = statusIcons[status];
  const isSelected = selectedFile === node.path;

  return (
    <button
      onClick={() => onFileSelect(node.path)}
      className={cn(
        'flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-sm transition-colors',
        isSelected
          ? 'bg-zinc-800 text-zinc-100'
          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-300',
      )}
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
      title={node.path}
    >
      <Icon className={cn('size-3.5 shrink-0', statusColors[status])} />
      <span className="truncate">{node.name}</span>
      {file && (file.additions > 0 || file.deletions > 0) && (
        <span className="ml-auto flex shrink-0 gap-1 text-xs">
          {file.additions > 0 && <span className="text-green-600">+{file.additions}</span>}
          {file.deletions > 0 && <span className="text-red-600">-{file.deletions}</span>}
        </span>
      )}
    </button>
  );
}

export function FileTree({ files, selectedFile, onFileSelect }: FileTreeProps) {
  const tree = useMemo(() => {
    const raw = buildTree(files);
    const flattened = flattenSingleChildDirs(raw);
    return flattened;
  }, [files]);

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => {
    // Auto-expand all directories on initial render
    const dirs = new Set<string>();
    function collectDirs(node: TreeNode) {
      if (node.isDirectory) {
        if (node.path) dirs.add(node.path);
        for (const child of node.children.values()) collectDirs(child);
      }
    }
    collectDirs(tree);
    return dirs;
  });

  const onToggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const sortedChildren = useMemo(
    () =>
      [...tree.children.values()].sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [tree.children],
  );

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 overflow-y-auto px-1 py-1" role="tree" aria-label="File tree">
        {sortedChildren.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={0}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
            expandedDirs={expandedDirs}
            onToggleDir={onToggleDir}
          />
        ))}
      </nav>
      <div className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-500">
        {files.length} {files.length === 1 ? 'file' : 'files'} changed
      </div>
    </div>
  );
}
