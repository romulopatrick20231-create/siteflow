/**
 * farmacia.js — Premium Farmácia / Drogaria template.
 *
 * Design: clean white-blue pharmaceutical. Trust-first layout.
 * Feels like Ultrafarma / Drogasil but tailored.
 * Full cart (Stripe + WhatsApp), product categories, trust signals.
 */

import { waLink } from "../htmlBuilder.js";
import {
  WA_SVG, findSection, getAllImages, getFirstImage,
  getHeroContent, getTestimonials, getLocationData,
  buildHeroSlides, buildPhotoStrip, buildTestimonials,
  SHARED_CSS, SHARED_JS, CART_CSS, cartJS, cartDrawerHTML,
} from "./shared.js";

const API_BASE = process.env.API_BASE_URL || "https://api.forgesites.app";

export function buildFarmaciaFull(site) {
  const wa       = waLink(site.phone, site.business_name);
  const location = [site.neighborhood, site.city].filter(Boolean).join(", ");
  const heroContent = getHeroContent(site);
  const placesData  = site.content?.placesData || null;
  const siteId      = site.id || "";
  const logoImg     = (site.images || []).find(i => i.type === "logo");

  // Products from AI content
  const featured = findSection(site, ["menu_featured", "products", "featured_products"]);
  const categories = findSection(site, ["menu_categories", "product_categories"]);
  const highlight  = findSection(site, ["highlight_bar"]);

  const heroImg   = getFirstImage(site);
  const allImgs   = getAllImages(site, 8);
  const heroSlides = allImgs.length > 1
    ? (allImgs.length < 3 ? [...allImgs, ...allImgs, ...allImgs] : allImgs).slice(0, 8)
    : [];
  const stripImgs  = allImgs.length >= 3
    ? [...allImgs, ...allImgs, ...allImgs].slice(0, 18)
    : [];

  const ratingBadge = placesData?.rating
    ? `⭐ ${placesData.rating.toFixed(1)} · ${placesData.totalRatings?.toLocaleString("pt-BR") || ""} avaliações`
    : "";

  const locData = getLocationData(site);
  const hoursHtml = locData?.hours ? Object.entries(locData.hours).map(([k, v]) => {
    const labels = { weekdays: "Seg–Sex", saturday: "Sábado", sunday: "Domingo" };
    return `<tr><td>${labels[k] || k}</td><td>${v}</td></tr>`;
  }).join("") : "";

  const testiCards = buildTestimonials(site);

  // Product categories grid
  const defaultCategories = [
    { icon: "💊", name: "Medicamentos" },
    { icon: "💆", name: "Dermocosméticos" },
    { icon: "🧴", name: "Higiene Pessoal" },
    { icon: "🏃", name: "Suplementos" },
    { icon: "👶", name: "Bebê & Criança" },
    { icon: "💉", name: "Vitaminas" },
    { icon: "🌿", name: "Fitoterápicos" },
    { icon: "🩹", name: "Primeiros Socorros" },
  ];

  const catItems = categories?.data?.categories?.length
    ? categories.data.categories
    : defaultCategories;

  const catHtml = catItems.slice(0, 8).map(cat => {
    const icon = cat.icon || "💊";
    const name = cat.name || "Categoria";
    return `<div class="pharma-cat-card card-anim">
  <div class="pharma-cat-icon">${icon}</div>
  <div class="pharma-cat-name">${name}</div>
</div>`;
  }).join("");

  // Featured products
  const featItems = featured?.data?.featured_items || [];
  const featHtml = featItems.slice(0, 6).map(item => {
    const imgUrl = item?.image?.url || (typeof item?.image === "string" ? item.image : null);
    const price = item.price || "";
    const badge = item.badge || "";
    return `<div class="pharma-prod-card card-anim">
  <div class="pharma-prod-img-wrap">
    ${imgUrl
      ? `<img class="pharma-prod-img" src="${imgUrl}" alt="${item.name}" loading="lazy">`
      : `<div class="pharma-prod-placeholder">💊</div>`}
    ${badge ? `<span class="pharma-badge">${badge}</span>` : ""}
  </div>
  <div class="pharma-prod-body">
    <div class="pharma-prod-name">${item.name}</div>
    <div class="pharma-prod-desc">${item.description || ""}</div>
    <div class="pharma-prod-footer">
      <div class="pharma-prod-price">${price}</div>
      <button class="pharma-add-btn" onclick="FCart.add('${item.name.replace(/'/g, "\\'")}','${item.price || "0"}','${imgUrl || ""}',null)" aria-label="Adicionar">+</button>
    </div>
  </div>
</div>`;
  }).join("");

  // Category item cards
  let catSectionsHtml = "";
  const catSections = categories?.data?.categories || [];
  for (let ci = 0; ci < catSections.length; ci++) {
    const cat = catSections[ci];
    const itemCards = (cat.items || []).map(item => {
      const imgUrl = item?.image?.url || (typeof item?.image === "string" ? item.image : null);
      return `<div class="pharma-item-card slide-anim">
  ${imgUrl
    ? `<img class="pharma-item-img" src="${imgUrl}" alt="${item.name}" loading="lazy">`
    : `<div class="pharma-item-img-ph">💊</div>`}
  <div class="pharma-item-body">
    <div class="pharma-item-name">${item.name}${item.highlight ? ' <span class="pharma-pop">Popular</span>' : ""}</div>
    <div class="pharma-item-desc">${item.description || ""}</div>
    <div class="pharma-item-footer">
      <div class="pharma-item-price">${item.price || ""}</div>
      <button class="pharma-item-add" onclick="FCart.add('${item.name.replace(/'/g, "\\'")}','${item.price || "0"}','${imgUrl || ""}',null)">+</button>
    </div>
  </div>
</div>`;
    }).join("");
    if (!itemCards) continue;
    catSectionsHtml += `<div class="pharma-cat-section" id="cat-${ci}">
  <h3 class="pharma-sec-title sr-fade">${cat.name}</h3>
  <div class="pharma-item-grid">${itemCards}</div>
</div>`;
  }

  const highlightItems = (highlight?.data?.items || [
    { icon: "🧑‍⚕️", text: "Farmacêutico Online" },
    { icon: "🚀", text: "Entrega Expressa" },
    { icon: "💰", text: "Menor Preço Garantido" },
    { icon: "🔄", text: "Troca Fácil" },
  ]).map(h => `<div class="hl-item"><span>${h.icon || "✦"}</span><span>${h.text}</span></div>`).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${site.niche} em ${location}. ${heroContent.headline}">
<meta property="og:title" content="${site.business_name}">
<title>${site.business_name} — ${site.niche}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js" defer></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F0F7FF;--surface:#FFFFFF;--surface2:#E8F0FE;
  --p:#1D4ED8;--ph:#1E40AF;--acc:#059669;--acc-fg:#fff;
  --txt:#0F172A;--muted:rgba(15,23,42,.52);--bdr:rgba(29,78,216,.1);
  --wa:#25D366;--r:12px;--r2:18px;
  --sh:0 4px 20px rgba(29,78,216,.08);--shl:0 16px 56px rgba(29,78,216,.14);
  --font-h:'Lexend',sans-serif;--font-b:'Inter',system-ui,sans-serif
}
html{scroll-behavior:smooth}
body{font-family:var(--font-b);color:var(--txt);background:var(--bg);-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3,h4{font-family:var(--font-h)}
img{display:block;max-width:100%;object-fit:cover}
a{color:inherit;text-decoration:none}
.wrap{max-width:1200px;margin:0 auto;padding:0 24px}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--p);border-radius:3px}

/* ── Nav ── */
.site-nav{position:fixed;top:0;left:0;right:0;z-index:400;height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:rgba(255,255,255,.96);backdrop-filter:blur(20px) saturate(180%);border-bottom:1px solid var(--bdr);transition:box-shadow .3s}
.site-nav.scrolled{box-shadow:0 4px 28px rgba(29,78,216,.1)}
.nav-brand{display:flex;align-items:center;gap:10px;font-family:var(--font-h);font-size:20px;font-weight:800;color:var(--p)}
.nav-logo{height:38px;width:auto;border-radius:8px}
.nav-links{display:flex;align-items:center;gap:4px}
.nav-link{font-size:13px;font-weight:600;color:var(--muted);padding:7px 14px;border-radius:8px;transition:all .15s}
.nav-link:hover{background:var(--surface2);color:var(--txt)}
.nav-actions{display:flex;align-items:center;gap:10px}
.nav-cart-btn{position:relative;width:44px;height:44px;border-radius:50%;background:var(--surface2);border:1.5px solid var(--bdr);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--txt);transition:background .2s}
.nav-cart-btn:hover{background:var(--p);color:#fff;border-color:var(--p)}
.nav-cart-count{position:absolute;top:-3px;right:-3px;width:18px;height:18px;background:var(--p);color:#fff;border-radius:50%;font-size:10px;font-weight:800;display:none;align-items:center;justify-content:center}
.nav-cart-count.show{display:flex}
.btn-nav-wa{display:inline-flex;align-items:center;gap:7px;background:var(--acc);color:#fff;font-size:13px;font-weight:700;padding:10px 20px;border-radius:10px;border:none;cursor:pointer;transition:background .15s,transform .15s;white-space:nowrap}
.btn-nav-wa:hover{background:#047857;transform:translateY(-1px)}
.nav-ham{display:none;background:none;border:none;cursor:pointer;padding:8px;color:var(--txt)}
.nav-ham span{display:block;width:22px;height:2px;background:currentColor;margin:5px 0;transition:transform .2s}
.nav-mob{display:none;position:fixed;top:68px;left:0;right:0;background:var(--surface);border-bottom:1px solid var(--bdr);z-index:399;padding:16px 24px;flex-direction:column;gap:6px;box-shadow:0 8px 32px rgba(0,0,0,.1)}
.nav-mob.open{display:flex}
.nav-mob-link{font-size:15px;font-weight:600;color:var(--txt);padding:10px 14px;border-radius:10px;transition:background .15s}
.nav-mob-link:hover{background:var(--surface2)}
@media(max-width:768px){.nav-links{display:none}.nav-ham{display:block}.btn-nav-wa.hide-mob{display:none}}

/* ── Hero ── */
.site-hero{position:relative;min-height:100vh;display:flex;align-items:center;overflow:hidden;background:linear-gradient(135deg,#0F172A 0%,#1D4ED8 50%,#0369A1 100%)}
.hero-grad{position:absolute;inset:0;background:linear-gradient(to right,rgba(15,23,42,.96) 0%,rgba(15,23,42,.82) 48%,rgba(15,23,42,.28) 100%);z-index:1}
.hero-vignette{position:absolute;inset:0;z-index:1;background:radial-gradient(ellipse 110% 100% at 25% 50%,transparent 30%,rgba(0,0,0,.5) 100%)}
.hero-inner{position:relative;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;max-width:1200px;margin:0 auto;padding:140px 48px 100px;width:100%}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:100px;padding:7px 18px;font-size:12px;font-weight:700;color:#fff;margin-bottom:22px;backdrop-filter:blur(8px);letter-spacing:.06em;text-transform:uppercase}
.hero-badge span:first-child{font-size:17px}
.hero-h1{font-size:clamp(48px,8vw,108px);line-height:.94;letter-spacing:-.02em;color:#fff;margin-bottom:20px;font-weight:900}
.hero-sub{font-size:17px;color:rgba(255,255,255,.72);max-width:460px;line-height:1.7;margin-bottom:36px}
.hero-btns{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:44px}
.btn-hero-main{display:inline-flex;align-items:center;gap:10px;background:var(--p);color:#fff;font-size:16px;font-weight:800;padding:17px 36px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;box-shadow:0 8px 32px rgba(29,78,216,.4);text-decoration:none}
.btn-hero-main:hover{background:var(--ph);transform:translateY(-3px);box-shadow:0 16px 48px rgba(29,78,216,.5)}
.btn-hero-wa{display:inline-flex;align-items:center;gap:8px;background:var(--acc);color:#fff;font-size:15px;font-weight:700;padding:15px 28px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;text-decoration:none}
.btn-hero-wa:hover{background:#047857;transform:translateY(-2px)}
.hero-meta{display:flex;gap:20px;flex-wrap:wrap}
.hero-meta-item{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:rgba(255,255,255,.65)}
.hero-meta-item span:first-child{font-size:17px}
.hero-visual{position:relative;display:flex;align-items:center;justify-content:center;min-height:460px}
.hero-glow{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(29,78,216,.4) 0%,transparent 70%);pointer-events:none;animation:hglow 5s ease-in-out infinite}
.hero-circle{position:relative;z-index:1;width:420px;height:420px;border-radius:50%;overflow:hidden;box-shadow:0 0 80px rgba(29,78,216,.5),0 60px 120px rgba(0,0,0,.6);animation:hfloat 6s ease-in-out infinite;border:3px solid rgba(255,255,255,.06)}
.hero-circle img{width:100%;height:100%;object-fit:cover}
.hero-emoji{font-size:130px;animation:hfloat 6s ease-in-out infinite;filter:drop-shadow(0 24px 48px rgba(0,0,0,.6))}
.hero-ring{position:absolute;inset:-22px;border-radius:50%;border:1.5px solid rgba(29,78,216,.4);animation:hring 3.5s ease-in-out infinite;z-index:2}
.hero-ring2{position:absolute;inset:-48px;border-radius:50%;border:1px solid rgba(29,78,216,.2);animation:hring 3.5s ease-in-out infinite .9s;z-index:2}
@keyframes hfloat{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-20px) rotate(1deg)}}
@keyframes hglow{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.15);opacity:1}}
@keyframes hring{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.9;transform:scale(1.06)}}
@media(max-width:960px){.hero-inner{grid-template-columns:1fr;padding:110px 28px 72px;text-align:center}.hero-sub{margin:0 auto 36px}.hero-btns,.hero-meta{justify-content:center}.hero-visual{display:none}}
@media(max-width:480px){.hero-h1{font-size:clamp(40px,12vw,72px)}.hero-btns{flex-direction:column;align-items:stretch}.btn-hero-main,.btn-hero-wa{justify-content:center}.hero-inner{padding:100px 16px 60px}}

/* ── Highlights bar ── */
.hl-bar{background:var(--p);padding:14px 24px;overflow-x:auto}
.hl-inner{display:flex;gap:28px;justify-content:center;min-width:max-content;margin:0 auto}
.hl-item{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700;color:#fff;white-space:nowrap}
.hl-item span:first-child{font-size:19px}

/* ── Rating bar ── */
.rating-bar{background:var(--surface);border-bottom:1px solid var(--bdr);padding:12px 24px;text-align:center}
.rating-bar p{font-size:13px;font-weight:600;color:var(--muted)}
.rating-bar span{color:var(--p)}

/* ── Section headers ── */
.sec-label{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--p);margin-bottom:12px;display:flex;align-items:center;gap:10px}
.sec-label::before{content:"";width:24px;height:2px;background:var(--p)}
.sec-title{font-size:clamp(28px,4.5vw,48px);color:var(--txt);margin-bottom:44px;font-weight:900;line-height:1.05}
.section-wrap{max-width:1200px;margin:0 auto;padding:0 24px}

/* ── Category pills ── */
.pharma-cats-section{background:var(--surface);padding:60px 24px}
.pharma-cats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px}
.pharma-cat-card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 16px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r2);cursor:pointer;transition:all .2s;text-align:center}
.pharma-cat-card:hover{background:var(--p);border-color:var(--p);transform:translateY(-4px);box-shadow:var(--shl)}
.pharma-cat-card:hover .pharma-cat-icon,.pharma-cat-card:hover .pharma-cat-name{color:#fff}
.pharma-cat-icon{font-size:32px}
.pharma-cat-name{font-size:13px;font-weight:700;color:var(--txt)}

/* ── Featured products grid ── */
.pharma-featured-section{background:var(--bg);padding:80px 24px}
.pharma-prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}
.pharma-prod-card{background:var(--surface);border:1px solid var(--bdr);border-radius:var(--r2);overflow:hidden;transition:transform .25s,box-shadow .25s}
.pharma-prod-card:hover{transform:translateY(-6px);box-shadow:var(--shl)}
.pharma-prod-img-wrap{position:relative;height:200px;overflow:hidden;background:var(--surface2)}
.pharma-prod-img{width:100%;height:100%;transition:transform .5s}
.pharma-prod-card:hover .pharma-prod-img{transform:scale(1.07)}
.pharma-prod-placeholder{height:200px;display:flex;align-items:center;justify-content:center;font-size:60px;background:var(--surface2)}
.pharma-badge{position:absolute;top:12px;left:12px;background:var(--acc);color:#fff;font-size:10px;font-weight:800;padding:4px 12px;border-radius:100px;letter-spacing:.05em;text-transform:uppercase}
.pharma-prod-body{padding:18px}
.pharma-prod-name{font-size:15px;font-weight:700;margin-bottom:5px;color:var(--txt)}
.pharma-prod-desc{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pharma-prod-footer{display:flex;align-items:center;justify-content:space-between;gap:8px}
.pharma-prod-price{font-size:20px;font-weight:900;color:var(--p);font-family:var(--font-h)}
.pharma-add-btn{width:38px;height:38px;border-radius:50%;background:var(--p);color:#fff;border:none;font-size:20px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,transform .15s;flex-shrink:0}
.pharma-add-btn:hover{background:var(--ph);transform:scale(1.12)}
.pharma-add-btn:active{transform:scale(.9)}

/* ── Category sections ── */
.pharma-cats-products-section{background:var(--surface);padding:0 24px 80px}
.pharma-cat-section{padding-top:56px}
.pharma-sec-title{font-size:clamp(22px,3.5vw,36px);font-weight:900;color:var(--txt);margin-bottom:24px;padding-bottom:12px;border-bottom:2px solid var(--bdr)}
.pharma-item-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.pharma-item-card{display:flex;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r);overflow:hidden;transition:box-shadow .2s,border-color .2s;align-items:stretch}
.pharma-item-card:hover{box-shadow:var(--sh);border-color:rgba(29,78,216,.2)}
.pharma-item-img{width:90px;height:90px;flex-shrink:0;object-fit:cover}
.pharma-item-img-ph{width:90px;display:flex;align-items:center;justify-content:center;font-size:28px;background:var(--surface2);flex-shrink:0}
.pharma-item-body{flex:1;padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;min-width:0}
.pharma-item-name{font-size:14px;font-weight:700;color:var(--txt);margin-bottom:3px;line-height:1.3}
.pharma-item-desc{font-size:11px;color:var(--muted);line-height:1.4;flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pharma-item-footer{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:8px}
.pharma-item-price{font-size:15px;font-weight:900;color:var(--p)}
.pharma-pop{font-size:9px;font-weight:800;padding:2px 7px;border-radius:100px;background:rgba(5,150,105,.15);color:var(--acc);white-space:nowrap}
.pharma-item-add{width:30px;height:30px;border-radius:50%;background:var(--p);color:#fff;border:none;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,transform .15s;flex-shrink:0}
.pharma-item-add:hover{background:var(--ph);transform:scale(1.12)}

/* ── Pharmacist CTA ── */
.pharma-cta{background:linear-gradient(135deg,#0F172A 0%,#1D4ED8 60%,#0369A1 100%);padding:80px 24px;text-align:center;position:relative;overflow:hidden}
.pharma-cta::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 60% 80% at 50% 50%,rgba(255,255,255,.04) 0%,transparent 100%)}
.pharma-cta h2{font-size:clamp(32px,5.5vw,60px);color:#fff;margin-bottom:16px;font-weight:900;position:relative}
.pharma-cta p{font-size:17px;color:rgba(255,255,255,.75);max-width:520px;margin:0 auto 36px;position:relative;line-height:1.7}
.pharma-cta-btns{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;position:relative}
.btn-cta-wa{display:inline-flex;align-items:center;gap:10px;background:#fff;color:var(--p);font-size:16px;font-weight:800;padding:18px 40px;border-radius:12px;transition:transform .2s,box-shadow .2s}
.btn-cta-wa:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,.25)}
.btn-cta-p{display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,.12);color:#fff;border:1.5px solid rgba(255,255,255,.3);font-size:15px;font-weight:700;padding:16px 32px;border-radius:12px;backdrop-filter:blur(8px);transition:background .2s}
.btn-cta-p:hover{background:rgba(255,255,255,.22)}

/* ── Reviews section ── */
.reviews-section{background:var(--bg);padding:80px 24px}

/* ── Location section ── */
.loc-section{background:var(--surface);padding:80px 24px}
.loc-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
.loc-map{background:var(--surface2);border-radius:var(--r2);height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;border:1px solid var(--bdr);overflow:hidden;position:relative}
.loc-map span{font-size:52px;position:relative;z-index:1}
.loc-map p{font-size:14px;color:var(--muted);font-weight:600;text-align:center;position:relative;z-index:1;max-width:200px;line-height:1.5}
.loc-info{display:flex;flex-direction:column;gap:16px}
.loc-row{display:flex;gap:14px;align-items:flex-start;padding:18px 20px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r);transition:border-color .2s}
.loc-row:hover{border-color:rgba(29,78,216,.3)}
.loc-icon{font-size:20px;flex-shrink:0;margin-top:2px}
.loc-text{font-size:14px;color:var(--muted);line-height:1.6}
.loc-text strong{display:block;font-size:12px;font-weight:800;color:var(--txt);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em}
.hours-table{width:100%;border-collapse:collapse;margin-top:6px;font-size:13px}
.hours-table td{padding:5px 0;color:var(--muted)}
.hours-table td:first-child{font-weight:700;color:var(--txt);padding-right:16px}
@media(max-width:768px){.loc-inner{grid-template-columns:1fr}}

/* ── Footer ── */
.site-footer{background:#060B18;padding:40px 24px;border-top:1px solid rgba(255,255,255,.06)}
.footer-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px}
.footer-brand{font-family:var(--font-h);font-size:19px;font-weight:900;color:#fff}
.footer-info{font-size:13px;color:rgba(255,255,255,.4);line-height:1.7}
.footer-wa{display:flex;align-items:center;gap:8px;color:var(--wa);font-size:13px;font-weight:700}
.footer-credit{font-size:11px;color:rgba(255,255,255,.15);margin-top:6px}

/* ── WA float ── */
.wa-float{position:fixed;bottom:28px;right:28px;z-index:500;width:62px;height:62px;border-radius:50%;background:var(--wa);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 28px rgba(37,211,102,.55);animation:wapulse 2.8s ease-in-out infinite;transition:transform .2s;text-decoration:none}
.wa-float:hover{transform:scale(1.1)}
@keyframes wapulse{0%,100%{box-shadow:0 4px 28px rgba(37,211,102,.5)}50%{box-shadow:0 4px 52px rgba(37,211,102,.9)}}

${SHARED_CSS}
${CART_CSS}
</style>
</head>
<body>

<!-- Nav -->
<nav class="site-nav">
  <a class="nav-brand" href="#inicio">
    ${logoImg ? `<img src="${logoImg.public_url || logoImg.url}" alt="${site.business_name}" class="nav-logo">` : ""}
    ${site.business_name}
  </a>
  <div class="nav-links">
    <a class="nav-link" href="#inicio">Início</a>
    ${featItems.length ? `<a class="nav-link" href="#produtos">Produtos</a>` : ""}
    <a class="nav-link" href="#contato">Contato</a>
  </div>
  <div class="nav-actions">
    <button class="nav-ham" id="nav-ham"><span></span><span></span><span></span></button>
    <button class="nav-cart-btn" onclick="FCart.open()" aria-label="Carrinho">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <span class="nav-cart-count" id="nav-cart-count">0</span>
    </button>
    <a class="btn-nav-wa hide-mob" href="${wa}" target="_blank" rel="noopener">${WA_SVG} Falar c/ Farmacêutico</a>
  </div>
</nav>
<div class="nav-mob" id="nav-mob">
  <a class="nav-mob-link" href="#inicio" onclick="document.getElementById('nav-mob').classList.remove('open')">Início</a>
  ${featItems.length ? `<a class="nav-mob-link" href="#produtos" onclick="document.getElementById('nav-mob').classList.remove('open')">Produtos</a>` : ""}
  <a class="nav-mob-link" href="#contato" onclick="document.getElementById('nav-mob').classList.remove('open')">Contato</a>
  <a class="nav-mob-link" href="${wa}" target="_blank" rel="noopener">${WA_SVG} WhatsApp</a>
</div>

<!-- Hero -->
<section class="site-hero" id="inicio">
  ${heroSlides.length > 1
    ? `<div class="hero-slides" id="hero-slides">${heroSlides.map((url, i) => `<div class="hero-slide${i === 0 ? " active" : ""}" style="background-image:url('${url}');--opacity:.45"></div>`).join("")}</div>`
    : heroImg
      ? `<div class="hero-img-bg" style="position:absolute;inset:0;z-index:0"><img src="${heroImg}" alt="${site.business_name}" style="width:100%;height:100%;object-fit:cover;opacity:.42" loading="eager"></div>`
      : ""}
  <div class="hero-grad"></div>
  <div class="hero-vignette"></div>
  <div class="hero-inner">
    <div>
      <div class="hero-badge"><span>💊</span><span>${site.niche}${location ? ` · ${location}` : ""}${ratingBadge ? ` · ${ratingBadge}` : ""}</span></div>
      <h1 class="hero-h1" data-split>${heroContent.headline}</h1>
      ${heroContent.subheadline ? `<p class="hero-sub">${heroContent.subheadline}</p>` : `<p class="hero-sub">Medicamentos, dermocosméticos e tudo para o seu bem-estar${location ? ` em ${location}` : ""}.</p>`}
      <div class="hero-btns">
        <a class="btn-hero-main" href="#produtos">💊 Ver Produtos</a>
        <a class="btn-hero-wa" href="${wa}" target="_blank" rel="noopener">${WA_SVG} Falar c/ Farmacêutico</a>
      </div>
      <div class="hero-meta">
        <div class="hero-meta-item"><span>🧑‍⚕️</span><span>Farmacêutico online</span></div>
        <div class="hero-meta-item"><span>🚀</span><span>Entrega expressa</span></div>
        ${ratingBadge ? `<div class="hero-meta-item"><span>⭐</span><span>${ratingBadge}</span></div>` : ""}
      </div>
    </div>
    <div class="hero-visual">
      <div class="hero-glow"></div>
      ${heroImg
        ? `<div class="hero-circle"><img src="${heroImg}" alt="${site.business_name}" loading="eager"></div><div class="hero-ring"></div><div class="hero-ring2"></div>`
        : `<div class="hero-emoji">💊</div>`}
    </div>
  </div>
</section>

<!-- Highlights -->
<div class="hl-bar"><div class="hl-inner">${highlightItems}</div></div>

<!-- Rating bar -->
${ratingBadge
  ? `<div class="rating-bar"><p><span>⭐ ${placesData?.rating?.toFixed(1)}</span> no Google · ${placesData?.totalRatings?.toLocaleString("pt-BR")} avaliações · ${location}</p></div>`
  : location ? `<div class="rating-bar"><p>${location} · Fale conosco pelo WhatsApp</p></div>` : ""}

<!-- Photo strip -->
${stripImgs.length >= 4 ? `
<div class="photo-strip" style="height:220px;background:var(--surface)">
  <div class="strip-track">${stripImgs.map(url => `<img class="strip-img" src="${url}" alt="" loading="lazy">`).join("")}</div>
</div>` : ""}

<!-- Categories -->
<section class="pharma-cats-section">
  <div class="section-wrap">
    <div class="sec-label">Categorias</div>
    <h2 class="sec-title sr-fade">Encontre o que Precisa</h2>
    <div class="pharma-cats-grid">${catHtml}</div>
  </div>
</section>

<!-- Featured products -->
${featHtml ? `
<section class="pharma-featured-section" id="produtos">
  <div class="section-wrap">
    <div class="sec-label">Destaques</div>
    <h2 class="sec-title sr-fade">Mais Vendidos</h2>
    <div class="pharma-prod-grid">${featHtml}</div>
  </div>
</section>` : ""}

<!-- Category product sections -->
${catSectionsHtml ? `
<section class="pharma-cats-products-section">
  <div class="section-wrap">${catSectionsHtml}</div>
</section>` : ""}

<!-- Pharmacist CTA -->
<section class="pharma-cta" id="farmaceutico">
  <div class="wrap">
    <h2 class="sr-up">Tem Dúvidas sobre Medicamentos?</h2>
    <p class="sr-up">Nosso farmacêutico está disponível para orientar você sobre posologia, interações e cuidados. Atendimento via WhatsApp!</p>
    <div class="pharma-cta-btns sr-up">
      <a class="btn-cta-wa" href="${wa}" target="_blank" rel="noopener">${WA_SVG} Falar com Farmacêutico</a>
      ${featItems.length ? `<a class="btn-cta-p" href="#produtos">💊 Ver Produtos</a>` : ""}
    </div>
  </div>
</section>

<!-- Reviews -->
${testiCards ? `
<section class="reviews-section" id="depoimentos">
  <div class="section-wrap">
    <div class="sec-label">Avaliações</div>
    <h2 class="sec-title sr-fade">O Que Nossos Clientes Dizem</h2>
    <div class="testi-grid">${testiCards}</div>
    ${placesData?.rating ? `<div class="sr-up" style="text-align:center;margin-top:40px;padding-top:28px;border-top:1px solid var(--bdr)">
      <div style="font-size:52px;font-weight:900;color:var(--txt);font-family:var(--font-h)">${placesData.rating.toFixed(1)}</div>
      <div style="font-size:20px;color:#F59E0B;letter-spacing:2px;margin:6px 0">★★★★★</div>
      <div style="font-size:13px;color:var(--muted);font-weight:600">${placesData.totalRatings?.toLocaleString("pt-BR") || ""} avaliações no Google</div>
    </div>` : ""}
  </div>
</section>` : ""}

<!-- Location -->
${locData ? `
<section class="loc-section" id="contato">
  <div class="loc-inner">
    <div>
      <div class="sec-label">Onde Estamos</div>
      <h2 class="sec-title sr-fade">Localização e Horários</h2>
    </div>
    <div class="loc-map">
      <span>📍</span>
      <p>${locData.address || site.address || ""}${locData.city || site.city ? `<br>${locData.city || site.city}` : ""}</p>
      ${wa ? `<a href="${wa}" target="_blank" rel="noopener" style="position:relative;z-index:1;padding:8px 20px;background:var(--p);color:#fff;border-radius:8px;font-size:13px;font-weight:700;margin-top:8px">WhatsApp</a>` : ""}
    </div>
    <div class="loc-info sr-up">
      ${locData.address ? `<div class="loc-row"><span class="loc-icon">📍</span><div class="loc-text"><strong>Endereço</strong>${locData.address}</div></div>` : ""}
      ${hoursHtml ? `<div class="loc-row"><span class="loc-icon">🕐</span><div class="loc-text"><strong>Horários de Funcionamento</strong><table class="hours-table">${hoursHtml}</table></div></div>` : ""}
      ${site.phone ? `<div class="loc-row"><span class="loc-icon">📱</span><div class="loc-text"><strong>WhatsApp</strong><a href="${wa}" target="_blank" rel="noopener" style="color:var(--wa);font-weight:700">${site.phone}</a></div></div>` : ""}
    </div>
  </div>
</section>` : ""}

<!-- Footer -->
<footer class="site-footer">
  <div class="footer-inner">
    <div>
      <div class="footer-brand">${site.business_name}</div>
      <div class="footer-info">${site.niche}${location ? ` · ${location}` : ""}</div>
      <div class="footer-credit">Desenvolvido por ForgeSites AI</div>
    </div>
    ${site.phone ? `<a class="footer-wa" href="${wa}" target="_blank" rel="noopener">${WA_SVG} ${site.phone}</a>` : ""}
  </div>
</footer>

<!-- WA float -->
<a class="wa-float" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${WA_SVG}</a>

<!-- Cart float -->
<button class="cart-float" id="cart-float" onclick="FCart.open()" aria-label="Carrinho">
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
  <span class="float-cart-count" id="float-cart-count">0</span>
</button>

${cartDrawerHTML({ waHref: wa, waLabel: "Pedir pelo WhatsApp" })}
<div class="order-banner" id="order-banner"></div>

<script>
${SHARED_JS}
${cartJS({ siteId, apiBase: API_BASE, waHref: wa })}
document.getElementById("nav-ham").addEventListener("click",function(){document.getElementById("nav-mob").classList.toggle("open");});
document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener("click",function(e){var id=this.getAttribute("href").slice(1),el=document.getElementById(id);if(el){e.preventDefault();el.scrollIntoView({behavior:"smooth",block:"start"});}});});
</script>
</body>
</html>`;
}
