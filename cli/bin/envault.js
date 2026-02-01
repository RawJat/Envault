#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import { login } from '../src/commands/login.js';
import { init } from '../src/commands/init.js';
import { deploy } from '../src/commands/deploy.js';
import { pull } from '../src/commands/pull.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

// Gradient Logo Helper
const showLogo = () => {
    console.log(chalk.bold.hex('#10B981')(`
  ███████╗███╗   ██╗██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗
  ██╔════╝████╗  ██║██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝
  █████╗  ██╔██╗ ██║██║   ██║███████║██║   ██║██║     ██║   
  ██╔══╝  ██║╚██╗██║╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   
  ███████╗██║ ╚████║ ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   
  ╚══════╝╚═╝  ╚═══╝  ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   
`));
    console.log(chalk.dim('  Secure Environment Variable Management\n'));
};

program
    .name('envault')
    .description('Cliff-side security for your environment variables')
    .version(pkg.version)
    .hook('preAction', (thisCommand) => {
        // Show logo on all commands? Maybe too noisy.
        // Let's show it only on help or specific ones.
        // Or just a mini header.
    });

program.command('login')
    .description('Authenticate with Envault using Device Flow')
    .action(async () => {
        showLogo();
        await login();
    });

program.command('init')
    .description('Initialize Envault in the current directory')
    .action(async () => {
        await init();
    });

program.command('deploy')
    .description('Deploy local .env to Envault (Encrypt & Push)')
    .option('-p, --project <id>', 'Project ID')
    .option('--dry-run', 'Show what would change without pushing')
    .option('-f, --force', 'Skip confirmation prompts')
    .action(async (options) => {
        await deploy(options);
    });

program.command('pull')
    .description('Pull secrets from Envault to local .env')
    .option('-p, --project <id>', 'Project ID')
    .option('-f, --force', 'Overwrite local .env without asking')
    .action(async (options) => {
        await pull(options);
    });

program.parse();
