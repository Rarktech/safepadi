import { HeroStat } from "../LegalHero";
import { TocEntry } from "../LegalSidebarToc";
import { LegalSection } from "../LegalSection";
import { LegalCard, LegalCardGrid } from "../LegalCard";
import { LegalPill, LegalPillRow } from "../LegalPillRow";
import { LegalP, LegalH3, LegalUl, LegalOl, LegalLi, LegalCallout, LegalNotice } from "../LegalText";

export const termsHeroStats: HeroStat[] = [
    { value: "26", label: "Sections" },
    { value: "May 2026", label: "Effective Date" },
    { value: "Global", label: "Coverage" },
    { value: "5%", label: "Platform Fee", accent: true },
];

export const termsTocEntries: TocEntry[] = [
    { id: "s1", number: "1", label: "Agreement to Terms" },
    { id: "s2", number: "2", label: "What Safeeely Is" },
    { id: "s3", number: "3", label: "Eligibility" },
    { id: "s4", number: "4", label: "Account & Safetag" },
    { id: "s5", number: "5", label: "Supported Platforms" },
    { id: "s6", number: "6", label: "Escrow Service" },
    { id: "s7", number: "7", label: "Payment Processing" },
    { id: "s8", number: "8", label: "Platform Fees" },
    { id: "s9", number: "9", label: "KYC Verification" },
    { id: "s10", number: "10", label: "Withdrawals & Payouts" },
    { id: "s11", number: "11", label: "Dispute Resolution" },
    { id: "s12", number: "12", label: "AI-Powered Features" },
    { id: "s13", number: "13", label: "Marketplace" },
    { id: "s14", number: "14", label: "Community Groups" },
    { id: "s15", number: "15", label: "Referral Program" },
    { id: "s16", number: "16", label: "Trust Score" },
    { id: "s17", number: "17", label: "Prohibited Activities" },
    { id: "s18", number: "18", label: "Intellectual Property" },
    { id: "s19", number: "19", label: "Notifications" },
    { id: "s20", number: "20", label: "Account Suspension" },
    { id: "s21", number: "21", label: "Account Deactivation" },
    { id: "s22", number: "22", label: "Limitation of Liability" },
    { id: "s23", number: "23", label: "Indemnification" },
    { id: "s24", number: "24", label: "Governing Law" },
    { id: "s25", number: "25", label: "Changes to Terms" },
    { id: "s26", number: "26", label: "Contact Information" },
];

export function TermsSections() {
    return (
        <>
            <LegalSection id="s1" number="1" title="Agreement to Terms">
                <LegalP>
                    By accessing or using Safeeely — whether through our website, web application, or any of our messaging bots on Telegram, Discord, or WhatsApp — you agree to be legally bound by these Terms of Service (&ldquo;Terms&rdquo;) and all policies incorporated by reference, including our Privacy Policy.
                </LegalP>
                <LegalP>
                    If you do not agree with any part of these Terms, you must immediately stop using all Safeeely services. These Terms constitute a binding legal agreement between you (&ldquo;User&rdquo;, &ldquo;you&rdquo;) and Safeeely Technology (&ldquo;Safeeely&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
                </LegalP>
                <LegalP mb={0}>
                    By completing registration — whether via a bot command, a web form, or any other onboarding flow — you confirm that you have read, understood, and accepted these Terms in full.
                </LegalP>
            </LegalSection>

            <LegalSection id="s2" number="2" title="What Safeeely Is (and Is Not)" tone="highlight">
                <LegalP color="#065f46">
                    <strong>Safeeely is a technology platform, not a bank, financial institution, money transmitter, or payment processor.</strong> We build and operate escrow management software that coordinates transactions between buyers and sellers. We do not hold, custody, receive, or transmit funds on our own behalf at any point in a transaction.
                </LegalP>
                <LegalP color="#065f46">
                    All money movement is handled exclusively by licensed third-party payment gateways — currently Flutterwave, OPay, Airwallex, and ChainRails (for cryptocurrency). When you initiate a payment, your funds are transferred directly to and held by the applicable payment gateway under that gateway&apos;s own regulatory licences and terms. Safeeely receives an instruction from the gateway confirming that payment has been received, and then updates the transaction status accordingly.
                </LegalP>
                <LegalP color="#065f46" mb={0}>
                    <strong>Safeeely&apos;s role is to coordinate, record, enforce, and arbitrate</strong> — not to hold your money. You acknowledge and accept that in all financial matters, the third-party gateway&apos;s terms, limits, and jurisdiction apply to the movement of your funds.
                </LegalP>
            </LegalSection>

            <LegalSection id="s3" number="3" title="Eligibility">
                <LegalP>You must meet all of the following criteria to use Safeeely:</LegalP>
                <LegalUl>
                    <LegalLi>You are at least <strong>18 years of age</strong> or the age of legal majority in your jurisdiction, whichever is higher.</LegalLi>
                    <LegalLi>You have the legal capacity to enter into binding contracts in your jurisdiction.</LegalLi>
                    <LegalLi>You are not located in, or a national or resident of, any country subject to comprehensive sanctions (including but not limited to countries sanctioned by the UN, US OFAC, EU, or UK OFSI).</LegalLi>
                    <LegalLi>You are not on any government-maintained list of prohibited or restricted parties.</LegalLi>
                    <LegalLi>You are not using Safeeely on behalf of any sanctioned entity or for any prohibited purpose.</LegalLi>
                    <LegalLi mb={0}>Your use of Safeeely does not violate any applicable law or regulation in your jurisdiction.</LegalLi>
                </LegalUl>
                <LegalP mb={0}>Safeeely reserves the right to request proof of eligibility at any time and to suspend or terminate accounts where eligibility cannot be confirmed.</LegalP>
            </LegalSection>

            <LegalSection id="s4" number="4" title="Account Registration & Your Safetag">
                <LegalP mb={20}>
                    To use Safeeely, you must register and obtain a unique <strong>Safetag</strong> — your permanent identifier across the entire platform. Your Safetag is your escrow handle and is displayed publicly to counterparties in transactions.
                </LegalP>
                <LegalCardGrid columns={3}>
                    <LegalCard title="Format">3–20 characters, alphanumeric and underscores only. Case-insensitive — <code>@John</code> and <code>@john</code> are the same Safetag.</LegalCard>
                    <LegalCard title="Uniqueness">Each Safetag is globally unique. You may not create multiple Safeeely accounts or hold multiple Safetags.</LegalCard>
                    <LegalCard title="Your Responsibility">You are responsible for all activity under your Safetag. Keep your login credentials and linked platform accounts secure.</LegalCard>
                </LegalCardGrid>
                <LegalP>You agree to provide accurate, current, and complete registration information. You must update your information promptly if it changes. Providing false registration information is grounds for immediate account termination.</LegalP>
                <LegalP mb={0}>Safeeely reserves the right to reclaim or reassign Safetags that are found to be impersonating real individuals, brands, or organisations, or that violate these Terms.</LegalP>
            </LegalSection>

            <LegalSection id="s5" number="5" title="Supported Messaging Platforms">
                <LegalP mb={20}>
                    Safeeely currently operates bots on Telegram, Discord, and WhatsApp. When you use Safeeely through these platforms you are simultaneously subject to that platform&apos;s own terms of service, community guidelines, and privacy policy. Safeeely is not responsible for changes made by these platforms that affect bot functionality.
                </LegalP>
                <LegalCardGrid columns={3}>
                    <LegalCard title="Telegram">Full wizard-style escrow, smart transaction parsing, inline keyboard interactions, and image/video receipt delivery via Telegram Bot API.</LegalCard>
                    <LegalCard title="Discord">DM-based escrow, modal flows, button interactions, embed messages, and dispute management. Works in servers and direct messages.</LegalCard>
                    <LegalCard title="WhatsApp">WhatsApp Cloud API with Flow-based registration, interactive list menus, and smart transaction voice-note parsing.</LegalCard>
                </LegalCardGrid>
                <LegalNotice>More platforms are coming soon — support for Instagram, Apple Messages for Business, and additional channels is currently in development.</LegalNotice>
                <LegalP mb={0}>You may link multiple platform accounts (e.g., Telegram + Discord + WhatsApp) to a single Safetag. Account linking requires OTP verification. You remain responsible for security across all linked platforms.</LegalP>
            </LegalSection>

            <LegalSection id="s6" number="6" title="Escrow Service">
                <LegalP mb={20}>
                    Safeeely&apos;s core offering is an escrow coordination service. We facilitate transactions between a <strong>Buyer</strong> and a <strong>Seller</strong> by acting as a neutral intermediary that instructs the payment gateway to release or return funds based on transaction outcomes.
                </LegalP>
                <LegalH3>Transaction Types</LegalH3>
                <LegalCardGrid columns={2}>
                    <LegalCard title="One-Time Transaction">A single-payment escrow for a defined product or service. The full amount is held until the buyer confirms receipt or the transaction is finalized.</LegalCard>
                    <LegalCard title="Milestone Transaction">A multi-phase escrow where the total amount is broken into milestones. Each milestone has its own payment, completion proof, and buyer confirmation step.</LegalCard>
                </LegalCardGrid>
                <LegalH3 mb={14}>Transaction Lifecycle</LegalH3>
                <LegalOl>
                    <LegalLi mb={9}><strong>PENDING_SELLER_ACCEPTANCE</strong> — Buyer creates the transaction. Seller must accept within the agreed window, or the transaction is cancelled.</LegalLi>
                    <LegalLi mb={9}><strong>ACCEPTED</strong> — Seller has agreed to the terms. The buyer is now prompted to make payment via the chosen gateway.</LegalLi>
                    <LegalLi mb={9}><strong>PAID</strong> — The payment gateway has confirmed receipt of funds. The seller is notified and must now fulfil the order.</LegalLi>
                    <LegalLi mb={9}><strong>AWAITING_PROOF / COMPLETED_BY_SELLER</strong> — The seller has submitted proof of delivery (images, files, or text). The buyer reviews the evidence.</LegalLi>
                    <LegalLi mb={9}><strong>FINALIZED</strong> — The buyer has confirmed receipt. Funds are instructed for release to the seller. <strong>Disputes cannot be raised after finalization.</strong></LegalLi>
                    <LegalLi mb={9}><strong>DISPUTED</strong> — Either party has raised a dispute before finalization. See Section 11.</LegalLi>
                    <LegalLi mb={9}><strong>CANCELLED</strong> — The transaction was cancelled by mutual agreement or by Safeeely intervention before payment.</LegalLi>
                    <LegalLi mb={0}><strong>RESOLVED_SPLIT / REFUNDED / RETURN_PENDING</strong> — Dispute resolved with a split, full refund, or pending return of goods.</LegalLi>
                </LegalOl>
                <LegalP mb={0}>All transaction terms (product description, amount, currency, fee allocation, delivery deadline) are agreed by both parties at transaction creation. Disputes based on terms not originally specified in the transaction may be rejected at Safeeely&apos;s discretion.</LegalP>
            </LegalSection>

            <LegalSection id="s7" number="7" title="Payment Processing & Third-Party Gateways">
                <LegalP mb={20}>
                    All payment processing on Safeeely is performed by third-party payment gateways. By initiating a payment, you also agree to the terms of service of the applicable gateway. Safeeely does not store, process, or have access to your card numbers, bank account credentials, or private cryptographic keys at any time.
                </LegalP>
                <LegalCardGrid columns={2}>
                    <LegalCard title="Flutterwave">Processes NGN, USD, GHS, KES, ZAR, and other African currencies. Webhooks verified via HMAC-SHA512. Flutterwave&apos;s terms apply to all payments processed through their infrastructure.</LegalCard>
                    <LegalCard title="OPay">Processes NGN payments via OPay&apos;s merchant infrastructure. Webhooks verified via HMAC-SHA512. OPay&apos;s merchant agreement and user terms apply.</LegalCard>
                    <LegalCard title="Airwallex">Processes international multi-currency payments. Webhooks verified via HMAC-SHA256 with timestamp replay protection. Airwallex&apos;s global payment terms apply.</LegalCard>
                    <LegalCard title="ChainRails (Crypto)">Processes USDC on Base mainnet and other supported cryptocurrencies. The escrow wallet address is managed exclusively by ChainRails. Safeeely never has custody of or access to the private keys of any wallet.</LegalCard>
                </LegalCardGrid>
                <LegalP><strong>Amount Tolerance:</strong> Payment gateways may apply minor conversion variances. Safeeely applies a ±2% tolerance on incoming payment amounts before marking a transaction as paid. Amounts outside this tolerance will not trigger automatic confirmation and may require manual review.</LegalP>
                <LegalP mb={0}><strong>Gateway Failures:</strong> Safeeely is not liable for delays, failures, errors, or interruptions caused by any third-party payment gateway. If a payment gateway fails to process your transaction, you must resolve the issue directly with the gateway. Safeeely will make reasonable efforts to assist in reconciling failed payments on a best-effort basis.</LegalP>
            </LegalSection>

            <LegalSection id="s8" number="8" title="Platform Fees">
                <LegalP mb={20}>Safeeely charges a platform service fee on successfully finalized transactions. Fees are <strong>never charged on cancelled, disputed-refunded, or incomplete transactions</strong>.</LegalP>
                <LegalCardGrid columns={3}>
                    <LegalCard title="Default Rate">5% of the finalized transaction amount. This rate is configurable by Safeeely administrators and the current applicable rate is disclosed during transaction creation.</LegalCard>
                    <LegalCard title="Fee Allocation">The fee can be borne by the <strong>Buyer</strong> (added on top), the <strong>Seller</strong> (deducted from proceeds), or <strong>Split</strong> equally. The allocation is agreed at transaction creation and cannot be changed retroactively.</LegalCard>
                    <LegalCard title="Community Share">Transactions originating from a licensed Safeeely community group share a portion of the platform fee with the community admin under the applicable revenue-share agreement (see Section 14).</LegalCard>
                </LegalCardGrid>
                <LegalP mb={0}>Safeeely reserves the right to modify fee rates at any time with 14 days&apos; advance notice published on the platform. Continued use after the effective date of a fee change constitutes acceptance of the new rates.</LegalP>
            </LegalSection>

            <LegalSection id="s9" number="9" title="Identity Verification (KYC)">
                <LegalP mb={16}>To comply with applicable anti-money laundering (AML) and know-your-customer (KYC) regulations, Safeeely requires identity verification before users can withdraw funds above the following thresholds:</LegalP>
                <LegalPillRow>
                    <LegalPill>USD — $100</LegalPill>
                    <LegalPill>NGN — ₦100,000</LegalPill>
                    <LegalPill>EUR — €100</LegalPill>
                    <LegalPill>USDT — $100</LegalPill>
                    <LegalPill>BTC — 0.002 BTC</LegalPill>
                </LegalPillRow>
                <LegalP>KYC submission requires: full legal name, phone number, residential address (including city, state, and country), date of birth, document country, a government-issued National Identity Number (NIN) or equivalent, and clear front and back images of a valid government-issued identity document.</LegalP>
                <LegalP>KYC documents are stored in a secure Supabase storage bucket. They may be shared with licensed identity verification partners and, where legally required, with regulatory or law enforcement authorities. KYC data is governed by our Privacy Policy.</LegalP>
                <LegalP mb={0}>Safeeely reserves the right to request enhanced due diligence (EDD) for high-value transactions, unusual activity patterns, or where required by law. Failure to complete KYC when requested will result in withdrawal restrictions or account suspension.</LegalP>
            </LegalSection>

            <LegalSection id="s10" number="10" title="Withdrawals & Payouts">
                <LegalP mb={16}>Once a transaction is finalized, the seller&apos;s net proceeds (transaction amount minus applicable platform fee) are credited to their Safeeely balance. Sellers may request a withdrawal to a registered payout method at any time.</LegalP>
                <LegalUl>
                    <LegalLi>Withdrawal requests are assigned a unique reference code (format: <code>WD-XXXXXXXX</code>) for tracking.</LegalLi>
                    <LegalLi>Payout timelines depend on the gateway and local banking network. Safeeely targets processing within 1–3 business days but does not guarantee this timeline.</LegalLi>
                    <LegalLi>Withdrawals are subject to KYC verification at the thresholds specified in Section 9.</LegalLi>
                    <LegalLi>Payout method details (bank account or wallet address) are stored by Safeeely for processing purposes. We do not store full card numbers. Bank account details are handled under our Privacy Policy.</LegalLi>
                    <LegalLi>Safeeely is not liable for delays or failures caused by recipient banks, payment networks, or gateway processing backlogs.</LegalLi>
                    <LegalLi mb={0}>Withdrawals may be held for investigation if Safeeely detects potentially fraudulent activity. You will be notified of any such hold.</LegalLi>
                </LegalUl>
                <LegalP mb={0}>If a withdrawal fails due to incorrect payout details provided by the user, the funds will be returned to the Safeeely balance. Safeeely is not responsible for funds lost due to user-provided incorrect payout information.</LegalP>
            </LegalSection>

            <LegalSection id="s11" number="11" title="Dispute Resolution">
                <LegalP mb={20}>Safeeely provides an AI-assisted dispute resolution system for transactions that cannot be resolved between parties. Understanding this system and its rules is critical before using the platform.</LegalP>
                <LegalH3>Who Can Raise a Dispute</LegalH3>
                <LegalP mb={20}>Either the Buyer or the Seller may raise a dispute on any transaction that has reached <strong>PAID</strong> status but has not yet been <strong>FINALIZED</strong>. Once a transaction is finalized, the outcome is irreversible and no dispute can be raised.</LegalP>
                <LegalH3>The AI Dispute Pipeline</LegalH3>
                <LegalP mb={16}>Disputes are processed through a three-stage AI pipeline powered by Google Gemini:</LegalP>
                <LegalCardGrid columns={3}>
                    <LegalCard title="Stage 1 — Investigator">Gathers and analyses all submitted evidence, transaction history, trust scores, and fraud flags. Classifies the dispute tier (LITE, STANDARD, or CONSTITUTIONAL).</LegalCard>
                    <LegalCard title="Stage 2 — Judge">Issues a verdict: REFUND_BUYER, PAY_SELLER, SPLIT (with specified percentages), or REFUND_AFTER_RETURN. Applies platform precedents (SOPs) to ensure consistency.</LegalCard>
                    <LegalCard title="Stage 3 — Critic">Reviews the verdict for precedent alignment and policy consistency before it is delivered to the parties and submitted for admin review.</LegalCard>
                </LegalCardGrid>
                <LegalCallout tone="amber" title="Evidence Deadlines & Adverse Inference Rule">
                    <LegalP color="#78350f" mb={12}>When the dispute system requests evidence from a party, that party has a defined deadline (default: 2 hours) to submit. Reminders are sent at the 1-hour and 30-minute marks.</LegalP>
                    <LegalP color="#78350f" mb={0}><strong>If a party fails to submit evidence by the deadline without a valid reason, Safeeely will apply the principle of adverse inference — the dispute will be resolved against the non-responsive party.</strong> This rule exists to prevent bad-faith delay tactics and is strictly enforced.</LegalP>
                </LegalCallout>
                <LegalH3>Human Override & Finality</LegalH3>
                <LegalP>
                    All AI verdicts are subject to review by a Safeeely human administrator before final execution. Administrators may approve the AI verdict, modify it, or escalate complex cases to a specialist. The final verdict, once executed by an administrator, is <strong>binding and non-appealable</strong> except in cases of clear procedural error (which must be reported to <a href="mailto:legal@safeeely.io" style={{ color: "#059669", textDecoration: "none", fontWeight: 600 }}>legal@safeeely.io</a> within 48 hours of the verdict).
                </LegalP>
                <LegalP mb={0}>For <strong>REFUND_AFTER_RETURN</strong> verdicts, the buyer must return the goods to the seller within the stipulated return deadline. If the buyer fails to return goods by the deadline, the funds will be released to the seller. Safeeely does not manage or insure the physical return of goods and is not liable for loss or damage during return transit.</LegalP>
            </LegalSection>

            <LegalSection id="s12" number="12" title="AI-Powered Features">
                <LegalP mb={16}>Safeeely uses Google Gemini AI in two primary features:</LegalP>
                <LegalUl>
                    <LegalLi mb={10}><strong>Smart Transaction Parsing:</strong> You may describe a transaction in free text or via a voice note. Our AI will parse your description and extract the product name, amount, currency, and parties involved to pre-fill the transaction wizard. You remain responsible for reviewing and confirming all extracted fields before submitting.</LegalLi>
                    <LegalLi mb={0}><strong>Dispute Investigation & Adjudication:</strong> As described in Section 11, AI analyses evidence and issues verdicts. All AI dispute output is reviewed by a human administrator before execution.</LegalLi>
                </LegalUl>
                <LegalP>AI outputs are probabilistic and may contain errors. Safeeely is not liable for losses resulting from AI parsing errors in the Smart Transaction feature, provided that the user had an opportunity to review and confirm the parsed fields before submission. Users are expected to review all AI-generated content before acting on it.</LegalP>
                <LegalP mb={0}>Your messages and transaction content may be processed by Google&apos;s Gemini API. By using AI-powered features, you consent to this processing. Google&apos;s data handling is governed by Google&apos;s API Terms of Service and Privacy Policy, not solely by Safeeely&apos;s policies.</LegalP>
            </LegalSection>

            <LegalSection id="s13" number="13" title="Marketplace">
                <LegalP mb={16}>The Safeeely Marketplace allows registered users to post and browse listings for products, services, and job opportunities. All marketplace transactions conducted through Safeeely are subject to the escrow terms in Section 6.</LegalP>
                <LegalH3>Listing Categories</LegalH3>
                <LegalPillRow>
                    <LegalPill>Physical Products</LegalPill>
                    <LegalPill>Digital Products</LegalPill>
                    <LegalPill>Services (Freelance)</LegalPill>
                    <LegalPill>Jobs (Hiring)</LegalPill>
                    <LegalPill>Talent (Offering)</LegalPill>
                </LegalPillRow>
                <LegalH3>Prohibited Listings</LegalH3>
                <LegalP mb={12}>The following are strictly prohibited on the Safeeely Marketplace and will result in immediate removal and possible account termination:</LegalP>
                <LegalUl>
                    <LegalLi mb={6}>Illegal goods or services of any kind under applicable local or international law</LegalLi>
                    <LegalLi mb={6}>Adult content, pornography, or sexually explicit material</LegalLi>
                    <LegalLi mb={6}>Weapons, ammunition, explosives, or controlled substances</LegalLi>
                    <LegalLi mb={6}>Counterfeit or stolen goods</LegalLi>
                    <LegalLi mb={6}>Financial instruments, securities, or investment schemes</LegalLi>
                    <LegalLi mb={6}>Pyramid schemes, Ponzi schemes, or multi-level marketing disguised as products</LegalLi>
                    <LegalLi mb={6}>Personal data, login credentials, or private information of third parties</LegalLi>
                    <LegalLi mb={6}>Content that infringes any intellectual property right</LegalLi>
                    <LegalLi mb={0}>Listings designed to deceive buyers about the nature of the product or service</LegalLi>
                </LegalUl>
                <LegalP mb={0}>Safeeely may remove any listing, without prior notice, at its sole discretion. Safeeely does not guarantee the accuracy, legality, or quality of any marketplace listing and bears no liability for disputes arising from marketplace transactions initiated outside the Safeeely escrow system.</LegalP>
            </LegalSection>

            <LegalSection id="s14" number="14" title="Community Groups & Revenue Sharing">
                <LegalP mb={20}>Safeeely allows Telegram and Discord group admins to register their communities as licensed Safeeely escrow hubs. Registered communities receive a revenue share from platform fees earned on transactions conducted within the group.</LegalP>
                <LegalCardGrid columns={3}>
                    <LegalCard title="Free Tier">Basic community features. 10% revenue share from platform fees on group transactions. No license fee required.</LegalCard>
                    <LegalCard title="Pro Tier">Enhanced features and 25% revenue share. Priced at ₦15,000 (~$10 USD) per 30-day license period.</LegalCard>
                    <LegalCard title="Enterprise Tier">Full feature access and 40% revenue share. Priced at ₦35,000 (~$24 USD) per 30-day license period.</LegalCard>
                </LegalCardGrid>
                <LegalUl mb={0}>
                    <LegalLi>Community license fees are <strong>non-refundable</strong> once processed.</LegalLi>
                    <LegalLi>Licenses expire at the end of the purchased period and must be manually renewed. Expired licenses revert to the Free tier.</LegalLi>
                    <LegalLi>Revenue share is calculated based on fees from finalized transactions within the community group during the license period.</LegalLi>
                    <LegalLi>Safeeely may revoke a community license without refund if the community group is found to be facilitating prohibited activities or violating these Terms.</LegalLi>
                    <LegalLi>Community admins are responsible for moderating their groups and ensuring members comply with these Terms.</LegalLi>
                    <LegalLi mb={0}>License prices and revenue-share percentages are subject to change with 14 days&apos; advance notice.</LegalLi>
                </LegalUl>
            </LegalSection>

            <LegalSection id="s15" number="15" title="Referral Program">
                <LegalP mb={20}>Safeeely operates a two-tier referral affiliate program. When you refer a new user to Safeeely using your unique referral code, you earn commissions from platform fees generated by that user&apos;s transactions.</LegalP>
                <LegalCardGrid columns={2}>
                    <LegalCard title="Tier 1 — Direct Referral">You earn <strong>10%</strong> of the platform fee on every finalized transaction made by a user you directly referred.</LegalCard>
                    <LegalCard title="Tier 2 — Indirect Referral">You earn <strong>5%</strong> of the platform fee on transactions made by users referred by your direct referrals.</LegalCard>
                </LegalCardGrid>
                <LegalUl mb={0}>
                    <LegalLi>Commissions are earned only when the referred user&apos;s transaction reaches <strong>FINALIZED</strong> status. Cancelled, disputed-refunded, or incomplete transactions do not generate commissions.</LegalLi>
                    <LegalLi><strong>Self-referral is strictly prohibited.</strong> Attempts to refer yourself using alternate accounts, proxy accounts, or any other mechanism will result in commission forfeiture and account suspension.</LegalLi>
                    <LegalLi>Referral commissions are credited to your Safeeely balance and are withdrawable subject to standard KYC requirements.</LegalLi>
                    <LegalLi>Safeeely reserves the right to modify commission rates, tier structures, or terminate the referral program with 30 days&apos; advance notice.</LegalLi>
                    <LegalLi>Referral commissions earned before any rate change will be honoured at the rates in effect at the time of the finalized transaction.</LegalLi>
                    <LegalLi mb={0}>Safeeely may withhold or claw back commissions if the underlying transaction is later found to be fraudulent or reversed.</LegalLi>
                </LegalUl>
            </LegalSection>

            <LegalSection id="s16" number="16" title="Trust Score & Reputation System">
                <LegalP>Every Safeeely account carries a publicly visible <strong>Trust Score</strong> (0–100, starting at 50). This score reflects the account&apos;s transaction history, dispute outcomes, and behavioural signals.</LegalP>
                <LegalP>Factors that affect your Trust Score include: number of successful finalized transactions (positive), disputes raised against you and lost (negative), disputes you raised that were frivolous (negative), ghosted transactions (negative), fraud flags raised by the system or administrators (significant negative), and verified KYC status (positive).</LegalP>
                <LegalP>Trust Scores are informational signals to help counterparties make informed decisions. <strong>Safeeely is not liable for any commercial decision, loss, or harm resulting from reliance on a Trust Score.</strong> Trust Scores are algorithmic calculations and may not reflect the full picture of a user&apos;s trustworthiness.</LegalP>
                <LegalP mb={0}>Users may not attempt to artificially inflate their Trust Score through fake transactions, mutual positive reviews, or any other manipulative practice. Such behaviour constitutes a prohibited activity under Section 17.</LegalP>
            </LegalSection>

            <LegalSection id="s17" number="17" title="Prohibited Activities" tone="danger">
                <LegalP color="#881337" mb={16}>The following activities are strictly prohibited on Safeeely and may result in immediate account termination, fund seizure, and referral to law enforcement:</LegalP>
                <LegalUl color="#881337" mb={0}>
                    <LegalLi mb={7}>Fraud, misrepresentation, or deliberate deception of any counterparty or of Safeeely</LegalLi>
                    <LegalLi mb={7}>Money laundering, terrorist financing, or use of Safeeely for any purpose prohibited by applicable local or international law</LegalLi>
                    <LegalLi mb={7}>Chargeback abuse — initiating chargebacks with your bank or card issuer while a dispute is pending on Safeeely, or after funds have been legitimately released</LegalLi>
                    <LegalLi mb={7}>Creating transactions for goods or services that do not exist or that you have no intention of delivering</LegalLi>
                    <LegalLi mb={7}>Impersonating another individual, business, or Safeeely representative</LegalLi>
                    <LegalLi mb={7}>Manipulating or attempting to manipulate the Trust Score system through fake activity</LegalLi>
                    <LegalLi mb={7}>Circumventing the KYC process using false or stolen identity documents</LegalLi>
                    <LegalLi mb={7}>Using Safeeely to trade prohibited goods or services as listed in Section 13</LegalLi>
                    <LegalLi mb={7}>Creating multiple accounts after a ban or suspension to evade enforcement</LegalLi>
                    <LegalLi mb={7}>Harassing, threatening, or extorting counterparties within any Safeeely communication channel</LegalLi>
                    <LegalLi mb={7}>Exploiting bugs or vulnerabilities in the Safeeely platform — report these responsibly to <a href="mailto:security@safeeely.io" style={{ color: "#881337", textDecoration: "underline" }}>security@safeeely.io</a></LegalLi>
                    <LegalLi mb={7}>Automated scraping, crawling, or data extraction from Safeeely without written permission</LegalLi>
                    <LegalLi mb={0}>Reverse engineering, decompiling, or attempting to extract the source code of any Safeeely component</LegalLi>
                </LegalUl>
            </LegalSection>

            <LegalSection id="s18" number="18" title="Intellectual Property">
                <LegalP>All intellectual property in the Safeeely platform — including but not limited to the software, algorithms, AI models, dispute pipeline logic, brand name, logo, trademarks, web application, bot flows, and all associated documentation — is owned exclusively by Safeeely Technology and is protected by applicable copyright, trademark, and intellectual property laws.</LegalP>
                <LegalP>You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Safeeely platform for its intended purpose. This licence does not include the right to copy, modify, distribute, sell, or sublicence any part of the platform.</LegalP>
                <LegalP mb={0}>By using Safeeely, you grant Safeeely a worldwide, royalty-free licence to display, store, process, and use your Safetag, public profile information, transaction history, reviews, and marketplace listings as necessary to provide and improve the service. You retain ownership of any original content you create, but you agree that Safeeely may use anonymised and aggregated data derived from your usage to improve the platform, train AI models, and produce analytics.</LegalP>
            </LegalSection>

            <LegalSection id="s19" number="19" title="Notifications & Communications">
                <LegalP>By registering on Safeeely, you consent to receiving transactional and operational notifications through the messaging platforms you have linked to your account (Telegram, Discord, or WhatsApp) and via email.</LegalP>
                <LegalP><strong>Notification types you will receive include:</strong> transaction status updates, payment confirmations, dispute raised/resolved alerts, KYC submission and decision notices, withdrawal initiated/completed notifications, referral commission alerts, community license renewal reminders, and security alerts (e.g., new platform account linked).</LegalP>
                <LegalP>Emails are sent from <strong>info@safeeely.com</strong> via our email service provider (Resend). You may receive PDF invoices and payment receipts as email attachments. Safeeely will not send unsolicited marketing emails without your separate opt-in consent.</LegalP>
                <LegalP mb={0}>Transactional notifications (those required to operate your escrow) cannot be fully opted out of while your account is active, as they are essential to the service. You may deactivate your account (Section 21) to stop all notifications.</LegalP>
            </LegalSection>

            <LegalSection id="s20" number="20" title="Account Suspension & Termination by Safeeely">
                <LegalP mb={16}>Safeeely may suspend or permanently terminate your account at any time, with or without advance notice, for any of the following reasons:</LegalP>
                <LegalUl>
                    <LegalLi mb={7}>Violation of any provision of these Terms</LegalLi>
                    <LegalLi mb={7}>Engaging in any activity listed as prohibited in Section 17</LegalLi>
                    <LegalLi mb={7}>Providing false registration or KYC information</LegalLi>
                    <LegalLi mb={7}>Initiating fraudulent transactions or chargebacks</LegalLi>
                    <LegalLi mb={7}>Repeated or severe dispute losses indicating bad-faith trading behaviour</LegalLi>
                    <LegalLi mb={7}>Court order, regulatory direction, or legal obligation requiring suspension</LegalLi>
                    <LegalLi mb={0}>Extended account inactivity at Safeeely&apos;s discretion</LegalLi>
                </LegalUl>
                <LegalP>Upon termination, your access to the Safeeely platform will be revoked. Any pending transactions at the time of termination will be handled at Safeeely&apos;s discretion, with priority given to protecting innocent counterparties. Funds legitimately owed to you will be returned after a review period, provided no fraud or chargeback is pending.</LegalP>
                <LegalP mb={0}>To appeal a suspension, email <strong>support@safeeely.io</strong> within 14 days of the suspension notice. Safeeely will review appeals in good faith but reserves sole discretion over reinstatement decisions.</LegalP>
            </LegalSection>

            <LegalSection id="s21" number="21" title="User-Initiated Account Deactivation">
                <LegalP>You may deactivate your own Safeeely account at any time by issuing the <code>/delete_account</code> command in any Safeeely bot, or by submitting a written request to <strong>privacy@safeeely.io</strong>.</LegalP>
                <LegalP>Upon deactivation, the following happens to your data:</LegalP>
                <LegalUl>
                    <LegalLi mb={7}>Your display name is changed to &ldquo;Deleted User&rdquo;</LegalLi>
                    <LegalLi mb={7}>Your email is anonymised to a non-identifiable placeholder</LegalLi>
                    <LegalLi mb={7}>All linked platform accounts (Telegram ID, Discord ID, etc.) are unlinked and removed</LegalLi>
                    <LegalLi mb={7}>All saved payout methods are removed</LegalLi>
                    <LegalLi mb={7}>Your Safetag is released and may be reclaimed by another user after a quarantine period</LegalLi>
                    <LegalLi mb={0}>Transaction and financial records are <strong>retained for regulatory and audit purposes</strong> in an anonymised form, as required by applicable law</LegalLi>
                </LegalUl>
                <LegalP mb={0}>Account deactivation is irreversible. Pending transactions or open disputes must be resolved before deactivation can be completed. Safeeely will notify you if deactivation is blocked pending resolution of active obligations.</LegalP>
            </LegalSection>

            <LegalSection id="s22" number="22" title="Limitation of Liability">
                <LegalP mb={16}>To the maximum extent permitted by applicable law, Safeeely Technology, its directors, officers, employees, agents, partners, and service providers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of Safeeely, including but not limited to:</LegalP>
                <LegalUl>
                    <LegalLi mb={7}>Failures, delays, or errors by any third-party payment gateway (Flutterwave, OPay, Airwallex, ChainRails, or any future gateway)</LegalLi>
                    <LegalLi mb={7}>Loss of funds due to a counterparty&apos;s fraudulent or negligent conduct</LegalLi>
                    <LegalLi mb={7}>Platform downtime, outages, or data loss</LegalLi>
                    <LegalLi mb={7}>AI-generated content errors (Smart Transaction parsing or dispute AI) where the user had an opportunity to review the output before acting</LegalLi>
                    <LegalLi mb={7}>Decisions made by third parties (including counterparties, marketplace users, or community admins) based on your Trust Score</LegalLi>
                    <LegalLi mb={7}>Loss of business, revenue, profits, or data arising from use or inability to use the platform</LegalLi>
                    <LegalLi mb={7}>Unauthorised access to your account resulting from your own negligence in protecting credentials</LegalLi>
                    <LegalLi mb={0}>Actions taken by third-party messaging platforms (Telegram, Discord, Meta, Apple) that affect bot functionality</LegalLi>
                </LegalUl>
                <LegalP mb={0}>In all cases where Safeeely is found liable, our aggregate liability to you for any and all claims shall not exceed the total platform fees you paid to Safeeely in the <strong>three (3) calendar months immediately preceding</strong> the claim. This limitation applies even if Safeeely has been advised of the possibility of such damages.</LegalP>
            </LegalSection>

            <LegalSection id="s23" number="23" title="Indemnification">
                <LegalP mb={0}>
                    You agree to defend, indemnify, and hold harmless Safeeely Technology, its directors, officers, employees, agents, and licensors from and against any claims, liabilities, damages, judgments, awards, losses, costs, and expenses (including reasonable legal fees) arising out of or relating to: (a) your violation of these Terms; (b) your use of the Safeeely platform; (c) your interactions with any counterparty in a transaction; (d) any content you submit, post, or transmit through Safeeely; (e) your violation of any applicable law or the rights of any third party; or (f) any fraudulent, negligent, or wilfully harmful conduct by you.
                </LegalP>
            </LegalSection>

            <LegalSection id="s24" number="24" title="Governing Law & Jurisdiction">
                <LegalP>These Terms are governed by and construed in accordance with the laws of the jurisdiction in which Safeeely Technology is incorporated, without regard to conflict-of-law principles. Applicable local consumer protection, data protection, and financial regulations apply to the extent relevant in your jurisdiction.</LegalP>
                <LegalP>Any dispute arising out of or relating to these Terms or your use of Safeeely shall first be pursued through good-faith negotiation. Where formal proceedings are necessary, the parties agree to submit to the jurisdiction of Safeeely&apos;s registered operating courts. Users accessing Safeeely from other jurisdictions acknowledge this arrangement and waive any objection on grounds of venue or inconvenient forum, to the extent permitted by local law.</LegalP>
                <LegalP mb={0}>Safeeely encourages users to resolve disputes informally by contacting <strong>support@safeeely.io</strong> first. Before initiating any formal legal proceeding, both parties agree to engage in good-faith negotiation for at least 30 days. Nothing in this section limits any mandatory rights you may have under the consumer protection laws of your own jurisdiction.</LegalP>
            </LegalSection>

            <LegalSection id="s25" number="25" title="Changes to These Terms">
                <LegalP mb={16}>Safeeely reserves the right to update or modify these Terms at any time. For material changes — those that affect your rights, obligations, fee structure, or dispute resolution process — we will provide at least <strong>14 days&apos; advance notice</strong> by:</LegalP>
                <LegalUl>
                    <LegalLi mb={7}>Publishing the updated Terms on this page with a new effective date</LegalLi>
                    <LegalLi mb={7}>Sending a notification via all active messaging platforms linked to your account</LegalLi>
                    <LegalLi mb={0}>Sending an email to the address registered with your Safetag</LegalLi>
                </LegalUl>
                <LegalP mb={0}>Your continued use of Safeeely after the effective date of any updated Terms constitutes your acceptance of those changes. If you do not agree with the revised Terms, you must stop using Safeeely before the effective date and may deactivate your account under Section 21.</LegalP>
            </LegalSection>

            <LegalSection id="s26" number="26" title="Contact Information">
                <LegalP mb={20}>If you have questions, concerns, or reports related to these Terms, please contact us through the appropriate channel:</LegalP>
                <LegalCardGrid columns={3}>
                    <LegalCard title="General & Support">
                        <a href="mailto:support@safeeely.io" style={{ color: "#64748b", textDecoration: "none" }}>support@safeeely.io</a>
                        <br />
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>Account issues, transaction queries, withdrawal help</span>
                    </LegalCard>
                    <LegalCard title="Legal & Compliance">
                        <a href="mailto:legal@safeeely.io" style={{ color: "#64748b", textDecoration: "none" }}>legal@safeeely.io</a>
                        <br />
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>Terms disputes, IP notices, regulatory enquiries</span>
                    </LegalCard>
                    <LegalCard title="Privacy & Data">
                        <a href="mailto:privacy@safeeely.io" style={{ color: "#64748b", textDecoration: "none" }}>privacy@safeeely.io</a>
                        <br />
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>Data deletion requests, NDPA rights, KYC queries</span>
                    </LegalCard>
                </LegalCardGrid>
                <LegalP mb={0}>For security vulnerability disclosures, contact <strong>security@safeeely.io</strong>. We operate a responsible disclosure programme and ask that you do not publicly disclose vulnerabilities before we have had an opportunity to address them.</LegalP>
            </LegalSection>
        </>
    );
}
