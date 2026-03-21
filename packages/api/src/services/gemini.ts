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

        // 2. Multimodal context preparation
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
            
            IMPORTANT:
            - If this is the start of the dispute (only 1 message in history), you MUST ask the person who raised the dispute for high-quality evidence.
            - Evidence includes: crystal clear photos of items, screenshots of credential errors, delivery receipts, or chat logs.
            - Be thorough and detailed. Explain why this evidence is needed.
            - If the user has just uploaded evidence (check attachments below), analyze it specifically.
            
            CHAT HISTORY:
            ${history.map(m => `${m.sender_type === 'AI' ? 'Safeeely AI' : m.sender_id}: ${m.content} [Attachments: ${m.attachments?.length || 0}]`).join('\n')}
            
            TASK:
            1. Summarize the facts in 2-3 sentences.
            2. Identify if we need more evidence. If evidence was just provided, confirm you've seen it and what it proves.
            3. Formulate a polite but firm request for the specific party if needed.
            4. If no more evidence is needed, state "FACTS_COMPLETE".
            
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
            // ... (Judge and Reviewer logic remains same, multimodal not needed for them)
            const judgePrompt = `
                You are "The Judge". Analyze these investigator findings against generic escrow rules:
                - Seller must provide proof of delivery/credentials.
                - Buyer must prove non-utility of the product.
                
                INVESTIGATOR FINDINGS:
                ${investigatorResponse}
                
                Provide your verdict and the logic behind it.
                
                FORMATTING RULES:
                - Use standard markdown bolding (**text**) for key terms and headers.
                - Use ALL CAPS for headers: **VERDICT:**, **LOGIC:**, **REASONING:**.
                - List individual reasons clearly with numbers (1., 2., 3.).
                - Ensure the layout is clean with clear paragraphs.
            `;
            const judgeResult = await model.generateContent(judgePrompt);
            const judgeResponse = judgeResult.response.text();

            const reviewerPrompt = `
                You are "The Reviewer". Review the Judge's verdict for bias or logic errors.
                
                JUDGE'S VERDICT:
                ${judgeResponse}
                
                If the verdict is fair, respond with "VERDICT_APPROVED".
                If not, suggest adjustments.
            `;
            const reviewerResult = await model.generateContent(reviewerPrompt);
            const reviewerResponse = reviewerResult.response.text();

            if (reviewerResponse.includes('VERDICT_APPROVED')) {
                return {
                    type: 'VERDICT',
                    content: judgeResponse,
                    action: judgeResponse.includes('REFUND_BUYER') ? 'REFUND' : (judgeResponse.includes('PAY_SELLER') ? 'PAY' : 'SPLIT')
                };
            }
        }

        return {
            type: 'QUESTION',
            content: investigatorResponse
        };

    } catch (err: any) {
        console.error('❌ AI Processing Error:', err);
        return {
            type: 'ERROR',
            content: 'Mediator is having trouble connecting. Please wait a moment or try again later.'
        };
    }
}
