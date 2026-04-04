/**
 * siteBuilderV2.js — Niche-aware site generation pipeline v2.
 *
 * Pipeline:
 *   lead data
 *     → determine niche category + pick random personality + pick random flow variant
 *     → Phase 1: generate unique business identity (founding story, stats, team)
 *     → Phase 2: generate full page content using identity as creative brief
 *     → [optional] generate images via DALL-E
 *     → assemble rich site JSON { id, status, niche, pages, assets, animations }
 *     → create Supabase auth user
 *     → save site record + rich content to DB
 *     → return complete result
 *
 * Each site is structurally and tonally unique:
 *   - 5 personality variants × 6 narrative angles × 3 flow variants per niche
 *   = 90 distinct combinations per niche category
 */

import { generateNicheContent }    from "./nicheGenerator.js";
import { generateNicheImages }     from "./imageGenerator.js";
import { getNicheCategory }        from "./nicheSchema.js";
import { generateVisualConfig }    from "./visual/index.js";
import { enrichContentWithImages } from "./contentImageEnricher.js";
import { getAdminClient }          from "./db.js";
import logger from "../utils/logger.js";

// ── Helpers ────────────────────────────────────────────────────────────────

function randomPassword(length = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Create Supabase auth user + provision credits. Returns { user, email, password } */
async function createUser(lead) {
  const db = getAdminClient();
  const slug     = slugify(lead.businessName);
  const email    = lead.email    || `${slug}${Date.now().toString(36)}@forgesites.app`;
  const password = lead.password || randomPassword();

  const { data: { user }, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { business_name: lead.businessName },
  });

  if (error) throw new Error(`createUser failed: ${error.message}`);

  // Provision credits record
  await db.from("user_credits").upsert(
    { user_id: user.id, credits_remaining: 10, credits_used_total: 0 },
    { onConflict: "user_id" }
  );

  return { user, email, password };
}

/** Assemble the final rich site JSON structure. */
function assembleSiteJson({ lead, nicheContent, images }) {
  const category   = getNicheCategory(lead.niche || "Negócio Local");
  const generation = nicheContent.meta?._generation || {};

  // Strip internal _generation from public meta
  const { _generation, ...publicMeta } = nicheContent.meta || {};

  // Generate all visual layers (shaders, animations, interactions, typography, performance)
  const visual = generateVisualConfig({
    category,
    niche:       lead.niche || "Negócio Local",
    personality: generation.personality  || "confiante",
    flowVariant: generation.flowVariant  || "standard",
    colorMood:   publicMeta?.colorScheme || "profissional",
    pages:       nicheContent.pages      || [],
  });

  return {
    status:   "draft",
    niche:    lead.niche || "Negócio Local",
    category,
    business: {
      name:    lead.businessName,
      phone:   lead.phone    || null,
      city:    lead.city     || null,
      address: lead.address  || null,
    },
    meta: publicMeta,
    generation: {
      personality:    generation.personality    || null,
      narrativeAngle: generation.narrativeAngle || null,
      flowVariant:    generation.flowVariant    || null,
      category,
    },
    pages: nicheContent.pages || [],
    assets: {
      images: images.map((img) => ({
        slot:   img.slot,
        url:    img.url,
        alt:    `${lead.businessName} — ${img.slot}`,
        source: "dalle-3",
      })),
      icons: [],
    },
    // Visual engine — full production configs for frontend runtime
    shaders:      visual.shaders,
    animations:   visual.animations,   // { hero: {...}, sections: [...] }
    interactions: visual.interactions,
    typography:   visual.typography,
    performance:  visual.performance,
    visualLevel:  "premium",
    generated_at: new Date().toISOString(),
  };
}

/** Save site record and rich content JSON to Supabase. */
async function saveSite(userId, lead, siteJson) {
  const db   = getAdminClient();
  const slug = `${slugify(lead.businessName)}-${Date.now().toString(36)}`;

  const { data: site, error } = await db
    .from("sites")
    .insert({
      user_id:       userId,
      slug,
      business_name: lead.businessName,
      niche:         lead.niche    || "Negócio Local",
      phone:         lead.phone    || null,
      city:          lead.city     || null,
      neighborhood:  lead.neighborhood || null,
      status:        "draft",
      content:       siteJson,       // AI-generated content (immutable base)
      edits:         {},             // user overrides (initially empty)
      config:        {},             // site config (colors, logo, contact, social)
    })
    .select()
    .single();

  if (error) throw new Error(`saveSite failed: ${error.message}`);
  return site;
}

// ── Main exports ───────────────────────────────────────────────────────────

/**
 * Build a single site from lead data.
 *
 * @param {Object} lead
 *   @param {string}  lead.businessName  required
 *   @param {string}  [lead.niche]
 *   @param {string}  [lead.city]
 *   @param {string}  [lead.phone]
 *   @param {string}  [lead.address]
 *   @param {string}  [lead.neighborhood]
 *   @param {string}  [lead.email]        auto-generated if omitted
 *   @param {string}  [lead.password]     auto-generated if omitted
 *   @param {boolean} [lead.skipAI]       skip OpenAI content generation
 *   @param {boolean} [lead.generateImages] generate DALL-E images (default false)
 *
 * @returns {Promise<{ site, siteJson, user, credentials }>}
 */
export async function buildSiteV2(lead) {
  if (!lead.businessName) throw new Error("businessName is required");

  logger.info("buildSiteV2 start", { businessName: lead.businessName, niche: lead.niche });

  // 1. Generate niche-specific content via AI (two-phase: identity → content)
  let nicheContent = { meta: {}, pages: [] };
  if (!lead.skipAI) {
    try {
      nicheContent = await generateNicheContent(lead);
      logger.info("Niche content generated (two-phase)", {
        businessName: lead.businessName,
        pages:        nicheContent.pages?.length,
        personality:  nicheContent.meta?._generation?.personality,
        flowVariant:  nicheContent.meta?._generation?.flowVariant,
        narrative:    nicheContent.meta?._generation?.narrativeAngle,
      });
    } catch (err) {
      logger.warn("Niche content generation failed, continuing with empty pages", {
        error: err.message,
      });
    }
  }

  // Validate minimum section count (spec: never fewer than 4 sections per page)
  for (const page of (nicheContent.pages || [])) {
    const count = (page.sections || []).length;
    if (count < 4) {
      logger.warn("Page has fewer than 4 sections — visual spec violation", {
        businessName: lead.businessName,
        page:         page.id || page.slug || page.name,
        sectionCount: count,
      });
    }
  }

  // 2. Enrich content with Pexels images (auto-enabled when PEXELS_API_KEY is set)
  const pexelsEnabled = !!process.env.PEXELS_API_KEY && lead.skipPexels !== true;
  if (pexelsEnabled && nicheContent.pages?.length) {
    try {
      const category = getNicheCategory(lead.niche || "Negócio Local");
      nicheContent.pages = await enrichContentWithImages(nicheContent.pages, category, nicheContent.meta);
      logger.info("Pexels images attached to content", {
        businessName: lead.businessName,
        pages: nicheContent.pages.length,
      });
    } catch (err) {
      logger.warn("Pexels enrichment failed, continuing without item images", {
        error: err.message,
      });
    }
  }

  // 3. Generate hero images via DALL-E (optional, expensive — off by default)
  let images = [];
  if (lead.generateImages) {
    try {
      images = await generateNicheImages(lead);
      logger.info("Images generated", {
        businessName: lead.businessName,
        count: images.length,
      });
    } catch (err) {
      logger.warn("Image generation failed, continuing without images", {
        error: err.message,
      });
    }
  }

  // 4. Assemble the rich site JSON
  const siteJson = assembleSiteJson({ lead, nicheContent, images });

  // 5. Create Supabase user
  const { user, email, password } = await createUser(lead);
  logger.info("User created", { userId: user.id, email });

  // 6. Save site record with full content JSON
  const site = await saveSite(user.id, lead, siteJson);
  logger.info("Site saved", { siteId: site.id, userId: user.id });

  return {
    site:        { ...site, content: siteJson },
    siteJson,
    user,
    credentials: { email, password },
  };
}

/**
 * Build a single site for an EXISTING user (no user creation).
 * Used by POST /admin/generate-single to attach a site to a specific userId.
 * Credits are NOT deducted — this is an admin-privileged action.
 *
 * @param {string} userId  — existing Supabase auth user ID
 * @param {Object} lead    — same shape as buildSiteV2 lead (businessName required)
 * @returns {Promise<{ site, siteJson }>}
 */
export async function buildSiteForUser(userId, lead) {
  if (!lead.businessName) throw new Error("businessName is required");

  logger.info("buildSiteForUser start", { userId, businessName: lead.businessName, niche: lead.niche });

  // 1. AI content generation
  let nicheContent = { meta: {}, pages: [] };
  if (!lead.skipAI) {
    try {
      nicheContent = await generateNicheContent(lead);
    } catch (err) {
      logger.warn("Niche content generation failed, continuing with empty pages", { error: err.message });
    }
  }

  // 2. Pexels image enrichment
  const pexelsEnabled = !!process.env.PEXELS_API_KEY && lead.skipPexels !== true;
  if (pexelsEnabled && nicheContent.pages?.length) {
    try {
      const category = getNicheCategory(lead.niche || "Negócio Local");
      nicheContent.pages = await enrichContentWithImages(nicheContent.pages, category, nicheContent.meta);
    } catch (err) {
      logger.warn("Pexels enrichment failed, continuing without item images", { error: err.message });
    }
  }

  // 3. Assemble + save (skip DALL-E — off by default for single admin generation)
  const siteJson = assembleSiteJson({ lead, nicheContent, images: [] });
  const site     = await saveSite(userId, lead, siteJson);

  logger.info("buildSiteForUser complete", { siteId: site.id, userId });

  return { site: { ...site, content: siteJson }, siteJson };
}

/**
 * Build multiple sites concurrently (max 3 at a time).
 *
 * @param {Object[]} leads
 * @returns {Promise<Array>}
 */
export async function buildSitesV2(leads) {
  const CONCURRENCY = 3;
  const results = [];

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const batch = leads.slice(i, i + CONCURRENCY);

    const settled = await Promise.allSettled(
      batch.map((lead) => buildSiteV2(lead))
    );

    for (let j = 0; j < batch.length; j++) {
      const s = settled[j];
      if (s.status === "fulfilled") {
        results.push(s.value);
      } else {
        logger.error("Lead build failed", {
          businessName: batch[j].businessName,
          error:        s.reason?.message,
        });
        results.push({ error: s.reason?.message, lead: batch[j] });
      }
    }
  }

  return results;
}
