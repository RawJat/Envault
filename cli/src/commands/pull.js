
import fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
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
        const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'This will overwrite your current .env file. Continue?',
            default: false
        }]);
        if (!confirm) return;
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
