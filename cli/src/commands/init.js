
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
        try {
            const { confirm } = await inquirer.prompt([{
                type: 'confirm',
                name: 'confirm',
                message: 'Do you want to overwrite it?',
                default: false
            }]);
            if (!confirm) return;
        } catch (error) {
            if (error.message.includes('User force closed') || error.name === 'ExitPromptError') {
                console.log('\nOperation cancelled.');
                return;
            }
            throw error;
        }
    }

    const spinner = ora('Fetching your projects...').start();
    let projectsData = { projects: [], owned: [], shared: [] };

    try {
        const { data } = await api.get('/projects');
        // Handle both structure types
        if (data.owned && data.shared) {
            projectsData = data;
        } else if (Array.isArray(data.projects)) {
            projectsData.projects = data.projects;
            // Fallback using isOwner if available, otherwise strict equality if properties exist
            projectsData.owned = data.projects.filter(p => p.isOwner);
            projectsData.shared = data.projects.filter(p => !p.isOwner);
        } else {
            projectsData.projects = data.data || [];
        }
        spinner.succeed('Projects fetched.');
        console.log(''); // Clear line
    } catch (error) {
        spinner.fail('Failed to fetch projects.');
        console.error(chalk.red(handleApiError(error)));
        return;
    }

    try {
        // 1. Category Selection
        const { category } = await inquirer.prompt([{
            type: 'checkbox',
            name: 'category',
            message: 'Where do you want to select the project from?',
            choices: [
                { name: 'All Projects', value: 'ALL' },
                { name: 'My Projects', value: 'OWNED' },
                { name: 'Shared With Me', value: 'SHARED' }
            ],
            instructions: ' (Press <space> to select one, <enter> to confirm)',
            validate: (answer) => {
                if (answer.length !== 1) {
                    return 'Please select exactly one category.';
                }
                return true;
            }
        }]);

        const selectedCategory = category[0]; // Checkbox returns array

        let projectChoices = [];
        let allowCreate = true;

        // 2. Filter Projects
        if (selectedCategory === 'OWNED') {
            projectChoices = projectsData.owned || [];
        } else if (selectedCategory === 'SHARED') {
            projectChoices = projectsData.shared || [];
            allowCreate = false;
        } else {
            // ALL
            projectChoices = projectsData.projects || [...(projectsData.owned || []), ...(projectsData.shared || [])];
        }

        // Deduplicate
        const uniqueMap = new Map();
        projectChoices.forEach(p => uniqueMap.set(p.id, p));
        projectChoices = Array.from(uniqueMap.values());

        if (projectChoices.length === 0 && !allowCreate) {
            console.log(chalk.yellow('No projects found in this category.'));
            return;
        }

        const choices = [];

        if (allowCreate) {
            choices.push(new inquirer.Separator());
            choices.push({ name: '+ Create New Project', value: 'CREATE_NEW' });
            choices.push(new inquirer.Separator());
        }

        if (projectChoices.length > 0) {
            choices.push(...projectChoices.map(p => ({
                name: `${p.name} ${p.role ? chalk.gray(`(${p.role})`) : ''}`,
                value: p.id
            })));
        }

        if (choices.length === 0) {
            console.log(chalk.yellow('No projects available to select.'));
            return;
        }

        const { selectedProjectId } = await inquirer.prompt([{
            type: 'checkbox',
            name: 'selectedProjectId',
            message: 'Select the project to link:',
            choices: choices,
            loop: false,
            pageSize: 15,
            instructions: ' (Press <space> to select one, <enter> to confirm)',
            validate: (answer) => {
                if (answer.length !== 1) {
                    return 'Please select exactly one project.';
                }
                return true;
            }
        }]);

        let projectId = selectedProjectId[0];

        if (projectId === 'CREATE_NEW') {
            const { newProjectName } = await inquirer.prompt([{
                type: 'input',
                name: 'newProjectName',
                message: 'Enter name for the new project:',
                validate: input => input.trim().length > 0 ? true : 'Project name cannot be empty'
            }]);

            const createSpinner = ora('Creating project...').start();
            try {
                const { data } = await api.post('/projects', { name: newProjectName });
                projectId = data.project.id;
                createSpinner.succeed(chalk.green(`Project "${data.project.name}" created!`));
            } catch (error) {
                createSpinner.fail('Failed to create project.');
                console.error(chalk.red(handleApiError(error)));
                return; // Exit if creation fails
            }
        }

        // Only write config if we have a valid projectId
        if (projectId) {
            fs.writeFileSync('envault.json', JSON.stringify({ projectId }, null, 2));
            console.log(chalk.green(`\n✔ Project linked! (ID: ${projectId})`));
        }

    } catch (error) {
        if (error.message.includes('User force closed') || error.name === 'ExitPromptError') {
            console.log('\nOperation cancelled.');
            return;
        }
        console.error(chalk.red('\nAn unexpected error occurred:'), error.message);
    }
}
