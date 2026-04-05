/**
 * imobiliaria.js — Premium Imobiliária template.
 *
 * Design: clean white + navy professional. QuintoAndar / Loft level.
 * Lead-gen only (no cart). All CTAs route to WhatsApp with pre-filled message.
 * Properties from AI content sections.
 */

import { waLink } from "../htmlBuilder.js";
import {
  WA_SVG, findSection, getAllImages, getFirstImage,
  getHeroContent, buildTestimonials, getLocationData,
  SHARED_CSS, SHARED_JS,
} from "./shared.js";

const API_BASE = process.env.API_BASE_URL || "https://api.forgesites.app";

export function buildImobiliariaHTML(site) {
  const wa        = waLink(site.phone, site.business_name);
  const location  = [site.neighborhood, site.city].filter(Boolean).join(", ");
  const heroContent = getHeroContent(site);
  const placesData  = site.content?.placesData || null;
  const siteId      = site.id || "";
  const logoImg     = (site.images || []).find(i => i.type === "logo");

  const allImgs    = getAllImages(site, 8);
  const heroImg    = allImgs[0] || null;
  const heroSlides = allImgs.length > 1
    ? (allImgs.length < 3 ? [...allImgs, ...allImgs, ...allImgs] : allImgs).slice(0, 8)
    : [];
  const stripImgs  = allImgs.length >= 3
    ? [...allImgs, ...allImgs, ...allImgs].slice(0, 18)
    : [];

  const locData  = getLocationData(site);
  const testiCards = buildTestimonials(site);
  const ratingBadge = placesData?.rating
    ? `⭐ ${placesData.rating.toFixed(1)} · ${placesData.totalRatings?.toLocaleString("pt-BR") || ""} avaliações`
    : "";

  // Properties from AI content
  const propertiesSection = findSection(site, ["listings", "products", "featured_products", "menu_featured", "services"]);
  const rawProperties = propertiesSection?.data?.featured_items
    || propertiesSection?.data?.items
    || propertiesSection?.data?.listings
    || propertiesSection?.data?.services
    || [];

  const defaultProperties = [
    { name: "Apartamento 3 Quartos — Jardim América", price: "R$ 850.000", description: "Lindo apartamento com varanda, 2 vagas, lazer completo.", badge: "Venda", details: { beds: 3, baths: 2, area: "120m²", neighborhood: site.city || "Centro" }, image: null },
    { name: "Casa Térrea — Alphaville", price: "R$ 1.200.000", description: "Casa espaçosa com piscina, churrasqueira e jardim.", badge: "Venda", details: { beds: 4, baths: 3, area: "280m²", neighborhood: site.city || "Centro" }, image: null },
    { name: "Studio Moderno — Vila Mariana", price: "R$ 3.200/mês", description: "Studio mobiliado, próximo ao metrô, excelente localização.", badge: "Locação", details: { beds: 1, baths: 1, area: "42m²", neighborhood: site.city || "Centro" }, image: null },
    { name: "Cobertura Duplex — Moema", price: "R$ 2.400.000", description: "Cobertura com vista panorâmica, terraço privativo.", badge: "Venda", details: { beds: 4, baths: 4, area: "320m²", neighborhood: site.city || "Centro" }, image: null },
    { name: "Apartamento 2 Quartos — Pinheiros", price: "R$ 4.800/mês", description: "Apartamento totalmente reformado, alto padrão de acabamento.", badge: "Locação", details: { beds: 2, baths: 1, area: "78m²", neighborhood: site.city || "Centro" }, image: null },
    { name: "Sala Comercial — Paulista", price: "R$ 6.500/mês", description: "Sala comercial em andar alto, vista livre, 2 vagas.", badge: "Comercial", details: { beds: 0, baths: 1, area: "95m²", neighborhood: site.city || "Centro" }, image: null },
  ];

  const properties = rawProperties.length ? rawProperties : defaultProperties;

  const badgeColor = (badge) => {
    if (!badge) return "rgba(29,78,216,.15):#1D4ED8";
    const b = badge.toLowerCase();
    if (b.includes("venda") || b.includes("compra")) return "rgba(5,150,105,.15):#059669";
    if (b.includes("loc")) return "rgba(245,158,11,.15):#D97706";
    if (b.includes("lança") || b.includes("novo")) return "rgba(239,68,68,.15):#DC2626";
    return "rgba(29,78,216,.15):#1D4ED8";
  };

  const propCards = properties.slice(0, 6).map(prop => {
    const imgUrl = prop?.image?.url || (typeof prop?.image === "string" ? prop.image : allImgs[Math.floor(Math.random() * allImgs.length)] || null);
    const badge  = prop.badge || prop.type || "Imóvel";
    const price  = prop.price || "";
    const [bgColor, txtColor] = badgeColor(badge).split(":");
    const details = prop.details || {};
    const beds    = details.beds != null ? details.beds : (prop.bedrooms || prop.quartos || "");
    const baths   = details.baths != null ? details.baths : (prop.bathrooms || prop.banheiros || "");
    const area    = details.area || prop.area || "";
    const hood    = details.neighborhood || prop.neighborhood || prop.bairro || location;
    const propName = prop.name || prop.title || "Imóvel";
    const propDesc = prop.description || "";

    const waMsg = encodeURIComponent(`Olá! Tenho interesse no imóvel "${propName}" — ${price}. Poderia me dar mais informações?`);
    const waLink2 = (wa || "#").split("?")[0] + "?text=" + waMsg;

    return `<div class="prop-card card-anim">
  <div class="prop-img-wrap">
    ${imgUrl
      ? `<img class="prop-img" src="${imgUrl}" alt="${propName}" loading="lazy">`
      : `<div class="prop-img-ph">🏠</div>`}
    <span class="prop-badge" style="background:${bgColor};color:${txtColor}">${badge}</span>
  </div>
  <div class="prop-body">
    <div class="prop-price">${price}</div>
    <div class="prop-name">${propName}</div>
    ${propDesc ? `<div class="prop-desc">${propDesc}</div>` : ""}
    <div class="prop-details">
      ${beds ? `<span class="prop-detail">🛏 ${beds} quarto${beds !== 1 ? "s" : ""}</span>` : ""}
      ${baths ? `<span class="prop-detail">🚿 ${baths} banheiro${baths !== 1 ? "s" : ""}</span>` : ""}
      ${area ? `<span class="prop-detail">📐 ${area}</span>` : ""}
      ${hood ? `<span class="prop-detail">📍 ${hood}</span>` : ""}
    </div>
    <a class="prop-cta" href="${waLink2}" target="_blank" rel="noopener">${WA_SVG} Falar com Corretor</a>
  </div>
</div>`;
  }).join("");

  const hoursHtml = locData?.hours ? Object.entries(locData.hours).map(([k, v]) => {
    const labels = { weekdays: "Seg–Sex", saturday: "Sábado", sunday: "Domingo" };
    return `<tr><td>${labels[k] || k}</td><td>${v}</td></tr>`;
  }).join("") : "";

  // Services/differentials
  const servicesSection = findSection(site, ["services", "features", "highlights", "differentials"]);
  const defaultServices = [
    { icon: "🔑", name: "Compra & Venda", desc: "Encontramos o imóvel ideal para você ou o comprador certo para o seu." },
    { icon: "🏘️", name: "Locação", desc: "Gestão completa do aluguel, desde a busca ao contrato." },
    { icon: "📋", name: "Avaliação Gratuita", desc: "Avaliamos seu imóvel sem custo com base no mercado atual." },
    { icon: "⚡", name: "Processo Ágil", desc: "Documentação rápida e digital. Do interesse à assinatura em dias." },
  ];
  const services = servicesSection?.data?.services || servicesSection?.data?.items || defaultServices;

  const serviceCards = services.slice(0, 4).map(s => `<div class="svc-card card-anim">
  <div class="svc-icon">${s.icon || "🏠"}</div>
  <div class="svc-name">${s.name || s.title || ""}</div>
  <div class="svc-desc">${s.description || s.desc || ""}</div>
</div>`).join("");

  const statsItems = [
    { value: placesData?.totalRatings ? `${Math.floor(placesData.totalRatings / 2)}+` : "500+", label: "Imóveis Negociados" },
    { value: placesData?.rating ? `${placesData.rating.toFixed(1)}★` : "15+", label: placesData?.rating ? "Avaliação Google" : "Anos de Mercado" },
    { value: "98%", label: "Clientes Satisfeitos" },
    { value: "CRECI", label: "Credenciado" },
  ];

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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;500;600;700&display=swap">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js" defer></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F8F9FC;--surface:#FFFFFF;--surface2:#EEF2FF;
  --p:#0F172A;--ph:#1E293B;--acc:#B59A6A;--acc-fg:#fff;
  --txt:#0F172A;--muted:rgba(15,23,42,.5);--bdr:rgba(15,23,42,.08);
  --wa:#25D366;--r:12px;--r2:18px;
  --sh:0 4px 20px rgba(15,23,42,.06);--shl:0 16px 56px rgba(15,23,42,.12);
  --font-h:'Playfair Display',Georgia,serif;--font-b:'Inter',system-ui,sans-serif
}
html{scroll-behavior:smooth}
body{font-family:var(--font-b);color:var(--txt);background:var(--bg);-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3{font-family:var(--font-h)}
img{display:block;max-width:100%;object-fit:cover}
a{color:inherit;text-decoration:none}
.wrap{max-width:1200px;margin:0 auto;padding:0 24px}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--acc);border-radius:3px}

/* ── Nav ── */
.site-nav{position:fixed;top:0;left:0;right:0;z-index:400;height:70px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--bdr);transition:box-shadow .3s}
.site-nav.scrolled{box-shadow:0 4px 24px rgba(15,23,42,.08)}
.nav-brand{display:flex;align-items:center;gap:10px;font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--txt)}
.nav-logo{height:38px;width:auto;border-radius:6px}
.nav-links{display:flex;align-items:center;gap:2px}
.nav-link{font-size:13px;font-weight:500;color:var(--muted);padding:8px 14px;border-radius:8px;transition:all .15s}
.nav-link:hover{background:var(--surface2);color:var(--txt)}
.nav-actions{display:flex;align-items:center;gap:10px}
.btn-nav-cta{display:inline-flex;align-items:center;gap:7px;background:var(--p);color:#fff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:10px;border:none;cursor:pointer;transition:background .15s,transform .15s;white-space:nowrap}
.btn-nav-cta:hover{background:var(--ph);transform:translateY(-1px)}
.nav-ham{display:none;background:none;border:none;cursor:pointer;padding:8px;color:var(--txt)}
.nav-ham span{display:block;width:22px;height:2px;background:currentColor;margin:5px 0}
.nav-mob{display:none;position:fixed;top:70px;left:0;right:0;background:var(--surface);border-bottom:1px solid var(--bdr);z-index:399;padding:16px 24px;flex-direction:column;gap:6px;box-shadow:0 8px 32px rgba(0,0,0,.08)}
.nav-mob.open{display:flex}
.nav-mob-link{font-size:15px;font-weight:500;color:var(--txt);padding:10px 14px;border-radius:10px;transition:background .15s}
.nav-mob-link:hover{background:var(--surface2)}
@media(max-width:768px){.nav-links{display:none}.nav-ham{display:block}.btn-nav-cta.hide-mob{display:none}}

/* ── Hero ── */
.site-hero{position:relative;min-height:100vh;display:flex;align-items:flex-end;overflow:hidden;background:linear-gradient(135deg,#0F172A 0%,#1E3A8A 100%)}
.hero-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(15,23,42,.95) 0%,rgba(15,23,42,.6) 50%,rgba(15,23,42,.2) 100%);z-index:1}
.hero-inner{position:relative;z-index:2;max-width:1200px;margin:0 auto;padding:80px 48px 100px;width:100%}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(181,154,106,.2);border:1px solid rgba(181,154,106,.4);border-radius:100px;padding:7px 18px;font-size:12px;font-weight:600;color:var(--acc);margin-bottom:20px;letter-spacing:.06em;text-transform:uppercase}
.hero-h1{font-size:clamp(44px,7vw,100px);line-height:1;color:#fff;margin-bottom:20px;font-weight:900;max-width:800px}
.hero-sub{font-size:17px;color:rgba(255,255,255,.7);max-width:520px;line-height:1.7;margin-bottom:36px}
.hero-btns{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:50px}
.btn-hero-main{display:inline-flex;align-items:center;gap:10px;background:var(--acc);color:#fff;font-size:16px;font-weight:700;padding:17px 36px;border-radius:12px;border:none;cursor:pointer;transition:all .2s;box-shadow:0 8px 28px rgba(181,154,106,.4);text-decoration:none}
.btn-hero-main:hover{transform:translateY(-3px);box-shadow:0 16px 44px rgba(181,154,106,.55)}
.btn-hero-ghost{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);color:#fff;border:1.5px solid rgba(255,255,255,.25);font-size:15px;font-weight:600;padding:15px 28px;border-radius:12px;backdrop-filter:blur(8px);transition:background .2s;text-decoration:none}
.btn-hero-ghost:hover{background:rgba(255,255,255,.18)}
.hero-stats{display:flex;gap:40px;flex-wrap:wrap}
.hero-stat{text-align:center}
.hero-stat-val{font-family:var(--font-h);font-size:32px;font-weight:700;color:#fff;line-height:1}
.hero-stat-lbl{font-size:12px;color:rgba(255,255,255,.55);margin-top:4px;font-weight:500;letter-spacing:.04em}
.hero-stat-div{width:1px;height:44px;background:rgba(255,255,255,.15);align-self:center}
@media(max-width:768px){.hero-inner{padding:80px 24px 80px}.hero-h1{font-size:clamp(38px,10vw,72px)}.hero-btns{flex-direction:column;align-items:flex-start}.hero-stats{gap:20px}}

/* ── Trust strip ── */
.trust-strip{background:var(--surface);border-bottom:1px solid var(--bdr);padding:18px 24px}
.trust-inner{max-width:1200px;margin:0 auto;display:flex;gap:32px;align-items:center;justify-content:center;flex-wrap:wrap}
.trust-item{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:var(--muted)}
.trust-item span:first-child{font-size:20px}

/* ── Section shared ── */
.sec-label{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--acc);margin-bottom:12px;display:flex;align-items:center;gap:10px}
.sec-label::before{content:"";width:24px;height:2px;background:var(--acc)}
.sec-title{font-size:clamp(28px,4.5vw,50px);color:var(--txt);margin-bottom:44px;font-weight:700;line-height:1.1}
.section-wrap{max-width:1200px;margin:0 auto;padding:0 24px}
.section-pad{padding:80px 24px}

/* ── Services section ── */
.services-section{background:var(--surface);padding:80px 24px}
.svc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}
.svc-card{padding:32px 28px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r2);transition:all .25s;cursor:default}
.svc-card:hover{transform:translateY(-5px);box-shadow:var(--shl);border-color:var(--acc)}
.svc-icon{font-size:36px;margin-bottom:16px}
.svc-name{font-size:17px;font-weight:700;margin-bottom:8px;color:var(--txt);font-family:var(--font-h)}
.svc-desc{font-size:14px;color:var(--muted);line-height:1.65}

/* ── Stats bar ── */
.stats-bar{background:var(--p);padding:56px 24px}
.stats-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center}
.stat-val{font-family:var(--font-h);font-size:clamp(36px,5vw,56px);color:#fff;font-weight:700;line-height:1}
.stat-lbl{font-size:13px;color:rgba(255,255,255,.55);margin-top:6px;font-weight:500}
@media(max-width:640px){.stats-inner{grid-template-columns:repeat(2,1fr)}}

/* ── Properties ── */
.props-section{background:var(--bg);padding:80px 24px}
.props-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px}
.prop-card{background:var(--surface);border:1px solid var(--bdr);border-radius:var(--r2);overflow:hidden;transition:transform .3s,box-shadow .3s}
.prop-card:hover{transform:translateY(-6px);box-shadow:var(--shl)}
.prop-img-wrap{position:relative;height:230px;overflow:hidden}
.prop-img{width:100%;height:100%;transition:transform .6s}
.prop-card:hover .prop-img{transform:scale(1.06)}
.prop-img-ph{height:230px;display:flex;align-items:center;justify-content:center;font-size:64px;background:var(--surface2)}
.prop-badge{position:absolute;top:14px;left:14px;font-size:11px;font-weight:800;padding:4px 12px;border-radius:100px;letter-spacing:.05em;text-transform:uppercase}
.prop-body{padding:22px}
.prop-price{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--txt);margin-bottom:6px}
.prop-name{font-size:15px;font-weight:600;color:var(--muted);margin-bottom:8px;line-height:1.4}
.prop-desc{font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.prop-details{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px;padding-top:12px;border-top:1px solid var(--bdr)}
.prop-detail{font-size:12px;font-weight:600;color:var(--muted);display:flex;align-items:center;gap:4px}
.prop-cta{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;background:var(--wa);color:#fff;border-radius:10px;font-size:14px;font-weight:700;transition:background .15s}
.prop-cta:hover{background:#128C7E}
@media(max-width:480px){.props-grid{grid-template-columns:1fr}}

/* ── CTA section ── */
.imob-cta{background:linear-gradient(135deg,#0F172A 0%,#1E3A8A 100%);padding:90px 24px;text-align:center;position:relative;overflow:hidden}
.imob-cta::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 50% 70% at 50% 50%,rgba(181,154,106,.08) 0%,transparent 100%)}
.imob-cta h2{font-size:clamp(32px,5.5vw,60px);color:#fff;margin-bottom:16px;position:relative}
.imob-cta p{font-size:17px;color:rgba(255,255,255,.7);max-width:520px;margin:0 auto 36px;position:relative;line-height:1.7}
.btn-cta-main{display:inline-flex;align-items:center;gap:10px;background:var(--acc);color:#fff;font-size:16px;font-weight:700;padding:18px 44px;border-radius:12px;transition:transform .2s,box-shadow .2s;position:relative}
.btn-cta-main:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(181,154,106,.4)}

/* ── Reviews ── */
.reviews-section{background:var(--surface);padding:80px 24px}

/* ── Location ── */
.loc-section{background:var(--bg);padding:80px 24px}
.loc-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
.loc-map{background:var(--surface2);border-radius:var(--r2);height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;border:1px solid var(--bdr)}
.loc-map span{font-size:52px}
.loc-map p{font-size:14px;color:var(--muted);font-weight:600;text-align:center;max-width:200px;line-height:1.5}
.loc-info{display:flex;flex-direction:column;gap:16px}
.loc-row{display:flex;gap:14px;align-items:flex-start;padding:18px 20px;background:var(--surface);border:1px solid var(--bdr);border-radius:var(--r);transition:border-color .2s}
.loc-row:hover{border-color:var(--acc)}
.loc-icon{font-size:20px;flex-shrink:0;margin-top:2px}
.loc-text{font-size:14px;color:var(--muted);line-height:1.6}
.loc-text strong{display:block;font-size:12px;font-weight:700;color:var(--txt);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em}
.hours-table{width:100%;border-collapse:collapse;margin-top:6px;font-size:13px}
.hours-table td{padding:5px 0;color:var(--muted)}
.hours-table td:first-child{font-weight:700;color:var(--txt);padding-right:16px}
@media(max-width:768px){.loc-inner{grid-template-columns:1fr}}

/* ── Footer ── */
.site-footer{background:var(--p);padding:44px 24px}
.footer-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px}
.footer-brand{font-family:var(--font-h);font-size:19px;font-weight:700;color:#fff}
.footer-info{font-size:13px;color:rgba(255,255,255,.4);line-height:1.7;margin-top:4px}
.footer-wa{display:flex;align-items:center;gap:8px;color:var(--wa);font-size:13px;font-weight:700}
.footer-credit{font-size:11px;color:rgba(255,255,255,.15);margin-top:6px}

/* ── WA float ── */
.wa-float{position:fixed;bottom:28px;right:28px;z-index:500;width:62px;height:62px;border-radius:50%;background:var(--wa);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 28px rgba(37,211,102,.5);animation:wapulse 2.8s ease-in-out infinite;transition:transform .2s;text-decoration:none}
.wa-float:hover{transform:scale(1.1)}
@keyframes wapulse{0%,100%{box-shadow:0 4px 28px rgba(37,211,102,.5)}50%{box-shadow:0 4px 52px rgba(37,211,102,.9)}}

${SHARED_CSS}
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
    <a class="nav-link" href="#imoveis">Imóveis</a>
    <a class="nav-link" href="#servicos">Serviços</a>
    <a class="nav-link" href="#contato">Contato</a>
  </div>
  <div class="nav-actions">
    <button class="nav-ham" id="nav-ham"><span></span><span></span><span></span></button>
    <a class="btn-nav-cta hide-mob" href="${wa}" target="_blank" rel="noopener">${WA_SVG} Falar com Corretor</a>
  </div>
</nav>
<div class="nav-mob" id="nav-mob">
  <a class="nav-mob-link" href="#inicio" onclick="document.getElementById('nav-mob').classList.remove('open')">Início</a>
  <a class="nav-mob-link" href="#imoveis" onclick="document.getElementById('nav-mob').classList.remove('open')">Imóveis</a>
  <a class="nav-mob-link" href="#servicos" onclick="document.getElementById('nav-mob').classList.remove('open')">Serviços</a>
  <a class="nav-mob-link" href="#contato" onclick="document.getElementById('nav-mob').classList.remove('open')">Contato</a>
  <a class="nav-mob-link" href="${wa}" target="_blank" rel="noopener">${WA_SVG} WhatsApp</a>
</div>

<!-- Hero -->
<section class="site-hero" id="inicio">
  ${heroSlides.length > 1
    ? `<div class="hero-slides" id="hero-slides">${heroSlides.map((url, i) => `<div class="hero-slide${i === 0 ? " active" : ""}" style="background-image:url('${url}');--opacity:.45"></div>`).join("")}</div>`
    : heroImg
      ? `<div style="position:absolute;inset:0;z-index:0"><img src="${heroImg}" alt="${site.business_name}" style="width:100%;height:100%;object-fit:cover;opacity:.42" loading="eager"></div>`
      : ""}
  <div class="hero-grad"></div>
  <div class="hero-inner">
    <div class="hero-badge">🏠 ${site.niche}${location ? ` · ${location}` : ""}</div>
    <h1 class="hero-h1" data-split>${heroContent.headline || `Encontre o Imóvel dos Seus Sonhos em ${location || "sua cidade"}`}</h1>
    <p class="hero-sub">${heroContent.subheadline || `Compra, venda e locação com atendimento personalizado. Mais de ${placesData?.totalRatings || "500"} famílias já encontraram seu lar com a gente.`}</p>
    <div class="hero-btns">
      <a class="btn-hero-main" href="#imoveis">🏠 Ver Imóveis</a>
      <a class="btn-hero-ghost" href="${wa}" target="_blank" rel="noopener">${WA_SVG} Falar com Corretor</a>
    </div>
    <div class="hero-stats">
      ${statsItems.map((s, i) => `${i > 0 ? '<div class="hero-stat-div"></div>' : ""}<div class="hero-stat"><div class="hero-stat-val">${s.value}</div><div class="hero-stat-lbl">${s.label}</div></div>`).join("")}
    </div>
  </div>
</section>

<!-- Trust strip -->
<div class="trust-strip">
  <div class="trust-inner">
    <div class="trust-item"><span>✅</span><span>CRECI Credenciado</span></div>
    <div class="trust-item"><span>🔐</span><span>Negociação Segura</span></div>
    <div class="trust-item"><span>⚡</span><span>Processo Ágil</span></div>
    <div class="trust-item"><span>💬</span><span>Suporte 24h pelo WhatsApp</span></div>
    ${ratingBadge ? `<div class="trust-item"><span>⭐</span><span>${ratingBadge}</span></div>` : ""}
  </div>
</div>

<!-- Photo strip -->
${stripImgs.length >= 4 ? `
<div class="photo-strip" style="height:220px;background:var(--surface2)">
  <div class="strip-track">${stripImgs.map(url => `<img class="strip-img" src="${url}" alt="" loading="lazy">`).join("")}</div>
</div>` : ""}

<!-- Properties -->
<section class="props-section" id="imoveis">
  <div class="section-wrap">
    <div class="sec-label">Portfólio</div>
    <h2 class="sec-title sr-fade">Imóveis em Destaque</h2>
    <div class="props-grid">${propCards}</div>
  </div>
</section>

<!-- Services -->
<section class="services-section" id="servicos">
  <div class="section-wrap">
    <div class="sec-label">O Que Fazemos</div>
    <h2 class="sec-title sr-fade">Nossos Serviços</h2>
    <div class="svc-grid">${serviceCards}</div>
  </div>
</section>

<!-- Stats bar -->
<div class="stats-bar">
  <div class="stats-inner">
    ${statsItems.map(s => `<div class="sr-up"><div class="stat-val">${s.value}</div><div class="stat-lbl">${s.label}</div></div>`).join("")}
  </div>
</div>

<!-- CTA -->
<section class="imob-cta" id="contato-cta">
  <div class="wrap">
    <h2 class="sr-up">Pronto para Encontrar seu Imóvel?</h2>
    <p class="sr-up">Nossos corretores especialistas estão prontos para te ajudar a encontrar o imóvel perfeito${location ? ` em ${location}` : ""}. Consulta gratuita e sem compromisso!</p>
    <a class="btn-cta-main sr-up" href="${wa}" target="_blank" rel="noopener">${WA_SVG} Falar com Corretor Agora</a>
  </div>
</section>

<!-- Reviews -->
${testiCards ? `
<section class="reviews-section" id="depoimentos">
  <div class="section-wrap">
    <div class="sec-label">Depoimentos</div>
    <h2 class="sec-title sr-fade">O Que Nossos Clientes Dizem</h2>
    <div class="testi-grid">${testiCards}</div>
  </div>
</section>` : ""}

<!-- Location -->
${locData ? `
<section class="loc-section" id="contato">
  <div class="loc-inner">
    <div>
      <div class="sec-label">Onde Estamos</div>
      <h2 class="sec-title sr-fade">Localização</h2>
    </div>
    <div class="loc-map">
      <span>📍</span>
      <p>${locData.address || site.address || ""}${locData.city || site.city ? `<br>${locData.city || site.city}` : ""}</p>
      <a href="${wa}" target="_blank" rel="noopener" style="padding:8px 20px;background:var(--acc);color:#fff;border-radius:8px;font-size:13px;font-weight:700">WhatsApp</a>
    </div>
    <div class="loc-info sr-up">
      ${locData.address ? `<div class="loc-row"><span class="loc-icon">📍</span><div class="loc-text"><strong>Endereço</strong>${locData.address}</div></div>` : ""}
      ${hoursHtml ? `<div class="loc-row"><span class="loc-icon">🕐</span><div class="loc-text"><strong>Horário de Atendimento</strong><table class="hours-table">${hoursHtml}</table></div></div>` : ""}
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

<script>
${SHARED_JS}
document.getElementById("nav-ham").addEventListener("click",function(){document.getElementById("nav-mob").classList.toggle("open");});
document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener("click",function(e){var id=this.getAttribute("href").slice(1),el=document.getElementById(id);if(el){e.preventDefault();el.scrollIntoView({behavior:"smooth",block:"start"});}});});
</script>
</body>
</html>`;
}
