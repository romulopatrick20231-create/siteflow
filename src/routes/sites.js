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
import { getAdminClient }   from "../saas/db.js";
import { NotFoundError }    from "../utils/errors.js";
import logger from "../utils/logger.js";

const router = Router();
router.use(requireAuth);

// ── GET /sites ─────────────────────────────────────────────────────────────
router.get("/", asyncHandler(async (req, res) => {
  const sites = await getUserSites(req.userId);
  send(res, sites);
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
