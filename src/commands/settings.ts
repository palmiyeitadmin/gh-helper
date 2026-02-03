import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { displayHeader, displaySuccess, displayWarning, displayError, displayInfo } from '../ui/display';
import path from 'path';
import {
    PlmConfig,
    ProfileType,
    ThemeType,
    AIProviderType,
    loadConfig,
    saveConfig,
    getConfig,
    refreshConfig,
    STANDARD_FEATURES,
    EXPERT_FEATURES,
    ALL_FEATURES
} from '../config/settings';
import { AI_PROVIDERS, createAIProvider, maskApiKey } from '../ai/ai-provider';

// Dashboard'dan çağrılan menü
export async function manageSettingsMenu(): Promise<void> {
    let running = true;
    while (running) {
        const shouldContinue = await showSettingsMenuWithReturn();
        if (!shouldContinue) {
            running = false;
        }
    }
}

async function showSettingsMenuWithReturn(): Promise<boolean> {
    const config = getConfig();

    console.log(`\n⚙️ Ayarlar`);
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  Profil: ${getProfileDisplay(config.profile)}`);
    console.log(`  Tema: ${config.theme}`);
    console.log(`  Dil: ${config.language === 'tr' ? 'Türkçe' : 'English'}`);

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Ne yapmak istersiniz?',
        choices: [
            { name: '⬅️  Ana menüye dön', value: 'back' },
            new inquirer.Separator(),
            { name: '👤  Profil değiştir', value: 'profile' },
            { name: '🎨  Tema değiştir', value: 'theme' },
            { name: '⚙️  Custom profil ayarla', value: 'custom' },
            { name: '⭐  Favoriler', value: 'favorites' },
            { name: '⌨️  Alias\'lar', value: 'aliases' },
            { name: '🤖  AI Ayarları', value: 'ai' },
            { name: '📋  Mevcut ayarları görüntüle', value: 'view' },
            { name: '🔄  Varsayılana sıfırla', value: 'reset' }
        ],
        loop: false
    }]);

    if (action === 'back') {
        return false;
    }

    switch (action) {
        case 'profile':
            await changeProfile();
            break;
        case 'theme':
            await changeTheme();
            break;
        case 'custom':
            await setupCustomProfile();
            break;
        case 'favorites':
            await manageFavorites();
            break;
        case 'aliases':
            await manageAliases();
            break;
        case 'ai':
            await manageAISettings();
            break;
        case 'view':
            viewCurrentSettings();
            break;
        case 'reset':
            await resetSettings();
            break;
    }
    return true;
}

function getProfileDisplay(profile: ProfileType): string {
    switch (profile) {
        case 'standard':
            return chalk.green('👤 Standard');
        case 'expert':
            return chalk.blue('👨‍💻 Expert');
        case 'custom':
            return chalk.yellow('⚙️ Custom');
        default:
            return profile;
    }
}

async function changeProfile(): Promise<void> {
    const config = getConfig();

    const { profile } = await inquirer.prompt([{
        type: 'list',
        name: 'profile',
        message: 'Profil seçin:',
        default: config.profile,
        choices: [
            {
                name: '👤 Standard - Günlük kullanım (Stage, Commit, Push, Branch, Stash)',
                value: 'standard'
            },
            {
                name: '👨‍💻 Expert - Tüm özellikler (Tag, Merge, Güvenlik, Analiz, Gelişmiş)',
                value: 'expert'
            },
            {
                name: '⚙️ Custom - Kendi seçtiğiniz özellikler',
                value: 'custom'
            }
        ]
    }]);

    saveConfig({ profile });
    refreshConfig();
    displaySuccess(`Profil değiştirildi: ${getProfileDisplay(profile)}`);

    if (profile === 'custom') {
        const { setup } = await inquirer.prompt([{
            type: 'confirm',
            name: 'setup',
            message: 'Custom profil özelliklerini şimdi ayarlamak ister misiniz?',
            default: true
        }]);

        if (setup) {
            await setupCustomProfile();
        }
    }
}

async function setupCustomProfile(): Promise<void> {
    const config = getConfig();

    // Expert özellikleri (Standard dışındakiler)
    const additionalFeatures = EXPERT_FEATURES.filter(f => !STANDARD_FEATURES.includes(f));

    const choices = additionalFeatures.map(key => ({
        name: ALL_FEATURES[key]?.name || key,
        value: key,
        checked: config.customFeatures.includes(key)
    }));

    const { features } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'features',
        message: 'Standard özelliklere ek olarak hangi özellikleri aktif etmek istiyorsunuz?',
        choices,
        pageSize: 15
    }]);

    saveConfig({
        profile: 'custom',
        customFeatures: features
    });
    refreshConfig();
    displaySuccess(`Custom profil güncellendi: ${features.length} ek özellik aktif`);
}

async function changeTheme(): Promise<void> {
    const config = getConfig();

    const { theme } = await inquirer.prompt([{
        type: 'list',
        name: 'theme',
        message: 'Tema seçin:',
        default: config.theme,
        choices: [
            { name: '🎨 Default', value: 'default' },
            { name: '🌙 Dark', value: 'dark' },
            { name: '☀️ Light', value: 'light' },
            { name: '🌊 Ocean', value: 'ocean' }
        ]
    }]);

    saveConfig({ theme: theme as ThemeType });
    refreshConfig();
    displaySuccess(`Tema değiştirildi: ${theme}`);
}

async function manageFavorites(): Promise<void> {
    const config = getConfig();

    const allFeatureKeys = Object.keys(ALL_FEATURES);

    const { favorites } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'favorites',
        message: 'Favori komutlarınızı seçin (menüde önce gösterilir):',
        choices: allFeatureKeys.map(key => ({
            name: ALL_FEATURES[key].name,
            value: key,
            checked: config.favorites.includes(key)
        })),
        pageSize: 15
    }]);

    saveConfig({ favorites });
    refreshConfig();
    displaySuccess(`Favoriler güncellendi: ${favorites.length} favori`);
}

async function manageAliases(): Promise<void> {
    const config = getConfig();

    console.log('\n' + chalk.bold('⌨️ Mevcut Alias\'lar'));
    console.log(chalk.gray('─'.repeat(40)));

    if (Object.keys(config.aliases).length === 0) {
        console.log(chalk.gray('  Henüz alias tanımlanmamış'));
    } else {
        Object.entries(config.aliases).forEach(([alias, command]) => {
            console.log(`  ${chalk.cyan(alias)} → ${command}`);
        });
    }

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Ne yapmak istersiniz?',
        choices: [
            { name: '➕ Yeni alias ekle', value: 'add' },
            { name: '🗑️ Alias sil', value: 'remove', disabled: Object.keys(config.aliases).length === 0 },
            { name: '⬅️ Geri', value: 'back' }
        ]
    }]);

    if (action === 'add') {
        const { alias, command } = await inquirer.prompt([
            {
                type: 'input',
                name: 'alias',
                message: 'Alias adı:',
                validate: (input: string) => input.trim().length > 0 || 'Alias adı boş olamaz'
            },
            {
                type: 'input',
                name: 'command',
                message: 'Komut:',
                validate: (input: string) => input.trim().length > 0 || 'Komut boş olamaz'
            }
        ]);

        const newAliases = { ...config.aliases, [alias]: command };
        saveConfig({ aliases: newAliases });
        refreshConfig();
        displaySuccess(`Alias eklendi: ${alias} → ${command}`);
    } else if (action === 'remove' && Object.keys(config.aliases).length > 0) {
        const { aliasToRemove } = await inquirer.prompt([{
            type: 'list',
            name: 'aliasToRemove',
            message: 'Silinecek alias:',
            choices: Object.keys(config.aliases)
        }]);

        const newAliases = { ...config.aliases };
        delete newAliases[aliasToRemove];
        saveConfig({ aliases: newAliases });
        refreshConfig();
        displaySuccess(`Alias silindi: ${aliasToRemove}`);
    }
}

function viewCurrentSettings(): void {
    const config = getConfig();

    console.log('\n' + chalk.bold('📋 Mevcut Ayarlar'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  Profil: ${getProfileDisplay(config.profile)}`);
    console.log(`  Tema: ${config.theme}`);
    console.log(`  Dil: ${config.language === 'tr' ? 'Türkçe' : 'English'}`);
    console.log(`  Conventional Commit: ${config.conventionalCommit ? 'Aktif' : 'Pasif'}`);

    if (config.profile === 'custom' && config.customFeatures.length > 0) {
        console.log(`\n  Custom Özellikler:`);
        config.customFeatures.forEach(f => {
            console.log(`    ${chalk.green('+')} ${ALL_FEATURES[f]?.name || f}`);
        });
    }

    if (config.favorites.length > 0) {
        console.log(`\n  Favoriler:`);
        config.favorites.forEach(f => {
            console.log(`    ${chalk.yellow('⭐')} ${ALL_FEATURES[f]?.name || f}`);
        });
    }

    if (Object.keys(config.aliases).length > 0) {
        console.log(`\n  Alias'lar:`);
        Object.entries(config.aliases).forEach(([alias, cmd]) => {
            console.log(`    ${chalk.cyan(alias)} → ${cmd}`);
        });
    }

    console.log();
}

async function resetSettings(): Promise<void> {
    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: chalk.red('Tüm ayarlar varsayılana sıfırlanacak. Emin misiniz?'),
        default: false
    }]);

    if (confirm) {
        saveConfig({
            profile: 'standard',
            customFeatures: [],
            theme: 'default',
            language: 'tr',
            aliases: {},
            favorites: [],
            conventionalCommit: false,
            aiProvider: 'none',
            aiApiKey: undefined,
            aiModel: undefined,
            aiEnabled: false
        });
        refreshConfig();
        displaySuccess('Ayarlar varsayılana sıfırlandı');
    }
}

// AI Ayarları Yönetimi
async function manageAISettings(): Promise<void> {
    const config = getConfig();

    console.log(chalk.bold('\n🤖 AI Ayarları'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`  Durum: ${config.aiEnabled ? chalk.green('Aktif') : chalk.gray('Pasif')}`);
    console.log(`  Provider: ${config.aiProvider !== 'none' ? AI_PROVIDERS[config.aiProvider].name : chalk.gray('Seçilmedi')}`);
    if (config.aiProvider !== 'none' && config.aiProvider !== 'ollama') {
        console.log(`  API Key: ${maskApiKey(config.aiApiKey)}`);
    }
    if (config.aiModel) {
        console.log(`  Model: ${config.aiModel}`);
    }

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Ne yapmak istersiniz?',
        choices: [
            { name: '⬅️  Geri', value: 'back' },
            new inquirer.Separator(),
            { name: `${config.aiEnabled ? '🔴' : '🟢'}  AI ${config.aiEnabled ? 'Kapat' : 'Aç'}`, value: 'toggle' },
            { name: '🔧  Provider seç', value: 'provider' },
            { name: '🔑  API Key gir', value: 'apikey' },
            { name: '📦  Model seç', value: 'model' },
            { name: '🧪  Bağlantı test et', value: 'test' }
        ],
        loop: false
    }]);

    if (action === 'back') return;

    switch (action) {
        case 'toggle':
            await toggleAI();
            break;
        case 'provider':
            await selectProvider();
            break;
        case 'apikey':
            await setApiKey();
            break;
        case 'model':
            await selectModel();
            break;
        case 'test':
            await testAIConnection();
            break;
    }

    // Menüye geri dön
    await manageAISettings();
}

async function toggleAI(): Promise<void> {
    const config = getConfig();
    const newValue = !config.aiEnabled;

    if (newValue && config.aiProvider === 'none') {
        displayWarning('Önce bir AI provider seçmelisiniz');
        return;
    }

    if (newValue && config.aiProvider !== 'ollama' && !config.aiApiKey) {
        displayWarning('Önce API key girmelisiniz');
        return;
    }

    saveConfig({ aiEnabled: newValue });
    refreshConfig();
    displaySuccess(`AI önerileri ${newValue ? 'aktif edildi' : 'devre dışı bırakıldı'}`);
}

async function selectProvider(): Promise<void> {
    const config = getConfig();

    const { provider } = await inquirer.prompt([{
        type: 'list',
        name: 'provider',
        message: 'AI Provider seçin:',
        default: config.aiProvider,
        choices: Object.entries(AI_PROVIDERS).map(([key, info]) => ({
            name: `${info.name} - ${info.description}`,
            value: key
        })),
        loop: false
    }]);

    const providerInfo = AI_PROVIDERS[provider as AIProviderType];

    saveConfig({
        aiProvider: provider as AIProviderType,
        aiModel: providerInfo.defaultModel
    });
    refreshConfig();
    displaySuccess(`Provider değiştirildi: ${providerInfo.name}`);

    // Ollama değilse API key sor
    if (provider !== 'none' && provider !== 'ollama') {
        const { setKey } = await inquirer.prompt([{
            type: 'confirm',
            name: 'setKey',
            message: 'API key girmek ister misiniz?',
            default: true
        }]);

        if (setKey) {
            await setApiKey();
        }
    }
}

async function setApiKey(): Promise<void> {
    const config = getConfig();

    if (config.aiProvider === 'none') {
        displayWarning('Önce bir AI provider seçin');
        return;
    }

    if (config.aiProvider === 'ollama') {
        displayInfo('Ollama yerel çalışır, API key gerektirmez');
        return;
    }

    const providerInfo = AI_PROVIDERS[config.aiProvider];

    console.log(chalk.gray(`\n${providerInfo.name} için API key girin.`));
    console.log(chalk.gray('API key güvenli bir şekilde ~/.plmhelperrc dosyasına kaydedilir.\n'));

    const { apiKey } = await inquirer.prompt([{
        type: 'password',
        name: 'apiKey',
        message: 'API Key:',
        mask: '*',
        validate: (input: string) => input.trim().length > 0 || 'API key boş olamaz'
    }]);

    saveConfig({ aiApiKey: apiKey.trim() });
    refreshConfig();
    displaySuccess('API key kaydedildi');
}

async function selectModel(): Promise<void> {
    const config = getConfig();

    if (config.aiProvider === 'none') {
        displayWarning('Önce bir AI provider seçin');
        return;
    }

    const providerInfo = AI_PROVIDERS[config.aiProvider];

    if (providerInfo.models.length === 0) {
        displayWarning('Bu provider için model seçeneği yok');
        return;
    }

    const { model } = await inquirer.prompt([{
        type: 'list',
        name: 'model',
        message: 'Model seçin:',
        default: config.aiModel || providerInfo.defaultModel,
        choices: providerInfo.models.map(m => ({ name: m, value: m })),
        loop: false
    }]);

    saveConfig({ aiModel: model });
    refreshConfig();
    displaySuccess(`Model değiştirildi: ${model}`);
}

async function testAIConnection(): Promise<void> {
    const config = getConfig();

    if (config.aiProvider === 'none') {
        displayWarning('Önce bir AI provider seçin');
        return;
    }

    if (config.aiProvider !== 'ollama' && !config.aiApiKey) {
        displayWarning('Önce API key girin');
        return;
    }

    const spinner = ora('Bağlantı test ediliyor...').start();

    try {
        const provider = createAIProvider(config);
        if (!provider) {
            spinner.fail('Provider oluşturulamadı');
            return;
        }

        const success = await provider.testConnection();

        if (success) {
            spinner.succeed(chalk.green('Bağlantı başarılı! ✓'));

            // AI'ı otomatik aktif et
            if (!config.aiEnabled) {
                const { enable } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'enable',
                    message: 'AI önerilerini aktif etmek ister misiniz?',
                    default: true
                }]);

                if (enable) {
                    saveConfig({ aiEnabled: true });
                    refreshConfig();
                    displaySuccess('AI önerileri aktif edildi');
                }
            }
        } else {
            spinner.fail(chalk.red('Bağlantı başarısız'));
            displayError('API key\'inizi veya provider ayarlarınızı kontrol edin');
        }
    } catch (error: any) {
        spinner.fail('Bağlantı hatası');
        displayError(error.message);
    }
}

