import { createClient } from '@supabase/supabase-js';
import { sendReferralNotification } from '../services/notifications';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function runLicenseExpiryCheck(): Promise<void> {
    const now = new Date();

    // 1. 7-day reminders (expires between now+6d and now+7d)
    const in7d = new Date(now.getTime() + 7 * 86400000).toISOString();
    const in6d = new Date(now.getTime() + 6 * 86400000).toISOString();
    const { data: expiring7 } = await supabase
        .from('community_groups')
        .select('id, group_name, admin_profile_id, license_tier, license_expires_at')
        .in('license_tier', ['pro', 'enterprise'])
        .eq('status', 'active')
        .gte('license_expires_at', in6d)
        .lte('license_expires_at', in7d);

    for (const group of expiring7 || []) {
        const { data: shareRow } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', `community_${group.license_tier}_revenue_share`)
            .maybeSingle();
        const share = shareRow?.value ?? (group.license_tier === 'pro' ? '25' : '40');
        const expiryStr = new Date(group.license_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        await sendReferralNotification(
            group.admin_profile_id,
            `⚠️ <b>License Expiring Soon</b>\n\nYour <b>${group.group_name}</b> ${group.license_tier} license expires on <b>${expiryStr}</b> (7 days).\n\nRenew now to keep your <b>${share}%</b> revenue share. Open your bot and tap "My Group" → "Renew License".`,
            `Your community license expires in 7 days`,
            `<p>Your <b>${group.license_tier}</b> license for <b>${group.group_name}</b> expires on <b>${expiryStr}</b>. Renew to keep your ${share}% revenue share.</p>`
        ).catch(() => {});
    }

    // 2. 1-day urgent reminders (expires within next 24h)
    const in1d = new Date(now.getTime() + 86400000).toISOString();
    const { data: expiring1 } = await supabase
        .from('community_groups')
        .select('id, group_name, admin_profile_id, license_tier')
        .in('license_tier', ['pro', 'enterprise'])
        .eq('status', 'active')
        .gte('license_expires_at', now.toISOString())
        .lte('license_expires_at', in1d);

    for (const group of expiring1 || []) {
        await sendReferralNotification(
            group.admin_profile_id,
            `🚨 <b>License Expires Tomorrow!</b>\n\n<b>${group.group_name}</b> — your ${group.license_tier} license expires <b>tomorrow</b>.\n\nRenew now to avoid being moved to Free (10%). Open your bot → "My Group" → "Renew License".`,
            `URGENT: Your community license expires tomorrow`,
            `<p><strong>Your ${group.license_tier} license for ${group.group_name} expires TOMORROW.</strong> Renew immediately.</p>`
        ).catch(() => {});
    }

    // 3. Downgrade expired licenses to Free
    const { data: expired } = await supabase
        .from('community_groups')
        .select('id, group_name, admin_profile_id, license_tier')
        .in('license_tier', ['pro', 'enterprise'])
        .eq('status', 'active')
        .lt('license_expires_at', now.toISOString());

    for (const group of expired || []) {
        await supabase
            .from('community_groups')
            .update({ license_tier: 'free', admin_revenue_share_percent: 10, updated_at: now.toISOString() })
            .eq('id', group.id);

        await sendReferralNotification(
            group.admin_profile_id,
            `❌ <b>License Expired</b>\n\nYour <b>${group.group_name}</b> ${group.license_tier} license has expired. You've been moved to <b>Free</b> (10% revenue share).\n\nRenew anytime from your group dashboard to restore your higher earnings.`,
            `Your community license has expired`,
            `<p>Your <b>${group.license_tier}</b> license for <b>${group.group_name}</b> has expired. Moved to Free (10%).</p>`
        ).catch(() => {});
    }

    console.log(`✅ License expiry check: ${expiring7?.length ?? 0} 7-day warnings, ${expiring1?.length ?? 0} 1-day warnings, ${expired?.length ?? 0} downgrades`);
}
