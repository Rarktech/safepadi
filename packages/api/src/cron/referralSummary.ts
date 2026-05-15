import { supabase } from '@safepal/shared';
import { routeNotification } from '../services/notifications';
import { sendMonthlyReferralSummaryEmail } from '../services/email';

const log = (msg: string) => console.log(`[ReferralSummary] ${msg}`);

export async function runMonthlyReferralSummary(): Promise<void> {
    log('Starting monthly referral summary...');

    // Calculate last month's date range
    const now = new Date();
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthLabel = firstOfLastMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    try {
        // Fetch all commissions from last month
        const { data: commissions } = await supabase
            .from('referral_commissions')
            .select('referrer_id, amount, currency')
            .eq('status', 'COMPLETED')
            .gte('created_at', firstOfLastMonth.toISOString())
            .lt('created_at', firstOfThisMonth.toISOString());

        if (!commissions || commissions.length === 0) {
            log('No commissions last month — skipping.');
            return;
        }

        // Group by referrer
        const byReferrer: Record<string, { count: number; currencies: Record<string, number> }> = {};
        for (const c of commissions) {
            if (!byReferrer[c.referrer_id]) byReferrer[c.referrer_id] = { count: 0, currencies: {} };
            byReferrer[c.referrer_id].count++;
            byReferrer[c.referrer_id].currencies[c.currency] = (byReferrer[c.referrer_id].currencies[c.currency] || 0) + Number(c.amount);
        }

        const referrerIds = Object.keys(byReferrer);
        log(`Sending summaries to ${referrerIds.length} referrers for ${monthLabel}`);

        for (const referrerId of referrerIds) {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('email, safetag, first_name')
                    .eq('id', referrerId)
                    .single();

                if (!profile) continue;

                const entry = byReferrer[referrerId];
                const earningsSummary = Object.entries(entry.currencies)
                    .map(([cur, amt]) => `${amt.toFixed(2)} ${cur}`)
                    .join(', ');

                const referralLink = `${process.env.REVIEWS_URL || 'http://localhost:3001'}/invite/${profile.safetag.replace('@', '')}`;

                const platformMsg = `📊 <b>Your ${monthLabel} Referral Report</b>\n\n` +
                    `You earned commissions from <b>${entry.count} transaction${entry.count > 1 ? 's' : ''}</b> last month.\n\n` +
                    `💰 Total Earned: <b>${earningsSummary}</b>\n\n` +
                    `Keep sharing your referral link to grow your passive income every month!`;

                await routeNotification(
                    referrerId,
                    platformMsg,
                    [{ label: '💸 Withdraw Earnings', url: `${process.env.REVIEWS_URL || 'http://localhost:3001'}/dashboard/withdrawals` }],
                    undefined,
                    profile.email ? () => sendMonthlyReferralSummaryEmail(profile.email, {
                        safetag: profile.safetag,
                        month: monthLabel,
                        referralCount: entry.count,
                        earningsSummary,
                        referralLink
                    }) : undefined
                ).catch(() => {});
            } catch (e: any) {
                log(`Error sending to referrer ${referrerId}: ${e.message}`);
            }
        }

        log('Done.');
    } catch (e: any) {
        log(`Fatal error: ${e.message}`);
    }
}
