/**
 * /credits routes — User credit balance.
 *
 * GET /credits — return remaining and total used credits
 */

import { Router }       from "express";
import { requireAuth }  from "../middleware/auth.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import { getAdminClient } from "../saas/db.js";
import { AppError } from "../utils/errors.js";

const router = Router();
router.use(requireAuth);

// ── GET /credits ────────────────────────────────────────────────────────────
router.get("/", asyncHandler(async (req, res) => {
  const db = getAdminClient();
  const { data, error } = await db
    .from("user_credits")
    .select("credits_remaining, credits_used_total")
    .eq("user_id", req.userId)
    .single();

  if (error) throw new AppError(`Failed to load credits: ${error.message}`, 500, "DB_ERROR");

  const remaining  = data?.credits_remaining  ?? 0;
  const totalUsed  = data?.credits_used_total ?? 0;

  send(res, {
    // canonical field names (DB)
    credits_remaining:  remaining,
    credits_used_total: totalUsed,
    // aliases expected by frontend
    remaining,
    total_used: totalUsed,
  });
}));

export default router;
