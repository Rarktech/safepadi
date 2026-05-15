import { supabase } from '@safepal/shared';
import { routeNotification, recordNotification } from '../services/notifications';
import { sendDisputeResolvedEmail } from '../services/email';

const REVIEWS_URL = process.env.REVIEWS_URL || 'https://safeeely.com';

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
        processEvidenceDeadlines(now)
    ]);
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
            id, restricted_to, evidence_deadline,
            reminder_1_sent, reminder_2_sent,
            transaction:transactions(
                id, txn_code, product_name, amount, currency,
                buyer:buyer_id(id, safetag, email),
                seller:seller_id(id, safetag, email)
            )
        `)
        .eq('status', 'OPEN')
        .eq('is_ai_paused', false)
        .not('evidence_deadline', 'is', null);

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

    // Notify both parties
    const actionLabels: Record<string, string> = {
        REFUND_BUYER: '✅ Refund issued to buyer',
        PAY_SELLER: '✅ Payment released to seller',
        SPLIT: '⚖️ Payment split between parties'
    };
    const label = actionLabels[action] || action;

    await Promise.allSettled([txn.buyer, txn.seller].map(async (user: any) => {
        try {
            const disputeUrl = `${REVIEWS_URL}/withdraw/${encodeURIComponent(user.safetag)}?view=dispute_details&txnId=${txn.id}`;
            await routeNotification(
                user.id,
                `⚖️ <b>Case Closed</b>\n\n${verdictReason}\n\n<b>Outcome:</b> ${label}`,
                [{ label: '👁️ View Case', url: disputeUrl }],
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
            const disputeUrl = `${REVIEWS_URL}/withdraw/${encodeURIComponent(user.safetag)}?view=dispute_details&txnId=${txn.id}`;
            await routeNotification(
                user.id,
                message,
                [{ label: '📤 Send Proof Now', url: disputeUrl }]
            );
        } catch { /* non-critical */ }
    }));
}
