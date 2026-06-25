import { Router, Request, Response } from 'express';
import { supabase } from '@safepal/shared';
import { z } from 'zod';
import { sendNotification, routeNotification, recordNotification } from '../services/notifications';
import { buildInternalMagicLink } from '../services/magicLinkInternal';
import { sendDisputeRaisedEmail, sendDisputeResolvedEmail } from '../services/email';
import { maybeSendFeedbackPrompt } from './feedback';
import multer from 'multer';
import { classifyDisputeType } from '../services/dispute-ai/classifier';
import { quickTierHint } from '../services/dispute-ai/config/disputeTypes';
import { issueReferralCommissions } from '../services/commissions';
import { routeDispute } from '../services/disputeRouter';
import { getRemainingMilestoneEscrow, releaseRemainingMilestones } from '../services/milestoneEscrow';
import { runFinalizeSideEffects } from '../services/finalizeTransactionSideEffects';
import { requireUser, requireUserOrBot, BotOrUserRequest, AuthedRequest } from '../middleware/requireUser';
import { requireAdmin } from '../middleware/requireAdmin';
import { track } from '../lib/posthog';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Zod schemas for validation
const RaiseDisputeSchema = z.object({
    transaction_id: z.string().uuid(),
    raised_by: z.string().uuid(),
    reason: z.string().min(10),
    category: z.string().optional(),
    milestone_id: z.string().uuid().optional()
});

const ResolveDisputeSchema = z.object({
    resolution_type: z.enum(['REFUND_BUYER', 'PAY_SELLER', 'SPLIT', 'REFUND_AFTER_RETURN']),
    resolution_notes: z.string().optional(),
    buyer_amount: z.number().optional(),
    seller_amount: z.number().optional(),
    return_deadline_hours: z.number().optional()
});

async function updateDisputeReputation(txn: any, action: string) {
    try {
        if (!txn?.buyer_id || !txn?.seller_id) return;
        const buyerWon = action === 'REFUND_BUYER' || action === 'REFUND_AFTER_RETURN';
        const sellerWon = action === 'PAY_SELLER';

        const parties = [
            { id: txn.buyer_id, role: 'BUYER' },
            { id: txn.seller_id, role: 'SELLER' }
        ];

        for (const { id, role } of parties) {
            const { data: existing } = await supabase
                .from('profile_reputation')
                .select('*')
                .eq('profile_id', id)
                .maybeSingle();

            const base = existing || {
                profile_id: id,
                trust_score: 50,
                disputes_raised_count: 0,
                disputes_against_count: 0,
                disputes_won_as_buyer: 0,
                disputes_lost_as_buyer: 0,
                disputes_won_as_seller: 0,
                disputes_lost_as_seller: 0,
                ghosted_count: 0,
                fraud_flags: []
            };

            const update: Record<string, any> = {
                profile_id: id,
                trust_score: base.trust_score,
                disputes_raised_count: base.disputes_raised_count || 0,
                disputes_against_count: base.disputes_against_count || 0,
                disputes_won_as_buyer: base.disputes_won_as_buyer || 0,
                disputes_lost_as_buyer: base.disputes_lost_as_buyer || 0,
                disputes_won_as_seller: base.disputes_won_as_seller || 0,
                disputes_lost_as_seller: base.disputes_lost_as_seller || 0,
                ghosted_count: base.ghosted_count || 0,
                fraud_flags: base.fraud_flags || [],
                last_dispute_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (role === 'BUYER') {
                update.disputes_raised_count += 1;
                if (buyerWon) update.disputes_won_as_buyer += 1;
                else if (sellerWon) update.disputes_lost_as_buyer += 1;
            } else {
                update.disputes_against_count += 1;
                if (sellerWon) update.disputes_won_as_seller += 1;
                else if (buyerWon) update.disputes_lost_as_seller += 1;
            }

            const { error } = await supabase
                .from('profile_reputation')
                .upsert(update, { onConflict: 'profile_id' });
            if (error) throw new Error(error.message);
        }
    } catch (err) {
        console.warn('⚠️ Could not update dispute reputation:', (err as Error).message);
    }
}

export async function insertBuyerRefundCredit(
    disputeId: string,
    txn: any,
    refundType: 'FULL' | 'SPLIT_SHARE' | 'RETURN_CONFIRMED',
    source: 'AI' | 'ADMIN' | 'SLA' | 'RETURN_CONFIRMED',
    overrideAmount?: number
) {
    try {
        // Cap at what's actually still in escrow — for MILESTONE transactions this
        // excludes phases already RELEASED to the seller, which are final and not
        // reopened by a later dispute. For ONE_TIME (or unloaded milestones) this
        // is identical to the old `Number(txn.amount)` behavior.
        const amount = overrideAmount ?? getRemainingMilestoneEscrow(txn);
        if (!amount || amount <= 0) {
            console.warn(`⚠️ insertBuyerRefundCredit skipped: amount=${amount} (txn.id=${txn?.id})`);
            return;
        }
        const { error } = await supabase.from('buyer_refund_credits').insert({
            transaction_id: txn.id,
            dispute_id: disputeId,
            buyer_id: txn.buyer_id,
            amount,
            currency: txn.currency,
            refund_type: refundType,
            status: 'PENDING',
            resolution_source: source
        });
        if (error) throw new Error(error.message);
    } catch (err) {
        console.error('❌ insertBuyerRefundCredit failed:', (err as Error).message, { disputeId, txnId: txn?.id, refundType, source });
    }
}

async function sendVerdictNotifications(disputeId: string, action: string, txn: any) {
    try {
        const REVIEWS_URL = process.env.REVIEWS_URL || 'https://Safeeely.com';
        const actionLabels: Record<string, string> = {
            REFUND_BUYER: '✅ Refund issued to buyer',
            PAY_SELLER: '✅ Payment released to seller',
            SPLIT: '⚖️ Payment split between parties'
        };
        const label = actionLabels[action] || action;

        await Promise.all([txn.buyer, txn.seller].map(async (user: any) => {
            try {
                await routeNotification(
                    user.id,
                    `⚖️ <b>Dispute Resolved</b>\n\nCase for <b>"${txn.product_name}"</b> (#${txn.txn_code}) has been resolved by AI Mediation.\n\n<b>Outcome:</b> ${label}\n\nView your case details for next steps.`,
                    async (platform, platformId) => [{ label: '👁️ View Case', url: await buildInternalMagicLink({ profileId: user.id, safetag: user.safetag, platform, platformId, scope: 'dispute', txnId: txn.id }) }],
                    undefined,
                    user.email ? () => sendDisputeResolvedEmail(user.email, { safetag: user.safetag, product: txn.product_name, txnCode: txn.txn_code, outcome: label, txnId: txn.id }) : undefined
                );
                recordNotification(user.id, 'dispute', '⚖️ Dispute Resolved', `Case for "${txn.product_name}" resolved — ${label}`, { transaction_id: txn.id, transaction_code: txn.txn_code, dispute_id: disputeId, link_url: `/dashboard/transactions/${txn.id}` }).catch(() => {});
            } catch { /* non-critical */ }
        }));

        // Prompt both parties for feedback after dispute resolves (7-day cooldown enforced inside)
        maybeSendFeedbackPrompt(txn.buyer.id, 'post_dispute_resolved', disputeId).catch(() => {});
        maybeSendFeedbackPrompt(txn.seller.id, 'post_dispute_resolved', disputeId).catch(() => {});
    } catch (err) {
        console.error('Failed to send verdict notifications:', err);
    }
}

async function runAIForDispute(disputeId: string, txn?: any, isRetry = false) {
    // DB-level lock — survives server restarts (replaces in-memory Set)
    const { data: lockAcquired } = await supabase
        .from('disputes')
        .update({ processing_locked_at: new Date().toISOString() })
        .eq('id', disputeId)
        .is('processing_locked_at', null)
        .select('id')
        .maybeSingle();

    if (!lockAcquired) {
        // Lock held by in-progress pipeline — schedule one retry so new evidence isn't silently ignored
        if (!isRetry) {
            setTimeout(() => runAIForDispute(disputeId, txn, true), 10000);
        }
        return;
    }

    const { processAIDispute } = require('../services/dispute-ai');
    processAIDispute(disputeId).then(async (aiResult: any) => {
        try {
            if (!aiResult || !aiResult.content) return;

            await supabase.from('dispute_messages').insert({
                dispute_id: disputeId,
                sender_type: 'AI',
                content: aiResult.content
            });

            if (aiResult.type === 'VERDICT') {
                let newTxnStatus = 'FINALIZED';
                if (aiResult.action === 'REFUND_BUYER' || aiResult.action === 'REFUND_AFTER_RETURN') newTxnStatus = 'CANCELLED';
                else if (aiResult.action === 'SPLIT') newTxnStatus = 'RESOLVED_SPLIT';
                // REFUND_AFTER_RETURN keeps DISPUTED until goods confirmed; only REFUND_BUYER cancels immediately
                if (aiResult.action === 'REFUND_AFTER_RETURN') newTxnStatus = 'RETURN_PENDING';

                const splitBuyerPct = aiResult.split_pct_buyer ?? 0;
                const splitPool = txn ? getRemainingMilestoneEscrow(txn) : 0;
                const txnMeta = (aiResult.action === 'SPLIT' && splitBuyerPct != null && txn)
                    ? { resolution: 'SPLIT', buyer_pct: splitBuyerPct, seller_pct: 100 - splitBuyerPct, buyer_amount: +(splitPool * splitBuyerPct / 100).toFixed(2), seller_amount: +(splitPool * (100 - splitBuyerPct) / 100).toFixed(2) }
                    : undefined;

                await supabase.from('disputes').update({
                    status: aiResult.action === 'REFUND_AFTER_RETURN' ? 'OPEN' : 'RESOLVED',
                    resolution: aiResult.action === 'REFUND_AFTER_RETURN' ? null : `AI_MEDIATION: ${aiResult.action}`,
                    resolved_at: aiResult.action === 'REFUND_AFTER_RETURN' ? null : new Date().toISOString(),
                    verdict_action: aiResult.action
                }).eq('id', disputeId);

                if (txn) {
                    await supabase.from('transactions').update({
                        status: newTxnStatus,
                        ...(txnMeta ? { metadata: txnMeta } : {})
                    }).eq('id', txn.id);

                    // Insert buyer refund credits immediately for REFUND_BUYER and SPLIT
                    if (aiResult.action === 'REFUND_BUYER') {
                        await insertBuyerRefundCredit(disputeId, txn, 'FULL', 'AI');
                    } else if (aiResult.action === 'SPLIT' && txnMeta) {
                        await insertBuyerRefundCredit(disputeId, txn, 'SPLIT_SHARE', 'AI', txnMeta.buyer_amount);
                    }

                    // PAY_SELLER on a MILESTONE transaction: release any still-pending
                    // phases (otherwise that money is never counted in the seller's
                    // balance and never refunded either) and run the full finalize
                    // side-effects so the seller gets the same badges/auto-settlement
                    // treatment a normal full completion would. ONE_TIME is untouched —
                    // it keeps issuing exactly the referral commissions it always has.
                    if (aiResult.action === 'PAY_SELLER') {
                        if (txn.transaction_type === 'MILESTONE') {
                            releaseRemainingMilestones(txn.id)
                                .then(() => runFinalizeSideEffects(txn))
                                .catch((e: any) => console.error('❌ Milestone PAY_SELLER finalize failed:', e?.message || e));
                        } else {
                            issueReferralCommissions(txn).catch(() => {});
                        }
                    }

                    if (txn.buyer?.safetag) {
                        track(txn.buyer.safetag, 'dispute_verdict_executed', {
                            dispute_id: disputeId,
                            outcome: aiResult.action,
                            refund_amount: txnMeta?.buyer_amount ?? (aiResult.action === 'REFUND_BUYER' ? txn.amount : 0),
                            currency: txn.currency,
                        });
                    }

                    // Update reputation for all resolved verdicts
                    updateDisputeReputation(txn, aiResult.action).catch(() => {});

                    if (aiResult.action !== 'REFUND_AFTER_RETURN') {
                        await sendVerdictNotifications(disputeId, aiResult.action, txn);
                    } else {
                        // Notify both parties about the return requirement
                        await Promise.allSettled([txn.buyer, txn.seller].filter(Boolean).map(async (user: any) => {
                            const isBuyer = user.id === txn.buyer_id;
                            const msg = isBuyer
                                ? `📦 <b>Return Required</b>\n\nThe mediator has ruled in your favour, but you must first return the goods to the seller. Please ship the item(s) back and confirm here once shipped. You have <b>${(aiResult as any).return_deadline_hours || 72} hours</b>.`
                                : `📦 <b>Goods Being Returned</b>\n\nThe mediator has ruled that the buyer will return the goods. Once you confirm receipt, the refund will be released. Please confirm here when you receive them.`;
                            const btnLabel = isBuyer ? '📤 Confirm Goods Shipped' : '✅ Confirm Goods Received';
                            const btnId = isBuyer ? `dispute_return_buyer_${disputeId}` : `dispute_return_seller_${disputeId}`;
                            await routeNotification(user.id, msg, async (platform, platformId) => [{ label: btnLabel, customId: btnId, url: await buildInternalMagicLink({ profileId: user.id, safetag: user.safetag, platform, platformId, scope: 'dispute', txnId: txn.id }) }]);
                        }));
                    }
                }

            } else if (aiResult.type === 'ESCALATE') {
                // Reviewer rejected the verdict — flag for human admin
                await supabase.from('disputes').update({ is_ai_paused: true }).eq('id', disputeId);
                await supabase.from('dispute_messages').insert({
                    dispute_id: disputeId,
                    sender_type: 'AI',
                    content: '🛡️ **Case Forwarded to Human Support**\n\nThis case needs a closer look from our support team. A Safeeely agent will review all the details and reach out to both parties shortly.\n\nYou don\'t need to do anything right now — just keep an eye on this chat.'
                });
                if (txn?.buyer && txn?.seller) {
                    await Promise.allSettled([txn.buyer, txn.seller].map(async (user: any) => {
                        try {
                            await routeNotification(
                                user.id,
                                `🛡️ <b>Human Support Taking Over</b>\n\nOur AI mediator has flagged your case for human review. A Safeeely support agent will look into this shortly.\n\nYou don't need to do anything right now — just check back on your case.`,
                                async (platform, platformId) => [{ label: '👁️ View Case', url: await buildInternalMagicLink({ profileId: user.id, safetag: user.safetag, platform, platformId, scope: 'dispute', txnId: txn.id }) }]
                            );
                        } catch { /* non-critical */ }
                    }));
                }

            } else if (aiResult.type === 'QUESTION' && aiResult.restrict) {
                const { data: current } = await supabase
                    .from('disputes')
                    .select('ai_rounds')
                    .eq('id', disputeId)
                    .single();

                const newRounds = (current?.ai_rounds || 0) + 1;

                await supabase.from('disputes').update({
                    restricted_to: aiResult.restrict,
                    ai_rounds: newRounds
                }).eq('id', disputeId);

                // Set 2-hour evidence deadline and reset reminder flags
                const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
                await supabase.from('disputes').update({
                    evidence_deadline: deadline,
                    reminder_1_sent: false,
                    reminder_2_sent: false
                }).eq('id', disputeId);

                // Immediately notify the restricted party
                if (txn) {
                    try {
                        const targets: any[] = aiResult.restrict === 'BUYER' ? [txn.buyer]
                            : aiResult.restrict === 'SELLER' ? [txn.seller]
                            : [txn.buyer, txn.seller];
                        await Promise.allSettled(targets.filter(Boolean).map(async (user: any) => {
                            await routeNotification(
                                user.id,
                                `⏱️ <b>Your response is needed</b>\n\nThe mediator has asked for your input on this case. Please check the dispute and share what you can — you have <b>2 hours</b> to respond.`,
                                async (platform, platformId) => [{ label: '📤 Reply Now', url: await buildInternalMagicLink({ profileId: user.id, safetag: user.safetag, platform, platformId, scope: 'dispute', txnId: txn.id }) }]
                            );
                        }));
                    } catch { /* non-critical */ }
                }

                if (newRounds >= 5) {
                    await supabase.from('disputes').update({ is_ai_paused: true }).eq('id', disputeId);
                    await supabase.from('dispute_messages').insert({
                        dispute_id: disputeId,
                        sender_type: 'AI',
                        content: '**[SYSTEM]** This case has been reviewed extensively and requires human judgment. A support agent will review this case shortly.'
                    });
                    // Notify both parties that the case has been escalated
                    if (txn) {
                        await Promise.allSettled([txn.buyer, txn.seller].filter(Boolean).map(async (user: any) => {
                            try {
                                await routeNotification(
                                    user.id,
                                    `⚠️ <b>Case Escalated</b>\n\nYour dispute for <b>"${txn.product_name}"</b> has been escalated for human review after extensive AI analysis. A Safeeely support agent will contact you shortly. Funds remain secure in escrow.`,
                                    async (platform, platformId) => [{ label: '👁️ View Case', url: await buildInternalMagicLink({ profileId: user.id, safetag: user.safetag, platform, platformId, scope: 'dispute', txnId: txn.id }) }]
                                );
                            } catch { /* non-critical */ }
                        }));
                    }
                }
            }
        } finally {
            await supabase.from('disputes').update({ processing_locked_at: null }).eq('id', disputeId);
        }
    }).catch(async (err: any) => {
        console.error(`❌ [runAIForDispute] processAIDispute rejected for ${disputeId}:`, err?.message || err, err?.stack);
        await supabase.from('disputes').update({ processing_locked_at: null }).eq('id', disputeId);
    });
}

/**
 * Raise a dispute
 */
router.post('/raise', requireUserOrBot, async (req: Request, res: Response) => {
    try {
        const isBot = (req as BotOrUserRequest).isBot;
        const user = isBot ? null : (req as AuthedRequest).user;
        const raisedBy = isBot ? req.body.raised_by : user!.sub;
        const data = RaiseDisputeSchema.parse({ ...req.body, raised_by: raisedBy });

        const { data: txn, error: txnError } = await supabase
            .from('transactions')
            .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
            .eq('id', data.transaction_id)
            .single();

        if (txnError || !txn) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (!['PAID', 'AWAITING_PROOF', 'COMPLETED_BY_SELLER'].includes(txn.status)) {
            return res.status(400).json({ error: 'Transaction cannot be disputed in its current state.' });
        }

        // Only buyer or seller may raise a dispute — reject third parties
        if (data.raised_by !== txn.buyer_id && data.raised_by !== txn.seller_id) {
            return res.status(403).json({ error: 'Only a transaction party may raise a dispute.' });
        }

        // milestone_id is optional context only (which phase the buyer is unhappy
        // with) — it never narrows what the dispute resolves, so just validate it
        // actually belongs to this transaction.
        if (data.milestone_id && !(txn.milestones || []).some((m: any) => m.id === data.milestone_id)) {
            return res.status(400).json({ error: 'milestone_id does not belong to this transaction' });
        }

        const { data: dispute, error: disputeError } = await supabase
            .from('disputes')
            .insert({
                transaction_id: data.transaction_id,
                raised_by: data.raised_by,
                reason: data.reason,
                status: 'OPEN',
                user_category: data.category ?? null,
                milestone_id: data.milestone_id ?? null
            })
            .select()
            .single();

        if (disputeError) throw disputeError;

        // Classify dispute type + tier (awaited so AI receives it)
        try {
            const classification = await classifyDisputeType(
                data.reason,
                txn.product_name,
                txn.amount,
                txn.currency,
                txn.buyer?.primary_platform || '',
                txn.seller?.primary_platform || '',
                data.category
            );
            await supabase
                .from('disputes')
                .update({ dispute_type: classification.dispute_type, pipeline_tier: classification.pipeline_tier })
                .eq('id', dispute.id);
        } catch (classifyErr) {
            console.warn('⚠️ Dispute classification failed (non-critical):', classifyErr);
        }

        // Upsert reputation rows so AI can load them immediately
        await Promise.all([txn.buyer?.id, txn.seller?.id].filter(Boolean).map((pid: string) =>
            Promise.resolve(
                supabase.from('profile_reputation')
                    .upsert({ profile_id: pid }, { onConflict: 'profile_id', ignoreDuplicates: true })
            ).catch(() => {})
        ));

        await supabase
            .from('dispute_messages')
            .insert({
                dispute_id: dispute.id,
                sender_id: data.raised_by,
                sender_type: 'USER',
                content: data.reason
            });

        await supabase
            .from('transactions')
            .update({ status: 'DISPUTED' })
            .eq('id', data.transaction_id);

        const raiserIsBuyer = data.raised_by === txn.buyer_id;
        const raiserSafetag = raiserIsBuyer ? txn.buyer?.safetag : txn.seller?.safetag;
        if (raiserSafetag) {
            track(raiserSafetag, 'dispute_raised', {
                dispute_id: dispute.id,
                transaction_id: txn.id,
                dispute_type: dispute.dispute_type,
                raised_by_role: raiserIsBuyer ? 'buyer' : 'seller',
                amount: txn.amount,
                currency: txn.currency,
            });
        }

        // Trigger AI Mediator (fire-and-forget with DB lock)
        runAIForDispute(dispute.id, txn);

        // Notifications
        try {
            const otherParty = txn.buyer.id === data.raised_by ? txn.seller : txn.buyer;
            const raiser = txn.buyer.id === data.raised_by ? txn.buyer : txn.seller;
            await routeNotification(
                otherParty.id,
                `⚠️ <b>Transaction Disputed</b>\n\nTransaction <b>${txn.txn_code}</b> for "${txn.product_name}" has been disputed by @${raiser.safetag}.\n\n<b>Reason:</b> ${data.reason}\n\nFunds have been locked. Please visit your Web Dashboard to review the evidence and resolve the dispute.`,
                async (platform, platformId) => [{ label: '👁️ View Dispute Details', url: await buildInternalMagicLink({ profileId: otherParty.id, safetag: otherParty.safetag, platform, platformId, scope: 'dispute', txnId: txn.id }) }],
                undefined,
                otherParty.email ? () => sendDisputeRaisedEmail(otherParty.email, { safetag: otherParty.safetag, raisingParty: raiser.safetag, product: txn.product_name, txnCode: txn.txn_code, reason: data.reason, txnId: txn.id }) : undefined
            );
            recordNotification(otherParty.id, 'dispute', '⚠️ Dispute Raised Against You', `@${raiser.safetag} disputed "${txn.product_name}" — funds locked`, { transaction_id: txn.id, transaction_code: txn.txn_code, reason: data.reason, link_url: `/dashboard/transactions/${txn.id}` }).catch(() => {});
        } catch (notifErr) {
            console.error('Failed to send dispute notification:', notifErr);
        }

        res.status(201).json({ message: 'Dispute raised successfully', dispute });
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: (err as any).errors });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Get dispute details by transaction ID
 */
router.get('/transaction/:txnId', async (req: Request, res: Response) => {
    try {
        const { txnId } = req.params;
        const { data, error } = await supabase
            .from('disputes')
            .select(`*, raised_by_profile:profiles!raised_by(*), assigned_specialist:admin_users!assigned_admin_id(id, name, specialist_title, specialist_bio, specialties, cases_resolved, years_on_platform), transaction:transactions!transaction_id(id, product_name, amount, currency, txn_code, buyer_id, seller_id, buyer:profiles!buyer_id(safetag, first_name, last_name), seller:profiles!seller_id(safetag, first_name, last_name))`)
            .eq('transaction_id', txnId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'No dispute found for this transaction' });

        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * List all disputes for the authenticated user (buyer or seller)
 */
router.get('/my-disputes', requireUser, async (req: Request, res: Response) => {
    try {
        const profileId = (req as AuthedRequest).user.sub;

        // Find all transactions where user is buyer or seller
        const { data: txns, error: txnErr } = await supabase
            .from('transactions')
            .select('id')
            .or(`buyer_id.eq.${profileId},seller_id.eq.${profileId}`);
        if (txnErr) throw txnErr;

        if (!txns || txns.length === 0) return res.json([]);

        const txnIds = txns.map((t: any) => t.id);

        const { data: disputes, error: dispErr } = await supabase
            .from('disputes')
            .select(`
                id, status, verdict_action, resolution, created_at, resolved_at,
                is_ai_paused, ai_rounds, last_judge_payload, metadata,
                assigned_specialist:admin_users!assigned_admin_id(
                    id, name, specialist_title, specialist_bio, specialties, cases_resolved, years_on_platform
                ),
                transaction:transactions!transaction_id(
                    id, product_name, amount, currency, txn_code, buyer_id, seller_id,
                    buyer:profiles!buyer_id(safetag, first_name, last_name),
                    seller:profiles!seller_id(safetag, first_name, last_name)
                ),
                adjudication:dispute_adjudications!dispute_id(
                    final_action, resolution_source, split_pct_buyer, low_confidence
                )
            `)
            .in('transaction_id', txnIds)
            .order('created_at', { ascending: false });

        if (dispErr) throw dispErr;

        // Attach latest AI/admin message snippet to each dispute
        const disputeIds = (disputes || []).map((d: any) => d.id);
        let snippetMap: Record<string, string> = {};
        if (disputeIds.length > 0) {
            const { data: snippetRows } = await supabase
                .from('dispute_messages')
                .select('dispute_id, content, created_at')
                .in('dispute_id', disputeIds)
                .in('sender_type', ['AI', 'ADMIN'])
                .order('created_at', { ascending: false });

            // Keep only latest per dispute_id
            if (snippetRows) {
                for (const row of snippetRows) {
                    if (!snippetMap[row.dispute_id]) {
                        snippetMap[row.dispute_id] = (row.content as string).slice(0, 120);
                    }
                }
            }
        }

        const result = (disputes || []).map((d: any) => ({
            ...d,
            latest_ai_snippet: snippetMap[d.id] || null,
            // Prefer DB relation; fall back to metadata snapshot for older disputes
            assigned_specialist: d.assigned_specialist || d.metadata?.assigned_specialist || null,
        }));

        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Upload evidence
 */
router.post('/:id/upload', requireUser, upload.array('files', 20), async (req: Request, res: Response) => {
    try {
        const user = (req as AuthedRequest).user;
        const id = String(req.params.id);
        const files = req.files as Express.Multer.File[];

        // Verify uploader is a party to this dispute
        const { data: disputeParties } = await supabase
            .from('disputes')
            .select('transaction:transaction_id(buyer_id, seller_id)')
            .eq('id', id)
            .single();
        if (!disputeParties) return res.status(404).json({ error: 'Dispute not found' });
        const dt = (disputeParties as any).transaction;
        if (user.sub !== dt?.buyer_id && user.sub !== dt?.seller_id) {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }

        console.log(`📤 Upload request for dispute ${id}. Files:`, files?.length);

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedAttachments = [];

        for (const file of files) {
            const fileName = `${id}/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
            console.log(`🚀 Uploading to Supabase: ${fileName} (${file.mimetype})`);
            
            const { error } = await supabase.storage
                .from('dispute-evidence')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (error) {
                console.error('❌ Supabase Storage Error:', error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('dispute-evidence')
                .getPublicUrl(fileName);

            console.log(`✅ Uploaded: ${publicUrl}`);

            uploadedAttachments.push({
                name: file.originalname,
                url: publicUrl,
                type: file.mimetype,
                size: file.size
            });
        }

        res.json(uploadedAttachments);
    } catch (err: any) {
        console.error('🚨 Upload Route Failure:', err);
        res.status(500).json({ error: 'Failed to upload files', details: err.message });
    }
});

/**
 * Get messages
 */
router.get('/:id/messages', requireUser, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthedRequest).user;
        const id = String(req.params.id);

        // Verify requester is a party to this dispute
        const { data: disputeParties } = await supabase
            .from('disputes')
            .select('transaction:transaction_id(buyer_id, seller_id)')
            .eq('id', id)
            .single();
        if (!disputeParties) return res.status(404).json({ error: 'Dispute not found' });
        const dt = (disputeParties as any).transaction;
        if (user.sub !== dt?.buyer_id && user.sub !== dt?.seller_id) {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }

        const { data, error } = await supabase
            .from('dispute_messages')
            .select('*')
            .eq('dispute_id', id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Send message
 */
router.post('/:id/messages', requireUser, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthedRequest).user;
        const id = String(req.params.id);
        const { content, attachments, metadata = {} } = req.body;
        // Derive identity from JWT — never trust body for sender_id or sender_type
        const sender_id = user.sub;
        const sender_type = 'USER';

        // 1. Initial Dispute Check
        const { data: disputeData, error: dError } = await supabase
            .from('disputes')
            .select('*, transaction:transaction_id(*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*))')
            .eq('id', id)
            .single();

        if (dError || !disputeData) {
            return res.status(404).json({ error: 'Dispute not found' });
        }

        // Verify sender is a party to this dispute
        const txnParties = disputeData.transaction;
        if (sender_id !== txnParties.buyer_id && sender_id !== txnParties.seller_id) {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }

        // Mediator-imposed message restrictions
        if (disputeData.restricted_to !== 'ALL') {
            const isBuyer = sender_id === txnParties.buyer_id;
            const isSeller = sender_id === txnParties.seller_id;
            if ((disputeData.restricted_to === 'BUYER' && !isBuyer) ||
                (disputeData.restricted_to === 'SELLER' && !isSeller)) {
                return res.status(403).json({
                    error: 'You are temporarily restricted from sending messages by the mediator.'
                });
            }
        }

        const messageData: any = {
            dispute_id: id,
            sender_id,
            sender_type,
            content,
            attachments: attachments || [],
            metadata: metadata || {}
        };

        let savedMessage;
        try {
            const { data: message, error } = await supabase
                .from('dispute_messages')
                .insert(messageData)
                .select()
                .single();

            if (error) throw error;
            savedMessage = message;

            // Tag evidence tier (fire-and-forget)
            if (savedMessage?.id) {
                const tierHint = quickTierHint(content || '', attachments || []);
                Promise.resolve(
                    supabase
                        .from('dispute_messages')
                        .update({ evidence_tier: tierHint.tier, evidence_tags: tierHint.tags })
                        .eq('id', savedMessage.id)
                ).catch(() => {});
            }
        } catch (insertErr: any) {
            console.error('❌ Insert Message Error:', insertErr.message);
            return res.status(500).json({ error: insertErr.message });
        }

        // Trigger AI if not paused
        if (!disputeData.is_ai_paused) {
            runAIForDispute(id as string, disputeData.transaction);
        }

        return res.status(201).json(savedMessage);
    } catch (err: any) {
        console.error('❌ Send Message Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Accept AI verdict (user-facing — records consent without releasing funds directly)
 */
router.post('/:id/accept-verdict', requireUser, async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const user = (req as AuthedRequest).user;

        const { data: dispute } = await supabase
            .from('disputes')
            .select('id, transaction_id')
            .eq('id', id)
            .single();

        if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

        const { data: txn } = await supabase
            .from('transactions')
            .select('buyer_id, seller_id')
            .eq('id', dispute.transaction_id)
            .single();

        if (!txn || (user.sub !== txn.buyer_id && user.sub !== txn.seller_id)) {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }

        // Store acceptance in dispute metadata
        const { data: existing } = await supabase
            .from('disputes')
            .select('verdict_accepted_by')
            .eq('id', id)
            .single();

        const acceptedBy: string[] = ((existing as any)?.verdict_accepted_by as string[]) || [];
        if (!acceptedBy.includes(user.sub)) {
            acceptedBy.push(user.sub);
        }

        await supabase.from('disputes').update({ verdict_accepted_by: acceptedBy }).eq('id', id);

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Resolve dispute (admin-only)
 */
router.post('/:id/resolve', requireAdmin, async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const data = ResolveDisputeSchema.parse(req.body);

        const { data: dispute, error: fetchError } = await supabase
            .from('disputes')
            .select('transaction_id')
            .eq('id', id)
            .single();

        if (fetchError || !dispute) return res.status(404).json({ error: 'Dispute not found' });

        // Loaded up front (with milestones) so SPLIT amounts can be validated
        // against what's actually still in escrow before anything is written.
        const { data: txnForValidation } = await supabase
            .from('transactions')
            .select('*, milestones:transaction_milestones(*)')
            .eq('id', dispute.transaction_id)
            .single();

        if (data.resolution_type === 'SPLIT') {
            const remaining = getRemainingMilestoneEscrow(txnForValidation);
            const requested = (data.buyer_amount ?? 0) + (data.seller_amount ?? 0);
            if (requested > remaining + 0.01) {
                return res.status(400).json({
                    error: 'SPLIT_EXCEEDS_REMAINING_ESCROW',
                    message: `Buyer + seller amounts (${requested}) exceed the ${remaining} still in escrow for this transaction.`,
                    remaining_escrow: remaining
                });
            }
        }

        const isReturnFlow = data.resolution_type === 'REFUND_AFTER_RETURN';
        let resolutionText = data.resolution_type;
        if (data.resolution_type === 'SPLIT') {
            resolutionText += ` (Buyer: ${data.buyer_amount}, Seller: ${data.seller_amount})`;
        }
        if (data.resolution_notes) resolutionText += `: ${data.resolution_notes}`;

        await supabase
            .from('disputes')
            .update({
                // REFUND_AFTER_RETURN stays OPEN until goods are returned; then confirm-return closes it
                status: isReturnFlow ? 'OPEN' : 'RESOLVED',
                resolution: isReturnFlow ? null : resolutionText,
                resolved_at: isReturnFlow ? null : new Date().toISOString(),
                verdict_action: isReturnFlow ? 'REFUND_AFTER_RETURN' : null,
                ...(isReturnFlow ? { return_deadline_hours: data.return_deadline_hours ?? 72 } : {})
            })
            .eq('id', id);

        let newTxnStatus = 'FINALIZED';
        if (data.resolution_type === 'REFUND_BUYER') {
            newTxnStatus = 'CANCELLED';
        } else if (data.resolution_type === 'SPLIT') {
            newTxnStatus = 'RESOLVED_SPLIT';
        } else if (isReturnFlow) {
            newTxnStatus = 'RETURN_PENDING';
        }

        // Compute SPLIT metadata using consistent key names (buyer_amount / seller_amount)
        let txnMetadata: Record<string, any> | undefined;
        if (data.resolution_type === 'SPLIT') {
            txnMetadata = {
                resolution: 'SPLIT',
                buyer_amount: data.buyer_amount,
                seller_amount: data.seller_amount,
                // Legacy aliases so old admin UI still works
                buyer_refund: data.buyer_amount,
                seller_payout: data.seller_amount
            };
        }

        await supabase
            .from('transactions')
            .update({
                status: newTxnStatus,
                ...(txnMetadata ? { metadata: txnMetadata } : {})
            })
            .eq('id', dispute.transaction_id);

        // Fetch transaction + parties for notifications and credit inserts
        const { data: txnFull } = await supabase
            .from('transactions')
            .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
            .eq('id', dispute.transaction_id)
            .single();

        if (txnFull) {
            if (!isReturnFlow) {
                // Insert buyer refund credit
                if (data.resolution_type === 'REFUND_BUYER') {
                    await insertBuyerRefundCredit(id, txnFull, 'FULL', 'ADMIN');
                } else if (data.resolution_type === 'SPLIT' && data.buyer_amount) {
                    await insertBuyerRefundCredit(id, txnFull, 'SPLIT_SHARE', 'ADMIN', data.buyer_amount);
                }

                // PAY_SELLER on a MILESTONE transaction: release remaining phases +
                // run full finalize side-effects (same reasoning as the AI verdict
                // handler above). ONE_TIME keeps the original referral-commissions-only call.
                if (data.resolution_type === 'PAY_SELLER') {
                    if (txnFull.transaction_type === 'MILESTONE') {
                        releaseRemainingMilestones(txnFull.id)
                            .then(() => runFinalizeSideEffects(txnFull))
                            .catch((e: any) => console.error('❌ Milestone PAY_SELLER finalize failed:', e?.message || e));
                    } else {
                        issueReferralCommissions(txnFull).catch(() => {});
                    }
                }

                // Notify both parties
                await sendVerdictNotifications(id, data.resolution_type, txnFull);
            } else {
                // Return flow: notify both parties about return requirement
                const deadlineHours = data.return_deadline_hours ?? 72;
                await Promise.allSettled([txnFull.buyer, txnFull.seller].filter(Boolean).map(async (user: any) => {
                    const isBuyer = user.id === txnFull.buyer_id;
                    const msg = isBuyer
                        ? `📦 <b>Return Required</b>\n\nAdmin has ruled in your favour, but you must first return the goods to the seller. Please ship the item(s) back and confirm once shipped. You have <b>${deadlineHours} hours</b>.`
                        : `📦 <b>Goods Being Returned</b>\n\nAdmin has ruled that the buyer will return the goods. Please confirm receipt here when you receive them.`;
                    const btnLabel = isBuyer ? '📤 Confirm Goods Shipped' : '✅ Confirm Goods Received';
                    const btnId = isBuyer ? `dispute_return_buyer_${id}` : `dispute_return_seller_${id}`;
                    await routeNotification(user.id, msg, async (platform, platformId) => [{ label: btnLabel, customId: btnId, url: await buildInternalMagicLink({ profileId: user.id, safetag: user.safetag, platform, platformId, scope: 'dispute', txnId: txnFull.id }) }]).catch(() => {});
                }));
            }
        }

        console.log(`⚖️ Dispute ${id} resolved as ${data.resolution_type}`);
        res.json({ message: 'Dispute resolved successfully', status: newTxnStatus });
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: (err as any).errors });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Confirm goods returned (REFUND_AFTER_RETURN flow)
 * Buyer calls with role='BUYER' to confirm shipping; seller calls with role='SELLER' to confirm receipt.
 * On seller confirmation the refund credit is issued and both parties are notified.
 */
router.post('/:id/confirm-return', requireUser, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthedRequest).user;
        const id = String(req.params.id);
        const { role, tracking_number } = req.body;

        if (!['BUYER', 'SELLER'].includes(role)) {
            return res.status(400).json({ error: 'role (BUYER|SELLER) is required' });
        }

        const { data: dispute, error: dErr } = await supabase
            .from('disputes')
            .select('*, transaction:transaction_id(*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*))')
            .eq('id', id)
            .single();

        if (dErr || !dispute) return res.status(404).json({ error: 'Dispute not found' });
        if (dispute.verdict_action !== 'REFUND_AFTER_RETURN') {
            return res.status(400).json({ error: 'This dispute does not have a return-after-refund verdict' });
        }
        if ((dispute as any).transaction?.status !== 'RETURN_PENDING') {
            return res.status(400).json({ error: 'Transaction is not in RETURN_PENDING state' });
        }

        const txn = (dispute as any).transaction;

        // Verify caller matches the claimed role
        if (role === 'BUYER' && user.sub !== txn.buyer_id) {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }
        if (role === 'SELLER' && user.sub !== txn.seller_id) {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }

        if (role === 'BUYER') {
            // Buyer confirms they have shipped goods back
            const meta = { ...(dispute.metadata || {}), buyer_shipped_at: new Date().toISOString(), ...(tracking_number ? { tracking_number } : {}) };
            await supabase.from('disputes').update({ metadata: meta }).eq('id', id);

            // Notify seller
            if (txn.seller) {
                await routeNotification(
                    txn.seller_id,
                    `📦 <b>Buyer Shipped Goods Back</b>\n\nThe buyer has confirmed they shipped the goods back${tracking_number ? ` (Tracking: <code>${tracking_number}</code>)` : ''}. Please confirm receipt once you receive them.`,
                    async (platform, platformId) => [{ label: '✅ Confirm Received', customId: `dispute_return_seller_${id}`, url: await buildInternalMagicLink({ profileId: txn.seller.id, safetag: txn.seller.safetag, platform, platformId, scope: 'dispute', txnId: txn.id }) }]
                );
            }

            return res.json({ message: 'Shipping confirmed — seller has been notified' });

        } else {
            // Seller confirms receipt — release the refund credit
            const returnedAt = new Date().toISOString();
            const meta = { ...(dispute.metadata || {}), seller_confirmed_return_at: returnedAt };

            await supabase.from('disputes').update({
                status: 'RESOLVED',
                resolution: 'AI_MEDIATION: REFUND_AFTER_RETURN',
                resolved_at: returnedAt,
                metadata: meta
            }).eq('id', id);

            await supabase.from('transactions').update({ status: 'CANCELLED' }).eq('id', txn.id);

            await insertBuyerRefundCredit(id, txn, 'RETURN_CONFIRMED', 'RETURN_CONFIRMED');

            if (txn.buyer?.safetag) {
                track(txn.buyer.safetag, 'dispute_return_confirmed', { dispute_id: id, transaction_id: txn.id });
            }

            await sendVerdictNotifications(id, 'REFUND_BUYER', txn);

            return res.json({ message: 'Return confirmed — refund credit has been issued to buyer' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Escalate to Human — user-facing, sets is_ai_paused and assigns a specialist.
 * Does NOT send push notifications (those go out when the admin actually joins).
 */
router.post('/:id/escalate', requireUser, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthedRequest).user;
        const id = String(req.params.id);

        const { data: disputeData } = await supabase
            .from('disputes')
            .select('dispute_type, is_ai_paused, transaction:transaction_id(buyer_id, seller_id)')
            .eq('id', id)
            .single();

        if (!disputeData) return res.status(404).json({ error: 'Dispute not found' });

        // Only parties to the dispute may escalate
        const dt = (disputeData as any).transaction;
        if (user.sub !== dt?.buyer_id && user.sub !== dt?.seller_id) {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }

        // Pause AI mediation
        await supabase.from('disputes').update({ is_ai_paused: true }).eq('id', id);

        track(user.safetag, 'dispute_escalated_to_human', {
            dispute_id: id,
            escalated_by_role: user.sub === dt.buyer_id ? 'buyer' : 'seller',
        });

        // Assign best specialist via smart routing
        const specialist = await routeDispute(id, disputeData.dispute_type);

        // Insert AI system message to appear in the case thread
        const specialistName = specialist?.name || 'a specialist';
        await supabase.from('dispute_messages').insert({
            dispute_id: id,
            sender_type: 'AI',
            content: `Your case has been escalated for human review. **${specialistName}** has been assigned and will review the full case file shortly. You can continue sending messages here — they will respond directly in this thread.`,
        });

        res.json({ success: true, specialist });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Notify Join
 */
router.post('/:id/notify-join', requireAdmin, async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { admin_name } = req.body;

        await supabase.from('disputes').update({ is_ai_paused: true }).eq('id', id);

        const { data: disputeData } = await supabase
            .from('disputes')
            .select('*, transaction:transaction_id(*, buyer:buyer_id(*), seller:seller_id(*))')
            .eq('id', id)
            .single();

        if (disputeData && disputeData.transaction) {
            const { buyer, seller } = disputeData.transaction;
            const txn = disputeData.transaction;

            await Promise.all([buyer, seller].map(async (user) => {
                const { data: linked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', user.id)
                    .eq('is_primary', true)
                    .single();

                if (linked) {
                    const fullMsg = `🛡️ <b>Human Support Joined</b>\n\nSupport agent <b>${admin_name || 'Admin'}</b> has joined the conversation to resolve this dispute personally. AI Mediation is now on standby.\n\n<b>Case Context:</b>\n📦 ${txn.product_name}\n💰 ${txn.amount} ${txn.currency}\n🆔 #${txn.txn_code}`;
                    const actionBtn = {
                        label: '👁️ View Case',
                        url: await buildInternalMagicLink({ profileId: user.id, safetag: user.safetag, platform: linked.platform, platformId: linked.platform_id, scope: 'dispute', txnId: disputeData.transaction_id })
                    };
                    await sendNotification(linked.platform, linked.platform_id, fullMsg, [actionBtn]);
                    recordNotification(user.id, 'dispute', '🛡️ Human Support Joined', `Support agent ${admin_name || 'Admin'} joined your dispute for "${txn.product_name}"`, { transaction_id: disputeData.transaction_id, link_url: `/dashboard/transactions/${disputeData.transaction_id}` }).catch(() => {});
                }
            }));
        }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Notify Leave
 */
router.post('/:id/notify-leave', requireAdmin, async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { admin_name } = req.body;

        const { data: disputeData } = await supabase
            .from('disputes')
            .select('*, transaction:transaction_id(*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*))')
            .eq('id', id)
            .single();

        if (disputeData && disputeData.transaction) {
            const { buyer, seller } = disputeData.transaction;
            const txn = disputeData.transaction;

            await Promise.all([buyer, seller].map(async (user) => {
                const { data: linked } = await supabase
                    .from('linked_accounts')
                    .select('platform, platform_id')
                    .eq('profile_id', user.id)
                    .eq('is_primary', true)
                    .single();

                if (linked) {
                    const fullMsg = `🛡️ <b>Human Support Left</b>\n\nSupport agent <b>${admin_name || 'Admin'}</b> has left the conversation. Standard dispute terms still apply.\n\n<b>Case Context:</b>\n📦 ${txn.product_name}\n💰 ${txn.amount} ${txn.currency}\n🆔 #${txn.txn_code}`;
                    const actionBtn = {
                        label: '👁️ View Case',
                        url: await buildInternalMagicLink({ profileId: user.id, safetag: user.safetag, platform: linked.platform, platformId: linked.platform_id, scope: 'dispute', txnId: disputeData.transaction_id })
                    };
                    await sendNotification(linked.platform, linked.platform_id, fullMsg, [actionBtn]);
                    recordNotification(user.id, 'dispute', '🛡️ Support Left', `Support agent ${admin_name || 'Admin'} left your dispute for "${txn.product_name}"`, { transaction_id: disputeData.transaction_id, link_url: `/dashboard/transactions/${disputeData.transaction_id}` }).catch(() => {});
                }
            }));

            // If the case was not resolved by admin, resume AI mediation
            if (disputeData.status === 'OPEN') {
                await supabase.from('disputes').update({ is_ai_paused: false }).eq('id', id);
                runAIForDispute(id, disputeData.transaction);
            }
        }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Restrict Chat Participation
 */
router.post('/:id/restrict', requireAdmin, async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { restricted_to } = req.body; // 'ALL', 'BUYER', or 'SELLER'

        if (!['ALL', 'BUYER', 'SELLER'].includes(restricted_to)) {
            return res.status(400).json({ error: 'Invalid restriction target' });
        }

        const { error } = await supabase
            .from('disputes')
            .update({ restricted_to })
            .eq('id', id);

        if (error) throw error;
        
        res.json({ success: true, restricted_to });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Feature C: SLA Timeouts & Ghosting
 * Endpoint intended to be called hourly by a cron service
 */
router.post('/cron/timeouts', async (req: Request, res: Response) => {
    try {
        const { cron_secret } = req.body;
        if (cron_secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get all OPEN disputes that are purely AI managed
        const { data: openDisputes } = await supabase
            .from('disputes')
            .select('id, restricted_to, transaction_id, is_ai_paused')
            .eq('status', 'OPEN')
            .eq('is_ai_paused', false);

        if (!openDisputes || openDisputes.length === 0) {
            return res.json({ processed: 0, message: 'No open AI disputes' });
        }

        let processed = 0;
        const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

        for (const dispute of openDisputes) {
            // Find the last message
            const { data: lastMsgs } = await supabase
                .from('dispute_messages')
                .select('created_at, sender_type')
                .eq('dispute_id', dispute.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (lastMsgs && lastMsgs.length > 0) {
                const lastMsg = lastMsgs[0];
                const msgTime = new Date(lastMsg.created_at).getTime();
                const now = new Date().getTime();

                // If AI was the last to speak, AND it's been > 48 hours
                if (lastMsg.sender_type === 'AI' && (now - msgTime) > FORTY_EIGHT_HOURS) {
                    let action: string | null = null;
                    if (dispute.restricted_to === 'BUYER') action = 'PAY_SELLER';
                    else if (dispute.restricted_to === 'SELLER') action = 'REFUND_BUYER';
                    // If ALL restriction (both silent) — default to PAY_SELLER (escrow standard: funds go to seller if buyer didn't pursue)
                    else if (!dispute.restricted_to || dispute.restricted_to === 'ALL') action = 'PAY_SELLER';

                    if (action) {
                        const newTxnStatus = action === 'REFUND_BUYER' ? 'CANCELLED' : 'FINALIZED';

                        await supabase.from('dispute_messages').insert({
                            dispute_id: dispute.id,
                            sender_type: 'AI',
                            content: `**SYSTEM VERDICT:** The required party failed to provide evidence within 48 hours. The dispute has been automatically closed (${action}).`
                        });

                        await supabase.from('disputes').update({
                            status: 'RESOLVED',
                            resolution: `SLA_TIMEOUT: ${action}`,
                            resolved_at: new Date().toISOString()
                        }).eq('id', dispute.id);

                        await supabase.from('transactions').update({ status: newTxnStatus }).eq('id', dispute.transaction_id);

                        // Notify both parties and issue credits
                        try {
                            const { data: fullTxn } = await supabase
                                .from('transactions')
                                .select('*, buyer:buyer_id(*), seller:seller_id(*), milestones:transaction_milestones(*)')
                                .eq('id', dispute.transaction_id)
                                .single();
                            if (fullTxn) {
                                await sendVerdictNotifications(dispute.id, action, fullTxn);
                                if (action === 'REFUND_BUYER') {
                                    await insertBuyerRefundCredit(dispute.id, fullTxn, 'FULL', 'SLA');
                                }
                                if (action === 'PAY_SELLER') {
                                    if (fullTxn.transaction_type === 'MILESTONE') {
                                        releaseRemainingMilestones(fullTxn.id)
                                            .then(() => runFinalizeSideEffects(fullTxn))
                                            .catch((e: any) => console.error('❌ Milestone PAY_SELLER finalize failed:', e?.message || e));
                                    } else {
                                        issueReferralCommissions(fullTxn).catch(() => {});
                                    }
                                }
                            }
                        } catch { /* non-critical */ }

                        processed++;
                    }
                }
            }
        }

        res.json({ success: true, processed });
    } catch (err: any) {
        console.error('Cron error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Admin: List SOPs
 */
router.get('/admin/sops', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { type, status } = req.query;
        let query = supabase.from('dispute_sops').select('*').order('priority', { ascending: false });
        if (type) query = query.eq('dispute_type', type as string);
        if (status) query = query.eq('status', status as string);
        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Admin: Approve a HARD_GATE SOP
 */
router.post('/admin/sops/:sopId/approve', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { sopId } = req.params;
        const { error } = await supabase
            .from('dispute_sops')
            .update({ human_approved: true, status: 'ACTIVE' })
            .eq('id', sopId);
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Admin: Archive a SOP
 */
router.post('/admin/sops/:sopId/archive', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { sopId } = req.params;
        const { error } = await supabase
            .from('dispute_sops')
            .update({ status: 'ARCHIVED' })
            .eq('id', sopId);
        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get dispute evolution log (stub — Phase 3 will populate)
 */
router.get('/:id/evolution-log', async (req: Request, res: Response) => {
    res.json([]);
});

export default router;
