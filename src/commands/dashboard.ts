import ora from 'ora';
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
    promptMainMenu,
    promptStageFiles,
    promptCommitMessage,
    promptConfirmPush,
    promptConfirmAction
} from '../ui/prompts';
import { generateCommitSuggestion } from '../ai/suggest';

export async function showDashboard(): Promise<void> {
    try {
        const projectName = gitOps.getProjectName();
        displayHeader(projectName);

        const spinner = ora('Git durumu yükleniyor...').start();

        const status = await gitOps.getStatus();
        const commits = await gitOps.getRecentCommits(5);

        spinner.stop();

        displayStatus(status);
        displayRecentCommits(commits);

        // Interactive menu loop
        let running = true;
        while (running) {
            console.log();
            const { action } = await promptMainMenu(status);

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
                    const newStatus = await gitOps.getStatus();
                    displayStatus(newStatus);
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
    } catch (error) {
        displayError(`Dashboard yüklenemedi: ${error}`);
        process.exit(1);
    }
}

async function handleCommit(pushAfter: boolean): Promise<void> {
    const spinner = ora('Değişiklikler analiz ediliyor...').start();

    const stagedFiles = await gitOps.getStagedFiles();

    if (stagedFiles.length === 0) {
        spinner.stop();
        displayError('Staged dosya yok. Önce dosyaları stage\'leyin.');
        return;
    }

    // Generate AI suggestion
    const suggestion = await generateCommitSuggestion();
    spinner.stop();

    displayCommitSuggestion(suggestion.fullMessage);

    // Get commit message
    const commitMessage = await promptCommitMessage(suggestion.fullMessage);

    // Commit
    const commitSpinner = ora('Commit yapılıyor...').start();
    try {
        const hash = await gitOps.commit(commitMessage);
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
}

async function handleStage(): Promise<void> {
    const status = await gitOps.getStatus();
    const unstaged = [...status.modified, ...status.untracked];

    if (unstaged.length === 0) {
        displaySuccess('Tüm dosyalar zaten staged!');
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

    spinner.succeed(`${filesToStage.length} dosya stage\'lendi`);
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
}

async function showDetailedStatus(): Promise<void> {
    const status = await gitOps.getStatus();
    const remoteUrl = await gitOps.getRemoteUrl();

    console.log(`\n📍 Remote: ${remoteUrl}`);
    displayStatus(status);
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
}
