import axios from 'axios';
import { verifyBankAccount, initiatePayout, queryPayoutStatus } from '../services/providers/flutterwaveTransfer';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
    process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK_TEST-test';
    jest.clearAllMocks();
});

// ─── verifyBankAccount ─────────────────────────────────────────────────────────

describe('verifyBankAccount', () => {
    it('returns verified account name on success', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { status: 'success', data: { account_name: 'JOHN DOE', account_number: '0123456789' } },
        });

        const result = await verifyBankAccount('044', '0123456789');
        expect(result.accountName).toBe('JOHN DOE');
        expect(result.accountNumber).toBe('0123456789');
        expect(result.bankCode).toBe('044');
    });

    it('throws when Flutterwave returns non-success status', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { status: 'error', message: 'Account not found' },
        });

        await expect(verifyBankAccount('044', '9999999999')).rejects.toThrow('Account not found');
    });

    it('throws when account_name is missing from response', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { status: 'success', data: {} },
        });

        await expect(verifyBankAccount('044', '0000000000')).rejects.toThrow();
    });

    it('posts to the correct Flutterwave endpoint', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { status: 'success', data: { account_name: 'TEST USER' } },
        });

        await verifyBankAccount('011', '1234567890');
        expect(mockedAxios.post).toHaveBeenCalledWith(
            'https://api.flutterwave.com/v3/accounts/resolve',
            { account_number: '1234567890', account_bank: '011' },
            expect.objectContaining({ headers: { Authorization: 'Bearer FLWSECK_TEST-test' } })
        );
    });
});

// ─── initiatePayout ────────────────────────────────────────────────────────────

describe('initiatePayout', () => {
    const baseOpts = {
        orderId: 'uuid-abc-123',
        bankCode: '044',
        accountNumber: '0123456789',
        accountName: 'JOHN DOE',
        amount: 50000,
        currency: 'NGN',
        narration: 'Safeeely payout WD-UUID123',
    };

    it('maps SUCCESSFUL status to SUCCESS', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { data: { id: 99901, status: 'SUCCESSFUL', reference: 'uuid-abc-123' } },
        });

        const result = await initiatePayout(baseOpts);
        expect(result.status).toBe('SUCCESS');
        expect(result.providerTransferId).toBe('99901');
    });

    it('maps FAILED status to FAIL', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { data: { id: 99902, status: 'FAILED', reference: 'uuid-abc-123' } },
        });

        const result = await initiatePayout(baseOpts);
        expect(result.status).toBe('FAIL');
    });

    it('maps NEW/PENDING status to PENDING', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { data: { id: 99903, status: 'NEW', reference: 'uuid-abc-123' } },
        });

        const result = await initiatePayout(baseOpts);
        expect(result.status).toBe('PENDING');
    });

    it('stores the numeric Flutterwave ID in providerTransferId', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { data: { id: 12345, status: 'NEW', reference: 'my-ref' } },
        });

        const result = await initiatePayout(baseOpts);
        // providerTransferId must be numeric ID (for GET /v3/transfers/:id reconciliation)
        expect(result.providerTransferId).toBe('12345');
        // providerOrderNo is the reference string (for webhook matching)
        expect(result.providerOrderNo).toBe('my-ref');
    });

    it('includes callback_url when provided', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { data: { id: 1, status: 'NEW' } },
        });

        await initiatePayout({ ...baseOpts, callbackUrl: 'https://api.example.com/webhook' });
        const payload = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;
        expect(payload.callback_url).toBe('https://api.example.com/webhook');
    });

    it('omits callback_url when not provided', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { data: { id: 1, status: 'NEW' } },
        });

        await initiatePayout(baseOpts);
        const payload = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;
        expect(payload.callback_url).toBeUndefined();
    });
});

// ─── queryPayoutStatus ─────────────────────────────────────────────────────────

describe('queryPayoutStatus', () => {
    it('queries GET /v3/transfers/:id with the numeric ID', async () => {
        mockedAxios.get.mockResolvedValueOnce({
            data: { data: { id: 99901, status: 'SUCCESSFUL', complete_message: null } },
        });

        const result = await queryPayoutStatus('99901');
        expect(mockedAxios.get).toHaveBeenCalledWith(
            'https://api.flutterwave.com/v3/transfers/99901',
            expect.anything()
        );
        expect(result.status).toBe('SUCCESS');
    });

    it('returns failureReason from complete_message', async () => {
        mockedAxios.get.mockResolvedValueOnce({
            data: { data: { id: 99902, status: 'FAILED', complete_message: 'Beneficiary account invalid' } },
        });

        const result = await queryPayoutStatus('99902');
        expect(result.status).toBe('FAIL');
        expect(result.failureReason).toBe('Beneficiary account invalid');
    });

    it('returns PENDING for unresolved status', async () => {
        mockedAxios.get.mockResolvedValueOnce({
            data: { data: { id: 99903, status: 'PENDING', complete_message: null } },
        });

        const result = await queryPayoutStatus('99903');
        expect(result.status).toBe('PENDING');
        expect(result.failureReason).toBeNull();
    });
});
