import ora from 'ora';
import { gitOps } from '../git/operations';
import { displayHeader, displaySuccess, displayError, displayWarning } from '../ui/display';
import { promptConfirmAction } from '../ui/prompts';

export async function pushToGithub(): Promise<void> {
    const projectName = gitOps.getProjectName();
    displayHeader(projectName);

    const spinner = ora('Durum kontrol ediliyor...').start();

    try {
        const status = await gitOps.getStatus();
        const remoteUrl = await gitOps.getRemoteUrl();

        spinner.stop();

        console.log(`\n📍 Remote: ${remoteUrl}`);
        console.log(`📊 Branch: ${status.branch}`);

        if (status.ahead === 0) {
            displayWarning('Push edilecek commit yok. Remote ile güncelsiniz.');
            return;
        }

        console.log(`\n⬆️ ${status.ahead} commit push edilecek`);

        if (status.behind > 0) {
            displayWarning(`Remote\'dan ${status.behind} commit gerideyiniz. Önce pull yapmayı düşünün.`);

            const shouldContinue = await promptConfirmAction('Yine de push\'a devam et?');
            if (!shouldContinue) {
                return;
            }
        }

        const confirm = await promptConfirmAction('GitHub\'a push\'la?');

        if (!confirm) {
            console.log('\nPush iptal edildi.');
            return;
        }

        const pushSpinner = ora(`origin/${status.branch} branch\'ına gönderiliyor...`).start();

        await gitOps.push();

        pushSpinner.succeed('GitHub\'a başarıyla gönderildi!');

    } catch (error) {
        displayError(`Push başarısız: ${error}`);
        process.exit(1);
    }
}
