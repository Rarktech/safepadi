import { Navbar } from "@/components/Navbar";
import { MarketplaceHero } from "@/components/marketplace/MarketplaceHero";
import { FilterBar } from "@/components/marketplace/FilterBar";
import { MarketplaceList } from "@/components/marketplace/MarketplaceList";
import { Footer } from "@/components/home/Footer";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: "Marketplace | Safeeely - Secure Services & Products",
    description: "Browse verified services and products protected by Safeeely AI escrow. Find trusted providers worldwide.",
};

export default function MarketplacePage() {
    return (
        <main className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            
            <div className="flex-1 mt-16 md:mt-24">
                <MarketplaceHero />
                <FilterBar />
                <MarketplaceList />
            </div>

            <Footer />
        </main>
    );
}
