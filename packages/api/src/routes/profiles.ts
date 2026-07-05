import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import path from 'path';
import sharp from 'sharp';
import { sendNotification, sendReferralNotification, recordNotification, routeNotification } from '../services/notifications';
import { sendEmail } from '../services/email';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { requireUser, requireSafetagOwner, requireElevation, requireUserOrBot, markJtiRevoked, AuthedRequest, BotOrUserRequest } from '../middleware/requireUser';
import { requireBot, BotAuthedRequest } from '../middleware/requireBot';
import { track, identify } from '../lib/posthog';

// Badge-card composites run per-request; Sharp's default ~50MB native decode
// cache has no eviction pressure from Node's GC, so it just inflates resting RSS.
sharp.cache(false);

// 5 name-enquiry calls per user per 10 minutes — prevents account enumeration
const verifyBankRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => (req as AuthedRequest).user?.sub ?? req.ip ?? 'unknown',
    message: { error: 'Too many bank verification requests. Please wait 10 minutes before trying again.', code: 'RATE_LIMITED' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
});
const upload = multer({ storage: multer.memoryStorage() });

function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

const PROTECTED_SAFETAGS = ['safeeelysupport', 'safeeelyteam', 'safeeely', 'safeeelyofficial', 'admin', 'safepal', 'support'];

const router = Router();

const RegistrationSchema = z.object({
    safetag: z.string().min(3).max(20),
    email: z.string().email(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    primary_platform: z.enum(['telegram', 'discord', 'whatsapp', 'instagram', 'apple']),
    platform_id: z.string(),
    referral_code: z.string().optional()
});

const DeactivateSchema = z.object({
    reason: z.string().optional()
});

// Register or link profile
router.post('/register', async (req, res) => {
    console.log('📝 Received registration request:', req.body);
    try {
        const data = RegistrationSchema.parse(req.body);
        console.log('✅ Validation successful for:', data.safetag);

        // Check if safetag exists
        console.log('🔍 Checking if safetag exists...');
        const { data: existingTag, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('safetag', data.safetag)
            .maybeSingle();

        if (checkError) {
            console.error('❌ Error checking safetag:', checkError);
            throw checkError;
        }

        if (existingTag) {
            console.warn('⚠️ Safetag already taken:', data.safetag);
            return res.status(400).json({ error: 'Safetag already taken' });
        }

        // Impersonation check: reject safetags too similar to protected names
        const normalizedTag = (data.safetag || '').toLowerCase().replace(/^@/, '');
        const isTooSimilar = PROTECTED_SAFETAGS.some(p => levenshtein(normalizedTag, p) <= 1);
        if (isTooSimilar) {
            console.warn('⚠️ Safetag too similar to protected name:', data.safetag);
            return res.status(400).json({
                error: 'SAFETAG_RESERVED_SIMILARITY',
                message: 'This safetag is too similar to a protected name. Please choose a different one.'
            });
        }

        // Resolve referral code to profile ID
        let referredById = null;
        if (data.referral_code) {
            console.log(`🔍 Resolving referral code: ${data.referral_code}...`);
            const normalizedRef = data.referral_code.startsWith('@') ? data.referral_code : `@${data.referral_code}`;
            const { data: referrerData } = await supabase
                .from('profiles')
                .select('id')
                .ilike('safetag', normalizedRef)
                .single();

            if (referrerData) {
                const normalizedCode = (data.referral_code.startsWith('@') ? data.referral_code : `@${data.referral_code}`).toLowerCase();
                const normalizedNew = (data.safetag.startsWith('@') ? data.safetag : `@${data.safetag}`).toLowerCase();
                if (normalizedCode === normalizedNew) {
                    console.warn(`⚠️ Self-referral attempt blocked for safetag: ${data.safetag}`);
                } else {
                    referredById = referrerData.id;
                    console.log(`✅ Referral code resolved to ID: ${referredById}`);
                }
            } else {
                console.warn(`⚠️ Referral code not found: ${data.referral_code}. Proceeding without attribution.`);
            }
        }

        // Create profile
        console.log('🔨 Creating profile in Supabase...');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
                safetag: data.safetag,
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name,
                primary_platform: data.primary_platform,
                referred_by_id: referredById
            })
            .select()
            .single();

        if (profileError) {
            console.error('❌ Profile creation error:', profileError);
            throw profileError;
        }

        console.log('✨ Profile created successfully:', profile.id);

        console.log('🔗 Linking account...');
        const { error: linkError } = await supabase
            .from('linked_accounts')
            .insert({
                profile_id: profile.id,
                platform: data.primary_platform,
                platform_id: data.platform_id,
                is_primary: true
            });

        if (linkError) {
            console.error('❌ Account link error:', linkError);
            throw linkError;
        }

        // --- EARLY BIRD BADGE ---
        let earlyBirdAwarded = false;
        try {
            const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            if (count !== null && count <= 100) {
                await supabase.from('profile_badges').insert({
                    profile_id: profile.id,
                    badge_key: 'early_bird'
                });
                earlyBirdAwarded = true;
                console.log(`🏆 Awarded Early Bird badge to ${profile.id} (Total users: ${count})`);
                track(profile.safetag, 'early_bird_awarded', { total_users_at_award: count });
                routeNotification(
                    profile.id,
                    `🏆 You've earned a new badge!\n\n🐣 Early Bird\nYou were among the first 100 users to join Safeeely. Welcome to the future of safe trades!`,
                    undefined,
                    `${process.env.REVIEWS_URL || 'http://localhost:3001'}/badges/notifications/early_bird_badge.webp`,
                    undefined,
                    true
                ).catch(() => {});
            }
        } catch (badgeErr) {
            console.error('Failed to award Early Bird badge:', badgeErr);
        }

        identify(profile.safetag, {
            primary_platform: data.primary_platform,
            referred: !!referredById,
            early_bird: earlyBirdAwarded,
        });
        track(profile.safetag, 'user_registered', {
            platform: data.primary_platform,
            referred: !!referredById,
        });

        // Welcome email (non-blocking)
        const reviewsUrl = process.env.REVIEWS_URL || 'https://safeeely.com';
        sendEmail({
            to: profile.email,
            subject: `Welcome to Safeeely, ${profile.first_name || profile.safetag}!`,
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #0f172a;">Welcome to Safeeely! 🎉</h2>
                    <p style="color: #475569;">Hi <b>${profile.first_name || profile.safetag}</b>, your account is ready.</p>
                    <p style="color: #475569;"><b>Your Safetag:</b> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${profile.safetag}</code></p>
                    <p style="color: #475569;">You can use your Safetag on any of our supported platforms — Telegram, Discord, WhatsApp, and more.</p>
                    <a href="${reviewsUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0284c7;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Visit Safeeely</a>
                    <p style="font-size: 13px; color: #94a3b8; margin-top: 40px;">If you did not create this account, please contact support@safeeely.com immediately.</p>
                </div>
            `
        }).catch(e => console.error('Welcome email failed:', e.message));

        // Notify referrer about their new referral (fire-and-forget)
        if (referredById) {
            (async () => {
                try {
                    const { count: totalReferrals } = await supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .eq('referred_by_id', referredById);
                    const count = totalReferrals || 1;
                    const newUserName = data.first_name || data.safetag;
                    const platformMsg = `🎉 <b>New Referral!</b>\n\n<b>${newUserName}</b> just joined Safeeely using your invite link!\n\n👥 Total Referrals: <b>${count}</b>\n\nYou'll earn commission every time they complete a secure transaction. Keep sharing!`;
                    const emailHtml = `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;"><h2 style="color:#0f172a;">New Referral! 🎉</h2><p><b>${newUserName}</b> just joined Safeeely using your invite link!</p><p>👥 Total Referrals: <b>${count}</b></p><p style="color:#475569;">You'll earn commission every time they complete a secure transaction. Keep sharing!</p></div>`;
                    await sendReferralNotification(
                        referredById,
                        platformMsg,
                        `${newUserName} just joined Safeeely using your invite link!`,
                        emailHtml
                    );
                } catch (e: any) {
                    console.error('Referral join notification failed:', e.message);
                }
            })();
        }

        console.log('✅ Registration complete for:', data.safetag);
        return res.status(201).json(profile);
    } catch (err: any) {
        console.error('❌ Catch-all registration error:', err.message || err);
        return res.status(400).json({ error: err.message || 'Internal Server Error' });
    }
});

// Get profile by platform and ID
router.get('/by_platform/:platform/:id', async (req, res) => {
    const { platform, id } = req.params;
    console.log(`🔍 Lookup profile by platform: ${platform}, id: ${id}`);

    const { data: linkedAcc, error: linkedError } = await supabase
        .from('linked_accounts')
        .select('*')
        .eq('platform', platform)
        .eq('platform_id', id)
        .maybeSingle();

    if (linkedError) {
        console.error(`❌ Linked account error for ${platform}:${id}:`, linkedError);
        return res.status(500).json({ error: linkedError.message });
    }

    if (!linkedAcc) {
        console.warn(`⚠️ No linked account found for ${platform}:${id}`);
        return res.status(404).json({ error: 'Linked account not found' });
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', linkedAcc.profile_id)
        .maybeSingle();

    if (profileError) {
        console.error(`❌ Profile error for ${platform}:${id}:`, profileError);
        return res.status(500).json({ error: profileError.message });
    }
    console.log(`✅ Found profile for ${platform}:${id}:`, profile?.safetag);
    res.json(profile);
});

// Get all linked accounts (bound platforms) for a profile
router.get('/:safetag/linked-accounts', async (req, res) => {
    const { safetag } = req.params;
    const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
    const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;

    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
        .maybeSingle();

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const { data, error } = await supabase
        .from('linked_accounts')
        .select('platform, platform_id, is_primary')
        .eq('profile_id', profile.id)
        .order('is_primary', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
});

// Get profile by safetag
router.get('/by_safetag/:safetag', async (req, res) => {
    const { safetag } = req.params;
    const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('safetag', withAt)
        .is('deleted_at', null)
        .maybeSingle();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    if (!data) {
        return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(data);
});

// Update editable profile fields (name, bio, phone, country, notification/privacy prefs).
// Email is intentionally excluded — it's the Supabase auth identity and needs its own
// re-verification flow, not a plain field edit.
const ProfileUpdateSchema = z.object({
    first_name: z.string().trim().min(1).max(60).optional(),
    last_name: z.string().trim().max(60).optional(),
    bio: z.string().max(280).optional(),
    phone: z.string().trim().max(30).optional(),
    country: z.string().trim().length(2).optional(),
    notification_prefs: z.record(z.string(), z.boolean()).optional(),
    privacy_prefs: z.record(z.string(), z.boolean()).optional(),
});

router.patch('/:safetag', requireUser, requireSafetagOwner, async (req, res) => {
    try {
        const updates = ProfileUpdateSchema.parse(req.body);
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const profileId = (req as AuthedRequest).user.sub;
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profileId)
            .select('*')
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid profile update', details: err.issues });
        }
        console.error('❌ Profile Update Error:', err.message);
        res.status(400).json({ error: err.message || 'Failed to update profile' });
    }
});

// Upload/replace avatar — multipart/form-data { avatar: File }
const uploadAvatar = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('File must be an image'));
        cb(null, true);
    },
});

router.post('/:safetag/avatar', requireUser, requireSafetagOwner, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const profileId = (req as AuthedRequest).user.sub;
        const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const filename = `${profileId}_${Date.now()}.${ext}`;

        const { error: storageErr } = await supabase.storage
            .from('avatars')
            .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

        if (storageErr) {
            console.error('Avatar Storage Error:', storageErr);
            return res.status(500).json({ error: 'Failed to upload avatar. ' + storageErr.message });
        }

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filename);

        const { data, error } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', profileId)
            .select('avatar_url')
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        console.error('❌ Avatar Upload Error:', err.message);
        res.status(400).json({ error: err.message || 'Failed to upload avatar' });
    }
});

// Record that a user sent a message on a platform (updates 24hr window timestamp)
router.patch('/platform-activity', async (req, res) => {
    const { platform, platform_id } = req.body;
    if (!platform || !platform_id) return res.status(400).json({ error: 'platform and platform_id required' });
    const normalizedId = String(platform_id).replace(/^\+/, '');
    const { error, count } = await supabase
        .from('linked_accounts')
        .update({ last_message_at: new Date().toISOString() }, { count: 'exact' })
        .eq('platform', platform)
        .eq('platform_id', normalizedId);
    if (error) return res.status(500).json({ error: error.message });
    if (count === 0) {
        console.warn(`[platform-activity] No linked_account matched platform=${platform} platform_id=${normalizedId} (original: ${platform_id})`);
    }
    res.json({ ok: true });
});

// Search profile by name or safetag
router.get('/search', async (req, res) => {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query required' });
    }

    const safeQuery = query.replace(/[^a-zA-Z0-9\s@_\-]/g, '').trim().slice(0, 50);
    if (!safeQuery) return res.status(400).json({ error: 'Search query required' });

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`safetag.ilike.%${safeQuery}%,first_name.ilike.%${safeQuery}%,last_name.ilike.%${safeQuery}%`)
        .is('deleted_at', null)
        .limit(5);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

// Get platform-wide aggregate stats (must be before /:safetag to avoid route shadowing)
router.get('/stats/public', async (req, res) => {
    try {
        const [usersResult, tradesResult] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('transactions').select('id', { count: 'exact', head: true }).in('status', ['COMPLETED', 'FINALIZED']),
        ]);
        res.json({
            total_users: usersResult.count ?? 0,
            total_completed_trades: tradesResult.count ?? 0,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get balance for a profile
router.get('/:safetag/balance', requireUser, requireSafetagOwner, async (req, res) => {
    try {
        const profileId = (req as AuthedRequest).user.sub;

        const [txnResult, splitTxnResult, pendingTxnResult, withdrawalResult, refundCreditResult] = await Promise.all([
            // Seller earnings: FINALIZED one-time + all milestone txns
            supabase
                .from('transactions')
                .select('id, amount, currency, fee_amount, fee_allocation, transaction_type, status, milestones:transaction_milestones(*)')
                .eq('seller_id', profileId)
                .or('status.eq.FINALIZED,transaction_type.eq.MILESTONE'),
            // Seller split-verdict earnings: RESOLVED_SPLIT txns (ONE_TIME or MILESTONE) where seller has a share
            supabase
                .from('transactions')
                .select('id, amount, currency, fee_amount, fee_allocation, transaction_type, metadata')
                .eq('seller_id', profileId)
                .eq('status', 'RESOLVED_SPLIT'),
            supabase
                .from('transactions')
                .select('amount, currency, fee_amount, fee_allocation, transaction_type')
                .eq('seller_id', profileId)
                .in('status', ['ACCEPTED', 'PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER']),
            supabase
                .from('withdrawals')
                .select('amount, currency, status')
                .eq('profile_id', profileId)
                .neq('status', 'REJECTED'),
            // Buyer pending refunds: credits owed from REFUND_BUYER / SPLIT verdicts
            supabase
                .from('buyer_refund_credits')
                .select('amount, currency, status')
                .eq('buyer_id', profileId)
                .in('status', ['PENDING', 'PROCESSING']),
        ]);

        if (txnResult.error) throw txnResult.error;
        if (withdrawalResult.error) throw withdrawalResult.error;

        const txns = txnResult.data || [];
        const splitTxns = splitTxnResult.data || [];
        const withdrawals = withdrawalResult.data || [];

        const balances: Record<string, number> = {};
        const total_earned: Record<string, number> = {};

        txns.forEach(t => {
            let amountToCredit = 0;

            if (t.transaction_type === 'ONE_TIME' && t.status === 'FINALIZED') {
                amountToCredit = Number(t.amount);
                if (t.fee_allocation === 'seller') {
                    amountToCredit -= Number(t.fee_amount);
                } else if (t.fee_allocation === 'split') {
                    amountToCredit -= (Number(t.fee_amount) / 2);
                }
            } else if (t.transaction_type === 'MILESTONE') {
                const releasedMilestones = t.milestones?.filter((m: any) => m.status === 'RELEASED') || [];
                const releasedTotal = releasedMilestones.reduce((sum: number, m: any) => sum + Number(m.amount), 0);

                if (releasedTotal > 0) {
                    amountToCredit = releasedTotal;
                    const totalProjectAmount = Number(t.amount);
                    const totalFee = Number(t.fee_amount);
                    const feeToDeduct = t.fee_allocation === 'seller' ? totalFee : (t.fee_allocation === 'split' ? totalFee / 2 : 0);

                    if (feeToDeduct > 0 && totalProjectAmount > 0) {
                        const proportion = releasedTotal / totalProjectAmount;
                        amountToCredit -= (feeToDeduct * proportion);
                    }
                }
            }

            if (amountToCredit > 0) {
                balances[t.currency] = (balances[t.currency] || 0) + amountToCredit;
                total_earned[t.currency] = (total_earned[t.currency] || 0) + amountToCredit;
            }
        });

        // Credit seller's share from SPLIT verdicts (reads metadata.seller_amount set by disputes.ts)
        splitTxns.forEach(t => {
            const meta = (t as any).metadata || {};
            const sellerAmount = Number(meta.seller_amount || 0);
            if (sellerAmount > 0) {
                // Deduct fee proportional to seller's share
                let credit = sellerAmount;
                const sellerPct = Number(meta.seller_pct || 50) / 100;
                const fee = Number(t.fee_amount) * sellerPct;
                if (t.fee_allocation === 'seller') credit -= fee;
                else if (t.fee_allocation === 'split') credit -= fee / 2;
                if (credit > 0) {
                    balances[t.currency] = (balances[t.currency] || 0) + credit;
                    total_earned[t.currency] = (total_earned[t.currency] || 0) + credit;
                }
            }
        });

        // Add referral commission earnings
        const { data: referralCommissions } = await supabase
            .from('referral_commissions')
            .select('amount, currency')
            .eq('referrer_id', profileId)
            .eq('status', 'COMPLETED');

        referralCommissions?.forEach((rc: any) => {
            balances[rc.currency] = (balances[rc.currency] || 0) + Number(rc.amount);
            total_earned[rc.currency] = (total_earned[rc.currency] || 0) + Number(rc.amount);
        });

        // Subtract withdrawals from available balance
        withdrawals.forEach(w => {
            if (balances[w.currency] !== undefined) {
                balances[w.currency] -= Number(w.amount);
            }
        });

        // Pending escrow: net amount from active (not yet finalized) transactions
        const pendingEscrowMap: Record<string, number> = {};
        (pendingTxnResult.data || []).forEach(t => {
            let net = Number(t.amount);
            if (t.fee_allocation === 'seller') net -= Number(t.fee_amount);
            else if (t.fee_allocation === 'split') net -= Number(t.fee_amount) / 2;
            if (net > 0) pendingEscrowMap[t.currency] = (pendingEscrowMap[t.currency] || 0) + net;
        });

        // In-withdrawal: sum of PENDING + PROCESSING withdrawals
        const inWithdrawalMap: Record<string, number> = {};
        withdrawals.forEach(w => {
            if (w.status === 'PENDING' || w.status === 'PROCESSING') {
                inWithdrawalMap[w.currency] = (inWithdrawalMap[w.currency] || 0) + Number(w.amount);
            }
        });

        // Buyer pending refunds: amounts owed back to this profile as a buyer
        const pendingRefundsMap: Record<string, number> = {};
        (refundCreditResult.data || []).forEach((rc: any) => {
            pendingRefundsMap[rc.currency] = (pendingRefundsMap[rc.currency] || 0) + Number(rc.amount);
        });

        const fmt = (map: Record<string, number>) =>
            Object.entries(map).map(([currency, amount]) => ({
                currency,
                amount: Number(Math.max(0, amount).toFixed(2)),
            }));

        res.json({
            balances: fmt(balances),
            pending_escrow: fmt(pendingEscrowMap),
            in_withdrawal: fmt(inWithdrawalMap),
            total_earned: fmt(total_earned),
            pending_refunds: fmt(pendingRefundsMap),
        });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Bot-authenticated balance endpoint — same calculation as /:safetag/balance but uses HMAC bot auth
router.post('/bot-balance', requireBot, async (req, res) => {
    try {
        const platform = (req as BotAuthedRequest).botPlatform;
        const { platform_id } = req.body;
        if (!platform_id) return res.status(400).json({ error: 'platform_id is required' });

        const { data: linked } = await supabase
            .from('linked_accounts')
            .select('profile_id')
            .eq('platform', platform)
            .eq('platform_id', String(platform_id))
            .maybeSingle();

        if (!linked) return res.status(404).json({ error: 'No account linked for this platform_id' });

        const profileId = linked.profile_id;

        const [txnResult, splitTxnResult, pendingTxnResult, withdrawalResult, refundCreditResult] = await Promise.all([
            supabase
                .from('transactions')
                .select('id, amount, currency, fee_amount, fee_allocation, transaction_type, status, milestones:transaction_milestones(*)')
                .eq('seller_id', profileId)
                .or('status.eq.FINALIZED,transaction_type.eq.MILESTONE'),
            supabase
                .from('transactions')
                .select('id, amount, currency, fee_amount, fee_allocation, transaction_type, metadata')
                .eq('seller_id', profileId)
                .eq('status', 'RESOLVED_SPLIT'),
            supabase
                .from('transactions')
                .select('amount, currency, fee_amount, fee_allocation, transaction_type')
                .eq('seller_id', profileId)
                .in('status', ['ACCEPTED', 'PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER']),
            supabase
                .from('withdrawals')
                .select('amount, currency, status')
                .eq('profile_id', profileId)
                .neq('status', 'REJECTED'),
            supabase
                .from('buyer_refund_credits')
                .select('amount, currency, status')
                .eq('buyer_id', profileId)
                .in('status', ['PENDING', 'PROCESSING']),
        ]);

        if (txnResult.error) throw txnResult.error;
        if (withdrawalResult.error) throw withdrawalResult.error;

        const txns = txnResult.data || [];
        const splitTxns = splitTxnResult.data || [];
        const withdrawals = withdrawalResult.data || [];

        const balances: Record<string, number> = {};
        const total_earned: Record<string, number> = {};

        txns.forEach(t => {
            let amountToCredit = 0;
            if (t.transaction_type === 'ONE_TIME' && t.status === 'FINALIZED') {
                amountToCredit = Number(t.amount);
                if (t.fee_allocation === 'seller') amountToCredit -= Number(t.fee_amount);
                else if (t.fee_allocation === 'split') amountToCredit -= (Number(t.fee_amount) / 2);
            } else if (t.transaction_type === 'MILESTONE') {
                const releasedMilestones = t.milestones?.filter((m: any) => m.status === 'RELEASED') || [];
                const releasedTotal = releasedMilestones.reduce((sum: number, m: any) => sum + Number(m.amount), 0);
                if (releasedTotal > 0) {
                    amountToCredit = releasedTotal;
                    const totalFee = Number(t.fee_amount);
                    const feeToDeduct = t.fee_allocation === 'seller' ? totalFee : (t.fee_allocation === 'split' ? totalFee / 2 : 0);
                    if (feeToDeduct > 0 && Number(t.amount) > 0) {
                        amountToCredit -= (feeToDeduct * (releasedTotal / Number(t.amount)));
                    }
                }
            }
            if (amountToCredit > 0) {
                balances[t.currency] = (balances[t.currency] || 0) + amountToCredit;
                total_earned[t.currency] = (total_earned[t.currency] || 0) + amountToCredit;
            }
        });

        splitTxns.forEach(t => {
            const meta = (t as any).metadata || {};
            const sellerAmount = Number(meta.seller_amount || 0);
            if (sellerAmount > 0) {
                let credit = sellerAmount;
                const sellerPct = Number(meta.seller_pct || 50) / 100;
                const fee = Number(t.fee_amount) * sellerPct;
                if (t.fee_allocation === 'seller') credit -= fee;
                else if (t.fee_allocation === 'split') credit -= fee / 2;
                if (credit > 0) {
                    balances[t.currency] = (balances[t.currency] || 0) + credit;
                    total_earned[t.currency] = (total_earned[t.currency] || 0) + credit;
                }
            }
        });

        const { data: referralCommissions } = await supabase
            .from('referral_commissions')
            .select('amount, currency')
            .eq('referrer_id', profileId)
            .eq('status', 'COMPLETED');

        referralCommissions?.forEach((rc: any) => {
            balances[rc.currency] = (balances[rc.currency] || 0) + Number(rc.amount);
            total_earned[rc.currency] = (total_earned[rc.currency] || 0) + Number(rc.amount);
        });

        withdrawals.forEach(w => {
            if (balances[w.currency] !== undefined) balances[w.currency] -= Number(w.amount);
        });

        const pendingEscrowMap: Record<string, number> = {};
        (pendingTxnResult.data || []).forEach(t => {
            let net = Number(t.amount);
            if (t.fee_allocation === 'seller') net -= Number(t.fee_amount);
            else if (t.fee_allocation === 'split') net -= Number(t.fee_amount) / 2;
            if (net > 0) pendingEscrowMap[t.currency] = (pendingEscrowMap[t.currency] || 0) + net;
        });

        const inWithdrawalMap: Record<string, number> = {};
        withdrawals.forEach(w => {
            if (w.status === 'PENDING' || w.status === 'PROCESSING') {
                inWithdrawalMap[w.currency] = (inWithdrawalMap[w.currency] || 0) + Number(w.amount);
            }
        });

        const pendingRefundsMap: Record<string, number> = {};
        (refundCreditResult.data || []).forEach((rc: any) => {
            pendingRefundsMap[rc.currency] = (pendingRefundsMap[rc.currency] || 0) + Number(rc.amount);
        });

        const fmt = (map: Record<string, number>) =>
            Object.entries(map).map(([currency, amount]) => ({
                currency,
                amount: Number(Math.max(0, amount).toFixed(2)),
            }));

        res.json({
            balances: fmt(balances),
            pending_escrow: fmt(pendingEscrowMap),
            in_withdrawal: fmt(inWithdrawalMap),
            total_earned: fmt(total_earned),
            pending_refunds: fmt(pendingRefundsMap),
        });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Get monthly earnings history for the earnings chart
router.get('/:safetag/earnings-history', requireUser, requireSafetagOwner, async (req, res) => {
    try {
        const profileId = (req as AuthedRequest).user.sub;
        const months = Math.min(parseInt(req.query.months as string) || 6, 12);

        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - months);

        const { data: txns } = await supabase
            .from('transactions')
            .select('amount, currency, fee_amount, fee_allocation, updated_at')
            .eq('seller_id', profileId)
            .eq('status', 'FINALIZED')
            .gte('updated_at', cutoff.toISOString());

        // Group net earnings by month and currency
        const monthlyMap: Record<string, Record<string, number>> = {};
        (txns || []).forEach(t => {
            let net = Number(t.amount);
            if (t.fee_allocation === 'seller') net -= Number(t.fee_amount);
            else if (t.fee_allocation === 'split') net -= Number(t.fee_amount) / 2;
            if (net <= 0) return;

            const d = new Date(t.updated_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap[key]) monthlyMap[key] = {};
            monthlyMap[key][t.currency] = (monthlyMap[key][t.currency] || 0) + net;
        });

        // Determine primary currency by total earnings
        const currencyTotals: Record<string, number> = {};
        Object.values(monthlyMap).forEach(m => {
            Object.entries(m).forEach(([c, a]) => {
                currencyTotals[c] = (currencyTotals[c] || 0) + a;
            });
        });
        const primaryCurrency = Object.entries(currencyTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'USD';
        const availableCurrencies = Object.keys(currencyTotals);
        const requestedCurrency = (req.query.currency as string)?.toUpperCase();
        const selectedCurrency = requestedCurrency && availableCurrencies.includes(requestedCurrency)
            ? requestedCurrency
            : primaryCurrency;

        // Build the last N months array (including months with zero earnings)
        const history = [];
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const name = d.toLocaleString('en', { month: 'short' });
            history.push({
                name,
                earnings: Number(((monthlyMap[key]?.[selectedCurrency]) || 0).toFixed(2)),
            });
        }

        res.json({
            currency: selectedCurrency,
            history,
            available_currencies: availableCurrencies,
        });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Get badges for a profile
router.get('/:safetag/badges', async (req, res) => {
    try {
        const { safetag } = req.params;
        const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
            .maybeSingle();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const { data: badges, error } = await supabase
            .from('profile_badges')
            .select('*')
            .eq('profile_id', profile.id);

        if (error) throw error;

        const REVIEWS_URL_BASE = process.env.REVIEWS_URL || 'http://localhost:3001';
        const BADGE_CONFIG: Record<string, { label: string, emoji: string, awardImageUrl: string, description: string }> = {
            'early_bird':     { label: 'Early Bird',     emoji: '🐣', awardImageUrl: `${REVIEWS_URL_BASE}/badges/notifications/early_bird_badge.webp`,  description: 'You were among the first 100 users to join Safeeely!' },
            'whale_buyer':    { label: 'Whale Buyer',    emoji: '🐋', awardImageUrl: `${REVIEWS_URL_BASE}/badges/notifications/whale_buyer_badge.webp`, description: 'You\'ve completed over ₦1,000,000 in escrow trades!' },
            'trusted_seller': { label: 'Trusted Seller', emoji: '🛡️', awardImageUrl: `${REVIEWS_URL_BASE}/badges/notifications/trusted_seller.webp`,   description: 'You\'ve completed 10+ trades with a 4.5+ star rating!' },
            'zero_drama':     { label: 'Zero Drama',     emoji: '🕊️', awardImageUrl: `${REVIEWS_URL_BASE}/badges/notifications/zero_drama_badge.webp`,  description: 'You\'ve completed 20+ trades with zero disputes!' },
            'verified_kyc':   { label: 'KYC Verified',   emoji: '✅', awardImageUrl: `${REVIEWS_URL_BASE}/badges/notifications/verified_user.webp`,     description: 'Your identity has been verified on Safeeely!' },
        };

        const result = (badges || []).map(b => ({
            key: b.badge_key,
            label: BADGE_CONFIG[b.badge_key]?.label || b.badge_key,
            emoji: BADGE_CONFIG[b.badge_key]?.emoji || '🏅',
            imageUrl: BADGE_CONFIG[b.badge_key]?.awardImageUrl,
            description: BADGE_CONFIG[b.badge_key]?.description,
            awarded_at: b.created_at
        }));

        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Generate composited badge card image for the reviews section of all bots
router.get('/:safetag/badge-card', async (req, res) => {
    try {
        const { safetag } = req.params;
        const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
            .maybeSingle();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const { data: badges } = await supabase
            .from('profile_badges')
            .select('badge_key')
            .eq('profile_id', profile.id);

        const earnedKeys = new Set((badges || []).map((b: any) => b.badge_key));

        const BADGE_LAYERS: { file: string, condition: 'always' | 'badge' | 'locked', key?: string }[] = [
            { file: '01_background_image.webp',          condition: 'always' },
            { file: '02_badge_verified_user_white.webp',  condition: 'locked', key: 'verified_kyc'   },
            { file: '03_badge_early_bird_white.webp',     condition: 'locked', key: 'early_bird'     },
            { file: '04_badge_verified_user.webp',        condition: 'badge',  key: 'verified_kyc'   },
            { file: '05_badge_whale_buyer_white.webp',    condition: 'locked', key: 'whale_buyer'    },
            { file: '06_badge_zero_drama_white.webp',     condition: 'locked', key: 'zero_drama'     },
            { file: '07_badge_trusted_seller_white.webp', condition: 'locked', key: 'trusted_seller' },
            { file: '08_badge_trusted_seller.webp',       condition: 'badge',  key: 'trusted_seller' },
            { file: '09_badge_early_bird.webp',           condition: 'badge',  key: 'early_bird'     },
            { file: '10_badge_whale_buyer.webp',          condition: 'badge',  key: 'whale_buyer'    },
            { file: '11_badge_zero_drama.webp',           condition: 'badge',  key: 'zero_drama'     },
        ];

        const BADGES_DIR = path.join(__dirname, '../../../frontend/public/badges');

        const activeLayers = BADGE_LAYERS.filter(l =>
            l.condition === 'always'
            || (l.condition === 'badge'  &&  earnedKeys.has(l.key!))
            || (l.condition === 'locked' && !earnedKeys.has(l.key!))
        );

        const [base, ...overlays] = activeLayers;
        const composite = await sharp(path.join(BADGES_DIR, base.file))
            .composite(overlays.map(l => ({ input: path.join(BADGES_DIR, l.file), top: 0, left: 0 })))
            .png()
            .toBuffer();

        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=300');
        res.send(composite);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get completed trade count and member_since for a safetag (trust signals for bots)
router.get('/:safetag/stats', async (req, res) => {
    try {
        const { safetag } = req.params as { safetag: string };
        const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const withoutAt = withAt.slice(1);

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, created_at')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
            .maybeSingle();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const { count } = await supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
            .in('status', ['COMPLETED', 'FINALIZED']);

        res.json({ completed_trades: count ?? 0, member_since: profile.created_at });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Verify a bank account via name enquiry (Flutterwave or PalmPay)
router.post('/:safetag/verify-bank-account', requireUser, requireSafetagOwner, verifyBankRateLimit, async (req, res) => {
    try {
        const { bankCode, accountNumber } = req.body;
        if (!bankCode || !accountNumber) {
            return res.status(400).json({ error: 'bankCode and accountNumber are required' });
        }
        const { verifyBankAccount } = await import('../services/payout');
        const result = await verifyBankAccount(bankCode, String(accountNumber));
        res.json(result);
    } catch (err: any) {
        console.error('❌ verify-bank-account error:', err.message);
        const status = err.message?.toLowerCase().includes('not found') ? 400 : 502;
        res.status(status).json({ error: err.message || 'Could not verify account' });
    }
});

// Get payout methods for a profile
router.get('/:safetag/payout-methods', requireUser, requireSafetagOwner, async (req, res) => {
    try {
        const profileId = (req as AuthedRequest).user.sub;

        const { data: methods, error } = await supabase
            .from('payout_methods')
            .select('*')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(methods || []);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Save a new payout method
router.post('/:safetag/payout-methods', requireUser, requireSafetagOwner, requireElevation('payout_method'), async (req, res) => {
    try {
        const { type, is_default = false } = req.body;
        const profileId = (req as AuthedRequest).user.sub;
        let details: Record<string, any> = typeof req.body.details === 'string'
            ? JSON.parse(req.body.details)
            : req.body.details;

        if (!type || !details) return res.status(400).json({ error: 'type and details are required' });

        if (type === 'bank') {
            const acctNum: string = details.accountNumber || details.account_number || '';
            const bankCode: string = details.bankCode || details.bank_id || '';
            if (!acctNum || !bankCode) {
                return res.status(400).json({ error: 'bankCode and accountNumber are required for bank payout methods' });
            }
            // If verifiedAccountName not yet present, resolve it now
            if (!details.verifiedAccountName) {
                try {
                    const { verifyBankAccount } = await import('../services/payout');
                    const verified = await verifyBankAccount(bankCode, acctNum);
                    details = { ...details, verifiedAccountName: verified.accountName, verified: true };
                } catch (verifyErr: any) {
                    return res.status(400).json({ error: `Bank account verification failed: ${verifyErr.message}` });
                }
            }
        } else if (type === 'crypto') {
            const addr: string = details.address || '';
            if (!addr || !details.chain || !details.symbol) {
                return res.status(400).json({ error: 'address, chain, and symbol are required for crypto payout methods' });
            }
            // Basic address format validation (non-empty, min 20 chars, no spaces)
            if (addr.length < 20 || /\s/.test(addr)) {
                return res.status(400).json({ error: 'Invalid wallet address format' });
            }
        } else {
            return res.status(400).json({ error: `Unknown payout method type: ${type}` });
        }

        const { data, error } = await supabase
            .from('payout_methods')
            .insert({ profile_id: profileId, type, details, is_default })
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase Payout Insert Error:', error);
            throw error;
        }

        console.log('✨ Payout Method Created:', data.id);
        res.status(201).json(data);
    } catch (err: any) {
        console.error('❌ Payout Save Catch Error:', err.message || err);
        res.status(400).json({ error: err.message || 'Error saving payout method' });
    }
});

// Delete a payout method
router.delete('/:safetag/payout-methods/:id', requireUser, requireSafetagOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const profileId = (req as AuthedRequest).user.sub;

        const { data: method } = await supabase
            .from('payout_methods')
            .select('id')
            .eq('id', id)
            .eq('profile_id', profileId)
            .maybeSingle();

        if (!method) return res.status(404).json({ error: 'Payout method not found' });

        const { error } = await supabase.from('payout_methods').delete().eq('id', id);
        if (error) throw error;
        res.status(204).send();
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Set a payout method as the primary/default destination — unsets any previous default first.
router.patch('/:safetag/payout-methods/:id', requireUser, requireSafetagOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const profileId = (req as AuthedRequest).user.sub;
        if (req.body?.is_default !== true) {
            return res.status(400).json({ error: 'Only { is_default: true } is supported' });
        }

        const { data: method } = await supabase
            .from('payout_methods')
            .select('id')
            .eq('id', id)
            .eq('profile_id', profileId)
            .maybeSingle();

        if (!method) return res.status(404).json({ error: 'Payout method not found' });

        const { error: clearErr } = await supabase
            .from('payout_methods')
            .update({ is_default: false })
            .eq('profile_id', profileId);
        if (clearErr) throw clearErr;

        const { data, error } = await supabase
            .from('payout_methods')
            .update({ is_default: true })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;

        res.json(data);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Deactivate account (Meta policy compliance)
router.post('/:safetag/deactivate', requireUserOrBot, async (req, res) => {
    try {
        const isBot = (req as BotOrUserRequest).isBot;
        const rawTag = String(req.params.safetag);
        const cleanTag = rawTag.startsWith('@') ? rawTag : `@${rawTag}`;
        const withoutAt = cleanTag.replace('@', '');
        const { data: profileByTag } = await supabase.from('profiles').select('id').or(`safetag.ilike.${cleanTag},safetag.ilike.${withoutAt}`).maybeSingle();
        if (!profileByTag) return res.status(404).json({ error: 'Profile not found' });
        if (!isBot) {
            const user = (req as AuthedRequest).user;
            if (profileByTag.id !== user.sub) return res.status(403).json({ error: 'FORBIDDEN' });
        }
        const { reason } = DeactivateSchema.parse(req.body);
        const profileId = profileByTag.id;

        // 1. Find profile
        const { data: profile, error: findError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .maybeSingle();

        if (findError) throw findError;
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        if (profile.is_deactivated) {
            return res.status(400).json({ error: 'Account already deactivated' });
        }

        console.log(`👤 Deactivating account for ${profile.safetag} (${profile.id})`);

        // 2. Anonymize Profile
        const anonymizedEmail = `deleted_${profile.id.substring(0, 8)}@safeeely.com`;
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                first_name: 'Deleted',
                last_name: 'User',
                email: anonymizedEmail,
                is_deactivated: true,
                deactivation_reason: reason || 'No reason provided',
                deactivated_at: new Date().toISOString()
            })
            .eq('id', profile.id);

        if (updateError) throw updateError;

        // 3. Remove Linked Accounts
        const { error: linkDeleteError } = await supabase
            .from('linked_accounts')
            .delete()
            .eq('profile_id', profile.id);

        if (linkDeleteError) throw linkDeleteError;

        // 4. Remove Payout Methods
        const { error: payoutDeleteError } = await supabase
            .from('payout_methods')
            .delete()
            .eq('profile_id', profile.id);

        if (payoutDeleteError) throw payoutDeleteError;

        console.log(`✅ Account ${profile.safetag} deactivated successfully.`);
        res.json({ message: 'Account deactivated and personal data removed successfully.' });
    } catch (err: any) {
        console.error('❌ Deactivation Error:', err.message);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

// Delete account — gated behind a step-up confirmation link (no password to confirm against
// on this platform, so a freshly-issued magic link plays that role; see /auth/magic-link/request-elevation).
// Extends the deactivate anonymization with a soft-delete marker that excludes the profile from
// all public lookups, and force-logs-out every active session.
router.delete('/:safetag', requireUser, requireSafetagOwner, requireElevation('delete_account'), async (req, res) => {
    try {
        const profileId = (req as AuthedRequest).user.sub;

        const { data: profile, error: findError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .maybeSingle();

        if (findError) throw findError;
        if (!profile) return res.status(404).json({ error: 'Profile not found' });
        if (profile.deleted_at) return res.status(400).json({ error: 'Account already deleted' });

        const anonymizedEmail = `deleted_${profile.id.substring(0, 8)}@safeeely.com`;
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                first_name: 'Deleted',
                last_name: 'User',
                email: anonymizedEmail,
                bio: null,
                avatar_url: null,
                is_deactivated: true,
                deactivation_reason: 'Account deleted by user',
                deactivated_at: new Date().toISOString(),
                deleted_at: new Date().toISOString(),
            })
            .eq('id', profile.id);
        if (updateError) throw updateError;

        await supabase.from('linked_accounts').delete().eq('profile_id', profile.id);
        await supabase.from('payout_methods').delete().eq('profile_id', profile.id);

        // Force logout — revoke every active session for this profile, not just the current one.
        await supabase
            .from('user_sessions')
            .update({ revoked_at: new Date().toISOString() })
            .eq('profile_id', profile.id)
            .is('revoked_at', null);
        markJtiRevoked((req as AuthedRequest).user.jti);
        res.clearCookie('sf_session', { path: '/' });

        console.log(`🗑️ Account ${profile.safetag} deleted by user.`);
        res.json({ message: 'Account deleted successfully.' });
    } catch (err: any) {
        console.error('❌ Account Deletion Error:', err.message);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

import axios from 'axios';

// Submit KYC Verification
// --- KYC Upload Helper (v1) ---
router.post('/kyc/upload', upload.single('file'), async (req: any, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });
        
        const file = req.file;
        const filename = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
        
        // Use shared supabase client
        // Ensure 'kyc-documents' bucket exists or create it in dashboard
        const { data, error: storageErr } = await supabase.storage
            .from('kyc-documents')
            .upload(filename, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (storageErr) {
            console.error('Storage Error:', storageErr);
            return res.status(500).json({ error: 'Failed to upload to storage. ' + storageErr.message });
        }

        const { data: { publicUrl } } = supabase.storage
            .from('kyc-documents')
            .getPublicUrl(filename);

        res.json({ url: publicUrl });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:safetag/kyc/submit', requireUser, requireSafetagOwner, requireElevation('kyc'), async (req, res) => {
    try {
        const { firstName, lastName, phone, address, city, state, country, dob, documentCountry, nin, frontUrl, backUrl } = req.body;

        // 0. Enforce DOB
        if (!dob || dob.trim() === "") {
            return res.status(400).json({ error: 'Date of Birth is required' });
        }

        const profileId = (req as AuthedRequest).user.sub;

        // 1. Find profile and primary linked account
        const { data: profile, error: findError } = await supabase
            .from('profiles')
            .select('id, safetag')
            .eq('id', profileId)
            .maybeSingle();

        if (findError || !profile) return res.status(404).json({ error: 'Profile not found' });

        const { data: linked } = await supabase
            .from('linked_accounts')
            .select('platform, platform_id')
            .eq('profile_id', profile.id)
            .eq('is_primary', true)
            .maybeSingle();

        // 2. Insert into kyc_submissions table
        const { data: kycEntry, error: kycError } = await supabase
            .from('kyc_submissions')
            .insert({
                profile_id: profile.id,
                first_name: firstName,
                last_name: lastName,
                dob: dob || null,
                phone: phone,
                address: address,
                city: city,
                state: state,
                country: country,
                document_country: documentCountry,
                nin: nin,
                front_url: frontUrl,
                back_url: backUrl,
                status: 'PENDING'
            })
            .select()
            .single();

        if (kycError) {
            console.error('KYC Table Insert Error:', kycError);
            return res.status(400).json({ error: kycError.message });
        }

        // 3. Update profile status
        await supabase
            .from('profiles')
            .update({ kyc_status: 'PENDING' })
            .eq('id', profile.id);

        // 4. Insert into admin notifications
        try {
            await supabase.from('admin_notifications').insert({
                title: 'New KYC Submission',
                message: `User ${profile.safetag} has submitted KYC documents for review.`,
                type: 'kyc_review',
                related_id: kycEntry.id,
                status: 'unread'
            });
        } catch (e) {
            console.error('Admin notification failed:', e);
        }

        // 5. Send Social Notification to User
        if (linked) {
            const msg = `🛡️ **KYC Processing**\n\nHello @${profile.safetag}, your Know Your Customer (KYC) details have been successfully submitted and are currently being reviewed by our compliance team. ✅\n\nYou will be notified here as soon as it is approved.`;
            await sendNotification(linked.platform, linked.platform_id, msg);
        }
        recordNotification(profile.id, 'kyc', '🛡️ KYC Submitted', 'Your identity documents are under review — you\'ll be notified when approved', { link_url: '/kyc' }).catch(() => {});
        track(profile.safetag, 'kyc_submitted', { id_type: nin ? 'nin' : 'unknown', country });

        console.log(`✅ KYC Submitted & Saved for ${profile.safetag}`);
        res.json({ message: 'KYC submitted successfully. Awaiting review.' });
    } catch (err: any) {
        console.error('❌ KYC Submit Error:', err.message);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

export default router;
