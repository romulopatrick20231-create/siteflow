import { supabase } from "../../lib/supabase"

const WHAPI_BASE_URL = process.env.WHAPI_BASE_URL ?? "https://gate.whapi.cloud"
const WHAPI_TOKEN = process.env.WHAPI_TOKEN ?? ""
const WORKER_INTERVAL_MS = 3000
const MAX_ATTEMPTS = 3
const BATCH_SIZE = 5

function formatPhone(phone: string): string {
  let p = phone.replace(/\+/g, "").replace(/\s/g, "")
  if (!p.startsWith("55")) p = "55" + p
  return p
}

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendNow(phone: string, message: string): Promise<void> {
  const url = `${WHAPI_BASE_URL.replace(/\/$/, "")}/messages/text`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHAPI_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: formatPhone(phone), body: message }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Whapi ${response.status}: ${text}`)
  }
}

export async function enqueueMessage(phone: string, message: string): Promise<void> {
  const { error } = await supabase.from("message_queue").insert({
    phone,
    message,
    status: "pending",
    attempts: 0,
  })

  if (error) {
    console.error("❌ Erro ao enfileirar mensagem:", error.message)
  } else {
    console.log("📩 Mensagem enfileirada:", phone)
  }
}

async function processQueue(): Promise<void> {
  const { data: messages, error } = await supabase
    .from("message_queue")
    .select("*")
    .in("status", ["pending", "failed"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE)

  if (error || !messages || messages.length === 0) return

  for (const msg of messages) {
    await supabase
      .from("message_queue")
      .update({ status: "processing" })
      .eq("id", msg.id)

    try {
      await randomDelay(2000, 5000)
      await sendNow(msg.phone, msg.message)

      await supabase
        .from("message_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", msg.id)

      console.log("✅ Mensagem enviada:", msg.phone)
    } catch (err: any) {
      await supabase
        .from("message_queue")
        .update({
          status: "failed",
          attempts: (msg.attempts ?? 0) + 1,
          last_error: err.message,
        })
        .eq("id", msg.id)

      console.error("❌ Erro ao enviar:", msg.phone, err.message)
    }
  }
}

export function startMessageWorker(): void {
  console.log("🚀 WhatsApp worker iniciado")
  setInterval(processQueue, WORKER_INTERVAL_MS)
}
