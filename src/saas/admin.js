/**
 * admin.js — Admin operations.
 *
 * All functions here use the admin Supabase client (service role).
 * Routes that call these must verify is_admin === true first.
 */

import { getAdminClient } from "./db.js";
import { setCredits } from "./credits.js";

const PLAN_CREDITS = { basic: 10, pro: 50, admin: 9999 };
const PLAN_PUBLISH = { basic: 5,  pro: 50, admin: 9999 };

// ── Users ─────────────────────────────────────────────────────────────────────

/**
 * List all users with their credits and site counts.
 */
export async function listUsers({ limit = 100, offset = 0 } = {}) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("user_overview")   // view defined in saas-schema.sql
    .select("*")
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`listUsers: ${error.message}`);
  return data ?? [];
}

/**
 * Get a single user's full profile.
 */
export async function getUser(userId) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("user_overview")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw new Error(`getUser: ${error.message}`);
  return data;
}

/**
 * Set a user's plan. Also adjusts publish_limit and credits to plan defaults.
 */
export async function setUserPlan(userId, plan) {
  if (!PLAN_CREDITS[plan]) throw new Error(`Invalid plan: ${plan}`);
  const db = getAdminClient();

  await db.from("users").update({
    plan,
    publish_limit: PLAN_PUBLISH[plan],
    updated_at:    new Date().toISOString(),
  }).eq("id", userId);

  // Reset credits to new plan default
  await setCredits(userId, PLAN_CREDITS[plan]);
}

/**
 * Set a specific credit amount for a user (admin override).
 */
export async function setUserCredits(userId, amount) {
  if (typeof amount !== "number" || amount < 0) {
    throw new Error("Amount must be a non-negative number");
  }
  await setCredits(userId, amount);
}

/**
 * Disable a user account + all their sites.
 */
export async function disableUser(userId) {
  const db = getAdminClient();
  await db.rpc("admin_disable_user", { uid: userId });
}

/**
 * Re-enable a user account + restore sites.
 */
export async function enableUser(userId) {
  const db = getAdminClient();
  await db.rpc("admin_enable_user", { uid: userId });
}

/**
 * Reset monthly credits for ALL users (call via cron on 1st of month).
 * Returns count of updated rows.
 */
export async function resetMonthlyCredits() {
  const db = getAdminClient();
  const { data, error } = await db.rpc("admin_reset_monthly_credits");
  if (error) throw new Error(`resetMonthlyCredits: ${error.message}`);
  return { reset: data };
}

// ── Sites (admin can edit any site) ──────────────────────────────────────────

/**
 * List all sites (admin view, all users).
 */
export async function listAllSites({ limit = 100, offset = 0 } = {}) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("sites")
    .select("id, user_id, slug, business_name, niche, status, site_url, publish_count, last_published_at, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`listAllSites: ${error.message}`);
  return data ?? [];
}

/**
 * Disable a specific site (unpaid, violates TOS, etc.).
 */
export async function adminDisableSite(siteId, reason = "") {
  const db = getAdminClient();
  const { error } = await db
    .from("sites")
    .update({ status: "disabled", updated_at: new Date().toISOString() })
    .eq("id", siteId);

  if (error) throw new Error(`adminDisableSite: ${error.message}`);
  return { disabled: true, siteId, reason };
}

/**
 * Re-enable a disabled site.
 */
export async function adminEnableSite(siteId) {
  const db = getAdminClient();
  const { data: site } = await db.from("sites").select("site_url").eq("id", siteId).single();
  const status = site?.site_url ? "published" : "draft";

  const { error } = await db
    .from("sites")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", siteId);

  if (error) throw new Error(`adminEnableSite: ${error.message}`);
}

// ── Check admin ───────────────────────────────────────────────────────────────

export async function isAdmin(userId) {
  const db = getAdminClient();
  const { data } = await db
    .from("users")
    .select("is_admin, is_active")
    .eq("id", userId)
    .single();
  return data?.is_admin === true && data?.is_active === true;
}
