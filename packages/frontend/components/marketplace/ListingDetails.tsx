"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Star, 
    ShieldCheck, 
    Share2, 
    ChevronRight, 
    AlertTriangle,
    CheckCircle2,
    Heart
} from 'lucide-react';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/home/Footer";
import { Button } from "@/components/ui/button";
import { TrustScore } from "@/components/withdraw/DashboardSections";
import { Card, CardContent } from "@/components/ui/card";

interface ListingDetailsProps {
    id: string;
    productData: any;
}

export function ListingDetails({ id, productData }: ListingDetailsProps) {
    const router = useRouter();
    const [activeImage, setActiveImage] = useState(0);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const listing = productData || {
        id: id,
        title: "Loading...",
        price: "$0.00",
        location: "Unknown",
        category: "Default",
        condition: "New",
        description: "Premium & comfortable experience with a strong structure built with durability in mind. This state-of-the-art solution offers both aesthetic appeal and high-performance functionality. It is designed to meet the highest standards of quality and user satisfaction across all environments.",
        images: ["/placeholder.png"],
        seller: { id: "1", safetag: "safepadi_seller", trustScore: 0, totalTrades: 0, reviews: [] },
        features: []
    };

    // Mapping DB currency strings to their visual UI representations natively
    const formatCurrency = (curr: string) => {
        if (!curr) return '$';
        const markers: Record<string, string> = {
            'USD': '$', 'NGN': '₦', 'GBP': '£', 'EUR': '€', 'CAD': '$ ', 'AUD': '$ ', 'JPY': '¥', 'CHF': 'Fr ', 'CNY': '¥', 'INR': '₹',
            'USDT': '₮', 'USDC': '¢', 'BTC': '₿', 'ETH': 'Ξ', 'SOL': '◎'
        };
        return markers[curr.toUpperCase()] || curr + ' ';
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: listing.title,
                    text: listing.description,
                    url: window.location.href,
                });
            } catch (err) {
                console.log("Error sharing:", err);
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
        }
    };

    const fullDescription = listing.description;
    const shortDescription = fullDescription.slice(0, 150) + "...";

    return (
        <main className="min-h-screen bg-white">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 pt-32 pb-20">
                {/* Side-by-Side Product Header */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16 md:mb-24">
                    
                    {/* Left Column: Image Gallery */}
                    <div className="space-y-6">
                        <div className="relative aspect-square w-full bg-slate-50 overflow-hidden rounded-[32px] md:rounded-[40px] border border-slate-100">
                            <img 
                                src={listing.images[activeImage]} 
                                className="w-full h-full object-cover transition-all duration-700" 
                                alt="Listing Featured" 
                            />
                            {/* Favorite Button Overlay */}
                            <button className="absolute top-6 md:top-8 right-6 md:right-8 w-11 md:w-12 h-11 md:h-12 rounded-full bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all border border-white/20">
                                <Heart size={20} />
                            </button>
                        </div>

                        {/* Thumbnail Strip */}
                        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar snap-x">
                            {listing.images.map((img: string, idx: number) => (
                                <div 
                                    key={idx} 
                                    className={`relative flex-shrink-0 w-20 md:w-24 h-20 md:h-24 cursor-pointer overflow-hidden rounded-[16px] md:rounded-[20px] border-2 transition-all snap-start ${activeImage === idx ? 'border-emerald-500' : 'border-slate-100'}`}
                                    onClick={() => setActiveImage(idx)}
                                >
                                    <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Product Info */}
                    <div className="flex flex-col">
                        {/* Breadcrumbs & Actions */}
                        <div className="flex items-center justify-between mb-6 md:mb-8">
                            <nav className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                <span className="cursor-pointer hover:text-emerald-500" onClick={() => router.push('/')}>Home</span>
                                <ChevronRight size={12} />
                                <span className="cursor-pointer hover:text-emerald-500" onClick={() => router.push('/marketplace')}>Category</span>
                                <ChevronRight size={12} />
                                <span className="text-slate-900 truncate max-w-[100px] md:max-w-[150px]">{listing.title}</span>
                            </nav>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={handleShare}
                                    className="text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-full hover:bg-slate-50"
                                >
                                    <Share2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Title & Rating */}
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-4">
                            {listing.title}
                        </h1>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="flex items-center gap-1 text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={18} className="fill-current" />
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900">4.7</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-sm font-bold text-slate-400 underline cursor-pointer">2.6k Reviews</span>
                            </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-4 mb-8 md:mb-10">
                            <span className="text-3xl font-black text-slate-900">{formatCurrency(listing.currency)}{listing.price}</span>
                            <span className="text-xl font-bold text-slate-300 line-through">{formatCurrency(listing.currency)}0.00</span>
                        </div>

                        {/* Description Section */}
                        <div className="mb-8 md:mb-10">
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-3">Description</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">
                                {isDescriptionExpanded ? fullDescription : shortDescription}
                                <span 
                                    className="ml-2 text-slate-900 font-black cursor-pointer hover:underline"
                                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                >
                                    {isDescriptionExpanded ? "Show Less" : "Read More..."}
                                </span>
                            </p>
                        </div>

                        {/* CTAs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
                            <Button 
                                className="h-16 rounded-[20px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-2xl shadow-emerald-500/20 transition-all"
                                onClick={() => window.location.href = `/safeeely`} 
                            >
                                Pay with Safeeely
                            </Button>
                            <Button variant="outline" className="h-16 rounded-[20px] border-2 border-slate-200 font-black text-lg hover:bg-slate-50 transition-all text-slate-700">
                                Chat Seller
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Secondary Content Sections - Adjusted Spacing for Mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16 mt-10 md:mt-20 pt-10 md:pt-20 border-t border-slate-50">
                    
                    {/* Bottom Left Column */}
                    <div className="lg:col-span-8 space-y-12 md:space-y-16">
                        {/* Safety Warning */}
                        <section className="p-6 md:p-8 bg-amber-50 rounded-[24px] md:rounded-[32px] border border-amber-100 flex flex-col md:flex-row gap-5 md:gap-6">
                            <div className="w-12 md:w-14 h-12 md:h-14 bg-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-200">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2 leading-tight">Trade Safely with Safeeely</h3>
                                <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed max-w-2xl">
                                    Always complete payments through our automated bot escrow system. Direct off-platform bank transfers are not protected and may result in restricted account access.
                                </p>
                            </div>
                        </section>

                        {/* Reviews Section */}
                        <section>
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Verified Feedback</h2>
                                <Button 
                                    variant="link" 
                                    className="font-bold text-emerald-600 p-0 h-auto"
                                    onClick={() => router.push(`/reviews/${listing.seller.safetag || listing.seller.id}`)}
                                >
                                    View All Reviews
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {listing.seller.reviews.map((r: any) => (
                                    <Card key={r.id} className="border border-slate-50 bg-slate-50/30 rounded-[20px] md:rounded-[24px] shadow-none">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 border border-white shadow-sm" />
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 leading-none mb-1">{r.user}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.date}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} size={14} className={i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-sm md:text-base text-slate-600 font-medium leading-relaxed">{r.comment}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>

                        {/* Related Products Carousel */}
                        <section>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-8 tracking-tight">Related Services</h2>
                            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 md:pb-10 no-scrollbar snap-x">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="min-w-[240px] md:min-w-[280px] snap-start bg-white border border-slate-100 rounded-[24px] md:rounded-[30px] p-4 md:p-5 group cursor-pointer hover:shadow-2xl hover:shadow-slate-200/50 transition-all">
                                        <div className="aspect-[4/3] bg-slate-50 rounded-xl md:rounded-2xl mb-4 overflow-hidden relative">
                                            <div className="w-full h-full bg-slate-100 group-hover:scale-110 transition-transform duration-700" />
                                            <div className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm">
                                                <Heart size={14} className="text-slate-300" />
                                            </div>
                                        </div>
                                        <h4 className="font-black text-slate-900 mb-1 line-clamp-1">Related Project {i}</h4>
                                        <div className="flex items-center justify-between">
                                            <span className="font-black text-emerald-600">$450.00</span>
                                            <div className="flex items-center gap-1">
                                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                <span className="text-xs font-black text-slate-800">4.9</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Bottom Right Column */}
                    <div className="lg:col-span-4 translate-y-0 lg:translate-y-0 relative z-20">
                        <div className="sticky top-32 space-y-8">
                            {/* Trust Score Card */}
                            <div className="h-[440px] md:h-[480px]">
                                <TrustScore 
                                    score={listing.seller.trustScore} 
                                    totalTrades={listing.seller.totalTrades}
                                />
                            </div>

                            {/* Features Section */}
                            <div className="p-6 md:p-8 bg-slate-50 border border-slate-100 rounded-[24px] md:rounded-[32px]">
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-200 pb-4">Key Features</h3>
                                <div className="space-y-4">
                                    {listing.features.map((f: string) => (
                                        <div key={f} className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                                <CheckCircle2 size={14} />
                                            </div>
                                            <span className="font-bold text-slate-600 text-[13px] md:text-sm italic">{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />

            <style dangerouslySetInnerHTML={{
                __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `
            }} />
        </main>
    );
}
