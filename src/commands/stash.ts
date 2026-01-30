import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { gitOps } from '../git/operations';
import { displayHeader, displaySuccess, displayError, displayWarning } from '../ui/display';

export async function manageStash(): Promise<void> {
    const projectName = gitOps.getProjectName();
    displayHeader(projectName);

    try {
        await showStashMenu();
    } catch (error) {
        displayError(`Stash işlemi başarısız: ${error}`);
    }
}

async function showStashMenu(): Promise<void> {
    const stashList = await gitOps.getStashList();
    const status = await gitOps.getStatus();
    const hasChanges = !status.isClean;

    console.log(`\n📦 Stash Listesi (${stashList.length} kayıt)`);
    console.log(chalk.gray('─'.repeat(40)));

    if (stashList.length === 0) {
        console.log(chalk.gray('  Stash\'te kayıt yok'));
    } else {
        stashList.forEach(s => {
            console.log(`  ${chalk.yellow(`stash@{${s.index}}`)} - ${s.message} ${chalk.gray(s.date)}`);
        });
    }

    const choices = [];

    if (hasChanges) {
        choices.push({ name: '💾 Değişiklikleri stash\'le', value: 'save' });
    }

    if (stashList.length > 0) {
        choices.push(
            { name: '📤 Stash\'i uygula ve sil (pop)', value: 'pop' },
            { name: '📋 Stash\'i uygula (apply)', value: 'apply' },
            { name: '👁️ Stash içeriğini görüntüle', value: 'show' },
            { name: '🗑️ Stash\'i sil (drop)', value: 'drop' },
            { name: '🧹 Tüm stash\'leri temizle', value: 'clear' }
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
}

async function stashSave(): Promise<void> {
    const { message } = await inquirer.prompt([
        {
            type: 'input',
            name: 'message',
            message: 'Stash mesajı (opsiyonel):',
        }
    ]);

    const spinner = ora('Değişiklikler stash\'leniyor...').start();

    try {
        await gitOps.stashSave(message || undefined);
        spinner.succeed('Değişiklikler stash\'lendi');
    } catch (error) {
        spinner.fail(`Stash başarısız: ${error}`);
    }
}

async function stashPop(stashList: { index: number; message: string }[]): Promise<void> {
    const { index } = await inquirer.prompt([
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

    const spinner = ora('Stash uygulanıyor ve siliniyor...').start();

    try {
        await gitOps.stashPop(index);
        spinner.succeed('Stash uygulandı ve silindi');
    } catch (error) {
        spinner.fail(`Stash pop başarısız: ${error}`);
    }
}

async function stashApply(stashList: { index: number; message: string }[]): Promise<void> {
    const { index } = await inquirer.prompt([
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

    const spinner = ora('Stash uygulanıyor...').start();

    try {
        await gitOps.stashApply(index);
        spinner.succeed('Stash uygulandı (hâlâ listede)');
    } catch (error) {
        spinner.fail(`Stash apply başarısız: ${error}`);
    }
}

async function stashShow(stashList: { index: number; message: string }[]): Promise<void> {
    const { index } = await inquirer.prompt([
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

    const spinner = ora('Stash içeriği yükleniyor...').start();

    try {
        const diff = await gitOps.stashShow(index);
        spinner.stop();

        console.log('\n' + chalk.bold('📄 Stash İçeriği'));
        console.log(chalk.gray('─'.repeat(40)));

        diff.split('\n').forEach(line => {
            if (line.startsWith('+') && !line.startsWith('+++')) {
                console.log(chalk.green(line));
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                console.log(chalk.red(line));
            } else if (line.startsWith('@@')) {
                console.log(chalk.cyan(line));
            } else {
                console.log(line);
            }
        });
    } catch (error) {
        spinner.fail(`Stash içeriği yüklenemedi: ${error}`);
    }
}

async function stashDrop(stashList: { index: number; message: string }[]): Promise<void> {
    const { index } = await inquirer.prompt([
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

    const { confirm } = await inquirer.prompt([
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

    const spinner = ora('Stash siliniyor...').start();

    try {
        await gitOps.stashDrop(index);
        spinner.succeed('Stash silindi');
    } catch (error) {
        spinner.fail(`Stash silinemedi: ${error}`);
    }
}

async function stashClear(): Promise<void> {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: chalk.red('TÜM stash\'ler silinecek. Emin misiniz?'),
            default: false
        }
    ]);

    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }

    const spinner = ora('Tüm stash\'ler temizleniyor...').start();

    try {
        await gitOps.stashClear();
        spinner.succeed('Tüm stash\'ler temizlendi');
    } catch (error) {
        spinner.fail(`Stash temizlenemedi: ${error}`);
    }
}
