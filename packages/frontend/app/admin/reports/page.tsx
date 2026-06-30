'use client';

import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { Flag, Search, Clock, CheckCircle, XCircle, AlertTriangle, User, ShieldOff, ExternalLink } from 'lucide-react';
import AdminShell from '@/components/admin/AdminShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const H = { 'ngrok-skip-browser-warning': 'true' };

type Report = {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: 'SCAM' | 'FAKE_PROOF' | 'HARASSMENT' | 'OTHER';
  description: string | null;
  transaction_id: string | null;
  status: 'OPEN' | 'REVIEWED' | 'DISMISSED';
  created_at: string;
  reviewed_at: string | null;
  reporter: { safetag: string } | null;
  reported: { safetag: string; is_blocked: boolean; is_flagged: boolean } | null;
};

const REASON_LABELS: Record<string, string> = { SCAM: 'Scam', FAKE_PROOF: 'Fake Proof', HARASSMENT: 'Harassment', OTHER: 'Other' };
const REASON_CHIP: Record<string, { color: string; bg: string }> = {
  SCAM:       { color: '#e11d48', bg: '#fff1f2' },
  FAKE_PROOF: { color: '#d97706', bg: '#fffbeb' },
  HARASSMENT: { color: '#9333ea', bg: '#fdf4ff' },
  OTHER:      { color: '#475569', bg: '#f1f5f9' },
};
const STATUS_CHIP: Record<string, { color: string; bg: string }> = {
  OPEN:      { color: '#d97706', bg: '#fffbeb' },
  REVIEWED:  { color: '#059669', bg: '#f0fdf4' },
  DISMISSED: { color: '#475569', bg: '#f1f5f9' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function trunc(s: string | null | undefined, max: number) { return !s ? '—' : s.length > max ? s.slice(0, max) + '…' : s; }
function safeTag(t: { safetag: string } | null, fallback: string) {
  if (!t) return fallback.slice(0, 8);
  return t.safetag.startsWith('@') ? t.safetag : `@${t.safetag}`;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<Report | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { fetchReports(); }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const statusParam = filter !== 'ALL' ? `?status=${filter}` : '';
      const res = await axios.get(`${API_URL}/reports${statusParam}`, { headers: H });
      setReports(res.data);
    } catch {} finally { setLoading(false); }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const handleUpdateStatus = async (report: Report, status: 'REVIEWED' | 'DISMISSED') => {
    setActionLoading(`${report.id}-${status}`);
    try {
      await axios.patch(`${API_URL}/reports/${report.id}`, { status }, { headers: H });
      showToast(`Report marked as ${status.toLowerCase()}`); await fetchReports();
    } catch (err) {
      const ae = err as AxiosError<{ error: string }>;
      showToast(ae.response?.data?.error || 'Failed to update report', 'error');
    } finally { setActionLoading(null); }
  };

  const handleBlockUser = async () => {
    if (!confirmBlock) return;
    setActionLoading(`${confirmBlock.id}-block`);
    try {
      await axios.post(`${API_URL}/admin/customers/${confirmBlock.reported_id}/block`, {}, { headers: H });
      showToast(`${safeTag(confirmBlock.reported, confirmBlock.reported_id)} has been blocked`);
      setConfirmBlock(null); await fetchReports();
    } catch (err) {
      const ae = err as AxiosError<{ error: string }>;
      showToast(ae.response?.data?.error || 'Failed to block user', 'error');
    } finally { setActionLoading(null); }
  };

  const filtered = reports.filter(r => {
    if (reasonFilter !== 'ALL' && r.reason !== reasonFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!(r.reporter?.safetag?.toLowerCase().includes(q) || r.reported?.safetag?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  return (
    <AdminShell title="User Reports" subtitle="Trust & safety — user reports and actions">
      {toast && (
        <div className="fixed top-6 right-6 z-[100] px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === 'success' ? '#059669' : '#e11d48' }}>{toast.msg}</div>
      )}

      {/* Block confirm modal */}
      {confirmBlock && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-sm w-full shadow-2xl" style={{ border: '1px solid #edeff3' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 mx-auto" style={{ background: '#fff1f2' }}>
              <AlertTriangle className="w-6 h-6 text-[#e11d48]" />
            </div>
            <h3 className="font-tight text-[18px] font-bold text-[#0f172a] text-center mb-2">Block this user?</h3>
            <p className="text-[12px] text-[#64748b] text-center mb-6">
              This will block <span className="font-bold text-[#0f172a]">{safeTag(confirmBlock.reported, confirmBlock.reported_id)}</span> from the platform. You can unblock from the Customers page.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBlock(null)} className="flex-1 h-11 rounded-xl text-[12px] font-semibold text-[#64748b]" style={{ border: '1px solid #e9eaec' }}>Cancel</button>
              <button onClick={handleBlockUser} disabled={actionLoading === `${confirmBlock.id}-block`}
                className="flex-1 h-11 rounded-xl text-white text-[12px] font-bold disabled:opacity-60" style={{ background: '#e11d48' }}>
                {actionLoading === `${confirmBlock.id}-block` ? 'Blocking…' : 'Yes, Block'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open Reports', value: reports.filter(r => r.status === 'OPEN').length, icon: Clock, color: '#d97706', bg: '#fffbeb' },
          { label: 'Reviewed', value: reports.filter(r => r.status === 'REVIEWED').length, icon: CheckCircle, color: '#059669', bg: '#f0fdf4' },
          { label: 'Total Reports', value: reports.length, icon: Flag, color: '#e11d48', bg: '#fff1f2' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bg }}>
                <Icon className="w-4.5 h-4.5" style={{ color: card.color }} />
              </div>
              <div>
                <p className="font-tight text-2xl font-bold text-[#0f172a]">{card.value}</p>
                <p className="adm-section-label mt-0.5">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f3f4f6] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="font-tight text-[14px] font-bold text-[#0f172a]">Report List</p>
            <span className="adm-chip chip-slate">{filtered.length} results</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#f7f8f9', border: '1px solid #e9eaec' }}>
              {['ALL', 'OPEN', 'REVIEWED', 'DISMISSED'].map(k => (
                <button key={k} onClick={() => setFilter(k)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={filter === k ? { background: k === 'OPEN' ? '#e11d48' : '#0f172a', color: '#fff' } : { color: '#64748b' }}>
                  {k === 'ALL' ? 'All' : k.charAt(0) + k.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
              <input type="text" placeholder="Search safetags…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-48 h-9 pl-9 pr-4 rounded-xl text-[12px] font-semibold outline-none" style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }} />
            </div>
            <select value={reasonFilter} onChange={e => setReasonFilter(e.target.value)}
              className="h-9 px-3 rounded-xl text-[12px] font-semibold outline-none appearance-none cursor-pointer"
              style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }}>
              <option value="ALL">All Reasons</option>
              <option value="SCAM">Scam</option>
              <option value="FAKE_PROOF">Fake Proof</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center"><div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#e11d48] rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[12px] font-bold text-[#94a3b8]">No reports match the current filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1100px]">
              <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                {['Reporter', 'Reported', 'Reason', 'Description', 'Transaction', 'Status', 'Date', ''].map((h, i) => (
                  <th key={i} className={`px-5 py-3 adm-section-label ${h === '' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(report => {
                  const isOpen = report.status === 'OPEN';
                  const isReviewing = actionLoading === `${report.id}-REVIEWED`;
                  const isDismissing = actionLoading === `${report.id}-DISMISSED`;
                  const isBlocking = actionLoading === `${report.id}-block`;
                  const anyLoading = isReviewing || isDismissing || isBlocking;
                  const reasonChip = REASON_CHIP[report.reason] || { color: '#475569', bg: '#f1f5f9' };
                  const statusChip = STATUS_CHIP[report.status] || { color: '#475569', bg: '#f1f5f9' };
                  return (
                    <tr key={report.id} className="border-b border-[#f3f4f6] transition-colors hover:bg-[#fafafa]"
                      style={isOpen ? { background: 'rgba(251,191,36,0.03)' } : {}}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#f1f5f9' }}><User className="w-3 h-3 text-[#64748b]" /></div>
                          <span className="text-[11px] font-bold text-[#0f172a]">{safeTag(report.reporter, report.reporter_id)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: report.reported?.is_blocked ? '#fff1f2' : report.reported?.is_flagged ? '#fffbeb' : '#f1f5f9' }}>
                            <User className="w-3 h-3" style={{ color: report.reported?.is_blocked ? '#e11d48' : report.reported?.is_flagged ? '#d97706' : '#64748b' }} />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-[#0f172a]">{safeTag(report.reported, report.reported_id)}</p>
                            {report.reported?.is_blocked && <p className="text-[9px] font-bold text-[#e11d48] uppercase">Blocked</p>}
                            {!report.reported?.is_blocked && report.reported?.is_flagged && <p className="text-[9px] font-bold text-[#d97706] uppercase">Flagged</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="adm-chip text-[9px] font-bold" style={{ color: reasonChip.color, background: reasonChip.bg }}>{REASON_LABELS[report.reason] || report.reason}</span></td>
                      <td className="px-5 py-4 max-w-[200px]"><span className="text-[11px] font-bold text-[#64748b] block truncate" title={report.description || ''}>{trunc(report.description, 80)}</span></td>
                      <td className="px-5 py-4">
                        {report.transaction_id ? (
                          <a href={`/admin/transactions?search=${report.transaction_id}`} className="flex items-center gap-1 text-[11px] font-bold text-[#e11d48] hover:underline" onClick={e => e.stopPropagation()}>
                            <span className="font-mono">{report.transaction_id.slice(0, 8)}…</span><ExternalLink className="w-3 h-3" />
                          </a>
                        ) : <span className="text-[11px] font-bold text-[#cbd5e1]">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="adm-chip text-[9px] font-bold" style={{ color: statusChip.color, background: statusChip.bg }}>{report.status}</span>
                          {isOpen && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#d97706' }} />}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[10px] font-bold text-[#94a3b8] whitespace-nowrap">{fmt(report.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {report.status !== 'REVIEWED' && (
                            <button disabled={anyLoading} onClick={() => handleUpdateStatus(report, 'REVIEWED')}
                              className="h-8 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1 disabled:opacity-40 transition-colors" style={{ background: '#f0fdf4', color: '#059669' }}>
                              {isReviewing ? <div className="w-3 h-3 border-2 border-[#a7f3d0] border-t-[#059669] rounded-full animate-spin" /> : <CheckCircle className="w-3 h-3" />} Review
                            </button>
                          )}
                          {report.status !== 'DISMISSED' && (
                            <button disabled={anyLoading} onClick={() => handleUpdateStatus(report, 'DISMISSED')}
                              className="h-8 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1 disabled:opacity-40 transition-colors" style={{ background: '#f1f5f9', color: '#475569' }}>
                              {isDismissing ? <div className="w-3 h-3 border-2 border-[#cbd5e1] border-t-[#475569] rounded-full animate-spin" /> : <XCircle className="w-3 h-3" />} Dismiss
                            </button>
                          )}
                          {!report.reported?.is_blocked && (
                            <button disabled={anyLoading} onClick={() => setConfirmBlock(report)}
                              className="h-8 px-3 rounded-lg text-[10px] font-bold flex items-center gap-1 disabled:opacity-40 transition-colors" style={{ background: '#fff1f2', color: '#e11d48' }}>
                              {isBlocking ? <div className="w-3 h-3 border-2 border-[#fecdd3] border-t-[#e11d48] rounded-full animate-spin" /> : <ShieldOff className="w-3 h-3" />} Block
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-[#f3f4f6]">
            <p className="text-[11px] font-bold text-[#94a3b8]">Showing <span className="text-[#0f172a]">{filtered.length}</span> of <span className="text-[#0f172a]">{reports.length}</span> reports</p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
