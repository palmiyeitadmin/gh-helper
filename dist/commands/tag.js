"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageTags = manageTags;
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const operations_1 = require("../git/operations");
const display_1 = require("../ui/display");
async function manageTags() {
    const projectName = operations_1.gitOps.getProjectName();
    (0, display_1.displayHeader)(projectName);
    try {
        await showTagMenu();
    }
    catch (error) {
        (0, display_1.displayError)(`Tag işlemi başarısız: ${error}`);
    }
}
async function showTagMenu() {
    const spinner = (0, ora_1.default)('Tag\'ler yükleniyor...').start();
    const tags = await operations_1.gitOps.getTags();
    spinner.stop();
    console.log(`\n🏷️ Tag Listesi (${tags.length} tag)`);
    console.log(chalk_1.default.gray('─'.repeat(40)));
    if (tags.length === 0) {
        console.log(chalk_1.default.gray('  Henüz tag yok'));
    }
    else {
        tags.slice(-10).reverse().forEach(t => {
            console.log(`  ${chalk_1.default.green(t.name)} ${chalk_1.default.gray(t.commit)}`);
        });
        if (tags.length > 10) {
            console.log(chalk_1.default.gray(`  ... ve ${tags.length - 10} tag daha`));
        }
    }
    const choices = [
        { name: '➕ Yeni tag oluştur', value: 'create' },
    ];
    if (tags.length > 0) {
        choices.push({ name: '📤 Tag\'i push\'la', value: 'push' }, { name: '📤 Tüm tag\'leri push\'la', value: 'push-all' }, { name: '🗑️ Tag sil', value: 'delete' }, { name: '📋 Tüm tag\'leri listele', value: 'list-all' });
    }
    choices.push({ name: '❌ Geri dön', value: 'back' });
    const { action } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Ne yapmak istersiniz?',
            choices
        }
    ]);
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
}
async function createTag() {
    const { tagName, tagType } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'tagName',
            message: 'Tag adı (örn: v1.0.0):',
            validate: (input) => {
                if (!input.trim())
                    return 'Tag adı boş olamaz';
                if (input.includes(' '))
                    return 'Tag adı boşluk içeremez';
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
    let message;
    if (tagType === 'annotated') {
        const { tagMessage } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'tagMessage',
                message: 'Tag mesajı:',
                default: `Release ${tagName}`
            }
        ]);
        message = tagMessage;
    }
    const { shouldPush } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'shouldPush',
            message: 'Tag\'i hemen push\'la?',
            default: true
        }
    ]);
    const spinner = (0, ora_1.default)(`${tagName} tag\'i oluşturuluyor...`).start();
    try {
        await operations_1.gitOps.createTag(tagName, message);
        spinner.succeed(`${tagName} tag\'i oluşturuldu`);
        if (shouldPush) {
            const pushSpinner = (0, ora_1.default)('Tag push\'lanıyor...').start();
            try {
                await operations_1.gitOps.pushTag(tagName);
                pushSpinner.succeed('Tag push\'landı');
            }
            catch (error) {
                pushSpinner.fail(`Tag push başarısız: ${error}`);
            }
        }
    }
    catch (error) {
        spinner.fail(`Tag oluşturulamadı: ${error}`);
    }
}
async function pushTag(tags) {
    const { tag } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'tag',
            message: 'Hangi tag\'i push\'lamak istiyorsunuz?',
            choices: tags.reverse()
        }
    ]);
    const spinner = (0, ora_1.default)(`${tag} push\'lanıyor...`).start();
    try {
        await operations_1.gitOps.pushTag(tag);
        spinner.succeed(`${tag} push\'landı`);
    }
    catch (error) {
        spinner.fail(`Tag push başarısız: ${error}`);
    }
}
async function pushAllTags() {
    const { confirm } = await inquirer_1.default.prompt([
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
    const spinner = (0, ora_1.default)('Tüm tag\'ler push\'lanıyor...').start();
    try {
        await operations_1.gitOps.pushAllTags();
        spinner.succeed('Tüm tag\'ler push\'landı');
    }
    catch (error) {
        spinner.fail(`Tag\'ler push\'lanamadı: ${error}`);
    }
}
async function deleteTag(tags) {
    const { tag, deleteRemote } = await inquirer_1.default.prompt([
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
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `${chalk_1.default.red(tag)} tag\'ini silmek istediğinizden emin misiniz?`,
            default: false
        }
    ]);
    if (!confirm) {
        console.log('İptal edildi.');
        return;
    }
    const spinner = (0, ora_1.default)(`${tag} siliniyor...`).start();
    try {
        await operations_1.gitOps.deleteTag(tag);
        spinner.succeed(`${tag} yerel tag silindi`);
        if (deleteRemote) {
            const remoteSpinner = (0, ora_1.default)('Remote tag siliniyor...').start();
            try {
                await operations_1.gitOps.deleteRemoteTag(tag);
                remoteSpinner.succeed('Remote tag da silindi');
            }
            catch (error) {
                remoteSpinner.fail(`Remote tag silinemedi: ${error}`);
            }
        }
    }
    catch (error) {
        spinner.fail(`Tag silinemedi: ${error}`);
    }
}
async function listAllTags() {
    const spinner = (0, ora_1.default)('Tag\'ler yükleniyor...').start();
    try {
        const tags = await operations_1.gitOps.getTags();
        spinner.stop();
        console.log('\n' + chalk_1.default.bold('🏷️ Tüm Tag\'ler'));
        console.log(chalk_1.default.gray('─'.repeat(50)));
        if (tags.length === 0) {
            console.log(chalk_1.default.gray('  Henüz tag yok'));
        }
        else {
            tags.reverse().forEach(t => {
                console.log(`  ${chalk_1.default.green(t.name)} ${chalk_1.default.gray(t.commit)}`);
            });
        }
    }
    catch (error) {
        spinner.fail(`Tag\'ler yüklenemedi: ${error}`);
    }
}
