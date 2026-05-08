import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function processAIDispute(disputeId: string) {
    try {
        console.log(`🤖 Starting AI Mediation for Dispute: ${disputeId}`);

        // 1. Data Ingestor: Collect all context
        const { data: dispute, error: disputeErr } = await supabase
            .from('disputes')
            .select(`
                *,
                transactions (*, buyer:profiles!transactions_buyer_id_fkey(*), seller:profiles!transactions_seller_id_fkey(*))
            `)
            .eq('id', disputeId)
            .single();

        if (disputeErr || !dispute) throw new Error('Dispute not found');

        const { data: messages } = await supabase
            .from('dispute_messages')
            .select('*')
            .eq('dispute_id', disputeId)
            .order('created_at', { ascending: true });

        const history = messages || [];
        // Cap context window to avoid token limit issues on long disputes
        const historyWindow = history.slice(-20);

        // 2. Fraud & Reputation Context (RAG Injection)
        const buyerId = dispute.transactions.buyer_id;
        const sellerId = dispute.transactions.seller_id;
        
        const [buyerDisputes, sellerDisputes] = await Promise.all([
            supabase.from('disputes').select('id, status').eq('raised_by', buyerId),
            supabase.from('disputes').select('id, status').eq('raised_by', sellerId)
        ]);

        // 3. Multimodal context preparation
        // We find the last user message and its attachments
        const lastUserMessage = [...history].reverse().find(m => m.sender_type === 'USER');
        const attachments = lastUserMessage?.attachments || [];

        const context = {
            transaction: dispute.transactions,
            dispute: {
                id: dispute.id,
                reason: dispute.reason,
                status: dispute.status
            },
            reputation: {
                buyer_past_disputes: buyerDisputes.data?.length || 0,
                seller_past_disputes: sellerDisputes.data?.length || 0
            },
            history
        };

        // Investigator Prompt
        const investigatorPrompt = `
            You are "The Investigator", a neutral Safeeely AI mediator. 
            Your goal is to extract facts and identify what's missing to resolve the dispute quickly and fairly.
            
            TRANSACTION CONTEXT:
            Product: ${context.transaction.product_name}
            Amount: ${context.transaction.amount} ${context.transaction.currency}
            Status: ${context.transaction.status}
            Buyer: ${context.transaction.buyer.safetag}
            Seller: ${context.transaction.seller.safetag}
            
            DISPUTE REASON: ${context.dispute.reason}

            FRAUD CONTEXT (WARNING FLAGS):
            - Buyer has raised ${context.reputation.buyer_past_disputes} disputes in the past.
            - Seller has been involved in ${context.reputation.seller_past_disputes} disputes in the past.
            (Take this into consideration when weighing evidence, if someone has 0 disputes they are usually more trustworthy than someone with 10).
            
            IMPORTANT:
            - If this is the start of the dispute (only 1 message in history), you MUST ask the person who raised the dispute for high-quality evidence.
            - Evidence includes: crystal clear photos of items, screenshots of credential errors, delivery receipts, or chat logs.
            - Be thorough and detailed. Explain why this evidence is needed.
            - If the user has just uploaded evidence (check attachments below), analyze it specifically.
            
            ${history.length > 20 ? `[Earlier messages omitted — showing last 20 of ${history.length}]\n` : ''}CHAT HISTORY:
            ${historyWindow.map(m => `${m.sender_type === 'AI' ? 'Safeeely AI' : m.sender_id}: ${m.content} [Attachments: ${m.attachments?.length || 0}]`).join('\n')}
            
            TASK:
            1. Summarize the facts in 2-3 sentences.
            2. Identify if we need more evidence. If evidence was just provided, confirm you've seen it and what it proves.
            3. Formulate a polite but firm request for the specific party if needed.
            4. If no more evidence is needed, state "FACTS_COMPLETE".
            
            CHAT RESTRICTION RULE:
            - To keep the chat completely orderly, you MUST explicitly restrict chatter to the person you are asking a question to!
            - If you ask the BUYER a question, you must put exactly "[RESTRICT: BUYER]" at the very beginning of your response.
            - If you ask the SELLER a question, you must put exactly "[RESTRICT: SELLER]" at the very beginning.
            - If you are addressing BOTH or concluding, you must put "[RESTRICT: ALL]".
            
            FORMATTING RULES:
            - Use standard markdown bolding (**text**) for emphasis. 
            - Use CAPS for section headers (e.g., **SUMMARY:**, **REQUEST:**).
            - Use clear bullet points (-) or numbered lists (1.).
            - Ensure the response is clean and professional.
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // Build multimodal prompt if there are image attachments
        const promptParts: any[] = [investigatorPrompt];

        for (const att of attachments) {
            if (att.type?.startsWith('image/')) {
                try {
                    // Extract path from public URL: .../public/dispute-evidence/[PATH]
                    const urlParts = att.url.split('/public/dispute-evidence/');
                    if (urlParts.length < 2) continue;
                    const path = urlParts[1];

                    const { data, error } = await supabase.storage
                        .from('dispute-evidence')
                        .download(path);

                    if (error || !data) throw error || new Error('Download failed');

                    const buffer = await data.arrayBuffer();
                    promptParts.push({
                        inlineData: {
                            data: Buffer.from(buffer).toString('base64'),
                            mimeType: att.type
                        }
                    });
                } catch (fetchErr) {
                    console.error('Failed to download attachment for AI:', att.url, fetchErr);
                }
            }
        }

        const investigatorResult = await model.generateContent(promptParts);
        const investigatorResponse = investigatorResult.response.text();

        if (investigatorResponse.includes('FACTS_COMPLETE')) {
            const judgePrompt = `
                You are "The Judge". Analyze these investigator findings against generic escrow rules:
                - Seller must provide proof of delivery/credentials.
                - Buyer must prove non-utility of the product.

                TRANSACTION AMOUNT: ${context.transaction.amount} ${context.transaction.currency}

                INVESTIGATOR FINDINGS:
                ${investigatorResponse}

                You MUST respond with a valid JSON object ONLY. No prose, no markdown code fences.

                {
                  "action": "REFUND_BUYER" | "PAY_SELLER" | "SPLIT",
                  "split_pct_buyer": <integer 0-100, required only when action is SPLIT>,
                  "verdict_summary": "<2-3 sentence verdict suitable for display to both parties>",
                  "reasoning": "<detailed reasoning for the decision>"
                }
            `;
            const judgeResult = await model.generateContent(judgePrompt);
            const judgeRaw = judgeResult.response.text().trim().replace(/^```json\s*|^```\s*|\s*```$/g, '').trim();

            let judgeData: { action: string; split_pct_buyer?: number; verdict_summary: string; reasoning: string };
            try {
                judgeData = JSON.parse(judgeRaw);
                if (!['REFUND_BUYER', 'PAY_SELLER', 'SPLIT'].includes(judgeData.action)) {
                    throw new Error(`Invalid action: ${judgeData.action}`);
                }
            } catch (parseErr) {
                console.error('❌ Judge JSON parse error:', parseErr, '\nRaw:', judgeRaw);
                return { type: 'ERROR', content: 'Mediator encountered a formatting issue while evaluating the case. Please wait a moment.' };
            }

            const reviewerPrompt = `
                You are "The Reviewer". Review the Judge's verdict for bias or logic errors.

                JUDGE'S VERDICT:
                Action: ${judgeData.action}
                Summary: ${judgeData.verdict_summary}
                Reasoning: ${judgeData.reasoning}

                If the verdict is logically sound and unbiased, respond with exactly "VERDICT_APPROVED".
                If there are issues, respond with "VERDICT_REJECTED" followed by your specific objections.
            `;
            const reviewerResult = await model.generateContent(reviewerPrompt);
            const reviewerResponse = reviewerResult.response.text();

            if (reviewerResponse.includes('VERDICT_APPROVED')) {
                return {
                    type: 'VERDICT',
                    content: judgeData.verdict_summary,
                    action: judgeData.action,
                    split_pct_buyer: judgeData.split_pct_buyer
                };
            } else {
                // Reviewer flagged a problem — escalate to human admin instead of auto-executing
                return {
                    type: 'ESCALATE',
                    content: '⚖️ **Case Requires Human Review**\n\nThis case has complex factors that require a human admin to evaluate. A support agent will be assigned shortly. Please stand by.'
                };
            }
        }

        // Parse restriction directive
        let restriction = 'ALL';
        if (investigatorResponse.includes('[RESTRICT: BUYER]')) restriction = 'BUYER';
        else if (investigatorResponse.includes('[RESTRICT: SELLER]')) restriction = 'SELLER';

        // Clean out the raw tag for the user UI
        const cleanContent = investigatorResponse
            .replace(/\[RESTRICT:\s*(BUYER|SELLER|ALL)\]/g, '')
            .trim();

        return {
            type: 'QUESTION',
            content: cleanContent,
            restrict: restriction
        };

    } catch (err: any) {
        console.error('❌ AI Processing Error:', err);
        return {
            type: 'ERROR',
            content: 'Mediator is having trouble connecting. Please wait a moment or try again later.'
        };
    }
}
