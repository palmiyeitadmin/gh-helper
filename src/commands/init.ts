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
    { name: 'Custom URL', urlTemplate: '', sshTemplate: '' }
];

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
                console.log(`\n${chalk.green('✓')} Already a git repository with remote:`);
                remotes.forEach(r => {
                    console.log(`  ${chalk.cyan(r.name)}: ${r.refs.fetch}`);
                });

                const { action } = await inquirer.prompt([{
                    type: 'list',
                    name: 'action',
                    message: 'What would you like to do?',
                    choices: [
                        { name: '➕ Add another remote', value: 'add' },
                        { name: '✏️ Change existing remote', value: 'change' },
                        { name: '❌ Cancel', value: 'cancel' }
                    ]
                }]);

                if (action === 'cancel') return;
                if (action === 'change') {
                    await changeRemote(git);
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
        message: 'This is not a git repository. Initialize one?',
        default: true
    }]);

    if (!isRepo && !shouldInit) {
        console.log('\nOperation cancelled.');
        return;
    }

    if (!isRepo) {
        const spinner = ora('Initializing git repository...').start();
        await git.init();
        spinner.succeed('Git repository initialized');
    }

    // Select provider
    const { provider } = await inquirer.prompt([{
        type: 'list',
        name: 'provider',
        message: 'Select git provider:',
        choices: PROVIDERS.map(p => ({ name: p.name, value: p }))
    }]);

    let remoteUrl = '';

    if (provider.name === 'Custom URL') {
        const { customUrl } = await inquirer.prompt([{
            type: 'input',
            name: 'customUrl',
            message: 'Enter remote URL:',
            validate: (input: string) => input.length > 0 || 'URL cannot be empty'
        }]);
        remoteUrl = customUrl;
    } else if (provider.name === 'Azure DevOps') {
        const { org, project, repo } = await inquirer.prompt([
            { type: 'input', name: 'org', message: 'Organization name:', default: '' },
            { type: 'input', name: 'project', message: 'Project name:', default: '' },
            { type: 'input', name: 'repo', message: 'Repository name:', default: projectName }
        ]);
        remoteUrl = provider.urlTemplate.replace('{org}', org).replace('{project}', project).replace('{repo}', repo);
    } else {
        const { connectionType } = await inquirer.prompt([{
            type: 'list',
            name: 'connectionType',
            message: 'Connection type:',
            choices: [
                { name: 'HTTPS (recommended)', value: 'https' },
                { name: 'SSH', value: 'ssh' }
            ]
        }]);

        const { username, repoName } = await inquirer.prompt([
            { type: 'input', name: 'username', message: 'Username/Organization:', default: '' },
            { type: 'input', name: 'repoName', message: 'Repository name:', default: projectName }
        ]);

        const template = connectionType === 'ssh' ? provider.sshTemplate : provider.urlTemplate;
        remoteUrl = template.replace('{user}', username).replace('{repo}', repoName);
    }

    // Add remote
    const { remoteName } = await inquirer.prompt([{
        type: 'input',
        name: 'remoteName',
        message: 'Remote name:',
        default: 'origin'
    }]);

    const spinner = ora(`Adding remote '${remoteName}'...`).start();

    try {
        await git.addRemote(remoteName, remoteUrl);
        spinner.succeed(`Remote '${remoteName}' added: ${remoteUrl}`);

        // Offer to create initial commit if needed
        const status = await git.status();
        if (status.files.length > 0 && !status.staged.length) {
            const { createInitialCommit } = await inquirer.prompt([{
                type: 'confirm',
                name: 'createInitialCommit',
                message: 'Create initial commit with all files?',
                default: true
            }]);

            if (createInitialCommit) {
                await git.add('.');
                await git.commit('Initial commit');
                displaySuccess('Created initial commit');

                const { pushNow } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'pushNow',
                    message: 'Push to remote now?',
                    default: true
                }]);

                if (pushNow) {
                    const pushSpinner = ora('Pushing to remote...').start();
                    try {
                        await git.push(remoteName, 'main', ['--set-upstream']);
                        pushSpinner.succeed('Pushed to remote successfully!');
                    } catch (e) {
                        pushSpinner.fail(`Push failed. You may need to create the repository on ${provider.name} first.`);
                        console.log(`\n${chalk.yellow('Tip:')} Create the repository at ${provider.name}, then run:`);
                        console.log(chalk.cyan(`  git push -u ${remoteName} main`));
                    }
                }
            }
        }

        displaySuccess('Repository setup complete!');
        console.log(`\n${chalk.gray('Remote URL:')} ${chalk.cyan(remoteUrl)}`);

    } catch (error: any) {
        if (error.message?.includes('already exists')) {
            spinner.fail(`Remote '${remoteName}' already exists`);
            displayInfo(`Use 'gh init' again to change the remote`);
        } else {
            spinner.fail(`Failed to add remote: ${error.message}`);
        }
    }
}

async function changeRemote(git: ReturnType<typeof simpleGit>): Promise<void> {
    const remotes = await git.getRemotes(true);

    const { remoteToChange } = await inquirer.prompt([{
        type: 'list',
        name: 'remoteToChange',
        message: 'Select remote to change:',
        choices: remotes.map(r => ({ name: `${r.name} (${r.refs.fetch})`, value: r.name }))
    }]);

    const { newUrl } = await inquirer.prompt([{
        type: 'input',
        name: 'newUrl',
        message: 'Enter new URL:',
        validate: (input: string) => input.length > 0 || 'URL cannot be empty'
    }]);

    await git.remote(['set-url', remoteToChange, newUrl]);
    displaySuccess(`Remote '${remoteToChange}' updated to: ${newUrl}`);
}

export async function cloneRepository(): Promise<void> {
    displayHeader('Clone Repository');

    const { repoUrl } = await inquirer.prompt([{
        type: 'input',
        name: 'repoUrl',
        message: 'Enter repository URL:',
        validate: (input: string) => input.length > 0 || 'URL cannot be empty'
    }]);

    // Extract repo name from URL
    const defaultName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';

    const { folderName } = await inquirer.prompt([{
        type: 'input',
        name: 'folderName',
        message: 'Folder name:',
        default: defaultName
    }]);

    const targetPath = path.join(process.cwd(), folderName);

    if (fs.existsSync(targetPath)) {
        displayError(`Folder '${folderName}' already exists`);
        return;
    }

    const spinner = ora('Cloning repository...').start();

    try {
        const git = simpleGit();
        await git.clone(repoUrl, targetPath);
        spinner.succeed(`Repository cloned to '${folderName}'`);
        console.log(`\n${chalk.gray('cd')} ${chalk.cyan(folderName)}`);
    } catch (error: any) {
        spinner.fail(`Clone failed: ${error.message}`);
    }
}
