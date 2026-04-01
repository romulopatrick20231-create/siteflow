/**
 * htmlBuilder.js — Generates the landing page HTML from site DB data.
 *
 * Called by publishSite.js when user clicks "Publish".
 * Reuses the same premium design from siteGenerator.js.
 * Input: site row joined with site_content, products, images.
 */

// ── Niche themes (same as siteGenerator.js) ──────────────────────────────────
const THEMES = {
  "Clínica Odontológica":       { p: "#1D4ED8", pl: "#DBEAFE", pd: "#1E3A8A", emoji: "🦷" },
  "Clínica Médica":             { p: "#0891B2", pl: "#CFFAFE", pd: "#0E7490", emoji: "🏥" },
  "Clínica de Fisioterapia":    { p: "#7C3AED", pl: "#EDE9FE", pd: "#5B21B6", emoji: "💪" },
  "Consultório de Nutrição":    { p: "#059669", pl: "#D1FAE5", pd: "#065F46", emoji: "🥗" },
  "Clínica Veterinária":        { p: "#D97706", pl: "#FEF3C7", pd: "#92400E", emoji: "🐾" },
  "Farmácia":                   { p: "#10B981", pl: "#D1FAE5", pd: "#047857", emoji: "💊" },
  "Salão de Beleza":            { p: "#DB2777", pl: "#FCE7F3", pd: "#9D174D", emoji: "💇" },
  "Barbearia":                  { p: "#1E3A5F", pl: "#E0E7FF", pd: "#0F1E33", emoji: "✂️" },
  "Clínica de Estética":        { p: "#9333EA", pl: "#F3E8FF", pd: "#6B21A8", emoji: "✨" },
  "Restaurante":                { p: "#B45309", pl: "#FEF3C7", pd: "#78350F", emoji: "🍽️" },
  "Pizzaria":                   { p: "#DC2626", pl: "#FEE2E2", pd: "#991B1B", emoji: "🍕" },
  "Padaria":                    { p: "#D97706", pl: "#FEF3C7", pd: "#B45309", emoji: "🍞" },
  "Hamburgueria":               { p: "#C2410C", pl: "#FED7AA", pd: "#9A3412", emoji: "🍔" },
  "Escritório de Advocacia":    { p: "#1E3A5F", pl: "#E0E7FF", pd: "#0F1E33", emoji: "⚖️" },
  "Escritório de Contabilidade":{ p: "#374151", pl: "#F3F4F6", pd: "#111827", emoji: "📊" },
  "Imobiliária":                { p: "#0369A1", pl: "#E0F2FE", pd: "#0C4A6E", emoji: "🏠" },
  "Academia / Studio Fitness":  { p: "#DC2626", pl: "#FEE2E2", pd: "#991B1B", emoji: "🏋️" },
  "Escola / Curso":             { p: "#7C3AED", pl: "#EDE9FE", pd: "#5B21B6", emoji: "📚" },
  "Oficina Mecânica":           { p: "#374151", pl: "#F3F4F6", pd: "#111827", emoji: "🔧" },
};
const DEFAULT_THEME = { p: "#2563EB", pl: "#DBEAFE", pd: "#1E40AF", emoji: "🏪" };

function getTheme(niche) {
  return THEMES[niche] || DEFAULT_THEME;
}

function waLink(phone, name) {
  if (!phone) return "https://wa.me/";
  const n   = phone.replace(/\D/g, "");
  const num = n.startsWith("55") ? n : `55${n}`;
  const msg = encodeURIComponent(`Olá! Vim pelo site da ${name} e gostaria de mais informações.`);
  return `https://wa.me/${num}?text=${msg}`;
}

const WA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.126 1.535 5.857L.057 23.716a.5.5 0 00.641.592l5.945-1.561A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.96 9.96 0 01-5.1-1.395l-.37-.218-3.797.996 1.012-3.698-.24-.381A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
</svg>`;

const CARD_EMOJIS = ["🏆", "⚡", "💎", "🎯", "🌟"];

function renderDiferenciais(items) {
  if (!items || items.length === 0) return "";
  return items.slice(0, 3).map((d, i) => {
    const parts = typeof d === "string" ? d.split(":") : [d.title || "", d.desc || ""];
    const title = parts[0]?.trim() || "";
    const desc  = parts.slice(1).join(":").trim() || "Nosso compromisso é com a sua satisfação total.";
    return `<div class="diff-block">
      <div class="diff-num">${i + 1}</div>
      <div><h3>${title}</h3><p>${desc}</p></div>
    </div>`;
  }).join("");
}

function renderTestimonials(items) {
  if (!items || items.length === 0) return "";
  return items.slice(0, 3).map(d => {
    const nome  = d.nome  || "Cliente";
    const texto = d.texto || "";
    return `<div class="card testimonial-card">
      <div class="quote-mark">"</div>
      <p class="testi-text">${texto}</p>
      <div class="testi-author">
        <div class="testi-avatar">${nome.charAt(0).toUpperCase()}</div>
        <div><div class="testi-name">${nome}</div><div class="stars">★★★★★</div></div>
      </div>
    </div>`;
  }).join("");
}

function renderProducts(products, t) {
  const active = (products || []).filter(p => p.is_active !== false);
  if (active.length === 0) return "";
  const cards = active.slice(0, 6).map((p, i) => `
    <div class="card product-card">
      ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" class="product-img" loading="lazy">` : `<div class="product-placeholder" style="background:${t.pl};color:${t.p}">${CARD_EMOJIS[i % CARD_EMOJIS.length]}</div>`}
      <div class="product-body">
        <h3>${p.name}</h3>
        ${p.description ? `<p>${p.description}</p>` : ""}
        ${p.price ? `<div class="product-price">R$ ${Number(p.price).toFixed(2).replace(".", ",")}</div>` : ""}
      </div>
    </div>`).join("");

  return `<section class="products-section" id="produtos">
  <div class="wrap">
    <div class="sh">
      <div class="section-label">O Que Oferecemos</div>
      <h2 class="section-title">Nossos Produtos &amp; Serviços</h2>
    </div>
    <div class="products-grid">${cards}</div>
  </div>
</section>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Build complete HTML from site DB data.
 * @param {Object} site — sites row joined with site_content, products, images
 * @returns {string} complete HTML document
 */
export function buildHTML(site) {
  const t       = getTheme(site.niche);
  const content = site.site_content ?? {};
  const wa      = waLink(site.phone, site.business_name);

  const headline   = content.headline   || `${site.business_name} — ${site.niche}`;
  const heroCopy   = content.hero_copy  || `Atendimento especializado em ${site.neighborhood || site.city || "sua cidade"}. Agende pelo WhatsApp!`;
  const location   = [site.neighborhood, site.city].filter(Boolean).join(", ");

  const hasDiferenciais  = (content.diferenciais  || []).length > 0;
  const hasDepoimentos   = (content.depoimentos   || []).length > 0;
  const hasProducts      = (site.products || []).filter(p => p.is_active !== false).length > 0;
  const logoImg          = (site.images || []).find(i => i.type === "logo");
  const bannerImg        = (site.images || []).find(i => i.type === "banner");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${site.niche} em ${location}. ${headline}">
  <meta property="og:title" content="${site.business_name}">
  <meta property="og:description" content="${heroCopy}">
  <title>${site.business_name} — ${site.niche}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --p:   ${t.p};
      --pl:  ${t.pl};
      --pd:  ${t.pd};
      --wa:  #25D366;
      --wad: #128C7E;
      --txt: #111827;
      --txt2:#6B7280;
      --bdr: #E5E7EB;
      --bg:  #F9FAFB;
      --r:   14px;
      --sh:  0 2px 16px rgba(0,0,0,.08);
      --shl: 0 8px 40px rgba(0,0,0,.13);
    }
    html { scroll-behavior: smooth; }
    body { font-family: 'Inter', system-ui, sans-serif; color: var(--txt); background: #fff; line-height: 1.6; -webkit-font-smoothing: antialiased; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
    section { padding: 88px 24px; }
    .section-label { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--p); margin-bottom: 12px; }
    .section-title { font-size: clamp(26px, 4vw, 42px); font-weight: 800; line-height: 1.2; letter-spacing: -.02em; margin-bottom: 14px; }
    .section-sub { font-size: 17px; color: var(--txt2); max-width: 540px; }
    .sh { margin-bottom: 52px; }
    .btn { display: inline-flex; align-items: center; gap: 9px; font-family: inherit; font-size: 16px; font-weight: 700; border: none; cursor: pointer; border-radius: 10px; padding: 15px 28px; transition: all .18s ease; text-decoration: none; white-space: nowrap; }
    .btn-wa { background: var(--wa); color: #fff; box-shadow: 0 4px 20px rgba(37,211,102,.35); }
    .btn-wa:hover { background: var(--wad); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(37,211,102,.5); }
    .btn-ghost { background: rgba(255,255,255,.14); color: #fff; border: 1.5px solid rgba(255,255,255,.4); backdrop-filter: blur(8px); }
    .btn-ghost:hover { background: rgba(255,255,255,.25); }
    .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; background: rgba(255,255,255,.92); backdrop-filter: blur(14px) saturate(180%); border-bottom: 1px solid var(--bdr); }
    .nav-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 17px; color: var(--p); }
    .nav-logo { height: 36px; width: auto; border-radius: 6px; }
    .nav-cta { font-size: 14px; padding: 10px 20px; }
    .hero { padding: ${bannerImg ? "0" : "128px 24px 96px"}; background: linear-gradient(145deg, var(--pd) 0%, var(--p) 55%, color-mix(in srgb, var(--p) 70%, #000) 100%); color: #fff; text-align: center; position: relative; overflow: hidden; }
    .hero-bg { width: 100%; height: 480px; object-fit: cover; opacity: .35; position: absolute; top: 0; left: 0; }
    .hero-orb { position: absolute; border-radius: 50%; background: rgba(255,255,255,.06); pointer-events: none; }
    .hero-orb-1 { width: 500px; height: 500px; top: -200px; left: -100px; }
    .hero-orb-2 { width: 360px; height: 360px; bottom: -150px; right: -80px; }
    .hero-inner { position: relative; z-index: 1; max-width: 760px; margin: 0 auto; padding: 128px 24px 96px; }
    .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.28); border-radius: 100px; padding: 7px 18px; font-size: 13px; font-weight: 600; margin-bottom: 28px; backdrop-filter: blur(8px); }
    .hero h1 { font-size: clamp(30px, 5.5vw, 58px); font-weight: 900; line-height: 1.12; letter-spacing: -.03em; margin-bottom: 22px; }
    .hero p { font-size: clamp(16px, 2.5vw, 21px); opacity: .88; max-width: 580px; margin: 0 auto 40px; }
    .hero-btns { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
    .btn-wa-hero { font-size: 17px; padding: 18px 36px; }
    .proof-bar { background: var(--pl); border-bottom: 1px solid color-mix(in srgb, var(--p) 20%, transparent); padding: 14px 24px; text-align: center; }
    .proof-bar p { font-size: 13.5px; font-weight: 600; color: var(--pd); letter-spacing: .01em; }
    .card { background: #fff; border-radius: var(--r); border: 1px solid var(--bdr); box-shadow: var(--sh); transition: transform .2s, box-shadow .2s; }
    .card:hover { transform: translateY(-5px); box-shadow: var(--shl); }
    .services { background: var(--bg); }
    .diffs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 36px; }
    .diff-block { display: flex; gap: 20px; align-items: flex-start; }
    .diff-num { flex-shrink: 0; width: 44px; height: 44px; background: var(--p); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; margin-top: 3px; }
    .diff-block h3 { font-size: 17px; font-weight: 700; margin-bottom: 7px; }
    .diff-block p { font-size: 15px; color: var(--txt2); line-height: 1.65; }
    .testimonials { background: var(--bg); }
    .testi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 24px; }
    .testimonial-card { padding: 32px 28px; position: relative; }
    .quote-mark { position: absolute; top: 14px; left: 22px; font-size: 72px; line-height: 1; color: var(--pl); font-family: Georgia, serif; pointer-events: none; }
    .testi-text { font-size: 15px; color: var(--txt); line-height: 1.75; margin-bottom: 22px; padding-top: 36px; }
    .testi-author { display: flex; align-items: center; gap: 13px; }
    .testi-avatar { width: 42px; height: 42px; border-radius: 50%; background: var(--pl); color: var(--pd); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; flex-shrink: 0; }
    .testi-name { font-weight: 700; font-size: 14px; }
    .stars { font-size: 13px; color: #F59E0B; margin-top: 2px; }
    .products-section { background: #fff; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }
    .product-card { overflow: hidden; }
    .product-img { width: 100%; height: 180px; object-fit: cover; }
    .product-placeholder { width: 100%; height: 180px; display: flex; align-items: center; justify-content: center; font-size: 48px; }
    .product-body { padding: 20px; }
    .product-body h3 { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
    .product-body p { font-size: 14px; color: var(--txt2); margin-bottom: 10px; }
    .product-price { font-size: 18px; font-weight: 800; color: var(--p); }
    .about-section { background: var(--bg); }
    .about-text { font-size: 17px; color: var(--txt); line-height: 1.8; max-width: 720px; }
    .cta-section { background: linear-gradient(145deg, var(--pd) 0%, var(--p) 100%); color: #fff; text-align: center; }
    .cta-section h2 { font-size: clamp(26px, 4vw, 44px); font-weight: 900; line-height: 1.15; letter-spacing: -.02em; margin-bottom: 16px; }
    .cta-section p { font-size: 18px; opacity: .88; max-width: 480px; margin: 0 auto 36px; }
    .btn-wa-cta { font-size: 18px; padding: 20px 44px; }
    .cta-note { margin-top: 22px; font-size: 13px; opacity: .7; display: flex; align-items: center; justify-content: center; gap: 6px; }
    footer { background: #0F172A; color: #94A3B8; padding: 44px 24px; text-align: center; }
    .footer-brand { font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 6px; }
    footer p { font-size: 13px; margin-bottom: 4px; }
    footer a { color: var(--wa); }
    .footer-credit { margin-top: 22px; font-size: 11px; opacity: .35; }
    .wa-float { position: fixed; bottom: 26px; right: 26px; z-index: 999; width: 62px; height: 62px; border-radius: 50%; background: var(--wa); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 24px rgba(37,211,102,.55); transition: transform .2s; animation: float-pulse 2.5s ease-in-out infinite; }
    .wa-float:hover { transform: scale(1.1); }
    @keyframes float-pulse { 0%, 100% { box-shadow: 0 4px 24px rgba(37,211,102,.5); } 50% { box-shadow: 0 4px 44px rgba(37,211,102,.85); } }
    @media (max-width: 768px) { section { padding: 64px 20px; } .nav { padding: 0 20px; } .testi-grid { grid-template-columns: 1fr; } .diffs-grid { gap: 28px; } }
    @media (max-width: 480px) { .hero-btns { flex-direction: column; align-items: center; } .btn-wa-hero, .btn-ghost { width: 100%; justify-content: center; } }
  </style>
</head>
<body>

<nav class="nav">
  <span class="nav-brand">
    ${logoImg ? `<img src="${logoImg.public_url}" alt="${site.business_name}" class="nav-logo">` : ""}
    ${site.business_name}
  </span>
  <a class="btn btn-wa nav-cta" href="${wa}" target="_blank" rel="noopener noreferrer">${WA_SVG} WhatsApp</a>
</nav>

<section class="hero">
  ${bannerImg ? `<img src="${bannerImg.public_url}" alt="" class="hero-bg">` : ""}
  <div class="hero-orb hero-orb-1"></div>
  <div class="hero-orb hero-orb-2"></div>
  <div class="hero-inner">
    <div class="hero-badge"><span>${t.emoji}</span><span>${site.niche}${location ? ` &nbsp;·&nbsp; ${location}` : ""}</span></div>
    <h1>${headline}</h1>
    <p>${heroCopy}</p>
    <div class="hero-btns">
      <a class="btn btn-wa btn-wa-hero" href="${wa}" target="_blank" rel="noopener noreferrer">${WA_SVG} Agendar pelo WhatsApp</a>
      ${hasProducts ? `<a class="btn btn-ghost" href="#produtos">Ver Serviços ↓</a>` : ""}
    </div>
  </div>
</section>

${location ? `<div class="proof-bar"><p>📍 ${location} &nbsp;·&nbsp; Atendimento especializado &nbsp;·&nbsp; Entre em contato hoje</p></div>` : ""}

${hasProducts ? renderProducts(site.products, t) : ""}

${hasDiferenciais ? `
<section id="diferenciais">
  <div class="wrap">
    <div class="sh">
      <div class="section-label">Por Que Nos Escolher</div>
      <h2 class="section-title">Nossos Diferenciais</h2>
    </div>
    <div class="diffs-grid">${renderDiferenciais(content.diferenciais)}</div>
  </div>
</section>` : ""}

${hasDepoimentos ? `
<section class="testimonials" id="depoimentos">
  <div class="wrap">
    <div class="sh">
      <div class="section-label">Depoimentos</div>
      <h2 class="section-title">O Que Dizem Nossos Clientes</h2>
    </div>
    <div class="testi-grid">${renderTestimonials(content.depoimentos)}</div>
  </div>
</section>` : ""}

${content.about_text ? `
<section class="about-section" id="sobre">
  <div class="wrap">
    <div class="sh">
      <div class="section-label">Sobre Nós</div>
      <h2 class="section-title">${site.business_name}</h2>
    </div>
    <p class="about-text">${content.about_text}</p>
  </div>
</section>` : ""}

<section class="cta-section" id="contato">
  <div class="wrap">
    <h2>Pronto para começar?</h2>
    <p>Entre em contato agora pelo WhatsApp e receba atendimento personalizado. Rápido, sem burocracia.</p>
    <a class="btn btn-wa btn-wa-cta" href="${wa}" target="_blank" rel="noopener noreferrer">${WA_SVG} Falar no WhatsApp Agora</a>
    ${location ? `<div class="cta-note"><span>📍</span><span>${location} &nbsp;·&nbsp; Atendemos você hoje</span></div>` : ""}
  </div>
</section>

<footer>
  <div class="footer-brand">${site.business_name}</div>
  <p>${site.niche}${location ? ` &nbsp;·&nbsp; ${location}` : ""}</p>
  ${site.phone ? `<p><a href="${wa}" target="_blank" rel="noopener">📱 ${site.phone}</a></p>` : ""}
  ${content.contact_email ? `<p>✉️ ${content.contact_email}</p>` : ""}
  <div class="footer-credit">Site criado com ForgeSites AI</div>
</footer>

<a class="wa-float" href="${wa}" target="_blank" rel="noopener noreferrer" aria-label="Falar no WhatsApp">${WA_SVG}</a>

</body>
</html>`;
}
