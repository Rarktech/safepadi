import React from 'react';
import { MessageCircle, MonitorSmartphone, ShieldCheck, Globe, Lock, ArrowRight, Wallet, Activity, Repeat, RefreshCw, Zap, Brain } from 'lucide-react';

export const FeaturesBento = () => {
    return (
        <section className="py-24 bg-slate-50 relative overflow-hidden">
            <div className="max-w-[1200px] mx-auto px-6 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 mb-6 font-['Inter']">
                        Secure Exchanges for<br />Those Who Expect More
                    </h2>
                </div>

                {/* Bento Grid Container */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Top Row: 3 Cols */}

                    {/* Card 1: Cross-Platform */}
                    <div className="bg-white rounded-[32px] border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col items-center text-center relative overflow-hidden group">
                        {/* Visual Area */}
                        <div className="h-48 w-full flex items-center justify-center mb-6 relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-sky-50/50 to-transparent rounded-2xl"></div>
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6 group-hover:-rotate-12 transition-transform duration-500 border border-slate-100">
                                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#5865F2]" fill="currentColor">
                                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                                    </svg>
                                </div>
                                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-200 z-10 scale-110 group-hover:scale-125 transition-transform duration-500 border border-slate-100">
                                    <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#25D366]" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                </div>
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg transform rotate-6 group-hover:rotate-12 transition-transform duration-500 border border-slate-100">
                                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#2AABEE]" fill="currentColor">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                    </svg>
                                </div>
                            </div>
                            {/* Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-400/20 blur-2xl rounded-full"></div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Trade Across All Social Platforms</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">Whether you're dealing on Telegram, Discord, or Web, initiate and manage secure escrows without ever leaving your favorite app.</p>
                    </div>

                    {/* Card 2: Trustscore */}
                    <div className="bg-white rounded-[32px] border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col items-center text-center relative overflow-hidden group">
                        <div className="absolute top-6 left-6 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-slate-900 tracking-wider uppercase">Live Tracking</span>
                        </div>
                        {/* Visual Area */}
                        <div className="h-48 w-full flex flex-col justify-end items-center mb-6 relative pb-4">
                            {/* Speedometer Arc */}
                            <div className="w-40 h-20 overflow-hidden relative">
                                <div className="w-40 h-40 rounded-full border-[16px] border-emerald-500 border-b-transparent border-l-transparent transform -rotate-45 relative">
                                    <div className="absolute inset-[-16px] rounded-full border-[16px] border-emerald-100 border-b-transparent border-l-transparent transform rotate-90"></div>
                                </div>
                                {/* Needle */}
                                <div className="absolute bottom-0 left-1/2 w-1 h-20 bg-slate-800 origin-bottom transform rotate-45 group-hover:rotate-[60deg] transition-transform duration-1000 ease-out z-10" style={{ transformOrigin: 'bottom center' }}></div>
                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rounded-full z-20"></div>
                            </div>
                            {/* Glow */}
                            <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-emerald-50 to-transparent"></div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">The Performance Tracker</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">Track reputation that actually matters. Verify Trustscores before every transaction.</p>
                    </div>

                    {/* Card 3: Global Payments */}
                    <div className="bg-white rounded-[32px] border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col items-center text-center justify-center relative overflow-hidden group">
                        {/* Visual Area */}
                        <div className="h-48 w-full flex items-center justify-center mb-6 relative">
                            <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-full flex items-center gap-2 shadow-lg shadow-emerald-200 transform group-hover:translate-y-[-2px] transition-all z-10 relative cursor-default">
                                <Globe className="w-5 h-5" />
                                Skip the Borders
                                <div className="absolute -bottom-3 -right-3 w-6 h-6 text-slate-900">
                                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="2" className="w-full h-full transform -rotate-12 translate-y-1 translate-x-1 group-hover:translate-y-0 group-hover:translate-x-0 transition-all text-slate-900">
                                        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .5-.5v-12a.5.5 0 0 0-.5-.5H6a.5.5 0 0 0-.5.5z" />
                                    </svg>
                                </div>
                            </button>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-400/20 blur-2xl rounded-full"></div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">The Global Merchant</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">Skip the chaos—no more conversion fees, pay and receive in local fiat or crypto worldwide.</p>
                    </div>

                </div>

                {/* Bottom Row: 2 Cols, Wider */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

                    {/* Card 4: Secure Escrow */}
                    <div className="bg-white rounded-[32px] border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                        {/* Text Area */}
                        <div className="w-full md:w-1/2 z-10 order-2 md:order-1 text-center md:text-left">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">The Security Focused</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">Funds are locked in our bank-grade escrow until delivery is confirmed—stop worrying about fraud, see it all protected.</p>
                        </div>
                        {/* Visual Area */}
                        <div className="w-full md:w-1/2 h-48 relative flex items-center justify-center order-1 md:order-2">
                            {/* An open box graphic */}
                            <div className="relative w-40 h-32 mt-12">
                                {/* Box Back */}
                                <div className="absolute bottom-0 w-full h-20 bg-slate-200/50 transform -skew-x-[20deg] rounded-lg"></div>
                                {/* Coins floating up */}
                                <div className="absolute top-[-30px] left-4 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg transform -rotate-12 group-hover:translate-y-[-10px] transition-transform duration-700 delay-75">
                                    <span className="text-white font-bold text-lg leading-none">₿</span>
                                </div>
                                <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg group-hover:translate-y-[-15px] transition-transform duration-700">
                                    <span className="text-white font-bold text-xl leading-none">$</span>
                                </div>
                                <div className="absolute top-[-20px] right-2 w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center shadow-lg transform rotate-12 group-hover:translate-y-[-8px] transition-transform duration-700 delay-150">
                                    <span className="text-white font-bold text-sm leading-none">₦</span>
                                </div>
                                <div className="absolute top-[-10px] left-[-10px] w-8 h-8 bg-purple-500 rounded-full shadow-lg transform -rotate-12 group-hover:translate-y-[-5px] transition-transform duration-700 delay-200"></div>
                                {/* Box Front */}
                                <div className="absolute bottom-[-10px] left-[-10px] w-[120%] h-16 bg-white border border-slate-100 shadow-sm transform -rotate-2 rounded-lg z-10"></div>
                            </div>
                            {/* Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-400/10 blur-3xl rounded-full"></div>
                        </div>
                    </div>

                    {/* Card 5: Automation */}
                    <div className="bg-white rounded-[32px] border border-slate-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                        {/* Text Area */}
                        <div className="w-full md:w-1/2 z-10 order-2 md:order-1 text-center md:text-left">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">AI Dispute Settlement</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">Resolve disputes instantly with our AI-powered arbitration system. Fair, transparent, and driven by immutable transaction data.</p>
                        </div>
                        {/* Visual Area */}
                        <div className="w-full md:w-1/2 h-48 relative flex items-center justify-center order-1 md:order-2">
                            {/* Animated Character graphic */}
                            <div className="relative w-full h-full flex items-center justify-center pt-4">
                                {/* Glow behind character */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-emerald-400/20 blur-3xl rounded-full"></div>
                                {/* Character Image with floating animation */}
                                <img
                                    src="/character.png"
                                    alt="Safeeely AI Mascot"
                                    className="w-auto h-full max-h-[120%] object-contain relative z-10 transform translate-y-4 group-hover:-translate-y-2 transition-transform duration-700 ease-in-out drop-shadow-2xl"
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};
