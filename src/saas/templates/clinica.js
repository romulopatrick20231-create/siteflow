/**
 * clinica.js — Premium Clínica / Consultório template.
 *
 * Design: clean white + teal professional. Vera Clinic / Albert Einstein level.
 * Covers: Odontológica, Médica, Fisioterapia, Nutrição, Estética, Veterinária-light.
 * Lead-gen only (no cart). All CTAs route to WhatsApp or phone booking.
 * GSAP animations, Ken Burns hero, photo strip, team section.
 */

import { waLink } from "../htmlBuilder.js";
import {
  WA_SVG, findSection, getAllImages, getFirstImage,
  getHeroContent, getTestimonials, getLocationData,
  buildHeroSlides, buildPhotoStrip, buildTestimonials,
  SHARED_CSS, SHARED_JS,
} from "./shared.js";

// Design tokens per specialty
const CLINIC_CONFIGS = {
  "Clínica Odontológica": {
    primary: "#0E7490", primaryHover: "#0C6478", accent: "#06B6D4",
    icon: "🦷", specialty: "Odontologia", bookLabel: "Agendar Consulta",
    heroTagline: "Sorria com mais confiança.",
    trustItems: ["CRO Certificado", "Anestesia Indolor", "Clareamento Dental", "Implantes"],
  },
  "Clínica Médica": {
    primary: "#1D4ED8", primaryHover: "#1E40AF", accent: "#3B82F6",
    icon: "🩺", specialty: "Medicina", bookLabel: "Marcar Consulta",
    heroTagline: "Cuidado humano, tecnologia avançada.",
    trustItems: ["CRM Certificado", "Equipe Especializada", "Prontuário Digital", "Exames no Local"],
  },
  "Clínica de Fisioterapia": {
    primary: "#059669", primaryHover: "#047857", accent: "#10B981",
    icon: "🏃", specialty: "Fisioterapia", bookLabel: "Agendar Sessão",
    heroTagline: "Recupere seu movimento, recupere sua vida.",
    trustItems: ["CREFITO Certificado", "Pilates Clínico", "RPG", "Reabilitação Esportiva"],
  },
  "Consultório de Nutrição": {
    primary: "#65A30D", primaryHover: "#4D7C0F", accent: "#84CC16",
    icon: "🥗", specialty: "Nutrição", bookLabel: "Agendar Consulta",
    heroTagline: "Alimentação que transforma.",
    trustItems: ["CRN Certificado", "Reeducação Alimentar", "Acompanhamento Online", "Plano Personalizado"],
  },
  "Clínica de Estética": {
    primary: "#9333EA", primaryHover: "#7E22CE", accent: "#A855F7",
    icon: "✨", specialty: "Estética", bookLabel: "Agendar Procedimento",
    heroTagline: "Beleza que realça quem você é.",
    trustItems: ["CRM / CREnf", "Produtos Premium", "Ambiente Exclusivo", "Resultados Reais"],
  },
};

const DEFAULT_CONFIG = {
  primary: "#0E7490", primaryHover: "#0C6478", accent: "#06B6D4",
  icon: "🏥", specialty: "Saúde", bookLabel: "Agendar Consulta",
  heroTagline: "Cuidado e tecnologia para sua saúde.",
  trustItems: ["Certificado", "Equipe Especializada", "Atendimento Humanizado", "Tecnologia Avançada"],
};

export function buildClinicaHTML(site) {
  const cfg       = CLINIC_CONFIGS[site.niche] || DEFAULT_CONFIG;
  const wa        = waLink(site.phone, site.business_name);
  const waBook    = waLink(site.phone, site.business_name, `Olá! Gostaria de ${cfg.bookLabel.toLowerCase()} em ${site.business_name}.`);
  const location  = [site.neighborhood, site.city].filter(Boolean).join(", ");
  const heroContent = getHeroContent(site);
  const placesData  = site.content?.placesData || null;
  const logoImg     = (site.images || []).find(i => i.type === "logo");

  const allImgs    = getAllImages(site, 8);
  const heroSlides = buildHeroSlides(site, "0.40");
  const photoStrip = buildPhotoStrip(site, "220px");
  const testiCards = buildTestimonials(site);

  const ratingBadge = placesData?.rating
    ? `⭐ ${placesData.rating.toFixed(1)} · ${placesData.totalRatings?.toLocaleString("pt-BR") || ""} avaliações`
    : "";

  // ── Services ───────────────────────────────────────────────────────────────
  const servicesSec = findSection(site, ["services", "features", "menu_categories", "highlights"]);
  const rawServices = servicesSec?.data?.items
    || servicesSec?.data?.services
    || servicesSec?.data?.categories
    || [];

  const defaultServices = [
    { icon: "🔬", name: "Consulta & Diagnóstico",    desc: "Avaliação completa com profissional experiente e tecnologia de ponta." },
    { icon: "💉", name: "Procedimentos Clínicos",    desc: "Tratamentos modernos, seguros e com resultados comprovados." },
    { icon: "📋", name: "Acompanhamento Contínuo",   desc: "Retornos e monitoramento para garantir sua evolução." },
    { icon: "💻", name: "Teleconsulta",               desc: "Atendimento online por videochamada com a mesma qualidade." },
    { icon: "🧪", name: "Exames & Laudos",            desc: "Resultados rápidos com interpretação especializada." },
    { icon: "❤️", name: "Saúde Preventiva",           desc: "Checkup e prevenção para uma vida mais saudável e longa." },
  ];

  const services = rawServices.length ? rawServices.slice(0, 6) : defaultServices;

  const serviceCards = services.map((s, i) => `
  <div class="cl-svc-card card-anim" style="animation-delay:${i * 0.07}s">
    <div class="cl-svc-icon">${s.icon || s.emoji || cfg.icon}</div>
    <h3 class="cl-svc-name">${s.name || s.title || "Serviço"}</h3>
    <p class="cl-svc-desc">${s.desc || s.description || ""}</p>
    <a href="${waBook}" target="_blank" rel="noopener" class="cl-svc-link">Agendar →</a>
  </div>`).join("");

  // ── Team ──────────────────────────────────────────────────────────────────
  const teamSec  = findSection(site, ["team", "staff", "doctors", "professionals"]);
  const rawTeam  = teamSec?.data?.members || teamSec?.data?.team || teamSec?.data?.staff || [];
  const teamHTML = rawTeam.slice(0, 4).map(m => {
    const imgUrl = m?.photo?.url || m?.image?.url || (typeof m?.photo === "string" ? m.photo : null)
      || (typeof m?.image === "string" ? m.image : null) || allImgs[0] || "";
    return `
  <div class="cl-team-card card-anim">
    ${imgUrl ? `<div class="cl-team-photo" style="background-image:url('${imgUrl}')"></div>` : `<div class="cl-team-photo cl-team-placeholder">${cfg.icon}</div>`}
    <div class="cl-team-info">
      <div class="cl-team-name">${m.name || "Especialista"}</div>
      <div class="cl-team-role">${m.role || m.specialty || m.title || cfg.specialty}</div>
      ${m.crm || m.cro || m.registro ? `<div class="cl-team-reg">${m.crm || m.cro || m.registro}</div>` : ""}
    </div>
  </div>`;
  }).join("");

  // ── Location ──────────────────────────────────────────────────────────────
  const locData = getLocationData(site) || {};
  const hoursHTML = (locData.hours || []).map(h =>
    `<div class="cl-hours-row slide-anim">
      <span class="cl-hours-day">${h.days}</span>
      <span class="cl-hours-time">${h.hours}</span>
    </div>`
  ).join("");

  const trustBadges = cfg.trustItems.map(t =>
    `<div class="cl-trust-item"><span class="cl-trust-check">✓</span>${t}</div>`
  ).join("");

  const primary = cfg.primary;
  const accent  = cfg.accent;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${site.business_name} — ${cfg.specialty} em ${site.city || "sua cidade"}</title>
<meta name="description" content="${heroContent.subheadline || cfg.heroTagline}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,600&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js" defer></script>
<style>
/* ── Reset & Base ─────────────────────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#FAFCFF;color:#0F172A;line-height:1.6;overflow-x:hidden}
img{max-width:100%;height:auto;display:block}
a{color:inherit;text-decoration:none}
button{cursor:pointer;border:none;background:none;font:inherit}

/* ── Variables ───────────────────────────────────────────────── */
:root{
  --primary:${primary};
  --primary-hover:${cfg.primaryHover};
  --accent:${accent};
  --text:#0F172A;
  --muted:#64748B;
  --surface:#FFFFFF;
  --surface2:#F1F5F9;
  --border:#E2E8F0;
  --radius:14px;
  --shadow:0 4px 24px rgba(0,0,0,.08);
  --shadow-lg:0 16px 48px rgba(0,0,0,.12);
}

/* ── Nav ─────────────────────────────────────────────────────── */
.cl-nav{
  position:fixed;top:0;left:0;right:0;z-index:100;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 5%;height:72px;
  background:rgba(250,252,255,0);
  backdrop-filter:blur(0px);
  transition:background .35s,backdrop-filter .35s,box-shadow .35s;
}
.cl-nav.scrolled{
  background:rgba(250,252,255,.95);
  backdrop-filter:blur(20px);
  box-shadow:0 1px 0 var(--border);
}
.cl-nav-logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.1rem;color:var(--text)}
.cl-nav-logo img{height:38px;width:auto;border-radius:8px}
.cl-nav-links{display:flex;align-items:center;gap:28px}
.cl-nav-links a{font-size:.9rem;font-weight:500;color:var(--muted);transition:color .2s}
.cl-nav-links a:hover{color:var(--primary)}
.cl-nav-cta{
  display:flex;align-items:center;gap:8px;
  background:var(--primary);color:#fff;
  padding:10px 22px;border-radius:50px;
  font-size:.88rem;font-weight:700;
  transition:background .2s,transform .15s,box-shadow .2s;
  box-shadow:0 4px 16px color-mix(in srgb,var(--primary) 35%,transparent);
}
.cl-nav-cta:hover{background:var(--primary-hover);transform:translateY(-1px)}
@media(max-width:768px){.cl-nav-links{display:none}}

/* ── Hero ────────────────────────────────────────────────────── */
.cl-hero{
  position:relative;min-height:100svh;
  display:flex;align-items:center;
  overflow:hidden;padding-top:72px;
}
.cl-hero-slides{position:absolute;inset:0;z-index:0}
.cl-hero-slide{
  position:absolute;inset:0;
  background-size:cover;background-position:center;
  opacity:0;transition:opacity 1.2s ease;
  animation:cl-kb 18s ease-in-out infinite alternate;
  will-change:transform,opacity;
}
.cl-hero-slide.active{opacity:var(--cl-opacity,.42)}
@keyframes cl-kb{
  0%  {transform:scale(1)    translateX(0)     translateY(0)}
  33% {transform:scale(1.06) translateX(-1%)   translateY(.5%)}
  66% {transform:scale(1.04) translateX(.8%)   translateY(-.5%)}
  100%{transform:scale(1.08) translateX(-.5%)  translateY(1%)}
}
.cl-hero-gradient{
  position:absolute;inset:0;z-index:1;
  background:linear-gradient(110deg,rgba(250,252,255,.97) 0%,rgba(250,252,255,.88) 45%,rgba(250,252,255,.3) 100%);
}
.cl-hero-content{position:relative;z-index:2;padding:0 5%;max-width:660px}
.cl-hero-badge{
  display:inline-flex;align-items:center;gap:8px;
  background:color-mix(in srgb,var(--primary) 10%,transparent);
  color:var(--primary);
  padding:6px 16px;border-radius:50px;
  font-size:.82rem;font-weight:700;letter-spacing:.04em;
  border:1px solid color-mix(in srgb,var(--primary) 20%,transparent);
  margin-bottom:20px;
}
.cl-hero-title{
  font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(2.2rem,5vw,3.8rem);
  font-weight:700;line-height:1.1;
  color:var(--text);margin-bottom:18px;
}
.cl-hero-title em{color:var(--primary);font-style:italic}
.cl-hero-sub{font-size:1.1rem;color:var(--muted);margin-bottom:32px;max-width:520px;line-height:1.65}
.cl-hero-actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.cl-btn-primary{
  display:inline-flex;align-items:center;gap:10px;
  background:var(--primary);color:#fff;
  padding:14px 30px;border-radius:50px;
  font-size:1rem;font-weight:700;
  box-shadow:0 8px 24px color-mix(in srgb,var(--primary) 35%,transparent);
  transition:background .2s,transform .15s;
}
.cl-btn-primary:hover{background:var(--primary-hover);transform:translateY(-2px)}
.cl-btn-outline{
  display:inline-flex;align-items:center;gap:8px;
  border:2px solid var(--border);color:var(--text);
  padding:13px 26px;border-radius:50px;
  font-size:.95rem;font-weight:600;
  transition:border-color .2s,color .2s;
}
.cl-btn-outline:hover{border-color:var(--primary);color:var(--primary)}
.cl-hero-stats{
  display:flex;flex-wrap:wrap;gap:28px;
  margin-top:44px;padding-top:32px;
  border-top:1px solid var(--border);
}
.cl-hero-stat-num{font-size:2rem;font-weight:800;color:var(--primary);line-height:1}
.cl-hero-stat-lbl{font-size:.8rem;color:var(--muted);margin-top:4px}

/* ── Trust strip ─────────────────────────────────────────────── */
.cl-trust{
  background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border);
  padding:18px 5%;
  display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:32px;
}
.cl-trust-item{display:flex;align-items:center;gap:8px;font-size:.88rem;font-weight:600;color:var(--text)}
.cl-trust-check{
  width:22px;height:22px;border-radius:50%;
  background:color-mix(in srgb,var(--primary) 12%,transparent);
  color:var(--primary);font-size:.75rem;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}

/* ── Photo strip ─────────────────────────────────────────────── */
${SHARED_CSS.photoStrip}

/* ── Section layout ──────────────────────────────────────────── */
.cl-section{padding:90px 5%}
.cl-section-alt{background:#fff}
.cl-section-label{
  display:inline-flex;align-items:center;gap:8px;
  font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:var(--primary);margin-bottom:14px;
}
.cl-section-label::before{content:'';width:20px;height:2px;background:var(--primary);display:inline-block}
.cl-section-title{
  font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:700;
  color:var(--text);line-height:1.2;margin-bottom:16px;
}
.cl-section-sub{font-size:1rem;color:var(--muted);max-width:560px;line-height:1.65}
.cl-section-head{text-align:center;max-width:640px;margin:0 auto 56px}

/* ── Services grid ───────────────────────────────────────────── */
.cl-svc-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
  gap:20px;
}
.cl-svc-card{
  background:#fff;border:1px solid var(--border);border-radius:var(--radius);
  padding:32px 28px;
  transition:border-color .25s,box-shadow .25s,transform .25s;
}
.cl-svc-card:hover{
  border-color:var(--primary);
  box-shadow:0 8px 32px color-mix(in srgb,var(--primary) 12%,transparent);
  transform:translateY(-4px);
}
.cl-svc-icon{font-size:2rem;margin-bottom:16px}
.cl-svc-name{font-size:1.05rem;font-weight:700;color:var(--text);margin-bottom:10px}
.cl-svc-desc{font-size:.9rem;color:var(--muted);line-height:1.65;margin-bottom:18px}
.cl-svc-link{font-size:.88rem;font-weight:700;color:var(--primary);transition:gap .2s}
.cl-svc-link:hover{text-decoration:underline}

/* ── Why us ──────────────────────────────────────────────────── */
.cl-why{
  background:var(--primary);
  padding:80px 5%;
  display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;
}
@media(max-width:768px){.cl-why{grid-template-columns:1fr;gap:40px}}
.cl-why-title{
  font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(1.8rem,3vw,2.6rem);font-weight:700;
  color:#fff;line-height:1.2;margin-bottom:20px;
}
.cl-why-sub{color:rgba(255,255,255,.75);line-height:1.7;margin-bottom:32px}
.cl-why-cta{
  display:inline-flex;align-items:center;gap:10px;
  background:#fff;color:var(--primary);
  padding:14px 28px;border-radius:50px;
  font-weight:700;font-size:.95rem;
  transition:transform .2s,box-shadow .2s;
  box-shadow:0 4px 20px rgba(0,0,0,.15);
}
.cl-why-cta:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.18)}
.cl-why-items{display:flex;flex-direction:column;gap:24px}
.cl-why-item{
  display:flex;gap:18px;align-items:flex-start;
  background:rgba(255,255,255,.1);border-radius:12px;
  padding:22px;
}
.cl-why-item-icon{
  font-size:1.5rem;width:52px;height:52px;flex-shrink:0;
  background:rgba(255,255,255,.15);border-radius:10px;
  display:flex;align-items:center;justify-content:center;
}
.cl-why-item-title{font-weight:700;color:#fff;margin-bottom:4px}
.cl-why-item-desc{font-size:.88rem;color:rgba(255,255,255,.72);line-height:1.55}

/* ── Team ────────────────────────────────────────────────────── */
.cl-team-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
  gap:24px;
}
.cl-team-card{
  background:#fff;border:1px solid var(--border);border-radius:var(--radius);
  overflow:hidden;transition:box-shadow .25s,transform .25s;
}
.cl-team-card:hover{box-shadow:var(--shadow-lg);transform:translateY(-4px)}
.cl-team-photo{
  width:100%;aspect-ratio:1;
  background-size:cover;background-position:center top;
  background-color:var(--surface2);
}
.cl-team-placeholder{display:flex;align-items:center;justify-content:center;font-size:3rem}
.cl-team-info{padding:20px}
.cl-team-name{font-weight:700;font-size:1rem;color:var(--text)}
.cl-team-role{font-size:.85rem;color:var(--primary);margin-top:4px;font-weight:600}
.cl-team-reg{font-size:.78rem;color:var(--muted);margin-top:4px}

/* ── Testimonials ────────────────────────────────────────────── */
.cl-testi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
.cl-testi-card{
  background:#fff;border:1px solid var(--border);border-radius:var(--radius);
  padding:28px;position:relative;
}
.cl-testi-card::before{
  content:'"';position:absolute;top:16px;left:22px;
  font-size:4rem;line-height:1;color:var(--accent);opacity:.2;
  font-family:Georgia,serif;pointer-events:none;
}
.cl-testi-stars{color:#F59E0B;font-size:1rem;margin-bottom:14px}
.cl-testi-text{font-size:.93rem;color:#334155;line-height:1.7;margin-bottom:20px}
.cl-testi-author{display:flex;align-items:center;gap:12px}
.cl-testi-avatar{
  width:40px;height:40px;border-radius:50%;
  background:color-mix(in srgb,var(--primary) 12%,transparent);
  display:flex;align-items:center;justify-content:center;
  font-weight:700;color:var(--primary);font-size:.95rem;flex-shrink:0;
}
.cl-testi-name{font-weight:700;font-size:.9rem;color:var(--text)}
.cl-testi-tag{font-size:.78rem;color:var(--muted)}

/* ── Rating bar ──────────────────────────────────────────────── */
.cl-rating{
  background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border);
  padding:14px 5%;display:flex;align-items:center;justify-content:center;gap:10px;
  font-size:.9rem;color:var(--muted);
}
.cl-rating strong{color:var(--text);font-weight:700}

/* ── CTA Section ─────────────────────────────────────────────── */
.cl-cta{
  text-align:center;padding:90px 5%;
  background:linear-gradient(135deg,var(--surface2) 0%,#fff 100%);
}
.cl-cta-title{
  font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(1.8rem,3vw,2.6rem);font-weight:700;
  color:var(--text);margin-bottom:16px;
}
.cl-cta-sub{color:var(--muted);margin-bottom:36px;font-size:1rem}
.cl-cta-actions{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}

/* ── Location ────────────────────────────────────────────────── */
.cl-loc{
  display:grid;grid-template-columns:1fr 1fr;gap:56px;
  padding:80px 5%;background:#fff;
}
@media(max-width:768px){.cl-loc{grid-template-columns:1fr;gap:40px}}
.cl-loc-title{
  font-family:'Playfair Display',Georgia,serif;
  font-size:1.8rem;font-weight:700;margin-bottom:28px;color:var(--text);
}
.cl-address{display:flex;flex-direction:column;gap:14px;margin-bottom:28px}
.cl-address-item{display:flex;gap:12px;align-items:flex-start;font-size:.95rem;color:var(--muted)}
.cl-address-icon{color:var(--primary);font-size:1.1rem;flex-shrink:0;margin-top:2px}
.cl-hours-title{font-weight:700;color:var(--text);margin-bottom:14px;font-size:1rem}
.cl-hours-row{
  display:flex;justify-content:space-between;align-items:center;
  padding:10px 0;border-bottom:1px solid var(--border);font-size:.9rem;
}
.cl-hours-day{font-weight:600;color:var(--text)}
.cl-hours-time{color:var(--muted)}

/* ── Footer ──────────────────────────────────────────────────── */
.cl-footer{
  background:#0F172A;color:rgba(255,255,255,.6);
  padding:40px 5%;
  display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;
}
.cl-footer-brand{font-weight:800;font-size:1rem;color:#fff}
.cl-footer-links{display:flex;gap:24px;flex-wrap:wrap}
.cl-footer-links a{font-size:.85rem;transition:color .2s}
.cl-footer-links a:hover{color:#fff}
.cl-footer-copy{font-size:.8rem;width:100%;text-align:center;border-top:1px solid rgba(255,255,255,.08);margin-top:20px;padding-top:20px}

/* ── WA float ────────────────────────────────────────────────── */
.cl-wa-float{
  position:fixed;bottom:24px;right:24px;z-index:999;
  width:58px;height:58px;border-radius:50%;
  background:#25D366;color:#fff;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 20px rgba(37,211,102,.4);
  transition:transform .2s,box-shadow .2s;
}
.cl-wa-float:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(37,211,102,.5)}

/* ── Animations ──────────────────────────────────────────────── */
${SHARED_CSS.animations}

@media(max-width:640px){
  .cl-hero-content{padding:0 4%}
  .cl-section{padding:64px 4%}
  .cl-trust{gap:16px;padding:14px 4%}
  .cl-trust-item{font-size:.8rem}
}
</style>
</head>
<body>

<!-- Nav -->
<nav class="cl-nav" id="cl-nav">
  <a href="#" class="cl-nav-logo">
    ${logoImg ? `<img src="${logoImg.url}" alt="${site.business_name}">` : `<span style="font-size:1.4rem">${cfg.icon}</span>`}
    <span>${site.business_name}</span>
  </a>
  <div class="cl-nav-links">
    <a href="#servicos">Serviços</a>
    ${teamHTML ? `<a href="#equipe">Equipe</a>` : ""}
    <a href="#depoimentos">Depoimentos</a>
    <a href="#localizacao">Localização</a>
  </div>
  <a href="${waBook}" target="_blank" rel="noopener" class="cl-nav-cta">
    ${WA_SVG} ${cfg.bookLabel}
  </a>
</nav>

<!-- Hero -->
<section class="cl-hero">
  <div class="cl-hero-slides" id="cl-hero-slides">
    ${heroSlides}
  </div>
  <div class="cl-hero-gradient"></div>
  <div class="cl-hero-content">
    <div class="cl-hero-badge">${cfg.icon} ${cfg.specialty} • ${location || site.city || "Sua cidade"}</div>
    <h1 class="cl-hero-title" data-split>
      ${heroContent.headline}
    </h1>
    <p class="cl-hero-sub">${heroContent.subheadline || cfg.heroTagline}</p>
    <div class="cl-hero-actions">
      <a href="${waBook}" target="_blank" rel="noopener" class="cl-btn-primary">
        ${WA_SVG} ${cfg.bookLabel}
      </a>
      <a href="#servicos" class="cl-btn-outline">Ver Serviços</a>
    </div>
    ${placesData?.rating ? `
    <div class="cl-hero-stats">
      <div>
        <div class="cl-hero-stat-num">⭐ ${placesData.rating.toFixed(1)}</div>
        <div class="cl-hero-stat-lbl">${placesData.totalRatings?.toLocaleString("pt-BR") || ""} avaliações</div>
      </div>
      ${placesData.totalRatings > 50 ? `<div>
        <div class="cl-hero-stat-num">${placesData.totalRatings > 200 ? "200+" : placesData.totalRatings + "+"}</div>
        <div class="cl-hero-stat-lbl">Pacientes atendidos</div>
      </div>` : ""}
    </div>` : ""}
  </div>
</section>

<!-- Trust strip -->
<div class="cl-trust">${trustBadges}</div>

<!-- Photo strip -->
${photoStrip}

<!-- Rating -->
${ratingBadge ? `<div class="cl-rating">Google: <strong>${ratingBadge}</strong></div>` : ""}

<!-- Services -->
<section class="cl-section" id="servicos">
  <div class="cl-section-head">
    <div class="cl-section-label">Nossos Serviços</div>
    <h2 class="cl-section-title">Cuidado completo para você</h2>
    <p class="cl-section-sub">Atendimento personalizado com os melhores profissionais e tecnologia de ponta.</p>
  </div>
  <div class="cl-svc-grid">${serviceCards}</div>
</section>

<!-- Why us -->
<section class="cl-why">
  <div>
    <div style="font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:12px">Por que nos escolher</div>
    <h2 class="cl-why-title">Excelência que você merece</h2>
    <p class="cl-why-sub">Combinamos experiência clínica, tecnologia avançada e atendimento humanizado para oferecer a melhor experiência em saúde.</p>
    <a href="${waBook}" target="_blank" rel="noopener" class="cl-why-cta">
      ${WA_SVG} ${cfg.bookLabel}
    </a>
  </div>
  <div class="cl-why-items">
    <div class="cl-why-item">
      <div class="cl-why-item-icon">🏆</div>
      <div>
        <div class="cl-why-item-title">Profissionais Certificados</div>
        <div class="cl-why-item-desc">Equipe com formação sólida, atualização constante e compromisso com a sua saúde.</div>
      </div>
    </div>
    <div class="cl-why-item">
      <div class="cl-why-item-icon">💻</div>
      <div>
        <div class="cl-why-item-title">Tecnologia de Ponta</div>
        <div class="cl-why-item-desc">Equipamentos modernos para diagnóstico preciso e tratamentos mais eficazes e confortáveis.</div>
      </div>
    </div>
    <div class="cl-why-item">
      <div class="cl-why-item-icon">❤️</div>
      <div>
        <div class="cl-why-item-title">Atendimento Humanizado</div>
        <div class="cl-why-item-desc">Tratamos cada paciente como único, com escuta ativa e respeito em cada etapa.</div>
      </div>
    </div>
  </div>
</section>

<!-- Team -->
${teamHTML ? `
<section class="cl-section cl-section-alt" id="equipe">
  <div class="cl-section-head">
    <div class="cl-section-label">Nossa Equipe</div>
    <h2 class="cl-section-title">Especialistas dedicados a você</h2>
  </div>
  <div class="cl-team-grid">${teamHTML}</div>
</section>` : ""}

<!-- Testimonials -->
${testiCards ? `
<section class="cl-section" id="depoimentos">
  <div class="cl-section-head">
    <div class="cl-section-label">Depoimentos</div>
    <h2 class="cl-section-title">O que nossos pacientes dizem</h2>
  </div>
  <div class="cl-testi-grid">${testiCards}</div>
</section>` : ""}

<!-- CTA -->
<section class="cl-cta">
  <div class="cl-section-label" style="justify-content:center">Pronto para começar?</div>
  <h2 class="cl-cta-title">Agende sua consulta hoje mesmo</h2>
  <p class="cl-cta-sub">Fale com nossa equipe pelo WhatsApp e escolha o melhor horário para você.</p>
  <div class="cl-cta-actions">
    <a href="${waBook}" target="_blank" rel="noopener" class="cl-btn-primary">
      ${WA_SVG} ${cfg.bookLabel} via WhatsApp
    </a>
    ${site.phone ? `<a href="tel:${site.phone.replace(/\D/g,"")}" class="cl-btn-outline">📞 Ligar Agora</a>` : ""}
  </div>
</section>

<!-- Location -->
<section class="cl-loc" id="localizacao">
  <div>
    <h2 class="cl-loc-title">Como nos encontrar</h2>
    <div class="cl-address">
      ${locData.address ? `<div class="cl-address-item"><span class="cl-address-icon">📍</span><span>${locData.address}</span></div>` : ""}
      ${location ? `<div class="cl-address-item"><span class="cl-address-icon">🏙️</span><span>${location}</span></div>` : ""}
      ${site.phone ? `<div class="cl-address-item"><span class="cl-address-icon">📞</span><span><a href="tel:${site.phone.replace(/\D/g,"")}" style="color:var(--primary)">${site.phone}</a></span></div>` : ""}
      ${site.contact_email ? `<div class="cl-address-item"><span class="cl-address-icon">✉️</span><span>${site.contact_email}</span></div>` : ""}
    </div>
    <a href="${waBook}" target="_blank" rel="noopener" class="cl-btn-primary" style="display:inline-flex">
      ${WA_SVG} Falar no WhatsApp
    </a>
  </div>
  <div>
    <h3 class="cl-hours-title">Horários de Atendimento</h3>
    ${hoursHTML || `
    <div class="cl-hours-row"><span class="cl-hours-day">Segunda — Sexta</span><span class="cl-hours-time">08:00 — 18:00</span></div>
    <div class="cl-hours-row"><span class="cl-hours-day">Sábado</span><span class="cl-hours-time">08:00 — 12:00</span></div>
    <div class="cl-hours-row"><span class="cl-hours-day">Domingo</span><span class="cl-hours-time">Fechado</span></div>`}
  </div>
</section>

<!-- Footer -->
<footer class="cl-footer">
  <div class="cl-footer-brand">${cfg.icon} ${site.business_name}</div>
  <div class="cl-footer-links">
    <a href="#servicos">Serviços</a>
    ${teamHTML ? `<a href="#equipe">Equipe</a>` : ""}
    <a href="#localizacao">Contato</a>
    <a href="${waBook}" target="_blank" rel="noopener">WhatsApp</a>
  </div>
  <div class="cl-footer-copy">© ${new Date().getFullYear()} ${site.business_name} · ${location} · Todos os direitos reservados.</div>
</footer>

<!-- WhatsApp float -->
<a href="${wa}" target="_blank" rel="noopener" class="cl-wa-float" aria-label="WhatsApp">
  ${WA_SVG}
</a>

<script>
${SHARED_JS}

// Hero carousel
(function(){
  const slides = document.querySelectorAll(".cl-hero-slide");
  if(slides.length <= 1) return;
  let cur = 0;
  slides[0]?.classList.add("active");
  setInterval(()=>{
    slides[cur]?.classList.remove("active");
    cur = (cur + 1) % slides.length;
    slides[cur]?.classList.add("active");
  }, 5500);
})();
</script>
</body>
</html>`;
}
