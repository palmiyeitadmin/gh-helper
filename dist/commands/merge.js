"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageMergeRebaseMenu = manageMergeRebaseMenu;
exports.manageMergeRebase = manageMergeRebase;
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const operations_1 = require("../git/operations");
const display_1 = require("../ui/display");
// Dashboard'dan çağrılan loop'lu menü
async function manageMergeRebaseMenu() {
    let running = true;
    while (running) {
        const shouldContinue = await showMergeRebaseMenuWithReturn();
        if (!shouldContinue) {
            running = false;
        }
    }
}
// Standalone CLI komutu için
async function manageMergeRebase() {
    const projectName = operations_1.gitOps.getProjectName();
    (0, display_1.displayHeader)(projectName);
    try {
        await showMergeRebaseMenuWithReturn();
    }
    catch (error) {
        (0, display_1.displayError)(`İşlem başarısız: ${error}`);
    }
}
async function showMergeRebaseMenuWithReturn() {
    const currentBranch = await operations_1.gitOps.getCurrentBranch();
    const branches = await operations_1.gitOps.getLocalBranches();
    const otherBranches = branches.filter(b => !b.current);
    const hasConflicts = await operations_1.gitOps.hasConflicts();
    console.log(`\n📊 Mevcut branch: ${chalk_1.default.cyan(currentBranch)}`);
    console.log(chalk_1.default.gray('─'.repeat(40)));
    if (hasConflicts) {
        console.log(chalk_1.default.red('⚠️ Çözülmemiş conflict\'ler var!'));
    }
    const choices = [];
    if (hasConflicts) {
        choices.push({ name: '🔄 Conflict\'leri çöz', value: 'resolve-conflicts' }, { name: '❌ Merge\'i iptal et', value: 'merge-abort' }, { name: '❌ Rebase\'i iptal et', value: 'rebase-abort' });
    }
    else {
        if (otherBranches.length > 0) {
            choices.push({ name: '🔀 Branch merge et', value: 'merge' }, { name: '📐 Branch rebase et', value: 'rebase' });
        }
        choices.push({ name: '🔙 Son commit\'i geri al (revert)', value: 'revert' }, { name: '↩️ Reset (değişiklikleri geri al)', value: 'reset' });
    }
    choices.push({ name: '⬅️ Ana menüye dön', value: 'back' });
    const { action } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Ne yapmak istersiniz?',
            choices
        }
    ]);
    if (action === 'back') {
        return false;
    }
    switch (action) {
        case 'merge':
            await performMerge(otherBranches.map(b => b.name));
            break;
        case 'rebase':
            await performRebase(otherBranches.map(b => b.name));
            break;
        case 'resolve-conflicts':
            await resolveConflicts();
            break;
        case 'merge-abort':
            await abortMerge();
            break;
        case 'rebase-abort':
            await abortRebase();
            break;
        case 'revert':
            await revertCommit();
            break;
        case 'reset':
            await resetChanges();
            break;
    }
    return true;
}
async function performMerge(branches) {
    if (branches.length === 0) {
        (0, display_1.displayWarning)('Merge edilecek başka branch yok.');
        return;
    }
    const { branch, noFastForward } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'branch',
            message: 'Hangi branch\'ı merge etmek istiyorsunuz?',
            choices: branches
        },
        {
            type: 'confirm',
            name: 'noFastForward',
            message: 'Merge commit oluşturulsun mu (--no-ff)?',
            default: false
        }
    ]);
    const spinner = (0, ora_1.default)(`${branch} merge ediliyor...`).start();
    try {
        await operations_1.gitOps.merge(branch, noFastForward);
        spinner.succeed(`${branch} başarıyla merge edildi`);
    }
    catch (error) {
        spinner.fail(`Merge başarısız: ${error.message}`);
        const hasConflicts = await operations_1.gitOps.hasConflicts();
        if (hasConflicts) {
            console.log(chalk_1.default.yellow('\n⚠️ Conflict\'ler tespit edildi. Çözmek için tekrar bu menüyü açın.'));
        }
    }
}
async function performRebase(branches) {
    if (branches.length === 0) {
        (0, display_1.displayWarning)('Rebase edilecek başka branch yok.');
        return;
    }
    const { branch } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'branch',
            message: 'Hangi branch üzerine rebase yapmak istiyorsunuz?',
            choices: branches
        }
    ]);
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: chalk_1.default.yellow('Rebase geçmişi yeniden yazar. Devam etmek istiyor musunuz?'),
            default: false
        }
    ]);
    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }
    const spinner = (0, ora_1.default)(`${branch} üzerine rebase yapılıyor...`).start();
    try {
        await operations_1.gitOps.rebase(branch);
        spinner.succeed(`${branch} üzerine rebase başarılı`);
    }
    catch (error) {
        spinner.fail(`Rebase başarısız: ${error.message}`);
        const hasConflicts = await operations_1.gitOps.hasConflicts();
        if (hasConflicts) {
            console.log(chalk_1.default.yellow('\n⚠️ Conflict\'ler tespit edildi. Çözmek için tekrar bu menüyü açın.'));
        }
    }
}
async function resolveConflicts() {
    const conflicts = await operations_1.gitOps.getConflictedFiles();
    if (conflicts.length === 0) {
        (0, display_1.displaySuccess)('Çözülmemiş conflict yok!');
        return;
    }
    console.log('\n' + chalk_1.default.bold('⚔️ Conflict\'li Dosyalar'));
    console.log(chalk_1.default.gray('─'.repeat(40)));
    conflicts.forEach(c => {
        console.log(`  ${chalk_1.default.red('!')} ${c.file}`);
    });
    const { file } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'file',
            message: 'Hangi dosyayı çözmek istiyorsunuz?',
            choices: conflicts.map(c => c.file)
        }
    ]);
    const { resolution } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'resolution',
            message: `${file} için ne yapmak istiyorsunuz?`,
            choices: [
                { name: '✅ Bizim sürümü kabul et (ours)', value: 'ours' },
                { name: '✅ Onların sürümünü kabul et (theirs)', value: 'theirs' },
                { name: '✏️ Manuel düzenleme yaptım, çözüldü olarak işaretle', value: 'manual' },
                { name: '👁️ Dosya içeriğini görüntüle', value: 'view' },
                { name: '❌ İptal', value: 'cancel' }
            ]
        }
    ]);
    switch (resolution) {
        case 'ours':
            const oursSpinner = (0, ora_1.default)('Bizim sürüm uygulanıyor...').start();
            try {
                await operations_1.gitOps.acceptOurs(file);
                oursSpinner.succeed('Bizim sürüm kabul edildi ve conflict çözüldü');
            }
            catch (error) {
                oursSpinner.fail(`Hata: ${error}`);
            }
            break;
        case 'theirs':
            const theirsSpinner = (0, ora_1.default)('Onların sürümü uygulanıyor...').start();
            try {
                await operations_1.gitOps.acceptTheirs(file);
                theirsSpinner.succeed('Onların sürümü kabul edildi ve conflict çözüldü');
            }
            catch (error) {
                theirsSpinner.fail(`Hata: ${error}`);
            }
            break;
        case 'manual':
            const manualSpinner = (0, ora_1.default)('Dosya çözüldü olarak işaretleniyor...').start();
            try {
                await operations_1.gitOps.markAsResolved([file]);
                manualSpinner.succeed('Dosya çözüldü olarak işaretlendi');
            }
            catch (error) {
                manualSpinner.fail(`Hata: ${error}`);
            }
            break;
        case 'view':
            try {
                const content = await operations_1.gitOps.getFileContent(file);
                console.log('\n' + chalk_1.default.bold('📄 Dosya İçeriği'));
                console.log(chalk_1.default.gray('─'.repeat(40)));
                content.split('\n').forEach((line, i) => {
                    if (line.startsWith('<<<<<<<')) {
                        console.log(chalk_1.default.red(line));
                    }
                    else if (line.startsWith('=======')) {
                        console.log(chalk_1.default.yellow(line));
                    }
                    else if (line.startsWith('>>>>>>>')) {
                        console.log(chalk_1.default.green(line));
                    }
                    else {
                        console.log(line);
                    }
                });
            }
            catch (error) {
                (0, display_1.displayError)(`Dosya okunamadı: ${error}`);
            }
            break;
    }
    // Check if there are more conflicts
    const remainingConflicts = await operations_1.gitOps.getConflictedFiles();
    if (remainingConflicts.length === 0) {
        (0, display_1.displaySuccess)('Tüm conflict\'ler çözüldü! Şimdi commit yapabilirsiniz.');
    }
    else {
        console.log(chalk_1.default.yellow(`\n${remainingConflicts.length} conflict daha kaldı.`));
    }
}
async function abortMerge() {
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: chalk_1.default.red('Merge iptal edilecek ve değişiklikler geri alınacak. Emin misiniz?'),
            default: false
        }
    ]);
    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }
    const spinner = (0, ora_1.default)('Merge iptal ediliyor...').start();
    try {
        await operations_1.gitOps.mergeAbort();
        spinner.succeed('Merge iptal edildi');
    }
    catch (error) {
        spinner.fail(`Merge iptal edilemedi: ${error}`);
    }
}
async function abortRebase() {
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: chalk_1.default.red('Rebase iptal edilecek ve değişiklikler geri alınacak. Emin misiniz?'),
            default: false
        }
    ]);
    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }
    const spinner = (0, ora_1.default)('Rebase iptal ediliyor...').start();
    try {
        await operations_1.gitOps.rebaseAbort();
        spinner.succeed('Rebase iptal edildi');
    }
    catch (error) {
        spinner.fail(`Rebase iptal edilemedi: ${error}`);
    }
}
async function revertCommit() {
    const commits = await operations_1.gitOps.getRecentCommits(10);
    if (commits.length === 0) {
        (0, display_1.displayWarning)('Geri alınacak commit yok.');
        return;
    }
    const { commit } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'commit',
            message: 'Hangi commit\'i geri almak istiyorsunuz?',
            choices: commits.map(c => ({
                name: `${c.hash} - ${c.message} (${c.date})`,
                value: c.hash
            }))
        }
    ]);
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Bu commit geri alınacak ve yeni bir commit oluşturulacak. Devam?',
            default: true
        }
    ]);
    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }
    const spinner = (0, ora_1.default)('Commit geri alınıyor...').start();
    try {
        await operations_1.gitOps.revert(commit);
        spinner.succeed('Commit geri alındı');
    }
    catch (error) {
        spinner.fail(`Revert başarısız: ${error}`);
    }
}
async function resetChanges() {
    const { resetType } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'resetType',
            message: 'Reset türü seçin:',
            choices: [
                { name: '🔙 Soft: Commit\'i geri al, değişiklikleri staged bırak', value: 'soft' },
                { name: '🔙 Mixed: Commit\'i geri al, değişiklikleri unstaged bırak', value: 'mixed' },
                { name: '🔴 Hard: Commit\'i ve tüm değişiklikleri sil (DİKKAT!)', value: 'hard' }
            ]
        }
    ]);
    if (resetType === 'hard') {
        const { confirm } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: chalk_1.default.red('⚠️ HARD RESET tüm değişikliklerinizi SİLECEK! Emin misiniz?'),
                default: false
            }
        ]);
        if (!confirm) {
            console.log('İptal edildi.');
            return;
        }
    }
    const spinner = (0, ora_1.default)(`${resetType} reset yapılıyor...`).start();
    try {
        await operations_1.gitOps.reset(resetType);
        spinner.succeed(`${resetType} reset tamamlandı`);
    }
    catch (error) {
        spinner.fail(`Reset başarısız: ${error}`);
    }
}
