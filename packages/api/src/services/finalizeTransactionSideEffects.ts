import { supabase } from '@safepal/shared';
import crypto from 'crypto';
import { routeNotification, sendReferralNotification, sendTelegramGroupMessage, sendDiscordChannelMessage } from './notifications';
import { sendReferralMilestoneEmail } from './email';
import { track } from '../lib/posthog';
import { CRYPTO_CURRENCIES, AUTO_DISBURSE_THRESHOLDS } from '../constants/payouts';

// Runs every side-effect that should fire once a transaction reaches FINALIZED:
// referral commissions, community commissions, gamified badges, trade-count
// milestones, and auto-settlement payout. Shared between the generic ONE_TIME
// finalize path (PATCH /:id/status) and the per-milestone finalize path
// (PATCH /:id/milestones/:mId/status), so milestone transactions get the same
// payout/commission/badge treatment as ONE_TIME ones once fully released.
export async function runFinalizeSideEffects(txn: any): Promise<void> {
    // --- REFERRAL COMMISSION DISTRIBUTION ENGINE ---
    try {
        // The new business logic: Referrers ONLY earn commission when their referee is the BUYER.
        const buyerId = txn.buyer_id;

        if (buyerId && txn.fee_amount > 0) {
            // Fetch referral commission rates from admin settings (fallback: 10% / 5%)
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
                console.warn('Could not load referral percentages from settings, using defaults');
            }

            // Fetch the buyer's Tier 1 Referrer
            const { data: buyerProfile } = await supabase
                .from('profiles')
                .select('referred_by_id')
                .eq('id', buyerId)
                .single();

            if (buyerProfile && buyerProfile.referred_by_id) {
                const tier1ReferrerId = buyerProfile.referred_by_id;
                const tier1Amount = txn.fee_amount * tier1Percent;

                // Insert Tier 1
                await supabase.from('referral_commissions').insert({
                    referrer_id: tier1ReferrerId,
                    referred_id: buyerId,
                    amount: tier1Amount,
                    currency: txn.currency,
                    tier: 1,
                    txn_id: txn.id,
                    status: 'COMPLETED'
                });
                console.log(`💰 Paid Tier 1 Commission: ${tier1Amount} ${txn.currency} to ${tier1ReferrerId}`);
                const { data: tier1ReferrerProfile } = await supabase.from('profiles').select('safetag').eq('id', tier1ReferrerId).maybeSingle();
                if (tier1ReferrerProfile?.safetag) {
                    track(tier1ReferrerProfile.safetag, 'referral_commission_earned', {
                        tier: 1,
                        amount: tier1Amount,
                        currency: txn.currency,
                        source_transaction_id: txn.id,
                    });
                }
                sendReferralNotification(
                    tier1ReferrerId,
                    `💰 <b>Commission Earned!</b>\n\nYou just earned a <b>Tier 1</b> referral commission of <b>${tier1Amount.toFixed(2)} ${txn.currency}</b>. Keep it up!`,
                    'You earned a referral commission on Safeeely!',
                    `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;"><h2 style="color:#0f172a;">Commission Earned! 💰</h2><p style="color:#475569;">You just earned a <b>Tier 1</b> referral commission of <b>${tier1Amount.toFixed(2)} ${txn.currency}</b>.</p></div>`
                ).catch((e: any) => console.error('Tier 1 commission notification failed:', e.message));

                // Referral milestone celebration
                try {
                    const { count: tier1Count } = await supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .eq('referred_by_id', tier1ReferrerId);
                    const REFERRAL_MILESTONES = [1, 5, 10, 25, 50, 100];
                    if (tier1Count && REFERRAL_MILESTONES.includes(tier1Count)) {
                        const { data: referrerProfile } = await supabase.from('profiles').select('safetag, email').eq('id', tier1ReferrerId).single();
                        const earningsSummary = `${tier1Amount.toFixed(2)} ${txn.currency} (latest)`;
                        if (referrerProfile?.safetag) {
                            track(referrerProfile.safetag, 'referral_milestone_reached', { milestone: tier1Count });
                        }
                        routeNotification(
                            tier1ReferrerId,
                            `🏆 <b>Referral Milestone!</b>\n\nYou just hit <b>${tier1Count} referral${tier1Count > 1 ? 's' : ''}</b> on Safeeely! Keep sharing to earn more for life.`,
                            undefined,
                            undefined,
                            referrerProfile?.email ? () => sendReferralMilestoneEmail(referrerProfile.email, { safetag: referrerProfile.safetag, milestone: tier1Count, earningsSummary }) : undefined
                        ).catch(() => {});
                    }
                } catch { /* non-critical */ }

                // Fetch the fee payer's Tier 2 Referrer (the person who referred Tier 1)
                const { data: tier1Profile } = await supabase
                    .from('profiles')
                    .select('referred_by_id')
                    .eq('id', tier1ReferrerId)
                    .single();

                if (tier1Profile && tier1Profile.referred_by_id) {
                    const tier2ReferrerId = tier1Profile.referred_by_id;
                    const tier2Amount = txn.fee_amount * tier2Percent;

                    // Insert Tier 2
                    await supabase.from('referral_commissions').insert({
                        referrer_id: tier2ReferrerId,
                        referred_id: tier1ReferrerId, // They referred the person who referred the payer
                        amount: tier2Amount,
                        currency: txn.currency,
                        tier: 2,
                        txn_id: txn.id,
                        status: 'COMPLETED'
                    });
                    console.log(`💰 Paid Tier 2 Commission: ${tier2Amount} ${txn.currency} to ${tier2ReferrerId}`);
                    const { data: tier2ReferrerProfile } = await supabase.from('profiles').select('safetag').eq('id', tier2ReferrerId).maybeSingle();
                    if (tier2ReferrerProfile?.safetag) {
                        track(tier2ReferrerProfile.safetag, 'referral_commission_tier2_earned', {
                            tier: 2,
                            amount: tier2Amount,
                            currency: txn.currency,
                            source_transaction_id: txn.id,
                        });
                    }
                    sendReferralNotification(
                        tier2ReferrerId,
                        `💰 <b>Commission Earned!</b>\n\nYou just earned a <b>Tier 2</b> referral commission of <b>${tier2Amount.toFixed(2)} ${txn.currency}</b>. Keep it up!`,
                        'You earned a referral commission on Safeeely!',
                        `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;"><h2 style="color:#0f172a;">Commission Earned! 💰</h2><p style="color:#475569;">You just earned a <b>Tier 2</b> referral commission of <b>${tier2Amount.toFixed(2)} ${txn.currency}</b>.</p></div>`
                    ).catch((e: any) => console.error('Tier 2 commission notification failed:', e.message));
                }
            }
        }
    } catch (commError) {
        console.error('❌ Failed to distribute commissions:', commError);
        // We don't throw here to avoid failing the transaction confirmation
    }
    // --- END COMMISSION ENGINE ---

    // --- COMMUNITY COMMISSION ENGINE ---
    if ((txn as any).group_id && txn.fee_amount > 0) {
        try {
            const groupId = (txn as any).group_id;
            const { data: group } = await supabase
                .from('community_groups')
                .select('*')
                .eq('id', groupId)
                .eq('status', 'active')
                .single();

            if (group) {
                const commissionAmount = txn.fee_amount * (group.admin_revenue_share_percent / 100);

                await supabase.from('community_commissions').insert({
                    group_id: group.id,
                    admin_profile_id: group.admin_profile_id,
                    txn_id: txn.id,
                    amount: commissionAmount,
                    currency: txn.currency,
                    status: 'COMPLETED',
                });

                console.log(`🏘️ Community commission: ${commissionAmount} ${txn.currency} to admin of "${group.group_name}"`);

                sendReferralNotification(
                    group.admin_profile_id,
                    `🏘️ <b>Group Commission Earned!</b>\n\nA deal was completed in your group <b>${group.group_name}</b>.\n\nYou earned <b>${commissionAmount.toFixed(2)} ${txn.currency}</b> — keep growing your community! 🚀`,
                    'You earned a group commission on Safeeely!',
                    `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;"><h2 style="color:#0f172a;">Group Commission Earned! 🏘️</h2><p style="color:#475569;">A deal was completed in your group <b>${group.group_name}</b>. You earned <b>${commissionAmount.toFixed(2)} ${txn.currency}</b>.</p></div>`
                ).catch((e: any) => console.error('Community commission notification failed:', e.message));

                // Post social proof announcement in the group (fire-and-forget)
                if (group.platform === 'telegram' && group.telegram_group_id) {
                    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'SafeeelyBot';
                    const tradeDeepLink = `https://t.me/${botUsername}?start=group_${group.id}`;
                    sendTelegramGroupMessage(
                        group.telegram_group_id,
                        `🎉 <b>Secure trade completed!</b>\n\nAnother deal was just protected by Safeeely escrow in this group. Both buyer and seller traded safely.\n\n🛡️ Want to trade securely too?`,
                        { text: '🛡️ Start Secure Trade', url: tradeDeepLink }
                    ).catch((e: any) => console.error('Telegram group social proof announcement failed:', e.message));
                } else if (group.platform === 'discord' && group.discord_announcement_channel_id) {
                    const reviewsBase = process.env.REVIEWS_URL || 'http://localhost:3001';
                    sendDiscordChannelMessage(
                        group.discord_announcement_channel_id,
                        `🎉 **Secure trade completed!**\n\nAnother deal was just protected by Safeeely escrow in this server. Both buyer and seller traded safely.\n\n🛡️ Want to trade securely too?`,
                        { label: '🛡️ Start Secure Trade', url: `${reviewsBase}/trade` }
                    ).catch((e: any) => console.error('Discord group social proof announcement failed:', e.message));
                }
            }
        } catch (communityCommError) {
            console.error('❌ Failed to distribute community commission:', communityCommError);
        }
    }
    // --- END COMMUNITY COMMISSION ENGINE ---

    // --- GAMIFIED BADGES ENGINE ---
    try {
        // Background execution, don't await blocking to prevent slowing down the request
        const checkAndAwardBadges = async (sellerId: string, buyerId: string) => {
            try {
                // 1. Check Whale Buyer
                const { data: buyerTxns } = await supabase.from('transactions').select('total_amount').eq('buyer_id', buyerId).eq('status', 'FINALIZED');
                if (buyerTxns) {
                    const totalSpent = buyerTxns.reduce((sum, t) => sum + Number(t.total_amount), 0);
                    if (totalSpent >= 1000000) {
                        const { error: e1 } = await supabase.from('profile_badges').insert({ profile_id: buyerId, badge_key: 'whale_buyer' });
                        if (!e1) {
                            console.log(`🏆 Awarded Whale Buyer badge to ${buyerId}`);
                            routeNotification(buyerId, `🏆 You've earned a new badge!\n\n🐋 Whale Buyer\nYou've completed over ₦1,000,000 in escrow trades. You're one of our biggest traders!`, undefined, `${process.env.REVIEWS_URL || 'http://localhost:3001'}/badges/notifications/whale_buyer_badge.webp`, undefined, true).catch(() => {});
                        }
                    }
                }

                // 2. Check Trusted Seller & Zero Drama
                const { data: sellerTxns } = await supabase.from('transactions').select('id, status').eq('seller_id', sellerId);
                if (sellerTxns) {
                    const finalizedCount = sellerTxns.filter((t) => t.status === 'FINALIZED').length;

                    // Zero Drama: 20 completed, no disputes
                    // Since disputes are linked by transaction_id
                    const txnIds = sellerTxns.map(t => t.id);
                    if (txnIds.length > 0 && finalizedCount >= 20) {
                        const { data: sellerDisputes } = await supabase.from('disputes').select('id').in('transaction_id', txnIds);
                        if (!sellerDisputes || sellerDisputes.length === 0) {
                            const { error: e2 } = await supabase.from('profile_badges').insert({ profile_id: sellerId, badge_key: 'zero_drama' });
                            if (!e2) {
                                console.log(`🏆 Awarded Zero Drama badge to ${sellerId}`);
                                routeNotification(sellerId, `🏆 You've earned a new badge!\n\n🕊️ Zero Drama\nYou've completed 20+ trades with zero disputes. Pure professionalism!`, undefined, `${process.env.REVIEWS_URL || 'http://localhost:3001'}/badges/notifications/zero_drama_badge.webp`, undefined, true).catch(() => {});
                            }
                        }
                    }

                    // Trusted Seller: 10 completed, rating > 4.5
                    if (finalizedCount >= 10) {
                        const { data: sellerReviews } = await supabase.from('reviews').select('rating').eq('reviewee_id', sellerId);
                        if (sellerReviews && sellerReviews.length > 0) {
                            const avgRating = sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length;
                            if (avgRating >= 4.5) {
                                const { error: e3 } = await supabase.from('profile_badges').insert({ profile_id: sellerId, badge_key: 'trusted_seller' });
                                if (!e3) {
                                    console.log(`🏆 Awarded Trusted Seller badge to ${sellerId}`);
                                    routeNotification(sellerId, `🏆 You've earned a new badge!\n\n🛡️ Trusted Seller\nYou've completed 10+ trades with a 4.5+ star rating. Buyers trust you!`, undefined, `${process.env.REVIEWS_URL || 'http://localhost:3001'}/badges/notifications/trusted_seller.webp`, undefined, true).catch(() => {});
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Badge awarding logic failed:', e);
            }
        };

        checkAndAwardBadges(txn.seller_id, txn.buyer_id);
    } catch (badgeErr) {
        console.error('❌ Failed to trigger badges check:', badgeErr);
    }
    // --- END GAMIFIED BADGES ENGINE ---

    // --- TRANSACTION COUNT MILESTONES ---
    const TRADE_MILESTONES = [1, 5, 10, 25, 50, 100];
    try {
        for (const [userId, role] of [[txn.buyer_id, 'buyer'], [txn.seller_id, 'seller']] as const) {
            const column = role === 'buyer' ? 'buyer_id' : 'seller_id';
            const { count } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq(column, userId)
                .eq('status', 'FINALIZED');
            if (count && TRADE_MILESTONES.includes(count)) {
                routeNotification(
                    userId,
                    `🎉 <b>${count} Trade${count > 1 ? 's' : ''} Completed!</b>\n\nYou've now completed <b>${count}</b> secure transaction${count > 1 ? 's' : ''} on Safeeely. You're one of our most active traders. Keep it up!`,
                    [{ label: '🛒 Start Another Trade', customId: 'create_txn' }]
                ).catch(() => {});
            }
        }
    } catch { /* non-critical */ }
    // --- END TRANSACTION COUNT MILESTONES ---

    // --- AUTO-SETTLEMENT: trigger payout if seller has a verified default payout method ---
    setImmediate(async () => {
        try {
            const { disburseFunds } = await import('./payout');
            const { data: defaultMethod } = await supabase
                .from('payout_methods')
                .select('id, type, details')
                .eq('profile_id', txn.seller_id)
                .eq('is_default', true)
                .maybeSingle();

            if (!defaultMethod) return; // No default method — seller must withdraw manually

            const sellerAmount = Number(txn.amount);
            const currency: string = txn.currency;
            const isCrypto = CRYPTO_CURRENCIES.has(currency);
            const requiresApproval = isCrypto || sellerAmount > (AUTO_DISBURSE_THRESHOLDS[currency] ?? 500);

            const idempotencyKey = crypto.randomUUID();
            const { data: rpcResult } = await supabase.rpc('create_withdrawal_atomic', {
                p_profile_id: txn.seller_id,
                p_amount: sellerAmount,
                p_currency: currency,
                p_payout_method_id: defaultMethod.id,
                p_details: defaultMethod.details,
                p_idempotency_key: idempotencyKey,
                p_requires_approval: requiresApproval,
            });

            const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
            if (row?.out_id && !requiresApproval) {
                await disburseFunds(row.out_id);
            }
            if (row?.out_id) {
                console.log(`[AutoSettle] ${txn.txn_code} → withdrawal ${row.out_id} (requires_approval=${requiresApproval})`);
            }
        } catch (autoErr: any) {
            console.error(`[AutoSettle] Failed for ${txn.txn_code}:`, autoErr.message);
        }
    });
    // --- END AUTO-SETTLEMENT ---
}
