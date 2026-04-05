/**
 * /checkout routes — E-commerce product purchases.
 *
 * POST /checkout/create-session      — Stripe session for DB products (productId)
 * POST /checkout/create-menu-session — Stripe session for AI menu items (name+price)
 * GET  /checkout/delivery-fee        — Calculate delivery fee from buyer CEP
 */

import { Router }      from "express";
import Joi             from "joi";
import { validate }    from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import {
  createProductCheckoutSession,
  createMenuCheckoutSession,
  getDeliveryFee,
} from "../services/ecommerceCheckout.js";

const router = Router();

// ── POST /checkout/create-session ─────────────────────────────────────────────
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

router.post(
  "/create-session",
  validate(createSessionSchema),
  asyncHandler(async (req, res) => {
    const { siteId, items, buyerCep, successUrl, cancelUrl } = req.body;
    const result = await createProductCheckoutSession({ siteId, items, buyerCep: buyerCep || null, successUrl, cancelUrl });
    send(res, result, 201);
  })
);

// ── POST /checkout/create-menu-session ────────────────────────────────────────
// Used by premium food/retail templates where menu items come from AI content,
// not from the products DB table. Items validated against site content.
const createMenuSessionSchema = Joi.object({
  siteId:       Joi.string().uuid({ version: "uuidv4" }).required(),
  items:        Joi.array().items(
    Joi.object({
      name:  Joi.string().max(200).required(),
      price: Joi.alternatives().try(Joi.number().min(0), Joi.string().max(30)).required(),
      qty:   Joi.number().integer().min(1).max(100).default(1),
    })
  ).min(1).max(30).required(),
  deliveryType: Joi.string().valid("retirada", "delivery").default("retirada"),
  buyerCep:     Joi.string().replace(/\D/g, "").length(8).allow("", null),
  successUrl:   Joi.string().uri().max(500).required(),
  cancelUrl:    Joi.string().uri().max(500).required(),
});

router.post(
  "/create-menu-session",
  validate(createMenuSessionSchema),
  asyncHandler(async (req, res) => {
    const { siteId, items, deliveryType, buyerCep, successUrl, cancelUrl } = req.body;
    const result = await createMenuCheckoutSession({
      siteId, items, deliveryType,
      buyerCep: (deliveryType === "delivery" ? buyerCep : null) || null,
      successUrl, cancelUrl,
    });
    send(res, result, 201);
  })
);

// ── GET /checkout/delivery-fee ────────────────────────────────────────────────
router.get(
  "/delivery-fee",
  asyncHandler(async (req, res) => {
    const { buyerCep, siteId } = req.query;
    if (!buyerCep || buyerCep.replace(/\D/g, "").length !== 8) {
      return send(res, { feeCents: 800, feeFormatted: "R$ 8,00" });
    }
    const result = await getDeliveryFee({ buyerCep, siteId: siteId || null });
    send(res, result);
  })
);

export default router;
