import { Router, Request, Response } from 'express';
import { supabase } from '@safepal/shared';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { markJtiRevoked, requireUser, AuthedRequest } from '../middleware/requireUser';
import { requireBot, BotAuthedRequest } from '../middleware/requireBot';
import { sendNotification } from '../services/notifications';

const router = Router();

// Scope → expiry in seconds
const SCOPE_TTL: Record<string, number> = {
    withdraw:         5 * 60,
    unlink:           5 * 60,
    payout_method:   10 * 60,
    delivery_confirm: 15 * 60,
    kyc:              15 * 60,
    dispute:          15 * 60,
    reviews:          30 * 60,
    view_dashboard:   30 * 60,
    delete_account:   10 * 60,
};

// Scopes that grant a short-lived elevation claim in the session JWT
const ELEVATION_SCOPES = new Set(['withdraw', 'payout_method', 'kyc', 'unlink', 'delivery_confirm', 'delete_account']);

// Scopes a logged-in user may request a confirmation link for themselves (via POST /request-elevation),
// as opposed to scopes only a bot can issue server-to-server (withdraw, payout_method, etc. — those
// links are sent as part of an existing bot conversation flow).
const SELF_REQUESTABLE_SCOPES = new Set(['delete_account']);

function mintToken(): { raw: string; hash: string } {
    const raw = 'mlt_' + crypto.randomBytes(32).toString('base64url');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
}

function issueSessionJwt(opts: {
    profileId: string;
    safetag: string;
    platform: string;
    platformId: string;
    elevatedScopes?: string[];
    elevExp?: number;
}): { token: string; jti: string; expiresAt: Date } {
    const jti = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 30 * 60; // 30 minutes
    const expiresAt = new Date(exp * 1000);

    const payload: Record<string, any> = {
        sub: opts.profileId,
        safetag: opts.safetag,
        platform: opts.platform,
        platform_id: opts.platformId,
        jti,
        typ: 'user',
        elevated_scopes: opts.elevatedScopes || [],
        elev_exp: opts.elevExp || null,
        iat: now,
        exp,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { algorithm: 'HS256', noTimestamp: true });
    return { token, jti, expiresAt };
}

/**
 * GET /api/auth/magic-link/health
 * Public diagnostic — shows which bot secrets are configured (boolean only, never values).
 */
router.get('/health', (_req: Request, res: Response) => {
    const PLATFORMS = ['telegram', 'discord', 'whatsapp', 'instagram', 'apple', 'messenger'];
    const platforms: Record<string, boolean> = {};
    for (const p of PLATFORMS) {
        platforms[p] = !!process.env[`BOT_SHARED_SECRET_${p.toUpperCase()}`];
    }
    const botApiSecret = !!process.env.BOT_API_SECRET;
    const anyConfigured = botApiSecret || Object.values(platforms).some(Boolean);
    res.json({ bot_api_secret: botApiSecret, platforms, any_secret_configured: anyConfigured });
});

/**
 * POST /api/auth/magic-link
 * Called by bots (server-to-server) to generate a one-time URL for a user.
 * Requires X-Bot-Platform + X-Bot-Signature (HMAC-SHA256 of timestamp+body).
 */
router.post('/', requireBot, async (req: Request, res: Response) => {
    try {
        const platform = (req as BotAuthedRequest).botPlatform;

        const { platform_id, scope, txn_id } = req.body;
        if (!platform_id || !scope) {
            return res.status(400).json({ error: 'platform_id and scope are required' });
        }
        if (!SCOPE_TTL[scope]) {
            return res.status(400).json({ error: `Invalid scope: ${scope}` });
        }

        // Look up profile from linked_accounts — this verifies the platform_id is legitimate
        const { data: linked } = await supabase
            .from('linked_accounts')
            .select('profile_id, profiles(safetag)')
            .eq('platform', platform)
            .eq('platform_id', platform_id)
            .maybeSingle();

        if (!linked) {
            return res.status(404).json({ error: 'No account linked for this platform_id' });
        }

        const profileId = linked.profile_id;
        const safetag = (linked as any).profiles?.safetag || '';

        const { raw, hash } = mintToken();
        const expiresAt = new Date(Date.now() + SCOPE_TTL[scope] * 1000);

        const { error: insertErr } = await supabase.from('magic_link_tokens').insert({
            token_hash: hash,
            profile_id: profileId,
            safetag,
            scope,
            txn_id: txn_id || null,
            issued_to_platform: platform,
            issued_to_platform_id: platform_id,
            expires_at: expiresAt.toISOString(),
        });

        if (insertErr) {
            console.error('Failed to store magic link token:', insertErr);
            return res.status(500).json({ error: 'Failed to generate token' });
        }

        const frontendUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
        const scopeToPath: Record<string, string> = {
            withdraw:         `/withdraw/${encodeURIComponent(safetag)}`,
            kyc:              '/kyc',
            payout_method:    `/withdraw/${encodeURIComponent(safetag)}`,
            view_dashboard:   `/withdraw/${encodeURIComponent(safetag)}`,
            reviews:          `/reviews/${encodeURIComponent(safetag)}`,
            dispute:          txn_id ? `/withdraw/${encodeURIComponent(safetag)}?view=dispute_details&txnId=${txn_id}` : `/withdraw/${encodeURIComponent(safetag)}`,
            delivery_confirm: txn_id ? `/delivery/${txn_id}` : `/withdraw/${encodeURIComponent(safetag)}`,
            unlink:           `/withdraw/${encodeURIComponent(safetag)}`,
        };
        const path = scopeToPath[scope] || `/withdraw/${encodeURIComponent(safetag)}`;
        const separator = path.includes('?') ? '&' : '?';
        const url = `${frontendUrl}${path}${separator}t=${encodeURIComponent(raw)}`;

        res.json({ t: raw, url, expires_at: expiresAt.toISOString() });
    } catch (err: any) {
        console.error('Magic link generation error:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

/**
 * POST /api/auth/magic-link/exchange
 * Exchanges a raw magic-link token for a session JWT.
 * Called by the frontend middleware after the user clicks the link.
 */
router.post('/exchange', async (req: Request, res: Response) => {
    try {
        const { t } = req.body;
        if (!t || typeof t !== 'string' || !t.startsWith('mlt_')) {
            return res.status(400).json({ error: 'INVALID_TOKEN_FORMAT' });
        }

        const hash = crypto.createHash('sha256').update(t).digest('hex');
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || null;

        // Atomically consume the token
        const { data: tokenRow, error } = await supabase
            .from('magic_link_tokens')
            .update({ used_at: new Date().toISOString(), consumed_ip: clientIp })
            .eq('token_hash', hash)
            .is('used_at', null)
            .gt('expires_at', new Date().toISOString())
            .select('profile_id, safetag, scope, txn_id, issued_to_platform, issued_to_platform_id')
            .maybeSingle();

        if (error || !tokenRow) {
            return res.status(401).json({ error: 'INVALID_OR_EXPIRED_TOKEN' });
        }

        // Determine elevation
        const elevatedScopes = ELEVATION_SCOPES.has(tokenRow.scope) ? [tokenRow.scope] : [];
        const elevExp = elevatedScopes.length > 0 ? Math.floor(Date.now() / 1000) + 5 * 60 : undefined;

        const { token, jti, expiresAt } = issueSessionJwt({
            profileId: tokenRow.profile_id,
            safetag: tokenRow.safetag,
            platform: tokenRow.issued_to_platform,
            platformId: tokenRow.issued_to_platform_id,
            elevatedScopes,
            elevExp,
        });

        // Register session for revocation tracking
        await supabase.from('user_sessions').insert({
            profile_id: tokenRow.profile_id,
            jti,
            platform: tokenRow.issued_to_platform,
            platform_id: tokenRow.issued_to_platform_id,
            expires_at: expiresAt.toISOString(),
        });

        // Set HttpOnly session cookie
        res.cookie('sf_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 60 * 1000,
        });

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, safetag, first_name, last_name, email, kyc_status')
            .eq('id', tokenRow.profile_id)
            .single();

        res.json({
            session_token: token,
            profile,
            scope: tokenRow.scope,
            elevated_scopes: elevatedScopes,
            elevated_until: elevExp ? new Date(elevExp * 1000).toISOString() : null,
        });
    } catch (err: any) {
        console.error('Magic link exchange error:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

/**
 * POST /api/auth/session/refresh
 * Silently renews a valid session JWT. Requires valid sf_session cookie.
 */
router.post('/session/refresh', async (req: Request, res: Response) => {
    try {
        const cookieToken = (req as any).cookies?.sf_session;
        const bearerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
        const token = cookieToken || bearerToken;

        if (!token) return res.status(401).json({ error: 'AUTH_REQUIRED' });

        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
        } catch {
            return res.status(401).json({ error: 'INVALID_TOKEN' });
        }

        if (decoded.typ !== 'user') return res.status(401).json({ error: 'INVALID_TOKEN_TYPE' });

        // Check session exists and is not revoked
        const { data: session } = await supabase
            .from('user_sessions')
            .select('issued_at, revoked_at')
            .eq('jti', decoded.jti)
            .maybeSingle();

        if (!session || session.revoked_at) {
            return res.status(401).json({ error: 'SESSION_REVOKED' });
        }

        // Enforce 7-day absolute cap
        const issuedAt = new Date(session.issued_at).getTime();
        if (Date.now() - issuedAt > 7 * 24 * 60 * 60 * 1000) {
            return res.status(401).json({ error: 'SESSION_EXPIRED_ABSOLUTE' });
        }

        const { token: newToken, jti: newJti, expiresAt } = issueSessionJwt({
            profileId: decoded.sub,
            safetag: decoded.safetag,
            platform: decoded.platform,
            platformId: decoded.platform_id,
        });

        // Revoke old session, register new one
        await supabase.from('user_sessions').update({ revoked_at: new Date().toISOString() }).eq('jti', decoded.jti);
        markJtiRevoked(decoded.jti);

        await supabase.from('user_sessions').insert({
            profile_id: decoded.sub,
            jti: newJti,
            platform: decoded.platform,
            platform_id: decoded.platform_id,
            expires_at: expiresAt.toISOString(),
        });

        res.cookie('sf_session', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 60 * 1000,
        });

        res.json({ session_token: newToken });
    } catch (err: any) {
        console.error('Session refresh error:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

/**
 * POST /api/auth/logout
 * Revokes the current session.
 */
router.post('/logout', async (req: Request, res: Response) => {
    try {
        const cookieToken = (req as any).cookies?.sf_session;
        const bearerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
        const token = cookieToken || bearerToken;

        if (token) {
            try {
                const decoded: any = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
                await supabase.from('user_sessions').update({ revoked_at: new Date().toISOString() }).eq('jti', decoded.jti);
                markJtiRevoked(decoded.jti);
            } catch { /* Token already invalid — that's fine */ }
        }

        res.clearCookie('sf_session', { path: '/' });
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: 'Internal error' });
    }
});

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile. Used by the frontend to check session.
 */
router.get('/me', async (req: Request, res: Response) => {
    try {
        const cookieToken = (req as any).cookies?.sf_session;
        const bearerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
        const token = cookieToken || bearerToken;

        if (!token) return res.status(401).json({ error: 'AUTH_REQUIRED' });

        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
        } catch {
            return res.status(401).json({ error: 'INVALID_TOKEN' });
        }

        if (decoded.typ !== 'user') return res.status(401).json({ error: 'INVALID_TOKEN_TYPE' });

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, safetag, first_name, last_name, email, kyc_status, is_blocked')
            .eq('id', decoded.sub)
            .single();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        res.json({
            profile,
            session: {
                platform: decoded.platform,
                platform_id: decoded.platform_id,
                elevated_scopes: decoded.elevated_scopes || [],
                elevated_until: decoded.elev_exp ? new Date(decoded.elev_exp * 1000).toISOString() : null,
                expires_at: new Date(decoded.exp * 1000).toISOString(),
            }
        });
    } catch (err: any) {
        res.status(500).json({ error: 'Internal error' });
    }
});

/**
 * POST /api/auth/magic-link/request-elevation
 * Lets an already-logged-in user request a confirmation link for a sensitive
 * self-service action (currently just account deletion) be sent to their own
 * linked platform — the web app has no password to step up against, so a
 * fresh scoped magic link plays that role.
 */
router.post('/request-elevation', requireUser, async (req: Request, res: Response) => {
    try {
        const { scope } = req.body;
        if (typeof scope !== 'string' || !SELF_REQUESTABLE_SCOPES.has(scope)) {
            return res.status(400).json({ error: `Invalid scope: ${scope}` });
        }

        const user = (req as AuthedRequest).user;
        const { raw, hash } = mintToken();
        const expiresAt = new Date(Date.now() + SCOPE_TTL[scope] * 1000);

        const { error: insertErr } = await supabase.from('magic_link_tokens').insert({
            token_hash: hash,
            profile_id: user.sub,
            safetag: user.safetag,
            scope,
            issued_to_platform: user.platform,
            issued_to_platform_id: user.platform_id,
            expires_at: expiresAt.toISOString(),
        });
        if (insertErr) {
            console.error('Failed to store self-requested magic link token:', insertErr);
            return res.status(500).json({ error: 'Failed to generate token' });
        }

        const frontendUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
        const url = `${frontendUrl}/withdraw/${encodeURIComponent(user.safetag)}?view=profile&t=${encodeURIComponent(raw)}`;
        const minutes = Math.round(SCOPE_TTL[scope] / 60);
        const scopeLabel: Record<string, string> = { delete_account: 'delete your Safeeely account' };

        await sendNotification(
            user.platform,
            user.platform_id,
            `🔒 **Confirm it's you**\n\nClick below to confirm you want to ${scopeLabel[scope] || 'continue'}. This link expires in ${minutes} minutes and can only be used once.\n\n${url}`
        );

        res.json({ ok: true, expires_at: expiresAt.toISOString() });
    } catch (err: any) {
        console.error('Request elevation error:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

export default router;
