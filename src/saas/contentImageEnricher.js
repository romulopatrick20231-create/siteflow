/**
 * contentImageEnricher.js — Attach contextually accurate Pexels images to site content.
 *
 * Walks pages → sections → items, and for each enrichable item:
 *   - builds a section-type-aware subject query (not just item.name)
 *   - passes full visual context (niche + sectionType + personality + colorMood)
 *   - tracks used photo IDs per site run to prevent visual repetition
 *
 * Section types covered:
 *   services_grid / _featured / _accordion  → each item gets `image`
 *   treatments_grid                         → each treatment gets `image`
 *   menu_categories                         → each menu item gets `image`
 *   menu_featured                           → each featured dish gets `image`
 *   products_grid                           → each featured product gets `image`
 *   team_grid / _featured                   → each member gets `photo` (portrait)
 *   image_gallery / image_grid              → captions → images[]
 *   before_after_gallery / _slider          → each case gets `image`
 *
 * All section enrichments run in parallel.
 * Failures are caught per-section — original data is always returned on error.
 */

import { searchImage, searchPortrait } from "../services/pexelsService.js";
import logger from "../utils/logger.js";

// ── Visual context ──────────────────────────────────────────────────────────
// Assembled once per site, shared across all section enrichers.
// Holds niche + personality + colorMood for consistent aesthetic bias,
// and tracks used photo IDs to avoid visual repetition within a site.

class SiteVisualContext {
  constructor({ niche, personality, colorMood }) {
    this.niche       = niche       || "generico";
    this.personality = personality || null;
    this.colorMood   = colorMood   || null;
    this.usedIds     = new Set();  // Pexels photo IDs already placed in this site
  }

  // Build the pexelsService ctx object for searchImage calls
  forSection(sectionType) {
    return {
      niche:       this.niche,
      sectionType,
      personality: this.personality,
      colorMood:   this.colorMood,
    };
  }

  // Track a photo so it won't be reused in this site
  markUsed(photo) {
    if (photo?.id) this.usedIds.add(photo.id);
  }

  get excludeIds() {
    return this.usedIds;
  }
}

// ── Item query extraction ──────────────────────────────────────────────────
// Different section types need different search subjects.
// e.g., food → just name ("Pizza Calabresa"); service → name only;
// portrait → role; gallery → truncated visual nouns from caption.

function getItemSubject(item, sectionType) {
  switch (sectionType) {

    case "menu_categories":
    case "menu_featured":
      // Food names work well directly — Pexels has extensive food photo tags
      return (item.name || "food dish").trim();

    case "services_grid":
    case "services_accordion":
    case "services_featured":
      // Service name is the main visual identifier
      return (item.name || item.label || "professional service").trim();

    case "treatments_grid":
    case "before_after_gallery":
    case "before_after_slider":
      // Treatment type is specific enough for clinical photo matching
      return (item.treatment || item.name || "clinical treatment").trim();

    case "products_grid":
      // Product name + category gives better Pexels tag matches
      return [item.name, item.category].filter(Boolean).join(" ").trim()
        || "product lifestyle";

    case "team_grid":
    case "team_featured":
      // Role is the visual subject — don't use name (Pexels can't find "Dr. Silva")
      return (item.role || item.title || "professional").trim();

    case "image_gallery":
    case "image_grid":
      // Captions are literary — extract first 4 content words as visual keywords
      if (typeof item === "string") {
        return item.split(/\s+/).slice(0, 4).join(" ");
      }
      return (item.caption || "interior lifestyle").split(/\s+/).slice(0, 4).join(" ");

    default:
      return (item.name || item || "professional").toString().trim();
  }
}

// ── Portrait credential hint ───────────────────────────────────────────────
// Adding seniority context prevents all team portraits from looking identical
// (Pexels otherwise returns the same top result for every "dentist" query).

const CREDENTIAL_LEVEL = ["senior", "specialist", "associate", "consultant", "lead"];

function getCredentialHint(member, index) {
  if (!member) return "";
  // Use role keywords if available
  const role = (member.role || "").toLowerCase();
  if (role.includes("soci") || role.includes("fundad") || role.includes("principal")) return "senior";
  if (role.includes("especial") || role.includes("consult")) return "specialist";
  // Otherwise cycle through levels to differentiate portrait queries
  return CREDENTIAL_LEVEL[index % CREDENTIAL_LEVEL.length];
}

// ── Per-section enricher functions ────────────────────────────────────────
// Each receives (data, ctx: SiteVisualContext) and returns enriched data.
// Never throws — returns original data on any error.

async function enrichItemArray(items, sectionType, ctx) {
  if (!Array.isArray(items) || !items.length) return items;

  return Promise.all(
    items.map(async (item) => {
      const subject = getItemSubject(item, sectionType);
      const photo   = await searchImage(subject, ctx.forSection(sectionType), {
        excludeIds: ctx.excludeIds,
      });
      ctx.markUsed(photo);
      return { ...item, image: photo ? { url: photo.url, thumb: photo.thumb, alt: photo.alt || item.name || "" } : null };
    })
  );
}

// services_grid / services_accordion / treatments_grid
async function enrichServicesGrid(data, sectionType, ctx) {
  const key = data.items ? "items" : data.treatments ? "treatments" : null;
  if (!key || !Array.isArray(data[key])) return data;
  return { ...data, [key]: await enrichItemArray(data[key], sectionType, ctx) };
}

// services_featured
async function enrichServicesFeatured(data, ctx) {
  const [featured, supporting] = await Promise.all([
    // Featured service gets a more prominent query context
    (async () => {
      if (!data.featured) return data.featured;
      const subject = getItemSubject(data.featured, "services_featured");
      const photo   = await searchImage(subject, ctx.forSection("services_featured"), {
        excludeIds: ctx.excludeIds,
      });
      ctx.markUsed(photo);
      return { ...data.featured, image: photo?.url || null };
    })(),

    // Supporting services use standard service queries
    Array.isArray(data.supporting)
      ? enrichItemArray(data.supporting, "services_grid", ctx)
      : Promise.resolve(data.supporting),
  ]);

  return { ...data, featured, supporting };
}

// menu_categories — nested: categories[].items[]
async function enrichMenuCategories(data, ctx) {
  if (!Array.isArray(data?.categories)) return data;

  const categories = await Promise.all(
    data.categories.map(async (cat) => ({
      ...cat,
      items: Array.isArray(cat.items)
        ? await enrichItemArray(cat.items, "menu_categories", ctx)
        : cat.items,
    }))
  );

  return { ...data, categories };
}

// menu_featured — featured_items[]
async function enrichMenuFeatured(data, ctx) {
  if (!Array.isArray(data?.featured_items)) return data;
  return {
    ...data,
    featured_items: await enrichItemArray(data.featured_items, "menu_featured", ctx),
  };
}

// products_grid — featured[]
async function enrichProductsGrid(data, ctx) {
  if (!Array.isArray(data?.featured)) return data;
  return {
    ...data,
    featured: await enrichItemArray(data.featured, "products_grid", ctx),
  };
}

// team_grid — members[] or root array (AI output varies)
async function enrichTeamGrid(data, ctx) {
  const enrichMember = async (member, index) => {
    if (!member) return member;
    const credential = getCredentialHint(member, index);
    const photo = await searchPortrait(
      member.role || "professional",
      credential,
      ctx.forSection("team_grid"),
      ctx.excludeIds
    );
    ctx.markUsed(photo);
    return { ...member, photo: photo?.url || null, photo_placeholder: !photo };
  };

  if (Array.isArray(data?.members)) {
    return { ...data, members: await Promise.all(data.members.map(enrichMember)) };
  }
  if (Array.isArray(data)) {
    return Promise.all(data.map(enrichMember));
  }
  return data;
}

// team_featured — featured_member (index 0) + other_members[]
async function enrichTeamFeatured(data, ctx) {
  const [featured_member, other_members] = await Promise.all([
    (async () => {
      if (!data.featured_member) return data.featured_member;
      const photo = await searchPortrait(
        data.featured_member.role || "professional",
        "senior",  // featured member always gets "senior" for visual gravitas
        ctx.forSection("team_featured"),
        ctx.excludeIds
      );
      ctx.markUsed(photo);
      return { ...data.featured_member, photo: photo?.url || null, photo_placeholder: !photo };
    })(),

    Array.isArray(data.other_members)
      ? Promise.all(
          data.other_members.map(async (member, i) => {
            const photo = await searchPortrait(
              member.role || "professional",
              getCredentialHint(member, i + 1),
              ctx.forSection("team_grid"),
              ctx.excludeIds
            );
            ctx.markUsed(photo);
            return { ...member, photo: photo?.url || null, photo_placeholder: !photo };
          })
        )
      : Promise.resolve(data.other_members),
  ]);

  return { ...data, featured_member, other_members };
}

// image_gallery / image_grid — captions[] → images[]
async function enrichGallery(data, sectionType, ctx) {
  if (!Array.isArray(data?.captions)) return data;

  const images = await Promise.all(
    data.captions.map(async (caption) => {
      // Captions are literary prose — extract just the visual keywords (first 4 words)
      const subject = typeof caption === "string"
        ? caption.split(/\s+/).slice(0, 4).join(" ")
        : "interior atmosphere";

      const photo = await searchImage(subject, ctx.forSection(sectionType), {
        excludeIds: ctx.excludeIds,
      });
      ctx.markUsed(photo);

      return {
        url:     photo?.url    || null,
        thumb:   photo?.thumb  || null,
        alt:     photo?.alt    || caption,
        caption,
      };
    })
  );

  return { ...data, images };
}

// before_after_gallery / before_after_slider — cases[]
async function enrichBeforeAfter(data, sectionType, ctx) {
  if (!Array.isArray(data?.cases)) return data;

  const cases = await Promise.all(
    data.cases.map(async (c) => {
      const subject = c.treatment || c.name || "clinical treatment";
      const photo   = await searchImage(subject, ctx.forSection(sectionType), {
        excludeIds: ctx.excludeIds,
      });
      ctx.markUsed(photo);
      return { ...c, image: photo ? { url: photo.url, thumb: photo.thumb, alt: photo.alt || c.treatment || "" } : null };
    })
  );

  return { ...data, cases };
}

// imoveis_grid — listings[]
async function enrichImoveisGrid(data, ctx) {
  if (!Array.isArray(data?.listings)) return data;
  const listings = await Promise.all(
    data.listings.map(async (listing) => {
      const subject = [listing.categoria, listing.neighborhood, "interior"].filter(Boolean).join(" ");
      const photo = await searchImage(subject, ctx.forSection("imoveis_grid"), { excludeIds: ctx.excludeIds });
      ctx.markUsed(photo);
      return { ...listing, image: photo ? { url: photo.url, thumb: photo.thumb, alt: photo.alt || listing.name || "" } : null };
    })
  );
  return { ...data, listings };
}

// ── Section type → enricher ───────────────────────────────────────────────

const SECTION_ENRICHERS = {
  services_grid:          (data, ctx) => enrichServicesGrid(data, "services_grid", ctx),
  services_accordion:     (data, ctx) => enrichServicesGrid(data, "services_accordion", ctx),
  treatments_grid:        (data, ctx) => enrichServicesGrid(data, "treatments_grid", ctx),
  services_featured:      (data, ctx) => enrichServicesFeatured(data, ctx),
  menu_categories:        (data, ctx) => enrichMenuCategories(data, ctx),
  menu_featured:          (data, ctx) => enrichMenuFeatured(data, ctx),
  products_grid:          (data, ctx) => enrichProductsGrid(data, ctx),
  team_grid:              (data, ctx) => enrichTeamGrid(data, ctx),
  team_featured:          (data, ctx) => enrichTeamFeatured(data, ctx),
  image_gallery:          (data, ctx) => enrichGallery(data, "image_gallery", ctx),
  image_grid:             (data, ctx) => enrichGallery(data, "image_grid", ctx),
  before_after_gallery:   (data, ctx) => enrichBeforeAfter(data, "before_after_gallery", ctx),
  before_after_slider:    (data, ctx) => enrichBeforeAfter(data, "before_after_slider", ctx),
  imoveis_grid:           (data, ctx) => enrichImoveisGrid(data, ctx),
};

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Walk all pages/sections and attach Pexels images with full visual context.
 *
 * @param {Array}  pages       — pages from nicheGenerator output
 * @param {string} niche       — niche category (e.g. "odontologia")
 * @param {Object} [meta]      — site meta from nicheGenerator
 * @param {string} [meta.personality]  — e.g. "caloroso"
 * @param {string} [meta.colorScheme]  — e.g. "terra-aconchego"
 * @returns {Promise<Array>}   — enriched pages array
 */
export async function enrichContentWithImages(pages, niche, meta = {}) {
  if (!Array.isArray(pages) || !pages.length) return pages;

  const ctx = new SiteVisualContext({
    niche,
    personality: meta.personality || meta._generation?.personality || null,
    colorMood:   meta.colorScheme  || null,
  });

  const enrichedPages = await Promise.all(
    pages.map(async (page) => ({
      ...page,
      sections: await Promise.all(
        (page.sections || []).map(async (section) => {
          const enricher = SECTION_ENRICHERS[section.type];
          if (!enricher || !section.data) return section;

          try {
            const enrichedData = await enricher(section.data, ctx);
            return { ...section, data: enrichedData };
          } catch (err) {
            logger.warn("Image enrichment failed — section unchanged", {
              sectionType: section.type,
              niche,
              error: err.message,
            });
            return section;
          }
        })
      ),
    }))
  );

  return enrichedPages;
}
