/**
 * /content routes — Editable site content (SAVE only, no deploy).
 *
 * GET  /content/:siteId — get current content
 * PUT  /content/:siteId — save content (headline, heroCopy, diferenciais, etc.)
 *
 * Design: saving content updates the DB. Publishing is a separate step.
 */

import { Router }       from "express";
import { requireAuth }  from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import { saveSiteContent }    from "../saas/sites.js";
import { getAdminClient }     from "../saas/db.js";
import { NotFoundError }      from "../utils/errors.js";

const router = Router();
router.use(requireAuth);

// ── GET /content/:siteId ───────────────────────────────────────────────────
router.get("/:siteId", asyncHandler(async (req, res) => {
  const db = getAdminClient();

  // Verify ownership and get content
  const { data, error } = await db
    .from("site_content")
    .select("*, sites!inner(user_id, business_name, status)")
    .eq("site_id", req.params.siteId)
    .eq("sites.user_id", req.userId)
    .single();

  if (error || !data) throw new NotFoundError("Site content");
  send(res, data);
}));

// ── PUT /content/:siteId — SAVE (database only, instant) ──────────────────
router.put(
  "/:siteId",
  validate(schemas.updateContent),
  asyncHandler(async (req, res) => {
    const result = await saveSiteContent(req.params.siteId, req.userId, req.body);
    send(res, result);
  })
);

export default router;
