import * as flw from '../services/providers/flutterwaveTransfer';
import * as palmPay from '../services/providers/palmPay';

// Mock all external dependencies before importing the service under test
jest.mock('@safepal/shared', () => ({
    supabase: {
        from: jest.fn(),
        rpc: jest.fn(),
    },
}));
jest.mock('../services/providers/flutterwaveTransfer');
jest.mock('../services/providers/palmPay');
jest.mock('../services/notifications', () => ({
    routeNotification: jest.fn().mockResolvedValue(undefined),
    recordNotification: jest.fn().mockResolvedValue(undefined),
}));

import { supabase } from '@safepal/shared';
import { verifyBankAccount, disburseFunds, queryAndSyncStatus } from '../services/payout';

const mockedFlw = flw as jest.Mocked<typeof flw>;
const mockedPalmPay = palmPay as jest.Mocked<typeof palmPay>;
const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

// Helper to build a chainable Supabase query mock
function makeQueryChain(resolveValue: unknown) {
    const chain: Record<string, jest.Mock> = {};
    const methods = ['select', 'eq', 'in', 'gte', 'update', 'single', 'maybeSingle', 'order'];
    methods.forEach(m => {
        chain[m] = jest.fn().mockReturnValue(chain);
    });
    // Terminal call returns the promise
    chain['single'] = jest.fn().mockResolvedValue(resolveValue);
    chain['maybeSingle'] = jest.fn().mockResolvedValue(resolveValue);
    return chain;
}

beforeEach(() => {
    jest.clearAllMocks();
    // Default: PalmPay not configured
    mockedPalmPay.isConfigured.mockReturnValue(false);
});

// ─── verifyBankAccount routing ─────────────────────────────────────────────────

describe('verifyBankAccount', () => {
    it('uses Flutterwave when PalmPay is not configured', async () => {
        mockedPalmPay.isConfigured.mockReturnValue(false);
        mockedFlw.verifyBankAccount.mockResolvedValue({ accountName: 'JANE DOE', accountNumber: '1234567890', bankCode: '044' });

        const result = await verifyBankAccount('044', '1234567890', 'NGN');
        expect(mockedFlw.verifyBankAccount).toHaveBeenCalledWith('044', '1234567890');
        expect(mockedPalmPay.verifyBankAccount).not.toHaveBeenCalled();
        expect(result.accountName).toBe('JANE DOE');
    });

    it('uses PalmPay when NGN and PalmPay is configured', async () => {
        mockedPalmPay.isConfigured.mockReturnValue(true);
        mockedPalmPay.verifyBankAccount.mockResolvedValue({ accountName: 'JOHN PALM', accountNumber: '0987654321', bankCode: '033' });

        const result = await verifyBankAccount('033', '0987654321', 'NGN');
        expect(mockedPalmPay.verifyBankAccount).toHaveBeenCalledWith('033', '0987654321');
        expect(mockedFlw.verifyBankAccount).not.toHaveBeenCalled();
        expect(result.accountName).toBe('JOHN PALM');
    });

    it('uses Flutterwave for USD even if PalmPay is configured', async () => {
        mockedPalmPay.isConfigured.mockReturnValue(true);
        mockedFlw.verifyBankAccount.mockResolvedValue({ accountName: 'USD ACCOUNT', accountNumber: '1111111111', bankCode: 'US001' });

        await verifyBankAccount('US001', '1111111111', 'USD');
        expect(mockedFlw.verifyBankAccount).toHaveBeenCalled();
        expect(mockedPalmPay.verifyBankAccount).not.toHaveBeenCalled();
    });
});

// ─── disburseFunds ─────────────────────────────────────────────────────────────

function buildWithdrawalRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 'wd-test-001',
        profile_id: 'profile-abc',
        amount: 50000,
        currency: 'NGN',
        reference: 'WD-ABCD1234',
        status: 'PROCESSING',
        idempotency_key: 'uuid-idempotency-key',
        provider_order_no: null,
        details: { bankCode: '044', accountNumber: '0123456789', verifiedAccountName: 'JOHN DOE' },
        payout_method: { type: 'bank', details: {} },
        ...overrides,
    };
}

function setupSupabaseForDisburse(row: ReturnType<typeof buildWithdrawalRow>) {
    const selectChain: Record<string, jest.Mock> = {
        select: jest.fn(),
        eq: jest.fn(),
        single: jest.fn().mockResolvedValue({ data: row, error: null }),
    };
    selectChain.select.mockReturnValue(selectChain);
    selectChain.eq.mockReturnValue(selectChain);

    const updateChain: Record<string, jest.Mock> = {
        update: jest.fn(),
        eq: jest.fn().mockResolvedValue({ error: null }),
    };
    updateChain.update.mockReturnValue(updateChain);

    (mockedSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'withdrawals') {
            return {
                select: selectChain.select,
                update: updateChain.update,
            };
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
    });
}

describe('disburseFunds', () => {
    it('skips PAID withdrawals', async () => {
        setupSupabaseForDisburse(buildWithdrawalRow({ status: 'PAID' }));
        await disburseFunds('wd-test-001');
        expect(mockedFlw.initiatePayout).not.toHaveBeenCalled();
    });

    it('skips FAILED withdrawals', async () => {
        setupSupabaseForDisburse(buildWithdrawalRow({ status: 'FAILED' }));
        await disburseFunds('wd-test-001');
        expect(mockedFlw.initiatePayout).not.toHaveBeenCalled();
    });

    it('returns early and logs for crypto currency', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        setupSupabaseForDisburse(buildWithdrawalRow({ currency: 'USDT', payout_method: { type: 'crypto' } }));

        await disburseFunds('wd-test-001');

        expect(mockedFlw.initiatePayout).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('requires admin action'));
        consoleSpy.mockRestore();
    });

    it('calls Flutterwave for NGN bank payout when PalmPay not configured', async () => {
        mockedPalmPay.isConfigured.mockReturnValue(false);
        mockedFlw.initiatePayout.mockResolvedValue({
            providerTransferId: '99901',
            providerOrderNo: 'uuid-idempotency-key',
            status: 'PENDING',
            rawResponse: {},
        });

        setupSupabaseForDisburse(buildWithdrawalRow());
        await disburseFunds('wd-test-001');

        expect(mockedFlw.initiatePayout).toHaveBeenCalledWith(
            expect.objectContaining({
                orderId: 'uuid-idempotency-key',
                bankCode: '044',
                accountNumber: '0123456789',
                accountName: 'JOHN DOE',
                amount: 50000,
                currency: 'NGN',
            })
        );
    });

    it('calls PalmPay for NGN bank payout when PalmPay is configured', async () => {
        mockedPalmPay.isConfigured.mockReturnValue(true);
        mockedPalmPay.initiatePayout.mockResolvedValue({
            providerTransferId: 'PP-99901',
            providerOrderNo: 'uuid-idempotency-key',
            status: 'PENDING',
            rawResponse: { respCode: '00000000' },
        });

        setupSupabaseForDisburse(buildWithdrawalRow());
        await disburseFunds('wd-test-001');

        expect(mockedPalmPay.initiatePayout).toHaveBeenCalled();
        expect(mockedFlw.initiatePayout).not.toHaveBeenCalled();
    });

    it('sets status PAID and settled_at when provider returns SUCCESS', async () => {
        mockedPalmPay.isConfigured.mockReturnValue(false);
        mockedFlw.initiatePayout.mockResolvedValue({
            providerTransferId: '99901',
            providerOrderNo: 'uuid-idempotency-key',
            status: 'SUCCESS',
            rawResponse: { status: 'SUCCESSFUL' },
        });

        const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
        const row = buildWithdrawalRow();
        const chain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: row, error: null }),
            update: updateMock,
        };
        (mockedSupabase.from as jest.Mock).mockReturnValue(chain);

        await disburseFunds('wd-test-001');

        const statusUpdate = updateMock.mock.calls.find((call: unknown[]) => {
            const obj = call[0] as Record<string, unknown>;
            return obj.status === 'PAID';
        });
        expect(statusUpdate).toBeDefined();
        expect((statusUpdate![0] as Record<string, unknown>).settled_at).toBeDefined();
    });

    it('sets status FAILED when provider returns FAIL', async () => {
        mockedPalmPay.isConfigured.mockReturnValue(false);
        mockedFlw.initiatePayout.mockResolvedValue({
            providerTransferId: null,
            providerOrderNo: null,
            status: 'FAIL',
            rawResponse: { status: 'FAILED' },
        });

        const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
        const row = buildWithdrawalRow();
        const chain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: row, error: null }),
            update: updateMock,
        };
        (mockedSupabase.from as jest.Mock).mockReturnValue(chain);

        await disburseFunds('wd-test-001');

        const failUpdate = updateMock.mock.calls.find((call: unknown[]) => {
            const obj = call[0] as Record<string, unknown>;
            return obj.status === 'FAILED';
        });
        expect(failUpdate).toBeDefined();
    });

    it('handles not found withdrawal gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (mockedSupabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        });

        await disburseFunds('nonexistent-id');

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
        expect(mockedFlw.initiatePayout).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

// ─── queryAndSyncStatus ────────────────────────────────────────────────────────

describe('queryAndSyncStatus', () => {
    it('skips non-PROCESSING withdrawals', async () => {
        (mockedSupabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { status: 'PAID', currency: 'NGN' } }),
        });

        await queryAndSyncStatus('wd-test-001');
        expect(mockedFlw.queryPayoutStatus).not.toHaveBeenCalled();
    });

    it('updates to PAID when provider returns SUCCESS', async () => {
        const row = { id: 'wd-001', status: 'PROCESSING', currency: 'NGN', provider_order_no: '99901', idempotency_key: 'uuid-key', profile_id: 'p1', amount: 10000, reference: 'WD-ABC' };

        const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
        (mockedSupabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: row }),
            update: updateMock,
        });

        mockedPalmPay.isConfigured.mockReturnValue(false);
        mockedFlw.queryPayoutStatus.mockResolvedValue({ status: 'SUCCESS', providerTransferId: '99901', failureReason: null });

        await queryAndSyncStatus('wd-001');

        expect(mockedFlw.queryPayoutStatus).toHaveBeenCalledWith('99901');
        const paidUpdate = updateMock.mock.calls.find((call: unknown[]) => {
            const obj = call[0] as Record<string, unknown>;
            return obj.status === 'PAID';
        });
        expect(paidUpdate).toBeDefined();
    });

    it('updates to FAILED when provider returns FAIL with reason', async () => {
        const row = { id: 'wd-002', status: 'PROCESSING', currency: 'NGN', provider_order_no: '99902', idempotency_key: 'uuid-key-2', profile_id: 'p2', amount: 5000, reference: 'WD-DEF' };

        const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
        (mockedSupabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: row }),
            update: updateMock,
        });

        mockedFlw.queryPayoutStatus.mockResolvedValue({ status: 'FAIL', providerTransferId: null, failureReason: 'Account closed' });

        await queryAndSyncStatus('wd-002');

        const failedUpdate = updateMock.mock.calls.find((call: unknown[]) => {
            const obj = call[0] as Record<string, unknown>;
            return obj.status === 'FAILED';
        });
        expect(failedUpdate).toBeDefined();
        expect((failedUpdate![0] as Record<string, unknown>).failure_reason).toBe('Account closed');
    });

    it('does not update for PENDING provider status', async () => {
        const row = { id: 'wd-003', status: 'PROCESSING', currency: 'NGN', provider_order_no: '99903', idempotency_key: null, profile_id: 'p3', amount: 7500, reference: 'WD-GHI' };

        const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
        (mockedSupabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: row }),
            update: updateMock,
        });

        mockedFlw.queryPayoutStatus.mockResolvedValue({ status: 'PENDING', providerTransferId: '99903', failureReason: null });

        await queryAndSyncStatus('wd-003');

        expect(updateMock).not.toHaveBeenCalled();
    });
});
