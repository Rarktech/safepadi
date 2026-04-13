"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Globe, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ALL_COUNTRIES } from "@/lib/countries";
import { Input } from "@/components/ui/input";

// Use the comprehensive external list and sort it alphabetically
const COUNTRIES = [...ALL_COUNTRIES].sort((a, b) => {
    if (a.code === 'GLOBAL') return -1;
    if (b.code === 'GLOBAL') return 1;
    return a.name.localeCompare(b.name);
});

export function MarketplaceHero() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Initialize state from URL params
    const [keyword, setKeyword] = useState(searchParams?.get("q") || "");
    const [locationInput, setLocationInput] = useState(searchParams?.get("loc") || "");
    
    // Global Country State (Auto-select simulation)
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [isClient, setIsClient] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');

    useEffect(() => {
        setIsClient(true);
        // Simulate auto-detecting IP-based location on first load.
        // In a real app we'd fetch from an IP-API or Next.js edge request headers
        const savedCountry = localStorage.getItem('safepadi_user_country');
        const urlCountry = searchParams?.get('c');

        if (urlCountry) {
            const found = COUNTRIES.find(c => c.code === urlCountry);
            if (found) setSelectedCountry(found);
        } else if (savedCountry) {
            const found = COUNTRIES.find(c => c.code === savedCountry);
            if (found) setSelectedCountry(found);
        } else {
            // Simulated auto-detect hitting Nigerian IP
            const autoDetected = COUNTRIES.find(c => c.code === 'NG');
            if (autoDetected) {
                setSelectedCountry(autoDetected);
                localStorage.setItem('safepadi_user_country', 'NG');
            }
        }
    }, [searchParams]);

    const handleCountryChange = (country: typeof COUNTRIES[0]) => {
        setSelectedCountry(country);
        localStorage.setItem('safepadi_user_country', country.code);
        triggerSearch(keyword, locationInput, country.code);
    };

    const triggerSearch = (q = keyword, loc = locationInput, countryCode = selectedCountry.code) => {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (loc.trim()) params.set("loc", loc.trim());
        if (countryCode && countryCode !== 'GLOBAL') params.set("c", countryCode);
        
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        triggerSearch();
    };

    const filteredCountries = COUNTRIES.filter(c => 
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
    );

    return (
        <section className="relative w-full py-20 px-6 flex flex-col items-center justify-center overflow-hidden bg-white">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-emerald-100 blur-[100px] rounded-full" />
                <div className="absolute bottom-[10%] right-[5%] w-64 h-64 bg-emerald-100 blur-[100px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-4xl w-full text-center">
                
                {/* Global Country Matcher */}
                {isClient && (
                    <div className="flex justify-center mb-6">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm">
                                    <Globe size={14} className="text-slate-400" />
                                    <span className="flex items-center gap-2">
                                        Browsing in: 
                                        {selectedCountry.code === 'GLOBAL' ? (
                                            <span className="text-base">🌍</span>
                                        ) : (
                                            <img src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`} alt="flag" className="w-5 h-3.5 object-cover rounded-[2px]" />
                                        )}
                                        {selectedCountry.name}
                                    </span>
                                    <ChevronDown size={14} className="text-slate-400 ml-1" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-64 rounded-2xl p-2 shadow-xl border-slate-100">
                                <div className="px-2 pb-2">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <Input 
                                            placeholder="Search country..." 
                                            value={countrySearch}
                                            onChange={(e) => setCountrySearch(e.target.value)}
                                            className="h-9 pl-8 bg-slate-50 border-transparent focus:bg-white text-xs rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-2 border-t border-slate-50 mt-1">Select Region</div>
                                <div className="max-h-[250px] overflow-y-auto no-scrollbar pb-1">
                                    {filteredCountries.length === 0 ? (
                                        <div className="text-xs text-center py-4 text-slate-400 font-medium">No countries found</div>
                                    ) : filteredCountries.map(country => (
                                        <DropdownMenuItem 
                                            key={country.code}
                                            onClick={() => handleCountryChange(country)}
                                            className={`flex justify-between items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selectedCountry.code === country.code ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <span className="flex items-center gap-3 text-sm font-bold">
                                                {country.code === 'GLOBAL' ? (
                                                    <span className="text-base leading-none">🌍</span>
                                                ) : (
                                                    <img src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`} alt="flag" className="w-6 h-4 object-cover rounded shadow-sm" />
                                                )}
                                                {country.name}
                                            </span>
                                            {selectedCountry.code === country.code && (
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}

                <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-8 tracking-tight">
                    Find Safe <span className="text-emerald-500 underline decoration-emerald-200 decoration-8 underline-offset-4">Providers</span>
                </h1>

                {/* Search Bar Container */}
                <form 
                    onSubmit={handleFormSubmit}
                    className="flex flex-col md:flex-row items-center bg-white border border-slate-200 shadow-2xl shadow-slate-200/50 rounded-[24px] p-2 gap-2 md:gap-0"
                >
                    <div className="flex-1 flex items-center px-4 w-full border-b md:border-b-0 md:border-r border-slate-100">
                        <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                        <input 
                            type="text" 
                            name="search_query"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Find tech, design, goods, or any category..." 
                            className="w-full py-4 bg-transparent outline-none text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                        />
                    </div>
                    <div className="flex-1 flex items-center px-4 w-full">
                        <MapPin className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                        <input 
                            type="text" 
                            name="location_query"
                            value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            placeholder="Specific city, state, or zip..." 
                            className="w-full py-4 bg-transparent outline-none text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                        />
                    </div>
                    <Button type="submit" className="w-full md:w-auto h-14 px-8 rounded-[18px] bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-md">
                        Find Provider
                    </Button>
                </form>
            </div>
        </section>
    );
}
