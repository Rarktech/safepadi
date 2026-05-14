import type { DisputeContext, InvestigatorOutput } from '../types';

function buildSopBlock(ctx: DisputeContext): string {
    const judgeSops = ctx.activeSops.filter(s =>
        s.applies_to_agent === 'JUDGE' || s.applies_to_agent === 'ALL'
    );
    if (judgeSops.length === 0) return '';

    const hardGate = judgeSops.filter(s => s.severity === 'HARD_GATE');
    const binding = judgeSops.filter(s => s.severity === 'BINDING');

    let block = 'STANDING ORDERS (binding constitutional rules):\n';
    if (hardGate.length > 0) {
        block += `\nHARD GATES (must be satisfied before any verdict):\n`;
        block += hardGate.map(s => `[${s.sop_code}] ${s.rule_body}`).join('\n');
    }
    if (binding.length > 0) {
        block += `\n\nBINDING RULES:\n`;
        block += binding.map(s => `[${s.sop_code}] ${s.rule_body}`).join('\n');
    }
    return block;
}

function buildBurdenBlock(ctx: DisputeContext): string {
    const b = ctx.buyerReputation;
    const s = ctx.sellerReputation;
    const adjustments: string[] = [];

    if (b.trust_score < 30) adjustments.push(`Buyer trust_score=${b.trust_score} < 30 → ×1.5 burden multiplier on BUYER claims`);
    if (b.fraud_flags.includes('DOUBLE_DIP_ATTEMPT')) adjustments.push(`Buyer has DOUBLE_DIP_ATTEMPT flag → ×2.0 burden multiplier on BUYER claims`);
    if (b.disputes_lost_as_buyer > b.disputes_won_as_buyer * 2) adjustments.push(`Buyer loss ratio high → ×1.3 burden multiplier`);
    if (b.ghosted_count > 2) adjustments.push(`Buyer ghosted ${b.ghosted_count} times → ×1.25 burden multiplier`);
    if (s.trust_score < 30) adjustments.push(`Seller trust_score=${s.trust_score} < 30 → ×1.5 burden multiplier on SELLER claims`);
    if (s.fraud_flags.includes('DOUBLE_DIP_ATTEMPT')) adjustments.push(`Seller has DOUBLE_DIP_ATTEMPT flag → ×2.0 burden multiplier on SELLER claims`);

    return adjustments.length > 0
        ? `BURDEN ADJUSTMENTS:\n${adjustments.map(a => `• ${a}`).join('\n')}`
        : '';
}

function buildMilestoneBlock(ctx: DisputeContext): string {
    if (!ctx.milestones || ctx.milestones.length === 0) return '';

    const totalAmount = ctx.milestones.reduce((sum, m) => sum + Number(m.amount), 0);
    const completedValue = ctx.milestones
        .filter(m => m.status === 'COMPLETED' || m.status === 'RELEASED')
        .reduce((sum, m) => sum + Number(m.amount), 0);
    const releasedValue = ctx.milestones
        .filter(m => m.status === 'RELEASED')
        .reduce((sum, m) => sum + Number(m.amount), 0);
    const completionPct = totalAmount > 0 ? Math.round((completedValue / totalAmount) * 100) : 0;

    const lines = ctx.milestones.map(m =>
        `  [${m.status}] "${m.title}" — ${ctx.transaction.currency} ${m.amount}`
    ).join('\n');

    return `MILESTONE TRANSACTION:
${lines}
Completion by value: ${completionPct}% (${ctx.transaction.currency} ${completedValue} of ${totalAmount})
Already released (irrevocable): ${ctx.transaction.currency} ${releasedValue}

MILESTONE RULE: Never issue REFUND_BUYER for already-RELEASED milestones. Default SPLIT = completed ratio (${completionPct}% to seller) unless completed work has documented defects.`;
}

export function buildJudgePrompt(ctx: DisputeContext, invOut: InvestigatorOutput): string {
    return `You are "The Judge" — Safeeely's constitutional AI adjudicator. You render structured, evidence-anchored verdicts.

CORE PRINCIPLES:
1. UTILITY BINARY: Who currently holds functional utility of the asset? That party bears higher burden to prove their claim fails.
2. DEPRIVATION RULE: If the seller permanently lost an irreversible asset (credentials handed over, OGE transferred), the buyer's burden to prove "broken" status increases by 50%.
3. CLEAN HANDS DOCTRINE: Any detected fraud or non-cooperation triggers Adverse Inference — the disputed fact is assumed against the non-cooperative party.
4. EVIDENCE HIERARCHY (strictly applied):
   - LEVEL 1 (binding): Blockchain records, platform auth logs, carrier API, CSV exports
   - LEVEL 2 (strong): Metadata-rich screenshots, timestamped platform exports
   - LEVEL 3 (weak): Raw screenshots, unverified messages
   - LEVEL 4 (discarded if L1-L3 exists): Written statements, anecdotal claims

TRANSACTION:
Product: "${ctx.transaction.product_name}"
Amount: ${ctx.transaction.amount} ${ctx.transaction.currency}
Buyer: @${ctx.transaction.buyer.safetag}
Seller: @${ctx.transaction.seller.safetag}
Dispute Type: ${ctx.dispute.dispute_type}

${buildMilestoneBlock(ctx)}

${buildSopBlock(ctx)}

${buildBurdenBlock(ctx)}

INVESTIGATOR FINDINGS:
Facts Summary: ${invOut.facts_summary}
Evidence Assessment:
${invOut.evidence_tier_assessment.map(e => `  - Message ${e.message_id}: Tier ${e.tier} [${e.tags.join(', ')}]`).join('\n') || '  (none classified)'}
Missing Evidence (all resolved as facts_complete=true):
${invOut.missing_evidence.length > 0 ? invOut.missing_evidence.map(m => `  - From ${m.from}: ${m.evidence_name}`).join('\n') : '  (none — facts complete)'}

CHAT HISTORY:
${ctx.history.map(m => {
    const who = m.sender_type === 'AI' ? 'Safeeely AI' : m.sender_id;
    return `${who}: ${m.content} [Tier: ${m.evidence_tier || '?'}] [Att: ${m.attachments?.length || 0}]`;
}).join('\n')}

OUTPUT FORMAT — respond with ONLY this JSON object:
{
  "action": "REFUND_BUYER|PAY_SELLER|SPLIT",
  "split_pct_buyer": 0,
  "verdict_summary": "<2-3 sentence verdict suitable for display to both parties>",
  "reasoning": "<detailed evidence-based reasoning trace citing specific messages and evidence tiers>",
  "utility_location": "BUYER_HAS_FUNCTIONAL_UTILITY|SELLER_HAS_FUNCTIONAL_UTILITY|NEUTRALIZED_OR_CONTESTED",
  "utility_evidence_refs": ["<message_id>"],
  "burden_of_proof_status": {
    "assigned_to": "BUYER|SELLER|BOTH",
    "assigned_to_reason": "<one sentence>",
    "met": true,
    "adjustment_factor": 1.0,
    "adjustment_reason": "<why multiplier was applied or 'none'>"
  },
  "conflicting_evidence_resolution": [
    {
      "conflict": "<description of conflict>",
      "ruled_in_favor_of": "BUYER|SELLER",
      "rule_applied": "<e.g. Evidence Hierarchy: LEVEL 1 supersedes LEVEL 3>"
    }
  ],
  "fallacy_check": {
    "sunk_cost_detected": false,
    "appeal_to_pity_detected": false,
    "false_equivalence_detected": false,
    "notes": ""
  },
  "precedence_check": {
    "sops_consulted": ["SOP-CODE-1"],
    "binding_sops_applied": ["SOP-CODE-1"],
    "deviation_from_precedent": false,
    "deviation_justification": ""
  },
  "double_dip_check": {
    "applicable": false,
    "risk_present": false,
    "mitigation": ""
  },
  "clean_hands": {
    "buyer_clean": true,
    "seller_clean": true,
    "adverse_inference_triggered_against": null
  }
}`;
}
