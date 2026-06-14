import { CRYPTO_CURRENCIES, AUTO_DISBURSE_THRESHOLDS, KYC_THRESHOLDS } from '../constants/payouts';

describe('payout constants', () => {
    describe('CRYPTO_CURRENCIES', () => {
        it('includes all expected crypto symbols', () => {
            expect(CRYPTO_CURRENCIES.has('BTC')).toBe(true);
            expect(CRYPTO_CURRENCIES.has('ETH')).toBe(true);
            expect(CRYPTO_CURRENCIES.has('USDT')).toBe(true);
            expect(CRYPTO_CURRENCIES.has('USDC')).toBe(true);
            expect(CRYPTO_CURRENCIES.has('SOL')).toBe(true);
        });

        it('does not include fiat currencies', () => {
            expect(CRYPTO_CURRENCIES.has('NGN')).toBe(false);
            expect(CRYPTO_CURRENCIES.has('USD')).toBe(false);
            expect(CRYPTO_CURRENCIES.has('EUR')).toBe(false);
        });
    });

    describe('AUTO_DISBURSE_THRESHOLDS', () => {
        it('NGN threshold is 500,000', () => {
            expect(AUTO_DISBURSE_THRESHOLDS['NGN']).toBe(500_000);
        });

        it('USD threshold is 1,000', () => {
            expect(AUTO_DISBURSE_THRESHOLDS['USD']).toBe(1_000);
        });

        it('has entries for all major fiat currencies', () => {
            ['NGN', 'USD', 'EUR', 'GBP'].forEach(c => {
                expect(AUTO_DISBURSE_THRESHOLDS[c]).toBeDefined();
                expect(AUTO_DISBURSE_THRESHOLDS[c]).toBeGreaterThan(0);
            });
        });
    });

    describe('KYC_THRESHOLDS', () => {
        it('requires KYC at 100 USD', () => {
            expect(KYC_THRESHOLDS['USD']).toBe(100);
        });

        it('has entries for NGN and crypto', () => {
            expect(KYC_THRESHOLDS['NGN']).toBeGreaterThan(0);
            expect(KYC_THRESHOLDS['BTC']).toBeGreaterThan(0);
        });
    });
});
