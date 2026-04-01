-- ForgeSites AI — Supabase Schema
-- Run this in your Supabase project's SQL Editor
-- Dashboard: https://supabase.com/dashboard → SQL Editor

-- ── Main leads table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT,
  neighborhood  TEXT,
  city          TEXT,
  niche         TEXT,
  site_status   TEXT,                  -- no_site | weak_site | good_site
  score         INTEGER DEFAULT 0,     -- 0–10
  priority      TEXT DEFAULT 'low',    -- low | medium | high
  site_url      TEXT,                  -- deployed Vercel URL
  status        TEXT DEFAULT 'new',    -- new | processed | contacted | replied | closed
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_status    ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority  ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_score     ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created   ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_site_status ON leads(site_status);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Enable RLS so the anon key can only access leads (read/write via service)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: allow all operations from authenticated service role
-- (the anon key used in the app can read/write because we trust the backend)
CREATE POLICY "Allow full access" ON leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Helper view: lead stats ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW lead_stats AS
SELECT
  COUNT(*)                                        AS total,
  COUNT(*) FILTER (WHERE priority = 'high')       AS high_priority,
  COUNT(*) FILTER (WHERE priority = 'medium')     AS medium_priority,
  COUNT(*) FILTER (WHERE priority = 'low')        AS low_priority,
  COUNT(*) FILTER (WHERE status = 'new')          AS status_new,
  COUNT(*) FILTER (WHERE status = 'processed')    AS status_processed,
  COUNT(*) FILTER (WHERE status = 'contacted')    AS status_contacted,
  COUNT(*) FILTER (WHERE status = 'replied')      AS status_replied,
  COUNT(*) FILTER (WHERE status = 'closed')       AS status_closed,
  COUNT(*) FILTER (WHERE site_url IS NOT NULL)    AS sites_deployed,
  COUNT(*) FILTER (WHERE site_status = 'no_site') AS no_site,
  ROUND(AVG(score)::NUMERIC, 1)                   AS avg_score
FROM leads;
