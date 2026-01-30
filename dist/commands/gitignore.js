"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageGitignoreMenu = manageGitignoreMenu;
exports.manageGitignore = manageGitignore;
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const display_1 = require("../ui/display");
// Common gitignore templates
const GITIGNORE_TEMPLATES = {
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
async function manageGitignoreMenu() {
    let running = true;
    while (running) {
        const shouldContinue = await showGitignoreMenuWithReturn();
        if (!shouldContinue) {
            running = false;
        }
    }
}
// Standalone CLI komutu için
async function manageGitignore() {
    const projectName = path_1.default.basename(process.cwd());
    (0, display_1.displayHeader)(projectName);
    await showGitignoreMenuWithReturn();
}
async function showGitignoreMenuWithReturn() {
    const gitignorePath = path_1.default.join(process.cwd(), '.gitignore');
    const exists = fs_1.default.existsSync(gitignorePath);
    let currentContent = [];
    if (exists) {
        const content = fs_1.default.readFileSync(gitignorePath, 'utf-8');
        currentContent = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    }
    console.log(`\n📄 .gitignore Durumu`);
    console.log(chalk_1.default.gray('─'.repeat(40)));
    if (exists) {
        console.log(chalk_1.default.green('✓') + ` .gitignore mevcut (${currentContent.length} kural)`);
        if (currentContent.length > 0) {
            console.log(chalk_1.default.gray('\nMevcut kurallar:'));
            currentContent.slice(0, 10).forEach(rule => {
                console.log(`  ${chalk_1.default.gray('•')} ${rule}`);
            });
            if (currentContent.length > 10) {
                console.log(chalk_1.default.gray(`  ... ve ${currentContent.length - 10} kural daha`));
            }
        }
    }
    else {
        console.log(chalk_1.default.yellow('!') + ' .gitignore dosyası yok');
    }
    const { action } = await inquirer_1.default.prompt([{
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
async function addFromTemplate(gitignorePath, currentContent) {
    const { templates } = await inquirer_1.default.prompt([{
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
    const newRules = [];
    templates.forEach((template) => {
        GITIGNORE_TEMPLATES[template].forEach(rule => {
            if (!currentContent.includes(rule) && !newRules.includes(rule)) {
                newRules.push(rule);
            }
        });
    });
    if (newRules.length === 0) {
        (0, display_1.displayWarning)('Seçilen şablonlardaki tüm kurallar zaten mevcut.');
        return;
    }
    console.log(`\n${chalk_1.default.cyan('Eklenecek kurallar:')}`);
    newRules.forEach(rule => console.log(`  ${chalk_1.default.green('+')} ${rule}`));
    const { confirm } = await inquirer_1.default.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: `${newRules.length} kural eklensin mi?`,
            default: true
        }]);
    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }
    const spinner = (0, ora_1.default)('.gitignore güncelleniyor...').start();
    try {
        let content = '';
        if (fs_1.default.existsSync(gitignorePath)) {
            content = fs_1.default.readFileSync(gitignorePath, 'utf-8');
            if (!content.endsWith('\n'))
                content += '\n';
        }
        // Add section comment
        content += `\n# ${templates.join(', ')}\n`;
        content += newRules.join('\n') + '\n';
        fs_1.default.writeFileSync(gitignorePath, content);
        spinner.succeed(`${newRules.length} kural eklendi`);
    }
    catch (error) {
        spinner.fail(`Hata: ${error}`);
    }
}
async function addManualRule(gitignorePath, currentContent) {
    const { rules } = await inquirer_1.default.prompt([{
            type: 'input',
            name: 'rules',
            message: 'Eklenecek kuralları girin (virgülle ayırın):',
            validate: (input) => input.trim().length > 0 || 'En az bir kural girin'
        }]);
    const newRules = rules.split(',').map((r) => r.trim()).filter((r) => r);
    const alreadyExists = newRules.filter((r) => currentContent.includes(r));
    const toAdd = newRules.filter((r) => !currentContent.includes(r));
    if (alreadyExists.length > 0) {
        console.log(chalk_1.default.yellow(`\nZaten mevcut: ${alreadyExists.join(', ')}`));
    }
    if (toAdd.length === 0) {
        (0, display_1.displayWarning)('Eklenecek yeni kural yok.');
        return;
    }
    const spinner = (0, ora_1.default)('.gitignore güncelleniyor...').start();
    try {
        let content = '';
        if (fs_1.default.existsSync(gitignorePath)) {
            content = fs_1.default.readFileSync(gitignorePath, 'utf-8');
            if (!content.endsWith('\n'))
                content += '\n';
        }
        content += toAdd.join('\n') + '\n';
        fs_1.default.writeFileSync(gitignorePath, content);
        spinner.succeed(`${toAdd.length} kural eklendi: ${toAdd.join(', ')}`);
    }
    catch (error) {
        spinner.fail(`Hata: ${error}`);
    }
}
async function removeRule(gitignorePath, currentContent) {
    const { rulesToRemove } = await inquirer_1.default.prompt([{
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
    const { confirm } = await inquirer_1.default.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: `${rulesToRemove.length} kural silinsin mi?`,
            default: false
        }]);
    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }
    const spinner = (0, ora_1.default)('.gitignore güncelleniyor...').start();
    try {
        const content = fs_1.default.readFileSync(gitignorePath, 'utf-8');
        const lines = content.split('\n');
        const newLines = lines.filter(line => !rulesToRemove.includes(line.trim()));
        fs_1.default.writeFileSync(gitignorePath, newLines.join('\n'));
        spinner.succeed(`${rulesToRemove.length} kural silindi`);
    }
    catch (error) {
        spinner.fail(`Hata: ${error}`);
    }
}
function viewAllRules(currentContent) {
    console.log('\n' + chalk_1.default.bold('📄 Tüm .gitignore Kuralları'));
    console.log(chalk_1.default.gray('─'.repeat(40)));
    currentContent.forEach((rule, i) => {
        console.log(`  ${chalk_1.default.gray(`${i + 1}.`)} ${rule}`);
    });
    console.log();
}
async function resetGitignore(gitignorePath) {
    const { confirm } = await inquirer_1.default.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: chalk_1.default.red('Mevcut .gitignore silinecek ve yeni oluşturulacak. Emin misiniz?'),
            default: false
        }]);
    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }
    const { templates } = await inquirer_1.default.prompt([{
            type: 'checkbox',
            name: 'templates',
            message: 'Yeni .gitignore için şablonları seçin:',
            choices: Object.keys(GITIGNORE_TEMPLATES).map(name => ({
                name: `${name} (${GITIGNORE_TEMPLATES[name].length} kural)`,
                value: name,
                checked: name === 'Node.js' || name === 'IDE & Editors' || name === 'OS'
            }))
        }]);
    const spinner = (0, ora_1.default)('.gitignore oluşturuluyor...').start();
    try {
        let content = '# Generated by Git Helper\n\n';
        templates.forEach((template) => {
            content += `# ${template}\n`;
            content += GITIGNORE_TEMPLATES[template].join('\n') + '\n\n';
        });
        fs_1.default.writeFileSync(gitignorePath, content);
        const totalRules = templates.reduce((sum, t) => sum + GITIGNORE_TEMPLATES[t].length, 0);
        spinner.succeed(`.gitignore oluşturuldu (${totalRules} kural)`);
    }
    catch (error) {
        spinner.fail(`Hata: ${error}`);
    }
}
