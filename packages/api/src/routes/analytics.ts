import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { requireBot, BotAuthedRequest } from '../middleware/requireBot';
import { track } from '../lib/posthog';

const router = Router();

const captureLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
});

const CaptureSchema = z.object({
    distinct_id: z.string().min(1),
    event: z.string().min(1).max(100),
    properties: z.record(z.string(), z.any()).optional(),
});

// Bot-side UX/funnel events proxy into the same PostHog client the API uses for
// business events — keeps the PostHog key out of 6 separate bot services.
router.post('/capture', captureLimiter, requireBot, (req, res) => {
    try {
        const { distinct_id, event, properties } = CaptureSchema.parse(req.body);
        const platform = (req as BotAuthedRequest).botPlatform;
        track(distinct_id, event, { ...properties, platform: platform.toUpperCase(), $lib: 'bot-proxy' });
        res.status(204).end();
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
