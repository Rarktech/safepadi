import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface BotAuthedRequest extends Request {
    botPlatform: string;
}

const ALLOWED_PLATFORMS = new Set(['telegram', 'discord', 'whatsapp', 'instagram', 'apple', 'messenger']);

export function requireBot(req: Request, res: Response, next: NextFunction): void {
    const platform    = (req.headers['x-bot-platform'] as string | undefined)?.toLowerCase();
    const authHeader  = req.headers['authorization'] as string | undefined;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!platform || !bearerToken) {
        res.status(401).json({ error: 'Missing bot authentication headers' });
        return;
    }

    if (!ALLOWED_PLATFORMS.has(platform)) {
        res.status(401).json({ error: `Unknown platform: ${platform}` });
        return;
    }

    const secretKey = process.env[`BOT_SHARED_SECRET_${platform.toUpperCase()}`]
        || process.env.BOT_API_SECRET;
    if (!secretKey) {
        res.status(401).json({ error: `No shared secret configured for platform: ${platform}` });
        return;
    }

    let matches = false;
    try {
        matches = crypto.timingSafeEqual(Buffer.from(bearerToken), Buffer.from(secretKey));
    } catch {
        // Buffer lengths differ — definitely no match
    }

    if (!matches) {
        console.error(`[requireBot] Token mismatch for platform=${platform}. Received prefix: '${bearerToken.substring(0, 8)}...', expected prefix: '${secretKey.substring(0, 8)}...'`);
        res.status(401).json({ error: 'Invalid bot token' });
        return;
    }

    (req as BotAuthedRequest).botPlatform = platform;
    next();
}
