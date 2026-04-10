-- Per-store WhatsApp credentials
ALTER TABLE stores ADD COLUMN IF NOT EXISTS whapi_token TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS whapi_base_url TEXT DEFAULT 'https://gate.whapi.cloud';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_persona TEXT DEFAULT 'assistente';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'generic';

-- store_id on message_queue
ALTER TABLE message_queue ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

-- Conversation history
CREATE TABLE IF NOT EXISTS conversation_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID REFERENCES stores(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content      TEXT NOT NULL,
  intent       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_store_phone ON conversation_history(store_id, customer_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_phone ON conversation_history(customer_phone, created_at DESC);
