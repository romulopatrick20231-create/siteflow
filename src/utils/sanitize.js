/**
 * sanitize.js — Input sanitization utilities.
 *
 * Rules:
 *  - Strip HTML tags from text fields (prevent stored XSS)
 *  - Normalize whitespace
 *  - Truncate to reasonable lengths
 *  - Slug generation
 */

// Simple HTML stripper — no external dependency needed for this level.
// For rich-text fields, use DOMPurify server-side if needed.
function stripHtml(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function normalizeWhitespace(str) {
  if (typeof str !== "string") return str;
  return str.replace(/\s+/g, " ").trim();
}

/**
 * Sanitize a plain text field.
 * Strips HTML and normalizes whitespace.
 */
export function sanitizeText(value, maxLength = 500) {
  if (value === null || value === undefined) return value;
  const s = normalizeWhitespace(stripHtml(String(value)));
  return s.slice(0, maxLength);
}

/**
 * Sanitize a multiline text field (allows newlines, strips HTML).
 */
export function sanitizeLongText(value, maxLength = 5000) {
  if (value === null || value === undefined) return value;
  const s = stripHtml(String(value)).replace(/[ \t]+/g, " ").trim();
  return s.slice(0, maxLength);
}

/**
 * Generate a URL-safe slug from a string.
 */
export function toSlug(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 52);
}

/**
 * Validate and normalize a domain name.
 * Returns lowercased domain or null if invalid.
 */
export function normalizeDomain(raw) {
  if (!raw || typeof raw !== "string") return null;
  const d = raw.trim().toLowerCase().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  // Basic domain format validation
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(d)) return null;
  return d;
}

/**
 * Sanitize an object's fields recursively (strings only, max 2 levels deep).
 * Useful for sanitizing req.body before logging.
 */
export function sanitizeObject(obj, maxDepth = 2) {
  if (maxDepth === 0 || typeof obj !== "object" || obj === null) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeText(value);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeObject(value, maxDepth - 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Redact sensitive fields before logging.
 */
const SENSITIVE = new Set(["password", "token", "secret", "api_key", "credit_card", "cvv", "ssn"]);
export function redactSensitive(obj) {
  if (typeof obj !== "object" || obj === null) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = SENSITIVE.has(key.toLowerCase()) ? "[REDACTED]" : value;
  }
  return result;
}
