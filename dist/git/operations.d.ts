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
export interface BranchInfo {
    name: string;
    current: boolean;
    commit: string;
    label: string;
}
export interface StashInfo {
    index: number;
    message: string;
    date: string;
}
export interface TagInfo {
    name: string;
    commit: string;
}
export interface ConflictFile {
    file: string;
    status: 'both_modified' | 'deleted_by_us' | 'deleted_by_them' | 'both_added';
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
    getBranches(): Promise<BranchInfo[]>;
    getLocalBranches(): Promise<BranchInfo[]>;
    getCurrentBranch(): Promise<string>;
    createBranch(branchName: string, checkout?: boolean): Promise<void>;
    deleteBranch(branchName: string, force?: boolean): Promise<void>;
    deleteRemoteBranch(branchName: string, remote?: string): Promise<void>;
    checkoutBranch(branchName: string): Promise<void>;
    renameBranch(oldName: string, newName: string): Promise<void>;
    stashSave(message?: string): Promise<void>;
    stashPop(index?: number): Promise<void>;
    stashApply(index?: number): Promise<void>;
    stashDrop(index?: number): Promise<void>;
    stashClear(): Promise<void>;
    getStashList(): Promise<StashInfo[]>;
    stashShow(index?: number): Promise<string>;
    getTags(): Promise<TagInfo[]>;
    createTag(tagName: string, message?: string): Promise<void>;
    deleteTag(tagName: string): Promise<void>;
    deleteRemoteTag(tagName: string, remote?: string): Promise<void>;
    pushTag(tagName: string, remote?: string): Promise<void>;
    pushAllTags(remote?: string): Promise<void>;
    merge(branchName: string, noFastForward?: boolean): Promise<void>;
    mergeAbort(): Promise<void>;
    rebase(branchName: string): Promise<void>;
    rebaseInteractive(commitCount: number): Promise<void>;
    rebaseAbort(): Promise<void>;
    rebaseContinue(): Promise<void>;
    hasConflicts(): Promise<boolean>;
    getConflictedFiles(): Promise<ConflictFile[]>;
    markAsResolved(files: string[]): Promise<void>;
    getFileContent(file: string): Promise<string>;
    acceptOurs(file: string): Promise<void>;
    acceptTheirs(file: string): Promise<void>;
    reset(mode?: 'soft' | 'mixed' | 'hard', ref?: string): Promise<void>;
    revert(commitHash: string): Promise<void>;
    unstageFile(file: string): Promise<void>;
    discardChanges(file: string): Promise<void>;
}
export declare const gitOps: GitOperations;
export { GitOperations };
