const WHAPI_TOKEN = process.env.WHAPI_TOKEN ?? ""
const WHAPI_URL = process.env.WHAPI_URL ?? "https://gate.whapi.cloud/"

interface QueuedMessage {
  phone: string
  message: string
}

const queue: QueuedMessage[] = []
let processing = false

function formatPhone(phone: string): string {
  let formatted = phone.replace(/\+/g, "").replace(/\s/g, "")
  if (!formatted.startsWith("55")) {
    formatted = "55" + formatted
  }
  return formatted
}

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendNow(phone: string, message: string): Promise<void> {
  const url = WHAPI_URL.endsWith("/") ? `${WHAPI_URL}messages/text` : `${WHAPI_URL}/messages/text`

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
    throw new Error(`Whapi error ${response.status}: ${text}`)
  }
}

async function processQueue(): Promise<void> {
  if (processing) return
  processing = true

  while (queue.length > 0) {
    const item = queue[0]
    try {
      await randomDelay(2000, 5000)
      await sendNow(item.phone, item.message)
    } catch (err) {
      console.error(`[WhatsApp] Failed to send to ${item.phone}:`, err)
    } finally {
      queue.shift()
    }
  }

  processing = false
}

export function enqueueMessage(phone: string, message: string): void {
  queue.push({ phone, message })
  processQueue()
}
