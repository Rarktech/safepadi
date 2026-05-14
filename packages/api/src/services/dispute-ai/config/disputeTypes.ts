export type DisputeTypeCode =
    | 'INSTAGRAM_ACCOUNT'
    | 'DISCORD_ACCOUNT'
    | 'TELEGRAM_ACCOUNT'
    | 'GMAIL_ACCOUNT'
    | 'FREELANCE_CODE'
    | 'FREELANCE_DESIGN'
    | 'FREELANCE_WRITING'
    | 'CRYPTO_TO_GOODS'
    | 'PHYSICAL_GOODS'
    | 'SOCIAL_SERVICE'
    | 'GENERIC';

export interface DisputeTypeConfig {
    domain: string;
    tier1Evidence: string[];
    defaultBurden: 'BUYER' | 'SELLER' | 'BOTH';
    burdenReason: string;
    irreversibleAsset: boolean;
}

export const DISPUTE_TYPES: Record<DisputeTypeCode, DisputeTypeConfig> = {
    INSTAGRAM_ACCOUNT: {
        domain: 'Instagram handle/account sale',
        tier1Evidence: ['LOGIN_CSV', 'OGE_EMAIL', 'ACTIVE_SESSIONS'],
        defaultBurden: 'BUYER',
        burdenReason: 'Digital handover is irreversible — buyer must prove non-utility, not seller.',
        irreversibleAsset: true
    },
    DISCORD_ACCOUNT: {
        domain: 'Discord account or server sale',
        tier1Evidence: ['AUDIT_LOG', 'ACCOUNT_STANDING', 'ACTIVE_SESSIONS'],
        defaultBurden: 'SELLER',
        burdenReason: 'Password reset is reversible in a short window — seller must prove full credential handover.',
        irreversibleAsset: false
    },
    TELEGRAM_ACCOUNT: {
        domain: 'Telegram channel, group, or account sale',
        tier1Evidence: ['ACTIVE_SESSIONS', 'FORWARDED_META', 'ADMIN_LOG'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller can retain a second active session — must prove all sessions terminated post-sale.',
        irreversibleAsset: false
    },
    GMAIL_ACCOUNT: {
        domain: 'Google/Gmail account sale',
        tier1Evidence: ['LAST_ACCOUNT_ACTIVITY', 'SECURITY_EVENT_LOG', 'RECOVERY_EMAIL_PROOF'],
        defaultBurden: 'SELLER',
        burdenReason: 'Google recovery options retained by seller can reverse access — highest burden on seller.',
        irreversibleAsset: false
    },
    FREELANCE_CODE: {
        domain: 'Code or software delivery',
        tier1Evidence: ['GIT_COMMIT_HASH', 'REPO_COLLABORATOR_PROOF', 'DEPLOY_LOGS'],
        defaultBurden: 'BUYER',
        burdenReason: 'Buyer claiming defect must demonstrate it; seller already delivered.',
        irreversibleAsset: false
    },
    FREELANCE_DESIGN: {
        domain: 'Design file delivery',
        tier1Evidence: ['FIGMA_VERSION_HISTORY', 'FILE_METADATA', 'ORIGINAL_BRIEF'],
        defaultBurden: 'BOTH',
        burdenReason: 'Scope disputes require both parties to produce the original brief.',
        irreversibleAsset: false
    },
    FREELANCE_WRITING: {
        domain: 'Article or copy delivery',
        tier1Evidence: ['DOCUMENT_VERSION_HISTORY', 'PLAGIARISM_SCAN', 'ORIGINAL_BRIEF'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove originality and delivery of agreed scope.',
        irreversibleAsset: false
    },
    CRYPTO_TO_GOODS: {
        domain: 'Crypto payment for goods or services',
        tier1Evidence: ['TX_HASH', 'BLOCK_CONFIRMATION', 'WALLET_SCREENSHOT'],
        defaultBurden: 'BUYER',
        burdenReason: 'On-chain verification is definitive — buyer must prove non-receipt or wrong address.',
        irreversibleAsset: true
    },
    PHYSICAL_GOODS: {
        domain: 'Physical goods sale and delivery',
        tier1Evidence: ['CARRIER_TRACKING', 'PROOF_OF_DELIVERY', 'UNBOXING_VIDEO'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove physical delivery via carrier records.',
        irreversibleAsset: false
    },
    SOCIAL_SERVICE: {
        domain: 'Social media followers, views, or engagement service',
        tier1Evidence: ['PLATFORM_ANALYTICS_BEFORE_AFTER', 'TIMESTAMPED_SCREENSHOT'],
        defaultBurden: 'SELLER',
        burdenReason: 'Seller must prove delivery of agreed metrics via platform analytics.',
        irreversibleAsset: false
    },
    GENERIC: {
        domain: 'General escrow dispute',
        tier1Evidence: ['ANY_VERIFIABLE_PROOF'],
        defaultBurden: 'BOTH',
        burdenReason: 'Both parties bear equal burden absent type-specific rules.',
        irreversibleAsset: false
    }
};

// Platform-specific navigation paths for evidence requests — no AI hallucination needed
export const EVIDENCE_HOW_TO: Record<string, Record<string, string>> = {
    INSTAGRAM_ACCOUNT: {
        LOGIN_CSV: 'On desktop: Settings & privacy → Accounts Center → Password and security → Login activity → "..." menu → Download data. Upload the resulting CSV file.',
        OGE_EMAIL: 'Open the email inbox tied to the account. Search "instagram.com email change". Forward that email as an attachment (not a screenshot) so email headers are preserved.',
        ACTIVE_SESSIONS: 'Settings & privacy → Accounts Center → Password and security → Where you\'re logged in. Screenshot the full list with timestamps visible.'
    },
    DISCORD_ACCOUNT: {
        AUDIT_LOG: 'Server Settings → Audit Log, filtered to the last 7 days. Screenshot with timestamps visible.',
        ACCOUNT_STANDING: 'User Settings → Account Standing. Screenshot the full page.',
        ACTIVE_SESSIONS: 'User Settings → Devices. Screenshot all logged-in devices with timestamps.'
    },
    TELEGRAM_ACCOUNT: {
        ACTIVE_SESSIONS: 'Settings → Privacy and Security → Active Sessions. Screenshot the full list.',
        FORWARDED_META: 'Forward a recent message from the channel/account to yourself and screenshot — metadata shows original ownership.',
        ADMIN_LOG: 'Channel/Group → Members → Administrators → Recent Actions. Screenshot last 7 days.'
    },
    GMAIL_ACCOUNT: {
        LAST_ACCOUNT_ACTIVITY: 'At the bottom of Gmail, click "Details" under Last Account Activity. Screenshot the full IP log with timestamps.',
        SECURITY_EVENT_LOG: 'Google Account → Security → Recent security events. Screenshot the full page.',
        RECOVERY_EMAIL_PROOF: 'Google Account → Security → Recovery email. Screenshot showing the recovery address was changed to the buyer\'s email.'
    },
    FREELANCE_CODE: {
        GIT_COMMIT_HASH: 'Copy the commit hash from GitHub/GitLab. Go to the repo → Commits → click the commit → copy the full 40-character hash from the URL.',
        REPO_COLLABORATOR_PROOF: 'Repo Settings → Collaborators → screenshot showing buyer\'s username was added.',
        DEPLOY_LOGS: 'From your CI/CD pipeline (Vercel, Netlify, GitHub Actions) — screenshot the successful build/deploy log with timestamp.'
    },
    BLOCKCHAIN: {
        TX_HASH: 'Paste the transaction hash from your wallet (starts with 0x for Ethereum/BSC, or long alphanumeric for Bitcoin/USDT). We verify it on-chain directly — no screenshot needed.',
        BLOCK_CONFIRMATION: 'On a block explorer (etherscan.io, bscscan.com, blockchain.info), search your TX hash and screenshot the full page showing confirmation count and recipient address.'
    },
    PHYSICAL_GOODS: {
        CARRIER_TRACKING: 'On the carrier website (DHL, FedEx, USPS, etc.), paste the tracking number and screenshot the full delivery history.',
        PROOF_OF_DELIVERY: 'On the carrier portal, download the signed Proof of Delivery PDF and upload the full document.',
        UNBOXING_VIDEO: 'Record a clear, uncut video showing the package seal intact, then opening to reveal contents. Upload the video file (not a link).'
    }
};

export interface TierHintResult {
    tier: 1 | 2 | 3;
    tags: string[];
}

// Deterministic pre-classification of evidence tier — runs on every message, zero AI cost
export function quickTierHint(content: string, attachments: any[]): TierHintResult {
    const tags: string[] = [];

    // Tier 1 — verifiable, metadata-rich
    if (/0x[a-f0-9]{40,}/i.test(content) || /\b[a-f0-9]{64}\b/i.test(content)) tags.push('BLOCKCHAIN_TX');
    if (attachments.some((a: any) => /\.csv$/i.test(a.name || ''))) tags.push('CSV_EXPORT');
    if (attachments.some((a: any) => /\.(har|log)$/i.test(a.name || ''))) tags.push('API_LOG');
    if (attachments.some((a: any) =>
        /\.(mp4|mov|webm|avi)$/i.test(a.name || '') && (a.size || 0) > 1_000_000
    )) tags.push('SCREEN_RECORDING');

    // Tier 2 — third-party, some verifiability
    if (attachments.some((a: any) => a.type?.startsWith('image/') && (a.size || 0) > 500_000)) tags.push('HIGH_RES_PHOTO');
    else if (attachments.some((a: any) => a.type?.startsWith('image/'))) tags.push('SCREENSHOT');

    const TIER1 = new Set(['BLOCKCHAIN_TX', 'CSV_EXPORT', 'API_LOG', 'SCREEN_RECORDING']);
    const TIER2 = new Set(['HIGH_RES_PHOTO', 'SCREENSHOT']);

    let tier: 1 | 2 | 3 = 3;
    if (tags.some(t => TIER1.has(t))) tier = 1;
    else if (tags.some(t => TIER2.has(t))) tier = 2;

    return { tier, tags };
}

// Heuristic pre-classifier — free, used before calling Gemini
export function platformHeuristicGuess(
    productName: string,
    buyerPlatform: string,
    sellerPlatform: string
): { type: DisputeTypeCode; confidence: number } {
    const p = productName.toLowerCase();

    if (/instagram|ig account|ig handle|ig page/.test(p)) return { type: 'INSTAGRAM_ACCOUNT', confidence: 0.9 };
    if (/discord/.test(p) || buyerPlatform === 'discord' || sellerPlatform === 'discord') return { type: 'DISCORD_ACCOUNT', confidence: 0.85 };
    if (/telegram|tg channel|tg group|tg bot/.test(p)) return { type: 'TELEGRAM_ACCOUNT', confidence: 0.9 };
    if (/gmail|google account/.test(p)) return { type: 'GMAIL_ACCOUNT', confidence: 0.9 };
    if (/0x[a-f0-9]{10,}|crypto|bitcoin|btc|ethereum|eth|usdt|binance/.test(p)) return { type: 'CRYPTO_TO_GOODS', confidence: 0.9 };
    if (/followers|views|likes|engagement|social media growth/.test(p)) return { type: 'SOCIAL_SERVICE', confidence: 0.85 };
    if (/code|software|app|website|bot|script|api|development/.test(p)) return { type: 'FREELANCE_CODE', confidence: 0.75 };
    if (/design|logo|figma|ui\/ux|graphic|banner|illustration/.test(p)) return { type: 'FREELANCE_DESIGN', confidence: 0.75 };
    if (/article|writing|copy|content|blog|seo|text/.test(p)) return { type: 'FREELANCE_WRITING', confidence: 0.75 };
    if (/shipping|delivery|physical|product|item|goods/.test(p)) return { type: 'PHYSICAL_GOODS', confidence: 0.7 };

    return { type: 'GENERIC', confidence: 0.5 };
}
