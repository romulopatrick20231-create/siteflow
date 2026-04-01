/**
 * enrich.js
 * Inferência de nicho, especialidades, posicionamento e autoridade.
 * Tudo via regras de código — sem IA.
 */

// ─── Mapa de nichos ──────────────────────────────────────────────────────────
const NICHO_MAP = [
  { keywords: ["dentist", "odontolog", "dental", "ortodont", "implant"], nicho: "Clínica Odontológica", icone: "🦷" },
  { keywords: ["médic", "clinic", "saúde", "hospital", "psicolog"], nicho: "Clínica Médica", icone: "🏥" },
  { keywords: ["fisioterapia", "fisioterapeuta"], nicho: "Clínica de Fisioterapia", icone: "💪" },
  { keywords: ["nutricion", "nutri"], nicho: "Consultório de Nutrição", icone: "🥗" },
  { keywords: ["veterinár", "pet shop", "pet"], nicho: "Clínica Veterinária", icone: "🐾" },
  { keywords: ["farmácia", "farmacia", "drogaria"], nicho: "Farmácia", icone: "💊" },
  { keywords: ["salão", "salao", "cabeleirei", "beauty", "cabelo"], nicho: "Salão de Beleza", icone: "💇" },
  { keywords: ["barbearia", "barbeiro", "barber"], nicho: "Barbearia", icone: "✂️" },
  { keywords: ["estética", "estetica", "spa", "estetic"], nicho: "Clínica de Estética", icone: "✨" },
  { keywords: ["restaurante", "restaurant"], nicho: "Restaurante", icone: "🍽️" },
  { keywords: ["pizzaria", "pizza"], nicho: "Pizzaria", icone: "🍕" },
  { keywords: ["padaria", "panificadora", "bakery"], nicho: "Padaria", icone: "🍞" },
  { keywords: ["lanchonete", "burger", "hamburguer"], nicho: "Hamburgueria", icone: "🍔" },
  { keywords: ["advocac", "advogad", "juridic", "law"], nicho: "Escritório de Advocacia", icone: "⚖️" },
  { keywords: ["contabil", "contáb", "contador"], nicho: "Escritório de Contabilidade", icone: "📊" },
  { keywords: ["imobiliár", "imobili", "corretor"], nicho: "Imobiliária", icone: "🏠" },
  { keywords: ["academia", "gym", "fitness", "pilates"], nicho: "Academia / Studio Fitness", icone: "🏋️" },
  { keywords: ["escola", "cursinho", "ensino", "colegio"], nicho: "Escola / Curso", icone: "📚" },
  { keywords: ["oficina", "mecânic", "mecanic", "auto"], nicho: "Oficina Mecânica", icone: "🔧" },
];

const ESPECIALIDADES_MAP = {
  "Clínica Odontológica": ["Clareamento Dental", "Ortodontia", "Implantes", "Próteses"],
  "Clínica Médica": ["Clínica Geral", "Cardiologia", "Dermatologia", "Pediatria"],
  "Clínica de Fisioterapia": ["Fisioterapia Ortopédica", "RPG", "Pilates Clínico"],
  "Academia / Studio Fitness": ["Musculação", "Pilates", "Funcional", "Personal Trainer"],
  "Salão de Beleza": ["Corte", "Coloração", "Progressiva", "Tratamentos Capilares"],
  "Clínica de Estética": ["Limpeza de Pele", "Botox", "Preenchimento", "Drenagem Linfática"],
  "Restaurante": ["Almoço Executivo", "Delivery", "Eventos", "Buffet"],
  "Escritório de Advocacia": ["Direito Civil", "Direito Trabalhista", "Direito de Família"],
  "Imobiliária": ["Venda", "Locação", "Administração de Imóveis"],
};

export function inferirNicho(categorias) {
  const texto = categorias.join(" ").toLowerCase();
  for (const entry of NICHO_MAP) {
    if (entry.keywords.some((kw) => texto.includes(kw))) {
      return { nicho: entry.nicho, icone: entry.icone };
    }
  }
  return { nicho: "Negócio Local", icone: "🏪" };
}

export function inferirEspecialidades(nicho, categorias) {
  const lista = ESPECIALIDADES_MAP[nicho];
  if (lista) return lista.slice(0, 4);
  return categorias.slice(0, 3).map((c) => c.charAt(0).toUpperCase() + c.slice(1));
}

export function inferirPosicionamento(avaliacoes) {
  if (avaliacoes >= 500) return "clínica consolidada e referência na região";
  if (avaliacoes >= 200) return "clínica bem avaliada e em crescimento acelerado";
  if (avaliacoes >= 50)  return "clínica em crescimento com boa reputação local";
  return "negócio local com potencial de crescimento digital";
}

export function gerarAutoridade(avaliacoes, nota) {
  if (avaliacoes === 0 && nota === 0) return "negócio local sem avaliações cadastradas ainda";
  if (avaliacoes > 0 && nota > 0) return "mais de " + avaliacoes + " avaliações com nota " + nota.toFixed(1) + " no Google";
  if (avaliacoes > 0) return "mais de " + avaliacoes + " avaliações no Google";
  return "nota " + nota.toFixed(1) + " no Google";
}

export function enrichLead(fields) {
  const { nomeBase, bairro, cidade, telefone, categorias, possuiSite, numeroAvaliacoes, nota } = fields;
  const { nicho, icone } = inferirNicho(categorias);
  const especialidades = inferirEspecialidades(nicho, categorias);
  const posicionamento = inferirPosicionamento(numeroAvaliacoes);
  const autoridade = gerarAutoridade(numeroAvaliacoes, nota);
  return {
    nome: nomeBase,
    bairro: bairro || "não informado",
    cidade: cidade || "não informada",
    telefone: telefone || "não informado",
    nicho, icone, especialidades, posicionamento, autoridade,
    temSite: possuiSite,
    avaliacoes: numeroAvaliacoes,
    nota,
  };
}
