"use client";

import { useState, useEffect, useCallback } from "react";
import { Megaphone, Send, Image as ImageIcon, Video, X, Bold, Italic, Link as LinkIcon, AlertCircle, History, FileText, Cog, Plus, Pencil, Trash2 } from "lucide-react";
import axios from "axios";
import AdminShell from "@/components/admin/AdminShell";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };
type MarketingTab = 'Broadcast' | 'Campaign History' | 'Templates' | 'Automation';
const TARGET_PLATFORMS = [
  { id: "all", label: "All Platforms" }, { id: "telegram", label: "Telegram" },
  { id: "discord", label: "Discord" }, { id: "whatsapp", label: "WhatsApp" }, { id: "instagram", label: "Instagram" }
];
const STATUS_CHIP: Record<string, { color: string; bg: string }> = {
  SENT:      { color: '#059669', bg: '#f0fdf4' }, DRAFT:     { color: '#475569', bg: '#f1f5f9' },
  SENDING:   { color: '#2563eb', bg: '#eff6ff' }, FAILED:    { color: '#e11d48', bg: '#fff1f2' },
  SCHEDULED: { color: '#d97706', bg: '#fffbeb' },
};

export default function MarketingPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<MarketingTab>('Broadcast');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [crons, setCrons] = useState<any[]>([]);
  const [templateModal, setTemplateModal] = useState<{ mode: 'create' | 'edit'; data?: any } | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplContent, setTplContent] = useState('');
  const [tplLoading, setTplLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["all"]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const plat = searchParams.get('platform');
    if (plat) setPlatforms([plat]);
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const fetchCampaigns = useCallback(() =>
    axios.get(`${API_URL}/admin/marketing/campaigns`, { headers: H }).then(r => setCampaigns(r.data)).catch(() => {}), []);
  const fetchTemplates = useCallback(() =>
    axios.get(`${API_URL}/admin/marketing/templates`, { headers: H }).then(r => setTemplates(r.data)).catch(() => {}), []);
  const fetchCrons = useCallback(() =>
    axios.get(`${API_URL}/admin/system/crons`, { headers: H }).then(r => setCrons(r.data)).catch(() => {}), []);

  useEffect(() => {
    if (activeTab === 'Campaign History') fetchCampaigns();
    if (activeTab === 'Templates') fetchTemplates();
    if (activeTab === 'Automation') fetchCrons();
  }, [activeTab]);

  const saveTpl = async () => {
    setTplLoading(true);
    try {
      if (templateModal?.mode === 'edit' && templateModal.data) {
        await axios.put(`${API_URL}/admin/marketing/templates/${templateModal.data.id}`, { name: tplName, content: tplContent, platforms: [] }, { headers: H });
      } else {
        await axios.post(`${API_URL}/admin/marketing/templates`, { name: tplName, content: tplContent, platforms: [] }, { headers: H });
      }
      setTemplateModal(null); setTplName(''); setTplContent(''); fetchTemplates();
    } catch {} finally { setTplLoading(false); }
  };

  const deleteTpl = async (id: string) => {
    await axios.delete(`${API_URL}/admin/marketing/templates/${id}`, { headers: H }).catch(() => {});
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const triggerCron = async (name: string) => {
    await axios.post(`${API_URL}/admin/system/crons/${name}/trigger`, {}, { headers: H }).catch(() => {});
    setTimeout(fetchCrons, 3000);
  };

  const togglePlatform = (id: string) => {
    if (id === "all") { setPlatforms(["all"]); return; }
    let next = platforms.includes("all") ? [id] : platforms.includes(id) ? platforms.filter(p => p !== id) : [...platforms, id];
    if (next.length === 0) next = ["all"];
    setPlatforms(next);
  };

  const insertFormatting = (prefix: string, suffix = "") => {
    const ta = document.getElementById("broadcast-message") as HTMLTextAreaElement;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    if (prefix === "<a>") {
      const url = prompt("Enter URL:"); if (!url) return;
      setMessage(`${value.slice(0, s)}<a href="${url}">${value.slice(s, e) || "Link Text"}</a>${value.slice(e)}`);
    } else {
      setMessage(`${value.slice(0, s)}${prefix}${value.slice(s, e) || "text"}${suffix}${value.slice(e)}`);
    }
    setTimeout(() => ta.focus(), 0);
  };

  const handleBroadcast = async () => {
    if (!message.trim()) { showToast("Message cannot be empty", "error"); return; }
    setLoading(true);
    try {
      const fd = new FormData(); fd.append('message', message); fd.append('platforms', JSON.stringify(platforms));
      if (file) fd.append('attachment', file);
      const res = await axios.post(`${API_URL}/admin/broadcast`, fd, { headers: { 'Content-Type': 'multipart/form-data', ...H } });
      if (res.data.success) { showToast("Broadcast queued for dispatch!"); setMessage(""); setFile(null); }
    } catch (err: any) { showToast(err.response?.data?.error || "Failed to send broadcast", "error"); }
    finally { setLoading(false); }
  };

  const renderPreviewHTML = (text: string) => {
    let html = text.replace(/\\n/g, '<br />');
    html = html.replace(/<a href=/g, '<a target="_blank" style="color:#059669;text-decoration:underline" href=');
    return html;
  };

  const TAB_ICONS: Record<MarketingTab, any> = { Broadcast: Megaphone, 'Campaign History': History, Templates: FileText, Automation: Cog };

  return (
    <AdminShell title="Marketing" subtitle="Broadcast, templates, and campaign management">
      {toast && (
        <div className="fixed top-6 right-6 z-[100] px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === 'success' ? '#059669' : '#e11d48' }}>{toast.msg}</div>
      )}

      {/* Template Modal */}
      {templateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] shadow-2xl p-7 w-full max-w-md" style={{ border: '1px solid #edeff3' }}>
            <div className="flex items-center justify-between mb-5">
              <p className="font-tight text-[17px] font-bold text-[#0f172a]">{templateModal.mode === 'edit' ? 'Edit Template' : 'New Template'}</p>
              <button onClick={() => { setTemplateModal(null); setTplName(''); setTplContent(''); }} className="w-8 h-8 rounded-xl hover:bg-[#f1f5f9] flex items-center justify-center"><X className="w-4 h-4 text-[#64748b]" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="adm-section-label block mb-1.5">Template Name</label>
                <input value={tplName} onChange={e => setTplName(e.target.value)} className="w-full h-11 px-4 rounded-xl text-[13px] font-semibold outline-none" style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }} />
              </div>
              <div>
                <label className="adm-section-label block mb-1.5">Content</label>
                <textarea value={tplContent} onChange={e => setTplContent(e.target.value)} rows={5} className="w-full px-4 py-3 rounded-xl text-[13px] font-semibold outline-none resize-none" style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setTemplateModal(null); setTplName(''); setTplContent(''); }} className="flex-1 h-11 rounded-xl text-[12px] font-semibold text-[#64748b]" style={{ border: '1px solid #e9eaec' }}>Cancel</button>
              <button onClick={saveTpl} disabled={tplLoading || !tplName || !tplContent} className="flex-1 h-11 rounded-xl text-white text-[12px] font-bold disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: '#6366f1' }}>
                {tplLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1 w-fit">
        {(Object.keys(TAB_ICONS) as MarketingTab[]).map(tab => {
          const Icon = TAB_ICONS[tab];
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all"
              style={activeTab === tab ? { background: '#0f172a', color: '#fff' } : { color: '#64748b' }}>
              <Icon className="w-3 h-3" /> {tab}
            </button>
          );
        })}
      </div>

      {/* Campaign History */}
      {activeTab === 'Campaign History' && (
        <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f3f4f6]">
            <p className="font-tight text-[14px] font-bold text-[#0f172a]">Past Broadcasts</p>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">{campaigns.length} campaigns</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                {['Message', 'Platforms', 'Targeted', 'Delivered', 'Status', 'Sent'].map(h => <th key={h} className="px-5 py-3 adm-section-label">{h}</th>)}
              </tr></thead>
              <tbody>
                {campaigns.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-[12px] font-bold text-[#94a3b8]">No campaigns yet</td></tr>
                : campaigns.map((c: any) => {
                  const chip = STATUS_CHIP[c.status] || { color: '#475569', bg: '#f1f5f9' };
                  return (
                    <tr key={c.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
                      <td className="px-5 py-3.5 text-[12px] text-[#64748b] max-w-[200px] truncate">{c.message}</td>
                      <td className="px-5 py-3.5"><div className="flex flex-wrap gap-1">{(c.platforms || []).map((p: string) => <span key={p} className="adm-chip chip-purple text-[9px] capitalize">{p}</span>)}</div></td>
                      <td className="px-5 py-3.5 text-[12px] font-bold text-[#0f172a]">{c.total_targeted ?? '—'}</td>
                      <td className="px-5 py-3.5"><span className="text-[12px] font-bold text-[#059669]">{c.success_count ?? 0}</span>{c.fail_count > 0 && <span className="text-[10px] text-[#e11d48] ml-1">({c.fail_count} failed)</span>}</td>
                      <td className="px-5 py-3.5"><span className="adm-chip text-[9px] font-bold" style={{ color: chip.color, background: chip.bg }}>{c.status}</span></td>
                      <td className="px-5 py-3.5 text-[11px] text-[#94a3b8]">{c.sent_at ? new Date(c.sent_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Templates */}
      {activeTab === 'Templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setTemplateModal({ mode: 'create' }); setTplName(''); setTplContent(''); }}
              className="h-9 px-4 rounded-xl text-white text-[12px] font-bold flex items-center gap-1.5" style={{ background: '#6366f1' }}>
              <Plus className="w-3.5 h-3.5" /> New Template
            </button>
          </div>
          {templates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e9eaec] py-16 text-center">
              <FileText className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
              <p className="text-[12px] font-bold text-[#94a3b8]">No templates yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map((t: any) => (
                <div key={t.id} className="bg-white rounded-2xl border border-[#e9eaec] p-5">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-tight text-[13px] font-bold text-[#0f172a] pr-2">{t.name}</p>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setTemplateModal({ mode: 'edit', data: t }); setTplName(t.name); setTplContent(t.content); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[#eff6ff]" style={{ background: '#f1f5f9', color: '#64748b' }}>
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => deleteTpl(t.id)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[#fff1f2]" style={{ background: '#f1f5f9', color: '#64748b' }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] line-clamp-3 whitespace-pre-wrap mb-4">{t.content}</p>
                  <button onClick={() => { setActiveTab('Broadcast'); setMessage(t.content); }}
                    className="w-full h-8 rounded-lg text-[11px] font-bold transition-colors" style={{ background: '#f5f3ff', color: '#6366f1' }}>
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
        <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f3f4f6]">
            <p className="font-tight text-[14px] font-bold text-[#0f172a]">Scheduled Automation</p>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">View and manually trigger automated marketing jobs</p>
          </div>
          <table className="w-full text-left">
            <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
              {['Job', 'Schedule', 'Last Run', 'Status', ''].map((h, i) => <th key={i} className="px-5 py-3 adm-section-label">{h}</th>)}
            </tr></thead>
            <tbody>
              {crons.filter(c => ['weekly_digest','onboarding_drip','re_engagement','referral_summary'].includes(c.name)).map((cron: any) => (
                <tr key={cron.name} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
                  <td className="px-5 py-3.5">
                    <p className="text-[12px] font-bold text-[#0f172a]">{cron.label}</p>
                    <p className="text-[10px] font-mono text-[#94a3b8]">{cron.name}</p>
                  </td>
                  <td className="px-5 py-3.5 text-[10px] font-bold text-[#64748b]">{cron.humanSchedule}</td>
                  <td className="px-5 py-3.5 text-[11px] text-[#94a3b8]">{cron.last_run ? new Date(cron.last_run.started_at).toLocaleString() : 'Never'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`adm-chip ${cron.last_run?.status === 'SUCCESS' ? 'chip-green' : cron.last_run?.status === 'ERROR' ? 'chip-red' : 'chip-slate'}`}>
                      {cron.last_run?.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => triggerCron(cron.name)} className="h-8 px-3 rounded-lg text-[11px] font-bold transition-colors" style={{ background: '#0f172a', color: '#fff' }}>Run Now</button>
                  </td>
                </tr>
              ))}
              {crons.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-[12px] font-bold text-[#94a3b8]">Loading jobs…</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Broadcast Composer */}
      {activeTab === 'Broadcast' && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left: Config */}
          <div className="xl:col-span-3 space-y-5">
            <div className="bg-white rounded-2xl border border-[#e9eaec] p-6">
              <p className="adm-section-label mb-3">Target Audience</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {TARGET_PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => togglePlatform(p.id)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all"
                    style={platforms.includes(p.id) ? { background: '#f5f3ff', borderColor: '#c4b5fd', color: '#6366f1' } : { background: '#fff', borderColor: '#e9eaec', color: '#64748b' }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-[#f3f4f6] pt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="adm-section-label">Message Content</p>
                  <div className="flex items-center gap-0.5 p-0.5 rounded-xl" style={{ background: '#f7f8f9', border: '1px solid #e9eaec' }}>
                    {[{ icon: Bold, action: () => insertFormatting("<b>", "</b>") }, { icon: Italic, action: () => insertFormatting("<i>", "</i>") }, { icon: LinkIcon, action: () => insertFormatting("<a>") }].map(({ icon: Icon, action }, i) => (
                      <button key={i} onClick={action} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white" style={{ color: '#64748b' }}>
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea id="broadcast-message" value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Type your marketing message here…"
                  className="w-full h-40 px-4 py-3 rounded-xl text-[13px] font-semibold outline-none resize-none"
                  style={{ background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }} />
              </div>
              {/* Attachment */}
              <div className="mt-5 pt-5 border-t border-[#f3f4f6]">
                <p className="adm-section-label mb-3">Optional Attachment</p>
                {file ? (
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#f5f3ff', border: '1px solid #c4b5fd' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#ede9fe', color: '#6366f1' }}>
                        {file.type.includes('video') ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-[#0f172a]">{file.name}</p>
                        <p className="text-[10px] text-[#94a3b8]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button onClick={() => setFile(null)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: '#6366f1' }}><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl cursor-pointer transition-colors hover:bg-[#f7f8f9]" style={{ background: '#fafafa', border: '2px dashed #e9eaec' }}>
                    <ImageIcon className="w-6 h-6 text-[#cbd5e1] mb-2" />
                    <p className="text-[11px] font-bold text-[#94a3b8]">Upload image or video</p>
                    <p className="text-[10px] text-[#cbd5e1] mt-0.5">PNG, JPG, MP4 — max 50 MB</p>
                    <input type="file" className="hidden" accept="image/*,video/mp4" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
                  </label>
                )}
              </div>
              <div className="flex justify-end mt-5 pt-5 border-t border-[#f3f4f6]">
                <button onClick={handleBroadcast} disabled={loading || !message.trim()}
                  className="h-11 px-6 rounded-xl text-white text-[13px] font-bold flex items-center gap-2 disabled:opacity-50"
                  style={{ background: '#059669' }}>
                  {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {loading ? 'Sending…' : 'Send Broadcast'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="xl:col-span-2">
            <div className="sticky top-[74px]">
              <p className="adm-section-label mb-3 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse inline-block" /> Live Preview</p>
              <div className="rounded-2xl overflow-hidden flex flex-col" style={{ height: 520, background: '#f0f2f5', border: '1px solid #e9eaec' }}>
                <div className="px-5 py-3.5 bg-white border-b border-[#e9eaec] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#f5f3ff', color: '#6366f1' }}><Megaphone className="w-4 h-4" /></div>
                  <div><p className="text-[12px] font-bold text-[#0f172a]">Safeeely Alerts</p><p className="text-[10px] text-[#94a3b8]">bot</p></div>
                </div>
                <div className="flex-1 p-5 overflow-y-auto">
                  {message || file ? (
                    <div className="max-w-[85%] bg-white rounded-2xl rounded-tl-sm shadow-sm p-1" style={{ border: '1px solid #f1f5f9' }}>
                      {file && (
                        <div className="w-full aspect-video rounded-xl mb-2 flex items-center justify-center overflow-hidden" style={{ background: '#f1f5f9' }}>
                          {file.type.includes('image') ? <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" /> : <div className="flex flex-col items-center gap-2 text-[#94a3b8]"><Video className="w-8 h-8" /><span className="text-[11px] font-bold">Video Attached</span></div>}
                        </div>
                      )}
                      {message && (
                        <div className="text-[13px] leading-relaxed p-2 whitespace-pre-wrap font-medium mkt-preview"
                          dangerouslySetInnerHTML={{ __html: renderPreviewHTML(message) }} />
                      )}
                      <p className="text-[10px] text-right text-[#94a3b8] font-bold px-2 pb-1">Now</p>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-50">
                      <AlertCircle className="w-10 h-10 text-[#cbd5e1] mb-3" />
                      <p className="text-[12px] font-bold text-[#94a3b8]">Preview empty</p>
                      <p className="text-[11px] text-[#94a3b8] mt-1 text-center max-w-[160px]">Start typing to preview how your message looks</p>
                    </div>
                  )}
                </div>
                <div className="p-4 text-center"><div className="py-2.5 px-4 rounded-full text-[11px] font-bold text-[#cbd5e1] bg-white" style={{ border: '1px solid #e9eaec' }}>Users cannot reply</div></div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: '.mkt-preview b { font-weight: 800; color: #020617; } .mkt-preview i { font-style: italic; color: #475569; }' }} />
    </AdminShell>
  );
}
