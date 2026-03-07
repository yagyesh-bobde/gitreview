export type PRFileStatus =
  | "added"
  | "removed"
  | "modified"
  | "renamed"
  | "copied";

export interface PRFile {
  sha: string;
  filename: string;
  status: PRFileStatus;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previousFilename?: string;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed" | "merged";
  user: {
    login: string;
    avatarUrl: string;
  };
  baseBranch: string;
  headBranch: string;
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface PRComment {
  id: number;
  body: string;
  user: {
    login: string;
    avatarUrl: string;
  };
  path?: string;
  line?: number;
  side?: "LEFT" | "RIGHT";
  createdAt: string;
  updatedAt: string;
}
