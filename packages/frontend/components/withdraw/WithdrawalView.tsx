'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Wallet, Plus, Send, DollarSign, TrendingUp, ArrowDownLeft, Hourglass,
    AlertTriangle, Trash2,
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';

import api from '@/lib/api';
import {
    CURRENCY_ICONS, CURRENCY_NAMES, CURRENCY_SYMBOLS, PORTFOLIO_STYLE, DEFAULT_PORTFOLIO_STYLE
} from './DashboardSections';

const STATUS_META: Record<string, { label: string; bg: string; c: string }> = {
    PAID: { label: 'Completed', bg: '#f0fdf4', c: '#16a34a' },
    PROCESSING: { label: 'Processing', bg: '#eff6ff', c: '#2563eb' },
    PENDING_APPROVAL: { label: 'Pending approval', bg: '#fffbeb', c: '#d97706' },
    FAILED: { label: 'Failed', bg: '#fff1f2', c: '#e11d48' },
};
const statusMeta = (status: string) => STATUS_META[status] || { label: status, bg: '#f1f5f9', c: '#475569' };

const MethodLogo = ({ method, size = 40 }: { method: any; size?: number }) => (
    <div
        className="rounded-[11px] flex-shrink-0 bg-white border border-[#e9eaec] flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
    >
        {method?.details?.logo ? (
            <img src={method.details.logo} className="w-full h-full object-contain p-1.5" />
        ) : (
            <Wallet size={size * 0.45} className="text-slate-300" />
        )}
    </div>
);

export const WithdrawalView = ({
    profile,
    balances,
    onInternalWithdraw,
    refreshTrigger = 0
}: {
    profile: any,
    balances: any[],
    onInternalWithdraw: (currency: string) => void,
    refreshTrigger?: number
}) => {
    const highestBalanceCurrency = balances.reduce(
        (best, b) => (Number(b.amount) > Number(best?.amount || 0) ? b : best),
        balances[0]
    )?.currency || 'NGN';

    const [methods, setMethods] = useState<any[]>([]);
    const [loadingMethods, setLoadingMethods] = useState(true);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
    const [methodToDelete, setMethodToDelete] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [earningsHistory, setEarningsHistory] = useState<{ name: string; earnings: number }[]>([]);
    const [historyChartCurrency, setHistoryChartCurrency] = useState('USD');
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [pendingEscrow, setPendingEscrow] = useState<any[]>([]);
    const [inWithdrawal, setInWithdrawal] = useState<any[]>([]);
    const [totalEarned, setTotalEarned] = useState<any[]>([]);
    const [mobileCurrency, setMobileCurrency] = useState(highestBalanceCurrency);

    useEffect(() => { setMobileCurrency(highestBalanceCurrency); }, [highestBalanceCurrency]);

    const fetchMethods = async () => {
        if (!profile?.safetag) return;
        try {
            setLoadingMethods(true);
            const res = await api.get(`/profiles/${profile.safetag}/payout-methods`);
            setMethods(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('❌ Failed to fetch methods:', error);
        } finally {
            setLoadingMethods(false);
        }
    };

    const fetchWithdrawals = async () => {
        if (!profile?.safetag) return;
        try {
            setLoadingWithdrawals(true);
            const res = await api.get(`/withdrawals/${profile.safetag}`);
            setWithdrawals(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('❌ Failed to fetch withdrawals:', error);
        } finally {
            setLoadingWithdrawals(false);
        }
    };

    const handleDeleteMethod = async () => {
        if (!methodToDelete) return;
        try {
            await api.delete(`/profiles/${profile.safetag}/payout-methods/${methodToDelete.id}`);
            setMethods(prev => Array.isArray(prev) ? prev.filter(m => m.id !== methodToDelete.id) : []);
            toast.success('Payout method removed successfully');
            setIsDeleteModalOpen(false);
            setMethodToDelete(null);
        } catch (error) {
            console.error('❌ Failed to delete method:', error);
            toast.error('Failed to remove payout method');
        }
    };

    const fetchBalanceSummary = async () => {
        if (!profile?.safetag) return;
        try {
            const res = await api.get(`/profiles/${profile.safetag}/balance`);
            setPendingEscrow(res.data?.pending_escrow || []);
            setInWithdrawal(res.data?.in_withdrawal || []);
            setTotalEarned(res.data?.total_earned || []);
        } catch (error) {
            console.error('❌ Failed to fetch balance summary:', error);
        }
    };

    const fetchEarningsHistory = async (currency?: string) => {
        if (!profile?.safetag) return;
        try {
            setLoadingHistory(true);
            const qs = currency ? `&currency=${currency}` : '';
            const res = await api.get(`/profiles/${profile.safetag}/earnings-history?months=6${qs}`);
            setEarningsHistory(res.data?.history || []);
            setHistoryChartCurrency(res.data?.currency || 'USD');
            setAvailableCurrencies(res.data?.available_currencies || []);
        } catch (error) {
            console.error('❌ Failed to fetch earnings history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchMethods();
        fetchWithdrawals();
        fetchBalanceSummary();
        fetchEarningsHistory();
    }, [profile?.safetag, refreshTrigger]);

    const escrowDisplay = pendingEscrow.length ? `${CURRENCY_SYMBOLS[pendingEscrow[0].currency] ?? ''}${Number(pendingEscrow[0].amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
    const processingDisplay = inWithdrawal.length ? `${CURRENCY_SYMBOLS[inWithdrawal[0].currency] ?? ''}${Number(inWithdrawal[0].amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
    const totalEarnedDisplay = totalEarned.length ? `${CURRENCY_SYMBOLS[totalEarned[0].currency] ?? ''}${Number(totalEarned[0].amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

    const latestMonthLabel = earningsHistory.length
        ? `${earningsHistory[earningsHistory.length - 1].name} ${new Date().getFullYear()}`
        : '';

    const mobileBalance = balances.find(b => b.currency === mobileCurrency) || balances[0];

    const breakdownItems = [
        { label: 'In escrow', description: 'Held for active trades', icon: <Hourglass size={17} className="text-amber-600" />, iconBg: '#fffbeb', values: pendingEscrow, emptyText: 'No active escrow' },
        { label: 'Processing', description: 'Withdrawals in transit', icon: <ArrowDownLeft size={17} className="text-blue-600" />, iconBg: '#eff6ff', values: inWithdrawal, emptyText: 'No pending withdrawals' },
        { label: 'Total earned', description: 'Lifetime gross earnings', icon: <TrendingUp size={17} className="text-emerald-600" />, iconBg: '#f0fdf4', values: totalEarned, emptyText: '—' },
    ];

    const methodsSummary = methods.length === 0
        ? 'No accounts connected yet'
        : `${methods.length} account${methods.length > 1 ? 's' : ''} connected`;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ══════════ DESKTOP ══════════ */}
            <div className="hidden md:flex flex-col gap-[18px]">

                {/* Row 1: Wallets + Action panel */}
                <div className="grid grid-cols-[1fr_300px] gap-4">
                    <div className="bg-white border border-[#e9eaec] rounded-2xl p-[26px]">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[#0f172a] tracking-[-.01em]">Your wallets</h2>
                                <p className="text-xs text-[#94a3b8] mt-0.5">{balances.length} active wallet{balances.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {balances.map((b) => {
                                const style = PORTFOLIO_STYLE[b.currency] || DEFAULT_PORTFOLIO_STYLE;
                                return (
                                    <div key={b.currency} className="rounded-[14px] p-[18px] flex flex-col min-w-0 overflow-hidden" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                                        <div className="flex items-center justify-between mb-3.5">
                                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden">
                                                <div className="w-6 h-6 flex items-center justify-center">
                                                    {CURRENCY_ICONS[b.currency] || <DollarSign size={16} className="text-slate-700" />}
                                                </div>
                                            </div>
                                            <div className="w-[7px] h-[7px] rounded-full bg-[#10b981]" />
                                        </div>
                                        <p className="text-[11px] font-semibold mb-[3px]" style={{ color: style.sub }}>{CURRENCY_NAMES[b.currency] || b.currency}</p>
                                        <p className="font-['Inter_Tight',sans-serif] text-[21px] font-bold text-[#0f172a] tracking-[-.02em] leading-none mb-3.5 truncate">
                                            {CURRENCY_SYMBOLS[b.currency] ?? ''}{Number(b.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <button
                                            onClick={() => onInternalWithdraw(b.currency)}
                                            className="flex items-center justify-center gap-1.5 w-full bg-[#0f172a] rounded-full py-2.5 text-white font-semibold text-xs"
                                        >
                                            <Send size={12} />
                                            Withdraw {b.currency}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action panel */}
                    <div className="bg-[#0f172a] rounded-[20px] p-7 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute -top-[60px] -right-[60px] w-[180px] h-[180px] rounded-full border border-white/[.04] pointer-events-none" />
                        <div className="absolute -top-5 -right-5 w-[100px] h-[100px] rounded-full border border-white/[.04] pointer-events-none" />
                        <div className="relative z-10">
                            <div className="w-10 h-10 rounded-[11px] bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-4">
                                <Send size={18} className="text-[#10b981]" />
                            </div>
                            <h3 className="font-['Inter_Tight',sans-serif] text-lg font-extrabold text-white tracking-[-.02em] mb-2">Ready to withdraw?</h3>
                            <p className="text-xs text-white/40 leading-relaxed mb-[18px]">Transfer your earnings to any connected bank account or crypto wallet.</p>
                            <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/5 rounded-[10px] mb-2">
                                <Wallet size={13} className="text-white/40" />
                                <span className="text-[11.5px] text-white/40 font-medium">{methodsSummary}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/5 rounded-[10px]">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,.7)" strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>
                                <span className="text-[11.5px] text-[#10b981]/70 font-semibold">Zero transfer fees</span>
                            </div>
                        </div>
                        <button
                            onClick={() => onInternalWithdraw(highestBalanceCurrency)}
                            className="w-full bg-[#10b981] rounded-full py-3.5 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(16,185,129,.28)] mt-[22px] relative z-10"
                        >
                            <Send size={15} />
                            Withdraw funds
                        </button>
                    </div>
                </div>

                {/* Row 2: Stats */}
                <div className="grid grid-cols-3 gap-3.5">
                    {breakdownItems.map((item) => (
                        <div key={item.label} className="bg-white border border-[#e9eaec] rounded-2xl px-[22px] py-5 flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-[11px] flex items-center justify-center flex-shrink-0" style={{ background: item.iconBg }}>
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-[#94a3b8] mb-[3px]">{item.label}</p>
                                {item.values.length > 0 ? (
                                    <div className="space-y-0.5">
                                        {item.values.map((v: any) => (
                                            <p key={v.currency} className="font-['Inter_Tight',sans-serif] text-[18px] font-bold text-[#0f172a] tracking-[-.02em] leading-tight truncate">
                                                {CURRENCY_SYMBOLS[v.currency] ?? ''}{Number(v.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                <span className="text-[11px] font-semibold text-[#94a3b8] ml-1">{v.currency}</span>
                                            </p>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="font-['Inter_Tight',sans-serif] text-[18px] font-bold text-[#cbd5e1]">{item.emptyText}</p>
                                )}
                                <p className="text-[11px] text-[#94a3b8] mt-0.5 truncate">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Row 3: Payout methods + Earnings chart */}
                <div className="grid grid-cols-[360px_1fr] gap-4">
                    <div className="bg-white border border-[#e9eaec] rounded-2xl p-[26px] flex flex-col">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a] tracking-[-.01em]">Payout methods</h2>
                                <p className="text-xs text-[#94a3b8] mt-0.5">Your connected accounts</p>
                            </div>
                            <button
                                onClick={() => onInternalWithdraw(highestBalanceCurrency)}
                                className="flex items-center gap-1 text-xs font-semibold text-[#10b981] bg-[#f0fdf4] rounded-lg px-3 py-1.5"
                            >
                                <Plus size={11} />
                                Add new
                            </button>
                        </div>
                        <div className="flex flex-col gap-2.5 flex-1">
                            {loadingMethods ? (
                                <div className="space-y-2.5">
                                    {[1, 2].map(i => <div key={i} className="h-[68px] bg-slate-50 animate-pulse rounded-[13px]" />)}
                                </div>
                            ) : methods.length > 0 ? (
                                methods.map((m) => (
                                    <div key={m.id} className="flex items-center gap-3 px-4 py-3.5 rounded-[13px] border border-[#f1f5f9] bg-[#fafafa] hover:border-[#e0e0e0] transition-colors">
                                        <MethodLogo method={m} size={40} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <p className="text-[13px] font-bold text-[#0f172a] truncate">
                                                    {m.type === 'bank' ? m.details.bank_name : (m.details.symbol || 'Wallet')}
                                                </p>
                                                {m.is_default && (
                                                    <span className="text-[9.5px] font-semibold text-[#2563eb] bg-[#eff6ff] px-1.5 py-0.5 rounded-md flex-shrink-0">Primary</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-[#94a3b8] truncate">
                                                {m.type === 'bank'
                                                    ? `${m.details.bank_name} · ${String(m.details.account_number).slice(0, 3)}****${String(m.details.account_number).slice(-3)}`
                                                    : `${m.details.chain || ''} · ${String(m.details.address || '').slice(0, 6)}...`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => { setMethodToDelete(m); setIsDeleteModalOpen(true); }}
                                            className="text-[11.5px] font-semibold text-[#94a3b8] hover:text-[#e11d48] px-2 py-1 rounded-lg flex-shrink-0"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center py-8 px-5 text-center gap-2.5">
                                    <div className="w-12 h-12 rounded-[13px] bg-[#f8f9fa] flex items-center justify-center">
                                        <Wallet size={20} className="text-[#94a3b8]" />
                                    </div>
                                    <p className="text-[13px] font-bold text-[#0f172a]">No payout methods</p>
                                    <p className="text-[11.5px] text-[#94a3b8]">Add a bank or wallet to start withdrawing.</p>
                                    <button
                                        onClick={() => onInternalWithdraw(highestBalanceCurrency)}
                                        className="bg-[#0f172a] rounded-full px-5 py-2.5 text-white font-semibold text-[13px] mt-1"
                                    >
                                        Connect account
                                    </button>
                                </div>
                            )}

                            {!loadingMethods && methods.length < 3 && (
                                <div className="mt-2 pt-4 border-t border-[#f1f5f9]">
                                    <p className="text-[11px] font-medium text-[#b0bac6] mb-2.5">Suggested connections</p>
                                    <div className="flex flex-col gap-2">
                                        {[
                                            { name: 'Swift bank transfer', emoji: '🏦' },
                                            { name: 'PayPal', emoji: '💳' },
                                        ].map((item) => (
                                            <div key={item.name} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] bg-[#fafafa] border border-[#f1f5f9] opacity-60">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-[#e9eaec] flex items-center justify-center text-sm flex-shrink-0">{item.emoji}</div>
                                                <p className="text-[12.5px] font-semibold text-[#0f172a] flex-1">{item.name}</p>
                                                <span className="text-[10px] font-semibold text-[#94a3b8] bg-[#f1f5f9] px-1.5 py-0.5 rounded-md">Soon</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Earnings chart */}
                    <div className="bg-white border border-[#e9eaec] rounded-2xl p-[26px] flex flex-col">
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <h2 className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a] tracking-[-.01em]">Earnings history</h2>
                                <p className="text-xs text-[#94a3b8] mt-0.5">Last 6 months</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {availableCurrencies.length > 1 && (
                                    <div className="flex gap-1">
                                        {availableCurrencies.map(cur => (
                                            <button
                                                key={cur}
                                                onClick={() => fetchEarningsHistory(cur)}
                                                className="text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors"
                                                style={historyChartCurrency === cur
                                                    ? { background: '#0f172a', color: '#fff', borderColor: '#0f172a' }
                                                    : { background: '#f7f8f9', color: '#64748b', borderColor: '#e9eaec' }}
                                            >
                                                {cur}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {latestMonthLabel && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-[#f0fdf4] text-[#16a34a]">{latestMonthLabel}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 min-h-[220px]">
                            {loadingHistory ? (
                                <div className="w-full h-full min-h-[220px] bg-slate-50 animate-pulse rounded-2xl" />
                            ) : earningsHistory.every(p => p.earnings === 0) ? (
                                <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center text-center gap-3">
                                    <TrendingUp size={32} className="text-slate-200" />
                                    <p className="text-sm font-bold text-slate-400">No earnings in the last 6 months</p>
                                    <p className="text-xs text-slate-300">Complete transactions to see your earnings trend here.</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={earningsHistory}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                                            tickFormatter={(val) => val > 0 ? `${CURRENCY_SYMBOLS[historyChartCurrency] ?? ''}${val}` : '0'}
                                        />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border-none font-black text-sm">
                                                            {CURRENCY_SYMBOLS[historyChartCurrency] ?? ''}{Number(payload[0].value).toLocaleString()} {historyChartCurrency}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="earnings"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Row 4: Payout history */}
                <div className="bg-white border border-[#e9eaec] rounded-2xl overflow-hidden">
                    <div className="px-[26px] pt-[22px] pb-4 flex items-center justify-between">
                        <div>
                            <h2 className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a] tracking-[-.01em]">Payout history</h2>
                            <p className="text-xs text-[#94a3b8] mt-0.5">All completed and pending withdrawals</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-[#f1f5f9] text-[#475569]">{withdrawals.length} payouts</span>
                    </div>
                    <div className="grid grid-cols-[1fr_110px_1.1fr_100px_1fr] gap-3 px-6 py-2.5 border-t border-b border-[#f3f4f6] bg-[#fafafa]">
                        <p className="text-[11px] font-semibold text-[#94a3b8]">Amount</p>
                        <p className="text-[11px] font-semibold text-[#94a3b8]">Date</p>
                        <p className="text-[11px] font-semibold text-[#94a3b8]">Method</p>
                        <p className="text-[11px] font-semibold text-[#94a3b8]">Status</p>
                        <p className="text-[11px] font-semibold text-[#94a3b8]">Reference</p>
                    </div>
                    {loadingWithdrawals ? (
                        [1, 2].map(i => <div key={i} className="h-16 bg-slate-50/50 animate-pulse" />)
                    ) : withdrawals.length > 0 ? (
                        withdrawals.map((row) => {
                            const meta = statusMeta(row.status);
                            return (
                                <div key={row.id} className="grid grid-cols-[1fr_110px_1.1fr_100px_1fr] gap-3 items-center px-6 py-3.5 border-b border-[#f3f4f6] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-[34px] h-[34px] rounded-[10px] bg-[#f0fdf4] flex items-center justify-center flex-shrink-0">
                                            <Send size={13} className="text-[#16a34a]" />
                                        </div>
                                        <p className="font-['Inter_Tight',sans-serif] text-sm font-bold text-[#0f172a] truncate">{Number(row.amount).toLocaleString()} {row.currency}</p>
                                    </div>
                                    <p className="text-xs text-[#64748b] font-medium">{new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <MethodLogo method={row} size={28} />
                                        <p className="text-[12.5px] font-semibold text-[#0f172a] truncate">{row.details?.bank_name || row.details?.symbol || 'Payout'}</p>
                                    </div>
                                    <div>
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: meta.bg, color: meta.c }}>{meta.label}</span>
                                    </div>
                                    <p className="text-[11px] font-medium text-[#94a3b8] tracking-wide truncate">{row.reference}</p>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-[60px] px-6 text-center flex flex-col items-center gap-2.5">
                            <div className="w-12 h-12 rounded-[13px] bg-[#f8f9fa] flex items-center justify-center">
                                <Send size={20} className="text-[#94a3b8]" />
                            </div>
                            <p className="text-[13.5px] font-bold text-[#0f172a]">No payouts yet</p>
                            <p className="text-xs text-[#94a3b8]">Your withdrawal history will appear here.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ══════════ MOBILE ══════════ */}
            <div className="md:hidden flex flex-col">

                {/* Currency switcher tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5" style={{ scrollbarWidth: 'none' }}>
                    {balances.map((b) => (
                        <button
                            key={b.currency}
                            onClick={() => setMobileCurrency(b.currency)}
                            className="flex items-center px-4 py-2 rounded-full text-[13px] flex-shrink-0 shadow-[0_1px_4px_rgba(15,23,42,.08)]"
                            style={mobileCurrency === b.currency
                                ? { background: '#0f172a', color: '#fff', fontWeight: 700 }
                                : { background: '#fff', color: '#64748b', fontWeight: 500 }}
                        >
                            {b.currency}
                        </button>
                    ))}
                </div>

                {/* Balance spotlight */}
                <div className="pt-6 pb-5 text-center">
                    <p className="text-[10.5px] font-semibold text-[#94a3b8] tracking-[.12em] mb-2">AVAILABLE TO WITHDRAW</p>
                    <p className="font-['Inter_Tight',sans-serif] text-[44px] font-extrabold text-[#0f172a] leading-none tracking-[-.04em] mb-1.5">
                        {CURRENCY_SYMBOLS[mobileCurrency] ?? ''}{Number(mobileBalance?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11.5px] text-[#94a3b8] mb-5">{mobileCurrency} wallet · zero fees</p>
                    <button
                        onClick={() => onInternalWithdraw(mobileCurrency)}
                        className="w-full flex items-center justify-center gap-2 bg-[#0f172a] rounded-2xl py-4 text-white font-bold text-sm shadow-[0_4px_16px_rgba(15,23,42,.18)]"
                    >
                        <Send size={16} />
                        Withdraw {mobileCurrency}
                    </button>
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                    {[
                        { label: 'Escrow', value: escrowDisplay },
                        { label: 'Processing', value: processingDisplay },
                        { label: 'Total earned', value: totalEarnedDisplay },
                    ].map((item) => (
                        <div key={item.label} className="bg-white border border-[#e9eaec] rounded-[14px] px-2.5 py-3 text-center">
                            <p className="text-[10px] font-medium text-[#94a3b8] mb-1">{item.label}</p>
                            <p className="font-['Inter_Tight',sans-serif] text-sm font-bold text-[#0f172a] truncate">{item.value}</p>
                        </div>
                    ))}
                </div>

                {/* Payout methods */}
                <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[#0f172a]">Payout methods</h3>
                        <button onClick={() => onInternalWithdraw(highestBalanceCurrency)} className="flex items-center gap-1 text-xs font-semibold text-[#10b981]">
                            <Plus size={12} />
                            Add
                        </button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {methods.map((m) => (
                            <div key={m.id} className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-[14px] border border-[#e9eaec]">
                                <MethodLogo method={m} size={40} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-[13.5px] font-bold text-[#0f172a] truncate">{m.type === 'bank' ? m.details.bank_name : (m.details.symbol || 'Wallet')}</p>
                                        {m.is_default && <span className="text-[9px] font-semibold text-[#2563eb] bg-[#eff6ff] px-1.5 py-0.5 rounded-md flex-shrink-0">Primary</span>}
                                    </div>
                                    <p className="text-[11px] text-[#94a3b8] mt-0.5 truncate">
                                        {m.type === 'bank'
                                            ? `${m.details.bank_name} · ${String(m.details.account_number).slice(0, 3)}****${String(m.details.account_number).slice(-3)}`
                                            : `${m.details.chain || ''} · ${String(m.details.address || '').slice(0, 6)}...`}
                                    </p>
                                </div>
                                <button onClick={() => { setMethodToDelete(m); setIsDeleteModalOpen(true); }} className="text-[11px] font-semibold text-[#94a3b8] flex-shrink-0">Remove</button>
                            </div>
                        ))}
                        {!loadingMethods && methods.length === 0 && (
                            <button
                                onClick={() => onInternalWithdraw(highestBalanceCurrency)}
                                className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-[14px] border-2 border-dashed border-[#e9eaec]"
                            >
                                <div className="w-10 h-10 rounded-[11px] bg-[#f7f8f9] flex items-center justify-center flex-shrink-0">
                                    <Plus size={16} className="text-[#94a3b8]" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[13.5px] font-bold text-[#10b981]">Connect bank account</p>
                                    <p className="text-[11px] text-[#94a3b8] mt-0.5">Add a bank or crypto wallet</p>
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                {/* Payout history */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[#0f172a]">Recent payouts</h3>
                    </div>
                    {!loadingWithdrawals && withdrawals.length === 0 ? (
                        <div className="px-5 py-8 bg-white rounded-2xl border border-[#e9eaec] text-center">
                            <p className="text-[13px] font-semibold text-[#94a3b8]">No payouts yet</p>
                            <p className="text-[11.5px] text-[#b0bac6] mt-1">Your withdrawal history will appear here.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-px bg-[#e9eaec] rounded-2xl overflow-hidden">
                            {withdrawals.map((row) => {
                                const meta = statusMeta(row.status);
                                return (
                                    <div key={row.id} className="flex items-center gap-3 px-4 py-3.5 bg-white">
                                        <MethodLogo method={row} size={36} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13.5px] font-bold text-[#0f172a] truncate">{row.details?.bank_name || row.details?.symbol || 'Payout'}</p>
                                            <p className="text-[11px] text-[#94a3b8] mt-0.5">{new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-['Inter_Tight',sans-serif] text-[13.5px] font-bold text-[#0f172a]">{Number(row.amount).toLocaleString()}</p>
                                            <p className="text-[10px] text-[#94a3b8] font-medium mt-0.5">{row.currency}</p>
                                        </div>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold flex-shrink-0" style={{ background: meta.bg, color: meta.c }}>{meta.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Disconnect Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md w-full p-0 bg-white text-[#0f172a] border-none rounded-[32px] overflow-hidden shadow-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Disconnect payout method</DialogTitle>
                        <DialogDescription>Confirm removal of this payout method.</DialogDescription>
                    </DialogHeader>
                    <div className="p-10 text-center space-y-7">
                        <div className="mx-auto w-16 h-16 bg-[#fff1f2] rounded-[24px] flex items-center justify-center text-[#e11d48]">
                            <AlertTriangle size={32} />
                        </div>
                        <div className="space-y-3">
                            <h3 className="font-['Inter_Tight',sans-serif] text-xl font-extrabold tracking-[-.01em]">Disconnect account?</h3>
                            <p className="text-sm font-medium text-[#94a3b8] leading-relaxed">Are you sure you want to remove this payout method? You will need to add it again to withdraw.</p>
                        </div>
                        {methodToDelete && (
                            <div className="p-4 bg-[#f7f8f9] rounded-2xl border border-[#e9eaec] flex items-center gap-3 text-left">
                                <MethodLogo method={methodToDelete} size={44} />
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-[#0f172a] truncate">
                                        {methodToDelete.type === 'bank' ? methodToDelete.details.bank_name : methodToDelete.details.symbol}
                                    </span>
                                    <span className="text-xs text-[#94a3b8] font-semibold font-mono">
                                        {methodToDelete.type === 'bank'
                                            ? `${String(methodToDelete.details.account_number).slice(0, 4)}****${String(methodToDelete.details.account_number).slice(-4)}`
                                            : `${String(methodToDelete.details.address || '').slice(0, 6)}...${String(methodToDelete.details.address || '').slice(-4)}`}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="h-12 rounded-2xl border-[#e9eaec] font-bold text-[#94a3b8]"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeleteMethod}
                                className="h-12 bg-[#e11d48] hover:bg-[#be123c] text-white rounded-2xl font-bold shadow-lg shadow-rose-100 flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} />
                                Disconnect
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
