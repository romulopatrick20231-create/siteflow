-- ─────────────────────────────────────────────────────────────────────────────
-- CMS migration — adds edits, config columns and status constraint
-- Safe to run multiple times (all statements use IF NOT EXISTS / DO $$)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. edits column: user overrides that deep-merge on top of content
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS edits JSONB NOT NULL DEFAULT '{}';

-- 2. config column: site-level config (colors, logo, contact, social)
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';

-- 3. Ensure publish_count and last_published_at exist (may already be present)
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS publish_count     INTEGER   NOT NULL DEFAULT 0;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMPTZ;

-- 4. Drop and re-add status check constraint to include new statuses
--    (idempotent: ignores error if constraint doesn't exist yet)
DO $$
BEGIN
  ALTER TABLE public.sites
    DROP CONSTRAINT IF EXISTS sites_status_check;

  ALTER TABLE public.sites
    ADD CONSTRAINT sites_status_check
    CHECK (status IN ('draft', 'ready', 'published', 'archived', 'disabled'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'sites_status_check constraint update skipped: %', SQLERRM;
END;
$$;

-- 5. GIN indexes for fast JSONB queries on edits and config
CREATE INDEX IF NOT EXISTS sites_edits_gin
  ON public.sites USING GIN (edits);

CREATE INDEX IF NOT EXISTS sites_config_gin
  ON public.sites USING GIN (config);

-- 6. Index for status-based batch queries (e.g. "get all draft sites")
CREATE INDEX IF NOT EXISTS sites_status_idx
  ON public.sites (status)
  WHERE status != 'disabled';

-- 7. Backfill: ensure all existing rows have non-null edits and config
UPDATE public.sites
   SET edits  = '{}'
 WHERE edits  IS NULL;

UPDATE public.sites
   SET config = '{}'
 WHERE config IS NULL;

-- 8. Helpful view for admin batch review
CREATE OR REPLACE VIEW public.cms_sites_overview AS
SELECT
  s.id,
  s.user_id,
  s.slug,
  s.business_name,
  s.niche,
  s.status,
  s.site_url,
  s.publish_count,
  s.last_published_at,
  s.created_at,
  s.updated_at,
  -- Show whether edits exist (non-empty edits object)
  CASE WHEN s.edits  != '{}' THEN TRUE ELSE FALSE END AS has_edits,
  CASE WHEN s.config != '{}' THEN TRUE ELSE FALSE END AS has_config,
  -- Count pages from content
  jsonb_array_length(s.content->'pages') AS page_count
FROM public.sites s
WHERE s.status != 'disabled'
ORDER BY s.created_at DESC;

COMMENT ON VIEW public.cms_sites_overview IS
  'Admin view: site list with CMS metadata (edits flag, config flag, page count).';
