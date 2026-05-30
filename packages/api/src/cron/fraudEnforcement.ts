import { supabase } from '@safepal/shared';
import { routeNotification } from '../services/notifications';

const log = (msg: string) => console.log(`[FraudEnforcement] ${msg}`);

export async function runFraudEnforcement(): Promise<void> {
    log('Starting...');

    // Bucket A: Flag users with 3+ dispute losses (not already flagged/blocked)
    try {
        const { data: highLosers } = await supabase
            .from('profile_reputation')
            .select('profile_id, disputes_lost_count, profiles:profile_id(safetag, is_flagged, is_blocked)')
            .gte('disputes_lost_count', 3)
            .limit(100);

        for (const r of highLosers || []) {
            const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            if (!profile || profile.is_flagged || profile.is_blocked) continue;

            await supabase.from('profiles').update({ is_flagged: true, flagged_at: new Date().toISOString() }).eq('id', r.profile_id);

            await routeNotification(
                r.profile_id,
                `⚠️ <b>Account Under Review</b>\n\nYour account has been flagged for review due to multiple dispute outcomes. Our team will be in touch. If you believe this is an error, please contact support.`
            ).catch(() => {});

            log(`Flagged ${profile.safetag} — dispute losses: ${r.disputes_lost_count}`);
        }
        log(`Bucket A: ${(highLosers || []).length} checked`);
    } catch (e: any) { log(`Bucket A error: ${e.message}`); }

    // Bucket B: Auto-block users flagged for 48h+ with 5+ dispute losses
    try {
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const { data: longFlagged } = await supabase
            .from('profiles')
            .select('id, safetag, flagged_at')
            .eq('is_flagged', true)
            .eq('is_blocked', false)
            .lte('flagged_at', cutoff)
            .limit(50);

        for (const profile of longFlagged || []) {
            // Check dispute loss count
            const { data: rep } = await supabase
                .from('profile_reputation')
                .select('disputes_lost_count')
                .eq('profile_id', profile.id)
                .maybeSingle();

            if (!rep || (rep.disputes_lost_count ?? 0) < 5) continue;

            await supabase.from('profiles').update({ is_blocked: true }).eq('id', profile.id);

            await routeNotification(
                profile.id,
                `🚫 <b>Account Suspended</b>\n\nYour account has been suspended pending a manual review by our trust and safety team.\n\nIf you believe this is an error, please contact support immediately.`
            ).catch(() => {});

            log(`Auto-blocked ${profile.safetag} — flagged for 48h+ with ${rep.disputes_lost_count} dispute losses`);
        }
        log(`Bucket B: ${(longFlagged || []).length} checked`);
    } catch (e: any) { log(`Bucket B error: ${e.message}`); }

    log('Done.');
}
