import { Navbar } from "@/components/Navbar";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 pt-56 pb-20">
                <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-6 bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                    Terms of Service
                </h1>
                <p className="text-slate-500 mb-10 border-b border-slate-200 pb-4 italic">
                    Effective Date: May 18, 2026 &mdash; Last Updated: May 18, 2026
                </p>

                <section className="space-y-10">

                    {/* 1. Agreement to Terms */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            By accessing or using Safeeely — whether through our website, web application, or any of our messaging bots on Telegram, Discord, WhatsApp, Instagram, or Apple Messages for Business — you agree to be legally bound by these Terms of Service (&ldquo;Terms&rdquo;) and all policies incorporated by reference, including our Privacy Policy.
                        </p>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            If you do not agree with any part of these Terms, you must immediately stop using all Safeeely services. These Terms constitute a binding legal agreement between you (&ldquo;User&rdquo;, &ldquo;you&rdquo;) and Safeeely Technology (&ldquo;Safeeely&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
                        </p>
                        <p className="leading-relaxed text-slate-700">
                            By completing registration — whether via a bot command, a web form, or any other onboarding flow — you confirm that you have read, understood, and accepted these Terms in full.
                        </p>
                    </div>

                    {/* 2. What Safeeely Is (and Is Not) */}
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <h2 className="text-2xl font-bold text-emerald-900 mb-4">2. What Safeeely Is (and Is Not)</h2>
                        <p className="text-emerald-800 mb-4 leading-relaxed">
                            <strong>Safeeely is a technology platform, not a bank, financial institution, money transmitter, or payment processor.</strong> We build and operate escrow management software that coordinates transactions between buyers and sellers. We do not hold, custody, receive, or transmit funds on our own behalf at any point in a transaction.
                        </p>
                        <p className="text-emerald-800 mb-4 leading-relaxed">
                            All money movement is handled exclusively by licensed third-party payment gateways — currently Flutterwave, OPay, Airwallex, and ChainRails (for cryptocurrency). When you initiate a payment, your funds are transferred directly to and held by the applicable payment gateway under that gateway&apos;s own regulatory licences and terms. Safeeely receives an instruction from the gateway confirming that payment has been received, and then updates the transaction status accordingly.
                        </p>
                        <p className="text-emerald-800 leading-relaxed">
                            <strong>Safeeely&apos;s role is to coordinate, record, enforce, and arbitrate</strong> — not to hold your money. You acknowledge and accept that in all financial matters, the third-party gateway&apos;s terms, limits, and jurisdiction apply to the movement of your funds.
                        </p>
                    </div>

                    {/* 3. Eligibility */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">3. Eligibility</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            You must meet all of the following criteria to use Safeeely:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700">
                            <li>You are at least <strong>18 years of age</strong> or the age of legal majority in your jurisdiction, whichever is higher.</li>
                            <li>You have the legal capacity to enter into binding contracts in your jurisdiction.</li>
                            <li>You are not located in, or a national or resident of, any country subject to comprehensive sanctions (including but not limited to countries sanctioned by the UN, US OFAC, EU, or UK OFSI).</li>
                            <li>You are not on any government-maintained list of prohibited or restricted parties.</li>
                            <li>You are not using Safeeely on behalf of any sanctioned entity or for any prohibited purpose.</li>
                            <li>Your use of Safeeely does not violate any applicable law or regulation in your jurisdiction.</li>
                        </ul>
                        <p className="leading-relaxed text-slate-700 mt-3">
                            Safeeely reserves the right to request proof of eligibility at any time and to suspend or terminate accounts where eligibility cannot be confirmed.
                        </p>
                    </div>

                    {/* 4. Account Registration & Safetag */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">4. Account Registration &amp; Your Safetag</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            To use Safeeely, you must register and obtain a unique <strong>Safetag</strong> — your permanent identifier across the entire platform. Your Safetag is your escrow handle and is displayed publicly to counterparties in transactions.
                        </p>
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Format</h3>
                                <p className="text-sm text-slate-600">3–20 characters, alphanumeric and underscores only. Case-insensitive — <code>@John</code> and <code>@john</code> are the same Safetag.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Uniqueness</h3>
                                <p className="text-sm text-slate-600">Each Safetag is globally unique. You may not create multiple Safeeely accounts or hold multiple Safetags.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Your Responsibility</h3>
                                <p className="text-sm text-slate-600">You are responsible for all activity under your Safetag. Keep your login credentials and linked platform accounts secure.</p>
                            </div>
                        </div>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            You agree to provide accurate, current, and complete registration information. You must update your information promptly if it changes. Providing false registration information is grounds for immediate account termination.
                        </p>
                        <p className="leading-relaxed text-slate-700">
                            Safeeely reserves the right to reclaim or reassign Safetags that are found to be impersonating real individuals, brands, or organisations, or that violate these Terms.
                        </p>
                    </div>

                    {/* 5. Supported Platforms */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">5. Supported Messaging Platforms</h2>
                        <p className="leading-relaxed text-slate-700 mb-4">
                            Safeeely operates bots on the following platforms. When you use Safeeely through these platforms, you are simultaneously subject to that platform&apos;s own terms of service, community guidelines, and privacy policy. Safeeely is not responsible for changes made by these platforms that affect bot functionality.
                        </p>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Telegram</h3>
                                <p className="text-sm text-slate-600">Full wizard-style escrow, smart transaction parsing, inline keyboard interactions, and image/video receipt delivery via Telegram Bot API.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Discord</h3>
                                <p className="text-sm text-slate-600">DM-based escrow, modal flows, button interactions, embed messages, and dispute management. Works in servers and direct messages.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">WhatsApp</h3>
                                <p className="text-sm text-slate-600">WhatsApp Cloud API with Flow-based registration, interactive list menus, and smart transaction voice-note parsing.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Instagram</h3>
                                <p className="text-sm text-slate-600">Messenger API with quick-reply registration flow, postback handlers, and generic template messages for transaction updates.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Apple Messages</h3>
                                <p className="text-sm text-slate-600">Apple Messages for Business via JivoChat integration. Full 8-step registration wizard and transaction management.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Web App</h3>
                                <p className="text-sm text-slate-600">Dashboard at safeeely.io for transaction management, KYC submission, marketplace listings, and referral tracking.</p>
                            </div>
                        </div>
                        <p className="leading-relaxed text-slate-700 mt-4">
                            You may link multiple platform accounts (e.g., Telegram + Discord + WhatsApp) to a single Safetag. Account linking requires OTP verification. You remain responsible for security across all linked platforms.
                        </p>
                    </div>

                    {/* 6. Escrow Service */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">6. Escrow Service</h2>
                        <p className="leading-relaxed text-slate-700 mb-4">
                            Safeeely&apos;s core offering is an escrow coordination service. We facilitate transactions between a <strong>Buyer</strong> and a <strong>Seller</strong> by acting as a neutral intermediary that instructs the payment gateway to release or return funds based on transaction outcomes.
                        </p>

                        <h3 className="text-lg font-semibold mb-3 text-slate-800">Transaction Types</h3>
                        <div className="grid md:grid-cols-2 gap-4 mb-5">
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">One-Time Transaction</h3>
                                <p className="text-sm text-slate-600">A single-payment escrow for a defined product or service. The full amount is held until the buyer confirms receipt or the transaction is finalized.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Milestone Transaction</h3>
                                <p className="text-sm text-slate-600">A multi-phase escrow where the total amount is broken into milestones. Each milestone has its own payment, completion proof, and buyer confirmation step.</p>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold mb-3 text-slate-800">Transaction Lifecycle</h3>
                        <ol className="list-decimal pl-6 space-y-2 text-slate-700 mb-4">
                            <li><strong>PENDING_SELLER_ACCEPTANCE</strong> — Buyer creates the transaction. Seller must accept within the agreed window, or the transaction is cancelled.</li>
                            <li><strong>ACCEPTED</strong> — Seller has agreed to the terms. The buyer is now prompted to make payment via the chosen gateway.</li>
                            <li><strong>PAID</strong> — The payment gateway has confirmed receipt of funds. The seller is notified and must now fulfil the order.</li>
                            <li><strong>AWAITING_PROOF / COMPLETED_BY_SELLER</strong> — The seller has submitted proof of delivery (images, files, or text). The buyer reviews the evidence.</li>
                            <li><strong>FINALIZED</strong> — The buyer has confirmed receipt. Funds are instructed for release to the seller. <strong>Disputes cannot be raised after finalization.</strong></li>
                            <li><strong>DISPUTED</strong> — Either party has raised a dispute before finalization. See Section 11.</li>
                            <li><strong>CANCELLED</strong> — The transaction was cancelled by mutual agreement or by Safeeely intervention before payment.</li>
                            <li><strong>RESOLVED_SPLIT / REFUNDED / RETURN_PENDING</strong> — Dispute resolved with a split, full refund, or pending return of goods.</li>
                        </ol>
                        <p className="leading-relaxed text-slate-700">
                            All transaction terms (product description, amount, currency, fee allocation, delivery deadline) are agreed by both parties at transaction creation. Disputes based on terms not originally specified in the transaction may be rejected at Safeeely&apos;s discretion.
                        </p>
                    </div>

                    {/* 7. Payment Processing & Third-Party Gateways */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">7. Payment Processing &amp; Third-Party Gateways</h2>
                        <p className="leading-relaxed text-slate-700 mb-4">
                            All payment processing on Safeeely is performed by third-party payment gateways. By initiating a payment, you also agree to the terms of service of the applicable gateway. Safeeely does not store, process, or have access to your card numbers, bank account credentials, or private cryptographic keys at any time.
                        </p>
                        <div className="grid md:grid-cols-2 gap-4 mb-5">
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Flutterwave</h3>
                                <p className="text-sm text-slate-600">Processes NGN, USD, GHS, KES, ZAR, and other African currencies. Webhooks verified via HMAC-SHA512. Flutterwave&apos;s terms apply to all payments processed through their infrastructure.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">OPay</h3>
                                <p className="text-sm text-slate-600">Processes NGN payments via OPay&apos;s merchant infrastructure. Webhooks verified via HMAC-SHA512. OPay&apos;s merchant agreement and user terms apply.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Airwallex</h3>
                                <p className="text-sm text-slate-600">Processes international multi-currency payments. Webhooks verified via HMAC-SHA256 with timestamp replay protection. Airwallex&apos;s global payment terms apply.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">ChainRails (Crypto)</h3>
                                <p className="text-sm text-slate-600">Processes USDC on Base mainnet and other supported cryptocurrencies. The escrow wallet address is managed exclusively by ChainRails. Safeeely never has custody of or access to the private keys of any wallet.</p>
                            </div>
                        </div>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            <strong>Amount Tolerance:</strong> Payment gateways may apply minor conversion variances. Safeeely applies a ±2% tolerance on incoming payment amounts before marking a transaction as paid. Amounts outside this tolerance will not trigger automatic confirmation and may require manual review.
                        </p>
                        <p className="leading-relaxed text-slate-700">
                            <strong>Gateway Failures:</strong> Safeeely is not liable for delays, failures, errors, or interruptions caused by any third-party payment gateway. If a payment gateway fails to process your transaction, you must resolve the issue directly with the gateway. Safeeely will make reasonable efforts to assist in reconciling failed payments on a best-effort basis.
                        </p>
                    </div>

                    {/* 8. Platform Fees */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">8. Platform Fees</h2>
                        <p className="leading-relaxed text-slate-700 mb-4">
                            Safeeely charges a platform service fee on successfully finalized transactions. Fees are <strong>never charged on cancelled, disputed-refunded, or incomplete transactions</strong>.
                        </p>
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Default Rate</h3>
                                <p className="text-sm text-slate-600">5% of the finalized transaction amount. This rate is configurable by Safeeely administrators and the current applicable rate is disclosed during transaction creation.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Fee Allocation</h3>
                                <p className="text-sm text-slate-600">The fee can be borne by the <strong>Buyer</strong> (added on top), the <strong>Seller</strong> (deducted from proceeds), or <strong>Split</strong> equally. The allocation is agreed at transaction creation and cannot be changed retroactively.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Community Share</h3>
                                <p className="text-sm text-slate-600">Transactions originating from a licensed Safeeely community group share a portion of the platform fee with the community admin under the applicable revenue-share agreement (see Section 14).</p>
                            </div>
                        </div>
                        <p className="leading-relaxed text-slate-700">
                            Safeeely reserves the right to modify fee rates at any time with 14 days&apos; advance notice published on the platform. Continued use after the effective date of a fee change constitutes acceptance of the new rates.
                        </p>
                    </div>

                    {/* 9. KYC */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">9. Identity Verification (KYC)</h2>
                        <p className="leading-relaxed text-slate-700 mb-4">
                            To comply with applicable anti-money laundering (AML) and know-your-customer (KYC) regulations, Safeeely requires identity verification before users can withdraw funds above the following thresholds:
                        </p>
                        <div className="flex flex-wrap gap-3 mb-4">
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">USD — $100</div>
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">NGN — ₦100,000</div>
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">EUR — €100</div>
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">USDT — $100</div>
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">BTC — 0.002 BTC</div>
                        </div>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            KYC submission requires: full legal name, phone number, residential address (including city, state, and country), date of birth, document country, a government-issued National Identity Number (NIN) or equivalent, and clear front and back images of a valid government-issued identity document.
                        </p>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            KYC documents are stored in a secure Supabase storage bucket. They may be shared with licensed identity verification partners and, where legally required, with regulatory or law enforcement authorities. KYC data is governed by our Privacy Policy.
                        </p>
                        <p className="leading-relaxed text-slate-700">
                            Safeeely reserves the right to request enhanced due diligence (EDD) for high-value transactions, unusual activity patterns, or where required by law. Failure to complete KYC when requested will result in withdrawal restrictions or account suspension.
                        </p>
                    </div>

                    {/* 10. Withdrawals & Payouts */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">10. Withdrawals &amp; Payouts</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            Once a transaction is finalized, the seller&apos;s net proceeds (transaction amount minus applicable platform fee) are credited to their Safeeely balance. Sellers may request a withdrawal to a registered payout method at any time.
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-3">
                            <li>Withdrawal requests are assigned a unique reference code (format: <code>WD-XXXXXXXX</code>) for tracking.</li>
                            <li>Payout timelines depend on the gateway and local banking network. Safeeely targets processing within 1–3 business days but does not guarantee this timeline.</li>
                            <li>Withdrawals are subject to KYC verification at the thresholds specified in Section 9.</li>
                            <li>Payout method details (bank account or wallet address) are stored by Safeeely for processing purposes. We do not store full card numbers. Bank account details are handled under our Privacy Policy.</li>
                            <li>Safeeely is not liable for delays or failures caused by recipient banks, payment networks, or gateway processing backlogs.</li>
                            <li>Withdrawals may be held for investigation if Safeeely detects potentially fraudulent activity. You will be notified of any such hold.</li>
                        </ul>
                        <p className="leading-relaxed text-slate-700">
                            If a withdrawal fails due to incorrect payout details provided by the user, the funds will be returned to the Safeeely balance. Safeeely is not responsible for funds lost due to user-provided incorrect payout information.
                        </p>
                    </div>

                    {/* 11. Dispute Resolution */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">11. Dispute Resolution</h2>
                        <p className="leading-relaxed text-slate-700 mb-4">
                            Safeeely provides an AI-assisted dispute resolution system for transactions that cannot be resolved between parties. Understanding this system and its rules is critical before using the platform.
                        </p>

                        <h3 className="text-lg font-semibold mb-2 text-slate-800">Who Can Raise a Dispute</h3>
                        <p className="leading-relaxed text-slate-700 mb-4">
                            Either the Buyer or the Seller may raise a dispute on any transaction that has reached <strong>PAID</strong> status but has not yet been <strong>FINALIZED</strong>. Once a transaction is finalized, the outcome is irreversible and no dispute can be raised.
                        </p>

                        <h3 className="text-lg font-semibold mb-2 text-slate-800">The AI Dispute Pipeline</h3>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            Disputes are processed through a three-stage AI pipeline powered by Google Gemini:
                        </p>
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Stage 1 — Investigator</h3>
                                <p className="text-sm text-slate-600">Gathers and analyses all submitted evidence, transaction history, trust scores, and fraud flags. Classifies the dispute tier (LITE, STANDARD, or CONSTITUTIONAL).</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Stage 2 — Judge</h3>
                                <p className="text-sm text-slate-600">Issues a verdict: REFUND_BUYER, PAY_SELLER, SPLIT (with specified percentages), or REFUND_AFTER_RETURN. Applies platform precedents (SOPs) to ensure consistency.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Stage 3 — Critic</h3>
                                <p className="text-sm text-slate-600">Reviews the verdict for precedent alignment and policy consistency before it is delivered to the parties and submitted for admin review.</p>
                            </div>
                        </div>

                        <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 mb-4">
                            <h3 className="text-lg font-bold text-emerald-900 mb-3">Evidence Deadlines &amp; Adverse Inference Rule</h3>
                            <p className="text-emerald-800 mb-3 leading-relaxed">
                                When the dispute system requests evidence from a party, that party has a defined deadline (default: 2 hours) to submit. Reminders are sent at the 1-hour and 30-minute marks.
                            </p>
                            <p className="text-emerald-800 leading-relaxed font-semibold">
                                If a party fails to submit evidence by the deadline without a valid reason, Safeeely will apply the principle of adverse inference — the dispute will be resolved against the non-responsive party. This rule exists to prevent bad-faith delay tactics and is strictly enforced.
                            </p>
                        </div>

                        <h3 className="text-lg font-semibold mb-2 text-slate-800">Human Override &amp; Finality</h3>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            All AI verdicts are subject to review by a Safeeely human administrator before final execution. Administrators may approve the AI verdict, modify it, or escalate complex cases to a specialist. The final verdict, once executed by an administrator, is <strong>binding and non-appealable</strong> except in cases of clear procedural error (which must be reported to legal@safeeely.io within 48 hours of the verdict).
                        </p>
                        <p className="leading-relaxed text-slate-700">
                            For <strong>REFUND_AFTER_RETURN</strong> verdicts, the buyer must return the goods to the seller within the stipulated return deadline. If the buyer fails to return goods by the deadline, the funds will be released to the seller. Safeeely does not manage or insure the physical return of goods and is not liable for loss or damage during return transit.
                        </p>
                    </div>

                    {/* 12. AI-Powered Features */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">12. AI-Powered Features</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            Safeeely uses Google Gemini AI in two primary features:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-3">
                            <li>
                                <strong>Smart Transaction Parsing:</strong> You may describe a transaction in free text or via a voice note. Our AI will parse your description and extract the product name, amount, currency, and parties involved to pre-fill the transaction wizard. You remain responsible for reviewing and confirming all extracted fields before submitting.
                            </li>
                            <li>
                                <strong>Dispute Investigation &amp; Adjudication:</strong> As described in Section 11, AI analyses evidence and issues verdicts. All AI dispute output is reviewed by a human administrator before execution.
                            </li>
                        </ul>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            AI outputs are probabilistic and may contain errors. Safeeely is not liable for losses resulting from AI parsing errors in the Smart Transaction feature, provided that the user had an opportunity to review and confirm the parsed fields before submission. Users are expected to review all AI-generated content before acting on it.
                        </p>
                        <p className="leading-relaxed text-slate-700">
                            Your messages and transaction content may be processed by Google&apos;s Gemini API. By using AI-powered features, you consent to this processing. Google&apos;s data handling is governed by Google&apos;s API Terms of Service and Privacy Policy, not solely by Safeeely&apos;s policies.
                        </p>
                    </div>

                    {/* 13. Marketplace */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">13. Marketplace</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            The Safeeely Marketplace allows registered users to post and browse listings for products, services, and job opportunities. All marketplace transactions conducted through Safeeely are subject to the escrow terms in Section 6.
                        </p>
                        <h3 className="text-lg font-semibold mb-2 text-slate-800">Listing Categories</h3>
                        <div className="flex flex-wrap gap-3 mb-4">
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">Physical Products</div>
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">Digital Products</div>
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">Services (Freelance)</div>
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">Jobs (Hiring)</div>
                            <div className="px-4 py-2 bg-slate-100 rounded-full text-sm font-medium">Talent (Offering)</div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-slate-800">Prohibited Listings</h3>
                        <p className="leading-relaxed text-slate-700 mb-2">The following are strictly prohibited on the Safeeely Marketplace and will result in immediate removal and possible account termination:</p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                            <li>Illegal goods or services of any kind under Nigerian or international law</li>
                            <li>Adult content, pornography, or sexually explicit material</li>
                            <li>Weapons, ammunition, explosives, or controlled substances</li>
                            <li>Counterfeit or stolen goods</li>
                            <li>Financial instruments, securities, or investment schemes</li>
                            <li>Pyramid schemes, Ponzi schemes, or multi-level marketing disguised as products</li>
                            <li>Personal data, login credentials, or private information of third parties</li>
                            <li>Content that infringes any intellectual property right</li>
                            <li>Listings designed to deceive buyers about the nature of the product or service</li>
                        </ul>
                        <p className="leading-relaxed text-slate-700 mt-3">
                            Safeeely may remove any listing, without prior notice, at its sole discretion. Safeeely does not guarantee the accuracy, legality, or quality of any marketplace listing and bears no liability for disputes arising from marketplace transactions initiated outside the Safeeely escrow system.
                        </p>
                    </div>

                    {/* 14. Community Groups */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">14. Community Groups &amp; Revenue Sharing</h2>
                        <p className="leading-relaxed text-slate-700 mb-4">
                            Safeeely allows Telegram and Discord group admins to register their communities as licensed Safeeely escrow hubs. Registered communities receive a revenue share from platform fees earned on transactions conducted within the group.
                        </p>
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Free Tier</h3>
                                <p className="text-sm text-slate-600">Basic community features. 10% revenue share from platform fees on group transactions. No license fee required.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Pro Tier</h3>
                                <p className="text-sm text-slate-600">Enhanced features and 25% revenue share. Priced at ₦15,000 (~$10 USD) per 30-day license period.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Enterprise Tier</h3>
                                <p className="text-sm text-slate-600">Full feature access and 40% revenue share. Priced at ₦35,000 (~$24 USD) per 30-day license period.</p>
                            </div>
                        </div>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700">
                            <li>Community license fees are <strong>non-refundable</strong> once processed.</li>
                            <li>Licenses expire at the end of the purchased period and must be manually renewed. Expired licenses revert to the Free tier.</li>
                            <li>Revenue share is calculated based on fees from finalized transactions within the community group during the license period.</li>
                            <li>Safeeely may revoke a community license without refund if the community group is found to be facilitating prohibited activities or violating these Terms.</li>
                            <li>Community admins are responsible for moderating their groups and ensuring members comply with these Terms.</li>
                            <li>License prices and revenue-share percentages are subject to change with 14 days&apos; advance notice.</li>
                        </ul>
                    </div>

                    {/* 15. Referral Program */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">15. Referral Program</h2>
                        <p className="leading-relaxed text-slate-700 mb-4">
                            Safeeely operates a two-tier referral affiliate program. When you refer a new user to Safeeely using your unique referral code, you earn commissions from platform fees generated by that user&apos;s transactions.
                        </p>
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Tier 1 — Direct Referral</h3>
                                <p className="text-sm text-slate-600">You earn <strong>10%</strong> of the platform fee on every finalized transaction made by a user you directly referred.</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Tier 2 — Indirect Referral</h3>
                                <p className="text-sm text-slate-600">You earn <strong>5%</strong> of the platform fee on transactions made by users referred by your direct referrals.</p>
                            </div>
                        </div>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700">
                            <li>Commissions are earned only when the referred user&apos;s transaction reaches <strong>FINALIZED</strong> status. Cancelled, disputed-refunded, or incomplete transactions do not generate commissions.</li>
                            <li><strong>Self-referral is strictly prohibited.</strong> Attempts to refer yourself using alternate accounts, proxy accounts, or any other mechanism will result in commission forfeiture and account suspension.</li>
                            <li>Referral commissions are credited to your Safeeely balance and are withdrawable subject to standard KYC requirements.</li>
                            <li>Safeeely reserves the right to modify commission rates, tier structures, or terminate the referral program with 30 days&apos; advance notice.</li>
                            <li>Referral commissions earned before any rate change will be honoured at the rates in effect at the time of the finalized transaction.</li>
                            <li>Safeeely may withhold or claw back commissions if the underlying transaction is later found to be fraudulent or reversed.</li>
                        </ul>
                    </div>

                    {/* 16. Trust Score & Reputation */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">16. Trust Score &amp; Reputation System</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            Every Safeeely account carries a publicly visible <strong>Trust Score</strong> (0–100, starting at 50). This score reflects the account&apos;s transaction history, dispute outcomes, and behavioural signals.
                        </p>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            Factors that affect your Trust Score include: number of successful finalized transactions (positive), disputes raised against you and lost (negative), disputes you raised that were frivolous (negative), ghosted transactions (negative), fraud flags raised by the system or administrators (significant negative), and verified KYC status (positive).
                        </p>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            Trust Scores are informational signals to help counterparties make informed decisions. <strong>Safeeely is not liable for any commercial decision, loss, or harm resulting from reliance on a Trust Score.</strong> Trust Scores are algorithmic calculations and may not reflect the full picture of a user&apos;s trustworthiness.
                        </p>
                        <p className="leading-relaxed text-slate-700">
                            Users may not attempt to artificially inflate their Trust Score through fake transactions, mutual positive reviews, or any other manipulative practice. Such behaviour constitutes a prohibited activity under Section 17.
                        </p>
                    </div>

                    {/* 17. Prohibited Activities */}
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <h2 className="text-2xl font-bold text-emerald-900 mb-4">17. Prohibited Activities</h2>
                        <p className="text-emerald-800 mb-4 leading-relaxed">
                            The following activities are strictly prohibited on Safeeely and may result in immediate account termination, fund seizure, and referral to law enforcement:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-emerald-800">
                            <li>Fraud, misrepresentation, or deliberate deception of any counterparty or of Safeeely</li>
                            <li>Money laundering, terrorist financing, or use of Safeeely for any purpose prohibited by Nigerian or international law</li>
                            <li>Chargeback abuse — initiating chargebacks with your bank or card issuer while a dispute is pending on Safeeely, or after funds have been legitimately released</li>
                            <li>Creating transactions for goods or services that do not exist or that you have no intention of delivering</li>
                            <li>Impersonating another individual, business, or Safeeely representative</li>
                            <li>Manipulating or attempting to manipulate the Trust Score system through fake activity</li>
                            <li>Circumventing the KYC process using false or stolen identity documents</li>
                            <li>Using Safeeely to trade prohibited goods or services as listed in Section 13</li>
                            <li>Creating multiple accounts after a ban or suspension to evade enforcement</li>
                            <li>Harassing, threatening, or extorting counterparties within any Safeeely communication channel</li>
                            <li>Exploiting bugs or vulnerabilities in the Safeeely platform — report these responsibly to security@safeeely.io</li>
                            <li>Automated scraping, crawling, or data extraction from Safeeely without written permission</li>
                            <li>Reverse engineering, decompiling, or attempting to extract the source code of any Safeeely component</li>
                        </ul>
                    </div>

                    {/* 18. Intellectual Property */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">18. Intellectual Property</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            All intellectual property in the Safeeely platform — including but not limited to the software, algorithms, AI models, dispute pipeline logic, brand name, logo, trademarks, web application, bot flows, and all associated documentation — is owned exclusively by Safeeely Technology and is protected by applicable copyright, trademark, and intellectual property laws.
                        </p>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Safeeely platform for its intended purpose. This licence does not include the right to copy, modify, distribute, sell, or sublicence any part of the platform.
                        </p>
                        <p className="leading-relaxed text-slate-700">
                            By using Safeeely, you grant Safeeely a worldwide, royalty-free licence to display, store, process, and use your Safetag, public profile information, transaction history, reviews, and marketplace listings as necessary to provide and improve the service. You retain ownership of any original content you create, but you agree that Safeeely may use anonymised and aggregated data derived from your usage to improve the platform, train AI models, and produce analytics.
                        </p>
                    </div>

                    {/* 19. Notifications & Communications */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">19. Notifications &amp; Communications</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            By registering on Safeeely, you consent to receiving transactional and operational notifications through the messaging platforms you have linked to your account (Telegram, Discord, WhatsApp, Instagram, Apple Messages) and via email.
                        </p>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            <strong>Notification types you will receive include:</strong> transaction status updates, payment confirmations, dispute raised/resolved alerts, KYC submission and decision notices, withdrawal initiated/completed notifications, referral commission alerts, community license renewal reminders, and security alerts (e.g., new platform account linked).
                        </p>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            Emails are sent from <strong>info@safeeely.com</strong> via our email service provider (Resend). You may receive PDF invoices and payment receipts as email attachments. Safeeely will not send unsolicited marketing emails without your separate opt-in consent.
                        </p>
                        <p className="leading-relaxed text-slate-700">
                            Transactional notifications (those required to operate your escrow) cannot be fully opted out of while your account is active, as they are essential to the service. You may deactivate your account (Section 21) to stop all notifications.
                        </p>
                    </div>

                    {/* 20. Account Suspension & Termination */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">20. Account Suspension &amp; Termination by Safeeely</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            Safeeely may suspend or permanently terminate your account at any time, with or without advance notice, for any of the following reasons:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-3">
                            <li>Violation of any provision of these Terms</li>
                            <li>Engaging in any activity listed as prohibited in Section 17</li>
                            <li>Providing false registration or KYC information</li>
                            <li>Initiating fraudulent transactions or chargebacks</li>
                            <li>Repeated or severe dispute losses indicating bad-faith trading behaviour</li>
                            <li>Court order, regulatory direction, or legal obligation requiring suspension</li>
                            <li>Extended account inactivity at Safeeely&apos;s discretion</li>
                        </ul>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            Upon termination, your access to the Safeeely platform will be revoked. Any pending transactions at the time of termination will be handled at Safeeely&apos;s discretion, with priority given to protecting innocent counterparties. Funds legitimately owed to you will be returned after a review period, provided no fraud or chargeback is pending.
                        </p>
                        <p className="leading-relaxed text-slate-700">
                            To appeal a suspension, email <strong>support@safeeely.io</strong> within 14 days of the suspension notice. Safeeely will review appeals in good faith but reserves sole discretion over reinstatement decisions.
                        </p>
                    </div>

                    {/* 21. User-Initiated Account Deactivation */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">21. User-Initiated Account Deactivation</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            You may deactivate your own Safeeely account at any time by issuing the <code>/delete_account</code> command in any Safeeely bot, or by submitting a written request to <strong>privacy@safeeely.io</strong>.
                        </p>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            Upon deactivation, the following happens to your data:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-3">
                            <li>Your display name is changed to &ldquo;Deleted User&rdquo;</li>
                            <li>Your email is anonymised to a non-identifiable placeholder</li>
                            <li>All linked platform accounts (Telegram ID, Discord ID, etc.) are unlinked and removed</li>
                            <li>All saved payout methods are removed</li>
                            <li>Your Safetag is released and may be reclaimed by another user after a quarantine period</li>
                            <li>Transaction and financial records are <strong>retained for regulatory and audit purposes</strong> in an anonymised form, as required by applicable law</li>
                        </ul>
                        <p className="leading-relaxed text-slate-700">
                            Account deactivation is irreversible. Pending transactions or open disputes must be resolved before deactivation can be completed. Safeeely will notify you if deactivation is blocked pending resolution of active obligations.
                        </p>
                    </div>

                    {/* 22. Limitation of Liability */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">22. Limitation of Liability</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            To the maximum extent permitted by applicable law, Safeeely Technology, its directors, officers, employees, agents, partners, and service providers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of Safeeely, including but not limited to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-3">
                            <li>Failures, delays, or errors by any third-party payment gateway (Flutterwave, OPay, Airwallex, ChainRails, or any future gateway)</li>
                            <li>Loss of funds due to a counterparty&apos;s fraudulent or negligent conduct</li>
                            <li>Platform downtime, outages, or data loss</li>
                            <li>AI-generated content errors (Smart Transaction parsing or dispute AI) where the user had an opportunity to review the output before acting</li>
                            <li>Decisions made by third parties (including counterparties, marketplace users, or community admins) based on your Trust Score</li>
                            <li>Loss of business, revenue, profits, or data arising from use or inability to use the platform</li>
                            <li>Unauthorised access to your account resulting from your own negligence in protecting credentials</li>
                            <li>Actions taken by third-party messaging platforms (Telegram, Discord, Meta, Apple) that affect bot functionality</li>
                        </ul>
                        <p className="leading-relaxed text-slate-700">
                            In all cases where Safeeely is found liable, our aggregate liability to you for any and all claims shall not exceed the total platform fees you paid to Safeeely in the <strong>three (3) calendar months immediately preceding</strong> the claim. This limitation applies even if Safeeely has been advised of the possibility of such damages.
                        </p>
                    </div>

                    {/* 23. Indemnification */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">23. Indemnification</h2>
                        <p className="leading-relaxed text-slate-700">
                            You agree to defend, indemnify, and hold harmless Safeeely Technology, its directors, officers, employees, agents, and licensors from and against any claims, liabilities, damages, judgments, awards, losses, costs, and expenses (including reasonable legal fees) arising out of or relating to: (a) your violation of these Terms; (b) your use of the Safeeely platform; (c) your interactions with any counterparty in a transaction; (d) any content you submit, post, or transmit through Safeeely; (e) your violation of any applicable law or the rights of any third party; or (f) any fraudulent, negligent, or wilfully harmful conduct by you.
                        </p>
                    </div>

                    {/* 24. Governing Law */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">24. Governing Law &amp; Jurisdiction</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            These Terms are governed by and construed in accordance with the laws of the <strong>Federal Republic of Nigeria</strong>, without regard to its conflict-of-law principles. The Federal Competition and Consumer Protection Act (FCCPA), the Nigerian Data Protection Act (NDPA), and other applicable Nigerian statutes apply to the extent relevant.
                        </p>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            Any dispute arising out of or relating to these Terms or your use of Safeeely shall be subject to the exclusive jurisdiction of the courts of Lagos State, Nigeria. If you are using Safeeely from a jurisdiction outside Nigeria, you consent to this jurisdiction and waive any objection to it on grounds of venue or inconvenient forum.
                        </p>
                        <p className="leading-relaxed text-slate-700">
                            Safeeely encourages users to attempt to resolve disputes informally first by contacting <strong>support@safeeely.io</strong>. Before initiating any formal legal proceeding, both parties agree to engage in good-faith negotiation for at least 30 days.
                        </p>
                    </div>

                    {/* 25. Changes to Terms */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">25. Changes to These Terms</h2>
                        <p className="leading-relaxed text-slate-700 mb-3">
                            Safeeely reserves the right to update or modify these Terms at any time. For material changes — those that affect your rights, obligations, fee structure, or dispute resolution process — we will provide at least <strong>14 days&apos; advance notice</strong> by:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700 mb-3">
                            <li>Publishing the updated Terms on this page with a new effective date</li>
                            <li>Sending a notification via all active messaging platforms linked to your account</li>
                            <li>Sending an email to the address registered with your Safetag</li>
                        </ul>
                        <p className="leading-relaxed text-slate-700">
                            Your continued use of Safeeely after the effective date of any updated Terms constitutes your acceptance of those changes. If you do not agree with the revised Terms, you must stop using Safeeely before the effective date and may deactivate your account under Section 21.
                        </p>
                    </div>

                    {/* 26. Contact Information */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">26. Contact Information</h2>
                        <p className="leading-relaxed text-slate-700 mb-4">
                            If you have questions, concerns, or reports related to these Terms, please contact us through the appropriate channel:
                        </p>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">General &amp; Support</h3>
                                <p className="text-sm text-slate-600">support@safeeely.io</p>
                                <p className="text-xs text-slate-400 mt-1">Account issues, transaction queries, withdrawal help</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Legal &amp; Compliance</h3>
                                <p className="text-sm text-slate-600">legal@safeeely.io</p>
                                <p className="text-xs text-slate-400 mt-1">Terms disputes, IP notices, regulatory enquiries</p>
                            </div>
                            <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-emerald-600 mb-2">Privacy &amp; Data</h3>
                                <p className="text-sm text-slate-600">privacy@safeeely.io</p>
                                <p className="text-xs text-slate-400 mt-1">Data deletion requests, NDPA rights, KYC queries</p>
                            </div>
                        </div>
                        <p className="leading-relaxed text-slate-700 mt-4">
                            For security vulnerability disclosures, contact <strong>security@safeeely.io</strong>. We operate a responsible disclosure programme and ask that you do not publicly disclose vulnerabilities before we have had an opportunity to address them.
                        </p>
                    </div>

                </section>

                <footer className="mt-20 pt-8 border-t border-slate-200 text-sm text-slate-500">
                    Built for secure transactions. &copy; 2026 Safeeely Technology. These Terms of Service were last updated on May 18, 2026.
                </footer>
            </div>
        </div>
    );
}
