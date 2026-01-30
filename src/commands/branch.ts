import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { gitOps } from '../git/operations';
import { displayHeader, displaySuccess, displayError, displayWarning } from '../ui/display';

// Dashboard'dan çağrılan loop'lu menü
export async function manageBranchesMenu(): Promise<void> {
    let running = true;
    while (running) {
        const shouldContinue = await showBranchMenuWithReturn();
        if (!shouldContinue) {
            running = false;
        }
    }
}

// Standalone CLI komutu için
export async function manageBranches(): Promise<void> {
    const projectName = gitOps.getProjectName();
    displayHeader(projectName);

    try {
        await showBranchMenuWithReturn();
    } catch (error) {
        displayError(`Branch işlemi başarısız: ${error}`);
    }
}

async function showBranchMenuWithReturn(): Promise<boolean> {
    const currentBranch = await gitOps.getCurrentBranch();
    const branches = await gitOps.getLocalBranches();

    console.log(`\n📊 Mevcut branch: ${chalk.cyan(currentBranch)}`);
    console.log(chalk.gray('─'.repeat(40)));

    branches.forEach(b => {
        const prefix = b.current ? chalk.green('* ') : '  ';
        const name = b.current ? chalk.green(b.name) : b.name;
        console.log(`${prefix}${name} ${chalk.gray(b.commit)}`);
    });

    const { action } = await inquirer.prompt([
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
                { name: '⬅️ Ana menüye dön', value: 'back' }
            ]
        }
    ]);

    if (action === 'back') {
        return false;
    }

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
    return true;
}

async function switchBranch(availableBranches: string[]): Promise<void> {
    if (availableBranches.length === 0) {
        displayWarning('Geçiş yapılacak başka branch yok.');
        return;
    }

    const { branch } = await inquirer.prompt([
        {
            type: 'list',
            name: 'branch',
            message: 'Hangi branch\'a geçmek istiyorsunuz?',
            choices: availableBranches
        }
    ]);

    const spinner = ora(`${branch} branch\'ına geçiliyor...`).start();

    try {
        await gitOps.checkoutBranch(branch);
        spinner.succeed(`${branch} branch\'ına geçildi`);
    } catch (error) {
        spinner.fail(`Branch değiştirilemedi: ${error}`);
    }
}

async function createBranch(): Promise<void> {
    const { branchName, checkout } = await inquirer.prompt([
        {
            type: 'input',
            name: 'branchName',
            message: 'Yeni branch adı:',
            validate: (input: string) => {
                if (!input.trim()) return 'Branch adı boş olamaz';
                if (input.includes(' ')) return 'Branch adı boşluk içeremez';
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

    const spinner = ora(`${branchName} branch\'ı oluşturuluyor...`).start();

    try {
        await gitOps.createBranch(branchName, checkout);
        if (checkout) {
            spinner.succeed(`${branchName} branch\'ı oluşturuldu ve geçildi`);
        } else {
            spinner.succeed(`${branchName} branch\'ı oluşturuldu`);
        }
    } catch (error) {
        spinner.fail(`Branch oluşturulamadı: ${error}`);
    }
}

async function renameBranch(branches: string[], currentBranch: string): Promise<void> {
    const { oldName, newName } = await inquirer.prompt([
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
            validate: (input: string) => {
                if (!input.trim()) return 'Branch adı boş olamaz';
                if (input.includes(' ')) return 'Branch adı boşluk içeremez';
                return true;
            }
        }
    ]);

    const spinner = ora(`Branch yeniden adlandırılıyor...`).start();

    try {
        await gitOps.renameBranch(oldName, newName);
        spinner.succeed(`${oldName} → ${newName} olarak yeniden adlandırıldı`);
    } catch (error) {
        spinner.fail(`Branch yeniden adlandırılamadı: ${error}`);
    }
}

async function deleteBranch(availableBranches: string[]): Promise<void> {
    if (availableBranches.length === 0) {
        displayWarning('Silinecek branch yok (mevcut branch silinemez).');
        return;
    }

    const { branch, force, deleteRemote } = await inquirer.prompt([
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

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `${chalk.red(branch)} branch\'ını silmek istediğinizden emin misiniz?`,
            default: false
        }
    ]);

    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }

    const spinner = ora(`${branch} siliniyor...`).start();

    try {
        await gitOps.deleteBranch(branch, force);
        spinner.succeed(`${branch} yerel branch silindi`);

        if (deleteRemote) {
            const remoteSpinner = ora(`Remote branch siliniyor...`).start();
            try {
                await gitOps.deleteRemoteBranch(branch);
                remoteSpinner.succeed(`Remote branch da silindi`);
            } catch (error) {
                remoteSpinner.fail(`Remote branch silinemedi: ${error}`);
            }
        }
    } catch (error) {
        spinner.fail(`Branch silinemedi: ${error}`);
    }
}

async function listAllBranches(): Promise<void> {
    const spinner = ora('Branch\'lar yükleniyor...').start();

    try {
        const branches = await gitOps.getBranches();
        spinner.stop();

        console.log('\n' + chalk.bold('📋 Tüm Branch\'lar'));
        console.log(chalk.gray('─'.repeat(50)));

        const localBranches = branches.filter(b => !b.name.startsWith('remotes/'));
        const remoteBranches = branches.filter(b => b.name.startsWith('remotes/'));

        console.log(chalk.bold('\n🏠 Yerel:'));
        localBranches.forEach(b => {
            const prefix = b.current ? chalk.green('* ') : '  ';
            const name = b.current ? chalk.green(b.name) : b.name;
            console.log(`${prefix}${name} ${chalk.gray(b.commit)}`);
        });

        if (remoteBranches.length > 0) {
            console.log(chalk.bold('\n🌐 Remote:'));
            remoteBranches.forEach(b => {
                console.log(`  ${chalk.blue(b.name)} ${chalk.gray(b.commit)}`);
            });
        }
    } catch (error) {
        spinner.fail(`Branch\'lar yüklenemedi: ${error}`);
    }
}
