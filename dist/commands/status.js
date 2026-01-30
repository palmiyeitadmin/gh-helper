"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showStatus = showStatus;
const ora_1 = __importDefault(require("ora"));
const operations_1 = require("../git/operations");
const display_1 = require("../ui/display");
async function showStatus() {
    const projectName = operations_1.gitOps.getProjectName();
    (0, display_1.displayHeader)(projectName);
    const spinner = (0, ora_1.default)('Durum yükleniyor...').start();
    try {
        const status = await operations_1.gitOps.getStatus();
        const remoteUrl = await operations_1.gitOps.getRemoteUrl();
        spinner.stop();
        console.log(`\n📍 Remote: ${remoteUrl}`);
        (0, display_1.displayStatus)(status);
        (0, display_1.displayStagedFiles)(status.staged);
        if (status.staged.length > 0) {
            const diff = await operations_1.gitOps.getStagedDiff();
            (0, display_1.displayDiff)(diff);
        }
    }
    catch (error) {
        spinner.fail(`Durum alınamadı: ${error}`);
        process.exit(1);
    }
}
