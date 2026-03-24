"use client";

import { 
  ShoppingBag, 
  Palette, 
  Scale, 
  Home, 
  Globe, 
  Megaphone, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck 
} from "lucide-react";
import { useRef } from "react";
import Link from "next/link";

const USE_CASES = [
  {
    id: 1,
    title: "Professional & Legal",
    subtitle: "Consultants & Lawyers",
    description: "Bringing transparency to local consulting.",
    icon: <Scale className="w-8 h-8 text-blue-500" />,
    color: "bg-blue-50",
    benefit: "Digital Retainer: Money is held neutrally, protecting both the lawyer's time and the client's capital.",
    who: "Lawyers, Notaries, Accountants, Immigration Agents",
    seo: "SAFE LEGAL PAYMENTS"
  },
  {
    id: 2,
    title: "Real Estate",
    subtitle: "Rentals & Property",
    description: "Eliminating 'Ghost Listings' and rental scams.",
    icon: <Home className="w-8 h-8 text-green-500" />,
    color: "bg-green-50",
    benefit: "Key-Exchange Escrow: funds are released only when you have the keys and physical access to the flat.",
    who: "Apt. Renters, Estate Agents, Shortlet Hosts",
    seo: "REAL ESTATE ESCROW"
  },
  {
    id: 3,
    title: "Social Commerce",
    subtitle: "Instagram, Facebook, X",
    description: "Secure protection for the 'DM-to-Order' economy.",
    icon: <ShoppingBag className="w-8 h-8 text-orange-500" />,
    color: "bg-orange-50",
    benefit: "Instant Trust: Increase conversion rates by offering a 'Pay on Delivery' experience without the risk of cash.",
    who: "Boutique Owners, Sneaker Resellers, Antique Collectors",
    seo: "SECURE SOCIAL SHOPPING"
  },
  {
    id: 4,
    title: "Freelance & Creative",
    subtitle: "Digital Nomads & Agencies",
    description: "Escrow for the modern digital nomad.",
    icon: <Palette className="w-8 h-8 text-purple-500" />,
    color: "bg-purple-50",
    benefit: "Guaranteed Payout: No more chasing invoices. If the work is delivered, the money is yours.",
    who: "Video Editors, UI/UX Designers, Ghostwriters",
    seo: "FREELANCE PAYMENT SECURITY"
  },
  {
    id: 5,
    title: "Digital Asset Trading",
    subtitle: "Virtual Goods & SaaS",
    description: "Specialized protection for virtual goods.",
    icon: <Globe className="w-8 h-8 text-indigo-500" />,
    color: "bg-indigo-50",
    benefit: "Atomic Transfer: The buyer's cash is locked before the domain Auth-Code is even shared.",
    who: "Domain Flippers, Social Handle Traders, Web App Sellers",
    seo: "DIGITAL ASSET TRANSFERS"
  },
  {
    id: 6,
    title: "Influencer Marketing",
    subtitle: "Creators & Brands",
    description: "Ensuring creators and brands play fair.",
    icon: <Megaphone className="w-8 h-8 text-pink-500" />,
    color: "bg-pink-50",
    benefit: "Auto-Release: funds are released once the link to the live sponsored post is verified through the bot.",
    who: "Micro-Influencers, Brands, Startups",
    seo: "INFLUENCER BRAND DEALS"
  }
];

export function UseCasesSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - (clientWidth * 0.8) : scrollLeft + (clientWidth * 0.8);
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-slate-50 border-t border-slate-100 overflow-hidden relative">
      <div className="container mx-auto px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-10 lg:gap-14 items-start relative z-10">
        
        {/* Left Column: Fixed Headline */}
        <div className="lg:sticky lg:top-24 flex flex-col h-full lg:h-[500px]">
          <div className="mb-auto">
            <h2 className="text-4xl md:text-5xl lg:text-[4rem] font-bold leading-[1.05] tracking-tight text-slate-900 mb-8 pt-4">
              Discover how <br className="hidden md:block lg:hidden" />
              <span className="text-emerald-500 tracking-tight">Safeeely</span> <br />
              protects your <br />
              <span className="italic font-bold tracking-tight text-slate-800">DM Economy</span>
            </h2>
          </div>
          
          <div className="mt-8 lg:mt-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex -space-x-3">
                <div className="w-12 h-12 rounded-full border-4 border-slate-50 overflow-hidden bg-slate-200">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" alt="User 1" className="w-full h-full object-cover" />
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-slate-50 overflow-hidden bg-slate-200">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" alt="User 2" className="w-full h-full object-cover" />
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-slate-50 overflow-hidden bg-slate-200">
                  <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop" alt="User 3" className="w-full h-full object-cover" />
                </div>
              </div>
              <p className="text-slate-500 text-sm max-w-[200px] leading-snug font-medium">
                Used by thousands of designers, sellers, and freelancers worldwide.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => scroll('left')}
                className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center bg-white text-slate-600 hover:text-black hover:border-black hover:shadow-md transition-all active:scale-95"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <button 
                onClick={() => scroll('right')}
                className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center bg-white text-slate-600 hover:text-black hover:border-black hover:shadow-md transition-all active:scale-95"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Carousel Wrapper with Fade */}
        <div className="relative">
          {/* Scroll Fade Overlay */}
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-48 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none z-20" />
          
          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory items-stretch pb-8 pt-4 -mx-6 px-6 md:mx-0 md:px-0 lg:pr-32"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {USE_CASES.map((useCase) => (
            <article 
              key={useCase.id}
              className="w-[300px] md:w-[350px] shrink-0 snap-center bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col h-auto group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-16 h-16 ${useCase.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {useCase.icon}
              </div>

              <div className="flex-grow">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                  {useCase.subtitle}
                </span>
                <h3 className="text-2xl font-bold mb-3 text-slate-900 tracking-tight">
                  {useCase.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
                  {useCase.description}
                </p>

                <div className="space-y-5 mb-8">
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs text-slate-900 mb-0.5">Safeeely Benefit</p>
                      <p className="text-xs text-slate-600 italic leading-snug">{useCase.benefit}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs text-slate-900 mb-0.5">Who Uses It?</p>
                      <p className="text-xs text-slate-600 leading-snug">{useCase.who}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-between items-center mt-auto">
                <span className="text-[10px] font-bold tracking-wider text-slate-300">
                  SEO: {useCase.seo}
                </span>
                <Link href="/pay">
                  <button className="bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-full py-2.5 px-6 shrink-0 text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md w-fit">
                    Join for Free <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </article>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
