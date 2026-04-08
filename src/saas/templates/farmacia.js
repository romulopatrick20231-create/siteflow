/**
 * farmacia.js — Template premium Farmácia / Drogaria / Farmácia de Manipulação.
 *
 * buildFarmaciaHTML: usa o template Lovable (farmacia-lovable.html) como base.
 *   - Injeta business_name, logo, phone (WA float), city badge
 *   - Sobrescreve variáveis CSS :root para tematização por nicho
 *   - DOM patch script para substituir "FarmaZap" após React renderizar
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { WA_SVG } from "./shared.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Tema por nicho ─────────────────────────────────────────────────────────
// Valores em formato HSL sem hsl() — padrão Tailwind/shadcn
const FARMACIA_CONFIGS = {
  "Farmácia":                { primary: "348 85% 46%", accent: "142 72% 29%" },
  "Drogaria":                { primary: "217 90% 56%", accent: "25 95% 53%"  },
  "Farmácia de Manipulação": { primary: "142 72% 29%", accent: "45 93% 47%"  },
};

// Template Lovable carregado uma vez (1.8 MB, estático)
let _lovableTemplate = null;
function getLovableTemplate() {
  if (!_lovableTemplate) {
    _lovableTemplate = readFileSync(
      join(__dirname, "farmacia-lovable.html"),
      "utf8"
    );
  }
  return _lovableTemplate;
}

// ── buildFarmaciaHTML ──────────────────────────────────────────────────────

export function buildFarmaciaHTML(site) {
  const niche = site.niche || "Farmácia";
  const cfg   = FARMACIA_CONFIGS[niche] || FARMACIA_CONFIGS["Farmácia"];
  console.log(`[buildFarmaciaHTML] Lovable template ativo — niche="${niche}" primary="${cfg.primary}" business="${site.business_name}"`);

  const name   = site.business_name || "FarmaZap";
  const city   = site.city || "";
  const phone  = (site.phone || "").replace(/\D/g, "");
  const waUrl  = phone
    ? `https://wa.me/55${phone}?text=${encodeURIComponent(`Olá, ${name}! Vim pelo site.`)}`
    : "#";

  // Logo: imagem do tipo "logo" ou campo site.logo
  // DB retorna public_url; fallback para url (testes locais) e site.logo
  const logoImg = (site.images || []).find(i => i.type === "logo");
  const logoUrl = logoImg?.public_url || logoImg?.url || site.logo || null;

  let html = getLovableTemplate();

  // 1. Substitui nome da marca (24 ocorrências no template)
  html = html.split("FarmaZap").join(name);

  // 2. Substitui logo se disponível
  if (logoUrl) {
    html = html.split('"/favicon.png"').join(`"${logoUrl}"`);
    html = html.replace('href="/favicon.png"', `href="${logoUrl}"`);
  }

  // 3. Sobrescreve variáveis de cor no :root — injeta ANTES de </style>
  //    O bloco já existente define --primary, --pacheco-red etc; o nosso vem
  //    depois no cascade e vence.
  const cssOverride = [
    `:root{`,
    `--primary:${cfg.primary};`,
    `--pacheco-red:${cfg.primary};`,
    `--pacheco-green:${cfg.accent};`,
    `--pacheco-banner-bg:${cfg.primary};`,
    `--ring:${cfg.primary};`,
    `--secondary:${cfg.accent}`,
    `}`,
  ].join("");
  html = html.replace("</style>", `${cssOverride}</style>`);

  // 4. Injeções de dados do cliente antes de </body>:
  //    - badge de cidade (topo fixo)
  //    - botão flutuante WhatsApp
  const cityBar = city
    ? `<div style="position:fixed;top:0;left:0;right:0;z-index:9000;background:hsl(var(--primary));color:#fff;text-align:center;padding:5px 16px;font-size:13px;font-family:sans-serif;letter-spacing:.3px">📍 Atendendo em ${city}</div>`
    : "";

  const waFloat = `<a href="${waUrl}" target="_blank" rel="noopener" style="position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;align-items:center;gap:10px;background:#25D366;color:#fff;padding:14px 22px;border-radius:50px;font-family:sans-serif;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 6px 24px rgba(37,211,102,.45);transition:transform .2s" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">${WA_SVG} Falar no WhatsApp</a>`;

  // 5. DOM patch script — runs AFTER React mounts and overwrites any residual
  //    "FarmaZap" strings that the compiled React bundle may still render.
  //    (React re-renders from its compiled JS state; our HTML split/join already
  //    replaces the bundle strings, but this is a belt-and-suspenders guard.)
  const safeNameJs  = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const safeWaUrlJs = waUrl.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const domPatch = `<script>
(function(){
  var N='${safeNameJs}',W='${safeWaUrlJs}';
  function patch(){
    var t=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false),n;
    while((n=t.nextNode()))if(n.nodeValue.indexOf('FarmaZap')>-1)n.nodeValue=n.nodeValue.split('FarmaZap').join(N);
    document.querySelectorAll('[href*="FarmaZap"],[alt*="FarmaZap"],[title*="FarmaZap"],[aria-label*="FarmaZap"]').forEach(function(el){
      if(el.href&&el.href.indexOf('FarmaZap')>-1)el.href=el.href.split('FarmaZap').join(encodeURIComponent(N));
      if(el.alt)el.alt=el.alt.split('FarmaZap').join(N);
      if(el.title)el.title=el.title.split('FarmaZap').join(N);
      if(el.ariaLabel)el.ariaLabel=el.ariaLabel.split('FarmaZap').join(N);
    });
    if(document.title.indexOf('FarmaZap')>-1)document.title=document.title.split('FarmaZap').join(N);
  }
  var root=document.getElementById('root');
  if(!root){document.addEventListener('DOMContentLoaded',patch);return;}
  if(root.children.length>0){patch();return;}
  var obs=new MutationObserver(function(){if(root.children.length>0){obs.disconnect();setTimeout(patch,80);}});
  obs.observe(root,{childList:true});
  setTimeout(function(){obs.disconnect();patch();},3000);
})();
</script>`;

  html = html.replace("</body>", `${cityBar}${waFloat}${domPatch}\n</body>`);

  return html;
}

