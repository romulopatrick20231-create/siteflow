/**
 * stripe.js — Stripe billing service.
 *
 * Handles:
 *   - Checkout session creation (subscriptions)
 *   - Customer portal (manage subscription)
 *   - Webhook event processing
 *   - Syncing subscription state to DB
 */

import Stripe      from "stripe";
import { env }     from "../config/env.js";
import { getAdminClient } from "../saas/db.js";
import logger      from "../utils/logger.js";
import { BusinessError, ServiceUnavailableError } from "../utils/errors.js";

// Plan config — map plan name to Stripe Price ID and entitlements
const PLANS = {
  basic: {
    priceId:      env.STRIPE_PRICE_BASIC,
    credits:      10,
    publishLimit: 5,
    label:        "Basic",
  },
  pro: {
    priceId:      env.STRIPE_PRICE_PRO,
    credits:      50,
    publishLimit: 50,
    label:        "Pro",
  },
};

let _stripe = null;
function getStripe() {
  if (!env.STRIPE_SECRET_KEY) throw new ServiceUnavailableError("Stripe");
  if (!_stripe) _stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  return _stripe;
}

// ── Checkout ──────────────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout session for a subscription.
 */
export async function createCheckoutSession(userId, userEmail, plan, successUrl, cancelUrl) {
  const stripe = getStripe();
  const planConfig = PLANS[plan];
  if (!planConfig?.priceId) {
    throw new BusinessError(`Plan "${plan}" is not configured. Check STRIPE_PRICE_${plan.toUpperCase()}.`);
  }

  const db = getAdminClient();

  // Get or create Stripe customer
  let customerId = await getStripeCustomerId(userId);
  if (!customerId) {
    const customer = await stripe.customers.create({
      email:    userEmail,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
    await db.from("users").update({
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);
  }

  const session = await stripe.checkout.sessions.create({
    customer:     customerId,
    mode:         "subscription",
    payment_method_types: ["card"],
    line_items:   [{ price: planConfig.priceId, quantity: 1 }],
    success_url:  `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:   cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      supabase_user_id: userId,
      plan,
    },
    subscription_data: {
      metadata: { supabase_user_id: userId, plan },
    },
  });

  logger.info("Checkout session created", { userId, plan, sessionId: session.id });
  return { url: session.url, sessionId: session.id };
}

/**
 * Create a Stripe Customer Portal session.
 */
export async function createPortalSession(userId, returnUrl) {
  const stripe = getStripe();
  const customerId = await getStripeCustomerId(userId);
  if (!customerId) throw new BusinessError("No billing account found. Subscribe to a plan first.");

  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

// ── Webhook ───────────────────────────────────────────────────────────────

/**
 * Process a Stripe webhook event.
 * Called by /stripe/webhook with the raw body buffer.
 */
export async function handleWebhook(rawBody, signature) {
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", { error: err.message });
    throw new BusinessError(`Webhook signature invalid: ${err.message}`);
  }

  logger.info("Stripe webhook received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
        await onSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await onSubscriptionDeleted(event.data.object);
        break;
      case "invoice.payment_failed":
        await onPaymentFailed(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await onPaymentSucceeded(event.data.object);
        break;
      default:
        logger.debug("Unhandled Stripe event", { type: event.type });
    }
  } catch (err) {
    logger.error("Stripe webhook handler error", { type: event.type, error: err.message });
    throw err;
  }

  return { received: true };
}

// ── Event handlers ────────────────────────────────────────────────────────

async function onCheckoutCompleted(session) {
  const userId = session.metadata?.supabase_user_id;
  const plan   = session.metadata?.plan || "basic";
  if (!userId) return;

  await activateSubscription(userId, plan, session.subscription);
  logger.info("Subscription activated", { userId, plan, subscriptionId: session.subscription });
}

async function onSubscriptionUpdated(subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  const plan   = getPlanFromSubscription(subscription);
  const status = subscription.status;

  const db = getAdminClient();
  await db.from("users").update({
    stripe_subscription_id:     subscription.id,
    stripe_subscription_status: status,
    plan:  plan || "basic",
    updated_at: new Date().toISOString(),
  }).eq("id", userId);

  if (status === "active" || status === "trialing") {
    const planConfig = PLANS[plan];
    if (planConfig) {
      await db.from("users").update({ publish_limit: planConfig.publishLimit }).eq("id", userId);
      await db.from("user_credits").upsert(
        { user_id: userId, credits_remaining: planConfig.credits, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    }
  }

  await logStripeEvent("subscription.updated", userId, { plan, status, subscriptionId: subscription.id });
  logger.info("Subscription updated", { userId, plan, status });
}

async function onSubscriptionDeleted(subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  const db = getAdminClient();
  await db.from("users").update({
    plan:                       "basic",
    is_active:                  false,
    stripe_subscription_id:     null,
    stripe_subscription_status: "canceled",
    publish_limit:              PLANS.basic.publishLimit,
    updated_at:                 new Date().toISOString(),
  }).eq("id", userId);

  // Disable all their published sites
  await db.from("sites")
    .update({ status: "disabled", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "published");

  await logStripeEvent("subscription.deleted", userId, { subscriptionId: subscription.id });
  logger.info("Subscription canceled, user deactivated", { userId });
}

async function onPaymentFailed(invoice) {
  const userId = await getUserIdFromCustomer(invoice.customer);
  if (!userId) return;

  const db = getAdminClient();
  await db.from("users").update({
    stripe_subscription_status: "past_due",
    updated_at: new Date().toISOString(),
  }).eq("id", userId);

  await logStripeEvent("payment.failed", userId, {
    invoiceId: invoice.id,
    amount:    invoice.amount_due,
  });
  logger.warn("Payment failed", { userId, invoiceId: invoice.id });
}

async function onPaymentSucceeded(invoice) {
  if (invoice.billing_reason !== "subscription_cycle") return;  // skip first payment

  const userId = await getUserIdFromCustomer(invoice.customer);
  if (!userId) return;

  const db = getAdminClient();
  const { data: user } = await db.from("users").select("plan").eq("id", userId).single();
  const planConfig     = PLANS[user?.plan || "basic"];

  if (planConfig) {
    // Monthly renewal: reset credits + publish count
    await db.from("user_credits").upsert(
      { user_id: userId, credits_remaining: planConfig.credits, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    await db.from("users").update({
      publish_count_month: 0,
      month_reset_at:      new Date().toISOString(),
      is_active:           true,
      updated_at:          new Date().toISOString(),
    }).eq("id", userId);
  }

  await logStripeEvent("payment.succeeded", userId, { invoiceId: invoice.id });
  logger.info("Monthly renewal processed", { userId });
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function activateSubscription(userId, plan, subscriptionId) {
  const planConfig = PLANS[plan] || PLANS.basic;
  const db         = getAdminClient();

  await db.from("users").update({
    plan,
    is_active:                  true,
    publish_limit:              planConfig.publishLimit,
    stripe_subscription_id:     subscriptionId,
    stripe_subscription_status: "active",
    updated_at:                 new Date().toISOString(),
  }).eq("id", userId);

  await db.from("user_credits").upsert(
    { user_id: userId, credits_remaining: planConfig.credits, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  await logStripeEvent("subscription.activated", userId, { plan, subscriptionId });
}

async function getStripeCustomerId(userId) {
  const db = getAdminClient();
  const { data } = await db.from("users").select("stripe_customer_id").eq("id", userId).single();
  return data?.stripe_customer_id || null;
}

async function getUserIdFromCustomer(customerId) {
  const db = getAdminClient();
  const { data } = await db.from("users").select("id").eq("stripe_customer_id", customerId).single();
  return data?.id || null;
}

function getPlanFromSubscription(subscription) {
  const meta = subscription.metadata?.plan;
  if (meta && PLANS[meta]) return meta;

  // Fallback: match price ID
  const priceId = subscription.items?.data?.[0]?.price?.id;
  for (const [name, config] of Object.entries(PLANS)) {
    if (config.priceId === priceId) return name;
  }
  return "basic";
}

async function logStripeEvent(type, userId, data) {
  try {
    const db = getAdminClient();
    await db.from("stripe_events").insert({
      type,
      user_id: userId,
      data,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("Failed to log Stripe event", { type, userId, error: err.message });
  }
}

export { PLANS };
