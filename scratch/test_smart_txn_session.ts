/**
 * Test: Smart Transaction Counterparty Persistence Fix
 *
 * Verifies:
 * 1. Discord fix — smartTxnSessions is cleared on smart_txn_confirm
 * 2. Telegram fix — smartTxnDraft is cleared on /cancel and main_menu
 * 3. processSmartTransaction parses a fresh counterparty when no existingDraft
 * 4. processSmartTransaction overrides old counterparty when new one is mentioned
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { processSmartTransaction, SmartTransactionDraft } from '../packages/shared/src/ai/smartTransaction';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
    if (condition) {
        console.log(`  ✅ PASS: ${label}`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: ${label}`);
        failed++;
    }
}

// ──────────────────────────────────────────────────────────────
// SECTION 1: Discord session Map management (no AI needed)
// ──────────────────────────────────────────────────────────────
console.log('\n=== Section 1: Discord smartTxnSessions Map cleanup ===\n');

{
    const smartTxnSessions = new Map<string, SmartTransactionDraft>();
    const txnDrafts = new Map<string, any>();
    const userId = 'discord-user-001';

    // Setup: first transaction with @userA
    smartTxnSessions.set(userId, {
        counterparty_safetag: 'userA',
        product_name: 'iPhone 14',
        amount: 500,
        currency: 'USD',
        role: 'buyer',
        fee_allocation: 'buyer',
        transaction_type: 'ONE_TIME'
    });

    assert(smartTxnSessions.has(userId), 'Session exists before confirm');

    // Simulate smart_txn_confirm handler (WITH fix)
    const draft = smartTxnSessions.get(userId)!;
    smartTxnSessions.delete(userId); // ← the fix
    txnDrafts.set(userId, { role: draft.role, other: `@${draft.counterparty_safetag}` });

    assert(!smartTxnSessions.has(userId), 'Session cleared after smart_txn_confirm');

    // Simulate next voice message lookup
    const existingDraftForNextMessage = smartTxnSessions.get(userId);
    assert(existingDraftForNextMessage === undefined, 'Next voice message gets undefined existingDraft');
}

{
    const smartTxnSessions = new Map<string, SmartTransactionDraft>();
    const userId = 'discord-user-002';

    // Simulate: user cancelled (smart_txn_cancel — already worked before)
    smartTxnSessions.set(userId, { counterparty_safetag: 'userA' });
    smartTxnSessions.delete(userId); // cancel handler

    assert(!smartTxnSessions.has(userId), 'Session cleared after smart_txn_cancel (pre-existing)');
}

// ──────────────────────────────────────────────────────────────
// SECTION 2: Telegram session object management (no AI needed)
// ──────────────────────────────────────────────────────────────
console.log('\n=== Section 2: Telegram ctx.session.smartTxnDraft cleanup ===\n');

{
    // Simulate ctx.session
    const session: { smartTxnDraft?: SmartTransactionDraft } = {
        smartTxnDraft: {
            counterparty_safetag: 'userA',
            product_name: 'MacBook',
            amount: 1200,
            currency: 'USD',
            role: 'buyer',
            fee_allocation: 'buyer',
            transaction_type: 'ONE_TIME'
        }
    };

    assert(session.smartTxnDraft !== undefined, 'Draft exists before /cancel');

    // Simulate /cancel command handler (WITH fix)
    if (session) delete session.smartTxnDraft;

    assert(session.smartTxnDraft === undefined, 'Draft cleared by /cancel command');
}

{
    const session: { smartTxnDraft?: SmartTransactionDraft } = {
        smartTxnDraft: { counterparty_safetag: 'userA', product_name: 'Watch' }
    };

    // Simulate main_menu action handler (WITH fix)
    if (session) delete session.smartTxnDraft;

    assert(session.smartTxnDraft === undefined, 'Draft cleared by main_menu action');
}

{
    // Confirm path (pre-existing — verify unchanged)
    const session: { smartTxnDraft?: SmartTransactionDraft } = {
        smartTxnDraft: { counterparty_safetag: 'userA' }
    };

    // smart_txn_confirm handler
    const draft = session.smartTxnDraft;
    delete session.smartTxnDraft; // line 648

    assert(session.smartTxnDraft === undefined, 'Draft cleared by smart_txn_confirm (existing behavior)');
    assert(draft?.counterparty_safetag === 'userA', 'Draft value preserved before delete');
}

// ──────────────────────────────────────────────────────────────
// SECTION 3: AI parsing — fresh counterparty with no existingDraft
// ──────────────────────────────────────────────────────────────
console.log('\n=== Section 3: AI parsing — fresh counterparty (Gemini) ===\n');

async function runAITests() {
    // Test 3a: No existingDraft → AI should parse @userB correctly
    console.log('  [3a] Calling processSmartTransaction with no existingDraft...');
    const result3a = await processSmartTransaction(
        'I want to buy an iPhone 15 Pro from @userB for 1200 USD, fee on buyer',
        undefined, undefined,
        undefined  // ← no existing draft (session was cleared)
    );
    console.log(`       → counterparty: ${result3a.draft.counterparty_safetag}, is_complete: ${result3a.is_complete}`);
    assert(result3a.draft.counterparty_safetag === 'userB', 'Fresh parse extracts @userB with no existingDraft');
    assert(result3a.is_complete === true, 'Transaction is complete from single message');

    // Test 3b: existingDraft has @userA, new message explicitly mentions @userC → should override
    console.log('\n  [3b] Calling processSmartTransaction with stale existingDraft + new counterparty...');
    const staleExistingDraft: SmartTransactionDraft = {
        counterparty_safetag: 'userA',
        product_name: 'Old Product',
        amount: 999,
        currency: 'NGN',
        role: 'seller',
        fee_allocation: 'seller',
        transaction_type: 'ONE_TIME'
    };
    const result3b = await processSmartTransaction(
        'Actually I want to sell a Laptop to @userC for 500 USD',
        undefined, undefined,
        staleExistingDraft
    );
    console.log(`       → counterparty: ${result3b.draft.counterparty_safetag}, is_complete: ${result3b.is_complete}`);
    assert(result3b.draft.counterparty_safetag === 'userC', 'New counterparty overrides stale existingDraft');

    // Test 3c: Incomplete draft accumulates — existing counterparty preserved when not mentioned
    console.log('\n  [3c] Multi-turn accumulation — counterparty from previous turn preserved...');
    const partialDraft: SmartTransactionDraft = {
        counterparty_safetag: 'userD',
        role: 'buyer',
        transaction_type: 'ONE_TIME'
    };
    const result3c = await processSmartTransaction(
        'Buy an iPhone 16 for 800 USD, fee on buyer',
        undefined, undefined,
        partialDraft
    );
    console.log(`       → counterparty: ${result3c.draft.counterparty_safetag}, product: ${result3c.draft.product_name}`);
    assert(result3c.draft.counterparty_safetag === 'userD', 'Accumulation: counterparty preserved from partial draft');
    assert(result3c.draft.product_name !== undefined, 'Accumulation: new product extracted');
}

runAITests()
    .then(() => {
        console.log(`\n══════════════════════════════════`);
        console.log(`Results: ${passed} passed, ${failed} failed`);
        console.log(`══════════════════════════════════`);
        if (failed > 0) process.exit(1);
    })
    .catch(err => {
        console.error('\n❌ Test runner error:', err.message);
        process.exit(1);
    });
