
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { api, handleApiError } from '../lib/api.js';

export async function init() {
    // Check config existing
    if (fs.existsSync('envault.json')) {
        console.log(chalk.yellow('envault.json already exists in this directory.'));
        const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'Do you want to overwrite it?',
            default: false
        }]);
        if (!confirm) return;
    }

    const spinner = ora('Fetching your projects...').start();
    let projects = [];

    // We can't use /projects directly if we implemented /cli/projects/... 
    // Wait, I implemented /projects (standard API)? No, I only implemented /api/cli/projects/[id]/secrets
    // I need a list projects endpoint for the CLI to pick from!
    // I missed `GET /api/cli/projects` in the plan implementation step 105.
    // I should probably add it now or reusing the frontend logic if possible? 
    // Or just "Enter Project ID" fallback? 
    // "Interactive project picker" was promised. I need that endpoint.

    // Quick fix: Add the endpoint after this file creation.

    try {
        const { data } = await api.get('/projects'); // Assuming exists or I will create it next.
        projects = data.projects || data.data || []; // Adjust based on API response structure
        spinner.stop();
    } catch (error) {
        spinner.fail('Failed to fetch projects.');
        console.error(chalk.red(handleApiError(error)));
        return;
    }

    if (projects.length === 0) {
        console.log(chalk.yellow('No projects found. Create one in the dashboard first.'));
        return;
    }

    const { projectId } = await inquirer.prompt([{
        type: 'list',
        name: 'projectId',
        message: 'Select the project to link:',
        choices: projects.map(p => ({ name: p.name, value: p.id }))
    }]);

    fs.writeFileSync('envault.json', JSON.stringify({ projectId }, null, 2));
    console.log(chalk.green(`\n✔ Project linked! (ID: ${projectId})`));
}
