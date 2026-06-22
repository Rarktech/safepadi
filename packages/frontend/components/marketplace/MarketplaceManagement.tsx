'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search, Plus, Package, Wrench, Briefcase, Eye, Star, MapPin, ShieldCheck,
    RotateCcw, Edit2, Trash2, LayoutGrid, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ListingDetailPanel } from './ListingDetailPanel';
import { CreateListingForm } from './CreateListingForm';
import { fmtPrice, typeBadgeFor, PALETTE_BG, PALETTE_ICON, ALL_CATEGORIES, SUB_CATS } from './marketplace-data';

const PAGE_SIZE = 9;

type ListType = 'all' | 'product' | 'service' | 'job';

function ListingImage({ listing, idx, className }: { listing: any; idx: number; className: string }) {
    if (listing.images?.[0]) {
        return <img src={listing.images[0]} alt={listing.title} className={`${className} object-cover`} />;
    }
    const bg = PALETTE_BG[idx % PALETTE_BG.length];
    const icon = PALETTE_ICON[idx % PALETTE_ICON.length];
    const Icon = listing.category_type === 'job' ? Briefcase : listing.category_type === 'service' ? Wrench : Package;
    return (
        <div className={`${className} flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${bg} 0%, ${bg}cc 100%)` }}>
            <Icon size={28} style={{ color: icon }} />
        </div>
    );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-[6px] px-4 py-2 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${active ? 'bg-[#0f172a] text-white' : 'bg-white text-[#64748b] border border-[#e9eaec] hover:border-[#0f172a] hover:text-[#0f172a]'}`}>
            {children}
        </button>
    );
}

function StatCard({ icon, iconBg, iconColor, label, value }: { icon: React.ReactNode; iconBg: string; iconColor: string; label: string; value: string }) {
    return (
        <div className="bg-white rounded-2xl border border-[#e9eaec] px-5 py-[18px] flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: iconBg, color: iconColor }}>
                {icon}
            </div>
            <div>
                <p className="text-[11px] text-[#94a3b8] font-medium mb-[2px]">{label}</p>
                <p className="font-['Inter_Tight',sans-serif] text-[22px] font-extrabold text-[#0f172a] tracking-[-.02em] leading-none">{value}</p>
            </div>
        </div>
    );
}

export function MarketplaceManagement() {
    const [profileId, setProfileId] = useState('');
    const [view, setView] = useState<'browse' | 'manage'>('browse');

    // Browse state
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<ListType>('all');
    const [filterIntent, setFilterIntent] = useState<'' | 'offering' | 'hiring'>('');
    const [filterPrice, setFilterPrice] = useState<'' | 'low' | 'mid' | 'high'>('');
    const [filterCountry, setFilterCountry] = useState('GLOBAL');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterSubCategory, setFilterSubCategory] = useState('');
    const [listings, setListings] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [browseLoading, setBrowseLoading] = useState(true);

    // Manage state
    const [myListings, setMyListings] = useState<any[]>([]);
    const [manageType, setManageType] = useState<ListType>('all');
    const [manageLoading, setManageLoading] = useState(true);

    // Panels
    const [selectedListing, setSelectedListing] = useState<any | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    useEffect(() => {
        api.get('/auth/me').then(r => {
            if (r.data?.sub) setProfileId(r.data.sub);
        }).catch(() => {});
    }, []);

    const fetchBrowse = useCallback(async (nextOffset: number) => {
        setBrowseLoading(true);
        try {
            const params: Record<string, any> = { limit: PAGE_SIZE, offset: nextOffset };
            if (search) params.q = search;
            if (filterType !== 'all') params.type = filterType;
            if (filterIntent) params.intent = filterIntent;
            if (filterCountry !== 'GLOBAL') params.c = filterCountry;
            const { data } = await api.get('/marketplace', { params });
            setListings(prev => nextOffset === 0 ? (data.listings || []) : [...prev, ...(data.listings || [])]);
            setTotal(data.total || 0);
            setOffset(nextOffset);
        } catch {
            toast.error('Failed to load marketplace listings');
        } finally {
            setBrowseLoading(false);
        }
    }, [search, filterType, filterIntent, filterCountry]);

    useEffect(() => { fetchBrowse(0); }, [fetchBrowse]);

    const fetchMyListings = useCallback(async () => {
        if (!profileId) return;
        setManageLoading(true);
        try {
            const { data } = await api.get(`/marketplace/user/${profileId}`);
            setMyListings(data || []);
        } catch {
            toast.error('Failed to load your listings');
        } finally {
            setManageLoading(false);
        }
    }, [profileId]);

    useEffect(() => { fetchMyListings(); }, [fetchMyListings]);

    // Client-side filters not supported server-side: category/subcategory tag match + price bucket
    const filteredListings = useMemo(() => {
        return listings.filter(l => {
            if (filterCategory && !(l.tags || []).includes(filterCategory)) return false;
            if (filterSubCategory && !(l.tags || []).includes(filterSubCategory)) return false;
            if (filterPrice) {
                const p = Number(l.price) || 0;
                if (filterPrice === 'low' && p >= 50) return false;
                if (filterPrice === 'mid' && (p < 50 || p > 500)) return false;
                if (filterPrice === 'high' && p <= 500) return false;
            }
            return true;
        });
    }, [listings, filterCategory, filterSubCategory, filterPrice]);

    const myFilteredListings = useMemo(() => {
        return manageType === 'all' ? myListings : myListings.filter(l => l.category_type === manageType);
    }, [myListings, manageType]);

    const totalViews = useMemo(() => myListings.reduce((sum, l) => sum + (l.views_count || 0), 0), [myListings]);
    const avgRating = myListings.length > 0 ? 5.0 : 0;
    const avgCTR = totalViews > 0 ? 3.5 : 0;

    const resetFilters = () => {
        setSearch(''); setFilterType('all'); setFilterIntent(''); setFilterPrice('');
        setFilterCountry('GLOBAL'); setFilterCategory(''); setFilterSubCategory('');
    };

    const openCreate = () => { setEditId(null); setShowForm(true); };
    const openEdit = (id: string) => { setEditId(id); setShowForm(true); };
    const handleSaved = () => { setShowForm(false); setEditId(null); fetchMyListings(); fetchBrowse(0); };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this listing? This cannot be undone.')) return;
        try {
            await api.delete(`/marketplace/${id}`, { params: { profile_id: profileId } });
            toast.success('Listing deleted');
            setMyListings(prev => prev.filter(l => l.id !== id));
            fetchBrowse(0);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to delete listing');
        }
    };

    const subCatOptions = filterCategory ? (SUB_CATS[filterCategory] || []) : [];
    const allCategoryOptions = [...new Set([...ALL_CATEGORIES.product, ...ALL_CATEGORIES.service, ...ALL_CATEGORIES.job])];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Tabs + search + new listing — desktop */}
            <div className="hidden md:flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2 bg-[#f1f5f9] p-1 rounded-[12px]">
                    <button onClick={() => setView('browse')} className={`flex items-center gap-2 px-4 py-2 rounded-[9px] text-[13px] font-semibold transition-colors ${view === 'browse' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b]'}`}>
                        <LayoutGrid size={14} /> Browse
                    </button>
                    <button onClick={() => setView('manage')} className={`flex items-center gap-2 px-4 py-2 rounded-[9px] text-[13px] font-semibold transition-colors ${view === 'manage' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b]'}`}>
                        <TrendingUp size={14} /> My Listings
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-[#f7f8f9] border border-[#e9eaec] rounded-[10px] px-[14px] py-2 w-[280px]">
                        <Search size={13} className="text-[#94a3b8]" />
                        <input placeholder="Search listings…" value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none text-[12.5px] text-[#0f172a] w-full" />
                    </div>
                    <button onClick={openCreate} className="flex items-center gap-[7px] bg-[#0f172a] rounded-[10px] px-[18px] py-[9px] text-white font-bold text-[13px] whitespace-nowrap">
                        <Plus size={13} /> New listing
                    </button>
                </div>
            </div>

            {/* Mobile header */}
            <div className="md:hidden mb-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-[10.5px] text-[#94a3b8] font-medium">Marketplace</p>
                        <p className="font-['Inter_Tight',sans-serif] text-[15px] font-extrabold text-[#0f172a]">{total} listings</p>
                    </div>
                    <button onClick={openCreate} className="w-[38px] h-[38px] rounded-full bg-[#0f172a] flex items-center justify-center flex-shrink-0">
                        <Plus size={16} className="text-white" />
                    </button>
                </div>
                <div className="flex gap-1 bg-[#f1f5f9] p-1 rounded-[10px] mb-3">
                    <button onClick={() => setView('browse')} className={`flex-1 py-[9px] rounded-[8px] text-[13px] font-bold transition-colors ${view === 'browse' ? 'bg-[#0f172a] text-white' : 'text-[#64748b]'}`}>Browse</button>
                    <button onClick={() => setView('manage')} className={`flex-1 py-[9px] rounded-[8px] text-[13px] font-bold transition-colors ${view === 'manage' ? 'bg-[#0f172a] text-white' : 'text-[#64748b]'}`}>My Listings</button>
                </div>
                {view === 'browse' && (
                    <div className="flex items-center gap-[9px] bg-white border-[1.5px] border-[#e9eaec] rounded-xl px-[14px] py-[10px]">
                        <Search size={14} className="text-[#94a3b8]" />
                        <input placeholder="Search listings…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-[13.5px] font-medium text-[#0f172a]" />
                    </div>
                )}
            </div>

            {view === 'browse' ? (
                <div className="flex flex-col gap-[18px]">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard icon={<Package size={16} />} iconBg="#eff6ff" iconColor="#2563eb" label="Active listings" value={String(total)} />
                        <StatCard icon={<LayoutGrid size={16} />} iconBg="#f0fdf4" iconColor="#16a34a" label="My listings" value={String(myListings.length)} />
                        <StatCard icon={<Eye size={16} />} iconBg="#fffbeb" iconColor="#d97706" label="Total views" value={String(totalViews)} />
                        <StatCard icon={<Star size={16} />} iconBg="#fdf4ff" iconColor="#9333ea" label="Avg. rating" value={avgRating > 0 ? avgRating.toFixed(1) : '—'} />
                    </div>

                    {/* Filter bar — desktop */}
                    <div className="hidden md:flex items-center gap-[10px] flex-wrap bg-white border border-[#e9eaec] rounded-2xl px-5 py-[14px]">
                        <div className="flex gap-[6px]">
                            <FilterPill active={filterType === 'all'} onClick={() => setFilterType('all')}>All</FilterPill>
                            <FilterPill active={filterType === 'product'} onClick={() => setFilterType('product')}><Package size={12} /> Products</FilterPill>
                            <FilterPill active={filterType === 'service'} onClick={() => setFilterType('service')}><Wrench size={12} /> Services</FilterPill>
                            <FilterPill active={filterType === 'job'} onClick={() => setFilterType('job')}><Briefcase size={12} /> Jobs</FilterPill>
                        </div>
                        <div className="w-px h-5 bg-[#e9eaec]" />
                        <select className="w-[160px] bg-[#f7f8f9] border border-[#e9eaec] rounded-[10px] px-[10px] py-[7px] text-xs text-[#0f172a]" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterSubCategory(''); }}>
                            <option value="">All categories</option>
                            {allCategoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {subCatOptions.length > 0 && (
                            <select className="w-[180px] bg-[#f7f8f9] border border-[#e9eaec] rounded-[10px] px-[10px] py-[7px] text-xs text-[#0f172a]" value={filterSubCategory} onChange={e => setFilterSubCategory(e.target.value)}>
                                <option value="">All subcategories</option>
                                {subCatOptions.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                        <div className="w-px h-5 bg-[#e9eaec]" />
                        <FilterPill active={filterIntent === 'offering'} onClick={() => setFilterIntent(p => p === 'offering' ? '' : 'offering')}>Offering</FilterPill>
                        <FilterPill active={filterIntent === 'hiring'} onClick={() => setFilterIntent(p => p === 'hiring' ? '' : 'hiring')}>Hiring</FilterPill>
                        <div className="w-px h-5 bg-[#e9eaec]" />
                        <FilterPill active={filterPrice === 'low'} onClick={() => setFilterPrice(p => p === 'low' ? '' : 'low')}>Under $50</FilterPill>
                        <FilterPill active={filterPrice === 'mid'} onClick={() => setFilterPrice(p => p === 'mid' ? '' : 'mid')}>$50–$500</FilterPill>
                        <FilterPill active={filterPrice === 'high'} onClick={() => setFilterPrice(p => p === 'high' ? '' : 'high')}>$500+</FilterPill>
                        <div className="w-px h-5 bg-[#e9eaec]" />
                        <select className="w-[130px] bg-[#f7f8f9] border border-[#e9eaec] rounded-[10px] px-[10px] py-[7px] text-xs text-[#0f172a]" value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
                            <option value="GLOBAL">Worldwide</option>
                            <option value="Nigeria">Nigeria</option>
                            <option value="United States">United States</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="India">India</option>
                        </select>
                        <button onClick={resetFilters} className="ml-auto flex items-center gap-[5px] text-xs font-semibold text-[#10b981]">
                            <RotateCcw size={12} /> Reset
                        </button>
                    </div>

                    {/* Filter pills — mobile */}
                    <div className="md:hidden flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
                        <FilterPill active={filterType === 'all'} onClick={() => setFilterType('all')}>All</FilterPill>
                        <FilterPill active={filterType === 'product'} onClick={() => setFilterType('product')}>Products</FilterPill>
                        <FilterPill active={filterType === 'service'} onClick={() => setFilterType('service')}>Services</FilterPill>
                        <FilterPill active={filterType === 'job'} onClick={() => setFilterType('job')}>Jobs</FilterPill>
                        <FilterPill active={filterIntent === 'offering'} onClick={() => setFilterIntent(p => p === 'offering' ? '' : 'offering')}>Offering</FilterPill>
                        <FilterPill active={filterIntent === 'hiring'} onClick={() => setFilterIntent(p => p === 'hiring' ? '' : 'hiring')}>Hiring</FilterPill>
                    </div>

                    {/* Grid */}
                    {browseLoading && listings.length === 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-[14px]">
                            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-[#f1f5f9] rounded-2xl animate-pulse" />)}
                        </div>
                    ) : filteredListings.length === 0 ? (
                        <div className="bg-white border border-[#e9eaec] rounded-2xl py-20 flex flex-col items-center gap-3 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-[#f8f9fa] flex items-center justify-center"><Search size={22} className="text-[#94a3b8]" /></div>
                            <p className="text-[15px] font-extrabold text-[#0f172a]">No listings match</p>
                            <p className="text-[13px] text-[#94a3b8]">Try a different filter or search term.</p>
                            <button onClick={resetFilters} className="bg-[#0f172a] rounded-full px-6 py-[11px] text-white font-bold text-[13px] mt-1">Reset filters</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-[14px] md:gap-[18px]">
                            {filteredListings.map((l, idx) => {
                                const badge = typeBadgeFor(l);
                                const sellerSafetag = l.profiles?.safetag;
                                return (
                                    <div key={l.id} onClick={() => setSelectedListing(l)} className="bg-white rounded-[20px] border border-[#e9eaec] overflow-hidden flex flex-col cursor-pointer transition-all hover:shadow-[0_12px_36px_rgba(15,23,42,.1)] hover:-translate-y-[2px]">
                                        <div className="relative w-full aspect-[16/11] md:aspect-[16/11] overflow-hidden bg-[#f1f5f9]">
                                            <ListingImage listing={l} idx={idx} className="w-full h-full" />
                                            <div className="absolute top-3 left-3">
                                                <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-bold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                                            </div>
                                            <div className="absolute bottom-3 left-3 bg-white/92 backdrop-blur-sm rounded-lg px-[9px] py-1 flex items-center gap-1">
                                                <Star size={11} className="fill-[#f59e0b] text-[#f59e0b]" />
                                                <span className="text-[11px] font-extrabold text-[#0f172a]">5.0</span>
                                                <span className="hidden sm:inline text-[10px] text-[#94a3b8] font-medium">· {l.views_count || 0} views</span>
                                            </div>
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col gap-[10px]">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-extrabold text-[#0f172a] leading-[1.3] truncate">{l.title}</p>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <MapPin size={11} className="text-[#94a3b8]" />
                                                        <span className="text-[11px] text-[#94a3b8] font-medium truncate">{l.origin_country || 'Worldwide'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="font-['Inter_Tight',sans-serif] text-base font-extrabold text-[#0f172a] leading-none">{fmtPrice(l.price, l.currency)}</p>
                                                    <p className="text-[9.5px] font-bold text-[#94a3b8] tracking-[.05em] mt-[2px]">ESCROW</p>
                                                </div>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-2 pt-[10px] border-t border-[#f3f4f6]">
                                                <div className="w-7 h-7 rounded-full bg-[#f1f5f9] flex items-center justify-center font-['Inter_Tight',sans-serif] text-[11px] font-extrabold text-[#475569] flex-shrink-0">
                                                    {(sellerSafetag?.replace('@', '').charAt(0))?.toUpperCase() || '?'}
                                                </div>
                                                <p className="text-xs font-bold text-[#0f172a] flex-1 truncate">{sellerSafetag || 'Unknown seller'}</p>
                                                <div className="flex items-center gap-1">
                                                    <ShieldCheck size={11} className="text-[#10b981]" />
                                                    <span className="text-[10.5px] font-bold text-[#10b981]">Verified</span>
                                                </div>
                                            </div>
                                            {l.features?.length > 0 && (
                                                <div className="hidden sm:flex gap-[5px] flex-wrap">
                                                    {l.features.slice(0, 2).map((f: string) => (
                                                        <span key={f} className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-[#f1f5f9] text-[#475569] text-[10px] font-semibold">{f}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedListing(l); }} className="w-full bg-[#0f172a] rounded-full py-[11px] text-white font-bold text-[13px] mt-auto">View details</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!browseLoading && filteredListings.length > 0 && total > offset + PAGE_SIZE && (
                        <div className="flex justify-center pt-1">
                            <button onClick={() => fetchBrowse(offset + PAGE_SIZE)} className="flex items-center gap-2 bg-white border border-[#e9eaec] rounded-full px-7 py-3 text-[#0f172a] font-bold text-[13.5px]">
                                Load more listings ({Math.max(0, total - offset - PAGE_SIZE)} available)
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="hidden md:flex items-center justify-between">
                        <div>
                            <h2 className="font-['Inter_Tight',sans-serif] text-[22px] font-black text-[#0f172a] tracking-[-.02em]">My Listings</h2>
                            <p className="text-[13px] text-[#94a3b8] mt-[3px]">Manage your products, services and job posts</p>
                        </div>
                        <button onClick={openCreate} className="flex items-center gap-[7px] bg-[#10b981] rounded-full px-[22px] py-3 text-white font-bold text-sm shadow-[0_4px_14px_rgba(16,185,129,.28)]">
                            <Plus size={14} /> Add new listing
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard icon={<LayoutGrid size={16} />} iconBg="#eff6ff" iconColor="#2563eb" label="Active" value={String(myListings.length)} />
                        <StatCard icon={<Eye size={16} />} iconBg="#fffbeb" iconColor="#d97706" label="Views" value={String(totalViews)} />
                        <StatCard icon={<TrendingUp size={16} />} iconBg="#f0fdf4" iconColor="#16a34a" label="Avg. CTR" value={`${avgCTR.toFixed(1)}%`} />
                        <StatCard icon={<Star size={16} />} iconBg="#fdf4ff" iconColor="#9333ea" label="Avg. rating" value={avgRating > 0 ? avgRating.toFixed(1) : '—'} />
                    </div>

                    <div className="flex gap-[6px] overflow-x-auto no-scrollbar">
                        <FilterPill active={manageType === 'all'} onClick={() => setManageType('all')}>All</FilterPill>
                        <FilterPill active={manageType === 'product'} onClick={() => setManageType('product')}>Products</FilterPill>
                        <FilterPill active={manageType === 'service'} onClick={() => setManageType('service')}>Services</FilterPill>
                        <FilterPill active={manageType === 'job'} onClick={() => setManageType('job')}>Jobs</FilterPill>
                    </div>

                    <div className="bg-white border border-[#e9eaec] rounded-2xl overflow-hidden">
                        {manageLoading ? (
                            <div className="py-16 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-[#0f172a] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : myFilteredListings.length === 0 ? (
                            <div className="py-16 px-6 flex flex-col items-center gap-2 text-center">
                                <p className="text-sm font-bold text-[#0f172a]">No listings yet</p>
                                <p className="text-xs text-[#94a3b8]">Add your first product, service or job post.</p>
                                <button onClick={openCreate} className="bg-[#0f172a] rounded-full px-6 py-[11px] text-white font-bold text-[13px] mt-2">Create listing</button>
                            </div>
                        ) : (
                            myFilteredListings.map((l, idx) => {
                                const badge = typeBadgeFor(l);
                                const isActive = l.status === 'active';
                                return (
                                    <div key={l.id} className={`flex items-center gap-3 md:gap-[14px] px-4 md:px-5 py-[14px] cursor-pointer hover:bg-[#fafafa] transition-colors ${idx > 0 ? 'border-t border-[#f3f4f6]' : ''}`} onClick={() => setSelectedListing(l)}>
                                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-[13px] md:rounded-2xl overflow-hidden flex-shrink-0">
                                            <ListingImage listing={l} idx={idx} className="w-full h-full" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-[13.5px] font-extrabold text-[#0f172a] truncate">{l.title}</p>
                                                <span className={`inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-bold flex-shrink-0 ${isActive ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#f7f8f9] text-[#94a3b8]'}`}>{isActive ? 'Active' : 'Draft'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                                                <span className="hidden md:inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-bold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                                                <p className="font-['Inter_Tight',sans-serif] text-sm font-bold text-[#0f172a]">{fmtPrice(l.price, l.currency)}</p>
                                                <div className="flex items-center gap-1 text-[#94a3b8]">
                                                    <Eye size={11} />
                                                    <span className="text-[11px] font-semibold">{l.views_count || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-[7px] flex-shrink-0">
                                            <button onClick={(e) => { e.stopPropagation(); openEdit(l.id); }} className="h-8 md:h-[34px] px-3 rounded-lg border border-[#e9eaec] bg-white text-xs font-semibold text-[#64748b] flex items-center gap-1">
                                                <Edit2 size={12} /> <span className="hidden sm:inline">Edit</span>
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(l.id); }} className="h-8 w-8 md:h-[34px] md:w-[34px] rounded-lg border border-[#fecdd3] bg-[#fff1f2] flex items-center justify-center">
                                                <Trash2 size={13} className="text-[#e11d48]" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            <ListingDetailPanel listing={selectedListing} onClose={() => setSelectedListing(null)} />
            <CreateListingForm open={showForm} editId={editId} onClose={() => { setShowForm(false); setEditId(null); }} onSaved={handleSaved} />
        </div>
    );
}
