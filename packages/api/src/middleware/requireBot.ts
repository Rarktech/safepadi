import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface BotAuthedRequest extends Request {
    botPlatform: string;
}

const ALLOWED_PLATFORMS = new Set(['telegram', 'discord', 'whatsapp', 'instagram', 'apple', 'messenger']);

export function requireBot(req: Request, res: Response, next: NextFunction): void {
    const platform  = (req.headers['x-bot-platform']  as string | undefined)?.toLowerCase();
    const timestamp = req.headers['x-bot-timestamp']  as string | undefined;
    const signature = req.headers['x-bot-signature']  as string | undefined;

    if (!platform || !timestamp || !signature) {
        res.status(401).json({ error: 'Missing bot authentication headers' });
        return;
    }

    if (!ALLOWED_PLATFORMS.has(platform)) {
        res.status(401).json({ error: `Unknown platform: ${platform}` });
        return;
    }

    // Replay protection: reject requests with timestamps >60 seconds old
    const tsMs = parseInt(timestamp, 10);
    if (isNaN(tsMs) || Math.abs(Date.now() - tsMs) > 60_000) {
        res.status(401).json({ error: 'Request timestamp out of window' });
        return;
    }

    const secretKey = process.env[`BOT_SHARED_SECRET_${platform.toUpperCase()}`]
        || process.env.BOT_API_SECRET;
    if (!secretKey) {
        res.status(401).json({ error: `No shared secret configured for platform: ${platform}` });
        return;
    }

    // HMAC = sha256(secret).update(timestamp + rawBody).hex
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const expectedSig = crypto
        .createHmac('sha256', secretKey)
        .update(timestamp + rawBody)
        .digest('hex');

    // Constant-time comparison; wrapped in try/catch in case buffer lengths differ
    let signaturesMatch = false;
    try {
        signaturesMatch = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSig),
        );
    } catch {
        // Different lengths → definitely wrong
    }

    if (!signaturesMatch) {
        res.status(401).json({ error: 'Invalid bot signature' });
        return;
    }

    (req as BotAuthedRequest).botPlatform = platform;
    next();
}
