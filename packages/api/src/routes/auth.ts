import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { sendNotification, routeNotification } from '../services/notifications';
import { sendEmail } from '../services/email';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { requireUser, AuthedRequest, markJtiRevoked } from '../middleware/requireUser';
import { track } from '../lib/posthog';

const router = Router();

// Simple in-memory rate limiter for OTP requests (max 3 per 15 min per key)
const otpRateLimits = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of otpRateLimits) {
        if (now > record.resetAt) otpRateLimits.delete(key);
    }
}, 15 * 60 * 1000).unref();
function isRateLimited(key: string): boolean {
    const now = Date.now();
    const window = 15 * 60 * 1000;
    const record = otpRateLimits.get(key);
    if (!record || now > record.resetAt) {
        otpRateLimits.set(key, { count: 1, resetAt: now + window });
        return false;
    }
    if (record.count >= 3) return true;
    record.count++;
    return false;
}

// Validation schemas
const SendOTPSchema = z.object({
    safetag: z.string(),
    platform: z.enum(['telegram', 'discord', 'whatsapp', 'instagram']),
    platform_id: z.string()
});

const VerifyOTPSchema = z.object({
    safetag: z.string(),
    platform: z.enum(['telegram', 'discord', 'whatsapp', 'instagram']),
    platform_id: z.string(),
    otp: z.string().length(6)
});

const BlockActionSchema = z.object({
    safetag: z.string(),
    platform_id: z.string() // The platform_id to block
});

/**
 * Send OTP to existing accounts
 */
router.post('/otp/send', async (req, res) => {
    try {
        const { safetag, platform, platform_id } = SendOTPSchema.parse(req.body);

        if (isRateLimited(`${platform}:${platform_id}`)) {
            return res.status(429).json({ error: 'Too many requests. Please wait 15 minutes before trying again.' });
        }
        const cleanTag = safetag.startsWith('@') ? safetag : `@${safetag}`;

        // 1. Find Profile
        const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('id, email, first_name')
            .eq('safetag', cleanTag)
            .single();

        if (pError || !profile) return res.status(404).json({ error: 'Profile not found' });

        // 2. Check if this platform_id is banned for this profile
        const { data: isBanned } = await supabase
            .from('binding_bans')
            .select('id')
            .eq('profile_id', profile.id)
            .eq('platform_id', platform_id)
            .maybeSingle();

        if (isBanned) {
            return res.status(403).json({ error: 'This account has been blocked from linking to this Safetag by the owner.' });
        }

        // 3. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

        // 4. Save OTP
        const { error: otpError } = await supabase
            .from('auth_otps')
            .upsert({
                profile_id: profile.id,
                platform,
                platform_id,
                code: otp,
                expires_at: expiresAt
            });

        if (otpError) throw otpError;

        // 5. Send to existing social media accounts
        const { data: accounts } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id')
            .eq('profile_id', profile.id);

        if (accounts && accounts.length > 0) {
            const blockLink = `block_binding|${profile.id}|${platform_id}`;
            const msg = `🛡️ <b>Security Alert: New Binding Request</b>\n\nSomeone is attempting to link a new <b>${platform}</b> account to your Safetag (<b>${cleanTag}</b>).\n\n<b>Verification Code:</b> <code>${otp}</code>\n\nDid you initiate this? If not, click the button below to block this account forever.`;
            
            await Promise.all(accounts.map(acc => 
                sendNotification(acc.platform, acc.platform_id, msg, [{
                    label: '🚫 Block & Ban Action',
                    customId: blockLink
                }])
            ));
        }

        // 6. Send to Email
        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; text-align: center;">
                <h2 style="color: #0f172a;">Safeeely Account Verification</h2>
                <p style="color: #475569; line-height: 1.5;">You requested to link your Safetag (<b>${cleanTag}</b>) using <b>${platform}</b>.</p>
                <p style="color: #475569; line-height: 1.5;">Please use the following 6-digit code to complete your authentication:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; margin: 30px 0; background: #f8fafc; border-radius: 8px; color: #0284c7;">
                    ${otp}
                </div>
                <p style="color: #475569; line-height: 1.5;">This code will expire in 10 minutes.</p>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 40px;">If you did not request this verification, your account remains secure and you can safely ignore this email.</p>
            </div>
        `;
        
        sendEmail({
            to: profile.email,
            subject: `${otp} is your Safeeely verification code`,
            html: emailHtml
        }).catch(() => {});

        console.log(`[OTP] Sent verification email to ${profile.email}`);

        res.json({ success: true, message: 'OTP sent to your linked accounts and email.' });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Verify OTP and Link Account
 */
router.post('/otp/verify', async (req, res) => {
    try {
        const { safetag, platform, platform_id, otp } = VerifyOTPSchema.parse(req.body);
        const cleanTag = safetag.startsWith('@') ? safetag : `@${safetag}`;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name')
            .eq('safetag', cleanTag)
            .single();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        // 1. Check OTP
        const { data: otpData, error: otpError } = await supabase
            .from('auth_otps')
            .select('id')
            .eq('profile_id', profile.id)
            .eq('platform', platform)
            .eq('platform_id', platform_id)
            .eq('code', otp)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (otpError || !otpData) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // 2. Link Account
        const { error: linkError } = await supabase
            .from('linked_accounts')
            .insert({
                profile_id: profile.id,
                platform,
                platform_id,
                is_primary: false
            });

        if (linkError) {
            if (linkError.code === '23505') { // Duplicate unique key
                return res.status(400).json({ error: 'This account is already linked to a profile.' });
            }
            throw linkError;
        }

        // 3. Cleanup OTP
        await supabase.from('auth_otps').delete().eq('id', otpData.id);

        // 4. Issue session JWT
        const jti = crypto.randomUUID();
        const now = Math.floor(Date.now() / 1000);
        const exp = now + 30 * 60;
        const sessionToken = jwt.sign({
            sub: profile.id,
            safetag: cleanTag,
            platform,
            platform_id,
            jti,
            typ: 'user',
            elevated_scopes: [],
            elev_exp: null,
            iat: now,
            exp,
        }, process.env.JWT_SECRET!, { algorithm: 'HS256', noTimestamp: true });

        const expiresAt = new Date(exp * 1000).toISOString();
        await supabase.from('user_sessions').insert({
            profile_id: profile.id, jti, platform, platform_id, expires_at: expiresAt
        });

        (res as any).cookie('sf_session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 60 * 1000,
        });

        res.json({ success: true, profile, session_token: sessionToken });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Block account from binding
 */
router.post('/block', async (req, res) => {
    try {
        const { safetag, platform_id } = BlockActionSchema.parse(req.body);
        const cleanTag = safetag.startsWith('@') ? safetag : `@${safetag}`;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('safetag', cleanTag)
            .single();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        // Insert into bans
        await supabase
            .from('binding_bans')
            .insert({
                profile_id: profile.id,
                platform_id
            });

        // Delete any pending OTPs
        await supabase
            .from('auth_otps')
            .delete()
            .eq('profile_id', profile.id)
            .eq('platform_id', platform_id);

        res.json({ success: true, message: 'Account blocked from binding.' });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Unlink a platform from an existing profile
 */
router.delete('/unlink', requireUser, async (req, res) => {
    try {
        const user = (req as AuthedRequest).user;
        const { platform, platform_id } = z.object({
            platform: z.enum(['telegram', 'discord', 'whatsapp', 'instagram', 'apple']),
            platform_id: z.string()
        }).parse(req.body);

        const profileId = user.sub;

        const { data: linked } = await supabase
            .from('linked_accounts')
            .select('id, is_primary')
            .eq('profile_id', profileId)
            .eq('platform', platform)
            .eq('platform_id', platform_id)
            .maybeSingle();

        if (!linked) return res.status(404).json({ error: 'This platform is not linked to your profile' });
        if (linked.is_primary) return res.status(400).json({ error: 'Cannot unlink your primary platform. Delete your account instead if needed.' });

        const { count } = await supabase
            .from('linked_accounts')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', profileId);

        if (count !== null && count <= 1) {
            return res.status(400).json({ error: 'Cannot unlink your only linked platform. Add another platform first.' });
        }

        await supabase.from('linked_accounts').delete().eq('id', linked.id);

        res.json({ success: true, message: 'Platform unlinked successfully.' });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Send email OTP for registration verification
 */
router.post('/email-otp/send', async (req, res) => {
    try {
        const { email } = z.object({ email: z.string().email() }).parse(req.body);

        if (isRateLimited(`email:${email}`)) {
            return res.status(429).json({ error: 'Too many requests. Please wait 15 minutes before trying again.' });
        }

        // Block if email is already registered
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ error: 'This email is already registered. Use Login to link your account.' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        const { error: upsertError } = await supabase
            .from('email_verifications')
            .upsert({ email: email.toLowerCase(), code, expires_at: expiresAt }, { onConflict: 'email' });

        if (upsertError) throw upsertError;

        const html = `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; text-align: center;">
                <h2 style="color: #0f172a;">Verify Your Email</h2>
                <p style="color: #475569;">Use the code below to complete your Safeeely registration.</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; margin: 30px 0; background: #f8fafc; border-radius: 8px; color: #0284c7;">
                    ${code}
                </div>
                <p style="color: #475569;">This code expires in <b>10 minutes</b>.</p>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 40px;">If you did not request this, you can safely ignore this email.</p>
            </div>
        `;

        sendEmail({ to: email, subject: `${code} is your Safeeely verification code`, html }).catch(() => {});

        res.json({ success: true, message: 'Verification code sent to your email.' });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Verify email OTP for registration
 */
router.post('/email-otp/verify', async (req, res) => {
    try {
        const { email, code } = z.object({ email: z.string().email(), code: z.string().length(6) }).parse(req.body);

        const { data: record } = await supabase
            .from('email_verifications')
            .select('id, code, expires_at')
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (!record) {
            return res.status(400).json({ error: 'No verification pending for this email. Please request a new code.' });
        }

        if (record.code !== code) {
            return res.status(400).json({ error: 'Invalid verification code.' });
        }

        if (new Date(record.expires_at) < new Date()) {
            await supabase.from('email_verifications').delete().eq('id', record.id);
            return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
        }

        await supabase.from('email_verifications').delete().eq('id', record.id);

        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

function maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    const maskPart = (s: string) => s.length <= 2 ? `${s[0]}*` : `${s[0]}${'*'.repeat(s.length - 2)}${s[s.length - 1]}`;
    const [domainName, ...domainRest] = domain.split('.');
    return `${maskPart(user)}@${maskPart(domainName)}.${domainRest.join('.')}`;
}

const SendAccountOtpSchema = z.object({
    email: z.string().email().optional(),
    safetag: z.string().optional(),
    purpose: z.enum(['web_login', 'block_account', 'unblock_account']),
}).refine(d => !!d.email || !!d.safetag, { message: 'email or safetag is required' });

const VerifyAccountOtpSchema = z.object({
    email: z.string().email().optional(),
    request_id: z.string().uuid().optional(),
    code: z.string().length(6),
    purpose: z.enum(['web_login', 'block_account', 'unblock_account']),
}).refine(d => !!d.email || !!d.request_id, { message: 'email or request_id is required' });

async function resolveProfileByEmailOrSafetag(email?: string, safetag?: string) {
    if (email) {
        const { data } = await supabase.from('profiles').select('id, email, safetag, is_blocked').eq('email', email.toLowerCase()).maybeSingle();
        return data;
    }
    const cleanTag = safetag!.startsWith('@') ? safetag! : `@${safetag}`;
    const { data } = await supabase.from('profiles').select('id, email, safetag, is_blocked').ilike('safetag', cleanTag).maybeSingle();
    return data;
}

/**
 * POST /api/auth/account-otp/send
 * Sends a 6-digit email code to verify profile ownership, for either web login
 * or the self-service account block/unblock flow. Resolves by email or safetag
 * (safetag is public, so the response only ever reveals a masked email).
 */
router.post('/account-otp/send', async (req, res) => {
    try {
        const data = SendAccountOtpSchema.parse(req.body);
        const profile = await resolveProfileByEmailOrSafetag(data.email, data.safetag);
        if (!profile) return res.status(404).json({ error: 'No account found' });

        if (isRateLimited(`${data.purpose}:${profile.email}`)) {
            return res.status(429).json({ error: 'Too many requests. Please wait 15 minutes before trying again.' });
        }

        if (data.purpose === 'block_account' && profile.is_blocked) {
            return res.status(400).json({ error: 'Account is already blocked' });
        }
        if (data.purpose === 'unblock_account' && !profile.is_blocked) {
            return res.status(400).json({ error: 'Account is not blocked' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await supabase.from('profile_action_otps').delete().eq('profile_id', profile.id).eq('purpose', data.purpose);
        const { data: otpRow, error: insertErr } = await supabase.from('profile_action_otps').insert({
            profile_id: profile.id, code, purpose: data.purpose, expires_at: expiresAt
        }).select('id').single();
        if (insertErr) throw insertErr;

        const COPY: Record<string, { subject: string; heading: string; body: string }> = {
            web_login: { subject: 'is your Safeeely sign-in code', heading: 'Sign in to Safeeely', body: 'Use the code below to sign in to your Safeeely account.' },
            block_account: { subject: 'is your Safeeely account block code', heading: 'Confirm blocking your account', body: 'Use the code below to confirm you want to block your Safeeely account.' },
            unblock_account: { subject: 'is your Safeeely account reactivation code', heading: 'Confirm reactivating your account', body: 'Use the code below to confirm you want to reactivate your Safeeely account.' },
        };
        const copy = COPY[data.purpose];

        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; text-align: center;">
                <h2 style="color: #0f172a;">${copy.heading}</h2>
                <p style="color: #475569; line-height: 1.5;">${copy.body}</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; margin: 30px 0; background: #f8fafc; border-radius: 8px; color: #0284c7;">
                    ${code}
                </div>
                <p style="color: #475569; line-height: 1.5;">This code will expire in 10 minutes.</p>
                <p style="font-size: 13px; color: #94a3b8; margin-top: 40px;">If you did not request this, you can safely ignore this email.</p>
            </div>
        `;

        sendEmail({ to: profile.email, subject: `${code} ${copy.subject}`, html: emailHtml }).catch(() => {});

        res.json({ success: true, masked_email: maskEmail(profile.email), request_id: otpRow.id });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * POST /api/auth/account-otp/verify
 * Verifies the code from /account-otp/send and performs the requested action:
 * web_login mints a session, block_account/unblock_account flips profiles.is_blocked
 * and notifies the user (mirrors the admin block/unblock messaging in admin.ts).
 */
router.post('/account-otp/verify', async (req, res) => {
    try {
        const { email, request_id, code, purpose } = VerifyAccountOtpSchema.parse(req.body);

        const PROFILE_SELECT = 'id, safetag, first_name, last_name, email, kyc_status, is_blocked, primary_platform, linked_accounts(platform, platform_id)';
        let profile: any = null;
        let otpRow: { id: string; expires_at: string } | null = null;

        if (request_id) {
            const { data: row } = await supabase
                .from('profile_action_otps')
                .select('id, profile_id, expires_at')
                .eq('id', request_id)
                .eq('purpose', purpose)
                .eq('code', code)
                .maybeSingle();
            if (row) {
                otpRow = row;
                const { data } = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', row.profile_id).maybeSingle();
                profile = data;
            }
        } else {
            const { data } = await supabase.from('profiles').select(PROFILE_SELECT).eq('email', email!.toLowerCase()).maybeSingle();
            profile = data;
            if (profile) {
                const { data: row } = await supabase
                    .from('profile_action_otps')
                    .select('id, expires_at')
                    .eq('profile_id', profile.id)
                    .eq('purpose', purpose)
                    .eq('code', code)
                    .maybeSingle();
                otpRow = row;
            }
        }

        if (!profile) return res.status(404).json({ error: 'Profile not found' });
        if (!otpRow || new Date(otpRow.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired code' });
        }
        await supabase.from('profile_action_otps').delete().eq('id', otpRow.id);

        if (purpose === 'web_login') {
            const jti = crypto.randomUUID();
            const now = Math.floor(Date.now() / 1000);
            const exp = now + 30 * 60;
            const sessionToken = jwt.sign({
                sub: profile.id,
                safetag: profile.safetag,
                platform: 'web',
                platform_id: profile.id,
                jti,
                typ: 'user',
                elevated_scopes: [],
                elev_exp: null,
                iat: now,
                exp,
            }, process.env.JWT_SECRET!, { algorithm: 'HS256', noTimestamp: true });

            await supabase.from('user_sessions').insert({
                profile_id: profile.id, jti, platform: 'web', platform_id: profile.id, expires_at: new Date(exp * 1000).toISOString()
            });

            (res as any).cookie('sf_session', sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 30 * 60 * 1000,
            });

            const { linked_accounts, ...profileOut } = profile as any;
            track(profile.safetag, 'login_succeeded', { method: 'otp' });
            return res.json({ success: true, profile: profileOut });
        }

        // block_account / unblock_account
        const newBlocked = purpose === 'block_account';
        await supabase.from('profiles').update({ is_blocked: newBlocked }).eq('id', profile.id);

        const safetag = profile.safetag;

        if (newBlocked) {
            const dmMessage = `🚫 <b>Your Safeeely Account Has Been Blocked</b>\n\nYou've blocked your own account <b>@${safetag}</b>. No one can sign in or transact on it until you reactivate it.\n\nChanged your mind? Visit the Account Block page and switch to "Unblock account" any time.`;
            const emailHtml = `
                <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
                    <div style="background:#fef2f2;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center">
                        <span style="font-size:36px">🚫</span>
                        <h2 style="color:#dc2626;margin:8px 0 0">Account Blocked</h2>
                    </div>
                    <p style="color:#374151;font-size:15px">Hi <b>@${safetag}</b>,</p>
                    <p style="color:#374151;font-size:15px">You've blocked your own Safeeely account. No one can sign in or transact on it until you reactivate it.</p>
                    <p style="color:#374151;font-size:15px">You can reactivate it any time from the Account Block page using this same email.</p>
                </div>
            `;
            await routeNotification(profile.id, dmMessage);
            sendEmail({ to: profile.email, subject: '🚫 Your Safeeely Account Has Been Blocked', html: emailHtml }).catch(() => {});
        } else {
            const dmMessage = `✅ <b>Your Safeeely Account Has Been Reactivated</b>\n\nWelcome back, @${safetag}! Your account is fully active again — all trades, messages and funds remain exactly as they were.`;
            const emailHtml = `
                <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f0">
                    <div style="background:#f0fdf4;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center">
                        <span style="font-size:36px">✅</span>
                        <h2 style="color:#059669;margin:8px 0 0">Account Reactivated</h2>
                    </div>
                    <p style="color:#374151;font-size:15px">Hi <b>@${safetag}</b>,</p>
                    <p style="color:#374151;font-size:15px">Welcome back! Your Safeeely account is fully active again — all trades, messages and funds remain exactly as they were.</p>
                </div>
            `;
            await routeNotification(profile.id, dmMessage);
            sendEmail({ to: profile.email, subject: '✅ Your Safeeely Account Has Been Reactivated', html: emailHtml }).catch(() => {});
        }

        track(safetag, newBlocked ? 'account_self_blocked' : 'account_self_unblocked', {});

        res.json({ success: true, is_blocked: newBlocked });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile and session metadata.
 */
router.get('/me', async (req, res) => {
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
            ...profile,
            sub: profile.id,
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
 * POST /api/auth/logout
 * Revokes the current user session.
 */
router.post('/logout', async (req, res) => {
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

export default router;
