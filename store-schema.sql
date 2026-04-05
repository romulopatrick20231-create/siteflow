-- ─────────────────────────────────────────────────────────────────────────────
-- store-schema.sql — SiteFlow Order System (iFood / Drogaria style)
-- Run this migration AFTER saas-schema.sql
-- All tables are prefixed with store_ to avoid conflicts with existing schema
-- ─────────────────────────────────────────────────────────────────────────────

-- ── stores ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT NOT NULL,
  slug                     TEXT UNIQUE NOT NULL,
  type                     TEXT NOT NULL CHECK (type IN ('food', 'pharmacy')),
  -- Delivery: flat fee OR per-neighborhood (JSON array: [{neighborhood, fee}])
  delivery_fee             NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_neighborhoods   JSONB NOT NULL DEFAULT '[]',
  is_active                BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_slug     ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_type     ON stores(type);
CREATE INDEX IF NOT EXISTS idx_stores_active   ON stores(is_active);

-- ── store_categories ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  "order"    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_store_categories_store ON store_categories(store_id);

-- ── store_products ────────────────────────────────────────────────────────────
-- Separate from the existing `products` table (which belongs to the SaaS sites)
CREATE TABLE IF NOT EXISTS store_products (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id                 UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id              UUID REFERENCES store_categories(id) ON DELETE SET NULL,
  name                     TEXT NOT NULL,
  price                    NUMERIC(10,2) NOT NULL,
  image_url                TEXT,
  description              TEXT,
  metadata                 JSONB NOT NULL DEFAULT '{}',
  requires_prescription    BOOLEAN NOT NULL DEFAULT false,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_products_store    ON store_products(store_id);
CREATE INDEX IF NOT EXISTS idx_store_products_category ON store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_store_products_active   ON store_products(is_active);

-- ── store_orders ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id             UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_name        TEXT NOT NULL,
  customer_phone       TEXT NOT NULL,
  customer_address     TEXT NOT NULL,
  customer_neighborhood TEXT,
  total_price          NUMERIC(10,2) NOT NULL,
  delivery_fee         NUMERIC(10,2) NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'delivering', 'completed')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_store   ON store_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status  ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_created ON store_orders(created_at DESC);

-- ── store_order_items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES store_products(id),
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price       NUMERIC(10,2) NOT NULL,
  notes       TEXT
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON store_order_items(order_id);

-- ── store_prescriptions ───────────────────────────────────────────────────────
-- Only used for pharmacy orders with requires_prescription products
CREATE TABLE IF NOT EXISTS store_prescriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_prescriptions_order ON store_prescriptions(order_id);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
-- Reuse the existing set_updated_at() trigger function from saas-schema.sql

CREATE TRIGGER set_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_store_products_updated_at
  BEFORE UPDATE ON store_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_store_orders_updated_at
  BEFORE UPDATE ON store_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
