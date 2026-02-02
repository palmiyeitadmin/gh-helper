"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageStashMenu = manageStashMenu;
exports.manageStash = manageStash;
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const operations_1 = require("../git/operations");
const display_1 = require("../ui/display");
// Dashboard'dan çağrılan loop'lu menü
async function manageStashMenu() {
    let running = true;
    while (running) {
        const shouldContinue = await showStashMenuWithReturn();
        if (!shouldContinue) {
            running = false;
        }
    }
}
// Standalone CLI komutu için
async function manageStash() {
    const projectName = operations_1.gitOps.getProjectName();
    (0, display_1.displayHeader)(projectName);
    try {
        await showStashMenuWithReturn();
    }
    catch (error) {
        (0, display_1.displayError)(`Stash işlemi başarısız: ${error}`);
    }
}
async function showStashMenuWithReturn() {
    const stashList = await operations_1.gitOps.getStashList();
    const status = await operations_1.gitOps.getStatus();
    const hasChanges = !status.isClean;
    console.log(`\n📦 Stash Listesi (${stashList.length} kayıt)`);
    console.log(chalk_1.default.gray('─'.repeat(40)));
    if (stashList.length === 0) {
        console.log(chalk_1.default.gray('  Stash\'te kayıt yok'));
    }
    else {
        stashList.forEach(s => {
            console.log(`  ${chalk_1.default.yellow(`stash@{${s.index}}`)} - ${s.message} ${chalk_1.default.gray(s.date)}`);
        });
    }
    const choices = [];
    if (hasChanges) {
        choices.push({ name: '💾 Değişiklikleri stash\'le', value: 'save' });
    }
    if (stashList.length > 0) {
        choices.push({ name: '📤 Stash\'i uygula ve sil (pop)', value: 'pop' }, { name: '📋 Stash\'i uygula (apply)', value: 'apply' }, { name: '👁️ Stash içeriğini görüntüle', value: 'show' }, { name: '🗑️ Stash\'i sil (drop)', value: 'drop' }, { name: '🧹 Tüm stash\'leri temizle', value: 'clear' });
    }
    choices.push({ name: '⬅️ Ana menüye dön', value: 'back' });
    const { action } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Ne yapmak istersiniz?',
            choices,
            loop: false
        }
    ]);
    if (action === 'back') {
        return false;
    }
    switch (action) {
        case 'save':
            await stashSave();
            break;
        case 'pop':
            await stashPop(stashList);
            break;
        case 'apply':
            await stashApply(stashList);
            break;
        case 'show':
            await stashShow(stashList);
            break;
        case 'drop':
            await stashDrop(stashList);
            break;
        case 'clear':
            await stashClear();
            break;
    }
    return true;
}
async function stashSave() {
    const { message } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'message',
            message: 'Stash mesajı (opsiyonel):',
        }
    ]);
    const spinner = (0, ora_1.default)('Değişiklikler stash\'leniyor...').start();
    try {
        await operations_1.gitOps.stashSave(message || undefined);
        spinner.succeed('Değişiklikler stash\'lendi');
    }
    catch (error) {
        spinner.fail(`Stash başarısız: ${error}`);
    }
}
async function stashPop(stashList) {
    const { index } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'index',
            message: 'Hangi stash\'i uygulamak istiyorsunuz?',
            choices: stashList.map(s => ({
                name: `stash@{${s.index}} - ${s.message}`,
                value: s.index
            }))
        }
    ]);
    const spinner = (0, ora_1.default)('Stash uygulanıyor ve siliniyor...').start();
    try {
        await operations_1.gitOps.stashPop(index);
        spinner.succeed('Stash uygulandı ve silindi');
    }
    catch (error) {
        spinner.fail(`Stash pop başarısız: ${error}`);
    }
}
async function stashApply(stashList) {
    const { index } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'index',
            message: 'Hangi stash\'i uygulamak istiyorsunuz?',
            choices: stashList.map(s => ({
                name: `stash@{${s.index}} - ${s.message}`,
                value: s.index
            }))
        }
    ]);
    const spinner = (0, ora_1.default)('Stash uygulanıyor...').start();
    try {
        await operations_1.gitOps.stashApply(index);
        spinner.succeed('Stash uygulandı (hâlâ listede)');
    }
    catch (error) {
        spinner.fail(`Stash apply başarısız: ${error}`);
    }
}
async function stashShow(stashList) {
    const { index } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'index',
            message: 'Hangi stash\'in içeriğini görüntülemek istiyorsunuz?',
            choices: stashList.map(s => ({
                name: `stash@{${s.index}} - ${s.message}`,
                value: s.index
            }))
        }
    ]);
    const spinner = (0, ora_1.default)('Stash içeriği yükleniyor...').start();
    try {
        const diff = await operations_1.gitOps.stashShow(index);
        spinner.stop();
        console.log('\n' + chalk_1.default.bold('📄 Stash İçeriği'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        diff.split('\n').forEach(line => {
            if (line.startsWith('+') && !line.startsWith('+++')) {
                console.log(chalk_1.default.green(line));
            }
            else if (line.startsWith('-') && !line.startsWith('---')) {
                console.log(chalk_1.default.red(line));
            }
            else if (line.startsWith('@@')) {
                console.log(chalk_1.default.cyan(line));
            }
            else {
                console.log(line);
            }
        });
    }
    catch (error) {
        spinner.fail(`Stash içeriği yüklenemedi: ${error}`);
    }
}
async function stashDrop(stashList) {
    const { index } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'index',
            message: 'Hangi stash\'i silmek istiyorsunuz?',
            choices: stashList.map(s => ({
                name: `stash@{${s.index}} - ${s.message}`,
                value: s.index
            }))
        }
    ]);
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Bu stash\'i silmek istediğinizden emin misiniz?',
            default: false
        }
    ]);
    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }
    const spinner = (0, ora_1.default)('Stash siliniyor...').start();
    try {
        await operations_1.gitOps.stashDrop(index);
        spinner.succeed('Stash silindi');
    }
    catch (error) {
        spinner.fail(`Stash silinemedi: ${error}`);
    }
}
async function stashClear() {
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: chalk_1.default.red('TÜM stash\'ler silinecek. Emin misiniz?'),
            default: false
        }
    ]);
    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }
    const spinner = (0, ora_1.default)('Tüm stash\'ler temizleniyor...').start();
    try {
        await operations_1.gitOps.stashClear();
        spinner.succeed('Tüm stash\'ler temizlendi');
    }
    catch (error) {
        spinner.fail(`Stash temizlenemedi: ${error}`);
    }
}
