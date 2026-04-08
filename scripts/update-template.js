/**
 * update-template.js
 *
 * Reconstrói farmacia-lovable.html a partir do build do Lovable.
 * Roda sempre que o template for atualizado no Lovable e baixado via git pull.
 *
 * Uso:
 *   node scripts/update-template.js
 *
 * Pré-requisito:
 *   C:\Users\Romulo Patrick\sweet-song-builder\dist\ deve estar atualizado
 *   (git pull no projeto sweet-song-builder antes de rodar isso)
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SWEET_SONG_DIST = 'C:/Users/Romulo Patrick/sweet-song-builder/dist';
const TEMPLATES_DIR   = join(__dirname, '../src/saas/templates');

// ── Verifica que o dist existe ────────────────────────────────────────────────
if (!existsSync(SWEET_SONG_DIST + '/index.html')) {
  console.error('❌ dist/index.html não encontrado em:', SWEET_SONG_DIST);
  console.error('   Rode: cd "C:\\Users\\Romulo Patrick\\sweet-song-builder" && git pull');
  process.exit(1);
}

// ── Lê os arquivos do build ───────────────────────────────────────────────────
console.log('📦 Lendo build do Lovable...');

const htmlBase  = readFileSync(SWEET_SONG_DIST + '/index.html', 'utf8');
const jsFiles   = [];
const cssFiles  = [];
let   logoFile  = null;

// Detecta automaticamente os arquivos gerados (hash muda a cada build)
import { readdirSync, statSync } from 'fs';
const assets = readdirSync(SWEET_SONG_DIST + '/assets');
for (const file of assets) {
  const path = SWEET_SONG_DIST + '/assets/' + file;
  const size = statSync(path).size;
  if (file.endsWith('.js'))  jsFiles.push({ file, path, size });
  if (file.endsWith('.css')) cssFiles.push({ file, path, size });
  if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')) {
    logoFile = { file, path, size };
  }
}

// Pega o maior JS (bundle principal) e o maior CSS
jsFiles.sort((a, b) => b.size - a.size);
cssFiles.sort((a, b) => b.size - a.size);

const mainJs  = jsFiles[0];
const mainCss = cssFiles[0];

console.log(`   JS:   ${mainJs.file}  (${Math.round(mainJs.size/1024)}KB)`);
if (mainCss) console.log(`   CSS:  ${mainCss.file}  (${Math.round(mainCss.size/1024)}KB)`);
if (logoFile) console.log(`   Logo: ${logoFile.file}  (${Math.round(logoFile.size/1024)}KB)`);

// ── Lê conteúdos ─────────────────────────────────────────────────────────────
const jsContent  = readFileSync(mainJs.path, 'utf8');
const cssContent = mainCss ? readFileSync(mainCss.path, 'utf8') : null;

// ── Monta o HTML self-contained ───────────────────────────────────────────────
console.log('\n🔧 Montando HTML self-contained...');

let html = htmlBase;

// Inline CSS
if (cssContent) {
  html = html.replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, `<style>${cssContent}</style>`);
  console.log('   ✅ CSS inline');
}

// Inline JS (substitui primeiro script externo, remove o resto)
let jsCount = 0;
html = html.replace(/<script type="module" crossorigin src="[^"]+"><\/script>/g, () => {
  jsCount++;
  return jsCount === 1 ? `<script type="module">${jsContent}</script>` : '';
});
console.log(`   ✅ JS inline (${jsCount} referências substituídas)`);

// Verifica zero referências externas a /assets/
const extRefs = (html.match(/src="\/assets\//g) || []).filter(r => !r.includes('.png'));
if (extRefs.length > 0) {
  console.warn(`   ⚠️  ${extRefs.length} refs /assets/ ainda presentes (podem ser imagens)`);
}

console.log(`   📄 HTML final: ${Math.round(html.length/1024)}KB`);

// ── Salva o template ──────────────────────────────────────────────────────────
const outHtml = join(TEMPLATES_DIR, 'farmacia-lovable.html');
writeFileSync(outHtml, html, 'utf8');
console.log('\n✅ Template salvo:', outHtml);

// ── Copia a logo ──────────────────────────────────────────────────────────────
if (logoFile) {
  const outLogo = join(TEMPLATES_DIR, 'farmazap-logo.png');
  copyFileSync(logoFile.path, outLogo);
  console.log('✅ Logo copiada:', outLogo);
}

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Próximos passos:

  git add src/saas/templates/
  git commit -m "update: novo template"
  git push origin main

Railway redeploya em ~2min. Cria nova loja pra testar.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
