import axios from 'axios';

export function apiErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string } | undefined;
        if (data?.error) return data.error;
    }
    return fallback;
}
