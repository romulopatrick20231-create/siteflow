function formatPhone(phone) {
  let p = String(phone).replace(/\D/g, "")
  if (!p.startsWith("55")) p = "55" + p
  return p
}

async function sendWhapi(phone, message, config) {
  const base = (config.base_url || "https://gate.whapi.cloud").replace(/\/$/, "")
  const res = await fetch(`${base}/messages/text`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: formatPhone(phone), body: message }),
  })
  if (!res.ok) throw new Error(`Whapi ${res.status}: ${await res.text()}`)
}

async function sendEvolution(phone, message, config) {
  const base = (config.base_url || "").replace(/\/$/, "")
  const instance = config.instance || ""
  const res = await fetch(`${base}/message/sendText/${instance}`, {
    method: "POST",
    headers: { apikey: config.api_key, "Content-Type": "application/json" },
    body: JSON.stringify({ number: formatPhone(phone), text: message }),
  })
  if (!res.ok) throw new Error(`Evolution ${res.status}: ${await res.text()}`)
}

async function sendZapi(phone, message, config) {
  const res = await fetch(
    `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`,
    {
      method: "POST",
      headers: { "Client-Token": config.client_token, "Content-Type": "application/json" },
      body: JSON.stringify({ phone: formatPhone(phone), message }),
    }
  )
  if (!res.ok) throw new Error(`Z-API ${res.status}: ${await res.text()}`)
}

async function sendOfficial(phone, message, config) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${config.phone_number_id}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${config.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formatPhone(phone),
        type: "text",
        text: { body: message },
      }),
    }
  )
  if (!res.ok) throw new Error(`Official ${res.status}: ${await res.text()}`)
}

export const PROVIDERS = {
  whapi:    sendWhapi,
  evolution: sendEvolution,
  zapi:     sendZapi,
  official: sendOfficial,
}

export async function sendViaProvider(phone, message, provider, config) {
  const fn = PROVIDERS[provider] || sendWhapi
  await fn(phone, message, config)
}

export const PROVIDER_FIELDS = {
  whapi: [
    { key: "token",    label: "Token", type: "password", required: true },
    { key: "base_url", label: "Base URL", type: "text", placeholder: "https://gate.whapi.cloud" },
  ],
  evolution: [
    { key: "base_url",  label: "URL do servidor Evolution", type: "text", required: true, placeholder: "https://api.seuevo.com" },
    { key: "api_key",   label: "API Key", type: "password", required: true },
    { key: "instance",  label: "Nome da instância", type: "text", required: true },
  ],
  zapi: [
    { key: "instance_id",   label: "Instance ID", type: "text", required: true },
    { key: "token",         label: "Token", type: "password", required: true },
    { key: "client_token",  label: "Client Token", type: "password", required: true },
  ],
  official: [
    { key: "phone_number_id", label: "Phone Number ID", type: "text", required: true },
    { key: "access_token",    label: "Access Token", type: "password", required: true },
    { key: "verify_token",    label: "Verify Token (webhook)", type: "text", required: true },
  ],
}
