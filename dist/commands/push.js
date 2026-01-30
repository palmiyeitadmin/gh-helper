"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushToGithub = pushToGithub;
const ora_1 = __importDefault(require("ora"));
const operations_1 = require("../git/operations");
const display_1 = require("../ui/display");
const prompts_1 = require("../ui/prompts");
async function pushToGithub() {
    const projectName = operations_1.gitOps.getProjectName();
    (0, display_1.displayHeader)(projectName);
    const spinner = (0, ora_1.default)('Durum kontrol ediliyor...').start();
    try {
        const status = await operations_1.gitOps.getStatus();
        const remoteUrl = await operations_1.gitOps.getRemoteUrl();
        spinner.stop();
        console.log(`\n📍 Remote: ${remoteUrl}`);
        console.log(`📊 Branch: ${status.branch}`);
        if (status.ahead === 0) {
            (0, display_1.displayWarning)('Push edilecek commit yok. Remote ile güncelsiniz.');
            return;
        }
        console.log(`\n⬆️ ${status.ahead} commit push edilecek`);
        if (status.behind > 0) {
            (0, display_1.displayWarning)(`Remote\'dan ${status.behind} commit gerideyiniz. Önce pull yapmayı düşünün.`);
            const shouldContinue = await (0, prompts_1.promptConfirmAction)('Yine de push\'a devam et?');
            if (!shouldContinue) {
                return;
            }
        }
        const confirm = await (0, prompts_1.promptConfirmAction)('GitHub\'a push\'la?');
        if (!confirm) {
            console.log('\nPush iptal edildi.');
            return;
        }
        const pushSpinner = (0, ora_1.default)(`origin/${status.branch} branch\'ına gönderiliyor...`).start();
        await operations_1.gitOps.push();
        pushSpinner.succeed('GitHub\'a başarıyla gönderildi!');
    }
    catch (error) {
        (0, display_1.displayError)(`Push başarısız: ${error}`);
        process.exit(1);
    }
}
