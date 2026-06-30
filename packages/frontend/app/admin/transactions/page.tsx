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

  const IT: React.CSSProperties = { fontFamily: "'Inter Tight',sans-serif" };

  if (loading) {
    return (
      <AdminShell title="Transactions" subtitle="Platform ledger">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-6 h-6 border-[2.5px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>Loading transactions…</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Transactions" subtitle="Complete ledger of all platform transactions">

      {/* ── Page header ── */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Platform Ledger</p>
        <h1 style={{ ...IT, fontSize: '26px', fontWeight: '900', color: '#0f172a', letterSpacing: '-.03em' }}>All Transactions</h1>
        <p style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '5px' }}>{allTxns.length.toLocaleString()} trades recorded · click any row for details</p>
      </div>

      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Total Volume</p>
          </div>
          <p style={{ ...IT, fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-.03em' }}>{formatCurrencyMap(stats.volume_by_currency)}</p>
          <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', background: '#f0fdf4', color: '#16a34a', marginTop: '6px' }}>↑ 8.4%</span>
        </div>
        <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
          <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Platform Fees</p>
          <p style={{ ...IT, fontSize: '24px', fontWeight: '800', color: '#10b981', letterSpacing: '-.03em' }}>{formatCurrencyMap(stats.fees_by_currency)}</p>
          <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', background: '#f0fdf4', color: '#16a34a', marginTop: '6px' }}>↑ 5.2%</span>
        </div>
        <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
          <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Total Trades</p>
          <p style={{ ...IT, fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-.03em' }}>{(stats.total_transactions ?? 0).toLocaleString()}</p>
          <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', background: '#eff6ff', color: '#2563eb', marginTop: '6px' }}>All time</span>
        </div>
        <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '18px 20px' }}>
          <p style={{ fontSize: '10.5px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Open Disputes</p>
          <p style={{ ...IT, fontSize: '24px', fontWeight: '800', color: '#e11d48', letterSpacing: '-.03em' }}>{(stats.disputed_transactions ?? 0).toLocaleString()}</p>
          <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', background: '#fff1f2', color: '#e11d48', marginTop: '6px' }}>Needs review</span>
        </div>
      </div>

      {/* ── Search + filter chips ── */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div style={{ position: 'relative', flex: '1', maxWidth: '340px' }}>
          <Search style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search txn code, safetag…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', height: '40px', paddingLeft: '38px', paddingRight: '14px', background: '#f7f8f9', border: '1.5px solid #edeff3', borderRadius: '10px', fontSize: '13.5px', fontWeight: '500', color: '#0f172a', outline: 'none' }}
            className="focus:border-[#10b981] focus:bg-white"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setPage(1); }}
              style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: '1.5px solid', whiteSpace: 'nowrap', transition: 'all .14s',
                ...(statusFilter === f.key ? { background: '#0f172a', color: '#fff', borderColor: '#0f172a' } : { background: '#fff', color: '#64748b', borderColor: '#e9eaec' }) }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-[12px] font-semibold text-[#64748b] hover:text-[#0f172a] transition-colors" style={{ padding: '6px 12px', border: '1.5px solid #e9eaec', borderRadius: '999px', background: '#fff' }}>
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto' }}>{filtered.length.toLocaleString()} results</span>
      </div>

      {/* ── Table card ── */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        <div className="overflow-x-auto admin-area">
          <div style={{ minWidth: '860px' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 140px 110px 90px 110px', gap: '10px', padding: '11px 24px', background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
              {["TXN Code", "Buyer", "Seller", "Amount", "Fee", "Status", "Date"].map(h => (
                <p key={h} style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</p>
              ))}
            </div>
            {/* Rows */}
            <div style={{ padding: '0 24px' }}>
              {paginated.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', padding: '64px 0', textAlign: 'center' }}>No transactions found</p>
              ) : paginated.map((t: any) => {
                const cfg = STATUS_CONFIG[t.status] ?? { label: t.status, chip: "chip-slate" };
                const date = new Date(t.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                return (
                  <Link key={t.id} href={`/admin/transactions/${t.id}`}>
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 140px 110px 90px 110px', gap: '10px', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                      className="hover:bg-[#fafafa] transition-colors">
                      <div className="flex items-center gap-1.5">
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                        <code style={{ ...IT, fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{t.txn_code}</code>
                      </div>
                      <SafetagCell safetag={t.buyer?.safetag} name={`${t.buyer?.first_name ?? ""} ${t.buyer?.last_name ?? ""}`.trim()} />
                      <SafetagCell safetag={t.seller?.safetag} name={`${t.seller?.first_name ?? ""} ${t.seller?.last_name ?? ""}`.trim()} />
                      <div>
                        <p style={{ ...IT, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{Number(t.total_amount).toLocaleString()} {t.currency}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#10b981' }}>{Number(t.fee_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} {t.currency}</p>
                      </div>
                      <div><span className={`adm-chip ${cfg.chip}`}>{cfg.label}</span></div>
                      <p style={{ fontSize: '11.5px', color: '#64748b' }}>{date}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#f3f4f6]" style={{ padding: '14px 24px' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: '#64748b', background: '#fff', border: '1px solid #e9eaec', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}
              className="disabled:opacity-40">← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: '#0f172a', background: '#f7f8f9', border: '1px solid #e9eaec', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}
              className="disabled:opacity-40">Next →</button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function formatCurrencyMap(map: Record<string, number> | undefined): string {
  if (!map) return "—";
  const entries = Object.entries(map).filter(([, v]) => v > 0);
  if (!entries.length) return "0";
  return entries.map(([c, v]) => `${Math.round(v).toLocaleString()} ${c}`).join(" · ");
}

function SafetagCell({ safetag, name }: { safetag?: string; name?: string }) {
  const initials = (safetag || "?").replace("@", "").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#64748b', flexShrink: 0 }}>
        {initials}
      </div>
      <p style={{ fontSize: '12.5px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safetag || "—"}</p>
    </div>
  );
}
