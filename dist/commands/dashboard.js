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
exports.showDashboard = showDashboard;
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const operations_1 = require("../git/operations");
const display_1 = require("../ui/display");
const prompts_1 = require("../ui/prompts");
const suggest_1 = require("../ai/suggest");
const settings_1 = require("../config/settings");
// Sub-menu functions - imported inline to avoid circular dependencies
const branch_1 = require("./branch");
const stash_1 = require("./stash");
const tag_1 = require("./tag");
const merge_1 = require("./merge");
const init_1 = require("./init");
const gitignore_1 = require("./gitignore");
const settings_2 = require("./settings");
const security_1 = require("./security");
const analytics_1 = require("./analytics");
const advanced_1 = require("./advanced");
async function showDashboard() {
    let running = true;
    while (running) {
        try {
            console.clear();
            const projectName = operations_1.gitOps.getProjectName();
            (0, display_1.displayHeader)(projectName);
            // Check if current directory is a git repository
            const isGitRepo = await operations_1.gitOps.isGitRepository();
            if (!isGitRepo) {
                // Not a git repository - show init/clone menu
                console.log(chalk_1.default.yellow('\n⚠️ Bu klasör bir Git repository değil.\n'));
                const { action } = await inquirer_1.default.prompt([{
                        type: 'list',
                        name: 'action',
                        message: 'Ne yapmak istersiniz?',
                        choices: [
                            { name: '🆕 Yeni Git repository başlat', value: 'init' },
                            { name: '📥 Uzak repository klonla', value: 'clone' },
                            { name: '📝 .gitignore oluştur', value: 'gitignore' },
                            { name: '❌ Çıkış', value: 'exit' }
                        ]
                    }]);
                switch (action) {
                    case 'init':
                        await (0, init_1.initRepositoryMenu)();
                        break;
                    case 'clone':
                        const { cloneRepository } = await Promise.resolve().then(() => __importStar(require('./init')));
                        await cloneRepository();
                        running = false;
                        break;
                    case 'gitignore':
                        await (0, gitignore_1.manageGitignoreMenu)();
                        break;
                    case 'exit':
                        running = false;
                        console.log('\n👋 Görüşmek üzere!\n');
                        break;
                }
                continue;
            }
            const spinner = (0, ora_1.default)('Git durumu yükleniyor...').start();
            const status = await operations_1.gitOps.getStatus();
            const commits = await operations_1.gitOps.getRecentCommits(5);
            spinner.stop();
            (0, display_1.displayStatus)(status);
            (0, display_1.displayRecentCommits)(commits);
            console.log();
            const { action } = await promptMainDashboardMenu(status);
            switch (action) {
                case 'commit':
                    await handleCommit(false);
                    break;
                case 'commit-push':
                    await handleCommit(true);
                    break;
                case 'stage':
                    await handleStage();
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
                    await waitForEnter();
                    break;
                case 'pull':
                    await handlePull();
                    break;
                case 'push':
                    await handlePush();
                    break;
                case 'branch':
                    await (0, branch_1.manageBranchesMenu)();
                    break;
                case 'stash':
                    await (0, stash_1.manageStashMenu)();
                    break;
                case 'tag':
                    await (0, tag_1.manageTagsMenu)();
                    break;
                case 'merge':
                    await (0, merge_1.manageMergeRebaseMenu)();
                    break;
                case 'remote':
                    await (0, init_1.initRepositoryMenu)();
                    break;
                case 'gitignore':
                    await (0, gitignore_1.manageGitignoreMenu)();
                    break;
                case 'settings':
                    await (0, settings_2.manageSettingsMenu)();
                    (0, settings_1.refreshConfig)(); // Ayarlar değiştiğinde yenile
                    break;
                case 'sensitive-scan':
                case 'conventional':
                case 'security':
                    await (0, security_1.manageSecurityMenu)();
                    break;
                case 'commit-stats':
                case 'contributors':
                case 'branch-compare':
                case 'analytics':
                    await (0, analytics_1.manageAnalyticsMenu)();
                    break;
                case 'cherrypick':
                case 'bisect':
                case 'blame':
                case 'reflog':
                case 'advanced':
                    await (0, advanced_1.manageAdvancedMenu)();
                    break;
                case 'exit':
                    running = false;
                    console.log('\n👋 Görüşmek üzere!\n');
                    break;
            }
        }
        catch (error) {
            (0, display_1.displayError)(`Hata: ${error}`);
            await waitForEnter();
        }
    }
}
async function promptMainDashboardMenu(status) {
    const config = (0, settings_1.getConfig)();
    const choices = [];
    // Profil bilgisi göster
    const profileLabel = config.profile === 'standard' ? '👤' : config.profile === 'expert' ? '👨‍💻' : '⚙️';
    // Çıkış ve Ayarlar EN ÜSTTE (kolay erişim için)
    choices.push({ name: '❌  Çıkış', value: 'exit' }, { name: `⚙️  Ayarlar ${profileLabel}`, value: 'settings' }, new inquirer_1.default.Separator('─── Git İşlemleri ───'));
    // Stage
    if (status.modified.length > 0 || status.untracked.length > 0) {
        choices.push({ name: `➕  Dosyaları stage'le (${status.modified.length + status.untracked.length} dosya)`, value: 'stage' });
    }
    // Commit
    if (status.staged.length > 0) {
        choices.push({ name: `📝  Commit yap (${status.staged.length} staged dosya)`, value: 'commit' });
        choices.push({ name: '📤  Commit\'le ve push\'la', value: 'commit-push' });
    }
    // Push
    if (status.ahead > 0) {
        choices.push({ name: `⬆️  Push yap (${status.ahead} commit önde)`, value: 'push' });
    }
    else {
        choices.push({ name: '⬆️  Push yap', value: 'push' });
    }
    // Pull
    if (status.behind > 0) {
        choices.push({ name: `⬇️  Pull yap (${status.behind} commit geride)`, value: 'pull' });
    }
    else {
        choices.push({ name: '⬇️  Pull yap', value: 'pull' });
    }
    // Görüntüleme (her zaman görünür)
    choices.push(new inquirer_1.default.Separator('─── Görüntüle ───'), { name: '📊  Detaylı durumu görüntüle', value: 'status' }, { name: '🔍  Diff görüntüle', value: 'diff' }, { name: '📋  Geçmişi görüntüle', value: 'history' });
    // Yönetim (profil bazlı)
    choices.push(new inquirer_1.default.Separator('─── Yönetim ───'));
    if ((0, settings_1.isFeatureEnabled)('branch', config)) {
        choices.push({ name: '🔀  Branch yönetimi', value: 'branch' });
    }
    if ((0, settings_1.isFeatureEnabled)('stash', config)) {
        choices.push({ name: '📦  Stash yönetimi', value: 'stash' });
    }
    if ((0, settings_1.isFeatureEnabled)('tag', config)) {
        choices.push({ name: '🏷️  Tag yönetimi', value: 'tag' });
    }
    if ((0, settings_1.isFeatureEnabled)('merge', config)) {
        choices.push({ name: '⚔️  Merge/Rebase', value: 'merge' });
    }
    if ((0, settings_1.isFeatureEnabled)('remote', config)) {
        choices.push({ name: '🔗  Remote yönetimi', value: 'remote' });
    }
    if ((0, settings_1.isFeatureEnabled)('gitignore', config)) {
        choices.push({ name: '📝  .gitignore yönetimi', value: 'gitignore' });
    }
    // Expert/Custom profillerde ek özellikler
    if (config.profile !== 'standard') {
        // Gelişmiş Git (sadece expert/custom)
        if ((0, settings_1.isFeatureEnabled)('advanced', config)) {
            choices.push(new inquirer_1.default.Separator('─── Gelişmiş ───'));
            choices.push({ name: '🍒  Cherry-pick', value: 'cherrypick' });
            choices.push({ name: '🔍  Bisect', value: 'bisect' });
            choices.push({ name: '👤  Blame', value: 'blame' });
            choices.push({ name: '📜  Reflog', value: 'reflog' });
        }
        // Analiz (sadece expert/custom)
        if ((0, settings_1.isFeatureEnabled)('analytics', config)) {
            choices.push(new inquirer_1.default.Separator('─── Analiz ───'));
            choices.push({ name: '📈  Commit istatistikleri', value: 'commit-stats' });
            choices.push({ name: '👥  Contributor özeti', value: 'contributors' });
            choices.push({ name: '⚖️  Branch karşılaştırma', value: 'branch-compare' });
        }
        // Güvenlik (sadece expert/custom)
        if ((0, settings_1.isFeatureEnabled)('security', config)) {
            choices.push(new inquirer_1.default.Separator('─── Güvenlik ───'));
            choices.push({ name: '🔍  Sensitive data tarama', value: 'sensitive-scan' });
            choices.push({ name: '✅  Conventional commit', value: 'conventional' });
        }
    }
    const { action } = await inquirer_1.default.prompt([{
            type: 'list',
            name: 'action',
            message: 'Ne yapmak istersiniz? (Ctrl+C ile çıkış)',
            choices,
            pageSize: 20,
            loop: false
        }]);
    return { action };
}
async function waitForEnter() {
    await inquirer_1.default.prompt([{
            type: 'input',
            name: 'continue',
            message: chalk_1.default.gray('Devam etmek için Enter\'a basın...')
        }]);
}
async function handleCommit(pushAfter) {
    const spinner = (0, ora_1.default)('Değişiklikler analiz ediliyor...').start();
    const stagedFiles = await operations_1.gitOps.getStagedFiles();
    if (stagedFiles.length === 0) {
        spinner.stop();
        (0, display_1.displayError)('Staged dosya yok. Önce dosyaları stage\'leyin.');
        await waitForEnter();
        return;
    }
    const suggestion = await (0, suggest_1.generateCommitSuggestion)();
    spinner.stop();
    (0, display_1.displayCommitSuggestion)(suggestion.fullMessage);
    const commitMessage = await (0, prompts_1.promptCommitMessage)(suggestion.fullMessage);
    const commitSpinner = (0, ora_1.default)('Commit yapılıyor...').start();
    try {
        await operations_1.gitOps.commit(commitMessage);
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
    await waitForEnter();
}
async function handleStage() {
    const status = await operations_1.gitOps.getStatus();
    const unstaged = [...status.modified, ...status.untracked];
    if (unstaged.length === 0) {
        (0, display_1.displaySuccess)('Tüm dosyalar zaten staged!');
        await waitForEnter();
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
    spinner.succeed(`${filesToStage.length} dosya stage'lendi`);
    await waitForEnter();
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
    await waitForEnter();
}
async function showDetailedStatus() {
    const status = await operations_1.gitOps.getStatus();
    const remoteUrl = await operations_1.gitOps.getRemoteUrl();
    console.log(`\n📍 Remote: ${remoteUrl}`);
    (0, display_1.displayStatus)(status);
    await waitForEnter();
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
    await waitForEnter();
}
