import simpleGit, { SimpleGit, StatusResult, LogResult, BranchSummary } from 'simple-git';
import path from 'path';

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

class GitOperations {
    private git: SimpleGit;
    private workingDir: string;

    constructor(workingDir?: string) {
        this.workingDir = workingDir || process.cwd();
        this.git = simpleGit(this.workingDir);
    }

    // ==================== REPO CHECK ====================
    async isGitRepository(): Promise<boolean> {
        try {
            await this.git.status();
            return true;
        } catch (error) {
            return false;
        }
    }

    // Raw git erişimi (analytics için)
    getGit(): SimpleGit {
        return this.git;
    }

    // ==================== STATUS ====================
    async getStatus(): Promise<GitStatus> {
        const status: StatusResult = await this.git.status();

        return {
            branch: status.current || 'unknown',
            staged: status.staged,
            modified: status.modified,
            untracked: status.not_added,
            ahead: status.ahead,
            behind: status.behind,
            isClean: status.isClean()
        };
    }

    async getRecentCommits(count: number = 10): Promise<CommitInfo[]> {
        const log: LogResult = await this.git.log({ maxCount: count });

        return log.all.map(commit => ({
            hash: commit.hash.substring(0, 7),
            date: new Date(commit.date).toLocaleDateString('tr-TR'),
            message: commit.message,
            author: commit.author_name
        }));
    }

    async getStagedDiff(): Promise<string> {
        const diff = await this.git.diff(['--cached', '--stat']);
        return diff;
    }

    async getFullDiff(): Promise<string> {
        const diff = await this.git.diff(['--stat']);
        return diff;
    }

    async getStagedFiles(): Promise<string[]> {
        const status = await this.git.status();
        return status.staged;
    }

    async getDiff(staged: boolean = false): Promise<string> {
        if (staged) {
            return await this.git.diff(['--cached']);
        }
        return await this.git.diff();
    }

    async getModifiedFiles(): Promise<string[]> {
        const status = await this.git.status();
        return [...status.modified, ...status.not_added];
    }

    async stageFiles(files: string[]): Promise<void> {
        await this.git.add(files);
    }

    async stageAll(): Promise<void> {
        await this.git.add('.');
    }

    async commit(message: string): Promise<string> {
        const result = await this.git.commit(message);
        return result.commit;
    }

    async push(remote: string = 'origin', branch?: string): Promise<void> {
        const status = await this.getStatus();
        const targetBranch = branch || status.branch;
        await this.git.push(remote, targetBranch);
    }

    async pull(remote: string = 'origin', branch?: string): Promise<void> {
        const status = await this.getStatus();
        const targetBranch = branch || status.branch;
        await this.git.pull(remote, targetBranch);
    }

    async getRemoteUrl(): Promise<string> {
        try {
            const remotes = await this.git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin');
            return origin?.refs?.fetch || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    async getDiffSummary(): Promise<FileDiff[]> {
        const status = await this.git.status();
        const diffs: FileDiff[] = [];

        for (const file of status.staged) {
            diffs.push({
                file,
                insertions: 0,
                deletions: 0,
                changes: 1
            });
        }

        return diffs;
    }

    getWorkingDir(): string {
        return this.workingDir;
    }

    getProjectName(): string {
        return path.basename(this.workingDir);
    }

    // ==================== BRANCH YÖNETİMİ ====================
    async getBranches(): Promise<BranchInfo[]> {
        const branches: BranchSummary = await this.git.branch(['-a', '-v']);

        return Object.entries(branches.branches).map(([name, data]) => ({
            name: name,
            current: data.current,
            commit: data.commit.substring(0, 7),
            label: data.label || ''
        }));
    }

    async getLocalBranches(): Promise<BranchInfo[]> {
        const branches: BranchSummary = await this.git.branch(['-v']);

        return Object.entries(branches.branches).map(([name, data]) => ({
            name: name,
            current: data.current,
            commit: data.commit.substring(0, 7),
            label: data.label || ''
        }));
    }

    async getCurrentBranch(): Promise<string> {
        const status = await this.getStatus();
        return status.branch;
    }

    async createBranch(branchName: string, checkout: boolean = true): Promise<void> {
        if (checkout) {
            await this.git.checkoutLocalBranch(branchName);
        } else {
            await this.git.branch([branchName]);
        }
    }

    async deleteBranch(branchName: string, force: boolean = false): Promise<void> {
        const flag = force ? '-D' : '-d';
        await this.git.branch([flag, branchName]);
    }

    async deleteRemoteBranch(branchName: string, remote: string = 'origin'): Promise<void> {
        await this.git.push(remote, branchName, ['--delete']);
    }

    async checkoutBranch(branchName: string): Promise<void> {
        await this.git.checkout(branchName);
    }

    async renameBranch(oldName: string, newName: string): Promise<void> {
        await this.git.branch(['-m', oldName, newName]);
    }

    // ==================== STASH YÖNETİMİ ====================
    async stashSave(message?: string): Promise<void> {
        if (message) {
            await this.git.stash(['push', '-m', message]);
        } else {
            await this.git.stash(['push']);
        }
    }

    async stashPop(index?: number): Promise<void> {
        if (index !== undefined) {
            await this.git.stash(['pop', `stash@{${index}}`]);
        } else {
            await this.git.stash(['pop']);
        }
    }

    async stashApply(index?: number): Promise<void> {
        if (index !== undefined) {
            await this.git.stash(['apply', `stash@{${index}}`]);
        } else {
            await this.git.stash(['apply']);
        }
    }

    async stashDrop(index?: number): Promise<void> {
        if (index !== undefined) {
            await this.git.stash(['drop', `stash@{${index}}`]);
        } else {
            await this.git.stash(['drop']);
        }
    }

    async stashClear(): Promise<void> {
        await this.git.stash(['clear']);
    }

    async getStashList(): Promise<StashInfo[]> {
        const result = await this.git.stash(['list', '--format=%gd|%s|%ar']);
        if (!result.trim()) return [];

        return result.trim().split('\n').map((line, index) => {
            const parts = line.split('|');
            return {
                index,
                message: parts[1] || 'Stash',
                date: parts[2] || ''
            };
        });
    }

    async stashShow(index: number = 0): Promise<string> {
        const result = await this.git.stash(['show', '-p', `stash@{${index}}`]);
        return result;
    }

    // ==================== TAG YÖNETİMİ ====================
    async getTags(): Promise<TagInfo[]> {
        const tags = await this.git.tags();
        const result: TagInfo[] = [];

        for (const tag of tags.all) {
            try {
                const commit = await this.git.revparse([tag]);
                result.push({
                    name: tag,
                    commit: commit.trim().substring(0, 7)
                });
            } catch {
                result.push({ name: tag, commit: '' });
            }
        }

        return result;
    }

    async createTag(tagName: string, message?: string): Promise<void> {
        if (message) {
            await this.git.tag(['-a', tagName, '-m', message]);
        } else {
            await this.git.tag([tagName]);
        }
    }

    async deleteTag(tagName: string): Promise<void> {
        await this.git.tag(['-d', tagName]);
    }

    async deleteRemoteTag(tagName: string, remote: string = 'origin'): Promise<void> {
        await this.git.push(remote, `:refs/tags/${tagName}`);
    }

    async pushTag(tagName: string, remote: string = 'origin'): Promise<void> {
        await this.git.push(remote, tagName);
    }

    async pushAllTags(remote: string = 'origin'): Promise<void> {
        await this.git.push(remote, '--tags');
    }

    // ==================== MERGE / REBASE ====================
    async merge(branchName: string, noFastForward: boolean = false): Promise<void> {
        const options = noFastForward ? ['--no-ff', branchName] : [branchName];
        await this.git.merge(options);
    }

    async mergeAbort(): Promise<void> {
        await this.git.merge(['--abort']);
    }

    async rebase(branchName: string): Promise<void> {
        await this.git.rebase([branchName]);
    }

    async rebaseInteractive(commitCount: number): Promise<void> {
        await this.git.rebase(['-i', `HEAD~${commitCount}`]);
    }

    async rebaseAbort(): Promise<void> {
        await this.git.rebase(['--abort']);
    }

    async rebaseContinue(): Promise<void> {
        await this.git.rebase(['--continue']);
    }

    // ==================== CONFLICT YÖNETİMİ ====================
    async hasConflicts(): Promise<boolean> {
        const status = await this.git.status();
        return status.conflicted.length > 0;
    }

    async getConflictedFiles(): Promise<ConflictFile[]> {
        const status = await this.git.status();

        return status.conflicted.map(file => ({
            file,
            status: 'both_modified' as const
        }));
    }

    async markAsResolved(files: string[]): Promise<void> {
        await this.git.add(files);
    }

    async getFileContent(file: string): Promise<string> {
        const fs = await import('fs');
        return fs.promises.readFile(path.join(this.workingDir, file), 'utf-8');
    }

    async acceptOurs(file: string): Promise<void> {
        await this.git.checkout(['--ours', file]);
        await this.git.add([file]);
    }

    async acceptTheirs(file: string): Promise<void> {
        await this.git.checkout(['--theirs', file]);
        await this.git.add([file]);
    }

    // ==================== RESET / REVERT ====================
    async reset(mode: 'soft' | 'mixed' | 'hard' = 'mixed', ref: string = 'HEAD~1'): Promise<void> {
        await this.git.reset([`--${mode}`, ref]);
    }

    async revert(commitHash: string): Promise<void> {
        await this.git.revert(commitHash);
    }

    async unstageFile(file: string): Promise<void> {
        await this.git.reset(['HEAD', file]);
    }

    async discardChanges(file: string): Promise<void> {
        await this.git.checkout(['--', file]);
    }
}

export const gitOps = new GitOperations();
export { GitOperations };
