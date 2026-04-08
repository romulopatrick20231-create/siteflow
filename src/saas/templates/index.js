/**
 * templates/index.js — Premium niche template engine.
 *
 * Supported niches:
 *   Farmácia, Drogaria, Farmácia de Manipulação → buildFarmaciaHTML (Lovable template)
 *
 * Fallback: niches without a premium template use the generic htmlBuilder.js
 */

import { buildFarmaciaHTML } from "./farmacia.js";

// ── Niche → template builder ──────────────────────────────────────────────────

const NICHE_TEMPLATES = {
  "Farmácia":                (site) => buildFarmaciaHTML(site),
  "Drogaria":                (site) => buildFarmaciaHTML(site),
  "Farmácia de Manipulação": (site) => buildFarmaciaHTML(site),
};

// ── Normalized lookup (case + accent insensitive) ─────────────────────────────
// "farmacia", "FARMÁCIA", "drogaria" all resolve correctly.

function _normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const NICHE_TEMPLATES_NORMALIZED = Object.fromEntries(
  Object.entries(NICHE_TEMPLATES).map(([k, v]) => [_normalize(k), v])
);

/**
 * Get the premium template builder for a niche, or null for generic fallback.
 * Matching is case-insensitive and accent-insensitive.
 *
 * @param {string} niche
 * @returns {function|null}
 */
export function getTemplate(niche) {
  if (!niche) return null;
  if (NICHE_TEMPLATES[niche]) return NICHE_TEMPLATES[niche];
  return NICHE_TEMPLATES_NORMALIZED[_normalize(niche)] || null;
}
