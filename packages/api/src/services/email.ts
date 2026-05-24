import axios from 'axios';
import { getBrowser } from './puppeteer';
import { generateInvoiceTemplate, InvoiceData } from '../templates/invoiceTemplate';

const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
const FROM_EMAIL = process.env.SMTP_FROM || '"Safeeely" <info@safeeely.com>';

export async function sendEmail({
    to,
    subject,
    html,
    attachments,
    cc,
}: {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{ filename: string; content: string }>;
    cc?: string;
}) {
    if (!RESEND_API_KEY) {
        console.warn('⚠️ [Email] RESEND_API_KEY not set. Skipping email to:', to);
        return;
    }
    try {
        const body: any = { from: FROM_EMAIL, to: [to], subject, html };
        if (cc) body.cc = [cc];
        if (attachments?.length) body.attachments = attachments;
        await axios.post(
            'https://api.resend.com/emails',
            body,
            {
                headers: {
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );
        console.log(`✅ [Email] Sent "${subject}" to ${to}`);
    } catch (err: any) {
        console.error(`❌ [Email] Failed to send to ${to}:`, err.response?.data || err.message);
    }
}

export async function sendTransactionInvoiceEmail(data: InvoiceData) {
    const html = generateInvoiceTemplate(data);

    let pdfBase64: string | undefined;
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' as any });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await page.close();
        pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    } catch (err: any) {
        console.error('❌ [Invoice] PDF generation failed, sending email without attachment:', err.message);
    }

    const subject = `Invoice #${data.txnCode} from ${data.seller.firstName} (${data.seller.safetag})`;
    const kv = (k: string, v: string) =>
        `<tr><td style="color:#64748b;font-size:14px;padding:10px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;width:55%">${k}</td><td style="color:#0f172a;font-weight:600;font-size:14px;padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:top">${v}</td></tr>`;
    const p = (t: string) => `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px">${t}</p>`;

    let itemsHtml = kv('Item / Service', data.productName);
    if (data.description) itemsHtml += kv('Description', data.description);
    if (data.transactionType === 'MILESTONE' && data.milestones?.length) {
        data.milestones.forEach((m, i) => {
            itemsHtml += kv(`Phase ${i + 1}: ${m.title}`, `${m.amount.toLocaleString()} ${data.currency}`);
        });
    }
    itemsHtml += kv('Subtotal', `${data.amount.toLocaleString()} ${data.currency}`);
    itemsHtml += kv('Platform Fee', `${data.feeAmount.toFixed(2)} ${data.currency}`);
    const totalRow = `<tr><td style="color:#0f172a;font-size:15px;font-weight:700;padding:14px 0;border-top:2px solid #0f172a">Total Due</td><td style="color:#0f172a;font-weight:800;font-size:15px;padding:14px 0;border-top:2px solid #0f172a;text-align:right">${data.totalAmount.toFixed(2)} ${data.currency}</td></tr>`;

    const reviewsUrl = process.env.REVIEWS_URL || 'https://safeeely.com';
    const payUrl = `${reviewsUrl}/pay/${data.txnId}`;
    const cta = `<div style="text-align:center;margin:28px 0"><a href="${payUrl}" style="background:#10B981;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;display:inline-block">&#x1F4B3; Pay with Safeeely</a></div>`;

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
  <div style="background:#f8fafc;padding:24px 32px;text-align:center;border-bottom:1px solid #e2e8f0">
    <img src="${reviewsUrl}/logo-main.svg" alt="Safeeely" style="height:40px;width:auto" />
  </div>
  <div style="padding:32px">
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:20px">Invoice from ${data.seller.firstName} 📄</h2>
    ${p(`Hi <b>${data.buyer.safetag}</b>,`)}
    ${p(`<b>${data.seller.safetag}</b> has sent you a professional invoice for <b>${data.productName}</b>. Your invoice PDF is attached — it includes a Pay with Safeeely button for secure payment.`)}
    <table style="width:100%;border-collapse:collapse;margin:20px 0">${itemsHtml}${totalRow}</table>
    ${cta}
    ${pdfBase64 ? `<p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:12px">Invoice PDF attached above.</p>` : ''}
  </div>
  <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0">
    <p style="margin:0;color:#94a3b8;font-size:12px">© Safeeely · <a href="mailto:support@safeeely.com" style="color:#94a3b8">support@safeeely.com</a></p>
  </div>
</div></body></html>`;

    await sendEmail({
        to: data.buyer.email,
        cc: data.seller.email,
        subject,
        html: emailHtml,
        ...(pdfBase64 ? { attachments: [{ filename: `invoice-${data.txnCode}.pdf`, content: pdfBase64 }] } : {}),
    });
}

// ─── Branded email wrapper ──────────────────────────────────────────────────
function wrap(title: string, body: string, ctaUrl?: string, ctaLabel?: string) {
    const cta = ctaUrl ? `<div style="text-align:center;margin:28px 0"><a href="${ctaUrl}" style="background:#f59e0b;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;display:inline-block">${ctaLabel || 'View on Safeeely'}</a></div>` : '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
  <div style="background:#0f172a;padding:24px 32px;text-align:center">
    <span style="color:#f59e0b;font-size:24px;font-weight:700">Safeeely</span>
  </div>
  <div style="padding:32px">
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:20px">${title}</h2>
    ${body}
    ${cta}
  </div>
  <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0">
    <p style="margin:0;color:#94a3b8;font-size:12px">© Safeeely · <a href="mailto:support@safeeely.com" style="color:#94a3b8">support@safeeely.com</a></p>
  </div>
</div></body></html>`;
}

const p = (text: string) => `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px">${text}</p>`;
const kv = (k: string, v: string) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b;font-size:14px">${k}</span><span style="color:#0f172a;font-weight:600;font-size:14px">${v}</span></div>`;
const reviewsUrl = () => process.env.REVIEWS_URL || 'https://safeeely.com';

// 1. Transaction accepted — notify buyer to pay
export function sendTransactionAcceptedEmail(to: string, opts: { safetag: string; product: string; amount: number; currency: string; txnId: string; txnCode: string }) {
    sendEmail({
        to, subject: `Your trade was accepted — pay now to lock it in`,
        html: wrap('Trade Accepted ✅', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(`<b>${opts.product}</b> has been accepted. Make your payment to lock the escrow.`)}${kv('Amount', `${opts.amount} ${opts.currency}`)}${kv('Transaction', opts.txnCode)}`, `${reviewsUrl()}/pay/${opts.txnId}`, '💳 Pay Now')
    }).catch(() => {});
}

// 2. Payment confirmed — notify both parties
export function sendPaymentConfirmedEmail(to: string, opts: { safetag: string; role: 'buyer' | 'seller'; product: string; amount: number; currency: string; txnCode: string; txnId: string }) {
    const isBuyer = opts.role === 'buyer';
    sendEmail({
        to, subject: `Funds secured in escrow — ${opts.amount} ${opts.currency}`,
        html: wrap('Payment Confirmed 🔐', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(isBuyer ? 'Your payment is secured in escrow. You\'ll be notified when delivery is ready.' : 'Payment received in escrow — proceed to fulfill the order.')}${kv('Product', opts.product)}${kv('Amount', `${opts.amount} ${opts.currency}`)}${kv('Transaction', opts.txnCode)}`, `${reviewsUrl()}/dashboard/transactions/${opts.txnId}`, '👁️ View Transaction')
    }).catch(() => {});
}

// 3. Delivery proof submitted — notify buyer
export function sendDeliverySubmittedEmail(to: string, opts: { safetag: string; sellerTag: string; product: string; txnCode: string; txnId: string }) {
    sendEmail({
        to, subject: `Seller submitted delivery proof — confirm receipt`,
        html: wrap('Delivery Update 📦', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(`<b>@${opts.sellerTag}</b> has submitted delivery proof for <b>${opts.product}</b>. Please review and confirm receipt.`)}${kv('Transaction', opts.txnCode)}`, `${reviewsUrl()}/dashboard/transactions/${opts.txnId}`, '✅ Confirm Receipt')
    }).catch(() => {});
}

// 4. Transaction completed — notify seller funds released
export function sendTransactionCompletedEmail(to: string, opts: { safetag: string; product: string; amount: number; currency: string; txnCode: string }) {
    sendEmail({
        to, subject: `Funds Released — ${opts.amount} ${opts.currency} is now in your balance`,
        html: wrap('Transaction Complete 🎉', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p('The buyer confirmed receipt. Funds have been released to your balance.')}${kv('Product', opts.product)}${kv('Released', `${opts.amount} ${opts.currency}`)}${kv('Transaction', opts.txnCode)}`, `${reviewsUrl()}/dashboard`, '💰 View Balance')
    }).catch(() => {});
}

// 5. Withdrawal initiated
export function sendWithdrawalInitiatedEmail(to: string, opts: { safetag: string; amount: number; currency: string; reference: string }) {
    sendEmail({
        to, subject: `Withdrawal of ${opts.amount} ${opts.currency} is being processed`,
        html: wrap('Withdrawal Processing 💸', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p('Your withdrawal request has been received and is being processed within 24 hours.')}${kv('Amount', `${opts.amount} ${opts.currency}`)}${kv('Reference', opts.reference)}`, `${reviewsUrl()}/dashboard/withdrawals`, '👁️ View Withdrawals')
    }).catch(() => {});
}

// 6. Withdrawal completed (called from admin approve)
export function sendWithdrawalCompletedEmail(to: string, opts: { safetag: string; amount: number; currency: string; reference: string }) {
    sendEmail({
        to, subject: `Withdrawal Successful — ${opts.amount} ${opts.currency} sent`,
        html: wrap('Withdrawal Successful ✅', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p('Your withdrawal has been processed and sent to your payout method.')}${kv('Amount', `${opts.amount} ${opts.currency}`)}${kv('Reference', opts.reference)}`)
    }).catch(() => {});
}

// 7. Withdrawal rejected
export function sendWithdrawalRejectedEmail(to: string, opts: { safetag: string; amount: number; currency: string; reason?: string }) {
    sendEmail({
        to, subject: `Withdrawal Request Rejected`,
        html: wrap('Withdrawal Failed ❌', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(`Your withdrawal of <b>${opts.amount} ${opts.currency}</b> could not be processed.`)}${opts.reason ? kv('Reason', opts.reason) : ''}${p('Please contact support if you have questions.')}`, `mailto:support@safeeely.com`, '📧 Contact Support')
    }).catch(() => {});
}

// 8. Dispute opened against you
export function sendDisputeRaisedEmail(to: string, opts: { safetag: string; raisingParty: string; product: string; txnCode: string; reason: string; txnId: string }) {
    sendEmail({
        to, subject: `A dispute has been raised on transaction #${opts.txnCode}`,
        html: wrap('Dispute Raised ⚠️', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(`<b>@${opts.raisingParty}</b> has raised a dispute on your transaction for <b>${opts.product}</b>.`)}${kv('Transaction', opts.txnCode)}${kv('Reason', opts.reason)}${p('Please log in to your dashboard to respond with evidence.')}`, `${reviewsUrl()}/dashboard/transactions/${opts.txnId}`, '👁️ View Dispute')
    }).catch(() => {});
}

// 9. Dispute resolved
export function sendDisputeResolvedEmail(to: string, opts: { safetag: string; product: string; txnCode: string; outcome: string; txnId: string }) {
    sendEmail({
        to, subject: `Dispute Resolved — ${opts.outcome}`,
        html: wrap('Dispute Resolved ⚖️', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(`The dispute for <b>${opts.product}</b> has been resolved by AI Mediation.`)}${kv('Transaction', opts.txnCode)}${kv('Outcome', opts.outcome)}`, `${reviewsUrl()}/dashboard/transactions/${opts.txnId}`, '👁️ View Details')
    }).catch(() => {});
}

// 10. Review received
export function sendReviewReceivedEmail(to: string, opts: { safetag: string; reviewerTag: string; rating: number; comment?: string }) {
    const stars = '⭐'.repeat(opts.rating);
    sendEmail({
        to, subject: `${opts.reviewerTag} left you a ${opts.rating}★ review`,
        html: wrap(`New Review ${stars}`, `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(`<b>@${opts.reviewerTag}</b> left you a <b>${opts.rating}/5</b> review.`)}${opts.comment ? `<blockquote style="border-left:4px solid #f59e0b;padding:8px 16px;margin:16px 0;color:#374151;font-style:italic">${opts.comment}</blockquote>` : ''}`, `${reviewsUrl()}/reviews/${encodeURIComponent(opts.safetag)}`, '👁️ View Reviews')
    }).catch(() => {});
}

// 11. Referral commission earned
export function sendReferralCommissionEmail(to: string, opts: { amount: number; currency: string; tier: number }) {
    sendEmail({
        to, subject: `Commission Earned — ${opts.amount} ${opts.currency} added to your balance`,
        html: wrap('Commission Earned 💰', `${p('You just earned a referral commission!')}${kv('Amount', `${opts.amount} ${opts.currency}`)}${kv('Tier', `Tier ${opts.tier}`)}`, `${reviewsUrl()}/dashboard`, '👁️ View Balance')
    }).catch(() => {});
}

// 12. KYC approved
export function sendKycApprovedEmail(to: string, opts: { safetag: string }) {
    sendEmail({
        to, subject: `Identity Verified — your account is fully unlocked`,
        html: wrap('KYC Verified 🎉', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p('Congratulations! Your identity has been verified. Your account is now fully unlocked and you can transact without limits.')}`, `${reviewsUrl()}/dashboard`, '🚀 Go to Dashboard')
    }).catch(() => {});
}

// 13. KYC rejected (standalone helper — also called inline in admin.ts)
export function sendKycRejectedEmail(to: string, opts: { safetag: string; reason: string }) {
    sendEmail({
        to, subject: `KYC Submission Rejected — please resubmit`,
        html: wrap('KYC Rejected ⚠️', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p('Your KYC submission was not approved.')}${kv('Reason', opts.reason)}${p('Please correct the issue and resubmit your documents via the Safeeely app.')}`, `${reviewsUrl()}/kyc`, '🔄 Retry KYC')
    }).catch(() => {});
}

// 14. Milestone released
export function sendMilestoneReleasedEmail(to: string, opts: { safetag: string; role: 'buyer' | 'seller'; milestoneTitle: string; milestoneIndex: number; milestoneTotal: number; amount: number; currency: string; txnCode: string; txnId: string }) {
    sendEmail({
        to, subject: `Milestone ${opts.milestoneIndex} of ${opts.milestoneTotal} Released — ${opts.amount} ${opts.currency}`,
        html: wrap('Milestone Released 💰', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(opts.role === 'seller' ? `Milestone funds have been released to your balance.` : `You have released the funds for milestone <b>${opts.milestoneTitle}</b>.`)}${kv('Milestone', `${opts.milestoneTitle} (${opts.milestoneIndex}/${opts.milestoneTotal})`)}${kv('Amount', `${opts.amount} ${opts.currency}`)}${kv('Transaction', opts.txnCode)}`, `${reviewsUrl()}/dashboard/transactions/${opts.txnId}`, '👁️ View Project')
    }).catch(() => {});
}

// 15. New transaction request received (recipient needs to accept/decline)
export function sendNewTransactionRequestEmail(to: string, opts: { safetag: string; counterpartyTag: string; product: string; amount: number; currency: string; txnCode: string; txnId: string }) {
    sendEmail({
        to, subject: `New transaction request — ${opts.product} from ${opts.counterpartyTag}`,
        html: wrap('New Transaction Request 🔔', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(`<b>${opts.counterpartyTag}</b> has sent you a secure transaction request on Safeeely.`)}${kv('Product / Service', opts.product)}${kv('Amount', `${opts.amount.toLocaleString()} ${opts.currency}`)}${kv('Transaction ID', opts.txnCode)}${p('Open Safeeely to accept or decline the request.')}`, `${reviewsUrl()}/withdraw/${encodeURIComponent(opts.safetag)}?continue=${opts.txnId}`, '✅ View & Respond')
    }).catch(() => {});
}

// 16. Transaction declined — notify the initiator
export function sendTransactionDeclinedEmail(to: string, opts: { safetag: string; declinerTag: string; product: string; amount: number; currency: string; txnCode: string }) {
    sendEmail({
        to, subject: `Your transaction request was declined`,
        html: wrap('Transaction Declined ❌', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(`<b>${opts.declinerTag}</b> has declined your transaction request for <b>${opts.product}</b>.`)}${kv('Product / Service', opts.product)}${kv('Amount', `${opts.amount.toLocaleString()} ${opts.currency}`)}${kv('Transaction ID', opts.txnCode)}${p('You can reach out to them directly or create a new transaction with updated terms.')}`, `${reviewsUrl()}/trade`, '🛒 Create New Transaction')
    }).catch(() => {});
}

// 17. Payment reminder — buyer hasn't paid after acceptance
export function sendPaymentReminderEmail(to: string, opts: { safetag: string; sellerTag: string; product: string; amount: number; currency: string; txnId: string; txnCode: string; nudge: 'first' | 'final' }) {
    const isFinal = opts.nudge === 'final';
    sendEmail({
        to, subject: `${isFinal ? '⚠️ Final reminder' : 'Action needed'} — your payment for ${opts.product} is pending`,
        html: wrap(`Payment ${isFinal ? 'Overdue ⚠️' : 'Reminder 💳'}`, `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(isFinal ? `Your payment for <b>${opts.product}</b> has been pending for over 24 hours. Please pay now to keep the deal alive — <b>@${opts.sellerTag}</b> is waiting.` : `Your deal for <b>${opts.product}</b> with <b>@${opts.sellerTag}</b> was accepted but payment hasn't been made yet. Pay now to lock in your escrow.`)}${kv('Product / Service', opts.product)}${kv('Amount Due', `${opts.amount.toLocaleString()} ${opts.currency}`)}${kv('Transaction', opts.txnCode)}`, `${reviewsUrl()}/pay/${opts.txnId}`, '💳 Pay Now')
    }).catch(() => {});
}

// 18. Seller acceptance reminder — seller hasn't responded to a transaction request
export function sendSellerAcceptanceReminderEmail(to: string, opts: { safetag: string; buyerTag: string; product: string; amount: number; currency: string; txnId: string; txnCode: string }) {
    sendEmail({
        to, subject: `Pending transaction request — ${opts.product} from ${opts.buyerTag}`,
        html: wrap('Transaction Request Pending ⏳', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(`You have a pending transaction request from <b>${opts.buyerTag}</b> for <b>${opts.product}</b> that needs your response.`)}${kv('Product / Service', opts.product)}${kv('Amount', `${opts.amount.toLocaleString()} ${opts.currency}`)}${kv('Transaction', opts.txnCode)}${p('Please accept or decline so the buyer knows where things stand.')}`, `${reviewsUrl()}/withdraw/${encodeURIComponent(opts.safetag)}?continue=${opts.txnId}`, '✅ View Request')
    }).catch(() => {});
}

// 19. Receipt confirmation reminder — buyer hasn't confirmed after delivery
export function sendReceiptConfirmationReminderEmail(to: string, opts: { safetag: string; sellerTag: string; product: string; txnId: string; txnCode: string; nudge: 'first' | 'final' }) {
    const isFinal = opts.nudge === 'final';
    sendEmail({
        to, subject: `${isFinal ? 'Urgent: ' : ''}Please confirm you received ${opts.product}`,
        html: wrap(`Confirm Receipt ${isFinal ? '⚠️' : '📬'}`, `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(isFinal ? `<b>@${opts.sellerTag}</b> has been waiting ${isFinal ? '5 days' : '48 hours'} for you to confirm receipt of <b>${opts.product}</b>. Funds are held in escrow until you respond.` : `<b>@${opts.sellerTag}</b> marked <b>${opts.product}</b> as delivered. Have you received it? Please confirm so funds can be released.`)}${kv('Transaction', opts.txnCode)}`, `${reviewsUrl()}/dashboard/transactions/${opts.txnId}`, '✅ Confirm Receipt')
    }).catch(() => {});
}

// 20. Seller delivery reminder — seller hasn't marked delivery complete
export function sendSellerDeliveryReminderEmail(to: string, opts: { safetag: string; buyerTag: string; product: string; txnId: string; txnCode: string; nudge: 'first' | 'final' }) {
    const isFinal = opts.nudge === 'final';
    sendEmail({
        to, subject: `${isFinal ? 'Urgent: ' : 'Reminder — '}your buyer is waiting for ${opts.product}`,
        html: wrap(`Delivery Reminder ${isFinal ? '⚠️' : '📦'}`, `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(isFinal ? `It's been 7 days since <b>${opts.buyerTag}</b> paid for <b>${opts.product}</b>. Please deliver and mark the order complete — delayed delivery risks a dispute.` : `<b>${opts.buyerTag}</b> has paid for <b>${opts.product}</b> and is waiting for delivery. Please fulfil the order and mark it complete.`)}${kv('Transaction', opts.txnCode)}`, `${reviewsUrl()}/dashboard/transactions/${opts.txnId}`, '✅ Mark as Delivered')
    }).catch(() => {});
}

// 21. Onboarding day 1 — no transactions yet
export function sendOnboardingDay1Email(to: string, opts: { safetag: string; firstName: string }) {
    sendEmail({
        to, subject: `Your Safeeely account is live — make your first trade`,
        html: wrap('Your account is ready 🎉', `${p(`Hi <b>${opts.firstName}</b>,`)}${p(`Your Safetag <b>${opts.safetag}</b> is live and ready to use. Here's how to make your first secure trade in 60 seconds:`)}${p('<b>1.</b> Open Safeeely and tap "Create Transaction"<br><b>2.</b> Choose buyer or seller<br><b>3.</b> Enter the product and amount<br><b>4.</b> Share your Safetag with your trading partner')}${p('Thousands of traders use Safeeely to protect their money every day — join them!')}`, `${reviewsUrl()}/trade`, '🛒 Create My First Trade')
    }).catch(() => {});
}

// 22. Onboarding day 3 — share safetag prompt
export function sendOnboardingDay3Email(to: string, opts: { safetag: string; firstName: string }) {
    sendEmail({
        to, subject: `Share your Safetag and start trading securely`,
        html: wrap('Share Your Safetag 📢', `${p(`Hi <b>${opts.firstName}</b>,`)}${p(`Your Safetag <b>${opts.safetag}</b> is your identity on Safeeely. When buyers or sellers see it, they know the deal is protected.`)}${p('Drop your Safetag in your bio, WhatsApp status, or DMs to start getting secure trade requests.')}${kv('Your Profile Link', `${reviewsUrl()}/reviews/${encodeURIComponent(opts.safetag)}`)}`, `${reviewsUrl()}/trade`, '🛒 Start a Trade')
    }).catch(() => {});
}

// 23. Onboarding day 7 — urgency / social proof
export function sendOnboardingDay7Email(to: string, opts: { safetag: string; firstName: string }) {
    sendEmail({
        to, subject: `Don't get scammed — protect your next deal with Safeeely`,
        html: wrap("Don't lose money on your next deal 🛡️", `${p(`Hi <b>${opts.firstName}</b>,`)}${p('Every day, people lose money to scams on social media. Safeeely exists so that doesn\'t happen to you.')}${p('<b>Here\'s how it works:</b> The buyer pays into escrow. You deliver. The buyer confirms. Funds are released. Zero risk for both sides.')}${p('Your account is ready. Start your first protected trade today.')}`, `${reviewsUrl()}/trade`, '🛒 Create Your First Trade')
    }).catch(() => {});
}

// 24. KYC nudge — 7 days after registration
export function sendKycNudgeEmail(to: string, opts: { safetag: string; firstName: string }) {
    sendEmail({
        to, subject: `Verify your identity to unlock full access`,
        html: wrap('Unlock Full Access 🛡️', `${p(`Hi <b>${opts.firstName}</b>,`)}${p('Verifying your identity on Safeeely unlocks:')}${p('✅ Higher transaction limits<br>✅ The Verified badge — buyers trust verified sellers more<br>✅ Priority dispute resolution')}${p('It takes less than 2 minutes. Open the Safeeely app and go to Settings → KYC Verification.')}`, `${reviewsUrl()}/kyc`, '🛡️ Verify My Identity')
    }).catch(() => {});
}

// 25. Referral signup alert — someone joined via your link
export function sendReferralSignupEmail(to: string, opts: { referrerSafetag: string; newUserFirstName: string; totalReferrals: number }) {
    sendEmail({
        to, subject: `${opts.newUserFirstName} just joined Safeeely using your invite link!`,
        html: wrap('New Referral! 🎉', `${p(`Hi <b>@${opts.referrerSafetag}</b>,`)}${p(`<b>${opts.newUserFirstName}</b> just joined Safeeely using your invite link!`)}${kv('Total Referrals', String(opts.totalReferrals))}${p("You'll earn commission every time they complete a secure transaction. Keep sharing your link to grow your passive income!")}`, `${reviewsUrl()}/dashboard`, '👥 View My Referrals')
    }).catch(() => {});
}

// 26. Referral milestone celebration
export function sendReferralMilestoneEmail(to: string, opts: { safetag: string; milestone: number; earningsSummary: string }) {
    sendEmail({
        to, subject: `You just hit ${opts.milestone} referrals on Safeeely!`,
        html: wrap(`${opts.milestone} Referrals! 🏆`, `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(`You just hit <b>${opts.milestone} referral${opts.milestone > 1 ? 's' : ''}</b> on Safeeely! You're in the top tier of our referrers.`)}${p(`<b>Earnings so far:</b> ${opts.earningsSummary}`)}${p('Keep sharing your link — the more people you bring in, the more you earn for life.')}`, `${reviewsUrl()}/dashboard`, '💰 View Earnings')
    }).catch(() => {});
}

// 27. Monthly referral summary
export function sendMonthlyReferralSummaryEmail(to: string, opts: { safetag: string; month: string; referralCount: number; earningsSummary: string; referralLink: string }) {
    sendEmail({
        to, subject: `Your Safeeely referral report — ${opts.month}`,
        html: wrap(`Referral Report — ${opts.month} 📊`, `${p(`Hi <b>@${opts.safetag}</b>,`)}${kv('Referrals this month', String(opts.referralCount))}${kv('Commission earned', opts.earningsSummary)}${p('Keep sharing your link to grow your passive income every month.')}${kv('Your referral link', opts.referralLink)}`, `${reviewsUrl()}/dashboard`, '💸 Withdraw Earnings')
    }).catch(() => {});
}

// 28. 30-day re-engagement
export function sendReEngagementEmail(to: string, opts: { safetag: string; firstName: string; hasTraded: boolean; daysSinceActive: number }) {
    const body = opts.hasTraded
        ? `${p(`Hi <b>${opts.firstName}</b>,`)}${p(`You haven't been active on Safeeely in <b>${opts.daysSinceActive} days</b>. Are you looking to buy or sell something?`)}${p(`Your Safetag <b>${opts.safetag}</b> is still live and secure. Your reputation and balance are waiting for you.`)}`
        : `${p(`Hi <b>${opts.firstName}</b>,`)}${p('You signed up for Safeeely but haven\'t made your first trade yet.')}${p('Safeeely protects your money on every online deal. No registration fee. No hidden charges. Just secure escrow for social media trades.')}`;
    sendEmail({
        to, subject: `We miss you — ${opts.safetag} is ready when you are`,
        html: wrap(opts.hasTraded ? 'Welcome Back 👋' : 'Still thinking about it? 💡', body, `${reviewsUrl()}/trade`, '🛒 Start a Trade')
    }).catch(() => {});
}

// 29. Balance withdrawal nudge
export function sendBalanceNudgeEmail(to: string, opts: { safetag: string; firstName: string; balanceSummary: string }) {
    sendEmail({
        to, subject: `You have money waiting in your Safeeely balance`,
        html: wrap('Withdraw Your Earnings 💰', `${p(`Hi <b>${opts.firstName}</b>,`)}${p(`You have funds sitting in your Safeeely balance — ready to withdraw to your bank or wallet.`)}${kv('Available Balance', opts.balanceSummary)}${p('Withdrawals are processed within 24 hours.')}`, `${reviewsUrl()}/dashboard`, '💸 Withdraw Now')
    }).catch(() => {});
}
