-- Payout system enhancements: idempotency, dual-approval, provider tracking

ALTER TABLE withdrawals
    ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS provider_order_no TEXT,
    ADD COLUMN IF NOT EXISTS provider_response JSONB,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

-- Backfill idempotency_key for existing rows that don't have one
UPDATE withdrawals SET idempotency_key = gen_random_uuid() WHERE idempotency_key IS NULL;

-- Atomic withdrawal creation with advisory lock to prevent double-spend race condition.
-- Uses pg_advisory_xact_lock so two concurrent requests for the same profile cannot
-- both pass the balance check and both insert.
CREATE OR REPLACE FUNCTION create_withdrawal_atomic(
    p_profile_id       UUID,
    p_amount           NUMERIC,
    p_currency         TEXT,
    p_payout_method_id UUID,
    p_details          JSONB,
    p_idempotency_key  UUID,
    p_requires_approval BOOLEAN DEFAULT FALSE
) RETURNS TABLE(
    out_id         UUID,
    out_reference  TEXT,
    out_status     TEXT,
    out_error      TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    v_earnings         NUMERIC := 0;
    v_pending_out      NUMERIC := 0;
    v_available        NUMERIC;
    v_new_id           UUID    := gen_random_uuid();
    v_ref              TEXT    := 'WD-' || UPPER(SUBSTRING(p_idempotency_key::TEXT, 1, 8));
    v_initial_status   TEXT;
BEGIN
    -- Advisory lock scoped to this transaction — prevents concurrent inserts for same profile
    PERFORM pg_advisory_xact_lock(('x' || MD5(p_profile_id::TEXT))::BIT(64)::BIGINT);

    -- Compute seller earnings for this currency
    SELECT COALESCE(SUM(amount), 0) INTO v_earnings
    FROM transactions
    WHERE seller_id = p_profile_id
      AND currency  = p_currency
      AND status    IN ('FINALIZED', 'COMPLETED');

    -- Sum milestone-released amounts
    v_earnings := v_earnings + COALESCE((
        SELECT SUM(tm.amount)
        FROM transaction_milestones tm
        JOIN transactions t ON t.id = tm.transaction_id
        WHERE t.seller_id = p_profile_id
          AND t.currency  = p_currency
          AND tm.status   = 'RELEASED'
    ), 0);

    -- Subtract pending/processing withdrawals already in flight
    SELECT COALESCE(SUM(amount), 0) INTO v_pending_out
    FROM withdrawals
    WHERE profile_id = p_profile_id
      AND currency   = p_currency
      AND status     IN ('PROCESSING', 'PENDING', 'PENDING_APPROVAL');

    v_available := v_earnings - v_pending_out;

    IF p_amount > v_available THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, 'INSUFFICIENT_BALANCE';
        RETURN;
    END IF;

    v_initial_status := CASE WHEN p_requires_approval THEN 'PENDING_APPROVAL' ELSE 'PROCESSING' END;

    INSERT INTO withdrawals (
        id, profile_id, payout_method_id, amount, currency,
        status, reference, idempotency_key, details, requires_approval
    ) VALUES (
        v_new_id, p_profile_id, p_payout_method_id, p_amount, p_currency,
        v_initial_status, v_ref, p_idempotency_key, p_details, p_requires_approval
    );

    RETURN QUERY SELECT v_new_id, v_ref, v_initial_status, NULL::TEXT;
END;
$$;
