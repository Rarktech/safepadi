"use client";

import React from "react";

export function GlobalDimension() {
    return (
        <section className="py-24 bg-gradient-to-br from-green-400 to-[#16a34a] relative overflow-hidden">
            {/* Decorative Blur and Noise */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-black/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="container mx-auto px-10 md:px-20 lg:px-32 relative z-10 text-center">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] mb-6 max-w-4xl mx-auto drop-shadow-sm">
                    Creating a 4th dimension for secured online transactions on social media....
                </h2>
                <p className="text-xl md:text-2xl font-bold text-white/80 mb-16 tracking-tight">
                    making transactions happen safeeely globally
                </p>

                {/* Improved Dotted World Map SVG */}
                <div className="relative w-full aspect-[2/1] max-w-5xl mx-auto">
                    <svg
                        viewBox="0 0 1000 500"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full text-white fill-current"
                    >
                        <defs>
                            <pattern id="worldDot" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                                <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" fillOpacity="0.4" />
                            </pattern>
                        </defs>

                        {/* Simplified World Shape with dots */}
                        <rect width="1000" height="500" fill="url(#worldDot)" mask="url(#mapMask)" />

                        <mask id="mapMask">
                            {/* Simplified world continent shapes */}
                            {/* North America */}
                            <ellipse cx="200" cy="180" rx="120" ry="80" fill="white" />
                            {/* South America */}
                            <ellipse cx="300" cy="350" rx="70" ry="100" fill="white" />
                            {/* Africa */}
                            <ellipse cx="500" cy="300" rx="80" ry="100" fill="white" />
                            {/* Eurasia */}
                            <ellipse cx="650" cy="180" rx="180" ry="100" fill="white" />
                            {/* Australia */}
                            <ellipse cx="850" cy="350" rx="50" ry="40" fill="white" />
                        </mask>

                        {/* Hotspots */}
                        <g>
                            {[
                                { x: 200, y: 180 }, { x: 300, y: 350 }, { x: 500, y: 300 },
                                { x: 650, y: 180 }, { x: 850, y: 350 }, { x: 100, y: 150 },
                                { x: 750, y: 120 }
                            ].map((pt, i) => (
                                <g key={i}>
                                    <circle cx={pt.x} cy={pt.y} r="6" className="animate-ping fill-white/30" />
                                    <circle cx={pt.x} cy={pt.y} r="3" className="fill-whiteShadow" />
                                </g>
                            ))}
                        </g>
                    </svg>
                </div>
            </div>
        </section>
    );
}
