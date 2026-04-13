import { Metadata } from "next";
import { ListingDetails } from "@/components/marketplace/ListingDetails";

type Props = {
    params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    try {
        const resolvedParams = await params;
        const res = await fetch(`http://127.0.0.1:3000/api/marketplace/${resolvedParams.id}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Not found');
        const product = await res.json();

        return {
            title: `${product.title} | Safeeely Marketplace`,
            description: product.description.substring(0, 160),
            openGraph: {
                title: product.title,
                description: product.description,
                images: product.images && product.images.length > 0 ? [product.images[0]] : [],
            },
        };
    } catch (e) {
        return { title: 'Listing Not Found | Safeeely' };
    }
}

export default async function ListingPage({ params }: Props) {
    let productData = null;
    
    try {
        const resolvedParams = await params;
        const res = await fetch(`http://127.0.0.1:3000/api/marketplace/${resolvedParams.id}`, { cache: 'no-store' });
        if (res.ok) {
            const rawData = await res.json();
            // Map the pure database object to match the component's internal UI expectations
            productData = {
                id: rawData.id,
                title: rawData.title,
                price: Number(rawData.price || 0).toLocaleString(),
                currency: rawData.currency,
                location: rawData.origin_country || "Worldwide",
                category: rawData.category_type,
                condition: "New", // Map condition if added to DB later
                description: rawData.description,
                images: rawData.images && rawData.images.length > 0 ? rawData.images : ["https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80"],
                seller: {
                    safetag: rawData.profiles?.safetag || "unknown",
                    firstName: rawData.profiles?.first_name || "",
                    lastName: rawData.profiles?.last_name || "",
                    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${rawData.profiles?.safetag || 'U'}&backgroundColor=f1f5f9`,
                    trustScore: 100, // Mocked for now, tie to reviews later
                    totalTrades: rawData.views_count || 0, // Using views as a placeholder for popularity
                    reviews: []
                },
                features: rawData.features || []
            };
        }
    } catch (err) {
        console.error("Listing page fetch error:", err);
    }

    if (!productData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Listing Not Found</h1>
                    <p className="text-slate-500 font-medium">This product may have been removed or sold.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Product",
                        "name": productData.title,
                        "description": productData.description,
                        "image": productData.images,
                        "offers": {
                            "@type": "Offer",
                            "price": productData.price.replace(/[^0-9.]/g, ''),
                            "priceCurrency": "USD"
                        }
                    })
                }}
            />
            <ListingDetails id={(await params).id} productData={productData} />
        </>
    );
}
