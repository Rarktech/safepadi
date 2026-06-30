"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Users, Filter, Megaphone, RefreshCw } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const H = { 'ngrok-skip-browser-warning': 'true' };
const PLATFORMS = ['', 'telegram', 'discord', 'whatsapp', 'instagram', 'apple_business', 'messenger'];
const KYC_STATUSES = ['', 'APPROVED', 'PENDING', 'REJECTED', 'NOT_SUBMITTED'];
const KYC_CHIP: Record<string, string> = { APPROVED: 'chip-green', PENDING: 'chip-amber', REJECTED: 'chip-red', NOT_SUBMITTED: 'chip-slate' };

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
      setUsers(usersRes.data); setCount(countRes.data.count);
    } catch {} finally { setLoading(false); }
  }, [platform, kycStatus, page]);

  useEffect(() => { fetchUsers(); }, [platform, kycStatus, page]);

  const broadcastToSegment = () => {
    const params = new URLSearchParams();
    if (platform) params.set('platform', platform);
    if (kycStatus) params.set('kyc_status', kycStatus);
    router.push(`/admin/marketing?${params.toString()}`);
  };

  const FilterPill = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all capitalize"
      style={active ? { background: '#0f172a', color: '#fff', borderColor: '#0f172a' } : { background: '#fff', color: '#64748b', borderColor: '#e9eaec' }}>
      {label || 'All'}
    </button>
  );

  return (
    <AdminShell title="User Segments" subtitle="Filter and target users by platform, KYC status, and activity">
      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-3.5 h-3.5 text-[#94a3b8]" />
          <p className="adm-section-label">Segment Filters</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <p className="adm-section-label mb-3">Platform</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => <FilterPill key={p} active={platform === p} onClick={() => { setPlatform(p); setPage(1); }} label={p.replace('_', ' ')} />)}
            </div>
          </div>
          <div>
            <p className="adm-section-label mb-3">KYC Status</p>
            <div className="flex flex-wrap gap-2">
              {KYC_STATUSES.map(k => <FilterPill key={k} active={kycStatus === k} onClick={() => { setKycStatus(k); setPage(1); }} label={k} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Result header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f5f3ff] flex items-center justify-center">
            <Users className="w-4.5 h-4.5 text-[#6366f1]" />
          </div>
          <div>
            <p className="font-tight text-xl font-bold text-[#0f172a]">{count !== null ? count.toLocaleString() : '—'} users</p>
            <p className="text-[11px] text-[#94a3b8]">matching segment</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchUsers} className="h-9 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-colors hover:bg-[#f1f5f9]" style={{ border: '1px solid #e9eaec', color: '#64748b' }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={broadcastToSegment} className="h-9 px-4 rounded-xl text-white text-[12px] font-bold flex items-center gap-1.5" style={{ background: '#059669' }}>
            <Megaphone className="w-3.5 h-3.5" /> Broadcast
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
        <table className="w-full text-left">
          <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
            {['Safetag', 'Email', 'Platform', 'KYC', 'Joined'].map(h => <th key={h} className="px-5 py-3 adm-section-label">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center"><div className="w-7 h-7 border-[3px] border-[#e9eaec] border-t-[#6366f1] rounded-full animate-spin mx-auto" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="py-16 text-center">
                <Users className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
                <p className="text-[12px] font-bold text-[#94a3b8]">No users match this segment</p>
              </td></tr>
            ) : users.map((u: any) => (
              <tr key={u.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] cursor-pointer transition-colors" onClick={() => router.push(`/admin/customers/${u.id}`)}>
                <td className="px-5 py-3.5 text-[12px] font-bold text-[#0f172a]">{u.safetag}</td>
                <td className="px-5 py-3.5 text-[12px] text-[#64748b]">{u.email}</td>
                <td className="px-5 py-3.5"><span className="adm-chip chip-slate capitalize">{u.primary_platform?.replace('_', ' ') || '—'}</span></td>
                <td className="px-5 py-3.5"><span className={`adm-chip ${KYC_CHIP[u.kyc_status] || 'chip-slate'}`}>{u.kyc_status || '—'}</span></td>
                <td className="px-5 py-3.5 text-[11px] text-[#94a3b8]">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length > 0 && (
          <div className="px-6 py-4 border-t border-[#f3f4f6] flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#94a3b8]">Page {page}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 px-4 rounded-xl text-[11px] font-bold text-[#64748b] disabled:opacity-40 transition-colors hover:bg-[#f1f5f9]" style={{ border: '1px solid #e9eaec' }}>Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={users.length < 50} className="h-8 px-4 rounded-xl text-[11px] font-bold text-[#64748b] disabled:opacity-40 transition-colors hover:bg-[#f1f5f9]" style={{ border: '1px solid #e9eaec' }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
