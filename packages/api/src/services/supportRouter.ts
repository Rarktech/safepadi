import { supabase } from '@safepal/shared';
import { sendAdminSupportTicketAssignedEmail } from './email';

export interface SupportAssigneeSnapshot {
    id: string;
    name: string;
}

// Short, human-quotable ticket code shown in every bot message, notification, and
// email about a ticket — must match the identical formula used independently in
// SupportChatPage.tsx, admin/support/[id]/page.tsx, and SupportTicketsListView.tsx.
export function shortTicketCode(id: string): string {
    return `SUP-${id.slice(0, 4).toUpperCase()}`;
}

/**
 * Assigns a newly created support ticket to an active admin, purely by workload
 * (fewest open tickets, tiebreak by cases_resolved). Unlike disputeRouter.ts's
 * routeDispute(), there is no specialty/category matching — support tickets have
 * no classifier the way dispute types do, so scoring by specialty would always be
 * a no-op here.
 */
export async function routeSupportTicket(ticketId: string): Promise<SupportAssigneeSnapshot | null> {
    const { data: currentTicket } = await supabase
        .from('support_tickets')
        .select('assigned_admin_id, metadata')
        .eq('id', ticketId)
        .single();

    // Already assigned — idempotent, don't re-route
    if (currentTicket?.assigned_admin_id) {
        return currentTicket.metadata?.assigned_admin || null;
    }

    const { data: allAdmins } = await supabase
        .from('admin_users')
        .select('id, name, email, cases_resolved')
        .eq('status', 'ACTIVE');

    if (!allAdmins || allAdmins.length === 0) return null;

    const { data: openTickets } = await supabase
        .from('support_tickets')
        .select('assigned_admin_id')
        .eq('status', 'OPEN')
        .not('assigned_admin_id', 'is', null);

    const loadMap: Record<string, number> = {};
    for (const row of (openTickets || [])) {
        if (row.assigned_admin_id) {
            loadMap[row.assigned_admin_id] = (loadMap[row.assigned_admin_id] || 0) + 1;
        }
    }

    const scored = allAdmins.map((a: any) => ({ admin: a, load: loadMap[a.id] || 0 }));
    scored.sort((a, b) => {
        if (a.load !== b.load) return a.load - b.load;
        return (b.admin.cases_resolved || 0) - (a.admin.cases_resolved || 0);
    });

    const chosen: any = scored[0]?.admin;
    if (!chosen) return null;

    const snapshot: SupportAssigneeSnapshot = { id: chosen.id, name: chosen.name };
    const merged = { ...(currentTicket?.metadata || {}), assigned_admin: snapshot };

    await supabase
        .from('support_tickets')
        .update({ assigned_admin_id: chosen.id, metadata: merged, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

    // Assignment audit trail — defensive in case the table's not migrated yet in an older env
    supabase.from('support_assignments').insert({
        ticket_id: ticketId,
        assigned_to: chosen.id,
        assigned_by: null,
        reason: 'AUTO_ROUTE',
    }).then(undefined, () => {});

    if (chosen.email) {
        const adminPanelUrl = `${process.env.REVIEWS_URL || 'https://safeeely.com'}/admin/support/${ticketId}`;
        sendAdminSupportTicketAssignedEmail(chosen.email, {
            adminName: chosen.name,
            ticketCode: shortTicketCode(ticketId),
            adminPanelUrl,
        });
    }

    return snapshot;
}
