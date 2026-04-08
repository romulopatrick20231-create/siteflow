/**
 * render.js — Único template do sistema: Farmácia / Drogaria / Farmácia de Manipulação.
 *
 * Uma função, zero dependências internas.
 * Lê farmacia-lovable.html e injeta os dados do cliente.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH  = join(__dirname, 'farmacia-lovable.html');

const COLORS = {
  'farmacia':                { primary: '348 85% 46%', accent: '142 72% 29%' },
  'drogaria':                { primary: '217 90% 56%', accent: '25 95% 53%'  },
  'farmacia de manipulacao': { primary: '142 72% 29%', accent: '45 93% 47%'  },
};

function normalizeNiche(niche) {
  return (niche || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const WA_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

/**
 * Gera o HTML final do site da farmácia com os dados do cliente.
 *
 * @param {{ business_name, niche, phone, city }} site
 * @returns {string} HTML completo pronto para deploy no Vercel
 */
export function renderTemplate(site) {
  const name  = (site.business_name || 'FarmaZap').trim();
  const niche = normalizeNiche(site.niche);
  const phone = (site.phone || '').replace(/\D/g, '');
  const city  = (site.city  || '').trim();

  const cfg = COLORS[niche] || COLORS['farmacia'];

  const waUrl = phone
    ? `https://wa.me/55${phone}?text=${encodeURIComponent(`Olá, ${name}! Vim pelo site.`)}`
    : '#';

  console.log(`[renderTemplate] niche="${niche}" business="${name}" phone="${phone}" city="${city}"`);

  // 1. Carrega template base
  let html = readFileSync(HTML_PATH, 'utf8');

  // 2. Substitui todas as ocorrências de "FarmaZap" pelo nome real
  html = html.split('FarmaZap').join(name);

  // 4. Injeta override de cores no CSS (vai após o último </style>)
  const cssOverride = [
    ':root{',
    `--primary:${cfg.primary};`,
    `--pacheco-red:${cfg.primary};`,
    `--pacheco-green:${cfg.accent};`,
    `--pacheco-banner-bg:${cfg.primary};`,
    `--ring:${cfg.primary};`,
    `--secondary:${cfg.accent}`,
    '}',
  ].join('');
  html = html.replace('</style>', `${cssOverride}</style>`);

  // 4. Monta injeções antes de </body>
  const cityBar = city
    ? `<div style="position:fixed;top:0;left:0;right:0;z-index:9000;background:hsl(${cfg.primary});color:#fff;text-align:center;padding:5px 16px;font-size:13px;font-family:sans-serif;letter-spacing:.3px">📍 Atendendo em ${city}</div>`
    : '';

  const waBtn = `<a href="${waUrl}" target="_blank" rel="noopener" style="position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;align-items:center;gap:10px;background:#25D366;color:#fff;padding:14px 22px;border-radius:50px;font-family:sans-serif;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 6px 24px rgba(37,211,102,.45);transition:transform .2s" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">${WA_ICON} Falar no WhatsApp</a>`;

  // DOM patch: substitui "FarmaZap" residual que o React possa renderizar após mount
  const safeName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const domPatch = `<script>
(function(){
  var N='${safeName}';
  function patch(){
    var t=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false),n;
    while((n=t.nextNode()))if(n.nodeValue.indexOf('FarmaZap')>-1)n.nodeValue=n.nodeValue.split('FarmaZap').join(N);
    if(document.title.indexOf('FarmaZap')>-1)document.title=document.title.split('FarmaZap').join(N);
  }
  var r=document.getElementById('root');
  if(!r){document.addEventListener('DOMContentLoaded',patch);return;}
  if(r.children.length>0){patch();return;}
  var o=new MutationObserver(function(){if(r.children.length>0){o.disconnect();setTimeout(patch,80);}});
  o.observe(r,{childList:true});
  setTimeout(function(){o.disconnect();patch();},3000);
})();
</script>`;

  html = html.replace('</body>', `${cityBar}${waBtn}${domPatch}\n</body>`);

  return html;
}
