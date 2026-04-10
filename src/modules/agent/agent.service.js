import OpenAI from "openai"
import { supabase } from "../../lib/supabase.js"
import { enqueueMessage } from "../whatsapp/whatsapp.service.js"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const HISTORY_LIMIT = 14

const RESPONSE_VARIATIONS = {
  greeting: [
    "Oi! Tudo bem?",
    "Olá! Como posso ajudar?",
    "Oi, oi! 😊",
    "Oi! Seja bem-vindo(a)!",
  ],
  fallback: [
    "Hmm, não entendi bem. Pode repetir de outro jeito?",
    "Me conta um pouco mais, não captei direito 😅",
    "Desculpa, não entendi. Pode explicar diferente?",
  ],
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const NICHE_SYSTEM_PROMPTS = {
  farmacia: (store) => `
Você é ${store.ai_persona || store.name}, assistente virtual de uma farmácia chamada "${store.name}".
Seu papel é atender clientes com cuidado, empatia e profissionalismo.
Você conhece bem medicamentos, suplementos, dermocosméticos, produtos de higiene e itens de saúde.
Você NÃO prescreve medicamentos, mas pode tirar dúvidas gerais e indicar que o farmacêutico pode ajudar.
Quando o cliente mencionar um sintoma, pergunte o que ele já tomou e sugira procurar orientação profissional se necessário.
Quando quiser comprar algo, ajude a localizar o produto no catálogo e finalize o pedido de forma clara.
Tom: acolhedor, profissional, paciente. Use emojis com moderação (💊🌿💆).
Não seja robótico. Varie as frases. Seja natural como um atendente humano experiente.
Horário de funcionamento: ${store.business_hours || "consulte-nos"}.
Endereço: ${store.address || "consulte-nos"}.
Entrega disponível: ${store.delivery_enabled ? "Sim" : "Apenas retirada"}.
`.trim(),

  pizzaria: (store) => `
Você é ${store.ai_persona || store.name}, atendente virtual da pizzaria "${store.name}".
Você ama pizza e passa esse entusiasmo para os clientes. É simpático, rápido e eficiente.
Você conhece todo o cardápio: pizzas salgadas, doces, bordas recheadas, bebidas e sobremesas.
Quando o cliente pedir uma pizza, confirme o tamanho, a borda e se quer algum adicional.
Se o cliente estiver indeciso, sugira as mais pedidas ou pergunte o que ele gosta.
Tom: animado, acolhedor, informal mas profissional. Use emojis de comida com naturalidade (🍕🔥😋).
Tempo estimado de entrega: ${store.delivery_time_minutes || 40} min.
Taxa de entrega: R$ ${store.delivery_fee || "consultar"}.
Pedido mínimo: R$ ${store.minimum_order || "consultar"}.
`.trim(),

  hamburgueria: (store) => `
Você é ${store.ai_persona || store.name}, atendente da hamburgueria "${store.name}".
Você é jovem, descolado e apaixonado por hambúrguer artesanal.
Conhece cada detalhe do cardápio: smash burgers, hot dogs, acompanhamentos, bebidas e sobremesas.
Quando o cliente pedir, confirme o ponto da carne, os adicionais e o acompanhamento.
Fale sobre os ingredientes com paixão quando o cliente quiser saber mais.
Tom: casual, energético, moderno. Use gírias leves e emojis de forma natural (🍔🔥🤤).
Tempo estimado: ${store.delivery_time_minutes || 35} min.
`.trim(),

  acaiteria: (store) => `
Você é ${store.ai_persona || store.name}, atendente da açaíteria "${store.name}".
Você é leve, saudável e transmite energia positiva.
Conhece todos os tamanhos, frutas, coberturas e complementos disponíveis.
Quando o cliente pedir, confirme o tamanho, as frutas e as coberturas, pois são opções importantes.
Sugira combinações que você "ama" quando o cliente estiver em dúvida.
Tom: fresco, animado, saudável. Emojis que combinem (🍧🍓🌿😍).
Tempo estimado: ${store.delivery_time_minutes || 25} min.
`.trim(),

  sorveteria: (store) => `
Você é ${store.ai_persona || store.name}, atendente da sorveteria "${store.name}".
Você é alegre, doce e sempre feliz em atender.
Conhece todos os sabores, tamanhos, casquinhas, picolés, sundaes e milkshakes.
Quando o cliente pedir, confirme sabores e formato (casquinha, copinho, pote).
Sugira combinações quando o cliente estiver em dúvida.
Tom: alegre, afetuoso, gostoso de conversar. Emojis suaves (🍦🍨😊).
`.trim(),

  generic: (store) => `
Você é ${store.ai_persona || store.name}, assistente virtual de "${store.name}".
Atenda o cliente com simpatia, eficiência e naturalidade.
Ajude com dúvidas sobre produtos, preços, entrega e pedidos.
Tom: simpático, profissional, humano. Não seja robótico — varie as respostas.
`.trim(),
}

function buildSystemPrompt(store, products) {
  const nicheKey = store.store_type?.toLowerCase() || "generic"
  const nichePrompt = NICHE_SYSTEM_PROMPTS[nicheKey]
    ? NICHE_SYSTEM_PROMPTS[nicheKey](store)
    : NICHE_SYSTEM_PROMPTS.generic(store)

  const productList = products?.length
    ? `\n\nPRODUTOS DISPONÍVEIS NO CATÁLOGO (use para responder dúvidas e sugerir itens):\n` +
      products.slice(0, 60).map(p =>
        `- ${p.name}${p.price ? ` — R$${Number(p.price).toFixed(2)}` : ""}${p.category ? ` (${p.category})` : ""}${p.available === false ? " [INDISPONÍVEL]" : ""}`
      ).join("\n")
    : ""

  return `${nichePrompt}${productList}

REGRAS IMPORTANTES:
- Nunca invente preços ou produtos que não estão no catálogo.
- Se o produto não estiver no catálogo, diga que vai verificar e peça para aguardar.
- Nunca diga que é uma IA ou um robô. Se perguntarem, diga que é o(a) atendente virtual da loja.
- Se o cliente estiver com raiva ou reclamando, reconheça o problema com empatia antes de resolver.
- Para finalizar um pedido, confirme: itens, endereço e forma de pagamento.
- Responda sempre em português brasileiro natural. Máximo de 3 parágrafos por resposta.
- Não use markdown (negrito, listas com hífens formatados). Escreva como no WhatsApp.
- Varie suas respostas — nunca repita a mesma frase duas vezes seguidas.`
}

async function getConversationHistory(storeId, phone) {
  const { data } = await supabase
    .from("conversation_history")
    .select("role, content")
    .eq("store_id", storeId)
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT)

  return (data || []).reverse()
}

async function saveMessage(storeId, phone, role, content, intent = null) {
  await supabase.from("conversation_history").insert({
    store_id: storeId,
    customer_phone: phone,
    role,
    content,
    intent,
  })
}

async function getStoreWithProducts(storeId) {
  const [storeRes, productsRes] = await Promise.all([
    supabase.from("stores").select("*").eq("id", storeId).single(),
    supabase.from("products").select("name, price, category, available").eq("store_id", storeId).eq("active", true),
  ])

  return {
    store: storeRes.data,
    products: productsRes.data || [],
  }
}

async function generateReply(systemPrompt, history, userMessage) {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: userMessage },
  ]

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.85,
    max_tokens: 400,
    presence_penalty: 0.6,
    frequency_penalty: 0.5,
  })

  return res.choices[0].message.content.trim()
}

function detectSimpleIntent(message) {
  const lower = message.toLowerCase()
  if (/^(oi|olá|ola|ei|bom dia|boa tarde|boa noite|tudo bem|opa|hey)\b/.test(lower)) return "greeting"
  if (/\b(tchau|até|flw|valeu|obrigad|obg)\b/.test(lower)) return "goodbye"
  if (/\b(preço|quanto|valor|custa|caro|barato)\b/.test(lower)) return "price_inquiry"
  if (/\b(entrega|frete|prazo|demora|tempo)\b/.test(lower)) return "delivery_inquiry"
  if (/\b(quero|pedido|pedir|comprar|solicitar|ped)\b/.test(lower)) return "order"
  if (/\b(cardapio|catalogo|catálogo|cardápio|produto|tem |vocês tem)\b/.test(lower)) return "catalog"
  return "general"
}

export async function handleIncomingMessage({ storeId, phone, message }) {
  try {
    const { store, products } = await getStoreWithProducts(storeId)
    if (!store) {
      console.error("Store not found:", storeId)
      return
    }

    if (!store.ai_enabled) return

    const intent = detectSimpleIntent(message)

    if (intent === "greeting") {
      const history = await getConversationHistory(storeId, phone)
      const isReturning = history.length > 0
      if (!isReturning) {
        const nicheKey = store.store_type?.toLowerCase()
        const greetings = {
          farmacia:    `Olá! Seja bem-vindo(a) à ${store.name} 💊 Como posso te ajudar hoje?`,
          pizzaria:    `Oi! Aqui é a ${store.name} 🍕 Bora pedir uma pizza incrível? Me conta o que você tá querendo!`,
          hamburgueria:`E aí! Aqui é a ${store.name} 🍔 Bateu aquela fome? Me fala o que você quer!`,
          acaiteria:   `Oi! Aqui é a ${store.name} 🍧 Vamos montar seu açaí? Me conta seus sabores favoritos!`,
          sorveteria:  `Olá! Aqui é a ${store.name} 🍦 Que delícia falar com você! O que vai ser hoje?`,
          generic:     `Olá! Bem-vindo(a) à ${store.name}! Como posso te ajudar?`,
        }
        const reply = greetings[nicheKey] || greetings.generic
        await saveMessage(storeId, phone, "user", message, intent)
        await saveMessage(storeId, phone, "assistant", reply, intent)
        await enqueueMessage(phone, reply, storeId)
        return
      }
    }

    const [history] = await Promise.all([
      getConversationHistory(storeId, phone),
    ])

    const systemPrompt = buildSystemPrompt(store, products)
    const reply = await generateReply(systemPrompt, history, message)

    await saveMessage(storeId, phone, "user", message, intent)
    await saveMessage(storeId, phone, "assistant", reply, intent)
    await enqueueMessage(phone, reply, storeId)
  } catch (err) {
    console.error("❌ Agent error:", err.message)
    await enqueueMessage(phone, pick(RESPONSE_VARIATIONS.fallback), storeId)
  }
}

export async function clearConversationHistory(storeId, phone) {
  await supabase
    .from("conversation_history")
    .delete()
    .eq("store_id", storeId)
    .eq("customer_phone", phone)
}

export async function getConversationSummary(storeId, phone) {
  const history = await getConversationHistory(storeId, phone)
  return history
}
