-- ============================================================
-- ForgeSites AI — Migration v2: Niche-Aware Site Generation
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- ── 1. Add `content` JSONB column to sites ────────────────────────────────
-- Stores the full rich site JSON (pages, sections, assets, animations).
-- NULL for legacy sites generated before v2.

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS content  JSONB,
  ADD COLUMN IF NOT EXISTS address  TEXT;

COMMENT ON COLUMN public.sites.content IS
  'Full niche-aware site JSON: { status, niche, pages, assets, animations, meta }';

COMMENT ON COLUMN public.sites.address IS
  'Full street address (e.g. "Rua das Flores, 123 — Vila Mariana")';

-- ── 2. Index on content->niche for admin queries ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_sites_niche
  ON public.sites(niche);

CREATE INDEX IF NOT EXISTS idx_sites_status
  ON public.sites(status);

-- Content JSONB index for queries like content->>'niche'
CREATE INDEX IF NOT EXISTS idx_sites_content_gin
  ON public.sites USING gin(content jsonb_path_ops);

-- ── 3. View: generated_sites ──────────────────────────────────────────────
-- Admin view showing all v2 generated sites with key metadata.

CREATE OR REPLACE VIEW public.generated_sites AS
SELECT
  s.id,
  s.user_id,
  s.slug,
  s.business_name,
  s.niche,
  s.city,
  s.address,
  s.phone,
  s.status,
  s.site_url,
  s.created_at,
  -- Extract key fields from content JSON
  s.content->>'category'             AS category,
  s.content->'meta'->>'tagline'      AS tagline,
  s.content->'meta'->>'colorScheme'  AS color_scheme,
  jsonb_array_length(
    COALESCE(s.content->'pages', '[]'::jsonb)
  )                                  AS page_count,
  jsonb_array_length(
    COALESCE(s.content->'assets'->'images', '[]'::jsonb)
  )                                  AS image_count,
  -- Flag: has v2 rich content
  (s.content IS NOT NULL)            AS is_v2
FROM public.sites s;

-- ── Done ──────────────────────────────────────────────────────────────────
-- After running:
--   1. sites.content stores full JSON per generated site
--   2. sites.address stores the full street address
--   3. generated_sites view is available for admin queries
