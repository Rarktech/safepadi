"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  TrendingUp, Users, ShoppingCart, Shield, CreditCard, FileCheck,
  Globe, MessageCircle, Coins, ChevronDown,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from "recharts";
import AdminShell from "@/components/admin/AdminShell";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const CURRENCY_CONFIG: Record<string, { symbol: string }> = {
  USDT: { symbol: "$" }, NGN: { symbol: "₦" }, USD: { symbol: "$" }, GBP: { symbol: "£" },
};

const IT: React.CSSProperties = { fontFamily: "'Inter Tight',sans-serif" };

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [volCurrency, setVolCurrency] = useState("USDT");
  const [profitCurrency, setProfitCurrency] = useState("USDT");

  useEffect(() => {
    axios.get(`${API_URL}/admin/stats`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then(res => {
        setStats(res.data);
        const volKeys = Object.keys(res.data.volume_by_currency || {});
        if (volKeys.length) setVolCurrency(volKeys[0]);
        const profitKeys = Object.keys(res.data.profit_by_currency || {});
        if (profitKeys.length) setProfitCurrency(profitKeys[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminShell title="Dashboard" subtitle="Platform overview">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-7 h-7 border-[2.5px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>Loading dashboard…</p>
        </div>
      </AdminShell>
    );
  }

  const availableVolCurrencies = Object.keys(stats?.volume_by_currency || {});
  const availableProfitCurrencies = Object.keys(stats?.profit_by_currency || {});

  const attentionItems = [
    {
      label: "Pending KYC",
      sub: "Identity docs awaiting review",
      count: stats?.pending_kyc_count ?? 0,
      icon: FileCheck,
      borderColor: "#f59e0b",
      iconBg: "#fffbeb",
      iconColor: "#d97706",
      badgeBg: "#fffbeb",
      badgeColor: "#d97706",
      badgeBorder: "#fde68a",
      badgeText: "Review →",
      href: "/admin/kyc",
    },
    {
      label: "Open Disputes",
      sub: "Cases awaiting resolution",
      count: stats?.open_disputes_count ?? 0,
      icon: Shield,
      borderColor: "#e11d48",
      iconBg: "#fff1f2",
      iconColor: "#e11d48",
      badgeBg: "#fff1f2",
      badgeColor: "#e11d48",
      badgeBorder: "#fecdd3",
      badgeText: "Review →",
      href: "/admin/disputes",
    },
    {
      label: "Pending Payouts",
      sub: "Withdrawals queued for processing",
      count: stats?.pending_payouts_count ?? 0,
      icon: CreditCard,
      borderColor: "#2563eb",
      iconBg: "#eff6ff",
      iconColor: "#2563eb",
      badgeBg: "#eff6ff",
      badgeColor: "#2563eb",
      badgeBorder: "#bfdbfe",
      badgeText: "Process →",
      href: "/admin/payouts",
    },
  ];

  return (
    <AdminShell title="Dashboard" subtitle="Real-time view of platform activity">

      {/* ── Platform KPIs ── */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Platform metrics
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total Volume"
            value={`${CURRENCY_CONFIG[volCurrency]?.symbol ?? ""}${Math.round(stats?.volume_by_currency?.[volCurrency] ?? 0).toLocaleString()}`}
            iconBg="#f0fdf4"
            iconColor="#10b981"
            icon={<Coins className="w-[15px] h-[15px]" />}
            chipColor="#f0fdf4"
            chipText="#16a34a"
            trend="↑ 12.4%"
            extra={
              availableVolCurrencies.length > 1 ? (
                <CurrencyPicker currencies={availableVolCurrencies} value={volCurrency} onChange={setVolCurrency} />
              ) : undefined
            }
          />
          <KpiCard
            label="Platform Profit"
            value={`${CURRENCY_CONFIG[profitCurrency]?.symbol ?? ""}${Math.round(stats?.profit_by_currency?.[profitCurrency] ?? 0).toLocaleString()}`}
            iconBg="#ecfdf5"
            iconColor="#059669"
            icon={<TrendingUp className="w-[15px] h-[15px]" />}
            chipColor="#f0fdf4"
            chipText="#16a34a"
            trend="↑ 8.2%"
            extra={
              availableProfitCurrencies.length > 1 ? (
                <CurrencyPicker currencies={availableProfitCurrencies} value={profitCurrency} onChange={setProfitCurrency} />
              ) : undefined
            }
          />
          <KpiCard
            label="New Users"
            value={(stats?.new_customers_today ?? 0).toLocaleString()}
            iconBg="#fdf4ff"
            iconColor="#9333ea"
            icon={<Users className="w-[15px] h-[15px]" />}
            chipColor="#fdf4ff"
            chipText="#9333ea"
            trend="↑ 15.1%"
            statColor="#9333ea"
          />
          <KpiCard
            label="Total Orders"
            value={(stats?.total_transactions ?? 0).toLocaleString()}
            iconBg="#fffbeb"
            iconColor="#d97706"
            icon={<ShoppingCart className="w-[15px] h-[15px]" />}
            chipColor="#fffbeb"
            chipText="#d97706"
            trend="↑ 4.3%"
          />
        </div>
      </div>

      {/* ── Needs Attention ── */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Needs attention
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {attentionItems.map(item => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className="bg-white rounded-2xl border border-[#e9eaec] p-5 text-left adm-card-lift flex flex-col"
              style={{ borderLeft: `3px solid ${item.borderColor}` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: item.iconBg, color: item.iconColor }}
                >
                  <item.icon className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <span style={{ fontSize: '10px', fontWeight: '700', color: item.badgeColor, background: item.badgeBg, border: `1px solid ${item.badgeBorder}`, padding: '3px 8px', borderRadius: '999px' }}>
                  {item.badgeText}
                </span>
              </div>
              <p style={{ ...IT, fontSize: '36px', fontWeight: '800', color: '#0f172a', letterSpacing: '-.04em', lineHeight: '1', marginBottom: '4px' }}>
                {item.count}
              </p>
              <p style={{ fontSize: '13px', fontWeight: '600', color: item.iconColor }}>{item.label}</p>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{item.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Revenue Trajectory + Market Reach ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-[18px]">
        {/* Chart card */}
        <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '24px 26px' }}>
          <div className="flex items-start justify-between mb-1.5">
            <div>
              <h2 style={{ ...IT, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Revenue Trajectory</h2>
              <p style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px' }}>Monthly transaction volume · all channels</p>
            </div>
            <span className="adm-chip chip-green" style={{ fontSize: '10.5px' }}>↑ 15.2% this month</span>
          </div>

          {/* Mini-stats strip */}
          <div className="flex gap-5 my-3.5 p-3 rounded-[10px]" style={{ background: '#f8fafc' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', marginBottom: '2px' }}>Transactions (7d)</p>
              <p style={{ ...IT, fontSize: '18px', fontWeight: '700', color: '#2563eb', letterSpacing: '-.02em' }}>
                {(stats?.last_7d_transactions ?? 0).toLocaleString()}
              </p>
            </div>
            <div style={{ width: '1px', background: '#e9eaec' }} />
            <div>
              <p style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', marginBottom: '2px' }}>New Users (7d)</p>
              <p style={{ ...IT, fontSize: '18px', fontWeight: '700', color: '#9333ea', letterSpacing: '-.02em' }}>
                {(stats?.last_7d_new_users ?? 0).toLocaleString()}
              </p>
            </div>
            <div style={{ width: '1px', background: '#e9eaec' }} />
            <div>
              <p style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', marginBottom: '2px' }}>Open Disputes</p>
              <p style={{ ...IT, fontSize: '18px', fontWeight: '700', color: '#e11d48', letterSpacing: '-.02em' }}>
                {(stats?.open_disputes_count ?? 0).toLocaleString()}
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats?.chart_data ?? []} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="6 6" stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                tickFormatter={(v: string) => v?.slice(0, 3) ?? v}
                dy={10}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e9eaec", boxShadow: "0 4px 16px rgba(15,23,42,.1)", fontSize: 12 }}
                cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                dataKey="value"
                type="linear"
                fill="url(#adminGrad)"
                stroke="#10b981"
                strokeWidth={2.5}
                activeDot={{ r: 6, stroke: "white", strokeWidth: 3, fill: "#10b981" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Market Reach dark card */}
        <div className="rounded-2xl flex flex-col" style={{ background: '#0f172a', padding: '24px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ ...IT, fontSize: '15px', fontWeight: '800', color: '#fff' }}>Market Reach</h2>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#10b981', cursor: 'pointer' }}>Details</span>
          </div>
          <div className="mb-5">
            <p style={{ ...IT, fontSize: '32px', fontWeight: '800', color: '#fff', letterSpacing: '-.04em', lineHeight: '1' }}>
              {(stats?.total_customers ?? 0).toLocaleString()}
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', marginTop: '4px' }}>Active users on platform</p>
          </div>
          <div className="flex-1 flex flex-col gap-3.5">
            {Object.entries(stats?.platform_stats ?? {}).map(([platform, count]: any) => (
              <PlatformBar key={platform} platform={platform} count={count} total={stats?.total_customers ?? 1} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Trade Ledger ── */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        <div className="flex items-start justify-between border-b border-[#f3f4f6]" style={{ padding: '20px 26px 16px' }}>
          <div>
            <h2 style={{ ...IT, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Recent Trade Ledger</h2>
            <p style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px' }}>Latest platform transactions · audit log</p>
          </div>
          <button
            onClick={() => router.push("/admin/transactions")}
            className="flex items-center gap-1 text-[12.5px] font-semibold text-[#0f172a] bg-[#f7f8f9] border border-[#e9eaec] rounded-[8px] hover:bg-[#f1f5f9] transition-colors whitespace-nowrap"
            style={{ padding: '7px 13px' }}
          >
            View all <span style={{ fontSize: '11px' }}>›</span>
          </button>
        </div>
        <div className="overflow-x-auto admin-area">
          <div style={{ minWidth: '620px', padding: '0 26px' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 1fr 130px 80px', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
              {["TXN Code", "Buyer → Seller", "Amount", "Status", "Fee"].map(h => (
                <p key={h} style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</p>
              ))}
            </div>
            {/* Rows */}
            {(stats?.recent_transactions ?? []).map((tx: any) => (
              <div
                key={tx.id}
                onClick={() => router.push(`/admin/transactions/${tx.id}`)}
                style={{ display: 'grid', gridTemplateColumns: '150px 1fr 1fr 130px 80px', gap: '12px', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                className="hover:bg-[#fafafa] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  <code style={{ ...IT, fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>{tx.txn_code}</code>
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{tx.buyer?.safetag}</p>
                  <p style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '1px' }}>→ {tx.seller?.safetag}</p>
                </div>
                <p style={{ ...IT, fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                  {tx.currency} {Number(tx.total_amount).toLocaleString()}
                </p>
                <StatusChip status={tx.status} />
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#10b981' }}>
                  {tx.fee_amount ? `${tx.currency} ${Number(tx.fee_amount).toLocaleString()}` : '—'}
                </p>
              </div>
            ))}
            {(stats?.recent_transactions ?? []).length === 0 && (
              <p style={{ fontSize: '13px', color: '#94a3b8', padding: '32px 0', textAlign: 'center' }}>No transactions yet</p>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function KpiCard({ label, value, icon, iconBg, iconColor, chipColor, chipText, trend, extra, statColor }: any) {
  const IT: React.CSSProperties = { fontFamily: "'Inter Tight',sans-serif" };
  return (
    <div className="bg-white rounded-2xl border border-[#e9eaec]" style={{ padding: '20px 22px' }}>
      <div className="flex items-center justify-between mb-3.5">
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        {extra ?? (
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: '999px', fontSize: '10.5px', fontWeight: '600', background: chipColor, color: chipText }}>
            {trend}
          </span>
        )}
      </div>
      <p style={{ fontSize: '11px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>{label}</p>
      <p style={{ ...IT, fontSize: '26px', fontWeight: '700', color: statColor ?? '#0f172a', letterSpacing: '-.03em', marginBottom: '8px' }}>{value}</p>
    </div>
  );
}

function CurrencyPicker({ currencies, value, onChange }: { currencies: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 hover:text-[#0f172a] transition-colors"
          style={{ fontSize: '10.5px', fontWeight: '700', color: '#475569', background: '#f7f8f9', border: '1px solid #e9eaec', borderRadius: '7px', padding: '4px 9px', cursor: 'pointer' }}
        >
          {value} <ChevronDown className="w-2 h-2" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl border-[#e9eaec] shadow-lg p-1 min-w-[80px]">
        {currencies.map(c => (
          <DropdownMenuItem key={c} onClick={() => onChange(c)} className="rounded-lg text-[11px] font-semibold cursor-pointer">
            {c}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PlatformBar({ platform, count, total }: { platform: string; count: number; total: number }) {
  const pct = Math.round((count / total) * 100);
  const colors: Record<string, string> = {
    telegram: "#229ED9", discord: "#5865F2", whatsapp: "#25D366",
    instagram: "#E1306C", messenger: "#0084FF", apple_business: "#888",
  };
  const color = colors[platform.toLowerCase()] ?? "#10b981";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: '11.5px', fontWeight: '600', color: 'rgba(255,255,255,.6)' }}>{platform}</span>
        </div>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{pct}%</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,.07)', borderRadius: '999px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '999px' }} />
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    FINALIZED:              ["#f0fdf4", "#16a34a"],
    DISPUTED:               ["#fff1f2", "#e11d48"],
    CANCELLED:              ["#f1f5f9", "#475569"],
    PAID:                   ["#eff6ff", "#2563eb"],
    PENDING_SELLER_ACCEPTANCE: ["#fffbeb", "#d97706"],
    AWAITING_PROOF:         ["#fdf4ff", "#9333ea"],
    ACCEPTED:               ["#eff6ff", "#2563eb"],
    COMPLETED_BY_SELLER:    ["#eff6ff", "#2563eb"],
  };
  const labels: Record<string, string> = {
    FINALIZED: "Completed", DISPUTED: "Disputed", CANCELLED: "Cancelled",
    PAID: "Paid", PENDING_SELLER_ACCEPTANCE: "Pending", AWAITING_PROOF: "Awaiting",
    ACCEPTED: "Accepted", COMPLETED_BY_SELLER: "Delivered",
  };
  const [bg, color] = map[status] ?? ["#f1f5f9", "#475569"];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', background: bg, color }}>
      {labels[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}
