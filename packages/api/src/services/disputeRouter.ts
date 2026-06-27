import { supabase } from '@safepal/shared';
import { sendAdminCaseAssignmentEmail } from './email';

function mapDisputeTypeToCategory(disputeType: string): string {
    const SOCIAL_ACCOUNTS = [
        'INSTAGRAM_ACCOUNT', 'DISCORD_ACCOUNT', 'TELEGRAM_ACCOUNT', 'GMAIL_ACCOUNT',
        'TWITTER_ACCOUNT', 'TIKTOK_ACCOUNT', 'YOUTUBE_CHANNEL', 'FACEBOOK_ACCOUNT', 'GAMING_ACCOUNT',
    ];
    const FREELANCE = [
        'FREELANCE_CODE', 'FREELANCE_DESIGN', 'FREELANCE_WRITING', 'FREELANCE_VIDEO',
        'FREELANCE_MUSIC', 'FREELANCE_CONSULTING', 'SOCIAL_SERVICE', 'INFLUENCER_DEAL',
        'EDUCATION_SERVICE', 'DOMAIN_WEBSITE', 'CONSTRUCTION_SERVICE',
    ];
    const NON_DELIVERY = ['DIGITAL_DOWNLOAD', 'EVENT_BOOKING', 'TICKET_RESERVATION', 'DISPATCH_DELIVERY'];
    const QUALITY = ['ELECTRONICS_GADGET', 'VEHICLE_SALE', 'LUXURY_GOODS', 'FASHION_GOODS', 'PHYSICAL_GOODS', 'REAL_ESTATE'];
    const CRYPTO = ['CRYPTO_TO_GOODS'];

    if (SOCIAL_ACCOUNTS.includes(disputeType)) return 'FRAUD';
    if (FREELANCE.includes(disputeType)) return 'SERVICE_ISSUE';
    if (NON_DELIVERY.includes(disputeType)) return 'NON_DELIVERY';
    if (QUALITY.includes(disputeType)) return 'QUALITY_ISSUE';
    if (CRYPTO.includes(disputeType)) return 'CRYPTO';
    return 'GENERAL';
}

const SPECIALTY_MAP: Record<string, string[]> = {
    FRAUD:         ['fraud', 'security'],
    NON_DELIVERY:  ['logistics', 'ecommerce', 'non_delivery'],
    QUALITY_ISSUE: ['product', 'ecommerce'],
    SERVICE_ISSUE: ['freelance', 'digital_goods', 'service_issue'],
    CRYPTO:        ['crypto'],
    GENERAL:       ['general'],
};

export interface SpecialistSnapshot {
    id: string;
    name: string;
    specialist_title: string | null;
    specialist_bio: string | null;
    specialties: string[];
    cases_resolved: number;
    years_on_platform: number;
}

export async function routeDispute(
    disputeId: string,
    disputeType: string | null
): Promise<SpecialistSnapshot | null> {
    // Fetch current dispute state — idempotency check + type resolution
    const { data: currentDispute } = await supabase
        .from('disputes')
        .select('assigned_admin_id, dispute_type, metadata')
        .eq('id', disputeId)
        .single();

    // Already assigned — return existing snapshot without re-routing
    if (currentDispute?.assigned_admin_id) {
        return currentDispute.metadata?.assigned_specialist || null;
    }

    // Resolve dispute type: prefer explicit param, fallback to DB value
    const resolvedType = disputeType || currentDispute?.dispute_type || 'GENERIC';
    const category = mapDisputeTypeToCategory(resolvedType);
    const targets = SPECIALTY_MAP[category] ?? SPECIALTY_MAP['GENERAL'];

    const { data: allAdmins } = await supabase
        .from('admin_users')
        .select('id, name, email, specialist_title, specialist_bio, specialties, cases_resolved, years_on_platform')
        .eq('status', 'ACTIVE');

    if (!allAdmins || allAdmins.length === 0) return null;

    // Get current open case counts per admin for workload balancing
    const { data: openCases } = await supabase
        .from('disputes')
        .select('assigned_admin_id')
        .eq('status', 'OPEN')
        .not('assigned_admin_id', 'is', null);

    const openCountMap: Record<string, number> = {};
    for (const row of (openCases || [])) {
        if (row.assigned_admin_id) {
            openCountMap[row.assigned_admin_id] = (openCountMap[row.assigned_admin_id] || 0) + 1;
        }
    }

    // Score: specialty match (+10), fewest open cases (negative load), most experience (tiebreak)
    const scored = allAdmins.map((a: any) => {
        const hasSpecialty = Array.isArray(a.specialties) &&
            a.specialties.some((s: string) => targets.includes(s.toLowerCase()));
        const openLoad = openCountMap[a.id] || 0;
        return { admin: a, score: (hasSpecialty ? 10 : 0) - openLoad };
    });

    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.admin.cases_resolved || 0) - (a.admin.cases_resolved || 0);
    });

    const chosen: any = scored[0]?.admin;
    if (!chosen) return null;

    const snapshot: SpecialistSnapshot = {
        id:                chosen.id,
        name:              chosen.name,
        specialist_title:  chosen.specialist_title,
        specialist_bio:    chosen.specialist_bio,
        specialties:       chosen.specialties || [],
        cases_resolved:    chosen.cases_resolved || 0,
        years_on_platform: chosen.years_on_platform || 0,
    };

    const merged = { ...(currentDispute?.metadata || {}), assigned_specialist: snapshot };

    await supabase
        .from('disputes')
        .update({ assigned_admin_id: chosen.id, metadata: merged })
        .eq('id', disputeId);

    // Write assignment audit trail (defensive — table may not exist yet in older envs)
    supabase.from('dispute_assignments').insert({
        dispute_id: disputeId,
        assigned_to: chosen.id,
        assigned_by: null,
        reason: 'AUTO_ROUTE',
    }).then(undefined, () => {});

    // Notify assigned admin by email
    const { data: disputeForEmail } = await supabase
        .from('disputes')
        .select('dispute_type, transaction:transaction_id(amount, currency, pipeline_tier)')
        .eq('id', disputeId)
        .single();

    if (chosen.email && disputeForEmail) {
        const txn = (disputeForEmail as any).transaction;
        const adminPanelUrl = `${process.env.REVIEWS_URL || 'https://safeeely.com'}/admin/disputes/${disputeId}`;
        sendAdminCaseAssignmentEmail(chosen.email, {
            adminName: chosen.name,
            disputeId,
            disputeType: (disputeForEmail as any).dispute_type || 'GENERIC',
            amount: txn?.amount || 0,
            currency: txn?.currency || '',
            pipelineTier: (disputeForEmail as any).pipeline_tier || txn?.pipeline_tier || 'STANDARD',
            adminPanelUrl,
        });
    }

    return snapshot;
}
