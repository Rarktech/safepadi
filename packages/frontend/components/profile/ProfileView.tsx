'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    Camera, ShieldCheck, ArrowUpRight, Receipt, AlertCircle, PowerOff, Trash2, Loader2
} from 'lucide-react';
import api from '@/lib/api';
import { PayoutAccountsSection } from './PayoutAccountsSection';
import { AccountInfoSection } from './AccountInfoSection';

const COUNTRIES = [
    { code: 'NG', label: '🇳🇬 Nigeria' },
    { code: 'GH', label: '🇬🇭 Ghana' },
    { code: 'KE', label: '🇰🇪 Kenya' },
    { code: 'ZA', label: '🇿🇦 South Africa' },
    { code: 'US', label: '🇺🇸 United States' },
    { code: 'GB', label: '🇬🇧 United Kingdom' },
];

const NOTIF_PREFS_CONFIG = [
    { key: 'email', label: 'Email notifications', description: 'Trade confirmations, payment receipts and security alerts' },
    { key: 'push', label: 'Push notifications', description: 'Real-time updates on your trades and messages' },
    { key: 'sms', label: 'SMS notifications', description: 'One-time PINs and critical security alerts via SMS' },
    { key: 'transactions', label: 'Transaction updates', description: 'When a buyer pays or seller confirms delivery' },
    { key: 'disputes', label: 'Dispute alerts', description: 'Escalations, new evidence and resolution notices' },
    { key: 'referrals', label: 'Referral rewards', description: 'When your referrals sign up or complete a trade' },
    { key: 'marketing', label: 'Promotions & updates', description: 'Product announcements and platform news from Safeeely' },
];
const DEFAULT_NOTIF_PREFS: Record<string, boolean> = { email: true, push: true, sms: false, transactions: true, disputes: true, referrals: true, marketing: false };

const PRIVACY_PREFS_CONFIG = [
    { key: 'public_profile', label: 'Public profile', description: 'Other users can search and view your Safeeely profile' },
    { key: 'show_transactions', label: 'Transaction history', description: 'Show completed trade count on your public profile' },
    { key: 'show_online', label: 'Online status', description: 'Show when you were last active to potential buyers/sellers' },
];
const DEFAULT_PRIVACY_PREFS: Record<string, boolean> = { public_profile: true, show_transactions: false, show_online: true };

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div onClick={onChange} className="relative w-11 h-6 flex-shrink-0 cursor-pointer">
        <div className="absolute inset-0 rounded-full transition-colors" style={{ background: checked ? '#0f172a' : '#e2e8f0' }} />
        <div className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all" style={{ left: checked ? '23px' : '3px' }} />
    </div>
);

export const ProfileView = ({
    profile,
    safetag,
    onUpdated,
}: {
    profile: any;
    safetag: string;
    onUpdated: () => void;
}) => {
    const router = useRouter();
    const [firstName, setFirstName] = useState(profile?.first_name || '');
    const [lastName, setLastName] = useState(profile?.last_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [country, setCountry] = useState(profile?.country || 'NG');
    const [bio, setBio] = useState(profile?.bio || '');
    const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({ ...DEFAULT_NOTIF_PREFS, ...(profile?.notification_prefs || {}) });
    const [privacyPrefs, setPrivacyPrefs] = useState<Record<string, boolean>>({ ...DEFAULT_PRIVACY_PREFS, ...(profile?.privacy_prefs || {}) });
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [stats, setStats] = useState<{ completed_trades: number; member_since: string } | null>(null);

    const [deactivateOpen, setDeactivateOpen] = useState(false);
    const [deactivating, setDeactivating] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteStage, setDeleteStage] = useState<'confirm' | 'awaiting'>('confirm');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        setFirstName(profile?.first_name || '');
        setLastName(profile?.last_name || '');
        setPhone(profile?.phone || '');
        setCountry(profile?.country || 'NG');
        setBio(profile?.bio || '');
        setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...(profile?.notification_prefs || {}) });
        setPrivacyPrefs({ ...DEFAULT_PRIVACY_PREFS, ...(profile?.privacy_prefs || {}) });
    }, [profile?.id]);

    useEffect(() => {
        if (!safetag) return;
        api.get(`/profiles/${safetag}/stats`).then(res => setStats(res.data)).catch(() => {});
    }, [safetag]);

    const displayName = `${firstName} ${lastName}`.trim() || profile?.safetag || 'Your name';
    const dirty = firstName !== (profile?.first_name || '')
        || lastName !== (profile?.last_name || '')
        || phone !== (profile?.phone || '')
        || country !== (profile?.country || 'NG')
        || bio !== (profile?.bio || '');

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch(`/profiles/${safetag}`, { first_name: firstName, last_name: lastName, phone, country, bio });
            toast.success('Profile saved successfully');
            onUpdated();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(true);
        try {
            const form = new FormData();
            form.append('avatar', file);
            await api.post(`/profiles/${safetag}/avatar`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Profile photo updated');
            onUpdated();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to upload photo');
        } finally {
            setUploadingAvatar(false);
            e.target.value = '';
        }
    };

    const toggleNotifPref = async (key: string) => {
        const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
        setNotifPrefs(updated);
        try {
            await api.patch(`/profiles/${safetag}`, { notification_prefs: updated });
        } catch {
            setNotifPrefs(notifPrefs);
            toast.error('Failed to update preference');
        }
    };

    const togglePrivacyPref = async (key: string) => {
        const updated = { ...privacyPrefs, [key]: !privacyPrefs[key] };
        setPrivacyPrefs(updated);
        try {
            await api.patch(`/profiles/${safetag}`, { privacy_prefs: updated });
        } catch {
            setPrivacyPrefs(privacyPrefs);
            toast.error('Failed to update preference');
        }
    };

    const handleDeactivate = async () => {
        setDeactivating(true);
        try {
            await api.post(`/profiles/${safetag}/deactivate`, {});
            toast.success('Account deactivated');
            await api.post('/auth/magic-link/logout').catch(() => {});
            router.push('/login');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to deactivate account');
            setDeactivating(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/profiles/${safetag}`);
            toast.success('Account deleted');
            router.push('/login');
        } catch (err: any) {
            if (err.response?.data?.error === 'STEP_UP_REQUIRED') {
                setDeleteStage('awaiting');
                try {
                    await api.post('/auth/magic-link/request-elevation', { scope: 'delete_account' });
                } catch {
                    toast.error('Could not send confirmation link — please try again');
                }
            } else {
                toast.error(err.response?.data?.error || 'Failed to delete account');
            }
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="max-w-[860px] mx-auto flex flex-col gap-4">

            {/* Hero */}
            <div className="bg-white border border-[#e9eaec] rounded-[18px] p-6 flex items-center gap-5 flex-wrap">
                <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-full bg-[#0f172a] flex items-center justify-center overflow-hidden border-[3px] border-white shadow-[0_0_0_3px_#e9eaec]">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-['Inter_Tight',sans-serif] text-[28px] font-black text-[#10b981]">{displayName.charAt(0).toUpperCase()}</span>
                        )}
                        {uploadingAvatar && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Loader2 size={20} className="text-white animate-spin" />
                            </div>
                        )}
                    </div>
                    <label htmlFor="avatar-input" className="absolute bottom-0 right-0 w-[30px] h-[30px] rounded-full bg-[#0f172a] border-[2.5px] border-[#F7F7F5] flex items-center justify-center cursor-pointer">
                        <Camera size={12} className="text-white" />
                    </label>
                    <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="font-['Inter_Tight',sans-serif] text-[22px] font-black text-[#0f172a] tracking-[-.02em]">{displayName}</h1>
                        {profile?.kyc_status === 'VERIFIED' && (
                            <div className="flex items-center gap-1 bg-[#f0fdf4] border border-[#bbf7d0] rounded-full px-2.5 py-1">
                                <ShieldCheck size={11} className="text-[#16a34a]" />
                                <span className="text-[11px] font-bold text-[#16a34a]">Verified</span>
                            </div>
                        )}
                    </div>
                    <p className="text-[13px] text-[#94a3b8] mt-0.5 font-medium">
                        @{profile?.safetag?.replace('@', '')} · Member since {stats?.member_since ? new Date(stats.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                    </p>
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-[#fffbeb] border border-[#fde68a] rounded-lg px-2.5 py-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2.2}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            <span className="text-xs font-bold text-[#d97706]">{profile?.trust_score ?? 50}% trust score</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#f1f5f9] rounded-lg px-2.5 py-1.5">
                            <Receipt size={12} className="text-[#475569]" />
                            <span className="text-xs font-bold text-[#475569]">{stats?.completed_trades ?? 0} trades</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Personal details */}
            <div className="bg-white border border-[#e9eaec] rounded-[18px] p-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-[34px] h-[34px] rounded-[9px] bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={2.2}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                        </div>
                        <div>
                            <h2 className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a] tracking-[-.01em]">Personal details</h2>
                            <p className="text-[11.5px] text-[#94a3b8] mt-px">Update your name and contact info</p>
                        </div>
                    </div>
                    {dirty && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#0f172a] text-white font-bold text-[13px] disabled:opacity-60"
                        >
                            {saving ? <Loader2 size={13} className="animate-spin" /> : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                            )}
                            Save changes
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1.5">First name</label>
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="w-full h-11 px-3.5 rounded-[10px] border-[1.5px] border-[#e9eaec] text-[13.5px] font-medium text-[#0f172a] outline-none focus:border-[#0f172a]" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1.5">Last name</label>
                        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="w-full h-11 px-3.5 rounded-[10px] border-[1.5px] border-[#e9eaec] text-[13.5px] font-medium text-[#0f172a] outline-none focus:border-[#0f172a]" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                            Safetag <span className="text-[10.5px] font-medium text-[#94a3b8] bg-[#f1f5f9] px-1.5 py-0.5 rounded ml-1">Cannot be changed</span>
                        </label>
                        <div className="relative">
                            <input value={profile?.safetag?.replace('@', '') || ''} disabled className="w-full h-11 pl-8 pr-3.5 rounded-[10px] border-[1.5px] border-[#e9eaec] bg-[#f7f8f9] text-[13.5px] font-medium text-[#94a3b8] outline-none cursor-not-allowed" />
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#94a3b8] font-bold">@</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                            Email address <span className="text-[10.5px] font-medium text-[#94a3b8] bg-[#f1f5f9] px-1.5 py-0.5 rounded ml-1">Cannot be changed</span>
                        </label>
                        <input value={profile?.email || ''} disabled className="w-full h-11 px-3.5 rounded-[10px] border-[1.5px] border-[#e9eaec] bg-[#f7f8f9] text-[13.5px] font-medium text-[#94a3b8] outline-none cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1.5">Phone number</label>
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 000 000 0000" className="w-full h-11 px-3.5 rounded-[10px] border-[1.5px] border-[#e9eaec] text-[13.5px] font-medium text-[#0f172a] outline-none focus:border-[#0f172a]" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1.5">Country</label>
                        <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full h-11 px-3.5 rounded-[10px] border-[1.5px] border-[#e9eaec] text-[13.5px] font-medium text-[#0f172a] outline-none focus:border-[#0f172a] cursor-pointer bg-white">
                            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-[#475569] mb-1.5">Bio <span className="font-normal text-[#94a3b8]">(optional)</span></label>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell buyers and sellers a bit about yourself…" className="w-full px-3.5 py-3 rounded-[10px] border-[1.5px] border-[#e9eaec] text-[13.5px] font-medium text-[#0f172a] outline-none focus:border-[#0f172a] resize-vertical" />
                    </div>
                </div>
            </div>

            <PayoutAccountsSection safetag={safetag} />
            <AccountInfoSection safetag={safetag} createdAt={profile?.created_at} />

            {/* Notification preferences */}
            <div className="bg-white border border-[#e9eaec] rounded-[18px] p-6">
                <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-[34px] h-[34px] rounded-[9px] bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2.2}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                    </div>
                    <div>
                        <h2 className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a] tracking-[-.01em]">Notification preferences</h2>
                        <p className="text-[11.5px] text-[#94a3b8] mt-px">Choose how Safeeely contacts you</p>
                    </div>
                </div>
                <div className="flex flex-col rounded-xl overflow-hidden border border-[#e9eaec]">
                    {NOTIF_PREFS_CONFIG.map((p, i) => (
                        <div key={p.key} className={`flex items-center justify-between px-4 py-3.5 bg-white ${i < NOTIF_PREFS_CONFIG.length - 1 ? 'border-b border-[#f3f4f6]' : ''}`}>
                            <div className="flex-1 min-w-0 pr-4">
                                <p className="text-[13px] font-bold text-[#0f172a]">{p.label}</p>
                                <p className="text-[11.5px] text-[#94a3b8] mt-px">{p.description}</p>
                            </div>
                            <Toggle checked={!!notifPrefs[p.key]} onChange={() => toggleNotifPref(p.key)} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Privacy */}
            <div className="bg-white border border-[#e9eaec] rounded-[18px] p-6">
                <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-[34px] h-[34px] rounded-[9px] bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={2.2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    </div>
                    <div>
                        <h2 className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a] tracking-[-.01em]">Privacy</h2>
                        <p className="text-[11.5px] text-[#94a3b8] mt-px">Control who can see your profile</p>
                    </div>
                </div>
                <div className="flex flex-col rounded-xl overflow-hidden border border-[#e9eaec]">
                    {PRIVACY_PREFS_CONFIG.map((p, i) => (
                        <div key={p.key} className={`flex items-center justify-between px-4 py-3.5 bg-white ${i < PRIVACY_PREFS_CONFIG.length - 1 ? 'border-b border-[#f3f4f6]' : ''}`}>
                            <div className="flex-1 min-w-0 pr-4">
                                <p className="text-[13px] font-bold text-[#0f172a]">{p.label}</p>
                                <p className="text-[11.5px] text-[#94a3b8] mt-px">{p.description}</p>
                            </div>
                            <Toggle checked={!!privacyPrefs[p.key]} onChange={() => togglePrivacyPref(p.key)} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Danger zone */}
            <div className="bg-white border border-[#fecdd3] rounded-[18px] p-6">
                <div className="flex items-center gap-2.5 mb-4.5">
                    <div className="w-[34px] h-[34px] rounded-[9px] bg-[#fff1f2] flex items-center justify-center flex-shrink-0">
                        <AlertCircle size={15} className="text-[#e11d48]" />
                    </div>
                    <div>
                        <h2 className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#e11d48] tracking-[-.01em]">Danger zone</h2>
                        <p className="text-[11.5px] text-[#94a3b8] mt-px">Irreversible actions — proceed with care</p>
                    </div>
                </div>
                <div className="flex gap-2.5 flex-wrap">
                    <button onClick={() => setDeactivateOpen(true)} className="flex items-center gap-1.5 h-10 px-4.5 rounded-[10px] border border-[#fecdd3] bg-[#fff1f2] text-[#e11d48] font-bold text-[13px]">
                        <PowerOff size={13} />
                        Deactivate account
                    </button>
                    <button onClick={() => { setDeleteStage('confirm'); setDeleteOpen(true); }} className="flex items-center gap-1.5 h-10 px-4.5 rounded-[10px] border border-[#fecdd3] bg-white text-[#e11d48] font-bold text-[13px]">
                        <Trash2 size={13} />
                        Delete account
                    </button>
                </div>
            </div>

            {/* Deactivate dialog */}
            <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm w-full rounded-[28px] border-none p-8 text-center">
                    <DialogHeader>
                        <DialogTitle className="font-['Inter_Tight',sans-serif] text-xl font-extrabold text-[#0f172a] tracking-[-.01em]">Deactivate account?</DialogTitle>
                        <DialogDescription className="text-[13px] text-[#64748b] mt-1">
                            Your profile will be hidden and your personal data anonymized. This can&apos;t be undone from the app — contact support to reactivate.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2.5 mt-5">
                        <Button variant="outline" onClick={() => setDeactivateOpen(false)} className="h-11 rounded-xl border-[#e9eaec] font-bold text-[#64748b]">Cancel</Button>
                        <Button onClick={handleDeactivate} disabled={deactivating} className="h-11 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white font-bold">
                            {deactivating ? <Loader2 size={15} className="animate-spin" /> : 'Deactivate'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete dialog */}
            <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteStage('confirm'); }}>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm w-full rounded-[28px] border-none p-8 text-center">
                    {deleteStage === 'confirm' ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="font-['Inter_Tight',sans-serif] text-xl font-extrabold text-[#0f172a] tracking-[-.01em]">Delete your account?</DialogTitle>
                                <DialogDescription className="text-[13px] text-[#64748b] mt-1">
                                    This permanently anonymizes your profile and removes your linked accounts and payout methods. We&apos;ll send a confirmation link to your linked platform first.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-2.5 mt-5">
                                <Button variant="outline" onClick={() => setDeleteOpen(false)} className="h-11 rounded-xl border-[#e9eaec] font-bold text-[#64748b]">Cancel</Button>
                                <Button onClick={handleDelete} disabled={deleting} className="h-11 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white font-bold">
                                    {deleting ? <Loader2 size={15} className="animate-spin" /> : 'Yes, delete'}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle className="font-['Inter_Tight',sans-serif] text-xl font-extrabold text-[#0f172a] tracking-[-.01em]">Check your messages</DialogTitle>
                                <DialogDescription className="text-[13px] text-[#64748b] mt-1">
                                    We&apos;ve sent a confirmation link to your linked platform ({profile?.primary_platform || 'bot'}). Click it, then press Retry below.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-2.5 mt-5">
                                <Button variant="outline" onClick={() => setDeleteOpen(false)} className="h-11 rounded-xl border-[#e9eaec] font-bold text-[#64748b]">Cancel</Button>
                                <Button onClick={handleDelete} disabled={deleting} className="h-11 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold flex items-center justify-center gap-1.5">
                                    {deleting ? <Loader2 size={15} className="animate-spin" /> : <><ArrowUpRight size={14} /> Retry</>}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
