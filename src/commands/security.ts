import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { displayHeader, displaySuccess, displayError, displayWarning, displayInfo } from '../ui/display';
import { gitOps } from '../git/operations';
import { getConfig, saveConfig, refreshConfig } from '../config/settings';

// Sensitive data patterns
const SENSITIVE_PATTERNS: { name: string; pattern: RegExp; severity: 'high' | 'medium' | 'low' }[] = [
    // API Keys
    { name: 'Generic API Key', pattern: /['"]?[a-zA-Z_]*api[_-]?key['"]?\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi, severity: 'high' },
    { name: 'Generic Secret', pattern: /['"]?[a-zA-Z_]*secret['"]?\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi, severity: 'high' },
    { name: 'Generic Token', pattern: /['"]?[a-zA-Z_]*token['"]?\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi, severity: 'high' },

    // AWS
    { name: 'AWS Access Key ID', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'high' },
    { name: 'AWS Secret Key', pattern: /[a-zA-Z0-9/+=]{40}/g, severity: 'medium' },

    // Private Keys
    { name: 'RSA Private Key', pattern: /-----BEGIN RSA PRIVATE KEY-----/g, severity: 'high' },
    { name: 'Private Key', pattern: /-----BEGIN PRIVATE KEY-----/g, severity: 'high' },
    { name: 'SSH Private Key', pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g, severity: 'high' },

    // Passwords
    { name: 'Password in Code', pattern: /['"]?password['"]?\s*[:=]\s*['"][^'"]{4,}['"]/gi, severity: 'high' },
    { name: 'Password in URL', pattern: /:\/\/[^:]+:[^@]+@/g, severity: 'high' },

    // Database Connection Strings
    { name: 'MongoDB URI', pattern: /mongodb(\+srv)?:\/\/[^"'\s]+/gi, severity: 'high' },
    { name: 'PostgreSQL URI', pattern: /postgres(ql)?:\/\/[^"'\s]+/gi, severity: 'high' },
    { name: 'MySQL URI', pattern: /mysql:\/\/[^"'\s]+/gi, severity: 'high' },

    // Service-specific
    { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/g, severity: 'high' },
    { name: 'Slack Token', pattern: /xox[baprs]-[a-zA-Z0-9-]+/g, severity: 'high' },
    { name: 'Stripe Key', pattern: /sk_live_[a-zA-Z0-9]{24,}/g, severity: 'high' },
    { name: 'Google API Key', pattern: /AIza[0-9A-Za-z_-]{35}/g, severity: 'high' },

    // .env file patterns
    { name: 'Environment Variable', pattern: /^[A-Z_]+=[^$\n]+$/gm, severity: 'low' }
];

// Files to ignore
const IGNORE_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '*.min.js',
    '*.bundle.js',
    'package-lock.json',
    'yarn.lock'
];

// Conventional commit types
const CONVENTIONAL_TYPES = [
    'feat', 'fix', 'docs', 'style', 'refactor',
    'perf', 'test', 'build', 'ci', 'chore', 'revert'
];

interface ScanResult {
    file: string;
    line: number;
    pattern: string;
    severity: 'high' | 'medium' | 'low';
    match: string;
}

// Dashboard'dan çağrılan menü
export async function manageSecurityMenu(): Promise<void> {
    let running = true;
    while (running) {
        const shouldContinue = await showSecurityMenuWithReturn();
        if (!shouldContinue) {
            running = false;
        }
    }
}

async function showSecurityMenuWithReturn(): Promise<boolean> {
    const config = getConfig();

    console.log(`\n🔒 Güvenlik`);
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  Conventional Commit: ${config.conventionalCommit ? chalk.green('Aktif') : chalk.gray('Pasif')}`);

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Ne yapmak istersiniz?',
        choices: [
            { name: '⬅️  Ana menüye dön', value: 'back' },
            new inquirer.Separator(),
            { name: '🔍  Sensitive data tara', value: 'scan' },
            { name: '📝  Staged dosyaları tara', value: 'scan-staged' },
            { name: `✅  Conventional commit ${config.conventionalCommit ? '(Devre dışı bırak)' : '(Aktif et)'}`, value: 'toggle-conventional' },
            { name: '📋  Conventional commit kuralları', value: 'conventional-rules' }
        ],
        loop: false
    }]);

    if (action === 'back') {
        return false;
    }

    switch (action) {
        case 'scan':
            await scanForSensitiveData();
            break;
        case 'scan-staged':
            await scanStagedFiles();
            break;
        case 'toggle-conventional':
            await toggleConventionalCommit();
            break;
        case 'conventional-rules':
            showConventionalRules();
            break;
    }
    return true;
}

async function scanForSensitiveData(): Promise<void> {
    const spinner = ora('Dosyalar taranıyor...').start();

    try {
        const results = await scanDirectory(process.cwd());
        spinner.stop();

        if (results.length === 0) {
            displaySuccess('Hassas veri bulunamadı!');
        } else {
            displayWarning(`${results.length} potansiyel hassas veri bulundu!`);
            displayScanResults(results);
        }
    } catch (error) {
        spinner.stop();
        displayError(`Tarama hatası: ${error}`);
    }

    await waitForEnter();
}

async function scanStagedFiles(): Promise<void> {
    const spinner = ora('Staged dosyalar taranıyor...').start();

    try {
        const stagedFiles = await gitOps.getStagedFiles();

        if (stagedFiles.length === 0) {
            spinner.stop();
            displayWarning('Staged dosya yok');
            await waitForEnter();
            return;
        }

        const allResults: ScanResult[] = [];

        for (const file of stagedFiles) {
            const filePath = path.join(process.cwd(), file);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const results = await scanFile(filePath);
                allResults.push(...results);
            }
        }

        spinner.stop();

        if (allResults.length === 0) {
            displaySuccess('Staged dosyalarda hassas veri bulunamadı!');
        } else {
            displayWarning(`${allResults.length} potansiyel hassas veri bulundu!`);
            displayScanResults(allResults);

            const { continueCommit } = await inquirer.prompt([{
                type: 'confirm',
                name: 'continueCommit',
                message: chalk.yellow('Uyarılara rağmen commit\'e devam etmek istiyor musunuz?'),
                default: false
            }]);

            if (!continueCommit) {
                displayInfo('Commit iptal edildi. Lütfen hassas verileri temizleyin.');
            }
        }
    } catch (error) {
        spinner.stop();
        displayError(`Tarama hatası: ${error}`);
    }

    await waitForEnter();
}

async function scanDirectory(dir: string): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const relativePath = path.relative(process.cwd(), filePath);

        // Skip ignored patterns
        if (shouldIgnore(relativePath)) continue;

        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            const subResults = await scanDirectory(filePath);
            results.push(...subResults);
        } else if (stat.isFile()) {
            const fileResults = await scanFile(filePath);
            results.push(...fileResults);
        }
    }

    return results;
}

function shouldIgnore(filePath: string): boolean {
    return IGNORE_PATTERNS.some(pattern => {
        if (pattern.startsWith('*')) {
            return filePath.endsWith(pattern.slice(1));
        }
        return filePath.includes(pattern);
    });
}

async function scanFile(filePath: string): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    try {
        // Skip binary files and large files
        const stat = fs.statSync(filePath);
        if (stat.size > 1024 * 1024) return results; // Skip files > 1MB

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(process.cwd(), filePath);

        for (const { name, pattern, severity } of SENSITIVE_PATTERNS) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const matches = line.match(pattern);

                if (matches) {
                    for (const match of matches) {
                        results.push({
                            file: relativePath,
                            line: i + 1,
                            pattern: name,
                            severity,
                            match: maskSensitiveData(match)
                        });
                    }
                }
            }
        }
    } catch (error) {
        // Skip files that can't be read
    }

    return results;
}

function maskSensitiveData(data: string): string {
    if (data.length <= 8) return '***';
    return data.slice(0, 4) + '...' + data.slice(-4);
}

function displayScanResults(results: ScanResult[]): void {
    console.log();

    // Group by severity
    const high = results.filter(r => r.severity === 'high');
    const medium = results.filter(r => r.severity === 'medium');
    const low = results.filter(r => r.severity === 'low');

    if (high.length > 0) {
        console.log(chalk.red.bold(`\n🚨 Yüksek Risk (${high.length}):`));
        high.slice(0, 10).forEach(r => {
            console.log(`  ${chalk.red('•')} ${r.file}:${r.line} - ${r.pattern}`);
            console.log(`    ${chalk.gray(r.match)}`);
        });
        if (high.length > 10) {
            console.log(chalk.gray(`    ... ve ${high.length - 10} daha`));
        }
    }

    if (medium.length > 0) {
        console.log(chalk.yellow.bold(`\n⚠️ Orta Risk (${medium.length}):`));
        medium.slice(0, 5).forEach(r => {
            console.log(`  ${chalk.yellow('•')} ${r.file}:${r.line} - ${r.pattern}`);
        });
        if (medium.length > 5) {
            console.log(chalk.gray(`    ... ve ${medium.length - 5} daha`));
        }
    }

    if (low.length > 0) {
        console.log(chalk.blue.bold(`\nℹ️ Düşük Risk (${low.length}):`));
        console.log(chalk.gray(`  ${low.length} environment variable benzeri bulundu`));
    }

    console.log();
}

async function toggleConventionalCommit(): Promise<void> {
    const config = getConfig();
    const newValue = !config.conventionalCommit;

    saveConfig({ conventionalCommit: newValue });
    refreshConfig();

    if (newValue) {
        displaySuccess('Conventional commit kontrolü aktif edildi');
        console.log(chalk.gray('\nCommit mesajlarınız şu formatta olmalı:'));
        console.log(chalk.cyan('  <type>(<scope>): <description>'));
        console.log(chalk.gray('\nÖrnek: feat(auth): add login functionality'));
    } else {
        displayInfo('Conventional commit kontrolü devre dışı bırakıldı');
    }
}

function showConventionalRules(): void {
    console.log(chalk.bold('\n📋 Conventional Commit Formatı'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.cyan('\n<type>(<scope>): <description>\n'));

    console.log(chalk.bold('Tipler:'));
    const typeDescriptions: Record<string, string> = {
        'feat': 'Yeni özellik',
        'fix': 'Hata düzeltme',
        'docs': 'Dokümantasyon',
        'style': 'Kod stili (formatting)',
        'refactor': 'Refactoring',
        'perf': 'Performans iyileştirmesi',
        'test': 'Test ekleme/düzeltme',
        'build': 'Build sistemi',
        'ci': 'CI/CD',
        'chore': 'Bakım görevi',
        'revert': 'Geri alma'
    };

    for (const [type, desc] of Object.entries(typeDescriptions)) {
        console.log(`  ${chalk.green(type.padEnd(10))} ${desc}`);
    }

    console.log(chalk.bold('\nÖrnekler:'));
    console.log(`  ${chalk.green('feat(auth):')} add user login`);
    console.log(`  ${chalk.green('fix(api):')} resolve timeout issue`);
    console.log(`  ${chalk.green('docs:')} update README`);
    console.log(`  ${chalk.green('chore:')} update dependencies`);
    console.log();
}

// Commit mesajını validate et
export function validateConventionalCommit(message: string): { valid: boolean; error?: string } {
    const pattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-zA-Z0-9_-]+\))?: .+$/;

    if (pattern.test(message)) {
        return { valid: true };
    }

    // Detaylı hata mesajı
    const typeMatch = message.match(/^([a-zA-Z]+)/);
    if (!typeMatch) {
        return { valid: false, error: 'Commit mesajı bir tip ile başlamalı (feat, fix, docs, vb.)' };
    }

    const type = typeMatch[1];
    if (!CONVENTIONAL_TYPES.includes(type)) {
        return { valid: false, error: `Geçersiz tip: "${type}". Geçerli tipler: ${CONVENTIONAL_TYPES.join(', ')}` };
    }

    if (!message.includes(':')) {
        return { valid: false, error: 'Tip sonrası ":" karakteri gerekli' };
    }

    const afterColon = message.split(':')[1];
    if (!afterColon || afterColon.trim().length === 0) {
        return { valid: false, error: 'Açıklama kısmı boş olamaz' };
    }

    return { valid: false, error: 'Geçersiz format. Örnek: feat(scope): description' };
}

async function waitForEnter(): Promise<void> {
    await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: chalk.gray('Devam etmek için Enter\'a basın...')
    }]);
}
