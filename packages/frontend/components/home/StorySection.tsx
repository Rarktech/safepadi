"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Mic, Video, ClosedCaption, Play, Pause, MonitorUp, MoreHorizontal, ScreenShare } from "lucide-react";

const PARTICIPANTS = [
    { name: "Sarah J.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150" },
    { name: "Ibrahim K.", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150" },
    { name: "David L.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150" },
    { name: "Aisha M.", avatar: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?auto=format&fit=crop&q=80&w=150&h=150" }
];

export function StorySection() {
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="container mx-auto px-6 md:px-20 lg:px-32">
                {/* Header */}
                <div className="text-center max-w-4xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
                        I was scammed online— <span className="text-emerald-500 italic block mt-1">real story on why i built safely....</span>
                    </h2>
                    <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
                        I built Safeeely because I lost money to a scammer on social media. This is more than just an app; it's a mission to make sure no one else goes through that frustration.
                    </p>
                </div>

                {/* Video Call Interface Container */}
                <div className="relative max-w-6xl mx-auto px-4 md:px-0">
                    
                    {/* The Full White Container (Reference Style) */}
                    <div className="bg-white p-2.5 md:p-6 rounded-[2.5rem] shadow-[0_32px_120px_-20px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col md:flex-row gap-4 relative">
                        
                        {/* Floating "Jay" (Reference Style) - Hidden on mobile */}
                        <div className="absolute top-1/2 -left-8 -translate-y-1/2 hidden lg:block w-40 aspect-[4/3] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform -rotate-6 z-50">
                            <div className="relative w-full h-full">
                                <img src="https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&q=80&w=300&h=200" className="w-full h-full object-cover" alt="Jay" />
                                <div className="absolute bottom-2 left-2 bg-slate-900/40 backdrop-blur-sm px-2 py-1 rounded text-[8px] font-bold text-white uppercase">Participant</div>
                            </div>
                        </div>

                        {/* Main Video (Reference Size) */}
                        <div className="flex-grow relative aspect-video md:aspect-[16/10] bg-slate-900 rounded-[1.75rem] md:rounded-[2rem] overflow-hidden group">
                            <video 
                                ref={videoRef}
                                className="w-full h-full object-cover opacity-90 transition-opacity duration-700"
                                muted={isMuted}
                                loop
                                playsInline
                                autoPlay
                            >
                                <source src="https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-308-large.mp4" type="video/mp4" />
                            </video>

                            {/* Label */}
                            <div className="absolute top-4 left-4 text-white/60 text-[8px] md:text-[10px] font-bold uppercase tracking-widest bg-black/20 backdrop-blur-sm px-3 py-1 rounded-md mb-2">
                                Safeeely Founder Presenting
                            </div>

                            {/* Center Play/Pause Indicator (Overlay) */}
                            {!isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-20">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white">
                                        <Play className="w-6 h-6 md:w-8 md:h-8 fill-current ml-1" />
                                    </div>
                                </div>
                            )}

                            {/* Controls Bar (Reference Style) */}
                            <div className="absolute inset-x-0 bottom-4 md:bottom-8 flex justify-center items-center z-30 transition-all duration-500 group-hover:translate-y-0 translate-y-2 opacity-100 md:opacity-0 group-hover:opacity-100">
                                <div className="flex items-center gap-1.5 md:gap-3 bg-slate-900/80 backdrop-blur-2xl px-4 py-2 md:px-8 md:py-3.5 rounded-full border border-white/10 shadow-2xl scale-75 md:scale-100 origin-bottom">
                                    <button onClick={() => setIsMuted(!isMuted)} className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all ${!isMuted ? 'bg-emerald-500' : 'bg-white/10 hover:bg-white/20'} text-white`}>
                                        <Mic className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                    <button className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all">
                                        <Video className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                    <button className="hidden sm:flex w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 text-white items-center justify-center hover:bg-white/20 transition-all">
                                        <ClosedCaption className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                    <button className="hidden sm:flex w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 text-white items-center justify-center hover:bg-white/20 transition-all">
                                        <ScreenShare className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                    <button onClick={togglePlay} className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all shadow-xl -mx-1 md:-mx-2 border-2 md:border-4 border-slate-900/50">
                                        {isPlaying ? <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" /> : <Play className="w-5 h-5 md:w-6 md:h-6 fill-current ml-0.5" />}
                                    </button>
                                    <button className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all">
                                        <MoreHorizontal className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar (Reference Style) - Hidden on mobile */}
                        <div className="hidden md:flex w-full md:w-48 lg:w-56 flex flex-col gap-3 h-auto">
                            {PARTICIPANTS.map((user, i) => (
                                <div key={i} className="relative aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 group/child flex-grow h-0 min-h-[80px]">
                                    <img src={user.avatar} className="w-full h-full object-cover transition-transform duration-700 group-hover/child:scale-110" alt={user.name} />
                                    <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider">
                                        {user.name}
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1 items-center">
                                        <div className="w-5 h-5 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
                                            <Mic className="w-2.5 h-2.5 text-white" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Join For Free CTA (Reference Position) */}
                    <div className="mt-12 text-center">
                        <Link href="/pay">
                            <button className="px-8 py-4 bg-slate-900 text-white rounded-full font-black text-base hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10">
                                Join for free →
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
