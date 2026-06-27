
'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    ShieldAlert, Search, ChevronRight, Clock, CheckCircle, AlertCircle,
    User, ArrowRight, UserCheck, AlertTriangle, Layers
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/Sidebar';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const DISPUTE_TYPE_LABELS: Record<string, string> = {
    INSTAGRAM_ACCOUNT: 'Instagram Account', DISCORD_ACCOUNT: 'Discord Account',
    TELEGRAM_ACCOUNT: 'Telegram Account', GMAIL_ACCOUNT: 'Gmail Account',
    TWITTER_ACCOUNT: 'Twitter/X Account', TIKTOK_ACCOUNT: 'TikTok Account',
    YOUTUBE_CHANNEL: 'YouTube Channel', FACEBOOK_ACCOUNT: 'Facebook Account',
    GAMING_ACCOUNT: 'Gaming Account', FREELANCE_CODE: 'Freelance — Code',
    FREELANCE_DESIGN: 'Freelance — Design', FREELANCE_WRITING: 'Freelance — Writing',
    FREELANCE_VIDEO: 'Freelance — Video', FREELANCE_MUSIC: 'Freelance — Music',
    FREELANCE_CONSULTING: 'Freelance — Consulting', DIGITAL_DOWNLOAD: 'Digital Download',
    DOMAIN_WEBSITE: 'Domain / Website', ELECTRONICS_GADGET: 'Electronics & Gadgets',
    VEHICLE_SALE: 'Vehicle Sale', LUXURY_GOODS: 'Luxury Goods',
    FASHION_GOODS: 'Fashion & Clothing', PHYSICAL_GOODS: 'Physical Goods',
    SOCIAL_SERVICE: 'Social Media Service', INFLUENCER_DEAL: 'Influencer Deal',
    EVENT_BOOKING: 'Event Booking', TICKET_RESERVATION: 'Ticket / Reservation',
    DISPATCH_DELIVERY: 'Dispatch & Delivery', EDUCATION_SERVICE: 'Education Service',
    REAL_ESTATE: 'Real Estate', CONSTRUCTION_SERVICE: 'Construction',
    CRYPTO_TO_GOODS: 'Crypto Transaction', GENERIC: 'General Dispute',
};

const TIER_STYLES: Record<string, { label: string; class: string }> = {
    LITE:           { label: 'Lite',           class: 'bg-emerald-100 text-emerald-700' },
    STANDARD:       { label: 'Standard',       class: 'bg-blue-100 text-blue-700' },
    CONSTITUTIONAL: { label: 'Constitutional', class: 'bg-rose-100 text-rose-700' },
};

const FILTER_TABS = [
    { key: 'ALL',        label: 'Everything' },
    { key: 'OPEN',       label: 'Open' },
    { key: 'ESCALATED',  label: 'Escalated' },
    { key: 'UNASSIGNED', label: 'Unassigned' },
    { key: 'MY_CASES',   label: 'My Cases' },
    { key: 'RESOLVED',   label: 'Resolved' },
];

export default function AdminDisputesPage() {
    const router = useRouter();
    const [disputes, setDisputes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [unassignedCount, setUnassignedCount] = useState(0);
    const [search, setSearch] = useState('');

    const fetchDisputes = useCallback(async () => {
        try {
            setLoading(true);
            let url = `${API_URL}/admin/disputes`;
            if (filter === 'UNASSIGNED') {
                url = `${API_URL}/admin/disputes/unassigned`;
            } else if (filter === 'MY_CASES') {
                url = `${API_URL}/admin/disputes/my-cases`;
            } else if (filter !== 'ALL') {
                url = `${API_URL}/admin/disputes?status=${filter}`;
            }
            const res = await axios.get(url, { withCredentials: true, headers: { 'ngrok-skip-browser-warning': 'true' } });
            const data = res.data.disputes || res.data;
            setDisputes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch disputes:', err);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    const fetchUnassignedCount = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/disputes/unassigned`, {
                withCredentials: true,
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            setUnassignedCount(res.data.count || 0);
        } catch { /* non-critical */ }
    }, []);

    useEffect(() => { fetchDisputes(); }, [fetchDisputes]);
    useEffect(() => { fetchUnassignedCount(); }, [fetchUnassignedCount]);

    const filtered = search
        ? disputes.filter(d =>
            d.id?.toLowerCase().includes(search.toLowerCase()) ||
            d.transaction?.product_name?.toLowerCase().includes(search.toLowerCase()) ||
            d.transaction?.buyer?.safetag?.toLowerCase().includes(search.toLowerCase()) ||
            d.transaction?.seller?.safetag?.toLowerCase().includes(search.toLowerCase())
        )
        : disputes;

    const openCount = disputes.filter(d => d.status === 'OPEN').length;
    const resolvedCount = disputes.filter(d => d.status === 'RESOLVED').length;
    const lockedValue = disputes.filter(d => d.status === 'OPEN')
        .reduce((sum, d) => sum + Number(d.transaction?.total_amount || d.transaction?.amount || 0), 0);

    return (
        <div className="flex bg-slate-50 min-h-screen">
            <AdminSidebar />
            <main className="flex-1 p-8 lg:p-12">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Safeeely Ecosystem</span>
                                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Resolution Center</span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Active Disputes</h1>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search cases, buyers, sellers..."
                                className="pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 w-72"
                            />
                        </div>
                    </div>

                    {/* Unassigned Alert Banner */}
                    {unassignedCount > 0 && filter !== 'UNASSIGNED' && (
                        <div
                            onClick={() => setFilter('UNASSIGNED')}
                            className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-amber-100 transition-colors"
                        >
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                            <p className="text-sm font-bold text-amber-800">
                                {unassignedCount} escalated dispute{unassignedCount !== 1 ? 's' : ''} need{unassignedCount === 1 ? 's' : ''} a specialist assigned
                            </p>
                            <span className="ml-auto text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-1">
                                View Now <ChevronRight className="w-3 h-3" />
                            </span>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Untouched Cases', value: openCount, icon: Clock, color: 'rose' },
                            { label: 'Unassigned', value: unassignedCount, icon: AlertTriangle, color: 'amber' },
                            { label: 'Resolved', value: resolvedCount, icon: CheckCircle, color: 'emerald' },
                            { label: 'Locked Value', value: `$${lockedValue.toLocaleString()}`, icon: ShieldAlert, color: 'dark', dark: true },
                        ].map(({ label, value, icon: Icon, color, dark }) => (
                            <div key={label} className={cn(
                                'p-6 rounded-[28px] border flex items-center justify-between group',
                                dark ? 'bg-[#020617] border-transparent shadow-2xl' : 'bg-white border-slate-100 shadow-sm'
                            )}>
                                <div>
                                    <p className={cn('text-[10px] font-black uppercase tracking-[0.2em] mb-1', dark ? 'text-slate-400' : 'text-slate-400')}>{label}</p>
                                    <p className={cn('text-2xl font-black', dark ? 'text-white' : 'text-slate-900')}>{value}</p>
                                </div>
                                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center',
                                    dark ? 'bg-white/10 text-emerald-400' :
                                    color === 'rose' ? 'bg-rose-50 text-rose-500' :
                                    color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                    'bg-emerald-50 text-emerald-500'
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filter tabs */}
                    <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-sm mb-6 overflow-x-auto">
                        {FILTER_TABS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={cn(
                                    'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap relative',
                                    filter === key
                                        ? key === 'ESCALATED' || key === 'UNASSIGNED'
                                            ? 'bg-rose-600 text-white shadow-lg'
                                            : 'bg-slate-900 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-slate-900'
                                )}
                            >
                                {label}
                                {key === 'UNASSIGNED' && unassignedCount > 0 && filter !== 'UNASSIGNED' && (
                                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                        {unassignedCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
                        {loading ? (
                            <div className="p-20 text-center">
                                <div className="w-12 h-12 border-4 border-slate-100 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opening Secure Archive</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-20 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-8 h-8 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">
                                    {filter === 'UNASSIGNED' ? 'All Clear' : 'Clean Slate'}
                                </h3>
                                <p className="text-sm text-slate-400 font-medium">
                                    {filter === 'UNASSIGNED'
                                        ? 'All escalated disputes have been assigned to a specialist.'
                                        : 'No disputes require your attention at the moment.'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {filtered.map((dispute) => {
                                    const tier = TIER_STYLES[dispute.pipeline_tier] || TIER_STYLES.STANDARD;
                                    const disputeTypeLabel = DISPUTE_TYPE_LABELS[dispute.dispute_type] || dispute.dispute_type?.replace(/_/g, ' ') || 'General';
                                    const isUnassigned = dispute.is_ai_paused && !dispute.assigned_admin_id;
                                    const specialistName = dispute.metadata?.assigned_specialist?.name || dispute.assigned_specialist?.name;

                                    return (
                                        <div
                                            key={dispute.id}
                                            onClick={() => router.push(`/admin/disputes/${dispute.id}`)}
                                            className="p-6 hover:bg-slate-50 transition-all cursor-pointer group flex items-center gap-6"
                                        >
                                            {/* Status Icon */}
                                            <div className="shrink-0 relative">
                                                <div className={cn(
                                                    'w-14 h-14 rounded-[20px] flex items-center justify-center transition-all group-hover:rotate-6',
                                                    isUnassigned ? 'bg-amber-50 text-amber-500' :
                                                    dispute.status === 'OPEN' ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400'
                                                )}>
                                                    <AlertCircle className="w-6 h-6" />
                                                </div>
                                                {(dispute.status === 'OPEN' || isUnassigned) && (
                                                    <div className={cn(
                                                        'absolute -top-1 -right-1 w-4 h-4 border-4 border-white rounded-full animate-pulse',
                                                        isUnassigned ? 'bg-amber-500' : 'bg-rose-500'
                                                    )} />
                                                )}
                                            </div>

                                            {/* Main info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{dispute.id?.slice(0, 8)}</span>
                                                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                                    {dispute.pipeline_tier && (
                                                        <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest', tier.class)}>
                                                            {tier.label}
                                                        </span>
                                                    )}
                                                    {isUnassigned ? (
                                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-amber-100 text-amber-700">
                                                            Unassigned
                                                        </span>
                                                    ) : dispute.is_ai_paused ? (
                                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-rose-100 text-rose-600">
                                                            Escalated
                                                        </span>
                                                    ) : (
                                                        <span className={cn(
                                                            'text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest',
                                                            dispute.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-600'
                                                        )}>
                                                            {dispute.status}
                                                        </span>
                                                    )}
                                                    {dispute.age_hours !== undefined && (
                                                        <span className="text-[9px] text-slate-400 font-medium">{dispute.age_hours}h old</span>
                                                    )}
                                                </div>
                                                <h3 className="text-base font-black text-slate-900 group-hover:text-rose-600 transition-colors truncate">
                                                    {dispute.transaction?.product_name || 'Goods/Services Dispute'}
                                                </h3>
                                                <p className="text-[11px] font-semibold text-slate-500 mb-1">{disputeTypeLabel}</p>
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-3 h-3 text-slate-400" />
                                                        <span className="text-[11px] font-bold text-slate-500">
                                                            <span className="text-slate-400">Buyer:</span> @{dispute.transaction?.buyer?.safetag}
                                                        </span>
                                                    </div>
                                                    <ArrowRight className="w-3 h-3 text-slate-300" />
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-3 h-3 text-slate-400" />
                                                        <span className="text-[11px] font-bold text-slate-500">
                                                            <span className="text-slate-400">Seller:</span> @{dispute.transaction?.seller?.safetag}
                                                        </span>
                                                    </div>
                                                    {specialistName && (
                                                        <>
                                                            <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                                            <div className="flex items-center gap-1.5">
                                                                <UserCheck className="w-3 h-3 text-indigo-400" />
                                                                <span className="text-[11px] font-bold text-indigo-600">{specialistName}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Amount */}
                                            <div className="text-right shrink-0">
                                                <p className="text-xl font-black text-slate-900">
                                                    {dispute.transaction?.total_amount || dispute.transaction?.amount} {dispute.transaction?.currency}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Escrow Value</p>
                                            </div>

                                            <ChevronRight className="hidden md:block shrink-0 w-5 h-5 text-slate-300 group-hover:text-slate-900 transition-colors" />
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
