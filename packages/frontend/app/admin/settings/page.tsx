'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import AdminShell from '@/components/admin/AdminShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const IT: React.CSSProperties = { fontFamily: "'Inter Tight',sans-serif" };

// ── Toggle switch ──────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button type="button" onClick={onChange} style={{
    width: '42px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', padding: 0,
    background: checked ? '#10b981' : '#e2e8f0', position: 'relative', transition: 'background .18s', flexShrink: 0,
  }}>
    <div style={{
      position: 'absolute', top: '3px', left: checked ? '21px' : '3px',
      width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,.15)', transition: 'left .18s',
    }} />
  </button>
);

// ── Section card header ────────────────────────────────────────────────────
const SectionHeader = ({ iconBg, iconStroke, iconPath, title, subtitle, dirty, saving, onSave }: {
  iconBg: string; iconStroke: string; iconPath: React.ReactNode;
  title: string; subtitle: string; dirty: boolean; saving: boolean; onSave: () => void;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2.2">{iconPath}</svg>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ ...IT, fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h2>
          {dirty && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />}
        </div>
        <p style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px', marginBottom: 0 }}>{subtitle}</p>
      </div>
    </div>
    <button onClick={onSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>
      {saving && (
        <svg style={{ animation: 'spin 1s linear infinite' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      Save
    </button>
  </div>
);

// ── Toggle row ─────────────────────────────────────────────────────────────
const ToggleRow = ({ label, sub, checked, onChange, danger = false }: {
  label: string; sub: string; checked: boolean; onChange: () => void; danger?: boolean;
}) => {
  const inner = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: danger ? 'flex-start' : 'center', gap: danger ? '10px' : 0 }}>
        {danger && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: '2px' }}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
        <div>
          <p style={{ fontSize: '13.5px', fontWeight: 700, color: danger ? '#e11d48' : '#0f172a', margin: 0 }}>{label}</p>
          <p style={{ fontSize: '11.5px', color: danger ? '#be123c' : '#94a3b8', marginTop: '3px', marginBottom: 0 }}>{sub}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
  if (danger) {
    return (
      <div style={{ padding: '16px 18px', background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: '12px' }}>
        {inner}
      </div>
    );
  }
  return inner;
};

const Divider = () => <div style={{ height: '1px', background: '#f3f4f6' }} />;

const SubLabel = ({ text }: { text: string }) => (
  <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px', marginTop: 0 }}>{text}</p>
);

// ── Settings shape & defaults ───────────────────────────────────────────────
type Draft = Record<string, any>;

const DEFAULTS: Draft = {
  platform_fee_percent_ngn: 2.5,
  platform_fee_percent_usd: 2,
  platform_fee_percent_usdt: 1,
  default_fee_allocation: 'split',
  transaction_minimum_ngn: 500,
  transaction_minimum_usd: 1,
  auto_disburse_enabled: true,
  auto_disburse_threshold_ngn: 500000,
  auto_disburse_threshold_usd: 1000,
  auto_disburse_threshold_gbp: 800,
  max_pending_withdrawals_per_24h: 3,
  crypto_payouts_enabled: false,
  referral_programme_enabled: true,
  referral_tier1_percent: 10,
  referral_tier2_percent: 5,
  kyc_required_for_transactions: true,
  kyc_auto_approve: false,
  kyc_threshold_ngn: 100000,
  kyc_threshold_usd: 200,
  kyc_doc_nin: true,
  kyc_doc_passport: true,
  kyc_doc_drivers_license: false,
  dispute_ai_mediator_enabled: true,
  dispute_auto_routing_enabled: true,
  dispute_resolution_window_hours: 72,
  dispute_specialist_auto_assign: true,
  dispute_escalation_threshold_hours: 48,
  marketplace_enabled: true,
  milestone_transactions_enabled: true,
  magic_link_auth_enabled: true,
  new_registrations_enabled: true,
  maintenance_mode: false,
  admin_session_timeout_hours: 24,
  admin_2fa_required: false,
  admin_ip_whitelist: '',
};

const SECTION_KEYS: Record<string, string[]> = {
  fees:     ['platform_fee_percent_ngn', 'platform_fee_percent_usd', 'platform_fee_percent_usdt', 'default_fee_allocation', 'transaction_minimum_ngn', 'transaction_minimum_usd'],
  payouts:  ['auto_disburse_enabled', 'auto_disburse_threshold_ngn', 'auto_disburse_threshold_usd', 'auto_disburse_threshold_gbp', 'max_pending_withdrawals_per_24h', 'crypto_payouts_enabled'],
  referral: ['referral_programme_enabled', 'referral_tier1_percent', 'referral_tier2_percent'],
  kyc:      ['kyc_required_for_transactions', 'kyc_auto_approve', 'kyc_threshold_ngn', 'kyc_threshold_usd', 'kyc_doc_nin', 'kyc_doc_passport', 'kyc_doc_drivers_license'],
  dispute:  ['dispute_ai_mediator_enabled', 'dispute_auto_routing_enabled', 'dispute_specialist_auto_assign', 'dispute_resolution_window_hours', 'dispute_escalation_threshold_hours'],
  platform: ['marketplace_enabled', 'milestone_transactions_enabled', 'magic_link_auth_enabled', 'new_registrations_enabled', 'maintenance_mode'],
  security: ['admin_session_timeout_hours', 'admin_2fa_required', 'admin_ip_whitelist'],
};

export default function AdminSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Draft>(DEFAULTS);
  const [draft, setDraft] = useState<Draft>(DEFAULTS);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/settings`, {
        withCredentials: true, headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      const raw = res.data;
      const merged: Draft = { ...DEFAULTS };
      for (const k of Object.keys(DEFAULTS)) {
        if (raw[k] !== undefined) merged[k] = raw[k];
      }
      // backward compat: single platform_fee_rate (decimal) → per-currency %
      if (raw.platform_fee_rate !== undefined && raw.platform_fee_percent_ngn === undefined) {
        const pct = raw.platform_fee_rate * 100;
        merged.platform_fee_percent_ngn = pct;
        merged.platform_fee_percent_usd = pct;
        merged.platform_fee_percent_usdt = pct;
      }
      // backward compat: referral stored as decimal (0.10 → 10 for display)
      if (raw.referral_tier1_percent !== undefined && Number(raw.referral_tier1_percent) <= 1)
        merged.referral_tier1_percent = Number(raw.referral_tier1_percent) * 100;
      if (raw.referral_tier2_percent !== undefined && Number(raw.referral_tier2_percent) <= 1)
        merged.referral_tier2_percent = Number(raw.referral_tier2_percent) * 100;
      // boolean fields: API may return 0/1 (old rows stored before new GET parser)
      for (const k of Object.keys(DEFAULTS)) {
        if (typeof DEFAULTS[k] === 'boolean' && merged[k] !== undefined) {
          merged[k] = Boolean(Number(merged[k]) || merged[k] === true);
        }
      }
      setSaved(merged);
      setDraft(merged);
    } catch (err: any) {
      if (err.response?.status === 401) router.push('/admin/login');
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, value: any) => setDraft(d => ({ ...d, [key]: value }));

  const isDirty = (section: string) =>
    (SECTION_KEYS[section] ?? []).some(k => draft[k] !== saved[k]);

  // Boolean keys sent as 0/1; referral percents sent as decimals; fee % sent as-is (new fields) + legacy rate
  const BOOLEAN_KEYS = new Set([
    'auto_disburse_enabled', 'crypto_payouts_enabled', 'referral_programme_enabled',
    'kyc_required_for_transactions', 'kyc_auto_approve', 'kyc_doc_nin', 'kyc_doc_passport', 'kyc_doc_drivers_license',
    'dispute_ai_mediator_enabled', 'dispute_auto_routing_enabled', 'dispute_specialist_auto_assign',
    'marketplace_enabled', 'milestone_transactions_enabled', 'magic_link_auth_enabled',
    'new_registrations_enabled', 'maintenance_mode', 'admin_2fa_required',
  ]);

  const saveSection = async (section: string) => {
    const keys = SECTION_KEYS[section] ?? [];
    const payload: Draft = {};
    for (const k of keys) {
      if (BOOLEAN_KEYS.has(k)) {
        payload[k] = draft[k] ? 1 : 0;
      } else {
        payload[k] = draft[k];
      }
    }
    // fees: also send legacy platform_fee_rate (decimal) for backward compat
    if (section === 'fees') payload.platform_fee_rate = draft.platform_fee_percent_ngn / 100;
    // referral: tier percents must be sent as decimals (API stores 0.10 = 10%)
    if (section === 'referral') {
      payload.referral_tier1_percent = draft.referral_tier1_percent / 100;
      payload.referral_tier2_percent = draft.referral_tier2_percent / 100;
    }
    setSaving(s => ({ ...s, [section]: true }));
    try {
      await axios.patch(`${API_URL}/admin/settings`, payload, {
        withCredentials: true, headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      setSaved(s => ({ ...s, ...payload }));
      showToast('Settings saved');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(s => ({ ...s, [section]: false }));
    }
  };

  const numInp = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: '#f7f8f9', border: '1.5px solid #e9eaec', borderRadius: '9px',
    fontSize: '13px', fontWeight: 600, color: '#0f172a', outline: 'none',
    fontFamily: "'Inter',sans-serif", ...extra,
  });

  return (
    <AdminShell title="Platform Settings" subtitle="Configure fee rates and platform behaviour">

      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-[13px] font-bold animate-in slide-in-from-top duration-300"
          style={{ background: toast.type === 'success' ? '#059669' : '#e11d48' }}>
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Configuration</p>
        <h1 style={{ ...IT, fontSize: '26px', fontWeight: 900, color: '#0f172a', letterSpacing: '-.03em' }}>Platform Settings</h1>
        <p style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '5px' }}>Changes take effect immediately after saving each section</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: '14px' }}>
          <svg style={{ animation: 'spin 1s linear infinite' }} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Loading settings…</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '860px' }}>

          {/* ── 1. Transactions & Fees ── */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
            <SectionHeader
              iconBg="#f0fdf4" iconStroke="#10b981"
              iconPath={<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>}
              title="Transactions & Fees"
              subtitle="Platform commission rates and minimum transaction amounts"
              dirty={isDirty('fees')} saving={!!saving.fees} onSave={() => saveSection('fees')}
            />
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Per-currency fee sliders */}
              <div>
                <SubLabel text="Platform Fee %" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {([
                    { key: 'platform_fee_percent_ngn', label: 'NGN', dot: '#0f172a', accent: '#10b981', chip: { bg: '#f0fdf4', border: '#bbf7d0', color: '#10b981' } },
                    { key: 'platform_fee_percent_usd', label: 'USD', dot: '#2563eb', accent: '#2563eb', chip: { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb' } },
                    { key: 'platform_fee_percent_usdt', label: 'USDT', dot: '#16a34a', accent: '#16a34a', chip: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' } },
                  ] as Array<{ key: string; label: string; dot: string; accent: string; chip: Record<string, string> }>).map(row => (
                    <div key={row.key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 52px', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: row.dot }} />
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>{row.label}</span>
                      </div>
                      <input type="range" min={0} max={10} step={0.1} value={draft[row.key]}
                        onChange={e => set(row.key, parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: row.accent, height: '5px' }} />
                      <div style={{ background: row.chip.bg, border: `1px solid ${row.chip.border}`, borderRadius: '7px', padding: '4px 8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: row.chip.color }}>{Number(draft[row.key]).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Divider />
              {/* Fee allocation */}
              <div>
                <SubLabel text="Default Fee Allocation" />
                <div style={{ display: 'flex', gap: '8px' }}>
                  {([
                    { value: 'buyer', label: 'Buyer pays' },
                    { value: 'split', label: 'Split 50/50' },
                    { value: 'seller', label: 'Seller pays' },
                  ] as Array<{ value: string; label: string }>).map(opt => {
                    const active = draft.default_fee_allocation === opt.value;
                    const isGreen = opt.value === 'split';
                    return (
                      <button key={opt.value} onClick={() => set('default_fee_allocation', opt.value)} style={{
                        flex: 1, padding: '11px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: "'Inter',sans-serif", transition: 'all .14s',
                        border: `1.5px solid ${active ? (isGreen ? '#10b981' : '#0f172a') : '#e9eaec'}`,
                        background: active ? (isGreen ? '#f0fdf4' : '#0f172a') : '#fff',
                        color: active ? (isGreen ? '#10b981' : '#fff') : '#64748b',
                      }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Divider />
              {/* Minimum amounts */}
              <div>
                <SubLabel text="Minimum Transaction Amount" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {([
                    { key: 'transaction_minimum_ngn', label: 'NGN', sym: '₦' },
                    { key: 'transaction_minimum_usd', label: 'USD', sym: '$' },
                  ] as Array<{ key: string; label: string; sym: string }>).map(row => (
                    <div key={row.key}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>{row.label}</p>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>{row.sym}</span>
                        <input type="number" min={0} value={draft[row.key]} onChange={e => set(row.key, parseFloat(e.target.value))}
                          style={{ ...numInp({ width: '100%', height: '40px', padding: '0 12px 0 26px' }) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Payouts & Withdrawals ── */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
            <SectionHeader
              iconBg="#eff6ff" iconStroke="#2563eb"
              iconPath={<><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>}
              title="Payouts & Withdrawals"
              subtitle="Auto-disbursement thresholds and withdrawal velocity limits"
              dirty={isDirty('payouts')} saving={!!saving.payouts} onSave={() => saveSection('payouts')}
            />
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <ToggleRow label="Automatic Disbursement" sub="Automatically pay out sellers when a transaction is finalised" checked={!!draft.auto_disburse_enabled} onChange={() => set('auto_disburse_enabled', !draft.auto_disburse_enabled)} />
              <Divider />
              <div>
                <SubLabel text="Auto-Disburse Threshold (manual review above)" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {([
                    { key: 'auto_disburse_threshold_ngn', sym: '₦', label: 'NGN' },
                    { key: 'auto_disburse_threshold_usd', sym: '$', label: 'USD' },
                    { key: 'auto_disburse_threshold_gbp', sym: '£', label: 'GBP' },
                  ] as Array<{ key: string; sym: string; label: string }>).map(row => (
                    <div key={row.key}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>{row.label}</p>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>{row.sym}</span>
                        <input type="number" min={0} value={draft[row.key]} onChange={e => set(row.key, parseFloat(e.target.value))}
                          style={{ ...numInp({ width: '100%', height: '38px', padding: '0 10px 0 24px', fontSize: '12px' }) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Divider />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Max Pending Withdrawals / 24h</p>
                  <p style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px', marginBottom: 0 }}>Per user velocity limit before requiring manual approval</p>
                </div>
                <input type="number" min={1} max={20} value={draft.max_pending_withdrawals_per_24h}
                  onChange={e => set('max_pending_withdrawals_per_24h', parseInt(e.target.value, 10))}
                  style={{ ...IT, ...numInp({ width: '72px', height: '38px', padding: '0 10px', fontSize: '14px', fontWeight: 700, textAlign: 'center' }) }} />
              </div>
              <Divider />
              <ToggleRow label="Crypto Payouts" sub="Allow withdrawals in USDT and other crypto assets" checked={!!draft.crypto_payouts_enabled} onChange={() => set('crypto_payouts_enabled', !draft.crypto_payouts_enabled)} />
            </div>
          </div>

          {/* ── 3. Referral Programme ── */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
            <SectionHeader
              iconBg="#fdf4ff" iconStroke="#9333ea"
              iconPath={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>}
              title="Referral Programme"
              subtitle="Tiered commission structure for referrals"
              dirty={isDirty('referral')} saving={!!saving.referral} onSave={() => saveSection('referral')}
            />
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <ToggleRow label="Referral Programme" sub="Enable two-tier referral commissions on platform fees" checked={!!draft.referral_programme_enabled} onChange={() => set('referral_programme_enabled', !draft.referral_programme_enabled)} />
              <Divider />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {([
                  { key: 'referral_tier1_percent', badge: 'T1', badgeBg: '#9333ea', label: 'Direct Referral', sub: "Commission on referee's first transaction", max: 50, accent: '#9333ea', chip: { bg: '#fdf4ff', border: '#e9d5ff', color: '#9333ea' } },
                  { key: 'referral_tier2_percent', badge: 'T2', badgeBg: '#c084fc', label: 'Second-Level Referral', sub: "Commission on referee's referee transactions", max: 25, accent: '#c084fc', chip: { bg: '#fdf4ff', border: '#e9d5ff', color: '#c084fc' } },
                ] as Array<{ key: string; badge: string; badgeBg: string; label: string; sub: string; max: number; accent: string; chip: Record<string, string> }>).map(row => (
                  <div key={row.key}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: row.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '9px', fontWeight: 900, color: '#fff' }}>{row.badge}</span>
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{row.label}</p>
                          <p style={{ fontSize: '10.5px', color: '#94a3b8', margin: 0 }}>{row.sub}</p>
                        </div>
                      </div>
                      <div style={{ background: row.chip.bg, border: `1px solid ${row.chip.border}`, borderRadius: '8px', padding: '5px 12px', minWidth: '52px', textAlign: 'center' }}>
                        <span style={{ ...IT, fontSize: '15px', fontWeight: 900, color: row.chip.color }}>{Number(draft[row.key]).toFixed(1)}%</span>
                      </div>
                    </div>
                    <input type="range" min={0} max={row.max} step={0.5} value={draft[row.key]}
                      onChange={e => set(row.key, parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: row.accent, height: '5px' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 4. KYC & Verification ── */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
            <SectionHeader
              iconBg="#fffbeb" iconStroke="#d97706"
              iconPath={<><path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" /><polyline points="9 12 11 14 15 10" /></>}
              title="KYC & Verification"
              subtitle="Identity verification requirements and accepted document types"
              dirty={isDirty('kyc')} saving={!!saving.kyc} onSave={() => saveSection('kyc')}
            />
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <ToggleRow label="KYC Required for Transactions" sub="Users must complete identity verification before transacting" checked={!!draft.kyc_required_for_transactions} onChange={() => set('kyc_required_for_transactions', !draft.kyc_required_for_transactions)} />
              <ToggleRow label="Auto-Approve KYC" sub="Automatically approve KYC submissions without manual review" checked={!!draft.kyc_auto_approve} onChange={() => set('kyc_auto_approve', !draft.kyc_auto_approve)} />
              <Divider />
              <div>
                <SubLabel text="KYC Required Above Amount" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {([
                    { key: 'kyc_threshold_ngn', sym: '₦', label: 'NGN' },
                    { key: 'kyc_threshold_usd', sym: '$', label: 'USD' },
                  ] as Array<{ key: string; sym: string; label: string }>).map(row => (
                    <div key={row.key}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>{row.label}</p>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>{row.sym}</span>
                        <input type="number" min={0} value={draft[row.key]} onChange={e => set(row.key, parseFloat(e.target.value))}
                          style={{ ...numInp({ width: '100%', height: '38px', padding: '0 10px 0 24px', fontSize: '12px' }) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Divider />
              <div>
                <SubLabel text="Accepted Document Types" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {([
                    { key: 'kyc_doc_nin', label: 'National Identity Number (NIN)', sub: 'Nigeria NIMC-issued national ID' },
                    { key: 'kyc_doc_passport', label: 'International Passport', sub: 'Any valid international travel document' },
                    { key: 'kyc_doc_drivers_license', label: "Driver's License", sub: "Government-issued driver's license" },
                  ] as Array<{ key: string; label: string; sub: string }>).map(row => (
                    <label key={row.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!draft[row.key]} onChange={() => set(row.key, !draft[row.key])}
                        style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }} />
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{row.label}</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{row.sub}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 5. Dispute Management ── */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
            <SectionHeader
              iconBg="#fff1f2" iconStroke="#e11d48"
              iconPath={<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>}
              title="Dispute Management"
              subtitle="AI mediator, routing rules and resolution time windows"
              dirty={isDirty('dispute')} saving={!!saving.dispute} onSave={() => saveSection('dispute')}
            />
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <ToggleRow label="AI Mediator" sub="Use Gemini AI to automatically mediate and resolve disputes" checked={!!draft.dispute_ai_mediator_enabled} onChange={() => set('dispute_ai_mediator_enabled', !draft.dispute_ai_mediator_enabled)} />
              <ToggleRow label="Auto Routing" sub="Automatically route disputes to available specialists" checked={!!draft.dispute_auto_routing_enabled} onChange={() => set('dispute_auto_routing_enabled', !draft.dispute_auto_routing_enabled)} />
              <ToggleRow label="Auto-Assign Specialist" sub="Automatically assign a specialist when AI escalates a case" checked={!!draft.dispute_specialist_auto_assign} onChange={() => set('dispute_specialist_auto_assign', !draft.dispute_specialist_auto_assign)} />
              <Divider />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {([
                  { key: 'dispute_resolution_window_hours', label: 'Resolution Window (hours)' },
                  { key: 'dispute_escalation_threshold_hours', label: 'Escalation Threshold (hours)' },
                ] as Array<{ key: string; label: string }>).map(row => (
                  <div key={row.key}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>{row.label}</p>
                    <input type="number" min={1} max={720} value={draft[row.key]}
                      onChange={e => set(row.key, parseInt(e.target.value, 10))}
                      style={{ ...IT, ...numInp({ width: '100%', height: '40px', padding: '0 12px', fontSize: '14px', fontWeight: 700, textAlign: 'center' }) }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 6. Platform Features ── */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
            <SectionHeader
              iconBg="#f8fafc" iconStroke="#64748b"
              iconPath={<><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>}
              title="Platform Features"
              subtitle="Enable or disable core platform capabilities"
              dirty={isDirty('platform')} saving={!!saving.platform} onSave={() => saveSection('platform')}
            />
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <ToggleRow label="Marketplace" sub="Allow users to post and browse marketplace listings" checked={!!draft.marketplace_enabled} onChange={() => set('marketplace_enabled', !draft.marketplace_enabled)} />
              <ToggleRow label="Milestone Transactions" sub="Allow transactions to be structured as multi-phase milestones" checked={!!draft.milestone_transactions_enabled} onChange={() => set('milestone_transactions_enabled', !draft.milestone_transactions_enabled)} />
              <ToggleRow label="Magic Link Auth" sub="Allow users to log in with email magic links" checked={!!draft.magic_link_auth_enabled} onChange={() => set('magic_link_auth_enabled', !draft.magic_link_auth_enabled)} />
              <ToggleRow label="New Registrations" sub="Allow new users to register on the platform" checked={!!draft.new_registrations_enabled} onChange={() => set('new_registrations_enabled', !draft.new_registrations_enabled)} />
              <ToggleRow label="Maintenance Mode" sub="Take the platform offline for all users immediately" checked={!!draft.maintenance_mode} onChange={() => set('maintenance_mode', !draft.maintenance_mode)} danger />
            </div>
          </div>

          {/* ── 7. Security ── */}
          <div className="bg-white rounded-2xl border border-[#e9eaec] overflow-hidden">
            <SectionHeader
              iconBg="#0f172a" iconStroke="#10b981"
              iconPath={<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>}
              title="Security"
              subtitle="Admin access controls and session management"
              dirty={isDirty('security')} saving={!!saving.security} onSave={() => saveSection('security')}
            />
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Admin Session Timeout</p>
                  <p style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px', marginBottom: 0 }}>Automatically log out inactive admin sessions</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="number" min={1} max={168} value={draft.admin_session_timeout_hours}
                    onChange={e => set('admin_session_timeout_hours', parseInt(e.target.value, 10))}
                    style={{ ...IT, ...numInp({ width: '64px', height: '38px', padding: '0 10px', fontSize: '14px', fontWeight: 700, textAlign: 'center' }) }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>hours</span>
                </div>
              </div>
              <ToggleRow label="Require 2FA for Admins" sub="Enforce two-factor authentication for all admin accounts" checked={!!draft.admin_2fa_required} onChange={() => set('admin_2fa_required', !draft.admin_2fa_required)} />
              <Divider />
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>IP Whitelist</p>
                <p style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '10px' }}>Enter one IP address or CIDR range per line. Leave empty to allow all IPs.</p>
                <textarea value={draft.admin_ip_whitelist} onChange={e => set('admin_ip_whitelist', e.target.value)}
                  placeholder={'e.g. 197.210.54.0/24\n41.190.3.10'}
                  style={{ width: '100%', minHeight: '88px', padding: '11px 14px', background: '#f7f8f9', border: '1.5px solid #e9eaec', borderRadius: '10px', fontSize: '12.5px', fontWeight: 500, color: '#0f172a', outline: 'none', resize: 'vertical', fontFamily: "'IBM Plex Mono', monospace, sans-serif", lineHeight: 1.6, display: 'block' }} />
              </div>
            </div>
          </div>

        </div>
      )}
    </AdminShell>
  );
}
