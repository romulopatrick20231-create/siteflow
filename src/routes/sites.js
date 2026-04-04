/**
 * /sites routes — Site lifecycle management.
 *
 * GET    /sites          — list user's sites
 * POST   /sites          — create new site
 * GET    /sites/:id      — get site with full content
 * PUT    /sites/:id/info — update identity fields (SAVE — no deploy)
 * DELETE /sites/:id      — delete site
 */

import { Router }       from "express";
import { requireAuth }  from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import {
  getUserSites, getSite, createSite,
  saveSiteInfo, disableSite,
} from "../saas/sites.js";
import {
  getSitePreview,
  applyEdit,
  batchApplyEdits,
  revertEdit,
  revertAllEdits,
  updateConfig,
  updateStatus,
  markSitePublished,
} from "../saas/cmsSaas.js";
import { isPathAllowed, validateFieldValue } from "../saas/fieldRegistry.js";
import { publishSite }          from "../saas/publishSite.js";
import { incrementPublishCount } from "../saas/credits.js";
import { getAdminClient }        from "../saas/db.js";
import { NotFoundError, ValidationError, BusinessError } from "../utils/errors.js";
import logger from "../utils/logger.js";

const router = Router();

// ── PUBLIC: GET /sites/:id/products ───────────────────────────────────────
// No auth — used by the published storefront to list products for checkout.
// Only returns active products for sites that are not disabled.
router.get("/:id/products", asyncHandler(async (req, res) => {
  const db = getAdminClient();

  const { data: site } = await db
    .from("sites")
    .select("id, status")
    .eq("id", req.params.id)
    .single();

  if (!site || site.status === "disabled") throw new NotFoundError("Site");

  const { data: products, error } = await db
    .from("products")
    .select("id, name, description, price, image_url, sort_order")
    .eq("site_id", req.params.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at",  { ascending: true });

  if (error) throw new Error(`getPublicProducts: ${error.message}`);

  send(res, (products ?? []).map(p => ({
    id:          p.id,
    name:        p.name,
    description: p.description,
    price:       p.price,
    imageUrl:    p.image_url,
    sortOrder:   p.sort_order,
  })));
}));

router.use(requireAuth);

// ── GET /sites ─────────────────────────────────────────────────────────────
router.get("/", asyncHandler(async (req, res) => {
  try {
    const sites = await getUserSites(req.userId);
    send(res, sites);
  } catch (error) {
    console.error("SITES ERROR:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}));

// ── POST /sites ────────────────────────────────────────────────────────────
router.post(
  "/",
  validate(schemas.createSite),
  asyncHandler(async (req, res) => {
    const site = await createSite(req.userId, req.body);
    logger.info("Site created", { userId: req.userId, siteId: site.id, slug: site.slug });
    send(res, site, 201);
  })
);

// ── GET /sites/:id ─────────────────────────────────────────────────────────
router.get("/:id", asyncHandler(async (req, res) => {
  const site = await getSite(req.params.id, req.userId);
  if (!site) throw new NotFoundError("Site");
  send(res, site);
}));

// ── PUT /sites/:id/info — SAVE (database only, no deploy) ─────────────────
router.put(
  "/:id/info",
  validate(schemas.updateSiteInfo),
  asyncHandler(async (req, res) => {
    const result = await saveSiteInfo(req.params.id, req.userId, req.body);
    send(res, result);
  })
);

// ── GET /sites/:id/preview ────────────────────────────────────────────────
// Returns merge(content, edits) + config.
// Admins can preview any site; regular users are ownership-checked.
router.get("/:id/preview", asyncHandler(async (req, res) => {
  const isAdmin  = !!req.userProfile?.is_admin;
  const preview  = await getSitePreview(req.params.id, req.userId, isAdmin);
  if (!preview) throw new NotFoundError("Site");
  send(res, preview);
}));

// ── PATCH /sites/:id/edit ─────────────────────────────────────────────────
// Apply a single field override to the user-edits layer.
// Body: { path: "pages.0.sections.1.data.headline", value: "Novo título" }
router.patch(
  "/:id/edit",
  validate(schemas.siteEdit),
  asyncHandler(async (req, res) => {
    const { path, value } = req.body;

    if (!isPathAllowed(path)) {
      throw new ValidationError(
        `Campo "${path}" não é editável. Apenas campos de conteúdo registrados podem ser modificados.`
      );
    }

    const typeCheck = validateFieldValue(path, value);
    if (!typeCheck.ok) {
      throw new ValidationError(typeCheck.error);
    }

    const result = await applyEdit(req.params.id, req.userId, path, value);
    if (!result) throw new NotFoundError("Site");

    logger.info("Site field edited", { userId: req.userId, siteId: req.params.id, path });
    send(res, result);
  })
);

// ── PATCH /sites/:id/config ───────────────────────────────────────────────
// Update site config (colors, logo, contact info, social links).
// Body: { primaryColor?, secondaryColor?, logo?, contact?: {...}, social?: {...} }
router.patch(
  "/:id/config",
  validate(schemas.siteConfig),
  asyncHandler(async (req, res) => {
    const result = await updateConfig(req.params.id, req.userId, req.body);
    if (!result) throw new NotFoundError("Site");

    logger.info("Site config updated", { userId: req.userId, siteId: req.params.id });
    send(res, result);
  })
);

// ── PATCH /sites/:id/status ───────────────────────────────────────────────
// Transition site status. Allowed by users: draft | ready | archived.
// Admins may also set: published (direct, bypassing POST /publish).
router.patch(
  "/:id/status",
  validate(schemas.siteStatus),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const isAdmin    = !!req.userProfile?.is_admin;

    // Only admins can directly set "published" — normal flow uses POST /:id/publish
    if (status === "published" && !isAdmin) {
      throw new ValidationError(
        'Use POST /sites/:id/publish to publish a site. Direct status "published" requires admin.'
      );
    }

    const result = await updateStatus(req.params.id, req.userId, status, isAdmin);
    if (!result) throw new NotFoundError("Site");

    logger.info("Site status changed", {
      userId: req.userId, siteId: req.params.id, newStatus: status,
    });
    send(res, result);
  })
);

// ── POST /sites/:id/publish ───────────────────────────────────────────────
// Publish a site to Vercel. Only allowed when status === "ready".
// Steps: validate → export HTML/CSS/JS → deploy → persist → increment counter.
router.post("/:id/publish", asyncHandler(async (req, res) => {
  const siteId = req.params.id;

  // publishSite: validates status, builds files, deploys to Vercel.
  // It does NOT write to the DB — persistence is handled below.
  let deployResult;
  try {
    deployResult = await publishSite(siteId, req.userId);
  } catch (err) {
    if (err.code === "ALREADY_PUBLISHED") throw new BusinessError(err.message, "ALREADY_PUBLISHED");
    if (err.code === "NOT_READY")         throw new BusinessError(err.message, "NOT_READY");
    if (err.code === "PUBLISH_LIMIT")     throw new BusinessError(err.message, "PUBLISH_LIMIT");
    if (err.code === "SITE_DISABLED")     throw new BusinessError(err.message, "SITE_DISABLED");
    throw err;
  }

  // Persist: set status="published", save site_url, increment site publish_count
  const published = await markSitePublished(siteId, req.userId, deployResult.url);

  // Persist: increment user's monthly publish counter (used by checkPublishLimit)
  await incrementPublishCount(req.userId);

  logger.info("Site published", {
    userId:       req.userId,
    siteId,
    url:          deployResult.url,
    publishCount: published?.publish_count,
  });

  send(res, {
    url:            deployResult.url,
    published_at:   deployResult.published_at,
    publishes_left: deployResult.publishes_left,
    publish_count:  published?.publish_count,
    status:         "published",
  });
}));

// ── PATCH /sites/:id/edits — batch edit (atomic multi-field) ─────────────
// Body: { edits: [{ path, value }, ...] }  — up to 50 fields per request.
// All items are validated (path whitelist + type constraints) before any
// DB write; a single validation failure rejects the entire batch.
router.patch(
  "/:id/edits",
  validate(schemas.batchEdit),
  asyncHandler(async (req, res) => {
    let result;
    try {
      result = await batchApplyEdits(req.params.id, req.userId, req.body.edits);
    } catch (err) {
      if (err.code === "VALIDATION_ERROR") {
        throw new ValidationError("Batch validation failed", err.details);
      }
      throw err;
    }
    if (!result) throw new NotFoundError("Site");

    logger.info("Batch edit applied", {
      userId: req.userId, siteId: req.params.id, count: req.body.edits.length,
    });
    send(res, result);
  })
);

// ── DELETE /sites/:id/edit — revert a single field ────────────────────────
// Body: { path: "pages.0.sections.1.data.headline" }
// Removes the specific override from edits, restoring the AI original for
// that field. Sibling overrides are NOT affected.
router.delete(
  "/:id/edit",
  validate(schemas.revertEdit),
  asyncHandler(async (req, res) => {
    const { path } = req.body;

    if (!isPathAllowed(path)) {
      throw new ValidationError(
        `Campo "${path}" não é editável.`
      );
    }

    const result = await revertEdit(req.params.id, req.userId, path);
    if (!result) throw new NotFoundError("Site");

    logger.info("Edit reverted", { userId: req.userId, siteId: req.params.id, path });
    send(res, result);
  })
);

// ── DELETE /sites/:id/edits — revert ALL edits ────────────────────────────
// Clears the entire edits column, fully restoring the AI-generated original.
router.delete("/:id/edits", asyncHandler(async (req, res) => {
  const result = await revertAllEdits(req.params.id, req.userId);
  if (!result) throw new NotFoundError("Site");

  logger.info("All edits reverted", { userId: req.userId, siteId: req.params.id });
  send(res, result);
}));

// ── DELETE /sites/:id — soft-delete (mark disabled) ───────────────────────
router.delete("/:id", asyncHandler(async (req, res) => {
  const db = getAdminClient();

  // Verify ownership
  const { count, error } = await db
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("id", req.params.id)
    .eq("user_id", req.userId);

  if (error || count === 0) throw new NotFoundError("Site");

  // Soft delete: mark disabled. Hard delete would destroy Vercel deploy reference.
  await disableSite(req.params.id);

  logger.info("Site disabled", { userId: req.userId, siteId: req.params.id });
  send(res, { deleted: true });
}));

export default router;
