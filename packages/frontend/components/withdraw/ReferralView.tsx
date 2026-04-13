'use client';

import React, { useState, useEffect } from 'react';
import { Card as ShadcnCard, CardContent as ShadcnCardContent, CardHeader as ShadcnCardHeader, CardTitle as ShadcnCardTitle, CardDescription as ShadcnCardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Link as LinkIcon, Copy, CheckCircle2, QrCode, ArrowUpRight, DollarSign, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import QRCode from "react-qr-code";
import { SheetWithdrawal } from '@/components/withdraw/SheetWithdrawal';

interface ReferralStats {
    totalEarned: number;
    availableCommission: number;
    tier1Count: number;
    tier2Count: number;
    recentActivity: any[];
    leaderboard: any[];
}

export const ReferralView = ({ profile }: { profile: any }) => {
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [stats, setStats] = useState<ReferralStats>({
        totalEarned: 0,
        availableCommission: 0,
        tier1Count: 0,
        tier2Count: 0,
        recentActivity: [],
        leaderboard: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.safetag) {
            fetchStats();
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

    const referralLink = typeof window !== 'undefined'
        ? `${window.location.origin}/${(profile?.safetag || 'user').startsWith('@') ? profile.safetag : `@${profile?.safetag || 'user'}`}`
        : `https://Safeeely.com/${(profile?.safetag || 'user').startsWith('@') ? profile.safetag : `@${profile?.safetag || 'user'}`}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        toast.success('Referral link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header / Hero */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Referrals</h1>
                    <p className="text-sm md:text-base font-bold text-slate-400">Earn up to 1.5% commission on two tiers forever.</p>
                </div>
                <Button
                    onClick={() => setShowWithdraw(true)}
                    className="h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black shadow-xl px-8 flex items-center justify-center gap-2"
                >
                    <DollarSign size={18} />
                    Withdraw ${stats.availableCommission.toFixed(2)}
                </Button>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ShadcnCard className="bg-gradient-to-br from-[#16a34a] to-[#10b981] border-none rounded-[32px] shadow-lg shadow-emerald-500/20 text-white overflow-hidden relative">
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    <ShadcnCardHeader className="pb-2">
                        <ShadcnCardDescription className="font-bold text-emerald-100 uppercase tracking-widest text-[10px]">Total Earned</ShadcnCardDescription>
                        <ShadcnCardTitle className="text-4xl font-black tracking-tight border-none shadow-none mt-1">
                            ${stats.totalEarned.toFixed(2)}
                        </ShadcnCardTitle>
                    </ShadcnCardHeader>
                    <ShadcnCardContent>
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                            <DollarSign className="w-5 h-5 text-white" />
                        </div>
                    </ShadcnCardContent>
                </ShadcnCard>

                <ShadcnCard className="bg-white border-slate-100 rounded-[32px] shadow-sm relative overflow-hidden">
                    <ShadcnCardHeader className="pb-2">
                        <ShadcnCardDescription className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Tier 1 Referrals (10%)</ShadcnCardDescription>
                        <ShadcnCardTitle className="text-4xl font-black tracking-tight text-slate-900 border-none shadow-none mt-1">
                            {stats.tier1Count}
                        </ShadcnCardTitle>
                    </ShadcnCardHeader>
                    <ShadcnCardContent>
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                            <Users className="w-5 h-5 text-slate-400" />
                        </div>
                    </ShadcnCardContent>
                </ShadcnCard>

                <ShadcnCard className="bg-white border-slate-100 rounded-[32px] shadow-sm relative overflow-hidden">
                    <ShadcnCardHeader className="pb-2">
                        <ShadcnCardDescription className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Tier 2 Referrals (5%)</ShadcnCardDescription>
                        <ShadcnCardTitle className="text-4xl font-black tracking-tight text-slate-900 border-none shadow-none mt-1">
                            {stats.tier2Count}
                        </ShadcnCardTitle>
                    </ShadcnCardHeader>
                    <ShadcnCardContent>
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                            <Users className="w-5 h-5 text-slate-400" />
                        </div>
                    </ShadcnCardContent>
                </ShadcnCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Unified Link Card */}
                <ShadcnCard className="lg:col-span-2 bg-slate-900 border-none rounded-[32px] shadow-xl text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mx-10 -my-10 transition-transform group-hover:scale-110"></div>
                    <ShadcnCardHeader className="p-8 pb-4 relative z-10">
                        <ShadcnCardTitle className="text-2xl font-black tracking-tight">Your Universal Link</ShadcnCardTitle>
                        <p className="text-sm font-medium text-slate-400 mt-2">Share this one link everywhere. It automatically routes friends to Telegram, Discord, or the web.</p>
                    </ShadcnCardHeader>
                    <ShadcnCardContent className="p-8 pt-4 space-y-6 relative z-10">
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <LinkIcon size={18} className="text-emerald-400 shrink-0" />
                                <span className="font-mono text-sm font-bold text-slate-300 truncate">{referralLink}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                onClick={handleCopy}
                                className={`h-14 rounded-2xl font-black shadow-lg transition-all ${copied ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-900'}`}
                            >
                                {copied ? <CheckCircle2 size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
                                {copied ? 'Copied!' : 'Copy Link'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowQr(true)}
                                className="h-14 bg-transparent border-white/20 hover:bg-white/10 text-white rounded-2xl font-black"
                            >
                                <QrCode size={18} className="mr-2" />
                                Show QR
                            </Button>
                        </div>
                    </ShadcnCardContent>
                </ShadcnCard>

                {/* Leaderboard */}
                <ShadcnCard className="lg:col-span-3 bg-white border-slate-100 rounded-[32px] shadow-sm flex flex-col items-stretch h-full min-h-[400px]">
                    <ShadcnCardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                        <ShadcnCardTitle className="text-xl font-black text-slate-900 tracking-tight">Top 10 Leaderboard</ShadcnCardTitle>
                    </ShadcnCardHeader>
                    <ShadcnCardContent className="p-8 pt-0 flex-1 overflow-y-auto">
                        <div className="space-y-4">
                            {stats.leaderboard.length === 0 && !loading ? (
                                <p className="text-slate-400 font-medium text-sm text-center py-10">No referrals yet.</p>
                            ) : (
                                stats.leaderboard.map((lb: any, idx: number) => (
                                    <div key={idx} className="p-4 rounded-2xl border border-slate-50 bg-slate-50/50 flex items-center justify-between hover:border-emerald-500/30 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-sm bg-indigo-100 text-indigo-700">
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{lb.name} ({lb.user})</p>
                                                <p className="text-xs font-bold text-slate-400 tracking-tight">Tier {lb.tier}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-emerald-600">${lb.totalEarned.toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                            {loading && (
                                <div className="space-y-4">
                                    <div className="animate-pulse h-20 bg-slate-100 rounded-2xl"></div>
                                    <div className="animate-pulse h-20 bg-slate-100 rounded-2xl"></div>
                                </div>
                            )}
                        </div>
                    </ShadcnCardContent>
                </ShadcnCard>
            </div>

            {/* Detailed Transaction List */}
            <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight pl-2">Commission History</h2>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[800px] lg:min-w-full">
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="py-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-6">Referee</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Date</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Transaction ID</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Amount</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Type</TableHead>
                                    <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.recentActivity.length === 0 && !loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-20 text-center text-slate-400 font-medium">No commission history.</TableCell>
                                    </TableRow>
                                ) : loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-20 text-center text-slate-400 font-medium animate-pulse">Loading transaction data...</TableCell>
                                    </TableRow>
                                ) : (
                                    stats.recentActivity.map((tx: any) => (
                                        <TableRow key={tx.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="py-5 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold overflow-hidden uppercase">
                                                        {tx.user?.charAt(1) || '?'} {/* skipping @ character */}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900">
                                                            {tx.email ? (() => {
                                                                const parts = tx.email.split('@');
                                                                const user = parts[0];
                                                                const maskedUser = user.length > 3 ? user.slice(0, 3) + '***' : user + '***';
                                                                return `${maskedUser}@${parts[1] || 'Safeeely.com'}`;
                                                            })() : 'N/A'}
                                                        </p>
                                                        <p className="text-xs text-slate-400 font-medium">{tx.user}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-bold text-sm text-slate-800">{format(new Date(tx.date), 'dd MMM yyyy')}</p>
                                                <p className="text-xs text-slate-400 font-medium">At {format(new Date(tx.date), 'p')}</p>
                                            </TableCell>
                                            <TableCell>
                                                <code className="bg-slate-50 px-2 py-1 rounded text-[10px] font-mono font-bold text-slate-500">{tx.txn_code}</code>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-bold text-sm text-emerald-600">
                                                    +${Number(tx.amount).toLocaleString()} {tx.currency}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", tx.type === 'tier1' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>
                                                    {tx.type === 'tier1' ? 'T1' : 'T2'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                                                    {tx.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            {/* QR Modal */}
            <Dialog open={showQr} onOpenChange={setShowQr}>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm w-full p-8 bg-white text-slate-900 border-none rounded-[40px] shadow-2xl flex flex-col items-center space-y-6">
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black tracking-tight">Scan to Join</h3>
                        <p className="text-sm font-bold text-slate-400">{profile?.safetag?.startsWith('@') ? profile.safetag : `@${profile?.safetag}`}</p>
                    </div>

                    {/* Actual QR code rendering */}
                    <div className="bg-white rounded-[16px] border-2 border-slate-100 flex items-center justify-center p-4">
                        <QRCode
                            value={referralLink}
                            size={180}
                            bgColor="#ffffff"
                            fgColor="#0f172a"
                            level="H"
                        />
                    </div>

                    <Button onClick={() => setShowQr(false)} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black shadow-xl">
                        Close
                    </Button>
                </DialogContent>
            </Dialog>

            {/* Withdrawal Sheet — same as withdraw page */}
            <SheetWithdrawal
                isOpen={showWithdraw}
                onClose={() => setShowWithdraw(false)}
                safetag={profile?.safetag || ''}
                balances={[
                    { currency: 'USD', amount: stats.availableCommission }
                ]}
                onSuccess={() => {
                    setShowWithdraw(false);
                    toast.success('Referral earnings withdrawal submitted!');
                    fetchStats();
                }}
            />
        </div>
    );
};
