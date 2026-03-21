"use client";

import React from "react";
import { MessageSquare, Link as LinkIcon, ShieldCheck, CheckCircle2, Zap } from "lucide-react";

const STEPS = [
    {
        title: "Agreement",
        description: "Buyers and sellers agree on deal terms within our secure interface or preferred platform.",
        mockup: (
            <div className="relative w-full h-full bg-slate-50 flex items-center justify-center p-6 overflow-hidden">
                {/* Grid Pattern Background */}
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                {/* Chat Illustration */}
                <div className="relative w-full max-w-[140px] space-y-3 z-10">
                    <div className="bg-white rounded-2xl p-3 shadow-xl border border-slate-100 transform -rotate-6 transition-transform hover:rotate-0">
                        <div className="w-12 h-1.5 bg-slate-100 rounded mb-2" />
                        <div className="w-8 h-1 bg-emerald-500 rounded" />
                    </div>
                    <div className="bg-emerald-500 rounded-2xl p-3 shadow-xl transform rotate-3 ml-auto transition-transform hover:rotate-0 translate-x-4">
                        <div className="w-16 h-1.5 bg-white/20 rounded mb-2" />
                        <div className="w-10 h-1 bg-white/40 rounded" />
                    </div>
                    <div className="absolute -top-4 -right-2 bg-white rounded-full px-3 py-1 shadow-lg border border-slate-100 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Terms Agreed
                    </div>
                </div>
            </div>
        )
    },
    {
        title: "Initiation",
        description: "The seller creates a unique Safeeely secure transaction link and shares it with the buyer.",
        mockup: (
            <div className="relative w-full h-full bg-slate-50 flex items-center justify-center p-6 overflow-hidden">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                <div className="relative flex flex-col items-center">
                    {/* Link Ring Animation */}
                    <div className="absolute inset-0 bg-blue-500/10 rounded-full scale-150 blur-2xl" />
                    <div className="w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                <LinkIcon className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="space-y-1">
                                <div className="w-12 h-1.5 bg-slate-100 rounded" />
                                <div className="w-8 h-1 bg-slate-50 rounded" />
                            </div>
                        </div>
                        <div className="w-full h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <div className="w-20 h-1.5 bg-white/30 rounded" />
                        </div>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute -bottom-2 -left-4 bg-white rounded-lg p-2 shadow-xl border border-slate-100 flex items-center gap-2 z-20">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        </div>
                        <div className="w-12 h-1 bg-slate-200 rounded" />
                    </div>
                </div>
            </div>
        )
    },
    {
        title: "Escrow Hold",
        description: "Buyer makes payment; Safeeely locks the funds in a secure, AI-monitored smart vault.",
        mockup: (
            <div className="relative w-full h-full bg-slate-50 flex items-center justify-center p-6 overflow-hidden">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                <div className="relative">
                    <div className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />
                        <ShieldCheck className="w-10 h-10 text-blue-600 mb-2 relative z-10" />
                        <div className="w-12 h-1.5 bg-blue-600/20 rounded-full relative z-10 overflow-hidden">
                            <div className="absolute inset-y-0 left-0 w-2/3 bg-blue-600 animate-pulse" />
                        </div>
                    </div>
                    {/* Status Tags */}
                    <div className="absolute -top-4 -right-8 bg-slate-900 text-white rounded-full px-4 py-1.5 shadow-xl text-[10px] font-black tracking-widest uppercase z-20">
                        $12,452.91
                    </div>
                    <div className="absolute -bottom-4 -left-8 bg-white text-emerald-600 rounded-full px-4 py-1.5 shadow-xl border border-slate-50 text-[10px] font-black uppercase z-20 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Locked
                    </div>
                </div>
            </div>
        )
    },
    {
        title: "Payment Release",
        description: "Once delivery is confirmed, funds are instantly released to the seller's wallet.",
        mockup: (
            <div className="relative w-full h-full bg-slate-50 flex items-center justify-center p-6 overflow-hidden">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                <div className="relative w-full max-w-[150px]">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Released</div>
                                <div className="text-sm font-black text-slate-900">$2,500</div>
                            </div>
                        </div>
                        <div className="w-full h-10 bg-slate-900 rounded-xl flex items-center justify-center group overflow-hidden relative">
                            <div className="relative z-10 text-white text-[10px] font-black uppercase tracking-widest group-hover:scale-110 transition-transform">Withdraw Funds</div>
                        </div>
                    </div>
                    {/* Success Particle */}
                    <div className="absolute -top-4 -left-2 w-8 h-8 rounded-full bg-emerald-400 blur-2xl opacity-50" />
                </div>
            </div>
        )
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
                            <div className="h-44 relative border-b border-slate-50 overflow-hidden">
                                {step.mockup}
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
