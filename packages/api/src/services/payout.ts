import { supabase } from '@safepal/shared';
import * as flw from './providers/flutterwaveTransfer';
import * as palmPay from './providers/palmPay';
import { routeNotification, recordNotification } from './notifications';
import { CRYPTO_CURRENCIES } from '../constants/payouts';

interface WithdrawalRow {
    id: string;
    profile_id: string;
    amount: number;
    currency: string;
    reference: string;
    status: string;
    idempotency_key: string | null;
    provider_order_no: string | null;
    details: Record<string, unknown> | null;
    payout_method?: {
        type?: string;
        details?: Record<string, unknown>;
    } | null;
}

function selectProvider(currency: string, type: string): 'palmpay' | 'flutterwave' | null {
    if (type === 'crypto') return null;
    if (currency === 'NGN' && palmPay.isConfigured()) return 'palmpay';
    return 'flutterwave';
}

export async function verifyBankAccount(bankCode: string, accountNumber: string, currency = 'NGN'): Promise<flw.VerifyResult> {
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

    const w = withdrawal as WithdrawalRow;

    if (['PAID', 'FAILED'].includes(w.status)) return;

    const method = w.payout_method;
    const details = (w.details ?? method?.details ?? {}) as Record<string, string>;
    const currency = w.currency;
    const type: string = method?.type ?? (CRYPTO_CURRENCIES.has(currency) ? 'crypto' : 'bank');

    await supabase.from('withdrawals').update({ attempted_at: new Date().toISOString() }).eq('id', withdrawalId);

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
        type ProviderResult = { providerTransferId: string | null; providerOrderNo: string | null; status: 'SUCCESS' | 'PENDING' | 'FAIL'; rawResponse: object };
        let result: ProviderResult;

        const narration = `Safeeely payout ${w.reference}`;
        const orderId = w.idempotency_key ?? w.id;

        if (provider === 'palmpay') {
            result = await palmPay.initiatePayout({
                orderId,
                bankCode: details.bankCode ?? details.bank_id,
                accountNumber: details.accountNumber ?? details.account_number,
                accountName: details.verifiedAccountName ?? details.account_name,
                amountNgn: Number(w.amount),
                narration,
            });
        } else {
            result = await flw.initiatePayout({
                orderId,
                bankCode: details.bankCode ?? details.bank_id,
                accountNumber: details.accountNumber ?? details.account_number,
                accountName: details.verifiedAccountName ?? details.account_name,
                amount: Number(w.amount),
                currency,
                narration,
                callbackUrl: process.env.API_URL
                    ? `${process.env.API_URL}/payments/flutterwave/webhook`
                    : undefined,
            });
        }

        const updateFields: Record<string, unknown> = {
            // Store numeric transfer ID (used by GET /v3/transfers/:id reconciliation)
            provider_order_no: result.providerTransferId ?? result.providerOrderNo,
            provider_response: result.rawResponse,
        };

        if (result.status === 'SUCCESS') {
            updateFields.status = 'PAID';
            updateFields.settled_at = new Date().toISOString();
        } else if (result.status === 'FAIL') {
            updateFields.status = 'FAILED';
            updateFields.failure_reason = 'Provider returned failure on initiation';
        }

        await supabase.from('withdrawals').update(updateFields).eq('id', withdrawalId);

        if (result.status === 'FAIL') {
            await notifyPayoutFailed(w, 'Payment provider rejected the transfer');
        } else if (result.status === 'SUCCESS') {
            await notifyPayoutSuccess(w);
        }

        console.log(`[Payout] ${withdrawalId} dispatched via ${provider}: ${result.status}`);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Payout] disburseFunds error for ${withdrawalId}:`, message);
        await supabase.from('withdrawals').update({
            status: 'FAILED',
            failure_reason: message,
            provider_response: { error: message },
        }).eq('id', withdrawalId);
        await notifyPayoutFailed(w, message);
    }
}

export async function queryAndSyncStatus(withdrawalId: string): Promise<void> {
    const { data: withdrawal } = await supabase
        .from('withdrawals')
        .select('id, status, currency, provider_order_no, idempotency_key, profile_id, amount, currency, reference')
        .eq('id', withdrawalId)
        .single();

    if (!withdrawal || withdrawal.status !== 'PROCESSING') return;

    const w = withdrawal as WithdrawalRow;
    const provider = selectProvider(w.currency, 'bank');
    if (!provider) return;

    // Use numeric transfer ID for Flutterwave; orderId for PalmPay
    const transferId = w.provider_order_no ?? w.idempotency_key ?? w.id;

    try {
        type StatusResult = { status: 'SUCCESS' | 'PENDING' | 'FAIL'; providerTransferId: string | null; failureReason: string | null };
        let statusResult: StatusResult;

        if (provider === 'palmpay') {
            statusResult = await palmPay.queryPayoutStatus(transferId);
        } else {
            statusResult = await flw.queryPayoutStatus(transferId);
        }

        if (statusResult.status === 'SUCCESS') {
            await supabase.from('withdrawals').update({
                status: 'PAID',
                settled_at: new Date().toISOString(),
            }).eq('id', withdrawalId);
            await notifyPayoutSuccess(w);
        } else if (statusResult.status === 'FAIL') {
            await supabase.from('withdrawals').update({
                status: 'FAILED',
                failure_reason: statusResult.failureReason ?? 'Provider reconciliation: failed',
            }).eq('id', withdrawalId);
            await notifyPayoutFailed(w, statusResult.failureReason ?? 'Transfer failed');
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Payout] queryAndSyncStatus error for ${withdrawalId}:`, message);
    }
}

async function notifyPayoutSuccess(w: WithdrawalRow): Promise<void> {
    const msg = `✅ <b>Withdrawal Successful!</b>\n\n<b>${w.amount} ${w.currency}</b> has been sent to your payout method.\n\n📋 Reference: <b>${w.reference}</b>`;
    routeNotification(w.profile_id, msg, []).catch(() => {});
    recordNotification(w.profile_id, 'withdrawal', '✅ Withdrawal Successful', `${w.amount} ${w.currency} sent`, { withdrawal_id: w.id, amount: w.amount, currency: w.currency, reference: w.reference, link_url: '/dashboard/withdrawals' }).catch(() => {});
}

async function notifyPayoutFailed(w: WithdrawalRow, reason: string): Promise<void> {
    const msg = `❌ <b>Withdrawal Failed</b>\n\nYour withdrawal of <b>${w.amount} ${w.currency}</b> could not be processed.\n\n📝 Reason: ${reason}\n\nPlease contact support or retry.`;
    routeNotification(w.profile_id, msg, []).catch(() => {});
    recordNotification(w.profile_id, 'withdrawal', '❌ Withdrawal Failed', `${w.amount} ${w.currency} — ${reason}`, { withdrawal_id: w.id, amount: w.amount, currency: w.currency, link_url: '/dashboard/withdrawals' }).catch(() => {});
}
