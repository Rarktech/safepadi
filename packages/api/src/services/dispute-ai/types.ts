export interface TransactionMilestone {
    id: string;
    index_num: number;
    title: string;
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'RELEASED';
    proof_url?: string | null;
}

export interface ReputationContext {
    profile_id: string;
    trust_score: number;
    disputes_raised_count: number;
    disputes_against_count: number;
    disputes_won_as_buyer: number;
    disputes_lost_as_buyer: number;
    disputes_won_as_seller: number;
    disputes_lost_as_seller: number;
    ghosted_count: number;
    fraud_flags: string[];
}

export interface ActiveSOP {
    id: string;
    sop_code: string;
    title: string;
    rule_body: string;
    severity: 'ADVISORY' | 'BINDING' | 'HARD_GATE';
    applies_to_agent: string;
}

export interface FraudPattern {
    pattern_name: string;
    description: string;
    indicators: { keywords?: string[]; image_signals?: string[]; red_flags?: string[] };
    counter_evidence_needed: Record<string, string>;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DisputeMessage {
    id: string;
    sender_id: string | null;
    sender_type: 'USER' | 'AI';
    content: string;
    attachments: any[];
    created_at: string;
    evidence_tier?: number | null;
    evidence_tags?: string[] | null;
}

export interface DisputeContext {
    dispute: {
        id: string;
        reason: string;
        status: string;
        dispute_type: string;
        pipeline_tier: 'LITE' | 'STANDARD' | 'CONSTITUTIONAL';
        critic_iterations: number;
        critic_max_iterations: number;
        restricted_to: string;
        ai_rounds: number;
    };
    transaction: {
        id: string;
        product_name: string;
        description?: string | null;
        amount: number;
        currency: string;
        status: string;
        transaction_type: 'ONE_TIME' | 'MILESTONE';
        buyer: { id: string; safetag: string };
        seller: { id: string; safetag: string };
        buyer_id: string;
        seller_id: string;
    };
    milestones?: TransactionMilestone[];
    history: DisputeMessage[];
    buyerReputation: ReputationContext;
    sellerReputation: ReputationContext;
    activeSops: ActiveSOP[];
    fraudPatterns: FraudPattern[];
    // Safeeely-specific: known platform identities for personalised evidence requests
    buyerPlatform?: string;
    buyerPlatformId?: string;
    sellerPlatform?: string;
    sellerPlatformId?: string;
    latestAttachments: any[];
}

export interface EvidenceTierItem {
    message_id: string;
    tier: 1 | 2 | 3;
    tags: string[];
}

export interface MissingEvidence {
    from: 'BUYER' | 'SELLER';
    evidence_name: string;
    how_to_path: string;
    why_needed: string;
    blocks_judgment: boolean;
}

export interface InvestigatorOutput {
    facts_summary: string;
    evidence_tier_assessment: EvidenceTierItem[];
    missing_evidence: MissingEvidence[];
    self_score: number;
    facts_complete: boolean;
    restrict_to: 'BUYER' | 'SELLER' | 'ALL';
    user_facing_message: string;
}

export interface JudgeOutput {
    action: 'REFUND_BUYER' | 'PAY_SELLER' | 'SPLIT';
    split_pct_buyer: number;
    verdict_summary: string;
    reasoning: string;
    utility_location: 'BUYER_HAS_FUNCTIONAL_UTILITY' | 'SELLER_HAS_FUNCTIONAL_UTILITY' | 'NEUTRALIZED_OR_CONTESTED';
    utility_evidence_refs: string[];
    burden_of_proof_status: {
        assigned_to: 'BUYER' | 'SELLER' | 'BOTH';
        assigned_to_reason: string;
        met: boolean;
        adjustment_factor: number;
        adjustment_reason: string;
    };
    conflicting_evidence_resolution: Array<{
        conflict: string;
        ruled_in_favor_of: string;
        rule_applied: string;
    }>;
    fallacy_check: {
        sunk_cost_detected: boolean;
        appeal_to_pity_detected: boolean;
        false_equivalence_detected: boolean;
        notes: string;
    };
    precedence_check: {
        sops_consulted: string[];
        binding_sops_applied: string[];
        deviation_from_precedent: boolean;
        deviation_justification: string;
    };
    double_dip_check: {
        applicable: boolean;
        risk_present: boolean;
        mitigation: string;
    };
    clean_hands: {
        buyer_clean: boolean;
        seller_clean: boolean;
        adverse_inference_triggered_against: string | null;
    };
}

export interface CriticFailure {
    check: string;
    severity: 'BLOCKING' | 'WARNING';
    explanation: string;
    remediation_hint: string;
}

export interface CriticOutput {
    verdict: 'APPROVED' | 'REJECTED';
    failures: CriticFailure[];
    confidence: number;
}

export interface ClassifierOutput {
    dispute_type: string;
    pipeline_tier: 'LITE' | 'STANDARD' | 'CONSTITUTIONAL';
}

export interface AIDisputeResult {
    type: 'VERDICT' | 'QUESTION' | 'ESCALATE' | 'ERROR';
    content: string;
    action?: string;
    split_pct_buyer?: number;
    restrict?: string;
}
