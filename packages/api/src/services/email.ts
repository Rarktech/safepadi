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
        await page.setContent(html, { waitUntil: 'networkidle0' });
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
        html: wrap('KYC Rejected ⚠️', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p('Your KYC submission was not approved.')}${kv('Reason', opts.reason)}${p('Please correct the issue and resubmit your documents.')}`, `${reviewsUrl()}/kyc?viewer=${opts.safetag}`, '🔄 Retry KYC')
    }).catch(() => {});
}

// 14. Milestone released
export function sendMilestoneReleasedEmail(to: string, opts: { safetag: string; role: 'buyer' | 'seller'; milestoneTitle: string; milestoneIndex: number; milestoneTotal: number; amount: number; currency: string; txnCode: string; txnId: string }) {
    sendEmail({
        to, subject: `Milestone ${opts.milestoneIndex} of ${opts.milestoneTotal} Released — ${opts.amount} ${opts.currency}`,
        html: wrap('Milestone Released 💰', `${p(`Hi <b>@${opts.safetag}</b>,`)}${p(opts.role === 'seller' ? `Milestone funds have been released to your balance.` : `You have released the funds for milestone <b>${opts.milestoneTitle}</b>.`)}${kv('Milestone', `${opts.milestoneTitle} (${opts.milestoneIndex}/${opts.milestoneTotal})`)}${kv('Amount', `${opts.amount} ${opts.currency}`)}${kv('Transaction', opts.txnCode)}`, `${reviewsUrl()}/dashboard/transactions/${opts.txnId}`, '👁️ View Project')
    }).catch(() => {});
}
