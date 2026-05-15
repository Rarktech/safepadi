import { supabase } from '@safepal/shared';
import { routeNotification } from '../services/notifications';
import { sendReEngagementEmail, sendBalanceNudgeEmail } from '../services/email';

const log = (msg: string) => console.log(`[ReEngagement] ${msg}`);

export async function runReEngagement(): Promise<void> {
    log('Starting...');

    // 30-day inactivity re-engagement
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();

        const { data: inactiveAccounts } = await supabase
            .from('linked_accounts')
            .select('profile_id, last_message_at, profile:profile_id(id, email, safetag, first_name, created_at)')
            .eq('is_primary', true)
            .lt('last_message_at', thirtyDaysAgo)
            .gt('last_message_at', thirtyOneDaysAgo);

        let sent = 0;
        for (const account of inactiveAccounts || []) {
            const profile = (account as any).profile;
            if (!profile) continue;

            // Only users who registered > 30 days ago
            if (new Date(profile.created_at) > new Date(thirtyDaysAgo)) continue;

            // Check if they have finalized transactions
            const { count: finalizedCount } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
                .eq('status', 'FINALIZED');

            const hasTraded = (finalizedCount || 0) > 0;
            const daysSinceActive = Math.floor((Date.now() - new Date(account.last_message_at as string).getTime()) / (24 * 60 * 60 * 1000));
            const firstName = profile.first_name || profile.safetag;

            const msg = hasTraded
                ? `👋 <b>We miss you!</b>\n\nIt's been <b>${daysSinceActive} days</b> since your last activity on Safeeely. Ready for your next secure trade?\n\nYour safetag <code>${profile.safetag}</code> is still active and ready to go.`
                : `💡 <b>Still thinking about it?</b>\n\nHere's why thousands of traders choose Safeeely:\n\n✅ Funds secured in escrow until delivery is confirmed\n✅ AI-powered dispute resolution\n✅ Works across Telegram, WhatsApp, Discord & more\n\nStart your first safe trade today!`;

            await routeNotification(
                profile.id,
                msg,
                [{ label: '🛒 Start a Trade', customId: 'create_txn' }],
                undefined,
                profile.email ? () => sendReEngagementEmail(profile.email, { safetag: profile.safetag, firstName, hasTraded, daysSinceActive }) : undefined
            ).catch(() => {});
            sent++;
        }
        log(`Re-engagement: ${sent} messages sent`);
    } catch (e: any) { log(`Re-engagement error: ${e.message}`); }

    // Balance nudge — users with balance and no withdrawal in 30 days
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Find profiles who have received seller payouts (FINALIZED as seller) and no recent withdrawal
        const { data: sellerEarnings } = await supabase
            .from('transactions')
            .select('seller_id, amount, currency')
            .eq('status', 'FINALIZED');

        // Group by seller
        const sellerBalances: Record<string, Record<string, number>> = {};
        for (const txn of sellerEarnings || []) {
            if (!sellerBalances[txn.seller_id]) sellerBalances[txn.seller_id] = {};
            sellerBalances[txn.seller_id][txn.currency] = (sellerBalances[txn.seller_id][txn.currency] || 0) + Number(txn.amount);
        }

        // Add referral commissions
        const { data: commissions } = await supabase
            .from('referral_commissions')
            .select('referrer_id, amount, currency')
            .eq('status', 'COMPLETED');

        for (const c of commissions || []) {
            if (!sellerBalances[c.referrer_id]) sellerBalances[c.referrer_id] = {};
            sellerBalances[c.referrer_id][c.currency] = (sellerBalances[c.referrer_id][c.currency] || 0) + Number(c.amount);
        }

        // Check who hasn't withdrawn in 30 days
        const profileIds = Object.keys(sellerBalances).filter(id =>
            Object.values(sellerBalances[id]).some(v => v > 0)
        );

        for (const profileId of profileIds) {
            try {
                const { count: recentWithdrawals } = await supabase
                    .from('withdrawals')
                    .select('*', { count: 'exact', head: true })
                    .eq('profile_id', profileId)
                    .gt('created_at', thirtyDaysAgo);

                if ((recentWithdrawals || 0) > 0) continue;

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('email, safetag, first_name')
                    .eq('id', profileId)
                    .single();

                if (!profile) continue;

                const balanceSummary = Object.entries(sellerBalances[profileId])
                    .map(([cur, amt]) => `${amt.toFixed(2)} ${cur}`)
                    .join(', ');

                const firstName = profile.first_name || profile.safetag;

                await routeNotification(
                    profileId,
                    `💰 <b>You Have Earnings Waiting!</b>\n\nYou have <b>${balanceSummary}</b> available in your Safeeely balance.\n\nWithdraw to your bank or crypto wallet anytime.`,
                    [{ label: '💸 Withdraw Now', url: `${process.env.REVIEWS_URL || 'http://localhost:3001'}/dashboard/withdrawals` }],
                    undefined,
                    profile.email ? () => sendBalanceNudgeEmail(profile.email, { safetag: profile.safetag, firstName, balanceSummary }) : undefined
                ).catch(() => {});
            } catch { /* skip this profile */ }
        }

        log(`Balance nudge: ${profileIds.length} profiles checked`);
    } catch (e: any) { log(`Balance nudge error: ${e.message}`); }

    log('Done.');
}
