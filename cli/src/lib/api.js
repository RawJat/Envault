
import axios from 'axios';
import { getToken, getApiUrl, clearToken } from './config.js';

export const api = axios.create({
    baseURL: getApiUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`; // Note: Backend expects Bearer
    }
    return config;
});

// Handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const errorMsg = error.response?.data?.error;
            if (errorMsg === 'token_expired') {
                console.error('\n❌ Your session has expired (tokens are valid for 3 days).');
                console.error('Please run "envault login" to authenticate again.\n');
                clearToken();
                process.exit(1);
            } else if (errorMsg === 'Invalid token' || errorMsg === 'Missing or invalid authorization header') {
                console.error('\n❌ Authentication required.');
                console.error('Please run "envault login" to authenticate.\n');
                clearToken();
                process.exit(1);
            }
        }
        return Promise.reject(error);
    }
);

export function handleApiError(error) {
    if (error.response) {
        return error.response.data.error || error.response.statusText;
    }
    return error.message;
}
