"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageBranches = manageBranches;
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const operations_1 = require("../git/operations");
const display_1 = require("../ui/display");
async function manageBranches() {
    const projectName = operations_1.gitOps.getProjectName();
    (0, display_1.displayHeader)(projectName);
    try {
        await showBranchMenu();
    }
    catch (error) {
        (0, display_1.displayError)(`Branch işlemi başarısız: ${error}`);
    }
}
async function showBranchMenu() {
    const currentBranch = await operations_1.gitOps.getCurrentBranch();
    const branches = await operations_1.gitOps.getLocalBranches();
    console.log(`\n📊 Mevcut branch: ${chalk_1.default.cyan(currentBranch)}`);
    console.log(chalk_1.default.gray('─'.repeat(40)));
    branches.forEach(b => {
        const prefix = b.current ? chalk_1.default.green('* ') : '  ';
        const name = b.current ? chalk_1.default.green(b.name) : b.name;
        console.log(`${prefix}${name} ${chalk_1.default.gray(b.commit)}`);
    });
    const { action } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Ne yapmak istersiniz?',
            choices: [
                { name: '🔀 Branch değiştir', value: 'switch' },
                { name: '➕ Yeni branch oluştur', value: 'create' },
                { name: '✏️ Branch yeniden adlandır', value: 'rename' },
                { name: '🗑️ Branch sil', value: 'delete' },
                { name: '📋 Tüm branch\'ları listele (remote dahil)', value: 'list-all' },
                { name: '❌ Geri dön', value: 'back' }
            ]
        }
    ]);
    switch (action) {
        case 'switch':
            await switchBranch(branches.filter(b => !b.current).map(b => b.name));
            break;
        case 'create':
            await createBranch();
            break;
        case 'rename':
            await renameBranch(branches.map(b => b.name), currentBranch);
            break;
        case 'delete':
            await deleteBranch(branches.filter(b => !b.current).map(b => b.name));
            break;
        case 'list-all':
            await listAllBranches();
            break;
    }
}
async function switchBranch(availableBranches) {
    if (availableBranches.length === 0) {
        (0, display_1.displayWarning)('Geçiş yapılacak başka branch yok.');
        return;
    }
    const { branch } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'branch',
            message: 'Hangi branch\'a geçmek istiyorsunuz?',
            choices: availableBranches
        }
    ]);
    const spinner = (0, ora_1.default)(`${branch} branch\'ına geçiliyor...`).start();
    try {
        await operations_1.gitOps.checkoutBranch(branch);
        spinner.succeed(`${branch} branch\'ına geçildi`);
    }
    catch (error) {
        spinner.fail(`Branch değiştirilemedi: ${error}`);
    }
}
async function createBranch() {
    const { branchName, checkout } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'branchName',
            message: 'Yeni branch adı:',
            validate: (input) => {
                if (!input.trim())
                    return 'Branch adı boş olamaz';
                if (input.includes(' '))
                    return 'Branch adı boşluk içeremez';
                return true;
            }
        },
        {
            type: 'confirm',
            name: 'checkout',
            message: 'Yeni branch\'a geçilsin mi?',
            default: true
        }
    ]);
    const spinner = (0, ora_1.default)(`${branchName} branch\'ı oluşturuluyor...`).start();
    try {
        await operations_1.gitOps.createBranch(branchName, checkout);
        if (checkout) {
            spinner.succeed(`${branchName} branch\'ı oluşturuldu ve geçildi`);
        }
        else {
            spinner.succeed(`${branchName} branch\'ı oluşturuldu`);
        }
    }
    catch (error) {
        spinner.fail(`Branch oluşturulamadı: ${error}`);
    }
}
async function renameBranch(branches, currentBranch) {
    const { oldName, newName } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'oldName',
            message: 'Hangi branch\'ı yeniden adlandırmak istiyorsunuz?',
            choices: branches,
            default: currentBranch
        },
        {
            type: 'input',
            name: 'newName',
            message: 'Yeni branch adı:',
            validate: (input) => {
                if (!input.trim())
                    return 'Branch adı boş olamaz';
                if (input.includes(' '))
                    return 'Branch adı boşluk içeremez';
                return true;
            }
        }
    ]);
    const spinner = (0, ora_1.default)(`Branch yeniden adlandırılıyor...`).start();
    try {
        await operations_1.gitOps.renameBranch(oldName, newName);
        spinner.succeed(`${oldName} → ${newName} olarak yeniden adlandırıldı`);
    }
    catch (error) {
        spinner.fail(`Branch yeniden adlandırılamadı: ${error}`);
    }
}
async function deleteBranch(availableBranches) {
    if (availableBranches.length === 0) {
        (0, display_1.displayWarning)('Silinecek branch yok (mevcut branch silinemez).');
        return;
    }
    const { branch, force, deleteRemote } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'branch',
            message: 'Hangi branch\'ı silmek istiyorsunuz?',
            choices: availableBranches
        },
        {
            type: 'confirm',
            name: 'force',
            message: 'Merge edilmemiş değişiklikler varsa bile sil (force)?',
            default: false
        },
        {
            type: 'confirm',
            name: 'deleteRemote',
            message: 'Remote\'daki branch da silinsin mi?',
            default: false
        }
    ]);
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `${chalk_1.default.red(branch)} branch\'ını silmek istediğinizden emin misiniz?`,
            default: false
        }
    ]);
    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }
    const spinner = (0, ora_1.default)(`${branch} siliniyor...`).start();
    try {
        await operations_1.gitOps.deleteBranch(branch, force);
        spinner.succeed(`${branch} yerel branch silindi`);
        if (deleteRemote) {
            const remoteSpinner = (0, ora_1.default)(`Remote branch siliniyor...`).start();
            try {
                await operations_1.gitOps.deleteRemoteBranch(branch);
                remoteSpinner.succeed(`Remote branch da silindi`);
            }
            catch (error) {
                remoteSpinner.fail(`Remote branch silinemedi: ${error}`);
            }
        }
    }
    catch (error) {
        spinner.fail(`Branch silinemedi: ${error}`);
    }
}
async function listAllBranches() {
    const spinner = (0, ora_1.default)('Branch\'lar yükleniyor...').start();
    try {
        const branches = await operations_1.gitOps.getBranches();
        spinner.stop();
        console.log('\n' + chalk_1.default.bold('📋 Tüm Branch\'lar'));
        console.log(chalk_1.default.gray('─'.repeat(50)));
        const localBranches = branches.filter(b => !b.name.startsWith('remotes/'));
        const remoteBranches = branches.filter(b => b.name.startsWith('remotes/'));
        console.log(chalk_1.default.bold('\n🏠 Yerel:'));
        localBranches.forEach(b => {
            const prefix = b.current ? chalk_1.default.green('* ') : '  ';
            const name = b.current ? chalk_1.default.green(b.name) : b.name;
            console.log(`${prefix}${name} ${chalk_1.default.gray(b.commit)}`);
        });
        if (remoteBranches.length > 0) {
            console.log(chalk_1.default.bold('\n🌐 Remote:'));
            remoteBranches.forEach(b => {
                console.log(`  ${chalk_1.default.blue(b.name)} ${chalk_1.default.gray(b.commit)}`);
            });
        }
    }
    catch (error) {
        spinner.fail(`Branch\'lar yüklenemedi: ${error}`);
    }
}
