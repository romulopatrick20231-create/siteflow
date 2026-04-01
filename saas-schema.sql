-- ============================================================
-- ForgeSites AI — SaaS Production Schema
-- Version: 3.0
-- Paste this entire file into Supabase SQL Editor and run.
-- ============================================================

-- ── 1. USERS (extends auth.users with plan/billing data) ────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email                TEXT NOT NULL,
  plan                 TEXT NOT NULL DEFAULT 'basic',       -- basic | pro | admin
  is_admin             BOOLEAN NOT NULL DEFAULT false,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  publish_limit        INTEGER NOT NULL DEFAULT 5,          -- max publishes/month
  publish_count_month  INTEGER NOT NULL DEFAULT 0,          -- resets each month
  month_reset_at       TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW()),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_plan      ON public.users(plan);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- ── 2. SITES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sites (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slug              TEXT NOT NULL UNIQUE,

  -- Business identity
  business_name     TEXT NOT NULL,
  niche             TEXT NOT NULL DEFAULT 'Negócio Local',
  phone             TEXT,
  city              TEXT,
  neighborhood      TEXT,

  -- Deployment state
  status            TEXT NOT NULL DEFAULT 'draft',   -- draft | published | disabled
  site_url          TEXT,
  publish_count     INTEGER NOT NULL DEFAULT 0,
  last_published_at TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_user_id ON public.sites(user_id);
CREATE INDEX IF NOT EXISTS idx_sites_status  ON public.sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_slug    ON public.sites(slug);

-- ── 3. SITE_CONTENT (editable content — save without deploy) ────────────────
CREATE TABLE IF NOT EXISTS public.site_content (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id      UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE UNIQUE,

  -- Hero section
  headline     TEXT DEFAULT '',
  hero_copy    TEXT DEFAULT '',

  -- Content blocks (JSON arrays)
  diferenciais JSONB NOT NULL DEFAULT '[]'::jsonb,
  depoimentos  JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- About / extra text
  about_text   TEXT DEFAULT '',

  -- Contact override (if different from sites.phone)
  contact_email TEXT,
  whatsapp_link TEXT,

  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_content_site_id ON public.site_content(site_id);

-- ── 4. PRODUCTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id     UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  price       NUMERIC(10,2),                    -- NULL = price on request
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_site_id   ON public.products(site_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id   ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sort      ON public.products(site_id, sort_order);

-- ── 5. IMAGES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.images (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id      UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  storage_path TEXT NOT NULL,                   -- path inside Supabase Storage bucket
  public_url   TEXT NOT NULL,                   -- full CDN URL
  file_name    TEXT NOT NULL,
  file_size    INTEGER,                          -- bytes
  mime_type    TEXT,
  type         TEXT NOT NULL DEFAULT 'gallery',  -- logo | banner | product | gallery

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_site_id ON public.images(site_id);
CREATE INDEX IF NOT EXISTS idx_images_user_id ON public.images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_type    ON public.images(site_id, type);

-- ── 6. USER_CREDITS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_credits (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  credits_remaining INTEGER NOT NULL DEFAULT 10,
  credits_used_total INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits  ENABLE ROW LEVEL SECURITY;

-- ── Helper: check if current user is admin ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

-- ── USERS policies ───────────────────────────────────────────────────────────
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid() OR public.is_admin());

-- Only admin can delete users (soft-delete via is_active preferred)
CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE USING (public.is_admin());

-- ── SITES policies ───────────────────────────────────────────────────────────
CREATE POLICY "sites_select" ON public.sites
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "sites_insert" ON public.sites
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "sites_update" ON public.sites
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "sites_delete" ON public.sites
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- ── SITE_CONTENT policies ────────────────────────────────────────────────────
CREATE POLICY "site_content_select" ON public.site_content
  FOR SELECT USING (
    site_id IN (SELECT id FROM public.sites WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "site_content_insert" ON public.site_content
  FOR INSERT WITH CHECK (
    site_id IN (SELECT id FROM public.sites WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "site_content_update" ON public.site_content
  FOR UPDATE USING (
    site_id IN (SELECT id FROM public.sites WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "site_content_delete" ON public.site_content
  FOR DELETE USING (
    site_id IN (SELECT id FROM public.sites WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- ── PRODUCTS policies ────────────────────────────────────────────────────────
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "products_delete" ON public.products
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- ── IMAGES policies ──────────────────────────────────────────────────────────
CREATE POLICY "images_select" ON public.images
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "images_insert" ON public.images
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "images_delete" ON public.images
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- ── USER_CREDITS policies ────────────────────────────────────────────────────
CREATE POLICY "credits_select" ON public.user_credits
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

-- Credits can only be modified server-side (service role) or by admin
CREATE POLICY "credits_update_admin" ON public.user_credits
  FOR UPDATE USING (public.is_admin());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- ── Auto-provision user profile + credits on signup ──────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.users (id, email, plan, publish_limit)
  VALUES (NEW.id, NEW.email, 'basic', 5)
  ON CONFLICT (id) DO NOTHING;

  -- Grant starting credits
  INSERT INTO public.user_credits (user_id, credits_remaining)
  VALUES (NEW.id, 10)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Auto-update updated_at on sites ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Increment publish_count atomically ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_publish_count(site_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sites
  SET publish_count = publish_count + 1,
      last_published_at = NOW(),
      updated_at = NOW()
  WHERE id = site_id;
END;
$$;

-- ── Increment monthly publish count for a user ───────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_user_publish_month(uid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET publish_count_month = publish_count_month + 1,
      updated_at = NOW()
  WHERE id = uid;
END;
$$;

-- ── Admin: reset all credits monthly ────────────────────────────────────────
-- Call this via a cron job or the admin panel each month
CREATE OR REPLACE FUNCTION public.admin_reset_monthly_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Reset credits based on plan
  UPDATE public.user_credits uc
  SET credits_remaining = CASE u.plan
        WHEN 'pro'   THEN 50
        WHEN 'admin' THEN 9999
        ELSE 10  -- basic
      END,
      updated_at = NOW()
  FROM public.users u
  WHERE uc.user_id = u.id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Reset monthly publish counts
  UPDATE public.users
  SET publish_count_month = 0,
      month_reset_at = DATE_TRUNC('month', NOW()),
      updated_at = NOW()
  WHERE DATE_TRUNC('month', month_reset_at) < DATE_TRUNC('month', NOW());

  RETURN updated_count;
END;
$$;

-- ── Admin: disable all sites for an unpaid user ──────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_disable_user(uid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users SET is_active = false, updated_at = NOW() WHERE id = uid;
  UPDATE public.sites  SET status = 'disabled', updated_at = NOW() WHERE user_id = uid;
END;
$$;

-- ── Admin: re-enable a user ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_enable_user(uid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users SET is_active = true, updated_at = NOW() WHERE id = uid;
  -- Restore published sites to published, drafts to draft
  UPDATE public.sites
  SET status = CASE WHEN site_url IS NOT NULL THEN 'published' ELSE 'draft' END,
      updated_at = NOW()
  WHERE user_id = uid AND status = 'disabled';
END;
$$;

-- ============================================================
-- VIEWS (for easy reporting)
-- ============================================================

CREATE OR REPLACE VIEW public.user_overview AS
SELECT
  u.id,
  u.email,
  u.plan,
  u.is_active,
  u.publish_count_month,
  u.publish_limit,
  uc.credits_remaining,
  uc.credits_used_total,
  COUNT(s.id)                                         AS total_sites,
  COUNT(s.id) FILTER (WHERE s.status = 'published')   AS published_sites,
  COUNT(s.id) FILTER (WHERE s.status = 'disabled')    AS disabled_sites,
  u.created_at
FROM public.users u
LEFT JOIN public.user_credits uc ON uc.user_id = u.id
LEFT JOIN public.sites s ON s.user_id = u.id
GROUP BY u.id, u.email, u.plan, u.is_active, u.publish_count_month,
         u.publish_limit, uc.credits_remaining, uc.credits_used_total, u.created_at
ORDER BY u.created_at DESC;

-- ============================================================
-- STORAGE — run these statements or configure via Dashboard
-- ============================================================

-- Create the 'site-images' bucket (run in Dashboard > Storage > New Bucket)
-- Name: site-images
-- Public: true
-- File size limit: 5 MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- Storage RLS (paste in Storage > Policies):
-- INSERT policy: authenticated users can upload to their own folder
-- SELECT policy: public read (images are public)
-- DELETE policy: users can delete their own images

-- Example storage policy SQL (run in SQL Editor):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-images',
  'site-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'site-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-images');

CREATE POLICY "storage_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'site-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- EXAMPLE QUERIES
-- ============================================================

-- Get full site data for a user:
-- SELECT s.*, sc.*, p.*, i.*
-- FROM sites s
-- LEFT JOIN site_content sc ON sc.site_id = s.id
-- LEFT JOIN products p ON p.site_id = s.id
-- LEFT JOIN images i ON i.site_id = s.id
-- WHERE s.user_id = '<user-uuid>';

-- Get user credits:
-- SELECT credits_remaining FROM user_credits WHERE user_id = '<user-uuid>';

-- Admin reset monthly:
-- SELECT admin_reset_monthly_credits();

-- Disable unpaid user:
-- SELECT admin_disable_user('<user-uuid>');

-- Overview of all users (admin):
-- SELECT * FROM user_overview;

-- ============================================================
-- INITIAL ADMIN USER (run after first signup)
-- Replace '<your-user-uuid>' with your actual UUID from auth.users
-- ============================================================

-- UPDATE public.users
-- SET plan = 'admin', is_admin = true, publish_limit = 9999
-- WHERE id = '<your-user-uuid>';

-- UPDATE public.user_credits
-- SET credits_remaining = 9999
-- WHERE user_id = '<your-user-uuid>';
