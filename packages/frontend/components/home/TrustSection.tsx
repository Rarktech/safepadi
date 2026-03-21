"use client";

import React from "react";

const USERS = [
    {
        name: "James",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
        pos: "top-[2%] left-[2%] md:top-[8%] md:left-[5%] lg:left-[5%]",
        bubble: "Verified Merchant",
        animation: "animate-float-slow"
    },
    {
        name: "Sarah",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
        pos: "top-[2%] right-[2%] md:top-[15%] md:right-[0%] lg:right-[3%]",
        bubble: "Just secured a $5k deal!",
        animation: "animate-float"
    },
    {
        name: "Michael",
        avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop",
        pos: "bottom-[5%] left-[2%] md:bottom-[10%] md:left-[3%] lg:left-[5%]",
        bubble: "Safeeely is a lifesaver",
        animation: "animate-float-slow"
    },
    {
        name: "Elena",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop",
        pos: "bottom-[2%] right-[2%] md:bottom-[10%] md:right-[0%] lg:right-[3%]",
        bubble: "Payment received in seconds",
        animation: "animate-float"
    },
    {
        name: "David",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
        pos: "top-[40%] left-[-4%] md:top-[40%] md:left-[0%] lg:left-[2%]",
        bubble: "",
        animation: "animate-float-slow"
    }
];

export function TrustSection() {
    return (
        <section className="py-32 md:py-48 lg:py-72 bg-white overflow-hidden relative min-h-[700px] flex items-center">
            {/* Protective Container for Headings - Ensures horizontal space is reserved */}
            <div className="container mx-auto px-6 relative">

                {/* Floating Elements - Z-INDEX 20 to be in FRONT of text */}
                <div className="absolute inset-x-0 inset-y-[-10%] pointer-events-none z-30">
                    {USERS.map((user, idx) => (
                        <div
                            key={idx}
                            className={`absolute ${user.pos} ${user.animation} flex items-center gap-3 transition-all duration-1000 group scale-[0.6] sm:scale-[0.8] md:scale-100`}
                        >
                            <div className="relative">
                                <div className="w-14 h-14 md:w-20 md:h-20 rounded-full border-4 border-white shadow-2xl overflow-hidden relative z-20">
                                    <img src={user.avatar} className="object-cover w-full h-full" alt={user.name} />
                                </div>
                                {/* Status Dot for some */}
                                {(idx === 0 || idx === 3) && (
                                    <div className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full z-30 shadow-sm animate-pulse"></div>
                                )}
                            </div>

                            {user.bubble && (
                                <div className="hidden xl:block">
                                    <div className="px-4 py-2 bg-emerald-50 border border-emerald-100/50 rounded-full rounded-tl-none shadow-sm backdrop-blur-sm">
                                        <p className="text-[10px] md:text-xs font-bold text-emerald-800 whitespace-nowrap">
                                            {user.bubble}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Main Heading Content - Z-INDEX 10 to be BEHIND avatars */}
                <div className="max-w-4xl mx-auto text-center relative z-10 px-6 md:px-0">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
                        Because we know how <br className="lg:block" />
                        important to <span className="text-emerald-500 italic relative inline-block">
                            safeeely
                            <svg className="absolute -bottom-2 md:-bottom-4 left-0 w-full opacity-60" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 10C20 6 60 2 100 2C140 2 180 6 198 10" stroke="#10b981" strokeWidth="6" strokeLinecap="round" />
                            </svg>
                        </span> <br className="lg:block" />
                        transact with people is!!
                    </h2>
                    <p className="mt-8 text-slate-500 text-sm md:text-base font-medium max-w-lg mx-auto">
                        Trusted by thousands of freelancers, merchants, and creators worldwide to secure every exchange.
                    </p>
                </div>
            </div>

            {/* Background Decorative Blobs */}
            <div className="absolute top-[10%] left-[5%] w-[40vw] h-[40vw] bg-emerald-50/40 blur-[120px] rounded-full -z-10 pointer-events-none" />
            <div className="absolute bottom-[5%] right-[5%] w-[30vw] h-[30vw] bg-slate-50/50 blur-[100px] rounded-full -z-10 pointer-events-none" />

            <style jsx global>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(2deg); }
                }
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-10px) rotate(-1deg); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                .animate-float-slow {
                    animation: float-slow 8s ease-in-out infinite;
                }
            `}</style>
        </section>
    );
}
