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
import { generateCommitSuggestion } from '../ai/suggest';

// Sub-menu functions - imported inline to avoid circular dependencies
import { manageBranchesMenu } from './branch';
import { manageStashMenu } from './stash';
import { manageTagsMenu } from './tag';
import { manageMergeRebaseMenu } from './merge';
import { initRepositoryMenu } from './init';
import { manageGitignoreMenu } from './gitignore';

export async function showDashboard(): Promise<void> {
    let running = true;

    while (running) {
        try {
            console.clear();
            const projectName = gitOps.getProjectName();
            displayHeader(projectName);

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
    const choices = [];

    // Git İşlemleri
    choices.push(new inquirer.Separator('─── Git İşlemleri ───'));

    // Stage
    if (status.modified.length > 0 || status.untracked.length > 0) {
        choices.push({ name: `➕ Dosyaları stage'le (${status.modified.length + status.untracked.length} dosya)`, value: 'stage' });
    }

    // Commit
    if (status.staged.length > 0) {
        choices.push({ name: `📝 Commit yap (${status.staged.length} staged dosya)`, value: 'commit' });
        choices.push({ name: '📤 Commit\'le ve push\'la', value: 'commit-push' });
    }

    // Push
    if (status.ahead > 0) {
        choices.push({ name: `⬆️ Push yap (${status.ahead} commit önde)`, value: 'push' });
    } else {
        choices.push({ name: '⬆️ Push yap', value: 'push' });
    }

    // Pull
    if (status.behind > 0) {
        choices.push({ name: `⬇️ Pull yap (${status.behind} commit geride)`, value: 'pull' });
    } else {
        choices.push({ name: '⬇️ Pull yap', value: 'pull' });
    }

    // Görüntüleme
    choices.push(
        new inquirer.Separator('─── Görüntüle ───'),
        { name: '📊 Detaylı durumu görüntüle', value: 'status' },
        { name: '🔍 Diff görüntüle', value: 'diff' },
        { name: '📋 Geçmişi görüntüle', value: 'history' }
    );

    // Gelişmiş özellikler
    choices.push(
        new inquirer.Separator('─── Gelişmiş Özellikler ───'),
        { name: '🔀 Branch yönetimi', value: 'branch' },
        { name: '📦 Stash yönetimi', value: 'stash' },
        { name: '🏷️ Tag yönetimi', value: 'tag' },
        { name: '⚔️ Merge/Rebase', value: 'merge' },
        { name: '🔗 Remote yönetimi', value: 'remote' },
        { name: '📝 .gitignore yönetimi', value: 'gitignore' }
    );

    choices.push(
        new inquirer.Separator(),
        { name: '❌ Çıkış', value: 'exit' }
    );

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Ne yapmak istersiniz?',
        choices,
        pageSize: 20
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
    const spinner = ora('Değişiklikler analiz ediliyor...').start();

    const stagedFiles = await gitOps.getStagedFiles();

    if (stagedFiles.length === 0) {
        spinner.stop();
        displayError('Staged dosya yok. Önce dosyaları stage\'leyin.');
        await waitForEnter();
        return;
    }

    const suggestion = await generateCommitSuggestion();
    spinner.stop();

    displayCommitSuggestion(suggestion.fullMessage);

    const commitMessage = await promptCommitMessage(suggestion.fullMessage);

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
