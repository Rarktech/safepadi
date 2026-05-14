export interface SeedSOP {
    sop_code: string;
    title: string;
    rule_body: string;
    dispute_type: string;
    applies_to_agent: string;
    severity: 'ADVISORY' | 'BINDING' | 'HARD_GATE';
    priority: number;
    human_approved: boolean;
}

export const BOOTSTRAP_SOPS: SeedSOP[] = [
    {
        sop_code: 'SOP-GLOBAL-DIGITAL-DOUBLE-DIP-001',
        title: 'Digital Account: No-Active-Session Required Before Refund',
        rule_body: 'Step 1: For digital account disputes, request the buyer\'s no-active-session export (platform Settings → Active Sessions/Devices) immediately when the dispute is raised. Step 2: REFUND_BUYER MUST NOT be issued if the buyer cannot produce a no-active-session export dated after the dispute was raised.',
        dispute_type: 'GLOBAL',
        applies_to_agent: 'ALL',
        severity: 'HARD_GATE',
        priority: 95,
        human_approved: true
    },
    {
        sop_code: 'SOP-GLOBAL-DIGITAL-OGE-001',
        title: 'Digital Account: Original Account Email Transfer Required',
        rule_body: 'Step 1: Require seller proof that the Original Account Email (OGE/recovery email) was transferred to buyer — not just the password. Step 2: Without OGE transfer proof, PAY_SELLER only if buyer confirms initial access AND currently has an active session.',
        dispute_type: 'GLOBAL',
        applies_to_agent: 'ALL',
        severity: 'BINDING',
        priority: 90,
        human_approved: true
    },
    {
        sop_code: 'SOP-IG-2HOUR-RULE-001',
        title: 'Instagram: Confirmed Initial Access Transfers Risk',
        rule_body: 'Step 1: If buyer confirmed initial access to the Instagram account, any subsequent reclamation claim requires OGE email proof showing the recovery email was reclaimed by the seller. Step 2: Without OGE reclamation proof, default to PAY_SELLER — buyer assumed responsibility upon confirmed access.',
        dispute_type: 'INSTAGRAM_ACCOUNT',
        applies_to_agent: 'JUDGE',
        severity: 'BINDING',
        priority: 88,
        human_approved: true
    },
    {
        sop_code: 'SOP-GLOBAL-GHOSTING-001',
        title: 'Global: Non-Response Default Judgment',
        rule_body: 'Step 1: If the party bearing the burden of proof does not respond to AI questions for more than 24 hours, post a Default Warning in the dispute chat. Step 2: If still no response after 48 hours total, the SLA timeout resolution applies — silence is treated as concession.',
        dispute_type: 'GLOBAL',
        applies_to_agent: 'INVESTIGATOR',
        severity: 'BINDING',
        priority: 85,
        human_approved: true
    },
    {
        sop_code: 'SOP-FREELANCE-SCOPE-001',
        title: 'Freelance: Scope Creep vs. Defect Distinction',
        rule_body: 'Step 1: Request the original written brief or scope document from the dispute raiser. Step 2: Disputes citing defects or missing features not listed in the original brief are classified as scope creep — default to PAY_SELLER for work that matches the brief.',
        dispute_type: 'FREELANCE_CODE',
        applies_to_agent: 'JUDGE',
        severity: 'BINDING',
        priority: 82,
        human_approved: true
    },
    {
        sop_code: 'SOP-GLOBAL-TIER3-ONLY-001',
        title: 'Global: Tier 3 Evidence Alone Is Insufficient',
        rule_body: 'Step 1: If the burdened party submits only Tier 3 evidence (screenshots, written statements), issue one specific Tier 1 evidence request with a 24-hour deadline. Step 2: If only Tier 3 evidence is still present after the deadline, apply Adverse Inference against the burdened party.',
        dispute_type: 'GLOBAL',
        applies_to_agent: 'INVESTIGATOR',
        severity: 'BINDING',
        priority: 80,
        human_approved: true
    },
    {
        sop_code: 'SOP-CRYPTO-TX-001',
        title: 'Crypto: On-Chain TX Hash Is Definitive',
        rule_body: 'Step 1: Require the transaction hash from the sending party. Step 2: If the hash is confirmed on-chain and the recipient address matches the agreed address, PAY_SELLER regardless of buyer claims — blockchain records supersede all other evidence.',
        dispute_type: 'CRYPTO_TO_GOODS',
        applies_to_agent: 'JUDGE',
        severity: 'HARD_GATE',
        priority: 93,
        human_approved: true
    },
    {
        sop_code: 'SOP-PHYSICAL-POD-001',
        title: 'Physical Goods: Proof of Delivery Standard',
        rule_body: 'Step 1: Request carrier API tracking status and signed Proof of Delivery from the seller. Step 2: Confirmed POD with recipient signature = PAY_SELLER; disputed POD without signature = request unboxing video from buyer within 24 hours.',
        dispute_type: 'PHYSICAL_GOODS',
        applies_to_agent: 'JUDGE',
        severity: 'BINDING',
        priority: 82,
        human_approved: true
    },
    {
        sop_code: 'SOP-GLOBAL-FRAUD-FLAG-001',
        title: 'Global: Enhanced Evidence Standard for Flagged Parties',
        rule_body: 'Step 1: If either party carries a DOUBLE_DIP_ATTEMPT fraud flag, require Tier 1 evidence for all claims — Tier 3 is automatically disqualified for that party. Step 2: Any newly verified fraud attempt adds DOUBLE_DIP_ATTEMPT to that party\'s fraud_flags.',
        dispute_type: 'GLOBAL',
        applies_to_agent: 'ALL',
        severity: 'HARD_GATE',
        priority: 91,
        human_approved: true
    },
    {
        sop_code: 'SOP-GLOBAL-SPLIT-MANDATE-001',
        title: 'Global: Split Verdicts Require Documented Partial Delivery',
        rule_body: 'Step 1: SPLIT verdicts must reference specific documented partial delivery — not issued arbitrarily "to be fair". Step 2: The split percentage must correspond to the objectively documented delivered portion; for milestone transactions, use the completed milestone value ratio.',
        dispute_type: 'GLOBAL',
        applies_to_agent: 'JUDGE',
        severity: 'BINDING',
        priority: 78,
        human_approved: true
    },
    {
        sop_code: 'SOP-DISCORD-SESSION-001',
        title: 'Discord Account: Active Sessions Proof Required from Seller',
        rule_body: 'Step 1: Require seller to upload a screenshot of User Settings → Devices showing zero active devices on their end after the transfer. Step 2: If seller cannot show zero active devices, PAY_SELLER MUST NOT be issued — seller may still hold functional access.',
        dispute_type: 'DISCORD_ACCOUNT',
        applies_to_agent: 'INVESTIGATOR',
        severity: 'BINDING',
        priority: 84,
        human_approved: true
    },
    {
        sop_code: 'SOP-TELEGRAM-SESSION-001',
        title: 'Telegram Account: Dual-Session Risk',
        rule_body: 'Step 1: Require seller to upload Settings → Active Sessions screenshot showing no sessions tied to their device. Step 2: If seller retains an active Telegram session, treat as SELLER_HAS_FUNCTIONAL_UTILITY and apply the Deprivation Rule.',
        dispute_type: 'TELEGRAM_ACCOUNT',
        applies_to_agent: 'INVESTIGATOR',
        severity: 'BINDING',
        priority: 83,
        human_approved: true
    },
    {
        sop_code: 'SOP-FREELANCE-DESIGN-SCOPE-001',
        title: 'Freelance Design: Scope Creep Standard',
        rule_body: 'Step 1: Request the original creative brief from the dispute raiser. Step 2: If the complaint cites revisions or features outside the original brief, classify as scope creep — default to PAY_SELLER; buyer must pay separately for extra scope.',
        dispute_type: 'FREELANCE_DESIGN',
        applies_to_agent: 'JUDGE',
        severity: 'ADVISORY',
        priority: 70,
        human_approved: true
    },
    {
        sop_code: 'SOP-SOCIAL-METRICS-001',
        title: 'Social Service: Before/After Analytics Required',
        rule_body: 'Step 1: Require seller to provide timestamped before/after analytics screenshots from the platform (Instagram Insights, YouTube Studio, etc.) showing baseline and post-delivery metrics. Step 2: If followers/views dropped within 14 days, treat as bot-delivered — adjust verdict toward REFUND_BUYER proportionally.',
        dispute_type: 'SOCIAL_SERVICE',
        applies_to_agent: 'INVESTIGATOR',
        severity: 'BINDING',
        priority: 75,
        human_approved: true
    },
    {
        sop_code: 'SOP-MILESTONE-SPLIT-001',
        title: 'Milestone Transaction: Pro-Rata Split Standard',
        rule_body: 'Step 1: For milestone transactions, calculate the ratio of COMPLETED + RELEASED milestones to total milestones by value (not count). Step 2: Default SPLIT verdict must use this ratio unless completed milestones have documented defects — never issue REFUND_BUYER for already-RELEASED milestones.',
        dispute_type: 'GLOBAL',
        applies_to_agent: 'JUDGE',
        severity: 'BINDING',
        priority: 86,
        human_approved: true
    }
];
