import chalk from 'chalk';
import boxen from 'boxen';
import { GitStatus, CommitInfo } from '../git/operations';
import { colorize, getThemeColors } from '../config/themes';

export function displayHeader(projectName: string): void {
    const colors = getThemeColors();
    const header = boxen(
        chalk.bold.hex(colors.primary)('🚀 Git Helper') + '\n' + chalk.hex(colors.muted)(projectName),
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
    console.log(colorize('─'.repeat(40), 'muted'));

    // Branch info
    console.log(`  ${chalk.bold('Branch:')} ${colorize(status.branch, 'primary')}`);

    if (status.ahead > 0) {
        console.log(`  ${colorize('↑', 'warning')} ${status.ahead} commit önde`);
    }
    if (status.behind > 0) {
        console.log(`  ${colorize('↓', 'error')} ${status.behind} commit geride`);
    }

    console.log();

    // Staged files
    if (status.staged.length > 0) {
        console.log(`  ${colorize('✓', 'success')} ${chalk.bold(status.staged.length)} dosya staged`);
        status.staged.forEach(f => console.log(`    ${colorize('+', 'success')} ${f}`));
    } else {
        console.log(`  ${colorize('○', 'muted')} Staged dosya yok`);
    }

    // Modified files
    if (status.modified.length > 0) {
        console.log(`  ${colorize('⚠', 'warning')} ${chalk.bold(status.modified.length)} dosya değiştirildi`);
        status.modified.forEach(f => console.log(`    ${colorize('~', 'warning')} ${f}`));
    }

    // Untracked files
    if (status.untracked.length > 0) {
        console.log(`  ${colorize('?', 'error')} ${chalk.bold(status.untracked.length)} takip edilmeyen dosya`);
        status.untracked.slice(0, 5).forEach(f => console.log(`    ${colorize('?', 'error')} ${f}`));
        if (status.untracked.length > 5) {
            console.log(`    ${colorize(`... ve ${status.untracked.length - 5} dosya daha`, 'muted')}`);
        }
    }

    if (status.isClean) {
        console.log(`\n  ${colorize('✓', 'success')} Çalışma dizini temiz`);
    }
}

export function displayRecentCommits(commits: CommitInfo[]): void {
    console.log('\n' + chalk.bold('📋 Son Commit\'ler'));
    console.log(colorize('─'.repeat(40), 'muted'));

    if (commits.length === 0) {
        console.log('  Henüz commit yok');
        return;
    }

    commits.forEach((commit, index) => {
        const hashText = index === 0 ? colorize(commit.hash, 'warning') : colorize(commit.hash, 'muted');
        const messagePreview = commit.message.length > 50
            ? commit.message.substring(0, 47) + '...'
            : commit.message;

        console.log(`  ${hashText} ${messagePreview}`);
        console.log(`           ${colorize(commit.date + ' • ' + commit.author, 'muted')}`);
    });
}

export function displayStagedFiles(files: string[]): void {
    console.log('\n' + chalk.bold('📝 Staged Dosyalar'));
    console.log(colorize('─'.repeat(40), 'muted'));

    if (files.length === 0) {
        console.log(`  ${colorize('Staged dosya yok', 'muted')}`);
        return;
    }

    files.forEach(f => {
        console.log(`  ${colorize('•', 'success')} ${f}`);
    });
}

export function displayDiff(diff: string): void {
    console.log('\n' + chalk.bold('🔍 Değişiklikler'));
    console.log(colorize('─'.repeat(40), 'muted'));

    if (!diff || diff.trim() === '') {
        console.log('  Değişiklik yok');
        return;
    }

    const lines = diff.split('\n');
    lines.forEach(line => {
        if (line.includes('insertion')) {
            console.log(`  ${colorize(line, 'success')}`);
        } else if (line.includes('deletion')) {
            console.log(`  ${colorize(line, 'error')}`);
        } else {
            console.log(`  ${line}`);
        }
    });
}

export function displaySuccess(message: string): void {
    console.log(`\n${colorize('✓', 'success')} ${message}`);
}

export function displayError(message: string): void {
    console.log(`\n${colorize('✗', 'error')} ${message}`);
}

export function displayWarning(message: string): void {
    console.log(`\n${colorize('⚠', 'warning')} ${message}`);
}

export function displayInfo(message: string): void {
    console.log(`\n${colorize('ℹ', 'info')} ${message}`);
}

export function displayCommitSuggestion(message: string): void {
    const box = boxen(
        chalk.bold('🤖 Önerilen Commit Mesajı:\n\n') + colorize(message, 'primary'),
        {
            padding: 1,
            margin: { top: 1, bottom: 0, left: 0, right: 0 },
            borderStyle: 'round',
            borderColor: 'green'
        }
    );
    console.log(box);
}
