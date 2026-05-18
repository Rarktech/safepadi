import { supabase } from '@safepal/shared';
import crypto from 'crypto';

const SCOPE_TTL: Record<string, number> = {
    withdraw:         5 * 60,
    unlink:           5 * 60,
    payout_method:   10 * 60,
    delivery_confirm: 15 * 60,
    kyc:              15 * 60,
    dispute:          15 * 60,
    reviews:          30 * 60,
    view_dashboard:   30 * 60,
};

const SCOPE_TO_PATH = (safetag: string, txnId?: string): Record<string, string> => ({
    withdraw:         `/withdraw/${encodeURIComponent(safetag)}`,
    kyc:              '/kyc',
    payout_method:    `/withdraw/${encodeURIComponent(safetag)}`,
    view_dashboard:   `/withdraw/${encodeURIComponent(safetag)}`,
    reviews:          `/reviews/${encodeURIComponent(safetag)}`,
    dispute:          txnId ? `/withdraw/${encodeURIComponent(safetag)}?view=dispute_details&txnId=${txnId}` : `/withdraw/${encodeURIComponent(safetag)}`,
    delivery_confirm: txnId ? `/delivery/${txnId}` : `/withdraw/${encodeURIComponent(safetag)}`,
    unlink:           `/withdraw/${encodeURIComponent(safetag)}`,
});

/**
 * Generate a magic link token for API-internal use (notifications, emails, crons).
 * Bypasses the bot HMAC requirement since the API trusts itself.
 * Falls back to a bare path (no token) if token creation fails.
 */
export async function buildInternalMagicLink(opts: {
    profileId: string;
    safetag: string;
    platform: string;
    platformId: string;
    scope: string;
    txnId?: string;
}): Promise<string> {
    const frontendUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
    const ttl = SCOPE_TTL[opts.scope] ?? 30 * 60;
    const paths = SCOPE_TO_PATH(opts.safetag, opts.txnId);
    const basePath = paths[opts.scope] || `/withdraw/${encodeURIComponent(opts.safetag)}`;

    try {
        const raw = 'mlt_' + crypto.randomBytes(32).toString('base64url');
        const hash = crypto.createHash('sha256').update(raw).digest('hex');
        const expiresAt = new Date(Date.now() + ttl * 1000);

        const { error } = await supabase.from('magic_link_tokens').insert({
            token_hash: hash,
            profile_id: opts.profileId,
            safetag: opts.safetag,
            scope: opts.scope,
            txn_id: opts.txnId || null,
            issued_to_platform: opts.platform,
            issued_to_platform_id: opts.platformId,
            expires_at: expiresAt.toISOString(),
        });

        if (error) throw error;

        const separator = basePath.includes('?') ? '&' : '?';
        return `${frontendUrl}${basePath}${separator}t=${encodeURIComponent(raw)}`;
    } catch (err) {
        console.error('[magicLinkInternal] Failed to generate token, using bare URL:', err);
        return `${frontendUrl}${basePath}`;
    }
}
