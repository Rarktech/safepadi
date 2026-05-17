"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
    Search,
    ArrowLeft,
    ArrowRight,
    ChevronDown,
    MoreHorizontal,
    TrendingUp,
    Repeat,
    Activity,
    Coins,
    X,
    CalendarDays,
} from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    PENDING_SELLER_ACCEPTANCE: { label: "Pending",   color: "bg-amber-50 text-amber-600 border-amber-100" },
    ACCEPTED:                  { label: "Accepted",  color: "bg-sky-50 text-sky-600 border-sky-100" },
    PAID:                      { label: "Paid",      color: "bg-blue-50 text-blue-600 border-blue-100" },
    AWAITING_PROOF:            { label: "Awaiting",  color: "bg-purple-50 text-purple-600 border-purple-100" },
    COMPLETED_BY_SELLER:       { label: "Delivered", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
    FINALIZED:                 { label: "Completed", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    DISPUTED:                  { label: "Disputed",  color: "bg-rose-50 text-rose-600 border-rose-100" },
    DECLINED:                  { label: "Declined",       color: "bg-slate-100 text-slate-500 border-slate-200" },
    CANCELLED:                 { label: "Cancelled",      color: "bg-slate-100 text-slate-400 border-slate-200" },
    RETURN_PENDING:            { label: "Return Pending", color: "bg-amber-50 text-amber-600 border-amber-200" },
    RESOLVED_SPLIT:            { label: "Split Resolved", color: "bg-teal-50 text-teal-600 border-teal-100" },
};

const CURRENCY_FLAG: Record<string, string> = { NGN: "🇳🇬", USD: "🇺🇸", USDT: "🪙" };

const CURRENCY_CONFIG: Record<string, { symbol: string; color: string; bg: string }> = {
    USDT: { symbol: "$",  color: "text-emerald-500", bg: "bg-emerald-50" },
    NGN:  { symbol: "₦",  color: "text-blue-500",    bg: "bg-blue-50" },
    USD:  { symbol: "$",  color: "text-blue-600",    bg: "bg-blue-50" },
};

const PAGE_SIZE = 10;

export default function AdminTransactions() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currencyFilter, setCurrencyFilter] = useState("all");
    const [volCurrency, setVolCurrency] = useState("USD");
    const [feesCurrency, setFeesCurrency] = useState("USD");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${API_URL}/admin/transactions`, {
                    headers: { "ngrok-skip-browser-warning": "true" },
                });
                setData(res.data);
                const volKeys = Object.keys(res.data?.stats?.volume_by_currency || {});
                if (volKeys.length > 0) setVolCurrency(volKeys[0]);
                const feesKeys = Object.keys(res.data?.stats?.fees_by_currency || {});
                if (feesKeys.length > 0) setFeesCurrency(feesKeys[0]);
            } catch (err: any) {
                console.error("❌ Failed to fetch transactions:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const stats = data?.stats || {};
    const allTxns: any[] = data?.transactions || [];

    const filtered = useMemo(() => {
        let list = allTxns;
        if (statusFilter !== "all") {
            const activeStatuses = ["PENDING_SELLER_ACCEPTANCE", "ACCEPTED", "PAID", "AWAITING_PROOF", "COMPLETED_BY_SELLER"];
            if (statusFilter === "ongoing") list = list.filter(t => activeStatuses.includes(t.status));
            else if (statusFilter === "completed") list = list.filter(t => t.status === "FINALIZED");
            else if (statusFilter === "disputed") list = list.filter(t => t.status === "DISPUTED");
            else if (statusFilter === "cancelled") list = list.filter(t => t.status === "CANCELLED");
        }
        if (currencyFilter !== "all") {
            list = list.filter(t => t.currency === currencyFilter.toUpperCase());
        }
        if (search.trim()) {
            const s = search.toLowerCase();
            list = list.filter(t =>
                t.txn_code?.toLowerCase().includes(s) ||
                t.product_name?.toLowerCase().includes(s) ||
                t.buyer?.safetag?.toLowerCase().includes(s) ||
                t.seller?.safetag?.toLowerCase().includes(s)
            );
        }
        if (dateRange?.from) {
            const from = new Date(dateRange.from);
            from.setHours(0, 0, 0, 0);
            list = list.filter(t => new Date(t.created_at) >= from);
        }
        if (dateRange?.to) {
            const to = new Date(dateRange.to);
            to.setHours(23, 59, 59, 999);
            list = list.filter(t => new Date(t.created_at) <= to);
        }
        return list;
    }, [allTxns, statusFilter, currencyFilter, search, dateRange]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const clearFilters = () => {
        setSearch("");
        setStatusFilter("all");
        setCurrencyFilter("all");
        setDateRange(undefined);
        setPage(1);
    };

    const hasFilters = !!(search || statusFilter !== "all" || currencyFilter !== "all" || dateRange?.from);

    if (loading) {
        return (
            <div className="flex bg-slate-50 min-h-screen">
                <AdminSidebar />
                <div className="flex-1 p-8 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 border-8 border-slate-100 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                        <p className="font-black text-slate-400 uppercase tracking-[0.3em] text-[10px]">Loading Ledger</p>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="flex bg-slate-50 min-h-screen">
            <AdminSidebar />

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-7xl mx-auto">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-2">Transaction Ledger</h1>
                            <p className="text-xs font-bold text-slate-400">Complete overview of all platform transactions</p>
                        </div>
                        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-[11px] font-black text-slate-900 leading-none mb-1">Admin</p>
                                <p className="text-[9px] font-bold text-slate-400 leading-none">Safeeely Platform</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-md">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=d1d5db" alt="Admin" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>

                    {/* KPI Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        <StatCard
                            title="Total Transactions"
                            value={stats.total_transactions?.toLocaleString() ?? "0"}
                            sub={`${stats.active_transactions ?? 0} active right now`}
                            icon={<Repeat className="w-5 h-5" />}
                            iconColor="text-sky-500 bg-sky-50"
                        />
                        <CurrencyStatCard
                            title="Total Volume"
                            value={stats.volume_by_currency?.[volCurrency] ?? 0}
                            currency={volCurrency}
                            availableCurrencies={Object.keys(stats.volume_by_currency || {})}
                            onCurrencyChange={setVolCurrency}
                            trend="+12.4%"
                            isUp={true}
                        />
                        <CurrencyStatCard
                            title="Platform Fees Earned"
                            value={stats.fees_by_currency?.[feesCurrency] ?? 0}
                            currency={feesCurrency}
                            availableCurrencies={Object.keys(stats.fees_by_currency || {})}
                            onCurrencyChange={setFeesCurrency}
                            trend="+8.2%"
                            isUp={true}
                        />
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm ring-1 ring-slate-50 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">Status Breakdown</p>
                            <div className="space-y-2">
                                <StatusPill label="Ongoing" count={stats.active_transactions ?? 0} color="bg-sky-500" />
                                <StatusPill label="Completed" count={stats.completed_transactions ?? 0} color="bg-emerald-500" />
                                <StatusPill label="Disputed" count={stats.disputed_transactions ?? 0} color="bg-rose-500" />
                            </div>
                        </div>
                    </div>

                    {/* Table Card */}
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden ring-1 ring-slate-100">

                        {/* Table Controls */}
                        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <h3 className="text-xl font-black text-[#020617] tracking-tight">All Transactions</h3>
                                <span className="text-[10px] font-black text-slate-400 bg-slate-50 rounded-xl px-3 py-1">
                                    {filtered.length.toLocaleString()} results
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                {/* Search */}
                                <div className="relative flex-1 md:flex-none">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search TXN, product, safetag..."
                                        value={search}
                                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                                        className="h-11 pl-11 pr-4 bg-slate-50 border-none rounded-2xl text-[11px] font-bold w-full md:w-[260px] outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>

                                {/* Status Filter */}
                                <div className="relative">
                                    <select
                                        value={statusFilter}
                                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                                        className="h-11 pl-4 pr-8 bg-slate-50 border-none rounded-2xl text-[11px] font-bold outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="ongoing">🔄 Ongoing</option>
                                        <option value="completed">✅ Completed</option>
                                        <option value="disputed">⚠️ Disputed</option>
                                        <option value="cancelled">❌ Cancelled</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                </div>

                                {/* Currency Filter */}
                                <div className="relative">
                                    <select
                                        value={currencyFilter}
                                        onChange={e => { setCurrencyFilter(e.target.value); setPage(1); }}
                                        className="h-11 pl-4 pr-8 bg-slate-50 border-none rounded-2xl text-[11px] font-bold outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
                                    >
                                        <option value="all">All Currencies</option>
                                        <option value="ngn">🇳🇬 NGN</option>
                                        <option value="usd">🇺🇸 USD</option>
                                        <option value="usdt">🪙 USDT</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                </div>

                                {/* Date Range Picker */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button className={cn(
                                            "h-11 px-4 flex items-center gap-2 rounded-2xl text-[11px] font-bold transition-all",
                                            dateRange?.from
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                        )}>
                                            <CalendarDays className="w-4 h-4" />
                                            {dateRange?.from ? (
                                                dateRange.to
                                                    ? `${dateRange.from.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${dateRange.to.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                                                    : dateRange.from.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                            ) : "Date Range"}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 rounded-3xl border border-slate-100 shadow-2xl overflow-hidden" align="end">
                                        <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Date Range</p>
                                            {dateRange?.from && (
                                                <button
                                                    onClick={() => setDateRange(undefined)}
                                                    className="text-[9px] font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest transition-colors"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        <Calendar
                                            mode="range"
                                            selected={dateRange}
                                            onSelect={(range) => { setDateRange(range); setPage(1); }}
                                            numberOfMonths={2}
                                            disabled={{ after: new Date() }}
                                            className="p-4"
                                        />
                                    </PopoverContent>
                                </Popover>

                                {hasFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="h-11 px-4 flex items-center gap-2 rounded-2xl border border-slate-200 text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition-all"
                                    >
                                        <X className="w-3 h-3" /> Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto scrollbar-hide">
                            <table className="w-full text-left min-w-[1100px]">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">TXN Code</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Product</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Buyer</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Seller</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fee</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginated.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-8 py-20 text-center text-slate-400 text-xs font-bold">
                                                No transactions found.
                                            </td>
                                        </tr>
                                    ) : paginated.map((t: any) => {
                                        const statusCfg = STATUS_CONFIG[t.status] || { label: t.status, color: "bg-slate-100 text-slate-500 border-slate-200" };
                                        const flag = CURRENCY_FLAG[t.currency] || "";
                                        const date = new Date(t.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50/70 transition-all duration-300 group">
                                                <td className="px-8 py-5">
                                                    <span className="text-[10px] font-black text-slate-500 font-mono tracking-wide">{t.txn_code}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-xs font-black text-[#020617] line-clamp-1 max-w-[140px] block">
                                                        {t.product_name}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <SafetagCell safetag={t.buyer?.safetag} name={`${t.buyer?.first_name || ''} ${t.buyer?.last_name || ''}`.trim()} />
                                                </td>
                                                <td className="px-8 py-5">
                                                    <SafetagCell safetag={t.seller?.safetag} name={`${t.seller?.first_name || ''} ${t.seller?.last_name || ''}`.trim()} />
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-xs font-black text-[#020617]">{flag}{Number(t.total_amount).toLocaleString()} {t.currency}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-xs font-bold text-slate-500">{Number(t.fee_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t.currency}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <Badge className={cn(
                                                        "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-none border",
                                                        statusCfg.color
                                                    )}>
                                                        {statusCfg.label}
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-[10px] font-bold text-slate-400">{date}</span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <Link href={`/admin/transactions/${t.id}`}>
                                                        <button className="w-9 h-9 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all ml-auto">
                                                            <MoreHorizontal className="w-5 h-5" />
                                                        </button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer / Pagination */}
                        <div className="p-8 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-50">
                            <p className="text-[11px] font-bold text-slate-400">
                                Showing <span className="text-slate-900">{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="text-slate-900">{filtered.length}</span> Entries
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    const p = i + Math.max(1, page - 2);
                                    if (p > totalPages) return null;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={cn(
                                                "h-10 px-4 flex items-center justify-center rounded-xl text-[11px] font-black transition-all",
                                                p === page
                                                    ? "bg-[#020617] text-white shadow-xl shadow-slate-200"
                                                    : "border border-slate-100 bg-white text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || totalPages === 0}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ title, value, sub, icon, iconColor, small = false }: any) {
    return (
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm ring-1 ring-slate-50 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 cursor-pointer">
            <div className="flex items-start justify-between mb-6">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", iconColor)}>
                    {icon}
                </div>
            </div>
            <h4 className={cn("font-black text-[#020617] tracking-tighter leading-tight mb-2", small ? "text-lg break-all" : "text-3xl")}>{value}</h4>
            <p className="text-[10px] font-bold text-slate-400">{sub}</p>
        </div>
    );
}

function SafetagCell({ safetag, name }: { safetag?: string; name?: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${safetag}&backgroundColor=f1f5f9`}
                    alt={safetag}
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-[#020617] leading-none">{name || "—"}</span>
                <span className="text-[9px] font-bold text-slate-400 leading-none mt-0.5">{safetag}</span>
            </div>
        </div>
    );
}

function StatusPill({ label, count, color }: { label: string; count: number; color: string }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", color)} />
                <span className="text-[11px] font-bold text-slate-500">{label}</span>
            </div>
            <span className="text-[11px] font-black text-[#020617]">{count.toLocaleString()}</span>
        </div>
    );
}

function CurrencyStatCard({ title, value, currency, availableCurrencies, onCurrencyChange, trend, isUp }: any) {
    const config = CURRENCY_CONFIG[currency] || { symbol: currency, color: "text-slate-600", bg: "bg-slate-50" };
    return (
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm ring-1 ring-slate-50 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 cursor-pointer">
            <div className="flex items-center justify-between mb-6">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500", config.bg, config.color)}>
                    <Coins className="w-6 h-6" />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-xl">
                            {currency} <ChevronDown className="w-3 h-3" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl p-2 w-32">
                        {(availableCurrencies || []).map((c: string) => (
                            <DropdownMenuItem
                                key={c}
                                onClick={() => onCurrencyChange(c)}
                                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer mb-1 last:mb-0"
                            >
                                {CURRENCY_FLAG[c] || ""} {c}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</p>
            <h4 className="text-3xl font-black text-[#020617] tracking-tighter flex items-center gap-1">
                <span className="text-slate-300 font-medium">{config.symbol}</span>
                {Math.round(value).toLocaleString()}
            </h4>
            <div className="mt-4 flex items-center gap-1">
                <span className={cn("text-[10px] font-black flex items-center gap-0.5", isUp ? "text-emerald-500" : "text-rose-500")}>
                    <TrendingUp className={cn("w-3", !isUp && "rotate-180")} />
                    {trend}
                </span>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest ml-1">Growth</span>
            </div>
        </div>
    );
}
