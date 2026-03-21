"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import axios from "axios";
import { 
    Users, 
    ShieldCheck, 
    ShieldAlert, 
    Clock, 
    Search, 
    Filter, 
    ChevronRight,
    MoreHorizontal,
    Eye,
    CheckCircle2,
    XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

import AdminSidebar from "@/components/admin/Sidebar";

const API_URL = "/api";

export default function AdminKYCList() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        const fetchKyc = async () => {
            try {
                const token = localStorage.getItem("safepadi_admin_token");
                const res = await axios.get(`${API_URL}/admin/kyc`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(res.data);
            } catch (err) {
                console.error("Fetch KYC failed:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchKyc();
    }, []);

    const filteredSubmissions = data?.submissions?.filter((s: any) => {
        const matchesSearch = 
            s.profile?.safetag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex bg-slate-50 min-h-screen">
                <AdminSidebar />
                <div className="flex-1 p-8 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Verification Hub</p>
                    </div>
                </div>
            </div>
        );
    }

    const stats = data?.stats || {};

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <AdminSidebar />

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter uppercase">KYC Verification</h1>
                            <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Identity & Compliance Hub</p>
                        </div>
                        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                             <div className="text-right hidden sm:block">
                                <p className="text-[11px] font-black text-slate-900 leading-none mb-1">Admin</p>
                                <p className="text-[9px] font-bold text-slate-400 leading-none">Safeeely Platform</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=f1f5f9" alt="Admin" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Total Submissions" 
                            value={stats.total} 
                            icon={Users} 
                            color="text-blue-500" 
                            bg="bg-blue-50" 
                        />
                        <StatCard 
                            title="Pending Review" 
                            value={stats.pending} 
                            icon={Clock} 
                            color="text-amber-500" 
                            bg="bg-amber-50" 
                            isPulse={stats.pending > 0}
                        />
                        <StatCard 
                            title="Verified Users" 
                            value={stats.verified_users} 
                            icon={ShieldCheck} 
                            color="text-emerald-500" 
                            bg="bg-emerald-50" 
                        />
                        <StatCard 
                            title="Unverified Users" 
                            value={stats.unverified_users} 
                            icon={ShieldAlert} 
                            color="text-rose-500" 
                            bg="bg-rose-50" 
                        />
                    </div>

                    {/* Table Container */}
                    <div className="bg-white border border-slate-100 rounded-[40px] overflow-hidden shadow-sm ring-1 ring-slate-100">
                        
                        {/* Filters Header */}
                        <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row gap-6 justify-between items-center bg-white">
                            <div className="relative w-full sm:w-80 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <Input 
                                    placeholder="Search by name or Safetag..." 
                                    className="bg-slate-50 border-none pl-11 h-12 rounded-2xl text-[11px] font-bold text-[#020617] placeholder:text-slate-300 focus-visible:ring-emerald-500/20"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                {["all", "PENDING", "APPROVED", "REJECTED"].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={cn(
                                            "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                            statusFilter === s 
                                                ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20' 
                                                : 'text-slate-400 hover:text-slate-600'
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submissions Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">User / Safetag</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Document Info</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Submission Date</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredSubmissions?.map((sub: any) => (
                                        <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200">
                                                        <img 
                                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.profile?.safetag}&backgroundColor=f1f5f9`} 
                                                            className="w-full h-full object-cover rounded-xl"
                                                            alt=""
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-[#020617] group-hover:text-emerald-600 transition-colors">
                                                            {sub.first_name} {sub.last_name}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                            {sub.profile?.safetag}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-[11px] font-black text-[#020617]">
                                                    {sub.document_country} - {sub.nin ? 'National ID (NIN)' : 'International Passport'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                                    {sub.city}, {sub.state}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-[11px] font-black text-[#020617]">
                                                    {new Date(sub.created_at).toLocaleDateString()}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400">
                                                    {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <StatusBadge status={sub.status} />
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <Link href={`/admin/kyc/${sub.id}`}>
                                                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-emerald-50 text-emerald-600 border border-transparent hover:border-emerald-100">
                                                        <Eye className="w-5 h-5" />
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {(filteredSubmissions?.length === 0 || !filteredSubmissions) && (
                                <div className="py-24 text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-sm">
                                        <ShieldAlert className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h3 className="text-[#020617] font-black uppercase tracking-widest text-xs mb-2">No verification requests</h3>
                                    <p className="text-slate-400 text-[10px] font-bold">Try adjusting your filters or wait for new submissions.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, bg, isPulse }: any) {
    return (
        <div className={cn(
            "bg-white border border-slate-100 p-8 rounded-[40px] relative overflow-hidden group hover:border-emerald-500/50 transition-all shadow-sm ring-1 ring-slate-50",
            isPulse && "ring-emerald-500/20 shadow-emerald-500/5"
        )}>
            <div className="flex justify-between items-start relative z-10">
                <div className="space-y-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
                    <h3 className="text-4xl font-black text-[#020617] tracking-tighter">{value}</h3>
                </div>
                <div className={cn("p-4 rounded-2xl group-hover:scale-110 transition-transform shadow-sm", bg, color)}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            {isPulse && (
                <div className="absolute top-0 right-0 p-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "PENDING":
            return (
                <Badge className="bg-amber-50 text-amber-600 border-amber-100 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-none">
                    <Clock className="w-3 h-3 mr-1.5" /> Pending
                </Badge>
            );
        case "APPROVED":
            return (
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-none">
                    <CheckCircle2 className="w-3 h-3 mr-1.5" /> Approved
                </Badge>
            );
        case "REJECTED":
            return (
                <Badge className="bg-rose-50 text-rose-600 border-rose-100 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-none">
                    <XCircle className="w-3 h-3 mr-1.5" /> Rejected
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}
