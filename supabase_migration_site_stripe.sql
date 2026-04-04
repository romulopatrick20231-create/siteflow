-- ============================================================
-- ForgeSites AI — Site Stripe/Checkout Settings Migration
-- Apply AFTER supabase_migration_ecommerce.sql.
-- Run in Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS stripe_account_id   TEXT,           -- Stripe Connect account ID (acct_...)
  ADD COLUMN IF NOT EXISTS checkout_enabled    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_fee_fixed  NUMERIC(10,2),  -- fixed fee in BRL; NULL = not used
  ADD COLUMN IF NOT EXISTS delivery_fee_per_km NUMERIC(10,2),  -- per-km fee in BRL; NULL = not used
  ADD COLUMN IF NOT EXISTS currency            TEXT NOT NULL DEFAULT 'brl';

CREATE INDEX IF NOT EXISTS idx_sites_checkout_enabled
  ON public.sites(checkout_enabled)
  WHERE checkout_enabled = true;
