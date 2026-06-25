-- Ties delivery proof files to a specific milestone phase instead of only the
-- parent transaction, so multi-phase deliveries don't get commingled. Nullable
-- and backward compatible: ONE_TIME transactions and any proofs uploaded before
-- this migration keep milestone_id = NULL.
ALTER TABLE public.transaction_proofs
    ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.transaction_milestones(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_transaction_proofs_milestone_id ON public.transaction_proofs(milestone_id);
