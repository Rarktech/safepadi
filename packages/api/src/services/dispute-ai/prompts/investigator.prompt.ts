import type { DisputeContext } from '../types';
import { DISPUTE_TYPES, EVIDENCE_HOW_TO } from '../config/disputeTypes';

function buildReputationBlock(ctx: DisputeContext): string {
    const b = ctx.buyerReputation;
    const s = ctx.sellerReputation;

    const buyerFlags = b.fraud_flags.length > 0 ? ` ⚠️ FLAGS: ${b.fraud_flags.join(', ')}` : '';
    const sellerFlags = s.fraud_flags.length > 0 ? ` ⚠️ FLAGS: ${s.fraud_flags.join(', ')}` : '';

    let rules = '';
    if (b.trust_score < 30 || b.fraud_flags.includes('DOUBLE_DIP_ATTEMPT')) {
        rules += `\n• BUYER has low trust or fraud flags — require Tier 1 evidence (no screenshots alone) for all buyer claims. Apply 1.5× burden multiplier.`;
    }
    if (s.trust_score < 30 || s.fraud_flags.includes('DOUBLE_DIP_ATTEMPT')) {
        rules += `\n• SELLER has low trust or fraud flags — require Tier 1 evidence for all seller claims. Apply 1.5× burden multiplier.`;
    }

    return `REPUTATION CONTEXT:
Buyer (@${ctx.transaction.buyer.safetag}): trust_score=${b.trust_score}, raised=${b.disputes_raised_count}, lost_as_buyer=${b.disputes_lost_as_buyer}${buyerFlags}
Seller (@${ctx.transaction.seller.safetag}): trust_score=${s.trust_score}, raised=${s.disputes_raised_count}, lost_as_seller=${s.disputes_lost_as_seller}${sellerFlags}${rules}`;
}

function buildSopBlock(ctx: DisputeContext): string {
    const investigatorSops = ctx.activeSops.filter(s =>
        s.applies_to_agent === 'INVESTIGATOR' || s.applies_to_agent === 'ALL'
    );
    if (investigatorSops.length === 0) return '';

    return `ACTIVE STANDING ORDERS (follow these rules without exception):
${investigatorSops.map(s => `[${s.sop_code} — ${s.severity}] ${s.title}: ${s.rule_body}`).join('\n')}`;
}

function buildFraudPatternsBlock(ctx: DisputeContext): string {
    if (ctx.fraudPatterns.length === 0) return '';
    return `KNOWN FRAUD PATTERNS TO WATCH FOR:
${ctx.fraudPatterns.map(p =>
    `• [${p.severity}] ${p.pattern_name}: ${p.description}`
).join('\n')}`;
}

function buildEvidenceChecklist(disputeType: string): string {
    const config = DISPUTE_TYPES[disputeType as keyof typeof DISPUTE_TYPES];
    if (!config) return '';

    const howTo = EVIDENCE_HOW_TO[disputeType] || {};
    const items = config.tier1Evidence.map(key => {
        const path = howTo[key];
        return path ? `• ${key}: ${path}` : `• ${key}`;
    }).join('\n');

    return `EVIDENCE CHECKLIST FOR ${disputeType}:
Default burden: ${config.defaultBurden} (${config.burdenReason})
Required Tier 1 evidence:
${items}`;
}

function buildPlatformIdentitiesBlock(ctx: DisputeContext): string {
    if (!ctx.buyerPlatformId && !ctx.sellerPlatformId) return '';
    return `KNOWN PLATFORM IDENTITIES (use these in evidence instructions — no generic "the buyer"):
${ctx.buyerPlatformId ? `Buyer's primary platform: ${ctx.buyerPlatform} | ID: ${ctx.buyerPlatformId}` : ''}
${ctx.sellerPlatformId ? `Seller's primary platform: ${ctx.sellerPlatform} | ID: ${ctx.sellerPlatformId}` : ''}`;
}

function buildMilestoneBlock(ctx: DisputeContext): string {
    if (!ctx.milestones || ctx.milestones.length === 0) return '';

    const totalAmount = ctx.milestones.reduce((sum, m) => sum + Number(m.amount), 0);
    const completedValue = ctx.milestones
        .filter(m => m.status === 'COMPLETED' || m.status === 'RELEASED')
        .reduce((sum, m) => sum + Number(m.amount), 0);
    const completionPct = totalAmount > 0 ? Math.round((completedValue / totalAmount) * 100) : 0;

    const lines = ctx.milestones.map(m =>
        `  - [${m.index_num}] "${m.title}" [${m.status}] — ${ctx.transaction.currency} ${m.amount}`
    ).join('\n');

    return `MILESTONE TRANSACTION CONTEXT:
${lines}
Completion: ${completionPct}% by value (${ctx.transaction.currency} ${completedValue} of ${totalAmount} delivered)`;
}

export function buildInvestigatorPrompt(ctx: DisputeContext): string {
    const totalMessages = ctx.history.length;
    const isFirstMessage = totalMessages <= 1;

    return `You are "The Investigator" — Safeeely's neutral AI mediator. Your job is to gather evidence with forensic precision so that a fair verdict can be rendered. You are objective, firm, and specific.

TRANSACTION:
Product: ${ctx.transaction.product_name}
Amount: ${ctx.transaction.amount} ${ctx.transaction.currency}
Buyer: @${ctx.transaction.buyer.safetag}
Seller: @${ctx.transaction.seller.safetag}
${ctx.transaction.description ? `Description: ${ctx.transaction.description}` : ''}

DISPUTE TYPE: ${ctx.dispute.dispute_type}
DISPUTE REASON: ${ctx.dispute.reason}

${buildMilestoneBlock(ctx)}

${buildReputationBlock(ctx)}

${buildEvidenceChecklist(ctx.dispute.dispute_type)}

${buildSopBlock(ctx)}

${buildFraudPatternsBlock(ctx)}

${buildPlatformIdentitiesBlock(ctx)}

${totalMessages > 20 ? `[Earlier messages omitted — showing last 20 of ${totalMessages}]\n` : ''}CHAT HISTORY:
${ctx.history.map(m => {
    const who = m.sender_type === 'AI' ? 'Safeeely AI' : m.sender_id;
    const tier = m.evidence_tier ? ` [Evidence Tier ${m.evidence_tier}]` : '';
    return `${who}: ${m.content}${tier} [Attachments: ${m.attachments?.length || 0}]`;
}).join('\n')}

BREVITY RULE: The user_facing_message is posted directly in a chat app. Write it like a sharp legal clerk — no greetings, no "I hope to", no closing lines, no paragraph intros. Lead with the action, follow with navigation steps. Max 80 words.

TASK:
1. Summarize the dispute facts in 2-3 neutral sentences.
2. Assess any evidence already provided: what tier is it? What does it prove?
3. Identify the SINGLE most important missing piece of evidence that blocks judgment. For each, provide:
   - The platform-specific navigation path (use KNOWN PLATFORM IDENTITIES above if available)
   - Why exactly this evidence is needed
   - Whether it blocks judgment completely
4. If ${isFirstMessage ? 'this is the opening message' : 'you still need evidence'}, ask the specific party for it.
5. If all evidence needed for a fair ruling is present, set facts_complete to true.

QUALITY GATE (run internally before emitting JSON):
Score your output 0-100 on: (a) Every evidence request has a specific platform navigation path, not generic instructions. (b) Burden assignment matches the dispute type rules above. (c) You are not asking for evidence already provided. If score < 90, rewrite first.

OUTPUT FORMAT — respond with ONLY this JSON object, no prose:
{
  "facts_summary": "<2-3 neutral sentences>",
  "evidence_tier_assessment": [
    {"message_id": "<uuid>", "tier": 1, "tags": ["TAG1", "TAG2"]}
  ],
  "missing_evidence": [
    {
      "from": "BUYER|SELLER",
      "evidence_name": "<short name>",
      "how_to_path": "<exact platform navigation>",
      "why_needed": "<one sentence>",
      "blocks_judgment": true
    }
  ],
  "self_score": 95,
  "facts_complete": false,
  "restrict_to": "BUYER|SELLER|ALL",
  "user_facing_message": "<message posted directly in chat — max 80 words, no preamble or sign-off. One sentence stating what is needed, then a bullet list (max 3 items) of exactly what to upload and where to find it. Use **bold** only for the action label.>"
}`;
}
