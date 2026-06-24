"use client";

import { useState, useEffect } from "react";
import { ProductCard } from "./ProductCard";
import { ProductSkeleton } from "./ProductSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import posthog from "posthog-js";

export function MarketplaceList() {
    const searchParams = useSearchParams();
    const typeParam = (searchParams?.get("type")?.toLowerCase() || "all") as 'all' | 'physical' | 'digital';
    const priceParam = searchParams?.get("price")?.toLowerCase();
    const ratingParam = searchParams?.get("rating");
    const intentParam = searchParams?.get("intent");
    const industryParam = searchParams?.get("industry")?.toLowerCase();
    const [liveListings, setLiveListings] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [activeCategory, setActiveCategory] = useState<'all' | 'physical'| 'digital'>(typeParam);

    const keywordQuery = searchParams?.get("q")?.toLowerCase() || "";
    const locationQuery = searchParams?.get("loc")?.toLowerCase() || "";
    const countryParam = searchParams?.get("c");
    
    const activeCountry = typeof window !== 'undefined' 
        ? (countryParam || localStorage.getItem('safepadi_user_country') || 'GLOBAL') 
        : 'GLOBAL';

    const fetchListings = async (offset = 0) => {
        if (offset === 0) setIsLoading(true);
        else setIsLoadingMore(true);

        try {
            const params = new URLSearchParams();
            if (keywordQuery) params.set('q', keywordQuery);
            if (locationQuery) params.set('loc', locationQuery);
            if (activeCountry !== 'GLOBAL') params.set('c', activeCountry);
            
            params.set('offset', offset.toString());
            params.set('limit', '9');
            
            const res = await fetch(`http://127.0.0.1:3000/api/marketplace?${params.toString()}`);
            if (!res.ok) {
                if (offset === 0) setLiveListings([]);
                return;
            }
            const data = await res.json();
            const sourceItems = data.listings || (Array.isArray(data) ? data : []);
            const newItems = sourceItems.filter((item: any) => item.category_type !== 'job');
            
            if (offset === 0) {
                setLiveListings(newItems);
            } else {
                setLiveListings(prev => [...(prev || []), ...newItems]);
            }
            setTotalCount(data.total || sourceItems.length || 0);
            if (offset === 0) {
                posthog.capture('marketplace_browsed', { result_count: newItems.length, category_filter: typeParam });
            }
        } catch (err) {
            console.error("Failed to fetch listings:", err);
            if (offset === 0) setLiveListings([]);
        } finally {
            if (offset === 0) {
                setTimeout(() => setIsLoading(false), 800);
            } else {
                setIsLoadingMore(false);
            }
        }
    };

    useEffect(() => {
        fetchListings(0);
    }, [keywordQuery, locationQuery, activeCountry]);

    if (isLoading) {
        return (
            <div className="w-full max-w-7xl mx-auto px-6 pb-20">
                <div className="flex items-center gap-3 mb-8 overflow-x-auto no-scrollbar pb-2">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-10 w-32 rounded-full" />
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <ProductSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (liveListings.length === 0) {
        return (
            <div className="w-full max-w-7xl mx-auto px-6 pb-20 flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-2xl mb-4 border border-slate-100">
                    <SearchX className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900">No listing available at the moment</h3>
                <p className="text-slate-500 font-medium mt-1">Try expanding your search criteria or location setting.</p>
            </div>
        );
    }

    const filteredListings = liveListings.filter(item => {
        // Category filtering (Local filter remains for tab switching, but fetch is optimized)
        if (activeCategory === 'physical' && item.category_type !== 'product') return false;
        if (activeCategory === 'digital' && item.category_type !== 'service') return false;
        
        // Extended UI Filters Native Processing
        if (intentParam && item.intent !== intentParam) return false;
        
        if (priceParam) {
            const priceVal = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
            if (priceParam === 'low' && priceVal >= 50) return false;
            if (priceParam === 'mid' && (priceVal < 50 || priceVal > 500)) return false;
            if (priceParam === 'high' && priceVal <= 500) return false;
        }

        if (ratingParam) {
            const ratingRequirement = parseInt(ratingParam);
            const userRating = item.profiles?.rating_score || 5; // Fallback mock value matching UI
            if (userRating < ratingRequirement) return false;
        }

        if (industryParam) {
            // Check if tags or features loosely contain the industry keyword conceptually
            const combinedFields = JSON.stringify(item.tags || []) + JSON.stringify(item.features || []) + (item.description || "");
            if (!combinedFields.toLowerCase().includes(industryParam)) return false;
        }

        return true;
    });

    const loadMore = () => fetchListings(liveListings.length);

    return (
        <div className="w-full max-w-7xl mx-auto px-6 pb-20 animate-in fade-in duration-700">
            {/* Category Tabs */}
            <div className="flex items-center gap-3 mb-8 overflow-x-auto no-scrollbar pb-2">
                {[
                    { id: 'all', label: 'All Products' },
                    { id: 'physical', label: 'Physical Products' },
                    { id: 'digital', label: 'Digital Products' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveCategory(tab.id as 'all'|'physical'|'digital')}
                        className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${activeCategory === tab.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {filteredListings.length === 0 ? (
                <div className="w-full py-20 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[24px]">
                    <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-xl mb-4">
                        <SearchX className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">No {activeCategory === 'physical' ? 'Physical Products' : activeCategory === 'digital' ? 'Digital Products' : 'Products'} Found</h3>
                    <p className="text-slate-500 font-medium text-center">There are no {activeCategory !== 'all' ? activeCategory + ' products' : 'items'} matching your criteria at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredListings.map((provider) => (
                    <ProductCard 
                        key={provider.id} 
                        id={provider.id as string}
                        name={provider.profiles?.safetag?.startsWith('@') ? provider.profiles.safetag : `@${provider.profiles?.safetag || 'unknown'}`}
                        logo={provider.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider.profiles?.safetag || provider.id}&backgroundColor=f1f5f9`}
                        images={provider.images && provider.images.length > 0 ? provider.images : ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80"]}
                        location={provider.origin_country || 'Worldwide'}
                        rating={5.0} // Mocking rating from profiles
                        reviews={provider.views_count || 0}
                        price={`${Number(provider.price || 0).toLocaleString()}`}
                        currency={provider.currency}
                        category={provider.product_type === 'digital' ? provider.product_type.toUpperCase() : provider.category_type.toUpperCase()}
                        solution={provider.title}
                        condition="New" // This field needs to be mapped later if condition tracking is added
                        postedAt={new Date(provider.created_at).toLocaleDateString()}
                    />
                ))}
                </div>
            )}
            
            {(totalCount > liveListings.length) && (
                <div className="flex justify-center mt-16">
                    <button 
                        onClick={loadMore}
                        disabled={isLoadingMore}
                        className="px-8 py-4 rounded-full bg-slate-100 text-sm font-black text-slate-500 hover:bg-slate-200 transition-all shadow-sm flex items-center gap-3"
                    >
                        {isLoadingMore ? (
                            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        ) : null}
                        Load More {activeCategory === 'physical' ? 'Products' : activeCategory === 'digital' ? 'Services' : 'Listings'} ({totalCount - liveListings.length} available)
                    </button>
                </div>
            )}
        </div>
    );
}
