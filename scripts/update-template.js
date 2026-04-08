/**
 * update-template.js
 *
 * Reconstrói o HTML de um template a partir do build do Lovable.
 *
 * Uso:
 *   node scripts/update-template.js farmacia    C:\caminho\para\build\dist
 *   node scripts/update-template.js drogaria    C:\caminho\para\build\dist
 *   node scripts/update-template.js manipulacao C:\caminho\para\build\dist
 *
 * Sem argumentos → usa defaults (farmacia + sweet-song-builder)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '../src/saas/templates');

// ── Mapeamento nicho → nome do arquivo de saída ────────────────────────────
const NICHE_MAP = {
  farmacia:    { file: 'farmacia-vermelho.html',  label: 'Farmácia (vermelho)'             },
  drogaria:    { file: 'farmacia-azul.html',      label: 'Drogaria (azul)'                 },
  manipulacao: { file: 'farmacia-verde.html',     label: 'Farmácia de Manipulação (verde)' },
};

// ── Argurmentos ────────────────────────────────────────────────────────────
const nicheArg = (process.argv[2] || 'farmacia').toLowerCase().replace('farmacia_de_', '').replace('ção', 'cao').replace('ç', 'c');
const distArg  = process.argv[3] || 'C:/Users/Romulo Patrick/sweet-song-builder/dist';

const nicheKey = Object.keys(NICHE_MAP).find(k => nicheArg.includes(k)) || 'farmacia';
const target   = NICHE_MAP[nicheKey];

console.log(`\n🎨 Template: ${target.label}`);
console.log(`📂 Build dist: ${distArg}\n`);

// ── Verifica que o dist existe ─────────────────────────────────────────────
if (!existsSync(distArg + '/index.html')) {
  console.error('❌ index.html não encontrado em:', distArg);
  console.error('   Certifique-se de que o projeto foi buildado (npm run build)');
  process.exit(1);
}

// ── Descobre os arquivos do build ──────────────────────────────────────────
console.log('📦 Lendo build...');
const assetsDir = distArg + '/assets';
const assets    = readdirSync(assetsDir);

let mainJs  = null;
let mainCss = null;
let logoFile = null;

for (const file of assets) {
  const path = assetsDir + '/' + file;
  const size = statSync(path).size;
  if (file.endsWith('.js')  && (!mainJs  || size > mainJs.size))  mainJs  = { file, path, size };
  if (file.endsWith('.css') && (!mainCss || size > mainCss.size)) mainCss = { file, path, size };
  if (/\.(png|jpg|webp|svg)$/i.test(file)) logoFile = { file, path, size };
}

if (!mainJs) { console.error('❌ Nenhum .js encontrado em', assetsDir); process.exit(1); }

console.log(`   JS:   ${mainJs.file}  (${Math.round(mainJs.size / 1024)}KB)`);
if (mainCss)  console.log(`   CSS:  ${mainCss.file}  (${Math.round(mainCss.size / 1024)}KB)`);
if (logoFile) console.log(`   Logo: ${logoFile.file}  (${Math.round(logoFile.size / 1024)}KB)`);

// ── Lê conteúdos ───────────────────────────────────────────────────────────
const jsContent  = readFileSync(mainJs.path, 'utf8');
const cssContent = mainCss ? readFileSync(mainCss.path, 'utf8') : null;

// Confirma que é o template FarmaZap
if (!jsContent.includes('FarmaZap')) {
  console.warn('⚠️  "FarmaZap" não encontrado no JS — tem certeza que é o template certo?');
}

// ── Monta HTML self-contained ──────────────────────────────────────────────
console.log('\n🔧 Montando HTML self-contained...');
let html = readFileSync(distArg + '/index.html', 'utf8');

// Inline CSS
if (cssContent) {
  html = html.replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, `<style>${cssContent}</style>`);
  console.log('   ✅ CSS inline');
}

// Inline JS — substitui todos os <script src="/assets/..."> pelo conteúdo
let jsCount = 0;
html = html.replace(/<script type="module" crossorigin src="[^"]+"><\/script>/g, () => {
  jsCount++;
  return jsCount === 1 ? `<script type="module">${jsContent}</script>` : '';
});
console.log(`   ✅ JS inline (${jsCount} tags substituídas)`);

const extLeft = (html.match(/src="\/assets\/[^"]+\.js"/g) || []).length;
if (extLeft > 0) console.warn(`   ⚠️  ${extLeft} referências JS externas ainda presentes`);

console.log(`   📄 HTML final: ${Math.round(html.length / 1024)}KB`);

// ── Salva ──────────────────────────────────────────────────────────────────
const outPath = join(TEMPLATES_DIR, target.file);
writeFileSync(outPath, html, 'utf8');
console.log(`\n✅ Salvo: ${outPath}`);

// Copia logo se existir
if (logoFile) {
  const ext    = logoFile.file.split('.').pop();
  const outLogo = join(TEMPLATES_DIR, `logo-${nicheKey}.${ext}`);
  copyFileSync(logoFile.path, outLogo);
  console.log(`✅ Logo: ${outLogo}`);
}

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Próximo passo — commitar e subir:

  git add src/saas/templates/
  git commit -m "update: template ${target.label}"
  git push origin main

Railway redeploya em ~2min.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
