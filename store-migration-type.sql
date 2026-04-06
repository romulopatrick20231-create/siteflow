-- ─────────────────────────────────────────────────────────────────────────────
-- store-migration-type.sql
-- Separação PedeZap / FarmaZap — adiciona campo `type` na tabela users
-- Execute após store-schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Adiciona coluna type com CHECK constraint
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS type TEXT
  CHECK (type IN ('pedezap', 'farmazap'));

-- Índice para filtros por tipo
CREATE INDEX IF NOT EXISTS idx_users_type ON public.users(type);

-- Comentário de documentação
COMMENT ON COLUMN public.users.type IS
  'Produto SaaS do usuário: pedezap (delivery food) | farmazap (farmácia)';
