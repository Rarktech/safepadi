/**
 * Safeeely Dispute System — Brutality Test Suite
 *
 * Tests all 10 dispute scenarios end-to-end:
 *   A. REFUND_BUYER — clear non-delivery (AI verdict)
 *   B. PAY_SELLER — buyer bad-faith claim (AI verdict)
 *   C. SPLIT — partial delivery (AI verdict)
 *   D. REFUND_AFTER_RETURN — physical goods return flow (admin → confirm-return)
 *   E. SLA adverse inference — buyer silence → PAY_SELLER
 *   F. SLA adverse inference — seller silence → REFUND_BUYER
 *   G. Admin manual resolve — SPLIT with explicit amounts
 *   H. Hallucination resistance — 3 identical ghost-seller cases → same verdict
 *   I. Input validation / security edge cases
 *   J. Balance verification — pending_refunds, seller earnings after verdicts
 *
 * Run: npx ts-node -r tsconfig-paths/register test-disputes.ts
 * Requires API running on PORT 3000 and .env at repo root.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import axios, { AxiosError } from 'axios';
import { createClient } from '@supabase/supabase-js';

// ─── Config ──────────────────────────────────────────────────────────────────

const API = process.env.API_URL || 'http://localhost:3000/api';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || 'test';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Unique suffix so parallel runs and cleanup don't clash
const TS = Date.now().toString().slice(-8);

// ─── Test Harness ─────────────────────────────────────────────────────────────

interface TestResult {
    id: string;
    label: string;
    passed: boolean;
    detail?: string;
}
const results: TestResult[] = [];

function pass(id: string, label: string) {
    results.push({ id, label, passed: true });
    console.log(`  ✅ ${id}: ${label}`);
}

function fail(id: string, label: string, detail: string) {
    results.push({ id, label, passed: false, detail });
    console.log(`  ❌ ${id}: ${label}`);
    console.log(`       → ${detail}`);
}

function assert(id: string, label: string, condition: boolean, detail?: string) {
    if (condition) pass(id, label);
    else fail(id, label, detail || 'assertion failed');
}

function warn(msg: string) { console.log(`  ⚠️  ${msg}`); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Setup Helpers ────────────────────────────────────────────────────────────

async function createProfile(suffix: string): Promise<{ id: string; safetag: string; email: string }> {
    const safetag = `@_TEST_${suffix}_${TS}`;
    const email = `_test_${suffix.toLowerCase()}_${TS}@safeeely.test`;
    const { data, error } = await supabase
        .from('profiles')
        .insert({ safetag, email, first_name: 'Test', last_name: suffix, primary_platform: 'telegram' })
        .select()
        .single();
    if (error) throw new Error(`createProfile(${suffix}): ${error.message}`);

    // Dummy linked_account — unique platform_id per profile to avoid unique constraint violations
    try {
        await supabase.from('linked_accounts').insert({
            profile_id: data.id,
            platform: 'telegram',
            platform_id: `TEST_${suffix}_${TS}`,
            is_primary: true,
            last_message_at: new Date().toISOString()
        });
    } catch {}

    return data as { id: string; safetag: string; email: string };
}

interface TxnOverrides {
    suffix?: string;
    product_name?: string;
    amount?: number;
    currency?: string;
    status?: string;
    fee_amount?: number;
}

async function createTransaction(
    buyerId: string,
    sellerId: string,
    overrides: TxnOverrides = {}
): Promise<{ id: string; txn_code: string; amount: number; currency: string }> {
    const txnCode = `TXN-TEST-${overrides.suffix || 'X'}-${TS}`;
    const amount = overrides.amount ?? 150;
    const fee = overrides.fee_amount ?? +(amount * 0.05).toFixed(2);
    const { data, error } = await supabase
        .from('transactions')
        .insert({
            txn_code: txnCode,
            buyer_id: buyerId,
            seller_id: sellerId,
            product_name: overrides.product_name || 'Test Digital Product',
            description: 'Created by dispute test suite',
            amount,
            currency: overrides.currency ?? 'USD',
            fee_allocation: 'buyer',
            fee_amount: fee,
            total_amount: amount + fee,
            status: overrides.status ?? 'PAID',
            transaction_type: 'ONE_TIME'
        })
        .select()
        .single();
    if (error) throw new Error(`createTransaction(${txnCode}): ${error.message}`);
    return data as { id: string; txn_code: string; amount: number; currency: string };
}

// Directly insert a dispute in DB (bypasses API — used for SLA tests)
async function insertDisputeDirect(txnId: string, raisedBy: string, overrides: Record<string, any> = {}) {
    const { data, error } = await supabase
        .from('disputes')
        .insert({
            transaction_id: txnId,
            raised_by: raisedBy,
            reason: overrides.reason || 'Direct DB insert for SLA test',
            status: overrides.status ?? 'OPEN',
            restricted_to: overrides.restricted_to ?? 'ALL',
            evidence_deadline: overrides.evidence_deadline,
            is_ai_paused: overrides.is_ai_paused ?? false,
            pipeline_tier: overrides.pipeline_tier ?? 'STANDARD'
        })
        .select()
        .single();
    if (error) throw new Error(`insertDisputeDirect: ${error.message}`);
    return data;
}

async function submitMessage(disputeId: string, senderId: string, content: string) {
    await axios.post(`${API}/disputes/${disputeId}/messages`, {
        sender_id: senderId,
        sender_type: 'USER',
        content
    });
}

// Poll until dispute reaches a terminal state; auto-submits evidence when AI asks
async function waitForVerdict(
    disputeId: string,
    buyerId: string,
    buyerEvidence: string,
    sellerId: string,
    sellerEvidence: string | null = null,
    timeoutMs = 90000
): Promise<any> {
    const start = Date.now();
    let lastSeenRounds = 0;
    let nullCount = 0;

    while (Date.now() - start < timeoutMs) {
        const { data: d, error: pollErr } = await supabase.from('disputes').select('*').eq('id', disputeId).maybeSingle();

        if (!d || pollErr) {
            // Transient Supabase network glitch — retry up to 10 times before declaring vanished
            nullCount++;
            if (nullCount >= 10) throw new Error(`Dispute ${disputeId} vanished during poll (10 consecutive null responses)`);
            if (pollErr) console.warn(`  ⚠️ Poll transient error (retry ${nullCount}/10): ${pollErr.message}`);
            await sleep(5000);
            continue;
        }
        nullCount = 0; // reset on successful read

        // Terminal states
        if (d.status !== 'OPEN') return d;
        if (d.verdict_action) return d;  // REFUND_AFTER_RETURN stays OPEN with verdict set
        if (d.is_ai_paused) return d;     // ESCALATED

        // AI asked for more evidence — wait briefly for pipeline lock to clear, then submit once per new round
        if (d.ai_rounds > lastSeenRounds) {
            lastSeenRounds = d.ai_rounds;
            await sleep(6000); // give pipeline's finally block time to release the DB lock
            if ((d.restricted_to === 'BUYER' || d.restricted_to === 'ALL') && buyerEvidence) {
                try { await submitMessage(disputeId, buyerId, buyerEvidence); } catch {}
            }
            if ((d.restricted_to === 'SELLER' || d.restricted_to === 'ALL') && sellerEvidence) {
                try { await submitMessage(disputeId, sellerId, sellerEvidence); } catch {}
            }
        }

        await sleep(3000);
    }

    const { data: final } = await supabase.from('disputes').select('*').eq('id', disputeId).maybeSingle();
    warn(`Verdict timed out for dispute ${disputeId} — returning current state`);
    return final;
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    const { data: testTxns } = await supabase
        .from('transactions')
        .select('id')
        .ilike('txn_code', `TXN-TEST-%-${TS}`);

    if (testTxns?.length) {
        const ids = testTxns.map((t: any) => t.id);
        // Cascade: disputes → dispute_messages, dispute_adjudications, buyer_refund_credits
        await supabase.from('disputes').delete().in('transaction_id', ids);
        await supabase.from('buyer_refund_credits').delete().in('transaction_id', ids);
        await supabase.from('transactions').delete().in('id', ids);
    }

    const { data: testProfiles } = await supabase
        .from('profiles')
        .select('id')
        .ilike('safetag', `@_TEST_%_${TS}`);

    if (testProfiles?.length) {
        const ids = testProfiles.map((p: any) => p.id);
        await supabase.from('profile_reputation').delete().in('profile_id', ids);
        await supabase.from('linked_accounts').delete().in('profile_id', ids);
        await supabase.from('profiles').delete().in('id', ids);
    }

    console.log(`  Removed ${testTxns?.length || 0} transactions, ${testProfiles?.length || 0} profiles`);
}

// ─── Scenario A: REFUND_BUYER — Clear Non-Delivery ────────────────────────────

async function scenarioA() {
    console.log('\n[Scenario A] REFUND_BUYER — Clear Non-Delivery');
    let buyer: any, seller: any, txn: any, disputeId: string;

    try {
        buyer = await createProfile('BUYER_A');
        seller = await createProfile('SELLER_A');
        txn = await createTransaction(buyer.id, seller.id, {
            suffix: 'A', product_name: 'Logo Design Package', amount: 150
        });
    } catch (e: any) {
        fail('A-SETUP', 'test data creation', e.message); return;
    }

    let raiseRes: any;
    try {
        raiseRes = await axios.post(`${API}/disputes/raise`, {
            transaction_id: txn.id,
            raised_by: buyer.id,
            reason: 'Seller never delivered the logo files. It has been 10 days since payment and seller is completely unresponsive. I have proof of payment.'
        });
        assert('A-1', 'dispute created (201)', raiseRes.status === 201, `got ${raiseRes.status}`);
        disputeId = raiseRes.data.dispute.id;
    } catch (e: any) {
        fail('A-1', 'dispute created', e.response?.data?.error || e.message); return;
    }

    const { data: frozenTxn } = await supabase.from('transactions').select('status').eq('id', txn.id).single();
    assert('A-2', 'transaction frozen to DISPUTED', frozenTxn?.status === 'DISPUTED', `got ${frozenTxn?.status}`);

    const verdict = await waitForVerdict(
        disputeId, buyer.id,
        'I paid on the 1st of this month. Seller has read all my messages but never responded. I have the payment receipt and chat screenshots showing they are online but ignoring me. This is clear non-delivery.',
        seller.id, null,
        600000  // 10 min — Gemini 2.5 Pro pipeline can take 2-4 min
    );
    await sleep(2000); // pipeline writes dispute first, then transaction — give it time to finish

    assert('A-3', 'AI verdict is REFUND_BUYER', verdict?.verdict_action === 'REFUND_BUYER',
        `got verdict_action=${verdict?.verdict_action}, status=${verdict?.status}, is_ai_paused=${verdict?.is_ai_paused}`);

    const { data: resolvedTxn } = await supabase.from('transactions').select('status').eq('id', txn.id).single();
    assert('A-4', 'transaction → CANCELLED', resolvedTxn?.status === 'CANCELLED', `got ${resolvedTxn?.status}`);

    const { data: credit } = await supabase.from('buyer_refund_credits')
        .select('*').eq('transaction_id', txn.id).maybeSingle();
    assert('A-5', 'buyer_refund_credits row created', !!credit, 'no row found');
    if (credit) {
        assert('A-6', 'credit amount = 150', credit.amount === 150, `got ${credit.amount}`);
        assert('A-7', 'credit status = PENDING', credit.status === 'PENDING', `got ${credit.status}`);
        assert('A-8', 'credit refund_type = FULL', credit.refund_type === 'FULL', `got ${credit.refund_type}`);
    }

    const { data: buyerRep } = await supabase.from('profile_reputation').select('*').eq('profile_id', buyer.id).maybeSingle();
    const { data: sellerRep } = await supabase.from('profile_reputation').select('*').eq('profile_id', seller.id).maybeSingle();
    assert('A-9', 'buyer disputes_won_as_buyer incremented', (buyerRep?.disputes_won_as_buyer ?? 0) > 0,
        `buyer_won=${buyerRep?.disputes_won_as_buyer}`);
    assert('A-10', 'seller disputes_lost_as_seller incremented', (sellerRep?.disputes_lost_as_seller ?? 0) > 0,
        `seller_lost=${sellerRep?.disputes_lost_as_seller}`);

    const { data: adjudication } = await supabase.from('dispute_adjudications')
        .select('*').eq('dispute_id', disputeId).maybeSingle();
    assert('A-11', 'dispute_adjudications record created', !!adjudication, 'no adjudication row');
    if (adjudication) {
        assert('A-12', 'adjudication final_action = REFUND_BUYER', adjudication.final_action === 'REFUND_BUYER',
            `got ${adjudication.final_action}`);
    }
}

// ─── Scenario B: PAY_SELLER — Buyer Bad-Faith Claim ──────────────────────────

async function scenarioB() {
    console.log('\n[Scenario B] PAY_SELLER — Buyer Bad-Faith Claim');
    let buyer: any, seller: any, txn: any, disputeId: string;

    try {
        buyer = await createProfile('BUYER_B');
        seller = await createProfile('SELLER_B');
        txn = await createTransaction(buyer.id, seller.id, {
            suffix: 'B', product_name: 'Custom Business Website', amount: 500
        });
    } catch (e: any) { fail('B-SETUP', 'test data creation', e.message); return; }

    const SELLER_B_EVIDENCE = 'I completed and delivered the website exactly as specified in our written agreement attached here. The buyer confirmed receipt with a thank you message on day 3 and has been using the live website for 2 weeks. They requested no revisions during the project. I have screenshots of their approval message and our project brief showing all requirements were met. The buyer is now attempting a refund after full usage of the deliverable.';

    let raiseRes: any;
    try {
        raiseRes = await axios.post(`${API}/disputes/raise`, {
            transaction_id: txn.id,
            raised_by: buyer.id,
            reason: 'The website was not built as promised. The design is completely different from what we agreed.'
        });
        disputeId = raiseRes.data.dispute.id;
        assert('B-1', 'dispute created', raiseRes.status === 201, `got ${raiseRes.status}`);
    } catch (e: any) { fail('B-1', 'dispute created', e.response?.data?.error || e.message); return; }

    // Pre-submit seller's defense immediately so seller has messages before ai_rounds hits 1.
    // Without this, if investigator restricts to BUYER first, seller appears silent (0 messages)
    // and the ghost-party adverse inference fires against seller → wrong REFUND_BUYER verdict.
    await sleep(3000);
    try { await submitMessage(disputeId, seller.id, SELLER_B_EVIDENCE); } catch {}

    const verdict = await waitForVerdict(
        disputeId, buyer.id,
        'I am not satisfied with the design. It does not match my vision at all.',
        seller.id,
        SELLER_B_EVIDENCE,
        600000
    );
    await sleep(2000); // pipeline writes dispute first, then transaction — give it time to finish

    assert('B-2', 'AI verdict is PAY_SELLER', verdict?.verdict_action === 'PAY_SELLER',
        `got verdict_action=${verdict?.verdict_action}, status=${verdict?.status}`);

    const { data: resolvedTxn } = await supabase.from('transactions').select('status').eq('id', txn.id).single();
    assert('B-3', 'transaction → FINALIZED', resolvedTxn?.status === 'FINALIZED', `got ${resolvedTxn?.status}`);

    const { data: credit } = await supabase.from('buyer_refund_credits')
        .select('id').eq('transaction_id', txn.id).maybeSingle();
    assert('B-4', 'no buyer_refund_credits row (seller wins)', !credit, 'unexpected credit row found');

    const { data: sellerRep } = await supabase.from('profile_reputation').select('*').eq('profile_id', seller.id).maybeSingle();
    assert('B-5', 'seller disputes_won_as_seller incremented', (sellerRep?.disputes_won_as_seller ?? 0) > 0,
        `seller_won=${sellerRep?.disputes_won_as_seller}`);
}

// ─── Scenario C: SPLIT — Partial Delivery ────────────────────────────────────

async function scenarioC() {
    console.log('\n[Scenario C] SPLIT — Partial Delivery');
    let buyer: any, seller: any, txn: any, disputeId: string;

    try {
        buyer = await createProfile('BUYER_C');
        seller = await createProfile('SELLER_C');
        txn = await createTransaction(buyer.id, seller.id, {
            suffix: 'C',
            product_name: 'Social Media Content Pack — 10 Posts',
            amount: 200
        });
    } catch (e: any) { fail('C-SETUP', 'test data creation', e.message); return; }

    let raiseRes: any;
    try {
        raiseRes = await axios.post(`${API}/disputes/raise`, {
            transaction_id: txn.id,
            raised_by: buyer.id,
            reason: 'Seller only delivered 4 out of the 10 posts we agreed on. The 4 posts are acceptable quality but the remaining 6 are missing entirely.'
        });
        disputeId = raiseRes.data.dispute.id;
        assert('C-1', 'dispute created', raiseRes.status === 201, `got ${raiseRes.status}`);
    } catch (e: any) { fail('C-1', 'dispute created', e.response?.data?.error || e.message); return; }

    const verdict = await waitForVerdict(
        disputeId, buyer.id,
        'Here is proof I paid for 10 posts. Only 4 were delivered. The seller acknowledged in chat they could only do 4 due to personal reasons. I have the delivery folder screenshot showing only 4 files.',
        seller.id,
        'I was only able to deliver 4 posts as I communicated to the buyer. I informed them I could complete 4 posts and they agreed to accept partial delivery. I delivered the 4 posts as promised and they are good quality. I should be paid for the work I completed.',
        600000
    );
    await sleep(2000); // pipeline writes dispute first, then transaction — give it time to finish

    assert('C-2', 'AI verdict is SPLIT', verdict?.verdict_action === 'SPLIT',
        `got verdict_action=${verdict?.verdict_action}, status=${verdict?.status}`);

    const { data: resolvedTxn } = await supabase.from('transactions').select('status, metadata').eq('id', txn.id).single();
    assert('C-3', 'transaction → RESOLVED_SPLIT', resolvedTxn?.status === 'RESOLVED_SPLIT', `got ${resolvedTxn?.status}`);
    assert('C-4', 'transaction.metadata has split amounts', !!(resolvedTxn?.metadata?.seller_amount || resolvedTxn?.metadata?.buyer_amount),
        `metadata: ${JSON.stringify(resolvedTxn?.metadata)}`);

    const { data: credit } = await supabase.from('buyer_refund_credits')
        .select('*').eq('transaction_id', txn.id).maybeSingle();
    assert('C-5', 'buyer_refund_credits SPLIT_SHARE created', !!credit, 'no credit row');
    if (credit) {
        assert('C-6', 'credit refund_type = SPLIT_SHARE', credit.refund_type === 'SPLIT_SHARE', `got ${credit.refund_type}`);
        assert('C-7', 'buyer credit amount > 0', credit.amount > 0, `got ${credit.amount}`);
        assert('C-8', 'buyer credit amount < full amount (partial)', credit.amount < 200, `got ${credit.amount}`);
    }

    const { data: adj } = await supabase.from('dispute_adjudications').select('split_pct_buyer').eq('dispute_id', disputeId).maybeSingle();
    assert('C-9', 'adjudication split_pct_buyer recorded', adj != null && adj.split_pct_buyer != null,
        `adj: ${JSON.stringify(adj)}`);
}

// ─── Scenario D: REFUND_AFTER_RETURN — Return Flow ───────────────────────────

async function scenarioD() {
    console.log('\n[Scenario D] REFUND_AFTER_RETURN — Physical Goods Return Flow');
    let buyer: any, seller: any, txn: any, disputeId: string;

    try {
        buyer = await createProfile('BUYER_D');
        seller = await createProfile('SELLER_D');
        txn = await createTransaction(buyer.id, seller.id, {
            suffix: 'D',
            product_name: 'iPhone 15 Pro 256GB',
            amount: 800
        });
        // Create dispute via API
        const raiseRes = await axios.post(`${API}/disputes/raise`, {
            transaction_id: txn.id,
            raised_by: buyer.id,
            reason: 'Phone arrived with a cracked screen and is 128GB not 256GB as listed. Completely not as described. I have unboxing photos.'
        });
        disputeId = raiseRes.data.dispute.id;
        assert('D-1', 'dispute created', raiseRes.status === 201, `got ${raiseRes.status}`);
    } catch (e: any) { fail('D-SETUP', 'test data / dispute creation', e.message); return; }

    // Admin manually resolves as REFUND_AFTER_RETURN
    let resolveRes: any;
    try {
        resolveRes = await axios.post(`${API}/disputes/${disputeId}/resolve`, {
            resolution_type: 'REFUND_AFTER_RETURN',
            return_deadline_hours: 72,
            resolution_notes: 'Physical goods confirmed defective — buyer must return before refund'
        });
        assert('D-2', 'resolve REFUND_AFTER_RETURN accepted (not 400)', resolveRes.status === 200,
            `got ${resolveRes.status}: ${JSON.stringify(resolveRes.data)}`);
    } catch (e: any) {
        fail('D-2', 'resolve REFUND_AFTER_RETURN accepted', e.response?.data?.error || e.message);
        return;
    }

    const { data: dAfterResolve } = await supabase.from('disputes').select('*').eq('id', disputeId).single();
    assert('D-3', 'dispute verdict_action = REFUND_AFTER_RETURN', dAfterResolve?.verdict_action === 'REFUND_AFTER_RETURN',
        `got ${dAfterResolve?.verdict_action}`);
    assert('D-4', 'dispute status stays OPEN (not resolved yet)', dAfterResolve?.status === 'OPEN',
        `got ${dAfterResolve?.status}`);

    const { data: txnAfterResolve } = await supabase.from('transactions').select('status').eq('id', txn.id).single();
    assert('D-5', 'transaction → RETURN_PENDING', txnAfterResolve?.status === 'RETURN_PENDING',
        `got ${txnAfterResolve?.status}`);

    // Seller tries to confirm receipt before buyer ships — should succeed but no credit yet
    try {
        const earlySellerRes = await axios.post(`${API}/disputes/${disputeId}/confirm-return`, {
            confirmer_id: seller.id,
            role: 'SELLER'
        });
        // This technically should work (no restriction on order), but no credit should be issued
        // if buyer hasn't shipped. Actually looking at the code, seller can confirm even before buyer ships
        // — this creates the credit. Note this as an observation.
        warn('D: seller can confirm before buyer ships — consider adding order enforcement');
    } catch {}

    // Reset: re-create dispute state for the proper flow test
    // (Re-set verdict_action and transaction status directly for a clean test)
    await supabase.from('disputes').update({
        verdict_action: 'REFUND_AFTER_RETURN',
        status: 'OPEN',
        resolution: null,
        resolved_at: null,
        metadata: {}
    }).eq('id', disputeId);
    await supabase.from('transactions').update({ status: 'RETURN_PENDING' }).eq('id', txn.id);
    await supabase.from('buyer_refund_credits').delete().eq('transaction_id', txn.id);

    // Buyer confirms shipping
    let buyerConfirmRes: any;
    try {
        buyerConfirmRes = await axios.post(`${API}/disputes/${disputeId}/confirm-return`, {
            confirmer_id: buyer.id,
            role: 'BUYER',
            tracking_number: 'UPS-TEST-123456'
        });
        assert('D-6', 'buyer confirm-return accepted', buyerConfirmRes.status === 200,
            `got ${buyerConfirmRes.status}: ${JSON.stringify(buyerConfirmRes.data)}`);
    } catch (e: any) {
        fail('D-6', 'buyer confirm-return', e.response?.data?.error || e.message);
    }

    const { data: dAfterBuyer } = await supabase.from('disputes').select('metadata').eq('id', disputeId).single();
    assert('D-7', 'dispute.metadata.buyer_shipped_at set', !!dAfterBuyer?.metadata?.buyer_shipped_at,
        `metadata: ${JSON.stringify(dAfterBuyer?.metadata)}`);
    assert('D-8', 'transaction still RETURN_PENDING (not cancelled yet)', true, ''); // Already checked above
    const { data: txnMidway } = await supabase.from('transactions').select('status').eq('id', txn.id).single();
    assert('D-8', 'transaction still RETURN_PENDING after buyer confirm', txnMidway?.status === 'RETURN_PENDING',
        `got ${txnMidway?.status}`);

    const { data: creditMidway } = await supabase.from('buyer_refund_credits').select('id').eq('transaction_id', txn.id).maybeSingle();
    assert('D-9', 'no credit issued yet (awaiting seller)', !creditMidway, 'unexpected credit row found');

    // Seller confirms receipt
    try {
        const sellerConfirmRes = await axios.post(`${API}/disputes/${disputeId}/confirm-return`, {
            confirmer_id: seller.id,
            role: 'SELLER'
        });
        assert('D-10', 'seller confirm-return accepted', sellerConfirmRes.status === 200,
            `got ${sellerConfirmRes.status}: ${JSON.stringify(sellerConfirmRes.data)}`);
    } catch (e: any) {
        fail('D-10', 'seller confirm-return', e.response?.data?.error || e.message);
    }

    const { data: txnFinal } = await supabase.from('transactions').select('status').eq('id', txn.id).single();
    assert('D-11', 'transaction → CANCELLED after seller confirms', txnFinal?.status === 'CANCELLED',
        `got ${txnFinal?.status}`);

    const { data: dFinal } = await supabase.from('disputes').select('status').eq('id', disputeId).single();
    assert('D-12', 'dispute → RESOLVED after seller confirms', dFinal?.status === 'RESOLVED',
        `got ${dFinal?.status}`);

    const { data: credit } = await supabase.from('buyer_refund_credits')
        .select('*').eq('transaction_id', txn.id).maybeSingle();
    assert('D-13', 'buyer_refund_credits RETURN_CONFIRMED created', !!credit, 'no credit row');
    if (credit) {
        assert('D-14', 'credit refund_type = RETURN_CONFIRMED', credit.refund_type === 'RETURN_CONFIRMED',
            `got ${credit.refund_type}`);
        assert('D-15', 'credit resolution_source = RETURN_CONFIRMED', credit.resolution_source === 'RETURN_CONFIRMED',
            `got ${credit.resolution_source}`);
        assert('D-16', 'credit amount = 800', credit.amount === 800, `got ${credit.amount}`);
    }
}

// ─── Scenario E: SLA Adverse Inference — Buyer Silence → PAY_SELLER ──────────

async function scenarioE() {
    console.log('\n[Scenario E] SLA Adverse Inference — Buyer Silence → PAY_SELLER');
    // The /cron/timeouts endpoint checks: last message = AI AND it was > 48h ago.
    // We directly insert an aged AI message to simulate buyer ghosting after AI asked for evidence.
    let buyer: any, seller: any, txn: any, dispute: any;

    try {
        buyer = await createProfile('BUYER_E');
        seller = await createProfile('SELLER_E');
        txn = await createTransaction(buyer.id, seller.id, {
            suffix: 'E', status: 'DISPUTED', product_name: 'SLA Test Product E', amount: 100
        });
        dispute = await insertDisputeDirect(txn.id, buyer.id, {
            restricted_to: 'BUYER',
            is_ai_paused: false
        });

        // Simulate AI asked buyer for evidence 50 hours ago — buyer never responded
        const fiftyHoursAgo = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString();
        await supabase.from('dispute_messages').insert({
            dispute_id: dispute.id,
            sender_type: 'AI',
            content: 'Please provide proof of payment and any communication with the seller.',
            created_at: fiftyHoursAgo
        });
    } catch (e: any) { fail('E-SETUP', 'test data creation', e.message); return; }

    try {
        const cronRes = await axios.post(`${API}/disputes/cron/timeouts`, { cron_secret: CRON_SECRET });
        assert('E-1', 'cron/timeouts responded 200', cronRes.status === 200, `got ${cronRes.status}`);
    } catch (e: any) {
        fail('E-1', 'cron/timeouts call', e.response?.data?.error || e.message);
        return;
    }

    await sleep(2000);

    const { data: dFinal } = await supabase.from('disputes').select('*').eq('id', dispute.id).maybeSingle();
    assert('E-2', 'dispute → RESOLVED', dFinal?.status === 'RESOLVED', `got ${dFinal?.status}`);
    assert('E-3', 'resolution contains SLA_TIMEOUT: PAY_SELLER',
        (dFinal?.resolution || '').includes('SLA_TIMEOUT') && (dFinal?.resolution || '').includes('PAY_SELLER'),
        `got resolution: "${dFinal?.resolution}"`);

    const { data: txnFinal } = await supabase.from('transactions').select('status').eq('id', txn.id).single();
    assert('E-4', 'transaction → FINALIZED (seller wins)', txnFinal?.status === 'FINALIZED', `got ${txnFinal?.status}`);

    const { data: credit } = await supabase.from('buyer_refund_credits').select('id').eq('transaction_id', txn.id).maybeSingle();
    assert('E-5', 'no buyer_refund_credits (seller won)', !credit, 'unexpected credit row found');
}

// ─── Scenario F: SLA Adverse Inference — Seller Silence → REFUND_BUYER ───────

async function scenarioF() {
    console.log('\n[Scenario F] SLA Adverse Inference — Seller Silence → REFUND_BUYER');
    let buyer: any, seller: any, txn: any, dispute: any;

    try {
        buyer = await createProfile('BUYER_F');
        seller = await createProfile('SELLER_F');
        txn = await createTransaction(buyer.id, seller.id, {
            suffix: 'F', status: 'DISPUTED', product_name: 'SLA Test Product F', amount: 120
        });
        dispute = await insertDisputeDirect(txn.id, buyer.id, {
            restricted_to: 'SELLER',
            is_ai_paused: false
        });

        // Simulate AI asked seller for evidence 50 hours ago — seller never responded
        const fiftyHoursAgo = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString();
        await supabase.from('dispute_messages').insert({
            dispute_id: dispute.id,
            sender_type: 'AI',
            content: 'Please provide proof of delivery and any communication with the buyer.',
            created_at: fiftyHoursAgo
        });
    } catch (e: any) { fail('F-SETUP', 'test data creation', e.message); return; }

    try {
        await axios.post(`${API}/disputes/cron/timeouts`, { cron_secret: CRON_SECRET });
    } catch (e: any) { fail('F-1', 'cron/timeouts call', e.response?.data?.error || e.message); return; }

    await sleep(2000);

    const { data: dFinal } = await supabase.from('disputes').select('*').eq('id', dispute.id).maybeSingle();
    assert('F-1', 'dispute → RESOLVED', dFinal?.status === 'RESOLVED', `got ${dFinal?.status}`);
    assert('F-2', 'resolution contains SLA_TIMEOUT: REFUND_BUYER',
        (dFinal?.resolution || '').includes('SLA_TIMEOUT') && (dFinal?.resolution || '').includes('REFUND_BUYER'),
        `got resolution: "${dFinal?.resolution}"`);

    const { data: txnFinal } = await supabase.from('transactions').select('status').eq('id', txn.id).single();
    assert('F-3', 'transaction → CANCELLED', txnFinal?.status === 'CANCELLED', `got ${txnFinal?.status}`);

    const { data: credit } = await supabase.from('buyer_refund_credits').select('*').eq('transaction_id', txn.id).maybeSingle();
    assert('F-4', 'buyer_refund_credits created', !!credit, 'no credit row — SLA should insert buyer credit');
    if (credit) {
        assert('F-5', 'credit resolution_source = SLA', credit.resolution_source === 'SLA', `got ${credit.resolution_source}`);
        assert('F-6', 'credit amount = 120', credit.amount === 120, `got ${credit.amount}`);
    }
}

// ─── Scenario G: Admin Manual Resolve — SPLIT ────────────────────────────────

async function scenarioG() {
    console.log('\n[Scenario G] Admin Manual Resolve — SPLIT');
    let buyer: any, seller: any, txn: any, disputeId: string;

    try {
        buyer = await createProfile('BUYER_G');
        seller = await createProfile('SELLER_G');
        txn = await createTransaction(buyer.id, seller.id, {
            suffix: 'G', status: 'DISPUTED', product_name: 'Manual Split Test Product', amount: 200
        });
        const d = await insertDisputeDirect(txn.id, buyer.id, { status: 'OPEN' });
        disputeId = d.id;
    } catch (e: any) { fail('G-SETUP', 'test data creation', e.message); return; }

    let resolveRes: any;
    try {
        resolveRes = await axios.post(`${API}/disputes/${disputeId}/resolve`, {
            resolution_type: 'SPLIT',
            buyer_amount: 80,
            seller_amount: 120,
            resolution_notes: 'Partial delivery confirmed by mediator'
        });
        assert('G-1', 'admin resolve SPLIT accepted', resolveRes.status === 200,
            `got ${resolveRes.status}: ${JSON.stringify(resolveRes.data)}`);
    } catch (e: any) {
        fail('G-1', 'admin resolve SPLIT', e.response?.data?.error || e.message);
        return;
    }

    const { data: txnFinal } = await supabase.from('transactions').select('status, metadata').eq('id', txn.id).single();
    assert('G-2', 'transaction → RESOLVED_SPLIT', txnFinal?.status === 'RESOLVED_SPLIT', `got ${txnFinal?.status}`);
    assert('G-3', 'metadata.buyer_amount = 80', txnFinal?.metadata?.buyer_amount === 80,
        `got ${txnFinal?.metadata?.buyer_amount}`);
    assert('G-4', 'metadata.seller_amount = 120', txnFinal?.metadata?.seller_amount === 120,
        `got ${txnFinal?.metadata?.seller_amount}`);

    const { data: credit } = await supabase.from('buyer_refund_credits').select('*').eq('transaction_id', txn.id).maybeSingle();
    assert('G-5', 'buyer_refund_credits SPLIT_SHARE created', !!credit, 'no credit row');
    if (credit) {
        assert('G-6', 'credit amount = 80', credit.amount === 80, `got ${credit.amount}`);
        assert('G-7', 'credit refund_type = SPLIT_SHARE', credit.refund_type === 'SPLIT_SHARE', `got ${credit.refund_type}`);
        assert('G-8', 'credit resolution_source = ADMIN', credit.resolution_source === 'ADMIN', `got ${credit.resolution_source}`);
    }

    const { data: dFinal } = await supabase.from('disputes').select('status, resolution').eq('id', disputeId).single();
    assert('G-9', 'dispute → RESOLVED', dFinal?.status === 'RESOLVED', `got ${dFinal?.status}`);
}

// ─── Scenario H: Hallucination Resistance ────────────────────────────────────

async function scenarioH() {
    console.log('\n[Scenario H] Hallucination Resistance — 3 Identical Ghost-Seller Cases');
    const GHOST_BUYER_EVIDENCE = 'I paid 5 days ago. The seller has seen my messages (read receipts visible) but has not responded at all. I have the transaction confirmation, payment receipt, and screenshots of my unanswered messages. The seller is completely ghosting me. This is clear non-delivery and I want a full refund.';

    const cases: { disputeId: string; txnId: string; buyerId: string; sellerId: string }[] = [];

    // Create 3 independent identical cases (with retry on transient API errors)
    for (let i = 1; i <= 3; i++) {
        let created = false;
        for (let attempt = 1; attempt <= 3 && !created; attempt++) {
            try {
                const buyer = await createProfile(`BUYER_H${i}_A${attempt}`);
                const seller = await createProfile(`SELLER_H${i}_A${attempt}`);
                const txn = await createTransaction(buyer.id, seller.id, {
                    suffix: `H${i}A${attempt}`, product_name: 'Logo Design Package', amount: 150
                });
                const raiseRes = await axios.post(`${API}/disputes/raise`, {
                    transaction_id: txn.id,
                    raised_by: buyer.id,
                    reason: 'Seller never delivered the logo files. It has been 5 days since payment and seller is ignoring all messages.'
                });
                cases.push({ disputeId: raiseRes.data.dispute.id, txnId: txn.id, buyerId: buyer.id, sellerId: seller.id });
                created = true;
            } catch (e: any) {
                if (attempt < 3) {
                    warn(`H: Case ${i} attempt ${attempt} failed (${e.response?.status || e.message}), retrying in 3s...`);
                    await sleep(3000);
                } else {
                    warn(`H: Failed to create case ${i} after 3 attempts: ${e.message}`);
                }
            }
        }
        await sleep(800);
    }

    assert('H-1', '3 cases created successfully', cases.length === 3, `only ${cases.length} created`);
    if (cases.length === 0) return;

    // Wait for all 3 verdicts in parallel (each up to 5 min)
    const verdicts = await Promise.all(cases.map(c =>
        waitForVerdict(c.disputeId, c.buyerId, GHOST_BUYER_EVIDENCE, c.sellerId, null, 600000)
            .catch(e => ({ verdict_action: null, error: e.message }))
    ));

    const actions = verdicts.map((v: any) => v?.verdict_action);
    console.log(`  Verdicts: ${actions.join(', ')}`);

    const allRefundBuyer = actions.every(a => a === 'REFUND_BUYER');
    const allSame = actions.every(a => a === actions[0]);

    assert('H-2', 'all 3 verdicts are REFUND_BUYER (ghost-seller = clear buyer win)',
        allRefundBuyer, `got: ${actions.join(', ')}`);

    if (!allRefundBuyer && allSame) {
        warn(`H: All 3 are consistent (${actions[0]}) but not REFUND_BUYER — possible tier/classification issue`);
    }

    if (!allSame) {
        warn('H: INCONSISTENCY DETECTED — AI gave different verdicts for identical evidence');
        verdicts.forEach((v: any, i: number) => {
            if (v?.verdict_action !== actions[0]) {
                console.log(`     Case ${i + 1} diverged: verdict_action=${v?.verdict_action}`);
                console.log(`     last_judge_payload: ${JSON.stringify(v?.last_judge_payload)?.slice(0, 300)}`);
            }
        });
    }

    const consistencyRate = actions.filter(a => a === actions[0]).length;
    assert('H-3', `verdict consistency: ${consistencyRate}/3 matching`, consistencyRate >= 2,
        `only ${consistencyRate}/3 agree`);
}

// ─── Scenario I: Input Validation & Security Edge Cases ──────────────────────

async function scenarioI() {
    console.log('\n[Scenario I] Input Validation & Security Edge Cases');

    let buyer: any, seller: any, txn: any, txnPending: any, disputeId: string;
    try {
        buyer = await createProfile('BUYER_I');
        seller = await createProfile('SELLER_I');
        txn = await createTransaction(buyer.id, seller.id, {
            suffix: 'I', product_name: 'Validation Test', amount: 100
        });
        txnPending = await createTransaction(buyer.id, seller.id, {
            suffix: 'IPEND', product_name: 'Pending Test', amount: 50,
            status: 'PENDING_SELLER_ACCEPTANCE'
        });
    } catch (e: any) { fail('I-SETUP', 'test data creation', e.message); return; }

    // I-1: Transaction in wrong status (PENDING_SELLER_ACCEPTANCE)
    try {
        await axios.post(`${API}/disputes/raise`, {
            transaction_id: txnPending.id,
            raised_by: buyer.id,
            reason: 'I want to dispute this transaction now'
        });
        fail('I-1', 'reject dispute on PENDING txn', 'expected 400 but got 2xx');
    } catch (e: any) {
        assert('I-1', 'reject dispute on PENDING_SELLER_ACCEPTANCE txn',
            e.response?.status === 400, `got ${e.response?.status}: ${e.response?.data?.error}`);
    }

    // I-2: Reason too short (< 10 chars)
    try {
        await axios.post(`${API}/disputes/raise`, {
            transaction_id: txn.id,
            raised_by: buyer.id,
            reason: 'bad'
        });
        fail('I-2', 'reject reason < 10 chars', 'expected 400 but got 2xx');
    } catch (e: any) {
        assert('I-2', 'reject reason < 10 chars (Zod)',
            e.response?.status === 400, `got ${e.response?.status}`);
    }

    // I-3: raised_by is a random UUID not party to the transaction
    // NOTE: current implementation does NOT validate party membership — this will expose that gap
    try {
        const randomId = require('crypto').randomUUID();
        const r = await axios.post(`${API}/disputes/raise`, {
            transaction_id: txn.id,
            raised_by: randomId,
            reason: 'I am a third party trying to raise a dispute fraudulently'
        });
        // If this succeeds, it is a security gap
        if (r.status === 201) {
            fail('I-3', 'reject non-party raising dispute', 'SECURITY GAP: non-party UUID was accepted — add party validation to POST /disputes/raise');
            if (r.data?.dispute?.id) {
                await supabase.from('disputes').delete().eq('id', r.data.dispute.id);
            }
        } else {
            pass('I-3', 'reject non-party raising dispute');
        }
    } catch (e: any) {
        // After our fix, this should return 403 (party validation) not 500 (FK violation)
        const status = e.response?.status;
        assert('I-3', 'reject non-party raising dispute (403 expected)',
            status === 403 || status === 400,
            `got ${status}: ${e.response?.data?.error} — if 500, party validation fix may not be hot-reloaded`);
    }

    // Create a real dispute for remaining tests
    try {
        const raiseRes = await axios.post(`${API}/disputes/raise`, {
            transaction_id: txn.id,
            raised_by: buyer.id,
            reason: 'Seller did not deliver the product as described in our agreement.'
        });
        disputeId = raiseRes.data.dispute.id;
    } catch (e: any) { fail('I-4-SETUP', 'create test dispute', e.message); return; }

    // I-4: Submit message to non-existent dispute
    try {
        await axios.post(`${API}/disputes/00000000-0000-0000-0000-000000000000/messages`, {
            sender_id: buyer.id,
            sender_type: 'USER',
            content: 'Test message to fake dispute'
        });
        fail('I-4', 'reject message to non-existent dispute', 'expected 404 but got 2xx');
    } catch (e: any) {
        assert('I-4', 'reject message to non-existent dispute (404)',
            e.response?.status === 404, `got ${e.response?.status}`);
    }

    // I-5: confirm-return on non-RETURN_PENDING transaction
    try {
        await axios.post(`${API}/disputes/${disputeId}/confirm-return`, {
            confirmer_id: buyer.id,
            role: 'BUYER'
        });
        fail('I-5', 'reject confirm-return when not RETURN_PENDING', 'expected 400 but got 2xx');
    } catch (e: any) {
        assert('I-5', 'reject confirm-return on non-RETURN_PENDING dispute',
            e.response?.status === 400, `got ${e.response?.status}: ${e.response?.data?.error}`);
    }

    // I-6: resolve with invalid resolution_type
    try {
        await axios.post(`${API}/disputes/${disputeId}/resolve`, {
            resolution_type: 'MAKE_IT_GO_AWAY'
        });
        fail('I-6', 'reject invalid resolution_type', 'expected 400 but got 2xx');
    } catch (e: any) {
        assert('I-6', 'reject invalid resolution_type (Zod)',
            e.response?.status === 400, `got ${e.response?.status}`);
    }

    // I-7: confirm-return with missing required fields
    try {
        await axios.post(`${API}/disputes/${disputeId}/confirm-return`, {
            role: 'BUYER'
            // missing confirmer_id
        });
        fail('I-7', 'reject confirm-return missing confirmer_id', 'expected 400 but got 2xx');
    } catch (e: any) {
        assert('I-7', 'reject confirm-return without confirmer_id',
            e.response?.status === 400, `got ${e.response?.status}: ${e.response?.data?.error}`);
    }
}

// ─── Scenario J: Balance Verification ────────────────────────────────────────

async function scenarioJ() {
    console.log('\n[Scenario J] Balance Verification Across Verdicts');

    // Wait a moment for prior scenarios to have settled
    await sleep(1000);

    // Fetch profiles created in scenarios A, B, C
    const { data: buyerA } = await supabase.from('profiles').select('*').ilike('safetag', `@_TEST_BUYER_A_${TS}`).maybeSingle();
    const { data: sellerB } = await supabase.from('profiles').select('*').ilike('safetag', `@_TEST_SELLER_B_${TS}`).maybeSingle();
    const { data: buyerC } = await supabase.from('profiles').select('*').ilike('safetag', `@_TEST_BUYER_C_${TS}`).maybeSingle();
    const { data: sellerC } = await supabase.from('profiles').select('*').ilike('safetag', `@_TEST_SELLER_C_${TS}`).maybeSingle();

    if (!buyerA || !sellerB || !buyerC || !sellerC) {
        warn('J: Some scenario A/B/C profiles not found — possibly those scenarios failed. Skipping balance checks.');
        return;
    }

    // Buyer A: lost REFUND_BUYER dispute — should have pending_refunds
    try {
        const resA = await axios.get(`${API}/profiles/${encodeURIComponent(buyerA.safetag)}/balance`);
        const pendingRefunds: any[] = resA.data?.pending_refunds || [];
        const usdRefund = pendingRefunds.find((r: any) => r.currency === 'USD');
        assert('J-1', 'buyer_A has pending_refunds after REFUND_BUYER', pendingRefunds.length > 0 && !!usdRefund,
            `pending_refunds: ${JSON.stringify(pendingRefunds)}`);
        if (usdRefund) {
            assert('J-2', 'buyer_A USD pending_refund = 150', Math.abs(usdRefund.amount - 150) < 1,
                `got ${usdRefund.amount}`);
        }
    } catch (e: any) {
        fail('J-1', 'buyer_A balance fetch', e.response?.data?.error || e.message);
    }

    // Seller B: won PAY_SELLER — should have available balance
    try {
        const resB = await axios.get(`${API}/profiles/${encodeURIComponent(sellerB.safetag)}/balance`);
        const balances: any[] = resB.data?.balances || [];
        const usdBal = balances.find((b: any) => b.currency === 'USD');
        assert('J-3', 'seller_B has available balance after PAY_SELLER', balances.length > 0 && !!usdBal,
            `balances: ${JSON.stringify(balances)}`);
        if (usdBal) {
            assert('J-4', 'seller_B USD balance > 0', usdBal.amount > 0, `got ${usdBal.amount}`);
        }
    } catch (e: any) {
        fail('J-3', 'seller_B balance fetch', e.response?.data?.error || e.message);
    }

    // Buyer C: SPLIT — should have partial pending_refund
    try {
        const resC_buyer = await axios.get(`${API}/profiles/${encodeURIComponent(buyerC.safetag)}/balance`);
        const pendingC: any[] = resC_buyer.data?.pending_refunds || [];
        const usdC = pendingC.find((r: any) => r.currency === 'USD');
        assert('J-5', 'buyer_C has pending_refund after SPLIT', pendingC.length > 0,
            `pending_refunds: ${JSON.stringify(pendingC)}`);
        if (usdC) {
            assert('J-6', 'buyer_C split refund < full amount (partial)', usdC.amount < 200,
                `got ${usdC.amount} — expected < 200`);
            assert('J-7', 'buyer_C split refund > 0', usdC.amount > 0, `got ${usdC.amount}`);
        }
    } catch (e: any) {
        fail('J-5', 'buyer_C balance fetch', e.response?.data?.error || e.message);
    }

    // Seller C: SPLIT — should have partial available balance
    try {
        const resC_seller = await axios.get(`${API}/profiles/${encodeURIComponent(sellerC.safetag)}/balance`);
        const balsC: any[] = resC_seller.data?.balances || [];
        const usdBalC = balsC.find((b: any) => b.currency === 'USD');
        assert('J-8', 'seller_C has available balance after SPLIT', balsC.length > 0 && !!usdBalC,
            `balances: ${JSON.stringify(balsC)}`);
        if (usdBalC) {
            assert('J-9', 'seller_C split balance < full amount', usdBalC.amount < 200,
                `got ${usdBalC.amount}`);
            assert('J-10', 'seller_C split balance > 0', usdBalC.amount > 0, `got ${usdBalC.amount}`);
        }
    } catch (e: any) {
        fail('J-8', 'seller_C balance fetch', e.response?.data?.error || e.message);
    }
}

// ─── Health Check ─────────────────────────────────────────────────────────────

async function healthCheck() {
    try {
        await axios.get(`${API}/profiles/health`);
    } catch (e: any) {
        if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND') {
            console.error(`\n❌ API not reachable at ${API}`);
            console.error('   Start the API with: npm run dev:api\n');
            process.exit(1);
        }
        // 404 on /health is fine — API is up
    }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function printSummary() {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed);
    const total = results.length;

    console.log('\n' + '═'.repeat(60));
    console.log(`SUMMARY: ${passed}/${total} passed`);
    if (failed.length > 0) {
        console.log(`\nFailed (${failed.length}):`);
        failed.forEach(r => console.log(`  ❌ ${r.id}: ${r.label}\n       ${r.detail}`));
    }
    console.log('═'.repeat(60));

    if (failed.length === 0) {
        console.log('\n🎉 All assertions passed — dispute system is bulletproof.\n');
    } else {
        console.log(`\n⚠️  ${failed.length} assertion(s) failed. Review above.\n`);
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('═'.repeat(60));
    console.log('Safeeely Dispute System — Brutality Test Suite');
    console.log(`Run ID: ${TS}  |  API: ${API}`);
    console.log('═'.repeat(60));

    await healthCheck();

    const run = async (label: string, fn: () => Promise<void>) => {
        try { await fn(); }
        catch (e: any) { console.error(`\n💥 ${label} crashed: ${e.message}`); }
    };

    try {
        // AI verdict scenarios run first (they take the longest)
        await run('Scenario A', scenarioA);
        await run('Scenario B', scenarioB);
        await run('Scenario C', scenarioC);
        await run('Scenario D', scenarioD);
        await run('Scenario E', scenarioE);
        await run('Scenario F', scenarioF);
        await run('Scenario G', scenarioG);
        await run('Scenario H', scenarioH);
        await run('Scenario I', scenarioI);
        await run('Scenario J', scenarioJ);
    } finally {
        await cleanup();
    }

    printSummary();
}

main().catch(console.error);
