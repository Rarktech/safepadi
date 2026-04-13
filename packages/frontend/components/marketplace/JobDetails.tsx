"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Star, 
    ShieldCheck, 
    Share2, 
    AlertTriangle,
    CheckCircle2,
    Briefcase,
    UserPlus,
    FileText,
    MessageCircle,
    Info,
    ArrowRight
} from 'lucide-react';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/home/Footer";
import { Button } from "@/components/ui/button";
import { TrustScore } from "@/components/withdraw/DashboardSections";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export type FeeAllocation = 'split' | 'buyer' | 'seller';

interface JobDetailsProps {
    id: string;
    jobData: any;
}

export function JobDetails({ id, jobData }: JobDetailsProps) {
    const router = useRouter();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [activeImage, setActiveImage] = useState(0);

    const job = jobData || {
        id: id,
        intent: 'hiring',
        title: "Senior React Developer Needed",
        budgetStr: "$100,000 - $120,000 USD",
        feeAllocation: 'buyer' as FeeAllocation,
        location: "Remote, USA",
        category: "Software Development",
        employmentType: "Full-time",
        description: "We are an AI agency looking for an expert React developer to architect the next version of our design platform. You must have deep experience with Next.js, Server Components, and TailwindCSS. The ideal candidate will have 5+ years of experience shipping production web applications. \n\nExpected responsibilities include: \n- Designing frontend architecture\n- Reviewing PRs from junior devs\n- Integrating complex LLM API streams into the UI.",
        images: [
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
            "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80"
        ],
        poster: { id: "1", name: "DD.NYC", safetag: "dd_nyc_agency", trustScore: 98, totalTrades: 45000, reviews: 39 },
        tags: ["React", "Next.js", "TailwindCSS", "TypeScript"]
    };

    const isHiring = job.intent === 'hiring';

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: job.title,
                    text: job.description,
                    url: window.location.href,
                });
            } catch (err) {
                console.log("Error sharing:", err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
        }
    };

    const handleOpenChat = () => {
        // In a real app, this would open a new tab to WhatsApp/Telegram linking to the poster's number/username
        window.open(`https://wa.me/something`, '_blank');
        setChatModalOpen(false);
    };

    return (
        <main className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            <div className="flex-1 mt-16 md:mt-24 px-4 sm:px-6 py-8 pb-32">
                <div className="max-w-7xl mx-auto">

                    {/* SEO/Breadcrumbs */}
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                        <span className="hover:text-emerald-500 cursor-pointer">Marketplace</span> 
                        <span className="mx-2 font-normal text-slate-300">/</span> 
                        <span className="hover:text-emerald-500 cursor-pointer">Jobs</span>
                        <span className="mx-2 font-normal text-slate-300">/</span> 
                        <span className="text-slate-600 truncate">{job.title}</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* LEFT COLUMN: Media & Meta Box */}
                        <div className="lg:col-span-5 space-y-6">
                            
                            {/* Image Gallery */}
                            <div className="bg-white rounded-[32px] p-2 border border-slate-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-6 left-6 z-10 flex gap-2">
                                    {isHiring ? (
                                        <span className="bg-blue-50/90 backdrop-blur-sm shadow-sm text-blue-600 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                            <Briefcase size={12} /> Hiring
                                        </span>
                                    ) : (
                                        <span className="bg-emerald-50/90 backdrop-blur-sm shadow-sm text-emerald-600 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                            <UserPlus size={12} /> Offering
                                        </span>
                                    )}
                                </div>
                                <div className="aspect-[4/3] rounded-[24px] bg-slate-50 overflow-hidden border border-slate-100">
                                    <img src={job.images[activeImage]} alt={job.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                </div>
                                {job.images.length > 1 && (
                                    <div className="flex gap-2 mt-2 px-2 overflow-x-auto no-scrollbar snap-x pb-2">
                                        {job.images.map((img: string, idx: number) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => setActiveImage(idx)}
                                                className={`snap-center shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all ${activeImage === idx ? 'border-emerald-500 opacity-100 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                            >
                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Escrow Target Financials Block */}
                            <div className="bg-white p-8 rounded-[32px] border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 shadow-sm space-y-6">
                                <div>
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                        {isHiring ? 'Budget' : 'Rate'}
                                    </h3>
                                    <div className="text-3xl font-black text-slate-900 tracking-tight">{job.budgetStr}</div>
                                </div>
                                
                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <Info size={16} className="strokewidth-3" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 leading-none mb-1.5 flex items-center gap-2">
                                            Escrow Fee Terms
                                        </h4>
                                        <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                                            {job.feeAllocation === 'split' ? "The 5% Safeeely platform fee will be split 50/50 between the Poster and Responder." :
                                             job.feeAllocation === 'buyer' ? "The 5% Safeeely platform fee will be covered entirely by the Hiring Party." :
                                             "The 5% Safeeely platform fee will be covered entirely by the Service Provider."}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Button 
                                        className="w-full h-14 rounded-2xl bg-[#0a2d1d] hover:bg-[#05140b] text-white font-black text-lg shadow-xl"
                                        onClick={() => setChatModalOpen(true)}
                                    >
                                        <MessageCircle size={20} className="mr-2" /> 
                                        Discuss & Negotiate
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        className="w-full h-14 rounded-2xl border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-black text-base shadow-sm"
                                    >
                                        <ShieldCheck size={20} className="mr-2" /> 
                                        Initiate Escrow
                                    </Button>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN: Description & Poster Info */}
                        <div className="lg:col-span-7 space-y-8">
                            
                            <div className="flex justify-between items-start gap-4">
                                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                                    {job.title}
                                </h1>
                                <button onClick={handleShare} className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-200 transition-all shrink-0">
                                    <Share2 size={18} />
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                                        {job.poster.name[0]}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
                                            {job.poster.name}
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-400">@{job.poster.safetag}</div>
                                    </div>
                                </div>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-bold text-slate-500">{job.employmentType}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                    <span className="text-sm font-bold text-slate-500">{job.location}</span>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                                <div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                                        About The {isHiring ? 'Role / Task' : 'Services Offered'}
                                    </h3>
                                    <div className={`text-slate-600 leading-relaxed font-medium ${isDescriptionExpanded ? '' : 'line-clamp-4'}`}>
                                        <div dangerouslySetInnerHTML={{ __html: job.description.replace(/\n/g, '<br/>') }} />
                                    </div>
                                    {job.description.length > 250 && (
                                        <button 
                                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                            className="mt-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 underline"
                                        >
                                            {isDescriptionExpanded ? 'Read Less' : 'Read Full Description...'}
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                                        Key Highlights
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {job.tags.map((tag: string) => (
                                            <div key={tag} className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                <span className="text-xs font-bold text-slate-700">{tag}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Trust Section */}
                            <div className="pt-4">
                                <h2 className="text-2xl font-black text-slate-900 mb-6">
                                    About The {isHiring ? 'Employer' : 'Provider'}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <TrustScore score={job.poster.trustScore} totalTrades={job.poster.totalTrades} />
                                    
                                    <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-1 mb-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={16} className={i < Math.floor(job.poster.reviews / 10) || i === 4 ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"} />
                                                ))}
                                            </div>
                                            <h4 className="font-black text-slate-900 text-lg mb-1">Top Rated Poster</h4>
                                            <p className="text-sm font-medium text-slate-500">Consistently delivers fast releases and great communication.</p>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            className="w-full mt-6 rounded-xl border-slate-200 font-bold"
                                            onClick={() => router.push(`/reviews/${job.poster.safetag}`)}
                                        >
                                            View All {job.poster.reviews} Reviews
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PRE-CHAT SAFETY MODAL */}
            <Dialog open={chatModalOpen} onOpenChange={setChatModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[32px] p-8 border-none bg-white shadow-2xl">
                    <DialogHeader className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center border-4 border-amber-50">
                            <ShieldCheck size={28} className="text-amber-500" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-center text-slate-900">Protect Your Deal 🛡️</DialogTitle>
                        <DialogDescription className="text-center font-medium text-slate-500 text-base leading-relaxed">
                            You are about to chat directly with <span className="font-bold text-slate-900">{job.poster.name}</span>. 
                            <br/><br/>
                            Please remember, for your financial protection, <span className="font-black text-emerald-600">constantly return to Safeeely</span> to initiate and fund the escrow contract before starting any work or sending any assets.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-amber-50 rounded-xl p-4 mt-2 flex items-start gap-3 border border-amber-100">
                        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-xs font-bold text-amber-800">
                            Safeeely cannot protect funds sent outside of the platform via direct bank transfer or independent crypto wallets.
                        </span>
                    </div>
                    <DialogFooter className="mt-8 flex-col sm:flex-col gap-3">
                        <Button 
                            className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-lg shadow-xl"
                            onClick={handleOpenChat}
                        >
                            I Understand, Open Chat <ArrowRight size={18} className="ml-2" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="w-full h-12 rounded-2xl font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            onClick={() => setChatModalOpen(false)}
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Footer />
        </main>
    );
}
