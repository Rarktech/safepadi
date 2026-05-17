import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DisputeContext, InvestigatorOutput } from '../types';
import { buildInvestigatorPrompt } from '../prompts/investigator.prompt';
import { downloadAttachmentsAsInlineParts } from '../utils/multimodal';
import { safeParseJSON } from '../utils/json-parse';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const INVESTIGATOR_FALLBACK: InvestigatorOutput = {
    facts_summary: 'Evidence gathering in progress.',
    evidence_tier_assessment: [],
    missing_evidence: [],
    self_score: 0,
    facts_complete: false,
    restrict_to: 'ALL',
    user_facing_message: '⚖️ **Reviewing your case...**\n\nPlease stand by while the mediator analyses the available information.'
};

async function geminiWithRetry(fn: () => Promise<any>, label: string, maxAttempts = 3): Promise<any> {
    let lastErr: any;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try { return await fn(); }
        catch (err: any) {
            lastErr = err;
            if (attempt < maxAttempts) {
                console.warn(`⚠️ [dispute-ai] ${label} attempt ${attempt} failed (${err.message}) — retrying in ${attempt * 8}s`);
                await new Promise(r => setTimeout(r, attempt * 8000));
            }
        }
    }
    throw lastErr;
}

export async function runInvestigator(ctx: DisputeContext): Promise<InvestigatorOutput> {
    const prompt = buildInvestigatorPrompt(ctx);
    const imageParts = await downloadAttachmentsAsInlineParts(ctx.latestAttachments);

    const model = genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        generationConfig: { responseMimeType: 'application/json' }
    });

    const promptParts: any[] = [prompt, ...imageParts];

    const result = await geminiWithRetry(() => model.generateContent(promptParts), 'Investigator');
    const raw = result.response.text();

    const output = safeParseJSON<InvestigatorOutput>(raw, INVESTIGATOR_FALLBACK, 'Investigator');

    // Validate required fields
    if (typeof output.facts_complete !== 'boolean') output.facts_complete = false;
    if (!['BUYER', 'SELLER', 'ALL'].includes(output.restrict_to)) output.restrict_to = 'ALL';
    if (!output.user_facing_message) output.user_facing_message = output.facts_summary || INVESTIGATOR_FALLBACK.user_facing_message;

    return output;
}
