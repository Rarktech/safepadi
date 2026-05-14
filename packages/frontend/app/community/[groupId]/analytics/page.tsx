'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Loader2, TrendingUp, Users, CheckCircle2, AlertTriangle, DollarSign, ArrowDownToLine } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const PERIODS = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
    { label: 'All Time', value: 'all' },
];

const TIER_COLOR: Record<string, string> = {
    free: 'bg-emerald-100 text-emerald-700',
    pro: 'bg-blue-100 text-blue-700',
    enterprise: 'bg-amber-100 text-amber-700',
};

function fmt(amount: number, currency: string) {
    const sym: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
    const prefix = sym[currency] ?? '';
    return prefix
        ? `${prefix}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${Number(amount).toFixed(8)} ${currency}`;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        PENDING: 'bg-amber-100 text-amber-700',
        PROCESSING: 'bg-blue-100 text-blue-700',
        PAID: 'bg-emerald-100 text-emerald-700',
        FAILED: 'bg-red-100 text-red-700',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
            {status}
        </span>
    );
}

export default function CommunityAnalyticsPage() {
    const { groupId } = useParams<{ groupId: string }>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');

    useEffect(() => {
        if (!groupId) return;
        setLoading(true);
        axios
            .get(`${API_URL}/communities/${groupId}/analytics?period=${period}`)
            .then((r) => setData(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [groupId, period]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-500">Group not found.</p>
            </div>
        );
    }

    const { group, funnel, summary, earningsTimeline, commissionLog, withdrawalHistory, topTraders } = data;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-400 text-sm">Safeeely Community</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-600 text-sm font-medium truncate max-w-[200px]">{group.group_name}</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            📊 Analytics Dashboard
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TIER_COLOR[group.license_tier] ?? 'bg-slate-100 text-slate-600'}`}>
                                {group.license_tier}
                            </span>
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">Revenue share: <strong>{group.admin_revenue_share_percent}%</strong></p>
                    </div>
                    {/* Period selector */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                        {PERIODS.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    period === p.value
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                        label="Total Deals"
                        value={String(funnel.totalDeals)}
                        sub={`${funnel.accepted} accepted`}
                        color="emerald"
                    />
                    <KpiCard
                        icon={<CheckCircle2 className="w-4 h-4 text-blue-600" />}
                        label="Completion Rate"
                        value={`${funnel.completionRate}%`}
                        sub={`${funnel.completedDeals} completed`}
                        color="blue"
                    />
                    <KpiCard
                        icon={<DollarSign className="w-4 h-4 text-violet-600" />}
                        label="Total Earned"
                        value={
                            summary.earnings.length
                                ? summary.earnings.map((e: any) => fmt(e.total, e.currency)).join(' · ')
                                : '—'
                        }
                        sub="lifetime commissions"
                        color="violet"
                    />
                    <KpiCard
                        icon={<ArrowDownToLine className="w-4 h-4 text-amber-600" />}
                        label="Withdrawable"
                        value={
                            summary.withdrawable.length
                                ? summary.withdrawable.map((w: any) => fmt(w.available, w.currency)).join(' · ')
                                : '—'
                        }
                        sub="available balance"
                        color="amber"
                    />
                </div>

                {/* Deal funnel */}
                <Section title="Deal Funnel">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                            { label: 'Initiated', value: funnel.totalDeals, color: 'bg-slate-100 text-slate-700' },
                            { label: 'Accepted', value: funnel.accepted, color: 'bg-blue-50 text-blue-700' },
                            { label: 'Completed', value: funnel.completedDeals, color: 'bg-emerald-50 text-emerald-700' },
                            { label: 'Disputed', value: funnel.disputedDeals, color: 'bg-orange-50 text-orange-700' },
                            { label: 'Cancelled', value: funnel.cancelledDeals, color: 'bg-red-50 text-red-700' },
                        ].map((item) => (
                            <div key={item.label} className={`rounded-lg p-4 text-center ${item.color}`}>
                                <div className="text-2xl font-bold">{item.value}</div>
                                <div className="text-xs mt-1 font-medium">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Earnings timeline */}
                {earningsTimeline.length > 0 && (
                    <Section title={`Earnings Timeline (${PERIODS.find((p) => p.value === period)?.label})`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <Th>Date</Th>
                                        <Th>Commission Earned</Th>
                                        <Th>Currency</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...earningsTimeline].reverse().map((row: any, i: number) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                            <Td>{fmtDate(row.date)}</Td>
                                            <Td><span className="font-medium text-emerald-700">{fmt(row.amount, row.currency)}</span></Td>
                                            <Td>{row.currency}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>
                )}

                {/* Top traders */}
                {topTraders.length > 0 && (
                    <Section title="Top Traders">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <Th>#</Th>
                                        <Th>Safetag</Th>
                                        <Th>Deals</Th>
                                        <Th>Volume</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topTraders.map((t: any, i: number) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                            <Td>
                                                <span className={`font-bold ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-400' : 'text-slate-400'}`}>
                                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                                </span>
                                            </Td>
                                            <Td><span className="font-mono text-slate-800">{t.safetag}</span></Td>
                                            <Td>{t.dealCount}</Td>
                                            <Td>
                                                {t.volume.map((v: any) => (
                                                    <div key={v.currency}>{fmt(v.total, v.currency)}</div>
                                                ))}
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>
                )}

                {/* Commission log */}
                <Section title="Recent Commissions">
                    {commissionLog.length === 0 ? (
                        <p className="text-slate-400 text-sm py-4 text-center">No commissions yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <Th>Date</Th>
                                        <Th>Amount</Th>
                                        <Th>Transaction</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {commissionLog.map((c: any) => (
                                        <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                                            <Td>{fmtDate(c.created_at)}</Td>
                                            <Td><span className="font-medium text-emerald-700">{fmt(c.amount, c.currency)}</span></Td>
                                            <Td><span className="font-mono text-slate-400 text-xs">{c.txn_id?.slice(0, 8)}…</span></Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>

                {/* Withdrawal history */}
                <Section title="Withdrawal History">
                    {withdrawalHistory.length === 0 ? (
                        <p className="text-slate-400 text-sm py-4 text-center">No withdrawals yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <Th>Date</Th>
                                        <Th>Amount</Th>
                                        <Th>Status</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {withdrawalHistory.map((w: any) => (
                                        <tr key={w.id} className="border-b border-slate-50 hover:bg-slate-50">
                                            <Td>{fmtDate(w.created_at)}</Td>
                                            <Td><span className="font-medium">{fmt(w.amount, w.currency)}</span></Td>
                                            <Td><StatusBadge status={w.status} /></Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>

                <p className="text-center text-xs text-slate-300 pb-4">
                    Safeeely Community · {group.group_name}
                </p>
            </div>
        </div>
    );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
    const bg: Record<string, string> = {
        emerald: 'bg-emerald-50',
        blue: 'bg-blue-50',
        violet: 'bg-violet-50',
        amber: 'bg-amber-50',
    };
    return (
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className={`w-8 h-8 ${bg[color] ?? 'bg-slate-50'} rounded-lg flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
            <div className="text-lg font-bold text-slate-900 leading-tight">{value}</div>
            <div className="text-xs text-slate-400 mt-1">{sub}</div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function Th({ children }: { children: React.ReactNode }) {
    return <th className="text-left text-xs font-medium text-slate-400 pb-3 pr-4">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
    return <td className="py-2.5 pr-4 text-slate-700">{children}</td>;
}
