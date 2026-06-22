export type ListingType = 'product' | 'service' | 'job';
export type FeeHandling = 'seller' | 'buyer' | 'split';

export const ALL_CATEGORIES: Record<ListingType, string[]> = {
    product: ['Electronics & Gadgets', 'Home & Garden', 'Fashion & Accessories', 'Vehicles & Parts', 'Real Estate', 'E-Books & Courses', 'Software & Assets'],
    service: ['Software Development', 'Graphics & Design', 'Digital Marketing', 'Writing & Translation', 'Video & Animation', 'Consulting & Legal', 'Virtual Assistance'],
    job: ['Engineering', 'Design', 'Sales', 'Customer Support'],
};

export const SUB_CATS: Record<string, string[]> = {
    'Electronics & Gadgets': ['Phones & Tablets', 'Laptops & Computers', 'Audio & Headphones', 'Cameras', 'Gaming', 'Smart Home', 'Wearables', 'Accessories'],
    'Graphics & Design': ['Logo & Branding', 'UI/UX Design', 'Illustration', 'Print Design', 'Social Media Graphics', 'Packaging', 'Motion Graphics', '3D Design'],
    'Engineering': ['Frontend Development', 'Backend Development', 'Mobile Development', 'DevOps & Cloud', 'Data Science & AI', 'Cybersecurity', 'Blockchain', 'QA & Testing'],
    'E-Books & Courses': ['Business & Finance', 'Technology', 'Design & Art', 'Marketing', 'Personal Development', 'Health & Fitness', 'Language Learning', 'Lifestyle'],
    'Writing & Translation': ['Copywriting', 'Technical Writing', 'Translation', 'Proofreading', 'Content Writing', 'Ghostwriting', 'SEO Writing', 'Academic Writing'],
    'Video & Animation': ['2D Animation', '3D Animation', 'Video Editing', 'Motion Graphics', 'Explainer Videos', 'Whiteboard Animation', 'VFX', 'Corporate Video'],
    'Home & Garden': ['Furniture', 'Garden & Outdoor', 'Home Decor', 'Kitchen & Dining', 'Bedding & Bath', 'Cleaning & Organization', 'Tools & DIY', 'Lighting'],
};

export const COMMON_FEATURES: Record<ListingType, string[]> = {
    product: ['Brand New', 'Original Packaging', 'Warranty Included', 'Free Shipping'],
    service: ['Fast Delivery', 'Revisions Included', 'Professional Support', 'Custom Solution'],
    job: ['Remote OK', 'Benefits Included', 'Stock Options', 'Relocation Support'],
};

export const CURRENCIES = [
    { code: 'USD', symbol: '$' }, { code: 'NGN', symbol: '₦' }, { code: 'GBP', symbol: '£' },
    { code: 'EUR', symbol: '€' }, { code: 'USDT', symbol: '₮' }, { code: 'BTC', symbol: '₿' },
    { code: 'ETH', symbol: 'Ξ' }, { code: 'SOL', symbol: '◎' }, { code: 'USDC', symbol: '¢' },
];

export const ORIGIN_COUNTRIES = [
    { code: 'Nigeria', flag: '🇳🇬' }, { code: 'Ghana', flag: '🇬🇭' }, { code: 'Kenya', flag: '🇰🇪' },
    { code: 'South Africa', flag: '🇿🇦' }, { code: 'United States', flag: '🇺🇸' }, { code: 'United Kingdom', flag: '🇬🇧' },
    { code: 'Canada', flag: '🇨🇦' }, { code: 'Australia', flag: '🇦🇺' }, { code: 'India', flag: '🇮🇳' }, { code: 'Germany', flag: '🇩🇪' },
];

export const DELIVERY_COUNTRIES = [...ORIGIN_COUNTRIES, { code: 'France', flag: '🇫🇷' }, { code: 'UAE', flag: '🇦🇪' }];

const SYM_MAP: Record<string, string> = { USD: '$', NGN: '₦', GBP: '£', EUR: '€', CAD: '$', USDT: '₮', BTC: '₿', ETH: 'Ξ', SOL: '◎', USDC: '¢', INR: '₹', JPY: '¥' };

export function fmtPrice(price: number, currency: string): string {
    return `${SYM_MAP[currency] || ''}${Number(price || 0).toLocaleString('en-US')}`;
}

export function fmtDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const TYPE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
    job: { bg: '#fffbeb', color: '#d97706', label: 'Job' },
    service: { bg: '#f0fdf4', color: '#16a34a', label: 'Service' },
    digital: { bg: '#fdf4ff', color: '#9333ea', label: 'Digital' },
    physical: { bg: '#eff6ff', color: '#2563eb', label: 'Physical' },
};

export function typeBadgeFor(listing: { category_type?: string; product_type?: string }) {
    if (listing.category_type === 'job') return TYPE_BADGE.job;
    if (listing.category_type === 'service') return TYPE_BADGE.service;
    if (listing.product_type === 'digital') return TYPE_BADGE.digital;
    return TYPE_BADGE.physical;
}

export const PALETTE_BG = ['#e0f2fe', '#f0fdf4', '#fef3c7', '#f5f3ff', '#fff1f2', '#ecfdf5'];
export const PALETTE_ICON = ['#0284c7', '#16a34a', '#d97706', '#7c3aed', '#e11d48', '#059669'];

export function feeHandlingLabel(h: string) {
    return h === 'seller' ? 'Seller pays all' : h === 'buyer' ? 'Buyer pays all' : 'Split 50/50';
}
