import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { displayHeader, displaySuccess, displayError, displayWarning, displayInfo } from '../ui/display';
import { gitOps } from '../git/operations';

interface CommitStats {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    byAuthor: Map<string, number>;
}

interface ContributorInfo {
    name: string;
    email: string;
    commits: number;
    firstCommit: string;
    lastCommit: string;
}

// Dashboard'dan çağrılan menü
export async function manageAnalyticsMenu(): Promise<void> {
    let running = true;
    while (running) {
        const shouldContinue = await showAnalyticsMenuWithReturn();
        if (!shouldContinue) {
            running = false;
        }
    }
}

async function showAnalyticsMenuWithReturn(): Promise<boolean> {
    console.log(`\n📊 Analiz & Raporlama`);
    console.log(chalk.gray('─'.repeat(40)));

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Ne yapmak istersiniz?',
        choices: [
            { name: '⬅️  Ana menüye dön', value: 'back' },
            new inquirer.Separator(),
            { name: '📈  Commit istatistikleri', value: 'commit-stats' },
            { name: '👥  Contributor özeti', value: 'contributors' },
            { name: '⚖️  Branch karşılaştırma', value: 'branch-compare' },
            { name: '📅  Aktivite grafiği', value: 'activity' },
            { name: '📄  Dosya geçmişi', value: 'file-history' },
            { name: '📊  Kod satırı sayımı', value: 'code-stats' }
        ],
        loop: false
    }]);

    if (action === 'back') {
        return false;
    }

    switch (action) {
        case 'commit-stats':
            await showCommitStats();
            break;
        case 'contributors':
            await showContributors();
            break;
        case 'branch-compare':
            await compareBranches();
            break;
        case 'activity':
            await showActivityGraph();
            break;
        case 'file-history':
            await showFileHistory();
            break;
        case 'code-stats':
            await showCodeStats();
            break;
    }
    return true;
}

async function showCommitStats(): Promise<void> {
    const spinner = ora('Commit istatistikleri hesaplanıyor...').start();

    try {
        const git = gitOps.getGit();

        // Tüm commitler
        const allLogs = await git.log(['--all', '--oneline']);
        const totalCommits = allLogs.all.length;

        // Bugün
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = await git.log(['--since=' + today]);
        const todayCommits = todayLogs.all.length;

        // Bu hafta
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const weekLogs = await git.log(['--since=' + weekAgo]);
        const weekCommits = weekLogs.all.length;

        // Bu ay
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthLogs = await git.log(['--since=' + monthStart.toISOString().split('T')[0]]);
        const monthCommits = monthLogs.all.length;

        // Author grupla
        const authorMap = new Map<string, number>();
        for (const commit of allLogs.all) {
            const author = (commit as any).author_name || 'Unknown';
            authorMap.set(author, (authorMap.get(author) || 0) + 1);
        }

        spinner.stop();

        // Sonuçları göster
        console.log(chalk.bold('\n📈 Commit İstatistikleri'));
        console.log(chalk.gray('─'.repeat(40)));

        console.log(`\n  ${chalk.cyan('Toplam commit:')} ${totalCommits}`);
        console.log(`  ${chalk.cyan('Bugün:')} ${todayCommits}`);
        console.log(`  ${chalk.cyan('Bu hafta:')} ${weekCommits}`);
        console.log(`  ${chalk.cyan('Bu ay:')} ${monthCommits}`);

        if (authorMap.size > 0) {
            console.log(chalk.bold('\n  Katkıda bulunanlar:'));
            const sorted = [...authorMap.entries()].sort((a, b) => b[1] - a[1]);
            sorted.slice(0, 5).forEach(([author, count], i) => {
                const bar = '█'.repeat(Math.min(20, Math.round((count / totalCommits) * 20)));
                const percent = ((count / totalCommits) * 100).toFixed(1);
                console.log(`  ${i + 1}. ${author.padEnd(20)} ${chalk.green(bar)} ${count} (${percent}%)`);
            });
        }
        console.log();
    } catch (error) {
        spinner.stop();
        displayError(`İstatistik hatası: ${error}`);
    }

    await waitForEnter();
}

async function showContributors(): Promise<void> {
    const spinner = ora('Contributor bilgileri yükleniyor...').start();

    try {
        const git = gitOps.getGit();
        const logs = await git.log(['--all']);

        const contributors = new Map<string, ContributorInfo>();

        for (const commit of logs.all) {
            const name = commit.author_name;
            const email = commit.author_email;
            const date = commit.date;

            if (!contributors.has(email)) {
                contributors.set(email, {
                    name,
                    email,
                    commits: 0,
                    firstCommit: date,
                    lastCommit: date
                });
            }

            const info = contributors.get(email)!;
            info.commits++;
            if (new Date(date) < new Date(info.firstCommit)) {
                info.firstCommit = date;
            }
            if (new Date(date) > new Date(info.lastCommit)) {
                info.lastCommit = date;
            }
        }

        spinner.stop();

        console.log(chalk.bold('\n👥 Contributor Özeti'));
        console.log(chalk.gray('─'.repeat(60)));

        const sorted = [...contributors.values()].sort((a, b) => b.commits - a.commits);

        console.log(`\n  Toplam ${chalk.cyan(sorted.length)} contributor\n`);

        sorted.forEach((c, i) => {
            const firstDate = new Date(c.firstCommit).toLocaleDateString('tr-TR');
            const lastDate = new Date(c.lastCommit).toLocaleDateString('tr-TR');
            console.log(`  ${chalk.yellow((i + 1) + '.')} ${chalk.bold(c.name)}`);
            console.log(`     📧 ${chalk.gray(c.email)}`);
            console.log(`     📊 ${c.commits} commit | 📅 ${firstDate} - ${lastDate}`);
            console.log();
        });
    } catch (error) {
        spinner.stop();
        displayError(`Contributor hatası: ${error}`);
    }

    await waitForEnter();
}

async function compareBranches(): Promise<void> {
    try {
        const branches = await gitOps.getBranches();

        if (branches.length < 2) {
            displayWarning('Karşılaştırma için en az 2 branch gerekli');
            await waitForEnter();
            return;
        }

        const branchChoices = branches.map(b => ({
            name: b.current ? `${b.name} (mevcut)` : b.name,
            value: b.name
        }));

        const { base, compare } = await inquirer.prompt([
            {
                type: 'list',
                name: 'base',
                message: 'Temel branch seçin:',
                choices: branchChoices
            },
            {
                type: 'list',
                name: 'compare',
                message: 'Karşılaştırılacak branch seçin:',
                choices: branchChoices
            }
        ]);

        if (base === compare) {
            displayWarning('Aynı branch seçilemez');
            await waitForEnter();
            return;
        }

        const spinner = ora('Branch\'lar karşılaştırılıyor...').start();

        const git = gitOps.getGit();

        // Ahead/behind hesapla
        const revList = await git.raw(['rev-list', '--left-right', '--count', `${base}...${compare}`]);
        const [behind, ahead] = revList.trim().split(/\s+/).map(Number);

        // Farklı dosyalar
        const diffFiles = await git.diff(['--name-status', base, compare]);
        const files = diffFiles.split('\n').filter(Boolean);

        spinner.stop();

        console.log(chalk.bold(`\n⚖️ Branch Karşılaştırma: ${chalk.cyan(base)} ↔ ${chalk.cyan(compare)}`));
        console.log(chalk.gray('─'.repeat(50)));

        console.log(`\n  ${chalk.green('+')} ${compare} ${chalk.green(ahead + ' commit önde')}`);
        console.log(`  ${chalk.red('-')} ${compare} ${chalk.red(behind + ' commit geride')}`);

        if (files.length > 0) {
            console.log(chalk.bold('\n  Değişen dosyalar:'));

            const added = files.filter(f => f.startsWith('A')).length;
            const modified = files.filter(f => f.startsWith('M')).length;
            const deleted = files.filter(f => f.startsWith('D')).length;

            console.log(`    ${chalk.green(`+ ${added} eklendi`)} | ${chalk.yellow(`~ ${modified} değişti`)} | ${chalk.red(`- ${deleted} silindi`)}\n`);

            files.slice(0, 15).forEach(f => {
                const [status, file] = f.split('\t');
                const icon = status === 'A' ? chalk.green('+') : status === 'D' ? chalk.red('-') : chalk.yellow('~');
                console.log(`    ${icon} ${file}`);
            });

            if (files.length > 15) {
                console.log(chalk.gray(`    ... ve ${files.length - 15} dosya daha`));
            }
        }
        console.log();
    } catch (error) {
        displayError(`Karşılaştırma hatası: ${error}`);
    }

    await waitForEnter();
}

async function showActivityGraph(): Promise<void> {
    const spinner = ora('Aktivite grafiği oluşturuluyor...').start();

    try {
        const git = gitOps.getGit();

        // Son 14 gün
        const days: { date: string; count: number }[] = [];
        for (let i = 13; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            try {
                const logs = await git.log(['--since=' + dateStr, '--until=' + nextDate]);
                days.push({ date: dateStr, count: logs.all.length });
            } catch {
                days.push({ date: dateStr, count: 0 });
            }
        }

        spinner.stop();

        const maxCount = Math.max(...days.map(d => d.count), 1);

        console.log(chalk.bold('\n📅 Son 14 Gün Aktivite'));
        console.log(chalk.gray('─'.repeat(50)));

        days.forEach(({ date, count }) => {
            const dayName = new Date(date).toLocaleDateString('tr-TR', { weekday: 'short' });
            const dateShort = date.slice(5); // MM-DD
            const barLength = Math.round((count / maxCount) * 30);
            const bar = '█'.repeat(barLength) + chalk.gray('░'.repeat(30 - barLength));
            console.log(`  ${dayName} ${dateShort} ${bar} ${count}`);
        });

        const total = days.reduce((sum, d) => sum + d.count, 0);
        console.log(chalk.gray(`\n  Toplam: ${total} commit | Ortalama: ${(total / 14).toFixed(1)} commit/gün`));
        console.log();
    } catch (error) {
        spinner.stop();
        displayError(`Aktivite hatası: ${error}`);
    }

    await waitForEnter();
}

async function showFileHistory(): Promise<void> {
    const { filePath } = await inquirer.prompt([{
        type: 'input',
        name: 'filePath',
        message: 'Dosya yolu:',
        validate: (input: string) => input.trim().length > 0 || 'Dosya yolu gerekli'
    }]);

    const spinner = ora('Dosya geçmişi yükleniyor...').start();

    try {
        const git = gitOps.getGit();
        const logs = await git.log(['--follow', '--', filePath]);

        spinner.stop();

        if (logs.all.length === 0) {
            displayWarning('Bu dosya için commit bulunamadı');
            await waitForEnter();
            return;
        }

        console.log(chalk.bold(`\n📄 Dosya Geçmişi: ${filePath}`));
        console.log(chalk.gray('─'.repeat(60)));
        console.log(`\n  Toplam ${chalk.cyan(logs.all.length)} commit\n`);

        logs.all.slice(0, 20).forEach((commit, i) => {
            const date = new Date(commit.date).toLocaleDateString('tr-TR');
            console.log(
                `  ${chalk.yellow(commit.hash.slice(0, 7))} ` +
                `${chalk.gray(date)} ` +
                `${chalk.cyan(commit.author_name.slice(0, 15).padEnd(15))} ` +
                `${commit.message.slice(0, 40)}`
            );
        });

        if (logs.all.length > 20) {
            console.log(chalk.gray(`\n  ... ve ${logs.all.length - 20} commit daha`));
        }
        console.log();
    } catch (error: any) {
        spinner.stop();
        if (error.message?.includes('does not have any commits')) {
            displayError('Dosya bulunamadı veya commit yok');
        } else {
            displayError(`Dosya geçmişi hatası: ${error.message}`);
        }
    }

    await waitForEnter();
}

async function showCodeStats(): Promise<void> {
    const spinner = ora('Kod istatistikleri hesaplanıyor...').start();

    try {
        const git = gitOps.getGit();

        // Git tarafından izlenen dosyalar
        const files = await git.raw(['ls-files']);
        const fileList = files.trim().split('\n').filter(Boolean);

        // Uzantılara göre grupla
        const extStats = new Map<string, { count: number; lines: number }>();
        let totalLines = 0;
        let totalFiles = 0;

        const fs = await import('fs');
        const path = await import('path');

        for (const file of fileList) {
            const ext = path.extname(file) || 'no-ext';
            const filePath = path.join(process.cwd(), file);

            try {
                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const lines = content.split('\n').length;

                    if (!extStats.has(ext)) {
                        extStats.set(ext, { count: 0, lines: 0 });
                    }

                    const stats = extStats.get(ext)!;
                    stats.count++;
                    stats.lines += lines;
                    totalLines += lines;
                    totalFiles++;
                }
            } catch {
                // Binary dosyaları atla
            }
        }

        spinner.stop();

        console.log(chalk.bold('\n📊 Kod İstatistikleri'));
        console.log(chalk.gray('─'.repeat(50)));

        console.log(`\n  ${chalk.cyan('Toplam dosya:')} ${totalFiles}`);
        console.log(`  ${chalk.cyan('Toplam satır:')} ${totalLines.toLocaleString()}`);

        console.log(chalk.bold('\n  Uzantılara göre:'));

        const sorted = [...extStats.entries()]
            .sort((a, b) => b[1].lines - a[1].lines)
            .slice(0, 15);

        sorted.forEach(([ext, stats]) => {
            const percent = ((stats.lines / totalLines) * 100).toFixed(1);
            const bar = '█'.repeat(Math.min(20, Math.round((stats.lines / totalLines) * 20)));
            console.log(
                `  ${ext.padEnd(12)} ` +
                `${chalk.green(bar)} ` +
                `${stats.lines.toLocaleString().padStart(8)} satır ` +
                `(${stats.count} dosya, ${percent}%)`
            );
        });

        if (extStats.size > 15) {
            console.log(chalk.gray(`\n  ... ve ${extStats.size - 15} uzantı daha`));
        }
        console.log();
    } catch (error) {
        spinner.stop();
        displayError(`Kod istatistikleri hatası: ${error}`);
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
