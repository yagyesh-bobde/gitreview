import type { PRFileStatus } from "@/types/pr";

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  status?: PRFileStatus;
  additions?: number;
  deletions?: number;
  children?: FileTreeNode[];
  isExpanded?: boolean;
}

export type ImpactLevel = "low" | "medium" | "high" | "critical";

export interface FileGroup {
  name: string;
  path: string;
  files: FileTreeNode[];
  totalAdditions: number;
  totalDeletions: number;
}
