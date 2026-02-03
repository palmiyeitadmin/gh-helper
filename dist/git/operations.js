"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
    // ==================== REPO CHECK ====================
    async isGitRepository() {
        try {
            await this.git.status();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    // Raw git erişimi (analytics için)
    getGit() {
        return this.git;
    }
    // ==================== STATUS ====================
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
    async getDiff(staged = false) {
        if (staged) {
            return await this.git.diff(['--cached']);
        }
        return await this.git.diff();
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
    // ==================== BRANCH YÖNETİMİ ====================
    async getBranches() {
        const branches = await this.git.branch(['-a', '-v']);
        return Object.entries(branches.branches).map(([name, data]) => ({
            name: name,
            current: data.current,
            commit: data.commit.substring(0, 7),
            label: data.label || ''
        }));
    }
    async getLocalBranches() {
        const branches = await this.git.branch(['-v']);
        return Object.entries(branches.branches).map(([name, data]) => ({
            name: name,
            current: data.current,
            commit: data.commit.substring(0, 7),
            label: data.label || ''
        }));
    }
    async getCurrentBranch() {
        const status = await this.getStatus();
        return status.branch;
    }
    async createBranch(branchName, checkout = true) {
        if (checkout) {
            await this.git.checkoutLocalBranch(branchName);
        }
        else {
            await this.git.branch([branchName]);
        }
    }
    async deleteBranch(branchName, force = false) {
        const flag = force ? '-D' : '-d';
        await this.git.branch([flag, branchName]);
    }
    async deleteRemoteBranch(branchName, remote = 'origin') {
        await this.git.push(remote, branchName, ['--delete']);
    }
    async checkoutBranch(branchName) {
        await this.git.checkout(branchName);
    }
    async renameBranch(oldName, newName) {
        await this.git.branch(['-m', oldName, newName]);
    }
    // ==================== STASH YÖNETİMİ ====================
    async stashSave(message) {
        if (message) {
            await this.git.stash(['push', '-m', message]);
        }
        else {
            await this.git.stash(['push']);
        }
    }
    async stashPop(index) {
        if (index !== undefined) {
            await this.git.stash(['pop', `stash@{${index}}`]);
        }
        else {
            await this.git.stash(['pop']);
        }
    }
    async stashApply(index) {
        if (index !== undefined) {
            await this.git.stash(['apply', `stash@{${index}}`]);
        }
        else {
            await this.git.stash(['apply']);
        }
    }
    async stashDrop(index) {
        if (index !== undefined) {
            await this.git.stash(['drop', `stash@{${index}}`]);
        }
        else {
            await this.git.stash(['drop']);
        }
    }
    async stashClear() {
        await this.git.stash(['clear']);
    }
    async getStashList() {
        const result = await this.git.stash(['list', '--format=%gd|%s|%ar']);
        if (!result.trim())
            return [];
        return result.trim().split('\n').map((line, index) => {
            const parts = line.split('|');
            return {
                index,
                message: parts[1] || 'Stash',
                date: parts[2] || ''
            };
        });
    }
    async stashShow(index = 0) {
        const result = await this.git.stash(['show', '-p', `stash@{${index}}`]);
        return result;
    }
    // ==================== TAG YÖNETİMİ ====================
    async getTags() {
        const tags = await this.git.tags();
        const result = [];
        for (const tag of tags.all) {
            try {
                const commit = await this.git.revparse([tag]);
                result.push({
                    name: tag,
                    commit: commit.trim().substring(0, 7)
                });
            }
            catch {
                result.push({ name: tag, commit: '' });
            }
        }
        return result;
    }
    async createTag(tagName, message) {
        if (message) {
            await this.git.tag(['-a', tagName, '-m', message]);
        }
        else {
            await this.git.tag([tagName]);
        }
    }
    async deleteTag(tagName) {
        await this.git.tag(['-d', tagName]);
    }
    async deleteRemoteTag(tagName, remote = 'origin') {
        await this.git.push(remote, `:refs/tags/${tagName}`);
    }
    async pushTag(tagName, remote = 'origin') {
        await this.git.push(remote, tagName);
    }
    async pushAllTags(remote = 'origin') {
        await this.git.push(remote, '--tags');
    }
    // ==================== MERGE / REBASE ====================
    async merge(branchName, noFastForward = false) {
        const options = noFastForward ? ['--no-ff', branchName] : [branchName];
        await this.git.merge(options);
    }
    async mergeAbort() {
        await this.git.merge(['--abort']);
    }
    async rebase(branchName) {
        await this.git.rebase([branchName]);
    }
    async rebaseInteractive(commitCount) {
        await this.git.rebase(['-i', `HEAD~${commitCount}`]);
    }
    async rebaseAbort() {
        await this.git.rebase(['--abort']);
    }
    async rebaseContinue() {
        await this.git.rebase(['--continue']);
    }
    // ==================== CONFLICT YÖNETİMİ ====================
    async hasConflicts() {
        const status = await this.git.status();
        return status.conflicted.length > 0;
    }
    async getConflictedFiles() {
        const status = await this.git.status();
        return status.conflicted.map(file => ({
            file,
            status: 'both_modified'
        }));
    }
    async markAsResolved(files) {
        await this.git.add(files);
    }
    async getFileContent(file) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        return fs.promises.readFile(path_1.default.join(this.workingDir, file), 'utf-8');
    }
    async acceptOurs(file) {
        await this.git.checkout(['--ours', file]);
        await this.git.add([file]);
    }
    async acceptTheirs(file) {
        await this.git.checkout(['--theirs', file]);
        await this.git.add([file]);
    }
    // ==================== RESET / REVERT ====================
    async reset(mode = 'mixed', ref = 'HEAD~1') {
        await this.git.reset([`--${mode}`, ref]);
    }
    async revert(commitHash) {
        await this.git.revert(commitHash);
    }
    async unstageFile(file) {
        await this.git.reset(['HEAD', file]);
    }
    async discardChanges(file) {
        await this.git.checkout(['--', file]);
    }
}
exports.GitOperations = GitOperations;
exports.gitOps = new GitOperations();
