import type { FileStatus } from '@/types/pr';

export type FileCategory = 'source' | 'test' | 'config' | 'docs' | 'other';
export type ImpactLevel = 'high' | 'medium' | 'low';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  status?: FileStatus;
  additions?: number;
  deletions?: number;
  children?: FileNode[];
  category?: FileCategory;
  impact?: ImpactLevel;
}

export interface FileGroup {
  label: string;
  category: FileCategory;
  files: FileNode[];
}
