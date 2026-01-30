import simpleGit, { SimpleGit, StatusResult, LogResult } from 'simple-git';
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

class GitOperations {
    private git: SimpleGit;
    private workingDir: string;

    constructor(workingDir?: string) {
        this.workingDir = workingDir || process.cwd();
        this.git = simpleGit(this.workingDir);
    }

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
}

export const gitOps = new GitOperations();
export { GitOperations };
