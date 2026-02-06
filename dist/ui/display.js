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
const themes_1 = require("../config/themes");
function displayHeader(projectName) {
    const colors = (0, themes_1.getThemeColors)();
    const header = (0, boxen_1.default)(chalk_1.default.bold.hex(colors.primary)('🚀 Git Helper') + '\n' + chalk_1.default.hex(colors.muted)(projectName), {
        padding: 1,
        margin: 0,
        borderStyle: 'round',
        borderColor: 'cyan'
    });
    console.log(header);
}
function displayStatus(status) {
    console.log('\n' + chalk_1.default.bold('📊 Git Durumu'));
    console.log((0, themes_1.colorize)('─'.repeat(40), 'muted'));
    // Branch info
    console.log(`  ${chalk_1.default.bold('Branch:')} ${(0, themes_1.colorize)(status.branch, 'primary')}`);
    if (status.ahead > 0) {
        console.log(`  ${(0, themes_1.colorize)('↑', 'warning')} ${status.ahead} commit önde`);
    }
    if (status.behind > 0) {
        console.log(`  ${(0, themes_1.colorize)('↓', 'error')} ${status.behind} commit geride`);
    }
    console.log();
    // Staged files
    if (status.staged.length > 0) {
        console.log(`  ${(0, themes_1.colorize)('✓', 'success')} ${chalk_1.default.bold(status.staged.length)} dosya staged`);
        status.staged.forEach(f => console.log(`    ${(0, themes_1.colorize)('+', 'success')} ${f}`));
    }
    else {
        console.log(`  ${(0, themes_1.colorize)('○', 'muted')} Staged dosya yok`);
    }
    // Modified files
    if (status.modified.length > 0) {
        console.log(`  ${(0, themes_1.colorize)('⚠', 'warning')} ${chalk_1.default.bold(status.modified.length)} dosya değiştirildi`);
        status.modified.forEach(f => console.log(`    ${(0, themes_1.colorize)('~', 'warning')} ${f}`));
    }
    // Untracked files
    if (status.untracked.length > 0) {
        console.log(`  ${(0, themes_1.colorize)('?', 'error')} ${chalk_1.default.bold(status.untracked.length)} takip edilmeyen dosya`);
        status.untracked.slice(0, 5).forEach(f => console.log(`    ${(0, themes_1.colorize)('?', 'error')} ${f}`));
        if (status.untracked.length > 5) {
            console.log(`    ${(0, themes_1.colorize)(`... ve ${status.untracked.length - 5} dosya daha`, 'muted')}`);
        }
    }
    if (status.isClean) {
        console.log(`\n  ${(0, themes_1.colorize)('✓', 'success')} Çalışma dizini temiz`);
    }
}
function displayRecentCommits(commits) {
    console.log('\n' + chalk_1.default.bold('📋 Son Commit\'ler'));
    console.log((0, themes_1.colorize)('─'.repeat(40), 'muted'));
    if (commits.length === 0) {
        console.log('  Henüz commit yok');
        return;
    }
    commits.forEach((commit, index) => {
        const hashText = index === 0 ? (0, themes_1.colorize)(commit.hash, 'warning') : (0, themes_1.colorize)(commit.hash, 'muted');
        const messagePreview = commit.message.length > 50
            ? commit.message.substring(0, 47) + '...'
            : commit.message;
        console.log(`  ${hashText} ${messagePreview}`);
        console.log(`           ${(0, themes_1.colorize)(commit.date + ' • ' + commit.author, 'muted')}`);
    });
}
function displayStagedFiles(files) {
    console.log('\n' + chalk_1.default.bold('📝 Staged Dosyalar'));
    console.log((0, themes_1.colorize)('─'.repeat(40), 'muted'));
    if (files.length === 0) {
        console.log(`  ${(0, themes_1.colorize)('Staged dosya yok', 'muted')}`);
        return;
    }
    files.forEach(f => {
        console.log(`  ${(0, themes_1.colorize)('•', 'success')} ${f}`);
    });
}
function displayDiff(diff) {
    console.log('\n' + chalk_1.default.bold('🔍 Değişiklikler'));
    console.log((0, themes_1.colorize)('─'.repeat(40), 'muted'));
    if (!diff || diff.trim() === '') {
        console.log('  Değişiklik yok');
        return;
    }
    const lines = diff.split('\n');
    lines.forEach(line => {
        if (line.includes('insertion')) {
            console.log(`  ${(0, themes_1.colorize)(line, 'success')}`);
        }
        else if (line.includes('deletion')) {
            console.log(`  ${(0, themes_1.colorize)(line, 'error')}`);
        }
        else {
            console.log(`  ${line}`);
        }
    });
}
function displaySuccess(message) {
    console.log(`\n${(0, themes_1.colorize)('✓', 'success')} ${message}`);
}
function displayError(message) {
    console.log(`\n${(0, themes_1.colorize)('✗', 'error')} ${message}`);
}
function displayWarning(message) {
    console.log(`\n${(0, themes_1.colorize)('⚠', 'warning')} ${message}`);
}
function displayInfo(message) {
    console.log(`\n${(0, themes_1.colorize)('ℹ', 'info')} ${message}`);
}
function displayCommitSuggestion(message) {
    const box = (0, boxen_1.default)(chalk_1.default.bold('🤖 Önerilen Commit Mesajı:\n\n') + (0, themes_1.colorize)(message, 'primary'), {
        padding: 1,
        margin: { top: 1, bottom: 0, left: 0, right: 0 },
        borderStyle: 'round',
        borderColor: 'green'
    });
    console.log(box);
}
