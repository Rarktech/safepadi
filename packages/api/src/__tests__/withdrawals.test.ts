/**
 * Tests for withdrawal business-logic constants and guard functions.
 * We test the critical branching rules (velocity, approval gate, KYC) in isolation
 * since the full route depends on Supabase + auth middleware.
 */

import { CRYPTO_CURRENCIES, AUTO_DISBURSE_THRESHOLDS, KYC_THRESHOLDS } from '../constants/payouts';

// ─── Dual-approval gate ────────────────────────────────────────────────────────

/**
 * Mirrors the exact gate logic from withdrawals.ts:78-79
 */
function requiresApprovalGate(currency: string, amount: number): boolean {
    const isCrypto = CRYPTO_CURRENCIES.has(currency);
    return isCrypto || amount > (AUTO_DISBURSE_THRESHOLDS[currency] ?? 500);
}

describe('dual-approval gate', () => {
    it('requires approval for all crypto currencies regardless of amount', () => {
        ['BTC', 'ETH', 'USDT', 'USDC', 'SOL'].forEach(c => {
            expect(requiresApprovalGate(c, 1)).toBe(true);
            expect(requiresApprovalGate(c, 0.000001)).toBe(true);
            expect(requiresApprovalGate(c, 999999)).toBe(true);
        });
    });

    it('auto-disburses NGN ≤ 500,000', () => {
        expect(requiresApprovalGate('NGN', 500_000)).toBe(false);
        expect(requiresApprovalGate('NGN', 100_000)).toBe(false);
        expect(requiresApprovalGate('NGN', 1)).toBe(false);
    });

    it('requires approval for NGN > 500,000', () => {
        expect(requiresApprovalGate('NGN', 500_001)).toBe(true);
        expect(requiresApprovalGate('NGN', 1_000_000)).toBe(true);
    });

    it('auto-disburses USD ≤ 1,000', () => {
        expect(requiresApprovalGate('USD', 1_000)).toBe(false);
        expect(requiresApprovalGate('USD', 500)).toBe(false);
    });

    it('requires approval for USD > 1,000', () => {
        expect(requiresApprovalGate('USD', 1_001)).toBe(true);
    });

    it('uses 500 as fallback threshold for unknown currencies', () => {
        expect(requiresApprovalGate('XYZ', 500)).toBe(false);
        expect(requiresApprovalGate('XYZ', 501)).toBe(true);
    });
});

// ─── KYC gate ──────────────────────────────────────────────────────────────────

/**
 * Mirrors the KYC check from withdrawals.ts:35-41
 */
function kycGateFails(kycStatus: string, amount: number, currency: string): boolean {
    const threshold = KYC_THRESHOLDS[currency] ?? 100;
    return kycStatus !== 'VERIFIED' && amount > threshold;
}

describe('KYC gate', () => {
    it('allows unverified user below USD threshold', () => {
        expect(kycGateFails('UNVERIFIED', 100, 'USD')).toBe(false);
        expect(kycGateFails('UNVERIFIED', 50, 'USD')).toBe(false);
    });

    it('blocks unverified user above USD threshold', () => {
        expect(kycGateFails('UNVERIFIED', 101, 'USD')).toBe(true);
    });

    it('allows verified user above threshold', () => {
        expect(kycGateFails('VERIFIED', 99999, 'USD')).toBe(false);
        expect(kycGateFails('VERIFIED', 1_000_000, 'NGN')).toBe(false);
    });

    it('allows unverified user below NGN threshold', () => {
        // KYC_THRESHOLDS.NGN = 100,000
        expect(kycGateFails('UNVERIFIED', 100_000, 'NGN')).toBe(false);
        expect(kycGateFails('UNVERIFIED', 50_000, 'NGN')).toBe(false);
    });

    it('blocks unverified user above NGN threshold', () => {
        expect(kycGateFails('UNVERIFIED', 100_001, 'NGN')).toBe(true);
    });

    it('allows PENDING_VERIFICATION user below threshold (not yet KYC gated)', () => {
        expect(kycGateFails('PENDING', 99, 'USD')).toBe(false);
    });

    it('uses 100 as fallback threshold for unknown currencies', () => {
        expect(kycGateFails('UNVERIFIED', 100, 'XYZ')).toBe(false);
        expect(kycGateFails('UNVERIFIED', 101, 'XYZ')).toBe(true);
    });
});

// ─── Velocity limit calculations ───────────────────────────────────────────────

/**
 * Mirrors the daily amount velocity check from withdrawals.ts:60-75
 */
function dailyLimitExceeded(
    currency: string,
    newAmount: number,
    existingAmounts: number[]
): boolean {
    const autoThreshold = AUTO_DISBURSE_THRESHOLDS[currency] ?? 500;
    const recent24hTotal = existingAmounts.reduce((s, a) => s + a, 0);
    return recent24hTotal + newAmount > autoThreshold * 2;
}

describe('velocity limits (daily amount cap)', () => {
    it('allows first withdrawal under NGN 1,000,000 daily cap', () => {
        expect(dailyLimitExceeded('NGN', 500_000, [])).toBe(false);
        expect(dailyLimitExceeded('NGN', 999_999, [])).toBe(false);
    });

    it('blocks when new + existing exceeds NGN 1,000,000 (2x threshold)', () => {
        expect(dailyLimitExceeded('NGN', 1, [1_000_000])).toBe(true);
        expect(dailyLimitExceeded('NGN', 600_000, [500_000])).toBe(true);
    });

    it('allows cumulative withdrawals up to the daily cap', () => {
        expect(dailyLimitExceeded('NGN', 500_000, [500_000])).toBe(false);  // exactly at cap
    });

    it('allows first USD withdrawal up to $2,000 cap', () => {
        expect(dailyLimitExceeded('USD', 2_000, [])).toBe(false);
        expect(dailyLimitExceeded('USD', 1_000, [1_000])).toBe(false);
    });

    it('blocks USD withdrawal when daily cap exceeded', () => {
        expect(dailyLimitExceeded('USD', 1, [2_000])).toBe(true);
        expect(dailyLimitExceeded('USD', 1_500, [1_000])).toBe(true);
    });

    it('uses 1,000 (2x500) as daily cap for unknown currencies', () => {
        expect(dailyLimitExceeded('XYZ', 1_000, [])).toBe(false);
        expect(dailyLimitExceeded('XYZ', 1_001, [])).toBe(true);
    });
});

// ─── Pending count velocity limit ──────────────────────────────────────────────

/**
 * Mirrors the pending-count check from withdrawals.ts:53-57
 */
function pendingCountExceeded(count: number): boolean {
    return count >= 3;
}

describe('velocity limits (pending count cap)', () => {
    it('allows up to 2 pending withdrawals', () => {
        expect(pendingCountExceeded(0)).toBe(false);
        expect(pendingCountExceeded(1)).toBe(false);
        expect(pendingCountExceeded(2)).toBe(false);
    });

    it('blocks when 3 or more are pending', () => {
        expect(pendingCountExceeded(3)).toBe(true);
        expect(pendingCountExceeded(10)).toBe(true);
    });
});
