
import axios from 'axios';
import { getToken, getApiUrl } from './config.js';

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

export function handleApiError(error) {
    if (error.response) {
        return error.response.data.error || error.response.statusText;
    }
    return error.message;
}
