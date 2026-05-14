import { supabase } from '@safepal/shared';
import type { ActiveSOP } from '../types';
import { BOOTSTRAP_SOPS } from '../config/seedSops';

export async function loadActiveSops(disputeType: string, agentScope: string, limit = 10): Promise<ActiveSOP[]> {
    const { data, error } = await supabase
        .from('dispute_sops')
        .select('id, sop_code, title, rule_body, severity, applies_to_agent')
        .in('dispute_type', [disputeType, 'GLOBAL'])
        .in('applies_to_agent', [agentScope, 'ALL'])
        .eq('status', 'ACTIVE')
        .order('priority', { ascending: false })
        .limit(limit);

    if (error) {
        console.warn('⚠️ Could not load active SOPs:', error.message);
        return [];
    }

    return (data || []) as ActiveSOP[];
}

export async function recordSopHit(sopCodes: string[]): Promise<void> {
    if (!sopCodes || sopCodes.length === 0) return;
    const now = new Date().toISOString();
    // Update last_hit_at — hit_count atomic increment requires a DB function (Phase 3)
    for (const code of sopCodes) {
        await supabase
            .from('dispute_sops')
            .update({ last_hit_at: now })
            .eq('sop_code', code)
            .eq('status', 'ACTIVE');
    }
}

export async function seedBootstrapSops(): Promise<void> {
    console.log('🌱 Seeding bootstrap SOPs...');
    for (const sop of BOOTSTRAP_SOPS) {
        const { error } = await supabase
            .from('dispute_sops')
            .upsert(sop, { onConflict: 'sop_code', ignoreDuplicates: true });
        if (error) console.error(`❌ Failed to seed SOP ${sop.sop_code}:`, error.message);
    }
    console.log(`✅ Seeded ${BOOTSTRAP_SOPS.length} bootstrap SOPs`);
}
