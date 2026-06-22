'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ImagePlus, X, ChevronLeft, ChevronRight, Globe, MapPin, Check } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
    ListingType, FeeHandling, ALL_CATEGORIES, SUB_CATS, COMMON_FEATURES,
    CURRENCIES, ORIGIN_COUNTRIES, DELIVERY_COUNTRIES,
} from './marketplace-data';

const MAX_PHOTOS = 6;

export function CreateListingForm({ open, onClose, editId, onSaved }: { open: boolean; onClose: () => void; editId?: string | null; onSaved: () => void }) {
    const [profileId, setProfileId] = useState('');
    const [type, setType] = useState<ListingType>('product');
    const [productType, setProductType] = useState<'physical' | 'digital'>('physical');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [photos, setPhotos] = useState<{ file?: File; url: string }[]>([]);
    const [currency, setCurrency] = useState('USD');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [locationType, setLocationType] = useState('Remote');
    const [employmentType, setEmploymentType] = useState('Full-time');
    const [originCountry, setOriginCountry] = useState('Nigeria');
    const [geoScope, setGeoScope] = useState<'GLOBAL' | 'RESTRICTED'>('GLOBAL');
    const [deliveryCountries, setDeliveryCountries] = useState<string[]>([]);
    const [feeHandling, setFeeHandling] = useState<FeeHandling>('split');
    const [features, setFeatures] = useState<string[]>([]);
    const [isHydrating, setIsHydrating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const isJob = type === 'job';

    useEffect(() => {
        api.get('/auth/me').then(r => { if (r.data?.sub) setProfileId(r.data.sub); }).catch(() => {});
    }, []);

    const resetForm = () => {
        setType('product'); setProductType('physical'); setTitle(''); setCategory(''); setSubCategory('');
        setPhotos([]); setCurrency('USD'); setPrice(''); setDescription('');
        setLocationType('Remote'); setEmploymentType('Full-time'); setOriginCountry('Nigeria');
        setGeoScope('GLOBAL'); setDeliveryCountries([]); setFeeHandling('split'); setFeatures([]);
    };

    useEffect(() => {
        if (!open) return;
        if (!editId) { resetForm(); return; }
        setIsHydrating(true);
        api.get(`/marketplace/${editId}`).then(({ data }) => {
            setType(data.category_type || 'product');
            setProductType(data.product_type || 'physical');
            setTitle(data.title || '');
            setCategory(data.tags?.[0] || '');
            setSubCategory(data.tags?.[1] || '');
            setPhotos((data.images || []).map((url: string) => ({ url })));
            setCurrency(data.currency || 'USD');
            setPrice(data.price != null ? String(data.price) : '');
            setDescription(data.description || '');
            setLocationType(data.location_type || 'Remote');
            setEmploymentType(data.employment_type || 'Full-time');
            setOriginCountry(data.origin_country || 'Nigeria');
            setGeoScope(data.geo_scope || 'GLOBAL');
            setDeliveryCountries(data.restricted_countries || []);
            setFeeHandling(data.fee_handling || 'split');
            setFeatures(data.features || []);
        }).catch(() => toast.error('Failed to load listing')).finally(() => setIsHydrating(false));
    }, [open, editId]);

    const handlePhotoFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - photos.length);
        const next = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
        setPhotos(p => [...p, ...next]);
        e.target.value = '';
    };
    const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx));
    const movePhoto = (idx: number, dir: -1 | 1) => setPhotos(p => {
        const next = [...p];
        const target = idx + dir;
        if (target < 0 || target >= next.length) return p;
        [next[idx], next[target]] = [next[target], next[idx]];
        return next;
    });

    const toggleFeature = (f: string) => setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
    const toggleDeliveryCountry = (c: string) => setDeliveryCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

    const handlePublish = async () => {
        if (!title.trim() || !price.trim()) {
            toast.error('Title and price are required');
            return;
        }
        setIsPublishing(true);
        try {
            const formData = new FormData();
            photos.forEach(p => { if (p.file) formData.append('images', p.file); });

            const payload = {
                profile_id: profileId,
                category_type: type,
                product_type: type === 'product' ? productType : 'physical',
                intent: type === 'job' ? 'hiring' : 'offering',
                title,
                description,
                price: parseFloat(price.replace(/,/g, '')) || 0,
                currency,
                fee_handling: feeHandling,
                features,
                tags: [category, subCategory].filter(Boolean),
                job_role: isJob ? title : null,
                location_type: isJob ? locationType : null,
                employment_type: isJob ? employmentType : null,
                origin_country: originCountry,
                geo_scope: geoScope,
                restricted_countries: geoScope === 'RESTRICTED' ? deliveryCountries : [],
            };
            formData.append('payload', JSON.stringify(payload));

            if (editId) {
                await api.put(`/marketplace/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Listing updated');
            } else {
                await api.post('/marketplace', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Listing published');
            }
            onSaved();
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.message || 'Failed to publish listing');
        } finally {
            setIsPublishing(false);
        }
    };

    const categories = ALL_CATEGORIES[type];
    const subCats = SUB_CATS[category] || [];
    const commonFeatures = COMMON_FEATURES[type];
    const publishLabel = isPublishing ? 'Publishing…' : editId ? 'Save changes' : 'Publish listing';

    return (
        <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <SheetContent side="right" className="w-full sm:max-w-[540px] p-0 flex flex-col gap-0 bg-white">
                <div className="px-6 py-5 border-b border-[#f1f5f9] flex-shrink-0">
                    <SheetTitle className="font-['Inter_Tight',sans-serif] text-[17px] font-extrabold text-[#0f172a] tracking-[-.01em]">{editId ? 'Edit listing' : 'Create new listing'}</SheetTitle>
                    <SheetDescription className="text-xs text-[#94a3b8] mt-[2px]">{editId ? 'Update your listing details' : 'Reach thousands of buyers on the Safeeely Marketplace'}</SheetDescription>
                </div>

                {isHydrating ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-[#0f172a] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto px-6 py-[22px] flex flex-col gap-[18px]">
                        {/* Listing type */}
                        <div>
                            <span className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">Listing type</span>
                            <div className="grid grid-cols-3 gap-2">
                                {(['product', 'service', 'job'] as ListingType[]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => { setType(t); setCategory(''); setSubCategory(''); setFeatures([]); }}
                                        className={`flex flex-col items-center gap-[6px] py-3 rounded-xl border text-[11.5px] font-bold capitalize transition-colors ${type === t ? 'border-[#10b981] bg-[#f0fdf4] text-[#0f172a]' : 'border-[#e9eaec] text-[#64748b] hover:border-[#cbd5e1]'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {type === 'product' && (
                            <div className="flex gap-2">
                                {(['physical', 'digital'] as const).map(pt => (
                                    <button key={pt} onClick={() => setProductType(pt)} className={`px-4 py-2 rounded-full text-xs font-bold border-2 ${productType === pt ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white border-[#e9eaec] text-[#64748b]'}`}>
                                        {pt === 'physical' ? '📦 Physical' : '💻 Digital'}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Title */}
                        <div>
                            <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">Title</label>
                            <input className="w-full bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-4 py-3 text-[13.5px] font-medium text-[#0f172a] outline-none focus:border-[#10b981] focus:bg-white transition-colors" placeholder={isJob ? 'e.g. Senior Frontend Engineer' : 'e.g. Professional UI/UX Design'} value={title} onChange={e => setTitle(e.target.value)} />
                        </div>

                        {/* Category + subcategory */}
                        <div className={`grid gap-[10px] ${subCats.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            <div>
                                <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">Category</label>
                                <select className="w-full bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-4 py-3 text-[13.5px] font-medium text-[#0f172a] outline-none focus:border-[#10b981] focus:bg-white transition-colors" value={category} onChange={e => { setCategory(e.target.value); setSubCategory(''); }}>
                                    <option value="">Select category…</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            {subCats.length > 0 && (
                                <div>
                                    <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">Subcategory</label>
                                    <select className="w-full bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-4 py-3 text-[13.5px] font-medium text-[#0f172a] outline-none focus:border-[#10b981] focus:bg-white transition-colors" value={subCategory} onChange={e => setSubCategory(e.target.value)}>
                                        <option value="">All subcategories</option>
                                        {subCats.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Photos */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em]">Photos</label>
                                <span className="text-[10.5px] text-[#94a3b8] font-medium">{photos.length} / {MAX_PHOTOS} photos · first photo is cover</span>
                            </div>
                            <label className="aspect-[3/1] sm:aspect-[5/1] rounded-[14px] border-2 border-dashed border-[#e9eaec] flex flex-col items-center justify-center gap-[6px] bg-[#fafafa] text-[#94a3b8] cursor-pointer hover:border-[#10b981] hover:bg-[#f0fdf4] hover:text-[#10b981] transition-colors">
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoFiles} disabled={photos.length >= MAX_PHOTOS} />
                                <ImagePlus size={20} />
                                <p className="text-[13px] font-bold">{photos.length === 0 ? 'Add photos' : 'Add more photos'}</p>
                                <p className="text-[11.5px]">Select multiple at once · JPG, PNG, WebP</p>
                            </label>
                            {photos.length > 0 && (
                                <div className="grid gap-2 mt-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))' }}>
                                    {photos.map((p, idx) => (
                                        <div key={p.url} className="relative aspect-square rounded-xl overflow-hidden bg-[#f1f5f9] group">
                                            <img src={p.url} className="w-full h-full object-cover" alt="" />
                                            {idx === 0 && <div className="absolute bottom-[5px] left-[5px] bg-[#0f172a] text-white text-[8.5px] font-extrabold px-[7px] py-[2px] rounded-full tracking-[.03em]">Cover</div>}
                                            <div className="absolute top-1 left-1 flex gap-[3px]">
                                                {idx > 0 && <button onClick={() => movePhoto(idx, -1)} className="w-[22px] h-[22px] rounded-md bg-black/55 flex items-center justify-center"><ChevronLeft size={11} className="text-white" /></button>}
                                                {idx < photos.length - 1 && <button onClick={() => movePhoto(idx, 1)} className="w-[22px] h-[22px] rounded-md bg-black/55 flex items-center justify-center"><ChevronRight size={11} className="text-white" /></button>}
                                            </div>
                                            <button onClick={() => removePhoto(idx)} className="absolute top-1 right-1 w-[22px] h-[22px] rounded-full bg-black/55 flex items-center justify-center"><X size={11} className="text-white" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Price + currency */}
                        <div className="grid grid-cols-[100px_1fr] gap-[10px]">
                            <div>
                                <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">Currency</label>
                                <select className="w-full bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-2 py-3 text-[13.5px] font-medium text-[#0f172a] outline-none focus:border-[#10b981] focus:bg-white transition-colors" value={currency} onChange={e => setCurrency(e.target.value)}>
                                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">{isJob ? 'Max budget / salary' : 'Price'}</label>
                                <input type="number" className="w-full bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-4 py-3 text-[13.5px] font-medium text-[#0f172a] outline-none focus:border-[#10b981] focus:bg-white transition-colors" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">Description</label>
                            <textarea className="w-full min-h-[110px] bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-4 py-3 text-[13.5px] font-medium text-[#0f172a] outline-none focus:border-[#10b981] focus:bg-white transition-colors leading-[1.6] resize-y" placeholder="Describe your listing in detail…" value={description} onChange={e => setDescription(e.target.value)} />
                        </div>

                        {/* Job-specific */}
                        {isJob && (
                            <div className="grid grid-cols-2 gap-[10px]">
                                <div>
                                    <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">Location type</label>
                                    <select className="w-full bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-4 py-3 text-[13.5px] font-medium text-[#0f172a] outline-none" value={locationType} onChange={e => setLocationType(e.target.value)}>
                                        {['Remote', 'On-site', 'Hybrid'].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">Employment type</label>
                                    <select className="w-full bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-4 py-3 text-[13.5px] font-medium text-[#0f172a] outline-none" value={employmentType} onChange={e => setEmploymentType(e.target.value)}>
                                        {['Full-time', 'Contract', 'Part-time', 'Freelance'].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Geo */}
                        <div>
                            <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">{isJob ? 'Work location' : type === 'service' ? 'Service area' : 'Delivery area'}</label>
                            <div className="flex gap-2 mb-3">
                                <button onClick={() => setGeoScope('GLOBAL')} className={`flex items-center gap-[6px] px-3 py-2 rounded-[10px] text-xs font-bold transition-colors ${geoScope === 'GLOBAL' ? 'bg-[#0f172a] text-white' : 'bg-white border border-[#e9eaec] text-[#64748b]'}`}>
                                    <Globe size={13} /> Worldwide
                                </button>
                                <button onClick={() => setGeoScope('RESTRICTED')} className={`flex items-center gap-[6px] px-3 py-2 rounded-[10px] text-xs font-bold transition-colors ${geoScope === 'RESTRICTED' ? 'bg-[#0f172a] text-white' : 'bg-white border border-[#e9eaec] text-[#64748b]'}`}>
                                    <MapPin size={13} /> Specific countries
                                </button>
                            </div>
                            <div className={`grid gap-[10px] ${geoScope === 'RESTRICTED' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                <div>
                                    <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">Your country (origin)</label>
                                    <select className="w-full bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-4 py-3 text-[13.5px] font-medium text-[#0f172a] outline-none" value={originCountry} onChange={e => setOriginCountry(e.target.value)}>
                                        {ORIGIN_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                                    </select>
                                </div>
                                {geoScope === 'RESTRICTED' && (
                                    <div>
                                        <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">Deliver / service to</label>
                                        <select className="w-full bg-[#f7f8f9] border border-[#e9eaec] rounded-[11px] px-4 py-3 text-[13.5px] font-medium text-[#0f172a] outline-none" value="" onChange={e => { if (e.target.value) toggleDeliveryCountry(e.target.value); }}>
                                            <option value="">+ Add a country…</option>
                                            {DELIVERY_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            {geoScope === 'RESTRICTED' && (
                                deliveryCountries.length > 0 ? (
                                    <div className="flex flex-wrap gap-[6px] mt-2">
                                        {deliveryCountries.map(c => (
                                            <div key={c} className="inline-flex items-center gap-[5px] bg-[#f1f5f9] border border-[#e2e8f0] rounded-full px-[10px] py-1">
                                                <span className="text-xs font-semibold text-[#0f172a]">{c}</span>
                                                <button onClick={() => toggleDeliveryCountry(c)} className="w-[14px] h-[14px] rounded-full bg-[#cbd5e1] flex items-center justify-center flex-shrink-0">
                                                    <X size={7} className="text-[#475569]" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-[#94a3b8] mt-[6px]">No countries added yet — select from the dropdown above.</p>
                                )
                            )}
                        </div>

                        {/* Fee handling */}
                        <div>
                            <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">Fee handling (5% platform fee)</label>
                            <div className="flex gap-2">
                                {(['seller', 'buyer', 'split'] as FeeHandling[]).map(h => (
                                    <button key={h} onClick={() => setFeeHandling(h)} className={`flex-1 py-2 rounded-[10px] text-xs font-bold border transition-colors ${feeHandling === h ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white border-[#e9eaec] text-[#64748b]'}`}>
                                        {h === 'seller' ? 'Seller pays' : h === 'buyer' ? 'Buyer pays' : 'Split 50/50'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Features */}
                        <div>
                            <label className="text-[11px] font-bold text-[#64748b] tracking-[.04em] mb-[7px] block">Features</label>
                            <div className="grid grid-cols-2 gap-[7px]">
                                {commonFeatures.map(f => {
                                    const selected = features.includes(f);
                                    return (
                                        <button key={f} onClick={() => toggleFeature(f)} className={`flex items-center gap-[7px] px-[14px] py-[9px] rounded-[10px] border-[1.5px] text-[12.5px] font-semibold text-left transition-colors ${selected ? 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]' : 'bg-[#f7f8f9] text-[#64748b] border-[#e9eaec]'}`}>
                                            {selected && <Check size={11} className="text-[#16a34a] flex-shrink-0" />}
                                            {f}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="px-6 pt-[14px] pb-5 border-t border-[#f1f5f9] flex-shrink-0 flex gap-[10px]">
                    <button onClick={onClose} className="flex-1 h-[46px] rounded-full border border-[#e9eaec] bg-[#f7f8f9] text-[#64748b] font-semibold text-sm">Cancel</button>
                    <button onClick={handlePublish} disabled={isPublishing} className="flex-[2] h-[46px] rounded-full bg-[#0f172a] text-white font-bold text-sm disabled:opacity-60">{publishLabel}</button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
