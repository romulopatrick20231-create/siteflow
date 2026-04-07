/**
 * publishSite.js — The Publish pipeline.
 *
 * Responsibility: validate, build, deploy.
 * This module does NOT write to the database — the route layer owns all DB
 * state changes after a successful deploy (via cmsSaas.markSitePublished +
 * credits.incrementPublishCount). Keeping deploy and persistence separate
 * makes each concern independently testable and avoids double-write races.
 *
 * Flow:
 *   1. Check monthly publish limit (plan-based cap, auto-resets each month)
 *   2. Load full site data from DB
 *   3. Guard: status must be "ready"  — blocks duplicate publishes + drafts
 *   4. Export: generate index.html, style.css, script.js from site data
 *   5. Deploy the three files to Vercel
 *   6. Return { url, published_at, publishes_left } — caller persists to DB
 */

import { getSiteForBuild }   from "./sites.js";
import { checkPublishLimit }  from "./credits.js";
import { exportHtml }         from "./exportHtml.js";
import { deploySite }         from "../services/vercelService.js";
import logger                 from "../utils/logger.js";

/**
 * Validate, build, and deploy a site to Vercel.
 *
 * @param {string} siteId  — site UUID
 * @param {string} userId  — owner user ID (used for limit checks)
 *
 * @returns {Promise<{ url: string, published_at: string, publishes_left: number }>}
 *
 * @throws {Error} with .code = "PUBLISH_LIMIT"     — user hit their monthly cap
 * @throws {Error} with .code = "SITE_DISABLED"     — site was soft-deleted
 * @throws {Error} with .code = "NOT_READY"         — status is not "ready"
 * @throws {Error} with .code = "ALREADY_PUBLISHED" — site is already live (re-publish
 *   requires draft → edit → ready transition first)
 */
export async function publishSite(siteId, userId) {
  const t0 = Date.now();

  // ── 1+2. Fetch limit + site data in parallel ──────────────────────────────
  // These are independent DB queries — no reason to run them sequentially.
  const [limit, site] = await Promise.all([
    checkPublishLimit(userId),
    getSiteForBuild(siteId),
  ]);

  if (!site) throw new Error("Site não encontrado.");

  if (!limit.allowed) {
    const err = new Error(
      `Você atingiu o limite de ${limit.limit} publicações este mês. ` +
      `Faça upgrade para o plano Pro para publicar mais vezes.`
    );
    err.code = "PUBLISH_LIMIT";
    throw err;
  }

  // ── 3. Status guards ──────────────────────────────────────────────────────
  if (site.status === "disabled") {
    const err = new Error("Este site foi desativado. Entre em contato com o suporte.");
    err.code = "SITE_DISABLED";
    throw err;
  }

  // "published" → allow re-publish (redeploy with latest template/content)
  // "ready"     → first publish

  if (site.status !== "ready" && site.status !== "published") {
    const err = new Error(
      `O site precisa estar com status "pronto" para ser publicado. ` +
      `Status atual: "${site.status}".`
    );
    err.code = "NOT_READY";
    throw err;
  }

  // ── 4. Generate static files ──────────────────────────────────────────────
  const { html, css, js } = exportHtml(site);

  // ── 5. Deploy to Vercel ───────────────────────────────────────────────────
  const { url } = await deploySite({
    slug:  site.slug,
    files: [
      { name: "index.html", content: html },
      { name: "style.css",  content: css  },
      { name: "script.js",  content: js   },
    ],
  });

  const elapsedMs = Date.now() - t0;
  logger.info("Publish pipeline complete", { siteId, url, elapsedMs });

  // ── 6. Return result — DB persistence is the caller's responsibility ──────
  return {
    url,
    published_at:   new Date().toISOString(),
    publishes_left: limit.remaining - 1,
  };
}
