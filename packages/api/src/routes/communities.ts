import { Router } from 'express';
import { supabase } from '@safepal/shared';
import axios from 'axios';

const router = Router();

router.use((req, res, next) => {
    console.log(`[Community Service] ${req.method} ${req.url}`);
    next();
});

// Register a new community group — supports both Telegram and Discord
router.post('/register', async (req, res) => {
    try {
        const {
            telegram_group_id, admin_telegram_id,   // Telegram fields
            discord_guild_id, admin_discord_id,      // Discord fields
            group_name, license_tier = 'free',
        } = req.body;

        const platform: 'telegram' | 'discord' = discord_guild_id ? 'discord' : 'telegram';
        const platformAdminId = platform === 'discord' ? admin_discord_id : admin_telegram_id;
        const nativeGroupId = platform === 'discord' ? discord_guild_id : telegram_group_id;
        const nativeGroupField = platform === 'discord' ? 'discord_guild_id' : 'telegram_group_id';

        if (!nativeGroupId || !group_name || !platformAdminId) {
            return res.status(400).json({ error: 'group_id, group_name, and admin_id are required' });
        }

        const { data: linkedAccount } = await supabase
            .from('linked_accounts')
            .select('profile_id')
            .eq('platform', platform)
            .eq('platform_id', String(platformAdminId))
            .maybeSingle();

        if (!linkedAccount?.profile_id) {
            return res.status(404).json({ error: 'Admin must be a registered Safeeely user before licensing a group' });
        }

        const adminProfileId = linkedAccount.profile_id;

        const { data: existing } = await supabase
            .from('community_groups')
            .select('id, status')
            .eq(nativeGroupField, Number(nativeGroupId))
            .maybeSingle();

        if (existing) {
            if (existing.status === 'active') {
                return res.status(409).json({ error: 'This group is already licensed', group_id: existing.id });
            }
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

        const insertPayload: Record<string, any> = {
            [nativeGroupField]: Number(nativeGroupId),
            platform,
            group_name,
            admin_profile_id: adminProfileId,
            license_tier,
            admin_revenue_share_percent: adminRevenueSharePercent,
        };

        const { data: group, error } = await supabase
            .from('community_groups')
            .insert(insertPayload)
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

// Check if a user is a group admin — returns all active groups for multi-group management
router.get('/by_admin_platform/telegram/:platformId', async (req, res) => {
    try {
        const { platformId } = req.params;

        const { data: linked } = await supabase
            .from('linked_accounts')
            .select('profile_id')
            .eq('platform', 'telegram')
            .eq('platform_id', platformId)
            .maybeSingle();

        const profileId = linked?.profile_id;
        if (!profileId) return res.json({ communities: [], community: null });

        const { data: groups } = await supabase
            .from('community_groups')
            .select('*')
            .eq('admin_profile_id', profileId)
            .eq('platform', 'telegram')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        const communities = groups || [];
        return res.json({ communities, community: communities[0] || null });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Check if a Discord guild is registered
router.get('/by_discord/:guildId', async (req, res) => {
    try {
        const { data: group } = await supabase
            .from('community_groups')
            .select('*')
            .eq('discord_guild_id', Number(req.params.guildId))
            .maybeSingle();
        if (!group) return res.status(404).json({ error: 'Guild not found' });
        return res.json({ group });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Check if a Discord user is an admin of any licensed servers
router.get('/by_admin_platform/discord/:platformId', async (req, res) => {
    try {
        const { platformId } = req.params;
        const { data: linked } = await supabase
            .from('linked_accounts')
            .select('profile_id')
            .eq('platform', 'discord')
            .eq('platform_id', platformId)
            .maybeSingle();

        const profileId = linked?.profile_id;
        if (!profileId) return res.json({ communities: [], community: null });

        const { data: groups } = await supabase
            .from('community_groups')
            .select('*')
            .eq('admin_profile_id', profileId)
            .eq('platform', 'discord')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        const communities = groups || [];
        return res.json({ communities, community: communities[0] || null });
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

        // Already-withdrawn amounts (PENDING / PROCESSING / PAID count against balance)
        const { data: priorWithdrawals } = await supabase
            .from('withdrawals')
            .select('amount, currency')
            .eq('group_id', id)
            .in('status', ['PENDING', 'PROCESSING', 'PAID']);

        const withdrawnByCurrency: Record<string, number> = {};
        (priorWithdrawals || []).forEach((w: any) => {
            withdrawnByCurrency[w.currency] = (withdrawnByCurrency[w.currency] || 0) + Number(w.amount);
        });

        const withdrawableByCurrency: Record<string, number> = {};
        Object.entries(earningsByCurrency).forEach(([currency, total]) => {
            const available = total - (withdrawnByCurrency[currency] || 0);
            if (available > 0) withdrawableByCurrency[currency] = available;
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
            withdrawable: Object.entries(withdrawableByCurrency).map(([currency, available]) => ({ currency, available })),
            volume: Object.entries(volumeByCurrency).map(([currency, total]) => ({ currency, total })),
            totalDeals,
            completedDeals,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Request a commission withdrawal for a licensed group
router.post('/:id/withdraw', async (req, res) => {
    try {
        const { id } = req.params;
        const { currency, amount, bank_name, account_number, account_name } = req.body;

        if (!currency || !amount || !bank_name || !account_number || !account_name) {
            return res.status(400).json({ error: 'currency, amount, bank_name, account_number, and account_name are required' });
        }

        const { data: group } = await supabase
            .from('community_groups')
            .select('id, group_name, admin_profile_id')
            .eq('id', id)
            .single();
        if (!group) return res.status(404).json({ error: 'Group not found' });

        // Calculate available balance
        const { data: commissions } = await supabase
            .from('community_commissions')
            .select('amount')
            .eq('group_id', id)
            .eq('currency', currency)
            .eq('status', 'COMPLETED');
        const totalEarned = (commissions || []).reduce((s: number, c: any) => s + Number(c.amount), 0);

        const { data: priorW } = await supabase
            .from('withdrawals')
            .select('amount')
            .eq('group_id', id)
            .eq('currency', currency)
            .in('status', ['PENDING', 'PROCESSING', 'PAID']);
        const totalWithdrawn = (priorW || []).reduce((s: number, w: any) => s + Number(w.amount), 0);

        const available = totalEarned - totalWithdrawn;
        if (Number(amount) > available) {
            return res.status(400).json({ error: `Insufficient balance. Available: ${available.toFixed(2)} ${currency}` });
        }

        const reference = `CWD-${id.replace(/-/g, '').slice(0, 16)}-${Date.now()}`;
        const { data: withdrawal, error } = await supabase
            .from('withdrawals')
            .insert({
                profile_id: group.admin_profile_id,
                group_id: id,
                amount: Number(amount),
                currency,
                status: 'PENDING',
                reference,
                details: { bank_name, account_number, account_name },
            })
            .select()
            .single();
        if (error) throw error;

        const { sendReferralNotification } = await import('../services/notifications');
        await sendReferralNotification(
            group.admin_profile_id,
            `💸 <b>Withdrawal Requested</b>\n\nGroup: <b>${group.group_name}</b>\nAmount: <b>${Number(amount).toLocaleString()} ${currency}</b>\nBank: ${bank_name} · ${account_number}\nAccount: ${account_name}\n\nStatus: <b>Pending</b> — we'll process within 1–2 business days.`,
            `Withdrawal request for ${group.group_name}`,
            `<p>Withdrawal of <b>${Number(amount).toLocaleString()} ${currency}</b> requested for <b>${group.group_name}</b>.<br>Bank: ${bank_name} · ${account_number} · ${account_name}<br>We'll process within 1–2 business days.</p>`
        );

        return res.status(201).json({ withdrawal });
    } catch (err: any) {
        console.error('❌ Community withdraw error:', err);
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

// Initiate a tier upgrade payment via Flutterwave
router.post('/:id/upgrade/initiate', async (req, res) => {
    try {
        const { id } = req.params;
        const { target_tier } = req.body;

        if (!['pro', 'enterprise'].includes(target_tier)) {
            return res.status(400).json({ error: 'target_tier must be "pro" or "enterprise"' });
        }

        const { data: group } = await supabase
            .from('community_groups')
            .select('*, admin:admin_profile_id(id, email, first_name, last_name, safetag)')
            .eq('id', id)
            .single();

        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.status !== 'active') return res.status(400).json({ error: 'Group is not active' });
        if (group.license_tier === target_tier) return res.status(400).json({ error: `Already on the ${target_tier} tier` });
        if (group.license_tier === 'enterprise') return res.status(400).json({ error: 'Already on the highest tier' });

        const tierPrices: Record<string, { amount: number; currency: string }> = {
            pro: { amount: 15000, currency: 'NGN' },
            enterprise: { amount: 35000, currency: 'NGN' },
        };
        const price = tierPrices[target_tier];

        const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
        if (!secretKey) return res.status(500).json({ error: 'Payment gateway not configured' });

        // Encode groupId without dashes so tx_ref is unambiguously parseable
        const groupIdEncoded = id.replace(/-/g, '');
        const txRef = `UPLG-${groupIdEncoded}-${target_tier}-${Date.now()}`;

        const admin = group.admin as any;
        const reviewsUrl = process.env.REVIEWS_URL || 'http://localhost:3001';

        const payload = {
            tx_ref: txRef,
            amount: price.amount,
            currency: price.currency,
            redirect_url: `${reviewsUrl}/upgrade/success`,
            payment_options: 'card,banktransfer,ussd',
            customer: {
                email: admin?.email || 'admin@safeeely.com',
                name: `${admin?.first_name || ''} ${admin?.last_name || ''}`.trim() || admin?.safetag || 'Group Admin',
            },
            customizations: {
                title: 'Safeeely Community License',
                description: `Upgrade to ${target_tier.charAt(0).toUpperCase() + target_tier.slice(1)} tier — ${group.group_name}`,
                logo: 'https://safeeely.com/logo.png',
            },
        };

        const response = await axios.post('https://api.flutterwave.com/v3/payments', payload, {
            headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        });

        if (response.data.status === 'success') {
            return res.json({ payment_url: response.data.data.link, tx_ref: txRef });
        }
        throw new Error(response.data.message || 'Flutterwave initialization failed');
    } catch (err: any) {
        console.error('❌ Community upgrade initiate error:', err.response?.data || err.message);
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
