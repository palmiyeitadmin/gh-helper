"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayHeader = displayHeader;
exports.displayStatus = displayStatus;
exports.displayRecentCommits = displayRecentCommits;
exports.displayStagedFiles = displayStagedFiles;
exports.displayDiff = displayDiff;
exports.displaySuccess = displaySuccess;
exports.displayError = displayError;
exports.displayWarning = displayWarning;
exports.displayInfo = displayInfo;
exports.displayCommitSuggestion = displayCommitSuggestion;
const chalk_1 = __importDefault(require("chalk"));
const boxen_1 = __importDefault(require("boxen"));
function displayHeader(projectName) {
    const header = (0, boxen_1.default)(chalk_1.default.bold.cyan('🚀 Git Helper') + '\n' + chalk_1.default.gray(projectName), {
        padding: 1,
        margin: 0,
        borderStyle: 'round',
        borderColor: 'cyan'
    });
    console.log(header);
}
function displayStatus(status) {
    console.log('\n' + chalk_1.default.bold('📊 Git Durumu'));
    console.log(chalk_1.default.gray('─'.repeat(40)));
    // Branch info
    console.log(`  ${chalk_1.default.bold('Branch:')} ${chalk_1.default.cyan(status.branch)}`);
    if (status.ahead > 0) {
        console.log(`  ${chalk_1.default.yellow('↑')} ${status.ahead} commit önde`);
    }
    if (status.behind > 0) {
        console.log(`  ${chalk_1.default.red('↓')} ${status.behind} commit geride`);
    }
    console.log();
    // Staged files
    if (status.staged.length > 0) {
        console.log(`  ${chalk_1.default.green('✓')} ${chalk_1.default.bold(status.staged.length)} dosya staged`);
        status.staged.forEach(f => console.log(`    ${chalk_1.default.green('+')} ${f}`));
    }
    else {
        console.log(`  ${chalk_1.default.gray('○')} Staged dosya yok`);
    }
    // Modified files
    if (status.modified.length > 0) {
        console.log(`  ${chalk_1.default.yellow('⚠')} ${chalk_1.default.bold(status.modified.length)} dosya değiştirildi`);
        status.modified.forEach(f => console.log(`    ${chalk_1.default.yellow('~')} ${f}`));
    }
    // Untracked files
    if (status.untracked.length > 0) {
        console.log(`  ${chalk_1.default.red('?')} ${chalk_1.default.bold(status.untracked.length)} takip edilmeyen dosya`);
        status.untracked.slice(0, 5).forEach(f => console.log(`    ${chalk_1.default.red('?')} ${f}`));
        if (status.untracked.length > 5) {
            console.log(`    ${chalk_1.default.gray(`... ve ${status.untracked.length - 5} dosya daha`)}`);
        }
    }
    if (status.isClean) {
        console.log(`\n  ${chalk_1.default.green('✓')} Çalışma dizini temiz`);
    }
}
function displayRecentCommits(commits) {
    console.log('\n' + chalk_1.default.bold('📋 Son Commit\'ler'));
    console.log(chalk_1.default.gray('─'.repeat(40)));
    if (commits.length === 0) {
        console.log('  Henüz commit yok');
        return;
    }
    commits.forEach((commit, index) => {
        const hashColor = index === 0 ? chalk_1.default.yellow : chalk_1.default.gray;
        const messagePreview = commit.message.length > 50
            ? commit.message.substring(0, 47) + '...'
            : commit.message;
        console.log(`  ${hashColor(commit.hash)} ${messagePreview}`);
        console.log(`           ${chalk_1.default.gray(commit.date + ' • ' + commit.author)}`);
    });
}
function displayStagedFiles(files) {
    console.log('\n' + chalk_1.default.bold('📝 Staged Dosyalar'));
    console.log(chalk_1.default.gray('─'.repeat(40)));
    if (files.length === 0) {
        console.log(`  ${chalk_1.default.gray('Staged dosya yok')}`);
        return;
    }
    files.forEach(f => {
        console.log(`  ${chalk_1.default.green('•')} ${f}`);
    });
}
function displayDiff(diff) {
    console.log('\n' + chalk_1.default.bold('🔍 Değişiklikler'));
    console.log(chalk_1.default.gray('─'.repeat(40)));
    if (!diff || diff.trim() === '') {
        console.log('  Değişiklik yok');
        return;
    }
    const lines = diff.split('\n');
    lines.forEach(line => {
        if (line.includes('insertion')) {
            console.log(`  ${chalk_1.default.green(line)}`);
        }
        else if (line.includes('deletion')) {
            console.log(`  ${chalk_1.default.red(line)}`);
        }
        else {
            console.log(`  ${line}`);
        }
    });
}
function displaySuccess(message) {
    console.log(`\n${chalk_1.default.green('✓')} ${message}`);
}
function displayError(message) {
    console.log(`\n${chalk_1.default.red('✗')} ${message}`);
}
function displayWarning(message) {
    console.log(`\n${chalk_1.default.yellow('⚠')} ${message}`);
}
function displayInfo(message) {
    console.log(`\n${chalk_1.default.blue('ℹ')} ${message}`);
}
function displayCommitSuggestion(message) {
    const box = (0, boxen_1.default)(chalk_1.default.bold('🤖 Önerilen Commit Mesajı:\n\n') + chalk_1.default.cyan(message), {
        padding: 1,
        margin: { top: 1, bottom: 0, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor: 'green'
    });
    console.log(box);
}
