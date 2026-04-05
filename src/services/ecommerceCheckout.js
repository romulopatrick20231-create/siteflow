/**
 * ecommerceCheckout.js — Stripe Checkout for product purchases (one-time payments).
 *
 * Separate from the subscription billing in services/stripe.js.
 * Uses STRIPE_ECOMMERCE_WEBHOOK_SECRET for webhook verification.
 */

import Stripe from "stripe";
import { env } from "../config/env.js";
import { getAdminClient } from "../saas/db.js";
import { calcDeliveryFee } from "./delivery.js";
import logger from "../utils/logger.js";
import { BusinessError, NotFoundError, ServiceUnavailableError } from "../utils/errors.js";

let _stripe = null;
function getStripe() {
  if (!env.STRIPE_SECRET_KEY) throw new ServiceUnavailableError("Stripe");
  if (!_stripe) _stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  return _stripe;
}

// ── Create session ─────────────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout session for a product purchase.
 *
 * @param {object} opts
 * @param {string}   opts.siteId
 * @param {Array<{productId: string, qty: number}>} opts.items
 * @param {string}   [opts.buyerCep]
 * @param {string}   opts.successUrl
 * @param {string}   opts.cancelUrl
 * @returns {Promise<{url: string, orderId: string}>}
 */
export async function createProductCheckoutSession({ siteId, items, buyerCep, successUrl, cancelUrl }) {
  const stripe = getStripe();
  const db = getAdminClient();

  // Validate site exists and is active
  const { data: site } = await db
    .from("sites")
    .select("id, cep, business_name, status")
    .eq("id", siteId)
    .single();

  if (!site) throw new NotFoundError("Site");
  if (site.status === "disabled") throw new BusinessError("Este site está indisponível.", "SITE_DISABLED");

  // Fetch requested products (must belong to this site and be active)
  const productIds = items.map(i => i.productId);
  const { data: products } = await db
    .from("products")
    .select("id, name, price, is_active")
    .eq("site_id", siteId)
    .eq("is_active", true)
    .in("id", productIds);

  if (!products?.length) throw new NotFoundError("Products");

  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  // Build line items + calculate subtotal
  const lineItems = [];
  let subtotalCents = 0;

  for (const { productId, qty } of items) {
    const product = productMap[productId];
    if (!product) throw new BusinessError(`Produto não encontrado: ${productId}`, "PRODUCT_NOT_FOUND");
    if (!product.price && product.price !== 0) {
      throw new BusinessError(`O produto "${product.name}" não tem preço definido.`, "NO_PRICE");
    }

    const unitCents = Math.round(product.price * 100);
    subtotalCents += unitCents * qty;

    lineItems.push({
      price_data: {
        currency: "brl",
        product_data: { name: product.name },
        unit_amount: unitCents,
      },
      quantity: qty,
    });
  }

  // Calculate delivery fee
  const deliveryCents = buyerCep
    ? await calcDeliveryFee(buyerCep, site.cep || null)
    : 0;

  const totalCents = subtotalCents + deliveryCents;

  if (deliveryCents > 0) {
    lineItems.push({
      price_data: {
        currency: "brl",
        product_data: { name: "Taxa de entrega" },
        unit_amount: deliveryCents,
      },
      quantity: 1,
    });
  }

  // Create pending order record with placeholder session ID
  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      site_id:        siteId,
      stripe_session_id: "pending_" + Date.now(),
      customer_cep:   buyerCep || null,
      subtotal_cents: subtotalCents,
      delivery_cents: deliveryCents,
      total_cents:    totalCents,
      status:         "pending",
    })
    .select()
    .single();

  if (orderErr) throw new Error(`createOrder: ${orderErr.message}`);

  // Insert order items
  await db.from("order_items").insert(
    items.map(({ productId, qty }) => {
      const p = productMap[productId];
      const unitCents = Math.round(p.price * 100);
      return {
        order_id:        order.id,
        product_id:      productId,
        product_name:    p.name,
        unit_price_cents: unitCents,
        qty,
        total_cents:     unitCents * qty,
      };
    })
  );

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
    cancel_url:  cancelUrl,
    metadata: {
      orderId: order.id,
      siteId,
      type: "ecommerce",
    },
    phone_number_collection: { enabled: true },
    billing_address_collection: "required",
  });

  // Update order with real Stripe session ID
  await db.from("orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id);

  logger.info("E-commerce checkout session created", {
    siteId,
    orderId: order.id,
    totalCents,
    sessionId: session.id,
  });

  return { url: session.url, orderId: order.id };
}

// ── Menu checkout (AI-generated menu items) ────────────────────────────────────

/**
 * Parse a price string like "R$ 45,90" or number 45.9 into BRL cents.
 */
function parsePriceToCents(price) {
  if (typeof price === "number") return Math.round(price * 100);
  const cleaned = String(price).replace(/[^\d,\.]/g, "").replace(",", ".");
  const num = parseFloat(cleaned) || 0;
  return Math.round(num * 100);
}

/**
 * Create Stripe Checkout session for AI-generated menu items (food/retail sites).
 * Items are name+price strings — no DB product lookup needed.
 *
 * @param {object} opts
 * @param {string}   opts.siteId
 * @param {Array<{name:string, price:string|number, qty:number}>} opts.items
 * @param {string}   opts.deliveryType  "retirada" | "delivery"
 * @param {string}   [opts.buyerCep]
 * @param {string}   opts.successUrl
 * @param {string}   opts.cancelUrl
 */
export async function createMenuCheckoutSession({ siteId, items, deliveryType, buyerCep, successUrl, cancelUrl }) {
  const stripe = getStripe();
  const db = getAdminClient();

  // Validate site exists
  const { data: site } = await db
    .from("sites")
    .select("id, cep, business_name, status")
    .eq("id", siteId)
    .single();

  if (!site) throw new NotFoundError("Site");
  if (site.status === "disabled") throw new BusinessError("Este site está indisponível.", "SITE_DISABLED");

  // Build line items from raw name+price
  const lineItems = [];
  let subtotalCents = 0;

  for (const { name, price, qty = 1 } of items) {
    const unitCents = parsePriceToCents(price);
    if (unitCents <= 0) continue; // skip free items
    subtotalCents += unitCents * qty;
    lineItems.push({
      price_data: {
        currency: "brl",
        product_data: { name: String(name).slice(0, 200) },
        unit_amount: unitCents,
      },
      quantity: qty,
    });
  }

  if (!lineItems.length) throw new BusinessError("Nenhum item com preço válido no carrinho.", "NO_PRICED_ITEMS");

  // Delivery fee
  let deliveryCents = 0;
  if (deliveryType === "delivery" && buyerCep) {
    deliveryCents = await calcDeliveryFee(buyerCep, site.cep || null);
    if (deliveryCents > 0) {
      lineItems.push({
        price_data: { currency: "brl", product_data: { name: "Taxa de entrega" }, unit_amount: deliveryCents },
        quantity: 1,
      });
    }
  }

  const totalCents = subtotalCents + deliveryCents;

  // Create pending order
  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      site_id:        siteId,
      stripe_session_id: "pending_" + Date.now(),
      customer_cep:   buyerCep || null,
      subtotal_cents: subtotalCents,
      delivery_cents: deliveryCents,
      total_cents:    totalCents,
      status:         "pending",
      delivery_type:  deliveryType || "retirada",
    })
    .select()
    .single();

  if (orderErr) {
    logger.warn("Could not create order record — continuing without it", { error: orderErr.message });
  }

  // Insert order items (if order was created)
  if (order) {
    await db.from("order_items").insert(
      items.filter(i => parsePriceToCents(i.price) > 0).map(({ name, price, qty = 1 }) => ({
        order_id:         order.id,
        product_id:       null,
        product_name:     String(name).slice(0, 200),
        unit_price_cents: parsePriceToCents(price),
        qty,
        total_cents:      parsePriceToCents(price) * qty,
      }))
    ).catch(e => logger.warn("order_items insert failed", { error: e.message }));
  }

  // Create Stripe session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}${order ? `&order_id=${order.id}` : ""}`,
    cancel_url:  cancelUrl,
    locale: "pt-BR",
    metadata: {
      orderId:  order?.id || "no-record",
      siteId,
      type:     "ecommerce",
      source:   "menu",
    },
    phone_number_collection:   { enabled: true },
    billing_address_collection: "auto",
  });

  if (order) {
    await db.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id)
      .catch(() => {});
  }

  logger.info("Menu checkout session created", { siteId, orderId: order?.id, totalCents, sessionId: session.id });

  return { url: session.url, orderId: order?.id || null };
}

/**
 * Calculate delivery fee and return formatted result.
 * Used by GET /checkout/delivery-fee for the cart UI.
 */
export async function getDeliveryFee({ buyerCep, siteId }) {
  const db = getAdminClient();
  let sellerCep = null;

  if (siteId) {
    const { data: site } = await db.from("sites").select("cep").eq("id", siteId).single().catch(() => ({ data: null }));
    sellerCep = site?.cep || null;
  }

  const feeCents = await calcDeliveryFee(buyerCep, sellerCep);
  return {
    feeCents,
    feeFormatted: "R$ " + (feeCents / 100).toFixed(2).replace(".", ","),
  };
}

// ── Webhook handlers ───────────────────────────────────────────────────────────

/**
 * Verify and parse an e-commerce Stripe webhook event.
 */
export function parseEcommerceWebhook(rawBody, signature) {
  const stripe = getStripe();
  const secret = env.STRIPE_ECOMMERCE_WEBHOOK_SECRET;

  if (!secret) throw new BusinessError("STRIPE_ECOMMERCE_WEBHOOK_SECRET not configured");

  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    throw new BusinessError(`Webhook signature invalid: ${err.message}`);
  }
}

/**
 * Handle checkout.session.completed — mark order as paid.
 */
export async function handleOrderPaid(session) {
  if (session.metadata?.type !== "ecommerce") return;
  const { orderId } = session.metadata || {};
  if (!orderId) return;

  const db = getAdminClient();
  await db.from("orders").update({
    status:                 "paid",
    stripe_payment_intent:  session.payment_intent,
    customer_name:          session.customer_details?.name  || null,
    customer_email:         session.customer_details?.email || null,
    customer_phone:         session.customer_details?.phone || null,
    updated_at:             new Date().toISOString(),
  }).eq("id", orderId);

  logger.info("Order marked as paid", { orderId, sessionId: session.id });
}

/**
 * Handle payment_intent.payment_failed — mark order as failed.
 */
export async function handleOrderPaymentFailed(paymentIntent) {
  const db = getAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent", paymentIntent.id)
    .single();

  if (!order) return;

  await db.from("orders").update({
    status:     "failed",
    updated_at: new Date().toISOString(),
  }).eq("id", order.id);

  logger.warn("Order payment failed", { orderId: order.id, paymentIntentId: paymentIntent.id });
}
