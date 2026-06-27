"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Users, Filter, Search, Megaphone, Download, RefreshCw } from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };

const PLATFORMS = ['', 'telegram', 'discord', 'whatsapp', 'instagram', 'apple_business', 'messenger'];
const KYC_STATUSES = ['', 'APPROVED', 'PENDING', 'REJECTED', 'NOT_SUBMITTED'];

const KYC_COLORS: Record<string, string> = {
    APPROVED: 'bg-emerald-50 text-emerald-600',
    PENDING: 'bg-amber-50 text-amber-600',
    REJECTED: 'bg-rose-50 text-rose-600',
    NOT_SUBMITTED: 'bg-slate-50 text-slate-400',
};

export default function UserSegmentationPage() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [count, setCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [platform, setPlatform] = useState('');
    const [kycStatus, setKycStatus] = useState('');
    const [page, setPage] = useState(1);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const [usersRes, countRes] = await Promise.all([
                axios.get(`${API_URL}/admin/segments/users`, { headers: H, params: { platform: platform || undefined, kyc_status: kycStatus || undefined, page } }),
                axios.get(`${API_URL}/admin/segments/counts`, { headers: H, params: { platform: platform || undefined, kyc_status: kycStatus || undefined } }),
            ]);
            setUsers(usersRes.data);
            setCount(countRes.data.count);
        } catch {} finally {
            setLoading(false);
        }
    }, [platform, kycStatus, page]);

    useEffect(() => { fetchUsers(); }, [platform, kycStatus]);
    useEffect(() => { fetchUsers(); }, [page]);

    const broadcastToSegment = () => {
        const params = new URLSearchParams();
        if (platform) params.set('platform', platform);
        if (kycStatus) params.set('kyc_status', kycStatus);
        router.push(`/admin/marketing?${params.toString()}`);
    };

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-sans">
            <AdminSidebar />
            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">

                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-1">User Segments</h1>
                            <p className="text-xs font-bold text-slate-400">Filter and target users by platform, KYC status, and activity</p>
                        </div>
                        <button onClick={fetchUsers}
                            className="h-12 px-6 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>

                    {/* Filter Panel */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 mb-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Segment Filters</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Platform</label>
                                <div className="flex flex-wrap gap-2">
                                    {PLATFORMS.map(p => (
                                        <button key={p} onClick={() => { setPlatform(p); setPage(1); }}
                                            className={cn("px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider border transition-all capitalize",
                                                platform === p
                                                    ? "bg-slate-900 text-white border-slate-900"
                                                    : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
                                            )}>{p || 'All'}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">KYC Status</label>
                                <div className="flex flex-wrap gap-2">
                                    {KYC_STATUSES.map(k => (
                                        <button key={k} onClick={() => { setKycStatus(k); setPage(1); }}
                                            className={cn("px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider border transition-all",
                                                kycStatus === k
                                                    ? "bg-slate-900 text-white border-slate-900"
                                                    : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
                                            )}>{k || 'All'}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-xl font-black text-slate-900">
                                    {count !== null ? count.toLocaleString() : '—'} users
                                </p>
                                <p className="text-[10px] font-bold text-slate-400">matching segment</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={broadcastToSegment}
                                className="h-10 px-4 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 flex items-center gap-2"
                            >
                                <Megaphone className="w-3.5 h-3.5" /> Broadcast to Segment
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[700px]">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        {['Safetag', 'Email', 'Platform', 'KYC', 'Joined'].map(h => (
                                            <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan={5} className="py-12 text-center">
                                            <div className="w-8 h-8 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                                        </td></tr>
                                    ) : users.length === 0 ? (
                                        <tr><td colSpan={5} className="py-16 text-center">
                                            <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                            <p className="text-slate-400 text-sm font-bold">No users match this segment</p>
                                        </td></tr>
                                    ) : users.map((u: any) => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => router.push(`/admin/customers/${u.id}`)}>
                                            <td className="px-8 py-4 text-sm font-black text-slate-900">{u.safetag}</td>
                                            <td className="px-8 py-4 text-sm text-slate-500">{u.email}</td>
                                            <td className="px-8 py-4">
                                                <span className="px-2 py-1 bg-slate-50 text-slate-600 text-[9px] font-black rounded-xl capitalize">
                                                    {u.primary_platform?.replace('_', ' ') || '—'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className={cn("px-2 py-1 rounded-xl text-[9px] font-black", KYC_COLORS[u.kyc_status] || 'bg-slate-50 text-slate-400')}>
                                                    {u.kyc_status || '—'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {users.length > 0 && (
                            <div className="px-8 py-4 border-t border-slate-50 flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-400">Page {page}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                        className="h-9 px-4 rounded-xl border border-slate-200 font-black text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50">Prev</button>
                                    <button onClick={() => setPage(p => p + 1)} disabled={users.length < 50}
                                        className="h-9 px-4 rounded-xl border border-slate-200 font-black text-xs text-slate-600 disabled:opacity-40 hover:bg-slate-50">Next</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
