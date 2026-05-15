# Safeeely Notification System — Developer Reference

This document covers every notification trigger in the Safeeely platform: what fires it, who receives it, on which channel, and what email fallback applies.

---

## 1. Architecture Overview

### `sendNotification(platform, platformId, message, options?, imageUrl?)`

Low-level function in `packages/api/src/services/notifications.ts`. Sends a message to a specific platform user given their platform ID. Called directly only when:

- The caller has already resolved the platform and platform ID (e.g., admin join/leave, referral commission).
- No email fallback is needed.

### `routeNotification(profileId, message, buttons?, imageUrl?, emailFallback?)`

High-level routing function. Resolves the user's primary linked account and applies the 24-hour Meta messaging window rule:

1. Looks up `linked_accounts` where `profile_id = profileId AND is_primary = true`.
2. If the platform is **Telegram**, **Discord**, or **Apple**: sends immediately, no window check.
3. If the platform is **WhatsApp**, **Instagram**, or **Messenger** (Meta platforms):
   - If `last_message_at` is within the last 24 hours → sends via platform.
   - If outside the 24-hour window or no `last_message_at` → calls `emailFallback()` instead.
4. If no linked account exists at all → calls `emailFallback()` if provided.

### `sendReferralNotification(referrerId, platformMessage, emailSubject, emailHtml)`

Dedicated function for referral commission events. Has its own 24-hour window check internally. Used only for commission-earned notifications fired from `packages/api/src/routes/profiles.ts`.

### `recordNotification(profileId, type, title, message, data?)`

Writes a notification record to the `notifications` table for in-app display in the dashboard. Called alongside every `routeNotification` call — it fires regardless of platform or window state.

---

## 2. Platform Behavior Matrix

| Platform | 24h Window | Message Tag | Email Fallback |
|----------|-----------|-------------|----------------|
| Telegram | No — sends anytime | N/A | Yes (if window-blocked; irrelevant since no window) |
| Discord | No — sends anytime | N/A | Yes |
| Apple Business (JivoChat) | No — sends anytime | N/A | Yes |
| WhatsApp | Yes — 24h from `last_message_at` | N/A | Yes — fires when outside window |
| Instagram | Yes — 24h from `last_message_at` | `POST_PURCHASE_UPDATE` | Yes — fires when outside window |
| Messenger | Yes — 24h from `last_message_at` | `ACCOUNT_UPDATE` | Yes — fires when outside window |

**`last_message_at`** is stored in `linked_accounts` and updated by each Meta bot via `PATCH /api/profiles/platform-activity` on every incoming user message.

---

## 3. Event-Driven Notifications

These fire inline in route handlers, immediately when an action occurs.

### 3.1 Transaction Lifecycle

#### New Transaction Created
**Trigger:** `POST /api/transactions/create`  
**Recipients:** Seller (new request), Buyer (confirmation)  
**Email fallback:** `sendNewTransactionRequestEmail` (seller only)  
**Source:** `packages/api/src/routes/transactions.ts`

#### Seller Accepts Transaction
**Trigger:** `PATCH /api/transactions/:id/status` with `status = 'accept'`  
**Recipients:** Buyer (accepted), Seller (confirmation)  
**Email fallback:** `sendTransactionAcceptedEmail` (buyer only)

#### Transaction Declined
**Trigger:** `PATCH /api/transactions/:id/status` with `status = 'decline'`  
**Recipients:** The initiating party (buyer or seller, whichever did NOT decline)  
**Email fallback:** `sendTransactionDeclinedEmail`

#### Payment Confirmed (Gateway Webhooks)
**Trigger:** OPay / Airwallex / ChainRails / Flutterwave webhook success callbacks  
**Source:** `packages/api/src/routes/payments.ts`  
**Recipients:** Buyer (payment confirmed), Seller (funds secured)  
**Image:** Receipt PNG from `/api/receipts/:txnCode.png`  
**Email fallback:** `sendPaymentConfirmedEmail` (both buyer and seller)

#### Manual Payment Confirmation
**Trigger:** `POST /api/transactions/:id/pay`  
**Source:** `packages/api/src/routes/transactions.ts`  
**Recipients:** Buyer (payment confirmed), Seller (funds secured in escrow)  
**Image:** Receipt PNG  
**Email fallback:** `sendPaymentConfirmedEmail` (both buyer and seller)

#### Seller Marks Delivery Complete
**Trigger:** `PATCH /api/transactions/:id/status` with `status = 'complete'`  
**Recipients:** Buyer (delivery claim received)  
**Email fallback:** `sendDeliverySubmittedEmail`

#### Proof Files Uploaded (Binary — Web Portal)
**Trigger:** `POST /api/transactions/:id/upload-proof-files`  
**Recipients:** Buyer (delivery update with proof count), Seller (upload confirmed)  
**Email fallback:** None (brief status update; cron reminders handle follow-up)

#### Proof Files Uploaded (URL Array — Bot Flow)
**Trigger:** `POST /api/transactions/:id/upload-proofs`  
**Recipients:** Buyer (delivery update with file links), Seller (upload confirmed)  
**Email fallback:** None

#### Single Proof Uploaded (Legacy Bot Flow)
**Trigger:** `POST /api/transactions/:id/upload-proof`  
**Recipients:** Buyer (delivery update with proof image), Seller (upload confirmed)  
**Email fallback:** None

#### Buyer Confirms Receipt
**Trigger:** `PATCH /api/transactions/:id/status` with `status = 'confirm_receipt'`  
**Recipients:** Seller (funds released), Buyer (transaction complete confirmation)  
**Email fallback:** `sendTransactionCompletedEmail` (both)

#### Transaction Cancelled / Refunded
**Trigger:** `PATCH /api/transactions/:id/status` with `status = 'cancel'` or `'refund'`  
**Recipients:** Both buyer and seller  
**Email fallback:** None (status-specific message only)

---

### 3.2 Milestone Transactions

#### Milestone Marked Complete (by Seller)
**Trigger:** `POST /api/transactions/:id/milestone-status` with `status = 'COMPLETED'`  
**Recipients:** Buyer (review and release prompt), Seller (awaiting release confirmation)  
**Email fallback:** None (buyer needs to act within the window; cron handles delay)

#### Milestone Released (by Buyer)
**Trigger:** `POST /api/transactions/:id/milestone-status` with `status = 'RELEASED'`  
**Recipients:** Buyer (funds released confirmation), Seller (funds received)  
**Email fallback:** `sendMilestoneReleasedEmail` (both buyer and seller, with role)

#### All Milestones Released (Project Finalized)
**Trigger:** Same handler — fires when every milestone in the transaction is `RELEASED`  
**Recipients:** Both buyer and seller (project finalized message)  
**Email fallback:** `sendTransactionCompletedEmail` (both)  
**Also fires:** `recordNotification` entries for dashboard milestone progress cards

---

### 3.3 Reviews & Trust

#### Review Received
**Trigger:** `POST /api/reviews`  
**Source:** `packages/api/src/routes/reviews.ts`  
**Recipients:** The reviewed user  
**Email fallback:** `sendReviewReceivedEmail`

#### Trust Score Milestone Crossed
**Trigger:** Same `POST /api/reviews` handler — fires when the new review pushes the average across 3.0, 4.0, 4.5, or 5.0  
**Recipients:** The reviewed user  
**Email fallback:** None (celebratory; platform notification only)

#### Review Reply Received
**Trigger:** `PATCH /api/reviews/:id/reply`  
**Recipients:** The original reviewer  
**Email fallback:** None

---

### 3.4 Referrals

#### New Referral Signup Alert
**Trigger:** Registration hook in `POST /api/profiles/register` when `referred_by_id` is set  
**Source:** `packages/api/src/routes/profiles.ts`  
**Recipients:** Referrer (platform) + referrer email  
**Delivery:** `sendReferralNotification()` — has its own 24h window check  
**Email:** Inline HTML including total referral count

#### Commission Earned (Tier 1)
**Trigger:** `PATCH /api/transactions/:id/status` with `status = 'FINALIZED'` — fires for each tier 1 referrer of buyer or seller  
**Source:** `packages/api/src/routes/transactions.ts`  
**Recipients:** Referrer (platform)  
**Delivery:** `sendReferralNotification()` — has its own 24h window check  
**Email fallback:** `sendReferralCommissionEmail` (via `sendReferralNotification`)

#### Referral Milestone Celebration
**Trigger:** Same FINALIZED block — fires when referrer's total referral count hits 1, 5, 10, 25, 50, or 100  
**Recipients:** Referrer  
**Delivery:** `routeNotification()`  
**Email fallback:** `sendReferralMilestoneEmail`

#### Trade Count Milestone
**Trigger:** `PATCH /api/transactions/:id/status` with `status = 'FINALIZED'` — fires for both buyer and seller  
**Milestones:** 1, 5, 10, 25, 50, 100 completed trades  
**Recipients:** Buyer and/or Seller  
**Delivery:** `routeNotification()` — no email fallback (celebratory only)

---

### 3.5 Account Events

#### Withdrawal Initiated
**Trigger:** `POST /api/withdrawals`  
**Source:** `packages/api/src/routes/withdrawals.ts`  
**Recipients:** The withdrawing user  
**Email fallback:** `sendWithdrawalInitiatedEmail`

#### Dispute Raised
**Trigger:** `POST /api/disputes/raise`  
**Source:** `packages/api/src/routes/disputes.ts`  
**Recipients:** The non-raising party (counterparty)  
**Email fallback:** `sendDisputeRaisedEmail`

#### Dispute Resolved
**Trigger:** Admin resolves via `POST /api/disputes/:id/resolve`  
**Recipients:** Both buyer and seller (outcome message)  
**Email fallback:** `sendDisputeResolvedEmail` (both)

#### Admin Join/Leave Dispute Room
**Trigger:** `POST /api/disputes/:id/join`, `POST /api/disputes/:id/leave`  
**Recipients:** Both disputing parties  
**Delivery:** `sendNotification()` directly — **intentionally no email fallback** (low-urgency admin action)

#### Admin Message in Dispute
**Trigger:** `POST /api/disputes/:id/message`  
**Recipients:** Both disputing parties  
**Delivery:** `sendNotification()` directly — **intentionally no email fallback**

---

## 4. Cron-Driven Notifications

All cron jobs are registered in `packages/api/src/server.ts` using `node-cron`.

### 4.1 Transaction Lifecycle Reminders

**File:** `packages/api/src/cron/transactionReminders.ts`  
**Schedule:** Every 2 hours (`0 */2 * * *`)  
**Routing:** `routeNotification()` with email fallbacks  
**Approach:** Time-window banding — each bucket queries a narrow `updated_at` range so each transaction is only pinged once per tier.

| Bucket | Status | Time Window | Recipients | Email |
|--------|--------|-------------|------------|-------|
| 1 | `PENDING_SELLER_ACCEPTANCE` | created 24–48h ago | Seller (accept/decline) + Buyer (nudge sent) | `sendSellerAcceptanceReminderEmail` (seller) |
| 2 | `ACCEPTED` | updated 6–8h ago | Buyer | `sendPaymentReminderEmail` (nudge: 'first') |
| 3 | `ACCEPTED` | updated 24–26h ago | Buyer | `sendPaymentReminderEmail` (nudge: 'final') |
| 4 | `PAID` | updated 72–74h ago | Seller | `sendSellerDeliveryReminderEmail` (nudge: 'first') |
| 5 | `PAID` | updated 7d ±2h | Seller + Buyer (can dispute) | `sendSellerDeliveryReminderEmail` (nudge: 'final') |
| 6 | `COMPLETED_BY_SELLER` | updated 48–50h ago | Buyer | `sendReceiptConfirmationReminderEmail` (nudge: 'first') |
| 7 | `COMPLETED_BY_SELLER` | updated 5d ±2h | Buyer | `sendReceiptConfirmationReminderEmail` (nudge: 'final') |

---

### 4.2 Onboarding Drip

**File:** `packages/api/src/cron/onboardingDrip.ts`  
**Schedule:** Daily at 10:00 AM UTC (`0 10 * * *`)  
**Routing:** `routeNotification()` with email fallbacks  
**Gate:** Day 1/3/7 buckets only trigger if the user has zero transactions (buyer or seller).

| Bucket | Trigger Condition | Message Focus | Email |
|--------|-------------------|---------------|-------|
| Day 1 | Registered 23–25h ago, 0 transactions | Welcome — start your first trade | `sendOnboardingDay1Email` |
| Day 3 | Registered 71–73h ago, 0 transactions | Share your safetag | `sendOnboardingDay3Email` |
| Day 7 | Registered 167–169h ago, 0 transactions | Anti-scam urgency message | `sendOnboardingDay7Email` |
| KYC Nudge | Registered 167–169h ago, `kyc_status != 'VERIFIED'` | Complete identity verification | `sendKycNudgeEmail` |

---

### 4.3 Re-Engagement

**File:** `packages/api/src/cron/reEngagement.ts`  
**Schedule:** Daily at 11:00 AM UTC (`0 11 * * *`)  
**Routing:** `routeNotification()` with email fallbacks

#### 30-Day Inactivity Re-Engagement

Queries `linked_accounts.last_message_at` in the 30–31 day window (accounts inactive for exactly one day band).  
Only fires for users registered more than 30 days ago.

| Segment | Condition | Message |
|---------|-----------|---------|
| A (experienced) | Has at least 1 FINALIZED transaction | "We miss you — it's been N days" |
| B (never traded) | Zero FINALIZED transactions | "Still thinking about it? Here's why Safeeely works" |

**Email fallback:** `sendReEngagementEmail`

#### Balance Withdrawal Nudge

Aggregates FINALIZED seller earnings + COMPLETED referral commissions per user. Filters users who have non-zero balance and no withdrawal in the last 30 days.

**Email fallback:** `sendBalanceNudgeEmail`

---

### 4.4 Monthly Referral Summary

**File:** `packages/api/src/cron/referralSummary.ts`  
**Schedule:** 1st of each month at 9:00 AM UTC (`0 9 1 * *`)  
**Routing:** `routeNotification()` with email fallback

Fetches all `COMPLETED` commissions from the previous calendar month, groups by referrer, and sends each referrer a summary of trade count and earnings per currency.

**Email fallback:** `sendMonthlyReferralSummaryEmail`

---

## 5. Email Templates Reference

All functions live in `packages/api/src/services/email.ts`. Email is sent via the Resend HTTP API (fire-and-forget, 30s timeout). The `FROM_EMAIL` is `info@safeeely.com`.

| # | Function | Trigger | Subject Line |
|---|----------|---------|--------------|
| 1 | `sendTransactionInvoiceEmail` | Smart invoice confirmed | Invoice for [product] |
| 2 | `sendNewTransactionRequestEmail` | New transaction created (seller) | New Trade Request — [product] |
| 3 | `sendTransactionAcceptedEmail` | Seller accepts (buyer) | Your Trade is Accepted — [product] |
| 4 | `sendTransactionDeclinedEmail` | Trade declined (initiator) | Trade Declined — [product] |
| 5 | `sendPaymentConfirmedEmail` | Payment received (buyer + seller) | Payment Confirmed — [product] |
| 6 | `sendDeliverySubmittedEmail` | Seller marks complete (buyer) | Delivery Submitted — [product] |
| 7 | `sendTransactionCompletedEmail` | Receipt confirmed / all milestones released | Transaction Complete — [product] |
| 8 | `sendMilestoneReleasedEmail` | Milestone released (buyer + seller) | Milestone Released — [title] |
| 9 | `sendWithdrawalInitiatedEmail` | Withdrawal requested | Withdrawal Initiated |
| 10 | `sendWithdrawalCompletedEmail` | Withdrawal paid out | Withdrawal Complete |
| 11 | `sendWithdrawalRejectedEmail` | Withdrawal rejected | Withdrawal Rejected |
| 12 | `sendDisputeRaisedEmail` | Dispute opened (counterparty) | Dispute Raised — [product] |
| 13 | `sendDisputeResolvedEmail` | Dispute resolved (both parties) | Dispute Resolved — [product] |
| 14 | `sendReviewReceivedEmail` | Review left for user | New Review on Your Profile |
| 15 | `sendReferralCommissionEmail` | Commission earned | You Earned a Referral Commission |
| 16 | `sendKycApprovedEmail` | KYC status → VERIFIED | Identity Verified |
| 17 | `sendKycRejectedEmail` | KYC rejected | Identity Verification — Action Required |
| 18 | `sendPaymentReminderEmail` | Accepted txn 6h / 24h overdue (buyer) | Your Payment is Overdue |
| 19 | `sendSellerAcceptanceReminderEmail` | Pending acceptance 24h (seller) | Pending Trade Request — Action Needed |
| 20 | `sendReceiptConfirmationReminderEmail` | Delivered 48h / 5d unconfirmed (buyer) | Please Confirm Your Receipt |
| 21 | `sendSellerDeliveryReminderEmail` | Paid 72h / 7d undelivered (seller) | Your Buyer is Waiting |
| 22 | `sendOnboardingDay1Email` | Day 1 onboarding | Welcome to Safeeely |
| 23 | `sendOnboardingDay3Email` | Day 3 onboarding | Share Your Safetag |
| 24 | `sendOnboardingDay7Email` | Day 7 onboarding | Don't Get Scammed — Start Your First Trade |
| 25 | `sendKycNudgeEmail` | Day 7 KYC nudge | Complete Your Identity Verification |
| 26 | `sendReferralSignupEmail` | New user joins via referral link | New Referral — [name] Just Joined |
| 27 | `sendReferralMilestoneEmail` | Referral count hits milestone | Referral Milestone — [N] Referrals! |
| 28 | `sendMonthlyReferralSummaryEmail` | Monthly cron (1st of month) | Your [Month] Referral Report |
| 29 | `sendReEngagementEmail` | 30-day inactivity | We Miss You at Safeeely |
| 30 | `sendBalanceNudgeEmail` | Balance available, no withdrawal in 30d | You Have Earnings Waiting |

---

## 6. The 24-Hour Meta Window — Detailed Behavior

WhatsApp, Instagram, and Messenger (Meta platforms) only allow free-form outbound messages within **24 hours of the last inbound user message**. Outside this window, messages are silently dropped.

### How Safeeely handles this

Every incoming message from a Meta user triggers:
```
PATCH /api/profiles/platform-activity
{ platform, platform_id }
```

This updates `linked_accounts.last_message_at = now()` for that user.

When `routeNotification()` fires for a Meta user, it checks:
```typescript
const windowOpen = now - last_message_at < 24 * 60 * 60 * 1000;
if (windowOpen) sendNotification(platform, platform_id, message);
else emailFallback?.();
```

### Message Tags (inside the window)

Even inside the 24h window, Instagram and Messenger require a message tag for transactional messages:

- **Instagram:** `messaging_type: 'MESSAGE_TAG'`, `tag: 'POST_PURCHASE_UPDATE'`
- **Messenger:** `messaging_type: 'MESSAGE_TAG'`, `tag: 'ACCOUNT_UPDATE'`

These are applied automatically inside `sendNotification()`.

### What Telegram and Discord users experience

No window restriction. `routeNotification()` detects the platform is not Meta and sends immediately regardless of `last_message_at`. All buttons, images, and message formatting apply normally.

---

## 7. Intentional Omissions

| Omission | Reason |
|----------|--------|
| No email for admin join/leave/message in disputes | Low-urgency internal actions; users are already in an active dispute conversation |
| No email for delivery proof upload (all 3 handlers) | Brief status update; the cron reminder buckets (48h, 5d) handle the follow-up email |
| No separate "first commission" celebration | Covered adequately by the Tier 1 commission notification which fires immediately via `sendReferralNotification` |
| No email for trust score milestone crossings | Celebratory platform-only notification; no action required by the user |
| No email for trade count milestones | Same as above |
| No email for transaction cancel/refund (beyond status message) | Status messages are sent via routeNotification which handles email fallback for Meta users |

---

## 8. Coverage Map (Research Report → Implementation)

| Item | Description | Implementation |
|------|-------------|----------------|
| 1.1 | Seller acceptance reminder 24h | `transactionReminders.ts` Bucket 1 |
| 1.2a | Payment reminder 6h | `transactionReminders.ts` Bucket 2 |
| 1.2b | Payment reminder 24h (final) | `transactionReminders.ts` Bucket 3 |
| 1.3a | Delivery reminder 72h | `transactionReminders.ts` Bucket 4 |
| 1.3b | Delivery reminder 7d | `transactionReminders.ts` Bucket 5 |
| 1.4a | Receipt confirmation reminder 48h | `transactionReminders.ts` Bucket 6 |
| 1.4b | Receipt confirmation reminder 5d | `transactionReminders.ts` Bucket 7 |
| 1.5 | Declined transaction alert (initiator) | `transactions.ts` PATCH status — `decline` branch |
| 1.6 | Milestone released notification | `transactions.ts` POST milestone-status — RELEASED branch |
| 2.1 | Day 1 onboarding | `onboardingDrip.ts` Day 1 bucket |
| 2.2 | Day 3 onboarding | `onboardingDrip.ts` Day 3 bucket |
| 2.3 | Day 7 onboarding | `onboardingDrip.ts` Day 7 bucket |
| 2.4 | KYC nudge at 7 days | `onboardingDrip.ts` KYC nudge bucket |
| 3.1 | Referral signup alert | `profiles.ts` registration hook (event-driven) |
| 3.2 | Referral milestone celebrations | `transactions.ts` FINALIZED block |
| 3.3 | Monthly referral summary | `referralSummary.ts` (1st of month) |
| 3.4 | First commission celebration | Covered by Tier 1 commission via `sendReferralNotification` |
| 4.1 | Review received notification | `reviews.ts` POST create |
| 4.2 | Trust score milestone | `reviews.ts` POST create (post-insert average check) |
| 4.3 | Transaction count milestones | `transactions.ts` FINALIZED block |
| 5.1 | 30-day inactivity re-engagement (A/B) | `reEngagement.ts` |
| 5.2 | Balance withdrawal nudge | `reEngagement.ts` |
| 5.3 | Unfinished trade nudge | Covered by `transactionReminders.ts` Buckets 2 + 3 |
