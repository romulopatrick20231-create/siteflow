/**
 * htmlBuilder.js — Premium static HTML generator.
 *
 * Features:
 *   - GSAP + ScrollTrigger + Lenis via CDN (deferred, no render blocking)
 *   - Reads rich AI content (site.content.pages) — Pexels images, stats, gallery, team
 *   - Hero with auto-sliding background images (from Pexels/uploads)
 *   - Word-split hero headline animation
 *   - ScrollTrigger parallax on hero
 *   - Animated stat counters (0 → target on scroll)
 *   - Services grid with Pexels images + 3D hover
 *   - Masonry-style gallery with Pexels images
 *   - Custom cursor (dot + ring) — desktop only
 *   - Scroll-reveal on all sections
 */

import { getDesign, buildFontLinks, getNicheCopy } from "./designKnowledge.js";

// ── Rich content extraction ───────────────────────────────────────────────────

function findSection(site, types) {
  for (const page of (site.content?.pages || [])) {
    for (const s of (page.sections || [])) {
      if (types.includes(s.type)) return s;
    }
  }
  return null;
}

function getHeroImages(site) {
  const imgs = [];
  // User-uploaded banner first
  for (const img of (site.images || [])) {
    if (img.type === "banner" && (img.public_url || img.url)) {
      imgs.push(img.public_url || img.url);
    }
  }
  // Gallery images from Pexels
  const gallery = findSection(site, ["image_gallery", "image_grid"]);
  for (const img of (gallery?.data?.images || [])) {
    if (img?.url && !imgs.includes(img.url)) imgs.push(img.url);
    if (imgs.length >= 5) break;
  }
  // Service card images
  for (const item of getServicesItems(site)) {
    if (item?.image?.url && !imgs.includes(item.image.url)) imgs.push(item.image.url);
    if (imgs.length >= 5) break;
  }
  return imgs.slice(0, 5);
}

function getServicesItems(site) {
  const s = findSection(site, ["services_grid", "services_featured", "services_accordion", "treatments_grid"]);
  if (!s) return [];
  const d = s.data || {};
  if (d.items)      return d.items.slice(0, 6);
  if (d.treatments) return d.treatments.slice(0, 6);
  if (d.featured)   return [d.featured, ...(d.supporting || [])].slice(0, 6);
  return [];
}

function getStats(site) {
  const s = findSection(site, ["stats_showcase", "impact_numbers"]);
  if (!s) return [];
  const d = s.data || {};
  if (d.stats)   return d.stats.slice(0, 4);
  if (d.numbers) return d.numbers.slice(0, 4);
  return [];
}

function getGalleryImages(site) {
  const g = findSection(site, ["image_gallery", "image_grid", "before_after_gallery"]);
  if (!g) return [];
  const d = g.data || {};
  if (d.images) return d.images.slice(0, 8);
  if (d.cases)  return d.cases.map(c => ({ url: c.image?.url, alt: c.treatment, caption: c.patient_note })).filter(i => i.url).slice(0, 8);
  return [];
}

function getRichTestimonials(site) {
  const t = findSection(site, ["testimonials", "testimonials_story", "testimonials_featured"]);
  if (!t) return null;
  const d = t.data || {};
  if (d.testimonials) return d.testimonials.slice(0, 3).map(x => ({ nome: x.name || x.nome, texto: x.text || x.texto || "" }));
  if (d.cases)        return d.cases.slice(0, 3).map(x => ({ nome: x.name || "Cliente", texto: x.quote || x.after || "" }));
  if (d.featured)     return [
    { nome: d.featured.name, texto: d.featured.full_story || "" },
    ...(d.short_1 ? [{ nome: d.short_1.name, texto: d.short_1.text || "" }] : []),
    ...(d.short_2 ? [{ nome: d.short_2.name, texto: d.short_2.text || "" }] : []),
  ];
  return null;
}

function parseStatValue(val) {
  const str = String(val || "0");
  const match = str.match(/^([\d.,]+)/);
  if (!match) return { num: 0, suffix: "" };
  const num = parseFloat(match[1].replace(/\./g, "").replace(",", ".")) || 0;
  const suffix = str.slice(match[1].length).trim();
  return { num, suffix };
}

// ── Render helpers ────────────────────────────────────────────────────────────

function waLink(phone, name) {
  if (!phone) return "https://wa.me/";
  const n   = phone.replace(/\D/g, "");
  const num = n.startsWith("55") ? n : `55${n}`;
  const msg = encodeURIComponent(`Olá! Vim pelo site da ${name} e gostaria de mais informações.`);
  return `https://wa.me/${num}?text=${msg}`;
}

const WA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.126 1.535 5.857L.057 23.716a.5.5 0 00.641.592l5.945-1.561A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.96 9.96 0 01-5.1-1.395l-.37-.218-3.797.996 1.012-3.698-.24-.381A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>`;

function renderServices(items, d, copy) {
  if (!items.length) return "";
  const cards = items.map(item => {
    const hasImg = item.image?.url;
    return `<div class="svc-card sr-up" data-3d>
      ${hasImg
        ? `<div class="svc-img-wrap"><img src="${item.image.url}" alt="${item.image.alt || item.name}" class="svc-img" loading="lazy"><div class="svc-img-ov"></div></div>`
        : `<div class="svc-icon">${item.icon || "✦"}</div>`}
      <div class="svc-body">
        <h3>${item.name}</h3>
        <p>${item.description || item.summary || ""}</p>
      </div>
    </div>`;
  }).join("");

  return `<section class="services-section" id="servicos">
<div class="wrap">
  <div class="sh sr-fade">
    <div class="section-label">${copy.labelServices}</div>
    <h2 class="section-title">${copy.titleServices}</h2>
  </div>
  <div class="svc-grid">${cards}</div>
</div>
</section>`;
}

function renderStats(stats) {
  if (!stats.length) return "";
  const items = stats.map(s => {
    const { num, suffix } = parseStatValue(s.value);
    return `<div class="stat-item sr-up">
  <div class="stat-value" data-count="${num}" data-suffix="${suffix}">0</div>
  <div class="stat-label">${s.label || ""}</div>
  ${s.context ? `<div class="stat-ctx">${s.context}</div>` : ""}
</div>`;
  }).join("");
  return `<section class="stats-section"><div class="wrap"><div class="stats-grid">${items}</div></div></section>`;
}

function renderGallery(images, copy) {
  if (!images.length) return "";
  const items = images.map(img => `<div class="gal-item sr-scale">
  <img src="${img.url}" alt="${img.alt || img.caption || "Foto"}" loading="lazy">
  ${img.caption ? `<div class="gal-caption">${img.caption}</div>` : ""}
</div>`).join("");
  return `<section class="gallery-section" id="galeria">
<div class="wrap">
  <div class="sh sr-fade">
    <div class="section-label">${copy.labelGallery}</div>
    <h2 class="section-title">${copy.titleGallery}</h2>
  </div>
  <div class="gal-grid">${items}</div>
</div>
</section>`;
}

// Avatar gradient palette — 8 pairs mapped by char code mod 8
const AVATAR_GRADIENTS = [
  ["#6366F1","#8B5CF6"], ["#EC4899","#F43F5E"], ["#0EA5E9","#06B6D4"],
  ["#10B981","#34D399"], ["#F59E0B","#FBBF24"], ["#8B5CF6","#A78BFA"],
  ["#EF4444","#F97316"], ["#3B82F6","#6366F1"],
];

function avatarGradient(name) {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  const [a, b] = AVATAR_GRADIENTS[idx];
  return `background:linear-gradient(135deg,${a},${b})`;
}

function renderTestimonials(depoimentos, copy) {
  if (!depoimentos || !depoimentos.length) return "";
  const cards = depoimentos.slice(0, 3).map(d => {
    const nome  = d.nome  || d.name  || "Cliente";
    const texto = d.texto || d.text  || d.quote  || "";
    return `<div class="testi-card sr-up">
  <div class="testi-quote">"</div>
  <p class="testi-text">${texto}</p>
  <div class="testi-author">
    <div class="testi-avatar" style="${avatarGradient(nome)}">${nome.charAt(0).toUpperCase()}</div>
    <div><div class="testi-name">${nome}</div><div class="stars">★★★★★</div></div>
  </div>
</div>`;
  }).join("");
  return `<section class="testimonials-section" id="depoimentos">
<div class="wrap">
  <div class="sh sr-fade">
    <div class="section-label">${copy.labelTestimonials}</div>
    <h2 class="section-title">${copy.titleTestimonials}</h2>
  </div>
  <div class="testi-grid">${cards}</div>
</div>
</section>`;
}

function renderDiferenciais(items) {
  if (!items || !items.length) return "";
  const blocks = items.slice(0, 3).map((item, i) => {
    const parts = typeof item === "string" ? item.split(":") : [item.title || "", item.desc || ""];
    const title = parts[0]?.trim() || "";
    const desc  = parts.slice(1).join(":").trim() || "";
    return `<div class="diff-block sr-up">
  <div class="diff-num">${i + 1}</div>
  <div><h3>${title}</h3><p>${desc}</p></div>
</div>`;
  }).join("");
  return `<section class="diff-section" id="diferenciais">
<div class="wrap">
  <div class="sh sr-fade">
    <div class="section-label">Por Que Nos Escolher</div>
    <h2 class="section-title">Nossos Diferenciais</h2>
  </div>
  <div class="diff-grid">${blocks}</div>
</div>
</section>`;
}

function renderProducts(products, d) {
  const active = (products || []).filter(p => p.is_active !== false);
  if (!active.length) return "";
  const cards = active.slice(0, 6).map(p => `<div class="prod-card sr-up" data-3d>
  ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" class="prod-img" loading="lazy">` : `<div class="prod-placeholder">🛍️</div>`}
  <div class="prod-body">
    <h3>${p.name}</h3>
    ${p.description ? `<p>${p.description}</p>` : ""}
    ${p.price ? `<div class="prod-price">R$ ${Number(p.price).toFixed(2).replace(".", ",")}</div>` : ""}
  </div>
</div>`).join("");
  return `<section class="products-section" id="produtos">
<div class="wrap">
  <div class="sh sr-fade">
    <div class="section-label">O Que Oferecemos</div>
    <h2 class="section-title">Nossos Produtos</h2>
  </div>
  <div class="prod-grid">${cards}</div>
</div>
</section>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildHTML(site) {
  const d         = getDesign(site.niche);
  const copy      = getNicheCopy(site.niche, site.city);
  const p         = d.palette;
  const flat      = site.site_content ?? {};
  const wa        = waLink(site.phone, site.business_name);
  const location  = [site.neighborhood, site.city].filter(Boolean).join(", ");
  const logoImg   = (site.images || []).find(i => i.type === "logo");

  // Content: prefer rich AI pages, fall back to flat
  const richHero  = findSection(site, ["hero", "hero_statement", "hero_story", "hero_social_proof"]);
  const headline  = richHero?.data?.headline  || flat.headline  || `${site.business_name} — ${site.niche}`;
  const heroCopy  = richHero?.data?.subheadline || flat.hero_copy || `Atendimento especializado em ${location || "sua cidade"}. Agende pelo WhatsApp!`;

  // Collect images for hero slider
  const heroImgs = getHeroImages(site);

  // Rich sections
  const svcItems    = getServicesItems(site);
  const stats       = getStats(site);
  const galleryImgs = getGalleryImages(site);
  const richTestis  = getRichTestimonials(site) || flat.depoimentos;

  const hasProducts   = (site.products || []).filter(p => p.is_active !== false).length > 0;
  const hasDiffs      = (flat.diferenciais || []).length > 0;
  const hasAbout      = !!flat.about_text;

  // Hero background: slider or gradient
  const heroBackground = heroImgs.length > 0
    ? heroImgs.map((url, i) => `<div class="hero-slide${i === 0 ? " active" : ""}" style="background-image:url('${url}')"></div>`).join("")
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="description" content="${site.niche} em ${location}. ${headline}">
  <meta property="og:title" content="${site.business_name}">
  <meta property="og:description" content="${heroCopy}">
  <title>${site.business_name} — ${site.niche}</title>
  ${buildFontLinks(site.niche)}
  <!-- Premium animation stack (deferred — zero render blocking) -->
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js" defer></script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --primary:${p.primary};--primary-fg:${p.primaryFg};
      --secondary:${p.secondary};--accent:${p.accent};--accent-fg:${p.accentFg};
      --bg:${p.background};--fg:${p.foreground};
      --card:${p.card};--card-fg:${p.cardForeground};
      --muted:${p.muted};--muted-fg:${p.mutedForeground};--bdr:${p.border};
      --p:${p.primary};--pl:${p.background};--pd:${p.foreground};
      --wa:#25D366;--wad:#128C7E;
      --txt:${p.foreground};--txt2:${p.mutedForeground};
      --font-h:${d.typography.cssHeading};--font-b:${d.typography.cssBody};
      --r:14px;--sh:0 2px 16px rgba(0,0,0,.08);--shl:0 12px 48px rgba(0,0,0,.18)
    }
    html{scroll-behavior:smooth}
    body{font-family:var(--font-b);color:var(--txt);background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased;cursor:none}
    h1,h2,h3{font-family:var(--font-h)}
    img{display:block;max-width:100%}
    a{color:inherit;text-decoration:none}
    .wrap{max-width:1160px;margin:0 auto;padding:0 24px}
    section{padding:96px 24px}
    .section-label{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--primary);margin-bottom:12px}
    .section-title{font-size:clamp(26px,4vw,44px);font-weight:800;line-height:1.15;letter-spacing:-.025em;margin-bottom:16px}
    .sh{margin-bottom:56px}
    /* ── Buttons ── */
    .btn{display:inline-flex;align-items:center;gap:9px;font-family:var(--font-b);font-size:15px;font-weight:700;border:none;cursor:none;border-radius:12px;padding:15px 30px;transition:transform .18s ease,box-shadow .18s ease;text-decoration:none;white-space:nowrap}
    .btn-wa{background:var(--wa);color:#fff;box-shadow:0 4px 24px rgba(37,211,102,.4)}
    .btn-wa:hover{background:var(--wad);transform:translateY(-2px);box-shadow:0 8px 32px rgba(37,211,102,.55)}
    .btn-ghost{background:rgba(255,255,255,.12);color:#fff;border:1.5px solid rgba(255,255,255,.35);backdrop-filter:blur(10px)}
    .btn-ghost:hover{background:rgba(255,255,255,.22)}
    /* ── Nav ── */
    .nav{position:fixed;top:0;left:0;right:0;z-index:200;height:66px;display:flex;align-items:center;justify-content:space-between;padding:0 36px;background:rgba(255,255,255,.93);backdrop-filter:blur(18px) saturate(180%);border-bottom:1px solid var(--bdr);transition:box-shadow .25s}
    .nav-brand{display:flex;align-items:center;gap:10px;font-family:var(--font-h);font-weight:800;font-size:17px;color:var(--primary)}
    .nav-logo{height:36px;width:auto;border-radius:6px}
    .nav-cta{font-size:13px;padding:10px 20px}
    /* ── Hero ── */
    .hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;padding:0}
    .hero-slides{position:absolute;inset:0;z-index:0}
    .hero-slide{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity 1.2s ease}
    .hero-slide.active{opacity:.45}
    .hero-gradient{position:absolute;inset:0;background:linear-gradient(145deg,var(--pd) 0%,var(--p) 55%,color-mix(in srgb,var(--p) 65%,#000) 100%);z-index:1}
    .hero-orb{position:absolute;border-radius:50%;pointer-events:none;z-index:2}
    .hero-orb-1{width:600px;height:600px;top:-200px;left:-150px;background:radial-gradient(circle,rgba(255,255,255,.07) 0%,transparent 70%)}
    .hero-orb-2{width:400px;height:400px;bottom:-150px;right:-100px;background:radial-gradient(circle,rgba(255,255,255,.05) 0%,transparent 70%)}
    .hero-inner{position:relative;z-index:3;max-width:820px;margin:0 auto;padding:120px 24px 96px}
    .hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.25);border-radius:100px;padding:7px 20px;font-size:13px;font-weight:600;color:#fff;margin-bottom:32px;backdrop-filter:blur(8px)}
    .hero h1{font-size:clamp(32px,6vw,68px);font-weight:900;line-height:1.08;letter-spacing:-.03em;margin-bottom:24px;color:#fff;overflow:hidden}
    .hero p{font-size:clamp(16px,2.2vw,20px);color:rgba(255,255,255,.82);max-width:580px;margin:0 auto 44px;font-family:var(--font-b)}
    .hero-btns{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
    .btn-wa-hero{font-size:17px;padding:20px 40px;border-radius:14px}
    /* ── Proof bar ── */
    .proof-bar{background:var(--muted);border-bottom:1px solid var(--bdr);padding:14px 24px;text-align:center}
    .proof-bar p{font-size:13px;font-weight:600;color:var(--fg);letter-spacing:.01em}
    /* ── Stats ── */
    .stats-section{background:var(--primary);padding:72px 24px}
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:40px;text-align:center}
    .stat-item{color:#fff}
    .stat-value{font-family:var(--font-h);font-size:clamp(40px,5vw,64px);font-weight:900;line-height:1;letter-spacing:-.03em;margin-bottom:8px}
    .stat-label{font-size:14px;font-weight:600;opacity:.85;text-transform:uppercase;letter-spacing:.08em}
    .stat-ctx{font-size:13px;opacity:.65;margin-top:6px;max-width:180px;margin-left:auto;margin-right:auto}
    /* ── Services ── */
    .services-section{background:#fff}
    .svc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:28px}
    .svc-card{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);transition:transform .25s ease,box-shadow .25s ease;will-change:transform}
    .svc-card:hover{box-shadow:var(--shl)}
    .svc-img-wrap{position:relative;overflow:hidden;height:200px}
    .svc-img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
    .svc-card:hover .svc-img{transform:scale(1.06)}
    .svc-img-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.35) 0%,transparent 60%)}
    .svc-icon{height:80px;display:flex;align-items:center;justify-content:center;font-size:36px;background:var(--muted)}
    .svc-body{padding:22px}
    .svc-body h3{font-size:17px;font-weight:700;margin-bottom:8px;color:var(--card-fg)}
    .svc-body p{font-size:14px;color:var(--muted-fg);line-height:1.65}
    /* ── Gallery ── */
    .gallery-section{background:var(--bg)}
    .gal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
    .gal-item{position:relative;overflow:hidden;border-radius:12px;aspect-ratio:4/3}
    .gal-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
    .gal-item:hover img{transform:scale(1.08)}
    .gal-caption{position:absolute;bottom:0;left:0;right:0;padding:14px 16px;background:linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 100%);color:#fff;font-size:12px;opacity:0;transition:opacity .3s}
    .gal-item:hover .gal-caption{opacity:1}
    /* ── Products ── */
    .products-section{background:#fff}
    .prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:24px}
    .prod-card{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);transition:transform .25s ease,box-shadow .25s ease;will-change:transform}
    .prod-card:hover{box-shadow:var(--shl)}
    .prod-img{width:100%;height:190px;object-fit:cover}
    .prod-placeholder{height:190px;display:flex;align-items:center;justify-content:center;font-size:52px;background:var(--muted)}
    .prod-body{padding:20px}
    .prod-body h3{font-size:16px;font-weight:700;margin-bottom:6px}
    .prod-body p{font-size:13px;color:var(--muted-fg);margin-bottom:10px}
    .prod-price{font-size:20px;font-weight:800;color:var(--accent)}
    /* ── Testimonials ── */
    .testimonials-section{background:var(--bg)}
    .testi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
    .testi-card{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);padding:36px 32px;box-shadow:var(--sh);position:relative;overflow:hidden}
    .testi-quote{position:absolute;top:10px;left:20px;font-size:80px;line-height:1;color:var(--muted);font-family:Georgia,serif;pointer-events:none}
    .testi-text{font-size:15px;line-height:1.8;padding-top:42px;margin-bottom:24px;color:var(--txt)}
    .testi-author{display:flex;align-items:center;gap:14px}
    .testi-avatar{width:44px;height:44px;border-radius:50%;background:var(--muted);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;flex-shrink:0}
    .testi-name{font-weight:700;font-size:14px}
    .stars{font-size:13px;color:#F59E0B;margin-top:2px}
    /* ── Diferenciais ── */
    .diff-section{background:#fff}
    .diff-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:40px}
    .diff-block{display:flex;gap:22px;align-items:flex-start}
    .diff-num{flex-shrink:0;width:48px;height:48px;background:var(--accent);color:var(--accent-fg);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-size:20px;font-weight:800;margin-top:2px}
    .diff-block h3{font-size:17px;font-weight:700;margin-bottom:8px}
    .diff-block p{font-size:15px;color:var(--muted-fg);line-height:1.65}
    /* ── About ── */
    .about-section{background:var(--bg)}
    .about-text{font-size:18px;line-height:1.85;max-width:760px;color:var(--txt)}
    /* ── CTA ── */
    .cta-section{background:linear-gradient(145deg,var(--pd) 0%,var(--p) 100%);color:#fff;text-align:center}
    .cta-section h2{font-size:clamp(28px,4vw,50px);font-weight:900;line-height:1.12;letter-spacing:-.025em;margin-bottom:18px}
    .cta-section p{font-size:18px;opacity:.85;max-width:500px;margin:0 auto 40px;font-family:var(--font-b)}
    .btn-wa-cta{font-size:18px;padding:22px 48px;border-radius:14px}
    .cta-note{margin-top:24px;font-size:13px;opacity:.65;display:flex;align-items:center;justify-content:center;gap:6px}
    /* ── Footer ── */
    footer{background:#0A0F1E;color:#94A3B8;padding:48px 24px;text-align:center}
    .footer-brand{font-family:var(--font-h);font-size:19px;font-weight:800;color:#fff;margin-bottom:8px}
    footer p{font-size:13px;margin-bottom:5px}
    footer a{color:var(--wa)}
    .footer-credit{margin-top:24px;font-size:11px;opacity:.3}
    /* ── WhatsApp float ── */
    .wa-float{position:fixed;bottom:28px;right:28px;z-index:999;width:64px;height:64px;border-radius:50%;background:var(--wa);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 28px rgba(37,211,102,.6);animation:wa-pulse 2.8s ease-in-out infinite}
    .wa-float:hover{transform:scale(1.1)}
    @keyframes wa-pulse{0%,100%{box-shadow:0 4px 28px rgba(37,211,102,.55)}50%{box-shadow:0 4px 48px rgba(37,211,102,.9)}}
    /* ── Custom cursor ── */
    @media(pointer:fine){
      .cursor-dot{position:fixed;top:0;left:0;width:8px;height:8px;background:var(--primary);border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%)}
      .cursor-ring{position:fixed;top:0;left:0;width:36px;height:36px;border:2px solid var(--primary);border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);opacity:.6;transition:width .2s,height .2s,opacity .2s}
    }
    /* ── Scroll reveals ── */
    .sr-up{opacity:0;transform:translateY(36px)}
    .sr-fade{opacity:0}
    .sr-scale{opacity:0;transform:scale(.94)}
    /* ── Responsive ── */
    @media(max-width:768px){section{padding:72px 20px}.nav{padding:0 20px}.testi-grid{grid-template-columns:1fr}.hero h1{font-size:clamp(28px,8vw,44px)}}
    @media(max-width:480px){.hero-btns{flex-direction:column;align-items:center}.btn-wa-hero,.btn-ghost{width:100%;justify-content:center}}
  </style>
</head>
<body>

<div class="cursor-dot"></div>
<div class="cursor-ring"></div>

<nav class="nav">
  <span class="nav-brand">
    ${logoImg ? `<img src="${logoImg.public_url || logoImg.url}" alt="${site.business_name}" class="nav-logo">` : ""}
    ${site.business_name}
  </span>
  <a class="btn btn-wa nav-cta" href="${wa}" target="_blank" rel="noopener noreferrer">${WA_SVG} WhatsApp</a>
</nav>

<section class="hero">
  ${heroImgs.length > 0 ? `<div class="hero-slides">${heroBackground}</div>` : ""}
  <div class="hero-gradient" data-parallax></div>
  <div class="hero-orb hero-orb-1"></div>
  <div class="hero-orb hero-orb-2"></div>
  <div class="hero-inner">
    <div class="hero-badge"><span>${d.emoji}</span><span>${site.niche}${location ? ` · ${location}` : ""}</span></div>
    <h1 data-split-words>${headline}</h1>
    <p>${heroCopy}</p>
    <div class="hero-btns">
      <a class="btn btn-wa btn-wa-hero" href="${wa}" target="_blank" rel="noopener noreferrer">${WA_SVG} Agendar pelo WhatsApp</a>
      <a class="btn btn-ghost" href="#servicos">Ver Serviços ↓</a>
    </div>
  </div>
</section>

${location ? `<div class="proof-bar"><p>${copy.proofBar.replace("{city}", location)}</p></div>` : ""}

${stats.length > 0 ? renderStats(stats) : ""}

${svcItems.length > 0 ? renderServices(svcItems, d, copy) : ""}

${hasProducts ? renderProducts(site.products, d) : ""}

${galleryImgs.length > 0 ? renderGallery(galleryImgs, copy) : ""}

${hasDiffs ? renderDiferenciais(flat.diferenciais) : ""}

${renderTestimonials(richTestis, copy)}

${hasAbout ? `<section class="about-section" id="sobre">
<div class="wrap">
  <div class="sh sr-fade">
    <div class="section-label">Sobre Nós</div>
    <h2 class="section-title">${site.business_name}</h2>
  </div>
  <p class="about-text sr-up">${flat.about_text}</p>
</div>
</section>` : ""}

<section class="cta-section" id="contato">
  <div class="wrap">
    <h2 class="sr-up">${copy.ctaHeadline}</h2>
    <p class="sr-up">${copy.ctaBody}</p>
    <a class="btn btn-wa btn-wa-cta sr-up" href="${wa}" target="_blank" rel="noopener noreferrer">${WA_SVG} Falar no WhatsApp Agora</a>
    ${location ? `<div class="cta-note sr-up">📍 ${location} · Atendemos você hoje</div>` : ""}
  </div>
</section>

<footer>
  <div class="footer-brand">${site.business_name}</div>
  <p>${site.niche}${location ? ` · ${location}` : ""}</p>
  ${site.phone ? `<p><a href="${wa}" target="_blank" rel="noopener">📱 ${site.phone}</a></p>` : ""}
  ${flat.contact_email ? `<p>✉️ ${flat.contact_email}</p>` : ""}
</footer>

<a class="wa-float" href="${wa}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">${WA_SVG}</a>

</body>
</html>`;
}
