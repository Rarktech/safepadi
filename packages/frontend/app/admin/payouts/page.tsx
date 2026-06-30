"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  CreditCard, Search, CheckCircle2, Clock, XCircle, AlertCircle,
  Download, Eye, Check, X, RefreshCw, ChevronDown, Building2, Wallet,
  Copy, DollarSign, CalendarRange, TrendingUp,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const ADMIN_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sf_admin_token');
}

function apiHeaders() {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function mapApiPayout(w: any): Payout {
  const details = w.details || w.payout_method?.details || {};
  const profile = w.profile || {};
  return {
    id: w.id,
    reference: w.reference || '—',
    user: {
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.safetag || '—',
      safetag: profile.safetag || '—',
      avatar: (profile.safetag || '??').replace('@', '').slice(0, 2).toUpperCase(),
    },
    amount: Number(w.amount),
    currency: w.currency || 'NGN',
    status: w.status,
    method: w.payout_method?.type === 'crypto' ? 'crypto' : 'bank_transfer',
    bank: details.bank_name || details.bankName || details.symbol || '—',
    account_number: details.account_number || details.accountNumber || details.address || '—',
    account_name: details.verifiedAccountName || details.account_name || details.accountName || '—',
    requested_at: w.created_at,
    details: {
      narration: details.narration,
      bank_code: details.bank_id || details.bankCode,
      network: details.chain,
      error: w.failure_reason,
      provider_order_no: w.provider_order_no,
      requires_approval: w.requires_approval,
      settled_at: w.settled_at,
      attempted_at: w.attempted_at,
    },
  };
}

interface Payout {
  id: string;
  reference: string;
  user: { name: string; safetag: string; avatar: string };
  amount: number;
  currency: string;
  status: string;
  method: string;
  bank: string;
  account_number: string;
  account_name: string;
  requested_at: string;
  details: { narration?: string; bank_code?: string; network?: string; error?: string; provider_order_no?: string; requires_approval?: boolean; settled_at?: string; attempted_at?: string };
}

const STATUS_CONFIG: Record<string, { label: string; chip: string; dot: string }> = {
  PROCESSING: { label: "Processing", chip: "chip-amber", dot: "#d97706" },
  SUCCESS:    { label: "Completed",  chip: "chip-green", dot: "#10b981" },
  FAILED:     { label: "Failed",     chip: "chip-red",   dot: "#e11d48" },
};

const CURRENCY_CONFIG: Record<string, { symbol: string; label: string }> = {
  NGN:  { symbol: "₦", label: "Nigerian Naira" },
  USDT: { symbol: "$", label: "Tether (USDT)" },
  BTC:  { symbol: "",  label: "Bitcoin" },
};

function formatAmount(amount: number, currency: string) {
  if (currency === "NGN")  return `₦${amount.toLocaleString()}`;
  if (currency === "BTC")  return `${amount} BTC`;
  if (currency === "USDT") return `$${amount.toLocaleString()} USDT`;
  return `${amount} ${currency}`;
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PayoutDetailSheet({ payout, onClose, onApprove, onReject, onRetry }: any) {
  if (!payout) return null;
  const cfg = STATUS_CONFIG[payout.status] || STATUS_CONFIG.PROCESSING;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-7 flex items-start justify-between" style={{ borderBottom: '1px solid #f3f4f6' }}>
          <div>
            <p className="adm-section-label mb-1">Payout Details</p>
            <p className="font-tight text-[18px] font-bold text-[#0f172a]">{payout.reference}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
              <span className={`adm-chip ${cfg.chip}`}>{cfg.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#f1f5f9] hover:bg-[#e9eaec] flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-[#64748b]" />
          </button>
        </div>

        {/* Amount band */}
        <div className="px-7 py-5" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,.06),rgba(16,185,129,.03))', borderBottom: '1px solid #f3f4f6' }}>
          <p className="adm-section-label mb-1">Payout Amount</p>
          <p className="font-tight text-3xl font-bold text-[#0f172a]">{formatAmount(payout.amount, payout.currency)}</p>
          <p className="text-[12px] text-[#94a3b8] mt-1">Requested {new Date(payout.requested_at).toLocaleString()}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-7 space-y-6">
          {/* Recipient */}
          <div>
            <p className="adm-section-label mb-3">Recipient</p>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-[13px] shrink-0"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                {payout.user.avatar}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#0f172a]">{payout.user.name}</p>
                <p className="text-[12px] text-[#94a3b8]">{payout.user.safetag}</p>
              </div>
            </div>
          </div>

          {/* Payout method */}
          <div>
            <p className="adm-section-label mb-3">Payout Method</p>
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#f7f8f9', border: '1px solid #e9eaec' }}>
              <div className="flex items-center gap-3">
                {payout.method === "crypto"
                  ? <Wallet className="w-4 h-4 text-[#d97706]" />
                  : <Building2 className="w-4 h-4 text-[#2563eb]" />
                }
                <div>
                  <p className="text-[13px] font-semibold text-[#0f172a]">{payout.bank}</p>
                  <p className="adm-section-label">{payout.method === "crypto" ? "Crypto Wallet" : "Bank Transfer"}</p>
                </div>
              </div>
              <div className="h-px bg-[#e9eaec]" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="adm-section-label mb-0.5">{payout.method === "crypto" ? "Wallet Address" : "Account Number"}</p>
                  <p className="text-[13px] font-mono font-semibold text-[#0f172a]">{payout.account_number}</p>
                </div>
                <button className="w-8 h-8 rounded-lg bg-white flex items-center justify-center hover:bg-[#f1f5f9] transition-colors"
                  style={{ border: '1px solid #e9eaec' }}>
                  <Copy className="w-3.5 h-3.5 text-[#94a3b8]" />
                </button>
              </div>
              {payout.method !== "crypto" && (
                <div>
                  <p className="adm-section-label mb-0.5">Account Name</p>
                  <p className="text-[13px] font-semibold text-[#0f172a]">{payout.account_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Narration */}
          <div>
            <p className="adm-section-label mb-2">Narration</p>
            <p className="text-[13px] text-[#64748b]">{payout.details?.narration || "—"}</p>
          </div>

          {/* Error */}
          {payout.status === "FAILED" && payout.details?.error && (
            <div className="rounded-xl p-4" style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <AlertCircle className="w-4 h-4 text-[#e11d48]" />
                <p className="text-[11px] font-bold text-[#e11d48] uppercase tracking-wide">Failure Reason</p>
              </div>
              <p className="text-[13px] font-semibold text-[#be123c]">{payout.details.error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-7 space-y-2.5" style={{ borderTop: '1px solid #f3f4f6' }}>
          {payout.status === "PROCESSING" && (
            <>
              <button onClick={() => onApprove(payout)}
                className="w-full h-12 rounded-xl font-tight text-[14px] font-bold text-white flex items-center justify-center gap-2"
                style={{ background: '#059669' }}>
                <Check className="w-4 h-4" /> Approve & Process Payout
              </button>
              <button onClick={() => onReject(payout)}
                className="w-full h-12 rounded-xl font-tight text-[14px] font-bold flex items-center justify-center gap-2"
                style={{ border: '1.5px solid #fecdd3', color: '#e11d48', background: '#fff' }}>
                <X className="w-4 h-4" /> Reject Payout
              </button>
            </>
          )}
          {payout.status === "FAILED" && (
            <button onClick={() => onRetry(payout)}
              className="w-full h-12 rounded-xl font-tight text-[14px] font-bold text-white flex items-center justify-center gap-2"
              style={{ background: '#d97706' }}>
              <RefreshCw className="w-4 h-4" /> Retry Payout
            </button>
          )}
          {payout.status === "SUCCESS" && (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl"
              style={{ background: '#f0fdf4', border: '1px solid #d1fae5' }}>
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              <span className="text-[13px] font-bold text-[#059669]">Payout Successfully Completed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/admin/payouts?limit=200`, { headers: apiHeaders() });
      if (!res.ok) throw new Error('Failed to fetch payouts');
      const json = await res.json();
      setPayouts((json.data || []).map(mapApiPayout));
    } catch (err: any) {
      showToast(`Failed to load payouts: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const handleApprove = async (payout: any) => {
    try {
      const res = await fetch(`${ADMIN_API}/admin/payouts/${payout.id}/approve`, { method: 'POST', headers: apiHeaders() });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Approval failed'); }
      setPayouts(prev => prev.map(p => p.id === payout.id ? { ...p, status: "PROCESSING" } : p));
      setSelectedPayout((prev: any) => prev ? { ...prev, status: "PROCESSING" } : null);
      showToast(`Payout ${payout.reference} approved — disbursement initiated.`);
      setTimeout(fetchPayouts, 3000);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleReject = async (payout: any) => {
    const reason = window.prompt('Rejection reason (shown to user):') || 'Rejected by admin';
    try {
      const res = await fetch(`${ADMIN_API}/admin/payouts/${payout.id}/reject`, {
        method: 'POST', headers: apiHeaders(), body: JSON.stringify({ reason }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Rejection failed'); }
      setPayouts(prev => prev.map(p => p.id === payout.id ? { ...p, status: "FAILED", details: { ...p.details, error: reason } } : p));
      setSelectedPayout((prev: any) => prev ? { ...prev, status: "FAILED", details: { ...prev.details, error: reason } } : null);
      showToast(`Payout ${payout.reference} has been rejected.`, "error");
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleRetry = (payout: any) => handleApprove(payout);

  const filtered = useMemo(() => payouts.filter(p => {
    const matchesSearch = p.reference.toLowerCase().includes(search.toLowerCase()) ||
      p.user.name.toLowerCase().includes(search.toLowerCase()) ||
      p.user.safetag.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const pDate = new Date(p.requested_at);
    const matchesFrom = !dateFrom || pDate >= new Date(dateFrom);
    const matchesTo = !dateTo || pDate <= new Date(dateTo + "T23:59:59");
    return matchesSearch && matchesStatus && matchesFrom && matchesTo;
  }), [payouts, search, statusFilter, dateFrom, dateTo]);

  const processing = payouts.filter(p => p.status === "PROCESSING").length;
  const succeeded = payouts.filter(p => p.status === "SUCCESS").length;
  const failed = payouts.filter(p => p.status === "FAILED").length;
  const totalNGN = payouts.filter(p => p.currency === "NGN" && p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0);
  const pendingNGN = payouts.filter(p => p.currency === "NGN" && p.status === "PROCESSING").reduce((s, p) => s + p.amount, 0);

  const statCards = [
    { label: "Pending Payouts", value: processing, sub: "Awaiting action", icon: Clock },
    { label: "Completed", value: succeeded, sub: `₦${totalNGN.toLocaleString()} paid out`, icon: CheckCircle2 },
    { label: "Awaiting Funds", value: `₦${pendingNGN.toLocaleString()}`, sub: `${processing} payouts pending`, icon: DollarSign },
    { label: "Failed", value: failed, sub: "Needs review", icon: XCircle },
  ];

  const currencies = ["NGN", "USDT", "BTC"] as const;
  const currencyStats = currencies.map(cur => ({
    cur, cfg: CURRENCY_CONFIG[cur],
    paid: payouts.filter(p => p.currency === cur && p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0),
    pending: payouts.filter(p => p.currency === cur && p.status === "PROCESSING").reduce((s, p) => s + p.amount, 0),
    count: payouts.filter(p => p.currency === cur).length,
    successCount: payouts.filter(p => p.currency === cur && p.status === "SUCCESS").length,
  }));

  return (
    <AdminShell title="Payouts" subtitle="Manage withdrawal requests and disbursements">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] px-5 py-4 rounded-2xl shadow-2xl text-sm font-bold text-white flex items-center gap-3 animate-in slide-in-from-top-4 duration-300"
          style={{ background: toast.type === "success" ? "#059669" : "#e11d48" }}>
          {toast.msg}
        </div>
      )}

      {/* Detail Sheet */}
      {selectedPayout && (
        <PayoutDetailSheet payout={selectedPayout} onClose={() => setSelectedPayout(null)}
          onApprove={handleApprove} onReject={handleReject} onRetry={handleRetry} />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="adm-section-label">{card.label}</p>
                <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#64748b]" />
                </div>
              </div>
              <p className="font-tight text-2xl font-bold text-[#0f172a]">
                {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
              </p>
              <p className="text-[11px] text-[#94a3b8] mt-0.5">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Currency breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-[#94a3b8]" />
          <p className="adm-section-label">Payouts by Currency</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {currencyStats.map(({ cur, cfg, paid, pending, count, successCount }) => (
            <div key={cur} className="bg-white rounded-2xl border border-[#e9eaec] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="adm-chip chip-blue">{cur}</span>
                <span className="adm-section-label">{count} total</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="adm-section-label mb-0.5">Paid Out</p>
                  <p className="font-tight text-[18px] font-bold text-[#0f172a]">
                    {cur === "NGN" ? `₦${paid.toLocaleString()}` : cur === "USDT" ? `$${paid.toLocaleString()} USDT` : `${paid.toFixed(4)} BTC`}
                  </p>
                  <p className="text-[11px] text-[#94a3b8]">{successCount} completed</p>
                </div>
                <div className="h-px bg-[#f3f4f6]" />
                <div>
                  <p className="adm-section-label mb-0.5">Pending</p>
                  <p className="font-tight text-[14px] font-bold text-[#d97706]">
                    {cur === "NGN" ? `₦${pending.toLocaleString()}` : cur === "USDT" ? `$${pending.toLocaleString()} USDT` : `${pending.toFixed(4)} BTC`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout list */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        {/* Filters header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 border-b border-[#f3f4f6]">
          <div>
            <p className="font-tight text-[14px] font-bold text-[#0f172a]">Payout Requests</p>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">{filtered.length} of {payouts.length} entries</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
              <input type="text" placeholder="Search reference or user…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 h-9 rounded-xl text-[12px] font-medium outline-none"
                style={{ width: 210, background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }}
              />
            </div>
            {/* Status filter */}
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="h-9 pl-3.5 pr-8 rounded-xl text-[12px] font-semibold outline-none appearance-none cursor-pointer"
                style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }}>
                <option value="ALL">All Status</option>
                <option value="PROCESSING">Processing</option>
                <option value="SUCCESS">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94a3b8] pointer-events-none" />
            </div>
            {/* Date range */}
            <div className="flex items-center gap-2 h-9 px-3 rounded-xl"
              style={{ background: '#f7f8f9', border: '1px solid #e9eaec' }}>
              <CalendarRange className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="bg-transparent text-[11px] font-medium text-[#64748b] outline-none cursor-pointer w-[100px]" />
              <span className="text-[10px] text-[#cbd5e1]">→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="bg-transparent text-[11px] font-medium text-[#64748b] outline-none cursor-pointer w-[100px]" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[#fecdd3] transition-colors"
                  style={{ background: '#f1f5f9' }}>
                  <X className="w-2.5 h-2.5 text-[#64748b]" />
                </button>
              )}
            </div>
            {/* Refresh */}
            <button onClick={fetchPayouts} disabled={loading}
              className="h-9 px-4 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5 disabled:opacity-60 transition-all"
              style={{ background: '#0f172a' }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                {["Reference", "Recipient", "Method", "Requested", "Status", "Amount", ""].map(h => (
                  <th key={h} className="px-5 py-3.5 adm-section-label text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin mx-auto mb-3" />
                    <p className="adm-section-label">Loading payouts…</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <CreditCard className="w-10 h-10 text-[#e9eaec] mx-auto mb-3" />
                    <p className="text-[13px] font-semibold text-[#94a3b8]">No payouts found</p>
                  </td>
                </tr>
              ) : (
                filtered.map(payout => {
                  const cfg = STATUS_CONFIG[payout.status] || STATUS_CONFIG.PROCESSING;
                  return (
                    <tr key={payout.id} onClick={() => setSelectedPayout(payout)}
                      className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors cursor-pointer">
                      <td className="px-5 py-4">
                        <span className="text-[12px] font-mono font-semibold text-[#64748b]">{payout.reference}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                            {payout.user.avatar}
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-[#0f172a]">{payout.user.name}</p>
                            <p className="text-[11px] text-[#94a3b8]">{payout.user.safetag}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {payout.method === "crypto"
                            ? <Wallet className="w-3.5 h-3.5 text-[#d97706]" />
                            : <Building2 className="w-3.5 h-3.5 text-[#2563eb]" />
                          }
                          <div>
                            <p className="text-[12px] font-semibold text-[#0f172a]">{payout.bank}</p>
                            <p className="text-[11px] text-[#94a3b8]">{payout.currency}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[12px] font-semibold text-[#0f172a]">{timeAgo(payout.requested_at)}</p>
                        <p className="text-[11px] text-[#94a3b8]">{new Date(payout.requested_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`adm-chip ${cfg.chip}`}>{cfg.label}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-tight text-[13px] font-bold text-[#0f172a]">{formatAmount(payout.amount, payout.currency)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={e => { e.stopPropagation(); setSelectedPayout(payout); }}
                          className="h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ml-auto transition-colors hover:bg-[#f0fdf4]"
                          style={{ border: '1px solid #e9eaec', color: '#059669' }}>
                          <Eye className="w-3 h-3" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
          <p className="text-[12px] text-[#94a3b8]">
            Showing <span className="font-semibold text-[#0f172a]">{filtered.length}</span> of <span className="font-semibold text-[#0f172a]">{payouts.length}</span> payouts
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d97706]" />
            <span className="text-[11px] text-[#94a3b8]">{processing} pending review</span>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
