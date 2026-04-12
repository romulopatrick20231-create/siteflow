import OpenAI from "openai"
import { supabase } from "../../lib/supabase.js"
import { enqueueMessage, getStoreConfig } from "../whatsapp/whatsapp.service.js"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const HISTORY_LIMIT = 16

const NICHE_BASE_PROMPTS = {
  farmacia: (name) => `Você é atendente virtual da farmácia "${name}". Atenda com cuidado, empatia e profissionalismo. Conhece medicamentos, suplementos, dermocosméticos e higiene. NÃO prescreve medicamentos. Se cliente relatar sintoma grave, oriente a buscar um médico. Tom: acolhedor, paciente, profissional.`,
  pizzaria: (name) => `Você é atendente da pizzaria "${name}". Ama pizza e passa entusiasmo. Conhece todo o cardápio. Ao pedir, confirme sabor, tamanho, borda e adicionais. Tom: animado, acolhedor, informal.`,
  hamburgueria: (name) => `Você é atendente da hamburgueria "${name}". Descolado e apaixonado por hambúrguer artesanal. Ao pedir, confirme ponto, adicionais e acompanhamento. Tom: casual, energético.`,
  acaiteria: (name) => `Você é atendente da açaíteria "${name}". Leve, saudável, energia positiva. Confirme tamanho, frutas e coberturas. Sugira combinações. Tom: fresco, animado.`,
  sorveteria: (name) => `Você é atendente da sorveteria "${name}". Alegre e doce. Confirme sabores, tamanho e formato. Tom: alegre, afetuoso.`,
  generic: (name) => `Você é atendente virtual de "${name}". Atenda com simpatia, eficiência e naturalidade.`,
}

const RULES = `
REGRAS FIXAS (nunca quebre):
- Nunca diga que é IA ou robô. Se perguntarem, diga que é atendente virtual da loja.
- Nunca invente preços ou produtos fora do catálogo.
- Se cliente reclamar, reconheça com empatia antes de resolver.
- Responda em português brasileiro natural. Máx 3 parágrafos curtos.
- Sem markdown. Escreva como no WhatsApp.
- Varie as respostas — nunca repita a mesma frase duas vezes seguidas.
- Para finalizar pedido, confirme: itens + endereço + forma de pagamento.`

function buildSystemPrompt(storeConfig, store, products, customer) {
  const nicheKey = store.store_type || "generic"
  const baseFn   = NICHE_BASE_PROMPTS[nicheKey] || NICHE_BASE_PROMPTS.generic
  const base      = storeConfig.ai.systemPrompt || baseFn(store.name)

  const customerCtx = customer
    ? `\nCONTEXTO DO CLIENTE: ${customer.status === "novo" ? `Novo cliente, primeira conversa. Nome ainda desconhecido.` : `Cliente ${customer.status}. Nome: ${customer.name || "desconhecido"}. Total de conversas: ${customer.message_count}.`}`
    : ""

  const productList = products?.length
    ? `\nCATÁLOGO (até 60 itens):\n` + products.slice(0, 60).map(p =>
        `- ${p.name}${p.price ? ` R$${Number(p.price).toFixed(2)}` : ""}${p.category ? ` (${p.category})` : ""}${p.available === false ? " [INDISPONÍVEL]" : ""}`
      ).join("\n")
    : ""

  return `${base}\n${customerCtx}${productList}\n${RULES}`
}

async function upsertCustomer(storeId, phone) {
  const { data: existing } = await supabase
    .from("customers_crm")
    .select("*")
    .eq("store_id", storeId)
    .eq("phone", phone)
    .single()

  if (existing) {
    await supabase.from("customers_crm")
      .update({ last_seen_at: new Date().toISOString(), message_count: (existing.message_count || 0) + 1 })
      .eq("id", existing.id)
    return { customer: existing, isNew: false }
  }

  const { data: created } = await supabase.from("customers_crm")
    .insert({ store_id: storeId, phone, status: "novo", message_count: 1 })
    .select()
    .single()

  return { customer: created, isNew: true }
}

async function extractAndSaveName(storeId, phone, message, customer) {
  if (customer?.name) return
  const nameMatch = message.match(/(?:me chamo|meu nome é|sou o|sou a|aqui é o|aqui é a)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/i)
  if (nameMatch?.[1]) {
    await supabase.from("customers_crm")
      .update({ name: nameMatch[1] })
      .eq("store_id", storeId)
      .eq("phone", phone)
  }
}

async function scheduleFollowups(storeId, phone, rules) {
  if (!rules?.length) return
  await supabase.from("followup_queue").delete().eq("store_id", storeId).eq("phone", phone).eq("status", "pending")
  const rows = rules.map((rule, i) => ({
    store_id:   storeId,
    phone,
    message:    rule.message,
    rule_index: i,
    send_at:    new Date(Date.now() + (rule.delay_minutes || 60) * 60000).toISOString(),
    status:     "pending",
  }))
  if (rows.length) await supabase.from("followup_queue").insert(rows)
}

async function cancelFollowups(storeId, phone) {
  await supabase.from("followup_queue")
    .update({ status: "cancelled" })
    .eq("store_id", storeId)
    .eq("phone", phone)
    .eq("status", "pending")
}

async function getHistory(storeId, phone) {
  const { data } = await supabase
    .from("conversation_history")
    .select("role, content")
    .eq("store_id", storeId)
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT)
  return (data || []).reverse()
}

async function saveHistory(storeId, phone, role, content) {
  await supabase.from("conversation_history").insert({ store_id: storeId, customer_phone: phone, role, content })
}

async function getStoreData(storeId) {
  const [storeRes, productsRes] = await Promise.all([
    supabase.from("stores").select("name, store_type, delivery_enabled, delivery_time_minutes, delivery_fee, minimum_order, business_hours, address").eq("id", storeId).single(),
    supabase.from("products").select("name, price, category, available").eq("store_id", storeId).eq("active", true).limit(60),
  ])
  return { store: storeRes.data, products: productsRes.data || [] }
}

function detectIntent(msg) {
  const m = msg.toLowerCase()
  if (/^(oi|olá|ola|ei|bom dia|boa tarde|boa noite|tudo bem|opa|hey)\b/.test(m)) return "greeting"
  if (/\b(tchau|até|flw|valeu|obrigad|obg|até mais)\b/.test(m)) return "goodbye"
  if (/\b(preço|quanto|valor|custa)\b/.test(m)) return "price"
  if (/\b(entrega|frete|prazo|demora|tempo)\b/.test(m)) return "delivery"
  if (/\b(quero|pedido|pedir|comprar)\b/.test(m)) return "order"
  if (/\b(cardapio|catalogo|catálogo|cardápio|tem |vocês tem)\b/.test(m)) return "catalog"
  return "general"
}

export async function handleIncomingMessage({ storeId, phone, message }) {
  try {
    const [storeConfig, { store, products }, { customer, isNew }] = await Promise.all([
      getStoreConfig(storeId),
      getStoreData(storeId),
      upsertCustomer(storeId, phone),
    ])

    if (!storeConfig.ai.enabled) return

    await extractAndSaveName(storeId, phone, message, customer)
    await cancelFollowups(storeId, phone)

    const intent  = detectIntent(message)
    const history = await getHistory(storeId, phone)

    const systemPrompt = buildSystemPrompt(storeConfig, store, products, customer)

    let reply

    if (intent === "greeting" && !history.length) {
      const nicheKey = store?.store_type || "generic"
      const greets = {
        farmacia:     `Olá! Seja bem-vindo(a) à ${store?.name} 💊 Em que posso te ajudar hoje?`,
        pizzaria:     `Oi! Aqui é a ${store?.name} 🍕 Tá com fome? Me conta o que você tá a fim!`,
        hamburgueria: `E aí! Aqui é a ${store?.name} 🍔 Bateu aquela fome? O que vai ser hoje?`,
        acaiteria:    `Oi! Aqui é a ${store?.name} 🍧 Vamos montar seu açaí? Me conta o que você curte!`,
        sorveteria:   `Olá! Aqui é a ${store?.name} 🍦 Que sabor vai ser hoje?`,
        generic:      `Olá! Seja bem-vindo(a) à ${store?.name}! Como posso ajudar?`,
      }
      reply = greets[nicheKey] || greets.generic
      if (isNew && storeConfig.followup.enabled) {
        await scheduleFollowups(storeId, phone, storeConfig.followup.rules)
      }
    } else {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: message },
      ]

      const res = await openai.chat.completions.create({
        model:             storeConfig.ai.model || "gpt-4o-mini",
        messages,
        temperature:       Number(storeConfig.ai.temperature) || 0.85,
        max_tokens:        400,
        presence_penalty:  0.6,
        frequency_penalty: 0.5,
      })

      reply = res.choices[0].message.content.trim()

      if (intent === "goodbye" && storeConfig.followup.enabled) {
        await scheduleFollowups(storeId, phone, storeConfig.followup.rules)
      }
    }

    await saveHistory(storeId, phone, "user", message)
    await saveHistory(storeId, phone, "assistant", reply)
    await enqueueMessage(phone, reply, storeId)
  } catch (err) {
    console.error("❌ Agent error:", err.message)
    await enqueueMessage(phone, "Desculpa, tive um probleminha aqui. Pode repetir?", storeId)
  }
}

export async function clearHistory(storeId, phone) {
  await supabase.from("conversation_history").delete().eq("store_id", storeId).eq("customer_phone", phone)
}

export async function getHistory_exported(storeId, phone) {
  return getHistory(storeId, phone)
}
