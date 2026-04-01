/**
 * generator.js
 * Saves all output files for a processed lead.
 * Outputs: result.txt, site.html, data.json
 */

import fs from "fs";
import path from "path";

const OUTPUT_DIR = "./output";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function fmt(label, value) {
  return `${label.padEnd(18)} ${value || "—"}`;
}

function sep(char = "─", len = 62) {
  return char.repeat(len);
}

/**
 * Formats the human-readable result.txt
 */
function buildResultTxt(ctx, mat, meta) {
  const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const wa = (mat.scriptWhatsapp || []);
  const waMessages = Array.isArray(wa) ? wa : [wa];

  const lines = [
    sep("═"),
    `  FORGESITES AI — RESULTADO GERADO`,
    `  ${ts}`,
    sep("═"),
    "",
    fmt("NICHO:", `${ctx.icone || ""} ${ctx.nicho}`),
    fmt("EMPRESA:", ctx.nome),
    fmt("LOCALIZAÇÃO:", `${ctx.bairro} — ${ctx.cidade}`),
    fmt("TELEFONE:", ctx.telefone),
    fmt("SITE STATUS:", meta.siteStatus || "—"),
    fmt("SCORE:", `${meta.score}/10 → Prioridade: ${meta.priority}`),
    fmt("SITE URL:", meta.siteUrl || "não deployado"),
    fmt("AVALIAÇÕES:", ctx.avaliacoes > 0 ? `${ctx.avaliacoes} (nota ${ctx.nota})` : "sem avaliações"),
    "",
    sep(),
    "HEADLINE DO SITE",
    sep(),
    mat.headline || "—",
    "",
    sep(),
    "HERO COPY",
    sep(),
    mat.heroCopy || "—",
    "",
    sep(),
    "DIFERENCIAIS",
    sep(),
    ...(mat.diferenciais || []).map((d, i) => `  ${i + 1}. ${d}`),
    "",
    sep(),
    "DEPOIMENTOS",
    sep(),
    ...(mat.depoimentos || []).flatMap(d => [`  "${d.texto}"`, `  — ${d.nome}`, ""]),
    "",
    sep(),
    "SCRIPTS WHATSAPP (3 VARIAÇÕES)",
    sep(),
    ...waMessages.flatMap((msg, i) => [
      `[Variação ${i + 1}]`,
      msg,
      "",
    ]),
    sep(),
    "SCRIPT ÁUDIO (20s)",
    sep(),
    mat.scriptAudio || "—",
    "",
    sep(),
    "SCRIPT VÍDEO",
    sep(),
    mat.scriptVideo || "—",
    "",
    sep("═"),
  ];

  return lines.join("\n");
}

/**
 * Saves all output files for a lead.
 * @param {string} slug
 * @param {Object} ctx - enriched lead context
 * @param {Object} mat - AI-generated materials
 * @param {string} html - generated HTML (can be null)
 * @param {Object} meta - { siteStatus, score, priority, siteUrl, crmId }
 * @returns {string} path to result.txt
 */
export function salvarResultadoCompleto(slug, ctx, mat, html, meta = {}) {
  ensureDir(OUTPUT_DIR);
  const dir = path.join(OUTPUT_DIR, slug);
  ensureDir(dir);

  // result.txt
  const resultPath = path.join(dir, "result.txt");
  fs.writeFileSync(resultPath, buildResultTxt(ctx, mat, meta), "utf-8");

  // site.html
  if (html) {
    const htmlPath = path.join(dir, "site.html");
    fs.writeFileSync(htmlPath, html, "utf-8");
  }

  // data.json
  const jsonPath = path.join(dir, "data.json");
  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ ctx, mat, meta, generatedAt: new Date().toISOString() }, null, 2),
    "utf-8"
  );

  return resultPath;
}

// Keep backward-compat alias
export const salvarResultado = (slug, ctx, mat) =>
  salvarResultadoCompleto(slug, ctx, mat, null, {});

/**
 * Saves a consolidated report of all processed leads.
 */
export function salvarRelatorio(resultados) {
  ensureDir(OUTPUT_DIR);

  const total = resultados.length;
  const sucesso = resultados.filter((r) => !r.erro).length;
  const falha = resultados.filter((r) => r.erro).length;
  const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const lines = [
    sep("═"),
    `  FORGESITES AI — RELATÓRIO DE EXECUÇÃO`,
    `  ${ts}`,
    sep("═"),
    `  Total processado: ${total}`,
    `  ✅ Sucesso:        ${sucesso}`,
    `  ❌ Falha:          ${falha}`,
    sep("═"),
    "",
  ];

  resultados.forEach((r, i) => {
    const status = r.erro ? "❌ FALHOU" : "✅ OK";
    const priority = r.meta?.priority ? ` [${r.meta.priority}]` : "";
    const score = r.meta?.score !== undefined ? ` score:${r.meta.score}` : "";
    lines.push(`  ${i + 1}. [${status}]${priority}${score} ${r.ctx?.nome || r.slug}`);
    if (r.erro) {
      lines.push(`     Erro: ${r.erro}`);
    } else {
      lines.push(`     → output/${r.slug}/`);
      if (r.meta?.siteUrl) lines.push(`     🌐 ${r.meta.siteUrl}`);
    }
  });

  lines.push("", sep("═"));

  const reportPath = path.join(OUTPUT_DIR, "_relatorio.txt");
  fs.writeFileSync(reportPath, lines.join("\n"), "utf-8");
  return reportPath;
}
