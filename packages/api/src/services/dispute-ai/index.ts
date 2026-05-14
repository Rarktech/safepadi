import { supabase } from '@safepal/shared';
import type { AIDisputeResult, DisputeContext, JudgeOutput } from './types';
import { loadDisputeContext } from './context-loader';
import { assignPipelineTier } from './classifier';
import { runInvestigator } from './agents/investigator';
import { runJudge } from './agents/judge';
import { runCritic } from './agents/critic';
import { seedBootstrapSops } from './memory/sop-repository';

let sopsSeedInitiated = false;

async function ensureSopsSeeded(): Promise<void> {
    if (sopsSeedInitiated) return;
    sopsSeedInitiated = true;
    const { count } = await supabase
        .from('dispute_sops')
        .select('id', { count: 'exact', head: true });
    if ((count || 0) === 0) {
        await seedBootstrapSops();
    }
}

async function writeAdjudication(disputeId: string, ctx: DisputeContext, judgeOut: JudgeOutput): Promise<void> {
    try {
        const topTier = ctx.history.reduce((min: number, m: any) =>
            m.evidence_tier && m.evidence_tier < min ? m.evidence_tier : min, 3);

        const sopIds: string[] = [];
        for (const code of (judgeOut.precedence_check?.binding_sops_applied || [])) {
            const { data } = await supabase.from('dispute_sops').select('id').eq('sop_code', code).maybeSingle();
            if (data) sopIds.push(data.id);
        }

        await supabase.from('dispute_adjudications').upsert({
            dispute_id: disputeId,
            dispute_type: ctx.dispute.dispute_type,
            fact_summary: judgeOut.verdict_summary,
            final_action: judgeOut.action,
            split_pct_buyer: judgeOut.action === 'SPLIT' ? judgeOut.split_pct_buyer : null,
            utility_location: judgeOut.utility_location || 'NEUTRALIZED_OR_CONTESTED',
            evidence_tier_top: topTier,
            sops_applied: sopIds,
            human_overrode_ai: false
        }, { onConflict: 'dispute_id' });
    } catch (err) {
        console.warn('⚠️ Could not write adjudication record:', (err as Error).message);
    }
}

export async function processAIDispute(disputeId: string): Promise<AIDisputeResult> {
    // Ensure bootstrap SOPs are seeded on first run
    ensureSopsSeeded().catch(err => console.warn('SOP seed failed:', err));

    try {
        console.log(`🤖 [dispute-ai] Starting pipeline for ${disputeId}`);

        // ── Load full context ──────────────────────────────────────────────
        const ctx = await loadDisputeContext(disputeId);

        // ── Re-evaluate tier with full reputation data ─────────────────────
        const effectiveTier = assignPipelineTier(
            ctx.dispute.dispute_type,
            ctx.transaction.amount,
            ctx.transaction.currency,
            ctx.buyerReputation,
            ctx.sellerReputation
        );

        // Promote tier if rep-based trigger fires after initial classification
        if (
            (effectiveTier === 'CONSTITUTIONAL' && ctx.dispute.pipeline_tier !== 'CONSTITUTIONAL') ||
            (effectiveTier === 'STANDARD' && ctx.dispute.pipeline_tier === 'LITE')
        ) {
            await supabase
                .from('disputes')
                .update({ pipeline_tier: effectiveTier })
                .eq('id', disputeId);
            ctx.dispute.pipeline_tier = effectiveTier;
        }

        const tier = ctx.dispute.pipeline_tier;
        console.log(`🔍 [dispute-ai] Tier=${tier}, Type=${ctx.dispute.dispute_type}`);

        // ── Investigator ───────────────────────────────────────────────────
        const invOut = await runInvestigator(ctx);
        console.log(`🔎 [dispute-ai] Investigator: facts_complete=${invOut.facts_complete}, score=${invOut.self_score}`);

        // Update evidence tier on recent messages
        if (invOut.evidence_tier_assessment?.length > 0) {
            for (const item of invOut.evidence_tier_assessment) {
                await supabase
                    .from('dispute_messages')
                    .update({ evidence_tier: item.tier, evidence_tags: item.tags })
                    .eq('id', item.message_id)
                    .eq('dispute_id', disputeId);
            }
        }

        if (!invOut.facts_complete) {
            return {
                type: 'QUESTION',
                content: invOut.user_facing_message,
                restrict: invOut.restrict_to
            };
        }

        // ── Judge ──────────────────────────────────────────────────────────
        console.log(`⚖️  [dispute-ai] Running Judge (${tier})...`);
        let judgeOut: JudgeOutput;
        try {
            judgeOut = await runJudge(ctx, invOut);
        } catch (err) {
            console.error('❌ Judge failed:', (err as Error).message);
            return {
                type: 'ERROR',
                content: '⚖️ The mediator encountered a formatting issue while evaluating the case. Please wait a moment.'
            };
        }

        // Persist Judge's payload for admin visibility
        await supabase
            .from('disputes')
            .update({ last_judge_payload: judgeOut })
            .eq('id', disputeId);

        // ── LITE: skip Critic, return verdict directly ─────────────────────
        if (tier === 'LITE') {
            console.log(`✅ [dispute-ai] LITE verdict: ${judgeOut.action}`);
            await writeAdjudication(disputeId, ctx, judgeOut);
            return {
                type: 'VERDICT',
                content: judgeOut.verdict_summary,
                action: judgeOut.action,
                split_pct_buyer: judgeOut.split_pct_buyer
            };
        }

        // ── Critic ─────────────────────────────────────────────────────────
        console.log(`🔴 [dispute-ai] Running Critic (${tier})...`);
        const criticOut = await runCritic(judgeOut, ctx);

        await supabase
            .from('disputes')
            .update({ critic_iterations: (ctx.dispute.critic_iterations || 0) + 1 })
            .eq('id', disputeId);

        console.log(`🔴 [dispute-ai] Critic: ${criticOut.verdict} (confidence=${criticOut.confidence})`);

        if (criticOut.verdict === 'APPROVED') {
            await writeAdjudication(disputeId, ctx, judgeOut);
            return {
                type: 'VERDICT',
                content: judgeOut.verdict_summary,
                action: judgeOut.action,
                split_pct_buyer: judgeOut.split_pct_buyer
            };
        }

        // Critic rejected — STANDARD and CONSTITUTIONAL both escalate to human
        // (Chronicler self-healing is Phase 3 — deferred)
        const blockingFailures = criticOut.failures.filter(f => f.severity === 'BLOCKING');
        console.warn(`⚠️ [dispute-ai] Critic REJECTED — ${blockingFailures.length} blocking failure(s)`);

        return {
            type: 'ESCALATE',
            content: `⚖️ **Case Requires Human Review**\n\nThis case has factors that require a human specialist to evaluate. A support agent will be assigned shortly. Please stand by — funds remain secure in escrow.`
        };

    } catch (err: any) {
        console.error('❌ [dispute-ai] Pipeline error:', err);
        return {
            type: 'ERROR',
            content: 'The mediator is having trouble connecting. Please wait a moment or try again later.'
        };
    }
}
