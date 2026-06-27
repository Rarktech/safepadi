export const ADMIN_SPECIALTIES = [
    { value: 'fraud',         label: 'Account & Identity Fraud' },
    { value: 'security',      label: 'Security & Scam Detection' },
    { value: 'service_issue', label: 'Service & Freelance Disputes' },
    { value: 'digital_goods', label: 'Digital Goods & Downloads' },
    { value: 'non_delivery',  label: 'Non-Delivery & Logistics' },
    { value: 'product',       label: 'Physical Product Quality' },
    { value: 'ecommerce',     label: 'E-Commerce & Marketplace' },
    { value: 'crypto',        label: 'Crypto Transactions' },
    { value: 'logistics',     label: 'Dispatch & Delivery' },
    { value: 'general',       label: 'General Disputes' },
] as const;

export type AdminSpecialtyValue = typeof ADMIN_SPECIALTIES[number]['value'];
