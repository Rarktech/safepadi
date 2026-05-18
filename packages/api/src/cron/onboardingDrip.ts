import { supabase } from '@safepal/shared';
import { routeNotification } from '../services/notifications';
import { sendOnboardingDay1Email, sendOnboardingDay3Email, sendOnboardingDay7Email, sendKycNudgeEmail } from '../services/email';
import { buildInternalMagicLink } from '../services/magicLinkInternal';

const log = (msg: string) => console.log(`[OnboardingDrip] ${msg}`);

export async function runOnboardingDrip(): Promise<void> {
    log('Starting...');

    // Fetch profiles with no transactions (buyer or seller)
    const hasNoTransactions = async (profileId: string): Promise<boolean> => {
        const [{ count: buyerCount }, { count: sellerCount }] = await Promise.all([
            supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('buyer_id', profileId),
            supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('seller_id', profileId)
        ]);
        return (buyerCount || 0) + (sellerCount || 0) === 0;
    };

    // Day 1 bucket — registered 23-25 hours ago, no transactions
    try {
        const { data: day1Profiles } = await supabase
            .from('profiles')
            .select('id, email, safetag, first_name')
            .lt('created_at', new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString())
            .gt('created_at', new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString());

        let sent = 0;
        for (const profile of day1Profiles || []) {
            if (!(await hasNoTransactions(profile.id))) continue;
            const firstName = profile.first_name || profile.safetag;
            const msg = `👋 <b>Welcome to Safeeely!</b>\n\nYour account is live. Start your first secure trade today — it only takes a minute to set up.\n\n🛡️ Buyers pay into escrow. Sellers deliver. Both sides are protected.`;
            await routeNotification(
                profile.id,
                msg,
                [{ label: '🛒 Start a Trade', customId: 'create_txn' }],
                undefined,
                profile.email ? () => sendOnboardingDay1Email(profile.email, { safetag: profile.safetag, firstName }) : undefined
            ).catch(() => {});
            sent++;
        }
        log(`Day 1: ${sent} messages sent`);
    } catch (e: any) { log(`Day 1 error: ${e.message}`); }

    // Day 3 bucket — registered 71-73 hours ago, no transactions
    try {
        const { data: day3Profiles } = await supabase
            .from('profiles')
            .select('id, email, safetag, first_name')
            .lt('created_at', new Date(Date.now() - 71 * 60 * 60 * 1000).toISOString())
            .gt('created_at', new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString());

        let sent = 0;
        for (const profile of day3Profiles || []) {
            if (!(await hasNoTransactions(profile.id))) continue;
            const firstName = profile.first_name || profile.safetag;
            const msg = `📢 <b>Share Your Safetag!</b>\n\nYour safetag is <code>${profile.safetag}</code>. Share it with anyone you're doing business with online so they can initiate a secure escrow trade with you.`;
            await routeNotification(
                profile.id,
                msg,
                [{ label: '👁️ View My Profile', customId: 'view_profile' }, { label: '🛒 Create a Trade', customId: 'create_txn' }],
                undefined,
                profile.email ? () => sendOnboardingDay3Email(profile.email, { safetag: profile.safetag, firstName }) : undefined
            ).catch(() => {});
            sent++;
        }
        log(`Day 3: ${sent} messages sent`);
    } catch (e: any) { log(`Day 3 error: ${e.message}`); }

    // Day 7 bucket — registered 167-169 hours ago, no transactions
    try {
        const { data: day7Profiles } = await supabase
            .from('profiles')
            .select('id, email, safetag, first_name')
            .lt('created_at', new Date(Date.now() - 167 * 60 * 60 * 1000).toISOString())
            .gt('created_at', new Date(Date.now() - 169 * 60 * 60 * 1000).toISOString());

        let sent = 0;
        for (const profile of day7Profiles || []) {
            if (!(await hasNoTransactions(profile.id))) continue;
            const firstName = profile.first_name || profile.safetag;
            const msg = `🛡️ <b>Don't get scammed.</b>\n\nEvery day, people lose money on social media trades. Safeeely prevents that.\n\nYour account is ready — make your first protected trade today and never worry about being scammed again.`;
            await routeNotification(
                profile.id,
                msg,
                [{ label: '🛒 Create a Trade', customId: 'create_txn' }],
                undefined,
                profile.email ? () => sendOnboardingDay7Email(profile.email, { safetag: profile.safetag, firstName }) : undefined
            ).catch(() => {});
            sent++;
        }
        log(`Day 7: ${sent} messages sent`);
    } catch (e: any) { log(`Day 7 error: ${e.message}`); }

    // KYC nudge — registered 167-169 hours ago with pending KYC
    try {
        const { data: kycProfiles } = await supabase
            .from('profiles')
            .select('id, email, safetag, first_name')
            .lt('created_at', new Date(Date.now() - 167 * 60 * 60 * 1000).toISOString())
            .gt('created_at', new Date(Date.now() - 169 * 60 * 60 * 1000).toISOString())
            .neq('kyc_status', 'VERIFIED');

        let sent = 0;
        for (const profile of kycProfiles || []) {
            const firstName = profile.first_name || profile.safetag;
            const msg = `🔐 <b>Complete Your Identity Verification</b>\n\nVerifying your identity on Safeeely unlocks higher transaction limits, the Verified badge, and priority dispute resolution.\n\nIt takes less than 2 minutes.`;
            const { data: primaryLinked } = await supabase.from('linked_accounts').select('platform, platform_id').eq('profile_id', profile.id).eq('is_primary', true).maybeSingle();
            const kycUrl = primaryLinked
                ? await buildInternalMagicLink({ profileId: profile.id, safetag: profile.safetag, platform: primaryLinked.platform, platformId: primaryLinked.platform_id, scope: 'kyc' })
                : `${process.env.REVIEWS_URL || 'http://localhost:3001'}/kyc`;
            await routeNotification(
                profile.id,
                msg,
                [{ label: '🛡️ Verify Now', url: kycUrl }],
                undefined,
                profile.email ? () => sendKycNudgeEmail(profile.email, { safetag: profile.safetag, firstName }) : undefined
            ).catch(() => {});
            sent++;
        }
        log(`KYC nudge: ${sent} messages sent`);
    } catch (e: any) { log(`KYC nudge error: ${e.message}`); }

    log('Done.');
}
