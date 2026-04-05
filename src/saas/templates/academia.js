/**
 * academia.js — Premium Dark Gym / Fitness template.
 *
 * Design: CrossFit / premium gym aesthetic — raw, powerful, athletic.
 * Lead-gen only (WhatsApp CTAs). No cart. GSAP animations, Ken Burns hero.
 */

import { waLink } from "../htmlBuilder.js";
import {
  WA_SVG, findSection, getAllImages, getFirstImage,
  getHeroContent, getTestimonials, getLocationData,
  buildHeroSlides, buildPhotoStrip, buildTestimonials,
  SHARED_CSS, SHARED_JS,
} from "./shared.js";

const API_BASE = process.env.API_BASE_URL || "https://api.forgesites.app";

export function buildAcademiaHTML(site) {
  const wa          = waLink(site.phone, site.business_name);
  const location    = [site.neighborhood, site.city].filter(Boolean).join(", ");
  const heroContent = getHeroContent(site);
  const placesData  = site.content?.placesData || null;
  const logoImg     = (site.images || []).find(i => i.type === "logo");

  const allImgs    = getAllImages(site, 8);
  const heroSlides = buildHeroSlides(site, "0.45");
  const photoStrip = buildPhotoStrip(site, "240px");
  const testiCards = buildTestimonials(site);

  const ratingBadge = placesData?.rating
    ? `${placesData.rating.toFixed(1)} · ${placesData.totalRatings?.toLocaleString("pt-BR") || ""} avaliações`
    : "";

  // ── Modalidades ───────────────────────────────────────────────────────────
  const servicesSec = findSection(site, ["services", "features", "highlights"]);
  const defaultModalidades = [
    { icon: "🏋️", name: "Musculação",  desc: "Equipamentos de última geração para evolução máxima." },
    { icon: "⚡", name: "Funcional",   desc: "Treino completo que desafia corpo e mente." },
    { icon: "🥊", name: "Muay Thai",   desc: "Arte marcial com foco em condicionamento e defesa pessoal." },
    { icon: "🔥", name: "CrossFit",    desc: "Alta intensidade, resultados reais e comunidade forte." },
    { icon: "🧘", name: "Yoga",        desc: "Equilíbrio, flexibilidade e paz interior." },
    { icon: "🚴", name: "Spinning",    desc: "Cardio de alto impacto com música e motivação." },
    { icon: "🏊", name: "Natação",     desc: "Para todas as idades, do iniciante ao avançado." },
    { icon: "🤸", name: "Pilates",     desc: "Fortalecimento do core e correção postural." },
  ];
  const modalidades = servicesSec?.data?.items?.length
    ? servicesSec.data.items.slice(0, 8)
    : defaultModalidades;

  const modalHtml = modalidades.map(m => `<div class="mod-card card-anim">
  <div class="mod-icon">${m.icon || "🏋️"}</div>
  <div class="mod-name">${m.name || "Modalidade"}</div>
  <div class="mod-desc">${m.desc || m.description || ""}</div>
</div>`).join("");

  // ── Planos ────────────────────────────────────────────────────────────────
  const pricingSec = findSection(site, ["pricing", "plans", "packages"]);
  const defaultPlanos = [
    {
      name: "Básico",
      price: "89",
      period: "/mês",
      desc: "Ideal para quem quer começar",
      features: ["Musculação", "Funcional", "Acesso das 6h às 22h", "Armário digital", "App de treinos"],
      highlight: false,
      cta: "Começar Agora",
    },
    {
      name: "Premium",
      price: "129",
      period: "/mês",
      desc: "O mais popular — todas as modalidades",
      features: ["Todas as modalidades", "Acesso 24/7", "Avaliação física mensal", "Armário premium", "App + nutrição básica"],
      highlight: true,
      cta: "Quero o Premium",
    },
    {
      name: "VIP",
      price: "189",
      period: "/mês",
      desc: "Resultado acelerado com acompanhamento",
      features: ["Tudo do Premium", "4 sessões de personal/mês", "Nutricionista online", "Área VIP exclusiva", "Prioridade no agendamento"],
      highlight: false,
      cta: "Seja VIP",
    },
  ];
  const planos = pricingSec?.data?.plans?.length
    ? pricingSec.data.plans.slice(0, 3)
    : defaultPlanos;

  const planosHtml = planos.map((plano, i) => {
    const isHighlight = plano.highlight || i === 1;
    const feats = (plano.features || plano.benefits || []).map(f =>
      `<li class="plan-feat"><span class="plan-feat-check">✓</span>${f}</li>`
    ).join("");
    const waMsg = encodeURIComponent(`Olá! Tenho interesse no plano ${plano.name} da ${site.business_name}. Pode me dar mais informações?`);
    const waUrl = wa.split("?")[0] + "?text=" + waMsg;
    return `<div class="plan-card${isHighlight ? " plan-highlight" : ""} card-anim">
  ${isHighlight ? `<div class="plan-badge">Mais Popular</div>` : ""}
  <div class="plan-name">${plano.name || "Plano"}</div>
  <div class="plan-price-wrap">
    <span class="plan-currency">R$</span>
    <span class="plan-price">${plano.price || "—"}</span>
    <span class="plan-period">${plano.period || "/mês"}</span>
  </div>
  <div class="plan-desc">${plano.desc || plano.description || ""}</div>
  <ul class="plan-feats">${feats}</ul>
  <a class="plan-cta${isHighlight ? " plan-cta-highlight" : ""}" href="${waUrl}" target="_blank" rel="noopener">
    ${plano.cta || "Começar"} →
  </a>
</div>`;
  }).join("");

  // ── Grade de Aulas ────────────────────────────────────────────────────────
  const scheduleSec = findSection(site, ["schedule", "classes", "timetable"]);
  const scheduleData = scheduleSec?.data;
  const defaultGrade = [
    { time: "06:00", seg: "Musculação", ter: "Funcional",  qua: "Musculação", qui: "Muay Thai",   sex: "Musculação", sab: "CrossFit" },
    { time: "08:00", seg: "Yoga",       ter: "Pilates",    qua: "Yoga",       qui: "Pilates",     sex: "Spinning",   sab: "Yoga" },
    { time: "12:00", seg: "Funcional",  ter: "Musculação", qua: "Funcional",  qui: "Musculação",  sex: "Funcional",  sab: "—" },
    { time: "18:00", seg: "CrossFit",   ter: "Spinning",   qua: "Muay Thai",  qui: "CrossFit",    sex: "Muay Thai",  sab: "—" },
    { time: "19:30", seg: "Musculação", ter: "Muay Thai",  qua: "Spinning",   qui: "Funcional",   sex: "CrossFit",   sab: "—" },
  ];
  const gradeRows = defaultGrade.map(row =>
    `<tr>
      <td class="grade-time">${row.time}</td>
      <td>${row.seg}</td><td>${row.ter}</td><td>${row.qua}</td>
      <td>${row.qui}</td><td>${row.sex}</td><td>${row.sab}</td>
    </tr>`
  ).join("");

  // ── Equipe ────────────────────────────────────────────────────────────────
  const teamSec  = findSection(site, ["team", "staff", "trainers"]);
  const teamData = teamSec?.data?.members || teamSec?.data?.team || [];
  const teamHtml = teamData.length ? `
<section class="section-surface2" id="equipe">
  <div class="wrap">
    <div class="section-label sr-fade">Profissionais</div>
    <h2 class="section-title sr-up">Nossa <em>Equipe</em></h2>
    <div class="team-grid">
      ${teamData.slice(0, 4).map(m => {
        const imgUrl = m?.image?.url || (typeof m?.image === "string" ? m.image : null);
        return `<div class="team-card card-anim">
          ${imgUrl
            ? `<img class="team-img" src="${imgUrl}" alt="${m.name || "Trainer"}" loading="lazy">`
            : `<div class="team-img-ph">${(m.name || "T").charAt(0)}</div>`}
          <div class="team-info">
            <div class="team-name">${m.name || "Personal Trainer"}</div>
            <div class="team-role">${m.role || m.specialty || m.description || "Treinador"}</div>
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>
</section>` : "";

  // ── Location/Hours ────────────────────────────────────────────────────────
  const locData  = getLocationData(site);
  const hoursHtml = locData?.hours ? Object.entries(locData.hours).map(([k, v]) => {
    const labels = { weekdays: "Seg – Sex", saturday: "Sábado", sunday: "Domingo" };
    return `<div class="hours-row"><span class="hours-day">${labels[k] || k}</span><span class="hours-time">${v}</span></div>`;
  }).join("") : "";

  const locSection = (hoursHtml || locData?.address || placesData?.address) ? `
<section class="section-dark" id="horarios">
  <div class="wrap">
    <div class="section-label sr-fade">Onde Estamos</div>
    <h2 class="section-title sr-up">Horários &amp; <em>Localização</em></h2>
    <div class="loc-grid">
      ${hoursHtml ? `<div class="loc-card sr-up">
        <div class="loc-card-title">Horário de Funcionamento</div>
        <div class="hours-list">${hoursHtml}</div>
      </div>` : ""}
      ${(locData?.address || placesData?.address || location) ? `<div class="loc-card sr-up">
        <div class="loc-card-title">Endereço</div>
        <div class="loc-address">${locData?.address || placesData?.address || location}</div>
        ${ratingBadge ? `<div class="loc-rating">⭐ ${ratingBadge}</div>` : ""}
        <a class="loc-wa-btn" href="${wa}" target="_blank" rel="noopener">${WA_SVG} Como Chegar</a>
      </div>` : ""}
    </div>
  </div>
</section>` : "";

  // ── Testimonials ─────────────────────────────────────────────────────────
  const testiSection = testiCards ? `
<section class="section-surface" id="depoimentos">
  <div class="wrap">
    <div class="section-label sr-fade">Resultados Reais</div>
    <h2 class="section-title sr-up">O que Dizem<br>Nossos <em>Alunos</em></h2>
    <div class="testi-grid">${testiCards}</div>
  </div>
</section>` : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${site.niche || "Academia"} em ${location}. ${heroContent.headline}">
<meta property="og:title" content="${site.business_name}">
<meta property="og:image" content="${allImgs[0] || ""}">
<title>${site.business_name} — ${site.niche || "Academia"}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,900;1,700;1,900&family=Inter:wght@300;400;500;600;700&display=swap">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js" defer></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#060606;--surface:#0E0E0E;--surface2:#161616;
  --p:#84CC16;--ph:#65A30D;--acc:#FACC15;--acc-fg:#000;
  --txt:#FFFFFF;--muted:rgba(255,255,255,.55);--bdr:rgba(255,255,255,.07);
  --wa:#25D366;--r:4px;--r2:8px;
  --sh:0 4px 40px rgba(0,0,0,.7);--shl:0 20px 80px rgba(0,0,0,.9);
  --font-h:'Barlow Condensed',Impact,sans-serif;--font-b:'Inter',system-ui,sans-serif
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
.site-nav{position:fixed;top:0;left:0;right:0;z-index:400;height:66px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;background:rgba(6,6,6,.88);backdrop-filter:blur(24px) saturate(180%);border-bottom:1px solid var(--bdr);transition:background .4s,border-color .4s}
.site-nav.scrolled{background:rgba(6,6,6,.98);border-color:rgba(255,255,255,.1)}
.nav-brand{display:flex;align-items:center;gap:10px;font-family:var(--font-h);font-size:24px;font-weight:900;color:var(--txt);letter-spacing:.06em;text-transform:uppercase;line-height:1}
.nav-brand em{color:var(--p);font-style:normal}
.nav-logo{height:36px;width:auto;border-radius:0}
.nav-links{display:flex;align-items:center;gap:0}
.nav-link{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);padding:8px 16px;transition:color .2s}
.nav-link:hover{color:var(--txt)}
.nav-actions{display:flex;align-items:center;gap:10px}
.btn-nav-cta{display:inline-flex;align-items:center;gap:6px;background:var(--p);color:var(--acc-fg);font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:11px 22px;border:none;border-radius:0;transition:background .2s,transform .15s}
.btn-nav-cta:hover{background:var(--ph);transform:translateY(-1px)}
.nav-ham{display:none;background:none;border:none;cursor:pointer;padding:8px;color:var(--txt)}
.nav-ham span{display:block;width:22px;height:2px;background:currentColor;margin:5px 0;transition:transform .25s}
.nav-mob{display:none;position:fixed;top:66px;left:0;right:0;background:var(--surface);border-bottom:1px solid var(--bdr);z-index:399;padding:24px 32px;flex-direction:column;gap:2px}
.nav-mob.open{display:flex}
.nav-mob-link{font-size:14px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:12px 0;border-bottom:1px solid var(--bdr);transition:color .2s}
.nav-mob-link:hover,.nav-mob-link:last-child{color:var(--txt)}
@media(max-width:900px){.nav-links{display:none}.nav-ham{display:block}.btn-nav-cta.hide-mob{display:none}}

/* ── Promo ticker ── */
.promo-ticker{background:var(--surface2);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);overflow:hidden;height:40px;display:flex;align-items:center}
.ticker-track{display:flex;width:max-content;animation:ticker 30s linear infinite;white-space:nowrap;gap:0}
.ticker-track:hover{animation-play-state:paused}
.ticker-item{font-family:var(--font-h);font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);padding:0 40px}
.ticker-dot{color:var(--p)}
@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* ── Hero ── */
.site-hero{position:relative;height:100svh;min-height:640px;display:flex;align-items:flex-end;overflow:hidden;background:var(--bg)}
.hero-overlay{position:absolute;inset:0;z-index:1;background:linear-gradient(to top,rgba(6,6,6,.95) 0%,rgba(6,6,6,.5) 50%,rgba(6,6,6,.2) 100%)}
.hero-inner{position:relative;z-index:2;padding:0 48px 80px;width:100%}
.hero-kicker{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--p);font-weight:700;margin-bottom:18px}
.hero-headline{font-family:var(--font-h);font-size:clamp(64px,11vw,140px);font-weight:900;font-style:italic;line-height:.88;letter-spacing:-.01em;text-transform:uppercase;color:var(--txt);margin-bottom:16px}
.hero-headline em{font-style:italic;color:var(--p)}
.hero-sub{font-size:16px;color:var(--muted);font-weight:400;margin-bottom:36px;max-width:560px;line-height:1.6}
.hero-btns{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:40px}
.btn-primary{display:inline-flex;align-items:center;gap:8px;background:var(--p);color:var(--acc-fg);font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;padding:17px 40px;border:none;border-radius:0;transition:background .2s,transform .15s}
.btn-primary:hover{background:var(--ph);transform:translateY(-2px)}
.btn-outline{display:inline-flex;align-items:center;gap:8px;background:transparent;color:var(--txt);border:2px solid rgba(255,255,255,.25);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:15px 32px;border-radius:0;transition:background .2s,border-color .2s}
.btn-outline:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.5)}
.hero-stats{display:flex;align-items:center;gap:32px;flex-wrap:wrap}
.hero-stat{display:flex;align-items:center;gap:0}
.hero-stat-val{font-family:var(--font-h);font-size:28px;font-weight:900;color:var(--p);line-height:1}
.hero-stat-label{font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-left:8px}
.hero-stat-sep{color:rgba(255,255,255,.2);margin:0 16px;font-size:20px}
@media(max-width:768px){.hero-inner{padding:0 24px 60px}.hero-stat-sep{display:none}.hero-stats{gap:20px}}

/* ── Sections ── */
.section-dark{padding:100px 0;background:var(--bg)}
.section-surface{padding:100px 0;background:var(--surface)}
.section-surface2{padding:100px 0;background:var(--surface2)}
.section-label{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--p);font-weight:700;margin-bottom:16px}
.section-title{font-family:var(--font-h);font-size:clamp(40px,6vw,72px);font-weight:900;text-transform:uppercase;line-height:.95;letter-spacing:-.01em;margin-bottom:56px}
.section-title em{font-style:italic;color:var(--p)}

/* ── Modalidades ── */
.mod-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:2px}
@media(max-width:1100px){.mod-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:700px){.mod-grid{grid-template-columns:repeat(2,1fr)}}
.mod-card{background:var(--surface2);padding:36px 28px;border:1px solid var(--bdr);transition:border-color .25s,background .25s,transform .25s;cursor:default}
.mod-card:hover{border-color:var(--p);background:rgba(132,204,22,.04);transform:translateY(-4px)}
.mod-icon{font-size:36px;margin-bottom:18px;transition:transform .25s}
.mod-card:hover .mod-icon{transform:scale(1.15)}
.mod-name{font-family:var(--font-h);font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:var(--txt);margin-bottom:8px}
.mod-desc{font-size:13px;color:var(--muted);line-height:1.65}

/* ── Planos ── */
.plans-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
@media(max-width:900px){.plans-grid{grid-template-columns:1fr;gap:12px}}
.plan-card{background:var(--surface2);border:1px solid var(--bdr);padding:44px 36px;position:relative;display:flex;flex-direction:column;gap:0;transition:transform .25s}
.plan-card:hover{transform:translateY(-6px)}
.plan-highlight{background:rgba(132,204,22,.06);border-color:var(--p);transform:scale(1.03)}
.plan-highlight:hover{transform:scale(1.03) translateY(-6px)}
.plan-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:var(--p);color:var(--acc-fg);font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;padding:5px 16px;white-space:nowrap}
.plan-name{font-family:var(--font-h);font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:18px}
.plan-highlight .plan-name{color:var(--p)}
.plan-price-wrap{display:flex;align-items:baseline;gap:4px;margin-bottom:8px}
.plan-currency{font-size:18px;font-weight:700;color:var(--muted);line-height:1}
.plan-price{font-family:var(--font-h);font-size:64px;font-weight:900;line-height:.9;color:var(--txt)}
.plan-highlight .plan-price{color:var(--p)}
.plan-period{font-size:14px;color:var(--muted);font-weight:500}
.plan-desc{font-size:13px;color:var(--muted);margin-bottom:28px;margin-top:8px;line-height:1.5}
.plan-feats{list-style:none;display:flex;flex-direction:column;gap:10px;margin-bottom:36px;flex:1}
.plan-feat{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--muted);line-height:1.5}
.plan-feat-check{color:var(--p);font-weight:900;flex-shrink:0;font-size:15px}
.plan-cta{display:block;text-align:center;background:transparent;color:var(--txt);border:2px solid rgba(255,255,255,.18);font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;padding:16px;transition:background .2s,border-color .2s}
.plan-cta:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.45)}
.plan-cta-highlight{background:var(--p);color:var(--acc-fg);border-color:var(--p)}
.plan-cta-highlight:hover{background:var(--ph);border-color:var(--ph)}

/* ── Grade de Aulas ── */
.grade-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.grade-table{width:100%;border-collapse:collapse;min-width:640px}
.grade-table th,.grade-table td{padding:14px 18px;border:1px solid var(--bdr);font-size:13px;text-align:left}
.grade-table th{font-family:var(--font-h);font-size:15px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--p);background:rgba(132,204,22,.04)}
.grade-time{font-family:var(--font-h);font-weight:900;font-size:16px;color:var(--txt);letter-spacing:.06em;white-space:nowrap}
.grade-table td:not(.grade-time){color:var(--muted)}
.grade-table tr:hover td{background:rgba(132,204,22,.03)}

/* ── Free trial CTA ── */
.trial-section{padding:120px 0;background:linear-gradient(135deg,rgba(132,204,22,.08) 0%,rgba(6,6,6,0) 60%),var(--surface);border-top:1px solid var(--bdr)}
.trial-inner{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
@media(max-width:900px){.trial-inner{grid-template-columns:1fr;gap:48px}}
.trial-eyebrow{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--p);font-weight:700;margin-bottom:16px}
.trial-headline{font-family:var(--font-h);font-size:clamp(48px,8vw,96px);font-weight:900;font-style:italic;text-transform:uppercase;line-height:.9;letter-spacing:-.01em;color:var(--txt);margin-bottom:20px}
.trial-headline em{color:var(--p);font-style:italic}
.trial-sub{font-size:15px;color:var(--muted);line-height:1.7;max-width:420px}
.trial-form{background:var(--surface2);border:1px solid var(--bdr);padding:44px 40px}
.trial-form-title{font-family:var(--font-h);font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:28px;color:var(--txt)}
.trial-input-group{display:flex;flex-direction:column;gap:12px;margin-bottom:20px}
.trial-input{padding:16px 18px;background:var(--surface);border:1px solid var(--bdr);color:var(--txt);font-size:15px;font-family:var(--font-b);outline:none;border-radius:0;transition:border-color .2s}
.trial-input::placeholder{color:var(--muted)}
.trial-input:focus{border-color:var(--p)}
.trial-submit{width:100%;padding:18px;background:var(--p);color:var(--acc-fg);border:none;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;border-radius:0;transition:background .2s,transform .15s}
.trial-submit:hover{background:var(--ph);transform:translateY(-2px)}
.trial-note{font-size:11px;color:var(--muted);text-align:center;margin-top:14px;line-height:1.6}

/* ── Team ── */
.team-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:2px}
@media(max-width:900px){.team-grid{grid-template-columns:repeat(2,1fr)}}
.team-card{overflow:hidden}
.team-img{width:100%;aspect-ratio:3/4;object-fit:cover;filter:grayscale(30%);transition:filter .4s,transform .4s}
.team-img-ph{width:100%;aspect-ratio:3/4;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:56px;font-family:var(--font-h);font-weight:900;color:var(--p)}
.team-card:hover .team-img{filter:grayscale(0%);transform:scale(1.03)}
.team-info{padding:18px 20px;background:var(--surface2)}
.team-name{font-family:var(--font-h);font-size:19px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:var(--txt);margin-bottom:4px}
.team-role{font-size:12px;color:var(--p);font-weight:600;letter-spacing:.08em;text-transform:uppercase}

/* ── Location/hours ── */
.loc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
.loc-card{background:var(--surface2);border:1px solid var(--bdr);padding:40px 36px}
.loc-card-title{font-family:var(--font-h);font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:var(--p);margin-bottom:24px}
.hours-list{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.hours-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--bdr)}
.hours-day{font-size:13px;font-weight:600;color:var(--muted)}
.hours-time{font-size:13px;font-weight:700;color:var(--txt)}
.loc-address{font-size:14px;color:var(--muted);line-height:1.7;margin-bottom:12px}
.loc-rating{font-size:14px;color:var(--p);font-weight:700;margin-bottom:24px}
.loc-wa-btn{display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:12px 24px;border-radius:0;transition:background .2s}
.loc-wa-btn:hover{background:#128C7E}

/* ── WA float ── */
.wa-float{position:fixed;bottom:28px;left:28px;z-index:300;display:flex;align-items:center;gap:10px;background:#25D366;color:#fff;padding:14px 22px;border-radius:0;box-shadow:0 8px 32px rgba(37,211,102,.35);transition:transform .2s,box-shadow .2s;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
.wa-float:hover{transform:translateY(-3px);box-shadow:0 14px 44px rgba(37,211,102,.48)}

/* ── Order banner ── */
.order-banner{position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:600;background:transparent;color:transparent;padding:14px 28px;font-size:14px;font-weight:700;border-radius:0;pointer-events:none;transition:all .3s;white-space:nowrap}
.order-banner.success{background:#15803D;color:#fff;box-shadow:0 8px 32px rgba(21,128,61,.35)}
.order-banner.error{background:#DC2626;color:#fff;box-shadow:0 8px 32px rgba(220,38,38,.35)}

/* ── Footer ── */
.site-footer{background:var(--surface);border-top:1px solid var(--bdr);padding:72px 0 40px}
.footer-inner{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:48px;margin-bottom:48px}
.footer-brand{font-family:var(--font-h);font-size:30px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:var(--txt);margin-bottom:14px}
.footer-brand em{color:var(--p);font-style:normal}
.footer-brand-desc{font-size:13px;color:var(--muted);line-height:1.7;max-width:280px}
.footer-col-title{font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;color:var(--p);margin-bottom:18px}
.footer-links{display:flex;flex-direction:column;gap:10px}
.footer-link{font-size:13px;color:var(--muted);transition:color .15s}
.footer-link:hover{color:var(--txt)}
.footer-bottom{display:flex;align-items:center;justify-content:space-between;padding-top:32px;border-top:1px solid var(--bdr)}
.footer-copy{font-size:11px;color:var(--muted);letter-spacing:.05em}
.footer-wa-btn{display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:11px 22px;border-radius:0;transition:background .15s}
.footer-wa-btn:hover{background:#128C7E}
@media(max-width:768px){.footer-inner{grid-template-columns:1fr;gap:36px}.footer-bottom{flex-direction:column;gap:16px;text-align:center}}

${SHARED_CSS}
</style>
</head>
<body>

<!-- ── Nav ── -->
<nav class="site-nav" id="site-nav">
  <a class="nav-brand" href="#">
    ${logoImg
      ? `<img class="nav-logo" src="${logoImg.public_url || logoImg.url}" alt="${site.business_name}">`
      : `${site.business_name}`}
  </a>
  <div class="nav-links">
    <a class="nav-link" href="#modalidades">Modalidades</a>
    <a class="nav-link" href="#planos">Planos</a>
    <a class="nav-link" href="#horarios">Horários</a>
  </div>
  <div class="nav-actions">
    <a class="btn-nav-cta hide-mob" href="#aula-gratis">Aula Grátis →</a>
    <button class="nav-ham" id="nav-ham" aria-label="Menu" onclick="document.getElementById('nav-mob').classList.toggle('open')">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>
<div class="nav-mob" id="nav-mob">
  <a class="nav-mob-link" href="#modalidades" onclick="document.getElementById('nav-mob').classList.remove('open')">Modalidades</a>
  <a class="nav-mob-link" href="#planos" onclick="document.getElementById('nav-mob').classList.remove('open')">Planos</a>
  <a class="nav-mob-link" href="#horarios" onclick="document.getElementById('nav-mob').classList.remove('open')">Horários</a>
  <a class="nav-mob-link" href="#aula-gratis" onclick="document.getElementById('nav-mob').classList.remove('open')">Aula Grátis →</a>
</div>

<!-- ── Hero ── -->
<section class="site-hero" id="home">
  ${heroSlides}
  <div class="hero-overlay"></div>
  <div class="hero-inner">
    <div class="hero-kicker">${site.niche || "Academia"} · ${location}</div>
    <h1 class="hero-headline" data-split>${heroContent.headline || site.business_name}</h1>
    ${heroContent.subheadline ? `<p class="hero-sub">${heroContent.subheadline}</p>` : `<p class="hero-sub">Transforme seu corpo. Supere seus limites.<br>Comece hoje mesmo.</p>`}
    <div class="hero-btns">
      <a class="btn-primary" href="#aula-gratis">Começar Agora</a>
      <a class="btn-outline" href="#planos">Ver Planos</a>
    </div>
    <div class="hero-stats hero-meta">
      <div class="hero-stat">
        <span class="hero-stat-val">500+</span>
        <span class="hero-stat-label">Alunos</span>
      </div>
      <span class="hero-stat-sep">·</span>
      <div class="hero-stat">
        <span class="hero-stat-val">15</span>
        <span class="hero-stat-label">Anos</span>
      </div>
      <span class="hero-stat-sep">·</span>
      <div class="hero-stat">
        <span class="hero-stat-val">12</span>
        <span class="hero-stat-label">Modalidades</span>
      </div>
    </div>
  </div>
</section>

<!-- ── Promo ticker ── -->
<div class="promo-ticker" aria-hidden="true">
  <div class="ticker-track">
    <span class="ticker-item">SEM FIDELIDADE</span>
    <span class="ticker-item ticker-dot">✦</span>
    <span class="ticker-item">WIFI GRÁTIS</span>
    <span class="ticker-item ticker-dot">✦</span>
    <span class="ticker-item">AR CONDICIONADO</span>
    <span class="ticker-item ticker-dot">✦</span>
    <span class="ticker-item">VESTIÁRIO</span>
    <span class="ticker-item ticker-dot">✦</span>
    <span class="ticker-item">AVALIAÇÃO FÍSICA GRÁTIS</span>
    <span class="ticker-item ticker-dot">✦</span>
    <span class="ticker-item">SEM FIDELIDADE</span>
    <span class="ticker-item ticker-dot">✦</span>
    <span class="ticker-item">WIFI GRÁTIS</span>
    <span class="ticker-item ticker-dot">✦</span>
    <span class="ticker-item">AR CONDICIONADO</span>
    <span class="ticker-item ticker-dot">✦</span>
    <span class="ticker-item">VESTIÁRIO</span>
    <span class="ticker-item ticker-dot">✦</span>
    <span class="ticker-item">AVALIAÇÃO FÍSICA GRÁTIS</span>
    <span class="ticker-item ticker-dot">✦</span>
  </div>
</div>

<!-- ── Photo strip ── -->
${photoStrip}

<!-- ── Modalidades ── -->
<section class="section-dark" id="modalidades">
  <div class="wrap">
    <div class="section-label sr-fade">O que Oferecemos</div>
    <h2 class="section-title sr-up">Nossas <em>Modalidades</em></h2>
    <div class="mod-grid">${modalHtml}</div>
  </div>
</section>

<!-- ── Planos ── -->
<section class="section-surface" id="planos">
  <div class="wrap">
    <div class="section-label sr-fade">Investimento</div>
    <h2 class="section-title sr-up">Escolha seu <em>Plano</em></h2>
    <div class="plans-grid">${planosHtml}</div>
  </div>
</section>

<!-- ── Grade de Aulas ── -->
<section class="section-dark" id="grade">
  <div class="wrap">
    <div class="section-label sr-fade">Programação</div>
    <h2 class="section-title sr-up">Grade de <em>Aulas</em></h2>
    <div class="grade-wrap sr-up">
      <table class="grade-table">
        <thead>
          <tr>
            <th>Horário</th>
            <th>Segunda</th>
            <th>Terça</th>
            <th>Quarta</th>
            <th>Quinta</th>
            <th>Sexta</th>
            <th>Sábado</th>
          </tr>
        </thead>
        <tbody>${gradeRows}</tbody>
      </table>
    </div>
  </div>
</section>

<!-- ── Team ── -->
${teamHtml}

<!-- ── Free trial CTA ── -->
<section class="trial-section" id="aula-gratis">
  <div class="wrap">
    <div class="trial-inner">
      <div>
        <div class="trial-eyebrow sr-fade">Sem compromisso</div>
        <h2 class="trial-headline sr-up">PRIMEIRA<br>AULA <em>GRÁTIS</em></h2>
        <p class="trial-sub sr-up">Venha conhecer nossa estrutura, experimentar nossas modalidades e conversar com nossa equipe. Zero compromisso — só resultados.</p>
      </div>
      <div class="trial-form sr-up">
        <div class="trial-form-title">Agendar minha aula</div>
        <div class="trial-input-group">
          <input class="trial-input" type="text" id="trial-name" placeholder="Seu nome" autocomplete="name">
          <input class="trial-input" type="tel" id="trial-phone" placeholder="Seu WhatsApp (11) 99999-9999" autocomplete="tel" oninput="maskTrialPhone(this)">
        </div>
        <button class="trial-submit" onclick="sendTrialWA()">AGENDAR MINHA AULA GRÁTIS</button>
        <p class="trial-note">Você será redirecionado para o WhatsApp para confirmar o horário. 100% gratuito.</p>
      </div>
    </div>
  </div>
</section>

<!-- ── Testimonials ── -->
${testiSection}

<!-- ── Location/hours ── -->
${locSection}

<!-- ── Footer ── -->
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-inner">
      <div>
        <div class="footer-brand">${site.business_name}</div>
        <p class="footer-brand-desc">${site.niche || "Academia"} em ${location}. Transformando vidas através do esporte e do movimento.</p>
        ${ratingBadge ? `<div style="margin-top:16px;font-size:13px;color:var(--p);font-weight:700">⭐ ${ratingBadge}</div>` : ""}
      </div>
      <div>
        <div class="footer-col-title">Navegação</div>
        <div class="footer-links">
          <a class="footer-link" href="#modalidades">Modalidades</a>
          <a class="footer-link" href="#planos">Planos</a>
          <a class="footer-link" href="#grade">Horários</a>
          <a class="footer-link" href="#aula-gratis">Aula Grátis</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title">Contato</div>
        <div class="footer-links">
          <a class="footer-link" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>
          ${site.city ? `<span class="footer-link">${location}</span>` : ""}
          ${placesData?.address ? `<span class="footer-link" style="font-size:12px">${placesData.address}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span class="footer-copy">© ${new Date().getFullYear()} ${site.business_name}. Todos os direitos reservados.</span>
      <a class="footer-wa-btn" href="${wa}" target="_blank" rel="noopener">${WA_SVG} WhatsApp</a>
    </div>
  </div>
</footer>

<!-- ── WA float ── -->
<a class="wa-float" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">
  ${WA_SVG} WhatsApp
</a>

<!-- ── Order banner ── -->
<div class="order-banner" id="order-banner"></div>

<script>
${SHARED_JS}

// ── Trial form ──
function maskTrialPhone(input){
  var v=input.value.replace(/\\D/g,"").slice(0,11);
  if(v.length>10)v="("+v.slice(0,2)+") "+v.slice(2,7)+"-"+v.slice(7);
  else if(v.length>6)v="("+v.slice(0,2)+") "+v.slice(2,6)+"-"+v.slice(6);
  else if(v.length>2)v="("+v.slice(0,2)+") "+v.slice(2);
  else if(v.length>0)v="("+v;
  input.value=v;
}
function sendTrialWA(){
  var name=document.getElementById("trial-name").value.trim();
  var phone=document.getElementById("trial-phone").value.trim();
  if(!name){document.getElementById("trial-name").focus();return;}
  var msg="Olá! Quero agendar minha *PRIMEIRA AULA GRÁTIS* na ${site.business_name.replace(/`/g, "\\`")}."
    +(name?"\n\n*Nome:* "+name:"")
    +(phone?"\n*WhatsApp:* "+phone:"")
    +"\n\nAguardo confirmação do horário!";
  var waBase="${wa}".split("?")[0];
  window.open(waBase+"?text="+encodeURIComponent(msg),"_blank","noopener");
}
</script>
</body>
</html>`;
}
