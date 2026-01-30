"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showHistory = showHistory;
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const operations_1 = require("../git/operations");
const display_1 = require("../ui/display");
async function showHistory(count = 10) {
    const projectName = operations_1.gitOps.getProjectName();
    (0, display_1.displayHeader)(projectName);
    const spinner = (0, ora_1.default)('Commit geçmişi yükleniyor...').start();
    try {
        const commits = await operations_1.gitOps.getRecentCommits(count);
        const status = await operations_1.gitOps.getStatus();
        spinner.stop();
        console.log(`\n📊 Branch: ${chalk_1.default.cyan(status.branch)}`);
        if (status.ahead > 0) {
            console.log(`   ${chalk_1.default.yellow('↑')} Remote\'dan ${status.ahead} commit önde`);
        }
        if (status.behind > 0) {
            console.log(`   ${chalk_1.default.red('↓')} Remote\'dan ${status.behind} commit geride`);
        }
        (0, display_1.displayRecentCommits)(commits);
        console.log(`\n${chalk_1.default.gray(`Son ${commits.length} commit gösteriliyor`)}\n`);
    }
    catch (error) {
        spinner.fail(`Geçmiş yüklenemedi: ${error}`);
        process.exit(1);
    }
}
