"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { BookOpen, Plus, Edit, Check, X, Lock, Archive, ChevronDown, ChevronUp, AlertTriangle, Search } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const SEVERITY_CHIP: Record<string, string> = {
  ADVISORY:  "chip-blue",
  BINDING:   "chip-amber",
  HARD_GATE: "chip-red",
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
  sop_code: '', title: '', dispute_type: '', rule_body: '',
  severity: 'ADVISORY', priority: 1, applies_to_agent: true,
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
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000);
  };

  const openCreate = () => { setForm(BLANK_SOP); setEditingSop(null); setShowModal(true); };
  const openEdit = (sop: any) => { setForm({ ...sop }); setEditingSop(sop); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editingSop) {
        await axios.put(`${API_URL}/admin/disputes/sops/${editingSop.id}`, form, { headers });
        showToast('SOP updated');
      } else {
        await axios.post(`${API_URL}/admin/disputes/sops`, form, { headers });
        showToast('SOP created');
      }
      setShowModal(false); fetchAll();
    } catch (err: any) { showToast(err.response?.data?.error || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (sop: any) => {
    const newStatus = sop.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    try {
      await axios.patch(`${API_URL}/admin/disputes/sops/${sop.id}/status`, { status: newStatus }, { headers });
      showToast(`SOP ${newStatus.toLowerCase()}`); fetchAll();
    } catch { showToast('Status update failed', 'error'); }
  };

  const approveHuman = async (sop: any) => {
    try {
      await axios.patch(`${API_URL}/admin/disputes/sops/${sop.id}/approve`, {}, { headers });
      showToast('SOP approved for AI use'); fetchAll();
    } catch { showToast('Approval failed', 'error'); }
  };

  const filtered = sops.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus.toUpperCase()) return false;
    if (filterSeverity !== 'all' && s.severity !== filterSeverity.toUpperCase()) return false;
    if (search && !s.title?.toLowerCase().includes(search.toLowerCase()) && !s.sop_code?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const inputClass = "w-full h-10 px-3.5 rounded-xl text-[13px] font-medium outline-none";
  const inputStyle = { background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' };

  return (
    <AdminShell title="SOP Manager" subtitle="Dispute Standard Operating Procedures for AI + admin guidance">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === "success" ? "#059669" : "#e11d48" }}>
          {toast.msg}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]"
            style={{ border: '1px solid #edeff3' }}>
            <div className="flex items-center justify-between mb-6">
              <p className="font-tight text-[17px] font-bold text-[#0f172a]">{editingSop ? 'Edit SOP' : 'Create SOP'}</p>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-[#f1f5f9] flex items-center justify-center text-[#94a3b8]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="adm-section-label block mb-1.5">SOP Code</label>
                  <input required className={inputClass} style={inputStyle} placeholder="SOP-001"
                    value={form.sop_code} onChange={e => setForm({ ...form, sop_code: e.target.value })} />
                </div>
                <div>
                  <label className="adm-section-label block mb-1.5">Priority</label>
                  <input type="number" min={1} max={100} className={inputClass} style={inputStyle}
                    value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="adm-section-label block mb-1.5">Title</label>
                <input required className={inputClass} style={inputStyle} placeholder="SOP title…"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="adm-section-label block mb-1.5">Severity</label>
                  <select className={`${inputClass} appearance-none`} style={inputStyle}
                    value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                    <option value="ADVISORY">Advisory</option>
                    <option value="BINDING">Binding</option>
                    <option value="HARD_GATE">Hard Gate</option>
                  </select>
                </div>
                <div>
                  <label className="adm-section-label block mb-1.5">Dispute Type</label>
                  <select className={`${inputClass} appearance-none`} style={inputStyle}
                    value={form.dispute_type || ''} onChange={e => setForm({ ...form, dispute_type: e.target.value || null })}>
                    <option value="">All Types</option>
                    {DISPUTE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="adm-section-label block mb-1.5">Rule Body</label>
                <textarea required rows={4} className="w-full px-3.5 py-3 rounded-xl text-[13px] font-medium outline-none resize-none"
                  style={inputStyle} placeholder="Describe the SOP rule…"
                  value={form.rule_body} onChange={e => setForm({ ...form, rule_body: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.applies_to_agent}
                  onChange={e => setForm({ ...form, applies_to_agent: e.target.checked })}
                  className="w-4 h-4 accent-[#10b981] rounded" />
                <span className="text-[12px] font-semibold text-[#64748b]">Applies to AI Agent (auto-enforce)</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 h-11 rounded-xl text-[13px] font-semibold text-[#64748b] transition-colors hover:bg-[#f1f5f9]"
                  style={{ border: '1px solid #e9eaec' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 h-11 rounded-xl text-[13px] font-bold text-white disabled:opacity-60"
                  style={{ background: '#0f172a' }}>
                  {saving ? 'Saving…' : (editingSop ? 'Save Changes' : 'Create SOP')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics row */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total SOPs', value: analytics.total_sops || sops.length },
            { label: 'Active', value: analytics.active_count || sops.filter((s: any) => s.status === 'ACTIVE').length },
            { label: 'Pending Approval', value: analytics.pending_approval || sops.filter((s: any) => !s.human_approved).length },
            { label: 'AI Override Rate', value: analytics.override_rate ? `${analytics.override_rate}%` : '—' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5">
              <p className="adm-section-label mb-2">{c.label}</p>
              <p className="font-tight text-2xl font-bold text-[#0f172a]">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters + action */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
          <input placeholder="Search SOPs…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 h-9 rounded-xl text-[12px] font-medium outline-none"
            style={{ width: 200, background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }} />
        </div>
        {[
          { group: 'status', options: ['all', 'ACTIVE', 'ARCHIVED'], current: filterStatus, set: setFilterStatus },
          { group: 'severity', options: ['all', 'ADVISORY', 'BINDING', 'HARD_GATE'], current: filterSeverity, set: setFilterSeverity },
        ].map(f => (
          <div key={f.group} className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1">
            {f.options.map(opt => (
              <button key={opt} onClick={() => f.set(opt)}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={f.current === opt ? { background: '#0f172a', color: '#fff' } : { color: '#64748b' }}>
                {opt === 'all' ? 'All' : opt.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        ))}
        <button onClick={openCreate} className="ml-auto h-9 px-4 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5"
          style={{ background: '#0f172a' }}>
          <Plus className="w-3.5 h-3.5" /> New SOP
        </button>
      </div>

      {/* SOP list */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin mb-3" />
            <p className="adm-section-label">Loading SOPs…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="w-10 h-10 mb-3 opacity-20 text-[#94a3b8]" />
            <p className="font-tight text-[14px] font-bold text-[#0f172a]">No SOPs found</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f3f4f6]">
            {filtered.map((sop: any) => {
              const isOpen = expanded === sop.id;
              return (
                <div key={sop.id} className={`border-l-[3px] transition-colors ${sop.status === 'ARCHIVED' ? 'opacity-50 border-l-[#cbd5e1]' : 'border-l-[#10b981]'}`}>
                  <div className="flex items-center gap-4 p-5 hover:bg-[#fafafa] cursor-pointer" onClick={() => setExpanded(isOpen ? null : sop.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="adm-section-label">{sop.sop_code}</span>
                        <span className={`adm-chip ${SEVERITY_CHIP[sop.severity] ?? 'chip-slate'}`}>{sop.severity}</span>
                        {sop.human_approved && <span className="adm-chip chip-green">AI Approved</span>}
                        {sop.status === 'ARCHIVED' && <span className="adm-chip chip-slate">Archived</span>}
                      </div>
                      <p className="text-[13px] font-semibold text-[#0f172a]">{sop.title}</p>
                      {sop.dispute_type && <p className="text-[11px] text-[#94a3b8] mt-0.5">{sop.dispute_type.replace(/_/g, ' ')}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="adm-section-label">P{sop.priority}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-[#94a3b8]" /> : <ChevronDown className="w-4 h-4 text-[#94a3b8]" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-5 space-y-4" style={{ background: '#fafafa' }}>
                      <div className="rounded-xl p-4 text-[13px] text-[#64748b] leading-relaxed" style={{ background: '#f7f8f9', border: '1px solid #e9eaec' }}>
                        {sop.rule_body}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => openEdit(sop)}
                          className="h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors hover:bg-[#f1f5f9]"
                          style={{ border: '1px solid #e9eaec', color: '#64748b' }}>
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        {!sop.human_approved && sop.status === 'ACTIVE' && (
                          <button onClick={() => approveHuman(sop)}
                            className="h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                            style={{ background: '#f0fdf4', border: '1px solid #d1fae5', color: '#059669' }}>
                            <Check className="w-3 h-3" /> Approve for AI
                          </button>
                        )}
                        <button onClick={() => toggleStatus(sop)}
                          className="h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                          style={{ background: sop.status === 'ACTIVE' ? '#f1f5f9' : '#f0fdf4', color: sop.status === 'ACTIVE' ? '#64748b' : '#059669', border: '1px solid #e9eaec' }}>
                          {sop.status === 'ACTIVE' ? <><Archive className="w-3 h-3" /> Archive</> : <><Check className="w-3 h-3" /> Restore</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
