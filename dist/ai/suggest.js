"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCommitSuggestion = generateCommitSuggestion;
exports.getCommitTypes = getCommitTypes;
exports.formatConventionalCommit = formatConventionalCommit;
const operations_1 = require("../git/operations");
const TYPE_DESCRIPTIONS = {
    feat: 'Yeni özellik',
    fix: 'Hata düzeltme',
    docs: 'Sadece dokümantasyon değişiklikleri',
    style: 'Kod stili değişiklikleri (formatlama, noktalı virgül, vb.)',
    refactor: 'İşlevselliği değiştirmeden kod yeniden düzenleme',
    test: 'Test ekleme veya güncelleme',
    chore: 'Bakım görevleri, bağımlılıklar, vb.',
    perf: 'Performans iyileştirmeleri',
    build: 'Build sistemi veya harici bağımlılıklar',
    ci: 'CI/CD yapılandırma değişiklikleri'
};
async function generateCommitSuggestion() {
    const stagedFiles = await operations_1.gitOps.getStagedFiles();
    const status = await operations_1.gitOps.getStatus();
    // Analyze file patterns
    const patterns = analyzeFilePatterns(stagedFiles);
    const type = determineCommitType(patterns, stagedFiles);
    const scope = determineScope(stagedFiles);
    const message = generateMessage(patterns, stagedFiles, type);
    const fullMessage = scope
        ? `${type}(${scope}): ${message}`
        : `${type}: ${message}`;
    return {
        type: type,
        scope,
        message,
        fullMessage
    };
}
function analyzeFilePatterns(files) {
    return {
        hasNewFiles: files.some(f => f.includes('new') || f.includes('add')),
        hasDeletedFiles: false, // Would need diff info
        hasTestFiles: files.some(f => f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__')),
        hasDocFiles: files.some(f => f.endsWith('.md') || f.includes('docs/')),
        hasConfigFiles: files.some(f => f.includes('config') ||
            f.endsWith('.json') ||
            f.endsWith('.yml') ||
            f.endsWith('.yaml') ||
            f.includes('.env')),
        hasStyleFiles: files.some(f => f.endsWith('.css') || f.endsWith('.scss') || f.endsWith('.less')),
        hasApiFiles: files.some(f => f.includes('/api/') || f.includes('Controller') || f.includes('Service')),
        hasComponentFiles: files.some(f => f.includes('/components/') || f.endsWith('.tsx') || f.endsWith('.jsx')),
        hasWorkflowFiles: files.some(f => f.includes('.github/workflows') || f.includes('ci') || f.includes('cd')),
        hasDependencyFiles: files.some(f => f === 'package.json' || f === 'package-lock.json' || f.endsWith('.csproj'))
    };
}
function determineCommitType(patterns, files) {
    // Priority-based type detection
    if (patterns.hasWorkflowFiles)
        return 'ci';
    if (patterns.hasTestFiles)
        return 'test';
    if (patterns.hasDocFiles && files.every(f => f.endsWith('.md')))
        return 'docs';
    if (patterns.hasDependencyFiles && files.length === 1)
        return 'chore';
    if (patterns.hasStyleFiles && files.every(f => f.endsWith('.css') || f.endsWith('.scss')))
        return 'style';
    // Analyze file names for fix/feat patterns
    const hasFixPattern = files.some(f => f.toLowerCase().includes('fix') ||
        f.toLowerCase().includes('bug') ||
        f.toLowerCase().includes('patch'));
    if (hasFixPattern)
        return 'fix';
    // Default to feat for component/api changes, chore for others
    if (patterns.hasComponentFiles || patterns.hasApiFiles)
        return 'feat';
    if (patterns.hasConfigFiles)
        return 'chore';
    return 'feat';
}
function determineScope(files) {
    // Try to find common directory
    if (files.length === 0)
        return undefined;
    // Check for common scopes
    const scopes = {
        'api': ['/api/', 'Controller', 'Service'],
        'ui': ['/components/', '.tsx', '.jsx'],
        'docs': ['.md', '/docs/'],
        'config': ['.json', '.yml', '.yaml', '.env'],
        'test': ['.test.', '.spec.', '__tests__'],
        'ci': ['.github/', 'workflow']
    };
    for (const [scope, patterns] of Object.entries(scopes)) {
        if (files.every(f => patterns.some(p => f.includes(p)))) {
            return scope;
        }
    }
    // Try to extract component/feature name
    const componentMatch = files[0]?.match(/\/([^\/]+)\.(tsx|ts|js|jsx)$/);
    if (componentMatch && files.length <= 3) {
        const name = componentMatch[1];
        // Convert PascalCase to kebab-case
        return name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
    return undefined;
}
function generateMessage(patterns, files, type) {
    // Generate message based on file analysis
    if (files.length === 1) {
        const fileName = files[0].split('/').pop() || files[0];
        const baseName = fileName.replace(/\.(ts|tsx|js|jsx|md|json|yml|yaml|css|scss)$/, '');
        switch (type) {
            case 'docs':
                return `${baseName} dokümantasyonu güncellendi`;
            case 'test':
                return `${baseName} için testler eklendi`;
            case 'style':
                return `${baseName} stilleri güncellendi`;
            case 'chore':
                if (fileName === 'package.json')
                    return 'bağımlılıklar güncellendi';
                return `${baseName} yapılandırması güncellendi`;
            case 'ci':
                return `${baseName} workflow güncellendi`;
            default:
                return `${baseName} güncellendi`;
        }
    }
    // Multiple files
    if (patterns.hasComponentFiles) {
        const componentFiles = files.filter(f => f.includes('/components/'));
        if (componentFiles.length > 0) {
            const componentDir = componentFiles[0].match(/\/components\/([^\/]+)/);
            if (componentDir) {
                return `${componentDir[1]} bileşeni güncellendi`;
            }
        }
        return 'bileşenler güncellendi';
    }
    if (patterns.hasApiFiles) {
        return 'API endpoint\'leri güncellendi';
    }
    if (patterns.hasDocFiles) {
        return 'dokümantasyon güncellendi';
    }
    if (patterns.hasConfigFiles) {
        return 'yapılandırma güncellendi';
    }
    // Generic message based on file count
    return `${files.length} dosya güncellendi`;
}
function getCommitTypes() {
    return Object.entries(TYPE_DESCRIPTIONS).map(([value, description]) => ({
        value,
        name: `${value}: ${description}`
    }));
}
function formatConventionalCommit(type, scope, message) {
    if (scope) {
        return `${type}(${scope}): ${message}`;
    }
    return `${type}: ${message}`;
}
