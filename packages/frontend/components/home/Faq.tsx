"use client";

import React, { useState } from "react";
import { Plus, Minus, HelpCircle, ShieldCheck, Wallet, UserCircle } from "lucide-react";

const FAQ_DATA = {
    sellers: [
        {
            question: "When do I actually get my money?",
            answer: "Once you deliver the product or service and the buyer clicks 'Confirm Receipt' in the bot, the funds are instantly moved from escrow to your Safeeely wallet. No waiting days for processing—it's immediate."
        },
        {
            question: "What if the buyer disappears after I deliver?",
            answer: "Don't worry, we've got your back. If you've uploaded your proof of delivery and the buyer doesn't respond, we have a clear dispute resolution process. If they don't contest it within a set timeframe, the funds are released to you automatically."
        },
        {
            question: "Is there a fee to use Safeeely?",
            answer: "We charge a flat 5% fee to ensure every transaction is monitored and secure. The best part? You can choose to pay it yourself, have the buyer pay, or split it 50/50 during the transaction setup."
        },
        {
            question: "How do I link my account to multiple platforms?",
            answer: "It's easy. If you registered on Telegram, just open the Discord bot and use the 'Login' option. You'll get an OTP to your Telegram to verify it's you, and then both accounts will share the same Safetag and balance."
        }
    ],
    buyers: [
        {
            question: "Is my money really safe while it's in escrow?",
            answer: "Absolutely. When you pay, the funds don't go to the seller—they go into a secure vault. The seller can see that you've paid, but they can't touch the money until you confirm that you have exactly what you paid for."
        },
        {
            question: "Can I get a refund if I'm scammed?",
            answer: "Safeeely is designed to prevent scams entirely. If a seller doesn't deliver, you can raise a dispute. Our team reviews the evidence, and if the seller failed to deliver, the money is returned to your wallet. No questions asked."
        },
        {
            question: "How do I know a seller is trustworthy?",
            answer: "Look for the 'Verified' badge and check their 'Trust Score'. Every user has a rating based on their actual transaction history. You can even read reviews from people who have traded with them before."
        },
        {
            question: "What payment methods do you support?",
            answer: "We support a variety of ways to pay, including bank transfers (NGN), USD via cards, and USDT for our crypto-native users. We're always adding more to make it as convenient as possible for you."
        }
    ]
};

function FaqItem({ question, answer }: { question: string; answer: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div 
            className={`group bg-white rounded-2xl border transition-all duration-300 ${isOpen ? 'border-emerald-500 shadow-lg shadow-emerald-500/5' : 'border-slate-100'}`}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left p-5 flex items-center justify-between gap-4"
            >
                <span className={`font-bold tracking-tight transition-colors duration-300 ${isOpen ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {question}
                </span>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
            </button>
            <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="px-5 pb-5 text-sm text-slate-500 leading-relaxed font-medium">
                    {answer}
                </div>
            </div>
        </div>
    );
}

export function FaqSection() {
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6 md:px-20 lg:px-32">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-bold tracking-tight mb-6 shadow-sm uppercase">
                        <HelpCircle className="w-3 h-3 text-emerald-500" />
                        <span>Got Questions?</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-5">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-base text-slate-400 leading-relaxed font-medium">
                        Everything you need to know about trading safely with Safeeely. No complicated tech-jargon, just straight answers.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* For Sellers */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 px-2 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">For Sellers</h3>
                        </div>
                        <div className="space-y-4">
                            {FAQ_DATA.sellers.map((item, i) => (
                                <FaqItem key={i} {...item} />
                            ))}
                        </div>
                    </div>

                    {/* For Buyers */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 px-2 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">For Buyers</h3>
                        </div>
                        <div className="space-y-4">
                            {FAQ_DATA.buyers.map((item, i) => (
                                <FaqItem key={i} {...item} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Link */}
                <div className="mt-20 text-center p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <p className="text-slate-500 font-medium mb-4">
                        Still have something on your mind? We're here to help.
                    </p>
                    <a 
                        href="https://t.me/SafeeelySupport" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-xl"
                    >
                        <UserCircle className="w-5 h-5" />
                        Chat with Support
                    </a>
                </div>
            </div>
        </section>
    );
}
