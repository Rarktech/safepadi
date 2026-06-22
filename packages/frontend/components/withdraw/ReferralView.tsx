'use client';

import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Copy, CheckCircle2, QrCode, Users, TrendingUp, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { SheetWithdrawal } from '@/components/withdraw/SheetWithdrawal';

interface CurrencyEarning {
    currency: string;
    totalEarned: number;
}

interface ReferralStats {
    earningsByCurrency: CurrencyEarning[];
    tier1Count: number;
    tier2Count: number;
    recentActivity: any[];
    leaderboard: any[];
}

const SYMBOLS: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
const fmtAmount = (amount: number, currency: string) => {
    const sym = SYMBOLS[currency] || '';
    return sym + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const RANK_STYLES = [
    { bg: '#fef9c3', border: '#fde68a', color: '#92400e' },
    { bg: '#f1f5f9', border: '#e2e8f0', color: '#475569' },
    { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' },
];
const DEFAULT_RANK_STYLE = { bg: '#f8f9fa', border: '#e9eaec', color: '#64748b' };

export const ReferralView = ({ profile }: { profile: any }) => {
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [stats, setStats] = useState<ReferralStats>({
        earningsByCurrency: [],
        tier1Count: 0,
        tier2Count: 0,
        recentActivity: [],
        leaderboard: []
    });
    const [loading, setLoading] = useState(true);
    const [rates, setRates] = useState({ tier1Percent: 10, tier2Percent: 5 });

    useEffect(() => {
        if (profile?.safetag) {
            fetchStats();
            fetchRates();
        }
    }, [profile]);

    const fetchStats = async () => {
        try {
            const { data } = await api.get(`/referrals/${encodeURIComponent(profile.safetag)}/stats`);
            setStats(data);
        } catch (err) {
            console.error('Failed to load referral stats', err);
            toast.error('Failed to load referral stats');
        } finally {
            setLoading(false);
        }
    };

    const fetchRates = async () => {
        try {
            const { data } = await api.get('/referrals/rates');
            setRates({
                tier1Percent: Math.round(data.referral_tier1_percent * 100 * 100) / 100,
                tier2Percent: Math.round(data.referral_tier2_percent * 100 * 100) / 100,
            });
        } catch {
            // Non-fatal: keep default 10%/5% display
        }
    };

    const decodedSafetag = (profile?.safetag || 'user').startsWith('@') ? profile.safetag : `@${profile?.safetag || 'user'}`;
    const cleanSafetag = decodedSafetag.replace(/^@/, '');

    const referralLink = typeof window !== 'undefined'
        ? `${window.location.origin}/${decodedSafetag}`
        : `https://Safeeely.com/${decodedSafetag}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        toast.success('Referral link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const earningsDisplay = stats.earningsByCurrency.length === 0
        ? [{ currency: 'NGN', totalEarned: 0, displayAmount: '₦0.00' }]
        : stats.earningsByCurrency.map(e => ({ ...e, displayAmount: fmtAmount(e.totalEarned, e.currency) }));

    const StatCard = ({ icon, iconBg, label, value, sub, chip, dark }: { icon: React.ReactNode; iconBg: string; label: string; value: React.ReactNode; sub: string; chip?: string; dark?: boolean }) => (
        <div className={`rounded-[18px] p-[22px] relative overflow-hidden ${dark ? 'bg-[#0f172a]' : 'bg-white border border-[#e9eaec]'}`}>
            {dark && (
                <>
                    <div className="absolute -top-10 -right-10 w-[140px] h-[140px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(255,255,255,.05)' }} />
                    <div className="absolute -top-[10px] -right-[10px] w-20 h-20 rounded-full pointer-events-none" style={{ border: '1px solid rgba(255,255,255,.05)' }} />
                </>
            )}
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${iconBg}`}>{icon}</div>
                {chip && <span className="chip cg relative z-10">{chip}</span>}
            </div>
            <p className={`text-[11px] font-medium mb-2 relative z-10 ${dark ? 'text-white/35' : 'text-[#94a3b8]'}`}>{label}</p>
            <div className="relative z-10">{value}</div>
            <p className={`text-[11px] mt-2 relative z-10 ${dark ? 'text-white/25' : 'text-[#94a3b8]'}`}>{sub}</p>
        </div>
    );

    return (
        <div className="pb-24 md:pb-8">
            {/* Desktop */}
            <div className="hidden md:flex flex-col gap-5">
                {/* Hero row */}
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <h1 className="font-['Inter_Tight',sans-serif] text-[32px] font-black text-[#0f172a] tracking-[-.03em] leading-[1.1] mb-1.5">Referrals</h1>
                        <p className="text-sm text-[#64748b]">
                            Earn <strong className="text-[#10b981] font-bold">{rates.tier1Percent}%</strong> on Tier 1 and{' '}
                            <strong className="text-[#10b981] font-bold">{rates.tier2Percent}%</strong> on Tier 2 — every trade, forever.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowWithdraw(true)}
                        className="flex items-center gap-[7px] bg-[#0f172a] rounded-full px-[22px] py-[13px] text-white font-bold text-sm whitespace-nowrap shrink-0 shadow-[0_3px_12px_rgba(15,23,42,.18)]"
                    >
                        <ArrowUpRight className="w-[15px] h-[15px]" />
                        Withdraw earnings
                    </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-[14px]">
                    <StatCard
                        icon={<TrendingUp className="w-4 h-4 text-[#10b981]" />}
                        iconBg="bg-[#10b981]/20"
                        label="Commissions earned"
                        value={
                            <div className="flex flex-col gap-[3px]">
                                {earningsDisplay.map(e => (
                                    <div key={e.currency} className="flex items-baseline gap-1.5">
                                        <p className="font-['Inter_Tight',sans-serif] text-[28px] font-extrabold text-white tracking-[-.03em] leading-none">{e.displayAmount}</p>
                                        <span className="text-xs font-semibold text-white/40">{e.currency}</span>
                                    </div>
                                ))}
                            </div>
                        }
                        sub="From all referred trades"
                        dark
                    />
                    <StatCard
                        icon={<Users className="w-4 h-4 text-[#16a34a]" />}
                        iconBg="bg-[#f0fdf4]"
                        label="Tier 1 referrals"
                        value={<p className="font-['Inter_Tight',sans-serif] text-[32px] font-extrabold text-[#0f172a] tracking-[-.03em] leading-none">{stats.tier1Count}</p>}
                        sub="Direct sign-ups"
                        chip={`${rates.tier1Percent}% per trade`}
                    />
                    <StatCard
                        icon={<Users className="w-4 h-4 text-[#2563eb]" />}
                        iconBg="bg-[#eff6ff]"
                        label="Tier 2 referrals"
                        value={<p className="font-['Inter_Tight',sans-serif] text-[32px] font-extrabold text-[#0f172a] tracking-[-.03em] leading-none">{stats.tier2Count}</p>}
                        sub="Friends of friends"
                        chip={`${rates.tier2Percent}% per trade`}
                    />
                </div>

                {/* Link + Leaderboard */}
                <div className="grid grid-cols-[380px_1fr] gap-[18px]">
                    {/* Link card */}
                    <div className="bg-[#0f172a] rounded-[20px] p-7 flex flex-col gap-5 relative overflow-hidden">
                        <div className="absolute -top-[60px] -right-[60px] w-[200px] h-[200px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(255,255,255,.04)' }} />
                        <div className="absolute -top-5 -right-5 w-[110px] h-[110px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(255,255,255,.04)' }} />

                        <div className="relative z-10">
                            <h2 className="font-['Inter_Tight',sans-serif] text-lg font-extrabold text-white tracking-[-.01em] mb-1.5">Your referral link</h2>
                            <p className="text-xs text-white/40 leading-[1.6]">Share this link. When friends sign up and trade, you earn forever on every transaction they make.</p>
                        </div>

                        <div className="bg-white/[.06] border border-white/[.08] rounded-xl p-[14px_16px] flex items-center gap-[10px] min-w-0 relative z-10">
                            <LinkIcon className="w-[14px] h-[14px] text-white/40 shrink-0" />
                            <span className="text-xs font-semibold text-white/60 whitespace-nowrap overflow-hidden text-ellipsis flex-1">{referralLink}</span>
                        </div>

                        <div className="flex gap-[9px] relative z-10">
                            <button
                                onClick={handleCopy}
                                className={`flex-1 flex items-center justify-center gap-[7px] rounded-[11px] p-3 font-bold text-[13.5px] transition-colors ${copied ? 'bg-[#10b981] text-white' : 'bg-white text-[#0f172a]'}`}
                            >
                                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied!' : 'Copy link'}
                            </button>
                            <button
                                onClick={() => setShowQr(true)}
                                className="flex-1 flex items-center justify-center gap-[7px] bg-white/[.07] border border-white/10 rounded-[11px] p-3 text-white/75 font-semibold text-[13.5px]"
                            >
                                <QrCode className="w-3.5 h-3.5" />
                                QR code
                            </button>
                        </div>

                        <div className="border-t border-white/[.07] pt-[18px] flex flex-col gap-[11px] relative z-10">
                            <p className="text-[11px] font-semibold text-white/30 tracking-[.04em]">How it works</p>
                            {[
                                'Share your link with friends',
                                'They sign up & complete trades (Tier 1)',
                                `Their referrals trade too (Tier 2 — ${rates.tier2Percent}%)`,
                            ].map((step, i) => (
                                <div key={i} className="flex items-center gap-[11px]">
                                    <div className="w-7 h-7 rounded-lg bg-[#10b981]/[.15] flex items-center justify-center shrink-0">
                                        <span className="text-xs font-extrabold text-[#10b981]">{i + 1}</span>
                                    </div>
                                    <p className="text-xs text-white/45">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="bg-white border border-[#e9eaec] rounded-2xl p-[24px_26px] flex flex-col">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[#0f172a] tracking-[-.01em]">Top 10 leaderboard</h2>
                                <p className="text-xs text-[#94a3b8] mt-0.5">Most active referrers this month</p>
                            </div>
                            <span className="chip cs">Live</span>
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                            {stats.leaderboard.length === 0 && !loading ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center gap-2.5">
                                    <div className="w-12 h-12 rounded-[13px] bg-[#f8f9fa] flex items-center justify-center">
                                        <Users className="w-5 h-5 text-[#94a3b8]" />
                                    </div>
                                    <p className="text-[13px] font-bold text-[#0f172a]">No referrals yet</p>
                                    <p className="text-xs text-[#94a3b8]">Start sharing your link to appear on the leaderboard.</p>
                                </div>
                            ) : (
                                stats.leaderboard.map((lb: any, idx: number) => {
                                    const rs = idx < 3 ? RANK_STYLES[idx] : DEFAULT_RANK_STYLE;
                                    return (
                                        <div key={idx} className="flex items-center gap-3 p-[13px_16px] rounded-[13px] border border-[#f1f5f9] bg-[#fafafa] hover:border-[#10b981] transition-colors">
                                            <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0" style={{ background: rs.bg, border: `1px solid ${rs.border}`, color: rs.color }}>
                                                <span className="font-['Inter_Tight',sans-serif] text-xs font-extrabold">#{idx + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13.5px] font-bold text-[#0f172a] truncate">{lb.name}</p>
                                                <p className="text-[11px] text-[#94a3b8] mt-px">{lb.user} · Tier {lb.tier}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-['Inter_Tight',sans-serif] text-sm font-bold text-[#10b981]">${Number(lb.totalEarned).toFixed(2)}</p>
                                                <p className="text-[10px] text-[#94a3b8] mt-px">total earned</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            {loading && (
                                <div className="flex flex-col gap-2">
                                    <div className="animate-pulse h-[60px] bg-[#f1f5f9] rounded-[13px]" />
                                    <div className="animate-pulse h-[60px] bg-[#f1f5f9] rounded-[13px]" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Commission history */}
                <div className="bg-white border border-[#e9eaec] rounded-2xl overflow-hidden">
                    <div className="p-[22px_26px_16px] flex items-center justify-between">
                        <div>
                            <h2 className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a] tracking-[-.01em]">Commission history</h2>
                            <p className="text-xs text-[#94a3b8] mt-0.5">Every referral commission you've earned</p>
                        </div>
                        <span className="chip cs">{stats.recentActivity.length} records</span>
                    </div>

                    <div className="grid grid-cols-[1.6fr_1fr_1fr_100px_80px_90px] gap-3 px-6 py-[10px] bg-[#fafafa] border-t border-b border-[#f3f4f6]">
                        <p className="text-[11px] font-semibold text-[#94a3b8]">Referee</p>
                        <p className="text-[11px] font-semibold text-[#94a3b8]">Date</p>
                        <p className="text-[11px] font-semibold text-[#94a3b8]">Transaction</p>
                        <p className="text-[11px] font-semibold text-[#94a3b8]">Amount</p>
                        <p className="text-[11px] font-semibold text-[#94a3b8]">Tier</p>
                        <p className="text-[11px] font-semibold text-[#94a3b8]">Status</p>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center text-[#94a3b8] font-medium animate-pulse">Loading transaction data...</div>
                    ) : stats.recentActivity.length === 0 ? (
                        <div className="py-16 px-6 text-center flex flex-col items-center gap-2.5">
                            <div className="w-12 h-12 rounded-[13px] bg-[#f8f9fa] flex items-center justify-center">
                                <ArrowUpRight className="w-5 h-5 text-[#94a3b8]" />
                            </div>
                            <p className="text-[13.5px] font-bold text-[#0f172a]">No commissions yet</p>
                            <p className="text-xs text-[#94a3b8]">Start referring to earn commissions on every trade.</p>
                        </div>
                    ) : (
                        stats.recentActivity.map((tx: any) => {
                            const userStr = tx.user || '?';
                            const initial = userStr.charAt(userStr.startsWith('@') ? 1 : 0).toUpperCase() || '?';
                            const maskedEmail = tx.email ? (() => {
                                const parts = tx.email.split('@');
                                const user = parts[0];
                                const masked = user.length > 3 ? user.slice(0, 3) + '***' : user + '***';
                                return `${masked}@${parts[1] || 'safeeely.com'}`;
                            })() : 'N/A';
                            return (
                                <div key={tx.id} className="grid grid-cols-[1.6fr_1fr_1fr_100px_80px_90px] gap-3 items-center px-6 py-[13px] border-b border-[#f3f4f6] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                                    <div className="flex items-center gap-[10px] min-w-0">
                                        <div className="w-[34px] h-[34px] rounded-full bg-[#f1f5f9] flex items-center justify-center font-['Inter_Tight',sans-serif] text-[13px] font-extrabold text-[#475569] shrink-0">{initial}</div>
                                        <div className="min-w-0">
                                            <p className="text-[12.5px] font-bold text-[#0f172a] truncate">{maskedEmail}</p>
                                            <p className="text-[10.5px] text-[#94a3b8] mt-px">{tx.user}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[12.5px] font-semibold text-[#0f172a]">{format(new Date(tx.date), 'MMM d, yyyy')}</p>
                                        <p className="text-[10.5px] text-[#94a3b8] mt-px">{format(new Date(tx.date), 'p')}</p>
                                    </div>
                                    <div>
                                        <code className="bg-[#f7f8f9] border border-[#e9eaec] rounded-[6px] px-2 py-[3px] text-[10.5px] font-bold text-[#475569]">{tx.txn_code}</code>
                                    </div>
                                    <p className="font-['Inter_Tight',sans-serif] text-[13.5px] font-bold text-[#10b981]">+{fmtAmount(tx.amount, tx.currency)}</p>
                                    <div>
                                        <span className={cn("chip", tx.type === 'tier1' ? 'cg' : 'cb')}>{tx.type === 'tier1' ? 'T1' : 'T2'}</span>
                                    </div>
                                    <div>
                                        <span className={cn("chip", tx.status === 'COMPLETED' ? 'cg' : 'ca')}>{tx.status === 'COMPLETED' ? 'Completed' : 'Pending'}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col gap-3 p-4">
                {/* Link hero card */}
                <div className="bg-[#0f172a] rounded-[20px] p-[22px] relative overflow-hidden">
                    <div className="absolute -top-[50px] -right-[50px] w-40 h-40 rounded-full pointer-events-none" style={{ border: '1px solid rgba(255,255,255,.05)' }} />
                    <p className="text-[10.5px] font-semibold text-white/35 tracking-[.1em] mb-2 relative z-10">YOUR REFERRAL LINK</p>
                    <p className="text-[12.5px] font-semibold text-white/55 whitespace-nowrap overflow-hidden text-ellipsis mb-4 relative z-10">{referralLink}</p>
                    <div className="flex gap-[9px] relative z-10">
                        <button
                            onClick={handleCopy}
                            className={`flex-1 flex items-center justify-center gap-[6px] rounded-[11px] p-3 font-bold text-[13px] ${copied ? 'bg-[#10b981] text-white' : 'bg-white/[.12] border border-white/[.15] text-white/85'}`}
                        >
                            {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? 'Copied!' : 'Copy link'}
                        </button>
                        <button onClick={() => setShowQr(true)} className="flex-1 flex items-center justify-center gap-[6px] bg-white/[.08] border border-white/10 rounded-[11px] p-3 text-white/70 font-semibold text-[13px]">
                            <QrCode className="w-3.5 h-3.5" />
                            QR code
                        </button>
                        <button onClick={() => setShowWithdraw(true)} className="flex items-center justify-center w-11 h-11 bg-[#10b981] rounded-[11px] shrink-0">
                            <ArrowUpRight className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-[10px]">
                    <div className="bg-white border border-[#e9eaec] rounded-2xl p-4">
                        <p className="text-[10.5px] font-medium text-[#94a3b8] mb-1.5">Tier 1 · {rates.tier1Percent}%</p>
                        <p className="font-['Inter_Tight',sans-serif] text-[26px] font-extrabold text-[#0f172a] tracking-[-.03em] leading-none mb-1">{stats.tier1Count}</p>
                        <p className="text-[10.5px] text-[#94a3b8]">Direct referrals</p>
                    </div>
                    <div className="bg-white border border-[#e9eaec] rounded-2xl p-4">
                        <p className="text-[10.5px] font-medium text-[#94a3b8] mb-1.5">Tier 2 · {rates.tier2Percent}%</p>
                        <p className="font-['Inter_Tight',sans-serif] text-[26px] font-extrabold text-[#0f172a] tracking-[-.03em] leading-none mb-1">{stats.tier2Count}</p>
                        <p className="text-[10.5px] text-[#94a3b8]">Friends of friends</p>
                    </div>
                </div>

                {/* Earnings strip */}
                <div className="bg-[#0f172a] rounded-2xl p-[16px_18px] flex items-center justify-between">
                    <div>
                        <p className="text-[10.5px] font-medium text-white/35 mb-1">Total commissions</p>
                        {earningsDisplay.map(e => (
                            <p key={e.currency} className="font-['Inter_Tight',sans-serif] text-[22px] font-extrabold text-white tracking-[-.03em]">
                                {e.displayAmount} <span className="text-[13px] text-white/40">{e.currency}</span>
                            </p>
                        ))}
                    </div>
                    <div className="w-[38px] h-[38px] rounded-[10px] bg-[#10b981]/[.15] flex items-center justify-center shrink-0">
                        <TrendingUp className="w-[17px] h-[17px] text-[#10b981]" />
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="mt-1">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[#0f172a]">Leaderboard</h3>
                        <span className="chip cs">Top 10</span>
                    </div>
                    {stats.leaderboard.length === 0 && !loading ? (
                        <div className="p-[28px_20px] bg-white rounded-[14px] border border-[#e9eaec] text-center">
                            <p className="text-[13px] font-semibold text-[#94a3b8]">No referrals yet</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {stats.leaderboard.map((lb: any, idx: number) => {
                                const rs = idx < 3 ? RANK_STYLES[idx] : DEFAULT_RANK_STYLE;
                                return (
                                    <div key={idx} className="flex items-center gap-3 p-[14px_16px] bg-white rounded-[14px] border border-[#e9eaec]">
                                        <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0" style={{ background: rs.bg, border: `1px solid ${rs.border}`, color: rs.color }}>
                                            <span className="font-['Inter_Tight',sans-serif] text-xs font-extrabold">#{idx + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13.5px] font-bold text-[#0f172a] truncate">{lb.name}</p>
                                            <p className="text-[11px] text-[#94a3b8] mt-px">{lb.user}</p>
                                        </div>
                                        <p className="font-['Inter_Tight',sans-serif] text-sm font-bold text-[#10b981] shrink-0">${Number(lb.totalEarned).toFixed(2)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Commission history */}
                <div className="mt-1">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[#0f172a]">Commission history</h3>
                        <span className="chip cs">{stats.recentActivity.length}</span>
                    </div>
                    {loading ? (
                        <div className="p-[28px_20px] bg-white rounded-[14px] border border-[#e9eaec] text-center">
                            <p className="text-[13px] font-semibold text-[#94a3b8] animate-pulse">Loading...</p>
                        </div>
                    ) : stats.recentActivity.length === 0 ? (
                        <div className="p-[28px_20px] bg-white rounded-[14px] border border-[#e9eaec] text-center">
                            <p className="text-[13px] font-semibold text-[#94a3b8]">No commissions yet</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-px bg-[#e9eaec] rounded-2xl overflow-hidden">
                            {stats.recentActivity.map((tx: any) => {
                                const userStr = tx.user || '?';
                                const initial = userStr.charAt(userStr.startsWith('@') ? 1 : 0).toUpperCase() || '?';
                                const maskedEmail = tx.email ? (() => {
                                    const parts = tx.email.split('@');
                                    const user = parts[0];
                                    const masked = user.length > 3 ? user.slice(0, 3) + '***' : user + '***';
                                    return `${masked}@${parts[1] || 'safeeely.com'}`;
                                })() : 'N/A';
                                return (
                                    <div key={tx.id} className="flex items-center gap-3 p-[14px_16px] bg-white">
                                        <div className="w-[38px] h-[38px] rounded-full bg-[#f1f5f9] flex items-center justify-center font-['Inter_Tight',sans-serif] text-[13px] font-extrabold text-[#475569] shrink-0">{initial}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold text-[#0f172a] truncate">{maskedEmail}</p>
                                            <p className="text-[11px] text-[#94a3b8] mt-px">{format(new Date(tx.date), 'MMM d')} · {tx.txn_code}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-['Inter_Tight',sans-serif] text-[13px] font-bold text-[#10b981]">+{fmtAmount(tx.amount, tx.currency)}</p>
                                            <span className={cn("chip", tx.type === 'tier1' ? 'cg' : 'cb')}>{tx.type === 'tier1' ? 'T1' : 'T2'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* QR Modal */}
            {showQr && (
                <div className="fixed inset-0 z-[80] bg-[#0f172a]/50 backdrop-blur-[3px] flex items-center justify-center" onClick={() => setShowQr(false)}>
                    <div className="bg-white rounded-[24px] p-8 w-[320px] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-5">
                            <h3 className="font-['Inter_Tight',sans-serif] text-lg font-extrabold text-[#0f172a] tracking-[-.02em] mb-1">Scan to join Safeeely</h3>
                            <p className="text-xs text-[#94a3b8]">{decodedSafetag}</p>
                        </div>
                        <div className="flex justify-center mb-4">
                            <div className="w-[196px] h-[196px] bg-white border-2 border-[#e9eaec] rounded-[14px] p-3.5 flex items-center justify-center overflow-hidden">
                                <img src={`/api/referrals/${cleanSafetag}/qr`} alt="Referral QR code" className="w-full h-full object-contain rounded-[6px]" />
                            </div>
                        </div>
                        <div className="bg-[#f7f8f9] rounded-[10px] p-[10px_14px] mb-4 text-center">
                            <p className="text-[11px] font-semibold text-[#94a3b8] mb-0.5">Link</p>
                            <p className="text-xs font-bold text-[#0f172a] break-all">{referralLink}</p>
                        </div>
                        <button onClick={handleCopy} className="w-full bg-[#0f172a] rounded-xl p-[13px] text-white font-bold text-sm flex items-center justify-center gap-[7px]">
                            <Copy className="w-3.5 h-3.5" />
                            Copy link
                        </button>
                    </div>
                </div>
            )}

            {/* Withdrawal Sheet — same as withdraw page */}
            <SheetWithdrawal
                isOpen={showWithdraw}
                onClose={() => setShowWithdraw(false)}
                safetag={profile?.safetag || ''}
                balances={stats.earningsByCurrency.map(e => ({ currency: e.currency, amount: e.totalEarned }))}
                onSuccess={() => {
                    setShowWithdraw(false);
                    toast.success('Referral earnings withdrawal submitted!');
                    fetchStats();
                }}
            />

            <style jsx>{`
                .chip { display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 600; }
                .cg { background: #f0fdf4; color: #16a34a; }
                .cs { background: #f1f5f9; color: #475569; }
                .cb { background: #eff6ff; color: #2563eb; }
                .ca { background: #fffbeb; color: #d97706; }
            `}</style>
        </div>
    );
};
