import crypto from 'crypto';
import axios from 'axios';

// PalmPay open-gateway uses RSA SHA256withRSA signing.
// This provider is activated only when PALMPAY_APP_ID env var is present.
// All endpoint paths and field names must be verified against the PalmPay onboarding pack.

const BASE_URL = () => process.env.PALMPAY_BASE_URL || 'https://open-gw-daily.palmpay-inc.com';

export function isConfigured(): boolean {
    return !!(process.env.PALMPAY_APP_ID && process.env.PALMPAY_PRIVATE_KEY && process.env.PALMPAY_PUBLIC_KEY);
}

function buildCanonicalString(params: Record<string, unknown>): string {
    return Object.keys(params)
        .filter(k => params[k] !== null && params[k] !== undefined && params[k] !== '')
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&');
}

function signRequest(params: Record<string, unknown>): string {
    const privateKey = process.env.PALMPAY_PRIVATE_KEY!;
    const canonical = buildCanonicalString(params);
    const sign = crypto.createSign('SHA256');
    sign.update(canonical);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

export function verifyWebhook(rawBody: string, signature: string): boolean {
    try {
        const publicKey = process.env.PALMPAY_PUBLIC_KEY!;
        const verify = crypto.createVerify('SHA256');
        verify.update(rawBody);
        verify.end();
        return verify.verify(publicKey, signature, 'base64');
    } catch {
        return false;
    }
}

function baseParams(): Record<string, unknown> {
    return {
        requestTime: Date.now(),
        version: 'V2.0',
        nonceStr: crypto.randomBytes(8).toString('hex'),
        countryCode: 'NG',
        merchantId: process.env.PALMPAY_MERCHANT_ID,
    };
}

async function post(path: string, body: Record<string, unknown>): Promise<any> {
    const signature = signRequest(body);
    const res = await axios.post(`${BASE_URL()}${path}`, body, {
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'appid': process.env.PALMPAY_APP_ID!,
            'sign': signature,
            'signType': 'RSA',
        },
        timeout: 30000,
    });
    return res.data;
}

export async function verifyBankAccount(bankCode: string, accountNumber: string): Promise<{ accountName: string; accountNumber: string; bankCode: string }> {
    const params = {
        ...baseParams(),
        bankCode,
        bankAccNo: accountNumber,
    };
    const data = await post('/api/v2/payment/merchant/payee/queryBankAccount', params);
    if (data?.respCode !== '00000000' && data?.respCode !== '0000') {
        throw new Error(data?.respMsg || 'Account not found');
    }
    return {
        accountName: data?.data?.accountName || data?.accountName,
        accountNumber,
        bankCode,
    };
}

export async function initiatePayout(opts: {
    orderId: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amountNgn: number;
    narration: string;
}): Promise<{ providerTransferId: string | null; providerOrderNo: string | null; status: 'SUCCESS' | 'PENDING' | 'FAIL'; rawResponse: object }> {
    const params = {
        ...baseParams(),
        orderId: opts.orderId,
        payeeBankCode: opts.bankCode,
        payeeBankAccNo: opts.accountNumber,
        payeeName: opts.accountName,
        amount: Math.round(opts.amountNgn * 100), // kobo
        currency: 'NGN',
        notifyUrl: process.env.PALMPAY_NOTIFY_URL || '',
        remark: opts.narration,
    };
    const data = await post('/api/v2/merchant/payment/payout', params);

    const palmpayStatus = (data?.data?.orderStatus || data?.status || '').toUpperCase();
    let status: 'SUCCESS' | 'PENDING' | 'FAIL';
    if (palmpayStatus === 'SUCCESS' || palmpayStatus === 'SUCCESSFUL') status = 'SUCCESS';
    else if (palmpayStatus === 'FAIL' || palmpayStatus === 'FAILED') status = 'FAIL';
    else status = 'PENDING';

    return {
        providerTransferId: data?.data?.orderNo || null,
        providerOrderNo: data?.data?.orderNo || null,
        status,
        rawResponse: data,
    };
}

export async function queryPayoutStatus(orderId: string): Promise<{ status: 'SUCCESS' | 'PENDING' | 'FAIL'; providerTransferId: string | null; failureReason: string | null }> {
    const params = { ...baseParams(), orderId };
    const data = await post('/api/v2/merchant/payment/queryStatus', params);
    const palmpayStatus = (data?.data?.orderStatus || '').toUpperCase();

    let status: 'SUCCESS' | 'PENDING' | 'FAIL';
    if (palmpayStatus === 'SUCCESS' || palmpayStatus === 'SUCCESSFUL') status = 'SUCCESS';
    else if (palmpayStatus === 'FAIL' || palmpayStatus === 'FAILED') status = 'FAIL';
    else status = 'PENDING';

    return {
        status,
        providerTransferId: data?.data?.orderNo || null,
        failureReason: data?.data?.failureReason || null,
    };
}

export const name = 'PalmPay';
