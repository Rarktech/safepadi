'use client';

import { DollarSign, Bitcoin, Euro, ArrowRightLeft, Activity, Wallet, ArrowUpRight, ArrowDownCircle, ArrowDownLeft, Plus, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export const CURRENCY_ICONS: Record<string, React.ReactNode> = {
    USD: <img src="/assets/images/usd-flag.png" alt="USD" className="w-full h-full object-cover rounded-full" />,
    NGN: <img src="/assets/images/ngn-flag.png" alt="NGN" className="w-full h-full object-cover rounded-full" />,
    BTC: <Bitcoin className="w-5 h-5 text-white" />,
    USDT: <img src="/assets/images/usdt-logo.png" alt="USDT" className="w-full h-full object-contain" />,
};

const CURRENCY_COLORS: Record<string, string> = {
    USD: 'bg-transparent overflow-hidden',
    NGN: 'bg-transparent overflow-hidden border border-slate-100',
    BTC: 'bg-orange-500',
    USDT: 'bg-transparent',
};

export const CURRENCY_NAMES: Record<string, string> = {
    USD: 'US Dollar',
    EUR: 'Euro',
    BTC: 'Bitcoin',
    USDT: 'Tether (USDT)',
    NGN: 'Nigerian Naira'
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$', EUR: '€', NGN: '₦', BTC: '₿', USDT: '₮'
};

const WALLET_CHIP_BG: Record<string, string> = {
    NGN: 'rgb(16,185,129)',
    USDT: 'rgb(0,0,0)',
    USD: 'rgb(64,111,173)',
    BTC: 'rgb(247,147,26)',
    EUR: 'rgb(99,102,241)',
};

const Sparkline = ({ positive = true }: { positive?: boolean }) => (
    <svg viewBox="0 0 60 30" className="w-16 h-8" fill="none" aria-hidden="true">
        <path
            d={positive
                ? 'M0 22 C10 18 18 10 28 13 C38 16 44 5 60 3'
                : 'M0 8 C10 12 18 20 28 17 C38 14 44 24 60 27'}
            stroke={positive ? '#4CAF50' : '#EF4444'}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

export const MobileDashboard = ({
    balances,
    showBalance,
    activeWalletIndex,
    onCycleWallet,
    allTransactions,
    onWithdraw,
    onCreate,
    onShowAll,
    onSelectTxn,
    onToggleBalance,
    decodedSafetag,
    trustScore,
    totalVolume,
    volumeSymbol,
    completedCount,
    referralEarning,
    referralSymbol,
    disputeCount,
    onViewDisputes,
    pendingActions,
}: {
    balances: any[];
    showBalance: boolean;
    activeWalletIndex: number;
    onCycleWallet: (i: number) => void;
    allTransactions: any[];
    onWithdraw: () => void;
    onCreate: () => void;
    onShowAll: () => void;
    onSelectTxn: (txn: any) => void;
    onToggleBalance: () => void;
    decodedSafetag: string;
    trustScore: number;
    totalVolume: number;
    volumeSymbol: string;
    completedCount: number;
    referralEarning: number;
    referralSymbol: string;
    disputeCount: number;
    onViewDisputes: () => void;
    pendingActions: PendingAction[];
}) => {
    const boundedTrust = Math.max(0, Math.min(100, trustScore));
    const trustLabel = boundedTrust >= 80 ? 'Excellent' : boundedTrust >= 60 ? 'Good' : boundedTrust >= 40 ? 'Fair' : 'Poor';
    const fmtVolume = totalVolume >= 1_000_000 ? `${(totalVolume / 1_000_000).toFixed(1)}M` : totalVolume >= 1_000 ? `${(totalVolume / 1_000).toFixed(1)}K` : totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 });
    const primary = balances[activeWalletIndex] || balances[0] || { currency: 'USD', amount: 0 };
    const symbol = CURRENCY_SYMBOLS[primary.currency] || '$';
    // Stacking position: active wallet sits frontmost (highest index); others keep their
    // original relative order behind it, mirroring the wallet-card design's flat stack.
    const getStackPos = (i: number) => {
        if (i === activeWalletIndex) return balances.length - 1;
        const others = balances.map((_, idx) => idx).filter((idx) => idx !== activeWalletIndex);
        return others.indexOf(i);
    };

    return (
        <div className="min-h-screen pb-32" style={{ backgroundColor: '#F4F7F6' }}>
            {/* Wallet card — stacked currency chips + active-card balance */}
            <div className={`px-[18px] ${balances.length >= 3 ? 'pt-10' : 'pt-6'}`}>
                <div className="relative" style={{ height: balances.length === 1 || balances.length >= 3 ? 250 : 300, isolation: 'isolate' }}>
                    {/* Stacked chips, one per currency */}
                    <div
                        className="absolute"
                        style={{
                            top: balances.length >= 3 ? -28 : -15,
                            left: '5%',
                            right: '5%',
                            height: 148,
                            zIndex: 5,
                            ...(balances.length === 1 ? { paddingTop: '25%' } : {}),
                        }}
                    >
                        {balances.map((b: any, i: number) => {
                            const pos = getStackPos(i);
                            const isActive = pos === balances.length - 1;
                            return (
                                <div
                                    key={b.currency}
                                    onClick={() => onCycleWallet(i)}
                                    className="absolute left-0 right-0 flex items-center justify-between rounded-[14px] px-3"
                                    style={{
                                        top: balances.length === 1 ? 20 : pos * 28,
                                        height: 70,
                                        background: WALLET_CHIP_BG[b.currency] || '#475569',
                                        zIndex: 10 + pos * 10,
                                        transition: 'top 0.4s cubic-bezier(.16,1,.3,1)',
                                        cursor: isActive ? 'default' : 'pointer',
                                    }}
                                >
                                    <div className="flex items-center gap-2 bg-white/15 rounded-full pl-[5px] pr-3 py-[5px] shrink-0">
                                        <div className="w-[26px] h-[26px] rounded-full overflow-hidden border-[1.5px] border-white/30 flex items-center justify-center bg-white/10 shrink-0">
                                            {CURRENCY_ICONS[b.currency] || <DollarSign className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <span className="text-white text-[13px] font-bold whitespace-nowrap">{CURRENCY_NAMES[b.currency] || b.currency}</span>
                                    </div>
                                    <p className="text-white text-[13.5px] font-extrabold tracking-tight shrink-0">
                                        {showBalance
                                            ? `${CURRENCY_SYMBOLS[b.currency] || ''}${Number(b.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            : '••••'}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Wallet body illustration */}
                    <img
                        src="/assets/images/wallet-card.webp"
                        alt=""
                        className="absolute left-0 w-full pointer-events-none select-none"
                        style={{ top: 14, zIndex: 10 }}
                    />

                    {/* Balance + actions, centered over the wallet body */}
                    <div className="absolute flex flex-col gap-2.5" style={{ top: 130, left: '9%', right: '9%', zIndex: 15 }}>
                        <div className="flex items-center justify-center relative">
                            <p
                                className="font-black text-white text-[28px] tracking-tight text-center leading-none"
                                style={{ textShadow: '0 1px 4px rgba(0,0,0,.2)' }}
                            >
                                {showBalance
                                    ? `${symbol}${Number(primary.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : '••••••'}
                            </p>
                            <button
                                onClick={onToggleBalance}
                                className="absolute right-0 w-[26px] h-[26px] rounded-full bg-white/20 flex items-center justify-center"
                            >
                                {showBalance ? <Eye className="w-[11px] h-[11px] text-white" /> : <EyeOff className="w-[11px] h-[11px] text-white" />}
                            </button>
                        </div>

                        <div className="grid grid-cols-[1fr_36px_1fr] gap-[7px] items-center mt-1">
                            <button
                                onClick={onWithdraw}
                                className="flex items-center justify-center gap-[5px] bg-white/20 border border-white/30 rounded-full py-[10px] text-white font-bold text-[11.5px] active:scale-[0.97] transition-all"
                            >
                                <ArrowDownCircle className="w-[14px] h-[14px]" />
                                Withdraw
                            </button>
                            <button
                                onClick={() => balances.length > 0 && onCycleWallet((activeWalletIndex + 1) % balances.length)}
                                className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center active:scale-[0.92] transition-all"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
                                    <polyline points="17 1 21 5 17 9" />
                                    <path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" />
                                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                                </svg>
                            </button>
                            <button
                                onClick={onCreate}
                                className="flex items-center justify-center gap-[5px] bg-white/90 rounded-full py-[10px] text-[#0f5132] font-extrabold text-[11.5px] active:scale-[0.97] transition-all"
                            >
                                Create
                                <Plus className="w-[14px] h-[14px]" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity — dark transition header bleeding to screen edge */}
            <div className="bg-[#0f172a] rounded-t-[40px] mt-9 px-6 py-[22px] flex items-center justify-between">
                <div>
                    <h3 className="text-white font-extrabold text-base">Activity</h3>
                    <p className="text-white/35 text-[11px] mt-0.5">
                        {completedCount} trade{completedCount !== 1 ? 's' : ''} completed · {disputeCount + pendingActions.length} active
                    </p>
                </div>
                <span onClick={onShowAll} className="text-[#10b981] text-[12.5px] font-bold cursor-pointer">View all</span>
            </div>

            {/* At a glance — overlaps portfolio panel */}
            <div className="bg-[#F4F7F6] rounded-t-[40px] -mt-6 px-5 pt-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[#0f172a]">At a glance</h3>
                    <span className="text-[11.5px] font-semibold text-[#10b981]">Live</span>
                </div>
                <div className="grid grid-cols-2 gap-[9px] mb-3.5">
                    <div className="bg-[#0f172a] rounded-2xl p-[14px_16px] flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                            <div className="w-[30px] h-[30px] rounded-lg bg-[#10b981]/[.15] flex items-center justify-center">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.2}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            </div>
                            <span className="text-[9.5px] font-bold text-white/[.35] tracking-[.06em]">TRUST</span>
                        </div>
                        <div>
                            <p className="font-['Inter_Tight',sans-serif] text-[26px] font-black text-white leading-none tracking-[-.03em]">{boundedTrust}<span className="text-[13px] font-semibold text-white/[.35]">/100</span></p>
                            <p className="text-[10.5px] font-semibold text-[#10b981] mt-[3px]">{trustLabel}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-[#e9eaec] rounded-2xl p-[14px_16px] flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                            <div className="w-[30px] h-[30px] rounded-lg bg-[#f0fdf4] flex items-center justify-center">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                            </div>
                            <span className="text-[9.5px] font-bold text-[#b0bac6] tracking-[.06em]">VOLUME</span>
                        </div>
                        <div>
                            <p className="font-['Inter_Tight',sans-serif] text-[18px] font-extrabold text-[#0f172a] leading-none tracking-[-.02em]">{volumeSymbol}{fmtVolume}</p>
                            <p className="text-[10.5px] font-medium text-[#94a3b8] mt-[3px]">Total traded</p>
                        </div>
                    </div>
                    <div className="bg-white border border-[#e9eaec] rounded-2xl p-[14px_16px] flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                            <div className="w-[30px] h-[30px] rounded-lg bg-[#eff6ff] flex items-center justify-center">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2.2}><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <span className="text-[9.5px] font-bold text-[#b0bac6] tracking-[.06em]">TRADES</span>
                        </div>
                        <div>
                            <p className="font-['Inter_Tight',sans-serif] text-[26px] font-black text-[#0f172a] leading-none tracking-[-.03em]">{completedCount}</p>
                            <p className="text-[10.5px] font-medium text-[#94a3b8] mt-[3px]">Completed</p>
                        </div>
                    </div>
                    <div className="bg-white border border-[#e9eaec] rounded-2xl p-[14px_16px] flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                            <div className="w-[30px] h-[30px] rounded-lg bg-[#fdf4ff] flex items-center justify-center">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth={2.2}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            </div>
                            <span className="text-[9.5px] font-bold text-[#b0bac6] tracking-[.06em]">REFERRAL</span>
                        </div>
                        <div>
                            <p className="font-['Inter_Tight',sans-serif] text-[18px] font-extrabold text-[#0f172a] leading-none tracking-[-.02em]">{referralSymbol}{referralEarning.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            <p className="text-[10.5px] font-medium text-[#94a3b8] mt-[3px]">Earned</p>
                        </div>
                    </div>
                </div>

                {disputeCount > 0 && (
                    <div onClick={onViewDisputes} className="flex items-center gap-3 bg-[#fff1f2] border border-[#fecdd3] rounded-[14px] p-[13px_16px] mb-3.5 cursor-pointer">
                        <div className="w-9 h-9 rounded-[10px] bg-[#ffe4e6] flex items-center justify-center shrink-0">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth={2.2}><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z"/></svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-[13px] font-extrabold text-[#e11d48]">{disputeCount} active dispute{disputeCount !== 1 ? 's' : ''}</p>
                            <p className="text-[11px] text-[#f43f5e] font-medium mt-px">Tap to review — response needed</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#f43f5e]" />
                    </div>
                )}

                <PendingActionsPanel actions={pendingActions} />
            </div>

            {/* My Transactions Panel — off-white bg, rounded top */}
            <div className="bg-[#f8fafc] rounded-t-[40px] px-4 pt-7">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-slate-900 font-bold text-lg">My Transactions</h3>
                    <span className="font-bold text-sm cursor-pointer text-[#10b981]" onClick={onShowAll}>
                        View All
                    </span>
                </div>
                {allTransactions.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-10">No transactions yet</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {allTransactions.slice(0, 5).map((tx: any) => {
                            const isSeller = tx.seller?.safetag === decodedSafetag;
                            const isFinalized = tx.status === 'FINALIZED';
                            const isDisputed = tx.status === 'DISPUTED';
                            return (
                                <div
                                    key={tx.id}
                                    className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm cursor-pointer active:scale-[0.99] transition-all"
                                    onClick={() => onSelectTxn(tx)}
                                >
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${isSeller ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                        {isSeller
                                            ? <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                                            : <ArrowDownLeft className="w-5 h-5 text-slate-500" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-900 truncate">{tx.product_name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{format(new Date(tx.created_at), 'MMM d, yyyy')}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-bold text-sm text-slate-900">
                                            {isSeller ? '+' : '-'}{Number(tx.amount)?.toLocaleString()} {tx.currency}
                                        </p>
                                        <p className={`text-[11px] font-semibold mt-0.5 ${isFinalized ? 'text-green-500' : isDisputed ? 'text-red-500' : 'text-amber-500'}`}>
                                            {tx.status.replace(/_/g, ' ')}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export const BalanceHero = ({
    balances,
    showBalance,
    onWithdraw,
    onCreate,
    onToggleBalance,
}: {
    balances: any[];
    showBalance: boolean;
    onWithdraw: () => void;
    onCreate: () => void;
    onToggleBalance?: () => void;
}) => {
    const primary = balances[0] || { currency: 'USD', amount: 0 };
    const symbol = CURRENCY_SYMBOLS[primary.currency] || '';
    const walletCount = balances.length;
    const [whole, decimals] = primary.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split('.');

    return (
        <section className="bg-[#0f172a] rounded-[20px] p-[34px_36px] min-h-[210px] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-[100px] -right-[100px] w-[280px] h-[280px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(255,255,255,0.04)' }} />
            <div className="absolute -top-[56px] -right-[56px] w-[170px] h-[170px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(255,255,255,0.04)' }} />
            <div className="relative z-10 flex items-start justify-between mb-[18px]">
                <div>
                    <p className="text-xs font-medium text-white/[.35] mb-1.5">Available balance</p>
                    <p className="font-['Inter_Tight',sans-serif] text-[52px] font-bold text-white leading-none tracking-[-.04em]">
                        {showBalance ? (
                            <>{symbol}{whole}<span className="text-[28px] text-white/[.28]">.{decimals}</span></>
                        ) : (
                            <span className="tracking-widest text-white/40">••••••</span>
                        )}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                        onClick={onToggleBalance}
                        className="bg-white/[.07] border border-white/[.09] rounded-lg px-3.5 py-1.5 text-white/[.45] text-xs font-medium whitespace-nowrap"
                    >
                        {showBalance ? 'Hide balance' : 'Show balance'}
                    </button>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                        <span className="text-[11.5px] text-white/30">{walletCount} wallet{walletCount !== 1 ? 's' : ''} active</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2.5 relative z-10 mt-2.5">
                <button
                    onClick={onWithdraw}
                    className="flex items-center justify-center gap-[7px] bg-[#10b981] rounded-full px-[26px] py-[13px] text-white font-semibold text-sm shadow-[0_3px_14px_rgba(16,185,129,.28)] whitespace-nowrap"
                >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Withdraw funds
                </button>
                <button
                    onClick={onCreate}
                    className="flex items-center justify-center gap-[7px] bg-white/[.07] border border-white/10 rounded-full px-[26px] py-[13px] text-white/75 font-semibold text-sm whitespace-nowrap"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Create escrow
                </button>
            </div>
        </section>
    );
};

export const TrustScoreCard = ({ trustScore, completedTrades }: { trustScore: number; completedTrades: number }) => {
    const bounded = Math.max(0, Math.min(100, trustScore));
    const display = Math.round(300 + (bounded / 100) * 600);
    const pct = Math.round(((display - 300) / 600) * 100);
    let badge = 'Excellent';
    if (display < 500) badge = 'Poor';
    else if (display < 650) badge = 'Fair';
    else if (display < 750) badge = 'Good';

    return (
        <div className="bg-white rounded-2xl border border-[#e9eaec] p-[22px_24px] flex-1">
            <div className="flex items-center justify-between mb-[14px]">
                <p className="text-[13px] font-semibold text-[#0f172a]">Trust score</p>
                <span className="inline-flex items-center gap-[3px] px-[9px] py-[3px] rounded-full text-[11px] font-semibold bg-[#f0fdf4] text-[#16a34a]">{badge}</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-3">
                <p className="font-['Inter_Tight',sans-serif] text-[48px] font-bold text-[#0f172a] leading-none tracking-[-.04em]">{display}</p>
                <span className="text-[13px] text-[#94a3b8]">/ 900</span>
            </div>
            <div className="h-1 bg-[#f1f5f9] rounded-full overflow-hidden mb-1.5">
                <div className="h-full bg-[#10b981] rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between">
                <span className="text-[10.5px] text-[#94a3b8]">300</span>
                <span className="text-[10.5px] text-[#94a3b8]">900</span>
            </div>
            <p className="text-[11px] text-[#94a3b8] mt-2.5">Based on {completedTrades} trade{completedTrades !== 1 ? 's' : ''} · updated real-time</p>
        </div>
    );
};

export const QuickStatsGrid = ({
    totalVolume, volumeSymbol,
    completedCount, totalCount,
    disputeCount,
    referralEarning, referralSymbol,
}: {
    totalVolume: number; volumeSymbol: string;
    completedCount: number; totalCount: number;
    disputeCount: number;
    referralEarning: number; referralSymbol: string;
}) => {
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const fmtVolume = totalVolume >= 1_000_000 ? `${(totalVolume / 1_000_000).toFixed(1)}M` : totalVolume >= 1_000 ? `${(totalVolume / 1_000).toFixed(1)}K` : totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 });

    const cards = [
        { label: 'Total volume', value: `${volumeSymbol}${fmtVolume}`, chip: null as string | null, chipClass: '', sub: null as string | null },
        { label: 'Completed trades', value: String(completedCount), chip: `${totalCount} total`, chipClass: 'bg-[#eff6ff] text-[#2563eb]', sub: `${completionRate}% rate` },
        { label: 'Active disputes', value: String(disputeCount), chip: disputeCount > 0 ? 'Needs action' : null, chipClass: 'bg-[#fff1f2] text-[#e11d48]', sub: null },
        { label: 'Referral earnings', value: `${referralSymbol}${referralEarning.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, chip: null, chipClass: '', sub: null },
    ];

    return (
        <div className="grid grid-cols-4 gap-[14px]">
            {cards.map((c) => (
                <div key={c.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5">
                    <p className="text-[11.5px] font-medium text-[#94a3b8] mb-2.5">{c.label}</p>
                    <p className="font-['Inter_Tight',sans-serif] text-[28px] font-bold text-[#0f172a] tracking-[-.03em] mb-1.5">{c.value}</p>
                    <div className="flex items-center gap-1.5">
                        {c.chip && <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.chipClass}`}>{c.chip}</span>}
                        {c.sub && <span className="text-[11px] text-[#94a3b8]">{c.sub}</span>}
                    </div>
                </div>
            ))}
        </div>
    );
};

export interface PendingAction {
    key: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    iconBg: string;
    cardBorder?: string;
    action: () => void;
}

export const PendingActionsPanel = ({ actions }: { actions: PendingAction[] }) => {
    if (actions.length === 0) return null;
    return (
        <div className="mb-3.5">
            <h3 className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[#0f172a] mb-2.5">Needs your attention</h3>
            <div className="flex flex-col gap-2">
                {actions.map((a) => (
                    <div
                        key={a.key}
                        onClick={a.action}
                        className={`flex items-center gap-[11px] bg-white rounded-[14px] p-[13px_14px] cursor-pointer border ${a.cardBorder || 'border-[#e9eaec]'}`}
                    >
                        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${a.iconBg}`}>{a.icon}</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-extrabold text-[#0f172a]">{a.title}</p>
                            <p className="text-[11px] text-[#64748b] mt-0.5 font-normal truncate">{a.subtitle}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const PORTFOLIO_STYLE: Record<string, { bg: string; border: string; sub: string; track: string; fill: string }> = {
    NGN:  { bg: '#FEFDF5', border: '#FDE68A', sub: '#92400e', track: '#fde68a', fill: '#f59e0b' },
    USDT: { bg: '#F0FAFC', border: '#A5F3FC', sub: '#0e7490', track: '#a5f3fc', fill: '#0891b2' },
    USD:  { bg: '#F0FAF5', border: '#A7F3D0', sub: '#065f46', track: '#a7f3d0', fill: '#10b981' },
    BTC:  { bg: '#FFF7ED', border: '#FED7AA', sub: '#9a3412', track: '#fed7aa', fill: '#ea580c' },
    EUR:  { bg: '#EFF6FF', border: '#BFDBFE', sub: '#1e40af', track: '#bfdbfe', fill: '#2563eb' },
};
export const DEFAULT_PORTFOLIO_STYLE = { bg: '#F8FAFC', border: '#E2E8F0', sub: '#475569', track: '#e2e8f0', fill: '#64748b' };

export const PortfolioSection = ({
    balances,
    allTransactions = [],
}: {
    balances: any[];
    showBalance?: boolean;
    onToggleBalance?: () => void;
    allTransactions?: any[];
}) => {
    const maxAmount = Math.max(1, ...balances.map((b: any) => Number(b.amount) || 0));
    return (
        <div className="bg-white rounded-2xl border border-[#e9eaec] p-[26px]">
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h2 className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[#0f172a] tracking-[-.01em]">Portfolio</h2>
                    <p className="text-xs text-[#94a3b8] mt-[3px]">{balances.length} active wallet{balances.length !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-[12.5px] font-semibold text-[#10b981] cursor-pointer">View all</span>
            </div>
            <div className="flex flex-col gap-2.5">
                {balances.map((b: any, i: number) => {
                    const style = PORTFOLIO_STYLE[b.currency] || DEFAULT_PORTFOLIO_STYLE;
                    const currencyTxns = allTransactions.filter((t: any) => t.currency === b.currency && t.status === 'FINALIZED');
                    const tradeCount = currencyTxns.length;
                    const pct = Math.max(8, Math.round((Number(b.amount || 0) / maxAmount) * 100));
                    return (
                        <div key={i} className="p-4 rounded-[13px]" style={{ backgroundColor: style.bg, border: `1px solid ${style.border}` }}>
                            <div className="flex items-center gap-[11px] mb-[11px]">
                                <div className="w-9 h-9 rounded-full bg-white shrink-0 flex items-center justify-center overflow-hidden">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        {CURRENCY_ICONS[b.currency] || <DollarSign className="w-4 h-4 text-slate-700" />}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[13px] font-bold text-[#0f172a]">{b.currency}</p>
                                        <p className="font-['Inter_Tight',sans-serif] text-base font-bold text-[#0f172a] tracking-[-.02em]">
                                            {CURRENCY_SYMBOLS[b.currency] || ''}{Number(b.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <p className="text-[11px] font-normal" style={{ color: style.sub }}>{CURRENCY_NAMES[b.currency] || b.currency} · {tradeCount} trade{tradeCount !== 1 ? 's' : ''}</p>
                                        <div className="w-[5px] h-[5px] rounded-full bg-[#10b981]" />
                                    </div>
                                </div>
                            </div>
                            <div className="h-[3px] rounded-full" style={{ backgroundColor: style.track }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: style.fill }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const AccountsSection = ({ balances, showBalance = true }: { balances: any[], showBalance?: boolean }) => (
    <section>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Your Accounts</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {balances.map((b: any, i: number) => (
                <Card key={i} className="min-w-[260px] bg-gradient-to-br from-[#1a1c1e] to-[#0a0a0b] border-none rounded-[24px] shadow-2xl snap-start relative overflow-hidden group p-1">
                    <CardHeader className="pb-2">
                        <CardDescription className="font-semibold text-white/40 uppercase tracking-widest text-[10px]">{CURRENCY_NAMES[b.currency] || b.currency}</CardDescription>
                        <CardTitle className="text-2xl font-bold tracking-tight text-white border-none shadow-none mt-1">
                            {showBalance ? (
                                <>
                                    <span className="text-white/40 text-lg mr-1">{CURRENCY_SYMBOLS[b.currency] ?? ''}</span>
                                    {b.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </>
                            ) : (
                                <span className="tracking-widest">••••••</span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2 flex justify-between items-end">
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                                <Activity className="w-4 h-4 text-white/40" />
                            </div>
                        </div>
                        <div className={`w-14 h-14 rounded-[22px] ${CURRENCY_COLORS[b.currency] || 'bg-slate-800'} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 rotate-6`}>
                            <div className="w-8 h-8 flex items-center justify-center">
                                {CURRENCY_ICONS[b.currency] || <DollarSign className="w-6 h-6 text-white" />}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
            <Card className="min-w-[180px] bg-white border-2 border-dashed border-slate-100 rounded-[24px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 transition-all snap-start">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <span className="text-2xl font-light">+</span>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Card</span>
            </Card>
        </div>
    </section>
);

interface ExchangeWidgetProps {
    balances: any[];
    fromCurrency: string;
    setFromCurrency: (val: string) => void;
    toCurrency: string;
    setToCurrency: (val: string) => void;
    exchangeAmount: string;
    setExchangeAmount: (val: string) => void;
    handleExchange: () => void;
}

export const ExchangeWidget = ({
    balances,
    fromCurrency, setFromCurrency,
    toCurrency, setToCurrency,
    exchangeAmount, setExchangeAmount,
    handleExchange
}: ExchangeWidgetProps) => (
    <Card className="border-slate-200 rounded-2xl shadow-sm h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
            <CardTitle className="text-lg font-bold text-slate-800 border-none shadow-none">Exchange Money</CardTitle>
            <div className="p-2 bg-slate-50 rounded-lg"><ArrowRightLeft className="w-4 h-4 text-slate-400" /></div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-400">From</label>
                        <Select value={fromCurrency} onValueChange={setFromCurrency}>
                            <SelectTrigger className="w-full h-12 bg-slate-50 border-slate-200 focus:ring-primary"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                {balances.map((b: any) => (
                                    <SelectItem key={b.currency} value={b.currency}>{CURRENCY_NAMES[b.currency] || b.currency}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-400">To</label>
                        <Select value={toCurrency} onValueChange={setToCurrency}>
                            <SelectTrigger className="w-full h-12 bg-slate-50 border-slate-200 focus:ring-primary"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USD">US Dollar</SelectItem>
                                <SelectItem value="EUR">Euro</SelectItem>
                                <SelectItem value="BTC">Bitcoin</SelectItem>
                                <SelectItem value="USDT">Tether (USDT)</SelectItem>
                                <SelectItem value="NGN">Nigerian Naira</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="relative mt-2">
                    <Input type="number" placeholder="Amount" value={exchangeAmount} onChange={(e) => setExchangeAmount(e.target.value)} className="h-14 bg-slate-50 border-slate-200 pr-16 text-lg font-medium focus-visible:ring-primary" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">{fromCurrency}</div>
                </div>
                {fromCurrency && toCurrency && (
                    <p className="text-xs text-primary font-bold flex items-center justify-center gap-1 my-1 opacity-80">
                        <Activity className="w-3 h-3" /> Exchange rate: 1 {fromCurrency} = ~1.2 {toCurrency}
                    </p>
                )}
                <Button onClick={handleExchange} className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl mt-2 shadow-sm hover:shadow-md active:scale-[0.98]">
                    Continue Exchange
                </Button>
            </div>
        </CardContent>
    </Card>
);

export const WithdrawBanner = ({ onWithdraw }: { onWithdraw?: () => void }) => (
    <section className="bg-gradient-to-br from-[#0a2d1d] to-[#05140b] border border-[#0a2d1d] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-full group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2">Ready to withdraw?</h2>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">Secure escrow wallet. Withdraw to bank or crypto instantly.</p>
            <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer backdrop-blur-md transition-all border border-white/5 group/item">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-transform group-hover/item:scale-110"><Wallet className="w-5 h-5 text-emerald-400" /></div>
                    <div className="flex flex-col"><span className="font-semibold text-sm">Crypto Wallet</span><span className="text-xs text-white/40">BTC, USDT, ETH</span></div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer backdrop-blur-md transition-all border border-white/5 group/item">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-transform group-hover/item:scale-110"><Euro className="w-5 h-5 text-blue-400" /></div>
                    <div className="flex flex-col"><span className="font-semibold text-sm">Bank Wire Transfer</span><span className="text-xs text-white/40">SEPA, SWIFT</span></div>
                </div>
            </div>
            <Button
                onClick={onWithdraw}
                className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all"
            >
                Withdraw Now
            </Button>
        </div>
    </section>
);

export const TrustScore = ({ score = 92.8, totalTrades = 4250.00 }: { score?: number; totalTrades?: number }) => {
    // We map 0-100 score to 300-900 credit-score scale
    const boundedScore = Math.max(0, Math.min(100, score));
    const displayScore = Math.round(300 + (boundedScore / 100) * 600);

    const numTicks = 41;
    const ticks = Array.from({ length: numTicks }).map((_, i) => {
        const percent = (i / (numTicks - 1)) * 100;
        let color = '#22c55e'; // Green
        if (percent <= 25) color = '#ef4444'; // Red
        else if (percent <= 50) color = '#f97316'; // Orange
        else if (percent <= 75) color = '#3b82f6'; // Blue

        const angle = Math.PI - (i / (numTicks - 1)) * Math.PI;

        const innerRadius = 75;
        const outerRadius = 90; // All needles the same height

        const x1 = +(100 + innerRadius * Math.cos(angle)).toFixed(4);
        const y1 = +(100 - innerRadius * Math.sin(angle)).toFixed(4);
        const x2 = +(100 + outerRadius * Math.cos(angle)).toFixed(4);
        const y2 = +(100 - outerRadius * Math.sin(angle)).toFixed(4);

        return { x1, y1, x2, y2, color };
    });

    const scoreAngle = Math.PI - (boundedScore / 100) * Math.PI;
    const needleOuterR = 110;
    const needleInnerR = 55;

    const needleX1 = +(100 + needleInnerR * Math.cos(scoreAngle)).toFixed(4);
    const needleY1 = +(100 - needleInnerR * Math.sin(scoreAngle)).toFixed(4);
    const needleX2 = +(100 + needleOuterR * Math.cos(scoreAngle)).toFixed(4);
    const needleY2 = +(100 - needleOuterR * Math.sin(scoreAngle)).toFixed(4);

    let badgeText = "Excellent";
    let badgeColor = "text-[#22c55e] bg-[#ecfdf5]";
    if (displayScore < 500) {
        badgeText = "Poor";
        badgeColor = "text-[#ef4444] bg-[#fef2f2]";
    } else if (displayScore < 650) {
        badgeText = "Fair";
        badgeColor = "text-[#f97316] bg-[#fff7ed]";
    } else if (displayScore < 750) {
        badgeText = "Good";
        badgeColor = "text-[#3b82f6] bg-[#eff6ff]";
    }

    return (
        <Card className="border-slate-100 rounded-[32px] shadow-sm h-full overflow-hidden flex flex-col bg-white">
            <CardHeader className="flex flex-row items-baseline justify-between pb-0 pt-6 px-6 relative z-10 w-full">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-[#00a6e0] mb-[2px]">
                        <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" /></svg>
                        <span className="font-bold text-[10px] tracking-wide">Safeeely</span>
                    </div>
                    <div className="flex items-center gap-1.5 -ml-1">
                        <div className="relative w-5 h-5 flex items-center justify-center transform scale-[0.8]">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 absolute left-0 bottom-0.5 z-10" />
                            <div className="w-3.5 h-3.5 rounded-full border-[2px] border-slate-900 absolute right-0 top-0" />
                            <div className="w-[6px] h-[2px] bg-slate-900 absolute transform rotate-[45deg]" />
                        </div>
                        <CardTitle className="text-[20px] font-extrabold text-[#111827] border-none shadow-none tracking-tight">
                            Trust score
                        </CardTitle>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-xl px-2.5 py-1 cursor-pointer hover:bg-slate-50 transition-colors">
                    <span className="text-[12px] font-bold text-slate-700">Safeeely</span>
                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center pt-2 pb-6 px-6">
                <div className="relative w-full max-w-[280px] aspect-[1.8/1] mx-auto mt-4">
                    <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
                        {/* Inner Dotted Arc */}
                        <path
                            d="M 40 100 A 60 60 0 0 1 160 100"
                            fill="none"
                            stroke="#cbd5e1"
                            strokeWidth="1.5"
                            strokeDasharray="4 6"
                        />

                        {/* Ticks */}
                        {ticks.map((tick, i) => (
                            <line
                                key={i}
                                x1={tick.x1}
                                y1={tick.y1}
                                x2={tick.x2}
                                y2={tick.y2}
                                stroke={tick.color}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            />
                        ))}

                        {/* Arc Labels */}
                        <text x="35" y="118" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="700">300</text>
                        <text x="100" y="32" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="700">600</text>
                        <text x="165" y="118" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="700">900</text>

                        {/* Needle / Indicator */}
                        <line
                            x1={needleX1}
                            y1={needleY1}
                            x2={needleX2}
                            y2={needleY2}
                            stroke="#111827"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                        {/* Needle Circle */}
                        <circle
                            cx={needleX2}
                            cy={needleY2}
                            r="5.5"
                            fill="white"
                            stroke="#111827"
                            strokeWidth="3.5"
                            className="transition-all duration-1000 ease-out"
                        />
                        {/* Needle Text "your score" */}
                        <text
                            x={needleX2}
                            y={needleY2 - 12}
                            fontSize="9"
                            fill="#94a3b8"
                            textAnchor="middle"
                            fontWeight="600"
                            className="transition-all duration-1000 ease-out"
                        >
                            your score
                        </text>

                    </svg>

                    {/* Center Score Text */}
                    <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <span className="text-[54px] font-bold text-[#111827] leading-[1] tracking-[-0.04em]">
                            {displayScore}
                        </span>
                        <div className={`mt-1.5 ${badgeColor} px-4 py-1 rounded-[12px] font-bold text-[13px] tracking-wide shadow-sm border border-black/5`}>
                            {badgeText}
                        </div>
                    </div>
                </div>

                {/* Footer equivalent of "Next update in 31 days" */}
                <div className="mt-8 flex items-center justify-center gap-1.5 text-slate-400 font-medium text-[11px] mb-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Updated real-time by reviews</span>
                </div>

                {/* Simulated Cibil Black Button Cut */}
                <div className="mt-2 bg-[#111827] text-white px-5 py-3 rounded-xl font-bold text-[13px] shadow-sm w-[90%] text-center">
                    Total Volume: <span className="text-emerald-400 ml-1">${totalTrades?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
            </CardContent>
        </Card>
    );
};
