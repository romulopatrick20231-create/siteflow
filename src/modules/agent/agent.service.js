import OpenAI from "openai"
import { supabase } from "../../lib/supabase.js"
import { enqueueMessage, getStoreConfig } from "../whatsapp/whatsapp.service.js"
import { emitToStore, emitToTenant } from "../../saas/socketService.js"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const HISTORY_LIMIT = 16

const NICHE_BASE_PROMPTS = {
  farmacia: (name) => `Voce e atendente virtual da farmacia "${name}". Atenda com cuidado, empatia e profissionalismo. Conhece medicamentos, suplementos, dermocosmeticos e higiene. NAO prescreve medicamentos. Se cliente relatar sintoma grave, oriente a buscar um medico. Tom: acolhedor, paciente, profissional.`,
  pizzaria: (name) => `Voce e atendente da pizzaria "${name}". Ama pizza e passa entusiasmo. Conhece todo o cardapio. Ao pedir, confirme sabor, tamanho, borda e adicionais. Tom: animado, acolhedor, informal.`,
  hamburgueria: (name) => `Voce e atendente da hamburgueria "${name}". Descolado e apaixonado por hamburguer artesanal. Ao pedir, confirme ponto, adicionais e acompanhamento. Tom: casual, energetico.`,
  acaiteria: (name) => `Voce e atendente da acaiteria "${name}". Leve, saudavel, energia positiva. Confirme tamanho, frutas e coberturas. Sugira combinacoes. Tom: fresco, animado.`,
  sorveteria: (name) => `Voce e atendente da sorveteria "${name}". Alegre e doce. Confirme sabores, tamanho e formato. Tom: alegre, afetuoso.`,
  generic: (name) => `Voce e atendente virtual de "${name}". Atenda com simpatia, eficiencia e naturalidade.`,
}

const RULES = `
REGRAS FIXAS (nunca quebre):
- Nunca diga que e IA ou robo. Se perguntarem, diga que e atendente virtual da loja.
- Nunca invente precos ou produtos fora do catalogo.
- Se cliente reclamar, reconheca com empatia antes de resolver.
- Responda em portugues brasileiro natural. Max 3 paragrafos curtos.
- Sem markdown. Escreva como no WhatsApp.
- Varie as respostas - nunca repita a mesma frase duas vezes seguidas.
- Para finalizar pedido, confirme: itens + endereco + forma de pagamento.
- Quando o cliente CONFIRMAR o pedido (itens + endereco + pagamento todos definidos), use a ferramenta registrar_pedido para criar o pedido no sistema.`

const ORDER_TOOL = {
  type: "function",
  function: {
    name: "registrar_pedido",
    description: "Registra o pedido no sistema quando o cliente confirmar todos os itens, endereco e forma de pagamento.",
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Nome do cliente extraido da conversa" },
        items: {
          type: "array",
          description: "Lista de itens do pedido",
          items: {
            type: "object",
            properties: {
              name:  { type: "string",  description: "Nome do produto" },
              qty:   { type: "integer", description: "Quantidade" },
              price: { type: "number",  description: "Preco unitario" },
            },
            required: ["name", "qty", "price"],
          },
        },
        total:          { type: "number", description: "Valor total do pedido" },
        address:        { type: "string", description: "Endereco de entrega ou retirada" },
        payment_method: { type: "string", description: "Forma de pagamento: pix, dinheiro, cartao, etc." },
        note:           { type: "string", description: "Observacoes adicionais do cliente" },
      },
      required: ["customer_name", "items", "total", "payment_method"],
    },
  },
}

function buildSystemPrompt(storeConfig, store, products, customer) {
  const nicheKey = store.store_type || "generic"
  const baseFn   = NICHE_BASE_PROMPTS[nicheKey] || NICHE_BASE_PROMPTS.generic
  const base      = storeConfig.ai.systemPrompt || baseFn(store.name)

  const customerCtx = customer
    ? `\nCONTEXTO DO CLIENTE: ${customer.status === "novo" ? `Novo cliente, primeira conversa. Nome ainda desconhecido.` : `Cliente ${customer.status}. Nome: ${customer.name || "desconhecido"}. Total de conversas: ${customer.message_count}.`}`
    : ""

  const productList = products && products.length
    ? `\nCATALOGO (ate 60 itens):\n` + products.slice(0, 60).map(p =>
        `- ${p.name}${p.price ? ` R$${Number(p.price).toFixed(2)}` : ""}${p.category ? ` (${p.category})` : ""}${p.available === false ? " [INDISPONIVEL]" : ""}`
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
  if (customer && customer.name) return
  const nameMatch = message.match(/(?:me chamo|meu nome e|sou o|sou a|aqui e o|aqui e a)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (nameMatch && nameMatch[1]) {
    await supabase.from("customers_crm")
      .update({ name: nameMatch[1] })
      .eq("store_id", storeId)
      .eq("phone", phone)
  }
}

async function scheduleFollowups(storeId, phone, rules) {
  if (!rules || !rules.length) return
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

async function getStoreStatus(storeId) {
  const { data } = await supabase
    .from("store_settings")
    .select("is_open, notice")
    .eq("tenant_id", storeId)
    .single()
  return { is_open: data ? data.is_open : true, notice: data ? data.notice : "" }
}

async function createOrderFromAgent({ storeId, phone, orderData, customer }) {
  const items = orderData.items || []
  const total  = orderData.total || items.reduce((s, i) => s + (i.price * i.qty), 0)

  const { data: order, error } = await supabase
    .from("store_orders")
    .insert({
      store_id:       storeId,
      customer_name:  orderData.customer_name || (customer && customer.name) || "Cliente WhatsApp",
      customer_phone: phone,
      items:          JSON.stringify(items),
      total,
      payment_method: orderData.payment_method || "whatsapp",
      address:        orderData.address || "",
      note:           orderData.note || "",
      status:         "pending",
      source:         "whatsapp_agent",
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    })
    .select("id, store_id, status, total, customer_name")
    .single()

  if (error) {
    console.error("createOrderFromAgent error:", error.message)
    return null
  }

  emitToStore(storeId, "new_order", order)
  emitToTenant(storeId, "new_order", { order_id: order.id })

  if (customer && customer.id) {
    await supabase.from("customers_crm")
      .update({ status: "recorrente", last_order_at: new Date().toISOString() })
      .eq("id", customer.id)
  }

  console.log("Order created by agent:", order.id, "store", storeId)
  return order
}

function detectIntent(msg) {
  const m = msg.toLowerCase()
  if (/^(oi|ola|ei|bom dia|boa tarde|boa noite|tudo bem|opa|hey)\b/.test(m)) return "greeting"
  if (/\b(tchau|ate|flw|valeu|obrigad|obg)\b/.test(m)) return "goodbye"
  if (/\b(preco|quanto|valor|custa)\b/.test(m)) return "price"
  if (/\b(entrega|frete|prazo|demora|tempo)\b/.test(m)) return "delivery"
  if (/\b(quero|pedido|pedir|comprar)\b/.test(m)) return "order"
  if (/\b(cardapio|catalogo|tem |voces tem)\b/.test(m)) return "catalog"
  return "general"
}

export async function handleIncomingMessage({ storeId, phone, message }) {
  try {
    const [storeConfig, { store, products }, { customer, isNew }, storeStatus] = await Promise.all([
      getStoreConfig(storeId),
      getStoreData(storeId),
      upsertCustomer(storeId, phone),
      getStoreStatus(storeId),
    ])

    if (!storeConfig.ai.enabled) return

    if (!storeStatus.is_open) {
      const closedMsg = storeStatus.notice
        ? `Ola! No momento estamos fechados. ${storeStatus.notice}`
        : `Ola! No momento estamos fechados. Assim que abrirmos, te atendemos com prazer!`
      await enqueueMessage(phone, closedMsg, storeId)
      return
    }

    await extractAndSaveName(storeId, phone, message, customer)
    await cancelFollowups(storeId, phone)

    const intent  = detectIntent(message)
    const history = await getHistory(storeId, phone)

    const systemPrompt = buildSystemPrompt(storeConfig, store, products, customer)

    let reply

    if (intent === "greeting" && !history.length) {
      const nicheKey = (store && store.store_type) || "generic"
      const storeName = (store && store.name) || ""
      const greets = {
        farmacia:     `Ola! Seja bem-vindo(a) a ${storeName}! Em que posso te ajudar hoje?`,
        pizzaria:     `Oi! Aqui e a ${storeName}! Ta com fome? Me conta o que voce ta a fim!`,
        hamburgueria: `E ai! Aqui e a ${storeName}! Bateu aquela fome? O que vai ser hoje?`,
        acaiteria:    `Oi! Aqui e a ${storeName}! Vamos montar seu acai? Me conta o que voce curte!`,
        sorveteria:   `Ola! Aqui e a ${storeName}! Que sabor vai ser hoje?`,
        generic:      `Ola! Seja bem-vindo(a) a ${storeName}! Como posso ajudar?`,
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
        tools:             [ORDER_TOOL],
        tool_choice:       "auto",
        temperature:       Number(storeConfig.ai.temperature) || 0.85,
        max_tokens:        500,
        presence_penalty:  0.6,
        frequency_penalty: 0.5,
      })

      const choice = res.choices[0]

      if (choice.finish_reason === "tool_calls") {
        const toolCall = choice.message.tool_calls && choice.message.tool_calls[0]
        if (toolCall && toolCall.function && toolCall.function.name === "registrar_pedido") {
          let orderData = {}
          try { orderData = JSON.parse(toolCall.function.arguments) } catch (_e) {}

          const order = await createOrderFromAgent({ storeId, phone, orderData, customer })

          const confirmMessages = [
            ...messages,
            choice.message,
            {
              role:         "tool",
              tool_call_id: toolCall.id,
              content:      order
                ? `Pedido #${order.id} criado com sucesso. Total: R$${Number(order.total).toFixed(2)}.`
                : "Nao foi possivel registrar o pedido no sistema.",
            },
          ]

          const confirmRes = await openai.chat.completions.create({
            model:       storeConfig.ai.model || "gpt-4o-mini",
            messages:    confirmMessages,
            temperature: 0.7,
            max_tokens:  300,
          })

          reply = confirmRes.choices[0].message.content.trim()
        }
      } else {
        reply = (choice.message.content || "").trim() || "Desculpa, pode repetir?"
      }

      if (intent === "goodbye" && storeConfig.followup.enabled) {
        await scheduleFollowups(storeId, phone, storeConfig.followup.rules)
      }
    }

    if (reply) {
      await saveHistory(storeId, phone, "user", message)
      await saveHistory(storeId, phone, "assistant", reply)
      await enqueueMessage(phone, reply, storeId)
    }
  } catch (err) {
    console.error("Agent error:", err.message)
    await enqueueMessage(phone, "Desculpa, tive um probleminha aqui. Pode repetir?", storeId)
  }
}

export async function clearHistory(storeId, phone) {
  await supabase.from("conversation_history").delete().eq("store_id", storeId).eq("customer_phone", phone)
}

export async function getHistory_exported(storeId, phone) {
  return getHistory(storeId, phone)
}
