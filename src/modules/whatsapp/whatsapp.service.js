import { supabase } from "../../lib/supabase.js"
import { sendViaProvider } from "./providers.js"

const WORKER_INTERVAL = 3000
const MAX_ATTEMPTS    = 3
const BATCH_SIZE      = 5

const storeCache = new Map()
const CACHE_TTL  = 5 * 60 * 1000

export async function getStoreConfig(storeId) {
  if (!storeId) {
    return {
      provider: "whapi",
      config: { token: process.env.WHAPI_TOKEN, base_url: process.env.WHAPI_BASE_URL || "https://gate.whapi.cloud" },
    }
  }
  const cached = storeCache.get(storeId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const { data } = await supabase
    .from("stores")
    .select("whatsapp_provider, whatsapp_config, ai_system_prompt, ai_model, ai_temperature, ai_persona, ai_enabled, store_type, name, followup_enabled, followup_rules")
    .eq("id", storeId)
    .single()

  const result = {
    provider: data?.whatsapp_provider || "whapi",
    config:   data?.whatsapp_config   || { token: process.env.WHAPI_TOKEN, base_url: process.env.WHAPI_BASE_URL },
    ai:       {
      systemPrompt: data?.ai_system_prompt || null,
      model:        data?.ai_model         || "gpt-4o-mini",
      temperature:  data?.ai_temperature   || 0.85,
      persona:      data?.ai_persona       || data?.name || "Assistente",
      enabled:      data?.ai_enabled       ?? true,
      storeType:    data?.store_type       || "generic",
      storeName:    data?.name             || "",
    },
    followup: {
      enabled: data?.followup_enabled || false,
      rules:   data?.followup_rules   || [],
    },
  }

  storeCache.set(storeId, { data: result, ts: Date.now() })
  return result
}

export function invalidateStoreCache(storeId) {
  storeCache.delete(storeId)
}

export async function enqueueMessage(phone, message, storeId = null) {
  const { error } = await supabase.from("message_queue").insert({
    phone, message, store_id: storeId, status: "pending", attempts: 0,
  })
  if (error) console.error("❌ Enqueue error:", error.message)
}

export async function sendDirect(phone, message, storeId = null) {
  const { provider, config } = await getStoreConfig(storeId)
  await sendViaProvider(phone, message, provider, config)
}

function delay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(r => setTimeout(r, ms))
}

async function processQueue() {
  const { data: messages, error } = await supabase
    .from("message_queue")
    .select("*")
    .in("status", ["pending", "failed"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE)

  if (error || !messages?.length) return

  for (const msg of messages) {
    await supabase.from("message_queue").update({ status: "processing" }).eq("id", msg.id)
    try {
      await delay(1200, 3000)
      const { provider, config } = await getStoreConfig(msg.store_id)
      await sendViaProvider(msg.phone, msg.message, provider, config)
      await supabase.from("message_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", msg.id)
    } catch (err) {
      await supabase.from("message_queue")
        .update({ status: "failed", attempts: (msg.attempts ?? 0) + 1, last_error: err.message })
        .eq("id", msg.id)
      console.error("❌ Send failed:", msg.phone, err.message)
    }
  }
}

async function processFollowups() {
  const { data: items } = await supabase
    .from("followup_queue")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", new Date().toISOString())
    .limit(20)

  if (!items?.length) return

  for (const item of items) {
    try {
      await sendViaProvider(item.phone, item.message, ...(await getStoreConfig(item.store_id)).provider ? [] : [])
      const { provider, config } = await getStoreConfig(item.store_id)
      await sendViaProvider(item.phone, item.message, provider, config)
      await supabase.from("followup_queue").update({ status: "sent" }).eq("id", item.id)
    } catch (err) {
      await supabase.from("followup_queue").update({ status: "cancelled" }).eq("id", item.id)
    }
  }
}

export function startMessageWorker() {
  console.log("🚀 WhatsApp worker started")
  setInterval(processQueue, WORKER_INTERVAL)
  setInterval(processFollowups, 30000)
}
