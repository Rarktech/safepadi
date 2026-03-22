"use client";

import React from "react";
import Image from "next/image";
import { Star, MessageCircle, ShieldCheck } from "lucide-react";

interface Review {
    id: number;
    name: string;
    role: string;
    safetag: string;
    content: string;
    avatar: string;
    platform: "telegram" | "discord";
}

const REVIEWS: Review[] = [
    {
        id: 1,
        name: "David Chen",
        role: "Luxury Watch Dealer",
        safetag: "@dchen_watches",
        avatar: "https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&q=80&w=200&h=200",
        platform: "telegram",
        content: "I've moved over $50k in high-end watches through Safeeely. The piece of mind knowing the funds are locked before I ship is priceless. Best escrow in Nigeria."
    },
    {
        id: 2,
        name: "Sandra Okafor",
        role: "Freelance Designer",
        safetag: "@sandra_designs",
        avatar: "https://images.unsplash.com/photo-156753293887af-fb4d929b43c5?auto=format&fit=crop&q=80&w=200&h=200",
        platform: "discord",
        content: "As a seller, I used to get ghosted after sending prototypes. Now, I don't start the work until the Safeeely link is active. Instant payment once they approve!"
    },
    {
        id: 3,
        name: "Ibrahim Musa",
        role: "Sneaker Reseller",
        safetag: "@grail_plug",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200&h=200",
        platform: "telegram",
        content: "The Telegram bot is so fast. I can create a secure link in 30 seconds while chatting on WhatsApp. My customers trust me more because of the verified badge."
    },
    {
        id: 4,
        name: "Jessica White",
        role: "Digital Artist",
        safetag: "@jess_white",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200",
        platform: "discord",
        content: "Finally, an escrow that understands the creator economy. The dispute resolution is fair and the support team actually listens. 5 stars!"
    },
    {
        id: 5,
        name: "Bankole Ade",
        role: "iPhone Merchant",
        safetag: "@banky_gadgets",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200",
        platform: "telegram",
        content: "Safeeely is the only reason I still sell on Instagram. It weeds out the scammers immediately. If they aren't willing to use escrow, they aren't serious."
    },
    {
        id: 6,
        name: "Sarah Miller",
        role: "Social Media Manager",
        safetag: "@sarah_smm",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200",
        platform: "discord",
        content: "The multi-platform linking is genius. I can manage my transactions on Discord while my clients prefer Telegram. Everything stays synced."
    },
    {
        id: 7,
        name: "Kelechi Ugo",
        role: "VFX Artist",
        safetag: "@kel_vfx",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200",
        platform: "telegram",
        content: "Clean interface, fast payouts, and zero stress. Safeeely is a game charger for anyone doing business on social media."
    },
    {
        id: 8,
        name: "Aisha Yusuf",
        role: "Vintage Clothing",
        safetag: "@aisha_thrift",
        avatar: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?auto=format&fit=crop&q=80&w=200&h=200",
        platform: "telegram",
        content: "I love the trust score feature. It builds so much credibility for my small business. My sales have actually doubled since I started using it."
    },
    {
        id: 9,
        name: "Mark Thompson",
        role: "Domain Broker",
        safetag: "@mark_domains",
        avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200&h=200",
        platform: "discord",
        content: "Safe and fast. No more worrying about chargebacks or fake transfers. The USDT payment option is perfect for my international clients."
    }
];

function ReviewCard({ review }: { review: Review }) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all duration-300 w-full mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
                        <img src={review.avatar} alt={review.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1">{review.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{review.safetag}</p>
                    </div>
                </div>
                <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                    ))}
                </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-medium mb-4 italic">
                "{review.content}"
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{review.role}</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${review.platform === 'telegram' ? 'bg-blue-50 text-blue-600' : 'bg-slate-900 text-white'}`}>
                    {review.platform === 'telegram' ? <MessageCircle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                    {review.platform.toUpperCase()}
                </div>
            </div>
        </div>
    );
}

function ReviewColumn({ reviews, speed, reverse = false }: { reviews: Review[], speed: string, reverse?: boolean }) {
    return (
        <div className="flex flex-col gap-6 relative overflow-hidden group">
            <div 
                className={`flex flex-col gap-6 animate-scroll-vertical group-hover:pause-animation`}
                style={{ 
                    animationDuration: speed,
                    animationDirection: reverse ? 'reverse' : 'normal'
                }}
            >
                {/* Double the array for infinite scroll */}
                {[...reviews, ...reviews, ...reviews].map((review, i) => (
                    <ReviewCard key={`${review.id}-${i}`} review={review} />
                ))}
            </div>
        </div>
    );
}

export function ReviewSection() {
    return (
        <section className="py-24 bg-white overflow-hidden relative">
            <div className="container mx-auto px-6 md:px-20 lg:px-32 relative z-10">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-20 relative">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-100 text-slate-500 text-[10px] font-bold tracking-tight mb-6 shadow-sm uppercase">
                        <span>The Safeeely Standard</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-5">
                        Reviews from our users
                    </h2>
                    <p className="text-base text-slate-400 leading-relaxed font-medium">
                        Testimonials from our users around the globe who trade with absolute confidence every single day.
                    </p>
                </div>

                {/* Review Gallery */}
                <div className="relative h-[700px] overflow-hidden">
                    {/* Top Fade Gradient */}
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white via-white to-transparent z-20 pointer-events-none" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full">
                        {/* Column 1 - Fast */}
                        <ReviewColumn 
                            reviews={REVIEWS.slice(0, 3)} 
                            speed="40s" 
                        />
                        
                        {/* Column 2 - Slow (Desktop Only) */}
                        <div className="hidden md:block">
                            <ReviewColumn 
                                reviews={REVIEWS.slice(3, 6)} 
                                speed="60s" 
                                reverse 
                            />
                        </div>

                        {/* Column 3 - Medium (Desktop Only) */}
                        <div className="hidden md:block">
                            <ReviewColumn 
                                reviews={REVIEWS.slice(6, 9)} 
                                speed="50s" 
                            />
                        </div>
                    </div>

                    {/* Bottom Fade Gradient */}
                    <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-white via-white to-transparent z-20 pointer-events-none" />
                </div>

                {/* Statistics Footer */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100/50 text-center">
                        <div className="text-4xl font-black text-slate-900 mb-1">10k+</div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Users around the globe</div>
                    </div>
                    <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100/50 text-center">
                        <div className="text-4xl font-black text-slate-900 mb-1">97%</div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Satisfaction rate</div>
                    </div>
                    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-center shadow-xl">
                        <div className="text-4xl font-black text-white mb-1">22k+</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Secured Transactions</div>
                    </div>
                </div>
            </div>

            {/* Custom Styles for Animation */}
            <style jsx global>{`
                @keyframes scroll-vertical {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-50%); }
                }
                .animate-scroll-vertical {
                    animation: scroll-vertical linear infinite;
                }
                .pause-animation {
                    animation-play-state: paused !important;
                }
            `}</style>
        </section>
    );
}
