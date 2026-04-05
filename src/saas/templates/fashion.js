/**
 * fashion.js — Premium Dark Luxury Fashion Store template.
 *
 * Design: ZARA / Bottega Veneta aesthetic — minimal, dark, sophisticated.
 * Full cart (Stripe + WhatsApp), product grid with size selection, category browsing.
 */

import { waLink } from "../htmlBuilder.js";
import {
  WA_SVG, findSection, getAllImages, getFirstImage,
  getHeroContent, getTestimonials, getLocationData,
  buildHeroSlides, buildPhotoStrip, buildTestimonials,
  SHARED_CSS, SHARED_JS, CART_CSS, cartJS, cartDrawerHTML,
} from "./shared.js";

const API_BASE = process.env.API_BASE_URL || "https://api.forgesites.app";

export function buildFashionHTML(site) {
  const wa          = waLink(site.phone, site.business_name);
  const location    = [site.neighborhood, site.city].filter(Boolean).join(", ");
  const heroContent = getHeroContent(site);
  const placesData  = site.content?.placesData || null;
  const siteId      = site.id || "";
  const logoImg     = (site.images || []).find(i => i.type === "logo");

  const featured   = findSection(site, ["menu_featured", "products", "featured_products"]);
  const categories = findSection(site, ["menu_categories", "product_categories"]);

  const allImgs    = getAllImages(site, 8);
  const heroSlides = buildHeroSlides(site, "0.55");
  const photoStrip = buildPhotoStrip(site, "260px");
  const testiCards = buildTestimonials(site);

  const ratingBadge = placesData?.rating
    ? `${placesData.rating.toFixed(1)} · ${placesData.totalRatings?.toLocaleString("pt-BR") || ""} avaliações`
    : "";

  // ── Product card builder ──────────────────────────────────────────────────
  function buildProdCard(item, idx) {
    const name   = (item.name || "Produto").replace(/'/g, "\\'");
    const price  = item.price || "0";
    const imgUrl = item?.image?.url || (typeof item?.image === "string" ? item.image : null) || allImgs[idx % allImgs.length] || "";
    const badge  = item.badge || item.tag || "";
    const desc   = item.description || item.desc || "";
    const safeImg = imgUrl.replace(/'/g, "\\'");

    return `<div class="prod-card card-anim" data-name="${name}" data-price="${price}" data-img="${safeImg}">
  <div class="prod-img-wrap">
    ${imgUrl
      ? `<img class="prod-img" src="${imgUrl}" alt="${item.name || "Produto"}" loading="lazy">`
      : `<div class="prod-img-ph">✦</div>`}
    ${badge ? `<span class="prod-badge">${badge}</span>` : ""}
    <div class="prod-overlay">
      <div class="prod-overlay-name">${item.name || "Produto"}</div>
      ${desc ? `<div class="prod-overlay-desc">${desc}</div>` : ""}
      <div class="size-chips">
        <span class="size-chip" onclick="selectSize(this,'P','${name}','${price}','${safeImg}')">P</span>
        <span class="size-chip" onclick="selectSize(this,'M','${name}','${price}','${safeImg}')">M</span>
        <span class="size-chip" onclick="selectSize(this,'G','${name}','${price}','${safeImg}')">G</span>
        <span class="size-chip" onclick="selectSize(this,'GG','${name}','${price}','${safeImg}')">GG</span>
      </div>
    </div>
  </div>
  <div class="prod-footer">
    <div class="prod-info">
      <div class="prod-name">${item.name || "Produto"}</div>
      <div class="prod-price">${price ? `R$ ${price}` : ""}</div>
    </div>
    <button class="prod-add-btn" onclick="addToCartFromCard(this)" aria-label="Adicionar ao carrinho">+</button>
  </div>
</div>`;
  }

  // ── Featured products ─────────────────────────────────────────────────────
  const featItems = featured?.data?.featured_items || [];
  const featHtml  = featItems.length
    ? featItems.slice(0, 8).map((item, i) => buildProdCard(item, i)).join("")
    : allImgs.slice(0, 4).map((url, i) => {
        const names  = ["Vestido Minimal", "Casaco Oversized", "Calça Estruturada", "Blazer Alfaiataria"];
        const prices = ["349", "589", "299", "679"];
        return buildProdCard({ name: names[i] || "Peça", price: prices[i] || "299", image: url }, i);
      }).join("");

  // ── Category sections ─────────────────────────────────────────────────────
  const catSections    = categories?.data?.categories || [];
  let catSectionsHtml  = "";
  for (let ci = 0; ci < catSections.length; ci++) {
    const cat   = catSections[ci];
    const cards = (cat.items || []).map((item, i) => buildProdCard(item, i)).join("");
    if (!cards) continue;
    catSectionsHtml += `<section class="fashion-cat-section">
  <div class="wrap">
    <div class="section-label sr-fade">Coleção</div>
    <h2 class="section-title sr-up">${cat.name}</h2>
    <div class="prod-grid">${cards}</div>
  </div>
</section>`;
  }

  // ── Testimonials ──────────────────────────────────────────────────────────
  const testiSection = testiCards ? `
<section class="section-dark" id="depoimentos">
  <div class="wrap">
    <div class="section-label sr-fade">Clientes</div>
    <h2 class="section-title sr-up">O que dizem sobre nós</h2>
    <div class="testi-grid">${testiCards}</div>
  </div>
</section>` : "";

  // ── Cart JS ───────────────────────────────────────────────────────────────
  const cartScript = cartJS({ siteId, apiBase: API_BASE, waHref: wa });
  const cartDrawer = cartDrawerHTML({ waHref: wa, waLabel: "Pedir pelo WhatsApp" });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${site.niche} em ${location}. ${heroContent.headline}">
<meta property="og:title" content="${site.business_name}">
<meta property="og:image" content="${allImgs[0] || ""}">
<title>${site.business_name} — ${site.niche}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Inter:wght@300;400;500;600;700&display=swap">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js" defer></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0A0A0A;--surface:#111111;--surface2:#1A1A1A;
  --p:#C9A96E;--ph:#B8935A;--acc:#C9A96E;--acc-fg:#0A0A0A;
  --txt:#F5F0E8;--muted:rgba(245,240,232,.5);--bdr:rgba(245,240,232,.07);
  --wa:#25D366;--r:4px;--r2:8px;
  --sh:0 4px 40px rgba(0,0,0,.6);--shl:0 20px 80px rgba(0,0,0,.8);
  --font-h:'Cormorant Garamond',Georgia,serif;--font-b:'Inter',system-ui,sans-serif
}
html{scroll-behavior:smooth}
body{font-family:var(--font-b);color:var(--txt);background:var(--bg);-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3,h4{font-family:var(--font-h)}
img{display:block;max-width:100%;object-fit:cover}
a{color:inherit;text-decoration:none}
.wrap{max-width:1280px;margin:0 auto;padding:0 32px}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--p);border-radius:2px}
button{cursor:pointer;font-family:var(--font-b)}

/* ── Nav ── */
.site-nav{position:fixed;top:0;left:0;right:0;z-index:400;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:rgba(10,10,10,.9);backdrop-filter:blur(24px) saturate(160%);border-bottom:1px solid var(--bdr);transition:background .4s,border-color .4s}
.site-nav.scrolled{background:rgba(10,10,10,.98);border-color:rgba(245,240,232,.12)}
.nav-brand{display:flex;align-items:center;gap:10px;font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--txt);letter-spacing:.08em;text-transform:uppercase}
.nav-logo{height:34px;width:auto;border-radius:0;filter:brightness(0) invert(1)}
.nav-links{display:flex;align-items:center;gap:0}
.nav-link{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:8px 16px;transition:color .2s}
.nav-link:hover{color:var(--txt)}
.nav-actions{display:flex;align-items:center;gap:12px}
.nav-search-btn{background:none;border:none;color:var(--muted);padding:8px;transition:color .2s;font-size:18px;line-height:1}
.nav-search-btn:hover{color:var(--txt)}
.nav-cart-btn{position:relative;background:none;border:none;color:var(--muted);padding:8px;display:flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;transition:color .2s}
.nav-cart-btn:hover{color:var(--txt)}
.nav-cart-icon{font-size:18px}
.nav-cart-count{position:absolute;top:2px;right:0;width:16px;height:16px;background:var(--p);color:var(--acc-fg);border-radius:50%;font-size:9px;font-weight:800;display:none;align-items:center;justify-content:center}
.nav-cart-count.show{display:flex}
.nav-wa-btn{display:inline-flex;align-items:center;gap:6px;background:transparent;color:var(--txt);border:1px solid rgba(245,240,232,.2);font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:9px 18px;border-radius:0;transition:background .2s,border-color .2s}
.nav-wa-btn:hover{background:rgba(245,240,232,.06);border-color:rgba(245,240,232,.35)}
.nav-ham{display:none;background:none;border:none;cursor:pointer;padding:8px;color:var(--txt)}
.nav-ham span{display:block;width:20px;height:1px;background:currentColor;margin:5px 0;transition:transform .25s}
.nav-mob{display:none;position:fixed;top:64px;left:0;right:0;background:var(--surface);border-bottom:1px solid var(--bdr);z-index:399;padding:24px 32px;flex-direction:column;gap:4px}
.nav-mob.open{display:flex}
.nav-mob-link{font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:12px 0;border-bottom:1px solid var(--bdr);transition:color .2s}
.nav-mob-link:hover{color:var(--txt)}
@media(max-width:900px){.nav-links{display:none}.nav-ham{display:block}.nav-wa-btn.hide-mob{display:none}}

/* ── Promo ticker ── */
.promo-ticker{background:var(--p);color:var(--acc-fg);overflow:hidden;height:38px;display:flex;align-items:center}
.ticker-track{display:flex;width:max-content;animation:ticker 28s linear infinite;white-space:nowrap;gap:0}
.ticker-track:hover{animation-play-state:paused}
.ticker-item{font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;padding:0 48px}
.ticker-dot{opacity:.5}
@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* ── Hero ── */
.site-hero{position:relative;height:100svh;min-height:600px;display:flex;align-items:flex-end;overflow:hidden;background:var(--bg)}
.hero-overlay{position:absolute;inset:0;z-index:1;background:linear-gradient(to bottom,transparent 30%,rgba(10,10,10,.85) 100%)}
.hero-inner{position:relative;z-index:2;padding:0 48px 72px;width:100%}
.hero-kicker{font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:var(--p);font-weight:600;margin-bottom:16px;opacity:.9}
.hero-headline{font-family:var(--font-h);font-size:clamp(60px,10vw,130px);font-weight:700;line-height:.92;letter-spacing:-.01em;color:var(--txt);margin-bottom:28px}
.hero-headline em{font-style:italic;color:var(--p)}
.hero-btns{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.btn-primary{display:inline-flex;align-items:center;gap:8px;background:var(--p);color:var(--acc-fg);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:16px 36px;border:none;border-radius:0;transition:background .2s,transform .15s}
.btn-primary:hover{background:var(--ph);transform:translateY(-2px)}
.btn-outline{display:inline-flex;align-items:center;gap:8px;background:transparent;color:var(--txt);border:1px solid rgba(245,240,232,.35);font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:15px 32px;border-radius:0;transition:background .2s,border-color .2s}
.btn-outline:hover{background:rgba(245,240,232,.06);border-color:rgba(245,240,232,.6)}
.hero-scroll{position:absolute;right:40px;bottom:36px;z-index:3;display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--muted);font-size:10px;letter-spacing:.2em;text-transform:uppercase}
.hero-scroll-line{width:1px;height:50px;background:linear-gradient(to bottom,var(--muted),transparent);animation:scrollLine 2s ease-in-out infinite}
@keyframes scrollLine{0%,100%{opacity:.3;transform:scaleY(.6) translateY(-6px)}50%{opacity:1;transform:scaleY(1) translateY(0)}}
@media(max-width:768px){.hero-inner{padding:0 24px 56px}.hero-scroll{display:none}}

/* ── Sections ── */
.section-dark{padding:100px 0;background:var(--bg)}
.section-surface{padding:100px 0;background:var(--surface)}
.section-surface2{padding:100px 0;background:var(--surface2)}
.section-label{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--p);font-weight:700;margin-bottom:16px}
.section-title{font-family:var(--font-h);font-size:clamp(36px,5vw,62px);font-weight:700;line-height:1.05;letter-spacing:-.01em;margin-bottom:48px}
.section-title em{font-style:italic;color:var(--p)}

/* ── Product grid ── */
.prod-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:2px}
@media(max-width:1100px){.prod-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:768px){.prod-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.prod-grid{grid-template-columns:1fr}}

.prod-card{background:var(--surface2);overflow:hidden;cursor:pointer}
.prod-img-wrap{position:relative;aspect-ratio:3/4;overflow:hidden;background:var(--surface)}
.prod-img{width:100%;height:100%;object-fit:cover;transition:transform .7s cubic-bezier(.25,.46,.45,.94)}
.prod-img-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:48px;background:var(--surface)}
.prod-badge{position:absolute;top:16px;left:16px;background:var(--p);color:var(--acc-fg);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:5px 10px;z-index:2}
.prod-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(10,10,10,.96) 0%,rgba(10,10,10,.4) 60%,transparent 100%);display:flex;flex-direction:column;justify-content:flex-end;padding:24px;opacity:0;transform:translateY(8px);transition:opacity .35s,transform .35s;z-index:2}
.prod-card:hover .prod-overlay{opacity:1;transform:translateY(0)}
.prod-card:hover .prod-img{transform:scale(1.06)}
.prod-overlay-name{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--txt);margin-bottom:6px}
.prod-overlay-desc{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:14px}
.size-chips{display:flex;gap:6px;margin-bottom:0}
.size-chip{font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--muted);border:1px solid rgba(245,240,232,.2);padding:5px 10px;transition:all .15s;cursor:pointer;background:transparent}
.size-chip:hover{border-color:var(--p);color:var(--p)}
.size-chip.selected{background:var(--p);color:var(--acc-fg);border-color:var(--p)}
.prod-footer{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;background:var(--surface2)}
.prod-name{font-size:13px;font-weight:600;letter-spacing:.02em;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px}
.prod-price{font-size:12px;color:var(--p);font-weight:700;margin-top:2px}
.prod-add-btn{width:36px;height:36px;background:var(--p);color:var(--acc-fg);border:none;border-radius:0;font-size:22px;font-weight:300;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s,transform .1s}
.prod-add-btn:hover{background:var(--ph);transform:scale(1.08)}

/* ── Fashion cat section ── */
.fashion-cat-section{padding:80px 0;border-top:1px solid var(--bdr)}

/* ── CTA section ── */
.cta-section{padding:120px 0;text-align:center;background:var(--surface);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr)}
.cta-eyebrow{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--p);font-weight:700;margin-bottom:24px}
.cta-headline{font-family:var(--font-h);font-size:clamp(42px,7vw,90px);font-weight:700;line-height:.95;letter-spacing:-.02em;margin-bottom:48px}
.cta-headline em{font-style:italic;color:var(--p)}

/* ── WA float ── */
.wa-float{position:fixed;bottom:28px;left:28px;z-index:300;display:flex;align-items:center;gap:10px;background:#25D366;color:#fff;padding:14px 22px;border-radius:0;box-shadow:0 8px 32px rgba(37,211,102,.35);transition:transform .2s,box-shadow .2s;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.wa-float:hover{transform:translateY(-3px);box-shadow:0 14px 44px rgba(37,211,102,.45)}
.wa-float svg{flex-shrink:0}

/* ── Cart float ── */
.cart-float{position:fixed;bottom:28px;right:28px;z-index:300;display:none;align-items:center;justify-content:center;width:54px;height:54px;background:var(--p);color:var(--acc-fg);border:none;border-radius:0;box-shadow:0 8px 32px rgba(201,169,110,.4);font-size:22px;transition:transform .2s}
.cart-float.show{display:flex}
.cart-float:hover{transform:scale(1.08)}
#float-cart-count{position:absolute;top:-6px;right:-6px;width:20px;height:20px;background:var(--txt);color:var(--bg);border-radius:50%;font-size:10px;font-weight:800;display:none;align-items:center;justify-content:center}
#float-cart-count.show{display:flex}

/* ── Order banner ── */
.order-banner{position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:600;background:transparent;color:transparent;padding:14px 28px;font-size:14px;font-weight:700;border-radius:0;pointer-events:none;transition:all .3s;white-space:nowrap}
.order-banner.success{background:#15803D;color:#fff;box-shadow:0 8px 32px rgba(21,128,61,.35)}
.order-banner.error{background:#DC2626;color:#fff;box-shadow:0 8px 32px rgba(220,38,38,.35)}

/* ── Footer ── */
.site-footer{background:var(--surface);border-top:1px solid var(--bdr);padding:60px 0 40px}
.footer-inner{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:48px;margin-bottom:48px}
.footer-brand{font-family:var(--font-h);font-size:28px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt);margin-bottom:16px}
.footer-brand-desc{font-size:13px;color:var(--muted);line-height:1.7;max-width:280px}
.footer-col-title{font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:var(--p);margin-bottom:18px}
.footer-links{display:flex;flex-direction:column;gap:10px}
.footer-link{font-size:13px;color:var(--muted);transition:color .15s}
.footer-link:hover{color:var(--txt)}
.footer-bottom{display:flex;align-items:center;justify-content:space-between;padding-top:32px;border-top:1px solid var(--bdr)}
.footer-copy{font-size:11px;color:var(--muted);letter-spacing:.05em}
.footer-wa-btn{display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;font-size:12px;font-weight:700;padding:10px 20px;border-radius:0;transition:background .15s}
.footer-wa-btn:hover{background:#128C7E}
@media(max-width:768px){.footer-inner{grid-template-columns:1fr;gap:36px}.footer-bottom{flex-direction:column;gap:16px;text-align:center}}

${SHARED_CSS}
${CART_CSS}
</style>
</head>
<body>

<!-- ── Nav ── -->
<nav class="site-nav" id="site-nav">
  <a class="nav-brand" href="#">
    ${logoImg
      ? `<img class="nav-logo" src="${logoImg.public_url || logoImg.url}" alt="${site.business_name}">`
      : site.business_name}
  </a>
  <div class="nav-links">
    <a class="nav-link" href="#colecao">Coleção</a>
    <a class="nav-link" href="#feminino">Feminino</a>
    <a class="nav-link" href="#masculino">Masculino</a>
    <a class="nav-link" href="#acessorios">Acessórios</a>
  </div>
  <div class="nav-actions">
    <button class="nav-search-btn" aria-label="Pesquisar">⌕</button>
    <button class="nav-cart-btn" onclick="FCart.open()" aria-label="Carrinho">
      <span class="nav-cart-icon">🛍</span>
      <span id="nav-cart-count" class="nav-cart-count"></span>
    </button>
    <a class="nav-wa-btn hide-mob" href="${wa}" target="_blank" rel="noopener">
      ${WA_SVG} WhatsApp
    </a>
    <button class="nav-ham" id="nav-ham" aria-label="Menu" onclick="document.getElementById('nav-mob').classList.toggle('open')">
      <span></span><span></span>
    </button>
  </div>
</nav>
<div class="nav-mob" id="nav-mob">
  <a class="nav-mob-link" href="#colecao" onclick="document.getElementById('nav-mob').classList.remove('open')">Coleção</a>
  <a class="nav-mob-link" href="#feminino" onclick="document.getElementById('nav-mob').classList.remove('open')">Feminino</a>
  <a class="nav-mob-link" href="#masculino" onclick="document.getElementById('nav-mob').classList.remove('open')">Masculino</a>
  <a class="nav-mob-link" href="#acessorios" onclick="document.getElementById('nav-mob').classList.remove('open')">Acessórios</a>
  <a class="nav-mob-link" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>
</div>

<!-- ── Hero ── -->
<section class="site-hero" id="home">
  ${heroSlides}
  <div class="hero-overlay"></div>
  <div class="hero-inner">
    <div class="hero-kicker">${site.niche || "Moda &amp; Estilo"} · ${location}</div>
    <h1 class="hero-headline" data-split>${heroContent.headline || site.business_name}</h1>
    <div class="hero-btns">
      <a class="btn-primary" href="#colecao">Ver Coleção</a>
      <a class="btn-outline" href="${wa}" target="_blank" rel="noopener">${WA_SVG} WhatsApp</a>
    </div>
  </div>
  <div class="hero-scroll">
    <div class="hero-scroll-line"></div>
    <span>Scroll</span>
  </div>
</section>

<!-- ── Promo ticker ── -->
<div class="promo-ticker" aria-hidden="true">
  <div class="ticker-track">
    <span class="ticker-item">Frete Grátis acima de R$ 299</span>
    <span class="ticker-item ticker-dot">·</span>
    <span class="ticker-item">Troca em 30 Dias</span>
    <span class="ticker-item ticker-dot">·</span>
    <span class="ticker-item">Entrega em 24h</span>
    <span class="ticker-item ticker-dot">·</span>
    <span class="ticker-item">Frete Grátis acima de R$ 299</span>
    <span class="ticker-item ticker-dot">·</span>
    <span class="ticker-item">Troca em 30 Dias</span>
    <span class="ticker-item ticker-dot">·</span>
    <span class="ticker-item">Entrega em 24h</span>
    <span class="ticker-item ticker-dot">·</span>
  </div>
</div>

<!-- ── Photo strip ── -->
${photoStrip}

<!-- ── Destaques da Coleção ── -->
<section class="section-dark" id="colecao">
  <div class="wrap">
    <div class="section-label sr-fade">Nova Coleção</div>
    <h2 class="section-title sr-up">Destaques da <em>Coleção</em></h2>
  </div>
  <div style="padding:0 2px">
    <div class="prod-grid">${featHtml}</div>
  </div>
</section>

<!-- ── Category sections ── -->
${catSectionsHtml}

<!-- ── CTA "Viu Algo que Gostou?" ── -->
<section class="cta-section" id="contato">
  <div class="wrap">
    <div class="cta-eyebrow sr-fade">Atendimento Exclusivo</div>
    <h2 class="cta-headline sr-up">Viu Algo<br>que <em>Gostou?</em></h2>
    <a class="btn-primary" href="${wa}" target="_blank" rel="noopener" style="margin:0 auto;display:inline-flex">
      ${WA_SVG} Falar no WhatsApp
    </a>
  </div>
</section>

<!-- ── Testimonials ── -->
${testiSection}

<!-- ── Footer ── -->
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-inner">
      <div>
        <div class="footer-brand">${site.business_name}</div>
        <p class="footer-brand-desc">${site.niche || "Moda"} em ${location}. Peças exclusivas com entrega rápida e atendimento personalizado.</p>
        ${ratingBadge ? `<div style="margin-top:16px;font-size:13px;color:var(--p);font-weight:600">${ratingBadge}</div>` : ""}
      </div>
      <div>
        <div class="footer-col-title">Navegação</div>
        <div class="footer-links">
          <a class="footer-link" href="#colecao">Coleção</a>
          <a class="footer-link" href="#feminino">Feminino</a>
          <a class="footer-link" href="#masculino">Masculino</a>
          <a class="footer-link" href="#acessorios">Acessórios</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title">Contato</div>
        <div class="footer-links">
          <a class="footer-link" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>
          ${site.city ? `<span class="footer-link">${location}</span>` : ""}
          ${placesData?.address ? `<span class="footer-link">${placesData.address}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span class="footer-copy">© ${new Date().getFullYear()} ${site.business_name}. Todos os direitos reservados.</span>
      <a class="footer-wa-btn" href="${wa}" target="_blank" rel="noopener">${WA_SVG} WhatsApp</a>
    </div>
  </div>
</footer>

<!-- ── Cart ── -->
${cartDrawer}

<!-- ── WA float ── -->
<a class="wa-float" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">
  ${WA_SVG} WhatsApp
</a>

<!-- ── Cart float ── -->
<button class="cart-float" id="cart-float" onclick="FCart.open()" aria-label="Carrinho">
  🛍
  <span id="float-cart-count" class="nav-cart-count"></span>
</button>

<!-- ── Order banner ── -->
<div class="order-banner" id="order-banner"></div>

<script>
${SHARED_JS}

// ── Size selection + add to cart ──
function selectSize(el,size,name,price,img){
  var card=el.closest('.prod-card');
  card.querySelectorAll('.size-chip').forEach(function(c){c.classList.remove('selected');});
  el.classList.add('selected');
  card.dataset.selectedSize=size;
  card.dataset.name=name;card.dataset.price=price;card.dataset.img=img;
}
function addToCartFromCard(btn){
  var card=btn.closest('.prod-card');
  var size=card.dataset.selectedSize;
  if(!size){
    card.querySelectorAll('.size-chip').forEach(function(c){c.style.borderColor='#C9A96E';});
    setTimeout(function(){card.querySelectorAll('.size-chip').forEach(function(c){c.style.borderColor='';});},1200);
    return;
  }
  FCart.add(card.dataset.name||'Produto',card.dataset.price||'0',card.dataset.img||'',size);
}

${cartScript}
</script>
</body>
</html>`;
}
