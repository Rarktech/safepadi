import { Router } from 'express';
import { supabase } from '@safepal/shared';

const router = Router();

router.use((req, res, next) => {
    console.log(`[Community Service] ${req.method} ${req.url}`);
    next();
});

// Register a new community group
router.post('/register', async (req, res) => {
    try {
        const { telegram_group_id, group_name, admin_telegram_id, license_tier = 'free' } = req.body;

        if (!telegram_group_id || !group_name || !admin_telegram_id) {
            return res.status(400).json({ error: 'telegram_group_id, group_name, and admin_telegram_id are required' });
        }

        // Look up admin profile by Telegram platform ID
        const { data: linkedAccount } = await supabase
            .from('linked_accounts')
            .select('profile_id')
            .eq('platform', 'telegram')
            .eq('platform_id', String(admin_telegram_id))
            .maybeSingle();

        if (!linkedAccount?.profile_id) {
            return res.status(404).json({ error: 'Admin must be a registered Safeeely user before licensing a group' });
        }

        const adminProfileId = linkedAccount.profile_id;

        // Check if this group is already registered
        const { data: existing } = await supabase
            .from('community_groups')
            .select('id, status')
            .eq('telegram_group_id', telegram_group_id)
            .maybeSingle();

        if (existing) {
            if (existing.status === 'active') {
                return res.status(409).json({ error: 'This group is already licensed', group_id: existing.id });
            }
            // Reactivate suspended group
            const { data: reactivated } = await supabase
                .from('community_groups')
                .update({ status: 'active', license_tier, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();
            return res.json({ group: reactivated, reactivated: true });
        }

        const revenueShareMap: Record<string, number> = { free: 10, pro: 25, enterprise: 40 };
        const adminRevenueSharePercent = revenueShareMap[license_tier] ?? 10;

        const { data: group, error } = await supabase
            .from('community_groups')
            .insert({
                telegram_group_id: Number(telegram_group_id),
                group_name,
                admin_profile_id: adminProfileId,
                license_tier,
                admin_revenue_share_percent: adminRevenueSharePercent,
            })
            .select()
            .single();

        if (error) throw error;
        return res.status(201).json({ group });
    } catch (err: any) {
        console.error('❌ Community register error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Check if a Telegram group is registered
router.get('/by_telegram/:groupId', async (req, res) => {
    try {
        const { data: group } = await supabase
            .from('community_groups')
            .select('*')
            .eq('telegram_group_id', Number(req.params.groupId))
            .maybeSingle();

        if (!group) return res.status(404).json({ error: 'Group not found' });
        return res.json({ group });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Check if a user is a group admin (used to show "My Group" button conditionally)
router.get('/by_admin_platform/telegram/:platformId', async (req, res) => {
    try {
        const { platformId } = req.params;

        // Find profile by linked account
        const { data: linked } = await supabase
            .from('linked_accounts')
            .select('profile_id')
            .eq('platform', 'telegram')
            .eq('platform_id', platformId)
            .maybeSingle();

        const profileId = linked?.profile_id;
        if (!profileId) return res.json({ community: null });

        const { data: group } = await supabase
            .from('community_groups')
            .select('*')
            .eq('admin_profile_id', profileId)
            .eq('status', 'active')
            .maybeSingle();

        return res.json({ community: group || null });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get community stats for the admin dashboard
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: group } = await supabase
            .from('community_groups')
            .select('*')
            .eq('id', id)
            .single();

        if (!group) return res.status(404).json({ error: 'Group not found' });

        // Total commissions earned
        const { data: commissions } = await supabase
            .from('community_commissions')
            .select('amount, currency')
            .eq('group_id', id)
            .eq('status', 'COMPLETED');

        const earningsByCurrency: Record<string, number> = {};
        (commissions || []).forEach((c: any) => {
            earningsByCurrency[c.currency] = (earningsByCurrency[c.currency] || 0) + Number(c.amount);
        });

        // Total transaction volume in this group
        const { data: groupTxns } = await supabase
            .from('transactions')
            .select('amount, currency, status')
            .eq('group_id', id);

        const volumeByCurrency: Record<string, number> = {};
        let totalDeals = 0;
        let completedDeals = 0;
        (groupTxns || []).forEach((t: any) => {
            volumeByCurrency[t.currency] = (volumeByCurrency[t.currency] || 0) + Number(t.amount);
            totalDeals++;
            if (t.status === 'FINALIZED') completedDeals++;
        });

        return res.json({
            group,
            earnings: Object.entries(earningsByCurrency).map(([currency, total]) => ({ currency, total })),
            volume: Object.entries(volumeByCurrency).map(([currency, total]) => ({ currency, total })),
            totalDeals,
            completedDeals,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Update group settings (welcome message, tier)
router.patch('/:id/settings', async (req, res) => {
    try {
        const { id } = req.params;
        const { welcome_message, license_tier } = req.body;

        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (welcome_message !== undefined) updates.welcome_message = welcome_message;
        if (license_tier) {
            const revenueShareMap: Record<string, number> = { free: 10, pro: 25, enterprise: 40 };
            updates.license_tier = license_tier;
            updates.admin_revenue_share_percent = revenueShareMap[license_tier] ?? 10;
        }

        const { data: group, error } = await supabase
            .from('community_groups')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return res.json({ group });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Manually trigger the weekly digest (for testing)
router.post('/digest/trigger', async (req, res) => {
    try {
        const { runWeeklyDigest } = await import('../cron/weeklyDigest');
        await runWeeklyDigest();
        res.json({ ok: true, message: 'Weekly digest sent to all active group admins' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Suspend a community group (admin use)
router.post('/:id/suspend', async (req, res) => {
    try {
        const { data: group, error } = await supabase
            .from('community_groups')
            .update({ status: 'suspended', updated_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        return res.json({ group });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
