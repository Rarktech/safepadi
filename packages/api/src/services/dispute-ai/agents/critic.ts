import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DisputeContext, JudgeOutput, CriticOutput } from '../types';
import { buildCriticPrompt } from '../prompts/critic.prompt';
import { safeParseJSON } from '../utils/json-parse';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Minimum confidence for a REJECTED verdict to count as a real rejection
// Tune upward (e.g. 0.7) after 30+ real rejected verdicts are calibrated
const REJECTION_CONFIDENCE_THRESHOLD = 0.6;

const APPROVED_FALLBACK: CriticOutput = {
    verdict: 'APPROVED',
    failures: [],
    confidence: 0.7
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

export async function runCritic(judgeOut: JudgeOutput, ctx: DisputeContext): Promise<CriticOutput> {
    const prompt = buildCriticPrompt(judgeOut, ctx);

    const model = genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await geminiWithRetry(() => model.generateContent(prompt), 'Critic');
    const raw = result.response.text();

    const criticOut = safeParseJSON<CriticOutput>(raw, APPROVED_FALLBACK, 'Critic');

    // Ensure defaults
    criticOut.verdict = criticOut.verdict === 'REJECTED' ? 'REJECTED' : 'APPROVED';
    criticOut.failures = criticOut.failures || [];
    criticOut.confidence = typeof criticOut.confidence === 'number' ? Math.max(0, Math.min(1, criticOut.confidence)) : 0.7;

    // A REJECTED verdict with low confidence is treated as APPROVED
    // (Critic is uncertain — don't escalate on weak signals)
    if (criticOut.verdict === 'REJECTED' && criticOut.confidence < REJECTION_CONFIDENCE_THRESHOLD) {
        console.log(`ℹ️ Critic REJECTED with low confidence (${criticOut.confidence}) — treating as APPROVED`);
        criticOut.verdict = 'APPROVED';
    }

    return criticOut;
}
