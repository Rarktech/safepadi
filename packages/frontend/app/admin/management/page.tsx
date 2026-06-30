"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Users, Trash2, X, AlertTriangle, Edit, MoreHorizontal, Activity, Check, RefreshCw, Plus } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };

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

const BLANK_FORM = { name: "", email: "", role: "DISPUTER", password: "", specialist_title: "", specialist_bio: "", specialties: [] as string[], cases_resolved: 0, years_on_platform: 0 };

const inputCls = "w-full h-11 px-4 rounded-xl text-[13px] font-semibold outline-none transition-all";
const inputStyle = { background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' };

export default function AdminManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'team' | 'workload'>('team');
  const [workload, setWorkload] = useState<any[]>([]);
  const [workloadLoading, setWorkloadLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [formData, setFormData] = useState(BLANK_FORM);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchAdmins = async () => {
    try { const res = await axios.get(`${API_URL}/admin/users`, { headers: H }); setAdmins(res.data); }
    catch { showToast("Failed to fetch admin users", "error"); }
    finally { setLoading(false); }
  };

  const fetchWorkload = async () => {
    setWorkloadLoading(true);
    try { const res = await axios.get(`${API_URL}/admin/management/workload`, { headers: H }); setWorkload(res.data || []); }
    catch { showToast('Failed to load workload data', 'error'); }
    finally { setWorkloadLoading(false); }
  };

  useEffect(() => { fetchAdmins(); }, []);
  useEffect(() => { if (activeTab === 'workload') fetchWorkload(); }, [activeTab]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading("create");
    try {
      await axios.post(`${API_URL}/admin/users`, formData, { headers: H });
      showToast("Admin created successfully");
      setIsCreateModalOpen(false); setFormData(BLANK_FORM); await fetchAdmins();
    } catch (err: any) { showToast(err.response?.data?.error || "Failed to create admin", "error"); }
    finally { setActionLoading(null); }
  };

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editAdmin) return; setActionLoading("edit");
    try {
      const payload: any = { role: editAdmin.role, status: editAdmin.status, specialist_title: editAdmin.specialist_title, specialist_bio: editAdmin.specialist_bio, specialties: editAdmin.specialties, cases_resolved: editAdmin.cases_resolved, years_on_platform: editAdmin.years_on_platform };
      if (editAdmin.newPassword) payload.password = editAdmin.newPassword;
      await axios.put(`${API_URL}/admin/users/${editAdmin.id}`, payload, { headers: H });
      showToast("Admin updated successfully"); setEditAdmin(null); await fetchAdmins();
    } catch (err: any) { showToast(err.response?.data?.error || "Failed to update admin", "error"); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return; setActionLoading(confirmDelete.id);
    try {
      await axios.delete(`${API_URL}/admin/users/${confirmDelete.id}`, { headers: H });
      showToast(`${confirmDelete.name} removed`); setConfirmDelete(null); await fetchAdmins();
    } catch (err: any) { showToast(err.response?.data?.error || "Failed to delete admin", "error"); }
    finally { setActionLoading(null); setConfirmDelete(null); }
  };

  const SpecialtyPicker = ({ selected, onChange }: { selected: string[], onChange: (v: string[]) => void }) => (
    <div className="grid grid-cols-2 gap-1.5">
      {ADMIN_SPECIALTIES.map(spec => {
        const active = selected.includes(spec.value);
        return (
          <button key={spec.value} type="button"
            onClick={() => onChange(active ? selected.filter(s => s !== spec.value) : [...selected, spec.value])}
            className="px-2.5 py-2 rounded-xl text-[10px] font-bold text-left transition-all flex items-center gap-1.5"
            style={active ? { background: '#6366f1', color: '#fff' } : { background: '#f7f8f9', color: '#64748b', border: '1px solid #e9eaec' }}>
            {active && <Check className="w-2.5 h-2.5 shrink-0" />}{spec.label}
          </button>
        );
      })}
    </div>
  );

  const FormSection = ({ children, label }: { children: React.ReactNode, label: string }) => (
    <div className="border-t border-[#f3f4f6] pt-4">
      <p className="adm-section-label mb-3">{label}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );

  return (
    <AdminShell title="Admin Management" subtitle="Control role-based access for the organizational team">
      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === "success" ? "#059669" : "#e11d48" }}>
          {toast.msg}
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]" style={{ border: '1px solid #edeff3' }}>
            <div className="flex items-center justify-between mb-6">
              <p className="font-tight text-[17px] font-bold text-[#0f172a]">Onboard Admin</p>
              <button onClick={() => setIsCreateModalOpen(false)} className="w-8 h-8 rounded-xl hover:bg-[#f1f5f9] flex items-center justify-center transition-colors"><X className="w-4 h-4 text-[#64748b]" /></button>
            </div>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              {[{ label: "Full Name", key: "name", type: "text", placeholder: "Sarah Connor" }, { label: "Email Address", key: "email", type: "email", placeholder: "sarah@safeeely.com" }, { label: "Temporary Password", key: "password", type: "password", placeholder: "••••••••" }].map(f => (
                <div key={f.key}>
                  <label className="adm-section-label block mb-1.5">{f.label}</label>
                  <input required={f.key !== 'password' ? true : undefined} type={f.type} placeholder={f.placeholder} className={inputCls} style={inputStyle}
                    value={(formData as any)[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} />
                </div>
              ))}
              <div>
                <label className="adm-section-label block mb-1.5">Role Assignment</label>
                <select className={inputCls} style={{ ...inputStyle, appearance: 'none' as any }} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                  <option value="DISPUTER">Disputer Only (Restricted)</option>
                  <option value="SUPPORT">Customer Support</option>
                  <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
                </select>
              </div>
              <FormSection label="Specialist Profile">
                <input className={inputCls} style={inputStyle} placeholder="e.g. Senior Dispute Specialist" value={formData.specialist_title} onChange={e => setFormData({ ...formData, specialist_title: e.target.value })} />
                <textarea rows={2} className="w-full px-4 py-3 rounded-xl text-[13px] font-semibold outline-none resize-none" style={inputStyle} placeholder="Short bio…" value={formData.specialist_bio} onChange={e => setFormData({ ...formData, specialist_bio: e.target.value })} />
                <SpecialtyPicker selected={formData.specialties} onChange={v => setFormData({ ...formData, specialties: v })} />
                <div className="flex gap-3">
                  {[{ label: "Cases Resolved", key: "cases_resolved" }, { label: "Years on Platform", key: "years_on_platform" }].map(f => (
                    <div key={f.key} className="flex-1">
                      <label className="adm-section-label block mb-1.5">{f.label}</label>
                      <input type="number" min={0} className={inputCls} style={inputStyle} value={(formData as any)[f.key]} onChange={e => setFormData({ ...formData, [f.key]: Number(e.target.value) })} />
                    </div>
                  ))}
                </div>
              </FormSection>
              <button type="submit" disabled={actionLoading === "create"}
                className="w-full h-12 rounded-xl text-[13px] font-bold text-white disabled:opacity-60" style={{ background: '#10b981' }}>
                {actionLoading === "create" ? "Creating…" : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editAdmin && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]" style={{ border: '1px solid #edeff3' }}>
            <div className="flex items-center justify-between mb-6">
              <p className="font-tight text-[17px] font-bold text-[#0f172a]">Edit {editAdmin.name}</p>
              <button onClick={() => setEditAdmin(null)} className="w-8 h-8 rounded-xl hover:bg-[#f1f5f9] flex items-center justify-center transition-colors"><X className="w-4 h-4 text-[#64748b]" /></button>
            </div>
            <form onSubmit={handleEditAdmin} className="space-y-4">
              <div>
                <label className="adm-section-label block mb-1.5">Role</label>
                <select className={inputCls} style={{ ...inputStyle, appearance: 'none' as any }} value={editAdmin.role} onChange={e => setEditAdmin({ ...editAdmin, role: e.target.value })}>
                  <option value="DISPUTER">Disputer Only</option>
                  <option value="SUPPORT">Customer Support</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="adm-section-label block mb-1.5">Status</label>
                <select className={inputCls} style={{ ...inputStyle, appearance: 'none' as any }} value={editAdmin.status} onChange={e => setEditAdmin({ ...editAdmin, status: e.target.value })}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div>
                <label className="adm-section-label block mb-1.5">Reset Password (optional)</label>
                <input type="password" className={inputCls} style={inputStyle} placeholder="Leave blank to keep unchanged" value={editAdmin.newPassword || ""} onChange={e => setEditAdmin({ ...editAdmin, newPassword: e.target.value })} />
              </div>
              <FormSection label="Specialist Profile">
                <input className={inputCls} style={inputStyle} placeholder="Specialist Title" value={editAdmin.specialist_title || ""} onChange={e => setEditAdmin({ ...editAdmin, specialist_title: e.target.value })} />
                <textarea rows={2} className="w-full px-4 py-3 rounded-xl text-[13px] font-semibold outline-none resize-none" style={inputStyle} placeholder="Bio / Quote" value={editAdmin.specialist_bio || ""} onChange={e => setEditAdmin({ ...editAdmin, specialist_bio: e.target.value })} />
                <SpecialtyPicker selected={editAdmin.specialties || []} onChange={v => setEditAdmin({ ...editAdmin, specialties: v })} />
              </FormSection>
              <button type="submit" disabled={actionLoading === "edit"}
                className="w-full h-12 rounded-xl text-[13px] font-bold text-white disabled:opacity-60" style={{ background: '#6366f1' }}>
                {actionLoading === "edit" ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-sm w-full shadow-2xl text-center" style={{ border: '1px solid #edeff3' }}>
            <div className="w-12 h-12 rounded-xl bg-[#fff1f2] flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-6 h-6 text-[#e11d48]" /></div>
            <p className="font-tight text-[16px] font-bold text-[#0f172a] mb-2">Delete Admin?</p>
            <p className="text-[12px] font-semibold text-[#64748b] mb-6">This will permanently remove <span className="text-[#0f172a] font-bold">{confirmDelete.name}</span>'s access. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 h-11 rounded-xl text-[12px] font-bold text-[#64748b] hover:bg-[#f1f5f9] transition-colors" style={{ border: '1px solid #e9eaec' }}>Cancel</button>
              <button onClick={handleDelete} disabled={actionLoading === confirmDelete.id}
                className="flex-1 h-11 rounded-xl text-[12px] font-bold text-white disabled:opacity-60" style={{ background: '#e11d48' }}>
                {actionLoading === confirmDelete.id ? "Deleting…" : "Yes, Terminate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#e9eaec] p-1">
          {(['team', 'workload'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all flex items-center gap-1.5"
              style={activeTab === tab ? { background: '#0f172a', color: '#fff' } : { color: '#64748b' }}>
              {tab === 'team' ? <Users className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
              {tab === 'team' ? 'Team Members' : 'Workload'}
            </button>
          ))}
        </div>
        <button onClick={() => setIsCreateModalOpen(true)}
          className="h-9 px-5 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5" style={{ background: '#0f172a' }}>
          <Plus className="w-3.5 h-3.5" /> Onboard Admin
        </button>
      </div>

      {/* TEAM TABLE */}
      {activeTab === 'team' && (
        <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
            <p className="font-tight text-[14px] font-bold text-[#0f172a]">Active Team Members</p>
            <span className="adm-chip chip-slate">{admins.length} Staff</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" /></div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                  {['Profile', 'Role', 'Status', ''].map(h => (
                    <th key={h} className={`px-5 py-3 adm-section-label ${h === '' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => {
                  const isSuper = admin.role === "SUPER_ADMIN";
                  const isInactive = admin.status === "INACTIVE";
                  return (
                    <tr key={admin.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-[#e9eaec]">
                            <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${admin.name}&backgroundColor=0f172a,10b981`} alt={admin.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-[#0f172a]">{admin.name}</p>
                            <p className="text-[11px] text-[#94a3b8]">{admin.specialist_title || admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`adm-chip ${isSuper ? 'chip-purple' : 'chip-slate'}`}>{isSuper ? 'Super Admin' : admin.role}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: isInactive ? '#e11d48' : '#10b981' }} />
                          <span className="text-[12px] font-semibold text-[#64748b]">{isInactive ? 'Inactive' : 'Active'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setEditAdmin(admin)} className="w-8 h-8 rounded-lg hover:bg-[#eff6ff] flex items-center justify-center transition-colors" title="Edit">
                            <Edit className="w-3.5 h-3.5 text-[#2563eb]" />
                          </button>
                          <button onClick={() => setConfirmDelete(admin)} className="w-8 h-8 rounded-lg hover:bg-[#fff1f2] flex items-center justify-center transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5 text-[#e11d48]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* WORKLOAD TABLE */}
      {activeTab === 'workload' && (
        <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
            <p className="font-tight text-[14px] font-bold text-[#0f172a]">Live Caseload</p>
            <button onClick={fetchWorkload} className="h-8 px-3 rounded-lg text-[11px] font-bold text-[#64748b] hover:bg-[#f1f5f9] flex items-center gap-1.5 transition-colors">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          {workloadLoading ? (
            <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" /></div>
          ) : workload.length === 0 ? (
            <div className="p-16 text-center text-[12px] font-bold text-[#94a3b8]">No workload data available</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                  {['Specialist', 'Specialties', 'Open Cases', 'Resolved Today', 'Load'].map(h => (
                    <th key={h} className="px-5 py-3 adm-section-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workload.map((w: any) => {
                  const load = w.open_cases || 0;
                  const loadColor = load >= 10 ? '#e11d48' : load >= 5 ? '#d97706' : '#10b981';
                  return (
                    <tr key={w.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-[#e9eaec]">
                            <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${w.name}&backgroundColor=0f172a,10b981`} alt={w.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-[#0f172a]">{w.name}</p>
                            {w.specialist_title && <p className="text-[11px] text-[#94a3b8]">{w.specialist_title}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(w.specialties || []).slice(0, 3).map((s: string) => (
                            <span key={s} className="adm-chip chip-blue text-[9px]">{s.replace(/_/g, ' ')}</span>
                          ))}
                          {(w.specialties || []).length > 3 && <span className="text-[10px] text-[#94a3b8]">+{w.specialties.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-tight text-xl font-bold text-[#0f172a]">{load}</td>
                      <td className="px-5 py-4 font-tight text-[15px] font-bold text-[#059669]">{w.resolved_today || 0}</td>
                      <td className="px-5 py-4">
                        <div className="w-24 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (load / 15) * 100)}%`, background: loadColor }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </AdminShell>
  );
}
