export const CRYPTO_CURRENCIES = new Set(['BTC', 'ETH', 'USDT', 'USDC', 'SOL']);

export const AUTO_DISBURSE_THRESHOLDS: Record<string, number> = {
    NGN: 500_000,
    USD: 1_000,
    EUR: 1_000,
    GBP: 800,
};

export const KYC_THRESHOLDS: Record<string, number> = {
    USD: 100, NGN: 100_000, BTC: 0.002, USDT: 100, EUR: 100,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
    NGN: '₦', USD: '$', EUR: '€', GBP: '£',
    BTC: '₿', USDT: '₮', ETH: 'Ξ', USDC: '$',
};
