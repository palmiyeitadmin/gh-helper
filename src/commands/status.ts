import ora from 'ora';
import { gitOps } from '../git/operations';
import { displayHeader, displayStatus, displayStagedFiles, displayDiff } from '../ui/display';

export async function showStatus(): Promise<void> {
    const projectName = gitOps.getProjectName();
    displayHeader(projectName);

    const spinner = ora('Durum yükleniyor...').start();

    try {
        const status = await gitOps.getStatus();
        const remoteUrl = await gitOps.getRemoteUrl();

        spinner.stop();

        console.log(`\n📍 Remote: ${remoteUrl}`);
        displayStatus(status);
        displayStagedFiles(status.staged);

        if (status.staged.length > 0) {
            const diff = await gitOps.getStagedDiff();
            displayDiff(diff);
        }
    } catch (error) {
        spinner.fail(`Durum alınamadı: ${error}`);
        process.exit(1);
    }
}
