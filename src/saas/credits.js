/**
 * credits.js — Credit system for AI generation.
 *
 * Rules:
 *   - 1 AI generation = 1 credit
 *   - Credits = 0 → block AI, manual editing always free
 *   - Admin resets credits monthly via admin_reset_monthly_credits() DB function
 */

import { getAdminClient } from "./db.js";

const PLAN_CREDITS = { basic: 10, pro: 50, admin: 9999 };
const PLAN_PUBLISH  = { basic: 5,  pro: 50, admin: 9999 };

// ── Credits ──────────────────────────────────────────────────────────────────

/**
 * Get remaining credits for a user.
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getCredits(userId) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("user_credits")
    .select("credits_remaining")
    .eq("user_id", userId)
    .single();

  if (error) throw new Error(`getCredits: ${error.message}`);
  return data?.credits_remaining ?? 0;
}

/**
 * Deduct 1 credit from user. Throws if insufficient.
 * Returns credits remaining after deduction.
 * @param {string} userId
 * @returns {Promise<number>} credits left after deduction
 */
export async function deductCredit(userId) {
  const db = getAdminClient();

  // Read current balance
  const { data, error: readErr } = await db
    .from("user_credits")
    .select("credits_remaining, credits_used_total")
    .eq("user_id", userId)
    .single();

  if (readErr) throw new Error(`deductCredit read: ${readErr.message}`);

  const current = data?.credits_remaining ?? 0;
  if (current <= 0) {
    const err = new Error("Você não tem créditos restantes. Faça upgrade do seu plano para continuar usando IA.");
    err.code = "NO_CREDITS";
    throw err;
  }

  const { error: updateErr } = await db
    .from("user_credits")
    .update({
      credits_remaining:  current - 1,
      credits_used_total: (data?.credits_used_total ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateErr) throw new Error(`deductCredit update: ${updateErr.message}`);
  return current - 1;
}

/**
 * Admin: set a user's credit balance to a specific amount.
 */
export async function setCredits(userId, amount) {
  const db = getAdminClient();
  const { error } = await db
    .from("user_credits")
    .upsert(
      { user_id: userId, credits_remaining: amount, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw new Error(`setCredits: ${error.message}`);
}

// ── Publish limits ────────────────────────────────────────────────────────────

/**
 * Check if a user is within their monthly publish limit.
 * Auto-resets the counter if it's a new month.
 * @param {string} userId
 * @returns {Promise<{allowed: boolean, remaining: number, limit: number}>}
 */
export async function checkPublishLimit(userId) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("users")
    .select("plan, publish_count_month, publish_limit, month_reset_at, is_active")
    .eq("id", userId)
    .single();

  if (error) throw new Error(`checkPublishLimit: ${error.message}`);
  if (!data?.is_active) {
    const err = new Error("Sua conta está desativada. Entre em contato com o suporte.");
    err.code = "ACCOUNT_DISABLED";
    throw err;
  }

  const limit = data.publish_limit ?? PLAN_PUBLISH[data?.plan ?? "basic"] ?? 5;

  // Auto-reset if new calendar month
  const lastReset = new Date(data.month_reset_at ?? 0);
  const now = new Date();
  const isNewMonth =
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear();

  if (isNewMonth) {
    await db
      .from("users")
      .update({ publish_count_month: 0, month_reset_at: now.toISOString() })
      .eq("id", userId);
    return { allowed: true, remaining: limit, limit };
  }

  const used = data.publish_count_month ?? 0;
  return { allowed: used < limit, remaining: Math.max(0, limit - used), limit };
}

/**
 * Increment the user's monthly publish counter after a successful deploy.
 */
export async function incrementPublishCount(userId) {
  const db = getAdminClient();
  await db.rpc("increment_user_publish_month", { uid: userId });
}

// ── User profile ──────────────────────────────────────────────────────────────

/**
 * Get a user's profile including credits.
 */
export async function getUserProfile(userId) {
  const db = getAdminClient();

  const [profileRes, creditsRes] = await Promise.all([
    db.from("users").select("id, email, plan, is_active, publish_count_month, publish_limit, month_reset_at").eq("id", userId).single(),
    db.from("user_credits").select("credits_remaining, credits_used_total").eq("user_id", userId).single(),
  ]);

  if (profileRes.error) throw new Error(`getUserProfile: ${profileRes.error.message}`);

  return {
    ...profileRes.data,
    credits_remaining:  creditsRes.data?.credits_remaining  ?? 0,
    credits_used_total: creditsRes.data?.credits_used_total ?? 0,
  };
}
