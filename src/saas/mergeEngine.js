/**
 * mergeEngine.js
 *
 * Utilities for merging user edits into AI-generated site content objects,
 * setting / deleting values at arbitrary dot-paths, and caching merged results.
 *
 * Security:
 *   - setAtPath / deleteAtPath reject prototype-pollution key segments.
 *   - structuredClone is used instead of JSON.parse/stringify — faster and
 *     handles more value types without data loss.
 *
 * All exports are plain ESM — no TypeScript, no external dependencies.
 */

// ── Constants ───────────────────────────────────────────────────────────────

const FORBIDDEN_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

// ── Internal helpers ────────────────────────────────────────────────────────

function isPlainObject(val) {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

/** Throw if any segment in a split path is a prototype-pollution key. */
function assertSafeSegments(segments) {
  for (const s of segments) {
    if (FORBIDDEN_SEGMENTS.has(s)) {
      throw new Error(`Forbidden path segment: "${s}"`);
    }
  }
}

// ── mergeSiteData ────────────────────────────────────────────────────────────

/**
 * Deep-merge `edits` into `content`. Edits always win on conflicts.
 *
 * Rules:
 *  - edits absent                → return content as-is.
 *  - content absent              → return edits as-is.
 *  - edits is a non-object       → edits wins (primitive override).
 *  - content is Array            → edits keys (string integers "0","1"…)
 *    index into the array. Non-integer keys are ignored.
 *  - both are plain objects      → recursive merge. Content-only keys survive,
 *    edits-only keys are added, shared keys are merged recursively.
 *
 * Does NOT mutate either argument.
 *
 * @param {unknown} content - Original AI-generated data.
 * @param {unknown} edits   - User overrides.
 * @returns {unknown}
 */
export function mergeSiteData(content, edits) {
  if (edits === null || edits === undefined) return content;
  if (content === null || content === undefined) return edits;

  // Primitive edits override any content
  if (typeof edits !== "object") return edits;

  // ── Array case ──
  if (Array.isArray(content)) {
    const result = [...content];
    for (const key of Object.keys(edits)) {
      const idx = Number(key);
      if (Number.isInteger(idx) && idx >= 0) {
        result[idx] = mergeSiteData(content[idx], edits[key]);
      }
    }
    return result;
  }

  // ── Plain-object case ──
  if (isPlainObject(edits)) {
    const result = { ...content };
    for (const key of Object.keys(edits)) {
      result[key] = mergeSiteData(content[key], edits[key]);
    }
    return result;
  }

  // edits is an object but content is not (e.g. primitive) → edits wins
  return edits;
}

// ── setAtPath ────────────────────────────────────────────────────────────────

/**
 * Return a deep-cloned copy of `obj` with `value` written at `pathStr`.
 *
 * Intermediate nodes that don't exist are created as plain objects.
 * Rejects paths containing prototype-pollution segments (__proto__ etc.).
 *
 * Uses structuredClone (Node ≥ 17) — ~2× faster than JSON.parse/stringify
 * for typical site objects and preserves undefined/Date/RegExp correctly.
 *
 * @param {object|null|undefined} obj     - Source object.
 * @param {string}                pathStr - Dot-delimited path.
 * @param {unknown}               value   - Value to write.
 * @returns {object}
 */
export function setAtPath(obj, pathStr, value) {
  const segments = pathStr.split(".");
  assertSafeSegments(segments);

  const root   = structuredClone(obj || {});
  let   cursor = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (!isPlainObject(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  cursor[segments[segments.length - 1]] = value;
  return root;
}

// ── deleteAtPath ─────────────────────────────────────────────────────────────

/**
 * Return a deep-cloned copy of `obj` with the key at `pathStr` removed.
 * If the path does not exist the clone is returned unchanged.
 * Intermediate containers are not removed even if they become empty,
 * so sibling overrides are preserved.
 *
 * Used by revertEdit to remove a single user override without touching
 * the rest of the edits object.
 *
 * @param {object|null|undefined} obj     - Source object (edits column).
 * @param {string}                pathStr - Dot-delimited path to remove.
 * @returns {object}
 */
export function deleteAtPath(obj, pathStr) {
  const segments = pathStr.split(".");
  assertSafeSegments(segments);

  const root   = structuredClone(obj || {});
  let   cursor = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (!isPlainObject(cursor[key])) return root; // path doesn't exist — nothing to delete
    cursor = cursor[key];
  }

  delete cursor[segments[segments.length - 1]];
  return root;
}

// ── In-process cache ─────────────────────────────────────────────────────────
//
// Simple Map-based cache with TTL.  When the size limit is reached the OLDEST
// entry is evicted (Map iterates in insertion order) rather than clearing all
// entries — preserving recently-cached sites while capping memory.

const CACHE_TTL_MS  = 60_000; // 60 seconds
const CACHE_MAX     = 500;

/** @type {Map<string, { merged: object, ts: number }>} */
const _cache = new Map();

/**
 * Retrieve a cached merged object. Returns null if missing or expired.
 *
 * @param {string} siteId
 * @returns {object|null}
 */
export function getCached(siteId) {
  const entry = _cache.get(siteId);
  if (!entry) return null;

  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cache.delete(siteId);
    return null;
  }

  return entry.merged;
}

/**
 * Store a merged object in cache.
 * Evicts the single oldest entry when the size limit is hit.
 *
 * @param {string} siteId
 * @param {object} merged
 */
export function setCached(siteId, merged) {
  if (_cache.size >= CACHE_MAX) {
    // Map iteration order = insertion order; delete the first key (oldest)
    const oldestKey = _cache.keys().next().value;
    _cache.delete(oldestKey);
  }
  _cache.set(siteId, { merged, ts: Date.now() });
}

/**
 * Remove a site from the cache immediately.
 *
 * @param {string} siteId
 */
export function invalidateCache(siteId) {
  _cache.delete(siteId);
}
