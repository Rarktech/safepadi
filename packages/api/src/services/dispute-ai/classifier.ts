import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ClassifierOutput } from './types';
import { platformHeuristicGuess } from './config/disputeTypes';
import { safeParseJSON } from './utils/json-parse';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const ALL_TYPES = [
    // Social accounts
    'INSTAGRAM_ACCOUNT', 'DISCORD_ACCOUNT', 'TELEGRAM_ACCOUNT', 'GMAIL_ACCOUNT',
    'TWITTER_ACCOUNT', 'TIKTOK_ACCOUNT', 'YOUTUBE_CHANNEL', 'FACEBOOK_ACCOUNT',
    // Freelance
    'FREELANCE_CODE', 'FREELANCE_DESIGN', 'FREELANCE_WRITING',
    'FREELANCE_VIDEO', 'FREELANCE_MUSIC', 'FREELANCE_CONSULTING',
    // Digital goods
    'DIGITAL_DOWNLOAD', 'GAMING_ACCOUNT', 'DOMAIN_WEBSITE',
    // Physical goods
    'ELECTRONICS_GADGET', 'VEHICLE_SALE', 'LUXURY_GOODS', 'FASHION_GOODS', 'PHYSICAL_GOODS',
    // Services
    'INFLUENCER_DEAL', 'EVENT_BOOKING', 'TICKET_RESERVATION',
    'DISPATCH_DELIVERY', 'EDUCATION_SERVICE',
    'CONSTRUCTION_SERVICE', 'REAL_ESTATE',
    // Other
    'CRYPTO_TO_GOODS', 'SOCIAL_SERVICE', 'GENERIC'
];

// NGN to USD approximate — used only for CONSTITUTIONAL tier threshold
const NGN_TO_USD = 1 / 1600;

function determineTier(
    disputeType: string,
    amount: number,
    currency: string,
    buyerTrustScore: number,
    sellerTrustScore: number,
    buyerFraudFlags: string[],
    sellerFraudFlags: string[]
): 'LITE' | 'STANDARD' | 'CONSTITUTIONAL' {
    // CONSTITUTIONAL triggers
    const amountUSD = currency === 'NGN' ? amount * NGN_TO_USD : amount;
    const isHighValue = amountUSD > 2000;
    const isDigitalAccount = disputeType.endsWith('_ACCOUNT')
        || disputeType.startsWith('CRYPTO_')
        || ['YOUTUBE_CHANNEL', 'GAMING_ACCOUNT', 'DOMAIN_WEBSITE',
            'VEHICLE_SALE', 'REAL_ESTATE', 'TICKET_RESERVATION'].includes(disputeType);
    const hasLowTrust = buyerTrustScore < 30 || sellerTrustScore < 30;
    const hasFraudFlags = buyerFraudFlags.length > 0 || sellerFraudFlags.length > 0;

    if (isHighValue || isDigitalAccount || hasLowTrust || hasFraudFlags) {
        return 'CONSTITUTIONAL';
    }

    // LITE triggers: low value + simple type
    if (['PHYSICAL_GOODS', 'FASHION_GOODS', 'DIGITAL_DOWNLOAD',
        'DISPATCH_DELIVERY', 'EDUCATION_SERVICE', 'GENERIC'].includes(disputeType)) {
        const isLowValue = currency === 'NGN' ? amount < 80_000 : amountUSD < 50;
        if (isLowValue) return 'LITE';
    }

    return 'STANDARD';
}

export function assignPipelineTier(
    disputeType: string,
    amount: number,
    currency: string,
    buyerReputation: { trust_score: number; fraud_flags: string[] },
    sellerReputation: { trust_score: number; fraud_flags: string[] }
): 'LITE' | 'STANDARD' | 'CONSTITUTIONAL' {
    return determineTier(
        disputeType, amount, currency,
        buyerReputation.trust_score, sellerReputation.trust_score,
        buyerReputation.fraud_flags, sellerReputation.fraud_flags
    );
}

export async function classifyDisputeType(
    reason: string,
    productName: string,
    amount: number,
    currency: string,
    _buyerPlatform = '',
    _sellerPlatform = '',
    userCategory?: string
): Promise<ClassifierOutput> {
    // Try heuristic first — free, instant
    const heuristic = platformHeuristicGuess(productName);
    if (heuristic.confidence >= 0.8) {
        const tier = determineTier(heuristic.type, amount, currency, 50, 50, [], []);
        return { dispute_type: heuristic.type, pipeline_tier: tier };
    }

    // Fall back to Gemini classifier
    const categoryHint = userCategory ? `USER-SELECTED CATEGORY: ${userCategory}\n` : '';
    const prompt = `You are a dispute type classifier for an escrow platform.

TRANSACTION: "${productName}"
${categoryHint}DISPUTE REASON: "${reason}"
AMOUNT: ${amount} ${currency}

Classify into exactly one of these types:
${ALL_TYPES.join(', ')}

Respond with ONLY a JSON object:
{"dispute_type": "<TYPE_CODE>"}`;

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent(prompt);
        const parsed = safeParseJSON<{ dispute_type: string }>(
            result.response.text(),
            { dispute_type: heuristic.type },
            'Classifier'
        );

        const disputeType = ALL_TYPES.includes(parsed.dispute_type) ? parsed.dispute_type : heuristic.type;
        const tier = determineTier(disputeType, amount, currency, 50, 50, [], []);
        return { dispute_type: disputeType, pipeline_tier: tier };
    } catch (err) {
        console.warn('⚠️ Gemini classifier failed, using heuristic:', (err as Error).message);
        const tier = determineTier(heuristic.type, amount, currency, 50, 50, [], []);
        return { dispute_type: heuristic.type, pipeline_tier: tier };
    }
}
