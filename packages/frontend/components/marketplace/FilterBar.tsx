"use client";

import { ChevronDown, RefreshCw, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function FilterBar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const updateFilter = (key: string, value: string) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        
        if (key === 'clear') {
            const preservedType = current.get('type');
            const preservedLoc = current.get('loc');
            const preservedQ = current.get('q');
            
            const newParams = new URLSearchParams();
            if (preservedType) newParams.set('type', preservedType);
            if (preservedLoc) newParams.set('loc', preservedLoc);
            if (preservedQ) newParams.set('q', preservedQ);
            
            router.push(`${pathname}?${newParams.toString()}`);
            return;
        }

        if (!value) {
            current.delete(key);
        } else {
            current.set(key, value);
        }
        
        const search = current.toString();
        const query = search ? `?${search}` : "";
        router.push(`${pathname}${query}`);
    };
    
    return (
        <div className="w-full max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    
                    {/* Category Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-bold shadow-sm transition-all ${searchParams.get('intent') ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800' : 'bg-white border-slate-100 text-slate-700 hover:shadow-md hover:bg-slate-50'}`}>
                                {searchParams.get('intent') === 'hiring' ? 'Hiring (Looking to Buy)' : searchParams.get('intent') === 'offering' ? 'Offering (Looking to Sell)' : 'Category'}
                                <ChevronDown className={`w-4 h-4 ${searchParams.get('intent') ? 'text-slate-300' : 'text-slate-400'}`} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 rounded-2xl p-2 shadow-xl border-slate-100">
                            {searchParams.get('intent') && (
                                <DropdownMenuItem onClick={() => updateFilter('intent', '')} className="flex justify-between items-center px-3 py-2.5 rounded-xl cursor-pointer text-red-500 font-bold mb-1 hover:bg-red-50">
                                    Clear Category <X size={14} />
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => updateFilter('intent', 'hiring')} className="px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 font-bold hover:bg-slate-50">
                                Hiring (Looking to Buy)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('intent', 'offering')} className="px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 font-bold hover:bg-slate-50">
                                Offering (Looking to Sell)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Price Range Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-bold shadow-sm transition-all ${searchParams.get('price') ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800' : 'bg-white border-slate-100 text-slate-700 hover:shadow-md hover:bg-slate-50'}`}>
                                {searchParams.get('price') === 'low' ? 'Under $50' : searchParams.get('price') === 'mid' ? '$50 - $500' : searchParams.get('price') === 'high' ? 'Over $500' : 'Price Range'}
                                <ChevronDown className={`w-4 h-4 ${searchParams.get('price') ? 'text-slate-300' : 'text-slate-400'}`} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 rounded-2xl p-2 shadow-xl border-slate-100">
                            {searchParams.get('price') && (
                                <DropdownMenuItem onClick={() => updateFilter('price', '')} className="flex justify-between items-center px-3 py-2.5 rounded-xl cursor-pointer text-red-500 font-bold mb-1 hover:bg-red-50">
                                    Clear Price <X size={14} />
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => updateFilter('price', 'low')} className="px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 font-bold hover:bg-slate-50">Under $50</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('price', 'mid')} className="px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 font-bold hover:bg-slate-50">$50 - $500</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('price', 'high')} className="px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 font-bold hover:bg-slate-50">Over $500</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Industry Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-bold shadow-sm transition-all ${searchParams.get('industry') ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800' : 'bg-white border-slate-100 text-slate-700 hover:shadow-md hover:bg-slate-50'}`}>
                                {searchParams.get('industry') 
                                    ? searchParams.get('industry')?.charAt(0).toUpperCase() + searchParams.get('industry')!.slice(1) 
                                    : 'Industry'}
                                <ChevronDown className={`w-4 h-4 ${searchParams.get('industry') ? 'text-slate-300' : 'text-slate-400'}`} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 rounded-2xl p-2 shadow-xl border-slate-100">
                            {searchParams.get('industry') && (
                                <DropdownMenuItem onClick={() => updateFilter('industry', '')} className="flex justify-between items-center px-3 py-2.5 rounded-xl cursor-pointer text-red-500 font-bold mb-1 hover:bg-red-50">
                                    Clear Industry <X size={14} />
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => updateFilter('industry', 'tech')} className="px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 font-bold hover:bg-slate-50">Technology</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('industry', 'creative')} className="px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 font-bold hover:bg-slate-50">Creative Arts</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('industry', 'business')} className="px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 font-bold hover:bg-slate-50">Business Services</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('industry', 'lifestyle')} className="px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 font-bold hover:bg-slate-50">Lifestyle & Retail</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Ratings Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-bold shadow-sm transition-all ${searchParams.get('rating') ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800' : 'bg-white border-slate-100 text-slate-700 hover:shadow-md hover:bg-slate-50'}`}>
                                {searchParams.get('rating') === '5' ? '5 Stars Only' : searchParams.get('rating') ? `${searchParams.get('rating')}+ Stars` : 'Ratings'}
                                <ChevronDown className={`w-4 h-4 ${searchParams.get('rating') ? 'text-slate-300' : 'text-slate-400'}`} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 rounded-2xl p-2 shadow-xl border-slate-100">
                            {searchParams.get('rating') && (
                                <DropdownMenuItem onClick={() => updateFilter('rating', '')} className="flex justify-between items-center px-3 py-2.5 rounded-xl cursor-pointer text-red-500 font-bold mb-1 hover:bg-red-50">
                                    Clear Rating <X size={14} />
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => updateFilter('rating', '5')} className="px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 font-bold hover:bg-slate-50">
                                ⭐️⭐️⭐️⭐️⭐️ Only
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('rating', '4')} className="px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 font-bold hover:bg-slate-50">
                                ⭐️⭐️⭐️⭐️+ Stars
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('rating', '3')} className="px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 font-bold hover:bg-slate-50">
                                ⭐️⭐️⭐️+ Stars
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <button 
                        onClick={() => updateFilter('clear', '')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                <button onClick={() => updateFilter('clear', '')} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                    Clear All Filters
                </button>
            </div>
        </div>
    );
}
