"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
    Users,
    Shield,
    Trash2,
    X,
    AlertTriangle,
    Edit,
    MoreHorizontal,
    ShieldCheck,
    CheckCircle2,
    Activity,
    Clock,
    Check
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

const ADMIN_SPECIALTIES = [
    { value: 'fraud', label: 'Account & Identity Fraud' },
    { value: 'security', label: 'Security & Scam Detection' },
    { value: 'service_issue', label: 'Service & Freelance' },
    { value: 'digital_goods', label: 'Digital Goods' },
    { value: 'non_delivery', label: 'Non-Delivery' },
    { value: 'product', label: 'Product Quality' },
    { value: 'ecommerce', label: 'E-Commerce' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'logistics', label: 'Logistics' },
    { value: 'general', label: 'General' },
];

export default function AdminManagement() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'team' | 'workload'>('team');
    const [workload, setWorkload] = useState<any[]>([]);
    const [workloadLoading, setWorkloadLoading] = useState(false);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editAdmin, setEditAdmin] = useState<any | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

    // Forms
    const [formData, setFormData] = useState({
        name: "", email: "", role: "DISPUTER", password: "",
        specialist_title: "", specialist_bio: "", specialties: [] as string[],
        cases_resolved: 0, years_on_platform: 0,
    });
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const router = useRouter();

    const fetchAdmins = async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/users`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            setAdmins(res.data);
        } catch (err: any) {
            console.error("❌ Failed to fetch admins:", err);
            showToast("Failed to fetch admin users", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAdmins(); }, []);

    useEffect(() => {
        if (activeTab === 'workload') fetchWorkload();
    }, [activeTab]);

    const fetchWorkload = async () => {
        setWorkloadLoading(true);
        try {
            const res = await axios.get(`${API_URL}/admin/management/workload`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            setWorkload(res.data || []);
        } catch {
            showToast('Failed to load workload data', 'error');
        } finally {
            setWorkloadLoading(false);
        }
    };

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading("create");
        try {
            await axios.post(`${API_URL}/admin/users`, formData, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            showToast("Admin created successfully");
            setIsCreateModalOpen(false);
            setFormData({ name: "", email: "", role: "DISPUTER", password: "", specialist_title: "", specialist_bio: "", specialties: [], cases_resolved: 0, years_on_platform: 0 });
            await fetchAdmins();
        } catch (err: any) {
            showToast(err.response?.data?.error || "Failed to create admin", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleEditAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editAdmin) return;
        setActionLoading("edit");
        try {
            const payload: any = {
                role: editAdmin.role,
                status: editAdmin.status,
                specialist_title: editAdmin.specialist_title,
                specialist_bio: editAdmin.specialist_bio,
                specialties: editAdmin.specialties,
                cases_resolved: editAdmin.cases_resolved,
                years_on_platform: editAdmin.years_on_platform,
            };
            if (editAdmin.newPassword) payload.password = editAdmin.newPassword;

            await axios.put(`${API_URL}/admin/users/${editAdmin.id}`, payload, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            showToast("Admin updated successfully");
            setEditAdmin(null);
            await fetchAdmins();
        } catch (err: any) {
            showToast(err.response?.data?.error || "Failed to update admin", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setActionLoading(confirmDelete.id);
        try {
            await axios.delete(`${API_URL}/admin/users/${confirmDelete.id}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            showToast(`${confirmDelete.name} removed securely`);
            setConfirmDelete(null);
            await fetchAdmins();
        } catch (err: any) {
            showToast(err.response?.data?.error || "Failed to delete admin", "error");
        } finally {
            setActionLoading(null);
            setConfirmDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="flex bg-[#f8fafc] min-h-screen">
                <AdminSidebar />
                <div className="flex-1 p-8 flex items-center justify-center">
                    <div className="w-16 h-16 border-8 border-slate-100 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-sans">
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

            {/* Create Admin Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-black text-[#020617] tracking-tight">Onboard Admin</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAdmin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                                <input 
                                    required 
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                    placeholder="Sarah Connor"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                                <input 
                                    required 
                                    type="email"
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                    placeholder="sarah@safepadi.com"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Temporary Password</label>
                                <input 
                                    required 
                                    type="password"
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-300"
                                    placeholder="Enter secure initial password..."
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Role Assignment</label>
                                <select
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all appearance-none"
                                    value={formData.role}
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                >
                                    <option value="DISPUTER">Disputer Only (Restricted)</option>
                                    <option value="SUPPORT">Customer Support</option>
                                    <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
                                </select>
                            </div>

                            <div className="pt-2 border-t border-slate-50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Specialist Profile</p>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Specialist Title</label>
                                        <input
                                            className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                            placeholder="e.g. Senior Dispute Specialist"
                                            value={formData.specialist_title}
                                            onChange={e => setFormData({...formData, specialist_title: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Bio / Quote</label>
                                        <textarea
                                            rows={2}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all resize-none"
                                            placeholder="Short bio shown to users during escalation..."
                                            value={formData.specialist_bio}
                                            onChange={e => setFormData({...formData, specialist_bio: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Specialties</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {ADMIN_SPECIALTIES.map(spec => {
                                                const active = formData.specialties.includes(spec.value);
                                                return (
                                                    <button
                                                        key={spec.value}
                                                        type="button"
                                                        onClick={() => setFormData({...formData, specialties: active
                                                            ? formData.specialties.filter(s => s !== spec.value)
                                                            : [...formData.specialties, spec.value]
                                                        })}
                                                        className={cn(
                                                            "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider text-left transition-colors flex items-center gap-1.5",
                                                            active ? "bg-indigo-500 text-white" : "bg-slate-50 text-slate-500 border border-slate-100 hover:border-indigo-200"
                                                        )}
                                                    >
                                                        {active && <Check className="w-3 h-3 shrink-0" />}
                                                        {spec.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Cases Resolved</label>
                                            <input type="number" min={0}
                                                className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                                value={formData.cases_resolved}
                                                onChange={e => setFormData({...formData, cases_resolved: Number(e.target.value)})}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Years on Platform</label>
                                            <input type="number" min={0}
                                                className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                                value={formData.years_on_platform}
                                                onChange={e => setFormData({...formData, years_on_platform: Number(e.target.value)})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={actionLoading === "create"}
                                className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20"
                            >
                                {actionLoading === "create" ? "Inviting..." : "Create Account"}
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Admin Modal */}
            {editAdmin && (
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-[#020617] tracking-tight">Edit {editAdmin.name}</h3>
                            <button onClick={() => setEditAdmin(null)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditAdmin} className="space-y-6 overflow-y-auto max-h-[70vh]">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Change Role</label>
                                <select
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all appearance-none"
                                    value={editAdmin.role}
                                    onChange={e => setEditAdmin({...editAdmin, role: e.target.value})}
                                >
                                    <option value="DISPUTER">Disputer Only (Restricted)</option>
                                    <option value="SUPPORT">Customer Support</option>
                                    <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Account Status</label>
                                <select
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all appearance-none"
                                    value={editAdmin.status}
                                    onChange={e => setEditAdmin({...editAdmin, status: e.target.value})}
                                >
                                    <option value="ACTIVE">Active Account</option>
                                    <option value="INACTIVE">Inactive (No Login)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Reset Password (Optional)</label>
                                <input
                                    type="password"
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-300"
                                    placeholder="Leave blank to keep unchanged..."
                                    value={editAdmin.newPassword || ""}
                                    onChange={e => setEditAdmin({...editAdmin, newPassword: e.target.value})}
                                />
                            </div>

                            <div className="pt-2 border-t border-slate-50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Specialist Profile</p>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Specialist Title</label>
                                        <input
                                            className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                            placeholder="e.g. Senior Dispute Specialist"
                                            value={editAdmin.specialist_title || ""}
                                            onChange={e => setEditAdmin({...editAdmin, specialist_title: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Bio / Quote</label>
                                        <textarea
                                            rows={2}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all resize-none"
                                            placeholder="Short bio shown to users during escalation..."
                                            value={editAdmin.specialist_bio || ""}
                                            onChange={e => setEditAdmin({...editAdmin, specialist_bio: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Specialties</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {ADMIN_SPECIALTIES.map(spec => {
                                                const active = (editAdmin.specialties || []).includes(spec.value);
                                                return (
                                                    <button
                                                        key={spec.value}
                                                        type="button"
                                                        onClick={() => setEditAdmin({...editAdmin, specialties: active
                                                            ? (editAdmin.specialties || []).filter((s: string) => s !== spec.value)
                                                            : [...(editAdmin.specialties || []), spec.value]
                                                        })}
                                                        className={cn(
                                                            "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider text-left transition-colors flex items-center gap-1.5",
                                                            active ? "bg-indigo-500 text-white" : "bg-slate-50 text-slate-500 border border-slate-100 hover:border-indigo-200"
                                                        )}
                                                    >
                                                        {active && <Check className="w-3 h-3 shrink-0" />}
                                                        {spec.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Cases Resolved</label>
                                            <input type="number" min={0}
                                                className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                                value={editAdmin.cases_resolved || 0}
                                                onChange={e => setEditAdmin({...editAdmin, cases_resolved: Number(e.target.value)})}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Years on Platform</label>
                                            <input type="number" min={0}
                                                className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                                                value={editAdmin.years_on_platform || 0}
                                                onChange={e => setEditAdmin({...editAdmin, years_on_platform: Number(e.target.value)})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={actionLoading === "edit"}
                                className="w-full h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20"
                            >
                                {actionLoading === "edit" ? "Saving..." : "Save Changes"}
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
                        <h3 className="text-xl font-black text-[#020617] text-center tracking-tight mb-2">Delete Admin?</h3>
                        <p className="text-sm font-bold text-slate-400 text-center mb-8">
                            This will permanently remove <span className="text-slate-700">{confirmDelete.name}</span>'s access. This action cannot be undone.
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
                                {actionLoading === confirmDelete.id ? "Deleting..." : "Yes, Terminate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-2">Admin Management</h1>
                            <p className="text-xs font-bold text-slate-400">Control role-based access for the organizational team</p>
                        </div>
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="h-12 px-6 rounded-2xl bg-[#020617] text-white font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#020617]/90 transition-all shadow-xl shadow-[#020617]/10"
                        >
                            <Users className="w-4 h-4 mb-0.5" />
                            Invigorate New
                        </Button>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex gap-2 mb-8 bg-white rounded-2xl p-1 border border-slate-100 shadow-sm w-fit">
                        <button
                            onClick={() => setActiveTab('team')}
                            className={cn(
                                "px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                activeTab === 'team' ? "bg-[#020617] text-white shadow-sm" : "text-slate-400 hover:text-slate-700"
                            )}
                        >
                            <Users className="w-3.5 h-3.5" /> Team Members
                        </button>
                        <button
                            onClick={() => setActiveTab('workload')}
                            className={cn(
                                "px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                activeTab === 'workload' ? "bg-[#020617] text-white shadow-sm" : "text-slate-400 hover:text-slate-700"
                            )}
                        >
                            <Activity className="w-3.5 h-3.5" /> Workload
                        </button>
                    </div>

                    {activeTab === 'workload' ? (
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden ring-1 ring-slate-100">
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                <h3 className="text-xl font-black text-[#020617] tracking-tight">Live Caseload</h3>
                                <button
                                    onClick={fetchWorkload}
                                    className="text-[10px] font-black text-slate-400 hover:text-emerald-600 uppercase tracking-widest flex items-center gap-2 transition-colors"
                                >
                                    <Activity className="w-3 h-3" /> Refresh
                                </button>
                            </div>
                            {workloadLoading ? (
                                <div className="p-16 flex justify-center">
                                    <div className="w-10 h-10 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
                                </div>
                            ) : workload.length === 0 ? (
                                <div className="p-16 text-center text-slate-400 text-sm font-bold">No workload data available</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[700px]">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Specialist</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Specialties</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Open Cases</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resolved Today</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Load</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {workload.map((w: any) => {
                                                const load = w.open_cases || 0;
                                                const loadColor = load >= 10 ? "bg-rose-400" : load >= 5 ? "bg-amber-400" : "bg-emerald-400";
                                                return (
                                                    <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden">
                                                                    <img
                                                                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${w.name}&backgroundColor=0f172a,10b981`}
                                                                        alt={w.name}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-[#020617]">{w.name}</p>
                                                                    {w.specialist_title && <p className="text-[10px] font-bold text-slate-400">{w.specialist_title}</p>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-wrap gap-1">
                                                                {(w.specialties || []).slice(0, 3).map((s: string) => (
                                                                    <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black uppercase">
                                                                        {s.replace(/_/g, ' ')}
                                                                    </span>
                                                                ))}
                                                                {(w.specialties || []).length > 3 && (
                                                                    <span className="text-[9px] font-bold text-slate-400">+{w.specialties.length - 3}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <span className="text-2xl font-black text-slate-900">{load}</span>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <span className="text-lg font-black text-emerald-600">{w.resolved_today || 0}</span>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn("h-full rounded-full transition-all", loadColor)}
                                                                    style={{ width: `${Math.min(100, (load / 15) * 100)}%` }}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                    <div>{/* Team Members View */}</div>
                    )}

                    {activeTab === 'team' && (
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden ring-1 ring-slate-100">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xl font-black text-[#020617] tracking-tight">Active Team Members</h3>
                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 rounded-xl px-3 py-1">{admins.length} Staff</span>
                        </div>

                        <div className="overflow-x-auto scrollbar-hide">
                            <table className="w-full text-left min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Profile</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Assigned Role</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {admins.map((admin) => {
                                        const isSuper = admin.role === "SUPER_ADMIN";
                                        const isInactive = admin.status === "INACTIVE";
                                        const isActing = actionLoading === admin.id;
                                        
                                        return (
                                            <tr key={admin.id} className="hover:bg-slate-50/70 transition-all duration-300 group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 relative bg-slate-100">
                                                            <img 
                                                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${admin.name}&backgroundColor=0f172a,10b981`} 
                                                                alt={admin.name} 
                                                                className="w-full h-full object-cover" 
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-[#020617]">{admin.name}</span>
                                                            <span className="text-[11px] font-bold text-slate-400">{admin.specialist_title || admin.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        {isSuper ? (
                                                            <Badge className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100 shadow-none">
                                                                Super Admin
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 shadow-none">
                                                                {admin.role}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", isInactive ? "bg-rose-400" : "bg-emerald-400")} />
                                                        <span className="text-xs font-bold text-slate-600">
                                                            {isInactive ? "Inactive / Blocked" : "Active Access"}
                                                        </span>
                                                    </div>
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
                                                                onClick={() => setEditAdmin(admin)}
                                                                className="rounded-xl px-4 py-2.5 text-xs font-bold text-indigo-600 focus:bg-indigo-50 cursor-pointer flex items-center gap-2.5"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                Modify Privileges
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="my-1 bg-slate-50" />
                                                            <DropdownMenuItem
                                                                onClick={() => setConfirmDelete(admin)}
                                                                className="rounded-xl px-4 py-2.5 text-xs font-bold text-rose-600 focus:bg-rose-50 cursor-pointer flex items-center gap-2.5"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Revoke Access
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
                    </div>
                    )}
                </div>
            </main>
        </div>
    );
}
