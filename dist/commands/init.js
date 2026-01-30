"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRepository = initRepository;
exports.cloneRepository = cloneRepository;
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const simple_git_1 = __importDefault(require("simple-git"));
const display_1 = require("../ui/display");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const PROVIDERS = [
    { name: 'GitHub', urlTemplate: 'https://github.com/{user}/{repo}.git', sshTemplate: 'git@github.com:{user}/{repo}.git' },
    { name: 'GitLab', urlTemplate: 'https://gitlab.com/{user}/{repo}.git', sshTemplate: 'git@gitlab.com:{user}/{repo}.git' },
    { name: 'Bitbucket', urlTemplate: 'https://bitbucket.org/{user}/{repo}.git', sshTemplate: 'git@bitbucket.org:{user}/{repo}.git' },
    { name: 'Azure DevOps', urlTemplate: 'https://dev.azure.com/{org}/{project}/_git/{repo}', sshTemplate: '' },
    { name: 'Custom URL', urlTemplate: '', sshTemplate: '' }
];
async function initRepository() {
    const projectName = path_1.default.basename(process.cwd());
    (0, display_1.displayHeader)(projectName);
    const git = (0, simple_git_1.default)(process.cwd());
    // Check if already a git repo
    const isRepo = await git.checkIsRepo();
    if (isRepo) {
        try {
            const remotes = await git.getRemotes(true);
            if (remotes.length > 0) {
                console.log(`\n${chalk_1.default.green('✓')} Already a git repository with remote:`);
                remotes.forEach(r => {
                    console.log(`  ${chalk_1.default.cyan(r.name)}: ${r.refs.fetch}`);
                });
                const { action } = await inquirer_1.default.prompt([{
                        type: 'list',
                        name: 'action',
                        message: 'What would you like to do?',
                        choices: [
                            { name: '➕ Add another remote', value: 'add' },
                            { name: '✏️ Change existing remote', value: 'change' },
                            { name: '❌ Cancel', value: 'cancel' }
                        ]
                    }]);
                if (action === 'cancel')
                    return;
                if (action === 'change') {
                    await changeRemote(git);
                    return;
                }
            }
        }
        catch (e) {
            // No remotes, continue
        }
    }
    // Not a repo yet, or adding remote
    const { shouldInit } = isRepo ? { shouldInit: false } : await inquirer_1.default.prompt([{
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
        const spinner = (0, ora_1.default)('Initializing git repository...').start();
        await git.init();
        spinner.succeed('Git repository initialized');
    }
    // Select provider
    const { provider } = await inquirer_1.default.prompt([{
            type: 'list',
            name: 'provider',
            message: 'Select git provider:',
            choices: PROVIDERS.map(p => ({ name: p.name, value: p }))
        }]);
    let remoteUrl = '';
    if (provider.name === 'Custom URL') {
        const { customUrl } = await inquirer_1.default.prompt([{
                type: 'input',
                name: 'customUrl',
                message: 'Enter remote URL:',
                validate: (input) => input.length > 0 || 'URL cannot be empty'
            }]);
        remoteUrl = customUrl;
    }
    else if (provider.name === 'Azure DevOps') {
        const { org, project, repo } = await inquirer_1.default.prompt([
            { type: 'input', name: 'org', message: 'Organization name:', default: '' },
            { type: 'input', name: 'project', message: 'Project name:', default: '' },
            { type: 'input', name: 'repo', message: 'Repository name:', default: projectName }
        ]);
        remoteUrl = provider.urlTemplate.replace('{org}', org).replace('{project}', project).replace('{repo}', repo);
    }
    else {
        const { connectionType } = await inquirer_1.default.prompt([{
                type: 'list',
                name: 'connectionType',
                message: 'Connection type:',
                choices: [
                    { name: 'HTTPS (recommended)', value: 'https' },
                    { name: 'SSH', value: 'ssh' }
                ]
            }]);
        const { username, repoName } = await inquirer_1.default.prompt([
            { type: 'input', name: 'username', message: 'Username/Organization:', default: '' },
            { type: 'input', name: 'repoName', message: 'Repository name:', default: projectName }
        ]);
        const template = connectionType === 'ssh' ? provider.sshTemplate : provider.urlTemplate;
        remoteUrl = template.replace('{user}', username).replace('{repo}', repoName);
    }
    // Add remote
    const { remoteName } = await inquirer_1.default.prompt([{
            type: 'input',
            name: 'remoteName',
            message: 'Remote name:',
            default: 'origin'
        }]);
    const spinner = (0, ora_1.default)(`Adding remote '${remoteName}'...`).start();
    try {
        await git.addRemote(remoteName, remoteUrl);
        spinner.succeed(`Remote '${remoteName}' added: ${remoteUrl}`);
        // Offer to create initial commit if needed
        const status = await git.status();
        if (status.files.length > 0 && !status.staged.length) {
            const { createInitialCommit } = await inquirer_1.default.prompt([{
                    type: 'confirm',
                    name: 'createInitialCommit',
                    message: 'Create initial commit with all files?',
                    default: true
                }]);
            if (createInitialCommit) {
                await git.add('.');
                await git.commit('Initial commit');
                (0, display_1.displaySuccess)('Created initial commit');
                const { pushNow } = await inquirer_1.default.prompt([{
                        type: 'confirm',
                        name: 'pushNow',
                        message: 'Push to remote now?',
                        default: true
                    }]);
                if (pushNow) {
                    const pushSpinner = (0, ora_1.default)('Pushing to remote...').start();
                    try {
                        await git.push(remoteName, 'main', ['--set-upstream']);
                        pushSpinner.succeed('Pushed to remote successfully!');
                    }
                    catch (e) {
                        pushSpinner.fail(`Push failed. You may need to create the repository on ${provider.name} first.`);
                        console.log(`\n${chalk_1.default.yellow('Tip:')} Create the repository at ${provider.name}, then run:`);
                        console.log(chalk_1.default.cyan(`  git push -u ${remoteName} main`));
                    }
                }
            }
        }
        (0, display_1.displaySuccess)('Repository setup complete!');
        console.log(`\n${chalk_1.default.gray('Remote URL:')} ${chalk_1.default.cyan(remoteUrl)}`);
    }
    catch (error) {
        if (error.message?.includes('already exists')) {
            spinner.fail(`Remote '${remoteName}' already exists`);
            (0, display_1.displayInfo)(`Use 'gh init' again to change the remote`);
        }
        else {
            spinner.fail(`Failed to add remote: ${error.message}`);
        }
    }
}
async function changeRemote(git) {
    const remotes = await git.getRemotes(true);
    const { remoteToChange } = await inquirer_1.default.prompt([{
            type: 'list',
            name: 'remoteToChange',
            message: 'Select remote to change:',
            choices: remotes.map(r => ({ name: `${r.name} (${r.refs.fetch})`, value: r.name }))
        }]);
    const { newUrl } = await inquirer_1.default.prompt([{
            type: 'input',
            name: 'newUrl',
            message: 'Enter new URL:',
            validate: (input) => input.length > 0 || 'URL cannot be empty'
        }]);
    await git.remote(['set-url', remoteToChange, newUrl]);
    (0, display_1.displaySuccess)(`Remote '${remoteToChange}' updated to: ${newUrl}`);
}
async function cloneRepository() {
    (0, display_1.displayHeader)('Clone Repository');
    const { repoUrl } = await inquirer_1.default.prompt([{
            type: 'input',
            name: 'repoUrl',
            message: 'Enter repository URL:',
            validate: (input) => input.length > 0 || 'URL cannot be empty'
        }]);
    // Extract repo name from URL
    const defaultName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
    const { folderName } = await inquirer_1.default.prompt([{
            type: 'input',
            name: 'folderName',
            message: 'Folder name:',
            default: defaultName
        }]);
    const targetPath = path_1.default.join(process.cwd(), folderName);
    if (fs_1.default.existsSync(targetPath)) {
        (0, display_1.displayError)(`Folder '${folderName}' already exists`);
        return;
    }
    const spinner = (0, ora_1.default)('Cloning repository...').start();
    try {
        const git = (0, simple_git_1.default)();
        await git.clone(repoUrl, targetPath);
        spinner.succeed(`Repository cloned to '${folderName}'`);
        console.log(`\n${chalk_1.default.gray('cd')} ${chalk_1.default.cyan(folderName)}`);
    }
    catch (error) {
        spinner.fail(`Clone failed: ${error.message}`);
    }
}
