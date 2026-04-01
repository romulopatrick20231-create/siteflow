/**
 * aiGenerate.js — Controlled AI content generation.
 *
 * Rules:
 *   - Deducts 1 credit BEFORE calling OpenAI (atomic check)
 *   - Credits = 0 → throws NO_CREDITS error immediately
 *   - Only called when user explicitly clicks "Generate with AI"
 *   - Manual editing is always free (no AI involved)
 *
 * Supported types:
 *   headline | hero_copy | diferenciais | depoimentos | product_description | about_text
 */

import OpenAI from "openai";
import { deductCredit } from "./credits.js";

let _openai = null;

function getOpenAI() {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não definida no .env");
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// ── Generation specs (type → prompts) ────────────────────────────────────────

const SYSTEM = `Você é um copywriter especialista em conversão para negócios locais brasileiros.
Escreva em português (pt-BR). Seja direto, persuasivo e humano. Sem jargão corporativo.
RESPONDA APENAS COM JSON VÁLIDO — sem markdown, sem texto fora do JSON.`;

const SPECS = {
  headline: {
    maxTokens: 150,
    buildPrompt: (ctx) => `Gere um título principal para o site deste negócio.
Máximo 12 palavras. Mencione o bairro ou um diferencial único.
Negócio: ${JSON.stringify(ctx, null, 2)}
Retorne: {"headline": "..."}`,
  },

  hero_copy: {
    maxTokens: 200,
    buildPrompt: (ctx) => `Gere um subtítulo para o hero do site. 1-2 frases.
Mencione especialidade e CTA para WhatsApp. Máximo 30 palavras.
Negócio: ${JSON.stringify(ctx, null, 2)}
Retorne: {"hero_copy": "..."}`,
  },

  diferenciais: {
    maxTokens: 400,
    buildPrompt: (ctx) => `Gere 3 diferenciais para este negócio.
Formato: "Título: Descrição curta mostrando benefício real."
Negócio: ${JSON.stringify(ctx, null, 2)}
Retorne: {"diferenciais": ["Diferencial 1: desc", "Diferencial 2: desc", "Diferencial 3: desc"]}`,
  },

  depoimentos: {
    maxTokens: 600,
    buildPrompt: (ctx) => `Gere 3 depoimentos realistas de clientes satisfeitos.
Primeira pessoa, 2-3 linhas cada. Mencione resultado específico ou experiência emocional.
Negócio: ${JSON.stringify(ctx, null, 2)}
Retorne: {"depoimentos": [{"nome": "Nome Realista", "texto": "..."}, ...]}`,
  },

  about_text: {
    maxTokens: 300,
    buildPrompt: (ctx) => `Gere um parágrafo "Sobre nós" para este negócio.
3-4 frases. Mostre expertise, história ou missão. Tom humano e confiável.
Negócio: ${JSON.stringify(ctx, null, 2)}
Retorne: {"about_text": "..."}`,
  },

  product_description: {
    maxTokens: 200,
    buildPrompt: (ctx) => `Gere uma descrição persuasiva para este produto/serviço.
Máximo 2 frases. Foque nos benefícios, não apenas nas características.
Produto: ${ctx.productName}
Negócio: ${ctx.businessName} — ${ctx.niche}
Retorne: {"description": "..."}`,
  },
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate AI content for a specific field.
 * Deducts 1 credit before making the OpenAI call.
 *
 * @param {string} userId     — Supabase auth user ID
 * @param {string} type       — one of the SPECS keys above
 * @param {Object} context    — business context (businessName, niche, city, etc.)
 * @returns {Promise<Object>} — generated content + credits_remaining
 */
export async function generateContent(userId, type, context) {
  const spec = SPECS[type];
  if (!spec) {
    throw new Error(
      `Tipo inválido: "${type}". Tipos válidos: ${Object.keys(SPECS).join(", ")}`
    );
  }

  // Deduct credit FIRST — if this throws NO_CREDITS, we never call OpenAI
  const creditsLeft = await deductCredit(userId);

  let parsed;
  try {
    const openai = getOpenAI();
    const model  = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const response = await openai.chat.completions.create({
      model,
      temperature:     0.78,
      max_tokens:      spec.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user",   content: spec.buildPrompt(context) },
      ],
    });

    const raw = response.choices[0].message.content.trim();
    parsed = JSON.parse(raw);
  } catch (err) {
    // If OpenAI fails AFTER deducting credit, we still lost the credit.
    // This is acceptable — add retry logic if needed.
    if (err.message.includes("JSON")) {
      throw new Error("A IA retornou um formato inválido. Tente novamente.");
    }
    throw err;
  }

  return {
    type,
    data:              parsed,
    credits_remaining: creditsLeft,
  };
}
