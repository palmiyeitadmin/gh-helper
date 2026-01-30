import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { gitOps } from '../git/operations';
import { displayHeader, displaySuccess, displayError, displayWarning } from '../ui/display';

// Dashboard'dan çağrılan loop'lu menü
export async function manageTagsMenu(): Promise<void> {
    let running = true;
    while (running) {
        const shouldContinue = await showTagMenuWithReturn();
        if (!shouldContinue) {
            running = false;
        }
    }
}

// Standalone CLI komutu için
export async function manageTags(): Promise<void> {
    const projectName = gitOps.getProjectName();
    displayHeader(projectName);

    try {
        await showTagMenuWithReturn();
    } catch (error) {
        displayError(`Tag işlemi başarısız: ${error}`);
    }
}

async function showTagMenuWithReturn(): Promise<boolean> {
    const spinner = ora('Tag\'ler yükleniyor...').start();
    const tags = await gitOps.getTags();
    spinner.stop();

    console.log(`\n🏷️ Tag Listesi (${tags.length} tag)`);
    console.log(chalk.gray('─'.repeat(40)));

    if (tags.length === 0) {
        console.log(chalk.gray('  Henüz tag yok'));
    } else {
        tags.slice(-10).reverse().forEach(t => {
            console.log(`  ${chalk.green(t.name)} ${chalk.gray(t.commit)}`);
        });
        if (tags.length > 10) {
            console.log(chalk.gray(`  ... ve ${tags.length - 10} tag daha`));
        }
    }

    const choices = [
        { name: '➕ Yeni tag oluştur', value: 'create' },
    ];

    if (tags.length > 0) {
        choices.push(
            { name: '📤 Tag\'i push\'la', value: 'push' },
            { name: '📤 Tüm tag\'leri push\'la', value: 'push-all' },
            { name: '🗑️ Tag sil', value: 'delete' },
            { name: '📋 Tüm tag\'leri listele', value: 'list-all' }
        );
    }

    choices.push({ name: '⬅️ Ana menüye dön', value: 'back' });

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Ne yapmak istersiniz?',
            choices
        }
    ]);

    if (action === 'back') {
        return false;
    }

    switch (action) {
        case 'create':
            await createTag();
            break;
        case 'push':
            await pushTag(tags.map(t => t.name));
            break;
        case 'push-all':
            await pushAllTags();
            break;
        case 'delete':
            await deleteTag(tags.map(t => t.name));
            break;
        case 'list-all':
            await listAllTags();
            break;
    }
    return true;
}

async function createTag(): Promise<void> {
    const { tagName, tagType } = await inquirer.prompt([
        {
            type: 'input',
            name: 'tagName',
            message: 'Tag adı (örn: v1.0.0):',
            validate: (input: string) => {
                if (!input.trim()) return 'Tag adı boş olamaz';
                if (input.includes(' ')) return 'Tag adı boşluk içeremez';
                return true;
            }
        },
        {
            type: 'list',
            name: 'tagType',
            message: 'Tag türü:',
            choices: [
                { name: '📝 Annotated tag (mesajlı, önerilen)', value: 'annotated' },
                { name: '🏷️ Lightweight tag (basit)', value: 'lightweight' }
            ]
        }
    ]);

    let message: string | undefined;

    if (tagType === 'annotated') {
        const { tagMessage } = await inquirer.prompt([
            {
                type: 'input',
                name: 'tagMessage',
                message: 'Tag mesajı:',
                default: `Release ${tagName}`
            }
        ]);
        message = tagMessage;
    }

    const { shouldPush } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'shouldPush',
            message: 'Tag\'i hemen push\'la?',
            default: true
        }
    ]);

    const spinner = ora(`${tagName} tag\'i oluşturuluyor...`).start();

    try {
        await gitOps.createTag(tagName, message);
        spinner.succeed(`${tagName} tag\'i oluşturuldu`);

        if (shouldPush) {
            const pushSpinner = ora('Tag push\'lanıyor...').start();
            try {
                await gitOps.pushTag(tagName);
                pushSpinner.succeed('Tag push\'landı');
            } catch (error) {
                pushSpinner.fail(`Tag push başarısız: ${error}`);
            }
        }
    } catch (error) {
        spinner.fail(`Tag oluşturulamadı: ${error}`);
    }
}

async function pushTag(tags: string[]): Promise<void> {
    const { tag } = await inquirer.prompt([
        {
            type: 'list',
            name: 'tag',
            message: 'Hangi tag\'i push\'lamak istiyorsunuz?',
            choices: tags.reverse()
        }
    ]);

    const spinner = ora(`${tag} push\'lanıyor...`).start();

    try {
        await gitOps.pushTag(tag);
        spinner.succeed(`${tag} push\'landı`);
    } catch (error) {
        spinner.fail(`Tag push başarısız: ${error}`);
    }
}

async function pushAllTags(): Promise<void> {
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Tüm tag\'leri push\'lamak istediğinizden emin misiniz?',
            default: true
        }
    ]);

    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }

    const spinner = ora('Tüm tag\'ler push\'lanıyor...').start();

    try {
        await gitOps.pushAllTags();
        spinner.succeed('Tüm tag\'ler push\'landı');
    } catch (error) {
        spinner.fail(`Tag\'ler push\'lanamadı: ${error}`);
    }
}

async function deleteTag(tags: string[]): Promise<void> {
    const { tag, deleteRemote } = await inquirer.prompt([
        {
            type: 'list',
            name: 'tag',
            message: 'Hangi tag\'i silmek istiyorsunuz?',
            choices: tags.reverse()
        },
        {
            type: 'confirm',
            name: 'deleteRemote',
            message: 'Remote\'daki tag da silinsin mi?',
            default: false
        }
    ]);

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `${chalk.red(tag)} tag\'ini silmek istediğinizden emin misiniz?`,
            default: false
        }
    ]);

    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }

    const spinner = ora(`${tag} siliniyor...`).start();

    try {
        await gitOps.deleteTag(tag);
        spinner.succeed(`${tag} yerel tag silindi`);

        if (deleteRemote) {
            const remoteSpinner = ora('Remote tag siliniyor...').start();
            try {
                await gitOps.deleteRemoteTag(tag);
                remoteSpinner.succeed('Remote tag da silindi');
            } catch (error) {
                remoteSpinner.fail(`Remote tag silinemedi: ${error}`);
            }
        }
    } catch (error) {
        spinner.fail(`Tag silinemedi: ${error}`);
    }
}

async function listAllTags(): Promise<void> {
    const spinner = ora('Tag\'ler yükleniyor...').start();

    try {
        const tags = await gitOps.getTags();
        spinner.stop();

        console.log('\n' + chalk.bold('🏷️ Tüm Tag\'ler'));
        console.log(chalk.gray('─'.repeat(50)));

        if (tags.length === 0) {
            console.log(chalk.gray('  Henüz tag yok'));
        } else {
            tags.reverse().forEach(t => {
                console.log(`  ${chalk.green(t.name)} ${chalk.gray(t.commit)}`);
            });
        }
    } catch (error) {
        spinner.fail(`Tag\'ler yüklenemedi: ${error}`);
    }
}
