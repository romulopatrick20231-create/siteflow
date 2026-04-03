/**
 * siteBuilder.js — Automated site generation engine.
 *
 * Pipeline: lead data → OpenAI content → Supabase user → site record → content saved
 *
 * Called by:
 *   - POST /generate (admin bulk import from CSV)
 *   - Can be called programmatically for any lead
 *
 * Each generated site gets:
 *   - A Supabase Auth account (email auto-generated if not provided)
 *   - A site record with slug
 *   - Full AI-generated content (headline, hero, differentials, testimonials, about)
 *   - Temporary password (user must reset on first login)
 */

import OpenAI from "openai";
import { createSite, saveSiteContent } from "./sites.js";
import { getAdminClient } from "./db.js";
import logger from "../utils/logger.js";

// ── OpenAI client (lazy) ───────────────────────────────────────────────────

let _openai = null;
function getOpenAI() {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// ── Content generation ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um copywriter especialista em conversão para negócios locais brasileiros.
Escreva em português (pt-BR). Seja direto, persuasivo e humano. Sem jargão corporativo.
Cada frase deve referenciar os dados reais do negócio — nunca use conteúdo genérico.
RESPONDA APENAS COM JSON VÁLIDO — sem markdown, sem texto fora do JSON.`;

/**
 * Generates a complete set of site content for a business in one OpenAI call.
 * @param {Object} lead - { businessName, niche, phone, city, neighborhood }
 * @returns {Promise<Object>} - { headline, heroCopy, diferenciais, depoimentos, aboutText }
 */
async function generateSiteContent(lead) {
  const openai = getOpenAI();
  const model  = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const prompt = `Gere conteúdo completo para o site deste negócio:
${JSON.stringify({
  nome:       lead.businessName,
  nicho:      lead.niche     || "Negócio Local",
  cidade:     lead.city      || "Brasil",
  bairro:     lead.neighborhood || "",
  telefone:   lead.phone     || "",
}, null, 2)}

Retorne EXATAMENTE este JSON:
{
  "headline":    "Título principal. Máximo 12 palavras. Mencione o bairro ou diferencial único.",
  "heroCopy":    "Subtítulo do hero. 1-2 frases. Mencione especialidade e CTA para WhatsApp. Máximo 25 palavras.",
  "diferenciais": [
    "Diferencial 1: descrição curta mostrando benefício real",
    "Diferencial 2: descrição curta mostrando benefício real",
    "Diferencial 3: descrição curta mostrando benefício real"
  ],
  "depoimentos": [
    { "nome": "Nome Real 1", "texto": "Depoimento em primeira pessoa, 2-3 linhas, resultado específico." },
    { "nome": "Nome Real 2", "texto": "Depoimento em primeira pessoa, 2-3 linhas, experiência emocional." },
    { "nome": "Nome Real 3", "texto": "Depoimento em primeira pessoa, 2-3 linhas, recomendação." }
  ],
  "aboutText":  "Parágrafo 'Sobre nós'. 3-4 frases. Mostre expertise, história ou missão. Tom humano."
}`;

  const response = await openai.chat.completions.create({
    model,
    temperature:     0.78,
    max_tokens:      1800,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: prompt },
    ],
  });

  const raw = response.choices[0].message.content.trim();
  const parsed = JSON.parse(raw);

  // Normalize fields
  return {
    headline:     parsed.headline    || "",
    heroCopy:     parsed.heroCopy    || parsed.hero_copy || "",
    diferenciais: Array.isArray(parsed.diferenciais) ? parsed.diferenciais : [],
    depoimentos:  Array.isArray(parsed.depoimentos)  ? parsed.depoimentos  : [],
    aboutText:    parsed.aboutText   || parsed.about_text || "",
  };
}

// ── User creation ──────────────────────────────────────────────────────────

function randomPassword(length = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

/**
 * Creates a Supabase Auth user.
 * If email is not provided, auto-generates one from businessName.
 */
async function createSupabaseUser(lead) {
  const db = getAdminClient();

  const slug  = lead.businessName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);

  const email    = lead.email    || `${slug}${Date.now().toString(36)}@forgesites.app`;
  const password = lead.password || randomPassword();

  const { data: { user }, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm:  true,
    user_metadata:  { business_name: lead.businessName },
  });

  if (error) throw new Error(`createUser failed: ${error.message}`);
  return { user, email, password };
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Full pipeline: lead data → AI content → user account → site record → content saved.
 *
 * @param {Object} lead
 *   @param {string} lead.businessName  required
 *   @param {string} [lead.niche]
 *   @param {string} [lead.phone]
 *   @param {string} [lead.city]
 *   @param {string} [lead.neighborhood]
 *   @param {string} [lead.email]        auto-generated if omitted
 *   @param {string} [lead.password]     auto-generated if omitted
 *   @param {boolean} [lead.skipAI]      true → skip OpenAI, save empty content
 *
 * @returns {Promise<Object>} { site, user, credentials: { email, password } }
 */
export async function buildSiteFromLead(lead) {
  if (!lead.businessName) throw new Error("businessName is required");

  // 1. Create Supabase user
  const { user, email, password } = await createSupabaseUser(lead);
  logger.info("User created for lead", { userId: user.id, email });

  // 2. Create site record
  const site = await createSite(user.id, {
    businessName: lead.businessName,
    niche:        lead.niche        || "Negócio Local",
    phone:        lead.phone        || null,
    city:         lead.city         || null,
    neighborhood: lead.neighborhood || null,
  });
  logger.info("Site created for lead", { siteId: site.id, userId: user.id });

  // 3. Generate content (skip if skipAI=true for bulk testing)
  let content = null;
  if (!lead.skipAI) {
    try {
      content = await generateSiteContent(lead);
    } catch (err) {
      logger.warn("AI generation failed, using blank content", { error: err.message });
    }
  }

  // 4. Save content if generated
  if (content) {
    await saveSiteContent(site.id, user.id, {
      headline:     content.headline,
      hero_copy:    content.heroCopy,
      diferenciais: content.diferenciais,
      depoimentos:  content.depoimentos,
      about_text:   content.aboutText,
    });
    logger.info("Site content saved", { siteId: site.id });
  }

  // 5. Provision credits record
  const db = getAdminClient();
  await db.from("user_credits").upsert(
    { user_id: user.id, credits_remaining: 10, credits_used_total: 0 },
    { onConflict: "user_id" }
  );

  return {
    site:        { ...site, content },
    user,
    credentials: { email, password },
  };
}

/**
 * Process multiple leads concurrently (max 3 at a time to respect OpenAI rate limits).
 *
 * @param {Object[]} leads
 * @returns {Promise<Object[]>} array of { site, user, credentials, error? }
 */
export async function buildSitesFromLeads(leads) {
  const CONCURRENCY = 3;
  const results = [];

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const batch = leads.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map((lead) => buildSiteFromLead(lead))
    );

    for (let j = 0; j < batch.length; j++) {
      const s = settled[j];
      if (s.status === "fulfilled") {
        results.push(s.value);
      } else {
        logger.error("Lead build failed", {
          businessName: batch[j].businessName,
          error:        s.reason?.message,
        });
        results.push({ error: s.reason?.message, lead: batch[j] });
      }
    }
  }

  return results;
}
