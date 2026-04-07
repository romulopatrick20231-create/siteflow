/**
 * templates/index.js — Premium niche template engine.
 *
 * Each niche gets a purpose-built, world-class HTML template.
 * The AI fills in CONTENT (menu items, text, images, hours).
 * The DESIGN is fixed — guaranteed premium quality every time.
 *
 * Supported niches with premium templates:
 *   Pizzaria, Hamburgueria, Sorveteria        → buildFoodHTML (dark, bold)
 *   Restaurante, Padaria                       → buildFoodHTML (warm tone)
 *   Clínica Veterinária, Pet Shop              → buildPetshopHTML
 *   Farmácia, Drogaria                         → buildFarmaciaHTML
 *
 * Fallback: niches without a premium template use the generic htmlBuilder.js
 */

import { waLink } from "../htmlBuilder.js";
import { buildFashionHTML } from "./fashion.js";
import { buildAcademiaHTML } from "./academia.js";
import { buildFarmaciaFull, buildFarmaciaHTML } from "./farmacia.js";
import { buildImobiliariaHTML } from "./imobiliaria.js";
import { buildClinicaHTML } from "./clinica.js";

// ── Niche design tokens ───────────────────────────────────────────────────────

const FOOD_CONFIGS = {
  "Pizzaria": {
    bg: "#0C0C0C", surface: "#141414", surface2: "#1E1E1E",
    primary: "#E11D48", primaryHover: "#BE123C",
    accent: "#F59E0B", accentFg: "#0C0C0C",
    text: "#FFFFFF", muted: "rgba(255,255,255,.58)",
    border: "rgba(255,255,255,.07)",
    gradHero: "linear-gradient(to right, rgba(12,12,12,.95) 0%, rgba(12,12,12,.75) 50%, rgba(12,12,12,.2) 100%)",
    glowColor: "rgba(225,29,72,.35)",
    font: "'Bebas Neue', Impact, sans-serif",
    bodyFont: "'Source Sans 3', system-ui, sans-serif",
    googleFonts: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap",
    emoji: "🍕",
    orderCta: "Fazer Pedido",
    menuLabel: "Cardápio",
    deliveryLabel: "Delivery",
    heroTagline: null,
  },
  "Hamburgueria": {
    bg: "#0A0A0A", surface: "#111111", surface2: "#1A1A1A",
    primary: "#C2410C", primaryHover: "#9A3412",
    accent: "#FCD34D", accentFg: "#0A0A0A",
    text: "#FFFFFF", muted: "rgba(255,255,255,.55)",
    border: "rgba(255,255,255,.06)",
    gradHero: "linear-gradient(to right, rgba(10,10,10,.96) 0%, rgba(10,10,10,.78) 50%, rgba(10,10,10,.22) 100%)",
    glowColor: "rgba(194,65,12,.35)",
    font: "'Bebas Neue', Impact, sans-serif",
    bodyFont: "'Source Sans 3', system-ui, sans-serif",
    googleFonts: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap",
    emoji: "🍔",
    orderCta: "Pedir Agora",
    menuLabel: "Cardápio",
    deliveryLabel: "Delivery",
    heroTagline: "Feito com intensidade.",
  },
  "Sorveteria": {
    bg: "#FAFAFA", surface: "#FFFFFF", surface2: "#F3F0FF",
    primary: "#7C3AED", primaryHover: "#6D28D9",
    accent: "#EC4899", accentFg: "#FFFFFF",
    text: "#1A1A1A", muted: "rgba(0,0,0,.5)",
    border: "rgba(0,0,0,.07)",
    gradHero: "linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F59E0B 100%)",
    glowColor: "rgba(124,58,237,.3)",
    font: "'Pacifico', cursive",
    bodyFont: "'Quicksand', system-ui, sans-serif",
    googleFonts: "https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@400;500;600;700&display=swap",
    emoji: "🍦",
    orderCta: "Fazer Pedido",
    menuLabel: "Sabores",
    deliveryLabel: "Entrega",
    heroTagline: "Cada colherada é uma alegria.",
  },
  "Restaurante": {
    bg: "#0F0B08", surface: "#1A140E", surface2: "#241C14",
    primary: "#B45309", primaryHover: "#92400E",
    accent: "#F59E0B", accentFg: "#0F0B08",
    text: "#FFFFFF", muted: "rgba(255,255,255,.58)",
    border: "rgba(255,255,255,.07)",
    gradHero: "linear-gradient(to right, rgba(15,11,8,.96) 0%, rgba(15,11,8,.75) 50%, rgba(15,11,8,.2) 100%)",
    glowColor: "rgba(180,83,9,.35)",
    font: "'Playfair Display', Georgia, serif",
    bodyFont: "'Lato', system-ui, sans-serif",
    googleFonts: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Lato:wght@300;400;700&display=swap",
    emoji: "🍽️",
    orderCta: "Reservar Mesa",
    menuLabel: "Cardápio",
    deliveryLabel: "Delivery",
    heroTagline: null,
  },
  "Padaria": {
    bg: "#FFFBF0", surface: "#FFFFFF", surface2: "#FEF3C7",
    primary: "#92400E", primaryHover: "#78350F",
    accent: "#F59E0B", accentFg: "#1A0A00",
    text: "#1A0A00", muted: "rgba(26,10,0,.55)",
    border: "rgba(146,64,14,.12)",
    gradHero: "linear-gradient(135deg, rgba(146,64,14,.92) 0%, rgba(180,83,9,.85) 60%, rgba(245,158,11,.6) 100%)",
    glowColor: "rgba(245,158,11,.35)",
    font: "'Playfair Display', Georgia, serif",
    bodyFont: "'Lato', system-ui, sans-serif",
    googleFonts: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Lato:wght@300;400;700&display=swap",
    emoji: "🍞",
    orderCta: "Fazer Pedido",
    menuLabel: "Produtos",
    deliveryLabel: "Entrega",
    heroTagline: "Feito com amor, todo dia.",
  },
  "Lanchonete": {
    bg: "#0D0D0D", surface: "#161616", surface2: "#1F1F1F",
    primary: "#EA580C", primaryHover: "#C2410C",
    accent: "#FCD34D", accentFg: "#0D0D0D",
    text: "#FFFFFF", muted: "rgba(255,255,255,.56)",
    border: "rgba(255,255,255,.07)",
    gradHero: "linear-gradient(to right, rgba(13,13,13,.96) 0%, rgba(13,13,13,.75) 50%, rgba(13,13,13,.22) 100%)",
    glowColor: "rgba(234,88,12,.35)",
    font: "'Bebas Neue', Impact, sans-serif",
    bodyFont: "'Source Sans 3', system-ui, sans-serif",
    googleFonts: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap",
    emoji: "🥪",
    orderCta: "Pedir Agora",
    menuLabel: "Cardápio",
    deliveryLabel: "Delivery",
    heroTagline: "Rápido, gostoso e sem frescura.",
  },
  "Cafeteria": {
    bg: "#1C0F08", surface: "#281608", surface2: "#321E0D",
    primary: "#D97706", primaryHover: "#B45309",
    accent: "#FDE68A", accentFg: "#1C0F08",
    text: "#FFF8F0", muted: "rgba(255,248,240,.58)",
    border: "rgba(255,248,240,.08)",
    gradHero: "linear-gradient(135deg, rgba(28,15,8,.96) 0%, rgba(45,25,10,.85) 60%, rgba(217,119,6,.3) 100%)",
    glowColor: "rgba(217,119,6,.35)",
    font: "'Playfair Display', Georgia, serif",
    bodyFont: "'Lato', system-ui, sans-serif",
    googleFonts: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Lato:wght@300;400;700&display=swap",
    emoji: "☕",
    orderCta: "Fazer Pedido",
    menuLabel: "Cardápio",
    deliveryLabel: "Entrega",
    heroTagline: "O melhor café da sua cidade.",
  },
  "Açaíteria": {
    bg: "#0F0718", surface: "#1A0D2A", surface2: "#24133A",
    primary: "#7C3AED", primaryHover: "#6D28D9",
    accent: "#EC4899", accentFg: "#FFFFFF",
    text: "#FFFFFF", muted: "rgba(255,255,255,.58)",
    border: "rgba(255,255,255,.08)",
    gradHero: "linear-gradient(135deg, #4C1D95 0%, #7C3AED 50%, #EC4899 100%)",
    glowColor: "rgba(124,58,237,.4)",
    font: "'Pacifico', cursive",
    bodyFont: "'Quicksand', system-ui, sans-serif",
    googleFonts: "https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@400;500;600;700&display=swap",
    emoji: "🍇",
    orderCta: "Pedir Agora",
    menuLabel: "Sabores",
    deliveryLabel: "Delivery",
    heroTagline: "Na tigela ou no copo — sempre especial.",
  },
};

const PETSHOP_CONFIGS = {
  "Clínica Veterinária": {
    primary: "#059669", accent: "#10B981", bg: "#ECFDF5",
    emoji: "🐾", label: "Pet",
  },
  "Pet Shop": {
    primary: "#7C3AED", accent: "#A78BFA", bg: "#F5F3FF",
    emoji: "🐶", label: "Pet",
  },
};

const FARMACIA_CONFIGS = {
  "Farmácia": {
    primary: "#0891B2", accent: "#06B6D4", bg: "#F0F9FF",
    emoji: "💊",
  },
  "Drogaria": {
    primary: "#0369A1", accent: "#0EA5E9", bg: "#EFF6FF",
    emoji: "💊",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function findSectionInSite(site, types) {
  for (const page of (site.content?.pages || [])) {
    for (const s of (page.sections || [])) {
      if (types.includes(s.type)) return s;
    }
  }
  return null;
}

function getFirstImage(site) {
  return getAllImages(site, 1)[0] || null;
}

/** Collect up to `max` unique Pexels/image URLs from all sections in the site. */
function getAllImages(site, max = 8) {
  const urls = [];
  const seen = new Set();
  function push(url) {
    if (!url || seen.has(url)) return;
    seen.add(url); urls.push(url);
  }
  for (const page of (site.content?.pages || [])) {
    for (const s of (page.sections || [])) {
      for (const img of (s.data?.images || [])) push(img?.url);
      for (const item of (s.data?.featured_items || [])) {
        push(item?.image?.url || (typeof item?.image === "string" ? item.image : null));
      }
      for (const cat of (s.data?.categories || [])) {
        for (const item of (cat.items || [])) {
          push(item?.image?.url || (typeof item?.image === "string" ? item.image : null));
        }
      }
      if (urls.length >= max) break;
    }
    if (urls.length >= max) break;
  }
  return urls.slice(0, max);
}

function getMenuDataFromSite(site) {
  const featured   = findSectionInSite(site, ["menu_featured"]);
  const categories = findSectionInSite(site, ["menu_categories"]);
  const highlight  = findSectionInSite(site, ["highlight_bar"]);
  const location   = findSectionInSite(site, ["location_hours"]);
  return {
    featured:   featured?.data || null,
    categories: categories?.data || null,
    highlight:  highlight?.data || null,
    location:   location?.data || null,
  };
}

function getTestimonialsFromSite(site) {
  const t = findSectionInSite(site, ["testimonials", "testimonials_story", "testimonials_featured"]);
  const d = t?.data || {};
  let list = null;
  if (d.testimonials) list = d.testimonials.slice(0, 3);
  else if (d.cases) list = d.cases.slice(0, 3).map(c => ({ name: c.name, text: c.quote || c.after || "" }));
  else if (d.featured) list = [d.featured, d.short_1, d.short_2].filter(Boolean).slice(0, 3);
  // Fallback to Google Places reviews
  if (!list?.length && site.content?.placesData?.reviews?.length) {
    list = site.content.placesData.reviews.slice(0, 3).map(r => ({ name: r.nome, text: r.texto }));
  }
  return list || [];
}

function getHeroContent(site) {
  const s = findSectionInSite(site, ["hero", "hero_statement", "hero_story", "hero_social_proof"]);
  return {
    headline:   s?.data?.headline   || site.business_name,
    subheadline: s?.data?.subheadline || "",
    badge:      s?.data?.badge      || null,
  };
}

const WA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.126 1.535 5.857L.057 23.716a.5.5 0 00.641.592l5.945-1.561A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.96 9.96 0 01-5.1-1.395l-.37-.218-3.797.996 1.012-3.698-.24-.381A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>`;

// ── FOOD TEMPLATE ENGINE ──────────────────────────────────────────────────────

function buildFoodHTML(site, cfg) {
  const wa       = waLink(site.phone, site.business_name);
  const location = [site.neighborhood, site.city].filter(Boolean).join(", ");
  const menuData = getMenuDataFromSite(site);
  const heroContent = getHeroContent(site);
  const testimonials = getTestimonialsFromSite(site);
  const placesData   = site.content?.placesData || null;
  const heroImg     = getFirstImage(site);
  const galleryImgs = getAllImages(site, 8);
  // Duplicate images so carousel/strip always has enough frames
  const heroSlides  = galleryImgs.length
    ? (galleryImgs.length < 3 ? [...galleryImgs, ...galleryImgs, ...galleryImgs] : galleryImgs).slice(0, 8)
    : [];
  const stripImgs   = galleryImgs.length
    ? [...galleryImgs, ...galleryImgs, ...galleryImgs].slice(0, 18)
    : [];
  const logoImg  = (site.images || []).find(i => i.type === "logo");
  const siteId   = site.id || "";
  const ratingBadge = placesData?.rating
    ? `⭐ ${placesData.rating.toFixed(1)} · ${placesData.totalRatings?.toLocaleString("pt-BR") || ""} avaliações`
    : "";
  const isDark = cfg.bg.startsWith("#0") || cfg.bg.startsWith("#1");
  const apiBase = process.env.API_BASE_URL || "https://api.forgesites.app";

  // Build menu HTML
  const menuHtml = buildFoodMenu(menuData, cfg, wa);
  // Build category tabs for sticky nav
  const menuCats = menuData.categories?.categories || [];
  const featCats = menuData.featured?.featured_items?.length ? [{ name: cfg.menuLabel }] : [];
  const allCatTabs = [...featCats, ...menuCats].map((c, i) =>
    `<button class="ftab-btn${i === 0 ? " active" : ""}" data-cat="${i}" onclick="FoodTabs.go(${i})">${c.name}</button>`
  ).join("");

  const highlightItems = (menuData.highlight?.items || []).map(item =>
    `<div class="fhl-item"><span>${item.icon || "✦"}</span><span>${item.text}</span></div>`
  ).join("");

  // Location/hours
  const locData = menuData.location || (placesData?.hours ? { hours: placesData.hours, address: site.address, city: site.city } : null);
  const hoursHtml = locData?.hours ? Object.entries(locData.hours).map(([k, v]) => {
    const labels = { weekdays: "Seg–Sex", saturday: "Sábado", sunday: "Domingo" };
    return `<div class="floc-row"><span>${labels[k] || k}</span><span>${v}</span></div>`;
  }).join("") : "";

  // Testimonials
  const testiHtml = testimonials.slice(0, 3).map(t => {
    const nome = t.name || t.nome || "Cliente";
    const text = t.text || t.texto || t.quote || "";
    return `<div class="ftesti-card">
  <div class="ftesti-quote">"</div>
  <p class="ftesti-text">${text}</p>
  <div class="ftesti-author">
    <div class="ftesti-avatar">${nome.charAt(0).toUpperCase()}</div>
    <div><div class="ftesti-name">${nome}</div><div class="ftesti-stars">★★★★★</div></div>
  </div>
</div>`;
  }).join("");

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
<link rel="stylesheet" href="${cfg.googleFonts}">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js" defer></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:${cfg.bg};--surface:${cfg.surface};--surface2:${cfg.surface2};
  --p:${cfg.primary};--ph:${cfg.primaryHover};--acc:${cfg.accent};--acc-fg:${cfg.accentFg};
  --txt:${cfg.text};--muted:${cfg.muted};--bdr:${cfg.border};
  --wa:#25D366;--wad:#128C7E;
  --r:14px;--r2:20px;
  --sh:0 4px 24px rgba(0,0,0,.35);--shl:0 16px 64px rgba(0,0,0,.55);
  --font-h:${cfg.font};--font-b:${cfg.bodyFont}
}
html{scroll-behavior:smooth}
body{font-family:var(--font-b);color:var(--txt);background:var(--bg);-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3,h4{font-family:var(--font-h)}
img{display:block;max-width:100%;object-fit:cover}
a{color:inherit;text-decoration:none}
.wrap{max-width:1200px;margin:0 auto;padding:0 24px}

/* ── Scrollbar ── */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--p);border-radius:3px}

/* ── Nav ── */
.fnav{position:fixed;top:0;left:0;right:0;z-index:400;height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:rgba(${isDark?"12,12,12":"255,251,240"},.94);backdrop-filter:blur(20px) saturate(180%);border-bottom:1px solid var(--bdr);transition:box-shadow .3s}
.fnav-brand{display:flex;align-items:center;gap:10px;font-family:var(--font-h);font-size:22px;font-weight:800;color:var(--txt);letter-spacing:.03em}
.fnav-logo{height:40px;width:auto;border-radius:8px}
.fnav-actions{display:flex;align-items:center;gap:10px}
.fnav-cart-btn{position:relative;width:46px;height:46px;border-radius:50%;background:var(--surface2);border:1.5px solid var(--bdr);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--txt);transition:background .2s,border-color .2s}
.fnav-cart-btn:hover{background:var(--p);border-color:var(--p);color:#fff}
.fnav-cart-count{position:absolute;top:-3px;right:-3px;width:18px;height:18px;background:var(--p);color:#fff;border-radius:50%;font-size:10px;font-weight:800;display:none;align-items:center;justify-content:center;font-family:var(--font-b)}
.fnav-cart-count.show{display:flex}
.btn-order{display:inline-flex;align-items:center;gap:8px;background:var(--p);color:#fff;font-family:var(--font-b);font-size:13px;font-weight:700;padding:11px 22px;border-radius:10px;border:none;cursor:pointer;transition:background .15s,transform .15s;white-space:nowrap}
.btn-order:hover{background:var(--ph);transform:translateY(-1px)}
.btn-wa-small{background:var(--wa);color:#fff}
.btn-wa-small:hover{background:var(--wad)}
.fham{display:none;background:none;border:none;cursor:pointer;padding:8px;color:var(--txt)}
.fham span{display:block;width:22px;height:2px;background:currentColor;margin:5px 0;transition:transform .2s}
.fmob{display:none;position:fixed;top:68px;left:0;right:0;background:var(--surface);border-bottom:1px solid var(--bdr);z-index:399;padding:16px 24px;flex-direction:column;gap:6px}
.fmob.open{display:flex}
.fmob-link{font-size:15px;font-weight:600;color:var(--txt);padding:10px 14px;border-radius:10px;transition:background .15s}
.fmob-link:hover{background:var(--surface2)}
@media(max-width:768px){.fnav-links{display:none}.fham{display:block}.btn-order.hide-mob{display:none}}

/* ── Hero ── */
.fhero{position:relative;min-height:100vh;display:flex;align-items:center;overflow:hidden;background:var(--bg)}
/* Hero carousel — fullscreen crossfading slides with Ken Burns */
.fhero-slides{position:absolute;inset:0;z-index:0}
.fhero-slide{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity 1.8s ease;will-change:transform,opacity}
.fhero-slide.active{opacity:.52;animation:f-kb 12s ease-in-out infinite}
@keyframes f-kb{0%{transform:scale(1) translate(0,0)}33%{transform:scale(1.07) translate(-.8%,.5%)}66%{transform:scale(1.04) translate(.6%,-.4%)}100%{transform:scale(1) translate(0,0)}}
/* Fallback single image */
.fhero-img-bg{position:absolute;inset:0;z-index:0}
.fhero-img-bg img{width:100%;height:100%;object-fit:cover;opacity:.48;animation:f-kb 14s ease-in-out infinite}
.fhero-grad{position:absolute;inset:0;background:${cfg.gradHero};z-index:1}
/* Extra vignette for depth */
.fhero-vignette{position:absolute;inset:0;z-index:1;background:radial-gradient(ellipse 120% 100% at 30% 50%,transparent 35%,rgba(0,0,0,.65) 100%)}
.fhero-inner{position:relative;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;max-width:1200px;margin:0 auto;padding:140px 48px 100px;width:100%}
.fhero-text{}
.fhero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:100px;padding:7px 18px;font-size:12px;font-weight:700;color:#fff;margin-bottom:24px;backdrop-filter:blur(8px);letter-spacing:.06em;text-transform:uppercase}
.fhero-badge span:first-child{font-size:18px}
.fhero-h1{font-size:clamp(54px,9vw,120px);line-height:.92;letter-spacing:-.01em;color:#fff;margin-bottom:20px;text-transform:uppercase;overflow:hidden}
.fhero-sub{font-size:17px;color:rgba(255,255,255,.7);max-width:460px;line-height:1.7;margin-bottom:36px}
.fhero-btns{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:44px}
.btn-hero-main{display:inline-flex;align-items:center;gap:10px;background:var(--p);color:#fff;font-family:var(--font-b);font-size:16px;font-weight:800;padding:18px 36px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;box-shadow:0 8px 32px rgba(0,0,0,.35),0 0 0 0 var(--p);text-decoration:none}
.btn-hero-main:hover{background:var(--ph);transform:translateY(-3px);box-shadow:0 16px 48px rgba(0,0,0,.45)}
.btn-hero-ghost{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);color:#fff;border:1.5px solid rgba(255,255,255,.3);font-family:var(--font-b);font-size:15px;font-weight:700;padding:16px 28px;border-radius:12px;backdrop-filter:blur(8px);transition:background .2s;text-decoration:none}
.btn-hero-ghost:hover{background:rgba(255,255,255,.2)}
.fhero-meta{display:flex;gap:20px;flex-wrap:wrap}
.fhero-meta-item{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:rgba(255,255,255,.65)}
.fhero-meta-item span:first-child{font-size:17px}
.fhero-visual{position:relative;display:flex;align-items:center;justify-content:center;min-height:480px}
.fhero-glow{position:absolute;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,${cfg.glowColor} 0%,transparent 70%);pointer-events:none;animation:f-glow 4.5s ease-in-out infinite}
.fhero-circle{position:relative;z-index:1;width:440px;height:440px;border-radius:50%;overflow:hidden;box-shadow:0 0 100px ${cfg.glowColor},0 60px 120px rgba(0,0,0,.8);animation:f-float 5.5s ease-in-out infinite;border:3px solid rgba(255,255,255,.06)}
.fhero-circle img{width:100%;height:100%;object-fit:cover}
.fhero-ring{position:absolute;inset:-20px;border-radius:50%;border:1.5px solid ${cfg.glowColor};animation:f-ring 3.5s ease-in-out infinite;z-index:2}
.fhero-ring2{position:absolute;inset:-44px;border-radius:50%;border:1px solid ${cfg.glowColor.replace(".35", ".15")};animation:f-ring 3.5s ease-in-out infinite .9s;z-index:2}
.fhero-emoji{font-size:140px;animation:f-float 5.5s ease-in-out infinite;filter:drop-shadow(0 30px 60px rgba(0,0,0,.7))}
@keyframes f-float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-22px) rotate(2deg)}}
@keyframes f-glow{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.15);opacity:1}}
@keyframes f-ring{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.85;transform:scale(1.06)}}
@media(max-width:960px){.fhero-inner{grid-template-columns:1fr;padding:110px 28px 72px;text-align:center}.fhero-sub{margin-left:auto;margin-right:auto}.fhero-btns,.fhero-meta{justify-content:center}.fhero-visual{display:none}}
@media(max-width:480px){.fhero-h1{font-size:clamp(44px,13vw,80px)}.fhero-btns{flex-direction:column;align-items:stretch}.btn-hero-main,.btn-hero-ghost{justify-content:center}.fhero-inner{padding:100px 16px 60px}}

/* ── Highlights bar ── */
.fhl{background:var(--p);padding:14px 24px;overflow-x:auto}
.fhl-inner{display:flex;gap:32px;justify-content:center;min-width:max-content;margin:0 auto}
.fhl-item{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:700;color:#fff;white-space:nowrap}
.fhl-item span:first-child{font-size:20px}

/* ── Rating bar ── */
.frating-bar{background:var(--surface);border-bottom:1px solid var(--bdr);padding:14px 24px;text-align:center}
.frating-bar p{font-size:13px;font-weight:700;color:var(--muted);letter-spacing:.02em}
.frating-bar span{color:var(--acc)}

/* ── Menu tabs (sticky) ── */
.fmenu{background:var(--bg);padding-top:0}
.ftabs-sticky{position:sticky;top:68px;z-index:300;background:var(--surface);border-bottom:1px solid var(--bdr);padding:0 24px}
.ftabs-wrap{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:10px 0;max-width:1200px;margin:0 auto}
.ftabs-wrap::-webkit-scrollbar{display:none}
.ftab-btn{flex-shrink:0;padding:9px 22px;border-radius:100px;background:transparent;border:1.5px solid var(--bdr);font-family:var(--font-b);font-size:13px;font-weight:700;color:var(--muted);cursor:pointer;transition:all .18s;white-space:nowrap}
.ftab-btn.active,.ftab-btn:hover{background:var(--p);color:#fff;border-color:var(--p)}

/* ── Menu sections ── */
.fmenu-body{max-width:1200px;margin:0 auto;padding:0 24px 80px}
.fmenu-section{padding-top:56px}
.fmenu-section-title{font-size:clamp(28px,4vw,40px);font-weight:900;color:var(--txt);margin-bottom:8px;text-transform:uppercase;letter-spacing:.02em}
.fmenu-section-sub{font-size:15px;color:var(--muted);margin-bottom:36px;max-width:600px}

/* ── Featured cards (vertical) ── */
.ffeat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;margin-bottom:60px}
.ffeat-card{background:var(--surface);border:1px solid var(--bdr);border-radius:var(--r2);overflow:hidden;transition:transform .25s cubic-bezier(.2,1,.3,1),box-shadow .25s;cursor:pointer}
.ffeat-card:hover{transform:translateY(-6px);box-shadow:0 24px 72px rgba(0,0,0,.5),0 0 0 1.5px var(--p)}
.ffeat-img-wrap{position:relative;height:220px;overflow:hidden}
.ffeat-img{width:100%;height:100%;transition:transform .5s cubic-bezier(.2,1,.3,1)}
.ffeat-card:hover .ffeat-img{transform:scale(1.08)}
.ffeat-no-img{height:220px;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:64px}
.ffeat-badge{position:absolute;top:12px;left:12px;background:var(--p);color:#fff;font-size:10px;font-weight:800;padding:4px 12px;border-radius:100px;letter-spacing:.06em;text-transform:uppercase}
.ffeat-body{padding:20px}
.ffeat-name{font-size:17px;font-weight:800;margin-bottom:6px;color:var(--txt)}
.ffeat-desc{font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:16px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ffeat-footer{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ffeat-price{font-size:20px;font-weight:900;color:var(--p);font-family:var(--font-h)}
.fadd-btn{width:40px;height:40px;border-radius:50%;background:var(--p);color:#fff;border:none;font-size:22px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,transform .15s;flex-shrink:0}
.fadd-btn:hover{background:var(--ph);transform:scale(1.1)}
.fadd-btn:active{transform:scale(.92)}

/* ── Menu item cards (horizontal) ── */
.fitem-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;margin-bottom:48px}
.fitem-card{display:flex;background:var(--surface);border:1px solid var(--bdr);border-radius:var(--r);overflow:hidden;transition:box-shadow .2s,border-color .2s;align-items:stretch}
.fitem-card:hover{box-shadow:var(--sh);border-color:rgba(255,255,255,.12)}
.fitem-img-wrap{flex-shrink:0;width:100px;position:relative;overflow:hidden}
.fitem-img{width:100%;height:100%;transition:transform .4s}
.fitem-card:hover .fitem-img{transform:scale(1.08)}
.fitem-no-img{width:100px;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:32px}
.fitem-body{flex:1;padding:14px 16px;display:flex;flex-direction:column;justify-content:space-between;min-width:0}
.fitem-name{font-size:15px;font-weight:700;margin-bottom:4px;color:var(--txt);line-height:1.3}
.fitem-desc{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px;flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.fitem-footer{display:flex;align-items:center;justify-content:space-between;gap:8px}
.fitem-price{font-size:16px;font-weight:900;color:var(--p)}
.fitem-badge{font-size:10px;font-weight:700;padding:3px 8px;border-radius:100px;background:var(--acc);color:var(--acc-fg);white-space:nowrap}
.fitem-add{width:32px;height:32px;border-radius:50%;background:var(--p);color:#fff;border:none;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,transform .15s;flex-shrink:0}
.fitem-add:hover{background:var(--ph);transform:scale(1.1)}
.fitem-add:active{transform:scale(.9)}
@media(max-width:600px){.fitem-grid{grid-template-columns:1fr}.fitem-card{flex-direction:column}.fitem-img-wrap{width:100%;height:160px}.fitem-no-img{width:100%;height:120px}}

/* ── Cart float btn ── */
.fcart-float{position:fixed;bottom:28px;left:28px;z-index:500;width:66px;height:66px;border-radius:50%;background:var(--p);color:#fff;border:none;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 4px 32px rgba(0,0,0,.4);transition:transform .2s}
.fcart-float.show{display:flex}
.fcart-float:hover{transform:scale(1.1)}
.fcart-float svg{width:26px;height:26px}
.fcart-float-count{position:absolute;top:-4px;right:-4px;width:22px;height:22px;background:var(--acc);color:var(--acc-fg);border-radius:50%;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center}

/* ── Cart drawer ── */
.fcart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:598;opacity:0;pointer-events:none;transition:opacity .3s;backdrop-filter:blur(4px)}
.fcart-overlay.open{opacity:1;pointer-events:auto}
.fcart-drawer{position:fixed;top:0;right:-460px;width:min(460px,100vw);height:100dvh;background:var(--surface);z-index:599;box-shadow:-8px 0 60px rgba(0,0,0,.6);transition:right .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;border-left:1px solid var(--bdr)}
.fcart-drawer.open{right:0}
.fcart-hdr{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--bdr);flex-shrink:0}
.fcart-hdr h3{font-family:var(--font-h);font-size:22px;font-weight:900;color:var(--txt);letter-spacing:.04em}
.fcart-close{background:none;border:none;font-size:24px;cursor:pointer;color:var(--muted);padding:4px;line-height:1;transition:color .15s}
.fcart-close:hover{color:var(--txt)}
.fcart-items{flex:1;overflow-y:auto;padding:16px 24px}
.fcart-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;color:var(--muted);gap:12px;font-size:14px;font-weight:600}
.fcart-empty span{font-size:48px}
.fcart-item-row{display:flex;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid var(--bdr)}
.fcart-item-img{width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0;background:var(--surface2)}
.fcart-item-info{flex:1;min-width:0}
.fcart-item-name{font-size:14px;font-weight:700;color:var(--txt);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fcart-item-price{font-size:13px;color:var(--muted)}
.fcart-qty{display:flex;align-items:center;gap:10px;flex-shrink:0}
.fqty-btn{width:30px;height:30px;border-radius:50%;border:1.5px solid var(--bdr);background:var(--surface2);font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--txt);transition:background .15s,border-color .15s}
.fqty-btn:hover{background:var(--p);border-color:var(--p);color:#fff}
.fqty-val{font-size:14px;font-weight:800;min-width:22px;text-align:center;color:var(--txt)}

/* ── Cart delivery ── */
.fcart-delivery{padding:16px 24px;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);flex-shrink:0}
.fcart-delivery-label{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
.fdelivery-toggle{display:flex;gap:6px;margin-bottom:14px}
.fdtype-btn{flex:1;padding:9px;border-radius:10px;border:2px solid var(--bdr);background:var(--surface2);font-family:var(--font-b);font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;color:var(--muted)}
.fdtype-btn.active{background:var(--p);color:#fff;border-color:var(--p)}
.fcep-wrap{display:flex;gap:8px;margin-bottom:8px}
.fcep-input{flex:1;padding:10px 14px;border:1.5px solid var(--bdr);border-radius:10px;font-size:14px;font-family:var(--font-b);background:var(--surface2);color:var(--txt);outline:none;transition:border-color .15s}
.fcep-input:focus{border-color:var(--p)}
.fcep-input::placeholder{color:var(--muted)}
.fcep-btn{padding:10px 16px;border-radius:10px;background:var(--p);color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:background .15s;white-space:nowrap}
.fcep-btn:disabled{opacity:.5;cursor:default}
.fcep-addr{font-size:13px;color:var(--muted);min-height:18px;margin-bottom:6px;line-height:1.5}
.ffee-row{display:flex;justify-content:space-between;font-size:13px;font-weight:700;padding:6px 0;color:var(--txt)}

/* ── Cart footer ── */
.fcart-footer{padding:18px 24px;border-top:1px solid var(--bdr);flex-shrink:0}
.fcart-total-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.fcart-total-label{font-size:13px;font-weight:600;color:var(--muted)}
.fcart-total-val{font-family:var(--font-h);font-size:28px;font-weight:900;color:var(--txt)}
.fcart-action-btns{display:flex;flex-direction:column;gap:8px}
.fcart-stripe-btn{width:100%;padding:16px;background:var(--p);color:#fff;border:none;border-radius:12px;font-family:var(--font-b);font-size:15px;font-weight:800;cursor:pointer;transition:background .15s,transform .15s;display:flex;align-items:center;justify-content:center;gap:10px}
.fcart-stripe-btn:hover{background:var(--ph);transform:scale(1.01)}
.fcart-stripe-btn:disabled{opacity:.45;cursor:default;transform:none}
.fcart-wa-btn{width:100%;padding:14px;background:var(--wa);color:#fff;border:none;border-radius:12px;font-family:var(--font-b);font-size:14px;font-weight:700;cursor:pointer;transition:background .15s;display:flex;align-items:center;justify-content:center;gap:8px}
.fcart-wa-btn:hover{background:var(--wad)}
.fcart-wa-btn:disabled{opacity:.45;cursor:default}

/* ── Reviews ── */
.freviews{background:var(--surface);padding:80px 24px}
.freviews-wrap{max-width:1200px;margin:0 auto}
.fsec-label{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--p);margin-bottom:14px;display:flex;align-items:center;gap:10px}
.fsec-label::before{content:"";width:28px;height:2px;background:var(--p)}
.fsec-title{font-family:var(--font-h);font-size:clamp(32px,5vw,56px);color:var(--txt);margin-bottom:48px;text-transform:uppercase;line-height:1}
.ftesti-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
.ftesti-card{background:var(--surface2);border:1px solid var(--bdr);border-radius:var(--r2);padding:32px 28px;position:relative;overflow:hidden}
.ftesti-quote{position:absolute;top:8px;left:18px;font-size:80px;line-height:1;font-family:Georgia,serif;color:var(--bdr);pointer-events:none}
.ftesti-text{font-size:15px;line-height:1.8;color:var(--txt);padding-top:40px;margin-bottom:22px}
.ftesti-author{display:flex;align-items:center;gap:12px}
.ftesti-avatar{width:44px;height:44px;border-radius:50%;background:var(--p);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;flex-shrink:0}
.ftesti-name{font-size:14px;font-weight:800;color:var(--txt)}
.ftesti-stars{font-size:13px;color:var(--acc);margin-top:2px}
.ftesti-google{margin-top:40px;display:flex;align-items:center;justify-content:center;gap:20px;padding-top:28px;border-top:1px solid var(--bdr)}
.ftesti-google-rating{text-align:center}
.ftesti-google-num{font-family:var(--font-h);font-size:52px;color:var(--txt);line-height:1}
.ftesti-google-stars{font-size:20px;color:var(--acc);letter-spacing:2px;margin:6px 0}
.ftesti-google-label{font-size:12px;color:var(--muted);font-weight:600}

/* ── Location ── */
.floc{background:var(--bg);padding:80px 24px}
.floc-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
.floc-map{background:var(--surface);border-radius:var(--r2);height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;border:1px solid var(--bdr);overflow:hidden;position:relative}
.floc-map::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,var(--surface) 0%,var(--surface2) 100%)}
.floc-map span{font-size:56px;position:relative;z-index:1}
.floc-map p{font-size:14px;color:var(--muted);font-weight:600;text-align:center;position:relative;z-index:1;max-width:220px;line-height:1.6}
.floc-info{display:flex;flex-direction:column;gap:24px}
.floc-row{display:flex;gap:14px;align-items:flex-start;padding:18px 20px;background:var(--surface);border:1px solid var(--bdr);border-radius:var(--r);transition:border-color .2s}
.floc-row:hover{border-color:rgba(255,255,255,.15)}
.floc-icon{font-size:20px;flex-shrink:0;margin-top:2px}
.floc-text{font-size:14px;color:var(--muted);line-height:1.6}
.floc-text strong{display:block;font-size:13px;font-weight:800;color:var(--txt);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em}
.floc-hours{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.floc-row-hour{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--bdr)}
.floc-row-hour:last-child{border:none}
.floc-row-hour span:first-child{font-weight:700;color:var(--txt)}
@media(max-width:768px){.floc-inner{grid-template-columns:1fr}}

/* ── CTA Section ── */
.fcta{background:var(--p);padding:80px 24px;text-align:center;position:relative;overflow:hidden}
.fcta::before{content:"";position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='1' fill='%23fff' fill-opacity='.04'/%3E%3C/svg%3E")}
.fcta h2{font-size:clamp(36px,6vw,72px);color:#fff;text-transform:uppercase;margin-bottom:16px;position:relative}
.fcta p{font-size:18px;color:rgba(255,255,255,.8);max-width:520px;margin:0 auto 40px;position:relative}
.fcta-btns{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;position:relative}
.btn-cta-wa{display:inline-flex;align-items:center;gap:10px;background:#fff;color:var(--p);font-family:var(--font-b);font-size:16px;font-weight:800;padding:18px 40px;border-radius:12px;transition:transform .2s,box-shadow .2s}
.btn-cta-wa:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,.3)}
@media(max-width:480px){.fcta-btns{flex-direction:column;align-items:stretch}}

/* ── Footer ── */
.ffooter{background:#050505;padding:40px 24px;border-top:1px solid var(--bdr)}
.ffooter-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px}
.ffooter-brand{font-family:var(--font-h);font-size:20px;font-weight:900;color:var(--txt)}
.ffooter-info{font-size:13px;color:var(--muted);line-height:1.7}
.ffooter-wa{display:flex;align-items:center;gap:8px;color:var(--wa);font-size:13px;font-weight:700}
.ffooter-credit{font-size:11px;color:rgba(255,255,255,.2);margin-top:8px}

/* ── Floating WA button ── */
.fwa-float{position:fixed;bottom:28px;right:28px;z-index:500;width:62px;height:62px;border-radius:50%;background:var(--wa);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 32px rgba(37,211,102,.55);animation:wa-pulse 2.8s ease-in-out infinite;transition:transform .2s}
.fwa-float:hover{transform:scale(1.1)}
@keyframes wa-pulse{0%,100%{box-shadow:0 4px 32px rgba(37,211,102,.5)}50%{box-shadow:0 4px 52px rgba(37,211,102,.85)}}

/* ── Infinite photo strip ── */
.fstrip{overflow:hidden;background:var(--surface);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);padding:0;height:220px;position:relative}
.fstrip::before,.fstrip::after{content:"";position:absolute;top:0;bottom:0;width:120px;z-index:2;pointer-events:none}
.fstrip::before{left:0;background:linear-gradient(to right,var(--surface),transparent)}
.fstrip::after{right:0;background:linear-gradient(to left,var(--surface),transparent)}
.fstrip-track{display:flex;gap:10px;width:max-content;animation:fstrip-scroll 40s linear infinite;padding:10px 5px}
.fstrip-track:hover{animation-play-state:paused}
.fstrip-img{width:300px;height:200px;object-fit:cover;border-radius:12px;flex-shrink:0;transition:transform .4s,filter .4s;filter:brightness(.88) saturate(1.1)}
.fstrip-img:hover{transform:scale(1.04);filter:brightness(1) saturate(1.3)}
@keyframes fstrip-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
/* Pause on reduced motion */
@media(prefers-reduced-motion:reduce){.fstrip-track{animation:none}.fhero-slide.active{animation:none}}

/* ── Nav scroll shadow ── */
.fnav.scrolled{box-shadow:0 4px 32px rgba(0,0,0,.45)}

/* ── SR animations ── */
.sr-up{opacity:0;transform:translateY(32px)}
.sr-fade{opacity:0}

/* ── Order success/cancel banners ── */
.forder-banner{display:none;position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:700;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:700;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,.4);backdrop-filter:blur(10px)}
.forder-banner.success{background:#059669;display:block}
.forder-banner.error{background:#DC2626;display:block}
</style>
</head>
<body>

<!-- Nav -->
<nav class="fnav">
  <a class="fnav-brand" href="#inicio">
    ${logoImg ? `<img src="${logoImg.public_url || logoImg.url}" alt="${site.business_name}" class="fnav-logo">` : ""}
    ${site.business_name}
  </a>
  <div class="fnav-links" style="display:flex;gap:4px">
    <a class="fmob-link" href="#inicio" style="font-size:13px;font-weight:600;color:var(--muted);padding:7px 14px;border-radius:8px">Início</a>
    ${allCatTabs.length ? `<a class="fmob-link" href="#cardapio" style="font-size:13px;font-weight:600;color:var(--muted);padding:7px 14px;border-radius:8px">${cfg.menuLabel}</a>` : ""}
    <a class="fmob-link" href="#contato" style="font-size:13px;font-weight:600;color:var(--muted);padding:7px 14px;border-radius:8px">Contato</a>
  </div>
  <div class="fnav-actions">
    <button class="fham" id="fham" aria-label="Menu"><span></span><span></span><span></span></button>
    <button class="fnav-cart-btn" id="fnav-cart" onclick="FCart.open()" aria-label="Carrinho">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <span class="fnav-cart-count" id="fnav-cart-count">0</span>
    </button>
    <a class="btn-order btn-wa-small hide-mob" href="${wa}" target="_blank" rel="noopener">${WA_SVG} WhatsApp</a>
  </div>
</nav>
<div class="fmob" id="fmob">
  <a class="fmob-link" href="#inicio" onclick="document.getElementById('fmob').classList.remove('open')">Início</a>
  ${allCatTabs.length ? `<a class="fmob-link" href="#cardapio" onclick="document.getElementById('fmob').classList.remove('open')">${cfg.menuLabel}</a>` : ""}
  <a class="fmob-link" href="#contato" onclick="document.getElementById('fmob').classList.remove('open')">Contato</a>
  <a class="fmob-link" href="${wa}" target="_blank" rel="noopener">${WA_SVG} WhatsApp</a>
</div>

<!-- Hero -->
<section class="fhero" id="inicio">
  ${heroSlides.length > 1
    ? `<div class="fhero-slides" id="fhero-slides">${heroSlides.map((url, i) => `<div class="fhero-slide${i===0?" active":""}" style="background-image:url('${url}')"></div>`).join("")}</div>`
    : heroImg
      ? `<div class="fhero-img-bg"><img src="${heroImg}" alt="${site.business_name}" loading="eager"></div>`
      : ""}
  <div class="fhero-grad"></div>
  <div class="fhero-vignette"></div>
  <div class="fhero-inner">
    <div class="fhero-text">
      <div class="fhero-badge"><span>${cfg.emoji}</span><span>${site.niche}${location ? ` · ${location}` : ""}${ratingBadge ? ` · ${ratingBadge}` : ""}</span></div>
      <h1 class="fhero-h1" data-split-words>${heroContent.headline}</h1>
      ${cfg.heroTagline ? `<p class="fhero-sub" style="font-style:italic;font-weight:600">${cfg.heroTagline}</p>` : ""}
      ${heroContent.subheadline ? `<p class="fhero-sub">${heroContent.subheadline}</p>` : ""}
      <div class="fhero-btns">
        <a class="btn-hero-main" href="#cardapio">${cfg.emoji} ${cfg.menuLabel}</a>
        <a class="btn-hero-ghost" href="${wa}" target="_blank" rel="noopener">${WA_SVG} ${cfg.orderCta}</a>
      </div>
      <div class="fhero-meta">
        ${menuData.highlight?.items?.slice(0,3).map(item => `<div class="fhero-meta-item"><span>${item.icon || "✦"}</span><span>${item.text}</span></div>`).join("") || `<div class="fhero-meta-item"><span>🛵</span><span>${cfg.deliveryLabel} disponível</span></div>`}
      </div>
    </div>
    <div class="fhero-visual">
      <div class="fhero-glow"></div>
      ${heroImg
        ? `<div class="fhero-circle"><img src="${heroImg}" alt="${site.business_name}" loading="eager"></div>`
        : `<div class="fhero-emoji">${cfg.emoji}</div>`}
      ${heroImg ? `<div class="fhero-ring"></div><div class="fhero-ring2"></div>` : ""}
    </div>
  </div>
</section>

${highlightItems ? `<div class="fhl"><div class="fhl-inner">${highlightItems}</div></div>` : ""}

${ratingBadge ? `<div class="frating-bar"><p><span>⭐ ${placesData?.rating?.toFixed(1)}</span> no Google &nbsp;·&nbsp; ${placesData?.totalRatings?.toLocaleString("pt-BR")} avaliações &nbsp;·&nbsp; ${location}</p></div>` : location ? `<div class="frating-bar"><p>${location} · Peça já pelo WhatsApp</p></div>` : ""}

<!-- Photo Strip (infinite auto-scroll) -->
${stripImgs.length >= 4 ? `
<div class="fstrip">
  <div class="fstrip-track">
    ${stripImgs.map(url => `<img class="fstrip-img" src="${url}" alt="${site.business_name}" loading="lazy">`).join("")}
  </div>
</div>
` : ""}

<!-- Menu -->
${menuHtml ? `
<div id="cardapio">
  <div class="ftabs-sticky">
    <div class="ftabs-wrap" id="ftabs-wrap">${allCatTabs}</div>
  </div>
  <div class="fmenu-body" id="fmenu-body">
    ${menuHtml}
  </div>
</div>
` : ""}

<!-- Reviews -->
${testiHtml ? `
<section class="freviews" id="depoimentos">
  <div class="freviews-wrap">
    <div class="fsec-label">Depoimentos</div>
    <h2 class="fsec-title sr-fade">O Que Nossos Clientes Dizem</h2>
    <div class="ftesti-grid">${testiHtml}</div>
    ${placesData?.rating ? `<div class="ftesti-google sr-up">
      <div class="ftesti-google-rating">
        <div class="ftesti-google-num">${placesData.rating.toFixed(1)}</div>
        <div class="ftesti-google-stars">★★★★★</div>
        <div class="ftesti-google-label">${placesData.totalRatings?.toLocaleString("pt-BR") || ""} avaliações no Google</div>
      </div>
    </div>` : ""}
  </div>
</section>
` : ""}

<!-- Location -->
${locData ? `
<section class="floc" id="localizacao">
  <div class="floc-inner">
    <div>
      <div class="fsec-label">Onde Estamos</div>
      <h2 class="fsec-title sr-fade">Localização e Horários</h2>
    </div>
    <div class="floc-map">
      <span>📍</span>
      <p>${locData.address || site.address || ""}${locData.city || site.city ? `<br>${locData.city || site.city}` : ""}</p>
      ${wa ? `<a href="${wa}" target="_blank" rel="noopener" style="position:relative;z-index:1;padding:8px 20px;background:var(--p);color:#fff;border-radius:8px;font-size:13px;font-weight:700;margin-top:8px">Falar no WhatsApp</a>` : ""}
    </div>
    <div class="floc-info sr-up">
      ${locData.address ? `<div class="floc-row"><span class="floc-icon">📍</span><div class="floc-text"><strong>Endereço</strong>${locData.address}</div></div>` : ""}
      ${hoursHtml ? `<div class="floc-row"><span class="floc-icon">🕐</span><div class="floc-text"><strong>Horários</strong><div class="floc-hours">${hoursHtml}</div></div></div>` : ""}
      ${site.phone ? `<div class="floc-row"><span class="floc-icon">📱</span><div class="floc-text"><strong>Contato</strong><a href="${wa}" target="_blank" rel="noopener" style="color:var(--wa);font-weight:700">${site.phone}</a></div></div>` : ""}
    </div>
  </div>
</section>
` : ""}

<!-- CTA -->
<section class="fcta" id="contato">
  <div class="wrap">
    <h2 class="sr-up">Pronto Para Pedir?</h2>
    <p class="sr-up">Peça agora e receba no conforto da sua casa${location ? ` em ${location}` : ""}.</p>
    <div class="fcta-btns sr-up">
      <a class="btn-cta-wa" href="${wa}" target="_blank" rel="noopener">${WA_SVG} Pedir pelo WhatsApp</a>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="ffooter">
  <div class="ffooter-inner">
    <div>
      <div class="ffooter-brand">${site.business_name}</div>
      <div class="ffooter-info">${site.niche}${location ? ` · ${location}` : ""}</div>
    </div>
    ${site.phone ? `<a class="ffooter-wa" href="${wa}" target="_blank" rel="noopener">${WA_SVG} ${site.phone}</a>` : ""}
  </div>
</footer>

<!-- Floating WA -->
<a class="fwa-float" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${WA_SVG}</a>

<!-- Cart float button -->
<button class="fcart-float" id="fcart-float" onclick="FCart.open()" aria-label="Carrinho">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
  <span class="fcart-float-count" id="fcart-float-count">0</span>
</button>

<!-- Cart drawer -->
<div class="fcart-overlay" id="fcart-overlay" onclick="FCart.close()"></div>
<div class="fcart-drawer" id="fcart-drawer">
  <div class="fcart-hdr">
    <h3>🛒 Meu Pedido</h3>
    <button class="fcart-close" onclick="FCart.close()">✕</button>
  </div>
  <div class="fcart-items" id="fcart-items">
    <div class="fcart-empty"><span>🛒</span>Seu carrinho está vazio.<br>Adicione itens do cardápio!</div>
  </div>
  <div class="fcart-delivery" id="fcart-delivery">
    <div class="fcart-delivery-label">Tipo de Entrega</div>
    <div class="fdelivery-toggle">
      <button class="fdtype-btn active" onclick="FCart.setType('retirada',this)">🏪 Retirar</button>
      <button class="fdtype-btn" onclick="FCart.setType('delivery',this)">🛵 Delivery</button>
    </div>
    <div id="fcep-section" style="display:none">
      <div class="fcep-wrap">
        <input class="fcep-input" id="fcep-input" type="text" placeholder="CEP 00000-000" maxlength="9" oninput="FCart.maskCep(this)">
        <button class="fcep-btn" id="fcep-btn" onclick="FCart.lookupCep()">Buscar</button>
      </div>
      <div class="fcep-addr" id="fcep-addr"></div>
      <div class="ffee-row" id="ffee-row" style="display:none">
        <span>Taxa de entrega</span>
        <span id="ffee-val">R$ 0,00</span>
      </div>
    </div>
  </div>
  <div class="fcart-footer">
    <div class="fcart-total-row">
      <span class="fcart-total-label">Total</span>
      <span class="fcart-total-val" id="fcart-total">R$ 0,00</span>
    </div>
    <div class="fcart-action-btns">
      <button class="fcart-stripe-btn" id="fcart-pay-btn" onclick="FCart.payStripe()" disabled>
        💳 Pagar no Site
      </button>
      <button class="fcart-wa-btn" id="fcart-wa-btn" onclick="FCart.sendWA()" disabled>
        ${WA_SVG} Pedir pelo WhatsApp
      </button>
    </div>
  </div>
</div>

<!-- Order feedback -->
<div class="forder-banner" id="forder-banner"></div>

<script>
// ── Site config ──────────────────────────────────────────────────────────────
var SITE_ID   = "${siteId}";
var WA_HREF   = "${wa}";
var API_BASE  = "${apiBase}";

// ── Hamburger nav ────────────────────────────────────────────────────────────
document.getElementById("fham").addEventListener("click", function() {
  document.getElementById("fmob").classList.toggle("open");
});

// ── Smooth scroll for anchors ────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", function(e) {
    const id = this.getAttribute("href").slice(1);
    const el = document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
});

// ── Menu tab navigation ──────────────────────────────────────────────────────
var FoodTabs = {
  go: function(idx) {
    document.querySelectorAll(".ftab-btn").forEach((b, i) => b.classList.toggle("active", i === idx));
    document.querySelectorAll(".fmenu-section").forEach((s, i) => {
      if (i === idx) { s.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
  }
};

// Scroll spy — keep tabs in sync with scroll position
(function() {
  var sections = document.querySelectorAll(".fmenu-section");
  if (!sections.length) return;
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var idx = parseInt(entry.target.dataset.catIdx || "0");
        document.querySelectorAll(".ftab-btn").forEach(function(b, i) {
          b.classList.toggle("active", i === idx);
        });
        // Scroll active tab into view
        var activeTab = document.querySelectorAll(".ftab-btn")[idx];
        if (activeTab) activeTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    });
  }, { threshold: 0.35, rootMargin: "-80px 0px -55% 0px" });
  sections.forEach(function(s) { obs.observe(s); });
})();

// ── Cart System ──────────────────────────────────────────────────────────────
var FCart = (function() {
  var items = [];
  var deliveryType = "retirada";
  var deliveryFee  = 0;
  var cepData      = null;

  function fmt(cents) {
    return "R$ " + (cents / 100).toFixed(2).replace(".", ",");
  }

  function subtotalCents() {
    return items.reduce(function(s, i) { return s + Math.round(parseFloat(i.price || 0) * 100) * i.qty; }, 0);
  }

  function totalCents() {
    return subtotalCents() + (deliveryType === "delivery" ? deliveryFee : 0);
  }

  function render() {
    var el = document.getElementById("fcart-items");
    if (!items.length) {
      el.innerHTML = '<div class="fcart-empty"><span>🛒</span>Seu carrinho está vazio.<br>Adicione itens do cardápio!</div>';
    } else {
      el.innerHTML = items.map(function(item, idx) {
        var price = parseFloat(item.price || 0);
        var lineTotal = price * item.qty;
        return '<div class="fcart-item-row">'
          + (item.img ? '<img class="fcart-item-img" src="' + item.img + '" alt="' + item.name + '">' : '<div class="fcart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:28px;background:var(--surface2)">' + (item.emoji || "🍽️") + '</div>')
          + '<div class="fcart-item-info">'
          + '<div class="fcart-item-name">' + item.name + '</div>'
          + '<div class="fcart-item-price">R$ ' + lineTotal.toFixed(2).replace(".", ",") + '</div>'
          + '</div>'
          + '<div class="fcart-qty">'
          + '<button class="fqty-btn" onclick="FCart.dec(' + idx + ')">−</button>'
          + '<span class="fqty-val">' + item.qty + '</span>'
          + '<button class="fqty-btn" onclick="FCart.inc(' + idx + ')">+</button>'
          + '</div>'
          + '</div>';
      }).join("");
    }

    var feeRow = document.getElementById("ffee-row");
    if (deliveryType === "delivery" && deliveryFee > 0) {
      feeRow.style.display = "flex";
      document.getElementById("ffee-val").textContent = fmt(deliveryFee);
    } else {
      feeRow.style.display = "none";
    }

    var total = totalCents();
    document.getElementById("fcart-total").textContent = fmt(total);

    var hasItems = items.length > 0;
    document.getElementById("fcart-pay-btn").disabled = !hasItems;
    document.getElementById("fcart-wa-btn").disabled  = !hasItems;

    // Update nav + float counts
    var count = items.reduce(function(s, i) { return s + i.qty; }, 0);
    ["fnav-cart-count", "fcart-float-count"].forEach(function(id) {
      var el2 = document.getElementById(id);
      if (el2) { el2.textContent = count; el2.classList.toggle("show", count > 0); }
    });
    var floatBtn = document.getElementById("fcart-float");
    if (floatBtn) floatBtn.classList.toggle("show", hasItems);

    // Save to localStorage
    try { localStorage.setItem("fcart_" + SITE_ID, JSON.stringify(items)); } catch(e) {}
  }

  function open() {
    document.getElementById("fcart-overlay").classList.add("open");
    document.getElementById("fcart-drawer").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    document.getElementById("fcart-overlay").classList.remove("open");
    document.getElementById("fcart-drawer").classList.remove("open");
    document.body.style.overflow = "";
  }

  function add(name, price, img, emoji) {
    var existing = items.find(function(i) { return i.name === name; });
    if (existing) { existing.qty += 1; }
    else { items.push({ name: name, price: price, img: img || null, emoji: emoji || "🍽️", qty: 1 }); }
    render();
    // Animate button feedback
    showBanner(name + " adicionado ao carrinho!", "success");
  }

  function inc(idx) { if (items[idx]) { items[idx].qty += 1; render(); } }
  function dec(idx) {
    if (!items[idx]) return;
    items[idx].qty -= 1;
    if (items[idx].qty <= 0) items.splice(idx, 1);
    render();
  }

  function setType(type, btn) {
    deliveryType = type;
    deliveryFee  = 0;
    document.querySelectorAll(".fdtype-btn").forEach(function(b) { b.classList.remove("active"); });
    btn.classList.add("active");
    var cepSection = document.getElementById("fcep-section");
    cepSection.style.display = type === "delivery" ? "block" : "none";
    document.getElementById("fcep-addr").textContent = "";
    document.getElementById("ffee-row").style.display = "none";
    render();
  }

  function maskCep(input) {
    var v = input.value.replace(/\\D/g, "").slice(0, 8);
    if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
    input.value = v;
  }

  async function lookupCep() {
    var cep = document.getElementById("fcep-input").value.replace(/\\D/g, "");
    if (cep.length !== 8) return;
    var btn = document.getElementById("fcep-btn");
    btn.disabled = true;
    btn.textContent = "...";
    try {
      var r = await fetch("https://viacep.com.br/ws/" + cep + "/json/");
      var data = await r.json();
      if (data.erro) {
        document.getElementById("fcep-addr").textContent = "CEP não encontrado";
      } else {
        cepData = data;
        document.getElementById("fcep-addr").textContent = data.logradouro + ", " + data.bairro + " — " + data.localidade + "/" + data.uf;
        // Calculate fee via our API
        try {
          var feeRes = await fetch(API_BASE + "/checkout/delivery-fee?buyerCep=" + cep + "&siteId=" + SITE_ID);
          if (feeRes.ok) {
            var feeData = await feeRes.json();
            deliveryFee = feeData.feeCents || 800;
          } else {
            deliveryFee = 800;
          }
        } catch(e) { deliveryFee = 800; }
        render();
      }
    } catch(e) {
      document.getElementById("fcep-addr").textContent = "Erro ao buscar CEP";
    }
    btn.disabled = false;
    btn.textContent = "Buscar";
  }

  function buildWaMessage() {
    var lines = ["🛒 *Novo Pedido — " + document.title + "*", ""];
    items.forEach(function(i) {
      lines.push("• " + i.qty + "x " + i.name + " — R$ " + (parseFloat(i.price) * i.qty).toFixed(2).replace(".", ","));
    });
    lines.push("");
    lines.push("*Subtotal:* R$ " + (subtotalCents() / 100).toFixed(2).replace(".", ","));
    if (deliveryType === "delivery") {
      lines.push("*Entrega:* " + (deliveryFee > 0 ? fmt(deliveryFee) : "a calcular"));
      if (cepData) lines.push("*CEP:* " + document.getElementById("fcep-input").value + " — " + cepData.logradouro + ", " + cepData.bairro + " — " + cepData.localidade + "/" + cepData.uf);
    } else {
      lines.push("*Retirada no local*");
    }
    lines.push("*Total:* R$ " + (totalCents() / 100).toFixed(2).replace(".", ","));
    return encodeURIComponent(lines.join("\\n"));
  }

  function sendWA() {
    if (!items.length) return;
    var url = WA_HREF.split("?")[0] + "?text=" + buildWaMessage();
    window.open(url, "_blank", "noopener");
  }

  async function payStripe() {
    if (!items.length) return;
    var btn = document.getElementById("fcart-pay-btn");
    btn.disabled = true;
    btn.textContent = "Aguarde...";
    try {
      var body = {
        siteId:     SITE_ID,
        items:      items.map(function(i) { return { name: i.name, price: i.price, qty: i.qty }; }),
        deliveryType: deliveryType,
        buyerCep:   deliveryType === "delivery" ? document.getElementById("fcep-input").value.replace(/\\D/g, "") : null,
        successUrl: window.location.href.split("?")[0] + "?order=success",
        cancelUrl:  window.location.href.split("?")[0] + "?order=cancel",
      };
      var r = await fetch(API_BASE + "/checkout/create-menu-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        var err = await r.json();
        throw new Error(err.message || "Erro ao processar pagamento");
      }
      var data = await r.json();
      window.location.href = data.url;
    } catch(e) {
      showBanner("Pagamento não disponível. Use o WhatsApp!", "error");
      btn.textContent = "💳 Pagar no Site";
      btn.disabled = false;
    }
  }

  function showBanner(msg, type) {
    var el = document.getElementById("forder-banner");
    el.textContent = msg;
    el.className = "forder-banner " + type;
    setTimeout(function() { el.className = "forder-banner"; }, 3500);
  }

  // Restore cart from localStorage
  try {
    var saved = localStorage.getItem("fcart_" + SITE_ID);
    if (saved) { items = JSON.parse(saved); render(); }
  } catch(e) {}

  // Check for order success/cancel URL param
  var urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("order") === "success") {
    showBanner("✅ Pedido confirmado! Você receberá uma confirmação em breve.", "success");
    try { localStorage.removeItem("fcart_" + SITE_ID); } catch(e) {}
    items = [];
    render();
  } else if (urlParams.get("order") === "cancel") {
    showBanner("Pagamento cancelado. Tente novamente ou use o WhatsApp.", "error");
  }

  return { open, close, add, inc, dec, setType, maskCep, lookupCep, sendWA, payStripe };
})();

// ── Nav scroll shadow ────────────────────────────────────────────────────────
(function() {
  var nav = document.querySelector(".fnav");
  if (!nav) return;
  window.addEventListener("scroll", function() {
    nav.classList.toggle("scrolled", window.scrollY > 30);
  }, { passive: true });
})();

// ── Hero image carousel ───────────────────────────────────────────────────────
(function() {
  var slides = document.querySelectorAll(".fhero-slide");
  if (slides.length <= 1) return;
  var cur = 0;
  function next() {
    slides[cur].classList.remove("active");
    cur = (cur + 1) % slides.length;
    slides[cur].classList.add("active");
  }
  setInterval(next, 5500);
})();

// ── GSAP Animations ──────────────────────────────────────────────────────────
window.addEventListener("load", function() {
  if (typeof gsap === "undefined") return;

  // Register ScrollTrigger
  if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  // Lenis smooth scroll
  if (typeof Lenis !== "undefined") {
    var lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    // Sync Lenis with ScrollTrigger
    if (typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
    }
  }

  // Hero parallax — slides & fallback bg scroll at 40% speed
  var heroEl = document.querySelector(".fhero");
  var heroBg = document.querySelector(".fhero-slides") || document.querySelector(".fhero-img-bg");
  if (heroEl && heroBg && typeof ScrollTrigger !== "undefined") {
    gsap.to(heroBg, {
      yPercent: 28,
      ease: "none",
      scrollTrigger: { trigger: heroEl, start: "top top", end: "bottom top", scrub: true }
    });
  }

  // Hero floating circle — subtle parallax
  var heroVis = document.querySelector(".fhero-visual");
  if (heroVis && typeof ScrollTrigger !== "undefined") {
    gsap.to(heroVis, {
      yPercent: -18,
      ease: "none",
      scrollTrigger: { trigger: heroEl, start: "top top", end: "bottom top", scrub: true }
    });
  }

  // Hero word split
  var h1 = document.querySelector("[data-split-words]");
  if (h1) {
    var words = h1.textContent.trim().split(/\\s+/);
    h1.innerHTML = words.map(function(w) {
      return '<span style="display:inline-block;overflow:hidden"><span class="hw" style="display:inline-block">' + w + "</span></span>";
    }).join(" ");
    gsap.from(".hw", { y: "105%", duration: 0.9, stagger: 0.07, ease: "power4.out", delay: 0.25 });
  }

  // Hero fade-ins — staggered entrance
  gsap.from(".fhero-badge", { opacity: 0, y: 24, duration: 0.6, delay: 0.15, ease: "power2.out" });
  gsap.from(".fhero-sub",   { opacity: 0, y: 22, duration: 0.6, delay: 0.85, ease: "power2.out" });
  gsap.from(".fhero-btns",  { opacity: 0, y: 20, duration: 0.6, delay: 1.05, ease: "power2.out" });
  gsap.from(".fhero-meta",  { opacity: 0, y: 16, duration: 0.5, delay: 1.25, ease: "power2.out" });
  gsap.from(".fhero-visual",{ opacity: 0, scale: 0.82, duration: 1.0, delay: 0.4, ease: "power3.out" });

  // Highlight bar items
  gsap.from(".fhl-item", { opacity: 0, x: -18, duration: 0.5, stagger: 0.08, delay: 0.1, ease: "power2.out",
    scrollTrigger: { trigger: ".fhl", start: "top 95%", toggleActions: "play none none none" }
  });

  // Section titles
  gsap.utils.toArray(".fsec-title").forEach(function(el) {
    var words = el.textContent.trim().split(/\\s+/);
    el.innerHTML = words.map(function(w) {
      return '<span style="display:inline-block;overflow:hidden;vertical-align:top"><span class="st-w" style="display:inline-block">' + w + "</span></span>";
    }).join(" ");
    gsap.from(el.querySelectorAll(".st-w"), { y: "100%", duration: 0.7, stagger: 0.05, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" }
    });
  });

  // Scroll reveals
  gsap.utils.toArray(".sr-up").forEach(function(el) {
    gsap.from(el, { opacity: 0, y: 40, duration: 0.75, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" }
    });
  });
  gsap.utils.toArray(".sr-fade").forEach(function(el) {
    gsap.from(el, { opacity: 0, duration: 0.8, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" }
    });
  });

  // Stagger menu cards — batch by viewport
  gsap.utils.toArray(".ffeat-card").forEach(function(el, i) {
    gsap.from(el, { opacity: 0, y: 40, scale: 0.94, duration: 0.6, delay: (i % 4) * 0.08, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 93%", toggleActions: "play none none none" }
    });
  });
  gsap.utils.toArray(".fitem-card").forEach(function(el, i) {
    gsap.from(el, { opacity: 0, x: i % 2 === 0 ? -24 : 24, duration: 0.55, delay: (i % 6) * 0.05, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 94%", toggleActions: "play none none none" }
    });
  });

  // Testimonial cards
  gsap.utils.toArray(".ftesti-card").forEach(function(el, i) {
    gsap.from(el, { opacity: 0, y: 32, duration: 0.65, delay: i * 0.12, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" }
    });
  });

  // Location rows
  gsap.utils.toArray(".floc-row").forEach(function(el, i) {
    gsap.from(el, { opacity: 0, x: 28, duration: 0.55, delay: i * 0.1, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" }
    });
  });
});
</script>
</body>
</html>`;
}

function buildFoodMenu(menuData, cfg, wa) {
  const parts = [];
  let catIdx = 0;

  // Featured items (vertical cards)
  if (menuData.featured?.featured_items?.length) {
    const fd = menuData.featured;
    const cards = fd.featured_items.map(item => {
      const imgUrl = item?.image?.url || (typeof item?.image === "string" ? item.image : null);
      const price  = item.price || "";
      return `<div class="ffeat-card sr-up">
  <div class="ffeat-img-wrap">
    ${imgUrl ? `<img class="ffeat-img" src="${imgUrl}" alt="${item.name}" loading="lazy">` : `<div class="ffeat-no-img">${cfg.emoji}</div>`}
    ${item.badge ? `<span class="ffeat-badge">${item.badge}</span>` : ""}
  </div>
  <div class="ffeat-body">
    <div class="ffeat-name">${item.name}</div>
    <div class="ffeat-desc">${item.description || ""}</div>
    <div class="ffeat-footer">
      <div class="ffeat-price">${price}</div>
      <button class="fadd-btn" onclick="FCart.add('${item.name.replace(/'/g, "\\'")}','${item.price || "0"}','${imgUrl || ""}','${cfg.emoji}')" aria-label="Adicionar ${item.name}">+</button>
    </div>
  </div>
</div>`;
    }).join("");

    parts.push(`<div class="fmenu-section" id="menu-sec-${catIdx}" data-cat-idx="${catIdx}">
  <div class="fmenu-section-title sr-fade">${fd.title || "Destaques"}</div>
  ${fd.subtitle ? `<div class="fmenu-section-sub">${fd.subtitle}</div>` : ""}
  <div class="ffeat-grid">${cards}</div>
</div>`);
    catIdx++;
  }

  // Category tabs
  if (menuData.categories?.categories?.length) {
    for (const cat of menuData.categories.categories) {
      const items = (cat.items || []).map(item => {
        const imgUrl = item?.image?.url || (typeof item?.image === "string" ? item.image : null);
        return `<div class="fitem-card">
  <div class="fitem-img-wrap">
    ${imgUrl ? `<img class="fitem-img" src="${imgUrl}" alt="${item.name}" loading="lazy">` : `<div class="fitem-no-img">${cfg.emoji}</div>`}
  </div>
  <div class="fitem-body">
    <div class="fitem-name">${item.name}${item.highlight ? ` <span class="fitem-badge">Popular</span>` : ""}</div>
    <div class="fitem-desc">${item.description || ""}</div>
    <div class="fitem-footer">
      <div class="fitem-price">${item.price || ""}</div>
      <button class="fitem-add" onclick="FCart.add('${item.name.replace(/'/g, "\\'")}','${item.price || "0"}','${imgUrl || ""}','${cfg.emoji}')" aria-label="Adicionar">+</button>
    </div>
  </div>
</div>`;
      }).join("");

      parts.push(`<div class="fmenu-section" id="menu-sec-${catIdx}" data-cat-idx="${catIdx}">
  <div class="fmenu-section-title sr-fade">${cat.name}</div>
  <div class="fitem-grid">${items}</div>
</div>`);
      catIdx++;
    }
  }

  return parts.join("\n");
}

// ── PETSHOP TEMPLATE ──────────────────────────────────────────────────────────

function buildPetshopHTML(site, cfg) {
  // For now, fall back to food engine with pet config adaptations
  const petCfg = {
    bg: "#F0FDF4", surface: "#FFFFFF", surface2: "#DCFCE7",
    primary: cfg.primary, primaryHover: cfg.accent, accent: "#F59E0B", accentFg: "#0A0A0A",
    text: "#052E16", muted: "rgba(5,46,22,.55)", border: "rgba(5,46,22,.1)",
    gradHero: `linear-gradient(135deg, ${cfg.primary}EE 0%, ${cfg.accent}CC 100%)`,
    glowColor: `${cfg.primary}44`,
    font: "'Nunito', system-ui, sans-serif",
    bodyFont: "'Nunito', system-ui, sans-serif",
    googleFonts: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap",
    emoji: cfg.emoji, orderCta: "Agendar Agora", menuLabel: "Serviços", deliveryLabel: "Atendimento",
    heroTagline: "Porque eles merecem o melhor.",
  };
  return buildFoodHTML(site, petCfg);
}

// ── Template router ───────────────────────────────────────────────────────────

const NICHE_TEMPLATES = {
  "Pizzaria":             (site) => buildFoodHTML(site, FOOD_CONFIGS["Pizzaria"]),
  "Hamburgueria":         (site) => buildFoodHTML(site, FOOD_CONFIGS["Hamburgueria"]),
  "Sorveteria":           (site) => buildFoodHTML(site, FOOD_CONFIGS["Sorveteria"]),
  "Restaurante":          (site) => buildFoodHTML(site, FOOD_CONFIGS["Restaurante"]),
  "Padaria":              (site) => buildFoodHTML(site, FOOD_CONFIGS["Padaria"]),
  "Clínica Veterinária":  (site) => buildPetshopHTML(site, PETSHOP_CONFIGS["Clínica Veterinária"]),
  "Pet Shop":             (site) => buildPetshopHTML(site, PETSHOP_CONFIGS["Pet Shop"]),
  "Moda":                 (site) => buildFashionHTML(site),
  "Loja de Roupas":       (site) => buildFashionHTML(site),
  "Boutique":             (site) => buildFashionHTML(site),
  "Brechó":               (site) => buildFashionHTML(site),
  "Academia":                  (site) => buildAcademiaHTML(site),
  "Academia / Studio Fitness": (site) => buildAcademiaHTML(site),
  "Fitness":                   (site) => buildAcademiaHTML(site),
  "Studio Fitness":            (site) => buildAcademiaHTML(site),
  "Crossfit":             (site) => buildAcademiaHTML(site),
  "Gym":                  (site) => buildAcademiaHTML(site),
  "Pilates":              (site) => buildAcademiaHTML(site),
  "Farmácia":                (site) => buildFarmaciaHTML(site),
  "Drogaria":                (site) => buildFarmaciaHTML(site),
  "Farmácia de Manipulação": (site) => buildFarmaciaHTML(site),
  "Imobiliária":          (site) => buildImobiliariaHTML(site),
  "Corretor":             (site) => buildImobiliariaHTML(site),
  "Clínica Odontológica": (site) => buildClinicaHTML(site),
  "Clínica Médica":       (site) => buildClinicaHTML(site),
  "Clínica de Fisioterapia": (site) => buildClinicaHTML(site),
  "Consultório de Nutrição": (site) => buildClinicaHTML(site),
  "Clínica de Estética":  (site) => buildClinicaHTML(site),
  "Lanchonete":           (site) => buildFoodHTML(site, FOOD_CONFIGS["Lanchonete"]),
  "Cafeteria":            (site) => buildFoodHTML(site, FOOD_CONFIGS["Cafeteria"]),
  "Açaíteria":            (site) => buildFoodHTML(site, FOOD_CONFIGS["Açaíteria"]),
};

// ── Normalized lookup table (built once at module load) ───────────────────────
// Allows getTemplate() to match regardless of accents or letter case.
// e.g. "farmacia", "Farmácia", "FARMÁCIA" → all resolve to the same builder.

function _normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")                    // decompõe: "á" → "a" + combining
    .replace(/[\u0300-\u036f]/g, "")     // remove combining marks
    .trim();
}

const NICHE_TEMPLATES_NORMALIZED = Object.fromEntries(
  Object.entries(NICHE_TEMPLATES).map(([k, v]) => [_normalize(k), v])
);

/**
 * Get the premium template builder for a niche, or null for generic fallback.
 * Matching is case-insensitive and accent-insensitive.
 *
 * Examples that all resolve to buildFarmaciaHTML:
 *   "Farmácia", "farmácia", "farmacia", "FARMÁCIA", "FARMACIA"
 *
 * @param {string} niche
 * @returns {function|null}
 */
export function getTemplate(niche) {
  if (!niche) return null;
  // 1. Exact match first (fastest, zero allocation)
  if (NICHE_TEMPLATES[niche]) return NICHE_TEMPLATES[niche];
  // 2. Normalized fallback
  return NICHE_TEMPLATES_NORMALIZED[_normalize(niche)] || null;
}
