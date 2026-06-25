-- Lets a buyer flag which phase of a MILESTONE transaction a dispute is about.
-- Nullable and backward compatible: ONE_TIME disputes and any dispute raised
-- before this migration keep milestone_id = NULL, and continue to mean
-- "dispute about the whole remaining transaction" exactly as today.
ALTER TABLE public.disputes
    ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.transaction_milestones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_disputes_milestone_id ON public.disputes(milestone_id);
