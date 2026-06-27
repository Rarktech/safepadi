"use client";

import { useState, useEffect, useCallback } from "react";
import AdminSidebar from "@/components/admin/Sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Megaphone, Send, Image as ImageIcon, Video, X, Bold, Italic, Link as LinkIcon, AlertCircle, History, FileText, Cog, Plus, Pencil, Trash2 } from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

type MarketingTab = 'Broadcast' | 'Campaign History' | 'Templates' | 'Automation';

const TARGET_PLATFORMS = [
    { id: "all", label: "All Platforms" },
    { id: "telegram", label: "Telegram" },
    { id: "discord", label: "Discord" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "instagram", label: "Instagram" }
];

export default function MarketingPage() {
    const [activeTab, setActiveTab] = useState<MarketingTab>('Broadcast');
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [crons, setCrons] = useState<any[]>([]);
    const [templateModal, setTemplateModal] = useState<{ mode: 'create' | 'edit'; data?: any } | null>(null);
    const [tplName, setTplName] = useState('');
    const [tplContent, setTplContent] = useState('');
    const [tplLoading, setTplLoading] = useState(false);

    const fetchCampaigns = useCallback(() =>
        axios.get(`${API_URL}/admin/marketing/campaigns`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then(r => setCampaigns(r.data)).catch(() => {}), []);

    const fetchTemplates = useCallback(() =>
        axios.get(`${API_URL}/admin/marketing/templates`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then(r => setTemplates(r.data)).catch(() => {}), []);

    const fetchCrons = useCallback(() =>
        axios.get(`${API_URL}/admin/system/crons`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then(r => setCrons(r.data)).catch(() => {}), []);

    useEffect(() => {
        if (activeTab === 'Campaign History') fetchCampaigns();
        if (activeTab === 'Templates') fetchTemplates();
        if (activeTab === 'Automation') fetchCrons();
    }, [activeTab]);

    const saveTpl = async () => {
        setTplLoading(true);
        try {
            if (templateModal?.mode === 'edit' && templateModal.data) {
                await axios.put(`${API_URL}/admin/marketing/templates/${templateModal.data.id}`, { name: tplName, content: tplContent, platforms: [] }, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            } else {
                await axios.post(`${API_URL}/admin/marketing/templates`, { name: tplName, content: tplContent, platforms: [] }, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            }
            setTemplateModal(null);
            setTplName(''); setTplContent('');
            fetchTemplates();
        } catch {} finally { setTplLoading(false); }
    };

    const deleteTpl = async (id: string) => {
        await axios.delete(`${API_URL}/admin/marketing/templates/${id}`, { headers: { 'ngrok-skip-browser-warning': 'true' } }).catch(() => {});
        setTemplates(prev => prev.filter(t => t.id !== id));
    };

    const triggerCron = async (name: string) => {
        await axios.post(`${API_URL}/admin/system/crons/${name}/trigger`, {}, { headers: { 'ngrok-skip-browser-warning': 'true' } }).catch(() => {});
        setTimeout(fetchCrons, 3000);
    };

    const STATUS_COLORS: Record<string, string> = {
        SENT: 'bg-emerald-50 text-emerald-600', DRAFT: 'bg-slate-50 text-slate-500',
        SENDING: 'bg-blue-50 text-blue-600', FAILED: 'bg-rose-50 text-rose-600', SCHEDULED: 'bg-amber-50 text-amber-600',
    };

    const [message, setMessage] = useState("");
    const [platforms, setPlatforms] = useState<string[]>(["all"]);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const togglePlatform = (id: string) => {
        if (id === "all") {
            setPlatforms(["all"]);
            return;
        }
        
        let newPlatforms = [...platforms];
        if (newPlatforms.includes("all")) {
            newPlatforms = [id];
        } else if (newPlatforms.includes(id)) {
            newPlatforms = newPlatforms.filter(p => p !== id);
        } else {
            newPlatforms.push(id);
        }
        
        if (newPlatforms.length === 0) newPlatforms = ["all"];
        setPlatforms(newPlatforms);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const insertFormatting = (prefix: string, suffix: string = "") => {
        const textarea = document.getElementById("broadcast-message") as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;

        const before = text.substring(0, start);
        const selected = text.substring(start, end);
        const after = text.substring(end);

        let newText = "";
        if (prefix === "<a>") {
            const url = prompt("Enter URL:");
            if (!url) return;
            newText = `${before}<a href="${url}">${selected || "Link Text"}</a>${after}`;
        } else {
            newText = `${before}${prefix}${selected || "text"}${suffix}${after}`;
        }

        setMessage(newText);
        
        setTimeout(() => {
            textarea.focus();
        }, 0);
    };

    const handleBroadcast = async () => {
        if (!message.trim()) {
            showToast("Message cannot be empty", "error");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('message', message);
            formData.append('platforms', JSON.stringify(platforms));
            if (file) {
                formData.append('attachment', file);
            }

            const res = await axios.post(`${API_URL}/admin/broadcast`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }
            });

            if (res.data.success) {
                showToast("Broadcast successfully queued for dispatch!", "success");
                setMessage("");
                setFile(null);
            }
        } catch (err: any) {
            console.error("Broadcast failed:", err);
            showToast(err.response?.data?.error || "Failed to send broadcast", "error");
        } finally {
            setLoading(false);
        }
    };

    // Render HTML Preview safely natively (mocking chat platforms)
    const renderPreviewHTML = (text: string) => {
        let html = text.replace(/\\n/g, '<br />'); // Handle newlines
        // Add basic link targeting
        html = html.replace(/<a href=/g, '<a target="_blank" class="text-emerald-500 hover:underline" href=');
        return html;
    };

    return (
        <div className="flex bg-[#F8FAFC] min-h-screen font-sans">
            <AdminSidebar />

            {templateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-md mx-4">
                        <h3 className="text-xl font-black text-slate-900 mb-6">{templateModal.mode === 'edit' ? 'Edit Template' : 'New Template'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Template Name</label>
                                <input value={tplName} onChange={e => setTplName(e.target.value)}
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Content</label>
                                <textarea value={tplContent} onChange={e => setTplContent(e.target.value)} rows={5}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none resize-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setTemplateModal(null); setTplName(''); setTplContent(''); }}
                                className="flex-1 h-12 rounded-2xl border border-slate-200 font-black text-xs text-slate-600">Cancel</button>
                            <button onClick={saveTpl} disabled={tplLoading || !tplName || !tplContent}
                                className="flex-1 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xs disabled:opacity-50 flex items-center justify-center gap-2">
                                {tplLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                Save Template
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto px-10 py-8">
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Marketing</h1>
                            <p className="text-sm font-bold text-slate-400 mt-1">Broadcast, templates, and campaign management</p>
                        </div>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex gap-2 mb-8 bg-white rounded-2xl border border-slate-100 p-2 shadow-sm w-fit">
                    {(['Broadcast', 'Campaign History', 'Templates', 'Automation'] as MarketingTab[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={cn("px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                                activeTab === tab ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"
                            )}>
                            {tab === 'Broadcast' && <Megaphone className="w-3.5 h-3.5" />}
                            {tab === 'Campaign History' && <History className="w-3.5 h-3.5" />}
                            {tab === 'Templates' && <FileText className="w-3.5 h-3.5" />}
                            {tab === 'Automation' && <Cog className="w-3.5 h-3.5" />}
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Campaign History */}
                {activeTab === 'Campaign History' && (
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50">
                            <h3 className="text-xl font-black text-[#020617] tracking-tight">Past Broadcasts</h3>
                            <p className="text-xs font-bold text-slate-400 mt-1">{campaigns.length} campaigns</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[700px]">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        {['Message', 'Platforms', 'Targeted', 'Delivered', 'Status', 'Sent'].map(h => (
                                            <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {campaigns.length === 0 ? (
                                        <tr><td colSpan={6} className="py-16 text-center text-slate-400 text-sm font-bold">No campaigns yet</td></tr>
                                    ) : campaigns.map((c: any) => (
                                        <tr key={c.id} className="hover:bg-slate-50/50">
                                            <td className="px-8 py-4 text-sm text-slate-700 max-w-[200px] truncate">{c.message}</td>
                                            <td className="px-8 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {(c.platforms || []).map((p: string) => (
                                                        <span key={p} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-xl capitalize">{p}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-8 py-4 text-sm font-bold text-slate-700">{c.total_targeted ?? '—'}</td>
                                            <td className="px-8 py-4">
                                                <span className="text-sm font-bold text-emerald-600">{c.success_count ?? 0}</span>
                                                {c.fail_count > 0 && <span className="text-xs text-rose-400 ml-1">({c.fail_count} failed)</span>}
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className={cn("px-2 py-1 rounded-xl text-[9px] font-black", STATUS_COLORS[c.status] || 'bg-slate-50 text-slate-400')}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-xs text-slate-400">
                                                {c.sent_at ? new Date(c.sent_at).toLocaleDateString() : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Templates */}
                {activeTab === 'Templates' && (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <button onClick={() => { setTemplateModal({ mode: 'create' }); setTplName(''); setTplContent(''); }}
                                className="h-11 px-5 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 flex items-center gap-2">
                                <Plus className="w-4 h-4" /> New Template
                            </button>
                        </div>
                        {templates.length === 0 ? (
                            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm py-16 text-center">
                                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 text-sm font-bold">No templates yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                {templates.map((t: any) => (
                                    <div key={t.id} className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <p className="font-black text-slate-900 text-sm">{t.name}</p>
                                            <div className="flex gap-1.5 shrink-0">
                                                <button onClick={() => {
                                                    setTemplateModal({ mode: 'edit', data: t });
                                                    setTplName(t.name);
                                                    setTplContent(t.content);
                                                }} className="h-7 w-7 rounded-xl bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center">
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => deleteTpl(t.id)}
                                                    className="h-7 w-7 rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 line-clamp-3 whitespace-pre-wrap">{t.content}</p>
                                        <button onClick={() => { setActiveTab('Broadcast'); setMessage(t.content); }}
                                            className="mt-4 w-full h-9 rounded-xl bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100">
                                            Use in Broadcast
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Automation */}
                {activeTab === 'Automation' && (
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50">
                            <h3 className="text-xl font-black text-[#020617] tracking-tight">Scheduled Automation</h3>
                            <p className="text-xs font-bold text-slate-400 mt-1">View and manually trigger automated marketing jobs</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        {['Job', 'Schedule', 'Last Run', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {crons.length === 0 ? (
                                        <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm font-bold">Loading jobs...</td></tr>
                                    ) : crons.filter(c => ['weekly_digest','onboarding_drip','re_engagement','referral_summary'].includes(c.name)).map((cron: any) => (
                                        <tr key={cron.name} className="hover:bg-slate-50/50">
                                            <td className="px-8 py-4">
                                                <p className="text-sm font-black text-slate-900">{cron.label}</p>
                                                <p className="text-[9px] font-mono text-slate-400">{cron.name}</p>
                                            </td>
                                            <td className="px-8 py-4 text-[10px] font-bold text-slate-500">{cron.humanSchedule}</td>
                                            <td className="px-8 py-4 text-xs text-slate-400">
                                                {cron.last_run ? new Date(cron.last_run.started_at).toLocaleString() : 'Never'}
                                            </td>
                                            <td className="px-8 py-4">
                                                {cron.last_run?.status === 'SUCCESS' ? (
                                                    <span className="px-2 py-1 rounded-xl text-[9px] font-black bg-emerald-50 text-emerald-600">OK</span>
                                                ) : cron.last_run?.status === 'ERROR' ? (
                                                    <span className="px-2 py-1 rounded-xl text-[9px] font-black bg-rose-50 text-rose-600">Error</span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-xl text-[9px] font-black bg-slate-50 text-slate-400">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-4">
                                                <button onClick={() => triggerCron(cron.name)}
                                                    className="h-9 px-4 rounded-xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors">
                                                    Run Now
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Original Broadcast composer — only shown on Broadcast tab */}
                {activeTab === 'Broadcast' && <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                    {/* Left Column: Editor Config */}
                    <div className="xl:col-span-3 space-y-6">
                        <Card className="p-8 rounded-[32px] border-slate-100 shadow-sm ring-1 ring-slate-100">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Target Audience
                            </h3>
                            
                            <div className="flex flex-wrap gap-2 mb-8">
                                {TARGET_PLATFORMS.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => togglePlatform(p.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                            platforms.includes(p.id) 
                                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" 
                                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            <hr className="border-slate-100 my-8" />

                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Message Content
                                </h3>
                                
                                <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
                                    <button onClick={() => insertFormatting("<b>", "</b>")} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all group" title="Bold">
                                        <Bold className="w-4 h-4 group-hover:text-slate-900" />
                                    </button>
                                    <button onClick={() => insertFormatting("<i>", "</i>")} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all group" title="Italic">
                                        <Italic className="w-4 h-4 group-hover:text-slate-900" />
                                    </button>
                                    <button onClick={() => insertFormatting("<a>")} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-600 transition-all group" title="Link">
                                        <LinkIcon className="w-4 h-4 group-hover:text-slate-900" />
                                    </button>
                                </div>
                            </div>

                            <textarea
                                id="broadcast-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your marketing message here... Use formatting buttons above for bold, italics, and links."
                                className="w-full h-48 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white resize-none transition-all"
                            />

                            <div className="mt-8">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Optional Media Attachment</h3>
                                {file ? (
                                    <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-500">
                                                {file.type.includes('video') ? <Video className="w-5 h-5"/> : <ImageIcon className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-indigo-900">{file.name}</p>
                                                <p className="text-[10px] font-black text-indigo-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setFile(null)} className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-500">Click to upload image or video</p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium">PNG, JPG, MP4 up to 50MB</p>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*,video/mp4" onChange={handleFileChange} />
                                    </label>
                                )}
                            </div>

                            <div className="flex justify-end mt-8 pt-8 border-t border-slate-100">
                                <Button 
                                    onClick={handleBroadcast}
                                    disabled={loading || !message.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 h-12 font-bold shadow-lg shadow-indigo-600/20 transition-all text-sm"
                                >
                                    {loading ? "Sending..." : "Send Broadcast Now"}
                                    {!loading && <Send className="w-4 h-4 ml-2" />}
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Live Preview */}
                    <div className="xl:col-span-2">
                        <div className="sticky top-8 space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Live Preview
                                </h3>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm">
                                    Simulating Telegram & Discord
                                </div>
                            </div>

                            {/* Preview Mockup Container */}
                            <div className="bg-[#f0f2f5] rounded-[32px] border border-slate-200 shadow-inner overflow-hidden flex flex-col h-[600px] relative">
                                {/* Header */}
                                <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                        <Megaphone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900">Safeeely Alerts</h4>
                                        <p className="text-[11px] font-bold text-slate-400">bot</p>
                                    </div>
                                </div>

                                {/* Chat Area */}
                                <div className="flex-1 p-6 overflow-y-auto w-full">
                                    {message || file ? (
                                        <div className="flex mb-4 relative max-w-[85%]">
                                            <div className="bg-white text-slate-800 p-1 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100">
                                                {file && (
                                                    <div className="w-full aspect-video bg-slate-100 rounded-xl mb-2 flex flex-col items-center justify-center text-slate-400 border border-slate-200 relative overflow-hidden">
                                                        {file.type.includes('image') ? (
                                                            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview"/>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center z-10">
                                                                <Video className="w-8 h-8 mb-2" />
                                                                <span className="text-xs font-bold">Video Attached</span>
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/5" />
                                                    </div>
                                                )}
                                                {message && (
                                                    <div 
                                                        className="text-[14px] leading-[1.4] p-2 whitespace-pre-wrap font-medium message-content"
                                                        dangerouslySetInnerHTML={{ __html: renderPreviewHTML(message) }}
                                                    />
                                                )}
                                                <div className="text-[10px] text-right text-slate-400 font-bold px-2 pb-1">
                                                    Now
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                                                <AlertCircle className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-500">Preview empty</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Start typing your message to see how it looks to users.</p>
                                        </div>
                                    )}
                                </div>
                                {/* Footer Input Mock */}
                                <div className="bg-[#f0f2f5] p-4 text-center">
                                    <div className="bg-white rounded-full py-2.5 px-4 text-xs font-bold text-slate-300 shadow-sm border border-slate-200">
                                        Users cannot reply to this conversation
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>}
            </main>

            {/* Global Styles for preview strong/em parsing */}
            <style dangerouslySetInnerHTML={{__html: `
                .message-content b { font-weight: 800; color: #020617; }
                .message-content i { font-style: italic; color: #475569; }
            `}} />

            {/* Toast notification */}
            {toast && (
                <div className={'fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold animate-in slide-in-from-top duration-300 ' + (toast.type === "success" ? "bg-emerald-600" : "bg-rose-600")}>
                    <span>{toast.type === "success" ? "✅" : "❌"}</span>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
