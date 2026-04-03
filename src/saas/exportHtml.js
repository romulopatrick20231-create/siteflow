/**
 * exportHtml.js — Builds and minifies the three static files for a Vercel deploy.
 *
 * Returns { html, css, js } where every file is minified:
 *   • Smaller base64 payload → faster Vercel upload
 *   • Lighter CDN assets → faster browser first-paint
 *   • Less network cost on re-deploy (Vercel deduplicates unchanged files by hash)
 *
 * Minification is intentionally regex-based (no npm deps, no bundler). The
 * transformations applied are conservative and safe for the known template
 * shape produced by htmlBuilder.js.
 */

import { buildHTML } from "./htmlBuilder.js";

// ── Minifiers ─────────────────────────────────────────────────────────────────

/**
 * Minify CSS.
 * Safe transformations only — no property reordering, no value normalisation.
 *
 * @param {string} css
 * @returns {string}
 */
function minifyCss(css) {
  return css
    // 1. Strip block comments  /* … */
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // 2. Collapse all whitespace runs (newlines, tabs, multiple spaces) to one space
    .replace(/\s+/g, " ")
    // 3. Remove the single space that may remain around structural punctuation
    //    { } ; ,   — these never appear inside string values in this stylesheet
    .replace(/ ?([{}]) ?/g, "$1")
    .replace(/ ?(;) ?/g,  "$1")
    .replace(/ ?(,) ?/g,  "$1")
    // 4. Remove the trailing semicolon before every closing brace (valid CSS)
    .replace(/;}/g, "}")
    .trim();
}

/**
 * Minify HTML.
 * Conservative: collapses inter-tag whitespace and strips HTML comments.
 * Does NOT strip whitespace inside text nodes to avoid altering visible content.
 *
 * @param {string} html
 * @returns {string}
 */
function minifyHtml(html) {
  return html
    // 1. Strip HTML comments (<!-- … -->) — none are user-visible in this template
    .replace(/<!--[\s\S]*?-->/g, "")
    // 2. Collapse runs of whitespace between tags to a single space
    //    ("> <" → "><" is too aggressive; ">\n   <" → "> <" is safe)
    .replace(/>\s{2,}</g, "> ")
    .replace(/\s{2,}</g,  " <")
    // 3. Collapse any remaining internal whitespace runs
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Minify JavaScript.
 * Strips line comments and collapses whitespace — no AST transform.
 *
 * @param {string} js
 * @returns {string}
 */
function minifyJs(js) {
  return js
    // 1. Strip single-line comments (// …) — safe for this known script
    .replace(/\/\/[^\n]*/g, "")
    // 2. Collapse whitespace runs
    .replace(/\s+/g, " ")
    // 3. Remove spaces around { } ( ) ; ,
    .replace(/ ?([{}();,]) ?/g, "$1")
    .trim();
}

// ── Lightweight interaction script ────────────────────────────────────────────
// Injected into every published site. No dependencies, no bundler.

const SITE_JS = `
(function () {
  "use strict";

  // Progressive nav shadow on scroll
  var nav = document.querySelector(".nav");
  if (nav) {
    window.addEventListener("scroll", function () {
      nav.style.boxShadow = window.scrollY > 8
        ? "0 2px 20px rgba(0,0,0,.14)"
        : "";
    }, { passive: true });
  }

  // Smooth anchor scroll with fixed-nav offset
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var target = document.querySelector(this.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });
})();
`;

// ── Regex to extract the <style> block ───────────────────────────────────────
const STYLE_BLOCK_RE = /<style>([\s\S]*?)<\/style>/;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build and minify the three static files that make up a published site.
 *
 * @param {object} site — sites row joined with site_content, products, images
 *   (same shape accepted by htmlBuilder.buildHTML)
 *
 * @returns {{ html: string, css: string, js: string }}
 *   All three strings are minified and ready to pass to vercelService.deploySite.
 */
export function exportHtml(site) {
  // ── 1. Build canonical HTML (single source of truth for markup + CSS) ────
  const fullHtml = buildHTML(site);

  // ── 2. Extract and minify CSS ─────────────────────────────────────────────
  const styleMatch = fullHtml.match(STYLE_BLOCK_RE);
  if (!styleMatch) {
    // Fallback: no <style> found — serve as single file with empty CSS
    return { html: minifyHtml(fullHtml), css: "", js: minifyJs(SITE_JS) };
  }

  const css = minifyCss(styleMatch[1]);

  // ── 3. Rebuild HTML: replace <style> with <link>, inject <script> ─────────
  const html = minifyHtml(
    fullHtml
      .replace(STYLE_BLOCK_RE, '<link rel="stylesheet" href="./style.css">')
      .replace("</head>", '<script src="./script.js" defer></script></head>')
  );

  const js = minifyJs(SITE_JS);

  return { html, css, js };
}
