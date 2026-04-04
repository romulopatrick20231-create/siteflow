/**
 * /checkout routes — E-commerce product purchases.
 *
 * POST /checkout/create-session — create Stripe Checkout session for products
 */

import { Router }      from "express";
import Joi             from "joi";
import { validate }    from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import { createProductCheckoutSession } from "../services/ecommerceCheckout.js";

const router = Router();

// No auth required — buyers are anonymous customers (not platform users)

const createSessionSchema = Joi.object({
  siteId:     Joi.string().uuid({ version: "uuidv4" }).required(),
  items:      Joi.array().items(
    Joi.object({
      productId: Joi.string().uuid({ version: "uuidv4" }).required(),
      qty:       Joi.number().integer().min(1).max(100).default(1),
    })
  ).min(1).max(20).required(),
  buyerCep:   Joi.string().replace(/\D/g, "").length(8).allow("", null),
  successUrl: Joi.string().uri().max(500).required(),
  cancelUrl:  Joi.string().uri().max(500).required(),
});

// ── POST /checkout/create-session ─────────────────────────────────────────────
router.post(
  "/create-session",
  validate(createSessionSchema),
  asyncHandler(async (req, res) => {
    const { siteId, items, buyerCep, successUrl, cancelUrl } = req.body;

    const result = await createProductCheckoutSession({
      siteId,
      items,
      buyerCep: buyerCep || null,
      successUrl,
      cancelUrl,
    });

    send(res, result, 201);
  })
);

export default router;
