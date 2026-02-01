
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

    const spinner = ora('Encrypting and deploying secrets...').start();

    try {
        const { data } = await api.post(`/projects/${projectId}/secrets`, { secrets });
        spinner.succeed(chalk.green(`✔ Successfully deployed ${secrets.length} secrets!`));
    } catch (error) {
        spinner.fail('Deploy failed.');
        console.error(chalk.red(handleApiError(error)));
    }
}
