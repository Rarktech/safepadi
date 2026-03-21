"use client";

import { useState, useMemo } from "react";
import {
    CreditCard,
    Search,
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    Download,
    Eye,
    Check,
    X,
    RefreshCw,
    ChevronDown,
    Building2,
    Wallet,
    Copy,
    DollarSign,
    CalendarRange,
    TrendingUp,
    Bitcoin,
} from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
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
    details: { narration?: string; bank_code?: string; network?: string; error?: string };
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_PAYOUTS: Payout[] = [
    {
        id: "pyt-001",
        reference: "WD-AP3X7F2K",
        user: { name: "Emmanuel Okafor", safetag: "@emmy.safe", avatar: "EO" },
        amount: 125000,
        currency: "NGN",
        status: "PROCESSING",
        method: "bank_transfer",
        bank: "GTBank",
        account_number: "012****789",
        account_name: "Emmanuel Okafor",
        requested_at: "2026-03-18T10:22:00Z",
        details: { bank_code: "058", narration: "Weekly earnings withdrawal" },
    },
    {
        id: "pyt-002",
        reference: "WD-BQ9Y1R5M",
        user: { name: "Fatima Bello", safetag: "@fatima.bello", avatar: "FB" },
        amount: 48500,
        currency: "NGN",
        status: "SUCCESS",
        method: "bank_transfer",
        bank: "Access Bank",
        account_number: "056****321",
        account_name: "Fatima Bello",
        requested_at: "2026-03-17T14:05:00Z",
        details: { bank_code: "044", narration: "Transaction earnings" },
    },
    {
        id: "pyt-003",
        reference: "WD-CR2K8S9N",
        user: { name: "Chidi Okonkwo", safetag: "@chidi.o", avatar: "CO" },
        amount: 0.023,
        currency: "BTC",
        status: "SUCCESS",
        method: "crypto",
        bank: "Bitcoin Wallet",
        account_number: "1A2b3C4d5E6f7G8h9I0j",
        account_name: "N/A",
        requested_at: "2026-03-17T09:45:00Z",
        details: { network: "Bitcoin", narration: "Crypto withdrawal" },
    },
    {
        id: "pyt-004",
        reference: "WD-DS5P3L7Q",
        user: { name: "Adeola Adeleke", safetag: "@adeola.ad", avatar: "AA" },
        amount: 320000,
        currency: "NGN",
        status: "FAILED",
        method: "bank_transfer",
        bank: "Zenith Bank",
        account_number: "219****654",
        account_name: "Adeola Adeleke",
        requested_at: "2026-03-16T18:30:00Z",
        details: { bank_code: "057", narration: "Monthly payout", error: "Account number mismatch" },
    },
    {
        id: "pyt-005",
        reference: "WD-ET7W2H4V",
        user: { name: "Kelechi Nwosu", safetag: "@kelechi.n", avatar: "KN" },
        amount: 75000,
        currency: "NGN",
        status: "PROCESSING",
        method: "bank_transfer",
        bank: "First Bank",
        account_number: "301****112",
        account_name: "Kelechi Nwosu",
        requested_at: "2026-03-19T08:00:00Z",
        details: { bank_code: "011", narration: "Withdrawal request" },
    },
    {
        id: "pyt-006",
        reference: "WD-FU8X6J1T",
        user: { name: "Ngozi Eze", safetag: "@ngozi.eze", avatar: "NE" },
        amount: 900,
        currency: "USDT",
        status: "SUCCESS",
        method: "crypto",
        bank: "USDT (TRC20) Wallet",
        account_number: "TRX9a2b3c4d5e6f7g8h9i",
        account_name: "N/A",
        requested_at: "2026-03-15T12:10:00Z",
        details: { network: "TRON (TRC20)", narration: "USDT payout" },
    },
    {
        id: "pyt-007",
        reference: "WD-GV1Y4C8S",
        user: { name: "Babatunde Alabi", safetag: "@baba.al", avatar: "BA" },
        amount: 210000,
        currency: "NGN",
        status: "PROCESSING",
        method: "bank_transfer",
        bank: "UBA",
        account_number: "201****445",
        account_name: "Babatunde Alabi",
        requested_at: "2026-03-19T11:30:00Z",
        details: { bank_code: "033", narration: "Platform earnings" },
    },
];

// ─── Status Configs ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; icon: any; pill: string; dot: string }> = {
    PROCESSING: {
        label: "Processing",
        icon: Clock,
        pill: "bg-amber-50 text-amber-600 border-amber-100",
        dot: "bg-amber-400",
    },
    SUCCESS: {
        label: "Completed",
        icon: CheckCircle2,
        pill: "bg-emerald-50 text-emerald-600 border-emerald-100",
        dot: "bg-emerald-500",
    },
    FAILED: {
        label: "Failed",
        icon: XCircle,
        pill: "bg-rose-50 text-rose-600 border-rose-100",
        dot: "bg-rose-500",
    },
};

function formatAmount(amount: number, currency: string) {
    if (currency === "NGN") return `₦${amount.toLocaleString()}`;
    if (currency === "BTC") return `${amount} BTC`;
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

// ─── Payout Detail Sheet ───────────────────────────────────────────────────────
function PayoutDetailSheet({ payout, onClose, onApprove, onReject, onRetry }: any) {
    if (!payout) return null;
    const cfg = STATUS_CONFIG[payout.status] || STATUS_CONFIG.PROCESSING;
    const StatusIcon = cfg.icon;

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={onClose} />

            {/* Sheet */}
            <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payout Details</p>
                        <h2 className="text-xl font-black text-slate-900">{payout.reference}</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                            <span className={cn("text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg border", cfg.pill)}>
                                {cfg.label}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* Amount */}
                <div className="px-8 py-6 bg-gradient-to-br from-[#0a2d1d]/5 to-emerald-50 border-b border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payout Amount</p>
                    <p className="text-4xl font-black text-[#020617]">{formatAmount(payout.amount, payout.currency)}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">Requested {new Date(payout.requested_at).toLocaleString()}</p>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Recipient */}
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Recipient</p>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                                {payout.user.avatar}
                            </div>
                            <div>
                                <p className="font-black text-slate-900 text-sm">{payout.user.name}</p>
                                <p className="text-xs font-bold text-slate-400">{payout.user.safetag}</p>
                            </div>
                        </div>
                    </div>

                    {/* Payout Method */}
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payout Method</p>
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center gap-3">
                                {payout.method === "crypto" ? (
                                    <Wallet className="w-5 h-5 text-amber-500" />
                                ) : (
                                    <Building2 className="w-5 h-5 text-blue-500" />
                                )}
                                <div>
                                    <p className="text-xs font-black text-slate-900">{payout.bank}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                        {payout.method === "crypto" ? "Crypto Wallet" : "Bank Transfer"}
                                    </p>
                                </div>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                                        {payout.method === "crypto" ? "Wallet Address" : "Account Number"}
                                    </p>
                                    <p className="text-sm font-bold text-slate-700 font-mono">{payout.account_number}</p>
                                </div>
                                <button className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                            </div>
                            {payout.method !== "crypto" && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Account Name</p>
                                    <p className="text-sm font-bold text-slate-700">{payout.account_name}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Narration */}
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Narration</p>
                        <p className="text-sm font-bold text-slate-700">{payout.details?.narration || "—"}</p>
                    </div>

                    {/* Error (if failed) */}
                    {payout.status === "FAILED" && payout.details?.error && (
                        <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="w-4 h-4 text-rose-500" />
                                <p className="text-xs font-black text-rose-600 uppercase tracking-wide">Failure Reason</p>
                            </div>
                            <p className="text-sm font-bold text-rose-700">{payout.details.error}</p>
                        </div>
                    )}
                </div>

                {/* Admin Action Buttons */}
                <div className="p-8 border-t border-slate-100 space-y-3">
                    {payout.status === "PROCESSING" && (
                        <>
                            <Button
                                onClick={() => onApprove(payout)}
                                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl gap-2 shadow-sm"
                            >
                                <Check className="w-4 h-4" /> Approve & Process Payout
                            </Button>
                            <Button
                                onClick={() => onReject(payout)}
                                variant="outline"
                                className="w-full h-12 border-rose-100 text-rose-600 hover:bg-rose-50 font-black rounded-2xl gap-2"
                            >
                                <X className="w-4 h-4" /> Reject Payout
                            </Button>
                        </>
                    )}
                    {payout.status === "FAILED" && (
                        <Button
                            onClick={() => onRetry(payout)}
                            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> Retry Payout
                        </Button>
                    )}
                    {payout.status === "SUCCESS" && (
                        <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 rounded-2xl">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-black text-emerald-600">Payout Successfully Completed</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Currency configs ─────────────────────────────────────────────────────────
const CURRENCY_CONFIG: Record<string, { label: string; symbol: string; color: string; bg: string; border: string; iconColor: string }> = {
    NGN: { label: "Nigerian Naira", symbol: "₦", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100", iconColor: "text-emerald-500" },
    USDT: { label: "Tether (USDT)", symbol: "$", color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-100", iconColor: "text-teal-500" },
    BTC: { label: "Bitcoin", symbol: "", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100", iconColor: "text-amber-500" },
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPayoutsPage() {
    const [payouts, setPayouts] = useState(MOCK_PAYOUTS);
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

    const handleApprove = (payout: any) => {
        setPayouts((prev) => prev.map((p) => p.id === payout.id ? { ...p, status: "SUCCESS" } : p));
        setSelectedPayout((prev: any) => prev ? { ...prev, status: "SUCCESS" } : null);
        showToast(`✅ Payout ${payout.reference} approved and processed.`);
    };

    const handleReject = (payout: any) => {
        setPayouts((prev) => prev.map((p) => p.id === payout.id ? { ...p, status: "FAILED", details: { ...p.details, error: "Rejected by admin" } } : p));
        setSelectedPayout((prev: any) => prev ? { ...prev, status: "FAILED", details: { ...prev.details, error: "Rejected by admin" } } : null);
        showToast(`❌ Payout ${payout.reference} has been rejected.`, "error");
    };

    const handleRetry = (payout: any) => {
        setPayouts((prev) => prev.map((p) => p.id === payout.id ? { ...p, status: "PROCESSING" } : p));
        setSelectedPayout((prev: any) => prev ? { ...prev, status: "PROCESSING" } : null);
        showToast(`🔄 Payout ${payout.reference} queued for retry.`);
    };

    const filtered = useMemo(() => {
        return payouts.filter((p) => {
            const matchesSearch =
                p.reference.toLowerCase().includes(search.toLowerCase()) ||
                p.user.name.toLowerCase().includes(search.toLowerCase()) ||
                p.user.safetag.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
            const pDate = new Date(p.requested_at);
            const matchesFrom = !dateFrom || pDate >= new Date(dateFrom);
            const matchesTo = !dateTo || pDate <= new Date(dateTo + "T23:59:59");
            return matchesSearch && matchesStatus && matchesFrom && matchesTo;
        });
    }, [payouts, search, statusFilter, dateFrom, dateTo]);

    // ── Stats ──
    const processing = payouts.filter((p) => p.status === "PROCESSING").length;
    const succeeded = payouts.filter((p) => p.status === "SUCCESS").length;
    const failed = payouts.filter((p) => p.status === "FAILED").length;
    const totalNGN = payouts.filter((p) => p.currency === "NGN" && p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0);
    const pendingNGN = payouts.filter((p) => p.currency === "NGN" && p.status === "PROCESSING").reduce((s, p) => s + p.amount, 0);

    const statCards = [
        { label: "Pending Payouts", value: processing, sub: "Awaiting action", icon: Clock, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" },
        { label: "Completed", value: succeeded, sub: `₦${totalNGN.toLocaleString()} paid out`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        { label: "Awaiting Funds", value: `₦${pendingNGN.toLocaleString()}`, sub: `${processing} payouts pending`, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
        { label: "Failed", value: failed, sub: "Needs review", icon: XCircle, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100" },
    ];

    // ── Currency Breakdown ──
    const currencies = ["NGN", "USDT", "BTC"] as const;
    const currencyStats = currencies.map((cur) => ({
        currency: cur,
        cfg: CURRENCY_CONFIG[cur],
        paid: payouts.filter((p) => p.currency === cur && p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0),
        pending: payouts.filter((p) => p.currency === cur && p.status === "PROCESSING").reduce((s, p) => s + p.amount, 0),
        count: payouts.filter((p) => p.currency === cur).length,
        successCount: payouts.filter((p) => p.currency === cur && p.status === "SUCCESS").length,
    }));

    return (
        <div className="flex bg-[#F8FAFC] min-h-screen font-sans">
            <AdminSidebar />

            {/* Toast */}
            {toast && (
                <div className={cn(
                    "fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold text-white flex items-center gap-3 animate-in slide-in-from-top-4 duration-300",
                    toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                )}>
                    {toast.msg}
                </div>
            )}

            {/* Detail Sheet */}
            {selectedPayout && (
                <PayoutDetailSheet
                    payout={selectedPayout}
                    onClose={() => setSelectedPayout(null)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onRetry={handleRetry}
                />
            )}

            <main className="flex-1 flex flex-col max-h-screen overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-30 bg-[#F8FAFC]/80 backdrop-blur-xl border-b border-slate-100 px-10 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-[#020617] tracking-tight">Payouts</h1>
                        <p className="text-xs font-bold text-slate-400 mt-0.5">Manage all withdrawal requests and payout disbursements</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="gap-2 rounded-2xl font-bold text-slate-600 border-slate-200 hover:bg-slate-50">
                            <Download className="w-4 h-4" /> Export
                        </Button>
                        <Button className="gap-2 rounded-2xl font-bold bg-[#0a2d1d] hover:bg-[#0a2d1d]/90 text-white">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </Button>
                    </div>
                </div>

                <div className="px-10 py-8 space-y-8">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {statCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div key={card.label} className={cn("bg-white rounded-[28px] p-6 border shadow-sm flex flex-col gap-3", card.border)}>
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", card.bg)}>
                                        <Icon className={cn("w-5 h-5", card.color)} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                                        <p className="text-2xl font-black text-[#020617]">{typeof card.value === "number" ? card.value.toLocaleString() : card.value}</p>
                                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">{card.sub}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Currency Breakdown */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-4 h-4 text-slate-400" />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Payouts by Currency</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            {currencyStats.map(({ currency, cfg, paid, pending, count, successCount }) => (
                                <div key={currency} className={cn("bg-white rounded-[24px] p-6 border shadow-sm", cfg.border)}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={cn("px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border", cfg.bg, cfg.border, cfg.color)}>
                                            {currency}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400">{count} total</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paid Out</p>
                                            <p className="text-xl font-black text-[#020617]">
                                                {currency === "NGN" ? `₦${paid.toLocaleString()}` :
                                                 currency === "USDT" ? `$${paid.toLocaleString()} USDT` :
                                                 `${paid.toFixed(4)} BTC`}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{successCount} completed payouts</p>
                                        </div>
                                        <div className="h-px bg-slate-100" />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending</p>
                                            <p className="text-sm font-black text-amber-600">
                                                {currency === "NGN" ? `₦${pending.toLocaleString()}` :
                                                 currency === "USDT" ? `$${pending.toLocaleString()} USDT` :
                                                 `${pending.toFixed(4)} BTC`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payout List Card */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                        {/* Table Header / Filters */}
                        <div className="px-8 py-6 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-black text-[#020617]">Payout Requests</h2>
                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                                    {filtered.length} of {payouts.length} entries
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                {/* Search */}
                                <div className="relative flex-1 min-w-[200px] sm:w-56">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search reference or user…"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all"
                                    />
                                </div>
                                {/* Status Filter */}
                                <div className="relative">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="h-11 pl-4 pr-8 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-bold text-slate-700 outline-none cursor-pointer appearance-none focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all"
                                    >
                                        <option value="ALL">All Status</option>
                                        <option value="PROCESSING">Processing</option>
                                        <option value="SUCCESS">Completed</option>
                                        <option value="FAILED">Failed</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                </div>
                                {/* Date Range */}
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 h-11">
                                    <CalendarRange className="w-4 h-4 text-slate-400 shrink-0" />
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="bg-transparent text-[12px] font-bold text-slate-700 outline-none cursor-pointer w-[120px]"
                                    />
                                    <span className="text-[10px] font-black text-slate-300">→</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="bg-transparent text-[12px] font-bold text-slate-700 outline-none cursor-pointer w-[120px]"
                                    />
                                    {(dateFrom || dateTo) && (
                                        <button
                                            onClick={() => { setDateFrom(""); setDateTo(""); }}
                                            className="ml-1 w-5 h-5 rounded-full bg-slate-200 hover:bg-rose-100 hover:text-rose-500 flex items-center justify-center transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-50">
                                        {["Reference", "Recipient", "Method", "Requested", "Status", "Amount", ""].map((h) => (
                                            <th key={h} className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-8 py-20 text-center">
                                                <CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                                <p className="text-sm font-bold text-slate-400">No payouts found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((payout) => {
                                            const cfg = STATUS_CONFIG[payout.status] || STATUS_CONFIG.PROCESSING;
                                            const StatusIcon = cfg.icon;
                                            return (
                                                <tr
                                                    key={payout.id}
                                                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group cursor-pointer"
                                                    onClick={() => setSelectedPayout(payout)}
                                                >
                                                    {/* Reference */}
                                                    <td className="px-8 py-5">
                                                        <span className="text-[11px] font-black text-slate-500 font-mono tracking-wider">{payout.reference}</span>
                                                    </td>

                                                    {/* Recipient */}
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-[10px] shadow-sm">
                                                                {payout.user.avatar}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-900">{payout.user.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400">{payout.user.safetag}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Method */}
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-2">
                                                            {payout.method === "crypto" ? (
                                                                <Wallet className="w-4 h-4 text-amber-500" />
                                                            ) : (
                                                                <Building2 className="w-4 h-4 text-blue-500" />
                                                            )}
                                                            <div>
                                                                <p className="text-xs font-black text-slate-700">{payout.bank}</p>
                                                                <p className="text-[10px] font-bold text-slate-400">{payout.currency}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Date */}
                                                    <td className="px-8 py-5">
                                                        <p className="text-xs font-bold text-slate-600">{timeAgo(payout.requested_at)}</p>
                                                        <p className="text-[10px] font-bold text-slate-300">{new Date(payout.requested_at).toLocaleDateString()}</p>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-8 py-5">
                                                        <div className={cn(
                                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border",
                                                            cfg.pill
                                                        )}>
                                                            <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                                                            {cfg.label}
                                                        </div>
                                                    </td>

                                                    {/* Amount */}
                                                    <td className="px-8 py-5">
                                                        <span className="text-sm font-black text-[#020617]">{formatAmount(payout.amount, payout.currency)}</span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-8 py-5 text-right">
                                                        <button
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-black text-slate-600 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all group-hover:shadow-sm"
                                                            onClick={(e) => { e.stopPropagation(); setSelectedPayout(payout); }}
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            View
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
                        <div className="px-8 py-5 bg-slate-50/30 flex items-center justify-between border-t border-slate-50">
                            <p className="text-[11px] font-bold text-slate-400">
                                Showing <span className="text-slate-900">{filtered.length}</span> of <span className="text-slate-900">{payouts.length}</span> payouts
                            </p>
                            <div className="flex items-center gap-1">
                                <span className={cn("w-2 h-2 rounded-full bg-amber-400")} />
                                <span className="text-[10px] font-bold text-slate-400">{processing} pending review</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
