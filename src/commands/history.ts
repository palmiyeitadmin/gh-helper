import ora from 'ora';
import chalk from 'chalk';
import { gitOps } from '../git/operations';
import { displayHeader, displayRecentCommits } from '../ui/display';

export async function showHistory(count: number = 10): Promise<void> {
    const projectName = gitOps.getProjectName();
    displayHeader(projectName);

    const spinner = ora('Commit geçmişi yükleniyor...').start();

    try {
        const commits = await gitOps.getRecentCommits(count);
        const status = await gitOps.getStatus();

        spinner.stop();

        console.log(`\n📊 Branch: ${chalk.cyan(status.branch)}`);

        if (status.ahead > 0) {
            console.log(`   ${chalk.yellow('↑')} Remote\'dan ${status.ahead} commit önde`);
        }
        if (status.behind > 0) {
            console.log(`   ${chalk.red('↓')} Remote\'dan ${status.behind} commit geride`);
        }

        displayRecentCommits(commits);

        console.log(`\n${chalk.gray(`Son ${commits.length} commit gösteriliyor`)}\n`);

    } catch (error) {
        spinner.fail(`Geçmiş yüklenemedi: ${error}`);
        process.exit(1);
    }
}
