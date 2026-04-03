/**
 * cmsSaas.js — Database layer for CMS operations.
 *
 * Handles all Supabase queries for the CMS:
 *   preview   — fetch + merge content + edits, with cache
 *   edit      — write a single field override to the edits column
 *   config    — update the config block (colors, logo, contact, social)
 *   status    — transition site status with allowed-transition validation
 *   publish   — mark a "ready" site as "published", increment publish_count
 *
 * All functions enforce user ownership via .eq("user_id", userId).
 * Admin bypass is handled at the route layer (adminSiteQuery helper below).
 */

import { getAdminClient } from "./db.js";
import {
  mergeSiteData,
  setAtPath,
  deleteAtPath,
  getCached,
  setCached,
  invalidateCache,
} from "./mergeEngine.js";
import { isPathAllowed, validateFieldValue } from "./fieldRegistry.js";
import logger from "../utils/logger.js";

// ── Allowed status transitions ─────────────────────────────────────────────
// "published" is only set by cmsSaas.publishSite — not via status endpoint.
// Admins can also force "published" via the status endpoint (route layer flag).

const STATUS_TRANSITIONS = {
  draft:     ["ready", "archived"],
  ready:     ["draft", "archived"],
  published: ["archived"],
  archived:  ["draft"],
};

// ── Internal helpers ───────────────────────────────────────────────────────

/**
 * Load a site row, enforcing ownership.
 * If isAdmin is true, the user_id check is skipped (admin can access any site).
 *
 * @param {string}  siteId
 * @param {string}  userId
 * @param {string}  select   — columns to select
 * @param {boolean} isAdmin
 */
async function ownedSite(siteId, userId, select, isAdmin = false) {
  const db = getAdminClient();
  let query = db.from("sites").select(select).eq("id", siteId);
  if (!isAdmin) query = query.eq("user_id", userId);
  const { data, error } = await query.single();
  if (error || !data) return null;
  return data;
}

// ── Preview ────────────────────────────────────────────────────────────────

/**
 * Return the merged site view (content + edits) for preview.
 * Result is cached in-process for 60 seconds.
 *
 * @param {string}  siteId
 * @param {string}  userId
 * @param {boolean} isAdmin
 * @returns {Promise<object|null>}
 */
export async function getSitePreview(siteId, userId, isAdmin = false) {
  const cached = getCached(siteId);
  if (cached) return cached;

  const site = await ownedSite(
    siteId,
    userId,
    "id, user_id, slug, business_name, niche, status, content, edits, config, site_url",
    isAdmin
  );
  if (!site) return null;

  const merged = {
    id:            site.id,
    user_id:       site.user_id,
    slug:          site.slug,
    business_name: site.business_name,
    niche:         site.niche,
    status:        site.status,
    url:           site.site_url || null,
    config:        site.config  || {},
    // Deep merge: edits always wins over AI content
    content:       mergeSiteData(site.content || {}, site.edits || {}),
  };

  setCached(siteId, merged);
  return merged;
}

// ── Edit ──────────────────────────────────────────────────────────────────

/**
 * Apply a single field override to the site's edits column.
 *
 * @param {string}  siteId
 * @param {string}  userId
 * @param {string}  path   — dot-separated path, e.g. "pages.0.sections.1.data.headline"
 * @param {unknown} value  — new value (string, number, boolean, null)
 * @returns {Promise<{id, edits, updated_at}|null>}
 */
export async function applyEdit(siteId, userId, path, value) {
  const db   = getAdminClient();
  const site = await ownedSite(siteId, userId, "id, edits");
  if (!site) return null;

  const newEdits = setAtPath(site.edits || {}, path, value);

  const { data, error } = await db
    .from("sites")
    .update({ edits: newEdits, updated_at: new Date().toISOString() })
    .eq("id", siteId)
    .eq("user_id", userId)
    .select("id, edits, updated_at")
    .single();

  if (error) throw new Error(`applyEdit: ${error.message}`);

  invalidateCache(siteId);
  logger.info("Site edit applied", { siteId, path, valueType: typeof value });
  return data;
}

// ── Config ────────────────────────────────────────────────────────────────

/**
 * Deep-merge a config patch into the site's config column.
 * Safe keys: primaryColor, secondaryColor, logo, contact, social.
 *
 * @param {string} siteId
 * @param {string} userId
 * @param {object} patch  — partial config object
 * @returns {Promise<{id, config, updated_at}|null>}
 */
export async function updateConfig(siteId, userId, patch) {
  const db   = getAdminClient();
  const site = await ownedSite(siteId, userId, "id, config");
  if (!site) return null;

  const newConfig = mergeSiteData(site.config || {}, patch);

  const { data, error } = await db
    .from("sites")
    .update({ config: newConfig, updated_at: new Date().toISOString() })
    .eq("id", siteId)
    .eq("user_id", userId)
    .select("id, config, updated_at")
    .single();

  if (error) throw new Error(`updateConfig: ${error.message}`);

  invalidateCache(siteId);
  logger.info("Site config updated", { siteId });
  return data;
}

// ── Batch Edit ────────────────────────────────────────────────────────────

/**
 * Apply multiple field overrides atomically in a single DB write.
 *
 * Each item in `editsList` is { path, value }.  All paths are validated
 * against the field registry (type + constraints) before any write occurs.
 * If any item fails validation the entire batch is rejected.
 *
 * @param {string}   siteId
 * @param {string}   userId
 * @param {{ path: string, value: unknown }[]} editsList
 * @returns {Promise<{ id, edits, updated_at } | null>}
 * @throws on validation failure or DB error
 */
export async function batchApplyEdits(siteId, userId, editsList) {
  // ── Validate all paths/values before touching the DB ──
  const violations = [];
  for (const { path, value } of editsList) {
    if (!isPathAllowed(path)) {
      violations.push({ path, error: `Campo não editável` });
      continue;
    }
    const check = validateFieldValue(path, value);
    if (!check.ok) violations.push({ path, error: check.error });
  }

  if (violations.length > 0) {
    const err = new Error("Batch edit validation failed");
    err.code       = "VALIDATION_ERROR";
    err.statusCode = 400;
    err.details    = violations;
    throw err;
  }

  // ── Load current edits once ──
  const db   = getAdminClient();
  const site = await ownedSite(siteId, userId, "id, edits");
  if (!site) return null;

  // ── Apply all paths sequentially on the in-memory clone ──
  let newEdits = site.edits || {};
  for (const { path, value } of editsList) {
    newEdits = setAtPath(newEdits, path, value);
  }

  // ── Single DB write ──
  const { data, error } = await db
    .from("sites")
    .update({ edits: newEdits, updated_at: new Date().toISOString() })
    .eq("id", siteId)
    .eq("user_id", userId)
    .select("id, edits, updated_at")
    .single();

  if (error) throw new Error(`batchApplyEdits: ${error.message}`);

  invalidateCache(siteId);
  logger.info("Batch edit applied", { siteId, count: editsList.length });
  return data;
}

// ── Revert single edit ─────────────────────────────────────────────────────

/**
 * Remove a single user override, restoring the AI-generated original for
 * that field.  If the path is not present in edits this is a no-op.
 *
 * @param {string} siteId
 * @param {string} userId
 * @param {string} path  — dot-path to remove from edits
 * @returns {Promise<{ id, edits, updated_at } | null>}
 */
export async function revertEdit(siteId, userId, path) {
  const db   = getAdminClient();
  const site = await ownedSite(siteId, userId, "id, edits");
  if (!site) return null;

  const newEdits = deleteAtPath(site.edits || {}, path);

  const { data, error } = await db
    .from("sites")
    .update({ edits: newEdits, updated_at: new Date().toISOString() })
    .eq("id", siteId)
    .eq("user_id", userId)
    .select("id, edits, updated_at")
    .single();

  if (error) throw new Error(`revertEdit: ${error.message}`);

  invalidateCache(siteId);
  logger.info("Edit reverted", { siteId, path });
  return data;
}

// ── Revert all edits ───────────────────────────────────────────────────────

/**
 * Clear all user overrides for a site, fully restoring the AI original.
 *
 * @param {string} siteId
 * @param {string} userId
 * @returns {Promise<{ id, edits, updated_at } | null>}
 */
export async function revertAllEdits(siteId, userId) {
  const db   = getAdminClient();
  const site = await ownedSite(siteId, userId, "id");
  if (!site) return null;

  const { data, error } = await db
    .from("sites")
    .update({ edits: {}, updated_at: new Date().toISOString() })
    .eq("id", siteId)
    .eq("user_id", userId)
    .select("id, edits, updated_at")
    .single();

  if (error) throw new Error(`revertAllEdits: ${error.message}`);

  invalidateCache(siteId);
  logger.info("All edits reverted", { siteId });
  return data;
}

// ── Status ────────────────────────────────────────────────────────────────

/**
 * Transition a site to a new status.
 * Validates the transition against STATUS_TRANSITIONS.
 * isAdmin=true also allows ready→published directly.
 *
 * @param {string}  siteId
 * @param {string}  userId
 * @param {string}  newStatus
 * @param {boolean} isAdmin
 * @returns {Promise<{id, status, updated_at}|null>}
 * @throws if the transition is not allowed
 */
export async function updateStatus(siteId, userId, newStatus, isAdmin = false) {
  const db   = getAdminClient();
  const site = await ownedSite(siteId, userId, "id, status");
  if (!site) return null;

  const allowed = [...(STATUS_TRANSITIONS[site.status] || [])];
  // Admins can also force published (bypasses POST /publish flow)
  if (isAdmin && site.status === "ready" && !allowed.includes("published")) {
    allowed.push("published");
  }

  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Status transition not allowed: ${site.status} → ${newStatus}`
    );
    err.code = "INVALID_TRANSITION";
    err.statusCode = 422;
    throw err;
  }

  const { data, error } = await db
    .from("sites")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", siteId)
    .eq("user_id", userId)
    .select("id, status, updated_at")
    .single();

  if (error) throw new Error(`updateStatus: ${error.message}`);

  logger.info("Site status updated", { siteId, from: site.status, to: newStatus });
  return data;
}

// ── Publish ───────────────────────────────────────────────────────────────

/**
 * Mark a site as published.
 * Requires current status === "ready".
 * Increments publish_count and records published_at.
 *
 * Does NOT deploy to Vercel — the deploy pipeline (publishSite.js) handles that.
 * This function is called AFTER a successful deploy to persist the result.
 *
 * @param {string} siteId
 * @param {string} userId
 * @param {string} publishedUrl — the live URL returned by the deploy
 * @returns {Promise<{id, status, site_url, publish_count, last_published_at}|null>}
 */
export async function markSitePublished(siteId, userId, publishedUrl) {
  const db   = getAdminClient();
  const site = await ownedSite(siteId, userId, "id, status, publish_count");
  if (!site) return null;

  if (site.status !== "ready") {
    const err = new Error(
      `Only sites with status "ready" can be published. Current status: "${site.status}"`
    );
    err.code    = "NOT_READY";
    err.statusCode = 422;
    throw err;
  }

  const { data, error } = await db
    .from("sites")
    .update({
      status:            "published",
      site_url:          publishedUrl,
      publish_count:     (site.publish_count || 0) + 1,
      last_published_at: new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    })
    .eq("id", siteId)
    .eq("user_id", userId)
    .select("id, status, site_url, publish_count, last_published_at")
    .single();

  if (error) throw new Error(`markSitePublished: ${error.message}`);

  invalidateCache(siteId);
  logger.info("Site marked published", { siteId, url: publishedUrl });
  return data;
}
