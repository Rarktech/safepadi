import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '@safepal/shared';

export interface UserPayload {
    sub: string;           // profile_id
    safetag: string;
    platform: string;
    platform_id: string;
    jti: string;
    typ: string;
    elevated_scopes: string[];
    elev_exp: number | null;
    iat: number;
    exp: number;
}

export interface AuthedRequest extends Request {
    user: UserPayload;
}

// Simple in-memory jti revocation cache (30s TTL) to avoid a DB hit on every request.
// On revocation events (logout), the jti is added here immediately.
const revokedJtiCache = new Map<string, number>();
const JTI_CACHE_TTL_MS = 30_000;
setInterval(() => {
    const now = Date.now();
    for (const [jti, exp] of revokedJtiCache) {
        if (now > exp) revokedJtiCache.delete(jti);
    }
}, 30_000).unref();

export function markJtiRevoked(jti: string) {
    revokedJtiCache.set(jti, Date.now() + JTI_CACHE_TTL_MS);
}

function isJtiLocallyRevoked(jti: string): boolean {
    const exp = revokedJtiCache.get(jti);
    if (!exp) return false;
    if (Date.now() > exp) { revokedJtiCache.delete(jti); return false; }
    return true;
}

export async function requireUser(req: Request, res: Response, next: NextFunction) {
    try {
        const cookieToken = (req as any).cookies?.sf_session;
        const bearerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
        const token = cookieToken || bearerToken;

        if (!token) return res.status(401).json({ error: 'AUTH_REQUIRED' });

        let decoded: UserPayload;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as UserPayload;
        } catch {
            return res.status(401).json({ error: 'INVALID_TOKEN' });
        }

        if (decoded.typ !== 'user') return res.status(401).json({ error: 'INVALID_TOKEN_TYPE' });

        // Fast local revocation check
        if (isJtiLocallyRevoked(decoded.jti)) return res.status(401).json({ error: 'SESSION_REVOKED' });

        // Periodic DB check: verify session still valid (not revoked server-side)
        const { data: session } = await supabase
            .from('user_sessions')
            .select('revoked_at')
            .eq('jti', decoded.jti)
            .maybeSingle();

        if (!session || session.revoked_at) {
            markJtiRevoked(decoded.jti);
            return res.status(401).json({ error: 'SESSION_REVOKED' });
        }

        (req as AuthedRequest).user = {
            ...decoded,
            elevated_scopes: decoded.elevated_scopes || [],
            elev_exp: decoded.elev_exp || null,
        };

        // Update last_used_at (fire-and-forget, but must be awaited or .then()'d —
        // postgrest-js builders are lazy thenables and never send the request otherwise)
        supabase.from('user_sessions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('jti', decoded.jti)
            .then(() => {});

        next();
    } catch (err) {
        res.status(401).json({ error: 'AUTH_ERROR' });
    }
}

const BOT_ALLOWED_PLATFORMS = new Set(['telegram', 'discord', 'whatsapp', 'instagram', 'apple', 'messenger']);

export interface BotOrUserRequest extends Request {
    user?: UserPayload;
    isBot?: boolean;
    botPlatform?: string;
}

export async function requireUserOrBot(req: Request, res: Response, next: NextFunction) {
    const platform = (req.headers['x-bot-platform'] as string | undefined)?.toLowerCase();
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, '');

    if (platform && bearerToken) {
        if (!BOT_ALLOWED_PLATFORMS.has(platform)) {
            return res.status(401).json({ error: `Unknown platform: ${platform}` });
        }
        const secretKey = process.env[`BOT_SHARED_SECRET_${platform.toUpperCase()}`] || process.env.BOT_API_SECRET;
        if (!secretKey) {
            return res.status(401).json({ error: `No shared secret for platform: ${platform}` });
        }
        let matches = false;
        try {
            matches = crypto.timingSafeEqual(Buffer.from(bearerToken), Buffer.from(secretKey));
        } catch {}
        if (!matches) {
            return res.status(401).json({ error: 'Invalid bot token' });
        }
        (req as BotOrUserRequest).isBot = true;
        (req as BotOrUserRequest).botPlatform = platform;
        return next();
    }

    return requireUser(req, res, next);
}

export function requireElevation(scope: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthedRequest).user;
        const now = Math.floor(Date.now() / 1000);
        if (!user.elevated_scopes.includes(scope) || !user.elev_exp || user.elev_exp < now) {
            return res.status(403).json({ error: 'STEP_UP_REQUIRED', required_scope: scope });
        }
        next();
    };
}

// Resolves :safetag param → profile_id and verifies it matches the authenticated user
export async function requireSafetagOwner(req: Request, res: Response, next: NextFunction) {
    const user = (req as AuthedRequest).user;
    const rawTag = Array.isArray(req.params.safetag) ? req.params.safetag[0] : req.params.safetag;
    if (!rawTag) return res.status(400).json({ error: 'Missing safetag param' });

    const cleanTag = rawTag.startsWith('@') ? rawTag : `@${rawTag}`;
    const withoutAt = cleanTag.replace('@', '');

    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .or(`safetag.ilike.${cleanTag},safetag.ilike.${withoutAt}`)
        .maybeSingle();

    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    if (profile.id !== user.sub) return res.status(403).json({ error: 'FORBIDDEN' });

    next();
}
