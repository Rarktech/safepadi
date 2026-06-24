"use client";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        close: () => void;
      };
    };
  }
}

import { useState, useEffect, useMemo, Suspense } from "react";
import { 
    ArrowLeft, 
    UploadCloud, 
    ShieldCheck, 
    CheckCircle2, 
    Loader2, 
    Search,
    ChevronDown,
    Calendar as CalendarIcon,
    MapPin,
    Building2,
    Globe,
    Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import axios from "axios";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import csc from 'countrycitystatejson';
import posthog from 'posthog-js';

interface Country {
    name: string;
    code: string;
    dial_code: string;
    emoji: string;
    flagUrl: string;
}


const API_URL = "/api";

// Configure axios for ngrok and other environments
axios.interceptors.request.use(config => {
    config.headers["ngrok-skip-browser-warning"] = "true";
    return config;
});

const inputClasses = "h-14 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold pl-4 pr-4 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all placeholder:font-medium placeholder:text-slate-400";
const labelClasses = "text-[10px] font-black text-emerald-600 uppercase tracking-widest pl-1 mb-2 block";
const btnClasses = "w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[20px] font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:shadow-none";

function KYCVerification() {
    const [safetag, setSafetag] = useState("");
    const [step, setStep] = useState(1);

    useEffect(() => {
        posthog.capture('kyc_form_step_viewed', { step_index: step });
    }, [step]);

    useEffect(() => {
        axios.get(`${API_URL}/auth/me`, { withCredentials: true })
            .then(res => { if (res.data?.safetag) setSafetag(res.data.safetag); })
            .catch(() => {});
    }, []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Data states
    const [countries, setCountries] = useState<Country[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<string[]>([]);

    // Form states
    const [phone, setPhone] = useState("");
    const [countryDial, setCountryDial] = useState({ name: "Nigeria", code: "NG", dial_code: "+234", emoji: "🇳🇬", flagUrl: "https://flagcdn.com/w40/ng.png" });
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [info, setInfo] = useState({ 
        firstName: "", 
        lastName: "", 
        dob: undefined as Date | undefined, 
        address: "",
        city: "",
        state: "",
        country: "Nigeria" 
    });
    const [docs, setDocs] = useState({ 
        country: "", 
        frontUrl: "", 
        backUrl: "",
        nin: "" 
    });

    // Fetch initial data
    useEffect(() => {
        axios.get("/Country.json").then(res => {
            let data = res.data;
            if (typeof data === "string") {
                try { data = JSON.parse(data); } catch { data = []; }
            }
            const enriched = (Array.isArray(data) ? data : []).map(c => ({
                ...c,
                flagUrl: `https://flagcdn.com/w40/${c.code.toLowerCase()}.png`
            }));
            setCountries(enriched);
            const defaultCountry = enriched.find(c => c.code === "NG") || enriched[0];
            if (defaultCountry) setCountryDial(defaultCountry);
        }).catch(() => {
            const fallback = { name: "Nigeria", code: "NG", dial_code: "+234", emoji: "🇳🇬", flagUrl: "https://flagcdn.com/w40/ng.png" };
            setCountries([fallback]);
            setCountryDial(fallback);
        });
    }, []);

    useEffect(() => {
        if (!safetag) return;
        axios.get(`${API_URL}/profiles/by_safetag/${encodeURIComponent(safetag)}`)
            .then(res => {
                setInfo(prev => ({ 
                    ...prev, 
                    firstName: res.data.first_name || '', 
                    lastName: res.data.last_name || '' 
                }));
            })
            .catch(console.error);
    }, [safetag]);

    useEffect(() => {
        const selectedCountry = countries.find(c => c.name === info.country);
        if (selectedCountry) {
            const countryStates = csc.getStatesByShort(selectedCountry.code);
            setStates(countryStates || []);
        } else if (info.country === "Nigeria") {
            const countryStates = csc.getStatesByShort("NG");
            setStates(countryStates || []);
        }
    }, [info.country, countries]);

    const handleOtpChange = (index: number, value: string) => {
        if (!/^[0-9]*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 3) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const submitKyc = async () => {
        setIsSubmitting(true);
        try {
            await axios.post(`${API_URL}/profiles/${encodeURIComponent(safetag)}/kyc/submit`, {
                firstName: info.firstName,
                lastName: info.lastName,
                phone: `${countryDial.dial_code}${phone}`,
                address: info.address,
                city: info.city,
                state: info.state,
                country: info.country,
                dob: info.dob ? format(info.dob, "yyyy-MM-dd") : "",
                documentCountry: docs.country,
                nin: docs.nin,
                frontUrl: docs.frontUrl,
                backUrl: docs.backUrl
            });
            posthog.capture('kyc_form_submitted', { id_type: docs.country === 'NG' ? 'nin' : 'document', country: docs.country });
            setStep(5);
        } catch (err) {
            console.error("KYC Submission error:", err);
            alert("Error submitting KYC. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderPhoneStep = () => (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <div className="space-y-3">
                <h1 className="text-3xl font-black text-[#020617] tracking-tighter">Phone Verification</h1>
                <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-[280px]">
                    Enter your phone number to receive a verification code.
                </p>
            </div>
            <div className="space-y-4 pt-4">
                <div>
                    <Label className={labelClasses}>Phone Number</Label>
                    <div className="flex gap-2">
                        <CountryPicker selected={countryDial} onSelect={setCountryDial} countries={countries} />
                        <Input type="tel" placeholder="800 000 0000" className={cn(inputClasses, "flex-1")} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
                    </div>
                </div>
            </div>
            <div className="pt-8">
                <Button className={btnClasses} onClick={() => setStep(2)} disabled={!phone || phone.length < 5}>Continue</Button>
            </div>
        </div>
    );

    const renderOtpStep = () => (
        <div className="space-y-8 animate-in slide-in-from-right duration-500 text-center">
             <div className="space-y-3">
                <h1 className="text-3xl font-black text-[#020617] tracking-tighter">Enter Code</h1>
                <p className="text-sm font-medium text-slate-500 leading-relaxed mx-auto max-w-[280px]">We sent a 4-digit code to <span className="font-bold text-slate-900">{countryDial.dial_code} {phone}</span></p>
            </div>
            <div className="flex justify-center gap-3 pt-6">
                {otp.map((digit, i) => (
                    <input key={i} id={`otp-${i}`} type="text" maxLength={1} className="w-14 h-16 text-center text-2xl font-black text-[#020617] bg-slate-50 border border-slate-200 rounded-[20px] focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm" value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} />
                ))}
            </div>
            <p className="text-xs font-bold text-slate-400 mt-6 cursor-pointer hover:text-emerald-600 transition-colors">Resend code</p>
            <div className="pt-8">
                <Button className={btnClasses} onClick={() => setStep(3)} disabled={otp.some(d => !d)}>Verify Code</Button>
            </div>
        </div>
    );

    const renderInfoStep = () => (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <div className="space-y-3">
                <h1 className="text-3xl font-black text-[#020617] tracking-tighter">Basic Information</h1>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">Ensure your details match your government ID.</p>
            </div>
            <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className={labelClasses}>First Name</Label>
                        <Input className={cn(inputClasses, "bg-slate-100 text-slate-500 cursor-not-allowed")} value={info.firstName} readOnly />
                    </div>
                    <div>
                        <Label className={labelClasses}>Last Name</Label>
                        <Input className={cn(inputClasses, "bg-slate-100 text-slate-500 cursor-not-allowed")} value={info.lastName} readOnly />
                    </div>
                </div>
                <div>
                    <Label className={labelClasses}>Date of Birth</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn(inputClasses, "w-full text-left font-bold justify-start", !info.dob && "text-slate-400")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {info.dob ? format(info.dob, "PPP") : "Select date of birth"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-none shadow-2xl bg-white" align="start">
                            <Calendar mode="single" selected={info.dob} onSelect={(d) => setInfo({ ...info, dob: d })} initialFocus fromYear={1930} toYear={new Date().getFullYear()} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="h-px w-full bg-slate-100 my-4" />
                <div>
                    <Label className={labelClasses}>Country of Residence</Label>
                    <CountryPicker selected={countries.find(c => c.name === info.country) || { name: "Nigeria", emoji: "🇳🇬", code: "NG", flagUrl: "https://flagcdn.com/w40/ng.png" }} onSelect={(c) => setInfo({ ...info, country: c.name, state: "", city: "" })} countries={countries} fullWidth />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <LocationSelect value={info.state} placeholder="State" options={states} onChange={(s: string) => { setInfo({ ...info, state: s, city: "" }); const sc = countries.find(c => c.name === info.country); if (sc) setCities(csc.getCities(sc.code, s) || []); }} />
                    <LocationSelect value={info.city} placeholder="City" options={cities} onChange={(c: string) => setInfo({ ...info, city: c })} disabled={!info.state} />
                </div>
                <div>
                    <Label className={labelClasses}>Street Address</Label>
                    <Input className={inputClasses} placeholder="House number and street name" value={info.address} onChange={e => setInfo({ ...info, address: e.target.value })} />
                </div>
            </div>
            <div className="pt-8">
                <Button className={btnClasses} onClick={() => setStep(4)} disabled={!info.dob || !info.address || !info.city || !info.state}>Continue</Button>
            </div>
        </div>
    );

    const renderDocsStep = () => (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <div className="space-y-3">
                <h1 className="text-3xl font-black text-[#020617] tracking-tighter">Document Upload</h1>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">Provide high-quality photos of your identification.</p>
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl mt-4 flex items-start gap-3 shadow-inner ring-1 ring-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 animate-pulse">
                        <Info className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 opacity-80">Tips for rapid review</p>
                        <div className="grid grid-cols-1 gap-1 text-[10px] font-bold text-slate-500 leading-tight">
                            <span>✅ Fill entire frame (all 4 corners)</span>
                            <span>✅ Text must be sharp & legible</span>
                            <span>❌ Avoid glare or shadow</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6 pt-2">
                 <div>
                    <Label className={labelClasses}>ID Issuing Country</Label>
                    <CountryPicker selected={countries.find(c => c.code === docs.country) || { name: "Select Country", emoji: "🌎" }} onSelect={(c) => setDocs({ ...docs, country: c.code, frontUrl: "", backUrl: "", nin: "" })} countries={countries} fullWidth />
                </div>

                {docs.country === 'NG' ? (
                     <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Label className={labelClasses}>National NIN</Label>
                        <Input type="text" maxLength={11} placeholder="Enter 11-digit NIN" className="h-16 text-lg tracking-widest font-black rounded-2xl bg-slate-50" value={docs.nin} onChange={e => setDocs({...docs, nin: e.target.value.replace(/\D/g, '')})} />
                        <div className="p-3 bg-emerald-50 rounded-2xl flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            <p className="text-[10px] font-bold text-emerald-800">Dial *346# to get your NIN easily.</p>
                        </div>
                    </div>
                ) : docs.country ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Label className={labelClasses}>Upload ID Card</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <DocUploader label="Front side" active={!!docs.frontUrl} url={docs.frontUrl} onUpload={(url: string) => setDocs({...docs, frontUrl: url})} />
                            <DocUploader label="Back side" active={!!docs.backUrl} url={docs.backUrl} onUpload={(url: string) => setDocs({...docs, backUrl: url})} />
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="pt-8">
                <Button className={btnClasses} onClick={submitKyc} disabled={isSubmitting || !docs.country || (docs.country === 'NG' ? docs.nin.length < 11 : (!docs.frontUrl || !docs.backUrl))}>
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Submit for Approval"}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white pb-12">
            <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-50 px-6 py-5 flex items-center justify-between border-b border-slate-50 relative">
                {step > 1 && step < 5 ? (
                    <button onClick={() => setStep(step - 1)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                ) : <div className="w-10" />}
                {step < 5 && (
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={cn("h-1.5 rounded-full transition-all duration-300", step >= i ? "w-6 bg-emerald-500" : "w-2 bg-slate-200")} />
                        ))}
                    </div>
                )}
                <div className="w-10" />
            </div>
            <div className="px-6 pt-6 max-w-lg mx-auto ph-no-capture">
                {step === 1 && renderPhoneStep()}
                {step === 2 && renderOtpStep()}
                {step === 3 && renderInfoStep()}
                {step === 4 && renderDocsStep()}
                {step === 5 && <SuccessView />}
            </div>
        </div>
    );
}

export default function KYCPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            </div>
        }>
            <KYCVerification />
        </Suspense>
    );
}

// Components
interface CountryPickerProps {
    selected: Partial<Country> & { name: string; emoji: string };
    onSelect: (country: Country) => void;
    countries: Country[];
    fullWidth?: boolean;
}

function CountryPicker({ selected, onSelect, countries, fullWidth }: CountryPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const filtered = (Array.isArray(countries) ? countries : []).filter((c) => 
        c.name?.toLowerCase().includes(search.toLowerCase()) || c.dial_code?.includes(search) || c.code?.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 50);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className={cn("h-14 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-4 cursor-pointer hover:border-emerald-500/50 transition-all", fullWidth ? "w-full" : "w-32")}>
                    {selected.flagUrl ? (
                        <img src={selected.flagUrl} alt={selected.code} className="w-6 h-4 mr-2 object-cover rounded-[2px] shadow-sm border border-slate-200" />
                    ) : <span className="text-lg mr-2 font-emoji">{selected.emoji}</span>}
                    <span className="text-sm font-bold truncate">{fullWidth ? selected.name : selected.dial_code}</span>
                    <ChevronDown className="w-4 h-4 ml-auto text-slate-400" />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 rounded-3xl border-none shadow-2xl bg-white overflow-hidden" align="start">
                <div className="p-3 border-b border-slate-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input placeholder="Search countries..." className="h-10 border-none bg-slate-50 pl-9 text-xs font-bold rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2 scrollbar-hide">
                    {filtered.map((c) => (
                        <div key={c.code} className="flex items-center gap-3 p-3 hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors" onClick={() => { onSelect(c); setOpen(false); }}>
                            {c.flagUrl ? (
                                <img src={c.flagUrl} alt={c.code} className="w-6 h-4 object-cover rounded-[2px] shadow-sm border border-slate-200" />
                            ) : <span className="text-xl font-emoji">{c.emoji}</span>}
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{c.name}</p>
                                <p className="text-[10px] font-medium text-slate-400">{c.dial_code}</p>
                            </div>
                            {selected.code === c.code && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}


interface LocationSelectProps {
    value: string;
    placeholder: string;
    options: any[];
    onChange: (val: string) => void;
    disabled?: boolean;
}

function LocationSelect({ value, placeholder, options, onChange, disabled }: LocationSelectProps) {
    return (
        <Popover>
            <PopoverTrigger asChild disabled={disabled}>
                <Button variant="outline" className={cn(inputClasses, "w-full justify-between font-bold", !value && "text-slate-400")}>{value || placeholder}<ChevronDown className="w-4 h-4 ml-2 text-slate-400" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2 rounded-2xl bg-white shadow-2xl overflow-hidden" align="start">
                <div className="max-h-60 overflow-y-auto space-y-1 p-1">
                    {options.length === 0 ? <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center py-8">No options available</p> : options.map((opt, idx: number) => {
                        const label = typeof opt === 'string' ? opt : opt.name;
                        return <div key={idx} className="p-3 text-sm font-bold text-slate-700 hover:bg-emerald-50 rounded-xl cursor-pointer" onClick={() => onChange(label)}>{label}</div>;
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}


interface DocUploaderProps {
    label: string;
    active: boolean;
    onUpload: (url: string) => void;
    url: string;
}

function DocUploader({ label, active, onUpload, url }: DocUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await axios.post(`${API_URL}/profiles/kyc/upload`, formData);
            onUpload(res.data.url);
        } catch {
            alert("Upload failed. Please try again.");
        } finally { setUploading(false); }
    };
    return (
        <label className={cn("aspect-[4/3] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden relative group", active ? "bg-emerald-50 border-emerald-500 text-emerald-600 shadow-xl shadow-emerald-500/10" : "bg-slate-50 border-slate-200 hover:border-emerald-300 text-slate-400")}>
            <input type="file" className="hidden" accept="image/*" onChange={handleFile} disabled={uploading} />
            {uploading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : active ? (
                <>
                    <img src={url} className="absolute inset-0 w-full h-full object-cover transition-opacity group-hover:opacity-40" alt="Preview" />
                    <CheckCircle2 className="w-8 h-8 relative z-10" />
                </>
            ) : <UploadCloud className="w-8 h-8" />}
            <span className="text-[10px] font-black uppercase tracking-widest relative z-10">{uploading ? "Uploading..." : label}</span>
        </label>
    );
}

function SuccessView() {
    return (
        <div className="flex flex-col min-h-[80vh] animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex-1 flex flex-col items-center justify-center space-y-12">
                <div className="w-48 h-64 bg-white rounded-[40px] shadow-2xl border-[6px] border-slate-900 overflow-hidden relative group">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-900 rounded-full z-20" />
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-700 flex flex-col pt-12 p-4">
                        <div className="flex justify-between items-start mb-6">
                           <div className="w-10 h-10 bg-white/20 rounded-lg backdrop-blur-md flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-white" /></div>
                           <div className="px-2 py-0.5 bg-white/10 rounded-full text-[8px] text-white/80 font-bold uppercase tracking-widest backdrop-blur-sm">Verified</div>
                        </div>
                        <div className="space-y-1 mb-8">
                             <div className="h-1.5 w-24 bg-white/20 rounded-full" />
                             <div className="h-1.5 w-16 bg-white/10 rounded-full" />
                        </div>
                        <div className="mt-auto flex justify-center pb-4 opacity-50"><div className="w-24 h-24 border-2 border-dashed border-white/30 rounded-full flex items-center justify-center"><div className="w-12 h-12 bg-white/10 rounded-2xl animate-pulse" /></div></div>
                    </div>
                </div>
                <div className="text-center space-y-4 px-4">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">KYC Application <br/>Under Review</h2>
                    <p className="text-base font-medium text-slate-400 leading-relaxed max-w-xs mx-auto">Securely present your identity with safeeely. Status of the application will be communicated later.</p>
                </div>
            </div>
            <div className="mt-auto space-y-8 pb-10">
                <div className="flex flex-col items-center space-y-2 opacity-60">
                     <div className="flex gap-1"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /></div>
                     <p className="text-[10px] text-slate-400 text-center px-8 leading-tight">Your identity information and additional verification information you submit will be used to review your safeeely account status.</p>
                </div>
                <div className="px-6">
                    <Button className="w-full h-16 bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-[24px] font-bold text-xl transition-all shadow-xl shadow-blue-500/20" onClick={() => window.Telegram?.WebApp?.close() || window.close()}>Close</Button>
                </div>
            </div>
        </div>
    );
}
