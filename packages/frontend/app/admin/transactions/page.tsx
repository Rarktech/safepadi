"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Search, ArrowLeft, ArrowRight, ChevronDown, MoreHorizontal, X, CalendarDays, Repeat, Coins } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import Link from "next/link";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const STATUS_CONFIG: Record<string, { label: string; chip: string }> = {
  PENDING_SELLER_ACCEPTANCE: { label: "Pending",   chip: "chip-amber" },
  ACCEPTED:                  { label: "Accepted",  chip: "chip-blue" },
  PAID:                      { label: "Paid",      chip: "chip-blue" },
  AWAITING_PROOF:            { label: "Awaiting",  chip: "chip-purple" },
  COMPLETED_BY_SELLER:       { label: "Delivered", chip: "chip-blue" },
  FINALIZED:                 { label: "Completed", chip: "chip-green" },
  DISPUTED:                  { label: "Disputed",  chip: "chip-red" },
  DECLINED:                  { label: "Declined",  chip: "chip-slate" },
  CANCELLED:                 { label: "Cancelled", chip: "chip-slate" },
  RETURN_PENDING:            { label: "Return",    chip: "chip-amber" },
  RESOLVED_SPLIT:            { label: "Split",     chip: "chip-green" },
};

const CURRENCY_FLAG: Record<string, string> = { NGN: "🇳🇬", USD: "🇺🇸", USDT: "🪙" };
const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { key: "all",       label: "All" },
  { key: "ongoing",   label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "disputed",  label: "Disputed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function AdminTransactions() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState(1);

  useEffect(() => {
    axios.get(`${API_URL}/admin/transactions`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then(res => {
        setData(res.data);
        const volKeys = Object.keys(res.data?.stats?.volume_by_currency || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allTxns: any[] = data?.transactions ?? [];
  const stats = data?.stats ?? {};

  const filtered = useMemo(() => {
    let list = allTxns;
    if (statusFilter !== "all") {
      const active = ["PENDING_SELLER_ACCEPTANCE", "ACCEPTED", "PAID", "AWAITING_PROOF", "COMPLETED_BY_SELLER"];
      if (statusFilter === "ongoing")   list = list.filter(t => active.includes(t.status));
      else if (statusFilter === "completed") list = list.filter(t => t.status === "FINALIZED");
      else if (statusFilter === "disputed")  list = list.filter(t => t.status === "DISPUTED");
      else if (statusFilter === "cancelled") list = list.filter(t => t.status === "CANCELLED");
    }
    if (currencyFilter !== "all") list = list.filter(t => t.currency === currencyFilter.toUpperCase());
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
      const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
      list = list.filter(t => new Date(t.created_at) >= from);
    }
    if (dateRange?.to) {
      const to = new Date(dateRange.to); to.setHours(23, 59, 59, 999);
      list = list.filter(t => new Date(t.created_at) <= to);
    }
    return list;
  }, [allTxns, statusFilter, currencyFilter, search, dateRange]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = !!(search || statusFilter !== "all" || currencyFilter !== "all" || dateRange?.from);

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setCurrencyFilter("all"); setDateRange(undefined); setPage(1);
  };

  if (loading) {
    return (
      <AdminShell title="Transactions" subtitle="All platform transactions">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Transactions" subtitle="Complete ledger of all platform transactions">

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiBox label="Total Transactions" value={(stats.total_transactions ?? 0).toLocaleString()} sub={`${stats.active_transactions ?? 0} active`} iconColor="#2563eb" icon={<Repeat className="w-5 h-5" />} />
        <KpiBox label="Total Volume" value={formatCurrencyMap(stats.volume_by_currency)} sub="Across currencies" iconColor="#10b981" icon={<Coins className="w-5 h-5" />} />
        <KpiBox label="Platform Fees" value={formatCurrencyMap(stats.fees_by_currency)} sub="Earned" iconColor="#d97706" icon={<Coins className="w-5 h-5" />} />
        <div className="bg-white rounded-2xl border border-[#e9eaec] p-5">
          <p className="adm-section-label mb-3">Status Breakdown</p>
          <div className="space-y-2">
            {[
              { label: "Ongoing",   count: stats.active_transactions ?? 0,    color: "#2563eb" },
              { label: "Completed", count: stats.completed_transactions ?? 0, color: "#10b981" },
              { label: "Disputed",  count: stats.disputed_transactions ?? 0,  color: "#e11d48" },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[12px] text-[#64748b]">{s.label}</span>
                </div>
                <span className="text-[12px] font-bold text-[#0f172a]">{s.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        {/* Controls */}
        <div className="px-6 py-4 border-b border-[#f3f4f6]">
          {/* Status filter chips */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setPage(1); }}
                className="px-4 py-1.5 rounded-full text-[12px] font-semibold border-[1.5px] transition-colors"
                style={statusFilter === f.key
                  ? { background: "#0f172a", color: "#fff", borderColor: "#0f172a" }
                  : { background: "#fff", color: "#64748b", borderColor: "#e9eaec" }
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search + filters row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="Search TXN code, product, safetag..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="h-9 w-full pl-9 pr-3 text-[12.5px] outline-none rounded-lg"
                style={{ background: "#f7f8f9", border: "1px solid #e9eaec", color: "#0f172a" }}
              />
            </div>

            {/* Currency toggle */}
            <div
              className="flex items-center rounded-full p-0.5 gap-0.5"
              style={{ background: "#f1f5f9" }}
            >
              {["all", "NGN", "USD", "USDT"].map(c => (
                <button
                  key={c}
                  onClick={() => { setCurrencyFilter(c === "all" ? "all" : c.toLowerCase()); setPage(1); }}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                  style={currencyFilter === (c === "all" ? "all" : c.toLowerCase())
                    ? { background: "#fff", color: "#0f172a", boxShadow: "0 1px 4px rgba(15,23,42,.1)" }
                    : { color: "#64748b" }
                  }
                >
                  {c === "all" ? "All" : (CURRENCY_FLAG[c] ?? "") + " " + c}
                </button>
              ))}
            </div>

            {/* Date range */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-9 px-3 flex items-center gap-2 rounded-lg text-[12px] font-semibold transition-colors"
                  style={dateRange?.from
                    ? { background: "#f0fdf4", border: "1px solid #d1fae5", color: "#059669" }
                    : { background: "#f7f8f9", border: "1px solid #e9eaec", color: "#64748b" }
                  }
                >
                  <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {dateRange?.from ? (
                    dateRange.to
                      ? `${dateRange.from.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${dateRange.to.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                      : dateRange.from.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                  ) : "Date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl border-[#e9eaec] shadow-xl" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={r => { setDateRange(r); setPage(1); }}
                  numberOfMonths={2}
                  disabled={{ after: new Date() }}
                  className="p-3"
                />
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="h-9 px-3 flex items-center gap-1.5 rounded-lg text-[12px] font-semibold text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
                style={{ border: "1px solid #e9eaec" }}
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}

            <span className="text-[11px] text-[#94a3b8] ml-auto">{filtered.length.toLocaleString()} results</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto admin-area">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[#f3f4f6]">
                {["TXN Code", "Product", "Buyer", "Seller", "Amount", "Fee", "Status", "Date", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left adm-section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center text-[13px] text-[#94a3b8]">
                    No transactions found
                  </td>
                </tr>
              ) : paginated.map((t: any) => {
                const cfg = STATUS_CONFIG[t.status] ?? { label: t.status, chip: "chip-slate" };
                const flag = CURRENCY_FLAG[t.currency] ?? "";
                const date = new Date(t.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                return (
                  <tr key={t.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                    <td className="px-5 py-4">
                      <code className="text-[11px] font-bold text-[#0f172a]">{t.txn_code}</code>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[12px] font-semibold text-[#0f172a] line-clamp-1 max-w-[120px] block">{t.product_name}</span>
                    </td>
                    <td className="px-5 py-4"><SafetagCell safetag={t.buyer?.safetag} name={`${t.buyer?.first_name ?? ""} ${t.buyer?.last_name ?? ""}`.trim()} /></td>
                    <td className="px-5 py-4"><SafetagCell safetag={t.seller?.safetag} name={`${t.seller?.first_name ?? ""} ${t.seller?.last_name ?? ""}`.trim()} /></td>
                    <td className="px-5 py-4">
                      <span className="text-[12px] font-bold text-[#0f172a]">{flag}{Number(t.total_amount).toLocaleString()} {t.currency}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[11px] text-[#64748b]">{Number(t.fee_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t.currency}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`adm-chip ${cfg.chip}`}>{cfg.label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[11px] text-[#94a3b8]">{date}</span>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/transactions/${t.id}`}>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-[#f3f4f6] flex items-center justify-between">
          <p className="text-[12px] text-[#64748b]">
            Showing <span className="font-semibold text-[#0f172a]">{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-[#0f172a]">{filtered.length}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e9eaec] text-[#64748b] disabled:opacity-40 hover:bg-[#f1f5f9] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + Math.max(1, page - 2);
              if (p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[12px] font-semibold transition-colors"
                  style={p === page
                    ? { background: "#0f172a", color: "#fff" }
                    : { border: "1px solid #e9eaec", color: "#64748b", background: "#fff" }
                  }
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e9eaec] text-[#64748b] disabled:opacity-40 hover:bg-[#f1f5f9] transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function KpiBox({ label, value, sub, icon, iconColor }: any) {
  return (
    <div className="bg-white rounded-2xl border border-[#e9eaec] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="adm-section-label">{label}</p>
        <div className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: `${iconColor}18`, color: iconColor }}>
          {icon}
        </div>
      </div>
      <p className="font-tight text-2xl font-bold text-[#0f172a]">{value}</p>
      {sub && <p className="text-[11px] text-[#94a3b8] mt-0.5">{sub}</p>}
    </div>
  );
}

function formatCurrencyMap(map: Record<string, number> | undefined): string {
  if (!map) return "—";
  const entries = Object.entries(map).filter(([, v]) => v > 0);
  if (!entries.length) return "0";
  return entries.map(([c, v]) => `${Math.round(v).toLocaleString()} ${c}`).join(" · ");
}

function SafetagCell({ safetag, name }: { safetag?: string; name?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full overflow-hidden border border-[#e9eaec] shrink-0">
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${safetag}&backgroundColor=f1f5f9`} alt="" className="w-full h-full object-cover" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-[#0f172a] leading-none">{name || "—"}</p>
        <p className="text-[10px] text-[#94a3b8] leading-none mt-0.5">{safetag}</p>
      </div>
    </div>
  );
}
