-- Create dispute_messages table for AI-mediated chat
CREATE TABLE dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id), -- Nullable for AI
    sender_type TEXT NOT NULL CHECK (sender_type IN ('USER', 'AI')),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster message retrieval
CREATE INDEX idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
