import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Static-secret auth for the scheduled feedback-digest routine — deliberately
// separate from requireAdmin so a leaked token can only read/deliver feedback
// digests, not touch disputes, users, or anything else admin-scoped.
export function requireReportToken(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['x-report-token'];
    const expected = process.env.REPORT_API_TOKEN;

    if (!expected || typeof token !== 'string') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    let matches = false;
    try {
        matches = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    } catch {
        matches = false;
    }

    if (!matches) return res.status(401).json({ error: 'Unauthorized' });
    next();
}
