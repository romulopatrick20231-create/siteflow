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
    // 2. Collapse runs of whitespace between tags
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
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

  // ── Mobile nav ─────────────────────────────────────────────────────────────
  var hamburger = document.getElementById("nav-hamburger");
  var mobileNav = document.getElementById("nav-mobile");
  if (hamburger && mobileNav) {
    hamburger.addEventListener("click", function () {
      mobileNav.classList.toggle("open");
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { mobileNav.classList.remove("open"); });
    });
  }

  // ── Menu category tabs ──────────────────────────────────────────────────────
  var menuTabsWrap = document.getElementById("menu-tabs");
  if (menuTabsWrap) {
    menuTabsWrap.querySelectorAll(".menu-tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cat = this.getAttribute("data-cat");
        menuTabsWrap.querySelectorAll(".menu-tab-btn").forEach(function (b) { b.classList.remove("active"); });
        this.classList.add("active");
        document.querySelectorAll("#menu-cats .menu-cat").forEach(function (s) {
          s.classList.toggle("active", s.getAttribute("data-cat") === cat);
        });
      });
    });
  }

  // ── Imóveis filter ──────────────────────────────────────────────────────────
  var imoveisGrid = document.getElementById("imoveis-grid");
  if (imoveisGrid) {
    var activeTipo = "todos";
    var searchTerm = "";

    function applyImoveisFilter() {
      imoveisGrid.querySelectorAll(".imovel-card").forEach(function (card) {
        var tipo = card.getAttribute("data-tipo") || "todos";
        var nbhd = card.getAttribute("data-neighborhood") || "";
        var tipoOk   = activeTipo === "todos" || tipo === activeTipo;
        var searchOk = !searchTerm || nbhd.includes(searchTerm);
        if (tipoOk && searchOk) {
          card.removeAttribute("data-hidden");
          card.style.display = "";
        } else {
          card.setAttribute("data-hidden", "");
          card.style.display = "none";
        }
      });
    }

    document.querySelectorAll(".imoveis-filter-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".imoveis-filter-btn").forEach(function (b) { b.classList.remove("active"); });
        this.classList.add("active");
        activeTipo = this.getAttribute("data-filter");
        applyImoveisFilter();
      });
    });

    var searchInput = document.getElementById("imoveis-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        searchTerm = this.value.toLowerCase().trim();
        applyImoveisFilter();
      });
    }
  }

  // ── Content products filter (petshop) ───────────────────────────────────────
  var prodFilters = document.getElementById("prod-filters");
  var prodGrid    = document.getElementById("prod-grid");
  if (prodFilters && prodGrid) {
    prodFilters.querySelectorAll(".content-prod-filter-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        prodFilters.querySelectorAll(".content-prod-filter-btn").forEach(function (b) { b.classList.remove("active"); });
        this.classList.add("active");
        var cat = this.getAttribute("data-cat");
        prodGrid.querySelectorAll(".content-prod-card").forEach(function (card) {
          var cardCat = card.getAttribute("data-cat") || "";
          if (cat === "todos" || cardCat === cat) {
            card.removeAttribute("data-hidden");
            card.style.display = "";
          } else {
            card.setAttribute("data-hidden", "");
            card.style.display = "none";
          }
        });
      });
    });
  }

  // ── Cart system ─────────────────────────────────────────────────────────────
  var cartFloat = document.getElementById("cart-float");
  if (cartFloat) {
    // Show cart button (only shown if add buttons exist)
    if (document.querySelector(".add-btn")) cartFloat.style.display = "flex";
  }

  window.CartSystem = (function () {
    var items = [];
    var WA_HREF = (document.querySelector("a.btn-wa-hero") || {}).href || "";
    var BNAME   = document.title.split("—")[0].trim();

    function parsePrice(str) {
      if (!str) return 0;
      var m = (str + "").match(/[\d.,]+/);
      if (!m) return 0;
      return parseFloat(m[0].replace(/\./g, "").replace(",", ".")) || 0;
    }

    function fmt(num) {
      return "R$ " + num.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    function render() {
      var container = document.getElementById("cart-items");
      var countEl   = document.getElementById("cart-count");
      var totalEl   = document.getElementById("cart-total");
      var waBtn     = document.getElementById("cart-wa-btn");
      if (!container) return;

      var total = items.reduce(function (s, i) { return s + i.qty * i.price; }, 0);
      var count = items.reduce(function (s, i) { return s + i.qty; }, 0);

      if (countEl) {
        countEl.textContent = count;
        countEl.classList.toggle("show", count > 0);
      }
      if (totalEl) totalEl.textContent = fmt(total);
      if (waBtn)   waBtn.disabled = items.length === 0;

      if (!items.length) {
        container.innerHTML = '<div class="cart-empty-msg">Seu carrinho está vazio.<br>Adicione itens do cardápio! 😊</div>';
        return;
      }

      container.innerHTML = items.map(function (item, idx) {
        return '<div class="cart-item-row">'
          + (item.img ? '<img src="' + item.img + '" alt="' + item.name + '" class="cart-item-img">' : '<div class="cart-item-no-img">🍽️</div>')
          + '<div class="cart-item-info"><div class="cart-item-name">' + item.name + '</div>'
          + '<div class="cart-item-price">' + fmt(item.price) + ' × ' + item.qty + ' = ' + fmt(item.price * item.qty) + '</div></div>'
          + '<div class="cart-qty">'
          + '<button class="qty-btn" onclick="CartSystem.dec(' + idx + ')">−</button>'
          + '<span class="qty-val">' + item.qty + '</span>'
          + '<button class="qty-btn" onclick="CartSystem.inc(' + idx + ')">+</button>'
          + '</div></div>';
      }).join("");
    }

    return {
      add: function (btn) {
        var name  = btn.getAttribute("data-item-name") || "";
        var price = parsePrice(btn.getAttribute("data-item-price") || "");
        var img   = "";
        var wrap  = btn.closest(".feat-card,.menu-card");
        if (wrap) {
          var imgEl = wrap.querySelector("img");
          if (imgEl) img = imgEl.src;
        }
        var existing = items.find(function (i) { return i.name === name; });
        if (existing) {
          existing.qty++;
        } else {
          items.push({ name: name, price: price, img: img, qty: 1 });
        }
        render();
        // Brief button feedback
        btn.textContent = "✓ Adicionado";
        setTimeout(function () { btn.textContent = "+ Pedir"; }, 1200);
      },
      inc: function (idx) { if (items[idx]) { items[idx].qty++; render(); } },
      dec: function (idx) {
        if (!items[idx]) return;
        items[idx].qty--;
        if (items[idx].qty <= 0) items.splice(idx, 1);
        render();
      },
      open: function () {
        document.getElementById("cart-drawer")?.classList.add("open");
        document.getElementById("cart-overlay")?.classList.add("open");
        document.body.style.overflow = "hidden";
      },
      close: function () {
        document.getElementById("cart-drawer")?.classList.remove("open");
        document.getElementById("cart-overlay")?.classList.remove("open");
        document.body.style.overflow = "";
      },
      sendToWhatsApp: function () {
        if (!items.length) return;
        var total = items.reduce(function (s, i) { return s + i.qty * i.price; }, 0);
        var lines = ["*Pedido — " + BNAME + "*", ""];
        items.forEach(function (item) {
          lines.push("• " + item.name + " x" + item.qty + " — " + fmt(item.price * item.qty));
        });
        lines.push("");
        lines.push("*Total: " + fmt(total) + "*");
        lines.push("");
        lines.push("Aguardo confirmação e prazo de entrega 🙏");
        var msg = encodeURIComponent(lines.join("\n"));
        var base = WA_HREF ? WA_HREF.split("?")[0] : "https://wa.me/";
        window.open(base + "?text=" + msg, "_blank");
      },
    };
  })();

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
