"use client";

import React from "react";

const STEPS = [
    {
        title: "Agreement",
        description: "Buyers and sellers agree on deal terms within our secure interface or preferred platform.",
        image: "/assets/images/agreement.png"
    },
    {
        title: "Initiation",
        description: "The seller creates a unique Safeeely secure transaction link and shares it with the buyer.",
        image: "/assets/images/initiation.png"
    },
    {
        title: "Escrow Hold",
        description: "Buyer makes payment; Safeeely locks the funds in a secure, AI-monitored smart vault.",
        image: "/assets/images/escrow hold.png"
    },
    {
        title: "Payment Release",
        description: "Once delivery is confirmed, funds are instantly released to the seller's wallet.",
        image: "/assets/images/payment release.png"
    }
];


const STATS = [
    { label: "Faster Launch", value: "4x", color: "bg-blue-600" },
    { label: "Users Protected", value: "10K+", color: "bg-orange-500" },
    { label: "Funds Escrowed", value: "$2M+", color: "bg-pink-600" },
    { label: "Uptime", value: "99.9%", color: "bg-emerald-500" }
];

export function HowItWorks() {
    return (
        <section className="py-24 bg-slate-50/50 overflow-hidden">
            <div className="container mx-auto px-10 md:px-20 lg:px-32">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-100 text-slate-500 text-[10px] font-bold tracking-tight mb-6 shadow-sm">
                        <span>Easy & Smart</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-5">
                        Find Safety in Just 4 Steps
                    </h2>
                    <p className="text-sm md:text-base text-slate-400 leading-relaxed font-medium">
                        See how Safeeely's AI-Powered search for safety finds the best protection for your deals — without the hassle.
                    </p>
                </div>

                {/* Steps Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
                    {STEPS.map((step, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-[32px] overflow-hidden shadow-lg border border-white flex flex-col transition-all duration-500 hover:shadow-xl hover:-translate-y-1 group"
                        >
                            {/* Mockup Area */}
                            <div className="h-44 relative bg-slate-50 border-b border-slate-50 overflow-hidden">
                                <img 
                                    src={step.image} 
                                    alt={step.title}
                                    className="w-full h-full object-contain"
                                />
                            </div>

                            {/* Content Area */}
                            <div className="p-6 pb-8">
                                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black mb-4 shadow-lg">
                                    {i + 1 < 10 ? `0${i + 1}` : i + 1}
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">
                                    {step.title}
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stats Section */}
                <div className="text-center">
                    <h3 className="text-3xl lg:text-4xl font-black text-slate-900 mb-4 tracking-tight">
                        Numbers that power our story
                    </h3>
                    <p className="text-slate-400 mb-20 font-medium max-w-2xl mx-auto text-lg">
                        Our platform has helped thousands trade faster, scale smarter, and earn more.
                    </p>

                    <div className="flex flex-wrap justify-center gap-12 md:gap-24 lg:gap-32">
                        {STATS.map((stat, i) => (
                            <div key={i} className="text-center group">
                                <div className="flex items-center justify-center gap-4 mb-3">
                                    <div className={`w-4 h-4 rounded-md ${stat.color} shadow-lg transition-transform duration-500 group-hover:rotate-45 group-hover:scale-125`} />
                                    <span className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter">
                                        {stat.value}
                                    </span>
                                </div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
