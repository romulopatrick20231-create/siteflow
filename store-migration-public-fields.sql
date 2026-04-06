-- store-migration-public-fields.sql
-- Adiciona campos necessários para os endpoints públicos /public/store/:id

-- ── stores ──────────────────────────────────────────────────────────────────
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS description       TEXT,
  ADD COLUMN IF NOT EXISTS address           TEXT,
  ADD COLUMN IF NOT EXISTS cover_url         TEXT,
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS is_open           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_time_min INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS delivery_time_max INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS min_order         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating            NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count      INTEGER NOT NULL DEFAULT 0;

-- ── store_products ───────────────────────────────────────────────────────────
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2);
