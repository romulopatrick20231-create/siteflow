/**
 * /auth routes — User authentication via Supabase Auth.
 *
 * Note: Most auth operations (signup, signin, password reset) happen
 * client-side directly with Supabase. This router handles server-side
 * session management and profile bootstrapping.
 */

import { Router } from "express";
import Joi        from "joi";
import { requireAuth }  from "../middleware/auth.js";
import { authLimiter, strictLimiter } from "../middleware/rateLimiter.js";
import { validate }     from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import { getAdminClient }     from "../saas/db.js";
import { getUserProfile }     from "../saas/credits.js";
import logger from "../utils/logger.js";

const router = Router();

// ── GET /auth/me — get current user profile + credits ─────────────────────
router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const profile = await getUserProfile(req.userId);
  // type vem do middleware requireAuth (já carregado de public.users)
  send(res, { ...profile, type: req.userProfile?.type ?? null });
}));

// ── POST /auth/profile — update display name / metadata ───────────────────
router.post(
  "/profile",
  requireAuth,
  validate(Joi.object({
    displayName: Joi.string().max(100).trim(),
    avatarUrl:   Joi.string().uri().max(500).allow("", null),
  }).min(1)),
  asyncHandler(async (req, res) => {
    const db = getAdminClient();
    const { displayName, avatarUrl } = req.body;

    const update = { updated_at: new Date().toISOString() };
    if (displayName) update.display_name = displayName;
    if (avatarUrl !== undefined) update.avatar_url = avatarUrl;

    const { error } = await db.from("users").update(update).eq("id", req.userId);
    if (error) throw new Error(`Profile update failed: ${error.message}`);

    send(res, { updated: true });
  })
);

// ── POST /auth/refresh — force profile re-sync (provision if missing) ─────
router.post("/refresh", requireAuth, asyncHandler(async (req, res) => {
  const db = getAdminClient();

  // Ensure user_credits record exists
  await db.from("user_credits").upsert(
    { user_id: req.userId, credits_remaining: 10, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  const profile = await getUserProfile(req.userId);
  logger.info("Profile refreshed", { userId: req.userId });
  send(res, profile);
}));

export default router;
