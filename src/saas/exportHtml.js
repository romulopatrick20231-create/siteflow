/**
 * exportHtml.js — Gera os arquivos estáticos para deploy no Vercel.
 *
 * Único template suportado: Farmácia / Drogaria / Farmácia de Manipulação.
 * Retorna { html, css: '', js: '' } — o template é um React SPA self-contained.
 */

import { renderTemplate } from './templates/render.js';

/**
 * @param {object} site — objeto com business_name, niche, phone, city
 * @returns {{ html: string, css: string, js: string }}
 */
export function exportHtml(site) {
  const html = renderTemplate(site);
  return { html, css: '', js: '' };
}
