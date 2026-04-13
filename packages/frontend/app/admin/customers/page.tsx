"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
    Users, 
    TrendingUp, 
    TrendingDown,
    Search, 
    Filter, 
    MoreHorizontal,
    MessageCircle,
    Activity,
    ChevronDown,
    Calendar,
    Star,
    ArrowLeft,
    ArrowRight,
    Eye,
    ShieldOff,
    ShieldCheck,
    Trash2,
    X,
    AlertTriangle,
} from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuSeparator,
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const PLATFORM_ICONS: Record<string, { svg: React.ReactNode; color: string; bg: string }> = {
    telegram: {
        svg: (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#229ED9">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 13.898l-2.95-.924c-.642-.204-.655-.643.136-.953l11.512-4.44c.534-.194 1.001.131.716.64z"/>
            </svg>
        ),
        color: "text-[#229ED9]",
        bg: "bg-[#229ED9]/10",
    },
    discord: {
        svg: (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#5865F2">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
        ),
        color: "text-[#5865F2]",
        bg: "bg-[#5865F2]/10",
    },
    whatsapp: {
        svg: (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
            </svg>
        ),
        color: "text-[#25D366]",
        bg: "bg-[#25D366]/10",
    },
    instagram: {
        svg: (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="url(#igGrad)">
                <defs>
                    <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f09433"/>
                        <stop offset="25%" stopColor="#e6683c"/>
                        <stop offset="50%" stopColor="#dc2743"/>
                        <stop offset="75%" stopColor="#cc2366"/>
                        <stop offset="100%" stopColor="#bc1888"/>
                    </linearGradient>
                </defs>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
            </svg>
        ),
        color: "text-[#E1306C]",
        bg: "bg-gradient-to-br from-[#f09433]/10 to-[#bc1888]/10",
    },
};

export default function AdminCustomers() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        safetag: "",
        email: "",
        first_name: "",
        last_name: "",
        primary_platform: "telegram",
        platform_id: ""
    });
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const router = useRouter(); // Initialize useRouter

    const fetchData = async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/customers`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            setData(res.data);
        } catch (err: any) {
            console.error("❌ Failed to fetch customers:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading("create");
        try {
            await axios.post(`${API_URL}/admin/customers`, newCustomer, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            showToast("Customer created successfully");
            setIsCreateModalOpen(false);
            setNewCustomer({
                safetag: "",
                email: "",
                first_name: "",
                last_name: "",
                primary_platform: "telegram",
                platform_id: ""
            });
            await fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || "Failed to create customer", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleBlock = async (customer: any) => {
        setActionLoading(customer.id);
        try {
            const res = await axios.post(`${API_URL}/admin/customers/${customer.id}/block`, {}, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            showToast(res.data.message || `${customer.safetag.startsWith('@') ? customer.safetag : `@${customer.safetag}`} has been blocked`);
            await fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || "Failed to block user", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnblock = async (customer: any) => {
        setActionLoading(customer.id);
        try {
            const res = await axios.post(`${API_URL}/admin/customers/${customer.id}/unblock`, {}, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            showToast(res.data.message || `${customer.safetag.startsWith('@') ? customer.safetag : `@${customer.safetag}`} has been unblocked`);
            await fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || "Failed to unblock user", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setActionLoading(confirmDelete.id);
        try {
            await axios.delete(`${API_URL}/admin/customers/${confirmDelete.id}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            showToast(`Account ${confirmDelete.safetag.startsWith('@') ? confirmDelete.safetag : `@${confirmDelete.safetag}`} deleted`);
            setConfirmDelete(null);
            await fetchData();
        } catch (err: any) {
            showToast(err.response?.data?.error || "Failed to delete user", "error");
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex bg-slate-50 min-h-screen">
                <AdminSidebar />
                <div className="flex-1 p-8 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 border-8 border-slate-100 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                        <p className="font-black text-slate-400 uppercase tracking-[0.3em] text-[10px]">Syncing Customer Data</p>
                    </div>
                </div>
            </div>
        );
    }

    const customers = data?.customers || [];
    const stats = data?.stats || {};

    const filteredCustomers = customers.filter((c: any) => 
        c.safetag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.first_name + " " + c.last_name).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <AdminSidebar />
            
            {/* Toast notification */}
            {toast && (
                <div className={cn(
                    "fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold animate-in slide-in-from-top duration-300",
                    toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                )}>
                    <span>{toast.type === "success" ? "✅" : "❌"}</span>
                    {toast.msg}
                </div>
            )}

            {/* Create Customer Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-black text-[#020617] tracking-tight">Create Customer</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateCustomer} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Safetag</label>
                                <input 
                                    required 
                                    className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                    placeholder="@john_doe"
                                    value={newCustomer.safetag}
                                    onChange={e => setNewCustomer({...newCustomer, safetag: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">First Name</label>
                                    <input 
                                        className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                        placeholder="John"
                                        value={newCustomer.first_name}
                                        onChange={e => setNewCustomer({...newCustomer, first_name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Last Name</label>
                                    <input 
                                        className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                        placeholder="Doe"
                                        value={newCustomer.last_name}
                                        onChange={e => setNewCustomer({...newCustomer, last_name: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                                <input 
                                    required 
                                    type="email"
                                    className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                    placeholder="john@example.com"
                                    value={newCustomer.email}
                                    onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary Platform</label>
                                    <select 
                                        className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all appearance-none"
                                        value={newCustomer.primary_platform}
                                        onChange={e => setNewCustomer({...newCustomer, primary_platform: e.target.value})}
                                    >
                                        <option value="telegram">Telegram</option>
                                        <option value="discord">Discord</option>
                                        <option value="whatsapp">WhatsApp</option>
                                        <option value="instagram">Instagram</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Platform ID</label>
                                    <input 
                                        required 
                                        className="w-full h-12 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                        placeholder="1234567"
                                        value={newCustomer.platform_id}
                                        onChange={e => setNewCustomer({...newCustomer, platform_id: e.target.value})}
                                    />
                                </div>
                            </div>
                            <Button 
                                type="submit" 
                                disabled={actionLoading === "create"}
                                className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20"
                            >
                                {actionLoading === "create" ? "Creating..." : "Create Customer"}
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
                        <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <AlertTriangle className="w-7 h-7 text-rose-500" />
                        </div>
                        <h3 className="text-xl font-black text-[#020617] text-center tracking-tight mb-2">Delete Account?</h3>
                        <p className="text-sm font-bold text-slate-400 text-center mb-8">
                            This will permanently delete <span className="text-slate-700">@{confirmDelete.safetag}</span>'s account. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 h-12 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={actionLoading === confirmDelete.id}
                                className="flex-1 h-12 rounded-2xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 transition-all disabled:opacity-60"
                            >
                                {actionLoading === confirmDelete.id ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-2">Customer Dashboard</h1>
                            <p className="text-xs font-bold text-slate-400">Manage and analyze your customer relationships</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <Button 
                                onClick={() => setIsCreateModalOpen(true)}
                                className="h-12 px-6 rounded-2xl bg-[#020617] text-white font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#020617]/90 transition-all"
                            >
                                <Users className="w-4 h-4 mb-0.5" />
                                Create Customer
                            </Button>
                            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[11px] font-black text-slate-900 leading-none mb-1">Admin</p>
                                    <p className="text-[9px] font-bold text-slate-400 leading-none">Safeeely Platform</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-md">
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=d1d5db" alt="Admin" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <StatCard 
                            title="Total Customer" 
                            value={stats.total_customers?.toLocaleString()} 
                            percentage="+4.3%" 
                            subtext="Increased by +1,238 this week" 
                        />
                        <StatCard 
                            title="New Customer" 
                            value={stats.new_customers_count?.toLocaleString()} 
                            percentage="+12.5%" 
                            subtext="Increased by +467 this week" 
                        />
                        <StatCard 
                            title="Avg Order Value" 
                            value={`$${stats.avg_transaction_value?.toLocaleString()}`} 
                            percentage="+0.3%" 
                            subtext="Decreased by -$2.2 this week" 
                            isDown={false}
                        />
                        <StatCard 
                            title="Customer Satisfaction" 
                            value={`${stats.customer_satisfaction}/5`} 
                            percentage="+2.3%" 
                            subtext="Increased by +2.3% this week" 
                        />
                    </div>

                    {/* Main List */}
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden ring-1 ring-slate-100">
                        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <h3 className="text-xl font-black text-[#020617] tracking-tight">Customer List</h3>
                                <span className="text-[10px] font-black text-slate-400 bg-slate-50 rounded-xl px-3 py-1">{filteredCustomers.length} results</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:flex-none">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search customers..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-11 pl-11 pr-4 bg-slate-50 border-none rounded-2xl text-[11px] font-bold w-full md:w-[240px] outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto scrollbar-hide">
                            <table className="w-full text-left min-w-[1000px]">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Social Medias</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Orders</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Spent</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredCustomers.map((c: any, i: number) => {
                                        const isBlocked = c.status === "Blocked";
                                        const isActing = actionLoading === c.id;
                                        return (
                                            <tr key={c.id || i} className={cn("hover:bg-slate-50/70 transition-all duration-300 group", isBlocked && "bg-rose-50/30")}>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 relative">
                                                            <img 
                                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.safetag}&backgroundColor=f1f5f9`} 
                                                                alt={c.safetag} 
                                                                className="w-full h-full object-cover" 
                                                            />
                                                            {isBlocked && <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center"><ShieldOff className="w-4 h-4 text-rose-600" /></div>}
                                                        </div>
                                                        <span className="text-xs font-black text-[#020617]">{c.first_name || "User"} {c.last_name || ""}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-900">{c.email}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">@{c.safetag}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        {c.linked_platforms?.map((lp: any, index: number) => {
                                                            const iconCfg = PLATFORM_ICONS[lp.platform?.toLowerCase()] || null;
                                                            return (
                                                                <div key={`${lp.platform}-${index}`} title={lp.platform} className={cn("w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border border-slate-50", iconCfg?.bg || "bg-slate-100")}>
                                                                    {iconCfg ? iconCfg.svg : <span className="text-[9px] font-bold text-slate-400 uppercase">{lp.platform?.[0]}</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-xs font-black text-[#020617]">{c.total_orders}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-xs font-black text-emerald-600">${c.total_spent?.toLocaleString()}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <Badge className={cn(
                                                        "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-none border",
                                                        isBlocked
                                                            ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-50"
                                                            : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                                                    )}>
                                                        {c.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button disabled={isActing} className="w-9 h-9 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all ml-auto disabled:opacity-40">
                                                                {isActing
                                                                    ? <div className="w-4 h-4 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
                                                                    : <MoreHorizontal className="w-5 h-5" />
                                                                }
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-2xl p-2 w-48">
                                                            <DropdownMenuItem
                                                                onClick={() => router.push(`/admin/customers/${c.id}`)}
                                                                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 focus:bg-slate-50 cursor-pointer flex items-center gap-2.5"
                                                            >
                                                                <Eye className="w-4 h-4 text-slate-400" />
                                                                View Full Profile
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="my-1 bg-slate-50" />
                                                            {isBlocked ? (
                                                                <DropdownMenuItem
                                                                    onClick={() => handleUnblock(c)}
                                                                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-emerald-600 focus:bg-emerald-50 cursor-pointer flex items-center gap-2.5"
                                                                >
                                                                    <ShieldCheck className="w-4 h-4" />
                                                                    Unblock User
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem
                                                                    onClick={() => handleBlock(c)}
                                                                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-amber-600 focus:bg-amber-50 cursor-pointer flex items-center gap-2.5"
                                                                >
                                                                    <ShieldOff className="w-4 h-4" />
                                                                    Block User
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator className="my-1 bg-slate-50" />
                                                            <DropdownMenuItem
                                                                onClick={() => setConfirmDelete(c)}
                                                                className="rounded-xl px-4 py-2.5 text-xs font-bold text-rose-600 focus:bg-rose-50 cursor-pointer flex items-center gap-2.5"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete Account
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer / Pagination */}
                        <div className="p-8 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-50">
                            <p className="text-[11px] font-bold text-slate-400">
                                Showing <span className="text-slate-900">{filteredCustomers.length}</span> of <span className="text-slate-900">{customers.length}</span> Entries
                            </p>
                            <div className="flex items-center gap-2">
                                <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 disabled:opacity-30">
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <button className="h-10 px-4 flex items-center justify-center rounded-xl bg-[#020617] text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slate-200">
                                    1
                                </button>
                                <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400">
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ title, value, percentage, subtext, isDown = false }: any) {
    return (
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 cursor-pointer ring-1 ring-slate-50">
            <div className="absolute top-8 right-8 text-slate-300">
                <MoreHorizontal className="w-5 h-5" />
            </div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">{title}</p>
            <div className="flex items-end gap-3 mb-4">
                <h4 className="text-3xl font-black text-[#020617] tracking-tighter leading-none">{value}</h4>
                <div className={cn(
                    "flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-black mb-1",
                    isDown ? "text-rose-500 bg-rose-50" : "text-emerald-500 bg-emerald-50"
                )}>
                    {isDown ? <TrendingDown className="w-3" /> : <TrendingUp className="w-3" />}
                    {percentage}
                </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 opacity-80">{subtext}</p>
        </div>
    );
}
