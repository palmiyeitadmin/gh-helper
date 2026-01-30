"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.interactiveCommit = interactiveCommit;
exports.manualCommit = manualCommit;
const ora_1 = __importDefault(require("ora"));
const operations_1 = require("../git/operations");
const display_1 = require("../ui/display");
const prompts_1 = require("../ui/prompts");
const suggest_1 = require("../ai/suggest");
async function interactiveCommit() {
    const projectName = operations_1.gitOps.getProjectName();
    (0, display_1.displayHeader)(projectName);
    const spinner = (0, ora_1.default)('Staged dosyalar kontrol ediliyor...').start();
    try {
        let stagedFiles = await operations_1.gitOps.getStagedFiles();
        const status = await operations_1.gitOps.getStatus();
        spinner.stop();
        // If no staged files, offer to stage
        if (stagedFiles.length === 0) {
            const unstaged = [...status.modified, ...status.untracked];
            if (unstaged.length === 0) {
                (0, display_1.displayWarning)('Commit edilecek değişiklik yok.');
                return;
            }
            (0, display_1.displayWarning)('Staged dosya yok.');
            console.log('');
            const filesToStage = await (0, prompts_1.promptStageFiles)(unstaged);
            if (filesToStage.length === 0) {
                (0, display_1.displayWarning)('Dosya seçilmedi. İptal ediliyor.');
                return;
            }
            const stageSpinner = (0, ora_1.default)('Dosyalar stage\'leniyor...').start();
            await operations_1.gitOps.stageFiles(filesToStage);
            stageSpinner.succeed(`${filesToStage.length} dosya stage\'lendi`);
            stagedFiles = filesToStage;
        }
        (0, display_1.displayStagedFiles)(stagedFiles);
        // Generate AI suggestion
        const suggestionSpinner = (0, ora_1.default)('Commit mesajı oluşturuluyor...').start();
        const suggestion = await (0, suggest_1.generateCommitSuggestion)();
        suggestionSpinner.stop();
        (0, display_1.displayCommitSuggestion)(suggestion.fullMessage);
        // Get commit message from user
        const commitMessage = await (0, prompts_1.promptCommitMessage)(suggestion.fullMessage);
        // Commit
        const commitSpinner = (0, ora_1.default)('Commit yapılıyor...').start();
        const hash = await operations_1.gitOps.commit(commitMessage);
        commitSpinner.succeed(`Commit yapıldı: ${commitMessage}`);
        // Offer to push
        const shouldPush = await (0, prompts_1.promptConfirmPush)();
        if (shouldPush) {
            const pushSpinner = (0, ora_1.default)('GitHub\'a gönderiliyor...').start();
            await operations_1.gitOps.push();
            pushSpinner.succeed('GitHub\'a başarıyla gönderildi!');
        }
    }
    catch (error) {
        (0, display_1.displayError)(`Commit başarısız: ${error}`);
        process.exit(1);
    }
}
async function manualCommit() {
    const projectName = operations_1.gitOps.getProjectName();
    (0, display_1.displayHeader)(projectName);
    const stagedFiles = await operations_1.gitOps.getStagedFiles();
    if (stagedFiles.length === 0) {
        (0, display_1.displayWarning)('Staged dosya yok. Önce dosyaları stage\'leyin.');
        return;
    }
    (0, display_1.displayStagedFiles)(stagedFiles);
    // Manual conventional commit builder
    console.log('\n📝 Commit mesajınızı oluşturun:\n');
    const type = await (0, prompts_1.promptSelectCommitType)();
    const scope = await (0, prompts_1.promptCommitScope)();
    const description = await (0, prompts_1.promptCommitDescription)();
    const commitMessage = (0, suggest_1.formatConventionalCommit)(type, scope, description);
    console.log(`\n📋 Commit mesajı: ${commitMessage}\n`);
    const commitSpinner = (0, ora_1.default)('Commit yapılıyor...').start();
    try {
        await operations_1.gitOps.commit(commitMessage);
        commitSpinner.succeed(`Commit yapıldı: ${commitMessage}`);
    }
    catch (error) {
        commitSpinner.fail(`Commit başarısız: ${error}`);
    }
}
