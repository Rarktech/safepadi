"use client";

import React, { useState } from 'react';
import { 
    Plus, 
    X, 
    Star, 
    Briefcase, 
    ShoppingBag, 
    Wrench,
    CheckCircle2,
    DollarSign,
    Percent,
    ArrowRight,
    Search,
    ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type ListingType = 'product' | 'service' | 'job';
type FeeHandling = 'seller' | 'buyer' | 'split';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const ALL_CATEGORIES = [
    { label: "Electronics & Gadgets", group: "product" },
    { label: "Home & Garden", group: "product" },
    { label: "Fashion & Accessories", group: "product" },
    { label: "Vehicles & Parts", group: "product" },
    { label: "Real Estate", group: "product" },
    { label: "E-Books & Courses", group: "product" },
    { label: "Software & Assets", group: "product" },
    { label: "Software Development", group: "service" },
    { label: "Graphics & Design", group: "service" },
    { label: "Digital Marketing", group: "service" },
    { label: "Writing & Translation", group: "service" },
    { label: "Video & Animation", group: "service" },
    { label: "Consulting & Legal", group: "service" },
    { label: "Virtual Assistance", group: "service" },
    { label: "Engineering", group: "job" },
    { label: "Design", group: "job" },
    { label: "Sales", group: "job" },
    { label: "Customer Support", group: "job" },
];

const CURRENCIES = [
    { code: "USD", symbol: "$", type: "fiat" },
    { code: "NGN", symbol: "₦", type: "fiat" },
    { code: "GBP", symbol: "£", type: "fiat" },
    { code: "EUR", symbol: "€", type: "fiat" },
    { code: "CAD", symbol: "$", type: "fiat" },
    { code: "AUD", symbol: "$", type: "fiat" },
    { code: "JPY", symbol: "¥", type: "fiat" },
    { code: "CHF", symbol: "Fr", type: "fiat" },
    { code: "CNY", symbol: "¥", type: "fiat" },
    { code: "INR", symbol: "₹", type: "fiat" },
    { code: "USDT", symbol: "₮", type: "crypto" },
    { code: "USDC", symbol: "¢", type: "crypto" },
    { code: "BTC", symbol: "₿", type: "crypto" },
    { code: "ETH", symbol: "Ξ", type: "crypto" },
    { code: "SOL", symbol: "◎", type: "crypto" },
];

export function CreateListingForm({ onCancel, editId }: { onCancel: () => void; editId?: string | null }) {
    const [profileId, setProfileId] = useState<string>('');
    const [type, setType] = useState<ListingType>('product');
    const [productType, setProductType] = useState<'physical' | 'digital'>('physical');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [feeHandling, setFeeHandling] = useState<FeeHandling>('split');
    const [images, setImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [primaryIndex, setPrimaryIndex] = useState(0);
    const [features, setFeatures] = useState<string[]>([]);
    const [newFeature, setNewFeature] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [currencySearch, setCurrencySearch] = useState('');

    // Geolocation specific fields
    const [originCountry, setOriginCountry] = useState('Worldwide');
    const [geoScope, setGeoScope] = useState<'GLOBAL' | 'RESTRICTED'>('GLOBAL');
    const [restrictedCountries, setRestrictedCountries] = useState<string[]>([]);
    const [newCountry, setNewCountry] = useState('');

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Strip non-numeric and trailing chars except decimal mapping
        const rawValue = e.target.value.replace(/[^0-9.]/g, '');
        if (!rawValue) {
            setPrice('');
            return;
        }
        // Force commas
        const parts = rawValue.split('.');
        parts[0] = Number(parts[0]).toLocaleString();
        if (parts.length > 1) {
            parts[1] = parts[1].substring(0, 2);
            setPrice(parts.join('.'));
        } else {
            setPrice(parts[0]);
        }
    };

    // Job specific fields
    const [jobRole, setJobRole] = useState('');
    const [locationType, setLocationType] = useState('Remote');
    const [employmentType, setEmploymentType] = useState('Full-time');
    const [salaryRange, setSalaryRange] = useState('');

    const [isHydrating, setIsHydrating] = useState(!!editId);

    React.useEffect(() => {
        fetch(`${API_URL}/auth/me`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.sub) setProfileId(d.sub); })
            .catch(() => {});
    }, []);

    // Hydrate form if editing
    React.useEffect(() => {
        if (!editId) return;
        
        setIsHydrating(true);
        fetch(`${API_URL}/marketplace/${editId}`)
            .then(res => res.json())
            .then(data => {
                if (data.id) {
                    setType(data.category_type || 'product');
                    setProductType(data.product_type || 'physical');
                    setTitle(data.title || '');
                    setDescription(data.description || '');
                    setPrice(data.price?.toString() || '');
                    setCurrency(data.currency || 'USD');
                    setFeeHandling(data.fee_handling || 'split');
                    setFeatures(data.features || []);
                    
                    if (data.images && data.images.length > 0) {
                        setPreviewUrls(data.images);
                        // Cannot easily re-hydrate actual File objects from URLs safely 
                        // without making Blob fetches, so we'll just keep the previews.
                    }

                    setOriginCountry(data.origin_country || 'Worldwide');
                    setGeoScope(data.geo_scope || 'GLOBAL');
                    setRestrictedCountries(data.restricted_countries || []);

                    if (data.category_type === 'job') {
                        setJobRole(data.job_role || '');
                        setLocationType(data.location_type || 'Remote');
                        setEmploymentType(data.employment_type || 'Full-time');
                    }
                }
            })
            .catch(err => console.error("Failed to load existing listing:", err))
            .finally(() => setIsHydrating(false));
    }, [editId]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files).slice(0, 5 - images.length);
            setImages([...images, ...files]);
            
            // Create local preview URLs
            const newPreviews = files.map(f => URL.createObjectURL(f));
            setPreviewUrls([...previewUrls, ...newPreviews]);
        }
    };

    const removeImage = (idx: number) => {
        const newImages = images.filter((_, i) => i !== idx);
        const newPreviews = previewUrls.filter((_, i) => i !== idx);
        setImages(newImages);
        setPreviewUrls(newPreviews);
        if (primaryIndex >= newImages.length) setPrimaryIndex(0);
    };

    const [isPublishing, setIsPublishing] = useState(false);

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            const formData = new FormData();
            images.forEach((img) => formData.append('images', img));

            const safetag = window.location.pathname.split('/').pop();

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
                tags: newFeature ? [newFeature] : [], // Use newFeature as category temporarily mapping
                job_role: jobRole,
                location_type: locationType,
                employment_type: employmentType,
                origin_country: originCountry,
                geo_scope: geoScope,
                restricted_countries: restrictedCountries
            };

            formData.append('payload', JSON.stringify(payload));

            const targetUrl = editId
                ? `${API_URL}/marketplace/${editId}`
                : `${API_URL}/marketplace`;

            const res = await fetch(targetUrl, {
                method: editId ? 'PUT' : 'POST',
                body: formData
            });

            if (!res.ok) {
                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Upload failed');
                } else {
                    throw new Error(`Server returned an invalid response (Status ${res.status}). This usually means the Edit endpoint doesn't exist yet on the running server (A terminal restart is required!)`);
                }
            }
            onCancel(); // Close form on success
        } catch (err: any) {
            console.error('Failed to publish:', err.message || err);
            alert(`Failed to publish: ${err.message || 'Unknown error'}`);
        } finally {
            setIsPublishing(false);
        }
    };

    const toggleFeature = (f: string) => {
        if (features.includes(f)) {
            setFeatures(features.filter(item => item !== f));
        } else {
            setFeatures([...features, f]);
        }
    };

    const toggleRestrictedCountry = (c: string) => {
        if (restrictedCountries.includes(c)) {
            setRestrictedCountries(restrictedCountries.filter(item => item !== c));
        } else {
            setRestrictedCountries([...restrictedCountries, c]);
        }
    };

    const commonFeatures = type === 'product' ? [
        'Brand New', 'Original Packaging', 'Warranty Included', 'Free Shipping'
    ] : type === 'service' ? [
        'Fast Delivery', 'Revisions Included', 'Professional Support', 'Custom Solution'
    ] : [
        'Remote OK', 'Benefits Included', 'Stock Options', 'Relocation Support'
    ];

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {isHydrating && (
                <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{editId ? 'Edit Listing' : 'Create New Listing'}</h1>
                    <p className="text-slate-500 font-medium">{editId ? 'Update your listing details' : 'Reach thousands of buyers on the Safeeely Marketplace'}</p>
                </div>
                <Button variant="ghost" className="font-bold text-slate-500 hover:text-rose-500" onClick={onCancel}>
                    Cancel
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {(['product', 'service', 'job'] as ListingType[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-4 ${type === t ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${type === t ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-400'}`}>
                            {t === 'product' ? <ShoppingBag size={24} /> : t === 'service' ? <Wrench size={24} /> : <Briefcase size={24} />}
                        </div>
                        <span className="font-black text-slate-900 capitalize uppercase tracking-widest text-xs">{t}</span>
                    </button>
                ))}
            </div>

            {type === 'product' && (
                <div className="flex gap-4 justify-center mb-10">
                    <button 
                        onClick={() => setProductType('physical')}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all border-2 ${productType === 'physical' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                    >
                        📦 Physical Product
                    </button>
                    <button 
                        onClick={() => setProductType('digital')}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all border-2 ${productType === 'digital' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                    >
                        💻 Digital Product
                    </button>
                </div>
            )}
            
            {type !== 'product' && <div className="mb-10" />}

            <div className="space-y-8 bg-white p-8 md:p-12 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
                {/* Image Section */}
                <section className="space-y-6">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        Images <span className="text-slate-300 font-bold ml-1">({images.length}/5)</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {previewUrls.map((url, idx) => (
                            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border-2 border-slate-50">
                                <img src={url} className="w-full h-full object-cover" alt={`Upload preview ${idx}`} />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <button 
                                        onClick={() => setPrimaryIndex(idx)}
                                        className={`p-2 rounded-full transition-colors ${primaryIndex === idx ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white hover:bg-emerald-500'}`}
                                    >
                                        <Star size={16} className={primaryIndex === idx ? 'fill-current' : ''} />
                                    </button>
                                    <button 
                                        onClick={() => removeImage(idx)}
                                        className="p-2 rounded-full bg-white/20 text-white hover:bg-rose-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                {primaryIndex === idx && (
                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500 text-[8px] font-black text-white rounded-full uppercase tracking-widest">
                                        Primary
                                    </div>
                                )}
                            </div>
                        ))}
                        {images.length < 5 && (
                            <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-500 transition-all cursor-pointer">
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageSelect} />
                                <Plus size={24} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Add Image</span>
                            </label>
                        )}
                    </div>
                </section>

                {/* Basic Info Section */}
                <section className="space-y-6 pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">General Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Listing Title</label>
                            <Input 
                                placeholder={type === 'job' ? 'e.g. Senior Frontend Engineer' : 'e.g. Professional UI/UX Design'} 
                                className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white transition-all text-base font-medium"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Industry Category</label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-full flex items-center justify-between h-14 rounded-2xl bg-slate-50 border border-transparent focus:bg-white focus:border-slate-200 outline-none px-4 transition-all text-base font-medium text-slate-600">
                                        {newFeature || "Select a specific category..."}
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[300px] rounded-2xl p-2 shadow-xl border-slate-100">
                                    <div className="px-2 pb-2">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <Input 
                                                placeholder="Search categories..." 
                                                value={categorySearch}
                                                onChange={(e) => setCategorySearch(e.target.value)}
                                                className="h-9 pl-8 bg-slate-50 border-transparent focus:bg-white text-xs rounded-xl"
                                                onClick={(e) => e.stopPropagation()} // Prevent closing dropdown on input focus
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[250px] overflow-y-auto no-scrollbar pb-1">
                                        {ALL_CATEGORIES
                                            .filter(c => c.group === type)
                                            .filter(c => c.label.toLowerCase().includes(categorySearch.toLowerCase()))
                                            .length === 0 ? (
                                            <div className="text-xs text-center py-4 text-slate-400 font-medium">No category found</div>
                                        ) : (
                                            ALL_CATEGORIES
                                                .filter(c => c.group === type)
                                                .filter(c => c.label.toLowerCase().includes(categorySearch.toLowerCase()))
                                                .map((c) => (
                                                <DropdownMenuItem 
                                                    key={c.label}
                                                    onClick={() => setNewFeature(c.label)}
                                                    className={`flex justify-between items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all ${newFeature === c.label ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                                                >
                                                    {c.label}
                                                    {newFeature === c.label && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                                                </DropdownMenuItem>
                                            ))
                                        )}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </section>

                <section className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{type === 'job' ? 'Max Budget / Salary' : 'Price'}</label>
                    <div className="relative flex items-center">
                        <div className="absolute left-1 top-1 bottom-1 w-24">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-full h-full bg-slate-100 rounded-xl px-3 outline-none text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-between">
                                        {currency} <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[200px] rounded-2xl p-2 shadow-xl border-slate-100">
                                    <div className="px-2 pb-2">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <Input 
                                                placeholder="Search currency..." 
                                                value={currencySearch}
                                                onChange={(e) => setCurrencySearch(e.target.value)}
                                                className="h-9 pl-8 bg-slate-50 border-transparent focus:bg-white text-xs rounded-xl"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto no-scrollbar pb-1">
                                        {CURRENCIES.filter(c => c.code.toLowerCase().includes(currencySearch.toLowerCase())).length === 0 ? (
                                            <div className="text-xs text-center py-4 text-slate-400 font-medium">No currency found</div>
                                        ) : (
                                            CURRENCIES.filter(c => c.code.toLowerCase().includes(currencySearch.toLowerCase())).map((c) => (
                                                <DropdownMenuItem 
                                                    key={c.code}
                                                    onClick={() => setCurrency(c.code)}
                                                    className={`flex justify-between items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all ${currency === c.code ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <span className={c.type === 'crypto' ? "text-amber-500 font-black" : "text-slate-400"}>{c.symbol}</span> 
                                                        {c.code}
                                                    </span>
                                                    {currency === c.code && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                                                </DropdownMenuItem>
                                            ))
                                        )}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <Input 
                            value={price} 
                            onChange={handlePriceChange}
                            placeholder="0.00"
                            className="h-14 rounded-2xl border-slate-100 pl-28 font-bold text-base text-slate-900 focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                    </div>
                </section>

                {type === 'job' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location Type</label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-full h-14 bg-slate-50 border border-transparent rounded-2xl px-4 outline-none text-base font-medium text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-between">
                                        {locationType} <ChevronDown className="w-5 h-5 text-slate-400" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-full min-w-[250px] rounded-2xl p-2 shadow-xl border-slate-100">
                                    {['Remote', 'On-site', 'Hybrid'].map(loc => (
                                        <DropdownMenuItem 
                                            key={loc}
                                            onClick={() => setLocationType(loc)}
                                            className={`flex justify-between items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all ${locationType === loc ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                                        >
                                            {loc}
                                            {locationType === loc && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </section>
                        <section className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employment Type</label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-full h-14 bg-slate-50 border border-transparent rounded-2xl px-4 outline-none text-base font-medium text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-between">
                                        {employmentType} <ChevronDown className="w-5 h-5 text-slate-400" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-full min-w-[250px] rounded-2xl p-2 shadow-xl border-slate-100">
                                    {['Full-time', 'Contract', 'Part-time', 'Freelance'].map(emp => (
                                        <DropdownMenuItem 
                                            key={emp}
                                            onClick={() => setEmploymentType(emp)}
                                            className={`flex justify-between items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all ${employmentType === emp ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                                        >
                                            {emp}
                                            {employmentType === emp && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </section>
                    </div>
                )}

                <section className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                    <Textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Provide deep details about your listing..."
                        className="min-h-[150px] rounded-2xl border-slate-100 font-medium text-slate-600 focus:border-emerald-500 focus:ring-emerald-500/20 p-5 leading-relaxed"
                    />
                </section>

                {/* Geolocation Section */}
                <section className="p-8 bg-blue-50/50 rounded-[32px] border border-blue-100/50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Search size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">Geographical Targeting</h3>
                            <p className="text-xs text-slate-500 font-medium">Control who can view and interact with {type === 'job' ? 'this role' : 'this offering'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Listing Origin (Where are you based?)</label>
                            <select 
                                value={originCountry}
                                onChange={(e) => setOriginCountry(e.target.value)}
                                className="w-full h-14 rounded-2xl border border-slate-200 px-4 font-bold text-slate-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option>Worldwide</option>
                                <option>United States</option>
                                <option>United Kingdom</option>
                                <option>Nigeria</option>
                                <option>India</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Audience Scope</label>
                            <select 
                                value={geoScope}
                                onChange={(e) => setGeoScope(e.target.value as 'GLOBAL' | 'RESTRICTED')}
                                className="w-full h-14 rounded-2xl border border-slate-200 px-4 font-bold text-slate-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="GLOBAL">Available Worldwide</option>
                                <option value="RESTRICTED">Restrict to Specific Regions</option>
                            </select>
                        </div>
                    </div>

                    {geoScope === 'RESTRICTED' && (
                        <div className="space-y-4 pt-4 border-t border-slate-200/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Allowed Regions</h3>
                                <div className="flex gap-2">
                                    <Input 
                                        value={newCountry}
                                        onChange={(e) => setNewCountry(e.target.value)}
                                        placeholder="Add country code (e.g. US, NG)"
                                        className="h-10 rounded-xl border-slate-200 bg-white"
                                    />
                                    <Button 
                                        size="sm" 
                                        className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                        onClick={() => { if(newCountry) { toggleRestrictedCountry(newCountry.toUpperCase()); setNewCountry(""); } }}
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {restrictedCountries.length === 0 ? (
                                    <span className="text-xs text-slate-400 font-medium italic">No regions added. Currently restricting everyone.</span>
                                ) : (
                                    restrictedCountries.map((c) => (
                                        <div 
                                            key={c} 
                                            onClick={() => toggleRestrictedCountry(c)}
                                            className="flex items-center gap-2 bg-blue-100 text-blue-700 hover:bg-rose-100 hover:text-rose-600 hover:border-rose-200 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-black tracking-wider cursor-pointer transition-colors"
                                        >
                                            {c} <X size={12} />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* Fee Handling Section */}
                <section className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                            <Percent size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">Marketplace Fee (5%)</h3>
                            <p className="text-xs text-slate-500 font-medium">Choose how the Safeeely transaction fee is handled</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(['seller', 'buyer', 'split'] as FeeHandling[]).map((h) => (
                            <button
                                key={h}
                                onClick={() => setFeeHandling(h)}
                                className={`px-6 py-4 rounded-xl border-2 font-bold text-sm transition-all ${feeHandling === h ? 'border-emerald-500 bg-white text-emerald-600 shadow-sm' : 'border-slate-200 bg-transparent text-slate-400 hover:border-slate-300'}`}
                            >
                                {h === 'seller' ? 'Seller Pays All' : h === 'buyer' ? 'Buyer Pays All' : 'Split 50/50'}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Select Features</h3>
                        <div className="flex gap-2">
                            <Input 
                                value={newFeature}
                                onChange={(e) => setNewFeature(e.target.value)}
                                placeholder="Custom feature..."
                                className="h-10 rounded-xl border-slate-100"
                            />
                            <Button 
                                size="sm" 
                                className="h-10 rounded-xl bg-slate-900 text-white font-bold"
                                onClick={() => { if(newFeature) { setFeatures([...features, newFeature]); setNewFeature(""); } }}
                            >
                                Add
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {commonFeatures.concat(features.filter(f => !commonFeatures.includes(f))).map((f) => (
                            <div 
                                key={f} 
                                onClick={() => toggleFeature(f)}
                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${features.includes(f) ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-50 bg-slate-50/30'}`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${features.includes(f) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 bg-white'}`}>
                                    {features.includes(f) && <CheckCircle2 size={14} />}
                                </div>
                                <span className="font-bold text-slate-700 text-sm italic">{f}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="pt-8 border-t border-slate-100 flex justify-end gap-4">
                    <Button 
                        variant="ghost" 
                        className="h-14 px-8 rounded-2xl font-black text-slate-400 hover:text-rose-500"
                        onClick={onCancel}
                    >
                        Save Draft
                    </Button>
                    <Button 
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="h-14 px-10 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-lg shadow-xl shadow-slate-200 flex items-center gap-3"
                    >
                        {isPublishing ? 'Publishing...' : 'Publish Listing'} <ArrowRight size={20} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
