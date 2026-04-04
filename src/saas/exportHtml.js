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

  // Guard — GSAP/Lenis may not have loaded if offline
  if (typeof gsap === "undefined" || typeof Lenis === "undefined") {
    // Fallback: basic scroll + reveal without animations
    document.querySelectorAll(".sr-up,.sr-fade,.sr-scale").forEach(function (el) {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    return;
  }

  // ── Lenis smooth scroll ──────────────────────────────────────────────────
  var lenis = new Lenis({ lerp: 0.1, smoothWheel: true, touchMultiplier: 1.6 });
  gsap.registerPlugin(ScrollTrigger);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
  lenis.on("scroll", ScrollTrigger.update);

  // ── Nav shadow on scroll ─────────────────────────────────────────────────
  var nav = document.querySelector(".nav");
  lenis.on("scroll", function (e) {
    if (nav) nav.style.boxShadow = e.scroll > 8 ? "0 2px 24px rgba(0,0,0,.15)" : "";
  });

  // ── Smooth anchor links ──────────────────────────────────────────────────
  document.querySelectorAll("a[href^='#']").forEach(function (link) {
    link.addEventListener("click", function (e) {
      var target = document.querySelector(this.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -72, duration: 1.4 });
    });
  });

  // ── Hero headline word split ──────────────────────────────────────────────
  var heroH1 = document.querySelector("[data-split-words]");
  if (heroH1) {
    var words = heroH1.innerText.split(" ");
    heroH1.innerHTML = words.map(function (w) {
      return "<span style='display:inline-block;overflow:hidden;'><span style='display:inline-block'>" + w + "</span></span>";
    }).join(" ");
    gsap.from(heroH1.querySelectorAll("span > span"), {
      y: "105%", opacity: 0, duration: 0.9, stagger: 0.07, ease: "power3.out", delay: 0.25
    });
  }

  // ── Hero badge fade ──────────────────────────────────────────────────────
  gsap.from(".hero-badge", { opacity: 0, y: -16, duration: 0.7, ease: "power2.out", delay: 0.1 });
  gsap.from(".hero p",     { opacity: 0, y: 20,  duration: 0.8, ease: "power3.out", delay: 0.85 });
  gsap.from(".hero-btns",  { opacity: 0, y: 20,  duration: 0.7, ease: "power2.out", delay: 1.0 });

  // ── Hero parallax ────────────────────────────────────────────────────────
  gsap.to("[data-parallax]", {
    yPercent: 22, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });

  // ── Hero image slider ────────────────────────────────────────────────────
  var slides = document.querySelectorAll(".hero-slide");
  if (slides.length > 1) {
    var cur = 0;
    setInterval(function () {
      gsap.to(slides[cur], { opacity: 0, duration: 1.2, ease: "power2.inOut" });
      cur = (cur + 1) % slides.length;
      gsap.to(slides[cur], { opacity: 0.45, duration: 1.2, ease: "power2.inOut" });
    }, 4500);
  }

  // ── Stats counters ───────────────────────────────────────────────────────
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    ScrollTrigger.create({
      trigger: el, start: "top 88%", once: true,
      onEnter: function () {
        var obj = { val: 0 };
        gsap.to(obj, {
          val: target, duration: 2.2, ease: "power2.out",
          onUpdate: function () {
            el.innerText = Math.round(obj.val).toLocaleString("pt-BR") + suffix;
          }
        });
      }
    });
  });

  // ── Scroll reveals ───────────────────────────────────────────────────────
  gsap.utils.toArray(".sr-up").forEach(function (el) {
    gsap.to(el, {
      y: 0, opacity: 1, duration: 0.75, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" }
    });
  });
  gsap.utils.toArray(".sr-fade").forEach(function (el) {
    gsap.to(el, {
      opacity: 1, duration: 0.8, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" }
    });
  });
  gsap.utils.toArray(".sr-scale").forEach(function (el) {
    gsap.to(el, {
      scale: 1, opacity: 1, duration: 0.65, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 92%", toggleActions: "play none none none" }
    });
  });

  // ── 3D card hover ────────────────────────────────────────────────────────
  document.querySelectorAll("[data-3d]").forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width  - 0.5;
      var y = (e.clientY - r.top)  / r.height - 0.5;
      gsap.to(card, { rotationY: x * 10, rotationX: -y * 10, duration: 0.3, ease: "power2.out", transformPerspective: 900 });
    });
    card.addEventListener("mouseleave", function () {
      gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.55, ease: "power3.out" });
    });
  });

  // ── Custom cursor ────────────────────────────────────────────────────────
  var dot  = document.querySelector(".cursor-dot");
  var ring = document.querySelector(".cursor-ring");
  if (dot && ring && window.matchMedia("(pointer:fine)").matches) {
    window.addEventListener("mousemove", function (e) {
      gsap.to(dot,  { x: e.clientX, y: e.clientY, duration: 0.05, ease: "none" });
      gsap.to(ring, { x: e.clientX, y: e.clientY, duration: 0.28, ease: "power2.out" });
    });
    document.querySelectorAll("a,button,[data-3d]").forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        gsap.to(ring, { width: 56, height: 56, opacity: 0.8, duration: 0.2 });
      });
      el.addEventListener("mouseleave", function () {
        gsap.to(ring, { width: 36, height: 36, opacity: 0.6, duration: 0.2 });
      });
    });
  }

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
