import axios from 'axios';

const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
const FROM_EMAIL = process.env.SMTP_FROM || '"Safeeely" <info@safeeely.com>';

export async function sendEmail({
    to,
    subject,
    html,
}: {
    to: string;
    subject: string;
    html: string;
}) {
    if (!RESEND_API_KEY) {
        console.warn('⚠️ [Email] RESEND_API_KEY not set. Skipping email to:', to);
        return;
    }
    try {
        await axios.post(
            'https://api.resend.com/emails',
            { from: FROM_EMAIL, to: [to], subject, html },
            {
                headers: {
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            }
        );
        console.log(`✅ [Email] Sent "${subject}" to ${to}`);
    } catch (err: any) {
        console.error(`❌ [Email] Failed to send to ${to}:`, err.response?.data || err.message);
    }
}
