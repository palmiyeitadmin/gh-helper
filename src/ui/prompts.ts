import inquirer from 'inquirer';
import { gitOps, GitStatus } from '../git/operations';

export interface MainMenuChoice {
    action: 'commit' | 'commit-push' | 'status' | 'diff' | 'history' | 'stage' | 'pull' | 'branch' | 'stash' | 'tag' | 'merge' | 'remote' | 'exit';
}

export async function promptMainMenu(status: GitStatus): Promise<MainMenuChoice> {
    const choices = [];

    if (status.staged.length > 0) {
        choices.push({ name: '📝 Staged dosyaları commit\'le', value: 'commit' });
        choices.push({ name: '📤 Commit\'le ve push\'la', value: 'commit-push' });
    }

    if (status.modified.length > 0 || status.untracked.length > 0) {
        choices.push({ name: '➕ Dosyaları stage\'le', value: 'stage' });
    }

    choices.push(
        { name: '📊 Detaylı durumu görüntüle', value: 'status' },
        { name: '🔍 Diff görüntüle', value: 'diff' },
        { name: '📋 Geçmişi görüntüle', value: 'history' }
    );

    if (status.behind > 0) {
        choices.push({ name: '⬇️ Son değişiklikleri çek (pull)', value: 'pull' });
    }

    // New features
    choices.push(
        new inquirer.Separator('─── Gelişmiş Özellikler ───'),
        { name: '🔀 Branch yönetimi', value: 'branch' },
        { name: '📦 Stash yönetimi', value: 'stash' },
        { name: '🏷️ Tag yönetimi', value: 'tag' },
        { name: '⚔️ Merge/Rebase', value: 'merge' },
        { name: '🔗 Remote yönetimi (repo değiştir)', value: 'remote' }
    );

    choices.push(
        new inquirer.Separator(),
        { name: '❌ Çıkış', value: 'exit' }
    );

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Ne yapmak istersiniz?',
            choices,
            pageSize: 15
        }
    ]);

    return { action };
}

export async function promptStageFiles(files: string[]): Promise<string[]> {
    if (files.length === 0) {
        return [];
    }

    const { selectedFiles } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'selectedFiles',
            message: 'Stage\'lenecek dosyaları seçin:',
            choices: [
                { name: '📁 Tüm dosyaları stage\'le', value: '__ALL__' },
                new inquirer.Separator(),
                ...files.map(f => ({ name: f, value: f }))
            ]
        }
    ]);

    if (selectedFiles.includes('__ALL__')) {
        return files;
    }

    return selectedFiles;
}

export async function promptCommitMessage(suggestion: string): Promise<string> {
    const { useOption } = await inquirer.prompt([
        {
            type: 'list',
            name: 'useOption',
            message: 'Bu commit mesajını kullan?',
            choices: [
                { name: '✓ Evet, önerilen mesajı kullan', value: 'accept' },
                { name: '✏️ Öneriyi düzenle', value: 'edit' },
                { name: '📝 Kendi mesajımı yazayım', value: 'custom' }
            ]
        }
    ]);

    if (useOption === 'accept') {
        return suggestion;
    }

    if (useOption === 'edit') {
        const { editedMessage } = await inquirer.prompt([
            {
                type: 'input',
                name: 'editedMessage',
                message: 'Commit mesajını düzenle:',
                default: suggestion
            }
        ]);
        return editedMessage;
    }

    // Custom message
    const { customMessage } = await inquirer.prompt([
        {
            type: 'input',
            name: 'customMessage',
            message: 'Commit mesajı girin:',
            validate: (input: string) => input.length > 0 || 'Commit mesajı boş olamaz'
        }
    ]);

    return customMessage;
}

export async function promptConfirmPush(): Promise<boolean> {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'GitHub\'a push\'la?',
            default: true
        }
    ]);

    return confirm;
}

export async function promptConfirmAction(message: string): Promise<boolean> {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message,
            default: true
        }
    ]);

    return confirm;
}

export async function promptSelectCommitType(): Promise<string> {
    const types = [
        { name: 'feat: Yeni özellik', value: 'feat' },
        { name: 'fix: Hata düzeltme', value: 'fix' },
        { name: 'docs: Sadece dokümantasyon değişiklikleri', value: 'docs' },
        { name: 'style: Kod stili değişiklikleri', value: 'style' },
        { name: 'refactor: Kod yeniden düzenleme', value: 'refactor' },
        { name: 'test: Test ekleme veya güncelleme', value: 'test' },
        { name: 'chore: Bakım görevleri', value: 'chore' },
        { name: 'perf: Performans iyileştirmeleri', value: 'perf' },
        { name: 'build: Build sistemi değişiklikleri', value: 'build' },
        { name: 'ci: CI/CD yapılandırması', value: 'ci' }
    ];

    const { type } = await inquirer.prompt([
        {
            type: 'list',
            name: 'type',
            message: 'Commit türünü seçin:',
            choices: types
        }
    ]);

    return type;
}

export async function promptCommitScope(): Promise<string | undefined> {
    const { scope } = await inquirer.prompt([
        {
            type: 'input',
            name: 'scope',
            message: 'Kapsam girin (opsiyonel, atlamak için Enter):',
        }
    ]);

    return scope || undefined;
}

export async function promptCommitDescription(): Promise<string> {
    const { description } = await inquirer.prompt([
        {
            type: 'input',
            name: 'description',
            message: 'Commit açıklaması girin:',
            validate: (input: string) => input.length > 0 || 'Açıklama boş olamaz'
        }
    ]);

    return description;
}
