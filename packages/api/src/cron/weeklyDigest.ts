import { createClient } from '@supabase/supabase-js';
import { sendReferralNotification } from '../services/notifications';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const fmtAmt = (amount: number, currency: string): string => {
    const sym: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
    return sym[currency]
        ? `${sym[currency]}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${parseFloat(amount.toFixed(8))} ${currency}`;
};

export async function runWeeklyDigest(): Promise<void> {
    console.log('📬 Running weekly group digest...');

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoIso = weekAgo.toISOString();

    const { data: groups, error } = await supabase
        .from('community_groups')
        .select('*')
        .eq('status', 'active');

    if (error || !groups?.length) {
        console.log('📬 Weekly digest: no active groups found');
        return;
    }

    for (const group of groups) {
        try {
            const [weeklyCommRes, allTimeCommRes, weeklyTxnRes] = await Promise.all([
                supabase
                    .from('community_commissions')
                    .select('amount, currency')
                    .eq('group_id', group.id)
                    .eq('status', 'COMPLETED')
                    .gte('created_at', weekAgoIso),
                supabase
                    .from('community_commissions')
                    .select('amount, currency')
                    .eq('group_id', group.id)
                    .eq('status', 'COMPLETED'),
                supabase
                    .from('transactions')
                    .select('amount, currency, status')
                    .eq('group_id', group.id)
                    .gte('created_at', weekAgoIso),
            ]);

            // Weekly earnings by currency
            const weeklyEarnings: Record<string, number> = {};
            (weeklyCommRes.data || []).forEach((c: any) => {
                weeklyEarnings[c.currency] = (weeklyEarnings[c.currency] || 0) + Number(c.amount);
            });

            // All-time earnings by currency
            const allTimeEarnings: Record<string, number> = {};
            (allTimeCommRes.data || []).forEach((c: any) => {
                allTimeEarnings[c.currency] = (allTimeEarnings[c.currency] || 0) + Number(c.amount);
            });

            // Weekly transaction stats
            const weeklyTxns = weeklyTxnRes.data || [];
            const totalDeals = weeklyTxns.length;
            const completedDeals = weeklyTxns.filter((t: any) => t.status === 'FINALIZED').length;

            const weeklyVolume: Record<string, number> = {};
            weeklyTxns.forEach((t: any) => {
                weeklyVolume[t.currency] = (weeklyVolume[t.currency] || 0) + Number(t.amount);
            });

            // Date labels
            const weekLabel = weekAgo.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            const todayLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

            const earningsLines = Object.entries(weeklyEarnings).length
                ? Object.entries(weeklyEarnings).map(([c, a]) => `  • <b>${fmtAmt(a, c)}</b>`).join('\n')
                : '  • None this week';

            const allTimeLines = Object.entries(allTimeEarnings).length
                ? Object.entries(allTimeEarnings).map(([c, a]) => `  • <b>${fmtAmt(a, c)}</b>`).join('\n')
                : '  • None yet';

            const volumeLines = Object.entries(weeklyVolume).length
                ? Object.entries(weeklyVolume).map(([c, a]) => `  • <b>${fmtAmt(a, c)}</b>`).join('\n')
                : '  • None this week';

            const platformMsg =
                `📊 <b>Weekly Group Report</b>\n\n` +
                `🏘️ <b>${group.group_name}</b>\n` +
                `📅 ${weekLabel} – ${todayLabel}\n\n` +
                `📈 <b>This week:</b>\n` +
                `  • Deals started: <b>${totalDeals}</b>\n` +
                `  • Completed: <b>${completedDeals}</b>\n` +
                `  • Volume traded:\n${volumeLines}\n\n` +
                `💰 <b>You earned this week:</b>\n${earningsLines}\n\n` +
                `📦 <b>All-time earnings:</b>\n${allTimeLines}\n\n` +
                `Keep growing your community! 🚀`;

            const emailHtml =
                `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">` +
                `<h2 style="color:#0f172a;margin-bottom:4px;">📊 Weekly Group Report</h2>` +
                `<p style="color:#64748b;margin-top:0;">${group.group_name} &mdash; ${weekLabel} to ${todayLabel}</p>` +
                `<hr style="border:none;border-top:1px solid #e2e8f0;"/>` +
                `<p><b>Deals this week:</b> ${totalDeals} started, ${completedDeals} completed</p>` +
                `<p><b>Volume:</b> ${Object.entries(weeklyVolume).map(([c, a]) => fmtAmt(a, c)).join(', ') || 'None'}</p>` +
                `<p><b>Earnings this week:</b> ${Object.entries(weeklyEarnings).map(([c, a]) => fmtAmt(a, c)).join(', ') || 'None'}</p>` +
                `<p><b>All-time earnings:</b> ${Object.entries(allTimeEarnings).map(([c, a]) => fmtAmt(a, c)).join(', ') || 'None'}</p>` +
                `<p style="color:#64748b;font-size:13px;">Keep growing your Safeeely community! 🚀</p>` +
                `</div>`;

            await sendReferralNotification(
                group.admin_profile_id,
                platformMsg,
                `Your weekly Safeeely group report — ${group.group_name}`,
                emailHtml
            );

            console.log(`📬 Digest sent to admin of "${group.group_name}"`);
        } catch (groupErr: any) {
            console.error(`❌ Digest failed for group "${group.group_name}":`, groupErr.message);
        }
    }

    console.log('📬 Weekly digest complete.');
}
