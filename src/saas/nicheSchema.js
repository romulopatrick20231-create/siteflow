/**
 * nicheSchema.js — Niche definitions, randomization pools, and flow variants.
 *
 * Three concerns:
 *   1. Niche → category mapping
 *   2. Randomization pools (personalities, narrative angles, banned phrases)
 *   3. Flow variants per category — which section types each page gets
 *      (3 distinct flows per category → structural variety between sites)
 */

// ── Utilities ──────────────────────────────────────────────────────────────

/** Pick one element at random from an array. */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick N unique elements at random from an array. */
export function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── Niche → category mapping ───────────────────────────────────────────────

const NICHE_CATEGORIES = {
  "Clínica Odontológica":        "odontologia",
  "Clínica Médica":              "clinica",
  "Clínica de Fisioterapia":     "clinica",
  "Consultório de Nutrição":     "clinica",
  "Clínica Veterinária":         "petshop",
  "Farmácia":                    "clinica",
  "Salão de Beleza":             "beleza",
  "Barbearia":                   "beleza",
  "Clínica de Estética":         "beleza",
  "Restaurante":                 "restaurante",
  "Pizzaria":                    "restaurante",
  "Padaria":                     "restaurante",
  "Hamburgueria":                "restaurante",
  "Escritório de Advocacia":     "servicos",
  "Escritório de Contabilidade": "servicos",
  "Imobiliária":                 "imobiliaria",
  "Academia / Studio Fitness":   "fitness",
  "Escola / Curso":              "educacao",
  "Oficina Mecânica":            "oficina",
  "Negócio Local":               "generico",
};

export function getNicheCategory(niche) {
  return NICHE_CATEGORIES[niche] || "generico";
}

// ── Page list per category ─────────────────────────────────────────────────

export const NICHE_PAGES = {
  clinica:    ["inicio", "especialidades", "equipe",    "depoimentos", "contato"],
  odontologia:["inicio", "tratamentos",   "antes-depois","depoimentos","agendamento"],
  restaurante:["inicio", "cardapio",      "galeria",    "localizacao", "reservas"],
  petshop:    ["inicio", "servicos",      "produtos",   "depoimentos", "contato"],
  beleza:     ["inicio", "servicos",      "galeria",    "depoimentos", "contato"],
  servicos:   ["inicio", "servicos",      "equipe",     "depoimentos", "contato"],
  imobiliaria: ["inicio", "comprar", "alugar", "equipe", "contato"],
  fitness:    ["inicio", "servicos",      "galeria",    "planos",      "contato"],
  educacao:   ["inicio", "cursos",        "equipe",     "depoimentos", "contato"],
  oficina:    ["inicio", "servicos",      "galeria",    "depoimentos", "contato"],
  generico:   ["inicio", "servicos",      "depoimentos","contato"],
};

export function getPagesForNiche(niche) {
  const cat = getNicheCategory(niche);
  return NICHE_PAGES[cat] || NICHE_PAGES.generico;
}

// ── Personality pool ───────────────────────────────────────────────────────
// Each personality defines a distinct tone of voice and copy style.
// Randomly assigned per site generation.

export const PERSONALITIES = [
  {
    id: "caloroso",
    label: "Caloroso e Acolhedor",
    tone: `Tom caloroso, próximo, acolhedor. Como um amigo especialista falando com você.
Usa "você" naturalmente. Frases como "a gente entende", "estamos aqui para isso", "merece cuidado de verdade".
Cria conexão emocional antes de apresentar qualificações.
Headlines: promessas de cuidado e bem-estar. CTAs: convites gentis, nunca ordens.`,
    openingStyle: "emocional — começa com o sentimento do cliente, não com o negócio",
    ctaStyle: "convite gentil",
    sectionTransitionStyle: "narrativa fluida, cada seção conversa com a anterior",
  },
  {
    id: "confiante",
    label: "Confiante e Direto",
    tone: `Tom confiante, assertivo, sem enrolação. Autoridade que não precisa se provar.
Frases curtas. Números e resultados concretos. Zero rodeios.
Evita adjetivos vagos — substitui por dados. "Somos bons" → "97% de satisfação desde 2014."
Headlines: declarações fortes, resultados ou posicionamentos únicos. CTAs: comandos diretos.`,
    openingStyle: "resultado — começa com o que o cliente consegue, não com o que o negócio oferece",
    ctaStyle: "comando direto e urgente",
    sectionTransitionStyle: "cada seção prova uma afirmação da anterior",
  },
  {
    id: "tecnico-humanizado",
    label: "Técnico mas Humano",
    tone: `Tom especialista: cita técnicas, certificações, equipamentos, protocolos específicos.
Mas sempre traduz para o benefício do cliente em linguagem simples.
Estrutura: contexto técnico → o que isso significa para você.
Usa números específicos (não arredondados). Cita metodologias reais do setor.`,
    openingStyle: "credencial — começa com um dado de expertise, depois humaniza",
    ctaStyle: "próximo passo claro e racional",
    sectionTransitionStyle: "aprofunda progressivamente: visão geral → detalhes → prova social",
  },
  {
    id: "narrativo",
    label: "Storytelling e Narrativa",
    tone: `Tom narrativo: conta uma história do começo ao fim do site.
Usa elementos de tempo: "há X anos", "foi em [data/evento] que tudo mudou", "hoje, após centenas de...".
Cada seção é um capítulo. O visitante sente que está dentro de uma história, não lendo um catálogo.
Headlines: aberturas de história ou virada de expectativa. CTAs: continuação da jornada.`,
    openingStyle: "narrativo — começa no meio da história, in media res",
    ctaStyle: "próximo capítulo da jornada do cliente",
    sectionTransitionStyle: "arco narrativo: problema → solução → transformação → chamada à ação",
  },
  {
    id: "local-comunitario",
    label: "Parceiro da Comunidade Local",
    tone: `Tom de vizinhança, pertencimento, comunidade. Este negócio é parte do bairro.
Cita o bairro, pontos de referência locais, histórias da comunidade.
"Crescemos juntos com o [bairro]", "nossos clientes são os vizinhos da [rua/praça]".
Cria orgulho local. O leitor sente que está apoiando algo que é dele também.`,
    openingStyle: "pertencimento — começa com o bairro ou comunidade, não com o negócio",
    ctaStyle: "visita presencial, convite de vizinhos",
    sectionTransitionStyle: "comunidade → confiança → serviço → pertença",
  },
];

export function getRandomPersonality() {
  return pick(PERSONALITIES);
}

// ── Narrative angles ───────────────────────────────────────────────────────
// The backstory angle the AI uses to invent the business's origin.

export const NARRATIVE_ANGLES = [
  {
    id: "vivencia-pessoal",
    prompt: "O fundador viveu o problema na própria pele antes de criar a solução. A empresa nasceu de uma necessidade pessoal, não de uma oportunidade de mercado.",
  },
  {
    id: "insatisfacao-mercado",
    prompt: "O fundador trabalhou em grandes empresas do setor e ficou insatisfeito com a falta de qualidade e cuidado com os clientes. Saiu para criar algo diferente, com um padrão mais alto.",
  },
  {
    id: "heranca-familiar",
    prompt: "É um negócio de família, passado de geração em geração. Carrega tradição, mas se modernizou completamente. Une o saber de décadas com práticas contemporâneas.",
  },
  {
    id: "especialista-que-voltou",
    prompt: "O profissional se especializou fora — em outra cidade, outro estado, ou até no exterior — e voltou para aplicar o que aprendeu na sua cidade natal. Traz um olhar diferente de fora.",
  },
  {
    id: "lacuna-identificada",
    prompt: "O fundador percebeu que a cidade/bairro não tinha um serviço de qualidade nessa área. Identificou a lacuna e criou o que ele mesmo precisava mas não encontrava.",
  },
  {
    id: "casos-dificeis",
    prompt: "O negócio ficou conhecido por aceitar e resolver os casos que outros recusam ou consideram complicados. A reputação veio de atender quem ninguém mais atendia com qualidade.",
  },
];

export function getRandomNarrativeAngle() {
  return pick(NARRATIVE_ANGLES);
}

// ── Banned phrases ─────────────────────────────────────────────────────────
// These phrases make copy sound templated. AI must avoid them.

export const BANNED_PHRASES = [
  "somos líderes", "qualidade garantida", "atendimento de excelência",
  "profissionais altamente qualificados", "sua satisfação é nossa prioridade",
  "conte com nossa equipe", "soluções personalizadas", "comprometidos com",
  "missão é", "visão é", "valores são", "empresa sólida no mercado",
  "referência no setor", "sempre em busca da excelência", "equipe dedicada",
  "trabalhamos com seriedade", "fale conosco", "entre em contato conosco",
  "estamos à disposição", "não perca tempo", "serviços de qualidade",
  "anos de experiência no mercado", "clientes satisfeitos",
  "seu bem-estar é o nosso objetivo", "inovação e tecnologia",
];

// ── Hero opening variants ──────────────────────────────────────────────────
// Different rhetorical strategies for the opening section.

export const HERO_OPENING_HOOKS = [
  { id: "pergunta-dor",    desc: "Começa com uma pergunta que toca diretamente na dor do cliente-alvo" },
  { id: "dado-surpresa",   desc: "Começa com um dado ou estatística surpreendente do setor ou da cidade" },
  { id: "declaracao-ousada", desc: "Começa com uma declaração forte e específica de posicionamento" },
  { id: "promessa-concreta", desc: "Começa com uma promessa de resultado específica e mensurável" },
  { id: "inversao",        desc: "Começa invertendo uma expectativa comum: 'A maioria dos [nicho] faz X. Nós não.'" },
  { id: "historia-rapida", desc: "Abre com uma micro-história de 1-2 frases de um cliente transformado" },
];

// ── Testimonial style variants ─────────────────────────────────────────────

export const TESTIMONIAL_STYLES = [
  { id: "testimonials",          desc: "Citações diretas com nome e avaliação" },
  { id: "testimonials_story",    desc: "Mini-histórias: contexto antes + resultado depois + nome e detalhes específicos" },
  { id: "testimonials_featured", desc: "Um depoimento longo em destaque + dois menores ao lado" },
];

// ── Flow variants per category ─────────────────────────────────────────────
// 3 distinct structural flows per category.
// Each flow defines section TYPES per page — same pages, different visual layouts.
//
// Section types the renderer uses:
//   Hero:        hero | hero_statement | hero_story | hero_social_proof
//   Trust:       trust_bar | stats_showcase | impact_numbers
//   Services:    services_grid | services_featured | services_accordion
//   Team:        team_grid | team_featured
//   Testimonials:(from TESTIMONIAL_STYLES above)
//   Booking:     booking_cta | steps_cta
//   Gallery:     image_gallery | image_grid
//   Before/After:before_after_gallery | before_after_slider
//   Menu:        menu_categories | menu_featured
//   Location:    location_hours
//   Products:    products_grid

export const FLOW_VARIANTS = {

  odontologia: [
    // Flow A — Transformation-led: emotional, before/after prominent
    {
      id: "transformation",
      pages: {
        "inicio":       ["hero_statement",    "stats_showcase"],
        "tratamentos":  ["services_featured", "services_grid"],
        "antes-depois": ["before_after_gallery"],
        "depoimentos":  ["testimonials_story"],
        "agendamento":  ["steps_cta"],
      },
    },
    // Flow B — Expertise-led: credentials and process first
    {
      id: "expertise",
      pages: {
        "inicio":       ["hero",              "trust_bar"],
        "tratamentos":  ["services_accordion"],
        "antes-depois": ["before_after_slider"],
        "depoimentos":  ["testimonials_featured"],
        "agendamento":  ["booking_cta"],
      },
    },
    // Flow C — Social proof-led: opens with results, proves claim
    {
      id: "proof-first",
      pages: {
        "inicio":       ["hero_social_proof", "impact_numbers"],
        "tratamentos":  ["services_grid"],
        "antes-depois": ["before_after_gallery"],
        "depoimentos":  ["testimonials"],
        "agendamento":  ["steps_cta"],
      },
    },
  ],

  clinica: [
    // Flow A — Credentials-led
    {
      id: "credentials",
      pages: {
        "inicio":        ["hero",           "trust_bar"],
        "especialidades":["services_grid"],
        "equipe":        ["team_grid"],
        "depoimentos":   ["testimonials_story"],
        "contato":       ["booking_cta"],
      },
    },
    // Flow B — Team-first (human, trust through faces)
    {
      id: "team-first",
      pages: {
        "inicio":        ["hero_statement", "impact_numbers"],
        "especialidades":["services_featured"],
        "equipe":        ["team_featured"],
        "depoimentos":   ["testimonials"],
        "contato":       ["steps_cta"],
      },
    },
    // Flow C — Data-driven (stats and proof)
    {
      id: "data-driven",
      pages: {
        "inicio":        ["hero_social_proof","stats_showcase"],
        "especialidades":["services_accordion"],
        "equipe":        ["team_grid"],
        "depoimentos":   ["testimonials_featured"],
        "contato":       ["booking_cta"],
      },
    },
  ],

  restaurante: [
    // Flow A — Experience-led (atmosphere first)
    {
      id: "experience",
      pages: {
        "inicio":     ["hero_statement",    "highlight_bar"],
        "cardapio":   ["menu_featured",     "menu_categories"],
        "galeria":    ["image_gallery"],
        "localizacao":["location_hours"],
        "reservas":   ["steps_cta"],
      },
    },
    // Flow B — Food-first (menu and dishes upfront)
    {
      id: "food-first",
      pages: {
        "inicio":     ["hero",              "stats_showcase"],
        "cardapio":   ["menu_featured",     "menu_categories"],
        "galeria":    ["image_grid"],
        "localizacao":["location_hours"],
        "reservas":   ["booking_cta"],
      },
    },
    // Flow C — Story-led (tradition and origin)
    {
      id: "tradition",
      pages: {
        "inicio":     ["hero_story",        "highlight_bar"],
        "cardapio":   ["menu_featured",     "menu_categories"],
        "galeria":    ["image_gallery"],
        "localizacao":["location_hours"],
        "reservas":   ["steps_cta"],
      },
    },
  ],

  petshop: [
    // Flow A — Emotional (love for pets)
    {
      id: "emotional",
      pages: {
        "inicio":    ["hero_statement",  "trust_bar"],
        "servicos":  ["services_grid"],
        "produtos":  ["products_grid"],
        "depoimentos":["testimonials_story"],
        "contato":   ["booking_cta"],
      },
    },
    // Flow B — Complete care (services showcase)
    {
      id: "complete-care",
      pages: {
        "inicio":    ["hero",            "stats_showcase"],
        "servicos":  ["services_featured"],
        "produtos":  ["products_grid"],
        "depoimentos":["testimonials"],
        "contato":   ["steps_cta"],
      },
    },
    // Flow C — Community (neighborhood pets)
    {
      id: "community",
      pages: {
        "inicio":    ["hero_social_proof","impact_numbers"],
        "servicos":  ["services_accordion"],
        "produtos":  ["products_grid"],
        "depoimentos":["testimonials_featured"],
        "contato":   ["booking_cta"],
      },
    },
  ],

  beleza: [
    {
      id: "transformation",
      pages: {
        "inicio":    ["hero_statement", "trust_bar"],
        "servicos":  ["services_featured"],
        "galeria":   ["image_gallery"],
        "depoimentos":["testimonials_story"],
        "contato":   ["booking_cta"],
      },
    },
    {
      id: "portfolio",
      pages: {
        "inicio":    ["hero",           "stats_showcase"],
        "servicos":  ["services_grid"],
        "galeria":   ["image_grid"],
        "depoimentos":["testimonials"],
        "contato":   ["steps_cta"],
      },
    },
    {
      id: "lifestyle",
      pages: {
        "inicio":    ["hero_social_proof","impact_numbers"],
        "servicos":  ["services_accordion"],
        "galeria":   ["image_gallery"],
        "depoimentos":["testimonials_featured"],
        "contato":   ["booking_cta"],
      },
    },
  ],

  servicos: [
    {
      id: "authority",
      pages: {
        "inicio":    ["hero_statement", "trust_bar"],
        "servicos":  ["services_grid"],
        "equipe":    ["team_grid"],
        "depoimentos":["testimonials"],
        "contato":   ["booking_cta"],
      },
    },
    {
      id: "process",
      pages: {
        "inicio":    ["hero",           "stats_showcase"],
        "servicos":  ["services_accordion"],
        "equipe":    ["team_featured"],
        "depoimentos":["testimonials_story"],
        "contato":   ["steps_cta"],
      },
    },
    {
      id: "results",
      pages: {
        "inicio":    ["hero_social_proof","impact_numbers"],
        "servicos":  ["services_featured"],
        "equipe":    ["team_grid"],
        "depoimentos":["testimonials_featured"],
        "contato":   ["booking_cta"],
      },
    },
  ],

  imobiliaria: [
    {
      id: "listings-first",
      pages: {
        "inicio":    ["hero_statement", "stats_showcase"],
        "comprar":   ["imoveis_grid"],
        "alugar":    ["imoveis_grid"],
        "equipe":    ["team_grid"],
        "contato":   ["booking_cta"],
      },
    },
    {
      id: "trust-led",
      pages: {
        "inicio":    ["hero",           "trust_bar"],
        "comprar":   ["imoveis_grid"],
        "alugar":    ["imoveis_grid"],
        "equipe":    ["team_featured"],
        "contato":   ["steps_cta"],
      },
    },
    {
      id: "results",
      pages: {
        "inicio":    ["hero_social_proof","impact_numbers"],
        "comprar":   ["imoveis_grid"],
        "alugar":    ["imoveis_grid"],
        "equipe":    ["team_grid"],
        "contato":   ["booking_cta"],
      },
    },
  ],

  fitness: [
    {
      id: "motivational",
      pages: {
        "inicio":  ["hero_statement",   "stats_showcase"],
        "servicos":["services_grid"],
        "galeria": ["image_gallery"],
        "planos":  ["pricing_table"],
        "contato": ["booking_cta"],
      },
    },
    {
      id: "results",
      pages: {
        "inicio":  ["hero_social_proof","impact_numbers"],
        "servicos":["services_featured"],
        "galeria": ["image_grid"],
        "planos":  ["pricing_table"],
        "contato": ["steps_cta"],
      },
    },
    {
      id: "community",
      pages: {
        "inicio":  ["hero",            "trust_bar"],
        "servicos":["services_accordion"],
        "galeria": ["image_gallery"],
        "planos":  ["pricing_table"],
        "contato": ["booking_cta"],
      },
    },
  ],

  educacao: [
    {
      id: "outcomes",
      pages: {
        "inicio":    ["hero_statement", "stats_showcase"],
        "cursos":    ["services_grid"],
        "equipe":    ["team_featured"],
        "depoimentos":["testimonials_story"],
        "contato":   ["steps_cta"],
      },
    },
    {
      id: "expertise",
      pages: {
        "inicio":    ["hero",           "trust_bar"],
        "cursos":    ["services_featured"],
        "equipe":    ["team_grid"],
        "depoimentos":["testimonials"],
        "contato":   ["booking_cta"],
      },
    },
    {
      id: "community",
      pages: {
        "inicio":    ["hero_social_proof","impact_numbers"],
        "cursos":    ["services_accordion"],
        "equipe":    ["team_grid"],
        "depoimentos":["testimonials_featured"],
        "contato":   ["booking_cta"],
      },
    },
  ],

  oficina: [
    {
      id: "trust",
      pages: {
        "inicio":    ["hero_statement", "trust_bar"],
        "servicos":  ["services_grid"],
        "galeria":   ["image_grid"],
        "depoimentos":["testimonials"],
        "contato":   ["booking_cta"],
      },
    },
    {
      id: "diagnostic",
      pages: {
        "inicio":    ["hero",           "stats_showcase"],
        "servicos":  ["services_accordion"],
        "galeria":   ["image_gallery"],
        "depoimentos":["testimonials_story"],
        "contato":   ["steps_cta"],
      },
    },
    {
      id: "expertise",
      pages: {
        "inicio":    ["hero_social_proof","impact_numbers"],
        "servicos":  ["services_featured"],
        "galeria":   ["image_grid"],
        "depoimentos":["testimonials_featured"],
        "contato":   ["booking_cta"],
      },
    },
  ],

  generico: [
    {
      id: "standard",
      pages: {
        "inicio":    ["hero",           "trust_bar"],
        "servicos":  ["services_grid"],
        "depoimentos":["testimonials"],
        "contato":   ["booking_cta"],
      },
    },
    {
      id: "proof-first",
      pages: {
        "inicio":    ["hero_statement", "stats_showcase"],
        "servicos":  ["services_featured"],
        "depoimentos":["testimonials_story"],
        "contato":   ["steps_cta"],
      },
    },
    {
      id: "narrative",
      pages: {
        "inicio":    ["hero_story",     "impact_numbers"],
        "servicos":  ["services_accordion"],
        "depoimentos":["testimonials_featured"],
        "contato":   ["booking_cta"],
      },
    },
  ],
};

export function getFlowVariant(category) {
  const variants = FLOW_VARIANTS[category] || FLOW_VARIANTS.generico;
  return pick(variants);
}

// ── Image slots per category ───────────────────────────────────────────────

export const NICHE_IMAGE_SLOTS = {
  clinica: [
    { slot: "hero",      subject: "modern medical clinic reception, clean white interior, professional doctors" },
    { slot: "team",      subject: "team of friendly medical professionals in white coats, smiling" },
    { slot: "gallery_1", subject: "state-of-the-art medical examination room with modern equipment" },
  ],
  odontologia: [
    { slot: "hero",        subject: "modern dental clinic, bright white interior, comfortable dental chair" },
    { slot: "treatment",   subject: "dentist performing gentle treatment on patient, professional and calm" },
    { slot: "before_after",subject: "beautiful healthy teeth smile close-up, perfect white teeth" },
  ],
  restaurante: [
    { slot: "hero",   subject: "elegant restaurant interior, warm lighting, beautifully set tables" },
    { slot: "dish_1", subject: "gourmet food dish beautifully plated, professional food photography" },
    { slot: "dish_2", subject: "delicious appetizer or dessert, restaurant quality, professional photography" },
  ],
  petshop: [
    { slot: "hero",      subject: "bright and cheerful pet shop interior, happy dogs and cats with owners" },
    { slot: "service",   subject: "professional groomer carefully grooming a happy fluffy dog" },
    { slot: "gallery_1", subject: "veterinarian examining a cute cat gently, modern clean clinic" },
  ],
  beleza: [
    { slot: "hero",      subject: "modern beauty salon interior, stylish decor, professional hairstylist at work" },
    { slot: "service",   subject: "hairstylist creating beautiful hairstyle for smiling client" },
    { slot: "gallery_1", subject: "close-up of elegant hair transformation, before and after style" },
  ],
  servicos: [
    { slot: "hero",      subject: "modern professional office interior, clean desk, confident professional" },
    { slot: "team",      subject: "team of professionals in business attire, confident and friendly" },
    { slot: "gallery_1", subject: "business meeting in modern conference room, collaborative atmosphere" },
  ],
  fitness: [
    { slot: "hero",      subject: "modern gym interior with state-of-the-art equipment, energetic atmosphere" },
    { slot: "training",  subject: "personal trainer helping client exercise, motivating and supportive" },
    { slot: "gallery_1", subject: "group fitness class in modern studio, people exercising together" },
  ],
  educacao: [
    { slot: "hero",      subject: "modern classroom or training space, engaged students learning" },
    { slot: "class",     subject: "enthusiastic teacher presenting to attentive students" },
    { slot: "gallery_1", subject: "students collaborating on project, engaged and motivated" },
  ],
  oficina: [
    { slot: "hero",      subject: "clean modern auto repair shop, mechanics working professionally" },
    { slot: "service",   subject: "mechanic performing precise car maintenance, professional equipment" },
    { slot: "gallery_1", subject: "modern diagnostic equipment in clean garage, professional setting" },
  ],
  generico: [
    { slot: "hero",    subject: "professional local business storefront or interior, welcoming atmosphere" },
    { slot: "service", subject: "business owner or staff serving customers with a smile" },
  ],
};

export function getImageSlotsForNiche(niche) {
  const cat = getNicheCategory(niche);
  return NICHE_IMAGE_SLOTS[cat] || NICHE_IMAGE_SLOTS.generico;
}
