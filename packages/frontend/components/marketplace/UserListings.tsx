"use client";

import { useState, useEffect } from "react";
import { 
    MoreVertical, 
    Edit, 
    Trash2, 
    Eye, 
    ShoppingBag, 
    Wrench, 
    Briefcase,
    TrendingUp,
    MessageCircle,
    SearchX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

interface UserListingsProps {
    onEdit?: (id: string) => void;
}

export function UserListings({ onEdit }: UserListingsProps) {
    const [myListings, setMyListings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'product' | 'service' | 'job'>('all');

    useEffect(() => {
        const fetchMyListings = async () => {
            try {
                // Warning: Temp ID matching what we put in CreateListingForm
                const profileId = 'bab0ea44-99e2-47a8-be54-a80cac8ee5bf'; 
                const res = await fetch(`http://127.0.0.1:3000/api/marketplace/user/${profileId}`);
                if (!res.ok) throw new Error('API Sync Failed');
                const data = await res.json();
                setMyListings(data);
            } catch (err) {
                console.error("Failed to load user listings:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyListings();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Listings</h2>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                    {['all', 'product', 'service', 'job'].map((tab) => (
                        <Button 
                            key={tab}
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setActiveTab(tab as any)}
                            className={`font-bold text-xs capitalize ${activeTab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab === 'all' ? 'All' : `${tab}s`}
                        </Button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="w-full h-40 flex items-center justify-center border border-slate-100 rounded-[24px] bg-slate-50/50">
                    <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : myListings.length === 0 ? (
                <div className="w-full py-20 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[24px]">
                    <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-xl mb-4">
                        <SearchX className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">No listing available at the moment</h3>
                    <p className="text-slate-500 font-medium">You haven't posted any products, services, or jobs yet.</p>
                </div>
            ) : (() => {
                const filteredListings = activeTab === 'all' ? myListings : myListings.filter(l => l.category_type === activeTab);
                
                if (filteredListings.length === 0) {
                    return (
                        <div className="w-full py-16 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[24px]">
                            <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-xl mb-4">
                                <SearchX className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">No {activeTab}s found</h3>
                            <p className="text-slate-500 font-medium">You don't have any active {activeTab}s at the moment.</p>
                        </div>
                    );
                }

                return (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredListings.map((l) => (
                    <div key={l.id} className="group bg-white border border-slate-100 p-5 rounded-[24px] hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col md:flex-row items-center gap-6">
                        <div className="w-24 h-24 rounded-[20px] overflow-hidden bg-slate-100 shrink-0 border-2 border-white shadow-sm">
                            <img src={l.images && l.images.length > 0 ? l.images[0] : 'https://picsum.photos/seed/placeholder/200/200'} className="w-full h-full object-cover" alt={l.title} />
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                {l.category_type === 'product' ? <ShoppingBag size={14} className="text-blue-500" /> : l.category_type === 'service' ? <Wrench size={14} className="text-emerald-500" /> : <Briefcase size={14} className="text-amber-500" />}
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{l.category_type}</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 leading-tight mb-2">{l.title}</h3>
                            <div className="flex items-center justify-center md:justify-start gap-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${l.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {l.status}
                                </span>
                                <span className="text-sm font-bold text-slate-900">${l.price}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 px-6 border-x border-slate-50 hidden lg:flex">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Views</span>
                                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                    <Eye size={14} /> {l.views_count || 0}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                className="rounded-xl font-bold h-11 px-5 border-slate-100 text-slate-600 hover:bg-slate-50"
                                onClick={() => onEdit && onEdit(l.id)}
                            >
                                <Edit size={16} className="mr-2" /> Edit
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="w-11 h-11 p-0 rounded-xl hover:bg-slate-100">
                                        <MoreVertical size={20} className="text-slate-400" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 p-2 min-w-[160px]">
                                    <Link href={`/marketplace/${l.id}`}>
                                        <DropdownMenuItem className="rounded-xl font-bold text-slate-600 text-xs py-3 cursor-pointer">
                                            <Eye size={14} className="mr-2" /> View Public Page
                                        </DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuItem className="rounded-xl font-bold text-slate-600 text-xs py-3 cursor-pointer">
                                        <MessageCircle size={14} className="mr-2" /> View Inquiries
                                    </DropdownMenuItem>
                                    <div className="h-px bg-slate-50 my-1" />
                                    <DropdownMenuItem className="rounded-xl font-bold text-rose-500 text-xs py-3 cursor-pointer hover:bg-rose-50">
                                        <Trash2 size={14} className="mr-2" /> Delete Listing
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        </div>
                    ))}
                </div>
            );
        })()}
        </div>
    );
}
