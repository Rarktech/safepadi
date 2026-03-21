-- Create transaction_proofs table for delivery confirmations
CREATE TABLE IF NOT EXISTS public.transaction_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_transaction_proofs_transaction_id ON public.transaction_proofs(transaction_id);
