export type Platform = 'telegram' | 'discord' | 'whatsapp' | 'instagram';

export type TransactionStatus = 
  | 'PENDING_SELLER_ACCEPTANCE'
  | 'PENDING_BUYER_ACCEPTANCE'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_RECEIVED'
  | 'AWAITING_DELIVERY'
  | 'AWAITING_CONFIRMATION'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'CANCELLED'
  | 'REFUNDED';

export type FeeAllocation = 'buyer' | 'seller' | 'split';

export interface Profile {
  id: string;
  safetag: string;
  email: string;
  first_name?: string;
  last_name?: string;
  primary_platform: Platform;
  created_at: string;
}

export interface LinkedAccount {
  id: string;
  profile_id: string;
  platform: Platform;
  platform_id: string;
  is_primary: boolean;
}

export interface Transaction {
  id: string;
  txn_code: string;
  buyer_id: string;
  seller_id: string;
  product_name: string;
  description?: string;
  amount: number;
  currency: string;
  fee_allocation: FeeAllocation;
  fee_amount: number;
  total_amount: number;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
}

export interface Dispute {
  id: string;
  transaction_id: string;
  raised_by: string;
  reason: string;
  status: string;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
}
