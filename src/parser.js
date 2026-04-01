/**
 * parser.js
 * Lê o CSV de leads linha por linha e retorna array de objetos brutos.
 * Zero IA aqui — só parsing puro.
 */

import fs from "fs";
import { parse } from "csv-parse/sync";

/**
 * Lê o CSV e retorna array de objetos com as colunas originais.
 * @param {string} filePath - caminho absoluto para o .csv
 * @returns {Array<Object>}
 */
export function readCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");

  const records = parse(raw, {
    columns: true,          // usa primeira linha como header
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,              // ignora BOM utf-8
  });

  return records;
}

/**
 * Extrai campos limpos de uma linha do CSV.
 * Normaliza e tipa os dados sem IA.
 * @param {Object} row - linha bruta do CSV
 * @returns {Object} dados normalizados
 */
export function extractFields(row) {
  // Pega o nome base (antes de "|" se existir)
  const rawNome = row["Nome"] || row["nome"] || "";
  const nomeBase = rawNome.split("|")[0].trim();

  // Slug para nome de pasta: minúsculo, sem acentos, espaços → hífen
  const slug = slugify(nomeBase);

  // Bairro e cidade
  const bairro = row["Bairro"] || row["bairro"] || "";
  const cidade = row["Cidade"] || row["cidade"] || "";

  // Telefone: só dígitos
  const telRaw = row["Telefone"] || row["telefone"] || "";
  const telefone = telRaw.replace(/\D/g, "");

  // Categorias como array
  const catRaw = row["Categoria"] || row["categoria"] || row["Categorias"] || "";
  const categorias = catRaw
    .split(/[,;|]/)
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  // Site: verifica se tem valor não vazio e não placeholder
  const siteRaw = row["Sites"] || row["site"] || row["Site"] || "";
  const possuiSite =
    siteRaw.trim().length > 0 &&
    !["não tem", "nenhum", "-", "n/a"].includes(siteRaw.trim().toLowerCase());

  // Avaliações e nota
  const avaliacoesRaw = row["Avaliações"] || row["avaliacoes"] || row["Avaliações"] || "0";
  const numeroAvaliacoes = parseInt(avaliacoesRaw.replace(/\D/g, "") || "0", 10);

  const notaRaw = row["Classificação"] || row["classificacao"] || row["nota"] || "0";
  const nota = parseFloat(notaRaw.replace(",", ".") || "0");

  // Redes sociais
  const redesRaw = row["Redes sociais"] || row["redes_sociais"] || row["Redes Sociais"] || "";
  const redesSociais = redesRaw.trim();

  return {
    nomeBase,
    slug,
    bairro,
    cidade,
    telefone,
    categorias,
    possuiSite,
    numeroAvaliacoes,
    nota,
    redesSociais,
    _raw: row, // mantém linha original para debug
  };
}

/**
 * Converte string para slug de pasta: sem acentos, minúsculo, espaços → hífen
 */
function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")     // remove caracteres especiais
    .trim()
    .replace(/\s+/g, "-")             // espaços → hífen
    .replace(/-+/g, "-");             // múltiplos hífens → um
}
