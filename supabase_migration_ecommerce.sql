-- ============================================================
-- ForgeSites AI — E-commerce Migration
-- Apply AFTER saas-schema.sql + saas-schema-v2.sql.
-- Run this entire file in Supabase SQL Editor.
-- ============================================================

-- ── 1. ADD cep TO sites ───────────────────────────────────────────────────────
-- Stores the seller's CEP for delivery fee calculation.
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS cep TEXT;

-- ── 2. ORDERS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.orders (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id               UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,

  -- Stripe
  stripe_session_id     TEXT NOT NULL UNIQUE,
  stripe_payment_intent TEXT,

  -- Customer (filled on webhook after payment)
  customer_name         TEXT,
  customer_email        TEXT,
  customer_phone        TEXT,
  customer_cep          TEXT,

  -- Amounts (stored in centavos — BRL cents)
  subtotal_cents        INTEGER NOT NULL DEFAULT 0,
  delivery_cents        INTEGER NOT NULL DEFAULT 0,
  total_cents           INTEGER NOT NULL DEFAULT 0,

  status                TEXT NOT NULL DEFAULT 'pending',
    -- pending | paid | failed | canceled | refunded

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_site_id          ON public.orders(site_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session   ON public.orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status           ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created          ON public.orders(created_at DESC);

-- ── 3. ORDER_ITEMS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.order_items (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id         UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES public.products(id) ON DELETE SET NULL,

  -- Snapshot at time of purchase (product may change/be deleted later)
  product_name     TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  qty              INTEGER NOT NULL DEFAULT 1,
  total_cents      INTEGER NOT NULL,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- ── 4. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Site owners can read their orders
CREATE POLICY "orders_select_owner" ON public.orders
  FOR SELECT USING (
    site_id IN (SELECT id FROM public.sites WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- Service role writes (webhook) — no user INSERT policy needed
-- Admins can manage orders
CREATE POLICY "orders_admin" ON public.orders
  FOR ALL USING (public.is_admin());

-- Order items follow the same access as their order
CREATE POLICY "order_items_select_owner" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.sites s ON s.id = o.site_id
      WHERE s.user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "order_items_admin" ON public.order_items
  FOR ALL USING (public.is_admin());

-- ── 5. TRIGGERS ───────────────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
