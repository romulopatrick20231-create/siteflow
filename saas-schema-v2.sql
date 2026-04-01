-- ============================================================
-- ForgeSites AI — Schema Migration v2
-- Apply AFTER saas-schema.sql (v3 base schema).
-- Run this entire file in Supabase SQL Editor.
-- ============================================================

-- ── 1. ADD COLUMNS TO users ──────────────────────────────────────────────────

-- Stripe billing columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id         TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT DEFAULT 'none';
  -- Values: none | trialing | active | past_due | canceled | unpaid

-- Profile columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT;

-- Indexes for Stripe lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer
  ON public.users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_stripe_sub_status
  ON public.users(stripe_subscription_status);

-- ── 2. CREATE domains TABLE ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.domains (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  site_id      UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,

  domain       TEXT NOT NULL UNIQUE,       -- e.g. "minha-empresa.com.br"
  provider     TEXT NOT NULL DEFAULT 'namecheap',  -- namecheap | cloudflare
  provider_id  TEXT,                       -- provider's internal order/zone ID
  status       TEXT NOT NULL DEFAULT 'pending',
    -- pending | active | failed | expired

  -- DNS verification
  dns_verified   BOOLEAN NOT NULL DEFAULT false,
  vercel_zone_id TEXT,                     -- Vercel apex domain identifier

  -- Lifecycle timestamps
  registered_at TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domains_user_id  ON public.domains(user_id);
CREATE INDEX IF NOT EXISTS idx_domains_site_id  ON public.domains(site_id);
CREATE INDEX IF NOT EXISTS idx_domains_status   ON public.domains(status);
CREATE INDEX IF NOT EXISTS idx_domains_domain   ON public.domains(domain);

-- RLS
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "domains_select" ON public.domains
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "domains_insert" ON public.domains
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "domains_update" ON public.domains
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "domains_delete" ON public.domains
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER domains_updated_at
  BEFORE UPDATE ON public.domains
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. CREATE stripe_events TABLE ────────────────────────────────────────────
-- Idempotency table: prevent processing duplicate webhook events.

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   TEXT NOT NULL UNIQUE,         -- Stripe event ID (evt_...)
  type       TEXT NOT NULL,                -- e.g. "customer.subscription.updated"
  payload    JSONB NOT NULL,               -- full event object
  processed  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_events_event_id
  ON public.stripe_events(event_id);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type
  ON public.stripe_events(type);

CREATE INDEX IF NOT EXISTS idx_stripe_events_created
  ON public.stripe_events(created_at DESC);

-- Stripe events are only written/read by the server (service role).
-- RLS enabled but no user-facing policies — service role bypasses RLS.
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- ── 4. UPDATE user_overview VIEW ─────────────────────────────────────────────
-- Add new columns to the admin reporting view.

CREATE OR REPLACE VIEW public.user_overview AS
SELECT
  u.id,
  u.email,
  u.display_name,
  u.avatar_url,
  u.plan,
  u.is_active,
  u.is_admin,
  u.stripe_customer_id,
  u.stripe_subscription_id,
  u.stripe_subscription_status,
  u.publish_count_month,
  u.publish_limit,
  uc.credits_remaining,
  uc.credits_used_total,
  COUNT(s.id)                                          AS total_sites,
  COUNT(s.id) FILTER (WHERE s.status = 'published')   AS published_sites,
  COUNT(s.id) FILTER (WHERE s.status = 'disabled')    AS disabled_sites,
  COUNT(d.id)                                          AS total_domains,
  u.created_at
FROM public.users u
LEFT JOIN public.user_credits uc ON uc.user_id = u.id
LEFT JOIN public.sites         s  ON s.user_id  = u.id
LEFT JOIN public.domains       d  ON d.user_id  = u.id
GROUP BY
  u.id, u.email, u.display_name, u.avatar_url,
  u.plan, u.is_active, u.is_admin,
  u.stripe_customer_id, u.stripe_subscription_id, u.stripe_subscription_status,
  u.publish_count_month, u.publish_limit,
  uc.credits_remaining, uc.credits_used_total,
  u.created_at
ORDER BY u.created_at DESC;

-- ── 5. FUNCTION: upsert_stripe_event (idempotency helper) ────────────────────

CREATE OR REPLACE FUNCTION public.upsert_stripe_event(
  p_event_id TEXT,
  p_type     TEXT,
  p_payload  JSONB
)
RETURNS BOOLEAN   -- returns TRUE if newly inserted, FALSE if already exists
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted BOOLEAN;
BEGIN
  INSERT INTO public.stripe_events (event_id, type, payload)
  VALUES (p_event_id, p_type, p_payload)
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted > 0;
END;
$$;

-- ── 6. EXAMPLE QUERIES ───────────────────────────────────────────────────────

-- List all domains for a user:
-- SELECT * FROM domains WHERE user_id = '<uuid>' ORDER BY created_at DESC;

-- Find user by Stripe customer ID:
-- SELECT * FROM users WHERE stripe_customer_id = 'cus_...';

-- Check if a Stripe event was already processed:
-- SELECT processed FROM stripe_events WHERE event_id = 'evt_...';

-- Mark event as processed:
-- UPDATE stripe_events SET processed = true WHERE event_id = 'evt_...';

-- ============================================================
-- DONE — run saas-schema.sql first, then this file.
-- ============================================================
