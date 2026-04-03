/**
 * /site routes — Single-site convenience layer.
 *
 * The frontend operates on a single-site model: each user owns one site
 * and doesn't need to pass siteId explicitly. These routes auto-resolve
 * the user's primary site from their JWT and map DB fields to the
 * frontend-expected shape.
 *
 * GET  /site          → primary site (mapped: business_name→name, hero_copy→description)
 * PUT  /site          → update info + content in one call
 * POST /site/publish  → publish primary site to Vercel
 */

import { Router }          from "express";
import { requireAuth }     from "../middleware/auth.js";
import { publishLimiter }  from "../middleware/rateLimiter.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import { getSite, createSite, saveSiteInfo, saveSiteContent } from "../saas/sites.js";
import { publishSite }          from "../saas/publishSite.js";
import { markSitePublished }    from "../saas/cmsSaas.js";
import { incrementPublishCount } from "../saas/credits.js";
import { getAdminClient }        from "../saas/db.js";
import logger                    from "../utils/logger.js";

const router = Router();
router.use(requireAuth);

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Resolves the user's primary site ID.
 * Auto-creates a blank site if the user has none (new user flow).
 */
async function resolveSiteId(userId, userEmail) {
  const db = getAdminClient();
  const { data } = await db
    .from("sites")
    .select("id")
    .eq("user_id", userId)
    .neq("status", "disabled")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (data) return data.id;

  // Auto-create a blank site for brand-new users (onboarding will fill it in)
  const name = userEmail?.split("@")[0] || "Meu Negócio";
  const site = await createSite(userId, { businessName: name, niche: "Negócio Local" });
  logger.info("Auto-created blank site", { userId, siteId: site.id });
  return site.id;
}

/**
 * Maps the DB record to the shape the frontend expects.
 * DB: business_name, site_content.hero_copy → Frontend: name, description
 */
function toFrontend(site) {
  return {
    id:          site.id,
    name:        site.business_name               ?? "",
    headline:    site.site_content?.headline       ?? "",
    description: site.site_content?.hero_copy      ?? "",
    phone:       site.phone                        ?? "",
    url:         site.site_url                     ?? null,
    status:      site.status,
    slug:        site.slug,
    city:        site.city                         ?? "",
    niche:       site.niche                        ?? "",
  };
}

// ── GET /site ─────────────────────────────────────────────────────────────
router.get("/", asyncHandler(async (req, res) => {
  const siteId = await resolveSiteId(req.userId, req.user?.email);
  const site   = await getSite(siteId, req.userId);
  send(res, toFrontend(site));
}));

// ── PUT /site ─────────────────────────────────────────────────────────────
// Accepts any subset of { name, headline, description, phone, city }
// Maps to saveSiteInfo (business_name, phone, city) + saveSiteContent (headline, hero_copy)
router.put("/", asyncHandler(async (req, res) => {
  const { name, headline, description, phone, city } = req.body;
  const siteId = await resolveSiteId(req.userId, req.user?.email);

  const infoFields = {};
  if (name        != null) infoFields.business_name = name;
  if (phone       != null) infoFields.phone          = phone;
  if (city        != null) infoFields.city            = city;

  const contentFields = {};
  if (headline    != null) contentFields.headline   = headline;
  if (description != null) contentFields.hero_copy  = description;

  await Promise.all([
    Object.keys(infoFields).length
      ? saveSiteInfo(siteId, req.userId, infoFields)
      : Promise.resolve(),
    Object.keys(contentFields).length
      ? saveSiteContent(siteId, req.userId, contentFields)
      : Promise.resolve(),
  ]);

  const updated = await getSite(siteId, req.userId);
  send(res, toFrontend(updated));
}));

// ── POST /site/publish ────────────────────────────────────────────────────
router.post("/publish", publishLimiter, asyncHandler(async (req, res) => {
  const siteId = await resolveSiteId(req.userId, req.user?.email);
  logger.info("Publish via /site/publish", { userId: req.userId, siteId });
  const result = await publishSite(siteId, req.userId);
  await markSitePublished(siteId, req.userId, result.url);
  await incrementPublishCount(req.userId);
  send(res, result);
}));

export default router;
