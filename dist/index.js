#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const dashboard_1 = require("./commands/dashboard");
const status_1 = require("./commands/status");
const commit_1 = require("./commands/commit");
const push_1 = require("./commands/push");
const history_1 = require("./commands/history");
commander_1.program
    .name('git-helper')
    .description('AI destekli commit mesaj önerileri ile interaktif Git CLI yardımcısı')
    .version('1.0.0');
commander_1.program
    .command('status')
    .description('Detaylı git durumunu göster')
    .action(status_1.showStatus);
commander_1.program
    .command('commit')
    .description('AI önerileri ile interaktif commit')
    .action(commit_1.interactiveCommit);
commander_1.program
    .command('push')
    .description('GitHub\'a push\'la')
    .action(push_1.pushToGithub);
commander_1.program
    .command('history')
    .alias('log')
    .description('Son commit\'leri göster')
    .option('-n, --number <count>', 'Gösterilecek commit sayısı', '10')
    .action((options) => (0, history_1.showHistory)(parseInt(options.number)));
// Default: show interactive dashboard
if (process.argv.length === 2) {
    (0, dashboard_1.showDashboard)();
}
else {
    commander_1.program.parse();
}
