import { Router } from "express"
import { supabase } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import { invalidateStoreCache, sendDirect } from "../modules/whatsapp/whatsapp.service.js"
import { PROVIDER_FIELDS } from "../modules/whatsapp/providers.js"

const router = Router()

function maskConfig(config) {
  if (!config) return {}
  const masked = { ...config }
  for (const key of ["token", "api_key", "access_token", "client_token"]) {
    if (masked[key]) masked[key] = masked[key].slice(0, 6) + "••••••••"
  }
  return masked
}

function mergeMasked(existing, incoming) {
  const merged = { ...existing }
  for (const [k, v] of Object.entries(incoming)) {
    if (typeof v === "string" && v.includes("••••••••")) continue
    merged[k] = v
  }
  return merged
}

router.get("/config", requireAuth, async (req, res) => {
  const tid = req.query.tenant_id || req.user?.store_id

  const { data, error } = await supabase
    .from("stores")
    .select("whatsapp_provider, whatsapp_config, whatsapp_phone")
    .eq("id", tid)
    .single()

  if (error) return res.status(404).json({ error: "Not found" })

  res.json({
    provider:        data.whatsapp_provider || "whapi",
    config:          maskConfig(data.whatsapp_config),
    whatsapp_phone:  data.whatsapp_phone || "",
    webhook_url:     `${process.env.API_BASE_URL || ""}/webhook/${tid}/whatsapp`,
  })
})

router.put("/config", requireAuth, async (req, res) => {
  const { provider, config, whatsapp_phone, tenant_id } = req.body
  const tid = tenant_id || req.user?.store_id

  const current = await supabase.from("stores").select("whatsapp_config").eq("id", tid).single()
  const merged  = mergeMasked(current.data?.whatsapp_config || {}, config || {})

  const { error } = await supabase
    .from("stores")
    .update({ whatsapp_provider: provider, whatsapp_config: merged, whatsapp_phone })
    .eq("id", tid)

  if (error) return res.status(500).json({ error: error.message })

  invalidateStoreCache(tid)
  res.json({ success: true })
})

router.post("/test", requireAuth, async (req, res) => {
  const { phone, tenant_id } = req.body
  const tid = tenant_id || req.user?.store_id

  if (!phone) return res.status(400).json({ error: "phone required" })

  try {
    await sendDirect(phone, "✅ Teste de conexão ZapFlow — funcionando!", tid)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/provider-fields", (req, res) => {
  res.json(PROVIDER_FIELDS)
})

export default router
