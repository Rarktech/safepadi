import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,  // sends sf_session cookie on every request
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'X-Requested-With': 'XMLHttpRequest',  // CSRF guard
    }
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
    r => r,
    async (err) => {
        const original = err.config;

        if (err.response?.status === 401 && !original._retried) {
            if (isRefreshing) {
                // Queue callers while a refresh is in flight
                return new Promise(resolve => {
                    refreshQueue.push((_token) => {
                        resolve(api.request(original));
                    });
                });
            }

            original._retried = true;
            isRefreshing = true;

            try {
                await axios.post(`${API_URL}/auth/magic-link/session/refresh`, {}, { withCredentials: true });
                refreshQueue.forEach(cb => cb(''));
                refreshQueue = [];
                return api.request(original);
            } catch {
                refreshQueue = [];
                if (typeof window !== 'undefined') {
                    window.location.href = '/login?reason=expired';
                }
            } finally {
                isRefreshing = false;
            }
        }

        // Signal the UI to trigger a step-up magic link flow
        if (err.response?.status === 403 && err.response.data?.error === 'STEP_UP_REQUIRED') {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('sf:step-up', { detail: err.response.data }));
            }
        }

        return Promise.reject(err);
    }
);

export default api;
