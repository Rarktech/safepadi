import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DisputeContext, InvestigatorOutput, JudgeOutput } from '../types';
import { buildJudgePrompt } from '../prompts/judge.prompt';
import { extractJSON } from '../utils/json-parse';
import { recordSopHit } from '../memory/sop-repository';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Use stronger model for STANDARD/CONSTITUTIONAL — verdict quality is the product
function selectModel(tier: string): string {
    if (tier === 'LITE') return 'gemini-flash-latest';
    return 'gemini-2.5-pro';
}

const VALID_ACTIONS = new Set(['REFUND_BUYER', 'PAY_SELLER', 'SPLIT']);

export async function runJudge(ctx: DisputeContext, invOut: InvestigatorOutput): Promise<JudgeOutput> {
    const prompt = buildJudgePrompt(ctx, invOut);
    const modelName = selectModel(ctx.dispute.pipeline_tier);

    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    let judgeOut: JudgeOutput;
    try {
        judgeOut = extractJSON<JudgeOutput>(raw, 'Judge');
    } catch (err) {
        console.error('❌ Judge JSON parse error:', (err as Error).message, '\nRaw:', raw.slice(0, 500));
        throw new Error('Judge formatting failure');
    }

    // Validate action
    if (!VALID_ACTIONS.has(judgeOut.action)) {
        throw new Error(`Judge returned invalid action: ${judgeOut.action}`);
    }

    // Ensure all required fields have defaults
    judgeOut.split_pct_buyer = judgeOut.split_pct_buyer ?? 0;
    judgeOut.precedence_check = judgeOut.precedence_check || { sops_consulted: [], binding_sops_applied: [], deviation_from_precedent: false, deviation_justification: '' };
    judgeOut.double_dip_check = judgeOut.double_dip_check || { applicable: false, risk_present: false, mitigation: '' };
    judgeOut.clean_hands = judgeOut.clean_hands || { buyer_clean: true, seller_clean: true, adverse_inference_triggered_against: null };
    judgeOut.fallacy_check = judgeOut.fallacy_check || { sunk_cost_detected: false, appeal_to_pity_detected: false, false_equivalence_detected: false, notes: '' };
    judgeOut.conflicting_evidence_resolution = judgeOut.conflicting_evidence_resolution || [];
    judgeOut.utility_evidence_refs = judgeOut.utility_evidence_refs || [];
    judgeOut.burden_of_proof_status = judgeOut.burden_of_proof_status || {
        assigned_to: 'BOTH', assigned_to_reason: '', met: true, adjustment_factor: 1.0, adjustment_reason: ''
    };

    // Record SOP hits for analytics
    const sopsConsulted = judgeOut.precedence_check.sops_consulted || [];
    if (sopsConsulted.length > 0) {
        recordSopHit(sopsConsulted).catch(() => {});
    }

    return judgeOut;
}
