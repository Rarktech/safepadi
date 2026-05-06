import React from 'react';
import Link from 'next/link';
import { Send, Instagram, Twitter, Linkedin } from 'lucide-react';

export const Footer = () => {
    return (
        <footer className="bg-white pt-24 pb-8 overflow-hidden relative">
            <div className="max-w-[1200px] mx-auto px-6 relative z-10">

                {/* Top Section - Logo & Socials */}
                <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-100 pb-8 mb-12 gap-6">
                    <div className="flex items-center gap-2">
                        {/* Safeeely Logo */}
                        <div className="w-10 h-10 flex items-center justify-center">
                            <img src="/logo-main.svg" alt="Safeeely Logo" className="w-full h-full object-contain drop-shadow-sm" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900 font-['Inter']">Safeeely</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-500 mr-2">Social Media</span>
                        <a href="#" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:text-emerald-500 hover:border-emerald-500 transition-colors">
                            <Twitter className="w-4 h-4" />
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:text-emerald-500 hover:border-emerald-500 transition-colors">
                            <Instagram className="w-4 h-4" />
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:text-emerald-500 hover:border-emerald-500 transition-colors">
                            <Linkedin className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                {/* Main Links Section */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-24 relative z-10">

                    {/* Contact Col */}
                    <div className="md:col-span-5">
                        <h4 className="text-sm font-bold text-slate-900 mb-6">Reach out to us</h4>
                        <a
                            href={process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-4 bg-sky-50 border border-sky-100 rounded-2xl p-4 hover:bg-sky-100 transition-colors group"
                        >
                            <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                                <Send className="w-5 h-5 ml-[-2px] mb-[-2px]" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 leading-tight">Contact us on telegram</p>
                                <p className="text-xs text-slate-500 mt-1">Our associate will reply within 24h</p>
                            </div>
                        </a>
                    </div>

                    {/* Links Cols */}
                    <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 mb-6">Features</h4>
                            <ul className="flex flex-col gap-4">
                                <li><Link href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Escrow Management</Link></li>
                                <li><Link href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Crypto Checkout</Link></li>
                                <li><Link href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">AI Trustscore</Link></li>
                                <li><Link href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Dispute Resolution</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 mb-6">Explore</h4>
                            <ul className="flex flex-col gap-4">
                                <li><Link href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">How it Works</Link></li>
                                <li><Link href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Pricing</Link></li>
                                <li><Link href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Fee Calculator</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 mb-6">Help</h4>
                            <ul className="flex flex-col gap-4">
                                <li><Link href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">FAQs</Link></li>
                                <li><Link href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Email Us</Link></li>
                                <li><Link href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">Help Centre</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-100 gap-4 relative z-10">
                    <p className="text-xs text-slate-400">©{new Date().getFullYear()} Safeeely. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link href="/terms" className="text-xs text-slate-400 hover:text-slate-900 transition-colors">Terms of Service</Link>
                        <Link href="/privacy" className="text-xs text-slate-400 hover:text-slate-900 transition-colors">Privacy Policy</Link>
                        <Link href="#" className="text-xs text-slate-400 hover:text-slate-900 transition-colors">Cookie Policy</Link>
                    </div>
                </div>
            </div>

            {/* Giant Watermark Background Text */}
            <div className="absolute bottom-[-5%] left-1/2 -translate-x-1/2 w-full overflow-hidden flex justify-center pointer-events-none select-none z-0 opacity-[0.03]">
                <h1 className="text-[20vw] font-black tracking-tighter text-slate-900 leading-none font-['Inter'] m-0 p-0">
                    safeeely
                </h1>
            </div>

        </footer>
    );
};
