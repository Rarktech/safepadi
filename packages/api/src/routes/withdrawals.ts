import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { routeNotification, recordNotification } from '../services/notifications';
import { sendWithdrawalInitiatedEmail } from '../services/email';
import { requireUser, requireSafetagOwner, requireElevation, AuthedRequest } from '../middleware/requireUser';

const router = Router();

// Create a withdrawal request
router.post('/:safetag', requireUser, requireSafetagOwner, requireElevation('withdraw'), async (req, res) => {
    try {
        const { amount, currency, payout_method_id, details } = req.body;
        const profileId = (req as AuthedRequest).user.sub;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, safetag, kyc_status')
            .eq('id', profileId)
            .maybeSingle();

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        // KYC gate: require verification for withdrawals above threshold
        const KYC_THRESHOLDS: Record<string, number> = { USD: 100, NGN: 100000, BTC: 0.002, USDT: 100, EUR: 100 };
        const threshold = KYC_THRESHOLDS[currency] ?? 100;
        if (profile.kyc_status !== 'VERIFIED' && Number(amount) > threshold) {
            return res.status(403).json({
                error: `KYC verification is required for withdrawals above ${threshold} ${currency}. Please complete identity verification to proceed.`,
                code: 'KYC_REQUIRED',
            });
        }

        // Balance check: compute available balance and reject if insufficient
        const { data: earnings } = await supabase
            .from('transactions')
            .select('total_amount')
            .eq('seller_id', profileId)
            .in('status', ['FINALIZED', 'COMPLETED'])
            .eq('currency', currency);

        const { data: pendingWithdrawals } = await supabase
            .from('withdrawals')
            .select('amount')
            .eq('profile_id', profileId)
            .eq('currency', currency)
            .in('status', ['PROCESSING', 'PENDING']);

        const totalEarned = (earnings || []).reduce((s, t) => s + Number(t.total_amount), 0);
        const totalPendingOut = (pendingWithdrawals || []).reduce((s, w) => s + Number(w.amount), 0);
        const availableBalance = totalEarned - totalPendingOut;

        if (Number(amount) > availableBalance) {
            return res.status(400).json({
                error: 'INSUFFICIENT_BALANCE',
                message: `Insufficient balance. Available: ${availableBalance.toFixed(2)} ${currency}, requested: ${Number(amount).toFixed(2)} ${currency}.`
            });
        }

        const reference = `WD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        const { data, error } = await supabase
            .from('withdrawals')
            .insert({
                profile_id: profile.id,
                payout_method_id,
                amount,
                currency,
                status: 'PROCESSING',
                reference,
                details
            })
            .select()
            .single();

        if (error) throw error;

        // Notify user their withdrawal request was received
        const notifMsg = `💸 <b>Withdrawal Request Received</b>\n\nYour withdrawal of <b>${amount} ${currency}</b> has been received and is currently being processed.\n\n📋 Reference: <b>${reference}</b>\n\nYou'll be notified once the funds have been sent to your payout method.`;
        routeNotification(
            profile.id,
            notifMsg,
            [],
            undefined,
            profile.email ? () => sendWithdrawalInitiatedEmail(profile.email, { safetag: profile.safetag, amount: Number(amount), currency, reference }) : undefined
        ).catch(() => {});
        recordNotification(profile.id, 'withdrawal', '💸 Withdrawal Request Received', `${amount} ${currency} — processing within 24 hrs`, { withdrawal_id: data.id, amount, currency, reference, link_url: '/dashboard/withdrawals' }).catch(() => {});

        res.status(201).json(data);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
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
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
