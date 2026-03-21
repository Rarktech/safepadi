"use client";

import React from "react";

const BRANDS = [
    "Finance", "CryptoPay", "SecureTrade", "GlobalTech", "AlphaChain",
    "NexusEscrow", "SafeVault", "PrimeAds", "MetaFlow", "Vertex"
];

export function BrandSlider() {
    return (
        <section className="py-12 bg-white overflow-hidden border-b border-slate-50">
            <div className="container mx-auto px-6 mb-8 text-center">
                <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                    Trusted by Industry Leaders
                </p>
            </div>

            <div className="relative flex items-center">
                {/* Left Fade Gradient */}
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />

                {/* Scrolling Container */}
                <div className="flex animate-scroll whitespace-nowrap gap-12 md:gap-24">
                    {/* First set of brands */}
                    {BRANDS.map((brand, i) => (
                        <div key={`brand-1-${i}`} className="flex items-center gap-2 group cursor-pointer transition-all">
                            <span className="text-xl md:text-2xl font-black text-slate-300 group-hover:text-emerald-500 transition-colors tracking-tight italic">
                                {brand}
                            </span>
                        </div>
                    ))}
                    {/* Duplicate set for infinite effect */}
                    {BRANDS.map((brand, i) => (
                        <div key={`brand-2-${i}`} className="flex items-center gap-2 group cursor-pointer transition-all">
                            <span className="text-xl md:text-2xl font-black text-slate-300 group-hover:text-emerald-500 transition-colors tracking-tight italic">
                                {brand}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Right Fade Gradient */}
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />
            </div>

            <style jsx global>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 40s linear infinite;
        }
      `}</style>
        </section>
    );
}
