-- Seed subscription plans
INSERT INTO public.subscription_plans (name, max_properties, max_tenants_per_property, max_bills_per_month, price_cents, is_active)
VALUES
  ('Free', 1, 5, 10, 0, true),
  ('Pro', 5, 20, 9999, 999, true),
  ('Business', 9999, 9999, 9999, 2499, true);
