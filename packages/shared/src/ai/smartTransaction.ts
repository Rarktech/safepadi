import { GoogleGenerativeAI } from '@google/generative-ai';
let genAI: any = null;

export interface MilestonePhase {
    title: string;
    amount: number;
}

export interface SmartTransactionDraft {
    product_name?: string;
    amount?: number;
    currency?: string;
    description?: string;
    counterparty_safetag?: string;
    role?: 'buyer' | 'seller';
    fee_allocation?: 'buyer' | 'seller' | 'split';
    transaction_type?: 'ONE_TIME' | 'MILESTONE';
    milestones?: MilestonePhase[];
}

export interface SmartTransactionResponse {
    draft: SmartTransactionDraft;
    is_complete: boolean;
    follow_up_question?: string;
}

const SYSTEM_PROMPT = `
You are a smart AI assistant for an escrow service called Safeeely.
Your job is to extract transaction details from user input (text or transcribed voice note).
You must output ONLY valid JSON using the exact schema provided.

The required fields for a complete transaction are:
- product_name (string): A short title of what is being bought/sold.
- description (string): The agreement details, terms, specs, or condition.
- amount (number): The total numerical price for the whole project.
- currency (string): The currency code (e.g. NGN, USD, USDT). 
- counterparty_safetag (string): The other person's handle, WITHOUT the '@'.
- role (string): "buyer" if the user is buying, "seller" if the user is selling.
- fee_allocation (string): Who pays the 5% escrow fee ("buyer", "seller", or "split").
- transaction_type (string): "ONE_TIME" or "MILESTONE".

Rules for MILESTONES (Phased Projects):
- Detect projects with multiple steps, phases, or partial payments (e.g., "50% upfront", "3 stages", "deposit then balance").
- If the user describes any phased structure, ALWAYS set transaction_type to "MILESTONE".
- Extract each phase into the 'milestones' array. Each object needs a 'title' and 'amount'.
- The sum of milestone amounts MUST equal the total 'amount'.

Rules for missing information:
- If a required field is missing, leave the field out of the 'draft' object.
- If ANY required fields are missing, set 'is_complete' to false, and provide a conversational 'follow_up_question'.
- Do NOT wrap your response in markdown code blocks. Just output raw JSON.

Output JSON Schema:
{
  "draft": {
    "product_name": "string",
    "description": "string",
    "amount": "number",
    "currency": "string",
    "counterparty_safetag": "string",
    "role": "buyer | seller",
    "fee_allocation": "buyer | seller | split",
    "transaction_type": "ONE_TIME | MILESTONE",
    "milestones": [{"title": "string", "amount": "number"}]
  },
  "is_complete": "boolean",
  "follow_up_question": "string"
}
`;

export async function processSmartTransaction(
    userInput: string, 
    audioBuffer?: Buffer, 
    audioMimeType?: string,
    existingDraft?: SmartTransactionDraft
): Promise<SmartTransactionResponse> {
    try {
        if (!genAI) {
            const key = process.env.GEMINI_API_KEY || '';
            if (!key) {
                console.error("❌ GEMINI_API_KEY is missing in process.env");
            }
            genAI = new GoogleGenerativeAI(key);
        }
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const promptParts: any[] = [
            SYSTEM_PROMPT,
            `\nExisting Draft (if any): ${existingDraft ? JSON.stringify(existingDraft) : '{}'}\n`,
            `\nUser Input: ${userInput || '(User sent audio)'}\n`
        ];

        if (audioBuffer && audioMimeType) {
            promptParts.push({
                inlineData: {
                    data: audioBuffer.toString('base64'),
                    mimeType: audioMimeType
                }
            });
        }

        const result = await model.generateContent(promptParts);
        const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        let parsed: SmartTransactionResponse;
        try {
            parsed = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", responseText);
            throw new Error("Invalid response format from AI");
        }

        // Merge existing draft with new extracted fields to not lose context
        parsed.draft = {
            ...existingDraft,
            ...parsed.draft
        };

        // Recalculate complete status just to be safe
        const d = parsed.draft;
        const required = !!(d.product_name && d.amount && d.currency && d.counterparty_safetag && d.role && d.fee_allocation);
        if (required && !parsed.is_complete) {
            parsed.is_complete = true;
            parsed.follow_up_question = undefined;
        } else if (!required && parsed.is_complete) {
            parsed.is_complete = false;
            parsed.follow_up_question = parsed.follow_up_question || "Please provide the missing details.";
        }

        return parsed;

    } catch (err: any) {
        console.error("Smart Transaction AI Error:", err.message);
        throw err;
    }
}
