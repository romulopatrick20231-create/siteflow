/**
 * nicheGenerator.js — Niche-aware site content generation via OpenAI.
 *
 * TWO-PHASE GENERATION:
 *
 * Phase 1 — Business Identity (small, fast call ~300 tokens):
 *   Generates a unique creative brief for this specific business:
 *   founding story, invented credibility numbers, emotional hook,
 *   unique differentiator, local context, narrative arc.
 *   Different every time — this is what makes sites feel unique.
 *
 * Phase 2 — Full Site Content (main call):
 *   Uses the identity + randomly selected personality + randomly selected
 *   flow variant to write ALL page content.
 *   Prompt is a creative brief, NOT a template to fill.
 *   AI has creative freedom within the structure.
 *
 * Result: even two dental clinics in the same city produce radically
 * different sites — different story, different tone, different sections,
 * different copy style.
 */

import OpenAI from "openai";
import {
  getNicheCategory,
  getFlowVariant,
  getRandomPersonality,
  getRandomNarrativeAngle,
  HERO_OPENING_HOOKS,
  BANNED_PHRASES,
  pick,
} from "./nicheSchema.js";
import { getDesignBrief } from "./designKnowledge.js";

let _openai = null;
function getOpenAI() {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const MODEL = () => process.env.OPENAI_MODEL || "gpt-4o-mini";

// ── Phase 1: Business Identity ─────────────────────────────────────────────

const IDENTITY_SYSTEM = `Você é um estrategista de marca especialista em criar identidades únicas para negócios locais brasileiros.
Sua tarefa: inventar uma história de origem e identidade plausível e específica para um negócio.
Os dados que você criar serão usados para escrever o site — devem parecer 100% reais.
NUNCA use dados genéricos. Números devem ser específicos (não arredondados). Histórias devem ter detalhes concretos.
RESPONDA APENAS COM JSON VÁLIDO — zero markdown.`;

function buildIdentityPrompt(lead, narrativeAngle) {
  const niche    = lead.niche || "Negócio Local";
  const city     = lead.city || "Brasil";
  const bairro   = lead.neighborhood || city;
  const nome     = lead.businessName;

  return `Crie uma identidade de marca única e específica para este negócio:

DADOS REAIS:
- Nome: ${nome}
- Nicho: ${niche}
- Cidade: ${city}
- Bairro/Região: ${bairro}
- Telefone: ${lead.phone || "não informado"}
- Endereço: ${lead.address || "não informado"}

ÂNGULO NARRATIVO A USAR: ${narrativeAngle.prompt}

Invente dados plausíveis e específicos. Retorne EXATAMENTE este JSON:
{
  "founding_year": número entre 2005 e 2020 que faça sentido para o histórico do negócio,
  "years_operating": anos desde a fundação até 2025,
  "origin_story": "2-3 frases. Use o ângulo narrativo acima. Cite o bairro/cidade. Deve parecer real e humano. Inclua um detalhe específico que diferencia esta história de qualquer outra.",
  "unique_differentiator": "O que este negócio faz de diferente dos concorrentes. Deve ser específico do nicho e da localidade. Não use adjetivos vagos — descreva uma prática, método ou especialização concreta.",
  "local_anchor": "Como este negócio está conectado com a comunidade local. Cite pontos de referência, eventos, ou histórias do bairro/cidade. 1-2 frases.",
  "emotional_hook": "A frase que resume o principal alívio de dor que este negócio oferece. Deve ressoar emocionalmente com o cliente típico. Sem jargão. Máximo 15 palavras.",
  "target_customer_pain": "Descreva em 1 frase a principal dor, frustração ou necessidade do cliente-alvo deste negócio específico.",
  "invented_stats": {
    "main_metric": "número específico e impressionante (ex: 4.800 pacientes atendidos, 97,3% de satisfação, 1.200 sorrisos transformados)",
    "secondary_metric": "segundo número relevante para o nicho",
    "tertiary_metric": "terceiro dado de credibilidade (anos, procedimentos, clientes, avaliações)",
    "main_metric_label": "o que este número representa (ex: 'Pacientes Atendidos', 'Sorrisos Transformados')",
    "secondary_metric_label": "label do segundo número",
    "tertiary_metric_label": "label do terceiro número"
  },
  "team_details": [
    {
      "name": "nome completo realista com título (Dr., Dra., Prof., etc. se aplicável ao nicho)",
      "role": "cargo ou especialidade específica",
      "credential": "formação, registro profissional ou certificação relevante ao nicho",
      "differentiator": "o que torna este profissional único — 1 frase específica"
    },
    {
      "name": "nome completo realista",
      "role": "cargo ou especialidade secundária",
      "credential": "formação ou certificação",
      "differentiator": "diferencial específico deste profissional"
    }
  ],
  "narrative_arc": "Como a história do site deve fluir de início ao fim. Ex: 'Abre com o problema → mostra a solução gentil → prova com casos reais → convida para agir'. Máximo 2 frases.",
  "color_mood": "Um de: azul-confiança | verde-saúde | laranja-energia | vermelho-paixão | roxo-sofisticação | terra-aconchego | preto-premium | turquesa-inovação",
  "tagline_options": [
    "opção 1: tagline de 5-8 palavras, foco no resultado",
    "opção 2: tagline de 5-8 palavras, foco no sentimento",
    "opção 3: tagline de 5-8 palavras, foco no diferencial"
  ]
}`;
}

// ── Phase 2: Full Site Content ─────────────────────────────────────────────

const CONTENT_SYSTEM = `Você é o melhor copywriter de sites do Brasil. Trabalha para as agências mais exigentes.
Seus sites custam entre R$ 20.000 e R$ 50.000 e parecem cada centavo.

O QUE FAZ SEU COPY SER EXTRAORDINÁRIO:
1. Cada palavra tem função — zero decoração verbal
2. Você nunca escreve para "negócios em geral" — cada site é para UM negócio específico
3. Você usa os dados reais fornecidos no briefing para fazer o copy soar VIVIDO, não inventado
4. Cada seção tem uma micro-história embutida — nunca uma lista seca
5. Os depoimentos parecem reais porque têm detalhes específicos: nome completo, o que viram, o que sentiram
6. CTAs criam desejo, não obrigação

PROIBIDO (vai parecer template e destruir a percepção de valor):
${BANNED_PHRASES.map(p => `- "${p}"`).join("\n")}

RESPONDA APENAS COM JSON VÁLIDO — zero markdown, zero texto fora do JSON.`;

function buildSectionSpec(category, flowVariant, identity, personality) {
  // Descreve o que deve conter cada página com base no flow variant selecionado.
  // Cada seção é descrita como um briefing criativo, não um template a preencher.

  const pages = Object.entries(flowVariant.pages).map(([pageName, sectionTypes]) => {
    return {
      name: pageName,
      sectionDescriptions: sectionTypes.map(type => describeSectionType(type, pageName, category, identity, personality)),
    };
  });

  return pages;
}

function describeSectionType(type, pageName, category, identity, personality) {
  // Maps section type → creative brief description for that section.
  // Returns { type, briefing } — the AI writes the actual data.

  const business = identity;
  const tone     = personality.tone;

  const DESCRIPTIONS = {

    // ── Hero variants ────────────────────────────────────────────────────

    "hero": {
      briefing: `Seção de abertura padrão.
- headline: ${personality.openingStyle}. Use o gancho emocional: "${business.emotional_hook}". Máximo 12 palavras. NÃO comece com o nome do negócio.
- subheadline: expanda em 2 frases. Mencione o bairro/cidade. Tom: ${tone.split('.')[0]}.
- cta_primary: label e action (whatsapp)
- cta_secondary: label e action (scroll)
- trust_badge: use um dos dados inventados: ${business.invented_stats.main_metric} ${business.invented_stats.main_metric_label}`,
    },

    "hero_statement": {
      briefing: `Seção de abertura com declaração ousada.
- Abre com uma DECLARAÇÃO FORTE E ESPECÍFICA sobre este negócio — não uma pergunta, não uma promessa vaga.
  Ex: "Em ${business.years_operating} anos em [cidade], vimos o que funciona de verdade — e o que não funciona."
- headline: declaração ousada que implica expertise ou posicionamento único. Máximo 12 palavras.
- subheadline: 2 frases que provam ou expandem a declaração. Use "${business.unique_differentiator}".
- cta_primary: label urgente e direto, action (whatsapp)
- cta_secondary: label de exploração, action (scroll)
- trust_badge: dado específico do briefing`,
    },

    "hero_story": {
      briefing: `Seção de abertura narrativa.
- Abre com uma micro-história de 1 frase que coloca o visitante dentro do problema/solução.
  Ex: "Há ${business.years_operating} anos, ${business.origin_story.split('.')[0].toLowerCase()}."
- headline: abertura de história ou ponto de virada. Pode ser mais longa (até 14 palavras).
- subheadline: continua a história, conecta com o benefício do visitante. 2 frases.
- cta_primary: label e action (whatsapp) — tom de convite à continuação da história
- cta_secondary: label e action (scroll)
- trust_badge: elemento temporal ou histórico (ex: "Desde ${business.founding_year} em [cidade]")`,
    },

    "hero_social_proof": {
      briefing: `Seção de abertura com prova social em destaque.
- Abre com um resultado específico de um cliente (antes de apresentar o negócio).
  Ex: "Renata tinha medo de dentista há 12 anos. Em 3 sessões, transformamos seu sorriso."
- headline: o resultado do cliente (específico, não genérico). Máximo 12 palavras.
- subheadline: como este negócio consegue esse resultado. 2 frases. Mencione o diferencial: "${business.unique_differentiator}".
- opening_proof: { customer_name: "nome realista", result: "resultado específico em 1 frase" }
- cta_primary: label e action (whatsapp)
- cta_secondary: label e action (scroll)
- trust_badge: "${business.invented_stats.main_metric} ${business.invented_stats.main_metric_label}"`,
    },

    // ── Trust / Stats ────────────────────────────────────────────────────

    "trust_bar": {
      briefing: `Barra de credibilidade com 4 itens.
Cada item: icon (nome de ícone Lucide) + text (dado ou credencial específica).
Use dados do briefing. NÃO use frases genéricas.
Exemplos de icons: award, shield, clock, users, star, check-circle, map-pin, phone, calendar, heart.
Item 1: dado numérico principal (${business.invented_stats.main_metric})
Item 2: credencial ou certificação específica do nicho
Item 3: dado de tempo ou frequência específico
Item 4: diferencial de serviço único`,
    },

    "stats_showcase": {
      briefing: `Bloco de 3-4 números impactantes em destaque visual grande.
Use EXATAMENTE os dados do briefing — não invente outros:
- ${business.invented_stats.main_metric} — ${business.invented_stats.main_metric_label}
- ${business.invented_stats.secondary_metric} — ${business.invented_stats.secondary_metric_label}
- ${business.invented_stats.tertiary_metric} — ${business.invented_stats.tertiary_metric_label}
- Anos desde ${business.founding_year} atuando em [cidade/bairro]
Cada stat tem: value (o número), label (o que representa), context (1 frase humanizando o número)`,
    },

    "impact_numbers": {
      briefing: `Números com contexto emocional — diferente de stats frias.
3 números, cada um com uma micro-história de 1 frase que explica o que aquele número significa na vida real.
Ex: "6.200+ pacientes" → context: "São famílias de [bairro] que confiam seus sorrisos a nós há ${business.years_operating} anos."
Use os dados de ${JSON.stringify(business.invented_stats)}.`,
    },

    // ── Services ─────────────────────────────────────────────────────────

    "services_grid": {
      briefing: `Grade de serviços/especialidades.
6 items, cada um com:
- name: nome específico do serviço (não genérico, adequado ao nicho ${category})
- description: 2 frases. Primeira: o que faz. Segunda: o que o cliente GANHA com isso (resultado, sensação, mudança).
- icon: nome de ícone Lucide relevante
Escrita no tom: ${tone.split('.')[0]}.
PROIBIDO: "serviço de qualidade", "atendimento personalizado" ou qualquer frase do BANNED_PHRASES.`,
    },

    "services_featured": {
      briefing: `Serviço principal em destaque + 3-4 serviços de suporte.
- featured: o serviço principal (ou mais procurado) deste nicho:
  { name, headline (promessa do serviço, 8-10 palavras), description (3 frases: problema → solução → resultado), cta_label, icon }
- supporting: 3-4 serviços complementares:
  [{ name, description (1 frase de benefício direto), icon }]
O serviço featured deve usar o ângulo narrativo: "${business.unique_differentiator}".`,
    },

    "services_accordion": {
      briefing: `Serviços em accordion/expansão — ideal para serviços com processo ou detalhe.
5-6 items, cada um com:
- name: nome do serviço
- summary: 1 frase que define o que é e por que importa (texto visível antes de expandir)
- details: 3-4 frases explicando o processo, o que o cliente vai sentir/viver, e o resultado esperado
- duration: tempo estimado ou frequência típica
- icon: nome de ícone Lucide
Escreva como se estivesse explicando para um amigo curioso, não para convencer um cético.`,
    },

    // ── Team ─────────────────────────────────────────────────────────────

    "team_grid": {
      briefing: `Grade com os profissionais da equipe.
Use os dados de team_details do briefing e adicione mais 1-2 profissionais plausíveis:
${JSON.stringify(business.team_details, null, 2)}
Cada membro: { name, role, credential, bio (2 frases humanizadas — não só currículo, mas o que os move), photo_placeholder: true }
Bio deve ter um detalhe pessoal ou de abordagem, não só formação.`,
    },

    "team_featured": {
      briefing: `Destaque para o profissional principal + outros membros em segundo plano.
featured_member: use o primeiro de team_details. Inclui:
{ name, role, credential, story (3-4 frases: formação → momento de virada → o que traz para os clientes), photo_placeholder: true }
Story deve conectar com o origin_story: "${business.origin_story}"
other_members: demais profissionais em cards menores.`,
    },

    // ── Testimonials ──────────────────────────────────────────────────────

    "testimonials": {
      briefing: `3 depoimentos de clientes reais (inventados mas críveis).
Cada um: { name (nome brasileiro completo realista), neighborhood (bairro/cidade), text (2-3 frases em 1a pessoa), rating: 5, service_used (serviço ou tratamento específico) }
REGRAS:
- Nomes: mistura de gênero e geração (ex: Fernanda, Roberto, Camila, José)
- Cada depoimento menciona um resultado ESPECÍFICO e mensurável
- Um dos depoimentos menciona o medo ou resistência inicial que foi superado
- Nunca: "ótimo atendimento", "super recomendo" sem detalhes — provar o que recomenda`,
    },

    "testimonials_story": {
      briefing: `3 depoimentos no formato micro-história: antes → depois → recomendação.
Cada um: { name (nome completo realista), city (cidade ou bairro), before (situação antes em 1 frase), after (resultado específico em 1-2 frases), quote (frase direta marcante de 10-15 palavras), service_used, rating: 5 }
REGRAS:
- "before" deve descrever uma dor ou frustração real e específica, não genérica
- "after" deve ter um resultado concreto (número, evento, mudança de vida)
- "quote" é a frase que o cliente diria para um amigo — deve parecer spoken, não escrito`,
    },

    "testimonials_featured": {
      briefing: `1 depoimento principal longo + 2 curtos ao lado.
featured: { name, city, full_story (4-5 frases: contexto → problema → experiência com o negócio → resultado → recomendação), service_used, rating: 5 }
short_1: { name, text (2 frases com resultado específico), service_used, rating: 5 }
short_2: { name, text (2 frases com ângulo emocional), service_used, rating: 5 }
O depoimento featured deve ser o mais convincente — alguém que estava cético e se surpreendeu.`,
    },

    // ── Booking / CTA ─────────────────────────────────────────────────────

    "booking_cta": {
      briefing: `Seção final de agendamento/contato.
{ title (convite específico, não genérico), subtitle (2 frases que removem a última objeção e criam urgência suave), address, phone, hours, whatsapp_text (mensagem pré-preenchida para WhatsApp, personalizada para este negócio) }
Tom: ${personality.ctaStyle}.
O title NÃO pode ser "Agende sua Consulta" ou variante genérica — crie algo específico para este negócio.
whatsapp_text: deve começar com o nome do negócio e incluir um contexto específico.`,
    },

    "steps_cta": {
      briefing: `CTA com 3 passos que guiam o visitante.
{ title (convite específico), subtitle (1-2 frases sobre simplicidade e cuidado),
  steps: [{ step: 1, label, description }, { step: 2, label, description }, { step: 3, label, description }],
  address, phone, hours, whatsapp_text }
Os passos devem descrever a EXPERIÊNCIA do cliente, não o processo interno do negócio.
Ex: Passo 1: "Mande uma mensagem" (não: "Entre em contato"), Passo 2: "Conheça nossa equipe" (não: "Avaliação inicial").`,
    },

    // ── Gallery ───────────────────────────────────────────────────────────

    "image_gallery": {
      briefing: `Galeria de imagens com layout masonry (tamanhos variados).
{ layout: "masonry", title, subtitle (1 frase sobre o que as fotos mostram), captions: ["legenda 1", "legenda 2", "legenda 3", "legenda 4"] }
Legendas devem descrever o que está na foto de forma evocativa — não "Foto do ambiente" mas "Nossa sala de espera, pensada para quem precisa de calma antes de uma consulta."`,
    },

    "image_grid": {
      briefing: `Galeria de imagens em grid uniforme.
{ layout: "grid", title, subtitle, captions: ["legenda 1", "legenda 2", "legenda 3", "legenda 4", "legenda 5", "legenda 6"] }
Legendas descrevem detalhes específicos do ambiente, equipe ou serviço. Tom: ${tone.split('.')[0]}.`,
    },

    // ── Niche-specific ────────────────────────────────────────────────────

    "before_after_gallery": {
      briefing: `Galeria antes/depois com 3 casos reais (inventados mas críveis).
{ title (sobre transformação real, não genérica), subtitle (1 frase empática sobre a jornada),
  cases: [{ treatment, duration, patient_note (frase marcante do paciente sobre o resultado — em 1a pessoa), description (o que foi feito, resultado técnico em linguagem acessível) }] }
Cada caso deve ter um tratamento diferente. patient_note deve ser específica — não "fiquei muito satisfeito".`,
    },

    "before_after_slider": {
      briefing: `Slider comparativo antes/depois com 3 casos.
{ title, subtitle, cases: [{ treatment, patient_initials (ex: "M.S."), patient_age, months_of_treatment, result_headline (5-8 palavras sobre o resultado visual), patient_quote (frase curta e marcante) }] }`,
    },

    "treatments_grid": {
      briefing: `Grade de tratamentos odontológicos.
6 tratamentos, cada um com: { name, description (2 frases: o que é + resultado esperado para este paciente), duration, highlight: boolean (marque 2 como true — os mais procurados), icon }
Descrições devem falar da EXPERIÊNCIA do paciente, não só do procedimento técnico.
Ex: "Implante Dentário" → não fale de titânio e osseointegração — fale de "morder uma maçã sem pensar duas vezes".`,
    },

    "menu_categories": {
      briefing: `Menu dividido por categoria com preços realistas para o nicho e cidade.
{ categories: [{ name, items: [{ name, description (1 frase apetitosa e específica), price, highlight: boolean }] }] }
3 categorias: Entradas (2 itens), Pratos Principais (3 itens), Sobremesas (2 itens) — ou categorias específicas para o tipo de estabelecimento.
Nomes dos pratos devem ser específicos ao nicho (Pizzaria → pizzas específicas, não "Pizza 1").
Preços: use valores realistas para restaurante brasileiro de qualidade média-alta.`,
    },

    "menu_featured": {
      briefing: `Destaque para 3-4 pratos especiais da casa.
{ title (algo como "Os Favoritos da Casa" mas mais criativo), subtitle (1 frase sobre culinária ou tradição),
  featured_items: [{ name, description (2-3 frases que façam a boca salivar — use adjetivos sensoriais: textura, aroma, sabor), price, badge (ex: "Mais Pedido", "Exclusivo", "Chef Indica") }] }`,
    },

    "location_hours": {
      briefing: `Informações de localização e horários.
{ title, address (use o endereço fornecido ou invente plausível para a cidade), neighborhood, city,
  hours: { weekdays: "Seg a Sex: Xh às Xh", saturday: "Sáb: Xh às Xh", sunday: "Dom: fechado" (ou horário se aplicável) },
  parking: "informação sobre estacionamento — se não souber, omita",
  nearby_reference: "ponto de referência próximo para quem não conhece o endereço" }`,
    },

    "products_grid": {
      briefing: `Grade de produtos da loja.
{ title, subtitle, categories: ["categoria 1", "categoria 2", "categoria 3", ...] (5-6 categorias do nicho petshop),
  featured: [{ name, category, description (1 frase de benefício direto para o pet ou tutor), highlight: boolean }] (3 produtos em destaque)
  Produtos com nomes específicos (não "Ração Premium 1" — dê um nome de marca ou linha plausível).`,
    },

    "pricing_table": {
      briefing: `Tabela de planos/preços (para academias, escolas, etc.).
{ title, subtitle, plans: [{ name, price, period (ex: "/mês"), description (1 frase de posicionamento), features: ["feature 1", "feature 2", "feature 3"], cta_label, highlighted: boolean }] }
3 planos: básico, intermediário (highlighted), premium. Preços realistas para o nicho e cidade.
Features devem descrever benefícios, não características técnicas.`,
    },

    "highlight_bar": {
      briefing: `Barra de destaques rápidos (para restaurantes e comércios).
4 items, cada um com: { icon (Lucide), text (informação prática e atrativa em 3-5 palavras) }
Ex: tipo de culinária, horário de funcionamento, localização, reservas.
Deve ser informativo E atraente — cada item deve dar vontade de saber mais.`,
    },

    "section_header": {
      briefing: `Cabeçalho de seção.
{ title (nome criativo para a seção — não apenas "Nossos Serviços" mas algo com personalidade),
  subtitle (1-2 frases que contextualizam o que vem a seguir, no tom ${personality.id}) }`,
    },

  };

  const desc = DESCRIPTIONS[type];
  if (!desc) {
    // Fallback for unknown types
    return {
      type,
      briefing: `Seção do tipo "${type}". Crie conteúdo relevante e específico para este negócio. Tom: ${tone.split('.')[0]}.`,
    };
  }

  return { type, briefing: desc.briefing };
}

function buildContentPrompt(lead, identity, personality, flowVariant, category) {
  const sectionSpecs = buildSectionSpec(category, flowVariant, identity, personality);
  const heroHook     = pick(HERO_OPENING_HOOKS);

  const pagesDescription = sectionSpecs.map(page => {
    const sections = page.sectionDescriptions.map(s =>
      `    - Tipo: "${s.type}"\n      Briefing: ${s.briefing.replace(/\n/g, "\n      ")}`
    ).join("\n\n");

    return `  Página "${page.name}":\n${sections}`;
  }).join("\n\n");

  const designBrief = getDesignBrief(lead.niche || "Negócio Local");

  return `Você recebeu o briefing de um negócio específico e deve escrever o conteúdo completo do site.

══════════════════════════════════════
${designBrief}
══════════════════════════════════════

══════════════════════════════════════
BRIEFING DO NEGÓCIO
══════════════════════════════════════
Nome: ${lead.businessName}
Nicho: ${lead.niche || "Negócio Local"}
Cidade: ${lead.city || "Brasil"}
Bairro: ${lead.neighborhood || lead.city || "Brasil"}
Telefone: ${lead.phone || "a definir"}
Endereço: ${lead.address || "centro de " + (lead.city || "Brasil")}

IDENTIDADE DA MARCA:
- História de origem: ${identity.origin_story}
- Fundada em: ${identity.founding_year} (${identity.years_operating} anos atuando)
- Diferencial único: ${identity.unique_differentiator}
- Âncora local: ${identity.local_anchor}
- Gancho emocional central: "${identity.emotional_hook}"
- Dor principal do cliente-alvo: ${identity.target_customer_pain}

DADOS NUMÉRICOS (use estes, não invente outros):
- ${identity.invented_stats.main_metric} — ${identity.invented_stats.main_metric_label}
- ${identity.invented_stats.secondary_metric} — ${identity.invented_stats.secondary_metric_label}
- ${identity.invented_stats.tertiary_metric} — ${identity.invented_stats.tertiary_metric_label}

EQUIPE:
${identity.team_details.map(m => `- ${m.name} (${m.role}): ${m.credential}. ${m.differentiator}`).join("\n")}

══════════════════════════════════════
PERSONALIDADE E TOM DE VOZ
══════════════════════════════════════
${personality.tone}

Estilo de abertura: ${personality.openingStyle}
Tom dos CTAs: ${personality.ctaStyle}
Fluxo entre seções: ${personality.sectionTransitionStyle}

Ângulo do hero: ${heroHook.desc}
Arco narrativo do site: ${identity.narrative_arc}

══════════════════════════════════════
FRASES ABSOLUTAMENTE PROIBIDAS
══════════════════════════════════════
${BANNED_PHRASES.map(p => `• "${p}"`).join("\n")}
Se você escrever qualquer uma dessas frases (ou variações), o site parecerá template. Isso é inaceitável.

══════════════════════════════════════
ESTRUTURA DO SITE A ESCREVER
══════════════════════════════════════
${pagesDescription}

══════════════════════════════════════
FORMATO DE RESPOSTA
══════════════════════════════════════
Retorne JSON válido com esta estrutura exata:
{
  "meta": {
    "colorScheme": "${identity.color_mood}",
    "tagline": "${identity.tagline_options[0]}",
    "tagline_variants": ${JSON.stringify(identity.tagline_options)},
    "personality": "${personality.id}",
    "flowVariant": "${flowVariant.id}"
  },
  "pages": [
    {
      "name": "nome-da-pagina",
      "sections": [
        {
          "type": "tipo-da-secao",
          "data": { ... conteúdo real escrito por você ... }
        }
      ]
    }
  ]
}

LEMBRE-SE: O conteúdo dentro de "data" deve ser ESCRITO POR VOCÊ com copy profissional — não coloque placeholders, não repita as instruções do briefing literalmente, escreva o texto final que aparecerá no site.`;
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Phase 1: Generate a unique business identity.
 */
async function generateBusinessIdentity(lead, narrativeAngle) {
  const openai = getOpenAI();
  const model  = MODEL();

  const response = await openai.chat.completions.create({
    model,
    temperature:     0.90,   // Higher temp for creative identity generation
    max_tokens:      1200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: IDENTITY_SYSTEM },
      { role: "user",   content: buildIdentityPrompt(lead, narrativeAngle) },
    ],
  });

  const raw = response.choices[0].message.content.trim();
  return JSON.parse(raw);
}

/**
 * Phase 2: Generate full site content using the business identity.
 */
async function generateSiteContent(lead, identity, personality, flowVariant, category) {
  const openai = getOpenAI();
  const model  = MODEL();

  const response = await openai.chat.completions.create({
    model,
    temperature:     0.82,   // Creative but consistent
    max_tokens:      4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CONTENT_SYSTEM },
      { role: "user",   content: buildContentPrompt(lead, identity, personality, flowVariant, category) },
    ],
  });

  const raw    = response.choices[0].message.content.trim();
  const parsed = JSON.parse(raw);

  return {
    meta:  parsed.meta  || {},
    pages: parsed.pages || [],
  };
}

/**
 * Main export: generate unique niche site content for a lead.
 * Two-phase: identity brief → full content.
 *
 * @param {Object} lead - { businessName, niche, city, phone, address, neighborhood }
 * @returns {Promise<{ meta: Object, pages: Array }>}
 */
export async function generateNicheContent(lead) {
  const category     = getNicheCategory(lead.niche || "Negócio Local");
  const personality  = getRandomPersonality();
  const narrativeAngle = getRandomNarrativeAngle();
  const flowVariant  = getFlowVariant(category);

  // Phase 1: unique business identity
  const identity = await generateBusinessIdentity(lead, narrativeAngle);

  // Phase 2: full site content using identity
  const content = await generateSiteContent(lead, identity, personality, flowVariant, category);

  // Attach generation metadata (useful for debugging and frontend theming)
  content.meta = {
    ...content.meta,
    _generation: {
      personality:    personality.id,
      narrativeAngle: narrativeAngle.id,
      flowVariant:    flowVariant.id,
      category,
    },
  };

  return content;
}
