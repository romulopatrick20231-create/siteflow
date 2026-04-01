/**
 * scorer.js
 * Rule-based lead scoring — no AI, deterministic.
 *
 * Score range: 0–10
 * Priority: high (≥5), medium (3–4), low (<3)
 */

// High-value neighborhoods across major Brazilian cities
const STRATEGIC_NEIGHBORHOODS = [
  // Rio de Janeiro
  "barra da tijuca", "ipanema", "leblon", "copacabana", "botafogo",
  "flamengo", "laranjeiras", "gavea", "jardim botanico", "tijuca",
  "centro", "lapa", "santa teresa", "ilha do governador",
  // São Paulo
  "vila madalena", "pinheiros", "jardins", "itaim bibi", "moema",
  "campo belo", "brooklin", "morumbi", "perdizes", "higienopolis",
  "lapa", "vila olimpia", "berrini",
  // Belo Horizonte
  "savassi", "funcionarios", "lourdes", "belvedere",
  // Curitiba
  "batel", "agua verde", "centro civico",
  // Fortaleza
  "meireles", "aldeota", "cocó", "varjota",
  // Recife / Maceió
  "boa viagem", "ponta verde", "jatiuca", "pajucara",
  // Salvador
  "barra", "graça", "vitória", "pituba", "rio vermelho",
];

function normalizeNeighborhood(name) {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Scores a lead based on qualification + field data.
 * @param {{ siteStatus: string }} qualified
 * @param {Object} fields - from extractFields()
 * @returns {{ score: number, priority: string, breakdown: Object }}
 */
export function scoreLead(qualified, fields) {
  const { siteStatus } = qualified;
  const { numeroAvaliacoes, bairro } = fields;
  let score = 0;
  const breakdown = {};

  // ── Site presence (max +3) ──────────────────────────────────
  if (siteStatus === "no_site") {
    score += 3;
    breakdown.site = "+3 (no website — max opportunity)";
  } else if (siteStatus === "weak_site") {
    score += 2;
    breakdown.site = "+2 (weak website — upgrade opportunity)";
  } else {
    score += 0;
    breakdown.site = "+0 (good website — low priority)";
  }

  // ── Review volume (max +3) ──────────────────────────────────
  if (numeroAvaliacoes > 500) {
    score += 3;
    breakdown.reviews = `+3 (${numeroAvaliacoes} reviews — authority business)`;
  } else if (numeroAvaliacoes > 100) {
    score += 2;
    breakdown.reviews = `+2 (${numeroAvaliacoes} reviews — established)`;
  } else if (numeroAvaliacoes > 20) {
    score += 1;
    breakdown.reviews = `+1 (${numeroAvaliacoes} reviews — growing)`;
  } else {
    score += 0;
    breakdown.reviews = `+0 (${numeroAvaliacoes} reviews — new/unverified)`;
  }

  // ── Strategic neighborhood (max +1) ────────────────────────
  const bairroNorm = normalizeNeighborhood(bairro);
  const isStrategic = STRATEGIC_NEIGHBORHOODS.some((n) =>
    bairroNorm.includes(n.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  );
  if (isStrategic) {
    score += 1;
    breakdown.neighborhood = `+1 (${bairro} — strategic area)`;
  } else {
    breakdown.neighborhood = `+0 (${bairro} — standard area)`;
  }

  // ── High rating bonus (max +2) ─────────────────────────────
  const nota = fields.nota || 0;
  if (nota >= 4.8 && numeroAvaliacoes > 50) {
    score += 2;
    breakdown.rating = `+2 (${nota} rating with volume — highly trusted)`;
  } else if (nota >= 4.5 && numeroAvaliacoes > 20) {
    score += 1;
    breakdown.rating = `+1 (${nota} rating — trusted)`;
  } else {
    breakdown.rating = "+0";
  }

  score = Math.min(score, 10);

  const priority = score >= 5 ? "high" : score >= 3 ? "medium" : "low";

  return { score, priority, breakdown };
}
