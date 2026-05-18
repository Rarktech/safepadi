import axios from 'axios';
import crypto from 'crypto';

const API_URL = process.env.INTERNAL_API_URL || process.env.API_URL || 'http://localhost:3000/api';
const BOT_SECRET = process.env.BOT_API_SECRET || '';
const PLATFORM = 'whatsapp';

export async function buildMagicLink(opts: {
    platform_id: string;
    scope: string;
    txn_id?: string;
    fallbackUrl?: string;
}): Promise<string> {
    if (!BOT_SECRET) {
        console.warn('⚠️ BOT_API_SECRET not set — magic link will use fallback URL');
        return opts.fallbackUrl || '#';
    }

    const ts = Date.now().toString();
    const body = JSON.stringify({
        platform: PLATFORM,
        platform_id: opts.platform_id,
        scope: opts.scope,
        ...(opts.txn_id ? { txn_id: opts.txn_id } : {}),
    });
    const sig = crypto.createHmac('sha256', BOT_SECRET).update(ts + body).digest('hex');

    try {
        const res = await axios.post(`${API_URL}/auth/magic-link`, JSON.parse(body), {
            headers: {
                'X-Bot-Platform': PLATFORM,
                'X-Bot-Timestamp': ts,
                'X-Bot-Signature': sig,
                'Content-Type': 'application/json',
            },
            timeout: 5000,
        });
        return res.data.url as string;
    } catch (err: any) {
        console.error('Failed to generate magic link:', err.response?.data || err.message);
        return opts.fallbackUrl || '#';
    }
}
