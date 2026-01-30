#!/usr/bin/env node

import { program } from 'commander';
import { showDashboard } from './commands/dashboard';
import { showStatus } from './commands/status';
import { interactiveCommit } from './commands/commit';
import { pushToGithub } from './commands/push';
import { showHistory } from './commands/history';
import { initRepository, cloneRepository } from './commands/init';

program
    .name('git-helper')
    .description('AI destekli commit mesaj önerileri ile interaktif Git CLI yardımcısı')
    .version('1.0.0');

program
    .command('status')
    .description('Detaylı git durumunu göster')
    .action(showStatus);

program
    .command('commit')
    .description('AI önerileri ile interaktif commit')
    .action(interactiveCommit);

program
    .command('push')
    .description('GitHub\'a push\'la')
    .action(pushToGithub);

program
    .command('history')
    .alias('log')
    .description('Son commit\'leri göster')
    .option('-n, --number <count>', 'Gösterilecek commit sayısı', '10')
    .action((options) => showHistory(parseInt(options.number)));

program
    .command('init')
    .alias('i')
    .description('Git repo başlat ve remote bağla (GitHub, GitLab, Bitbucket, Azure DevOps)')
    .action(initRepository);

program
    .command('clone')
    .alias('c')
    .description('Uzak repoyu klonla')
    .action(cloneRepository);

// Default: show interactive dashboard
if (process.argv.length === 2) {
    showDashboard();
} else {
    program.parse();
}
