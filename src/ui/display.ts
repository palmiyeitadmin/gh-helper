import chalk from 'chalk';
import boxen from 'boxen';
import { GitStatus, CommitInfo } from '../git/operations';

export function displayHeader(projectName: string): void {
    const header = boxen(
        chalk.bold.cyan('🚀 Git Helper') + '\n' + chalk.gray(projectName),
        {
            padding: 1,
            margin: 0,
            borderStyle: 'round',
            borderColor: 'cyan'
        }
    );
    console.log(header);
}

export function displayStatus(status: GitStatus): void {
    console.log('\n' + chalk.bold('📊 Git Durumu'));
    console.log(chalk.gray('─'.repeat(40)));

    // Branch info
    console.log(`  ${chalk.bold('Branch:')} ${chalk.cyan(status.branch)}`);

    if (status.ahead > 0) {
        console.log(`  ${chalk.yellow('↑')} ${status.ahead} commit önde`);
    }
    if (status.behind > 0) {
        console.log(`  ${chalk.red('↓')} ${status.behind} commit geride`);
    }

    console.log();

    // Staged files
    if (status.staged.length > 0) {
        console.log(`  ${chalk.green('✓')} ${chalk.bold(status.staged.length)} dosya staged`);
        status.staged.forEach(f => console.log(`    ${chalk.green('+')} ${f}`));
    } else {
        console.log(`  ${chalk.gray('○')} Staged dosya yok`);
    }

    // Modified files
    if (status.modified.length > 0) {
        console.log(`  ${chalk.yellow('⚠')} ${chalk.bold(status.modified.length)} dosya değiştirildi`);
        status.modified.forEach(f => console.log(`    ${chalk.yellow('~')} ${f}`));
    }

    // Untracked files
    if (status.untracked.length > 0) {
        console.log(`  ${chalk.red('?')} ${chalk.bold(status.untracked.length)} takip edilmeyen dosya`);
        status.untracked.slice(0, 5).forEach(f => console.log(`    ${chalk.red('?')} ${f}`));
        if (status.untracked.length > 5) {
            console.log(`    ${chalk.gray(`... ve ${status.untracked.length - 5} dosya daha`)}`);
        }
    }

    if (status.isClean) {
        console.log(`\n  ${chalk.green('✓')} Çalışma dizini temiz`);
    }
}

export function displayRecentCommits(commits: CommitInfo[]): void {
    console.log('\n' + chalk.bold('📋 Son Commit\'ler'));
    console.log(chalk.gray('─'.repeat(40)));

    if (commits.length === 0) {
        console.log('  Henüz commit yok');
        return;
    }

    commits.forEach((commit, index) => {
        const hashColor = index === 0 ? chalk.yellow : chalk.gray;
        const messagePreview = commit.message.length > 50
            ? commit.message.substring(0, 47) + '...'
            : commit.message;

        console.log(`  ${hashColor(commit.hash)} ${messagePreview}`);
        console.log(`           ${chalk.gray(commit.date + ' • ' + commit.author)}`);
    });
}

export function displayStagedFiles(files: string[]): void {
    console.log('\n' + chalk.bold('📝 Staged Dosyalar'));
    console.log(chalk.gray('─'.repeat(40)));

    if (files.length === 0) {
        console.log(`  ${chalk.gray('Staged dosya yok')}`);
        return;
    }

    files.forEach(f => {
        console.log(`  ${chalk.green('•')} ${f}`);
    });
}

export function displayDiff(diff: string): void {
    console.log('\n' + chalk.bold('🔍 Değişiklikler'));
    console.log(chalk.gray('─'.repeat(40)));

    if (!diff || diff.trim() === '') {
        console.log('  Değişiklik yok');
        return;
    }

    const lines = diff.split('\n');
    lines.forEach(line => {
        if (line.includes('insertion')) {
            console.log(`  ${chalk.green(line)}`);
        } else if (line.includes('deletion')) {
            console.log(`  ${chalk.red(line)}`);
        } else {
            console.log(`  ${line}`);
        }
    });
}

export function displaySuccess(message: string): void {
    console.log(`\n${chalk.green('✓')} ${message}`);
}

export function displayError(message: string): void {
    console.log(`\n${chalk.red('✗')} ${message}`);
}

export function displayWarning(message: string): void {
    console.log(`\n${chalk.yellow('⚠')} ${message}`);
}

export function displayInfo(message: string): void {
    console.log(`\n${chalk.blue('ℹ')} ${message}`);
}

export function displayCommitSuggestion(message: string): void {
    const box = boxen(
        chalk.bold('🤖 Önerilen Commit Mesajı:\n\n') + chalk.cyan(message),
        {
            padding: 1,
            margin: { top: 1, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'green'
        }
    );
    console.log(box);
}
