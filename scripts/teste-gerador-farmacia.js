/**
 * teste-gerador-farmacia.js
 *
 * Teste end-to-end do pipeline de geração de site para o nicho Farmácia,
 * sem deploy real na Vercel.
 *
 * Pipeline testado:  assembleSiteJson → buildHTML → exportHtml
 * Saída:             dist/farmacia-final.html  (HTML completo, pronto para visualizar)
 *
 * Uso:
 *   node --experimental-vm-modules scripts/teste-gerador-farmacia.js
 */

import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join }  from "path";
import { buildHTML }      from "../src/saas/htmlBuilder.js";
import { exportHtml }     from "../src/saas/exportHtml.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");

// ─────────────────────────────────────────────────────────────────────────────
// 1. site fictício — mesmo formato que getSiteForBuild() retorna do Supabase
//    (sites JOIN site_content JOIN products JOIN images)
// ─────────────────────────────────────────────────────────────────────────────
const site = {
  // ── Colunas da tabela sites ──────────────────────────────────────────────
  id:            "test-farmacia-001",
  user_id:       "usr-test",
  slug:          "farmacia-sao-lucas-abc123",
  business_name: "Farmácia São Lucas",
  niche:         "Farmácia",
  phone:         "11987654321",
  city:          "São Paulo",
  neighborhood:  "Centro",
  status:        "ready",
  site_url:      null,

  // ── Imagens (JOIN com tabela images) ─────────────────────────────────────
  // Campo real do DB é public_url
  images: [
    {
      id:         "img-logo-01",
      public_url: "https://placehold.co/64x64/cc1133/ffffff?text=SL",
      type:       "logo",
    },
    {
      id:         "img-banner-01",
      public_url: "https://images.pexels.com/photos/3683056/pexels-photo-3683056.jpeg",
      type:       "banner",
    },
  ],

  // ── Produtos (JOIN com tabela products) ──────────────────────────────────
  products: [
    { id: "p1", name: "Dipirona 500mg", description: "Analgésico e antipirético", price: "R$ 8,90",  is_active: true },
    { id: "p2", name: "Vitamina C 1g",  description: "Suplemento vitamínico",     price: "R$ 24,90", is_active: true },
    { id: "p3", name: "Protetor Solar FPS 60", description: "Proteção UVA/UVB",  price: "R$ 39,90", is_active: true },
  ],

  // ── Conteúdo rico gerado pela IA (coluna content no DB) ──────────────────
  // Mesmo shape de assembleSiteJson() → salvo como JSON no Supabase
  content: {
    niche:    "Farmácia",
    category: "health",
    business: {
      name:    "Farmácia São Lucas",
      phone:   "11987654321",
      city:    "São Paulo",
      address: "Rua das Flores, 123 — Centro, São Paulo/SP",
    },
    placesData: {
      rating:       4.8,
      totalRatings: 312,
      hours: {
        weekdays: "08h–22h",
        saturday: "08h–20h",
        sunday:   "09h–18h",
      },
      reviews: [
        { nome: "Ana Costa",    texto: "Atendimento excelente e preços ótimos!" },
        { nome: "Pedro Lima",   texto: "Sempre encontro tudo o que preciso aqui." },
        { nome: "Carla Mendes", texto: "Farmacêutico muito atencioso. Recomendo!" },
      ],
    },
    pages: [
      {
        id:   "home",
        name: "Home",
        sections: [
          {
            type: "hero",
            data: {
              headline:    "Sua saúde em boas mãos",
              subheadline: "Medicamentos, dermocosméticos e suplementos com o melhor preço de São Paulo.",
              badge:       "⭐ 4.8 · Farmácia do bairro há 20 anos",
            },
          },
          {
            type: "highlight_bar",
            data: {
              items: [
                { icon: "🧑‍⚕️", text: "Farmacêutico Online" },
                { icon: "🚀",   text: "Entrega Expressa" },
                { icon: "💰",   text: "Menor Preço Garantido" },
                { icon: "🔄",   text: "Troca Fácil" },
              ],
            },
          },
          {
            type: "menu_featured",
            data: {
              featured_items: [
                { name: "Dipirona 500mg",       description: "Analgésico e antipirético",    price: "R$ 8,90",  badge: "🔥 Mais Vendido" },
                { name: "Vitamina C 1g",         description: "Suplemento vitamínico",       price: "R$ 24,90", badge: "" },
                { name: "Protetor Solar FPS 60", description: "Proteção UVA/UVB",            price: "R$ 39,90", badge: "⚡ Oferta" },
                { name: "Buscopan Composto",     description: "Alívio de cólicas",           price: "R$ 14,90", badge: "" },
                { name: "Melatonina 5mg",        description: "Auxilia no sono natural",     price: "R$ 32,90", badge: "✨ Novo" },
                { name: "Colágeno Hidrolisado",  description: "Saúde da pele e articulações", price: "R$ 54,90", badge: "" },
              ],
            },
          },
          {
            type: "menu_categories",
            data: {
              categories: [
                { icon: "💊", name: "Medicamentos",     items: [] },
                { icon: "💆", name: "Dermocosméticos",  items: [] },
                { icon: "🧴", name: "Higiene Pessoal",  items: [] },
                { icon: "🏃", name: "Suplementos",      items: [] },
                { icon: "👶", name: "Bebê & Criança",   items: [] },
                { icon: "💉", name: "Vitaminas",         items: [] },
                { icon: "🌿", name: "Fitoterápicos",    items: [] },
                { icon: "🩹", name: "Primeiros Socorros", items: [] },
              ],
            },
          },
          {
            type: "testimonials",
            data: {
              testimonials: [
                { name: "Ana Costa",    text: "Atendimento excelente e preços ótimos!" },
                { name: "Pedro Lima",   text: "Sempre encontro tudo o que preciso aqui." },
                { name: "Carla Mendes", text: "Farmacêutico muito atencioso. Recomendo!" },
              ],
            },
          },
          {
            type: "location_hours",
            data: {
              address: "Rua das Flores, 123 — Centro, São Paulo/SP",
              hours: {
                weekdays: "08h–22h",
                saturday: "08h–20h",
                sunday:   "09h–18h",
              },
            },
          },
        ],
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Pipeline: buildHTML → exportHtml
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n🔧 Pipeline: buildHTML → exportHtml\n");

const fullHtml = buildHTML(site);
console.log(`  buildHTML       → ${(fullHtml.length / 1024).toFixed(0)} KB`);

const { html, css, js } = exportHtml(site);
console.log(`  exportHtml.html → ${(html.length  / 1024).toFixed(0)} KB`);
console.log(`  exportHtml.css  → ${(css.length   / 1024).toFixed(0)} KB`);
console.log(`  exportHtml.js   → ${(js.length    / 1024).toFixed(0)} KB`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Salva o HTML final em dist/
// ─────────────────────────────────────────────────────────────────────────────
mkdirSync(join(ROOT, "dist"), { recursive: true });
const outPath = join(ROOT, "dist/farmacia-final.html");
writeFileSync(outPath, html, "utf8");
console.log(`\n💾 Salvo em: ${outPath}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Verificações de injeção
//    Nota: exportHtml extrai <style> → style.css (var css).
//          Cores ficam em css; nome/WA/cidade ficam em html.
// ─────────────────────────────────────────────────────────────────────────────
const checks = {
  "template Lovable carregado (>500KB)":            html.length > 500_000,
  "nome 'Farmácia São Lucas' injetado (html)":      html.includes("Farmácia São Lucas"),
  "'FarmaZap' removido (html)":                     !html.includes("FarmaZap"),
  "logo public_url injetado (html)":                html.includes("placehold.co/64x64/cc1133"),
  "--primary override (css)":                       css.includes("--primary:348 85% 46%") || css.includes("--primary: 348 85% 46%"),
  "--pacheco-red override (css)":                   css.includes("--pacheco-red:348") || css.includes("--pacheco-red: 348"),
  "--pacheco-green override 142 72% 29% (css)":     css.includes("--pacheco-green:142") || css.includes("--pacheco-green: 142"),
  "link WhatsApp com telefone (html)":              html.includes("wa.me/5511987654321"),
  "badge de cidade 'São Paulo' (html)":             html.includes("São Paulo"),
  "style.css separado (64+ KB)":                    css.length > 60_000,
};

let ok = 0, fail = 0;
console.log("📋 Verificações:\n");
for (const [label, passed] of Object.entries(checks)) {
  console.log(`  ${passed ? "✅" : "❌"} ${label}`);
  passed ? ok++ : fail++;
}

console.log(`\n${ok}/${ok + fail} checks passaram`);
if (fail > 0) {
  console.log("\n⚠️  Alguns checks falharam — verifique acima.");
  process.exit(1);
} else {
  console.log("🎉 Tudo certo! Abra dist/farmacia-final.html no browser.\n");
}
