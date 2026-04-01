/**
 * publishSite.js — The Publish pipeline.
 *
 * Flow:
 *   1. Check publish limit (plan-based monthly cap)
 *   2. Load full site data from DB
 *   3. Build HTML from current DB content
 *   4. Deploy to Vercel
 *   5. Save URL + mark published in DB
 *   6. Increment user's monthly publish counter
 *
 * This is the ONLY place that calls Vercel.
 * Save operations never reach this file.
 */

import { getSiteForBuild, markPublished } from "./sites.js";
import { checkPublishLimit, incrementPublishCount } from "./credits.js";
import { buildHTML } from "./htmlBuilder.js";
import { deployToVercel } from "../deploy.js";

/**
 * Publish a site: build HTML from current DB content and deploy to Vercel.
 *
 * @param {string} siteId  — site UUID
 * @param {string} userId  — owner user ID (for limit checks)
 * @returns {Promise<{url: string, published_at: string}>}
 */
export async function publishSite(siteId, userId) {
  // ── 1. Publish limit check ────────────────────────────────────────────────
  const limit = await checkPublishLimit(userId);
  if (!limit.allowed) {
    const err = new Error(
      `Você atingiu o limite de ${limit.limit} publicações este mês. ` +
      `Faça upgrade para o plano Pro para publicar mais vezes.`
    );
    err.code = "PUBLISH_LIMIT";
    throw err;
  }

  // ── 2. Load site data ─────────────────────────────────────────────────────
  const site = await getSiteForBuild(siteId);
  if (!site) throw new Error("Site não encontrado.");
  if (site.status === "disabled") {
    const err = new Error("Este site foi desativado. Entre em contato com o suporte.");
    err.code = "SITE_DISABLED";
    throw err;
  }

  // ── 3. Build HTML from current DB content ─────────────────────────────────
  const html = buildHTML(site);

  // ── 4. Deploy to Vercel ───────────────────────────────────────────────────
  const url = await deployToVercel(site.slug, html);

  // ── 5. Persist publish state ──────────────────────────────────────────────
  await markPublished(siteId, url);

  // ── 6. Increment monthly counter ──────────────────────────────────────────
  await incrementPublishCount(userId);

  return {
    url,
    published_at:     new Date().toISOString(),
    publishes_left:   limit.remaining - 1,
  };
}
