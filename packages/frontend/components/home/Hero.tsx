"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, ShieldCheck, Sparkles } from "lucide-react";

export function Hero() {
    return (
        <section className="relative flex flex-col items-center bg-white overflow-hidden pt-20 md:pt-28">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-100/30 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-100/20 blur-[120px] rounded-full" />
            </div>

            {/* Content Container */}
            <div className="container relative mx-auto px-6 text-center z-10 pb-4 md:pb-8">
                {/* Badge */}
                <div className="inline-flex items-center self-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-semibold mb-4 md:mb-6 shadow-sm">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    <span>The #1 Trusted Escrow Service</span>
                </div>

                {/* Hero Content */}
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-4 md:mb-6">
                    everything is <span className="text-emerald-500 italic">Safeee.</span>
                </h1>
                <p className="max-w-xl mx-auto text-base md:text-lg text-slate-600 leading-relaxed mb-6 md:mb-10 px-4">
                    Secure your social media deals, freelance gigs, and crypto trades with Safeeely's AI-powered escrow protection.
                </p>

                {/* CTA Section */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
                    <Link href="/pay">
                        <Button size="lg" className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 text-base shadow-xl shadow-slate-200 transition-all hover:scale-105 active:scale-95">
                            Join for Free
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-3">
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden shadow-sm">
                                <Image src="https://ui-avatars.com/api/?name=JD&background=10b981&color=fff" alt="User" width={32} height={32} />
                            </div>
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden shadow-sm">
                                <Image src="https://ui-avatars.com/api/?name=AM&background=059669&color=fff" alt="User" width={32} height={32} />
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400">10,000+ users</span>
                    </div>
                </div>
            </div>

            {/* Hero Image Asset - Natural Flow */}
            <div className="relative w-[130%] sm:w-[110%] md:w-full max-w-[900px] h-[55vh] md:h-[65vh] lg:h-[80vh] mt-[-20px] sm:mt-[-40px] md:mt-0 z-0 px-4 pointer-events-none">
                <Image
                    src="/assets/images/hero-asset.png"
                    alt="Safeeely Phone Mockup"
                    fill
                    className="object-contain object-top transition-all duration-700 hover:scale-[1.03]"
                    priority
                />
            </div>
        </section>
    );
}
