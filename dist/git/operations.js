"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitOperations = exports.gitOps = void 0;
const simple_git_1 = __importDefault(require("simple-git"));
const path_1 = __importDefault(require("path"));
class GitOperations {
    constructor(workingDir) {
        this.workingDir = workingDir || process.cwd();
        this.git = (0, simple_git_1.default)(this.workingDir);
    }
    async getStatus() {
        const status = await this.git.status();
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
    async getRecentCommits(count = 10) {
        const log = await this.git.log({ maxCount: count });
        return log.all.map(commit => ({
            hash: commit.hash.substring(0, 7),
            date: new Date(commit.date).toLocaleDateString('tr-TR'),
            message: commit.message,
            author: commit.author_name
        }));
    }
    async getStagedDiff() {
        const diff = await this.git.diff(['--cached', '--stat']);
        return diff;
    }
    async getFullDiff() {
        const diff = await this.git.diff(['--stat']);
        return diff;
    }
    async getStagedFiles() {
        const status = await this.git.status();
        return status.staged;
    }
    async getModifiedFiles() {
        const status = await this.git.status();
        return [...status.modified, ...status.not_added];
    }
    async stageFiles(files) {
        await this.git.add(files);
    }
    async stageAll() {
        await this.git.add('.');
    }
    async commit(message) {
        const result = await this.git.commit(message);
        return result.commit;
    }
    async push(remote = 'origin', branch) {
        const status = await this.getStatus();
        const targetBranch = branch || status.branch;
        await this.git.push(remote, targetBranch);
    }
    async pull(remote = 'origin', branch) {
        const status = await this.getStatus();
        const targetBranch = branch || status.branch;
        await this.git.pull(remote, targetBranch);
    }
    async getRemoteUrl() {
        try {
            const remotes = await this.git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin');
            return origin?.refs?.fetch || 'unknown';
        }
        catch {
            return 'unknown';
        }
    }
    async getDiffSummary() {
        const status = await this.git.status();
        const diffs = [];
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
    getWorkingDir() {
        return this.workingDir;
    }
    getProjectName() {
        return path_1.default.basename(this.workingDir);
    }
}
exports.GitOperations = GitOperations;
exports.gitOps = new GitOperations();
