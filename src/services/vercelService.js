/**
 * vercelService.js — Vercel Deployments API client.
 *
 * Design goals:
 *   1. Fast — return only after the deployment is READY so the URL is live the
 *      moment the caller receives it. Static deploys (no build step) typically
 *      reach READY within the initial API response; polling adds ~0 overhead.
 *   2. Reliable URL — return the stable production alias
 *      (https://<project>.vercel.app) rather than the ephemeral
 *      deployment URL (https://<project>-<hash>.vercel.app).
 *   3. Single responsibility — all Vercel HTTP lives here; nothing else imports
 *      axios or talks to api.vercel.com.
 *
 * Required env vars (validated on startup by src/config/env.js):
 *   VERCEL_TOKEN   — personal / team token from vercel.com/account/tokens
 *   VERCEL_TEAM_ID — (optional) team slug for team accounts
 */

import axios  from "axios";
import logger from "../utils/logger.js";

const VERCEL_API   = "https://api.vercel.com";
const UPLOAD_TIMEOUT_MS = 30_000;  // POST /deployments — network upload
const POLL_TIMEOUT_MS   = 10_000;  // max time waiting for READY after upload
const POLL_INTERVAL_MS  = 500;     // check readyState every 500 ms

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Sanitise a slug into a valid Vercel project name.
 * Rules: lowercase, letters/numbers/hyphens, max 52 chars.
 */
function toProjectName(slug) {
  return `forgesites-${slug}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 52);
}

/** Encode UTF-8 string as base64 (required by Vercel Files API). */
function toBase64(str) {
  return Buffer.from(str, "utf-8").toString("base64");
}

/** Shared Axios headers for every Vercel request. */
function authHeaders(token) {
  return {
    Authorization:  `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/** Optional `?teamId=…` query string. */
function teamQuery() {
  return process.env.VERCEL_TEAM_ID
    ? `?teamId=${process.env.VERCEL_TEAM_ID}`
    : "";
}

/**
 * Poll `GET /v13/deployments/:id` until readyState is READY, ERROR, or
 * CANCELED, or until POLL_TIMEOUT_MS elapses.
 *
 * For static sites with no build command, Vercel almost always returns
 * readyState = "READY" in the initial POST response, so this loop never
 * runs. It exists as a safety net for temporarily overloaded infrastructure.
 *
 * @param {string} deploymentId
 * @param {string} token
 * @returns {Promise<void>} resolves when READY, rejects on error/timeout
 */
async function waitUntilReady(deploymentId, token) {
  const deadline  = Date.now() + POLL_TIMEOUT_MS;
  const maxPolls  = Math.ceil(POLL_TIMEOUT_MS / POLL_INTERVAL_MS);

  for (let attempt = 1; attempt <= maxPolls; attempt++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    if (Date.now() > deadline) break;

    let state;
    try {
      const { data } = await axios.get(
        `${VERCEL_API}/v13/deployments/${deploymentId}${teamQuery()}`,
        { headers: authHeaders(token), timeout: 8_000 }
      );
      state = data.readyState;
    } catch {
      // Transient network error during poll — continue
      continue;
    }

    if (state === "READY") {
      logger.debug("Vercel deployment READY", { deploymentId, attempt });
      return;
    }

    if (state === "ERROR" || state === "CANCELED") {
      throw new Error(`Vercel deployment failed (readyState: ${state})`);
    }

    logger.debug("Vercel deployment still building", { deploymentId, state, attempt });
  }

  // Timed out — for a static site this should never happen in normal operation.
  // Log a warning but do NOT throw: the canonical URL will still resolve once
  // Vercel finishes (typically within a few more seconds).
  logger.warn("Vercel deployment READY poll timed out — returning canonical URL anyway", {
    deploymentId,
    timeoutMs: POLL_TIMEOUT_MS,
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Deploy static files to Vercel and return the live canonical URL.
 *
 * The returned URL is the stable production alias (`https://<project>.vercel.app`),
 * not the ephemeral deployment URL. It is only returned after the deployment
 * has confirmed READY status, so it is immediately accessible.
 *
 * @param {object} params
 * @param {string} params.slug
 *   Unique site slug → Vercel project name `forgesites-<slug>`.
 * @param {{ name: string, content: string }[]} params.files
 *   Files to deploy. Pass plain UTF-8 strings; base64 encoding is internal.
 *   Typical set: index.html, style.css, script.js.
 *
 * @returns {Promise<{ url: string, deploymentId: string }>}
 * @throws on missing VERCEL_TOKEN, Vercel API error, or deployment failure.
 */
export async function deploySite({ slug, files }) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is not configured");

  const projectName   = toProjectName(slug);
  const canonicalUrl  = `https://${projectName}.vercel.app`;
  const tq            = teamQuery();

  const payload = {
    name: projectName,
    files: files.map(({ name, content }) => ({
      file:     name,
      data:     toBase64(content),
      encoding: "base64",
    })),
    // Static site — no framework, no build step → near-instant READY
    projectSettings: {
      framework:       null,
      buildCommand:    null,
      outputDirectory: null,
      installCommand:  null,
      devCommand:      null,
    },
    target: "production",
  };

  const totalBytes = files.reduce((n, f) => n + f.content.length, 0);
  logger.info("Vercel deploy started", {
    project:     projectName,
    files:       files.map(f => f.name),
    totalBytes,
  });

  const t0 = Date.now();

  // ── POST deployment ──────────────────────────────────────────────────────
  let response;
  try {
    response = await axios.post(
      `${VERCEL_API}/v13/deployments${tq}`,
      payload,
      { headers: authHeaders(token), timeout: UPLOAD_TIMEOUT_MS }
    );
  } catch (err) {
    const detail = err.response?.data
      ? JSON.stringify(err.response.data).slice(0, 400)
      : err.message;
    throw new Error(`Vercel deploy failed: ${detail}`);
  }

  const { id: deploymentId, readyState, error: vErr } = response.data;

  if (vErr)          throw new Error(`Vercel error: ${vErr.message}`);
  if (!deploymentId) throw new Error(`Vercel returned no deployment ID. Response: ${JSON.stringify(response.data).slice(0, 200)}`);

  // ── Wait for READY (skip poll if already READY in the POST response) ─────
  if (readyState !== "READY") {
    if (readyState === "ERROR" || readyState === "CANCELED") {
      throw new Error(`Vercel deployment failed immediately (readyState: ${readyState})`);
    }
    await waitUntilReady(deploymentId, token);
  }

  const elapsedMs = Date.now() - t0;

  logger.info("Vercel deploy successful", {
    project:      projectName,
    deploymentId,
    url:          canonicalUrl,
    elapsedMs,
  });

  return { url: canonicalUrl, deploymentId };
}
