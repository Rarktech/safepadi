"use client";

import { Star, FileText, ChevronDown, CheckCircle2, Briefcase, UserPlus } from "lucide-react";
import type { JobIntent } from "./JobsList";
import Link from "next/link";

interface JobRowProps {
    index: number;
    id: number;
    intent: JobIntent;
    logo: string;
    name: string;
    title: string;
    location: string;
    rating?: number;
    reviews?: number;
    budgetOrRate: string;
    employmentType: string;
    description: string;
    category: string;
    tags: string[];
}

export function JobRow({ 
    index, 
    id,
    intent,
    logo, 
    name, 
    title,
    location, 
    rating, 
    reviews, 
    budgetOrRate, 
    employmentType, 
    description, 
    tags,
    category 
}: JobRowProps) {
    const isHiring = intent === 'hiring';

    return (
        <div className="bg-white border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
            {/* Primary Info Row */}
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 px-4 sm:px-8 py-6 lg:py-8 lg:items-center cursor-pointer">
                <div className="hidden lg:block text-sm font-bold text-slate-400 w-8 shrink-0">
                    {index}
                </div>
                
                <div className="flex-1 flex items-start gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm shrink-0 mt-1">
                        <img src={logo} alt={name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {isHiring ? (
                                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                    <Briefcase size={10} /> Hiring
                                </span>
                            ) : (
                                <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                    <UserPlus size={10} /> Offering
                                </span>
                            )}
                        </div>
                        <Link href={`/marketplace/jobs/${id}`} className="hover:text-emerald-600 transition-colors">
                            <span className="text-base font-black text-slate-900 truncate block">{title}</span>
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-slate-500 truncate">{name}</span>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 fill-emerald-50/50" />
                            <span className="text-xs font-bold text-slate-400 truncate">• {location}</span>
                        </div>
                        {rating && reviews && (
                            <div className="flex items-center gap-1 mt-1.5">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span className="text-xs font-black text-slate-900">{rating}</span>
                                <span className="text-[10px] font-bold text-slate-400 underline cursor-pointer">{reviews} Reviews</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap lg:contents gap-4 mt-4 lg:mt-0 items-center justify-between">
                    <div className="flex flex-col lg:w-48 shrink-0">
                        <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Budget / Rate</span>
                        <span className="text-sm font-black text-slate-900 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 w-fit">{budgetOrRate}</span>
                    </div>

                    <div className="flex flex-col lg:w-32 shrink-0">
                        <span className="lg:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Type</span>
                        <span className="text-sm font-bold text-slate-500">{employmentType}</span>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 justify-end">
                        <Link href={`/marketplace/jobs/${id}`} className="flex-1 lg:flex-none">
                            <button className="w-full lg:w-auto h-10 px-6 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-md hover:bg-slate-800 transition-all whitespace-nowrap">
                                {isHiring ? 'Apply' : 'Hire Me'}
                            </button>
                        </Link>
                        <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all border border-slate-100 shrink-0">
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded Content Row */}
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 px-4 sm:px-8 pb-6 lg:pb-8">
                <div className="hidden lg:block w-8 shrink-0" />
                <div className="flex-1 flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex gap-4 max-w-xl">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider mt-1">Details</span>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2">
                            {description}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none bg-slate-100 px-2 py-1 rounded inline-block w-max">
                            {category}
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                                <span key={tag} className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
