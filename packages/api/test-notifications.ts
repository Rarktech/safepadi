import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { routeNotification } from './src/services/notifications';
import {
    sendNewTransactionRequestEmail,
    sendTransactionAcceptedEmail,
    sendTransactionDeclinedEmail,
    sendPaymentConfirmedEmail,
    sendDeliverySubmittedEmail,
    sendTransactionCompletedEmail,
    sendMilestoneReleasedEmail,
    sendWithdrawalInitiatedEmail,
    sendWithdrawalCompletedEmail,
    sendWithdrawalRejectedEmail,
    sendDisputeRaisedEmail,
    sendDisputeResolvedEmail,
    sendReviewReceivedEmail,
    sendReferralCommissionEmail,
    sendKycApprovedEmail,
    sendKycRejectedEmail,
    sendPaymentReminderEmail,
    sendSellerAcceptanceReminderEmail,
    sendReceiptConfirmationReminderEmail,
    sendSellerDeliveryReminderEmail,
    sendOnboardingDay1Email,
    sendOnboardingDay3Email,
    sendOnboardingDay7Email,
    sendKycNudgeEmail,
    sendReferralSignupEmail,
    sendReferralMilestoneEmail,
    sendMonthlyReferralSummaryEmail,
    sendReEngagementEmail,
    sendBalanceNudgeEmail,
} from './src/services/email';

// @Trio — Richard | Telegram 8194231102
const PROFILE_ID = 'edf17df6-138e-40a7-80d5-eb2ee6079025';
const EMAIL = 'Richardsafeeely@gmail.com';
const SAFETAG = '@Trio';
const FIRST_NAME = 'Richard';
const TXN_ID = 'test-txn-00000000-0000-0000-0000-000000000001';
const TXN_CODE = 'TXN-TEST-001';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const ok = (label: string) => console.log(`  ✅  ${label}`);
const section = (title: string) => console.log(`\n${'─'.repeat(60)}\n📌 ${title}\n${'─'.repeat(60)}`);

async function main() {
    console.log(`\n🚀 Starting full notification test for ${SAFETAG} (${EMAIL})\n`);

    // ─────────────────────────────────────────────────────────
    section('1 — TRANSACTION LIFECYCLE (Platform → Telegram)');
    // ─────────────────────────────────────────────────────────

    await routeNotification(PROFILE_ID,
        `📩 <b>New Trade Request!</b>\n\n<code>@janedoe</code> has sent you a trade request.\n\n🛒 Product: <b>Logo Design Package</b>\n💰 Amount: <b>150.00 USD</b>\n📋 ID: <b>${TXN_CODE}</b>\n\nReview and respond to keep the deal moving.`,
        [
            { label: '✅ Accept', customId: `txn_action_accept|${TXN_ID}` },
            { label: '❌ Decline', customId: `txn_action_decline|${TXN_ID}` },
        ]
    );
    ok('New transaction request');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `🎉 <b>Trade Accepted!</b>\n\n<code>@janedoe</code> has accepted your request for <b>"Logo Design Package"</b>.\n\n💰 Amount: <b>150.00 USD</b>\n📋 ID: <b>${TXN_CODE}</b>\n\nProceed to make payment to secure the funds in escrow.`,
        [{ label: '💳 Pay Now', customId: `view_txn_${TXN_ID}` }]
    );
    ok('Transaction accepted');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `❌ <b>Trade Declined</b>\n\n<code>@janedoe</code> has declined the trade for <b>"Logo Design Package"</b>.\n\n💰 Amount: <b>150.00 USD</b> | 📋 <b>${TXN_CODE}</b>\n\nYou can initiate a new trade at any time.`,
        [{ label: '🛒 Start New Trade', customId: 'create_txn' }]
    );
    ok('Transaction declined');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `✅ <b>Payment Confirmed!</b>\n\nYour payment has been received and secured in escrow!\n\n📋 Transaction ID: <b>${TXN_CODE}</b>\n💰 Amount Paid: <b>150.00 USD</b>\n🔐 Status: <b>Payment Secured in Escrow</b>\n\n✅ Seller has been notified and can now proceed to fulfill the order.`,
        [
            { label: '👁️ View Transaction', customId: `view_txn_${TXN_ID}` },
            { label: '❌ Raise Dispute', customId: `txn_dispute_${TXN_ID}` },
        ],
        `${process.env.API_URL || 'http://localhost:3000/api'}/receipts/${TXN_CODE}.png`
    );
    ok('Payment confirmed (buyer view)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `🔐 <b>Payment Received and Held Securely!</b>\n\nThe buyer has made payment and funds are now secured in escrow!\n\n📋 Transaction ID: <b>${TXN_CODE}</b>\n💰 Amount Secured: <b>142.50 USD</b>\n👤 Buyer: <code>@janedoe</code>\n\n✅ You can now proceed to fulfill the order.`,
        [
            { label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${TXN_ID}` },
            { label: '👁️ View Details', customId: `view_txn_${TXN_ID}` },
        ],
        `${process.env.API_URL || 'http://localhost:3000/api'}/receipts/${TXN_CODE}.png`
    );
    ok('Payment confirmed (seller view)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `📦 <b>Delivery Update!</b>\n\n<code>@janedoe</code> has marked your order as completed and uploaded <b>2 proof document(s)</b>.\n\n📋 Transaction ID: <b>${TXN_CODE}</b>\n🛒 Product: <b>Logo Design Package</b>\n\nPlease review the delivery carefully before confirming receipt.`,
        [
            { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${TXN_ID}` },
            { label: '❌ Raise Dispute', customId: `txn_dispute_${TXN_ID}` },
        ]
    );
    ok('Delivery submitted / proof uploaded');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `🎉 <b>Transaction Complete!</b>\n\nThe buyer has confirmed receipt of <b>"Logo Design Package"</b>.\n\n💰 Your earnings of <b>142.50 USD</b> are now available in your balance.\n📋 ID: <b>${TXN_CODE}</b>\n\nThank you for trading safely with Safeeely!`,
        [
            { label: '💸 Withdraw Earnings', url: `${process.env.REVIEWS_URL || 'http://localhost:3001'}/dashboard/withdrawals` },
            { label: '⭐ Leave a Review', customId: `leave_review_${TXN_ID}` },
        ]
    );
    ok('Transaction completed / receipt confirmed');
    await sleep(1200);

    // ─────────────────────────────────────────────────────────
    section('2 — MILESTONE NOTIFICATIONS (Platform → Telegram)');
    // ─────────────────────────────────────────────────────────

    await routeNotification(PROFILE_ID,
        `📦 <b>Milestone Completed</b>\n\nThe seller has marked "<b>Phase 1 — Wireframes</b>" as completed. Please review and release the funds if satisfied.\n\n📋 Stage 1 of 3 · 50.00 USD`,
        [
            { label: '💸 Release Funds', customId: `txn_action_release_milestone|${TXN_ID}|milestone-1` },
            { label: '❌ Dispute', customId: `txn_dispute_${TXN_ID}` },
        ]
    );
    ok('Milestone marked complete (buyer prompt)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `💰 <b>Funds Received!</b>\n\nThe buyer has released the funds for "<b>Phase 1 — Wireframes</b>". They are now available in your balance.\n\n📋 Stage 1 of 3 · 50.00 USD`,
        [{ label: '✅ View Transaction', customId: `view_txn_${TXN_ID}` }]
    );
    ok('Milestone released (seller view)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `🎉 <b>Project Finalized!</b>\n\nAll milestones for "<b>Logo Design Package</b>" have been completed and released. The transaction is now officially finalized.`,
        []
    );
    ok('All milestones released (project finalized)');
    await sleep(1200);

    // ─────────────────────────────────────────────────────────
    section('3 — REVIEWS & TRUST (Platform → Telegram)');
    // ─────────────────────────────────────────────────────────

    await routeNotification(PROFILE_ID,
        `⭐ <b>New Review!</b>\n\n<code>@janedoe</code> left you a <b>4.8★</b> review:\n\n<i>"Excellent work, delivered ahead of schedule and communication was top notch. Highly recommend!"</i>\n\nYour new trust score: <b>4.8</b>`,
        [{ label: '👁️ View My Profile', customId: 'view_profile' }]
    );
    ok('Review received');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `🏅 <b>Trust Milestone!</b>\n\nYour trust score just crossed <b>4.5★</b> — you're now in the top tier of Safeeely traders!\n\nShare your profile to attract even more clients.`,
        [{ label: '🔗 Share My Profile', url: `${process.env.REVIEWS_URL || 'http://localhost:3001'}/reviews/${SAFETAG.replace('@', '')}` }]
    );
    ok('Trust score milestone (4.5★)');
    await sleep(1200);

    // ─────────────────────────────────────────────────────────
    section('4 — REFERRAL SYSTEM (Platform → Telegram)');
    // ─────────────────────────────────────────────────────────

    await routeNotification(PROFILE_ID,
        `🎉 <b>New Referral!</b>\n\n<b>Michael</b> just joined Safeeely using your invite link!\n\n👥 Total Referrals: <b>5</b>\n\nKeep sharing your link to earn passive commissions on every trade they complete!`,
        [{ label: '📊 View Referrals', customId: 'view_referrals' }]
    );
    ok('Referral signup alert');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `💰 <b>Referral Commission Earned!</b>\n\nYou just earned a <b>Tier 1</b> commission!\n\n💵 Amount: <b>1.50 USD</b>\n📋 From a trade by <code>@michael</code>\n\nThis has been added to your referral balance.`,
        [{ label: '💸 View Earnings', customId: 'view_referrals' }]
    );
    ok('Commission earned (Tier 1)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `🏆 <b>Referral Milestone!</b>\n\nYou've now referred <b>10 people</b> to Safeeely — amazing!\n\n💰 Latest earnings: <b>1.50 USD</b>\n\nKeep growing your network and watch your passive income grow every month!`,
        [{ label: '📊 View Referral Stats', customId: 'view_referrals' }]
    );
    ok('Referral milestone (10 referrals)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `🎉 <b>25 Trades Completed!</b>\n\nCongratulations ${FIRST_NAME}! You've successfully completed <b>25 trades</b> on Safeeely.\n\n🛡️ You're a verified power trader. Keep building your reputation!`,
        [{ label: '🛒 Start Another Trade', customId: 'create_txn' }]
    );
    ok('Trade count milestone (25 trades)');
    await sleep(1200);

    // ─────────────────────────────────────────────────────────
    section('5 — ACCOUNT EVENTS (Platform → Telegram)');
    // ─────────────────────────────────────────────────────────

    await routeNotification(PROFILE_ID,
        `💸 <b>Withdrawal Initiated</b>\n\nYour withdrawal request has been received.\n\n💰 Amount: <b>142.50 USD</b>\n🔖 Reference: <b>WD-TEST-001</b>\n\nProcessing typically takes 1–3 business days.`,
        [{ label: '📊 View Withdrawals', url: `${process.env.REVIEWS_URL || 'http://localhost:3001'}/dashboard/withdrawals` }]
    );
    ok('Withdrawal initiated');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `⚖️ <b>Dispute Raised Against Your Trade</b>\n\n<code>@janedoe</code> has raised a dispute on the trade for <b>"Logo Design Package"</b>.\n\n📋 ID: <b>${TXN_CODE}</b>\n💬 Reason: <i>Item not as described</i>\n\nOur team will review and mediate. Please respond promptly.`,
        [{ label: '💬 Open Dispute Chat', customId: `view_dispute_${TXN_ID}` }]
    );
    ok('Dispute raised');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `✅ <b>Dispute Resolved</b>\n\nThe dispute for <b>"Logo Design Package"</b> has been resolved.\n\n📋 ID: <b>${TXN_CODE}</b>\n⚖️ Outcome: <b>Resolved in favour of the buyer — partial refund issued</b>\n\nFunds have been adjusted accordingly.`,
        [{ label: '📊 View Dashboard', url: `${process.env.REVIEWS_URL || 'http://localhost:3001'}/dashboard` }]
    );
    ok('Dispute resolved');
    await sleep(1200);

    // ─────────────────────────────────────────────────────────
    section('6 — CRON: TRANSACTION REMINDERS (Platform → Telegram)');
    // ─────────────────────────────────────────────────────────

    await routeNotification(PROFILE_ID,
        `⏳ <b>Pending Transaction Request</b>\n\nYou have a pending trade request for <b>"Logo Design Package"</b> from <code>@janedoe</code>.\n\n💰 Amount: <b>150.00 USD</b>\n\nPlease respond to keep the transaction moving.`,
        [
            { label: '✅ Accept', customId: `txn_action_accept|${TXN_ID}` },
            { label: '❌ Decline', customId: `txn_action_decline|${TXN_ID}` },
        ]
    );
    ok('Bucket 1 — Seller acceptance reminder (24-48h)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `💳 <b>Payment Needed</b>\n\nYour accepted deal for <b>"Logo Design Package"</b> with <code>@janedoe</code> is awaiting payment.\n\n💰 Amount: <b>150.00 USD</b>\n\nPay now to secure the funds in escrow and keep the deal moving.`,
        [{ label: '💳 Pay Now', customId: `view_txn_${TXN_ID}` }]
    );
    ok('Bucket 2 — Payment reminder (6-8h)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `⚠️ <b>Last Reminder — Payment Overdue</b>\n\nYour deal for <b>"Logo Design Package"</b> has been accepted for over 24 hours but payment hasn't been made.\n\n💰 Amount: <b>150.00 USD</b>\n\nThe seller may cancel if payment is not received soon.`,
        [{ label: '💳 Pay Now', customId: `view_txn_${TXN_ID}` }]
    );
    ok('Bucket 3 — Payment reminder final (24-26h)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `📦 <b>Delivery Reminder</b>\n\nThe buyer has paid for <b>"Logo Design Package"</b> and the funds are secured in escrow.\n\n💰 Amount: <b>142.50 USD</b>\n\nPlease deliver and mark the transaction as complete.`,
        [{ label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${TXN_ID}` }]
    );
    ok('Bucket 4 — Delivery reminder (72-74h)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `🚨 <b>Urgent: Delivery Overdue</b>\n\nPayment for <b>"Logo Design Package"</b> has been waiting in escrow for 7 days. The buyer may open a dispute.\n\nPlease deliver and mark the order as complete immediately.`,
        [{ label: '✅ Mark as Completed', customId: `txn_action_complete_prompt|${TXN_ID}` }]
    );
    ok('Bucket 5 — Delivery reminder final (7d)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `📬 <b>Please Confirm Receipt</b>\n\nThe seller has marked <b>"Logo Design Package"</b> as delivered. Have you received it?\n\nConfirm receipt to release the payment to the seller, or open a dispute if there's a problem.`,
        [
            { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${TXN_ID}` },
            { label: '❌ Open Dispute', customId: `txn_dispute_${TXN_ID}` },
        ]
    );
    ok('Bucket 6 — Receipt confirmation reminder (48-50h)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `🚨 <b>Final Reminder: Confirm or Dispute</b>\n\n<b>"Logo Design Package"</b> has been marked as delivered for 5 days without confirmation.\n\nPlease confirm receipt to release funds to the seller, or open a dispute if you have not received your item.`,
        [
            { label: '✅ Confirm Receipt', customId: `txn_action_confirm_receipt|${TXN_ID}` },
            { label: '❌ Open Dispute', customId: `txn_dispute_${TXN_ID}` },
        ]
    );
    ok('Bucket 7 — Receipt confirmation reminder final (5d)');
    await sleep(1200);

    // ─────────────────────────────────────────────────────────
    section('7 — CRON: ONBOARDING DRIP (Platform → Telegram)');
    // ─────────────────────────────────────────────────────────

    await routeNotification(PROFILE_ID,
        `👋 <b>Welcome to Safeeely!</b>\n\nYour account is live. Start your first secure trade today — it only takes a minute to set up.\n\n🛡️ Buyers pay into escrow. Sellers deliver. Both sides are protected.`,
        [{ label: '🛒 Start a Trade', customId: 'create_txn' }]
    );
    ok('Onboarding Day 1');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `📢 <b>Share Your Safetag!</b>\n\nYour safetag is <code>${SAFETAG}</code>. Share it with anyone you're doing business with online so they can initiate a secure escrow trade with you.`,
        [
            { label: '👁️ View My Profile', customId: 'view_profile' },
            { label: '🛒 Create a Trade', customId: 'create_txn' },
        ]
    );
    ok('Onboarding Day 3');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `🛡️ <b>Don't get scammed.</b>\n\nEvery day, people lose money on social media trades. Safeeely prevents that.\n\nYour account is ready — make your first protected trade today and never worry about being scammed again.`,
        [{ label: '🛒 Create a Trade', customId: 'create_txn' }]
    );
    ok('Onboarding Day 7');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `🔐 <b>Complete Your Identity Verification</b>\n\nVerifying your identity on Safeeely unlocks higher transaction limits, the Verified badge, and priority dispute resolution.\n\nIt takes less than 2 minutes.`,
        [{ label: '🛡️ Verify Now', url: `${process.env.REVIEWS_URL || 'http://localhost:3001'}/kyc?viewer=${SAFETAG.replace('@', '')}` }]
    );
    ok('KYC nudge (Day 7)');
    await sleep(1200);

    // ─────────────────────────────────────────────────────────
    section('8 — CRON: RE-ENGAGEMENT (Platform → Telegram)');
    // ─────────────────────────────────────────────────────────

    await routeNotification(PROFILE_ID,
        `👋 <b>We miss you!</b>\n\nIt's been <b>32 days</b> since your last activity on Safeeely. Ready for your next secure trade?\n\nYour safetag <code>${SAFETAG}</code> is still active and ready to go.`,
        [{ label: '🛒 Start a Trade', customId: 'create_txn' }]
    );
    ok('Re-engagement — Segment A (experienced trader)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `💡 <b>Still thinking about it?</b>\n\nHere's why thousands of traders choose Safeeely:\n\n✅ Funds secured in escrow until delivery is confirmed\n✅ AI-powered dispute resolution\n✅ Works across Telegram, WhatsApp, Discord & more\n\nStart your first safe trade today!`,
        [{ label: '🛒 Start a Trade', customId: 'create_txn' }]
    );
    ok('Re-engagement — Segment B (never traded)');
    await sleep(1200);

    await routeNotification(PROFILE_ID,
        `💰 <b>You Have Earnings Waiting!</b>\n\nYou have <b>285.00 USD</b> available in your Safeeely balance.\n\nWithdraw to your bank or crypto wallet anytime.`,
        [{ label: '💸 Withdraw Now', url: `${process.env.REVIEWS_URL || 'http://localhost:3001'}/dashboard/withdrawals` }]
    );
    ok('Balance withdrawal nudge');
    await sleep(1200);

    // ─────────────────────────────────────────────────────────
    section('9 — CRON: MONTHLY REFERRAL SUMMARY (Platform → Telegram)');
    // ─────────────────────────────────────────────────────────

    await routeNotification(PROFILE_ID,
        `📊 <b>Your April 2026 Referral Report</b>\n\nYou earned commissions from <b>7 transactions</b> last month.\n\n💰 Total Earned: <b>10.50 USD</b>\n\nKeep sharing your referral link to grow your passive income every month!`,
        [{ label: '💸 Withdraw Earnings', url: `${process.env.REVIEWS_URL || 'http://localhost:3001'}/dashboard/withdrawals` }]
    );
    ok('Monthly referral summary');
    await sleep(1200);

    // ─────────────────────────────────────────────────────────
    section('10 — EMAIL TEMPLATES (→ Richardsafeeely@gmail.com)');
    // ─────────────────────────────────────────────────────────

    const emailTests: Array<[string, () => void | Promise<void>]> = [
        ['sendNewTransactionRequestEmail', () => sendNewTransactionRequestEmail(EMAIL, { safetag: SAFETAG, counterpartyTag: '@janedoe', product: 'Logo Design Package', amount: 150, currency: 'USD', txnCode: TXN_CODE, txnId: TXN_ID })],
        ['sendTransactionAcceptedEmail', () => sendTransactionAcceptedEmail(EMAIL, { safetag: SAFETAG, product: 'Logo Design Package', amount: 150, currency: 'USD', txnId: TXN_ID, txnCode: TXN_CODE })],
        ['sendTransactionDeclinedEmail', () => sendTransactionDeclinedEmail(EMAIL, { safetag: SAFETAG, declinerTag: '@janedoe', product: 'Logo Design Package', amount: 150, currency: 'USD', txnCode: TXN_CODE })],
        ['sendPaymentConfirmedEmail (buyer)', () => sendPaymentConfirmedEmail(EMAIL, { safetag: SAFETAG, role: 'buyer', product: 'Logo Design Package', amount: 150, currency: 'USD', txnCode: TXN_CODE, txnId: TXN_ID })],
        ['sendPaymentConfirmedEmail (seller)', () => sendPaymentConfirmedEmail(EMAIL, { safetag: SAFETAG, role: 'seller', product: 'Logo Design Package', amount: 142.5, currency: 'USD', txnCode: TXN_CODE, txnId: TXN_ID })],
        ['sendDeliverySubmittedEmail', () => sendDeliverySubmittedEmail(EMAIL, { safetag: SAFETAG, sellerTag: '@janedoe', product: 'Logo Design Package', txnCode: TXN_CODE, txnId: TXN_ID })],
        ['sendTransactionCompletedEmail', () => sendTransactionCompletedEmail(EMAIL, { safetag: SAFETAG, product: 'Logo Design Package', amount: 142.5, currency: 'USD', txnCode: TXN_CODE })],
        ['sendMilestoneReleasedEmail (buyer)', () => sendMilestoneReleasedEmail(EMAIL, { safetag: SAFETAG, role: 'buyer', milestoneTitle: 'Phase 1 — Wireframes', milestoneIndex: 0, milestoneTotal: 3, amount: 50, currency: 'USD', txnCode: TXN_CODE, txnId: TXN_ID })],
        ['sendMilestoneReleasedEmail (seller)', () => sendMilestoneReleasedEmail(EMAIL, { safetag: SAFETAG, role: 'seller', milestoneTitle: 'Phase 1 — Wireframes', milestoneIndex: 0, milestoneTotal: 3, amount: 50, currency: 'USD', txnCode: TXN_CODE, txnId: TXN_ID })],
        ['sendWithdrawalInitiatedEmail', () => sendWithdrawalInitiatedEmail(EMAIL, { safetag: SAFETAG, amount: 142.5, currency: 'USD', reference: 'WD-TEST-001' })],
        ['sendWithdrawalCompletedEmail', () => sendWithdrawalCompletedEmail(EMAIL, { safetag: SAFETAG, amount: 142.5, currency: 'USD', reference: 'WD-TEST-001' })],
        ['sendWithdrawalRejectedEmail', () => sendWithdrawalRejectedEmail(EMAIL, { safetag: SAFETAG, amount: 142.5, currency: 'USD', reason: 'Bank account details could not be verified' })],
        ['sendDisputeRaisedEmail', () => sendDisputeRaisedEmail(EMAIL, { safetag: SAFETAG, raisingParty: '@janedoe', product: 'Logo Design Package', txnCode: TXN_CODE, reason: 'Item not as described', txnId: TXN_ID })],
        ['sendDisputeResolvedEmail', () => sendDisputeResolvedEmail(EMAIL, { safetag: SAFETAG, product: 'Logo Design Package', txnCode: TXN_CODE, outcome: 'Resolved in favour of the buyer — partial refund issued', txnId: TXN_ID })],
        ['sendReviewReceivedEmail', () => sendReviewReceivedEmail(EMAIL, { safetag: SAFETAG, reviewerTag: '@janedoe', rating: 4.8, comment: 'Excellent work, delivered ahead of schedule!' })],
        ['sendReferralCommissionEmail', () => sendReferralCommissionEmail(EMAIL, { amount: 1.5, currency: 'USD', tier: 1 })],
        ['sendKycApprovedEmail', () => sendKycApprovedEmail(EMAIL, { safetag: SAFETAG })],
        ['sendKycRejectedEmail', () => sendKycRejectedEmail(EMAIL, { safetag: SAFETAG, reason: 'The document provided was blurry. Please re-upload a clearer photo.' })],
        ['sendPaymentReminderEmail (first)', () => sendPaymentReminderEmail(EMAIL, { safetag: SAFETAG, sellerTag: '@janedoe', product: 'Logo Design Package', amount: 150, currency: 'USD', txnId: TXN_ID, txnCode: TXN_CODE, nudge: 'first' })],
        ['sendPaymentReminderEmail (final)', () => sendPaymentReminderEmail(EMAIL, { safetag: SAFETAG, sellerTag: '@janedoe', product: 'Logo Design Package', amount: 150, currency: 'USD', txnId: TXN_ID, txnCode: TXN_CODE, nudge: 'final' })],
        ['sendSellerAcceptanceReminderEmail', () => sendSellerAcceptanceReminderEmail(EMAIL, { safetag: SAFETAG, buyerTag: '@janedoe', product: 'Logo Design Package', amount: 150, currency: 'USD', txnId: TXN_ID, txnCode: TXN_CODE })],
        ['sendReceiptConfirmationReminderEmail (first)', () => sendReceiptConfirmationReminderEmail(EMAIL, { safetag: SAFETAG, sellerTag: '@janedoe', product: 'Logo Design Package', txnId: TXN_ID, txnCode: TXN_CODE, nudge: 'first' })],
        ['sendReceiptConfirmationReminderEmail (final)', () => sendReceiptConfirmationReminderEmail(EMAIL, { safetag: SAFETAG, sellerTag: '@janedoe', product: 'Logo Design Package', txnId: TXN_ID, txnCode: TXN_CODE, nudge: 'final' })],
        ['sendSellerDeliveryReminderEmail (first)', () => sendSellerDeliveryReminderEmail(EMAIL, { safetag: SAFETAG, buyerTag: '@janedoe', product: 'Logo Design Package', txnId: TXN_ID, txnCode: TXN_CODE, nudge: 'first' })],
        ['sendSellerDeliveryReminderEmail (final)', () => sendSellerDeliveryReminderEmail(EMAIL, { safetag: SAFETAG, buyerTag: '@janedoe', product: 'Logo Design Package', txnId: TXN_ID, txnCode: TXN_CODE, nudge: 'final' })],
        ['sendOnboardingDay1Email', () => sendOnboardingDay1Email(EMAIL, { safetag: SAFETAG, firstName: FIRST_NAME })],
        ['sendOnboardingDay3Email', () => sendOnboardingDay3Email(EMAIL, { safetag: SAFETAG, firstName: FIRST_NAME })],
        ['sendOnboardingDay7Email', () => sendOnboardingDay7Email(EMAIL, { safetag: SAFETAG, firstName: FIRST_NAME })],
        ['sendKycNudgeEmail', () => sendKycNudgeEmail(EMAIL, { safetag: SAFETAG, firstName: FIRST_NAME })],
        ['sendReferralSignupEmail', () => sendReferralSignupEmail(EMAIL, { referrerSafetag: SAFETAG, newUserFirstName: 'Michael', totalReferrals: 10 })],
        ['sendReferralMilestoneEmail', () => sendReferralMilestoneEmail(EMAIL, { safetag: SAFETAG, milestone: 10, earningsSummary: '1.50 USD (latest)' })],
        ['sendMonthlyReferralSummaryEmail', () => sendMonthlyReferralSummaryEmail(EMAIL, { safetag: SAFETAG, month: 'April 2026', referralCount: 7, earningsSummary: '10.50 USD', referralLink: `${process.env.REVIEWS_URL || 'http://localhost:3001'}/invite/Trio` })],
        ['sendReEngagementEmail (experienced)', () => sendReEngagementEmail(EMAIL, { safetag: SAFETAG, firstName: FIRST_NAME, hasTraded: true, daysSinceActive: 32 })],
        ['sendReEngagementEmail (new)', () => sendReEngagementEmail(EMAIL, { safetag: SAFETAG, firstName: FIRST_NAME, hasTraded: false, daysSinceActive: 32 })],
        ['sendBalanceNudgeEmail', () => sendBalanceNudgeEmail(EMAIL, { safetag: SAFETAG, firstName: FIRST_NAME, balanceSummary: '285.00 USD' })],
    ];

    for (const [label, fn] of emailTests) {
        await fn();
        ok(`${label}`);
        await sleep(400);
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✅  ALL DONE`);
    console.log(`   Platform notifications → Telegram (@Trio)`);
    console.log(`   Email templates (${emailTests.length}) → ${EMAIL}`);
    console.log(`${'═'.repeat(60)}\n`);
}

main().catch(err => {
    console.error('\n❌ Fatal:', err.message);
    process.exit(1);
});
