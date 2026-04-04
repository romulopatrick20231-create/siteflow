/**
 * /ai routes — Credit-gated AI content generation.
 *
 * POST /ai/generate   — generate content field (costs 1 credit)
 * GET  /ai/credits    — get current credit balance
 *
 * Security:
 *   - requireAuth on all routes
 *   - aiLimiter: 20 req/hour per user (rate-layer defense)
 *   - Credit deducted BEFORE calling OpenAI (business-layer defense)
 *   - Context fields are validated + sanitized by Joi
 */

import { Router }       from "express";
import { requireAuth }  from "../middleware/auth.js";
import { aiLimiter }    from "../middleware/rateLimiter.js";
import { validate, schemas } from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import { generateContent, generateFromPrompt } from "../saas/aiGenerate.js";
import { getCredits }        from "../saas/credits.js";
import { getAdminClient }    from "../saas/db.js";
import { NotFoundError }     from "../utils/errors.js";
import logger from "../utils/logger.js";

const router = Router();
router.use(requireAuth);
router.use(aiLimiter);

// ── GET /ai/credits ────────────────────────────────────────────────────────
router.get("/credits", asyncHandler(async (req, res) => {
  const credits = await getCredits(req.userId);
  send(res, { credits_remaining: credits });
}));

// ── POST /ai/generate ──────────────────────────────────────────────────────
router.post(
  "/generate",
  validate(schemas.generateAI),
  asyncHandler(async (req, res) => {
    let { siteId, type, context, prompt } = req.body;
    const db = getAdminClient();

    if (siteId) {
      // Explicit siteId — verify ownership
      const { count } = await db
        .from("sites")
        .select("id", { count: "exact", head: true })
        .eq("id", siteId)
        .eq("user_id", req.userId);
      if (!count) throw new NotFoundError("Site");
    } else {
      // Auto-resolve user's primary site
      const { data: siteData } = await db
        .from("sites")
        .select("id")
        .eq("user_id", req.userId)
        .neq("status", "disabled")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      siteId = siteData?.id ?? null;
    }

    // prompt format: { siteId, prompt, siteContext? }
    // typed format:  { siteId, type, context }
    const result = prompt
      ? await generateFromPrompt(req.userId, prompt, req.body.siteContext ?? null)
      : await generateContent(req.userId, type, context);

    logger.info("AI content generated", {
      userId:      req.userId,
      siteId,
      type:        type || "prompt",
      creditsLeft: result.credits_remaining,
    });

    send(res, result);
  })
);

export default router;
