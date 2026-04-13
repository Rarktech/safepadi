"use client";

import Link from "next/link";
import { Star, ShieldCheck, MapPin, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useRef, useState } from "react";

interface ProductCardProps {
    id: string;
    logo: string;
    images?: string[];
    name: string;
    location: string;
    rating: number;
    reviews: number;
    price: string;
    category: string;
    solution: string;
    condition?: string;
    postedAt?: string;
    currency?: string;
}

export function ProductCard({ 
    id, 
    logo, 
    images = [],
    name, 
    location, 
    rating, 
    reviews, 
    price, 
    category, 
    solution, 
    condition = "New",
    postedAt = "Just now",
    currency = "USD"
}: ProductCardProps) {
    const isPrime = rating >= 4.5;
    
    // Mapping DB currency strings to their visual UI representations natively
    const formatCurrency = (curr: string) => {
        const markers: Record<string, string> = {
            'USD': '$',
            'NGN': '₦',
            'GBP': '£',
            'EUR': '€',
            'CAD': '$ ',
            'AUD': '$ ',
            'JPY': '¥',
            'CHF': 'Fr ',
            'CNY': '¥',
            'INR': '₹',
            'USDT': '₮',
            'USDC': '¢',
            'BTC': '₿',
            'ETH': 'Ξ',
            'SOL': '◎'
        };
        return markers[curr.toUpperCase()] || curr + ' ';
    };
    const scrollRef = useRef<HTMLDivElement>(null);
    const [currentImage, setCurrentImage] = useState(0);
    
    const displayImages = images.length > 0 ? images : [logo];

    const handleScroll = () => {
        if (scrollRef.current) {
            const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
            setCurrentImage(index);
        }
    };

    return (
        <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 group flex flex-col h-full w-full">
            {/* Image Header with Scroll */}
            <div className="p-4 pb-0 w-full">
                <div className="relative aspect-[16/11] w-full bg-slate-100 overflow-hidden rounded-[24px]">
                    <div 
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                    >
                        {displayImages.map((img, idx) => (
                            <div key={idx} className="w-full h-full flex-shrink-0 snap-center">
                                <img 
                                    src={img} 
                                    alt={`${name} - ${idx}`} 
                                    className="w-full h-full object-cover transition-all duration-700" 
                                />
                            </div>
                        ))}
                    </div>
                    
                    {/* Rating Overlay */}
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1 border border-white/20">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-black text-slate-900">{rating}</span>
                    </div>

                    {/* Prime Pick Badge */}
                    {isPrime && (
                        <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 border border-slate-50">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-[11px] font-bold text-slate-800">Prime Pick</span>
                        </div>
                    )}

                    {/* Pagination Indicators */}
                    {displayImages.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/20 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
                            {displayImages.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${currentImage === idx ? 'bg-white w-3' : 'bg-white/40'}`} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Card Content */}
            <div className="p-6 pt-5 flex flex-col flex-1">
                {/* Price */}
                <div className="flex flex-col items-end">
                    <span className="text-xl font-black text-slate-900 leading-tight">
                        {formatCurrency(currency)}{price}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Fixed Escrow</span>
                </div>

                {/* Title & Location */}
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1 mb-0.5 leading-snug">
                        {solution}
                    </h3>
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                        <MapPin className="w-3 h-3" />
                        <span>{location}</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-50 w-full mb-4" />

                {/* Features Row - Verified Seller Info Integrated */}
                <div className="grid grid-cols-2 gap-4 mb-6 relative">
                    {/* Condition Box */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <Box className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-900 leading-none mb-0.5">{condition}</span>
                            <span className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-wider">Condition</span>
                        </div>
                    </div>
                    
                    {/* Vertical Divider */}
                    <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-px h-8 bg-slate-50" />

                    {/* Seller Highlight Box */}
                    <div className="flex items-center gap-2.5 pl-2 overflow-hidden">
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1">
                                <span className="text-[11px] font-black text-slate-900 truncate">{name}</span>
                                <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{postedAt}</span>
                        </div>
                    </div>
                </div>

                {/* View Details Button (Row removed for zero redundancy) */}
                <Link href={`/marketplace/${id}`} className="mt-auto">
                    <Button className="w-full h-14 rounded-full bg-[#0a1128] hover:bg-black text-white font-black text-base shadow-xl shadow-slate-200 transition-all hover:scale-[1.01] active:scale-[0.98]">
                        View Details
                    </Button>
                </Link>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
