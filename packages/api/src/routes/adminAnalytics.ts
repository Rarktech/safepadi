import { Router } from 'express';
import { supabase } from '@safepal/shared';
import { adminAuthMiddleware } from './admin';

const router = Router();
router.use(adminAuthMiddleware);

// Funnel: Registration → First Trade → Completed Trade → First Withdrawal
router.get('/funnel', async (req, res) => {
    try {
        const [totalRegisteredRes, allTxnsRes, finalizedTxnsRes, paidWithdrawalsRes] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('transactions').select('buyer_id'),
            supabase.from('transactions').select('buyer_id').eq('status', 'FINALIZED'),
            supabase.from('withdrawals').select('profile_id').eq('status', 'PAID'),
        ]);

        const totalRegistered = totalRegisteredRes.count;
        const madeFirstTrade = new Set((allTxnsRes.data || []).map((t: any) => t.buyer_id)).size;
        const completedFirstTrade = new Set((finalizedTxnsRes.data || []).map((t: any) => t.buyer_id)).size;
        const madeWithdrawal = new Set((paidWithdrawalsRes.data || []).map((w: any) => w.profile_id)).size;

        res.json([
            { step: 'Registered', count: totalRegistered ?? 0 },
            { step: 'Made First Trade', count: madeFirstTrade },
            { step: 'Completed Trade', count: completedFirstTrade },
            { step: 'Made Withdrawal', count: madeWithdrawal },
        ]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Revenue: fee revenue + volume per period grouped by currency
router.get('/revenue', async (req, res) => {
    try {
        const { period = 'month', currency = 'NGN' } = req.query;

        const days = period === 'day' ? 30 : period === 'week' ? 12 : 12;
        const unit: 'day' | 'week' | 'month' = period as any;

        const { data: txns } = await supabase
            .from('transactions')
            .select('total_amount, fee_amount, currency, status, created_at')
            .eq('currency', currency as string)
            .neq('status', 'CANCELLED')
            .order('created_at', { ascending: false });

        const buckets: Record<string, { volume: number; fees: number }> = {};

        for (const tx of (txns || [])) {
            const d = new Date(tx.created_at);
            let key: string;
            if (unit === 'day') {
                key = d.toISOString().slice(0, 10);
            } else if (unit === 'week') {
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                key = weekStart.toISOString().slice(0, 10);
            } else {
                key = d.toISOString().slice(0, 7);
            }
            if (!buckets[key]) buckets[key] = { volume: 0, fees: 0 };
            buckets[key].volume += Number(tx.total_amount);
            if (tx.status === 'FINALIZED') {
                buckets[key].fees += Number(tx.fee_amount);
            }
        }

        const sorted = Object.entries(buckets)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-days)
            .map(([name, vals]) => ({ name, ...vals }));

        res.json({ data: sorted, currency });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Platform performance: user counts + transaction stats per platform
router.get('/platform', async (req, res) => {
    try {
        const platforms = ['telegram', 'discord', 'whatsapp', 'instagram', 'apple_business', 'messenger'];

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, primary_platform');

        const platformMap: Record<string, string[]> = {};
        for (const p of (profiles || [])) {
            const plat = (p.primary_platform || 'unknown').toLowerCase();
            if (!platformMap[plat]) platformMap[plat] = [];
            platformMap[plat].push(p.id);
        }

        const { data: txns } = await supabase
            .from('transactions')
            .select('buyer_id, total_amount, currency, status');

        const result = platforms.map(platform => {
            const userIds = new Set(platformMap[platform] || []);
            const platformTxns = (txns || []).filter((t: any) => userIds.has(t.buyer_id));
            const volume = platformTxns.reduce((s: number, t: any) => s + Number(t.total_amount), 0);
            const disputes = platformTxns.filter((t: any) => t.status === 'DISPUTED').length;
            const disputeRate = platformTxns.length > 0
                ? Math.round((disputes / platformTxns.length) * 100)
                : 0;
            return {
                platform,
                users: userIds.size,
                transactions: platformTxns.length,
                volume: Math.round(volume),
                dispute_rate: disputeRate,
            };
        });

        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// User growth: registrations per period
router.get('/growth', async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        const { data: profiles } = await supabase
            .from('profiles')
            .select('created_at')
            .order('created_at', { ascending: true });

        const buckets: Record<string, number> = {};
        for (const p of (profiles || [])) {
            const d = new Date(p.created_at);
            const key = period === 'day'
                ? d.toISOString().slice(0, 10)
                : d.toISOString().slice(0, 7);
            buckets[key] = (buckets[key] || 0) + 1;
        }

        const limit = period === 'day' ? 30 : 12;
        const data = Object.entries(buckets)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-limit)
            .map(([name, count]) => ({ name, count }));

        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
