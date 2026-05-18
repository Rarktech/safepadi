import * as dotenv from 'dotenv';
import path from 'path';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

// Fail fast on missing secrets — never allow the server to start insecurely
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET env var is not set or is too short (min 32 chars). Refusing to start.');
    process.exit(1);
}

console.log(`📡 API Starting up...`);
console.log(`🔗 API_URL: ${process.env.API_URL || 'Not Set'}`);
console.log(`🔗 DATABASE_URL: ${process.env.SUPABASE_URL || 'Not Set'}`);

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import profileRoutes from './routes/profiles';
import transactionRoutes from './routes/transactions';
import reviewRoutes from './routes/reviews';
import paymentRoutes from './routes/payments';
import withdrawalRoutes from './routes/withdrawals';
import referralRoutes from './routes/referrals';
import disputeRoutes from './routes/disputes';
import waitlistRoutes from './routes/waitlist';
import receiptRoutes from './routes/receipts';
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import magicLinkRoutes from './routes/magicLink';
import marketplaceRoutes from './routes/marketplace';
import notificationRoutes from './routes/notifications';
import communityRoutes from './routes/communities';
import feedbackRoutes from './routes/feedback';
import cron from 'node-cron';
import { runWeeklyDigest } from './cron/weeklyDigest';
import { runLicenseExpiryCheck } from './cron/licenseExpiry';
import { runTransactionReminders } from './cron/transactionReminders';
import { runOnboardingDrip } from './cron/onboardingDrip';
import { runReEngagement } from './cron/reEngagement';
import { runMonthlyReferralSummary } from './cron/referralSummary';
import { runDisputeEnforcement } from './cron/disputeEnforcement';

const app = express();
const PORT = process.env.PORT || 3000;

const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3001,http://127.0.0.1:3001')
    .split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server calls (no origin) and whitelisted origins
        if (!origin || CORS_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json({
    verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
    }
}));

app.use((req, res, next) => {
    console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.send('Safeeely API is live. Check /health for status.');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/debug-version', (req, res) => {
    res.json({ version: '1.0.2-admin-ready', timestamp: new Date().toISOString() });
});

// Redirect frontend pages landing on the API server
const FRONTEND_ROUTES = ['/kyc', '/pay', '/payout', '/reviews', '/admin'];
FRONTEND_ROUTES.forEach(route => {
    app.get(route, (req, res) => {
        const frontendUrl = process.env.REVIEWS_URL || 'http://localhost:3001';
        const qs = new URLSearchParams(req.query as any).toString();
        res.redirect(`${frontendUrl}${route}${qs ? '?' + qs : ''}`);
    });
});

app.use('/api/profiles', profileRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/feedback', feedbackRoutes);

// 🔍 Health Check & Diagnostics
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
app.use('/api/auth', authRoutes);
app.use('/api/auth/magic-link', magicLinkRoutes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('🔥 [Critical Server Error]:', err);
    if (!res.headersSent) {
        res.status(500).json({
            error: 'Internal server error',
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Weekly group earnings digest — every Monday at 9:00 AM UTC
cron.schedule('0 9 * * 1', () => {
    runWeeklyDigest().catch((err) => console.error('Weekly digest cron failed:', err));
});

// Daily license expiry check — 8:00 AM UTC
cron.schedule('0 8 * * *', () => {
    runLicenseExpiryCheck().catch((err) => console.error('License expiry cron failed:', err));
});

// Transaction lifecycle reminders — every 2 hours
cron.schedule('0 */2 * * *', () => {
    runTransactionReminders().catch((err) => console.error('Transaction reminders cron failed:', err));
});

// Onboarding drip — daily at 10:00 AM UTC
cron.schedule('0 10 * * *', () => {
    runOnboardingDrip().catch((err) => console.error('Onboarding drip cron failed:', err));
});

// Re-engagement + balance nudge — daily at 11:00 AM UTC
cron.schedule('0 11 * * *', () => {
    runReEngagement().catch((err) => console.error('Re-engagement cron failed:', err));
});

// Monthly referral summary — 1st of month at 9:00 AM UTC
cron.schedule('0 9 1 * *', () => {
    runMonthlyReferralSummary().catch((err) => console.error('Monthly referral summary cron failed:', err));
});

// Dispute evidence deadline enforcement — every 10 minutes
cron.schedule('*/10 * * * *', () => {
    runDisputeEnforcement().catch((err) => console.error('Dispute enforcement cron failed:', err));
});

app.listen(PORT, () => {
    console.log(`Safeeely API is running on port ${PORT}`);
});
