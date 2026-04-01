/**
 * /stripe routes — Subscription billing.
 *
 * POST /stripe/checkout      — create Stripe Checkout session
 * POST /stripe/portal        — open Customer Portal
 * GET  /stripe/subscription  — current subscription status
 * POST /stripe/webhook       — Stripe webhook (raw body — mounted separately)
 */

import { Router }       from "express";
import express          from "express";
import Joi              from "joi";
import { requireAuth }  from "../middleware/auth.js";
import { webhookLimiter } from "../middleware/rateLimiter.js";
import { validate, schemas } from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
} from "../services/stripe.js";
import { getAdminClient }   from "../saas/db.js";
import { BusinessError }    from "../utils/errors.js";
import logger from "../utils/logger.js";

const router = Router();

// ── POST /stripe/webhook — must be registered BEFORE json middleware ───────
// This route is mounted separately in server.js with express.raw()
export const webhookRouter = Router();
webhookRouter.post(
  "/",
  webhookLimiter,
  express.raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      logger.warn("Stripe webhook missing signature header");
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    try {
      const result = await handleWebhook(req.body, sig);
      res.json(result);
    } catch (err) {
      logger.error("Stripe webhook processing failed", { error: err.message });
      res.status(400).json({ error: err.message });
    }
  })
);

// ── All other billing routes require auth ─────────────────────────────────
router.use(requireAuth);

// ── POST /stripe/checkout ──────────────────────────────────────────────────
router.post(
  "/checkout",
  validate(schemas.stripeCheckout),
  asyncHandler(async (req, res) => {
    const { plan, successUrl, cancelUrl } = req.body;
    const db = getAdminClient();

    // Prevent double-subscribing
    const { data: user } = await db
      .from("users")
      .select("stripe_subscription_status")
      .eq("id", req.userId)
      .single();

    if (user?.stripe_subscription_status === "active") {
      throw new BusinessError("You already have an active subscription. Manage it via the portal.");
    }

    const result = await createCheckoutSession(
      req.userId,
      req.user.email,
      plan,
      successUrl,
      cancelUrl
    );

    logger.info("Checkout session created", { userId: req.userId, plan, sessionId: result.sessionId });
    send(res, result);
  })
);

// ── POST /stripe/portal ────────────────────────────────────────────────────
router.post(
  "/portal",
  validate(Joi.object({ returnUrl: Joi.string().uri().max(500).required() })),
  asyncHandler(async (req, res) => {
    const result = await createPortalSession(req.userId, req.body.returnUrl);
    send(res, result);
  })
);

// ── GET /stripe/subscription ───────────────────────────────────────────────
router.get("/subscription", asyncHandler(async (req, res) => {
  const db = getAdminClient();
  const { data } = await db
    .from("users")
    .select("plan, stripe_subscription_id, stripe_subscription_status, is_active")
    .eq("id", req.userId)
    .single();

  send(res, {
    plan:               data?.plan || "basic",
    subscriptionId:     data?.stripe_subscription_id || null,
    status:             data?.stripe_subscription_status || "none",
    isActive:           data?.is_active ?? false,
  });
}));

export default router;
