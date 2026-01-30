import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import simpleGit from 'simple-git';
import { displayHeader, displaySuccess, displayError, displayWarning, displayInfo } from '../ui/display';
import path from 'path';
import fs from 'fs';

interface RepoProvider {
    name: string;
    urlTemplate: string;
    sshTemplate: string;
}

const PROVIDERS: RepoProvider[] = [
    { name: 'GitHub', urlTemplate: 'https://github.com/{user}/{repo}.git', sshTemplate: 'git@github.com:{user}/{repo}.git' },
    { name: 'GitLab', urlTemplate: 'https://gitlab.com/{user}/{repo}.git', sshTemplate: 'git@gitlab.com:{user}/{repo}.git' },
    { name: 'Bitbucket', urlTemplate: 'https://bitbucket.org/{user}/{repo}.git', sshTemplate: 'git@bitbucket.org:{user}/{repo}.git' },
    { name: 'Azure DevOps', urlTemplate: 'https://dev.azure.com/{org}/{project}/_git/{repo}', sshTemplate: '' },
    { name: 'Özel URL', urlTemplate: '', sshTemplate: '' }
];

// Helper function to check if input is a full URL
function isFullUrl(input: string): boolean {
    return input.startsWith('http://') || input.startsWith('https://') || input.startsWith('git@');
}

// Helper function to extract username and repo from URL
function parseGitUrl(url: string): { username: string; repoName: string } | null {
    // HTTPS format: https://github.com/user/repo.git
    const httpsMatch = url.match(/https?:\/\/[^\/]+\/([^\/]+)\/([^\/\.]+)/);
    if (httpsMatch) {
        return { username: httpsMatch[1], repoName: httpsMatch[2] };
    }

    // SSH format: git@github.com:user/repo.git
    const sshMatch = url.match(/git@[^:]+:([^\/]+)\/([^\/\.]+)/);
    if (sshMatch) {
        return { username: sshMatch[1], repoName: sshMatch[2] };
    }

    return null;
}

export async function initRepository(): Promise<void> {
    const projectName = path.basename(process.cwd());
    displayHeader(projectName);

    const git = simpleGit(process.cwd());

    // Check if already a git repo
    const isRepo = await git.checkIsRepo();

    if (isRepo) {
        try {
            const remotes = await git.getRemotes(true);
            if (remotes.length > 0) {
                console.log(`\n${chalk.green('✓')} Zaten bir git repository ve remote mevcut:`);
                remotes.forEach(r => {
                    console.log(`  ${chalk.cyan(r.name)}: ${r.refs.fetch}`);
                });

                const { action } = await inquirer.prompt([{
                    type: 'list',
                    name: 'action',
                    message: 'Ne yapmak istersiniz?',
                    choices: [
                        { name: '➕ Başka bir remote ekle', value: 'add' },
                        { name: '✏️ Mevcut remote\'u değiştir', value: 'change' },
                        { name: '🗑️ Remote sil', value: 'delete' },
                        { name: '❌ İptal', value: 'cancel' }
                    ]
                }]);

                if (action === 'cancel') return;
                if (action === 'change') {
                    await changeRemote(git);
                    return;
                }
                if (action === 'delete') {
                    await deleteRemote(git);
                    return;
                }
            }
        } catch (e) {
            // No remotes, continue
        }
    }

    // Not a repo yet, or adding remote
    const { shouldInit } = isRepo ? { shouldInit: false } : await inquirer.prompt([{
        type: 'confirm',
        name: 'shouldInit',
        message: 'Bu bir git repository değil. Başlatılsın mı?',
        default: true
    }]);

    if (!isRepo && !shouldInit) {
        console.log('\nİşlem iptal edildi.');
        return;
    }

    if (!isRepo) {
        const spinner = ora('Git repository başlatılıyor...').start();
        await git.init();
        spinner.succeed('Git repository başlatıldı');
    }

    // Select provider
    const { provider } = await inquirer.prompt([{
        type: 'list',
        name: 'provider',
        message: 'Git sağlayıcısını seçin:',
        choices: PROVIDERS.map(p => ({ name: p.name, value: p }))
    }]);

    let remoteUrl = '';

    if (provider.name === 'Özel URL') {
        const { customUrl } = await inquirer.prompt([{
            type: 'input',
            name: 'customUrl',
            message: 'Remote URL girin:',
            validate: (input: string) => input.length > 0 || 'URL boş olamaz'
        }]);
        remoteUrl = customUrl;
    } else if (provider.name === 'Azure DevOps') {
        const { org, project, repo } = await inquirer.prompt([
            { type: 'input', name: 'org', message: 'Organizasyon adı:', default: '' },
            { type: 'input', name: 'project', message: 'Proje adı:', default: '' },
            { type: 'input', name: 'repo', message: 'Repository adı:', default: projectName }
        ]);
        remoteUrl = provider.urlTemplate.replace('{org}', org).replace('{project}', project).replace('{repo}', repo);
    } else {
        const { connectionType } = await inquirer.prompt([{
            type: 'list',
            name: 'connectionType',
            message: 'Bağlantı türü:',
            choices: [
                { name: 'HTTPS (önerilen)', value: 'https' },
                { name: 'SSH', value: 'ssh' }
            ]
        }]);

        const { username } = await inquirer.prompt([{
            type: 'input',
            name: 'username',
            message: 'Kullanıcı adı/Organizasyon (veya tam URL):',
            validate: (input: string) => input.length > 0 || 'Bu alan boş olamaz'
        }]);

        // Check if user entered a full URL
        if (isFullUrl(username)) {
            remoteUrl = username;
            console.log(chalk.gray(`  Tam URL algılandı: ${remoteUrl}`));
        } else {
            const { repoName } = await inquirer.prompt([{
                type: 'input',
                name: 'repoName',
                message: 'Repository adı:',
                default: projectName
            }]);

            const template = connectionType === 'ssh' ? provider.sshTemplate : provider.urlTemplate;
            remoteUrl = template.replace('{user}', username).replace('{repo}', repoName);
        }
    }

    // Add remote
    const { remoteName } = await inquirer.prompt([{
        type: 'input',
        name: 'remoteName',
        message: 'Remote adı:',
        default: 'origin'
    }]);

    const spinner = ora(`'${remoteName}' remote ekleniyor...`).start();

    try {
        // Check if remote already exists
        const remotes = await git.getRemotes();
        if (remotes.some(r => r.name === remoteName)) {
            spinner.stop();
            const { overwrite } = await inquirer.prompt([{
                type: 'confirm',
                name: 'overwrite',
                message: `'${remoteName}' zaten mevcut. Üzerine yazılsın mı?`,
                default: true
            }]);

            if (overwrite) {
                await git.remote(['set-url', remoteName, remoteUrl]);
                displaySuccess(`Remote '${remoteName}' güncellendi: ${remoteUrl}`);
            } else {
                console.log('İşlem iptal edildi.');
                return;
            }
        } else {
            await git.addRemote(remoteName, remoteUrl);
            spinner.succeed(`Remote '${remoteName}' eklendi: ${remoteUrl}`);
        }

        // Offer to create initial commit if needed
        const status = await git.status();
        if (status.files.length > 0 && !status.staged.length) {
            const { createInitialCommit } = await inquirer.prompt([{
                type: 'confirm',
                name: 'createInitialCommit',
                message: 'Tüm dosyalarla initial commit oluşturulsun mu?',
                default: true
            }]);

            if (createInitialCommit) {
                await git.add('.');
                await git.commit('Initial commit');
                displaySuccess('Initial commit oluşturuldu');

                const { pushNow } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'pushNow',
                    message: 'Şimdi push yapılsın mı?',
                    default: true
                }]);

                if (pushNow) {
                    const pushSpinner = ora('Push yapılıyor...').start();
                    try {
                        // Try main first, then master
                        try {
                            await git.push(remoteName, 'main', ['--set-upstream']);
                        } catch {
                            await git.push(remoteName, 'master', ['--set-upstream']);
                        }
                        pushSpinner.succeed('Push başarılı!');
                    } catch (e) {
                        pushSpinner.fail(`Push başarısız. Önce ${provider.name}'da repository oluşturmanız gerekebilir.`);
                        console.log(`\n${chalk.yellow('İpucu:')} ${provider.name}'da repository oluşturduktan sonra şunu çalıştırın:`);
                        console.log(chalk.cyan(`  git push -u ${remoteName} main`));
                    }
                }
            }
        }

        displaySuccess('Repository kurulumu tamamlandı!');
        console.log(`\n${chalk.gray('Remote URL:')} ${chalk.cyan(remoteUrl)}`);

    } catch (error: any) {
        spinner.fail(`Remote eklenemedi: ${error.message}`);
    }
}

async function changeRemote(git: ReturnType<typeof simpleGit>): Promise<void> {
    const remotes = await git.getRemotes(true);

    const { remoteToChange } = await inquirer.prompt([{
        type: 'list',
        name: 'remoteToChange',
        message: 'Değiştirilecek remote\'u seçin:',
        choices: remotes.map(r => ({ name: `${r.name} (${r.refs.fetch})`, value: r.name }))
    }]);

    const { inputType } = await inquirer.prompt([{
        type: 'list',
        name: 'inputType',
        message: 'Nasıl girmek istersiniz?',
        choices: [
            { name: '🔗 Tam URL gir', value: 'full' },
            { name: '📝 Sağlayıcı seçerek oluştur', value: 'provider' }
        ]
    }]);

    let newUrl = '';

    if (inputType === 'full') {
        const { url } = await inquirer.prompt([{
            type: 'input',
            name: 'url',
            message: 'Yeni URL:',
            validate: (input: string) => {
                if (!input.length) return 'URL boş olamaz';
                if (!isFullUrl(input)) return 'Geçerli bir git URL girin (https:// veya git@ ile başlamalı)';
                return true;
            }
        }]);
        newUrl = url;
    } else {
        const { provider } = await inquirer.prompt([{
            type: 'list',
            name: 'provider',
            message: 'Git sağlayıcısını seçin:',
            choices: PROVIDERS.filter(p => p.name !== 'Özel URL').map(p => ({ name: p.name, value: p }))
        }]);

        const { connectionType } = await inquirer.prompt([{
            type: 'list',
            name: 'connectionType',
            message: 'Bağlantı türü:',
            choices: [
                { name: 'HTTPS (önerilen)', value: 'https' },
                { name: 'SSH', value: 'ssh' }
            ]
        }]);

        const { username, repoName } = await inquirer.prompt([
            { type: 'input', name: 'username', message: 'Kullanıcı adı/Organizasyon:', validate: (i: string) => i.length > 0 || 'Boş olamaz' },
            { type: 'input', name: 'repoName', message: 'Repository adı:', validate: (i: string) => i.length > 0 || 'Boş olamaz' }
        ]);

        const template = connectionType === 'ssh' ? provider.sshTemplate : provider.urlTemplate;
        newUrl = template.replace('{user}', username).replace('{repo}', repoName);
    }

    const spinner = ora('Remote güncelleniyor...').start();
    try {
        await git.remote(['set-url', remoteToChange, newUrl]);
        spinner.succeed(`Remote '${remoteToChange}' güncellendi: ${newUrl}`);
    } catch (error: any) {
        spinner.fail(`Güncelleme başarısız: ${error.message}`);
    }
}

async function deleteRemote(git: ReturnType<typeof simpleGit>): Promise<void> {
    const remotes = await git.getRemotes(true);

    const { remoteToDelete } = await inquirer.prompt([{
        type: 'list',
        name: 'remoteToDelete',
        message: 'Silinecek remote\'u seçin:',
        choices: remotes.map(r => ({ name: `${r.name} (${r.refs.fetch})`, value: r.name }))
    }]);

    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `'${remoteToDelete}' remote'unu silmek istediğinizden emin misiniz?`,
        default: false
    }]);

    if (!confirm) {
        console.log('İşlem iptal edildi.');
        return;
    }

    const spinner = ora('Remote siliniyor...').start();
    try {
        await git.remote(['remove', remoteToDelete]);
        spinner.succeed(`Remote '${remoteToDelete}' silindi`);
    } catch (error: any) {
        spinner.fail(`Silme başarısız: ${error.message}`);
    }
}

export async function cloneRepository(): Promise<void> {
    displayHeader('Repository Klonla');

    const { repoUrl } = await inquirer.prompt([{
        type: 'input',
        name: 'repoUrl',
        message: 'Repository URL girin:',
        validate: (input: string) => input.length > 0 || 'URL boş olamaz'
    }]);

    // Extract repo name from URL
    const defaultName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';

    const { folderName } = await inquirer.prompt([{
        type: 'input',
        name: 'folderName',
        message: 'Klasör adı:',
        default: defaultName
    }]);

    const targetPath = path.join(process.cwd(), folderName);

    if (fs.existsSync(targetPath)) {
        displayError(`'${folderName}' klasörü zaten mevcut`);
        return;
    }

    const spinner = ora('Repository klonlanıyor...').start();

    try {
        const git = simpleGit();
        await git.clone(repoUrl, targetPath);
        spinner.succeed(`Repository '${folderName}' klasörüne klonlandı`);
        console.log(`\n${chalk.gray('cd')} ${chalk.cyan(folderName)}`);
    } catch (error: any) {
        spinner.fail(`Klonlama başarısız: ${error.message}`);
    }
}
