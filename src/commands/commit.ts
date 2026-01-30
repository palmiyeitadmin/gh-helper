import ora from 'ora';
import { gitOps } from '../git/operations';
import {
    displayHeader,
    displayStagedFiles,
    displayCommitSuggestion,
    displaySuccess,
    displayError,
    displayWarning
} from '../ui/display';
import {
    promptCommitMessage,
    promptStageFiles,
    promptConfirmPush,
    promptSelectCommitType,
    promptCommitScope,
    promptCommitDescription
} from '../ui/prompts';
import { generateCommitSuggestion, formatConventionalCommit } from '../ai/suggest';

export async function interactiveCommit(): Promise<void> {
    const projectName = gitOps.getProjectName();
    displayHeader(projectName);

    const spinner = ora('Staged dosyalar kontrol ediliyor...').start();

    try {
        let stagedFiles = await gitOps.getStagedFiles();
        const status = await gitOps.getStatus();

        spinner.stop();

        // If no staged files, offer to stage
        if (stagedFiles.length === 0) {
            const unstaged = [...status.modified, ...status.untracked];

            if (unstaged.length === 0) {
                displayWarning('Commit edilecek değişiklik yok.');
                return;
            }

            displayWarning('Staged dosya yok.');
            console.log('');

            const filesToStage = await promptStageFiles(unstaged);

            if (filesToStage.length === 0) {
                displayWarning('Dosya seçilmedi. İptal ediliyor.');
                return;
            }

            const stageSpinner = ora('Dosyalar stage\'leniyor...').start();
            await gitOps.stageFiles(filesToStage);
            stageSpinner.succeed(`${filesToStage.length} dosya stage\'lendi`);

            stagedFiles = filesToStage;
        }

        displayStagedFiles(stagedFiles);

        // Generate AI suggestion
        const suggestionSpinner = ora('Commit mesajı oluşturuluyor...').start();
        const suggestion = await generateCommitSuggestion();
        suggestionSpinner.stop();

        displayCommitSuggestion(suggestion.fullMessage);

        // Get commit message from user
        const commitMessage = await promptCommitMessage(suggestion.fullMessage);

        // Commit
        const commitSpinner = ora('Commit yapılıyor...').start();
        const hash = await gitOps.commit(commitMessage);
        commitSpinner.succeed(`Commit yapıldı: ${commitMessage}`);

        // Offer to push
        const shouldPush = await promptConfirmPush();

        if (shouldPush) {
            const pushSpinner = ora('GitHub\'a gönderiliyor...').start();
            await gitOps.push();
            pushSpinner.succeed('GitHub\'a başarıyla gönderildi!');
        }

    } catch (error) {
        displayError(`Commit başarısız: ${error}`);
        process.exit(1);
    }
}

export async function manualCommit(): Promise<void> {
    const projectName = gitOps.getProjectName();
    displayHeader(projectName);

    const stagedFiles = await gitOps.getStagedFiles();

    if (stagedFiles.length === 0) {
        displayWarning('Staged dosya yok. Önce dosyaları stage\'leyin.');
        return;
    }

    displayStagedFiles(stagedFiles);

    // Manual conventional commit builder
    console.log('\n📝 Commit mesajınızı oluşturun:\n');

    const type = await promptSelectCommitType();
    const scope = await promptCommitScope();
    const description = await promptCommitDescription();

    const commitMessage = formatConventionalCommit(type, scope, description);

    console.log(`\n📋 Commit mesajı: ${commitMessage}\n`);

    const commitSpinner = ora('Commit yapılıyor...').start();

    try {
        await gitOps.commit(commitMessage);
        commitSpinner.succeed(`Commit yapıldı: ${commitMessage}`);
    } catch (error) {
        commitSpinner.fail(`Commit başarısız: ${error}`);
    }
}
