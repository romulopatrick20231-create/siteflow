/**
 * openai.js
 * High-conversion copy engine.
 * Uses gpt-4o-mini by default for cost efficiency.
 * Generates all content needed for the website and outreach.
 */

import OpenAI from "openai";

let _client = null;

function getClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não definida. Crie o arquivo .env com a chave.");
  }
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

function buildSystemPrompt() {
  return `Você é um copywriter especialista em conversão e marketing digital para negócios locais brasileiros.

MISSÃO: Gerar conteúdo de alta conversão que faça o cliente local querer agendar imediatamente pelo WhatsApp.

REGRAS ABSOLUTAS:
1. Nunca use conteúdo genérico — cada frase deve referenciar os dados reais do negócio.
2. Use o bairro, cidade, tipo de negócio e avaliações em cada seção.
3. Linguagem direta, humana e persuasiva — sem jargão corporativo.
4. Foco em CONVERSÃO via WhatsApp — cada CTA deve gerar urgência.
5. Scripts de WhatsApp: máximo 6 linhas, tom natural como se fosse uma pessoa real.
6. Script de áudio: exatamente ~50 palavras (aprox. 20 segundos em voz normal).
7. Script de vídeo: roteiro para vídeo curto de 30-45 segundos.
8. RESPONDA APENAS COM JSON VÁLIDO — sem markdown, sem texto fora do JSON.`;
}

function buildUserPrompt(ctx) {
  const siteCtx = ctx.temSite
    ? "Possui site (possivelmente desatualizado — oportunidade de modernização)"
    : "NÃO possui site — grande oportunidade digital inexplorada";

  return `Gere todos os materiais de marketing para este negócio:

${JSON.stringify({
  nome: ctx.nome,
  nicho: ctx.nicho,
  bairro: ctx.bairro,
  cidade: ctx.cidade,
  especialidades: ctx.especialidades,
  autoridade: ctx.autoridade,
  posicionamento: ctx.posicionamento,
  telefone: ctx.telefone,
  avaliacoes: ctx.avaliacoes,
  nota: ctx.nota,
  situacaoDigital: siteCtx,
}, null, 2)}

Retorne EXATAMENTE este JSON (nenhum texto fora dele):
{
  "headline": "Título principal do site. Máximo 12 palavras. Deve mencionar o bairro ou diferencial único.",
  "heroCopy": "Subtítulo do hero. 1-2 frases. Menciona especialidade e CTA para WhatsApp. Máximo 25 palavras.",
  "diferenciais": [
    "Diferencial 1: explicação curta em uma frase que mostre benefício real",
    "Diferencial 2: explicação curta em uma frase que mostre benefício real",
    "Diferencial 3: explicação curta em uma frase que mostre benefício real"
  ],
  "depoimentos": [
    { "nome": "Nome Realista 1", "texto": "Depoimento em primeira pessoa, 2-3 linhas. Menciona resultado específico." },
    { "nome": "Nome Realista 2", "texto": "Depoimento em primeira pessoa, 2-3 linhas. Menciona experiência emocional." },
    { "nome": "Nome Realista 3", "texto": "Depoimento em primeira pessoa, 2-3 linhas. Menciona recomendação." }
  ],
  "scriptWhatsapp": [
    "Variação 1 — abordagem direta e curiosidade. Máximo 5 linhas. Tom amigável e humano.",
    "Variação 2 — foco nas avaliações/autoridade do negócio. Máximo 5 linhas.",
    "Variação 3 — foco no problema que o cliente resolve. Máximo 5 linhas."
  ],
  "scriptAudio": "Script para gravação de voz de 20 segundos. Aproximadamente 50 palavras. Deve soar natural quando lido em voz alta. Menção ao nome do negócio, bairro e CTA para WhatsApp.",
  "scriptVideo": "Roteiro para vídeo curto de 30-45 segundos. Estrutura: gancho (5s) + apresentação (10s) + prova social (10s) + CTA (10s). Indicar cortes com // CUT //. Mencionar texto de tela com [TEXTO: ...]."
}`;
}

/**
 * Generates all marketing materials for a lead.
 * @param {Object} ctx - enriched lead context from enrichLead()
 * @returns {Promise<Object>} generated materials
 */
export async function gerarMateriais(ctx) {
  const openai = getClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.78,
    max_tokens: 2200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(ctx) },
    ],
  });

  const raw = response.choices[0].message.content.trim();

  // Strip markdown fences if model ignores instructions
  const clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    throw new Error(`OpenAI returned invalid JSON: ${err.message}\n\nRaw:\n${raw.slice(0, 500)}`);
  }

  // Normalize scriptWhatsapp to always be an array
  if (typeof parsed.scriptWhatsapp === "string") {
    parsed.scriptWhatsapp = [parsed.scriptWhatsapp];
  }

  return parsed;
}
