/**
 * pexelsService.js — Context-aware Pexels image search.
 *
 * Query quality is the #1 driver of visual relevance.
 * Every search is composed from four layers of context:
 *
 *   1. SUBJECT      — what the item is (item name, role, caption)
 *   2. ROLE         — visual category: food / service / portrait / ambient / treatment / product
 *   3. NICHE DNA    — physical environment + photo style specific to the business type
 *   4. AESTHETIC    — personality + color mood bias for within-site visual consistency
 *
 * Pattern: [ROLE_PREFIX] [SUBJECT] [NICHE_ENV] [STYLE] [AESTHETIC]
 *
 * Fallback chain (3 levels):
 *   1. Full context query (all 4 layers)
 *   2. Niche-only query (subject + env + style, no personality/colorMood)
 *   3. Bare query (subject + niche env words only)
 *
 * Concurrency: p-limit(3) — safe for 30–50 site batches without API throttling.
 * Cache: keyed by full query + orientation — avoids repeat calls for same item.
 */

import axios  from "axios";
import pLimit from "p-limit";
import logger from "../utils/logger.js";

// ── Concurrency limiter ────────────────────────────────────────────────────

const limit = pLimit(3);

// ── In-process result cache ────────────────────────────────────────────────
// Key: `${orientation}::${fullQuery}`   Value: Photo object | null

const _cache = new Map();

// ── Niche DNA ──────────────────────────────────────────────────────────────
// Short, tag-friendly vocabulary that Pexels curators actually use.
// Keep each field ≤ 3 words — Pexels is keyword/tag-based, not semantic.

const NICHE_DNA = {
  restaurante: {
    envWords:  "restaurant dining",
    photoType: "food lifestyle",
  },
  odontologia: {
    envWords:  "dental clinic",
    photoType: "healthcare professional",
  },
  clinica: {
    envWords:  "medical clinic",
    photoType: "healthcare authentic",
  },
  petshop: {
    envWords:  "pet care",
    photoType: "animal lifestyle",
  },
  beleza: {
    envWords:  "beauty salon",
    photoType: "lifestyle editorial",
  },
  servicos: {
    envWords:  "office professional",
    photoType: "business authentic",
  },
  fitness: {
    envWords:  "gym fitness",
    photoType: "athletic lifestyle",
  },
  educacao: {
    envWords:  "classroom education",
    photoType: "learning authentic",
  },
  oficina: {
    envWords:  "workshop mechanic",
    photoType: "industrial authentic",
  },
  generico: {
    envWords:  "business interior",
    photoType: "professional authentic",
  },
};

// ── Section type → visual role ─────────────────────────────────────────────
// The role drives query structure — food needs "close-up plating",
// portraits need "natural light", gallery needs "atmosphere".

const SECTION_ROLE = {
  services_grid:          "service",
  services_featured:      "service",
  services_accordion:     "service",
  treatments_grid:        "treatment",
  menu_categories:        "food",
  menu_featured:          "food_hero",
  products_grid:          "product",
  team_grid:              "portrait",
  team_featured:          "portrait",
  image_gallery:          "ambient",
  image_grid:             "ambient",
  before_after_gallery:   "treatment",
  before_after_slider:    "treatment",
};

// prefix: prepended before subject — biases what Pexels returns
// suffix: appended after niche context — photography style descriptor
const ROLE_CONFIG = {
  service:    { prefix: "",             suffix: "professional authentic" },
  treatment:  { prefix: "clinical",     suffix: "professional result"   },
  food:       { prefix: "close-up",     suffix: "food photography appetizing" },
  food_hero:  { prefix: "hero shot",    suffix: "gourmet editorial plating"   },
  product:    { prefix: "lifestyle",    suffix: "product photography"   },
  portrait:   { prefix: "professional", suffix: "natural light"         },
  ambient:    { prefix: "interior",     suffix: "atmosphere lifestyle"  },
};

// ── Personality → aesthetic bias (≤ 3 words) ──────────────────────────────
const PERSONALITY_AESTHETIC = {
  "caloroso":            "warm genuine",
  "confiante":           "bold confident",
  "tecnico-humanizado":  "clean caring",
  "narrativo":           "atmospheric storytelling",
  "local-comunitario":   "authentic candid",
};

// ── ColorMood → visual tone (1-2 words) ──────────────────────────────────
const COLOR_MOOD_TONE = {
  "azul-confiança":    "cool blue",
  "verde-saúde":       "fresh green",
  "laranja-energia":   "warm vibrant",
  "vermelho-paixão":   "rich warm",
  "roxo-sofisticação": "elegant",
  "terra-aconchego":   "earthy warm",
  "preto-premium":     "dark luxury",
  "turquesa-inovação": "teal modern",
};

// ── Query builder ─────────────────────────────────────────────────────────

/**
 * Build a context-aware Pexels query from subject + visual context.
 *
 * @param {string} text — core subject (item name, role, caption excerpt)
 * @param {Object} ctx
 * @param {string}  ctx.niche       — niche category
 * @param {string}  [ctx.sectionType] — section type key (drives query structure)
 * @param {string}  [ctx.personality] — personality id (aesthetic bias)
 * @param {string}  [ctx.colorMood]   — colorMood from site meta (color tone)
 * @returns {string} — composed query (7–11 words)
 */
export function buildQuery(text, ctx = {}) {
  const {
    niche       = "generico",
    sectionType = null,
    personality = null,
    colorMood   = null,
  } = ctx;

  const dna       = NICHE_DNA[niche]                  || NICHE_DNA.generico;
  const role      = SECTION_ROLE[sectionType]          || "service";
  const roleCfg   = ROLE_CONFIG[role];
  const aesthetic = PERSONALITY_AESTHETIC[personality] || "authentic";
  const colorHint = COLOR_MOOD_TONE[colorMood]         || "";

  // Build: [PREFIX] [SUBJECT] [ENV] [PHOTO_TYPE] [SUFFIX] [AESTHETIC] [COLOR]
  const parts = [
    roleCfg.prefix,
    text,
    dna.envWords,
    dna.photoType,
    roleCfg.suffix,
    aesthetic,
    colorHint,
  ]
    .map(p => p?.trim())
    .filter(Boolean)
    .join(" ");

  // Deduplicate repeated words across layers
  const seen   = new Set();
  const deduped = parts.split(/\s+/).filter(w => {
    const lw = w.toLowerCase();
    if (seen.has(lw)) return false;
    seen.add(lw);
    return true;
  });

  return deduped.join(" ");
}

// ── Pexels raw search ─────────────────────────────────────────────────────

async function _rawSearch(query, orientation) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY is not set");

  const response = await axios.get("https://api.pexels.com/v1/search", {
    headers: { Authorization: key },
    params: {
      query,
      per_page:    15,     // fetch 15, pick randomly from top 8 for variety
      orientation,
    },
    timeout: 10_000,
  });

  return response.data?.photos ?? [];
}

function _pickPhoto(photos, excludeIds = new Set()) {
  // Filter out photos we've already used (within-site dedup)
  const candidates = photos
    .slice(0, 8)
    .filter(p => !excludeIds.has(p.id));

  const photo = candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : photos[0]; // last resort: use first even if duplicated

  if (!photo) return null;

  return {
    id:           photo.id,              // for dedup tracking
    url:          photo.src.large2x || photo.src.large,
    thumb:        photo.src.medium,
    alt:          photo.alt || "",
    photographer: photo.photographer,
  };
}

// ── Fallback chain ────────────────────────────────────────────────────────

/**
 * Attempt three progressively simpler queries.
 * Returns the first successful result, or null.
 */
async function _fetchWithFallback(text, ctx, orientation, excludeIds) {
  const { niche = "generico", sectionType = null } = ctx;
  const dna = NICHE_DNA[niche] || NICHE_DNA.generico;

  const queries = [
    // 1. Full context — personality + colorMood + role + niche env
    buildQuery(text, ctx),
    // 2. Niche context only — drop personality/colorMood
    buildQuery(text, { niche, sectionType }),
    // 3. Bare fallback — just the subject + env words
    `${text} ${dna.envWords} authentic`,
  ];

  for (const q of queries) {
    try {
      const photos = await _rawSearch(q, orientation);
      if (photos.length) {
        const picked = _pickPhoto(photos, excludeIds);
        if (picked) return picked;
      }
    } catch (err) {
      logger.warn("Pexels query failed", { query: q, error: err.message });
    }
  }

  return null;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Search Pexels with full visual context.
 *
 * @param {string} text           — item name / role / caption excerpt
 * @param {Object} ctx            — visual context
 * @param {string}  ctx.niche
 * @param {string}  [ctx.sectionType]
 * @param {string}  [ctx.personality]
 * @param {string}  [ctx.colorMood]
 * @param {Object} [opts]
 * @param {"landscape"|"portrait"|"square"} [opts.orientation]
 * @param {Set<number>} [opts.excludeIds]   — photo IDs already used in this site
 * @returns {Promise<{id, url, thumb, alt, photographer}|null>}
 */
export async function searchImage(text, ctx = {}, opts = {}) {
  const orientation = opts.orientation || "landscape";
  const excludeIds  = opts.excludeIds  || new Set();
  const cacheKey    = `${orientation}::${buildQuery(text, ctx)}`;

  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey);
  }

  const result = await limit(() =>
    _fetchWithFallback(text, ctx, orientation, excludeIds).catch(err => {
      logger.warn("Pexels fetchWithFallback failed", { text, error: err.message });
      return null;
    })
  );

  _cache.set(cacheKey, result);
  return result;
}

/**
 * Specialised portrait search for team members.
 * Square orientation — optimal for circular avatar UIs.
 * Adds credential-level context to avoid all portraits looking identical.
 *
 * @param {string} role        — job role ("Dentista", "Chef de Cozinha")
 * @param {string} [credential] — credential hint ("senior", "specialist")
 * @param {Object} ctx          — { niche, personality, colorMood }
 * @param {Set}    [excludeIds]
 */
export async function searchPortrait(role, credential = "", ctx = {}, excludeIds = new Set()) {
  const subject = credential ? `${credential} ${role}` : role;
  return searchImage(subject, { ...ctx, sectionType: "team_grid" }, {
    orientation: "square",
    excludeIds,
  });
}

/**
 * Clear the in-process cache.
 * Call this between separate batch jobs to allow fresh photo variety.
 * Within a single batch run, keep the cache to avoid duplicate API calls.
 */
export function clearImageCache() {
  _cache.clear();
}
