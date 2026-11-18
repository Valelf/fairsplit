-- Founding / comped plans (2026-11-18)
-- A subscription can be comped until a date (e.g. Shekar, founding customer, Pro free for 1 year).
-- Only platform admins can change it (existing "Admins can manage subscriptions" policy).
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS comp_until DATE,
  ADD COLUMN IF NOT EXISTS comp_note TEXT;

COMMENT ON COLUMN public.user_subscriptions.comp_until IS
  'Plan is free (comped) through this date inclusive; NULL = not comped. Extend via admin console.';
