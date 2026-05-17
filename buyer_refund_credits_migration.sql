-- ============================================================
-- Safeeely — Buyer Refund Credits
-- Tracks pending refunds owed to buyers after REFUND_BUYER
-- or SPLIT verdicts. Admin uses this table to process payouts.
-- ============================================================

CREATE TABLE IF NOT EXISTS buyer_refund_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    dispute_id UUID REFERENCES disputes(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL,
    refund_type TEXT NOT NULL DEFAULT 'FULL' CHECK (refund_type IN ('FULL', 'SPLIT_SHARE', 'RETURN_CONFIRMED')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'ISSUED', 'FAILED')),
    resolution_source TEXT DEFAULT 'AI' CHECK (resolution_source IN ('AI', 'ADMIN', 'SLA', 'RETURN_CONFIRMED')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    issued_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_refund_credits_buyer
    ON buyer_refund_credits (buyer_id, status);

CREATE INDEX IF NOT EXISTS idx_buyer_refund_credits_transaction
    ON buyer_refund_credits (transaction_id);
