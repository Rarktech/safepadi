import * as dotenv from 'dotenv';
import path from 'path';
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

Sentry.init({
    dsn: process.env.SENTRY_DSN_API,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
});

import { shutdownPostHog } from './lib/posthog';

// Fail fast on missing secrets — never allow the server to start insecurely
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET env var is not set or is too short (min 32 chars). Refusing to start.');
    process.exit(1);
}

console.log(`📡 API Starting up...`);
console.log(`🔗 API_URL: ${process.env.API_URL || 'Not Set'}`);
console.log(`🔗 DATABASE_URL: ${process.env.SUPABASE_URL || 'Not Set'}`);
console.log(`🔑 BOT_API_SECRET: ${process.env.BOT_API_SECRET ? process.env.BOT_API_SECRET.substring(0, 8) + '...' : 'NOT SET — magic links will fail'}`);

import cron from 'node-cron';
import { runWeeklyDigest } from './cron/weeklyDigest';
import { runLicenseExpiryCheck } from './cron/licenseExpiry';
import { runTransactionReminders, runPayoutReconciliation } from './cron/transactionReminders';
import { runOnboardingDrip } from './cron/onboardingDrip';
import { runReEngagement } from './cron/reEngagement';
import { runMonthlyReferralSummary } from './cron/referralSummary';
import { runDisputeEnforcement } from './cron/disputeEnforcement';
import { runFraudEnforcement } from './cron/fraudEnforcement';
import { supabase } from '@safepal/shared';
import { createApp } from './createApp';

async function logCronRun(jobName: string, fn: () => Promise<void>): Promise<void> {
    const startedAt = new Date().toISOString();
    let status = 'SUCCESS';
    let errorMessage: string | undefined;
    try {
        await fn();
    } catch (err: any) {
        status = 'ERROR';
        errorMessage = (err as Error).message;
    }
    supabase.from('cron_run_history').insert({
        job_name: jobName,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        status,
        records_processed: 0,
        error_message: errorMessage,
    }).then(undefined, () => {});
}

const app = createApp();
const PORT = process.env.PORT || 3000;

// Warn at startup if no bot secrets are configured — magic link generation will fail silently
const BOT_PLATFORMS = ['TELEGRAM', 'DISCORD', 'WHATSAPP', 'INSTAGRAM', 'APPLE', 'MESSENGER'];
const missingPlatformSecrets = BOT_PLATFORMS.filter(p => !process.env[`BOT_SHARED_SECRET_${p}`]);
if (!process.env.BOT_API_SECRET && missingPlatformSecrets.length === BOT_PLATFORMS.length) {
    console.warn('⚠️  WARNING: No bot secrets configured. Magic link generation will fail for all bots.');
    console.warn('   Set BOT_API_SECRET in this service\'s environment variables (same value as in bot services).');
    console.warn('   Diagnose at: GET /api/auth/magic-link/health');
} else if (!process.env.BOT_API_SECRET) {
    console.log(`ℹ️  BOT_API_SECRET not set — using platform-specific secrets. Missing: ${missingPlatformSecrets.join(', ') || 'none'}`);
}

Sentry.setupExpressErrorHandler(app);

// Weekly group earnings digest — every Monday at 9:00 AM UTC
cron.schedule('0 9 * * 1', () => {
    logCronRun('weekly_digest', () => runWeeklyDigest());
});

// Daily license expiry check — 8:00 AM UTC
cron.schedule('0 8 * * *', () => {
    logCronRun('license_expiry', () => runLicenseExpiryCheck());
});

// Transaction lifecycle reminders — every 2 hours
cron.schedule('0 */2 * * *', () => {
    logCronRun('transaction_reminders', () => runTransactionReminders());
});

// Onboarding drip — daily at 10:00 AM UTC
cron.schedule('0 10 * * *', () => {
    logCronRun('onboarding_drip', () => runOnboardingDrip());
});

// Re-engagement + balance nudge — daily at 11:00 AM UTC
cron.schedule('0 11 * * *', () => {
    logCronRun('re_engagement', () => runReEngagement());
});

// Monthly referral summary — 1st of month at 9:00 AM UTC
cron.schedule('0 9 1 * *', () => {
    logCronRun('referral_summary', () => runMonthlyReferralSummary());
});

// Dispute evidence deadline enforcement — every 10 minutes
cron.schedule('*/10 * * * *', () => {
    logCronRun('dispute_enforcement', () => runDisputeEnforcement());
});

// Fraud enforcement — flag/block bad actors every 6 hours
cron.schedule('0 */6 * * *', () => {
    logCronRun('fraud_enforcement', () => runFraudEnforcement());
});

// Payout reconciliation — re-query stale PROCESSING withdrawals every 4 hours
cron.schedule('0 */4 * * *', () => {
    logCronRun('payout_reconciliation', () => runPayoutReconciliation());
});

app.listen(PORT, () => {
    console.log(`Safeeely API is running on port ${PORT}`);
});

process.on('SIGTERM', () => {
    shutdownPostHog().catch(() => {});
});
