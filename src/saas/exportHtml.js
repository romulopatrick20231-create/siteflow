/**
 * exportHtml.js — Gera os arquivos estáticos para deploy no Vercel.
 *
 * Retorna { files } — array de arquivos prontos para deploySite.
 * O template é um React SPA com CSS/JS inline. A logo é um arquivo separado.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { renderTemplate } from './templates/render.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, 'templates', 'farmazap-logo.png');

// Lê a logo uma vez (binary → base64 para o deploySite)
let _logoBase64 = null;
function getLogoBase64() {
  if (!_logoBase64) {
    try {
      _logoBase64 = readFileSync(LOGO_PATH).toString('base64');
    } catch {
      _logoBase64 = '';
    }
  }
  return _logoBase64;
}

/**
 * @param {object} site — objeto com business_name, niche, phone, city
 * @returns {{ html: string, css: string, js: string, files: Array }}
 */
export function exportHtml(site) {
  const html = renderTemplate(site);

  const files = [
    { name: 'index.html', content: html },
  ];

  // Inclui a logo como arquivo separado (React a carrega de /assets/)
  const logoB64 = getLogoBase64();
  if (logoB64) {
    files.push({ name: 'assets/farmazap-logo-Q35RW_XK.png', content: logoB64, encoding: 'base64' });
  }

  return { html, css: '', js: '', files };
}
