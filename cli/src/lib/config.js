
import Conf from 'conf';

// Schema:
// {
//   "auth": {
//     "token": "..."
//   }
// }

const config = new Conf({
    projectName: 'envault-cli',
    projectSuffix: ''
});

export function getToken() {
    return config.get('auth.token');
}

export function setToken(token) {
    config.set('auth.token', token);
}

export function clearToken() {
    config.delete('auth.token');
}

export function getApiUrl() {
    // Check for developer override first
    if (process.env.ENVAULT_API_URL) {
        return process.env.ENVAULT_API_URL;
    }
    // Default to production for the published package
    return 'https://envault.tech/api/cli';
}
