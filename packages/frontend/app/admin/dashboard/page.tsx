"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  TrendingUp, Users, ShoppingCart, Shield, CreditCard, FileCheck,
  AlertTriangle, Globe, MessageCircle, Activity, Coins, ChevronDown,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from "recharts";
import AdminShell from "@/components/admin/AdminShell";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const CURRENCY_CONFIG: Record<string, { symbol: string }> = {
  USDT: { symbol: "$" }, NGN: { symbol: "₦" }, USD: { symbol: "$" }, GBP: { symbol: "£" },
};

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
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  const availableVolCurrencies = Object.keys(stats?.volume_by_currency || {});
  const availableProfitCurrencies = Object.keys(stats?.profit_by_currency || {});

  const attentionItems = [
    {
      label: "Pending KYC",
      count: stats?.pending_kyc_count ?? 0,
      icon: FileCheck,
      borderColor: "#f59e0b",
      href: "/admin/kyc",
    },
    {
      label: "Open Disputes",
      count: stats?.open_disputes_count ?? 0,
      icon: Shield,
      borderColor: "#e11d48",
      href: "/admin/disputes",
    },
    {
      label: "Pending Payouts",
      count: stats?.pending_payouts_count ?? 0,
      icon: CreditCard,
      borderColor: "#2563eb",
      href: "/admin/payouts",
    },
  ];

  return (
    <AdminShell title="Dashboard" subtitle="Platform overview & intelligence">

      {/* Needs Attention row */}
      {stats && (stats.pending_kyc_count > 0 || stats.open_disputes_count > 0 || stats.pending_payouts_count > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {attentionItems.map(item => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className="bg-white rounded-2xl border border-[#e9eaec] p-5 text-left adm-card-lift flex items-center gap-4"
              style={{ borderLeft: `3px solid ${item.borderColor}` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${item.borderColor}18`, color: item.borderColor }}
              >
                <item.icon className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-tight text-[36px] font-extrabold text-[#0f172a] leading-none">
                  {item.count}
                </p>
                <p className="text-[11px] font-semibold text-[#64748b] mt-1">{item.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Volume */}
        <KpiCard
          label="Total Volume"
          value={`${CURRENCY_CONFIG[volCurrency]?.symbol ?? ""}${Math.round(stats?.volume_by_currency?.[volCurrency] ?? 0).toLocaleString()}`}
          sub={`Currency: ${volCurrency}`}
          iconBg="#f0fdf4"
          iconColor="#10b981"
          icon={<Coins className="w-5 h-5" />}
          trend="+12.4%"
          extra={
            availableVolCurrencies.length > 1 && (
              <CurrencyPicker currencies={availableVolCurrencies} value={volCurrency} onChange={setVolCurrency} />
            )
          }
        />
        {/* Profit */}
        <KpiCard
          label="Platform Profit"
          value={`${CURRENCY_CONFIG[profitCurrency]?.symbol ?? ""}${Math.round(stats?.profit_by_currency?.[profitCurrency] ?? 0).toLocaleString()}`}
          sub={`Currency: ${profitCurrency}`}
          iconBg="#eff6ff"
          iconColor="#2563eb"
          icon={<TrendingUp className="w-5 h-5" />}
          trend="+8.2%"
          extra={
            availableProfitCurrencies.length > 1 && (
              <CurrencyPicker currencies={availableProfitCurrencies} value={profitCurrency} onChange={setProfitCurrency} />
            )
          }
        />
        {/* New customers */}
        <KpiCard
          label="New Customers"
          value={(stats?.new_customers_today ?? 0).toLocaleString()}
          sub="Today"
          iconBg="#fdf4ff"
          iconColor="#9333ea"
          icon={<Users className="w-5 h-5" />}
          trend="+15.1%"
        />
        {/* Total orders */}
        <KpiCard
          label="Total Orders"
          value={(stats?.total_transactions ?? 0).toLocaleString()}
          sub="All time"
          iconBg="#fffbeb"
          iconColor="#d97706"
          icon={<ShoppingCart className="w-5 h-5" />}
          trend="+4.3%"
        />
      </div>

      {/* 7-day stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "New Users (7d)", value: stats?.last_7d_new_users ?? 0, color: "#9333ea" },
          { label: "Transactions (7d)", value: stats?.last_7d_transactions ?? 0, color: "#2563eb" },
          { label: "Disputes (7d)", value: stats?.last_7d_disputes ?? 0, color: "#e11d48" },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5">
            <p className="font-tight text-2xl font-bold leading-none" style={{ color: item.color }}>
              {item.value.toLocaleString()}
            </p>
            <p className="adm-section-label mt-2">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Chart + Market Reach */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e9eaec] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-tight text-[15px] font-bold text-[#0f172a]">Revenue Trajectory</p>
              <p className="text-[12px] text-[#94a3b8] mt-0.5">Monthly volume across all channels</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
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

        {/* Market Reach */}
        <div className="rounded-2xl p-6 flex flex-col" style={{ background: "#0f172a" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-tight text-[14px] font-bold text-white flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#10b981]" />
              Market Reach
            </p>
          </div>
          <div className="mb-6">
            <p className="font-tight text-4xl font-bold text-white">
              {(stats?.total_customers ?? 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-[rgba(255,255,255,.5)] uppercase tracking-wider mt-1">
              Active ecosystem nodes
            </p>
          </div>
          <div className="flex-1 space-y-5">
            {Object.entries(stats?.platform_stats ?? {}).map(([platform, count]: any) => (
              <PlatformBar key={platform} platform={platform} count={count} total={stats?.total_customers ?? 1} />
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f3f4f6] flex items-center justify-between">
          <div>
            <p className="font-tight text-[15px] font-bold text-[#0f172a]">Recent Trade Ledger</p>
            <p className="text-[12px] text-[#94a3b8] mt-0.5">Latest platform transactions</p>
          </div>
          <button
            onClick={() => router.push("/admin/transactions")}
            className="text-[12px] font-semibold text-[#059669] hover:text-[#047857] transition-colors"
          >
            View all →
          </button>
        </div>
        <div className="overflow-x-auto admin-area">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                {["TXN Code", "Parties", "Amount", "Status", "Date"].map(h => (
                  <th key={h} className="px-6 py-3 text-left adm-section-label">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.recent_transactions ?? []).map((tx: any) => (
                <tr
                  key={tx.id}
                  onClick={() => router.push(`/admin/transactions/${tx.id}`)}
                  className="border-t border-[#f3f4f6] hover:bg-[#fafafa] cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                      <code className="text-[12px] font-bold text-[#0f172a]">{tx.txn_code}</code>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[12px] font-semibold text-[#0f172a]">{tx.buyer?.safetag}</p>
                    <p className="text-[11px] text-[#94a3b8]">→ {tx.seller?.safetag}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[13px] font-bold text-[#0f172a]">
                      {tx.currency} {Number(tx.total_amount).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusChip status={tx.status} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] text-[#94a3b8]">
                      {new Date(tx.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function KpiCard({ label, value, sub, icon, iconBg, iconColor, trend, extra }: any) {
  return (
    <div className="bg-white rounded-2xl border border-[#e9eaec] p-5">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        {extra ?? (
          <span className="adm-chip chip-green text-[10px]">{trend}</span>
        )}
      </div>
      <p className="adm-section-label mb-1">{label}</p>
      <p className="font-tight text-2xl font-bold text-[#0f172a]">{value}</p>
      {sub && <p className="text-[11px] text-[#94a3b8] mt-0.5">{sub}</p>}
    </div>
  );
}

function CurrencyPicker({ currencies, value, onChange }: { currencies: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 text-[10px] font-bold text-[#64748b] hover:text-[#0f172a] transition-colors uppercase tracking-wider bg-[#f1f5f9] px-2 py-1 rounded-lg">
          {value} <ChevronDown className="w-3 h-3" />
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
  const colors: Record<string, string> = { telegram: "#229ED9", discord: "#5865F2", whatsapp: "#25D366", instagram: "#E1306C" };
  const color = colors[platform.toLowerCase()] ?? "#10b981";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[11px] font-semibold capitalize" style={{ color: "rgba(255,255,255,.6)" }}>
            {platform}
          </span>
        </div>
        <span className="text-[12px] font-bold text-white">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    FINALIZED: "chip-green", DISPUTED: "chip-red", CANCELLED: "chip-slate",
    PAID: "chip-blue", PENDING_SELLER_ACCEPTANCE: "chip-amber", AWAITING_PROOF: "chip-purple",
  };
  const cls = map[status] ?? "chip-slate";
  const labels: Record<string, string> = {
    FINALIZED: "Completed", DISPUTED: "Disputed", CANCELLED: "Cancelled",
    PAID: "Paid", PENDING_SELLER_ACCEPTANCE: "Pending", AWAITING_PROOF: "Awaiting",
    ACCEPTED: "Accepted", COMPLETED_BY_SELLER: "Delivered",
  };
  return <span className={`adm-chip ${cls}`}>{labels[status] ?? status.replace(/_/g, " ")}</span>;
}
