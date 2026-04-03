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
 *
 * @param {object} opts
 * @param {number}  opts.limit
 * @param {number}  opts.offset
 * @param {string}  [opts.search]  — partial match on email (case-insensitive)
 * @param {string}  [opts.plan]    — filter by plan ("basic" | "pro" | "admin")
 * @param {boolean} [opts.active]  — filter by is_active flag
 */
export async function listUsers({ limit = 100, offset = 0, search, plan, active } = {}) {
  const db = getAdminClient();
  let query = db
    .from("users")
    .select("id, email, plan, is_admin, is_active, publish_count_month, publish_limit, created_at")
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  if (search)               query = query.ilike("email", `%${search}%`);
  if (plan)                 query = query.eq("plan", plan);
  if (active !== undefined) query = query.eq("is_active", active);

  const { data, error } = await query;
  if (error) throw new Error(`listUsers: ${error.message}`);
  return data ?? [];
}

/**
 * Get a single user's full profile.
 */
export async function getUser(userId) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("users")
    .select("id, email, plan, is_admin, is_active, publish_count_month, publish_limit, created_at")
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
 * List all sites across all users (admin view).
 * Includes the owner's email for display in the admin panel.
 *
 * @param {object} opts
 * @param {number} opts.limit
 * @param {number} opts.offset
 * @param {string} [opts.status]  — filter by status
 * @param {string} [opts.search]  — partial match on business_name (case-insensitive)
 */
export async function listAllSites({ limit = 100, offset = 0, status, search } = {}) {
  const db = getAdminClient();
  let query = db
    .from("sites")
    .select("id, user_id, slug, business_name, niche, status, site_url, publish_count, last_published_at, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("business_name", `%${search}%`);

  const { data, error } = await query;
  if (error) throw new Error(`listAllSites: ${error.message}`);
  return data ?? [];
}

/**
 * Force-set a site's status directly (admin override — no transition validation).
 * Valid values: "draft" | "ready" | "published" | "archived" | "disabled"
 *
 * @param {string} siteId
 * @param {string} status
 */
export async function setSiteStatus(siteId, status) {
  const VALID = new Set(["draft", "ready", "published", "archived", "disabled"]);
  if (!VALID.has(status)) throw new Error(`Invalid status: ${status}`);

  const db = getAdminClient();
  const { error } = await db
    .from("sites")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", siteId);

  if (error) throw new Error(`setSiteStatus: ${error.message}`);
  return { siteId, status };
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
