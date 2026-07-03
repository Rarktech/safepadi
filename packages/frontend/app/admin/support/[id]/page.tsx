'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, User, Clock, History, CheckCircle2, UserCheck, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function AdminSupportTicketPage() {
    const { id } = useParams();
    const router = useRouter();
    const [ticket, setTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [showReassign, setShowReassign] = useState(false);
    const [availableAdmins, setAvailableAdmins] = useState<any[]>([]);
    const [reassignAdminId, setReassignAdminId] = useState('');
    const [reassignLoading, setReassignLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTicketData();
        const interval = setInterval(fetchTicketData, 5000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchTicketData = async () => {
        try {
            const res = await api.get(`/admin/support/${id}`);
            setTicket(res.data);
            setMessages(res.data.messages || []);
            setAssignments(res.data.assignments || []);
            setLoading(false);
        } catch {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (showReassign && availableAdmins.length === 0) {
            api.get('/admin/management/workload').then(r => setAvailableAdmins(r.data || [])).catch(() => {});
        }
    }, [showReassign]);

    const sendReply = async () => {
        if (!message.trim()) return;
        setSending(true);
        try {
            const res = await api.post(`/admin/support/${id}/reply`, { content: message.trim() });
            setMessages(prev => [...prev, res.data]);
            setMessage('');
        } catch {
            toast.error('Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const reassignTicket = async () => {
        if (!reassignAdminId) { toast.error('Select an admin'); return; }
        setReassignLoading(true);
        try {
            await api.patch(`/admin/support/${id}/assign`, { admin_id: reassignAdminId, reason: 'MANUAL_REASSIGN' });
            toast.success('Ticket reassigned');
            setShowReassign(false);
            setReassignAdminId('');
            fetchTicketData();
        } catch {
            toast.error('Reassignment failed');
        } finally {
            setReassignLoading(false);
        }
    };

    const resolveTicket = async () => {
        if (!window.confirm('Mark this ticket as resolved?')) return;
        try {
            await api.post(`/admin/support/${id}/resolve`, {});
            toast.success('Ticket resolved');
            fetchTicketData();
        } catch {
            toast.error('Failed to resolve ticket');
        }
    };

    const reopenTicket = async () => {
        if (!window.confirm('Reopen this ticket?')) return;
        try {
            await api.post(`/admin/support/${id}/reopen`, {});
            toast.success('Ticket reopened');
            fetchTicketData();
        } catch {
            toast.error('Failed to reopen ticket');
        }
    };

    if (loading || !ticket) {
        return (
            <div style={{ height: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div className="w-8 h-8 border-[2.5px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
                    <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Loading ticket…</p>
                </div>
            </div>
        );
    }

    const IT: React.CSSProperties = { fontFamily: "'Inter Tight',sans-serif" };
    const isOpen = ticket.status === 'OPEN';
    const statusChip = isOpen ? 'chip-amber' : ticket.status === 'HANDLED_EXTERNALLY' ? 'chip-blue' : 'chip-green';
    const statusLabel = ticket.status === 'HANDLED_EXTERNALLY' ? 'Resolved (Live Chat)' : ticket.status;
    const assignedAdmin = ticket.metadata?.assigned_admin || ticket.assigned_admin;

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
            {/* ── Sticky header bar ── */}
            <header style={{ background: '#fff', borderBottom: '1px solid #e9eaec', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => router.push('/admin/support')}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: '600', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                        className="hover:text-[#0f172a] transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Support
                    </button>
                    <span style={{ color: '#d1d5db' }}>›</span>
                    <code style={{ ...IT, fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>#{ticket.id.slice(0, 8)}</code>
                    <span className={`adm-chip ${statusChip}`}>{statusLabel}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => setShowReassign(true)}
                        style={{ height: '34px', padding: '0 14px', borderRadius: '9px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', border: '1px solid #e9eaec', background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserCheck className="w-3.5 h-3.5" /> Reassign
                    </button>
                    {isOpen && (
                        <button onClick={resolveTicket}
                            style={{ height: '34px', padding: '0 14px', borderRadius: '9px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', border: 'none', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                        </button>
                    )}
                    {ticket.status === 'RESOLVED' && (
                        <button onClick={reopenTicket}
                            style={{ height: '34px', padding: '0 14px', borderRadius: '9px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', border: '1px solid #e9eaec', background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <RotateCcw className="w-3.5 h-3.5" /> Reopen
                        </button>
                    )}
                </div>
            </header>

            {/* ── 2-column body ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '14px', padding: '14px 20px', flex: 1, minHeight: 0, overflow: 'hidden' }}>

                {/* ═══ LEFT PANEL ═══ */}
                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '14px' }}>

                    <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
                        <p style={{ ...IT, fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>Ticket Overview</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                            {([
                                { label: 'Ticket ID', value: <code style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>#{ticket.id.slice(0, 12)}</code> },
                                { label: 'User', value: <span style={{ fontSize: '11.5px', color: '#0f172a', fontWeight: '600' }}>{ticket.profile?.safetag || ticket.safetag || '—'}</span> },
                                { label: 'Platform', value: <span style={{ fontSize: '11.5px', color: '#0f172a', fontWeight: '500', textTransform: 'capitalize' }}>{ticket.origin_platform}</span> },
                                { label: 'Opened', value: <span style={{ fontSize: '11.5px', color: '#0f172a', fontWeight: '500' }}>{new Date(ticket.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span> },
                            ] as Array<{ label: string; value: React.ReactNode }>).map(row => (
                                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '500', color: '#94a3b8' }}>{row.label}</span>
                                    {row.value}
                                </div>
                            ))}
                        </div>
                        {ticket.trigger_phrase && (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                                <p style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>Trigger</p>
                                <p style={{ fontSize: '11.5px', color: '#475569', fontStyle: 'italic' }}>"{ticket.trigger_phrase}"</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
                        <p style={{ ...IT, fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>Assigned Admin</p>
                        {assignedAdmin ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#fafafa', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                                <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#059669', flexShrink: 0 }}>
                                    {(assignedAdmin.name || '?').slice(0, 2).toUpperCase()}
                                </div>
                                <p style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{assignedAdmin.name}</p>
                            </div>
                        ) : (
                            <p style={{ fontSize: '11.5px', color: '#94a3b8' }}>Not yet assigned</p>
                        )}
                    </div>

                    {assignments.length > 0 && (
                        <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
                            <p style={{ ...IT, fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <History className="w-3.5 h-3.5" /> Assignment History
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {assignments.map((a: any) => (
                                    <div key={a.id} style={{ fontSize: '11px', color: '#64748b' }}>
                                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{a.assigned_to?.name || '—'}</span>
                                        {' '}({a.reason === 'AUTO_ROUTE' ? 'auto-routed' : 'manually assigned'})
                                        {a.assigned_by?.name && <> by {a.assigned_by.name}</>}
                                        <div style={{ color: '#94a3b8' }}>{new Date(a.assigned_at).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ═══ CENTER — CHAT ═══ */}
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e9eaec', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: '100%', borderTop: '1px solid #f3f4f6' }} />
                                </div>
                                <span style={{ position: 'relative', background: '#fff', padding: '4px 14px', borderRadius: '999px', fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.15em', border: '1px solid #f3f4f6' }}>
                                    Ticket opened · {new Date(ticket.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            {messages.map((msg: any) => {
                                if (msg.sender_type === 'SYSTEM') {
                                    return (
                                        <div key={msg.id} style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
                                            <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '10.5px', fontWeight: '600', padding: '4px 12px', borderRadius: '999px' }}>{msg.content}</span>
                                        </div>
                                    );
                                }
                                const isSelf = msg.sender_type === 'ADMIN';
                                return (
                                    <div key={msg.id} style={{ display: 'flex', gap: '10px', flexDirection: isSelf ? 'row-reverse' : 'row' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isSelf ? '#10b981' : '#f1f5f9', color: isSelf ? '#fff' : '#64748b' }}>
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: '700', color: '#0f172a' }}>{isSelf ? 'You (Support)' : (ticket.profile?.safetag || ticket.safetag || 'User')}</span>
                                                <span style={{ fontSize: '9px', color: '#cbd5e1' }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div style={{ padding: '12px 16px', borderRadius: '14px', fontSize: '13px', lineHeight: '1.5', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
                                                ...(isSelf ? { background: '#10b981', color: '#fff', borderTopRightRadius: '4px' } : { background: '#f8fafc', color: '#475569', borderTopLeftRadius: '4px', border: '1px solid #f1f5f9' }) }}>
                                                <div className="markdown-content"><ReactMarkdown>{msg.content || ''}</ReactMarkdown></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {isOpen && (
                        <div style={{ borderTop: '1px solid #f3f4f6', padding: '14px 18px', flexShrink: 0, background: '#fff' }}>
                            <div style={{ background: '#f8fafc', border: '1.5px solid #e9eaec', borderRadius: '12px', overflow: 'hidden' }} className="focus-within:border-[#10b981] transition-colors">
                                <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                                    placeholder="Reply to this user…"
                                    style={{ width: '100%', padding: '12px 14px', fontSize: '13px', fontWeight: '500', color: '#0f172a', background: 'transparent', outline: 'none', resize: 'none', minHeight: '68px' }} />
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 12px', borderTop: '1px solid #f3f4f6' }}>
                                    <button onClick={sendReply} disabled={sending || !message.trim()}
                                        style={{ height: '30px', padding: '0 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: sending || !message.trim() ? 'not-allowed' : 'pointer', border: 'none', background: sending || !message.trim() ? '#e2e8f0' : '#10b981', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Send className="w-3 h-3" /> Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Reassign modal ── */}
            {showReassign && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowReassign(false)}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '360px' }} onClick={e => e.stopPropagation()}>
                        <p style={{ ...IT, fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>Reassign Ticket</p>
                        <select value={reassignAdminId} onChange={e => setReassignAdminId(e.target.value)}
                            style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1.5px solid #e9eaec', padding: '0 10px', fontSize: '13px', marginBottom: '16px' }}>
                            <option value="">Select an admin…</option>
                            {availableAdmins.map((a: any) => (
                                <option key={a.id} value={a.id}>{a.name} ({a.open_case_count ?? a.cases_resolved ?? 0} cases)</option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowReassign(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e9eaec', background: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={reassignTicket} disabled={reassignLoading} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                                {reassignLoading ? 'Reassigning…' : 'Reassign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
