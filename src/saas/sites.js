/**
 * sites.js — Site CRUD for the SaaS platform.
 *
 * Key principle: SAVE != PUBLISH.
 * - save*() functions only touch the database (instant, free).
 * - publish pipeline lives in publishSite.js (deploys to Vercel).
 */

import { getAdminClient } from "./db.js";

function makeSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    + `-${Date.now().toString(36)}`;
}

// ── Read ────────────────────────────────────────────────────────────────────

/**
 * List all sites for a user (summary only, no content).
 */
export async function getUserSites(userId) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("sites")
    .select(
      "id, slug, business_name, niche, status, site_url, publish_count, last_published_at, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getUserSites: ${error.message}`);
  return data ?? [];
}

/**
 * Get a single site with full content + products + images.
 * Enforces user ownership.
 */
export async function getSite(siteId, userId) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("sites")
    .select(`
      *,
      site_content (*),
      products (id, name, description, price, image_url, is_active, sort_order),
      images    (id, public_url, type, file_name, created_at)
    `)
    .eq("id", siteId)
    .eq("user_id", userId)
    .single();

  if (error) throw new Error(`getSite: ${error.message}`);
  return data;
}

/**
 * Get full site data for HTML generation (no ownership check — admin/server use).
 */
export async function getSiteForBuild(siteId) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("sites")
    .select(`
      *,
      site_content (*),
      products (id, name, description, price, image_url, sort_order, is_active),
      images    (id, public_url, type)
    `)
    .eq("id", siteId)
    .single();

  if (error) throw new Error(`getSiteForBuild: ${error.message}`);
  return data;
}

// ── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new draft site for a user.
 */
export async function createSite(userId, { businessName, niche, phone, city, neighborhood }) {
  const db = getAdminClient();
  const slug = makeSlug(businessName);

  const { data: site, error: siteErr } = await db
    .from("sites")
    .insert({
      user_id:       userId,
      slug,
      business_name: businessName,
      niche:         niche || "Negócio Local",
      phone:         phone || null,
      city:          city  || null,
      neighborhood:  neighborhood || null,
    })
    .select()
    .single();

  if (siteErr) throw new Error(`createSite: ${siteErr.message}`);

  // Create the content record immediately so save() always finds it
  const { error: contentErr } = await db.from("site_content").insert({
    site_id:      site.id,
    headline:     `${businessName} — Bem-vindo!`,
    hero_copy:    `Atendimento especializado em ${city || "sua cidade"}. Entre em contato pelo WhatsApp!`,
    diferenciais: [],
    depoimentos:  [],
  });

  if (contentErr) throw new Error(`createSite content init: ${contentErr.message}`);
  return site;
}

// ── Save (NO deploy) ─────────────────────────────────────────────────────────

/**
 * Save site identity fields (business name, niche, phone, location).
 * Database only — instant, no Vercel call.
 */
export async function saveSiteInfo(siteId, userId, fields) {
  const db = getAdminClient();

  // Verify ownership before writing
  const { count, error: ownerErr } = await db
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("id", siteId)
    .eq("user_id", userId);

  if (ownerErr || count === 0) throw new Error("Site not found or access denied");

  const allowed = ["business_name", "niche", "phone", "city", "neighborhood"];
  const update  = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) update[key] = fields[key];
  }

  if (Object.keys(update).length === 0) return { saved: true };

  const { error } = await db.from("sites").update(update).eq("id", siteId);
  if (error) throw new Error(`saveSiteInfo: ${error.message}`);
  return { saved: true };
}

/**
 * Save editable content (headline, hero copy, diferenciais, depoimentos, about).
 * Database only — instant, no Vercel call.
 */
export async function saveSiteContent(siteId, userId, fields) {
  const db = getAdminClient();

  // Verify ownership
  const { count, error: ownerErr } = await db
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("id", siteId)
    .eq("user_id", userId);

  if (ownerErr || count === 0) throw new Error("Site not found or access denied");

  const allowed = ["headline", "hero_copy", "diferenciais", "depoimentos", "about_text", "contact_email", "whatsapp_link"];
  const update  = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (fields[key] !== undefined) update[key] = fields[key];
  }

  const { error } = await db
    .from("site_content")
    .update(update)
    .eq("site_id", siteId);

  if (error) throw new Error(`saveSiteContent: ${error.message}`);
  return { saved: true, timestamp: new Date().toISOString() };
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function addProduct(siteId, userId, product) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("products")
    .insert({
      site_id:     siteId,
      user_id:     userId,
      name:        product.name,
      description: product.description || "",
      price:       product.price ?? null,
      image_url:   product.imageUrl || null,
      sort_order:  product.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error) throw new Error(`addProduct: ${error.message}`);
  return data;
}

export async function updateProduct(productId, userId, fields) {
  const db = getAdminClient();
  const allowed = ["name", "description", "price", "image_url", "is_active", "sort_order"];
  const update  = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) update[key] = fields[key];
  }

  const { error } = await db
    .from("products")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("user_id", userId);

  if (error) throw new Error(`updateProduct: ${error.message}`);
  return { saved: true };
}

export async function deleteProduct(productId, userId) {
  const db = getAdminClient();
  const { error } = await db
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("user_id", userId);

  if (error) throw new Error(`deleteProduct: ${error.message}`);
  return { deleted: true };
}

// ── Publish state (called by publishSite.js after Vercel deploy) ──────────────

export async function markPublished(siteId, siteUrl) {
  const db = getAdminClient();

  const { error } = await db
    .from("sites")
    .update({
      status:    "published",
      site_url:  siteUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", siteId);

  if (error) throw new Error(`markPublished: ${error.message}`);

  // Atomically increment publish_count via DB function
  await db.rpc("increment_publish_count", { site_id: siteId });
}

export async function disableSite(siteId) {
  const db = getAdminClient();
  const { error } = await db
    .from("sites")
    .update({ status: "disabled", updated_at: new Date().toISOString() })
    .eq("id", siteId);
  if (error) throw new Error(`disableSite: ${error.message}`);
}
