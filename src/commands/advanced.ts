import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { displayHeader, displaySuccess, displayError, displayWarning, displayInfo } from '../ui/display';
import { gitOps } from '../git/operations';

// Dashboard'dan çağrılan menü
export async function manageAdvancedMenu(): Promise<void> {
    let running = true;
    while (running) {
        const shouldContinue = await showAdvancedMenuWithReturn();
        if (!shouldContinue) {
            running = false;
        }
    }
}

async function showAdvancedMenuWithReturn(): Promise<boolean> {
    console.log(`\n🔧 Gelişmiş Git İşlemleri`);
    console.log(chalk.gray('─'.repeat(40)));

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Ne yapmak istersiniz?',
        choices: [
            { name: '⬅️  Ana menüye dön', value: 'back' },
            new inquirer.Separator(),
            { name: '🍒  Cherry-pick', value: 'cherry-pick' },
            { name: '🔍  Bisect (Bug hunting)', value: 'bisect' },
            { name: '👤  Blame (Satır bazlı katkı)', value: 'blame' },
            { name: '📜  Reflog (Tüm işlem geçmişi)', value: 'reflog' }
        ],
        loop: false
    }]);

    if (action === 'back') {
        return false;
    }

    switch (action) {
        case 'cherry-pick':
            await cherryPick();
            break;
        case 'bisect':
            await bisect();
            break;
        case 'blame':
            await blame();
            break;
        case 'reflog':
            await showReflog();
            break;
    }
    return true;
}

async function cherryPick(): Promise<void> {
    const spinner = ora('Commit geçmişi yükleniyor...').start();

    try {
        const git = gitOps.getGit();
        const logs = await git.log(['--all', '-n', '50']);
        spinner.stop();

        if (logs.all.length === 0) {
            displayWarning('Commit bulunamadı');
            await waitForEnter();
            return;
        }

        const currentBranch = (await git.status()).current;

        const { commits } = await inquirer.prompt([{
            type: 'checkbox',
            name: 'commits',
            message: 'Cherry-pick yapılacak commit\'leri seçin:',
            choices: logs.all.map(c => ({
                name: `${chalk.yellow(c.hash.slice(0, 7))} ${c.message.slice(0, 50)} ${chalk.gray(`(${c.author_name})`)}`,
                value: c.hash
            })),
            pageSize: 15
        }]);

        if (commits.length === 0) {
            displayWarning('Commit seçilmedi');
            await waitForEnter();
            return;
        }

        const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: `${commits.length} commit "${currentBranch}" branch'ına uygulanacak. Devam?`,
            default: true
        }]);

        if (!confirm) {
            displayInfo('İptal edildi');
            await waitForEnter();
            return;
        }

        const pickSpinner = ora('Cherry-pick yapılıyor...').start();

        for (const hash of commits) {
            try {
                await git.raw(['cherry-pick', hash]);
                pickSpinner.text = `Cherry-pick: ${hash.slice(0, 7)} ✓`;
            } catch (error: any) {
                pickSpinner.stop();
                if (error.message?.includes('conflict')) {
                    displayError(`Conflict oluştu: ${hash.slice(0, 7)}`);
                    console.log(chalk.yellow('\nÇözüm için:'));
                    console.log('  1. Conflict\'leri düzeltin');
                    console.log('  2. git add . && git cherry-pick --continue');
                    console.log('  veya git cherry-pick --abort');
                } else {
                    displayError(`Hata: ${error.message}`);
                }
                await waitForEnter();
                return;
            }
        }

        pickSpinner.stop();
        displaySuccess(`${commits.length} commit başarıyla uygulandı!`);
    } catch (error) {
        spinner.stop();
        displayError(`Cherry-pick hatası: ${error}`);
    }

    await waitForEnter();
}

async function bisect(): Promise<void> {
    console.log(chalk.bold('\n🔍 Git Bisect - Bug Hunting'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.gray(`
Bisect, bir bug'ın hangi commit'te ortaya çıktığını bulmak için
binary search algoritması kullanır.

Kullanım:
  1. git bisect start
  2. git bisect bad          # Mevcut commit bozuk
  3. git bisect good <hash>  # Çalışan eski commit
  4. Git otomatik olarak commit'ler arası geçer
  5. Her commit için "good" veya "bad" deyin
  6. git bisect reset        # Bitince
`));

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Ne yapmak istersiniz?',
        choices: [
            { name: '▶️ Bisect başlat', value: 'start' },
            { name: '✅ Good (Bu commit çalışıyor)', value: 'good' },
            { name: '❌ Bad (Bu commit bozuk)', value: 'bad' },
            { name: '🔄 Bisect sıfırla', value: 'reset' },
            { name: '⬅️ Geri', value: 'back' }
        ]
    }]);

    if (action === 'back') return;

    const git = gitOps.getGit();

    try {
        switch (action) {
            case 'start':
                await git.raw(['bisect', 'start']);
                displaySuccess('Bisect başlatıldı. Şimdi "bad" ve "good" commit\'leri belirleyin.');
                break;
            case 'good':
                const goodResult = await git.raw(['bisect', 'good']);
                console.log(goodResult);
                break;
            case 'bad':
                const badResult = await git.raw(['bisect', 'bad']);
                console.log(badResult);
                break;
            case 'reset':
                await git.raw(['bisect', 'reset']);
                displaySuccess('Bisect sıfırlandı');
                break;
        }
    } catch (error: any) {
        displayError(`Bisect hatası: ${error.message}`);
    }

    await waitForEnter();
}

async function blame(): Promise<void> {
    const { filePath } = await inquirer.prompt([{
        type: 'input',
        name: 'filePath',
        message: 'Dosya yolu:',
        validate: (input: string) => input.trim().length > 0 || 'Dosya yolu gerekli'
    }]);

    const spinner = ora('Blame bilgisi alınıyor...').start();

    try {
        const git = gitOps.getGit();
        const blameOutput = await git.raw(['blame', '--line-porcelain', filePath]);
        spinner.stop();

        // Parse blame output
        const lines = blameOutput.split('\n');
        const blameData: { hash: string; author: string; line: number; content: string }[] = [];

        let currentHash = '';
        let currentAuthor = '';
        let lineNumber = 0;

        for (const line of lines) {
            if (line.match(/^[a-f0-9]{40}/)) {
                currentHash = line.slice(0, 7);
                lineNumber++;
            } else if (line.startsWith('author ')) {
                currentAuthor = line.replace('author ', '');
            } else if (line.startsWith('\t')) {
                blameData.push({
                    hash: currentHash,
                    author: currentAuthor,
                    line: lineNumber,
                    content: line.slice(1)
                });
            }
        }

        console.log(chalk.bold(`\n👤 Blame: ${filePath}`));
        console.log(chalk.gray('─'.repeat(60)));

        // Author stats
        const authorCounts = new Map<string, number>();
        blameData.forEach(b => {
            authorCounts.set(b.author, (authorCounts.get(b.author) || 0) + 1);
        });

        console.log(chalk.bold('\nKatkıda bulunanlar:'));
        const sorted = [...authorCounts.entries()].sort((a, b) => b[1] - a[1]);
        sorted.forEach(([author, count]) => {
            const percent = ((count / blameData.length) * 100).toFixed(1);
            console.log(`  ${author.padEnd(25)} ${count} satır (${percent}%)`);
        });

        // Show first 20 lines
        console.log(chalk.bold('\nİlk 20 satır:'));
        blameData.slice(0, 20).forEach(b => {
            console.log(
                `${chalk.gray(b.line.toString().padStart(4))} ` +
                `${chalk.yellow(b.hash)} ` +
                `${chalk.cyan(b.author.slice(0, 10).padEnd(10))} ` +
                `${b.content.slice(0, 50)}`
            );
        });

        if (blameData.length > 20) {
            console.log(chalk.gray(`\n... ve ${blameData.length - 20} satır daha`));
        }
    } catch (error: any) {
        spinner.stop();
        if (error.message?.includes('no such path')) {
            displayError('Dosya bulunamadı');
        } else {
            displayError(`Blame hatası: ${error.message}`);
        }
    }

    await waitForEnter();
}

async function showReflog(): Promise<void> {
    const spinner = ora('Reflog yükleniyor...').start();

    try {
        const git = gitOps.getGit();
        const reflog = await git.raw(['reflog', '-n', '30', '--format=%h %gd %gs (%cr)']);
        spinner.stop();

        console.log(chalk.bold('\n📜 Reflog - Son 30 İşlem'));
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.gray('Reflog, tüm HEAD değişikliklerini gösterir.\n'));

        const lines = reflog.trim().split('\n');
        lines.forEach((line, i) => {
            const parts = line.match(/^([a-f0-9]+) (HEAD@\{\d+\}) (.+) \((.+)\)$/);
            if (parts) {
                const [, hash, ref, action, time] = parts;
                console.log(
                    `${chalk.yellow(hash)} ` +
                    `${chalk.gray(ref.padEnd(12))} ` +
                    `${action.slice(0, 40).padEnd(40)} ` +
                    `${chalk.cyan(time)}`
                );
            } else {
                console.log(line);
            }
        });

        console.log(chalk.gray('\n💡 İpucu: Kayıp commit\'e dönmek için: git checkout <hash>'));
    } catch (error) {
        spinner.stop();
        displayError(`Reflog hatası: ${error}`);
    }

    await waitForEnter();
}

async function waitForEnter(): Promise<void> {
    await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: chalk.gray('Devam etmek için Enter\'a basın...')
    }]);
}
