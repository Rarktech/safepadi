import { Router } from 'express';
import { supabase } from '@safepal/shared';
import crypto from 'crypto';
import { routeNotification, recordNotification } from '../services/notifications';
import { sendWithdrawalInitiatedEmail } from '../services/email';
import { disburseFunds } from '../services/payout';
import { requireUser, requireSafetagOwner, requireElevation, AuthedRequest } from '../middleware/requireUser';
import { CRYPTO_CURRENCIES, AUTO_DISBURSE_THRESHOLDS, KYC_THRESHOLDS } from '../constants/payouts';
import { track } from '../lib/posthog';

const router = Router();

// Create a withdrawal request
router.post('/:safetag', requireUser, requireSafetagOwner, requireElevation('withdraw'), async (req, res) => {
    try {
        const { amount, currency, payout_method_id, details } = req.body;
        const profileId = (req as AuthedRequest).user.sub;

        if (!amount || !currency) {
            return res.status(400).json({ error: 'amount and currency are required' });
        }
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, safetag, kyc_status')
            .eq('id', profileId)
            .maybeSingle();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        // KYC gate
        const threshold = KYC_THRESHOLDS[currency] ?? 100;
        if (profile.kyc_status !== 'VERIFIED' && numAmount > threshold) {
            return res.status(403).json({
                error: `KYC verification required for withdrawals above ${threshold} ${currency}.`,
                code: 'KYC_REQUIRED',
            });
        }

        // Velocity limit: max 3 pending withdrawals per 24 h per user per currency
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: pendingCount } = await supabase
            .from('withdrawals')
            .select('id', { count: 'exact', head: true })
            .eq('profile_id', profileId)
            .eq('currency', currency)
            .in('status', ['PENDING_APPROVAL', 'PROCESSING', 'PENDING'])
            .gte('created_at', dayAgo);

        if ((pendingCount ?? 0) >= 3) {
            return res.status(429).json({
                error: 'Too many pending withdrawals. A maximum of 3 can be queued at a time. Please wait for existing requests to settle.',
                code: 'VELOCITY_LIMIT',
            });
        }

        // Velocity limit: max total amount per 24 h
        const autoThreshold = AUTO_DISBURSE_THRESHOLDS[currency] ?? 500;
        const { data: recentWithdrawals } = await supabase
            .from('withdrawals')
            .select('amount')
            .eq('profile_id', profileId)
            .eq('currency', currency)
            .in('status', ['PENDING_APPROVAL', 'PROCESSING', 'PENDING', 'PAID'])
            .gte('created_at', dayAgo);
        const recent24hTotal = (recentWithdrawals || []).reduce((s, w) => s + Number(w.amount), 0);
        if (recent24hTotal + numAmount > autoThreshold * 2) {
            return res.status(429).json({
                error: `Daily withdrawal limit exceeded for ${currency}. Please contact support for large transfers.`,
                code: 'DAILY_LIMIT',
            });
        }

        // Dual-approval gate: crypto always, large fiat requires approval
        const isCrypto = CRYPTO_CURRENCIES.has(currency);
        const requiresApproval = isCrypto || numAmount > (AUTO_DISBURSE_THRESHOLDS[currency] ?? 500);

        // Server-generated idempotency key
        const idempotencyKey = crypto.randomUUID();

        // Atomic balance check + insert via Postgres advisory lock
        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_withdrawal_atomic', {
            p_profile_id: profileId,
            p_amount: numAmount,
            p_currency: currency,
            p_payout_method_id: payout_method_id || null,
            p_details: details || {},
            p_idempotency_key: idempotencyKey,
            p_requires_approval: requiresApproval,
        });

        if (rpcError) throw rpcError;

        const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
        if (row?.out_error === 'INSUFFICIENT_BALANCE') {
            return res.status(400).json({
                error: 'INSUFFICIENT_BALANCE',
                message: `Insufficient available balance for ${currency}.`,
            });
        }
        if (!row?.out_id) throw new Error('Failed to create withdrawal');

        const withdrawalId: string = row.out_id;
        const reference: string = row.out_reference;
        const status: string = row.out_status;

        // Notify user
        const processingMsg = requiresApproval
            ? `🔍 <b>Withdrawal Under Review</b>\n\nYour withdrawal of <b>${numAmount} ${currency}</b> is pending approval.\n\n📋 Reference: <b>${reference}</b>\n\nYou'll be notified once it's approved and funds are on their way.`
            : `💸 <b>Withdrawal Request Received</b>\n\nYour withdrawal of <b>${numAmount} ${currency}</b> is being processed.\n\n📋 Reference: <b>${reference}</b>\n\nYou'll be notified once funds are sent.`;

        routeNotification(
            profileId,
            processingMsg,
            [],
            undefined,
            profile.email ? () => sendWithdrawalInitiatedEmail(profile.email, { safetag: profile.safetag, amount: numAmount, currency, reference }) : undefined
        ).catch(() => {});
        recordNotification(profileId, 'withdrawal', '💸 Withdrawal Request Received', `${numAmount} ${currency} — ${requiresApproval ? 'pending approval' : 'processing'}`, { withdrawal_id: withdrawalId, amount: numAmount, currency, reference, link_url: `/withdraw/${encodeURIComponent(profile.safetag)}?view=withdraw` }).catch(() => {});

        track(profile.safetag, 'withdrawal_requested', {
            amount: numAmount,
            currency,
            initial_status: status,
            kyc_verified: profile.kyc_status === 'VERIFIED',
            velocity_flagged: (pendingCount ?? 0) > 0,
        });

        // Auto-disburse for amounts below threshold (fire-and-forget)
        if (!requiresApproval) {
            track(profile.safetag, 'withdrawal_auto_disbursed', { amount: numAmount, currency });
            setImmediate(() => {
                disburseFunds(withdrawalId).catch(err =>
                    console.error(`[Withdrawal] Auto-disburse failed for ${withdrawalId}:`, err.message)
                );
            });
        } else {
            track(profile.safetag, 'withdrawal_held_for_approval', {
                amount: numAmount,
                currency,
                hold_reason: isCrypto ? 'crypto' : 'amount_threshold',
            });
        }

        res.status(201).json({ id: withdrawalId, reference, status, idempotency_key: idempotencyKey });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('❌ Withdrawal error:', message);
        res.status(400).json({ error: message });
    }
});

// Get withdrawal history for a profile
router.get('/:safetag', requireUser, requireSafetagOwner, async (req, res) => {
    try {
        const profileId = (req as AuthedRequest).user.sub;

        const { data, error } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(400).json({ error: message });
    }
});

export default router;
