
import fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';

import inquirer from 'inquirer';
import { api, handleApiError } from '../lib/api.js';

function getProjectId(options) {
    if (options.project) return options.project;
    if (fs.existsSync('envault.json')) {
        const config = JSON.parse(fs.readFileSync('envault.json', 'utf-8'));
        return config.projectId;
    }
    return null;
}

export async function pull(options) {
    const projectId = getProjectId(options);
    if (!projectId) {
        console.error(chalk.red('Error: No project linked. Run "envault init" or use --project <id>'));
        return;
    }

    if (fs.existsSync('.env') && !options.force) {
        let projectName = 'Envault';
        try {
            const { data } = await api.get('/projects');
            const projects = data.projects || data.data || [];
            const project = projects.find(p => p.id === projectId);
            if (project) {
                projectName = project.name;
            }
        } catch (e) {
            // Ignore
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://envault.tech';

        console.log(boxen(
            chalk.red.bold('WARNING: POTENTIAL DATA LOSS') +
            '\n\n' +
            chalk.white('You are about to ') + chalk.red.bold('OVERWRITE') + chalk.white(' your local ') + chalk.yellow('.env') + chalk.white(' file.') +
            '\n\n' +
            chalk.white('Any local changes not synced to ') + chalk.cyan.bold(projectName) + chalk.white(' will be ') + chalk.red.bold('PERMANENTLY LOST.') +
            '\n\n' +
            chalk.dim('We recommend checking the dashboard for differences:') +
            '\n' +
            chalk.cyan(`${appUrl}/projects/${projectId}`),
            {
                padding: 1,
                margin: 1,
                borderStyle: 'double',
                borderColor: 'red',
                title: 'Sync Warning',
                titleAlignment: 'center'
            }
        ));

        const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to overwrite your local .env file?',
            default: false
        }]);
        if (!confirm) {
            console.log(chalk.yellow('Operation cancelled.'));
            return;
        }
    }

    const spinner = ora('Fetching secrets...').start();

    try {
        const { data } = await api.get(`/projects/${projectId}/secrets`);
        // data.secrets = [{key, value}]

        if (!data.secrets || data.secrets.length === 0) {
            spinner.info('No secrets found for this project.');
            return;
        }

        const envContent = data.secrets
            .map(s => `${s.key}="${s.value}"`) // Quote values to be safe
            .join('\n');

        fs.writeFileSync('.env', envContent);
        spinner.succeed(chalk.green(`✔ Pulled ${data.secrets.length} secrets to .env`));

    } catch (error) {
        spinner.fail('Pull failed.');
        console.error(chalk.red(handleApiError(error)));
    }
}
