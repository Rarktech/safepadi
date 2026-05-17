import { supabase } from '@safepal/shared';

const SPECIALTY_MAP: Record<string, string[]> = {
    FRAUD:          ['fraud', 'security'],
    NON_DELIVERY:   ['logistics', 'ecommerce'],
    QUALITY_ISSUE:  ['product', 'ecommerce'],
    SERVICE_ISSUE:  ['freelance', 'digital_goods'],
    CRYPTO:         ['crypto'],
    GENERAL:        ['general'],
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
    const targets = SPECIALTY_MAP[disputeType || 'GENERAL'] ?? SPECIALTY_MAP['GENERAL'];

    const { data: allAdmins } = await supabase
        .from('admin_users')
        .select('id, name, specialist_title, specialist_bio, specialties, cases_resolved, years_on_platform')
        .eq('status', 'ACTIVE')
        .order('cases_resolved', { ascending: false });

    if (!allAdmins || allAdmins.length === 0) return null;

    // Prefer a specialist whose specialties overlap the target list
    const matched = allAdmins.find((a: any) =>
        Array.isArray(a.specialties) && a.specialties.some((s: string) => targets.includes(s))
    );
    const chosen: any = matched || allAdmins[0];

    const snapshot: SpecialistSnapshot = {
        id:                chosen.id,
        name:              chosen.name,
        specialist_title:  chosen.specialist_title,
        specialist_bio:    chosen.specialist_bio,
        specialties:       chosen.specialties || [],
        cases_resolved:    chosen.cases_resolved || 0,
        years_on_platform: chosen.years_on_platform || 0,
    };

    // Fetch current metadata and merge specialist snapshot
    const { data: current } = await supabase
        .from('disputes')
        .select('metadata')
        .eq('id', disputeId)
        .single();

    const merged = { ...(current?.metadata || {}), assigned_specialist: snapshot };

    await supabase
        .from('disputes')
        .update({ assigned_admin_id: chosen.id, metadata: merged })
        .eq('id', disputeId);

    return snapshot;
}
