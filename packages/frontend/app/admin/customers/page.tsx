"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Users, Search, MoreHorizontal, Eye, ShieldOff, ShieldCheck, Trash2, X, AlertTriangle, ArrowLeft, ArrowRight,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  telegram: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#229ED9">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 13.898l-2.95-.924c-.642-.204-.655-.643.136-.953l11.512-4.44c.534-.194 1.001.131.716.64z" />
    </svg>
  ),
  discord: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
      <defs>
        <linearGradient id="igGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <path fill="url(#igGrad2)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  ),
};

export default function AdminCustomers() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    safetag: "", email: "", first_name: "", last_name: "",
    primary_platform: "telegram", platform_id: "",
  });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/customers`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
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
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      showToast("Customer created successfully");
      setIsCreateModalOpen(false);
      setNewCustomer({ safetag: "", email: "", first_name: "", last_name: "", primary_platform: "telegram", platform_id: "" });
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
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      showToast(res.data.message || `${customer.safetag} has been blocked`);
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
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      showToast(res.data.message || `${customer.safetag} has been unblocked`);
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
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      showToast(`Account ${confirmDelete.safetag} deleted`);
      setConfirmDelete(null);
      await fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to delete user", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const customers = data?.customers || [];
  const stats = data?.stats || {};
  const filteredCustomers = customers.filter((c: any) =>
    c.safetag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.first_name + " " + c.last_name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputClass = "w-full h-11 px-4 rounded-xl text-[13px] font-medium outline-none transition-all";
  const inputStyle = { background: '#f7f8f9', border: '1.5px solid #edeff3', color: '#0f172a', borderRadius: 12 };

  return (
    <AdminShell title="Customers" subtitle="Manage and analyze your customer relationships">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold animate-in slide-in-from-top duration-300`}
          style={{ background: toast.type === "success" ? "#059669" : "#e11d48" }}>
          {toast.msg}
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]"
            style={{ border: '1px solid #edeff3' }}>
            <div className="flex items-center justify-between mb-6">
              <p className="font-tight text-[18px] font-bold text-[#0f172a]">Create Customer</p>
              <button onClick={() => setIsCreateModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-[#f1f5f9] flex items-center justify-center text-[#64748b]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              {[
                { label: "Safetag", key: "safetag", placeholder: "@john_doe", required: true },
                { label: "Email Address", key: "email", placeholder: "john@example.com", required: true, type: "email" },
              ].map(f => (
                <div key={f.key}>
                  <label className="adm-section-label block mb-1.5">{f.label}</label>
                  <input required={f.required} type={f.type || "text"} placeholder={f.placeholder}
                    className={inputClass} style={inputStyle}
                    value={(newCustomer as any)[f.key]}
                    onChange={e => setNewCustomer({ ...newCustomer, [f.key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "First Name", key: "first_name", placeholder: "John" },
                  { label: "Last Name", key: "last_name", placeholder: "Doe" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="adm-section-label block mb-1.5">{f.label}</label>
                    <input type="text" placeholder={f.placeholder} className={inputClass} style={inputStyle}
                      value={(newCustomer as any)[f.key]}
                      onChange={e => setNewCustomer({ ...newCustomer, [f.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="adm-section-label block mb-1.5">Primary Platform</label>
                  <select className={inputClass} style={inputStyle}
                    value={newCustomer.primary_platform}
                    onChange={e => setNewCustomer({ ...newCustomer, primary_platform: e.target.value })}>
                    <option value="telegram">Telegram</option>
                    <option value="discord">Discord</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>
                <div>
                  <label className="adm-section-label block mb-1.5">Platform ID</label>
                  <input required type="text" placeholder="1234567" className={inputClass} style={inputStyle}
                    value={newCustomer.platform_id}
                    onChange={e => setNewCustomer({ ...newCustomer, platform_id: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" disabled={actionLoading === "create"}
                className="w-full h-12 rounded-xl font-tight text-[14px] font-bold text-white mt-2 disabled:opacity-60 transition-all"
                style={{ background: '#0f172a' }}>
                {actionLoading === "create" ? "Creating…" : "Create Customer"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[28px] p-7 max-w-sm w-full shadow-2xl" style={{ border: '1px solid #edeff3' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 mx-auto" style={{ background: '#fff1f2' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: '#e11d48' }} />
            </div>
            <p className="font-tight text-[17px] font-bold text-[#0f172a] text-center mb-2">Delete Account?</p>
            <p className="text-[13px] text-[#64748b] text-center mb-7">
              This will permanently delete <span className="font-semibold text-[#0f172a]">@{confirmDelete.safetag}</span>'s account. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 h-11 rounded-xl text-[13px] font-semibold text-[#64748b] transition-colors hover:bg-[#f1f5f9]"
                style={{ border: '1px solid #e9eaec' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={actionLoading === confirmDelete.id}
                className="flex-1 h-11 rounded-xl text-[13px] font-bold text-white disabled:opacity-60 transition-colors"
                style={{ background: '#e11d48' }}>
                {actionLoading === confirmDelete.id ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Customers", value: stats.total_customers },
          { label: "New This Month", value: stats.new_customers_count },
          { label: "Avg Order Value", value: stats.avg_transaction_value ? `$${Number(stats.avg_transaction_value).toLocaleString()}` : "—" },
          { label: "Satisfaction Score", value: stats.customer_satisfaction ? `${stats.customer_satisfaction}/5` : "—" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-[#e9eaec] p-5">
            <p className="adm-section-label mb-2">{k.label}</p>
            <p className="font-tight text-2xl font-bold text-[#0f172a]">{k.value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Customer list card */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 border-b border-[#f3f4f6]">
          <div className="flex items-center gap-3">
            <p className="font-tight text-[14px] font-bold text-[#0f172a]">Customer List</p>
            <span className="adm-chip chip-slate">{filteredCustomers.length} results</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
              <input type="text" placeholder="Search customers…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 h-9 rounded-xl text-[12px] font-medium outline-none"
                style={{ width: 220, background: '#f7f8f9', border: '1px solid #e9eaec', color: '#0f172a' }}
              />
            </div>
            <button onClick={() => setIsCreateModalOpen(true)}
              className="h-9 px-4 rounded-xl text-[12px] font-bold text-white flex items-center gap-1.5 transition-all"
              style={{ background: '#0f172a' }}>
              <Users className="w-3.5 h-3.5" /> New Customer
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin mb-3" />
            <p className="adm-section-label">Syncing customer data…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                  {["Customer", "Contact", "Platforms", "Orders", "Total Spent", "Status", ""].map(h => (
                    <th key={h} className={`px-5 py-3.5 adm-section-label ${h === "" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c: any, i: number) => {
                  const isBlocked = c.status === "Blocked";
                  const isActing = actionLoading === c.id;
                  return (
                    <tr key={c.id || i} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#e9eaec] relative shrink-0">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.safetag}&backgroundColor=f1f5f9`}
                              alt={c.safetag} className="w-full h-full object-cover" />
                            {isBlocked && <div className="absolute inset-0 bg-[#e11d48]/20" />}
                          </div>
                          <span className="text-[13px] font-semibold text-[#0f172a]">{c.first_name || "User"} {c.last_name || ""}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[12px] font-semibold text-[#0f172a]">{c.email}</p>
                        <p className="text-[11px] text-[#10b981] font-semibold">{c.safetag}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {c.linked_platforms?.map((lp: any, idx: number) => (
                            <div key={idx} title={lp.platform}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: '#f1f5f9', border: '1px solid #e9eaec' }}>
                              {PLATFORM_ICONS[lp.platform?.toLowerCase()] || (
                                <span className="text-[9px] font-bold text-[#64748b] uppercase">{lp.platform?.[0]}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-semibold text-[#0f172a]">{c.total_orders}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[13px] font-semibold text-[#059669]">${c.total_spent?.toLocaleString()}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`adm-chip ${isBlocked ? "chip-red" : "chip-green"}`}>{c.status}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button disabled={isActing}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all ml-auto disabled:opacity-40">
                              {isActing
                                ? <div className="w-4 h-4 border-2 border-[#e9eaec] border-t-[#10b981] rounded-full animate-spin" />
                                : <MoreHorizontal className="w-4 h-4" />
                              }
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border-[#e9eaec] shadow-xl p-1.5 w-44">
                            <DropdownMenuItem onClick={() => router.push(`/admin/customers/${c.id}`)}
                              className="rounded-xl px-3.5 py-2 text-[12px] font-semibold text-[#64748b] hover:bg-[#f1f5f9] cursor-pointer flex items-center gap-2">
                              <Eye className="w-3.5 h-3.5 text-[#94a3b8]" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-[#f3f4f6]" />
                            {isBlocked ? (
                              <DropdownMenuItem onClick={() => handleUnblock(c)}
                                className="rounded-xl px-3.5 py-2 text-[12px] font-semibold text-[#059669] hover:bg-[#f0fdf4] cursor-pointer flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5" /> Unblock User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleBlock(c)}
                                className="rounded-xl px-3.5 py-2 text-[12px] font-semibold text-[#d97706] hover:bg-[#fffbeb] cursor-pointer flex items-center gap-2">
                                <ShieldOff className="w-3.5 h-3.5" /> Block User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="my-1 bg-[#f3f4f6]" />
                            <DropdownMenuItem onClick={() => setConfirmDelete(c)}
                              className="rounded-xl px-3.5 py-2 text-[12px] font-semibold text-[#e11d48] hover:bg-[#fff1f2] cursor-pointer flex items-center gap-2">
                              <Trash2 className="w-3.5 h-3.5" /> Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredCustomers.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users className="w-10 h-10 mb-3 opacity-20 text-[#94a3b8]" />
                <p className="font-tight text-[14px] font-bold text-[#0f172a]">No customers found</p>
              </div>
            )}
          </div>
        )}

        {/* Footer pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-[#f3f4f6]" style={{ background: '#fafafa' }}>
          <p className="text-[12px] text-[#94a3b8]">
            Showing <span className="font-semibold text-[#0f172a]">{filteredCustomers.length}</span> of <span className="font-semibold text-[#0f172a]">{customers.length}</span> customers
          </p>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-[#94a3b8] disabled:opacity-30 transition-colors hover:bg-[#f1f5f9]"
              style={{ border: '1px solid #e9eaec' }}>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button className="h-9 px-4 rounded-xl text-[12px] font-bold text-white"
              style={{ background: '#0f172a' }}>1</button>
            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-[#94a3b8] transition-colors hover:bg-[#f1f5f9]"
              style={{ border: '1px solid #e9eaec' }}>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
