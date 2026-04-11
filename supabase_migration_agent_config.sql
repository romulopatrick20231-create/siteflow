-- WhatsApp provider + AI agent full config per store
ALTER TABLE stores ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT DEFAULT 'whapi';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS whatsapp_config JSONB DEFAULT '{}';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_system_prompt TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gpt-4o-mini';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_temperature NUMERIC(3,2) DEFAULT 0.85;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS followup_enabled BOOLEAN DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS followup_rules JSONB DEFAULT '[]';

-- customers CRM table (new vs returning)
CREATE TABLE IF NOT EXISTS customers_crm (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID REFERENCES stores(id) ON DELETE CASCADE,
  phone         TEXT NOT NULL,
  name          TEXT,
  status        TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'ativo', 'inativo', 'vip')),
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  message_count INT DEFAULT 0,
  notes         TEXT,
  tags          TEXT[] DEFAULT '{}',
  metadata      JSONB DEFAULT '{}',
  UNIQUE(store_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_crm_store_phone ON customers_crm(store_id, phone);

-- followup queue
CREATE TABLE IF NOT EXISTS followup_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID REFERENCES stores(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  message     TEXT NOT NULL,
  rule_index  INT DEFAULT 0,
  send_at     TIMESTAMPTZ NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followup_pending ON followup_queue(status, send_at) WHERE status = 'pending';
