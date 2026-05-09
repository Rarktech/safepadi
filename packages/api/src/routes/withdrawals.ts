import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';

const router = Router();

// Create a withdrawal request
router.post('/:safetag', async (req, res) => {
    try {
        const { safetag } = req.params;
        const { amount, currency, payout_method_id, details } = req.body;

        const withAt = safetag.startsWith('@') ? safetag : `@${safetag}`;
        const withoutAt = safetag.startsWith('@') ? safetag.slice(1) : safetag;

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, kyc_status')
            .or(`safetag.ilike.${withAt},safetag.ilike.${withoutAt}`)
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
        res.status(201).json(data);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// Get withdrawal history for a profile
router.get('/:safetag', async (req, res) => {
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

        const { data, error } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('profile_id', profile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
