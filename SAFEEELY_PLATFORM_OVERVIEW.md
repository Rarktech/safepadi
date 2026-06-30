# Safeeely — Complete Platform Overview

> **For AI marketers:** This document is the canonical reference for everything Safeeely does. It covers the product, the business model, every bot and channel, every feature, and how they all connect. Read it end-to-end before drafting any copy, campaign, or strategy.

---

## Table of Contents

1. [What Is Safeeely?](#1-what-is-safeeely)
2. [Who It's For](#2-who-its-for)
3. [Core Value Proposition](#3-core-value-proposition)
4. [How Escrow Works on Safeeely](#4-how-escrow-works-on-safeeely)
5. [Transaction Types](#5-transaction-types)
6. [Transaction State Machine](#6-transaction-state-machine)
7. [Fee Structure & Payment Models](#7-fee-structure--payment-models)
8. [Supported Payment Gateways](#8-supported-payment-gateways)
9. [Balance & Wallet System](#9-balance--wallet-system)
10. [Smart Transaction AI](#10-smart-transaction-ai)
11. [AI-Powered Dispute Resolution](#11-ai-powered-dispute-resolution)
12. [Reviews & Reputation System](#12-reviews--reputation-system)
13. [Referral & Commission System](#13-referral--commission-system)
14. [Marketplace](#14-marketplace)
15. [KYC & Compliance](#15-kyc--compliance)
16. [Community Groups & Revenue Sharing](#16-community-groups--revenue-sharing)
17. [Notification System](#17-notification-system)
18. [Bot Deep-Dive: Telegram](#18-bot-deep-dive-telegram)
19. [Bot Deep-Dive: Discord](#19-bot-deep-dive-discord)
20. [Bot Deep-Dive: WhatsApp](#20-bot-deep-dive-whatsapp)
21. [Bot Deep-Dive: Instagram](#21-bot-deep-dive-instagram)
22. [Bot Deep-Dive: Facebook Messenger](#22-bot-deep-dive-facebook-messenger)
23. [Bot Deep-Dive: Apple Messages for Business](#23-bot-deep-dive-apple-messages-for-business)
24. [Web App & Dashboard](#24-web-app--dashboard)
25. [Admin Panel](#25-admin-panel)
26. [Supported Currencies](#26-supported-currencies)
27. [Security & Trust Architecture](#27-security--trust-architecture)
28. [Glossary](#28-glossary)

---

## 1. What Is Safeeely?

**Safeeely** is an AI-powered escrow platform built for the way people actually trade today — on social media, messaging apps, freelance gigs, and crypto markets.

Instead of asking buyers and sellers to leave their favourite apps, Safeeely brings bank-grade escrow protection directly into Telegram, Discord, WhatsApp, Instagram, Facebook Messenger, and Apple Messages for Business. Every transaction is secured in escrow: money is held safely until the buyer confirms delivery, protecting both parties from fraud.

At its core, Safeeely is three things simultaneously:

- **A trust layer** for peer-to-peer commerce — no chargebacks, no fraud, no ghosting
- **A multi-platform bot network** — users transact from wherever they already are
- **An AI-first product** — from parsing transactions by voice to mediating disputes with Gemini AI

---

## 2. Who It's For

| Persona | How They Use Safeeely |
|---|---|
| **Social media resellers** | Sell sneakers, gadgets, fashion items safely to buyers on Instagram/WhatsApp |
| **Freelancers & agencies** | Get paid in escrow for design, writing, dev, video production — milestone by milestone |
| **Crypto traders** | Secure P2P crypto trades using USDT or crypto payment rails |
| **Digital product sellers** | Deliver accounts, courses, game keys, software with proof-of-delivery protection |
| **Service providers** | Tutors, virtual assistants, consultants — get paid upon confirmed completion |
| **Group admins & community owners** | Earn a revenue share by enabling trusted trading inside their Telegram/Discord communities |
| **Businesses & agencies** | Create structured escrow transactions with professional invoices and milestone billing |

---

## 3. Core Value Proposition

### For Buyers
- Money is held in escrow — never released until you confirm you received what was promised
- 5 categories to raise a dispute if something goes wrong
- AI mediator resolves disputes fairly and quickly (within 48 hours SLA)
- One safetag (@handle) works across all platforms

### For Sellers
- Get paid instantly when the buyer confirms receipt — no more chasing payments
- Professional receipts and PDF invoices generated automatically
- Reputation system builds buyer confidence over time
- Milestone-based payments for large projects — get paid at each phase

### For Everyone
- No app to download — works in Telegram, Discord, WhatsApp, Instagram, Messenger, and Apple Messages
- Supports fiat (NGN, USD, GBP, EUR) and crypto (USDT, BTC, ETH)
- AI reads voice notes or typed messages to create transactions in seconds
- Completely transparent fees — one flat rate, split however parties agree

---

## 4. How Escrow Works on Safeeely

### The Simple Version

1. **Seller or buyer creates the transaction** in any bot (or the web app)
2. **The other party accepts** — the deal is now locked in
3. **Buyer pays** via Flutterwave, OPay, ChainRails (crypto), or Airwallex
4. **Money sits in escrow** while the seller delivers
5. **Seller uploads proof** of delivery (screenshots, files, access credentials, photos)
6. **Buyer confirms receipt** — money is released to the seller instantly
7. **Both parties get receipts** and are prompted to leave reviews

If anything goes wrong at any step, either party can raise a dispute and the AI mediator takes over.

### For Milestone-Based Projects

For complex projects (e.g., a website build, a video series, a consulting engagement), Safeeely supports **milestone transactions**:

1. Buyer and seller agree on N phases (e.g., "30% upfront, 40% on draft, 30% on final")
2. The full total is paid into escrow upfront
3. Each milestone is independently completed by the seller and released by the buyer
4. Money flows incrementally — the seller earns at each confirmed milestone
5. When all milestones are released, the parent transaction is finalized

---

## 5. Transaction Types

### ONE_TIME
A single, lump-sum escrow transaction. Buyer pays once; seller delivers; buyer confirms; funds released. Used for product sales, one-off services, digital goods, etc.

### MILESTONE
A phased escrow transaction. The total amount is agreed upfront but released incrementally per milestone. Each milestone has its own title and amount. Used for freelance projects, phased product deliveries, instalment-based agreements.

**Milestone detection is automatic:** If a user says "50% upfront, balance on delivery" or "three phases: initial deposit, midpoint review, final delivery" — the AI recognizes this as a milestone transaction and auto-populates the phases.

---

## 6. Transaction State Machine

### ONE_TIME Lifecycle

```
PENDING_SELLER_ACCEPTANCE
│
├─── Seller declines ──────────────────────────► DECLINED
│                                                 (buyer refunded)
│
└─── Seller accepts ──────────────────────────► ACCEPTED
                                                  │
                                                  └─ Buyer pays ───────────────► PAID
                                                                                  │
                                                                     Seller uploads proof
                                                                                  │
                                                                                  ▼
                                                                     COMPLETED_BY_SELLER
                                                                     (or AWAITING_PROOF)
                                                                                  │
                                                             ┌────────────────────┤
                                                             │                    │
                                                    Buyer confirms           Buyer disputes
                                                             │                    │
                                                             ▼                    ▼
                                                        FINALIZED            DISPUTED ──► AI mediates
                                                    (funds released)              │
                                                                      ┌───────────┼───────────┐
                                                                      │           │           │
                                                                 CANCELLED  FINALIZED  RESOLVED_SPLIT
                                                               (buyer refund) (seller)  (proportional)
                                                                                           │
                                                                              RETURN_PENDING
                                                                           (buyer ships back)
                                                                                  │
                                                                             CANCELLED
```

### MILESTONE Lifecycle

```
PENDING_SELLER_ACCEPTANCE ──► ACCEPTED ──► PAID
                                              │
                               ┌──────────────┤
                               │   Per Milestone:
                               │   PENDING ──► COMPLETED (seller marks done)
                               │          ──► RELEASED (buyer confirms)
                               └──────────────┤
                                              │ (all milestones RELEASED)
                                              ▼
                                         FINALIZED
```

### All Possible Statuses

| Status | Meaning |
|---|---|
| `PENDING_SELLER_ACCEPTANCE` | Created, awaiting seller accept/decline |
| `ACCEPTED` | Seller accepted; awaiting buyer payment |
| `PAID` | Payment confirmed by gateway webhook |
| `AWAITING_PROOF` | Seller must upload delivery proof |
| `COMPLETED_BY_SELLER` | Proof uploaded; awaiting buyer confirmation |
| `FINALIZED` | Buyer confirmed; funds released to seller |
| `DECLINED` | Seller rejected the transaction |
| `DISPUTED` | Either party raised a dispute; transaction frozen |
| `CANCELLED` | Dispute resolved in buyer's favour; buyer refunded |
| `RESOLVED_SPLIT` | Dispute resolved with proportional split |
| `RETURN_PENDING` | Disputed goods must be returned before refund |
| `REFUNDED` | Funds returned to buyer |

### Milestone-Specific Statuses

| Status | Meaning |
|---|---|
| `PENDING` | Milestone not yet started |
| `COMPLETED` | Seller marked milestone as done |
| `RELEASED` | Buyer confirmed and released payment for this milestone |

---

## 7. Fee Structure & Payment Models

### Platform Fee
- **Default rate: 5%** of the transaction amount
- Configurable globally via admin settings (`platform_settings` table)
- Calculated and displayed transparently to both parties before confirmation

### Fee Allocation Options
Parties choose who pays the platform fee at the time of transaction creation:

| Option | How It Works |
|---|---|
| **Buyer pays** | Total amount buyer sends = transaction amount + 5% fee; seller receives clean amount |
| **Seller pays** | Buyer sends the agreed amount; seller receives (amount − 5% fee) |
| **Split 50/50** | Buyer pays half the fee on top; seller absorbs the other half from earnings |

### Fee Distribution on Finalization
When a transaction completes, the platform fee is distributed as follows:

- **Referral Tier 1 earner:** 10% of the platform fee (if the buyer was referred by someone)
- **Referral Tier 2 earner:** 5% of the platform fee (if the Tier 1 referrer was also referred)
- **Community group admin:** 25% (Pro license) or 40% (Enterprise license) of the platform fee if the trade happened inside a licensed Telegram/Discord group

---

## 8. Supported Payment Gateways

### Flutterwave
- Handles fiat payments (cards, bank transfer, USSD, mobile money)
- Webhook: HMAC-SHA256 signature verification
- Handles both transaction payments and community license payments
- Supports event types: `charge.completed`, `transfer.completed`

### OPay
- Fiat payment gateway (strong in Nigeria)
- Webhook: HMAC-SHA512 signature verification
- Status confirmation: `SUCCESSFUL` or code `00000`

### Airwallex
- Cross-border fiat payments
- Webhook: HMAC-SHA256 with timestamp
- Event: `payment_intent.succeeded`

### ChainRails (Crypto)
- Accepts crypto payments: USDC, USDT, ETH, and multi-chain support
- Webhook: HMAC-SHA256 on timestamp + body
- Event: `intent.completed` (final on-chain settlement)
- Stores blockchain transaction hash in metadata for full auditability

### Amount Validation
All gateways: reported amount must match expected amount **within 2% tolerance** (to absorb FX rounding differences). Mismatched amounts are flagged and rejected.

---

## 9. Balance & Wallet System

Every Safeeely user has a **four-bucket balance** — a real-time, multi-currency breakdown of where their money is:

### Bucket 1 — Available Balance
Money the user can withdraw right now.

- Sum of all FINALIZED one-time transactions (minus seller's fee share)
- Sum of all RELEASED milestones (pro-rata fee deduction)
- Plus all referral commissions earned
- Minus all processed withdrawals

### Bucket 2 — Pending Escrow
Money currently locked in active transactions (not yet yours).

- Transactions in: ACCEPTED, PAID, AWAITING_PROOF, COMPLETED_BY_SELLER
- Net of fee deduction (so the seller sees what they'll actually receive)

### Bucket 3 — In Withdrawal
Money you've requested to withdraw but hasn't settled yet.

- Withdrawals with status: PENDING or PROCESSING

### Bucket 4 — Pending Refunds (Buyers)
Buyer-specific: dispute credits awaiting processing.

- Buyer refund credits with status: PENDING or PROCESSING

### Multi-Currency
All four buckets are shown per currency independently (NGN, USD, USDT, EUR, GBP, etc.).

### Withdrawal Flow
1. User requests withdrawal (requires KYC verification above currency thresholds)
2. Payout method selected (bank account, crypto address, mobile money)
3. Status: PROCESSING → COMPLETED
4. Reference: `WD-{random}` for tracking
5. Confirmation sent via notification + email

---

## 10. Smart Transaction AI

Safeeely's Smart Transaction feature lets users **describe a trade in plain English or via voice** — and the AI creates the entire transaction draft automatically.

### How It Works
1. User sends a voice note or typed message like: *"I'm selling my MacBook Pro for 500,000 naira to @johndoe, he pays the fee, split into 3 phases"*
2. The AI (powered by Google Gemini) parses the message
3. A complete draft is generated including product name, amount, currency, counterparty safetag, role, fee allocation, and milestones (if phased)
4. If anything is missing, the AI asks a targeted follow-up question (e.g., *"What currency should this be in?"*)
5. User confirms the draft and is launched directly into the confirmation wizard
6. Iterative refinement: *"Change the amount to 600,000"* updates the draft in place

### What the AI Extracts

| Field | Example |
|---|---|
| `product_name` | "MacBook Pro 2021" |
| `description` | "16-inch, M1 Pro, 512GB SSD" |
| `amount` | 500000 |
| `currency` | "NGN" |
| `counterparty_safetag` | "@johndoe" |
| `role` | "seller" |
| `fee_allocation` | "buyer" |
| `transaction_type` | "MILESTONE" |
| `milestones` | `[{title: "Deposit", amount: 150000}, ...]` |

### Milestone Detection Keywords
The AI automatically detects phased payments from phrases like:
- "50% upfront, balance on delivery"
- "three stages"
- "initial deposit then final payment"
- "first phase, second phase"
- "deposit then balance"

### Voice Support
- Telegram: `.ogg` voice notes (converted via FFmpeg before AI processing)
- Discord: Audio file attachments
- WhatsApp: WhatsApp voice notes
- All other platforms: Text input

---

## 11. AI-Powered Dispute Resolution

Safeeely's dispute system is one of its most powerful differentiators. Every dispute is handled by an **AI mediator (Gemini)** before any human gets involved.

### Raising a Dispute
Either the buyer or seller can raise a dispute when a transaction is in: PAID, AWAITING_PROOF, or COMPLETED_BY_SELLER.

**Dispute categories:**
1. Not Delivered
2. Not As Described
3. Credentials / Access Issue
4. Service Incomplete
5. Payment Issue
6. Other

After category selection, the disputing party provides a written description (minimum 10 characters). The transaction is immediately **frozen** — no further status changes until resolution.

### The 4-Stage AI Pipeline

#### Stage 1: Classification
The AI reads the dispute reason and transaction context, then assigns:
- **Dispute type** (e.g., non_delivery, product_quality, wrong_item, fraud_risk)
- **Pipeline tier**: STANDARD, COMPLEX, or FRAUD_RISK

#### Stage 2: Evidence Collection
The AI asks the relevant party (buyer or seller) for specific evidence with a **2-hour deadline**. Examples:
- "Please upload a screenshot showing the item was not as described"
- "Provide your tracking number for the return shipment"

Reminders are sent automatically if deadlines are missed.

#### Stage 3: Verdict Generation

| Verdict Type | What Happens |
|---|---|
| `REFUND_BUYER` | Transaction → CANCELLED; buyer credit issued immediately |
| `PAY_SELLER` | Transaction → FINALIZED; seller receives full amount; referral commissions issued |
| `SPLIT` | Transaction → RESOLVED_SPLIT; buyer and seller each receive a defined percentage |
| `REFUND_AFTER_RETURN` | Transaction → RETURN_PENDING; buyer must ship goods back; seller confirms receipt; then buyer refunded |

#### Stage 4: Escalation to Human
If the AI's confidence is low, the case is too complex, or 5 question rounds are exceeded, the AI pauses and routes the case to a human specialist. The specialist is smart-matched by specialty.

### SLA Enforcement
An automated cron job runs **hourly**:
- Any OPEN dispute where the AI last spoke more than **48 hours ago** is auto-closed
- Default verdict: PAY_SELLER (escrow standard — buyer is responsible for pursuing further)
- Credits and reputation updates are issued automatically

### Evidence Upload
Both parties can upload up to 20 evidence files (images, documents, screenshots) directly within the dispute thread.

### Reputation Tracking
After every dispute, each user's reputation record is updated:
- `disputes_raised_count`, `disputes_against_count`
- `disputes_won_as_buyer`, `disputes_lost_as_buyer`
- `disputes_won_as_seller`, `disputes_lost_as_seller`
- `trust_score` (baseline 50, adjusted up/down by outcomes)
- `fraud_flags`, `ghosted_count`

---

## 12. Reviews & Reputation System

### Leaving a Review
After a transaction reaches FINALIZED status, both buyer and seller are prompted to leave a review.

**Review fields:**
- Rating: 1–5 stars
- Comment (free text)
- Proof photo (optional — adds credibility)

### Reputation Scores
Each user has a public reputation profile:
- **Average star rating** (calculated from all received reviews)
- **Total review count**
- **Trust score** (0–100, affected by dispute outcomes)

Review profiles are publicly visible — linked in every transaction confirmation so the other party can check before accepting.

### Review Interactions
- **Seller replies** to reviews (one reply per review)
- **Upvote / Downvote** — community validates the most helpful reviews

### Trust Score Milestones
Notifications are sent when a seller's average rating crosses thresholds:
- 3.0 → "You're building trust"
- 4.0 → "Strong reputation"
- 4.5 → "Near top-rated"
- 5.0 → "Perfect score achieved"

### Badge System

| Badge | Criteria | Meaning |
|---|---|---|
| **Early Bird** | First 100 users to register | Founding member of Safeeely |
| **KYC Verified** | Identity verification approved | Identity confirmed — high-trust account |
| **Trusted Seller** | 10+ completed trades + 4.5+ avg rating | Proven reliable seller |
| **Whale Buyer** | $1M+ total spent across finalized transactions | High-volume buyer |
| **Zero Drama** | 20+ completed trades with zero disputes | Exceptionally clean trading record |

Badges are displayed on public profiles and visible to counterparties before accepting deals.

### Trade Milestones (Gamification)
Celebration notifications are sent when a user completes their 1st, 5th, 10th, 25th, 50th, and 100th trade as buyer or seller.

---

## 13. Referral & Commission System

Safeeely runs a **two-tier referral programme** that pays ongoing commissions — not just a one-time signup bonus.

### How It Works

Every user has a unique referral link: `https://Safeeely.com/@safetag`

- **Tier 1:** Your direct referrals. When someone signs up with your link and completes a transaction **as a buyer**, you earn **10% of the platform fee** from that transaction.
- **Tier 2:** Referrals of your referrals. When your Tier 1 users' own referrals complete transactions as buyers, you earn **5% of the platform fee**.

Commissions are earned on every qualifying completed transaction — not just the first one. This means a productive referral earns you income indefinitely.

### Commission Trigger
Commissions are paid when:
- The referred user completes a transaction **as the buyer** (not as the seller, not on creation — only on finalization)

### Referral Stats Dashboard
Available in all bots and the web app:
- Total Tier 1 referrals
- Total Tier 2 referrals
- Earnings per currency
- Recent activity (transactions earning commissions, with product details)
- **Leaderboard:** Top 10 referrals by total earnings value

### Referral Card
A shareable PNG image is auto-generated per user — ready to post on social media to drive signups.

### Referral Milestones
Notifications at: 1, 5, 10, 25, 50, 100 direct referrals.

---

## 14. Marketplace

Safeeely has a built-in marketplace where users can list products, services, and jobs — and every listing has built-in "Pay with Safeeely" integration.

### Listing Types

| Category | Subtypes | Use Case |
|---|---|---|
| **Product** | Physical, Digital | Gadgets, fashion, software, accounts, game keys |
| **Service** | (Offered by freelancer) | Design, writing, dev, video, tutoring, VA |
| **Job** | (Posted by employer) | Hiring for full-time, part-time, contract roles |

### Listing Fields
- Title, description, price, currency
- Fee handling (buyer/seller/split)
- Up to 5 images
- Tags and features list
- For jobs: job_role, location_type (remote/onsite/hybrid), employment_type
- Geographic scope: GLOBAL, REGIONAL, or COUNTRY-RESTRICTED

### Discovery & Filtering
- Full-text search across title + description
- Filter by intent (hiring/offering/selling), category, location, country
- Geolocation filtering: GLOBAL listings are visible everywhere; country-restricted listings only appear when the buyer is in the matching country
- View count tracking (increments per visit)

### Trust Integration
Every listing shows:
- Seller's safetag, avatar, and trust score
- Total trade count and review count
- "Pay with Safeeely" CTA that links directly to escrow checkout

---

## 15. KYC & Compliance

### Why KYC Matters
KYC (Know Your Customer) unlocks higher withdrawal limits and signals to counterparties that a user's identity has been verified.

### Submission Flow (5 Steps)
1. **Phone Verification** — Country picker + phone number + OTP
2. **OTP Confirmation** — 4-digit code with auto-focus input
3. **Basic Information** — Name (pre-filled from profile), date of birth, country of residence, state, city, address
4. **Document Upload:**
   - Nigeria: 11-digit NIN (National Identification Number) — *dial *346# to retrieve*
   - Other countries: Front + back photo of government-issued ID
5. **Success Screen** — "KYC Application Under Review" with animated verification badge

### KYC Thresholds (Withdrawal Gates)
Users without verified KYC **cannot withdraw** above these amounts:

| Currency | Threshold |
|---|---|
| USD | $100 |
| NGN | ₦100,000 |
| USDT | $100 |
| EUR | €100 |
| BTC | 0.002 BTC |

Above these limits, KYC verification is mandatory.

### KYC Status Flow
`PENDING` → (Admin reviews) → `VERIFIED` or `REJECTED`

- Admin is notified immediately when a new submission arrives
- User is notified via their linked platform when the decision is made

---

## 16. Community Groups & Revenue Sharing

Safeeely allows **Telegram group admins and Discord server owners** to turn their communities into trusted trading hubs — and earn a cut of every trade that happens inside.

### How It Works
1. Group admin sets up Safeeely in their group via deep link or slash command
2. Members can create trades directly inside the group (with a "Trade" button)
3. Every completed transaction in the group generates a commission for the group admin

### Licensing Tiers

| Tier | Platform Fee Share | Monthly Cost |
|---|---|---|
| **Free** | 10% of platform fee | Free |
| **Pro** | 25% of platform fee | ₦15,000/month |
| **Enterprise** | 40% of platform fee | ₦35,000/month |

**Example:** A ₦1,000,000 trade at 5% fee = ₦50,000 platform fee. An Enterprise admin earns ₦20,000 from that single trade.

### Admin Dashboard
Group/server admins see:
- Total deals in their group
- Completion rate
- Disputed deals count
- Earnings by currency
- Withdrawable balance
- License tier and expiry date
- Renew/Upgrade links

### License Payments
Handled via Flutterwave webhooks:
- `UPLG-` prefix = new license purchase
- `RNWL-` prefix = license renewal (extends expiry by configured days)
- Admin is notified of new expiry date upon payment

---

## 17. Notification System

Every status change in Safeeely triggers notifications to all relevant parties. The notification system is **multi-platform aware** — it routes messages to wherever each user is active.

### Routing Logic
1. Try each linked platform in preferred order (primary platform first)
2. **Always-on platforms** (Telegram, Discord, Apple Messages): notify regardless of last activity
3. **Meta platforms** (WhatsApp, Instagram, Messenger): check for 24-hour activity window before notifying (Meta policy)
4. **Email fallback:** If no active platform is available, send email instead

### Notification Triggers

| Event | Who Gets Notified |
|---|---|
| Transaction created | Counterparty (accept/decline prompt) |
| Transaction accepted | Buyer (payment prompt) |
| Payment confirmed | Both parties (receipt + next steps) |
| Proof uploaded | Buyer (confirm or dispute) |
| Buyer confirmed receipt | Seller (funds released) |
| Dispute raised | Other party (dispute details + link) |
| Dispute resolved | Both parties (verdict + outcome) |
| Milestone completed | Buyer (release prompt) |
| Milestone released | Seller (payment received) |
| Review received | Reviewee (star rating + comment) |
| KYC decision | User (verified or rejected) |
| Withdrawal processed | User (amount + reference) |
| Referral signed up | Referrer (new user joined) |
| Referral commission earned | Earner (amount + currency) |
| Badge unlocked | User (badge name + congrats) |
| Trade milestone hit | User (1st, 5th, 10th... deal celebration) |
| Group commission earned | Group admin (amount + txn ref) |

### Platform-Specific Message Formats

| Platform | Format |
|---|---|
| **Telegram** | HTML-formatted text + inline keyboard buttons with callback_data |
| **Discord** | Rich embeds (color-coded borders by type) + action button rows |
| **WhatsApp** | Interactive button messages + CTA URL buttons for web links |
| **Instagram** | Button templates (up to 3 buttons) or quick replies (up to 13) |
| **Messenger** | Button templates + generic template cards; uses MESSAGE_TAG for notifications |
| **Apple Messages** | TEXT + BUTTONS messages with id/text/title/description/subtitle per button |
| **Email** | HTML email with inline styles (table-based layout for Gmail compatibility) |

### Receipt Generation
After every payment confirmation:
- A **PNG receipt** is generated via Puppeteer (headless Chrome)
- Receipt includes: transaction ID, product name, amount, fee, parties, timestamp, QR code
- Cached in 3 layers: in-memory → Supabase Storage → regenerated on miss
- **Marketing mode:** Receipt includes the user's referral link for conversion bonus

---

## 18. Bot Deep-Dive: Telegram

Safeeely's Telegram bot is the most feature-complete bot in the ecosystem, supporting voice transactions, group trading, and full milestone management.

### Registration Flow

1. Privacy policy acceptance (button required)
2. "I'm New" vs "I Have an Account"
3. **Register path:** First name → Last name → Email → Email OTP (6-digit) → Choose safetag → Account created
4. **Login path:** Enter safetag → OTP sent to all linked accounts + email → Verify code → Telegram linked

### Main Menu

| Button | Action |
|---|---|
| 🛒 Create Transaction | Starts transaction wizard |
| 📋 My Transactions | View ongoing, completed, disputed trades |
| 💰 Balance & Withdrawals | 4-bucket balance + withdrawal magic link |
| 🎁 Referral | Referral stats, card, and invite link |
| ⭐ Reviews & Ratings | Public review profile |
| ⚙️ Settings & Account | Account settings, linked platforms, KYC |
| 📊 My Groups | (Group admins only) Community dashboard |

### Transaction Creation Wizard (12+ Steps)

1. Role: Buyer or Seller
2. Transaction type: One-Time or Milestone-Based
3. Product name
4. Description
5. Attachments (optional — skip button available)
6. Currency: NGN, USD, or USDT
7. Amount (or milestone setup if selected)
8. Milestone entry (if applicable): title → amount → repeat for each phase
9. Fee allocation: Buyer / Seller / Split
10. Counterparty safetag (with real-time profile validation)
11. Counterparty profile preview (rating, badges, review link)
12. Full summary review
13. Smart Invoice option (send professional PDF to buyer's email)
14. Confirmation → Transaction created with ID

### Smart Transaction (Voice + Text)

- Send any voice note → FFmpeg converts to Gemini-compatible format → AI creates draft
- Send natural language text → same AI pipeline
- Draft confirmed by user → wizard starts at summary step
- Iterative: follow-up messages refine the draft

### Lifecycle Buttons

| Status | Available Buttons |
|---|---|
| PENDING_SELLER_ACCEPTANCE | ✅ Accept / ❌ Decline |
| ACCEPTED | 💳 Pay Now |
| PAID | 📤 Upload Proof |
| AWAITING_PROOF | 📎 Upload (auto-detects photos) |
| COMPLETED_BY_SELLER | ✔️ Confirm Receipt / ⚠️ Dispute |
| FINALIZED | ⭐ Leave Review |
| DISPUTED | 📋 View Dispute Details |

### Dispute Wizard

1. Select category (6 options via inline keyboard)
2. Describe the issue (minimum 10 characters)
3. Confirmation → transaction frozen → magic link to dispute portal

### Group Trading

- `/deal` or `/trade` command in a group chat → trade request sent with deep link
- Per-group cooldown (5 minutes) to prevent bot flooding
- Group admin setup via `/start setup_{telegramGroupId}` deep link
- Three licensing tiers selectable from within Telegram
- Group admin dashboard accessible via "📊 My Groups"

### Unique Telegram Features

- Deep link system:
  - `/start group_{groupId}` — Join specific group trade
  - `/start setup_{telegramGroupId}` — Group admin licensing setup
  - `/start resume_{txnId}` — Resume interrupted transaction from email link
  - `/start ref_code` — Track referral signup
- @mention support in group chats
- Photo auto-detection (bot detects photo uploads as proof automatically)
- Voice message processing with FFmpeg
- `localhost` URLs automatically rewritten to `127.0.0.1` for Telegram button compatibility

---

## 19. Bot Deep-Dive: Discord

The Discord bot mirrors Telegram's feature set adapted for Discord's interaction model — modals, buttons, slash commands, and rich embeds.

### Registration Flow

Same pattern as Telegram: Privacy policy → Login/Register → Email OTP → Safetag → Account linked.

### Main Menu

Same 7 items as Telegram, rendered as Discord button rows:
🛒 Create Transaction | 📋 My Transactions | 💰 Balance & Withdrawals | 🎁 Referral | ⭐ Reviews | ⚙️ Settings | 📊 My Servers

### Transaction Creation Wizard

- 12-step button-based flow using Discord's component interactions
- Supports ONE_TIME and MILESTONE
- Smart Transaction AI processes audio attachments and text

### Smart Transaction in Discord

- Users attach audio files → AI transcribes + parses
- Private transactions in guild channels: bot sends draft to DMs for privacy
- Requests DM permissions if not granted

### Guild (Server) Features

- `!deal` or `!trade` commands in guild channels
- @mention the bot to trigger trade requests
- Server licensing dashboard under "My Servers"
- Same 3 tiers as Telegram (Free/Pro/Enterprise)
- Revenue share accrues to server admin

### Profile Cache

Discord bot caches user profile lookups for **5 minutes** via Axios interceptor — prevents rate limit issues when multiple button clicks trigger rapid API calls.

### Unique Discord Features

- Rich embeds with color-coded borders (by notification type)
- Button `custom_id` (snake_case) for all action components
- Guild vs. DM context awareness
- Discord markdown formatting: `**bold**`, `_italic_`, `` `code` ``
- Automatic DM fallback for private conversations in public servers

---

## 20. Bot Deep-Dive: WhatsApp

WhatsApp has strict messaging policies — Safeeely adapts by using interactive **list messages**, **CTA URL buttons**, and **WhatsApp Flows** for secure form submissions.

### Registration Flow

1. Privacy policy acceptance (button)
2. New vs. existing account selection (buttons)
3. Email entry → OTP → Verification → Safetag creation or login

### Main Menu

Displayed as a WhatsApp **list message** with 7 items:
- 🛒 Create Transaction
- 📋 My Transactions
- 💰 Balance & Withdrawals
- 🎁 Referral
- ⭐ Reviews & Ratings
- 💭 Send Feedback
- ⚙️ Settings & Account

### Transaction Wizard

Multi-step using WhatsApp interactive lists and buttons:
Role → Product name → Description → Currency → Amount → Fee allocation → Counterparty → Confirmation

Attachments: photos and documents can be sent directly in chat and are automatically detected.

### WhatsApp Flows

For sensitive interactions (forms, registration steps), Safeeely uses **WhatsApp Flows** — RSA-encrypted interactive screens embedded in WhatsApp. Private key stored server-side; all form submissions are encrypted end-to-end.

### Smart Transaction on WhatsApp

- Voice notes processed and transcribed via FFmpeg
- Text messages parsed by Gemini AI
- Draft confirmed by button → wizard proceeds to confirmation

### Message Types Used

| Type | When |
|---|---|
| TEXT | General messages, status updates |
| INTERACTIVE (buttons) | Quick choice selections (max 3 buttons) |
| INTERACTIVE (list) | Menu navigation |
| INTERACTIVE (CTA_URL) | Web links (payment, dispute portal) |
| IMAGE | Receipt images, referral cards |

### Unique WhatsApp Features

- 24-hour messaging window enforced (Meta policy)
- RSA-encrypted WhatsApp Flows for secure form input
- CTA_URL buttons for web-based payment and withdrawal links
- Voice note processing via WhatsApp's native audio format

---

## 21. Bot Deep-Dive: Instagram

Instagram's bot is constrained to quick replies, button templates, and generic cards — Safeeely maximizes these formats to deliver the full escrow experience.

### Registration Flow

1. Welcome message with privacy policy link
2. "Agree" button
3. New vs. existing account selection
4. Email OTP verification
5. Safetag creation or platform linking

### Persistent Menu (7 Items)

Accessible at any time via the Instagram chat menu:
1. 🛒 Create Transaction
2. 📋 My Transactions
3. ⚙️ Settings & Account
4. 💰 Balance & Withdrawals
5. 🎁 Referral
6. ⭐ Reviews & Ratings
7. ❓ Help

**Ice breaker:** "🚀 Get Started"

### Message Formats Used

| Format | When Used |
|---|---|
| Quick replies | Navigation shortcuts (up to 13 options) |
| Button templates | CTA buttons with web URLs or postbacks |
| Generic templates | Rich cards (up to 10 cards per message) |

### Transaction Flow

Role → Product → Description → Currency → Amount → Fee → Counterparty → Confirmation
Both ONE_TIME and MILESTONE supported.

### Unique Instagram Features

- Quick reply shortcuts are used heavily for navigation efficiency
- Generic templates display transaction details as visual cards
- Web URL buttons for payment links, dispute portal, withdrawal portal
- Emoji-rich messaging style

---

## 22. Bot Deep-Dive: Facebook Messenger

The Messenger bot is structurally identical to Instagram — same flows, same message templates, adapted for Messenger's platform specifics.

### Key Differences from Instagram

- **Get Started button** configured via messenger_profile API
- **Greeting text** customized for first-time visitors
- **MESSAGE_TAG** used for transactional notifications (CONFIRMED_EVENT_REMINDER, PURCHASE_UPDATE) — allows notifications outside the 24-hour window for relevant transaction events
- Persistent menu configuration via messenger_profile

### Persistent Menu

Same 7 items as Instagram:
🛒 Create Transaction | 📋 My Transactions | ⚙️ Settings | 💰 Balance | 🎁 Referral | ⭐ Reviews | ❓ Help

### Registration & Transaction Flow

Identical to Instagram: Privacy policy → New/Existing → OTP → Safetag → Main menu.

Transaction wizard: Role → Product → Description → Currency → Amount → Fee → Counterparty → Confirmation.

---

## 23. Bot Deep-Dive: Apple Messages for Business

Safeeely integrates with Apple Messages for Business via **JivoChat** — enabling escrow transactions through the native iMessage interface on iOS/macOS.

### How It Works

- Webhook-based bot running on the JivoChat platform
- Users interact via iMessage; JivoChat routes messages to Safeeely's webhook
- Safeeely responds with TEXT, BUTTONS, or RICH_LINK messages
- Human agent escalation available (INVITE_AGENT event)

### Main Menu

Button-based with rich descriptions — each button has an `id`, `text`, `title`, `description`, and `subtitle`:
1. 🛒 Create Transaction
2. 📋 My Transactions
3. 💰 Balance & Withdrawals
4. 🎁 Referrals
5. ⭐ Reviews & Ratings
6. ⚙️ Settings & Profile

Menu triggers: "hello", "hi", "menu", "start", or "back" command.

### Transaction Wizard (8-Step State Machine)

| Step | State | Input |
|---|---|---|
| 1 | ROLE_SELECTION | Buyer / Seller button (or "1"/"2" text) |
| 2 | PRODUCT_NAME | Free text |
| 3 | PRODUCT_DESCRIPTION | Free text |
| 4 | ATTACHMENTS | File upload (or "Skip") |
| 5 | CURRENCY_SELECTION | NGN / USD / USDT button |
| 6 | PRICE_INPUT | Free text (number) |
| 7 | FEE_ALLOCATION | Buyer / Seller / Split button |
| 8 | COUNTERPARTY_SAFETAG | @safetag text → profile preview → confirm |

### Session Management

- Server-side `Map<clientId, UserState>` maintains state per conversation
- State includes all wizard form fields
- Resets to IDLE on "menu" / "back" / "start" commands

### Human Escalation

- If user types "i need help", "agent", or "support" → bot sends INVITE_AGENT event to JivoChat
- Bot pauses; human support agent takes over
- Designed for complex disputes or onboarding questions

### Unique Apple Features

- RICH_LINK messages for web content (payment links, receipts)
- Force reply option on buttons
- Each button carries a subtitle for additional context
- Token-based webhook authentication (per-provider token in URL)

---

## 24. Web App & Dashboard

Safeeely's web app (`packages/frontend`) is a Next.js 16 application that serves buyers, sellers, and platform administrators.

### Authentication

- **Passwordless magic link** — user enters email → receives link → clicks → session created
- Token format: `mlt_[random]`
- Session cookie: `sf_session` (HTTP-only, 30-minute max age)
- Protected routes: `/dashboard/*`, `/kyc` require active session
- Public routes: `/pay/*`, `/marketplace/*`, `/receipt/*` always accessible

### Dashboard (Logged-In Users)

- **Stats cards:** Total Revenue, New Customers, Active Accounts, Growth Rate
- **Revenue chart:** Monthly earnings area chart with trend indicator
- **Transaction table:** Recent trades with status badges, buyer/seller info, amounts
- **Sidebar navigation:** All main sections accessible from collapsible left nav
- **Premium UX:** Skeleton loaders, fade-in animations, smooth transitions

### Pay Page (`/pay/[transaction-id]`)

The buyer-facing payment page — accessible via a shareable link:

**Displays:**
- Transaction ID (txn_code)
- Product/service being purchased
- Total amount with currency symbol
- Fee breakdown
- Escrow protection messaging

**Payment Methods Available:**
1. **OPay Express** — instant payment
2. **Flutterwave** — cards, bank transfer, USSD
3. **Crypto via ChainRails** — USDC, USDT, ETH, multi-chain
4. *(Direct Bank Wire — coming soon)*

**Security messaging displayed:**
- Bank-Grade Security (PCI DSS Compliant)
- Insured protection up to $50,000
- 256-bit SSL Encryption
- End-to-End Escrow Protection

### Payment Success Page (`/pay/success/[id]`)

- Large animated success checkmark (emerald green)
- Transaction status timeline showing: Payment Confirmed → Awaiting Delivery → Buyer Confirms Receipt
- Transaction ID displayed
- "Return to Messenger" CTA

### KYC Page (`/kyc`)

5-step KYC flow (detailed in [Section 15](#15-kyc--compliance)):
- Phone verification with country picker
- OTP confirmation
- Basic personal information
- Document upload (NIN for Nigeria, photo ID for others)
- Animated success screen

### Marketplace (`/marketplace`)

- **Listing Grid:** Products, Services, Jobs with filter bar
- **Listing Detail Page:** Image gallery, description, seller trust score, "Pay with Safeeely" CTA
- **Verified Feedback:** Reviews shown with star ratings
- **Related Services carousel**
- **Jobs board:** AI agencies and freelance roles with location and employment type filters

### Transaction Tracking

- Smart routing: if transaction is in AWAITING_PROOF / COMPLETED_BY_SELLER → redirects to `/delivery/[id]`
- Otherwise → redirects to `/receipt/[id]`
- Real-time status display

---

## 25. Admin Panel

Safeeely's admin panel is a real-time operations centre for platform staff.

### Real-Time Intelligence

The admin dashboard uses Supabase real-time listeners to push **instant notifications** as events happen:

| Event | Notification |
|---|---|
| New transaction created | "Order #TXN created" (blue icon) |
| Payment received | "FUNDED" (emerald, glow effect) |
| Dispute raised | "⚠️ Dispute Incident" (red, animated pulse) |
| Withdrawal requested | "Withdrawal in progress" (amber) |

### KPI Cards

4 real-time metric cards, all filterable by currency:
- **Total Volume** — total escrow value across all finalized transactions
- **Safeeely Profit** — total platform fees collected
- **New Customers Today** — registrations in the last 24 hours
- **Total Orders** — all-time transaction count

### Revenue Charts

- Monthly revenue trajectory (area chart)
- Tabs: Volume vs. Growth
- Trending indicator with percentage change

### Market Intelligence Panel

- Total active users with trend
- Platform breakdown: Telegram %, Discord %, WhatsApp % usage
- Horizontal bar charts with glow effect

### Customer Management (`/admin/customers`)

**Customer stats:**
- Total customers
- New this week
- Average order value
- Customer satisfaction score

**Customer table:**
- Avatar, name, safetag, email
- Platform icons for each linked channel (Telegram, Discord, WhatsApp, Instagram — color-coded)
- Order count, total spent, account status
- Actions: View Profile, Block/Unblock, Delete (with confirmation modal)

### Transaction Ledger (`/admin/transactions`)

**Filters:**
- Text search (TXN code, product, buyer/seller safetag)
- Status dropdown (All, Ongoing, Completed, Disputed, Cancelled)
- Currency filter
- Date range picker

**Table columns:**
- TXN Code, Product Name, Buyer, Seller, Amount + flag emoji, Fee, Status (color badge), Date, Actions

**Status color coding:**
- FINALIZED: emerald | PENDING: amber | PAID: blue | DISPUTED: rose | CANCELLED: slate

### Dispute Resolution Centre (`/admin/disputes`)

**Filter tabs:** Everything, Open, Escalated, Resolved

**Stats:**
- Untouched Cases (rose icon with clock)
- Resolved Today (emerald with checkmark)
- Locked Value (total escrow amount in active disputes)

**Dispute cards:**
- Alert icon (animated pulse for OPEN)
- Case ID, status badge
- Product name, buyer → seller parties
- Escrow value
- Click to open full dispute thread with evidence grid, AI verdict, resolution controls

---

## 26. Supported Currencies

| Currency | Symbol | Notes |
|---|---|---|
| NGN | ₦ | Nigerian Naira — primary market |
| USD | $ | US Dollar |
| USDT | USDT | Tether (stablecoin) — crypto rail |
| EUR | € | Euro |
| GBP | £ | British Pound |
| BTC | ₿ | Bitcoin |
| ETH | Ξ | Ethereum |
| USDC | USDC | USD Coin (via ChainRails) |
| SOL | ◎ | Solana |
| JPY | ¥ | Japanese Yen |
| CHF | CHF | Swiss Franc |
| CNY | ¥ | Chinese Yuan |
| INR | ₹ | Indian Rupee |

KYC withdrawal thresholds apply per currency (see [Section 15](#15-kyc--compliance)).

---

## 27. Security & Trust Architecture

### User Authentication

- **Email OTP:** 6-digit code sent to verify identity during registration and login
- **JWT sessions:** Issued on verification; stored as HTTP-only cookie (`sf_session`)
- **Session revocation:** Every JWT has a unique `jti`; revocation tracked in database — logout invalidates immediately
- **Scope elevation:** Sensitive actions (withdraw, add payout method, KYC submission) require scope elevation — user must re-confirm via OTP
- **Rate limiting:** OTP requests capped at 3 per 15 minutes per platform ID

### Bot Authentication

- All bots call the API using **HMAC-SHA256 signatures** on `platform|platform_id`
- Bot middleware validates signature before processing any request
- Prevents unauthorized API calls from external sources

### Payment Webhook Security

All 4 payment gateways have signature verification:
- Flutterwave: HMAC-SHA256 on `verif-hash` header
- OPay: HMAC-SHA512 on `Authorization` header
- Airwallex: HMAC-SHA256 on timestamp + body
- ChainRails: HMAC-SHA256 on `timestamp.body`

### Blocking & Banning

- `is_blocked` flag prevents blocked users from creating or accepting transactions
- `binding_bans` table: permanent ban preventing a platform ID from ever linking to a profile again (user-activated)
- Both buyer and seller are checked for `is_blocked` before any transaction is created

### Data Protection

- Account deactivation anonymizes all PII: email → `deleted_XXXXXXXX@safeeely.com`, name → "Deleted"
- All linked accounts and payout methods removed on deactivation
- Transaction history preserved for audit trail (financial compliance)
- Supabase Row-Level Security (RLS) policies on all tables

### KYC & AML

- Identity verification required before high-value withdrawals
- Document storage in private Supabase Storage bucket (`kyc-documents`)
- Admin review required for verification approval
- Thresholds enforced at API level — not just frontend

### Frontend Security

- Magic link tokens are single-use and expire after 30 minutes
- Tokens stripped from URL immediately after exchange (no browser history leakage)
- HTTP-only session cookies (not accessible to JavaScript)
- API interceptors handle 401 (auto-refresh) and 403 step-up challenges

---

## 28. Glossary

| Term | Definition |
|---|---|
| **Safetag** | A unique @handle (e.g., `@johndoe`) that identifies a user across all Safeeely platforms |
| **Escrow** | A secure holding arrangement where funds are held by Safeeely until both parties fulfil their obligations |
| **ONE_TIME** | A single-payment escrow transaction — one payment, one delivery, one confirmation |
| **MILESTONE** | A phased escrow transaction where payment is released incrementally per agreed phase |
| **Smart Transaction** | AI feature that converts a voice note or typed message into a full transaction draft |
| **Dispute** | A formal complaint raised when a party believes the other has not fulfilled their obligations |
| **AI Mediator** | Safeeely's Gemini-powered dispute resolution engine that classifies, investigates, and verdicts disputes |
| **Proof Upload** | Evidence files (screenshots, photos, documents) submitted by the seller to prove delivery |
| **Fee Allocation** | The agreement on who (buyer, seller, or both) pays the platform's 5% fee |
| **Platform Fee** | Safeeely's 5% charge on each transaction for providing the escrow service |
| **Four-Bucket Balance** | The four-way split of a user's funds: Available, Pending Escrow, In Withdrawal, Pending Refunds |
| **Trust Score** | A 0–100 reputation score computed from dispute outcomes and trading history |
| **KYC** | Know Your Customer — the identity verification process required for high-value withdrawals |
| **Referral Tier 1** | Users you directly invited to Safeeely |
| **Referral Tier 2** | Users invited by your Tier 1 referrals |
| **Community Group** | A Telegram group or Discord server that has integrated Safeeely trading with a licensed admin |
| **Magic Link** | A one-time, expiring URL sent by email that logs a user into the web app without a password |
| **Webhook** | An HTTP callback from a payment gateway notifying Safeeely of a completed payment |
| **HMAC** | Hash-based Message Authentication Code — used to verify that webhook payloads are genuine |
| **Payout Method** | A saved withdrawal destination: bank account, crypto address, or mobile money |
| **txn_code** | A human-readable transaction ID in the format `TXN-YYYYMMDD-XXXXXX` |

---

*Document generated from live codebase — reflects the full production implementation of Safeeely as of May 2026.*
