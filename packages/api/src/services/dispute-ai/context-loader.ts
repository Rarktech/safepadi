import { supabase } from '@safepal/shared';
import type { DisputeContext, ReputationContext, FraudPattern } from './types';
import { loadActiveSops } from './memory/sop-repository';

const DEFAULT_REPUTATION: Omit<ReputationContext, 'profile_id'> = {
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

async function getReputation(profileId: string): Promise<ReputationContext> {
    const { data } = await supabase
        .from('profile_reputation')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();

    if (data) {
        return {
            ...data,
            fraud_flags: Array.isArray(data.fraud_flags) ? data.fraud_flags : []
        };
    }

    // Upsert default row so it exists for future updates
    await supabase
        .from('profile_reputation')
        .upsert({ profile_id: profileId, ...DEFAULT_REPUTATION }, { onConflict: 'profile_id', ignoreDuplicates: true });

    return { profile_id: profileId, ...DEFAULT_REPUTATION };
}

async function getFraudPatterns(disputeType: string, limit = 5): Promise<FraudPattern[]> {
    const { data } = await supabase
        .from('dispute_forensic_memory')
        .select('pattern_name, description, indicators, counter_evidence_needed, severity')
        .in('dispute_type', [disputeType, 'GLOBAL'])
        .order('confirmed_fraud_count', { ascending: false })
        .limit(limit);

    return (data || []) as FraudPattern[];
}

export async function loadDisputeContext(disputeId: string): Promise<DisputeContext> {
    // 1. Dispute + transaction + profiles
    const { data: dispute, error: dErr } = await supabase
        .from('disputes')
        .select(`
            id, reason, status, dispute_type, pipeline_tier, milestone_id,
            critic_iterations, critic_max_iterations, restricted_to, ai_rounds,
            transactions (
                id, product_name, description, amount, currency, status, transaction_type,
                buyer_id, seller_id,
                buyer:profiles!transactions_buyer_id_fkey(id, safetag),
                seller:profiles!transactions_seller_id_fkey(id, safetag)
            )
        `)
        .eq('id', disputeId)
        .single();

    if (dErr || !dispute) throw new Error(`Dispute ${disputeId} not found`);

    const txn = (dispute as any).transactions;
    const disputeType = dispute.dispute_type || 'GENERIC';

    // 2. Last 20 messages
    const { data: messages } = await supabase
        .from('dispute_messages')
        .select('id, sender_id, sender_type, content, attachments, created_at, evidence_tier, evidence_tags')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

    const history = messages || [];
    const historyWindow = history.slice(-20);

    // 3. Latest user message attachments (for multimodal)
    const lastUserMsg = [...history].reverse().find(m => m.sender_type === 'USER');
    const latestAttachments = lastUserMsg?.attachments || [];

    // 4. Reputation (parallel)
    const [buyerReputation, sellerReputation] = await Promise.all([
        getReputation(txn.buyer_id),
        getReputation(txn.seller_id)
    ]);

    // 5. Active SOPs for this dispute type (parallel)
    const [investigatorSops, judgeSops, fraudPatterns] = await Promise.all([
        loadActiveSops(disputeType, 'INVESTIGATOR', 8),
        loadActiveSops(disputeType, 'JUDGE', 8),
        getFraudPatterns(disputeType, 5)
    ]);

    // Merge SOPs deduplicated by sop_code
    const sopMap = new Map<string, typeof investigatorSops[0]>();
    for (const s of [...investigatorSops, ...judgeSops]) sopMap.set(s.sop_code, s);
    const activeSops = Array.from(sopMap.values());

    // 6. Milestone context (Safeeely enhancement)
    let milestones = undefined;
    if (txn.transaction_type === 'MILESTONE') {
        const { data: ms } = await supabase
            .from('transaction_milestones')
            .select('id, index_num, title, amount, status, proof_url')
            .eq('transaction_id', txn.id)
            .order('index_num', { ascending: true });
        milestones = ms || undefined;
    }

    // 7. Platform identities (Safeeely enhancement — for personalised evidence requests)
    const [buyerLinked, sellerLinked] = await Promise.all([
        supabase.from('linked_accounts').select('platform, platform_id').eq('profile_id', txn.buyer_id).eq('is_primary', true).maybeSingle(),
        supabase.from('linked_accounts').select('platform, platform_id').eq('profile_id', txn.seller_id).eq('is_primary', true).maybeSingle()
    ]);

    return {
        dispute: {
            id: dispute.id,
            reason: dispute.reason,
            status: dispute.status,
            dispute_type: disputeType,
            pipeline_tier: (dispute.pipeline_tier || 'STANDARD') as any,
            critic_iterations: dispute.critic_iterations || 0,
            critic_max_iterations: dispute.critic_max_iterations || 2,
            restricted_to: dispute.restricted_to || 'ALL',
            ai_rounds: dispute.ai_rounds || 0,
            flagged_milestone_id: (dispute as any).milestone_id || null
        },
        transaction: {
            id: txn.id,
            product_name: txn.product_name,
            description: txn.description,
            amount: txn.amount,
            currency: txn.currency,
            status: txn.status,
            transaction_type: txn.transaction_type || 'ONE_TIME',
            buyer: txn.buyer,
            seller: txn.seller,
            buyer_id: txn.buyer_id,
            seller_id: txn.seller_id
        },
        milestones,
        history: historyWindow,
        buyerReputation,
        sellerReputation,
        activeSops,
        fraudPatterns,
        buyerPlatform: buyerLinked.data?.platform,
        buyerPlatformId: buyerLinked.data?.platform_id,
        sellerPlatform: sellerLinked.data?.platform,
        sellerPlatformId: sellerLinked.data?.platform_id,
        latestAttachments
    };
}
