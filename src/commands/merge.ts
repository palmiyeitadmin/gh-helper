import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { gitOps } from '../git/operations';
import { displayHeader, displaySuccess, displayError, displayWarning } from '../ui/display';

export async function manageMergeRebase(): Promise<void> {
    const projectName = gitOps.getProjectName();
    displayHeader(projectName);

    try {
        await showMergeRebaseMenu();
    } catch (error) {
        displayError(`İşlem başarısız: ${error}`);
    }
}

async function showMergeRebaseMenu(): Promise<void> {
    const currentBranch = await gitOps.getCurrentBranch();
    const branches = await gitOps.getLocalBranches();
    const otherBranches = branches.filter(b => !b.current);
    const hasConflicts = await gitOps.hasConflicts();

    console.log(`\n📊 Mevcut branch: ${chalk.cyan(currentBranch)}`);
    console.log(chalk.gray('─'.repeat(40)));

    if (hasConflicts) {
        console.log(chalk.red('⚠️ Çözülmemiş conflict\'ler var!'));
    }

    const choices = [];

    if (hasConflicts) {
        choices.push(
            { name: '🔄 Conflict\'leri çöz', value: 'resolve-conflicts' },
            { name: '❌ Merge\'i iptal et', value: 'merge-abort' },
            { name: '❌ Rebase\'i iptal et', value: 'rebase-abort' }
        );
    } else {
        if (otherBranches.length > 0) {
            choices.push(
                { name: '🔀 Branch merge et', value: 'merge' },
                { name: '📐 Branch rebase et', value: 'rebase' }
            );
        }
        choices.push(
            { name: '🔙 Son commit\'i geri al (revert)', value: 'revert' },
            { name: '↩️ Reset (değişiklikleri geri al)', value: 'reset' }
        );
    }

    choices.push({ name: '❌ Geri dön', value: 'back' });

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Ne yapmak istersiniz?',
            choices
        }
    ]);

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
}

async function performMerge(branches: string[]): Promise<void> {
    if (branches.length === 0) {
        displayWarning('Merge edilecek başka branch yok.');
        return;
    }

    const { branch, noFastForward } = await inquirer.prompt([
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

    const spinner = ora(`${branch} merge ediliyor...`).start();

    try {
        await gitOps.merge(branch, noFastForward);
        spinner.succeed(`${branch} başarıyla merge edildi`);
    } catch (error: any) {
        spinner.fail(`Merge başarısız: ${error.message}`);

        const hasConflicts = await gitOps.hasConflicts();
        if (hasConflicts) {
            console.log(chalk.yellow('\n⚠️ Conflict\'ler tespit edildi. Çözmek için tekrar bu menüyü açın.'));
        }
    }
}

async function performRebase(branches: string[]): Promise<void> {
    if (branches.length === 0) {
        displayWarning('Rebase edilecek başka branch yok.');
        return;
    }

    const { branch } = await inquirer.prompt([
        {
            type: 'list',
            name: 'branch',
            message: 'Hangi branch üzerine rebase yapmak istiyorsunuz?',
            choices: branches
        }
    ]);

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: chalk.yellow('Rebase geçmişi yeniden yazar. Devam etmek istiyor musunuz?'),
            default: false
        }
    ]);

    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }

    const spinner = ora(`${branch} üzerine rebase yapılıyor...`).start();

    try {
        await gitOps.rebase(branch);
        spinner.succeed(`${branch} üzerine rebase başarılı`);
    } catch (error: any) {
        spinner.fail(`Rebase başarısız: ${error.message}`);

        const hasConflicts = await gitOps.hasConflicts();
        if (hasConflicts) {
            console.log(chalk.yellow('\n⚠️ Conflict\'ler tespit edildi. Çözmek için tekrar bu menüyü açın.'));
        }
    }
}

async function resolveConflicts(): Promise<void> {
    const conflicts = await gitOps.getConflictedFiles();

    if (conflicts.length === 0) {
        displaySuccess('Çözülmemiş conflict yok!');
        return;
    }

    console.log('\n' + chalk.bold('⚔️ Conflict\'li Dosyalar'));
    console.log(chalk.gray('─'.repeat(40)));
    conflicts.forEach(c => {
        console.log(`  ${chalk.red('!')} ${c.file}`);
    });

    const { file } = await inquirer.prompt([
        {
            type: 'list',
            name: 'file',
            message: 'Hangi dosyayı çözmek istiyorsunuz?',
            choices: conflicts.map(c => c.file)
        }
    ]);

    const { resolution } = await inquirer.prompt([
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
            const oursSpinner = ora('Bizim sürüm uygulanıyor...').start();
            try {
                await gitOps.acceptOurs(file);
                oursSpinner.succeed('Bizim sürüm kabul edildi ve conflict çözüldü');
            } catch (error) {
                oursSpinner.fail(`Hata: ${error}`);
            }
            break;

        case 'theirs':
            const theirsSpinner = ora('Onların sürümü uygulanıyor...').start();
            try {
                await gitOps.acceptTheirs(file);
                theirsSpinner.succeed('Onların sürümü kabul edildi ve conflict çözüldü');
            } catch (error) {
                theirsSpinner.fail(`Hata: ${error}`);
            }
            break;

        case 'manual':
            const manualSpinner = ora('Dosya çözüldü olarak işaretleniyor...').start();
            try {
                await gitOps.markAsResolved([file]);
                manualSpinner.succeed('Dosya çözüldü olarak işaretlendi');
            } catch (error) {
                manualSpinner.fail(`Hata: ${error}`);
            }
            break;

        case 'view':
            try {
                const content = await gitOps.getFileContent(file);
                console.log('\n' + chalk.bold('📄 Dosya İçeriği'));
                console.log(chalk.gray('─'.repeat(40)));

                content.split('\n').forEach((line, i) => {
                    if (line.startsWith('<<<<<<<')) {
                        console.log(chalk.red(line));
                    } else if (line.startsWith('=======')) {
                        console.log(chalk.yellow(line));
                    } else if (line.startsWith('>>>>>>>')) {
                        console.log(chalk.green(line));
                    } else {
                        console.log(line);
                    }
                });
            } catch (error) {
                displayError(`Dosya okunamadı: ${error}`);
            }
            break;
    }

    // Check if there are more conflicts
    const remainingConflicts = await gitOps.getConflictedFiles();
    if (remainingConflicts.length === 0) {
        displaySuccess('Tüm conflict\'ler çözüldü! Şimdi commit yapabilirsiniz.');
    } else {
        console.log(chalk.yellow(`\n${remainingConflicts.length} conflict daha kaldı.`));
    }
}

async function abortMerge(): Promise<void> {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: chalk.red('Merge iptal edilecek ve değişiklikler geri alınacak. Emin misiniz?'),
            default: false
        }
    ]);

    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }

    const spinner = ora('Merge iptal ediliyor...').start();

    try {
        await gitOps.mergeAbort();
        spinner.succeed('Merge iptal edildi');
    } catch (error) {
        spinner.fail(`Merge iptal edilemedi: ${error}`);
    }
}

async function abortRebase(): Promise<void> {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: chalk.red('Rebase iptal edilecek ve değişiklikler geri alınacak. Emin misiniz?'),
            default: false
        }
    ]);

    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }

    const spinner = ora('Rebase iptal ediliyor...').start();

    try {
        await gitOps.rebaseAbort();
        spinner.succeed('Rebase iptal edildi');
    } catch (error) {
        spinner.fail(`Rebase iptal edilemedi: ${error}`);
    }
}

async function revertCommit(): Promise<void> {
    const commits = await gitOps.getRecentCommits(10);

    if (commits.length === 0) {
        displayWarning('Geri alınacak commit yok.');
        return;
    }

    const { commit } = await inquirer.prompt([
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

    const { confirm } = await inquirer.prompt([
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

    const spinner = ora('Commit geri alınıyor...').start();

    try {
        await gitOps.revert(commit);
        spinner.succeed('Commit geri alındı');
    } catch (error) {
        spinner.fail(`Revert başarısız: ${error}`);
    }
}

async function resetChanges(): Promise<void> {
    const { resetType } = await inquirer.prompt([
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
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: chalk.red('⚠️ HARD RESET tüm değişikliklerinizi SİLECEK! Emin misiniz?'),
                default: false
            }
        ]);

        if (!confirm) {
            console.log('İptal edildi.');
            return;
        }
    }

    const spinner = ora(`${resetType} reset yapılıyor...`).start();

    try {
        await gitOps.reset(resetType);
        spinner.succeed(`${resetType} reset tamamlandı`);
    } catch (error) {
        spinner.fail(`Reset başarısız: ${error}`);
    }
}
