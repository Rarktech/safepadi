"use client";

import React, { useState } from 'react';
import { Lock, ShoppingCart, ShieldCheck, Tag } from 'lucide-react';

export const CtaSection = () => {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const res = await fetch(`${apiUrl}/waitlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to join waitlist');

            setSuccess(true);
            setPhone('');
        } catch (error) {
            console.error('Waitlist submission error:', error);
            alert('Failed to join waitlist. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="py-24 bg-white relative overflow-hidden flex justify-center px-4 md:px-6">
            <div className="max-w-[1200px] w-full relative">

                {/* Background Card */}
                <div className="bg-slate-900 rounded-[40px] p-8 md:p-16 text-center relative overflow-hidden shadow-2xl">

                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#67F05B]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#67F05B]/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

                    {/* Floating Icons */}
                    <div className="absolute top-12 left-12 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg transform -rotate-12 animate-pulse [animation-duration:3s]">
                        <Lock className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="absolute top-20 right-24 w-14 h-14 bg-white rounded-full hidden md:flex items-center justify-center shadow-lg transform rotate-12">
                        <Tag className="w-6 h-6 text-teal-600" />
                    </div>
                    <div className="absolute bottom-24 left-32 w-12 h-12 bg-white rounded-full hidden md:flex items-center justify-center shadow-lg transform -rotate-6">
                        <ShoppingCart className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="absolute bottom-16 right-16 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg transform rotate-6 animate-pulse [animation-duration:4s]">
                        <ShieldCheck className="w-8 h-8 text-teal-500" />
                    </div>

                    <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">

                        {/* Pill Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 backdrop-blur-md border border-slate-700 mb-8">
                            <span className="w-2 h-2 rounded-full bg-[#67F05B] animate-pulse"></span>
                            <span className="text-sm font-medium text-slate-300">Built for Modern Traders</span>
                        </div>

                        {/* Heading */}
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6 leading-tight font-['Inter']">
                            Unlock the Power of <br /> Safeeely Escrows
                        </h2>

                        {/* Subheading */}
                        <p className="text-lg text-slate-300 mb-10 max-w-2xl leading-relaxed">
                            Safeeely is an all-in-one platform that helps online traders, freelancers, and businesses secure payments, build reputation, and transact globally without borders.
                        </p>

                        {/* Phone Number Waitlist Form */}
                        {success ? (
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full py-4 px-8 flex items-center gap-3">
                                <ShieldCheck className="w-6 h-6 text-emerald-200" />
                                <span className="text-white font-medium">You're on the waitlist! We'll text you soon.</span>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                                <div className="relative w-full">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-slate-400 font-medium">+</span>
                                    </div>
                                    <input
                                        type="tel"
                                        className="w-full bg-white text-slate-900 rounded-full py-4 pl-8 pr-6 shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-300/50 placeholder:text-slate-400 font-medium"
                                        placeholder="Enter your phone number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full sm:w-auto bg-[#67F05B] hover:bg-[#5ce050] text-slate-900 font-bold rounded-full py-4 px-8 shadow-xl whitespace-nowrap transition-all hover:scale-105 disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Joining...' : 'Join Waitlist'}
                                </button>
                            </form>
                        )}
                        <p className="text-emerald-50/70 text-sm mt-4">We respect your privacy. No spam, ever.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};
