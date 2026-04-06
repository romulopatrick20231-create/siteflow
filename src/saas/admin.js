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
    .select("id, email, plan, is_admin, is_active, publish_count_month, publish_limit, created_at, user_credits(credits_remaining, credits_used_total)")
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
 * Get credits balance for a single user.
 * @param {string} userId
 * @returns {Promise<{ credits_remaining: number, credits_used_total: number }>}
 */
export async function getUserCredits(userId) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("user_credits")
    .select("credits_remaining, credits_used_total")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(`getUserCredits: ${error.message}`);
  return {
    credits_remaining:  data?.credits_remaining  ?? 0,
    credits_used_total: data?.credits_used_total ?? 0,
  };
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
 * Create a new user in Supabase Auth and provision their plan + credits.
 * @param {string} email
 * @param {string} password
 * @param {string} plan — "basic" | "pro" | "admin"
 * @param {string|null} [type] — "pedezap" | "farmazap" | null
 * @returns {Promise<{ id, email, plan, type }>}
 */
export async function createAdminUser(email, password, plan, type = null) {
  if (!PLAN_CREDITS[plan]) throw new Error(`Invalid plan: ${plan}`);
  if (type && !['pedezap', 'farmazap'].includes(type)) {
    throw new Error(`Invalid type: "${type}". Use: pedezap | farmazap`);
  }

  const db = getAdminClient();

  const { data: { user }, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createAdminUser: ${error.message}`);

  // Trigger may not fire instantly — upsert users row defensively
  const userRow = { id: user.id, email, plan, publish_limit: PLAN_PUBLISH[plan] };
  if (type) userRow.type = type;

  await db.from("users").upsert(userRow, { onConflict: "id" });

  // Provision credits
  await db.from("user_credits").upsert(
    { user_id: user.id, credits_remaining: PLAN_CREDITS[plan], credits_used_total: 0 },
    { onConflict: "user_id" }
  );

  return { id: user.id, email, plan, type };
}

/**
 * Reset a user's password via the admin Auth API.
 * @param {string} userId
 * @param {string} password
 */
export async function resetUserPassword(userId, password) {
  const db = getAdminClient();
  const { error } = await db.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(`resetUserPassword: ${error.message}`);
}

/**
 * Set the is_admin flag on a user.
 * @param {string} userId
 * @param {boolean} isAdmin
 */
export async function setUserRole(userId, isAdmin) {
  const db = getAdminClient();
  const { error } = await db
    .from("users")
    .update({ is_admin: isAdmin, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(`setUserRole: ${error.message}`);
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
    .select("id, user_id, slug, business_name, niche, status, site_url, publish_count, last_published_at, created_at, stripe_account_id, checkout_enabled, delivery_fee_fixed, delivery_fee_per_km, currency")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("business_name", `%${search}%`);

  const { data, error } = await query;
  if (error) throw new Error(`listAllSites: ${error.message}`);
  return data ?? [];
}

/**
 * Update Stripe / checkout settings for a site.
 * @param {string} siteId
 * @param {object} fields — subset of { stripe_account_id, checkout_enabled, delivery_fee_fixed, delivery_fee_per_km, currency }
 */
export async function updateSiteStripe(siteId, fields) {
  const db = getAdminClient();
  const { error } = await db
    .from("sites")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", siteId);
  if (error) throw new Error(`updateSiteStripe: ${error.message}`);
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
