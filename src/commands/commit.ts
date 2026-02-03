import ora from 'ora';
import chalk from 'chalk';
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
import { generateCommitSuggestion, generateAICommitSuggestion, formatConventionalCommit } from '../ai/suggest';
import { getConfig } from '../config/settings';

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

        // Generate commit suggestion (AI or local)
        const config = getConfig();
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
            const suggestionSpinner = ora('Commit mesajı oluşturuluyor...').start();
            const suggestion = await generateCommitSuggestion();
            suggestionSpinner.stop();
            suggestionMessage = suggestion.fullMessage;
        }

        // Öneri kutusunu göster
        if (isAISuggestion) {
            console.log(chalk.cyan('\n  🤖 AI Önerilen Commit Mesajı:\n'));
        }
        displayCommitSuggestion(suggestionMessage);

        // Get commit message from user
        const commitMessage = await promptCommitMessage(suggestionMessage);

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
