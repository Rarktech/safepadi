import { supabase } from '@safepal/shared';

// How much of a transaction's escrowed amount is still un-released to the seller.
// For ONE_TIME transactions (or any transaction whose milestones aren't loaded)
// this is just the full amount, identical to today's behavior — only MILESTONE
// transactions with already-RELEASED phases ever return less than txn.amount.
export function getRemainingMilestoneEscrow(txn: any): number {
    const total = Number(txn?.amount) || 0;
    if (txn?.transaction_type !== 'MILESTONE') return total;

    if (!Array.isArray(txn?.milestones)) {
        console.warn(`⚠️ getRemainingMilestoneEscrow: milestones not loaded for txn ${txn?.id}, falling back to full amount`);
        return total;
    }

    const released = txn.milestones
        .filter((m: any) => m.status === 'RELEASED')
        .reduce((sum: number, m: any) => sum + Number(m.amount), 0);

    return Math.max(0, total - released);
}

// Flips every non-RELEASED milestone of a transaction to RELEASED. Used when a
// dispute resolves PAY_SELLER on a MILESTONE transaction — mirrors the existing
// confirm_receipt cascade in transactions.ts so the seller's on-demand balance
// (which only sums RELEASED rows) actually reflects the full payout.
export async function releaseRemainingMilestones(transactionId: string): Promise<void> {
    await supabase
        .from('transaction_milestones')
        .update({ status: 'RELEASED', updated_at: new Date().toISOString() })
        .eq('transaction_id', transactionId)
        .neq('status', 'RELEASED');
}
