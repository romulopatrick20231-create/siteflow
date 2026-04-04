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
  // 1. User-uploaded banner
  for (const img of (site.images || [])) {
    if (img.type === "banner" && (img.public_url || img.url)) {
      imgs.push(img.public_url || img.url);
    }
  }
  // 2. Gallery images (already objects)
  const gallery = findSection(site, ["image_gallery", "image_grid"]);
  for (const img of (gallery?.data?.images || [])) {
    if (img?.url && !imgs.includes(img.url)) imgs.push(img.url);
    if (imgs.length >= 5) break;
  }
  // 3. Service item images
  for (const item of getServicesItems(site)) {
    const url = item?.image?.url || (typeof item?.image === "string" ? item.image : null);
    if (url && !imgs.includes(url)) imgs.push(url);
    if (imgs.length >= 5) break;
  }
  // 4. Menu featured items
  if (imgs.length < 5) {
    const mf = findSection(site, ["menu_featured"]);
    for (const item of (mf?.data?.featured_items || [])) {
      const url = item?.image?.url || (typeof item?.image === "string" ? item.image : null);
      if (url && !imgs.includes(url)) imgs.push(url);
      if (imgs.length >= 5) break;
    }
  }
  // 5. Menu category items
  if (imgs.length < 5) {
    const mc = findSection(site, ["menu_categories"]);
    for (const cat of (mc?.data?.categories || [])) {
      for (const item of (cat.items || [])) {
        const url = item?.image?.url || (typeof item?.image === "string" ? item.image : null);
        if (url && !imgs.includes(url)) imgs.push(url);
        if (imgs.length >= 5) break;
      }
      if (imgs.length >= 5) break;
    }
  }
  // 6. Imóveis listings
  if (imgs.length < 5) {
    for (const page of (site.content?.pages || [])) {
      for (const s of (page.sections || [])) {
        if (s.type === "imoveis_grid") {
          for (const listing of (s.data?.listings || [])) {
            const url = listing?.image?.url;
            if (url && !imgs.includes(url)) imgs.push(url);
            if (imgs.length >= 5) break;
          }
        }
      }
      if (imgs.length >= 5) break;
    }
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

function getMenuData(site) {
  const featured   = findSection(site, ["menu_featured"]);
  const categories = findSection(site, ["menu_categories"]);
  const locHours   = findSection(site, ["location_hours"]);
  const highlight  = findSection(site, ["highlight_bar"]);
  return {
    featured:   featured?.data   || null,
    categories: categories?.data || null,
    location:   locHours?.data   || null,
    highlight:  highlight?.data  || null,
    hasMenu:    !!(featured?.data || categories?.data),
  };
}

function getImoveisData(site) {
  // Collect imoveis_grid sections from all pages
  const all = [];
  for (const page of (site.content?.pages || [])) {
    for (const s of (page.sections || [])) {
      if (s.type === "imoveis_grid" && Array.isArray(s.data?.listings)) {
        all.push(...s.data.listings);
      }
    }
  }
  if (!all.length) return null;
  return all;
}

function getContentProducts(site) {
  const s = findSection(site, ["products_grid"]);
  if (!s) return null;
  return s.data || null;
}

function getPricingTable(site) {
  const s = findSection(site, ["pricing_table"]);
  if (!s) return null;
  return s.data || null;
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

function renderTestimonials(depoimentos, copy, isDark) {
  if (!depoimentos || !depoimentos.length) return "";
  const darkClass = isDark ? " testimonials-dark" : "";
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
  return `<section class="testimonials-section${darkClass}" id="depoimentos">
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

function renderHighlightBar(data) {
  if (!data?.items?.length) return "";
  const items = data.items.map(item => `<div class="highlight-item"><span>${item.icon || "✦"}</span><span>${item.text}</span></div>`).join("");
  return `<div class="highlight-bar"><div class="highlight-items">${items}</div></div>`;
}

function renderMenuFull(menuData, copy, wa, isDark) {
  if (!menuData.hasMenu) return "";
  const darkClass = isDark ? " menu-section-dark" : "";
  const parts = [];

  // Featured dishes
  if (menuData.featured?.featured_items?.length) {
    const fd = menuData.featured;
    const cards = fd.featured_items.map(item => {
      const imgUrl = item?.image?.url || (typeof item?.image === "string" ? item.image : null);
      const price = item.price || "";
      return `<div class="feat-card sr-up" data-3d>
  ${imgUrl ? `<img src="${imgUrl}" alt="${item.name}" class="feat-img" loading="lazy">` : `<div class="feat-no-img">🍽️</div>`}
  <div class="feat-body">
    <div class="feat-row">
      <div class="feat-name">${item.name}</div>
      ${item.badge ? `<span class="menu-badge">${item.badge}</span>` : ""}
    </div>
    <p class="feat-desc">${item.description || ""}</p>
    <div class="feat-footer">
      <div class="feat-price">${price}</div>
      <button class="add-btn" data-item-name="${item.name}" data-item-price="${item.price || ""}" onclick="CartSystem.add(this)">+ Pedir</button>
    </div>
  </div>
</div>`;
    }).join("");

    parts.push(`<div class="sh sr-fade">
  <div class="section-label">${copy.labelMenu || "Cardápio"}</div>
  <h2 class="section-title">${fd.title || copy.titleServices || "Destaques da Casa"}</h2>
  ${fd.subtitle ? `<p style="color:var(--muted-fg);font-size:16px;max-width:600px">${fd.subtitle}</p>` : ""}
</div>
<div class="featured-grid">${cards}</div>`);
  }

  // Category tabs
  if (menuData.categories?.categories?.length) {
    const cats = menuData.categories.categories;
    const tabBtns = cats.map((cat, i) => `<button class="menu-tab-btn${i === 0 ? " active" : ""}" data-cat="${i}">${cat.name}</button>`).join("");
    const catSections = cats.map((cat, i) => {
      const items = (cat.items || []).map(item => {
        const imgUrl = item?.image?.url || (typeof item?.image === "string" ? item.image : null);
        return `<div class="menu-card">
  ${imgUrl ? `<div class="menu-card-img-wrap"><img src="${imgUrl}" alt="${item.name}" class="menu-card-img" loading="lazy"></div>` : `<div class="menu-card-no-img">🍽️</div>`}
  <div class="menu-card-body">
    <div>
      <div class="menu-card-name">${item.name}${item.highlight ? ' <span class="menu-badge">Popular</span>' : ""}</div>
      <p class="menu-card-desc">${item.description || ""}</p>
    </div>
    <div class="menu-card-footer">
      <div class="menu-price">${item.price || ""}</div>
      <button class="add-btn" data-item-name="${item.name}" data-item-price="${item.price || ""}" onclick="CartSystem.add(this)">+ Pedir</button>
    </div>
  </div>
</div>`;
      }).join("");
      return `<div class="menu-cat${i === 0 ? " active" : ""}" data-cat="${i}">
  <div class="menu-cat-title">${cat.name}</div>
  <div class="menu-grid">${items}</div>
</div>`;
    }).join("");

    parts.push(`<div class="menu-tabs-wrap" id="menu-tabs">${tabBtns}</div>
<div id="menu-cats">${catSections}</div>`);
  }

  if (!parts.length) return "";

  return `<section class="menu-section${darkClass}" id="cardapio">
<div class="wrap">${parts.join("")}</div>
</section>`;
}

function renderLocationHours(data, wa, businessName) {
  if (!data) return "";
  const hours = data.hours || {};
  const hourRows = Object.entries(hours).map(([key, val]) => {
    const labels = { weekdays: "Seg–Sex", saturday: "Sábado", sunday: "Domingo" };
    return `<div class="hours-row"><span class="hours-day">${labels[key] || key}</span><span class="hours-time">${val}</span></div>`;
  }).join("");

  return `<section class="location-section" id="localizacao">
<div class="wrap">
  <div class="sh sr-fade">
    <div class="section-label">Onde Estamos</div>
    <h2 class="section-title">${data.title || "Localização e Horários"}</h2>
  </div>
  <div class="location-grid">
    <div class="location-map-placeholder">
      <span>📍</span>
      <p>${data.address || ""}<br>${data.neighborhood ? data.neighborhood + ", " : ""}${data.city || ""}</p>
      ${wa ? `<a class="imovel-cta" href="${wa}" target="_blank">Ver no Mapa</a>` : ""}
    </div>
    <div class="location-info">
      ${data.address ? `<div class="location-row"><span class="location-icon">📍</span><div class="location-text"><strong>Endereço</strong>${data.address}${data.neighborhood ? ", " + data.neighborhood : ""}${data.city ? " — " + data.city : ""}</div></div>` : ""}
      ${data.parking ? `<div class="location-row"><span class="location-icon">🅿️</span><div class="location-text"><strong>Estacionamento</strong>${data.parking}</div></div>` : ""}
      ${data.nearby_reference ? `<div class="location-row"><span class="location-icon">🗺️</span><div class="location-text"><strong>Referência</strong>${data.nearby_reference}</div></div>` : ""}
      ${hourRows ? `<div class="location-row"><span class="location-icon">🕐</span><div class="location-text"><strong>Horário de Funcionamento</strong><div class="hours-grid">${hourRows}</div></div></div>` : ""}
    </div>
  </div>
</div>
</section>`;
}

function renderImoveisFull(listings, copy, wa, businessName) {
  if (!listings?.length) return "";

  const cards = listings.map(listing => {
    const imgUrl = listing?.image?.url;
    const waMsg = encodeURIComponent(`Olá! Vi o imóvel "${listing.name}" no site da ${businessName} e gostaria de mais informações.`);
    const waHref = wa.split("?")[0] + `?text=${waMsg}`;
    return `<div class="imovel-card sr-up" data-tipo="${listing.tipo || "todos"}" data-neighborhood="${(listing.neighborhood || "").toLowerCase()}">
  <div class="imovel-img-wrap">
    ${imgUrl ? `<img src="${imgUrl}" alt="${listing.name}" class="imovel-img" loading="lazy">` : `<div class="imovel-no-img">🏠</div>`}
    <span class="imovel-tag imovel-tag-${listing.tipo || "comprar"}">${listing.tipo === "alugar" ? "Alugar" : "Comprar"}</span>
    ${listing.highlight ? `<span class="imovel-tag imovel-tag-highlight" style="top:12px;right:12px;left:auto">${listing.tag || "Destaque"}</span>` : ""}
  </div>
  <div class="imovel-body">
    <div class="imovel-categoria">${listing.categoria || "Imóvel"}</div>
    <div class="imovel-name">${listing.name}</div>
    ${listing.neighborhood ? `<div class="imovel-neighborhood">📍 ${listing.neighborhood}</div>` : ""}
    <div class="imovel-details">
      ${listing.quartos ? `<span class="imovel-detail">🛏 ${listing.quartos} quarto${listing.quartos > 1 ? "s" : ""}</span>` : ""}
      ${listing.banheiros ? `<span class="imovel-detail">🚿 ${listing.banheiros} banheiro${listing.banheiros > 1 ? "s" : ""}</span>` : ""}
      ${listing.vagas ? `<span class="imovel-detail">🚗 ${listing.vagas} vaga${listing.vagas > 1 ? "s" : ""}</span>` : ""}
    </div>
    <div class="imovel-footer">
      <div>
        <div class="imovel-price">${listing.price}</div>
        ${listing.area ? `<div class="imovel-area">${listing.area}</div>` : ""}
      </div>
      <a class="imovel-cta" href="${waHref}" target="_blank">Ver Imóvel</a>
    </div>
  </div>
</div>`;
  }).join("");

  const hasComprar = listings.some(l => l.tipo === "comprar");
  const hasAlugar  = listings.some(l => l.tipo === "alugar");

  return `<section class="imoveis-section" id="imoveis">
<div class="wrap">
  <div class="sh sr-fade">
    <div class="section-label">${copy.labelImoveis || "Imóveis"}</div>
    <h2 class="section-title">${listings[0]?.title || "Imóveis Disponíveis"}</h2>
  </div>
  <div class="imoveis-top">
    <div class="imoveis-filters">
      <button class="imoveis-filter-btn active" data-filter="todos">Todos</button>
      ${hasComprar ? `<button class="imoveis-filter-btn" data-filter="comprar">${copy.labelComprar || "Comprar"}</button>` : ""}
      ${hasAlugar  ? `<button class="imoveis-filter-btn" data-filter="alugar">${copy.labelAlugar || "Alugar"}</button>` : ""}
    </div>
    <div class="imoveis-search">
      <span>🔍</span>
      <input type="text" id="imoveis-search-input" placeholder="Buscar por bairro...">
    </div>
  </div>
  <div class="imoveis-grid" id="imoveis-grid">${cards}</div>
</div>
</section>`;
}

function renderContentProducts(data, copy) {
  if (!data?.featured?.length) return "";
  const categories = data.categories || [];
  const filterBtns = categories.length > 0
    ? `<button class="content-prod-filter-btn active" data-cat="todos">Todos</button>${categories.map(c => `<button class="content-prod-filter-btn" data-cat="${c.toLowerCase()}">${c}</button>`).join("")}`
    : "";

  const cards = data.featured.map(item => {
    const imgUrl = item?.image?.url || (typeof item?.image === "string" ? item.image : null);
    return `<div class="content-prod-card" data-cat="${(item.category || "").toLowerCase()}">
  ${imgUrl ? `<img src="${imgUrl}" alt="${item.name}" class="content-prod-img" loading="lazy">` : `<div class="content-prod-no-img">🐾</div>`}
  <div class="content-prod-body">
    ${item.category ? `<div class="content-prod-cat">${item.category}</div>` : ""}
    <div class="content-prod-name">${item.name}</div>
    ${item.description ? `<p class="content-prod-desc">${item.description}</p>` : ""}
  </div>
</div>`;
  }).join("");

  return `<section class="content-prod-section" id="produtos-catalogo">
<div class="wrap">
  <div class="sh sr-fade">
    <div class="section-label">Produtos</div>
    <h2 class="section-title">${data.title || "Nosso Catálogo"}</h2>
    ${data.subtitle ? `<p style="color:var(--muted-fg);font-size:16px;max-width:600px">${data.subtitle}</p>` : ""}
  </div>
  ${filterBtns ? `<div class="content-prod-filters" id="prod-filters">${filterBtns}</div>` : ""}
  <div class="content-prod-grid" id="prod-grid">${cards}</div>
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

  // Collect available content for smart nav
  const menuData      = getMenuData(site);
  const imoveisData   = getImoveisData(site);
  const contentProds  = getContentProducts(site);
  const locationData  = menuData.location;
  const highlightData = menuData.highlight;
  const pricingData   = getPricingTable(site);
  const isRestaurante = ["Restaurante","Pizzaria","Padaria","Hamburgueria"].includes(site.niche);
  const isPetshop     = site.niche === "Clínica Veterinária" || site.niche?.toLowerCase().includes("pet");
  const isImobiliaria = site.niche === "Imobiliária";

  // Build smart nav links
  const NAV_ITEMS = [
    { label: "Início",       href: "#inicio",          always: true },
    { label: copy.labelMenu || "Cardápio", href: "#cardapio",  show: menuData.hasMenu },
    { label: "Imóveis",      href: "#imoveis",         show: !!imoveisData?.length },
    { label: "Serviços",     href: "#servicos",         show: svcItems.length > 0 && !menuData.hasMenu },
    { label: "Produtos",     href: "#produtos",         show: hasProducts },
    { label: "Catálogo",     href: "#produtos-catalogo",show: !!contentProds?.featured?.length && !hasProducts },
    { label: "Galeria",      href: "#galeria",          show: galleryImgs.length > 0 },
    { label: "Localização",  href: "#localizacao",      show: !!locationData },
    { label: "Depoimentos",  href: "#depoimentos",      show: !!(richTestis?.length) },
    { label: "Contato",      href: "#contato",          always: true },
  ];
  const navLinks = NAV_ITEMS
    .filter(i => i.always || i.show)
    .map(i => `<a class="nav-link" href="${i.href}">${i.label}</a>`)
    .join("");

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
    body{font-family:var(--font-b);color:var(--txt);background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased}
    h1,h2,h3{font-family:var(--font-h)}
    img{display:block;max-width:100%}
    a{color:inherit;text-decoration:none}
    .wrap{max-width:1160px;margin:0 auto;padding:0 24px}
    section{padding:96px 24px}
    .section-label{display:inline-flex;align-items:center;gap:10px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--primary);margin-bottom:16px}
    .section-label::before{content:"";width:28px;height:2px;background:var(--primary);flex-shrink:0}
    .section-title{font-size:clamp(30px,4.5vw,56px);font-weight:800;line-height:1.08;letter-spacing:-.03em;margin-bottom:16px}
    .sh{margin-bottom:56px}
    /* ── Buttons ── */
    .btn{display:inline-flex;align-items:center;gap:9px;font-family:var(--font-b);font-size:15px;font-weight:700;border:none;cursor:pointer;border-radius:12px;padding:15px 30px;transition:transform .18s ease,box-shadow .18s ease;text-decoration:none;white-space:nowrap}
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
    .hero-slide.active{opacity:.65}
    .hero-gradient{position:absolute;inset:0;background:linear-gradient(145deg,var(--pd) 0%,var(--p) 55%,color-mix(in srgb,var(--p) 65%,#000) 100%);z-index:1}
    .hero-orb{position:absolute;border-radius:50%;pointer-events:none;z-index:2}
    .hero-orb-1{width:600px;height:600px;top:-200px;left:-150px;background:radial-gradient(circle,rgba(255,255,255,.07) 0%,transparent 70%)}
    .hero-orb-2{width:400px;height:400px;bottom:-150px;right:-100px;background:radial-gradient(circle,rgba(255,255,255,.05) 0%,transparent 70%)}
    .hero-inner{position:relative;z-index:3;max-width:820px;margin:0 auto;padding:120px 24px 96px}
    .hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.25);border-radius:100px;padding:7px 20px;font-size:13px;font-weight:600;color:#fff;margin-bottom:32px;backdrop-filter:blur(8px)}
    .hero h1{font-size:clamp(48px,8vw,100px);font-weight:900;line-height:.97;letter-spacing:-.025em;margin-bottom:24px;color:#fff;overflow:hidden;text-transform:uppercase}
    .hero p{font-size:clamp(16px,2.2vw,20px);color:rgba(255,255,255,.82);max-width:580px;margin:0 auto 44px;font-family:var(--font-b)}
    .hero-btns{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
    .btn-wa-hero{font-size:16px;padding:18px 36px;border-radius:12px}
    .hero-food .btn-wa-hero{font-size:17px;padding:20px 44px;border-radius:12px;letter-spacing:.02em}
    /* ── Food hero split layout ── */
    .hero-food{background:#0D0D0D}
    .hero-food .hero-gradient{background:linear-gradient(to right,rgba(0,0,0,.98) 0%,rgba(0,0,0,.93) 38%,rgba(0,0,0,.65) 62%,rgba(0,0,0,.12) 100%)}
    .hero-food .hero-slide.active{opacity:.18}
    .hero-food-inner{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;max-width:1240px;margin:0 auto;padding:136px 48px 100px;position:relative;z-index:3}
    .hero-text-left{text-align:left}
    .hero-text-left h1{font-size:clamp(60px,9.5vw,124px);color:#fff;line-height:.9;letter-spacing:-.015em;text-transform:uppercase;margin-bottom:18px;text-align:left;font-weight:900;overflow:hidden}
    .hero-text-left p{text-align:left;max-width:460px;margin:0 0 40px;font-size:17px;line-height:1.65}
    .hero-text-left .hero-btns{justify-content:flex-start}
    .hero-food-side{position:relative;display:flex;align-items:center;justify-content:center;min-height:460px}
    .hero-food-glow{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(189,31,23,.3) 0%,rgba(189,31,23,.08) 48%,transparent 70%);pointer-events:none;animation:glow-breathe 4.5s ease-in-out infinite}
    .hero-food-img-wrap{position:relative;z-index:1;width:420px;height:420px;border-radius:50%;overflow:hidden;box-shadow:0 0 90px rgba(189,31,23,.38),0 52px 100px rgba(0,0,0,.85);animation:food-float 5.5s ease-in-out infinite}
    .hero-food-img{width:100%;height:100%;object-fit:cover}
    .hero-food-no-img{width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(189,31,23,.38),rgba(13,13,13,.9));display:flex;align-items:center;justify-content:center;font-size:130px;animation:food-float 5.5s ease-in-out infinite;box-shadow:0 0 90px rgba(189,31,23,.35),0 52px 100px rgba(0,0,0,.85)}
    .hero-food-ring{position:absolute;inset:-16px;border-radius:50%;border:1.5px solid rgba(189,31,23,.55);animation:ring-pulse 3.5s ease-in-out infinite;z-index:2;pointer-events:none}
    .hero-food-ring-2{position:absolute;inset:-36px;border-radius:50%;border:1px solid rgba(189,31,23,.2);animation:ring-pulse 3.5s ease-in-out infinite .85s;z-index:2;pointer-events:none}
    @keyframes food-float{0%,100%{transform:translateY(0) rotate(-2.5deg) scale(1)}50%{transform:translateY(-24px) rotate(2.5deg) scale(1.02)}}
    @keyframes ring-pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.85;transform:scale(1.06)}}
    @keyframes glow-breathe{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.14);opacity:1}}
    @media(max-width:960px){.hero-food-inner{grid-template-columns:1fr;padding:110px 28px 72px;text-align:center}.hero-text-left h1,.hero-text-left p,.hero-text-left .hero-btns{text-align:center}.hero-text-left p{margin-left:auto;margin-right:auto}.hero-text-left .hero-btns{justify-content:center}.hero-food-side{display:none}}
    /* ── Dark nav ── */
    .nav-dark{background:rgba(7,7,7,.93)!important;border-bottom:1px solid rgba(255,255,255,.07)!important}
    .nav-dark .nav-brand{color:#fff}
    .nav-dark .nav-link{color:rgba(255,255,255,.62)}
    .nav-dark .nav-link:hover,.nav-dark .nav-link.active{background:rgba(255,255,255,.07);color:#fff}
    .nav-dark .nav-hamburger{color:rgba(255,255,255,.8)}
    .nav-mobile-dark{background:rgba(7,7,7,.97)!important;border-bottom:1px solid rgba(255,255,255,.06)!important}
    .nav-mobile-dark .nav-link{color:rgba(255,255,255,.75)}
    .nav-mobile-dark .nav-link:hover{background:rgba(255,255,255,.06);color:#fff}
    /* ── Proof bar ── */
    .proof-bar{background:var(--muted);border-bottom:1px solid var(--bdr);padding:14px 24px;text-align:center}
    .proof-bar p{font-size:13px;font-weight:600;color:var(--fg);letter-spacing:.01em}
    /* ── Stats ── */
    .stats-section{background:var(--primary);padding:80px 24px;position:relative;overflow:hidden}
    .stats-section::before{content:"";position:absolute;top:-1px;left:0;right:0;height:64px;background:inherit;clip-path:polygon(0 0,100% 0,100% 100%,0 30%)}
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:40px;text-align:center;position:relative;z-index:1}
    .stat-item{color:#fff}
    .stat-value{font-family:var(--font-h);font-size:clamp(48px,6vw,80px);font-weight:900;line-height:1;letter-spacing:-.03em;margin-bottom:8px}
    .stat-label{font-size:13px;font-weight:700;opacity:.8;text-transform:uppercase;letter-spacing:.1em}
    .stat-ctx{font-size:12px;opacity:.58;margin-top:6px;max-width:180px;margin-left:auto;margin-right:auto}
    /* ── Services ── */
    .services-section{background:#fff}
    .svc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:28px}
    .svc-card{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);transition:transform .25s ease,box-shadow .25s ease;will-change:transform}
    .svc-card:hover{box-shadow:0 20px 64px rgba(0,0,0,.18),0 0 0 1.5px var(--primary)}
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
    .testimonials-dark{background:#0a0a0a}
    .testimonials-dark .section-label{color:var(--primary)}
    .testimonials-dark .section-title{color:#fff}
    .testimonials-dark .testi-card{background:#161616;border-color:rgba(255,255,255,.07)}
    .testimonials-dark .testi-quote{color:rgba(255,255,255,.06)}
    .testimonials-dark .testi-text{color:rgba(255,255,255,.78)}
    .testimonials-dark .testi-name{color:#fff}
    .testimonials-dark .testi-avatar{border:1.5px solid rgba(255,255,255,.12)}
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
    .cta-section{background:linear-gradient(145deg,var(--pd) 0%,var(--p) 100%);color:#fff;text-align:center;position:relative;overflow:hidden}
    .cta-section::before{content:"";position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");pointer-events:none}
    .cta-section h2{font-size:clamp(32px,5vw,64px);font-weight:900;line-height:1.05;letter-spacing:-.025em;margin-bottom:18px;text-transform:uppercase;position:relative}
    .cta-section p{font-size:18px;opacity:.82;max-width:500px;margin:0 auto 44px;font-family:var(--font-b);position:relative}
    .btn-wa-cta{font-size:18px;padding:22px 52px;border-radius:12px;position:relative;letter-spacing:.02em}
    .cta-note{margin-top:24px;font-size:13px;opacity:.6;display:flex;align-items:center;justify-content:center;gap:6px;position:relative}
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
    /* ── Nav links ── */
    .nav-links{display:flex;align-items:center;gap:4px}
    .nav-link{font-size:13px;font-weight:600;color:var(--fg);padding:7px 14px;border-radius:8px;transition:background .18s,color .18s;white-space:nowrap}
    .nav-link:hover,.nav-link.active{background:var(--muted);color:var(--primary)}
    .nav-hamburger{display:none;background:none;border:none;cursor:pointer;padding:8px;color:var(--fg)}
    .nav-hamburger span{display:block;width:22px;height:2px;background:currentColor;margin:4px 0;transition:transform .2s}
    .nav-mobile{display:none;position:fixed;top:66px;left:0;right:0;background:rgba(255,255,255,.97);backdrop-filter:blur(18px);border-bottom:1px solid var(--bdr);z-index:199;padding:16px 24px;flex-direction:column;gap:4px}
    .nav-mobile.open{display:flex}
    .nav-mobile .nav-link{font-size:15px;padding:12px 16px}
    @media(max-width:768px){.nav-links{display:none}.nav-hamburger{display:block}}
    /* ── Highlight bar (restaurant info strip) ── */
    .highlight-bar{background:var(--primary);color:#fff;padding:14px 24px;overflow-x:auto}
    .highlight-items{display:flex;gap:32px;justify-content:center;min-width:max-content;margin:0 auto}
    .highlight-item{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;white-space:nowrap}
    /* ── Menu section ── */
    .menu-section{background:#fff}
    .menu-section-dark{background:#0f0f0f;color:#fff}
    .menu-section-dark .menu-cat-title{color:rgba(255,255,255,.85);border-bottom-color:rgba(255,255,255,.08)}
    .menu-section-dark .menu-card{background:#1a1a1a;border-color:rgba(255,255,255,.07)}
    .menu-section-dark .menu-card:hover{box-shadow:0 12px 40px rgba(0,0,0,.5),0 0 0 1.5px var(--primary)}
    .menu-section-dark .menu-card-name{color:#fff}
    .menu-section-dark .menu-card-desc{color:rgba(255,255,255,.5)}
    .menu-section-dark .feat-card{background:#1a1a1a;border-color:rgba(255,255,255,.07)}
    .menu-section-dark .feat-name{color:#fff}
    .menu-section-dark .feat-desc{color:rgba(255,255,255,.5)}
    .menu-section-dark .menu-tab-btn{background:#1a1a1a;border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.55)}
    .menu-section-dark .menu-tab-btn.active{background:var(--primary);color:#fff;border-color:var(--primary)}
    .menu-section-dark .section-label{color:var(--primary)}
    .menu-section-dark .section-title{color:#fff}
    .menu-section-dark .feat-price{color:var(--accent)}
    .menu-section-dark .menu-price{color:var(--accent)}
    .menu-tabs-wrap{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:40px;scrollbar-width:none}
    .menu-tabs-wrap::-webkit-scrollbar{display:none}
    .menu-tab-btn{flex-shrink:0;padding:9px 22px;border-radius:100px;border:2px solid var(--bdr);background:#fff;font-size:13px;font-weight:700;color:var(--muted-fg);cursor:pointer;transition:all .18s;white-space:nowrap}
    .menu-tab-btn.active,.menu-tab-btn:hover{background:var(--primary);color:var(--primary-fg);border-color:var(--primary)}
    .menu-cat{display:none}
    .menu-cat.active{display:block}
    .menu-cat-title{font-size:19px;font-weight:800;color:var(--fg);margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid var(--bdr)}
    .menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-bottom:40px}
    .menu-card{display:flex;gap:16px;background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);overflow:hidden;transition:box-shadow .2s;align-items:stretch}
    .menu-card:hover{box-shadow:var(--shl)}
    .menu-card-img-wrap{flex-shrink:0;width:110px;overflow:hidden}
    .menu-card-img{width:110px;height:100%;object-fit:cover;transition:transform .4s}
    .menu-card:hover .menu-card-img{transform:scale(1.06)}
    .menu-card-no-img{width:110px;background:var(--muted);display:flex;align-items:center;justify-content:center;font-size:36px}
    .menu-card-body{flex:1;padding:16px 16px 16px 0;display:flex;flex-direction:column;justify-content:space-between}
    .menu-card-name{font-size:15px;font-weight:700;margin-bottom:4px}
    .menu-card-desc{font-size:13px;color:var(--muted-fg);line-height:1.5;margin-bottom:10px;flex:1}
    .menu-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .menu-price{font-size:16px;font-weight:800;color:var(--primary)}
    .menu-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;background:var(--accent);color:var(--accent-fg);white-space:nowrap}
    .add-btn{flex-shrink:0;padding:7px 16px;border-radius:8px;background:var(--primary);color:var(--primary-fg);border:none;font-size:12px;font-weight:700;cursor:pointer;transition:transform .15s,background .15s;white-space:nowrap}
    .add-btn:hover{background:var(--accent);transform:scale(1.04)}
    .add-btn:active{transform:scale(.96)}
    /* ── Featured dishes ── */
    .featured-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:24px;margin-bottom:48px}
    .feat-card{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);transition:box-shadow .2s,transform .2s}
    .feat-card:hover{box-shadow:0 24px 72px rgba(0,0,0,.22),0 0 0 1.5px var(--primary);transform:translateY(-5px)}
    .feat-img{width:100%;height:200px;object-fit:cover;transition:transform .5s}
    .feat-card:hover .feat-img{transform:scale(1.05)}
    .feat-no-img{height:200px;display:flex;align-items:center;justify-content:center;font-size:52px;background:var(--muted)}
    .feat-body{padding:20px}
    .feat-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
    .feat-name{font-size:16px;font-weight:800}
    .feat-desc{font-size:13px;color:var(--muted-fg);line-height:1.6;margin-bottom:14px}
    .feat-footer{display:flex;align-items:center;justify-content:space-between}
    .feat-price{font-size:19px;font-weight:900;color:var(--primary)}
    /* ── Cart ── */
    .cart-float{position:fixed;bottom:28px;left:28px;z-index:999;width:64px;height:64px;border-radius:50%;background:var(--primary);color:var(--primary-fg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 28px rgba(0,0,0,.25);cursor:pointer;border:none;transition:transform .2s}
    .cart-float:hover{transform:scale(1.1)}
    .cart-float svg{width:26px;height:26px}
    .cart-count{position:absolute;top:-4px;right:-4px;width:22px;height:22px;background:var(--accent);color:var(--accent-fg);border-radius:50%;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;display:none}
    .cart-count.show{display:flex}
    .cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:998;opacity:0;pointer-events:none;transition:opacity .25s}
    .cart-overlay.open{opacity:1;pointer-events:auto}
    .cart-drawer{position:fixed;top:0;right:-420px;width:min(420px,100vw);height:100vh;background:#fff;z-index:999;box-shadow:-4px 0 40px rgba(0,0,0,.18);transition:right .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column}
    .cart-drawer.open{right:0}
    .cart-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--bdr)}
    .cart-header h3{font-size:17px;font-weight:800}
    .cart-close{background:none;border:none;font-size:22px;cursor:pointer;color:var(--muted-fg);padding:4px}
    .cart-items{flex:1;overflow-y:auto;padding:20px 24px}
    .cart-empty-msg{text-align:center;color:var(--muted-fg);padding:48px 0;font-size:14px}
    .cart-item-row{display:flex;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid var(--bdr)}
    .cart-item-img{width:54px;height:54px;object-fit:cover;border-radius:8px;flex-shrink:0}
    .cart-item-no-img{width:54px;height:54px;background:var(--muted);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
    .cart-item-info{flex:1}
    .cart-item-name{font-size:14px;font-weight:700;margin-bottom:3px}
    .cart-item-price{font-size:13px;color:var(--muted-fg)}
    .cart-qty{display:flex;align-items:center;gap:8px;flex-shrink:0}
    .qty-btn{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--bdr);background:#fff;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--fg);transition:background .15s}
    .qty-btn:hover{background:var(--muted)}
    .qty-val{font-size:14px;font-weight:700;min-width:20px;text-align:center}
    .cart-footer{padding:20px 24px;border-top:1px solid var(--bdr)}
    .cart-total-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .cart-total-label{font-size:14px;font-weight:600;color:var(--muted-fg)}
    .cart-total-val{font-size:22px;font-weight:900;color:var(--fg)}
    .cart-wa-btn{width:100%;padding:16px;background:var(--wa);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:background .2s,transform .15s}
    .cart-wa-btn:hover{background:var(--wad)}
    .cart-wa-btn:active{transform:scale(.98)}
    .cart-wa-btn:disabled{opacity:.5;cursor:default}
    /* ── Cart delivery ── */
    .cart-delivery{padding:16px 24px;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr)}
    .cart-delivery-label{font-size:12px;font-weight:700;color:var(--muted-fg);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px}
    .delivery-toggle{display:flex;gap:6px;margin-bottom:12px}
    .delivery-type-btn{flex:1;padding:8px;border-radius:8px;border:2px solid var(--bdr);background:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;color:var(--muted-fg)}
    .delivery-type-btn.active{background:var(--primary);color:var(--primary-fg);border-color:var(--primary)}
    .cart-cep-wrap{display:flex;gap:8px;margin-bottom:8px}
    .cart-cep-input{flex:1;padding:9px 12px;border:1.5px solid var(--bdr);border-radius:8px;font-size:14px;font-family:var(--font-b);outline:none}
    .cart-cep-input:focus{border-color:var(--primary)}
    .cart-cep-btn{padding:9px 14px;border-radius:8px;background:var(--primary);color:var(--primary-fg);border:none;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
    .cart-cep-btn:disabled{opacity:.6;cursor:default}
    .cart-address-display{font-size:13px;color:var(--muted-fg);line-height:1.5;margin-bottom:8px;min-height:18px}
    .cart-fee-row{display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:var(--fg);padding:6px 0}
    /* ── Imóveis ── */
    .imoveis-section{background:#fff}
    .imoveis-top{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:32px}
    .imoveis-filters{display:flex;gap:8px;flex-wrap:wrap}
    .imoveis-filter-btn{padding:8px 20px;border-radius:100px;border:2px solid var(--bdr);background:#fff;font-size:13px;font-weight:700;color:var(--muted-fg);cursor:pointer;transition:all .18s}
    .imoveis-filter-btn.active,.imoveis-filter-btn:hover{background:var(--primary);color:var(--primary-fg);border-color:var(--primary)}
    .imoveis-search{display:flex;align-items:center;gap:8px;background:var(--muted);border-radius:10px;padding:9px 16px;border:1.5px solid var(--bdr)}
    .imoveis-search input{background:none;border:none;outline:none;font-size:13px;font-family:var(--font-b);color:var(--fg);width:200px}
    .imoveis-search input::placeholder{color:var(--muted-fg)}
    .imoveis-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}
    .imovel-card{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);transition:box-shadow .2s,transform .2s}
    .imovel-card:hover{box-shadow:var(--shl);transform:translateY(-4px)}
    .imovel-card[data-hidden]{display:none}
    .imovel-img-wrap{position:relative;overflow:hidden;height:200px}
    .imovel-img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
    .imovel-card:hover .imovel-img{transform:scale(1.05)}
    .imovel-no-img{height:200px;background:var(--muted);display:flex;align-items:center;justify-content:center;font-size:52px}
    .imovel-tag{position:absolute;top:12px;left:12px;padding:4px 12px;border-radius:100px;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
    .imovel-tag-comprar{background:#059669;color:#fff}
    .imovel-tag-alugar{background:#7C3AED;color:#fff}
    .imovel-tag-highlight{background:var(--accent);color:var(--accent-fg)}
    .imovel-body{padding:20px}
    .imovel-categoria{font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
    .imovel-name{font-size:16px;font-weight:800;margin-bottom:8px;line-height:1.3}
    .imovel-neighborhood{font-size:13px;color:var(--muted-fg);margin-bottom:12px}
    .imovel-details{display:flex;gap:14px;font-size:12px;color:var(--muted-fg);font-weight:600;margin-bottom:14px;flex-wrap:wrap}
    .imovel-detail{display:flex;align-items:center;gap:4px}
    .imovel-footer{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .imovel-price{font-size:18px;font-weight:900;color:var(--primary)}
    .imovel-area{font-size:13px;color:var(--muted-fg);font-weight:600}
    .imovel-cta{padding:8px 18px;border-radius:8px;background:var(--primary);color:var(--primary-fg);font-size:12px;font-weight:700;text-decoration:none;transition:background .15s;white-space:nowrap}
    .imovel-cta:hover{background:var(--accent)}
    /* ── Content products (petshop) ── */
    .content-prod-section{background:var(--bg)}
    .content-prod-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:32px}
    .content-prod-filter-btn{padding:8px 18px;border-radius:100px;border:2px solid var(--bdr);background:#fff;font-size:13px;font-weight:700;color:var(--muted-fg);cursor:pointer;transition:all .18s}
    .content-prod-filter-btn.active,.content-prod-filter-btn:hover{background:var(--primary);color:var(--primary-fg);border-color:var(--primary)}
    .content-prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}
    .content-prod-card{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);transition:box-shadow .2s}
    .content-prod-card:hover{box-shadow:var(--shl)}
    .content-prod-card[data-hidden]{display:none}
    .content-prod-img{width:100%;height:180px;object-fit:cover}
    .content-prod-no-img{height:180px;display:flex;align-items:center;justify-content:center;font-size:44px;background:var(--muted)}
    .content-prod-body{padding:16px}
    .content-prod-cat{font-size:10px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
    .content-prod-name{font-size:15px;font-weight:700;margin-bottom:6px}
    .content-prod-desc{font-size:13px;color:var(--muted-fg);line-height:1.5}
    /* ── Location hours ── */
    .location-section{background:var(--bg)}
    .location-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start}
    .location-map-placeholder{background:var(--muted);border-radius:var(--r);height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border:2px dashed var(--bdr)}
    .location-map-placeholder span{font-size:40px}
    .location-map-placeholder p{font-size:14px;color:var(--muted-fg);font-weight:600}
    .location-info h3{font-size:20px;font-weight:800;margin-bottom:16px}
    .location-row{display:flex;gap:12px;margin-bottom:14px;align-items:flex-start}
    .location-icon{font-size:18px;flex-shrink:0;margin-top:1px}
    .location-text{font-size:14px;color:var(--muted-fg);line-height:1.6}
    .location-text strong{color:var(--fg);display:block;font-size:13px;font-weight:700;margin-bottom:2px}
    .hours-grid{display:flex;flex-direction:column;gap:6px;margin-top:8px}
    .hours-row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--bdr)}
    .hours-row:last-child{border:none}
    .hours-day{font-weight:600;color:var(--fg)}
    .hours-time{color:var(--muted-fg)}
    @media(max-width:768px){.location-grid{grid-template-columns:1fr}}
    @media(max-width:480px){.imoveis-search input{width:140px}}
  </style>
</head>
<body>

<div class="cursor-dot"></div>
<div class="cursor-ring"></div>

<nav class="nav${isRestaurante ? " nav-dark" : ""}">
  <span class="nav-brand">
    ${logoImg ? `<img src="${logoImg.public_url || logoImg.url}" alt="${site.business_name}" class="nav-logo">` : ""}
    ${site.business_name}
  </span>
  <div class="nav-links">
    ${navLinks}
  </div>
  <div style="display:flex;align-items:center;gap:10px">
    <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
    <a class="btn btn-wa nav-cta" href="${wa}" target="_blank" rel="noopener noreferrer">${WA_SVG} WhatsApp</a>
  </div>
</nav>
<div class="nav-mobile${isRestaurante ? " nav-mobile-dark" : ""}" id="nav-mobile">
  ${navLinks}
</div>

${isRestaurante ? `
<section class="hero hero-food" id="inicio">
  ${heroImgs.length > 1 ? `<div class="hero-slides">${heroImgs.slice(1).map((url,i) => `<div class="hero-slide${i===0?" active":""}" style="background-image:url('${url}')"></div>`).join("")}</div>` : ""}
  <div class="hero-gradient" data-parallax></div>
  <div class="hero-food-inner">
    <div class="hero-text-left">
      <div class="hero-badge"><span>${d.emoji}</span><span>${site.niche}${location ? ` · ${location}` : ""}</span></div>
      <h1 data-split-words>${headline}</h1>
      <p>${heroCopy}</p>
      <div class="hero-btns">
        <a class="btn btn-wa btn-wa-hero" href="${wa}" target="_blank" rel="noopener noreferrer">${WA_SVG} Fazer Pedido</a>
        <a class="btn btn-ghost" href="#cardapio">Ver Cardápio ↓</a>
      </div>
    </div>
    <div class="hero-food-side">
      <div class="hero-food-glow"></div>
      ${heroImgs[0]
        ? `<div class="hero-food-img-wrap"><img src="${heroImgs[0]}" alt="${site.business_name}" class="hero-food-img" loading="eager"></div>`
        : `<div class="hero-food-no-img">${d.emoji}</div>`}
      <div class="hero-food-ring"></div>
      <div class="hero-food-ring-2"></div>
    </div>
  </div>
</section>
` : `
<section class="hero" id="inicio">
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
`}

${location ? `<div class="proof-bar"><p>${copy.proofBar.replace("{city}", location)}</p></div>` : ""}

${highlightData ? renderHighlightBar(highlightData) : ""}

${stats.length > 0 ? renderStats(stats) : ""}

${menuData.hasMenu ? renderMenuFull(menuData, copy, wa, isRestaurante) : svcItems.length > 0 ? renderServices(svcItems, d, copy) : ""}

${imoveisData?.length ? renderImoveisFull(imoveisData, copy, wa, site.business_name) : ""}

${contentProds?.featured?.length ? renderContentProducts(contentProds, copy) : ""}

${hasProducts ? renderProducts(site.products, d) : ""}

${galleryImgs.length > 0 ? renderGallery(galleryImgs, copy) : ""}

${hasDiffs ? renderDiferenciais(flat.diferenciais) : ""}

${renderTestimonials(richTestis, copy, isRestaurante)}

${hasAbout ? `<section class="about-section" id="sobre">
<div class="wrap">
  <div class="sh sr-fade">
    <div class="section-label">Sobre Nós</div>
    <h2 class="section-title">${site.business_name}</h2>
  </div>
  <p class="about-text sr-up">${flat.about_text}</p>
</div>
</section>` : ""}

${locationData ? renderLocationHours(locationData, wa, site.business_name) : ""}

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

<!-- Cart (shown only on restaurant niches — controlled by JS) -->
<button class="cart-float" id="cart-float" style="display:none" aria-label="Carrinho" onclick="CartSystem.open()">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
  <span class="cart-count" id="cart-count">0</span>
</button>
<div class="cart-overlay" id="cart-overlay" onclick="CartSystem.close()"></div>
<div class="cart-drawer" id="cart-drawer">
  <div class="cart-header">
    <h3>🛒 Meu Pedido</h3>
    <button class="cart-close" onclick="CartSystem.close()">✕</button>
  </div>
  <div class="cart-items" id="cart-items">
    <div class="cart-empty-msg">Seu carrinho está vazio.<br>Adicione itens do cardápio! 😊</div>
  </div>
  <div class="cart-delivery" id="cart-delivery">
    <div class="cart-delivery-label">Tipo de Entrega</div>
    <div class="delivery-toggle">
      <button class="delivery-type-btn active" data-dtype="retirada" onclick="CartSystem.setDelivery('retirada',this)">🏪 Retirar</button>
      <button class="delivery-type-btn" data-dtype="delivery" onclick="CartSystem.setDelivery('delivery',this)">🛵 Delivery</button>
    </div>
    <div id="cart-cep-section" style="display:none">
      <div class="cart-cep-wrap">
        <input class="cart-cep-input" id="cart-cep" type="text" placeholder="CEP 00000-000" maxlength="9">
        <button class="cart-cep-btn" id="cart-cep-btn" onclick="CartSystem.lookupCep()">Buscar</button>
      </div>
      <div class="cart-address-display" id="cart-address-display"></div>
      <div class="cart-fee-row" id="cart-fee-row" style="display:none">
        <span>Taxa de entrega</span>
        <span id="cart-fee-val">R$ 8,00</span>
      </div>
    </div>
  </div>
  <div class="cart-footer">
    <div class="cart-total-row">
      <span class="cart-total-label">Total</span>
      <span class="cart-total-val" id="cart-total">R$ 0,00</span>
    </div>
    <button class="cart-wa-btn" id="cart-wa-btn" onclick="CartSystem.sendToWhatsApp()" disabled>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.126 1.535 5.857L.057 23.716a.5.5 0 00.641.592l5.945-1.561A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.96 9.96 0 01-5.1-1.395l-.37-.218-3.797.996 1.012-3.698-.24-.381A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
      Enviar Pedido pelo WhatsApp
    </button>
  </div>
</div>

</body>
</html>`;
}
