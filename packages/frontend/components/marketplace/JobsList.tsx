"use client";

import { useState, useEffect } from "react";
import { JobRow } from "./JobRow";
import { Briefcase, UserPlus } from "lucide-react";
import { useSearchParams } from "next/navigation";

export type JobIntent = 'hiring' | 'offering';

export interface JobListing {
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
    originCountryCode: string;
    geoScope: 'GLOBAL' | 'NATIONAL' | 'RESTRICTED';
}

const DUMMY_JOBS: JobListing[] = [
    {
        id: 1,
        intent: 'hiring',
        logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
        name: "DD.NYC (Client)",
        title: "Looking for Senior React Developer",
        location: "USA, Remote",
        rating: 4.8,
        reviews: 39,
        budgetOrRate: "$100,000 - $120,000 / yr",
        employmentType: "Full-time",
        description: "We are looking for an expert React developer to architect the next version of our AI-driven design platform. Must have deep experience with Next.js and Tailwind.",
        category: "Software Dev",
        tags: ["React", "Next.js", "TailwindCSS"],
        originCountryCode: 'US',
        geoScope: 'GLOBAL'
    },
    {
        id: 2,
        intent: 'offering',
        logo: "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80",
        name: "Safi Agency",
        title: "Available for Corporate Brand Redesign",
        location: "UK, London",
        rating: 4.9,
        reviews: 124,
        budgetOrRate: "$45 - $85 / hr",
        employmentType: "Contract / Freelance",
        description: "Award-winning agency available for corporate rebranding projects. We handle everything from logo design to full website overhauls using modern stacks.",
        category: "Design",
        tags: ["Figma", "Webflow", "Branding"],
        originCountryCode: 'UK',
        geoScope: 'NATIONAL'
    },
    {
        id: 3,
        intent: 'hiring',
        logo: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80",
        name: "DataTech Inc",
        title: "Machine Learning Engineer Needed",
        location: "Nigeria, Hybrid",
        budgetOrRate: "$70,000 / yr",
        employmentType: "Contract",
        description: "Need a dedicated ML engineer to train models on our proprietary datasets. Escrow funded immediately upon contract signing.",
        category: "Neural networks",
        tags: ["Python", "TensorFlow", "Generative AI"],
        originCountryCode: 'NG',
        geoScope: 'NATIONAL'
    },
    {
        id: 4,
        intent: 'offering',
        logo: "https://images.unsplash.com/photo-1573164574572-cb89e39749b4?w=800&q=80",
        name: "Alex Dev",
        title: "Smart Contract Auditor Available",
        location: "Worldwide, Remote",
        rating: 5.0,
        reviews: 12,
        budgetOrRate: "$150 / hr",
        employmentType: "Freelance",
        description: "10+ years auditing smart contracts. I can audit your solidity code for vulnerabilities before you deploy to mainnet.",
        category: "Web3",
        tags: ["Solidity", "Security", "Ethereum"],
        originCountryCode: 'GLOBAL',
        geoScope: 'GLOBAL'
    }
];

export function JobsList() {
    const searchParams = useSearchParams();
    const [filterIntent, setFilterIntent] = useState<'all' | 'hiring' | 'offering'>('all');

    // Extract URL search parameters
    const keywordQuery = searchParams?.get("q")?.toLowerCase() || "";
    const locationQuery = searchParams?.get("loc")?.toLowerCase() || "";
    const countryParam = searchParams?.get("c");

    // Read fallback country from local storage if 'c' isn't in URL, default to NG
    const activeCountry = typeof window !== 'undefined' 
        ? (countryParam || localStorage.getItem('safepadi_user_country') || 'NG') 
        : 'NG';

    const [liveJobs, setLiveJobs] = useState<JobListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams();
                if (keywordQuery) params.set('q', keywordQuery);
                if (locationQuery) params.set('loc', locationQuery);
                if (activeCountry) params.set('c', activeCountry);
                params.set('type', 'job'); // Critical: only fetch jobs
                
                if (filterIntent !== 'all') params.set('intent', filterIntent);

                const res = await fetch(`http://localhost:3000/api/marketplace?${params.toString()}`);
                if (!res.ok) {
                    setLiveJobs([]);
                    return;
                }
                const data = await res.json();
                setLiveJobs(data);
            } catch (err) {
                console.error('Error fetching jobs:', err);
                // Fallback to empty array if DB isn't running yet to prevent crash
                setLiveJobs([]); 
            } finally {
                setIsLoading(false);
            }
        };

        fetchJobs();
    }, [keywordQuery, locationQuery, activeCountry, filterIntent]);

    return (
        <div className="w-full max-w-7xl mx-auto px-6 pb-20 mt-2">
            
            {/* Intent Filter Tabs */}
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => setFilterIntent('all')}
                    className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${filterIntent === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                >
                    View All
                </button>
                <button 
                    onClick={() => setFilterIntent('hiring')}
                    className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${filterIntent === 'hiring' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                >
                    <Briefcase size={16} /> Looking to Hire
                </button>
                <button 
                    onClick={() => setFilterIntent('offering')}
                    className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${filterIntent === 'offering' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
                >
                    <UserPlus size={16} /> Available for Work
                </button>
            </div>

            {/* Table Headers */}
            <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-slate-100 items-center">
                <div className="col-span-1" />
                <div className="col-span-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Listing Info</div>
                <div className="col-span-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">Budget / Rate</div>
                <div className="col-span-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">Type</div>
                <div className="col-span-2" />
            </div>

            {/* Rows */}
            <div className={`bg-white border border-slate-100 rounded-[32px] overflow-hidden ${liveJobs.length === 0 ? 'border-none bg-transparent' : 'shadow-sm'}`}>
                {liveJobs.length === 0 && !isLoading ? (
                    <div className="w-full py-20 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[32px]">
                        <Briefcase className="w-12 h-12 text-slate-200 mb-4" />
                        <h3 className="text-xl font-black text-slate-900">No listing available at the moment</h3>
                        <p className="text-slate-500 font-medium">Try adjusting your origin country or keyword search.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {liveJobs.map((job: any, idx: number) => (
                            <JobRow 
                                key={job.id} 
                                index={idx + 1}
                                id={job.id}
                                intent={job.intent as 'hiring'|'offering'}
                                logo={job.profiles?.avatar_url || "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80"}
                                name={job.profiles?.first_name ? `${job.profiles.first_name} ${job.profiles.last_name}` : `@${job.profiles?.safetag || 'Unknown'}`}
                                title={job.title}
                                location={job.location_type || 'Remote'}
                                rating={4.9} 
                                reviews={job.views_count || 0} 
                                budgetOrRate={`$${job.price}`}
                                employmentType={job.employment_type || 'Contract'}
                                description={job.description}
                                category={job.category_type}
                                tags={job.tags}
                            />
                        ))}
                    </div>
                )}
            </div>
            
            {liveJobs.length > 0 && (
                <div className="flex justify-center mt-12">
                    <button className="px-8 py-4 rounded-full bg-slate-100 text-sm font-black text-slate-500 hover:bg-slate-200 transition-all shadow-sm">
                        Load More Listings (24 available)
                    </button>
                </div>
            )}
        </div>
    );
}
