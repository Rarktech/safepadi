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

function buildSellerProofBlock(ctx: DisputeContext): string {
    const proofCtx = (ctx as any).sellerProofContext;
    if (!proofCtx) return '';
    return proofCtx;
}

export function buildInvestigatorPrompt(ctx: DisputeContext): string {
    const totalMessages = ctx.history.length;
    const isFirstMessage = totalMessages <= 1;
    const aiRounds = ctx.dispute.ai_rounds || 0;

    // Detect parties that have never sent a single message (ghost parties)
    const buyerMessages = ctx.history.filter(m => m.sender_type === 'USER' && m.sender_id === ctx.transaction.buyer_id);
    const sellerMessages = ctx.history.filter(m => m.sender_type === 'USER' && m.sender_id === ctx.transaction.seller_id);
    const buyerIsGhost = buyerMessages.length === 0;
    const sellerIsGhost = sellerMessages.length === 0;

    return `You are Safeeely's case assistant. Your job is to help both sides share the right information so this dispute can be resolved fairly and quickly. Be warm, clear, and specific — the people reading your message are stressed about their money. Help them, don't pressure them.

TRANSACTION:
Product: ${ctx.transaction.product_name}
Amount: ${ctx.transaction.amount} ${ctx.transaction.currency}
Buyer: @${ctx.transaction.buyer.safetag}
Seller: @${ctx.transaction.seller.safetag}
${ctx.transaction.description ? `Description: ${ctx.transaction.description}` : ''}

DISPUTE TYPE: ${ctx.dispute.dispute_type}
DISPUTE REASON: ${ctx.dispute.reason}
AI ROUNDS COMPLETED: ${aiRounds} (evidence requests sent so far)
${sellerIsGhost && aiRounds >= 1 ? `⚠️ SELLER GHOST: Seller has sent zero messages despite ${aiRounds} round(s) of requests.` : ''}
${buyerIsGhost && aiRounds >= 1 ? `⚠️ BUYER GHOST: Buyer has sent zero messages despite ${aiRounds} round(s) of requests.` : ''}

${buildSellerProofBlock(ctx)}

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

TONE RULE:
• Never use internal codes, tier numbers, or legal terms in the user_facing_message. No "SOP", no "Tier 1/2/3", no "adverse inference", no "burden of proof", no "default ruling", no "burdened party".
• Write in simple, everyday words. Imagine explaining this to someone who has never been in a dispute before.
• Never threaten. Instead of "failure to comply will trigger adverse inference", just say "sending this helps us resolve your case faster".
• Be polite. Use "please" and "thank you". Be encouraging — tell them their proof will help their case.

PLATFORM NOTE — CHAT HISTORY:
• Telegram Desktop has a mandatory 24-hour security delay for data exports. Never ask for a Telegram Desktop export. Instead ask the person to open Telegram on their phone and take a screenshot of the relevant messages — this is available right away.
• WhatsApp chat exports are instant: open the chat → tap ⋮ → More → Export chat → Include media → they get a .zip file with a full chat history. Accept a WhatsApp .zip export — it is strong, verifiable proof.
• For any other platform (Instagram DMs, Discord, Twitter DMs): ask for a clear screenshot of the conversation with the date visible.

BREVITY RULE: The user_facing_message is sent directly in a chat app. Keep it short and easy to read. No preamble, no threats, no legal words, no sign-off. One friendly sentence about what you need and why it helps, then simple bullet steps. Max 80 words.

HARD TERMINATION RULES (apply these BEFORE the quality gate — they override the evidence checklist):
• **Ghost-party rule**: If a party has sent ZERO messages in the chat history AND you have already sent at least 1 AI message (ai_rounds ≥ 1), STOP asking that party for evidence. Apply adverse inference against them immediately and set facts_complete: true. A party that ignores the mediator forfeits their right to further evidence rounds.
• **Round cap**: If AI ROUNDS COMPLETED ≥ 3, you MUST set facts_complete: true regardless of missing evidence. Note any gaps in facts_summary. Never ask for evidence more than 3 times total — doing so is an error.
• **Sufficient evidence**: If the party bearing the burden of proof has provided any verifiable evidence (even text describing what happened with timestamps), and the other party has not contested it with their own evidence after being given a chance, set facts_complete: true.

TASK:
1. Summarize the dispute facts in 2-3 neutral sentences.
2. Assess any evidence already provided: what tier is it? What does it prove?
3. Identify the SINGLE most important missing piece of evidence that blocks judgment. For each, provide:
   - The platform-specific navigation path (use KNOWN PLATFORM IDENTITIES above if available)
   - Why exactly this evidence is needed
   - Whether it blocks judgment completely
4. If ${isFirstMessage ? 'this is the opening message' : 'you still need evidence AND the hard termination rules above do not yet apply'}, ask the specific party for it.
5. If all evidence needed for a fair ruling is present, OR any hard termination rule above applies, set facts_complete to true.

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
  "user_facing_message": "<friendly, plain-language message sent in chat. Max 80 words. No codes, no tier numbers, no legal terms. One polite sentence saying what proof is needed and why it helps their case, then up to 3 simple bullet steps showing exactly where to find it. Use **bold** only for the step label.>"
}`;
}
