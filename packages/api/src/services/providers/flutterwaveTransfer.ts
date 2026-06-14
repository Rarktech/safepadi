import axios from 'axios';

const FLW_BASE = 'https://api.flutterwave.com/v3';

function headers() {
    return { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` };
}

export interface VerifyResult {
    accountName: string;
    accountNumber: string;
    bankCode: string;
}

export interface PayoutOpts {
    orderId: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    currency: string;
    narration: string;
    callbackUrl?: string;
}

export interface PayoutResult {
    providerTransferId: string | null;
    providerOrderNo: string | null;
    status: 'SUCCESS' | 'PENDING' | 'FAIL';
    rawResponse: object;
}

export interface PayoutStatus {
    status: 'SUCCESS' | 'PENDING' | 'FAIL';
    providerTransferId: string | null;
    failureReason: string | null;
}

export async function verifyBankAccount(bankCode: string, accountNumber: string): Promise<VerifyResult> {
    const res = await axios.post(
        `${FLW_BASE}/accounts/resolve`,
        { account_number: accountNumber, account_bank: bankCode },
        { headers: headers() }
    );
    if (res.data?.status !== 'success' || !res.data?.data?.account_name) {
        throw new Error(res.data?.message || 'Account not found');
    }
    return {
        accountName: res.data.data.account_name as string,
        accountNumber,
        bankCode,
    };
}

export async function initiatePayout(opts: PayoutOpts): Promise<PayoutResult> {
    const payload: Record<string, unknown> = {
        account_bank: opts.bankCode,
        account_number: opts.accountNumber,
        amount: opts.amount,
        currency: opts.currency,
        narration: opts.narration,
        reference: opts.orderId,
        debit_currency: opts.currency,
    };
    if (opts.callbackUrl) payload.callback_url = opts.callbackUrl;

    const res = await axios.post(`${FLW_BASE}/transfers`, payload, { headers: headers() });
    const d = res.data?.data as { id?: number; status?: string; reference?: string; complete_message?: string } | undefined;
    const flwStatus = (d?.status ?? '').toUpperCase();

    let status: 'SUCCESS' | 'PENDING' | 'FAIL';
    if (flwStatus === 'SUCCESSFUL' || flwStatus === 'SUCCESS') status = 'SUCCESS';
    else if (flwStatus === 'FAILED' || flwStatus === 'FAIL') status = 'FAIL';
    else status = 'PENDING';

    // providerTransferId = Flutterwave numeric ID (used for GET /v3/transfers/:id in reconciliation)
    // providerOrderNo   = our reference string (echoed back; used for webhook matching)
    return {
        providerTransferId: d?.id != null ? String(d.id) : null,
        providerOrderNo: d?.reference ?? opts.orderId,
        status,
        rawResponse: res.data as object,
    };
}

export async function queryPayoutStatus(transferId: string): Promise<PayoutStatus> {
    const res = await axios.get(`${FLW_BASE}/transfers/${transferId}`, { headers: headers() });
    const d = res.data?.data as { id?: number; status?: string; complete_message?: string } | undefined;
    const flwStatus = (d?.status ?? '').toUpperCase();

    let status: 'SUCCESS' | 'PENDING' | 'FAIL';
    if (flwStatus === 'SUCCESSFUL' || flwStatus === 'SUCCESS') status = 'SUCCESS';
    else if (flwStatus === 'FAILED' || flwStatus === 'FAIL') status = 'FAIL';
    else status = 'PENDING';

    return {
        status,
        providerTransferId: d?.id != null ? String(d.id) : null,
        failureReason: d?.complete_message ?? null,
    };
}

export async function getBankList(): Promise<{ code: string; name: string }[]> {
    const res = await axios.get(`${FLW_BASE}/banks/NG?per_page=150`, { headers: headers() });
    return (res.data?.data ?? []).map((b: { code: string; name: string }) => ({ code: b.code, name: b.name }));
}

export const name = 'FlutterwaveTransfer';
