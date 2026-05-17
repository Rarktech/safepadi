export type Platform = 'telegram' | 'discord' | 'whatsapp' | 'instagram';

export type TransactionStatus =
  // Active lifecycle
  | 'PENDING_SELLER_ACCEPTANCE'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'PAID'
  | 'AWAITING_PROOF'
  | 'COMPLETED_BY_SELLER'
  | 'FINALIZED'
  // Dispute outcomes
  | 'DISPUTED'
  | 'CANCELLED'
  | 'RESOLVED_SPLIT'
  | 'RETURN_PENDING';

export type DisputeVerdictAction = 'REFUND_BUYER' | 'PAY_SELLER' | 'SPLIT' | 'REFUND_AFTER_RETURN';

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
  last_message_at?: string;
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

export interface PlatformFeedback {
  id: string;
  profile_id: string;
  rating: number;
  comment?: string;
  source: 'post_txn_complete' | 'post_dispute_resolved' | 'menu';
  source_ref_id?: string;
  platform: string;
  status: 'NEW' | 'TRIAGED' | 'RESOLVED' | 'DISMISSED';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}
