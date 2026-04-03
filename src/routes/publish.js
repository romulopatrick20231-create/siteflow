/**
 * /publish routes — Site publication pipeline.
 *
 * POST /publish/:siteId — build HTML + deploy to Vercel
 * GET  /publish/:siteId/status — check deploy status
 *
 * This is the only route that triggers a Vercel deployment.
 * Save operations never call this route.
 */

import { Router }        from "express";
import { requireAuth }   from "../middleware/auth.js";
import { publishLimiter } from "../middleware/rateLimiter.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import { publishSite }          from "../saas/publishSite.js";
import { markSitePublished }    from "../saas/cmsSaas.js";
import { incrementPublishCount } from "../saas/credits.js";
import { getAdminClient }        from "../saas/db.js";
import { NotFoundError, BusinessError } from "../utils/errors.js";
import logger from "../utils/logger.js";

const router = Router();
router.use(requireAuth);
router.use(publishLimiter);

// ── POST /publish/:siteId ──────────────────────────────────────────────────
router.post("/:siteId", asyncHandler(async (req, res) => {
  const { siteId } = req.params;
  const db = getAdminClient();

  // Verify ownership + site status
  const { data: site, error } = await db
    .from("sites")
    .select("id, status, business_name")
    .eq("id", siteId)
    .eq("user_id", req.userId)
    .single();

  if (error || !site) throw new NotFoundError("Site");
  if (site.status === "disabled") {
    throw new BusinessError(
      "This site has been disabled. Please contact support.",
      "SITE_DISABLED"
    );
  }

  logger.info("Publish requested", { userId: req.userId, siteId, siteName: site.business_name });

  const result = await publishSite(siteId, req.userId);

  await markSitePublished(siteId, req.userId, result.url);
  await incrementPublishCount(req.userId);

  logger.info("Publish complete", {
    userId: req.userId,
    siteId,
    url:    result.url,
  });

  send(res, result);
}));

// ── GET /publish/:siteId/status — current deployment state ────────────────
router.get("/:siteId/status", asyncHandler(async (req, res) => {
  const db = getAdminClient();

  const { data, error } = await db
    .from("sites")
    .select("id, status, site_url, publish_count, last_published_at")
    .eq("id", req.params.siteId)
    .eq("user_id", req.userId)
    .single();

  if (error || !data) throw new NotFoundError("Site");
  send(res, data);
}));

export default router;
