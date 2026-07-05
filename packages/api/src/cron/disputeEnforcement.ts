import { supabase } from '@safepal/shared';
import { routeNotification, recordNotification } from '../services/notifications';
import { buildInternalMagicLink } from '../services/magicLinkInternal';
import { sendDisputeResolvedEmail, sendAdminSlaReminderEmail } from '../services/email';
import { issueReferralCommissions } from '../services/commissions';
import { insertBuyerRefundCredit } from '../routes/disputes';
import { releaseRemainingMilestones } from '../services/milestoneEscrow';
import { runFinalizeSideEffects } from '../services/finalizeTransactionSideEffects';

// PAY_SELLER on a MILESTONE transaction must release the remaining phases and
// run the full finalize side-effects (same reasoning as the AI/admin verdict
// paths in disputes.ts) — otherwise un-released phases are never counted in
// the seller's balance and never refunded either. ONE_TIME is untouched.
async function finalizePaySeller(txn: any): Promise<void> {
    if (txn.transaction_type === 'MILESTONE') {
        await releaseRemainingMilestones(txn.id);
        await runFinalizeSideEffects(txn);
    } else {
        issueReferralCommissions(txn).catch(() => {});
    }
}

// How long a party has to respond to an AI question (milliseconds)
const EVIDENCE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

// Reminder thresholds
const REMINDER_1_MS = 60 * 60 * 1000; // 1 hour remaining → first reminder
const REMINDER_2_MS = 30 * 60 * 1000; // 30 min remaining → final warning

// Stale lock threshold — any lock held longer than this is a crashed process
const STALE_LOCK_MS = 5 * 60 * 1000; // 5 minutes

export async function runDisputeEnforcement(): Promise<void> {
    const now = new Date();
    console.log(`⚙️  [dispute-enforcement] Running at ${now.toISOString()}`);

    await Promise.allSettled([
        releaseStaleLocks(now),
        processEvidenceDeadlines(now),
        checkAssignedCaseSLA(now),
    ]);
}

// ── Assigned-case SLA reminders ───────────────────────────────────────────────

const SLA_24H_MS  = 24 * 60 * 60 * 1000;
const SLA_72H_MS  = 72 * 60 * 60 * 1000;
const ADMIN_PANEL = process.env.REVIEWS_URL || 'https://safeeely.com';

async function checkAssignedCaseSLA(now: Date): Promise<void> {
    // Escalated disputes with an assigned specialist but still open
    const { data: cases, error } = await supabase
        .from('disputes')
        .select(`
            id, assigned_admin_id, assigned_at,
            admin:assigned_admin_id(id, name, email)
        `)
        .eq('status', 'OPEN')
        .eq('is_ai_paused', true)
        .not('assigned_admin_id', 'is', null);

    if (error || !cases?.length) return;

    // Batch fetch last admin message per dispute for freshness check
    const disputeIds = cases.map((c: any) => c.id);
    const { data: lastMsgs } = await supabase
        .from('dispute_messages')
        .select('dispute_id, created_at')
        .in('dispute_id', disputeIds)
        .eq('sender_type', 'ADMIN')
        .order('created_at', { ascending: false });

    const lastAdminMsgMap: Record<string, Date> = {};
    for (const msg of (lastMsgs || [])) {
        if (!lastAdminMsgMap[msg.dispute_id]) {
            lastAdminMsgMap[msg.dispute_id] = new Date(msg.created_at);
        }
    }

    // Fetch super-admins for 72h escalation alerts
    const { data: superAdmins } = await supabase
        .from('admin_users')
        .select('id, name, email')
        .eq('role', 'SUPER_ADMIN')
        .eq('status', 'ACTIVE');

    for (const c of cases) {
        try {
            const assignedAt = c.assigned_at ? new Date(c.assigned_at) : null;
            if (!assignedAt) continue;

            // Use last admin message time if more recent than assignment
            const lastActivityAt = lastAdminMsgMap[c.id] ?? assignedAt;
            const elapsedMs = now.getTime() - lastActivityAt.getTime();
            const hoursElapsed = Math.floor(elapsedMs / (60 * 60 * 1000));
            const admin = (c as any).admin;
            const panelUrl = `${ADMIN_PANEL}/admin/disputes/${c.id}`;

            if (elapsedMs >= SLA_72H_MS) {
                // Notify all super-admins that case is stalled
                for (const sa of (superAdmins || [])) {
                    if (sa.email) {
                        sendAdminSlaReminderEmail(sa.email, {
                            adminName: sa.name,
                            disputeId: c.id,
                            hoursElapsed,
                            adminPanelUrl: panelUrl,
                            isSuperAdminAlert: true,
                        });
                    }
                }
                console.log(`🚨 [enforcement] 72h SLA breach — dispute ${c.id}, notified ${(superAdmins || []).length} super-admins`);
            } else if (elapsedMs >= SLA_24H_MS && admin?.email) {
                // Remind the assigned specialist
                sendAdminSlaReminderEmail(admin.email, {
                    adminName: admin.name,
                    disputeId: c.id,
                    hoursElapsed,
                    adminPanelUrl: panelUrl,
                });
                console.log(`⏰ [enforcement] 24h SLA reminder sent to ${admin.name} for dispute ${c.id}`);
            }
        } catch {}
    }
}

// ── Stale lock cleanup ────────────────────────────────────────────────────────

async function releaseStaleLocks(now: Date): Promise<void> {
    const cutoff = new Date(now.getTime() - STALE_LOCK_MS).toISOString();
    const { data, error } = await supabase
        .from('disputes')
        .update({ processing_locked_at: null })
        .eq('status', 'OPEN')
        .lt('processing_locked_at', cutoff)
        .not('processing_locked_at', 'is', null)
        .select('id');

    if (error) {
        console.warn('⚠️  [enforcement] Stale lock cleanup failed:', error.message);
        return;
    }
    if (data && data.length > 0) {
        console.log(`🔓 [enforcement] Released ${data.length} stale lock(s):`, data.map((d: any) => d.id));
    }
}

// ── Evidence deadline enforcement ─────────────────────────────────────────────

async function processEvidenceDeadlines(now: Date): Promise<void> {
    const { data: disputes, error } = await supabase
        .from('disputes')
        .select(`
            id, restricted_to, evidence_deadline, verdict_action, metadata,
            reminder_1_sent, reminder_2_sent,
            transaction:transactions(
                id, txn_code, product_name, amount, currency,
                transaction_type, fee_amount, group_id, buyer_id, seller_id,
                buyer:buyer_id(id, safetag, email),
                seller:seller_id(id, safetag, email),
                milestones:transaction_milestones(*)
            )
        `)
        .eq('status', 'OPEN')
        .eq('is_ai_paused', false)
        .not('evidence_deadline', 'is', null)
        .limit(100);

    if (error) {
        console.warn('⚠️  [enforcement] Could not fetch disputes:', error.message);
        return;
    }

    for (const dispute of (disputes || [])) {
        try {
            await handleDeadline(dispute, now);
        } catch (err) {
            console.error(`❌ [enforcement] Error processing dispute ${dispute.id}:`, (err as Error).message);
        }
    }
}

async function handleDeadline(dispute: any, now: Date): Promise<void> {
    const deadline = new Date(dispute.evidence_deadline);
    const msLeft = deadline.getTime() - now.getTime();
    const txn = dispute.transaction;
    if (!txn) return;

    if (msLeft <= 0) {
        // Check if this is a RETURN_PENDING dispute awaiting goods return
        if (dispute.verdict_action === 'REFUND_AFTER_RETURN') {
            console.log(`⏰ [enforcement] Return deadline passed for dispute ${dispute.id}`);
            await applyReturnDeadlineInference(dispute, txn);
            return;
        }
        // Deadline passed — apply adverse inference
        console.log(`⏰ [enforcement] Deadline passed for dispute ${dispute.id}, applying adverse inference`);
        await applyAdverseInference(dispute, txn);

    } else if (msLeft <= REMINDER_2_MS && !dispute.reminder_2_sent) {
        // 30 min left — final warning
        console.log(`🔔 [enforcement] Final warning for dispute ${dispute.id} (${Math.round(msLeft / 60000)} min left)`);
        await sendReminder(dispute, txn, 2,
            `⚠️ <b>Final reminder</b>\n\nWe still need your proof to move this case forward. You have about <b>30 minutes</b> left. After that, we will close this case based on what we have.\n\nPlease send what you have — even a screenshot helps.`
        );
        await supabase.from('disputes').update({ reminder_2_sent: true }).eq('id', dispute.id);

    } else if (msLeft <= REMINDER_1_MS && !dispute.reminder_1_sent) {
        // 1 hour left — first reminder
        console.log(`🔔 [enforcement] First reminder for dispute ${dispute.id} (${Math.round(msLeft / 60000)} min left)`);
        await sendReminder(dispute, txn, 1,
            `📋 <b>Reminder</b>\n\nWe are waiting for your proof to continue reviewing this case. You have about <b>1 hour</b> left to share it.\n\nPlease check the dispute and send what we asked for.`
        );
        await supabase.from('disputes').update({ reminder_1_sent: true }).eq('id', dispute.id);
    }
}

// ── Return-after-refund deadline inference ────────────────────────────────────

async function applyReturnDeadlineInference(dispute: any, txn: any): Promise<void> {
    const meta = dispute.metadata || {};
    const buyerShipped = !!meta.buyer_shipped_at;

    // Buyer didn't ship within the deadline → adverse inference: PAY_SELLER
    // Buyer shipped but seller hasn't confirmed within 48 h → PAY_SELLER (seller ghosting after return)
    let action = 'PAY_SELLER';
    let reason: string;

    if (!buyerShipped) {
        reason = 'The buyer did not return the goods within the required timeframe. Payment has been released to the seller.';
    } else {
        reason = 'The seller did not confirm receipt of the returned goods within the allowed time. As the buyer has provided shipping confirmation, the refund has been issued.';
        action = 'REFUND_BUYER';
    }

    const now = new Date().toISOString();

    await supabase.from('dispute_messages').insert({
        dispute_id: dispute.id,
        sender_type: 'AI',
        content: `✅ **Case Closed**\n\n${reason}\n\nFunds will be processed according to Safeeely's standard settlement terms.`
    });

    await supabase.from('disputes').update({
        status: 'RESOLVED',
        resolution: `SLA_ENFORCEMENT: ${action}`,
        resolved_at: now,
        evidence_deadline: null
    }).eq('id', dispute.id);

    const txnStatus = action === 'REFUND_BUYER' ? 'CANCELLED' : 'FINALIZED';
    await supabase.from('transactions').update({ status: txnStatus }).eq('id', txn.id);

    if (action === 'REFUND_BUYER') {
        await insertBuyerRefundCredit(dispute.id, txn, 'RETURN_CONFIRMED', 'SLA');
    } else {
        await finalizePaySeller(txn).catch((e: any) => console.error('❌ [enforcement] Milestone PAY_SELLER finalize failed:', e?.message || e));
    }

    const label = action === 'REFUND_BUYER' ? '✅ Refund issued to buyer' : '✅ Payment released to seller';
    await Promise.allSettled([txn.buyer, txn.seller].map(async (user: any) => {
        try {
            await routeNotification(
                user.id,
                `⚖️ <b>Case Closed</b>\n\n${reason}\n\n<b>Outcome:</b> ${label}`,
                async (platform, platformId) => [{ label: '👁️ View Case', url: await buildInternalMagicLink({ profileId: user.id, safetag: user.safetag, platform, platformId, scope: 'dispute', txnId: txn.id }) }],
                undefined,
                user.email ? () => sendDisputeResolvedEmail(user.email, {
                    safetag: user.safetag, product: txn.product_name,
                    txnCode: txn.txn_code, outcome: label, txnId: txn.id
                }) : undefined
            );
            recordNotification(user.id, 'dispute', '⚖️ Case Closed', `"${txn.product_name}" — ${label}`, {
                transaction_id: txn.id, dispute_id: dispute.id, link_url: `/dashboard/transactions/${txn.id}`
            }).catch(() => {});
        } catch { /* non-critical */ }
    }));

    console.log(`✅ [enforcement] Return deadline dispute ${dispute.id} closed — ${action}`);
}

// ── Adverse inference ─────────────────────────────────────────────────────────

async function applyAdverseInference(dispute: any, txn: any): Promise<void> {
    const restricted = dispute.restricted_to;

    // Who was supposed to respond but didn't?
    let action: string;
    let verdictReason: string;

    if (restricted === 'BUYER') {
        action = 'PAY_SELLER';
        verdictReason = 'The buyer did not provide the requested proof within the time allowed. Payment has been released to the seller.';
    } else if (restricted === 'SELLER') {
        action = 'REFUND_BUYER';
        verdictReason = 'The seller did not provide the requested proof within the time allowed. A refund has been issued to the buyer.';
    } else {
        action = 'PAY_SELLER';
        verdictReason = 'Neither party responded within the time allowed. Payment has been released to the seller as the default outcome.';
    }

    const systemMsg = `✅ **Case Closed**\n\n${verdictReason}\n\nFunds will be processed according to Safeeely's standard settlement terms.`;

    // Insert system verdict message
    await supabase.from('dispute_messages').insert({
        dispute_id: dispute.id,
        sender_type: 'AI',
        content: systemMsg
    });

    // Resolve dispute
    await supabase.from('disputes').update({
        status: 'RESOLVED',
        resolution: `SLA_ENFORCEMENT: ${action}`,
        resolved_at: new Date().toISOString(),
        evidence_deadline: null
    }).eq('id', dispute.id);

    // Update transaction status
    const txnStatus = action === 'REFUND_BUYER' ? 'CANCELLED'
        : action === 'SPLIT' ? 'RESOLVED_SPLIT'
        : 'FINALIZED';
    await supabase.from('transactions').update({ status: txnStatus }).eq('id', txn.id);

    // Insert buyer refund credit so admin knows money is owed back
    if (action === 'REFUND_BUYER') {
        await insertBuyerRefundCredit(dispute.id, txn, 'FULL', 'SLA');
    }

    // Seller wins via SLA — release any remaining milestone phases + run full
    // finalize side-effects for MILESTONE transactions; ONE_TIME keeps the
    // original referral-commissions-only behavior.
    if (action === 'PAY_SELLER') {
        await finalizePaySeller(txn).catch((e: any) => console.error('❌ [enforcement] Milestone PAY_SELLER finalize failed:', e?.message || e));
    }

    // Notify both parties
    const actionLabels: Record<string, string> = {
        REFUND_BUYER: '✅ Refund issued to buyer',
        PAY_SELLER: '✅ Payment released to seller',
        SPLIT: '⚖️ Payment split between parties'
    };
    const label = actionLabels[action] || action;

    await Promise.allSettled([txn.buyer, txn.seller].map(async (user: any) => {
        try {
            await routeNotification(
                user.id,
                `⚖️ <b>Case Closed</b>\n\n${verdictReason}\n\n<b>Outcome:</b> ${label}`,
                async (platform, platformId) => [{ label: '👁️ View Case', url: await buildInternalMagicLink({ profileId: user.id, safetag: user.safetag, platform, platformId, scope: 'dispute', txnId: txn.id }) }],
                undefined,
                user.email ? () => sendDisputeResolvedEmail(user.email, {
                    safetag: user.safetag, product: txn.product_name,
                    txnCode: txn.txn_code, outcome: label, txnId: txn.id
                }) : undefined
            );
            recordNotification(user.id, 'dispute', '⚖️ Case Closed', `"${txn.product_name}" — ${label}`, {
                transaction_id: txn.id, transaction_code: txn.txn_code,
                dispute_id: dispute.id, link_url: `/dashboard/transactions/${txn.id}`
            }).catch(() => {});
        } catch { /* non-critical */ }
    }));

    console.log(`✅ [enforcement] Dispute ${dispute.id} closed — ${action}`);
}

// ── Reminder notification ─────────────────────────────────────────────────────

async function sendReminder(dispute: any, txn: any, _level: 1 | 2, message: string): Promise<void> {
    const restricted = dispute.restricted_to;
    const targets: any[] = [];

    if (restricted === 'BUYER') targets.push(txn.buyer);
    else if (restricted === 'SELLER') targets.push(txn.seller);
    else targets.push(txn.buyer, txn.seller);

    await Promise.allSettled(targets.map(async (user: any) => {
        try {
            await routeNotification(
                user.id,
                message,
                async (platform, platformId) => [{ label: '📤 Send Proof Now', url: await buildInternalMagicLink({ profileId: user.id, safetag: user.safetag, platform, platformId, scope: 'dispute', txnId: txn.id }) }]
            );
        } catch { /* non-critical */ }
    }));
}
