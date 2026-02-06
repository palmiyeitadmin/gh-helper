import ora from 'ora';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { gitOps } from '../git/operations';
import {
    displayHeader,
    displayStatus,
    displayRecentCommits,
    displaySuccess,
    displayError,
    displayCommitSuggestion
} from '../ui/display';
import {
    promptStageFiles,
    promptCommitMessage,
    promptConfirmPush
} from '../ui/prompts';
import { generateCommitSuggestion, generateAICommitSuggestion } from '../ai/suggest';
import { getConfig, isFeatureEnabled, refreshConfig } from '../config/settings';
import { setTheme } from '../config/themes';

// Sub-menu functions - imported inline to avoid circular dependencies
import { manageBranchesMenu } from './branch';
import { manageStashMenu } from './stash';
import { manageTagsMenu } from './tag';
import { manageMergeRebaseMenu } from './merge';
import { initRepositoryMenu } from './init';
import { manageGitignoreMenu } from './gitignore';
import { manageSettingsMenu } from './settings';
import { manageSecurityMenu } from './security';
import { manageAnalyticsMenu } from './analytics';
import { manageAdvancedMenu } from './advanced';

export async function showDashboard(): Promise<void> {
    // Başlangıçta kaydedilmiş temayı uygula
    const initialConfig = getConfig();
    setTheme(initialConfig.theme);

    let running = true;

    while (running) {
        try {
            console.clear();
            const projectName = gitOps.getProjectName();
            displayHeader(projectName);

            // Check if current directory is a git repository
            const isGitRepo = await gitOps.isGitRepository();

            if (!isGitRepo) {
                // Not a git repository - show init/clone menu
                console.log(chalk.yellow('\n⚠️ Bu klasör bir Git repository değil.\n'));

                const { action } = await inquirer.prompt([{
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
                        await initRepositoryMenu();
                        break;
                    case 'clone':
                        const { cloneRepository } = await import('./init');
                        await cloneRepository();
                        running = false;
                        break;
                    case 'gitignore':
                        await manageGitignoreMenu();
                        break;
                    case 'exit':
                        running = false;
                        console.log('\n👋 Görüşmek üzere!\n');
                        break;
                }
                continue;
            }

            const spinner = ora('Git durumu yükleniyor...').start();

            const status = await gitOps.getStatus();
            const commits = await gitOps.getRecentCommits(5);

            spinner.stop();

            displayStatus(status);
            displayRecentCommits(commits);

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
                    const allCommits = await gitOps.getRecentCommits(10);
                    displayRecentCommits(allCommits);
                    await waitForEnter();
                    break;

                case 'pull':
                    await handlePull();
                    break;

                case 'push':
                    await handlePush();
                    break;

                case 'branch':
                    await manageBranchesMenu();
                    break;

                case 'stash':
                    await manageStashMenu();
                    break;

                case 'tag':
                    await manageTagsMenu();
                    break;

                case 'merge':
                    await manageMergeRebaseMenu();
                    break;

                case 'remote':
                    await initRepositoryMenu();
                    break;

                case 'gitignore':
                    await manageGitignoreMenu();
                    break;

                case 'settings':
                    await manageSettingsMenu();
                    refreshConfig(); // Ayarlar değiştiğinde yenile
                    break;

                case 'sensitive-scan':
                case 'conventional':
                case 'security':
                    await manageSecurityMenu();
                    break;

                case 'commit-stats':
                case 'contributors':
                case 'branch-compare':
                case 'analytics':
                    await manageAnalyticsMenu();
                    break;

                case 'cherrypick':
                case 'bisect':
                case 'blame':
                case 'reflog':
                case 'advanced':
                    await manageAdvancedMenu();
                    break;

                case 'exit':
                    running = false;
                    console.log('\n👋 Görüşmek üzere!\n');
                    break;
            }
        } catch (error) {
            displayError(`Hata: ${error}`);
            await waitForEnter();
        }
    }
}

async function promptMainDashboardMenu(status: any): Promise<{ action: string }> {
    const config = getConfig();
    const choices = [];

    // Profil bilgisi göster
    const profileLabel = config.profile === 'standard' ? '👤' : config.profile === 'expert' ? '👨‍💻' : '⚙️';

    // Çıkış ve Ayarlar EN ÜSTTE (kolay erişim için)
    choices.push(
        { name: '❌  Çıkış', value: 'exit' },
        { name: `⚙️  Ayarlar ${profileLabel}`, value: 'settings' },
        new inquirer.Separator('─── Git İşlemleri ───')
    );

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
    } else {
        choices.push({ name: '⬆️  Push yap', value: 'push' });
    }

    // Pull
    if (status.behind > 0) {
        choices.push({ name: `⬇️  Pull yap (${status.behind} commit geride)`, value: 'pull' });
    } else {
        choices.push({ name: '⬇️  Pull yap', value: 'pull' });
    }

    // Görüntüleme (her zaman görünür)
    choices.push(
        new inquirer.Separator('─── Görüntüle ───'),
        { name: '📊  Detaylı durumu görüntüle', value: 'status' },
        { name: '🔍  Diff görüntüle', value: 'diff' },
        { name: '📋  Geçmişi görüntüle', value: 'history' }
    );

    // Yönetim (profil bazlı)
    choices.push(new inquirer.Separator('─── Yönetim ───'));

    if (isFeatureEnabled('branch', config)) {
        choices.push({ name: '🔀  Branch yönetimi', value: 'branch' });
    }
    if (isFeatureEnabled('stash', config)) {
        choices.push({ name: '📦  Stash yönetimi', value: 'stash' });
    }
    if (isFeatureEnabled('tag', config)) {
        choices.push({ name: '🏷️  Tag yönetimi', value: 'tag' });
    }
    if (isFeatureEnabled('merge', config)) {
        choices.push({ name: '⚔️  Merge/Rebase', value: 'merge' });
    }
    if (isFeatureEnabled('remote', config)) {
        choices.push({ name: '🔗  Remote yönetimi', value: 'remote' });
    }
    if (isFeatureEnabled('gitignore', config)) {
        choices.push({ name: '📝  .gitignore yönetimi', value: 'gitignore' });
    }

    // Expert/Custom profillerde ek özellikler
    if (config.profile !== 'standard') {
        // Gelişmiş Git (sadece expert/custom)
        if (isFeatureEnabled('advanced', config)) {
            choices.push(new inquirer.Separator('─── Gelişmiş ───'));
            choices.push({ name: '🍒  Cherry-pick', value: 'cherrypick' });
            choices.push({ name: '🔍  Bisect', value: 'bisect' });
            choices.push({ name: '👤  Blame', value: 'blame' });
            choices.push({ name: '📜  Reflog', value: 'reflog' });
        }

        // Analiz (sadece expert/custom)
        if (isFeatureEnabled('analytics', config)) {
            choices.push(new inquirer.Separator('─── Analiz ───'));
            choices.push({ name: '📈  Commit istatistikleri', value: 'commit-stats' });
            choices.push({ name: '👥  Contributor özeti', value: 'contributors' });
            choices.push({ name: '⚖️  Branch karşılaştırma', value: 'branch-compare' });
        }

        // Güvenlik (sadece expert/custom)
        if (isFeatureEnabled('security', config)) {
            choices.push(new inquirer.Separator('─── Güvenlik ───'));
            choices.push({ name: '🔍  Sensitive data tarama', value: 'sensitive-scan' });
            choices.push({ name: '✅  Conventional commit', value: 'conventional' });
        }
    }

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Ne yapmak istersiniz? (Ctrl+C ile çıkış)',
        choices,
        pageSize: 20,
        loop: false
    }]);

    return { action };
}

async function waitForEnter(): Promise<void> {
    await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: chalk.gray('Devam etmek için Enter\'a basın...')
    }]);
}

async function handleCommit(pushAfter: boolean): Promise<void> {
    // Config'i yenile (cached olmaması için)
    refreshConfig();
    const config = getConfig();

    const stagedFiles = await gitOps.getStagedFiles();

    if (stagedFiles.length === 0) {
        displayError('Staged dosya yok. Önce dosyaları stage\'leyin.');
        await waitForEnter();
        return;
    }

    // Generate commit suggestion (AI or local)
    let suggestionMessage: string;
    let isAISuggestion = false;

    if (config.aiEnabled && config.aiProvider !== 'none') {
        // AI önerisi dene
        const aiSpinner = ora('🤖 AI commit önerisi oluşturuluyor...').start();
        try {
            const aiResult = await generateAICommitSuggestion();
            if (aiResult.suggestion) {
                suggestionMessage = aiResult.suggestion;
                isAISuggestion = true;
                aiSpinner.succeed('🤖 AI önerisi hazır');
            } else {
                aiSpinner.warn(aiResult.error || 'AI önerisi alınamadı, lokal analiz kullanılıyor');
                const localSuggestion = await generateCommitSuggestion();
                suggestionMessage = localSuggestion.fullMessage;
            }
        } catch (error: any) {
            aiSpinner.warn(`AI hatası: ${error.message}, lokal analiz kullanılıyor`);
            const localSuggestion = await generateCommitSuggestion();
            suggestionMessage = localSuggestion.fullMessage;
        }
    } else {
        // Lokal analiz
        const spinner = ora('Değişiklikler analiz ediliyor...').start();
        const suggestion = await generateCommitSuggestion();
        spinner.stop();
        suggestionMessage = suggestion.fullMessage;
    }

    // Öneri kutusunu göster
    if (isAISuggestion) {
        console.log(chalk.cyan('\n  🤖 AI Önerilen Commit Mesajı:\n'));
    }
    displayCommitSuggestion(suggestionMessage);

    const commitMessage = await promptCommitMessage(suggestionMessage);

    const commitSpinner = ora('Commit yapılıyor...').start();
    try {
        await gitOps.commit(commitMessage);
        commitSpinner.succeed(`Commit yapıldı: ${commitMessage}`);

        if (pushAfter) {
            await handlePush();
        } else {
            const shouldPush = await promptConfirmPush();
            if (shouldPush) {
                await handlePush();
            }
        }
    } catch (error) {
        commitSpinner.fail(`Commit başarısız: ${error}`);
    }
    await waitForEnter();
}

async function handleStage(): Promise<void> {
    const status = await gitOps.getStatus();
    const unstaged = [...status.modified, ...status.untracked];

    if (unstaged.length === 0) {
        displaySuccess('Tüm dosyalar zaten staged!');
        await waitForEnter();
        return;
    }

    const filesToStage = await promptStageFiles(unstaged);

    if (filesToStage.length === 0) {
        return;
    }

    const spinner = ora('Dosyalar stage\'leniyor...').start();

    if (filesToStage.length === unstaged.length) {
        await gitOps.stageAll();
    } else {
        await gitOps.stageFiles(filesToStage);
    }

    spinner.succeed(`${filesToStage.length} dosya stage'lendi`);
    await waitForEnter();
}

async function handlePush(): Promise<void> {
    const spinner = ora('GitHub\'a gönderiliyor...').start();

    try {
        await gitOps.push();
        spinner.succeed('GitHub\'a başarıyla gönderildi!');
    } catch (error) {
        spinner.fail(`Push başarısız: ${error}`);
    }
}

async function handlePull(): Promise<void> {
    const spinner = ora('GitHub\'dan çekiliyor...').start();

    try {
        await gitOps.pull();
        spinner.succeed('GitHub\'dan başarıyla çekildi!');
    } catch (error) {
        spinner.fail(`Pull başarısız: ${error}`);
    }
    await waitForEnter();
}

async function showDetailedStatus(): Promise<void> {
    const status = await gitOps.getStatus();
    const remoteUrl = await gitOps.getRemoteUrl();

    console.log(`\n📍 Remote: ${remoteUrl}`);
    displayStatus(status);
    await waitForEnter();
}

async function showDiff(): Promise<void> {
    const spinner = ora('Diff yükleniyor...').start();

    const stagedDiff = await gitOps.getStagedDiff();
    const unstagedDiff = await gitOps.getFullDiff();

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
