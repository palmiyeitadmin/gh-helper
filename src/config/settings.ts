import fs from 'fs';
import path from 'path';
import os from 'os';

// Profil tipleri
export type ProfileType = 'standard' | 'expert' | 'custom';

// Tema tipleri
export type ThemeType = 'default' | 'dark' | 'light' | 'ocean';

// AI Provider tipleri
export type AIProviderType = 'none' | 'groq' | 'gemini' | 'deepseek' | 'openai' | 'anthropic' | 'minimax' | 'ollama';

// Ana config interface
export interface PlmConfig {
    profile: ProfileType;
    customFeatures: string[];
    theme: ThemeType;
    language: 'tr' | 'en';
    aliases: Record<string, string>;
    favorites: string[];
    conventionalCommit: boolean;

    // AI Ayarları
    aiProvider: AIProviderType;
    aiApiKey?: string;
    aiModel?: string;
    aiEnabled: boolean;
}

// Özellik grupları
export const STANDARD_FEATURES = [
    'stage', 'commit', 'push', 'pull',
    'status', 'diff', 'history',
    'branch', 'stash', 'gitignore'
];

export const EXPERT_FEATURES = [
    ...STANDARD_FEATURES,
    'tag', 'merge', 'remote',
    'security', 'analytics', 'advanced'
];

// Tüm özellikler ve açıklamaları
export const ALL_FEATURES: Record<string, { name: string; category: string }> = {
    // Temel
    stage: { name: '➕ Dosyaları stage\'le', category: 'git' },
    commit: { name: '📝 Commit yap', category: 'git' },
    push: { name: '⬆️ Push yap', category: 'git' },
    pull: { name: '⬇️ Pull yap', category: 'git' },
    status: { name: '📊 Detaylı durum', category: 'view' },
    diff: { name: '🔍 Diff görüntüle', category: 'view' },
    history: { name: '📋 Geçmiş', category: 'view' },

    // Yönetim
    branch: { name: '🔀 Branch yönetimi', category: 'manage' },
    stash: { name: '📦 Stash yönetimi', category: 'manage' },
    tag: { name: '🏷️ Tag yönetimi', category: 'manage' },
    merge: { name: '⚔️ Merge/Rebase', category: 'manage' },
    remote: { name: '🔗 Remote yönetimi', category: 'manage' },
    gitignore: { name: '📝 .gitignore yönetimi', category: 'manage' },

    // Gelişmiş
    cherrypick: { name: '🍒 Cherry-pick', category: 'advanced' },
    bisect: { name: '🔍 Bisect', category: 'advanced' },
    blame: { name: '👤 Blame', category: 'advanced' },
    worktree: { name: '📂 Worktree', category: 'advanced' },
    submodule: { name: '📦 Submodule', category: 'advanced' },
    reflog: { name: '📜 Reflog', category: 'advanced' },

    // Analiz
    'commit-stats': { name: '📈 Commit istatistikleri', category: 'analytics' },
    contributors: { name: '👥 Contributor özeti', category: 'analytics' },
    'file-history': { name: '📄 Dosya geçmişi', category: 'analytics' },
    'code-stats': { name: '📊 Kod satırı sayımı', category: 'analytics' },
    'branch-compare': { name: '⚖️ Branch karşılaştırma', category: 'analytics' },

    // Güvenlik
    'pre-commit': { name: '🔒 Pre-commit hooks', category: 'security' },
    'sensitive-scan': { name: '🔍 Sensitive data tarama', category: 'security' },
    'conventional': { name: '✅ Conventional commit', category: 'security' }
};

// Varsayılan config
const DEFAULT_CONFIG: PlmConfig = {
    profile: 'standard',
    customFeatures: [],
    theme: 'default',
    language: 'tr',
    aliases: {},
    favorites: [],
    conventionalCommit: false,

    // AI varsayılanları
    aiProvider: 'none',
    aiApiKey: undefined,
    aiModel: undefined,
    aiEnabled: false
};

// Config dosyası yolları
function getConfigPath(): string {
    // Önce proje klasöründe ara
    const localConfig = path.join(process.cwd(), '.plmhelperrc');
    if (fs.existsSync(localConfig)) {
        return localConfig;
    }

    // Yoksa home directory'de
    return path.join(os.homedir(), '.plmhelperrc');
}

// Config oku
export function loadConfig(): PlmConfig {
    const configPath = getConfigPath();

    try {
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf-8');
            const userConfig = JSON.parse(content);
            return { ...DEFAULT_CONFIG, ...userConfig };
        }
    } catch (error) {
        console.error('Config okuma hatası:', error);
    }

    return DEFAULT_CONFIG;
}

// Config kaydet
export function saveConfig(config: Partial<PlmConfig>, global: boolean = true): void {
    const configPath = global
        ? path.join(os.homedir(), '.plmhelperrc')
        : path.join(process.cwd(), '.plmhelperrc');

    const existingConfig = loadConfig();
    const newConfig = { ...existingConfig, ...config };

    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
}

// Profil bazlı özellikleri al
export function getEnabledFeatures(config: PlmConfig): string[] {
    switch (config.profile) {
        case 'standard':
            return STANDARD_FEATURES;
        case 'expert':
            return EXPERT_FEATURES;
        case 'custom':
            return [...STANDARD_FEATURES, ...config.customFeatures];
        default:
            return STANDARD_FEATURES;
    }
}

// Özellik aktif mi kontrol et
export function isFeatureEnabled(feature: string, config: PlmConfig): boolean {
    const enabledFeatures = getEnabledFeatures(config);
    return enabledFeatures.includes(feature);
}

// Kategori bazlı özellikleri getir
export function getFeaturesByCategory(category: string): { key: string; name: string }[] {
    return Object.entries(ALL_FEATURES)
        .filter(([, value]) => value.category === category)
        .map(([key, value]) => ({ key, name: value.name }));
}

// Config singleton with mtime-based invalidation
let cachedConfig: PlmConfig | null = null;
let cachedConfigMtime: number = 0;

export function getConfig(): PlmConfig {
    const configPath = getConfigPath();
    try {
        if (fs.existsSync(configPath)) {
            const mtime = fs.statSync(configPath).mtimeMs;
            if (!cachedConfig || mtime !== cachedConfigMtime) {
                cachedConfig = loadConfig();
                cachedConfigMtime = mtime;
            }
        } else if (!cachedConfig) {
            cachedConfig = loadConfig();
        }
    } catch {
        if (!cachedConfig) {
            cachedConfig = loadConfig();
        }
    }
    return cachedConfig;
}

export function refreshConfig(): PlmConfig {
    cachedConfig = loadConfig();
    const configPath = getConfigPath();
    try {
        if (fs.existsSync(configPath)) {
            cachedConfigMtime = fs.statSync(configPath).mtimeMs;
        }
    } catch {
        // ignore
    }
    return cachedConfig;
}
