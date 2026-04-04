/**
 * /webhook/stripe — E-commerce Stripe webhook.
 *
 * Handles payment events for product purchases (one-time payments).
 * Mounted with raw body BEFORE express.json() in server.js.
 *
 * Separate from /stripe/webhook which handles subscription billing.
 */

import { Router }  from "express";
import express     from "express";
import { webhookLimiter } from "../middleware/rateLimiter.js";
import { asyncHandler }   from "../utils/asyncHandler.js";
import {
  parseEcommerceWebhook,
  handleOrderPaid,
  handleOrderPaymentFailed,
} from "../services/ecommerceCheckout.js";
import logger from "../utils/logger.js";

export const ecommerceWebhookRouter = Router();

ecommerceWebhookRouter.post(
  "/",
  webhookLimiter,
  express.raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      logger.warn("E-commerce webhook missing stripe-signature");
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    let event;
    try {
      event = parseEcommerceWebhook(req.body, sig);
    } catch (err) {
      logger.error("E-commerce webhook signature failed", { error: err.message });
      return res.status(400).json({ error: err.message });
    }

    logger.info("E-commerce webhook received", { type: event.type, id: event.id });

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleOrderPaid(event.data.object);
          break;
        case "payment_intent.payment_failed":
          await handleOrderPaymentFailed(event.data.object);
          break;
        default:
          logger.debug("Unhandled e-commerce webhook event", { type: event.type });
      }
    } catch (err) {
      logger.error("E-commerce webhook handler error", { type: event.type, error: err.message });
      return res.status(500).json({ error: "Webhook handler failed" });
    }

    res.json({ received: true });
  })
);
