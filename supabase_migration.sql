-- ============================================================
-- ForgeSites AI — Full Schema Migration
-- Run this ONCE in Supabase Dashboard > SQL Editor
-- ============================================================

-- ── 1. public.users ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        NOT NULL,
  plan                TEXT        NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic','pro','admin')),
  is_admin            BOOLEAN     NOT NULL DEFAULT false,
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  publish_limit       INTEGER     NOT NULL DEFAULT 5,
  publish_count_month INTEGER     NOT NULL DEFAULT 0,
  month_reset_at      TIMESTAMPTZ          DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. public.sites ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sites (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slug             TEXT        UNIQUE NOT NULL,
  business_name    TEXT        NOT NULL,
  niche            TEXT                 DEFAULT 'Negócio Local',
  phone            TEXT,
  city             TEXT,
  neighborhood     TEXT,
  status           TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','disabled')),
  site_url         TEXT,
  publish_count    INTEGER     NOT NULL DEFAULT 0,
  last_published_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. public.site_content (1:1 with sites) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_content (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID        UNIQUE NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  headline      TEXT,
  hero_copy     TEXT,
  about_text    TEXT,
  contact_email TEXT,
  whatsapp_link TEXT,
  diferenciais  JSONB       NOT NULL DEFAULT '[]',
  depoimentos   JSONB       NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. public.products ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID        NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  price       NUMERIC(10,2),
  image_url   TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. public.images ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.images (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID        NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  storage_path TEXT        NOT NULL,
  public_url   TEXT        NOT NULL,
  file_name    TEXT,
  file_size    INTEGER,
  mime_type    TEXT,
  type         TEXT        NOT NULL DEFAULT 'gallery' CHECK (type IN ('logo','banner','gallery','product')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. public.user_credits ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_credits (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credits_remaining   INTEGER     NOT NULL DEFAULT 0,
  credits_used_total  INTEGER     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. DB functions (called by backend RPC) ───────────────────────────────────

CREATE OR REPLACE FUNCTION increment_publish_count(site_id UUID)
RETURNS void
LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.sites
  SET publish_count = publish_count + 1,
      last_published_at = NOW(),
      updated_at = NOW()
  WHERE id = site_id;
$$;

CREATE OR REPLACE FUNCTION increment_user_publish_month(uid UUID)
RETURNS void
LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.users
  SET publish_count_month = publish_count_month + 1,
      updated_at = NOW()
  WHERE id = uid;
$$;

-- ── 8. Trigger: auto-create public.users row when auth user is created ─────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, plan, is_admin, is_active)
  VALUES (NEW.id, NEW.email, 'basic', false, true)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ── 9. RLS — enable but allow service role (backend) to bypass ────────────────
ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically in Supabase.
-- Policies below are for anon/authenticated direct queries (not used by backend).
CREATE POLICY "users: own row" ON public.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "sites: own sites" ON public.sites
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "site_content: own sites" ON public.site_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sites WHERE id = site_content.site_id AND user_id = auth.uid())
  );

CREATE POLICY "products: own products" ON public.products
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "images: own images" ON public.images
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_credits: own credits" ON public.user_credits
  FOR ALL USING (auth.uid() = user_id);

-- ── 10. Indexes for performance ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sites_user_id        ON public.sites(user_id);
CREATE INDEX IF NOT EXISTS idx_site_content_site_id ON public.site_content(site_id);
CREATE INDEX IF NOT EXISTS idx_products_site_id     ON public.products(site_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id     ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_images_site_id       ON public.images(site_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);

-- Done! All tables, functions, trigger, RLS, and indexes are ready.
