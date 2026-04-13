import { Navbar } from "@/components/Navbar";
import { MarketplaceHero } from "@/components/marketplace/MarketplaceHero";
import { FilterBar } from "@/components/marketplace/FilterBar";
import { JobsList } from "@/components/marketplace/JobsList";
import { Footer } from "@/components/home/Footer";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: "Jobs Marketplace | Safeeely - Find Verified AI Agencies & Roles",
    description: "Browse verified jobs, agencies, and roles protected by Safeeely AI escrow. Secure your next collaboration.",
};

export default function JobsPage() {
    return (
        <main className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            
            <div className="flex-1 mt-16 md:mt-24">
                <MarketplaceHero />
                <FilterBar />
                <JobsList />
            </div>

            <Footer />
        </main>
    );
}
