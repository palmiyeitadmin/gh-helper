export interface GitStatus {
    branch: string;
    staged: string[];
    modified: string[];
    untracked: string[];
    ahead: number;
    behind: number;
    isClean: boolean;
}
export interface CommitInfo {
    hash: string;
    date: string;
    message: string;
    author: string;
}
export interface FileDiff {
    file: string;
    insertions: number;
    deletions: number;
    changes: number;
}
declare class GitOperations {
    private git;
    private workingDir;
    constructor(workingDir?: string);
    getStatus(): Promise<GitStatus>;
    getRecentCommits(count?: number): Promise<CommitInfo[]>;
    getStagedDiff(): Promise<string>;
    getFullDiff(): Promise<string>;
    getStagedFiles(): Promise<string[]>;
    getModifiedFiles(): Promise<string[]>;
    stageFiles(files: string[]): Promise<void>;
    stageAll(): Promise<void>;
    commit(message: string): Promise<string>;
    push(remote?: string, branch?: string): Promise<void>;
    pull(remote?: string, branch?: string): Promise<void>;
    getRemoteUrl(): Promise<string>;
    getDiffSummary(): Promise<FileDiff[]>;
    getWorkingDir(): string;
    getProjectName(): string;
}
export declare const gitOps: GitOperations;
export { GitOperations };
