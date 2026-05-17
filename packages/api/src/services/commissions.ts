import { supabase } from '@safepal/shared';
import { sendReferralNotification, routeNotification } from './notifications';
import { sendReferralMilestoneEmail } from './email';

/**
 * Issue tier-1 and tier-2 referral commissions for a finalized transaction.
 * Called from both the confirm_receipt path (transactions.ts) and any
 * PAY_SELLER dispute verdict path (disputes.ts, disputeEnforcement.ts).
 * Fire-and-forget — never throws so it cannot break the calling flow.
 */
export async function issueReferralCommissions(txn: {
    id: string;
    buyer_id: string;
    amount: number;
    fee_amount: number;
    currency: string;
}): Promise<void> {
    try {
        if (!txn.buyer_id || txn.fee_amount <= 0) return;

        let tier1Percent = 0.10;
        let tier2Percent = 0.05;
        try {
            const { data: rateSettings } = await supabase
                .from('platform_settings')
                .select('key, value')
                .in('key', ['referral_tier1_percent', 'referral_tier2_percent']);
            (rateSettings || []).forEach((s: any) => {
                if (s.key === 'referral_tier1_percent') tier1Percent = parseFloat(s.value);
                if (s.key === 'referral_tier2_percent') tier2Percent = parseFloat(s.value);
            });
        } catch {
            console.warn('[commissions] Could not load referral percentages, using defaults');
        }

        const { data: buyerProfile } = await supabase
            .from('profiles')
            .select('referred_by_id')
            .eq('id', txn.buyer_id)
            .single();

        if (!buyerProfile?.referred_by_id) return;

        const tier1ReferrerId = buyerProfile.referred_by_id;
        const tier1Amount = Number(txn.fee_amount) * tier1Percent;

        await supabase.from('referral_commissions').insert({
            referrer_id: tier1ReferrerId,
            referred_id: txn.buyer_id,
            amount: tier1Amount,
            currency: txn.currency,
            tier: 1,
            txn_id: txn.id,
            status: 'COMPLETED'
        });
        console.log(`💰 [commissions] Tier 1: ${tier1Amount} ${txn.currency} to ${tier1ReferrerId}`);

        sendReferralNotification(
            tier1ReferrerId,
            `💰 <b>Commission Earned!</b>\n\nYou just earned a <b>Tier 1</b> referral commission of <b>${tier1Amount.toFixed(2)} ${txn.currency}</b>. Keep it up!`,
            'You earned a referral commission on Safeeely!',
            `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;"><h2 style="color:#0f172a;">Commission Earned! 💰</h2><p style="color:#475569;">You just earned a <b>Tier 1</b> referral commission of <b>${tier1Amount.toFixed(2)} ${txn.currency}</b>.</p></div>`
        ).catch(e => console.error('[commissions] Tier 1 notification failed:', (e as Error).message));

        // Referral milestone celebration
        try {
            const { count: tier1Count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('referred_by_id', tier1ReferrerId);
            const MILESTONES = [1, 5, 10, 25, 50, 100];
            if (tier1Count && MILESTONES.includes(tier1Count)) {
                const { data: referrerProfile } = await supabase.from('profiles').select('safetag, email').eq('id', tier1ReferrerId).single();
                routeNotification(
                    tier1ReferrerId,
                    `🏆 <b>Referral Milestone!</b>\n\nYou just hit <b>${tier1Count} referral${tier1Count > 1 ? 's' : ''}</b> on Safeeely! Keep sharing to earn more for life.`,
                    undefined,
                    undefined,
                    referrerProfile?.email ? () => sendReferralMilestoneEmail(referrerProfile.email, { safetag: referrerProfile.safetag, milestone: tier1Count, earningsSummary: `${tier1Amount.toFixed(2)} ${txn.currency} (latest)` }) : undefined
                ).catch(() => {});
            }
        } catch { /* non-critical */ }

        // Tier 2
        const { data: tier1Profile } = await supabase
            .from('profiles')
            .select('referred_by_id')
            .eq('id', tier1ReferrerId)
            .single();

        if (!tier1Profile?.referred_by_id) return;

        const tier2ReferrerId = tier1Profile.referred_by_id;
        const tier2Amount = Number(txn.fee_amount) * tier2Percent;

        await supabase.from('referral_commissions').insert({
            referrer_id: tier2ReferrerId,
            referred_id: tier1ReferrerId,
            amount: tier2Amount,
            currency: txn.currency,
            tier: 2,
            txn_id: txn.id,
            status: 'COMPLETED'
        });
        console.log(`💰 [commissions] Tier 2: ${tier2Amount} ${txn.currency} to ${tier2ReferrerId}`);

        sendReferralNotification(
            tier2ReferrerId,
            `💰 <b>Commission Earned!</b>\n\nYou just earned a <b>Tier 2</b> referral commission of <b>${tier2Amount.toFixed(2)} ${txn.currency}</b>. Keep it up!`,
            'You earned a referral commission on Safeeely!',
            `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;"><h2 style="color:#0f172a;">Commission Earned! 💰</h2><p style="color:#475569;">You just earned a <b>Tier 2</b> referral commission of <b>${tier2Amount.toFixed(2)} ${txn.currency}</b>.</p></div>`
        ).catch(e => console.error('[commissions] Tier 2 notification failed:', (e as Error).message));
    } catch (err) {
        console.error('❌ [commissions] Failed to issue referral commissions:', err);
    }
}
