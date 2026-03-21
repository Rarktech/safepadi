-- Create waitlist table for capturing emails and phone numbers from the CTA section
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: We allow both email or phone number in case we want to expand it later.

-- Index for faster retrieval if needed
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist(created_at);
