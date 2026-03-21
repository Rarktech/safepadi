import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendEmail({
    to,
    subject,
    html,
}: {
    to: string;
    subject: string;
    html: string;
}) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ [Email] SMTP credentials not set. Skipping email to:', to);
        return;
    }
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Safeeely" <no-reply@safeeely.com>',
            to,
            subject,
            html,
        });
        console.log(`✅ [Email] Sent "${subject}" to ${to}`);
    } catch (err: any) {
        console.error(`❌ [Email] Failed to send to ${to}:`, err.message);
    }
}
