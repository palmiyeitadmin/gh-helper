"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptMainMenu = promptMainMenu;
exports.promptStageFiles = promptStageFiles;
exports.promptCommitMessage = promptCommitMessage;
exports.promptConfirmPush = promptConfirmPush;
exports.promptConfirmAction = promptConfirmAction;
exports.promptSelectCommitType = promptSelectCommitType;
exports.promptCommitScope = promptCommitScope;
exports.promptCommitDescription = promptCommitDescription;
const inquirer_1 = __importDefault(require("inquirer"));
async function promptMainMenu(status) {
    const choices = [];
    // Temel Git işlemleri - her zaman göster
    choices.push(new inquirer_1.default.Separator('─── Git İşlemleri ───'));
    // Stage
    if (status.modified.length > 0 || status.untracked.length > 0) {
        choices.push({ name: `➕ Dosyaları stage'le (${status.modified.length + status.untracked.length} dosya)`, value: 'stage' });
    }
    else {
        choices.push({ name: '➕ Dosyaları stage\'le', value: 'stage', disabled: 'Değişiklik yok' });
    }
    // Commit
    if (status.staged.length > 0) {
        choices.push({ name: `📝 Commit yap (${status.staged.length} staged dosya)`, value: 'commit' });
        choices.push({ name: '📤 Commit\'le ve push\'la', value: 'commit-push' });
    }
    else {
        choices.push({ name: '📝 Commit yap', value: 'commit', disabled: 'Staged dosya yok' });
    }
    // Push
    if (status.ahead > 0) {
        choices.push({ name: `⬆️ Push yap (${status.ahead} commit önde)`, value: 'push' });
    }
    else {
        choices.push({ name: '⬆️ Push yap', value: 'push' });
    }
    // Pull  
    if (status.behind > 0) {
        choices.push({ name: `⬇️ Pull yap (${status.behind} commit geride)`, value: 'pull' });
    }
    else {
        choices.push({ name: '⬇️ Pull yap', value: 'pull' });
    }
    // Görüntüleme
    choices.push(new inquirer_1.default.Separator('─── Görüntüle ───'), { name: '📊 Detaylı durumu görüntüle', value: 'status' }, { name: '🔍 Diff görüntüle', value: 'diff' }, { name: '📋 Geçmişi görüntüle', value: 'history' });
    // Gelişmiş özellikler
    choices.push(new inquirer_1.default.Separator('─── Gelişmiş Özellikler ───'), { name: '🔀 Branch yönetimi', value: 'branch' }, { name: '📦 Stash yönetimi', value: 'stash' }, { name: '🏷️ Tag yönetimi', value: 'tag' }, { name: '⚔️ Merge/Rebase', value: 'merge' }, { name: '🔗 Remote yönetimi', value: 'remote' });
    choices.push(new inquirer_1.default.Separator(), { name: '❌ Çıkış', value: 'exit' });
    const { action } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Ne yapmak istersiniz?',
            choices,
            pageSize: 15
        }
    ]);
    return { action };
}
async function promptStageFiles(files) {
    if (files.length === 0) {
        return [];
    }
    const { selectedFiles } = await inquirer_1.default.prompt([
        {
            type: 'checkbox',
            name: 'selectedFiles',
            message: 'Stage\'lenecek dosyaları seçin:',
            choices: [
                { name: '📁 Tüm dosyaları stage\'le', value: '__ALL__' },
                new inquirer_1.default.Separator(),
                ...files.map(f => ({ name: f, value: f }))
            ]
        }
    ]);
    if (selectedFiles.includes('__ALL__')) {
        return files;
    }
    return selectedFiles;
}
async function promptCommitMessage(suggestion) {
    const { useOption } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'useOption',
            message: 'Bu commit mesajını kullan?',
            choices: [
                { name: '✓ Evet, önerilen mesajı kullan', value: 'accept' },
                { name: '✏️ Öneriyi düzenle', value: 'edit' },
                { name: '📝 Kendi mesajımı yazayım', value: 'custom' }
            ]
        }
    ]);
    if (useOption === 'accept') {
        return suggestion;
    }
    if (useOption === 'edit') {
        const { editedMessage } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'editedMessage',
                message: 'Commit mesajını düzenle:',
                default: suggestion
            }
        ]);
        return editedMessage;
    }
    // Custom message
    const { customMessage } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'customMessage',
            message: 'Commit mesajı girin:',
            validate: (input) => input.length > 0 || 'Commit mesajı boş olamaz'
        }
    ]);
    return customMessage;
}
async function promptConfirmPush() {
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'GitHub\'a push\'la?',
            default: true
        }
    ]);
    return confirm;
}
async function promptConfirmAction(message) {
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message,
            default: true
        }
    ]);
    return confirm;
}
async function promptSelectCommitType() {
    const types = [
        { name: 'feat: Yeni özellik', value: 'feat' },
        { name: 'fix: Hata düzeltme', value: 'fix' },
        { name: 'docs: Sadece dokümantasyon değişiklikleri', value: 'docs' },
        { name: 'style: Kod stili değişiklikleri', value: 'style' },
        { name: 'refactor: Kod yeniden düzenleme', value: 'refactor' },
        { name: 'test: Test ekleme veya güncelleme', value: 'test' },
        { name: 'chore: Bakım görevleri', value: 'chore' },
        { name: 'perf: Performans iyileştirmeleri', value: 'perf' },
        { name: 'build: Build sistemi değişiklikleri', value: 'build' },
        { name: 'ci: CI/CD yapılandırması', value: 'ci' }
    ];
    const { type } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'type',
            message: 'Commit türünü seçin:',
            choices: types
        }
    ]);
    return type;
}
async function promptCommitScope() {
    const { scope } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'scope',
            message: 'Kapsam girin (opsiyonel, atlamak için Enter):',
        }
    ]);
    return scope || undefined;
}
async function promptCommitDescription() {
    const { description } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'description',
            message: 'Commit açıklaması girin:',
            validate: (input) => input.length > 0 || 'Açıklama boş olamaz'
        }
    ]);
    return description;
}
