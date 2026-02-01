import boxen from 'boxen';
import inquirer from 'inquirer';

import fs from 'fs';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import { api, handleApiError } from '../lib/api.js';

function getProjectId(options) {
    if (options.project) return options.project;
    if (fs.existsSync('envault.json')) {
        const config = JSON.parse(fs.readFileSync('envault.json', 'utf-8'));
        return config.projectId;
    }
    return null;
}

export async function deploy(options) {
    const projectId = getProjectId(options);
    if (!projectId) {
        console.error(chalk.red('Error: No project linked. Run "envault init" or use --project <id>'));
        return;
    }

    const envPath = '.env';
    if (!fs.existsSync(envPath)) {
        console.error(chalk.red('Error: .env file not found.'));
        return;
    }

    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    const secrets = Object.entries(envConfig).map(([key, value]) => ({ key, value }));

    if (secrets.length === 0) {
        console.log(chalk.yellow('No secrets found in .env'));
        return;
    }

    if (options.dryRun) {
        console.log(chalk.blue(`Dry Run: Would deploy ${secrets.length} secrets to project ${projectId}`));
        secrets.forEach(s => console.log(`- ${s.key}`));
        return;
    }

    if (!options.force) {
        let projectName = 'Envault';
        try {
            // Attempt to fetch project name. If fails, fallback to 'Envault'
            // We use the list endpoint as we know it exists from init.js
            const { data } = await api.get('/projects');
            const projects = data.projects || data.data || [];
            const project = projects.find(p => p.id === projectId);
            if (project) {
                projectName = project.name;
            }
        } catch (e) {
            // Ignore error and use default
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://envault.tech';

        console.log(boxen(
            chalk.red.bold('WARNING: OVERWRITING REMOTE SECRETS') +
            '\n\n' +
            chalk.white('You are about to ') + chalk.red.bold('DEPLOY') + chalk.white(' local variables to your project:') +
            '\n' +
            chalk.cyan.bold(projectName) +
            '\n\n' +
            chalk.white('Existing secrets in the project will be ') + chalk.red.bold('OVERWRITTEN') + chalk.white(' by values in your .env.') +
            '\n\n' +
            chalk.dim('We recommend checking the dashboard for differences:') +
            '\n' +
            chalk.cyan(`${appUrl}/projects/${projectId}`),
            {
                padding: 1,
                margin: 1,
                borderStyle: 'double',
                borderColor: 'red',
                title: 'Deploy Warning',
                titleAlignment: 'center'
            }
        ));

        const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to deploy ${secrets.length} secrets to the project?`,
            default: false
        }]);
        if (!confirm) {
            console.log(chalk.yellow('Operation cancelled.'));
            return;
        }
    }

    const spinner = ora('Encrypting and deploying secrets...').start();

    try {
        const { data } = await api.post(`/projects/${projectId}/secrets`, { secrets });
        spinner.succeed(chalk.green(`✔ Successfully deployed ${secrets.length} secrets!`));
    } catch (error) {
        spinner.fail('Deploy failed.');
        console.error(chalk.red(handleApiError(error)));
    }
}
