'use client';

import React, { useState } from 'react';
import {
    Card as ShadcnCard, CardContent as ShadcnCardContent, CardHeader as ShadcnCardHeader, CardTitle as ShadcnCardTitle, CardDescription as ShadcnCardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Wallet, CreditCard, Plus, MoreVertical, Clock, Send, DollarSign, Bitcoin
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { AlertTriangle, Trash2 } from 'lucide-react';

const historyData = [
    { name: 'Jul', earnings: 600 },
    { name: 'Aug', earnings: 1100 },
    { name: 'Sep', earnings: 800 },
    { name: 'Oct', earnings: 1400 },
    { name: 'Nov', earnings: 1300 },
    { name: 'Dec', earnings: 1512 },
];

import api from '@/lib/api';
import { ConnectMethodModal } from './ConnectMethodModal';

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
    const [methods, setMethods] = useState<any[]>([]);
    const [loadingMethods, setLoadingMethods] = useState(true);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [methodToDelete, setMethodToDelete] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

    React.useEffect(() => {
        fetchMethods();
        fetchWithdrawals();
    }, [profile?.safetag, refreshTrigger]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Top Cards: Multi-Currency Balance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {balances.map((b) => (
                    <ShadcnCard key={b.currency} className="bg-white border-slate-100 rounded-[32px] p-8 shadow-sm overflow-hidden relative border-none group hover:shadow-xl transition-all duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[40px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
                        <div className="flex flex-col gap-4 relative z-10">
                            <div className="flex items-center justify-between">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center p-2 bg-slate-50 group-hover:bg-white group-hover:shadow-sm transition-all`}>
                                    {b.currency === 'USD' ? (
                                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                            <DollarSign size={20} />
                                        </div>
                                    ) : b.currency === 'NGN' ? (
                                        <span className="text-2xl">🇳🇬</span>
                                    ) : b.currency === 'BTC' ? (
                                        <Bitcoin size={24} className="text-orange-500" />
                                    ) : (
                                        <Wallet size={20} className="text-slate-400" />
                                    )}
                                </div>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{b.currency} Asset</span>
                            </div>
                            
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                                    {b.currency === 'USD' ? '$' : b.currency === 'NGN' ? '₦' : ''}
                                    {Number(b.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 tracking-wider">Available Balance</p>
                            </div>
                        </div>
                    </ShadcnCard>
                ))}

                {/* Main Action Card (If many balances, this could be the 1st or a separate action prompt) */}
                <ShadcnCard className="bg-gradient-to-br from-[#0a2d1d] to-[#05140b] rounded-[32px] p-8 shadow-2xl relative border-none flex flex-col justify-center items-center text-center group">
                    <div className="absolute inset-0 bg-[url('/assets/images/noise.png')] opacity-10 mix-blend-overlay" />
                    <div className="relative z-10 space-y-6">
                        <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-emerald-500 shadow-inner group-hover:scale-110 transition-transform">
                            <Wallet size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-white font-black text-xl tracking-tight">Universal Payout</h3>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest max-w-[180px]">Withdraw any of your earnings to your linked accounts</p>
                        </div>
                        <Button
                            onClick={() => onInternalWithdraw('USD')}
                            className="bg-[#16a34a] hover:bg-[#15803d] text-white px-8 py-6 rounded-2xl text-xs font-black shadow-xl shadow-emerald-500/20 active:scale-[0.95] transition-all flex items-center justify-center gap-3 w-full"
                        >
                            Withdraw earnings
                        </Button>
                    </div>
                </ShadcnCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Payout Method: Left Bottom */}
                <ShadcnCard className="lg:col-span-2 bg-white border-slate-100 rounded-[32px] shadow-sm flex flex-col">
                    <ShadcnCardHeader className="p-8 pb-4">
                        <ShadcnCardTitle className="text-xl font-black text-slate-900 tracking-tight">Payout Method</ShadcnCardTitle>
                    </ShadcnCardHeader>
                    <ShadcnCardContent className="p-8 pt-0 space-y-4 flex-1">
                        {loadingMethods ? (
                            <div className="space-y-4">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-2xl" />
                                ))}
                            </div>
                        ) : (Array.isArray(methods) && methods.length > 0) ? (
                            <div className="space-y-4">
                                {methods.map((m) => (
                                    <div key={m.id} className="p-5 rounded-2xl border border-slate-50 bg-slate-50/30 flex items-center justify-between group hover:border-[#16a34a]/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center p-2">
                                                <img
                                                    src={m.details.logo || 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png'}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900">
                                                        {m.type === 'bank' ? m.details.bank_name : m.details.symbol}
                                                    </span>
                                                    {m.is_default && (
                                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[10px] font-black uppercase rounded-md tracking-wider">Primary</span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-400 font-medium tracking-tight">
                                                    {m.type === 'bank' ? `A/C: ${m.details.account_number}` : `${m.details.chain}: ${m.details.address.slice(0, 6)}...${m.details.address.slice(-4)}`}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setMethodToDelete(m);
                                                setIsDeleteModalOpen(true);
                                            }}
                                            className="text-slate-400 hover:text-rose-500 font-bold text-xs"
                                        >
                                            Disconnect
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    onClick={() => setIsConnectModalOpen(true)}
                                    variant="outline"
                                    className="w-full h-14 rounded-2xl border-dashed border-slate-200 text-slate-400 font-bold hover:border-[#16a34a] hover:text-[#16a34a] hover:bg-emerald-50/20 transition-all flex items-center justify-center gap-3"
                                >
                                    <Plus size={18} />
                                    Add Another Method
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                    <Plus size={32} />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-900">No payout methods</p>
                                    <p className="text-xs text-slate-400">Add a bank or wallet to withdraw funds.</p>
                                </div>
                                <Button
                                    onClick={() => setIsConnectModalOpen(true)}
                                    className="bg-slate-900 text-white rounded-xl px-6 h-10 font-bold text-xs"
                                >
                                    Connect Now
                                </Button>
                            </div>
                        )}

                        {!loadingMethods && methods.length < 3 && (
                            <div className="pt-4 border-t border-slate-50">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Suggest Connections</span>
                                <div className="space-y-3">
                                    {[
                                        { name: 'PayPal', icon: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg' },
                                        { name: 'Swift Bank Transfer', icon: <CreditCard className="text-blue-500" /> },
                                    ].map((item, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-slate-50 flex items-center justify-between hover:bg-slate-50/50 transition-all opacity-60">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center p-2">
                                                    {typeof item.icon === 'string' ? <img src={item.icon} className="w-6 h-6 object-contain" /> : item.icon}
                                                </div>
                                                <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                                            </div>
                                            <Button variant="ghost" className="text-slate-400 font-bold text-[10px] uppercase">Coming Soon</Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </ShadcnCardContent>
                </ShadcnCard>

                {/* Earnings History: Right Bottom */}
                <ShadcnCard className="lg:col-span-3 bg-white border-slate-100 rounded-[32px] shadow-sm flex flex-col">
                    <ShadcnCardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                        <ShadcnCardTitle className="text-xl font-black text-slate-900 tracking-tight">Earnings History</ShadcnCardTitle>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        </div>
                    </ShadcnCardHeader>
                    <ShadcnCardContent className="p-8 pt-0 flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border-none font-black text-sm">
                                                    ${payload[0].value}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="earnings"
                                    stroke="#16a34a"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#16a34a', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ShadcnCardContent>
                </ShadcnCard>
            </div>

            {/* Payout History Table */}
            <ShadcnCard className="bg-white border-slate-100 rounded-[32px] shadow-sm overflow-hidden border-none">
                <ShadcnCardHeader className="p-8 pb-2">
                    <ShadcnCardTitle className="text-xl font-black text-slate-900 tracking-tight">Payout History</ShadcnCardTitle>
                </ShadcnCardHeader>
                <ShadcnCardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Amount</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Payout Date</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Method</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Reference</th>
                                    <th className="px-8 py-5 text-right border-b border-slate-50"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingWithdrawals ? (
                                    [1, 2].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-8 py-6 h-16 bg-slate-50/50" />
                                        </tr>
                                    ))
                                ) : withdrawals.length > 0 ? (
                                    withdrawals.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6 font-black text-slate-900">{Number(row.amount).toLocaleString()} {row.currency}</td>
                                            <td className="px-8 py-6 text-sm font-bold text-slate-500">{new Date(row.created_at).toLocaleDateString()}</td>
                                            <td className="px-8 py-6 text-sm font-bold text-slate-500">
                                                {row.details.bank_name || row.details.symbol || 'Payout'}
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${row.status === 'PAID' ? 'bg-emerald-50 text-emerald-500' :
                                                    row.status === 'PROCESSING' ? 'bg-blue-50 text-blue-500' :
                                                        row.status === 'FAILED' ? 'bg-rose-50 text-rose-500' : 'bg-orange-50 text-orange-500'
                                                    }`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-xs font-mono font-bold text-slate-400">{row.reference}</td>
                                            <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold">No payout history found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </ShadcnCardContent>
            </ShadcnCard>
            <ConnectMethodModal
                isOpen={isConnectModalOpen}
                onClose={() => setIsConnectModalOpen(false)}
                safetag={profile?.safetag}
                onSuccess={fetchMethods}
            />
            {/* Disconnect Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md w-full p-0 bg-white text-slate-900 border-none rounded-[40px] overflow-hidden shadow-2xl">
                    <div className="p-10 text-center space-y-8">
                        <div className="mx-auto w-20 h-20 bg-rose-50 rounded-[32px] flex items-center justify-center text-rose-500 mb-2">
                            <AlertTriangle size={40} />
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-2xl font-black tracking-tight">Disconnect account?</h3>
                            <p className="text-sm font-bold text-slate-400 leading-relaxed"> Are you sure you want to remove this payout method? You will need to add it again to withdraw.</p>
                        </div>

                        {methodToDelete && (
                            <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center gap-4 text-left">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-2">
                                    <img
                                        src={methodToDelete.details.logo || 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png'}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-black text-slate-900">
                                        {methodToDelete.type === 'bank' ? methodToDelete.details.bank_name : methodToDelete.details.symbol}
                                    </span>
                                    <span className="text-xs text-slate-400 font-bold font-mono">
                                        {methodToDelete.type === 'bank'
                                            ? `${methodToDelete.details.account_number.slice(0, 4)}****${methodToDelete.details.account_number.slice(-4)}`
                                            : `${methodToDelete.details.address.slice(0, 6)}...${methodToDelete.details.address.slice(-4)}`
                                        }
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="h-14 rounded-2xl border-slate-100 font-black text-slate-400"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeleteMethod}
                                className="h-14 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-100 flex items-center justify-center gap-2"
                            >
                                <Trash2 size={18} />
                                Disconnect
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
