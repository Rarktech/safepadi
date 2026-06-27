"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
    BookOpen,
    Plus,
    Edit,
    Check,
    X,
    Lock,
    Archive,
    BarChart2,
    ChevronDown,
    ChevronUp,
    AlertTriangle
} from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const SEVERITY_STYLES: Record<string, { badge: string; row: string }> = {
    ADVISORY:  { badge: "bg-blue-50 text-blue-700 border-blue-100",   row: "border-l-blue-300" },
    BINDING:   { badge: "bg-amber-50 text-amber-700 border-amber-100", row: "border-l-amber-300" },
    HARD_GATE: { badge: "bg-rose-50 text-rose-700 border-rose-100",   row: "border-l-rose-400" },
};

const DISPUTE_TYPES = [
    'INSTAGRAM_ACCOUNT','DISCORD_ACCOUNT','TELEGRAM_ACCOUNT','GMAIL_ACCOUNT','TWITTER_ACCOUNT',
    'TIKTOK_ACCOUNT','YOUTUBE_CHANNEL','FACEBOOK_ACCOUNT','GAMING_ACCOUNT','FREELANCE_CODE',
    'FREELANCE_DESIGN','FREELANCE_WRITING','FREELANCE_VIDEO','FREELANCE_MUSIC','FREELANCE_CONSULTING',
    'SOCIAL_SERVICE','INFLUENCER_DEAL','EDUCATION_SERVICE','DOMAIN_WEBSITE','CONSTRUCTION_SERVICE',
    'DIGITAL_DOWNLOAD','EVENT_BOOKING','TICKET_RESERVATION','DISPATCH_DELIVERY','ELECTRONICS_GADGET',
    'VEHICLE_SALE','LUXURY_GOODS','FASHION_GOODS','PHYSICAL_GOODS','REAL_ESTATE','CRYPTO_TO_GOODS',
];

const BLANK_SOP = {
    sop_code: '',
    title: '',
    dispute_type: '',
    rule_body: '',
    severity: 'ADVISORY',
    priority: 1,
    applies_to_agent: true,
};

export default function SopManagementPage() {
    const [sops, setSops] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingSop, setEditingSop] = useState<any | null>(null);
    const [form, setForm] = useState<any>(BLANK_SOP);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const headers = { 'ngrok-skip-browser-warning': 'true' };

    const fetchAll = async () => {
        try {
            const [sopsRes, analyticsRes] = await Promise.all([
                axios.get(`${API_URL}/admin/disputes/sops`, { headers }),
                axios.get(`${API_URL}/admin/disputes/sops/analytics`, { headers }),
            ]);
            setSops(sopsRes.data || []);
            setAnalytics(analyticsRes.data);
        } catch {}
        finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const openCreate = () => {
        setForm(BLANK_SOP);
        setEditingSop(null);
        setShowModal(true);
    };

    const openEdit = (sop: any) => {
        setForm({ ...sop });
        setEditingSop(sop);
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingSop) {
                await axios.put(`${API_URL}/admin/disputes/sops/${editingSop.id}`, form, { headers });
                showToast('SOP updated');
            } else {
                await axios.post(`${API_URL}/admin/disputes/sops`, form, { headers });
                showToast('SOP created');
            }
            setShowModal(false);
            fetchAll();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (sop: any) => {
        const newStatus = sop.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
        try {
            await axios.patch(`${API_URL}/admin/disputes/sops/${sop.id}/status`, { status: newStatus }, { headers });
            showToast(`SOP ${newStatus.toLowerCase()}`);
            fetchAll();
        } catch {
            showToast('Status update failed', 'error');
        }
    };

    const approveHuman = async (sop: any) => {
        try {
            await axios.patch(`${API_URL}/admin/disputes/sops/${sop.id}/approve`, {}, { headers });
            showToast('SOP approved for AI use');
            fetchAll();
        } catch {
            showToast('Approval failed', 'error');
        }
    };

    const filtered = sops.filter(s => {
        if (filterStatus !== 'all' && s.status !== filterStatus.toUpperCase()) return false;
        if (filterSeverity !== 'all' && s.severity !== filterSeverity.toUpperCase()) return false;
        if (search && !s.title?.toLowerCase().includes(search.toLowerCase()) && !s.sop_code?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-sans">
            <AdminSidebar />

            {toast && (
                <div className={cn(
                    "fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold animate-in slide-in-from-top duration-300",
                    toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                )}>
                    {toast.type === "success" ? "✅" : "❌"} {toast.msg}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-[#020617]">{editingSop ? 'Edit SOP' : 'Create SOP'}</h3>
                            <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">SOP Code</label>
                                    <input required className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" placeholder="SOP-001" value={form.sop_code} onChange={e => setForm({...form, sop_code: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Priority</label>
                                    <input type="number" min={1} max={100} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" value={form.priority} onChange={e => setForm({...form, priority: Number(e.target.value)})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Title</label>
                                <input required className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" placeholder="SOP title..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Severity</label>
                                    <select className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none appearance-none" value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
                                        <option value="ADVISORY">Advisory</option>
                                        <option value="BINDING">Binding</option>
                                        <option value="HARD_GATE">Hard Gate</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Dispute Type</label>
                                    <select className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none appearance-none" value={form.dispute_type || ''} onChange={e => setForm({...form, dispute_type: e.target.value || null})}>
                                        <option value="">All Types</option>
                                        {DISPUTE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Rule Body</label>
                                <textarea required rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none resize-none" placeholder="Describe the SOP rule..." value={form.rule_body} onChange={e => setForm({...form, rule_body: e.target.value})} />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.applies_to_agent} onChange={e => setForm({...form, applies_to_agent: e.target.checked})} className="w-4 h-4 accent-emerald-500 rounded" />
                                <span className="text-[11px] font-bold text-slate-600">Applies to AI Agent (auto-enforce)</span>
                            </label>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase">Cancel</Button>
                                <Button type="submit" disabled={saving} className="flex-1 h-12 rounded-2xl bg-[#020617] hover:bg-slate-800 text-white font-black text-[10px] uppercase shadow-lg">
                                    {saving ? 'Saving...' : (editingSop ? 'Save Changes' : 'Create SOP')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-[#020617] tracking-tighter mb-2">SOP Manager</h1>
                            <p className="text-xs font-bold text-slate-400">Manage dispute Standard Operating Procedures for AI + admin guidance</p>
                        </div>
                        <Button onClick={openCreate} className="h-12 px-6 rounded-2xl bg-[#020617] text-white font-black uppercase tracking-widest flex items-center gap-2 shadow-xl">
                            <Plus className="w-4 h-4" /> New SOP
                        </Button>
                    </div>

                    {/* Analytics row */}
                    {analytics && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'Total SOPs', value: analytics.total_sops || sops.length },
                                { label: 'Active', value: analytics.active_count || sops.filter(s => s.status === 'ACTIVE').length, color: 'text-emerald-600' },
                                { label: 'Pending Approval', value: analytics.pending_approval || sops.filter(s => !s.human_approved).length, color: 'text-amber-600' },
                                { label: 'AI Override Rate', value: analytics.override_rate ? `${analytics.override_rate}%` : '—' },
                            ].map(c => (
                                <div key={c.label} className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm">
                                    <p className={cn("text-2xl font-black text-slate-900", c.color)}>{c.value}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-1">{c.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        <input
                            placeholder="Search SOPs..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="h-10 px-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                        />
                        {[
                            { label: 'All Status', value: 'all' },
                            { label: 'Active', value: 'active' },
                            { label: 'Archived', value: 'archived' },
                        ].map(opt => (
                            <button key={opt.value} onClick={() => setFilterStatus(opt.value)} className={cn(
                                "h-10 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors",
                                filterStatus === opt.value ? "bg-[#020617] text-white shadow-sm" : "bg-white text-slate-400 border border-slate-100 hover:text-slate-700"
                            )}>{opt.label}</button>
                        ))}
                        {[
                            { label: 'All Severity', value: 'all' },
                            { label: 'Advisory', value: 'advisory' },
                            { label: 'Binding', value: 'binding' },
                            { label: 'Hard Gate', value: 'hard_gate' },
                        ].map(opt => (
                            <button key={opt.value} onClick={() => setFilterSeverity(opt.value)} className={cn(
                                "h-10 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors",
                                filterSeverity === opt.value ? "bg-[#020617] text-white shadow-sm" : "bg-white text-slate-400 border border-slate-100 hover:text-slate-700"
                            )}>{opt.label}</button>
                        ))}
                    </div>

                    {/* SOP Table */}
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filtered.length} SOPs</span>
                        </div>
                        {loading ? (
                            <div className="p-16 flex justify-center">
                                <div className="w-10 h-10 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-16 text-center text-slate-400 text-sm font-bold">No SOPs found</div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {filtered.map((sop: any) => {
                                    const style = SEVERITY_STYLES[sop.severity] || SEVERITY_STYLES.ADVISORY;
                                    const isExp = expanded === sop.id;
                                    const isArchived = sop.status === 'ARCHIVED';
                                    return (
                                        <div key={sop.id} className={cn("border-l-4 transition-colors", style.row, isArchived && "opacity-50")}>
                                            <div className="px-8 py-5 flex items-center gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase border", style.badge)}>
                                                            {sop.sop_code}
                                                        </span>
                                                        {sop.severity === 'HARD_GATE' && <Lock className="w-3 h-3 text-rose-500" />}
                                                        {sop.human_approved && <Check className="w-3 h-3 text-emerald-500" />}
                                                        <span className="text-[9px] font-bold text-slate-400">{sop.severity}</span>
                                                    </div>
                                                    <p className="text-sm font-black text-slate-900">{sop.title}</p>
                                                    {sop.dispute_type && (
                                                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">{sop.dispute_type.replace(/_/g, ' ')}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[9px] font-bold text-slate-400">#{sop.hit_count || 0} hits</span>
                                                    {!sop.human_approved && (
                                                        <button onClick={() => approveHuman(sop)} className="h-8 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase hover:bg-emerald-100 transition-colors border border-emerald-100">
                                                            Approve
                                                        </button>
                                                    )}
                                                    <button onClick={() => openEdit(sop)} className="w-8 h-8 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => toggleStatus(sop)} className="w-8 h-8 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-colors">
                                                        <Archive className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => setExpanded(isExp ? null : sop.id)} className="w-8 h-8 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
                                                        {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            {isExp && (
                                                <div className="px-8 pb-6">
                                                    <div className="bg-slate-50 rounded-2xl p-5 text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                                        {sop.rule_body}
                                                    </div>
                                                    <div className="flex gap-4 mt-3 text-[9px] font-bold text-slate-400">
                                                        <span>Priority: {sop.priority}</span>
                                                        <span>·</span>
                                                        <span>Applies to AI: {sop.applies_to_agent ? 'Yes' : 'No'}</span>
                                                        <span>·</span>
                                                        <span>Human approved: {sop.human_approved ? 'Yes' : 'No'}</span>
                                                        {sop.last_hit_at && <><span>·</span><span>Last hit: {new Date(sop.last_hit_at).toLocaleDateString()}</span></>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
