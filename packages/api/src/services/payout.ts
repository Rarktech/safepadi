import { supabase } from '@safepal/shared';
import * as flw from './providers/flutterwaveTransfer';
import * as palmPay from './providers/palmPay';
import { routeNotification, recordNotification } from './notifications';

const CRYPTO_CURRENCIES = new Set(['BTC', 'ETH', 'USDT', 'USDC', 'SOL']);

function selectProvider(currency: string, type: string) {
    if (type === 'crypto') return null; // crypto payouts are admin-gated manual
    // PalmPay takes priority for NGN if configured
    if (currency === 'NGN' && palmPay.isConfigured()) return 'palmpay';
    // Flutterwave handles NGN + international fiat
    return 'flutterwave';
}

export async function verifyBankAccount(bankCode: string, accountNumber: string, currency = 'NGN') {
    if (currency === 'NGN' && palmPay.isConfigured()) {
        return palmPay.verifyBankAccount(bankCode, accountNumber);
    }
    return flw.verifyBankAccount(bankCode, accountNumber);
}

export async function disburseFunds(withdrawalId: string): Promise<void> {
    const { data: withdrawal, error } = await supabase
        .from('withdrawals')
        .select('*, payout_method:payout_method_id(*)')
        .eq('id', withdrawalId)
        .single();

    if (error || !withdrawal) {
        console.error(`[Payout] disburseFunds: withdrawal ${withdrawalId} not found`);
        return;
    }

    // Already terminal
    if (['PAID', 'FAILED'].includes(withdrawal.status)) return;

    const method = withdrawal.payout_method as any;
    const details = withdrawal.details || method?.details || {};
    const currency: string = withdrawal.currency;
    const type: string = method?.type || (CRYPTO_CURRENCIES.has(currency) ? 'crypto' : 'bank');

    await supabase.from('withdrawals').update({ attempted_at: new Date().toISOString() }).eq('id', withdrawalId);

    // Crypto payouts stay in PROCESSING for admin to execute manually
    if (type === 'crypto' || CRYPTO_CURRENCIES.has(currency)) {
        console.log(`[Payout] ${withdrawalId} is crypto — requires admin action`);
        return;
    }

    const provider = selectProvider(currency, type);
    if (!provider) {
        console.warn(`[Payout] No provider for currency=${currency} type=${type}`);
        return;
    }

    try {
        let result: { providerTransferId: string | null; providerOrderNo: string | null; status: 'SUCCESS' | 'PENDING' | 'FAIL'; rawResponse: object };

        const narration = `Safeeely payout ${withdrawal.reference}`;
        const orderId = withdrawal.idempotency_key || withdrawal.id;

        if (provider === 'palmpay') {
            result = await palmPay.initiatePayout({
                orderId,
                bankCode: details.bankCode || details.bank_id,
                accountNumber: details.accountNumber || details.account_number,
                accountName: details.verifiedAccountName || details.account_name,
                amountNgn: Number(withdrawal.amount),
                narration,
            });
        } else {
            result = await flw.initiatePayout({
                orderId,
                bankCode: details.bankCode || details.bank_id,
                accountNumber: details.accountNumber || details.account_number,
                accountName: details.verifiedAccountName || details.account_name,
                amount: Number(withdrawal.amount),
                currency,
                narration,
                callbackUrl: process.env.API_URL
                    ? `${process.env.API_URL}/payments/flutterwave/webhook`
                    : undefined,
            });
        }

        const updateFields: Record<string, unknown> = {
            // Store numeric transfer ID so GET /v3/transfers/:id works in reconciliation
            provider_order_no: result.providerTransferId || result.providerOrderNo,
            provider_response: result.rawResponse,
        };

        if (result.status === 'SUCCESS') {
            updateFields.status = 'PAID';
            updateFields.settled_at = new Date().toISOString();
        } else if (result.status === 'FAIL') {
            updateFields.status = 'FAILED';
            updateFields.failure_reason = 'Provider returned failure on initiation';
        }
        // PENDING: stays PROCESSING, webhook will update

        await supabase.from('withdrawals').update(updateFields).eq('id', withdrawalId);

        if (result.status === 'FAIL') {
            await notifyPayoutFailed(withdrawal, 'Payment provider rejected the transfer');
        } else if (result.status === 'SUCCESS') {
            await notifyPayoutSuccess(withdrawal);
        }

        console.log(`[Payout] ${withdrawalId} dispatched via ${provider}: ${result.status}`);
    } catch (err: any) {
        console.error(`[Payout] disburseFunds error for ${withdrawalId}:`, err.message);
        await supabase.from('withdrawals').update({
            status: 'FAILED',
            failure_reason: err.message || 'Provider error',
            provider_response: { error: err.message },
        }).eq('id', withdrawalId);
        await notifyPayoutFailed(withdrawal, err.message);
    }
}

export async function queryAndSyncStatus(withdrawalId: string): Promise<void> {
    const { data: withdrawal } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('id', withdrawalId)
        .single();

    if (!withdrawal || withdrawal.status !== 'PROCESSING') return;

    const currency: string = withdrawal.currency;
    const provider = selectProvider(currency, 'bank');
    if (!provider) return;

    const transferId = withdrawal.provider_order_no || withdrawal.idempotency_key || withdrawal.id;

    try {
        let statusResult: { status: 'SUCCESS' | 'PENDING' | 'FAIL'; providerTransferId: string | null; failureReason: string | null };

        if (provider === 'palmpay') {
            statusResult = await palmPay.queryPayoutStatus(transferId);
        } else {
            if (!transferId) return;
            statusResult = await flw.queryPayoutStatus(transferId);
        }

        if (statusResult.status === 'SUCCESS') {
            await supabase.from('withdrawals').update({
                status: 'PAID',
                settled_at: new Date().toISOString(),
            }).eq('id', withdrawalId);
            await notifyPayoutSuccess(withdrawal);
        } else if (statusResult.status === 'FAIL') {
            await supabase.from('withdrawals').update({
                status: 'FAILED',
                failure_reason: statusResult.failureReason || 'Provider reconciliation: failed',
            }).eq('id', withdrawalId);
            await notifyPayoutFailed(withdrawal, statusResult.failureReason || 'Transfer failed');
        }
    } catch (err: any) {
        console.error(`[Payout] queryAndSyncStatus error for ${withdrawalId}:`, err.message);
    }
}

async function notifyPayoutSuccess(withdrawal: any) {
    const msg = `✅ <b>Withdrawal Successful!</b>\n\n<b>${withdrawal.amount} ${withdrawal.currency}</b> has been sent to your payout method.\n\n📋 Reference: <b>${withdrawal.reference}</b>`;
    routeNotification(withdrawal.profile_id, msg, []).catch(() => {});
    recordNotification(withdrawal.profile_id, 'withdrawal', '✅ Withdrawal Successful', `${withdrawal.amount} ${withdrawal.currency} sent`, { withdrawal_id: withdrawal.id, amount: withdrawal.amount, currency: withdrawal.currency, reference: withdrawal.reference, link_url: '/dashboard/withdrawals' }).catch(() => {});
}

async function notifyPayoutFailed(withdrawal: any, reason: string) {
    const msg = `❌ <b>Withdrawal Failed</b>\n\nYour withdrawal of <b>${withdrawal.amount} ${withdrawal.currency}</b> could not be processed.\n\n📝 Reason: ${reason}\n\nPlease contact support or retry.`;
    routeNotification(withdrawal.profile_id, msg, []).catch(() => {});
    recordNotification(withdrawal.profile_id, 'withdrawal', '❌ Withdrawal Failed', `${withdrawal.amount} ${withdrawal.currency} — ${reason}`, { withdrawal_id: withdrawal.id, amount: withdrawal.amount, currency: withdrawal.currency, link_url: '/dashboard/withdrawals' }).catch(() => {});
}
