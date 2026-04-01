/**
 * qualifier.js
 * Detects website quality without AI — pure rule-based HTTP analysis.
 * Fast, reliable, no tokens consumed.
 */

import axios from "axios";

const FETCH_TIMEOUT_MS = 8000;
const MIN_HTML_LENGTH = 5000;

const SKIP_VALUES = new Set(["não tem", "nenhum", "-", "n/a", "sem site", ""]);

function normalizeUrl(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (SKIP_VALUES.has(s.toLowerCase())) return null;
  if (!s.startsWith("http")) return `https://${s}`;
  return s;
}

async function fetchHtml(url) {
  const res = await axios.get(url, {
    timeout: FETCH_TIMEOUT_MS,
    maxRedirects: 5,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ForgeSitesBot/1.0; +https://forgesites.ai)",
      Accept: "text/html,application/xhtml+xml",
    },
    // Return raw string instead of parsed JSON
    transformResponse: [(data) => data],
  });
  return typeof res.data === "string" ? res.data : "";
}

function evaluateHtml(html) {
  const reasons = [];

  // Rule 1: HTML length
  if (html.length < MIN_HTML_LENGTH) {
    reasons.push(`html_too_short:${html.length}chars`);
    return { status: "weak_site", reasons };
  }

  const lower = html.toLowerCase();

  // Rule 2: Missing meta viewport → not mobile-ready
  if (!lower.includes("viewport")) {
    reasons.push("missing_viewport");
  }

  // Rule 3: No WhatsApp link AND no meaningful CTA
  const hasWhatsApp = lower.includes("whatsapp") || lower.includes("wa.me");
  const hasCTA =
    lower.includes("agendar") ||
    lower.includes("fale conosco") ||
    lower.includes("ligar") ||
    lower.includes("reservar") ||
    lower.includes("contato") ||
    lower.includes("btn") ||
    lower.includes("button") ||
    lower.includes("call-to-action");

  if (!hasWhatsApp && !hasCTA) {
    reasons.push("no_whatsapp_or_cta");
  }

  if (reasons.length > 0) {
    return { status: "weak_site", reasons };
  }

  return { status: "good_site", reasons: ["passes_all_checks"] };
}

/**
 * Qualifies a lead's website quality.
 * @param {Object} fields - output of extractFields()
 * @returns {Promise<{ siteStatus: string, siteReasons: string[] }>}
 */
export async function qualifyLead(fields) {
  const raw = fields._raw;
  const siteRaw = raw["Sites"] || raw["site"] || raw["Site"] || "";
  const url = normalizeUrl(siteRaw);

  if (!url) {
    return { siteStatus: "no_site", siteReasons: ["no_url_provided"] };
  }

  let html;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    // Fetch failure = treat as weak (probably broken/slow site)
    return {
      siteStatus: "weak_site",
      siteReasons: [`fetch_failed:${err.message.slice(0, 80)}`],
    };
  }

  const result = evaluateHtml(html);
  return { siteStatus: result.status, siteReasons: result.reasons };
}
