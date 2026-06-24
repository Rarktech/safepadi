import Link from "next/link";
import { HeroStat } from "../LegalHero";
import { TocEntry } from "../LegalSidebarToc";
import { LegalSection } from "../LegalSection";
import { LegalCard, LegalCardGrid } from "../LegalCard";
import { LegalP, LegalUl, LegalLi, LegalCallout } from "../LegalText";

export const privacyHeroStats: HeroStat[] = [
    { value: "17", label: "Sections" },
    { value: "Mar 2026", label: "Effective Date" },
    { value: "Global", label: "Coverage" },
    { value: "0", label: "Data Sold", accent: true },
];

export const privacyTocEntries: TocEntry[] = [
    { id: "p1", number: "1", label: "Introduction" },
    { id: "p2", number: "2", label: "Who We Are" },
    { id: "p3", number: "3", label: "Data We Collect" },
    { id: "p4", number: "4", label: "Legal Basis" },
    { id: "p5", number: "5", label: "How We Use Your Data" },
    { id: "p6", number: "6", label: "Who We Share With" },
    { id: "p7", number: "7", label: "Data Retention" },
    { id: "p8", number: "8", label: "KYC Document Handling" },
    { id: "p9", number: "9", label: "AI & Third-Party Processing" },
    { id: "p10", number: "10", label: "Cookies & Tracking" },
    { id: "p11", number: "11", label: "Data Security" },
    { id: "p12", number: "12", label: "Your Privacy Rights" },
    { id: "p13", number: "13", label: "Children's Privacy" },
    { id: "p14", number: "14", label: "International Transfers" },
    { id: "p15", number: "15", label: "Third-Party Links" },
    { id: "p16", number: "16", label: "Changes to This Policy" },
    { id: "p17", number: "17", label: "Contact Us" },
];

export function PrivacySections() {
    return (
        <>
            <LegalSection id="p1" number="1" title="Introduction">
                <LegalP>
                    Welcome to Safeeely. Your privacy is fundamental to us. This Privacy Policy explains how Safeeely Technology (&ldquo;Safeeely&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses, stores, shares, and protects your personal information when you use our platform — including our website, web application, and messaging bots on Telegram, Discord, and WhatsApp.
                </LegalP>
                <LegalP>
                    This Policy applies to all users of the Safeeely platform worldwide, and should be read together with our <Link href="/terms" style={{ color: "#059669", fontWeight: 600, textDecoration: "none" }}>Terms of Service</Link>, which governs your use of the platform. By using Safeeely, you acknowledge that you have read and understood this Privacy Policy.
                </LegalP>
                <LegalP mb={0}>
                    We are committed to handling your personal data in compliance with applicable data protection law globally, including the <strong>General Data Protection Regulation (GDPR)</strong>, the Nigerian Data Protection Act 2023 (NDPA), and other relevant international privacy standards.
                </LegalP>
            </LegalSection>

            <LegalSection id="p2" number="2" title="Who We Are">
                <LegalP>
                    <strong>Safeeely Technology</strong> is the data controller responsible for your personal information. We are a technology company that builds and operates escrow coordination software enabling secure transactions between buyers and sellers on social media platforms.
                </LegalP>
                <LegalP mb={20}>
                    As the data controller, we determine the purposes and means of processing your personal data. Where we engage third-party service providers to process data on our behalf, they act as data processors under our instruction and are bound by appropriate data processing agreements.
                </LegalP>
                <div style={{ background: "#f8fafc", border: "1px solid #e9eaec", borderRadius: 14, padding: "20px 24px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        <div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>Data Controller</div>
                            <div style={{ fontSize: 14.5, fontWeight: 600, color: "#0f172a" }}>Safeeely Technology</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>Privacy Contact</div>
                            <div style={{ fontSize: 14.5, fontWeight: 600 }}><a href="mailto:privacy@safeeely.io" style={{ color: "#059669", textDecoration: "none" }}>privacy@safeeely.io</a></div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>Website</div>
                            <div style={{ fontSize: 14.5, fontWeight: 600, color: "#0f172a" }}>safeeely.io</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#94a3b8", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>Coverage</div>
                            <div style={{ fontSize: 14.5, fontWeight: 600, color: "#0f172a" }}>Global</div>
                        </div>
                    </div>
                </div>
            </LegalSection>

            <LegalSection id="p3" number="3" title="Data We Collect">
                <LegalP mb={20}>We collect different categories of personal data depending on how you use the platform. Here is a full breakdown of every category we process:</LegalP>
                <LegalCardGrid columns={2}>
                    <LegalCard title="Registration & Account Data">Your Safetag (unique handle), email address, phone number, and account creation date. Collected when you register via bot command or web form.</LegalCard>
                    <LegalCard title="Identity & KYC Data">Full legal name, date of birth, residential address, NIN or government ID number, and front/back images of a valid government-issued identity document. Collected only when you initiate KYC verification.</LegalCard>
                    <LegalCard title="Transaction Data">Product or service description, agreed amount, currency, transaction status, milestone details, delivery deadlines, and timestamps. Collected for every escrow transaction you participate in.</LegalCard>
                    <LegalCard title="Payment & Payout Data">Bank account details (account number, bank name) or cryptocurrency wallet addresses you register for withdrawals. We do not store card numbers or private keys.</LegalCard>
                    <LegalCard title="Platform & Messaging IDs">Your unique user IDs from Telegram, Discord, or WhatsApp. Used to link your Safetag to your messaging platform accounts via OTP verification. Additional platforms will be added as they launch.</LegalCard>
                    <LegalCard title="Technical & Usage Data">IP addresses, browser type, device identifiers, session data, and platform interaction logs. Collected automatically when you use the Safeeely web application.</LegalCard>
                </LegalCardGrid>
                <LegalCardGrid columns={2}>
                    <LegalCard title="Communications Data">Messages you send to Safeeely bots, dispute evidence submissions (text, images, files), and support communications. Retained for dispute resolution and audit purposes.</LegalCard>
                    <LegalCard title="Referral & Affiliate Data">Your referral code, the users you referred (by Safetag), and commission records. Used to calculate and pay referral earnings under the affiliate programme.</LegalCard>
                </LegalCardGrid>
            </LegalSection>

            <LegalSection id="p4" number="4" title="Legal Basis for Processing">
                <LegalP mb={20}>Under applicable global data protection laws — including the GDPR, NDPA, and equivalent frameworks — we must have a valid legal basis for each type of processing we carry out. Here are the bases we rely on:</LegalP>
                <LegalCardGrid columns={2}>
                    <LegalCard title="Contract Performance">Processing necessary to provide the Safeeely escrow service you signed up for — creating accounts, managing transactions, processing disputes, and facilitating withdrawals.</LegalCard>
                    <LegalCard title="Legal Obligation">Processing required to comply with AML, KYC, and financial regulatory obligations under applicable laws and international regulations, including sharing data with relevant authorities when lawfully required.</LegalCard>
                    <LegalCard title="Legitimate Interests">Processing for fraud prevention, platform security, Trust Score calculation, improving our AI models using anonymised data, and sending transactional notifications essential to the service.</LegalCard>
                    <LegalCard title="Consent">Processing based on your explicit consent, such as sending marketing communications or processing data for purposes not covered by the above bases. You may withdraw consent at any time.</LegalCard>
                </LegalCardGrid>
            </LegalSection>

            <LegalSection id="p5" number="5" title="How We Use Your Data">
                <LegalP mb={16}>We use your personal data for the following purposes:</LegalP>
                <LegalUl mb={0}>
                    <LegalLi><strong>Providing the escrow service</strong> — creating and managing transactions, instructing payment gateways, processing disputes, and releasing or returning funds.</LegalLi>
                    <LegalLi><strong>Account management</strong> — registering your Safetag, linking platform accounts, maintaining your profile, and enabling KYC verification.</LegalLi>
                    <LegalLi><strong>Payments and withdrawals</strong> — processing withdrawal requests to your registered bank account or wallet address.</LegalLi>
                    <LegalLi><strong>Dispute resolution</strong> — using submitted evidence, transaction history, and Trust Scores in our AI-assisted dispute pipeline to reach fair outcomes.</LegalLi>
                    <LegalLi><strong>Fraud prevention and security</strong> — detecting, investigating, and preventing fraudulent transactions, account takeovers, and abuse of the platform.</LegalLi>
                    <LegalLi><strong>Regulatory compliance</strong> — fulfilling AML/KYC obligations, responding to lawful requests from regulatory or law enforcement authorities, and maintaining required financial records.</LegalLi>
                    <LegalLi><strong>Platform communications</strong> — sending transactional notifications (status updates, payment confirmations, dispute alerts, withdrawal notifications) via your linked platforms and email.</LegalLi>
                    <LegalLi><strong>Trust Score calculation</strong> — computing and displaying your public Trust Score based on transaction history, dispute outcomes, and KYC verification status.</LegalLi>
                    <LegalLi><strong>Referral programme</strong> — tracking referred users and calculating commissions under the two-tier affiliate system.</LegalLi>
                    <LegalLi mb={0}><strong>Platform improvement</strong> — using anonymised and aggregated data to improve our services, AI models, and dispute resolution accuracy. We do not use identifiable personal data for training without your consent.</LegalLi>
                </LegalUl>
            </LegalSection>

            <LegalSection id="p6" number="6" title="Who We Share Your Data With">
                <LegalCallout tone="emerald" mb={22}>
                    <strong style={{ color: "#065f46" }}>We do not sell, rent, or trade your personal data to any third party for commercial or marketing purposes — ever.</strong>
                </LegalCallout>
                <LegalP mb={20}>We share your data only with the following categories of recipients and only to the extent necessary:</LegalP>
                <LegalCardGrid columns={2}>
                    <LegalCard title="Payment Gateways">Flutterwave, OPay, Airwallex, and ChainRails receive transaction amounts, currency, and reference data necessary to process payments and withdrawals. They operate under their own privacy policies and regulatory licences.</LegalCard>
                    <LegalCard title="AI Service Providers">Google Gemini API receives transaction descriptions and dispute evidence for Smart Transaction Parsing and dispute adjudication. Google&apos;s API data handling terms apply. See Section 9 for full details.</LegalCard>
                    <LegalCard title="Cloud Infrastructure">Supabase is our primary database and storage provider. KYC documents, user records, and transaction data are stored in Supabase-managed infrastructure with encryption at rest.</LegalCard>
                    <LegalCard title="Email Service">Resend processes email delivery for transaction receipts, notifications, and PDF invoices. Your email address and notification content are shared with Resend for delivery purposes only.</LegalCard>
                    <LegalCard title="Messaging Platforms">Telegram, Discord, and Meta (WhatsApp) APIs receive bot command responses and notification content. These platforms operate under their own independent privacy policies.</LegalCard>
                    <LegalCard title="Regulatory & Law Enforcement">We may disclose personal data to relevant regulatory bodies, law enforcement agencies, or courts where we are legally obligated to do so by a valid court order, regulatory directive, or applicable law.</LegalCard>
                </LegalCardGrid>
                <LegalP mb={0}>All third-party processors we engage are bound by written data processing agreements that require them to handle your data securely, only for the specified purpose, and in compliance with applicable privacy law.</LegalP>
            </LegalSection>

            <LegalSection id="p7" number="7" title="Data Retention">
                <LegalP mb={20}>We retain your personal data only for as long as necessary for the purpose it was collected, or as required by law. The following retention schedules apply:</LegalP>
                <LegalCardGrid columns={3}>
                    <LegalCard title="Account Data">Retained for the duration of your active account plus <strong>7 years</strong> post-closure for regulatory audit purposes. Anonymised on account deactivation.</LegalCard>
                    <LegalCard title="Transaction Records">Retained for <strong>7 years</strong> from the date of the transaction, in anonymised form post-deactivation, to meet applicable financial record-keeping requirements.</LegalCard>
                    <LegalCard title="KYC Documents">Retained for <strong>5 years</strong> after your account is closed. Stored encrypted in Supabase. Access is strictly limited to authorised Safeeely personnel.</LegalCard>
                    <LegalCard title="Dispute Evidence">Retained for <strong>3 years</strong> from the dispute resolution date. Includes submitted files, images, and message transcripts used in the AI dispute pipeline.</LegalCard>
                    <LegalCard title="Platform IDs">Telegram, Discord, and WhatsApp IDs are deleted immediately upon account deactivation.</LegalCard>
                    <LegalCard title="Technical Logs">Server access logs and error logs are retained for <strong>90 days</strong>, then automatically purged. Used solely for security monitoring and debugging.</LegalCard>
                </LegalCardGrid>
                <LegalP mb={0}>When retention periods expire, data is either securely deleted or irreversibly anonymised so it can no longer be associated with you. You may request early deletion of non-mandatory data by contacting <a href="mailto:privacy@safeeely.io" style={{ color: "#059669", textDecoration: "none" }}>privacy@safeeely.io</a> — subject to our legal obligations.</LegalP>
            </LegalSection>

            <LegalSection id="p8" number="8" title="KYC Document Handling">
                <LegalP mb={14}>KYC documents (government ID images, NIN, and supporting personal information) are among the most sensitive data we handle. We apply the following specific safeguards:</LegalP>
                <LegalUl>
                    <LegalLi><strong>Encrypted storage:</strong> All KYC documents are stored in a dedicated, access-controlled Supabase storage bucket with encryption at rest using AES-256.</LegalLi>
                    <LegalLi><strong>Access restriction:</strong> KYC documents are accessible only to authorised Safeeely compliance personnel on a need-to-know basis. Access is logged and audited.</LegalLi>
                    <LegalLi><strong>No sharing for marketing:</strong> KYC data is never used for marketing, profiling, or shared with any third party for commercial purposes.</LegalLi>
                    <LegalLi><strong>Identity verification partners:</strong> Where we engage licensed identity verification services to validate your documents, those partners receive only the minimum data required and are bound by strict data processing agreements.</LegalLi>
                    <LegalLi><strong>Regulatory disclosure:</strong> We may be legally required to share KYC data with relevant regulatory bodies, law enforcement agencies, or courts in response to valid legal orders. We will notify you of such requests where legally permitted to do so.</LegalLi>
                    <LegalLi mb={0}><strong>Retention:</strong> KYC documents are retained for 5 years after account closure, as required by applicable AML regulations, then securely deleted.</LegalLi>
                </LegalUl>
                <LegalP mb={0}>If you believe your KYC data has been mishandled, please contact <a href="mailto:privacy@safeeely.io" style={{ color: "#059669", textDecoration: "none" }}>privacy@safeeely.io</a> immediately. We will investigate and respond within 30 days.</LegalP>
            </LegalSection>

            <LegalSection id="p9" number="9" title="AI & Third-Party Processing">
                <LegalP>Safeeely uses <strong>Google Gemini</strong> for two AI-powered features: Smart Transaction Parsing (converting free-text or voice descriptions into structured transaction fields) and Dispute Adjudication (analysing evidence to produce a verdict recommendation).</LegalP>
                <LegalCallout tone="emerald" title="What Data Is Sent to Google Gemini">
                    <LegalUl color="#065f46" mb={0}>
                        <LegalLi>Transaction descriptions you type or dictate (Smart Parsing)</LegalLi>
                        <LegalLi>Dispute evidence text and file references submitted by both parties</LegalLi>
                        <LegalLi>Transaction metadata (amount, product name, status history)</LegalLi>
                        <LegalLi mb={0}>Trust Score context and fraud flag summaries (dispute processing only)</LegalLi>
                    </LegalUl>
                </LegalCallout>
                <LegalP>By using AI-powered features, you consent to your transaction content being processed by Google&apos;s Gemini API. Google&apos;s handling of API data is governed by <strong>Google&apos;s Cloud API Terms of Service and Privacy Policy</strong>, which are independent of Safeeely&apos;s policies. We encourage you to review Google&apos;s terms at cloud.google.com.</LegalP>
                <LegalP mb={0}>AI outputs are probabilistic. Safeeely does not represent that AI-generated dispute verdicts or transaction parses are error-free. All AI dispute verdicts are reviewed by a human administrator before execution.</LegalP>
            </LegalSection>

            <LegalSection id="p10" number="10" title="Cookies & Tracking">
                <LegalP mb={16}>The Safeeely web application at safeeely.io uses the following categories of cookies and local storage:</LegalP>
                <LegalCardGrid columns={3}>
                    <LegalCard title="Essential Session Cookies">Required for authentication, maintaining your logged-in session, and CSRF protection. These cannot be disabled without breaking core functionality.</LegalCard>
                    <LegalCard title="Preference Storage">Local storage entries that remember your UI preferences (e.g., dashboard layout, notification settings). Never sent to third parties.</LegalCard>
                    <LegalCard title="Analytics (Anonymised)">Anonymised usage metrics to understand how features are used. No cross-site tracking, no advertising identifiers, and no linkage to your personal identity.</LegalCard>
                </LegalCardGrid>
                <LegalP mb={0}><strong>We do not use advertising cookies, third-party tracking pixels, or sell behavioural data to ad networks.</strong> Safeeely bots (Telegram, Discord, WhatsApp, etc.) do not use cookies — they operate via platform APIs only.</LegalP>
            </LegalSection>

            <LegalSection id="p11" number="11" title="Data Security">
                <LegalP mb={16}>We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, disclosure, alteration, or destruction. Our security practices include:</LegalP>
                <LegalUl>
                    <LegalLi><strong>Encryption in transit:</strong> All data transmitted between your devices, our servers, and third-party services is encrypted using TLS 1.2 or higher.</LegalLi>
                    <LegalLi><strong>Encryption at rest:</strong> Database records and file storage (including KYC documents) are encrypted using AES-256.</LegalLi>
                    <LegalLi><strong>Webhook security:</strong> All payment gateway webhooks are verified using HMAC signatures (SHA-512 for Flutterwave/OPay, SHA-256 with timestamp replay protection for Airwallex) before processing.</LegalLi>
                    <LegalLi><strong>Access controls:</strong> Internal access to sensitive data is role-based and limited to authorised personnel. All internal access is logged and subject to audit.</LegalLi>
                    <LegalLi><strong>Security monitoring:</strong> We monitor our systems for anomalous activity, intrusion attempts, and data exfiltration patterns.</LegalLi>
                    <LegalLi mb={0}><strong>Vulnerability disclosure:</strong> We operate a responsible disclosure programme. If you discover a security vulnerability, please contact <a href="mailto:security@safeeely.io" style={{ color: "#059669", textDecoration: "none" }}>security@safeeely.io</a> before any public disclosure.</LegalLi>
                </LegalUl>
                <LegalP mb={0}>No security system is impenetrable. In the event of a personal data breach that poses a risk to your rights and freedoms, we will notify the relevant supervisory authority within 72 hours and affected users without undue delay, as required by applicable law.</LegalP>
            </LegalSection>

            <LegalSection id="p12" number="12" title="Your Privacy Rights">
                <LegalP mb={20}>Under applicable privacy law — including GDPR, NDPA, and equivalent frameworks worldwide — you have the following rights regarding your personal data. To exercise any right, contact <a href="mailto:privacy@safeeely.io" style={{ color: "#059669", textDecoration: "none" }}>privacy@safeeely.io</a>:</LegalP>
                <LegalCardGrid columns={2}>
                    <LegalCard title="Right to Access">Request a copy of all personal data we hold about you. We will respond within 30 days and provide a structured, machine-readable export where feasible.</LegalCard>
                    <LegalCard title="Right to Rectification">Request correction of any inaccurate or incomplete personal data. You can update most profile information directly in the Safeeely dashboard or by contacting support.</LegalCard>
                    <LegalCard title="Right to Erasure">Request deletion of your personal data. We will fulfil erasure requests for data we are not legally required to retain. Issue <code>/delete_account</code> via any bot or email <a href="mailto:privacy@safeeely.io" style={{ color: "#059669" }}>privacy@safeeely.io</a>.</LegalCard>
                    <LegalCard title="Right to Portability">Request your personal data in a structured, commonly used, machine-readable format (JSON or CSV) for transfer to another service provider.</LegalCard>
                    <LegalCard title="Right to Object">Object to processing based on legitimate interests. Where your objection is valid, we will cease that specific processing unless we have compelling legitimate grounds to continue.</LegalCard>
                    <LegalCard title="Right to Restrict Processing">Request that we limit how we use your data while a dispute about its accuracy or our processing basis is being resolved.</LegalCard>
                    <LegalCard title="Right to Withdraw Consent">Where processing is based on consent, you may withdraw it at any time. Withdrawal does not affect the lawfulness of processing carried out before withdrawal.</LegalCard>
                    <LegalCard title="Right to Lodge a Complaint">You have the right to lodge a complaint with your local data protection supervisory authority if you believe we have handled your data unlawfully.</LegalCard>
                </LegalCardGrid>
                <LegalP mb={0}>We respond to all verifiable privacy requests within <strong>30 calendar days</strong>. Complex or high-volume requests may require an extension, which we will notify you of in advance.</LegalP>
            </LegalSection>

            <LegalSection id="p13" number="13" title="Children's Privacy">
                <LegalP>Safeeely is not designed for or directed at individuals under the age of 18. We do not knowingly collect personal data from anyone under 18 years of age. Our Terms of Service require all users to be at least 18 years old (or the age of legal majority in their jurisdiction).</LegalP>
                <LegalP mb={0}>If we become aware that a person under 18 has provided us with personal data, we will take immediate steps to delete that data and close the associated account. If you believe a minor has created a Safeeely account, please contact us at <a href="mailto:privacy@safeeely.io" style={{ color: "#059669", textDecoration: "none" }}>privacy@safeeely.io</a>.</LegalP>
            </LegalSection>

            <LegalSection id="p14" number="14" title="International Data Transfers">
                <LegalP>As a global platform, some of your personal data may be transferred to and processed in countries other than your own. Specifically, our cloud infrastructure provider (Supabase) and AI provider (Google Gemini) may process data in the United States and other jurisdictions.</LegalP>
                <LegalP>When we transfer data internationally, we ensure appropriate safeguards are in place including:</LegalP>
                <LegalUl>
                    <LegalLi mb={7}>Data Processing Agreements with Standard Contractual Clauses (SCCs) where applicable</LegalLi>
                    <LegalLi mb={7}>Transfers only to jurisdictions with adequate data protection frameworks or to providers certified under equivalent standards</LegalLi>
                    <LegalLi mb={0}>Compliance with applicable international data transfer requirements and guidance on cross-border data flows</LegalLi>
                </LegalUl>
                <LegalP mb={0}>By using Safeeely, you acknowledge that your data may be transferred internationally under these safeguards. For more detail on transfer mechanisms, contact <a href="mailto:privacy@safeeely.io" style={{ color: "#059669", textDecoration: "none" }}>privacy@safeeely.io</a>.</LegalP>
            </LegalSection>

            <LegalSection id="p15" number="15" title="Third-Party Links & Services">
                <LegalP>The Safeeely platform may contain links to external websites or integrate with third-party services (such as the messaging platforms we operate on). This Privacy Policy applies only to Safeeely. We are not responsible for the privacy practices of any third-party website or service.</LegalP>
                <LegalP mb={0}>We encourage you to review the privacy policies of any third-party platform you use in conjunction with Safeeely, including Telegram, Discord, Meta (WhatsApp), Flutterwave, OPay, Airwallex, ChainRails, and Google.</LegalP>
            </LegalSection>

            <LegalSection id="p16" number="16" title="Changes to This Policy">
                <LegalP mb={16}>We may update this Privacy Policy from time to time to reflect changes in our data practices, legal requirements, or platform features. When we make material changes, we will:</LegalP>
                <LegalUl>
                    <LegalLi mb={7}>Update the effective date at the top of this page</LegalLi>
                    <LegalLi mb={7}>Send a notification via your linked messaging platforms and email</LegalLi>
                    <LegalLi mb={0}>Where required by law, seek your renewed consent</LegalLi>
                </LegalUl>
                <LegalP mb={0}>Your continued use of Safeeely after the updated Policy&apos;s effective date constitutes your acceptance of the changes. If you do not agree, you may deactivate your account by issuing <code>/delete_account</code> in any bot or emailing <a href="mailto:privacy@safeeely.io" style={{ color: "#059669", textDecoration: "none" }}>privacy@safeeely.io</a>.</LegalP>
            </LegalSection>

            <LegalSection id="p17" number="17" title="Contact Us">
                <LegalP mb={20}>For all privacy-related questions, data requests, or concerns, please contact us through the appropriate channel below. We aim to respond to all requests within 30 calendar days.</LegalP>
                <LegalCardGrid columns={3}>
                    <LegalCard title="Privacy & Data Requests">
                        <a href="mailto:privacy@safeeely.io" style={{ color: "#64748b", textDecoration: "none" }}>privacy@safeeely.io</a>
                        <br />
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>Data access, erasure, portability, rectification</span>
                    </LegalCard>
                    <LegalCard title="Legal & Compliance">
                        <a href="mailto:legal@safeeely.io" style={{ color: "#64748b", textDecoration: "none" }}>legal@safeeely.io</a>
                        <br />
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>Regulatory enquiries, privacy rights, law enforcement</span>
                    </LegalCard>
                    <LegalCard title="Security Disclosures">
                        <a href="mailto:security@safeeely.io" style={{ color: "#64748b", textDecoration: "none" }}>security@safeeely.io</a>
                        <br />
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>Responsible vulnerability disclosure only</span>
                    </LegalCard>
                </LegalCardGrid>
                <LegalP mb={0}>You also have the right to lodge a complaint with your relevant local data protection supervisory authority if you believe your data has been mishandled. We would always prefer to resolve concerns directly first.</LegalP>
            </LegalSection>
        </>
    );
}
