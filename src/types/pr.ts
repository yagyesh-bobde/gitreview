export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  author: {
    login: string;
    avatarUrl: string;
  };
  baseBranch: string;
  headBranch: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  mergeable: boolean | null;
  labels: Array<{
    name: string;
    color: string;
  }>;
}

export type FileStatus = 'added' | 'removed' | 'modified' | 'renamed' | 'copied';

export interface PRFile {
  filename: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
  previousFilename: string | null;
}

export interface PRComment {
  id: number;
  body: string;
  path: string | null;
  line: number | null;
  side: 'LEFT' | 'RIGHT' | null;
  author: {
    login: string;
    avatarUrl: string;
  };
  createdAt: string;
  updatedAt: string;
  inReplyToId: number | null;
}
