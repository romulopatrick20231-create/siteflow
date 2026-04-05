-- ─────────────────────────────────────────────────────────────────────────────
-- store-schema-v2.sql — Expansão: painel do lojista + automações
-- Run AFTER store-schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Vincular loja ao lojista (usuário do SiteFlow) ────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS owner_id                UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS average_delivery_minutes INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS business_hours           JSONB   NOT NULL DEFAULT '{}';
  -- business_hours shape: { mon: {open:"08:00", close:"22:00"}, tue: {...}, ... }
  -- closed day: omit the key or set { open: null, close: null }

CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);

-- ── Tabela de follow-ups de pedidos ──────────────────────────────────────────
-- Registra quais follow-ups automáticos já foram enviados/disparados.
CREATE TABLE IF NOT EXISTS store_order_followups (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID    NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  store_id   UUID    NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL CHECK (type IN ('pending_30min', 'reactivation')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, type)
);

CREATE INDEX IF NOT EXISTS idx_store_followups_store   ON store_order_followups(store_id);
CREATE INDEX IF NOT EXISTS idx_store_followups_type    ON store_order_followups(type);
CREATE INDEX IF NOT EXISTS idx_store_followups_created ON store_order_followups(created_at DESC);
