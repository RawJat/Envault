
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import open from 'open';
import { api, handleApiError } from '../lib/api.js';
import { setToken } from '../lib/config.js';
import os from 'os';

export async function login() {
    console.log(chalk.blue('  Starting Device Authentication Flow...\n'));

    // 1. Request Code
    const spinner = ora('Contacting Envault servers...').start();
    let deviceCode, userCode, verificationUri, interval;

    const deviceInfo = {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        arch: os.arch()
    };

    try {
        const { data } = await api.post('/auth/device/code', { device_info: deviceInfo });
        deviceCode = data.device_code;
        userCode = data.user_code; // 8-char
        verificationUri = data.verification_uri;
        interval = data.interval || 2;
        spinner.succeed('Device code generated.');
    } catch (error) {
        spinner.fail('Failed to initiate login.');
        console.error(chalk.red('Error: ' + handleApiError(error)));
        return;
    }

    // 2. Display Code
    console.log('\nPlease visit: ' + chalk.cyan.underline(verificationUri));

    console.log(boxen(chalk.green.bold(userCode), {
        title: 'Authentication Code',
        titleAlignment: 'center',
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
    }));

    // Open browser automatically
    try {
        await open(verificationUri);
    } catch (e) {
        // Ignore if fails (headless env)
    }

    // 3. Poll for Token
    spinner.text = 'Waiting for browser approval...';
    spinner.start();

    const poll = async () => {
        while (true) {
            try {
                const { data } = await api.post('/auth/device/token', { device_code: deviceCode });
                if (data.access_token) {
                    return data.access_token;
                }
            } catch (error) {
                const errMsg = error.response?.data?.error;
                if (errMsg === 'authorization_pending') {
                    // Continue waiting
                } else if (errMsg === 'access_denied') {
                    throw new Error('Access denied by user.');
                } else if (errMsg === 'expired_token') {
                    throw new Error('Code expired. Please try again.');
                } else {
                    // Unknown error
                    // throw new Error(handleApiError(error));
                }
            }

            // Wait interval
            await new Promise(resolve => setTimeout(resolve, interval * 1000));
        }
    };

    try {
        const token = await poll();
        setToken(token);
        spinner.succeed(chalk.green('Successfully authenticated! Token saved.'));
    } catch (error) {
        spinner.fail('Authentication failed.');
        console.error(chalk.red(error.message));
    }
}
