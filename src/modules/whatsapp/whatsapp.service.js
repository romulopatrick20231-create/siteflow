import { supabase } from "../../lib/supabase.js"

const GLOBAL_BASE_URL = process.env.WHAPI_BASE_URL ?? "https://gate.whapi.cloud"
const GLOBAL_TOKEN    = process.env.WHAPI_TOKEN ?? ""
const WORKER_INTERVAL = 3000
const MAX_ATTEMPTS    = 3
const BATCH_SIZE      = 5

const credentialsCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

async function getStoreCredentials(storeId) {
  if (!storeId) return { baseUrl: GLOBAL_BASE_URL, token: GLOBAL_TOKEN }

  const cached = credentialsCache.get(storeId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const { data } = await supabase
    .from("stores")
    .select("whapi_token, whapi_base_url")
    .eq("id", storeId)
    .single()

  const result = {
    baseUrl: data?.whapi_base_url || GLOBAL_BASE_URL,
    token:   data?.whapi_token   || GLOBAL_TOKEN,
  }

  credentialsCache.set(storeId, { data: result, ts: Date.now() })
  return result
}

export function invalidateStoreCache(storeId) {
  credentialsCache.delete(storeId)
}

function formatPhone(phone) {
  let p = phone.replace(/\+/g, "").replace(/\s/g, "")
  if (!p.startsWith("55")) p = "55" + p
  return p
}

function delay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(r => setTimeout(r, ms))
}

async function sendNow(phone, message, storeId) {
  const { baseUrl, token } = await getStoreCredentials(storeId)
  const url = `${baseUrl.replace(/\/$/, "")}/messages/text`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: formatPhone(phone), body: message }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Whapi ${res.status}: ${text}`)
  }
}

export async function enqueueMessage(phone, message, storeId = null) {
  const { error } = await supabase.from("message_queue").insert({
    phone,
    message,
    store_id: storeId,
    status: "pending",
    attempts: 0,
  })
  if (error) console.error("❌ Enqueue error:", error.message)
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
      await delay(1500, 3500)
      await sendNow(msg.phone, msg.message, msg.store_id)
      await supabase.from("message_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", msg.id)
      console.log("✅ Sent:", msg.phone)
    } catch (err) {
      await supabase.from("message_queue")
        .update({ status: "failed", attempts: (msg.attempts ?? 0) + 1, last_error: err.message })
        .eq("id", msg.id)
      console.error("❌ Failed:", msg.phone, err.message)
    }
  }
}

export function startMessageWorker() {
  console.log("🚀 WhatsApp worker started")
  setInterval(processQueue, WORKER_INTERVAL)
}
