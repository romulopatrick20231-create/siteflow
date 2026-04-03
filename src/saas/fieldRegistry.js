/**
 * fieldRegistry.js — Typed field registry for CMS edit safety.
 *
 * Every editable field in the site content tree is registered here with:
 *   - pattern   : dot-path glob (  *  = any single segment)
 *   - type      : value type for validation
 *   - max/min   : optional length/range constraints
 *   - label     : human-readable name (used in error messages)
 *
 * Public API:
 *   resolveField(path)            → field definition or null
 *   isPathAllowed(path)           → boolean (also blocks prototype-pollution keys)
 *   validateFieldValue(path, val) → { ok: true } | { ok: false, error: string }
 *
 * Security guarantees:
 *   - Prototype-pollution keys (__proto__, constructor, prototype) are ALWAYS blocked.
 *   - No path outside the registry can be written, ever.
 *   - Value types are validated against the field definition, not just Joi.
 */

// ── Prototype-pollution guard ───────────────────────────────────────────────

const FORBIDDEN_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

// ── Type validators ─────────────────────────────────────────────────────────

const TYPE_VALIDATORS = {
  text(v, def) {
    if (v === null || v === undefined) return OK;
    if (typeof v !== "string") return err("deve ser texto");
    if (def.max && v.length > def.max) return err(`máximo ${def.max} caracteres`);
    if (def.min && v.length < def.min) return err(`mínimo ${def.min} caracteres`);
    return OK;
  },

  richtext(v, def) {
    if (v === null || v === undefined) return OK;
    if (typeof v !== "string") return err("deve ser texto");
    if (def.max && v.length > def.max) return err(`máximo ${def.max} caracteres`);
    return OK;
  },

  url(v) {
    if (v === null || v === undefined || v === "") return OK;
    if (typeof v !== "string") return err("deve ser uma URL");
    if (!/^https?:\/\/.{3,}/.test(v)) return err("deve começar com http:// ou https://");
    if (v.length > 1000) return err("URL muito longa (máx 1000)");
    return OK;
  },

  email(v) {
    if (v === null || v === undefined || v === "") return OK;
    if (typeof v !== "string") return err("deve ser um e-mail");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return err("formato de e-mail inválido");
    return OK;
  },

  phone(v) {
    if (v === null || v === undefined || v === "") return OK;
    if (typeof v !== "string") return err("deve ser texto");
    if (v.length > 30) return err("máximo 30 caracteres");
    return OK;
  },

  price(v) {
    if (v === null || v === undefined) return OK;
    if (typeof v !== "number" || !isFinite(v)) return err("deve ser um número");
    if (v < 0) return err("deve ser ≥ 0");
    if (v > 999_999) return err("deve ser ≤ 999.999");
    return OK;
  },

  image_url(v) {
    if (v === null || v === undefined || v === "") return OK;
    if (typeof v !== "string") return err("deve ser uma URL de imagem");
    if (!/^https?:\/\/.{3,}/.test(v)) return err("deve começar com http:// ou https://");
    if (v.length > 1000) return err("URL muito longa (máx 1000)");
    return OK;
  },

  number(v, def) {
    if (v === null || v === undefined) return OK;
    if (typeof v !== "number" || !isFinite(v)) return err("deve ser um número");
    if (def.min !== undefined && v < def.min) return err(`deve ser ≥ ${def.min}`);
    if (def.max !== undefined && v > def.max) return err(`deve ser ≤ ${def.max}`);
    return OK;
  },

  boolean(v) {
    if (v === null || v === undefined) return OK;
    if (typeof v !== "boolean") return err("deve ser verdadeiro ou falso");
    return OK;
  },
};

const OK = Object.freeze({ ok: true });
function err(msg) { return { ok: false, error: msg }; }

// ── Field registry ──────────────────────────────────────────────────────────
// Each entry: { pattern, type, max?, min?, label? }
// Pattern: `*` matches exactly one dot-delimited segment.

const FIELD_REGISTRY = [
  // ── Hero / above fold ─────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.headline",          type: "text",     max: 120,  label: "Título principal" },
  { pattern: "pages.*.sections.*.data.subheadline",       type: "text",     max: 200,  label: "Subtítulo" },
  { pattern: "pages.*.sections.*.data.title",             type: "text",     max: 150,  label: "Título" },
  { pattern: "pages.*.sections.*.data.subtitle",          type: "text",     max: 200,  label: "Subtítulo" },
  { pattern: "pages.*.sections.*.data.tagline",           type: "text",     max: 150,  label: "Tagline" },
  { pattern: "pages.*.sections.*.data.story_hook",        type: "richtext", max: 600,  label: "Gancho da história" },
  { pattern: "pages.*.sections.*.data.trust_badge",       type: "text",     max: 150,  label: "Badge de confiança" },
  { pattern: "pages.*.sections.*.data.about_text",        type: "richtext", max: 3000, label: "Sobre nós" },
  { pattern: "pages.*.sections.*.data.hero_copy",         type: "richtext", max: 600,  label: "Texto hero" },
  { pattern: "pages.*.sections.*.data.description",       type: "richtext", max: 1000, label: "Descrição" },

  // ── CTA buttons ───────────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.cta_primary.label",   type: "text", max: 60, label: "Botão CTA principal" },
  { pattern: "pages.*.sections.*.data.cta_secondary.label", type: "text", max: 60, label: "Botão CTA secundário" },
  { pattern: "pages.*.sections.*.data.cta_text",            type: "text", max: 60, label: "Texto do botão" },
  { pattern: "pages.*.sections.*.data.cta_headline",        type: "text", max: 120, label: "Título do CTA" },
  { pattern: "pages.*.sections.*.data.cta_description",     type: "richtext", max: 400, label: "Descrição do CTA" },
  { pattern: "pages.*.sections.*.data.cta_url",             type: "url",  label: "Link do CTA" },
  { pattern: "pages.*.sections.*.data.whatsapp_text",       type: "text", max: 100, label: "Texto do WhatsApp" },
  { pattern: "pages.*.sections.*.data.whatsapp_link",       type: "url",  label: "Link do WhatsApp" },

  // ── Contact info ──────────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.phone",               type: "phone", label: "Telefone" },
  { pattern: "pages.*.sections.*.data.address",             type: "text",  max: 300, label: "Endereço" },
  { pattern: "pages.*.sections.*.data.contact_email",       type: "email", label: "E-mail" },
  { pattern: "pages.*.sections.*.data.contact.phone",       type: "phone", label: "Telefone de contato" },
  { pattern: "pages.*.sections.*.data.contact.email",       type: "email", label: "E-mail de contato" },
  { pattern: "pages.*.sections.*.data.contact.whatsapp",    type: "phone", label: "WhatsApp" },
  { pattern: "pages.*.sections.*.data.contact.address",     type: "text",  max: 300, label: "Endereço de contato" },

  // ── Business hours ────────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.hours.weekdays", type: "text", max: 80, label: "Horário dias úteis" },
  { pattern: "pages.*.sections.*.data.hours.saturday", type: "text", max: 80, label: "Horário sábado" },
  { pattern: "pages.*.sections.*.data.hours.sunday",   type: "text", max: 80, label: "Horário domingo" },

  // ── Service / product items ───────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.items.*.name",        type: "text",      max: 150,  label: "Nome do item" },
  { pattern: "pages.*.sections.*.data.items.*.title",       type: "text",      max: 150,  label: "Título do item" },
  { pattern: "pages.*.sections.*.data.items.*.description", type: "richtext",  max: 1000, label: "Descrição do item" },
  { pattern: "pages.*.sections.*.data.items.*.summary",     type: "richtext",  max: 500,  label: "Resumo do item" },
  { pattern: "pages.*.sections.*.data.items.*.price",       type: "price",     label: "Preço" },
  { pattern: "pages.*.sections.*.data.items.*.duration",    type: "text",      max: 60,   label: "Duração" },
  { pattern: "pages.*.sections.*.data.items.*.image",       type: "image_url", label: "Imagem do item" },
  { pattern: "pages.*.sections.*.data.items.*.imageUrl",    type: "image_url", label: "URL da imagem" },
  { pattern: "pages.*.sections.*.data.items.*.icon",        type: "text",      max: 50,   label: "Ícone" },
  { pattern: "pages.*.sections.*.data.items.*.caption",     type: "text",      max: 300,  label: "Legenda" },
  { pattern: "pages.*.sections.*.data.items.*.badge",       type: "text",      max: 50,   label: "Badge" },
  { pattern: "pages.*.sections.*.data.items.*.text",        type: "text",      max: 300,  label: "Texto" },

  // ── Featured service ──────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.featured.name",        type: "text",     max: 150,  label: "Nome destaque" },
  { pattern: "pages.*.sections.*.data.featured.headline",    type: "text",     max: 200,  label: "Título destaque" },
  { pattern: "pages.*.sections.*.data.featured.description", type: "richtext", max: 1000, label: "Descrição destaque" },
  { pattern: "pages.*.sections.*.data.supporting.*.name",        type: "text",     max: 150 },
  { pattern: "pages.*.sections.*.data.supporting.*.description", type: "richtext", max: 600 },

  // ── Menu / categories ─────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.categories.*.name",                type: "text",      max: 100,  label: "Categoria" },
  { pattern: "pages.*.sections.*.data.categories.*.items.*.name",        type: "text",      max: 150,  label: "Nome do prato" },
  { pattern: "pages.*.sections.*.data.categories.*.items.*.description", type: "richtext",  max: 800,  label: "Descrição do prato" },
  { pattern: "pages.*.sections.*.data.categories.*.items.*.price",       type: "price",     label: "Preço" },
  { pattern: "pages.*.sections.*.data.categories.*.items.*.image",       type: "image_url", label: "Imagem do prato" },
  { pattern: "pages.*.sections.*.data.featured_items.*.name",            type: "text",      max: 150 },
  { pattern: "pages.*.sections.*.data.featured_items.*.description",     type: "richtext",  max: 800 },
  { pattern: "pages.*.sections.*.data.featured_items.*.price",           type: "price" },
  { pattern: "pages.*.sections.*.data.featured_items.*.image",           type: "image_url" },

  // ── Team ──────────────────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.members.*.name",        type: "text",      max: 100,  label: "Nome" },
  { pattern: "pages.*.sections.*.data.members.*.role",        type: "text",      max: 100,  label: "Cargo" },
  { pattern: "pages.*.sections.*.data.members.*.bio",         type: "richtext",  max: 800,  label: "Bio" },
  { pattern: "pages.*.sections.*.data.members.*.image",       type: "image_url", label: "Foto" },
  { pattern: "pages.*.sections.*.data.featured_member.name",  type: "text",      max: 100,  label: "Nome destaque" },
  { pattern: "pages.*.sections.*.data.featured_member.role",  type: "text",      max: 100,  label: "Cargo" },
  { pattern: "pages.*.sections.*.data.featured_member.story", type: "richtext",  max: 1200, label: "História" },
  { pattern: "pages.*.sections.*.data.featured_member.bio",   type: "richtext",  max: 1200, label: "Bio" },
  { pattern: "pages.*.sections.*.data.featured_member.image", type: "image_url", label: "Foto" },
  { pattern: "pages.*.sections.*.data.other_members.*.name",  type: "text",      max: 100 },
  { pattern: "pages.*.sections.*.data.other_members.*.role",  type: "text",      max: 100 },
  { pattern: "pages.*.sections.*.data.other_members.*.bio",   type: "richtext",  max: 800 },
  { pattern: "pages.*.sections.*.data.other_members.*.image", type: "image_url" },
  { pattern: "pages.*.sections.*.data.team_members.*.name",   type: "text",      max: 100 },
  { pattern: "pages.*.sections.*.data.team_members.*.role",   type: "text",      max: 100 },
  { pattern: "pages.*.sections.*.data.team_members.*.bio",    type: "richtext",  max: 800 },
  { pattern: "pages.*.sections.*.data.team_members.*.image",  type: "image_url" },

  // ── Stats / trust bar ─────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.stats.*.value",      type: "text", max: 50,  label: "Valor da estatística" },
  { pattern: "pages.*.sections.*.data.stats.*.label",      type: "text", max: 80,  label: "Rótulo da estatística" },
  { pattern: "pages.*.sections.*.data.stats.*.context",    type: "text", max: 150, label: "Contexto" },
  { pattern: "pages.*.sections.*.data.trust_items.*.text", type: "text", max: 150, label: "Item de confiança" },
  { pattern: "pages.*.sections.*.data.trust_items.*.icon", type: "text", max: 50 },

  // ── Testimonials ──────────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.depoimentos.*.nome",   type: "text",      max: 100, label: "Nome do cliente" },
  { pattern: "pages.*.sections.*.data.depoimentos.*.texto",  type: "richtext",  max: 600, label: "Depoimento" },
  { pattern: "pages.*.sections.*.data.depoimentos.*.cargo",  type: "text",      max: 100, label: "Cargo / cidade" },
  { pattern: "pages.*.sections.*.data.depoimentos.*.rating", type: "number",    min: 1, max: 5, label: "Avaliação" },
  { pattern: "pages.*.sections.*.data.depoimentos.*.avatar", type: "image_url", label: "Foto do cliente" },

  // ── Diferenciais ──────────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.diferenciais.*.title", type: "text",     max: 100, label: "Diferencial" },
  { pattern: "pages.*.sections.*.data.diferenciais.*.desc",  type: "richtext", max: 300, label: "Descrição do diferencial" },
  { pattern: "pages.*.sections.*.data.diferenciais.*.icon",  type: "text",     max: 50 },

  // ── Process steps ─────────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.steps.*.label",       type: "text",     max: 100, label: "Etapa" },
  { pattern: "pages.*.sections.*.data.steps.*.title",       type: "text",     max: 100, label: "Título da etapa" },
  { pattern: "pages.*.sections.*.data.steps.*.description", type: "richtext", max: 400, label: "Descrição da etapa" },
  { pattern: "pages.*.sections.*.data.steps.*.number",      type: "text",     max: 10 },
  { pattern: "pages.*.sections.*.data.steps.*.icon",        type: "text",     max: 50 },

  // ── FAQ ───────────────────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.faqs.*.question", type: "text",     max: 300,  label: "Pergunta" },
  { pattern: "pages.*.sections.*.data.faqs.*.answer",   type: "richtext", max: 1000, label: "Resposta" },

  // ── Before / after cases ──────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.cases.*.treatment",    type: "text",      max: 100, label: "Tratamento" },
  { pattern: "pages.*.sections.*.data.cases.*.patient_note", type: "richtext",  max: 400, label: "Nota do paciente" },
  { pattern: "pages.*.sections.*.data.cases.*.description",  type: "richtext",  max: 500, label: "Descrição" },
  { pattern: "pages.*.sections.*.data.cases.*.title",        type: "text",      max: 100, label: "Título do caso" },
  { pattern: "pages.*.sections.*.data.cases.*.image_before", type: "image_url", label: "Imagem antes" },
  { pattern: "pages.*.sections.*.data.cases.*.image_after",  type: "image_url", label: "Imagem depois" },

  // ── Gallery ───────────────────────────────────────────────────────────────
  { pattern: "pages.*.sections.*.data.captions.*",      type: "text",      max: 300, label: "Legenda" },
  { pattern: "pages.*.sections.*.data.images.*",        type: "image_url", label: "Imagem da galeria" },
  { pattern: "pages.*.sections.*.data.gallery.*.caption", type: "text",      max: 300 },
  { pattern: "pages.*.sections.*.data.gallery.*.image",   type: "image_url" },
];

// ── Pre-compile patterns at module load ─────────────────────────────────────

function patternToRegex(pattern) {
  return new RegExp(
    "^" +
    pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, "[^.]+") +
    "$"
  );
}

const COMPILED_REGISTRY = FIELD_REGISTRY.map(def => ({
  ...def,
  _regex: patternToRegex(def.pattern),
}));

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Find the field definition for a concrete dot-path.
 * Returns the first matching entry or null if unregistered.
 *
 * @param {string} path  e.g. "pages.0.sections.1.data.headline"
 * @returns {object|null}
 */
export function resolveField(path) {
  for (const def of COMPILED_REGISTRY) {
    if (def._regex.test(path)) return def;
  }
  return null;
}

/**
 * Check if a path is editable.
 * Also blocks any path containing prototype-pollution segments.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isPathAllowed(path) {
  const segments = path.split(".");
  if (segments.some(s => FORBIDDEN_SEGMENTS.has(s))) return false;
  return resolveField(path) !== null;
}

/**
 * Validate a value against the field definition for the given path.
 *
 * @param {string}  path
 * @param {unknown} value
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateFieldValue(path, value) {
  const def = resolveField(path);
  if (!def) return { ok: false, error: `Campo "${path}" não é editável` };

  const validator = TYPE_VALIDATORS[def.type];
  if (!validator) return OK; // unknown type — forward to DB layer

  const result = validator(value, def);
  if (!result.ok) {
    const label = def.label || path;
    return { ok: false, error: `${label}: ${result.error}` };
  }
  return OK;
}

/**
 * Return metadata for a path (type, label, max, min).
 * Useful for building frontend field editors dynamically.
 *
 * @param {string} path
 * @returns {{ type, label?, max?, min? } | null}
 */
export function getFieldMeta(path) {
  const def = resolveField(path);
  if (!def) return null;
  const { _regex, pattern, ...meta } = def;
  return meta;
}

// Re-export the raw list for tooling / testing
export { FIELD_REGISTRY };
