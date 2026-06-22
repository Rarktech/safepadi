'use client';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { MapPin, Star, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { fmtPrice, fmtDate, typeBadgeFor, feeHandlingLabel } from './marketplace-data';

export function ListingDetailPanel({ listing, onClose }: { listing: any | null; onClose: () => void }) {
    const open = !!listing;
    const badge = listing ? typeBadgeFor(listing) : null;
    const seller = listing?.profiles;
    const sellerName = seller?.safetag || '@unknown';

    const handlePay = () => {
        if (seller?.safetag) {
            navigator.clipboard?.writeText(seller.safetag).catch(() => {});
        }
        toast.success(`${sellerName} copied`, {
            description: 'Message them on Telegram, Discord or WhatsApp to start an escrow transaction with Safeeely.',
        });
    };

    return (
        <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col gap-0 bg-white">
                {listing && (
                    <>
                        <div className="px-6 pt-5 pb-4 border-b border-[#f1f5f9] flex-shrink-0">
                            <SheetTitle className="font-['Inter_Tight',sans-serif] text-[17px] font-extrabold text-[#0f172a] tracking-[-.01em]">Listing details</SheetTitle>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {/* Hero image */}
                            <div className="w-full aspect-[16/10] rounded-2xl overflow-hidden bg-[#f1f5f9] mb-[18px]">
                                {listing.images?.[0] ? (
                                    <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#94a3b8] text-sm font-semibold">No image</div>
                                )}
                            </div>

                            {/* Title + price */}
                            <div className="flex items-start justify-between gap-[10px] mb-[14px]">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-['Inter_Tight',sans-serif] text-xl font-black text-[#0f172a] tracking-[-.02em] leading-[1.2] mb-[6px]">{listing.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-bold" style={{ background: badge!.bg, color: badge!.color }}>{badge!.label}</span>
                                        <div className="flex items-center gap-[3px]">
                                            <Star size={11} className="fill-[#f59e0b] text-[#f59e0b]" />
                                            <span className="text-[11px] font-bold text-[#0f172a]">5.0</span>
                                            <span className="text-[10.5px] text-[#94a3b8]">({listing.views_count || 0})</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="font-['Inter_Tight',sans-serif] text-2xl font-black text-[#0f172a] tracking-[-.03em] leading-none">{fmtPrice(listing.price, listing.currency)}</p>
                                    <p className="text-[10px] font-bold text-[#94a3b8] tracking-[.05em]">ESCROW</p>
                                </div>
                            </div>

                            {/* Seller card */}
                            <div className="bg-[#f7f8f9] rounded-2xl px-4 py-[14px] flex items-center gap-[11px] mb-[14px] border border-[#e9eaec]">
                                <div className="w-10 h-10 rounded-full bg-[#0f172a] flex items-center justify-center font-['Inter_Tight',sans-serif] text-base font-black text-[#10b981] flex-shrink-0">
                                    {sellerName.charAt(1)?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-[6px] mb-[2px]">
                                        <p className="text-[13.5px] font-extrabold text-[#0f172a]">{sellerName}</p>
                                        <ShieldCheck size={13} className="text-[#10b981]" />
                                    </div>
                                    <p className="text-[11px] text-[#94a3b8]">{listing.origin_country || 'Worldwide'} · Posted {fmtDate(listing.created_at)}</p>
                                </div>
                                <div className="text-xs font-bold text-[#94a3b8]">{listing.views_count || 0} views</div>
                            </div>

                            {/* Description */}
                            <div className="bg-[#0f172a] rounded-2xl px-[18px] py-4 mb-[14px]">
                                <p className="text-[10px] font-bold tracking-[.07em] mb-[6px]" style={{ color: 'rgba(255,255,255,.35)' }}>DESCRIPTION</p>
                                <p className="text-[13px] leading-[1.65]" style={{ color: 'rgba(255,255,255,.65)' }}>{listing.description || 'No description provided.'}</p>
                            </div>

                            {/* Features */}
                            {listing.features?.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-[11px] font-bold text-[#94a3b8] tracking-[.04em] mb-[9px]">FEATURES</p>
                                    <div className="flex flex-wrap gap-[7px]">
                                        {listing.features.map((f: string) => (
                                            <div key={f} className="flex items-center gap-[6px] px-[13px] py-[7px] rounded-full bg-[#f0fdf4] border border-[#bbf7d0]">
                                                <CheckCircle2 size={11} className="text-[#16a34a]" />
                                                <span className="text-[11.5px] font-semibold text-[#15803d]">{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Fee handling */}
                            <div className="rounded-[13px] border border-[#e9eaec] overflow-hidden mb-4">
                                <div className="flex justify-between px-4 py-[11px] border-b border-[#f3f4f6] bg-[#fafafa]">
                                    <span className="text-xs text-[#64748b] font-medium">Fee handling</span>
                                    <span className="text-xs font-bold text-[#0f172a]">{feeHandlingLabel(listing.fee_handling)}</span>
                                </div>
                                <div className="flex justify-between px-4 py-[11px] border-b border-[#f3f4f6]">
                                    <span className="text-xs text-[#64748b] font-medium">Geographic scope</span>
                                    <span className="text-xs font-bold text-[#0f172a]">{listing.geo_scope === 'RESTRICTED' ? 'Restricted regions' : 'Available worldwide'}</span>
                                </div>
                                <div className="flex justify-between px-4 py-[11px]">
                                    <span className="text-xs text-[#64748b] font-medium flex items-center gap-1"><MapPin size={11} /> Location</span>
                                    <span className="text-xs font-bold text-[#0f172a]">{listing.origin_country || 'Worldwide'}</span>
                                </div>
                            </div>
                        </div>

                        {/* CTA footer */}
                        <div className="px-6 pt-[14px] pb-5 border-t border-[#f1f5f9] flex-shrink-0 flex gap-[10px]">
                            <button onClick={onClose} className="flex-1 h-[46px] rounded-full border border-[#e9eaec] bg-[#f7f8f9] text-[#64748b] font-semibold text-sm">Close</button>
                            <button onClick={handlePay} className="flex-[2] h-[46px] rounded-full bg-[#10b981] text-white font-bold text-sm flex items-center justify-center gap-[7px] shadow-[0_4px_14px_rgba(16,185,129,.28)]">
                                <ShieldCheck size={14} />
                                Pay with Safeeely
                            </button>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
