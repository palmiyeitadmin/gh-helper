"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showDashboard = showDashboard;
const ora_1 = __importDefault(require("ora"));
const operations_1 = require("../git/operations");
const display_1 = require("../ui/display");
const prompts_1 = require("../ui/prompts");
const suggest_1 = require("../ai/suggest");
async function showDashboard() {
    try {
        const projectName = operations_1.gitOps.getProjectName();
        (0, display_1.displayHeader)(projectName);
        const spinner = (0, ora_1.default)('Git durumu yükleniyor...').start();
        const status = await operations_1.gitOps.getStatus();
        const commits = await operations_1.gitOps.getRecentCommits(5);
        spinner.stop();
        (0, display_1.displayStatus)(status);
        (0, display_1.displayRecentCommits)(commits);
        // Interactive menu loop
        let running = true;
        while (running) {
            console.log();
            const { action } = await (0, prompts_1.promptMainMenu)(status);
            switch (action) {
                case 'commit':
                    await handleCommit(false);
                    running = false;
                    break;
                case 'commit-push':
                    await handleCommit(true);
                    running = false;
                    break;
                case 'stage':
                    await handleStage();
                    // Refresh status and continue
                    const newStatus = await operations_1.gitOps.getStatus();
                    (0, display_1.displayStatus)(newStatus);
                    break;
                case 'status':
                    await showDetailedStatus();
                    break;
                case 'diff':
                    await showDiff();
                    break;
                case 'history':
                    const allCommits = await operations_1.gitOps.getRecentCommits(10);
                    (0, display_1.displayRecentCommits)(allCommits);
                    break;
                case 'pull':
                    await handlePull();
                    break;
                case 'exit':
                    running = false;
                    console.log('\n👋 Görüşmek üzere!\n');
                    break;
            }
        }
    }
    catch (error) {
        (0, display_1.displayError)(`Dashboard yüklenemedi: ${error}`);
        process.exit(1);
    }
}
async function handleCommit(pushAfter) {
    const spinner = (0, ora_1.default)('Değişiklikler analiz ediliyor...').start();
    const stagedFiles = await operations_1.gitOps.getStagedFiles();
    if (stagedFiles.length === 0) {
        spinner.stop();
        (0, display_1.displayError)('Staged dosya yok. Önce dosyaları stage\'leyin.');
        return;
    }
    // Generate AI suggestion
    const suggestion = await (0, suggest_1.generateCommitSuggestion)();
    spinner.stop();
    (0, display_1.displayCommitSuggestion)(suggestion.fullMessage);
    // Get commit message
    const commitMessage = await (0, prompts_1.promptCommitMessage)(suggestion.fullMessage);
    // Commit
    const commitSpinner = (0, ora_1.default)('Commit yapılıyor...').start();
    try {
        const hash = await operations_1.gitOps.commit(commitMessage);
        commitSpinner.succeed(`Commit yapıldı: ${commitMessage}`);
        if (pushAfter) {
            await handlePush();
        }
        else {
            const shouldPush = await (0, prompts_1.promptConfirmPush)();
            if (shouldPush) {
                await handlePush();
            }
        }
    }
    catch (error) {
        commitSpinner.fail(`Commit başarısız: ${error}`);
    }
}
async function handleStage() {
    const status = await operations_1.gitOps.getStatus();
    const unstaged = [...status.modified, ...status.untracked];
    if (unstaged.length === 0) {
        (0, display_1.displaySuccess)('Tüm dosyalar zaten staged!');
        return;
    }
    const filesToStage = await (0, prompts_1.promptStageFiles)(unstaged);
    if (filesToStage.length === 0) {
        return;
    }
    const spinner = (0, ora_1.default)('Dosyalar stage\'leniyor...').start();
    if (filesToStage.length === unstaged.length) {
        await operations_1.gitOps.stageAll();
    }
    else {
        await operations_1.gitOps.stageFiles(filesToStage);
    }
    spinner.succeed(`${filesToStage.length} dosya stage\'lendi`);
}
async function handlePush() {
    const spinner = (0, ora_1.default)('GitHub\'a gönderiliyor...').start();
    try {
        await operations_1.gitOps.push();
        spinner.succeed('GitHub\'a başarıyla gönderildi!');
    }
    catch (error) {
        spinner.fail(`Push başarısız: ${error}`);
    }
}
async function handlePull() {
    const spinner = (0, ora_1.default)('GitHub\'dan çekiliyor...').start();
    try {
        await operations_1.gitOps.pull();
        spinner.succeed('GitHub\'dan başarıyla çekildi!');
    }
    catch (error) {
        spinner.fail(`Pull başarısız: ${error}`);
    }
}
async function showDetailedStatus() {
    const status = await operations_1.gitOps.getStatus();
    const remoteUrl = await operations_1.gitOps.getRemoteUrl();
    console.log(`\n📍 Remote: ${remoteUrl}`);
    (0, display_1.displayStatus)(status);
}
async function showDiff() {
    const spinner = (0, ora_1.default)('Diff yükleniyor...').start();
    const stagedDiff = await operations_1.gitOps.getStagedDiff();
    const unstagedDiff = await operations_1.gitOps.getFullDiff();
    spinner.stop();
    if (stagedDiff) {
        console.log('\n📝 Staged Değişiklikler:');
        console.log(stagedDiff);
    }
    if (unstagedDiff) {
        console.log('\n📄 Unstaged Değişiklikler:');
        console.log(unstagedDiff);
    }
    if (!stagedDiff && !unstagedDiff) {
        console.log('\nDeğişiklik algılanmadı.');
    }
}
