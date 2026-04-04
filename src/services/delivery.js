/**
 * delivery.js — CEP-based delivery fee calculation for Brazil.
 *
 * Uses ViaCEP (free, no API key) to resolve UF from CEP,
 * then applies flat rates by geographic region.
 *
 * All amounts are in BRL cents (centavos).
 */

const REGIONS = {
  Sul:         ["PR", "SC", "RS"],
  Sudeste:     ["SP", "RJ", "MG", "ES"],
  CentroOeste: ["DF", "GO", "MT", "MS"],
  Nordeste:    ["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"],
  Norte:       ["AM", "PA", "AP", "RR", "AC", "RO", "TO"],
};

// Flat rates in BRL cents
const RATES = {
  same_state:  800,   // R$8,00
  same_region: 1500,  // R$15,00
  diff_region: 2500,  // R$25,00
  fallback:    1500,  // used when CEP lookup fails
};

function getRegion(uf) {
  for (const [region, states] of Object.entries(REGIONS)) {
    if (states.includes(uf)) return region;
  }
  return null;
}

async function lookupCep(cep) {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.erro ? null : data;
  } catch {
    return null;
  }
}

/**
 * Calculate delivery fee based on buyer and seller CEPs.
 *
 * @param {string} buyerCep
 * @param {string|null} sellerCep — from sites.cep; if null returns fallback
 * @returns {Promise<number>} fee in BRL cents
 */
export async function calcDeliveryFee(buyerCep, sellerCep) {
  if (!buyerCep || !sellerCep) return RATES.fallback;

  const [buyer, seller] = await Promise.all([
    lookupCep(buyerCep),
    lookupCep(sellerCep),
  ]);

  if (!buyer || !seller) return RATES.fallback;
  if (buyer.uf === seller.uf) return RATES.same_state;
  if (getRegion(buyer.uf) === getRegion(seller.uf)) return RATES.same_region;
  return RATES.diff_region;
}
