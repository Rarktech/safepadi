
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ShieldAlert, 
    Search, 
    Filter, 
    ChevronRight, 
    Clock, 
    CheckCircle, 
    AlertCircle,
    User,
    ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/Sidebar';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function AdminDisputesPage() {
    const router = useRouter();
    const [disputes, setDisputes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, OPEN, RESOLVED

    useEffect(() => {
        fetchDisputes();
    }, [filter]);

    const fetchDisputes = async () => {
        try {
            setLoading(true);
            const statusParam = filter !== 'ALL' ? `?status=${filter}` : '';
            const res = await axios.get(`${API_URL}/admin/disputes${statusParam}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            setDisputes(res.data);
        } catch (err) {
            console.error('Failed to fetch disputes:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <AdminSidebar />
            
            <main className="flex-1 p-8 lg:p-12">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Safeeely Ecosystem</span>
                                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Resolution Center</span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Active Disputes</h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-sm">
                                {['ALL', 'OPEN', 'RESOLVED'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setFilter(s)}
                                        className={cn(
                                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            filter === s 
                                                ? "bg-slate-900 text-white shadow-lg" 
                                                : "text-slate-400 hover:text-slate-900"
                                        )}
                                    >
                                        {s === 'ALL' ? 'Everything' : s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-colors">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Untouched Cases</p>
                                <p className="text-3xl font-black text-slate-900">{disputes.filter(d => d.status === 'OPEN').length}</p>
                            </div>
                            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                                <Clock className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Resolved Today</p>
                                <p className="text-3xl font-black text-slate-900">{disputes.filter(d => d.status === 'RESOLVED').length}</p>
                            </div>
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="bg-[#020617] p-8 rounded-[32px] shadow-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Locked Value</p>
                                <p className="text-3xl font-black text-white">
                                    ${disputes.filter(d => d.status === 'OPEN').reduce((sum, d) => sum + Number(d.transaction?.total_amount || 0), 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
                        {loading ? (
                            <div className="p-20 text-center">
                                <div className="w-12 h-12 border-4 border-slate-100 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opening Secure Archive</p>
                            </div>
                        ) : disputes.length === 0 ? (
                            <div className="p-20 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-8 h-8 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">Clean Slate</h3>
                                <p className="text-sm text-slate-400 font-medium">No disputes require your attention at the moment.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {disputes.map((dispute) => (
                                    <div 
                                        key={dispute.id}
                                        onClick={() => router.push(`/admin/disputes/${dispute.id}`)}
                                        className="p-8 hover:bg-slate-50 transition-all cursor-pointer group flex items-center gap-10"
                                    >
                                        <div className="shrink-0 relative">
                                            <div className={cn(
                                                "w-16 h-16 rounded-[24px] flex items-center justify-center transition-all group-hover:rotate-6",
                                                dispute.status === 'OPEN' ? "bg-rose-50 text-rose-500" : "bg-slate-100 text-slate-400"
                                            )}>
                                                <AlertCircle className="w-7 h-7" />
                                            </div>
                                            {dispute.status === 'OPEN' && (
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 border-4 border-white rounded-full animate-pulse" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case ID: {dispute.id.slice(0, 8)}</span>
                                                <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                                <span className={cn(
                                                    "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                                                    dispute.status === 'OPEN' ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                                                )}>
                                                    {dispute.status}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900 group-hover:text-rose-600 transition-colors truncate">
                                                {dispute.transaction?.product_name || 'Goods/Services Dispute'}
                                            </h3>
                                            <div className="flex items-center gap-6 mt-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
                                                        <User className="w-3 h-3 text-slate-500" />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-600">
                                                        <span className="text-slate-400">Buyer:</span> @{dispute.transaction?.buyer?.safetag}
                                                    </span>
                                                </div>
                                                <ArrowRight className="w-3 h-3 text-slate-300" />
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
                                                        <User className="w-3 h-3 text-slate-500" />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-600">
                                                        <span className="text-slate-400">Seller:</span> @{dispute.transaction?.seller?.safetag}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="text-2xl font-black text-slate-900">{dispute.transaction?.total_amount} {dispute.transaction?.currency}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Escrow Value</p>
                                        </div>

                                        <div className="hidden md:flex shrink-0 w-12 h-12 rounded-full items-center justify-center text-slate-300 group-hover:text-slate-900 group-hover:bg-white transition-all">
                                            <ChevronRight className="w-6 h-6" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
