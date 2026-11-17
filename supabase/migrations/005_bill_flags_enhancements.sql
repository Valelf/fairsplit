-- Migration 005: Bill Flags Enhancements
-- Adds resolved_amount_cents column and unique partial index

-- Add resolved_amount_cents to track the adjusted bill amount after flag resolution
ALTER TABLE public.bill_flags
  ADD COLUMN IF NOT EXISTS resolved_amount_cents INTEGER;

-- Prevent duplicate open flags on the same bill by the same tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_bill_flags_unique_open
  ON public.bill_flags (bill_id, tenant_id)
  WHERE status IN ('open', 'under_review');
