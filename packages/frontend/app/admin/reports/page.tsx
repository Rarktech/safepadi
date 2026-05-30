'use client';

import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import {
    Flag,
    Search,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    User,
    ShieldOff,
    ExternalLink,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/Sidebar';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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

const REASON_LABELS: Record<string, string> = {
    SCAM: 'Scam',
    FAKE_PROOF: 'Fake Proof',
    HARASSMENT: 'Harassment',
    OTHER: 'Other',
};

const REASON_COLORS: Record<string, string> = {
    SCAM: 'bg-rose-100 text-rose-700',
    FAKE_PROOF: 'bg-amber-100 text-amber-700',
    HARASSMENT: 'bg-purple-100 text-purple-700',
    OTHER: 'bg-slate-100 text-slate-600',
};

const STATUS_COLORS: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-700',
    REVIEWED: 'bg-emerald-100 text-emerald-600',
    DISMISSED: 'bg-slate-100 text-slate-500',
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function truncate(str: string | null | undefined, max: number) {
    if (!str) return '—';
    return str.length > max ? str.slice(0, max) + '…' : str;
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchReports(); }, [filter]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const statusParam = filter !== 'ALL' ? `?status=${filter}` : '';
            const res = await axios.get(`${API_URL}/reports${statusParam}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' },
            });
            setReports(res.data);
        } catch (err) {
            console.error('Failed to fetch reports:', err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleUpdateStatus = async (report: Report, status: 'REVIEWED' | 'DISMISSED') => {
        setActionLoading(`${report.id}-${status}`);
        try {
            await axios.patch(
                `${API_URL}/reports/${report.id}`,
                { status },
                { headers: { 'ngrok-skip-browser-warning': 'true' } }
            );
            showToast(`Report marked as ${status.toLowerCase()}`);
            await fetchReports();
        } catch (err) {
            const axiosErr = err as AxiosError<{ error: string }>;
            showToast(axiosErr.response?.data?.error || 'Failed to update report', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleBlockUser = async () => {
        if (!confirmBlock) return;
        setActionLoading(`${confirmBlock.id}-block`);
        try {
            await axios.post(
                `${API_URL}/admin/customers/${confirmBlock.reported_id}/block`,
                {},
                { headers: { 'ngrok-skip-browser-warning': 'true' } }
            );
            const tag = confirmBlock.reported?.safetag || confirmBlock.reported_id;
            showToast(`${tag.startsWith('@') ? tag : `@${tag}`} has been blocked`);
            setConfirmBlock(null);
            await fetchReports();
        } catch (err) {
            const axiosErr = err as AxiosError<{ error: string }>;
            showToast(axiosErr.response?.data?.error || 'Failed to block user', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredReports = reports.filter((r) => {
        if (reasonFilter !== 'ALL' && r.reason !== reasonFilter) return false;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            const reporterTag = r.reporter?.safetag?.toLowerCase() || '';
            const reportedTag = r.reported?.safetag?.toLowerCase() || '';
            if (!reporterTag.includes(q) && !reportedTag.includes(q)) return false;
        }
        return true;
    });

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <AdminSidebar />

            {/* Toast */}
            {toast && (
                <div
                    className={cn(
                        'fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold animate-in slide-in-from-top duration-300',
                        toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
                    )}
                >
                    <span>{toast.type === 'success' ? '✅' : '❌'}</span>
                    {toast.msg}
                </div>
            )}

            {/* Block Confirm Modal */}
            {confirmBlock && (
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
                        <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <AlertTriangle className="w-7 h-7 text-rose-500" />
                        </div>
                        <h3 className="text-xl font-black text-[#020617] text-center tracking-tight mb-2">
                            Block this user?
                        </h3>
                        <p className="text-sm font-bold text-slate-400 text-center mb-8">
                            This will block{' '}
                            <span className="text-slate-700">
                                {confirmBlock.reported?.safetag
                                    ? confirmBlock.reported.safetag.startsWith('@')
                                        ? confirmBlock.reported.safetag
                                        : `@${confirmBlock.reported.safetag}`
                                    : confirmBlock.reported_id}
                            </span>{' '}
                            from the platform. You can unblock them from the Customers page.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmBlock(null)}
                                className="flex-1 h-12 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBlockUser}
                                disabled={actionLoading === `${confirmBlock.id}-block`}
                                className="flex-1 h-12 rounded-2xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 transition-all disabled:opacity-60"
                            >
                                {actionLoading === `${confirmBlock.id}-block` ? 'Blocking…' : 'Yes, Block'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 p-8 lg:p-12">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Safeeely Ecosystem
                                </span>
                                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                                    Trust & Safety
                                </span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">User Reports</h1>
                        </div>

                        {/* Filter tabs */}
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-sm">
                                {[
                                    { key: 'ALL', label: 'All' },
                                    { key: 'OPEN', label: 'Open' },
                                    { key: 'REVIEWED', label: 'Reviewed' },
                                    { key: 'DISMISSED', label: 'Dismissed' },
                                ].map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setFilter(key)}
                                        className={cn(
                                            'px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                                            filter === key
                                                ? key === 'OPEN'
                                                    ? 'bg-rose-600 text-white shadow-lg'
                                                    : 'bg-slate-900 text-white shadow-lg'
                                                : 'text-slate-400 hover:text-slate-900'
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-amber-200 transition-colors">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                                    Open Reports
                                </p>
                                <p className="text-3xl font-black text-slate-900">
                                    {reports.filter((r) => r.status === 'OPEN').length}
                                </p>
                            </div>
                            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                <Clock className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                                    Reviewed
                                </p>
                                <p className="text-3xl font-black text-slate-900">
                                    {reports.filter((r) => r.status === 'REVIEWED').length}
                                </p>
                            </div>
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="bg-[#020617] p-8 rounded-[32px] shadow-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                                    Total Reports
                                </p>
                                <p className="text-3xl font-black text-white">{reports.length}</p>
                            </div>
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-rose-400">
                                <Flag className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* Table Card */}
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
                        {/* Toolbar */}
                        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-xl font-black text-[#020617] tracking-tight">Report List</h3>
                                <span className="text-[10px] font-black text-slate-400 bg-slate-50 rounded-xl px-3 py-1">
                                    {filteredReports.length} results
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                {/* Search */}
                                <div className="relative flex-1 md:flex-none">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search safetags…"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-11 pl-11 pr-4 bg-slate-50 border-none rounded-2xl text-[11px] font-bold w-full md:w-[220px] outline-none transition-all focus:ring-2 focus:ring-rose-500/20"
                                    />
                                </div>
                                {/* Reason filter */}
                                <select
                                    value={reasonFilter}
                                    onChange={(e) => setReasonFilter(e.target.value)}
                                    className="h-11 px-4 bg-slate-50 border-none rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-rose-500/20 appearance-none cursor-pointer"
                                >
                                    <option value="ALL">All Reasons</option>
                                    <option value="SCAM">Scam</option>
                                    <option value="FAKE_PROOF">Fake Proof</option>
                                    <option value="HARASSMENT">Harassment</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-20 text-center">
                                <div className="w-12 h-12 border-4 border-slate-100 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Loading Reports
                                </p>
                            </div>
                        ) : filteredReports.length === 0 ? (
                            <div className="p-20 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-8 h-8 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">All Clear</h3>
                                <p className="text-sm text-slate-400 font-medium">
                                    No reports match the current filters.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto scrollbar-hide">
                                <table className="w-full text-left min-w-[1100px]">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                Reporter
                                            </th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                Reported
                                            </th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                Reason
                                            </th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                Description
                                            </th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                Transaction
                                            </th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                Status
                                            </th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                Date
                                            </th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredReports.map((report) => {
                                            const reporterTag = report.reporter?.safetag
                                                ? report.reporter.safetag.startsWith('@')
                                                    ? report.reporter.safetag
                                                    : `@${report.reporter.safetag}`
                                                : report.reporter_id.slice(0, 8);
                                            const reportedTag = report.reported?.safetag
                                                ? report.reported.safetag.startsWith('@')
                                                    ? report.reported.safetag
                                                    : `@${report.reported.safetag}`
                                                : report.reported_id.slice(0, 8);
                                            const isOpen = report.status === 'OPEN';
                                            const isReviewing = actionLoading === `${report.id}-REVIEWED`;
                                            const isDismissing = actionLoading === `${report.id}-DISMISSED`;
                                            const isBlocking = actionLoading === `${report.id}-block`;
                                            const anyLoading = isReviewing || isDismissing || isBlocking;

                                            return (
                                                <tr
                                                    key={report.id}
                                                    className={cn(
                                                        'hover:bg-slate-50/70 transition-all duration-300 group',
                                                        isOpen && 'bg-amber-50/20'
                                                    )}
                                                >
                                                    {/* Reporter */}
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                                                <User className="w-3.5 h-3.5 text-slate-500" />
                                                            </div>
                                                            <span className="text-xs font-black text-slate-900">
                                                                {reporterTag}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Reported */}
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={cn(
                                                                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                                                                    report.reported?.is_blocked
                                                                        ? 'bg-rose-50'
                                                                        : report.reported?.is_flagged
                                                                        ? 'bg-amber-50'
                                                                        : 'bg-slate-100'
                                                                )}
                                                            >
                                                                <User
                                                                    className={cn(
                                                                        'w-3.5 h-3.5',
                                                                        report.reported?.is_blocked
                                                                            ? 'text-rose-500'
                                                                            : report.reported?.is_flagged
                                                                            ? 'text-amber-500'
                                                                            : 'text-slate-500'
                                                                    )}
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-slate-900">
                                                                    {reportedTag}
                                                                </span>
                                                                {report.reported?.is_blocked && (
                                                                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider">
                                                                        Blocked
                                                                    </span>
                                                                )}
                                                                {!report.reported?.is_blocked &&
                                                                    report.reported?.is_flagged && (
                                                                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">
                                                                            Flagged
                                                                        </span>
                                                                    )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Reason */}
                                                    <td className="px-8 py-6">
                                                        <span
                                                            className={cn(
                                                                'text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest',
                                                                REASON_COLORS[report.reason] || 'bg-slate-100 text-slate-600'
                                                            )}
                                                        >
                                                            {REASON_LABELS[report.reason] || report.reason}
                                                        </span>
                                                    </td>

                                                    {/* Description */}
                                                    <td className="px-8 py-6 max-w-[200px]">
                                                        <span
                                                            className="text-[11px] font-bold text-slate-500 block truncate"
                                                            title={report.description || ''}
                                                        >
                                                            {truncate(report.description, 100)}
                                                        </span>
                                                    </td>

                                                    {/* Transaction ID */}
                                                    <td className="px-8 py-6">
                                                        {report.transaction_id ? (
                                                            <a
                                                                href={`/admin/transactions?search=${report.transaction_id}`}
                                                                className="flex items-center gap-1 text-[11px] font-black text-rose-600 hover:text-rose-700 transition-colors group/link"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <span className="font-mono">
                                                                    {report.transaction_id.slice(0, 8)}…
                                                                </span>
                                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-[11px] font-bold text-slate-300">—</span>
                                                        )}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={cn(
                                                                    'text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest',
                                                                    STATUS_COLORS[report.status] || 'bg-slate-100 text-slate-500'
                                                                )}
                                                            >
                                                                {report.status}
                                                            </span>
                                                            {isOpen && (
                                                                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Date */}
                                                    <td className="px-8 py-6">
                                                        <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
                                                            {formatDate(report.created_at)}
                                                        </span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {report.status !== 'REVIEWED' && (
                                                                <button
                                                                    disabled={anyLoading}
                                                                    onClick={() => handleUpdateStatus(report, 'REVIEWED')}
                                                                    className="h-8 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-40 flex items-center gap-1.5"
                                                                >
                                                                    {isReviewing ? (
                                                                        <div className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle className="w-3 h-3" />
                                                                    )}
                                                                    Review
                                                                </button>
                                                            )}
                                                            {report.status !== 'DISMISSED' && (
                                                                <button
                                                                    disabled={anyLoading}
                                                                    onClick={() => handleUpdateStatus(report, 'DISMISSED')}
                                                                    className="h-8 px-3 rounded-xl bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-40 flex items-center gap-1.5"
                                                                >
                                                                    {isDismissing ? (
                                                                        <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                                                    ) : (
                                                                        <XCircle className="w-3 h-3" />
                                                                    )}
                                                                    Dismiss
                                                                </button>
                                                            )}
                                                            {!report.reported?.is_blocked && (
                                                                <button
                                                                    disabled={anyLoading}
                                                                    onClick={() => setConfirmBlock(report)}
                                                                    className="h-8 px-3 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all disabled:opacity-40 flex items-center gap-1.5"
                                                                >
                                                                    {isBlocking ? (
                                                                        <div className="w-3 h-3 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
                                                                    ) : (
                                                                        <ShieldOff className="w-3 h-3" />
                                                                    )}
                                                                    Block
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

                        {/* Footer */}
                        {!loading && filteredReports.length > 0 && (
                            <div className="p-8 bg-slate-50/30 border-t border-slate-50">
                                <p className="text-[11px] font-bold text-slate-400">
                                    Showing{' '}
                                    <span className="text-slate-900">{filteredReports.length}</span> of{' '}
                                    <span className="text-slate-900">{reports.length}</span> reports
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
