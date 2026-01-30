import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';
import { displayHeader, displaySuccess, displayError, displayWarning } from '../ui/display';

// Common gitignore templates
const GITIGNORE_TEMPLATES: Record<string, string[]> = {
    'Node.js': [
        'node_modules/',
        'dist/',
        'build/',
        '.npm',
        '*.log',
        'npm-debug.log*',
        '.env',
        '.env.local',
        '.env.*.local',
        'coverage/',
        '.nyc_output/'
    ],
    'TypeScript': [
        '*.js',
        '*.d.ts',
        '*.js.map',
        'dist/',
        'build/',
        'out/',
        '.tsbuildinfo'
    ],
    'Python': [
        '__pycache__/',
        '*.py[cod]',
        '*$py.class',
        '*.so',
        '.Python',
        'venv/',
        'env/',
        '.venv/',
        '*.egg-info/',
        'dist/',
        'build/',
        '.pytest_cache/',
        '.coverage',
        'htmlcov/'
    ],
    'Java': [
        '*.class',
        '*.jar',
        '*.war',
        '*.ear',
        'target/',
        '.gradle/',
        'build/',
        '.idea/',
        '*.iml'
    ],
    'IDE & Editors': [
        '.idea/',
        '.vscode/',
        '*.swp',
        '*.swo',
        '*~',
        '.project',
        '.classpath',
        '.settings/',
        '*.sublime-*'
    ],
    'OS': [
        '.DS_Store',
        'Thumbs.db',
        'desktop.ini',
        '*.lnk'
    ],
    'Logs & Debug': [
        '*.log',
        'logs/',
        'debug/',
        'npm-debug.log*',
        'yarn-debug.log*',
        'yarn-error.log*'
    ]
};

// Dashboard'dan çağrılan loop'lu menü
export async function manageGitignoreMenu(): Promise<void> {
    let running = true;
    while (running) {
        const shouldContinue = await showGitignoreMenuWithReturn();
        if (!shouldContinue) {
            running = false;
        }
    }
}

// Standalone CLI komutu için
export async function manageGitignore(): Promise<void> {
    const projectName = path.basename(process.cwd());
    displayHeader(projectName);
    await showGitignoreMenuWithReturn();
}

async function showGitignoreMenuWithReturn(): Promise<boolean> {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const exists = fs.existsSync(gitignorePath);

    let currentContent: string[] = [];
    if (exists) {
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        currentContent = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    }

    console.log(`\n📄 .gitignore Durumu`);
    console.log(chalk.gray('─'.repeat(40)));

    if (exists) {
        console.log(chalk.green('✓') + ` .gitignore mevcut (${currentContent.length} kural)`);
        if (currentContent.length > 0) {
            console.log(chalk.gray('\nMevcut kurallar:'));
            currentContent.slice(0, 10).forEach(rule => {
                console.log(`  ${chalk.gray('•')} ${rule}`);
            });
            if (currentContent.length > 10) {
                console.log(chalk.gray(`  ... ve ${currentContent.length - 10} kural daha`));
            }
        }
    } else {
        console.log(chalk.yellow('!') + ' .gitignore dosyası yok');
    }

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Ne yapmak istersiniz?',
        choices: [
            { name: '📝 Şablondan ekle', value: 'template' },
            { name: '➕ Manuel kural ekle', value: 'add' },
            { name: '🗑️ Kural sil', value: 'remove', disabled: currentContent.length === 0 ? 'Kural yok' : false },
            { name: '👁️ Tüm kuralları görüntüle', value: 'view', disabled: currentContent.length === 0 ? 'Kural yok' : false },
            { name: '🔄 Sıfırla ve yeni oluştur', value: 'reset' },
            { name: '⬅️ Ana menüye dön', value: 'back' }
        ]
    }]);

    if (action === 'back') {
        return false;
    }

    switch (action) {
        case 'template':
            await addFromTemplate(gitignorePath, currentContent);
            break;
        case 'add':
            await addManualRule(gitignorePath, currentContent);
            break;
        case 'remove':
            await removeRule(gitignorePath, currentContent);
            break;
        case 'view':
            viewAllRules(currentContent);
            break;
        case 'reset':
            await resetGitignore(gitignorePath);
            break;
    }
    return true;
}

async function addFromTemplate(gitignorePath: string, currentContent: string[]): Promise<void> {
    const { templates } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'templates',
        message: 'Eklenecek şablonları seçin:',
        choices: Object.keys(GITIGNORE_TEMPLATES).map(name => ({
            name: `${name} (${GITIGNORE_TEMPLATES[name].length} kural)`,
            value: name
        }))
    }]);

    if (templates.length === 0) {
        console.log('Şablon seçilmedi.');
        return;
    }

    const newRules: string[] = [];
    templates.forEach((template: string) => {
        GITIGNORE_TEMPLATES[template].forEach(rule => {
            if (!currentContent.includes(rule) && !newRules.includes(rule)) {
                newRules.push(rule);
            }
        });
    });

    if (newRules.length === 0) {
        displayWarning('Seçilen şablonlardaki tüm kurallar zaten mevcut.');
        return;
    }

    console.log(`\n${chalk.cyan('Eklenecek kurallar:')}`);
    newRules.forEach(rule => console.log(`  ${chalk.green('+')} ${rule}`));

    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `${newRules.length} kural eklensin mi?`,
        default: true
    }]);

    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }

    const spinner = ora('.gitignore güncelleniyor...').start();

    try {
        let content = '';
        if (fs.existsSync(gitignorePath)) {
            content = fs.readFileSync(gitignorePath, 'utf-8');
            if (!content.endsWith('\n')) content += '\n';
        }

        // Add section comment
        content += `\n# ${templates.join(', ')}\n`;
        content += newRules.join('\n') + '\n';

        fs.writeFileSync(gitignorePath, content);
        spinner.succeed(`${newRules.length} kural eklendi`);
    } catch (error) {
        spinner.fail(`Hata: ${error}`);
    }
}

async function addManualRule(gitignorePath: string, currentContent: string[]): Promise<void> {
    const { rules } = await inquirer.prompt([{
        type: 'input',
        name: 'rules',
        message: 'Eklenecek kuralları girin (virgülle ayırın):',
        validate: (input: string) => input.trim().length > 0 || 'En az bir kural girin'
    }]);

    const newRules = rules.split(',').map((r: string) => r.trim()).filter((r: string) => r);
    const alreadyExists = newRules.filter((r: string) => currentContent.includes(r));
    const toAdd = newRules.filter((r: string) => !currentContent.includes(r));

    if (alreadyExists.length > 0) {
        console.log(chalk.yellow(`\nZaten mevcut: ${alreadyExists.join(', ')}`));
    }

    if (toAdd.length === 0) {
        displayWarning('Eklenecek yeni kural yok.');
        return;
    }

    const spinner = ora('.gitignore güncelleniyor...').start();

    try {
        let content = '';
        if (fs.existsSync(gitignorePath)) {
            content = fs.readFileSync(gitignorePath, 'utf-8');
            if (!content.endsWith('\n')) content += '\n';
        }

        content += toAdd.join('\n') + '\n';
        fs.writeFileSync(gitignorePath, content);
        spinner.succeed(`${toAdd.length} kural eklendi: ${toAdd.join(', ')}`);
    } catch (error) {
        spinner.fail(`Hata: ${error}`);
    }
}

async function removeRule(gitignorePath: string, currentContent: string[]): Promise<void> {
    const { rulesToRemove } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'rulesToRemove',
        message: 'Silinecek kuralları seçin:',
        choices: currentContent.map(rule => ({ name: rule, value: rule })),
        pageSize: 15
    }]);

    if (rulesToRemove.length === 0) {
        console.log('Kural seçilmedi.');
        return;
    }

    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `${rulesToRemove.length} kural silinsin mi?`,
        default: false
    }]);

    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }

    const spinner = ora('.gitignore güncelleniyor...').start();

    try {
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        const lines = content.split('\n');
        const newLines = lines.filter(line => !rulesToRemove.includes(line.trim()));
        fs.writeFileSync(gitignorePath, newLines.join('\n'));
        spinner.succeed(`${rulesToRemove.length} kural silindi`);
    } catch (error) {
        spinner.fail(`Hata: ${error}`);
    }
}

function viewAllRules(currentContent: string[]): void {
    console.log('\n' + chalk.bold('📄 Tüm .gitignore Kuralları'));
    console.log(chalk.gray('─'.repeat(40)));
    currentContent.forEach((rule, i) => {
        console.log(`  ${chalk.gray(`${i + 1}.`)} ${rule}`);
    });
    console.log();
}

async function resetGitignore(gitignorePath: string): Promise<void> {
    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: chalk.red('Mevcut .gitignore silinecek ve yeni oluşturulacak. Emin misiniz?'),
        default: false
    }]);

    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }

    const { templates } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'templates',
        message: 'Yeni .gitignore için şablonları seçin:',
        choices: Object.keys(GITIGNORE_TEMPLATES).map(name => ({
            name: `${name} (${GITIGNORE_TEMPLATES[name].length} kural)`,
            value: name,
            checked: name === 'Node.js' || name === 'IDE & Editors' || name === 'OS'
        }))
    }]);

    const spinner = ora('.gitignore oluşturuluyor...').start();

    try {
        let content = '# Generated by Git Helper\n\n';

        templates.forEach((template: string) => {
            content += `# ${template}\n`;
            content += GITIGNORE_TEMPLATES[template].join('\n') + '\n\n';
        });

        fs.writeFileSync(gitignorePath, content);

        const totalRules = templates.reduce((sum: number, t: string) => sum + GITIGNORE_TEMPLATES[t].length, 0);
        spinner.succeed(`.gitignore oluşturuldu (${totalRules} kural)`);
    } catch (error) {
        spinner.fail(`Hata: ${error}`);
    }
}
